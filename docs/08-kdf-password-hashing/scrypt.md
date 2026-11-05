# scrypt

*The first memory-hard password hash. Still a good choice, and it's built into
Python's standard library.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
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

## The story

- **Who made it:** Colin Percival, 2009, for his Tarsnap backup service; RFC 7914 (2016).
- **What for:** The first password hash meant to need lots of memory.
- **What it solved:** It made cracking hardware cost memory, not just cores, years before Argon2.
- **Where it stands:** Still fine; yescrypt, its descendant, is the default in many Linux distributions.
- **Incidents:** Litecoin used scrypt with tiny memory settings for mining, and custom chips for it appeared in 2014. That shows how much the settings matter.

## How it works

- Stretch the password and salt with [PBKDF2](PBKDF2.md)-HMAC-SHA-256 into a
  starting block.
- **ROMix:** fill a table of $N$ blocks, each the hash of the one before. Then
  read $N$ blocks back from the table at positions picked by the current data,
  mixing each into the running value. The mixing uses Salsa20/8.
- Run PBKDF2 once more to produce the output.

Memory needed is $128 \times N \times r$ bytes. With $N = 2^{17}$ and $r = 8$ that is 128 MiB per
guess, which is what makes GPU cracking costly.

| Parameter | Meaning | OWASP floor |
|---|---|---|
| $N$ | CPU/memory cost, a power of 2 | $2^{17}$ |
| $r$ | block size | 8 |
| $p$ | parallelism | 1 |

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 340" role="img" aria-labelledby="sk-c-romix-t"><title id="sk-c-romix-t">scrypt fills a table of blocks in order, then reads them back in a data-dependent jumbled order, so the whole table must stay in memory</title><defs><filter id="sk-c-romix-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-romix-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-romix-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-romix-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-romix-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="340" filter="url(#sk-c-romix-paper)"/><g filter="url(#sk-c-romix-pen)"><text x="30" y="44" class="h">Write N blocks, then read them back in a jumble</text><path class="p room" d="M40 110 L80 110 L80 150 L40 150Z"/><text x="60" y="136" text-anchor="middle" class="s">0</text><path class="p " d="M80 130 L88 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M88 110 L128 110 L128 150 L88 150Z"/><text x="108" y="136" text-anchor="middle" class="s">1</text><path class="p " d="M128 130 L136 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M136 110 L176 110 L176 150 L136 150Z"/><text x="156" y="136" text-anchor="middle" class="s">2</text><path class="p " d="M176 130 L184 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M184 110 L224 110 L224 150 L184 150Z"/><text x="204" y="136" text-anchor="middle" class="s">3</text><path class="p " d="M224 130 L232 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M232 110 L272 110 L272 150 L232 150Z"/><text x="252" y="136" text-anchor="middle" class="s">4</text><path class="p " d="M272 130 L280 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M280 110 L320 110 L320 150 L280 150Z"/><text x="300" y="136" text-anchor="middle" class="s">5</text><path class="p " d="M320 130 L328 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M328 110 L368 110 L368 150 L328 150Z"/><text x="348" y="136" text-anchor="middle" class="s">6</text><path class="p " d="M368 130 L376 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M376 110 L416 110 L416 150 L376 150Z"/><text x="396" y="136" text-anchor="middle" class="s">7</text><path class="p " d="M416 130 L424 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M424 110 L464 110 L464 150 L424 150Z"/><text x="444" y="136" text-anchor="middle" class="s">8</text><path class="p " d="M464 130 L472 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M472 110 L512 110 L512 150 L472 150Z"/><text x="492" y="136" text-anchor="middle" class="s">9</text><path class="p " d="M512 130 L520 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M520 110 L560 110 L560 150 L520 150Z"/><text x="540" y="136" text-anchor="middle" class="s">10</text><path class="p " d="M560 130 L568 130" marker-end="url(#sk-c-romix-ah)"/><path class="p room" d="M568 110 L608 110 L608 150 L568 150Z"/><text x="588" y="136" text-anchor="middle" class="s">11</text><text x="40" y="96" class="s">1 fill: each block is the hash of the one before</text><path class="p red" d="M396 152 L80 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M50 242 L110 242 L110 276 L50 276Z"/><text x="80.0" y="265.0" text-anchor="middle" class="s">#7</text><path class="p red" d="M156 152 L170 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M140 242 L200 242 L200 276 L140 276Z"/><text x="170.0" y="265.0" text-anchor="middle" class="s">#2</text><path class="p red" d="M540 152 L260 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M230 242 L290 242 L290 276 L230 276Z"/><text x="260.0" y="265.0" text-anchor="middle" class="s">#10</text><path class="p red" d="M252 152 L350 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M320 242 L380 242 L380 276 L320 276Z"/><text x="350.0" y="265.0" text-anchor="middle" class="s">#4</text><path class="p red" d="M492 152 L440 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M410 242 L470 242 L470 276 L410 276Z"/><text x="440.0" y="265.0" text-anchor="middle" class="s">#9</text><path class="p red" d="M60 152 L530 240" marker-end="url(#sk-c-romix-ah)" opacity=".7"/><path class="p gold" d="M500 242 L560 242 L560 276 L500 276Z"/><text x="530.0" y="265.0" text-anchor="middle" class="s">#0</text><text x="40" y="306" class="s">2 read back: which block comes next depends on the data, so none can be skipped or recomputed</text><text x="40" y="324" class="s">cheaply. With N = 2¹⁷ and r = 8 that is 128 MiB for every guess.</text></g></svg><figcaption>Sketched for this page. 12 blocks stand in for N.</figcaption></figure>

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

