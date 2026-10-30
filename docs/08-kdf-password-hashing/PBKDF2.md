# PBKDF2

*HMAC run thousands of times over. The oldest and weakest of the password
hashes, but FIPS-approved and available everywhere, so it is still all over
the place.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

PBKDF2 (Password-Based Key Derivation Function 2) comes from RSA Labs' PKCS #5
v2.0, published as RFC 2898 in 2000 and updated as RFC 8018 in 2017. NIST
approves it in SP 800-132. You meet it in:

- **Wi-Fi WPA2:** PBKDF2-HMAC-SHA1, 4,096 iterations, with the network name as
  the salt.
- **Bitcoin seed phrases (BIP-39):** PBKDF2-HMAC-SHA512, 2,048 iterations.
- **Encrypted key files:** PKCS#8 and PKCS#12, Django's default password
  hasher, and many FIPS-bound systems.

## How it works

For each output block `i`:

- `U1 = HMAC(password, salt ‖ i)`
- `U2 = HMAC(password, U1)`, `U3 = HMAC(password, U2)`, … up to `Uc`, where
  `c` is the iteration count.
- `Ti = U1 ⊕ U2 ⊕ … ⊕ Uc`

The output is `T1 ‖ T2 ‖ …`. All the cost is time; it needs almost no memory,
which is exactly what lets GPUs try billions of guesses cheaply.

| PRF | OWASP iteration floor (2023) |
|---|---|
| HMAC-SHA-256 | 600,000 |
| HMAC-SHA-512 | 210,000 |
| HMAC-SHA-1 | 1,300,000 |

## When to use it

- **When FIPS or a standard requires it.**
- **Otherwise** use [Argon2id](Argon2.md) or [scrypt](scrypt.md) for passwords
  and [HKDF](HKDF.md) for keys from strong secrets.

## Example (Python)

```python
import hashlib, os

salt = os.urandom(16)
key = hashlib.pbkdf2_hmac("sha256", b"correct horse battery staple", salt, 600_000)
print(key.hex())   # different every run: the salt is random

# RFC 6070 test vector
print(hashlib.pbkdf2_hmac("sha1", b"password", b"salt", 4096).hex())
# 4b007901b765489abead49d926f721d065a429c1
```

The 600,000 iterations took about 0.16 s on the 2.1 GHz Xeon this was run
on. The time depends on your CPU.

## Security notes

- **Don't ask for more output than the hash gives** (32 bytes for SHA-256).
  Each extra block costs you another full run, but an attacker only needs to
  check the first block.
- Use a random salt of at least 16 bytes per password.
- The original PBKDF1 is limited to the hash length and is kept only for old
  systems.

## See also

- [HMAC](../06-mac/HMAC.md): the PRF PBKDF2 repeats
- [Argon2](Argon2.md) / [scrypt](scrypt.md): memory-hard replacements
- [bcrypt](bcrypt.md): the other pre-2010 password hash

## References

- [RFC 8018: PKCS #5 v2.1](https://www.rfc-editor.org/rfc/rfc8018)
- [RFC 6070: PBKDF2 test vectors](https://www.rfc-editor.org/rfc/rfc6070)
- [NIST SP 800-132](https://csrc.nist.gov/pubs/sp/800/132/final)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
