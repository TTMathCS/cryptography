# 13. Passkeys: FIDO2 and WebAuthn

*Chapter 11 ended with a phishing page that collects a password and a one-time
code and passes both to the real site within seconds. The code did its job; it
just did it for the attacker. This chapter is about the design that finally
fixes that: a key pair per site, kept in a security key, phone or laptop, and a
browser that writes the site's real address into everything the key signs. A
look-alike site gets nothing it can use, however convincing it is. You will
check the WebAuthn standard's own test vector byte by byte, reproduce its
signature, then build an authenticator, a browser and a site and watch each
check stop a different attack. You will write a full assertion check, follow
a phone signing for a laptop by QR code, Bluetooth and relay, and turn a
passkey into a backup key. The chapter ends with synced passkeys, account
recovery, where attackers now aim, and a Mars resident signing in on Earth.*

!!! abstract "In this chapter"
    **You will learn:**

    - why passwords and codes can be phished, and what "origin binding" means;
    - how U2F (2014) became FIDO2 and WebAuthn (2019) and then passkeys (2022);
    - registration and login message by message: authenticator data, client
      data and the signature, checked against WebAuthn Level 3's test vectors;
    - why a passkey cannot be relayed by a phishing proxy, and which check
      stops which attack;
    - a relying party's assertion check, step by step, coded and attacked;
    - attestation formats and what they reveal about the user;
    - CTAP2 and the PIN protocol;
    - the hybrid transport: how a phone proves it is near the laptop;
    - the `prf` extension, and how it encrypts backups end to end;
    - synced passkeys: what they gain, what they cost, and why account recovery
      is now the weak point; what happens when a phone is lost;
    - an airlock badge that needs no Earth, and challenges that survive a
      44-minute round trip.

    **You need:** [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md)
    (phishing, one-time codes); ECDSA from
    [Chapter 15](../../book/15-Elliptic-Curves.md) and certificates from
    [Chapter 16](../../book/16-PKI-and-Key-Establishment.md) of book 1;
    [Chapter 2](02-Certificates-and-PKI.md) for attestation certificates.

    **Levels:** §13.1 and §13.2 are for beginners, §13.3 to §13.13 are
    intermediate except §13.8 (the hybrid transport), which is expert, and
    §13.14 is expert.

## 13.1 Why passwords phish

*Level: beginner.*

Every login method in Chapter 11 has the same shape: the user holds a secret
and hands something derived from it to whatever page asks. A password is handed
over whole. A one-time code is derived from a secret on the phone, but it is
still a short string that a person reads and types, and the person decides
where to type it. People cannot reliably tell `arcadia.mars` from
`arcadia-mars.co`, especially on a phone, in a hurry, with a convincing page
in front of them. Training helps a little; it has never helped enough.

The fix is to take the decision away from the person. Suppose the secret is a
private key, and the thing handed over is a signature. Then two rules close the
gap:

1. **One key per site.** The device makes a separate key pair for each site,
   chosen by the site's domain name. A look-alike domain has no key, so the
   device has nothing to sign with.
2. **The browser writes the address.** What gets signed includes the origin of
   the page, the scheme, host and port the browser actually loaded, written by
   the browser, not by the page. A signature collected on the look-alike names
   the look-alike, and the real site refuses it.

This is called **origin binding**, and it is why the US government's Zero
Trust strategy (2022) and NIST's digital identity guidelines (SP 800-63-4,
2025) treat this kind of authenticator as **phishing-resistant**, while one-time
codes and push approvals are not. There is a second gain: the site stores only
public keys. A breach of its database gives the attacker nothing to crack and
nothing to replay at another site.

## 13.2 From U2F to passkeys

*Level: beginner.*

The idea took a decade to reach ordinary users, in three steps.

**U2F (2014).** Google and Yubico designed Universal 2nd Factor: a small USB
key that, when touched, signs a challenge with a key pair it made for that
site. The FIDO (Fast IDentity Online) Alliance, an industry group founded in
2012, published it in 2014, and Chrome supported it the same year. U2F was a
second factor only, used after a password. Google moved its own employees to
security keys in early 2017 and later reported that none of its more than
85,000 employees' work accounts had been phished since.

**FIDO2 and WebAuthn (2018-2019).** The second generation split the system into
two standards. **WebAuthn**, from the W3C, is the browser's JavaScript
interface: `navigator.credentials.create()` to register and
`navigator.credentials.get()` to log in. It became a W3C Recommendation in
March 2019, followed by Level 2 (2021) and Level 3 (2026). **CTAP**, the
Client to Authenticator Protocol from the FIDO Alliance, is how the browser
talks to a security key over USB, NFC or Bluetooth; CTAP 2.0 appeared in 2017,
and U2F lives on as CTAP1. Together they are called FIDO2. They added two
things U2F lacked: the key can check a PIN or fingerprint itself (**user
verification**), and it can store the user's account so that no user name is
typed (a **discoverable credential**). A key that does both replaces the
password, not just backs it up.

