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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 7914 test vectors, recomputed"

    Recomputed with Python's `hashlib.scrypt`, matching the RFC:

    | Password, salt | N, r, p | Memory per lane | First 32 of 64 output bytes |
    |---|---|---|---|
    | "", "" | 16, 1, 1 | 128 × 16 × 1 = 2 KiB | `77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442` |
    | "password", "NaCl" | 1024, 8, 16 | 128 × 1024 × 8 = 1 MiB | `fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b373162` |
    | OWASP floor | 2¹⁷, 8, 1 | 128 × 131,072 × 8 = 128 MiB | |

    The second row runs 16 lanes one after another: still 1 MiB of memory, 16 times the work.

??? abstract "The math, with formulas"

    From RFC 7914:

    ```
    B[0] ‖ … ‖ B[p−1] = PBKDF2-HMAC-SHA256(P, S, 1, p · 128 · r)
    B[i] = ROMix(B[i], N)                                for each lane i
    DK   = PBKDF2-HMAC-SHA256(P, B[0] ‖ … ‖ B[p−1], 1, dkLen)
    ```

    **ROMix** (the memory-hard part):

    ```
    X = B
    for i = 0 … N−1:   V[i] = X;   X = BlockMix(X)       fill the table
    for i = 0 … N−1:   j = Integerify(X) mod N           read it back, at places
                       X = BlockMix(X ⊕ V[j])            the data picks
    return X
    ```

    **BlockMix** cuts its 128·r-byte input into 2r pieces of 64 bytes and runs each, XORed with the
    previous result, through the Salsa20/8 core (8 rounds of Salsa20 with no stream, just the mixing).
    Integerify reads the last 64-byte piece as a little-endian number.

??? tip "Watch it step by step: ROMix with a small table"

    <div class="mars-steps" markdown>

    1. PBKDF2 turns the password and salt into a starting block X.
    2. Write X into slot 0 of the table, mix it, write it into slot 1, and so on to slot N−1.
    3. Now read X's last bytes as a number j and fetch table slot j.
    4. XOR slot j into X and mix again. Repeat N times; each j depends on the last mix, so it can't be guessed ahead.
    5. An attacker who threw slots away has to recompute them from the nearest kept slot, every time.
    6. One more PBKDF2 over the final X gives the key: `fdbabe1c…` for the RFC's second vector.

    </div>

??? info "The math underneath"

    - **Sequential memory-hardness:** Percival's 2009 definition. Alwen, Chen, Pietrzak, Reyzin and Tessaro
      proved in 2017 (in the random-oracle model) that scrypt's cumulative memory cost is the best possible,
      about N² blocks × steps.
    - **Time-memory trade-off:** keeping only every k-th slot saves k times the memory but forces about
      k/2 extra mixes per read, so the attacker's memory × time product does not shrink.
    - **Salsa20/8** as the mixing function: [ChaCha20 and Salsa20](../04-symmetric-ciphers/ChaCha.md).
    - **PBKDF2** at the start and end: [PBKDF2](PBKDF2.md).
    - Successors: [Argon2](Argon2.md) and yescrypt.

## See also

- [Argon2](Argon2.md): the newer first choice
- [PBKDF2](PBKDF2.md): what scrypt uses at both ends
- [bcrypt](bcrypt.md): the older CPU-only option

## References

- [RFC 7914: scrypt](https://www.rfc-editor.org/rfc/rfc7914)
- [Percival, "Stronger Key Derivation via Sequential Memory-Hard Functions" (2009)](https://www.tarsnap.com/scrypt/scrypt.pdf)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
