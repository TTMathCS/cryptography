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

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 385" role="img" aria-labelledby="sk-c-bcost-t"><title id="sk-c-bcost-t">Bars for bcrypt cost factors 8 to 14: each bar is twice the one before, from 256 loops to 16,384</title><defs><filter id="sk-c-bcost-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-bcost-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-bcost-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-bcost-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-bcost-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="385" filter="url(#sk-c-bcost-paper)"/><g filter="url(#sk-c-bcost-pen)"><text x="30" y="44" class="h">One step of cost, twice the time</text><path class="p room" d="M60 320 L110 320 L110 316 L60 316Z"/><text x="85" y="342" text-anchor="middle" class="s">8</text><text x="85" y="308" text-anchor="middle" class="s">256</text><path class="p room" d="M136 320 L186 320 L186 313 L136 313Z"/><text x="161" y="342" text-anchor="middle" class="s">9</text><text x="161" y="305" text-anchor="middle" class="s">512</text><path class="p room" d="M212 320 L262 320 L262 306 L212 306Z"/><text x="237" y="342" text-anchor="middle" class="s">10</text><text x="237" y="298" text-anchor="middle" class="s">1,024</text><path class="p room" d="M288 320 L338 320 L338 291 L288 291Z"/><text x="313" y="342" text-anchor="middle" class="s">11</text><text x="313" y="283" text-anchor="middle" class="s">2,048</text><path class="p gold" d="M364 320 L414 320 L414 262 L364 262Z"/><text x="389" y="342" text-anchor="middle" class="s">12</text><text x="389" y="254" text-anchor="middle" class="s">4,096</text><path class="p room" d="M440 320 L490 320 L490 205 L440 205Z"/><text x="465" y="342" text-anchor="middle" class="s">13</text><text x="465" y="197" text-anchor="middle" class="s">8,192</text><path class="p room" d="M516 320 L566 320 L566 90 L516 90Z"/><text x="541" y="342" text-anchor="middle" class="s">14</text><text x="541" y="82" text-anchor="middle" class="s">16,384</text><path class="p" d="M40 320 L600 320"/><text x="320" y="370" text-anchor="middle" class="s">cost factor: the key setup loop runs 2^cost times</text><text x="60" y="90" class="s">Raise the cost by one every few years as computers</text><text x="60" y="110" class="s">get faster; old hashes are upgraded at the next login.</text></g></svg><figcaption>Sketched for this page. To scale.</figcaption></figure>

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
