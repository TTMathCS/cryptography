# Argon2

*The first choice for storing passwords. Slow on purpose, and it eats memory,
so guessing passwords on GPUs or custom chips stops being cheap.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
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

## The story

- **Who made it:** Alex Biryukov, Daniel Dinu and Dmitry Khovratovich at the University of Luxembourg. It won the Password Hashing Competition (2013 to 2015), organized by Jean-Philippe Aumasson; RFC 9106 (2021).
- **What for:** Password hashing that is expensive on GPUs and custom chips, not just CPUs.
- **What it solved:** Crackers use thousands of cheap GPU cores. Argon2 needs a lot of memory per guess, and memory doesn't get cheaper in parallel.
- **Where it stands:** Recommended (Argon2id) by OWASP and RFC 9106.
- **Incidents:** In 2016 Alwen and Blocki found that Argon2i could be computed with less memory than claimed, which led to version 1.3 and to the hybrid Argon2id becoming the default.

## How it works

- Fill a large block of memory (the $m$ parameter, in KiB) with chained hashes
  of the password and salt, using BLAKE2b inside.
- Make $t$ passes over it, each block mixing in earlier blocks chosen by
  position (the "i" part) or by content (the "d" part).
- $p$ lanes can run in parallel.
- Hash the final memory into the output tag.

