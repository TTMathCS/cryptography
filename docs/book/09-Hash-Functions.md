# 9. Hash Functions

*A hash function turns any amount of data into a short fingerprint that nobody
can fake. It has no key and hides nothing, yet signatures, software updates,
Git, Bitcoin, password storage and every MAC in the next chapter lean on it.
This chapter says exactly what "nobody can fake" means, works out why a 256-bit
hash gives only 128 bits of collision security, builds SHA-256 and SHA-3 in a
few dozen lines of Python, forges a message with the length-extension attack,
and tells how MD5 and SHA-1 fell.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three jobs of a hash (preimage, second-preimage and collision resistance) and what each one costs to break by brute force
    - the birthday bound, by hand and in code, and why it halves a hash's collision strength
    - how Merkle-Damgård hashes such as SHA-256 work, and the length-extension attack that comes with them
    - the story of MD5 and SHA-1: Wang Xiaoyun's attacks, the rogue certificate authority, Flame and SHAttered
    - the sponge construction behind SHA-3, and where BLAKE2 and BLAKE3 fit

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (binary, XOR,
    arithmetic mod $2^{32}$) and [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)
    (probability). [Chapter 6](06-Block-Ciphers.md) helps for §9.4.

    **Levels:** 9.1 to 9.3 are for beginners; 9.4 to 9.10 are intermediate;
    9.12 is expert.

## 9.1 The problem: a fingerprint for data

You download a 4 GB operating system image from a mirror you have never heard
of. The project's own web site publishes one line next to the link:

```
b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

You run `sha256sum` on what you downloaded, get the same 64 hex digits, and
trust the 4 GB. That trust rests on one claim: nobody, not even the mirror's
owner, can make a different file with the same fingerprint.

The idea of hashing is older than this use of it. Around 1953 Hans Peter Luhn,
an engineer at IBM, described scattering records into numbered buckets by
"hashing" their keys, so that a lookup checks one bucket instead of the whole
file. Those hash functions only had to spread data evenly. Nobody was trying
to fool them.

Public-key cryptography changed that. When Diffie and Hellman proposed digital
signatures in 1976 (see [Chapter 12](12-Diffie-Hellman.md)), it was clear at
once that signing a whole document with slow public-key arithmetic was
impractical. Sign a short digest of it instead. But then the digest has to be
as hard to fake as the signature. In 1978 Michael Rabin proposed a digest built
from DES, and the next year Gideon Yuval, in a short paper titled "How to
Swindle Rabin", showed how a swindler could exploit any digest that was too
short. His trick, the birthday attack, is §9.3, and it still sets the size of
every hash in use. In 1979 Ralph Merkle's Stanford thesis described how to hash
long messages by chaining a fixed-size function, and his tree of hashes; ten
years later he and Ivan Damgård, in Aarhus, Denmark, each proved the chaining
method safe. That design, Merkle-Damgård, carried MD5, SHA-1 and SHA-2.

So a cryptographic hash is a public function $H$, with no key, that takes any
input and gives a fixed-size output (the **digest**), and that no one can
steer. The next section makes "no one can steer" precise.

<figure class="mars-fig">
<svg viewBox="0 0 520 438" width="520" role="img" aria-label="Timeline of hash functions from Luhn in 1953 to the planned end of SHA-1 in 2030">
<line x1="78" y1="12" x2="78" y2="426" stroke="currentColor" stroke-width="2"/>
<circle cx="78" cy="20" r="5" fill="currentColor"/>
<text x="64" y="25" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1953</text>
<text x="94" y="25" font-size="14" fill="currentColor">Luhn at IBM: hashing for fast lookup</text>
<circle cx="78" cy="48" r="5" fill="currentColor"/>
<text x="64" y="53" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1976</text>
<text x="94" y="53" font-size="14" fill="currentColor">Diffie and Hellman: sign a short digest</text>
<circle cx="78" cy="76" r="5" fill="currentColor"/>
<text x="64" y="81" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1979</text>
<text x="94" y="81" font-size="14" fill="currentColor">Yuval&#x27;s birthday swindle; Merkle&#x27;s thesis</text>
<circle cx="78" cy="104" r="5" fill="currentColor"/>
<text x="64" y="109" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1989</text>
<text x="94" y="109" font-size="14" fill="currentColor">Merkle and Damgård prove the chain safe</text>
<circle cx="78" cy="132" r="5" fill="currentColor"/>
<text x="64" y="137" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1991</text>
<text x="94" y="137" font-size="14" fill="currentColor">Rivest&#x27;s MD5 (MD4 in 1990)</text>
<circle cx="78" cy="160" r="5" fill="currentColor"/>
<text x="64" y="165" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1995</text>
<text x="94" y="165" font-size="14" fill="currentColor">NSA&#x27;s SHA-1 replaces SHA-0</text>
<circle cx="78" cy="188" r="5" fill="currentColor"/>
<text x="64" y="193" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2001</text>
<text x="94" y="193" font-size="14" fill="currentColor">SHA-2 published by NIST</text>
<circle cx="78" cy="216" r="5" class="acc-fill"/>
<text x="64" y="221" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2004</text>
<text x="94" y="221" font-size="14" fill="currentColor">Wang&#x27;s team: MD5 collisions</text>
<circle cx="78" cy="244" r="5" fill="currentColor"/>
<text x="64" y="249" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2005</text>
<text x="94" y="249" font-size="14" fill="currentColor">Wang&#x27;s team: SHA-1 attack, about 2⁶⁹</text>
<circle cx="78" cy="272" r="5" class="acc-fill"/>
<text x="64" y="277" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2008</text>
<text x="94" y="277" font-size="14" fill="currentColor">Rogue certificate authority from MD5</text>
<circle cx="78" cy="300" r="5" class="acc-fill"/>
<text x="64" y="305" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2012</text>
<text x="94" y="305" font-size="14" fill="currentColor">Flame; Keccak wins SHA-3; BLAKE2</text>
<circle cx="78" cy="328" r="5" fill="currentColor"/>
<text x="64" y="333" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2015</text>
<text x="94" y="333" font-size="14" fill="currentColor">SHA-3 becomes FIPS 202</text>
<circle cx="78" cy="356" r="5" class="acc-fill"/>
<text x="64" y="361" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<text x="94" y="361" font-size="14" fill="currentColor">SHAttered: first SHA-1 collision</text>
<circle cx="78" cy="384" r="5" class="acc-fill"/>
<text x="64" y="389" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<text x="94" y="389" font-size="14" fill="currentColor">SHA-1 is a Shambles; BLAKE3</text>
<circle cx="78" cy="412" r="5" fill="currentColor"/>
<text x="64" y="417" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2030</text>
<text x="94" y="417" font-size="14" fill="currentColor">NIST&#x27;s planned end of SHA-1</text>
</svg>
<figcaption>Figure 9.1. Seventy years of hashing. The highlighted years are breaks: each one came long after the first public warnings.</figcaption>
</figure>

## 9.2 What a hash must do

Think of a 256-bit hash as a machine that gives every possible file a 64-digit
hex label. There are far more files than labels, so different files *must*
share labels somewhere. The point is that nobody can *find* two that do.
That splits into three separate jobs, from hardest to break to easiest:

| Property | The attacker is given | and must find | Brute-force cost for $n$ bits |
|---|---|---|---|
| **Preimage resistance** (one-way) | a digest $y$ | any $x$ with $H(x) = y$ | $2^n$ |
| **Second-preimage resistance** | a message $x$ | some $x' \neq x$ with $H(x') = H(x)$ | $2^n$ |
| **Collision resistance** | nothing | any pair $x \neq x'$ with $H(x) = H(x')$ | $2^{n/2}$ |

<figure class="mars-fig">
<svg viewBox="0 0 600 300" width="600" role="img" aria-label="Three diagrams: preimage, second preimage and collision attacks, showing what the attacker is given and must find">
<text x="10" y="45" font-size="15" font-weight="bold" fill="currentColor">Preimage</text>
<text x="10" y="67" font-size="14" fill="currentColor">cost 2ⁿ</text>
<rect x="220" y="33" width="100" height="34" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="270" y="54.9" font-size="14" text-anchor="middle" fill="currentColor">x = ?</text>
<polyline points="320,50 374,50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="380,50 373.1,54 373.1,46" fill="currentColor"/>
<rect x="380" y="33" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="405" y="54.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">H</text>
<polyline points="430,50 464,50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="470,50 463.1,54 463.1,46" fill="currentColor"/>
<rect x="470" y="33" width="110" height="34" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="54.9" font-size="14" text-anchor="middle" fill="currentColor">y (given)</text>
<text x="10" y="140" font-size="15" font-weight="bold" fill="currentColor">Second preimage</text>
<text x="10" y="162" font-size="14" fill="currentColor">cost 2ⁿ</text>
<rect x="220" y="112" width="100" height="30" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="131.9" font-size="14" text-anchor="middle" fill="currentColor">x (given)</text>
<rect x="220" y="150" width="100" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="270" y="169.9" font-size="14" text-anchor="middle" fill="currentColor">x′ = ?</text>
<polyline points="320,127 374.1,138.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="380,140 372.4,142.4 374.1,134.6" fill="currentColor"/>
<polyline points="320,165 374.1,153.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="380,152 374.1,157.4 372.4,149.6" fill="currentColor"/>
<rect x="380" y="129" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="405" y="150.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">H</text>
<polyline points="430,146 464,146" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="470,146 463.1,150 463.1,142" fill="currentColor"/>
<rect x="470" y="129" width="110" height="34" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="150.9" font-size="14" text-anchor="middle" fill="currentColor">same y</text>
<text x="10" y="235" font-size="15" font-weight="bold" fill="currentColor">Collision</text>
<text x="10" y="257" font-size="14" class="acc-fill">cost 2ⁿᐟ²</text>
<rect x="220" y="207" width="100" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="270" y="226.9" font-size="14" text-anchor="middle" fill="currentColor">x = ?</text>
<rect x="220" y="245" width="100" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="270" y="264.9" font-size="14" text-anchor="middle" fill="currentColor">x′ = ?</text>
<polyline points="320,222 374.1,233.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="380,235 372.4,237.4 374.1,229.6" fill="currentColor"/>
<polyline points="320,260 374.1,248.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="380,247 374.1,252.4 372.4,244.6" fill="currentColor"/>
<rect x="380" y="224" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="405" y="245.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">H</text>
<polyline points="430,241 464,241" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="470,241 463.1,245 463.1,237" fill="currentColor"/>
<rect x="470" y="224" width="110" height="34" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">same y</text>
</svg>
<figcaption>Figure 9.2. The three jobs of a hash. Dashed boxes are what the attacker must find. In a collision attack the attacker picks both inputs, which is why it is the cheapest of the three.</figcaption>
</figure>

Each job matches a use:

- **Preimage:** a server stores $H(\text{password})$; a thief who steals the
  digest should not get the password back. (Passwords break this anyway, for a
  different reason: [Chapter 11](11-Passwords-and-Key-Derivation.md).)
- **Second preimage:** the download above. The file is already out there, and
  the attacker needs a malicious file that matches *it*.
- **Collision:** signatures. If the attacker writes both documents, a harmless
  one and a harmful one with the same digest, they get the harmless one signed
  and the signature covers the harmful one too.

A collision finder needs no particular target, so it is the easiest attack, and
collision resistance is the first property to fall. MD5 and SHA-1 lost it long
before anyone came close to a preimage.

A good hash also shows the **avalanche effect**: change one input bit and about
half the output bits flip, with no pattern.

```python
import hashlib

a = hashlib.sha256(b"abc").digest()
b = hashlib.sha256(b"abd").digest()
print(hashlib.sha256(b"abd").hexdigest())
print(bin(int.from_bytes(a, "big") ^ int.from_bytes(b, "big")).count("1"), "of 256 bits differ")
# a52d159f262b2c6ddb724a61840befc36eb30c88877a4030b65cbe86298449c9
# 122 of 256 bits differ
```

SHA-256 of "abc" begins `ba7816bf`; of "abd", `a52d159f`. Nothing about one
tells you anything about the other.

<figure class="mars-fig">
<svg viewBox="0 0 340 360" width="340" role="img" aria-label="A 16 by 16 grid of the 256 output bits of SHA-256; the 122 bits that differ between abc and abd are filled">
<rect x="12" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="132" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="232" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="252" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="12" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="12" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="112" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="32" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="32" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="32" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="32" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="72" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="52" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="52" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="72" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="112" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="232" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="72" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="72" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="252" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="92" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="92" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="112" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="252" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="112" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="132" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="132" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="132" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="152" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="152" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="132" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="172" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="252" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="172" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="72" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="132" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="192" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="292" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="192" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="112" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="212" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="212" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="72" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="232" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="232" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="52" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="112" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="252" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="252" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="232" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="252" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="272" y="252" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="252" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="92" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="112" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="272" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="312" y="272" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="12" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="32" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="132" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="152" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="172" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="192" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="212" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="232" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="292" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="292" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="12" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="32" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="52" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="72" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="92" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="112" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="132" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="152" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="172" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="192" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="212" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="232" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="252" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="272" y="312" width="16" height="16" rx="2" class="acc-fill"/>
<rect x="292" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="312" y="312" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="170" y="352" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">122 of 256 bits differ</text>
</svg>
<figcaption>Figure 9.3. The avalanche effect. Each square is one of SHA-256's 256 output bits, read left to right, top to bottom; a filled square is a bit that differs between SHA-256("abc") and SHA-256("abd"). One changed input bit flipped 122 output bits, scattered with no pattern.</figcaption>
</figure>

### Brute force, at a size you can watch

With a real 256-bit hash brute force is hopeless, so cut SHA-256 down to its
first 24 bits and attack that. A preimage search tries inputs until one hits a
fixed target; a collision search remembers every output and stops at the first
repeat:

```python
import hashlib

