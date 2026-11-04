# PBKDF2

*HMAC run thousands of times over. The oldest and weakest of the password
hashes, but FIPS-approved and available everywhere, so it is still all over
the place.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

PBKDF2 (Password-Based Key Derivation Function 2) comes from RSA Labs' PKCS #5
v2.0, published as RFC 2898 in 2000 and updated as RFC 8018 in 2017. NIST
approves it in SP 800-132 (December 2010). In May 2023 NIST decided to revise
SP 800-132: the new version is to approve a memory-hard password function as
well and add more guidance on using PBKDF2. No draft had been posted as of
1 November 2026. You meet it in:

- **Wi-Fi WPA2:** PBKDF2-HMAC-SHA1, 4,096 iterations, with the network name as
  the salt.
- **Bitcoin seed phrases (BIP-39):** PBKDF2-HMAC-SHA512, 2,048 iterations.
- **Encrypted key files:** PKCS#8 and PKCS#12, Django's default password
  hasher, and many FIPS-bound systems.

## The story

- **Who made it:** Burt Kaliski at RSA Laboratories, PKCS #5 v2.0 (1999); RFC 2898 (2000).
- **What for:** Turning a password into a key by repeating a hash many times.
- **What it solved:** PBKDF1 could only output a hash-length key; PBKDF2 gives any length and lets the iteration count grow.
- **Where it stands:** Still approved by NIST and everywhere (WPA2, iOS backups, 1Password, BIP-39), but it needs no memory, so GPUs crack it fast. OWASP asks for 600,000 iterations of HMAC-SHA256.
- **Incidents:** **LastPass (2022):** stolen vaults were protected with PBKDF2, but older accounts had iteration counts as low as 1 or 5,000, leaving them easy to crack. **Wi-Fi:** WPA2-Personal's 4,096 iterations are why a captured handshake can be cracked offline.

## How it works

For each output block $i$:

- $U_1 = \mathrm{HMAC}(\mathit{password}, \mathit{salt} \,\Vert\, i)$
- $U_2 = \mathrm{HMAC}(\mathit{password}, U_1)$, $U_3 = \mathrm{HMAC}(\mathit{password}, U_2)$, … up to $U_c$, where
  $c$ is the iteration count.
- $T_i = U_1 \oplus U_2 \oplus \cdots \oplus U_c$

The output is $T_1 \,\Vert\, T_2 \,\Vert\, \ldots$. All the cost is time; it needs almost no memory,
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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 6070 and RFC 7914 test vectors, recomputed"

    Recomputed with Python's `hashlib.pbkdf2_hmac`, matching the RFCs:

    | PRF | Password, salt | Iterations | Output (first bytes) |
    |---|---|---|---|
    | HMAC-SHA-1 | "password", "salt" | 1 | `0c60c80f961f0e71f3a9b524af6012062fe037a6` |
    | HMAC-SHA-1 | "password", "salt" | 2 | `ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957` |
    | HMAC-SHA-1 | "password", "salt" | 4,096 | `4b007901b765489abead49d926f721d065a429c1` |
    | HMAC-SHA-256 | "passwd", "salt" | 1 | `55ac046e56e3089fec1691c22544b605…` (64 bytes asked) |

    Each extra iteration is one more HMAC for you and for every guess an attacker tries. At 600,000
    iterations (OWASP's 2023 figure for HMAC-SHA-256), one login takes a fraction of a second; a
    billion guesses cost 600,000 times more than with plain SHA-256.

??? abstract "The math, with formulas"

    **PBKDF2 (RFC 8018 §5.2):**

    $$
    \begin{aligned}
    \mathit{DK} &= T_1 \,\Vert\, T_2 \,\Vert\, \cdots \quad (\text{cut to } \mathit{dkLen}) \\
    T_i &= U_1 \oplus U_2 \oplus \cdots \oplus U_c \\
    U_1 &= \mathrm{PRF}(P, S \,\Vert\, \mathrm{INT}(i)) \\
    U_j &= \mathrm{PRF}(P, U_{j-1}) && \text{for } j = 2 \ldots c
    \end{aligned}
    $$

    $\mathrm{PRF}$ is HMAC with the password as the key, $S$ the salt, $c$ the iteration count, and $\mathrm{INT}(i)$ the block
    number as 4 bytes.

    **The salt** makes each user's hash different, so one precomputed table (a rainbow table) cannot serve
    every account, and two users with the same password get different hashes.

    **Its weakness: no memory cost.** Each guess needs only a few hundred bytes of state, so a GPU with
    thousands of cores or an ASIC runs thousands of guesses side by side. That is the gap
    [scrypt](scrypt.md) and [Argon2](Argon2.md) close. A second quirk: asking for more output than the hash
    length (e.g. 64 bytes from SHA-1) doubles the defender's work but not the attacker's, who only needs the
    first block to test a guess.

??? tip "Watch it step by step: stretching a password"

    <div class="mars-steps" markdown>

    1. Take the password and a random 16-byte salt stored next to the hash.
    2. $U_1 = \mathrm{HMAC}(\mathit{password}, \mathit{salt} \,\Vert\, \mathtt{00000001})$.
    3. $U_2 = \mathrm{HMAC}(\mathit{password}, U_1)$, $U_3 = \mathrm{HMAC}(\mathit{password}, U_2)$, … one after another; no shortcut.
    4. XOR all of them together: that is the 32-byte key.
    5. Store salt, iteration count and key. To check a login, repeat with the typed password and compare.
    6. An attacker with the database must repeat the whole chain for every guess and every salt.

    </div>

??? info "The math underneath"

    - **HMAC as a PRF:** [HMAC](../06-mac/HMAC.md).
    - **Key stretching:** adding $\log_2(c)$ bits of work to every guess ($600{,}000 \approx 2^{19.2}$).
    - **Password entropy:** a random 8-character lowercase password has about 37.6 bits; stretching cannot
      add what the password lacks.
    - **Time–memory trade-offs** and rainbow tables, which salts defeat: [FAQ](../FAQ.md).
    - **Parallel hardware:** why memory-hard functions followed ([scrypt](scrypt.md), [Argon2](Argon2.md)).

## See also

- [HMAC](../06-mac/HMAC.md): the PRF PBKDF2 repeats
- [Argon2](Argon2.md) / [scrypt](scrypt.md): memory-hard replacements
- [bcrypt](bcrypt.md): the other pre-2010 password hash

## References

- [RFC 8018: PKCS #5 v2.1](https://www.rfc-editor.org/rfc/rfc8018)
- [RFC 6070: PBKDF2 test vectors](https://www.rfc-editor.org/rfc/rfc6070)
- [NIST SP 800-132 (2010)](https://csrc.nist.gov/pubs/sp/800/132/final) / [NIST, "Decision to Revise NIST SP 800-132" (11 May 2023)](https://csrc.nist.gov/news/2023/decision-to-revise-nist-sp-800-132)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
