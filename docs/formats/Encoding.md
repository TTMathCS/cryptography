# Encoding and decoding (hex, Base64, Base32, Base58, Bech32, URL, UTF-8)

*Encoding writes the same bytes in another alphabet so they survive a channel that
only carries text: an email, a URL, a JSON field, a QR code. Anyone can decode it,
and no key is involved. **Encoding is not encryption**: Base64 hides nothing.
Encryption needs a key to undo; encoding needs only the name of the alphabet.*

**Standard:** hex, Base32 and Base64 are RFC 4648 (2006); Base64 in email is RFC
2045 (1996); percent-encoding in URLs is RFC 3986 (2005); UTF-8 is RFC 3629
(2003); PEM's Base64 wrapping is RFC 7468 (2015). Base58 has no RFC; it is defined
by Bitcoin Core's source. Bech32 is BIP-173 (2017) and Bech32m is BIP-350 (2020).
**Used by:** [PEM](File-Formats.md) files, [JWT](../protocols/JWT.md) (base64url),
[TOTP](../protocols/TOTP.md) secrets (Base32), [Bitcoin](../protocols/Bitcoin.md)
addresses (Base58Check, Bech32), hashes and keys printed as hex, HTTP Basic
authentication (Base64), every web address (percent-encoding).

## Encoding, encryption and hashing side by side

| | Encoding | Encryption | Hashing |
|---|---|---|---|
| Purpose | carry bytes through a text-only channel | keep the content secret | a short fingerprint of the content |
| Needs a key? | no | yes | no (a MAC adds one) |
| Can it be undone? | yes, by anyone | only with the key | no, only checked |
| Size | grows: hex ×2, Base64 ×4/3 | about the same, plus a nonce and tag | fixed, such as 32 bytes for SHA-256 |
| Example | `TWFycyE=` | AES-GCM output | SHA-256 digest |

Encoding is often used *after* encryption or hashing: the ciphertext or digest is
binary, so it is written in hex or Base64 to be printed, stored in JSON or put in
a URL. The security comes from the encryption or hash, never from the encoding.

## One message, five encodings

Real output from GNU coreutils 9.4 and Python 3.13 (Ubuntu, Nov 2026). The
message is the five bytes of `Mars!`:

```
$ printf 'Mars!' | od -An -tx1          # the bytes
 4d 61 72 73 21
$ printf 'Mars!' | basenc --base16      # hex (Base16)
4D61727321
$ printf 'Mars!' | base32               # Base32
JVQXE4ZB
$ printf 'Mars!' | base64               # Base64
TWFycyE=
$ python3 -c "import urllib.parse; print(urllib.parse.quote('Mars & Earth/100%?', safe=''))"
Mars%20%26%20Earth%2F100%25%3F          # percent-encoding
```

The same five bytes in Base58, Bitcoin's alphabet, are `9jMQ9yz`.

| Encoding | Alphabet | Bits per character | Size of 32 bytes | Padding | Standard |
|---|---|---|---|---|---|
| Hex (Base16) | `0-9 A-F` (16) | 4 | 64 characters | none | RFC 4648 §8 |
| Base32 | `A-Z 2-7` (32) | 5 | 56 characters with `=` padding | `=` to a multiple of 8 | RFC 4648 §6 |
| Base58 | 58 characters: no `0 O I l` | about 5.86 | about 44 characters | none | Bitcoin Core `base58.cpp` |
| Base64 | `A-Z a-z 0-9 + /` (64) | 6 | 44 characters | `=` to a multiple of 4 | RFC 4648 §4 |
| base64url | `A-Z a-z 0-9 - _` (64) | 6 | 43 characters, padding usually left off | optional | RFC 4648 §5 |
| Percent-encoding | `%` and two hex digits for each unsafe byte | 8 for safe bytes | up to 96 characters | none | RFC 3986 §2.1 |

## How each one works

### Hex (Base16)

Each byte becomes two characters, one for each 4-bit half: `0x4d` is `4d`. It is
the easiest to read and the longest: double the size. Hashes, keys and
certificate fingerprints are usually printed in hex. Upper and lower case mean
the same thing, so `4D61` and `4d61` decode alike.

