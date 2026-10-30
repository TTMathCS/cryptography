# SSH (Secure Shell)

*Remote login, Git and file transfer over an encrypted channel. Each connection
picks one algorithm per category from two ordered lists, the client's and the
server's.*

**Standard:** RFC 4251–4254 (2006). **Implementations:** OpenSSH (Linux, macOS,
Windows), PuTTY, libssh, Dropbear, Go `x/crypto/ssh`.

## One connection, one algorithm per category

Real output from `ssh -v git@github.com` on a Mac (OpenSSH 10.5, Oct 2026):

```
debug1: kex: algorithm: ecdh-sha2-nistp256
debug1: kex: host key algorithm: ssh-ed25519
debug1: kex: server->client cipher: aes128-gcm@openssh.com MAC: <implicit> compression: none
```

| SSH name | Category | Algorithm inside |
|---|---|---|
| `ecdh-sha2-nistp256` | [Key exchange](../index.md#1-key-exchange) | Diffie-Hellman on curve P-256, hashed with SHA-256 |
| `ssh-ed25519` | [Signature](../index.md#2-digital-signatures) | Ed25519: the server proves it owns its host key |
| `aes128-gcm@openssh.com` | [Cipher](../index.md#5-cipher-modes-and-aead) | AES-128 in GCM mode |
| MAC `<implicit>` | [MAC](../index.md#6-mac) | built into GCM, so no separate MAC |

**Why P-256 and not post-quantum?** The client's list decides. RFC 4253 says the
chosen algorithm is the first one on the *client's* list that the server also
supports. Apple's build of OpenSSH puts `ecdh-sha2-nistp256` first, while
upstream OpenSSH puts `mlkem768x25519-sha256` first. GitHub supports the
post-quantum one, which shows as soon as you ask for it:

```
$ ssh -v -o KexAlgorithms=mlkem768x25519-sha256 -T git@github.com 2>&1 | grep 'kex: algorithm'
debug1: kex: algorithm: mlkem768x25519-sha256
```

To make it the default, put it at the head of the list in `~/.ssh/config`:

```
Host *
    KexAlgorithms ^mlkem768x25519-sha256
```

## How a connection works

1. Both sides send a version line, such as `SSH-2.0-OpenSSH_10.5`.
2. Each side sends `KEXINIT`: ordered lists for key exchange, host key,
   cipher, MAC and compression.
3. They run the chosen key exchange. The server signs the exchange hash with its
   host key, and the client checks that key against `~/.ssh/known_hosts`.
4. Both derive session keys from the shared secret and the exchange hash
   (RFC 4253 §7.2), send `NEWKEYS`, and switch on encryption.
5. User authentication (RFC 4252): with a key, the client signs data tied to
   this session; passwords also work.
6. Channels (RFC 4254) carry the shell, commands, port forwarding and SFTP.

## Algorithms by category

Upstream OpenSSH 10 lists, preferred first.

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange | `mlkem768x25519-sha256`, `sntrup761x25519-sha512`, `curve25519-sha256`, `ecdh-sha2-nistp256/384/521`, `diffie-hellman-group-exchange-sha256`, `diffie-hellman-group16-sha512` | IETF draft, IETF draft, RFC 8731, RFC 5656, RFC 4419, RFC 8268 | `diffie-hellman-group1-sha1`, `diffie-hellman-group14-sha1`, `diffie-hellman-group-exchange-sha1` (RFC 9142, 2022) |
| Signature (host and user keys) | `ssh-ed25519`, `ecdsa-sha2-nistp256`, `rsa-sha2-512`, `rsa-sha2-256`, `sk-ssh-ed25519@openssh.com` (FIDO keys), `-cert-v01` certificate forms | RFC 8709, RFC 5656, RFC 8332, OpenSSH spec | `ssh-rsa` with SHA-1 (off since 8.8, 2021), `ssh-dss` (removed in 10.0, 2025) |
| Signature, post-quantum | `ssh-mldsa44-ed25519@openssh.com`: experimental, not on by default (10.4, 2026) | IETF draft | — |
| Cipher | `chacha20-poly1305@openssh.com`, `aes128-gcm@openssh.com`, `aes256-gcm@openssh.com`, `aes128/192/256-ctr` | OpenSSH spec, RFC 5647, RFC 4344 | `aes*-cbc`, `3des-cbc`, `blowfish-cbc`, `arcfour` (RFC 8758, 2020) |
| MAC | built into the AEAD ciphers; `hmac-sha2-256-etm@openssh.com`, `hmac-sha2-512-etm@openssh.com`, `umac-128-etm@openssh.com` | RFC 6668, OpenSSH spec | `hmac-md5`, `hmac-sha1` |
| Hash | SHA-256 / SHA-512 named in the key exchange; SHA256 key fingerprints | FIPS 180-4 | MD5 fingerprints (default before 6.8, 2015) |
| KDF | session keys per RFC 4253 §7.2; `bcrypt_pbkdf` for passphrase-protected key files | RFC 4253, OpenSSH `PROTOCOL.key` | old PEM key files (MD5-based) |

`-etm` means encrypt-then-MAC: the MAC covers the ciphertext, the safe order.
The plain `hmac-sha2-256` MACs the plaintext and is kept only for old servers.

## Seeing it on your machine

```
ssh -Q kex                     # every key exchange this ssh knows
ssh -Q cipher
ssh -Q mac
ssh -Q key
ssh -G example.com | grep -E '^(kexalgorithms|ciphers|macs) '   # what it will offer
ssh -v example.com 2>&1 | grep 'kex:'                          # what got picked
```

## Choosing SSH keys

In SSH auth the client proves it holds the private key by signing. Three key
types are common; what matters for SSH is size, speed and how easy each is to
misuse.

| | RSA | ECDSA | Ed25519 |
|---|---|---|---|
| Math | factoring | EC discrete log (NIST curves) | EC discrete log (Curve25519) |
| SSH key type | `ssh-rsa` (signs with SHA-2) | `ecdsa-sha2-nistp256/384/521` | `ssh-ed25519` |
| Typical size | 3072–4096-bit | 256-bit | 256-bit (32-byte key) |
| Security level | ~128-bit at 3072 | ~128-bit at P-256 | ~128-bit |
| Key generation | slow | fast | fast |
| Sign / verify | slow | fast | fastest |
| Per-signature nonce | n/a | needs good RNG | none (deterministic) |
| Compatibility | universal | wide | OpenSSH 6.5+ (2014) |

### RSA

Security rests on the difficulty of factoring a large number. See [RSA](../02-signatures/RSA.md).

- **Sizes:** 2048-bit is the floor (~112-bit security), 3072 gives ~128-bit, 4096
  is the common extra-margin choice. The public key is a long line.
- **Strengths:** works everywhere, including old servers and hardware; decades of
  scrutiny.
- **Weaknesses:** big keys, slow key generation (it must find two large primes),
  slower operations. The legacy `ssh-rsa` *with SHA-1* signatures is deprecated —
  GitHub removed it in 2022, so a usable RSA key signs with SHA-2 (modern OpenSSH
  does this automatically).

### ECDSA

Elliptic-curve [DSA](../02-signatures/DSA.md) over the NIST P-256/384/521 curves. See [ECDSA](../02-signatures/ECDSA.md).

- **Strengths:** small keys, fast, RSA-level security from far fewer bits (256-bit
  ≈ RSA-3072).
- **Weaknesses — why it's not the top pick:**
    - **Nonce dependence.** Every signature needs a fresh random nonce; a weak or
    repeated one lets an attacker recover the private key from the signatures.
    This is a real client-side risk at sign time.
    - **NIST-curve distrust.** P-256's constants come from a seed NIST never
    explained (a 2026 study traced how the seed was made, not why it was
    picked); no proven backdoor, but enough doubt that people avoid it when they can.

### Ed25519

EdDSA over Curve25519. Fixed 32-byte keys, 64-byte signatures. See [Ed25519](../02-signatures/EdDSA.md).

- **Strengths:**
    - **Deterministic** — the nonce comes from the message and key, so ECDSA's
    nonce-reuse key leak cannot happen, even with a broken RNG.
    - Fastest signing/verification and tiny keys (one short line).
    - Constant-time by design; resists timing/side-channel attacks.
    - Transparent curve — no NIST trust question.
- **Weaknesses:** needs OpenSSH 6.5+ (2014); a few legacy servers or old hardware
  tokens may not support it. One security level (~128-bit), which is plenty.
  GitHub and Bitbucket both support it.

### Which to use

**Use Ed25519** — safest, simplest, and what GitHub recommends:

```
ssh-keygen -t ed25519 -C "you@example.com"
```

With a FIDO security key such as a YubiKey, use `ssh-keygen -t ed25519-sk`; the
private key never leaves the key.

Fall back only for a specific reason:

- **RSA-4096** for an old server or device that predates Ed25519 (OpenSSH < 6.5):
  `ssh-keygen -t rsa -b 4096`
- **ECDSA (P-256)** only when policy forces NIST curves (FIPS/government) or a
  hardware token supports ECDSA but not Ed25519.

Order of preference: **Ed25519 → RSA-4096 (compatibility) → ECDSA (compliance only)**.
Avoid DSA and SHA-1 `ssh-rsa` keys — Git hosts no longer accept them.

## See also

- [TLS 1.3](TLS-1.3.md): the same job for the web, but there the server picks
- [Ed25519](../02-signatures/EdDSA.md) / [ECDSA](../02-signatures/ECDSA.md) / [RSA](../02-signatures/RSA.md): the key algorithms in depth
- [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md) / [ECDH](../01-key-exchange/ECDH.md): what the key exchange does
- [Cryptography FAQ](../FAQ.md): key sizes across algorithms, why randomness matters

## References

- [RFC 4253: SSH transport layer](https://www.rfc-editor.org/rfc/rfc4253)
- [RFC 9142: SSH key exchange recommendations](https://www.rfc-editor.org/rfc/rfc9142)
- [RFC 8731: curve25519-sha256](https://www.rfc-editor.org/rfc/rfc8731) / [RFC 8709: Ed25519 keys](https://www.rfc-editor.org/rfc/rfc8709) / [RFC 8332: RSA with SHA-2](https://www.rfc-editor.org/rfc/rfc8332)
- [draft-ietf-sshm-mlkem-hybrid-kex](https://datatracker.ietf.org/doc/draft-ietf-sshm-mlkem-hybrid-kex/)
- [OpenSSH release notes](https://www.openssh.com/releasenotes.html)
- [GitHub: Generating a new SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
