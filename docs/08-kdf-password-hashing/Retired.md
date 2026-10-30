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

## PBKDF1

**What it was.** The key derivation function of RSA Labs' PKCS #5 v1.5
(November 1993), carried into RFC 2898 (2000) and RFC 8018 (2017). Hash the
password and salt, then hash the result c − 1 more times:

```
T1 = Hash(P ‖ S),  T2 = Hash(T1),  …,  DK = first dkLen bytes of Tc
```

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
(checked with LibreSSL 3.3).

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
was removed in Python 3.13.

```python
import crypt

print(crypt.crypt("password", "ab"))      # abJnggxhB/yWI
print(crypt.crypt("password123", "ab"))   # abJnggxhB/yWI: the "123" is ignored
```

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