def tiny(data, bits=24):                 # the first 24 bits of SHA-256: a toy hash
    return int.from_bytes(hashlib.sha256(data).digest(), "big") >> (256 - bits)

target = tiny(b"hello")                  # preimage: find any input with this output
n = 0
while tiny(str(n).encode()) != target:
    n += 1
print("preimage:", n, "after", n + 1, "tries")

seen = {}                                # collision: any two inputs that match
n = 0
while tiny(str(n).encode()) not in seen:
    seen[tiny(str(n).encode())] = n
    n += 1
print("collision:", seen[tiny(str(n).encode())], n, "after", n + 1, "tries")
```

```
preimage: 18635305 after 18635306 tries
collision: 4163 8864 after 8865 tries
```

The preimage took about 18.6 million tries, close to $2^{24} = 16{,}777{,}216$,
and about a quarter of a minute. The collision took 8,865, close to
$2^{12} = 4{,}096$ times a small constant. Same hash, a factor of two thousand
apart. That gap is the birthday bound.

## 9.3 The birthday bound

How many people must be in a room before two of them probably share a
birthday? Not 183. Twenty-three. (The puzzle is older than computers: the
Austrian mathematician Richard von Mises published a version of it in 1939.)

The reason is that the question is about *pairs*, and 23 people make
$\binom{23}{2} = 253$ pairs. Work it out by computing the chance that all
birthdays are different. The first person can have any day, the second must
avoid one day, the third two days, and so on:

$$
P(\text{no match}) = \frac{365}{365} \cdot \frac{364}{365} \cdot \frac{363}{365} \cdots \frac{343}{365} \approx 0.493
$$

So the chance of some shared birthday is about $0.507$. The same argument with
$N$ possible values and $q$ samples gives, using $1 - x \approx e^{-x}$,

$$
P(\text{collision}) \approx 1 - e^{-q(q-1)/2N} \approx 1 - e^{-q^2/2N}.
$$

Setting this to $\tfrac12$ gives $q \approx \sqrt{2 \ln 2 \cdot N} \approx 1.18\sqrt{N}$. For an
$n$-bit hash, $N = 2^n$ and

$$
q \approx 1.18 \cdot 2^{n/2}.
$$

For the 24-bit toy hash that is $1.18 \times 2^{12} \approx 4{,}823$ tries; the run
above needed 8,865, a little unlucky but the right size. For real hashes:

| Hash | Output | Collision after about | Status |
|---|---|---|---|
| MD5 | 128 bits | $2^{64}$ | broken far below this (§9.8) |
| SHA-1 | 160 bits | $2^{80}$ | broken far below this (§9.8) |
| SHA-256, SHA3-256 | 256 bits | $2^{128}$ | out of reach |
| SHA-512 | 512 bits | $2^{256}$ | out of reach |

This is why hashes are twice the size of keys. A 128-bit security level, the
same as [AES-128](07-AES.md), needs a 256-bit digest.

<figure class="mars-fig">
<svg viewBox="0 0 600 288" width="600" role="img" aria-label="Curve of the chance of a shared birthday against the number of people, crossing one half at 23 people">
<line x1="60" y1="240" x2="560" y2="240" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="20" x2="60" y2="240" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="240" x2="60" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="260" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<line x1="131.4" y1="240" x2="131.4" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="131.4" y="260" font-size="13" text-anchor="middle" fill="currentColor">10</text>
<line x1="202.9" y1="240" x2="202.9" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="202.9" y="260" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<line x1="274.3" y1="240" x2="274.3" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="274.3" y="260" font-size="13" text-anchor="middle" fill="currentColor">30</text>
<line x1="345.7" y1="240" x2="345.7" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="345.7" y="260" font-size="13" text-anchor="middle" fill="currentColor">40</text>
<line x1="417.1" y1="240" x2="417.1" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="417.1" y="260" font-size="13" text-anchor="middle" fill="currentColor">50</text>
<line x1="488.6" y1="240" x2="488.6" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="488.6" y="260" font-size="13" text-anchor="middle" fill="currentColor">60</text>
<line x1="560" y1="240" x2="560" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="560" y="260" font-size="13" text-anchor="middle" fill="currentColor">70</text>
<line x1="55" y1="240" x2="60" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="51" y="245" font-size="13" text-anchor="end" fill="currentColor">0</text>
<line x1="55" y1="185" x2="60" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="51" y="190" font-size="13" text-anchor="end" fill="currentColor">0.25</text>
<line x1="60" y1="185" x2="560" y2="185" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="55" y1="130" x2="60" y2="130" stroke="currentColor" stroke-width="1.5"/>
<text x="51" y="135" font-size="13" text-anchor="end" fill="currentColor">0.5</text>
<line x1="60" y1="130" x2="560" y2="130" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="55" y1="75" x2="60" y2="75" stroke="currentColor" stroke-width="1.5"/>
<text x="51" y="80" font-size="13" text-anchor="end" fill="currentColor">0.75</text>
<line x1="60" y1="75" x2="560" y2="75" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="55" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="1.5"/>
<text x="51" y="25" font-size="13" text-anchor="end" fill="currentColor">1</text>
<line x1="60" y1="20" x2="560" y2="20" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<polyline points="60,240 67.1,240 74.3,239.4 81.4,238.2 88.6,236.4 95.7,234 102.9,231.1 110,227.6 117.1,223.6 124.3,219.2 131.4,214.3 138.6,208.9 145.7,203.3 152.9,197.2 160,190.9 167.1,184.4 174.3,177.6 181.4,170.7 188.6,163.7 195.7,156.6 202.9,149.5 210,142.4 217.1,135.3 224.3,128.4 231.4,121.6 238.6,114.9 245.7,108.4 252.9,102.1 260,96 267.1,90.2 274.3,84.6 281.4,79.3 288.6,74.3 295.7,69.5 302.9,65 310,60.8 317.1,56.9 324.3,53.3 331.4,49.9 338.6,46.8 345.7,43.9 352.9,41.3 360,38.9 367.1,36.7 374.3,34.8 381.4,33 388.6,31.4 395.7,29.9 402.9,28.7 410,27.5 417.1,26.5 424.3,25.6 431.4,24.8 438.6,24.1 445.7,23.5 452.9,23 460,22.6 467.1,22.2 474.3,21.8 481.4,21.5 488.6,21.3 495.7,21.1 502.9,20.9 510,20.7 517.1,20.6 524.3,20.5 531.4,20.4 538.6,20.3 545.7,20.3 552.9,20.2 560,20.2" fill="none" class="acc" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<line x1="224.3" y1="240" x2="224.3" y2="128.4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="60" y1="128.4" x2="224.3" y2="128.4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<circle cx="224.3" cy="128.4" r="5" class="acc-fill"/>
<text x="234.3" y="148.4" font-size="14" font-weight="bold" fill="currentColor">23 people: 0.507</text>
<text x="310" y="280" font-size="13" text-anchor="middle" fill="currentColor">people in the room</text>
<text x="555" y="213.6" font-size="13" text-anchor="end" fill="currentColor">chance that two share a birthday</text>
</svg>
<figcaption>Figure 9.4. The birthday curve for 365 days. It passes one half at 23 people, about 1.18 × √365, and is near certain by 60. Replace 365 days by 2ⁿ digests and the same curve passes one half near 1.18 × 2ⁿᐟ² tries.</figcaption>
</figure>

**Yuval's swindle.** Here is the 1979 attack in story form. A swindler wants
you to sign a contract that pays them \$1,000, and then claim you signed one
that pays \$100,000. They write both contracts with 32 places where the wording
can change without changing the meaning: a comma or none, "the said" or "this",
one space or two. That gives $2^{32}$ versions of each. With a 64-bit digest,
the birthday bound says that among $2^{32}$ fair versions and $2^{32}$ unfair
ones, a fair and an unfair version probably share a digest. You sign the fair
one; the signature also fits the unfair one. No weakness in the hash is
needed, only a digest too short to stand $2^{n/2}$ work.

Yuval wrote his note as a short, almost playful reply to Rabin's proposal, but
it changed how hashes were sized. From then on a digest had to be long enough
that $2^{n/2}$ work was out of reach. That is why the 64-bit digests of the
1970s gave way to 128 bits (MD4 and MD5), then 160 (SHA-1), then 256.

!!! note "Life story: the birthday attack"
    **Born:** 1979, Gideon Yuval's "How to Swindle Rabin" (*Cryptologia*), applying the old
    birthday puzzle to signatures · **Purpose:** to show that a digest too short to stand
    $2^{n/2}$ work cannot protect a signature, however good the hash · **Helped:** set the rule
    that a hash needs twice as many bits as the security level it promises, which sized every
    later hash · **Status:** current, as a generic attack on every hash; only a longer output
    defends against it.

## 9.4 Building a hash: Merkle-Damgård

*Level: intermediate.*

It is hard to design a function that takes inputs of any length. It is much
easier to design a **compression function** $f$ that takes two fixed-size
inputs, a chaining value $h$ (256 bits for SHA-256) and a message block $m$
(512 bits), and returns a new 256-bit chaining value. Merkle and Damgård's
construction runs it over the message one block at a time:

1. **Pad** the message to a whole number of blocks. Append a `1` bit, then
   zeros, then the message length in bits as a 64-bit number. Putting the
   length last is called **Merkle-Damgård strengthening**.
2. Start from a fixed **initial value** $h_0$.
3. For each block, $h_i = f(h_{i-1}, m_i)$.
4. The last chaining value is the digest.

<figure class="mars-fig">
<svg viewBox="0 0 600 180" width="600" role="img" aria-label="Merkle-Damgård chain: IV goes through compression function f with message blocks m1, m2 and a last block holding the padding and length, giving the digest">
<rect x="6" y="94" width="54" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="33" y="119.6" font-size="16" text-anchor="middle" fill="currentColor">IV</text>
<text x="33" y="156" font-size="16" text-anchor="middle" fill="currentColor">h₀</text>
<rect x="93" y="12" width="64" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="125" y="35.6" font-size="16" text-anchor="middle" fill="currentColor">m₁</text>
<polyline points="125,48 125,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="125,92 121,85.1 129,85.1" fill="currentColor"/>
<rect x="100" y="92" width="50" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="125" y="120.3" font-size="18" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="60,114 94,114" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="100,114 93.1,118 93.1,110" fill="currentColor"/>
<text x="190" y="106" font-size="16" text-anchor="middle" fill="currentColor">h₁</text>
<rect x="223" y="12" width="64" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="35.6" font-size="16" text-anchor="middle" fill="currentColor">m₂</text>
<polyline points="255,48 255,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="255,92 251,85.1 259,85.1" fill="currentColor"/>
<rect x="230" y="92" width="50" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="120.3" font-size="18" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="150,114 224,114" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="230,114 223.1,118 223.1,110" fill="currentColor"/>
<text x="325" y="106" font-size="16" text-anchor="middle" fill="currentColor">h₂</text>
<rect x="320" y="12" width="150" height="36" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="395" y="35.6" font-size="16" text-anchor="middle" fill="currentColor">m₃ ‖ pad ‖ len</text>
<polyline points="395,48 395,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="395,92 391,85.1 399,85.1" fill="currentColor"/>
<rect x="370" y="92" width="50" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="395" y="120.3" font-size="18" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="280,114 364,114" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="370,114 363.1,118 363.1,110" fill="currentColor"/>
<polyline points="420,114 472,114" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="478,114 471.1,118 471.1,110" class="acc-fill"/>
<rect x="478" y="94" width="116" height="40" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="536" y="119.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">digest</text>
<text x="536" y="156" font-size="16" text-anchor="middle" fill="currentColor">h₃ = H(M)</text>
</svg>
<figcaption>Figure 9.5. Merkle-Damgård. One compression function f eats the message a block at a time, carrying a chaining value from left to right. The last block holds the padding and the message length, and the final chaining value is the digest.</figcaption>
</figure>

**Padding "abc" by hand.** "abc" is the three bytes `61 62 63`, which is 24
bits. Add the byte `80` (a `1` bit and seven zeros), then zeros up to byte 56,
then the length 24 = `0x18` in the last 8 bytes:

```
61626380 00000000 00000000 00000000 00000000 00000000 00000000 00000000
00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000018
```

<figure class="mars-fig">
<svg viewBox="0 0 612 182" width="612" role="img" aria-label="The 64-byte padded block for abc: bytes 61 62 63, then 80, then zeros, then the length 18 in the last byte">
<rect x="11" y="11" width="35" height="26" rx="0" class="soft-acc"/>
<rect x="11" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="28.5" y="29" font-size="13" text-anchor="middle" font-weight="bold" font-family="monospace" fill="currentColor">61</text>
<rect x="48" y="11" width="35" height="26" rx="0" class="soft-acc"/>
<rect x="48" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="65.5" y="29" font-size="13" text-anchor="middle" font-weight="bold" font-family="monospace" fill="currentColor">62</text>
<rect x="85" y="11" width="35" height="26" rx="0" class="soft-acc"/>
<rect x="85" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="102.5" y="29" font-size="13" text-anchor="middle" font-weight="bold" font-family="monospace" fill="currentColor">63</text>
<rect x="122" y="11" width="35" height="26" rx="0" class="soft-acc"/>
<rect x="122" y="11" width="35" height="26" rx="1" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="139.5" y="29" font-size="13" text-anchor="middle" font-weight="bold" font-family="monospace" fill="currentColor">80</text>
<rect x="159" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="176.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="196" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="213.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="233" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="270" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="287.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="307" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="324.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="344" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="361.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="381" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="398.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="418" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="435.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="455" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="472.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="492" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="509.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="529" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="566" y="11" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="583.5" y="29" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="11" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="28.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="48" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="65.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="85" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="102.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="122" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="139.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="159" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="176.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="196" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="213.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="233" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="270" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="287.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="307" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="324.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="344" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="361.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="381" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="398.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="418" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="435.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="455" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="472.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="492" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="509.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="529" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="566" y="39" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="583.5" y="57" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="11" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="28.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="48" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="65.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="85" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="102.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="122" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="139.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="159" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="176.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="196" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="213.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="233" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="270" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="287.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="307" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="324.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="344" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="361.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="381" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="398.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="418" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="435.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="455" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="472.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="492" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="509.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="529" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="566" y="67" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="583.5" y="85" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="11" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="28.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="48" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="65.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="85" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="102.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="122" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="139.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="159" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="176.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="196" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="213.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="233" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="270" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="287.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="307" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="307" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="324.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="344" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="344" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="361.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="381" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="381" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="398.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="418" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="418" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="435.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="455" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="455" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="472.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="492" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="492" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="509.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="529" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="529" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546.5" y="113" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">00</text>
<rect x="566" y="95" width="35" height="26" rx="0" class="soft"/>
<rect x="566" y="95" width="35" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="583.5" y="113" font-size="13" text-anchor="middle" font-weight="bold" font-family="monospace" fill="currentColor">18</text>
<text x="10" y="146" font-size="13" fill="currentColor">61 62 63 = &quot;abc&quot;   80 = the 1 bit</text>
<text x="10" y="168" font-size="13" fill="currentColor">zeros up to byte 56</text>
<polyline points="306,128 306,136 600,136 600,128" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<text x="453" y="151.2" font-size="13" text-anchor="middle" fill="currentColor">length: 24 bits = 0x18</text>
</svg>
<figcaption>Figure 9.6. "abc" padded to one 64-byte SHA-256 block: the three message bytes, the byte 80 (a single 1 bit), zeros, and the last 8 bytes holding the length in bits.</figcaption>
</figure>

That is one 64-byte block, so SHA-256("abc") is a single call of $f$.

**Why it is safe.** Suppose someone finds two different messages $M \neq M'$
with the same digest. Walk both chains backwards from the end. Either the last
blocks differ (the lengths are in them, so different lengths always give
different last blocks), and then $f(h, m) = f(h', m')$ with different inputs is
a collision of $f$; or the last blocks and chaining values are equal, and you
step back one block and repeat. Since $M \neq M'$, at some step the inputs
differ and the outputs match. So **a collision in the hash gives a collision in
$f$**: if $f$ is collision-resistant, so is the hash. That proof is the whole
reason everyone used this design for twenty years, and it puts all the work into
designing $f$.

**Where $f$ comes from.** MD5, SHA-1 and SHA-2 all build $f$ from a special
block cipher $E$ in the **Davies-Meyer** form

$$
f(h, m) = E_m(h) + h,
$$

where the message block is the cipher's *key* and the chaining value is
encrypted. The final "$+\,h$" (the feed-forward) matters: without it, anyone
could decrypt backwards from a chosen output, and preimages would be easy. In
SHA-256, $E$ is 64 rounds on eight 32-bit words, and "+" is word-wise addition
mod $2^{32}$.

<figure class="mars-fig">
<svg viewBox="0 0 560 190" width="560" role="img" aria-label="Davies-Meyer compression: the message block is the key of block cipher E, the chaining value is encrypted, and the input is added back to the output">
<text x="20" y="84" font-size="15" font-weight="bold" fill="currentColor">hᵢ₋₁</text>
<polyline points="60,80 104,80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="110,80 103.1,84 103.1,76" fill="currentColor"/>
<line x1="85" y1="80" x2="85" y2="150" stroke="currentColor" stroke-width="1.5"/>
<polyline points="85,150 370,150 370,98" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="370,92 374,98.9 366,98.9" class="acc-fill"/>
<rect x="110" y="55" width="150" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="185" y="86.3" font-size="18" text-anchor="middle" font-weight="bold" fill="currentColor">E</text>
<text x="185" y="22" font-size="14" text-anchor="middle" fill="currentColor">mᵢ (used as the key)</text>
<polyline points="185,30 185,49" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="185,55 181,48.1 189,48.1" fill="currentColor"/>
<polyline points="260,80 352,80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="358,80 351.1,84 351.1,76" fill="currentColor"/>
<rect x="360" y="70" width="20" height="20" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="364" y1="80" x2="376" y2="80" stroke="currentColor" class="acc" stroke-width="2"/>
<line x1="370" y1="74" x2="370" y2="86" stroke="currentColor" class="acc" stroke-width="2"/>
<polyline points="380,80 444,80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="450,80 443.1,84 443.1,76" fill="currentColor"/>
<text x="460" y="85" font-size="15" font-weight="bold" fill="currentColor">hᵢ</text>
<text x="230" y="172" font-size="13" text-anchor="middle" class="acc-fill">feed-forward: add hᵢ₋₁ back, word by word mod 2³²</text>
</svg>
<figcaption>Figure 9.7. The Davies-Meyer compression function f(h, m) = Eₘ(h) + h. The message block is the key; the chaining value is the plaintext. The feed-forward (accent) is what stops anyone from running the cipher backwards to find a preimage.</figcaption>
</figure>

The digest of a Merkle-Damgård hash is its entire final state. Keep that fact in
mind; it causes the attack in §9.7.

**Where the design came from.** Ralph Merkle had made his name as a Berkeley
undergraduate in 1974, with a scheme for strangers to agree on a key in public
("Merkle's puzzles", [Chapter 12](12-Diffie-Hellman.md)) before Diffie and
Hellman published. His 1979 Stanford thesis, supervised by Martin Hellman,
described both the hash chain and the hash tree that now carry his name. The
proof that chaining is safe came ten years later, at the CRYPTO '89 conference
in Santa Barbara, in two papers written independently: Merkle's "One Way Hash
Functions and DES" and Ivan Damgård's "A Design Principle for Hash Functions",
from Aarhus. That is why the construction carries both names. For the next
quarter century almost every hash in use was built this way.

!!! note "Life story: Merkle-Damgård"
    **Born:** 1979 (Merkle's Stanford thesis); proved safe in 1989 by Merkle and by Damgård,
    independently · **Purpose:** hash messages of any length with one fixed-size compression
    function, with a proof that the whole is as strong as its part · **Helped:** the shape of
    MD4, MD5, SHA-1, SHA-2, RIPEMD-160 and SM3, the hashes that ran the internet from 1990 on ·
    **Weak spots:** length extension (§9.7) and multicollisions (§9.12), both because the digest
    is the whole state · **Status:** current inside SHA-2; SHA-3 chose a sponge instead (§9.9).

## 9.5 Inside SHA-256

*Level: intermediate.*

SHA-2 was designed at the NSA and published by NIST in 2001 (finalized in FIPS
180-2, 2002), with digest sizes chosen to match the key sizes of the new AES. The family has SHA-224,
SHA-256, SHA-384, SHA-512 and the truncated SHA-512/224 and SHA-512/256; the
current standard is FIPS 180-4. SHA-256 works on 32-bit words, SHA-512 on
64-bit words with 80 rounds and 1,024-bit blocks.

**Constants with nothing up the sleeve.** The eight starting words are the first
32 bits of the fractional parts of the square roots of the first eight primes.
For example, $\sqrt{2} = 1.41421356\ldots$, and $0.41421356\ldots \times 2^{32} = 1{,}779{,}033{,}703.95$,
which in hex is `6a09e667`, the first word of SHA-256's start state. The 64
round constants $K_t$ come the same way from the cube roots of the first 64
primes: $\sqrt[3]{2}$ gives $K_0 = \mathtt{428a2f98}$. Constants from a public recipe
show the designers had no room to hide a weakness in them.

**One round.** The state is eight words $a, b, c, d, e, f, g, h$. Each round
mixes in one word $W_t$ of the expanded message and one constant $K_t$, using
four small functions ($\ggg$ is rotate right):

$$
\begin{aligned}
\Sigma_1(e) &= (e \ggg 6) \oplus (e \ggg 11) \oplus (e \ggg 25) & \mathrm{Ch}(e,f,g) &= (e \land f) \oplus (\lnot e \land g) \\
\Sigma_0(a) &= (a \ggg 2) \oplus (a \ggg 13) \oplus (a \ggg 22) & \mathrm{Maj}(a,b,c) &= (a \land b) \oplus (a \land c) \oplus (b \land c)
\end{aligned}
$$

$$
T_1 = h + \Sigma_1(e) + \mathrm{Ch}(e,f,g) + K_t + W_t, \qquad T_2 = \Sigma_0(a) + \mathrm{Maj}(a,b,c)
$$

Then every word shifts one place down the line, with two new values entering:
the new $a$ is $T_1 + T_2$ and the new $e$ is $d + T_1$. "Ch" (choose) uses the
bits of $e$ to pick bits from $f$ or $g$; "Maj" (majority) takes the majority
vote of three bits. These are the non-linear parts. Additions mod $2^{32}$ mix
carries across bits, and the rotations spread every bit sideways.

**The first round of "abc", by hand.** With the padded block from §9.4,
$W_0 = \mathtt{61626380}$ and $K_0 = \mathtt{428a2f98}$. Starting from the
square-root constants:

| Value | Result |
|---|---|
| $\Sigma_1(e)$, $e = \mathtt{510e527f}$ | `3587272b` |
| $\mathrm{Ch}(e, f, g)$ | `1f85c98c` |
| $\Sigma_0(a)$, $a = \mathtt{6a09e667}$ | `ce20b47e` |
| $\mathrm{Maj}(a, b, c)$ | `3a6fe667` |
| $T_1 = h + \Sigma_1 + \mathrm{Ch} + K_0 + W_0$ | `54da50e8` |
| $T_2 = \Sigma_0 + \mathrm{Maj}$ | `08909ae5` |
| new $a = T_1 + T_2$ | `5d6aebcd` |
| new $e = d + T_1$ | `fa2a4622` |

<div class="mars-steps" markdown>

1. Pad "abc" into one 64-byte block: `61626380`, zeros, and the length `00000018`.
2. Load the start words $a = \mathtt{6a09e667}, \ldots, h = \mathtt{5be0cd19}$ (square roots of 2, 3, 5, ..., 19).
3. Compute $T_1 = h + \Sigma_1(e) + \mathrm{Ch}(e,f,g) + K_0 + W_0 = \mathtt{54da50e8}$.
4. Compute $T_2 = \Sigma_0(a) + \mathrm{Maj}(a,b,c) = \mathtt{08909ae5}$.
5. Shift the words along: new $a = T_1 + T_2 = \mathtt{5d6aebcd}$, new $e = d + T_1 = \mathtt{fa2a4622}$.
6. Run 63 more rounds, with $W_{16}, \ldots, W_{63}$ made from the earlier words.
7. Add the start words back (the Davies-Meyer feed-forward): `ba7816bf...f20015ad`.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 690 330" width="690" role="img" aria-label="One SHA-256 round on abc: eight words shift one place; new a is T1 plus T2 and new e is d plus T1">
<rect x="10" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="49" y="49" font-size="15" text-anchor="middle" fill="currentColor">a</text>
<text x="49" y="66" font-size="13" text-anchor="middle" fill="currentColor">6a09e667</text>
<rect x="10" y="200" width="78" height="44" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="49" y="219" font-size="15" text-anchor="middle" fill="currentColor">a</text>
<text x="49" y="236" font-size="13" text-anchor="middle" fill="currentColor">5d6aebcd</text>
<rect x="95" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="134" y="49" font-size="15" text-anchor="middle" fill="currentColor">b</text>
<text x="134" y="66" font-size="13" text-anchor="middle" fill="currentColor">bb67ae85</text>
<rect x="95" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="134" y="219" font-size="15" text-anchor="middle" fill="currentColor">b</text>
<text x="134" y="236" font-size="13" text-anchor="middle" fill="currentColor">6a09e667</text>
<rect x="180" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="219" y="49" font-size="15" text-anchor="middle" fill="currentColor">c</text>
<text x="219" y="66" font-size="13" text-anchor="middle" fill="currentColor">3c6ef372</text>
<rect x="180" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="219" y="219" font-size="15" text-anchor="middle" fill="currentColor">c</text>
<text x="219" y="236" font-size="13" text-anchor="middle" fill="currentColor">bb67ae85</text>
<rect x="265" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="304" y="49" font-size="15" text-anchor="middle" fill="currentColor">d</text>
<text x="304" y="66" font-size="13" text-anchor="middle" fill="currentColor">a54ff53a</text>
<rect x="265" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="304" y="219" font-size="15" text-anchor="middle" fill="currentColor">d</text>
<text x="304" y="236" font-size="13" text-anchor="middle" fill="currentColor">3c6ef372</text>
<rect x="350" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="389" y="49" font-size="15" text-anchor="middle" fill="currentColor">e</text>
<text x="389" y="66" font-size="13" text-anchor="middle" fill="currentColor">510e527f</text>
<rect x="350" y="200" width="78" height="44" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="389" y="219" font-size="15" text-anchor="middle" fill="currentColor">e</text>
<text x="389" y="236" font-size="13" text-anchor="middle" fill="currentColor">fa2a4622</text>
<rect x="435" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="474" y="49" font-size="15" text-anchor="middle" fill="currentColor">f</text>
<text x="474" y="66" font-size="13" text-anchor="middle" fill="currentColor">9b05688c</text>
<rect x="435" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="474" y="219" font-size="15" text-anchor="middle" fill="currentColor">f</text>
<text x="474" y="236" font-size="13" text-anchor="middle" fill="currentColor">510e527f</text>
<rect x="520" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="559" y="49" font-size="15" text-anchor="middle" fill="currentColor">g</text>
<text x="559" y="66" font-size="13" text-anchor="middle" fill="currentColor">1f83d9ab</text>
<rect x="520" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="559" y="219" font-size="15" text-anchor="middle" fill="currentColor">g</text>
<text x="559" y="236" font-size="13" text-anchor="middle" fill="currentColor">9b05688c</text>
<rect x="605" y="30" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="644" y="49" font-size="15" text-anchor="middle" fill="currentColor">h</text>
<text x="644" y="66" font-size="13" text-anchor="middle" fill="currentColor">5be0cd19</text>
<rect x="605" y="200" width="78" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="644" y="219" font-size="15" text-anchor="middle" fill="currentColor">h</text>
<text x="644" y="236" font-size="13" text-anchor="middle" fill="currentColor">1f83d9ab</text>
<text x="10" y="20" font-size="13" fill="currentColor">before round 0 (the square-root constants)</text>
<text x="10" y="266" font-size="13" fill="currentColor">after round 0</text>
<polyline points="49,74 130.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="134,198 126.8,194.5 133.4,190" fill="currentColor"/>
<polyline points="134,74 215.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="219,198 211.8,194.5 218.4,190" fill="currentColor"/>
<polyline points="219,74 300.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="304,198 296.8,194.5 303.4,190" fill="currentColor"/>
<polyline points="389,74 470.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="474,198 466.8,194.5 473.4,190" fill="currentColor"/>
<polyline points="474,74 555.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="559,198 551.8,194.5 558.4,190" fill="currentColor"/>
<polyline points="559,74 640.6,193.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<polygon points="644,198 636.8,194.5 643.4,190" fill="currentColor"/>
<rect x="39" y="140" width="20" height="20" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="43" y1="150" x2="55" y2="150" stroke="currentColor" class="acc" stroke-width="2"/>
<line x1="49" y1="144" x2="49" y2="156" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="47" y="128" font-size="13" text-anchor="middle" font-weight="bold" class="acc-fill">T1 + T2</text>
<polyline points="49,160 49,192" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="49,198 45,191.1 53,191.1" class="acc-fill"/>
<line x1="304" y1="74" x2="381" y2="142" stroke="currentColor" class="acc" stroke-width="1.5"/>
<rect x="379" y="140" width="20" height="20" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="383" y1="150" x2="395" y2="150" stroke="currentColor" class="acc" stroke-width="2"/>
<line x1="389" y1="144" x2="389" y2="156" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="339" y="152" font-size="13" text-anchor="end" font-weight="bold" class="acc-fill">d + T1</text>
<polyline points="389,160 389,192" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="389,198 385,191.1 393,191.1" class="acc-fill"/>
<text x="644" y="100" font-size="12" text-anchor="middle" fill="currentColor">h is used</text>
<text x="644" y="114" font-size="12" text-anchor="middle" fill="currentColor">up in T1</text>
<text x="10" y="292" font-size="13" fill="currentColor">T1 = h + Σ1(e) + Ch(e,f,g) + K0 + W0 = 54da50e8</text>
<text x="10" y="314" font-size="13" fill="currentColor">T2 = Σ0(a) + Maj(a,b,c) = 08909ae5</text>
</svg>
<figcaption>Figure 9.8. Round 0 of SHA-256("abc"), with the values from the table above. Six words just move one place to the right (grey arrows); only the new a and the new e are computed (accent). Sixty-four such rounds make one compression.</figcaption>
</figure>

**The message schedule.** The block gives only 16 words, $W_0$ to $W_{15}$. The
other 48 are made from earlier ones, so every message bit reaches many rounds:

$$
W_t = \sigma_1(W_{t-2}) + W_{t-7} + \sigma_0(W_{t-15}) + W_{t-16}, \qquad t = 16, \ldots, 63,
$$

with $\sigma_0(x) = (x \ggg 7) \oplus (x \ggg 18) \oplus (x \gg 3)$ and
$\sigma_1(x) = (x \ggg 17) \oplus (x \ggg 19) \oplus (x \gg 10)$, where $\gg$ is a plain shift.
This schedule is the part SHA-1 had too little of, and it is a large reason
SHA-2 has held.

**SHA-2's quiet career.** SHA-2 is the one hash in this chapter without a
dramatic story, which is its best feature. When the NSA's design was published
in 2001, SHA-1 had no known break, and for years few people bothered to switch:
through the 2000s most web certificates were still signed over SHA-1. The
attacks of 2005 (§9.8) started the move, and the deadline set by browsers and
certificate authorities, no new SHA-1 certificates from 2016, finished it.
Meanwhile SHA-256 found new jobs. Bitcoin, launched in 2009, hashes each block
header with SHA-256 twice, and its miners spend their electricity searching for
a header whose double hash falls below a target. Many processors now have
instructions just for SHA-256's rounds. After twenty-five years of public
attack, the best results reach only reduced versions (§9.12).

!!! note "Life story: SHA-2"
    **Born:** 2001, designed at the NSA, published by NIST and finalized in FIPS 180-2 (2002);
    SHA-224 followed in 2004 and SHA-512/256 in 2012 · **Purpose:** hashes matched to AES's key
    sizes, to replace the 80-bit collision level of SHA-1 · **Helped:** certificates, TLS, SSH,
    code signing, Bitcoin, Git's SHA-256 format, HMAC-SHA-256 and HKDF · **Status:** current; no
    practical attack on the full function, but plain SHA-256 and SHA-512 are open to length
    extension (§9.7).

## 9.6 Code it

*Level: intermediate.*

Everything above fits in one short program. It computes the constants from the
primes rather than copying 72 hex numbers, and it lets you start from any state,
which §9.7 needs.

```python
import hashlib

