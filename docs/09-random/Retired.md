# Retired random generators

*Mersenne Twister, C's `rand()`, RC4-based `arc4random` and Dual_EC_DRBG:
why none of them should make a secret, and three times weak randomness
gave keys away.*

**Status and standards:** see [Random number generation](../index.md#9-random-number-generation)
in the main table.

A generator is no good for secrets if its output gives away its state
(Mersenne Twister, `rand()`), if its output is biased (RC4), or if someone
may hold a key to it (Dual_EC_DRBG). The famous failures at the end are a
fourth kind: a sound generator with a guessable seed. For anything secret
use the [OS generator](OS-RNG.md).

## Mersenne Twister

**What it is.** MT19937, from Makoto Matsumoto and Takuji Nishimura
(announced October 1997, published in ACM TOMACS in January 1998). Its
state is 624 words of 32 bits and its period is 2¹⁹⁹³⁷ − 1. It is the
generator behind Python's `random`. Its authors say it is for Monte Carlo
simulation and not cryptographically secure as it stands.

**Why it fails.** Each output is one state word run through "tempering",
four shift-and-XOR steps that are easy to undo. Every 624 outputs the
state is mixed into the next 624 words. So 624 outputs in a row give you
the whole state, and from there every later output. Python seeds `random`
from `os.urandom` by default, but that doesn't help, because the attack
never needs the seed.

This takes 624 outputs of `getrandbits(32)`, undoes the tempering, loads
the state into a second generator and predicts what comes next:

```python
import random

def unshift_right(y, s):
    x = y
    for _ in range(32 // s):
        x = y ^ (x >> s)
    return x

def unshift_left(y, s, mask):
    x = y
    for _ in range(32 // s):
        x = y ^ ((x << s) & mask)
    return x

def untemper(y):                     # MT19937's tempering, backwards
    y = unshift_right(y, 18)
    y = unshift_left(y, 15, 0xefc60000)
    y = unshift_left(y, 7, 0x9d2c5680)
    return unshift_right(y, 11)

victim = random.Random()             # seeded from the OS; we never see the seed
seen = [victim.getrandbits(32) for _ in range(624)]

clone = random.Random()
clone.setstate((3, tuple(untemper(y) for y in seen) + (624,), None))
print(clone.getrandbits(32) == victim.getrandbits(32))     # True: the next output
print(clone.getrandbits(128) == victim.getrandbits(128))   # True: a 128-bit "token"
```

**Where you still see it.** In Python's `random`, as the default generator
of many other languages, and in simulation code. Fine there; never for
tokens, passwords or keys.

## C rand()

**What it is.** The C standard's generator. `rand()` returns a number from
0 to `RAND_MAX`, which can be as small as 32767, and `srand()` takes an
`unsigned int` seed. The standard's sample code is a linear congruential
generator, `next = next * 1103515245 + 12345`, returning
`(next / 65536) % 32768`. A footnote warns that the standard promises
nothing about quality and that some versions have poor low-order bits.

**Why it fails.** There are at most 2³² seeds, and code often calls
`srand(time(NULL))`, so an attacker only has to try each second in a
likely window. With an LCG like the sample one, a few outputs are enough to
pin down the state outright.

**Where you still see it.** Old C code, games, and "random" passwords from
quick scripts. Use `getrandom()` or `arc4random_uniform()`.

## RC4-based arc4random

**What it was.** `arc4random` first appeared in OpenBSD 2.1 (1997): an RC4
keystream inside each process, keyed from the kernel. FreeBSD picked it up
in 2.2.6, and Apple's libc took it from FreeBSD.

**What retired it.** [RC4's biases](../04-symmetric-ciphers/Retired.md#rc4),
worst in the first bytes of the stream. OpenBSD replaced RC4 with ChaCha20
on 1 October 2013 and shipped it in OpenBSD 5.5 (May 2014). macOS switched
to AES in 10.12 (2016), and FreeBSD to ChaCha20 in 12.0 (2018). glibc
added `arc4random` only in 2.36 (2022), as a wrapper around `getrandom()`.

**Where you still see it.** In the name. `arc4random` is now a good call
to make; only old OpenBSD, FreeBSD and macOS releases still run RC4 behind
it.

## Dual_EC_DRBG

**What it was.** One of the four generators in NIST SP 800-90 (2006),
and the only one built on elliptic curves. Its constant point Q came with no
explanation, and whoever knows the discrete log linking it to P can
predict all output from about 32 bytes of it. NIST pulled it in 2014, after
the 2013 reports. The full story is under
[NIST DRBG](NIST-DRBG.md#dual_ec_drbg).

**Where you still see it.** Nowhere new. In 2015 someone was found to have
replaced Q in Juniper's ScreenOS firewalls, which let them decrypt VPN
traffic.

## Famous failures

### Debian OpenSSL (2008)

In September 2006 a Debian maintainer commented out two lines in OpenSSL's
`md_rand.c` to silence Valgrind warnings. One of them was the line that
mixed seed data into the pool. From then on the generator was seeded by
the process ID alone, which on Linux is at most 32,768, so each
architecture, key type and size had only about 32,767 possible keys.

Luciano Bello found it, and Debian and Ubuntu announced it on 13 May 2008
(DSA-1571, USN-612-1, CVE-2008-0166). The broken package reached Debian
unstable on 17 September 2006 and spread from there to the stable release
and to Ubuntu. Every SSH, OpenVPN, DNSSEC and TLS key made with it came
from a list small enough to precompute. Worse, any DSA key used on an
affected machine had to be treated as compromised, even if it was
generated elsewhere, because each
[DSA signature](../02-signatures/DSA.md#the-k-problem) needs a fresh
random value too.

### Mining your Ps and Qs (2012)

Heninger, Durumeric, Wustrow and Halderman scanned the whole IPv4 internet
for TLS and SSH keys. Two RSA moduli that share one prime are both broken
by a single gcd, and a fast all-pairs gcd over millions of keys found
plenty of them. That happens when two devices start key generation from
the same pool state and then diverge before the second prime. They got the
[RSA](../02-signatures/RSA.md) private keys of 0.50% of TLS hosts and 0.03%
of SSH hosts, and DSA keys of 1.03% of SSH hosts from repeated signature
randomness.

Almost all were headless or embedded devices, such as routers and
firewalls. They made their keys at first boot, before Linux's generator had
collected enough entropy: what the paper called a boot-time entropy hole.
`getrandom()` (2014) waits through that window; reading `/dev/urandom`
didn't.

### Android SecureRandom (2013)

On 11 August 2013 bitcoin.org warned that every Bitcoin wallet created on
an Android device was at risk. Android's Java `SecureRandom` hadn't been
seeded properly, and some wallet signatures were seen sharing the same
ECDSA nonce. Two signatures with one nonce give away the
[private key](../02-signatures/ECDSA.md#the-k-problem), and coins were
stolen. Bitcoin Wallet, blockchain.info, BitcoinSpinner and Mycelium
shipped fixes, and users had to move their coins to new keys. Three days
later Google said apps using the Java Cryptography Architecture "may not
receive cryptographically strong values" and published a fix that seeds the
generator from `/dev/urandom`.

## See also

- [OS random number generators](OS-RNG.md): what to use instead
- [NIST DRBG](NIST-DRBG.md): the standard generators, and Dual_EC_DRBG's
  full story
- [Retired ciphers](../04-symmetric-ciphers/Retired.md#rc4): RC4 itself
- [ECDSA](../02-signatures/ECDSA.md#the-k-problem): why one repeated nonce
  is fatal

## References

- Matsumoto and Nishimura, "Mersenne Twister: A 623-Dimensionally Equidistributed Uniform Pseudo-Random Number Generator" (ACM TOMACS 8(1), 1998) / [Mersenne Twister home page](http://www.math.sci.hiroshima-u.ac.jp/m-mat/MT/emt.html) / [Python `random`](https://docs.python.org/3/library/random.html)
- [ISO/IEC 9899:2011 draft N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) (Section 7.22.2)
- [OpenBSD `arc4random(3)`](https://man.openbsd.org/arc4random.3) / [OpenBSD commit "replace rc4 with ChaCha20" (2013)](https://github.com/openbsd/src/commit/90c1fad70a3483c2c72c3c90acf438a5f235c776) / [FreeBSD `arc4random(3)`](https://man.freebsd.org/cgi/man.cgi?query=arc4random&sektion=3) / [Apple Libc `arc4random.3`](https://github.com/apple-oss-distributions/Libc/blob/main/gen/FreeBSD/arc4random.3) / [glibc 2.36 NEWS](https://sourceware.org/git/?p=glibc.git;a=blob;f=NEWS;hb=glibc-2.36)
- [Shumow and Ferguson, "On the Possibility of a Back Door in the NIST SP800-90 Dual Ec Prng" (CRYPTO 2007 rump session)](https://rump2007.cr.yp.to/15-shumow.pdf) / [Checkoway et al., "A Systematic Analysis of the Juniper Dual EC Incident" (CCS 2016)](https://eprint.iacr.org/2016/376)
- [Debian DSA-1571-1: openssl predictable random number generator (2008)](https://www.debian.org/security/2008/dsa-1571) / [Ubuntu USN-612-1](https://ubuntu.com/security/notices/USN-612-1) / [Debian wiki: SSLkeys](https://wiki.debian.org/SSLkeys)
- [Heninger, Durumeric, Wustrow and Halderman, "Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network Devices" (USENIX Security 2012)](https://factorable.net/paper.html)
- [bitcoin.org, "Android Security Vulnerability" (11 August 2013)](https://bitcoin.org/en/alert/2013-08-11-android) / [Klyubin, "Some SecureRandom Thoughts" (Android Developers Blog, 14 August 2013)](https://android-developers.googleblog.com/2013/08/some-securerandom-thoughts.html) / Mike Hearn, "Android key rotation", bitcoin-development list (11 August 2013)
