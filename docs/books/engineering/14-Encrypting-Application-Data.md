# 14. Encrypting Application Data

*Almost every database in a cloud today is "encrypted at rest", and the
records in it are stolen anyway, because the thief comes in through the
application, which holds the keys. This chapter is about encryption that
survives that thief: encryption done by the application itself, field by
field and record by record, with keys kept in a key management service. You
will build envelope encryption with a data key per record and a stand-in
KMS, bind each ciphertext to its table, row and column so that it cannot be
moved, rotate keys without rewriting the data, and write the re-encryption
job for when you must. Then you will break the shortcuts that make encrypted
data searchable (deterministic encryption, plain-hash indexes, order-preserving
encryption) the way researchers broke them on real hospital records, and
build the versions that leak less: keyed blind indexes, token vaults, and
format-preserving encryption used where it belongs. The chapter ends with
the copies that encryption forgets (backups, logs, caches), with erasing a
person by destroying a key, and with what changes when the client, not the
server, holds the key.*

!!! abstract "In this chapter"
    **You will learn:**

    - where data can be encrypted (disk, database, application, field,
      client) and which attacker each layer stops;
    - envelope encryption: data keys, key encryption keys, and how AWS KMS,
      Google Cloud KMS, the AWS Encryption SDK and Tink do it;
    - how associated data binds a ciphertext to its table, row and column,
      and the cut-and-paste attack when it is missing;
    - how to rotate a key encryption key without re-encrypting data, and how
      to write a safe re-encryption job when the data keys must change;
    - what deterministic, searchable and order-preserving encryption leak,
      from CryptDB (2011) to the inference and leakage-abuse attacks that
      followed;
    - blind indexes with HMAC, and their limits;
    - tokenization, token vaults and the PCI DSS context; format-preserving
      encryption (FF1, the FF3 break of 2017, FF3-1);
    - the forgotten copies: backups, logs, caches, analytics;
    - crypto-shredding as a way to erase data, and where it falls short;
    - what client-side and end-to-end encryption change for an application.

    **You need:** AEAD and associated data from
    [Chapter 10 of the cryptography book](../../book/10-Message-Authentication.md);
    key hierarchies, wrapping and rotation as ideas from
    [Chapter 10](10-The-Life-of-a-Key.md) of this book, and KMS and HSMs from
    [Chapter 11](11-Hardware-for-Keys.md); the versioned sealed-message format
    of [Chapter 9](09-APIs-That-Resist-Misuse.md) (first sketched in
    [Chapter 1](01-What-Cryptographic-Engineering-Is.md)). You should be
    able to read short Python programs and simple SQL.

    **Levels:** §14.1 and §14.2 are for beginners, §14.3 to §14.12 are
    intermediate, §14.13 is expert.

## 14.1 The problem

*Level: beginner.*

On 29 July 2019 the American bank Capital One announced that someone had copied data about roughly 100
million people in the United States and 6 million in Canada: credit card
applications going back to 2005, with names, addresses, dates of birth,
incomes and credit scores. The records sat in Amazon S3, Amazon's storage
service, and S3 encrypted them on disk. It made no difference. The attacker
had found a misconfigured web application firewall in front of one of the
bank's servers, used it to make the server ask the cloud's internal metadata
service for the server's own credentials (a server-side request forgery),
and then used those credentials, which were allowed to list and read the
buckets, to download the files. Storage encryption decrypts for anyone who
reads through the front door with valid credentials, and stolen valid
credentials are still valid. The bank's statement put it plainly: "We
encrypt our data as a standard. Due to the particular circumstances of this
incident, the unauthorized access also enabled the decrypting of data."

One kind of protection did hold. Capital One had replaced Social Security
numbers and bank account numbers with **tokens**, stand-in values whose real
counterparts sat in a separate system that the stolen credentials could not
reach. Most of those fields stayed protected. The exceptions, about 140,000
Social Security numbers and 80,000 linked bank account numbers, were in
fields that had not been tokenized. The difference between the two outcomes
is the subject of this chapter. Encryption that the storage layer does on
its own protects against someone who steals the disk. Encryption that the
application does, with keys that a different system controls, protects
against someone who steals the data through the storage layer's own
interface, which is how data is almost always stolen.

!!! note "Life story: the Capital One breach (2019)"
    **Born:** March 2019, when an attacker used a server-side request
    forgery through a misconfigured web application firewall to obtain a
    cloud server's role credentials and copy S3 buckets; disclosed 29 July
    2019, the day an arrest was made · **Purpose:** for the attacker,
    reportedly to show it could be done; the data was not found to have
    been sold · **Helped:** made "encrypted at rest" a phrase that security
    teams learned to question; pushed the cloud metadata service to a
    session-token version (AWS IMDSv2, November 2019) that blocks this kind
    of request forgery; the US Office of the Comptroller of the Currency
    fined the bank \$80 million in August 2020 · **Status:** the attacker
    was convicted in June 2022; the case is still the standard example of
    storage encryption that did not matter and tokenization that did

A second story shows the opposite failure: encryption done by the
application, but the wrong kind. In October 2013 Adobe disclosed a breach
of its customer database. The file that later circulated held about 153
million rows. The passwords in it were not hashed, as they should have been
([Chapter 13](13-Passwords-on-the-Server.md)); they were encrypted, with
Triple DES in ECB mode, under one key, so that the same password always
gave the same ciphertext. Next to each one, in plain text, sat the
password hint the user had chosen. Nobody needed the key. The most common
ciphertext, shared by close to two million accounts, came with hints like
"1 to 6" and "numbers", and was obviously `123456`. Every account with the
same ciphertext had the same password, so the hints of all of them could be
pooled. The weakness was not Triple DES; it was that equal inputs gave
equal outputs, which is exactly the property that people later added to
databases on purpose, to make encrypted columns searchable (§14.6).

These two stories frame the chapter. The first asks *where* to encrypt, and
with which keys, so that the thief who comes through the application gets
ciphertext. The second asks *how much an encrypted column may reveal*, and
answers: less than you think it does. Between them sit the engineering
problems that every team doing this meets: how to keep keys out of the
database without calling a key service for every row (envelope encryption,
§14.3), how to stop an attacker who can write to the database from moving
ciphertexts around (§14.4), how to rotate keys over billions of rows
(§14.5), how to search without decrypting everything (§14.6 to §14.8), how
to keep a card number in a 16-digit column (§14.9), and how to make sure
the plaintext you encrypted so carefully is not sitting in a log file
(§14.10).

Some neighboring subjects belong to other chapters and books. Full-disk
encryption and file encryption with age are
[Protocols chapter 18](../protocols/18-Encrypting-Files-and-Disks.md); this
chapter treats them only as one layer among several. Key hierarchies,
wrapping and rotation are introduced as ideas in
[Chapter 10](10-The-Life-of-a-Key.md), and HSMs and cloud key services are
[Chapter 11](11-Hardware-for-Keys.md); here they are put to work on
application data. Computing on encrypted data with homomorphic encryption
or multi-party computation, and releasing statistics with differential
privacy, belong to [Advanced protocols and privacy](../advanced/index.md)
(§14.12 says a paragraph about each).

Throughout the chapter the code uses a stand-in for an AEAD, because
Python's standard library has no AES. It is the encrypt-then-MAC
construction from [Chapter 1](01-What-Cryptographic-Engineering-Is.md) and
[Chapter 9](09-APIs-That-Resist-Misuse.md): a keystream made with
HMAC-SHA256, and an HMAC-SHA256 tag over the associated data, the nonce and
the ciphertext. It behaves like AES-GCM or ChaCha20-Poly1305 at its
interface (key, plaintext and associated data in; nonce, ciphertext and tag
out; one error for any tampering), and it is labeled as teaching code
wherever it appears. In production, call a real AEAD from a real library.

## 14.2 Where to encrypt

*Level: beginner.*