def primes(n):                          # the first n primes
    ps, k = [], 2
    while len(ps) < n:
        if all(k % p for p in ps):
            ps.append(k)
        k += 1
    return ps

def frac_root(p, r):                    # first 32 bits of the fraction of p^(1/r)
    x = int(p ** (1 / r) * 2**32)       # close guess, then fix it exactly
    while (x + 1) ** r <= p << (32 * r):
        x += 1
    while x ** r > p << (32 * r):
        x -= 1
    return x & 0xffffffff

H0 = [frac_root(p, 2) for p in primes(8)]
K = [frac_root(p, 3) for p in primes(64)]
M32 = 0xffffffff

def rotr(x, n):
    return (x >> n | x << (32 - n)) & M32

def pad(n):                             # padding for an n-byte message
    return b"\x80" + bytes((55 - n) % 64) + (8 * n).to_bytes(8, "big")

def compress(h, block):
    w = [int.from_bytes(block[i:i + 4], "big") for i in range(0, 64, 4)]
    for t in range(16, 64):
        s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ w[t - 15] >> 3
        s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ w[t - 2] >> 10
        w.append((w[t - 16] + s0 + w[t - 7] + s1) & M32)
    a, b, c, d, e, f, g, hh = h
    for t in range(64):
        t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K[t] + w[t]
        t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c)
        a, b, c, d, e, f, g, hh = (t1 + t2) & M32, a, b, c, (d + t1) & M32, e, f, g
    return [(x + y) & M32 for x, y in zip(h, [a, b, c, d, e, f, g, hh])]

