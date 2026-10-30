# age

*File encryption to public keys or a passphrase. A random file key encrypts
the data, and each recipient gets that key wrapped in its own text "stanza" in
the header. One fixed set of algorithms, no options, no signatures.*

**Standard:** age-encryption.org/v1 (Filippo Valsorda and Ben Cartwright-Cox,
2019), a C2SP spec since 2022; v1.1.0 (December 2025) added post-quantum and
hardware-key recipients. **Implementations:** age (Go, the reference; 1.0.0 in
2021, 1.3.0 in December 2025), rage (Rust), typage (TypeScript); plugins such
as age-plugin-yubikey, age-plugin-se and age-plugin-tpm. SOPS and passage use it.

## One file, one algorithm per category

Real output from age 1.1.1, the Ubuntu 24.04 package, in a Linux container
(Oct 2026). The 212-byte file is a 168-byte text header, a 16-byte nonce, then
the 12-byte message and a 16-byte tag:

```
$ age-keygen -o key.txt
Public key: age1eu64tmfcn59tk8gcr20svyh6e9s8flm8kp98xnz2vxrj8dh5ky3sveey8d
$ age -r age1eu64tmfcn59tk8gcr20svyh6e9s8flm8kp98xnz2vxrj8dh5ky3sveey8d -o hello.txt.age hello.txt
$ head -n 4 hello.txt.age
age-encryption.org/v1
-> X25519 BqfSW+FITH+ktu2/aWNLMQTJaQGrodG6cg6Wk36ycmM
xW4BIPG4nyiDA1QFidwa49P29Mo0MPhee2/rG9HNinM
--- 49lK941JRylxEx1Qu/QgXaL9LVc90eYzGPamJHtVehc
```

