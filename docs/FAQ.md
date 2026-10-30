# Cryptography FAQ

Generic questions that come up for more than one algorithm in this guide.

## Questions

1. [Can an attacker just pre-calculate everything and look up the answer?](#can-an-attacker-just-pre-calculate-everything-and-look-up-the-answer)
2. [Does precomputing password hashes work?](#does-precomputing-password-hashes-work-yes-if-they-arent-salted)
3. [Symmetric or asymmetric — which should I use?](#symmetric-or-asymmetric-which-should-i-use)
4. [What's the difference between encrypting, signing, and hashing?](#whats-the-difference-between-encrypting-signing-and-hashing)
5. [Will quantum computers break all of this?](#will-quantum-computers-break-all-of-this)
6. [Can I keep the algorithm secret instead of the key?](#can-i-keep-the-algorithm-secret-instead-of-the-key)
7. [Should I write my own encryption algorithm?](#should-i-write-my-own-encryption-algorithm)
8. [Why does randomness matter so much?](#why-does-randomness-matter-so-much)
9. [Is a bigger key always better?](#is-a-bigger-key-always-better-rsa-4096-vs-rsa-2048)
10. [Which algorithms should I stop using?](#which-algorithms-should-i-stop-using)

---

## Can an attacker just pre-calculate everything and look up the answer?

The idea sounds reasonable: build one giant table of all possible keys (or all
primes, or every hash input) ahead of time, then break any key with a fast
lookup. It never works, and the reason is the same for every algorithm.

Security does not come from keeping the method secret. It comes from the size of
the search space. That space is so large that neither the time to walk it nor
the storage to save it can ever exist.

A few reference points to anchor the numbers below:

- Atoms in the observable universe: about 10^80
- All digital data stored on Earth today: roughly 10^23 bytes
- Age of the universe: about 1.4 × 10^10 years

### How big is the space, per algorithm

| Algorithm | What you'd precompute | Size of the space | Why it fails |
|-----------|----------------------|-------------------|--------------|
| RSA-2048 | every ~1024-bit prime | ~10^305 primes (~10^307 bytes) | more storage than 10^225 universes, one prime per atom |
| AES-128 | every key | 2^128 ≈ 3.4 × 10^38 keys (~10^39 bytes) | ~10^16 × all of Earth's storage |
| AES-256 | every key | 2^256 ≈ 10^77 keys | close to the atom count of the universe |
| ECC P-256 / Ed25519 | every private key | 2^256 ≈ 10^77 scalars | same wall as AES-256 |
| SHA-256 | a reverse-lookup table | 2^256 outputs, unbounded inputs | inputs have no fixed length, so the table can't be finished |

### How much disk would that actually be?

Translating the RSA prime table (~10^307 bytes) into real units doesn't help,
because the number runs off the end of every unit we have:

| Unit | Bytes each | Table size |
|------|-----------|-----------|
| Terabyte (TB) | 10^12 | 10^295 TB |
| Exabyte (EB) | 10^18 | 10^289 EB |
| Zettabyte (ZB) | 10^21 | 10^286 ZB |
| Yottabyte (YB) | 10^24 | 10^283 YB |
| Quettabyte (QB) | 10^30 | 10^277 QB |

The quettabyte (10^30 bytes) is the largest unit SI has a name for, and the
table is still 10^277 of them. All digital data on Earth today is about 10^23
bytes, so this is roughly 10^284 copies of everything humanity has ever stored.

A smaller case makes the method clearer. Storing every AES-128 key takes
2^128 × 16 ≈ 10^39 bytes — about 10^18 zettabytes, or 10^16 times all the data on
Earth. And AES-128 is the *easy* end of the table above.

### Why time doesn't save you either

Brute force is the time-side version of the same problem. To search a 2^128 key
space, even a billion machines each testing a trillion keys per second (10^21
keys/s total) would need 2^128 / 10^21 ≈ 3 × 10^17 seconds, about 10^10 years —
roughly the age of the universe, and that is the *small* case. AES-256, ECC-256,
and RSA-2048 all sit far beyond it.

### Bottom line

You cannot precompute or brute-force your way through a modern cipher because the
space of keys is larger than anything that can be stored or counted in the
physical world. Real attacks target weak keys, bad randomness, reused values, or
implementation bugs — never the full key space.

See [RSA](02-signatures/RSA.md) for the worked-out prime and factoring numbers.

---

## Does precomputing password hashes work? Yes — if they aren't salted

This is the one case where precomputation is a real, everyday attack, so it's
worth separating from the rest.

If a site stores raw `SHA-256(password)` and an attacker steals that list, they
can absolutely precompute hashes and look passwords up. Tools that do exactly
this are common: dictionary tables, rainbow tables, and online hash-lookup sites.

Why does it work here but not for keys? Because passwords are not random. A
256-bit key has 2^256 ≈ 10^77 equally likely values. Real passwords come from a
tiny, predictable space — dictionary words, names, dates, and leaked password
lists — realistically 10^10 to 10^12 candidates. That many hashes fit on an
ordinary disk and can be computed once and reused forever. The hash function is
fine; the input space is small.

**Defense 1 — salt.** A salt is a unique random value stored with each hash and
mixed in before hashing: `SHA-256(salt + password)`. With a unique salt per
user, a precomputed table is useless, because the attacker would need a separate
table for every possible salt. A 128-bit salt means 2^128 of them — back to
impossible. Salting doesn't make cracking one chosen hash much harder; it kills
the "compute once, crack everyone" economics.

**Defense 2 — slow hashes.** Don't store passwords with raw SHA at all. Use a
slow, memory-hard function built for the job: bcrypt, scrypt, Argon2, or PBKDF2.
These are deliberately expensive, so even guessing against a single salted hash
costs real time and money.

---

## Symmetric or asymmetric — which should I use?

Both, usually. They solve different problems:

- **Symmetric** (AES, ChaCha20): one shared key for both sides. Fast, good for
  bulk data. The catch is that both ends need the same secret, so how do you
  share it safely in the first place?
- **Asymmetric** (RSA, ECC): a public key anyone can use and a private key you
  keep. It solves key sharing and signatures, but it's slow and only handles
  small messages.

Real systems combine them. TLS (HTTPS) uses asymmetric crypto once to agree on a
random symmetric key, then encrypts the whole session with that fast symmetric
key. That's called hybrid encryption.

---

## What's the difference between encrypting, signing, and hashing?

They look alike but answer different questions:

| Operation | Question it answers | Key used | Reversible? |
|-----------|---------------------|----------|-------------|
| Encrypt | Can only the right person read this? | recipient's public or shared key | yes, with the key |
| Sign | Did this really come from the sender, unchanged? | sender's private key | verify with public key |
| Hash | Is this the same data as before? | none | no, one-way |

A hash is a fixed-size fingerprint with no key and no way back. A signature is a
hash of the data turned around with a private key, so anyone with the public key
can confirm who sent it. Encryption hides content; signing proves origin.

---

## Will quantum computers break all of this?

Some of it, eventually — not today.

- **Public-key crypto (RSA, ECC, Diffie-Hellman)** is the casualty. Shor's
  algorithm factors and solves discrete logs efficiently on a large quantum
  computer, which breaks these directly. No such machine exists yet, but data
  captured now could be decrypted later ("harvest now, decrypt later").
- **Symmetric crypto and hashes (AES, SHA)** mostly survive. Grover's algorithm
  only halves their strength, so AES-128 drops to about 64-bit security while
  AES-256 stays strong. The fix is just to use larger sizes.

The replacements are post-quantum algorithms NIST standardized in 2024: ML-KEM
(Kyber) for key exchange and ML-DSA (Dilithium) for signatures.

---

## Can I keep the algorithm secret instead of the key?

No — that's "security through obscurity," and it fails. The rule (Kerckhoffs's
principle) is that a system should stay secure even if everyone knows exactly how
it works; only the key is secret.

Secret algorithms leak, get reverse-engineered, and never get the public review
that catches flaws. Every algorithm in this guide is fully published, and that's
a strength: decades of experts trying and failing to break them is why we trust
them.

---

## Should I write my own encryption algorithm?

No. "Don't roll your own crypto" is the oldest advice in the field. Working
crypto isn't about a clever idea; it's about surviving years of expert attack and
dodging dozens of subtle implementation traps — timing leaks, padding bugs, weak
randomness. Use vetted libraries and standard algorithms. The hard part is almost
never the math, it's using it correctly.

---

## Why does randomness matter so much?

Because keys, salts, and nonces are only as unguessable as the random numbers
behind them. If the randomness is weak or predictable, so is the key, no matter
how strong the algorithm. Real breaks have come from exactly this:

- A 2008 Debian bug crippled OpenSSL's random generator, making the keys it
  produced guessable.
- The Sony PlayStation 3 reused one value where ECDSA needs a fresh random nonce
  every time, which leaked its private signing key.

Always use the operating system's cryptographic generator (`/dev/urandom`,
`getrandom`, `BCryptGenRandom`), never a plain `rand()`.

---

## Is a bigger key always better? (RSA-4096 vs RSA-2048)

Not really. Past a safe size, more bits cost performance without adding
meaningful safety. RSA-2048 already sits at ~112-bit security and isn't close to
breakable; RSA-4096 is slower for a margin nobody needs yet.

Key sizes also don't compare across families. Rough equivalents at the same
security level:

| Security level | Symmetric | RSA | ECC |
|----------------|-----------|-----|-----|
| 128-bit | AES-128 | RSA-3072 | 256-bit curve |
| 256-bit | AES-256 | RSA-15360 | 512-bit curve |

A 256-bit ECC key matches a 3072-bit RSA key — ECC gets the same strength from
far fewer bits, which is why it's now preferred.

---

## Which algorithms should I stop using?

The first-generation ones. These are broken or too weak and should be replaced:

| Avoid | Why | Use instead |
|-------|-----|-------------|
| MD5, SHA-1 | collisions found, practically broken | SHA-256 or SHA-3 |
| DES, 3DES | key too small, deprecated | AES-256 |
| RSA-1024 | factorable with current resources | RSA-2048+ or ECC |
| RC4 | biased output, broken | AES-GCM, ChaCha20 |