def sha256(msg, h=H0, done=0):          # done: bytes already hashed into h
    data = msg + pad(done + len(msg))
    for i in range(0, len(data), 64):
        h = compress(h, data[i:i + 64])
    return b"".join(x.to_bytes(4, "big") for x in h)

print(hex(H0[0]), hex(K[0]), hex(K[63]))
print(sha256(b"abc").hex())
for m in (b"", b"abc", b"a" * 55, b"a" * 56, b"a" * 1000):
    assert sha256(m) == hashlib.sha256(m).digest()
print("matches hashlib")
```

```
0x6a09e667 0x428a2f98 0xc67178f2
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
matches hashlib
```

The test lengths 55 and 56 matter: 55 bytes is the longest message whose padding
fits in one block, and 56 bytes spills the length into a second block, the
classic place for padding bugs. This code is for learning. It is slow and it is
not written to resist timing attacks; real programs call `hashlib.sha256`.

## 9.7 Break it: length extension

*Level: intermediate.*

A tempting way to authenticate a message with a secret key is to hash them
together: $\mathit{tag} = \text{SHA-256}(\mathit{key} \,\Vert\, \mathit{message})$. Only someone with the key can
compute the tag, so it seems to prove the message is genuine.

It does not, and §9.4 already shows why. The digest *is* the full chaining
value after the last block. An attacker who knows the tag can load it as the
starting state and keep hashing. They do not know the key, but they don't need
it: they only need its *length*, to work out what padding the server's hash
appended. The result is a valid tag for

$$
\mathit{key} \,\Vert\, \mathit{message} \,\Vert\, \mathit{padding} \,\Vert\, \mathit{extra}
$$

for any $\mathit{extra}$ the attacker likes. Add this below the program from §9.6:

```python
import os

secret = os.urandom(16)                  # the server's key; the attacker never sees it
msg = b"user=alice&role=user"
tag = hashlib.sha256(secret + msg).digest()        # the "MAC" the server hands out

# The attacker knows msg, tag and the key length (16), nothing else.
extra = b"&role=admin"
glue = pad(16 + len(msg))                # the padding the server's hash added
h = [int.from_bytes(tag[i:i + 4], "big") for i in range(0, 32, 4)]
forged_msg = msg + glue + extra
forged_tag = sha256(extra, h, 16 + len(msg) + len(glue))

print(forged_msg)
print(hashlib.sha256(secret + forged_msg).digest() == forged_tag)
```

After the three lines from §9.6, it prints:

```
b'user=alice&role=user\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01 &role=admin'
True
```

The forged message carries some binary junk in the middle (the old padding),
but many parsers skip it, and if the server reads the last `role=` it now says
`admin`. The key length is rarely secret; an attacker can also just try each
plausible length. In 2009 Thai Duong and Juliano Rizzo, two security researchers from Vietnam
and Argentina, forged requests to Flickr's API this way, because Flickr signed
calls with MD5(secret + data). The same pair later found the BEAST (2011) and
CRIME (2012) attacks on TLS.

<figure class="mars-fig">
<svg viewBox="0 0 700 230" width="700" role="img" aria-label="Length extension: the server hashes key, message and padding to get the tag; the attacker starts from the tag and hashes extra data to get a valid forged tag">
<rect x="10" y="120" width="50" height="36" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="35" y="142.9" font-size="14" text-anchor="middle" fill="currentColor">IV</text>
<rect x="80" y="22" width="210" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="185" y="43.5" font-size="13" text-anchor="middle" fill="currentColor">key ‖ msg ‖ glue padding</text>
<polyline points="185,56 185,112" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="185,118 181,111.1 189,111.1" fill="currentColor"/>
<polyline points="60,138 154,138" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="160,138 153.1,142 153.1,134" fill="currentColor"/>
<rect x="160" y="118" width="50" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="185" y="143.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="210,138 294,138" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="300,138 293.1,142 293.1,134" fill="currentColor"/>
<rect x="300" y="118" width="90" height="40" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="345" y="142.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">tag</text>
<rect x="400" y="22" width="170" height="34" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="485" y="43.5" font-size="13" text-anchor="middle" fill="currentColor">extra ‖ new pad</text>
<polyline points="475,56 475,112" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="475,118 471,111.1 479,111.1" class="acc-fill"/>
<polyline points="390,138 444,138" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="450,138 443.1,142 443.1,134" class="acc-fill"/>
<rect x="450" y="118" width="50" height="40" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="475" y="143.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="500,138 554,138" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="560,138 553.1,142 553.1,134" class="acc-fill"/>
<rect x="560" y="118" width="130" height="40" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="625" y="142.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">forged tag</text>
<polyline points="10,176 10,184 390,184 390,176" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<text x="200" y="199.2" font-size="13" text-anchor="middle" fill="currentColor">the server&#x27;s hash (needs the key)</text>
<polyline points="400,176 400,184 690,184 690,176" fill="none" class="acc" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<text x="545" y="199.2" font-size="13" text-anchor="middle" class="acc-fill">the attacker&#x27;s hash (needs only the tag)</text>
</svg>
<figcaption>Figure 9.9. Length extension. The tag is the whole chaining value after the server's last block, so the attacker loads it as a starting state and keeps going. The server, hashing key ‖ msg ‖ glue ‖ extra from scratch, passes through exactly the same states and gets the same forged tag.</figcaption>
</figure>

**The fixes.** Use a real MAC, [HMAC](10-Message-Authentication.md), which
hashes twice so the outer hash hides the inner state. Or use a hash whose
output is not its whole state: SHA-512/256 and SHA-384 cut the output short,
and SHA-3 (§9.9) never outputs its hidden part at all.

!!! note "Life story: the length-extension attack"
    **Born:** as soon as people keyed Merkle-Damgård hashes by putting a secret in front; it was
    understood by the early 1990s and is the reason HMAC (1996) hashes twice · **What it breaks:**
    $H(\mathit{key} \,\Vert\, \mathit{message})$ used as a MAC, with MD5, SHA-1, SHA-256 or
    SHA-512 · **Famous use:** the Flickr API forgery (Duong and Rizzo, 2009) · **Fixed by:** HMAC,
    truncated hashes such as SHA-512/256, and sponges such as SHA-3 · **Status:** still works
    against every system that makes this mistake.

## 9.8 How MD5 and SHA-1 fell

*Level: intermediate.*

**MD4 and MD5.** Ron Rivest at MIT designed MD4 in 1990 for the fast 32-bit
processors of the day, and MD5 in 1991 as a more careful version (RFC 1321,
1992). Rivest was already famous as the R of RSA
([Chapter 13](13-RSA.md)); "MD" stands for message digest. Their shape, a Davies-Meyer compression function with rounds of
add, rotate, XOR and a non-linear bit function, became the template for SHA-0,
SHA-1 and SHA-2. Through the 1990s MD5 was everywhere: file checksums,
certificates, Unix passwords, HMAC in TLS and IPsec.

Warnings came early. Hans Dobbertin in Germany found collisions in MD4 in 1996,
and in the same year collisions of MD5's compression function with a chosen
starting value. Experts began advising a move away from MD5, but it was so
widely deployed that little changed.

**Wang Xiaoyun.** In August 2004, at the CRYPTO conference's informal evening
session, Wang Xiaoyun of Shandong University in China, with Feng Dengguo, Lai
Xuejia and Yu Hongbo, showed real collisions for MD5, MD4, HAVAL-128 and the
original RIPEMD. Her method was **differential cryptanalysis** turned on hash
functions: pick a small difference between two message blocks, and a path of
differences through the rounds that cancels by the end, so that both blocks give
the same output. Each step of the path holds only with some probability, but
she found ways to choose the message words so that the early steps hold by
construction ("message modification"), leaving only the late ones to chance.
By 2006 Vlastimil Klíma in Prague had sped the
method up so that an ordinary notebook computer found MD5 collisions in under a
minute. Here is one, from Wang and Yu's 2005 paper: two 128-byte
inputs that differ in six bits.

```python
import hashlib

