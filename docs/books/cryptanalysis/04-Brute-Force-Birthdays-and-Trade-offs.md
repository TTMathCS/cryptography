# 4. Brute Force, Birthdays and Trade-offs

*Every cipher, hash and key can be attacked without understanding it at all:
try keys until one fits, or hash inputs until two outputs match. These generic
attacks set the price that every clever attack in the rest of this book is
measured against, so this chapter prices them properly. You will cost a key
search from the 1977 Diffie-Hellman estimate to the Bitcoin network, derive the
birthday bound with both of its bounds and use it to find collisions in
constant memory, break double encryption by meeting in the middle on a cipher
small enough to do by hand, and build a rainbow table that inverts a 24-bit
hash. By the end you will know why keys grew from 56 bits to 128 and then to
256, and why hashes doubled in length.*

!!! abstract "In this chapter"
    **You will learn:**

    - how exhaustive key search works, how many known plaintexts it needs, and
      what it has cost, in dollars, chips and hours, from 1977 to today;
    - the birthday bound with an upper and a lower bound, the two-list version,
      and how it turns into collision attacks that need almost no memory;
    - why 128-bit hashes and 64-bit blocks fail, with the numbers;
    - the meet-in-the-middle attack, done by hand on a 4-bit toy cipher;
    - Hellman's time-memory trade-off and Oechslin's rainbow tables, with the
      chains drawn, the coverage worked out and a working table in Python;
    - multi-target attacks, why they pushed keys from 128 to 256 bits, and what a
      quantum computer adds.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) (attack models and the
    three costs), the birthday bound as book 1 introduces it in
    [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md), and DES and double
    DES from book 1's [Chapter 6](../../book/06-Block-Ciphers.md). A little
    probability: expected values and $1 - x \le e^{-x}$.

    **Levels:** §4.1 to §4.4 are for beginners, §4.5 to §4.8 and §4.10 to §4.11
    are intermediate, §4.9 and §4.12 are expert.

## 4.1 The problem

*Level: beginner.*

Suppose you know nothing about a cipher except that it takes a 56-bit key, and
you hold one block of plaintext together with its ciphertext. You can still break
it. Encrypt the plaintext under key 0 and compare; then under key 1; then key 2.
Somewhere among the $2^{56}$ keys is the one that was used. The method needs no
mathematics, no insight into S-boxes and no luck. It needs only time.

That is **exhaustive key search**, or brute force, and it is the floor under all
of cryptanalysis. A cipher is called broken when someone finds a way to recover
its key faster than this floor ([Chapter 1](01-What-Cryptanalysis-Is.md)), and a
cipher is called dead when the floor itself is low enough to walk over. DES
never died of differential or linear cryptanalysis, the two great attacks of
Part II. It died of brute force, because its key was short.

Hash functions have a floor too, and it is lower than you might expect. Finding
an input that hashes to a given value takes about $2^n$ tries for an $n$-bit hash,
but finding *any two* inputs with the same hash takes only about $2^{n/2}$. That
square root, the **birthday bound**, is why MD5's 128-bit output was too short
before anyone found a flaw in its design, and why a block cipher with 64-bit
blocks wears out after tens of gigabytes.

Between those two lie two more generic ideas. The **meet-in-the-middle** attack
splits a problem into halves and matches them in a table, which is why encrypting
twice under two keys adds only one bit of strength. The **time-memory trade-off**
spends a large precomputation once and then inverts a function again and again in
far less time than a search, which is why stored password hashes without salt
fell to downloaded tables, and why a GSM call could be decrypted from a few
frames.