**Passkeys (2022).** On 5 May 2022 Apple, Google and Microsoft jointly
committed to let FIDO credentials sync between a user's devices through their
password managers. Apple shipped this in iOS 16 that September and called the
synced credentials **passkeys**; the name stuck, and WebAuthn Level 3 now uses
it for any discoverable credential. A passkey can live in iCloud Keychain,
Google Password Manager, Windows Hello, a password manager such as 1Password or
Bitwarden, or a hardware security key. A phone can also act as the
authenticator for a nearby computer: the computer shows a QR code, the phone
scans it, and the two confirm they are close to each other over Bluetooth
before talking through a relay server (the **hybrid** transport of CTAP 2.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The parts of a passkey login: the relying party's server, the browser or operating system as client, and the authenticator, connected by WebAuthn on one side and CTAP on the other" fill="currentColor" font-size="13">
<rect x="20" y="40" width="170" height="110" rx="8" class="soft" stroke="currentColor"/>
<text x="105" y="66" text-anchor="middle" font-weight="bold">relying party</text>
<text x="105" y="88" text-anchor="middle" font-size="12">login.arcadia.mars</text>
<text x="105" y="108" text-anchor="middle" font-size="12">stores: credential ID,</text>
<text x="105" y="124" text-anchor="middle" font-size="12">public key, counter</text>
<rect x="235" y="40" width="170" height="110" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="320" y="66" text-anchor="middle" font-weight="bold">client</text>
<text x="320" y="88" text-anchor="middle" font-size="12">browser or OS</text>
<text x="320" y="108" text-anchor="middle" font-size="12">checks the RP ID,</text>
<text x="320" y="124" text-anchor="middle" font-size="12">writes the origin</text>
<rect x="450" y="40" width="170" height="110" rx="8" class="soft" stroke="currentColor"/>
<text x="535" y="66" text-anchor="middle" font-weight="bold">authenticator</text>
<text x="535" y="88" text-anchor="middle" font-size="12">security key, phone,</text>
<text x="535" y="104" text-anchor="middle" font-size="12">laptop chip, password</text>
<text x="535" y="120" text-anchor="middle" font-size="12">manager; holds the</text>
<text x="535" y="136" text-anchor="middle" font-size="12">private keys</text>
<line x1="190" y1="95" x2="235" y2="95" stroke="currentColor" stroke-width="1.5"/>
<line x1="405" y1="95" x2="450" y2="95" stroke="currentColor" stroke-width="1.5"/>
<text x="212" y="180" text-anchor="middle" font-size="12">WebAuthn</text>
<text x="212" y="196" text-anchor="middle" font-size="12">(JavaScript, W3C)</text>
<text x="427" y="180" text-anchor="middle" font-size="12">CTAP over USB, NFC,</text>
<text x="427" y="196" text-anchor="middle" font-size="12">Bluetooth or hybrid</text>
<text x="320" y="232" text-anchor="middle" font-size="12.5">The page never touches the authenticator. Everything passes through the client.</text>
</svg>
<figcaption>Figure 13.1. The three parties. The page's JavaScript asks the browser; the browser, not the page, decides what the authenticator is asked to sign.</figcaption>
</figure>

!!! note "Life story: U2F"
    **Born:** 2014, designed by Google and Yubico and published by the FIDO
    Alliance · **Purpose:** a cheap second factor that a phishing page cannot
    use · **Helped:** Google's internal rollout (2017) and its Advanced
    Protection Program for people at high risk; the 2016 paper "Security Keys:
    Practical Cryptographic Second Factors for the Modern Web" by Juan Lang,
    Alexei Czeskis, Dirk Balfanz, Marius Schilder and Sampath Srinivas ·
    **Status:** superseded by FIDO2; its keys still work through CTAP1 and
    WebAuthn's `appid` extension

## 13.3 Registration and login

*Level: intermediate.*

A site that accepts passkeys is a **relying party** (RP), named by an
**RP ID**, a domain such as `arcadia.mars`. Pages on that domain or any of its
subdomains (`login.arcadia.mars`, `library.arcadia.mars`) may use the RP ID.

**Registration** (WebAuthn §7.1):

1. The server sends options: a random **challenge** of at least 16 bytes, the
   RP ID, a **user handle** (an opaque ID of at most 64 bytes, not an email
   address) and the signature algorithms it accepts, best first.
2. The browser checks that the RP ID is the page's own domain or a parent of
   it, short of a public suffix such as `.com`. It writes
   **`clientDataJSON`**: the type `webauthn.create`, the challenge and the
   origin it loaded. It sends the authenticator the RP ID and the SHA-256 hash
   of the client data.
3. After a touch (**user presence**, UP) and, if asked, a PIN or fingerprint
   (**user verification**, UV), the authenticator makes a new key pair and
   returns **authenticator data** containing the new public key, optionally
   signed by an attestation key (§13.6).
4. The server checks the client data (type, challenge, origin), the hash of the
   RP ID and the flags, then stores the credential ID, public key and counter
   against the user's account.

**Login** (WebAuthn §7.2) is the same with `get()`: a new challenge; the
authenticator finds the credential for the RP ID, signs **authenticator data
‖ SHA-256(clientDataJSON)** with its private key and returns the signature, the
authenticator data and, for a discoverable credential, the user handle. The
server repeats its checks and verifies the signature with the stored public
key.

Figure 13.2 shows both ceremonies. The authenticator never sees the
challenge or the origin, only the 32-byte hash of `clientDataJSON`, so it
needs no JSON parser and no knowledge of the web: a key built in 2019 signs
the same way for a page written in 2026. Only the browser sees which page is
asking, so the origin is written there.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Sequence diagram of passkey registration and login between the relying party, the browser and the authenticator: the server sends a challenge, the browser writes the client data and passes its hash, the authenticator makes a key pair or signs, and the server checks and stores or verifies" fill="currentColor" font-size="13">
<rect x="25" y="8" width="140" height="26" rx="6" fill-opacity=".15" stroke="currentColor"/>
<text x="95" y="26" text-anchor="middle" font-weight="bold">relying party</text>
<line x1="95" y1="34" x2="95" y2="410" stroke="currentColor" stroke-dasharray="3 4" opacity=".5"/>
<rect x="250" y="8" width="140" height="26" rx="6" fill-opacity=".15" stroke="currentColor"/>
<text x="320" y="26" text-anchor="middle" font-weight="bold">browser</text>
<line x1="320" y1="34" x2="320" y2="410" stroke="currentColor" stroke-dasharray="3 4" opacity=".5"/>
<rect x="475" y="8" width="140" height="26" rx="6" fill-opacity=".15" stroke="currentColor"/>
<text x="545" y="26" text-anchor="middle" font-weight="bold">authenticator</text>
<line x1="545" y1="34" x2="545" y2="410" stroke="currentColor" stroke-dasharray="3 4" opacity=".5"/>
<text x="12" y="56" font-weight="bold" font-size="12">register</text>
<line x1="95" y1="72" x2="312" y2="72" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,72 310,67 310,77"/>
<text x="207" y="66" text-anchor="middle" font-size="12">challenge, RP ID, user handle</text>
<line x1="320" y1="100" x2="537" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="545,100 535,95 535,105"/>
<text x="432" y="94" text-anchor="middle" font-size="12">RP ID, SHA-256(clientDataJSON)</text>
<rect x="453" y="112" width="184" height="20" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="545" y="126" text-anchor="middle" font-size="12">touch, PIN; new key pair</text>
<line x1="545" y1="158" x2="328" y2="158" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,158 330,153 330,163"/>
<text x="432" y="152" text-anchor="middle" font-size="12">authData + new public key</text>
<line x1="320" y1="186" x2="103" y2="186" stroke="currentColor" stroke-width="1.5"/>
<polygon points="95,186 105,181 105,191"/>
<text x="207" y="180" text-anchor="middle" font-size="12">clientDataJSON + attestation</text>
<rect x="17" y="198" width="156" height="20" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="95" y="212" text-anchor="middle" font-size="12">store ID, key, count</text>
<line x1="10" y1="230" x2="630" y2="230" stroke="currentColor" opacity=".4"/>
<text x="12" y="252" font-weight="bold" font-size="12">log in</text>
<line x1="95" y1="268" x2="312" y2="268" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,268 310,263 310,273"/>
<text x="207" y="262" text-anchor="middle" font-size="12">new challenge, RP ID</text>
<line x1="320" y1="296" x2="537" y2="296" stroke="currentColor" stroke-width="1.5"/>
<polygon points="545,296 535,291 535,301"/>
<text x="432" y="290" text-anchor="middle" font-size="12">RP ID, SHA-256(clientDataJSON)</text>
<rect x="481" y="308" width="128" height="20" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="545" y="322" text-anchor="middle" font-size="12">touch, PIN; sign</text>
<line x1="545" y1="354" x2="328" y2="354" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,354 330,349 330,359"/>
<text x="432" y="348" text-anchor="middle" font-size="12">authData, signature, cred ID</text>
<line x1="320" y1="382" x2="103" y2="382" stroke="currentColor" stroke-width="1.5"/>
<polygon points="95,382 105,377 105,387"/>
<text x="207" y="376" text-anchor="middle" font-size="12">the same, plus clientDataJSON</text>
<rect x="31" y="394" width="128" height="20" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="95" y="408" text-anchor="middle" font-size="12">check and verify</text>
</svg>
<figcaption>Figure 13.2. Registration (top) and login (bottom). Each starts with a fresh challenge from the server and ends with the server's checks; the authenticator only ever sees a hash of what the browser wrote.</figcaption>
</figure>

The authenticator data is a short binary structure (Figure 13.3): the SHA-256
hash of the RP ID, one byte of flags, a 4-byte signature counter, and at
registration the credential itself. The public key is encoded in **COSE**
(CBOR Object Signing and Encryption, RFC 9052 and 9053), a binary cousin of
the JSON keys of Chapter 14. In COSE, key 1 is the key type (2 = elliptic
curve), 3 the algorithm (-7 = ES256, ECDSA with P-256 and SHA-256), -1 the curve
(1 = P-256) and -2 and -3 the coordinates.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Authenticator data layout: 32-byte rpIdHash, 1-byte flags, 4-byte signCount, then at registration a 16-byte AAGUID, 2-byte length, credential ID and COSE public key; the flag bits UP, UV, BE, BS, AT, ED" fill="currentColor" font-size="13">
<rect x="20" y="30" width="200" height="40" class="soft-acc" stroke="currentColor"/>
<text x="120" y="55" text-anchor="middle">rpIdHash (32)</text>
<rect x="220" y="30" width="50" height="40" class="acc-fill" fill-opacity="0.3" stroke="currentColor"/>
<text x="245" y="55" text-anchor="middle">flags</text>
<rect x="270" y="30" width="80" height="40" class="soft" stroke="currentColor"/>
<text x="310" y="55" text-anchor="middle">count (4)</text>
<rect x="350" y="30" width="80" height="40" class="soft" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="390" y="55" text-anchor="middle">AAGUID</text>
<rect x="430" y="30" width="40" height="40" class="soft" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="450" y="55" text-anchor="middle">len</text>
<rect x="470" y="30" width="70" height="40" class="soft" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="505" y="55" text-anchor="middle">cred ID</text>
<rect x="540" y="30" width="80" height="40" class="soft" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="580" y="55" text-anchor="middle">COSE key</text>
<text x="485" y="92" text-anchor="middle" font-size="12">registration only (AT flag)</text>
<line x1="350" y1="80" x2="620" y2="80" stroke="currentColor" opacity="0.5"/>
<line x1="245" y1="70" x2="245" y2="120" stroke="currentColor"/>
<text x="20" y="140" font-weight="bold">flag bits</text>
<g font-size="12.5">
<text x="20" y="164">bit 0  UP   user present (touched)</text>
<text x="20" y="184">bit 2  UV   user verified (PIN or biometric)</text>
<text x="20" y="204">bit 3  BE   may be backed up (synced)</text>
<text x="330" y="164">bit 4  BS   is backed up now</text>
<text x="330" y="184">bit 6  AT   credential data follows</text>
<text x="330" y="204">bit 7  ED   extension data follows</text>
</g>
</svg>
<figcaption>Figure 13.3. Authenticator data. The signature covers all of it plus the hash of the browser's client data.</figcaption>
</figure>

### A worked example by hand

WebAuthn Level 3's first test vector registers a credential for
`example.org`. Its authenticator data starts:

```
bfabc37432958b063360d3ad6461c9c4735ae7f8edd46592a5e0f01452b2e4b5  59  00000000  8446ccb9…
```

- The first 32 bytes should be SHA-256 of `example.org`; the program below
  confirms it.
- The flags byte is `0x59` = `0101 1001` in binary. Reading bits from the
  right: bit 0 (UP) is set, bit 2 (UV) is not, bits 3 and 4 (BE, BS) are set,
  bit 6 (AT) is set. So: the user touched the authenticator but was not
  verified; the credential can be synced and is; a credential follows.
- The counter is 0. A synced passkey cannot keep one counter across several
  devices, so it sends 0, and the site must not treat 0 as an error.
- Then come the AAGUID `8446ccb9…`, which names the authenticator's model, a
  length `0020` (32 bytes), the credential ID, and the COSE key.

## 13.4 Code it: the standard's test vector

*Level: intermediate.*

The program does a relying party's whole job on that test vector, with nothing
but the standard library: P-256 arithmetic, ECDSA verification, HKDF (the
vectors' random values are all derived with HKDF from the string
`WebAuthn test vectors`, so the program recomputes the challenge and the
private key rather than copying them), and a twenty-line CBOR reader to unpack
the attestation object and the COSE key. Then it switches sides and signs as
the authenticator would, with deterministic ECDSA (RFC 6979, the nonce derived
from the key and the message), to reproduce the spec's signature exactly.

```python
# A relying party's checks on WebAuthn Level 3's first test vector (section
# 16.2, "ES256 Credential with No Attestation"), with P-256 ECDSA, HKDF and a
# small CBOR reader written out. Then the authenticator's side: RFC 6979
# signing reproduces the spec's signature byte for byte.
import hashlib, hmac, json, base64

p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: l = (3 * P[0] * P[0] - 3) * pow(2 * P[1], -1, p) % p
    else:      l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)
def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R

def hkdf(ikm, salt, info, length):                       # RFC 5869
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest(); out += t; i += 1
    return out[:length]

def cbor(b, i=0):                                       # just enough CBOR (RFC 8949)
    major, info = b[i] >> 5, b[i] & 31; i += 1
    if info < 24: val = info
    else:
        size = {24: 1, 25: 2, 26: 4, 27: 8}[info]
        val = int.from_bytes(b[i:i + size], "big"); i += size
    if major == 0: return val, i
    if major == 1: return -1 - val, i
    if major in (2, 3):
        s = b[i:i + val]; return (s if major == 2 else s.decode()), i + val
    if major == 4:
        out = []
        for _ in range(val): v, i = cbor(b, i); out.append(v)
        return out, i
    if major == 5:
        out = {}
        for _ in range(val): k, i = cbor(b, i); v, i = cbor(b, i); out[k] = v
        return out, i

def der_to_rs(sig):                                     # ECDSA signatures arrive in DER
    rlen = sig[3]; r = int.from_bytes(sig[4:4 + rlen], "big")
    s = int.from_bytes(sig[6 + rlen:], "big")
    return r, s

def ecdsa_verify(Q, msg, r, s):
    e = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    w = pow(s, -1, n)
    R = add(mul(e * w % n, G), mul(r * w % n, Q))
    return R is not None and R[0] % n == r

b64url = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
IKM = b"WebAuthn test vectors"

# --- Registration -------------------------------------------------------
reg_challenge = hkdf(IKM, b"\x00", b"none.ES256", 32)
client_data = bytes.fromhex(
    "7b2274797065223a22776562617574686e2e637265617465222c226368616c6c656e6765223a22414d4d50"
    "7434557878475453746e63647134313759447742466938767049612d7077386f4f755657345441222c226f72"
    "6967696e223a2268747470733a2f2f6578616d706c652e6f7267222c2263726f73734f726967696e223a6661"
    "6c73652c22657874726144617461223a22636c69656e74446174614a534f4e206d617920626520657874656e"
    "6465642077697468206164646974696f6e616c206669656c647320696e20746865206675747572652c207375"
    "636820617320746869733a20426b5165446a646354427258426941774a544c453551227d")
att_obj = bytes.fromhex(
    "a363666d74646e6f6e656761747453746d74a068617574684461746158a4bfabc37432958b063360d3ad6461"
    "c9c4735ae7f8edd46592a5e0f01452b2e4b559000000008446ccb9ab1db374750b2367ff6f3a1f0020f91f39"
    "1db4c9b2fde0ea70189cba3fb63f579ba6122b33ad94ff3ec330084be4a5010203262001215820afefa16f97"
    "ca9b2d23eb86ccb64098d20db90856062eb249c33a9b672f26df61225820930a56b87a2fca66334b03458abf"
    "879717c12cc68ed73290af2e2664796b9220")
cd = json.loads(client_data)
print("challenge from HKDF:", reg_challenge.hex()[:16] + "...", " client data agrees:",
      cd["challenge"] == b64url(reg_challenge))
print("type and origin:", cd["type"], cd["origin"])
att, _ = cbor(att_obj)
auth = att["authData"]
print("attestation format:", att["fmt"], "  rpIdHash is SHA-256('example.org'):",
      auth[:32] == hashlib.sha256(b"example.org").digest())
names = {0: "UP", 2: "UV", 3: "BE", 4: "BS", 6: "AT", 7: "ED"}
print("flags", hex(auth[32]), [v for k, v in names.items() if auth[32] >> k & 1],
      " signCount", int.from_bytes(auth[33:37], "big"))
cred_len = int.from_bytes(auth[53:55], "big")
cred_id = auth[55:55 + cred_len]
cose, _ = cbor(auth, 55 + cred_len)
print("credential ID", cred_id.hex()[:16] + "...", " COSE key: kty", cose[1], "alg", cose[3], "crv", cose[-1])
Q = (int.from_bytes(cose[-2], "big"), int.from_bytes(cose[-3], "big"))
d = int.from_bytes(hkdf(IKM, b"\x01", b"none.ES256", 32), "big")
print("public key = private key x G:", mul(d, G) == Q)

# --- Authentication ------------------------------------------------------
auth_data = bytes.fromhex("bfabc37432958b063360d3ad6461c9c4735ae7f8edd46592a5e0f01452b2e4b51900000000")
client_data_get = bytes.fromhex(
    "7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a224f63446e55685158"
    "756c5455506f334a5558543049393770767a7a59425039745a63685879617630314167222c226f726967696e"
    "223a2268747470733a2f2f6578616d706c652e6f7267222c2263726f73734f726967696e223a66616c73657d")
signature = bytes.fromhex(
    "3046022100f50a4e2e4409249c4a853ba361282f09841df4dd4547a13a87780218deffcd380221008480ac0f"
    "0b93538174f575bf11a1dd5d78c6e486013f937295ea13653e331e87")
cd2 = json.loads(client_data_get)
print("login challenge matches:", cd2["challenge"] == b64url(hkdf(IKM, b"\x07", b"none.ES256", 32)),
      " flags", hex(auth_data[32]))
signed = auth_data + hashlib.sha256(client_data_get).digest()
print("signature verifies:", ecdsa_verify(Q, signed, *der_to_rs(signature)))
print("with another origin:", ecdsa_verify(Q, auth_data + hashlib.sha256(
      client_data_get.replace(b"example.org", b"examp1e.org")).digest(), *der_to_rs(signature)))

# --- The authenticator's side: deterministic ECDSA (RFC 6979) -------------
def rfc6979_k(d, h1):
    x, h = d.to_bytes(32, "big"), (int.from_bytes(h1, "big") % n).to_bytes(32, "big")
    V, K = b"\x01" * 32, b"\x00" * 32
    K = hmac.new(K, V + b"\x00" + x + h, hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()
    K = hmac.new(K, V + b"\x01" + x + h, hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()
    while True:
        V = hmac.new(K, V, hashlib.sha256).digest(); k = int.from_bytes(V, "big")
        if 1 <= k < n: return k
        K = hmac.new(K, V + b"\x00", hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()

def der_int(v):
    b = v.to_bytes((v.bit_length() + 8) // 8, "big")    # a leading 00 if the top bit is set
    return b"\x02" + bytes([len(b)]) + b

def ecdsa_sign(d, msg):
    h1 = hashlib.sha256(msg).digest()
    k = rfc6979_k(d, h1)
    r = mul(k, G)[0] % n
    s = pow(k, -1, n) * (int.from_bytes(h1, "big") + r * d) % n
    body = der_int(r) + der_int(s)
    return b"\x30" + bytes([len(body)]) + body

print("our authenticator's signature equals the spec's:", ecdsa_sign(d, signed) == signature)
```

```text
challenge from HKDF: 00c30fb78531c464...  client data agrees: True
type and origin: webauthn.create https://example.org
attestation format: none   rpIdHash is SHA-256('example.org'): True
flags 0x59 ['UP', 'BE', 'BS', 'AT']  signCount 0
credential ID f91f391db4c9b2fd...  COSE key: kty 2 alg -7 crv 1
public key = private key x G: True
login challenge matches: True  flags 0x19
signature verifies: True
with another origin: False
our authenticator's signature equals the spec's: True
```

Each line is one of the checks WebAuthn §7.1 and §7.2 require. The challenge
in the client data is the one the server issued. The type is `webauthn.create`
for registration and `webauthn.get` for login, so a login signature cannot be
passed off as a registration. The origin is `https://example.org`. The RP ID
hash matches. The public key is a point on the curve, and it is the one that
belongs to the private key. The signature verifies over authenticator data
and the client data's hash, and fails when one character of the origin
changes. The last line shows the authenticator's side: with RFC 6979, the same
key and message always give the same signature, and ours equals the spec's
`3046022100f50a…` byte for byte.

Two details are easy to get wrong in a real server. ECDSA signatures arrive in
DER form, an ASN.1 sequence of two integers, usually 70 to 72 bytes, not the
fixed 64 bytes that JSON Web Tokens use (Chapter 14); the `der_to_rs` function
unpacks them. And the challenge in `clientDataJSON` is base64url without
padding, so it must be compared as bytes or as exactly that encoding.

### A complete assertion check

A real relying party runs its checks in a fixed order and stops at the first
failure. WebAuthn Level 3 §7.2 numbers them; the ones that matter for security
are:

1. Parse `clientDataJSON` as UTF-8 JSON. Its `type` must be `webauthn.get`.
2. Its `challenge` must be the one this server issued for this ceremony, still
   unused and not expired.
3. Its `origin` must be on the server's own list. A list, not a pattern: the
   server should know every page that logs users in.
4. `crossOrigin` must be false unless the site deliberately allows sign-in
   from inside another site's frame.
5. The first 32 bytes of the authenticator data must be SHA-256 of the RP ID.
6. The UP flag must be set; the UV flag must be set if the server asked for
   user verification as `required`.
7. If BE is clear, BS must be clear too, and BE must equal the value stored at
   registration: a credential cannot become syncable later.
8. The signature must verify, with the stored public key, over the
   authenticator data followed by SHA-256 of `clientDataJSON`.
9. If either the stored or the new signature counter is nonzero, the new one
   must be larger. Then store the new counter and BS value.

The checks on what was signed matter as much as the signature: a server that
verified the signature but skipped the client data would accept a genuine
signature made for a phishing origin (attack 5 in §13.5). The counter comes
last because it may be updated only when everything else has passed;
otherwise a forged assertion could push it up and lock the real user out.

The counter rule deserves one pass by hand. The server has stored 6. A login
arrives with 7: since $7 > 6$, accept and store 7. A second login with 7 again:
$7 \le 7$, so either the authenticator is broken or two copies of the key
exist. A synced passkey sends 0 every time, and the stored value stays 0: the
condition "either is nonzero" is false, so the check is skipped. A
device-bound key that sends 0 after the server has stored 9 is a warning,
because a real key never goes back to 0.

**Code it.** The function below runs those steps on an assertion made with a
test key of our own (the authenticator's half signs with the RFC 6979 code from
the first listing), then sends it seven bad assertions, each wrong in one way.

```python
# Uses add(), mul(), G, n, der_to_rs(), ecdsa_verify(), ecdsa_sign() and b64url
# from the listing above. A relying party's assertion check, step by step in the
# order of WebAuthn Level 3 section 7.2, on a test key of our own.
def verify_assertion(record, expected, cdj, auth, sig):
    cd = json.loads(cdj)                                      # client data, as UTF-8 JSON
    if cd.get("type") != "webauthn.get":       return "type is not webauthn.get"
    if cd.get("challenge") != b64url(expected["challenge"]): return "wrong or stale challenge"
    if cd.get("origin") not in expected["origins"]:          return "origin " + cd.get("origin", "?")
    if cd.get("crossOrigin", False):           return "signed inside a cross-origin frame"
    if auth[:32] != hashlib.sha256(expected["rp_id"].encode()).digest(): return "rpIdHash"
    flags = auth[32]
    up, uv, be, bs = flags & 1, flags >> 2 & 1, flags >> 3 & 1, flags >> 4 & 1
    if not up:                                 return "user not present"
    if expected["uv"] and not uv:              return "user verification required"
    if bs and not be:                          return "BS set without BE"
    if be != record["be"]:                     return "backup eligibility changed"
    msg = auth + hashlib.sha256(cdj).digest()                 # authData || SHA-256(clientDataJSON)
    if not ecdsa_verify(record["Q"], msg, *der_to_rs(sig)): return "bad signature"
    count = int.from_bytes(auth[33:37], "big")
    if (count or record["count"]) and count <= record["count"]:
        return "counter %d not above %d: possible clone" % (count, record["count"])
    record["count"], record["bs"] = count, bs                 # update the stored record
    return "ok, counter now %d" % count

d_test = int.from_bytes(hashlib.sha256(b"arcadia test key").digest(), "big") % n
record = {"Q": mul(d_test, G), "count": 6, "be": 0, "bs": 0}
expected = {"challenge": bytes(range(32)), "origins": {"https://login.arcadia.mars"},
            "rp_id": "arcadia.mars", "uv": True}

def make(flags=0x05, count=7, origin="https://login.arcadia.mars", challenge=bytes(range(32)),
         kind="webauthn.get", cross=False):                   # the authenticator and browser
    cdj = json.dumps({"type": kind, "challenge": b64url(challenge), "origin": origin,
                      "crossOrigin": cross}, separators=(",", ":")).encode()
    auth = hashlib.sha256(b"arcadia.mars").digest() + bytes([flags]) + count.to_bytes(4, "big")
    return cdj, auth, ecdsa_sign(d_test, auth + hashlib.sha256(cdj).digest())

cdj, auth, sig = make()
print("authData  ", auth.hex()[:16] + "...", auth[32:].hex(), " signature", len(sig), "bytes")
print("good           :", verify_assertion(record, expected, cdj, auth, sig))
c, a, s = make(flags=0x01, count=8)                           # touch only, then UV bit forged
print("UV bit forged  :", verify_assertion(record, expected, c, a[:32] + b"\x05" + a[33:], s))
tests = [("old challenge ", make(count=8, challenge=bytes(32))),
         ("http origin   ", make(count=8, origin="http://login.arcadia.mars")),
         ("in an iframe  ", make(count=8, cross=True)),
         ("touch, no PIN ", make(flags=0x01, count=8)),
         ("a registration", make(count=8, kind="webauthn.create")),
         ("counter 5     ", make(count=5))]
for name, (c, a, s) in tests:
    print(name, ":", verify_assertion(record, expected, c, a, s))
```

It prints:

```text
authData   b6e4990dd7aa4469... 0500000007  signature 71 bytes
good           : ok, counter now 7
UV bit forged  : bad signature
old challenge  : wrong or stale challenge
http origin    : origin http://login.arcadia.mars
in an iframe   : signed inside a cross-origin frame
touch, no PIN  : user verification required
a registration : type is not webauthn.get
counter 5      : counter 5 not above 7: possible clone
```

The authenticator data is 37 bytes: the RP ID hash, flags `05` (UP and UV)
and the counter `00000007`. The forged line shows why the flags are signed: an
authenticator that only saw a touch sets `01`, and changing it to `05` in
transit, to claim a PIN was entered, breaks the signature. The `http` origin
fails although the host is right: the scheme is part of the origin, and a page
served without TLS could have been changed by anyone on the path.

Real servers should use a maintained library (`py_webauthn`, `webauthn-rs`,
`SimpleWebAuthn`), since the parsing is where bugs live; writing the check once
shows what the library must refuse.

## 13.5 Why a passkey cannot be phished

*Level: intermediate.*

The next program puts the three parties together: an authenticator that keeps
one key per RP ID hash, a browser that checks the RP ID against its own address
bar and writes the origin into the client data, and a relying party
`arcadia.mars` that accepts the origins `https://login.arcadia.mars` and
`https://library.arcadia.mars`. Then it attacks.

```python
# A whole passkey system: authenticator, browser and relying party, and what
# each check stops. Keys are derived with HKDF so the run repeats exactly.
# Continue from above.
import os

class Authenticator:
    def __init__(self, name):
        self.name, self.creds, self.made = name, {}, 0
    def make_credential(self, rp_id, client_data_hash, user):
        self.made += 1
        d = int.from_bytes(hkdf(self.name.encode(), bytes([self.made]), b"key", 32), "big") % n
        cred_id = hkdf(self.name.encode(), bytes([self.made]), b"id", 16)
        self.creds[cred_id] = {"rp": hashlib.sha256(rp_id.encode()).digest(), "d": d, "user": user, "count": 0}
        Qx, Qy = mul(d, G)
        auth = (self.creds[cred_id]["rp"] + bytes([0x45]) + bytes(4) + bytes(16)
                + len(cred_id).to_bytes(2, "big") + cred_id)
        return cred_id, (Qx, Qy), auth                       # COSE encoding left out here
    def get_assertion(self, rp_id, client_data_hash):
        for cred_id, c in self.creds.items():                # look up by the RP ID's hash
            if c["rp"] == hashlib.sha256(rp_id.encode()).digest():
                c["count"] += 1
                auth = c["rp"] + bytes([0x05]) + c["count"].to_bytes(4, "big")
                return cred_id, auth, ecdsa_sign(c["d"], auth + client_data_hash), c["user"]
        return None

class Browser:
    def __init__(self, origin): self.origin = origin
    def host(self): return self.origin.split("://")[1]
    def call(self, authenticator, kind, rp_id, challenge, user=None):
        h = self.host()                                      # the RP ID must be the page's own
        if not (h == rp_id or h.endswith("." + rp_id)):      # domain or a parent of it
            return "browser refuses: RP ID " + rp_id + " is not " + h + " or a parent"
        cdj = json.dumps({"type": "webauthn." + kind, "challenge": b64url(challenge),
                          "origin": self.origin}).encode()   # written by the browser, not the page
        cdh = hashlib.sha256(cdj).digest()
        if kind == "create":
            return authenticator.make_credential(rp_id, cdh, user) + (cdj,)
        result = authenticator.get_assertion(rp_id, cdh)
        return "authenticator: no passkey for " + rp_id if result is None else result + (cdj,)

class RelyingParty:
    def __init__(self, rp_id, origins):
        self.rp_id, self.origins, self.keys, self.challenges = rp_id, origins, {}, set()
    def challenge(self):
        c = os.urandom(32); self.challenges.add(c); return c
    def register(self, result):
        cred_id, Q, auth, cdj = result
        cd = json.loads(cdj)
        assert cd["type"] == "webauthn.create" and cd["origin"] in self.origins
        assert auth[:32] == hashlib.sha256(self.rp_id.encode()).digest()
        self.keys[cred_id] = {"Q": Q, "count": 0}
    def login(self, result):
        if isinstance(result, str): return result
        cred_id, auth, sig, user, cdj = result
        cd = json.loads(cdj)
        ch = base64.urlsafe_b64decode(cd["challenge"] + "==")
        if ch not in self.challenges: return "RP refuses: unknown or used challenge"
        self.challenges.discard(ch)
        if cd["origin"] not in self.origins: return "RP refuses: origin " + cd["origin"]
        if auth[:32] != hashlib.sha256(self.rp_id.encode()).digest(): return "RP refuses: rpIdHash"
        k = self.keys.get(cred_id)
        if k is None or not ecdsa_verify(k["Q"], auth + hashlib.sha256(cdj).digest(), *der_to_rs(sig)):
            return "RP refuses: signature"
        count = int.from_bytes(auth[33:37], "big")
        if count and count <= k["count"]: return "RP warns: counter went backwards, a cloned key?"
        k["count"] = count
        return "welcome, " + user

rp = RelyingParty("arcadia.mars", {"https://login.arcadia.mars", "https://library.arcadia.mars"})
key = Authenticator("alice's security key")
real = Browser("https://login.arcadia.mars")
rp.register(real.call(key, "create", "arcadia.mars", rp.challenge(), user="alice"))
print("1 real site:         ", rp.login(real.call(key, "get", "arcadia.mars", rp.challenge())))
print("2 library subdomain: ", rp.login(Browser("https://library.arcadia.mars").call(
      key, "get", "arcadia.mars", rp.challenge())))

fake = Browser("https://arcadia-mars.co")                     # the look-alike from Chapter 11
ch = rp.challenge()                                           # the proxy fetched a real challenge
print("3 look-alike, asks for arcadia.mars:   ", fake.call(key, "get", "arcadia.mars", ch))
print("4 look-alike, asks for its own domain: ", fake.call(key, "get", "arcadia-mars.co", ch))

# 5. Malware that skips the browser can get a signature, but it signs what it is
#    given, including the origin the malware wrote, and the RP checks that origin.
cdj = json.dumps({"type": "webauthn.get", "challenge": b64url(ch), "origin": "https://arcadia-mars.co"}).encode()
cred_id, auth, sig, user = key.get_assertion("arcadia.mars", hashlib.sha256(cdj).digest())
print("5 relayed with the true origin:  ", rp.login((cred_id, auth, sig, user, cdj)))

# 6. Replaying an old login, and a cloned key whose counter lags behind.
old = real.call(key, "get", "arcadia.mars", rp.challenge())
print("6 first use:   ", rp.login(old))
print("  replayed:    ", rp.login(old))
clone = Authenticator("copy"); clone.creds = {i: dict(c) for i, c in key.creds.items()}
for _ in range(3): rp.login(real.call(key, "get", "arcadia.mars", rp.challenge()))
print("  clone, later:", rp.login(real.call(clone, "get", "arcadia.mars", rp.challenge())))
```

```text
1 real site:          welcome, alice
2 library subdomain:  welcome, alice
3 look-alike, asks for arcadia.mars:    browser refuses: RP ID arcadia.mars is not arcadia-mars.co or a parent
4 look-alike, asks for its own domain:  authenticator: no passkey for arcadia-mars.co
5 relayed with the true origin:   RP refuses: origin https://arcadia-mars.co
6 first use:    welcome, alice
  replayed:     RP refuses: unknown or used challenge
  clone, later: RP warns: counter went backwards, a cloned key?
```

Each refusal comes from a different check:

- **1 and 2.** The real site and a subdomain both work, because the browser allows
   any page under `arcadia.mars` to use that RP ID, and the server lists both
   origins.
- **3.** The look-alike page asks for a login with RP ID `arcadia.mars`. The browser
   refuses: `arcadia-mars.co` is not `arcadia.mars` or a subdomain of it. The
   page's JavaScript cannot override this; it is the browser's own rule.
- **4.** The look-alike asks for its own RP ID instead. The browser agrees, but the
   authenticator has no key for `arcadia-mars.co`, because Alice never
   registered there. There is nothing to relay.
- **5.** Malware on Alice's own computer that bypasses the browser and talks to the
   authenticator directly can get a signature, since the authenticator signs
   whatever client data hash it is given. But the signature covers the origin
   the malware wrote. If it writes the true phishing origin, the server
   refuses; if it writes the real origin, it is not phishing any more, it is
   malware with control of the computer, a different and harder problem.
- **6.** A replayed login fails because each challenge is used once. A clone of the
   key, made at some point and used later, sends a counter lower than the one
   the server last saw, and the server can flag the account.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Where each check happens: the browser checks the RP ID against the address bar and writes the origin; the authenticator chooses the key by the RP ID hash; the server checks challenge, origin, RP ID hash, signature and counter" fill="currentColor" font-size="13">
<rect x="20" y="20" width="190" height="220" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="115" y="44" text-anchor="middle" font-weight="bold">browser</text>
<text x="35" y="72" font-size="12.5">RP ID = my domain</text>
<text x="35" y="90" font-size="12.5">or a parent of it?</text>
<text x="35" y="120" font-size="12.5">writes the origin it</text>
<text x="35" y="138" font-size="12.5">loaded, and the type</text>
<text x="35" y="174" font-size="12" class="acc-fill">stops: look-alike asking</text>
<text x="35" y="190" font-size="12" class="acc-fill">for the real RP ID</text>
<rect x="225" y="20" width="190" height="220" rx="8" class="soft" stroke="currentColor"/>
<text x="320" y="44" text-anchor="middle" font-weight="bold">authenticator</text>
<text x="240" y="72" font-size="12.5">key chosen by</text>
<text x="240" y="90" font-size="12.5">SHA-256(RP ID)</text>
<text x="240" y="120" font-size="12.5">touch, PIN or</text>
<text x="240" y="138" font-size="12.5">fingerprint; counter</text>
<text x="240" y="174" font-size="12" class="acc-fill">stops: look-alike with</text>
<text x="240" y="190" font-size="12" class="acc-fill">its own RP ID</text>
<rect x="430" y="20" width="190" height="220" rx="8" class="soft" stroke="currentColor"/>
<text x="525" y="44" text-anchor="middle" font-weight="bold">relying party</text>
<text x="445" y="72" font-size="12.5">challenge fresh?</text>
<text x="445" y="90" font-size="12.5">origin on my list?</text>
<text x="445" y="108" font-size="12.5">rpIdHash mine?</text>
<text x="445" y="126" font-size="12.5">signature valid?</text>
<text x="445" y="144" font-size="12.5">counter higher?</text>
<text x="445" y="174" font-size="12" class="acc-fill">stops: relayed or</text>
<text x="445" y="190" font-size="12" class="acc-fill">replayed assertions,</text>
<text x="445" y="206" font-size="12" class="acc-fill">some clones</text>
</svg>
<figcaption>Figure 13.4. Three places, three kinds of check. Remove any one and some attack in the program succeeds.</figcaption>
</figure>

The proof came in August 2022, from the same campaign that collected one-time
codes from Twilio's employees (Chapter 11). Cloudflare's employees received the
same text messages and some entered their passwords on the look-alike page.
The attack stopped there, because Cloudflare required FIDO2 security keys for
every employee, and the look-alike had nothing to ask the keys for.

### Break it: where attackers go instead

A passkey moves the attack, it does not end it. The places attackers now aim:

- **The fallback.** If an account still accepts a password and a code, a
  phishing proxy can tell the site it is a browser without passkey support and
  get the old login offered. Security researchers published proxy
  configurations doing exactly this in 2025. A passkey protects an account only
  when weaker methods are switched off, or at least gated behind it.
- **Account recovery.** "Lost your passkey?" usually ends in an email link or a
  text message, which can be phished or SIM-swapped (Chapter 11). Recovery is
  login by another name, and attackers know it.
- **The session after login.** Once logged in, the browser holds a session
  cookie. Malware that steals cookies, "infostealers", takes over the session
  without touching the passkey. Binding the session to a key in the device
  (Chrome's Device Bound Session Credentials, or DPoP in Chapter 14) is the
  matching defense.
- **The cloud account behind synced passkeys,** §13.10 and §13.11.

## 13.6 Attestation

*Level: intermediate.*

At registration, a site may ask the authenticator to prove what it is.
**Attestation** is a signature over the new authenticator data and client data
hash, made with a key the manufacturer put into the device, with a
certificate chain to the manufacturer's root.

- **Formats.** `packed` (FIDO's own), `tpm` (Windows Hello), `android-key`,
  `apple` (anonymous, a fresh certificate per credential), and `fido-u2f` for
  old keys. `none` is the default: most consumer sites do not ask.
- **The AAGUID** in the authenticator data names the model. FIDO's Metadata
  Service publishes, for each AAGUID, the model's root certificates and its
  certification level, so a bank or a government agency can accept only
  certified hardware keys.
- **Privacy.** An attestation key unique to each device would let sites track
  it across accounts. FIDO's rule is that an attestation key must be shared by
  a batch of at least 100,000 devices of the same model, so it says "a YubiKey
  5 NFC", not "this YubiKey".

Attestation tells the site about the hardware at registration time. It does
not say who is holding the device, and it says nothing about later logins,
which carry no attestation. For synced passkeys it is weak by design: the key
was not born in one device and will not stay in one.

### What each format signs

Every format answers the same question, "which key made this new credential,
and who vouches for that key?", but each was shaped by the hardware it came
from. In all of them the signed data includes the new authenticator data and
the hash of `clientDataJSON`, so an attestation cannot be moved to another
registration.

| Format | Signed by | What is signed | Chain to |
| --- | --- | --- | --- |
| `packed`, full | a batch key in the device | authData ‖ clientDataHash | the maker's root, in FIDO metadata |
| `packed`, self | the new credential key itself | authData ‖ clientDataHash | nothing: proves possession only |
| `fido-u2f` | the U2F key's batch key | 0x00 ‖ rpIdHash ‖ clientDataHash ‖ credential ID ‖ public key | the maker's root |
| `tpm` | the TPM's attestation key | a TPM structure whose `extraData` is the hash of authData ‖ clientDataHash | an attestation-key certificate from Microsoft, for Windows Hello |
| `android-key` | the phone's Keystore key | a certificate whose extension holds clientDataHash as the challenge | Google's hardware attestation root |
| `apple` | Apple's Anonymous Attestation CA | a fresh certificate whose extension holds SHA-256(authData ‖ clientDataHash) | Apple's WebAuthn root |
| `none` | nobody | nothing | nothing |

**Self attestation** carries no information about the device: the new
private key signs its own registration, which proves only possession. A site
that wants to know the model must reject it.

**Asking for attestation.** The site sets `attestation` in the registration
options to `none` (the default), `indirect` (the client may anonymize the
statement), `direct` (pass the authenticator's statement through) or
`enterprise`. For `direct`, Chrome and Firefox ask the user before handing a
security key's make and model to a site. **Enterprise attestation**
(CTAP 2.1) is the one deliberate exception to batch anonymity: a key set up by
an employer may identify the individual device, but only to RP IDs on a list
built into the key or the managed browser.

**What attestation leaks.** The batch rule stops tracking, not
identification of the model, and a key model sold mainly to one agency's
staff says something about its owner. Synced passkeys mostly return `none`,
but many providers still put a fixed AAGUID in the authenticator data, and a
community-maintained list maps them to names ("iCloud Keychain", "Google
Password Manager"). Sites use it to label passkeys on the settings page. It
cannot be used for security: unattested, it is whatever the authenticator
chose to write.

## 13.7 Talking to the authenticator: CTAP2

*Level: intermediate.*

Between the browser and a hardware key runs CTAP2, a small binary protocol of
CBOR-encoded commands: `authenticatorMakeCredential`,
`authenticatorGetAssertion`, `authenticatorGetInfo` (versions, algorithms,
extensions) and `authenticatorClientPIN`, among others. The part of it that is
cryptography in its own right is the PIN protocol.

**The PIN protocol.** A security key with a PIN must never let the computer
read the PIN back, and the computer should not send the PIN in the clear over
USB. CTAP's PIN/UV protocol runs an ECDH exchange on P-256 between a fresh key
from the browser and the authenticator's key, derives an AES key and an HMAC
key (protocol 2 uses HKDF-SHA-256 with the labels `CTAP2 AES key` and
`CTAP2 HMAC key`; protocol 1 just hashed the shared point), and sends the first
16 bytes of SHA-256 of the PIN encrypted with AES-256-CBC. The authenticator
compares, and returns a **PIN token** that authorizes later commands through an
HMAC. Eight wrong PINs in a row block the key for good; it must then be reset,
which deletes every credential on it. That limit is what makes a 4-digit PIN
acceptable: an attacker with the key gets eight guesses, not ten thousand.

**Hybrid** is the transport that lets a phone act as a security key for a
nearby computer, and **`hmac-secret`** is the CTAP extension that lets a
credential produce secrets as well as signatures. Each gets a section of its
own: §13.8 and §13.9.

## 13.8 Hybrid: a phone as the key for a laptop

*Level: expert.*

Most passkeys live in phones, and many logins happen on computers that hold no
passkey. The phone should act as a security key for the computer in front of
it. A cable is clumsy, Bluetooth pairing is worse, and a plain Internet relay
is what a phishing attacker wants, as we will see. The design that shipped, Google's **caBLE** (cloud-assisted Bluetooth Low Energy),
uses all three channels at once: a QR code to start, a Bluetooth broadcast to
prove the phone is close, and an Internet relay to carry the data. Google
built it between 2018 and 2022 and the FIDO Alliance wrote it into CTAP 2.2
(first public draft 2023) as the **hybrid** transport; CTAP 2.3 (2026) keeps
it. It is the "use a phone or tablet" button in every major
browser's passkey dialog.

### One run, step by step

<div class="mars-steps" markdown>

1. **The QR code.** The laptop's browser makes a fresh P-256 key pair (its
   identity for this session) and a random 16-byte secret, and shows a QR
   code holding a small CBOR map: key 0 is the compressed public key (33
   bytes), 1 the secret, 2 the number of tunnel servers the laptop knows, 3
   the current time, 4 whether it supports linking ("remember this
   computer"), and 5 a hint, `ga` for a login or `mc` for a registration.
   The map is written as a decimal string after `FIDO:/`.
2. **The tunnel.** The phone scans the code and derives two values from the
   secret with HKDF: a 64-byte advert key (AES-256 and HMAC keys) and a
   16-byte tunnel ID. It
   opens a WebSocket to a tunnel server, `wss://cable.ua5v.com` (Google's) or
   `wss://cable.auth.com` (Apple's), at the path `/cable/new/` followed by the
   tunnel ID. The server answers with a 3-byte routing ID.
3. **The advert.** The phone broadcasts a Bluetooth Low Energy advertisement:
   a zero byte, a fresh 10-byte nonce, the routing ID and a 2-byte tunnel
   server number, 16 bytes encrypted as one AES-256 block, then the first 4
   bytes of an HMAC-SHA-256 tag. Without the QR secret, these 20 bytes are
   noise.
4. **Joining.** The laptop listens for adverts and checks each tag with its
   own copy of the key. When one matches, it decrypts the block, learns the
   server and routing ID, and connects to `/cable/connect/` followed by the
   routing ID and the tunnel ID. The server joins the two WebSockets.
5. **The handshake.** The two devices run the Noise pattern **KNpsk0**
   (Chapter 8), named `Noise_KNpsk0_P256_AESGCM_SHA256`. "K" says the
   initiator's static key is already known to the responder: the phone read
   it from the QR code. "N" says the phone sends no static key. "psk0" mixes a
   pre-shared key into the very first message, and that key is derived with
   HKDF from the QR secret *salted with the decrypted advert*. A laptop that
   did not hear the advert cannot compute it, and the handshake fails.
6. **CTAP inside.** The browser's `authenticatorGetAssertion` (or
   `MakeCredential`) request and the phone's answer travel encrypted under the
   Noise keys. The phone shows the RP ID, asks for a face, finger or PIN, and
   signs as a security key would. The tunnel server sees only ciphertext.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The hybrid transport: the laptop shows a QR code with its key and a secret; the phone opens a tunnel at the relay server and broadcasts an encrypted Bluetooth advert; the laptop, hearing the advert, joins the same tunnel, and the two run a Noise handshake and then CTAP through the relay" fill="currentColor" font-size="13">
<rect x="235" y="14" width="170" height="56" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">tunnel server</text>
<text x="320" y="55" text-anchor="middle" font-size="12">cable.ua5v.com, cable.auth.com</text>
<rect x="20" y="110" width="170" height="90" rx="8" fill-opacity=".2" stroke="currentColor"/>
<text x="105" y="134" text-anchor="middle" font-weight="bold">laptop (client)</text>
<text x="105" y="154" text-anchor="middle" font-size="12">browser at the</text>
<text x="105" y="170" text-anchor="middle" font-size="12">real origin; shows</text>
<text x="105" y="186" text-anchor="middle" font-size="12">the QR code</text>
<rect x="450" y="110" width="170" height="90" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="535" y="134" text-anchor="middle" font-weight="bold">phone</text>
<text x="535" y="154" text-anchor="middle" font-size="12">authenticator;</text>
<text x="535" y="170" text-anchor="middle" font-size="12">holds the passkey,</text>
<text x="535" y="186" text-anchor="middle" font-size="12">asks for face or PIN</text>
<line x1="190" y1="128" x2="440" y2="128" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="450,128 440,123 440,133"/>
<text x="320" y="121" text-anchor="middle" font-size="12">1 QR code: laptop's key, secret</text>
<line x1="490" y1="110" x2="412" y2="66" stroke="currentColor" stroke-width="1.5"/>
<polygon points="405,62 417,63 411,72"/>
<text x="500" y="84" font-size="12">2 open tunnel</text>
<line x1="150" y1="110" x2="228" y2="66" stroke="currentColor" stroke-width="1.5"/>
<polygon points="235,62 229,72 223,63"/>
<text x="140" y="84" text-anchor="end" font-size="12">4 join tunnel</text>
<line x1="198" y1="172" x2="442" y2="172" stroke="currentColor" stroke-width="2"/>
<polygon points="190,172 200,167 200,177"/><polygon points="450,172 440,167 440,177"/>
<text x="320" y="164" text-anchor="middle" font-size="12">5 Noise KNpsk0, then CTAP</text>
<text x="320" y="190" text-anchor="middle" font-size="12" fill-opacity=".7">(relayed by the tunnel server)</text>
<path d="M535 200 V240 H105 V208" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 4"/>
<polygon points="105,200 100,210 110,210"/>
<text x="320" y="234" text-anchor="middle" font-size="12">3 Bluetooth advert: 16 encrypted bytes + 4-byte tag</text>
<text x="320" y="258" text-anchor="middle" font-size="12">heard only within radio range: proof the phone is near this laptop</text>
<text x="320" y="288" text-anchor="middle" font-size="12.5">The server relays ciphertext. The QR secret never leaves the two devices.</text>
</svg>
<figcaption>Figure 13.5. The hybrid transport. Three channels, three jobs: the QR code carries the secret, Bluetooth proves nearness, and the Internet relay carries the encrypted CTAP messages.</figcaption>
</figure>

If the user agrees to link the devices, the phone's last message carries a
long-term key, a push-notification address and a shared secret. Next time the
laptop wakes the phone with no QR code, and the pair run the mirror-image
pattern **NKpsk0**, in which the laptop knows the phone's static key.

### Why Bluetooth, if the QR code already carries a secret?

Because of this attack. Mallory opens the real `login.arcadia.mars` in her
own browser and clicks "use a phone". Her browser shows a genuine QR code. She
copies the image into an email: "Scan to confirm your library account." Alice
scans it with her phone. Without the Bluetooth step, Alice's phone would
connect through the tunnel to Mallory's browser and sign a login for
`arcadia.mars`, and every check in §13.5 would pass, because Mallory's browser
really is at the real origin. Origin binding protects the user from a fake
page; it cannot protect her from a real page on someone else's computer.

The advert closes this. The handshake key depends on 10 random bytes that the
phone sends only by radio, so Mallory's laptop must be within Bluetooth range
of Alice's phone, normally a few meters to a few tens of meters. That is a
proximity check, not a cryptographic distance bound: a radio near the victim
relaying the 20 bytes defeats it, but costs far more than an email. The
phone's prompt, which names the site, is the second defense.

### A worked example by hand: why digits?

The payload is 69 bytes: a 1-byte map header, then the key (1 + 2 + 33 = 36
bytes with its key and length), the secret (1 + 1 + 16 = 18), the domain count
(2), the time (1 + 5 = 6), the linking flag (2) and the hint (1 + 3 = 4); $1 +
36 + 18 + 2 + 6 + 2 + 4 = 69$. Chromium's encoder takes 7 bytes at a time,
reads them as a little-endian number below $2^{56} \approx 7.2 \times
10^{16}$, and writes it as 17 decimal digits. Nine full chunks use 63 bytes and
give $9 \times 17 = 153$ digits; the last 6 bytes need 15 digits, since
$2^{48} \approx 2.8 \times 10^{14}$ has 15. Total: 168 digits after
`FIDO:/`.

Why not base64? The content must be a URL, and QR codes store text in modes
of different density. Its numeric
mode packs 3 digits into 10 bits, so 168 digits cost $56 \times 10 = 560$
bits, only 8 bits more than the raw $69 \times 8 = 552$. The same bytes in
base64url are 92 characters; they include lower-case letters, which the dense
alphanumeric mode cannot hold, so they must go in byte mode at 8 bits each:
736 bits, a third more. The prefix `FIDO:/` is in capitals for the same reason:
capitals, digits, `:` and `/` all fit the alphanumeric mode. A smaller code
scans faster.

## 13.9 The prf extension: a passkey that makes keys

*Level: intermediate.*

A signature proves who you are to a server. It cannot encrypt the user's
data so that the service itself cannot read it, as backups, password vaults
and message histories need. With passwords, the key was derived from the
password with a slow hash. With passkeys there is no password, so the
authenticator must provide the secret.

**`hmac-secret` in CTAP.** When a credential is made with this extension, the
authenticator creates two random 32-byte values for it, `CredRandomWithUV`
and `CredRandomWithoutUV`, and keeps them with the credential (inside the
encrypted credential ID, for a key that stores nothing). At login the client
sends one or two 32-byte salts, encrypted under the shared secret of the PIN
protocol (§13.7) and authenticated with its HMAC key, so a program sniffing
USB sees neither salts nor results. The authenticator returns HMAC-SHA-256 of
each salt under the CredRandom value that matches whether the user was
verified, encrypted the same way. The same credential and salt always give the
same 32 bytes. Two salts let a service rotate keys in a single touch.

**`prf` in WebAuthn.** WebAuthn Level 3 exposes this to web pages. A page asks
for `extensions: {prf: {eval: {first: ..., second: ...}}}`, or
`evalByCredential` to give each allowed credential its own inputs, and gets
the results back in `getClientExtensionResults()`. The browser hashes the
page's input with the prefix `WebAuthn PRF` and a zero byte before passing it
on, so a web page can never request the same value that a native program gets
from `hmac-secret` directly. Password managers use it to unlock the user's
vault with the passkey (Bitwarden's "log in with passkey" is one); Linux's
`systemd-cryptenroll` uses `hmac-secret` to unlock an encrypted disk. The
spec's test vector:

```python
# The prf extension (WebAuthn Level 3, section 10.1.4) on top of CTAP2's
# hmac-secret: a passkey that can also produce a secret key, for example to
# unlock encrypted backups. Checked against the spec's test vectors.
import hashlib, hmac
cred_random = bytes.fromhex("437e065e723a98b2f08f39d8baf7c53ecb3c363c5e5104bdaaf5d5ca2e028154")  # kept inside the authenticator
prf_input = bytes.fromhex("576562417574686e20505246207465737420766563746f727302")       # from the site

salt = hashlib.sha256(b"WebAuthn PRF" + b"\x00" + prf_input).digest()     # the browser's step
output = hmac.new(cred_random, salt, hashlib.sha256).digest()             # the authenticator's step
print("salt1  ", salt.hex(), salt.hex() == "527413ebb48293772df30f031c5ac4650c7de14bf9498671ae163447b6a772b3")
print("output1", output.hex(), output.hex() == "3c33e07d202c3b029cc21f1722767021bf27d595933b3d2b6a1b9d5dddc77fae")
# The "WebAuthn PRF" prefix keeps a web page from asking for the same HMAC that
# a native app gets from hmac-secret directly, for instance to unlock a disk.
```

```text
salt1   527413ebb48293772df30f031c5ac4650c7de14bf9498671ae163447b6a772b3 True
output1 3c33e07d202c3b029cc21f1722767021bf27d595933b3d2b6a1b9d5dddc77fae True
```

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The prf extension as a key pipeline: the site's input is hashed by the browser with the label WebAuthn PRF, the authenticator computes HMAC-SHA-256 with a secret it never reveals, and the application turns the 32-byte output into a key-encryption key that wraps the backup key" fill="currentColor" font-size="13">
<rect x="20" y="20" width="170" height="70" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="105" y="42" text-anchor="middle" font-weight="bold">site</text>
<text x="105" y="62" text-anchor="middle" font-size="12">prf input, stored</text>
<text x="105" y="79" text-anchor="middle" font-size="12">with the account: not secret</text>
<rect x="235" y="20" width="170" height="70" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="320" y="42" text-anchor="middle" font-weight="bold">browser</text>
<text x="320" y="62" text-anchor="middle" font-size="12">salt = SHA-256("WebAuthn</text>
<text x="320" y="79" text-anchor="middle" font-size="12">PRF" ‖ 00 ‖ input)</text>
<rect x="450" y="20" width="170" height="70" rx="8" fill-opacity=".25" stroke="currentColor"/>
<text x="535" y="42" text-anchor="middle" font-weight="bold">authenticator</text>
<text x="535" y="62" text-anchor="middle" font-size="12">HMAC-SHA-256(</text>
<text x="535" y="79" text-anchor="middle" font-size="12">credRandom, salt)</text>
<line x1="190" y1="55" x2="227" y2="55" stroke="currentColor" stroke-width="1.5"/>
<polygon points="235,55 225,50 225,60"/>
<line x1="405" y1="55" x2="442" y2="55" stroke="currentColor" stroke-width="1.5"/>
<polygon points="450,55 440,50 440,60"/>
<rect x="450" y="140" width="170" height="70" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="535" y="162" text-anchor="middle" font-weight="bold">prf output</text>
<text x="535" y="182" text-anchor="middle" font-size="12">32 bytes, same every time</text>
<text x="535" y="199" text-anchor="middle" font-size="12">for this passkey and input</text>
<line x1="535" y1="90" x2="535" y2="132" stroke="currentColor" stroke-width="1.5"/><polygon points="535,140 530,130 540,130"/>
<rect x="235" y="140" width="170" height="70" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="320" y="162" text-anchor="middle" font-weight="bold">application</text>
<text x="320" y="182" text-anchor="middle" font-size="12">HKDF with a label</text>
<text x="320" y="199" text-anchor="middle" font-size="12">gives the KEK</text>
<rect x="20" y="140" width="170" height="70" rx="8" fill-opacity=".12" stroke="currentColor"/>
<text x="105" y="162" text-anchor="middle" font-weight="bold">wrapped backup key</text>
<text x="105" y="182" text-anchor="middle" font-size="12">one copy per passkey,</text>
<text x="105" y="199" text-anchor="middle" font-size="12">stored on the server</text>
<line x1="450" y1="175" x2="413" y2="175" stroke="currentColor" stroke-width="1.5"/>
<polygon points="405,175 415,170 415,180"/>
<line x1="235" y1="175" x2="198" y2="175" stroke="currentColor" stroke-width="1.5"/>
<polygon points="190,175 200,170 200,180"/>
<text x="320" y="236" text-anchor="middle" font-size="12.5">credRandom never leaves the authenticator; it holds two, one used with UV and one without.</text>
</svg>
<figcaption>Figure 13.6. From a passkey to an encryption key. The site's input is not secret; the authenticator's credRandom is, and the output depends on both.</figcaption>
</figure>

### Code it: backups that only passkeys can open

The prf output should not encrypt data directly, or the data would be tied
to one passkey. The standard design has two layers. A random
**backup key** encrypts the data, once. Each registered passkey's prf output
becomes, through HKDF with a label, a **key-encryption key** (KEK) that wraps a
copy of the backup key. The server stores the encrypted data, the wrapped
copies and the prf inputs, none of which it can open. Adding a passkey means
unwrapping with an old one and wrapping again with the new one; removing one
means deleting its copy (and, to be thorough, changing the backup key).

The program models two passkeys, a phone's and a spare badge's, and one
backup.

```python
# End-to-end encrypted backups keyed by passkeys: each passkey's prf output
# becomes a key-encryption key (KEK) that wraps one random backup key. The
# cipher is a toy built from HMAC-SHA-256; a real app uses AES-GCM.
import hashlib, hmac
H = lambda key, data: hmac.new(key, data, hashlib.sha256).digest()

def xor(key, nonce, data):                        # HMAC keystream
    stream = b"".join(H(key, nonce + i.to_bytes(4, "big")) for i in range(len(data) // 32 + 1))
    return bytes(a ^ b for a, b in zip(data, stream))
def seal(key, nonce, pt):
    ct = xor(key, nonce, pt); return nonce + ct + H(key, b"tag" + nonce + ct)[:16]
def unseal(key, box):
    nonce, ct, tag = box[:12], box[12:-16], box[-16:]
    if hmac.compare_digest(tag, H(key, b"tag" + nonce + ct)[:16]): return xor(key, nonce, ct)

def prf(cred_random, prf_input):                  # browser's hash, then authenticator's HMAC
    return H(cred_random, hashlib.sha256(b"WebAuthn PRF\x00" + prf_input).digest())
def kek(prf_output):                              # HKDF-Expand, one block, with a label
    return H(prf_output, b"arcadia backup KEK v1\x01")

passkeys = {name: hashlib.sha256(b"credRandom " + name.encode()).digest() for name in ("phone", "badge")}
backup_key = hashlib.sha256(b"a random 32-byte backup key").digest()
wrapped = {name: seal(kek(prf(cr, b"backup-2026")), bytes(12), backup_key)   # each KEK used once
           for name, cr in passkeys.items()}
backup = seal(backup_key, b"\x01" * 12, b"Greenhouse 4: tomatoes ready on sol 1204")
print("stored:", {k: v[12:18].hex() + "..." for k, v in wrapped.items()},
      len(wrapped["phone"]), "bytes each; backup", len(backup), "bytes")
for name, cr in passkeys.items():                 # restore on a new device
    print("restore with", name, ":", unseal(unseal(kek(prf(cr, b"backup-2026")), wrapped[name]), backup).decode())
print("badge's KEK, phone's copy:", unseal(kek(prf(passkeys["badge"], b"backup-2026")), wrapped["phone"]))
print("phone, another input     :", unseal(kek(prf(passkeys["phone"], b"backup-2027")), wrapped["phone"]))
```

It prints:

```text
stored: {'phone': '39359e517062...', 'badge': '5373698cb926...'} 60 bytes each; backup 68 bytes
restore with phone : Greenhouse 4: tomatoes ready on sol 1204
restore with badge : Greenhouse 4: tomatoes ready on sol 1204
badge's KEK, phone's copy: None
phone, another input     : None
```

Each wrapped copy is 60 bytes: a 12-byte nonce, the 32-byte key and a 16-byte
tag. Either passkey restores the backup. The wrong KEK fails the tag check,
and the right passkey with another input gives another output, so the input
is stored with each wrapped copy.

Three cautions. The output with user verification differs from the output
without, so the page must always ask for the same setting, preferably
`required`. A synced passkey carries its CredRandom values to the user's other
devices; a device-bound key does not, so the user needs a second one. And if
every passkey is lost, the data is gone: the service that cannot read the
backup cannot help either. Services that offer this
keep a printed **recovery key**, one more wrapped copy, under a key the user
writes down (§13.11).

As of November 2026 the extension is widely but not universally available:
security keys have had `hmac-secret` since CTAP 2.0, iCloud Keychain passkeys
support `prf` from iOS 18 and macOS 15 (2024), and Google Password Manager's
do too. A site must check `prf.enabled` in the registration results and keep
another way in for passkeys without it. WhatsApp, for one, began offering a
passkey in place of a password or a 64-digit key for its end-to-end encrypted
chat backups in October 2025.

## 13.10 Synced passkeys and the trade-off

*Level: intermediate.*

A credential that lives in one security key has one great property and one
great problem. Its private key cannot be copied off the device by anyone,
including its owner. And when the device is lost, so is every account that
relied on it alone. Security experts accept the problem by registering two
keys and keeping one in a drawer. Hardly anyone else does.

Synced passkeys solve the problem by giving up part of the property. The
private key is generated on one device and copied, end-to-end encrypted, to the
user's other devices through Apple's iCloud Keychain, Google Password Manager,
Microsoft's sync (in Edge since 2025) or a password manager. The authenticator
data says so: the BE flag ("backup eligible") is set at registration, and BS
("backed up") whenever a copy exists.

What changes:

- **The root of trust moves to the cloud account.** Whoever can sign in to the
  user's Apple or Google account on a new device, and pass its own checks (the
  device passcode of an old device, or a separate PIN in Google's case), can
  restore the passkeys. The account's recovery process becomes the recovery
  process of every site.
- **Counters stop meaning anything.** Several devices cannot share one counter,
  so synced passkeys send 0, and clone detection by counter is gone.
- **Attestation means little,** as §13.6 said.
- **Moving between providers** was impossible at first. FIDO's Credential
  Exchange Format (CXF 1.0, 2025) defines how to export passkeys from one
  provider and import them into another, and iOS 26 added import and export.

What stays: origin binding, which is the property that defeats phishing, and
public keys on the server, which make a server breach harmless for logins. A
synced passkey is far stronger than a password and a one-time code, and a
little weaker than a key that never leaves one piece of hardware. Sites that
need the stronger kind (banks for large transfers, administrators, government)
can require it by checking the BE flag and attestation.

## 13.11 Account recovery: when the phone is lost

*Level: intermediate.*

Every way back in for a user who has lost their authenticator is a login
method too, and an attacker does not care which door opens. A site that accepts only passkeys but resets
accounts by email link has the security of the email account; a site whose
passkeys sync through Apple or Google has, in the end, the security of that
cloud account's recovery. This section follows one event, a lost phone,
through the possible designs (Figure 13.7).

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Decision tree for a lost phone: with synced passkeys and another signed-in device nothing is lost; with no other device the cloud account is recovered with its password and an old device passcode checked by hardware security modules; with device-bound keys a spare key is used, or else each site's own recovery, from recovery codes to email links" fill="currentColor" font-size="13">
<rect x="235" y="10" width="170" height="30" rx="7" fill-opacity=".25" stroke="currentColor"/>
<text x="320" y="29" text-anchor="middle" font-size="12" font-weight="bold">the phone is lost</text>
<line x1="320" y1="40" x2="160" y2="67" stroke="currentColor" stroke-width="1.3"/>
<polygon points="160,74 156,66 164,66"/>
<line x1="320" y1="40" x2="480" y2="67" stroke="currentColor" stroke-width="1.3"/>
<polygon points="480,74 476,66 484,66"/>
<rect x="60" y="74" width="200" height="46" rx="7" fill-opacity=".12" stroke="currentColor"/>
<text x="160" y="93" text-anchor="middle" font-size="12" font-weight="bold">synced passkeys</text>
<text x="160" y="109" text-anchor="middle" font-size="12">(cloud keychain)</text>
<rect x="380" y="74" width="200" height="46" rx="7" fill-opacity=".12" stroke="currentColor"/>
<text x="480" y="93" text-anchor="middle" font-size="12" font-weight="bold">device-bound keys</text>
<text x="480" y="109" text-anchor="middle" font-size="12">(security keys)</text>
<line x1="160" y1="120" x2="82" y2="143" stroke="currentColor" stroke-width="1.3"/>
<polygon points="82,150 78,142 86,142"/>
<line x1="160" y1="120" x2="238" y2="143" stroke="currentColor" stroke-width="1.3"/>
<polygon points="238,150 234,142 242,142"/>
<line x1="480" y1="120" x2="402" y2="143" stroke="currentColor" stroke-width="1.3"/>
<polygon points="402,150 398,142 406,142"/>
<line x1="480" y1="120" x2="558" y2="143" stroke="currentColor" stroke-width="1.3"/>
<polygon points="558,150 554,142 562,142"/>
<text x="82" y="166" text-anchor="middle" font-size="11.5" fill-opacity=".75">another device</text>
<text x="82" y="180" text-anchor="middle" font-size="11.5" fill-opacity=".75">signed in</text>
<rect x="7" y="190" width="150" height="96" rx="7" fill-opacity=".08" stroke="currentColor"/>
<text x="82" y="209" text-anchor="middle" font-size="12">nothing lost:</text>
<text x="82" y="225" text-anchor="middle" font-size="12">passkeys are</text>
<text x="82" y="241" text-anchor="middle" font-size="12">already there</text>
<text x="238" y="166" text-anchor="middle" font-size="11.5" fill-opacity=".75">no other</text>
<text x="238" y="180" text-anchor="middle" font-size="11.5" fill-opacity=".75">device</text>
<rect x="163" y="190" width="150" height="96" rx="7" fill-opacity=".08" stroke="currentColor"/>
<text x="238" y="209" text-anchor="middle" font-size="12">recover the cloud</text>
<text x="238" y="225" text-anchor="middle" font-size="12">account, then its</text>
<text x="238" y="241" text-anchor="middle" font-size="12">escrow: old</text>
<text x="238" y="257" text-anchor="middle" font-size="12">passcode, checked</text>
<text x="238" y="273" text-anchor="middle" font-size="12">by HSMs, 10 tries</text>
<text x="402" y="166" text-anchor="middle" font-size="11.5" fill-opacity=".75">spare key</text>
<text x="402" y="180" text-anchor="middle" font-size="11.5" fill-opacity=".75">registered</text>
<rect x="327" y="190" width="150" height="96" rx="7" fill-opacity=".08" stroke="currentColor"/>
<text x="402" y="209" text-anchor="middle" font-size="12">sign in with the</text>
<text x="402" y="225" text-anchor="middle" font-size="12">spare; remove the</text>
<text x="402" y="241" text-anchor="middle" font-size="12">lost key; register</text>
<text x="402" y="257" text-anchor="middle" font-size="12">a new spare</text>
<text x="558" y="166" text-anchor="middle" font-size="11.5" fill-opacity=".75">no spare</text>
<text x="558" y="180" text-anchor="middle" font-size="11.5" fill-opacity=".75">key</text>
<rect x="483" y="190" width="150" height="96" rx="7" fill-opacity=".08" stroke="currentColor"/>
<text x="558" y="209" text-anchor="middle" font-size="12">each site's own</text>
<text x="558" y="225" text-anchor="middle" font-size="12">recovery: codes,</text>
<text x="558" y="241" text-anchor="middle" font-size="12">ID check, or email</text>
<text x="558" y="257" text-anchor="middle" font-size="12">and SMS links</text>
<text x="558" y="273" text-anchor="middle" font-size="12">(phishable)</text>
<text x="320" y="316" text-anchor="middle" font-size="12.5">Every branch ends at a door that an attacker can also knock on.</text>
</svg>
<figcaption>Figure 13.7. A lost phone, four outcomes. The left branches are recovered by the cloud provider, the right ones by each site.</figcaption>
</figure>

### Synced passkeys: the cloud keychain recovers

**If the user has another device signed in,** nothing is lost: the new phone
signs in to the cloud account, the other device approves it, and the keychain
syncs. The lost phone is then removed from the account, which stops future
syncs to it (it still holds the keys it had, behind its passcode).

**If the lost phone was the only device,** the provider must restore the
keychain without being able to read it, because it is end-to-end encrypted.
Both large providers solve this with a secret the user already knows, checked
by hardware the provider cannot reprogram at will:

- **Apple.** The iCloud Keychain escrow record is encrypted under the user's
  "iCloud security code", normally the passcode of a device, and held by
  clusters of hardware security modules (HSMs). To recover it the user signs
  in with the Apple account password, answers a text message to the trusted
  phone number, and enters the old passcode, which the HSMs check. Apple's
  Platform Security guide says the escrow service allows 10 attempts, and
  after the 10th failure the HSM cluster destroys the record: the keychain is
  gone, but so is the attacker's chance to guess a 6-digit passcode.
- **Google.** Passkeys in Google Password Manager are encrypted under keys
  that live only on the user's devices. A new device gets them by proving
  knowledge of the screen lock (PIN, password or pattern) of a device that
  already had them, or, since September 2024, a separate Google Password
  Manager PIN, which Google says it does not know.

**Break it: the passcode is the root.** In February 2023 the Wall Street
Journal reported a wave of thefts in which criminals watched people type their
iPhone passcodes in bars, then took the phones. With the passcode they could
change the Apple account password, turn off Find My, and read saved passwords
and passkeys: the device passcode was enough to take over the cloud account
that held everything else. Apple's answer, Stolen Device Protection in iOS
17.3 (January 2024), requires Face ID or Touch ID, with no passcode fallback,
for using saved passwords and passkeys away from familiar places, and adds an
hour's delay before the account password can be changed. When a keychain is
recoverable from a short secret, that secret is part of every site's
security.

### Device-bound keys: the site recovers

A credential that cannot leave its device dies with it, so each site designs
its own recovery. From strongest to weakest:

1. **A second authenticator,** registered at the start and kept elsewhere: as
   phishing-resistant as the first. Ask for it right after the first passkey.
2. **Recovery codes,** printed at enrollment, each good once. They can be
   phished, but paper in a drawer rarely meets a phishing page.
3. **Approval from a device still signed in,** with fresh user verification
   there, or a session cookie becomes a recovery credential.
4. **Identity checks:** a document and a selfie, or a visit in person. Slow
   and intrusive, and right for accounts that matter.
5. **Delay and notice:** "your passkeys will be reset in 7 days; if this was
   not you, click here", sent to every address and device on file, which
   gives the real user time to object.
6. **Email links and text messages:** phishable and open to SIM swaps
   (Chapter 11, §11.5); acceptable only behind a delay, and not at all for an
   account with two or more passkeys.

### A worked example by hand: recovery codes

A site issues 10 recovery codes of 16 base32 characters each. Each character
carries 5 bits, so each code has $16 \times 5 = 80$ bits of entropy, and an
attacker guessing online hits *some* code with probability $10/2^{80}$ per
guess. With the server allowing 5 guesses an hour, a year gives $5 \times 24
\times 365 = 43{,}800$ guesses and a success chance of

$$
\frac{43{,}800 \times 10}{2^{80}} \approx \frac{4.4 \times 10^5}{1.2 \times 10^{24}} \approx 3.6 \times 10^{-19}.
$$

Now suppose the database leaks and the codes were stored as salted SHA-256
hashes. An attacker computing $10^{10}$ hashes a second expects to search half
the space for one of the 10 codes: $2^{79} / 10 / 10^{10} \approx 6.0 \times
10^{12}$ seconds, about 190,000 years. A fast hash is fine for a secret this
long. Compare the 8-digit codes some sites issue: $10^8 / 2 / 10 = 5 \times
10^6$ hashes, half a millisecond. Short codes need the slow, salted password
hashes of the [Cryptographic engineering book, Chapter
13](../engineering/13-Passwords-on-the-Server.md), and still fall in hours to
a determined attacker. Long codes do not need them.

### Which kind to choose

| Event | Synced passkey | Device-bound key with a spare |
| --- | --- | --- |
| phone lost or broken | restored from the cloud keychain | spare key, then register a new one |
| phone stolen with its passcode | at risk until the cloud account is secured | safe: the key needs its own PIN |
| cloud account taken over | every passkey in it | unaffected |
| user never set up a backup | usually still fine | site recovery, often by email |
| phishing page | refused | refused |

NIST's SP 800-63B-4 (2025) draws the line where the table suggests:
syncable authenticators are acceptable at its middle level, AAL2, if the sync
service is itself strongly protected, and its top level, AAL3, requires a key
that cannot leave its device. For most people a synced passkey, with the cloud
account behind it protected by a passkey too, is the best trade; for an
administrator, a journalist or an airlock, two hardware keys are.

## 13.12 Mars: airlock badges and Earth logins

*Level: intermediate.*

Every resident of Arcadia City wears a badge that opens the airlocks of their
home, workplace and the city's shared halls. The badge is a FIDO2 security
key; the airlock is a relying party.

**No Earth involved.** A login is a challenge from the airlock, a touch, and a
signature verified with a public key stored in the airlock's controller. It
needs no network at all, let alone a link with a 3 to 22 minute delay. Compare
Kerberos in Chapter 12, which needed a KDC on each planet: public keys need no
one online but the two parties.

**Device-bound, not synced.** The city requires credentials with the BE flag
off and an attestation from its own badge model's AAGUID. A passkey that might
sit in someone's cloud account on Earth, 20 light minutes away from the
person it belongs to, should not open an airlock.

**Two badges each.** Because a device-bound credential dies with its device,
every resident registers a second badge, kept in their quarters, and the city
office registers new ones only in person. That is account recovery done the
expensive, slow and phishing-proof way.

**Gloves.** User verification by PIN is useless in a pressure suit, and a
fingerprint reader cannot read through gloves. Outer airlocks accept user
presence alone (a firm press on the badge) and add a second factor that does
not need hands: the controller checks that the badge's owner is on the shift
roster for that door. Inner doors require UV.

**The counter is back.** With device-bound badges, the counter means something
again. A badge cloned by someone with lab equipment would have to keep pace
with the real one; the first time the two drift apart, the controller sees the
counter go backwards and locks the credential.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="An airlock controller as relying party: it sends a challenge, the resident's badge signs it with the key registered for that airlock, and the controller verifies with the stored public key, without any link to Earth" fill="currentColor" font-size="13">
<rect x="20" y="40" width="160" height="120" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="100" y="66" text-anchor="middle" font-weight="bold">badge</text>
<text x="100" y="90" text-anchor="middle" font-size="12">one key per RP ID,</text>
<text x="100" y="108" text-anchor="middle" font-size="12">a group of doors</text>
<text x="100" y="126" text-anchor="middle" font-size="12">BE off, counter on</text>
<rect x="300" y="40" width="190" height="120" rx="8" class="soft" stroke="currentColor"/>
<text x="395" y="66" text-anchor="middle" font-weight="bold">airlock controller</text>
<text x="395" y="90" text-anchor="middle" font-size="12">public keys, counters,</text>
<text x="395" y="108" text-anchor="middle" font-size="12">shift roster</text>
<text x="395" y="126" text-anchor="middle" font-size="12">checks in milliseconds</text>
<line x1="300" y1="80" x2="184" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="182,80 194,75 194,85"/>
<text x="240" y="72" text-anchor="middle" font-size="12">challenge</text>
<line x1="180" y1="120" x2="296" y2="120" stroke="currentColor" stroke-width="1.5"/><polygon points="298,120 286,115 286,125"/>
<text x="240" y="142" text-anchor="middle" font-size="12">signature</text>
<rect x="530" y="40" width="90" height="120" rx="8" class="soft" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="575" y="92" text-anchor="middle">Earth</text>
<text x="575" y="112" text-anchor="middle" font-size="12">not needed</text>
<text x="320" y="196" text-anchor="middle" font-size="12.5">Public keys make the check local: only the badge and the door take part.</text>
</svg>
<figcaption>Figure 13.8. The airlock badge. Unlike Kerberos, there is no third party to reach, so light delay plays no role.</figcaption>
</figure>

### Signing in to Earth from Mars

The airlock is easy because the relying party is next door. A resident who
signs in to a bank on Earth meets the one part of WebAuthn that assumes a
fast network: the challenge. It must be fresh, so the server remembers when it
issued it and refuses it after a few minutes. WebAuthn Level 3 recommends a
ceremony timeout of 5 to 10 minutes, and servers commonly keep challenges for
about that long.

**A worked example by hand.** Mars is 12 light minutes away. The resident
clicks "sign in" at minute 0. The request for options reaches Earth at minute
12, and the server issues a challenge then. The challenge reaches Mars at
minute 24; the resident touches the key at minute 25; the assertion arrives on
Earth at minute 37. When the server checks it, the challenge is $37 - 12 = 25$
minutes old, or in general $2L + u$ for a one-way light time $L$ and user time
$u$. With $L$ between 3 and 22 minutes and $u$ of a minute, that is 7 to 45
minutes. A 5-minute window refuses every login from Mars; a window of 50
minutes accepts them all. The browser's own `timeout`, which limits how long
it waits for the user, counts only the minute on Mars and needs no change.

A longer window is safe against phishing, since the challenge is still
single-use and signed together with the origin. It costs storage, every open
and used challenge kept for 50 minutes, and exposure: an assertion that
malware captured but did not deliver stays usable that long. The storage cost can be removed by
making the challenge **stateless**: it carries its own issue time and a MAC
under a server key, so the server keeps no table of open challenges, only a
list of used ones until they expire.

A 40-byte challenge does it: an 8-byte issue time, 16 random bytes and a
16-byte truncated HMAC-SHA-256 over both. The server checks the MAC, then that
the age is under 50 minutes, then that the challenge is not on the used list,
and adds it there. The 16 random bytes meet WebAuthn's minimum on their own.
None of this shortens the wait: a login still costs the resident four one-way
trips plus the touch, 13 to 89 minutes from the click to the bank's answer.

**A local relying party.** The better answer moves the check to Mars. The
bank runs a small server in Arcadia City at `mars.bank.example`. Because its
host is under the bank's RP ID `bank.example`, the same passkeys work there
with no new registration: the browser allows any subdomain to use its parent's
RP ID (§13.3), and the bank adds the origin to its list. The Mars server holds
a copy of each Mars resident's credential records, which are public keys and
not secret, issues challenges and checks assertions in milliseconds. It then
tells Earth "this user signed in at this time" with a signed token, the
federation of [Chapter 14, §14.9](14-OAuth-OpenID-Connect-and-JWT.md#149-mars-logging-in-across-the-gap).

The copy needs integrity, not secrecy: a list of public keys helps no
attacker, but whoever can add a key to it can sign in as that user, so changes
are signed on Earth and checked on Mars. A key removed on Earth stays usable on
Mars for up to 22 minutes, so removals go to the Mars server first. And a
device-bound key used against both servers produces counters that look out of
order until the records merge, so the counter there is a warning, never a
lockout.

## 13.13 In the real world

*Level: intermediate.*

A real registration and login, captured in Chromium 153 with the DevTools
virtual authenticator (no hardware key) on a test page at
`http://localhost:8080`, decoded and trimmed:

```
create: fmt packed, attStmt alg -7, x5c C=US, O=Chromium, OU=Authenticator Attestation, CN=Batch Certificate
  alg -7, credentialPublicKey {1: 2, 3: -7, -1: 1, -2: 32 bytes, -3: 32 bytes}
  flags 0x45, signCount 1, AAGUID 01020304050607080102030405060708, credential ID 32 bytes
  clientDataJSON {"type":"webauthn.create","challenge":"cmVnaXN0ZXItY2hhbGxlbmdlLTAwMDE","origin":"http://localhost:8080","crossOrigin":false}
get:    flags 0x05, signCount 2, userHandle alice-0001, signature 72 bytes (DER)
  clientDataJSON {"type":"webauthn.get","challenge":"bG9naW4tY2hhbGxlbmdlLTAwMDE","origin":"http://localhost:8080","crossOrigin":false}
```

Flags `0x45` are UP, UV and AT; `0x05` are UP and UV. The virtual key is
device-bound (no BE or BS), keeps a counter, and gives a `packed` attestation
from a "Batch Certificate", the shared batch key of §13.6. `localhost` is the
one address allowed without HTTPS, for development.

With a hardware security key and Yubico's `libfido2` tools, or Chrome's
DevTools WebAuthn tab without one:

```
fido2-token -L                                 # FIDO devices the OS sees
fido2-token -I /dev/hidraw0                    # CTAP versions, algorithms, extensions, PIN protocols
fido2-token -L -r /dev/hidraw0                 # sites with passkeys on the key (asks for the PIN)
ssh-keygen -t ed25519-sk                       # an SSH key held by the security key (Chapter 6)
```

Algorithms in use: ES256 (-7) nearly everywhere, EdDSA (-8, Ed25519) on some
security keys, RS256 (-257) from some Windows Hello TPM keys. RFC 9864 (2025)
marked the COSE numbers -7 and -8 Deprecated because they do not name the curve
themselves, and added -9 (ESP256) and -19 (Ed25519); WebAuthn keeps -7 and -8,
since many authenticators know nothing else, and calls the new numbers NOT
RECOMMENDED for now.

### Adoption, as of November 2026

On World Passkey Day in May 2026 the FIDO Alliance estimated that **5
billion passkeys** were in use worldwide; that counts credentials, not people.
Its survey published the same day found that 57% of organizations still
relied on phishable methods for employees' day-to-day sign-in. Reports on its
October 2026 index gave an updated estimate of about 7 billion passkeys.

The **Passkey Index** (first edition October 2025, second 15 October 2026) is
narrower and more useful: services that offer passkeys report what their users
actually do. In the 2026 edition, averaged over 12 participating services,
36% of successful sign-ins used a passkey, up from 26% a year earlier.
Passkey sign-ins succeeded 93% of the time, against 78% for passwords with
traditional second factors such as SMS codes, and were nearly three times as
fast, saving about 27 seconds a sign-in. The participants are large services
that chose to report, and the index leaves out account recovery (§13.11).

What a site should do:

- Offer passkeys at sign-up and after every password login.
- Use conditional mediation (passkeys offered in the browser's autofill), so
  users need not know what a passkey is.
- Store credential ID, public key, counter, BE and BS flags, AAGUID and
  creation time; let users see and remove their passkeys.
- Check type, challenge (single use, short-lived), origin, RP ID hash, UP, UV
  when required, and the signature, in that order.
- Treat recovery as a login. Once most users have passkeys, remove SMS and
  email-link recovery for accounts that have two or more passkeys.

## 13.14 Going deeper

*Level: expert.*

**Proofs.** Manuel Barbosa, Alexandra Boldyreva, Shan Chen and Bogdan
Warinschi gave the first provable-security analysis of FIDO2 at CRYPTO 2021.
WebAuthn's part came out well: it is a sound challenge-response protocol
against attackers who do not control the client. CTAP2's PIN protocol did not:
they showed that the binding it establishes between browser and authenticator
is weak against an attacker on the USB link, and proposed a replacement built
on a password-authenticated key exchange (Chapter 11), called sPACA. No
protocol between client and authenticator can help when the client itself is
malicious, the case of attack 5 in §13.5, because the user cannot see what is
being signed.

**What the user sees.** The touch says "someone is here", not "I approve this
transaction". Banking regulators wanted more: a signature over the payee and
amount, shown on a trusted screen. WebAuthn's Secure Payment Confirmation
(a W3C specification) has the browser show the amount and payee and include
them in the client data, so the signature covers them. It is only as strong
as the browser's own display, but it closes the gap between "logged in" and
"agreed to this payment".

**Privacy by design.** Keys are per site, and credential IDs are random, so
two sites cannot tell that the same authenticator registered with both.
Attestation batches (§13.6) keep the model visible but not the device. A
discoverable credential's user handle must not contain personal information,
since the authenticator may show it to anyone who holds the device.

**Related origins.** A company with several domains (say `arcadia.mars` and
`arcadia-city.mars`) wants one passkey for all. WebAuthn Level 3 lets a site
publish, at `/.well-known/webauthn`, a list of origins allowed to use its RP
ID; the browser fetches it before allowing a different domain. It is a
deliberate, narrow hole in origin binding, under the RP's control.

**Post-quantum passkeys.** ES256 falls to Shor's algorithm. RFC 9964 (2026)
gave ML-DSA COSE numbers (-48, -49 and -50), but WebAuthn Level 3 does not yet
list them and no mainstream browser or security key ships them. Size is the
obstacle: an ML-DSA-44 signature is 2,420 bytes and its public key 1,312,
against about 70 and 65 for ES256, and a security key's memory and its NFC
link are small. The Post-quantum book covers the signature schemes; the
migration will be easier here than for TLS, because each credential can be
replaced at the user's next login.

## Check yourself

??? question "1. What is origin binding, and which party enforces it?"
    The signed data includes the page's origin as the browser loaded it, and
    keys are chosen by the RP ID's hash. The browser writes the origin and
    checks the RP ID; the authenticator selects keys by RP ID; the server
    checks the origin and the RP ID hash.

??? question "2. What exactly does the authenticator sign at login?"
    The authenticator data (RP ID hash, flags, counter, any extensions)
    followed by the SHA-256 hash of `clientDataJSON` (type, challenge, origin).

??? question "3. A test vector's flags byte is 0x19 and its counter is 0. What does it say?"
    `0001 1001`: UP (bit 0), BE (bit 3) and BS (bit 4). The user was present
    but not verified, and the credential is a synced passkey that is backed
    up. Several devices hold its key and cannot share one counter, so it sends
    0, and the server skips the counter check.

??? question "4. A phishing page at a look-alike domain asks the browser for the real site's RP ID. What happens? And if it asks for its own?"
    The browser refuses, because the RP ID is not the page's domain or a parent
    of it. With its own RP ID the browser proceeds, but the authenticator has
    no credential for that domain.

??? question "5. What does attestation prove, and what does it not?"
    That the new credential was made by a device of a given model, holding a
    manufacturer's batch key shared by at least 100,000 devices. It says
    nothing about who holds the device, nothing about later logins, and in
    the `packed` self form nothing about the model either.

??? question "6. Why can a 4-digit PIN protect a security key?"
    The authenticator itself counts wrong PINs and blocks after eight, so an
    attacker with the key gets eight guesses, not 10,000; and the PIN is sent
    encrypted under an ECDH-derived key.

??? question "7. In the hybrid transport, the QR code already carries a secret. Why is the Bluetooth advert needed?"
    Without it, an attacker could open the real site in her own browser and
    send its QR code to a victim far away; the victim's phone would sign a
    valid login for the real origin through the tunnel. The Noise pre-shared
    key is derived from the advert, which travels only by radio, so the
    computer that showed the code must be near the phone.

??? question "8. Why does WebAuthn's `prf` hash the page's input with the prefix `WebAuthn PRF`, and why do backups wrap a random key instead of encrypting with the prf output?"
    The prefix keeps a web page from obtaining the same `hmac-secret` output
    that a native program uses, for example to unlock a disk. Wrapping a
    random backup key under each passkey's derived key lets any registered
    passkey open the backup, and adding or removing a passkey changes one
    small wrapped copy instead of re-encrypting the data.

??? question "9. An Earth server keeps login challenges for 5 minutes. Why does every login from Mars fail, and what are two fixes?"
    The challenge is checked $2L + u$ after it was issued, 7 to 45 minutes for
    one-way light times $L$ of 3 to 22 minutes. Fixes: a 50-minute window with
    single-use, ideally stateless, challenges; or a relying party on Mars
    under the same RP ID that checks locally and federates to Earth.

??? question "10. With passkeys in place, where should a defender expect attackers to go?"
    To fallback logins (passwords and codes still accepted), account recovery
    (email links, SMS, recovery codes), stolen session cookies after login,
    and the cloud account that syncs the passkeys, including the device
    passcode that recovers it.

## What you learned

- Passwords and one-time codes can be phished because a person decides where
  to type them; passkeys take that decision away with per-site keys and
  browser-written origins.
- U2F (2014) became FIDO2 (WebAuthn plus CTAP2, 2019) and then synced passkeys
  (2022).
- Registration stores a public key; login verifies a signature over
  authenticator data and the hash of the browser's client data. You checked
  WebAuthn Level 3's test vector and reproduced its signature.
- Each check lives in one place: the RP ID rule in the browser, the per-site
  key in the authenticator, challenge, origin and signature at the server.
- A relying party checks type, challenge, origin, `crossOrigin`, RP ID hash,
  flags, backup bits, signature and counter, in that order, and updates the
  counter last. You wrote that check and watched it refuse seven bad
  assertions.
- Attestation names the model, in batches of 100,000 or more; each format
  signs authenticator data and the client data hash in its own wrapping, and
  enterprise attestation is the deliberate exception. CTAP2 protects the PIN
  with ECDH, HKDF, AES and HMAC and limits guesses to eight.
- The hybrid transport carries a secret in a QR code, proves nearness with an
  encrypted Bluetooth advert whose contents salt the Noise KNpsk0 handshake,
  and relays CTAP through a tunnel server that sees only ciphertext.
- The `prf` extension turns a passkey into a key source; wrapping one backup
  key under each passkey's derived key gives end-to-end encrypted backups that
  any of the user's passkeys can open.
- Synced passkeys trade device binding, counters and meaningful attestation for
  recoverability; the cloud account, its escrow and the device passcode
  become the targets. Device-bound keys need a spare, and each site's
  recovery is only as strong as its weakest method.
- Public keys make an airlock's check entirely local. A bank on Earth must
  keep challenges for about 50 minutes for Mars users, or run a relying party
  on Mars under its own RP ID.
- As of November 2026, the FIDO Alliance estimates billions of passkeys in
  use, and services in its Passkey Index see about a third of sign-ins made
  with them.

## Further reading

- W3C, *Web Authentication: An API for accessing Public Key Credentials,
  Level 3*, sections 6.1 (authenticator data), 7.1 and 7.2 (the relying
  party's checks), 10.1.4 (`prf`) and 16 (test vectors).
- FIDO Alliance, *Client to Authenticator Protocol (CTAP)*, version 2.2 or
  2.3, for the PIN protocols, `hmac-secret` and hybrid transport.
- RFC 9052 and RFC 9053 (COSE), RFC 9864 (fully specified algorithms), RFC 6979
  (deterministic ECDSA).
- Juan Lang, Alexei Czeskis, Dirk Balfanz, Marius Schilder and Sampath
  Srinivas, "Security Keys: Practical Cryptographic Second Factors for the
  Modern Web", Financial Cryptography, 2016.
- Manuel Barbosa, Alexandra Boldyreva, Shan Chen and Bogdan Warinschi,
  "Provable Security Analysis of FIDO2", CRYPTO 2021.
- Cloudflare, "The mechanics of a sophisticated phishing scam and how we
  stopped it", August 2022.
- NIST SP 800-63B-4, *Digital Identity Guidelines: Authentication and
  Authenticator Management*, 2025, on phishing resistance and synced
  authenticators.
- Yubico's `python-fido2` and `libfido2`, readable implementations of both
  sides of CTAP.
- FIDO Alliance, *Client to Authenticator Protocol 2.2* (first public draft
  2023), section on hybrid transports; Chromium's `device/fido/cable/`
  sources and the `webauthn-rs` project's `cable` module, the readable
  implementations of caBLE v2.
- Trevor Perrin, *The Noise Protocol Framework*, revision 34, 2018 (the KN and
  NK patterns and `psk0`).
- Apple, *Apple Platform Security*, sections "Escrow security for iCloud
  Keychain" and "Passkeys"; Apple, "About Stolen Device Protection for
  iPhone", 2024.
- Google Security Blog, "Security of Passkeys in the Google Password
  Manager", October 2022; Google, Google Password Manager PIN announcement,
  September 2024.
- Joanna Stern and Nicole Nguyen, "A Basic iPhone Feature Helps Criminals
  Steal Your Digital Life", The Wall Street Journal, February 2023.
- WhatsApp (Meta), "Making it easier to encrypt WhatsApp chat backups",
  October 2025.
- FIDO Alliance, *The State of Passkeys 2026* (World Passkey Day, May 2026)
  and *Passkey Index 2026* (October 2026), with the first *Passkey Index*
  (October 2025).
