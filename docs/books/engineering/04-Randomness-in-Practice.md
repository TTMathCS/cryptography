# 4. Randomness in Practice

*Every key, nonce, salt and token in a program comes from a random number
generator, and more systems have been broken through their random numbers than
through their ciphers. The cure is short to state: ask the operating system.
This chapter is about everything around that sentence: which call to make on
each platform and what it does when the machine has just booted, why a forked
process or a restored virtual machine can hand out the same bytes twice, how to
build a standards-conforming generator for the rare device that needs its own
(HMAC_DRBG, checked against a NIST test vector), how to watch a hardware noise
source with the health tests a certified module must run, and how to choose
nonces that never repeat. It ends on Mars, with a rover that must make its
first keys alone, with no network and a sensor still frozen from the night.*

!!! abstract "In this chapter"
    **You will learn:**

    - which system call or library function to use for random bytes on Linux,
      the BSDs, macOS and Windows, and how each behaves at early boot;
    - how fork, virtual machine snapshots and clones copy a generator's state,
      and how to make user-space code safe against it;
    - why Python's `random` must never make a secret, and what `secrets` does
      instead;
    - how HMAC_DRBG from SP 800-90A Rev. 1 works as a complete component
      (instantiate, generate, reseed, limits), checked against NIST's
      validation vectors;
    - how an entropy source is built and watched (SP 800-90B), with the
      repetition count and adaptive proportion tests coded from the
      standard's formulas;
    - when a nonce must be unique, unpredictable or secret, and where the
      $2^{32}$-message limit on random 96-bit GCM nonces comes from.

    **You need:** book 1 [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)
    (entropy and min-entropy, the birthday bound, and §4.9 and §4.10 on where
    random numbers come from and how they failed), HMAC from book 1
    [Chapter 10](../../book/10-Message-Authentication.md), and
    [Chapter 1](01-What-Cryptographic-Engineering-Is.md) of this book.

    **Levels:** §4.1 to §4.4 are for beginners, §4.5 to §4.9 are intermediate,
    §4.10 is expert.

## 4.1 The problem

*Level: beginner.*

Late in the development of Linux 5.3, in September 2019, a developer named
Ahmed Darwish found that his laptop no longer finished booting. A filesystem
change had made ext4 read the disk more efficiently, so the machine did less
disk work during boot, which meant fewer interrupts, and interrupt timing was
one of the main things the kernel's random generator fed on. The login
manager called `getrandom()` early in boot, as it should. The call waited for
the generator to be seeded, the generator waited for entropy, and the entropy
never came, because the machine sat quietly waiting for the login manager.
After weeks of argument on the kernel mailing list, Linux 5.4 did something
the kernel had resisted for years: if nothing else arrives, it now makes its
own entropy at boot by timing its own execution against the CPU's cycle
counter, a "jitter" source. It usually takes about a second.

Seven years earlier the opposite failure had been measured across the whole
Internet. In 2012 two teams examined the public keys of millions of TLS and SSH
servers and found tens of thousands of RSA keys that shared a prime factor with
another key, which lets anyone factor both with one gcd. Almost all belonged to
routers, firewalls and other small devices that had made their keys at first
boot from a generator that had not yet been seeded, and that did not wait.

Those two stories are the two walls of the corridor an engineer walks down: a
program that asks too early, or from the wrong place, gets numbers an attacker
can guess, and a program that insists on waiting can hang a machine forever.
Python met the second wall in May 2016, when a script run early in a Debian
boot held the boot up because the interpreter read random bytes at start-up to
randomize its hash tables; the outcome was PEP 524, under which `os.urandom`
waits for the kernel generator but Python's own start-up does not.

Figure 4.1 shows the path a random byte takes from a noisy piece of hardware
to the line of your code that uses it, and what has gone wrong at each step.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="The layers a random byte passes through, from noise sources to the kernel pool, the kernel generator, the system call, the library and the application, with a real failure at each layer" fill="currentColor" font-size="14">
<text x="160" y="16" text-anchor="middle" font-weight="bold">layer</text>
<text x="490" y="16" text-anchor="middle" font-weight="bold">what has gone wrong here</text>
<rect x="20" y="28" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="53" text-anchor="middle">noise sources: interrupts, jitter, TRNG</text>
<line x1="160" y1="68" x2="160" y2="82" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,86 156,78 164,78"/>
<rect x="20" y="86" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="111" text-anchor="middle">kernel input pool (hashed)</text>
<line x1="160" y1="126" x2="160" y2="140" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,144 156,136 164,136"/>
<rect x="20" y="144" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="160" y="169" text-anchor="middle" font-weight="bold">kernel generator (ChaCha20, CTR_DRBG)</text>
<line x1="160" y1="184" x2="160" y2="198" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,202 156,194 164,194"/>
<rect x="20" y="202" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="227" text-anchor="middle">system call: getrandom, ProcessPrng</text>
<line x1="160" y1="242" x2="160" y2="256" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,260 156,252 164,252"/>
<rect x="20" y="260" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="285" text-anchor="middle">library: secrets, arc4random, OpenSSL</text>
<line x1="160" y1="300" x2="160" y2="314" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,318 156,310 164,310"/>
<rect x="20" y="318" width="280" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="343" text-anchor="middle">your code: keys, nonces, tokens, IDs</text>
<line x1="300" y1="48" x2="340" y2="48" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="44">stuck hardware: Taiwan cards (2013),</text>
<text x="346" y="60">AMD RDRAND returning all ones (2019)</text>
<line x1="300" y1="106" x2="340" y2="106" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="102">read before it was seeded:</text>
<text x="346" y="118">shared primes in routers (2012)</text>
<line x1="300" y1="164" x2="340" y2="164" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="160">a back door: Dual_EC, Juniper (2015);</text>
<text x="346" y="176">state copied by a VM snapshot</text>
<line x1="300" y1="222" x2="340" y2="222" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="218">no /dev in a chroot, so the code</text>
<text x="346" y="234">fell back to the clock</text>
<line x1="300" y1="280" x2="340" y2="280" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="276">entropy removed: Debian (2006-2008);</text>
<text x="346" y="292">state copied on fork: Android (2013)</text>
<line x1="300" y1="338" x2="340" y2="338" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="346" y="334">wrong generator, repeated nonce:</text>
<text x="346" y="350">PlayStation 3 (2010), GCM (2016)</text>
</svg>
<figcaption>Figure 4.1. The path of a random byte. Each layer trusts the one above it, and each has failed in a real product. An application controls only the bottom two layers, which is why its first rule is to take its bytes from the operating system and add nothing of its own.</figcaption>
</figure>

!!! note "Life story: the 2019 boot hang"
    **Born:** September 2019, reported by Ahmed Darwish against a Linux 5.3
    release candidate, after an ext4 change cut boot-time disk activity and
    left `getrandom()` in the login manager waiting for entropy that never
    came · **Purpose:** none; a clash between a correct blocking call and a
    machine with too few entropy events at boot · **Helped:** the kernel's
    boot-time jitter entropy routine (Linux 5.4, 2019), so that waiting for
    seeding takes about a second on machines with a cycle counter; a lasting
    lesson that "block until seeded" needs a source that is guaranteed to
    arrive · **Status:** fixed; the same routine now also seeds the generator
    when `/dev/urandom` is read before seeding (Linux 5.18, 2022)

## 4.2 How randomness fails: the stories in brief

*Level: beginner.*

