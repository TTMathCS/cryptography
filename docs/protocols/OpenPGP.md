# OpenPGP

*Encryption and signatures for email and files, and the signatures on Linux
packages and Git tags. There is no live connection: the sender picks
algorithms from preferences stored in the recipient's key.*

**Standard:** RFC 9580 (July 2024), which replaced RFC 4880 (2007);
post-quantum algorithms in RFC 9980 (June 2026). GnuPG follows its own
LibrePGP draft instead. **Implementations:** GnuPG, Sequoia, OpenPGP.js
(Proton Mail), RNP (Thunderbird).

## One message, one algorithm per category

`gpg` isn't on a stock Mac, so this uses RFC 9580's own sample: a v6
certificate (Appendix A.3) and "Hello, world!" encrypted to it (Appendix A.8).
The key lines are real output from the Python script at the end of this page:

```
key v6 Ed25519 sha256 cb186c4f0609a697e4d52dfa6c722b0c1f1e27c18a56708f6525ec27bad9acc9
signature v6 Ed25519 SHA2-512
subkey v6 X25519 sha256 12c83f1e706f6308fe151a417743a1f033790e93e9978488d1db378da9930885
signature v6 Ed25519 SHA2-512
```

and the message lines are the RFC's own notes on its packet dump:

```
0x0002  06   v6 PKESK
0x0025  19   algorithm: X25519
0x0002  02   v2 SEIPD
0x0003  07   cipher: AES128
0x0004  02   AEAD mode: OCB
```

