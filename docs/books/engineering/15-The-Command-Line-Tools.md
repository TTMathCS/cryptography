# 15. The Command-Line Tools

*Most cryptography that people run by hand runs through five programs:
`openssl`, `ssh-keygen`, `gpg`, `age` and `keytool`. Each one is a thin
skin over a large library, and each one carries decisions made in the 1990s
that still decide what happens when you press Enter today. This chapter
teaches what is underneath the commands. You will map an `openssl x509 -text`
dump back to the DER bytes it came from, compute an SSH fingerprint and an
OpenPGP fingerprint by hand and get the same answer as the tools, and
re-implement the key derivation inside `openssl enc` to see why a file it
encrypted can be attacked at hundreds of thousands of guesses a second on one
laptop core. Then you will break the habits that put passwords in the
process list, trust unauthenticated ciphertext, and accept a checksum from
the server that was just hacked, and learn to check a download the way
OpenBSD, minisign and `ssh-keygen -Y` do.*

!!! abstract "In this chapter"
    **You will learn:**

    - where the five tools came from: SSLeay and OpenSSL, the 2014 forks
      (LibreSSL, BoringSSL) and OpenSSL 3.0's providers; OpenSSH; GnuPG and
      the OpenPGP split; age; Java's `keytool`;
    - how to read an `openssl x509 -text` dump as the DER structure under it;
    - what `openssl enc` does with a password (`EVP_BytesToKey`: MD5 before
      OpenSSL 1.1.0, one iteration always), why `-nosalt` is worse, and the
      `-pbkdf2 -iter` fix;
    - why `openssl enc` cannot detect tampering, and why passwords on the
      command line leak through `ps` and shell history;
    - how `ssh-keygen -l` computes a fingerprint, and what randomart is for;
    - how to read `gpg --list-packets`, what gpg's exit codes and trust
      labels mean, and what EFAIL and the SHA-1 collisions taught gpg users;
    - JKS, PKCS#12 and the traps in `keytool`;
    - how to check a download: why a checksum from the same server proves
      nothing, and how signify, minisign, `ssh-keygen -Y` and `gpg --verify`
      do better.

    **You need:** [Chapter 3](03-ASN1-DER-and-Key-Files.md) (DER, PEM and the
    key files), [Chapter 13](13-Passwords-on-the-Server.md) (why password
    hashing must be slow), and book 1's
    [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) (PBKDF2 and
    friends). The five reference cards,
    [openssl](../../tools/openssl.md), [ssh-keygen](../../tools/ssh-keygen.md),
    [gpg](../../tools/gpg.md), [age](../../tools/age.md) and
    [keytool](../../tools/keytool.md), hold the command recipes; this chapter
    explains them and does not repeat them.

    **Levels:** §15.1 and §15.2 are for beginners, §15.3 to §15.9 are
    intermediate, §15.10 is expert.

## 15.1 The problem

*Level: beginner.*

Search the web for "encrypt a file with openssl" and the first answers, many
of them years old and still copied every day, give something close to this:

```
openssl enc -aes-256-cbc -salt -in backup.tar -out backup.tar.enc -k "$BACKUP_PASSWORD"
```

It looks responsible. AES-256 is the strongest standard block cipher, the word
`-salt` is right there, and the password comes from a variable instead of
being typed into the script. The command runs, the file comes out scrambled,
and a matching `openssl enc -d` gets the backup back. Every step looks fine,
and the result is weak in four separate ways.

First, the password becomes a key through a function called
`EVP_BytesToKey`, which hashes it **once**. Until OpenSSL 1.1.0 (August 2016)
that hash was MD5; since then it has been SHA-256, still once. A stolen
`backup.tar.enc` can be attacked at the speed of one hash per guess: hundreds
of thousands of guesses a second on a single laptop core in Python, and
billions a second on a graphics card. Second, the file has no authentication
tag. `openssl enc` refuses every AEAD mode, so nothing in the file can tell a
tampered backup from a real one; with CBC a changed block mostly shows up as
garbage or a padding error, and with CTR an attacker can change chosen bytes of
the plaintext and the decryption reports success. Third, `-k "$BACKUP_PASSWORD"`
puts the expanded password into the program's argument list, which every user
on the machine can read through `ps` for as long as the command runs. Fourth,
whoever restores the backup in two years will run the same command with a
newer OpenSSL, whose default digest, defaults for salt and warnings may all
have changed; the file records none of the parameters it was made with except
the salt.

None of this is a bug in AES or in OpenSSL's AES code. It lives in the layer
this chapter is about: the command-line tools, their defaults, their output
and the habits people build around them. Book 1 explains the algorithms;
[Chapter 3](03-ASN1-DER-and-Key-Files.md) explains the files these tools read
and write. Here the subject is the tools themselves, as programs with a
history.

The five tools are `openssl`, `ssh-keygen`, `gpg`, `age` and `keytool`. For
each one, the reference cards on this site
([openssl](../../tools/openssl.md), [ssh-keygen](../../tools/ssh-keygen.md),
[gpg](../../tools/gpg.md), [age](../../tools/age.md),
[keytool](../../tools/keytool.md)) give version-checked recipes to paste into
a terminal. This chapter explains them: where each tool came from, what its
output means byte by byte, and where it will quietly do the wrong thing.

All real outputs in this chapter come from one Ubuntu 24.04 container in
November 2026, running OpenSSL 3.0.13 (30 Jan 2024), OpenSSH 9.6p1
(`ssh-keygen`), GnuPG 2.4.4 with libgcrypt 1.10.3, age 1.1.1, keytool
21.0.12.1, signify from Debian's `signify-openbsd` package (version 31) and
minisign 0.11. Newer versions change some defaults, and the text says where.

Figure 15.1 places the tools on one timeline. Two clusters stand out: the
late 1990s, when OpenSSL, OpenSSH, GnuPG and Java's key store were all born
within about a year of each other, and 2014, when Heartbleed made
the world look at who maintained the code it depended on, and a wave of forks
and smaller tools followed.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Timeline from 1995 to 2025 of the command-line tools: SSLeay 1995, OpenSSL and JKS 1998, OpenSSH and GnuPG 1999, Heartbleed, LibreSSL, BoringSSL and signify 2014, minisign 2015, age 2019, OpenSSL 3.0 2021, RFC 9580 2024" fill="currentColor" font-size="14">
<line x1="30" y1="150" x2="620" y2="150" stroke="currentColor" stroke-width="2"/>
<line x1="40" y1="143" x2="40" y2="157" stroke="currentColor"/>
<line x1="97" y1="143" x2="97" y2="157" stroke="currentColor"/>
<line x1="116" y1="143" x2="116" y2="157" stroke="currentColor"/>
<line x1="401" y1="143" x2="401" y2="157" stroke="currentColor"/>
<line x1="420" y1="143" x2="420" y2="157" stroke="currentColor"/>
<line x1="496" y1="143" x2="496" y2="157" stroke="currentColor"/>
<line x1="534" y1="143" x2="534" y2="157" stroke="currentColor"/>
<line x1="591" y1="143" x2="591" y2="157" stroke="currentColor"/>
<text x="40" y="176" text-anchor="middle" opacity="0.7">1995</text>
<text x="116" y="176" text-anchor="middle" opacity="0.7">1999</text>
<text x="401" y="176" text-anchor="middle" opacity="0.7">2014</text>
<text x="534" y="176" text-anchor="middle" opacity="0.7">2021</text>
<line x1="40" y1="143" x2="40" y2="100" stroke="currentColor" opacity="0.5"/>
<text x="34" y="92">SSLeay (Young, Hudson)</text>
<line x1="97" y1="143" x2="97" y2="100" stroke="currentColor" opacity="0.5"/>
<line x1="97" y1="76" x2="97" y2="60" stroke="currentColor" opacity="0.5"/>
<text x="91" y="52">OpenSSL 0.9.1c, Dec 1998</text>
<line x1="401" y1="143" x2="401" y2="100" stroke="currentColor" opacity="0.5"/>
<text x="300" y="92">Heartbleed, Apr 2014</text>
<line x1="534" y1="143" x2="534" y2="60" stroke="currentColor" opacity="0.5"/>
<text x="440" y="52">OpenSSL 3.0, providers</text>
<line x1="97" y1="157" x2="97" y2="200" stroke="currentColor" opacity="0.5"/>
<text x="20" y="216">Java keytool, JKS 1998</text>
<line x1="116" y1="184" x2="116" y2="240" stroke="currentColor" opacity="0.5"/>
<text x="60" y="256">OpenSSH, GnuPG 1.0 (1999)</text>
<line x1="401" y1="184" x2="401" y2="200" stroke="currentColor" opacity="0.5"/>
<text x="290" y="216">LibreSSL, BoringSSL, signify</text>
<line x1="420" y1="184" x2="420" y2="198" stroke="currentColor" opacity="0.5"/>
<line x1="420" y1="222" x2="420" y2="240" stroke="currentColor" opacity="0.5"/>
<text x="380" y="256">minisign 2015</text>
<line x1="496" y1="157" x2="496" y2="280" stroke="currentColor" opacity="0.5"/>
<text x="470" y="294">age 2019</text>
<line x1="591" y1="157" x2="591" y2="200" stroke="currentColor" opacity="0.5"/>
<text x="540" y="216">RFC 9580</text>
<text x="540" y="232">(2024)</text>
</svg>
<figcaption>Figure 15.1. The five tools and their relatives. Most were born in a
burst at the end of the 1990s; 2014's Heartbleed set off a second burst of
forks and small single-purpose tools.</figcaption>
</figure>

The rest of the chapter goes tool by tool and then turns to the job where all
of them meet: checking that a file you downloaded is the one its author
released.

What to do, before reading further:

- Treat every command you copy from the web as code to review: which
  algorithm, which key derivation, where the password goes, what the exit
  code means.
- Write down the tool and version that made each long-lived encrypted file or
  key, next to the file. Defaults move.
- Prefer a tool built for the job (age for file encryption, signify or
  minisign for signing releases) over a general toolkit command that can be
  made safe only with the right flags.

## 15.2 Five tools and where they came from

*Level: beginner.*

### OpenSSL, from SSLeay

In 1995 Eric A. Young, a programmer in Brisbane, Australia, began writing a
free implementation of Netscape's new SSL protocol, building on the free DES
library he had already published. Tim J. Hudson joined him, and the
library took the name **SSLeay**, "SSL" plus Eric's initials. It came with a
test program, `ssleay`, that could make keys, issue certificates and talk to
servers. Because it was written outside the United States, it escaped the
American export rules on cryptography that crippled the browsers of the time,
and it spread fast: Apache's SSL modules, early Linux distributions and a
generation of servers used it.

In 1998 Young and Hudson went to work for RSA Security, and SSLeay stopped.
A group of volunteers, among them Mark Cox, Ralf Engelschall, Stephen Henson
and Ben Laurie, picked up the code and released **OpenSSL 0.9.1c** on
23 December 1998. The `ssleay` program became `openssl`. Its design, a single
binary with dozens of subcommands (`req`, `x509`, `enc`, `dgst`, `s_client`)
each with its own flags, comes from SSLeay's test harness, and it shows: the
commands were written to exercise the library, not as a designed interface for
end users. That is why `openssl` is so powerful and so easy to misuse.

For fifteen years OpenSSL was the cryptography of the open internet, run by a
handful of people. In April 2014, a missing bounds check in its heartbeat
code, **Heartbleed** (CVE-2014-0160, told fully in
[Chapter 8](08-Hostile-Input.md)), let anyone read memory from about a sixth
of the internet's TLS servers. In the weeks after, Steve Marquess of the
OpenSSL Software Foundation wrote that the project had one full-time
developer and received about \$2,000 a year in donations. The Linux
Foundation set up the Core Infrastructure Initiative that month to fund it.
Two forks also appeared.

**LibreSSL** was announced by the OpenBSD developers in April 2014. They
deleted tens of thousands of lines in the first weeks (old platforms, unused
features, OpenSSL's own `malloc` wrapper that had hidden Heartbleed from
memory checkers) and shipped LibreSSL in OpenBSD 5.6 that November. It is the
`/usr/bin/openssl` on macOS today, which is why some OpenSSL recipes fail on a
Mac (the [openssl card](../../tools/openssl.md) lists the differences).
**BoringSSL**, announced by Adam Langley of Google in June 2014, is Google's
own fork for Chrome, Android and its servers. It promises no stable API to
anyone else and removes what Google does not need; it also became the base of
AWS-LC and the place where formally verified code entered production
([Chapter 17](17-Choosing-Testing-and-Verifying.md)).

OpenSSL itself was rebuilt. Version 1.1.0 (August 2016) made its structures
opaque and changed several command-line defaults, among them the digest used
by `enc`. Version 1.1.1 (September 2018) brought TLS 1.3 and, for `enc`, the
`-pbkdf2` and `-iter` options. **OpenSSL 3.0.0**, released on
7 September 2021 under the Apache License 2.0, moved every algorithm behind
**providers**: loadable modules that supply implementations, with a
`default` provider, a separately validated `fips` provider, and a `legacy`
provider holding old ciphers such as DES, RC4, Blowfish and MD4. The command
line feels this directly:

```
$ openssl list -providers
Providers:
  default
    name: OpenSSL Default Provider
    version: 3.0.13
    status: active
$ printf x | openssl enc -des-cbc -pbkdf2 -pass pass:x > /dev/null
Error setting cipher DES-CBC
40970A9EE47F0000:error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:../crypto/evp/evp_fetch.c:386:Global default library context, Algorithm (DES-CBC : 8), Properties ()
```

The same command with `-provider legacy -provider default` works. Load the
legacy provider only when you know which old algorithm you still need, and
why. OpenSSL 3.5 (April 2025) added the post-quantum algorithms, and 4.0
(April 2026) removed the old "engine" interface.

!!! note "Life story: OpenSSL"
    **Born:** 1995 as Eric Young and Tim Hudson's SSLeay; OpenSSL 0.9.1c on
    23 December 1998 · **Purpose:** a free SSL/TLS and general cryptography
    library, with a command-line tool for keys, certificates and tests ·
    **Helped:** most of the web's TLS servers for two decades, nearly every
    Linux distribution, and every script that has ever run `openssl req` ·
    **Status:** active; 3.x since 2021 with providers and a FIPS 140-3
    module; forks LibreSSL (2014) and BoringSSL (2014) live beside it