Because the whole array has to be in memory at once, an attacker can't trade
it for cheap parallel hardware. That property is called **memory-hard**.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 330" role="img" aria-labelledby="sk-c-argon-t"><title id="sk-c-argon-t">A grid of memory blocks in four lanes; a new block is computed from its neighbour and from earlier blocks far away, so all of memory must be kept</title><defs><filter id="sk-c-argon-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-argon-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-argon-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-argon-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-argon-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="330" filter="url(#sk-c-argon-paper)"/><g filter="url(#sk-c-argon-pen)"><text x="30" y="44" class="h">Fill a big memory, then keep reaching back</text><path class="p room" d="M40 90 L66 90 L66 116 L40 116Z"/><path class="p room" d="M66 90 L92 90 L92 116 L66 116Z"/><path class="p room" d="M92 90 L118 90 L118 116 L92 116Z"/><path class="p room" d="M118 90 L144 90 L144 116 L118 116Z"/><path class="p room" d="M144 90 L170 90 L170 116 L144 116Z"/><path class="p room" d="M170 90 L196 90 L196 116 L170 116Z"/><path class="p room" d="M196 90 L222 90 L222 116 L196 116Z"/><path class="p room" d="M222 90 L248 90 L248 116 L222 116Z"/><path class="p room" d="M248 90 L274 90 L274 116 L248 116Z"/><path class="p room" d="M274 90 L300 90 L300 116 L274 116Z"/><path class="p room" d="M300 90 L326 90 L326 116 L300 116Z"/><path class="p room" d="M326 90 L352 90 L352 116 L326 116Z"/><path class="p room" d="M352 90 L378 90 L378 116 L352 116Z"/><path class="p room" d="M378 90 L404 90 L404 116 L378 116Z"/><path class="p room" d="M404 90 L430 90 L430 116 L404 116Z"/><path class="p room" d="M430 90 L456 90 L456 116 L430 116Z"/><path class="p room" d="M40 116 L66 116 L66 142 L40 142Z"/><path class="p room" d="M66 116 L92 116 L92 142 L66 142Z"/><path class="p room" d="M92 116 L118 116 L118 142 L92 142Z"/><path class="p room" d="M118 116 L144 116 L144 142 L118 142Z"/><path class="p room" d="M144 116 L170 116 L170 142 L144 142Z"/><path class="p room" d="M170 116 L196 116 L196 142 L170 142Z"/><path class="p room" d="M196 116 L222 116 L222 142 L196 142Z"/><path class="p room" d="M222 116 L248 116 L248 142 L222 142Z"/><path class="p room" d="M248 116 L274 116 L274 142 L248 142Z"/><path class="p room" d="M274 116 L300 116 L300 142 L274 142Z"/><path class="p room" d="M300 116 L326 116 L326 142 L300 142Z"/><path class="p room" d="M326 116 L352 116 L352 142 L326 142Z"/><path class="p room" d="M352 116 L378 116 L378 142 L352 142Z"/><path class="p room" d="M378 116 L404 116 L404 142 L378 142Z"/><path class="p room" d="M404 116 L430 116 L430 142 L404 142Z"/><path class="p room" d="M430 116 L456 116 L456 142 L430 142Z"/><path class="p room" d="M40 142 L66 142 L66 168 L40 168Z"/><path class="p room" d="M66 142 L92 142 L92 168 L66 168Z"/><path class="p room" d="M92 142 L118 142 L118 168 L92 168Z"/><path class="p room" d="M118 142 L144 142 L144 168 L118 168Z"/><path class="p room" d="M144 142 L170 142 L170 168 L144 168Z"/><path class="p room" d="M170 142 L196 142 L196 168 L170 168Z"/><path class="p room" d="M196 142 L222 142 L222 168 L196 168Z"/><path class="p room" d="M222 142 L248 142 L248 168 L222 168Z"/><path class="p room" d="M248 142 L274 142 L274 168 L248 168Z"/><path class="p room" d="M274 142 L300 142 L300 168 L274 168Z"/><path class="p room" d="M300 142 L326 142 L326 168 L300 168Z"/><path class="p gold" d="M326 142 L352 142 L352 168 L326 168Z"/><path class="p room" d="M352 142 L378 142 L378 168 L352 168Z"/><path class="p room" d="M378 142 L404 142 L404 168 L378 168Z"/><path class="p room" d="M404 142 L430 142 L430 168 L404 168Z"/><path class="p room" d="M430 142 L456 142 L456 168 L430 168Z"/><path class="p room" d="M40 168 L66 168 L66 194 L40 194Z"/><path class="p room" d="M66 168 L92 168 L92 194 L66 194Z"/><path class="p room" d="M92 168 L118 168 L118 194 L92 194Z"/><path class="p room" d="M118 168 L144 168 L144 194 L118 194Z"/><path class="p room" d="M144 168 L170 168 L170 194 L144 194Z"/><path class="p room" d="M170 168 L196 168 L196 194 L170 194Z"/><path class="p room" d="M196 168 L222 168 L222 194 L196 194Z"/><path class="p room" d="M222 168 L248 168 L248 194 L222 194Z"/><path class="p room" d="M248 168 L274 168 L274 194 L248 194Z"/><path class="p room" d="M274 168 L300 168 L300 194 L274 194Z"/><path class="p room" d="M300 168 L326 168 L326 194 L300 194Z"/><path class="p room" d="M326 168 L352 168 L352 194 L326 194Z"/><path class="p room" d="M352 168 L378 168 L378 194 L352 194Z"/><path class="p room" d="M378 168 L404 168 L404 194 L378 194Z"/><path class="p room" d="M404 168 L430 168 L430 194 L404 194Z"/><path class="p room" d="M430 168 L456 168 L456 194 L430 194Z"/><path class="p red" d="M131 103 Q228.5 60 339 155" marker-end="url(#sk-c-argon-ah)" style="fill:none"/><path class="p red" d="M209 181 Q267.5 230 339 155" marker-end="url(#sk-c-argon-ah)" style="fill:none"/><path class="p red" d="M287 129 Q306.5 60 339 155" marker-end="url(#sk-c-argon-ah)" style="fill:none"/><text x="40" y="216" class="s">4 lanes (p) side by side · each pass (t) rewrites every block</text><text x="40" y="250" class="s">Each new block (gold) mixes its neighbour with earlier blocks picked by position or by content.</text><text x="40" y="270" class="s">So the whole area, say 64 MiB, must sit in memory for every single guess.</text><text x="40" y="310" class="s">A GPU has thousands of cores but not thousands of times the memory: guessing stays expensive.</text></g></svg><figcaption>Sketched for this page. 64 blocks stand in for tens of thousands.</figcaption></figure>

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
