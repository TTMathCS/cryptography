# gpg

*GnuPG's command-line tool for OpenPGP: keys, encryption, signatures and the
web of trust, with `gpg-agent` holding the secret keys. Linux distributions
ship it; Homebrew's `gnupg` and Gpg4win bring it to macOS and Windows.*

**Version shown:** gpg 2.4.4, Ubuntu 24.04 in a container, Oct 2026; notes on
2.5 (2.5.24, September 2026, is the newest) come from its NEWS, not run.
**Docs:** `man gpg`, [`doc/gpg.texi`](https://github.com/gpg/gnupg/blob/master/doc/gpg.texi),
[NEWS](https://github.com/gpg/gnupg/blob/master/NEWS); packets and algorithm numbers: [OpenPGP](../protocols/OpenPGP.md).

## Keys and smart cards

```
gpg --quick-gen-key "Alice Example <alice@example.org>" default default 2y  # Ed25519 [SC] + Cv25519 [E]
gpg --quick-gen-key "Bob Example <bob@example.org>" future-default default 1y  # the same, in 2.4 and 2.5
gpg --quick-gen-key "Carol Example <carol@example.org>" ed25519 cert 2y     # algo or usage given: primary only
gpg --quick-add-key $CAROL ed25519 sign 1y      # $CAROL is her fingerprint; a signing subkey
gpg --quick-add-key $CAROL cv25519 encr 1y      # an encryption subkey
gpg --full-gen-key                              # menus (RSA, DSA, ECC); no expiry unless set
gpg --list-keys --with-subkey-fingerprints --keyid-format long   # -k; -K for secret keys
gpg --fingerprint alice@example.org             # in groups of four, to read out
gpg --quick-set-expire $ALICE 3y                # primary key; add '*' for every subkey
gpg -o revoke.asc --gen-revoke alice@example.org   # asks a reason: 1 = compromised
gpg --card-status                               # needs a card, and scdaemon (on Ubuntu a separate package)
gpg --edit-key alice@example.org                # key 1, keytocard, save: moves it; back up first (no card here)
```

```
$ gpg --list-keys --with-subkey-fingerprints --keyid-format long
pub   ed25519/B4708AE9FF3ECFAE 2026-10-30 [SC] [expires: 2028-10-29]
      BFAF086DBAF8BAB9C36BC2EDB4708AE9FF3ECFAE
uid                 [ultimate] Alice Example <alice@example.org>
sub   cv25519/2BDDF5872EED82AC 2026-10-30 [E]
      6F021E90BE154B83FA1E9AF72BDDF5872EED82AC
```

[SC] is certify and sign, [E] encrypt, [A] authenticate. It is a v4 key: EdDSA
(22) and ECDH (18) on Curve25519, a SHA-1 fingerprint ([GnuPG split](../protocols/OpenPGP.md#versions-and-the-gnupg-split)).
`--quick-gen-key` expires in 3 years unless told; scripts add `--batch --pinentry-mode
loopback --passphrase …`. Each key's revocation certificate waits in
`~/.gnupg/openpgp-revocs.d/` (a `:` blocks stray imports): copy it off the machine.

## Export and import

```
gpg --export --armor alice@example.org > alice.asc  # public key as text; binary without --armor
gpg --show-keys alice.asc                           # what a key file holds, without importing it
gpg --import alice.asc                              # keys, certifications, revocations
gpg --export-secret-keys --armor alice@example.org > secret.asc     # every secret key: guard it
gpg --export-secret-subkeys --armor alice@example.org > subkeys.asc # no primary: sec# once imported
gpg --export-ssh-key alice@example.org              # newest [A] subkey as an ssh-ed25519 line
gpg --locate-keys bob@example.net                   # keyring, then the domain's WKD (no network here)
```

A secret export is as strong as its passphrase (AES-128, iterated SHA-1 S2K;
none if empty). `sec#` can't certify, nor sign if only the primary has [S].
`--export-ssh-key` wants an [A] subkey: `--quick-add-key $ALICE ed25519 auth`.

## Encrypt and decrypt

```
gpg -e -r bob@example.org msg.txt                        # msg.txt.gpg, binary
gpg -ea -r bob@example.org -r alice@example.org msg.txt  # msg.txt.asc; add yourself to read it later
gpg -c msg.txt                                           # passphrase only; gpg-agent caches it
gpg -o out.txt -d msg.txt.gpg                            # decrypt; to stdout without -o
```

`-e` refused a freshly imported key in batch mode (`There is no assurance this
key belongs to the named user`) until `--lsign-key`. It wrote LibrePGP's OCB
packet (tag 20, AES-256), as every recipient key announces OCB; else CFB with the
SHA-1 MDC. `-c` uses Iterated and Salted S2K: SHA-512 (a Debian patch; upstream
SHA-256 since 2.4.1) over 65,011,712 bytes, the cap, then AES-256 CFB. No Argon2, even in 2.5.

## Sign, verify and trust

```
gpg --clear-sign msg.txt                                 # msg.txt.asc: the text, then the signature
gpg --detach-sign -a msg.txt                             # msg.txt.asc: the signature alone (-b)
gpg --verify msg.txt.asc msg.txt                         # signature first, then the data
gpg -u alice@example.org -s -e -r bob@example.org -o signed.gpg msg.txt   # sign and encrypt
gpg --assert-signer $ALICE --verify msg.txt.asc msg.txt  # exit 0 only for that key (2.4.1+)
gpgv --keyring ./alice.gpg msg.txt.asc msg.txt           # trusts every key in that file, no others
git config --global user.signingkey $ALICE               # Git passes it to gpg -u; git commit -S
gpg --lsign-key alice@example.org                        # after checking her fingerprint: a local certification
gpg --sign-key bob@example.org                           # exportable: gpg --export -a bob@…, send it back
gpg --edit-key alice@example.org trust                   # owner trust: 3 marginal, 4 full, 5 ultimate
```

It ends `gpg: Good signature from "Alice Example <alice@example.org>" [ultimate]`.
That is the maths: on a keyring that hadn't certified Alice it said `[unknown]`
with a `WARNING` and still exited 0, as for any key it holds. Name both files:
given one, gpg guesses the data file, and a clear-signed one proves only its text.
Validity, in brackets, comes from certifications: yours, or one from a fully or
three from marginally trusted keys. `--quick-lsign-key` skips the question.

## Inspect

```
$ gpg --list-packets signed.gpg 2>/dev/null | grep -E 'algo [0-9]|cipher='   # decrypts if it can
:pubkey enc packet: version 3, algo 18, keyid 280EB42EC50935B1
:aead encrypted packet: cipher=9 aead=2 cb=16
:signature packet: algo 22, keyid B4708AE9FF3ECFAE
	digest algo 10, begin of digest 46 51
$ gpg --version | sed -n '/^Pubkey/,/^Hash/p'   # gpg --list-config --with-colons adds the IDs
Pubkey: RSA, ELG, DSA, ECDH, ECDSA, EDDSA
Cipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH,
        CAMELLIA128, CAMELLIA192, CAMELLIA256
Hash: SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224
```

Algo 18 is ECDH (X25519 here), 22 EdDSA, cipher 9 AES-256, aead 2 OCB in 4 MiB
chunks, digest 10 SHA2-512; 2.4 has no v6 keys, Ed25519 (27) or X25519 (25).
2.5 (not run) adds `pqc` (2.5.0), a Brainpool P-384 key with a Kyber-768 +
Brainpool P-256 subkey, and `--allow-9980` (2.5.23) for RFC 9980's ML-KEM and
RFC 9580's Ed25519 and X25519, though its NEWS advises LibrePGP's Kyber.

## See also

- [OpenPGP](../protocols/OpenPGP.md): packets, algorithm IDs, v4/v5/v6 keys, RFC 9580 against LibrePGP
- [age](age.md): file encryption with no keyring, trust or signatures; the simple alternative
- [EdDSA](../02-signatures/EdDSA.md) / [X25519](../01-key-exchange/ECDH.md#x25519-and-x448): the default key's two algorithms
- [Argon2](../08-kdf-password-hashing/Argon2.md) / [PBKDF2](../08-kdf-password-hashing/PBKDF2.md): the S2K RFC 9580 recommends, and the iterated-hash idea behind `-c`'s S2K

## References

- GnuPG 2.4.4 manual source: [`doc/gpg.texi`](https://github.com/gpg/gnupg/blob/gnupg-2.4.4/doc/gpg.texi) (`--quick-gen-key`, `--export-ssh-key`, `--assert-signer`, `--s2k-*`, `keytocard`, `openpgp-revocs.d`) / [`doc/gpgv.texi`](https://github.com/gpg/gnupg/blob/gnupg-2.4.4/doc/gpgv.texi)
- [GnuPG NEWS](https://github.com/gpg/gnupg/blob/master/NEWS) (2.3.0: Ed25519 default, OCB; 2.3.3: 4 MiB chunks; 2.4.1: S2K SHA-256, `--assert-signer`; 2.5.0: `pqc`; 2.5.23: `--allow-9980`) / [`g10/keygen.c`](https://github.com/gpg/gnupg/blob/master/g10/keygen.c) (default, `future-default`, `pqc`, 3 years) / [`g10/encrypt.c`](https://github.com/gpg/gnupg/blob/gnupg-2.4.4/g10/encrypt.c) (2.4.4: OCB only if every key has it)
- Ubuntu's [gnupg2 2.4.4-2ubuntu17.6 patches](http://archive.ubuntu.com/ubuntu/pool/main/g/gnupg2/gnupg2_2.4.4-2ubuntu17.6.debian.tar.xz) (`update-defaults/`: SHA-512) / [RFC 9580](https://www.rfc-editor.org/rfc/rfc9580) (Section 3.7, S2K) / [RFC 4880](https://www.rfc-editor.org/rfc/rfc4880) (Section 3.7.1.3)
- Git [`user.signingKey`](https://github.com/git/git/blob/master/Documentation/config/user.adoc)
