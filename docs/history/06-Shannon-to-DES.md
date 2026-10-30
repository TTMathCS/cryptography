# From Shannon to DES

*From 1945 to the late 1990s: a mathematical theory of secrecy, the secret
agencies that grew out of the war, a German émigré's cipher at IBM, and
the first public standard cipher, with a twenty-year argument about its
key.*

After the war, cryptography split in two. Governments kept their
codebreakers, gave them new agencies and huge budgets, and classified
almost everything. Outside, a single paper by Claude Shannon turned
cryptography into mathematics. Then computers and banks created a need
that the secret world couldn't meet: strong encryption for ordinary
business data. The US government's answer, the Data Encryption Standard,
was the first cipher anyone could study, and arguing about it created an
open research community that has run cryptography ever since.

| When | Who | What |
|---|---|---|
| 1945, 1949 | Claude Shannon | "A Mathematical Theory of Cryptography", then the published version |
| 1946 | Britain and the US | the UKUSA signals-intelligence agreement |
| 1952 | United States | the National Security Agency is created |
| 1955–1970 | Boris Hagelin, NSA, CIA | Crypto AG's machines, and then the company, quietly controlled |
| late 1960s–1971 | Horst Feistel, IBM | the Feistel network; the Lucifer cipher |
| 1973–1977 | National Bureau of Standards | the call for a cipher; DES published as FIPS 46 |
| 1977 | Diffie and Hellman | "a $20 million machine could find a DES key in a day" |
| 1977 | *Cryptologia* | the first journal on cryptology in the open |
| 1981–1982 | CRYPTO, IACR | the first open conference; the research association |
| 1990–1994 | Biham and Shamir; Matsui; Coppersmith | differential and linear cryptanalysis; IBM explains DES's S-boxes |
| 1998–1999 | the EFF's Deep Crack | DES keys found in 56 hours, then 22 |
| 2005 | NIST | withdraws DES |

## Shannon: secrecy becomes mathematics

### The paper

Claude Shannon (1916–2001) was a Bell Labs mathematician who had already
shown, in his 1937 master's thesis, that electrical switching circuits
could do Boolean logic. During the war he was consulted on the
encryption of SIGSALY, the Bell Labs voice-encryption system that linked
Washington and London, and met Alan Turing when Turing visited Bell Labs
in 1943.

On 1 September 1945 he finished a classified report, "A Mathematical
Theory of Cryptography". The famous 1948 paper that founded information
theory, "A Mathematical Theory of Communication", grew out of the same
work. In October 1949 the cryptography report appeared, declassified and
lightly edited, in the *Bell System Technical Journal* as "Communication
Theory of Secrecy Systems". It is the paper that made cryptography a
science.

### What it proved