### Base64

Base64 takes 3 bytes (24 bits) at a time and writes them as 4 characters of 6
bits each, from a 64-character alphabet:

```
M        a        r          s        !
01001101 01100001 01110010   01110011 00100001
010011 010110 000101 110010  011100 110010 000100 (00 added)
T      W      F      y       c      y      E      =
```

The last group has only 2 bytes, so 2 zero bits are added to make three 6-bit
characters, and one `=` fills the place of the missing fourth. One leftover byte
gives `==`. That is why Base64 output is always a multiple of 4 characters and
grows the data by a third.

Long Base64 text is often broken into lines: 76 characters in email (RFC 2045
§6.8) and 64 in PEM files (RFC 7468 §2). The line breaks are not part of the
data.

### base64url

`+` and `/` mean something in URLs and file names, so base64url swaps them for `-`
and `_` (RFC 4648 §5). The same two bytes `fb ff` are `+/8=` in Base64 and `-_8=`
in base64url. [JWT](../protocols/JWT.md) and JOSE use base64url with the `=`
padding left off (RFC 7515 §2), so a JWT's header and payload can be read by
anyone who decodes them: they are signed, not encrypted.

### Base32

Base32 takes 5 bytes (40 bits) at a time and writes 8 characters of 5 bits, using
only capitals and the digits 2 to 7. It has no lower case and avoids `0`, `1` and
`8`, which look like `O`, `I` and `B`, so people can type it. TOTP secrets in
authenticator apps are Base32 (the `secret=` in an `otpauth://` link; see
[TOTP](../protocols/TOTP.md)). It grows data by 60%.

### Base58 and Base58Check

Base58 treats the whole input as one big number and writes it in base 58. Its
alphabet drops `0`, `O`, `I` and `l` (they look alike) and `+` and `/` (so a
double-click selects the whole string). Each leading zero byte becomes a `1`.
**Base58Check**, used by old Bitcoin addresses (those starting `1` or `3`), adds
a version byte in front and the first 4 bytes of a double SHA-256 at the end, so
a typo is caught before money is sent. It catches mistakes, not attackers: anyone
can compute the checksum.

### Bech32 and Bech32m

Newer Bitcoin addresses (`bc1q...` and `bc1p...`) use Bech32 (BIP-173) and
Bech32m (BIP-350). They use 32 characters in lower case only, a readable prefix
(`bc` for Bitcoin), a `1` separator, and a 6-character BCH checksum that is
guaranteed to detect any error affecting up to 4 characters. Bech32m fixed a
weakness in Bech32's checksum: inserting or deleting a `q` just before a final
`p` could go undetected. Taproot addresses therefore use Bech32m.

### Percent-encoding (URL encoding)

In a web address, any byte that is not a letter, digit or one of `- . _ ~` can be
written as `%` and two hex digits (RFC 3986 §2.1): a space is `%20`, `&` is `%26`,
`/` is `%2F`. HTML forms also write a space as `+`. A URL holding a token or
key has it percent-encoded, which hides nothing: the value is still in browser
history and server logs.

### UTF-8: text to bytes

Before text can be hashed, signed or encrypted it must become bytes, and UTF-8
(RFC 3629) is the usual choice: ASCII letters stay one byte, other characters take
2 to 4. `ü` is `c3 bc`. The same letter can also be written as `u` plus a
combining mark (`75 cc 88`), so two strings that look identical can hash
differently. Passwords and names are therefore normalized (Unicode NFC, or the
PRECIS rules of RFC 8265) before they are hashed.

### Quoted-printable

Email's other text encoding (RFC 2045 §6.7) keeps ASCII readable and writes other
bytes as `=` and two hex digits: Python's `quopri` turns `Café = good` into
`Caf=C3=A9 =3D good`. It is for mostly-English text; Base64 is used for binary
attachments.

## Decoding

Decoding reverses the steps and must refuse what is not valid:

```
$ echo TWFycyE= | base64 -d
Mars!
$ echo TWFycyE | base64 -d                # padding missing
Mars!base64: invalid input
$ printf 'Mars!' | basenc --z85
basenc: invalid input (length must be multiple of 4 characters)
```

