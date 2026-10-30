# TOTP and HOTP (one-time passwords)

*The six-digit codes from an authenticator app or key fob. Phone and server
share one secret key; each code is an HMAC of a counter or the clock, cut
short enough for a person to type. That sets its limits: the server holds
every key, and a typed code works for whoever receives it.*

**Standard:** HOTP, RFC 4226 (December 2005); TOTP, RFC 6238 (May 2011); both
Informational, from OATH members. Challenge-response OCRA, RFC 6287 (2011).
Secrets travel in Google's `otpauth://` Key URI format, never an RFC.
**Implementations:** Google Authenticator, Aegis, FreeOTP, iCloud Keychain
and password managers on the phone; oathtool (OATH Toolkit),
pam_google_authenticator and identity providers on the server.

## One login, one algorithm per category

Real output from oathtool 2.6.11 (Ubuntu 24.04 in a container, Oct 2026),
`oathtool -v --totp -d 8 -N '1970-01-01 00:00:59 UTC'` with the key
`12345678901234567890` in hex, the first test vector of RFC 6238 Appendix B
(trimmed):

```
Base32 secret: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
Digits: 8
TOTP mode: SHA1
Step size (seconds): 30
Start time: 1970-01-01 00:00:00 UTC (0)
Current time: 1970-01-01 00:00:59 UTC (59)
Counter: 0x1 (1)

94287082
```

