# Encrypting files guide

*Lock a file, a folder or a whole disk so only the right person can open it. Four parts: stop at the one you need.*

[In one minute](#in-one-minute) · [Do it](#do-it) · [Expert](#expert) · [Now and next](#now-and-next)

## In one minute

There are two ways to lock a file:

- **With a password.** You and the reader both know the password. Simple, but you must pass the password on some other way, and a short one can be guessed.
- **With a key pair.** The reader gives you their **public key**; you lock the file with it, and only their **private key** opens it. No shared secret needs to travel. You can lock a file for someone you have never met.

A good tool also **checks the file was not changed**. If even one bit was altered, it refuses to open it, instead of handing back damaged data.

For your own laptop or phone, turn on **whole-disk encryption**. Then a lost or stolen device gives away nothing.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 395" role="img" aria-labelledby="sk-c-hybrid-t"><title id="sk-c-hybrid-t">A file is locked with a fresh random key, and that key is locked with the reader's public key; both travel together</title><defs><filter id="sk-c-hybrid-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-hybrid-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-hybrid-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-hybrid-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-hybrid-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="395" filter="url(#sk-c-hybrid-paper)"/><g filter="url(#sk-c-hybrid-pen)"><text x="30" y="44" class="h">A fast lock for the file, a padlock for its key</text><path class="p room" d="M30 100 L150 100 L150 170 L30 170Z"/><text x="90.0" y="141.0" text-anchor="middle" class="s">your file</text><path class="p gold" d="M30 230 L150 230 L150 280 L30 280Z"/><text x="90.0" y="261.0" text-anchor="middle" class="s">a new random key</text><path class="p " d="M152 135 L260 135" marker-end="url(#sk-c-hybrid-ah)"/><path class="p " d="M152 255 L260 255" marker-end="url(#sk-c-hybrid-ah)"/><path class="p rust" d="M262 100 L412 100 L412 170 L262 170Z"/><text x="337.0" y="135.0" text-anchor="middle" class="s">locked file</text><text x="337.0" y="153.0" text-anchor="middle" class="s">+ a tamper check</text><path class="p room" d="M262 230 L412 230 L412 280 L262 280Z"/><path class="p" d="M328 245 L328 235 Q337 219 346 235 L346 245"/><path class="p rust" d="M322 245 L352 245 L352 267 L322 267Z"/><text x="270" y="300" class="s">the key, locked with the</text><text x="270" y="318" class="s">reader's public key</text><path class="p " d="M414 135 L480 190" marker-end="url(#sk-c-hybrid-ah)"/><path class="p " d="M414 255 L480 210" marker-end="url(#sk-c-hybrid-ah)"/><path class="p room" d="M482 170 L612 170 L612 230 L482 230Z"/><text x="547.0" y="206.0" text-anchor="middle" class="s">send both</text><text x="30" y="360" class="s">Only the reader's private key opens the small padlock, and that gives the file key.</text><text x="30" y="380" class="s">Change one bit of the file and the tamper check refuses to open it.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## Do it

**age**: small, modern, one job ([install](https://github.com/FiloSottile/age#installation); on a Mac, `brew install age`)

```
age-keygen -o key.txt                            # prints "Public key: age1...": give that out, keep key.txt
age -r age1abc... -o notes.txt.age notes.txt     # lock for one reader (repeat -r for more)
age -d -i key.txt -o notes.txt notes.txt.age     # open
age -p -o notes.txt.age notes.txt                # with a passphrase instead (it suggests a strong one)
age -R ~/.ssh/id_ed25519.pub -o n.age notes.txt  # lock with someone's SSH public key
age -d -i ~/.ssh/id_ed25519 n.age                # and open with the SSH private key
tar czf - folder | age -r age1abc... > folder.tar.gz.age   # a whole folder
```

**GnuPG**: the long-standing OpenPGP tool, also used for email and signing

```
gpg --quick-gen-key "Alice <alice@example.com>"  # Ed25519 / Curve25519 keys by default (GnuPG 2.4)
gpg --armor --export alice@example.com > alice.asc         # your public key, to share
gpg --import bob.asc                                        # someone else's
gpg -e -r bob@example.com notes.txt              # writes notes.txt.gpg, for Bob
gpg -d notes.txt.gpg > notes.txt
gpg -c notes.txt                                 # with a passphrase only
```

**Whole disk**

| System | Turn it on |
|---|---|
| macOS | System Settings > Privacy & Security > FileVault |
| Windows 10/11 Pro | BitLocker (Settings, or `manage-bde -on C:`); Home: "Device encryption" |
| Linux | choose "encrypt" when installing (LUKS2); for another disk: `cryptsetup luksFormat /dev/sdX` |
| iPhone, Android | on by default once a passcode is set |

**An encrypted archive** to send to someone without these tools: 7-Zip with AES-256 and a long passphrase sent another way: `7z a -p -mhe=on archive.7z folder` (`-mhe` hides the file names too).

More commands: [age](../tools/age.md), [gpg](../tools/gpg.md).

## Expert

### The algorithms, one per job

| Job | In age | In OpenPGP (RFC 9580) | Avoid |
|---|---|---|---|
| Key exchange to a recipient | X25519; ML-KEM-768 + X25519 with `-pq` | X25519 (v6 keys); ECDH on Curve25519Legacy (GnuPG's v4 keys) | RSA under 3072 bits, ElGamal |
| Passphrase to key | scrypt | Argon2 (v6); iterated-salted S2K (v4) | simple or salted S2K; `openssl enc` without `-pbkdf2` |
| Bulk encryption | ChaCha20-Poly1305 in 64 KiB chunks (STREAM) | AES with OCB or GCM (v6 "SEIPDv2"); AES-CFB + SHA-1 MDC (v4) | CAST5, 3DES, IDEA; packets with no integrity check |
| Signatures | none (age only encrypts; sign with ssh-keygen or minisign) | Ed25519 (v6); EdDSA Legacy (GnuPG v4) | DSA, RSA under 3072 bits |

Disk encryption is a different job (no room for a tag on a fixed-size sector): AES-XTS (IEEE 1619, SP 800-38E) in LUKS2, BitLocker and FileVault; Adiantum on low-end Android phones. See [Disk encryption](../protocols/Disk-Encryption.md).

Standards: age v1 (C2SP spec, post-quantum in v1.1.0, 2025); OpenPGP RFC 9580 (2024), replacing RFC 4880; post-quantum OpenPGP RFC 9980 (2026); GnuPG follows its own LibrePGP draft. Full tables: [age](../protocols/age.md), [OpenPGP](../protocols/OpenPGP.md).

### Implementations

| Tool | Notes |
|---|---|
| **age** (Go, the reference), **rage** (Rust), **typage** (TypeScript) | one format, no options to get wrong; plugins for YubiKeys and TPMs |
| **GnuPG** | the classic OpenPGP tool; also S/MIME (`gpgsm`) and smart cards |
| **Sequoia** (Rust), **OpenPGP.js** (Proton Mail), **RNP** (Thunderbird) | OpenPGP following RFC 9580 |
| **cryptsetup / dm-crypt**, **BitLocker**, **FileVault**, **VeraCrypt** | whole disks and volumes |
| **7-Zip** (AES-256), **Cryptomator**, **gocryptfs** | archives; encrypted folders for cloud drives |

### Common mistakes, and what they cost

| Mistake | What happened |
|---|---|
| **`openssl enc` as a file-encryption tool** | It has no integrity check (an attacker can flip bits in CBC mode undetected), and without `-pbkdf2` it turns the passphrase into a key with a single hash call, so guessing is cheap. Use age or gpg. |
| **Old ZIP encryption ("ZipCrypto")** | Broken since 1994 (Biham and Kocher): knowing about 12 bytes of one file inside is enough to unlock the archive. Choose AES in 7-Zip or WinZip. |
| **Ignoring a failed integrity check** | EFAIL (2018): some mail programs showed decrypted OpenPGP mail even when the integrity check failed, so an attacker could change the ciphertext and get the plaintext sent back to them. Treat any integrity error as "do not open". |
| **Losing the private key or the passphrase** | There is no recovery. Back up the key (on paper, or on a second security key) before you encrypt anything that matters. |
| **Encrypting, then keeping the plain copy** | The original stays on disk, in backups and in sync folders. Encrypt where it is made, or keep the disk itself encrypted. |
| **A disk unlocked when the laptop is stolen** | Disk encryption protects a machine that is off. A sleeping, unlocked laptop gives everything away; shut down when travelling. |
| **Trusting a public key you got from the same place as the file** | Anyone can make a key named "Bob". Check its fingerprint with Bob in person, by phone, or from a source you already trust. |

### Best practices

- age for files, with keys or a generated passphrase; GnuPG when the reader already uses OpenPGP.
- Whole-disk encryption on every laptop and phone, with the recovery key stored somewhere separate (a password manager, or printed).
- A hardware key (YubiKey, a TPM) for the private key when it guards something important.
- Check fingerprints out of band before trusting a public key.
- Encrypt before uploading to a cloud drive (Cryptomator, age), if the provider should not read it.

### Learn it properly

- [Book, chapter 8](../book/08-Modes-of-Operation.md): why "encrypt" alone is not enough and what authenticated encryption adds
- [Book, chapter 11](../book/11-Passwords-and-Key-Derivation.md): how passphrases become keys
- [ChaCha](../04-symmetric-ciphers/ChaCha.md), [AES](../04-symmetric-ciphers/AES.md), [AEAD](../05-modes-aead/AEAD.md), [ECDH](../01-key-exchange/ECDH.md), [HPKE](../03-public-key-encryption/HPKE.md), [scrypt](../08-kdf-password-hashing/scrypt.md): each piece in depth

## Now and next

*Last checked: 4 November 2026.*

- **Post-quantum file encryption is here.** age 1.3.0 and later can make ML-KEM-768 + X25519 keys (`age-keygen -pq`, recipients start `age1pq1`); it is not yet the default. A file locked today may be kept for decades, so this matters more for files than for live connections.
- **OpenPGP split in two.** The IETF's RFC 9580 (2024) and GnuPG's LibrePGP draft define different new formats. Sequoia, OpenPGP.js and RNP follow RFC 9580; GnuPG follows LibrePGP. Old v4 keys still work in both.
- **Post-quantum OpenPGP** is standardized in RFC 9980 (2026), with ML-KEM and ML-DSA.
- **To watch:** [age releases](https://github.com/FiloSottile/age/releases), the IETF OpenPGP working group.
