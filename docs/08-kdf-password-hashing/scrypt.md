# scrypt

*The first memory-hard password hash. Still a good choice, and it's built into
Python's standard library.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

Colin Percival designed scrypt in 2009 for the Tarsnap backup service, to make
password cracking cost memory as well as time. It became RFC 7914 in 2016.
Before [Argon2](Argon2.md) it was the strongest common option, and it is still
fine.

Two relatives:

- **yescrypt:** builds on scrypt and is the default `/etc/shadow` hash (`$y$`) on
  many Linux distributions.
- **Litecoin and others:** use scrypt with small settings as proof-of-work.

## How it works

- Stretch the password and salt with [PBKDF2](PBKDF2.md)-HMAC-SHA-256 into a
  starting block.
- **ROMix:** fill a table of `N` blocks, each the hash of the one before. Then
  read `N` blocks back from the table at positions picked by the current data,
  mixing each into the running value. The mixing uses Salsa20/8.
- Run PBKDF2 once more to produce the output.

Memory needed is `128 × N × r` bytes. With N=2¹⁷ and r=8 that is 128 MiB per
guess, which is what makes GPU cracking costly.

| Parameter | Meaning | OWASP floor |
|---|---|---|
| `N` | CPU/memory cost, a power of 2 | 2¹⁷ |
| `r` | block size | 8 |
| `p` | parallelism | 1 |

## When to use it

- **Storing passwords** when Argon2 isn't available, or you want the standard
  library only.
- **Encrypting files with a passphrase:** age uses scrypt for its passphrase
  mode.

## Example (Python)

```python
import hashlib, os

salt = os.urandom(16)
key = hashlib.scrypt(b"correct horse battery staple", salt=salt,
                     n=2**17, r=8, p=1, maxmem=2**28, dklen=32)
print(key.hex())   # store salt and parameters next to it
```

`maxmem` has to be raised: Python's default limit is 32 MiB, less than these
settings need.

## Security notes

- Store `N`, `r`, `p` and the salt with the hash so you can raise the cost
  later.
- Compare hashes with `hmac.compare_digest`, not `==`.
- scrypt's memory use can't be split from its time cost the way Argon2's can;
  that's one reason Argon2 replaced it as the first choice.

## See also

- [Argon2](Argon2.md): the newer first choice
- [PBKDF2](PBKDF2.md): what scrypt uses at both ends
- [bcrypt](bcrypt.md): the older CPU-only option

## References

- [RFC 7914: scrypt](https://www.rfc-editor.org/rfc/rfc7914)
- [Percival, "Stronger Key Derivation via Sequential Memory-Hard Functions" (2009)](https://www.tarsnap.com/scrypt/scrypt.pdf)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