| age name | Category | Algorithm inside |
|---|---|---|
| `X25519` stanza | [Key exchange](../index.md#1-key-exchange) | [X25519](../01-key-exchange/ECDH.md#x25519-and-x448) between a fresh ephemeral key (the argument) and the recipient's `age1…` key |
| stanza body | [Cipher](../index.md#5-cipher-modes-and-aead) | [ChaCha20-Poly1305](../05-modes-aead/AEAD.md#chacha20-poly1305) with an all-zero nonce seals the 16-byte file key |
| `age-encryption.org/v1/X25519` | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA-256 turns the DH result into the wrap key, and the file key into the MAC and payload keys |
| `---` line | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA-256 over the header |
| payload | [Cipher](../index.md#5-cipher-modes-and-aead) | ChaCha20-Poly1305 in 64 KiB chunks, a tag on each |
| (inside HKDF and HMAC) | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) |
| none | [Signature](../index.md#2-digital-signatures) | no signatures: decrypting proves nothing about who wrote the file |

**Why there is nothing to choose.** `v1` on the first line fixes HKDF-SHA-256,
HMAC-SHA-256 and the ChaCha20-Poly1305 payload, and each stanza type fixes its
own algorithms. Only stanzas can be added: readers skip types they don't know,
so SSH keys, plugins and, in 2025, post-quantum keys came in as new stanzas and
old files kept opening, "one well-oiled joint" in the plugin spec's words.

## How a file is encrypted

1. **File key:** 16 random bytes, for this file only.
2. **One stanza per recipient.** For an `age1…` key: a DH between a fresh
   ephemeral key, whose public half is the argument, and the recipient's key.
   HKDF (salt = ephemeral share `||` recipient, info `age-encryption.org/v1/X25519`)
   gives a wrap key used once, so the zero nonce is safe.
3. **Or a passphrase.** `-p` writes one `scrypt` stanza: a 16-byte salt and
   log₂ N (18 in age, about a second; it refuses over 22). The wrap key is
   scrypt (r = 8, p = 1) of the passphrase and `age-encryption.org/v1/scrypt`
   `||` salt. The stanza must be alone, so only someone who knows the
   passphrase can have made the file.
4. **Header MAC:** HMAC-SHA-256 over everything through `---`, keyed with
   HKDF(file key, info `header`). Any changed stanza fails here.
5. **Payload.** A fresh 16-byte nonce goes into HKDF(file key, salt = nonce,
   info `payload`). Each 64 KiB chunk's AEAD nonce is an 11-byte counter plus a byte
   that is 1 only on the last chunk, so a cut-off file fails and seeking works.
6. **Decrypting** tries each identity on each stanza, checks the MAC, then
   decrypts chunk by chunk. age(1): "No unauthenticated output is ever released."

**SSH keys** (in the age and rage code, not the spec). `ssh-ed25519` converts
the key to X25519 and runs step 2 with an extra tweak and its own label;
`ssh-rsa` wraps the file key with RSA-OAEP-SHA-256. Both stanzas carry 4 bytes
of the key's SHA-256, so anyone can tell which key a file is for.

**No signatures.** Anyone with your `age1…` key can make a file that decrypts
cleanly for you, and with several recipients each one knows the file key and
could rewrite the file for the others. Sign separately to show who wrote it.
[OpenPGP](OpenPGP.md) signs and encrypts in one go, and adds compression, user
IDs, expiry, revocation, a web of trust and per-key cipher choices.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange | X25519 (`age1…`), still the `age-keygen` default | RFC 7748, C2SP age | — |
| Key exchange, post-quantum | ML-KEM-768 + X25519 (X-Wing) via HPKE: `age1pq1…`, `age-keygen -pq`, age 1.3.0 and later | C2SP age v1.1.0 (2025), RFC 9180, draft-ietf-hpke-pq, FIPS 203 | — |
| Hardware keys | `p256tag` (P-256 HPKE), `mlkem768p256tag` (ML-KEM-768 + P-256) | C2SP age v1.1.0 | — |
| SSH keys | `ssh-ed25519`, `ssh-rsa` (RSA-OAEP with SHA-256) | age and rage code only | RSA under 2048 bits refused |
| Passphrase | scrypt, N = 2¹⁸, r = 8, p = 1 | RFC 7914 | — |
| Signature | none | — | — |
| Cipher (AEAD) | ChaCha20-Poly1305 for stanza bodies and payload | RFC 7539 (now RFC 8439) | — |
| MAC | HMAC-SHA-256 on the header; Poly1305 in each chunk | RFC 2104 | — |
| Hash | SHA-256; SHA3-256 and SHAKE256 inside X-Wing | FIPS 180-4, FIPS 202 | — |
| KDF | HKDF-SHA-256 | RFC 5869 | — |

**Post-quantum.** The `mlkem768x25519` stanza is HPKE base mode with X-Wing,
which hashes the ML-KEM-768 and X25519 secrets together (SHA3-256) and holds if
either does. A recipient is 1,959 characters (a 1,216-byte key). Under age 1.3.2
(`go install`, same container) the same message gets a 1,627-byte header, and
adding an X25519 recipient fails ("can't mix post-quantum and classic
recipients"). The man page calls it "the recommended recipient type for most
applications", yet `-pq` isn't the default; rage 0.12 needs `age-plugin-pq`.

## Seeing it on your machine

```
age-keygen -o key.txt                           # X25519 identity; prints its age1… recipient
age -r age1… -o file.age file                   # encrypt; repeat -r for more recipients
age -R ~/.ssh/id_ed25519.pub -o file.age file   # to an SSH key
age -p -a -o file.age file                      # passphrase; -a gives PEM "AGE ENCRYPTED FILE"
age -d -i key.txt -o file file.age              # decrypt (asks for the passphrase if -p)
```

- **Python:** decrypts a short (up to 64-byte) `age -p -a` file with the
  standard library, skipping the Poly1305 tags, so it is for looking only.
  Enter twice uses `hello.txt`, encrypted by age 1.1.1 under a passphrase it made up.

```python
import base64, hashlib, hmac, struct

SAMPLE = """\
YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IHNjcnlwdCBPVXd0SHN1QUJrQWt6UWFU
R0dORUZRIDE4CmF4RFVDRjZ6RitLcjVEVy9ocWFiUDg0VXp2MGZra0RPNFNFYXlZ
VG5nakUKLS0tIE92RVRQU3dkZ1lPYUk2d09QUFN1Uy9DTzd3M21xNVVEL0pkWm93
RmdmZ2cKje/+t5X2ISS/66xJQSZAtHWkoYOJdZQKdl3RHC1hhYUnJs3lVgnstLy+mv8="""
M = 0xFFFFFFFF
QR = [(0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
      (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)]

def hkdf(ikm, salt, info):                  # HKDF-SHA-256, 32 bytes out
    prk = hmac.new(salt, ikm, "sha256").digest()
    return hmac.new(prk, info + b"\1", "sha256").digest()

def chacha20(key, nonce, data):             # RFC 8439 §2.4: one block, counter 1
    s = list(struct.unpack("<16I", b"expand 32-byte k" + key + b"\1\0\0\0" + nonce))
    x = s[:]
    for a, b, c, d in QR * 10:              # 20 rounds: columns, then diagonals
        for p, q, r, n in (a, b, d, 16), (c, d, b, 12), (a, b, d, 8), (c, d, b, 7):
            x[p] = (x[p] + x[q]) & M
            x[r] = ((x[r] ^ x[p]) << n | (x[r] ^ x[p]) >> 32 - n) & M
    ks = struct.pack("<16I", *((u + v) & M for u, v in zip(x, s)))
    return bytes(u ^ v for u, v in zip(data, ks))

pw = input("passphrase: ") or "hedgehog-spy-eye-call-forum-maid-elite-impact-curious-urban"
f = base64.b64decode("".join(l for l in iter(input, "") if l[0] != "-") or SAMPLE)
head, _, rest = f.partition(b"\n--- ")      # rest: MAC, nonce, one chunk + tag
_, stanza, body = head.split(b"\n")
_, _, salt, logn = stanza.split()           # -> scrypt <salt> <log2 N>
salt, body, mac = (base64.b64decode(v + b"==") for v in (salt, body, rest[:43]))
wrap = hashlib.scrypt(pw.encode(), salt=b"age-encryption.org/v1/scrypt" + salt,
                      n=1 << int(logn), r=8, p=1, maxmem=1 << 30, dklen=32)
file_key = chacha20(wrap, bytes(12), body[:16])
h = hmac.new(hkdf(file_key, b"", b"header"), head + b"\n---", "sha256").digest()
print("file key", file_key.hex(), "MAC ok" if h == mac else "wrong passphrase")
key = hkdf(file_key, rest[44:60], b"payload")
print("payload ", chacha20(key, bytes(11) + b"\1", rest[60:-16]))
```

```
file key 12cb8ddee378ca048add83407ded9966 MAC ok
payload  b'Hello, age!\n'
```

`MAC ok` means the passphrase was right. For the spec's test vector, type
`password` and paste CCTV's `armor_scrypt` plus an empty line: you get its file
key `59454c4c4f57205355424d4152494e45`, and `b'age'`, whose SHA-256 it lists.

## See also

- [OpenPGP](OpenPGP.md): signatures, keyrings and algorithm choice, all left out of age
- [WireGuard](WireGuard.md): X25519, ChaCha20-Poly1305 and one fixed suite, for a tunnel
- [HPKE](../03-public-key-encryption/HPKE.md#post-quantum-hpke): what the post-quantum and hardware stanzas are built on
- [scrypt](../08-kdf-password-hashing/scrypt.md) / [HKDF](../08-kdf-password-hashing/HKDF.md) / [AEAD](../05-modes-aead/AEAD.md#chacha20-poly1305): the algorithms in depth

## References

- [C2SP age spec (age-encryption.org/v1)](https://c2sp.org/age) / [source and history](https://github.com/C2SP/C2SP/blob/main/age.md) (tags `age/v1.0.0`, `age/v1.1.0`) / [age plugin spec](https://c2sp.org/age-plugin) / [CCTV age testkit](https://github.com/C2SP/CCTV/tree/main/age)
- [Valsorda and Cartwright-Cox, "A simple file encryption tool & format" (design doc, 2019)](https://docs.google.com/document/d/11yHom20CrsuX8KQJXBBw04s80Unjv8zCg_A7sPAX_9Y/)
- [age](https://github.com/FiloSottile/age) (`age.go`, `x25519.go`, `scrypt.go`, `pq.go`, `agessh/agessh.go`, `doc/age.1.ronn`) / [v1.3.0 release notes (Dec 2025)](https://github.com/FiloSottile/age/releases/tag/v1.3.0)
- [rage CHANGELOG](https://github.com/str4d/rage/blob/main/age/CHANGELOG.md) / [typage](https://github.com/FiloSottile/typage) / [awesome-age](https://github.com/FiloSottile/awesome-age) (plugins and users)
- [filippo.io/hpke, `hpke-pq.md`](https://github.com/FiloSottile/hpke/blob/main/hpke-pq.md) / [draft-ietf-hpke-pq](https://datatracker.ietf.org/doc/draft-ietf-hpke-pq/) / ["Online Authenticated-Encryption and its Nonce-Reuse Misuse-Resistance" (2015)](https://eprint.iacr.org/2015/189) (STREAM)
- [RFC 7748: X25519](https://www.rfc-editor.org/rfc/rfc7748) / [RFC 8439: ChaCha20-Poly1305](https://www.rfc-editor.org/rfc/rfc8439) / [RFC 5869: HKDF](https://www.rfc-editor.org/rfc/rfc5869) / [RFC 7914: scrypt](https://www.rfc-editor.org/rfc/rfc7914) / [RFC 7468: PEM](https://www.rfc-editor.org/rfc/rfc7468)

*Weaker sources:* Ben Cartwright-Cox's full name, from a web search summary of the 2019 design doc (docs.google.com was not reachable; the age README credits his GitHub handle, benjojo).