Decoders differ in how strict they are, and that matters for security:

- **More than one encoding of the same bytes.** In `TWFycyE=` the last
  character carries 2 unused bits. Python's `base64.b64decode` decodes both
  `TWFycyE=` and `TWFycyF=` to `Mars!`. RFC 4648 §3.5 lets decoders reject
  such non-canonical input. Never compare encoded strings to decide whether two
  signatures, tokens or keys are the same: decode first, then compare the bytes.
- **Characters outside the alphabet.** Some decoders skip spaces, newlines or
  unknown characters; others stop. A filter that checks the encoded text and a
  decoder that skips characters can disagree about what the data is.
- **Secrets in memory.** Decoding a private key from PEM with table lookups can
  leak key bits through the CPU cache. Sieck and others showed this in OpenSSL,
  wolfSSL and others (CCS 2021), and libraries moved to constant-time Base64 for
  key files.

## Common mistakes

- **Treating Base64 as protection.** HTTP Basic authentication sends `user:password`
  as Base64 (RFC 7617): `jim:secret` is `amltOnNlY3JldA==`, readable by anyone on
  the path. It is safe only inside [TLS](../protocols/TLS-1.3.md).
- **Thinking a JWT is secret.** A signed JWT's payload is base64url text that
  anyone can decode; only JWE (an encrypted JWT) hides it.
- **Mixing Base64 and base64url.** A `+` in a URL can turn into a space, and a
  `/` breaks a path. Use base64url in URLs and file names.
- **Hashing text, not bytes.** Hash the UTF-8 bytes, and agree on
  normalization, case and line endings first, or the same text gives different
  digests.
- **Double encoding.** Percent-encoding a value twice (`%2520`) or
  Base64-encoding Base64 gives data that still "works" in tests but not on the
  other side.

## See also

- [Key and certificate files](File-Formats.md): PEM is DER in Base64 between BEGIN and END lines
- [ASN.1 and DER](ASN.1-DER.md): the binary encoding under every certificate and key
- [JWT](../protocols/JWT.md) / [TOTP](../protocols/TOTP.md) / [Bitcoin](../protocols/Bitcoin.md): base64url, Base32, and Base58Check and Bech32 in use
- [Hash functions](../index.md#7-hash-functions): what to use when you need integrity, which no encoding gives

## References

- [RFC 4648: The Base16, Base32, and Base64 Data Encodings](https://www.rfc-editor.org/rfc/rfc4648) (Sections 3.5, 4, 5, 6, 8)
- [RFC 2045: MIME Part One](https://www.rfc-editor.org/rfc/rfc2045) (Sections 6.7, 6.8) / [RFC 7468: Textual Encodings of PKIX, PKCS, and CMS Structures](https://www.rfc-editor.org/rfc/rfc7468) (Section 2)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986) (Sections 2.1–2.4) / [RFC 3629: UTF-8](https://www.rfc-editor.org/rfc/rfc3629) / [RFC 8265: PRECIS usernames and passwords](https://www.rfc-editor.org/rfc/rfc8265)
- [RFC 7515: JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515) (Section 2) / [RFC 7617: HTTP Basic authentication](https://www.rfc-editor.org/rfc/rfc7617) (Section 2)
- [BIP-173: Bech32](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki) / [BIP-350: Bech32m](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki) / Bitcoin Core [`src/base58.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp)
- Sieck, Berndt, Wichelmann and Eisenbarth, "Util::Lookup: Exploiting Key Decoding in Cryptographic Libraries", ACM CCS 2021
- GNU coreutils [`base64`, `base32`, `basenc`](https://www.gnu.org/software/coreutils/manual/html_node/basenc-invocation.html) / Python [`base64`](https://docs.python.org/3/library/base64.html), [`urllib.parse`](https://docs.python.org/3/library/urllib.parse.html), [`quopri`](https://docs.python.org/3/library/quopri.html)

*Weaker sources:* the Base58 alphabet and Base58Check layout come from Bitcoin
Core's source, which could not be opened from here; the Sieck et al. paper and
the list of libraries that changed are from memory of the paper, not checked
again here.
