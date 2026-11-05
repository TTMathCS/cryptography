# SSH guide

*Log in to another computer, run Git over SSH, copy files, all through an encrypted channel. Four parts: stop at the one you need.*

[In one minute](#in-one-minute) · [Do it](#do-it) · [Expert](#expert) · [Now and next](#now-and-next)

## In one minute

SSH lets you type on a computer far away as if you sat in front of it. Everything you send is locked so nobody on the way can read or change it.

It uses **two pairs of keys**:

- The **server's key** proves you reached the real server, not an impostor. Your computer remembers it in a file called `known_hosts`.
- **Your key** proves who you are, instead of a password. It has two halves: the **private key** stays on your computer and is never shared; the **public key** goes on every server you log in to.

Think of a padlock you hand out (public) and the only key that opens it (private). You can give padlocks to anyone; you never give the key.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 370" role="img" aria-labelledby="sk-c-sshkeys-t"><title id="sk-c-sshkeys-t">Your computer keeps your private key and the server's public key; the server keeps its private key and your public key; each proves itself to the other</title><defs><filter id="sk-c-sshkeys-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-sshkeys-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-sshkeys-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-sshkeys-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-sshkeys-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="370" filter="url(#sk-c-sshkeys-paper)"/><g filter="url(#sk-c-sshkeys-pen)"><text x="30" y="44" class="h">Two key pairs, two jobs</text><path class="p room" d="M30 110 L200 110 L200 280 L30 280Z"/><text x="115" y="134" text-anchor="middle" class="l">your computer</text><path class="p gold" d="M440 110 L610 110 L610 280 L440 280Z"/><text x="525" y="134" text-anchor="middle" class="l">the server</text><text x="45" y="220" class="s">your private key</text><text x="45" y="240" class="s">(never leaves)</text><text x="45" y="170" class="s">known_hosts:</text><text x="45" y="190" class="s">server's public key</text><text x="455" y="170" class="s">server's private key</text><text x="455" y="220" class="s">authorized_keys:</text><text x="455" y="240" class="s">your public key</text><path class="p " d="M436 160 L204 160" marker-end="url(#sk-c-sshkeys-ah)"/><text x="230" y="150" class="s">“I am the real server”</text><path class="p " d="M204 230 L436 230" marker-end="url(#sk-c-sshkeys-ah)"/><text x="240" y="220" class="s">“and I am really you”</text><text x="30" y="330" class="s">Each side proves itself with its private key; the other checks with the public key</text><text x="30" y="350" class="s">it already holds. No password crosses the network.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## Do it

The commands work on macOS, Linux and Windows 10 or later (OpenSSH is built in).

**Make a key pair** (Ed25519, the default and best choice). Give it a passphrase when asked.

```
ssh-keygen -t ed25519 -C "you@example.com"
```

This writes `~/.ssh/id_ed25519` (private, keep it) and `~/.ssh/id_ed25519.pub` (public, share it).

**Put the public key on a server, or on GitHub**

```
ssh-copy-id -i ~/.ssh/id_ed25519.pub alice@server.example.com   # a server
cat ~/.ssh/id_ed25519.pub                                       # GitHub: paste this under Settings > SSH keys
ssh -T git@github.com                                           # test: "Hi alice! You've successfully authenticated"
```

**Type the passphrase once per session** with the agent

```
eval "$(ssh-agent -s)"; ssh-add ~/.ssh/id_ed25519      # Linux, Windows (Git Bash)
ssh-add --apple-use-keychain ~/.ssh/id_ed25519         # macOS: remembered in the Keychain
```

**Check fingerprints** (compare with what the server's admin or GitHub publishes)

```
ssh-keygen -lf ~/.ssh/id_ed25519.pub                   # 256 SHA256:S+bx... you@example.com (ED25519)
ssh-keygen -R server.example.com                       # forget a server's old key after a real, announced change
```

**Convert key formats**

| From → to | Command |
|---|---|
| OpenSSH private key → PEM (`BEGIN RSA PRIVATE KEY`, old tools) | `ssh-keygen -p -m PEM -f id_rsa` (rewrites the file in place: copy it first) |
| OpenSSH private key → PKCS#8 (what `openssl pkey` reads) | `ssh-keygen -p -m PKCS8 -f id_ecdsa` |
| OpenSSH public key → `BEGIN PUBLIC KEY` (OpenSSL) | `ssh-keygen -e -m PKCS8 -f id_rsa.pub` |
| PEM / PKCS#8 public key → OpenSSH line | `ssh-keygen -i -m PKCS8 -f key.pem` |
| OpenSSH → PuTTY `.ppk` | `puttygen id_ed25519 -O private -o key.ppk` |
| PuTTY `.ppk` → OpenSSH | `puttygen key.ppk -O private-openssh-new -o id_ed25519` |
| Private key → its public key again | `ssh-keygen -y -f id_ed25519 > id_ed25519.pub` |

More commands (certificates, signing Git commits and files, revocation): [ssh-keygen](../tools/ssh-keygen.md).
What is inside each file format: [key and certificate files](../formats/File-Formats.md).

## Expert

### The algorithms, one per job

Every connection picks one algorithm for each job: the first on the client's list that the server also has. Full lists, with what Apple ships: [SSH protocol](../protocols/SSH.md).

| Job | Use | Standard | Avoid |
|---|---|---|---|
| Key exchange | `mlkem768x25519-sha256` (post-quantum hybrid), `sntrup761x25519-sha512`, `curve25519-sha256` | RFC 10042, RFC 9941, RFC 8731 | `diffie-hellman-group1-sha1`, `-group14-sha1`, `-group-exchange-sha1` (RFC 9142) |
| Host and user keys (signatures) | `ssh-ed25519`; `rsa-sha2-512` / `rsa-sha2-256` for old systems | RFC 8709, RFC 8332 | `ssh-rsa` (RSA with SHA-1), `ssh-dss` (DSA) |
| Cipher | `chacha20-poly1305@openssh.com`, `aes256-gcm@openssh.com`, `aes128-gcm@openssh.com` | OpenSSH `PROTOCOL.chacha20poly1305`, RFC 5647 | `*-cbc`, `3des-cbc`, `arcfour` (RFC 8758) |
| MAC (only with non-AEAD ciphers) | `hmac-sha2-256-etm@openssh.com`, `hmac-sha2-512-etm@openssh.com` | RFC 6668 (the HMACs), OpenSSH `PROTOCOL` (the `-etm` order) | `hmac-md5`, `hmac-sha1`, non-`etm` forms |
| Private key file | `OPENSSH PRIVATE KEY`, passphrase through bcrypt_pbkdf | OpenSSH `PROTOCOL.key` | old PEM files (passphrase through one MD5) |
| Host key in DNS | SSHFP records, with DNSSEC | RFC 4255, RFC 6594 | SSHFP without DNSSEC |

The protocol itself: RFC 4251 (architecture), RFC 4252 (user login), RFC 4253 (transport), RFC 4254 (channels); RFC 4716 (public key file).

### Implementations

| Implementation | Where you meet it | Its cryptography |
|---|---|---|
| **OpenSSH** | Linux, BSD, macOS, Windows 10+, most servers | own Ed25519, ChaCha20-Poly1305, Curve25519, sntrup761 and ML-KEM (formally verified code from libcrux); AES, RSA and ECDSA from OpenSSL or LibreSSL |
| **PuTTY** | Windows desktops | its own code for everything |
| **Dropbear** | routers, small devices | its own code with LibTomCrypt |
| **libssh** / **libssh2** | programs that speak SSH (libssh2 in curl and libgit2) | OpenSSL, mbedTLS or libgcrypt |
| **Go** `golang.org/x/crypto/ssh` | Go servers and tools | Go's standard library |
| **Paramiko**, **AsyncSSH** | Python scripts (Ansible uses Paramiko or OpenSSH) | the `cryptography` package (OpenSSL) |
| **Apache MINA SSHD**, **russh** | Java and Rust | Java's JCA / BouncyCastle; RustCrypto |

To see what a server offers and get a graded report, use [ssh-audit](https://github.com/jtesta/ssh-audit) (`ssh-audit server.example.com`).

### Common mistakes, and what they cost

| Mistake | What happened |
|---|---|
| Typing "yes" to a **changed host key** warning without checking | This is exactly what a man-in-the-middle attack looks like. Check the new fingerprint with the admin first. GitHub really did change its RSA host key on 24 March 2023, after it leaked; it announced the new fingerprints. |
| **Agent forwarding** (`ssh -A`) to a server you don't fully trust | Anyone with root there can use your agent to log in as you while you are connected. Use `ssh -J jumphost target` (ProxyJump) instead. |
| A private key with **no passphrase** on a laptop | A stolen laptop or backup is a stolen login. Use a passphrase plus the agent, or a FIDO key (`-t ed25519-sk`). |
| **Password login** left on for an internet server | Bots try passwords all day. Turn it off once keys work. |
| **ECDSA with a weak nonce** | Each ECDSA signature needs a fresh secret random number. PuTTY 0.68–0.80 made biased ones for P-521 keys, so about 60 signatures gave away the private key (CVE-2024-31497, fixed in 0.81, April 2024). Ed25519 can't fail this way. |
| **Weak randomness** when making keys | Debian's OpenSSL (2006–2008) seeded its generator with little more than the process ID, so every key made there was one of about 32,768 per type and size (CVE-2008-0166). |
| Copying `authorized_keys` everywhere and **never removing** old keys | People leave; their keys keep working. Keep a list, or use short-lived [certificates](../tools/ssh-keygen.md#certificates). |
| Not **updating** the server | Terrapin (CVE-2023-48795, Dec 2023) let an attacker quietly delete a message at the start of the encrypted channel: fixed by "strict key exchange" in OpenSSH 9.6, on both sides. regreSSHion (CVE-2024-6387) gave root to anyone on OpenSSH 8.5p1–9.7p1 on glibc Linux: fixed in 9.8 (July 2024). The xz backdoor (CVE-2024-3094, March 2024) reached `sshd` through a compression library on some Linux distributions and was caught just before stable releases. |

### Best practices

**Keys:** Ed25519 with a passphrase, or `ed25519-sk` on a security key. One key per device, so a lost device costs one key. RSA (3072 bits or more) only for systems that predate Ed25519 (OpenSSH before 6.5, 2014).

**Server** (`/etc/ssh/sshd_config`, or a file in `sshd_config.d/`). Test before you restart, and keep a second session open while you do:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password      # or: no
AuthenticationMethods publickey
AllowUsers alice bob
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no                  # unless you need tunnels
KexAlgorithms mlkem768x25519-sha256,sntrup761x25519-sha512@openssh.com,curve25519-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com
HostKeyAlgorithms ssh-ed25519,rsa-sha2-512,rsa-sha2-256
```

```
sudo sshd -t                                   # syntax check: silent when fine
sudo sshd -T | grep -E 'passwordauth|permitroot|kexalg'    # what it will really use
```

On OpenSSH 9.x, drop `mlkem768x25519-sha256` from the list (it came in 9.9; the default in 10.0).

**Client** (`~/.ssh/config`):

```
Host *
    IdentitiesOnly yes          # offer only the key named for each host
    ForwardAgent no
    StrictHostKeyChecking ask
    UpdateHostKeys yes          # accept a server's new key only when its old one vouches for it
Host work
    HostName 10.0.0.5
    User alice
    ProxyJump bastion.example.com
```

**At scale:** an SSH certificate authority (`TrustedUserCAKeys` on servers, `@cert-authority` in `known_hosts`) with certificates valid for hours, not keys that live forever; SSHFP records for host keys; logs sent off the server.

### Learn it properly

- [Book, 19.5 SSH](../book/19-Protocols.md#195-ssh): how the handshake works, step by step, and what went wrong in its history
- [Ed25519](../02-signatures/EdDSA.md), [ECDSA](../02-signatures/ECDSA.md), [RSA](../02-signatures/RSA.md), [ECDH](../01-key-exchange/ECDH.md), [ML-KEM](../01-key-exchange/ML-KEM.md), [ChaCha](../04-symmetric-ciphers/ChaCha.md), [AES](../04-symmetric-ciphers/AES.md): each algorithm in depth
- [FIDO2](../protocols/FIDO2.md): the security keys behind `-sk` keys

## Now and next

*Last checked: 4 November 2026.*

- **Post-quantum key exchange is the default.** OpenSSH has used a hybrid by default since 9.0 (2022, `sntrup761x25519`) and `mlkem768x25519-sha256` since 10.0 (April 2025). A hybrid stays safe if either half holds. It protects today's sessions from being recorded now and decrypted by a future quantum computer. It needs no new keys.
- **Post-quantum signatures are arriving.** OpenSSH 10.4 added an experimental ML-DSA-44 + Ed25519 key type, and 10.6 (October 2026) renamed it `ssh-mldsa44-ed25519` and turned it on, last in the preference list ([ssh-keygen](../tools/ssh-keygen.md#keys)). Signatures matter less urgently than key exchange: a future quantum computer cannot go back and log in to a past session.
- **Standards work** is in the IETF SSH Maintenance (sshm) working group: SSH certificates (draft-ietf-sshm-cert) and composite post-quantum signatures (draft-ietf-sshm-composite-sigs).
- **To watch:** the [OpenSSH release notes](https://www.openssh.com/releasenotes.html) and the [sshm working group](https://datatracker.ietf.org/wg/sshm/about/).