- Store $N$, $r$, $p$ and the salt with the hash so you can raise the cost
  later.
- Compare hashes with `hmac.compare_digest`, not `==`.
- scrypt's memory use can't be split from its time cost the way Argon2's can;
  that's one reason Argon2 replaced it as the first choice.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 7914 test vectors, recomputed"

    Recomputed with Python's `hashlib.scrypt`, matching the RFC:

    | Password, salt | $N, r, p$ | Memory per lane | First 32 of 64 output bytes |
    |---|---|---|---|
    | "", "" | 16, 1, 1 | $128 \times 16 \times 1$ = 2 KiB | `77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442` |
    | "password", "NaCl" | 1024, 8, 16 | $128 \times 1024 \times 8$ = 1 MiB | `fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b373162` |
    | OWASP floor | $2^{17}$, 8, 1 | $128 \times 131{,}072 \times 8$ = 128 MiB | |

    The second row runs 16 lanes one after another: still 1 MiB of memory, 16 times the work.

??? abstract "The math, with formulas"

    From RFC 7914:

    $$
    \begin{aligned}
    B[0] \,\Vert\, \cdots \,\Vert\, B[p-1] &= \text{PBKDF2-HMAC-SHA256}(P, S, 1, p \cdot 128 \cdot r) \\
    B[i] &= \mathrm{ROMix}(B[i], N) && \text{for each lane } i \\
    \mathit{DK} &= \text{PBKDF2-HMAC-SHA256}(P, B[0] \,\Vert\, \cdots \,\Vert\, B[p-1], 1, \mathit{dkLen})
    \end{aligned}
    $$

    **ROMix** (the memory-hard part):

    $$
    \begin{aligned}
    & X = B \\
    & \text{for } i = 0 \ldots N-1: \quad V[i] = X; \;\; X = \mathrm{BlockMix}(X) && \text{fill the table} \\
    & \text{for } i = 0 \ldots N-1: \quad j = \mathrm{Integerify}(X) \bmod N && \text{read it back, at places} \\
    & \phantom{\text{for } i = 0 \ldots N-1: \quad} X = \mathrm{BlockMix}(X \oplus V[j]) && \text{the data picks} \\
    & \text{return } X
    \end{aligned}
    $$

    **BlockMix** cuts its $128 \cdot r$-byte input into $2r$ pieces of 64 bytes and runs each, XORed with the
    previous result, through the Salsa20/8 core (8 rounds of Salsa20 with no stream, just the mixing).
    Integerify reads the last 64-byte piece as a little-endian number.

??? tip "Watch it step by step: ROMix with a small table"

    <div class="mars-steps" markdown>

    1. PBKDF2 turns the password and salt into a starting block $X$.
    2. Write $X$ into slot 0 of the table, mix it, write it into slot 1, and so on to slot $N-1$.
    3. Now read $X$'s last bytes as a number $j$ and fetch table slot $j$.
    4. XOR slot $j$ into $X$ and mix again. Repeat $N$ times; each $j$ depends on the last mix, so it can't be guessed ahead.
    5. An attacker who threw slots away has to recompute them from the nearest kept slot, every time.
    6. One more PBKDF2 over the final $X$ gives the key: `fdbabe1c…` for the RFC's second vector.

    </div>

??? info "The math underneath"

    - **Sequential memory-hardness:** Percival's 2009 definition. Alwen, Chen, Pietrzak, Reyzin and Tessaro
      proved in 2017 (in the random-oracle model) that scrypt's cumulative memory cost is the best possible,
      about $N^2$ blocks $\times$ steps.
    - **Time-memory trade-off:** keeping only every $k$-th slot saves $k$ times the memory but forces about
      $k/2$ extra mixes per read, so the attacker's memory $\times$ time product does not shrink.
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