a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70")
b = bytearray(a)
for i in (19, 45, 59, 83, 109, 123):     # flip the top bit of six bytes
    b[i] ^= 0x80
b = bytes(b)

print(hashlib.md5(a).hexdigest())
print(hashlib.md5(b).hexdigest())
tail = b"any ending you like, as long as both get the same one"
print(hashlib.md5(a + tail).digest() == hashlib.md5(b + tail).digest())
print(hashlib.sha256(a).digest() == hashlib.sha256(b).digest())
```

```
79054025255fb1a26e4bc422aef54eb4
79054025255fb1a26e4bc422aef54eb4
True
False
```

The third line is Merkle-Damgård working against the defender: once two inputs
collide on whole blocks, the chaining values are equal, so **any common ending
keeps them colliding**. A file format can put a colliding block early and then
let later content branch on it, which is how researchers built pairs of PDFs,
programs and certificates with the same MD5.

<figure class="mars-fig">
<svg viewBox="0 0 660 200" width="660" role="img" aria-label="Two different blocks M and M prime reach the same chaining value from the IV; any common tail keeps them equal through to the digest">
<rect x="10" y="80" width="50" height="36" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="35" y="102.9" font-size="14" text-anchor="middle" fill="currentColor">IV</text>
<rect x="100" y="12" width="80" height="32" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="140" y="32.9" font-size="14" text-anchor="middle" fill="currentColor">M</text>
<rect x="100" y="152" width="80" height="32" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="140" y="172.9" font-size="14" text-anchor="middle" fill="currentColor">M′</text>
<polyline points="60,92 90,92 90,66 174,66" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="180,66 173.1,70 173.1,62" fill="currentColor"/>
<polyline points="60,104 90,104 90,130 174,130" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="180,130 173.1,134 173.1,126" fill="currentColor"/>
<polyline points="140,44 140,54" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="140,60 136,53.1 144,53.1" fill="currentColor"/>
<polyline points="140,152 140,142" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="140,136 144,142.9 136,142.9" fill="currentColor"/>
<rect x="180" y="50" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="205" y="70.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<rect x="180" y="114" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="205" y="134.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="230,66 290,66 290,88 314,88" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="320,88 313.1,92 313.1,84" class="acc-fill"/>
<polyline points="230,130 290,130 290,108 314,108" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="320,108 313.1,112 313.1,104" class="acc-fill"/>
<rect x="320" y="78" width="110" height="40" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="375" y="102.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">same h</text>
<rect x="450" y="12" width="110" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="32.9" font-size="14" text-anchor="middle" fill="currentColor">any tail</text>
<polyline points="505,44 505,70" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="505,76 501,69.1 509,69.1" fill="currentColor"/>
<polyline points="430,98 474,98" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="480,98 473.1,102 473.1,94" fill="currentColor"/>
<rect x="480" y="78" width="50" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="102.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="530,98 554,98" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="560,98 553.1,102 553.1,94" fill="currentColor"/>
<rect x="560" y="80" width="90" height="36" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="605" y="102.2" font-size="12" text-anchor="middle" fill="currentColor">same digest</text>
</svg>
<figcaption>Figure 9.10. Why one MD5 collision lasts. Once M and M′ lead to the same chaining value, the hash can no longer tell them apart, and any ending appended to both keeps the digests equal.</figcaption>
</figure>

**Chosen prefixes, and a rogue authority.** Wang's collisions start from the
same prefix. Marc Stevens, Arjen Lenstra and Benne de Weger (CWI Amsterdam,
EPFL and TU Eindhoven) went further in 2007 with **chosen-prefix collisions**:
start from two *different* chosen beginnings and find endings that make them
collide. In December 2008 Stevens, Alexander Sotirov, Jacob Appelbaum and
others used about 200 PlayStation 3 consoles to compute one that turned an
ordinary web certificate, signed with MD5 by a commercial certificate
authority, into a certificate for their own authority that browsers trusted.
They dated it to have expired years earlier, so it could do no harm, but
it showed that a criminal could have done the same. Certificate authorities stopped signing with MD5.

**Flame.** In May 2012 researchers found Flame, espionage malware aimed mostly
at computers in Iran and the Middle East. It spread through Windows Update
using a forged code-signing certificate that chained up to Microsoft. Stevens
analyzed it and found an MD5 chosen-prefix collision made with a *new* variant
of the attack, unknown to the public: someone with large resources had their
own hash cryptanalysts. Microsoft revoked the certificates involved (Security
Advisory 2718704). MD5 had been "broken" for eight years, but a forgotten
licensing service still signed with it.

!!! note "Life story: MD5"
    **Born:** 1991, Ron Rivest at MIT, a strengthened MD4; RFC 1321 (1992) · **Purpose:** a fast
    128-bit digest for signatures on the 32-bit computers of the day · **Helped:** a decade of
    file checksums, certificates, Unix password hashing (MD5-crypt) and HMAC-MD5 in TLS and IPsec
    · **Retired:** collisions by Wang's team in 2004, then the rogue CA (2008) and Flame (2012);
    RFC 6151 (2011) told protocols to stop relying on it for collision resistance · **Replaced
    by:** SHA-256

**SHA-1.** The NSA's SHA-0 appeared in 1993 (FIPS 180), and in 1995 it was
replaced by SHA-1 (FIPS 180-1), which differs by a single one-bit rotation in
the message schedule. The NSA gave no reason. In 1998 Florent Chabaud and
Antoine Joux in France found a collision attack on SHA-0 that the rotation
stops, so the change was clearly a fix. SHA-1's 160 bits promised $2^{80}$
collision security. In February 2005 Wang, Yin Yiqun and Yu Hongbo announced an
attack in about $2^{69}$, and NIST began urging a move to SHA-2. It took twelve
more years for the attack to be run:

- **SHAttered, February 2017.** Stevens, Elie Bursztein, Pierre Karpman, Ange
  Albertini and Yarik Markov (CWI and Google) published two different PDF files
  with the same SHA-1. It cost about $2^{63.1}$ SHA-1 computations, about 6,500
  CPU years and 100 GPU years, roughly 120,000 times faster than the birthday
  bound.
- **SHA-1 is a Shambles, January 2020.** Gaëtan Leurent (Inria, France) and
  Thomas Peyrin (NTU, Singapore) made a chosen-prefix collision for about
  US\$45,000 of rented GPU time, and used it to build two PGP keys with
  different names whose certification signatures collide.

<figure class="mars-fig">
<svg viewBox="0 0 640 180" width="640" role="img" aria-label="Bar chart of SHA-1 collision costs in powers of two: generic 80, 2005 estimate 69, SHAttered 63.1, Shambles 63.4">
<text x="250" y="32" font-size="14" text-anchor="end" fill="currentColor">birthday bound (generic)</text>
<rect x="260" y="16" width="290" height="22" rx="2" class="soft"/>
<rect x="260" y="16" width="290" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="558" y="32" font-size="13" fill="currentColor">2⁸⁰</text>
<text x="250" y="66" font-size="14" text-anchor="end" fill="currentColor">Wang, Yin, Yu, 2005 (estimate)</text>
<rect x="260" y="50" width="183.7" height="22" rx="2" class="soft"/>
<rect x="260" y="50" width="183.7" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="451.7" y="66" font-size="13" fill="currentColor">about 2⁶⁹</text>
<text x="250" y="100" font-size="14" text-anchor="end" fill="currentColor">SHAttered, 2017 (run)</text>
<rect x="260" y="84" width="126.6" height="22" rx="2" class="soft-acc"/>
<rect x="260" y="84" width="126.6" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="394.6" y="100" font-size="13" font-weight="bold" fill="currentColor">2⁶³·¹</text>
<text x="250" y="134" font-size="14" text-anchor="end" fill="currentColor">Shambles chosen prefix, 2020</text>
<rect x="260" y="118" width="129.5" height="22" rx="2" class="soft-acc"/>
<rect x="260" y="118" width="129.5" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="397.5" y="134" font-size="13" font-weight="bold" fill="currentColor">2⁶³·⁴</text>
<line x1="260" y1="10" x2="260" y2="146" stroke="currentColor" stroke-width="1.5"/>
<line x1="260" y1="146" x2="550" y2="146" stroke="currentColor" stroke-width="1"/>
<line x1="260" y1="146" x2="260" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="260" y="165" font-size="12" text-anchor="middle" fill="currentColor">2⁵⁰</text>
<line x1="356.7" y1="146" x2="356.7" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="356.7" y="165" font-size="12" text-anchor="middle" fill="currentColor">2⁶⁰</text>
<line x1="453.3" y1="146" x2="453.3" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="453.3" y="165" font-size="12" text-anchor="middle" fill="currentColor">2⁷⁰</text>
<line x1="550" y1="146" x2="550" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="550" y="165" font-size="12" text-anchor="middle" fill="currentColor">2⁸⁰</text>
</svg>
<figcaption>Figure 9.11. SHA-1 collision cost in SHA-1 computations, on a scale of powers of two (the axis starts at 2⁵⁰). Seventeen powers of two below the birthday bound is a factor of about 120,000.</figcaption>
</figure>

Browsers stopped accepting SHA-1 certificates in early 2017. Git, whose object
names are SHA-1, switched in 2017 to a version of SHA-1 by Stevens and Dan
Shumow that detects the tell-tale patterns of these attacks (counter-
cryptanalysis), and added SHA-256 repositories in 2020. NIST plans to stop
allowing SHA-1 entirely by the end of 2030.

!!! note "Life story: SHA-1"
    **Born:** 1995, the NSA's revision of SHA-0 (1993), published as FIPS 180-1 · **Purpose:** the
    US federal hash, paired with the DSA signature standard · **Helped:** twenty years as the hash
    of the internet: certificates, TLS, PGP, software updates and every Git repository ·
    **Retired:** a theoretical attack in 2005, the first real collision (SHAttered) in 2017, a
    chosen-prefix collision in 2020; browsers rejected SHA-1 certificates from 2017, and NIST ends
    all use by the end of 2030 · **Replaced by:** SHA-256 and SHA-3

**The lesson.** Collisions broke both hashes. Preimages never fell: the best
known preimage attack on MD5 still costs about $2^{123.4}$. That is why HMAC-MD5
and HMAC-SHA-1, which need something closer to preimage resistance, were never
practically broken, even though nobody should pick them today. And each hash
had years of public warnings before the attacks became cheap. Systems that had
planned a way to change hash functions moved easily; the rest were caught out.

!!! note "Life story: differential collision attacks on hashes"
    **Born:** 2004, Wang Xiaoyun and her colleagues at Shandong University, turning Biham and
    Shamir's differential cryptanalysis of block ciphers (1990) on hash functions and building
    on Dobbertin's attacks on MD4 · **Broke:** MD4, MD5, HAVAL-128 and RIPEMD in 2004, SHA-0 and
    (in theory) SHA-1 in 2005 · **Led to:** chosen-prefix collisions (Stevens, 2007), the rogue
    CA, SHAttered, and NIST's SHA-3 competition · **Status:** current as a method; SHA-2 and SHA-3
    resist it, with attacks only on reduced rounds.

## 9.9 A different design: the sponge and SHA-3

*Level: intermediate.*

By 2005 the attacks on MD5 and SHA-1 had all used the same family of
techniques, and SHA-2 belonged to the same family. Nobody had broken it, but if
a new idea broke SHA-2 there would be nothing to fall back on. NIST answered as
it had for AES: an open, worldwide competition. It was announced in November
2007; 64 designs were submitted, 51 were accepted to the first round, and in
December 2010 five finalists remained: BLAKE (Switzerland and the UK), Grøstl
(Denmark and Austria), JH (Hongjun Wu, Singapore), Keccak (Belgium and Italy)
and Skein (a team including Bruce Schneier and Niels Ferguson). On 2 October 2012 NIST chose
**Keccak**, by Guido Bertoni, Joan Daemen (a co-designer of AES), Michaël
Peeters and Gilles Van Assche. NIST wrote that it was chosen partly because it
is so unlike SHA-2. It became FIPS 202 in August 2015. Daemen thus became a
co-designer of the winners of both of NIST's great open competitions, AES and
SHA-3. The team had published the sponge idea itself in 2007, the year the
competition opened, and Keccak was its first full use.

**The sponge.** Keccak is not Merkle-Damgård. It keeps a 1,600-bit state and
one fixed **permutation** $f$ (a reversible scramble with no key, Keccak-f[1600]).
The state is split in two: the **rate** $r$, the part data goes in and out of,
and the **capacity** $c = 1600 - r$, which is never touched directly.

- **Absorb:** XOR the next $r$ bits of the padded message into the rate part,
  then apply $f$ to the whole state. Repeat until the message is used up.
- **Squeeze:** output the rate part; if more output is needed, apply $f$ and
  output again.

The capacity is the hidden reserve. An attacker sees only rate bits and never
learns the full state, so length extension does not work, and the generic
security of a sponge is $c/2$ bits. SHA3-256 uses $c = 512$ and
$r = 1088$ bits (136 bytes), giving 128-bit collision and 256-bit preimage
security, matching SHA-256.

<figure class="mars-fig">
<svg viewBox="0 0 700 250" width="700" role="img" aria-label="Sponge construction: message blocks are XORed into the rate part of the state between applications of permutation f; output is read from the rate part during squeezing">
<text x="14" y="115" font-size="15" font-weight="bold" fill="currentColor">r</text>
<text x="14" y="165" font-size="15" font-weight="bold" fill="currentColor">c</text>
<rect x="36" y="140" width="24" height="40" rx="0" class="soft"/>
<rect x="36" y="90" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="36" y="140" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="170" y="140" width="24" height="40" rx="0" class="soft"/>
<rect x="170" y="90" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="170" y="140" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="304" y="140" width="24" height="40" rx="0" class="soft"/>
<rect x="304" y="90" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="304" y="140" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="76" y="30" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">P₀</text>
<polyline points="76,38 76,94" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="76,100 72,93.1 80,93.1" fill="currentColor"/>
<circle cx="76" cy="110" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="67" y1="110" x2="85" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="76" y1="101" x2="76" y2="119" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="110" x2="67" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="160" x2="96" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="85" y1="110" x2="96" y2="110" stroke="currentColor" stroke-width="1.5"/>
<rect x="96" y="90" width="46" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="119" y="140.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="142,110 164,110" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="170,110 163.1,114 163.1,106" fill="currentColor"/>
<polyline points="142,160 164,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="170,160 163.1,164 163.1,156" fill="currentColor"/>
<text x="210" y="30" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">P₁</text>
<polyline points="210,38 210,94" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="210,100 206,93.1 214,93.1" fill="currentColor"/>
<circle cx="210" cy="110" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="201" y1="110" x2="219" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="210" y1="101" x2="210" y2="119" stroke="currentColor" stroke-width="1.5"/>
<line x1="194" y1="110" x2="201" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="194" y1="160" x2="230" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="219" y1="110" x2="230" y2="110" stroke="currentColor" stroke-width="1.5"/>
<rect x="230" y="90" width="46" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="253" y="140.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="276,110 298,110" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="304,110 297.1,114 297.1,106" fill="currentColor"/>
<polyline points="276,160 298,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="304,160 297.1,164 297.1,156" fill="currentColor"/>
<text x="344" y="30" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">P₂</text>
<polyline points="344,38 344,94" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="344,100 340,93.1 348,93.1" fill="currentColor"/>
<circle cx="344" cy="110" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="335" y1="110" x2="353" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="344" y1="101" x2="344" y2="119" stroke="currentColor" stroke-width="1.5"/>
<line x1="328" y1="110" x2="335" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="328" y1="160" x2="364" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="353" y1="110" x2="364" y2="110" stroke="currentColor" stroke-width="1.5"/>
<rect x="364" y="90" width="46" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="387" y="140.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<polyline points="410,110 432,110" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="438,110 431.1,114 431.1,106" fill="currentColor"/>
<polyline points="410,160 432,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="438,160 431.1,164 431.1,156" fill="currentColor"/>
<rect x="438" y="140" width="24" height="40" rx="0" class="soft"/>
<rect x="438" y="90" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="438" y="140" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="486" y="90" width="46" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="509" y="140.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">f</text>
<line x1="462" y1="110" x2="486" y2="110" stroke="currentColor" stroke-width="1.5"/>
<line x1="462" y1="160" x2="486" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polyline points="532,110 566,110" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="572,110 565.1,114 565.1,106" fill="currentColor"/>
<polyline points="532,160 566,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="572,160 565.1,164 565.1,156" fill="currentColor"/>
<rect x="572" y="140" width="24" height="40" rx="0" class="soft"/>
<rect x="572" y="90" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="572" y="140" width="24" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<polyline points="450,90 450,52" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="450,46 454,52.9 446,52.9" class="acc-fill"/>
<text x="450" y="38" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">Z₀</text>
<polyline points="584,90 584,52" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="584,46 588,52.9 580,52.9" class="acc-fill"/>
<text x="584" y="38" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">Z₁</text>
<text x="620" y="115" font-size="18" fill="currentColor">…</text>
<polyline points="36,196 36,204 400,204 400,196" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<text x="218" y="219.2" font-size="13" text-anchor="middle" fill="currentColor">absorb</text>
<polyline points="438,196 438,204 600,204 600,196" fill="none" class="acc" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
<text x="519" y="219.2" font-size="13" text-anchor="middle" class="acc-fill">squeeze</text>
</svg>
<figcaption>Figure 9.12. The sponge. Message blocks P₀, P₁, … are XORed into the rate r (white) and the whole state is scrambled by f; output Z₀, Z₁, … is read from the rate. The capacity c (shaded) is never input or output directly, which is what blocks length extension.</figcaption>
</figure>

**Inside Keccak-f.** The state is a $5 \times 5$ grid of 64-bit "lanes", and each of
24 rounds runs five steps, each simple: $\theta$ XORs every bit with the parity
of two nearby columns, $\rho$ rotates each lane by a fixed amount, $\pi$ moves the
lanes to new positions, $\chi$ is the only non-linear step,
$A[x] \mathrel{\oplus}= (\lnot A[x+1]) \land A[x+2]$ along each row, and $\iota$ XORs a round
constant into one lane so the rounds differ. There are no additions, only XOR,
AND, NOT and rotations, which makes it cheap in hardware and easy to protect
against timing attacks.

<div class="mars-steps" markdown>

1. Start with 1,600 bits of zeros: the first 1,088 bits are the rate, the last 512 the capacity.
2. Pad "abc" to a 136-byte block: `61 62 63 06 00 ... 00 80`. The `06` marks this as SHA-3, not SHAKE.
3. XOR the block into the rate part. The capacity is untouched.
4. Scramble the whole state with 24 rounds of $\theta, \rho, \pi, \chi, \iota$.
5. Read out the first 32 bytes: `3a985da7...11431532`. That is SHA3-256("abc").
6. Need more output? Scramble again and read again. That is how SHAKE gives any length.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Keccak state as a 5 by 5 grid of 64-bit lanes, and the chi step acting on one row of five bits">
<rect x="40" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="215" font-size="12" text-anchor="middle" fill="currentColor">0,0</text>
<rect x="80" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="215" font-size="12" text-anchor="middle" fill="currentColor">1,0</text>
<rect x="120" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="215" font-size="12" text-anchor="middle" fill="currentColor">2,0</text>
<rect x="160" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="215" font-size="12" text-anchor="middle" fill="currentColor">3,0</text>
<rect x="200" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="215" font-size="12" text-anchor="middle" fill="currentColor">4,0</text>
<rect x="40" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="175" font-size="12" text-anchor="middle" fill="currentColor">0,1</text>
<rect x="80" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="175" font-size="12" text-anchor="middle" fill="currentColor">1,1</text>
<rect x="120" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="175" font-size="12" text-anchor="middle" fill="currentColor">2,1</text>
<rect x="160" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="175" font-size="12" text-anchor="middle" fill="currentColor">3,1</text>
<rect x="200" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="175" font-size="12" text-anchor="middle" fill="currentColor">4,1</text>
<rect x="40" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="40" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="135" font-size="12" text-anchor="middle" fill="currentColor">0,2</text>
<rect x="80" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="80" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="135" font-size="12" text-anchor="middle" fill="currentColor">1,2</text>
<rect x="120" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="120" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="135" font-size="12" text-anchor="middle" fill="currentColor">2,2</text>
<rect x="160" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="160" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="135" font-size="12" text-anchor="middle" fill="currentColor">3,2</text>
<rect x="200" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="200" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="135" font-size="12" text-anchor="middle" fill="currentColor">4,2</text>
<rect x="40" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="95" font-size="12" text-anchor="middle" fill="currentColor">0,3</text>
<rect x="80" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="95" font-size="12" text-anchor="middle" fill="currentColor">1,3</text>
<rect x="120" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="95" font-size="12" text-anchor="middle" fill="currentColor">2,3</text>
<rect x="160" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="95" font-size="12" text-anchor="middle" fill="currentColor">3,3</text>
<rect x="200" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="95" font-size="12" text-anchor="middle" fill="currentColor">4,3</text>
<rect x="40" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="55" font-size="12" text-anchor="middle" fill="currentColor">0,4</text>
<rect x="80" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="55" font-size="12" text-anchor="middle" fill="currentColor">1,4</text>
<rect x="120" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="55" font-size="12" text-anchor="middle" fill="currentColor">2,4</text>
<rect x="160" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="55" font-size="12" text-anchor="middle" fill="currentColor">3,4</text>
<rect x="200" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="55" font-size="12" text-anchor="middle" fill="currentColor">4,4</text>
<text x="140" y="252" font-size="13" text-anchor="middle" fill="currentColor">x →</text>
<text x="24" y="130" font-size="13" text-anchor="middle" fill="currentColor">y</text>
<text x="140" y="18" font-size="13" text-anchor="middle" fill="currentColor">25 lanes × 64 bits = 1,600 bits</text>
<text x="140" y="272" font-size="13" text-anchor="middle" class="acc-fill">a row: 5 lanes with the same y</text>
<text x="470" y="30" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">χ on one row, bit by bit</text>
<rect x="330" y="50" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="352" y="71.5" font-size="13" text-anchor="middle" fill="currentColor">A[0]</text>
<rect x="330" y="190" width="44" height="34" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="352" y="211.6" font-size="13" text-anchor="middle" fill="currentColor">A′[0]</text>
<rect x="386" y="50" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="408" y="71.5" font-size="13" text-anchor="middle" fill="currentColor">A[1]</text>
<rect x="386" y="190" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="408" y="211.6" font-size="13" text-anchor="middle" fill="currentColor">A′[1]</text>
<rect x="442" y="50" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="464" y="71.5" font-size="13" text-anchor="middle" fill="currentColor">A[2]</text>
<rect x="442" y="190" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="464" y="211.6" font-size="13" text-anchor="middle" fill="currentColor">A′[2]</text>
<rect x="498" y="50" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="71.5" font-size="13" text-anchor="middle" fill="currentColor">A[3]</text>
<rect x="498" y="190" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="211.6" font-size="13" text-anchor="middle" fill="currentColor">A′[3]</text>
<rect x="554" y="50" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="576" y="71.5" font-size="13" text-anchor="middle" fill="currentColor">A[4]</text>
<rect x="554" y="190" width="44" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="576" y="211.6" font-size="13" text-anchor="middle" fill="currentColor">A′[4]</text>
<polyline points="352,84 352,182" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="352,188 348,181.1 356,181.1" class="acc-fill"/>
<polyline points="408,84 368.2,182.4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="366,188 364.9,180.1 372.3,183.1" class="acc-fill"/>
<polyline points="464,84 376,183.5" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="372,188 373.6,180.2 379.6,185.5" class="acc-fill"/>
<text x="470" y="252" font-size="14" text-anchor="middle" fill="currentColor">A′[x] = A[x] ⊕ (¬A[x+1] ∧ A[x+2])</text>
<text x="470" y="274" font-size="13" text-anchor="middle" fill="currentColor">the only non-linear step</text>
</svg>
<figcaption>Figure 9.13. Left: Keccak-f[1600]'s state, a 5 × 5 grid of 64-bit lanes; one row is highlighted. Right: χ changes each bit using the next two bits along its row (shown for A′[0]). θ, ρ, π and ι are XOR, rotations and moves, so χ alone supplies the non-linearity.</figcaption>
</figure>

**Code it.** The whole of SHA-3 is short enough to write out. Even the round
constants come from a seven-bit shift register rather than a table:

```python
import hashlib

