# PKI (Public Key Infrastructure)

## PKI Introduction

There are many PKI terms and resources available on the web, but unfortunately, many of them can be confusing and there don't seem to be easy, simple answers. Below is an outline of what I've learned about PKI:

1. **What information** should be included in a certificate? X.509 defines what data can go into a certificate, but at a high level of metadata.
2. **What abstract format** should X.509 use? It's like when saving data - should I use JSON or YAML? ASN.1 defines the abstract layer format of X.509 objects.
3. **What binary format** should a certificate be saved in? You can use text files, Word documents, or Apple Pages to save documents, each saving the data with different binary formats. For certificates, popular formats are DER, PEM, PKCS#7, and PKCS#12.

The above is a summary of these terms and their relationships. If you're interested in learning more, please continue reading below.

**Reference Links:**

- [Everything you should know about certificates and PKI but are too afraid to ask](https://smallstep.com/blog/everything-pki/)
- [Understanding X.509 digital certificate thumbprints](https://morgansimonsen.wordpress.com/2013/04/16/understanding-x-509-digital-certificate-thumbprints/)

---

## The Goal of Certificates and PKI: Bind Names to Public Keys

The rest is just implementation details.

---

## PKI Related Terms

- entity
- identity
- identifier
- name
- claim
- subscriber (end entity)
- certificate authority (CA) - issuer
- leaf certificates
- root certificate
- intermediate certificate
- relying party

---

## MACs and Signatures Authenticate Data

**MAC** = Message Authentication Code

MACs and digital signatures are both used to authenticate data, but they work differently:

- MACs use symmetric keys (same key for creation and verification)
- Digital signatures use asymmetric keys (private key for signing, public key for verification)

---

## What Can Key Pairs Do?

- **Encrypt data** with a public key, which can only be decrypted by the corresponding private key
- **Sign data** with a private key, which can be verified by the corresponding public key

---

## Formats

- [X.509 certificates](../formats/X.509.md): the fields in a certificate, field by field
- [ASN.1 and DER](../formats/ASN.1-DER.md): the notation X.509 is written in, and the bytes it becomes
- [Key and certificate files](../formats/File-Formats.md): PEM, DER, PKCS#7, PKCS#12, JKS, key stores and trust stores

---

## Commands to Create Self-Signed Certificate Chain

```shell
# Create certificates for root CA
openssl genrsa -out root.key 2048
openssl req -x509 -sha256 -nodes -extensions v3_ca -key root.key \
  -subj "/C=CA/ST=ON/O=HelloWorld/CN=root.example.com" -days 3650 -out root.crt

# Create certificates for intermediate CA
openssl genrsa -out intermediate.key 2048
openssl req -new -sha256 -nodes -key intermediate.key \
  -subj "/C=CA/ST=ON/O=HelloWorld/CN=intermediate.example.com" -out intermediate.csr
openssl x509 -req -extensions v3_ca -in intermediate.csr -CA root.crt -CAkey root.key \
  -CAcreateserial -out intermediate.crt -days 500 -sha256

# Create certificates for end user
openssl genrsa -out enduser.key 2048
openssl req -new -sha256 -nodes -key enduser.key \
  -subj "/C=CA/ST=ON/O=HelloWorld/CN=enduser.example.com" -out enduser.csr
openssl x509 -req -in enduser.csr -CA intermediate.crt -CAkey intermediate.key \
  -CAcreateserial -out enduser.crt -days 500 -sha256

# Verify certificate chain
openssl verify -CAfile <(cat intermediate.crt root.crt) enduser.crt
openssl verify -CAfile <(cat root.crt intermediate.crt) enduser.crt
```

---

## Commands to Import Certificate into TrustStore (JKS format)

```shell
# Import certificate into existing Java truststore
# The "keytool -importcert" command can read certificates in both PEM and DER formats
keytool -importcert -file <openssl_crt.pem> -keystore <jks-file-name.jks> \
  -storepass jkspass -alias <alias-name> -keypass <keypass>

keytool -trustcacerts -keystore "/jdk/jre/lib/security/cacerts" -storepass changeit \
  -importcert -alias testalias -file "/opt/ssl/test.crt"

# Create new truststore and import the certificate
keytool -import -alias testalias -file test.crt -keypass keypass \
  -keystore test.jks -storepass test@123
```

---

## Commands to Import X.509 Certificate and Private Key into Java Keystore

Surprisingly, keytool does not provide basic functionality for importing private keys to keystores. You can use this workaround by merging a PKCS#12 file with a private key into a keystore:

```shell
# Step 1: Convert the X.509 certificate and key to a PKCS#12 file
# Note: Make sure to set a password on the PKCS#12 file to avoid null pointer exceptions
openssl pkcs12 -export -in server.crt -inkey server.key -out server.p12 \
  -name [some-alias] -CAfile ca.crt -caname root

# Step 2: Convert the PKCS#12 file to a Java keystore
keytool -importkeystore \
  -deststorepass [changeit] -destkeypass [changeit] -destkeystore server.keystore \
  -srckeystore server.p12 -srcstoretype PKCS12 -srcstorepass some-password \
  -alias [some-alias]
```

---

## Commands to View a Certificate File

```shell
# View the contents of a PEM certificate
openssl x509 -in certificate.crt -text -noout
openssl x509 -inform pem -noout -text -in 'cerfile.cer'
openssl x509 -inform der -noout -text -in 'cerfile.cer'
keytool -printcert -file certificate.pem

# Windows
certutil -dump C:\path\certfile.cer

# Display all certificates in a PEM bundle file
while openssl x509 -noout -text; do :; done < cert-bundle.pem

# View the contents of a DER format certificate
openssl x509 -inform der -in CERTIFICATE.der -text -noout

# List items in truststore/keystore
keytool -v -list -keystore /path/to/keystore
keytool -list -keystore /path/to/keystore -alias foo
```

---

## Commands to View/Export Certificate of Remote Server

```shell
# With SNI (Server Name Indication)
openssl s_client -showcerts -servername www.google.ca -connect www.google.ca:443 </dev/null \
| openssl x509 -inform pem -text

# Check all certificates in a PEM file
while openssl x509 -noout -text; do :; done < _.google.com.pem

# View certificate of a remote server
echo | openssl s_client -showcerts -servername gnupg.org -connect gnupg.org:443 2>/dev/null \
  | openssl x509 -inform pem -noout -text

# Shows the certificate chain with detailed information
keytool -printcert -sslserver $host[:$port]

# Export remote server certificate
curl --insecure -vvI https://www.example.com 2>&1 \
  | awk 'BEGIN { cert=0 } /^\* SSL connection/ { cert=1 } /^\*/ { if (cert) print }'

openssl s_client -showcerts -connect host.name.com:443 -servername host.name.com </dev/null \
  | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > host.name.com.pem

# Convert to DER format for desktop use
openssl x509 -inform PEM -in host.name.com.pem -outform DER -out host.name.com.cer
```