!!! note "Life story: LibreSSL and BoringSSL"
    **Born:** April 2014 (LibreSSL, OpenBSD) and June 2014 (BoringSSL,
    Google), both in the weeks after Heartbleed · **Purpose:** LibreSSL, a
    smaller, cleaned-up OpenSSL with a stable interface for OpenBSD and others;
    BoringSSL, Google's own fork, free to change its API whenever Google
    needs · **Helped:** LibreSSL is the system `openssl` on OpenBSD and
    macOS; BoringSSL runs in Chrome, Android and Google's servers and is the
    base of AWS-LC · **Status:** both active

### ssh-keygen, from OpenSSH

Tatu Ylönen, a researcher at the Helsinki University of Technology, wrote the
first SSH in 1995 after a password-sniffing attack on his university's
network. Its later versions came under a restrictive license, so in 1999
Björn Grönvall's fork of the last free version (1.2.12) was taken up by the
OpenBSD project, cleaned up and released as **OpenSSH** with OpenBSD 2.6 in
December 1999. `ssh-keygen` is its key tool. Over the years it has collected
far more than key generation: fingerprints, `known_hosts` management, SSH
certificates, key revocation lists, FIDO security keys, and since OpenSSH 8.1
(October 2019) signatures on arbitrary files with `ssh-keygen -Y`.

Its defaults have moved slowly and well. Ed25519 keys arrived in OpenSSH 6.5
(January 2014), together with a new private key format that uses
`bcrypt_pbkdf` to protect the key with a passphrase; that format became the
default in 7.8 (August 2018), and Ed25519 became the default key type in 9.5
(October 2023). Fingerprints changed from MD5 in hex to SHA-256 in base64 in
6.8 (March 2015). DSA keys were removed in 10.0 (2025). Protocols
[Chapter 6](../protocols/06-SSH.md) covers SSH as a protocol; this chapter
looks only at what `ssh-keygen` prints.

!!! note "Life story: OpenSSH"
    **Born:** December 1999, OpenBSD 2.6, from Björn Grönvall's fork of Tatu
    Ylönen's SSH 1.2.12 · **Purpose:** a free SSH client and server, with
    `ssh-keygen` for keys, fingerprints and certificates · **Helped:** almost
    every Unix server login since about 2000, Git over SSH, and since 2019
    file and commit signing with `ssh-keygen -Y` · **Status:** active;
    10.x in 2026; post-quantum key exchange by default since 9.0 (2022),
    with ML-KEM since 10.0

### GnuPG and the OpenPGP split

Phil Zimmermann released PGP in 1991, and his program's message format became
the IETF's **OpenPGP** standard: RFC 2440 in 1998, RFC 4880 in 2007, and
RFC 9580 in July 2024. Werner Koch in Germany wrote a free implementation
that did not depend on the patented IDEA cipher, and released **GnuPG 1.0**
on 7 September 1999. German government grants helped fund the early work,
and Gpg4win later brought it to Windows. For most of its life GnuPG has been
maintained by Koch and a very small team; in February 2015 a ProPublica
article reported that he was close to giving up for lack of money, and
donations followed within days. The parallel with OpenSSL a year earlier is
exact: the tools everyone depends on are often kept alive by one or two
people.

The OpenPGP standard then split. The IETF working group's revision,
published as RFC 9580, defines version 6 keys with SHA-256 fingerprints,
native Ed25519 and X25519 algorithm numbers, Argon2 for passphrases and a
version 2 of the integrity-protected data packet with OCB, EAX or GCM. GnuPG
did not follow it. Koch kept an earlier draft of the same revision alive as
**LibrePGP**, an individual Internet-Draft, and GnuPG writes LibrePGP's
version 5 keys and its own OCB encrypted-data packet (packet type 20). The
two formats do not read each other's new messages. Sequoia PGP and
OpenPGP.js follow RFC 9580; GnuPG follows LibrePGP. The
[OpenPGP page](../../protocols/OpenPGP.md) has the table; Protocols
[Chapter 15](../protocols/index.md) has the story. For
a user of `gpg` 2.4, the practical result is that the default key is still a
version 4 key with a SHA-1 fingerprint, and that an encrypted message may use
a packet only GnuPG understands.

!!! note "Life story: GnuPG"
    **Born:** 7 September 1999, GnuPG 1.0, by Werner Koch · **Purpose:** a
    free implementation of OpenPGP for encryption, signatures and the web of
    trust · **Helped:** Debian, Fedora and most Linux distributions' package
    signing, signed Git tags, Snowden's first contacts with journalists in
    2013, and decades of encrypted email · **Status:** active (2.5 the stable series since
    December 2025, 2.4 at end of life since June 2026); follows LibrePGP rather than RFC 9580

### age

By the late 2010s the common advice for encrypting a file was either GnuPG,
with its keyrings, trust model and decades of options, or `openssl enc`, with
the problems in §15.1. Filippo Valsorda and Ben Cartwright-Cox designed
**age** in 2019 to be neither: small explicit keys, no configuration, no
keyring, no signatures, authenticated encryption always, and a format short
enough to read in an afternoon. Its reference implementation is in Go; 1.0.0
came out in September 2021, and a Rust implementation, rage, reads the same
files. age encrypts to X25519 keys, to SSH public keys, or to a passphrase
through scrypt. Its design and header are Protocols
[Chapter 18](../protocols/index.md)'s subject; here
it matters as the answer to "what should I use instead of `openssl enc`?"

!!! note "Life story: age"
    **Born:** 2019, design by Filippo Valsorda and Ben Cartwright-Cox; 1.0.0
    in September 2021 · **Purpose:** simple, modern file encryption with
    small explicit keys and no options to get wrong · **Helped:** SOPS for
    encrypted configuration files, `passage` password stores, backup scripts
    that used to call `openssl enc` · **Status:** active; 1.3 (December 2025) adds
    hybrid post-quantum recipients

### keytool