M64 = (1 << 64) - 1

def rotl(x, n):
    return (x << n | x >> (64 - n)) & M64

RC, r = [], 1                            # round constants from a tiny LFSR
for _ in range(24):
    c = 0
    for j in range(7):
        if r & 1:
            c |= 1 << (2 ** j - 1)
        r = (r << 1) ^ (0x171 if r & 0x80 else 0)
    RC.append(c)

ROT, x, y = [[0] * 5 for _ in range(5)], 1, 0    # rho offsets, walked by pi
for t in range(24):
    ROT[x][y] = (t + 1) * (t + 2) // 2 % 64
    x, y = y, (2 * x + 3 * y) % 5

def keccak_f(A):                         # A[x][y]: 25 lanes of 64 bits
    for rc in RC:
        C = [A[x][0] ^ A[x][1] ^ A[x][2] ^ A[x][3] ^ A[x][4] for x in range(5)]
        D = [C[x - 1] ^ rotl(C[(x + 1) % 5], 1) for x in range(5)]       # theta
        B = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                B[y][(2 * x + 3 * y) % 5] = rotl(A[x][y] ^ D[x], ROT[x][y])  # rho, pi
        A = [[B[x][y] ^ (~B[(x + 1) % 5][y] & B[(x + 2) % 5][y]) for y in range(5)]
             for x in range(5)]                                           # chi
        A[0][0] ^= rc                                                     # iota
    return A

