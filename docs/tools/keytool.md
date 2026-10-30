# keytool

*The JDK's key and certificate tool: key pairs, certificate requests, CA
replies and trusted certificates, all kept in Java key stores. Every JDK ships it.*

**Version shown:** keytool 21.0.12.1 (OpenJDK 21), and 17.0.20.1 where it
differs, Ubuntu 24.04 in a container, Oct 2026. **Docs:** `keytool -help`,
`keytool -importcert -help`, keytool(1) ([JDK 21](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/man/keytool.1), [current](https://github.com/openjdk/jdk/blob/master/src/java.base/share/man/keytool.md)).

## Trust stores

```
keytool -importcert -alias example-root -file ca.crt \
        -keystore truststore.p12                       # PEM or DER; creates the store
keytool -importcert -alias example-root -file ca.crt -noprompt \
        -keystore truststore.jks -storetype JKS        # JKS, for a reader that needs it
keytool -importcert -alias example-root -file ca.crt \
        -cacerts -storepass changeit                   # into the JDK's own cacerts
keytool -list -cacerts -storepass changeit             # the CA certificates Java trusts
```

```
$ keytool -importcert -alias example-root -file ca.crt -keystore truststore.jks -storepass jkspass -keypass keypass
Warning:  Different store and key passwords not supported for PKCS12 KeyStores. Ignoring user-specified -keypass value.
…
Trust this certificate? [no]:  yes
Certificate was added to keystore
$ keytool -list -keystore truststore.jks -storepass jkspass | head -1
Keystore type: PKCS12
```

The `.jks` file is PKCS#12, the default since JDK 9 (both formats and
`cacerts`: [Key and certificate files](../formats/File-Formats.md)). A trusted
certificate has no key, so `-keypass` does nothing. Compare the fingerprint
keytool prints with the CA's before typing `yes`; with no terminal the answer
is no, yet keytool exits 0, so scripts need `-noprompt`. `-import` is the old
name of `-importcert`. JDK 8's `jre/lib/security/cacerts` path is gone
(keytool 21: `FileNotFoundException`); `-cacerts`, new in JDK 9, finds the
file, on Ubuntu `/etc/ssl/certs/java/cacerts`.

## Key pairs and CA replies

```
keytool -genkeypair -alias app -keyalg EC -groupname secp256r1 -validity 365 \
        -dname CN=app.example -ext san=dns:app.example,dns:www.app.example \
        -keystore app.p12                                               # key pair, self-signed certificate
keytool -genkeypair -alias rsa -keyalg RSA -keysize 3072 -dname CN=rsa.example -keystore app.p12
keytool -genkeypair -alias ed -keyalg Ed25519 -dname CN=ed.example -keystore app.p12
keytool -certreq -alias app -ext san=dns:app.example,dns:www.app.example \
        -file app.csr -keystore app.p12                                 # CSR: repeat -ext, it is not copied
keytool -importcert -alias example-root -file ca.crt -keystore app.p12  # trust the CA first
keytool -importcert -alias app -file app-chain.pem -keystore app.p12    # its reply, same alias
keytool -exportcert -rfc -alias app -file app.pem -keystore app.p12     # PEM; DER without -rfc
keytool -delete -alias rsa -keystore app.p12
keytool -storepasswd -keystore app.p12                                  # PKCS#12: re-protects the keys too
```

`-keyalg` is required and defaults move: keytool 17 makes 256-bit EC and
2,048-bit RSA keys signed with SHA-256, keytool 21 384-bit and 3,072-bit with
SHA-384. Certificates last 90 days without `-validity`. The reply (PEM chain
or `.p7b`) must chain to a root trusted in the store, or in `cacerts` with
`-trustcacerts`; else keytool asks `Install reply anyway?`, and `-noprompt`
says yes. In PKCS#12 the key password is the store password: keytool ignores
another `-keypass` with a warning, and `-keypasswd` fails.

## Import and convert

```
# step 1 is OpenSSL's: openssl pkcs12 -export … -out server.p12 (see openssl.md)
keytool -list -keystore server.p12                     # JDK 9+: a .p12 already is a key store
keytool -importkeystore -srckeystore server.p12 -srcalias server \
        -destkeystore server.keystore                  # copy the entry into another store
keytool -importkeystore -srckeystore old.jks -destkeystore old.jks \
        -deststoretype pkcs12                          # JKS to PKCS#12 in place, keeps old.jks.old
```

```
$ keytool -list -keystore old.jks -storepass changeit
…
Warning:
The JKS keystore uses a proprietary format. It is recommended to migrate to PKCS12 which is an industry standard format using "keytool -importkeystore -srckeystore old.jks -destkeystore old.jks -deststoretype pkcs12".
```

keytool cannot import a PEM private key, so [openssl](openssl.md) puts key and
chain in PKCS#12 first. `-alias` works as `-srcalias`. keytool 17 and 21 throw
no NullPointerException on password-less PKCS#12 files, as old advice warned,
but two cases fail. An empty password (`-passout pass:`) needs `-srcstorepass
''`: Enter at the prompt means none and ends in `Too many failures - try
later`. An unencrypted key (`-keypbe NONE`) is skipped, since Java reads only
encrypted key bags: `0 entries successfully imported`, exit 0. Set a password.

The JKS warning comes only for a store holding keys; JDK 26 says JKS "will be
removed in a future release". Current JDK 8 updates load PKCS#12 asked for as
JKS (`keystore.type.compat`), so converting back is rarely needed.

## Inspect

```
keytool -printcert -file server.crt                            # PEM or DER: names, dates, fingerprints
keytool -list -v -keystore app.p12                             # every entry in full
keytool -list -keystore app.p12 -alias app                     # one entry, SHA-256 fingerprint
keytool -printcert -sslserver localhost:8443                   # chain a TLS server sends; port 443 if none
keytool -printcert -sslserver localhost:8443 -rfc > chain.pem  # the same, as PEM
```

```
$ keytool -printcert -file server.crt | sed -n 5,7p
Certificate fingerprints:
	 SHA1: A9:58:9B:5E:76:5C:ED:29:5F:63:17:93:95:FF:E9:F5:27:BE:08:9F
	 SHA256: 8D:FE:4D:7F:BE:F7:96:53:F9:85:63:00:50:12:A6:A7:21:8B:17:E9:33:60:C7:2B:20:C0:1D:27:39:60:3A:29
```

OpenSSL's `-fingerprint -sha256` prints the same. `-sslserver` (run here
against `openssl s_server` on localhost) accepts any chain and host name: it
shows what a server sends, not whether Java trusts it. Behind a proxy add
`-J-Dhttps.proxyHost=… -J-Dhttps.proxyPort=…`. Without the password `-list`
skips its integrity check: fine for JKS `cacerts`, but keytool's PKCS#12
encrypts certificates, so a trust store looks empty.