| OpenPGP name | Category | Algorithm inside |
|---|---|---|
| `Ed25519` (27), primary key | [Signature](../index.md#2-digital-signatures) | [Ed25519](../02-signatures/EdDSA.md) makes the self-signatures and message signatures |
| `SHA2-512` (10) | [Hash](../index.md#7-hash-functions) | the [SHA-2](../07-hash/SHA-2.md) digest Ed25519 signs; a v6 signature also hashes in a 32-byte random salt |
| `sha256` fingerprint | [Hash](../index.md#7-hash-functions) | SHA-256 over the key packet; v4 keys used [SHA-1](../07-hash/Retired.md#sha-1) |
| `X25519` (25), subkey | [Key exchange](../index.md#1-key-exchange) | [X25519](../01-key-exchange/ECDH.md#x25519-and-x448) with a fresh ephemeral key; the result wraps the session key with [AES key wrap](../05-modes-aead/Key-Wrap.md) |
| `AES128` (7) | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-128 for the message |
| `OCB` (2) | [Mode](../index.md#5-cipher-modes-and-aead) | [AES-OCB](../05-modes-aead/AEAD.md#aes-ocb) in 4 KiB chunks, a tag on each chunk and a final tag |
| MAC | [MAC](../index.md#6-mac) | built into OCB |
| HKDF | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA256 for the X25519 wrapping key and for the message key and nonce |

## How a message is sent

1. **Keys.** A certificate holds a primary key (certifies, signs), subkeys
   (encrypt), user IDs and self-signatures. The self-signature lists the
   ciphers, AEAD modes and hashes the owner prefers, and a Features flag
   saying the owner can read v2 SEIPD.
2. **Session key.** The sender picks a random session key and a cipher the
   recipients support, then encrypts the session key once per recipient
   subkey (a PKESK packet), or under a passphrase (SKESK, with Argon2).
3. **Data.** The message, with any signature, goes into one SEIPD packet. In
   v2, HKDF-SHA256 turns the session key and a fresh 32-byte salt into the
   message key and IV. The data is cut into chunks, each sealed with its index
   in the nonce, and a final tag covers the total length, so a cut-off message
   is caught.
4. **Signing** hashes the data, the signature's own fields and, in v6, a
   random salt, then signs the digest.
5. **Reading** goes backwards: find a PKESK for one of your subkeys, unwrap the
   session key, decrypt and check each chunk, then check the signature against
   the sender's certificate.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange (to a recipient) | X25519 (MUST), X448; ECDH on NIST or Brainpool curves | RFC 9580 | ECDH on Curve25519Legacy, the v4 form GnuPG makes |
| Public-key encryption | RSA, no new keys under 3072 bits | RFC 9580 §12.4 | ElGamal: no new keys, no encrypting, decrypt old mail only |
| Post-quantum | ML-KEM-768+X25519 (MUST), ML-KEM-1024+X448; ML-DSA-65+Ed25519 (MUST), ML-DSA-87+Ed448; SLH-DSA-SHAKE | RFC 9980 (2026) | — |
| Signature | Ed25519 (MUST), Ed448, ECDSA, RSA | RFC 9580 | DSA: MUST NOT sign or verify; EdDSALegacy (v4 Ed25519) deprecated |
| Cipher | AES-128 (MUST), AES-256 (SHOULD), AES-192, Camellia, Twofish | RFC 9580 §9.3 | [IDEA](../04-symmetric-ciphers/Retired.md#idea), [3DES](../04-symmetric-ciphers/Retired.md#3des), [CAST5](../04-symmetric-ciphers/Retired.md#cast5): MUST NOT encrypt, may decrypt old data |
| Mode | v2 SEIPD with OCB (MUST), EAX, GCM | RFC 9580 §5.13.2, RFC 7253 | v1 SEIPD: [CFB](../05-modes-aead/Classic-Modes.md#cfb) plus a SHA-1 "MDC", still used with v4 keys; SED with no integrity check: MUST NOT create |
| MAC | built into the AEAD | — | the MDC, a plain SHA-1 hash rather than a MAC |
| Hash | SHA2-256 (MUST), SHA2-384/512, SHA3-256/512; SHA-256 v6 fingerprints | RFC 9580 §9.5 | MD5, SHA-1, RIPEMD-160: no new signatures; SHA-1 v4 fingerprints |
| KDF / passphrase | [Argon2](../08-kdf-password-hashing/Argon2.md)id S2K (recommended); HKDF-SHA256 | RFC 9580 §3.7.1.4, RFC 9106, RFC 5869 | Simple S2K: MUST NOT; Iterated and Salted S2K only without Argon2 |

## Versions and the GnuPG split

| Version | Standard | Year | What it brought |
|---|---|---|---|
| PGP 2 | RFC 1991 | 1996 | RSA, IDEA and MD5 only |
| OpenPGP | RFC 2440 | 1998 | v4 keys with SHA-1 fingerprints; DSA, ElGamal, 3DES and SHA-1 required |
| OpenPGP | RFC 4880 | 2007 | integrity-protected data: CFB plus the SHA-1 MDC |
| ECC | RFC 6637 | 2012 | ECDH and ECDSA on the NIST curves |
| OpenPGP | RFC 9580 | 2024 | v6 keys, native Ed25519 and X25519, AEAD, Argon2, salted signatures |
| Post-quantum | RFC 9980 | 2026 | ML-KEM and ML-DSA paired with X25519/Ed25519 or X448/Ed448, SLH-DSA |

RFC 9980 keys are v6 only, except ML-KEM-768+X25519, which may also be a v4
encryption subkey.

GnuPG didn't follow RFC 9580. Its author keeps an earlier design alive as
LibrePGP (draft-koch-librepgp-06, September 2026), an individual draft with no
IETF standing. The two new formats don't read each other's messages:

| | RFC 9580 | LibrePGP (GnuPG) |
|---|---|---|
| New key version | v6, SHA-256 fingerprint | v5, SHA-256 fingerprint |
| Ed25519 / X25519 | own IDs, 27 and 25 | EdDSA (22) and ECDH (18) on Curve25519, as on v4 keys |
| AEAD container | v2 SEIPD (packet 18), OCB required | OCB Encrypted Data (packet 20) |
| Post-quantum | RFC 9980 composites | Kyber (ID 8) paired with an ECC key |
| Who | Sequoia (2.0 on), OpenPGP.js (v6 on) | GnuPG (v5 keys and OCB since 2.3, 2021) |

GnuPG's default key is still a v4 `ed25519` primary with a `cv25519` subkey,
and its `pqc` choice is a Brainpool P-384 primary with a Kyber-768 + Brainpool
P-256 subkey. GnuPG 2.5.23 (September 2026) added `--allow-9980` to read RFC
9980 data, but its release notes tell users to stay with LibrePGP's Kyber.

## Seeing it on your machine

With GnuPG installed (it isn't on a stock Mac):

```
gpg --version                                   # algorithm names this gpg knows (AEAD modes: --list-packets)
gpg --quick-gen-key "Name <you@example.com>" default
gpg --list-keys --with-subkey-fingerprints
gpg --list-packets message.gpg                  # algorithm IDs in each packet
gpg --export --armor you@example.com            # the block to paste below
```

- **Python:** paste an armored public key block (ending with its `-----END`
  line). It lists each packet and computes the fingerprints itself.

```python
import base64, hashlib

ALGO = {1: "RSA", 16: "ElGamal", 17: "DSA", 18: "ECDH", 19: "ECDSA",
        22: "EdDSALegacy", 25: "X25519", 27: "Ed25519"}
HASH = {2: "SHA-1", 8: "SHA2-256", 10: "SHA2-512"}

b64 = ""
while not (s := input().strip()).startswith("-----END"):
    if s and s[0] not in "-=" and ":" not in s:
        b64 += s
d, i = base64.b64decode(b64), 0
while i < len(d):
    if d[i] & 64:                       # OpenPGP-format header
        tag, n, i = d[i] & 63, d[i + 1], i + 2
        if 192 <= n < 224:
            n, i = (n - 192 << 8) + d[i] + 192, i + 1
        elif n == 255:
            n, i = int.from_bytes(d[i:i + 4], "big"), i + 4
    else:                               # legacy header, which gpg writes
        tag, k = d[i] >> 2 & 15, 1 << (d[i] & 3)
        n, i = int.from_bytes(d[i + 1:i + 1 + k], "big"), i + 1 + k
    p, i = d[i:i + n], i + n
    if tag in (6, 14):
        if p[0] == 4:
            fp = hashlib.sha1(b"\x99" + n.to_bytes(2, "big") + p)
        else:                           # 0x9b for v6, 0x9a for LibrePGP v5
            fp = hashlib.sha256(bytes([0x95 + p[0]]) + n.to_bytes(4, "big") + p)
        print("key" if tag == 6 else "subkey", "v%d" % p[0],
              ALGO.get(p[5], p[5]), fp.name, fp.hexdigest())
    elif tag == 2:
        print("signature v%d" % p[0], ALGO.get(p[2], p[2]), HASH.get(p[3], p[3]))
```

Fed the Appendix A.3 block it prints the four lines at the top of this page,
and the fingerprints match the RFC's. The v4 sample key in Appendix A.1, the
kind GnuPG still makes, prints `key v4 EdDSALegacy sha1 c959bdba…`.

## See also

- [SSH](SSH.md): the same Ed25519 keys, used for logins instead of mail
- [ElGamal](../03-public-key-encryption/ElGamal.md): OpenPGP's old encryption algorithm and why RFC 9580 retired it
- [AEAD](../05-modes-aead/AEAD.md) / [Argon2](../08-kdf-password-hashing/Argon2.md) / [ML-KEM](../01-key-exchange/ML-KEM.md) / [ML-DSA](../02-signatures/ML-DSA.md): the algorithms in depth
- [PKI](PKI.md): the certificate model OpenPGP's web of trust is an alternative to

## References

- [RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580) (Sections 3.7, 5.13, 9, 12 and Appendix A) / [RFC 4880](https://www.rfc-editor.org/rfc/rfc4880) / [RFC 2440](https://www.rfc-editor.org/rfc/rfc2440)
- [RFC 9980: Post-Quantum Cryptography in OpenPGP](https://www.rfc-editor.org/rfc/rfc9980)
- [draft-koch-librepgp: LibrePGP Message Format](https://datatracker.ietf.org/doc/draft-koch-librepgp/)
- [GnuPG NEWS](https://github.com/gpg/gnupg/blob/master/NEWS) (2.5.0, 2.5.1, 2.5.23) / [GnuPG `g10/keygen.c`](https://github.com/gpg/gnupg/blob/master/g10/keygen.c) (default key parameters)
- [Sequoia NEWS](https://gitlab.com/sequoia-pgp/sequoia/-/blob/main/openpgp/NEWS) (2.0.0) / [OpenPGP.js v6 changelog](https://github.com/openpgpjs/openpgpjs/wiki/v6-Changelog)
- [RFC 7253: OCB](https://www.rfc-editor.org/rfc/rfc7253) / [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106)
