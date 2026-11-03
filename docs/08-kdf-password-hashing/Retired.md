# Retired password hashes

*PBKDF1 and the old Unix `crypt` formats: what each one did, what's wrong
with it, and how to spot it in `/etc/shadow`. Keep them only to check old
hashes, and store a new hash the next time the user logs in.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

A password hash retires when guessing gets cheap: too few rounds, a cost that
can't grow with hardware, a cap on password length, or no memory cost to slow
down GPUs. For new hashes use [Argon2id](Argon2.md) or [scrypt](scrypt.md);
yescrypt and [bcrypt](bcrypt.md) are acceptable too.

## The story

### PBKDF1 {#story-pbkdf1}

- **Who made it:** RSA Laboratories, PKCS #5 v1.5 (1993).
- **What for:** Turning a password into a DES key.
- **What it solved:** It introduced salt and iterations to password-based encryption.
- **Why it was retired:** Output limited to the hash length, and it used MD2, MD5 or SHA-1.
- **Incidents:** None famous; it was replaced before it mattered.
### DES-crypt {#story-des-crypt}

- **Who made it:** Robert Morris and Ken Thompson at Bell Labs, for Unix Version 7 (1979), described in their paper "Password Security: A Case History".
- **What for:** Storing Unix passwords so a stolen file doesn't give them away.
- **What it solved:** It introduced salt, 12 bits of it, and deliberate slowness: 25 rounds of DES.
- **Why it was retired:** Only 8 characters and far too fast today.
- **Incidents:** The Morris worm (1988), by Robert Morris's son, spread partly by guessing passwords against these hashes.
### MD5-crypt {#story-md5-crypt}

- **Who made it:** Poul-Henning Kamp, FreeBSD, 1994.
- **What for:** Longer passwords and no DES export issues.
- **What it solved:** No 8-character limit.
- **Why it was retired:** Fixed cost; Kamp himself declared it unsafe in 2012.
- **Incidents:** Huge numbers of old systems still had it when hash dumps leaked in the 2010s.
### sha256crypt and sha512crypt {#story-sha256crypt-and-sha512crypt}

- **Who made it:** Ulrich Drepper, 2007, for glibc.
- **What for:** A crypt with SHA-2 and adjustable rounds.
- **What it solved:** It gave Linux a standard, tunable hash.
- **Why it was retired:** No memory cost; distributions moved to yescrypt.
- **Incidents:** None in the scheme.

## PBKDF1

**What it was.** The key derivation function of RSA Labs' PKCS #5 v1.5
(November 1993), carried into RFC 2898 (2000) and RFC 8018 (2017). Hash the
password and salt, then hash the result $c - 1$ more times:

$$
T_1 = \mathrm{Hash}(P \,\Vert\, S), \quad T_2 = \mathrm{Hash}(T_1), \quad \ldots, \quad \mathit{DK} = \text{first } \mathit{dkLen} \text{ bytes of } T_c
$$

The hash is MD2, MD5 or SHA-1. Its encryption scheme, PBES1, takes an 8-byte
salt and splits 16 bytes of output into a DES or RC2 key and a CBC IV.

**What's wrong with it.** The output can't be longer than one hash: 16 bytes
with MD2 or MD5, 20 with SHA-1. That is too short for an AES-256 key, and all
three hashes are [retired](../07-hash/Retired.md). Like [PBKDF2](PBKDF2.md) it
costs only time, no memory. RFC 2898 already kept it only "for compatibility
with existing applications", and RFC 8018 says the same.

**Where you still see it.** Old encrypted private keys: PKCS #8 files marked
`pbeWithMD5AndDES-CBC` or `pbeWithSHA1AndDES-CBC`. Two library functions
stretch it past one hash length in their own nonstandard ways: .NET's
`PasswordDeriveBytes` and OpenSSL's `EVP_BytesToKey`. The OpenSSL one is plain
PBKDF1 with MD5 while the key and IV fit in one digest.

```python
import hashlib

def pbkdf1(password, salt, c, n, h=hashlib.sha1):
    t = h(password + salt).digest()
    for _ in range(c - 1):
        t = h(t).digest()
    if n > len(t):
        raise ValueError("derived key too long")
    return t[:n]

dk = pbkdf1(b"password", b"saltsalt", 1, 16, hashlib.md5)
print(dk[:8].hex(), dk[8:].hex())     # fdbdf3419fff98bd b0241390f62a9db3

try:
    pbkdf1(b"password", b"saltsalt", 1000, 32)   # enough for AES-256
except ValueError as e:
    print(e)                          # derived key too long
```

The first line is the DES key and IV that
`openssl enc -des-cbc -md md5 -S 73616c7473616c74 -k password -P` prints
(checked with LibreSSL 3.3, and with OpenSSL 3.0.13 after adding
`-provider legacy -provider default`, since OpenSSL 3 keeps DES in its
legacy provider).

## Unix crypt

`crypt(3)` turns a password and a salt into the string stored in
`/etc/shadow`. The prefix says which method made it:

