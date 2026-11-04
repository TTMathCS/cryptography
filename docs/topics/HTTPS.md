# HTTPS and certificates guide

*The padlock in the browser: how a website proves who it is, and how to set it up on your own server. Four parts: stop at the one you need.*

[In one minute](#in-one-minute) · [Do it](#do-it) · [Expert](#expert) · [Now and next](#now-and-next)

## In one minute

HTTPS is the web with a lock on it. Two things happen each time you open a page:

- Your browser and the website agree on a **secret key** that only the two of them know, and lock everything with it. Someone on the café Wi-Fi sees only noise.
- The website shows a **certificate**: a signed card that says "this key belongs to www.example.com". It is signed by a **certificate authority** (CA), a company your browser already trusts. That is how you know you reached the real bank and not a copy.

The lock is called **TLS**. The certificate system is called **PKI**. The padlock means the line is private and the name is right. It does not mean the website is honest.

## Do it

**Look at a site's certificate**

```
openssl s_client -connect example.com:443 -servername example.com </dev/null | openssl x509 -noout -subject -issuer -enddate
curl -vI https://example.com 2>&1 | grep -E 'SSL connection|subject|expire|issuer'
```

**Get a free certificate for your server** (Let's Encrypt, with certbot; it also renews by itself)

```
sudo certbot --nginx -d example.com -d www.example.com     # or --apache; certbot certonly --standalone without a web server
sudo certbot renew --dry-run                               # check that renewal will work
```

**Make a key and a certificate request** (for a CA that wants a CSR)

```
openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -noenc \
  -keyout example.key -out example.csr \
  -subj "/CN=www.example.com" -addext "subjectAltName=DNS:www.example.com,DNS:example.com"
openssl req -in example.csr -noout -text                   # check it before you send it
```

**A certificate for testing on your own computer**

```
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -noenc -days 30 \
  -keyout dev.key -out dev.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
```

Browsers will warn about it, because no CA signed it. [mkcert](https://github.com/FiloSottile/mkcert) makes a local CA your own browsers trust, so the warning goes away on your machine only.

**Convert formats**

| From → to | Command |
|---|---|
| PEM → DER (`.cer`) | `openssl x509 -in cert.pem -outform DER -out cert.cer` |
| DER → PEM | `openssl x509 -in cert.cer -out cert.pem` |
| key + certificate + chain → PKCS#12 (`.p12` / `.pfx`, for Windows and Java) | `openssl pkcs12 -export -in cert.pem -inkey key.pem -certfile chain.pem -out bundle.p12` |
| PKCS#12 → PEM | `openssl pkcs12 -in bundle.p12 -noenc -out all.pem` |
| PKCS#7 (`.p7b`) → PEM | `openssl pkcs7 -in chain.p7b -print_certs -out chain.pem` |

More: [openssl](../tools/openssl.md), [keytool](../tools/keytool.md) for Java. What is inside each file: [X.509](../formats/X.509.md), [key and certificate files](../formats/File-Formats.md).

## Expert

### The algorithms, one per job

Full tables, with every name the protocol uses: [TLS 1.3](../protocols/TLS-1.3.md) and [PKI](../protocols/PKI.md).

| Job | Use | Standard | Avoid |
|---|---|---|---|
| Protocol version | TLS 1.3; TLS 1.2 for older clients | RFC 8446, RFC 5246 | SSL 2.0 and 3.0, TLS 1.0 and 1.1 (RFC 8996) |
| Key exchange | `X25519MLKEM768` (post-quantum hybrid), `x25519`, `secp256r1` | RFC 10024, RFC 7748, RFC 8446 | RSA key transport, static DH, custom DH groups |
| Cipher | AES-128-GCM, AES-256-GCM, ChaCha20-Poly1305 | RFC 8446, RFC 8439 | CBC suites, RC4 (RFC 7465), 3DES, NULL and export suites |
| Handshake signature | ECDSA P-256 with SHA-256, RSA-PSS | RFC 8446 | RSA PKCS#1 v1.5 in the handshake, anything with SHA-1 |
| Certificate | X.509 v3, ECDSA P-256 or RSA-2048+, signed with SHA-256 | RFC 5280, CA/Browser Forum Baseline Requirements | SHA-1 or MD5 signatures, RSA under 2048 bits |
| Getting certificates | ACME, automatic | RFC 8555 | manual renewal by calendar reminder |
| Who may issue for your domain | CAA DNS record | RFC 8659 | no CAA record (any CA may issue) |
| Seeing every certificate issued | Certificate Transparency logs | RFC 6962, RFC 9162 | |
| Keep browsers on HTTPS | HSTS header | RFC 6797 | |

### Implementations

| Implementation | Where you meet it |
|---|---|
| **OpenSSL** (and its forks **BoringSSL** in Chrome and Android, **LibreSSL** in OpenBSD and macOS's tools) | most servers: nginx, Apache, curl, Python, Node.js |
| **NSS** | Firefox, some Linux servers |
| **rustls** | Rust programs, newer servers and proxies |
| **Go** `crypto/tls` | Go servers (Caddy, Kubernetes tools) |
| **SChannel**, **Secure Transport / Network.framework** | Windows and Apple system libraries |
| **GnuTLS**, **wolfSSL**, **mbedTLS** | Linux tools, small devices |
| **certbot**, **acme.sh**, **Caddy**, **lego** | ACME clients that fetch and renew certificates |

Test a server: [testssl.sh](https://github.com/testssl/testssl.sh) (`testssl.sh example.com`) or the SSL Labs server test. Settings to copy: the Mozilla SSL Configuration Generator.

### Common mistakes, and what they cost

| Mistake | What happened |
|---|---|
| **Forgetting to renew** | Certificates expire on a set date, and the site breaks for everyone at once. An expired certificate in Ericsson's network software took down mobile data for millions of O2 (UK) and SoftBank (Japan) customers on 6 December 2018. Automate renewal. |
| **Missing intermediate certificate** | The server sends only its own certificate, not the chain. Some browsers fill the gap and others fail, so "it works on my machine". Serve the full chain (`fullchain.pem` with certbot). |
| **Turning off verification** | `curl -k`, `verify=False` in Python, "accept all certificates" in Java: the lock is still there, but anyone can stand in the middle. Fix the trust store instead. |
| **Private key in a Git repository or a container image** | Anyone who reads it can pretend to be your site. Keys stay on the server, readable only by the web server; rotate one that leaks. |
| **Old library, not updated** | Heartbleed (CVE-2014-0160, April 2014) let anyone read server memory, private keys included, from OpenSSL 1.0.1 to 1.0.1f. |
| **Trusting one CA too much** | DigiNotar was broken into in 2011 and issued a fake certificate for Google, used against users in Iran; browsers removed it and it went bankrupt. Certificate Transparency and CAA came out of lessons like this. |
| **Old protocol versions left on** | TLS 1.0 and 1.1 carry known attacks (BEAST, POODLE's fallback). Turn them off. |

### Best practices

- TLS 1.2 and 1.3 only; let the library pick ciphers from its modern defaults.
- ECDSA P-256 certificates (smaller and faster than RSA); an RSA one alongside only for very old clients.
- Renewal fully automatic, with an alert when it fails. Lifetimes are getting shorter every year (below).
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` once everything works on HTTPS.
- A CAA record naming your CA: `example.com. CAA 0 issue "letsencrypt.org"`.
- Watch Certificate Transparency for certificates you didn't ask for (crt.sh, or your CA's alerts).
- Inside a company: your own CA for internal services (step-ca, or a cloud CA), never self-signed certificates people learn to click through.

### Learn it properly

- [Book, 19.2 to 19.4](../book/19-Protocols.md#192-tls-thirty-years-of-lessons): thirty years of TLS, the 1.3 handshake step by step, and what went wrong
- [Book, chapter 16](../book/16-PKI-and-Key-Establishment.md): certificates and key establishment
- [ECDSA](../02-signatures/ECDSA.md), [RSA](../02-signatures/RSA.md), [ECDH](../01-key-exchange/ECDH.md), [ML-KEM](../01-key-exchange/ML-KEM.md), [AEAD and GCM](../05-modes-aead/AEAD.md), [HKDF](../08-kdf-password-hashing/HKDF.md): each algorithm in depth

## Now and next

*Last checked: 4 November 2026.*

- **Post-quantum key exchange is already on.** `X25519MLKEM768` is the default in Chrome, Firefox and OpenSSL 3.5 (2025), so most web traffic today is protected against "record now, decrypt later".
- **Certificates get shorter lives.** CA/Browser Forum ballot SC-081 (April 2025) cut the longest public TLS certificate from 398 days to 200 days from 15 March 2026, 100 days from 15 March 2027 and 47 days from 15 March 2029. Let's Encrypt offers 6-day certificates to everyone since January 2026. Manual renewal stops being possible.
- **Revocation moved to the browser.** Let's Encrypt stopped OCSP in 2025; browsers ship their own revocation lists (Firefox CRLite, Chrome CRLSets).
- **Post-quantum certificates are the hard part.** ML-DSA signatures are large, and a handshake carries several. Chrome plans to accept only Merkle Tree Certificates (draft-ietf-plants-merkle-tree-certs) in its quantum-resistant root store. More on the [PKI](../protocols/PKI.md) page.
- **To watch:** the CA/Browser Forum ballots, the IETF TLS working group, and [Chrome's root program](https://www.chromium.org/Home/chromium-security/root-ca-policy/).