The failures that taught the field these rules are told in full in
Cryptanalysis [Chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md),
with the attacks coded. Here each gets one paragraph and the engineering lesson
it left. Book 1 [§4.10](../../book/04-Randomness-and-Perfect-Secrecy.md#410-famous-failures)
sorts them into four kinds: a generator whose output reveals its state, a
sound generator with a guessable seed, a seed with no entropy, and a generator
someone holds a key to. Engineering adds three more: a state that gets copied,
a source that dies, and a nonce that repeats.

**Netscape (1995): a seed you could guess.** Ian Goldberg and David Wagner
found that Netscape Navigator seeded its SSL keys from the time of day and two
process IDs, searchable in under a minute. The lesson: seeding is a system
service, not something each application improvises. [§18.2](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#182-netscape-1995-a-seed-you-could-guess).

**Debian (2006 to 2008): a seed with nothing in it.** A Debian maintainer
commented out two lines of OpenSSL that a memory checker complained about. One
of them was the line that mixed entropy into the generator, so for twenty
months every key made with OpenSSL on Debian and Ubuntu depended only on the
process ID: 32,767 possibilities per key type and architecture. Luciano Bello
found it in May 2008. The lesson: cryptographic changes go upstream for
review, and a generator needs a test that fails when its input stops
mattering.
[§18.3](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#183-debian-2006-to-2008-a-seed-with-nothing-in-it).

**Mining your Ps and Qs (2012): a seed that came too early.** Heninger,
Durumeric, Wustrow and Halderman, and separately Lenstra and colleagues, found
that small devices generating keys at first boot often shared primes. They
computed the private keys of 0.50% of the TLS hosts and 0.03% of the SSH hosts
they scanned through shared factors, and the DSA keys of 1.03% of the SSH
hosts through repeated signature nonces. The lesson is `getrandom()`: an interface that
waits, once, until the kernel is seeded.
[§18.5](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#185-shared-primes-across-the-internet).

**PlayStation 3 (2010): a nonce that was a constant.** Sony's code signed
every PlayStation 3 update with the same ECDSA nonce, and the fail0verflow
group solved two equations for the private key in December 2010. The lesson:
a signature should not depend on the generator at signing time
(deterministic nonces, RFC 6979, or EdDSA).
[§14.4](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md#144-the-playstation-3-key).

**Android (2013): a state copied at birth.** In August 2013 Bitcoin wallets on
Android were found to repeat ECDSA nonces, and coins were stolen. The Java
`SecureRandom` was badly initialized, and every app starts as a fork of one
parent process, the Zygote, so apps could inherit the same native generator
state. The lesson, a central one for §4.5: a process that forks copies its
user-space generator.
[§18.7](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#187-android-2013-the-wallets-that-repeated-themselves).

**Taiwan's citizen cards (2013): a hardware source that died.** Bernstein,
Heninger, Lange and colleagues factored 184 RSA keys from smart cards that
had passed FIPS 140-2 and Common Criteria evaluations; the primes had long
runs of repeated bits, as if the hardware generator had stuck. The lesson is
the health tests of §4.7, run continuously and acted on.
[§18.6](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#186-batch-gcd-millions-of-keys-at-once).

**Dual_EC_DRBG and Juniper (2006 to 2015): a generator with a key.** One of
the four generators in the 2006 SP 800-90 hid a trapdoor: whoever knew the
discrete logarithm relating its two constants could predict its output from 32
bytes. NIST withdrew it after the 2013 Snowden reports, and in 2015 Juniper
found that someone had replaced the constant in its firewalls. The lesson:
use generators whose constants have explanations, and treat the generator as
the most valuable place in a system to hide a back door.
[§18.9](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#189-dual_ec_drbg-the-story)
and [§18.11](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#1811-juniper-someone-elses-q).

**ROCA (2017): a shortcut in key generation.** Infineon's library built RSA
primes from a small structured family to save time, which made keys
recognizable and, at common sizes, factorable; about 750,000 Estonian ID cards
were affected. Not a generator failure strictly, but the same lesson: key
generation must use a good generator's full output, not a shortcut.
[§18.8](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#188-roca-primes-with-a-fingerprint).

**AMD's RDRAND (2019): an instruction that returned all ones.** In July 2019
new AMD Ryzen 3000 processors returned `0xFFFFFFFF` from every `RDRAND` until
a firmware update, and some Linux systems that used the instruction directly
would not boot. Systems that mixed it with other sources, as the Linux kernel
does, lost nothing. The lesson: never trust one source alone.
[§18.13](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#1813-what-good-practice-is-today).

**What to do.**

- Use the list as design-review questions: where does the seed come from,
  can the state be copied, what happens before seeding, what if the hardware
  source dies, can a nonce repeat?
- When a vendor says its generator is certified, ask what the health tests do
  on failure. The Taiwan cards were certified.

## 4.3 Ask the operating system

*Level: beginner.*

The operating system is the right source for three reasons. It sees every
entropy event on the machine. It keeps the generator's state in kernel memory,
where other processes cannot read it and forks and core dumps do not copy it.
And it is maintained, and patched, by people who work on exactly this problem.
An application that gathers or "improves" its own entropy repeats Netscape's
and Debian's mistakes. The site's
[OS random number generators](../../09-random/OS-RNG.md) page describes the
generators themselves; this section is about calling them correctly.

### Linux: `getrandom()`

Theodore Ts'o's 1994 driver gave Linux two device files. `/dev/random` kept
an estimate of the entropy in its pool, subtracted from it on every read, and
blocked when the estimate ran low. `/dev/urandom` never blocked, not even
before the pool had been seeded. Both were wrong: `/dev/random` blocked running
systems for no reason, since a seeded generator's output does not weaken as it
is read, and `/dev/urandom` answered too early on freshly booted devices,
which is what the 2012 scans caught.

The fix was a system call. In 2014 the LibreSSL developers, who had just
forked OpenSSL after Heartbleed, asked for an equivalent of OpenBSD's
`getentropy()`, one that could not fail for lack of file descriptors or of a
`/dev` directory. Ts'o added `getrandom()` in Linux 3.17, released in October
2014. Its rule is the one that ended the argument: **block until the
generator has been seeded once, then never block again.**

```c
ssize_t getrandom(void *buf, size_t buflen, unsigned int flags);
```

- `flags = 0`: the normal call. Waits only at early boot. Once the generator
  is seeded, a request of up to 256 bytes always returns all of them and is
  never interrupted by a signal. Larger requests can return fewer bytes, so
  loop or ask for 256 at a time.
- `GRND_NONBLOCK`: fail with `EAGAIN` instead of waiting, for code that has
  something better to do at boot.
- `GRND_RANDOM`: read the old blocking pool; since Linux 5.6 this has no
  practical meaning and should not be used.
- `GRND_INSECURE` (Linux 5.6): return bytes even before seeding, for the rare
  caller, such as a hash-table seed at early boot, that needs something now
  and does not need it to be secret.

The C library wrapper arrived in glibc 2.25 (2017), together with
`getentropy()`, which fills at most 256 bytes and is the portable name across
Linux, the BSDs and macOS.

The rest of the history, in Figure 4.2, moved Linux toward the simple model.
Linux 4.8 (2016) put a ChaCha20 generator behind the pool; 5.4 (2019) added
the jitter routine of §4.1. In 5.6 (2020) Andy Lutomirski's patches removed
the blocking pool: `/dev/random` now waits until the generator is seeded,
once, and then reads like `/dev/urandom`. In 2022 Jason Donenfeld, by then a
maintainer of the driver, rewrote much of it across 5.17 and 5.18: BLAKE2s
replaced SHA-1, the kernel began reseeding when a hypervisor signals a cloned
machine (§4.5), and a read of `/dev/urandom` before seeding now first runs the
jitter routine. (Making `/dev/urandom` block like `getrandom()` was tried and
reverted, because it hung emulated machines without a cycle counter.) In 6.11
(2024) his `getrandom()` in the vDSO gave user programs kernel-quality bytes
without a system call per request, from state the kernel erases on fork and
on VM cloning; glibc 2.41 (2025) uses it.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Timeline of the Linux random number interfaces from 1994 to 2024" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="292" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Ts'o writes /dev/random and /dev/urandom</text>
<text x="78" y="55" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="50" r="3.5"/>
<text x="108" y="55">3.6: every interrupt and device ID mixed in (after Ps and Qs)</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="78" r="3.5"/>
<text x="108" y="83" font-weight="bold">3.17: getrandom(), waits once until seeded</text>
<text x="78" y="111" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="106" r="3.5"/>
<text x="108" y="111">4.8: ChaCha20 output generator</text>
<text x="78" y="139" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="134" r="3.5"/>
<text x="108" y="139">5.4: jitter entropy at boot, after the boot hang</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="162" r="3.5"/>
<text x="108" y="167">5.6: blocking pool removed; /dev/random waits only once</text>
<text x="78" y="195" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="190" r="3.5"/>
<text x="108" y="195">5.17: BLAKE2s replaces SHA-1 (Donenfeld)</text>
<text x="78" y="223" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="218" r="3.5"/>
<text x="108" y="223">5.18: reseed on VM clone (vmgenid); urandom runs jitter first</text>
<text x="78" y="251" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="246" r="3.5"/>
<text x="108" y="251">6.11: getrandom() in the vDSO, fork- and clone-safe</text>
<text x="108" y="282" font-style="italic" opacity="0.8">Direction: one generator, one rule, no user-space state to copy.</text>
</svg>
<figcaption>Figure 4.2. Thirty years of Linux random interfaces. Each change answered a failure: the 2012 changes followed the shared-prime scans, getrandom() the early-boot gap, the 5.4 jitter routine the 2019 boot hang, and vmgenid the snapshot problem of §4.5.</figcaption>
</figure>

!!! note "Life story: getrandom()"
    **Born:** Linux 3.17, October 2014, Theodore Ts'o, at the request of the
    LibreSSL developers and modeled on OpenBSD's `getentropy()` ·
    **Purpose:** random bytes with no file descriptor to run out of, no
    `/dev` to be missing, and one rule: wait until seeded, then never again ·
    **Helped:** closed the boot-time gap behind the 2012 shared primes;
    underneath Python's `os.urandom`, Go, Rust, OpenSSL, libsodium and
    glibc's `arc4random`; adopted by FreeBSD 12.0 (2018) · **Status:** current; since Linux 6.11 also served from the vDSO

### The BSDs and macOS: `arc4random`

OpenBSD's answer is older and in one way better. `arc4random()` first
appeared in OpenBSD in the late 1990s, from code David Mazières wrote in 1996,
and was named for the RC4 ("alleged RC4", arc4) cipher it ran on. In OpenBSD
5.5 (2014) the cipher became ChaCha20. The family is `arc4random()` for 32
bits, `arc4random_buf(buf, n)` for any number of bytes, and
`arc4random_uniform(n)` for an unbiased number below `n`. None of them can
fail, and none takes a seed: there is nothing for the caller to get wrong.

The generator runs inside each process, seeded from the kernel with
`getentropy()` and reseeded regularly. Its state lives in memory mapped with
`MAP_INHERIT_ZERO` (OpenBSD 5.6, 2014), so a forked child starts with zeroed
state and reseeds before its first output. Linux gained the same tool as `madvise(MADV_WIPEONFORK)` in
Linux 4.14 (2017). FreeBSD (since 12.0) and macOS provide `arc4random` too,
on ChaCha20 and AES respectively, and glibc 2.36 (2022) added the family to
Linux, implemented on top of `getrandom()`. On Apple platforms the
higher-level calls are `SecRandomCopyBytes` and `CCRandomGenerateBytes`.

!!! note "Life story: arc4random"
    **Born:** 1996 code by David Mazières, adopted by OpenBSD in the late
    1990s, built on RC4 · **Purpose:** a random function that cannot fail,
    takes no seed, and needs no file · **Helped:** led to OpenBSD's
    `getentropy()` (2014), the model for Linux's `getrandom()`; spread to FreeBSD, NetBSD, macOS,
    Android's Bionic and, in 2022, glibc · **Status:** current; on ChaCha20
    in OpenBSD since 5.5 (2014), with RC4 versions retired (see
    [Retired generators](../../09-random/Retired.md))

### Windows: `BCryptGenRandom` and `ProcessPrng`

Windows has had several names for one service. `CryptGenRandom` belonged to
the old CryptoAPI and is deprecated; `RtlGenRandom` (`SystemFunction036`) was
long the quiet favorite of language runtimes. `BCryptGenRandom`, in the
Cryptography Next Generation API since Windows Vista (2007), is the documented
call, with a null algorithm handle and `BCRYPT_USE_SYSTEM_PREFERRED_RNG`;
since Vista SP1 it has been an SP 800-90A CTR_DRBG. Niels Ferguson's 2019
paper on the Windows 10 infrastructure describes what sits behind them all: a
root generator in the kernel feeding one per processor, which seed a base
generator in each user process, in `bcryptprimitives.dll`. `ProcessPrng`
reads that one directly, and Microsoft documents that it always returns
`TRUE`. Because it cannot fail, runtimes that cannot handle an error at that
point, Rust's standard library and Go among them, moved to it around 2024.

!!! note "Life story: the Windows generator (BCryptGenRandom, ProcessPrng)"
    **Born:** `CryptGenRandom` with the 1996 CryptoAPI; `BCryptGenRandom`
    with CNG in Windows Vista (2007), an SP 800-90A CTR_DRBG since Vista
    SP1; the Windows 10 architecture described by Niels Ferguson (2019) ·
    **Purpose:** one system generator behind every Windows API, with a fast
    per-process state seeded from the kernel · **Helped:** replaced the
    Windows 2000 design whose flaws Dorrendorf, Gutterman and Pinkas showed
    in 2007; `ProcessPrng` now serves Rust and Go ·
    **Status:** current; `CryptGenRandom` deprecated

### What to call

| Platform or language | Call | Notes |
|---|---|---|
| Linux | `getrandom(buf, n, 0)`, `getentropy()` | waits once at boot |
| OpenBSD, FreeBSD, macOS | `arc4random_buf()`, `getentropy()` | cannot fail |
| Windows | `ProcessPrng()`, `BCryptGenRandom(NULL, ..., BCRYPT_USE_SYSTEM_PREFERRED_RNG)` | `ProcessPrng` cannot fail |
| Python | `secrets`, `os.urandom` | `getrandom()` underneath on Linux (§4.4) |
| Go | `crypto/rand` | `rand.Read` documented never to fail since Go 1.24 (2025) |
| Rust | the `getrandom` crate, `rand::rngs::OsRng` | |
| Java | `SecureRandom` (default constructor) | never seed it yourself |
| JavaScript | `crypto.getRandomValues()`, Node's `crypto.randomBytes()` | never `Math.random()` |
| C with a library | libsodium `randombytes_buf()`, OpenSSL `RAND_bytes()` | OpenSSL's DRBG reseeds on fork since 1.1.1 |

### Code it

In Python the call is `os.urandom`, which uses `getrandom()` on Linux;
`os.getrandom` exposes the flags. At early boot `GRND_NONBLOCK` raises
`BlockingIOError` instead of waiting.

```python
import os

key = os.urandom(32)                         # getrandom(buf, 32, 0) on Linux
print(len(key))                              # 32
try:
    early = os.getrandom(16, os.GRND_NONBLOCK)   # Linux only
    print("generator is seeded:", len(early) == 16)
except BlockingIOError:
    print("too early in boot: the generator is not seeded yet")
```

On a booted machine it prints `32` and `generator is seeded: True`.

### Break it: the fallback that nobody tested

A pattern that appears again and again in real code, from C libraries to
embedded firmware: open the random device, and if that fails, "do something
reasonable". The something is nearly always the clock. The failure looks
impossible on a developer's laptop, so it is never exercised, until the code
runs in a chroot or a minimal container with no `/dev`, or in a process that
has run out of file descriptors.

```python
import random, time

def random_bytes(n, device="/dev/urandom", clock=time.time):
    try:
        with open(device, "rb") as f:
            return f.read(n)
    except OSError:                       # "should never happen", so nobody tested it
        random.seed(int(clock()))
        return bytes(random.getrandbits(8) for _ in range(n))

# In a chroot or a minimal container there may be no /dev at all.
now = int(time.time())
made_at = now - 1234                      # the key was made about twenty minutes ago
key = random_bytes(16, device="/no-dev-here/urandom", clock=lambda: made_at)

# The attacker knows roughly when: try each second of the last hour, newest first.
for tries, guess in enumerate(range(now, now - 3600, -1), 1):
    random.seed(guess)
    if bytes(random.getrandbits(8) for _ in range(16)) == key:
        print("key found after", tries, "guesses")
        break
```

It prints `key found after 1235 guesses`. A 128-bit key has become a 12-bit
one. Netscape's 1995 seed had more in it than this.

### Fix it

Use the system call, which needs no file, and let a failure be a failure:

```python
import os

def random_bytes(n):
    return os.urandom(n)    # getrandom() on Linux: no file, no fallback; it raises if it truly cannot

print(len(random_bytes(16)))   # 16
```

If the operating system cannot provide random bytes, nothing the program
does will be secure, and the right behavior is to stop: the "fail closed"
principle of [Chapter 1](01-What-Cryptographic-Engineering-Is.md).

**What to do.**

- Call `getrandom()`, `getentropy()`, `arc4random_buf()` or `ProcessPrng()`,
  or your language's wrapper of them. Do not open `/dev/urandom` yourself in
  new code.
- Never write a fallback. If the call fails, abort.
- Do not mix in the time or the process ID "for extra safety", and do not
  expect `/dev/random` or `GRND_RANDOM` to be stronger: since Linux 5.6 it is
  the same generator.

## 4.4 In Python: `secrets`, not `random`

*Level: beginner.*

Python ships two kinds of generator, and the names do not warn you which is
which. The `random` module is the Mersenne Twister, MT19937: fast,
statistically excellent, reproducible from a seed, and completely predictable
to anyone who sees 624 of its 32-bit outputs, as book 1
[§4.10](../../book/04-Randomness-and-Perfect-Secrecy.md#410-famous-failures)
shows by cloning one. It is the right tool for simulations, games, sampling
and tests, and the wrong one for anything an attacker would like to guess.

The `secrets` module, added in Python 3.6 (December 2016) by PEP 506, exists
because people kept reaching for `random` anyway. The argument of its
author, Steven D'Aprano, was simple: `random` is the obvious name, it is the
one tutorials use, and code written with it works perfectly in every test. So
`secrets` has a short list of functions with the safe defaults built in, and
no way to seed:

| Need | Use | Not |
|---|---|---|
| a key or salt | `secrets.token_bytes(32)` | `random.randbytes(32)` |
| a token in a URL or cookie | `secrets.token_urlsafe(32)` | `uuid.uuid1()`, `str(random.random())` |
| a hex token | `secrets.token_hex(16)` | `"%032x" % random.getrandbits(128)` |
| a number below n | `secrets.randbelow(n)` | `random.randrange(n)`, `os.urandom(...)[0] % n` |
| a choice from a list | `secrets.choice(seq)` | `random.choice(seq)` |
| comparing a secret | `secrets.compare_digest(a, b)` | `a == b` (see [Chapter 5](05-Constant-Time-Programming.md)) |
| a `random`-style object | `random.SystemRandom()` | `random.Random()` |

Everything in `secrets` reads `os.urandom`. `random.SystemRandom` gives the
same bytes through the `random` interface, for code that needs `shuffle` or
`sample` on secret data; it ignores `seed()`. `uuid.uuid4()` also uses
`os.urandom` and carries 122 random bits, which makes it a fine identifier but
not the token you should reach for (§4.8).

### Worked example: how long should a token be?

Suppose a service has at most $m = 2^{20}$ valid reset tokens at any time,
and an attacker can try $q = 2^{40}$ guesses, far more than any rate limit
should allow. Each guess hits some valid token with probability $m / 2^b$ for a
$b$-bit token, so the chance of at least one success is at most

$$
\Pr[\text{success}] \le \frac{q \, m}{2^b} = \frac{2^{40} \cdot 2^{20}}{2^b} = 2^{60 - b}.
$$

With $b = 128$ that is $2^{-68}$. With a 32-bit token the bound exceeds 1:
the attacker wins long before running out of guesses. `secrets.token_urlsafe()`
defaults to 32 bytes, which is generous; 16 is enough. Store a hash of each
token rather than the token, so a database leak hands out no live credentials
([Chapter 13](13-Passwords-on-the-Server.md) makes the same argument for
passwords).

!!! note "Life story: Python's secrets module"
    **Born:** PEP 506, Steven D'Aprano, 2015; shipped in Python 3.6
    (December 2016), alongside PEP 524's rule that `os.urandom` waits for
    the kernel generator · **Purpose:** a short, unseedable, obviously named
    module for keys, tokens and passwords, so that the safe choice is also the
    easy one · **Helped:** gave tutorials, reviewers and linters one safe answer
    to point to; a model for "one right way" APIs ([Chapter 9](09-APIs-That-Resist-Misuse.md))
    · **Status:** current; the answer to "how do I make a token in Python"

### Break it: a seed that someone else set

The usual argument against `random` is state recovery from 624 outputs, and it
needs an attacker who sees raw outputs. There is a simpler failure that needs
nothing at all. The `random` module's functions share one hidden generator for
the whole process, and any code in the process can seed it. Data science and
test code often does, for reproducible results:

```python
import random, string

def shuffle_for_tests(cards):             # in a helper library, for reproducible test runs
    random.seed(42)
    random.shuffle(cards)
    return cards

def reset_token():                         # in the web app
    abc = string.ascii_letters + string.digits
    return "".join(random.choice(abc) for _ in range(22))

shuffle_for_tests(list(range(52)))
victim = reset_token()

random.seed(42)                            # the attacker reads the library's source
random.shuffle(list(range(52)))
print(reset_token() == victim)             # True
```

The 22-character token looks like 131 bits. It has zero, because a library
the application imported seeded the shared generator with a constant. Nothing
in a code review of `reset_token` would show it.

### Fix it

```python
import secrets

def reset_token():
    return secrets.token_urlsafe(16)       # 128 bits from the OS; nothing can seed it

t = reset_token()
print(len(t), t != reset_token())          # 22 True
```

Sixteen bytes in base64url make the same 22 characters, and this time all 128
bits are real.

**What to do.**

- Search your code for `import random` and look at every use. Anything that
  makes a key, token, password, salt, nonce, session ID or shuffle that
  matters goes through `secrets`.
- Add a linter rule: Bandit's B311 flags the `random` module's functions,
  and many teams fail the build on it outside test code.
- Use `secrets.randbelow` and `secrets.choice`, never `% n`, to avoid the
  modulo bias of book 1 [§4.9](../../book/04-Randomness-and-Perfect-Secrecy.md#49-where-random-numbers-come-from).
- Make tokens 128 bits or more and store only their hashes.

## 4.5 Copies of the state: fork, snapshots and clones

*Level: intermediate.*

A generator is a deterministic machine around a secret state. Whoever has a
copy of the state has the next output. That is harmless while the state lives
in exactly one place, and modern systems are full of ways to make a second
copy without anyone deciding to.

- **`fork()`** gives the child process a byte-for-byte copy of the parent's
  memory, including any generator state held in user space.
- **A virtual machine snapshot** saves the whole machine, kernel generator
  included. Restore it twice, or clone a running machine for scaling, and two
  machines continue from the same state.
- **A container checkpoint** (CRIU) or a serverless snapshot does the same
  for one process tree; AWS Lambda's SnapStart (2022) documentation warns
  that anything random made before its snapshot is shared by every instance
  restored from it.
- **A disk image or a restored backup** brings back the same seed file, host
  keys or counter on every copy.

Figure 4.3 shows the first two cases.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two ways a generator state is copied: fork gives parent and child the same user-space state; restoring a VM snapshot twice gives two machines the same kernel state" fill="currentColor" font-size="14">
<text x="160" y="18" text-anchor="middle" font-weight="bold">fork()</text>
<text x="480" y="18" text-anchor="middle" font-weight="bold">VM snapshot, restored twice</text>
<rect x="90" y="32" width="140" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="52" text-anchor="middle">process</text>
<text x="160" y="68" text-anchor="middle" font-weight="bold">pool state S</text>
<line x1="140" y1="76" x2="96" y2="118" stroke="currentColor" stroke-width="1.4"/>
<polygon points="92,122 96,113 101,119"/>
<line x1="180" y1="76" x2="224" y2="118" stroke="currentColor" stroke-width="1.4"/>
<polygon points="228,122 219,119 224,113"/>
<rect x="20" y="122" width="130" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="142" text-anchor="middle">parent</text>
<text x="85" y="158" text-anchor="middle" font-weight="bold">S</text>
<rect x="170" y="122" width="130" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="142" text-anchor="middle">child</text>
<text x="235" y="158" text-anchor="middle" font-weight="bold">S</text>
<text x="160" y="192" text-anchor="middle">both hand out the same next token</text>
<rect x="410" y="32" width="140" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="52" text-anchor="middle">running VM</text>
<text x="480" y="68" text-anchor="middle" font-weight="bold">kernel state S</text>
<line x1="460" y1="76" x2="416" y2="118" stroke="currentColor" stroke-width="1.4"/>
<polygon points="412,122 416,113 421,119"/>
<line x1="500" y1="76" x2="544" y2="118" stroke="currentColor" stroke-width="1.4"/>
<polygon points="548,122 539,119 544,113"/>
<rect x="340" y="122" width="130" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="405" y="142" text-anchor="middle">restore 1</text>
<text x="405" y="158" text-anchor="middle" font-weight="bold">S</text>
<rect x="490" y="122" width="130" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="142" text-anchor="middle">restore 2</text>
<text x="555" y="158" text-anchor="middle" font-weight="bold">S</text>
<text x="480" y="192" text-anchor="middle">both send the same TLS random</text>
<line x1="20" y1="214" x2="620" y2="214" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 4"/>
<text x="20" y="240" font-weight="bold">fix:</text>
<text x="60" y="240">reseed in the child: a fork</text>
<text x="60" y="258">handler or MADV_WIPEONFORK,</text>
<text x="60" y="276">or no user-space state at all</text>
<text x="340" y="240" font-weight="bold">fix:</text>
<text x="380" y="240">the hypervisor changes the VM</text>
<text x="380" y="258">generation ID; the kernel reseeds</text>
<text x="380" y="276">(Windows; Linux since 5.18)</text>
</svg>
<figcaption>Figure 4.3. Two everyday ways a generator's state is duplicated. Neither copy knows the other exists, so each produces exactly what the other produces until something new is mixed in.</figcaption>
</figure>

### Fork: a demonstration

The kernel generator is safe across `fork()`: its state is in the kernel.
The danger is a generator or buffer in user space, kept to save system calls.
The code below has three: a pool that reads 4 KiB from the OS at a time, a
`random.Random()` object, and the `random` module's hidden generator. Parent
and child each draw from all three and from `os.urandom`.

```python
import os, random

class TokenPool:
    """Reads 4 KiB from the OS at a time, to save system calls. Not fork-safe."""
    def __init__(self):
        self.refill()

    def refill(self):
        self.buf, self.pos = os.urandom(4096), 0

    def take(self, n):
        if self.pos + n > len(self.buf):
            self.refill()
        out = self.buf[self.pos:self.pos + n]
        self.pos += n
        return out

def draw(pool, mine):
    return [pool.take(16), mine.getrandbits(128).to_bytes(16, "big"),
            random.getrandbits(128).to_bytes(16, "big"), os.urandom(16)]

def run_fork(pool, mine):
    r, w = os.pipe()
    pid = os.fork()
    if pid == 0:                          # the child: draw, send, and leave
        os.write(w, b"".join(draw(pool, mine)))
        os._exit(0)
    os.close(w)
    data = b""
    while len(data) < 64:
        data += os.read(r, 64 - len(data))
    os.close(r)
    os.waitpid(pid, 0)
    child = [data[i:i + 16] for i in range(0, 64, 16)]
    return [a == b for a, b in zip(draw(pool, mine), child)]

names = ["TokenPool", "random.Random()", "module random", "os.urandom"]
pool, mine = TokenPool(), random.Random()
for name, same in zip(names, run_fork(pool, mine)):
    print("%-16s parent and child drew the same bytes: %s" % (name, same))
```

It prints:

```
TokenPool        parent and child drew the same bytes: True
random.Random()  parent and child drew the same bytes: True
module random    parent and child drew the same bytes: False
os.urandom       parent and child drew the same bytes: False
```

The pool's 4 KiB of good OS randomness is now shared, so the parent's next
256 tokens are the child's. A pre-forking web server that serves session IDs
this way gives users in different workers the same IDs. The module-level
`random` generator differs only because Python, since 3.7, reseeds it in the
child; a `random.Random()` object you made gets no such help.

### Fix it

Python 3.7 added `os.register_at_fork`, which runs a function in the child
right after a fork. A user-space generator registers its own reseed:

```python
import os

class TokenPool:
    def __init__(self):
        self.refill()
        os.register_at_fork(after_in_child=self.refill)   # the child throws its copy away

    def refill(self):
        self.buf, self.pos = os.urandom(4096), 0

    def take(self, n):
        if self.pos + n > len(self.buf):
            self.refill()
        out = self.buf[self.pos:self.pos + n]
        self.pos += n
        return out

pool = TokenPool()
r, w = os.pipe()
pid = os.fork()
if pid == 0:
    os.write(w, pool.take(16))
    os._exit(0)
os.close(w)
child = os.read(r, 16)
os.waitpid(pid, 0)
print("same bytes after the fix:", pool.take(16) == child)   # False
```

The general fixes, from weakest to strongest:

1. **Check the process ID** on every call and reseed if it changed (older
   OpenSSL versions mixed the process ID into every request, a weaker cousin
   of this). It fails when a grandchild reuses the original parent's
   ID, which happens on busy systems, and it does nothing for VM clones.
2. **Fork handlers**: `pthread_atfork` in C, `os.register_at_fork` in Python.
   They run on `fork()` but not on raw `clone()` system calls, which some
   runtimes use.
3. **Memory the kernel wipes**: `MADV_WIPEONFORK` on Linux,
   `MAP_INHERIT_ZERO` on OpenBSD. The child sees zeros where the state was,
   detects it and reseeds. No handler can be skipped. This is what
   `arc4random` relies on.
4. **No user-space state at all**: call the kernel for every request. Since
   Linux 6.11 the vDSO `getrandom()` gives that safety at user-space speed,
   with the state in memory the kernel wipes on fork and invalidates when the
   machine is cloned.

### Snapshots and clones

In 2010 Thomas Ristenpart and Scott Yilek studied virtual machines reset to a
snapshot, which hosting providers and malware analysts do all the time. They
found TLS clients in restored machines reusing random values across sessions,
and showed how that could expose session keys and even a DSA signing key.
Their defense, **hedging**, mixes the message and other context into the
randomness, so a repeated random value does not repeat everything else; the
idea later reached signatures (Cryptanalysis
[§14.8](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md#148-deterministic-nonces-and-the-fault-attack)).
In 2014 Adam Everspaugh and colleagues found that Linux guests resumed from a
snapshot could return identical `/dev/urandom` output for a while, and that
freshly booted cloud guests had little boot entropy.

The fix for the kernel is a signal from the hypervisor: the **virtual machine
generation ID**, a 128-bit value in the firmware tables that the hypervisor
changes whenever the machine is started from a snapshot, restored or cloned.
In Linux 5.18 Jason Donenfeld's `vmgenid` driver mixes the new value in and
reseeds the moment it changes. User-space generators still see nothing, one
reason Linux moved user-space randomness into the vDSO, where the kernel can
invalidate it.

!!! note "Life story: the virtual machine generation ID"
    **Born:** 2012, Microsoft, for Hyper-V in Windows Server 2012, first to
    stop cloned Active Directory domain controllers from reusing identifiers
    · **Purpose:** tell a guest operating system "you have been copied or
    rewound" through a 128-bit value the hypervisor changes · **Helped:**
    Windows reseeds on it; QEMU added the device in 2017; Linux 5.18 (2022)
    reseeds its generator when it changes · **Status:** current, but only as
    good as the hypervisor: a platform that restores snapshots without
    changing it gives no warning

**Containers** share the host kernel, so starting a thousand from one image
copies no generator. What an image does copy is anything made at build time:
SSH host keys, a secret generated in a `Dockerfile` step, a seed file.

**What to do.**

- Prefer no user-space generator state. Call `os.urandom`, `getrandom()` or
  `arc4random_buf()` per request; it is fast enough for almost everything.
- If you must buffer, wipe or reseed on fork with `MADV_WIPEONFORK` or a fork
  handler, and test it with a fork like the one above.
- Generate host keys, instance secrets and seeds at first boot of each
  instance, never during image build.
- Run kernels and hypervisors that support the generation ID, and draw
  random values after a snapshot restore, never before the snapshot.

## 4.6 HMAC_DRBG as a component

*Level: intermediate.*

Almost no application should implement a random generator. A few engineers
must: those writing a module for FIPS 140-3 validation, firmware for a device
with no operating system, or deterministic ECDSA nonces (RFC 6979 is built on
HMAC_DRBG). Everyone else should be able to review such code. Book 1 [§4.9](../../book/04-Randomness-and-Perfect-Secrecy.md#49-where-random-numbers-come-from)
and the [NIST DRBG](../../09-random/NIST-DRBG.md) page show HMAC_DRBG's core:
a key $K$ and a value $V$, output by repeated HMAC, and an update that replaces
both after every request. A real component wraps that core in a state machine,
and the state machine is where the bugs live.

### What SP 800-90A Rev. 1 adds to the core

SP 800-90A Rev. 1 (June 2015, Elaine Barker and John Kelsey) specifies each
DRBG as four functions over a **working state** and some **administrative
information**:

- **Instantiate** takes an *entropy input* with at least as many bits of
  min-entropy as the security strength (256 for SHA-256 at full strength), a
  *nonce* with half that much entropy or a guarantee of uniqueness, and an
  optional *personalization string* (a serial number, a MAC address), which
  need not be secret but makes two instances diverge.
- **Generate** returns up to $2^{19}$ bits (64 KiB) per request and takes
  optional *additional input*, which is mixed in before and after the output.
  It refuses to run once the reseed counter passes the *reseed interval*,
  $2^{48}$ requests for HMAC_DRBG.
- **Reseed** mixes fresh entropy and optional additional input into the
  state and resets the counter.
- **Uninstantiate** erases the state.

Two properties are named precisely. **Backtracking resistance**: someone who
steals the state cannot compute earlier output. Every SP 800-90A DRBG has it,
because the update after each request is one-way. **Prediction resistance**:
someone who stole an earlier state cannot compute later output. Only fresh
entropy gives that, so a caller who asks for it forces a reseed from a live
entropy source before output; a DRBG with no live source must refuse the
request. Figure 4.4 shows the life of the component.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Life cycle of an SP 800-90A DRBG: uninstantiated, instantiate to ready, generate loops, reseed when the counter passes the interval or prediction resistance is asked for, uninstantiate erases the state" fill="currentColor" font-size="14">
<rect x="10" y="110" width="130" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="134" text-anchor="middle">uninstantiated</text>
<text x="75" y="152" text-anchor="middle" font-size="12" opacity="0.8">no state</text>
<line x1="140" y1="126" x2="284" y2="126" stroke="currentColor" stroke-width="1.4"/>
<polygon points="290,126 282,122 282,130"/>
<text x="215" y="100" text-anchor="middle" font-size="12">instantiate(entropy,</text>
<text x="215" y="114" text-anchor="middle" font-size="12">nonce, personalization)</text>
<rect x="290" y="98" width="160" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="370" y="124" text-anchor="middle" font-weight="bold">ready</text>
<text x="370" y="144" text-anchor="middle" font-size="12">K, V, reseed_counter</text>
<text x="370" y="162" text-anchor="middle" font-size="12">strength, PR flag</text>
<path d="M 330 98 C 320 40, 420 40, 410 98" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="410,98 406,89 415,90"/>
<text x="370" y="34" text-anchor="middle" font-size="12">generate(n, additional): output,</text>
<text x="370" y="48" text-anchor="middle" font-size="12">then update K and V, counter + 1</text>
<rect x="490" y="98" width="140" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="560" y="124" text-anchor="middle">reseed(entropy,</text>
<text x="560" y="142" text-anchor="middle">additional)</text>
<text x="560" y="162" text-anchor="middle" font-size="12">counter = 1</text>
<line x1="450" y1="120" x2="484" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="490,120 482,116 482,124"/>
<line x1="490" y1="156" x2="456" y2="156" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,156 458,152 458,160"/>
<text x="560" y="200" text-anchor="middle" font-size="12">when counter &gt; 2^48,</text>
<text x="560" y="214" text-anchor="middle" font-size="12">or prediction resistance</text>
<text x="560" y="228" text-anchor="middle" font-size="12">is asked for</text>
<path d="M 370 178 L 370 240 L 75 240 L 75 172" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<polygon points="75,166 71,174 79,174"/>
<text x="222" y="262" text-anchor="middle" font-size="12">uninstantiate: erase K and V</text>
<text x="222" y="278" text-anchor="middle" font-size="12" opacity="0.8">(on shutdown, or when the entropy source fails)</text>
</svg>
<figcaption>Figure 4.4. The life of an SP 800-90A DRBG. The core of book 1 is the loop at the top. The component around it counts requests, enforces the limits, refuses prediction resistance it cannot give, and erases its state when it is done or when its entropy source can no longer be trusted.</figcaption>
</figure>

### Code it

The class below follows SP 800-90A Rev. 1, §10.1.2, step by step for
HMAC_DRBG with SHA-256, with the limits of the standard's Table 2. It is
checked against two vectors from NIST's Cryptographic Algorithm Validation
Program (CAVP), taken from the file `drbgtestvectors.zip` published on
csrc.nist.gov. The first comes from `drbgvectors_no_reseed/HMAC_DRBG.rsp`:
the section `[SHA-256]`, `[PredictionResistance = False]`,
`[EntropyInputLen = 256]`, `[NonceLen = 128]`,
`[PersonalizationStringLen = 256]`, `[AdditionalInputLen = 256]`,
`COUNT = 0`. Unlike the vector in book 1, it exercises the personalization
string and additional input on both calls. The second, from
`drbgvectors_pr_false/HMAC_DRBG.rsp` (`[SHA-256]`, no personalization or
additional input, `COUNT = 0`), exercises reseeding. CAVP's procedure is fixed:
instantiate, (reseed,) generate 1,024 bits and throw them away, generate 1,024
bits again, and compare the second output.

```python
import hmac, hashlib

class HmacDrbg:
    """HMAC_DRBG with SHA-256, SP 800-90A Rev. 1, section 10.1.2."""
    STRENGTH = 256                 # bits; SHA-256 supports up to 256
    MAX_BYTES = 2**19 // 8         # 2^19 bits per request
    MAX_INPUT = 2**35 // 8         # longest entropy, personalization or additional input
    RESEED_INTERVAL = 2**48        # requests before a reseed is required

    def __init__(self, entropy, nonce, personalization=b""):
        if len(entropy) * 8 < self.STRENGTH:
            raise ValueError("entropy input shorter than the security strength")
        if len(nonce) * 8 < self.STRENGTH // 2:
            raise ValueError("nonce shorter than half the security strength")
        if len(personalization) > self.MAX_INPUT:
            raise ValueError("personalization string too long")
        self.K = bytes(32)
        self.V = b"\x01" * 32
        self._update(entropy + nonce + personalization)
        self.reseed_counter = 1

    def _hmac(self, data):
        return hmac.new(self.K, data, hashlib.sha256).digest()

    def _update(self, data=b""):
        self.K = self._hmac(self.V + b"\x00" + data)
        self.V = self._hmac(self.V)
        if data:
            self.K = self._hmac(self.V + b"\x01" + data)
            self.V = self._hmac(self.V)

    def reseed(self, entropy, additional=b""):
        if len(entropy) * 8 < self.STRENGTH:
            raise ValueError("entropy input shorter than the security strength")
        self._update(entropy + additional)
        self.reseed_counter = 1

    def generate(self, n, additional=b"", prediction_resistance=False):
        if self.K is None:
            raise RuntimeError("DRBG is uninstantiated")
        if n > self.MAX_BYTES or len(additional) > self.MAX_INPUT:
            raise ValueError("request too large")
        if prediction_resistance:
            raise RuntimeError("no live entropy source: cannot give prediction resistance")
        if self.reseed_counter > self.RESEED_INTERVAL:
            raise RuntimeError("reseed required")
        if additional:
            self._update(additional)
        out = b""
        while len(out) < n:
            self.V = self._hmac(self.V)
            out += self.V
        self._update(additional)       # backtracking resistance: the old K and V are gone
        self.reseed_counter += 1
        return out[:n]

    def uninstantiate(self):
        self.K = self.V = None         # Python cannot wipe memory; C code must

h = bytes.fromhex
# CAVP drbgvectors_no_reseed, HMAC_DRBG.rsp, [SHA-256], 256-bit personalization and additional input, COUNT = 0
d = HmacDrbg(h("5d3286bc53a258a53ba781e2c4dcd79a790e43bbe0e89fb3eed39086be34174b"),
             h("c5422294b7318952ace7055ab7570abf"),
             h("2dba094d008e150d51c4135bb2f03dcde9cbf3468a12908a1b025c120c985b9d"))
d.generate(128, h("793a7ef8f6f0482beac542bb785c10f8b7b406a4de92667ab168ecc2cf7573c6"))
out = d.generate(128, h("2238cdb4e23d629fe0c2a83dd8d5144ce1a6229ef41dabe2a99ff722e510b530"))
print("no-reseed vector:", out == h(
    "d04678198ae7e1aeb435b45291458ffde0891560748b43330eaf866b5a6385e74c6fa5a5a44bdb28"
    "4d436e98d244018d6acedcdfa2e9f499d8089e4db86ae89a6ab2d19cb705e2f048f97fb597f04106"
    "a1fa6a1416ad3d859118e079a0c319eb95686f4cbcce3b5101c7a0b010ef029c4ef6d06cdfac97ef"
    "b9773891688c37cf"))

# CAVP drbgvectors_pr_false, HMAC_DRBG.rsp, [SHA-256], no personalization or additional input, COUNT = 0
d = HmacDrbg(h("06032cd5eed33f39265f49ecb142c511da9aff2af71203bffaf34a9ca5bd9c0d"),
             h("0e66f71edc43e42a45ad3c6fc6cdc4df"))
d.reseed(h("01920a4e669ed3a85ae8a33b35a74ad7fb2a6bb4cf395ce00334a9c9a5a5d552"))
d.generate(128)
print("reseed vector:   ", d.generate(128) == h(
    "76fc79fe9b50beccc991a11b5635783a83536add03c157fb30645e611c2898bb2b1bc215000209208c"
    "d506cb28da2a51bdb03826aaf2bd2335d576d519160842e7158ad0949d1a9ec3e66ea1b1a064b005de"
    "914eac2e9d4f2d72a8616a80225422918250ff66a41bd2f864a6a38cc5b6499dc43f7f2bd09e1e0f8f"
    "5885935124"))
try:
    d.generate(16, prediction_resistance=True)
except RuntimeError as e:
    print("refused:", e)
```

It prints:

```
no-reseed vector: True
reseed vector:    True
refused: no live entropy source: cannot give prediction resistance
```

Two details are where implementations go wrong. The additional input is
mixed in twice, before and after the output, and code that skips the first
mix still passes vectors with empty additional input; that is why the first
vector here has it. And `uninstantiate` in Python only drops references; the
bytes stay in memory until reused ([Chapter 8](08-Hostile-Input.md) covers
wiping secrets).

### Break it: the update left out "for speed"

The update at the end of `generate` costs two HMAC calls, a lot when the
request is one 32-byte key. Code that skips it still passes every statistical
test and every vector that generates only once. It loses backtracking
resistance, and worse than it sounds: after the call, the stored $V$ is the
last block of output.

```python
import hmac, hashlib, os

def H(K, data):
    return hmac.new(K, data, hashlib.sha256).digest()

def update(K, V, data=b""):
    K = H(K, V + b"\x00" + data)
    V = H(K, V)
    if data:
        K = H(K, V + b"\x01" + data)
        V = H(K, V)
    return K, V

class Drbg:
    def __init__(self, seed, final_update=True):
        self.K, self.V = update(bytes(32), b"\x01" * 32, seed)
        self.final_update = final_update

    def generate(self, n):
        out = b""
        while len(out) < n:
            self.V = H(self.K, self.V)
            out += self.V
        if self.final_update:
            self.K, self.V = update(self.K, self.V)
        return out[:n]

for final_update in (False, True):
    d = Drbg(os.urandom(48), final_update)
    session_key = d.generate(32)           # this morning's traffic key
    stolen_K, stolen_V = d.K, d.V          # malware dumps the process memory this afternoon
    thief = Drbg(b"", final_update)
    thief.K, thief.V = stolen_K, stolen_V
    print("final update %-5s  stolen state is the old key: %-5s  next key predicted: %s"
          % (final_update, stolen_V == session_key, thief.generate(32) == d.generate(32)))
```

It prints:

```
final update False  stolen state is the old key: True   next key predicted: True
final update True   stolen state is the old key: False  next key predicted: True
```

Without the update, the generator's memory *is* the key it just handed out. With
it, the past is safe. The last column is the same in both rows, and that is
the point of prediction resistance: once the state is stolen, only fresh
entropy, through a reseed, protects the future.

### In the real world

OpenSSL (since 1.1.1, 2018) runs a tree of AES-256 CTR_DRBGs: a primary DRBG
seeded from the OS, and per-thread "public" and "private" DRBGs seeded from
it, reseeded on fork and at intervals, the RBGC construction of SP 800-90C.
Windows' generator and the output stage of Intel's `RDRAND` are CTR_DRBGs too.
HMAC_DRBG is the usual choice where code size matters more than speed, since
it needs only a hash function.

!!! note "Life story: SP 800-90A"
    **Born:** June 2006 as SP 800-90 (Elaine Barker and John Kelsey of NIST),
    with four DRBGs; renamed SP 800-90A in January 2012; Rev. 1 in June 2015
    without Dual_EC_DRBG · **Purpose:** generators specified exactly enough
    that labs can test them with known answers, used inside every FIPS 140
    module · **Helped:** OpenSSL, Windows, BoringSSL, the Linux kernel's
    crypto API and Intel's `RDRAND` output stage; HMAC_DRBG became the
    engine of RFC 6979 nonces · **Status:** current; a Rev. 2 pre-draft
    (2025) proposes a SHAKE-based DRBG; Dual_EC_DRBG removed (see
    [§18.9](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#189-dual_ec_drbg-the-story))

**What to do.**

- Do not write a DRBG unless a certification or a bare-metal platform makes
  you. If one does, run every CAVP vector set, not one: personalization,
  additional input and reseed paths each need their own.
- Feed it from the OS or from a health-tested entropy source (§4.7), and pass
  a personalization string that is unique per device or instance.
- Reseed after fork, after a VM generation ID change, and on a timer.
- Refuse prediction resistance you cannot give, and fail closed when the
  entropy source fails.

## 4.7 Entropy sources and health tests

*Level: intermediate.*

Below every generator there is a physical process that nobody can predict.
SP 800-90B (January 2018) calls the whole assembly an **entropy source** and
divides it into three parts, drawn in Figure 4.5:

- a **noise source**: the process and the circuit that digitizes it.
  *Physical* sources measure thermal noise, the jitter of a free-running ring
  oscillator, or a metastable latch; *non-physical* ones time interrupts or
  the CPU running a fixed loop, as Stephan Müller's jitterentropy library and
  the Linux 5.4 boot routine do;
- **health tests** on the raw samples, run at start-up and continuously;
- an optional **conditioning component** that compresses many weak samples
  into fewer strong bits. SP 800-90B lists the *vetted* conditioners: HMAC,
  CMAC, CBC-MAC, an approved hash function, Hash_df and Block_cipher_df.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="SP 800-90B entropy source: a noise source is digitized into raw samples, which go to health tests and to a conditioning function, and then to the DRBG; a health test failure stops the output" fill="currentColor" font-size="14">
<rect x="10" y="40" width="150" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="66" text-anchor="middle">noise source</text>
<text x="85" y="84" text-anchor="middle" font-size="12">thermal noise, ring</text>
<text x="85" y="98" text-anchor="middle" font-size="12">oscillator jitter</text>
<line x1="160" y1="75" x2="196" y2="75" stroke="currentColor" stroke-width="1.4"/>
<polygon points="202,75 194,71 194,79"/>
<text x="181" y="64" text-anchor="middle" font-size="12">raw</text>
<rect x="202" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="267" y="66" text-anchor="middle">conditioning</text>
<text x="267" y="84" text-anchor="middle" font-size="12">optional, vetted:</text>
<text x="267" y="98" text-anchor="middle" font-size="12">HMAC, hash, CMAC</text>
<line x1="332" y1="75" x2="368" y2="75" stroke="currentColor" stroke-width="1.4"/>
<polygon points="374,75 366,71 366,79"/>
<rect x="374" y="40" width="110" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="429" y="66" text-anchor="middle">output</text>
<text x="429" y="84" text-anchor="middle" font-size="12">credited entropy</text>
<text x="429" y="98" text-anchor="middle" font-size="12">per bit</text>
<line x1="484" y1="75" x2="520" y2="75" stroke="currentColor" stroke-width="1.4"/>
<polygon points="526,75 518,71 518,79"/>
<rect x="526" y="40" width="104" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="578" y="70" text-anchor="middle" font-weight="bold">DRBG</text>
<text x="578" y="88" text-anchor="middle" font-size="12">(SP 800-90A)</text>
<line x1="181" y1="75" x2="181" y2="146" stroke="currentColor" stroke-width="1.4"/>
<polygon points="181,152 177,144 185,144"/>
<rect x="80" y="152" width="230" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="195" y="174" text-anchor="middle" font-weight="bold">health tests on raw samples</text>
<text x="195" y="192" text-anchor="middle" font-size="12">start-up: at least 1,024 samples</text>
<text x="195" y="206" text-anchor="middle" font-size="12">continuous: repetition, proportion</text>
<line x1="310" y1="183" x2="372" y2="183" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<polygon points="378,183 370,179 370,187"/>
<text x="384" y="172" font-size="12" font-weight="bold">alarm:</text>
<text x="384" y="187" font-size="12">stop output,</text>
<text x="384" y="202" font-size="12">tell the consumer</text>
<text x="10" y="24" font-size="12" opacity="0.8">entropy source (SP 800-90B)</text>
<rect x="4" y="30" width="488" height="194" rx="8" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 3"/>
</svg>
<figcaption>Figure 4.5. The SP 800-90B model of an entropy source. Health tests watch the raw samples, before conditioning, because a hash makes even a dead source look perfect. A failure must stop the output, not merely log a line.</figcaption>
</figure>

Entropy per sample is measured as **min-entropy**,
$H_\infty = -\log_2 p_{\max}$. Estimating it is a laboratory job, a million
raw samples and ten estimators of which the lowest counts; Cryptanalysis
[§18.12](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#1812-testing-a-generator)
explains the estimators, and why tests on a generator's *output* cannot
measure entropy at all. This section is about what ships in the product: the
health tests that run on every sample for the life of the device, because a
source that was good in the lab can age, freeze or be attacked.

### The two continuous tests, from the standard

Both tests take the source's claimed min-entropy per sample, $H$, and a false
alarm probability $\alpha$, which SP 800-90B recommends be between $2^{-40}$
and $2^{-20}$.

**The repetition count test** (§4.4.1) catches a source that sticks. It
counts how many times in a row the same sample value has appeared, and alarms
when the count reaches the cutoff

$$
C_{\mathrm{RCT}} = 1 + \left\lceil \frac{-\log_2 \alpha}{H} \right\rceil.
$$

The reasoning: if no value has probability above $2^{-H}$, the chance that
the next $C - 1$ samples all repeat the current one is at most
$2^{-H(C-1)} \le \alpha$. For $H = 2$ and $\alpha = 2^{-20}$, $C = 11$.

**The adaptive proportion test** (§4.4.2) catches a source that drifts toward
one value without sticking. It takes windows of $W = 1{,}024$ samples for a
binary source and $W = 512$ otherwise, counts how many samples in the window
equal the window's first sample, and alarms when the count reaches

$$
C_{\mathrm{APT}} = 1 + \mathrm{CRITBINOM}\left(W,\; 2^{-H},\; 1 - \alpha\right),
$$

where $\mathrm{CRITBINOM}(n, p, q)$ is the smallest $k$ for which a
binomial$(n, p)$ variable is at most $k$ with probability at least $q$. In
words: the cutoff is a count that an honest source reaches in a window with
probability at most $\alpha$.

### Code it

The monitor below is written the way firmware would run it: one sample at a
time, in a few words of memory, with no buffers. It prints the cutoffs for
$W = 512$ and $\alpha = 2^{-20}$, which match the table of adaptive
proportion cutoffs in SP 800-90B (410, 311, 177, 62 and 13 for $H$ = 0.5, 1,
2, 4 and 8), then feeds it four simulated sources, and finally measures the
false alarm rate it actually produces.

```python
from math import ceil, comb
import hashlib, random

def rct_cutoff(H, a=20):                   # SP 800-90B 4.4.1: C = 1 + ceil(-log2(alpha) / H)
    return 1 + ceil(a / H)

def apt_cutoff(H, W, a=20):                # 4.4.2: C = 1 + CRITBINOM(W, 2^-H, 1 - alpha)
    p, tail = 2.0 ** -H, 0.0
    for k in range(W, -1, -1):             # sum P(X > k) from the top, where the terms are tiny
        term = comb(W, k) * p**k * (1 - p) ** (W - k)
        if tail + term > 2.0 ** -a:
            return 1 + k                   # k is the smallest value with P(X > k) <= alpha
        tail += term

class HealthMonitor:
    """Both continuous tests, one sample at a time, in a few words of memory."""
    def __init__(self, H, binary=False, a=20):
        self.W = 1024 if binary else 512
        self.rct_c, self.apt_c = rct_cutoff(H, a), apt_cutoff(H, self.W, a)
        self.last, self.run = None, 0                 # repetition count state
        self.first, self.count, self.i = None, 0, 0   # adaptive proportion state

    def feed(self, x):                     # None if all is well, else the name of the failed test
        if x == self.last:
            self.run += 1
            if self.run >= self.rct_c:
                return "repetition count"
        else:
            self.last, self.run = x, 1
        if self.i == 0:
            self.first, self.count = x, 1  # a new window starts with this sample
        elif x == self.first:
            self.count += 1
            if self.count >= self.apt_c:
                return "adaptive proportion"
        self.i = (self.i + 1) % self.W
        return None

print("H    RCT  APT")
for H in (0.5, 1, 2, 4, 8):
    print("%-4s %3d  %3d" % (H, rct_cutoff(H), apt_cutoff(H, 512)))

rnd = random.Random(2026)                  # simulated sources only, never for secrets

def first_alarm(source, H, n=100_000, a=20):
    m = HealthMonitor(H, a=a)
    for i in range(n):
        why = m.feed(source())
        if why:
            return "%s alarm at sample %d" % (why, i)
    return "no alarm in %d samples" % n

print("honest 4-bit source:", first_alarm(lambda: rnd.randrange(16), 4))
print("stuck oscillator:   ", first_alarm(lambda: 9, 4))
print("one value at 15%:   ", first_alarm(lambda: 9 if rnd.random() < 0.15 else rnd.randrange(16), 4))
count = iter(range(10**9))                 # Break it: test after the hash instead of before
hashed = lambda: hashlib.sha256(bytes([9]) + next(count).to_bytes(8, "big")).digest()[0] >> 4
print("stuck, tested after hashing:", first_alarm(hashed, 4))

alarms, m = 0, HealthMonitor(2, a=10)      # a looser alpha, to watch false alarms happen
for _ in range(2**20):
    if m.feed(rnd.randrange(4)):
        alarms, m = alarms + 1, HealthMonitor(2, a=10)
print("false alarms in 2^20 samples of a perfect 2-bit source at alpha = 2^-10:", alarms)
```

It prints:

```
H    RCT  APT
0.5   41  410
1     21  311
2     11  177
4      6   62
8      4   13
honest 4-bit source: no alarm in 100000 samples
stuck oscillator:    repetition count alarm at sample 5
one value at 15%:    adaptive proportion alarm at sample 1365
stuck, tested after hashing: no alarm in 100000 samples
false alarms in 2^20 samples of a perfect 2-bit source at alpha = 2^-10: 803
```

The stuck oscillator is caught on its sixth sample, as $C_{\mathrm{RCT}} = 6$
for $H = 4$ promises. The drifting source, which never repeats long enough to
trip the first test, is caught by the second inside three windows. The fourth
line is the **Break it** of this section: the same stuck source, hashed with a
counter before the tests see it, passes everything, because SHA-256 of a
counter looks perfectly random. Tests on conditioned output test the hash
function, not the source. The fix is in Figure 4.5: test raw samples.

### The false alarm budget

The last line is easy to miss. With $\alpha = 2^{-10}$, $2^{20}$ samples of an
honest source at exactly its claimed entropy gave 803 alarms, close to the
$2^{20} \cdot 2^{-10} \cdot \tfrac{3}{4} = 768$ new runs expected plus a few
proportion alarms: the repetition test's $\alpha$ is a rate *per sample*, the
proportion test's *per window*. So a source sampled a million times a second
at $\alpha = 2^{-20}$ could raise a false alarm about once a second. Fast
sources use $\alpha$ near $2^{-40}$, about one false alarm in twelve days at a
million samples a second, and are credited with a conservative $H$, which
makes false alarms rarer still.

### What an alarm must do

SP 800-90B requires that a failure be reported to the consumer and that no
output flow while it stands; the designer documents which failures are
intermittent and which permanent. Start-up tests run over at least 1,024
consecutive samples before the first output, so a source dead at power-on
never seeds anything. A DRBG whose source has failed must not reseed from it
and must refuse prediction resistance. The Taiwan cards show the cost of the
opposite: a stuck generator, in a certified product, kept making keys.

### Hardware generators in CPUs

Intel added `RDRAND` with Ivy Bridge in 2012 and `RDSEED` with Broadwell in
2014; AMD followed. A metastable latch provides raw bits, health tests watch
them, AES-CBC-MAC conditions them, and an AES CTR_DRBG produces `RDRAND`'s
output; `RDSEED` returns conditioned entropy for seeding. Three lessons:

- **Check the carry flag.** Both instructions report failure by clearing it,
  and Intel recommends retrying a few times. Code that ignores it uses
  whatever was in the register.
- **Mix, do not trust.** The AMD fault of §4.2 returned `0xFFFFFFFF` with the
  carry flag set, reporting success. Linux mixes these instructions into its
  pool alongside other sources; whether it also counts them toward seeding
  depends on a build option and the `random.trust_cpu` boot parameter.
- **They can leak.** In June 2020 the CrossTalk research from VU Amsterdam
  (CVE-2020-0543, which Intel calls Special Register Buffer Data Sampling)
  showed that `RDRAND` and `RDSEED` results passed through a buffer shared
  between cores and could be read by code on another core. Intel's microcode
  fix made them much slower.

TPMs, secure elements and HSMs have hardware generators too, one more input
for the pool ([Chapter 11](11-Hardware-for-Keys.md)).

!!! note "Life story: SP 800-90B"
    **Born:** drafts in 2012 and 2016; final in January 2018 (Meltem Sönmez
    Turan, Elaine Barker, John Kelsey, Kerry McKay, Mary Baish and Mike
    Boyle of NIST) · **Purpose:** a way to design, estimate and continuously
    test the physical source under a DRBG, so that certification looks
    below the deterministic part · **Helped:** required for FIPS 140-2 and
    140-3 submissions since November 2020; NIST's entropy source
    validations now certify sources separately, so one tested source can
    serve many modules · **Status:** current; the reference implementation
    of its estimators is published by NIST on GitHub

**What to do.**

- If you design hardware with a noise source, run the start-up tests over at
  least 1,024 samples, run both continuous tests on raw samples for life, and
  wire an alarm to something that stops key generation.
- Choose $\alpha$ for your sample rate: work out how often an honest source
  would alarm, and size it so a false alarm is rare but not never.
- Credit entropy conservatively, characterized across the whole temperature
  and voltage range the product will see (§4.9 shows why).
- Mix every source you have through a vetted conditioner into the DRBG; never
  let one hardware instruction be the only input.

## 4.8 Nonces, IVs and unique IDs

*Level: intermediate.*

Most random bytes a program draws are not keys but nonces, IVs, salts and
identifiers, each with its own requirement. A value that only had to be unique
is drawn at random and collides; one that had to be unpredictable comes from a
counter; one that had to be secret is logged.

| Value | Must be | Typical source | When it goes wrong |
|---|---|---|---|
| AES-GCM or ChaCha20-Poly1305 nonce | unique per key | counter, or random within limits | one repeat can expose the authentication key ([§10.7](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#107-the-forbidden-attack-gcms-key-as-a-root)) |
| CTR nonce | unique per key | counter | two-time pad ([§10.6](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#106-the-two-time-pad-nonce-reuse-in-ctr)) |
| CBC IV | unpredictable | OS generator | BEAST ([§10.5](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#105-beast-a-predictable-iv)) |
| password salt | unique | 16 random bytes | precomputed tables ([Chapter 13](13-Passwords-on-the-Server.md)) |
| ECDSA nonce $k$ | secret and uniform | RFC 6979 or hedged | key recovery from a repeat or a bias ([Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)) |
| session ID, reset token | unpredictable | 128+ random bits | account takeover (§4.4) |
| database or log ID | unique | UUID, counter | not a security property: never use it as one |

### Random nonces and the birthday bound

A random 96-bit nonce is convenient: no state, no coordination between
servers, nothing to survive a reboot. Its cost is the birthday bound of book 1
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md). With $n$
messages under one key and $b$-bit random nonces, the chance that any two
coincide is

$$
p \approx 1 - e^{-n(n-1)/2^{b+1}} \approx \frac{n^2}{2^{b+1}}.
$$

For GCM, SP 800-38D (2007) caps the chance of any repeat under one key at
$2^{-32}$. Setting $n^2 / 2^{97} = 2^{-32}$ gives $n = 2^{32.5}$, and the
standard rounds down: §8.3 says that when IVs are made with the random
construction, or are not 96 bits long, the total number of encryptions under
one key **shall not exceed $2^{32}$**. That is about four billion messages,
which sounds like plenty until it is a busy service's traffic for a few weeks,
or a data store that encrypts every record under one key.

```python
from math import expm1

def p_repeat(messages, nonce_bits):        # birthday bound: chance that any two nonces are equal
    n = float(messages)
    return -expm1(-n * (n - 1) / 2 / 2.0**nonce_bits)

for e in (32, 40, 48):
    print("2^%d messages: 96-bit p = %.3g   192-bit p = %.3g" % (e, p_repeat(2**e, 96), p_repeat(2**e, 192)))
```

It prints:

```
2^32 messages: 96-bit p = 1.16e-10   192-bit p = 1.47e-39
2^40 messages: 96-bit p = 7.63e-06   192-bit p = 9.63e-35
2^48 messages: 96-bit p = 0.393   192-bit p = 6.31e-30
```

At the limit the risk is $2^{-33}$, inside the standard's $2^{-32}$. At
$2^{48}$ messages a repeat is more likely than not to be close. The second
column is why XChaCha20-Poly1305 (draft-irtf-cfrg-xchacha) uses 192-bit
nonces: random nonces become safe for any number of messages a key will ever
see. AES-GCM-SIV (RFC 8452) takes the other route and makes a repeat cost
much less; [Chapter 9](09-APIs-That-Resist-Misuse.md) compares them.

!!! note "Life story: the GCM nonce rules (SP 800-38D)"
    **Born:** November 2007, Morris Dworkin's SP 800-38D, standardizing the
    Galois/Counter Mode of David McGrew and John Viega (2004) · **Purpose:**
    keep the chance of any IV repeat under one key below $2^{-32}$, with a
    deterministic construction or a random one capped at $2^{32}$ messages ·
    **Helped:** the nonce designs of TLS 1.2 (RFC 5288), TLS 1.3 and IPsec · **Status:** current; servers that broke the
    rules were found in 2016 ([§10.7](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#107-the-forbidden-attack-gcms-key-as-a-root))

### Counters, and the reboot that resets them

The deterministic construction of SP 800-38D §8.2.1 is a *fixed field* that
names the sender followed by an *invocation field* that counts. TLS 1.3's
nonce is the 64-bit record number XORed with a per-connection IV from the
handshake: it never repeats and is never sent. A counter has no collision
risk at all, but it moves the problem: it must never go backwards, across
crashes, reboots, restores and clones. In 2016 Hanno Böck and
colleagues found 184 HTTPS servers sending repeated GCM nonces in TLS 1.2,
some of them plainly counters that restarted, and about 70,000 using random
ones (§10.7 of Cryptanalysis tells it).

### Break it: a counter kept in RAM

A device keeps a long-lived key in flash and a message counter in a variable.
After a reboot the counter starts again at zero. The toy cipher below is CTR
mode with HMAC-SHA-256 standing in for AES, since the standard library has no
AES; the mathematics of the failure is the same.

```python
import hmac, hashlib, secrets

def keystream(key, nonce, n):             # a stand-in for AES-CTR: HMAC of nonce and block number
    out = b""
    for i in range((n + 31) // 32):
        out += hmac.new(key, nonce + i.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def encrypt(key, nonce, msg):
    return bytes(a ^ b for a, b in zip(msg, keystream(key, nonce, len(msg))))

class Sender:                             # keeps its message counter in RAM
    def __init__(self, key):
        self.key, self.counter = key, 0
    def send(self, msg):
        nonce = self.counter.to_bytes(12, "big")
        self.counter += 1
        return nonce, encrypt(self.key, nonce, msg)

key = secrets.token_bytes(32)             # stored in flash, survives reboots
n1, c1 = Sender(key).send(b"HEATER ON, BATTERY 81%")
n2, c2 = Sender(key).send(b"DRILL AT 14:02 SOL 112")   # after a reboot: the counter is 0 again

known = b"HEATER ON, BATTERY 81%"          # status messages are easy to guess
print(n1 == n2, bytes(a ^ b ^ k for a, b, k in zip(c1, c2, known)))
```

It prints `True b'DRILL AT 14:02 SOL 112'`. The attacker never touched the key:
two ciphertexts under one nonce XOR to the XOR of the plaintexts, and one
guessed plaintext reveals the other. With GCM the attacker would also gain the
ability to forge.

### Fix it: write ahead

The counter must reach stable storage before any nonce it covers is used.
Writing it on every message wears out flash and costs a sync per message, so
the standard trick reserves a block: store "next unused value is
$c + 1000$", sync, then hand out $c$ to $c + 999$ from memory. A crash loses
at most the unused part of the block, which is harmless, and never repeats a
value.

```python
import os, tempfile

class NonceCounter:
    """A 96-bit counter that survives reboots: it writes ahead in blocks of 1,000."""
    STEP = 1000

    def __init__(self, path):
        self.path = path
        try:
            with open(path) as f:
                self.next = int(f.read())  # never reuse anything that might have been handed out
        except FileNotFoundError:
            self.next = 0
        self.limit = self.next
        self._reserve()

    def _reserve(self):
        self.limit = self.next + self.STEP
        tmp = self.path + ".tmp"
        with open(tmp, "w") as f:
            f.write(str(self.limit))
            f.flush()
            os.fsync(f.fileno())           # on disk before any nonce in the block is used
        os.replace(tmp, self.path)

    def take(self):
        if self.next >= self.limit:
            self._reserve()
        n, self.next = self.next, self.next + 1
        if n >= 2**96:
            raise OverflowError("nonce space used up: rotate the key")
        return n.to_bytes(12, "big")

path = os.path.join(tempfile.mkdtemp(), "nonce-counter")
a = NonceCounter(path)
first = [a.take() for _ in range(3)]
b = NonceCounter(path)                     # a power cut and a reboot
print(int.from_bytes(first[-1], "big"), int.from_bytes(b.take(), "big"))   # 2 1000
```

After the "reboot" the counter resumes at 1,000, above everything the first
run could have used. What this cannot survive is a restore of the file from a
backup or a clone of the disk: then two copies of the counter run on. Where
that can happen, derive a fresh key per boot or per instance
([Chapter 10](10-The-Life-of-a-Key.md)), or use a nonce-misuse-resistant mode.

### Unique IDs are not secrets

RFC 9562 (2024), which replaced RFC 4122, defines the UUID versions in use
today: version 4 has 122 random bits, version 7 a 48-bit millisecond timestamp
and 74 random bits, so IDs sort by time. The RFC tells implementations not to
assume UUIDs are hard to guess. A version 4 UUID usually is, but versions 1
and 7 are not, and code that accepts "any UUID" as a capability ends up
accepting the guessable kinds. Use `secrets.token_urlsafe` for anything that
grants access, and UUIDs for naming things.

**What to do.**

- For each random value, write down whether it must be unique, unpredictable
  or secret.
- For AES-GCM with random 96-bit nonces, count messages per key and rotate
  well before $2^{32}$. Prefer counters, XChaCha20-Poly1305 or AES-GCM-SIV
  where a key must last.
- Keep counters in storage that is written ahead and never restored; derive
  per-boot or per-instance keys where a restore is possible.
- Never use a UUID, a database ID or a timestamp as a secret.

## 4.9 Mars: a rover's first boot

*Level: intermediate.*

A rover has landed. Its computer powers on for the first time on the surface
in the early morning, with the electronics at the night's temperature, around
−80 °C, and heaters only beginning to warm them. There is no network: the link
to Earth comes up once the antenna is pointed, and the relay orbiters pass a
few times a sol. Yet the software wants random bytes at once, for session keys
to its instruments and nonces for its telemetry. The firmware is identical on
every unit, so an unseeded generator would start in the same state as its twin
in the test lab; the noise source is a thermal-noise circuit whose noise
shrinks in the cold; and a rover that blocks at boot waiting for entropy, as
the 2019 laptop did, has nobody to press a key.

### Where the entropy comes from

The rover has four candidate sources, and the design uses them in order of
when they become available.

1. **A seed loaded at the factory.** During final assembly a validated
   generator writes 256 random bits into the rover's flash, unique to this
   unit and recorded nowhere else. SP 800-90C calls a generator seeded from
   outside the device an RBG1 construction. It is ready at the first
   instruction and needs no warm hardware.
2. **A boot counter** in a small memory that no backup or reflash ever
   restores, plus the serial number. Neither is secret, but together they make
   every boot of every rover different.
3. **CPU jitter** from the flight processor's cycle counter, as in the Linux
   5.4 routine. Radiation-hardened processors are simple and slow, with less
   jitter than a desktop CPU, so it is credited at little or nothing.
4. **A physical noise source**: an amplifier's thermal noise read by an ADC.
   Its noise voltage is the Johnson-Nyquist noise
   $v_{\mathrm{rms}} = \sqrt{4 k T R \, \Delta f}$, which falls with the
   square root of the absolute temperature. Cold, it delivers less entropy per
   sample than it did in the lab.

### Code it: what the cold costs

The code below models the ADC samples as Gaussian noise with a standard
deviation of 2.0 least significant bits at 20 °C, scaling as $\sqrt{T}$. For
each temperature it gives the min-entropy per sample (the most likely ADC code
is the one at the center of the distribution), the samples needed to collect
320 bits (256 for the DRBG plus a margin of 64, the margin SP 800-90C asks for
when it wants full-entropy output from a conditioner), and how often the
commonest code appears in a 512-sample window, against the adaptive proportion
cutoff for the entropy claimed in the lab.

```python
from math import erf, sqrt, log2, ceil, comb

def apt_cutoff(H, W=512, a=20):            # SP 800-90B 4.4.2, as in section 4.7
    p, tail = 2.0 ** -H, 0.0
    for k in range(W, -1, -1):
        term = comb(W, k) * p**k * (1 - p) ** (W - k)
        if tail + term > 2.0 ** -a:
            return 1 + k
        tail += term

def h_min(sigma):                          # min-entropy of Gaussian noise read by an ADC, worst case
    return -log2(erf(0.5 / (sigma * sqrt(2))))   # the most likely code is the one at the center

claim = h_min(2.0)                         # characterized in the lab at 20 C
print("claimed %.2f bits/sample, APT cutoff %d of 512" % (claim, apt_cutoff(claim)))
for kelvin in (293, 243, 193, 153):
    sigma = 2.0 * sqrt(kelvin / 293)       # thermal noise voltage goes as the square root of T
    H = h_min(sigma)
    mean = 512 * erf(0.5 / (sigma * sqrt(2)))  # how often the commonest code turns up per window
    print("%3d K: sigma %.2f LSB, %.2f bits/sample, %4d samples for 320 bits, APT expects %3.0f"
          % (kelvin, sigma, H, ceil(320 / H), mean))
```

It prints:

```
claimed 2.34 bits/sample, APT cutoff 147 of 512
293 K: sigma 2.00 LSB, 2.34 bits/sample,  137 samples for 320 bits, APT expects 101
243 K: sigma 1.82 LSB, 2.21 bits/sample,  145 samples for 320 bits, APT expects 111
193 K: sigma 1.62 LSB, 2.05 bits/sample,  157 samples for 320 bits, APT expects 124
153 K: sigma 1.45 LSB, 1.89 bits/sample,  170 samples for 320 bits, APT expects 139
```

Two lessons are in those lines. At −120 °C (153 K) the source delivers about
a fifth less entropy per sample than the lab measured, so a generator that
credits the lab figure collects about 260 real bits when it believes it has
320. And the health tests do not notice: the commonest code turns up 139
times per window on average, under the cutoff of 147. They catch a dead or
stuck source, a frozen amplifier or a cracked solder joint, within a dozen
samples, but not a source merely weaker than its label. That needs
characterization at the coldest temperature the rover will see, since
SP 800-90B requires the assessment to cover the whole operating range.

### Code it: the seed file

The factory seed must never be used twice, even across crashes, reflashes and
restores. The rover therefore treats it as a **seed file**: at every boot it
derives this boot's seed and the next seed from the stored one, writes the
next seed back to flash, and only then uses this boot's seed. Mixing in the
boot counter from memory that is never restored protects against a flash image
restored from a backup, which would otherwise bring back an old seed file and
replay an old boot.

```python
import hmac, hashlib, os, shutil, tempfile

def prf(key, label, *parts):
    return hmac.new(key, label + b"".join(parts), hashlib.sha256).digest()

def read(path):
    with open(path, "rb") as f:
        return f.read()

def write_safely(path, data):              # all or nothing, even if the power fails midway
    with open(path + ".tmp", "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(path + ".tmp", path)

def boot(flash, mram, serial, use_counter=True):
    seed = read(os.path.join(flash, "seed"))
    count = 0
    if use_counter:                        # a monotonic counter in memory no backup ever restores
        count = int(read(os.path.join(mram, "boots"))) + 1
        write_safely(os.path.join(mram, "boots"), str(count).encode())
    c = count.to_bytes(8, "big")
    write_safely(os.path.join(flash, "seed"), prf(seed, b"next seed", c))   # first replace the file...
    return prf(seed, b"boot seed", c, serial)    # ...then use what it held

flash, mram = tempfile.mkdtemp(), tempfile.mkdtemp()
write_safely(os.path.join(flash, "seed"), os.urandom(32))   # 256 bits loaded at the factory
write_safely(os.path.join(mram, "boots"), b"0")
serial = b"ROVER-0007"

for use_counter in (False, True):
    shutil.copy(os.path.join(flash, "seed"), os.path.join(flash, "backup"))  # flash image, sol 1
    first = boot(flash, mram, serial, use_counter)
    second = boot(flash, mram, serial, use_counter)
    shutil.copy(os.path.join(flash, "backup"), os.path.join(flash, "seed"))  # restored after a fault
    again = boot(flash, mram, serial, use_counter)
    print("counter %-5s two boots differ: %s, restored image repeats boot 1: %s"
          % (use_counter, first != second, again == first))
```

It prints:

```
counter False two boots differ: True, restored image repeats boot 1: True
counter True  two boots differ: True, restored image repeats boot 1: False
```

Without the counter, the restored image replays the first boot's seed, and
with it every key and nonce the first boot made. With the counter, the
replay is impossible. The boot seed then instantiates an HMAC_DRBG (§4.6),
with the serial number as the personalization string, before the first
instruction that needs a random byte.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Timeline of a rover's first boot: power on, seed file read and rewritten, DRBG ready within milliseconds, mission operations with counter nonces, sensors warm, start-up health tests, live entropy collected, reseed with prediction resistance" fill="currentColor" font-size="14">
<line x1="20" y1="120" x2="612" y2="120" stroke="currentColor" stroke-width="1.6"/>
<polygon points="620,120 610,115 610,125"/>
<circle cx="40" cy="120" r="4"/>
<text x="40" y="104" text-anchor="middle" font-size="12">power on</text>
<text x="40" y="90" text-anchor="middle" font-size="12" font-weight="bold">0 s</text>
<circle cx="130" cy="120" r="4"/>
<text x="130" y="146" text-anchor="middle" font-size="12">seed file read,</text>
<text x="130" y="160" text-anchor="middle" font-size="12">counter + 1,</text>
<text x="130" y="174" text-anchor="middle" font-size="12">next seed written</text>
<circle cx="220" cy="120" r="4"/>
<text x="220" y="104" text-anchor="middle" font-size="12" font-weight="bold">DRBG ready</text>
<text x="220" y="90" text-anchor="middle" font-size="12">milliseconds</text>
<rect x="240" y="112" width="190" height="16" rx="3" fill="currentColor" opacity="0.15"/>
<text x="345" y="104" text-anchor="middle" font-size="12">operations: counter nonces,</text>
<text x="345" y="90" text-anchor="middle" font-size="12">deterministic signatures</text>
<circle cx="440" cy="120" r="4"/>
<text x="440" y="146" text-anchor="middle" font-size="12">heaters warm the box;</text>
<text x="440" y="160" text-anchor="middle" font-size="12">start-up tests pass</text>
<text x="440" y="174" text-anchor="middle" font-size="12">on 1,024 samples</text>
<circle cx="560" cy="120" r="4"/>
<text x="560" y="104" text-anchor="middle" font-size="12" font-weight="bold">reseed</text>
<text x="560" y="90" text-anchor="middle" font-size="12">320 bits at cold rate</text>
<text x="560" y="146" text-anchor="middle" font-size="12">then reseed</text>
<text x="560" y="160" text-anchor="middle" font-size="12">every few minutes</text>
<text x="20" y="214" font-size="12" opacity="0.8">Before the reseed: no long-term keys are made on board.</text>
<text x="20" y="232" font-size="12" opacity="0.8">After it: prediction resistance, and new keys may be generated.</text>
</svg>
<figcaption>Figure 4.6. The rover's first boot. The factory seed makes the generator usable at once, so nothing ever blocks; the live noise source adds prediction resistance later, once it is warm, tested and counted at its coldest rate.</figcaption>
</figure>

### What the rover does

Put together, the design avoids both walls of §4.1:

- **Never block.** The DRBG is ready within milliseconds from the factory
  seed.
- **Never repeat.** The seed file is rewritten before use, and the boot
  counter defeats restored images.
- **Make no long-term keys at first boot.** Identity keys were made at the
  factory and installed with their certificates.
- **Use counters for nonces**, written ahead (§4.8) in the never-restored
  memory.
- **Sign without randomness**, with Ed25519, so a weak generator at signing
  time cannot leak the signing key.
- **Reseed when the source is ready**, after the start-up tests pass,
  crediting the entropy measured at the coldest qualification temperature.
- **Report the generator's state in telemetry.** An alarm nobody sees is no
  alarm.

## 4.10 Going deeper

*Level: expert.*

**Generators with input, formally.** A modern generator absorbs inputs over
time, some chosen by an attacker, and must recover after its state is
compromised. Dodis, Pointcheval, Ruhault, Vergnaud and Wichs defined
**robustness** for this model at ACM CCS 2013 and showed that the Linux
generator of the time did not meet it. The model explains why entropy should
accumulate in a pool and be used only when enough has arrived: reseeding a
few bits at a time lets an attacker who knows the state guess each addition
and keep up.

**Fortuna.** Niels Ferguson and Bruce Schneier's Fortuna (2003, in *Practical
Cryptography*) solves that problem without estimating entropy at all. It
spreads incoming events over 32 pools and reseeds from pool $i$ only on every
$2^i$-th reseed, so some pool always accumulates enough to defeat an attacker
who can guess small additions, whatever the real entropy rate. Apple
describes its kernel generator as derived from Fortuna, and FreeBSD has used
it since 11.0.

**Fast key erasure.** Daniel Bernstein's 2017 note describes the pattern of
the Linux ChaCha20 generator and `arc4random`: generate a block, keep its
first 32 bytes as the next key, wipe the old one, hand out the rest. It is the
SP 800-90A update step built from a stream cipher.

**What the proofs say about SP 800-90A.** Hirose proved HMAC_DRBG secure in
2008 under assumptions about HMAC. Joanne Woodage and Dan Shumow's analysis of
all three DRBGs (EUROCRYPT 2019) found caveats in how additional input and
reseeding are handled. In 2020 Cohney, Kwong, Paz, Genkin, Heninger, Ronen and
Yarom ("Pseudorandom Black Swans", IEEE S&P 2020) recovered CTR_DRBG states,
and then TLS keys, through cache timing from implementations whose AES used
lookup tables; the defense is constant-time primitives
([Chapter 5](05-Constant-Time-Programming.md)).

**Credit and conditioning.** The leftover hash lemma bounds the entropy of a
conditioned output for universal hash families; for HMAC or SHA-256 the
argument is computational, and SP 800-90B and 90C turn it into rules: credit
no more than the input entropy and no more than the output length, with a
margin before output counts as full entropy. Linux mixes in inputs it cannot
reason about, such as serial numbers, without crediting them.

**Hedging and deterministic randomness.** Where a generator might fail, design
the consumer so a failure is survivable. Deterministic signatures (RFC 6979,
EdDSA) remove the generator from signing. Hedged signatures and hedged
public-key encryption (Bellare and colleagues, 2009) mix the message and the
key into whatever randomness there is, so bad randomness degrades to the
security of a deterministic scheme rather than to none. ML-DSA in FIPS 204
signs in hedged mode by default. Nonce-misuse-resistant AEAD applies the same
idea to encryption.

## Check yourself

??? question "1. A program reads 1 GB from /dev/urandom on a server that has been running for a month. Has it 'used up' the entropy, so that the next key is weaker?"

    No. Once the generator holds a 256-bit secret seed, its output is as
    strong as ChaCha20 under that key however much is read, just as
    encrypting more data does not weaken an AES key. The only dangerous
    moment is before the first seeding, which `getrandom()` waits through.

??? question "2. Why is getrandom(buf, n, 0) better than opening /dev/urandom, even though they read the same generator?"

    It waits until the generator has been seeded once at boot, which older
    `/dev/urandom` did not; it needs no file descriptor, so it cannot fail
    because descriptors ran out or `/dev` is missing in a chroot; and for up
    to 256 bytes it always returns everything asked for.

??? question "3. A library seeds the random module with random.seed(0) for its unit tests, at import time. Which values in your application are now predictable?"

    Everything that uses the module-level functions of `random` after the
    import: `random.choice`, `random.randint`, `random.shuffle` and so on,
    including any token or password made with them. Values from `secrets`,
    `os.urandom` and `random.SystemRandom` are unaffected, because they
    cannot be seeded.

??? question "4. A pre-forking server builds a buffer of 64 KiB from os.urandom in the master process and serves session IDs from it in each worker. What goes wrong, and name two fixes."

    Every worker inherits the same buffer and hands out the same session IDs
    in the same order. Fixes: refill it in each child
    (`os.register_at_fork(after_in_child=...)`, or `MADV_WIPEONFORK` in C),
    or drop the buffer and call `secrets` for each ID.

??? question "5. An HMAC_DRBG implementation passes the CAVP vectors with empty additional input but fails those with additional input. Name a likely bug."

    It mixes the additional input only once, or in the wrong place.
    SP 800-90A requires it to be mixed in before generating (if non-empty) and
    again in the update after generating; with empty additional input the
    first step is skipped and the second has no data, so the bug is
    invisible.

??? question "6. Compute the repetition count cutoff for a source credited with 0.5 bits per sample at alpha = 2^-30."

    $C = 1 + \lceil 30 / 0.5 \rceil = 61$. A run of 61 identical samples
    raises the alarm.

??? question "7. Why must health tests run on raw samples rather than on the conditioned output?"

    A vetted conditioner such as SHA-256 makes any input, including a
    constant combined with a counter, look perfectly random. Tests on its
    output measure the hash function. Only the raw samples show that the
    noise source has stuck or drifted, as the hashed stuck source in §4.7
    shows.

??? question "8. A service encrypts 50 million messages a day under one AES-GCM key with random 96-bit nonces. How long until it reaches the SP 800-38D limit, and what is the collision probability then?"

    $2^{32} \approx 4.29 \times 10^9$ messages, so about 86 days. At that
    point the chance of any repeated nonce is about $n^2 / 2^{97} = 2^{-33}$.
    Rotate the key well before, or use counter nonces or 192-bit nonces.

??? question "9. A device keeps its GCM nonce counter in flash, written ahead in blocks of 1,000. An operator restores the flash from last month's backup. What happens, and what design avoids it?"

    The counter goes back to last month's value, and every nonce since is
    used again under the same key: a two-time pad and, for GCM, forgeries.
    Derive a new key per boot (mixing in a counter that is never restored, as
    the rover does), or use a nonce-misuse-resistant mode.

??? question "10. The rover's noise source was characterized at 2.34 bits per sample at 20 °C. Why is crediting that figure dangerous at −120 °C, and why will the health tests not warn you?"

    Thermal noise falls as $\sqrt{T}$; the model of §4.9 gives 1.89 bits
    per sample at 153 K, so 320 credited bits hold about 260 real ones. The
    proportion cutoff for the claimed 2.34 bits is 147 per window and the
    cold source averages 139, so no alarm fires. Health tests catch failures,
    not weakness; the credit must come from characterization at the coldest
    temperature.

## What you learned

- The operating system is the source of random bytes: `getrandom()` on Linux,
  `arc4random_buf()` or `getentropy()` on the BSDs and macOS, `ProcessPrng`
  or `BCryptGenRandom` on Windows, and `secrets` or `os.urandom` in Python.
  Never write a fallback, and never add your own inputs.
- `getrandom()` waits only once, until the generator is seeded at boot. Since
  Linux 5.6 `/dev/random` behaves the same way, and since 5.4 the kernel can
  make its own boot-time entropy from CPU jitter.
- `random` is for simulations. It shares one seedable state with every
  library in the process; `secrets` cannot be seeded.
- Fork, VM snapshots, checkpoints and cloned images copy generator state. The
  kernel handles VM clones through the generation ID; user-space generators
  must reseed in the child or keep no state.
- An SP 800-90A DRBG is a state machine around a small core, with limits, a
  reseed counter and an update after every request that gives backtracking
  resistance. Only a reseed gives prediction resistance.
- SP 800-90B entropy sources run start-up tests on at least 1,024 samples and
  two continuous tests, with cutoffs $1 + \lceil -\log_2\alpha / H \rceil$
  and $1 + \mathrm{CRITBINOM}(W, 2^{-H}, 1 - \alpha)$, on raw samples. They
  catch dead sources, not weak ones.
- Nonces must be unique, IVs unpredictable, signature nonces secret. Random
  96-bit GCM nonces are limited to $2^{32}$ messages per key; counters must be
  written ahead and never restored.

**Next:** [Chapter 5](05-Constant-Time-Programming.md), where the secret is
safe from the generator's side and must now be kept from leaking through the
time the code takes.

## Further reading

- Theodore Ts'o, Linux `drivers/char/random.c` (1994 onward), and the
  `random(4)` and `getrandom(2)` manual pages.
- Jason A. Donenfeld, "Random number generator enhancements for Linux 5.17
  and 5.18" (2022), and the kernel commits linked from the
  [OS random number generators](../../09-random/OS-RNG.md) page.
- Niels Ferguson, *The Windows 10 random number generation infrastructure*
  (Microsoft, 2019), and Microsoft's documentation of `BCryptGenRandom` and
  `ProcessPrng`.
- OpenBSD `arc4random(3)`, `getentropy(2)` and `minherit(2)` manual pages.
- Steven D'Aprano, PEP 506, "Adding A Secrets Module To The Standard
  Library" (2015); Victor Stinner, PEP 524, "Make os.urandom() blocking on
  Linux" (2016).
- NIST SP 800-90A Rev. 1, *Recommendation for Random Number Generation Using
  Deterministic Random Bit Generators* (Elaine Barker and John Kelsey, 2015).
- NIST SP 800-90B, *Recommendation for the Entropy Sources Used for Random
  Bit Generation* (Meltem Sönmez Turan and others, 2018).
- NIST SP 800-90C, *Recommendation for Random Bit Generator (RBG)
  Constructions* (2025).
- NIST CAVP, DRBG test vectors (`drbgtestvectors.zip`, CAVS 14.3, 2013), at
  the [Random Number Generators validation page](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/random-number-generators).
- NIST SP 800-38D, *Recommendation for Block Cipher Modes of Operation:
  Galois/Counter Mode (GCM) and GMAC* (Morris Dworkin, 2007), §8.
- RFC 8446 §5.3 (TLS 1.3 per-record nonce, 2018); RFC 8452 (AES-GCM-SIV,
  2019); RFC 9562 (UUIDs, 2024); RFC 6979 (deterministic ECDSA, 2013).
- Thomas Ristenpart and Scott Yilek, "When Good Randomness Goes Bad: Virtual
  Machine Reset Vulnerabilities and Hedging Deployed Cryptography" (NDSS 2010).
- Adam Everspaugh, Yan Zhai, Robert Jellinek, Thomas Ristenpart and Michael
  Swift, "Not-So-Random Numbers in Virtualized Linux and the Whirlwind RNG"
  (IEEE S&P 2014).
- Microsoft, *Virtual Machine Generation ID* (2012).
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman,
  "Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network
  Devices" (USENIX Security 2012).
- Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky and Philipp
  Jovanovic, "Nonce-Disrespecting Adversaries: Practical Forgery Attacks on
  GCM in TLS" (WOOT 2016).
- Hany Ragab, Alyssa Milburn, Kaveh Razavi, Herbert Bos and Cristiano
  Giuffrida, "CrossTalk: Speculative Data Leaks Across Cores Are Real"
  (IEEE S&P 2021; disclosed June 2020).
- Yevgeniy Dodis, David Pointcheval, Sylvain Ruhault, Damien Vergnaud and
  Daniel Wichs, "Security Analysis of Pseudo-Random Number Generators with
  Input: /dev/random is not Robust" (ACM CCS 2013).
- Niels Ferguson and Bruce Schneier, *Practical Cryptography* (Wiley, 2003),
  chapter 10 (Fortuna).
- Daniel J. Bernstein, "Fast-key-erasure random-number generators" (2017).
- Joanne Woodage and Dan Shumow, "An Analysis of NIST SP 800-90A"
  (EUROCRYPT 2019).
- Shaanan Cohney, Andrew Kwong, Shahar Paz, Daniel Genkin, Nadia Heninger,
  Eyal Ronen and Yuval Yarom, "Pseudorandom Black Swans: Cache Attacks on
  CTR_DRBG" (IEEE S&P 2020).
- Leo Dorrendorf, Zvi Gutterman and Benny Pinkas, "Cryptanalysis of the
  Random Number Generator of the Windows Operating System" (ACM CCS 2007).
- Cryptanalysis [Chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)
  for every failure story in §4.2, told in full; reference pages
  [OS random number generators](../../09-random/OS-RNG.md),
  [NIST DRBGs](../../09-random/NIST-DRBG.md) and
  [Retired generators](../../09-random/Retired.md).
