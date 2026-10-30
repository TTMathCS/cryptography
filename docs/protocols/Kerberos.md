# Kerberos

*Single sign-on for a network: log in once, and a trusted server (the KDC)
hands out tickets for every service you use. It is all symmetric crypto. Every
user and service shares a long-term key with the KDC, and a user's key is
derived from a password, which shapes most of what follows.*

**Standard:** Kerberos V5, RFC 4120 (July 2005), which replaced RFC 1510
(1993); encryption framework RFC 3961 and AES enctypes RFC 3962 (both
February 2005); AES with HMAC-SHA-2, RFC 8009 (2016, Informational).
Extensions: PKINIT, RFC 4556 (2006) and RFC 8636 (2019); FAST, RFC 6113
(2011); SPAKE pre-authentication, RFC 9588 (2024). **Implementations:** MIT
Kerberos, Heimdal, Active Directory domain controllers and Windows clients.

## One login, one algorithm per category

Real output from MIT Kerberos 1.20.1 (Ubuntu 24.04 in a container, Oct 2026)
in a throwaway realm on localhost: alice ran `kinit`, then `kvno
HTTP/www.example.org`. The KDC log (trimmed), then `klist -e`:

```
AS_REQ (8 etypes {aes256-cts-hmac-sha1-96(18), aes128-cts-hmac-sha1-96(17), aes256-cts-hmac-sha384-192(20), ...})
  NEEDED_PREAUTH: alice@EXAMPLE.ORG for krbtgt/EXAMPLE.ORG@EXAMPLE.ORG
AS_REQ ... ISSUE: etypes {rep=aes256-cts-hmac-sha1-96(18), tkt=aes256-cts-hmac-sha1-96(18), ses=aes256-cts-hmac-sha1-96(18)}
TGS_REQ ... ISSUE: etypes {rep=aes256-cts-hmac-sha1-96(18), tkt=aes256-cts-hmac-sha1-96(18), ses=aes256-cts-hmac-sha1-96(18)}

10/30/26 16:12:26  10/31/26 16:12:26  krbtgt/EXAMPLE.ORG@EXAMPLE.ORG
	Etype (skey, tkt): aes256-cts-hmac-sha1-96, aes256-cts-hmac-sha1-96
10/30/26 16:12:26  10/31/26 16:12:26  HTTP/www.example.org@EXAMPLE.ORG
	Etype (skey, tkt): aes256-cts-hmac-sha1-96, aes256-cts-hmac-sha1-96
```

`rep` encrypts the reply to the client, `tkt` the ticket for the service,
and `ses` is the new session key inside both. An enctype bundles cipher, MAC
and KDF:

| Kerberos name | Category | Algorithm inside |
|---|---|---|
| `aes256-cts` | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-256 in [CBC](../05-modes-aead/Classic-Modes.md#cbc) with ciphertext stealing, so nothing is padded; a random 16-byte confounder stands in for the IV |
| `hmac-sha1-96` | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA-1 cut to 12 bytes, computed over the plaintext |
| `-sha1` | [Hash](../index.md#7-hash-functions) | [SHA-1](../07-hash/Retired.md#sha-1), only inside HMAC and PBKDF2, where collisions don't matter |
| string-to-key | [KDF](../index.md#8-key-derivation-and-password-hashing) | [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-HMAC-SHA-1, 4,096 iterations, salt = realm + name (`EXAMPLE.ORGalice`), then DK with "kerberos" |
| key usage | [KDF](../index.md#8-key-derivation-and-password-hashing) | DK: AES-encrypt a constant to give each message type its own Ke, Ki and Kc |
| none | [Key exchange](../index.md#1-key-exchange) | no public key: the KDC picks every session key; PKINIT adds [DH](../01-key-exchange/Diffie-Hellman.md) or [ECDH](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) |
| none | [Signature](../index.md#2-digital-signatures) | none without PKINIT, which signs with [RSA](../02-signatures/RSA.md) or [ECDSA](../02-signatures/ECDSA.md) certificates |

**Why SHA-1 and not SHA-384?** The client's list decides, and MIT's default
list (unchanged in 1.22.2, January 2026) puts the SHA-1 pair first. New MIT
realms make only SHA-1 keys; this test realm also has
`aes256-cts-hmac-sha384-192` keys. With
`permitted_enctypes = aes256-sha2 aes256-sha1`, `rep` and `ses` switch to it
but `tkt` stays SHA-1, the service's first key. Active Directory's settings
stop at the AES-SHA1 pair.

## How a login works

1. **Long-term keys.** The KDC stores a key per enctype for every principal.
   For a user, string-to-key turns the password into each one, so the client
   can rebuild it at `kinit` without storing anything.
2. **AS-REQ and pre-authentication.** The client lists its enctypes; the KDC
   asks for pre-authentication and sends ETYPE-INFO2 (enctype, salt,
   iterations). The client resends with PA-ENC-TIMESTAMP, the time encrypted
   under its key (key usage 1), which must be within the clock skew, typically
   5 minutes.
3. **AS-REP.** The KDC makes a session key and returns it twice: inside the
   TGT, encrypted with the `krbtgt` key (usage 2), and in a part only the
   client can open, encrypted with the client's key (usage 3).
4. **TGS-REQ and TGS-REP.** For each service the client sends the TGT plus an
   authenticator under the TGT session key. The KDC replies with a service
   ticket, encrypted with that service's key, and a new session key under
   the TGT session key (usage 8). The password is not needed again.
5. **AP-REQ and AP-REP.** The service decrypts the ticket with its keytab and
   checks a fresh authenticator under the session key; for mutual
   authentication it answers with an AP-REP under the same key. GSS-API
   (RFC 4121) carries this inside HTTP, SMB, LDAP and SSH.

**Password guessing.** RFC 4120 says so itself (§1.6): Kerberos does not stop
offline guessing of weak passwords. Anything under a password-derived key
allows it: a captured PA-ENC-TIMESTAMP, an AS-REP for an account without
pre-authentication, a service ticket for a service account with a password.
The enctype sets the price of each guess: one unsalted
[MD4](../07-hash/Retired.md#md4) for RC4-HMAC, 4,096 PBKDF2-HMAC-SHA-1
iterations for AES-SHA1, 32,768 PBKDF2-HMAC-SHA-384 for
`aes256-cts-hmac-sha384-192`. A long random key, as machine accounts have,
can't be guessed at all; FAST and SPAKE keep the material off the wire.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Enctype (cipher + MAC) | `aes256-cts-hmac-sha1-96` (MUST in RFC 4120), `aes128-cts-hmac-sha1-96`; `aes256-cts-hmac-sha384-192`, `aes128-cts-hmac-sha256-128` (MIT, Heimdal) | RFC 3962, RFC 8009 | `arcfour-hmac` (RC4, Historic, RFC 8429), `des3-cbc-sha1` (RFC 8429), DES (RFC 6649) |
| Cipher | AES-256 or AES-128 in CBC with ciphertext stealing | RFC 3962 §5, RFC 8009 | [RC4](../04-symmetric-ciphers/Retired.md#rc4), [3DES](../04-symmetric-ciphers/Retired.md#3des), [DES](../04-symmetric-ciphers/Retired.md#des) |
| MAC | HMAC-SHA1-96 over the plaintext; HMAC-SHA-256-128 or HMAC-SHA-384-192 over the ciphertext (encrypt-then-MAC) | RFC 3961 §5.3, RFC 8009 §5 | HMAC-MD5 (RC4-HMAC); CRC32, MD4 and DES-MAC checksums (RFC 6649) |
| Hash | SHA-1 or SHA-384 inside HMAC and PBKDF2 | RFC 3962, RFC 8009 | MD4 (RC4 keys), MD5 |
| KDF, password | PBKDF2-HMAC-SHA-1 (4,096) or PBKDF2-HMAC-SHA-384 (32,768), salt = realm + name | RFC 3962 §4, RFC 8009 §4 | MD4 of the password, no salt (RC4-HMAC); n-fold (3DES) |
| KDF, key usage | DK with AES (SHA1 pair); SP 800-108 counter mode with HMAC-SHA-2 | RFC 3961, RFC 8009 §3 | — |
| Key exchange (PKINIT) | DH 2048-bit (MIT default), ECDH P-256/384/521; KDF with SHA-256/384/512 | RFC 4556, RFC 5349, RFC 8636 | RSA key transport (MIT removed it in 1.22); 1024-bit DH |
| Key exchange, post-quantum | ML-KEM-768 (MUST) in PKINIT, signed with ML-DSA or classical keys | individual IETF draft (2026) | — |
| Signature (PKINIT) | RSA, ECDSA client and KDC certificates (CMS SignedData) | RFC 4556, RFC 8636 | SHA-1 digests (RFC 8636 lets each side name better ones) |
| Password protection | FAST tunnel; SPAKE with edwards25519 (MIT 1.17+) | RFC 6113, RFC 9588 | plain encrypted timestamp |

**Active Directory and RC4.** Windows has had AES-SHA1 since Vista and Server
2008, but kept RC4-HMAC: its key is the NT hash, so NTLM accounts moved to
Kerberos unchanged (RFC 8429 §5.3). November 2022 updates made AES-SHA1 the
default for accounts with no `msDS-SupportedEncryptionTypes`; Windows Server
2025 DCs issue no RC4 TGTs. Under CVE-2026-20833, DCs assume AES only (`0x18`)
from the April 2026 updates, with no rollback since July. MIT 1.21 (2023)
stopped issuing 3DES and RC4 session keys unless `allow_des3` or `allow_rc4`
is set; 1.18 removed single DES.

## Seeing it on your machine

With MIT Kerberos (a test realm needs only `kdb5_util create`, `kadmin.local`
and `krb5kdc`, pointed at your own files by `KRB5_CONFIG` and friends):

```
kinit alice                            # AS exchange: get a TGT
KRB5_TRACE=/dev/stderr kinit alice     # also shows salt, enctype, pre-auth steps
klist -e                               # tickets with session-key and ticket enctypes
kvno HTTP/www.example.org              # TGS exchange: get one service ticket
klist -kKe alice.keytab                # keys in a keytab, as hex (keep it secret)
kadmin.local -q 'getprinc alice'       # which enctypes the KDC holds for alice
```

`klist -kKe` on alice's keytab printed, among others:

```
   1 alice@EXAMPLE.ORG (aes256-cts-hmac-sha384-192)  (0x48b16d34058a15c3afe6498b6cae85dd398ee92dc5414a9680b40ccffc642794)
```

- **Python:** RFC 8009's string-to-key: PBKDF2-HMAC-SHA-384, then one
  SP 800-108 step labelled "kerberos". Press Enter twice for alice's password
  and salt. (The SHA1 enctypes end in an AES step the standard library lacks.)

```python
import hashlib, hmac

def kdf(key, label, bits, h):            # RFC 8009 section 3: SP 800-108 counter mode, i = 1
    msg = (1).to_bytes(4, "big") + label + b"\0" + bits.to_bytes(4, "big")
    return hmac.new(key, msg, h).digest()[:bits // 8]

def string_to_key(password, salt, name="aes256-cts-hmac-sha384-192", h="sha384", n=32):
    tkey = hashlib.pbkdf2_hmac(h, password, name.encode() + b"\0" + salt, 32768, n)
    return kdf(tkey, b"kerberos", n * 8, h)    # section 4, default 32,768 iterations

rfc_salt = bytes.fromhex("10df9dd783e5bc8acea1730e74355f61") + b"ATHENA.MIT.EDUraeburn"
print("RFC 8009 A", string_to_key(b"password", rfc_salt).hex())
pw = (input("password: ") or "correcthorse").encode()
salt = (input("salt: ") or "EXAMPLE.ORGalice").encode()
print("base key  ", string_to_key(pw, salt).hex())
```

```
RFC 8009 A 45bd806dbf6a833a9cffc1c94589a222367a79bc21c413718906e9f578a78467
base key   48b16d34058a15c3afe6498b6cae85dd398ee92dc5414a9680b40ccffc642794
```

The first line is the 256-bit base key in RFC 8009 Appendix A; the second is
the key `klist -kKe` printed. Password and salt alone give the long-term key.

## See also

- [PKI](PKI.md) / [X.509](../formats/X.509.md): the certificates PKINIT and smart-card logon use
- [TLS 1.3](TLS-1.3.md) / [SSH](SSH.md): public-key handshakes, where Kerberos relies on a trusted third party
- [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) / [NIST KDFs](../08-kdf-password-hashing/NIST-KDFs.md#kbkdf-sp-800-108): the two steps of string-to-key
- [PAKE](../01-key-exchange/PAKE.md): password-authenticated key exchange, the idea behind SPAKE pre-authentication
- [Retired ciphers](../04-symmetric-ciphers/Retired.md#rc4) / [MD4](../07-hash/Retired.md#md4): RC4-HMAC and the NT hash

## References

- [RFC 4120: Kerberos V5](https://www.rfc-editor.org/rfc/rfc4120) (Sections 1.6, 3, 5.2.7, 7.5.1, 8.1) / [RFC 4121: GSS-API Kerberos mechanism](https://www.rfc-editor.org/rfc/rfc4121) / [RFC 1510](https://www.rfc-editor.org/rfc/rfc1510)
- [RFC 3961: encryption and checksum framework](https://www.rfc-editor.org/rfc/rfc3961) (Section 5.3) / [RFC 3962: AES for Kerberos](https://www.rfc-editor.org/rfc/rfc3962) (Sections 4–6, Appendix B) / [RFC 8009: AES with HMAC-SHA2](https://www.rfc-editor.org/rfc/rfc8009) (Sections 3–5, Appendix A)
- [RFC 4757: RC4-HMAC](https://www.rfc-editor.org/rfc/rfc4757) / [RFC 6649: deprecate DES](https://www.rfc-editor.org/rfc/rfc6649) / [RFC 8429: deprecate 3DES and RC4](https://www.rfc-editor.org/rfc/rfc8429) (Sections 5–7)
- [RFC 4556: PKINIT](https://www.rfc-editor.org/rfc/rfc4556) / [RFC 5349: ECC in PKINIT](https://www.rfc-editor.org/rfc/rfc5349) / [RFC 8636: PKINIT algorithm agility](https://www.rfc-editor.org/rfc/rfc8636) / [draft-bokovoy-kitten-pkinit-pqc](https://datatracker.ietf.org/doc/draft-bokovoy-kitten-pkinit-pqc/) ([source](https://github.com/abbra/kitten-pkinit-pqc))
- [RFC 6113: FAST](https://www.rfc-editor.org/rfc/rfc6113) / [RFC 9588: SPAKE pre-authentication](https://www.rfc-editor.org/rfc/rfc9588)
- [MIT krb5](https://github.com/krb5/krb5) (`README` for 1.21–1.22.2, `doc/admin/enctypes.rst`, `doc/admin/spake.rst`, `src/lib/krb5/krb/init_ctx.c`, `src/include/osconf.hin`) / [Heimdal](https://github.com/heimdal/heimdal) (`lib/krb5/context.c`)
- [Microsoft: Detect and remediate RC4 usage in Kerberos](https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/security/kerberos/detect-remediate-rc4-kerberos.md) / [What's new in Windows Server 2025](https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/get-started/whats-new-windows-server-2025.md) / [Microsoft Kerberos-Crypto](https://github.com/microsoft/Kerberos-Crypto)

*Weaker sources:* search-engine summaries of Microsoft KB5073381 (CVE-2026-20833:
April 2026 enforcement, July 2026 removal of the rollback) and of the RFC 9588
listing (year 2024), which could not be opened from here.
