# ssh-keygen

*OpenSSH's key tool: SSH keys, fingerprints, `known_hosts`, certificates and file signatures.
It comes with OpenSSH on Linux, the BSDs and macOS.*

**Version shown:** OpenSSH 9.6p1 (Ubuntu's `openssh-client`), Ubuntu 24.04 in a container, Oct 2026;
10.6 (6 October 2026) is current. **Docs:** `man ssh-keygen` ([9.6](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/ssh-keygen.1), [10.6](https://github.com/openssh/openssh-portable/blob/V_10_6_P1/ssh-keygen.1)), [release notes](https://www.openssh.com/releasenotes.html).

## Keys

```
ssh-keygen -t ed25519 -C "alice@example.com"          # the default type since 9.5; asks for a path and passphrase
ssh-keygen -t ecdsa -b 256 -f ~/.ssh/id_ecdsa         # P-256; -b 384 or 521 for the other curves
ssh-keygen -t rsa -b 4096                             # 3072 bits without -b
ssh-keygen -t ed25519 -f deploy_key -N '' -C ''       # no passphrase, for scripts; -N 'text' sets one
ssh-keygen -t ed25519 -a 100                          # 100 bcrypt_pbkdf rounds, not the default
ssh-keygen -p -f ~/.ssh/id_ed25519                    # new passphrase; -P old -N new in a script
ssh-keygen -c -C "alice@laptop" -f ~/.ssh/id_ed25519  # new comment
ssh-keygen -y -f ~/.ssh/id_ed25519 > id_ed25519.pub   # the public key again, from the private key
ssh-keygen -t ed25519-sk                              # FIDO security key: a touch per signature
ssh-keygen -t ed25519-sk -O resident -O verify-required -O application=ssh:work   # kept on the key; PIN too
ssh-keygen -K                                         # download resident keys into the current directory
```

The file is an `OPENSSH PRIVATE KEY` ([file formats](../formats/File-Formats.md#how-it-is-built)):
public key in the clear, the rest under AES-256-CTR keyed by [bcrypt_pbkdf](../08-kdf-password-hashing/bcrypt.md),
whose cost grows linearly with `-a`: 24 rounds in 9.6 (its man page says 16), 32 in 10.6. `-sk` keys
need the device (here: `device not found`) and keep their secret in it ([FIDO2](../protocols/FIDO2.md)).
Which type: [SSH](../protocols/SSH.md#choosing-ssh-keys). 9.6 still makes `-t dsa` keys; 10.0 (2025) removed DSA.
10.4 (2026) added `-t mldsa44-ed25519` ([ML-DSA](../02-signatures/ML-DSA.md)-44 with Ed25519), off by
default; 10.6 renamed it `ssh-mldsa44-ed25519` (remake `@openssh.com` keys) and enabled it.
Post-quantum key exchange is `ssh`'s (`mlkem768x25519-sha256`, 10.0) and needs no new keys.

## Fingerprints and known_hosts

```
$ ssh-keygen -l -f id_ed25519.pub                     # -lv adds randomart; a private key works too
256 SHA256:oPe8vCnjhqBXDoym7Jynp/7H4Eq+qLElJZOTx9xy0kg alice@laptop (ED25519)
$ ssh-keygen -l -E md5 -f id_ed25519.pub              # MD5, the default before 6.8 (2015)
256 MD5:46:2d:c3:49:80:77:2d:28:5c:f6:28:bf:03:51:c8:ce alice@laptop (ED25519)
```

```
ssh-keyscan -p 2222 localhost | ssh-keygen -lf -      # a server's host keys (a local sshd here)
ssh-keygen -F host.example.com                        # its lines in ~/.ssh/known_hosts; exit 1 if none
ssh-keygen -R host.example.com                        # delete them after a real key change; '[host]:2222' for a port
ssh-keygen -H                                         # hash every name; known_hosts.old keeps them readable
ssh-keygen -A                                         # create missing /etc/ssh host keys (10.6: and ML-DSA)
ssh-keygen -M generate -O bits=3072 c && ssh-keygen -M screen -f c moduli   # own DH primes: slow, about 50 min here
```

SHA256 hashes the `.pub` line's base64 field: `cut -d' ' -f2 id_ed25519.pub | base64 -d | openssl
dgst -sha256 -binary | base64` gives it plus `=`. `ssh-keyscan` checks nothing: compare with what
the admin publishes. Hashed names (Ubuntu's default) are `|1|salt|HMAC-SHA1(salt, name)`.

## Convert

```
ssh-keygen -e -f id_ed25519.pub                       # RFC 4716 "---- BEGIN SSH2 PUBLIC KEY ----"
ssh-keygen -e -m PKCS8 -f id_ecdsa.pub                # "PUBLIC KEY" for OpenSSL; -m PEM: PKCS#1 for RSA
ssh-keygen -i -m PKCS8 -f ec.pub.pem                  # back to an OpenSSH line; RFC 4716 without -m
ssh-keygen -p -m PEM -f id_rsa                        # private key as "RSA PRIVATE KEY" (EC for ECDSA)
ssh-keygen -p -m PKCS8 -f id_ecdsa                    # or as PKCS#8, which openssl pkey reads
```

OpenSSH's format is the default since 7.8 (2018); `-m PEM` (also with `-t`) is for old libraries.
Encrypted PEM is AES-128-CBC keyed by one MD5, PKCS#8 PBKDF2-SHA256 at 2,048 iterations: under
2 ms a guess here, against 0.2 s for bcrypt_pbkdf at 24 rounds. 9.6 writes Ed25519 in neither
(10.3: PKCS#8) and can't read OpenSSL's (fixed in 9.8).

## Certificates

```
ssh-keygen -s ca -I alice@example.com -n alice,deploy -V +52w id_ed25519.pub   # ca: any key; writes id_ed25519-cert.pub
ssh-keygen -s ca -I web1 -h -n web1.example.com -V +52w ssh_host_ed25519_key.pub   # host certificate
ssh-keygen -s ca -I bob@example.com -n bob -z 42 -V -5m:+1h \
           -O clear -O permit-pty -O source-address=10.0.0.0/8 bob.pub   # an hour, a shell, from 10/8
ssh-keygen -k -f revoked.krl old_key.pub              # a revocation list (KRL); sshd: RevokedKeys
ssh-keygen -k -u -s ca.pub -f revoked.krl krl.spec    # add certificates by "serial: 42" or "id: bob@example.com"
ssh-keygen -Q -f revoked.krl bob-cert.pub             # bob-cert.pub (bob@example.com): REVOKED, exit 1
```

```
$ ssh-keygen -L -f bob-cert.pub | sed -n 7,13p        # what it says; signed at 18:53:27 UTC
        Valid: from 2026-10-30T18:48:27 to 2026-10-30T19:53:27
        Principals:
                bob
        Critical Options:
                source-address 10.0.0.0/8
        Extensions:
                permit-pty
```

Not X.509: one CA signature, no chain. `sshd` takes user certificates with `TrustedUserCAKeys ca.pub`
for the users in `-n` (none: refused); clients trust host ones via `@cert-authority *.example.com
ssh-ed25519 AAAA…` in `known_hosts` (both worked against a local `sshd`). Without `-O clear` a
certificate allows forwarding and a pty; without `-V`, forever.

## Signing files and Git commits

```
echo "alice@example.com namespaces=\"file\" $(cat ~/.ssh/id_ed25519.pub)" >> allowed_signers
ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n file release.tar    # writes release.tar.sig
ssh-keygen -Y verify -f allowed_signers -I alice@example.com -n file -s release.tar.sig < release.tar
ssh-keygen -Y find-principals -f allowed_signers -s release.tar.sig     # who signed: alice@example.com
ssh-keygen -Y check-novalidate -n file -s release.tar.sig < release.tar # a valid signature, by any key
git config --global gpg.format ssh; git config --global user.signingkey ~/.ssh/id_ed25519.pub   # Git 2.34+
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers  # for git log --show-signature
git commit -S -m "Release 1.0"                        # or commit.gpgsign true; git tag -s for tags
```

```
$ ssh-keygen -Y verify -f allowed_signers -I alice@example.com -n file -s release.tar.sig < release.tar
Good "file" signature for alice@example.com with ED25519 key SHA256:oPe8vCnjhqBXDoym7Jynp/7H4Eq+qLElJZOTx9xy0kg
```

The signature covers `SSHSIG`, the namespace and the file's SHA-512 (PROTOCOL.sshsig): a `file` one fails as `git` or a login.

## See also

- [SSH](../protocols/SSH.md) / [FIDO2](../protocols/FIDO2.md): the protocol these keys log in to, choosing a key; `-sk` keys
- [Key and certificate files](../formats/File-Formats.md) / [bcrypt](../08-kdf-password-hashing/bcrypt.md) / [openssl](openssl.md): `OPENSSH PRIVATE KEY` beside PEM and PKCS#8, bcrypt_pbkdf, the tool for those forms
- [Ed25519](../02-signatures/EdDSA.md) / [ML-DSA](../02-signatures/ML-DSA.md): the default key and the post-quantum half of `mldsa44-ed25519`

## References

- ssh-keygen(1) [9.6](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/ssh-keygen.1) / [10.6](https://github.com/openssh/openssh-portable/blob/V_10_6_P1/ssh-keygen.1) / [`sshkey.c`](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/sshkey.c) (`DEFAULT_ROUNDS` 24; [32 in 10.6](https://github.com/openssh/openssh-portable/blob/V_10_6_P1/sshkey.c)) / [ssh-keyscan(1)](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/ssh-keyscan.1) / [sshd_config(5)](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/sshd_config.5) / [`myproposal.h` (10.6)](https://github.com/openssh/openssh-portable/blob/V_10_6_P1/myproposal.h)
- [PROTOCOL.key](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/PROTOCOL.key) / [PROTOCOL.sshsig](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/PROTOCOL.sshsig) / [PROTOCOL.krl](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/PROTOCOL.krl) / [PROTOCOL.certkeys](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/PROTOCOL.certkeys) (to 10.0), now [draft-miller-ssh-cert](https://datatracker.ietf.org/doc/draft-miller-ssh-cert/) / [draft-miller-sshm-mldsa44-ed25519-composite-sigs](https://datatracker.ietf.org/doc/draft-miller-sshm-mldsa44-ed25519-composite-sigs/)
- OpenSSH release notes [6.8](https://www.openssh.com/txt/release-6.8) / [7.8](https://www.openssh.com/txt/release-7.8) / [9.5](https://www.openssh.com/txt/release-9.5) / [9.8](https://www.openssh.com/txt/release-9.8) / [10.0](https://www.openssh.com/txt/release-10.0) / [10.3](https://www.openssh.com/txt/release-10.3) / [10.4](https://www.openssh.com/txt/release-10.4) / [10.6](https://www.openssh.com/txt/release-10.6) ([mirror](https://github.com/openbsd/www/tree/master/openssh/txt))
- [RFC 4716: SSH public key file format](https://www.rfc-editor.org/rfc/rfc4716) / [Git 2.34 release notes](https://github.com/git/git/blob/v2.34.0/Documentation/RelNotes/2.34.0.txt) / OpenSSL 3.0 [`pem_lib.c`](https://github.com/openssl/openssl/blob/openssl-3.0/crypto/pem/pem_lib.c) (`EVP_BytesToKey`, MD5, one round)