def sponge(msg, rate, suffix, outlen):
    msg += bytes([suffix]) + bytes(-(len(msg) + 1) % rate)
    msg = msg[:-1] + bytes([msg[-1] | 0x80])                 # pad10*1
    A = [[0] * 5 for _ in range(5)]
    for i in range(0, len(msg), rate):                       # absorb
        for k in range(rate // 8):
            A[k % 5][k // 5] ^= int.from_bytes(msg[i + 8 * k:i + 8 * k + 8], "little")
        A = keccak_f(A)
    out = b""
    while len(out) < outlen:                                 # squeeze
        out += b"".join(A[k % 5][k // 5].to_bytes(8, "little") for k in range(rate // 8))
        A = keccak_f(A)
    return out[:outlen]

sha3_256 = lambda m: sponge(m, 136, 0x06, 32)
shake128 = lambda m, n: sponge(m, 168, 0x1f, n)

print(sha3_256(b"abc").hex())
print(sha3_256(b"abc") == hashlib.sha3_256(b"abc").digest())
print(shake128(b"abc", 300) == hashlib.shake_128(b"abc").digest(300))
```

```
3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532
True
True
```

**SHAKE.** The same sponge with a different domain byte (`1f`) and no fixed
length is an **extendable-output function** (XOF): SHAKE128 and SHAKE256 give
as many bytes as you ask for. The post-quantum standards ML-KEM and ML-DSA
([Chapter 21](21-Lattice-Cryptography.md)) use SHAKE to expand short seeds into
large matrices, which is now SHA-3's biggest job.

**The 2013 row.** In 2013 NIST proposed lowering the capacity of the standard
versions to speed them up. Coming months after the Snowden documents suggested the
NSA had planted a back door in a NIST random number generator (Dual_EC_DRBG), the proposal
met strong objections, even though the Keccak team said the change was sound.
NIST kept the original capacities. Trust in how standards are made turned out to
matter as much as the mathematics.

**Keccak-256 is not SHA3-256.** Ethereum adopted Keccak before FIPS 202 added
its domain byte, so Ethereum's "Keccak-256" uses suffix `01` and gives different
digests. Check which one a system means.

!!! note "Life story: SHA-3 (Keccak)"
    **Born:** 2008 as a competition entry by Bertoni, Daemen, Peeters and Van Assche; chosen by
    NIST on 2 October 2012; FIPS 202 (2015) · **Purpose:** a backup hash built on a different idea
    from SHA-2, so that one new attack could not break both · **Helped:** SHAKE and KMAC, the seed
    expansion inside ML-KEM and ML-DSA, and Ethereum (as pre-standard Keccak-256) · **Status:**
    current; slower than SHA-256 in software, so it is chosen mostly where its sponge features or
    its independence matter.

## 9.10 BLAKE2, BLAKE3 and hashes around the world

*Level: intermediate.*

**BLAKE2.** The finalist BLAKE, by Jean-Philippe Aumasson, Luca Henzen, Willi
Meier and Raphael Phan, lost to Keccak but impressed everyone with its speed
and safety margin. In December 2012 Aumasson, Samuel Neves, Zooko
Wilcox-O'Hearn and Christian Winnerlein released BLAKE2, with fewer rounds and
useful features built in: a key (making it a MAC on its own), a salt, a
personalization string and tree hashing. Its mixing function G is ChaCha's
quarter-round with message words added ([Chapter 5](05-Stream-Ciphers.md)).
BLAKE2b (64-bit words, up to 64-byte output) and BLAKE2s (32-bit words, up to
32 bytes) are in RFC 7693 and in Python's `hashlib`:

```python
import hashlib

print(hashlib.blake2b(b"abc", digest_size=32).hexdigest())
print(hashlib.blake2b(b"abc").hexdigest()[:64])
print(hashlib.blake2b(b"abc", key=b"secret").hexdigest()[:32])
# bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319
# ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1
# 204c828c56fbe6dfe80f110efd16649b
```

The 32-byte digest is *not* the first half of the 64-byte one: the output
length goes into the starting state, so each length is a separate function. A
SHA-2 truncation does not work that way. BLAKE2 runs inside Argon2
([Chapter 11](11-Passwords-and-Key-Derivation.md)), WireGuard, the Linux random
number generator and libsodium.

**BLAKE3** (Jack O'Connor, Aumasson, Neves and Wilcox-O'Hearn, January 2020)
cuts BLAKE2s to 7 rounds and arranges the input as a Merkle tree of 1 KiB
chunks, so all the cores of a machine can hash one file at once. It is one
function for hashing, MACs, key derivation and long output. It has no RFC or
NIST standard, and its 7 rounds are the thinnest margin of the hashes here; its
designers base that choice on years of attacks on BLAKE and BLAKE2 that never
got close.

!!! note "Life story: BLAKE2 and BLAKE3"
    **Born:** BLAKE in 2008 (a SHA-3 finalist), BLAKE2 in December 2012, BLAKE3 in January 2020,
    with Jean-Philippe Aumasson and Samuel Neves on all three teams · **Purpose:** a hash as safe as
    SHA-3 and faster than MD5 in software, with keys, salts and tree hashing built in ·
    **Helped:** Argon2, WireGuard, libsodium, the Linux random number generator and many
    file-sync and backup tools · **Status:** current; BLAKE2 is RFC 7693, BLAKE3 has no formal
    standard.

**National hashes.** Several countries standardize their own. China's SM3
(published by the State Cryptography Administration in 2010) is a 256-bit
Merkle-Damgård design in the SHA-2 style and is required in Chinese commercial
cryptography. Russia's Streebog (GOST R 34.11-2012, described in RFC 6986) has
256 and 512-bit versions built on an AES-like block cipher. Both are in the
international standard ISO/IEC 10118-3. Whirlpool (2000), by Vincent Rijmen of
Belgium and Paulo Barreto of Brazil, was chosen by the European NESSIE project.
RIPEMD-160 (1996), from a European research project, lives on in every Bitcoin
address. Public analysis of the national standards is thinner than for SHA-2
and SHA-3, simply because fewer people have studied them.

## 9.11 In the real world

**Where you meet hashes.**

- **Inside signatures.** Every RSA, ECDSA or Ed25519 signature signs a hash of
  the message ([Chapter 13](13-RSA.md), [Chapter 15](15-Elliptic-Curves.md)).
  A collision in the hash is a forgery of the signature.
- **Content addressing.** Git names every file and commit by its hash; so do
  IPFS and many backup tools. Change a byte and the name changes.
- **Merkle trees.** Hash the data in pairs, then the pairs of hashes, up to one
  root. One root vouches for millions of items, and proving one item needs only
  $\log_2$ of them. Bitcoin blocks, Certificate Transparency logs (RFC 6962)
  and BLAKE3 work this way. Hash-based signatures in
  [Chapter 22](22-Hash-and-Code-Based.md) are built from them too.
- **Building blocks.** HMAC and every MAC in [Chapter 10](10-Message-Authentication.md),
  HKDF and password hashing in [Chapter 11](11-Passwords-and-Key-Derivation.md),
  random generators, and proof-of-work all run on hashes.

<figure class="mars-fig">
<svg viewBox="0 0 660 270" width="660" role="img" aria-label="Merkle tree with eight leaves; to prove leaf d3 belongs to the root, give the three sibling hashes on its path">
<rect x="18" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="50" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d0)</text>
<rect x="98" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d1)</text>
<rect x="178" y="200" width="64" height="32" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="210" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d2)</text>
<rect x="258" y="200" width="64" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d3)</text>
<rect x="338" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d4)</text>
<rect x="418" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d5)</text>
<rect x="498" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d6)</text>
<rect x="578" y="200" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="610" y="220.6" font-size="13" text-anchor="middle" fill="currentColor">H(d7)</text>
<rect x="58" y="140" width="64" height="32" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="160.6" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="50" y1="200" x2="90" y2="172" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="200" x2="90" y2="172" stroke="currentColor" stroke-width="1.2"/>
<rect x="218" y="140" width="64" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="160.6" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="210" y1="200" x2="250" y2="172" stroke="currentColor" stroke-width="1.2"/>
<line x1="290" y1="200" x2="250" y2="172" stroke="currentColor" stroke-width="1.2"/>
<rect x="378" y="140" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="410" y="160.6" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="370" y1="200" x2="410" y2="172" stroke="currentColor" stroke-width="1.2"/>
<line x1="450" y1="200" x2="410" y2="172" stroke="currentColor" stroke-width="1.2"/>
<rect x="538" y="140" width="64" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="570" y="160.6" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="530" y1="200" x2="570" y2="172" stroke="currentColor" stroke-width="1.2"/>
<line x1="610" y1="200" x2="570" y2="172" stroke="currentColor" stroke-width="1.2"/>
<rect x="138" y="80" width="64" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="100.5" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="90" y1="140" x2="170" y2="112" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="140" x2="170" y2="112" stroke="currentColor" stroke-width="1.2"/>
<rect x="458" y="80" width="64" height="32" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="100.5" font-size="13" text-anchor="middle" fill="currentColor">H(·‖·)</text>
<line x1="410" y1="140" x2="490" y2="112" stroke="currentColor" stroke-width="1.2"/>
<line x1="570" y1="140" x2="490" y2="112" stroke="currentColor" stroke-width="1.2"/>
<rect x="298" y="20" width="64" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="330" y="40.5" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">root</text>
<line x1="170" y1="80" x2="330" y2="52" stroke="currentColor" stroke-width="1.2"/>
<line x1="490" y1="80" x2="330" y2="52" stroke="currentColor" stroke-width="1.2"/>
<text x="50" y="252" font-size="13" text-anchor="middle" fill="currentColor">d0</text>
<text x="130" y="252" font-size="13" text-anchor="middle" fill="currentColor">d1</text>
<text x="210" y="252" font-size="13" text-anchor="middle" fill="currentColor">d2</text>
<text x="290" y="252" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">d3</text>
<text x="370" y="252" font-size="13" text-anchor="middle" fill="currentColor">d4</text>
<text x="450" y="252" font-size="13" text-anchor="middle" fill="currentColor">d5</text>
<text x="530" y="252" font-size="13" text-anchor="middle" fill="currentColor">d6</text>
<text x="610" y="252" font-size="13" text-anchor="middle" fill="currentColor">d7</text>
<line x1="290" y1="236" x2="290" y2="240" stroke="currentColor" stroke-width="1.5"/>
</svg>
<figcaption>Figure 9.14. A Merkle tree over eight items. To prove that d3 is included, send the three accent hashes (its sibling at each level); the checker hashes upward and compares with the root. For a million items the proof is 20 hashes.</figcaption>
</figure>

**What to choose.**

| Need | Use |
|---|---|
| General hashing | SHA-256 (fast everywhere, hardware instructions on many CPUs) |
| Long-term or high-margin | SHA-384, SHA-512 or SHA3-256/512 |
| Variable-length output | SHAKE128 or SHAKE256 |
| Fast software hashing, keyed hashing | BLAKE2b or BLAKE3 |
| A key and a message | HMAC or KMAC, never a bare hash ([Chapter 10](10-Message-Authentication.md)) |
| Passwords | never a bare hash: Argon2id, scrypt ([Chapter 11](11-Passwords-and-Key-Derivation.md)) |
| Never for new work | MD5, SHA-1, MD4 |

**Standards.** FIPS 180-4 (SHA-1 and SHA-2), FIPS 202 (SHA-3 and SHAKE),
SP 800-185 (cSHAKE, KMAC, TupleHash), RFC 6234 (SHA-2 in C with test vectors),
RFC 7693 (BLAKE2). NIST has decided to revise FIPS 180-4 to remove SHA-1. The
full list with status is in the [hash functions table](../index.md#7-hash-functions),
and the reference pages hold every parameter:
[SHA-2](../07-hash/SHA-2.md), [SHA-3](../07-hash/SHA-3.md),
[BLAKE](../07-hash/BLAKE.md) and [retired hashes](../07-hash/Retired.md).

**Quantum computers.** Grover's algorithm ([Chapter 20](20-Quantum-Computers.md))
finds a preimage in about $2^{n/2}$ quantum steps, so SHA-256 keeps about 128 bits
of preimage security, which is enough. Quantum collision search is no better than
classical in practice. Hashes are the part of cryptography quantum computers
hurt least.

## 9.12 Going deeper

*Level: expert.*

??? abstract "The random oracle model, and what it promises"

    Many proofs (RSA-OAEP, Fiat-Shamir signatures) model the hash as a **random oracle**: a box that
    answers each new question with independent random bits. No real function is one; Canetti, Goldreich and
    Halevi showed in 1998 that there are (contrived) schemes secure with a random oracle and insecure with any
    real hash. Such a proof is still strong evidence, and attacks that exploit the gap have never hit a natural
    scheme. A Merkle-Damgård hash is visibly *not* a random oracle: length extension lets you predict
    $H(M \,\Vert\, \mathit{pad} \,\Vert\, X)$ from $H(M)$, which a random oracle never allows.

    **Indifferentiability** (Maurer, Renner and Holenstein, 2004) makes "behaves like a random oracle"
    precise for constructions. Coron, Dodis, Malinaud and Puniya (2005) showed plain Merkle-Damgård fails it
    and fixes such as chopping the output or a different last call pass it. The sponge with a random
    permutation is indifferentiable from a random oracle up to about $2^{c/2}$ queries (Bertoni, Daemen, Peeters
    and Van Assche, 2008). That is where the "$c/2$ bits of security" in §9.9 comes from.

??? abstract "Joux multicollisions: why concatenating hashes doesn't help"

    A natural idea is to combine two hashes: $H_1(M) \,\Vert\, H_2(M)$, with $n$ bits each, hoping for
    $2^n$ collision security. Antoine Joux showed in 2004 that for Merkle-Damgård hashes this fails.

    Find a collision on the first block: two choices $m_1, m_1'$ that lead to the same chaining value, at
    cost $2^{n/2}$. From there find another pair $m_2, m_2'$, and so on. After $k$ steps you have $2^k$
    different messages (choose either block at each step) that all collide, for only $k \cdot 2^{n/2}$ work.

    Now take $k = n/2$: $2^{n/2}$ messages that collide under $H_1$. Among them, by the birthday bound, two
    probably collide under $H_2$ as well. Total cost about $\frac{n}{2} \cdot 2^{n/2}$, barely more than breaking
    $H_1$ alone. For two 128-bit hashes that is about $64 \cdot 2^{64} = 2^{70}$, not $2^{128}$.

    The same idea leads to **second preimages for long messages** (Kelsey and Schneier, 2005: a $2^k$-block
    message gives a second preimage in about $2^{n-k}$ work) and **herding** (Kelsey and Kohno, 2006: commit to
    a digest first, then make any chosen prefix hash to it). They are why "$2^n$ second-preimage resistance" for
    Merkle-Damgård quietly assumes short messages, and they are part of why the SHA-3 competition wanted a new
    structure.

??? abstract "How differential attacks on MD5 and SHA-1 work"

    Write the compression function as $f(h, m)$. A differential attack looks for message pairs
    $m' = m \oplus \Delta$ such that the internal differences follow a planned path and vanish at the end:
    $f(h, m) = f(h, m')$. For MD5, Wang used a two-block attack: the first block pair produces a small,
    chosen difference in the chaining value, and the second cancels it.

    Each round of the path holds with some probability $p_t$, and the total is about $\prod_t p_t$. **Message
    modification** fixes the first 16 rounds, where each message word enters directly, by solving for the
    words that satisfy every condition. Later techniques (tunnels, Klima 2006; neutral bits, Biham and Chen
    2004; boomerangs) extend this into rounds 17 to 24 or so. What remains is paid for by trial.

    SHA-1's linear message expansion means that a difference in the message spreads in a predictable way, so
    attackers search for **local collisions** (a disturbance and its corrections over six steps) arranged by
    a low-weight codeword of the expansion. SHA-2's schedule is non-linear (the $\sigma$ functions mix
    additions and shifts) and the state is larger, which is why the best collision attacks on SHA-256
    reach 31 of 64 steps, with no practical attack on the full function.

    **Chosen-prefix** collisions need more work, because the starting difference is arbitrary. Stevens
    used a **birthday search** to bring the chaining-value difference into a form that a sequence of
    near-collision blocks can cancel. For MD5 that made chosen prefixes far costlier than identical ones; for
    SHA-1, by 2020, the chosen-prefix attack cost about $2^{63.4}$ against $2^{63.1}$ for the 2017
    identical-prefix collision, so the gap had almost closed.

??? abstract "Security margins, and the best attacks today"

    | Hash | Rounds | Best attacks on reduced rounds (approximate) |
    |---|---|---|
    | SHA-256 | 64 | practical collisions on 31 steps; preimages on about 45 with near-brute-force cost |
    | SHA-512 | 80 | collisions on about 28 steps |
    | SHA3-256 | 24 | practical collisions on 6 rounds |

    These are attacks on weakened versions; none threatens the full functions. The ratio of attacked rounds
    to full rounds is the **security margin**, and it is how cryptographers compare designs that no one can
    break. Exact figures move as papers appear; treat the table as orders of magnitude.

??? abstract "Generic attacks with less memory: Pollard's rho and parallel collision search"

    The birthday search in §9.2 stores every output, which for $2^{64}$ outputs is impossible. **Floyd's
    cycle-finding**, as in Pollard's rho, walks $x_{i+1} = H(x_i)$; the sequence must eventually repeat
    because the outputs are finite, and the point where two different inputs map to the same next value
    is a collision. It needs $O(2^{n/2})$ time and constant memory.

    Van Oorschot and Wiener (1994) made it parallel with **distinguished points**: many machines walk
    independent chains and report only outputs whose first bits are zero. When two chains hit the same
    distinguished point, they merged somewhere, and replaying them finds the collision. With $m$ machines the
    time drops to about $2^{n/2}/m$. This is the method behind real estimates of what a brute-force
    collision costs, and it is why the birthday bound, not memory, is the true limit.

## Check yourself

??? question "1. SHA-384 has a 384-bit output. What is the brute-force cost of a preimage, a second preimage and a collision?"

    $2^{384}$, $2^{384}$ and $2^{192}$. Collisions cost the square root because of the birthday bound.

??? question "2. A system gives each object a random 64-bit ID. About how many objects can it create before a repeated ID becomes a 50% risk?"

    $1.18 \cdot 2^{32} \approx 5.1$ billion. Random IDs need twice as many bits as the number of items you
    might ever have, in powers of two. That is why UUIDs carry 122 random bits.

??? question "3. Which property does each of these need: (a) storing a hash of a file to detect later tampering by someone else, (b) a certificate authority signing hashes of certificate requests that customers write, (c) committing to a guess by publishing its hash?"

    (a) Second-preimage resistance: the file exists, and an attacker needs another with the same hash.
    (b) Collision resistance: the customer writes the request, so they could prepare two colliding ones,
    exactly the 2008 rogue CA attack. (c) Preimage resistance, so nobody learns the guess, and collision
    resistance, so you cannot later open it two ways. (A guess from a small set also needs a random value
    mixed in, or anyone can hash every possible guess.)

??? question "4. A web site gives out download links of the form `?file=report.pdf&sig=SHA256(secret || \"file=report.pdf\")`. What can an attacker do?"

    Length extension. Knowing the signature and guessing the secret's length, they can compute a valid
    signature for `file=report.pdf` + padding + `&file=../../etc/passwd` or any other ending, without the
    secret. The fix is HMAC ([Chapter 10](10-Message-Authentication.md)).

??? question "5. Is SHA-512/256 open to length extension? Is SHA3-256?"

    No to both. SHA-512/256 outputs only 256 of its 512 state bits, so the attacker cannot restart from the
    digest (they would have to guess the other 256 bits). SHA3-256 never outputs its 512 capacity bits.

??? question "6. MD5 collisions take seconds. Why is HMAC-MD5 still not practically forgeable, and why should you still not choose it?"

    HMAC's security rests on the compression function behaving like a pseudorandom function with a secret
    key, which is closer to preimage resistance than to collision resistance, and no attack has turned MD5's
    collisions into HMAC forgeries. But a broken hash leaves no margin, auditors and standards reject it,
    and SHA-256 costs almost nothing more.

??? question "7. Find a collision in the first 32 bits of SHA-256 by computer. How many tries did it take, and how does that compare with the birthday estimate?"

    ```python
    import hashlib

    seen, n = {}, 0
    while True:
        h = hashlib.sha256(str(n).encode()).digest()[:4]    # first 32 bits
        if h in seen:
            break
        seen[h] = n
        n += 1
    print(seen[h], n, h.hex())
    # 69235 95303 c11eb5e6
    ```

    The strings "69235" and "95303" share the first 32 bits `c11eb5e6`, found after 95,304 tries. The estimate
    $1.18 \cdot 2^{16} \approx 77{,}000$ is the 50% point, so this run was a little unlucky, as with the 24-bit example.

??? question "8. A sponge has a 1,600-bit state. If you want 256-bit collision security, what capacity do you need, and what rate is left?"

    Two limits apply: the capacity gives at most $c/2$ bits, and an $n$-bit output gives at most $n/2$ bits
    by the birthday bound. So you need $c \ge 512$ and an output of at least 512 bits. A capacity of 512
    leaves a rate of $1600 - 512 = 1088$ bits. FIPS 202's SHA3-512 is more cautious: it uses $c = 1024$ (to
    give 512-bit preimage resistance too), which leaves a rate of only 576 bits and makes it slower.

??? question "9. You concatenate MD5 and SHA-1 for a 288-bit digest, as SSL 3.0 and TLS 1.0 did in places. Using Joux's result, roughly how much work is a collision?"

    Build $2^{80}$ MD5 multicollisions with 80 MD5 collisions (seconds each), then birthday-search among them
    for a SHA-1 collision, about $2^{80}$ SHA-1 work by brute force, or much less using SHA-1's own weaknesses.
    So the pair is about as strong as SHA-1 alone, far below the $2^{144}$ the length suggests.

??? question "10. Why does SHA-256 add the start state back after the 64 rounds (the feed-forward)? What would go wrong without it?"

    Without it the compression function is $E_m(h)$, a block cipher with the message as key. Anyone can pick
    any target output $y$ and any block $m$ and compute $h = E_m^{-1}(y)$, so they can run the chain backwards
    and find preimages easily for a chosen chaining value, which turns into meet-in-the-middle preimages of
    the whole hash in about $2^{n/2}$ work. With $f(h, m) = E_m(h) + h$, inverting needs both $h$ and the
    output to match, and that is as hard as a generic preimage.

## What you learned

- A hash has no key; its strength is that nobody can find preimages, second
  preimages or collisions. Collisions are the easiest, at $2^{n/2}$ by the
  birthday bound, so a 128-bit security level needs a 256-bit digest.
- Merkle-Damgård chains a compression function; a collision of the hash gives a
  collision of the compression function. Its digest is its full state, which
  causes length extension: never use $H(\mathit{key} \,\Vert\, m)$ as a MAC.
- MD5 and SHA-1 fell to differential collision attacks (Wang, 2004 and 2005),
  then in practice: the rogue CA (2008), Flame (2012), SHAttered (2017).
  Preimages held. Collisions are enough to forge signatures.
- SHA-2 is the everyday choice and has held for 25 years. SHA-3 is a sponge,
  unrelated in design, with no length extension and with SHAKE for any output
  length. BLAKE2 and BLAKE3 are fast alternatives without NIST status.
- Hashes are the base layer for signatures, MACs, key derivation, password
  storage, Merkle trees and post-quantum schemes.

**Next:** [Chapter 10](10-Message-Authentication.md) adds a key to the hash and
asks how to stop an attacker from changing encrypted messages.

## Further reading

- Bart Preneel, "Analysis and Design of Cryptographic Hash Functions" (PhD thesis, KU Leuven, 1993): the
  classic survey of the field before MD5 fell.
- Ralph Merkle, "One Way Hash Functions and DES", and Ivan Damgård, "A Design Principle for Hash
  Functions", both CRYPTO '89.
- Gideon Yuval, "How to Swindle Rabin", *Cryptologia* 3(3), 1979.
- Xiaoyun Wang and Hongbo Yu, "How to Break MD5 and Other Hash Functions", EUROCRYPT 2005; Wang, Yin and
  Yu, "Finding Collisions in the Full SHA-1", CRYPTO 2005.
- [Stevens, Bursztein, Karpman, Albertini and Markov, "The first collision for full SHA-1" (CRYPTO 2017)](https://eprint.iacr.org/2017/190);
  [Leurent and Peyrin, "SHA-1 is a Shambles" (USENIX Security 2020)](https://sha-mbles.github.io/).
- Antoine Joux, "Multicollisions in Iterated Hash Functions", CRYPTO 2004.
- [The Keccak team's site](https://keccak.team/keccak.html), including "Cryptographic Sponge Functions";
  FIPS 202; FIPS 180-4.
- [NIST IR 7896, the third-round report of the SHA-3 competition (2012)](https://nvlpubs.nist.gov/nistpubs/ir/2012/NIST.IR.7896.pdf).
- RFC 7693 (BLAKE2) and [the BLAKE3 paper](https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf).
- Jean-Philippe Aumasson, *Serious Cryptography* (2nd ed., No Starch, 2024), chapter 6, for a second
  explanation from one of BLAKE's designers.
- Appendix: [the history of the internet era](../history/08-Internet-Era.md), which places these breaks among
  the other events of the time.
