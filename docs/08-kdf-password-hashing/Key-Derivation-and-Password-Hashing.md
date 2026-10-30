# Key Derivation and Password Hashing

*Turning a secret into a usable key. Two jobs that look alike but need opposite
tools: stretching weak passwords slowly, and deriving keys from strong secrets
quickly.*

## What it is

A key derivation function (KDF) takes some input secret and produces one or more
keys from it. Which KDF you want depends entirely on the input:

- **A password** is low-entropy and guessable, so the KDF must be *deliberately
  slow* to make each guess expensive. This is password hashing.
- **A high-entropy secret** (like the output of [X25519](../01-key-exchange/ECDH.md) or
  [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md)) is already unguessable, so the KDF just
  needs to shape it into clean key material — and should be *fast*.

Using the wrong one is a real mistake: a fast KDF on a password is easy to crack,
and a slow password hash on a DH secret is pointless overhead.

## Password hashing (slow, salted)

For storing login passwords. Every function here takes a **salt** (a unique
random value per user) so identical passwords get different hashes and
precomputed tables are useless — see
[Does precomputing password hashes work?](../FAQ.md). Pick by
preference:

| Function | Notes | Use when |
|----------|-------|----------|
| **Argon2id** | PHC winner (2015), memory-hard, tunable | first choice for new systems |
| **scrypt** | memory-hard, widely available | Argon2 unavailable |
| **bcrypt** | older, CPU-hard, caps password at 72 bytes | legacy systems, still fine |
| **PBKDF2** | weakest (not memory-hard) but FIPS-approved | compliance requires it |

"Memory-hard" means cracking needs lots of RAM as well as time, which blunts
attacks on GPUs and custom hardware. Tune the cost parameters so a single hash
takes a noticeable fraction of a second on your server.

## Key derivation from strong secrets (fast)

For turning a shared secret into actual encryption keys. The standard tool is
**HKDF**, built on [HMAC](../06-mac/HMAC.md). It works in two stages:

- **Extract** — concentrate the input into a uniform pseudorandom key.
- **Expand** — stretch that into as many keys of whatever length you need, each
  bound to a context string so the same secret yields different keys for
  different uses.

This is what runs after a key exchange to produce the symmetric keys for a
session.

## Example (Python)

```python
import hashlib, os

# --- Password storage: slow and salted ---
salt = os.urandom(16)
pw_key = hashlib.scrypt(b"correct horse battery staple",
                        salt=salt, n=2**15, r=8, p=1, dklen=32)
# Argon2id (via argon2-cffi) is preferred where available:
#   from argon2 import PasswordHasher; PasswordHasher().hash(password)

# --- Deriving session keys from a shared secret: fast ---
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

shared_secret = b"...32 bytes from X25519/DH..."
session_key = HKDF(algorithm=hashes.SHA256(), length=32,
                   salt=None, info=b"app v1 session key").derive(shared_secret)
```

## Security notes

- A salt stops precomputation but isn't secret; store it next to the hash.
- For password hashing, the slowness *is* the security — raise the cost
  parameters as hardware improves.
- Never feed a raw [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md)/[X25519](../01-key-exchange/ECDH.md) output
  straight into a cipher; run it through HKDF first so the key is uniform.
- The `info` string in HKDF should name the use so one secret never produces the
  same key for two different purposes.

## See also

- [HMAC](../06-mac/HMAC.md) — HKDF and PBKDF2 are built on it
- [X25519](../01-key-exchange/ECDH.md) / [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md) — produce the secrets HKDF consumes
- [SHA](../07-hash/SHA.md) — the underlying hash

## References

- RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
- RFC 9106: Argon2 Memory-Hard Function for Password Hashing
- NIST SP 800-132: Recommendation for Password-Based Key Derivation (PBKDF2)
