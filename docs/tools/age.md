# age

*The reference command-line tool for the [age](../protocols/age.md) file
format: `age-keygen` makes keys, and `age` encrypts to them, to SSH keys or to
a passphrase, and decrypts. Filippo Valsorda's Go code; Debian, Ubuntu and
Homebrew package it.*

**Version shown:** age 1.1.1 (Dec 2022, Ubuntu 24.04's package) and, where it
differs, 1.3.2 (Aug 2026, `go install filippo.io/age/cmd/...@latest`), Ubuntu
24.04 in a container, Oct 2026. **Docs:** `age --help`, age(1), age-keygen(1), age-inspect(1)
([sources](https://github.com/FiloSottile/age/tree/v1.3.2/doc), [online](https://filippo.io/age/age.1)), [README](https://github.com/FiloSottile/age/blob/v1.3.2/README.md).

## Keys

```
age-keygen -o key.txt                  # X25519 identity, mode 0600, never overwritten; prints its recipient
age-keygen -y key.txt > recipient.txt  # the age1… recipient again, to hand out
age-keygen -pq -o pq.txt               # 1.3+: ML-KEM-768 + X25519 hybrid (1.1.1: flag provided but not defined)
age-keygen | age -p -o key.age         # identity under a passphrase; -i key.age asks for it
```

```
$ age-keygen -o key.txt
Public key: age103v376q9kg4l74lwe7n2n08ra5hpupmk4nnz7ngs5wa6x6m78pdq4t6aez
```

`key.txt` holds two comment lines and the `AGE-SECRET-KEY-1…` line; `-y`
doesn't read SSH keys. A post-quantum recipient is 1,959 characters, and `-pq`
"might become the default in the future" (age-keygen(1)).

## Encrypt

```
age -r age1… -o file.age file                  # to one recipient; > file.age works too
age -r age1… -r age1… -o file.age file         # several: each one can decrypt alone
age -R recipients.txt -o file.age file         # one per line, # comments; -r and -R repeat and mix
age -R ~/.ssh/id_ed25519.pub -o file.age file  # SSH: ssh-ed25519, or ssh-rsa of 2048 bits or more
age -a -r age1… file > file.age                # armor: PEM "AGE ENCRYPTED FILE", fine on a terminal
age -p -o file.age file                        # passphrase; Enter makes one up: ten words, 110 bits
age -e -i key.txt -o file.age file             # to an identity file's own recipients; needs -e
age -r age1pq1… -r age1pq1… -o file.age file   # 1.3+: post-quantum, never mixed with classic
tar cz dir | age -r age1… > dir.tgz.age        # no INPUT: age reads stdin
curl -sS https://github.com/USER.keys | age -R - -o file.age file   # needs network; tried on a local file
```

```
$ age -r age1pq1… -r age103v376q9kg4l74lwe7n2n08ra5hpupmk4nnz7ngs5wa6x6m78pdq4t6aez file > mix.age
age: error: incompatible recipients: can't mix post-quantum and classic recipients, or the file would be vulnerable to quantum computers
```

SSH keys count as classic, and `-p` can't be combined with `-r`. Without `-a`
or `-o`, age won't write binary to a terminal. `-R` files skip ECDSA SSH keys
with a warning (`-r` rejects them), which suits GitHub's `.keys`; `-R -` reads
stdin, so name the file to encrypt. 1.1.1 reads `age1pq1…` as a plugin
recipient: `exec: "age-plugin-pq": executable file not found in $PATH`.

## Decrypt

```
age -d -i key.txt -o file file.age               # with an identity file; armor is detected
age -d -i ~/.ssh/id_ed25519 file.age > file      # SSH key; asks its passphrase only if it matches
age -d -i key.txt -i ~/.ssh/id_ed25519 file.age  # tried in order, unused ones ignored
age -d file.age > file                           # passphrase file: prompts, and takes no -i
age -d -i key.age file.age > file                # passphrase-protected identity: prompts for it
age -d -i key.txt dir.tgz.age | tar xz           # back out through tar
```

A wrong key gives `no identity matched any of the recipients`. SSH keys in
ssh-agent or on hardware tokens can't decrypt (age(1)).

## Inspect

```
age-inspect file.age    # 1.3+: stanza types, post-quantum or not, sizes; --json for scripts
head -n 3 file.age      # any version, binary files: version line, first stanza
sed '/^---/q' file.age  # the whole header, through the --- MAC line
```

```
$ age-inspect pq.age | sed -n 3,6p
This file is encrypted to the following recipient types:
  - "mlkem768x25519"

This file uses post-quantum encryption.
$ head -n 3 ssh.age
age-encryption.org/v1
-> ssh-ed25519 qkRb2Q TBlRWnOfdoSc4RLMSREtUBBGVAKQL70W32TvKzHmuk4
gP2AKgMpIQeyKF0kUnOMTKDM8UqByTHYRQW9YpDEnjs
```

Each `->` line is one recipient, with the wrapped file key below it. `qkRb2Q`
is the first 4 bytes of the SSH key's SHA-256, the same in every file for that
key; `X25519` stanzas carry no such tag. age-inspect counts a passphrase
(`scrypt`) file as post-quantum, and a YubiKey `piv-p256` one as not.

## Plugins and hardware keys

```
age-plugin-yubikey                                     # set up a PIV slot, write an identity file (not run here)
age-plugin-yubikey --list                              # recipients of the YubiKeys plugged in (not run here)
age -r age1yubikey1… -o file.age file                  # runs age-plugin-yubikey, which must be on PATH
age -d -i age-yubikey-identity-….txt file.age          # plugin and YubiKey, PIN or touch (not run here)
age -r age1tag1… -o file.age file                      # 1.3+: hardware-key recipient, no plugin to encrypt
AGE_PASSPHRASE=… age -e -j batchpass -o file.age file  # -j: a plugin, no identity file; batchpass comes with 1.3
go install filippo.io/age/extra/age-plugin-pq@latest   # age1pq1… recipients for 1.1.1
age-plugin-pq -identity -o pq-plugin.txt pq.txt        # and a -pq identity that 1.1.1 can use with -i
```

A recipient `age1NAME1…` or identity `AGE-PLUGIN-NAME-1…` makes age run
`age-plugin-NAME` from the PATH, and fail without it. `-j` works in 1.1.1 too,
and needs `-e` to encrypt. age-plugin-yubikey 0.5.1 (April 2026) prints
`age1yubikey1…`; its changelog moves to `age1tag1…`, which 1.3 encrypts to on
its own and 1.1.1 hands to `age-plugin-tag`. Decrypting needs the plugin and the YubiKey.

**SOPS and passage.** [SOPS](https://github.com/getsops/sops) edits encrypted
YAML, JSON, ENV, INI and binary files, age being one key type; [passage](https://github.com/FiloSottile/passage)
is the `pass` password store with age in place of GnuPG.

## See also

- [age](../protocols/age.md): the format behind these commands, its stanzas and algorithms, and the post-quantum recipients
- [gpg](../tools/gpg.md) / [OpenPGP](../protocols/OpenPGP.md): signatures, keyrings and algorithm choices, all left out of age
- [ssh-keygen](../tools/ssh-keygen.md): the ed25519 and RSA keys that `-R ~/.ssh/id_ed25519.pub` and `-i ~/.ssh/id_ed25519` use

## References

- age(1), age-keygen(1), age-inspect(1), age-plugin-batchpass(1): [`doc/*.ronn` at v1.3.2](https://github.com/FiloSottile/age/tree/v1.3.2/doc) / [age(1) at v1.1.1](https://github.com/FiloSottile/age/blob/v1.1.1/doc/age.1.ronn) / [README](https://github.com/FiloSottile/age/blob/v1.3.2/README.md) (install, `-pq`, `age-plugin-pq`, GitHub keys)
- age source at v1.3.2: [`cmd/age/age.go`](https://github.com/FiloSottile/age/blob/v1.3.2/cmd/age/age.go) (passphrase words), [`agessh/agessh.go`](https://github.com/FiloSottile/age/blob/v1.3.2/agessh/agessh.go) (SSH key tag), [`internal/inspect/inspect.go`](https://github.com/FiloSottile/age/blob/v1.3.2/internal/inspect/inspect.go) (what counts as post-quantum), [`extra/age-plugin-pq`](https://github.com/FiloSottile/age/tree/v1.3.2/extra/age-plugin-pq) / [changes v1.1.1 to v1.3.2](https://github.com/FiloSottile/age/compare/v1.1.1...v1.3.2) / [releases](https://github.com/FiloSottile/age/releases)
- [C2SP age spec](https://c2sp.org/age) / [age plugin spec](https://c2sp.org/age-plugin)
- [age-plugin-yubikey README](https://github.com/str4d/age-plugin-yubikey/blob/main/README.md) / [CHANGELOG](https://github.com/str4d/age-plugin-yubikey/blob/main/CHANGELOG.md) / [awesome-age](https://github.com/FiloSottile/awesome-age) (plugins and users) / [SOPS README](https://github.com/getsops/sops/blob/main/README.rst) / [passage README](https://github.com/FiloSottile/passage/blob/main/README)
