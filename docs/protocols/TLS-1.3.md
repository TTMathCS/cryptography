# TLS 1.3 (Transport Layer Security)

*The protocol behind HTTPS. One round trip agrees on keys, proves the server's
identity with a certificate, and switches every byte after that to an AEAD
cipher.*

**Standard:** RFC 8446 (2018); QUIC (HTTP/3) runs the same handshake over UDP,
RFC 9000 and RFC 9001 (2021). **Implementations:** OpenSSL, BoringSSL (Chrome,
Android), NSS (Firefox), rustls, GnuTLS, SChannel (Windows), LibreSSL (macOS
command line).

## One connection, one algorithm per category

Real output from `openssl s_client -connect www.google.com:443` on a Mac
(LibreSSL 3.3.6, Oct 2026):

```
Server Temp Key: ECDH, X25519, 253 bits
    Protocol  : TLSv1.3
    Cipher    : AEAD-CHACHA20-POLY1305-SHA256
```

| TLS name | Category | Algorithm inside |
|---|---|---|
| `x25519` key share | [Key exchange](../index.md#1-key-exchange) | Diffie-Hellman on Curve25519 |
| certificate key | [Signature](../index.md#2-digital-signatures) | Google's certificate holds an ECDSA P-256 key |
| `TLS_CHACHA20_POLY1305_SHA256` | [Cipher](../index.md#5-cipher-modes-and-aead) | ChaCha20-Poly1305 for the data |
| (same suite) | [Hash](../index.md#7-hash-functions) / [KDF](../index.md#8-key-derivation-and-password-hashing) | SHA-256 for the transcript and HKDF |
| MAC | [MAC](../index.md#6-mac) | Poly1305, built into the AEAD |

**Why X25519 and not post-quantum?** LibreSSL 3.3.6 is older than ML-KEM, so it
never offers `X25519MLKEM768`. Chrome talking to the same server gets the
hybrid. The library decides what you get: the Mac's system Python links an even
older LibreSSL (2.8.3) and only reaches TLS 1.2 (see the example below).

Unlike SSH, the **server** chooses in TLS: the client offers lists and the
server picks from them.

## How a connection works

1. **ClientHello:** supported versions, cipher suites, `supported_groups`,
   `signature_algorithms`, and a `key_share` with a public key for the group it
   guesses the server will pick (for example `X25519MLKEM768` and `x25519`).
2. **ServerHello:** the server picks a suite and a group and sends its own key
   share. Both sides now hold the shared secret, and everything after this
   message is encrypted.
3. **EncryptedExtensions, Certificate, CertificateVerify, Finished:** the server
   sends its certificate chain, signs the transcript hash with the
   certificate's key, and sends an HMAC over the transcript.
4. **Client checks** the chain against its trust store (see [PKI](PKI.md)), the
   signature and the Finished MAC, then sends its own Finished. Application data
   flows.

If the client guessed the wrong group, the server answers with a
HelloRetryRequest and the handshake costs one more round trip. Resumed sessions
can send 0-RTT early data in the first flight, but an attacker can replay it,
so servers accept it only for safe requests.

Keys come from the HKDF key schedule (RFC 8446 §7.1): early secret → handshake
secret → master secret, each step mixing in the transcript hash.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange (`supported_groups`) | `X25519MLKEM768`, `x25519`, `secp256r1`, `secp384r1`, `ffdhe2048` and larger | IETF draft (ecdhe-mlkem), RFC 8446 + RFC 7748, RFC 8446, RFC 7919 | RSA key transport, static DH, custom DH groups (all removed in 1.3) |
| Signature (`signature_algorithms`) | `ecdsa_secp256r1_sha256`, `rsa_pss_rsae_sha256`, `ed25519`; ML-DSA in drafts | RFC 8446, IETF draft | `rsa_pkcs1_sha1`, `ecdsa_sha1`; `rsa_pkcs1_*` only inside certificates, never in the handshake |
| Cipher suites (AEAD) | `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, `TLS_AES_128_CCM_SHA256` | RFC 8446 | CBC suites, RC4 (RFC 7465), 3DES, NULL and export suites (TLS 1.2 and older) |
| MAC | built into the AEAD; HMAC in Finished and HKDF | RFC 8446, RFC 2104 | HMAC-MD5 / HMAC-SHA-1 record MACs (old CBC suites) |
| Hash | SHA-256 or SHA-384, set by the cipher suite | FIPS 180-4 | MD5 + SHA-1 (TLS 1.0/1.1 PRF) |
| KDF | HKDF key schedule | RFC 5869, RFC 8446 §7.1 | TLS 1.2 PRF (RFC 5246) |

Every TLS 1.3 implementation must support `TLS_AES_128_GCM_SHA256`, `secp256r1`
and the `rsa_pss_rsae_sha256` and `ecdsa_secp256r1_sha256` signatures
(RFC 8446 §9.1). `X25519MLKEM768` is on by default in Chrome and Firefox and in
OpenSSL 3.5 (2025).

## Versions

| Version | Standard | Released | Deprecated | Status |
|---|---|---|---|---|
| SSL 2.0 | Netscape | 1995 | RFC 6176 (2011) | Broken |
| SSL 3.0 | RFC 6101 (historic) | 1996 | POODLE (2014); RFC 7568 (2015) | Broken |
| TLS 1.0 | RFC 2246 | 1999 | RFC 8996 (2021) | Legacy |
| TLS 1.1 | RFC 4346 | 2006 | RFC 8996 (2021) | Legacy |
| TLS 1.2 | RFC 5246 | 2008 | — | Acceptable |
| TLS 1.3 | RFC 8446 | 2018 | — | Recommended |

## Seeing it on your machine

- **Browser:** Chrome DevTools → Security shows the version, group and cipher
  of the current page.
- **Command line:**

```
openssl s_client -connect www.google.com:443 -servername www.google.com </dev/null
```

- **Python:** prints the version and cipher your Python's TLS library gets.

```python
import socket, ssl

host = input("host: ").strip() or "www.google.com"
ctx = ssl.create_default_context()
with socket.create_connection((host, 443)) as s:
    with ctx.wrap_socket(s, server_hostname=host) as t:
        print(t.version(), t.cipher()[0])
```

On the Mac's system Python (LibreSSL 2.8.3) this prints
`TLSv1.2 ECDHE-ECDSA-CHACHA20-POLY1305`. A Python built with OpenSSL 3 prints
TLS 1.3 and a `TLS_` suite.

## See also

- [SSH](SSH.md): same building blocks, but there the client's list decides
- [PKI](PKI.md): certificates, chains and the formats they come in
- [ECDH](../01-key-exchange/ECDH.md) / [AEAD](../05-modes-aead/AEAD.md) / [HKDF](../08-kdf-password-hashing/HKDF.md): the algorithms in depth

## References

- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 8996: deprecating TLS 1.0 and 1.1](https://www.rfc-editor.org/rfc/rfc8996)
- [RFC 9001: TLS in QUIC](https://www.rfc-editor.org/rfc/rfc9001)
- [draft-ietf-tls-ecdhe-mlkem](https://datatracker.ietf.org/doc/draft-ietf-tls-ecdhe-mlkem/)
- [IANA TLS parameters](https://www.iana.org/assignments/tls-parameters/)