Data in an application passes through layers, and each layer can encrypt
it. The layers differ in one thing that matters more than any other: which
process holds the key at the moment the data is read, because that process,
and anyone who can act as it, sees plaintext. Figure 14.1 lines them up.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Five layers where data can be encrypted, from the disk up to the client, with the attackers each one stops and the ones it does not" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">Layer (who holds the key)</text>
<text x="330" y="24" font-weight="bold">Stops</text>
<text x="490" y="24" font-weight="bold">Does not stop</text>
<rect x="20" y="40" width="290" height="44" rx="3" fill="currentColor" opacity="0.06"/>
<rect x="20" y="40" width="290" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="58">Disk or volume (OS, cloud storage)</text>
<text x="30" y="76" opacity="0.7">XTS, LUKS, BitLocker, S3 default</text>
<text x="330" y="66">a stolen disk</text>
<text x="490" y="66">anyone who logs in</text>
<rect x="20" y="94" width="290" height="44" rx="3" fill="currentColor" opacity="0.10"/>
<rect x="20" y="94" width="290" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="112">Database TDE (database server)</text>
<text x="30" y="130" opacity="0.7">files, backups, replicas</text>
<text x="330" y="120">stolen files, backups</text>
<text x="490" y="120">SQL access, DBAs</text>
<rect x="20" y="148" width="290" height="44" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="20" y="148" width="290" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="166">Application, per record (app + KMS)</text>
<text x="30" y="184" opacity="0.7">envelope encryption</text>
<text x="330" y="174">SQL access, DBAs</text>
<text x="490" y="174">the app itself</text>
<rect x="20" y="202" width="290" height="44" rx="3" fill="currentColor" opacity="0.20"/>
<rect x="20" y="202" width="290" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="220">Field, per column (one service + KMS)</text>
<text x="30" y="238" opacity="0.7">tokens, encrypted columns</text>
<text x="330" y="228">most of the app</text>
<text x="490" y="228">that one service</text>
<rect x="20" y="256" width="290" height="44" rx="3" fill="currentColor" opacity="0.28"/>
<rect x="20" y="256" width="290" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="274">Client (the user's device)</text>
<text x="30" y="292" opacity="0.7">end-to-end</text>
<text x="330" y="282">the whole server side</text>
<text x="490" y="282">the device, the user</text>
<line x1="616" y1="292" x2="616" y2="48" stroke="currentColor" stroke-width="1.4"/>
<polygon points="616,40 611,52 621,52" fill="currentColor"/>
<text x="604" y="318" text-anchor="end" opacity="0.7">higher: fewer readers, less the server can do with the data</text>
</svg>
<figcaption>Figure 14.1. Where to encrypt. Each layer stops the attackers below the process that holds its key and none of the ones that can act as that process. Moving up stops more attackers and takes away more of what the server can do with the data: search, sort, join, index.</figcaption>
</figure>

**Disk or volume encryption** is done by the operating system or the
storage service. The key is unlocked when the machine boots or the volume
mounts, and from then on every read through the file system is decrypted.
It protects a laptop left in a taxi, a drive pulled from a data center and
sent for recycling, and a snapshot of a cloud volume copied by someone who
has access to snapshots but not to the running machine. It does nothing
against an attacker who reads files through the running system. Every major
cloud now encrypts storage by default (Amazon S3 has done so for all new
objects since January 2023), which is good, and which is why "encrypted at
rest" on a compliance form tells you almost nothing about a breach. How
disk encryption works, from XTS to cold-boot attacks, is
[Protocols chapter 18](../protocols/18-Encrypting-Files-and-Disks.md).

**Transparent data encryption** (TDE) is the database's own version. Oracle
introduced it in 2005 and Microsoft SQL Server in 2008; PostgreSQL has had
extensions and forks that add it. The database encrypts its data files,
logs and backups with a database key, which is itself wrapped by a master
key, often in an HSM or KMS. "Transparent" is the point: applications and
queries do not change, because the database decrypts pages as it reads them
into memory. TDE adds one protection over disk encryption that matters in
practice: backups and exported files are encrypted under a key that the
database controls, so a backup copied to the wrong place is ciphertext. It
protects nothing from anyone who can run SQL. A database administrator, an
attacker with a SQL injection, or a reporting tool with a read-only account
sees every value in the clear.

**Application-level encryption** moves the key out of the database
entirely. The application encrypts a record, or the sensitive part of it,
before writing it, and stores only ciphertext. The database now holds
nothing it can read, so SQL injection, a curious administrator, a leaked
read replica and a stolen backup all yield ciphertext. The keys live in a
key management service, and the application asks for them (§14.3), so an
attacker must also compromise the application's identity with the KMS, and
every use of that identity is logged. The cost is that the database can no
longer look inside the encrypted fields: no `WHERE ssn = ?`, no `ORDER BY
birth_date`, no full-text index on the encrypted notes. Sections 14.6 to
14.8 are about the ways people have tried to win some of that back, and
what each costs.

**Field-level encryption** is the same idea applied to a few columns, and
with keys that only one service can use. The card number is encrypted, or
replaced with a token, by a payment service; the rest of the application,
including the web servers that handle most requests, never holds the key
and never sees the card. That is what saved most of Capital One's Social
Security numbers. The smaller the set of processes that can decrypt, the
smaller the set an attacker has to break into, and field-level encryption
can shrink it to a single service with a narrow interface and its own logs.

**Client-side encryption** goes one step further: the key never reaches
the server at all. Password managers, end-to-end messaging and some backup
services work this way. The server stores and forwards ciphertext and can
do almost nothing else with it. Section 14.12 looks at what that changes.

A useful way to choose is to name the attacker first, as
[Chapter 1](01-What-Cryptographic-Engineering-Is.md) asked for every
threat model, and then pick the lowest layer that stops them:

| Attacker | Lowest layer that stops them |
| --- | --- |
| Someone who steals a disk, a laptop or a volume snapshot | disk encryption |
| Someone who gets a database backup or data file | TDE, or application-level |
| SQL injection, a leaked read-only account, a curious DBA | application-level |
| A compromised web server that does not need the field | field-level, in another service |
| A compromised server, a subpoena to the operator | client-side |

The layers stack. Encrypting the disk does not stop you also encrypting
fields, and a system that handles sensitive data usually has three of these
at once: disk encryption everywhere because it is free, TDE or its cloud
equivalent for backups, and application or field encryption for the few
fields whose theft would be a disaster.

What to do:

- Write down, for each sensitive field, the attacker you want it to
  survive, then choose the layer from the table. "Encrypted at rest" is not
  an answer; "a SQL injection yields ciphertext" is.
- Keep disk encryption and TDE on, but do not count them as protection
  against anyone who can log in.
- For the handful of fields whose theft would make the news (government
  ID numbers, card numbers, health data, secrets of other systems), use
  application or field-level encryption with keys in a KMS, decrypted by
  as few services as possible.

## 14.3 Envelope encryption

*Level: intermediate.*

An application that encrypts records needs keys, and the first idea is to
put one key in the application's configuration and encrypt everything with
it. That key then sits in a configuration file, an environment variable,
a container image, a CI log and the memory of every server, which is how
keys leak ([Chapter 12](12-Secrets-in-Operations.md)). One stolen copy
decrypts every record ever written, and changing it means rewriting every
record.

The second idea is to keep the key in a key management service or HSM
([Chapter 11](11-Hardware-for-Keys.md)) and send every record to it to be
encrypted. Now the key cannot be copied, every use is logged, and access
is a policy that can be revoked. But a KMS is a remote service: each call
costs a network round trip (milliseconds, against microseconds for local
AES), is rate-limited, costs money per call, and accepts only small inputs.
AWS KMS's `Encrypt` takes at most 4,096 bytes of plaintext; Google Cloud
KMS's takes at most 64 KiB (8 KiB for keys in its HSMs). Neither is meant
to encrypt your data. They are meant to encrypt your keys.

**Envelope encryption** combines the two (Figure 14.2). Each record, or
each file or batch, gets its own fresh **data encryption key** (DEK),
generated for it and used locally with a fast AEAD. The DEK is then
encrypted, or **wrapped**, by a **key encryption key** (KEK) that never
leaves the KMS. The record is stored as the pair: the wrapped DEK and the
ciphertext. To read it, the application sends the wrapped DEK (a few dozen
bytes) to the KMS, gets the DEK back, and decrypts locally. The plaintext
DEK lives only in the application's memory, briefly.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Envelope encryption: the KMS holds the key encryption key and returns a data key in two forms; the application encrypts the record with the plain data key and stores the wrapped data key next to the ciphertext" fill="currentColor" font-size="14">
<rect x="20" y="30" width="180" height="110" rx="4" fill="currentColor" opacity="0.08"/>
<rect x="20" y="30" width="180" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="52" text-anchor="middle" font-weight="bold">KMS</text>
<rect x="45" y="65" width="130" height="34" rx="3" fill="currentColor" opacity="0.25"/>
<text x="110" y="87" text-anchor="middle" font-weight="bold">KEK</text>
<text x="110" y="124" text-anchor="middle" opacity="0.7">never leaves</text>
<rect x="250" y="30" width="170" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="335" y="52" text-anchor="middle" font-weight="bold">application</text>
<rect x="270" y="65" width="130" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="335" y="85" text-anchor="middle">DEK (in memory)</text>
<text x="335" y="124" text-anchor="middle" opacity="0.7">AEAD, locally</text>
<line x1="200" y1="72" x2="244" y2="72" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,72 240,67 240,77" fill="currentColor"/>
<text x="225" y="62" text-anchor="middle" font-size="12">DEK</text>
<line x1="200" y1="104" x2="244" y2="104" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,104 240,99 240,109" fill="currentColor"/>
<text x="225" y="122" text-anchor="middle" font-size="12">wrapped</text>
<rect x="250" y="200" width="370" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="435" y="280" text-anchor="middle" font-weight="bold">database row</text>
<rect x="260" y="212" width="120" height="36" rx="3" fill="currentColor" opacity="0.20"/>
<text x="320" y="235" text-anchor="middle">wrapped DEK</text>
<rect x="390" y="212" width="220" height="36" rx="3" fill="currentColor" opacity="0.10"/>
<rect x="390" y="212" width="220" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="500" y="235" text-anchor="middle">nonce, ciphertext, tag</text>
<line x1="335" y1="140" x2="320" y2="206" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,212 316,201 325,203" fill="currentColor"/>
<line x1="380" y1="140" x2="480" y2="206" stroke="currentColor" stroke-width="1.4"/>
<polygon points="485,210 473,206 478,199" fill="currentColor"/>
<text x="455" y="168" font-size="12">record encrypted with the DEK</text>
<text x="20" y="190" font-size="12" opacity="0.8">To read: send the wrapped DEK</text>
<text x="20" y="208" font-size="12" opacity="0.8">to the KMS (logged, checked</text>
<text x="20" y="226" font-size="12" opacity="0.8">against policy), get the DEK,</text>
<text x="20" y="244" font-size="12" opacity="0.8">decrypt locally, forget the DEK.</text>
</svg>
<figcaption>Figure 14.2. Envelope encryption. The key service generates a data key and returns it twice, in plain and wrapped under the KEK. The application encrypts with the plain copy, stores the wrapped copy beside the ciphertext, and drops the plain copy.</figcaption>
</figure>

The design gets the good properties of both ideas. The KEK cannot be
stolen from the application, because the application never has it. A
stolen database holds only wrapped DEKs, which are useless without the KMS.
Every decryption needs a KMS call, so every decryption is authorized by a
policy and recorded in an audit log, which is how you find out what an
attacker read. Bulk encryption is local and fast. And because each record
has its own DEK, the amount of data under any one AES key is small, which
keeps you far from the limits on how much data one GCM key may encrypt
with random nonces ([Chapter 10 of the cryptography book](../../book/10-Message-Authentication.md)).

### How the cloud services do it

**AWS KMS** (launched November 2014) has an operation made for this,
`GenerateDataKey`. You name a KMS key and a key length; it returns the new
data key twice, as plaintext and as a ciphertext blob encrypted under the
KMS key. You encrypt locally with the plaintext copy, store the blob, and
later call `Decrypt` with the blob to get the data key back. The blob
carries an identifier of the KMS key and its key version inside it, so
`Decrypt` needs nothing else. Both calls take an optional **encryption
context**: a set of key-value pairs, such as `{"table": "orders",
"order_id": "1001"}`, that is bound to the ciphertext as associated data.
`Decrypt` fails unless the caller presents exactly the same context. The
context is not secret; it is written in plain text into the CloudTrail
audit log of each call, which makes it doubly useful: it binds the data
key to the record it belongs to (§14.4), and it tells the person reading
the log which record was decrypted. Key policies can also require a
particular context, so that a service can decrypt only the keys of its own
table.

**Google Cloud KMS** has no data-key operation. You generate the DEK
yourself, from the operating system's generator, and call `Encrypt` on the
DEK, passing **additional authenticated data** (AAD), Google's name for the
same binding; `Decrypt` fails if the AAD differs. A Cloud KMS key has
versions, one of which is primary; the ciphertext records which version
encrypted it, and `Decrypt` picks that version automatically. Google's
documentation describes the envelope pattern in these words and recommends
it for anything larger than the 64 KiB limit.

**The AWS Encryption SDK** is a client library that does the whole envelope
for you and defines a portable message format for the result. A message
starts with a header: a version, the algorithm suite, a random message ID,
the encryption context in the clear, and a list of **encrypted data keys**,
the same data key wrapped once for each "master key" or keyring you named
(several KMS keys in different regions, for example, so that any one can
decrypt). The body is encrypted in frames, 4,096 bytes each by default,
each with its own nonce and tag, so that a large file can be streamed and
a truncated one detected. The data key is not used directly: an HKDF step
derives the message key from it and the message ID. The default suite since
version 2.0 (2020) is AES-256-GCM with HKDF, **key commitment** (a value in
the header that ties the ciphertext to one data key; §14.13 explains why),
and an ECDSA P-384 signature over the whole message, so that someone who
can decrypt cannot forge a message that others will accept.

**Google's Tink** has an envelope primitive, `KmsEnvelopeAead`, that does
the same with less ceremony: a 4-byte length, the DEK wrapped by the KMS
key, then the AEAD ciphertext of the data under the DEK. Tink chooses the
DEK's algorithm from a template, and it is one of the libraries that
[Chapter 9](09-APIs-That-Resist-Misuse.md) holds up as hard to misuse.

!!! note "Life story: AWS Key Management Service"
    **Born:** announced at AWS re:Invent, November 2014, as a regional
    service holding customer master keys in HSMs, with `GenerateDataKey` for
    envelope encryption from the first day · **Purpose:** let applications
    and AWS's own services encrypt data under keys that never leave the
    service, with every use logged in CloudTrail and controlled by policy ·
    **Helped:** made envelope encryption the default pattern in the cloud;
    S3, EBS, RDS, DynamoDB and most other AWS services encrypt through it;
    Google Cloud KMS (2017) and Azure Key Vault (2015) offer the same idea;
    its HSMs were validated at FIPS 140-2 Level 2 (2017), Level 3 (May
    2023) and later FIPS 140-3 Level 3 ·
    **Status:** in service; rotation of keys became configurable from 90
    days to 2,560 days, and on demand, in April 2024

### Code it: a stand-in KMS and per-record data keys

The code below builds the whole pattern with the standard library. The
class `StandInKMS` plays the part of the key service: it holds the KEKs,
which never leave it, generates data keys, and keeps an audit log. The
AEAD is the HMAC-based stand-in described in §14.1. Each record gets its
own DEK, and both the DEK and the record are bound to a context naming the
row.

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

class StandInKMS:
    """Plays the part of AWS KMS or Cloud KMS: the KEK never leaves it."""
    def __init__(self):
        self._keks = {"orders": [secrets.token_bytes(32)]}   # key id -> versions
        self.log = []                                        # the audit trail
    def generate_data_key(self, key_id, context):
        dek = secrets.token_bytes(32)
        ver = len(self._keks[key_id]) - 1
        wrapped = bytes([ver]) + aead_seal(self._keks[key_id][ver], dek, context)
        self.log.append(("GenerateDataKey", key_id, context))
        return dek, wrapped                  # the caller stores only `wrapped`
    def decrypt(self, key_id, wrapped, context):
        self.log.append(("Decrypt", key_id, context))
        return aead_open(self._keks[key_id][wrapped[0]], wrapped[1:], context)

kms = StandInKMS()

def encrypt_record(plaintext, context):
    dek, wrapped = kms.generate_data_key("orders", context)
    body = aead_seal(dek, plaintext, context)
    return {"wrapped_dek": wrapped, "body": body}   # dek is dropped here

def decrypt_record(rec, context):
    dek = kms.decrypt("orders", rec["wrapped_dek"], context)
    return aead_open(dek, rec["body"], context)

ctx = b"table=orders;id=1001"
rec = encrypt_record(b"ship to: 12 Elm St, card ending 4242", ctx)
print(len(rec["wrapped_dek"]), "byte wrapped key,", len(rec["body"]), "byte body")
print(decrypt_record(rec, ctx))
for entry in kms.log:
    print(entry)
```

```text
81 byte wrapped key, 84 byte body
b'ship to: 12 Elm St, card ending 4242'
('GenerateDataKey', 'orders', b'table=orders;id=1001')
('Decrypt', 'orders', b'table=orders;id=1001')
```

The wrapped key is 81 bytes: one byte naming the KEK version, then a
16-byte nonce, the 32-byte DEK encrypted, and a 32-byte tag. The body is
the 36-byte address with the same 48 bytes of overhead. The audit log
shows one call to create the record and one to read it, each naming the
row; that log, in a real KMS, is what an incident team reads first.

### The cost, and how to spend less

One KMS call per record read is fine for a page that shows one customer
and too much for a report over a million rows. Three choices trade calls
against blast radius.

- **Granularity of the DEK.** One DEK per record is the most isolated: a
  leaked DEK exposes one record. One DEK per tenant, per user or per day
  is common: the application unwraps it once and decrypts many records
  locally. Per-user DEKs also make crypto-shredding possible (§14.11). One
  DEK per table, used for years, is the original mistake with an extra
  step.
- **Caching unwrapped DEKs.** The AWS Encryption SDK has a caching
  component that keeps unwrapped data keys in memory for a bounded time and
  number of messages. It cuts KMS calls sharply, and it also means that a
  compromised process holds many DEKs at once and that a revoked permission
  takes effect only when the cache expires. Set short limits.
- **Batching.** Encrypt a batch of records (an export file, a day of log
  events) under one DEK, as the AWS Encryption SDK does with a whole
  message.

What to do:

- Never encrypt application data under a key that sits in configuration.
  Keep KEKs in a KMS or HSM and use envelope encryption.
- Prefer a library that does the envelope and the message format for you
  (the AWS Encryption SDK, Tink, a database's client-side encryption
  library) over code of your own.
- Put the record's identity in the encryption context or AAD of the KMS
  call, so the audit log says which records were opened.
- Choose DEK granularity deliberately: per record or per user for
  sensitive data, and keep any DEK cache short-lived.

## 14.4 Associated data: binding a ciphertext to its place

*Level: intermediate.*

An AEAD guarantees that a ciphertext has not been changed since it was
made. It does not guarantee that it is in the right place. A database is a
grid of cells, and an attacker who can write to the database, through SQL
injection, a compromised administrative tool, or a backup they altered and
got restored, can copy a valid ciphertext from one cell to another. The
copied cell is still a perfect, untouched ciphertext under the right key,
so it decrypts without complaint. If the application then shows the cell to
someone, the attacker has turned write access into read access.

**Break it.** Here every Social Security number in a table is encrypted
under one column key, with no associated data. The application lets each
user see their own profile. Mallory cannot read keys, but she can write one
cell:

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

KEY = secrets.token_bytes(32)        # the column key; the attacker never sees it

# BROKEN: every SSN is encrypted under the same key with no associated data
db = {"users": {
    1: {"name": "alice",   "ssn": aead_seal(KEY, b"078-05-1120")},
    2: {"name": "mallory", "ssn": aead_seal(KEY, b"219-09-9999")},
}}

def show_my_profile(user_id):        # the app shows a user their own SSN
    row = db["users"][user_id]
    return row["name"], aead_open(KEY, row["ssn"]).decode()

# Mallory can write to the database (a SQL injection, a stolen backup she
# restores, a careless admin tool) but cannot read keys. She copies a cell.
db["users"][2]["ssn"] = db["users"][1]["ssn"]
print(show_my_profile(2))
```

```text
('mallory', '078-05-1120')
```

Mallory's profile page now shows Alice's number. Nothing was decrypted by
the attacker and no key was touched; the application did the decryption on
her behalf. The same move works between columns (copy an encrypted
diagnosis into a "notes" field that support staff can read), between tables
that share a key, and between tenants of a multi-tenant system that
encrypts all tenants under one key, which is the worst case: one customer
reads another's data through their own account.

Per-record data keys do not stop it by themselves. If the wrapped DEK is
stored in the same row as the ciphertext, the attacker copies both cells,
and the pair decrypts as well in the new row as in the old one.

**Fix it.** Give the AEAD the cell's address as associated data: the
table, the column and the row's primary key, plus a format version. The
tag then covers the address, and a ciphertext moved anywhere else fails to
open. The fields are length-prefixed, so that no two different addresses
produce the same bytes ([Chapter 2](02-Bytes-Encodings-and-Text.md)
explains why plain concatenation is not enough: table `ab`, column `c` and
table `a`, column `bc` must not collide).

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

KEY = secrets.token_bytes(32)

def where(table, column, row_id):    # FIXED: the cell's address, length-prefixed
    parts = [b"v1", table.encode(), column.encode(), str(row_id).encode()]
    return b"".join(len(p).to_bytes(2, "big") + p for p in parts)

def put(table, column, row_id, value):
    return aead_seal(KEY, value, where(table, column, row_id))

def get(table, column, row_id, blob):
    return aead_open(KEY, blob, where(table, column, row_id))

db = {"users": {
    1: {"name": "alice",   "ssn": put("users", "ssn", 1, b"078-05-1120"),
        "notes": put("users", "notes", 1, b"prefers email")},
    2: {"name": "mallory", "ssn": put("users", "ssn", 2, b"219-09-9999"),
        "notes": put("users", "notes", 2, b"")},
}}

def show(user_id, column):
    try:
        return get("users", column, user_id, db["users"][user_id][column]).decode()
    except ValueError as e:
        return "refused: " + str(e)

db["users"][2]["ssn"] = db["users"][1]["ssn"]        # another row
print("row swap:   ", show(2, "ssn"))
db["users"][1]["notes"] = db["users"][1]["ssn"]      # another column, same row
print("column swap:", show(1, "notes"))
print("untouched:  ", show(1, "ssn"))
```

```text
row swap:    refused: cannot open
column swap: refused: cannot open
untouched:   078-05-1120
```

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The cut-and-paste attack: a ciphertext copied from Alice's row to Mallory's row opens without associated data and is refused with it" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">users table</text>
<rect x="20" y="36" width="80" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="60" y="58" text-anchor="middle">id 1</text>
<rect x="100" y="36" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="58" text-anchor="middle">alice</text>
<rect x="200" y="36" width="140" height="34" fill="currentColor" opacity="0.18"/>
<rect x="200" y="36" width="140" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="58" text-anchor="middle">ssn: c1</text>
<rect x="20" y="70" width="80" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="60" y="92" text-anchor="middle">id 2</text>
<rect x="100" y="70" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="92" text-anchor="middle">mallory</text>
<rect x="200" y="70" width="140" height="34" fill="currentColor" opacity="0.18"/>
<rect x="200" y="70" width="140" height="34" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="92" text-anchor="middle">ssn: c1 (copied)</text>
<path d="M 340 53 C 380 53 380 87 346 87" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,87 350,82 350,92" fill="currentColor"/>
<text x="385" y="74">attacker copies a cell</text>
<rect x="20" y="140" width="290" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="165" y="162" text-anchor="middle" font-weight="bold">no associated data</text>
<text x="165" y="186" text-anchor="middle">open(key, c1) succeeds in row 2</text>
<text x="165" y="210" text-anchor="middle" opacity="0.8">Mallory's page shows Alice's SSN</text>
<rect x="330" y="140" width="290" height="90" rx="4" fill="currentColor" opacity="0.08"/>
<rect x="330" y="140" width="290" height="90" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="475" y="162" text-anchor="middle" font-weight="bold">AAD = users | ssn | row id</text>
<text x="475" y="186" text-anchor="middle">c1 was sealed with "row 1"</text>
<text x="475" y="210" text-anchor="middle" opacity="0.8">open with "row 2" fails: refused</text>
</svg>
<figcaption>Figure 14.3. The cut-and-paste attack. Without associated data, a ciphertext is valid in any cell that uses the same key. With the cell's address in the associated data, it is valid only where it was made.</figcaption>
</figure>

The address is not stored with the ciphertext; the application
reconstructs it from where it is reading. That is the point: the
associated data must come from the reader's knowledge of where it is, not
from the data it is checking. A format that stores the row ID inside the
ciphertext's header and then uses that stored ID as associated data checks
nothing, because the attacker copies the header too.

The same binding belongs at the key layer. Put the table and row in the KMS
encryption context (AWS) or AAD (Google) when wrapping a per-record DEK,
as the code in §14.3 did, so that a wrapped DEK moved to another row also
fails, and so that a KMS key policy can say "the orders service may
decrypt only keys whose context says `table=orders`". Libraries that encrypt
database items do this for you: the AWS Database Encryption SDK (the
successor, in 2023, of the DynamoDB Encryption Client of 2018) signs or
authenticates the item's attributes together, including the table name and
the primary key. Microsoft's SQL Server Always Encrypted, by contrast,
authenticates each value under its column encryption key but not its row,
so a value can be copied between rows of the same column; check what your
library binds before relying on it.

### What associated data does not stop

- **Rollback.** An attacker who saved an old ciphertext of the same cell
  (yesterday's balance, last month's "account locked = false") can write it
  back, and it opens, because it was made for exactly that address. If old
  values matter, put a version counter in the associated data and keep the
  counter where the attacker cannot reset it, or sign the whole row with
  its version.
- **Deletion.** Removing a row, or a whole table, leaves nothing to fail
  to decrypt. Integrity of a collection needs a structure over the
  collection: a MAC over a list of row hashes, or a Merkle tree, as
  [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md) builds for
  logs.
- **Plaintext columns next to encrypted ones.** If `role` is a plain column
  and `ssn` is encrypted, changing `role` is not detected at all. Decide
  which columns need integrity, and either encrypt them or include them in
  the associated data of a cell that is encrypted, or authenticate the row.

What to do:

- Always pass associated data that names where a ciphertext lives: tenant,
  table, column, primary key, format version. Build it from where you are
  reading, never from the stored data.
- Bind wrapped DEKs the same way, through the KMS encryption context or
  AAD, and write key policies that check the context.
- Decide whether rollback matters for each field. If it does, add a
  version counter to the associated data.
- Never let a multi-tenant system encrypt two tenants' data under one key
  without the tenant ID in the associated data.

## 14.5 Rotating keys over billions of rows

*Level: intermediate.*

Keys are rotated for three reasons, and they need different work
([Chapter 10](10-The-Life-of-a-Key.md) sets out cryptoperiods and the
reasons in general). The first is **policy**: a standard or an auditor asks
that keys change every year, so that a key stolen without anyone noticing
stops being useful for new data. The second is **suspected compromise** of
a key. The third is **algorithm change**: moving from one cipher or format
to another. Envelope encryption makes the first one almost free, and only
the second and third, when they concern the data keys, need a job that
touches every row (Figure 14.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Two kinds of rotation: rotating the key encryption key rewraps small data keys or nothing at all, while changing data keys rewrites every record" fill="currentColor" font-size="14">
<text x="20" y="26" font-weight="bold">Rotate the KEK (policy)</text>
<rect x="20" y="40" width="90" height="32" rx="3" fill="currentColor" opacity="0.25"/>
<text x="65" y="61" text-anchor="middle">KEK v1</text>
<rect x="130" y="40" width="90" height="32" rx="3" fill="currentColor" opacity="0.25"/>
<text x="175" y="61" text-anchor="middle">KEK v2</text>
<text x="240" y="54">new DEKs wrapped by v2; old wrapped</text>
<text x="240" y="72">DEKs still open with v1 (kept, not used)</text>
<rect x="20" y="88" width="60" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="50" y="105" text-anchor="middle" font-size="12">80 B</text>
<rect x="80" y="88" width="220" height="24" rx="2" fill="currentColor" opacity="0.08"/>
<rect x="80" y="88" width="220" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="190" y="105" text-anchor="middle" font-size="12">ciphertext: untouched</text>
<text x="320" y="105" font-size="13">optional rewrap: touches only the 80 bytes</text>
<line x1="20" y1="132" x2="620" y2="132" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="20" y="160" font-weight="bold">Change the DEKs (compromise, new algorithm)</text>
<rect x="20" y="176" width="60" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="50" y="193" text-anchor="middle" font-size="12">v1</text>
<rect x="80" y="176" width="220" height="24" rx="2" fill="currentColor" opacity="0.08"/>
<rect x="80" y="176" width="220" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="190" y="193" text-anchor="middle" font-size="12">decrypt</text>
<line x1="305" y1="188" x2="335" y2="188" stroke="currentColor" stroke-width="1.4"/>
<polygon points="341,188 331,183 331,193" fill="currentColor"/>
<rect x="345" y="176" width="60" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="375" y="193" text-anchor="middle" font-size="12">v2</text>
<rect x="405" y="176" width="215" height="24" rx="2" fill="currentColor" opacity="0.2"/>
<rect x="405" y="176" width="215" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="512" y="193" text-anchor="middle" font-size="12">re-encrypt, verify, replace</text>
<text x="20" y="232">every byte of every record is read and written again: a batch job with</text>
<text x="20" y="252">checkpoints, readers that accept both versions, and the old key kept until the end</text>
</svg>
<figcaption>Figure 14.4. The two rotations. Rotating the KEK costs nothing per record, or a small rewrap of each wrapped DEK. Changing the DEKs means decrypting and re-encrypting all the data.</figcaption>
</figure>

### Rotating the KEK without touching the data

Cloud KMS keys rotate by adding a new version of the key material under
the same key ID. New wraps use the new version; old wrapped DEKs carry the
number of the version that wrapped them, and the service keeps every old
version so that they still unwrap. AWS KMS rotates customer-managed keys
automatically once enabled, every 365 days by default; since April 2024 the
period can be set from 90 to 2,560 days, and a rotation can be requested on
demand. Google Cloud KMS rotates on a schedule you set and, in its own
documentation's words, does not re-encrypt data encrypted with earlier
versions and does not disable or destroy them. In both, rotation by itself
costs the application nothing.

If you want old wrapped DEKs moved to the new KEK version, for example to
destroy the old version, you **rewrap**: send each wrapped DEK to the KMS,
which unwraps it under the old version and wraps it under the new one.
AWS has an operation for exactly this, `ReEncrypt`, which does both steps
inside the service so that the DEK never appears in the caller's memory.
The data itself is not read. The stand-in below rotates a KEK over a
thousand 4 KB records and then rewraps their keys:

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

class StandInKMS:
    def __init__(self):
        self._versions = [secrets.token_bytes(32)]
    def generate_data_key(self, context):
        dek, v = secrets.token_bytes(32), len(self._versions) - 1
        return dek, bytes([v]) + aead_seal(self._versions[v], dek, context)
    def decrypt(self, wrapped, context):
        return aead_open(self._versions[wrapped[0]], wrapped[1:], context)
    def rotate(self):                        # new KEK version; old ones kept
        self._versions.append(secrets.token_bytes(32))
    def re_encrypt(self, wrapped, context):  # like AWS ReEncrypt: the DEK stays inside
        dek = self.decrypt(wrapped, context)
        v = len(self._versions) - 1
        return bytes([v]) + aead_seal(self._versions[v], dek, context)

kms = StandInKMS()
table = {}
for i in range(1000):                        # 1,000 records of 4 KB each
    ctx = b"orders/%d" % i
    dek, wrapped = kms.generate_data_key(ctx)
    table[i] = [wrapped, aead_seal(dek, secrets.token_bytes(4096), ctx)]

kms.rotate()                                 # step 1: new data keys use KEK v1
dek, wrapped = kms.generate_data_key(b"orders/1000")
print("new records wrapped under KEK version", wrapped[0])
old = table[7]
dek = kms.decrypt(old[0], b"orders/7")       # old records still open
print("record 7 still opens:", len(aead_open(dek, old[1], b"orders/7")), "bytes")

touched = 0                                  # step 2 (optional): rewrap old keys
for i, rec in table.items():
    if rec[0][0] != 1:
        rec[0] = kms.re_encrypt(rec[0], b"orders/%d" % i)
        touched += len(rec[0])
total = sum(len(w) + len(b) for w, b in table.values())
print("rewrapped", touched, "bytes of", total, "stored")
```

```text
new records wrapped under KEK version 1
record 7 still opens: 4096 bytes
rewrapped 81000 bytes of 4225000 stored
```

The rewrap touched 81,000 bytes out of 4.2 million, under 2%, and none of
them were record contents. With records of a few megabytes, as in object
storage, the fraction is far smaller. That is the practical case for
envelope encryption over encrypting everything with one long-lived key.

Note what this rotation does and does not buy. It limits how much data
depends on any one version of the KEK, and it satisfies "keys rotate
yearly". It does not help if a DEK leaked, because the leaked DEK still
decrypts its record whatever wraps it now. And it does not help if the
attacker could call the KMS as your application, which is the more likely
compromise: they could have unwrapped any DEK, under any version, while
they had access.

### Changing the data keys: the re-encryption job

When a DEK, a table key or the algorithm must change, every affected
record is decrypted and encrypted again. On a large table that is a
batch job running for hours or days alongside live traffic, and it has to
survive being stopped halfway. The rules that make it safe:

1. **A version in every ciphertext.** Each stored value starts with a
   header naming its format and key, as in
   [Chapter 9](09-APIs-That-Resist-Misuse.md)'s sealed-message format.
   Without it, the job cannot tell done rows from not-done rows.
2. **Readers first.** Deploy readers that accept both the old and the new
   version before the job starts. Writers switch to the new version next,
   so no new old-format rows appear. Only then does the job run.
3. **Idempotent and resumable.** The job skips rows already in the new
   version, records a checkpoint after each batch, and can be killed and
   restarted at any time.
4. **Verify before replacing.** Decrypt the new ciphertext and compare it
   with the plaintext before writing it over the old one, and write with a
   condition (compare-and-set on the old value) so that a concurrent update
   by the application is not overwritten with stale data.
5. **Destroy the old key last.** Only when a scan finds no row in the old
   version, including in backups you intend to restore, is the old key
   retired.

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

keys = {1: secrets.token_bytes(32), 2: secrets.token_bytes(32)}   # key 1 leaked

def seal(version, value, ctx):           # one header byte names the key
    return bytes([version]) + aead_seal(keys[version], value, ctx)

def open_any(blob, ctx):                 # readers accept both during the move
    return aead_open(keys[blob[0]], blob[1:], ctx)

rows = {i: seal(1, b"record %d" % i, b"t/%d" % i) for i in range(10)}
state = {"done_up_to": -1}               # the checkpoint, stored durably

def migrate(batch=4, crash_after=None):
    moved = 0
    for i in sorted(rows):
        if i <= state["done_up_to"]:
            continue                     # resumed: skip what is done
        blob = rows[i]
        if blob[0] != 2:                 # idempotent: v2 rows are left alone
            value = open_any(blob, b"t/%d" % i)
            new = seal(2, value, b"t/%d" % i)
            assert open_any(new, b"t/%d" % i) == value   # read back before replacing
            rows[i] = new
            moved += 1
        if (i + 1) % batch == 0:
            state["done_up_to"] = i      # checkpoint after each batch
        if crash_after is not None and moved == crash_after:
            raise RuntimeError("worker died")
    state["done_up_to"] = max(rows)
    return moved

try:
    migrate(crash_after=6)
except RuntimeError as e:
    print(e, "with checkpoint at row", state["done_up_to"])
print("second run moved", migrate(), "rows")
print("versions left:", sorted({b[0] for b in rows.values()}))
del keys[1]                              # only now may the old key be destroyed
print(open_any(rows[9], b"t/9"))
```

```text
worker died with checkpoint at row 3
second run moved 4 rows
versions left: [2]
b'record 9'
```

The worker died after moving six rows, but its last checkpoint was at row
3, so the second run went over rows 4 and 5 again. They were already in
version 2, so it skipped them, and moved only the four that remained. A job
that re-encrypted rows 4 and 5 a second time would have been harmless here;
one that had decrypted them as version 1 would have failed, which is why
the version check comes before the work. The compare-and-set write is left
out of the toy for brevity; leave it out of a real job and a customer's
update made during the migration can vanish.

What to do:

- Turn on automatic rotation of KEKs in your KMS. With envelope
  encryption it costs nothing, and auditors ask for it.
- Put a format version and a key identifier at the front of every stored
  ciphertext, from the first day.
- Before you need it, write and test the re-encryption job: readers accept
  both versions, writers switch, the job is idempotent, checkpointed and
  verified, and old keys are destroyed only after a scan.
- When a DEK or a long-lived table key leaks, rewrapping is not enough:
  re-encrypt the data.

## 14.6 Deterministic encryption and what it leaks

*Level: intermediate.*

Encrypted columns break the oldest operation in a database: finding a row
by value. `SELECT * FROM patients WHERE ssn = ?` needs the database to
compare the stored value with the query, and if every encryption of the
same SSN is different, as it is with a randomized AEAD, the database
cannot. The obvious fix is **deterministic encryption**: encrypt so that
equal plaintexts give equal ciphertexts. Encrypt the query value the same
way, and the database compares ciphertexts with an ordinary index.

Deterministic encryption can be done well. SIV mode (Rogaway and
Shrimpton, 2006; AES-SIV is RFC 5297) derives the nonce from a MAC of the
plaintext and the associated data, so the same inputs always give the same
output and nothing but equality leaks: an attacker learns which rows are
equal, and nothing about any value beyond that. SQL Server's Always
Encrypted (2016) offers a deterministic mode built the same way, with the
IV taken from an HMAC of the value, alongside a randomized mode.

What "nothing but equality" means in a real column is the problem. A column
holds values drawn from a distribution, and the distribution is often
public. Equal ciphertexts form groups, the sizes of the groups are the
frequencies of the values, and frequencies can be matched against the
public distribution exactly as Arab scholars matched letter frequencies in
the ninth century ([Cryptanalysis chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md)).
Adobe's password column was a deterministic encryption, and it fell this
way.

**Break it.** A hospital encrypts its patients' blood types
deterministically, so that it can find donors by type. The attacker who
steals the column has no key, only the ciphertexts and a public table of
blood-type frequencies:

```python
import hashlib, hmac, random, secrets
from collections import Counter

# Deterministic stand-in (SIV-style): the nonce is a MAC of the plaintext,
# so equal plaintexts give equal ciphertexts. That is the whole point of it,
# and the whole problem with it.
def det_seal(key, pt):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"siv", "sha256")
    iv = hmac.digest(mk, pt, "sha256")[:16]
    ks = b"".join(hmac.digest(ek, iv + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    return iv + bytes(a ^ b for a, b in zip(pt, ks))

# US blood-type shares (percent), the kind of table anyone can look up
public = {"O+": 37.4, "A+": 35.7, "B+": 8.5, "O-": 6.6,
          "A-": 6.3, "AB+": 3.4, "B-": 1.5, "AB-": 0.6}

rng = random.Random(2015)            # made-up patients; random is fine for test data
patients = rng.choices(list(public), weights=list(public.values()), k=2000)
key = secrets.token_bytes(32)
column = [det_seal(key, t.encode()) for t in patients]    # what the attacker stole

# The attack: rank ciphertexts by count, rank blood types by public share, pair them.
by_count = [c for c, _ in Counter(column).most_common()]
by_share = sorted(public, key=public.get, reverse=True)
guess = dict(zip(by_count, by_share))
right = sum(guess[c] == t for c, t in zip(column, patients))
print(len(set(column)), "distinct ciphertexts;", right, "of", len(patients), "rows recovered")
```

```text
8 distinct ciphertexts; 1722 of 2000 rows recovered
```

The attacker labeled 86% of the patients correctly by counting. The
errors are all in one place: A-negative (6.3% of the US population) and
O-negative (6.6%) are close in frequency, and in this sample of 2,000 the
smaller one happened to come out ahead, 142 to 136, so their labels were
swapped. Every other type was ranked correctly. A column with a skewed
distribution and few values (sex, blood type, a yes/no field, a country, a
diagnosis code) is close to plaintext under deterministic encryption.

!!! note "Life story: CryptDB"
    **Born:** Raluca Ada Popa, Catherine Redfield, Nickolai Zeldovich and
    Hari Balakrishnan, MIT, SOSP October 2011 · **Purpose:** run unmodified
    SQL applications over an encrypted database, using "onions" of
    encryption per column: randomized on the outside, peeled by a proxy to
    deterministic, order-preserving, homomorphic or search layers when a
    query needs them · **Helped:** showed the idea was practical (26% lower
    throughput on the TPC-C benchmark, and 99.5% of the columns in a trace
    of 126 million real queries supported); inspired encrypted-query
    features in industry; and, by making the trade-off concrete, prompted
    the inference attacks of 2015 that measured what the weaker layers leak
    · **Status:** a research system, not maintained; its lesson is now
    usually cited the other way round: each layer leaks what its query
    needs

### The attacks on real records

In 2015 Muhammad Naveed, Seny Kamara and Charles Wright tested
property-preserving encryption, the deterministic and order-preserving
layers of CryptDB-style systems, against real data: hospital discharge
records of 200 US hospitals from a public federal database. The attacker
had a stolen encrypted database and public auxiliary data, such as
statistics from other hospitals or an earlier year. With frequency
analysis and with sorting, and with attacks phrased as optimization
problems, they recovered deterministically encrypted attributes such as
sex, race and mortality risk for more than 60% of the patient records at
more than 60% of the hospitals, and order-preserving attributes such as
age and disease severity for more than 80% of the records at 95% of the
hospitals. Their paper was presented at ACM CCS 2015 and ended a period in
which such systems were sold as safe for medical data.

Two details of that work are worth keeping. First, the attacks needed no
queries and no access to the running system: a snapshot of the encrypted
database and public statistics were enough, which is exactly what a
database thief has. Second, the leakage was not a bug in any scheme; each
scheme leaked precisely what its definition said it would. The definitions
were right and the threat model was wrong for the data.

### When deterministic encryption is acceptable

Deterministic encryption fits values that are close to unique and drawn
from a large space: email addresses, account numbers, national ID numbers.
Each value then appears once or a few times, so the frequency profile
carries little, and the attack above has nothing to count. Even there it
leaks which rows share a value, which can be sensitive (two patients with
the same home address), and it lets anyone who can get the system to
encrypt a value of their choice test a guess. It does not fit
low-cardinality or skewed columns, and it never fits passwords, which
should be hashed with a password hash and a salt.

What to do:

- Use randomized AEAD for every encrypted column unless the application
  must look rows up by that exact value.
- When equality lookups are needed, prefer a keyed blind index (§14.7)
  over deterministic encryption of the value; when you do use
  deterministic encryption, use SIV mode with the column address as
  associated data.
- Never encrypt low-cardinality or skewed columns deterministically.
  Count the distinct values first.
- Assume the attacker has public statistics about your data. In medical,
  financial and demographic data, they do.

## 14.7 Searching encrypted data: blind indexes

*Level: intermediate.*

A **blind index** separates the two jobs that deterministic encryption
mixes. The value is encrypted with a randomized AEAD, as every value should
be. Next to it, in its own column, the application stores a keyed hash of
the value, computed with a separate index key. To look a row up, the
application computes the same keyed hash of the query value and asks the
database for rows whose index column matches. The database indexes the
hash column like any other and never sees a value or a key. Paragon
Initiative's CipherSweet library (2018) popularized the name and the
design for PHP and other languages; MongoDB, SQL Server and several
commercial products use variants of the same idea.

The word that matters is *keyed*.

**Break it.** A team encrypts patients' birth dates properly but, to search
by date, stores SHA-256 of the date next to each one:

```python
import datetime, hashlib, random

# BROKEN: a "blind index" made with a plain hash. The birth date column is
# encrypted properly, but next to it sits SHA-256 of the same date.
rng = random.Random(7)
start = datetime.date(1920, 1, 1)
births = [start + datetime.timedelta(days=rng.randrange(33000)) for _ in range(5000)]
index = [hashlib.sha256(d.isoformat().encode()).hexdigest() for d in births]

# The attacker hashes every date from 1900 to 2025: about 46,000 hashes.
table = {}
d = datetime.date(1900, 1, 1)
while d <= datetime.date(2025, 12, 31):
    table[hashlib.sha256(d.isoformat().encode()).hexdigest()] = d
    d += datetime.timedelta(days=1)
found = sum(table.get(h) == b for h, b in zip(index, births))
print(len(table), "hashes computed;", found, "of", len(births), "birth dates recovered")
```

```text
46021 hashes computed; 5000 of 5000 birth dates recovered
```

Every birth date came back, from 46,021 hashes that took well under a
second. A hash of a value from a small space is not a secret; it is a
lookup table away from the value. The same holds for anything with fewer
than about $2^{40}$ possible values: phone numbers, postal codes, US Social
Security numbers ($10^9$ values, a few minutes on one GPU), card numbers
once the issuer prefix and check digit are known, and most names. Salting
does not rescue an index, because an index needs every row with the same
value to have the same hash.

**Fix it.** Compute the index with HMAC under a key that is kept like any
other key (in the KMS, separate from the encryption key, one per column),
normalize the value first so that the same value always gives the same
index, and **truncate** the result on purpose so that each index value is
shared by many rows. The application fetches the candidate rows, decrypts
them and keeps the ones that really match.

```python
import hashlib, hmac, unicodedata

# Its own key, never the encryption key. Fixed here so the output repeats;
# a real one comes from the KMS like any other key.
INDEX_KEY = hashlib.sha256(b"demo blind-index key").digest()

def normalize(email):                    # one spelling per value, or searches miss
    return unicodedata.normalize("NFC", email.strip()).lower()

def blind_index(email, bits=12):         # FIXED: keyed, and cut short on purpose
    full = hmac.digest(INDEX_KEY, b"users.email:" + normalize(email).encode(), "sha256")
    return int.from_bytes(full, "big") >> (256 - bits)

# 100,000 rows; only the index column is shown, the encrypted emails sit beside it
emails = ["user%d@example.com" % i for i in range(100000)]
idx = {}
for row, e in enumerate(emails):
    idx.setdefault(blind_index(e), []).append(row)

hits = idx.get(blind_index("  User4242@Example.com "), [])
print(len(hits), "candidate rows; the right one among them:", 4242 in hits)
sizes = [len(v) for v in idx.values()]
print(len(idx), "index values in use; rows per value from", min(sizes), "to", max(sizes))
```

```text
25 candidate rows; the right one among them: True
4096 index values in use; rows per value from 9 to 49
```

With 12 bits and 100,000 rows, each index value matches 9 to 49 rows, so a
lookup decrypts about 25 candidates instead of scanning 100,000, and the
index column no longer says which rows are equal: two rows sharing an
index value are probably different people. Truncation is a dial. More bits
mean fewer false positives and more leakage; fewer bits mean more
decryption per query and less leakage. CipherSweet's documentation gives a
rule for choosing it from the number of rows, so that every index value is
expected to cover at least two rows.

The limits of a blind index:

- **It is still an equality index.** Untruncated, it leaks exactly what
  deterministic encryption leaks (§14.6). Truncation blurs the frequency
  profile but does not remove it: a value held by 20% of the rows still
  makes its bucket stand out.
- **The index key is a weak point.** An attacker who gets the database and
  the index key can run the dictionary attack above against the HMAC, and
  for low-entropy fields that recovers values the encryption key still
  protects. Keep index keys in the KMS and do not index low-entropy fields
  at all if you can avoid it.
- **Queries leak too.** Someone watching the database sees which index
  values are searched, how often and which rows come back. Repeated queries
  for the same value are visible.
- **Only exact matches.** Prefix, substring, range and fuzzy search need
  more indexes, and each one leaks more (an index on the first three
  letters of a surname, an index on the birth year alone).

### Searchable encryption and its leakage

Cryptographers have studied the general problem since Song, Wagner and
Perrig's scheme of 2000. **Searchable symmetric encryption** (SSE), defined
carefully by Curtmola, Garay, Kamara and Ostrovsky in 2006, lets a client
store an encrypted index of keywords and send search tokens that let the
server find matching documents without learning the keywords. The schemes
are proved secure *up to a leakage function*: the server learns the
pattern of which queries repeat (search pattern) and which documents each
query returns (access pattern), and nothing else.

That leakage turned out to be a lot. Islam, Kuzu and Kantarcioglu (NDSS
2012) recovered the keywords of encrypted queries over an email corpus from
the access pattern and knowledge of how often words co-occur. Cash, Grubbs,
Perry and Ristenpart (CCS 2015) named such attacks **leakage-abuse
attacks** and gave simpler and stronger ones, including recovery from the
number of documents each query returns. Zhang, Katz and Papamanthou
(USENIX Security 2016) showed **file-injection attacks**: a server that can
get the client to store a few chosen documents, for example by emailing
them to a user whose mail is indexed, can recover queried keywords with a
small number of injected files. Products have since shipped with these
results in view: MongoDB's Queryable Encryption, generally available in
2023 and based on work by Seny Kamara and Tarik Moataz, documents the
leakage it accepts. Choose such a system by reading what it leaks, not by
whether it says "encrypted".

What to do:

- Index with HMAC under a dedicated, KMS-held key per column; never with an
  unkeyed hash, and never with the encryption key.
- Normalize values (case, whitespace, Unicode form) the same way when
  writing and when searching.
- Truncate the index so that each value covers several rows, and filter
  candidates after decrypting.
- Do not build blind indexes on low-entropy fields unless the field's
  leakage is acceptable. Ask whether the search is needed at all.

## 14.8 Order-preserving encryption

*Level: intermediate.*

Range queries (`WHERE age BETWEEN 40 AND 49`, `ORDER BY admitted_at`) need
the database to compare values. **Order-preserving encryption** (OPE) makes
ciphertexts sort in the same order as their plaintexts, so the database's
ordinary index answers range queries over ciphertexts. Agrawal, Kiernan,
Srikant and Xu proposed a scheme in 2004, Boldyreva, Chenette, Lee and
O'Neill gave the first formal treatment at EUROCRYPT 2009, and CryptDB used
their scheme for its order layer. **Order-revealing encryption** (ORE)
generalizes it: the ciphertexts need not be numbers in order, as long as a
public function compares two of them (Boneh and colleagues, 2015; a
practical scheme by Chenette, Lewi, Weis and Wu, 2016).

Boldyreva and colleagues proved that their OPE was as secure as an OPE can
be: a random order-preserving function. They also showed what that means:
such a function leaks roughly the top half of the bits of each plaintext.
Order itself is a great deal of information. In a column where most
possible values occur (ages, dates, small amounts), order is the value.

**Break it.** A toy OPE, enough to show the leak: each age maps to a
running sum of secret, key-dependent gaps. The attacker sees only the
ciphertexts:

```python
import hmac, random, secrets

# A toy order-preserving scheme: each age maps to a running sum of secret,
# key-dependent gaps, so a < b always gives E(a) < E(b). Real OPE schemes
# (Boldyreva et al. 2009) are cleverer and leak in the same way.
key = secrets.token_bytes(32)
table, total = {}, 0
for age in range(0, 121):
    total += 1 + int.from_bytes(hmac.digest(key, bytes([age]), "sha256")[:3], "big")
    table[age] = total

rng = random.Random(42)                          # made-up admissions, ages 18 to 90
ages = [min(90, max(18, int(rng.gauss(55, 18)))) for _ in range(3000)]
column = [table[a] for a in ages]                # what the attacker stole

# The attack: sort the distinct ciphertexts. If every age from 18 to 90
# occurs, the k-th smallest ciphertext is age 18 + k.
distinct = sorted(set(column))
guess = {c: 18 + k for k, c in enumerate(distinct)}
right = sum(guess[c] == a for c, a in zip(column, ages))
print(len(distinct), "distinct ciphertexts;", right, "of", len(ages), "ages recovered exactly")
```

```text
73 distinct ciphertexts; 3000 of 3000 ages recovered exactly
```

The attacker never needed the key. With all 73 ages from 18 to 90 present,
the k-th smallest ciphertext is the k-th smallest age, and sorting gave
every patient's age exactly. When not every value occurs, the
**cumulative attack** of Naveed, Kamara and Wright does nearly as well: a
ciphertext's position among all ciphertexts (its percentile) is matched to
the value at the same percentile of a public distribution. That is how
their 2015 attack recovered ages and severity scores for more than 80% of
the records at 95% of the hospitals.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A ladder of encrypted column types from randomized AEAD to plaintext, with what each one shows to someone holding the column" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">What the stolen column shows</text>
<rect x="20" y="40" width="40" height="30" fill="currentColor" opacity="0.06"/>
<rect x="20" y="40" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="80" y="60">randomized AEAD: the number of rows and the lengths</text>
<rect x="20" y="80" width="140" height="30" fill="currentColor" opacity="0.14"/>
<rect x="20" y="80" width="140" height="30" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="100">truncated blind index: blurred frequencies</text>
<rect x="20" y="120" width="260" height="30" fill="currentColor" opacity="0.22"/>
<rect x="20" y="120" width="260" height="30" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="300" y="140">deterministic: equality, exact frequencies</text>
<rect x="20" y="160" width="420" height="30" fill="currentColor" opacity="0.32"/>
<rect x="20" y="160" width="420" height="30" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="460" y="180">OPE / ORE: + order,</text>
<text x="460" y="196">about half the bits</text>
<rect x="20" y="206" width="600" height="30" fill="currentColor" opacity="0.45"/>
<rect x="20" y="206" width="600" height="30" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="320" y="226" text-anchor="middle">plaintext: everything</text>
</svg>
<figcaption>Figure 14.5. The leakage ladder. Each step down lets the database do more (look up, sort, compare ranges) and shows a thief more. On dense or skewed columns, the deterministic and order-preserving steps are close to the bottom one.</figcaption>
</figure>

Later work went further. Grubbs, Sekniqi, Bindschaedler, Naveed and
Ristenpart (IEEE S&P 2017) attacked the order-revealing schemes used in
practice, on a database of customer records, and recovered 99% of first
names, 97% of last names and 90% of birth dates. Durak, DuBuisson and Cash
(CCS 2016) showed that some ORE schemes leak more than order, such as how
far apart two values are. And even an ideal encrypted range index, one
that hides the values entirely and leaks only which records each query
returns, falls to **reconstruction attacks**: Kellaris, Kollios, Nissim and
O'Neill (CCS 2016) showed that the answers to enough range queries
reconstruct the values, and Lacharité, Minaud and Paterson (IEEE S&P 2018)
cut the number of queries needed to about $N \log N$ for a domain of $N$
values when the data are dense: for ages, a few hundred observed queries.

What to do:

- Do not use order-preserving or order-revealing encryption on sensitive
  columns. Treat it as storing the value with some noise.
- If range queries over a sensitive value are essential, coarsen first:
  index the year of birth (or the age band) with a blind index and filter
  the rest after decrypting.
- If a product offers encrypted range queries, read its leakage
  documentation and the attacks above before trusting it, and keep the
  query stream away from anyone who might watch it.

## 14.9 Tokenization and format-preserving encryption

*Level: intermediate.*

Card payments created the largest market for protecting single fields, and
a standard to enforce it. The **Payment Card Industry Data Security
Standard** (PCI DSS), first published in December 2004 by the card brands
and run since 2006 by the PCI Security Standards Council, requires every
business that stores, processes or transmits card numbers (primary account
numbers, PANs) to protect them, and its requirement to "render PAN
unreadable anywhere it is stored" (3.4 in older versions, 3.5.1 in version
4.0 of March 2022) lists the accepted ways: strong cryptography with key
management, truncation, index tokens, and keyed one-way hashes of the
whole PAN (keyed, not plain, has been mandatory since 31 March 2025, for
the reason §14.7 showed). PCI DSS applies to every system that stores, handles
or can reach card data, so the cheapest way to comply is to have fewer such
systems. That is the main business case for tokenization.

A **token** is a stand-in value with no mathematical relation to the PAN.
A **token vault**, a small, isolated, heavily audited service, generates a
random token for each PAN, stores the pair (the PAN encrypted), and gives
the PAN back only to the few services that need it, such as the one that
talks to the payment network. Everything else, the order database, the
analytics warehouse, the support tool, stores only tokens and falls out of
the scope of most PCI requirements. The PCI Security Standards Council
published tokenization guidelines in August 2011 that set out what a vault
must do.

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

def luhn_ok(digits):
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch) * (2 if i % 2 else 1)
        total += d - 9 if d > 9 else d
    return total % 10 == 0

class Vault:
    def __init__(self):
        self._enc_key = secrets.token_bytes(32)    # in real life: in an HSM
        self._idx_key = secrets.token_bytes(32)
        self._by_token, self._by_pan = {}, {}
    def tokenize(self, pan):
        h = hmac.digest(self._idx_key, pan.encode(), "sha256")
        if h in self._by_pan:                      # same card, same token
            return self._by_pan[h]
        while True:                                # random digits, last four kept,
            tok = "".join(secrets.choice("0123456789") for _ in range(12)) + pan[-4:]
            if not luhn_ok(tok) and tok not in self._by_token:
                break                              # and never a valid card number
        self._by_token[tok] = aead_seal(self._enc_key, pan.encode(), tok.encode())
        self._by_pan[h] = tok
        return tok
    def detokenize(self, tok, caller):
        if caller not in {"payment-service"}:      # the short list that may ask
            raise PermissionError(caller + " may not detokenize")
        return aead_open(self._enc_key, self._by_token[tok], tok.encode()).decode()

vault = Vault()
pan = "4111111111111111"
t = vault.tokenize(pan)
print("last four:", t[-4:], "| passes Luhn:", luhn_ok(t), "| same token again:", vault.tokenize(pan) == t)
print(vault.detokenize(t, "payment-service") == pan)
try:
    vault.detokenize(t, "analytics")
except PermissionError as e:
    print(e)
```

```text
last four: 1111 | passes Luhn: False | same token again: True
True
analytics may not detokenize
```

The token keeps the last four digits, because receipts and support calls
need them, and is chosen so that it fails the Luhn check digit that every
real card number passes; that makes a token impossible to confuse with a
card number, in the vault's own systems or in a scanner looking for leaked
PANs. The same card always gets the same token, through an HMAC index of
the PAN, so that analytics can count repeat customers. The vault stores
each PAN under an AEAD with the token as associated data (§14.4), and its
`detokenize` checks the caller. A real vault adds authentication of callers,
rate limits, an audit log of every detokenization and keys in an HSM.

### Format-preserving encryption

Some systems cannot store a token from a vault because they have no way to
call one, or because a mainframe's 16-digit field must receive something
that looks like a card number from a batch file. **Format-preserving
encryption** (FPE) maps a string of digits to another string of the same
length and alphabet, under a key: nine digits in, nine digits out. It is a
"vaultless" tokenization: anyone with the key can tokenize and detokenize,
with no database of pairs. How FF1 works, with code, is on the
[format-preserving encryption page](../../05-modes-aead/Format-Preserving.md).

NIST approved two FPE methods in SP 800-38G (March 2016), both Feistel
networks with AES as the round function: FF1 (from the FFX design of
Bellare, Rogaway and Spies) and FF3 (from the BPS design of Brier, Peyrin
and Stern).

!!! note "Life story: FF3"
    **Born:** the BPS design of Eric Brier, Thomas Peyrin and Jacques Stern
    (2010), standardized as FF3 in SP 800-38G (2016), an eight-round Feistel
    network with a 64-bit tweak · **Purpose:** fast format-preserving
    encryption of card and ID numbers · **Helped:** showed that small
    domains are where FPE is weakest. F. Betül Durak and Serge Vaudenay
    broke it at CRYPTO 2017 with a slide attack across two tweaks, needing
    about $N^{11/6}$ chosen plaintexts and $N^{5}$ time for a domain of
    $N^2$ values; NIST said on 12 April 2017 that FF3 was "no longer
    suitable as a general-purpose FPE method". The 2019 draft of SP 800-38G
    Rev. 1 patched it as FF3-1, with a 56-bit tweak and a minimum domain of
    one million values; Tim Beyne (CRYPTO 2021) showed a weakness in the
    tweak schedule that affected FF3-1 as well · **Retired:** the second
    draft of SP 800-38G Rev. 1 (February 2025) specifies FF1 only ·
    **Replaced by:** FF1, on domains of at least a million values

FPE has the weaknesses of deterministic encryption (§14.6), since equal
inputs under the same tweak give equal outputs, and some of its own. It
has no integrity: every digit string decrypts to some valid-looking
number. And on small domains, a short PIN, a 4-digit year, a two-letter
state code, anyone who can call encrypt can build the whole table; the
million-value minimum is there because attacks on FF1 itself also get
cheap on tiny domains (Bellare, Hoang and Tessaro, CCS 2016). Use FPE only
where the format truly cannot change, use FF1, use a per-record tweak where
the format allows one (the card's first six and last four digits are SP
800-38G's own example), and protect the key as carefully as a vault.

What to do:

- Get card numbers out of your systems: use your payment processor's
  tokens, or a vault, so that as few systems as possible ever hold a PAN.
- Make tokens random, distinguishable from real numbers (fail the Luhn
  check), and keep the PANs in the vault under an AEAD with the token as
  associated data.
- Use FPE only for fixed-format fields that cannot hold anything else; use
  FF1, never FF3 or FF3-1, on domains of at least a million values.
- If you hash PANs for matching, use a keyed hash, as PCI DSS 4.0 now
  requires.

## 14.10 The forgotten copies

*Level: beginner.*

A team can encrypt a field perfectly in the database and still leak it,
because the database is rarely the only place the value goes. Between the
browser and the encrypted column, the plaintext passes through request
logs, application logs, error trackers, caches, message queues, search
indexes, analytics events, data warehouses, test environments refreshed
from production, machine-learning training sets, and the backups of all of
these. Each is a copy. Most are made by tools configured for convenience,
and few are encrypted at the application layer.

The real incidents are mostly about passwords, because those are the
values everyone agrees must never be stored, and so they are the ones
people notice. In May 2018 Twitter found that a bug had written users'
passwords, unhashed, to an internal log, and asked all of its more than 330
million users to consider changing them; GitHub reported a similar logging
bug for a small number of users the same month. In March 2019 Facebook said
it had found hundreds of millions of passwords stored readable in internal
systems, some going back to 2012, searchable by thousands of employees. The
Irish Data Protection Commission fined Meta €91 million over it in September
2024. None of these copies came from the code that stored passwords, which
hashed them correctly; they came from code that logged requests.

The defenses are of two kinds. First, **stop the copies**: decide what each
log, trace and event may contain, and redact at the source rather than
filtering later ([Chapter 9](09-APIs-That-Resist-Misuse.md) covers
redaction in logs and crash dumps, and
[Chapter 8](08-Hostile-Input.md) covers core dumps and swap). Encrypt
fields before they enter a queue or a cache, not after they leave it. Give
test environments synthetic data. Second, **check that it worked**, because
it never fully does: plant a **canary**, a made-up record with a value that
appears nowhere else, send it through the real system, and search every
store for it, in all the encodings it might have taken on the way.

```python
import base64, binascii, json, re, secrets, urllib.parse

canary = "canary-" + secrets.token_hex(6)        # a value no real user will ever have

# What the system did with one sign-up, in each place it keeps data.
# The database row itself was encrypted properly; the other copies were not.
profile = {"name": "Test Canary", "ssn": canary}
stores = {
    "database row": b"\x01" + secrets.token_bytes(60),
    "app log": ("DEBUG POST /signup body=" + json.dumps(profile)).encode(),
    "cache": json.dumps({"user:991": profile}).encode(),
    "error tracker": ("GET /lookup?ssn=" + urllib.parse.quote(canary + " ")).encode(),
    "analytics event": base64.b64encode(json.dumps(profile).encode()),
    "nightly backup": b"INSERT INTO users VALUES (991, x'" + secrets.token_hex(30).encode() + b"');",
}

def views(blob):                                 # the canary may be encoded on the way
    text = blob.decode("latin-1")
    yield text
    yield urllib.parse.unquote(text)
    for run in re.findall(r"[A-Za-z0-9+/=]{16,}", text):
        try:
            yield base64.b64decode(run, validate=True).decode("latin-1")
        except (binascii.Error, ValueError):
            pass

for name, blob in stores.items():
    leaked = any(canary in v.lower() for v in views(blob))
    print(f"{name:16} {'LEAKS the canary' if leaked else 'clean'}")
```

```text
database row     clean
app log          LEAKS the canary
cache            LEAKS the canary
error tracker    LEAKS the canary
analytics event  LEAKS the canary
nightly backup   clean
```

The database row and its backup hold only ciphertext. The four other
stores hold the canary: in JSON in the log and the cache, URL-encoded in a
query string the error tracker kept, and Base64-encoded in an analytics
event, where a plain text search would have missed it. A real scan runs
over log archives, cache dumps, index snapshots, warehouse tables and
object storage, and runs on a schedule, because new copies appear with
every new tool someone connects.

Backups deserve a paragraph of their own. A backup of an encrypted
database is encrypted, but a backup of the key store is a second copy of
every key, and a backup of a log is a second copy of everything the log
leaked. Backups also outlive the data: a record deleted today is still in
every backup taken before today, for as long as the backups are kept. That
matters for the next section.

What to do:

- List every place a sensitive value goes after the request arrives, and
  name the owner of each copy.
- Redact at the source: log identifiers, not values; keep request bodies
  out of logs by default.
- Encrypt fields before they enter caches and queues; give test
  environments synthetic data.
- Plant canary records and scan all stores for them regularly, decoding
  Base64, URL and hex encodings as you go.

## 14.11 Crypto-shredding and erasure

*Level: intermediate.*

Deleting data is harder than it sounds. A record lives in the primary
database, its replicas, its backups, the logs of its changes, and the
forgotten copies of §14.10. Deleting it everywhere, including from backups
on tapes in another building, is slow and often impossible to prove.
Article 17 of the EU's General Data Protection Regulation (GDPR, applied
since May 2018) gives people a right to have their personal data erased
"without undue delay" in many circumstances, and similar rights exist in
California and elsewhere, so the question is a practical one.

**Crypto-shredding** answers it with keys. Encrypt each person's data
under a key of their own (a per-user DEK or KEK, §14.3). To erase the
person, destroy their key. Every copy of their data, in the database, the
replicas and every backup, becomes ciphertext that nobody can decrypt,
without anyone touching the copies. Destroying one key in a KMS is a
single operation with an audit record, which is much easier to show an
auditor than a sweep through every backup.

It works exactly as far as the key and the plaintext have not been copied
elsewhere:

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

user_keys = {}                                   # one key per user, held by the KMS
def key_for(user):
    return user_keys.setdefault(user, secrets.token_bytes(32))

rows, cache = [], {}
for user, item in [("u1", b"order: tent"), ("u2", b"order: stove"), ("u1", b"order: rope")]:
    rows.append((user, aead_seal(key_for(user), item, user.encode())))
    cache[(user, item)] = item                   # a read-through cache, plaintext

kms_backup = dict(user_keys)                     # last night's backup of the key store

def readable(keys):
    out = []
    for user, blob in rows:
        try:
            out.append(aead_open(keys[user], blob, user.encode()).decode())
        except KeyError:
            pass
    return out

del user_keys["u1"]                              # erase u1: destroy one key
print("from the live keys: ", readable(user_keys))
print("from the key backup:", readable(kms_backup))
print("still in the cache: ", [i.decode() for (u, i) in cache if u == "u1"])
```

```text
from the live keys:  ['order: stove']
from the key backup: ['order: tent', 'order: stove', 'order: rope']
still in the cache:  ['order: tent', 'order: rope']
```

Destroying the live key made user u1's rows unreadable, and two copies
undid it: the backup of the key store, which still held the key, and the
cache, which held plaintext and never needed a key. The limits in full:

- **Key copies.** The key must be destroyed in every copy: KMS backups,
  replicas in other regions, any cached unwrapped DEK. Cloud KMSs schedule
  destruction rather than doing it at once, so that a mistake can be
  undone. AWS KMS waits 7 to 30 days (30 by default) before deleting a key;
  Google Cloud KMS has defaulted to 30 days since February 2024 and says
  that key material is gone from all its systems, backups included, 45 days
  after destruction. Your erasure is complete only after those windows.
- **Plaintext copies.** Caches, logs, search indexes, analytics tables,
  exports and training sets hold plaintext or data derived from it, and
  destroying a key does nothing to them.
- **Shared data.** A message between two users, a joint account, or an
  aggregate over many users does not belong to one key.
- **Time.** Ciphertext kept forever may meet a future break of its
  algorithm, or a quantum computer for the public-key parts of a hybrid
  scheme. With AES-256 and a destroyed key this is remote, but it is why
  some regulators and lawyers do not treat crypto-shredding as the same
  thing as deletion.
- **The law.** No general ruling settles that destroying the key counts as
  erasure under GDPR. The UK's Information Commissioner's Office, for one,
  has accepted that data which cannot be deleted at once, such as data in
  backups, may be put "beyond use" until it expires; crypto-shredding is a
  strong form of that. Record what
  you destroyed, when, and which copies remain until when.

What to do:

- If you may need to erase individuals, give each one a key from the
  start; it cannot be added later to data already encrypted under shared
  keys without re-encrypting it.
- Keep per-user keys only in the KMS, with short-lived caches, so that
  destroying a key reaches every copy within a known time.
- Pair crypto-shredding with deletion of the plaintext copies (§14.10),
  and document the waiting periods of your KMS and backups.

## 14.12 Client-side and end-to-end encryption

*Level: intermediate.*

Every layer so far leaves the server able to decrypt, because the server
holds or can request the keys. **Client-side encryption** moves the key to
the user's device: the server stores ciphertext it cannot read, and a
complete compromise of the server, or a legal order served on its
operator, yields ciphertext. **End-to-end encryption** is the same idea
between users, so that only the sender's and receivers' devices hold the
keys; how messaging does it, with forward secrecy and the double ratchet,
is [Protocols chapter 16](../protocols/16-Signal-and-the-Double-Ratchet.md).
For an application, client-side encryption raises three problems that the
earlier sections did not have.

**Where the key comes from.** If it is derived from a password, the
password's strength and the cost of the password hash are the whole
defense, because a thief of the server's data can guess offline. If it is
random and kept on the device, losing the device loses the data unless
there is a recovery path, and every recovery path (a recovery code, a
second device, a key escrowed in an HSM that releases it only after a
check of the user's PIN, as WhatsApp's end-to-end encrypted backups of 2021
and Apple's iCloud Keychain do) is a door that has to be engineered as
carefully as the encryption.

**What stays in the clear.** The server must still route, store, sort and
bill. Anything it needs for that, it sees: user names, file names, sizes,
times, who shares with whom. Teams decide field by field, and the easiest
mistake is to encrypt the obviously secret field and leave the metadata
around it.

**The server is the attacker.** With client-side encryption, the threat
model includes a malicious or compromised server sending the client crafted
data, and the client's code is often delivered by that same server. A
server that can tamper with ciphertexts, keys or the protocol can attack
the client's cryptography directly.

!!! note "Life story: the LastPass vault theft (2022)"
    **Born:** an intrusion into a developer's environment in August 2022,
    followed by the theft of a backup of customer vault data from cloud
    storage, disclosed 22 December 2022 · **Purpose:** for the attacker, the
    contents of password vaults · **Helped:** showed what client-side
    encryption does and does not cover. Each vault's passwords and notes
    were encrypted with a key derived from the user's master password with
    PBKDF2 (100,100 iterations by default, fewer for some older accounts),
    so the thief had to guess master passwords offline, one vault at a time.
    But the website URLs in each vault were stored unencrypted, telling the
    thief which banks, exchanges and services each user had accounts with,
    and which vaults were worth guessing at · **Status:** later thefts from
    cryptocurrency wallets have been linked by researchers to vaults cracked
    from this backup; the link is reported, not proven in court

**Break it / Fix it.** A vault in the style of the 2022 one, with the key
derived on the device, encrypts only the password field; the fixed one
encrypts each whole entry and pads it, so that the length does not reveal
a short URL from a long one:

```python
import hashlib, hmac, secrets

# A stand-in AEAD, built from HMAC-SHA256 only because Python has no AES:
# a keystream from HMAC, then an HMAC tag over the associated data, the
# nonce and the ciphertext (encrypt-then-MAC). Teaching code; in production
# use AES-GCM or ChaCha20-Poly1305 from a real library.
def aead_seal(key, pt, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n = secrets.token_bytes(16)
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(pt) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(pt, ks))
    return n + ct + hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")

def aead_open(key, blob, aad=b""):
    ek, mk = hmac.digest(key, b"enc", "sha256"), hmac.digest(key, b"mac", "sha256")
    n, ct, t = blob[:16], blob[16:-32], blob[-32:]
    good = hmac.digest(mk, len(aad).to_bytes(4, "big") + aad + n + ct, "sha256")
    if len(blob) < 48 or not hmac.compare_digest(t, good):
        raise ValueError("cannot open")
    ks = b"".join(hmac.digest(ek, n + i.to_bytes(4, "big"), "sha256") for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, ks))

import json

# The key is made on the user's device from the master password and never sent.
salt = secrets.token_bytes(16)
key = hashlib.pbkdf2_hmac("sha256", b"correct horse battery staple", salt, 600_000)

entries = [{"url": "https://bank.example/login", "user": "jo", "pw": "x9!Lq2"},
           {"url": "https://clinic.example/patient", "user": "jo", "pw": "Tr0ub4"}]

# BROKEN: only the password field is encrypted; the server keeps the rest.
broken = [{"url": e["url"], "user": e["user"],
           "pw": aead_seal(key, e["pw"].encode()).hex()} for e in entries]
print("server sees:", [(b["url"], b["user"]) for b in broken])

# FIXED: the whole entry is one ciphertext, padded to 256 bytes so that its
# length does not tell a short URL from a long one.
def seal_entry(i, e):
    data = json.dumps(e).encode()
    data += b" " * (256 - len(data) % 256)
    return aead_seal(key, data, b"vault-entry:%d" % i)

fixed = [seal_entry(i, e) for i, e in enumerate(entries)]
print("server sees:", [len(b) for b in fixed], "bytes of noise")
print(json.loads(aead_open(key, fixed[1], b"vault-entry:1"))["url"])
```

```text
server sees: [('https://bank.example/login', 'jo'), ('https://clinic.example/patient', 'jo')]
server sees: [304, 304] bytes of noise
https://clinic.example/patient
```

The broken server knew that this user banks at one place and is a patient
at another, without breaking anything. The fixed one knows the user has
two entries of at most 256 bytes. It still knows how many entries there
are and when they change; hiding that too costs more padding and more
traffic, and most products stop here.

The 600,000 PBKDF2 iterations follow the OWASP recommendation for
PBKDF2-HMAC-SHA256 since 2023; a memory-hard function such as Argon2id is
better where it is available
([Chapter 13](13-Passwords-on-the-Server.md) chooses parameters). In 2022
Matilda Backendal, Miro Haller and Kenneth Paterson showed the third
problem in practice, in the cloud storage service MEGA: a malicious server
could recover a user's RSA private key over a series of logins (512 in
their attack, fewer in later work), and from it decrypt the user's files,
because the client's key encryption was malleable and unauthenticated.
Their paper's title, "MEGA: Malleable Encryption Goes Awry", is the
lesson: client-side encryption needs authenticated encryption everywhere,
including for the keys, because the server is now the adversary. Apple's
Advanced Data Protection (December 2022), which made most iCloud data
end-to-end encrypted on request, shows the third kind of risk: in February
2025 Apple withdrew it for new users in the United Kingdom rather than
build access for the government there.

### Computing on data you cannot see

Three research areas promise more than this chapter's tools, and belong to
[Advanced protocols and privacy](../advanced/index.md). **Homomorphic
encryption** lets a server compute on ciphertexts and return an encrypted
result; fully homomorphic schemes (since Gentry, 2009) can compute
anything, at a cost of several orders of magnitude, and partially
homomorphic ones (Paillier, 1999, for sums) are practical for narrow jobs
such as encrypted totals. **Secure multi-party computation** lets several
parties compute a function of their combined data while each sees only the
result; it runs in production for jobs such as private set intersection
and joint statistics. **Differential privacy** is not encryption at all: it
adds calibrated noise to published statistics so that no individual's
presence can be inferred, and it is the right tool when the goal is
analysis rather than storage. None of the three replaces envelope
encryption for an ordinary application; each is worth knowing about when
someone asks for analytics on data the analysts must not see.

What to do:

- Choose client-side encryption when the server itself, or its operator,
  is in your threat model; accept that the server can then do little with
  the data.
- Encrypt whole records on the client, pad lengths, and list explicitly
  what metadata the server still sees.
- Derive password-based keys with a memory-hard function or a high
  PBKDF2 count, and design the recovery path as a security feature.
- Authenticate everything the client decrypts, keys included, and assume
  the server may send crafted ciphertexts.

## 14.13 Going deeper

*Level: expert.*

**Key commitment.** AES-GCM and ChaCha20-Poly1305 are not *committing*: it
is possible to construct one ciphertext and tag that decrypt validly under
two different keys, to two different plaintexts. Grubbs, Lu and Ristenpart
(CRYPTO 2017) showed why this matters with Facebook Messenger's abuse
reporting: a sender could craft a message that showed one image to the
recipient and a different, innocent one to the moderator who checked a
report. Their name for such messages, **invisible salamanders**, has
stuck. Len, Grubbs and Ristenpart (USENIX Security 2021) turned the same
property into **partitioning oracles**, which test many password guesses
with one decryption query. In envelope encryption the danger is the
multi-recipient message: if a message carries the data key wrapped for
several recipients, a malicious sender can wrap *different* data keys for
different recipients, and each recipient decrypts a different plaintext
from the same ciphertext. The AWS Encryption SDK's key commitment (§14.3)
closes this by putting a hash-based commitment to the data key in the
header, checked before decryption; Albertini, Duong, Gueron, Kölbl, Luykx
and Schmieg (USENIX Security 2022) described the attacks on real formats
and simple fixes. The HMAC-based stand-in in this chapter happens to be
committing, because HMAC-SHA256 is collision resistant, which is one
reason encrypt-then-MAC with a hash-based MAC is sometimes chosen on
purpose.

**Leakage as a definition.** Searchable and property-preserving schemes are
proved secure relative to a leakage function $\mathcal{L}$: the server's
view can be simulated from $\mathcal{L}(\text{data}, \text{queries})$
alone. A proof of this form is a precise statement of what is given away,
and the attacks of §14.6 to §14.8 are all computations on $\mathcal{L}$
plus auxiliary data. Reading a scheme's leakage function, then asking
what an adversary with public statistics can compute from it, is the right
way to evaluate an encrypted database. Recent schemes reduce leakage with
oblivious data structures (ORAM, since Goldreich and Ostrovsky, 1996),
volume hiding and padding, at a cost in bandwidth that grows with the
data.

**How many records per data key?** With a fresh random 96-bit nonce per
message, SP 800-38D limits AES-GCM to $2^{32}$ messages per key, to keep
the chance of a repeated nonce negligible
([Chapter 4](04-Randomness-in-Practice.md)). A DEK per
record or per user stays far below that. A long-lived table key that
encrypts every field update can reach it in a busy system, which is one
more reason to prefer many DEKs, or a nonce-misuse-resistant AEAD such as
AES-GCM-SIV (RFC 8452) for long-lived keys.

**Enclaves in the database.** SQL Server's Always Encrypted with secure
enclaves (2019) lets the database server compute range comparisons and
pattern matches on encrypted columns inside a hardware enclave that holds
the keys, so the rest of the server sees only ciphertext. This trades the
leakage of OPE for trust in the enclave, and enclaves have their own
long list of side-channel attacks ([Chapter 11](11-Hardware-for-Keys.md)).

**Whole-row integrity.** Associated data protects a cell. Protecting a row
(no field swapped with an older version) or a table (no row deleted or
rolled back) needs a signature or MAC over the row with a version counter,
and a commitment over the table, such as a Merkle tree whose root is kept
outside the database. Ledger databases offer this as a product feature;
the cost is that every update touches the commitment.

## Check yourself

??? question "1. A company says its customer database is \"encrypted at rest\". Name two attackers this protects against and two it does not."

    It protects against someone who steals a disk or a storage snapshot,
    and (with TDE) against someone who gets a copy of a backup file. It
    does not protect against SQL injection, against a database
    administrator, or against anyone who steals the application's or a
    server's credentials and reads through the database's normal interface,
    as in the Capital One breach.

??? question "2. Why does envelope encryption use a data key at all, instead of sending each record to the KMS?"

    KMS calls are remote, slow, rate-limited, billed per call, and limited
    to small inputs (4 KB for AWS KMS `Encrypt`, 64 KiB for Cloud KMS).
    Encrypting locally with a data key is fast and handles any size; only
    the small data key goes to the KMS, which keeps the KEK, the policy
    and the audit log.

??? question "3. An application stores each record's wrapped DEK in the same row as the ciphertext and passes no associated data. What can an attacker who can write to the database do?"

    Copy both cells (wrapped DEK and ciphertext) from a victim's row into
    their own and have the application decrypt and show them. Per-record
    keys do not prevent cut-and-paste; binding both the DEK (through the
    KMS encryption context) and the ciphertext (through AAD) to the table,
    column and row does.

??? question "4. Your KMS rotates its key every year. Does that protect you if one record's data key leaked last month?"

    No. Rotation changes the KEK that wraps new data keys; the leaked data
    key still decrypts its record whatever wraps it. You must re-encrypt
    that record (or everything under that key) with a new data key.

??? question "5. Why must the associated data be built from where the application is reading, not from a row ID stored in the ciphertext's header?"

    Because the attacker copies the header along with the ciphertext. If
    the check uses the stored ID, the moved ciphertext still carries the
    ID it was made with and passes; only an address the reader knows
    independently detects the move.

??? question "6. A column of patients' sex is encrypted deterministically. What does a thief of the column learn without the key?"

    Almost certainly every value: there are two or three distinct
    ciphertexts, their counts are the counts of the values, and the
    population's proportions (or other knowledge about a few patients)
    label them. Deterministic encryption leaks exact frequencies, which on
    a low-cardinality column is the data.

??? question "7. A blind index is computed as SHA-256(email). What is wrong, and what is the fix?"

    It is unkeyed, so anyone with the database can hash candidate emails
    (lists of addresses are easy to get) and match them. Use HMAC with a
    dedicated key held in a KMS, normalize the address first, and
    truncate the output so that each index value covers several rows.

??? question "8. Why does order-preserving encryption of an age column give away almost every age?"

    Ages come from a small, dense range, so nearly every value occurs.
    Sorting the distinct ciphertexts lines them up with the sorted ages,
    and the k-th ciphertext is the k-th age; where values are missing, the
    percentile of each ciphertext is matched against a public age
    distribution. No key is needed.

??? question "9. A team proposes FF3-1 to encrypt a four-digit branch code so that it still fits its column. Give two objections."

    FF3 was broken in 2017 and FF3-1 is affected by Beyne's 2021 attack;
    the current draft of SP 800-38G Rev. 1 keeps only FF1. And a
    four-digit field has 10,000 values, far below the one-million minimum:
    anyone who can call encrypt can tabulate the whole domain, and attacks
    on FPE get cheap on small domains. If the code needs protecting, a
    token or a randomized AEAD in another column is better.

??? question "10. A user asks to be erased, and the team destroys the user's key in the KMS. List three places the user's data may still be readable."

    A backup or replica of the key store taken before the destruction (and
    the KMS's own waiting period); caches, logs, search indexes, analytics
    tables or exports holding plaintext or data derived from it; and
    shared records (messages, joint accounts, aggregates) not encrypted
    under that user's key alone.

## What you learned

- Disk encryption and TDE stop thieves of disks, files and backups, not
  anyone who reads through the application or the database; application
  and field-level encryption stop SQL-level attackers, and client-side
  encryption stops the server itself.
- Envelope encryption keeps the KEK in a KMS and encrypts data locally
  with data keys; AWS KMS, Cloud KMS, the AWS Encryption SDK and Tink all
  work this way, with an encryption context or AAD bound to each call.
- Associated data naming the tenant, table, column and row stops
  cut-and-paste of ciphertexts; it does not stop rollback or deletion.
- Rotating a KEK costs nothing per record, or a small rewrap; changing
  data keys needs a versioned, idempotent, checkpointed re-encryption job.
- Deterministic encryption leaks equality and frequencies, order-preserving
  encryption leaks order and about half the bits, and searchable schemes
  leak access patterns; the attacks of 2012 to 2018 recovered most of the
  protected values from real data.
- A blind index must be keyed with its own key and truncated; it still
  leaks some frequency information.
- Tokens from a vault take systems out of PCI DSS scope; FPE (FF1 only, on
  large domains) is for fields whose format cannot change.
- Logs, caches, error trackers, analytics and backups are copies that
  encryption forgets; canary records find them.
- Crypto-shredding erases data by destroying a per-user key, but only as
  far as no copy of the key or the plaintext survives.
- Client-side encryption must cover metadata and authenticate everything,
  because the server is now the adversary.

## Further reading

- Capital One, "Information on the Capital One cyber incident" (29 July
  2019, updated); Office of the Comptroller of the Currency, consent order
  and civil money penalty against Capital One (6 August 2020).
- Adobe customer security alert (3 October 2013); Troy Hunt, Have I Been
  Pwned entry for the Adobe breach; Jeremi Gosney's analysis of the Adobe
  password ciphertexts (November 2013).
- AWS Key Management Service Developer Guide: "AWS KMS concepts"
  (envelope encryption, encryption context), "Rotate AWS KMS keys", and
  "What's new: AWS KMS announces more flexible automatic key rotation" (12
  April 2024).
- Google Cloud KMS documentation: "Envelope encryption", "Additional
  authenticated data", "Key rotation", "Destroy and restore key versions".
- AWS Encryption SDK Developer Guide: "Message format reference",
  "Supported algorithm suites", "Key commitment".
- Google Tink documentation: `KmsEnvelopeAead`.
- Phillip Rogaway and Thomas Shrimpton, "A provable-security treatment of
  the key-wrap problem", EUROCRYPT 2006 (SIV); RFC 5297 (2008), AES-SIV;
  RFC 8452 (2019), AES-GCM-SIV.
- Raluca Ada Popa, Catherine M. S. Redfield, Nickolai Zeldovich and Hari
  Balakrishnan, "CryptDB: protecting confidentiality with encrypted query
  processing", SOSP 2011.
- Muhammad Naveed, Seny Kamara and Charles V. Wright, "Inference attacks
  on property-preserving encrypted databases", ACM CCS 2015.
- Dawn Xiaodong Song, David Wagner and Adrian Perrig, "Practical
  techniques for searches on encrypted data", IEEE S&P 2000; Reza
  Curtmola, Juan Garay, Seny Kamara and Rafail Ostrovsky, "Searchable
  symmetric encryption: improved definitions and efficient constructions",
  ACM CCS 2006.
- Mohammad Saiful Islam, Mehmet Kuzu and Murat Kantarcioglu, "Access
  pattern disclosure on searchable encryption: ramification, attack and
  mitigation", NDSS 2012.
- David Cash, Paul Grubbs, Jason Perry and Thomas Ristenpart,
  "Leakage-abuse attacks against searchable encryption", ACM CCS 2015.
- Yupeng Zhang, Jonathan Katz and Charalampos Papamanthou, "All your
  queries are belong to us: the power of file-injection attacks on
  searchable encryption", USENIX Security 2016.
- Alexandra Boldyreva, Nathan Chenette, Younho Lee and Adam O'Neill,
  "Order-preserving symmetric encryption", EUROCRYPT 2009; Rakesh Agrawal,
  Jerry Kiernan, Ramakrishnan Srikant and Yirong Xu, "Order preserving
  encryption for numeric data", SIGMOD 2004; Nathan Chenette, Kevin Lewi,
  Stephen A. Weis and David J. Wu, "Practical order-revealing encryption
  with limited leakage", FSE 2016.
- Paul Grubbs, Kevin Sekniqi, Vincent Bindschaedler, Muhammad Naveed and
  Thomas Ristenpart, "Leakage-abuse attacks against order-revealing
  encryption", IEEE S&P 2017; F. Betül Durak, Thomas M. DuBuisson and
  David Cash, "What else is revealed by order-revealing encryption?", ACM
  CCS 2016.
- Georgios Kellaris, George Kollios, Kobbi Nissim and Adam O'Neill,
  "Generic attacks on secure outsourced databases", ACM CCS 2016; Marie-Sarah
  Lacharité, Brice Minaud and Kenneth G. Paterson, "Improved
  reconstruction attacks on encrypted data using range query leakage",
  IEEE S&P 2018.
- Paragon Initiative Enterprises, CipherSweet documentation (blind
  indexes and their planning).
- PCI Security Standards Council, *PCI DSS* v4.0 (March 2022) and v4.0.1
  (June 2024); *Information Supplement: PCI DSS Tokenization Guidelines*
  (August 2011).
- SP 800-38G (2016), format-preserving encryption; draft SP 800-38G Rev. 1
  (initial draft February 2019, second draft February 2025).
- F. Betül Durak and Serge Vaudenay, "Breaking the FF3 format-preserving
  encryption standard over small domains", CRYPTO 2017; Tim Beyne,
  "Linear cryptanalysis of FF3-1 and FEA", CRYPTO 2021; Mihir Bellare,
  Viet Tung Hoang and Stefano Tessaro, "Message-recovery attacks on Feistel-based
  format preserving encryption", ACM CCS 2016.
- Regulation (EU) 2016/679 (GDPR), Article 17; Data Protection Commission
  (Ireland), decision on Meta Platforms Ireland Limited (27 September 2024).
- Twitter, "Keeping your account secure" (3 May 2018); Facebook, "Keeping
  passwords secure" (21 March 2019).
- LastPass, "Notice of recent security incident" (22 December 2022, and
  the update of 1 March 2023).
- Matilda Backendal, Miro Haller and Kenneth G. Paterson, "MEGA: malleable
  encryption goes awry", IEEE S&P 2023 (disclosed June 2022); Keegan Ryan
  and Nadia Heninger, "The hidden number problem with small unknown
  multipliers: cryptanalyzing MEGA in six queries and other
  applications", PKC 2023.
- Paul Grubbs, Jiahui Lu and Thomas Ristenpart, "Message franking via
  committing authenticated encryption", CRYPTO 2017; Julia Len, Paul Grubbs
  and Thomas Ristenpart, "Partitioning oracle attacks", USENIX Security
  2021; Ange Albertini, Thai Duong, Shay Gueron, Stefan Kölbl, Atul Luykx
  and Sophie Schmieg, "How to abuse and fix authenticated encryption
  without key commitment", USENIX Security 2022.
- Reference pages: [AEAD](../../05-modes-aead/AEAD.md),
  [key wrapping](../../05-modes-aead/Key-Wrap.md),
  [format-preserving encryption](../../05-modes-aead/Format-Preserving.md),
  [disk encryption](../../05-modes-aead/Disk-Encryption.md).
