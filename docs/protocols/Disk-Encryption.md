# Disk encryption (LUKS2, BitLocker, FileVault)

*Full-disk encryption for laptops and servers. One random volume key
encrypts every sector and never changes; a passphrase, a TPM or a recovery
key only unlocks that key. It protects a device stolen while powered off, not
one that is running or that a thief can tamper with and give back.*

**Standard:** XTS-AES is IEEE 1619 (2007, revised 2018 and 2025) and NIST
SP 800-38E (2010). LUKS1 on-disk format (Fruhwirth, January 2005); LUKS2
(Brož, August 2018; version 1.1.4, June 2025). BitLocker (since Windows Vista)
and FileVault 2 (OS X 10.7 Lion) are proprietary. **Implementations:**
cryptsetup and dm-crypt on Linux (2.8.8, September 2026) with
systemd-cryptenroll, plus BitLocker and FileVault built into Windows and
macOS. cryptsetup also opens BitLocker (since 2.3, 2020) and Core Storage
FileVault 2 volumes (since 2.6, 2022).

## One volume, one algorithm per category

Real output from cryptsetup 2.7.0 (Ubuntu 24.04 in a container, Oct 2026):
`cryptsetup luksFormat` with all defaults on a 32 MiB file, then
`cryptsetup luksDump` (trimmed):

```
Data segments:
  0: crypt
	cipher: aes-xts-plain64
	sector: 4096 [bytes]
Keyslots:
  0: luks2
	Key:        512 bits
	PBKDF:      argon2id
	Memory:     1048576
	Threads:    4
	AF stripes: 4000
	Area length:258048 [bytes]
Digests:
  0: pbkdf2
	Hash:       sha256
	Iterations: 231575
```

