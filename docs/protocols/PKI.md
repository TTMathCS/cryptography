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

## Certificate Formats

- **X.509 v3** (PKIX described in RFC 5280) - used for HTTPS over TLS when certificates are used without additional qualification
- **SSH** - used for SSH key authentication
- **PGP** - used for email encryption and signing

---

## X.509 Certificate Structure (V3 defined in RFC5280)

X.509 is a certificate standard that defines which data should go into certificates. Certificates are essentially objects containing the name of servers, the name of who signed the certificates, the signature, and other information as listed below:

**Required Fields:**

- **Version number** - X.509 version (typically v3)
- **Serial number** - Unique identifier for the certificate
- **Signature Algorithm ID** - Algorithm used to sign the certificate
- **Issuer Name** - Distinguished name of the certificate authority
- **Validity period**
    - **Not Before** - Certificate valid start date
    - **Not After** - Certificate expiration date
- **Subject name** - Distinguished name of the certificate holder
- **Subject Public Key Info**
    - **Public Key Algorithm** - Algorithm used for the public key
    - **Subject Public Key** - The actual public key

**Optional Fields:**

- **Issuer Unique Identifier** - Optional unique ID for the issuer
- **Subject Unique Identifier** - Optional unique ID for the subject
- **Extensions** - Additional certificate attributes (v3 feature)
- **Certificate Signature Algorithm** - Algorithm used for certificate signature
- **Certificate Signature** - Digital signature of the certificate

**Commands to Check Website Certificates:**

```shell
# With SNI (Server Name Indication)
openssl s_client -showcerts -servername www.google.ca -connect www.google.ca:443 </dev/null \
| openssl x509 -inform pem -text

# Without SNI
openssl s_client -showcerts -connect www.google.ca:443 </dev/null \
| openssl x509 -inform pem -text

# Check all certificates in a PEM file
while openssl x509 -noout -text; do :; done < _.google.com.pem
```

---

## What is ASN.1 (Abstract Syntax Notation One)?

How should we write our certificates in a computer format? There are countless ways to format a document, and if we don't agree on one standard, then we will never be able to ask a computer to parse an X.509 certificate. ASN.1 tells you exactly how you should structure your object/certificate, similar to formats like JSON or YAML, but it doesn't define how they are saved as bits/bytes (those are defined by encoding formats like DER, PEM, PKCS#, etc.).

ASN.1 is the metadata definition that specifies what data needs to be included (mandatory or optional), but it doesn't define the actual storage format used for saving.

**Key Points about ASN.1:**

- **ASN** stands for **Abstract Syntax Notation** (the "1" stands for "One")
- ASN.1 is a notation for defining data types
- You can think of it like JSON for X.509, but it's actually more like Protocol Buffers, Thrift, or SQL DDL
- RFC 5280 uses ASN.1 to define an X.509 certificate as an object containing various information: names, keys, signatures, etc.

**Abstract Nature:**
ASN.1 is abstract in the sense that the standard doesn't specify how data should be represented as bits and bytes. For that, there are various encoding rules that specify concrete representations for ASN.1 data values. It's an additional abstraction layer that's supposed to be useful but can be complex.

**Encoding Rules:**
There are many encoding rules for ASN.1, but there's only one commonly used for X.509 certificates and other cryptographic data:

- **DER** (Distinguished Encoding Rules) - the most common
- **BER** (Basic Encoding Rules) - occasionally used but non-canonical

DER is a simple type-length-value encoding, but you don't need to worry about the details since libraries handle most of the complexity.

**Reference:** [Understanding X.509 digital certificate thumbprints](https://morgansimonsen.wordpress.com/2013/04/16/understanding-x-509-digital-certificate-thumbprints/)


---

## Certificate Binary Formats

Understanding the relationship between certificate standards:

- **X.509** defines what data goes into certificates
- **ASN.1** defines the abstract format it should have (like JSON or YAML)
- **Encoding formats** decide how to convert the certificate into bits and bytes (PEM, PKCS#7, DER, and PKCS#12)

### Common Certificate File Formats

**Reference:** [SSL Certificate File Extension Explanation](https://comodosslstore.com/resources/a-ssl-certificate-file-extension-explanation-pem-pkcs7-der-and-pkcs12/)

#### DER (Distinguished Encoding Rules)

- **Type:** Binary format
- **Content:** Can include certificates and private keys of all types
- **Extensions:** `.cer`, `.der`
- **Usage:** Primarily used for single certificates

#### PEM (Privacy Enhanced Mail)

- **Type:** Base64 encoded DER data
- **Extensions:** `.pem`, `.crt`, `.cer`, `.key`
- **Content:** A PEM file may contain server certificates, intermediate certificates (in `.crt` or `.cer` files), and private keys (in `.key` files)
- **Format markers:**
    - **Certificate:** `-----BEGIN CERTIFICATE-----` ... `-----END CERTIFICATE-----`
    - **Private key:** `-----BEGIN PRIVATE KEY-----` ... `-----END PRIVATE KEY-----`
    - **CSR:** `-----BEGIN CERTIFICATE REQUEST-----` ... `-----END CERTIFICATE REQUEST-----`

#### P7B/PKCS#7

- **Type:** Base64 ASCII encoded
- **Extensions:** `.p7b`, `.p7c`
- **Content:** Only certificates (no private keys)
- **Usage:** Contains certificates and certificate chains only
- **Format markers:** `-----BEGIN PKCS7-----` ... `-----END PKCS7-----`
- **Platforms:** Commonly used by Microsoft Windows and Java Tomcat

#### PFX/P12/PKCS#12

- **Type:** Binary format (password-protected)
- **Extensions:** `.pfx`, `.p12`
- **Content:** Server certificate, intermediate certificate, and private key in a single file
- **Usage:** Personal Information Exchange format
- **Platforms:** Typically used on Windows platforms for importing/exporting certificates and private keys

### Other ASN.1 Encoding Rules

- Basic Encoding Rules (BER)
- Canonical Encoding Rules (CER)
- XML Encoding Rules (XER)
- Canonical XML Encoding Rules (CXER)
- Extended XML Encoding Rules (E-XER)
- Packed Encoding Rules (PER, unaligned: UPER, canonical: CPER)
- Generic String Encoding Rules (GSER)

---

## TrustStores and KeyStores

TrustStores and KeyStores are primarily used in Java applications. They can be JKS (Java KeyStore) or PKCS#12 keystore types.

### KeyStore
A KeyStore consists of a database containing:

- A private key and its associated certificate, OR
- An associated certificate chain
- The certificate chain includes the client certificate and one or more Certification Authority (CA) certificates

### TrustStore  
A TrustStore contains only certificates trusted by the client (hence "trust" store):

- These are typically CA root certificates
- Usually self-signed certificates
- Used to verify the authenticity of certificates presented by other parties

**Reference:** [KeyStores and TrustStores - IBM Documentation](https://www.ibm.com/docs/ro/zos-connect/zosconnect/3.0?topic=connect-keystores-truststores)

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
