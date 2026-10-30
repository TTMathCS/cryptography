# Argon2

*The first choice for storing passwords. Slow on purpose, and it eats memory,
so guessing passwords on GPUs or custom chips stops being cheap.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

A password is low-entropy: attackers who steal a hash database just try
billions of likely passwords. A good password hash makes each try expensive.
Argon2 won the Password Hashing Competition in 2015 and became RFC 9106 in
2021.

| Variant | Memory access | Use |
|---|---|---|
| **Argon2id** | first pass data-independent, then data-dependent | the default for passwords |
| Argon2i | data-independent | side-channel-resistant, weaker against GPUs |
| Argon2d | data-dependent | strongest against GPUs, leaks timing; crypto-currency, not logins |

## How it works

- Fill a large block of memory (the `m` parameter, in KiB) with chained hashes
  of the password and salt, using BLAKE2b inside.
- Make `t` passes over it, each block mixing in earlier blocks chosen by
  position (the "i" part) or by content (the "d" part).
- `p` lanes can run in parallel.
- Hash the final memory into the output tag.

Because the whole array has to be in memory at once, an attacker can't trade
it for cheap parallel hardware. That property is called **memory-hard**.

## When to use it

- **New login systems:** Argon2id.
- **Starting parameters:**
    - RFC 9106: t=3, p=4, m=64 MiB when memory is tight, or t=1, p=4, m=2 GiB.
    - OWASP's floor: m=19 MiB, t=2, p=1.
    - Tune so one hash takes a noticeable fraction of a second on your server.
- **When it isn't available:** [scrypt](scrypt.md), then [bcrypt](bcrypt.md),
  then [PBKDF2](PBKDF2.md) if FIPS rules force it.

## Example (Python)

Needs `argon2-cffi`:

```python
from argon2 import PasswordHasher

ph = PasswordHasher()                 # Argon2id, t=3, m=64 MiB, p=4
stored = ph.hash("correct horse battery staple")
print(stored)                         # $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

print(ph.verify(stored, "correct horse battery staple"))   # True, raises on a wrong password
```

The stored string carries the variant, parameters and salt, so you can raise
the cost later and rehash on the next login (`ph.check_needs_rehash(stored)`).

## Security notes

- Each user gets a random salt; it's not secret and lives in the stored string.
- Too little memory throws away the point of Argon2. Set `m` as high as the
  server can afford.
- Consider a "pepper": a server-side secret mixed in, kept outside the
  database.

## See also

- [scrypt](scrypt.md) / [bcrypt](bcrypt.md) / [PBKDF2](PBKDF2.md): the older password hashes
- [HKDF](HKDF.md): the fast KDF for secrets that aren't passwords
- [Does precomputing password hashes work?](../FAQ.md)

## References

- [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Password Hashing Competition](https://www.password-hashing.net/)