| LUKS2 name | Category | Algorithm inside |
|---|---|---|
| `aes-xts-plain64`, 512 bits | [Cipher](../index.md#5-cipher-modes-and-aead) | [AES](../04-symmetric-ciphers/AES.md)-256 in [XTS](../05-modes-aead/Disk-Encryption.md#xts-aes): two 256-bit keys, the 64-bit sector number as tweak, 4,096-byte sectors |
| keyslot `argon2id` | [KDF](../index.md#8-key-derivation-and-password-hashing) | [Argon2id](../08-kdf-password-hashing/Argon2.md) turns passphrase and 32-byte salt into the key for the keyslot area (AES-XTS again): 1 GiB, 4 threads, passes tuned to 2 s |
| `AF stripes: 4000` | [Hash](../index.md#7-hash-functions) | anti-forensic splitter: the 64-byte volume key is spread over 256,000 bytes with [SHA-256](../07-hash/SHA-2.md), and every byte is needed to rebuild it |
| digest `pbkdf2` | [KDF](../index.md#8-key-derivation-and-password-hashing) | [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-[HMAC](../06-mac/HMAC.md)-SHA-256 of the volume key, iterations tuned to 125 ms: tells a right key from a wrong one |
| none | [MAC](../index.md#6-mac) | no integrity: XTS keeps a sector its size, with no room for a tag ([why](../05-modes-aead/Disk-Encryption.md#what-it-is)) |
| none | [Key exchange](../index.md#1-key-exchange) / [Signature](../index.md#2-digital-signatures) | no public-key crypto anywhere in the format |

**Why a new passphrase doesn't re-encrypt the disk.** Only the volume key
touches data; keyslots (32 in cryptsetup's LUKS2, 8 in LUKS1) hold wrapped
copies, so a new passphrase rewrites about 258 KB. But whoever once saw the
volume key, or kept an old header and its passphrase, can read the disk until
`cryptsetup reencrypt` replaces it. BitLocker and FileVault work the same way.

## How unlocking works

1. **Format.** Draw a random volume key; encrypt each sector with AES-XTS
   under it. cryptsetup 2.1 (2019) doubled the default to 512 bits (AES-256);
   BitLocker (since Windows 10 1511) and Core Storage FileVault 2: XTS-AES-128.
2. **Wrap it once per unlock method.** LUKS: one keyslot each. BitLocker:
   the FVEK under a volume master key (VMK) with
   [AES-CCM](../05-modes-aead/AEAD.md#aes-ccm), the VMK once per protector.
   FileVault 2: the volume key under a KEK, the KEK under the passphrase,
   both with [AES key wrap](../05-modes-aead/Key-Wrap.md).
3. **Passphrase or recovery key.** LUKS2 runs Argon2id; FileVault 2 ran
   PBKDF2-HMAC-SHA-256. A BitLocker recovery password is 48 digits in 8
   groups, each a multiple of 11 encoding 16 bits: 128 bits, hashed with
   SHA-256, then 2²⁰ more SHA-256 rounds with a 16-byte salt.
4. **TPM.** The TPM unseals a key only if the measured boot chain (firmware,
   Secure Boot state, boot loader) is unchanged, so the disk opens with no
   prompt; TPM+PIN adds a factor. `systemd-cryptenroll` (systemd 248, 2021)
   adds a keyslot whose secret a TPM2 seals or a FIDO2 key derives.
5. **Check and hand over.** LUKS merges the AF stripes and compares the
   PBKDF2 digest; BitLocker checks the CCM tag. The volume key goes to the
   kernel (dm-crypt) and stays in RAM until the volume is closed.

**Macs with Apple silicon or T2.** The Secure Enclave always encrypts the
internal SSD with AES-XTS under keys tied to the chip; FileVault adds the
user's password to the chain that wraps the volume key.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Cipher (data) | AES-256-XTS (LUKS2 default); XTS-AES-128 (BitLocker default, Core Storage FileVault 2), XTS-AES-256 (BitLocker option); Adiantum without AES instructions | IEEE 1619, SP 800-38E | AES-CBC-ESSIV (cryptsetup before 1.6, 2013); AES-CBC with Elephant diffuser (Vista, 7), plain AES-CBC (Windows 8 to 10 1507) |
| Integrity | none by default; LUKS2 `--integrity` over dm-integrity (XTS plus HMAC-SHA-256, or AEGIS-128 with random IVs), experimental | LUKS2 spec | — |
| Key wrap | AES-XTS over AF stripes (LUKS); AES-CCM, 12-byte nonce, 16-byte tag (BitLocker); AES-KW (FileVault 2) | LUKS2 spec, RFC 3394 | — |
| KDF, passphrase | Argon2id (LUKS2, default since cryptsetup 2.4, 2021); PBKDF2-HMAC-SHA-256 (LUKS1); salted SHA-256 × 2²⁰ (BitLocker) | RFC 9106, RFC 8018 | Argon2i (LUKS2 default 2017–2021); PBKDF2-HMAC-SHA-1 (LUKS1 before cryptsetup 1.7, 2015) |
| Hash | SHA-256 (key digest, AF splitter, header checksum, BitLocker KDF) | FIPS 180-4 | SHA-1 (LUKS1 before 1.7; its digest is 20 bytes) |
| Hardware unlock | TPM 2.0 (BitLocker, systemd-cryptenroll), FIDO2 hmac-secret, PKCS#11 smart cards, Apple Secure Enclave | TCG TPM 2.0, FIDO CTAP2 | — |

**Post-quantum:** the data path is symmetric, so a quantum computer could at
best run Grover's search on the AES key; 512-bit XTS keys (AES-256) are the
hedge. Public keys appear only in optional unlock paths, such as a PKCS#11
card's RSA key (RSA-OAEP since systemd 261, 2026).

## What it protects against

| Attack | What goes wrong | Fix |
|---|---|---|
| Stolen device, powered off | nothing, if a secret is needed: the thief must guess the passphrase through the KDF, or a 128-bit recovery key | that is the job; a long passphrase |
| Unlocked or sleeping machine | the key is in RAM, and the OS serves plaintext to whoever is logged in or runs code | lock, hibernate or shut down |
| Cold boot (Halderman et al., USENIX Security 2008) | DRAM keeps data for seconds to minutes after power-off; BitLocker, FileVault and dm-crypt keys were read back | shut down; pre-boot PIN (a TPM-only boot puts the key back in RAM) |
| Evil maid (Rutkowska, 2009) | an attacker alters the unencrypted boot code and records the passphrase at the next boot | Secure Boot and TPM measurement |
| TPM bus sniffing (2019) | in TPM-only BitLocker the VMK crosses the bus from a discrete TPM chip in the clear | TPM+PIN; firmware TPM |
| bitpixie (CVE-2023-21563) | a PXE soft reboot leaves derived keys in memory; fixed January 2023, but an old, still-signed boot manager can be loaded instead | TPM+PIN; revoking the 2011 boot-manager CA (KB5025885) |
| CrashXTS (CVE-2025-21210) | XTS has no integrity: randomizing chosen registry blocks made hibernation write RAM, keys included, unencrypted | fixed January 2025 |

TPM-only is the default that matters: since Windows 11 24H2, new installs turn
on device encryption that way on most PCs once a Microsoft or work account
signs in, and that account keeps the recovery password.

## Seeing it on your machine

```
cryptsetup --help | tail -12                           # compiled-in defaults: aes-xts-plain64, argon2id, 1 GiB
truncate -s 32M disk.img                               # a throwaway file: no loop device needed
cryptsetup luksFormat disk.img                         # asks for a passphrase twice
cryptsetup luksDump --dump-json-metadata disk.img      # header as JSON, salts in base64
cryptsetup luksDump --dump-volume-key disk.img         # the volume key itself: test files only
cryptsetup bitlkDump bitlocker.img                     # BitLocker cipher, VMK protectors, FVEK
sudo systemd-cryptenroll --tpm2-device=auto /dev/sda2  # add a TPM2 keyslot and token
manage-bde -status C:                                  # Windows: encryption method and protectors
fdesetup status                                        # macOS: is FileVault on
```

- **Python:** the key check from step 5. Press Enter for the volume key from
  the run above; any other key prints `False`.

```python
import base64, hashlib

# digest 0 from `cryptsetup luksDump --dump-json-metadata disk.img`
salt = base64.b64decode("mzpv4vABctbMLBpoPxV4UHzLyXwlJVlsMKLSicKipww=")
stored = base64.b64decode("t2xTAwhBzQdNnMDSHiF0GmlM2xnwVzo7TEZ6suZTMRc=")
iterations = 231575

# "MK dump" from `cryptsetup luksDump --dump-volume-key disk.img`
vk = bytes.fromhex(input("volume key (hex): ") or
                   "6932903efa0fadf02ac4423267568bd0e4265051f9f9d516efd1d2d9b66fe270"
                   "97134dfbfe5901071f13c76bd82050f00cbf91fae128bc8a4ca14dc1d9f3e30c")
digest = hashlib.pbkdf2_hmac("sha256", vk, salt, iterations, len(stored))
print("computed", digest.hex())
print("stored  ", stored.hex())
print("match   ", digest == stored)
```

```
computed b76c53030841cd074d9cc0d21e21741a694cdb19f0573a3b4c467ab2e6533117
stored   b76c53030841cd074d9cc0d21e21741a694cdb19f0573a3b4c467ab2e6533117
match    True
```

`stored` is the `Digest:` line of `luksDump`, and this is the check in LUKS2
spec §4.3. No passphrase is involved: whoever holds the volume key can open
the disk (`cryptsetup open --volume-key-file`).

## See also

- [Disk encryption modes](../05-modes-aead/Disk-Encryption.md): XTS-AES and [Adiantum](../05-modes-aead/Disk-Encryption.md#adiantum) in depth, and what XTS leaks
- [Argon2](../08-kdf-password-hashing/Argon2.md) / [PBKDF2](../08-kdf-password-hashing/PBKDF2.md): the passphrase step of LUKS2, LUKS1 and FileVault 2
- [Key wrap](../05-modes-aead/Key-Wrap.md) / [AEAD](../05-modes-aead/AEAD.md#aes-ccm): how FileVault 2 and BitLocker wrap their keys
- [age](age.md) / [OpenPGP](OpenPGP.md): encrypting files instead of disks, with a nonce and a tag

## References

- [LUKS2 On-Disk Format Specification](https://gitlab.com/cryptsetup/LUKS2-docs) (version 1.1.4, 2025; Sections 2–4) / [LUKS1 On-Disk Format Specification](https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/docs/on-disk-format.pdf) (version 1.2.3, 2018; 1.0, 2005)
- [cryptsetup](https://gitlab.com/cryptsetup/cryptsetup): release notes `docs/v1.6.0` to `v2.8.8`; `man/cryptsetup.8.adoc`; `meson_options.txt`; `lib/luks2/luks2_digest_pbkdf2.c`, `lib/luks1/af.c`, `lib/bitlk/bitlk.c`, `lib/fvault2/fvault2.c`; `tests/bitlk-images.tar.xz`
- [IEEE 1619](https://standards.ieee.org/ieee/1619/4205/) / [NIST SP 800-38E](https://csrc.nist.gov/pubs/sp/800/38/e/final) / [RFC 3394: AES Key Wrap](https://www.rfc-editor.org/rfc/rfc3394) / [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106)
- [systemd-cryptenroll(1)](https://github.com/systemd/systemd/blob/main/man/systemd-cryptenroll.xml) / [systemd NEWS](https://github.com/systemd/systemd/blob/main/NEWS) (versions 248, 261)
- Microsoft, Win32_EncryptableVolume: [Encrypt](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/SecProv/encrypt-win32-encryptablevolume.md) (defaults by version), [GetEncryptionMethod](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/SecProv/getencryptionmethod-win32-encryptablevolume.md), [ProtectKeyWithNumericalPassword](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/SecProv/protectkeywithnumericalpassword-win32-encryptablevolume.md), [GetKeyProtectorType](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/SecProv/getkeyprotectortype-win32-encryptablevolume.md)
- [Apple Platform Security: Volume encryption with FileVault](https://support.apple.com/guide/security/volume-encryption-with-filevault-sec4c6dc1b6e/web)
- [Halderman et al., "Lest We Remember" (USENIX Security 2008)](https://www.usenix.org/legacy/event/sec08/tech/full_papers/halderman/halderman.pdf) / [Suhanov, CrashXTS](https://dfir.ru/2025/01/20/cve-2025-21210-aka-crashxts-a-practical-randomization-attack-against-bitlocker/) / [Microsoft: Revoking vulnerable Windows boot managers](https://techcommunity.microsoft.com/blog/windows-itpro-blog/revoking-vulnerable-windows-boot-managers/4121735)

*Weaker sources:* Rairii's [list of BitLocker attacks](https://github.com/Wack0/bitlocker-attacks)
(TPM sniffing, bitpixie, CrashXTS); search summaries of pages not reachable
here: Apple Platform Security, Microsoft Learn's OEM BitLocker page and Windows
Latest (Windows 11 24H2), the cold boot paper, CERT-IST (evil maid), KB5025885.
