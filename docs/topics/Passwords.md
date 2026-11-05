# Passwords guide

*Choosing passwords, and storing other people's passwords safely if you write software. Four parts: stop at the one you need.*

[In one minute](#in-one-minute) · [Do it](#do-it) · [Expert](#expert) · [Now and next](#now-and-next)

## In one minute

A good password is **long** and **used in one place only**. Length beats strange symbols: four random words are stronger than `P@ssw0rd!` and easier to remember.

Nobody can remember a different long password for every site, so use a **password manager**. It remembers them all behind one strong password. Then turn on a **second step** (a code from an app, or a security key) wherever you can.

A well-built website never keeps your password itself. It keeps a **scrambled fingerprint** of it, made on purpose to be slow to check. If the site is broken into, the thieves get fingerprints that take years to turn back into passwords, not the passwords.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 330" role="img" aria-labelledby="sk-c-hashstore-t"><title id="sk-c-hashstore-t">A password plus a random salt goes through a deliberately slow function, and only the resulting fingerprint is stored</title><defs><filter id="sk-c-hashstore-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-hashstore-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-hashstore-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-hashstore-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-hashstore-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="330" filter="url(#sk-c-hashstore-paper)"/><g filter="url(#sk-c-hashstore-pen)"><text x="30" y="44" class="h">What a good website keeps</text><path class="p gold" d="M30 110 L180 110 L180 160 L30 160Z"/><text x="105.0" y="141.0" text-anchor="middle" class="s">your password</text><text x="200" y="104" class="s">+ a random salt</text><path class="p " d="M182 135 L268 135" marker-end="url(#sk-c-hashstore-ah)"/><path class="p rust" d="M270 100 L410 100 L410 170 L270 170Z"/><text x="340.0" y="135.0" text-anchor="middle" class="s">slow on purpose</text><text x="340.0" y="153.0" text-anchor="middle" class="s">Argon2, bcrypt</text><path class="p " d="M412 135 L470 135" marker-end="url(#sk-c-hashstore-ah)"/><path class="p room" d="M472 110 L612 110 L612 160 L472 160Z"/><text x="542.0" y="141.0" text-anchor="middle" class="s">fingerprint</text><text x="472" y="190" class="s">this is all it stores</text><text x="30" y="250" class="s">Logging in: the same steps again, then compare the fingerprints.</text><text x="30" y="290" class="s">A thief who copies the fingerprints must guess passwords and run the slow step</text><text x="30" y="310" class="s">for every guess. The salt means each account has to be guessed on its own.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## Do it

**For yourself**

- A password manager: the one built into your phone or browser, Bitwarden, 1Password, KeePassXC.
- One long master password: four to six random words.
- A second step on email, bank and password manager first. Better still, **passkeys** where a site offers them: there is no password to steal.
- Check whether an address appeared in a breach: [Have I Been Pwned](https://haveibeenpwned.com/).

**Make a random password or key**

```
openssl rand -base64 24            # 32 characters, 192 random bits
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

**Store passwords in your program** (Python, with `pip install argon2-cffi`)

```python
from argon2 import PasswordHasher

ph = PasswordHasher()                     # Argon2id, 64 MiB, 3 passes, 4 lanes
stored = ph.hash("correct horse")         # $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>: store this string
ph.verify(stored, "correct horse")        # True; raises VerifyMismatchError on a wrong password
if ph.check_needs_rehash(stored):         # after you raise the cost, upgrade at the next login
    stored = ph.hash("correct horse")
```

The string holds the algorithm, the cost, the salt and the hash, so you store one field and never handle the salt yourself. Other languages have the same in their Argon2 or bcrypt library (Java: Spring Security's `Argon2PasswordEncoder`; Node.js: `argon2`; Go: `golang.org/x/crypto/argon2`; PHP: `password_hash($p, PASSWORD_ARGON2ID)`).

**Linux accounts** use yescrypt (`$y$` in `/etc/shadow`) by default on Debian 11+, Ubuntu 22.04+ and Fedora 35+. `passwd` does it for you.

## Expert

### The algorithms

| Job | Use | Standard | Avoid |
|---|---|---|---|
| Store passwords | **Argon2id**, at least m = 19 MiB, t = 2, p = 1 (OWASP's floor) | RFC 9106 | plain text, encryption, a single fast hash (MD5, SHA-1, SHA-256), unsalted anything |
| Store passwords, second choices | **scrypt** (N = 2^17, r = 8, p = 1); **bcrypt** (cost 10 or more; reads only the first 72 bytes); **yescrypt** for system accounts | RFC 7914; bcrypt (USENIX 1999); yescrypt (2015) | DES-crypt, MD5-crypt (`$1$`) |
| Store passwords, when FIPS is required | **PBKDF2-HMAC-SHA-256**, 600,000 iterations or more | RFC 8018, SP 800-132 | PBKDF1, low iteration counts |
| Turn a password into an encryption key | Argon2id or scrypt | RFC 9106, RFC 7914 | the raw password as a key |
| Turn a strong secret into several keys | **HKDF** | RFC 5869 | a password-hashing function (wasted time), plain concatenation |
| Log in without the server ever seeing the password | **OPAQUE** (a PAKE) | RFC 9807 | sending a hash instead of the password (the hash becomes the password) |
| Replace passwords | **passkeys** (FIDO2 / WebAuthn) | W3C WebAuthn, FIDO CTAP | SMS codes as the only second step |

Rules for the passwords themselves come from NIST SP 800-63B: length matters, composition rules ("one capital, one symbol") and forced periodic changes do not, and every new password is checked against lists of breached ones.

Each in depth: [Argon2](../08-kdf-password-hashing/Argon2.md), [scrypt](../08-kdf-password-hashing/scrypt.md), [bcrypt](../08-kdf-password-hashing/bcrypt.md), [PBKDF2](../08-kdf-password-hashing/PBKDF2.md), [HKDF](../08-kdf-password-hashing/HKDF.md), [retired schemes](../08-kdf-password-hashing/Retired.md), [PAKE](../01-key-exchange/PAKE.md), [FIDO2 and passkeys](../protocols/FIDO2.md), [TOTP codes](../protocols/TOTP.md).

### Implementations

| Library | Language or system |
|---|---|
| **libargon2** (the reference code, from the competition winners) | C; under argon2-cffi (Python), PHP, Ruby and others |
| **libsodium** (`crypto_pwhash`: Argon2id, scrypt) | C, with bindings for nearly every language |
| **OpenBSD bcrypt** and its ports | `pyca/bcrypt`, Go `x/crypto/bcrypt`, Java jBCrypt, Spring Security |
| **libxcrypt** | Linux `crypt()`: yescrypt, sha512crypt, bcrypt |
| **OpenSSL 3.2+** (Argon2 KDF), **Bouncy Castle**, **Java `PBKDF2WithHmacSHA256`** | general crypto libraries |
| **hashcat**, **John the Ripper** | the attackers' tools: test your own settings with them |

### Common mistakes, and what they cost

| Mistake | What happened |
|---|---|
| **Storing passwords in plain text** | RockYou (2009) lost 32 million passwords in the clear; the list is still the first thing every cracker tries. Facebook found hundreds of millions of passwords readable in internal logs in 2019, and was fined 91 million euros for it in 2024. |
| **A fast hash with no salt** | LinkedIn (2012) stored unsalted SHA-1. Most of the 117 million hashes were cracked within days, because a GPU tries billions of SHA-1 guesses a second. |
| **Encrypting instead of hashing** | Adobe (2013) encrypted 153 million passwords with 3DES in ECB mode, one key for all, beside the users' password hints. Equal passwords gave equal ciphertext, and the hints did the rest. |
| **Feeding more than the password into bcrypt** | bcrypt ignores everything after 72 bytes. Okta (2024) built a cache key as bcrypt(user ID + username + password): with a username of 52 characters or more, the password fell past byte 72, so any password worked. |
| **Comparing hashes with `==`** | A comparison that stops at the first different byte leaks timing. Use the library's verify function, or a constant-time compare (`hmac.compare_digest`). |
| **Cost set once and never raised** | Hardware gets faster every year. Store the cost in the hash string and rehash at login when it is below today's setting. |
| **Limits that weaken passwords** | Maximum lengths of 16 characters, banning paste (it breaks password managers), forced changes every 90 days (people add `1` at the end). |

### Best practices

- Argon2id through a well-known library, with a cost that takes about a quarter of a second on your server; keep the parameters in the stored string.
- Allow long passwords (at least 64 characters) and pasting; block passwords found in breaches.
- Rate-limit and lock out slowly per account and per source, so online guessing stays slow.
- Offer passkeys, and an authenticator app or security key as the second step; keep SMS only as a fallback.
- Never log request bodies on login and sign-up pages.
- A "pepper" (a secret key kept outside the database, for example HMAC before hashing) helps when only the database leaks; keep it in a secrets store, not in the code.

### Learn it properly

- [Book, chapter 11](../book/11-Passwords-and-Key-Derivation.md): why each idea came in, from salt to memory-hard functions, with the breaches told as stories ([11.9](../book/11-Passwords-and-Key-Derivation.md#119-breaches-as-stories))

## Now and next

*Last checked: 4 November 2026.*

- **Passkeys are replacing passwords** on large sites (Apple, Google, Microsoft accounts); the passkey is a key pair kept by the phone or a security key, so there is nothing to phish or leak from the server. See [FIDO2](../protocols/FIDO2.md).
- **NIST's rules** (SP 800-63B, revision 4, 2025): at least 15 characters when the password is the only factor, 8 with a second factor; no composition rules; no forced changes without a sign of compromise; check against breach lists.
- **OPAQUE** (RFC 9807, 2025) lets a server check a password it never sees, even at sign-up.
- **Memory-hard hashing** keeps the gap between a defender's CPU and an attacker's GPU small; the research question is how much memory and time are enough as GPUs grow.
