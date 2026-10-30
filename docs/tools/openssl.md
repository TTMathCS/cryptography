# openssl

*The command-line tool of the OpenSSL library: keys, certificates, a test CA,
TLS test clients and servers, and conversions between file formats. Linux
distributions and Homebrew ship it; macOS's `/usr/bin/openssl` is LibreSSL,
which differs in places (last section).*

**Version shown:** OpenSSL 3.0.13 (30 Jan 2024), Ubuntu 24.04 in a container,
Oct 2026; 3.5, 3.6 and 4.0 are newer. **Docs:** `man openssl-x509` and so on,
one page per command ([3.0 sources](https://github.com/openssl/openssl/tree/openssl-3.0/doc/man1));
[CHANGES.md](https://github.com/openssl/openssl/blob/master/CHANGES.md).

## Keys and signatures

```
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out rsa.key  # RSA; 2048 bits if no size
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out ec.key  # ECDSA and ECDH on P-256
openssl genpkey -algorithm ED25519 -out ed.key           # Ed25519; X25519 and ED448 the same way
openssl genrsa -out old.key 2048                         # older, maintenance only; PKCS#8 since 3.0
openssl pkey -in ec.key -pubout -out ec.pub              # public key; ed.pub the same way
openssl pkey -in ec.key -noout -text                     # private value, public point, curve
openssl pkey -in ec.key -aes256 -out ec.enc.key          # add a passphrase (PKCS#8, PBES2)
openssl dgst -sha256 msg.txt                             # SHA2-256(msg.txt)= …, as sha256sum
openssl dgst -sha256 -sign ec.key -out msg.sig msg.txt   # ECDSA signature, DER
openssl dgst -sha256 -verify ec.pub -signature msg.sig msg.txt   # Verified OK
openssl pkeyutl -sign -inkey ed.key -rawin -in msg.txt -out msg.ed.sig   # Ed25519: 3.0's dgst refuses it
openssl pkeyutl -verify -pubin -inkey ed.pub -rawin -in msg.txt -sigfile msg.ed.sig   # Signature Verified Successfully
openssl rand -hex 32                                     # 32 random bytes as hex
```

## A test CA and chain

```
printf 'basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n' > int.ext
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\n' > leaf.ext
for k in root int leaf; do openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out $k.key; done
openssl req -x509 -key root.key -subj "/O=Test/CN=Test Root CA" -days 3650 -out root.crt \
  -addext basicConstraints=critical,CA:TRUE -addext keyUsage=critical,keyCertSign,cRLSign
openssl req -new -key int.key -subj "/O=Test/CN=Test Intermediate CA" -out int.csr
openssl x509 -req -in int.csr -CA root.crt -CAkey root.key -days 1825 -extfile int.ext -out int.crt
openssl req -new -key leaf.key -subj /CN=www.example.test \
  -addext subjectAltName=DNS:www.example.test,DNS:example.test -out leaf.csr   # names go in the SAN
openssl x509 -req -in leaf.csr -CA int.crt -CAkey int.key -days 90 \
  -extfile leaf.ext -copy_extensions copy -out leaf.crt                         # copies the SAN from the CSR
openssl verify -CAfile root.crt -untrusted int.crt leaf.crt                   # leaf.crt: OK
openssl verify -x509_strict -verify_hostname example.test -CAfile root.crt -untrusted int.crt leaf.crt
cat leaf.crt int.crt > chain.pem                                               # what a server sends, leaf first
```

**Why older recipes fail.** In 3.x, `x509 -req -extensions v3_ca` without
`-extfile` warns `ignoring -extensions option without -extfile` and issues a
v1 certificate with no extensions (4.0 reads the default config instead), so
`verify` stops at `error 79 at 1 depth lookup: invalid CA certificate`.
Putting the intermediate in `-CAfile` hides a missing one: a client has only
the root and gets intermediates from the server, as `-untrusted` mimics.
Clients match names in the SAN, not the CN ([X.509](../formats/X.509.md));
`-addext` needs 1.1.1+. `-x509_strict` wants keyUsage on CAs, which Ubuntu's
`v3_ca` lacks (error 92).

## Inspect certificates

```
openssl x509 -in leaf.crt -noout -text                   # every field; only the first cert in a file
openssl x509 -in leaf.crt -noout -subject -issuer -dates -serial
openssl x509 -in leaf.crt -noout -ext subjectAltName,keyUsage,extendedKeyUsage
openssl x509 -in leaf.crt -noout -fingerprint -sha256    # SHA-1 if you leave out -sha256
openssl x509 -in leaf.crt -noout -checkend 2592000       # exit 1 if it expires within 30 days
openssl x509 -inform DER -in leaf.cer -noout -text       # DER; 3.0 also tells DER from PEM by itself
openssl req -in leaf.csr -noout -text -verify            # a CSR and its self-signature
openssl storeutl -noout -text -certs chain.pem           # every certificate in a bundle
while openssl x509 -noout -text; do :; done < chain.pem  # the same as a loop; ends with an error at EOF
openssl asn1parse -in leaf.crt -i                        # the DER tree (ASN.1 and DER page)
certutil -dump leaf.cer                                  # Windows' own tool, not openssl (not run here)
```

## Remote servers

```
openssl s_server -accept 4433 -cert leaf.crt -key leaf.key -cert_chain int.crt -www &   # local test server
openssl s_client -connect localhost:4433 -servername www.example.test \
  -CAfile root.crt -verify_hostname www.example.test </dev/null                       # check it like a client
# A real site needs network; these forms ran here against the local server instead.
openssl s_client -connect example.org:443 </dev/null 2>/dev/null | openssl x509 -noout -subject -enddate  # leaf
openssl s_client -connect example.org:443 -noservername </dev/null           # no SNI: the default certificate
openssl s_client -connect example.org:443 -showcerts </dev/null 2>/dev/null \
  | sed -n '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > example.org.pem    # every certificate it sent
openssl s_client -connect example.org:443 -verify_return_error </dev/null    # exit 1 if verification fails
curl -sS -o /dev/null -w '%{certs}' https://example.org/                     # curl 7.88+: the chain, with PEM
curl -sv -o /dev/null https://example.org/ 2>&1 | awk '/^\* SSL connection/ {c=1} c && /^\*  /'  # summary
```

```
$ openssl s_client -connect localhost:4433 -servername www.example.test … </dev/null    # trimmed
Certificate chain
 0 s:CN = www.example.test
   i:O = Test, CN = Test Intermediate CA
 1 s:O = Test, CN = Test Intermediate CA
   i:O = Test, CN = Test Root CA
Verified peername: www.example.test
Verify return code: 0 (ok)
```

**`s_client` carries on after a bad certificate** and gives the verdict in
`Verify return code`: here 20 without `-CAfile root.crt`, 21 when the server
had no `-cert_chain`, 62 for a wrong `-verify_hostname`. `-showcerts` prints
what the server sent, not a verified chain; `x509` reads only the leaf. Since
1.1.1 the `-connect` host goes out as SNI (not `localhost` or an IP address),
so old "without SNI" recipes sent it anyway; `-noservername` leaves it out.
`curl --insecure` (`-k`) skips certificate and host-name checks: prefer
`--cacert root.crt` for a private CA.

## Convert

```
openssl x509 -in leaf.crt -outform DER -out leaf.cer      # PEM to DER (first certificate only)
openssl x509 -in leaf.cer -out leaf.pem                   # DER to PEM
openssl pkey -in leaf.key -outform DER -out leaf.key.der  # keys the same way, with pkey
openssl pkcs12 -export -in leaf.crt -inkey leaf.key -certfile int.crt -name www -out leaf.p12  # asks for a password
openssl pkcs12 -in leaf.p12 -info -nokeys                 # algorithms, then the certificates
openssl pkcs12 -in leaf.p12 -noenc -out all.pem           # back to PEM, key unencrypted
openssl pkcs12 -export -legacy -in leaf.crt -inkey leaf.key -certfile int.crt -out old.p12   # RC2, 3DES, SHA-1
openssl pkcs12 -legacy -in old.p12 -info -nokeys          # reading RC2-40 needs -legacy too
openssl crl2pkcs7 -nocrl -certfile leaf.crt -certfile int.crt -out chain.p7b   # PKCS#7 chain, no key
openssl pkcs7 -in chain.p7b -print_certs -out chain.pem   # and back to PEM
```

**PKCS#12 for Java.** Older recipes' `-CAfile ca.crt -caname root` adds no
CA certificate, as `pkcs12` reads `-CAfile` only with `-chain`: use
`-certfile`, or `-chain -CAfile root.crt -untrusted int.crt`, which adds the
root too. `-name` is the alias [keytool](../tools/keytool.md) shows. Set a
password: keytool (JDK 21) imported 0 entries from a password-less `-nomac`
file here. 3.0 encrypts with AES-256 and PBKDF2 ([File formats](../formats/File-Formats.md)).

## Versions and LibreSSL

```
openssl list -signature-algorithms              # RSA, DSA, ED25519, ED448, SM2, ECDSA and MACs
openssl list -kem-algorithms                    # 3.0: RSA only
openssl genpkey -algorithm ML-DSA-65 -out mldsa.key   # 3.5+; 3.0: Error initializing ML-DSA-65 context
openssl genpkey -algorithm ML-KEM-768 -out mlkem.key  # 3.5+ (not run here)
```

OpenSSL 3.5.0 (8 April 2025) added ML-KEM, ML-DSA and SLH-DSA, and its TLS
client sends X25519MLKEM768 and X25519 key shares by default. 3.2.0 made
`x509`, `req` and `ca` always write v3; 4.0.0 (14 April 2026) removed engines.

**LibreSSL.** macOS's `/usr/bin/openssl` is LibreSSL (3.3.6 on the Mac used
for [TLS 1.3](../protocols/TLS-1.3.md)). In 3.3.6 `s_client` sends SNI only
with `-servername` (the host name from LibreSSL 3.5.0); `genpkey` has no
Ed25519 (3.7.0); `pkcs12 -export` writes RC2-40 and 3DES, which OpenSSL 3
reads only with `-legacy`; `-noenc` (use `-nodes`), `-noservername`, `x509
-ext`, `verify -verify_hostname` and `storeutl` are missing; `req -addext`
works. Homebrew's `openssl@3` formula (3.5.9) has everything here.

## See also

- [X.509](../formats/X.509.md) / [ASN.1 and DER](../formats/ASN.1-DER.md) / [File formats](../formats/File-Formats.md): what these commands print, parse and convert
- [PKI](../protocols/PKI.md): chains, CAs and trust stores, and why only the root is trusted
- [TLS 1.3](../protocols/TLS-1.3.md): what `s_client` negotiates; [S/MIME](../protocols/S-MIME.md): `openssl cms` for signed and encrypted mail
- [keytool](../tools/keytool.md): Java key stores, including importing `leaf.p12`

## References

- OpenSSL 3.0 manual: [`openssl-req`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-req.pod.in) / [`openssl-x509`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-x509.pod.in) / [`openssl-verification-options`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-verification-options.pod) / [`openssl-s_client`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-s_client.pod.in) / [`openssl-pkcs12`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-pkcs12.pod.in) / [`openssl-format-options`](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-format-options.pod) / other versions: [1.1.1 `req`](https://github.com/openssl/openssl/blob/OpenSSL_1_1_1-stable/doc/man1/req.pod) (`-addext`; not in [1.1.0](https://github.com/openssl/openssl/blob/OpenSSL_1_1_0-stable/doc/apps/req.pod)) / [3.5 `openssl-genpkey`](https://github.com/openssl/openssl/blob/openssl-3.5.9/doc/man1/openssl-genpkey.pod.in) (ML-DSA, ML-KEM) / [4.0 `openssl-x509`](https://github.com/openssl/openssl/blob/openssl-4.0.3/doc/man1/openssl-x509.pod.in) (`-extfile`, `-extensions`)
- [OpenSSL CHANGES.md](https://github.com/openssl/openssl/blob/master/CHANGES.md) (1.1.1: SNI by default, `-noservername`; 3.0.0: `-copy_extensions`, key identifiers, `genrsa` writes PKCS#8, `-x509_strict` checks; 3.2.0: v3 certificates; 3.5.0: ML-KEM, ML-DSA, SLH-DSA, default groups; 4.0.0: engines removed)
- LibreSSL 3.3.6: [openssl(1)](https://github.com/libressl/openbsd/blob/libressl-v3.3.6/src/usr.bin/openssl/openssl.1), [`pkcs12.c`](https://github.com/libressl/openbsd/blob/libressl-v3.3.6/src/usr.bin/openssl/pkcs12.c) / [portable ChangeLog](https://github.com/libressl/portable/blob/master/ChangeLog) (3.5.0, 3.7.0) / [Homebrew `openssl@3.rb`](https://github.com/Homebrew/homebrew-core/blob/master/Formula/o/openssl@3.rb)
- curl: [`--insecure`](https://github.com/curl/curl/blob/master/docs/cmdline-opts/insecure.md), [`--write-out`](https://github.com/curl/curl/blob/master/docs/cmdline-opts/write-out.md) (`certs`) / Microsoft [certutil](https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/administration/windows-commands/certutil.md) (`-dump`)
