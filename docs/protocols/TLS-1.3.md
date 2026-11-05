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
| `x25519` key share | [Key exchange](../algorithms/table.md#1-key-exchange) | Diffie-Hellman on Curve25519 |
| certificate key | [Signature](../algorithms/table.md#2-digital-signatures) | Google's certificate holds an ECDSA P-256 key |
| `TLS_CHACHA20_POLY1305_SHA256` | [Cipher](../algorithms/table.md#5-cipher-modes-and-aead) | ChaCha20-Poly1305 for the data |
| (same suite) | [Hash](../algorithms/table.md#7-hash-functions) / [KDF](../algorithms/table.md#8-key-derivation-and-password-hashing) | SHA-256 for the transcript and HKDF |
| MAC | [MAC](../algorithms/table.md#6-mac) | Poly1305, built into the AEAD |

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

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 372" role="img" aria-labelledby="sk-c-tls13-t"><title id="sk-c-tls13-t">A message ladder: the client and server each send a key share, and from the server's certificate onward everything is encrypted</title><defs><filter id="sk-c-tls13-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-tls13-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-tls13-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-tls13-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-tls13-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="372" filter="url(#sk-c-tls13-paper)"/><g filter="url(#sk-c-tls13-pen)"><text x="30" y="44" text-anchor="start" class="h">One round trip, then everything is sealed</text><path class="p gold" d="M65 62 L195 62 L195 100 L65 100Z"/><text x="130.0" y="87.0" text-anchor="middle" class="s">client</text><path class="p dash" d="M130 102 L130 320"/><path class="p room" d="M445 62 L575 62 L575 100 L445 100Z"/><text x="510.0" y="87.0" text-anchor="middle" class="s">server</text><path class="p dash" d="M510 102 L510 320"/><path class="p ice" d="M134 170 L506 170 L506 316 L134 316Z" opacity=".55"/><path class="p " d="M134 128 L506 128" marker-end="url(#sk-c-tls13-ah)"/><text x="320.0" y="122" text-anchor="middle" class="s">ClientHello + key_share</text><path class="p " d="M506 160 L134 160" marker-end="url(#sk-c-tls13-ah)"/><text x="320.0" y="154" text-anchor="middle" class="s">ServerHello + key_share</text><path class="p " d="M506 200 L134 200" marker-end="url(#sk-c-tls13-ah)"/><text x="320.0" y="194" text-anchor="middle" class="s">certificate, signature, Finished</text><path class="p " d="M134 240 L506 240" marker-end="url(#sk-c-tls13-ah)"/><text x="320.0" y="234" text-anchor="middle" class="s">Finished</text><path class="p " d="M134 280 L506 280" marker-end="url(#sk-c-tls13-ah)"/><text x="320.0" y="274" text-anchor="middle" class="s">application data</text><text x="560" y="196" text-anchor="start" class="s">encrypted</text><text x="30" y="356" text-anchor="start" class="s">If the client guessed the wrong key-share group, a HelloRetryRequest costs one more round trip.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange (`supported_groups`) | **Post-quantum hybrid:** `X25519MLKEM768`<br>**Elliptic-curve DH:** `x25519`, `secp256r1`, `secp384r1`<br>**Classic DH:** `ffdhe2048` and larger | RFC 10024 (2026), RFC 8446 + RFC 7748, RFC 8446, RFC 7919 | RSA key transport, static DH, custom DH groups (all removed in 1.3) |
| Signature (`signature_algorithms`) | `ecdsa_secp256r1_sha256`, `rsa_pss_rsae_sha256`, `ed25519`; ML-DSA in drafts | RFC 8446, IETF draft | `rsa_pkcs1_sha1`, `ecdsa_sha1`; `rsa_pkcs1_*` only inside certificates, never in the handshake |
| Cipher suites (AEAD) | **AES-GCM:** `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`<br>**ChaCha20-Poly1305:** `TLS_CHACHA20_POLY1305_SHA256`<br>**AES-CCM:** `TLS_AES_128_CCM_SHA256` | RFC 8446 | CBC suites, RC4 (RFC 7465), 3DES, NULL and export suites (TLS 1.2 and older) |
| MAC | built into the AEAD; HMAC in Finished and HKDF | RFC 8446, RFC 2104 | HMAC-MD5 / HMAC-SHA-1 record MACs (old CBC suites) |
| Hash | SHA-256 or SHA-384, set by the cipher suite | FIPS 180-4 | MD5 + SHA-1 (TLS 1.0/1.1 PRF) |
| KDF | HKDF key schedule | RFC 5869, RFC 8446 §7.1 | TLS 1.2 PRF (RFC 5246) |

Every TLS 1.3 implementation must support `TLS_AES_128_GCM_SHA256`, `secp256r1`
and the `rsa_pkcs1_sha256` (in certificates), `rsa_pss_rsae_sha256` and
`ecdsa_secp256r1_sha256` signatures (RFC 8446 §9.1). `X25519MLKEM768` is on by default in Chrome and Firefox and in
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
  Type a host or press Enter for www.google.com. It needs the network.

```python
import socket, ssl

host = input("host: ").strip() or "www.google.com"
ctx = ssl.create_default_context()
with socket.create_connection((host, 443)) as s:
    with ctx.wrap_socket(s, server_hostname=host) as t:
        print(t.version(), t.cipher()[0])
```

What it prints depends on your TLS library and the server, so these outputs
come from the machines named. For www.google.com, the Mac's system Python
(LibreSSL 2.8.3) printed `TLSv1.2 ECDHE-ECDSA-CHACHA20-POLY1305`. Python 3.13
with OpenSSL 3.0.13, on a machine with no outside network, printed
`TLSv1.3 TLS_AES_256_GCM_SHA384` for `localhost`, where `openssl s_server` ran
with a test certificate trusted through `SSL_CERT_FILE`. A Python built with
OpenSSL 3 gets TLS 1.3 and a `TLS_` suite from any server that offers it.

## See also

- [SSH](SSH.md): same building blocks, but there the client's list decides
- [PKI](PKI.md) / [X.509](../formats/X.509.md) / [File formats](../formats/File-Formats.md): chains and trust stores, what a certificate holds, the files it comes in
- [WireGuard](WireGuard.md) / [Signal](Signal.md): X25519 and an AEAD again, but one fixed suite instead of a menu
- [ECDH](../01-key-exchange/ECDH.md) / [AEAD](../05-modes-aead/AEAD.md) / [HKDF](../08-kdf-password-hashing/HKDF.md): the algorithms in depth

## References

- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 8996: deprecating TLS 1.0 and 1.1](https://www.rfc-editor.org/rfc/rfc8996)
- [RFC 9001: TLS in QUIC](https://www.rfc-editor.org/rfc/rfc9001)
- [RFC 10024: Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3](https://www.rfc-editor.org/rfc/rfc10024) (August 2026; X25519MLKEM768, SecP256r1MLKEM768, SecP384r1MLKEM1024)
- [IANA TLS parameters](https://www.iana.org/assignments/tls-parameters/)