| Starts with | Method |
|---|---|
| no `$`, 13 characters | DES-crypt |
| `_` | BSDi extended DES (a 24-bit salt and a set number of rounds) |
| `$1$` | MD5-crypt |
| `$2b$` (also `$2a$`, `$2y$`) | [bcrypt](bcrypt.md) |
| `$5$`, `$6$` | sha256crypt, sha512crypt |
| `$7$` | [scrypt](scrypt.md) |
| `$y$` | yescrypt |
| `!` or `*` | no usable password; a leading `!` locks the account |

### DES-crypt

**What it was.** Robert Morris and Ken Thompson's scheme for Unix, written up
in 1979. The first 8 characters of the password make a DES key, which
encrypts a block of zeros 25 times. A 12-bit salt (two characters, 4,096
values) changes DES's E-table, so the same password hashes differently for
different users and the commercial DES chips of the day couldn't be used to
crack it. The stored string is 2 salt characters and 11 hash characters.

**What's wrong with it.** Everything is small: characters after the eighth
are ignored, the key is 56 bits, there are only 4,096 salts, and the cost is
fixed at 25 DES runs. libxcrypt's `crypt(5)` says any password hashed this
way can be found, and keeps it only for systems that can't take anything
better.

The Python `crypt` module wraps the system `crypt(3)`. It is Unix only and
was removed in Python 3.13, so this example needs 3.12 or older (3.11 and
3.12 also print a DeprecationWarning):

```python
import crypt

print(crypt.crypt("password", "ab"))      # abJnggxhB/yWI
print(crypt.crypt("password123", "ab"))   # abJnggxhB/yWI: the "123" is ignored
```

On Python 3.13 or later, use Perl's built-in `crypt`, which calls the same
`crypt(3)`: `perl -le 'print crypt("password123", "ab")'` prints
`abJnggxhB/yWI` too.

### MD5-crypt

**What it was.** Poul-Henning Kamp's replacement, committed to FreeBSD in
November 1994. It runs 1,000 rounds of MD5 that mix the password, the salt
and the last digest, takes a salt of up to 8 characters, and stores the
128-bit result as 22 characters after `$1$` and the salt.

**What's wrong with it.** The 1,000 rounds are fixed and can't be raised. In
June 2012 Kamp declared it unsafe himself (CVE-2012-3287): GPUs could test
close to a million passwords a second against it, which made it as easy to
brute-force as DES-crypt had been in 1995. He asked everyone to move off it
"without undue delay".

**Where you still see it.** Old `/etc/shadow` files. OpenSSL 3.0's
`openssl passwd` still uses it by default (`-1`), and Apache's `$apr1$`
format is a variant of it.

### sha256crypt and sha512crypt

**What they were.** Ulrich Drepper's design, shipped in glibc 2.7 (October
2007) as `$5$` and `$6$`. His spec says security teams wanted a method built
on NIST-tested algorithms, so it is SHA-256 or SHA-512 repeated: 5,000 rounds
by default, set with `rounds=` from 1,000 to 999,999,999, and up to 16 salt
characters. sha512crypt was the default in Debian and Fedora until both moved
to yescrypt in 2021 (Debian 11, Fedora 35).

**What's wrong with them.** They cost only CPU time, no memory, so GPUs run
them well, and libxcrypt calls the default 5,000 rounds too low for modern
hardware. They aren't broken, and libxcrypt still lists them as acceptable
for new hashes if you raise the rounds. They are Legacy here because Argon2id,
scrypt and yescrypt make each guess far more expensive on a GPU.

**Where you still see them.** `/etc/shadow` files from before the switch,
and systems whose C library has no yescrypt (Debian 10, for one).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: PBKDF1 and DES-crypt by hand"

    PBKDF1 with SHA-1, password "password", salt "saltsalt", recomputed with Python's `hashlib`:

    | Iterations $c$ | Calculation | Value (20 bytes, the most PBKDF1 can give) |
    |---|---|---|
    | 1 | $T_1 = \text{SHA-1}(\text{"password"} \,\Vert\, \text{"saltsalt"})$ | `cab86dd6261710891e8cb56ee3625691a75df344` |
    | 2 | $T_2 = \text{SHA-1}(T_1)$ | `e3a8dfcf2eea6dc81d2ad154274faae96ff0b98a` |

    Asking for a 32-byte AES-256 key is an error: there is nothing past byte 20.

    DES-crypt's stored string `abJnggxhB/yWI` (from the example above) reads as 2 salt characters `ab`
    (12 bits) and 11 characters of hash (64 bits, 6 bits per character, the last character carrying 4).