Figure 4.1 shows the story as dates. It is a story about hardware and money as
much as mathematics: the generic attacks have barely changed since 1980, while the
machines that run them have grown by a factor of a billion.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="Timeline of generic attacks from the 1977 DES cracker estimate to the Bitcoin network in 2025" fill="currentColor" font-size="14">
<line x1="82" y1="8" x2="82" y2="364" stroke="currentColor" stroke-width="1.6"/>
<text x="68" y="27" text-anchor="end" font-weight="bold">1977</text>
<circle cx="82" cy="22" r="4" fill="currentColor"/>
<text x="98" y="27">Diffie and Hellman cost a DES cracker: 20 million dollars, one day</text>
<text x="68" y="54" text-anchor="end" font-weight="bold">1980</text>
<circle cx="82" cy="49" r="4" fill="currentColor"/>
<text x="98" y="54">Hellman's time-memory trade-off</text>
<text x="68" y="81" text-anchor="end" font-weight="bold">1993</text>
<circle cx="82" cy="76" r="4" fill="currentColor"/>
<text x="98" y="81">Wiener designs a one-million-dollar DES cracker: 3.5 hours</text>
<text x="68" y="108" text-anchor="end" font-weight="bold">1995</text>
<circle cx="82" cy="103" r="4" fill="currentColor"/>
<text x="98" y="108">40-bit "export" SSL broken by searching every key</text>
<text x="68" y="135" text-anchor="end" font-weight="bold">1997</text>
<circle cx="82" cy="130" r="4" fill="currentColor"/>
<text x="98" y="135">DESCHALL finds a DES key; distributed.net finds a 56-bit RC5 key</text>
<text x="68" y="162" text-anchor="end" font-weight="bold">1998</text>
<circle cx="82" cy="157" r="4" fill="currentColor"/>
<text x="98" y="162">EFF's Deep Crack finds a DES key in 56 hours</text>
<text x="68" y="189" text-anchor="end" font-weight="bold">2002</text>
<circle cx="82" cy="184" r="4" fill="currentColor"/>
<text x="98" y="189">distributed.net finds a 64-bit RC5 key after 1,757 days</text>
<text x="68" y="216" text-anchor="end" font-weight="bold">2003</text>
<circle cx="82" cy="211" r="4" fill="currentColor"/>
<text x="98" y="216">Oechslin's rainbow tables</text>
<text x="68" y="243" text-anchor="end" font-weight="bold">2006</text>
<circle cx="82" cy="238" r="4" fill="currentColor"/>
<text x="98" y="243">COPACOBANA: a DES key search for under €10,000 of FPGAs</text>
<text x="68" y="270" text-anchor="end" font-weight="bold">2010</text>
<circle cx="82" cy="265" r="4" fill="currentColor"/>
<text x="98" y="270">Public rainbow tables for GSM's A5/1</text>
<text x="68" y="297" text-anchor="end" font-weight="bold">2012</text>
<circle cx="82" cy="292" r="4" fill="currentColor"/>
<text x="98" y="297">crack.sh: any DES key within about a day, as a service</text>
<text x="68" y="324" text-anchor="end" font-weight="bold">2016</text>
<circle cx="82" cy="319" r="4" fill="currentColor"/>
<text x="98" y="324">Sweet32 turns the birthday bound on 64-bit blocks into an attack</text>
<text x="68" y="351" text-anchor="end" font-weight="bold">2025</text>
<circle cx="82" cy="346" r="4" fill="currentColor"/>
<text x="98" y="351">The Bitcoin network passes 10²¹ hashes per second</text>
</svg>
<figcaption>Figure 4.1. Generic attacks over half a century. The methods were all in place by 1980 (exhaustive search, the birthday bound, meet in the middle, Hellman's tables); what changed is the hardware and who could afford it.</figcaption>
</figure>

This chapter treats each generic attack the same way: what it does, what it
costs in time, memory and data, what it has cost in the real world, and what
the defender must do to stay above it. The numbers matter more here than
anywhere else in the book, because the whole point of a generic attack is that
nothing but the numbers stands in its way.

## 4.2 Exhaustive key search

*Level: beginner.*

The method fits in one sentence: decrypt with every key until the result makes
sense. Three questions turn the sentence into an attack. How many keys must you
try? How do you know when you have the right one? And how fast can you go?

**How many tries.** A $k$-bit key has $2^k$ values. If the key was chosen at
random, the right one is equally likely to be anywhere in your search order, so
on average you find it after

$$
\frac{1 + 2 + \cdots + 2^k}{2^k} = \frac{2^k + 1}{2} \approx 2^{k-1}
$$

tries: half the space. The worst case is the whole space. Each extra key bit
doubles both. Ten extra bits make the search a thousand times longer; forty
extra bits make it a trillion times longer. That doubling is the defender's
whole advantage, and it is enormous: encrypting costs the same whether the key
has 56 bits or 256, while the search grows exponentially.

**How you recognize the right key.** With a known plaintext block $P$ and its
ciphertext $C$, a trial key $T$ passes if $E_T(P) = C$. The right key always
passes. A wrong key passes by accident if it happens to map $P$ to $C$ as well.
For an $n$-bit block cipher that behaves like a random permutation for each key,
a wrong key passes with probability about $2^{-n}$. With $m$ known pairs it must
pass all of them, so the expected number of wrong keys that survive is

$$
(2^k - 1) \cdot 2^{-nm}.
$$

For DES, $k = 56$ and $n = 64$, so one pair already leaves $2^{56-64} = 1/256$
false keys on average, and a second pair removes even those. For a cipher whose
key is longer than its block, such as AES-256 ($k = 256$, $n = 128$), one pair
leaves about $2^{128}$ keys that fit, and you need at least three pairs to pin the
key down. The rule is to collect a little more than $k/n$ pairs.

Without any known plaintext, you need a test that recognizes a correct
decryption: the result is ASCII text, or a valid packet header, or a ZIP file
whose checksum works. Each such test gives a few bits of evidence per block,
and you keep decrypting until the evidence adds up to $k$ bits. That is the
**unicity distance** of [Chapter 2](02-Breaking-Classical-Ciphers.md) in modern
form. English text in 8-bit bytes carries roughly 6.5 bits of redundancy per
character, so ten or so characters of ciphertext are enough to identify a 56-bit
key, and about twenty for a 128-bit one. Ciphertext-only brute force is almost
never limited by data; it is limited by time.

**Code it.** A toy cipher with a 20-bit key and 16-bit blocks makes the false
keys visible: one known pair should leave about $2^{20-16} = 16$ keys standing,
and a second pair about $2^{20-32}$, which is less than one, so only the right
key.

```python
import hashlib

def enc(key, block):                    # toy cipher: 20-bit key, 16-bit block
    data = key.to_bytes(3, "big") + block.to_bytes(2, "big")
    return int.from_bytes(hashlib.sha256(data).digest()[:2], "big")

secret = 0x5C0DE                        # the key we pretend not to know
pairs = [(p, enc(secret, p)) for p in (0x4869, 0x2121)]   # two known plaintexts

survivors = list(range(1 << 20))        # every key is a suspect at first
for p, c in pairs:
    survivors = [k for k in survivors if enc(k, p) == c]
    print(f"after pair {hex(p)}: {len(survivors)} keys left")
print("key:", [hex(k) for k in survivors])
```

```
after pair 0x4869: 16 keys left
after pair 0x2121: 1 keys left
key: ['0x5c0de']
```

(This "cipher" is a keyed hash cut to 16 bits, so it cannot be decrypted. That
does not matter here: key search only ever runs the cipher forwards.) The search
over a million keys takes about half a second in Python. Each extra bit doubles
it, so a 40-bit key would take about six days of this laptop's time, and a
56-bit key about a thousand years. Real searches use faster code, many machines
and special chips, which is the subject of §4.3.

**How fast.** Key search is the friendliest job a computer can be given. Every
trial is independent of every other, so a thousand machines go a thousand times
faster, with no communication except "start here" and "I found it". The work is
the same small circuit run over and over, which suits custom chips. And a trial
can stop early: if the first byte of a trial decryption is already wrong, the
rest need not be computed. Hardware designers also exploit the cipher's
structure. DES key search engines unroll all sixteen rounds into a pipeline that
finishes one trial per clock cycle. Eli Biham's **bitslicing** (1997) does the
same in software: treat a 64-bit processor word as 64 one-bit computers, write the
cipher as a circuit of AND, XOR and NOT gates, and test 64 keys at once.

There are also small cipher-specific discounts. DES's complementation property,
$E_{\bar K}(\bar P) = \overline{E_K(P)}$, lets an attacker with a chosen
plaintext test two keys per encryption and halve the search (book 1,
[Chapter 6](../../book/06-Block-Ciphers.md), exercise 10). Such discounts shave a
bit or two. They matter for records, not for whether a key length is safe.

**What a key length must buy.** Because each bit doubles the work and hardware
keeps getting cheaper, a key length is a bet about the future. In January 1996
seven well-known cryptographers (Matt Blaze, Whitfield Diffie, Ronald Rivest,
Bruce Schneier, Tsutomu Shimomura, Eric Thompson and Michael Wiener) wrote a
short report, "Minimal Key Lengths for Symmetric Ciphers to Provide Adequate
Commercial Security". It priced key search on PCs, FPGAs and custom chips at
1995 prices, found that a 40-bit key could be searched by "a pedestrian hacker"
and a 56-bit key by a large company or government in hours to days, and
recommended at least 75 bits immediately and 90 bits to protect data for twenty
years. AES, chosen a few years later, started at 128 bits. Section 4.10 explains
why many systems now use 256.

!!! note "Life story: exhaustive key search"
    **Born:** as old as keys; costed for DES by Whitfield Diffie and Martin
    Hellman in 1977 · **Purpose:** recover a key by trying every value, the
    attack every other attack must beat · **Helped:** killed 40-bit export
    ciphers (1995 to 1997), DES (1998) and 56-bit RC5 (1997); still breaks
    short keys in old protocols and weak passwords everywhere · **Status:**
    current, and the reason minimum key lengths rose from 56 to 80 to 112 and
    128 bits

## 4.3 The price of a key search, 1977 to today

*Level: beginner.*

A key search is a machine that tries keys, a rate at which it tries them, and a
price. The history below is the history of that rate.

**1977: the first estimate.** When DES was published, Whitfield Diffie and
Martin Hellman wrote "Exhaustive Cryptanalysis of the NBS Data Encryption
Standard" (*Computer*, June 1977). They imagined a machine of one million
special chips, each testing one million keys a second, so $10^{12}$ keys per
second in all. It would search the whole $2^{56}$ space in about 20 hours, cost
about \$20 million to build, and, written off over five years, bring the cost of
each key found down to a few thousand dollars. Their point was political as much
as technical: a 56-bit key was within reach of a government, and the standard
should have used a longer one. The machine was never built, at least not in
public. Book 1 tells the rest of the DES story in
[Chapter 6](../../book/06-Block-Ciphers.md); here we follow the rate.

**1993: Wiener's design.** Michael Wiener of Bell-Northern Research presented
"Efficient DES Key Search" in August 1993. He designed a custom chip with a
16-stage pipeline doing one DES encryption per clock, put 57,600 chips on boards
and frames, and costed the result in full, down to the cabinets: a \$1 million
machine that found a DES key in 3.5 hours on average. It was a design, not a
machine, but it was detailed enough that nobody could dismiss it, and it moved
the debate from "possible for the NSA" to "possible for a large company".

**1995 to 1997: 40-bit keys fall in public.** US export rules of the time let
software use only 40-bit keys in exported products, so the international version
of the Netscape browser protected SSL with 40-bit RC4. In August 1995 Damien
Doligez, a researcher at INRIA in France, answered a public challenge by
searching the 40-bit key space of one recorded SSL session on about 120
workstations and parallel machines in eight days. Others soon did it faster. In
January 1997 RSA Data Security posted secret-key challenges with prizes;
Ian Goldberg, then a graduate student at Berkeley, found the 40-bit RC5 key in
three and a half hours on a network of 250 workstations. A 48-bit key fell in
under two weeks.

**1997 to 2002: volunteers.** The 56-bit challenges needed more than one
campus. Rocke Verser's DESCHALL ran a client on thousands of volunteers'
computers and found the DES key in June 1997, after 96 days. In the same year a
group of volunteers formed **distributed.net**, which found the 56-bit RC5 key in
October 1997 after 250 days. It went on to the 64-bit RC5 key, $2^8 = 256$ times
harder, and found it in July 2002 after 1,757 days with more than 300,000
participants over the years. Its search for the 72-bit RC5 key started in
December 2002 and is still running; RSA withdrew the prize in 2007, and after two
decades the project has covered only a small fraction of the $2^{72}$ keys.

**1998: Deep Crack.** The Electronic Frontier Foundation's machine, 1,856
custom chips for under \$250,000, searched about 90 billion keys a second and
found an RSA challenge key in 56 hours in July 1998; with distributed.net it took
22 hours and 15 minutes in January 1999. Book 1 tells that story and gives its
Life story card; what matters here is the price. Deep Crack was about eighty times
cheaper than the 1977 estimate and only about ten times slower.

**2006: COPACOBANA.** Researchers at the Universities of Bochum and Kiel built
the "Cost-Optimized Parallel Code Breaker" from 120 off-the-shelf Xilinx
Spartan-3 FPGAs on 20 small cards, for under €10,000 in parts. It searched about
48 billion DES keys a second and found a key in under nine days on average (8.7 days in the 2006 paper; later reports give about 6.4 days at a higher clock rate). Their point
was that a custom chip, with its million-dollar design cost, was no longer
needed: reprogrammable chips bought at retail could break DES for the price of a
used car, and the same box could be loaded with other ciphers. Its successor,
RIVYERA, did the job in under a day.

!!! note "Life story: COPACOBANA"
    **Born:** 2006, Sandeep Kumar, Christof Paar, Jan Pelzl, Gerd Pfeiffer and
    Manfred Schimmler, Universities of Bochum and Kiel; 120 Spartan-3 FPGAs ·
    **Purpose:** to show that code breaking needs no custom silicon, only cheap
    reprogrammable chips · **Helped:** DES keys in about nine days for under
    €10,000; later used on A5/1, elliptic curve logarithms and old smart-card
    ciphers; led to commercial FPGA crackers · **Status:** retired, replaced by
    larger FPGA machines and GPUs

**2012: DES as a service.** At DEF CON in July 2012 Moxie Marlinspike and David
Hulton showed that every MS-CHAPv2 handshake, then used by most corporate VPNs
and WPA2-Enterprise Wi-Fi, could be reduced to a single DES key search. Hulton
built a box of 48 FPGAs that searched about 770 billion DES keys a
second, the whole space in about 26 hours, and they put it online: upload a
captured handshake, pay a small fee, get the password hash back. The service ran
for years afterwards as crack.sh. The lesson was that DES had survived in
protocols long after it was withdrawn as a standard in 2005, and a one-day search
was now a commodity.

**GPUs.** Graphics cards are thousands of small processors built for
arithmetic in parallel, and since about 2008 they have been the attacker's
everyday tool. The open-source hashcat program publishes benchmarks for every
new card: a single high-end card of 2022, the Nvidia RTX 4090, computes about
160 billion MD5 hashes a second and about 20 billion SHA-256 hashes. That makes a
rack of gaming cards faster than Deep Crack at a tenth of the price, and it is
why fast hashes are useless for storing passwords (book 1,
[Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)). Benchmarks of this
kind change with every driver and card, so treat them as orders of magnitude.

**Bitcoin: the world's hashing power.** The largest key-search-like machine ever
built is not a code breaker at all. Bitcoin mining is a brute-force search for a
block header whose double SHA-256 hash falls below a target; miners compete by
trying hashes faster. The network's total rate is public, estimated from how
often blocks are found, and it passed $10^{21}$ hashes per second (a zettahash)
in 2025. A single 2024 mining ASIC does about $2 \times 10^{14}$ per second and
uses about 17.5 joules per trillion hashes. These machines can compute nothing
but SHA-256d, so they cannot be turned on AES or on anything else. But they are
an honest measure of what the world will spend on brute force when the reward
is real: billions of dollars of chips and a large country's worth of
electricity.

Put the rates side by side, and the right scale is logarithmic (Figure 4.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 316" width="640" role="img" aria-label="Keys or hashes tried per second, on a log scale, from 1977 to 2025" fill="currentColor" font-size="14">
<text x="292" y="35" text-anchor="end" font-size="13">Diffie-Hellman design, 1977 (never built)</text>
<rect x="300" y="22" width="69.4" height="18" fill="currentColor" opacity="0.55"/>
<text x="374.4" y="35" font-size="12">10¹²</text>
<text x="292" y="69" text-anchor="end" font-size="13">Deep Crack, 1998</text>
<rect x="300" y="56" width="45.4" height="18" fill="currentColor" opacity="0.55"/>
<text x="350.4" y="69" font-size="12">9.2 × 10¹⁰</text>
<text x="292" y="103" text-anchor="end" font-size="13">COPACOBANA, 2006</text>
<rect x="300" y="90" width="38.9" height="18" fill="currentColor" opacity="0.55"/>
<text x="343.9" y="103" font-size="12">4.8 × 10¹⁰</text>
<text x="292" y="137" text-anchor="end" font-size="13">crack.sh FPGA box, 2012</text>
<rect x="300" y="124" width="66.8" height="18" fill="currentColor" opacity="0.55"/>
<text x="371.8" y="137" font-size="12">7.7 × 10¹¹</text>
<text x="292" y="171" text-anchor="end" font-size="13">One GPU, MD5, 2022</text>
<rect x="300" y="158" width="51.0" height="18" fill="currentColor" opacity="0.55"/>
<text x="356.0" y="171" font-size="12">1.6 × 10¹¹</text>
<text x="292" y="205" text-anchor="end" font-size="13">One Bitcoin miner, SHA-256d, 2024</text>
<rect x="300" y="192" width="122.7" height="18" fill="currentColor" opacity="0.55"/>
<text x="427.7" y="205" font-size="12">2 × 10¹⁴</text>
<text x="292" y="239" text-anchor="end" font-size="13">Bitcoin network, SHA-256d, 2025</text>
<rect x="300" y="226" width="277.7" height="18" fill="currentColor" opacity="0.55"/>
<text x="582.7" y="239" font-size="12">10²¹</text>
<line x1="300" y1="14" x2="300" y2="264" stroke="currentColor" stroke-width="1.2"/>
<line x1="300" y1="264" x2="624" y2="264" stroke="currentColor" stroke-width="1.2"/>
<line x1="300.0" y1="264" x2="300.0" y2="269" stroke="currentColor" stroke-width="1.2"/>
<text x="300.0" y="284" text-anchor="middle" font-size="12">10⁹</text>
<line x1="369.4" y1="264" x2="369.4" y2="269" stroke="currentColor" stroke-width="1.2"/>
<text x="369.4" y="284" text-anchor="middle" font-size="12">10¹²</text>
<line x1="438.9" y1="264" x2="438.9" y2="269" stroke="currentColor" stroke-width="1.2"/>
<text x="438.9" y="284" text-anchor="middle" font-size="12">10¹⁵</text>
<line x1="508.3" y1="264" x2="508.3" y2="269" stroke="currentColor" stroke-width="1.2"/>
<text x="508.3" y="284" text-anchor="middle" font-size="12">10¹⁸</text>
<line x1="577.7" y1="264" x2="577.7" y2="269" stroke="currentColor" stroke-width="1.2"/>
<text x="577.7" y="284" text-anchor="middle" font-size="12">10²¹</text>
<text x="462.0" y="304" text-anchor="middle" font-size="13">trials per second (log scale)</text>
</svg>
<figcaption>Figure 4.2. Trial rates of famous search machines. The first five search DES keys or MD5 hashes; the Bitcoin figures are double SHA-256 hashes, shown as a measure of the world's brute-force capacity. From Deep Crack to the Bitcoin network is a factor of ten billion.</figcaption>
</figure>

**Code it.** Turn rates into times. The program below gives the average time,
half the key space, for each machine against keys of 56, 64, 80 and 128 bits. The
Bitcoin line asks what the network would do if its hashing power could test keys
instead, which it cannot; it is there as a ceiling.

```python
def human(s):                           # seconds, in the largest unit that fits
    for unit, size in (("years", 365.25 * 86400), ("days", 86400), ("hours", 3600), ("minutes", 60)):
        if s >= size:
            return f"{s / size:.3g} {unit}"
    return f"{s:.3g} seconds"

rates = [                               # keys (or hashes) tried per second
    ("Diffie-Hellman design, 1977", 1e12),
    ("Deep Crack, 1998", 9.2e10),
    ("COPACOBANA, 2006", 4.8e10),
    ("crack.sh FPGA box, 2012", 7.7e11),
    ("one RTX 4090, MD5, 2022", 1.6e11),
    ("Bitcoin network, 2025", 1e21),
]
for bits in (56, 64, 80, 128):
    print(f"{bits}-bit key, average time (half the space):")
    for name, r in rates:
        print(f"  {name:30} {human(2 ** (bits - 1) / r)}")
```

```
56-bit key, average time (half the space):
  Diffie-Hellman design, 1977    10 hours
  Deep Crack, 1998               4.53 days
  COPACOBANA, 2006               8.69 days
  crack.sh FPGA box, 2012        13 hours
  one RTX 4090, MD5, 2022        2.61 days
  Bitcoin network, 2025          3.6e-05 seconds
64-bit key, average time (half the space):
  Diffie-Hellman design, 1977    107 days
  Deep Crack, 1998               3.18 years
  COPACOBANA, 2006               6.09 years
  crack.sh FPGA box, 2012        139 days
  one RTX 4090, MD5, 2022        1.83 years
  Bitcoin network, 2025          0.00922 seconds
80-bit key, average time (half the space):
  Diffie-Hellman design, 1977    1.92e+04 years
  Deep Crack, 1998               2.08e+05 years
  COPACOBANA, 2006               3.99e+05 years
  crack.sh FPGA box, 2012        2.49e+04 years
  one RTX 4090, MD5, 2022        1.2e+05 years
  Bitcoin network, 2025          10.1 minutes
128-bit key, average time (half the space):
  Diffie-Hellman design, 1977    5.39e+18 years
  Deep Crack, 1998               5.86e+19 years
  COPACOBANA, 2006               1.12e+20 years
  crack.sh FPGA box, 2012        7e+18 years
  one RTX 4090, MD5, 2022        3.37e+19 years
  Bitcoin network, 2025          5.39e+09 years
```

Read the table from the bottom. A machine with the hashing power of the whole
Bitcoin network would go through the average 80-bit search in ten minutes. That
is why 80 bits, the old minimum, was retired: NIST stopped accepting 80-bit
security for new protection after 2013 (SP 800-131A), and its current guidance
(SP 800-57 Part 1) asks for 112 bits now and 128 bits for anything that must
stay secret beyond 2030. Against a 128-bit key the same machine needs five
billion years on average, longer than the Earth has existed. Deep Crack's 56-hour
record, by the way, was luck: it found the key after searching about a quarter of
the space, against an average of half.

**Energy, the last word.** Machines get faster; physics does not change.
Erasing one bit of information at room temperature costs at least $kT \ln 2
\approx 2.9 \times 10^{-21}$ joules (Landauer's principle), and any irreversible
computation pays it. Price the three key sizes in today's mining hardware and at
that physical limit, in years of the world's entire energy use and in the total
output of the Sun over its lifetime:

```python
import math

landauer = 1.380649e-23 * 300 * math.log(2)   # joules to erase one bit at 300 K
per_hash = 17.5e-12                     # joules per SHA-256d hash, a good 2024 miner (17.5 J/TH)
world = 6e20                            # joules of primary energy the world uses in a year, roughly
sun = 3.8e26 * 1e10 * 3.156e7           # joules the Sun puts out in ten billion years

for bits in (80, 128, 256):
    n = 2.0 ** bits
    print(f"2^{bits}: miners {n * per_hash / world:.1e} world-years; "
          f"one bit flip each at Landauer's limit {n * landauer / world:.1e} world-years, "
          f"{n * landauer / sun:.1e} Suns")
```

```
2^80: miners 3.5e-08 world-years; one bit flip each at Landauer's limit 5.8e-18 world-years, 2.9e-41 Suns
2^128: miners 9.9e+06 world-years; one bit flip each at Landauer's limit 1.6e-03 world-years, 8.1e-27 Suns
2^256: miners 3.4e+45 world-years; one bit flip each at Landauer's limit 5.5e+35 world-years, 2.8e+12 Suns
```

The honest reading is subtle. With today's best hashing hardware, $2^{128}$
operations would take ten million years of all the energy humanity uses. Physics
alone does not forbid $2^{128}$: a computer working at Landauer's limit and doing
a single bit erasure per trial would need less than a day's worth of the world's
energy. What forbids it is engineering. A real trial is an AES encryption,
thousands of gate operations, each far above the limit, and the gap between the
best chips and Landauer's limit is roughly a factor of a billion. A 256-bit key
is different in kind: merely counting to $2^{256}$, at the physical limit, would
use the whole lifetime output of a trillion Suns. No improvement in engineering
can touch that. This argument appears in Bruce Schneier's *Applied Cryptography*
(1996) and it is the reason nobody seriously discusses brute-forcing a 256-bit
key.

!!! note "Life story: distributed.net"
    **Born:** 1997, volunteers led by Adam Beberg, Jeff Lawson and David
    McNett, for RSA's secret-key challenges · **Purpose:** to show in public how
    quickly idle computers could search a key space · **Helped:** RC5-56 in
    250 days (1997), DES in 22 hours with Deep Crack (1999), RC5-64 in 1,757
    days (2002); made the case against 56- and 64-bit keys with real numbers ·
    **Status:** still running its 72-bit RC5 search, now mostly a demonstration
    of how far 72 bits is beyond volunteer computing

## 4.4 The birthday bound, derived

*Level: beginner.*

Book 1 introduced the birthday bound in
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md): among 23 people,
two probably share a birthday, and in general repeats among random values from a
set of size $N$ show up after about $\sqrt N$ draws. That chapter gives the
product formula and the famous constants. This section proves the bound in the
form attackers actually use, with a ceiling and a floor, and then extends it to
the two-list case that drives meet-in-the-middle and multi-target attacks.

Set up the experiment. Draw $k$ values $x_1, \dots, x_k$ independently and
uniformly from a set of size $N$ (hash outputs, ciphertext blocks, nonces). A
**collision** is a pair $i < j$ with $x_i = x_j$. Let $P(k, N)$ be the chance that
at least one collision occurs.

**Step 1: count pairs.** There are $\binom{k}{2} = k(k-1)/2$ pairs, and each pair
collides with probability exactly $1/N$, because whatever $x_i$ is, $x_j$ hits it
with probability $1/N$. By linearity of expectation, which needs no independence
between pairs, the expected number of colliding pairs is exactly

$$
\mathbb{E}[\#\text{collisions}] = \frac{k(k-1)}{2N}.
$$

This is the heart of the matter. The number of pairs grows as the **square** of
the number of draws, so the expected number of collisions reaches 1 when
$k \approx \sqrt{2N}$, long before $k$ is anywhere near $N$.

**Step 2: the ceiling.** The chance of at least one event is at most the sum of
the chances (the union bound), so

$$
P(k, N) \le \frac{k(k-1)}{2N}.
$$

An attacker who makes $k$ draws can never do better than this. A designer uses it
the other way round: if a system makes at most $k$ random choices, the chance of
any repeat is below $k^2/2N$. That is the form in which the bound appears in
security proofs of modes and nonces, and in NIST's limits on how much data one
key may protect.

**Step 3: the floor.** The chance of no collision is the product from book 1,

$$
1 - P(k, N) = \prod_{i=1}^{k-1}\left(1 - \frac{i}{N}\right)
\le \prod_{i=1}^{k-1} e^{-i/N} = e^{-k(k-1)/2N},
$$

using $1 - x \le e^{-x}$, which holds for every real $x$. So

$$
P(k, N) \ge 1 - e^{-k(k-1)/2N}.
$$

Unlike the approximation in book 1, this is a true inequality. To turn it into
something linear, use the fact that $1 - e^{-x} \ge (1 - 1/e)\,x$ for
$0 \le x \le 1$ (the curve $1 - e^{-x}$ is concave, so on $[0, 1]$ it lies above
the straight line joining its ends). With $x = k(k-1)/2N$ this gives, whenever
$k(k-1) \le 2N$,

$$
0.316 \cdot \frac{k(k-1)}{N} \;\le\; P(k, N) \;\le\; 0.5 \cdot \frac{k(k-1)}{N}.
$$

The ceiling and the floor differ only by a factor of about 1.6. The collision
probability is pinned to $k^2/N$ up to a constant: to get a constant chance you
need $\Theta(\sqrt N)$ draws, no more and no fewer. For $N = 2^n$ that is
$2^{n/2}$, the number every designer remembers.

**Step 4: the 50% point.** Setting $1 - e^{-k^2/2N} = 1/2$ gives
$k = \sqrt{2 \ln 2 \cdot N} \approx 1.177\sqrt N$. For $N = 2^{64}$ that is about
$5.1 \times 10^9$ draws; for $N = 2^{128}$, about $2.2 \times 10^{19}$.

A worked example by hand, with small numbers. Take $N = 2^{20} = 1{,}048{,}576$
(a 20-bit tag) and $k = 1{,}206$ draws:

- pairs: $1206 \cdot 1205 / 2 = 726{,}615$;
- expected collisions: $726{,}615 / 1{,}048{,}576 \approx 0.693$, which is $\ln 2$;
- floor: $1 - e^{-0.693} = 0.500$;
- ceiling: $0.693$.

So 1,206 draws give a 50% chance of a repeat among a million values.

**Code it.** The program checks the exact product, the exponential form, the
ceiling and the linear floor against a simulation of 2,000 trials for each $k$.
The floor is only claimed while $k(k-1) \le 2N$, so it is left out for the last
row.

```python
import math, random

def exact(k, N):                        # chance of at least one repeat, multiplied out
    q = 1.0
    for i in range(k):
        q *= (N - i) / N
    return 1 - q

N = 2 ** 20
random.seed(4)
print("   k   exact  1-e^(-k^2/2N)  upper k^2/2N  lower 0.316k(k-1)/N  simulated")
for k in (256, 724, 1206, 1448, 2048):
    hits = 0
    for _ in range(2000):               # 2000 rooms of k random draws each
        seen = set()
        for _ in range(k):
            x = random.randrange(N)
            if x in seen:
                hits += 1
                break
            seen.add(x)
    low = f"{0.316 * k * (k - 1) / N:.3f}" if k * (k - 1) <= 2 * N else "n/a"
    print(f"{k:5} {exact(k, N):7.3f} {1 - math.exp(-k * k / 2 / N):12.3f} "
          f"{min(1, k * k / 2 / N):13.3f} {low:>15} {hits / 2000:12.3f}")
```

```
   k   exact  1-e^(-k^2/2N)  upper k^2/2N  lower 0.316k(k-1)/N  simulated
  256   0.031        0.031         0.031           0.020        0.035
  724   0.221        0.221         0.250           0.158        0.218
 1206   0.500        0.500         0.694           0.438        0.492
 1448   0.632        0.632         1.000           0.631        0.639
 2048   0.865        0.865         1.000             n/a        0.853
```

The exponential form is indistinguishable from the exact product, the
simulation agrees with both to within its sampling noise, and the true value
always sits between the floor and the ceiling. At small $k$ the ceiling is
almost exact, which is why designers can use it without losing anything.

**Two lists.** Many attacks do not look for a repeat inside one list but for a
match **between** two: a value the attacker computed that equals a value the
victim produced. Draw $k_1$ values in list A and $k_2$ in list B, all
independent and uniform over $N$. There are $k_1 k_2$ cross pairs, each matching
with probability $1/N$, so the expected number of matches is $k_1 k_2 / N$ and,
by the same argument as before,

$$
1 - e^{-k_1 k_2 / N} \;\le\; P(\text{a match}) \;\le\; \frac{k_1 k_2}{N}.
$$

(The floor needs the $k_1$ values in A to be distinct, which the attacker can
always arrange by discarding repeats. Then each value in B misses all of them with
probability $1 - k_1/N \le e^{-k_1/N}$, independently, and the $k_2$ misses
multiply.) The attacker can split the work any way he likes. With
$k_1 = k_2 = \sqrt N$ the cost is $2\sqrt N$, the same as the single-list
birthday attack. But if the victim supplies $k_2 = 2^{40}$ values for free, the
attacker needs only $k_1 = N / 2^{40}$ of his own. That trade, his work against
the victim's data, is the multi-target attack of §4.10.

**When the values are not uniform.** Everything so far assumed every value is
equally likely. If value $v$ has probability $p_v$, a single pair collides with
probability $\sum_v p_v^2$, and by the Cauchy-Schwarz inequality that sum is at
least $1/N$, with equality only for the uniform distribution. Non-uniform values
collide **sooner**. Passwords are the classic case: so many people choose the
same few that the "birthday" of two users' password hashes arrives after a
handful of accounts. For a well-designed hash or cipher, outputs are as close to
uniform as anyone can measure, and the uniform bound is the one to use.

!!! note "Life story: the birthday bound"
    **Born:** the birthday puzzle is usually credited to Richard von Mises
    (1939); Gideon Yuval turned it into an attack on signatures in 1979 ·
    **Purpose:** to count how many random draws produce a repeat: about the
    square root of the number of possible values · **Helped:** set hash outputs
    at twice the security level, block sizes at 128 bits, random nonces at 96
    bits or more, and the data limits in every modern mode's standard ·
    **Status:** current; it is a theorem, so it will never be "fixed", only
    designed around

## 4.5 Collisions in practice

*Level: intermediate.*

The birthday attack sounds simple: hash $2^{n/2}$ random inputs, store them, and
look for two equal outputs. For a 128-bit hash, $2^{64}$ outputs of 16 bytes
each would fill about 300 million terabytes of disk. The time is affordable to a
large attacker; the memory is not. The real attack needs almost no memory at all,
thanks to an idea from 1975.

### The rho method

Pick a function $f$ from a set of $N$ values to itself, such as a hash cut to $n$
bits. Start anywhere, at $x_0$, and walk: $x_1 = f(x_0)$, $x_2 = f(x_1)$, and so
on. The set is finite, so the walk must eventually revisit a value, and from then
on it goes round a cycle forever. Drawn on paper the path looks like the Greek
letter $\rho$: a tail that leads into a loop (Figure 4.3).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The rho shape: a walk x0, f(x0), ... runs along a tail into a cycle; the tail's last point and the cycle's last point both map to the entry point, a collision" fill="currentColor" font-size="14">
<defs><marker id="rho-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<line x1="57.7" y1="247.7" x2="101.4" y2="234.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="117.7" y1="229.7" x2="161.4" y2="216.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="177.7" y1="211.7" x2="221.4" y2="198.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="237.6" y1="193.4" x2="281.5" y2="178.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="297.7" y1="172.7" x2="366.4" y2="152.5" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="377.7" y1="142.5" x2="394.1" y2="97.4" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="404.2" y1="84.9" x2="445.7" y2="60.9" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="461.4" y1="57.8" x2="508.6" y2="66.2" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="522.6" y1="73.9" x2="553.5" y2="110.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="559.3" y1="125.5" x2="559.3" y2="173.5" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="554.1" y1="188.6" x2="523.3" y2="225.4" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="509.6" y1="233.7" x2="462.4" y2="242.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="446.6" y1="239.6" x2="405.0" y2="215.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<line x1="394.5" y1="203.5" x2="378.1" y2="158.5" stroke="currentColor" stroke-width="1.4" marker-end="url(#rho-ar)"/>
<circle cx="50.0" cy="250.0" r="5" fill="currentColor"/>
<circle cx="110.0" cy="232.0" r="5" fill="currentColor"/>
<circle cx="170.0" cy="214.0" r="5" fill="currentColor"/>
<circle cx="230.0" cy="196.0" r="5" fill="currentColor"/>
<circle cx="290.0" cy="175.0" r="5" fill="currentColor"/>
<circle cx="375.0" cy="150.0" r="5" fill="currentColor"/>
<circle cx="397.2" cy="88.9" r="5" fill="currentColor"/>
<circle cx="453.5" cy="56.4" r="5" fill="currentColor"/>
<circle cx="517.5" cy="67.7" r="5" fill="currentColor"/>
<circle cx="559.3" cy="117.5" r="5" fill="currentColor"/>
<circle cx="559.3" cy="182.5" r="5" fill="currentColor"/>
<circle cx="517.5" cy="232.3" r="5" fill="currentColor"/>
<circle cx="453.5" cy="243.6" r="5" fill="currentColor"/>
<circle cx="397.2" cy="211.1" r="5" fill="currentColor"/>
<circle cx="375.0" cy="150.0" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="50" y="276" text-anchor="middle">x₀</text>
<text x="150" y="268">tail</text>
<text x="470" y="155" text-anchor="middle">cycle</text>
<text x="284" y="199" text-anchor="middle">a</text>
<text x="383.2" y="233.1" text-anchor="middle">b</text>
<text x="359.0" y="136.0" text-anchor="end">f(a) = f(b)</text>
</svg>
<figcaption>Figure 4.3. The rho shape. Iterating a function on a finite set must repeat a value. The point where the tail joins the cycle has two arrows coming in, from a on the tail and from b on the cycle, so f(a) = f(b): a collision found while storing only two values.</figcaption>
</figure>

Look at the point where the tail joins the cycle. Two arrows lead into it: one
from the last point of the tail, $a$, and one from the last point of the cycle,
$b$. Since $a \ne b$ and $f(a) = f(b)$, that junction **is** a collision. And a
random function's walk is a sequence of random values until the first repeat, so
by §4.4 the tail plus the cycle has length about $\sqrt{\pi N / 2}$: the
birthday bound, reached without storing anything.

To find the junction with constant memory, use **Floyd's cycle-finding
algorithm**, often told as the tortoise and the hare. The tortoise moves one step
at a time, the hare two. Once both are on the cycle the hare gains one step per
move, so it catches the tortoise within one lap. Where they meet, the number of
steps the tortoise has taken, $i$, is a multiple of the cycle length. Now put one
walker back at $x_0$, leave the other at $x_i$, and move both one step at a time.
They are always $i$ steps apart, a whole number of laps, so they first stand on
the same value at the junction, and the step before that gives $a$ and $b$. John
Pollard used exactly this walk in 1975 to factor integers and in 1978 to compute
discrete logarithms, which is why it is called **Pollard's rho**; Chapters
[11](11-Factoring.md) and [12](12-Discrete-Logarithms.md) use it again.

**Code it.** A collision in SHA-256 cut to 40 bits, $N = 2^{40}$, with memory for
two values. The birthday bound says about $2^{20}$ steps, and Floyd's method
spends three hash calls per step in the first phase.

```python
import hashlib

BYTES = 5                               # a 40-bit "hash": SHA-256 cut to 5 bytes
def f(x):
    return hashlib.sha256(x).digest()[:BYTES]

def rho_collision(start):
    calls = 0
    tortoise, hare = f(start), f(f(start))
    calls += 3
    while tortoise != hare:             # phase 1: the hare laps the tortoise on the cycle
        tortoise, hare = f(tortoise), f(f(hare))
        calls += 3
    tortoise = start                    # phase 2: walk from the start and from the meeting point
    while f(tortoise) != f(hare):
        tortoise, hare = f(tortoise), f(hare)
        calls += 2
    return tortoise, hare, calls        # two different inputs, one output (unless start was on the cycle)

a, b, calls = rho_collision(b"Mars")
print(a.hex(), "->", f(a).hex())
print(b.hex(), "->", f(b).hex())
print(f"{calls:,} hash calls, about 2^{calls.bit_length() - 1}; memory: two values")
```

```
8d939755a3 -> 27f458f3a3
ca8e37a8c0 -> 27f458f3a3
5,873,712 hash calls, about 2^22; memory: two values
```

About six million SHA-256 calls and two seconds in Python, for a 40-bit
collision found in the space of a few variables. The constant factor (about five
to six times $2^{20}$) is the price of using no memory; with a table it would be
about $1.25 \cdot 2^{20}$.

### Distinguished points: collisions in parallel

Floyd's method has one weakness: it is sequential. A thousand machines running
a thousand independent walks each find their own collision in the same time as
one. In 1994 Paul van Oorschot and Michael Wiener fixed that with **distinguished
points**, an idea they credited to Ronald Rivest. Call a value distinguished if,
say, its first 20 bits are zero. Every machine starts a walk at a random point
and stops when it reaches a distinguished point, then reports the start, the
distinguished end and the length to a central server, and starts again. When two
walks from different machines ever touch the same value, they coincide from then
on and end at the **same** distinguished point. The server sees two reports with
one endpoint, rewalks both from their starts, and finds the exact point where
they merged: a collision. The memory is one entry per walk, the work divides
evenly among the machines, and the total is still about $\sqrt{\pi N/2}$ plus a
small overhead.

Van Oorschot and Wiener priced it for MD5 in 1994: a \$10 million machine of
custom chips would find an MD5 collision in about 24 days by brute force alone.
Nobody built it. A volunteer project, MD5CRK, set out in 2004 to show the same
thing with idle PCs, and stopped in August 2004 when Xiaoyun Wang's team
announced real MD5 collisions found by cryptanalysis in hours
([Chapter 9](09-Breaking-Hash-Functions.md)). The cryptanalysts got there first,
but the generic attack had already made the point: 64 bits of collision security
is not enough.

!!! note "Life story: parallel collision search"
    **Born:** 1994, Paul van Oorschot and Michael Wiener, using Ronald Rivest's
    distinguished points and Pollard's rho walk · **Purpose:** to find
    collisions on many machines at once with almost no memory · **Helped:** the
    1994 estimate of an MD5 collision in 24 days for \$10 million; the standard
    way to compute elliptic curve discrete logarithms (every ECC record since);
    meet-in-the-middle with little memory (§4.12) · **Status:** current; it is
    how any large generic collision or discrete log computation is run

### Why 128-bit hashes fail

An $n$-bit hash promises $2^n$ work to find a preimage and only $2^{n/2}$ to find a
collision. For MD5, $n = 128$, so collisions cost $2^{64}$ hash calls generically.
In 1994 that was \$10 million and three weeks. Today, by the table in §4.3, the
Bitcoin network computes $2^{64}$ hashes in about 0.02 seconds and $2^{80}$, the
generic collision cost of 160-bit SHA-1, in about 20 minutes. Those ASICs compute
only double SHA-256, so they cannot be turned on MD5 or SHA-1. But the number
tells you what the world can afford when it wants to, and it is far beyond
$2^{64}$ and close to $2^{80}$.

Does a collision matter if the two colliding inputs are random garbage? Gideon
Yuval answered in 1979 with "How to Swindle Rabin". Write a harmless contract and
a harmful one. Find 32 places in each where a change makes no visible difference:
a space or two after a full stop, "the" or "this", a comma or none. That gives
$2^{32}$ variants of each. Hash all of them; by the two-list bound, with
$k_1 = k_2 = 2^{32}$ and $N = 2^{64}$, a harmless variant and a harmful variant
probably share a 64-bit hash. Have the victim sign the harmless one; the
signature fits the harmful one too. So **any** collision attack becomes a
forgery when the attacker controls both documents, and the security level of an
$n$-bit hash against forgery is $n/2$ bits, not $n$. That is why SHA-256 has a
256-bit output for 128-bit security, and why truncated hashes and 128-bit MACs
used as hashes are suspect. Chapter 9 shows how cryptanalysis then pushed MD5 and
SHA-1 far below even their birthday bounds.

### Block ciphers: the Sweet32 argument

The same bound limits block ciphers through their block size, not their key. A
block cipher under one key is a permutation of $2^b$ values, so it never maps two
different inputs to the same output. In CBC mode each input block is
$P_i \oplus C_{i-1}$, which looks random, so the outputs $C_i$ behave like random
$b$-bit values with one difference: they never repeat unless the inputs do. Now
suppose $C_i = C_j$ for $i \ne j$. Then the inputs were equal:

$$
P_i \oplus C_{i-1} = P_j \oplus C_{j-1}
\quad\Longrightarrow\quad
P_i \oplus P_j = C_{i-1} \oplus C_{j-1}.
$$

The right side is visible to any eavesdropper. So every ciphertext collision
hands over the XOR of two plaintext blocks; if one is known (an HTTP header),
the other (a secret cookie) falls out.

How much data until collisions appear? By §4.4, after $D$ blocks the expected
number of colliding pairs is about $D^2 / 2^{b+1}$. For a 64-bit block that is
one collision after $2^{32}$ blocks, or 32 GiB. Karthikeyan Bhargavan and Gaëtan
Leurent made the argument concrete in 2016 with **Sweet32**. JavaScript on a page
the attacker controls makes the victim's browser send the same secret cookie
in millions of requests over one long-lived HTTPS connection protected by
triple DES. The attacker records everything, waits for collisions where one block
is the cookie and the other is known, and reads the cookie. They needed about
785 GB and under two days. The attack needs no weakness in triple DES at all;
it would work just as well against an ideal 64-bit cipher. The fix was to stop
using 64-bit blocks: browsers and servers dropped triple DES, NIST limited triple
DES to $2^{20}$ blocks per key in SP 800-67 (revision 2, 2017) and disallowed it
for encryption after 2023, and modes on 128-bit blocks such as AES-GCM push the
same bound out to $2^{64}$ blocks. The full attack, with the other modes it
applies to, is in [Chapter 10](10-Attacks-on-Modes-and-MACs.md); book 1's
[Chapter 6](../../book/06-Block-Ciphers.md) has the Life story card.

Notice the pattern. For keys, the generic attack costs $2^k$ and the defender
chooses $k$. For collisions, it costs $2^{n/2}$, so the defender doubles $n$.
For block size, the cost is measured in data, $2^{b/2}$ blocks, and the defender
either chooses $b = 128$ or changes keys long before the bound.

## 4.6 Meet in the middle

*Level: intermediate.*

Book 1's [Chapter 6](../../book/06-Block-Ciphers.md) introduces the
meet-in-the-middle attack on double DES and runs it on a toy Feistel cipher with
16-bit keys. This section does it once entirely by hand, so every table entry can
be checked, and then works out the costs and where else the idea applies.

First, the name. A **man-in-the-middle** attack is an attacker sitting between
two parties in a protocol, such as the classic attack on unauthenticated
Diffie-Hellman. A **meet-in-the-middle** attack is a way to split a computation
in two and match the halves. They have nothing to do with each other except the
letters MITM; this book spells both out.

**The idea.** Double encryption computes $C = E_{K_2}(E_{K_1}(P))$. Write the
value in the middle as $X$. It can be computed from either end:
$X = E_{K_1}(P)$ from the front, and $X = D_{K_2}(C)$ from the back. So instead
of guessing both keys together ($2^{2k}$ pairs), guess each key alone ($2^k$ each)
and look for the two guesses that agree on $X$. The cost is a sum where brute
force pays a product.

### A worked example by hand

Use the smallest cipher that still makes the point: a 4-bit block, a 4-bit key,
and one round that adds the key and then applies the 4-bit S-box of the
lightweight cipher PRESENT,

$$
E_k(x) = S[x \oplus k], \qquad D_k(y) = S^{-1}[y] \oplus k,
$$

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $S[x]$ | C | 5 | 6 | B | 9 | 0 | A | D | 3 | E | F | 8 | 4 | 7 | 1 | 2 |

Double encryption with two independent keys has $8$ key bits and $256$ key pairs.
The secret keys are $K_1 = \mathtt{B}$ and $K_2 = \mathtt{6}$, and the attacker
knows three plaintext-ciphertext pairs: $3 \to 0$, $\mathtt{A} \to \mathtt{B}$ and
$5 \to \mathtt{D}$. Check the first one: $3 \oplus \mathtt{B} = 8$,
$S[8] = 3$; then $3 \oplus 6 = 5$, $S[5] = 0$. So $C = 0$.

<div class="mars-steps" markdown>

1. **Forward table.** For each first key $a$, compute the middle value
   $E_a(3) = S[3 \oplus a]$. For $a = 0$: $S[3] = \mathtt{B}$. For $a = 1$:
   $S[2] = 6$. And so on through all sixteen:
   `0:B 1:6 2:5 3:C 4:D 5:A 6:0 7:9 8:8 9:F A:E B:3 C:2 D:1 E:7 F:4`.
2. **Backward table.** For each second key $b$, compute $D_b(0) = S^{-1}[0]
   \oplus b$. Since $S[5] = 0$, $S^{-1}[0] = 5$, so the middle value is
   $5 \oplus b$:
   `0:5 1:4 2:7 3:6 4:1 5:0 6:3 7:2 8:D 9:C A:F B:E C:9 D:8 E:B F:A`.
3. **Match.** Every middle value from 0 to F appears once in each table, so each
   $a$ matches exactly one $b$: sixteen candidate key pairs, out of 256. The pair
   $(\mathtt{B}, 6)$ is among them (middle value 3 in both), and so is
   $(2, 0)$ (middle value 5 in both).
4. **Filter with the second pair** $\mathtt{A} \to \mathtt{B}$. Each candidate is
   one double encryption to check. Two survive: the true $(\mathtt{B}, 6)$, and
   $(2, 0)$, because $\mathtt{A} \oplus 2 = 8$, $S[8] = 3$, $3 \oplus 0 = 3$,
   $S[3] = \mathtt{B}$. A false key pair that fits by chance.
5. **Filter with the third pair** $5 \to \mathtt{D}$. For $(2, 0)$:
   $5 \oplus 2 = 7$, $S[7] = \mathtt{D}$, then $S[\mathtt{D}] = 7 \ne \mathtt{D}$.
   It dies. Only $(\mathtt{B}, 6)$ is left.

</div>

The work: 16 forward encryptions, 16 backward decryptions, then a few checks,
about 40 operations against 256 for trying every key pair. The counts are
exactly what the general analysis predicts. The 8-bit key pair must be pinned
down by 4-bit blocks, so each known pair removes all but $1/16$ of the
candidates: $256 \to 16 \to 1$ expected, plus the true pair. We needed a third
pair because the second left one false survivor. With fifteen false
candidates each surviving with probability $1/16$, that happens with probability
$1 - (15/16)^{15} \approx 0.62$, so more often than not.

**Code it.** The same attack in Python, which prints both tables so you can
check them against the steps above.

```python
S = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]   # PRESENT's S-box
S_inv = [S.index(y) for y in range(16)]

def enc(k, x):                          # one toy round: add the 4-bit key, then substitute
    return S[x ^ k]

def dec(k, y):
    return S_inv[y] ^ k

k1, k2 = 0xB, 0x6                       # the secret pair of keys
pairs = [(p, enc(k2, enc(k1, p))) for p in (0x3, 0xA, 0x5)]
print("known pairs:", ", ".join(f"{p:X} -> {c:X}" for p, c in pairs))
p1, c1 = pairs[0]

forward = {}                            # middle value -> first keys that reach it
for a in range(16):
    forward.setdefault(enc(a, p1), []).append(a)
print("forward:  ", " ".join(f"{a:X}:{enc(a, p1):X}" for a in range(16)))
print("backward: ", " ".join(f"{b:X}:{dec(b, c1):X}" for b in range(16)))

candidates = [(a, b) for b in range(16) for a in forward.get(dec(b, c1), [])]
print("match on pair 1:", len(candidates), "key pairs")
for n, (p, c) in enumerate(pairs[1:], 2):     # the other pairs weed out chance matches
    candidates = [(a, b) for a, b in candidates if enc(b, enc(a, p)) == c]
    print(f"survive pair {n}:", [f"({a:X},{b:X})" for a, b in candidates])
```

```
known pairs: 3 -> 0, A -> B, 5 -> D
forward:   0:B 1:6 2:5 3:C 4:D 5:A 6:0 7:9 8:8 9:F A:E B:3 C:2 D:1 E:7 F:4
backward:  0:5 1:4 2:7 3:6 4:1 5:0 6:3 7:2 8:D 9:C A:F B:E C:9 D:8 E:B F:A
match on pair 1: 16 key pairs
survive pair 2: ['(2,0)', '(B,6)']
survive pair 3: ['(B,6)']
```

### The general costs

For two $k$-bit keys and an $n$-bit block:

- **time**: $2^k$ encryptions forward, $2^k$ decryptions backward, so $2^{k+1}$,
  plus the checks of the surviving candidates;
- **memory**: one table of $2^k$ middle values (store the smaller side; a sorted
  list works as well as a hash table);
- **data**: candidates after the first pair number about $2^{2k-n}$, and each
  further pair divides them by $2^n$, so about $\lceil 2k/n \rceil$ pairs, plus one
  for safety, pin the keys down.

For double DES, $k = 56$ and $n = 64$: $2^{57}$ operations, a table of $2^{56}$
entries of 8 bytes (half an exabyte), and two known pairs. The memory is the real
obstacle, and §4.12 shows how the parallel collision search of §4.5 shrinks it
at the price of more time. Either way, double DES is worth about one bit more
than single DES, which is why nobody ever standardized it.

**Triple encryption.** With three independent keys, $C = E_{K_3}(D_{K_2}(E_{K_1}(P)))$,
the attacker can put the "middle" after the first cipher: tabulate $E_{K_1}(P)$
for all $2^{56}$ values of $K_1$, then for each of the $2^{112}$ pairs
$(K_2, K_3)$ compute $E_{K_2}(D_{K_3}(C))$ and look it up. That costs $2^{112}$,
which is why three-key triple DES is rated at 112-bit security, not 168.

**Two-key triple DES** ($K_3 = K_1$) was widely used in banking because it needs
only 112 bits of key material. It falls to a cleverer meet in the middle. Ralph
Merkle and Martin Hellman showed in 1981 that with about $2^{56}$ chosen
plaintexts it can be broken in about $2^{56}$ steps: choose plaintexts that make
the first encryption's output equal to a fixed value, so the middle cipher can be
attacked alone. Chosen plaintexts in that number are unrealistic, so in 1990 van
Oorschot and Wiener gave a known-plaintext version whose time is about
$2^{120 - t}$ given $2^t$ known pairs. With $2^{40}$ pairs that is $2^{80}$, which is
exactly where NIST's rating of two-key triple DES at 80 bits comes from, and why
SP 800-131A disallowed it for encryption after 2015.

!!! note "Life story: the attacks on two-key triple DES"
    **Born:** 1981, Ralph Merkle and Martin Hellman ("On the Security of
    Multiple Encryption", chosen plaintext); 1990, Paul van Oorschot and
    Michael Wiener (known plaintext) · **Purpose:** to show that reusing the
    first key as the third leaves much less than 112 bits · **Helped:** fixed
    NIST's 80-bit rating for two-key triple DES and its retirement for
    encryption after 2015 · **Status:** current as the reason; the cipher it
    measured is retired

**Where else the middle meets.** The idea works whenever a computation splits
into two parts that depend on different secrets. It breaks preimage resistance
of hash functions built from a weak compression function: guess forward from
the start and backward from the target and match in the middle (the 2009 MD5
preimage attack of Yu Sasaki and Kazumaro Aoki, at $2^{123.4}$, is of this kind;
see [Chapter 9](09-Breaking-Hash-Functions.md)). It is the outer layer of the
**biclique** attacks on full AES ([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)),
which recover an AES key about four times faster than brute force. It solves the
subset-sum and knapsack problems in $2^{n/2}$ instead of $2^n$ (Horowitz and Sahni,
1974; Schroeppel and Shamir, 1981). And it is the baby-step giant-step algorithm
for discrete logarithms, where the two halves are $g^{i}$ and $h \cdot g^{-jm}$
([Chapter 12](12-Discrete-Logarithms.md)). Whenever you see a cipher whose key
splits cleanly into parts used in separate stages, ask what meet in the middle
would cost.

## 4.7 Hellman's time-memory trade-off

*Level: intermediate.*

Brute force and table lookup are the two extremes of inverting a function. Given
$y = f(x)$ for a function on $N$ values, you can search, trying every $x$ ($N$
time, no memory), or you can precompute a dictionary of every $f(x)$ once and look
$y$ up ($N$ memory, instant answers). For a 56-bit key the dictionary would hold
$2^{56}$ entries, and the search takes $2^{55}$ trials every time. In 1980 Martin
Hellman, at Stanford, published a way to land anywhere in between: spend about $N$
work once, store about $N^{2/3}$ values, and then invert any $y$ in about
$N^{2/3}$ steps. For DES, $N^{2/3} = 2^{37.3}$: a table of a few hundred billion
entries and a lookup measured in hours, repeated as often as you like.

**What function?** For a block cipher, fix one plaintext $P_0$ and define
$f(K) = E_K(P_0)$. Inverting $f$ on a captured ciphertext gives the key. This needs
the victim to encrypt the same $P_0$ every time, so it is a chosen-plaintext
attack, or a known-plaintext one when the protocol always starts with the same
block: a fixed header, a login prompt, the all-zero block of a disk sector. For a
password hash, $f$ is simply the hash, and the attack applies to every unsalted
hash ever stolen. When the output is longer than the input (a 64-bit ciphertext
from a 56-bit key) a **reduction function** $R$ maps outputs back to inputs, for
example by dropping eight bits. Write $g(x) = R(f(x))$, a function from keys to
keys.

### Chains

Hellman's idea is to store chains instead of points. Pick $m$ starting points
$SP_1, \dots, SP_m$. From each, apply $g$ $t$ times:

$$
SP_i = x_{i,0} \xrightarrow{g} x_{i,1} \xrightarrow{g} \cdots \xrightarrow{g} x_{i,t} = EP_i.
$$

Store only the pairs $(SP_i, EP_i)$, sorted by endpoint. The $t$ values inside
each chain are thrown away; they can be recomputed from the start at any time.
The table holds $m$ pairs but stands for up to $mt$ points (Figure 4.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Hellman table: chains from stored starting points to stored endpoints by repeated g = R after f; one chain merges into another and the two share an endpoint" fill="currentColor" font-size="14">
<defs><marker id="hel-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<text x="70" y="24" text-anchor="middle" font-size="13" font-weight="bold">start (stored)</text>
<text x="590" y="24" text-anchor="middle" font-size="13" font-weight="bold">end (stored)</text>
<text x="330.0" y="24" text-anchor="middle" font-size="13">t steps of g(x) = R(f(x)), not stored</text>
<rect x="44" y="56" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="75" text-anchor="middle" font-size="13">SP1</text>
<line x1="105.0" y1="70.0" x2="150.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="160" cy="70" r="5" fill="currentColor"/>
<line x1="169.0" y1="70.0" x2="235.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="245" cy="70" r="5" fill="currentColor"/>
<line x1="254.0" y1="70.0" x2="320.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="330" cy="70" r="5" fill="currentColor"/>
<line x1="339.0" y1="70.0" x2="405.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="415" cy="70" r="5" fill="currentColor"/>
<line x1="424.0" y1="70.0" x2="490.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="500" cy="70" r="5" fill="currentColor"/>
<line x1="509.0" y1="70.0" x2="554.0" y2="70.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<rect x="564" y="56" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="75" text-anchor="middle" font-size="13">EP1</text>
<rect x="44" y="121" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="140" text-anchor="middle" font-size="13">SP2</text>
<line x1="105.0" y1="135.0" x2="150.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="160" cy="135" r="5" fill="currentColor"/>
<line x1="169.0" y1="135.0" x2="235.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="245" cy="135" r="5" fill="currentColor"/>
<line x1="254.0" y1="135.0" x2="320.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="330" cy="135" r="5" fill="currentColor"/>
<line x1="339.0" y1="135.0" x2="405.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="415" cy="135" r="5" fill="currentColor"/>
<line x1="424.0" y1="135.0" x2="490.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="500" cy="135" r="5" fill="currentColor"/>
<line x1="509.0" y1="135.0" x2="554.0" y2="135.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<rect x="564" y="121" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="140" text-anchor="middle" font-size="13">EP2</text>
<rect x="44" y="186" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="205" text-anchor="middle" font-size="13">SP3</text>
<line x1="105.0" y1="200.0" x2="150.0" y2="200.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="160" cy="200" r="5" fill="currentColor"/>
<line x1="169.0" y1="200.0" x2="235.0" y2="200.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="245" cy="200" r="5" fill="currentColor"/>
<line x1="252.1" y1="194.5" x2="322.1" y2="141.1" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<text x="340" y="205" font-size="13">merge: from here on chain 3 = chain 2,</text>
<text x="340" y="223" font-size="13">and both end at EP2</text>
<rect x="44" y="251" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="270" text-anchor="middle" font-size="13">SP4</text>
<line x1="105.0" y1="265.0" x2="150.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="160" cy="265" r="5" fill="currentColor"/>
<line x1="169.0" y1="265.0" x2="235.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="245" cy="265" r="5" fill="currentColor"/>
<line x1="254.0" y1="265.0" x2="320.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="330" cy="265" r="5" fill="currentColor"/>
<line x1="339.0" y1="265.0" x2="405.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="415" cy="265" r="5" fill="currentColor"/>
<line x1="424.0" y1="265.0" x2="490.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<circle cx="500" cy="265" r="5" fill="currentColor"/>
<line x1="509.0" y1="265.0" x2="554.0" y2="265.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#hel-ar)"/>
<rect x="564" y="251" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="270" text-anchor="middle" font-size="13">EP4</text>
<circle cx="330" cy="135" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="20" y="315" font-size="13">Memory: m pairs (SP, EP). Points covered: at most m·t, fewer after merges.</text>
</svg>
<figcaption>Figure 4.4. A Hellman table. Only the start and end of each chain are stored. Chain 3 runs into a point of chain 2 (circled); from then on the two chains are identical, so chain 3's work is wasted and its endpoint equals EP2. Merges like this are what limit a single table.</figcaption>
</figure>

**Looking up a value.** Given $y = f(x)$ with $x$ unknown, compute $z = R(y)$.
If $x$ is the point $x_{i,j}$ of some chain, then $z = x_{i,j+1}$, and applying $g$
another $t - j - 1$ times leads to $EP_i$. So:

1. Check whether $z$ is an endpoint. If not, set $z \leftarrow g(z)$ and check
   again, up to $t$ times.
2. When $z$ matches some $EP_i$ after $s$ steps, the target is probably in chain
   $i$, at position $t - s - 1$. Recompute the chain from $SP_i$ for that many
   steps and check whether the value $x$ found there has $f(x) = y$.
3. If it has, you are done. If not, this was a **false alarm**: the chain from $z$
   merged into chain $i$ somewhere without $x$ being in it. Continue with step 1.

A lookup costs at most $t$ applications of $g$, plus the rebuilds of any false
alarms.

**Why one table is not enough.** If two chains ever touch the same value, they
coincide from then on (Figure 4.4): $g$ is a function, so the same input always
gives the same next value. Such **merges** waste work and cause false alarms,
and they get more frequent as the table fills. When a table already covers about
$mt$ points, a new chain of length $t$ avoids all of them with probability about
$(1 - mt/N)^t \approx e^{-mt^2/N}$. Once $mt^2$ passes $N$, most new chains merge
into old ones, so a single table is useful only up to Hellman's **matrix stopping
rule**,

$$
m t^2 \approx N,
$$

at which point it covers about $mt \approx N/t$ points, a fraction $1/t$ of the
space.

**Many tables.** To cover the whole space, Hellman built about $t$ tables, each
with a **different** reduction function $R_\ell$ (for instance
$R_\ell(y) = R(y) \oplus \ell$). A merge needs the same function, so chains in
different tables merge only by coincidence, and each table covers a fresh
fraction of about $1/t$. Now count:

- **precomputation:** $t$ tables of $m$ chains of $t$ steps, $mt^2 \approx N$
  steps, the same as one brute-force search;
- **memory:** $M = mt$ pairs;
- **time per lookup:** $t$ steps in each of $t$ tables, $T = t^2$.

Then $T M^2 = t^2 \cdot m^2 t^2 = (mt^2)^2 = N^2$. This is the **time-memory
trade-off curve**,

$$
T \cdot M^2 = N^2, \qquad 1 \le T \le N,
$$

and the attacker picks any point on it. The balanced choice $T = M = N^{2/3}$
comes from $m = t = N^{1/3}$. For $N = 2^{56}$, that is $m = t \approx 2^{18.7}$:
about 400,000 chains of 400,000 steps in each of 400,000 tables. Notice what the
curve does not say. The precomputation is still about $N$, a full key search, and
in practice several times $N$, because the tables overlap and the last few percent
of the space are expensive to cover. The trade-off pays when the same table is
used against many targets.

**Distinguished points.** Ronald Rivest suggested an improvement soon after:
instead of chains of fixed length $t$, end each chain when it reaches a
**distinguished point**, say a value whose first $d$ bits are zero. A lookup
then needs to check the stored table only when it reaches a distinguished point,
not at every step, which matters when the table lives on disk; chains that merge
end at the same point and are easy to spot and discard; and a chain that loops
forever is noticed when it exceeds a length limit. Distinguished points became
the standard way to build Hellman tables, and the same idea drives the parallel
collision search of §4.5.

!!! note "Life story: Hellman's time-memory trade-off"
    **Born:** 1980, Martin Hellman, "A Cryptanalytic Time-Memory Trade-Off"
    (*IEEE Transactions on Information Theory*); distinguished points from
    Ronald Rivest soon after · **Purpose:** to invert a one-way function
    repeatedly in less time than a search and less memory than a dictionary,
    first aimed at DES · **Helped:** made a precomputed attack on DES look
    affordable for a government in 1980; became the basis of every later
    trade-off, rainbow tables and the A5/1 tables included · **Status:**
    current as an idea; in practice largely replaced by rainbow tables

## 4.8 Rainbow tables

*Level: intermediate.*

In 2003 Philippe Oechslin, at the Swiss Federal Institute of Technology in
Lausanne (EPFL), changed one thing in Hellman's construction and made the whole
trade-off about twice as fast. Instead of a different reduction function for each
**table**, use a different reduction function for each **column**. Chain $i$ is
now

$$
x_{i,0} \xrightarrow{R_1 \circ f} x_{i,1} \xrightarrow{R_2 \circ f} x_{i,2}
\;\cdots\; \xrightarrow{R_t \circ f} x_{i,t},
$$

and one big table of these chains replaces Hellman's $t$ tables. He called them
**rainbow tables**, after the picture of each column in its own color
(Figure 4.5).

<figure class="mars-fig">
<svg viewBox="0 0 640 356" width="640" role="img" aria-label="Rainbow table: each column uses its own reduction function; the same value in two different columns does not merge the chains; lookup tries the target in the last column first, then earlier ones" fill="currentColor" font-size="14">
<defs><marker id="rb-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<text x="115" y="28" text-anchor="middle" font-size="13">R1∘f</text>
<text x="202" y="28" text-anchor="middle" font-size="13">R2∘f</text>
<text x="288" y="28" text-anchor="middle" font-size="13">R3∘f</text>
<text x="372" y="28" text-anchor="middle" font-size="13">R4∘f</text>
<text x="458" y="28" text-anchor="middle" font-size="13">R5∘f</text>
<text x="545" y="28" text-anchor="middle" font-size="13">R6∘f</text>
<rect x="44" y="46" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="65" text-anchor="middle" font-size="13">SP1</text>
<line x1="105.0" y1="60.0" x2="150.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="160" cy="60" r="5" fill="currentColor"/>
<line x1="169.0" y1="60.0" x2="235.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="245" cy="60" r="5" fill="currentColor"/>
<line x1="254.0" y1="60.0" x2="320.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="330" cy="60" r="5" fill="currentColor"/>
<line x1="339.0" y1="60.0" x2="405.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="415" cy="60" r="5" fill="currentColor"/>
<line x1="424.0" y1="60.0" x2="490.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="500" cy="60" r="5" fill="currentColor"/>
<line x1="509.0" y1="60.0" x2="554.0" y2="60.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<rect x="564" y="46" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="65" text-anchor="middle" font-size="13">EP1</text>
<rect x="44" y="111" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="130" text-anchor="middle" font-size="13">SP2</text>
<line x1="105.0" y1="125.0" x2="150.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="160" cy="125" r="5" fill="currentColor"/>
<line x1="169.0" y1="125.0" x2="235.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="245" cy="125" r="5" fill="currentColor"/>
<line x1="254.0" y1="125.0" x2="320.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="330" cy="125" r="5" fill="currentColor"/>
<line x1="339.0" y1="125.0" x2="405.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="415" cy="125" r="5" fill="currentColor"/>
<line x1="424.0" y1="125.0" x2="490.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="500" cy="125" r="5" fill="currentColor"/>
<line x1="509.0" y1="125.0" x2="554.0" y2="125.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<rect x="564" y="111" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="130" text-anchor="middle" font-size="13">EP2</text>
<rect x="44" y="176" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="70" y="195" text-anchor="middle" font-size="13">SP3</text>
<line x1="105.0" y1="190.0" x2="150.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="160" cy="190" r="5" fill="currentColor"/>
<line x1="169.0" y1="190.0" x2="235.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="245" cy="190" r="5" fill="currentColor"/>
<line x1="254.0" y1="190.0" x2="320.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="330" cy="190" r="5" fill="currentColor"/>
<line x1="339.0" y1="190.0" x2="405.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="415" cy="190" r="5" fill="currentColor"/>
<line x1="424.0" y1="190.0" x2="490.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<circle cx="500" cy="190" r="5" fill="currentColor"/>
<line x1="509.0" y1="190.0" x2="554.0" y2="190.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#rb-ar)"/>
<rect x="564" y="176" width="52" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="590" y="195" text-anchor="middle" font-size="13">EP3</text>
<circle cx="245" cy="60" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="415" cy="190" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>
<line x1="252" y1="68" x2="408" y2="182" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7"/>
<text x="20" y="232" font-size="13">Circled: the same value in columns 2 and 4. The next steps use different</text>
<text x="20" y="250" font-size="13">reductions (R3 and R5), so the chains separate again.</text>
<text x="20" y="268" font-size="13">Chains merge only if they meet in the same column.</text>
<text x="20" y="300" font-size="13" font-weight="bold">Looking up a hash y:</text>
<text x="20" y="320" font-size="13">guess column 6: is R6(y) an endpoint? (1 step) Column 5: is R6(f(R5(y))) one? (2 steps)</text>
<text x="20" y="340" font-size="13">… down to column 1 (6 steps). On a match, rebuild that chain from its start.</text>
</svg>
<figcaption>Figure 4.5. A rainbow table: every column has its own reduction function. Two chains that share a value in different columns go on with different functions and separate again. A lookup tries the target as if it were in the last column, then the one before, and so on.</figcaption>
</figure>

**Why it helps.** Two chains merge only if they collide **in the same column**,
because only then do they apply the same function next. A collision between
column 2 of one chain and column 4 of another is followed by $R_3 \circ f$ in the
first and $R_5 \circ f$ in the second, so the chains part again. Merges become
rare, a single table can be made as large as Hellman's $t$ tables put together,
and since a merged chain must end at the same endpoint as another, duplicate
endpoints can be thrown away when the table is built, leaving only chains with no
merges at all. There are no loops either: a chain cannot cycle, because every
step uses a new function.

**Looking up a value.** The target $y$ might be the hash in any column, and the
lookup does not know which, so it tries them all, from the end backwards:

- guess $y$ was the hash before the last step: is $R_t(y)$ an endpoint?
- guess one column earlier: is $R_t(f(R_{t-1}(y)))$ an endpoint?
- and so on, until the guess for column 1, which takes $t$ steps.

On a match, rebuild that chain from its start up to the guessed column and check
the value, exactly as in Hellman's scheme. The total is
$1 + 2 + \cdots + t \approx t^2/2$ steps. A set of $t$ Hellman tables covering the
same points costs $t^2$ steps, so the rainbow table is about twice as fast, and
because merges are rarer it also suffers fewer false alarms, which in practice
gave more than the factor of two.

Oechslin demonstrated the gain on Windows LAN Manager password hashes. The LM
hash uppercases a password, splits it into two 7-character halves, and uses each
half as a DES key to encrypt a fixed constant, with no salt, so every Windows
machine of the time hashed the same password the same way. His tables cracked
99.9% of alphanumeric LM hashes in 13.6 seconds on average, where Hellman tables
with distinguished points needed 101.3 seconds. The free tool **Ophcrack**, from
Oechslin's group, put this in anyone's hands, and RainbowCrack and downloadable
tables for MD5, SHA-1 and NTLM followed. Book 1's
[Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) tells what ended it:
a random **salt** stored with each hash changes the function for each user, so a
precomputed table must be rebuilt for every salt and is worth nothing.

Rainbow tables also broke a stream cipher used by billions of phones. GSM's A5/1
has a 64-bit internal state, and a few known frames of keystream (GSM
encrypts predictable control messages) identify it. In 2009 and 2010 Karsten Nohl and the
A5/1 Security Project computed and published tables of about two terabytes,
combining distinguished points with rainbow-style column functions, and the
Kraken software that searched them appeared in 2010. With them, a recorded
conversation could be decrypted on a PC in minutes. [Chapter 8](08-Attacks-on-Stream-Ciphers.md)
gives the details of A5/1 and of the data-time-memory trade-offs that apply to
stream ciphers.

!!! note "Life story: rainbow tables"
    **Born:** 2003, Philippe Oechslin at EPFL, "Making a Faster Cryptanalytic
    Time-Memory Trade-Off" (CRYPTO 2003) · **Purpose:** to make Hellman's
    trade-off faster by using a different reduction in every column · **Helped
    (attackers):** Ophcrack against Windows LM and NTLM hashes, public tables for
    unsalted MD5 and SHA-1 password hashes, the A5/1 tables for GSM (2009 to
    2010) · **Status:** current, but killed in its main use by salted, slow
    password hashing; still used against unsalted legacy hashes and fixed-header
    protocols

### Code it: a rainbow table for a 24-bit hash

The toy hash is SHA-256 of a 3-byte input, cut to 24 bits, so $N = 2^{24}$, about
16.8 million values. The table has $m = 65{,}536$ chains of length $t = 512$, so
$mt = 2N$; §4.9 predicts that it covers about 75% of the space and that only
about half of the chains survive with distinct endpoints. The reduction for
column $i$ is $R_i(y) = (y + i) \bmod N$: cheap, and different in every column.
The program builds the table, inverts three chosen hashes, then tries 100 random
ones.

```python
import hashlib, random

BITS = 24
N = 1 << BITS
def h(x):                               # the toy hash: SHA-256 of 3 bytes, cut to 24 bits
    return int.from_bytes(hashlib.sha256(x.to_bytes(3, "big")).digest()[:3], "big")

def R(i, y):                            # reduction for column i: a different map per column
    return (y + i) % N

t, m = 512, 65536                       # chain length and number of chains
calls = 0

def build():
    table = {}
    for start in range(m):              # small starting points: 0, 1, 2, ...
        x = start
        for i in range(t):
            x = R(i, h(x))
        table.setdefault(x, start)      # two chains with the same end merged: keep one
    return table

def lookup(table, y):
    global calls
    for col in range(t - 1, -1, -1):    # guess that y sits in column col, try the last column first
        x = R(col, y)
        for i in range(col + 1, t):     # walk from there to the end of the chain
            x = R(i, h(x))
        calls += t - col - 1
        if x in table:                  # an endpoint matches: rebuild that chain from its start
            x = table[x]
            for i in range(col):
                x = R(i, h(x))
            calls += col + 1
            if h(x) == y:
                return x
            # otherwise a false alarm: two chains met somewhere, carry on
    return None

table = build()
print(f"built {m:,} chains of {t}; {len(table):,} distinct endpoints stored")

for secret in (0xC0FFEE, 0xBADA55, 0x5EED00):
    y = h(secret)
    x = lookup(table, y)
    answer = f"{x:06x}, whose hash is {h(x):06x}" if x is not None else "nothing (not covered)"
    print(f"h({secret:06x}) = {y:06x}; the table finds {answer}")

random.seed(24)
found, calls = 0, 0
for _ in range(100):
    secret = random.randrange(N)
    x = lookup(table, h(secret))
    if x is not None:
        found += 1
        assert h(x) == h(secret)        # a preimage, maybe not the same one
print(f"inverted {found} of 100 hashes, {calls / 100:,.0f} hash calls per lookup on average")
```

```
built 65,536 chains of 512; 32,646 distinct endpoints stored
h(c0ffee) = c47a10; the table finds nothing (not covered)
h(bada55) = 57e38d; the table finds 3cd342, whose hash is 57e38d
h(5eed00) = 126e3c; the table finds 5eed00, whose hash is 126e3c
inverted 80 of 100 hashes, 63,788 hash calls per lookup on average
```

Building the table takes about twenty seconds in Python; it costs $mt = 2^{25}$
hash calls, twice a full search, and it is paid once. Look at what came back.

- **The table stores 32,646 pairs** for a space of 16.8 million values, about 500
  times less than a dictionary, and finds a preimage of 80 hashes in 100 (the
  prediction was 75; with 100 trials, five points either way is ordinary noise).
- **A lookup costs about 64,000 hash calls**, against 8.4 million for an
  average brute-force search: 130 times faster. Failed lookups cost the most,
  about $t^2/2 = 131{,}072$ calls plus false alarms; successes stop early.
- **It may find a different preimage.** For `bada55` the table returned
  `3cd342`, another input with the same 24-bit hash. A 24-bit function on 24-bit
  inputs is not one-to-one, and for a password hash any preimage logs you in.
- **It can miss.** `c0ffee` lies in no chain. A larger table, or a second
  table with different reductions, would cover it.

Change `t` and `m` and run it again: halve `t` and double `m` and lookups get four
times cheaper while the table doubles. That is $TM^2 = N^2$ on your own
machine.

## 4.9 The math of coverage

*Level: expert.*

How much of the space does a table cover, and why did 65,536 chains leave only
32,646 endpoints? This section derives the numbers from §4.8, first for Hellman's
tables and then for rainbow tables, under the usual model in which $f$ behaves like
a random function.

**Hellman's bound.** Build one table chain by chain. When chain $i$ is built, the
earlier chains cover at most $(i-1)t \le it$ points. Point $x_{i,j}$ is new only if
it and all the points before it in its chain, $x_{i,0}, \dots, x_{i,j}$, avoid
every covered point; otherwise the chain has already merged and $x_{i,j}$ is an
old point. Each of those $j + 1$ points is a fresh random value, hitting the
covered set with probability at most $it/N$, so

$$
\Pr[x_{i,j} \text{ is new}] \ge \left(1 - \frac{it}{N}\right)^{j+1},
\qquad
P_{\text{table}} \ge \frac{1}{N} \sum_{i=1}^{m} \sum_{j=0}^{t-1}
\left(1 - \frac{it}{N}\right)^{j+1}.
$$

This is Hellman's 1980 bound. Each term is close to 1 while $it \cdot j \ll N$, and
falls off like $e^{-ijt/N}$ after. For the last chain, $i = m$, the terms are about
$e^{-mt^2/N}$ at the end of the chain, which is where the matrix stopping rule
$mt^2 \approx N$ comes from: beyond it, new chains contribute mostly old points.
At $mt^2 = N$ the bound gives about $0.8\,mt/N$, so one table covers about 80% of
the points it computed. With $\ell$ tables using independent reductions, the
target escapes all of them with probability about $(1 - P_{\text{table}})^\ell$,
so $t$ tables at the stopping rule succeed with probability about
$1 - (1 - 0.8/t)^t \approx 1 - e^{-0.8} \approx 0.55$, and about $3t$ tables are
needed for 90%.

**Rainbow columns.** For a rainbow table count distinct points column by column.
Column 0 holds the $m$ distinct starting points. Column $i+1$ is the image of
column $i$ under the function $R_{i+1} \circ f$, a random function. If $m_i$
distinct points go in, a given value is missed by all of them with probability
$(1 - 1/N)^{m_i} \approx e^{-m_i/N}$, so the expected number of distinct images is

$$
m_{i+1} = N\left(1 - e^{-m_i/N}\right), \qquad m_1 = m.
$$

Within one column, two equal values are a merge (they will stay equal to the
end); across columns, equal values are harmless. The target is a random value,
it lies in column $i$ with probability $m_i/N$, and the columns use independent
functions, so

$$
P_{\text{rainbow}} = 1 - \prod_{i=1}^{t} \left(1 - \frac{m_i}{N}\right).
$$

That is Oechslin's 2003 formula.

**A closed form.** Expand the recursion to second order:
$m_{i+1} \approx m_i - m_i^2/2N$. Then

$$
\frac{1}{m_{i+1}} \approx \frac{1}{m_i}\left(1 + \frac{m_i}{2N}\right)
= \frac{1}{m_i} + \frac{1}{2N},
$$

so $1/m_i$ grows by $1/2N$ per column, and

$$
m_i \approx \frac{2N}{i + c}, \qquad c = \frac{2N}{m}.
$$

The number of distinct endpoints after $t$ columns is
$m_t \approx m/(1 + mt/2N)$. For the table of §4.8, $mt = 2N$, so
$m_t \approx m/2 = 32{,}768$; the program stored 32,646. The success probability
follows by taking logarithms:
$\ln \prod (1 - m_i/N) \approx -\sum m_i/N \approx -2 \ln\frac{t + c}{c}$, so

$$
P_{\text{rainbow}} \approx 1 - \frac{1}{(1 + mt/2N)^2}.
$$

For $mt = 2N$ that is $1 - 1/4 = 75\%$, the prediction quoted in §4.8, and for
$mt = 4N$ it is $1 - 1/9 \approx 89\%$. Work has strongly diminishing returns: to
go from 75% to 89% the table doubles, and every chain beyond that adds less.

**The ceiling of a perfect table.** Because duplicate endpoints are discarded, a
table can never hold more than about $2N/t$ chains with distinct endpoints, whatever
$m$ was: $m_t \to 2N/t$ as $m$ grows. A **perfect** rainbow table, with every
merged chain removed, has at most that many chains and therefore covers at most
about $1 - (1 - 2/t)^{t} \approx 1 - e^{-2} \approx 86\%$ of the space. To go above
86% you need a second table. (Gildas Avoine, Pascal Junod and Philippe Oechslin
worked out this ceiling and the optimal number of tables in 2005 to 2008.)

**Checking it.** On a space small enough to count every covered point, $N = 2^{16}$
and $t = 64$, build one Hellman table (one reduction for every column) and one
rainbow table for increasing $m$, and compare with the formulas. Hellman's bound
is a guaranteed minimum, not an estimate, so the measured values sit above it.

```python
import hashlib, math

N = 1 << 16                             # a small space, so every covered point can be counted
def h(x):
    return int.from_bytes(hashlib.sha256(x.to_bytes(2, "big")).digest()[:2], "big")

def covered(m, t, rainbow):
    seen = set()
    for start in range(m):
        x = start * 7919 % N            # spread the starting points out
        for i in range(t):
            seen.add(x)
            x = (h(x) + (i if rainbow else 0)) % N   # Hellman: one reduction; rainbow: one per column
    return len(seen) / N

def hellman_bound(m, t):                # Hellman's 1980 lower bound for one table
    return sum((1 - i * t / N) ** (j + 1) for i in range(1, m + 1) for j in range(t) if i * t < N) / N

def rainbow_formula(m, t):              # Oechslin's 2003 formula: m_i distinct points in column i
    miss, mi = 1.0, m
    for _ in range(t):
        miss *= 1 - mi / N
        mi = N * (1 - math.exp(-mi / N))
    return 1 - miss

t = 64
print("    m   mt/N   Hellman: bound measured   rainbow: formula measured")
for m in (16, 64, 256, 1024, 4096):
    print(f"{m:5} {m * t / N:6.3f} {hellman_bound(m, t):15.3f} {covered(m, t, False):8.3f} "
          f"{rainbow_formula(m, t):17.3f} {covered(m, t, True):8.3f}")
```

```
    m   mt/N   Hellman: bound measured   rainbow: formula measured
   16  0.016           0.012    0.014             0.015    0.015
   64  0.062           0.030    0.038             0.060    0.060
  256  0.250           0.048    0.087             0.210    0.209
 1024  1.000           0.058    0.169             0.559    0.561
 4096  4.000           0.058    0.320             0.895    0.897
```

At $m = 16$, which is the stopping rule $mt^2 = N$, both tables cover nearly every
point they computed (0.014 of a possible 0.016), and Hellman's bound promises 78%
of that (it delivers 90%). Beyond it the single Hellman table collapses: at $mt = 4N$ it covers
32%, so 92% of its work was wasted on merged chains, while the rainbow table
covers 90% and matches Oechslin's formula to the third decimal. The closed form
gives $1 - 1/(1 + 2)^2 = 0.889$ for the last row, close to the formula. Figure 4.6
draws the same comparison as curves.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Fraction of the space covered against work mt/N: random sampling, one rainbow table, and one Hellman table with a single reduction" fill="currentColor" font-size="14">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="250" x2="70" y2="20" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="250" x2="70" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="70" y="272" text-anchor="middle" font-size="12">0</text>
<line x1="205" y1="250" x2="205" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="205" y="272" text-anchor="middle" font-size="12">1</text>
<line x1="340" y1="250" x2="340" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="340" y="272" text-anchor="middle" font-size="12">2</text>
<line x1="475" y1="250" x2="475" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="475" y="272" text-anchor="middle" font-size="12">3</text>
<line x1="610" y1="250" x2="610" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="610" y="272" text-anchor="middle" font-size="12">4</text>
<line x1="65" y1="250" x2="610" y2="250" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="61" y="254" text-anchor="end" font-size="12">0%</text>
<line x1="65" y1="195" x2="610" y2="195" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="61" y="199" text-anchor="end" font-size="12">25%</text>
<line x1="65" y1="140" x2="610" y2="140" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="61" y="144" text-anchor="end" font-size="12">50%</text>
<line x1="65" y1="85" x2="610" y2="85" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="61" y="89" text-anchor="end" font-size="12">75%</text>
<line x1="65" y1="30" x2="610" y2="30" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="61" y="34" text-anchor="end" font-size="12">100%</text>
<text x="340.0" y="294" text-anchor="middle" font-size="13">work spent building the table, mt / N</text>
<polyline points="70.0,250.0 86.9,224.1 103.8,201.3 120.6,181.2 137.5,163.4 154.4,147.8 171.2,133.9 188.1,121.7 205.0,110.9 221.9,101.4 238.8,93.0 255.6,85.6 272.5,79.1 289.4,73.3 306.2,68.2 323.1,63.7 340.0,59.8 356.9,56.3 373.8,53.2 390.6,50.5 407.5,48.1 424.4,45.9 441.2,44.1 458.1,42.4 475.0,41.0 491.9,39.7 508.8,38.5 525.6,37.5 542.5,36.6 559.4,35.9 576.2,35.2 593.1,34.6 610.0,34.0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 5" opacity="0.8"/>
<polyline points="70.0,250.0 86.9,224.8 103.8,203.7 120.6,185.8 137.5,170.5 154.4,157.3 171.2,145.8 188.1,135.8 205.0,127.0 221.9,119.3 238.8,112.4 255.6,106.3 272.5,100.8 289.4,95.9 306.2,91.4 323.1,87.4 340.0,83.8 356.9,80.5 373.8,77.4 390.6,74.7 407.5,72.1 424.4,69.8 441.2,67.7 458.1,65.7 475.0,63.8 491.9,62.1 508.8,60.5 525.6,59.1 542.5,57.7 559.4,56.4 576.2,55.2 593.1,54.1 610.0,53.1" fill="none" stroke="currentColor" stroke-width="2.6"/>
<polyline points="70.0,250.0 86.9,236.5 103.8,230.9 120.6,226.1 137.5,223.0 154.4,220.0 171.2,217.1 188.1,215.1 205.0,212.9 221.9,211.1 238.8,209.0 255.6,206.8 272.5,205.1 289.4,203.5 306.2,201.7 323.1,200.1 340.0,198.7 356.9,197.4 373.8,196.1 390.6,194.6 407.5,193.3 424.4,192.0 441.2,190.7 458.1,189.6 475.0,188.2 491.9,187.0 508.8,186.0 525.6,184.9 542.5,183.9 559.4,182.9 576.2,181.9 593.1,180.7 610.0,179.7" fill="none" stroke="currentColor" stroke-width="2" opacity="0.55"/>
<text x="440" y="30" font-size="13">random sampling, 1 − e^(−x)</text>
<text x="440" y="94" font-size="13" font-weight="bold">one rainbow table</text>
<text x="440" y="172" font-size="13">one Hellman table</text>
</svg>
<figcaption>Figure 4.6. Coverage against the work spent building the table, for N = 2¹⁶ and chains of 64 steps. Drawing random points with replacement gives the dashed curve. One rainbow table stays close to it; one Hellman table, with a single reduction, stalls after the stopping rule, because new chains merge into old ones.</figcaption>
</figure>

The dashed curve, $1 - e^{-mt/N}$, is what you would get by drawing $mt$ random
points with replacement, the best that any method computing $mt$ random-looking
values can expect. The rainbow table falls short of it because a merge in one
column removes a point from every later column. Hellman tables reach the dashed
curve only by using many tables, each kept below the stopping rule.

## 4.10 Multi-target attacks and why 128 became 256

*Level: intermediate.*

Everything so far attacked one key. Real attackers rarely care which key they
get. A spy agency recording traffic from millions of users, or a thief holding a
million stolen password hashes, wins as soon as **any one** key falls. That
changes the arithmetic.

**One search, many targets.** Suppose $U$ users each encrypt the same known
block $P_0$ under their own random $k$-bit key, and the attacker collects the
$U$ ciphertexts in a hash table. Now each trial key $T$ costs one encryption,
$E_T(P_0)$, and one table lookup, and it is checked against **all** $U$ targets
at once. Each trial hits some target with probability $U/2^k$, so the first key
falls after about

$$
\frac{2^k}{U}
$$

trials instead of $2^{k-1}$. Against an attacker who wants any one of $2^{40}$
keys, a 128-bit key gives only 88 bits of security. To recover **every** key the
attacker still searches the whole space once, $2^k$ trials for all $U$ keys
together, which is $2^k/U$ per key.

Where does the common $P_0$ come from? From protocols. Every HTTP request
starts with `GET ` or `POST`, files start with fixed headers, disk sectors
start out as zeros, and many protocols encrypt a counter or a fixed label first.

**Code it.** The toy cipher with a 24-bit key and 256 users who all send the
same first block. One search through the key space, checking every guess against
all 256 ciphertexts:

```python
import hashlib, random

def enc(key, block):                    # the toy cipher again: 24-bit key, 32-bit block
    data = key.to_bytes(3, "big") + block.to_bytes(4, "big")
    return int.from_bytes(hashlib.sha256(data).digest()[:4], "big")

header = 0x47455420                     # "GET ", the first block every user sends
random.seed(2026)
users = [random.randrange(1 << 24) for _ in range(256)]
seen = {enc(k, header): n for n, k in enumerate(users)}   # what an eavesdropper collects

tries, cracked = 0, []
for guess in range(1 << 24):            # one search through the key space for all users at once
    tries += 1
    n = seen.get(enc(guess, header))
    if n is not None and users[n] == guess:
        cracked.append(n)
        if len(cracked) == 1:
            print(f"first key found after {tries:,} tries (one target: {(1 << 23):,} on average)")
    if len(cracked) == 16:
        break
print(f"{len(cracked)} keys after {tries:,} tries, {tries / len(cracked):,.0f} tries per key")
```

```
first key found after 7,180 tries (one target: 8,388,608 on average)
16 keys after 865,377 tries, 54,086 tries per key
```

With 256 targets the expected wait for the first key is $2^{24}/257 \approx 65{,}000$
tries; this run was lucky and found one after 7,180. Sixteen keys cost about
54,000 tries each, close to the expected $2^{24}/256 = 65{,}536$. (The check
`users[n] == guess` is the simulation peeking at the answer; a real attacker
confirms a candidate with a second block of the same user's traffic.)

**Key collisions.** Eli Biham pushed the idea further in 1996, in a note with the
memorable title "How to Forge DES-Encrypted Messages in $2^{28}$ Steps". The
attacker encrypts $P_0$ under $2^{28}$ keys of his own and stores the results.
The victims, over many sessions, encrypt $P_0$ under $2^{28}$ different session
keys. By the two-list birthday bound of §4.4, with $k_1 = k_2 = 2^{28}$ and
$N = 2^{56}$, one of the attacker's keys probably equals one of the session keys,
and the matching ciphertext shows which. The attacker can then read or forge that
session, having done only $2^{28}$ encryptions. No single target is weak; the
collection is.

!!! note "Life story: multi-target key search"
    **Born:** implicit in every batch password cracker; made explicit for
    ciphers by Eli Biham's key-collision attack (1996, published 2002) and
    priced by Daniel Bernstein in "Understanding Brute Force" (2005) · **Purpose:**
    to break any one of many keys for much less than one key's full search ·
    **Helped:** pushed long-term systems from 128-bit to 256-bit keys; led TLS 1.3
    to hide its nonces, and security proofs to count users · **Status:**
    current; the reason security levels are now quoted "per user" or "for $U$
    users"

**The fix inside protocols.** If the common $P_0$ is the danger, take it away.
TLS 1.3 (RFC 8446) encrypts records with AES-GCM using a nonce built from the
record's sequence number. Had the nonce been the bare sequence number, the first
record of every connection in the world would have encrypted under nonce 0, and
a multi-target search would have had its common block. Instead, each
connection XORs the sequence number with a secret per-connection value derived
from the handshake, so no two connections share a nonce that an attacker can
predict. Mihir Bellare and Björn Tackmann analyzed exactly this choice in 2016
and showed that it restores most of the lost security. Salts in password hashing
do the same job for passwords: they make every target a different function, so
a single search, or a single rainbow table, no longer serves them all.

**Why 128 became 256.** Put the pieces together and follow the key lengths.

- **1977:** DES, 56 bits. Diffie and Hellman's machine showed it was too short
  for a well-funded attacker.
- **1996:** the seven cryptographers' report asked for 75 bits at once and 90
  bits for twenty years.
- **1997:** NIST's call for the Advanced Encryption Standard required key sizes
  of 128, 192 and 256 bits. AES-128 left almost 40 bits of margin over the 1996
  recommendation, enough for decades of hardware progress.
- **2005 onwards:** multi-target attacks eat into that margin. With $2^{40}$
  targets, 128 bits gives 88; with a trade-off table built once and used
  against many keys, the figure falls further (§4.12). These are not breaks of
  AES. They are reasons to want more than 128 bits when many keys and long
  lifetimes are involved.
- **Grover's algorithm** (§4.11) halves the exponent on paper, which would take
  AES-128 to 64 bits against a quantum attacker without limits.

So the advice now has two levels. AES-128 is still safe for most purposes,
because $2^{128}$, or even $2^{88}$ in a multi-target setting, is far beyond the
Bitcoin-network ceiling of §4.3. For secrets that must last decades, or systems
with billions of keys, use 256-bit keys: the US government's CNSA 2.0 suite
requires AES-256, and NIST's guidance (SP 800-57 Part 1) rates it at 256 bits of
classical security. The cost is small: AES-256 runs 14 rounds instead of 10,
about 40% slower, and its key is twice as long.

## 4.11 The generic floor, and what Grover changes

*Level: intermediate.*

Here is everything in this chapter as one table: what an attacker can do to any
primitive without looking inside it, and what the defender sets so it costs
enough.

| Goal | Generic attack | Cost | Defender's setting |
|---|---|---|---|
| recover a $k$-bit key | exhaustive search (§4.2) | $2^{k-1}$ on average | $k \ge 128$ |
| recover any one of $U$ keys | multi-target search (§4.10) | $2^k / U$ | $k = 256$, or no common plaintext |
| two $k$-bit keys in sequence | meet in the middle (§4.6) | $2^{k+1}$ time, $2^k$ memory | never double-encrypt |
| collision in an $n$-bit hash | birthday, rho (§4.4, §4.5) | about $2^{n/2}$ | $n \ge 256$ |
| preimage of an $n$-bit hash | exhaustive search | $2^n$ | $n \ge 128$ |
| read data under a $b$-bit block | birthday on blocks (§4.5) | $2^{b/2}$ blocks | $b = 128$; rekey early |
| invert many times | Hellman, rainbow (§4.7, §4.8) | $N$ once, then $TM^2 = N^2$ | salts; large $N$ |
| quantum key search | Grover | about $2^{k/2}$ sequential steps | $k = 256$ for the long term |

Every attack in Parts II to IV of this book is measured against the row it
competes with. A "break" of AES-128 must beat $2^{127}$; a collision attack on
SHA-256 must beat $2^{128}$. Chapter 7 shows the biclique attack on AES-128 at
$2^{126.1}$: a break, by this definition, and of no practical use.

**What Grover changes.** A large fault-tolerant quantum computer could run Lov
Grover's 1996 search algorithm, which finds a $k$-bit key in about
$\frac{\pi}{4} 2^{k/2}$ evaluations of the cipher instead of $2^{k-1}$. On paper
that halves the exponent: AES-128 to 64 bits, AES-256 to 128. In practice it is
far weaker than that, for reasons book 1's
[Chapter 20](../../book/20-Quantum-Computers.md) works through. The steps must run
one after another, so splitting the search over $p$ machines gains only
$\sqrt p$, not $p$; each step is a whole AES circuit run with error correction;
and Grover's method is provably optimal, so no better quantum search is coming.
For collisions, the quantum birthday algorithm of Brassard, Høyer and Tapp (1998)
needs so much quantum memory that it does no better than the classical rho method
of §4.5 at equal hardware cost. The net effect on this chapter's table is one
line: long-lived symmetric keys go to 256 bits, which multi-target attacks had
already recommended, and hash outputs stay at 256 bits or more.
[Chapter 16](16-Breaking-Post-Quantum-Candidates.md) returns to the quantum
attacker's real costs.

## 4.12 Going deeper

*Level: expert.*

**Full cost.** Counting operations is too kind to attacks that need a lot of
memory. Michael Wiener's "The Full Cost of Cryptanalytic Attacks" (*Journal of
Cryptology*, 2004) measures an attack by the hardware it needs multiplied by the
time it runs, so a terabyte of memory costs about as much as the processors it
displaces. On that scale the table-based birthday attack, with $2^{n/2}$ memory, is
far worse than parallel rho with distinguished points, which needs almost none,
and Hellman tables pay for random access to a huge store. Daniel Bernstein's
"Cost Analysis of Hash Collisions: Will Quantum Computers Make SHARCS Obsolete?"
(2009) applies the same accounting to quantum collision search and concludes that
it does not beat classical parallel rho.

**Meet in the middle with little memory.** The attack of §4.6 needs $2^k$ memory.
Van Oorschot and Wiener turned it into a collision search: define one function on
pairs (side, key) that encrypts $P$ under the key on one side and decrypts $C$ on
the other, then reduce the result to a new (side, key). Its collisions between the
two sides include the one you want, the **golden collision**, but also about $N/2$
useless ones, where $N$ is the size of the domain. Running parallel collision
search with $w$ words of memory, and changing the function's reduction
periodically so that new collisions appear, finds the golden one in about
$2.5\sqrt{N^3/w}$ evaluations. For double DES with $w = 2^{30}$ words that is
about $2^{72}$, far more than the table attack's $2^{57}$ but with a millionth of
its memory. The same golden-collision search set the classical security
estimates of the isogeny scheme SIKE before its 2022 collapse.

**Dissection.** For $r$-fold encryption with independent $k$-bit keys, plain meet
in the middle costs $2^{\lceil r/2 \rceil k}$ time. Itai Dinur, Orr Dunkelman,
Nathan Keller and Adi Shamir showed in 2012 that guessing a few internal values
"dissects" the cascade into smaller problems, so that, for example, quadruple
encryption falls in $2^{2k}$ time with only $2^k$ memory, where meet in the middle
needs $2^{2k}$ memory for the same time. The same technique improves knapsack and
other combinatorial searches.

**Trade-offs with data.** For stream ciphers the attacker sees $D$ outputs of the
state-to-keystream function, and inverting any one of them is enough. Steve
Babbage (1995) and Jovan Golić (1997) gave the trade-off $TM = N$ with $D = T$;
Alex Biryukov and Adi Shamir (2000) combined it with Hellman's to get

$$
T M^2 D^2 = N^2, \qquad D^2 \le T, \qquad \text{precomputation } \approx N/D.
$$

It is this curve that A5/1's 64-bit state could not survive
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)), and the reason stream cipher
designers now take the state to be at least twice the key length. The same
formula applies to block ciphers with many targets. For AES-128 and
$D = 2^{32}$ keys encrypting a common block, $TM^2 = 2^{192}$, so
$T = M = 2^{64}$ after a precomputation of $2^{96}$: worth keeping in mind before
claiming "128-bit security" for a system with billions of keys.

**Is $TM^2 = N^2$ the best possible?** Not proven. Amos Fiat and Moni Naor
(1991) gave a rigorous trade-off for every function, $TM^3 = N^3$, worse than
Hellman's heuristic curve; Elad Barkan, Eli Biham and Adi Shamir (2006) proved that
no scheme of Hellman's general kind can beat $TM^2 = N^2$; and Henry
Corrigan-Gibbs and Dmitry Kogan (2019) showed that any substantial improvement on
Hellman for general functions would imply circuit lower bounds that complexity
theory has sought for decades. For random **permutations** the situation is
better: there, $TM \approx N$ is achievable, because a permutation's cycles have no
merges.

**Quantum versions.** Grover's search with $U$ targets finds one key in about
$\sqrt{N/U}$ steps, so multi-target and quantum losses compound: $2^{40}$ targets
and Grover take AES-128 to about $2^{44}$ sequential steps on paper, which is one
more reason for 256-bit keys. For collisions, the algorithm of André Chailloux,
María Naya-Plasencia and André Schrottenloher (2017) needs about $2^{2n/5}$
quantum queries with only a small quantum memory, the first quantum collision
method that beats $2^{n/2}$ without huge quantum memory, though with classical
memory of about $2^{n/5}$ and nothing like the hardware to run it.

## Check yourself

??? question "1. A cipher has a 64-bit key. On average, how many keys must a brute-force search try, and how long would that take at the crack.sh rate of 7.7 × 10¹¹ keys per second?"

    On average $2^{63} \approx 9.2 \times 10^{18}$ keys. At $7.7 \times 10^{11}$ per
    second that is about $1.2 \times 10^7$ seconds, or about 139 days, the
    figure in the table of §4.3.

??? question "2. A cipher has an 80-bit key and a 64-bit block. How many known plaintext-ciphertext pairs does a key search need to identify the key?"

    After one pair about $2^{80-64} = 2^{16}$ wrong keys still fit. After two
    pairs, $2^{80-128} = 2^{-48}$, so almost certainly none. Two pairs are
    enough; the rule is a little more than $k/n = 1.25$.

??? question "3. You draw 2²⁰ random 32-bit values. How many colliding pairs do you expect?"

    $\binom{2^{20}}{2} / 2^{32} \approx 2^{39} / 2^{32} = 2^7 = 128$. Linearity of
    expectation gives this exactly, with no independence assumption.

??? question "4. A system picks 2³⁰ random 64-bit identifiers. Bound the chance that two are equal from above and below."

    $x = k(k-1)/2N \approx 2^{60}/2^{65} = 1/32$. The ceiling is $1/32 = 0.03125$
    and the floor $1 - e^{-1/32} \approx 0.0308$. So about 3%, which is too high
    for identifiers that must be unique.

??? question "5. In Floyd's method, why do the two walkers in the second phase meet exactly at the point where the tail joins the cycle?"

    After the first phase the hare is at $x_i$ where $i$ is a multiple of the
    cycle length. One walker starts at $x_0$ and the other at $x_i$; after $s$
    steps they stand on $x_s$ and $x_{i+s}$. These are equal exactly when $x_s$
    is on the cycle, that is, from $s = \mu$ (the tail length) on. So they first
    coincide at the junction, and the previous values, $x_{\mu-1}$ and
    $x_{i+\mu-1}$, are different inputs with the same image.

??? question "6. Double encryption with two independent 64-bit keys and a 128-bit block. What do the time, memory and number of known pairs of a meet-in-the-middle attack come to?"

    Time about $2 \cdot 2^{64} = 2^{65}$, memory $2^{64}$ entries. After one pair
    about $2^{128-128} = 1$ false candidate remains besides the right one, so a
    second pair settles it: two pairs.

??? question "7. Build a balanced Hellman trade-off for N = 2⁴⁰. What are m, t, the number of tables, the memory, the lookup time and the precomputation?"

    $m = t = N^{1/3} = 2^{13.3} \approx 10{,}000$, and about $t \approx 10{,}000$
    tables, each with its own reduction function. Memory $M = mt \approx
    2^{26.7}$, about 100 million (start, end) pairs in all tables together;
    lookup time $T = t^2 \approx 2^{26.7}$ steps. Each table costs $mt$ steps to
    build, so the precomputation is $mt^2 = N = 2^{40}$, and in practice a few
    times more to reach high coverage.

??? question "8. A rainbow table has m chains of length t with mt = N. What fraction of the space does it cover, and how many distinct endpoints remain?"

    By the closed form of §4.9, coverage is about $1 - 1/(1 + 1/2)^2 = 1 - 4/9
    \approx 56\%$, and the distinct endpoints number about $m/(1 + 1/2) = 2m/3$.
    The measured value in §4.9's table for $mt/N = 1$ is 0.561.

??? question "9. Why does a per-user salt defeat rainbow tables and multi-target search, but not a brute-force attack on one user's password?"

    A salt makes each user's hash a different function, so a table or a search
    built for one salt is useless for every other: the attacker must pay the full
    cost once per user. Against a single user the attacker simply searches with
    that user's salt, at the normal cost. That is why salts are combined with
    deliberately slow hashes.

??? question "10. 2³⁰ devices each hold their own AES-128 key and all encrypt the same known first block. How much work finds one key classically, and what would Grover's algorithm make of it on paper?"

    Classically about $2^{128}/2^{30} = 2^{98}$ trials for the first key. With
    Grover and $U$ targets, about $\sqrt{2^{128}/2^{30}} = 2^{49}$ sequential
    quantum steps on paper. Both are reasons for 256-bit keys in such systems
    ($2^{226}$ and $2^{113}$ respectively).

## What you learned

- Exhaustive search costs $2^{k-1}$ trials on average, needs a little more than
  $k/n$ known blocks, and parallelizes perfectly. Its price fell from a
  hypothetical \$20 million in 1977 to a \$250,000 machine in 1998 and an online
  service in 2012; the Bitcoin network's $10^{21}$ hashes a second put 80 bits
  within minutes of the world's capacity and leave 128 bits billions of years away.
- The birthday bound is sandwiched: $0.316\,k^2/N \le P \le 0.5\,k^2/N$, so
  collisions need about $\sqrt N$ draws. The two-list version, $k_1 k_2/N$, drives
  meet-in-the-middle and multi-target attacks.
- Pollard's rho with Floyd's method finds collisions with constant memory, and
  van Oorschot-Wiener distinguished points spread it over many machines. That is
  why 128-bit hashes and 64-bit blocks (Sweet32) are too short.
- Meet in the middle turns $2^{2k}$ into $2^{k+1}$ plus $2^k$ memory, which is why
  double encryption is never used and three-key triple DES gives 112 bits.
- Hellman's trade-off stores chain endpoints and reaches $TM^2 = N^2$ after
  a precomputation of about $N$; rainbow tables use a reduction per column, merge
  less, and cover up to $1 - 1/(1 + mt/2N)^2$ of the space per table. Salts end
  them.
- Many targets divide the cost by the number of targets, and Grover would halve
  the exponent. Both point the same way: 256-bit keys for long-term and
  large-scale systems.

**Next:** [Chapter 5](05-Differential-Cryptanalysis.md) leaves generic attacks
behind and looks inside the cipher, following differences through its S-boxes.

## Further reading

- Whitfield Diffie and Martin Hellman, "Exhaustive Cryptanalysis of the NBS Data
  Encryption Standard", *Computer* 10 (June 1977).
- Gideon Yuval, "How to Swindle Rabin", *Cryptologia* 3 (1979).
- Martin Hellman, "A Cryptanalytic Time-Memory Trade-Off", *IEEE Transactions on
  Information Theory* 26 (1980).
- Ralph Merkle and Martin Hellman, "On the Security of Multiple Encryption",
  *Communications of the ACM* 24 (1981).
- Paul van Oorschot and Michael Wiener, "A Known-Plaintext Attack on Two-Key
  Triple Encryption" (EUROCRYPT 1990).
- Amos Fiat and Moni Naor, "Rigorous Time/Space Tradeoffs for Inverting
  Functions" (STOC 1991).
- Michael Wiener, "Efficient DES Key Search" (1993; reprinted in *Practical
  Cryptography for Data Internetworks*, IEEE Press, 1996).
- Paul van Oorschot and Michael Wiener, "Parallel Collision Search with
  Cryptanalytic Applications", *Journal of Cryptology* 12 (1999; conference
  version 1994).
- Matt Blaze, Whitfield Diffie, Ronald Rivest, Bruce Schneier, Tsutomu
  Shimomura, Eric Thompson and Michael Wiener, "Minimal Key Lengths for Symmetric
  Ciphers to Provide Adequate Commercial Security" (January 1996).
- Bruce Schneier, *Applied Cryptography*, 2nd edition (Wiley, 1996): the
  thermodynamic limits on brute force.
- Electronic Frontier Foundation, *Cracking DES* (O'Reilly, 1998).
- Alex Biryukov and Adi Shamir, "Cryptanalytic Time/Memory/Data Tradeoffs for
  Stream Ciphers" (ASIACRYPT 2000).
- Eli Biham, "How to Decrypt or Even Substitute DES-Encrypted Messages in
  $2^{28}$ Steps", *Information Processing Letters* 84 (2002).
- Philippe Oechslin, "Making a Faster Cryptanalytic Time-Memory Trade-Off"
  (CRYPTO 2003).
- Michael Wiener, "The Full Cost of Cryptanalytic Attacks", *Journal of
  Cryptology* 17 (2004).
- Daniel J. Bernstein, "Understanding Brute Force" (2005).
- Sandeep Kumar, Christof Paar, Jan Pelzl, Gerd Pfeiffer and Manfred Schimmler,
  "Breaking Ciphers with COPACOBANA: A Cost-Optimized Parallel Code Breaker"
  (CHES 2006).
- Elad Barkan, Eli Biham and Adi Shamir, "Rigorous Bounds on Cryptanalytic
  Time/Memory Tradeoffs" (CRYPTO 2006).
- Gildas Avoine, Pascal Junod and Philippe Oechslin, "Characterization and
  Improvement of Time-Memory Trade-Off Based on Perfect Tables", *ACM
  Transactions on Information and System Security* 11 (2008).
- Daniel J. Bernstein, "Cost Analysis of Hash Collisions: Will Quantum Computers
  Make SHARCS Obsolete?" (SHARCS 2009).
- Itai Dinur, Orr Dunkelman, Nathan Keller and Adi Shamir, "Efficient
  Dissection of Composite Problems, with Applications to Cryptanalysis,
  Knapsacks, and Combinatorial Search Problems" (CRYPTO 2012).
- Mihir Bellare and Björn Tackmann, "The Multi-User Security of Authenticated
  Encryption: AES-GCM in TLS 1.3" (CRYPTO 2016).
- [Karthikeyan Bhargavan and Gaëtan Leurent, "On the Practical (In-)Security of
  64-bit Block Ciphers" (CCS 2016)](https://sweet32.info/).
- André Chailloux, María Naya-Plasencia and André Schrottenloher, "An Efficient
  Quantum Collision Search Algorithm and Implications on Symmetric Cryptography"
  (ASIACRYPT 2017).
- Henry Corrigan-Gibbs and Dmitry Kogan, "The Function-Inversion Problem:
  Barriers and Opportunities" (TCC 2019).
- Standards: SP 800-57 Part 1 (key sizes and security strengths), SP 800-131A
  (transitions away from 80-bit security and triple DES), SP 800-67 (triple DES and
  its data limit), RFC 8446 (TLS 1.3 nonces).
- Benchmarks: the hashcat project's published GPU benchmarks; public Bitcoin
  hash-rate estimates (for example from blockchain explorers), which change daily.
