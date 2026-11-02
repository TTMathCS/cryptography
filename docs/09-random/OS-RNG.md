# OS random number generators

*`getrandom()`, `arc4random` and `BCryptGenRandom`: the generator built into
the operating system, and the one your code should ask for keys, nonces and
tokens.*

**Status and standards:** see [Random number generation](../index.md#9-random-number-generation)
in the main table.

## What it is

Every major OS runs a cryptographic random generator in the kernel. It
collects unpredictable events, hashes them into a seed, and uses the seed as
the key of a fast cipher-based generator. Programs ask it for bytes with a
system call:

| System | Ask for bytes with | Generator behind it |
|---|---|---|
| Linux | `getrandom()`, `/dev/urandom`, `/dev/random` | ChaCha20 since 4.8 (2016) |
| OpenBSD | `arc4random()`, `getentropy()` | ChaCha20 since 5.5 (2014), RC4 before |
| FreeBSD | `arc4random()`, `getrandom()` | ChaCha20 in libc since 12.0 (2018) |
| macOS | `arc4random()`, `getentropy()` | AES since 10.12 (2016); Fortuna-derived kernel generator |
| Windows | `BCryptGenRandom` | SP 800-90 CTR_DRBG |

In Python, `os.urandom` and the `secrets` module (3.6+) sit on top of these.
Since Python 3.6, `os.urandom` on Linux calls `getrandom()` and waits until
the kernel generator is seeded; on Windows it calls `BCryptGenRandom` since
3.11.

## How it works

### Linux

Theodore Ts'o's driver has been in Linux since 1.3.30 (1995). It had two
outputs. `/dev/random` kept an estimate of how much entropy the pool held,
subtracted from it on every read, and blocked when it ran low.
`/dev/urandom` never blocked. Since then:

- **3.17 (2014):** the `getrandom()` system call, asked for by the LibreSSL
  developers. It needs no file descriptor, and it waits only once: until the
  pool has been seeded at boot.
- **4.8 (2016):** Ts'o replaced the non-blocking pool with a
  [ChaCha20](../04-symmetric-ciphers/ChaCha.md#the-linux-kernel-rng)
  generator and stopped pretending to track how much entropy it used up.
- **5.6 (2020):** Andy Lutomirski removed the blocking pool. `/dev/random`
  now waits until the generator is seeded once, then reads exactly like
  `/dev/urandom`. `getrandom(GRND_INSECURE)` was added for the few callers
  that want bytes before that.
- **5.17 and 5.18 (2022):** Jason Donenfeld replaced SHA-1 with BLAKE2s for
  extracting from the input pool. He also made `/dev/urandom` wait for
  seeding, but that hung qemu boots on arm, m68k and other machines without
  a cycle counter, and Linus reverted it. What stayed: a `/dev/urandom` read
  before seeding first runs the CPU-jitter entropy routine, which on x86,
  and likely any machine with a working cycle counter, seeds the generator
  in about a second.

Today a BLAKE2s hash collects the input, and once 256 bits of entropy have
been credited it becomes the ChaCha20 key, refreshed every 60 seconds. All
three interfaces read from that one generator.

### The others

- **OpenBSD:** `arc4random` runs ChaCha20 inside each process and reseeds
  from the kernel with `getentropy()` on a regular basis and after `fork()`.
- **macOS:** Apple describes the kernel generator as Fortuna-derived,
  aiming at 256-bit security. It is seeded from the Secure Enclave's
  hardware generator, boot-time jitter, interrupt timing, a seed file and,
  on Intel Macs, RDSEED and RDRAND. `arc4random` used RC4 until macOS 10.12
  and AES after.
- **Windows:** call `BCryptGenRandom(NULL, buf, len,
  BCRYPT_USE_SYSTEM_PREFERRED_RNG)`. The default provider has implemented
  CTR_DRBG from [SP 800-90](NIST-DRBG.md) since Vista SP1. The older
  `CryptGenRandom` is deprecated.

### Why "urandom is fine"

The old `/dev/random` treated entropy like fuel that reading burns. It
isn't. Once a generator holds a 256-bit key that nobody else knows, its
output doesn't get weaker as you read more of it. That is the same thing
every stream cipher relies on. The Linux man page calls `/dev/random` a
legacy interface and says `/dev/urandom` is enough for everything except
early boot.

The early-boot caveat is real. Right after power-on, especially on a small
device with no disk, no keyboard and no cycle counter, the pool may not be
seeded yet, and older `/dev/urandom` answered anyway. Routers and firewalls
that made their SSH and TLS keys on first boot did exactly that. In 2012
researchers scanned the whole internet and factored the RSA keys of 0.50%
of the TLS hosts they found ([Mining your Ps and Qs](Retired.md#mining-your-ps-and-qs-2012)).
`getrandom()` waits instead, and so does `os.urandom` in Python 3.6+. On
current kernels `/dev/urandom` still doesn't wait on machines where the
jitter routine can't run; the kernel logs "uninitialized urandom read" when
that happens. The kernel's own comments say to use `getrandom()` for this
reason.

## When to use it

- **For every secret:** keys, nonces, IVs, salts, session IDs,
  password-reset tokens, generated passwords.
- **Through your language or library:** `secrets` and `os.urandom` in
  Python, `crypto/rand` in Go, `randombytes_buf` in libsodium. OpenSSL 3
  seeds its own DRBG from the OS.
- **Not** Python's `random`, C's `rand()` or anything seeded with the time.
  See [Retired generators](Retired.md).
- If a FIPS 140-3 module is required, it runs an approved
  [NIST DRBG](NIST-DRBG.md) seeded from a validated entropy source.

## Example (Python)

```python
import secrets, string

key = secrets.token_bytes(32)             # 256-bit key, straight from os.urandom
link = secrets.token_urlsafe(32)          # password-reset token, 32 random bytes
pin = f"{secrets.randbelow(10**6):06d}"   # 6-digit code, no modulo bias
abc = string.ascii_letters + string.digits
pw = "".join(secrets.choice(abc) for _ in range(16))

print(len(key), len(link), len(pin), len(pw))   # 32 43 6 16
```

The values change every run; only the lengths are fixed. `token_urlsafe`
base64-encodes its 32 bytes into 43 characters.

## Security notes

- Call `getrandom()` or your library rather than opening `/dev/urandom`
  yourself. A file read can fail when file descriptors run out or `/dev`
  is missing in a chroot, and it doesn't wait at early boot.
- For a number below n, use `secrets.randbelow(n)` or
  `arc4random_uniform(n)`, not `random_value % n`, which favours small
  numbers when n doesn't divide the range evenly.
- A virtual machine restored twice from one snapshot runs twice with the
  same generator state. Hyper-V and QEMU expose a VM generation ID, and
  since Linux 5.18 the kernel reseeds when it changes.
- A generator that keeps state in user space must reseed after `fork()`, or
  parent and child print the same bytes. OpenBSD's `arc4random` does.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Linux's fast key erasure"

    Linux's generator makes each ChaCha20 block, keeps the first 32 bytes as its next key, and hands out
    the rest. With the all-zero key and nonce (the RFC 8439 test key, so anyone can check it with
    Python's `cryptography` library):

    | Step | Bytes | Value |
    |---|---|---|
    | ChaCha20 block 0 under key `00` × 32 | 64 | `76b8e0ad…b2ee6586` |
    | Bytes 0–31 become the new key, then the old key is wiped | 32 | `76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7` |
    | Bytes 32–63 go to the caller | 32 | `da41597c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586` |
    | Next call: block 0 under the new key, first 32 bytes | 32 | `b0fd14ff96a0bda154c329082c9c6533bb4c9473bf5dde138f82c9ac5553d958` |

    A real kernel's key comes from 256 bits of collected entropy, never zeros, and it is mixed with fresh
    input every 60 seconds.

??? abstract "The math, with formulas"

    ```
    Collect:     pool = BLAKE2s(pool ‖ event)                    interrupts, disk, jitter, RDSEED, …
    Seed:        once 256 bits are credited,  key = BLAKE2s-derived 32 bytes from the pool
    Each call:   block = ChaCha20(key, nonce, counter)
                 key   = block[0 … 31]                             old key erased
                 out   = block[32 … 63]  (more blocks for longer requests)
    ```

    **Why reading never "uses up" entropy:** if ChaCha20 is a secure PRF, outputs from a secret 256-bit key
    are indistinguishable from random no matter how many are read. The best known attack is still guessing
    the key: 2²⁵⁶ tries.

    **Credited entropy:** each event is credited conservatively (for example, one bit for every 64
    interrupts); the generator counts the credit and unblocks `getrandom()` only at 256 bits.

??? tip "Watch it step by step: from keystrokes to keys"

    <div class="mars-steps" markdown>

    1. Interrupt timings, disk timings and CPU jitter arrive. Each is hashed into the BLAKE2s pool.
    2. The kernel credits each event with a small, careful entropy estimate.
    3. At 256 credited bits, the pool's hash becomes the ChaCha20 key. `getrandom()` stops waiting.
    4. A program asks for 32 bytes: one ChaCha20 block, first half becomes the next key, second half is returned.
    5. Every 60 seconds the key is refreshed with whatever new input the pool has gathered.
    6. A stolen key reveals nothing earlier (it was overwritten) and goes stale at the next refresh.

    </div>

??? info "The math underneath"

    - **Entropy and min-entropy:** how many bits an attacker would have to guess, measured by the most
      likely value.
    - **Randomness extraction:** hashing many weak inputs into one strong key (the leftover hash lemma and
      computational extractors, see [HKDF](../08-kdf-password-hashing/HKDF.md)).
    - **Stream ciphers as generators:** [ChaCha20](../04-symmetric-ciphers/ChaCha.md#the-linux-kernel-rng).
    - **Fast key erasure** (Bernstein, 2017): forward secrecy for a generator at almost no cost.
    - **Boot-time entropy holes:** what goes wrong before the pool is seeded,
      [Mining your Ps and Qs](Retired.md#mining-your-ps-and-qs-2012).

## See also

- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md#the-linux-kernel-rng):
  the Linux generator's cipher, with fast key erasure
- [NIST DRBG](NIST-DRBG.md): HMAC_DRBG, CTR_DRBG and the FIPS rules
- [Retired generators](Retired.md): what not to use, and what went wrong
- [BLAKE](../07-hash/BLAKE.md): BLAKE2s, the Linux input-pool hash

## References

- Linux man pages: [random(4)](https://man7.org/linux/man-pages/man4/random.4.html) / [getrandom(2)](https://man7.org/linux/man-pages/man2/getrandom.2.html) / [`drivers/char/random.c`](https://github.com/torvalds/linux/blob/master/drivers/char/random.c)
- Linux commits: [getrandom (3.17)](https://github.com/torvalds/linux/commit/c6e9d6f38894) / [ChaCha20 CRNG (4.8)](https://github.com/torvalds/linux/commit/e192be9d9a30) / [`/dev/random` almost like `/dev/urandom` (5.6)](https://github.com/torvalds/linux/commit/30c08efec888) / [GRND_INSECURE (5.6)](https://github.com/torvalds/linux/commit/75551dbf112c) / [BLAKE2s (5.17)](https://github.com/torvalds/linux/commit/9f9eff85a008) / [block in `/dev/urandom`](https://github.com/torvalds/linux/commit/6f98a4bfee72) and [its revert](https://github.com/torvalds/linux/commit/0313bc278dac) / [opportunistic init (5.18)](https://github.com/torvalds/linux/commit/48bff1053c17) / [vmgenid (5.18)](https://github.com/torvalds/linux/commit/af6b54e2b5ba)
- [OpenBSD `arc4random(3)`](https://man.openbsd.org/arc4random.3) / [FreeBSD `arc4random(3)`](https://man.freebsd.org/cgi/man.cgi?query=arc4random&sektion=3) / [FreeBSD `getrandom(2)`](https://man.freebsd.org/cgi/man.cgi?query=getrandom&sektion=2) / [Apple Libc `arc4random.3`](https://github.com/apple-oss-distributions/Libc/blob/main/gen/FreeBSD/arc4random.3)
- [Apple Platform Security: Random number generation](https://support.apple.com/guide/security/random-number-generation-seca0c73a75b/web)
- [Microsoft: `BCryptGenRandom`](https://learn.microsoft.com/en-us/windows/win32/api/bcrypt/nf-bcrypt-bcryptgenrandom)
- Python: [`os.urandom`](https://docs.python.org/3/library/os.html#os.urandom) / [`secrets`](https://docs.python.org/3/library/secrets.html) / [PEP 506](https://peps.python.org/pep-0506/) / [PEP 524](https://peps.python.org/pep-0524/)
- [Heninger, Durumeric, Wustrow and Halderman, "Mining Your Ps and Qs" (USENIX Security 2012)](https://factorable.net/paper.html)