## See also

- [Key and certificate files](../formats/File-Formats.md): JKS, JCEKS, PKCS#12, key store or trust store, `cacerts`
- [X.509](../formats/X.509.md) / [PKI](../protocols/PKI.md) / [TLS 1.3](../protocols/TLS-1.3.md): what `-printcert` shows and `-ext` writes, chains and CAs, where Java uses these stores
- [openssl](openssl.md): PEM keys, `pkcs12 -export`, and a CA to sign keytool's CSRs

## References

- keytool(1): [JDK 21 `keytool.1`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/man/keytool.1) / [current `keytool.md`](https://github.com/openjdk/jdk/blob/master/src/java.base/share/man/keytool.md) ("In JDK 9 and later, the default keystore implementation is PKCS12"; defaults, `-cacerts`, `-importcert`, `-sslserver`)
- [JEP 229: Create PKCS12 Keystores by Default](https://openjdk.org/jeps/229) / `java.security` in [JDK 9](https://github.com/openjdk/jdk/blob/jdk-9%2B181/jdk/src/java.base/share/conf/security/java.security) (`keystore.type=pkcs12`) and [JDK 8u](https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/lib/security/java.security-linux) (`jks`, `keystore.type.compat`)
- OpenJDK keytool: [`Main.java`](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/sun/security/tools/keytool/Main.java) (`-alias` as `-srcalias`, `-certreq` extensions, JKS warning), [at JDK 9](https://github.com/openjdk/jdk/blob/jdk-9%2B181/jdk/src/java.base/share/classes/sun/security/tools/keytool/Main.java) (`-cacerts`) / [`Resources.java` (JDK 21)](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/sun/security/tools/keytool/Resources.java) / [`keytool.properties` (JDK 26)](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/sun/security/tools/keytool/resources/keytool.properties) / [`SSLServerCertStore.java`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/sun/security/provider/certpath/ssl/SSLServerCertStore.java) (trusts any chain) / [`PKCS12KeyStore.java`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/sun/security/pkcs12/PKCS12KeyStore.java) (bag types it reads)
