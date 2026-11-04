# bcrypt

*The password hash most web frameworks grew up with. CPU-hard rather than
memory-hard, but with a sensible cost setting it's still fine.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
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
- `12`: the cost, meaning $2^{12}$ rounds
- then 22 characters of salt (128 bits) and 31 characters of hash (184 bits)

## The story

- **Who made it:** Niels Provos and David Mazières, USENIX 1999, for OpenBSD, built on Blowfish's slow key setup.
- **What for:** A password hash you can make slower as computers get faster.
- **What it solved:** Unix's old DES and MD5 crypt had fixed cost; bcrypt has a work factor.
- **Where it stands:** Still acceptable and very common (Ruby on Rails, Django option, PHP's password_hash). Argon2id is preferred for new systems.
- **Incidents:** **crypt_blowfish (2011):** a sign bug made some passwords with non-ASCII characters weaker, hence the `$2y$` prefix. **The 72-byte limit:** bcrypt ignores everything past 72 bytes. In 2024 Okta disclosed that because it hashed user ID plus username plus password with bcrypt for a cache key, users with very long usernames could log in without the right password. **Ashley Madison (2015):** the bcrypt hashes held, but 11 million passwords were cracked from a weaker MD5 token stored next to them.

## How it works

bcrypt is built on the Blowfish cipher's slow key setup ("Eksblowfish"):

1. Set up Blowfish's tables from the password and salt.
2. Repeat $2^{\mathit{cost}}$ times: re-key the tables with the password, then with the
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

Needs `pip install bcrypt`:

```python
import bcrypt

password = b"correct horse battery staple"
stored = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
print(stored)                              # b'$2b$12$...'
print(bcrypt.checkpw(password, stored))    # True
```

`gensalt` picks a random salt, so `stored` is different every run.

## Security notes

- **72-byte limit:** many implementations silently ignore everything past the
  first 72 bytes of the password; the Python `bcrypt` package (5.0) raises
  `ValueError` instead. To allow longer ones, pre-hash with SHA-256 and
  base64-encode the digest first; a raw digest can contain zero bytes, which
  some implementations treat as the end of the string.
- Each cost step doubles the time; 12 takes roughly a quarter of a second on a
  typical server.
- The salt is built into the string; there's nothing extra to store.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: reading one bcrypt hash"

    Made with the Python `bcrypt` library from the password "password" and a fixed salt, so anyone can
    repeat it:

    ```
    $2b$12$abcdefghijklmnopqrstuutwZ1IOTtu3SsEBT5lI/LFncP31tIybm
    ```

    | Part | Characters | Meaning |
    |---|---|---|
    | `$2b$` | 4 | version (the 2014 fix of `$2a$`) |
    | `12$` | 3 | cost: the slow loop runs $2^{12} = 4{,}096$ times |
    | `abcdefghijklmnopqrstuu` | 22 | 16-byte salt, in bcrypt's own base-64 alphabet |
    | `twZ1IOTtu3SsEBT5lI/LFncP31tIybm` | 31 | 23 bytes of the 24-byte result |

    The same password and salt at cost 4 give `…uughE8Ev8uGFaUgY2cNEySvxngrb/Jzdm`: a different hash, and
    256 times less work ($2^{12} \div 2^4$). Each step of 1 in the cost doubles the time.

??? abstract "The math, with formulas"

    From Provos and Mazières (USENIX 1999):

    ```
    state = InitState()                          Blowfish's P-array and S-boxes, digits of π
    state = ExpandKey(state, salt, key)
    repeat 2^cost times:
        state = ExpandKey(state, 0, key)
        state = ExpandKey(state, 0, salt)
    ctext = "OrpheanBeholderScryDoubt"           24 bytes, three 64-bit blocks
    repeat 64 times:
        ctext = EncryptECB(state, ctext)
    hash = cost ‖ salt ‖ ctext
    ```

    - **Key:** the password bytes plus a closing zero byte, at most 72 bytes; anything longer is cut off
      (newer libraries, like Python's `bcrypt` 5, refuse it instead).
    - **Blowfish:** a 16-round Feistel cipher with 18 round keys and four 256-entry S-boxes (4 KiB),
      $F(x) = ((S_1[a] + S_2[b]) \oplus S_3[c]) + S_4[d]$ on the four bytes $a, b, c, d$ of $x$, sums mod $2^{32}$.
    - **ExpandKey** XORs the key into the 18 round keys, then encrypts a running block over and over
      (mixing in the salt) to overwrite all 1,042 table entries: 521 Blowfish encryptions per call.

??? tip "Watch it step by step: why bcrypt is slow"

    <div class="mars-steps" markdown>

    1. Load Blowfish's starting tables: 4 KiB of the digits of $\pi$.
    2. Mix the password and the salt into the tables (one ExpandKey: 521 encryptions).
    3. Re-key the tables from the password, then from the salt. That is one round of the slow loop.
    4. Repeat 4,096 times at cost 12: over 4 million Blowfish encryptions for one guess.
    5. Encrypt "OrpheanBeholderScryDoubt" 64 times with the final tables.
    6. Write out `$2b$12$`, the salt and the result: a 60-character string.

    </div>

??? info "The math underneath"

    - **Key stretching:** an adjustable work factor, raised as hardware gets faster (OWASP asks for at
      least 10).
    - **Small-memory hardness:** every step reads the 4 KiB tables at data-dependent places, which suits CPU
      caches and hurts GPUs, but it is not memory-hard in the [Argon2](Argon2.md) sense; FPGAs crack it well.
    - **Feistel ciphers** and [Blowfish](../04-symmetric-ciphers/Retired.md).
    - **The 72-byte limit** and why pre-hashing long passwords needs care (encode the hash, since a raw
      zero byte would end the key).

## See also

- [Argon2](Argon2.md): the memory-hard first choice
- [scrypt](scrypt.md) / [PBKDF2](PBKDF2.md): the other password hashes
- [SSH](../protocols/SSH.md): where `bcrypt_pbkdf` shows up

## References

- [Provos & Mazières, "A Future-Adaptable Password Scheme" (USENIX 1999)](https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