- **Perfect secrecy exists, and it is expensive.** Shannon defined a
  cipher as *perfectly secret* if seeing the ciphertext tells an attacker
  nothing at all about the message, and proved that the
  [one-time pad](04-Telegraph-Age.md#why-it-cant-be-broken) has this
  property. He also proved the bad news: *any* perfectly secret cipher
  needs at least as much key as message. There is no clever shortcut.
- **Everything else can be broken in principle.** For a cipher with a
  short key, there is a length of ciphertext beyond which only one key
  can produce sensible plaintext. Shannon called it the *unicity
  distance*. For a simple substitution in English it is under 30 letters,
  so a short cryptogram can have several valid solutions but a longer one
  has exactly one. Past that point, security depends only on the work
  needed to find that key, not on the answer being hidden.
- **Language leaks.** English is highly redundant: you can delete many
  letters and still read it. That redundancy is what frequency analysis
  exploits, and Shannon measured it. Compressing a message before
  encrypting it removes some of the leak.
- **Confusion and diffusion.** Shannon named the two things a good cipher
  must do. *Confusion* makes the relationship between key and ciphertext
  as complicated as possible (substitution does this). *Diffusion*
  spreads the influence of each plaintext letter over many ciphertext
  letters, so statistical patterns are smeared out (transposition and
  mixing do this). He suggested building strong ciphers by alternating
  simple substitution and mixing steps many times, a *product cipher*.

That last idea is the blueprint for every modern block cipher, from DES to
[AES](../04-symmetric-ciphers/AES.md). Shannon also took as his working
assumption what [Kerckhoffs](04-Telegraph-Age.md#kerckhoffss-rules) had
argued in 1883: "the enemy knows the system being used".

## The secret agencies

### NSA and GCHQ

The wartime codebreakers didn't go home. In Britain, the Government Code
and Cypher School was renamed Government Communications Headquarters
(GCHQ) in 1946 and moved to Cheltenham in the early 1950s. In the United
States, the army and navy agencies were merged, first into the Armed
Forces Security Agency in 1949 and then, by a directive from President
Truman, into the **National Security Agency**, established on 4 November
1952. For years its existence was barely acknowledged; insiders joked
that the initials stood for "No Such Agency".

In March 1946 Britain and the United States signed what became the UKUSA
agreement to share signals intelligence. Canada, Australia and New Zealand
joined over the following decade, forming the partnership now called
the Five Eyes.

These agencies did both jobs: breaking other countries' communications and
making the ciphers for their own governments. NSA designed the
equipment the US military and diplomats used, such as the KL-7 rotor
machine of the 1950s and the electronic KW-26 teleprinter encryptor.
Almost nothing about their work was public. For thirty years after the
war, nearly all serious cryptographic research in the West happened
behind their fences.

### Crypto AG

Boris Hagelin, whose pin-wheel machines had served the US Army in the war,
moved his business from Sweden to Switzerland and in 1952 founded Crypto
AG near Zug. Neutral Switzerland made it the natural supplier to
governments that didn't want American or Soviet equipment, and it sold to
well over a hundred countries.

William Friedman, by then at NSA, and Hagelin were old friends, and in the
1950s they reached an informal arrangement about which customers got which
machines. In 1970 the American CIA and West Germany's intelligence service,
the BND, secretly bought the company. For decades they shaped its
machines so that their own codebreakers could read the traffic of the
countries that bought them, in an operation the BND called *Rubikon*. The
BND sold its share in the early 1990s; the CIA stayed until 2018. The
story came out in February 2020, through a joint investigation by the
*Washington Post* and the German and Swiss broadcasters ZDF and SRF, based
on the CIA's own internal history.

It is the strongest argument there is for Kerckhoffs's principle and for
open algorithms: a customer who couldn't inspect the design had no way to
know it had been weakened.

## Feistel and Lucifer

### A cipher built for computers

By the late 1960s computers held payrolls, bank balances and medical
records, and data moved between them over telephone lines. Banks wanted
encryption for cash machines and money transfers. Nothing suitable was
available outside the military.

Horst Feistel (1915–1990) had left Germany for the United States in 1934.
After working on aircraft identification systems for the US Air Force, he
moved to IBM's research laboratory at Yorktown Heights, New York, where
in the late 1960s and early 1970s he led work on a family of block
ciphers that became known as *Lucifer*. His 1973 article in *Scientific
American*, "Cryptography and Computer Privacy", was for many readers the
first public description of how a modern cipher works.

### The Feistel network

A *block cipher* encrypts a fixed-size block of bits, say 64, under a key.
Feistel's structure, now called a *Feistel network*, splits the block into
a left half and a right half and repeats a simple round many times:

1. Feed the right half and a round key into a function *F*.
2. Combine *F*'s output with the left half using XOR.
3. Swap the halves.

The beauty is that *F* never has to be reversible. Decryption is the same
process with the round keys in reverse order, because each XOR undoes
itself. Designers can make *F* as tangled as they like, a mix of
substitution boxes and bit shuffles, Shannon's confusion and diffusion,
without worrying about how to undo it.

This toy Feistel cipher uses SHA-256 as its round function (a hash, which
can't be run backwards) and still decrypts. It also shows diffusion: flip
one bit of the plaintext and, after a few rounds, about half the output
bits change.

```python
import hashlib

def F(half, key, rnd):
    # The round function can be anything at all; here, a hash of the inputs
    data = key + bytes([rnd]) + half.to_bytes(4, "big")
    return int.from_bytes(hashlib.sha256(data).digest()[:4], "big")

def feistel(block, key, rounds=16, decrypt=False):
    L, R = block >> 32, block & 0xFFFFFFFF          # split 64 bits into two halves
    order = range(rounds - 1, -1, -1) if decrypt else range(rounds)
    for rnd in order:
        L, R = R, L ^ F(R, key, rnd)                # one round: swap, mix in F
    return (R << 32) | L                            # undo the last swap

key = b"lucifer"
plain = 0x0123456789ABCDEF
secret = feistel(plain, key)
print(f"{secret:016X}")
print(f"{feistel(secret, key, decrypt=True):016X}")   # same steps, keys reversed

# Diffusion: flip one plaintext bit and about half the output bits change
other = feistel(plain ^ 1, key)
print(f"{other:016X}", bin(secret ^ other).count("1"), "of 64 bits differ")
for rounds in (1, 2, 3, 4, 16):
    a, b = feistel(plain, key, rounds), feistel(plain ^ 1, key, rounds)
    print(rounds, "rounds:", bin(a ^ b).count("1"), "bits differ")
```

Output:

```
ABD29F83FE220067
0123456789ABCDEF
2898C7E42582A3A8 32 of 64 bits differ
1 rounds: 19 bits differ
2 rounds: 33 bits differ
3 rounds: 29 bits differ
4 rounds: 36 bits differ
16 rounds: 32 bits differ
```

After one round only one half has been scrambled; from the second round
on, a one-bit change has spread across the whole block. A real cipher
also needs a carefully designed *F* and key schedule, which is where all
the difficulty lies; a toy like this one has no security analysis behind
it.

## DES

### The government asks for a cipher

In 1972 the US National Bureau of Standards (NBS, now NIST) began a
programme on computer security. On 15 May 1973 it published a request in
the *Federal Register* for a cipher that could become a public federal
standard. Nothing suitable came in. A second request went out in August
1974, and this time IBM submitted a cipher developed from Lucifer by a
team including Walter Tuchman, Carl Meyer, Don Coppersmith and Alan
Konheim, with Feistel's design at its core.

NBS asked NSA to evaluate it. NBS published the design for public comment
on 17 March 1975, with IBM's promise of a royalty-free licence, and in
January 1977 issued it as Federal Information Processing Standard 46, the
**Data Encryption Standard**. DES has a 64-bit block, 16 Feistel rounds,
eight fixed substitution boxes (*S-boxes*), and a 56-bit key.

It was the first time a government had published a strong cipher for
anyone to use and study. Banks adopted it within a few years, through
American banking standards for PINs and wire transfers, and it became the
most widely used cipher in the world. Its modes of operation were
standardized in 1980 as FIPS 81, and they are still taught as the
[classic modes](../05-modes-aead/Classic-Modes.md). The full details of
the cipher's life and retirement are on the
[retired ciphers page](../04-symmetric-ciphers/Retired.md#des).

### Two suspicions

Critics raised two questions from the start.

**The key was short.** Lucifer had used a 128-bit key in one version; DES
used 56. In 1977 Whitfield Diffie and Martin Hellman published a design for
a machine with a million special chips, each testing a million keys a
second, that would find a DES key in about a day and cost around $20
million, a sum within reach of a government. The obvious suspicion was
that NSA wanted a key it could search but others couldn't. NSA's own
internal history, Thomas Johnson's *American Cryptology during the Cold
War* (written in the 1990s, declassified later), says NSA tried to
persuade IBM to cut the key from 64 bits to 48, and that they compromised
on 56.

**The S-boxes were unexplained.** The eight S-boxes, the tables at the
heart of the round function, came with no explanation of why they were
chosen, and NSA had reviewed them. Konheim later recalled that the
S-boxes went to Washington and came back different. Was there a hidden
weakness?

A 1978 inquiry by the US Senate Select Committee on Intelligence
concluded, in its unclassified summary, that NSA had "convinced IBM that a
reduced key size was sufficient" and had "indirectly assisted in the
development of the S-box structures", but had not tampered with the
design. Accounts still differ on how much NSA changed: Tuchman said NSA
"did not dictate a single wire", while Konheim remembered the S-boxes
coming back different.

### The S-boxes were stronger, not weaker

The answer came in 1990, when Eli Biham and Adi Shamir published
*differential cryptanalysis*, a general attack that tracks how
differences between pairs of plaintexts propagate through a cipher's
rounds. It broke many ciphers of the time, including Japan's FEAL. Their
first paper beat brute force only on DES cut down to 15 rounds or fewer;
in 1992 they reached the full 16 rounds, and even then it needed 2⁴⁷
chosen plaintexts, more than an attacker could realistically get, because
DES's S-boxes resisted it unusually well.

It wasn't luck. In 1994 Don Coppersmith of IBM explained that the team had
known about the technique in 1974, calling it the "T-attack", and had
designed the S-boxes to resist it; after discussions with NSA, it was
decided to keep the technique secret, and it stayed secret for sixteen
years. In 1993 Mitsuru Matsui found another general method, *linear
cryptanalysis*, which DES had not been designed against. His first
version needed 2⁴⁷ known plaintexts and an improved one 2⁴³, and in 1994
he ran the improved attack for real, recovering a key in about 50 days on
twelve workstations.

So the history answered both questions, though not as the critics
expected. Whoever had the final word on them, the S-boxes made DES
stronger against clever attacks, and the short key made it weaker against
the simplest one.

### The key falls

```python
keys = 2 ** 56
print(f"{keys:,} DES keys")

# Diffie and Hellman's 1977 design: a million chips, a million keys a second each
print(f"{keys / 10 ** 12 / 3600:.0f} hours to try them all")

# The EFF's Deep Crack (1998) tested about 90 billion keys a second
print(f"{keys / 90e9 / 86400:.1f} days to try them all")

# AES-128 at the same speed
print(f"{2 ** 128 / 90e9 / 86400 / 365.25:.1e} years")
```

Output:

```
72,057,594,037,927,936 DES keys
20 hours to try them all
9.3 days to try them all
1.2e+20 years
```

Hardware followed the arithmetic. RSA Data Security ran a series of public
DES challenges. In 1997 a volunteer network of ordinary computers found
the first key after 96 days. In July 1998 the Electronic Frontier
Foundation's purpose-built machine, *Deep Crack*, which cost under
$250,000, found one in 56 hours, and in January 1999, working with
distributed.net's volunteers, in 22 hours and 15 minutes. The
[hardware page](09-Hardware-and-Engineering.md#deep-crack) tells how the
machine was built. Each AES-128 key, by contrast, would take that machine about
10²⁰ years.

DES lived on as **Triple DES**: encrypt, decrypt and encrypt again with
two or three keys, which IBM's Walter Tuchman proposed in the late 1970s.
It was standardized in 1998–99, used for decades in banking and payment
cards, and disallowed for new encryption by NIST at the end of 2023. NIST
withdrew single DES on 19 May 2005, after AES had replaced it.

## Cryptography comes out in the open

DES was the spark for something larger: public research. Until the 1970s,
outsiders who wanted to study ciphers had almost nothing to read beyond
Kahn's history, published in 1967. A published, standard, unexplained
cipher gave academics something concrete to analyse, and the argument
about it made cryptography respectable as a university subject.

- **1977:** the first issue of *Cryptologia*, a journal founded by Brian
  Winkel, Cipher Deavours, David Kahn, Louis Kruh and Greg Mellen.
- **1981:** the first CRYPTO conference, at the University of California,
  Santa Barbara.
- **1982:** the International Association for Cryptologic Research (IACR)
  is founded; the first European meeting, later counted as EUROCRYPT, is
  held in Germany the same year.

At the same time, as the next page tells, two Stanford researchers and an
MIT trio solved the oldest problem in the subject. NSA, which had had the
field to itself, was not pleased.

## Other ciphers of the era

DES was not alone for long. Japan's NTT published FEAL in 1987, and it fell
quickly to the new attacks. Xuejia Lai and James Massey's IDEA (1991)
became the cipher of PGP. Ron Rivest designed RC2 and the stream cipher
RC4 (both 1987) for RSA Data Security, and Bruce Schneier published
Blowfish in 1993. The [retired ciphers page](../04-symmetric-ciphers/Retired.md)
tells what became of each. NSA's own Skipjack, designed for the Clipper
chip, stayed classified until 1998.

## What this era left behind

- **A theory.** Shannon's perfect secrecy, unicity distance, and
  confusion and diffusion are still the vocabulary of the subject.
- **The block cipher**, and the Feistel network as one standard way to
  build one.
- **A public standard** that anyone could analyse, and twenty years of
  analysis that produced differential and linear cryptanalysis, the main
  tools for judging every block cipher since.
- **A lesson about key length.** 56 bits was a choice, not a law of
  nature, and the cost of searching keys falls every year. AES, chosen in
  2000 and published in 2001, starts at 128 bits; see the
  [internet era](08-Internet-Era.md#aes-a-cipher-chosen-in-public).
- **Distrust of secret design**, from DES's S-boxes to Crypto AG, which
  open competitions were later designed to answer.

## See also

- [Retired ciphers: DES and 3DES](../04-symmetric-ciphers/Retired.md#des):
  what broke DES and where it survives
- [Classic modes](../05-modes-aead/Classic-Modes.md): ECB, CBC, CFB and
  OFB, standardized for DES in 1980
- [AES](../04-symmetric-ciphers/AES.md): the successor
- [Public-key cryptography](07-Public-Key.md): the other revolution of the
  1970s

## References

- Claude E. Shannon, "Communication Theory of Secrecy Systems", *Bell System Technical Journal* 28, no. 4 (October 1949), pp. 656–715 / Shannon, "A Mathematical Theory of Cryptography" (Bell Labs memorandum, 1 September 1945) / Shannon, "A Mathematical Theory of Communication", *BSTJ* 27 (1948)
- Thomas R. Johnson, *American Cryptology during the Cold War, 1945–1989*, Book III (NSA Center for Cryptologic History, 1998; declassified with redactions)
- Horst Feistel, "Cryptography and Computer Privacy", *Scientific American* 228, no. 5 (May 1973), pp. 15–23
- National Bureau of Standards, *Data Encryption Standard*, FIPS PUB 46 (January 1977) / FIPS PUB 81, *DES Modes of Operation* (December 1980) / NIST, withdrawal of FIPS 46-3 (19 May 2005)
- Whitfield Diffie and Martin E. Hellman, "Exhaustive Cryptanalysis of the NBS Data Encryption Standard", *Computer* 10, no. 6 (June 1977), pp. 74–84
- US Senate Select Committee on Intelligence, *Unclassified Summary: Involvement of NSA in the Development of the Data Encryption Standard* (95th Congress, 1978)
- Eli Biham and Adi Shamir, "Differential Cryptanalysis of DES-like Cryptosystems", *Journal of Cryptology* 4 (1991), pp. 3–72 (CRYPTO '90) and "Differential Cryptanalysis of the Full 16-round DES" (CRYPTO '92) / Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher" (EUROCRYPT '93) and "The First Experimental Cryptanalysis of the Data Encryption Standard" (CRYPTO '94)
- Don Coppersmith, "The Data Encryption Standard (DES) and Its Strength against Attacks", *IBM Journal of Research and Development* 38, no. 3 (1994), pp. 243–250
- Electronic Frontier Foundation, *Cracking DES: Secrets of Encryption Research, Wiretap Politics and Chip Design* (O'Reilly, 1998)
- Steven Levy, *Crypto: How the Code Rebels Beat the Government, Saving Privacy in the Digital Age* (Viking, 2001)

*Weaker sources:* search summaries of the Washington Post / ZDF / SRF reporting of February 2020 and of the Crypto Museum's "Operation Rubicon" pages (the 1970 purchase, the BND's exit in the early 1990s, the CIA's in 2018, the country counts); Wikipedia's DES article for Konheim's S-box remark and the quoted wording of the Johnson history, whose declassified text I could not open; the second NBS solicitation (August 1974; NIST's own history gives 17 August, other sources 27 August).