??? abstract "The math, with formulas"

    **PBKDF1** (RFC 8018 §5.1):

    $$
    T_1 = \mathrm{Hash}(P \,\Vert\, S), \quad T_i = \mathrm{Hash}(T_{i-1}), \quad \mathit{DK} = \text{first } \mathit{dkLen} \text{ bytes of } T_c, \quad \mathit{dkLen} \le \mathit{HashLen}
    $$

    **DES-crypt:** $K$ = the low 7 bits of each of the first 8 characters (56 bits). The salt's 12 bits each
    swap a pair of entries in DES's E-table. Then

    $$
    X_0 = 0^{64}, \quad X_i = \mathrm{DES}'_K(X_{i-1}) \text{ for } i = 1 \ldots 25, \quad \mathit{output} = \mathit{salt} \,\Vert\, \mathrm{base64}(X_{25})
    $$

    **MD5-crypt** and **sha256/sha512crypt** follow the same shape: a starting digest of password, salt
    and password, then a fixed or chosen number of rounds, each hashing a mix of the previous digest, the
    password and the salt chosen by whether the round number is odd, divisible by 3 or by 7.

    **Cost of one guess:** PBKDF1 $c$ hashes, DES-crypt 25 DES runs, MD5-crypt 1,000 MD5 runs,
    sha512crypt 5,000 SHA-512 runs by default. None of them needs more than a few hundred bytes of memory.

??? tip "Watch it step by step: why DES-crypt fell"

    <div class="mars-steps" markdown>

    1. Take the password, keep only its first 8 characters, and make a 56-bit DES key.
    2. Pick a 2-character salt: one of 4,096 ways to tweak DES.
    3. Encrypt 64 zero bits with the tweaked DES, 25 times in a row.
    4. Store the salt and the 11-character result: `abJnggxhB/yWI`.
    5. "password123" gives the same string, because characters after the eighth never reach the key.
    6. 25 DES runs per guess was slow on a 1979 minicomputer; a modern GPU runs billions of DES operations a second.

    </div>

??? info "The math underneath"

    - **Iterated hashing:** repeating a hash adds time per guess but no memory, and can't lengthen the
      output, which is PBKDF1's ceiling.
    - **Salts** defeat precomputed tables: an attacker must attack each salt separately, and 4,096 salts is
      too few to matter today.
    - **Key space:** 8 characters of 7 bits is $2^{56}$; typed passwords use far fewer keys, so a dictionary and
      brute force cover them quickly.
    - What replaced them: [PBKDF2](PBKDF2.md) (any length, adjustable count), then the memory-hard
      [scrypt](scrypt.md) and [Argon2](Argon2.md).

## See also

- [Argon2](Argon2.md): the default for new password hashes
- [scrypt](scrypt.md): the base of yescrypt
- [bcrypt](bcrypt.md): `$2b$`, still acceptable
- [PBKDF2](PBKDF2.md): what replaced PBKDF1
- [Retired hashes](../07-hash/Retired.md): MD5, SHA-1 and MD4 themselves

## References

- [RFC 2898: PKCS #5 v2.0](https://www.rfc-editor.org/rfc/rfc2898) (Sections 5.1, 6.1) / [RFC 8018: PKCS #5 v2.1](https://www.rfc-editor.org/rfc/rfc8018) (Sections 5.1, 6.1, Appendix A.3)
- [.NET `PasswordDeriveBytes`](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.passwordderivebytes) / [OpenSSL `EVP_BytesToKey`](https://docs.openssl.org/3.0/man3/EVP_BytesToKey/) (Notes)
- Morris and Thompson, "Password Security: A Case History", *Communications of the ACM* 22(11), November 1979
- [libxcrypt `crypt(5)`](https://github.com/besser82/libxcrypt/blob/develop/doc/crypt.5) / [`shadow(5)`](https://man7.org/linux/man-pages/man5/shadow.5.html)
- [Python `crypt` module (3.12)](https://docs.python.org/3.12/library/crypt.html)
- [FreeBSD commit 3b2b7f7 (November 1994)](https://github.com/freebsd/freebsd-src/commit/3b2b7f71deba2a4efbd218d235ab774397500242) / [FreeBSD `crypt-md5.c`](https://github.com/freebsd/freebsd-src/blob/main/lib/libcrypt/crypt-md5.c) / [CVE-2012-3287](https://www.cve.org/CVERecord?id=CVE-2012-3287)
- [OpenSSL 3.0 `openssl-passwd`](https://docs.openssl.org/3.0/man1/openssl-passwd/)
- [Drepper, "Unix crypt using SHA-256 and SHA-512"](https://www.akkadia.org/drepper/SHA-crypt.txt) / [glibc 2.7 release announcement (2007)](https://sourceware.org/ml/libc-alpha/2007-10/msg00045.html)
- [Debian 11 release notes](https://www.debian.org/releases/bullseye/amd64/release-notes.en.txt) (Section 5.1.4) / [Fedora 35 change: yescrypt as default hashing method](https://fedoraproject.org/wiki/Changes/yescrypt_as_default_hashing_method_for_shadow)

*Weaker sources:* [Kamp, "Md5crypt Password scrambler is no longer considered safe by author" (2012)](https://phk.freebsd.dk/sagas/md5crypt_eol/), his own web page, for the GPU speed and his request to move off it.
