# bcrypt

*The password hash most web frameworks grew up with. CPU-hard rather than
memory-hard, but with a sensible cost setting it's still fine.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

Niels Provos and David Mazières published bcrypt in 1999 for OpenBSD. It has no
RFC; the paper and the OpenBSD code are the reference. Its big idea was a
**cost factor** you can raise as hardware gets faster, years before scrypt and
Argon2 made that standard.

A stored bcrypt hash is one 60-character string:

```
$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
```

- `2b`: the version
- `12`: the cost, meaning 2¹² rounds
- then 22 characters of salt (128 bits) and 31 characters of hash (184 bits)

## How it works

bcrypt is built on the Blowfish cipher's slow key setup ("Eksblowfish"):

1. Set up Blowfish's tables from the password and salt.
2. Repeat `2^cost` times: re-key the tables with the password, then with the
   salt. This loop is where the time goes.
3. Encrypt the fixed text `OrpheanBeholderScryDoubt` 64 times with the final
   tables; the result is the hash.

Each step needs Blowfish's 4 KB of tables, which slows GPUs somewhat, but not
like the megabytes Argon2 and scrypt demand.

## When to use it

- **Existing systems** that already use it: keep it, with cost 10 or higher
  (OWASP's floor). Raise the cost and rehash at login as servers get faster.
- **New systems:** prefer [Argon2id](Argon2.md).
- **SSH key files:** OpenSSH protects private keys with `bcrypt_pbkdf`, a KDF
  built on bcrypt (`ssh-keygen -a` sets the rounds: 16 by default until 2023,
  24 after, 32 since OpenSSH 10.6 in 2026).

## Example (Python)

Needs the `bcrypt` package:

```python
import bcrypt

password = b"correct horse battery staple"
stored = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
print(stored)                              # b'$2b$12$...'
print(bcrypt.checkpw(password, stored))    # True
```

## Security notes

- **72-byte limit:** most implementations ignore everything past the first 72
  bytes of the password. To allow longer ones, pre-hash with SHA-256 and
  base64-encode the digest first; a raw digest can contain zero bytes, which
  some implementations treat as the end of the string.
- Each cost step doubles the time; 12 takes roughly a quarter of a second on a
  typical server.
- The salt is built into the string; there's nothing extra to store.

## See also

- [Argon2](Argon2.md): the memory-hard first choice
- [scrypt](scrypt.md) / [PBKDF2](PBKDF2.md): the other password hashes
- [SSH](../protocols/SSH.md): where `bcrypt_pbkdf` shows up

## References

- [Provos & Mazières, "A Future-Adaptable Password Scheme" (USENIX 1999)](https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
