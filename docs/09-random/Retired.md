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
state is 624 words of 32 bits and its period is $2^{19937} - 1$. It is the
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

**Why it fails.** There are at most $2^{32}$ seeds, and code often calls
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
and the only one built on elliptic curves. Its constant point $Q$ came with no
explanation, and whoever knows the discrete log linking it to $P$ can
predict all output from about 32 bytes of it. NIST pulled it in 2014, after
the 2013 reports. The full story is under
[NIST DRBG](NIST-DRBG.md#dual_ec_drbg).

**Where you still see it.** Nowhere new. In 2015 someone was found to have
replaced $Q$ in Juniper's ScreenOS firewalls, which let them decrypt VPN
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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: C's sample rand() and one shared prime"

    **The C standard's sample generator** with `srand(1)`:

    | Call | $\mathit{next} = \mathit{next} \cdot 1103515245 + 12345 \bmod 2^{32}$ | $\mathrm{rand}() = (\mathit{next} / 65536) \bmod 32768$ |
    |---|---|---|
    | 1 | 1,103,527,590 | 16,838 |
    | 2 | 2,524,885,223 | 5,758 |
    | 3 | 662,824,084 | 10,113 |
    | 4 | | 17,515 |
    | 5 | | 31,051 |

    Each output shows 15 of the state's 32 bits, so trying the other $2^{17}$ possibilities against the next
    output finds $\mathit{next}$ at once, and then every later number.

    **Two keys that share a prime**, in toy sizes: $n_1 = 3233 = 61 \times 53$ and $n_2 = 3599 = 61 \times 59$. At real sizes neither
    could be factored alone, but $\gcd(3233, 3599) = 61$ takes a few divisions, and then
    $3233 / 61 = 53$ and $3599 / 61 = 59$. This is the 2012 attack on real 1024-bit keys.

??? abstract "The math, with formulas"

    - **Linear congruential generator:** $x(n+1) = (a \cdot x(n) + c) \bmod m$. Full period when $c$ and $m$ are coprime,
      $a - 1$ is divisible by every prime factor of $m$, and by 4 if $m$ is. Low bits are weak: modulo $2^k$ the
      lowest $k$ bits repeat with period $2^k$.
    - **Mersenne Twister:** a linear recurrence over $\mathrm{GF}(2)$, $x(k+n) = x(k+m) \oplus (\mathrm{upper}(x(k)) \,\Vert\, \mathrm{lower}(x(k+1))) \cdot A$
      with $n = 624$, $m = 397$, then tempering $y \mathrel{\oplus=} y \gg 11$; $y \mathrel{\oplus=} (y \ll 7) \mathbin{\&} \mathtt{9d2c5680}$;
      $y \mathrel{\oplus=} (y \ll 15) \mathbin{\&} \mathtt{efc60000}$; $y \mathrel{\oplus=} y \gg 18$. Every step is linear, so 624 outputs give 19,968 linear equations for the 19,937 state bits.
    - **Euclid's algorithm:** $\gcd(a, b) = \gcd(b, a \bmod b)$, about $\log$ steps, which is why one shared prime
      exposes both keys.
    - **ECDSA nonce reuse:** two signatures $s_1, s_2$ with the same $r$ give
      $k = (z_1 - z_2) / (s_1 - s_2)$ and then $d = (s_1 k - z_1) / r$, all mod $n$.

??? tip "Watch it step by step: cloning Mersenne Twister"

    <div class="mars-steps" markdown>

    1. A server hands out 624 "random" 32-bit numbers from Python's `random`.
    2. Undo the tempering on each: four shift-and-XOR steps, each easy to reverse.
    3. That gives the generator's 624 state words exactly.
    4. Load them into a fresh generator.
    5. Ask it for the next number: it matches the server's, and so does every one after.
    6. A "random" reset token or session ID made this way can now be predicted.

    </div>

??? info "The math underneath"

    - **Statistical versus cryptographic randomness:** passing statistical tests (equidistribution, long
      period) says nothing about predictability.
    - **Linear algebra over $\mathrm{GF}(2)$:** any generator whose state update and output are linear can be solved
      from enough outputs (Berlekamp–Massey for LFSRs).
    - **Seed space:** a 32-bit seed or a time-based seed limits the attacker's search to at most $2^{32}$
      possibilities, whatever the period.
    - **Shared factors and batch gcd:** product and remainder trees find shared primes among millions of
      keys at once; see [RSA](../02-signatures/RSA.md).
    - What to use instead: [OS randomness](OS-RNG.md) and [NIST DRBGs](NIST-DRBG.md).

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
