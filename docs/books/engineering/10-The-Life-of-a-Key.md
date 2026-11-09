# 10. The Life of a Key

*A key is born, put to work, copied, handed on, replaced and finally destroyed,
and most systems that lose their secrets lose them at one of those steps rather
than in the cipher. This chapter follows a key through its whole life as
SP 800-57 describes it: how it is made and recorded, where it lives, how it
travels, why one key must do one job, how it is rotated without making old
data unreadable, what revocation can and cannot undo, and how backups and
escrow bring keys back that were meant to be gone. You will build AES-128 and
AES Key Wrap in plain Python and match the RFC 3394 test vector, derive purpose
keys with HKDF, run a versioned keyring through a rotation, pull a
"non-extractable" key out of a token that let one key do two jobs, and plan a
city's keys on Mars for the two weeks when the Sun cuts it off from Earth.*

!!! abstract "In this chapter"
    **You will learn:**

    - the stages and states of a key's life in SP 800-57 Part 1 Rev. 5, and
      what a cryptoperiod is and how long the standard suggests;
    - what a key inventory records, and why you cannot rotate what you cannot
      find;
    - how key hierarchies work: a root key, key-encryption keys (KEKs) and
      data-encryption keys (DEKs), and why rotation gets cheap with them;
    - how AES Key Wrap (RFC 3394, RFC 5649, SP 800-38F) works, coded on a
      compact AES-128 and checked against the standard's vector;
    - why one key must serve one purpose, with the real failures that taught
      it, and how to derive separate keys with HKDF labels;
    - how to rotate with versioned key IDs, and when to re-encrypt data or let
      it migrate lazily;
    - what compromise, revocation and destruction mean for symmetric and
      public keys, why backups fight destruction, and what key escrow cost the
      people who tried it in the 1990s.

    **You need:** book 1 [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)
    (§11.10 and §11.11, HKDF and the NIST KDFs) and
    [Chapter 16](../../book/16-PKI-and-Key-Establishment.md) (certificates and key
    establishment); [Chapter 4](04-Randomness-in-Practice.md) of this book for
    where key bytes come from, and [Chapter 2](02-Bytes-Encodings-and-Text.md)
    for length-prefixed encodings.

    **Levels:** §10.1 to §10.4 are for beginners, §10.5 to §10.11 are
    intermediate, §10.12 is expert.

## 10.1 The problem

*Level: beginner.*

On 17 March 2011 RSA Security, the company whose SecurID tokens put a
six-digit code on the key rings of tens of millions of employees, told its
customers that attackers had broken into its network and taken information
"specifically related to RSA's SecurID two-factor authentication products".
It did not say what. Customers guessed, and the guess was the worst one. Each
SecurID token computes its codes from a secret **seed**, a 64-bit or (in later
models) 128-bit key loaded at the factory. RSA kept a copy of every seed,
indexed by token serial number, so that it could send each customer the file
its authentication servers needed. With the seed file and a serial number, an
attacker could compute any token's codes.

The intrusion had started with an email to a few RSA employees carrying a
spreadsheet titled "2011 Recruitment plan", whose embedded Flash object
exploited a then-unknown flaw. Two months later, in late May, Lockheed Martin
detected an attack on its network that used cloned SecurID codes, and in June
RSA admitted that the stolen data had been used and offered to replace the
tokens of almost all of its customers: around 40 million devices. Its parent
company EMC reported a charge of about \$66 million for the clean-up in that
quarter. In 2021, after the non-disclosure agreements ran out, former RSA
staff told the journalist Andy Greenberg that the attackers had reached the
server that held the seed database.

Nothing in the story is a broken cipher. The code generator held up. What
failed was the **life** of the keys: they were made by someone other than
their users, a copy was kept that did not need to exist after delivery, that
copy sat on a networked server, nobody outside RSA knew it was there, and once
it leaked there was no way to change a key except to manufacture and ship a new
piece of hardware. Every one of those is a decision about generation, storage,
distribution, backup or revocation, and every one was made years before the
attack.

!!! note "Life story: the RSA SecurID seed breach"
    **Born:** March 2011, a phishing email with a booby-trapped spreadsheet
    sent to RSA employees; disclosed by RSA on 17 March 2011 · **Purpose:**
    the attackers' aim, as far as the record shows, was the token seeds, as a
    step toward defense contractors such as Lockheed Martin (attacked in May
    2011) · **Helped:** to end the practice of vendors keeping customers'
    token seeds by default; to spread the idea that a key's copies are part of
    its attack surface · **Status:** closed; RSA replaced about 40 million
    tokens. RSA never published a full account; the seed-database detail comes
    from former staff interviewed in 2021

This chapter is about that life. Book 1 explained where keys come from
mathematically ([Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) for
derivation, [Chapter 16](../../book/16-PKI-and-Key-Establishment.md) for
establishment); here the question is what an engineer does with a key from the
moment it exists until the moment no copy of it remains anywhere. The
standard reference is NIST's SP 800-57 Part 1, *Recommendation for Key
Management*, and its vocabulary is used throughout, but the ideas apply to any
system with a key in it: a web application's session secret, a phone's disk
key, a certificate authority's root, a city's archive on Mars.

Two forward pointers. Hardware that holds keys so that software never sees
them, HSMs, TPMs, secure enclaves and cloud key management services, is
[Chapter 11](11-Hardware-for-Keys.md). Encrypting application data with
per-record keys, envelope encryption and crypto-shredding in depth is
Chapter 14. This chapter introduces the
concepts both of those build on.

## 10.2 The life cycle and the cryptoperiod

*Level: beginner.*

SP 800-57 divides a key's life into four **phases**: pre-operational (the key
is being made and registered), operational (it is in use), post-operational
(it is no longer used to protect anything new but may still be needed, say to
decrypt old data), and destroyed. Inside those phases it tracks a key's
**state**, shown in Figure 10.1:

- **Pre-activation.** The key exists but may not be used yet: generated, and
  perhaps distributed, ahead of its start date.
- **Active.** The key may be used both to protect (encrypt, sign, wrap, MAC)
  and to process (decrypt, verify, unwrap).
- **Suspended.** Use is paused, for example while a possible compromise is
  investigated or a key holder is on leave. It can go back to active.
- **Deactivated.** The key may no longer protect anything new. It may still
  process: decrypt old data, verify old signatures.
- **Compromised.** Someone who should not have the key may have it. It may
  still process data under tight control, to recover what can be recovered,
  but nothing new is protected with it.
- **Destroyed.** The key is gone. Its metadata (its ID, its dates, the fact
  that it was compromised) may and usually should be kept.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Key states from SP 800-57: pre-activation leads to active; active can go to suspended and back, or to deactivated; any state can go to compromised; deactivated and compromised keys end destroyed" fill="currentColor" font-size="14">
<rect x="20" y="40" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="67" text-anchor="middle">pre-activation</text>
<rect x="250" y="40" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="315" y="67" text-anchor="middle" font-weight="bold">active</text>
<rect x="480" y="40" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545" y="67" text-anchor="middle">suspended</text>
<rect x="250" y="150" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="177" text-anchor="middle">deactivated</text>
<rect x="20" y="150" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="85" y="177" text-anchor="middle">compromised</text>
<rect x="250" y="240" width="130" height="44" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="250" y="240" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="267" text-anchor="middle">destroyed</text>
<line x1="150" y1="62" x2="244" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,62 242,58 242,66"/>
<text x="198" y="54" text-anchor="middle" font-size="12">start date</text>
<line x1="380" y1="54" x2="474" y2="54" stroke="currentColor" stroke-width="1.4"/>
<polygon points="480,54 472,50 472,58"/>
<line x1="480" y1="72" x2="386" y2="72" stroke="currentColor" stroke-width="1.4"/>
<polygon points="380,72 388,68 388,76"/>
<text x="430" y="94" text-anchor="middle" font-size="12">pause, resume</text>
<line x1="315" y1="84" x2="315" y2="144" stroke="currentColor" stroke-width="1.4"/>
<polygon points="315,150 311,142 319,142"/>
<text x="322" y="120" font-size="12">end of protect use</text>
<line x1="315" y1="194" x2="315" y2="234" stroke="currentColor" stroke-width="1.4"/>
<polygon points="315,240 311,232 319,232"/>
<line x1="85" y1="194" x2="85" y2="262" stroke="currentColor" stroke-width="1.4"/>
<line x1="85" y1="262" x2="244" y2="262" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,262 242,258 242,266"/>
<line x1="85" y1="84" x2="85" y2="144" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<polygon points="85,150 81,142 89,142"/>
<line x1="250" y1="84" x2="150" y2="150" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="250" y1="172" x2="156" y2="172" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<polygon points="150,172 158,168 158,176"/>
<text x="400" y="178" font-size="12">may still decrypt and verify</text>
<text x="400" y="268" font-size="12">metadata kept, key bytes gone</text>
<text x="20" y="22" font-size="12">dashed: a suspected or known compromise, from any state</text>
</svg>
<figcaption>Figure 10.1. The key states of SP 800-57 Part 1 Rev. 5. The arrow that matters most in practice is the one from active to deactivated: a key stops protecting new data long before it stops being needed to read old data.</figcaption>
</figure>

### The cryptoperiod

The **cryptoperiod** is the time a key is authorized for use. SP 800-57 splits
it in two for keys that protect data for later: the **originator-usage
period** (OUP), during which the key may protect new data, and the
**recipient-usage period** (RUP), during which it may still process what was
protected. The RUP starts with the OUP and may run past it. A data-encryption
key that encrypts backups for a year and must decrypt them for three more
years after that has an OUP of one year and a RUP of four.

Why limit a key's life at all, if AES-256 will not be broken by brute force in
any span that matters? SP 800-57 §5.3 lists the reasons, and none of them is
brute force:

- **Exposure.** The longer a key is in use, the more places it has been
  copied to, the more people have had access, and the more chances a bug, a
  backup tape or a departing employee has had to take it.