| TOTP name | Category | Algorithm inside |
|---|---|---|
| `TOTP mode: SHA1`, `Counter` | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA-1 keyed with the secret, over the counter as 8 big-endian bytes. HOTP counts codes; TOTP counts 30-second steps since `Start time` |
| `SHA1` | [Hash](../index.md#7-hash-functions) | [SHA-1](../07-hash/Retired.md#sha-1), only inside HMAC; TOTP may use [SHA-256 or SHA-512](../07-hash/SHA-2.md) instead |
| `Digits: 8` | [MAC](../index.md#6-mac) | dynamic truncation: the low 4 bits of the last tag byte pick 4 bytes, the top bit is cleared, and the 31-bit number is taken mod 10⁸ (usually 10⁶) |
| `Base32 secret` | [Random numbers](../index.md#9-random-number-generation) | drawn once by the server from its [OS RNG](../09-random/OS-RNG.md): at least 128 bits, 160 recommended |
| none | [Key exchange](../index.md#1-key-exchange) / [KDF](../index.md#8-key-derivation-and-password-hashing) | the server shows the secret once, as a QR code on a TLS page; its bytes are the HMAC key as they are, and truncation only shortens the tag |
| none | [Cipher](../index.md#4-symmetric-ciphers) / [Signature](../index.md#2-digital-signatures) | nothing is encrypted or signed: the code itself is the proof |

**Why SHA-1 and not SHA-256?** HMAC needs its hash to act as a pseudorandom
function under a secret key, not to resist collisions. RFC 4226 (Appendix B)
and RFC 6194 (§3.3, 2011) found that SHA-1 collision attacks don't carry over
to HMAC-SHA-1; HOTP's proof (Appendix A) needs only that it be a PRF. The
limit is the output: a 6-digit guess wins once in a million, whatever the hash.

## How a login works

1. **Enrolment.** The server draws a random secret, stores it with the
   account and shows it once as a QR code of a URI such as
   `otpauth://totp/Example:alice@example.org?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Example`:
   base32 (RFC 4648 §6) without padding; optional `algorithm`, `digits`,
   `period` default to SHA1, 6, 30. The user types one code to confirm.
2. **Code.** The app takes its counter (HOTP: one more for each code shown;
   TOTP: floor(Unix time / 30)), computes HMAC-SHA-1 over it as 8 bytes,
   truncates to 31 bits and keeps the number mod 10⁶.
3. **Check.** The server recomputes. TOTP: at most one step back for delay
   (RFC 6238 §5.2); pam_google_authenticator takes the previous, current and
   next step. HOTP: a look-ahead window of counters (RFC 4226 §7.4).
4. **Once only, few guesses.** The server refuses a code whose step already
   worked (RFC 6238 §5.2) and throttles failures across sessions (RFC 4226
   §7.3); SP 800-63B-4 (§3.2.2) allows at most 100 in a row. RFC 4226's
   odds, s·v / 10^Digit (§6), give 0.03% for 3 valid codes and 100 guesses.

**Not phishing-resistant.** A fake site can ask for the code and use it within
the 30 seconds; proxy kits such as Evilginx (2017) relay the whole login and
keep the session cookie. NIST SP 800-63B-4 (July 2025, §3.2.5) never counts a
typed code as phishing-resistant. SMS and voice codes are random numbers, not
TOTP: NIST's one *restricted* authenticator (§3.2.9).

**The secret is the weak point.** The server can't hash it, as it computes
codes with it, so a leaked table or backup gives codes forever (RFC 6238 §5.1
asks for encryption at rest). Google Authenticator can sync secrets to the
Google Account (April 2023); in the Retool breach that August, an attacker who
took an employee's Google account got the codes too.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| MAC | HMAC-SHA-1 (HOTP, and the TOTP default); HMAC-SHA-256, HMAC-SHA-512 as TOTP options | RFC 4226 §5, RFC 6238 §1.2, RFC 2104 | — |
| Hash | SHA-1 inside HMAC; SHA-256 or SHA-512 if chosen | FIPS 180-4 | — |
| Truncation | dynamic truncation to 31 bits, then mod 10⁶ (at least 6 digits; 7 or 8 allowed) of a counter: 30-second steps since 1970 (TOTP) or an event count (HOTP) | RFC 4226 §5.3, RFC 6238 §4 | — |
| Secret | random, 128 bits minimum, 160 recommended; base32 in an `otpauth://` URI | RFC 4226 §4 (R6), RFC 4648 §6 | 80 bits (pam_google_authenticator before 2016; 128 until 1.11, 2025) |
| Challenge-response | OCRA: HOTP's HMAC and truncation over a server challenge, e.g. suite `OCRA-1:HOTP-SHA1-6:QN08` | RFC 6287 | — |

**What apps do with the parameters.** Google's Key URI page (last edited 2018)
says Google Authenticator ignores `algorithm` and `period`, and `digits` on
Android; its open-source Android fork (frozen 2020) reads only `secret`,
`issuer` and `counter`. Aegis and FreeOTP honour all three; Apple lists
`digits` and `period` but no `algorithm`. SHA-1, 6 digits and 30 s are the
safe choice.

## Seeing it on your machine

```
k=3132333435363738393031323334353637383930           # "12345678901234567890", the RFC test key
oathtool -w 2 $k                                     # HOTP, counters 0-2: 755224 287082 359152
oathtool --totp=sha256 -d 8 -N @59 $k${k:0:24}       # TOTP-SHA-256 at time 59, 32-byte seed: 46119246
oathtool --totp=sha512 -d 8 -N @59 $k$k$k${k:0:8}    # TOTP-SHA-512, 64-byte seed: 90693936
b=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ                   # the same key in base32, as apps see it
oathtool -b --totp $b                                # the code right now
oathtool -b --totp -w 1 $b 123456                    # check a code like a server: ±1 step
google-authenticator -t -d -r 3 -R 30 -w 3           # enrol for pam_google_authenticator
```

- **Python:** rows of RFC 6238 Appendix B, then a code for a base32 secret.
  Press Enter twice for the RFC key at time 1234567890; `now` gives the
  current code, which changes every 30 seconds.

```python
import base64, hmac, struct, time

def hotp(key, counter, digits=6, alg="sha1"):
    mac = hmac.new(key, struct.pack(">Q", counter), alg).digest()
    i = mac[-1] & 0x0F                               # RFC 4226 section 5.3: dynamic truncation
    code = struct.unpack(">I", mac[i:i + 4])[0] & 0x7FFFFFFF
    return str(code % 10 ** digits).zfill(digits)

def totp(key, unix_time, digits=6, alg="sha1", step=30):
    return hotp(key, int(unix_time) // step, digits, alg)   # RFC 6238: T0 = 0, X = 30

seed = b"1234567890" * 7                             # RFC 6238 seeds: first 20, 32, 64 bytes
for t in (59, 1111111109, 1234567890, 20000000000):
    print(f"{t:>11}", *(totp(seed[:n], t, 8, alg) for alg, n in
                         (("sha1", 20), ("sha256", 32), ("sha512", 64))))

b32 = (input("base32 secret: ") or "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ").replace(" ", "").upper()
key = base64.b32decode(b32 + "=" * (-len(b32) % 8))       # otpauth URIs drop the padding
when = input("Unix time, or 'now': ") or "1234567890"
t = time.time() if when == "now" else int(when)
print("code", totp(key, t), "for step", int(t) // 30)
```

```
         59 94287082 46119246 90693936
 1111111109 07081804 68084774 25091201
 1234567890 89005924 91819424 93441116
20000000000 65353130 77737706 47863826
code 005924 for step 41152263
```

The rows match RFC 6238 Appendix B; its SHA256 and SHA512 columns need the 32-
and 64-byte seeds of Appendix A, though the text names only the 20-byte key.
The last line is the 8-digit code mod 10⁶; step 41152263 is T, 0x273EF07.

## See also

- [HMAC](../06-mac/HMAC.md): the MAC every code is cut from
- [FIDO2 / passkeys](FIDO2.md): the phishing-resistant login NIST asks AAL2 services to offer
- [Kerberos](Kerberos.md): another login built only on symmetric keys, with a server that holds them all
- [Retired hashes](../07-hash/Retired.md#sha-1): SHA-1, and why its collisions leave HMAC-SHA-1 alone

## References

- [RFC 4226: HOTP](https://www.rfc-editor.org/rfc/rfc4226) (Sections 4–7, Appendices A, B, D) / [RFC 6238: TOTP](https://www.rfc-editor.org/rfc/rfc6238) (Sections 4–6, Appendices A, B) / [RFC 6287: OCRA](https://www.rfc-editor.org/rfc/rfc6287) (Section 6)
- [RFC 2104: HMAC](https://www.rfc-editor.org/rfc/rfc2104) / [RFC 6194: SHA-1 security considerations](https://www.rfc-editor.org/rfc/rfc6194) (Section 3.3) / [RFC 4648: Base32](https://www.rfc-editor.org/rfc/rfc4648) (Section 6)
- [NIST SP 800-63B-4](https://doi.org/10.6028/NIST.SP.800-63B-4) (Sections 3.1.4, 3.1.5, 3.2.2, 3.2.5, 3.2.9; [HTML source](https://github.com/usnistgov/800-63-4))
- Google: [Key Uri Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format) / [google-authenticator-android](https://github.com/google/google-authenticator-android) (`AuthenticatorActivity.java`) / [google-authenticator-libpam](https://github.com/google/google-authenticator-libpam) (`src/google-authenticator.c`) / [Account synchronization (April 2023)](https://security.googleblog.com/2023/04/google-authenticator-now-supports.html)
- [Apple: iCloud Keychain verification codes](https://developer.apple.com/documentation/authenticationservices/securing-logins-with-icloud-keychain-verification-codes) / [Aegis](https://github.com/beemdevelopment/Aegis) (`otp/GoogleAuthInfo.java`) / [FreeOTP](https://github.com/freeotp/freeotp-android) (`Token.java`) / [Evilginx](https://github.com/kgretzky/evilginx2)
- [OATH Toolkit](https://www.nongnu.org/oath-toolkit/) / [draft-andesco-otpauth-uri](https://datatracker.ietf.org/doc/draft-andesco-otpauth-uri/) ([source](https://github.com/andesco/otpauth-uri))

*Weaker sources:* search summaries of NIST's CSRC page (SP 800-63B-4, July
2025), Google's Security Blog (April 2023) and BleepingComputer (Retool, 2023).
