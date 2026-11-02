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
| **Argon2id** | first half of the first pass data-independent, the rest data-dependent (RFC 9106 §1) | the default for passwords |
| Argon2i | data-independent | side-channel-resistant, weaker against GPUs |
| Argon2d | data-dependent | strongest against GPUs, leaks timing; crypto-currency, not logins |

## How it works

- Fill a large block of memory (the $m$ parameter, in KiB) with chained hashes
  of the password and salt, using BLAKE2b inside.
- Make $t$ passes over it, each block mixing in earlier blocks chosen by
  position (the "i" part) or by content (the "d" part).
- $p$ lanes can run in parallel.
- Hash the final memory into the output tag.

Because the whole array has to be in memory at once, an attacker can't trade
it for cheap parallel hardware. That property is called **memory-hard**.

## When to use it

- **New login systems:** Argon2id.
- **Starting parameters:**
    - RFC 9106: $t = 3$, $p = 4$, $m = 64$ MiB when memory is tight, or $t = 1$, $p = 4$, $m = 2$ GiB.
    - OWASP's floor: $m = 19$ MiB, $t = 2$, $p = 1$.
    - Tune so one hash takes a noticeable fraction of a second on your server.
- **When it isn't available:** [scrypt](scrypt.md), then [bcrypt](bcrypt.md),
  then [PBKDF2](PBKDF2.md) if FIPS rules force it.

## Example (Python)

Needs `pip install argon2-cffi`:

```python
from argon2 import PasswordHasher

ph = PasswordHasher()                 # Argon2id, t=3, m=64 MiB, p=4
stored = ph.hash("correct horse battery staple")
print(stored)                         # $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

print(ph.verify(stored, "correct horse battery staple"))   # True, raises on a wrong password
```

The salt is random, so the printed string changes every run. The stored
string carries the variant, parameters and salt, so you can raise the cost
later and rehash on the next login (`ph.check_needs_rehash(stored)`).

## Security notes

- Each user gets a random salt; it's not secret and lives in the stored string.
- Too little memory throws away the point of Argon2. Set $m$ as high as the
  server can afford.
- Consider a "pepper": a server-side secret mixed in, kept outside the
  database.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: one Argon2id hash, recomputed"

    Computed with the `argon2-cffi` library (the reference C code underneath):

    | Input | Value |
    |---|---|
    | Password, salt | "password", "somesalt" |
    | Passes $t$, memory $m$, lanes $p$ | 2, 65,536 KiB (64 MiB), 1 |
    | Memory blocks | 65,536 blocks of 1 KiB, filled twice |
    | Argon2id, 32-byte tag | `09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7` |
    | Argon2i, same inputs | `c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0` |
    | Argon2id, password "passwore" | `a667a63020b973d48ad5afb94b08b995e7caed73865baae4390ff516a5167ce1` |

    One letter changed gives an unrelated tag. Every guess an attacker tries has to fill and reread the
    same 64 MiB.

??? abstract "The math, with formulas"

    From RFC 9106 (Argon2 version 1.3). $H$ is BLAKE2b; $H'$ is a variable-length hash built from it.

    $$
    \begin{aligned}
    H_0 &= H(p, T, m, t, v, y, \lvert P \rvert \,\Vert\, P, \lvert S \rvert \,\Vert\, S, \lvert K \rvert \,\Vert\, K, \lvert X \rvert \,\Vert\, X) && \text{64 bytes} \\
    B[i][0] &= H'(H_0 \,\Vert\, 0 \,\Vert\, i), \quad B[i][1] = H'(H_0 \,\Vert\, 1 \,\Vert\, i) && \text{1 KiB each, lane } i \\
    B[i][j] &= G(B[i][j-1], B[l][z]) && \text{first pass} \\
    B[i][j] &= G(B[i][j-1], B[l][z]) \oplus B[i][j] && \text{later passes} \\
    C &= B[0][q-1] \oplus B[1][q-1] \oplus \cdots \oplus B[p-1][q-1] && \text{last column} \\
    \mathrm{Tag} &= H'(C) && T \text{ bytes}
    \end{aligned}
    $$

    - **Which earlier block $B[l][z]$:** picked from a 64-bit number $J$. In Argon2i, $J$ comes from a counter
      (data-independent, so timing leaks nothing). In Argon2d, $J$ is read from the previous block
      (data-dependent, harder to attack with less memory). Argon2id uses the "i" way for the first half
      of the first pass and the "d" way after that.
    - **G** is BLAKE2b's round function with one change: each addition $a + b$ becomes
      $a + b + 2 \cdot \mathrm{lo}_{32}(a) \cdot \mathrm{lo}_{32}(b)$, so a chip can't skip the multiplications.
    - **Memory:** $m$ KiB rounded down to a multiple of $4p$ blocks. Each lane is cut into 4 slices; lanes
      only reference each other's finished slices, which is what lets them run in parallel.

??? tip "Watch it step by step: filling the memory"

    <div class="mars-steps" markdown>

    1. Hash every parameter, the password and the salt into a 64-byte seed $H_0$.
    2. Stretch $H_0$ into the first two 1 KiB blocks of each lane.
    3. Block 3 = G(block 2, an earlier block chosen by a counter). Keep going down the lane.
    4. Halfway through the first pass, Argon2id switches: the earlier block is now chosen by the data itself.
    5. At the end of the lane, all 64 MiB is full. Pass 2 starts again at the top and XORs new blocks over old.
    6. XOR the last block of every lane together and hash it down to the 32-byte tag `09316115…3cf7`.

    </div>

??? info "The math underneath"

    - **Memory-hardness:** the cost of a guess is measured as memory $\times$ time (cumulative memory complexity).
      Using less memory forces the attacker to recompute missing blocks, and the penalty grows fast.
    - **Time-memory trade-offs** and the ranking attacks on Argon2i (Alwen and Blocki, 2016–2017), which
      are why Argon2id is the recommended mode.
    - **Side channels:** data-dependent memory access (Argon2d) can leak through cache timing.
    - **BLAKE2b** as the compression and output hash: [BLAKE2 and BLAKE3](../07-hash/BLAKE.md).
    - Related: [scrypt](scrypt.md) (the first memory-hard KDF) and [bcrypt](bcrypt.md).

## See also

- [scrypt](scrypt.md) / [bcrypt](bcrypt.md) / [PBKDF2](PBKDF2.md): the older password hashes
- [HKDF](HKDF.md): the fast KDF for secrets that aren't passwords
- [Does precomputing password hashes work?](../FAQ.md)

## References

- [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Password Hashing Competition](https://www.password-hashing.net/)