- **Volume.** Some modes have hard limits on how much data one key may
  process: about $2^{32}$ messages for AES-GCM with random 96-bit nonces
  ([§4.8](04-Randomness-in-Practice.md#48-nonces-ivs-and-unique-ids)), and
  birthday-bound limits for any 128-bit block cipher.
- **Damage.** If a key is compromised, everything it protected is exposed. A
  shorter cryptoperiod bounds how much that is.
- **Practice.** A system that changes its keys every year knows how to change
  them. A system that has never done it will find out how hard it is on the
  day of a compromise, which is the worst possible day to learn.

Table 1 of SP 800-57 Part 1 Rev. 5 gives suggested cryptoperiods by key type.
A selection:

| Key type | Suggested cryptoperiod |
| --- | --- |
| Private signature key | 1 to 3 years |
| Symmetric data-encryption key | OUP up to 2 years; RUP up to 3 years beyond the OUP |
| Symmetric key-wrapping key | OUP up to 2 years; RUP up to 3 years beyond the OUP |
| Symmetric authentication (MAC) key | OUP up to 2 years; RUP up to 3 years beyond the OUP |
| Symmetric master key (used only to derive other keys) | about 1 year |
| Private key-transport key | up to 2 years |
| Private static key-agreement key | 1 to 2 years |
| Ephemeral key-agreement key | one key-agreement transaction |

These are suggestions, not rules, and §5.3.6 of the standard is explicit that
volume changes them: for a high-volume link-encryption system it suggests an
originator-usage period of the order of a day or a week, not two years. The
public half of a signature key pair has no fixed limit; it must verify as long
as the signatures matter, which for a signed contract or a firmware root can
be decades. A Rev. 6 of Part 1 was out as an initial public draft in late 2025;
check whether it has replaced Rev. 5 before you cite numbers in a policy.

!!! note "Life story: SP 800-57"
    **Born:** August 2005, NIST's *Recommendation for Key Management*, in
    three parts (general guidance; organizations; application-specific
    guidance), led by Elaine Barker · **Purpose:** one vocabulary for the life
    of a key (states, phases, cryptoperiods, security strengths) and a
    baseline for US federal systems · **Helped:** the key-management sections
    of FIPS 140 module documentation, PCI rules, cloud KMS designs and most
    corporate key policies, which borrow its terms · **Status:** Part 1 Rev. 5
    (May 2020) is current; a Rev. 6 draft has been published for comment

**What to do.**

- Write down a cryptoperiod for every key type you use, with the reason.
  "Until something goes wrong" is a cryptoperiod, and a bad one.
- Separate the two periods in code: a key can be *deactivated for
  encryption* and still be *active for decryption*. §10.8 builds this.
- Treat the dates as data the system enforces, not text in a policy
  document.

## 10.3 Generation, registration and inventory

*Level: beginner.*

**Generation** is the easiest stage to describe and one of the most often
botched. A symmetric key is 128 or 256 bits from the operating system's
generator, as [Chapter 4](04-Randomness-in-Practice.md) explains; an
asymmetric key pair comes from a library's key-generation function fed by the
same source. SP 800-133 Rev. 2 (2020), NIST's *Recommendation for
Cryptographic Key Generation*, says the same in more words, and adds three
rules worth keeping even outside the federal world:

- **Generate the key where it will live.** A key made inside an HSM and never
  exported has never existed anywhere else. A key made on a laptop and then
  imported into an HSM existed on the laptop, in its swap file, perhaps in its
  backups.
- **Never derive a long-term key from a password alone.** A password-derived
  key is exactly as strong as the password; book 1
  [§11.4](../../book/11-Passwords-and-Key-Derivation.md#114-make-each-guess-slow-key-stretching-and-pbkdf2)
  shows how fast guessing goes. Password-based keys are for unlocking a
  stored random key, not for being the key.
- **Derived keys are fine** when the source is itself a full-strength key:
  a 256-bit root key through HKDF gives as many independent keys as you like
  (§10.6).

The RSA story shows the trap in "generate where it will live" from the other
side: the seeds were generated by the manufacturer, which then had no reason
to keep them but kept them anyway. When someone else must generate your keys,
ask what copies exist afterward and get the answer in writing.

**Registration** binds a key to an identity and to its metadata. For a public
key, registration is what a certificate does
([Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md)). For a
symmetric key there is no certificate, so the binding lives in a record that
your key management system keeps. SP 800-57 lists the information that may
be kept with a key (its "associated information"). In practice it comes down
to this:

| Field | Example | Why it matters |
| --- | --- | --- |
| Key ID | `records/v7` | Every ciphertext names the key that made it (§10.8) |
| Algorithm and length | AES-256-GCM | So the key cannot be used with anything else |
| Purpose | encrypt patient records | One key, one job (§10.6) |
| Owner | records service, team B | Who answers at 3 a.m. |
| State and dates | active since 2026-03-01; OUP ends 2027-03-01 | Enforced, not advisory |
| Parent | wrapped by `kek/records/v2` | The hierarchy (§10.4) |
| Copies | HSM cluster A; backup set 14 | What destruction must reach (§10.10) |
| Check value | `C2A4F1` | Proves which key is loaded without showing it |

The record never holds the key itself. It describes the key, and it outlives
it: after destruction, the record is the proof that the key existed, what it
protected and when it died.

**Inventory** is the set of all such records, and it is the stage most
organizations skip. A key that is not in the inventory is not rotated, not
destroyed, not revoked when its holder leaves, and not found when an auditor
or an incident asks "what did this key protect?" The questions to be able to
answer for every key are short: where is it, what does it protect, who can use
it, when does it expire, and how many copies exist. A useful test is to pick a
service at random and ask how long it would take to replace its keys tonight.
If the answer starts with "first we would have to find them", the inventory is
the place to start, before any cryptography. The same inventory is the base of
crypto agility: when an algorithm has to go, as SHA-1 did and RSA and
elliptic curves will, the inventory says where it is
(Chapter 17 treats inventories for
agility).

**What to do.**

- Generate keys inside the device or service that will use them, from the OS
  generator, and record that you did.
- Keep a record for every key: ID, algorithm, purpose, owner, state, dates,
  parent, copies, check value. Never the key bytes.
- Scan for keys that are not in the inventory: in code, configuration, CI
  variables and images ([Chapter 12](12-Secrets-in-Operations.md) does the
  scanning).

## 10.4 Hierarchies: keys that protect keys

*Level: beginner.*

Suppose a service stores ten million records and encrypts each one. It could
use one key for all of them. Then that key touches every byte, so the volume
limits of the last section bite; every process that reads any record holds the
key that reads all of them; and changing the key means decrypting and
re-encrypting ten million records, with the service either down or in a
long, delicate migration. Nobody does it, so the key is never changed.

The way out is a **key hierarchy**, Figure 10.2. At the top is a **root key**
(also called a master key), kept in an HSM or a cloud key management service
and never exported. Below it are **key-encryption keys** (KEKs), one per
service, tenant or table, each stored only in *wrapped* form: encrypted under
the root. At the bottom are **data-encryption keys** (DEKs), one per record,
file or object, each stored wrapped under its KEK, right next to the data it
encrypts. To read a record, a process asks the key service to unwrap its DEK,
gets the DEK back (or, better, asks the service to do the decryption), and
decrypts the record locally. This pattern is called **envelope encryption**:
the data is sealed under a DEK, and the DEK travels in an envelope sealed
under the KEK.

<figure class="mars-fig">
<svg viewBox="0 0 640 312" width="640" role="img" aria-label="A key hierarchy: a root key inside an HSM wraps three key-encryption keys; each KEK wraps many data-encryption keys; each DEK encrypts one record and is stored wrapped beside it" fill="currentColor" font-size="14">
<rect x="230" y="14" width="180" height="50" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="230" y="14" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">root key</text>
<text x="320" y="54" text-anchor="middle" font-size="12">inside the HSM, never exported</text>
<line x1="280" y1="64" x2="110" y2="112" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="64" x2="320" y2="112" stroke="currentColor" stroke-width="1.4"/>
<line x1="360" y1="64" x2="530" y2="112" stroke="currentColor" stroke-width="1.4"/>
<text x="440" y="96" font-size="12">wraps</text>
<rect x="40" y="112" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="132" text-anchor="middle">KEK: records</text>
<text x="110" y="148" text-anchor="middle" font-size="12">stored wrapped</text>
<rect x="250" y="112" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="132" text-anchor="middle">KEK: tenant 7</text>
<text x="320" y="148" text-anchor="middle" font-size="12">stored wrapped</text>
<rect x="460" y="112" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="530" y="132" text-anchor="middle">KEK: backups</text>
<text x="530" y="148" text-anchor="middle" font-size="12">stored wrapped</text>
<line x1="80" y1="156" x2="50" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="110" y1="156" x2="110" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="140" y1="156" x2="170" y2="200" stroke="currentColor" stroke-width="1.2"/>
<rect x="20" y="200" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="50" y="220" text-anchor="middle" font-size="12">DEK</text>
<rect x="85" y="200" width="50" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="110" y="220" text-anchor="middle" font-size="12">DEK</text>
<rect x="140" y="200" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="170" y="220" text-anchor="middle" font-size="12">DEK</text>
<line x1="50" y1="230" x2="50" y2="252" stroke="currentColor" stroke-width="1.2"/>
<line x1="110" y1="230" x2="110" y2="252" stroke="currentColor" stroke-width="1.2"/>
<line x1="170" y1="230" x2="170" y2="252" stroke="currentColor" stroke-width="1.2"/>
<rect x="20" y="252" width="180" height="30" rx="4" fill="currentColor" opacity="0.08"/>
<text x="110" y="272" text-anchor="middle" font-size="12">records, each under its own DEK</text>
<text x="320" y="190" text-anchor="middle" font-size="12">a DEK per object,</text>
<text x="320" y="206" text-anchor="middle" font-size="12">stored wrapped beside it</text>
<text x="530" y="190" text-anchor="middle" font-size="12">destroy this KEK and</text>
<text x="530" y="206" text-anchor="middle" font-size="12">every backup it covers</text>
<text x="530" y="222" text-anchor="middle" font-size="12">is unreadable</text>
<text x="320" y="304" text-anchor="middle" font-size="12">rotate a KEK: re-wrap its small DEKs, leave the gigabytes alone</text>
</svg>
<figcaption>Figure 10.2. A three-level key hierarchy. The root key never leaves its hardware; KEKs and DEKs exist at rest only in wrapped form. Each level limits what the one above it touches and what a single compromise exposes.</figcaption>
</figure>

The hierarchy buys five things at once.

1. **The root touches almost nothing.** It wraps a few hundred KEKs, not
   terabytes of data, so its volume limits never matter and its cryptoperiod
   can be long.
2. **Rotation is cheap.** A new KEK means re-wrapping the DEKs under it: a
   few dozen bytes each. The data itself is untouched (§10.8).
3. **Compromise is contained.** A leaked DEK exposes one record; a leaked
   tenant KEK exposes one tenant.
4. **Access is checked at one point.** Every unwrap is a call to the key
   service, which can enforce who may unwrap which KEK's children and log
   every request. The log of unwraps is often the best evidence an incident
   team ever gets.
5. **Destruction is possible.** Destroying one small KEK makes everything
   under it unreadable, even copies on backup tapes nobody can find. This is
   **crypto-shredding**, done properly in
   Chapter 14.

The costs are real too. The key service is now on the read path of every
record, so its availability is your availability, and its latency is paid on
every unwrap unless DEKs are cached (with a time limit and a size limit, or the
cache becomes the new root). And a hierarchy is only as strong as its top: if
the root key can be exported, or any process can call "unwrap" on any KEK, the
levels below add bookkeeping, not security.

**Wrapping or deriving?** There are two ways to make a child key. A wrapped
child is random, generated independently and stored encrypted under the
parent. A derived child is computed from the parent with a KDF and a label,
$K_{\text{child}} = \mathrm{HKDF}(K_{\text{parent}}, \text{label})$, and stored
nowhere. Derivation needs no storage and no unwrap call, which is why TLS 1.3
derives every key of a connection from one secret. But a derived key can
never be destroyed on its own: anyone holding the parent can recompute it.
And it cannot be rotated on its own: a new child needs a new label, and the
old one can still be recomputed. So derive keys that live and die with their
parent, such as the encryption and MAC keys of one session, and wrap keys that
need their own life, such as a per-customer key that may have to be shredded
when the customer leaves.

!!! note "Life story: envelope encryption in cloud key services"
    **Born:** the pattern is older than the cloud (banking HSMs used master
    keys and working keys in the 1970s and 1980s); Amazon's Key Management
    Service (November 2014) made it a single API call, `GenerateDataKey`,
    which returns a fresh DEK both in plaintext and wrapped under a KMS key ·
    **Purpose:** let applications encrypt any amount of data locally while
    the root key stays in hardware · **Helped:** storage encryption across
    every major cloud (AWS, Google Cloud KMS, Azure Key Vault), and libraries
    such as Google Tink's envelope AEAD · **Status:** the standard design;
    [Chapter 11](11-Hardware-for-Keys.md) covers the services and
    Chapter 14 builds it

**What to do.**

- Put the root in hardware or a managed key service and make it
  non-exportable. Everything else is wrapped under it.
- Give each tenant, table or data class its own KEK, so rotation, access
  control and destruction can act on one of them at a time.
- Derive keys that share a lifetime; wrap keys that need their own.

## 10.5 Key wrap

*Level: intermediate.*

A wrapped key is an encrypted key, but keys are a special kind of plaintext,
and the mode that wraps them is chosen for that. A key is short (16 or 32
bytes) and uniformly random. It is usually wrapped once and unwrapped many
times. And the failure that matters most is not that someone reads it, which
the cipher prevents, but that a damaged or substituted blob unwraps *without
an error* into a wrong key, which then encrypts a year of data that nobody can
read back. So the mode needs integrity. Because the plaintext is random and
never repeats, it does not need a nonce: wrapping is deterministic, the same
key under the same KEK always gives the same bytes. Phillip Rogaway and Thomas
Shrimpton gave that goal a name in 2006: **deterministic authenticated
encryption**.

NIST published the **AES Key Wrap** specification in 2001, and Jim Schaad and
Russ Housley wrote it up as RFC 3394 in 2002. RFC 5649 (Housley and Morris
Dworkin, 2009) added a padded variant for keys whose length is not a multiple
of 8 bytes. SP 800-38F (Dworkin, 2012) approves both, as **KW** and **KWP**.
The site's [Key wrap](../../05-modes-aead/Key-Wrap.md) page has the reference
details; here is how it works and how to build it.

### How KW works

Split the key into $n \ge 2$ 64-bit halves of a block, $R_1, \ldots, R_n$
(the standard calls them semiblocks), and set a 64-bit register
$A = \mathtt{A6A6A6A6A6A6A6A6}$. Then make six passes over the key. In pass
$j = 0, \ldots, 5$, for each $i = 1, \ldots, n$:

$$
B = \mathrm{AES}_K(A \,\Vert\, R_i), \qquad
A = \mathrm{MSB}_{64}(B) \oplus t, \qquad
R_i = \mathrm{LSB}_{64}(B), \qquad t = nj + i .
$$

The output is $A \,\Vert\, R_1 \,\Vert\, \cdots \,\Vert\, R_n$: 8 bytes longer
than the key, after $6n$ AES calls (12 for a 128-bit key, 24 for a 256-bit
key). The step counter $t$ makes every one of those calls different, so no two
steps can be swapped. Unwrapping runs the same steps backwards with AES
decryption and then checks that $A$ came out as `A6A6A6A6A6A6A6A6`. Six passes
spread every bit of the key into every bit of $A$, so any change anywhere in
the blob scrambles $A$, and a forged or damaged blob passes the check with
probability $2^{-64}$.

**KWP** (RFC 5649) changes the start value to `A65959A6` followed by the key's
length in bytes as 32 bits, pads the key with zero bytes to a multiple of 8,
and checks the constant, the length and the zero padding on unwrap. A key of 8
bytes or fewer is wrapped with a single AES call. KWP is what you use for
anything that is not an AES key, such as a DER-encoded RSA private key.

### Code it: AES-128 and AES-KW

Python's standard library has no AES, so the block below builds AES-128 from
its definition in under fifty lines (book 1
[Chapter 7](../../book/07-AES.md) explains each step) and puts KW on top. It
checks the cipher against the example in FIPS 197 Appendix C.1 and the wrap
against RFC 3394 §4.1, where a 128-bit KEK wraps a 128-bit key. Both must
match to the last bit.

```python
def xtime(a):                                  # multiply by x in GF(2^8)
    return ((a << 1) ^ 0x11b) if a & 0x80 else a << 1

EXP, x = [], 1                                 # powers of 3, a generator of GF(2^8)*
for _ in range(255):
    EXP.append(x)
    x ^= xtime(x)
LOG = {v: i for i, v in enumerate(EXP)}
rotl = lambda b, n: ((b << n) | (b >> (8 - n))) & 0xff
def sbox(a):                                   # invert, then the affine map (book 1 ch 7)
    b = EXP[-LOG[a] % 255] if a else 0
    return b ^ rotl(b, 1) ^ rotl(b, 2) ^ rotl(b, 3) ^ rotl(b, 4) ^ 0x63
SBOX = [sbox(a) for a in range(256)]
INV = [SBOX.index(i) for i in range(256)]

def expand(key):                               # AES-128 key schedule: 11 round keys
    w, rc = [list(key[i:i + 4]) for i in range(0, 16, 4)], 1
    for i in range(4, 44):
        t = w[i - 1]
        if i % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]
            t[0] ^= rc
            rc = xtime(rc)
        w.append([a ^ b for a, b in zip(w[i - 4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(11)]

def mix(s, inverse=False):                     # MixColumns, or its inverse
    for c in range(0, 16, 4):
        a = s[c:c + 4]
        if inverse:                            # undo with one extra step, then mix
            u, v = xtime(xtime(a[0] ^ a[2])), xtime(xtime(a[1] ^ a[3]))
            a = [a[0] ^ u, a[1] ^ v, a[2] ^ u, a[3] ^ v]
        t = a[0] ^ a[1] ^ a[2] ^ a[3]
        s[c:c + 4] = [a[i] ^ t ^ xtime(a[i] ^ a[(i + 1) % 4]) for i in range(4)]

def shift(s, d):                               # ShiftRows (d = 1) or its inverse (d = -1)
    return [s[(i + 4 * d * (i % 4)) % 16] for i in range(16)]

def aes_enc(rk, block):
    s = [b ^ k for b, k in zip(block, rk[0])]
    for r in range(1, 11):
        s = shift([SBOX[b] for b in s], 1)
        if r < 10:
            mix(s)
        s = [b ^ k for b, k in zip(s, rk[r])]
    return bytes(s)

def aes_dec(rk, block):
    s = [b ^ k for b, k in zip(block, rk[10])]
    for r in range(9, -1, -1):
        s = [INV[b] ^ k for b, k in zip(shift(s, -1), rk[r])]
        if r > 0:
            mix(s, inverse=True)
    return bytes(s)

IV = bytes.fromhex("a6a6a6a6a6a6a6a6")
xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))

def wrap(kek, key):                            # RFC 3394 section 2.2.1
    rk, n = expand(kek), len(key) // 8
    a, r = IV, [key[i:i + 8] for i in range(0, len(key), 8)]
    for j in range(6):
        for i in range(n):
            b = aes_enc(rk, a + r[i])
            a, r[i] = xor(b[:8], (n * j + i + 1).to_bytes(8, "big")), b[8:]
    return a + b"".join(r)

def unwrap(kek, c):                            # the same steps backwards, then the check
    rk, n = expand(kek), len(c) // 8 - 1
    a, r = c[:8], [c[i:i + 8] for i in range(8, len(c), 8)]
    for j in range(5, -1, -1):
        for i in range(n - 1, -1, -1):
            b = aes_dec(rk, xor(a, (n * j + i + 1).to_bytes(8, "big")) + r[i])
            a, r[i] = b[:8], b[8:]
    if a != IV:
        raise ValueError("unwrap failed")
    return b"".join(r)

kek = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
key = bytes.fromhex("00112233445566778899aabbccddeeff")
print("FIPS 197 C.1:", aes_enc(expand(kek), key).hex())
w = wrap(kek, key)
print("RFC 3394 4.1:", w.hex())
print("unwrapped:   ", unwrap(kek, w).hex())
try:
    unwrap(kek, w[:-1] + bytes([w[-1] ^ 1]))  # one bit flipped in storage
except ValueError as e:
    print("tampered:    ", e)
```

It prints:

```
FIPS 197 C.1: 69c4e0d86a7b0430d8cdb78070b4c55a
RFC 3394 4.1: 1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5
unwrapped:    00112233445566778899aabbccddeeff
tampered:     unwrap failed
```

The first line is the ciphertext FIPS 197 gives for its Appendix C.1 example,
and the second is the wrapped key printed in RFC 3394 §4.1,
`1FA68B0A8112B447 AEF34BD8FB5A7B82 9D3E862371D2CFE5`. A single flipped bit in
the stored blob is refused rather than unwrapped into a wrong key, which is
the property the mode exists for. This code is for learning: it uses table
lookups indexed by secret bytes, which leak through the cache
([Chapter 5](05-Constant-Time-Programming.md)), and it is slow. In production
the wrap happens inside the HSM or KMS, or in a library (OpenSSL's
`EVP_aes_128_wrap`, PyCA `cryptography`'s `aes_key_wrap`).

**Why not just use AES-GCM?** You can, and many systems do: a DEK sealed with
AES-GCM under a KEK, with a random nonce, is a perfectly good envelope, and it
carries a 128-bit tag where KW has a 64-bit check. KW's advantages are that it
needs no nonce (so no nonce can repeat) and that it is what HSMs, PKCS#11,
CMS and JSON Web Encryption (`A128KW`, `A256KW` in RFC 7518) expect. AES-SIV
(RFC 5297) and AES-GCM-SIV (RFC 8452) give deterministic authenticated
encryption with a proof and a 128-bit tag. Because the KW check is only 64
bits, SP 800-38F recommends watching and limiting failed unwraps per key: a
forger who can try many blobs gets a fresh $2^{-64}$ chance each time.

!!! note "Life story: AES Key Wrap"
    **Born:** NIST's AES Key Wrap Specification, November 2001; RFC 3394
    (Jim Schaad and Russ Housley, 2002); the padded KWP in RFC 5649 (Housley
    and Morris Dworkin, 2009); both approved in SP 800-38F (2012) ·
    **Purpose:** move and store keys under other keys, with no nonce and a
    built-in integrity check · **Helped:** CMS and S/MIME key recipients,
    JSON Web Encryption, PKCS#11 tokens, and key import into cloud KMS
    (Google Cloud KMS imports a key wrapped with KWP under a one-time key,
    itself wrapped with RSA-OAEP) · **Status:** approved and widely used; no
    attack on the mode itself is known, though it has no full security proof.
    NIST proposed in 2026 to revise SP 800-38F and drop its Triple-DES
    variant, TKW

### Break it: a token that lets one key wrap and decrypt

A wrapped key is only as safe as the rules about who may unwrap it, and the
classic failure is a key allowed to do two jobs. In 2003 Jolyon Clulow, then at
the University of Cambridge, showed that PKCS#11, the standard interface to HSMs and
smart cards, let a single key carry both the **wrap** attribute and the
**decrypt** attribute. A key marked *sensitive* is supposed never to leave the
token in the clear. But if the token will wrap it under key $W$, and will also
decrypt arbitrary data under $W$, the attacker asks for both and has the key.
Clulow's version used a simple encryption mode for the wrap; the block below
shows that AES-KW does not save the token, because KW's unwrap is nothing but
block decryptions and XORs, and the attacker can run it outside the token
while the token supplies each decryption (Figure 10.3).

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The wrap and decrypt attack: the attacker asks the token to wrap a secret key under W, then runs the unwrap algorithm on its own machine, asking the token for each block decryption under W, and recovers the secret key" fill="currentColor" font-size="14">
<rect x="20" y="30" width="200" height="170" rx="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="22" text-anchor="middle" font-weight="bold">token</text>
<rect x="40" y="50" width="160" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<text x="120" y="68" text-anchor="middle" font-size="13">secret S</text>
<text x="120" y="84" text-anchor="middle" font-size="12">sensitive, extractable</text>
<rect x="40" y="110" width="160" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="120" y="128" text-anchor="middle" font-size="13">key W</text>
<text x="120" y="144" text-anchor="middle" font-size="12">attributes: wrap + decrypt</text>
<text x="120" y="186" text-anchor="middle" font-size="12">neither key ever leaves</text>
<rect x="420" y="30" width="200" height="170" rx="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="22" text-anchor="middle" font-weight="bold">attacker's program</text>
<text x="520" y="64" text-anchor="middle" font-size="12">holds handles, not keys</text>
<text x="520" y="110" text-anchor="middle" font-size="12">runs KW unwrap itself:</text>
<text x="520" y="126" text-anchor="middle" font-size="12">12 steps, each needs D_W</text>
<text x="520" y="172" text-anchor="middle" font-size="13" font-weight="bold">result: S in the clear</text>
<line x1="420" y1="60" x2="226" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="220,60 228,56 228,64"/>
<text x="320" y="52" text-anchor="middle" font-size="12">1. wrap S under W</text>
<line x1="220" y1="78" x2="414" y2="78" stroke="currentColor" stroke-width="1.4"/>
<polygon points="420,78 412,74 412,82"/>
<text x="320" y="94" text-anchor="middle" font-size="12">wrapped blob (fine so far)</text>
<line x1="420" y1="130" x2="226" y2="130" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<polygon points="220,130 228,126 228,134"/>
<text x="320" y="122" text-anchor="middle" font-size="12">2. decrypt this block under W</text>
<line x1="220" y1="148" x2="414" y2="148" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<polygon points="420,148 412,144 412,152"/>
<text x="320" y="166" text-anchor="middle" font-size="12">block, repeated 12 times</text>
</svg>
<figcaption>Figure 10.3. Clulow's key-separation attack in its KW form. Each request is allowed by the token's rules taken one at a time; together they export a key that was never supposed to leave in the clear.</figcaption>
</figure>

The token here uses a stand-in block cipher, four Feistel rounds over
HMAC-SHA256, so that the block runs on its own; it is labeled as such in the
code. The attack never looks inside the cipher, and run with the AES of the
block above in place of `E` and `D` it gives the same result.

```python
import hmac, os

# Stand-in block cipher (16-byte blocks): four Feistel rounds over HMAC-SHA256.
# It is not AES; the attack below never looks inside it, so AES behaves the same.
def F(k, r, x):
    return hmac.digest(k, bytes([r]) + x, "sha256")[:8]
xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))
def E(k, b):
    L, R = b[:8], b[8:]
    for r in range(4):
        L, R = R, xor(L, F(k, r, R))
    return L + R
def D(k, b):
    L, R = b[:8], b[8:]
    for r in (3, 2, 1, 0):
        L, R = xor(R, F(k, r, L)), L
    return L + R

IV = bytes.fromhex("a6a6a6a6a6a6a6a6")
def kw_wrap(kek, key):                          # RFC 3394, as in the block above
    n, a, r = len(key) // 8, IV, [key[i:i + 8] for i in range(0, len(key), 8)]
    for j in range(6):
        for i in range(n):
            b = E(kek, a + r[i])
            a, r[i] = xor(b[:8], (n * j + i + 1).to_bytes(8, "big")), b[8:]
    return a + b"".join(r)

class Token:
    """Keys live inside; callers get handles and may only ask for operations."""
    def __init__(self):
        self.keys, self.attrs = {}, {}
    def generate(self, attrs):
        h = len(self.keys) + 1
        self.keys[h], self.attrs[h] = os.urandom(16), set(attrs)
        return h
    def decrypt_block(self, h, block):           # a raw block decrypt, "for a legacy protocol"
        if "decrypt" not in self.attrs[h]:
            raise PermissionError("key may not decrypt")
        return D(self.keys[h], block)
    def wrap_key(self, h_kek, h_key):            # export a key, wrapped, for backup
        if "wrap" not in self.attrs[h_kek] or "extractable" not in self.attrs[h_key]:
            raise PermissionError("not allowed")
        return kw_wrap(self.keys[h_kek], self.keys[h_key])

tok = Token()
secret = tok.generate({"sign", "extractable"})   # may leave the token only wrapped
kek = tok.generate({"wrap", "decrypt"})          # one key, two jobs

# The attacker never sees a key. They wrap the secret, then run KW's unwrap
# themselves, asking the token for every block decryption it needs.
c = tok.wrap_key(kek, secret)
n = len(c) // 8 - 1
a, r = c[:8], [c[i:i + 8] for i in range(8, len(c), 8)]
for j in range(5, -1, -1):
    for i in range(n - 1, -1, -1):
        b = tok.decrypt_block(kek, xor(a, (n * j + i + 1).to_bytes(8, "big")) + r[i])
        a, r[i] = b[:8], b[8:]
print("check value intact:", a == IV)
print("recovered the secret key:", b"".join(r) == tok.keys[secret])   # the referee looks
```

It prints:

```
check value intact: True
recovered the secret key: True
```

Each call was allowed. The secret was extractable only *in wrapped form*, and
the token did wrap it; the KEK was allowed to decrypt, and the token did
decrypt. The flaw is in the combination, and no single permission check can
see it.

### Fix it

The fix is to make the two jobs exclusive at the moment a key is created, and
to refuse to change them afterward. PKCS#11 has the attributes to do it
(`CKA_WRAP`, `CKA_DECRYPT`, `CKA_SENSITIVE`, `CKA_EXTRACTABLE`, plus
`CKA_WRAP_WITH_TRUSTED` and `CKA_TRUSTED`, which say that a key may be
wrapped only under a key the security officer has marked trusted), but leaves
the policy to the vendor. A token with a sound policy enforces something like
this:

```python
EXCLUSIVE = [{"wrap", "decrypt"}, {"unwrap", "encrypt"}, {"wrap", "unwrap"}]
STICKY = {"sensitive"}                     # once set, never cleared

def check_template(attrs):
    for pair in EXCLUSIVE:
        if pair <= attrs:
            raise PermissionError("one key, one job: " + " and ".join(sorted(pair)))

def change(attrs, new):
    if STICKY & attrs - new:
        raise PermissionError("sensitive cannot be cleared")
    check_template(new)
    return new

for t in [{"wrap", "decrypt"}, {"wrap"}, {"decrypt"}]:
    try:
        check_template(t)
        print(sorted(t), "accepted")
    except PermissionError as e:
        print(sorted(t), "refused:", e)
try:
    change({"wrap", "sensitive"}, {"wrap", "decrypt"})   # the same attack, done later
except PermissionError as e:
    print("later change refused:", e)
```

It prints:

```
['decrypt', 'wrap'] refused: one key, one job: decrypt and wrap
['wrap'] accepted
['decrypt'] accepted
later change refused: sensitive cannot be cleared
```

The last line matters as much as the first: many tokens checked the template
when a key was made but let a later `C_SetAttributeValue` call add the
forbidden attribute. Clulow's paper and the later work it started (§10.12)
found attack after attack of this shape, including ones that went through two
or three keys. The pairs above are not the full set a real token needs; the
point is that the policy must exist, must be checked on every change, and
must be the token's, not the caller's.

!!! note "Life story: Clulow's PKCS#11 attacks"
    **Born:** 2003, Jolyon Clulow, "On the Security of PKCS #11" (CHES 2003),
    building on work by Mike Bond and Ross Anderson on banking HSM APIs ·
    **Purpose:** show that a key-management API can leak keys through
    sequences of individually permitted calls · **Helped:** the field of
    security-API analysis, including Tookan (Bortolozzo, Centenaro, Focardi
    and Steel, ACM CCS 2010), which modeled real tokens and found key
    extractions on commercial devices; the trusted-wrapping attributes of
    PKCS#11 v2.20 (2004) and stricter attribute policies in modern HSMs ·
    **Status:** the attacks still work on
    any token whose policy allows the combinations;
    [Chapter 11](11-Hardware-for-Keys.md) covers choosing and configuring HSMs

**What to do.**

- Wrap keys with KW or KWP when an HSM, PKCS#11, CMS or JWE expects it;
  otherwise an AEAD or AES-SIV is fine. Never wrap with a mode that has no
  integrity check.
- Rate-limit and alert on failed unwraps.
- In any key store, make "wraps keys" and "decrypts data" different keys,
  fixed at creation and never changed.

## 10.6 One key, one purpose

*Level: intermediate.*

The token above is one case of a rule old enough to appear in SP 800-57
(§5.2): **a key should be used for only one purpose**, meaning one algorithm,
one mode, one role and one protocol. The reason is that every security proof
is a proof about one use. A proof that RSA-OAEP encryption is secure assumes
the attacker can see only decryptions; a proof that RSA-PSS signatures are
secure assumes the attacker can see only signatures. Nobody proved anything
about a key that does both, and when the two uses meet, each can become an
oracle for the other. The field learned this from failures, not theory.

**Encryption and MAC with one key.** The textbook case. Encrypt a message with
AES in CBC mode with a zero IV under key $K$, and compute a CBC-MAC of the
same message under the same $K$: the MAC is the last ciphertext block. The
attacker gets the "MAC" for free with any ciphertext, so it authenticates
nothing. Every cryptography course shows it; it still turns up in embedded
protocols.

**Wrap and decrypt in one token** (Clulow 2003), the Break it of §10.5.

**Signing and decryption in one card.** EMV payment cards hold an RSA key
used for signatures, to prove the card is genuine, and in some deployments the
same key was used to decrypt the PIN the terminal sends. Jean Paul Degabriele,
Anja Lehmann, Kenneth Paterson, Nigel Smart and Mario Strefler showed in 2012
(CT-RSA) that a Bleichenbacher-style padding oracle in the decryption path
can be turned into forged signatures in the card's name. They also proved
that a carefully chosen pair of schemes could share a key safely, which is the
exception that proves how much care it takes.

**Decryption in one protocol, signing in another.** Tibor Jager, Jörg Schwenk
and Juraj Somorovsky showed in 2015 (ACM CCS) that a server whose RSA
certificate is used both for RSA key transport in TLS 1.2 and for signatures
in TLS 1.3 or QUIC can be made to sign: a padding oracle on the TLS 1.2 side
lets an attacker forge the TLS 1.3 signature, and so impersonate the server,
even though TLS 1.3 itself never decrypts with RSA. The key, not the protocol,
was shared.

**The same key in an old protocol.** DROWN (2016) decrypted modern TLS
sessions using SSL 2.0 as the oracle, on any server that shared the RSA key,
often a mail server holding the same certificate as the web server. At
disclosure about a third of HTTPS servers were exposed, most of them through
key reuse. The attack is told in Cryptanalysis
[§13.9](../cryptanalysis/13-Attacks-on-RSA.md#139-the-oracle-returns-robot-drown-and-marvin)
and the protocol side in
[Chapter 19](../cryptanalysis/19-Protocol-Breaks.md); the lesson for key
management is that a certificate copied to a second service is a key used for
a second purpose.

### Deriving purpose keys

The cure costs almost nothing: never use a stored key directly. Keep one
**root** (or master) key per system and derive a separate key for each purpose
with a KDF and a **label** that names the purpose. HKDF (RFC 5869) is the
usual KDF; book 1 [§11.10](../../book/11-Passwords-and-Key-Derivation.md#1110-keys-from-strong-secrets-hkdf)
explains its two steps, and the site's [HKDF](../../08-kdf-password-hashing/HKDF.md)
page has the details. Two independent HMAC-SHA256 outputs with different
`info` strings are, as far as anyone can tell, independent keys: knowing one,
or getting a million MACs under one, tells you nothing about the other.

The engineering is all in the label. Four rules:

1. **Name the application and a version.** `arcadia-records v1` today means
   `arcadia-records v2` can derive different keys tomorrow, and no other
   program that happens to use the same root will collide with yours.
2. **Name the purpose and the algorithm.** `encrypt`, `mac`, `search-index`;
   if the same purpose may be served by two algorithms during a migration,
   include the algorithm too.
3. **Include the context that should split keys:** a tenant ID, a table, a
   direction of traffic. Keys for tenant 7 should be useless for tenant 8.
4. **Encode the fields so that no two lists of fields give the same bytes.**
   `b"enc" + b"rypt-v1"` and `b"encrypt" + b"-v1"` are the same string. Use
   length prefixes, as [Chapter 2](02-Bytes-Encodings-and-Text.md) builds,
   and include the output length if callers may ask for different lengths,
   as SP 800-108 does, so a 16-byte key is not the prefix of a 32-byte one.

### Code it: HKDF from HMAC, and purpose keys

The block builds HKDF from `hmac`, checks it against test case 1 of RFC 5869
(both the intermediate PRK and the 42-byte output), and then derives purpose
keys from one root with length-prefixed labels.

```python
import hashlib, hmac

def hkdf_extract(salt, ikm):
    return hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()

def hkdf_expand(prk, info, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out, i = out + t, i + 1
    return out[:n]

# RFC 5869, appendix A.1 (test case 1)
prk = hkdf_extract(bytes(range(13)), bytes([0x0b] * 22))
okm = hkdf_expand(prk, bytes(range(0xf0, 0xfa)), 42)
assert prk.hex() == "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5"
assert okm.hex() == ("3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db0"
                     "2d56ecc4c5bf34007208d5b887185865")
print("RFC 5869 test case 1: ok")

def label(*fields):                     # length-prefixed, so no two lists encode alike
    return b"".join(len(f).to_bytes(2, "big") + f for f in fields)

def purpose_key(root, purpose, context=b"", n=32):
    info = label(b"arcadia-records", b"v1", purpose, context, n.to_bytes(2, "big"))
    return hkdf_expand(hkdf_extract(b"arcadia-records salt v1", root), info, n)

root = bytes.fromhex("8f" * 32)         # stand-in for a root key held in an HSM
for p, c in [(b"encrypt", b""), (b"mac", b""), (b"encrypt", b"tenant=7"),
             (b"search-index", b"")]:
    print(f"{p.decode():13} {c.decode() or '-':9}", purpose_key(root, p, c).hex()[:16])
```

It prints:

```
RFC 5869 test case 1: ok
encrypt       -         3762945084656865
mac           -         cbab8820a09b2919
encrypt       tenant=7  4233db3affdf5e4e
search-index  -         b91b12e7985a2627
```

One root, four unrelated keys. The `search-index` key is worth a second look:
a deterministic index for equality search leaks which records are equal
(Chapter 14 measures how much), so it must never be the same key that
encrypts the records themselves, or a weakness in the index becomes a weakness
in the records.

### Break it: one secret for everything

Web frameworks give each application one secret, and the temptation is to use
it directly wherever a MAC is needed. Here an application signs its session
cookies with the secret, and also signs share links for files that users
upload, using the file name as the message. File names are chosen by users.

```python
import hashlib, hmac, secrets

SECRET = secrets.token_bytes(32)               # the app's one secret, used for everything

def tag(msg):
    return hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()

def make_cookie(user):                         # job 1: session cookies
    return f"user={user}.{tag('user=' + user)}"

def check_cookie(cookie):
    body, _, t = cookie.rpartition(".")
    return body[5:] if hmac.compare_digest(t, tag(body)) else None

def share_link(filename):                      # job 2: links to a user's own files
    return f"/files/{filename}?sig={tag(filename)}"

# The attacker uploads a file with a chosen name and asks for a share link.
link = share_link("user=admin")
sig = link.split("sig=")[1]
forged = "user=admin." + sig
print("logged in as:", check_cookie(forged))
```

It prints:

```
logged in as: admin
```

HMAC is not broken, the comparison is constant-time, and the cookie format is
reasonable. The share-link feature is a **signing oracle** for the cookie
feature, because both sign with one key and their messages can coincide. Each
feature was correct when it was written; the second one broke the first.

### Fix it

Derive a key per purpose. The block uses one block of HKDF, inlined.

```python
import hashlib, hmac, secrets

ROOT = secrets.token_bytes(32)

def derive(purpose):                           # HKDF with one output block, as in book 1 ch 11
    prk = hmac.new(b"myapp v1", ROOT, hashlib.sha256).digest()
    return hmac.new(prk, b"myapp v1 " + purpose + b"\x01", hashlib.sha256).digest()

COOKIE_KEY, LINK_KEY = derive(b"session-cookie"), derive(b"share-link")

def tag(key, msg):
    return hmac.new(key, msg.encode(), hashlib.sha256).hexdigest()

def make_cookie(user):
    return f"user={user}.{tag(COOKIE_KEY, 'user=' + user)}"

def check_cookie(cookie):
    body, _, t = cookie.rpartition(".")
    return body[5:] if hmac.compare_digest(t, tag(COOKIE_KEY, body)) else None

def share_link(filename):
    return f"/files/{filename}?sig={tag(LINK_KEY, filename)}"

sig = share_link("user=admin").split("sig=")[1]
print("forged cookie accepted:", check_cookie("user=admin." + sig))
print("real cookie accepted:  ", check_cookie(make_cookie("alice")))
```

It prints:

```
forged cookie accepted: None
real cookie accepted:   alice
```

Prefixing each message with its type (`cookie|`, `link|`) would also have
stopped this attack, and is good practice. But key separation is the
structural fix: it protects features that do not exist yet, written by people
who never read the cookie code.

**In the real world.** The big frameworks learned this and built it in.
Django's `salted_hmac` derives a fresh key from the project's `SECRET_KEY` and
a per-use "salt" string before every HMAC, and its signing module uses a
different salt for each use. Rails derives each key from `secret_key_base`
through `ActiveSupport::KeyGenerator` with a distinct salt per purpose
("signed cookie", "authenticated encrypted cookie" and others). TLS 1.3
derives every key of a connection from its handshake secrets with labels such
as `c hs traffic`, `s ap traffic`, `key` and `iv` (RFC 8446 §7.1), so no key is
ever used in two directions or two stages. Google's Tink goes further and binds
the purpose to the key object itself: a key is created for one primitive (AEAD,
MAC, signature) and the library will not use it for another.

**What to do.**

- Never use a configured secret directly. Derive one key per purpose with
  HKDF and a versioned, length-prefixed label.
- Give a certificate's key to one service. A second service gets its own key
  and its own certificate, even for the same name.
- Write each key's purpose into its record (§10.3) and have the code check
  it: a key loaded for `mac` should refuse to `encrypt`.

## 10.7 Storage and distribution

*Level: intermediate.*

**Storage.** A key at rest is in one of three places, from best to worst.

- **Inside hardware** that will use it but not reveal it: an HSM, a TPM, a
  secure enclave, a smart card, or a cloud KMS that is an HSM behind an API.
  The software holds a handle; the key never enters its memory. This is the
  only place for a root key, and the subject of
  [Chapter 11](11-Hardware-for-Keys.md).
- **Wrapped** under a key that is in hardware: a DEK beside its record, a
  KEK in a database column, a private key file encrypted under a KMS key.
  Copying the blob is harmless; using it needs a call that can be checked and
  logged.
- **In the clear**, in a file, an environment variable, a configuration
  repository or source code. Sometimes unavoidable (something must hold the
  credential that talks to the KMS), but then it should be a short-lived
  credential, not a long-lived key. [Chapter 12](12-Secrets-in-Operations.md)
  catalogs how such secrets leak: repositories, CI logs, crash dumps.

In memory, a key in use is plaintext no matter where it is stored, and
[Chapter 8](08-Hostile-Input.md) covers what can and cannot be done about
that (wiping, `mlock`, core dumps; and what Python cannot do).

**Distribution.** A key that must be shared has to get from where it was made
to where it is used, and there are three ways.

1. **Agree it.** Both sides run a key exchange (Diffie-Hellman, a KEM) and
   derive the key; it never travels. Book 1
   [§16.8](../../book/16-PKI-and-Key-Establishment.md#168-establishing-keys-in-practice)
   covers key transport, authenticated Diffie-Hellman and KEMs. This is the
   right answer whenever both ends are online.
2. **Transport it, wrapped.** The key travels encrypted under a KEK the
   receiver already holds, or under the receiver's public key. Key import into
   a cloud KMS works this way: the KMS publishes a one-time RSA public key,
   the customer wraps an AES key under it with RSA-OAEP, wraps the real key
   under the AES key with KWP, and uploads both.
3. **Carry it by hand, in pieces.** When there is no prior key at all, as
   when a bank loads the first key into a new ATM or a payment HSM, the key
   is split into **components** that are carried separately by different
   people and combined only inside the device. §10.10 builds this with check
   values.

Payment systems added one more idea that general software should copy: a
wrapped key should carry its purpose with it. A bare KW blob says nothing
about what the key inside is for, so a receiver might unwrap a PIN-encryption
key and use it as a MAC key, recreating the problems of §10.6. ANSI's **TR-31
key block** (now standardized as ANSI X9.143) puts a header in front of the
wrapped key that states its usage, algorithm, mode of use and exportability,
and binds the header to the key with a MAC, so it cannot be edited in transit.
The receiving HSM enforces the header. JSON Web Keys do a weaker version of the
same thing with the `use` and `key_ops` fields, which libraries may or may not
enforce.

**What to do.**

- Roots in hardware; everything else wrapped; the plaintext minimum, and
  short-lived.
- Agree keys when both sides are online; transport wrapped keys only when
  they must be moved; split them when there is nothing to wrap them with.
- Ship each wrapped key with an authenticated statement of its purpose, and
  check it on arrival.

## 10.8 Rotation

*Level: intermediate.*

**Rotation** means replacing a key with a new one at the end of its
cryptoperiod, or sooner. It sounds like one action and is really three: make a
new key the one that protects new data, keep the old key able to read what it
already protected, and eventually retire the old key, which may require
re-protecting its data under the new one. Systems that think of rotation as the
first action alone break in a predictable way.

### Break it: rotating by replacement

An application signs login tokens with one key from its configuration. The
security team asks for the key to be rotated, and an operator replaces it.

```python
import hashlib, hmac, secrets

config = {"TOKEN_KEY": secrets.token_bytes(32)}      # one key, no version

def issue(user):
    t = hmac.new(config["TOKEN_KEY"], user.encode(), hashlib.sha256).hexdigest()
    return f"{user}:{t}"

def valid(token):
    user, _, t = token.partition(":")
    good = hmac.new(config["TOKEN_KEY"], user.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(t, good)

live = [issue(f"user{i}") for i in range(1000)]      # a thousand signed-in users
config["TOKEN_KEY"] = secrets.token_bytes(32)        # "rotate": replace the key in place
print("tokens still valid:", sum(valid(t) for t in live), "of", len(live))
```

It prints:

```
tokens still valid: 0 of 1000
```

Every user is logged out at once. For tokens that is an annoyance; for data
encrypted under the old key it is a loss, and the team that sees it happen
once learns the wrong lesson, which is not to rotate. The usual patch, keeping
a list of keys and trying each in turn, is slow, makes failures ambiguous, and
with a non-committing AEAD such as AES-GCM can even be exploited, since one
ciphertext can be crafted to decrypt validly under several keys (§10.12).

### Versioned key IDs

The fix is to give every key a **version** and every ciphertext, MAC or
signature the **ID** of the version that made it. A **keyring** then holds
several versions of one logical key: exactly one *primary*, used for all new
protection, and any number of older ones that may only process. The reader
looks up the version named in the data and never guesses.

This is how the mature systems work. Google's Tink stores a **keyset** of
keys with 32-bit IDs, and by default prefixes each ciphertext with five bytes,
`01` followed by the key ID, so decryption goes straight to the right key. A
JSON Web Signature names its key in the `kid` header, and a JSON Web Key Set
publishes several verification keys at once so that old tokens still verify
while new ones use the new key. AWS KMS puts the identity of the key and its
version (its "backing key") into every ciphertext blob it returns, so that
`Decrypt` needs no key argument at all.

### Fix it: a keyring that rotates

The keyring below keeps versioned keys with states (`active`,
`decrypt-only`, `destroyed`), writes the key ID in front of every ciphertext,
and binds each ciphertext to its row with associated data. Its cipher is a
**stand-in AEAD**, HMAC-SHA256 in counter mode with an HMAC tag, because the
standard library has none; in real code use AES-GCM or ChaCha20-Poly1305 from
a library. The two sub-keys of each version are themselves derived by purpose,
as §10.6 asks.

```python
import hashlib, hmac, secrets

def sub(key, purpose):                         # one HKDF-Expand block per purpose
    return hmac.new(key, purpose + b"\x01", hashlib.sha256).digest()

def stream(key, nonce, n):
    return b"".join(hmac.new(sub(key, b"enc"), nonce + i.to_bytes(4, "big"),
                             hashlib.sha256).digest() for i in range(n // 32 + 1))

def seal(key, kid, plaintext, aad):            # stand-in AEAD: use AES-GCM in real code
    nonce, head = secrets.token_bytes(16), bytes([len(kid)]) + kid
    ct = bytes(p ^ s for p, s in zip(plaintext, stream(key, nonce, len(plaintext))))
    t = hmac.new(sub(key, b"mac"), head + nonce + ct + aad, hashlib.sha256).digest()
    return head + nonce + ct + t

def open_(key, blob, aad):
    h = 1 + blob[0]
    head, nonce, ct, t = blob[:h], blob[h:h + 16], blob[h + 16:-32], blob[-32:]
    good = hmac.new(sub(key, b"mac"), head + nonce + ct + aad, hashlib.sha256).digest()
    if not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    return bytes(c ^ s for c, s in zip(ct, stream(key, nonce, len(ct))))

class Keyring:
    def __init__(self, name):
        self.name, self.keys, self.state, self.primary = name, {}, {}, None
        self.rotate()
    def rotate(self):                          # new version becomes primary; old ones stay
        if self.primary:
            self.state[self.primary] = "decrypt-only"
        kid = f"{self.name}/v{len(self.keys) + 1}".encode()
        self.keys[kid], self.state[kid], self.primary = secrets.token_bytes(32), "active", kid
    def kid_of(self, blob):
        return blob[1:1 + blob[0]]
    def encrypt(self, plaintext, aad):
        return seal(self.keys[self.primary], self.primary, plaintext, aad)
    def decrypt(self, blob, aad):
        kid = self.kid_of(blob)
        if self.state.get(kid) not in ("active", "decrypt-only"):
            raise KeyError(f"no usable key {kid.decode()}")
        return open_(self.keys[kid], blob, aad)
    def destroy(self, kid):
        self.keys[kid], self.state[kid] = None, "destroyed"

ring = Keyring("records")
db = {f"row{i}".encode(): ring.encrypt(b"patient note %d" % i, f"row{i}".encode())
      for i in range(4)}
ring.rotate()                                  # v2 is primary; v1 still decrypts
db[b"row4"] = ring.encrypt(b"patient note 4", b"row4")
print("after rotation:", {r.decode(): ring.kid_of(b).decode() for r, b in db.items()})
print("old row reads: ", ring.decrypt(db[b"row0"], b"row0"))

db[b"row1"] = ring.encrypt(ring.decrypt(db[b"row1"], b"row1"), b"row1")   # lazy: on write
old = [r for r, b in db.items() if ring.kid_of(b) != ring.primary]
print("still on v1:   ", [r.decode() for r in old])
for r in old:                                  # eager: a background job does the rest
    db[r] = ring.encrypt(ring.decrypt(db[r], r), r)
if all(ring.kid_of(b) == ring.primary for b in db.values()):
    ring.destroy(b"records/v1")                # only now is v1 safe to destroy
print("states:        ", {k.decode(): s for k, s in ring.state.items()})
print("row3 reads:    ", ring.decrypt(db[b"row3"], b"row3"))
try:
    ring.decrypt(db[b"row3"], b"row2")         # a ciphertext moved to another row
except ValueError as e:
    print("moved row:     ", e)
```

It prints:

```
after rotation: {'row0': 'records/v1', 'row1': 'records/v1', 'row2': 'records/v1', 'row3': 'records/v1', 'row4': 'records/v2'}
old row reads:  b'patient note 0'
still on v1:    ['row0', 'row2', 'row3']
states:         {'records/v1': 'destroyed', 'records/v2': 'active'}
row3 reads:     b'patient note 3'
moved row:      cannot open
```

Rotation did not break a single read. Row 1 moved to the new key when it was
next written; the background job moved the rest; and the old version was
destroyed only after a check that no row still named it. The last line shows
the associated data at work: a ciphertext copied from row 3 into row 2 is
refused, because the row ID is part of what the tag covers. Figure 10.4 shows
the same life on a calendar.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Three versions of one key over three years: each is active for a year, then decrypt-only while old data is re-encrypted, then destroyed; the next version is created before it becomes primary" fill="currentColor" font-size="13">
<line x1="90" y1="170" x2="620" y2="170" stroke="currentColor" stroke-width="1.2"/>
<text x="110" y="190" text-anchor="middle" font-size="12">2026</text>
<text x="280" y="190" text-anchor="middle" font-size="12">2027</text>
<text x="450" y="190" text-anchor="middle" font-size="12">2028</text>
<text x="600" y="190" text-anchor="middle" font-size="12">2029</text>
<line x1="110" y1="165" x2="110" y2="175" stroke="currentColor"/>
<line x1="280" y1="165" x2="280" y2="175" stroke="currentColor"/>
<line x1="450" y1="165" x2="450" y2="175" stroke="currentColor"/>
<line x1="600" y1="165" x2="600" y2="175" stroke="currentColor"/>
<text x="20" y="44">v1</text>
<rect x="110" y="30" width="170" height="20" fill="currentColor" opacity="0.55"/>
<rect x="280" y="30" width="80" height="20" fill="currentColor" opacity="0.2"/>
<rect x="280" y="30" width="80" height="20" fill="none" stroke="currentColor"/>
<text x="366" y="45" font-size="12">destroyed</text>
<text x="20" y="94">v2</text>
<rect x="255" y="80" width="25" height="20" fill="none" stroke="currentColor" stroke-dasharray="3 2"/>
<rect x="280" y="80" width="170" height="20" fill="currentColor" opacity="0.55"/>
<rect x="450" y="80" width="80" height="20" fill="currentColor" opacity="0.2"/>
<rect x="450" y="80" width="80" height="20" fill="none" stroke="currentColor"/>
<text x="536" y="95" font-size="12">destroyed</text>
<text x="20" y="144">v3</text>
<rect x="425" y="130" width="25" height="20" fill="none" stroke="currentColor" stroke-dasharray="3 2"/>
<rect x="450" y="130" width="150" height="20" fill="currentColor" opacity="0.55"/>
<rect x="110" y="0" width="14" height="12" fill="currentColor" opacity="0.55"/>
<text x="130" y="11" font-size="12">primary (encrypts and decrypts)</text>
<rect x="340" y="0" width="14" height="12" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<text x="360" y="11" font-size="12">decrypt-only, re-encryption running</text>
<text x="300" y="120" font-size="12" text-anchor="middle">pre-activation: created and distributed early</text>
</svg>
<figcaption>Figure 10.4. Three versions of one logical key. Each is created and distributed before it becomes primary (dashed), is primary for its originator-usage period, then serves only to decrypt while its data is moved, and is destroyed when nothing names it any more.</figcaption>
</figure>

### Re-encrypt, or migrate lazily?

Once a new version is primary, the data under the old one can be moved in two
ways.

**Lazy rotation** re-protects data only when it is next written, as row 1
was. It costs nothing extra, but data that is never rewritten stays under the
old key forever, so the old key can never be destroyed. AWS KMS's automatic
rotation is of this kind: it creates new key material every year by default
(any period from 90 to 2,560 days since April 2024), uses it for new
encryptions, and keeps every older version available for decryption for as
long as the KMS key exists. That limits how much *new* data each version
protects, which is the volume argument for rotation. It does nothing about a
key that has already leaked.

**Eager rotation** (re-encryption) moves all data to the new key with a
background job, after which the old key is destroyed. It is the only kind
that helps after a compromise, the only kind that lets crypto-shredding reach
old versions, and the only kind that completes an algorithm migration. It is
expensive in proportion to the data, which is where the hierarchy of §10.4
pays for itself: rotating a KEK eagerly means re-wrapping a few dozen bytes
per DEK, while the gigabytes encrypted under the DEKs are untouched. Rotate
KEKs eagerly and DEKs rarely; if a DEK itself must change, that record is
re-encrypted.

The job has to be built like any other migration: resumable, idempotent,
throttled, and finished by a check, as in the code above, that no ciphertext
anywhere still names the old version, including in backups, caches and
replicas. A rotation that stops at 99% leaves the old key alive.

### In the real world

Rotation fails less often in the cryptography than in the habit. Microsoft's
Storm-0558 incident is the cautionary case: in 2023 attackers forged
authentication tokens with a Microsoft consumer signing key that had been
created in 2016, and the US Cyber Safety Review Board's report of March 2024
found that it should have been retired years earlier and was still trusted,
by systems that also accepted it for purposes it was never meant for.
[Chapter 12](12-Secrets-in-Operations.md) tells it fully. At the other
extreme, rotating a key that millions of systems trust is slow even when done
well, as the DNS root showed.

!!! note "Life story: the first DNS root key rollover"
    **Born:** the root zone's key-signing key KSK-2010, in service from July
    2010, was to be replaced by KSK-2017 on 11 October 2017 · **Purpose:**
    the first rotation of the key at the top of DNSSEC, following RFC 5011's
    automated trust-anchor updates · **Helped:** ICANN postponed the roll in
    September 2017, when new trust-anchor telemetry (RFC 8145) showed that a
    worrying share of resolvers still trusted only the old key; after a year
    of outreach the roll went ahead on 11 October 2018 with little
    disruption, and KSK-2010 was revoked in January 2019 · **Status:**
    the second rollover, to KSK-2024, completed in 2026; see Protocols
    [§10.7](../protocols/10-DNSSEC-and-Private-DNS.md#107-the-root-key) for the
    key and Advanced [§2.9](../advanced/02-Secret-Sharing.md#29-the-dns-root-keys-recovery-shares)
    for its recovery shares

**What to do.**

- Put a key ID in every ciphertext, MAC and signature, and look keys up by ID.
  Never try keys in turn.
- Keep old versions decrypt-only, create new versions before they become
  primary, and rotate on a schedule so that the path is exercised.
- Rotate KEKs eagerly. Destroy an old version only after a check that nothing
  names it.

## 10.9 Revocation and compromise

*Level: intermediate.*

A key is **compromised** when anyone who should not have it might. SP 800-57
treats "might" as enough: a lost laptop with an encrypted key file, an HSM
backup tape missing from its box, an engineer who printed a key during
debugging, a library bug like Heartbleed that could have read process memory
([Chapter 8](08-Hostile-Input.md)). Waiting for proof that a key was used is
waiting until after the damage.

**Revocation** is telling every party that relies on a key to stop. For a
public key with a certificate, that machinery belongs to the PKI: revocation
lists, OCSP, and today mostly short lifetimes, since revocation checking on
the web mostly failed (Protocols
[§2.7](../protocols/02-Certificates-and-PKI.md#27-revocation-and-why-it-mostly-failed)).
For a symmetric key there is no certificate to revoke. Revocation is a change
in the keyring: the version's state becomes `compromised`, every service that
caches keys must drop it, and the data it protected must be re-encrypted under
a new version and the old version destroyed (eager rotation, §10.8), because
the attacker holds the key whether or not you still use it.

What revocation cannot do is as important as what it can.

- **It cannot recall data.** Anything the attacker already copied, encrypted
  under the compromised key, stays readable to them forever. Re-encryption
  protects copies made *after* the compromise is detected.
- **It cannot reach parties who do not check.** Revocation is a message, and
  an offline verifier, or one that ignores revocation, keeps trusting.
- **It cannot sort old signatures from forged ones,** unless a trusted time
  says when each was made. A trusted timestamp (RFC 3161) on a signature, or
  its entry in a transparency log, lets a verifier keep accepting signatures
  made before the compromise and reject ones made after.
- **It cannot help when the root leaks.** If the key that signs revocations,
  or the master from which all keys derive, is the one compromised, the system
  has no way to say so from inside.

!!! note "Life story: the HDCP master key"
    **Born:** High-bandwidth Digital Content Protection, Intel's scheme for
    encrypting video on HDMI and DVI links (version 1.0, 2000); each device
    holds a set of 40 secret keys derived from a single master matrix ·
    **Purpose:** stop copying of digital video between player and screen,
    with a revocation list carried on new content to cut off any device whose
    keys leaked · **Helped:** a lesson in revocation's limit. Scott Crosby,
    Ian Goldberg, Robert Johnson, Dawn Song and David Wagner showed in 2001
    that the keys of about 40 devices would reveal the master; in September
    2010 the master key itself was published online and Intel confirmed it,
    after which anyone could make valid keys for devices that had never
    existed, and no revocation list could name them all · **Retired:** HDCP
    1.x · **Replaced by:** HDCP 2.x, a new design with public-key device
    certificates

SP 800-57 asks for a **compromise-recovery plan** to be written before it is
needed. A useful one answers, for each key in the inventory: who decides that
it is compromised; who must be told, and how; what replaces it, and where the
replacement comes from (pre-activated next versions help); what data or
signatures it protected and how they will be re-protected; and how the old key
will be destroyed, everywhere. Chapter 18
turns this into an incident playbook.

**What to do.**

- Treat "might have been exposed" as compromised.
- For every key type, know how it is revoked and how long revocation takes to
  reach every party.
- Timestamp signatures that must outlive their key, and keep the next
  version of important keys pre-activated.

## 10.10 Destruction, backups and escrow

*Level: intermediate.*

**Destruction** is the last stage and the hardest to prove. Destroying a key
means destroying every copy: in the HSM (which **zeroizes** it, overwriting
the storage, a function FIPS 140-3 modules must provide), in process memory,
in swap and core dumps, in caches, in replicas, and in backups. The key's
record in the inventory says where the copies are; if it does not, destruction
is a hope. For storage media, SP 800-88, NIST's guide to media sanitization,
describes **cryptographic erase**: if everything on a drive was encrypted under one key, destroying that
key sanitizes the drive in a second. The same idea applied to records,
destroying one customer's DEK or KEK to make their data unreadable everywhere
at once, is **crypto-shredding**, and
Chapter 14 builds it with its limits.

**Backups** pull the other way. A key that encrypts data with no other copy
must itself be backed up, or a failed HSM destroys the data along with the
key. So production key systems back keys up, and every backup is a copy that
destruction must later reach and that an attacker may reach first. The
balance that works:

- **Session and ephemeral keys:** never back up. Losing one costs a
  reconnection.
- **Signing keys:** usually do not back up. If one is lost, make a new key
  and publish the new public key. A lost key is an inconvenience; a stolen
  backup is a compromise.
- **Keys that protect stored data:** back up, but only wrapped, under a
  separate backup KEK held in hardware, and record each backup in the
  inventory, so that destroying the backup KEK destroys every backup copy at
  once.

### Split knowledge and dual control

The root of a hierarchy, and its backups, should not be in the power of any
one person. SP 800-57 names two controls. **Split knowledge** means no one
person ever knows the whole key: it exists only as pieces held by different
people. **Dual control** means no one person can perform a sensitive operation
alone, such as loading, exporting or using the root.

The oldest and simplest split is by XOR: $n$ random components
$C_1, \ldots, C_n$ with $K = C_1 \oplus \cdots \oplus C_n$. Any $n - 1$
components reveal nothing about $K$, since the missing one could be anything.
Banks have loaded keys into HSMs this way for decades, each custodian typing
a component in turn, with a **key check value** (KCV) recorded for each
component and for the whole key so that a mistyped digit is caught before the
wrong key goes into service. A KCV in banking is the first three bytes of the
key encrypting a block of zeros; the block below uses HMAC instead, as a
labeled stand-in.

```python
import hashlib, hmac

def kcv(key):        # a check value: 6 hex digits that identify a key without revealing it
    return hmac.new(key, bytes(16), hashlib.sha256).hexdigest()[:6].upper()

# Three custodians each make a component and write it down. They are fixed here so
# the output repeats; real ones come from secrets.token_bytes(16) at the ceremony.
components = [hashlib.sha256(b"custodian %d" % i).digest()[:16] for i in (1, 2, 3)]
key = bytes(a ^ b ^ c for a, b, c in zip(*components))
record = {"components": [kcv(c) for c in components], "key": kcv(key)}

# Months later, at a new site, each custodian types their component back in.
typed = list(components)
typed[1] = bytes([typed[1][0] ^ 0x10]) + typed[1][1:]   # one mistyped hex digit
for i, c in enumerate(typed, 1):
    print(f"component {i}: KCV {kcv(c)}, recorded {record['components'][i - 1]}")
loaded = bytes(a ^ b ^ c for a, b, c in zip(*typed))
print(f"assembled key: KCV {kcv(loaded)}, recorded {record['key']}")
```

It prints:

```
component 1: KCV 9CFEBB, recorded 9CFEBB
component 2: KCV 8EEC16, recorded 593D15
component 3: KCV 473A00, recorded 473A00
assembled key: KCV 23EC86, recorded CB7CBF
```

Custodian 2's error is caught at once and attributed to the right person. The
check values are safe to write down: 24 bits are no help to someone guessing a
128-bit key.

XOR splitting has one weakness: all $n$ custodians are needed, so one lost
envelope or one custodian who has left loses the key. **Threshold** sharing
fixes that: Shamir's scheme lets any $k$ of $n$ shares rebuild the key while
$k - 1$ reveal nothing. The mathematics is in Mathematics
[§11.3](../mathematics/11-Polynomials-at-Work.md#113-shamir-secret-sharing),
and the engineering (verifiable shares, refreshing them, and the DNS root
key's 5-of-7 recovery shares) is in Advanced protocols and privacy, starting
from its [index](../advanced/index.md) and
[Chapter 2](../advanced/02-Secret-Sharing.md). The design choice to take from
there is the one the DNS root makes: share a small key-encryption key that
protects backups, not the working key itself.

### Escrow

A backup is a copy the owner keeps for the owner. **Key escrow** is a copy
kept by a third party, so that someone other than the owner can decrypt: an
employer reading a departed employee's files, a court-ordered wiretap. The
first is common and reasonable inside an organization, where the "third
party" is the organization's own recovery key, under its own controls. The
second was tried at national scale once, and the engineering record is short
and bad.

On 16 April 1993 the Clinton administration announced the **Clipper chip**,
a tamper-resistant chip for encrypting telephone calls with Skipjack, an
NSA-designed cipher with an 80-bit key that stayed classified. Each chip had a
unique **unit key**, split by XOR into two halves held by two escrow agents,
NIST and a division of the Treasury Department. With every call the chip sent
a **Law Enforcement Access Field** (LEAF) of 128 bits: the call's session key
encrypted under the unit key, the chip's 32-bit serial number, and a 16-bit
checksum, all encrypted under a **family key** shared by every chip. An agency
with a warrant could read the serial number with the family key, collect the
two halves of that chip's unit key from the agents, and decrypt the session
key. A receiving chip would refuse a call whose LEAF checksum was wrong, so
the LEAF could not simply be left out. The standard was published as FIPS 185,
the Escrowed Encryption Standard, in February 1994.

In June 1994 Matt Blaze of AT&T Bell Laboratories, with prototype hardware
supplied for testing, showed that the checksum was the whole defense, and
that 16 bits was not enough. A program could feed the chip random 128-bit
values until one passed, about $2^{16}$ tries; Blaze reported an expected
time of about 42 minutes on the prototype card, longer than anyone would wait
on a phone call but trivial for stored data. The result was a LEAF that the
receiving chip accepted and that carried no usable session key. Escrow was
therefore optional for anyone who meant to avoid it, and mandatory only for
everyone else.

!!! note "Life story: the Clipper chip and the LEAF"
    **Born:** announced 16 April 1993; standardized as FIPS 185, the
    Escrowed Encryption Standard, February 1994; built by Mykotronx around
    the classified Skipjack cipher · **Purpose:** strong encryption for
    telephones with a key recoverable by US law enforcement under warrant,
    through two escrow agents · **Helped:** to show, through Matt Blaze's
    "Protocol Failure in the Escrowed Encryption Standard" (found June 1994,
    published at ACM CCS 1994), that an escrow field the endpoints cannot
    fully check can be forged; to frame every later escrow debate, including
    "The Risks of Key Recovery, Key Escrow, and Trusted Third-Party
    Encryption" (Abelson and others, 1997) and "Keys Under Doormats" (2015)
    · **Retired:** abandoned in practice by 1996, with few products sold;
    Skipjack was declassified in June 1998 · **Replaced by:** nothing; the
    policy argument continues, told in History
    [Chapter 17](../history/index.md)

The engineering lessons outlast the politics. An escrowed key is a second
copy, and the escrow agent's database is the RSA seed file of §10.1 with a
larger target painted on it: one database that opens everything. An escrow
field is protection only if the receiver can verify it completely, which
Clipper's chip could do only through 16 bits. And escrow at scale needs every
key's life to include the agent, which turns every generation, rotation and
destruction into a transaction with a third party that must itself be
secured for as long as any data under those keys exists.

**What to do.**

- Know every copy of every key, so that destruction can reach them all.
- Back up only keys that protect stored data, and only wrapped under a backup
  KEK that is itself split among custodians.
- Use dual control for roots, with check values for every component; prefer a
  threshold scheme where a lost share must not lose the key.
- Inside an organization, recovery keys are fine if they are treated as the
  most sensitive keys in the inventory. Treat any proposal for an outside
  escrow copy as a new, high-value root.

## 10.11 Mars: a keyring for the conjunction

*Level: intermediate.*

Every 26 months or so, Mars passes behind the Sun as seen from Earth. For
about two weeks around this **solar conjunction**, the Sun's plasma corrupts
radio signals between the planets, and mission controllers stop sending
commands: NASA's moratorium in 2023 ran from 11 to 25 November, and the most
recent conjunction fell around the start of January 2026. The rovers carry two
weeks of instructions loaded in advance and wait. A city cannot wait. Arcadia
City, the settlement that runs through this shelf, keeps encrypting its
records, opening its doors and signing its messages through the conjunction,
and its keys must live through it with no help from Earth.

The certificate side of the city's design is in Protocols
[§2.9](../protocols/02-Certificates-and-PKI.md#29-a-city-authority-on-mars),
and the city master key held by six district wardens, any four of whom can
rebuild it, is in Advanced
[§2.10](../advanced/02-Secret-Sharing.md#210-mars-six-wardens-any-four). This
section is the keyring in between: the KEKs and data keys of §10.4 and the
rotations of §10.8, planned for a fortnight alone.

**Everything a key's life needs must be on Mars.** Go through the stages and
ask, for each, whether it needs Earth.

- *Generation* happens in the city's own HSMs, from their own entropy sources
  (the rover's problem in [§4.9](04-Randomness-in-Practice.md#49-mars-a-rovers-first-boot)
  is solved once, at installation).
- *The root* is the wardens' master key, rebuilt only in the council hall; a
  quorum of wardens must be on Mars and reachable during the window, so no
  more than two of the six may be travelling.
- *Backups* sit in two vaults in different districts, wrapped under a backup
  KEK whose components are held by custodians who live there. An Earth copy
  may exist as a last resort, but no procedure depends on it.
- *Revocation* of city keys is decided and signed in the city. Its
  revocation lists must be valid well past the end of the window, because a
  list that expires during conjunction cannot be refreshed by anyone who is
  not already on Mars.
- *Time*, on which every expiry check depends, comes from the city's own
  clocks.

**Keys shared with Earth are the hard part.** Two kinds of key cross the gap:
the KEK under which the city's archive is replicated to Earth, and the session
keys of the link itself. Neither can be rotated jointly during the window. The
plan is to rotate both *before* it, with the next version already agreed and
in pre-activation on both sides, so that the first contact after the
conjunction uses a key both sides hold. A tempting alternative is to let each
side derive the next epoch's key on its own,
$K_{e+1} = \mathrm{HKDF}(K_e, \text{epoch} \,\Vert\, e{+}1)$. It works without any contact, but it gives
up recovery from compromise: whoever has stolen $K_e$ can compute every later
key too. If the city uses it, the first exchange after the link returns must
be a fresh key agreement, not another derivation.

**Revocation cut off.** If a city key is compromised during the window, the
city revokes it at once: it is the authority for its own keys. If the key is
one shared with Earth, the city stops using it, re-encrypts locally what it
can, and queues a signed notice. Earth learns of it only when the link
returns, so the reconnection protocol must exchange revocation news *before*
anything else is accepted in either direction. The reverse case is symmetric:
an Earth key compromised during the window is still trusted on Mars until that
first exchange, which is a reason to accept nothing signed by Earth keys in the
first minutes of contact until both sides have compared revocation state.

### Code it: the conjunction check

The city's key office runs a check like this one each month in the run-up to
conjunction. It takes the window (the quiet fortnight plus a guard band on
each side), every key's rotation schedule and who must take part in a
rotation, the revocation list's expiry and the number of wardens on Mars, and
says what must be done before the link goes quiet.

```python
from datetime import date, timedelta as days

conj = date(2026, 1, 9) + days(780)            # about one synodic period after January 2026
quiet = (conj - days(7), conj + days(7))       # about two weeks with no commands
guard = days(10)                               # margin on both sides for a late or early link
window = (quiet[0] - guard, quiet[1] + guard)

# name, rotation period in days, last rotated, who must take part in a rotation
keys = [
    ("records KEK",          365, date(2027, 3, 2),  "mars"),
    ("door-badge KEK",        90, date(2027, 12, 20), "mars"),
    ("telemetry MAC key",     30, date(2028, 1, 25),  "mars"),
    ("Earth archive KEK",    365, date(2027, 2, 15),  "earth"),
    ("Earth link session",     7, date(2028, 2, 1),   "earth"),
]
crl_next_update = date(2028, 3, 10)            # when the city's revocation list expires
custodians_on_mars, quorum = 5, 4

print(f"conjunction {conj}, plan for {window[0]} to {window[1]}")
for name, period, last, who in keys:
    due = last + days(period)
    if who == "earth" and due <= window[1]:
        note = f"rotate before {window[0]}; agree the next version with Earth"
    elif window[0] <= due <= window[1]:
        note = "falls in the window; all local, so it rotates as usual"
    else:
        note = "ok"
    print(f"  {name:19} due {due}: {note}")
if crl_next_update <= window[1]:
    print(f"  revocation list expires {crl_next_update}: re-sign on Mars, valid past {window[1]}")
print("  custodian quorum on Mars:", "ok" if custodians_on_mars >= quorum else "NOT MET")
```

It prints:

```
conjunction 2028-02-28, plan for 2028-02-11 to 2028-03-16
  records KEK         due 2028-03-01: falls in the window; all local, so it rotates as usual
  door-badge KEK      due 2028-03-19: ok
  telemetry MAC key   due 2028-02-24: falls in the window; all local, so it rotates as usual
  Earth archive KEK   due 2028-02-15: rotate before 2028-02-11; agree the next version with Earth
  Earth link session  due 2028-02-08: rotate before 2028-02-11; agree the next version with Earth
  revocation list expires 2028-03-10: re-sign on Mars, valid past 2028-03-16
  custodian quorum on Mars: ok
```

The date of the conjunction is estimated in the code as one synodic period,
about 780 days, after January 2026; the office would take the real date from
an ephemeris. The two local keys due inside the window rotate as usual,
because nothing about their rotation needs Earth. The two Earth keys must be
rotated early, with the next versions agreed while the link is up, and the
revocation list must be re-signed so that it outlives the window. Some cities
would add a change freeze, so that no scheduled rotation at all happens while
nobody on Earth can help diagnose a fault; that is an operational choice the
same check can enforce.

**What to do (on any isolated system, not only on Mars).**

- List every stage of every key's life that depends on an outside party, and
  move it local or schedule it outside the isolation window.
- Pre-activate next versions of shared keys before contact is lost.
- Make revocation lists and certificates outlive the window, and exchange
  revocation state first when contact returns.

## 10.12 Going deeper

*Level: expert.*

**Key separation, formally.** Stuart Haber and Benny Pinkas (ACM CCS 2001)
defined the joint security of an encryption scheme and a signature scheme
sharing one key pair, and Kenneth Paterson, Jacob Schuldt, Martijn Stam and
Susan Thomson (ASIACRYPT 2011) revisited it; the EMV analysis of §10.6 is an
application. The answer they give is that sharing can be made safe for
specific, carefully designed pairs, which is useful to know and rarely worth
relying on.

**Security APIs as protocols.** After Clulow, Stéphanie Delaune, Steve Kremer
and Graham Steel modeled PKCS#11 for automatic analysis (IEEE CSF 2008), and
Tookan (Bortolozzo, Centenaro, Focardi and Steel, ACM CCS 2010) reverse
engineered real tokens' policies into models and searched them for key
extractions. The lesson for designers is that a key-management API is a
protocol whose attacker is its own caller.

**Is KW secure?** Rogaway and Shrimpton (EUROCRYPT 2006) defined
deterministic authenticated encryption and proposed SIV with a proof; for KW
they noted the absence of one. Later analyses have given bounds for KW-like
constructions, and no attack is known, but SIV-style modes remain the choice
where a proof is required.

**Rotation without decryption.** Re-encryption makes the server see the
plaintext. **Updatable encryption** lets a key holder hand the server a short
token that moves a ciphertext from the old key to the new one without
revealing either: Dan Boneh, Kevin Lewi, Hart Montgomery and Ananth
Raghunathan built it from key-homomorphic PRFs (CRYPTO 2013); Adam
Everspaugh, Kenneth Paterson, Thomas Ristenpart and Sam Scott studied what
real systems do and what they should (CRYPTO 2017), and Anja Lehmann and Björn
Tackmann gave stronger definitions (EUROCRYPT 2018).

**Why "try every key" is dangerous.** AES-GCM and ChaCha20-Poly1305 are not
*key-committing*: one ciphertext can be built to decrypt validly under many
keys. Julia Len, Paul Grubbs and Thomas Ristenpart (USENIX Security 2021)
turned this into **partitioning oracle** attacks that learn which of many
candidate keys or passwords a server holds, a few guesses per query. Versioned
key IDs avoid the search; key-committing AEAD constructions remove the
ambiguity.

## Check yourself

??? question "1. What is the difference between a key's originator-usage period and its recipient-usage period? Give an example where they differ."

    The originator-usage period is the time the key may protect new data
    (encrypt, sign, wrap, MAC); the recipient-usage period is the time it may
    still process protected data (decrypt, verify, unwrap). A key that
    encrypts nightly backups for one year, kept for four years, has an OUP of
    one year and a RUP of about five: it must decrypt the last backup it made
    until that backup expires.

??? question "2. A team says its AES-256 key never needs rotating because AES-256 cannot be brute-forced. What are they missing?"

    Rotation is not about brute force. It limits how long the key has been
    exposed to copying, how much data it protects (and so what a compromise
    exposes, and whether a mode's volume limits are reached), and it keeps
    the replacement path working so that it can be used on the day of a
    compromise.

??? question "3. Why does a key hierarchy make rotation cheap? Which level can be rotated eagerly at low cost?"

    The data is encrypted under DEKs, and only the DEKs are encrypted under
    a KEK. Rotating the KEK means unwrapping and re-wrapping each DEK, a few
    dozen bytes each, without touching the data. KEKs can be rotated eagerly;
    rotating a DEK means re-encrypting the data it covers.

??? question "4. Why can a key derived with HKDF from a parent key not be crypto-shredded on its own?"

    Anyone holding the parent can recompute it from the label at any time.
    Destroying the derived key's bytes destroys nothing. To be able to
    destroy a key individually, it must be random and stored only wrapped,
    so that destroying its wrapped copy (or its KEK) really removes it.

??? question "5. AES-KW is deterministic. Why is that acceptable for wrapping keys, when deterministic encryption of ordinary data is a weakness?"

    Deterministic encryption leaks when two plaintexts are equal. A wrapped
    key is uniformly random and, under one KEK, never repeats, so there is
    nothing to leak; equal outputs would mean the same key was wrapped twice.
    Determinism also removes the need for a nonce, which removes the risk of
    one repeating.

??? question "6. An HSM lets key W wrap other keys and also decrypt single AES blocks. The keys it wraps are 'sensitive'. Explain how an attacker extracts one, even though W wraps with AES-KW."

    Ask the HSM to wrap the sensitive key under W, then run KW's unwrap
    algorithm on your own machine. Unwrap consists of block decryptions under
    W combined with XORs and the step counter; send each block to the HSM's
    decrypt function. After $6n$ calls the register equals `A6A6...` and the
    $R_i$ are the key. The fix is that no key may have both wrap and decrypt.

??? question "7. Why should a derivation label include a length prefix for each field, and the output length?"

    Without length prefixes, different lists of fields can concatenate to the
    same bytes (`enc` + `rypt` and `encr` + `ypt`), giving two purposes the
    same key. Without the output length, a 16-byte key derived with a given
    label is the prefix of the 32-byte key derived with the same label, so
    two uses that ask for different lengths share key bits.

??? question "8. AWS KMS rotates a key automatically every year and keeps the old versions. A key version leaked eight months ago. Does the automatic rotation protect the data encrypted under it?"

    No. Lazy rotation stops new data from being encrypted under the old
    version but leaves existing ciphertexts under it, and the old version
    stays available to decrypt them, as it is to the attacker. After a
    compromise, the data must be re-encrypted (eagerly) under a new key and
    the old version disabled and destroyed; with envelope encryption, the
    leaked level's children must be re-wrapped or re-encrypted.

??? question "9. What was Matt Blaze's 1994 attack on the Clipper chip's LEAF, and what is the general lesson for escrow designs?"

    The LEAF's integrity rested on a 16-bit checksum that the receiving chip
    checked. Trying random 128-bit LEAFs until one passed took about $2^{16}$
    attempts, after which the chip would interoperate while sending no usable
    session key to the escrow system. The general lesson: an escrow field
    protects access only if the receiver can verify it completely; otherwise
    escrow binds only those who choose to comply.

??? question "10. During solar conjunction, an engineer proposes that the city and Earth each derive the next link key as HKDF of the current one, so rotation can continue without contact. What does that trade away, and what must happen when the link returns?"

    It trades away recovery from compromise: anyone who stole the current key
    can derive every later key in the chain. When contact returns, the two
    sides should first exchange revocation state, then run a fresh
    authenticated key agreement rather than another derivation, so that keys
    after the conjunction are independent of any key that might have leaked.

## What you learned

- A key's life has stages (generation, registration, storage, distribution,
  use, rotation, revocation, destruction) and states (pre-activation, active,
  suspended, deactivated, compromised, destroyed). Most failures, like the
  RSA SecurID seeds in 2011, happen in the stages, not in the cipher.
- A cryptoperiod has two parts: the time a key may protect new data and the
  time it may still process old data. SP 800-57 Part 1 Rev. 5 suggests up to
  two years of protecting use for most symmetric keys, much less at high
  volume.
- An inventory records every key's ID, algorithm, purpose, owner, state,
  dates, parent, copies and check value, never the key itself.
- Key hierarchies put a non-exportable root in hardware, KEKs under it and
  DEKs beside the data. They make rotation cheap, contain compromise,
  centralize access checks and make crypto-shredding possible. Derive keys
  that share a lifetime; wrap keys that need their own.
- AES-KW (RFC 3394) and KWP (RFC 5649), approved in SP 800-38F, wrap keys
  deterministically with a 64-bit integrity check; the code above matches
  RFC 3394's vector on a compact AES-128.
- One key, one purpose. Wrap-and-decrypt tokens, signing-and-decrypting
  cards, keys shared across TLS versions and across services (DROWN) have
  all failed. Derive purpose keys with HKDF and versioned, length-prefixed
  labels.
- Rotation needs versioned key IDs in every ciphertext. Lazy rotation limits
  new exposure; only eager re-encryption helps after a compromise and lets the
  old version be destroyed.
- Revocation cannot recall data, reach parties that do not check, or survive
  the loss of the root. Plan compromise recovery before it is needed.
- Destruction must reach every copy, and backups multiply copies. Split roots
  with XOR components and check values or a threshold scheme. Escrow adds a
  copy and a target, and Clipper showed that an escrow field the endpoints
  cannot fully verify can be forged.

**Next:** [Chapter 11](11-Hardware-for-Keys.md), where the root keys of this
chapter go into hardware that will use them but never give them up.

## Further reading

- Elaine Barker, NIST SP 800-57 Part 1 Rev. 5, *Recommendation for Key
  Management: Part 1 – General* (2020): key states and phases (§7), cryptoperiods
  (§5.3 and Table 1), key separation (§5.2), compromise recovery.
- Elaine Barker, Allen Roginsky and Richard Davis, NIST SP 800-133 Rev. 2,
  *Recommendation for Cryptographic Key Generation* (2020).
- Morris Dworkin, NIST SP 800-38F, *Recommendation for Block Cipher Modes of
  Operation: Methods for Key Wrapping* (2012).
- Jim Schaad and Russ Housley, RFC 3394, *Advanced Encryption Standard (AES)
  Key Wrap Algorithm* (2002); Russ Housley and Morris Dworkin, RFC 5649,
  *Advanced Encryption Standard (AES) Key Wrap with Padding Algorithm* (2009).
- NIST FIPS 197, *Advanced Encryption Standard (AES)* (2001; updated 2023),
  Appendix C.1.
- Hugo Krawczyk and Pasi Eronen, RFC 5869, *HMAC-based Extract-and-Expand Key
  Derivation Function (HKDF)* (2010); Hugo Krawczyk, "Cryptographic Extraction
  and Key Derivation: The HKDF Scheme" (CRYPTO 2010).
- Phillip Rogaway and Thomas Shrimpton, "A Provable-Security Treatment of the
  Key-Wrap Problem" (EUROCRYPT 2006); RFC 5297 (AES-SIV, 2008).
- Jolyon Clulow, "On the Security of PKCS #11" (CHES 2003); Matteo
  Bortolozzo, Matteo Centenaro, Riccardo Focardi and Graham Steel, "Attacking
  and Fixing PKCS#11 Security Tokens" (ACM CCS 2010); Stéphanie Delaune, Steve
  Kremer and Graham Steel, "Formal Analysis of PKCS#11" (IEEE CSF 2008).
- OASIS, *PKCS #11 Cryptographic Token Interface Base Specification*,
  Version 3.1 (2022).
- Jean Paul Degabriele, Anja Lehmann, Kenneth G. Paterson, Nigel P. Smart and
  Mario Strefler, "On the Joint Security of Encryption and Signature in EMV"
  (CT-RSA 2012); Stuart Haber and Benny Pinkas, "Securely Combining
  Public-Key Cryptosystems" (ACM CCS 2001); Kenneth G. Paterson, Jacob C. N.
  Schuldt, Martijn Stam and Susan Thomson, "On the Joint Security of
  Encryption and Signature, Revisited" (ASIACRYPT 2011).
- Tibor Jager, Jörg Schwenk and Juraj Somorovsky, "On the Security of TLS 1.3
  and QUIC Against Weaknesses in PKCS#1 v1.5 Encryption" (ACM CCS 2015).
- Nimrod Aviram and others, "DROWN: Breaking TLS Using SSLv2" (USENIX
  Security 2016).
- Julia Len, Paul Grubbs and Thomas Ristenpart, "Partitioning Oracle Attacks"
  (USENIX Security 2021).
- Adam Everspaugh, Kenneth Paterson, Thomas Ristenpart and Sam Scott, "Key
  Rotation for Authenticated Encryption" (CRYPTO 2017); Dan Boneh, Kevin
  Lewi, Hart Montgomery and Ananth Raghunathan, "Key Homomorphic PRFs and
  Their Applications" (CRYPTO 2013); Anja Lehmann and Björn Tackmann,
  "Updatable Encryption with Post-Compromise Security" (EUROCRYPT 2018).
- Google, Tink documentation: keysets, key IDs and output prefixes; Amazon
  Web Services, *AWS Key Management Service Developer Guide*, "Rotating AWS KMS
  keys" (rotation periods of 90 to 2,560 days since April 2024).
- Django documentation, `django.utils.crypto.salted_hmac` and cryptographic
  signing; Ruby on Rails, `ActiveSupport::KeyGenerator`; RFC 8446 §7.1 (TLS 1.3
  key schedule labels, 2018).
- ANSI X9.143-2022, *Retail Financial Services: Interoperable Secure Key Block
  Specification* (formerly ASC X9 TR-31).
- NIST SP 800-88 Rev. 1, *Guidelines for Media Sanitization* (2014),
  cryptographic erase.
- RSA Security, "Open Letter to RSA Customers" (17 March 2011) and the June
  2011 token replacement offer; Andy Greenberg, "The Full Story of the Stunning
  RSA Hack Can Finally Be Told" (*Wired*, 2021).
- Scott Crosby, Ian Goldberg, Robert Johnson, Dawn Song and David Wagner, "A
  Cryptanalysis of the High-bandwidth Digital Content Protection System" (ACM
  DRM Workshop 2001); Intel's confirmation of the HDCP master key leak
  (September 2010).
- ICANN, root KSK rollover announcements (postponement, September 2017;
  rollover, 11 October 2018); RFC 5011 (2007) and RFC 8145 (2017).
- US Cyber Safety Review Board, *Review of the Summer 2023 Microsoft Exchange
  Online Intrusion* (March 2024).
- NIST FIPS 185, *Escrowed Encryption Standard* (1994); Matt Blaze, "Protocol
  Failure in the Escrowed Encryption Standard" (ACM CCS 1994); Hal Abelson,
  Ross Anderson, Steven Bellovin, Josh Benaloh, Matt Blaze, Whitfield Diffie,
  John Gilmore, Peter Neumann, Ronald Rivest, Jeffrey Schiller and Bruce
  Schneier, "The Risks of Key Recovery, Key Escrow, and Trusted Third-Party
  Encryption" (1997); Harold Abelson and others, "Keys Under Doormats:
  Mandating Insecurity by Requiring Government Access to All Data and
  Communications" (2015).
- NASA Jet Propulsion Laboratory, news releases on Mars solar conjunction
  (2015 to 2023), including the 11 to 25 November 2023 command moratorium.
- Site pages: [Key wrap](../../05-modes-aead/Key-Wrap.md),
  [HKDF](../../08-kdf-password-hashing/HKDF.md),
  [NIST KDFs](../../08-kdf-password-hashing/NIST-KDFs.md); book 1
  [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) and
  [Chapter 16](../../book/16-PKI-and-Key-Establishment.md).