Java 1.2 (December 1998) brought a security architecture with pluggable
providers, and with it a file format for keys, the **Java KeyStore** (JKS),
and a tool to manage it, `keytool`. JKS was a Sun design that used SHA-1 in
home-made ways to protect keys and check the file. JDK 9 (September 2017)
made PKCS#12 the default store type (JEP 229), and recent JDKs warn every
time `keytool` touches a JKS store that holds keys.
[Chapter 3](03-ASN1-DER-and-Key-Files.md#38-java-key-stores-and-telling-files-apart)
takes the JKS format apart and cracks a store's password at one SHA-1 per
guess; §15.8 below covers the tool's own traps.

!!! note "Life story: keytool"
    **Born:** JDK 1.2, December 1998, with the JKS format · **Purpose:**
    manage Java key stores and trust stores: key pairs, certificate requests,
    CA replies, trusted roots · **Helped:** every Java TLS server and client,
    Tomcat and Jetty set-ups, Android's early signing keys · **Status:**
    active; PKCS#12 by default since JDK 9 (2017), with JKS kept for
    compatibility and marked for removal

What to do:

- Know which `openssl` you have (`openssl version`): OpenSSL 3, OpenSSL 1.1,
  LibreSSL and BoringSSL's `bssl` differ in flags and defaults.
- When an old command fails on OpenSSL 3 with `unsupported`, find which old
  algorithm it needs before you load the legacy provider, and plan to stop
  needing it.
- For `gpg`, know whether the people you exchange messages with run GnuPG or
  an RFC 9580 implementation; the default settings of each can produce
  messages the other cannot read.

## 15.3 Reading openssl: a certificate dump against its bytes

*Level: intermediate.*

`openssl x509 -text` is the command people run most often to look at a
certificate, and its output looks like a report written for humans. It is
not. It is a walk over the DER structure of
[Chapter 3](03-ASN1-DER-and-Key-Files.md), in order, with each field turned
into text by a small printing routine. Once you see that, every odd detail
of the dump (why the version says 3 when the file says 2, why the serial
number has colons, why the signature starts with `30:65`) has a plain
explanation, and you can tell which parts the printer interpreted and which it
copied.

Here is the full dump of **ISRG Root X2**, Let's Encrypt's elliptic-curve
root, the same certificate that Chapter 3's DER reader walks in
[§3.4](03-ASN1-DER-and-Key-Files.md#34-a-der-reader-that-walks-a-real-certificate).
It ships in every Mozilla-based trust store as
`/etc/ssl/certs/ISRG_Root_X2.pem`:

```
$ openssl x509 -in /etc/ssl/certs/ISRG_Root_X2.pem -noout -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            41:d2:9d:d1:72:ea:ee:a7:80:c1:2c:6c:e9:2f:87:52
        Signature Algorithm: ecdsa-with-SHA384
        Issuer: C = US, O = Internet Security Research Group, CN = ISRG Root X2
        Validity
            Not Before: Sep  4 00:00:00 2020 GMT
            Not After : Sep 17 16:00:00 2040 GMT
        Subject: C = US, O = Internet Security Research Group, CN = ISRG Root X2
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (384 bit)
                pub:
                    04:cd:9b:d5:9f:80:83:0a:ec:09:4a:f3:16:4a:3e:
                    5c:cf:77:ac:de:67:05:0d:1d:07:b6:dc:16:fb:5a:
                    8b:14:db:e2:71:60:c4:ba:45:95:11:89:8e:ea:06:
                    df:f7:2a:16:1c:a4:b9:c5:c5:32:e0:03:e0:1e:82:
                    18:38:8b:d7:45:d8:0a:6a:6e:e6:00:77:fb:02:51:
                    7d:22:d8:0a:6e:9a:5b:77:df:f0:fa:41:ec:39:dc:
                    75:ca:68:07:0c:1f:ea
                ASN1 OID: secp384r1
                NIST CURVE: P-384
        X509v3 extensions:
            X509v3 Key Usage: critical
                Certificate Sign, CRL Sign
            X509v3 Basic Constraints: critical
                CA:TRUE
            X509v3 Subject Key Identifier: 
                7C:42:96:AE:DE:4B:48:3B:FA:92:F8:9E:8C:CF:6D:8B:A9:72:37:95
    Signature Algorithm: ecdsa-with-SHA384
    Signature Value:
        30:65:02:30:7b:79:4e:46:50:84:c2:44:87:46:1b:45:70:ff:
        58:99:de:f4:fd:a4:d2:55:a6:20:2d:74:d6:34:bc:41:a3:50:
        5f:01:27:56:b4:be:27:75:06:af:12:2e:75:98:8d:fc:02:31:
        00:8b:f5:77:6c:d4:c8:65:aa:e0:0b:2c:ee:14:9d:27:37:a4:
        f9:53:a5:51:e4:29:83:d7:f8:90:31:5b:42:9f:0a:f5:fe:ae:
        00:68:e7:8c:49:0f:b6:6f:5b:5b:15:f2:e7
```

And here is the same certificate as `openssl asn1parse` sees it, which prints
each element's offset (`0:`, `4:`...), depth (`d=`), header length (`hl=`)
and content length (`l=`), trimmed to the top of the tree:

```
$ openssl asn1parse -in /etc/ssl/certs/ISRG_Root_X2.pem -i     # trimmed
    0:d=0  hl=4 l= 539 cons: SEQUENCE
    4:d=1  hl=4 l= 417 cons:  SEQUENCE
    8:d=2  hl=2 l=   3 cons:   cont [ 0 ]
   10:d=3  hl=2 l=   1 prim:    INTEGER           :02
   13:d=2  hl=2 l=  16 prim:   INTEGER           :41D29DD172EAEEA780C12C6CE92F8752
  ...
  425:d=1  hl=2 l=  10 cons:  SEQUENCE
  427:d=2  hl=2 l=   8 prim:   OBJECT            :ecdsa-with-SHA384
  437:d=1  hl=2 l= 104 prim:  BIT STRING
```

Figure 15.2 lines the two up. The outer SEQUENCE at offset 0 is the whole
certificate. Its first child, at offset 4, is the **TBSCertificate** ("to be
signed"), the part the signature covers; `x509 -text` calls it `Data:`. The
eight children of that SEQUENCE are, in order, the eight blocks of the dump.
After it come the signature algorithm again (offset 425) and the signature
itself (offset 437), which the dump prints at the bottom, outside `Data:`.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Nested boxes of the DER certificate with offsets on the left and the matching x509 -text heading on the right" fill="currentColor" font-size="14">
<rect x="10" y="10" width="360" height="380" fill="none" stroke="currentColor"/>
<text x="20" y="30">0: SEQUENCE, 539 bytes (Certificate)</text>
<rect x="25" y="40" width="335" height="270" fill="none" stroke="currentColor"/>
<text x="35" y="60">4: SEQUENCE, 417 bytes (TBSCertificate)</text>
<text x="45" y="88">8: [0] INTEGER 02</text>
<text x="45" y="114">13: INTEGER, 16 bytes</text>
<text x="45" y="140">31: SEQUENCE { OID }</text>
<text x="45" y="166">43: SEQUENCE of SETs</text>
<text x="45" y="192">124: SEQUENCE { UTCTime x2 }</text>
<text x="45" y="218">156: SEQUENCE of SETs</text>
<text x="45" y="244">237: SEQUENCE { alg, BIT STRING }</text>
<text x="45" y="270">357: [3] SEQUENCE of extensions</text>
<text x="20" y="340">425: SEQUENCE { OID }</text>
<text x="20" y="370">437: BIT STRING, 104 bytes</text>
<line x1="372" y1="60" x2="420" y2="60" stroke="currentColor" opacity="0.5"/>
<text x="425" y="64">Data:</text>
<line x1="300" y1="84" x2="420" y2="84" stroke="currentColor" opacity="0.5"/>
<text x="425" y="88">Version: 3 (0x2)</text>
<line x1="300" y1="110" x2="420" y2="110" stroke="currentColor" opacity="0.5"/>
<text x="425" y="114">Serial Number</text>
<line x1="300" y1="136" x2="420" y2="136" stroke="currentColor" opacity="0.5"/>
<text x="425" y="140">Signature Algorithm</text>
<line x1="300" y1="162" x2="420" y2="162" stroke="currentColor" opacity="0.5"/>
<text x="425" y="166">Issuer</text>
<line x1="300" y1="188" x2="420" y2="188" stroke="currentColor" opacity="0.5"/>
<text x="425" y="192">Validity</text>
<line x1="300" y1="214" x2="420" y2="214" stroke="currentColor" opacity="0.5"/>
<text x="425" y="218">Subject</text>
<line x1="350" y1="240" x2="420" y2="240" stroke="currentColor" opacity="0.5"/>
<text x="425" y="244">Subject Public Key Info</text>
<line x1="350" y1="266" x2="420" y2="266" stroke="currentColor" opacity="0.5"/>
<text x="425" y="270">X509v3 extensions</text>
<line x1="300" y1="336" x2="420" y2="336" stroke="currentColor" opacity="0.5"/>
<text x="425" y="340">Signature Algorithm</text>
<line x1="300" y1="366" x2="420" y2="366" stroke="currentColor" opacity="0.5"/>
<text x="425" y="370">Signature Value</text>
</svg>
<figcaption>Figure 15.2. ISRG Root X2 as DER (left, with byte offsets from
<code>openssl asn1parse</code>) and as <code>openssl x509 -text</code> prints
it (right). Each heading of the dump is one element of the tree, in order.</figcaption>
</figure>

### Code it: the dump from the bytes

The program below takes the same certificate, finds the TBSCertificate, and
prints each of its children with offset, tag and length beside the heading
`x509 -text` gives it. It knows nothing about X.509 beyond the order of the
fields; a full reader is Chapter 3's job.

```python
# Map `openssl x509 -text` back to the DER bytes it was printed from.
# ISRG Root X2, the same certificate Chapter 3 walks in full.
import base64, hashlib

der = base64.b64decode("""
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn""")

def header(buf, i):
    """Return (tag, start of value, length) for the element at offset i."""
    tag, n = buf[i], buf[i + 1]
    if n < 0x80:
        return tag, i + 2, n
    k = n & 0x7F
    return tag, i + 2 + k, int.from_bytes(buf[i + 2:i + 2 + k], "big")

def children(buf, i):
    tag, start, length = header(buf, i)
    j = start
    while j < start + length:
        yield j
        t, s, n = header(buf, j)
        j = s + n

labels = ["Version", "Serial Number", "Signature Algorithm", "Issuer",
          "Validity", "Subject", "Subject Public Key Info", "X509v3 extensions"]
tbs = next(children(der, 0))                 # Certificate -> TBSCertificate
for label, off in zip(labels, children(der, tbs)):
    tag, start, length = header(der, off)
    value = der[start:start + length]
    print(f"offset {off:3}  tag {tag:02x}  {length:3} bytes  {label}: {value[:8].hex()}...")

v_tag, v_start, _ = header(der, 10)           # the INTEGER inside [0]
print("Version: stored", der[v_start], "printed as", der[v_start] + 1)
print("sha256 Fingerprint=" + ":".join(f"{b:02X}" for b in hashlib.sha256(der).digest()[:8]) + ":...")
```

It prints:

```
offset   8  tag a0    3 bytes  Version: 020102...
offset  13  tag 02   16 bytes  Serial Number: 41d29dd172eaeea7...
offset  31  tag 30   10 bytes  Signature Algorithm: 06082a8648ce3d04...
offset  43  tag 30   79 bytes  Issuer: 310b300906035504...
offset 124  tag 30   30 bytes  Validity: 170d323030393034...
offset 156  tag 30   79 bytes  Subject: 310b300906035504...
offset 237  tag 30  118 bytes  Subject Public Key Info: 301006072a8648ce...
offset 357  tag a3   66 bytes  X509v3 extensions: 3040300e0603551d...
Version: stored 2 printed as 3
sha256 Fingerprint=69:72:9B:8E:15:A8:6E:FC:...
```

The offsets are the ones `asn1parse` printed, and the fingerprint matches
`openssl x509 -noout -fingerprint -sha256`, which gives
`69:72:9B:8E:15:A8:6E:FC:17:7A:57:AF:B7:17:1D:FC:64:AD:D2:8C:2F:CA:8C:F1:50:7E:34:45:3C:CB:14:70`
on this machine. A fingerprint is a hash of the DER bytes, never of the PEM
text, which is why the same certificate in PEM and in DER has one
fingerprint.

### What the printer did to each field

Walking down the dump with the bytes beside it:

- **`Version: 3 (0x2)`.** X.509 numbers its versions from zero, so version 3
  is stored as the integer 2 inside an explicit `[0]` tag. The printer adds
  one and shows the raw value in brackets. A certificate with no `[0]`
  element at all is version 1.
- **`Serial Number`.** Sixteen bytes, printed as hex with colons because they
  do not fit in a machine word. Short serial numbers are printed in decimal
  with the hex in brackets, so the same field can look completely different
  on two certificates. The serial is an INTEGER and therefore signed: a
  serial whose first byte is `80` or more gets a leading `00` in DER, which
  the printer shows.
- **`Signature Algorithm`** appears twice, at offset 31 inside the signed
  part and at offset 425 outside it. They must be equal; a verifier that
  reads one and trusts the other has a bug, and a few have had one.
- **`Issuer` and `Subject`.** Each is a SEQUENCE of SETs of
  (OID, string) pairs. The printer turns OIDs into short names (`C`, `O`,
  `CN`) and joins them with commas, in the order of the file. The same
  printer had a different default format in OpenSSL 1.0 (`/C=US/O=...`), so
  scripts that parse `-subject` output break between versions; ask for
  `-nameopt RFC2253` or, better, parse the DER.
- **`Validity`.** Two UTCTime strings, `200904000000Z` and `400917160000Z`,
  shown as dates. UTCTime has a two-digit year: 50 to 99 mean 1950 to 1999,
  00 to 49 mean 2000 to 2049, and a certificate valid past 2049 must switch
  to GeneralizedTime.
- **`Subject Public Key Info`.** The algorithm OID (`id-ecPublicKey`), the
  curve OID (`secp384r1`), and a BIT STRING holding the point. The
  `pub:` bytes start with `04`, which means "uncompressed point": 48 bytes of
  x and 48 of y follow, 97 bytes in all.
- **`X509v3 extensions`.** Each extension is (OID, optional critical flag,
  OCTET STRING holding more DER). `asn1parse` shows the raw OCTET STRING of
  Key Usage as `03020106`: a BIT STRING with one unused bit and the byte
  `06`, bits 5 and 6, which the printer names `Certificate Sign, CRL Sign`.
  The printer knows a few dozen extensions; for any other it prints a hex
  dump, and that hex dump is all you get.
- **`Signature Value`** starts `30:65:02:30:...:02:31:00:...`. An ECDSA
  signature is itself DER: a SEQUENCE of two INTEGERs, $r$ (48 bytes) and $s$
  (49 bytes, because its top bit was set and DER added a `00`). This is why
  ECDSA signatures in certificates vary in length by a byte or two.

The meanings of these fields, and the rules a verifier applies to them, belong
to Protocols
[Chapter 2](../protocols/02-Certificates-and-PKI.md). What matters for using
the tool is the habit: when `openssl` prints something surprising, run
`asn1parse` on the same input and look at the bytes. And never feed
`x509 -text` output into a program. It is a report, its format changes between
versions, and it prints only the first certificate in a file without
warning. For machine use, take the DER and parse it, or use the specific
flags (`-noout -enddate`, `-fingerprint -sha256`, `-checkend`) whose output is
stable, and check their exit codes.

What to do:

- Use `openssl asn1parse -i` beside `x509 -text` whenever a field looks odd;
  the offsets let you find the exact bytes.
- Compare fingerprints, not names, when you need to know that two
  certificates are the same; compute them over DER with SHA-256.
- In scripts, use flags with stable output and exit codes (`-checkend`,
  `verify`), not parsed text dumps.

## 15.4 `openssl enc` and EVP_BytesToKey

*Level: intermediate.*

Go back to the backup command of §15.1. Run it and look at the first bytes of
the output:

```
$ printf 'attack at dawn\n' > msg.txt
$ openssl enc -aes-256-cbc -k password -in msg.txt -out msg.enc
*** WARNING : deprecated key derivation used.
Using -iter or -pbkdf2 would be better.
$ od -A d -t x1 msg.enc
0000000 53 61 6c 74 65 64 5f 5f 13 e9 26 92 ad 7c 70 40
0000016 f1 95 93 44 51 a8 a8 84 03 8c b6 a8 24 db e7 53
0000032
```

The file is 32 bytes for a 15-byte message. The first eight bytes are the
ASCII text `Salted__`; the next eight, `13 e9 26 92 ad 7c 70 40`, are a random
salt; the last sixteen are one block of AES-256-CBC ciphertext, the 15-byte
message padded to 16 with PKCS#7 padding. Nothing else is stored: no version,
no name of the cipher, no name of the key derivation, no iteration count, no
authentication tag. The person who decrypts must know all of those already
and pass the same flags.

The warning tells you that OpenSSL's own developers consider the default key
derivation obsolete. It has printed since OpenSSL 1.1.1 (2018), yet it is
still the default in 3.x, because changing it would make every existing file
unreadable by the default command.

### What EVP_BytesToKey computes

The key and IV come from the password and salt through `EVP_BytesToKey`, a
function SSLeay inherited from PKCS #5 version 1.5's PBKDF1 and extended to
produce more bytes than one hash gives. With a hash $H$, password $P$, salt
$S$ and an iteration count $c$, it builds blocks

$$D_1 = H^{c}(P \,\|\, S), \qquad D_i = H^{c}(D_{i-1} \,\|\, P \,\|\, S) \quad (i \ge 2),$$

where $H^{c}$ means "apply $H$ $c$ times", and takes the key and then the IV
from the front of $D_1 \| D_2 \| D_3 \| \dots$. The library function accepts
any count, but `openssl enc` always calls it with $c = 1$. The hash is MD5 in
OpenSSL before 1.1.0, and SHA-256 by default since 1.1.0; `-md` chooses it, and a file made by an old OpenSSL can be read by
a new one only with `-md md5`, a common cause of "bad decrypt" after an
upgrade.

For AES-256-CBC with MD5, the key needs 32 bytes and the IV 16, so three MD5
blocks of 16 bytes are needed: key $= D_1 \| D_2$, IV $= D_3$. With SHA-256,
$D_1$ alone is the 32-byte key and the first 16 bytes of $D_2$ are the IV.
Figure 15.3 shows the MD5 case.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The openssl enc file layout and the EVP_BytesToKey chain: D1 is MD5 of password and salt, D2 is MD5 of D1, password and salt, D3 likewise; key is D1 and D2, IV is D3" fill="currentColor" font-size="14">
<rect x="20" y="20" width="110" height="34" fill="none" stroke="currentColor"/>
<text x="75" y="42" text-anchor="middle">Salted__</text>
<rect x="130" y="20" width="110" height="34" fill="none" stroke="currentColor"/>
<text x="185" y="42" text-anchor="middle">salt, 8 bytes</text>
<rect x="240" y="20" width="380" height="34" fill="none" stroke="currentColor"/>
<text x="430" y="42" text-anchor="middle">ciphertext (no tag, no parameters)</text>
<text x="20" y="80" opacity="0.7">The file. Below: how the password becomes a key, with MD5 and one round.</text>
<rect x="20" y="100" width="170" height="40" fill="none" stroke="currentColor"/>
<text x="105" y="125" text-anchor="middle">MD5(P | S)</text>
<rect x="230" y="100" width="170" height="40" fill="none" stroke="currentColor"/>
<text x="315" y="125" text-anchor="middle">MD5(D1 | P | S)</text>
<rect x="440" y="100" width="170" height="40" fill="none" stroke="currentColor"/>
<text x="525" y="125" text-anchor="middle">MD5(D2 | P | S)</text>
<line x1="190" y1="120" x2="228" y2="120" stroke="currentColor"/>
<polygon points="228,115 236,120 228,125"/>
<line x1="400" y1="120" x2="438" y2="120" stroke="currentColor"/>
<polygon points="438,115 446,120 438,125"/>
<text x="105" y="160" text-anchor="middle">D1, 16 bytes</text>
<text x="315" y="160" text-anchor="middle">D2, 16 bytes</text>
<text x="525" y="160" text-anchor="middle">D3, 16 bytes</text>
<rect x="20" y="190" width="380" height="36" fill="none" stroke="currentColor"/>
<text x="210" y="213" text-anchor="middle">AES-256 key = D1 | D2</text>
<rect x="440" y="190" width="170" height="36" fill="none" stroke="currentColor"/>
<text x="525" y="213" text-anchor="middle">IV = D3</text>
<line x1="105" y1="166" x2="105" y2="188" stroke="currentColor"/>
<line x1="315" y1="166" x2="315" y2="188" stroke="currentColor"/>
<line x1="525" y1="166" x2="525" y2="188" stroke="currentColor"/>
<text x="20" y="260">One guess at the password costs three MD5 calls. PBKDF2-HMAC-SHA256 at</text>
<text x="20" y="280">600,000 rounds, for the same 48 bytes, costs 2.4 million SHA-256 compressions.</text>
</svg>
<figcaption>Figure 15.3. What <code>openssl enc</code> stores (top) and how it
turns a password into a key without <code>-pbkdf2</code> (bottom), shown for
MD5, the default before OpenSSL 1.1.0. P is the password, S the salt.</figcaption>
</figure>

### Code it: EVP_BytesToKey, checked against OpenSSL

`openssl enc -P` prints the salt, key and IV it would use and stops. With a
fixed salt (`-S`) the result is repeatable, which makes it a test vector:

```
$ openssl enc -aes-256-cbc -k password -S 0102030405060708 -P -md md5
*** WARNING : deprecated key derivation used.
Using -iter or -pbkdf2 would be better.
salt=0102030405060708
key=E7B0971E52CA5CC8D0539FB3412F6316F7BA2E6EE293D9F3457B99436B51CE02
iv =8D450E2ED75A84A923D4EAC9FE49226B
$ openssl enc -aes-256-cbc -k password -S 0102030405060708 -P
*** WARNING : deprecated key derivation used.
Using -iter or -pbkdf2 would be better.
salt=0102030405060708
key=2435177F1410536BAAD2ACC155C0F94783D58384573CB0F72157443606285D3F
iv =F96EFC044E0F1613BF324245C95E7411
$ openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -k password -S 0102030405060708 -P
salt=0102030405060708
key=4E29ABD8DF66BD00F2B8DB8EBAA16E33D780BAEC8245B16793F82BA307E22349
iv =9938EF821B8C8D63FD2A60EE67DBF847
```

Now the same function in Python:

```python
# EVP_BytesToKey, as `openssl enc` uses it without -pbkdf2.
# D_1 = H(password + salt), D_i = H(D_{i-1} + password + salt); key and IV are cut
# from D_1 D_2 D_3 ... OpenSSL's enc always calls it with count = 1.
import hashlib

def evp_bytes_to_key(password, salt, key_len, iv_len, digest="md5", count=1):
    out, block = b"", b""
    while len(out) < key_len + iv_len:
        block = block + password + salt
        for _ in range(count):
            block = hashlib.new(digest, block).digest()
        out += block
    return out[:key_len], out[key_len:key_len + iv_len]

password, salt = b"password", bytes.fromhex("0102030405060708")

# What OpenSSL 3.0.13 printed for these inputs with -P (see the transcript above).
expected = {
    "md5": ("E7B0971E52CA5CC8D0539FB3412F6316F7BA2E6EE293D9F3457B99436B51CE02",
            "8D450E2ED75A84A923D4EAC9FE49226B"),
    "sha256": ("2435177F1410536BAAD2ACC155C0F94783D58384573CB0F72157443606285D3F",
               "F96EFC044E0F1613BF324245C95E7411"),
}
for digest, (k_hex, iv_hex) in expected.items():
    key, iv = evp_bytes_to_key(password, salt, 32, 16, digest)
    same = key.hex().upper() == k_hex and iv.hex().upper() == iv_hex
    print(f"{digest:6} key={key.hex()[:16]}... iv={iv.hex()[:16]}... matches openssl: {same}")

# Reason it out: with MD5, the first half of the key is one MD5 of password + salt.
print("MD5(password + salt) =", hashlib.md5(password + salt).hexdigest())

# The fix, -pbkdf2 -iter 600000, is plain PBKDF2-HMAC-SHA256 giving key + IV in one go.
kiv = hashlib.pbkdf2_hmac("sha256", password, salt, 600000, 48)
print("PBKDF2 key starts", kiv[:8].hex().upper(), "iv starts", kiv[32:40].hex().upper())
```

It prints:

```
md5    key=e7b0971e52ca5cc8... iv=8d450e2ed75a84a9... matches openssl: True
sha256 key=2435177f1410536b... iv=f96efc044e0f1613... matches openssl: True
MD5(password + salt) = e7b0971e52ca5cc8d0539fb3412f6316
PBKDF2 key starts 4E29ABD8DF66BD00 iv starts 9938EF821B8C8D63
```

The third line is the point. The first sixteen bytes of the AES key that
protects the file are `MD5("password" || salt)`, nothing more; you can check it
with any MD5 tool by hashing the eight letters followed by the eight salt
bytes. The salt is in the file. So an attacker with the file computes, for each
guess, one MD5 to get the first half of the key, one more for the second half,
and one AES block decryption, and checks whether the result ends in valid
padding (or, better for the attacker, looks like the start of a `tar` or
`gzip` file, whose first bytes are fixed). No step is slow.

The PBKDF2 line also matches OpenSSL: `-pbkdf2` derives key and IV together as
48 bytes of PBKDF2-HMAC-SHA256 output. Without `-iter`, OpenSSL 3.0 uses
10,000 iterations, a number chosen in 2018 and far below today's guidance.

### Break it: how fast a guess is

How much does the iteration count matter? The program below times the
derivation step only, the part the defender controls, for EVP_BytesToKey with
MD5 and for PBKDF2-HMAC-SHA256 at 600,000 iterations, the figure OWASP gives
for PBKDF2 with SHA-256 (see [Chapter 13](13-Passwords-on-the-Server.md)).

```python
# How many password guesses per second does each key derivation allow?
# An attacker who holds an `openssl enc` file knows the salt (bytes 8 to 15).
# Each guess needs one key derivation and one block decryption; here we time
# only the derivation, which is the part the defender controls.
import hashlib, time

def evp_bytes_to_key(password, salt, n=48):
    out, block = b"", b""
    while len(out) < n:
        block = hashlib.md5(block + password + salt).digest()
        out += block
    return out[:n]

salt = bytes.fromhex("13e92692ad7c7040")       # the salt from the msg.enc dump above
guesses = [f"guess{i}".encode() for i in range(200000)]

t = time.perf_counter()
for g in guesses:
    evp_bytes_to_key(g, salt)
evp_rate = len(guesses) / (time.perf_counter() - t)

t = time.perf_counter()
for g in guesses[:3]:
    hashlib.pbkdf2_hmac("sha256", g, salt, 600000, 48)
pbkdf2_rate = 3 / (time.perf_counter() - t)

print(f"EVP_BytesToKey (MD5, 1 round):   {evp_rate:12,.0f} guesses/s")
print(f"PBKDF2-SHA256, 600,000 rounds:   {pbkdf2_rate:12,.1f} guesses/s")
print(f"ratio: {evp_rate / pbkdf2_rate:,.0f} to 1")

# Time to try every lowercase password of 8 letters on this one core:
space = 26 ** 8
for name, rate in (("EVP_BytesToKey", evp_rate), ("PBKDF2 600k", pbkdf2_rate)):
    days = space / rate / 86400
    print(f"{name:15} all 26^8 = {space:,} passwords: {days:,.1f} days")
```

Example timings from one run on the container used for this chapter (one core,
CPython; your numbers will differ, and they change from run to run):

```
EVP_BytesToKey (MD5, 1 round):        765,079 guesses/s
PBKDF2-SHA256, 600,000 rounds:            5.6 guesses/s
ratio: 135,986 to 1
EVP_BytesToKey  all 26^8 = 208,827,064,576 passwords: 3.2 days
PBKDF2 600k     all 26^8 = 208,827,064,576 passwords: 429,596.6 days
```

The ratio is the useful number, and it is about what arithmetic predicts.
Three MD5 calls against 2,400,000 SHA-256 compressions in PBKDF2 (two per
iteration, because each HMAC is an inner and an outer hash over one block, and
two output blocks, because 48 bytes is more than one SHA-256 output) is a
factor of several hundred thousand, minus Python's overhead per call, which
flatters the fast function. $\log_2 136{,}000 \approx 17$: the iterations add about
seventeen bits of work to every guess, the same as making a random lowercase
password three or four letters longer.

The absolute numbers are a floor, not a ceiling. Python spends most of its
time on interpreter overhead; an optimized cracker on one GPU computes MD5
tens of billions of times a second, and John the Ripper ships a converter,
`openssl2john`, for exactly this format (OpenSSL's `Salted__` files with
EVP_BytesToKey). Against an eight-letter lowercase password, three days on one
Python core becomes seconds on a GPU. PBKDF2 slows the GPU by the same
factor as the CPU, which is why a memory-hard function such as scrypt or
Argon2 is better still (book 1's
[Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)); `openssl enc`
offers neither.

### Break it: `-nosalt`

The salt costs eight bytes and is the only random thing in the default
derivation. `-nosalt` removes it, and older scripts used it so that two runs
produced the same output, which some backup tools liked for deduplication.
Then the same password always produces the same key and IV:

```
$ for i in 1 2; do printf 'hello\n' | openssl enc -aes-256-cbc -nosalt -pbkdf2 -pass pass:x | od -A n -t x1; done
 68 43 fd b7 15 c3 ee 5f f5 16 ce a7 3e 7e 97 53
 68 43 fd b7 15 c3 ee 5f f5 16 ce a7 3e 7e 97 53
$ for i in 1 2; do printf 'hello\n' | openssl enc -aes-256-cbc -pbkdf2 -pass pass:x | od -A n -t x1; done
 53 61 6c 74 65 64 5f 5f 8e 1b 36 84 08 5c 60 de
 4f 2c 64 3f 6c 60 e1 d7 bb e3 ba 0a 9d 19 13 26
 53 61 6c 74 65 64 5f 5f 27 db 1e fd ff 05 9a 94
 ba 26 1d 1e 6f a1 c0 f2 c2 5c f4 e2 fd 3f 63 96
```

Without a salt, two files encrypted with the same password and starting with
the same bytes start with the same ciphertext blocks, so an observer learns
which files are equal or share a prefix. Worse, an attacker can precompute:
derive the keys for a list of a billion likely passwords once, and test every
unsalted file ever captured against that table without repeating the work. The
salted runs above differ completely, even with the same input and password,
because the salt changes the key and the IV. Salting is the default in every
OpenSSL still in use, so `-salt` in the §15.1 command does nothing today, and
`-nosalt` should never appear in a new script.

### Fix it

If you must use `openssl enc`, use it this way:

```
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass file:/run/secrets/backup_pw -in backup.tar -out backup.tar.enc
```

and record the full command (cipher, `-pbkdf2`, iteration count, digest)
beside the file, because the file does not. The flags fix the key derivation
and the password's route (next section), but not the missing authentication.
For new work the better fix is to stop using `openssl enc` for files at all:
age with a passphrase uses scrypt and authenticated encryption, and age with
an X25519 recipient needs no password on the encrypting machine at all
(§15.8). The [openssl card](../../tools/openssl.md) leaves `enc` out
entirely.

What to do:

- Find every `openssl enc` in your scripts and runbooks. Each one without
  `-pbkdf2` and a high `-iter` protects its files with one hash per guess.
- To read an old file, try `-md md5` (files from OpenSSL before 1.1.0) and
  `-md sha256`; then re-encrypt with age and delete the old copy.
- Never use `-nosalt`. Never rely on the password alone being strong enough
  to make up for a fast derivation.

## 15.5 What `openssl enc` does not protect

*Level: intermediate.*

### No authentication

`openssl enc` encrypts; it does not authenticate. Ask it for an AEAD mode and
it refuses:

```
$ openssl enc -aes-256-gcm -k password -in msg.txt -out x
enc: AEAD ciphers not supported
enc: Use -help for summary.
```

The refusal is deliberate. A streaming command-line tool that decrypts with
GCM would have to either hold the whole output until it had checked the tag
at the end, or write out plaintext before knowing whether it is genuine;
OpenSSL's developers chose to support neither. So every mode `enc` accepts is
unauthenticated, and every file it writes can be changed without the key.

With CTR mode the change is exact. Encrypt a payment order, flip bits in one
ciphertext byte, and decrypt:

```
$ printf 'pay alice $100\n' > order.txt
$ openssl enc -aes-256-ctr -pbkdf2 -iter 600000 -pass pass:correct-horse -in order.txt -out order.enc
$ python3 -c "
b=bytearray(open('order.enc','rb').read()); i=16+11; b[i]^=ord('1')^ord('9'); open('order.enc','wb').write(b)"
$ openssl enc -d -aes-256-ctr -pbkdf2 -iter 600000 -pass pass:correct-horse -in order.enc
pay alice $900
$ echo $?
0
```

The attacker never saw the password. They knew (or guessed) that byte 11 of
the plaintext was `1`, skipped the 16-byte header, and XORed the ciphertext
byte with `'1' XOR '9'`; CTR turns that into the same change in the
plaintext, and the exit status is 0. With CBC, a flipped bit garbles one block
and flips the same bit in the next; a change in the last block usually
breaks the padding, so `enc -d` prints `bad decrypt` and exits 1, which looks
like protection but is not. A program that reports padding errors differently
from other errors is a padding oracle, and Cryptanalysis
[Chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md) shows how such
an oracle decrypts the whole file. [Chapter 1](01-What-Cryptographic-Engineering-Is.md)
of this book lists unauthenticated encryption among the five classic
mistakes; `openssl enc` is that mistake as a command.

If you are stuck with `enc`, compute an HMAC over the encrypted file with a
separate key (`openssl dgst -sha256 -mac HMAC`) and check it before
decrypting: encrypt-then-MAC built by hand, one more thing to get wrong. age
does it for you.

### Passwords on the command line

The §15.1 command passed the password as `-k "$BACKUP_PASSWORD"`. The shell
expands the variable before starting `openssl`, so the program's argument
list contains the password itself. On Linux and the BSDs, any user on the
machine can read any process's arguments: `ps aux` shows them, and so does
`/proc/<pid>/cmdline`, which is readable by everyone unless `/proc` is
mounted with `hidepid`. Monitoring agents and audit systems (`auditd`'s
`execve` records, endpoint security products) often log the full command line
of every process, so the password also ends up in log files kept for months.
And if a person types `-pass pass:hunter2` at a prompt, the shell writes it to
`~/.bash_history`.

The program below shows the leak. It starts a child process with the same
arguments an `openssl enc -pass pass:...` would have, and reads them back the
way `ps` does.

```python
# Break it: a password passed as an argument is visible to every user on the
# machine, through /proc/<pid>/cmdline (what `ps` reads). We start a child that
# stands in for `openssl enc -pass pass:...` and read its command line back.
import os, subprocess, sys, time

child = [sys.executable, "-c", "import time; time.sleep(1)", "-pass", "pass:hunter2"]
p = subprocess.Popen(child)
time.sleep(0.2)
if os.path.exists(f"/proc/{p.pid}/cmdline"):        # Linux; macOS ps shows the same
    with open(f"/proc/{p.pid}/cmdline", "rb") as f:
        args = f.read().split(b"\0")
    print("anyone can read:", [a.decode() for a in args if a][-2:], flush=True)
p.wait()

# Fix it: hand the secret over a pipe (openssl: -pass stdin or -pass fd:N), so it
# never appears in the argument list or in the shell history.
reader = "pw = input(); print('child got a password of', len(pw), 'characters')"
p = subprocess.Popen([sys.executable, "-c", reader, "-pass", "stdin"], stdin=subprocess.PIPE)
p.communicate(b"hunter2\n")
```

On Linux it prints:

```
anyone can read: ['-pass', 'pass:hunter2']
child got a password of 7 characters
```

OpenSSL's `-pass` and `-passin`/`-passout` options accept five sources, and
only the first is unsafe:

| Form | Where the secret travels | Verdict |
| --- | --- | --- |
| `-k pw`, `-pass pass:pw` | argument list: `ps`, `/proc`, audit logs, history | never |
| `-pass env:VAR` | the process environment, `/proc/<pid>/environ` | readable only by the same user and root; better |
| `-pass file:path` | a file, first line | good, if the file is mode 0600 or on a tmpfs |
| `-pass fd:N` | an open file descriptor | good, for programs calling `openssl` |
| `-pass stdin` | standard input | good, but then the data cannot come from stdin |

The other tools have the same split. `gpg --passphrase` puts the passphrase in
the argument list; `--passphrase-file` and `--passphrase-fd` do not.
`ssh-keygen -N` and `-P` put a new or old passphrase in the arguments, which is
acceptable for an empty one in a script and not for anything else.
`keytool -storepass` and `-keypass` do the same, and Java tutorials are full of
them; `keytool` also accepts `-storepass:env VAR` and `-storepass:file path`,
which most people never discover. When a tool has no safe option, run it
where no other user can see the process list, or let it prompt.

What to do:

- Grep scripts and CI configuration for `-k `, `pass:`, `--passphrase `,
  `-storepass ` and `-N '` with a non-empty value. Replace them with file,
  descriptor or environment forms.
- Keep shells from recording secrets: with `HISTCONTROL=ignorespace` in bash,
  a command that starts with a space is not saved; better, never type
  secrets as arguments at all.
- Never decrypt with `openssl enc` a file that an attacker could have
  changed, unless you first verify a MAC or signature over it.

## 15.6 `ssh-keygen`: fingerprints by hand

*Level: intermediate.*

The first time you connect to a server, `ssh` shows a fingerprint and asks
whether to continue. The same fingerprint is what `ssh-keygen -l` prints for a
public key, and what GitHub, GitLab and every careful administrator publish so
that users can check the answer. Here is GitHub's Ed25519 host key, as GitHub
publishes it in its documentation, and what `ssh-keygen` 9.6 says about it:

```
$ cat gh.pub
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl github.com
$ ssh-keygen -l -f gh.pub
256 SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU github.com (ED25519)
$ ssh-keygen -l -E md5 -f gh.pub
256 MD5:65:96:2d:fc:e8:d5:a9:11:64:0c:0f:ea:00:6e:5b:bd github.com (ED25519)
```

The line has three fields: the key type, the key in base64, and a comment
that `ssh-keygen` copies but nothing checks. The base64 field decodes to a
**key blob** in SSH's wire format (RFC 4251 §5, RFC 8709 for Ed25519): a list of strings, each
written as a four-byte big-endian length followed by the bytes. For Ed25519
the blob is the string `ssh-ed25519` and the 32-byte public key, 51 bytes in
all. The fingerprint is the SHA-256 of the blob, written in base64 with the
trailing `=` removed (Figure 15.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="An SSH public key line is split, its base64 field decoded into a blob of length-prefixed strings, the blob hashed with SHA-256 and written as base64 without padding" fill="currentColor" font-size="14">
<rect x="20" y="20" width="100" height="34" fill="none" stroke="currentColor"/>
<text x="70" y="42" text-anchor="middle">ssh-ed25519</text>
<rect x="120" y="20" width="380" height="34" fill="none" stroke="currentColor"/>
<text x="310" y="42" text-anchor="middle">AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnk...</text>
<rect x="500" y="20" width="120" height="34" fill="none" stroke="currentColor"/>
<text x="560" y="42" text-anchor="middle">comment</text>
<line x1="310" y1="54" x2="310" y2="88" stroke="currentColor"/>
<polygon points="305,88 310,96 315,88"/>
<text x="320" y="78" opacity="0.7">base64 decode</text>
<rect x="60" y="100" width="90" height="34" fill="none" stroke="currentColor"/>
<text x="105" y="122" text-anchor="middle">00 00 00 0b</text>
<rect x="150" y="100" width="130" height="34" fill="none" stroke="currentColor"/>
<text x="215" y="122" text-anchor="middle">"ssh-ed25519"</text>
<rect x="280" y="100" width="90" height="34" fill="none" stroke="currentColor"/>
<text x="325" y="122" text-anchor="middle">00 00 00 20</text>
<rect x="370" y="100" width="210" height="34" fill="none" stroke="currentColor"/>
<text x="475" y="122" text-anchor="middle">32-byte public key</text>
<text x="60" y="152" opacity="0.7">the blob: 51 bytes of length-prefixed strings</text>
<line x1="310" y1="158" x2="310" y2="186" stroke="currentColor"/>
<polygon points="305,186 310,194 315,186"/>
<text x="320" y="178" opacity="0.7">SHA-256, then base64 without "="</text>
<text x="320" y="225" text-anchor="middle">SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU</text>
</svg>
<figcaption>Figure 15.4. How <code>ssh-keygen -l</code> computes a fingerprint.
The comment is not covered, so two lines with different comments and the same
key have the same fingerprint.</figcaption>
</figure>

### Code it: an SSH fingerprint

```python
# An SSH fingerprint by hand: SHA-256 of the key blob, in base64 without "=".
# The line is GitHub's Ed25519 host key, as GitHub publishes it.
import base64, hashlib, struct

line = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl github.com"
kind, b64, comment = line.split(maxsplit=2)
blob = base64.b64decode(b64, validate=True)

# The blob is a list of SSH "strings": a 4-byte big-endian length, then the bytes.
fields, i = [], 0
while i < len(blob):
    (n,) = struct.unpack(">I", blob[i:i + 4])
    fields.append(blob[i + 4:i + 4 + n])
    i += 4 + n
print("fields:", fields[0].decode(), "+", len(fields[1]), "byte key")
assert fields[0].decode() == kind            # the type inside must match the type outside

sha = hashlib.sha256(blob).digest()
print("SHA256:" + base64.b64encode(sha).decode().rstrip("="))
md5 = hashlib.md5(blob).hexdigest()
print("MD5:" + ":".join(md5[k:k + 2] for k in range(0, 32, 2)))
```

It prints:

```
fields: ssh-ed25519 + 32 byte key
SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
MD5:65:96:2d:fc:e8:d5:a9:11:64:0c:0f:ea:00:6e:5b:bd
```

Both lines match `ssh-keygen` exactly. The shell version from the
[ssh-keygen card](../../tools/ssh-keygen.md),
`cut -d' ' -f2 key.pub | base64 -d | openssl dgst -sha256 -binary | base64`,
computes the same thing and leaves the `=` on. The number `256` that
`ssh-keygen` prints first is the key size in bits, not part of the
fingerprint.

### Reading what ssh-keygen shows

**MD5 or SHA-256.** Before OpenSSH 6.8 (March 2015), fingerprints were MD5 in
colon-separated hex, and many old wiki pages and server banners still show
them. MD5's collisions do not directly let an attacker match a given key's
fingerprint (that would need a second preimage), but there is no reason to
compare 128-bit MD5 values when the tool can give SHA-256; `-E md5` exists so
you can match old records. A 43-character base64 SHA-256 fingerprint is
still long for a human, and people check the first and last few characters,
so an attacker who could make a key whose fingerprint agrees in those
places would fool many of them. With SHA-256, matching 8 base64 characters at
each end means about $2^{94}$ tries (the last character carries only 4 bits),
out of reach; matching 3 at each end is about $2^{34}$, within reach of one machine running a vanity-key generator. Compare
the whole string, or let a program do it.

**Randomart.** `ssh-keygen -lv` and `ssh -o VisualHostKey=yes` also print a
small picture:

```
$ ssh-keygen -lv -f id_ed25519.pub
256 SHA256:J5eJc7eCuAqJd/0dTB9EpJFwYsgvNOmw0s3u7PVML/c alice@laptop (ED25519)
+--[ED25519 256]--+
|     . o+.ooo    |
|    . *. o.+     |
|   . B o  . .    |
|  . o = .. +     |
|   . . .S B o    |
| . . ... X o o   |
|. + .oo o = o    |
| . o  o+ =.+.    |
|    .oo . +o..E  |
+----[SHA256]-----+
```

The picture, added in OpenSSH 5.1 (2008), is a walk on a 17 by 9 grid
driven by the fingerprint's bits, two bits per step, starting at the center
(`S`) and ending at `E`; each cell's symbol counts the visits. The idea is
that people remember shapes better than hex. A 2009 analysis by Dirk Loss,
Tobias Limmer and Alexander von Gernler, "The drunken bishop", worked out its
properties; it is a recognition aid, not a check, and nobody has shown it can
replace comparing the fingerprint.

**Trust on first use.** `ssh` stores the host key in `~/.ssh/known_hosts` the
first time you say yes, and refuses with `REMOTE HOST IDENTIFICATION HAS
CHANGED!` if it ever differs. The first yes is the moment of trust: if an
attacker sits between you and the server at that moment, you store the
attacker's key. Protocols
[Chapter 6](../protocols/06-SSH.md#65-trusting-the-server) covers the
alternatives (SSHFP records in DNSSEC, SSH certificates); for the command line,
the defense is to compare the fingerprint `ssh` shows with one obtained some
other way, such as the provider's documentation fetched over HTTPS.

!!! note "Life story: GitHub's RSA host key, 2023"
    **Born:** GitHub's RSA SSH host key served every `git@github.com`
    connection over RSA for years · **Purpose:** to let clients check they
    were talking to GitHub · **Helped:** until 24 March 2023, when GitHub
    replaced it at about 05:00 UTC after finding that the private key had
    been briefly exposed in a public GitHub repository · **Retired:** that
    morning; every client with the old key in `known_hosts` got the
    "REMOTE HOST IDENTIFICATION HAS CHANGED" warning, and the right response
    was to delete the old line (`ssh-keygen -R github.com`) and check the new
    fingerprint against GitHub's published list · **Replaced by:** a new RSA
    key with fingerprint `SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s`;
    the Ed25519 and ECDSA keys did not change

That morning showed both sides of trust on first use. The warning worked: no
client silently accepted the new key. But the only way to know that the
warning was a planned rotation and not an attack was to read GitHub's blog and
compare fingerprints, and many users simply deleted the line and said yes to
whatever key came next, which is exactly what an attacker in the middle
would want.

Two older lessons sit under every fingerprint. A fingerprint names a key; it
says nothing about how the key was made, and the SSH keys generated on Debian
and Ubuntu between September 2006 and May 2008 came from a generator seeded
with at most 15 bits (Cryptanalysis
[Chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)). And the
private key file is only as strong as its passphrase and key derivation:
OpenSSH's format uses `bcrypt_pbkdf` (24 rounds by default since 9.4, though
the 9.6 manual page still says 16; more with `-a`), while the old PEM format it can still write uses the one-round MD5
`EVP_BytesToKey` of §15.4 ([Chapter 3](03-ASN1-DER-and-Key-Files.md)).

What to do:

- Check a host key's SHA-256 fingerprint against one published over a
  different channel before the first connection, and again after any
  "HOST IDENTIFICATION HAS CHANGED" warning.
- Distribute host keys ahead of time where you can (a managed
  `known_hosts`, or an SSH CA with `@cert-authority`) so that users never have
  to make the first-use decision.
- Keep private keys in OpenSSH's own format (the default since 7.8), with a
  passphrase and a higher `-a` than the default if the key matters.

## 15.7 `gpg`: packets, defaults and trust

*Level: intermediate.*

### Reading `--list-packets`

An OpenPGP file is a sequence of **packets**, each a header (a tag that says
what the packet is, and a length) followed by a body; some bodies contain
further packets. `gpg --list-packets` prints that structure, and it is the
command that tells you what a file really contains, as opposed to what gpg
decided to say about it. Here is a detached signature made by a fresh GnuPG
2.4.4 key for Alice:

```
$ gpg --list-packets rel.txt.sig
# off=0 ctb=88 tag=2 hlen=2 plen=136
:signature packet: algo 22, keyid 66C5DA724FC22730
	version 4, created 1794244846, md5len 0, sigclass 0x00
	digest algo 10, begin of digest ce 1a
	hashed subpkt 33 len 21 (issuer fpr v4 D71FC5FE281373368A6A829E66C5DA724FC22730)
	hashed subpkt 2 len 4 (sig created 2026-11-09)
	hashed subpkt 28 len 17 (signer's user ID)
	subpkt 16 len 8 (issuer key ID 66C5DA724FC22730)
	data: [253 bits]
	data: [256 bits]
```

Line by line: `ctb=88` is the first byte of the packet, the "cipher type
byte"; `tag=2` means a signature packet; `hlen=2 plen=136` means a two-byte
header and 136 bytes of body. `algo 22` is EdDSA, `digest algo 10` is SHA-512,
`sigclass 0x00` means a signature over a binary document. The **subpackets**
carry the signature's metadata. Those in the hashed area (issuer fingerprint,
creation time, signer's user ID) are covered by the signature; the one in the
unhashed area (the 8-byte issuer key ID) is not, so an attacker can change it
freely, and a verifier must never rely on it. `begin of digest ce 1a` is the
first two bytes of the hash being signed, a quick check that lets gpg reject
the wrong file before doing the public-key operation. The two `data:` lines are
the Ed25519 signature's two halves, $R$ and $S$.

The key's own packets look the same:

```
$ gpg --list-packets alice.asc | head -6
# off=0 ctb=98 tag=6 hlen=2 plen=51
:public key packet:
	version 4, algo 22, created 1794244846, expires 0
	pkey[0]: [80 bits] ed25519 (1.3.6.1.4.1.11591.15.1)
	pkey[1]: [263 bits]
	keyid: 66C5DA724FC22730
```

### Code it: packets and a fingerprint by hand

A version 4 fingerprint, the 40 hex digits gpg prints for every key, is the
SHA-1 of the byte `0x99`, a two-byte length and the public key packet's body
(RFC 4880 §12.2, kept in RFC 9580 §5.5.4.2). The key ID is its last 8 bytes.
The program below reads the two packets above from gpg's real output, prints
their headers the way `--list-packets` does, and computes the fingerprint.

```python
# Read OpenPGP packets the way `gpg --list-packets` does, and compute a v4
# fingerprint. Both inputs are real gpg 2.4.4 output (Alice's key, made for this chapter).
import base64, hashlib

pubkey = base64.b64decode("mDMEavIA7hYJKwYBBAHaRw8BAQdAFC1KAAJqIzKwASLPjengfVrz0T2if2rjSfhuKeEVfBs=")
sig = base64.b64decode(
    "iIgEABYKADAWIQTXH8X+KBNzNopqgp5mxdpyT8InMAUCavIA7hIcYWxpY2VAZXhhbXBsZS5vcmcACgkQ"
    "ZsXack/CJzDOGgD9H4KPASEU4BRoL71xPU50GyRWdMQ95WdW2VMUtEywXW4BAOJ+HHa/04Q5NYQGG+oug78+"
    "6QGo9lZjZI1F1RF65EAE")

def packet(buf):
    """Old-format packet header (bit 6 clear): tag in bits 5-2, length type in bits 1-0."""
    ctb = buf[0]
    assert ctb & 0x80 and not ctb & 0x40, "only old-format headers in this sketch"
    tag, ltype = (ctb >> 2) & 0x0F, ctb & 3
    size = {0: 1, 1: 2, 2: 4}[ltype]
    hlen = 1 + size
    return tag, hlen, int.from_bytes(buf[1:hlen], "big")

tag, hlen, plen = packet(pubkey)
body = pubkey[hlen:hlen + plen]
print(f"ctb={pubkey[0]:02x} tag={tag} hlen={hlen} plen={plen}  version {body[0]}, algo {body[5]}")
# v4 fingerprint: SHA-1 over 0x99, a two-byte length and the key packet body.
fpr = hashlib.sha1(b"\x99" + plen.to_bytes(2, "big") + body).hexdigest().upper()
print("fingerprint", fpr, " key ID", fpr[-16:])

tag, hlen, plen = packet(sig)
s = sig[hlen:hlen + plen]
print(f"ctb={sig[0]:02x} tag={tag} hlen={hlen} plen={plen}  version {s[0]}, "
      f"sigclass 0x{s[1]:02x}, algo {s[2]}, digest algo {s[3]}")
i = 4
for area in ("hashed", "unhashed"):
    n = int.from_bytes(s[i:i + 2], "big")
    j, end = i + 2, i + 2 + n
    while j < end:
        size, kind = s[j], s[j + 1] & 0x7F       # one-byte subpacket lengths only, as here
        print(f"  {area} subpkt {kind} len {size - 1}")
        j += 1 + size
    i = end
print("begin of digest", s[i:i + 2].hex(" "))
```

It prints:

```
ctb=98 tag=6 hlen=2 plen=51  version 4, algo 22
fingerprint D71FC5FE281373368A6A829E66C5DA724FC22730  key ID 66C5DA724FC22730
ctb=88 tag=2 hlen=2 plen=136  version 4, sigclass 0x00, algo 22, digest algo 10
  hashed subpkt 33 len 21
  hashed subpkt 2 len 4
  hashed subpkt 28 len 17
  unhashed subpkt 16 len 8
begin of digest ce 1a
```

Every value agrees with gpg's own listing, and the fingerprint is the one gpg
printed when it made the key. Note what the fingerprint is: SHA-1, in 2026,
naming the key that every signature and every certification refers to.
Version 4 fingerprints cannot change without changing every key, which is one
reason both RFC 9580's version 6 and LibrePGP's version 5 keys use SHA-256.
Nobody has shown a second preimage on SHA-1, which is what forging a given
fingerprint would need, but collisions are enough for other damage (below).

### Encrypted files and gpg's defaults

Encrypted messages are packet trees, and `--list-packets` shows the choices
gpg made. Encrypting to Alice's key and with a passphrase gave:

```
$ gpg --list-packets e.gpg          # to Alice's key; trimmed, gpg's own messages left out
# off=0 ctb=84 tag=1 hlen=2 plen=94
:pubkey enc packet: version 3, algo 18, keyid DBEE5D133602DCBB
# off=96 ctb=d4 tag=20 hlen=2 plen=93 new-ctb
:aead encrypted packet: cipher=9 aead=2 cb=16
# off=117 ctb=a3 tag=8 hlen=1 plen=0 indeterminate
:compressed packet: algo=2
$ gpg --list-packets order.gpg      # gpg -c, a passphrase; gpg's own messages left out
# off=0 ctb=8c tag=3 hlen=2 plen=13
:symkey enc packet: version 4, cipher 9, aead 0, s2k 3, hash 10
	salt 490DE1BADB8A3A1D, count 65011712 (255)
# off=15 ctb=d2 tag=18 hlen=2 plen=77 new-ctb
:encrypted data packet:
	length: 77
	mdc_method: 2
# off=36 ctb=a3 tag=8 hlen=1 plen=0 indeterminate
:compressed packet: algo=1
# off=38 ctb=ac tag=11 hlen=2 plen=30
:literal data packet:
	mode b (62), created 1794244857, name="order.txt",
	raw data: 15 bytes
```

Figure 15.5 draws both trees. To a key, gpg 2.4 wrote a public-key encrypted
session key (tag 1, ECDH on Curve25519, algorithm 18) and then a tag 20
packet: AES-256 (cipher 9) in OCB mode (aead 2), LibrePGP's container, which
it uses because Alice's key announces OCB support. An RFC 9580 implementation
such as Sequoia would not read that packet. With a passphrase, gpg could not
know what the reader's software supports, so it fell back to the older tag 18
packet: AES-256 in CFB mode with the **MDC**, a SHA-1 hash of the plaintext
encrypted along with it. The passphrase goes through the iterated and salted
S2K (`s2k 3`), here hashing 65,011,712 bytes of repeated salt and passphrase
with SHA-512 (`hash 10`, from a Debian patch; upstream 2.4 uses SHA-256),
which is the largest count the format can encode. That is about half a
million SHA-512 compressions per guess, the same order as the PBKDF2 of
§15.4, and still not memory-hard: RFC 9580 adds Argon2, and GnuPG does not use it.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Two OpenPGP packet trees: a public-key encrypted message with a tag 1 session key packet and a tag 20 OCB packet holding compressed and literal data; a passphrase message with a tag 3 packet and a tag 18 CFB plus MDC packet" fill="currentColor" font-size="14">
<text x="20" y="22">gpg -e -r alice (to a key)</text>
<rect x="20" y="32" width="170" height="44" fill="none" stroke="currentColor"/>
<text x="30" y="52">tag 1: session key</text>
<text x="30" y="70" opacity="0.7">ECDH (18), key ID</text>
<rect x="200" y="32" width="420" height="90" fill="none" stroke="currentColor"/>
<text x="210" y="52">tag 20: AES-256 OCB (LibrePGP), 4 MiB chunks</text>
<rect x="220" y="62" width="390" height="50" fill="none" stroke="currentColor" opacity="0.7"/>
<text x="230" y="82">tag 8: compressed</text>
<rect x="380" y="70" width="220" height="34" fill="none" stroke="currentColor" opacity="0.7"/>
<text x="390" y="92">tag 11: literal (name, data)</text>
<text x="20" y="152">gpg -c (a passphrase)</text>
<rect x="20" y="162" width="170" height="44" fill="none" stroke="currentColor"/>
<text x="30" y="182">tag 3: S2K salt,</text>
<text x="30" y="200" opacity="0.7">count, hash</text>
<rect x="200" y="162" width="420" height="90" fill="none" stroke="currentColor"/>
<text x="210" y="182">tag 18: AES-256 CFB + SHA-1 MDC at the end</text>
<rect x="220" y="192" width="390" height="50" fill="none" stroke="currentColor" opacity="0.7"/>
<text x="230" y="212">tag 8: compressed</text>
<rect x="380" y="200" width="220" height="34" fill="none" stroke="currentColor" opacity="0.7"/>
<text x="390" y="222">tag 11: literal (name, data)</text>
</svg>
<figcaption>Figure 15.5. What gpg 2.4.4 wrote for the two encryptions above. The
outer packets are visible to anyone; the inner ones appear in
<code>--list-packets</code> only after decryption. Only the bottom tree's
integrity check depends on SHA-1 and on the reader honoring it.</figcaption>
</figure>

### EFAIL and the integrity check that was optional

The MDC came into use around 2001, against chosen-ciphertext attacks on
unprotected CFB, and was written into RFC 4880 in 2007. For years gpg treated it as advice: if a
message had no MDC, or the MDC failed, gpg printed a warning, returned an
error code, and **still wrote out the decrypted plaintext**. In May 2018 the
EFAIL researchers (Poddebniak, Dresen, Müller, Ising, Schinzel, Friedberger,
Somorovsky and Schwenk) showed what that means in an email client: an
attacker who captured an encrypted message could edit its ciphertext so that
the decrypted HTML contained an image link carrying the plaintext to the
attacker's server, and clients that rendered gpg's output despite the warning
sent it there. GnuPG 2.2.8 (June 2018) made a missing MDC a hard failure for
modern ciphers. The full story belongs to Protocols
[Chapter 15](../protocols/index.md) and to this book's
[Chapter 1](01-What-Cryptographic-Engineering-Is.md); the lesson for the
command line is narrower. A tool that writes plaintext before it has checked
integrity, or that signals failure only through a warning or an exit code, is
relying on every caller to check. Many did not.

### What "Good signature" means, and what the exit code means

Verify Alice's signature on a keyring that has imported her public key but
not certified it:

```
$ gpg --verify rel.txt.sig rel.txt
gpg: Signature made Mon Nov  9 17:20:46 2026 UTC
gpg:                using EDDSA key D71FC5FE281373368A6A829E66C5DA724FC22730
gpg:                issuer "alice@example.org"
gpg: Good signature from "Alice Example <alice@example.org>" [unknown]
gpg: WARNING: The key's User ID is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
Primary key fingerprint: D71F C5FE 2813 7336 8A6A  829E 66C5 DA72 4FC2 2730
$ echo $?
0
```

"Good signature" means only that the mathematics checked out against some key
in the keyring. `[unknown]` means gpg has no reason to believe that key belongs
to Alice, and the exit status is 0 anyway. Any key the attacker can get into
your keyring (`gpg --import` of a file from the same server as the download,
or an automatic key fetch) produces this same "Good signature". A changed file
gives `BAD signature` and exit 1, so a script that only checks the exit code
learns "signed by some key I hold", not "signed by the release key".

Scripts therefore need one of three things. `gpgv` with a keyring file that
holds only the keys you trust (`gpgv --keyring ./release-keys.gpg sig file`)
treats every key in that file as trusted and no other. `gpg --assert-signer
FINGERPRINT` (2.4.1 and later) makes the exit status 0 only for that key. Or
the machine-readable status lines, `--status-fd`, read for `VALIDSIG` with the
expected fingerprint:

```
$ gpg --status-fd 1 --verify rel.txt.sig rel.txt 2>/dev/null
[GNUPG:] NEWSIG alice@example.org
[GNUPG:] KEY_CONSIDERED D71FC5FE281373368A6A829E66C5DA724FC22730 0
[GNUPG:] SIG_ID 28zbysaifdiYQq6XTc3LXtnhYrg 2026-11-09 1794244846
[GNUPG:] GOODSIG 66C5DA724FC22730 Alice Example <alice@example.org>
[GNUPG:] VALIDSIG D71FC5FE281373368A6A829E66C5DA724FC22730 2026-11-09 1794244846 0 4 0 22 10 00 D71FC5FE281373368A6A829E66C5DA724FC22730
[GNUPG:] TRUST_UNDEFINED 0 pgp alice@example.org
```

Status lines have their own history.

!!! note "Life story: SigSpoof (CVE-2018-12020)"
    **Born:** June 2018, found by Marcus Brinkmann · **Purpose:** an attack
    on programs that read gpg's status lines: gpg printed the file name stored
    in a message's literal data packet into its log output without escaping
    it, so a name containing a newline and `[GNUPG:] GOODSIG ...` injected a
    fake status line wherever the log and status streams were mixed ·
    **Helped:** forge "good signature" displays in Enigmail and GPGTools and
    fool some scripts using python-gnupg, without any key · **Retired:**
    GnuPG 2.2.8 and 1.4.23 (June 2018) escape the name · **Replaced by:**
    the rule that status output goes to its own descriptor, never mixed with
    the human log

### The Web of Trust and SHA-1

The `[unknown]` above would become `[full]` if a key you trust had
**certified** Alice's key: signed her user ID and public key. That is the Web of
Trust. A certification is a signature, and for most of OpenPGP's life it was a
SHA-1 signature. In January 2020 Gaëtan Leurent and Thomas Peyrin's "SHA-1 is
a Shambles" built a chosen-prefix collision with two months of rented GPU
time on 900 GPUs (they paid about \$75,000, and put the cost at cheaper
rental prices at about \$45,000) and used it to make two
keys with different user IDs whose certification requests collided, so that a certification of one was valid on the other.
GnuPG had anticipated it: 2.2.18 (November 2019) stopped trusting SHA-1
identity signatures made after 19 January 2019. Cryptanalysis
[Chapter 9](../cryptanalysis/09-Breaking-Hash-Functions.md#99-sha-1) tells
the attack. Older certifications made with SHA-1 are still accepted, and
version 4 fingerprints are still SHA-1, so old keyrings carry the hash.

The keyservers that spread certifications had a problem of their own. In June
2019 attackers flooded the public keys of two well-known OpenPGP developers,
Robert J. Hansen and Daniel Kahn Gillmor, with tens of thousands of bogus
certifications on the SKS keyserver network, which by design never deleted
anything. Importing those keys made GnuPG slow to the point of unusable.
GnuPG 2.2.17 (July 2019) stopped importing third-party certifications from
keyservers by default, and the new keys.openpgp.org server publishes only
self-signatures and only user IDs whose owners confirm them by email. The Web
of Trust as a global network has effectively ended; what remains is
fingerprints checked by hand or published in places you already trust.

What to do:

- In scripts, verify with `gpgv` and a dedicated keyring, or with
  `--assert-signer`, or check `VALIDSIG` for the exact fingerprint in
  `--status-fd` output. Never treat exit status 0 from `gpg --verify` as
  "signed by the right person".
- Always name both the signature and the data file on the command line; with
  one argument, gpg guesses the data file name.
- Look at `--list-packets` when you need to know what a file contains: which
  packet type, which cipher, whether there is integrity protection.
- Do not encrypt to people whose software may be an RFC 9580 implementation
  without checking that it reads what gpg writes, and the reverse.

## 15.8 age and keytool

*Level: intermediate.*

### age: the tool that replaced `openssl enc`

Encrypting the order file of §15.5 with age to an X25519 recipient and
looking at the start of the result shows the whole design in four lines:

```
$ age-keygen -o agekey.txt
Public key: age1gsxaj2tffchyfl5sa206szqj7j32n3rs7p6xwntpx765a6he6dwsfgsts6
$ age -r age1gsxaj2tffchyfl5sa206szqj7j32n3rs7p6xwntpx765a6he6dwsfgsts6 -o order.age order.txt
$ head -c 200 order.age | sed -n 1,4p
age-encryption.org/v1
-> X25519 8gwXFxk/GlvW7rhV6n52vtNuJO84uadgZrcLcbB3iS8
j4qAEtHp7utEr887wObBIzZs3h/KVeyfBeCW7BKuVoI
--- bdYWsOLC0AJ4Pr8CQKx4bPnYg2x5Oc+VP7S9zVDgET0
```

The first line names the format version. Each `->` stanza wraps a random
16-byte file key for one recipient: here an ephemeral X25519 public key, and
below it the file key encrypted under a key derived from the shared secret.
The `---` line is an HMAC over the whole header, keyed from the file key, so
nobody can add, remove or change a recipient. The payload that follows is
ChaCha20-Poly1305 in 64 KiB chunks, each authenticated, with the last chunk
marked so that truncation is detected. Protocols
[Chapter 18](../protocols/index.md) codes the header.

Against the four flaws of §15.1, age answers each one by design rather than by
flag. With a recipient key there is no password on the encrypting machine at
all, so the backup job can run with only the public key, and a thief who takes
that machine cannot read old backups. With `age -p` the passphrase goes
through scrypt with a work factor of $2^{18}$, memory-hard. Every chunk is
authenticated, and a changed byte gives an error and no plaintext. There are no
algorithm options, so the reader in ten years needs only "age, version 1".
What age leaves out is just as deliberate: no signatures (pair it with
minisign or `ssh-keygen -Y`, §15.9), no keyring, no web of trust. The
[age card](../../tools/age.md) has the recipes, including SSH keys as
recipients and the post-quantum recipients of age 1.3.

### keytool: three habits to unlearn

`keytool`'s file formats are [Chapter 3](03-ASN1-DER-and-Key-Files.md#38-java-key-stores-and-telling-files-apart)'s
subject: JKS protected its integrity with one SHA-1 over the password, the
words `Mighty Aphrodite` and the file, so a stolen store can be attacked at one
hash per guess, and JDK 9 made PKCS#12 the default in 2017. Three habits of
the tool outlive the format.

**`-storepass changeit`.** The JDK's `cacerts` trust store has the password
`changeit`, and a generation of tutorials used that string, or `password`, for
every store. A trust store's password protects only its integrity, which
matters little for a file of public certificates; a key store's password
protects the private key. Give each key store a random password from a secret
manager, and pass it with `-storepass:file` or `-storepass:env` rather than as
an argument (§15.5).

**Answering yes without reading.** `keytool -importcert` prints the
certificate and asks `Trust this certificate? [no]:`. In a script there is no
terminal; the [keytool card](../../tools/keytool.md) found that keytool then
treats the answer as no, prints nothing alarming and still exits 0, so
scripts add `-noprompt`, which says yes to everything. Either way nobody
compared the fingerprint. Before adding a CA to a trust store, compare its
SHA-256 fingerprint (`keytool -printcert -file ca.crt`, or `openssl x509
-fingerprint -sha256`) with one from the CA itself.

**`-printcert -sslserver` as a test.** It accepts any chain and any host
name, so it shows what a server sends, never whether Java would trust it.

What to do:

- For encrypting files, use age (or gpg where you already have OpenPGP
  keys). Prefer recipient keys to passphrases when a machine encrypts
  unattended.
- Convert JKS stores to PKCS#12 with `keytool -importkeystore`, with a fresh
  random password.
- Check fingerprints before every `-importcert`; never let `-noprompt` stand
  in for that check.

## 15.9 Checking a download

*Level: intermediate.*

### A checksum from the same server

On Saturday 20 February 2016, the website of Linux Mint, then one of the most
popular desktop Linux distributions, was broken into. The attackers changed
the download page so that the link for Linux Mint 17.3 Cinnamon pointed to an
ISO image they had built, with the Tsunami IRC backdoor added, on their own
server. They also changed the checksum shown on the page, so that users who
did the careful thing, downloading the image and comparing its hash with the
published one, saw a match. The project found it within a day. Micah Lee's
analysis that week put the lesson in its title: "Backdoored Linux Mint, and the
Perils of Checksums". The project did publish a signed `sha256sum.txt`, but its
download page told users to check an MD5 sum from the same web page, and
almost nobody checked the signature.

!!! note "Life story: the Linux Mint ISO compromise, 2016"
    **Born:** 20 February 2016, when attackers took over the Linux Mint
    website · **Purpose:** to point the download link for Linux Mint 17.3
    Cinnamon at a backdoored ISO, with a checksum on the same page changed to
    match · **Helped:** an unknown number of people install a system with the
    Tsunami backdoor; the forum database was stolen as well ·
    **Retired:** the next day, when Clement Lefebvre announced the breach ·
    **Replaced by:** the general lesson that a checksum is only as trustworthy
    as the place you got it from, and a push toward checking signatures

A checksum detects a download damaged in transit or a mirror serving a stale
or wrong file. It cannot detect an attacker who controls the place the
checksum came from. The program below verifies a `sha256sum`-format list the
careful way, then shows that the care does not help against that attacker.

```python
# A checksum-file verifier for the sha256sum format ("<64 hex>  <name>", or
# " *<name>" for binary mode), strict about everything it does not understand.
import hashlib, os, re, tempfile

LINE = re.compile(r"([0-9a-fA-F]{64}) [ *](.+)")

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()

def verify(sums_text, folder, wanted):
    """Check the one file we downloaded; fail on anything odd."""
    entries = {}
    for n, line in enumerate(sums_text.splitlines(), 1):
        m = LINE.fullmatch(line)
        if not m:
            raise ValueError(f"line {n}: not a sha256sum line")
        name = m.group(2)
        if "/" in name or name in entries:
            raise ValueError(f"line {n}: path or duplicate name {name!r}")
        entries[name] = m.group(1).lower()
    if wanted not in entries:
        raise ValueError(f"{wanted} is not listed: nothing was verified")
    return sha256_file(os.path.join(folder, wanted)) == entries[wanted]

with tempfile.TemporaryDirectory() as d:
    with open(os.path.join(d, "hello-1.0.tar.gz"), "wb") as f:
        f.write(b"the real release\n")
    good = f"{sha256_file(os.path.join(d, 'hello-1.0.tar.gz'))}  hello-1.0.tar.gz\n"
    print("honest file, honest list:", verify(good, d, "hello-1.0.tar.gz"))

    # Break it: the attacker who can replace the download on the server can
    # replace SHA256SUMS on the same server. The check still passes.
    with open(os.path.join(d, "hello-1.0.tar.gz"), "wb") as f:
        f.write(b"the real release, plus a backdoor\n")
    print("bad file, honest list:   ", verify(good, d, "hello-1.0.tar.gz"))
    forged = f"{sha256_file(os.path.join(d, 'hello-1.0.tar.gz'))}  hello-1.0.tar.gz\n"
    print("bad file, forged list:   ", verify(forged, d, "hello-1.0.tar.gz"))
    try:
        verify(good, d, "hello-1.1.tar.gz")
    except ValueError as e:
        print("refused:", e)
```

It prints:

```
honest file, honest list: True
bad file, honest list:    False
bad file, forged list:    True
refused: hello-1.1.tar.gz is not listed: nothing was verified
```

The verifier is strict for good reasons: a list that does not mention the file
you downloaded must be an error, not a silent pass (GNU `sha256sum -c
--ignore-missing` prints `no file was verified` and exits 1 for the same
reason), and a name with a slash in it should never send a checker to some
other file. But the third line is the one that matters. Against the Linux Mint
attacker, the verifier was never the weak point; the list was. A checksum
moves the question "is this the right file?" to "is this the right list?", and
only a signature, made with a key the attacker does not have and checked
against a public key you obtained some other way, answers that.

### Signatures: four tools

Figure 15.6 shows the difference. The signing key never touches the web
server; the public key reached the user before the attack, in a previous
release, a printed fingerprint, an operating system image, or a package
manager's keyring.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Left: a compromised server holds the file and its checksum list, both replaced, and the user's check passes. Right: the server holds the file, the list and a signature; the signing key is offline and the user's public key came earlier by another route, so the check fails" fill="currentColor" font-size="14">
<text x="20" y="22">Checksum only</text>
<rect x="20" y="34" width="270" height="96" fill="none" stroke="currentColor"/>
<text x="32" y="56">web server (attacker controls)</text>
<text x="32" y="82">hello-1.0.tar.gz (replaced)</text>
<text x="32" y="108">SHA256SUMS (replaced)</text>
<line x1="155" y1="130" x2="155" y2="182" stroke="currentColor"/>
<polygon points="150,182 155,190 160,182"/>
<rect x="20" y="192" width="270" height="50" fill="none" stroke="currentColor"/>
<text x="32" y="222">user: sha256sum -c says OK</text>
<text x="350" y="22">Signature</text>
<rect x="350" y="34" width="270" height="96" fill="none" stroke="currentColor"/>
<text x="362" y="56">web server (attacker controls)</text>
<text x="362" y="82">file, SHA256SUMS (replaced)</text>
<text x="362" y="108">SHA256SUMS.sig (old or none)</text>
<rect x="510" y="150" width="110" height="40" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="518" y="175">key, offline</text>
<line x1="485" y1="130" x2="485" y2="182" stroke="currentColor"/>
<polygon points="480,182 485,190 490,182"/>
<rect x="350" y="192" width="270" height="50" fill="none" stroke="currentColor"/>
<text x="362" y="214">user, with public key from</text>
<text x="362" y="234">earlier: verification fails</text>
<text x="20" y="270" opacity="0.7">The difference is where trust comes from: the same server, or a key the attacker never held.</text>
</svg>
<figcaption>Figure 15.6. A checksum moves trust to the list; a signature moves
it to a key kept off the server and a public key delivered beforehand.</figcaption>
</figure>

**signify.** Ted Unangst wrote `signify` for OpenBSD, and OpenBSD 5.5
(May 2014) was the first release whose sets were signed with it. It does one
thing: Ed25519 signatures over files, with keys and signatures as one line of
base64 each. It has no key servers, no web of trust and no options for
algorithms. Each OpenBSD release ships the public keys for the next release,
so a user who trusted one installation can verify the next upgrade without
any outside channel; the first key still has to be checked another way, and
OpenBSD publishes its keys in several places so that users can compare them. The normal use signs the checksum list, not the files:

```
$ sha256sum --tag hello-1.0.tar.gz > SHA256
$ signify-openbsd -S -e -s rel.sec -m SHA256 -x SHA256.sig
$ cat SHA256.sig
untrusted comment: verify with rel.pub
RWRCSPfZHJgdkYSFf5ViNhqhIkpONFLLv0ARuTgov3nsDZWRE8y1Kdep0dNKy/v1pymW99aDCYTGj1cUhlmWa6P2VN3o15rAqgI=
SHA256 (hello-1.0.tar.gz) = 7694b53a866d4ff537b2f6c845da929094523cdb6b90056f0d25424c992f535d
$ signify-openbsd -C -p rel.pub -x SHA256.sig
Signature Verified
hello-1.0.tar.gz: OK
```

`-e` embeds the signed list in the signature file, and `-C` checks the
signature and then each file's hash in one step. signify reads the BSD
`SHA256 (name) = hash` format that `sha256sum --tag` writes; given the usual
GNU format it said `unable to parse checksum line` and exited 1. The "untrusted
comment" line is exactly that: not signed, so it may say anything.

**minisign.** Frank Denis wrote minisign in 2015, compatible with signify's
key format, and added two things: a **trusted comment** that is signed along
with the signature (a version number or date that an attacker cannot change),
and pre-hashing, where the signature covers a BLAKE2b-512 hash of the file so
that large files need not be held in memory. Version 0.11, used here, signs
the hash by default:

```
$ cat hello-1.0.tar.gz.minisig
untrusted comment: signature from minisign secret key
RURUeMRysf7pbHE3X66qBI46ncgWgeva9/QQEps4/XH9bFUPNOgwdZ0R9dewf0UTQ3SJ6dt5jl1BQ2z6i3F/u4hCddMmiUlD7wc=
trusted comment: hello 1.0
YZ1GLm6GUL9gnJ6+97k7HcFkDVeeT98hcimIqcGnoKgnfLsttGT9GtS2YmlFFSniXENPKO4T8Q3pElcczjqdCg==
$ minisign -V -p mini.pub -m hello-1.0.tar.gz
Signature and comment signature verified
Trusted comment: hello 1.0
```

Both formats are one line of base64: two algorithm bytes, an 8-byte key
number, then the 32-byte key or the 64-byte Ed25519 signature. `Ed` means
Ed25519 over the file itself; minisign's `ED` (the `RUR` at the start of the
signature above) means Ed25519 over the BLAKE2b-512 hash, which signify cannot
check. The key number only tells the verifier which key to use; it is not
secret and not a check, and an attacker can copy it into a forged file.

!!! note "Life story: signify and minisign"
    **Born:** signify by Ted Unangst for OpenBSD 5.5 (May 2014); minisign by
    Frank Denis (2015) · **Purpose:** signatures on releases with nothing
    else: one algorithm (Ed25519), one-line keys, no keyrings or trust
    models · **Helped:** every OpenBSD release and package since 2014;
    minisign signs libsodium, dnscrypt-proxy, Zig and many other projects'
    releases · **Status:** both active; minisign's pre-hashed format is its
    default and the only one new implementations must support

**`ssh-keygen -Y`.** Since OpenSSH 8.1 (2019), any SSH key can sign files,
and Git 2.34 (2021) can use it for commits and tags. The signature is bound
to a **namespace**, a string the signer chooses, so a signature made for
`file` cannot be replayed as one for `git` or for logging in:

```
$ ssh-keygen -Y sign -f id_ed25519 -n file hello-1.0.tar.gz
Signing file hello-1.0.tar.gz
Write signature to hello-1.0.tar.gz.sig
$ ssh-keygen -Y verify -f allowed_signers -I alice@example.com -n file -s hello-1.0.tar.gz.sig < hello-1.0.tar.gz
Good "file" signature for alice@example.com with ED25519 key SHA256:J5eJc7eCuAqJd/0dTB9EpJFwYsgvNOmw0s3u7PVML/c
$ ssh-keygen -Y verify -f allowed_signers -I alice@example.com -n git -s hello-1.0.tar.gz.sig < hello-1.0.tar.gz
Couldn't verify signature: namespace does not match
Could not verify signature.
```

The `allowed_signers` file is the trust decision written down: one line per
identity and key, kept by the verifier. Its key is the same one whose
fingerprint §15.6 computed, so a team that already checks SSH fingerprints has
the habit it needs.

**`gpg --verify`** does the same job with OpenPGP keys, with the cautions of
§15.7: a dedicated keyring with `gpgv`, or `--assert-signer`, and both file
names on the command line. Distributions such as Debian and Ubuntu publish a
`SHA256SUMS` file and a detached `SHA256SUMS.gpg` beside every image, the same
pattern as signify's: sign the list, check the files against it.

All four tools leave the hardest question to you: where did the public key
come from? A key fetched from the same compromised website is as useless as
the checksum was. The good answers are a key you already had (in your
operating system's package keyring, or in the previous release, as OpenBSD
does), a fingerprint published in several independent places, or a
transparency log that would show a new key to everyone. That last answer is
the Sigstore design, and with release signing and the incidents from SolarWinds
to the xz backdoor it is the subject of
[Chapter 16](16-Signing-Software-and-the-Supply-Chain.md).

What to do:

- When you publish software, sign the checksum list with signify, minisign,
  `ssh-keygen -Y` or gpg, keep the signing key off the web server, and
  publish the public key in more than one place.
- When you download, verify the signature with a key you got before the
  download, then check the hash; refuse files missing from the list.
- Treat a checksum on the same page as the download as a test for corrupted
  transfers, never as proof of origin.

## 15.10 Going deeper

*Level: expert.*

**The command line is not an API.** Every tool in this chapter was built for
people, and its output is a report that changes between versions: OpenSSL 1.1
changed the subject format, OpenSSL 3 changed error codes and moved algorithms
to providers, OpenSSH changed its fingerprint format, gpg changed its default
keys and packets. Programs that shell out to these tools and parse their text
inherit every change, and, as SigSpoof showed, every injection bug in the
text. Where a tool offers a machine interface, use it: `gpg --with-colons`
and `--status-fd` have documented, versioned formats (`doc/DETAILS` in the
GnuPG source); `openssl` has stable exit codes for `verify` and
`x509 -checkend`; `age` either succeeds or fails. For anything more, call a
library from your program instead of a tool from your shell
([Chapter 9](09-APIs-That-Resist-Misuse.md) on what a good one looks like).

**Formats without versions.** `openssl enc` writes `Salted__`, a salt and
ciphertext, and nothing that says how the key was derived. That is why OpenSSL
could not change the default derivation in 2018 without breaking every
existing file, and why it still prints a warning instead. age's first line is
`age-encryption.org/v1`; OpenPGP's packets carry version numbers and algorithm
IDs; signify and minisign carry two algorithm bytes. The rule from
[Chapter 9](09-APIs-That-Resist-Misuse.md) applies to files on disk: a
version field you control, with the parameters fixed per version, lets you
change your mind later.

**OpenSSL 3's library context.** Behind the provider change is a new object,
the library context (`OSSL_LIB_CTX`), which holds a set of loaded providers
and a default *property query*. An algorithm fetch such as
`EVP_CIPHER_fetch(ctx, "AES-256-GCM", "fips=yes")` asks every loaded
provider for an implementation whose properties match; the command-line
`-provider` and `-propquery` options expose the same mechanism. This is how a
FIPS-validated build works: the `fips` provider is a separate module with its
own self-tests and integrity check, loaded through the configuration file,
with `fips=yes` as the default query, so that a request for MD5 or DES fails
instead of silently using non-validated code
([Chapter 17](17-Choosing-Testing-and-Verifying.md) covers validation). The
cost is that "which code ran?" now depends on configuration files and
environment variables (`OPENSSL_CONF`, `OPENSSL_MODULES`) as well as on the
binary, and a test that passes on a developer's laptop may fetch a different
implementation in production.

**Trusting the first key.** Every method in §15.9 ends in a public key the
user must already trust. OpenBSD's chain of release keys, Debian's
`debian-archive-keyring` package, Git's `allowed_signers` file and SSH's
`known_hosts` are the same idea: trust once, carefully, and let each
verified thing carry the next key. The weak point is always the first step,
which is why the supply-chain systems of
[Chapter 16](16-Signing-Software-and-the-Supply-Chain.md) add transparency
logs: they do not remove the first trust decision, but they make a bad key
visible to everyone instead of only to its victim.

## Check yourself

??? question "1. A script runs `openssl enc -aes-256-cbc -salt` with `-k` and a password from a variable. Name three separate problems."
    The key derivation is `EVP_BytesToKey` with one iteration (MD5 before
    OpenSSL 1.1.0, SHA-256 after), so each password guess costs a few hash
    calls; the file has no authentication, so it can be changed without the
    password; and `-k` puts the password in the argument list, visible through
    `ps` and `/proc` and often in audit logs. A fourth: the file records no
    parameters, so a future OpenSSL with different defaults may fail to read
    it. (`-salt` is the default and changes nothing.)

??? question "2. With MD5, which bytes of the AES-256 key does `MD5(password + salt)` give, and why is that bad?"
    The first 16 bytes: $D_1 = \mathrm{MD5}(P \| S)$ is the first half of the
    key, $D_2 = \mathrm{MD5}(D_1 \| P \| S)$ the second, and $D_3$ the IV. The salt
    is stored in the file, so an attacker tests each password guess with
    three MD5 calls and one block decryption: hundreds of thousands of guesses
    a second in Python, billions on a GPU.

??? question "3. What does `-nosalt` add to the danger, beyond making the key derivation fast?"
    The key and IV then depend only on the password, so equal files under the
    same password give equal ciphertexts (and shared prefixes show), and an
    attacker can precompute keys for a list of passwords once and test every
    unsalted file against them without repeating the work.

??? question "4. `openssl enc -d` printed the plaintext and exited 0. Does that show the file was not tampered with?"
    No. `enc` uses only unauthenticated modes. With CTR, flipped ciphertext
    bits flip the same plaintext bits and decryption succeeds, as with the
    payment order of §15.5. With CBC, many changes cause padding errors, but
    not all, and the error itself can be an oracle. Only a MAC or signature
    checked before decryption shows the file is unchanged.

??? question "5. What exactly does `ssh-keygen -l` hash, and why does the comment not matter?"
    It base64-decodes the second field of the public key line, the key blob
    (for Ed25519: a length-prefixed `ssh-ed25519` and a length-prefixed 32-byte
    key), and hashes the blob with SHA-256, printing it in base64 without
    padding. The comment is the third field, outside the blob, so it is not
    covered and can say anything.

??? question "6. `gpg --verify` says Good signature from Alice, marked [unknown], and exits 0. What has been proved?"
    Only that the signature is mathematically valid for some public key in
    your keyring that carries Alice's user ID. Nothing ties that key to the
    real Alice: anyone can make a key with her name, and if it was imported
    from the same place as the download, it proves nothing. Use `gpgv` with a
    keyring of trusted keys, `--assert-signer` with her fingerprint, or check
    `VALIDSIG` for the expected fingerprint.

??? question "7. A project publishes `SHA256SUMS` on its download page over HTTPS. Against which attacks does this help, and against which not?"
    It detects a damaged download, and a malicious or stale mirror if the
    list itself came from the project's own server over HTTPS. It does not help
    when the attacker controls the project's web server (Linux Mint, 2016),
    because the attacker replaces the list along with the file. A signature by
    a key kept off that server, checked against a public key obtained earlier,
    is needed for that.

??? question "8. Why does `ssh-keygen -Y` take a namespace (`-n file`), and what goes wrong without one?"
    The namespace is part of what is signed, so a signature made for one
    purpose cannot be reused for another. Without it, a signature that a user
    made over some data for one system (a file release) could be presented as
    a signature for a different system that signs similar data (a Git commit,
    or an authentication challenge), and the key holder would have signed
    something they never meant to.

??? question "9. Why can OpenSSL not simply make `-pbkdf2` the default for `openssl enc`?"
    The file format stores only `Salted__` and the salt, not which key
    derivation or how many iterations were used. Changing the default would
    make every existing file decrypt to garbage with the default command, with
    no way for the tool to detect which derivation a file needs. A versioned
    format (as age has) would have allowed the change.

## What you learned

- The five tools are thin layers over libraries born mostly in the late 1990s:
  OpenSSL from SSLeay (1995, 1998), OpenSSH (1999), GnuPG (1999) and Java's
  `keytool` (1998); Heartbleed in 2014 brought LibreSSL, BoringSSL and
  smaller tools such as signify, minisign and later age.
- `openssl x509 -text` is a walk over the DER tree; `asn1parse` shows the
  offsets, and a fingerprint is a hash of the DER bytes.
- `openssl enc` derives keys with `EVP_BytesToKey` (one MD5 before 1.1.0, one
  SHA-256 since), stores only a salt, and has no authentication;
  `-pbkdf2 -iter` fixes the derivation but not the rest, and age replaces it.
- Passwords on the command line leak through `ps`, `/proc`, audit logs and
  shell history; use file, descriptor, environment or prompt.
- SSH and OpenPGP fingerprints are hashes of a key blob or key packet that
  you can compute yourself; `gpg --list-packets` shows what a file really
  contains.
- gpg's "Good signature" and exit status 0 do not mean "from the right
  person"; EFAIL, SigSpoof, the SHA-1 collisions and keyserver flooding each
  taught a part of that.
- A checksum from the same server proves nothing against that server's
  attacker; signatures by an offline key, checked against a public key you
  already had, do.

## Further reading

- Eric A. Young and Tim J. Hudson, SSLeay documentation and FAQ (1995 to 1998),
  and the OpenSSL project's history page; OpenSSL 0.9.1c release (23 December 1998).
- OpenSSL 3.0 manual pages: `openssl-enc`, `EVP_BytesToKey` (3), `openssl-x509`,
  `openssl-asn1parse`, `provider` (7), `migration_guide` (7), 2021; and
  OpenSSL `CHANGES.md` (1.1.0: SHA-256 default digest for `enc`; 1.1.1: `-pbkdf2`, `-iter`).
- B. Kaliski, RFC 2898, "PKCS #5: Password-Based Cryptography Specification
  Version 2.0" (2000), and K. Moriarty et al., RFC 8018 (2017): PBKDF1, PBKDF2.
- Steve Marquess, "Of Money, Responsibility, and Pride" (his blog *Speeds
  and Feeds*, April 2014); the Linux Foundation's Core Infrastructure Initiative announcement
  (April 2014).
- Bob Beck, "LibreSSL: the first 30 days" (2014); Adam Langley, "BoringSSL"
  (ImperialViolet, 20 June 2014).
- T. Ylonen and C. Lonvick, RFC 4251 and RFC 4253 (2006); B. Harris and
  L. Velvindron, RFC 8709 (2020), Ed25519 and Ed448 in SSH; OpenSSH release
  notes 5.1 (2008), 6.5 (2014), 6.8 (2015), 7.8 (2018), 8.1 (2019), 9.5 (2023);
  OpenSSH `PROTOCOL.sshsig`.
- Dirk Loss, Tobias Limmer and Alexander von Gernler, "The drunken bishop: an
  analysis of the OpenSSH fingerprint visualization algorithm" (2009).
- GitHub, "We updated our RSA SSH host key" (GitHub blog, 24 March 2023).
- J. Callas et al., RFC 4880, "OpenPGP Message Format" (2007); P. Wouters et
  al., RFC 9580, "OpenPGP" (2024); W. Koch et al., draft-koch-librepgp
  (LibrePGP); GnuPG `doc/DETAILS` (status and colon formats) and NEWS
  (2.2.8, 2.2.17, 2.2.18, 2.4.1).
- Julia Angwin, "The World's Email Encryption Software Relies on One Guy, Who
  is Going Broke" (ProPublica, 5 February 2015).
- Damian Poddebniak, Christian Dresen, Jens Müller, Fabian Ising, Sebastian
  Schinzel, Simon Friedberger, Juraj Somorovsky and Jörg Schwenk, "Efail:
  Breaking S/MIME and OpenPGP Email Encryption using Exfiltration Channels"
  (USENIX Security 2018).
- Marcus Brinkmann, "SigSpoof: Spoofing signatures in GnuPG, Enigmail,
  GPGTools and python-gnupg" (CVE-2018-12020, June 2018).
- Gaëtan Leurent and Thomas Peyrin, "SHA-1 is a Shambles: First Chosen-Prefix
  Collision on SHA-1 and Application to the PGP Web of Trust" (USENIX
  Security 2020).
- Robert J. Hansen, "SKS Keyserver Network Under Attack" (June 2019).
- Filippo Valsorda and Ben Cartwright-Cox, the age format specification
  (C2SP, 2019 to 2021).
- JEP 229, "Create PKCS12 Keystores by Default" (JDK 9, 2017); keytool(1)
  manual, JDK 21.
- Micah Lee, "Backdoored Linux Mint, and the Perils of Checksums" (February
  2016); Clement Lefebvre, "Beware of hacked ISOs if you downloaded Linux Mint
  on February 20th!" (Linux Mint blog, 21 February 2016).
- Ted Unangst, "signify: Securing OpenBSD From Us To You" (BSDCan 2015);
  signify(1) manual; Frank Denis, minisign documentation and signature format
  (2015 onward).
