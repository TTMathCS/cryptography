# 16. Signing Software and the Supply Chain

*Every program you run was written, built, packaged and delivered by people
and machines you never met, and an attacker who controls any one of those
steps controls your computer. Signatures are the tool that is supposed to
stop this, and in the incidents of the last fifteen years they often did
not, because the signatures were real: made with the vendor's own key, on
the vendor's own build server, over the attacker's code. This chapter is
about what a signature on software can and cannot promise, and about the
systems built to make up the difference. You will write Ed25519 and check it
against RFC 8032, sign a release statement instead of a bare file, verify
Merkle inclusion and consistency proofs exactly as RFC 9162 specifies them,
make a build reproducible and watch two builds agree byte for byte, and
write a small update client in the style of The Update Framework that
refuses rollback and frozen metadata. The incidents run from Stuxnet's
stolen certificates in 2010 to the xz backdoor of 2024, and the chapter
ends on Mars, with a rover that must judge every update by itself, minutes
of light away from anyone who could help.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a signature on software proves (which key signed which bytes)
      and what it does not (that the code is good, current, or meant for
      you);
    - how the platforms sign code: Authenticode, Apple's code signing and
      notarization, Android's APK signature schemes v1 to v4 and the Janus
      bug of 2017;
    - how package managers sign: Debian's signed Release files, RPM, npm
      provenance (2023) and PyPI attestations (PEP 740, 2024);
    - release signing with GPG, and why signify and minisign were made;
    - transparency logs, with Merkle inclusion and consistency proofs coded
      and checked per RFC 9162;
    - Sigstore: short-lived certificates from an identity, the Rekor log,
      and what a verifier must check;
    - reproducible builds, provenance and the SLSA levels;
    - The Update Framework (TUF) and its roles, freeze and rollback
      attacks, and Uptane for vehicles;
    - the incidents: Stuxnet, Flame, NotPetya, ShadowHammer, SolarWinds,
      Codecov, 3CX and xz;
    - how to sign updates for a machine that cannot ask anyone whether an
      update is still current.

    **You need:** digital signatures from
    [Chapter 15 of the cryptography book](../../book/15-Elliptic-Curves.md)
    (ECDSA and Ed25519) and certificates from
    [Chapter 16](../../book/16-PKI-and-Key-Establishment.md) there; hash
    functions from [Chapter 9](../../book/09-Hash-Functions.md) there. From
    this book, keys in hardware from
    [Chapter 11](11-Hardware-for-Keys.md), secrets in CI from
    [Chapter 12](12-Secrets-in-Operations.md), and the command-line checks
    of [Chapter 15](15-The-Command-Line-Tools.md). You should be able to
    read short Python programs.

    **Levels:** §16.1 and §16.2 are for beginners, §16.3 to §16.11 are
    intermediate, §16.12 is expert.

## 16.1 The problem

*Level: beginner.*

In March 2024 Andres Freund, a PostgreSQL developer at Microsoft, was
measuring database performance on a Debian test machine and noticed that
logging in over SSH had become slow. Each failed login took about half a
second longer than it should, and the SSH daemon used more processor time
than it had any reason to. A memory checker, Valgrind, also complained about
errors inside `liblzma`, the compression library from the xz utilities,
which had nothing to do with logging in. Freund followed the thread. On
29 March he posted to the oss-security mailing list: the upstream release
tarballs of xz 5.6.0 and 5.6.1 contained a backdoor. Through a chain of
build-script tricks it reached into the SSH daemon of some Linux
distributions and replaced the function that checks a client's RSA key. A
person holding one particular private key could have run commands as root
on any machine that installed it. It was given CVE-2024-3094 and the
highest severity score there is.

The releases were signed. The person who signed them was one of the two
maintainers of the project, someone who used the name Jia Tan and had spent
about two years contributing patches, earning trust and taking over release
duties. The backdoor's payload sat in the Git repository disguised as
binary test files, but the script that unpacked it was not in the
repository at all: it was added to the release tarballs, which are built
separately from the repository, in one file that a reviewer reading the Git
history would never have seen. Every check that a careful distribution ran said the same thing:
these are the official releases, signed by the official maintainer. They
were.

A little over three years earlier the same lesson had come from the other
direction. In December 2020 the security company FireEye found that
an update to SolarWinds Orion, a network-monitoring product installed in
thousands of companies and government agencies, carried a backdoor. The
update was signed with SolarWinds' own code-signing certificate, by
SolarWinds' own build system. The attackers had not stolen a key. They had
taken over the build server and changed one source file in the moment
between checkout and compilation, so that the build system compiled,
signed and shipped their code as its own.

A signature on software answers one question: **did the holder of this key
sign these bytes?** It answers it very well. It says nothing about whether
the holder was honest, whether the build that produced the bytes was the
build the holder meant to run, whether the bytes are the newest version,
or whether they were meant for your machine. Everything between a
developer's keyboard and your processor is the **software supply chain**,
and each link in it is a place to attack. Figure 16.1 shows the links and
an incident at each.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The software supply chain as six stages, source, dependencies, build, sign, distribute and install, with a real incident under each stage" fill="currentColor" font-size="14">
<rect x="10" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="56" y="70" text-anchor="middle">source</text>
<rect x="116" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="162" y="62" text-anchor="middle">depen-</text>
<text x="162" y="80" text-anchor="middle">dencies</text>
<rect x="222" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="268" y="70" text-anchor="middle">build</text>
<rect x="328" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="374" y="70" text-anchor="middle">sign</text>
<rect x="434" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="62" text-anchor="middle">distri-</text>
<text x="480" y="80" text-anchor="middle">bute</text>
<rect x="540" y="40" width="92" height="50" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="540" y="40" width="92" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="586" y="70" text-anchor="middle">install</text>
<line x1="102" y1="65" x2="112" y2="65" stroke="currentColor" stroke-width="1.4"/>
<line x1="208" y1="65" x2="218" y2="65" stroke="currentColor" stroke-width="1.4"/>
<line x1="314" y1="65" x2="324" y2="65" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="65" x2="430" y2="65" stroke="currentColor" stroke-width="1.4"/>
<line x1="526" y1="65" x2="536" y2="65" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="24" text-anchor="middle" font-weight="bold">where the attacks entered</text>
<line x1="56" y1="96" x2="56" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="162" y1="96" x2="162" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="268" y1="96" x2="268" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="374" y1="96" x2="374" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="480" y1="96" x2="480" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="586" y1="96" x2="586" y2="120" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="56" y="140" text-anchor="middle" font-size="13">xz</text>
<text x="56" y="158" text-anchor="middle" font-size="13">2024</text>
<text x="162" y="140" text-anchor="middle" font-size="13">3CX via</text>
<text x="162" y="158" text-anchor="middle" font-size="13">X_TRADER</text>
<text x="162" y="176" text-anchor="middle" font-size="13">2023</text>
<text x="268" y="140" text-anchor="middle" font-size="13">SolarWinds</text>
<text x="268" y="158" text-anchor="middle" font-size="13">2020</text>
<text x="374" y="140" text-anchor="middle" font-size="13">Stuxnet</text>
<text x="374" y="158" text-anchor="middle" font-size="13">2010; Flame</text>
<text x="374" y="176" text-anchor="middle" font-size="13">2012</text>
<text x="480" y="140" text-anchor="middle" font-size="13">NotPetya</text>
<text x="480" y="158" text-anchor="middle" font-size="13">2017; Codecov</text>
<text x="480" y="176" text-anchor="middle" font-size="13">2021</text>
<text x="586" y="140" text-anchor="middle" font-size="13">ShadowHammer</text>
<text x="586" y="158" text-anchor="middle" font-size="13">2019 (signed,</text>
<text x="586" y="176" text-anchor="middle" font-size="13">trusted updater)</text>
<rect x="10" y="210" width="620" height="76" rx="5" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="320" y="234" text-anchor="middle">a signature made at "sign" vouches for everything to its left,</text>
<text x="320" y="254" text-anchor="middle">including whatever an attacker changed there; it protects only</text>
<text x="320" y="274" text-anchor="middle">the steps to its right</text>
</svg>
<figcaption>Figure 16.1. The software supply chain. A signature protects what happens after signing; the defenses for what happens before it are transparency, reproducible builds, provenance and review.</figcaption>
</figure>

The figure holds the plan of the chapter. Signatures protect the right-hand
side, distribution and installation, and §16.2 to §16.5 are about doing
that well: on platforms, in package managers and for a project's own
releases. The left-hand side needs other tools. **Transparency logs**
(§16.6 and §16.7) make every signature public, so that a key used in secret
is caught. **Reproducible builds** and **provenance** (§16.8) let
anyone check that a binary came from a given source by a given process.
**Update frameworks** (§16.9) protect against the attacks that a valid
signature does not stop: being served an old version, being kept away from
a new one, or being given the right file for someone else. The incidents in
§16.10 show where each defense would have helped and where none did. A
backdoor written by a trusted maintainer, like xz's, gets past all of them
except people reading code; this chapter says so plainly where it matters.

Keys used to sign software are among the most valuable keys there are. One
code-signing key can make malware acceptable to every Windows machine in
the world. Keeping such keys in hardware is the subject of
[Chapter 11](11-Hardware-for-Keys.md), which tells how Adobe's key, safe in
its HSM, signed malware in 2012 anyway because an attacker controlled a
build server allowed to ask for signatures. The Storm-0558 key that let
attackers forge Microsoft tokens in 2023 is told fully in
[Chapter 12](12-Secrets-in-Operations.md).

## 16.2 What a signature on software proves

*Level: beginner.*

A **checksum** published next to a download (a SHA-256 hash in a text file)
tells you that the file you received matches the file the page describes.
If the page and the file come from the same server, an attacker who can
change one can change both, so a checksum protects only against accidents,
and against attackers who control the mirror but not the web page.
[Chapter 15](15-The-Command-Line-Tools.md) shows the difference at the
command line. A **signature** moves the trust from the server to a key: the
file is accepted if it verifies under a public key that you obtained
earlier, over some other channel, and that key's private half never sat on
the download server.

For software the signature scheme of choice today is **Ed25519**, the
Edwards-curve signature of RFC 8032, used by OpenBSD's signify, minisign,
OpenSSH's file signatures (`ssh-keygen -Y sign`), and many update systems.
It is deterministic (the per-signature secret comes from hashing the key and
the message, so there is no random nonce to get wrong, the failure that
exposed Sony's PS3 key, told in
[Cryptanalysis Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)),
fast, and has 32-byte public keys and 64-byte signatures. The curve
arithmetic is the subject of
[Chapter 6](06-Big-Numbers-and-Public-Key-Code.md), and the scheme is
derived in
[Chapter 15 of the cryptography book](../../book/15-Elliptic-Curves.md#157-eddsa-and-ed25519);
here it is in one place, checked against the first test vector of RFC 8032.

**Code it.** Ed25519 in plain Python. A signature $(R, S)$ on message $M$
under public key $A = aB$ is valid when

$$
[S]B = R + [k]A, \qquad k = \mathrm{SHA512}(R \,\|\, A \,\|\, M) \bmod \ell,
$$

because the signer computed $S = r + k a \bmod \ell$ with $R = [r]B$.

```python
import hashlib

# Ed25519 (RFC 8032) in plain Python: slow and not constant time. For reading,
# never for keys that matter.
p = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493     # order of the base point
d = -121665 * pow(121666, p - 2, p) % p

def add(P, Q):                       # points in extended coordinates (X, Y, Z, T)
    (X1, Y1, Z1, T1), (X2, Y2, Z2, T2) = P, Q
    A, B = (Y1 - X1) * (Y2 - X2) % p, (Y1 + X1) * (Y2 + X2) % p
    C, D = 2 * d * T1 * T2 % p, 2 * Z1 * Z2 % p
    E, F, G, H = B - A, D - C, D + C, B + A
    return (E * F % p, G * H % p, F * G % p, E * H % p)

def mul(s, P):                       # double and add
    Q = (0, 1, 1, 0)
    while s:
        if s & 1:
            Q = add(Q, P)
        P, s = add(P, P), s >> 1
    return Q

def encode(P):
    X, Y, Z, _ = P
    zi = pow(Z, p - 2, p)
    x, y = X * zi % p, Y * zi % p
    return (y | (x & 1) << 255).to_bytes(32, "little")

def decode(b):
    y = int.from_bytes(b, "little")
    sign, y = y >> 255, y & ((1 << 255) - 1)
    x2 = (y * y - 1) * pow(d * y * y + 1, p - 2, p) % p
    x = pow(x2, (p + 3) // 8, p)
    if (x * x - x2) % p:
        x = x * pow(2, (p - 1) // 4, p) % p
    if y >= p or (x * x - x2) % p or (x == 0 and sign):
        raise ValueError("not a point")
    if x & 1 != sign:
        x = p - x
    return (x, y, 1, x * y % p)

B = decode((4 * pow(5, p - 2, p) % p).to_bytes(32, "little"))   # base point, y = 4/5

def h(m):
    return int.from_bytes(hashlib.sha512(m).digest(), "little")

def secret_scalar(seed):
    digest = hashlib.sha512(seed).digest()
    a = int.from_bytes(digest[:32], "little") & ((1 << 254) - 8) | (1 << 254)
    return a, digest[32:]

def public_key(seed):
    return encode(mul(secret_scalar(seed)[0], B))

def sign(seed, msg):
    a, prefix = secret_scalar(seed)
    A = encode(mul(a, B))
    r = h(prefix + msg) % L                      # the nonce comes from key and message
    R = encode(mul(r, B))
    S = (r + h(R + A + msg) * a) % L
    return R + S.to_bytes(32, "little")

def verify(pub, msg, sig):
    if len(sig) != 64:
        return False
    try:
        R, A = decode(sig[:32]), decode(pub)
    except ValueError:
        return False
    S = int.from_bytes(sig[32:], "little")
    if S >= L:                                   # reject the malleable form
        return False
    k = h(sig[:32] + pub + msg) % L
    return encode(mul(S, B)) == encode(add(R, mul(k, A)))

# RFC 8032, section 7.1, TEST 1: the empty message
seed = bytes.fromhex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60")
pub, sig = public_key(seed), sign(seed, b"")
print(pub.hex() == "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")
print(sig.hex() == "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555"
                   "fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b")
print(verify(pub, b"", sig), verify(pub, b"x", sig))
```

```text
True
True
True False
```

The public key and the signature match the RFC byte for byte, and changing
the message by one byte makes verification fail. The check `S >= L` matters:
without it, $S + \ell$ is a second valid signature on the same message, and
systems that use a signature's bytes as an identifier can be confused by
it, as Bitcoin's transaction IDs were by the similar malleability of
ECDSA signatures.

### What exactly is signed

A signature binds a key to bytes, and the most common mistake in software
signing is to sign the wrong bytes: the file alone. Suppose a project signs
each release tarball, and the installer accepts any tarball that verifies
under the project's key. The signature on `mylib-1.0.tar.gz` is valid
forever, for any file name, on any mirror. A mirror that wants you to run
the old version, which has a known hole, can serve it under the name
`mylib-1.4.tar.gz`, and the signature still verifies. A mirror can serve the
project's signed `mylib-tools` package in place of `mylib`. Nothing the
signature covers says which package this is, which version, or until when
it should be believed.

**Break it.** The release server signs bare bytes. In the next blocks the
signature is HMAC-SHA256, standing in for the Ed25519 above only to keep
each block short; the logic that matters is the same with a real signature.

```python
import hashlib, hmac

KEY = b"project release key (stand-in)"
def sign(data):                    # stand-in for Ed25519 sign() above
    return hmac.digest(KEY, data, "sha256")
def verify(data, sig):
    return hmac.compare_digest(sign(data), sig)

# The project signed both releases when it made them.
old = b"mylib 1.0: has the parser bug fixed in 1.3"
new = b"mylib 1.4: current"
releases = {"1.0": (old, sign(old)), "1.4": (new, sign(new))}

# BROKEN installer: the signature covers the file's bytes, nothing else.
def install(name, version, data, sig):
    if not verify(data, sig):
        return "refused"
    return f"installed {name} {version}: {data.decode()}"

# A hostile mirror answers a request for 1.4 with the old, signed 1.0.
data, sig = releases["1.0"]
print(install("mylib", "1.4", data, sig))
```

```text
installed mylib 1.4: mylib 1.0: has the parser bug fixed in 1.3
```

**Fix it.** Sign a **statement** about the file, not the file: the package
name, the version, the hash of the file, and an expiry date, in one
canonical encoding. The installer checks the signature over the statement,
then checks that the statement names what it asked for, that the version
is newer than what it has, that the statement has not expired, and that the
file's hash matches. This is the seed of every update framework in §16.9.

```python
import hashlib, hmac, json

KEY = b"project release key (stand-in)"
def sign(data):                    # stand-in for Ed25519 sign()
    return hmac.digest(KEY, data, "sha256")
def verify(data, sig):
    return hmac.compare_digest(sign(data), sig)

def canonical(obj):                # one byte string for one meaning
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

def release(name, version, data, expires):
    stmt = {"name": name, "version": version, "expires": expires,
            "sha256": hashlib.sha256(data).hexdigest()}
    return data, stmt, sign(canonical(stmt))

TODAY = 20_400                     # days since 1970, for the example
old = release("mylib", [1, 0], b"mylib 1.0", expires=19_900)
new = release("mylib", [1, 4], b"mylib 1.4", expires=20_600)

def install(want, have_version, data, stmt, sig):
    if not verify(canonical(stmt), sig):
        return "refused: bad signature"
    if stmt["name"] != want:
        return "refused: wrong package"
    if stmt["version"] <= have_version:
        return "refused: not newer than what is installed"
    if stmt["expires"] < TODAY:
        return "refused: statement expired"
    if hashlib.sha256(data).hexdigest() != stmt["sha256"]:
        return "refused: file does not match statement"
    return "installed " + data.decode()

print(install("mylib", [1, 2], *old))
print(install("mylib-tools", [0, 0], *new))
print(install("mylib", [1, 2], b"mylib 1.4 + backdoor", *new[1:]))
print(install("mylib", [1, 2], *new))
```

```text
refused: not newer than what is installed
refused: wrong package
refused: file does not match statement
installed mylib 1.4
```

Two details carry the fix. The statement has one canonical encoding, so the
signer and the verifier agree on the bytes (the general problem is in
[Chapter 2](02-Bytes-Encodings-and-Text.md)). And the client compares the
version with what it already has, which means the client keeps state. A
verifier with no memory cannot tell an old valid release from a new one.

What to do:

- Sign statements that name the package, the version, the file's hash and
  an expiry, never bare files; and check every field on the client.
- Distribute public keys out of band, before they are needed: in the
  operating system, in the previous release, in the installer.
- Keep the installed version on the client and refuse anything not newer,
  unless a person explicitly allows a downgrade.
- Use Ed25519 (or ECDSA P-256 where policy requires it) and a library that
  rejects non-canonical signatures.

## 16.3 Code signing on the platforms

*Level: intermediate.*

Operating systems were the first to sign code at scale, and each did it for
the problem of its own moment.

### Windows: Authenticode

Microsoft introduced **Authenticode** in 1996, with Internet Explorer 3.0.
The web had just learned to download and run programs: ActiveX controls ran
with the full rights of the user, and a browser needed some reason to
believe a control was what it claimed to be. Authenticode put a PKCS#7
signature (the format whose bytes are read in
[Chapter 3](03-ASN1-DER-and-Key-Files.md)) inside the Windows executable
format, made with a key whose certificate was issued by a commercial CA
that had checked the publisher's identity. The browser showed the
publisher's name and asked the user. The model's weakness was visible at
once: it identified a publisher, it did not say the code was safe, and
users clicked "yes". In the summer of 1996 the programmer Fred McLain
published an ActiveX control, Exploder, that shut down the Windows 95
computer that ran it, and in August he signed it with an individual
publisher certificate he had bought from VeriSign. VeriSign revoked the
certificate. Both sides claimed the episode: the signer had been identified
and stopped, and the control had run anyway. Signing gives accountability
after the fact, not safety.

Two Authenticode ideas outlived ActiveX and matter for every signing system.
The first is the **timestamp countersignature**. A code-signing certificate
expires, typically after one to three years, but the software it signed
stays installed for a decade. So the signer sends the signature's hash to a
timestamping authority (RFC 3161 defines the protocol), which signs "this
existed at time $t$". A verifier then accepts the signature if the
certificate was valid at $t$, even after the certificate has expired. The
price is that an expired certificate's key stays dangerous: if it leaks,
anyone can sign new code and get a fresh timestamp. Revocation has to say
from when the key is no longer trusted, and Windows' revocation of a
code-signing certificate can be dated to the compromise rather than to the
day of revocation. The second idea is that **the platform can require a
signature**: 64-bit Windows Vista (2007) refused to load kernel drivers
without one, and Windows 10 from version 1607 (2016) required new drivers
to be signed by Microsoft itself, through its developer portal, rather than
by any CA's customer. That rule exists because the driver certificates of
ordinary companies were stolen, starting with the Stuxnet case in §16.10.

!!! note "Life story: Authenticode"
    **Born:** 1996, with Internet Explorer 3.0, to sign ActiveX controls and
    downloads · **Purpose:** tell the user who published a program, and that
    it was not changed since · **Helped:** made code signing normal on
    Windows; added timestamp countersignatures, mandatory driver signing
    (Vista x64, 2007) and reputation checks (SmartScreen) · **Status:** in
    use for all Windows executables and drivers; since 2023 the CA/Browser
    Forum's code-signing requirements say that subscribers' private keys
    must be generated and kept in hardware

### Apple: code signing, Gatekeeper and notarization

Apple added code signing to Mac OS X 10.5 in 2007 and made it mandatory for
everything on the iPhone from the start of the App Store in 2008: an iOS
device runs only code signed by Apple or by a developer certificate Apple
issued, and the kernel checks pages of code against the signature as they
are loaded. On the Mac, signing stayed optional until **Gatekeeper** (OS X
10.8, 2012) began refusing, by default, downloaded applications that were
not signed with an Apple-issued Developer ID.

Signing told Apple who to blame. It did not let Apple look at the code
before users ran it, and in 2018 Apple added **notarization**: a developer
uploads each build to Apple, an automated service scans it for known
malware and for a few required settings (the hardened runtime, a secure
timestamp), and Apple returns a **ticket**, a signed statement that this
exact code (identified by its hash) was checked. The ticket can be
"stapled" to the application so that a Mac with no network can check it.
macOS 10.15 Catalina, released in October 2019, required notarization for
new software distributed outside the App Store, and after a few months of
relaxed rules Apple enforced it fully from February 2020. Notarization is
partly a transparency mechanism: Apple holds a record of every notarized
binary and can revoke a ticket when malware is found. It is not review by
a person, and malware has been notarized; the trojanized 3CX desktop
application of 2023 (§16.10) was signed and notarized, because the build it
came from was the vendor's own.

### Android: four signature schemes and a bug called Janus

An Android application package (APK) is a ZIP file, and the first Android
signing scheme, now called **v1**, reused Java's JAR signing: a manifest
lists a hash of each file in the archive, and a signature covers the
manifest. Two properties of v1 caused years of bugs. It signs the
*entries* of the ZIP archive, not the archive's bytes, so anything outside
the entries (ZIP metadata, extra bytes before the first entry) is not
covered. And it requires a parser to agree with the signature check about
what the entries are, which went wrong in 2013 with the "Master Key" bug,
where two entries with the same name were read one way by the verifier and
another way by the installer (told in
[Chapter 2](02-Bytes-Encodings-and-Text.md)).

**APK Signature Scheme v2** (Android 7.0, 2016) signs the whole file: the
APK is split into the ZIP entries, the central directory and the
end-of-central-directory record, and a signature over hashes of 1 MiB
chunks of all three is stored in a new **APK Signing Block** placed just
before the central directory. Any change to any byte outside that block
breaks the signature, and the chunked hashes let the installer verify in
parallel. **v3** (Android 9, 2018) added **key rotation**: the signing
block can carry a "proof of rotation", a chain of signatures in which each
old key vouches for the next, so a developer can move to a new key without
users losing updates. Until then an Android app's signing key could never
change, since the platform let an update replace an app only if it was
signed by the same key. **v4** (Android 11, 2020) is a different kind of
scheme: it stores, in a separate `.idsig` file, the root of a Merkle tree
over the APK's 4 KiB blocks, so that the system can start an application
while it is still being streamed and check each block when it is read.

The bug that pushed everyone off v1 was **Janus** (CVE-2017-13156), found by
the company GuardSquare and fixed in Android's December 2017 security
update. A DEX file (Android's compiled code) is read from its start; a ZIP
file is read from its end, where the central directory is. One file can be
both: a DEX file followed by a valid ZIP. The v1 check looked at the ZIP
entries, saw an untouched, correctly signed application, and passed it. The
runtime, which on Android 5.0 to 8.0 checked the first bytes of the file to
decide what it was, saw a DEX header and ran the attacker's code, with the
identity and permissions of the real application. Any app signed only with
v1 could be "updated" by anyone into anything. v2 closed it because the
prepended bytes are covered by the whole-file signature.

!!! note "Life story: the Janus bug"
    **Born:** reported to Google by GuardSquare in July 2017; CVE-2017-13156
    · **Purpose:** a file that is a valid DEX at its start and a valid,
    signed ZIP at its end, so that the signature check and the code loader
    read different programs · **Helped:** let an attacker modify any app
    signed only with scheme v1 on Android 5.0 to 8.0 without breaking its
    signature · **Status:** fixed in the December 2017 security bulletin;
    the standing lesson that a signature must cover the bytes the loader
    reads, all of them

The pattern in Janus, Master Key and the ZIP bugs before them is the one
[Chapter 3](03-ASN1-DER-and-Key-Files.md) found in certificate parsers:
**the verifier and the user of the data parse it differently.** The fix is
always the same shape: sign the exact bytes that will be used, and have one
parser.

What to do:

- Sign every artifact the platform can check (Authenticode with a
  timestamp, Developer ID and notarization, APK v2 or later), and keep the
  signing keys in hardware (Chapter 11).
- Treat a valid platform signature as accountability, not safety: it
  proves who shipped the code, and the attacker may have been inside.
- For your own formats, sign the whole file's bytes, and make the code that
  checks the signature hand the verified bytes to the code that uses them.
- Plan key rotation before you need it (APK v3's proof of rotation is a
  good model: the old key signs the new one).

## 16.4 Package managers

*Level: intermediate.*

A Linux distribution installs tens of thousands of packages from mirrors run
by universities, companies and volunteers it does not control. A language
registry such as npm or PyPI serves millions of packages uploaded by anyone.
Both need the client to trust what it downloads without trusting the
server it downloads from, and they solved it in different ways.

### Debian and apt: sign the index, hash the rest

Debian does not, as a rule, sign individual packages. It signs the
**index**. Since the "secure APT" work that arrived with apt 0.6 in 2005
and became standard in Debian 4.0 (2007), each archive suite has a
**Release** file that lists the SHA-256 hash and size of every index file
in the suite, chiefly the `Packages` files; each `Packages` file lists, for
every package, its version and the SHA-256 hash of its `.deb` file. Only
the Release file is signed, with an OpenPGP key whose public half ships in
the `debian-archive-keyring` package. The signature comes either as a
detached `Release.gpg` or inline in a clearsigned `InRelease` file. One
signature, checked once, covers the whole archive through a chain of
hashes (Figure 16.2), and the mirrors need no keys at all.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Debian's chain of trust: the archive key signs InRelease, which lists the hash of each Packages file, which lists the hash of each .deb" fill="currentColor" font-size="14">
<rect x="10" y="20" width="110" height="60" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="10" y="20" width="110" height="60" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="45" text-anchor="middle">archive key</text>
<text x="65" y="65" text-anchor="middle" font-size="12">(in the keyring)</text>
<rect x="160" y="20" width="150" height="120" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="235" y="42" text-anchor="middle" font-weight="bold">InRelease</text>
<text x="172" y="66" font-size="12">Suite: stable</text>
<text x="172" y="84" font-size="12">Valid-Until: ...</text>
<text x="172" y="102" font-size="12">Packages: 3f9a...</text>
<text x="172" y="126" font-size="12" opacity="0.8">signature</text>
<rect x="350" y="20" width="140" height="120" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="420" y="42" text-anchor="middle" font-weight="bold">Packages</text>
<text x="362" y="66" font-size="12">openssl 3.0.15-1</text>
<text x="362" y="84" font-size="12">SHA256: 9c1e...</text>
<text x="362" y="108" font-size="12">zlib 1:1.3.1-1</text>
<text x="362" y="126" font-size="12">SHA256: 51d0...</text>
<rect x="530" y="20" width="100" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="50" text-anchor="middle" font-size="13">openssl.deb</text>
<rect x="530" y="90" width="100" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="120" text-anchor="middle" font-size="13">zlib.deb</text>
<line x1="120" y1="50" x2="152" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,50 150,45 150,55" fill="currentColor"/>
<line x1="310" y1="98" x2="342" y2="80" stroke="currentColor" stroke-width="1.4"/>
<polygon points="350,76 339,75 344,84" fill="currentColor"/>
<line x1="490" y1="80" x2="522" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="530,44 519,46 525,54" fill="currentColor"/>
<line x1="490" y1="122" x2="522" y2="116" stroke="currentColor" stroke-width="1.4"/>
<polygon points="530,115 520,111 521,121" fill="currentColor"/>
<text x="136" y="170" font-size="13">signs</text>
<text x="318" y="170" font-size="13">hash of each index</text>
<text x="496" y="170" font-size="13">hash of each .deb</text>
<text x="320" y="210" text-anchor="middle">one signature, then a chain of hashes: the mirrors hold no keys and need no trust</text>
</svg>
<figcaption>Figure 16.2. Debian's archive signing. Only the Release file is signed; every other file is trusted because its hash appears in a file that is.</figcaption>
</figure>

The Release file also carries a **Valid-Until** field on the suites that
change often, such as Debian's security archive. Without it a mirror could
keep serving an old, correctly signed Release file forever, and its users
would never see a security update; apt refuses a Release file whose
Valid-Until has passed. That attack is called a **freeze**, and §16.9
treats it properly.

Apt's own code has been the weak point more often than its design. In
December 2016 Jann Horn of Google's Project Zero showed that apt split a
clearsigned InRelease file into its text and its signature in one place,
and read it again in another, and that a crafted file could be accepted as
signed by the first and parsed differently by the second (CVE-2016-1252).
In January 2019 Max Justicz found that apt's HTTP downloader copied a
redirect's `Location` header, unescaped, into the messages it sent to the
main apt process, so that a network attacker could inject fake "the hash
matched" lines and get any package installed as root (CVE-2019-3462). Both
were cases of the same rule as Janus: the bytes that were verified and the
bytes that were used were not the same bytes.

**Break it.** A client checks the signature over the signed part of an
InRelease file, then parses the whole file for hashes. An attacker who
cannot sign can still append a line.

```python
import hashlib, hmac

KEY = b"archive signing key (stand-in)"
def sign(data):                    # stand-in for the archive's OpenPGP signature
    return hmac.digest(KEY, data, "sha256").hex()
def sig_ok(data, sig):
    return hmac.compare_digest(sign(data), sig)

sha = lambda b: hashlib.sha256(b).hexdigest()
good_packages = b"Package: openssl\nVersion: 3.0.15-1\n"
evil_packages = b"Package: openssl\nVersion: 3.0.15-1+evil\n"

body = ("Suite: stable\nSHA256:\n " + sha(good_packages) + " main/Packages\n").encode()
MARK = b"-----BEGIN SIGNATURE-----\n"
inrelease = body + MARK + sign(body).encode() + b"\n"

# The attacker in the middle cannot sign, but can append to the file.
tampered = inrelease + b" " + sha(evil_packages).encode() + b" main/Packages\n"

def hashes(text):                  # read "hash name" lines; a later line wins
    out = {}
    for line in text.decode().splitlines():
        parts = line.split()
        if line.startswith(" ") and len(parts) == 2:
            out[parts[1]] = parts[0]
    return out

# BROKEN: check the signature on one part, then parse the whole file
def update_broken(inrel, packages):
    signed, rest = inrel.split(MARK, 1)
    if not sig_ok(signed, rest.split(b"\n")[0].decode()):
        return "refused: bad signature"
    if hashes(inrel)["main/Packages"] != sha(packages):
        return "refused: Packages does not match"
    return "accepted " + packages.decode().split("\n")[1]

# FIXED: the verifier returns the signed bytes, and only those are parsed
def verified_body(inrel):
    signed, rest = inrel.split(MARK, 1)
    sig, _, trailer = rest.partition(b"\n")
    if trailer or not sig_ok(signed, sig.decode()):
        raise ValueError("bad or extended signature block")
    return signed

def update_fixed(inrel, packages):
    try:
        body = verified_body(inrel)
    except ValueError as e:
        return "refused: " + str(e)
    if hashes(body)["main/Packages"] != sha(packages):
        return "refused: Packages does not match"
    return "accepted " + packages.decode().split("\n")[1]

print("broken:", update_broken(tampered, evil_packages))
print("fixed: ", update_fixed(tampered, evil_packages))
print("fixed: ", update_fixed(inrelease, good_packages))
```

```text
broken: accepted Version: 3.0.15-1+evil
fixed:  refused: bad or extended signature block
fixed:  accepted Version: 3.0.15-1
```

The fixed client does two things. Its verifier returns the bytes it
verified, and the parser never sees anything else; and it refuses a file
with anything after the signature, instead of ignoring it. An API shaped
like `verify(file) -> bool` invites the broken version, since the caller
must then find the signed part again by itself. An API shaped like
`open_signed(file) -> verified_bytes` does not; it is the same principle as
the AEAD that returns plaintext only after the tag is checked, from
[Chapter 9](09-APIs-That-Resist-Misuse.md).

### RPM: sign each package

Red Hat's RPM format took the other road. Each package carries its own
OpenPGP signature in its header, over the header and the payload, and
`rpm --checksig` or the installer checks it against keys imported into the
RPM database. Each `.rpm` file can be checked on its own, wherever it came
from, which suits a world where packages are copied between machines. The
repository metadata (`repomd.xml`, which plays the role of Debian's Release
file) can be signed too, but checking it (`repo_gpgcheck` in `dnf`) was
long off by default, and per-package signatures alone do not stop a mirror
from hiding an update or serving an old signed package, because each old
package is still validly signed. Both families learned the same thing:
signing files is not enough; something must sign the **current state of
the whole repository**, with a date.

### npm and PyPI: from keys to identities

Language registries took longest, for a reason that is not technical:
their publishers are individuals with laptops, not distributions with
signing ceremonies. PyPI accepted OpenPGP signatures uploaded next to
packages for many years, and almost nothing checked them. In May 2023 PyPI
stopped accepting them, after an analysis by William Woodruff found that a
large share of the keys behind existing signatures could not be found on
any key server, and that many of the others had expired or could not be
used to verify anything.

What replaced key-based signing in both registries is **identity-based
provenance**, built on Sigstore (§16.7). In April 2023 GitHub and npm
introduced **npm provenance**: a package built and published from a GitHub
Actions workflow with `npm publish --provenance` carries a signed statement
saying which repository, which commit and which workflow built it, signed
with a short-lived certificate tied to that workflow's identity and
recorded in the public Rekor log. The npm website shows the link to the
source commit, and `npm audit signatures` checks it. In the same month
PyPI launched **Trusted Publishing**, which lets a CI workflow publish by
exchanging its OpenID Connect identity token for a short-lived upload token
instead of storing a long-lived API token (the general pattern is in
[Chapter 12](12-Secrets-in-Operations.md)). On 14 November 2024 PyPI
completed support for **PEP 740**, "Index support for digital
attestations", accepted in July 2024: packages uploaded through Trusted
Publishing get attestations, Sigstore-signed statements binding each file
to the identity of the workflow that built it, published by PyPI next to
the file.

The change in what a signature means is worth stating exactly. An OpenPGP
signature on a PyPI package said "the holder of key `0xABCD...` signed this",
and the user had no way to know whose key that was. A PEP 740 attestation
says "the workflow `release.yml` in the GitHub repository `pallets/flask`,
run on this commit, built this file", which is something a user can
compare with what they expected. It does not say the code is safe; a
malicious maintainer's workflow attests their malicious code as faithfully
as anyone else's.

What to do:

- If you run a repository, sign its whole state (an index with hashes of
  everything, with an expiry), not only individual files.
- In a client, verify and parse the same bytes; keep the verifier's output
  the only input to the parser.
- Publish from CI with Trusted Publishing and provenance where your
  registry supports it (npm, PyPI, and others following), and remove
  long-lived upload tokens.
- When you consume packages, pin them by hash in a lock file (`npm ci`
  with `package-lock.json`, `pip install --require-hashes`), so that a
  re-uploaded or substituted file cannot slip in under a known version.

## 16.5 Release signing: GPG, signify and minisign

*Level: intermediate.*

A project that publishes its own releases, outside any registry, has
traditionally signed them with GnuPG: a detached signature, `.asc` or
`.sig`, next to each tarball, and the project's public key on its website
and on the key servers. The commands are in
[Chapter 15](15-The-Command-Line-Tools.md) and the
[gpg reference card](../../tools/gpg.md). This section is about why the
system around those commands has been so hard to use well.

**Key distribution was the hard part, and was never solved.** OpenPGP's
answer was the web of trust: people sign each other's keys at key-signing
parties, and you trust a key because someone you trust signed it. In
practice almost nobody computes a trust path. Users fetch the key that the
download page names and trust it because it is there, which is the same
trust as the checksum on the same page, unless they kept the key from an
earlier release. Projects that named their key by a short 32-bit key ID
(such as `0x6092693E`) made it worse: in 2014 the Evil32 project showed
that colliding 32-bit IDs could be generated quickly for every key in
the web-of-trust "strong set", and in 2016 forged keys with the
same short IDs as those of well-known developers turned up on the public
key servers. Fingerprints of 160 bits, written in full, are the minimum.

**The key servers became a liability.** The SKS key-server network let
anyone attach signatures to anyone's key and never deleted anything. In
June 2019 attackers flooded the keys of two well-known OpenPGP developers,
Robert J. Hansen and Daniel Kahn Gillmor, with tens of thousands of
signatures each, so that GnuPG froze or failed when it imported them
(CVE-2019-13050). The network was wound down in the following years, and
its successor, keys.openpgp.org (2019), strips third-party signatures and
publishes user IDs only after checking the email address.

**Tools misread the verifier.** In June 2018 Marcus Brinkmann showed that
GnuPG copied a signed file's embedded file name into its machine-readable
status output without escaping it, so a crafted file name could inject
lines that told programs reading the output, such as mail clients and
package scripts, that a valid signature existed when it did not
(CVE-2018-12020, called SigSpoof). And the most common bug needs no
attacker cleverness at all: **`gpg --verify` succeeds if the signature is
good under any key in your keyring.** A build script that imports keys for
several projects into one keyring, then checks `gpg --verify`'s exit
status, accepts a release of project A signed by the maintainer of project
B.

**Break it, fix it.** The keyring trap, with stand-in signatures.

```python
import hashlib, hmac

# Stand-in signatures: each "key" is a secret, and its fingerprint is a hash of it.
def make_key(label):
    secret = hashlib.sha256(label.encode()).digest()
    return hashlib.sha256(secret).hexdigest()[:40], secret

def sign(secret, data):
    return hmac.digest(secret, data, "sha256")

mylib_fpr, mylib_key = make_key("mylib release key")
other_fpr, other_key = make_key("a key imported last year for another project")

# The machine's keyring holds every key anyone ever imported on it.
keyring = {mylib_fpr: mylib_key, other_fpr: other_key}

# BROKEN: "is there a good signature?", which is what gpg's exit status answers
def verify_any(data, sig):
    return any(hmac.compare_digest(sign(k, data), sig) for k in keyring.values())

# FIXED: "is there a good signature by the one key this project releases with?"
MYLIB_RELEASE_KEY = mylib_fpr        # pinned in the build script, by full fingerprint
def verify_pinned(data, sig):
    key = keyring.get(MYLIB_RELEASE_KEY)
    return key is not None and hmac.compare_digest(sign(key, data), sig)

real = b"mylib-1.4.tar.gz contents"
fake = b"mylib-1.4.tar.gz with a backdoor"
fake_sig = sign(other_key, fake)     # signed by whoever holds the other key

print("any key:   real", verify_any(real, sign(mylib_key, real)), " fake", verify_any(fake, fake_sig))
print("pinned:    real", verify_pinned(real, sign(mylib_key, real)), " fake", verify_pinned(fake, fake_sig))
```

```text
any key:   real True  fake True
pinned:    real True  fake False
```

With GnuPG the fixed version is `gpgv --keyring ./mylib-release.gpg`, a
keyring file holding exactly one key that is committed to the build
repository, or parsing `--status-fd` output for the `VALIDSIG` line and
comparing its full fingerprint with the pinned one.

### signify and minisign

In 2014 Ted Unangst wrote **signify** for OpenBSD, which used it to sign
the 5.5 release that May. The design is a reaction to all of the above.
There is one algorithm, Ed25519, and no options. A key is a short Base64
line. There are no user IDs, no web of trust, no key servers, no expiry
dates, no subkeys and no trust database. Trust is carried by the release
itself: each OpenBSD release ships, in its base system, the public keys
that will sign the next release, so a user who installed one release
correctly can verify the next one with no outside help, and a fresh key
pair is used for each release. To sign a release with many files, signify
signs a single `SHA256` list of the files' hashes, and `signify -C` checks
the signature on the list and then each file's hash. The installer and
the upgrade tool check them automatically.

**minisign**, written by Frank Denis in 2015, uses the same Ed25519 keys and
a compatible format, and adds two things. A signature carries a **trusted
comment**, a line (by default the file name and a timestamp) that is signed
together with the file, so it cannot be changed, next to an untrusted
comment that can. And for large files minisign signs a BLAKE2b-512 hash of
the file (the "prehashed" mode, which recent versions use by default)
rather than the file itself, so signing a 10 GB image does not need the
whole image in memory; the cost is that prehashed signatures cannot be
checked by signify.

!!! note "Life story: signify"
    **Born:** 2014, by Ted Unangst for OpenBSD; first used for OpenBSD 5.5
    (May 2014) · **Purpose:** sign releases and packages with one
    algorithm (Ed25519), short keys, and no key servers or web of trust ·
    **Helped:** gave OpenBSD verified installs and upgrades, with each
    release carrying the keys for the next; inspired minisign (2015) and
    many small release-signing tools · **Status:** in use in OpenBSD and
    ported to other systems; the model of "sign with as few features as
    possible"

The lesson of signify is not only "use simpler tools". It is that the
**trust root travels with the software**. An OpenBSD user never has to
answer "is this really the project's key?" more than once, at first
install; after that, each release vouches for the keys of the next. The
same idea appears in Android's v3 proof of rotation, in TUF's root
rotation (§16.9), and in the Mars rover's key chain in §16.11.

The weakness all release-signing schemes share is that the key is held by
a person or a machine, and is valid until someone notices it was stolen.
A stolen GPG release key can sign anything, and nothing tells the world it
was used. That is the problem the next two sections attack.

What to do:

- Verify against one pinned key, by full fingerprint or by the key itself,
  never against "any key in the keyring".
- For new projects, sign releases with signify or minisign (or Sigstore,
  §16.7) rather than OpenPGP, and publish the public key in the
  repository and in the previous release.
- Sign a hash list for multi-file releases, and check each file against it.
- Plan the next key now: have the current key sign the next one, and ship
  the next public key in the current release.

## 16.6 Transparency logs

*Level: intermediate.*

A signing key used in secret is the attack every scheme above fails
against. If a CA's key, a vendor's code-signing key or a maintainer's
release key signs something for an attacker, the victim sees a valid
signature and nobody else sees anything. **Transparency** turns secret use
into public use: every signature that a client will accept must first be
entered in a public, append-only log, so that the owner of a key can watch
the log and see every signature made with it, including the ones they did
not make.

Certificate Transparency did this for the web's certificates, and the
cryptography book tells that story in
[§16.6 of Chapter 16](../../book/16-PKI-and-Key-Establishment.md#166-certificate-transparency),
with the CT roles in
[Protocols §2.8](../protocols/02-Certificates-and-PKI.md#28-certificate-transparency);
it also has a first, recursive version of the inclusion proof. This
section takes the log itself further, because software transparency
(Sigstore's Rekor, Go's checksum database) uses exactly the same
structure, and because the details are where bugs live.

A log is a **Merkle tree** over its entries, defined in RFC 9162 (2021,
Certificate Transparency version 2.0, which replaced RFC 6962 of 2013).
The log publishes, every so often, a **signed tree head** (also called a
**checkpoint**): its size $n$ and its root hash, signed with the log's key.
Two proofs make the log checkable by anyone holding only signed tree heads:

- an **inclusion proof** shows that entry number $m$ is in the tree of size
  $n$: the $\lceil \log_2 n \rceil$ or so sibling hashes on the path from the
  entry's leaf to the root;
- a **consistency proof** shows that the tree of size $n_2$ extends the
  tree of size $n_1$ without changing any of its first $n_1$ entries.

A log that removed or changed an entry, or that showed one history to some
users and another to others (a **split view**), would have to sign two
tree heads that no consistency proof can connect. Anyone who holds both
signed heads holds proof that the log misbehaved.

### The tree, exactly

RFC 9162 defines the Merkle Tree Hash of a list of entries $D_0, \dots,
D_{n-1}$ recursively. With $k$ the largest power of two smaller than $n$,

$$
\mathrm{MTH}(\{D_0\}) = H(\mathtt{0x00} \,\|\, D_0), \qquad
\mathrm{MTH}(D_{0:n}) = H(\mathtt{0x01} \,\|\, \mathrm{MTH}(D_{0:k}) \,\|\, \mathrm{MTH}(D_{k:n})),
$$

and the hash of the empty list is $H(\text{empty string})$. The split at the
largest power of two makes the left subtree always complete, which is what
lets a tree grow by appending without changing its old subtrees. The two
prefix bytes, `0x00` for a leaf and `0x01` for an interior node, look like
a detail, and they are what the break below is about.

By hand, for four entries $a, b, c, d$: the leaves are $\ell_a = H(0x00\|a)$
and so on; the two interior nodes are $n_{ab} = H(0x01\|\ell_a\|\ell_b)$ and
$n_{cd} = H(0x01\|\ell_c\|\ell_d)$; the root is $H(0x01\|n_{ab}\|n_{cd})$. The
inclusion proof for $c$ (index 2) is $[\ell_d, n_{ab}]$: the verifier
computes $n_{cd}$ from $\ell_c$ and $\ell_d$, then the root from $n_{ab}$
and $n_{cd}$, and compares. With eight entries the proof for entry 5 is
three hashes (Figure 16.3); with a billion entries it is 30 hashes, 960
bytes.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A Merkle tree of eight entries. The inclusion proof for entry 5 is the leaf hash of entry 4, the node over entries 6 and 7, and the node over entries 0 to 3; the verifier recomputes the nodes on the path to the root" fill="currentColor" font-size="14">
<line x1="320" y1="44" x2="168" y2="96" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="44" x2="472" y2="96" stroke="currentColor" stroke-width="1.2"/>
<line x1="168" y1="114" x2="92" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="168" y1="114" x2="244" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="472" y1="114" x2="396" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="472" y1="114" x2="548" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="92" y1="178" x2="54" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="92" y1="178" x2="130" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="244" y1="178" x2="206" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="244" y1="178" x2="282" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="396" y1="178" x2="358" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="396" y1="178" x2="434" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="548" y1="178" x2="510" y2="222" stroke="currentColor" stroke-width="1.2"/>
<line x1="548" y1="178" x2="586" y2="222" stroke="currentColor" stroke-width="1.2"/>
<rect x="280" y="22" width="80" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="320" y="39" text-anchor="middle" font-size="13">root</text>
<rect x="128" y="94" width="80" height="24" rx="4" fill="currentColor" opacity="0.18"/>
<rect x="128" y="94" width="80" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="168" y="111" text-anchor="middle" font-size="13">0..3</text>
<rect x="432" y="94" width="80" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="472" y="111" text-anchor="middle" font-size="13">4..7</text>
<rect x="62" y="158" width="60" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="92" y="174" text-anchor="middle" font-size="12">0,1</text>
<rect x="214" y="158" width="60" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="244" y="174" text-anchor="middle" font-size="12">2,3</text>
<rect x="366" y="158" width="60" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="396" y="174" text-anchor="middle" font-size="12">4,5</text>
<rect x="518" y="158" width="60" height="22" rx="4" fill="currentColor" opacity="0.18"/>
<rect x="518" y="158" width="60" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="548" y="174" text-anchor="middle" font-size="12">6,7</text>
<rect x="34" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="54" y="237" text-anchor="middle" font-size="12">0</text>
<rect x="110" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="130" y="237" text-anchor="middle" font-size="12">1</text>
<rect x="186" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="206" y="237" text-anchor="middle" font-size="12">2</text>
<rect x="262" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="282" y="237" text-anchor="middle" font-size="12">3</text>
<rect x="338" y="220" width="40" height="24" rx="3" fill="currentColor" opacity="0.18"/>
<rect x="338" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="358" y="237" text-anchor="middle" font-size="12">4</text>
<rect x="414" y="220" width="40" height="24" rx="3" fill="currentColor" opacity="0.45"/>
<rect x="414" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="434" y="237" text-anchor="middle" font-size="12" font-weight="bold">5</text>
<rect x="490" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="510" y="237" text-anchor="middle" font-size="12">6</text>
<rect x="566" y="220" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="586" y="237" text-anchor="middle" font-size="12">7</text>
<rect x="40" y="262" width="16" height="14" fill="currentColor" opacity="0.45"/>
<text x="62" y="274" font-size="12">entry being proved</text>
<rect x="200" y="262" width="16" height="14" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="2"/>
<text x="222" y="274" font-size="12">the proof: 3 hashes the log sends</text>
<rect x="440" y="262" width="16" height="14" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="462" y="274" font-size="12">computed by the verifier</text>
</svg>
<figcaption>Figure 16.3. An inclusion proof in a log of eight entries. To prove entry 5, the log sends three hashes; the verifier recomputes the dashed nodes and compares the root with the signed tree head.</figcaption>
</figure>

**Code it.** The tree hash, both proofs, and both verification
algorithms, written to follow RFC 9162 sections 2.1.1 to 2.1.4 line by
line. The proof-building functions are the RFC's recursive definitions;
the verifiers are its iterative algorithms, which are what a client
actually runs, since a client has the proof but not the tree. The test
entries are the eight used by the reference code of RFC 6962, whose
8-entry root is published.

```python
import hashlib

def H(b):
    return hashlib.sha256(b).digest()

def leaf_hash(entry):                 # RFC 9162: 0x00 in front of every leaf
    return H(b"\x00" + entry)

def node_hash(left, right):           # and 0x01 in front of every interior node
    return H(b"\x01" + left + right)

def split(n):                         # the largest power of two smaller than n
    k = 1
    while k * 2 < n:
        k *= 2
    return k

def mth(D):                           # Merkle Tree Hash, section 2.1.1
    if len(D) == 0:
        return H(b"")
    if len(D) == 1:
        return leaf_hash(D[0])
    k = split(len(D))
    return node_hash(mth(D[:k]), mth(D[k:]))

def inclusion_proof(m, D):            # PATH(m, D), section 2.1.3.1
    if len(D) <= 1:
        return []
    k = split(len(D))
    if m < k:
        return inclusion_proof(m, D[:k]) + [mth(D[k:])]
    return inclusion_proof(m - k, D[k:]) + [mth(D[:k])]

def verify_inclusion(index, size, entry_hash, proof, root):     # section 2.1.3.2
    if index >= size:
        return False
    fn, sn, r = index, size - 1, entry_hash
    for p in proof:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = node_hash(p, r)
            if not fn & 1:
                while fn and not fn & 1:
                    fn, sn = fn >> 1, sn >> 1
        else:
            r = node_hash(r, p)
        fn, sn = fn >> 1, sn >> 1
    return sn == 0 and r == root

def consistency_proof(m, D, whole=True):                        # SUBPROOF, section 2.1.4.1
    n = len(D)
    if m == n:
        return [] if whole else [mth(D)]
    k = split(n)
    if m <= k:
        return consistency_proof(m, D[:k], whole) + [mth(D[k:])]
    return consistency_proof(m - k, D[k:], False) + [mth(D[:k])]

def verify_consistency(first, second, first_root, second_root, proof):   # section 2.1.4.2
    if first == second:
        return not proof and first_root == second_root
    if not proof or first == 0 or first > second:
        return False
    if first & (first - 1) == 0:      # first is a power of two: its root starts the path
        proof = [first_root] + proof
    fn, sn = first - 1, second - 1
    while fn & 1:
        fn, sn = fn >> 1, sn >> 1
    fr = sr = proof[0]
    for c in proof[1:]:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            fr, sr = node_hash(c, fr), node_hash(c, sr)
            if not fn & 1:
                while fn and not fn & 1:
                    fn, sn = fn >> 1, sn >> 1
        else:
            sr = node_hash(sr, c)
        fn, sn = fn >> 1, sn >> 1
    return sn == 0 and fr == first_root and sr == second_root

# The eight test entries used by the RFC 6962 reference code and its tests
D = [bytes.fromhex(x) for x in ("", "00", "10", "2021", "3031", "40414243",
     "5051525354555657", "606162636465666768696a6b6c6d6e6f")]
print(mth(D).hex())

ok = 0
for n in range(1, 9):
    for m in range(n):
        ok += verify_inclusion(m, n, leaf_hash(D[m]), inclusion_proof(m, D[:n]), mth(D[:n]))
    for m in range(1, n + 1):
        ok += verify_consistency(m, n, mth(D[:m]), mth(D[:n]), consistency_proof(m, D[:n]))
print("proofs that verify:", ok, "of", 36 + 36)

proof = inclusion_proof(5, D)
print("proof for entry 5 of 8:", len(proof), "hashes")
print("wrong entry:", verify_inclusion(5, 8, leaf_hash(b"evil"), proof, mth(D)))
print("wrong index:", verify_inclusion(4, 8, leaf_hash(D[5]), proof, mth(D)))
forked = D[:3] + [b"rewritten"] + D[4:]
print("forked history:", verify_consistency(4, 8, mth(D[:4]), mth(forked),
                                            consistency_proof(4, forked)))
```

```text
5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328
proofs that verify: 72 of 72
proof for entry 5 of 8: 3 hashes
wrong entry: False
wrong index: False
forked history: False
```

The root matches the published value for the reference tree, every one of
the 36 inclusion proofs and 36 consistency proofs for trees of one to
eight entries verifies, and the three attacks fail: a different entry, the
right entry claimed at the wrong position, and a log that rewrote entry 3
and then tried to prove that its new tree extends the old one.

The bit-shifting in the verifiers walks up the tree without building it:
`fn` is the entry's position at the current level and `sn` the position of
the last entry. When `fn` is odd, or is the last node at its level, the
proof hash is a left sibling; otherwise a right one. The inner loop skips
levels where a node at the right edge has no sibling (the tree of seven
entries has such a node). The final checks `sn == 0` matter: they make
sure the proof had exactly the right length for the claimed size, so a
proof cannot be borrowed from a smaller tree.

### Break it: why the prefix bytes are there

Early Merkle-tree code often hashed leaves and interior nodes the same way.
Then an interior node's input, the 64 bytes of its two children, is also a
perfectly good leaf input, and a different list of entries can have the
same root.

```python
import hashlib

def H(b):
    return hashlib.sha256(b).digest()

def split(n):
    k = 1
    while k * 2 < n:
        k *= 2
    return k

def root_no_prefix(D):            # BROKEN: leaves and nodes hashed the same way
    if len(D) == 1:
        return H(D[0])
    k = split(len(D))
    return H(root_no_prefix(D[:k]) + root_no_prefix(D[k:]))

def root_rfc9162(D):              # FIXED: 0x00 for leaves, 0x01 for nodes
    if len(D) == 1:
        return H(b"\x00" + D[0])
    k = split(len(D))
    return H(b"\x01" + root_rfc9162(D[:k]) + root_rfc9162(D[k:]))

log = [b"openssl 3.0.15", b"zlib 1.3.1", b"xz 5.4.6", b"curl 8.10.1"]

# Two "entries", each the 64 bytes of an interior node's two children
fake = [H(log[0]) + H(log[1]), H(log[2]) + H(log[3])]
print("no prefixes, same root:", root_no_prefix(log) == root_no_prefix(fake))

fake = [H(b"\x00" + log[0]) + H(b"\x00" + log[1]), H(b"\x00" + log[2]) + H(b"\x00" + log[3])]
print("RFC 9162, same root:  ", root_rfc9162(log) == root_rfc9162(fake))
```

```text
no prefixes, same root: True
RFC 9162, same root:   False
```

Without prefixes, a log of four packages and a log of two meaningless
64-byte entries share a root, so a signed root no longer pins down what is
in the log, and a verifier that takes the tree size from the proof rather
than from the signed tree head can be shown an "entry" that was never
logged. With the prefixes, a leaf hash and a node hash are computed over
inputs that start with different bytes, and finding a collision between
them is as hard as finding a SHA-256 collision. Bitcoin's transaction
tree lacks this separation, and a 64-byte transaction can pose as an
interior node, a weakness that light clients have had to work around.
The lesson is the one [Chapter 2](02-Bytes-Encodings-and-Text.md) teaches
for every encoding: two different structures must never produce the same
bytes to be hashed.

### Who checks the checkers

Proofs show a log is consistent with what it signed. They cannot show that
it told everyone the same thing. A log could keep two trees and show one
to the victim and the other to the monitors, and each would be internally
consistent. Defeating a split view needs someone to compare the tree heads
that different users see. CT expected browsers to "gossip" tree heads, and
that was never deployed widely. Software logs now use **witnesses**:
independent services that fetch each new checkpoint, check a consistency
proof from the last one they saw, and cosign it. A client accepts a
checkpoint only if enough witnesses cosigned it, so a split view would have
to fool the witnesses too, in public.

Go's **checksum database**, `sum.golang.org`, launched with Go 1.13 in
2019, applies all of this to a package ecosystem. Every Go module version
ever fetched through the public proxy is recorded, as a hash of its
contents, in a transparency log; the `go` command checks each module it
downloads against the log, with an inclusion proof, and keeps the latest
tree head it has seen so that it can demand a consistency proof next time.
A module author who re-tags a release with different code, or a proxy that
serves different code to different users, is caught, because the log has
already recorded what that version was.

What to do:

- If you build a Merkle log, use RFC 9162's hashing exactly, with the
  `0x00` and `0x01` prefixes, and take the tree size only from a signed
  tree head.
- Clients should store the newest tree head they have seen and require a
  consistency proof from it to any newer one.
- Owners of signing keys should monitor the logs for every use of their
  keys and identities; transparency without monitoring is only a record.
- Prefer logs with independent witnesses, and check a quorum of witness
  cosignatures where the ecosystem provides them.

## 16.7 Sigstore: signing without keeping a key

*Level: intermediate.*

Most open-source software was never signed at all, and the reason was
keys. A signing key has to be generated, protected, backed up, rotated,
revoked when lost and published where users can find it, by volunteers,
for years. **Sigstore** removes the long-lived key. It was announced on
9 March 2021 as a Linux Foundation project started by Red Hat, Google and
Purdue University, and its public services reached general availability on
25 October 2022. It has three main parts:

- **Fulcio**, a certificate authority that issues **short-lived
  certificates** (valid for ten minutes) binding a freshly generated
  public key to an **identity** proved with an OpenID Connect token: an
  email address proved by signing in to Google, GitHub or Microsoft, or,
  for automated builds, the identity of a CI workflow, such as the GitHub
  Actions workflow `release.yml` in a given repository at a given Git ref;
- **Rekor**, a transparency log, a Merkle tree like the one in §16.6, in
  which every signature is recorded with the certificate and the time;
- **cosign** and the other clients (sigstore-python, sigstore-js,
  sigstore-go), which do the signing and the verification.

Signing (Figure 16.4) runs like this. The client generates a key pair in
memory. It obtains an OIDC token for the signer, from a browser login or
from the CI system, and sends the token and the public key to Fulcio,
proving possession of the private key by signing the token's subject.
Fulcio checks the token and returns a certificate whose subject
alternative name is the identity, issued for ten minutes and itself
logged in a Certificate Transparency log. The client signs the artifact,
submits the signature and the certificate to Rekor, receives a signed
entry with an inclusion proof, and throws the private key away. The output
is a **bundle**: certificate, signature and log proof.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Sigstore keyless signing: the signer gets an identity token, Fulcio issues a ten-minute certificate for an ephemeral key, the signature is recorded in Rekor, and the verifier checks the certificate, the identity and the log entry" fill="currentColor" font-size="14">
<rect x="10" y="100" width="120" height="60" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="70" y="125" text-anchor="middle">signer / CI</text>
<text x="70" y="145" text-anchor="middle" font-size="12">ephemeral key</text>
<rect x="190" y="10" width="140" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="32" text-anchor="middle">OIDC provider</text>
<text x="260" y="50" text-anchor="middle" font-size="12">GitHub, Google...</text>
<rect x="190" y="105" width="140" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="127" text-anchor="middle">Fulcio</text>
<text x="260" y="145" text-anchor="middle" font-size="12">10-minute certificate</text>
<rect x="190" y="200" width="140" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="222" text-anchor="middle">Rekor</text>
<text x="260" y="240" text-anchor="middle" font-size="12">transparency log</text>
<line x1="130" y1="110" x2="182" y2="45" stroke="currentColor" stroke-width="1.3"/>
<polygon points="188,38 177,43 185,50" fill="currentColor"/>
<text x="96" y="70" font-size="12">1. token</text>
<line x1="130" y1="130" x2="182" y2="130" stroke="currentColor" stroke-width="1.3"/>
<polygon points="190,130 180,125 180,135" fill="currentColor"/>
<text x="137" y="122" font-size="12">2. key</text>
<line x1="130" y1="150" x2="182" y2="215" stroke="currentColor" stroke-width="1.3"/>
<polygon points="188,222 177,217 184,210" fill="currentColor"/>
<text x="56" y="200" font-size="12">3. signature</text>
<rect x="390" y="95" width="110" height="70" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="390" y="95" width="110" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="445" y="117" text-anchor="middle">bundle</text>
<text x="445" y="135" text-anchor="middle" font-size="12">cert + signature</text>
<text x="445" y="152" text-anchor="middle" font-size="12">+ log proof</text>
<line x1="330" y1="130" x2="382" y2="130" stroke="currentColor" stroke-width="1.3"/>
<polygon points="390,130 380,125 380,135" fill="currentColor"/>
<line x1="330" y1="225" x2="420" y2="170" stroke="currentColor" stroke-width="1.3"/>
<polygon points="426,166 415,167 420,175" fill="currentColor"/>
<rect x="540" y="95" width="90" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="585" y="122" text-anchor="middle">verifier</text>
<text x="585" y="142" text-anchor="middle" font-size="12">who? which</text>
<text x="585" y="156" text-anchor="middle" font-size="12">issuer? logged?</text>
<line x1="500" y1="130" x2="532" y2="130" stroke="currentColor" stroke-width="1.3"/>
<polygon points="540,130 530,125 530,135" fill="currentColor"/>
<text x="470" y="40" text-anchor="middle" font-size="12">trust root (Fulcio and</text>
<text x="470" y="56" text-anchor="middle" font-size="12">Rekor keys) arrives by TUF</text>
<line x1="540" y1="60" x2="575" y2="88" stroke="currentColor" stroke-dasharray="3 3"/>
</svg>
<figcaption>Figure 16.4. Sigstore's keyless signing. The private key lives for one signature; what persists is an identity in a certificate and a public log entry that proves when the signature was made.</figcaption>
</figure>

The log is what makes a ten-minute certificate useful for years. A
verifier next year cannot check that the certificate was valid "now"; it
checks that the signature was entered in Rekor **while** the certificate
was valid, using the log's signed timestamp, which plays the part of
Authenticode's timestamp countersignature. And because every signature is
public, the owner of an identity can watch Rekor for signatures made in
their name that they did not make.

"Keyless" does not mean there is nothing to steal. It moves the target:
whoever controls the identity can sign. For a person that is their GitHub
or Google account, ideally protected by a passkey; for a CI workflow it is
the repository and the workflow, so anyone who can push a change to the
release workflow, or run it on a malicious ref, can obtain a valid
certificate. Sigstore makes that signature public, which is a large
improvement on a stolen GPG key that signs in silence. It cannot make it
invalid.

The verifier must also know which Fulcio and Rekor keys to trust, and
those keys must be replaceable. Sigstore distributes its trust root with
The Update Framework (§16.9), from a root signed in a public key ceremony
in June 2021 by keyholders using hardware tokens, and rotated in later
ceremonies.

**Break it, fix it.** The verifier that checks everything except the one
thing that matters. A bundle from Sigstore proves that *someone* with an
OIDC identity signed the artifact. Any GitHub user can produce one. A
verifier that checks the certificate chain, the signature and the log
entry, and never compares the identity with the expected one, accepts the
attacker's signature as readily as the project's.

```python
import hashlib, hmac, secrets

# Stand-ins: Fulcio and Rekor "sign" with HMAC keys from the trust root, and the
# ephemeral key is an HMAC key carried in the certificate. Real Sigstore uses
# ECDSA throughout; this block is about what the verifier checks, not how.
FULCIO, REKOR = secrets.token_bytes(32), secrets.token_bytes(32)
mac = lambda key, *parts: hmac.digest(key, b"|".join(p.encode() if isinstance(p, str) else p
                                                    for p in parts), "sha256")

def keyless_sign(identity, issuer, artifact, now):
    eph = secrets.token_bytes(32)                       # lives for one signature
    cert = {"san": identity, "issuer": issuer, "from": now, "to": now + 600, "key": eph}
    cert_sig = mac(FULCIO, identity, issuer, str(now), str(now + 600), eph)
    sig = mac(eph, artifact)
    entry = {"time": now + 2, "sig": sig}               # Rekor records when it saw it
    return {"cert": cert, "cert_sig": cert_sig, "sig": sig, "entry": entry,
            "entry_sig": mac(REKOR, str(entry["time"]), sig)}

def crypto_ok(b, artifact):
    c, e = b["cert"], b["entry"]
    return (hmac.compare_digest(b["cert_sig"], mac(FULCIO, c["san"], c["issuer"],
                                str(c["from"]), str(c["to"]), c["key"]))
            and hmac.compare_digest(b["sig"], mac(c["key"], artifact))
            and hmac.compare_digest(b["entry_sig"], mac(REKOR, str(e["time"]), e["sig"]))
            and e["sig"] == b["sig"] and c["from"] <= e["time"] <= c["to"])

def verify_broken(b, artifact):                         # "signed by Sigstore": by anyone
    return crypto_ok(b, artifact)

GH = "https://token.actions.githubusercontent.com"
WANT = "https://github.com/mylib/mylib/.github/workflows/release.yml@refs/tags/"
def verify_fixed(b, artifact):                          # signed by *our* release workflow
    c = b["cert"]
    return crypto_ok(b, artifact) and c["issuer"] == GH and c["san"].startswith(WANT)

good = b"mylib-1.4.tar.gz"
evil = b"mylib-1.4.tar.gz with a backdoor"
real = keyless_sign(WANT + "v1.4", GH, good, now=1_730_000_000)
fake = keyless_sign("https://github.com/mallory/mylib/.github/workflows/release.yml@refs/tags/v1.4",
                    GH, evil, now=1_730_000_100)
print("broken: real", verify_broken(real, good), " fake", verify_broken(fake, evil))
print("fixed:  real", verify_fixed(real, good), " fake", verify_fixed(fake, evil))
```

```text
broken: real True  fake True
fixed:  real True  fake False
```

This is why `cosign verify` refuses to run without
`--certificate-identity` (or a regular expression for it) and
`--certificate-oidc-issuer`: the identity and the issuer are the policy.
Note that the fixed check pins the issuer as well as the name. The same
email address proved by two different providers is two different
identities, and an identity string is meaningful only together with the
issuer that vouched for it.

!!! note "Life story: Sigstore"
    **Born:** announced 9 March 2021 by the Linux Foundation, with Red Hat,
    Google and Purdue University; Fulcio and Rekor generally available 25
    October 2022 · **Purpose:** let anyone sign software without managing
    a long-lived key, by tying short-lived certificates to OIDC identities
    and logging every signature publicly · **Helped:** npm provenance
    (2023), PyPI attestations (2024), the signing of Kubernetes and CPython
    releases, GitHub's artifact attestations (2024) · **Status:** in wide
    use; an OpenSSF project; the public-good instance is free, and
    organizations can run private instances

What to do:

- When you verify a Sigstore bundle, always pin the expected identity and
  the OIDC issuer, as narrowly as you can (the workflow file and a tag
  pattern, not "anything in this organization").
- Protect what now holds the signing power: the release workflow (require
  review for changes to it, restrict which refs can trigger it) and the
  maintainers' accounts (passkeys).
- Monitor Rekor for signatures under your identities.
- Keep the trust root updated through the client's TUF mechanism; never
  copy Fulcio or Rekor keys into your code by hand.

## 16.8 Reproducible builds and provenance

*Level: intermediate.*

Everything so far protects the path from the signer to the user. The path
from the source code to the signed binary is still a matter of trust: the
binary is whatever the build machine produced, and SolarWinds showed what a
build machine can produce. In his Turing Award lecture, "Reflections on
Trusting Trust" (given in 1983, published in 1984), Ken Thompson described a C compiler modified to insert a
backdoor into the login program, and to insert the same modification into
any new compiler built from clean source, so that the attack survived in
binaries with no trace in any source code. His conclusion was that you
cannot trust code you did not totally create yourself.

The practical answer is to make the build checkable. A build is
**reproducible** if anyone who builds the same source with the same tools
gets **bit-for-bit identical** output. Then a binary's correspondence to
its source is no longer a claim by the build server but a fact anyone can
test: several independent parties build, compare hashes, and a build server
that inserted something is caught by the first rebuild that disagrees.

The idea had been practiced for years in small places (Bitcoin Core's
releases were built with the deterministic Gitian system from 2011, and
Mike Perry made the Tor Browser build reproducible in 2013, partly out of
concern that its build machines could be targeted), but it became an
engineering movement in Debian. Work began there in 2013, led by Jérémy
Bobbio (known as Lunar), and grew into a project across distributions; in
2015 Lunar and Holger Levsen presented it at FOSDEM ("Stretching out for
trustworthy reproducible builds") and Lunar at the Chaos Communication
Camp, showing the causes of irreproducibility one by one. The causes are
mundane:

- **time**: timestamps embedded by compilers, archivers, documentation
  tools and gzip headers;
- **order**: files listed in the order the file system returns them, hash
  tables iterated in random order;
- **environment**: the build path, the user name, the locale, the time
  zone, the number of processor cores;
- **randomness**: temporary names and seeds that end up in the output.

The fixes became conventions. The most widely adopted is
**SOURCE_DATE_EPOCH** (specified by the project in 2015): an environment
variable holding one timestamp, usually that of the last source change,
which every tool uses instead of the current time. Builds record their
environment in a `.buildinfo` file, so that a rebuilder can recreate it.
By 2025 about 97% of the source packages of Debian 13 "trixie" for amd64
were reproducible in the project's continuous tests, and from 2024 the
service `reproduce.debian.net` went further, rebuilding the packages that
Debian actually distributes and comparing them with the published files.

**Code it, break it, fix it.** A release tarball built twice from the same
source. The broken build takes the time from the clock and the file order
from the disk; the fixed one takes both from the source.

```python
import gzip, hashlib, io, random, tarfile, time

SOURCES = {"mylib/__init__.py": b"VERSION = '1.4'\n",
           "mylib/core.py": b"def f(x):\n    return x + 1\n",
           "README": b"mylib\n"}

def build(files, mtime, order, gzip_mtime):
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.PAX_FORMAT) as tar:
        for name in order:
            info = tarfile.TarInfo(name)
            info.size, info.mtime, info.mode = len(files[name]), mtime, 0o644
            tar.addfile(info, io.BytesIO(files[name]))
    return gzip.compress(raw.getvalue(), mtime=gzip_mtime)

def broken_build():                   # BROKEN: today's clock, the file system's order
    names = list(SOURCES)
    random.shuffle(names)             # stands in for directory order on disk
    now = time.time() + random.random()
    return build(SOURCES, now, names, gzip_mtime=now)

SOURCE_DATE_EPOCH = 1_700_000_000     # e.g. the time of the release commit

def fixed_build():                    # FIXED: fixed time, sorted names
    return build(SOURCES, SOURCE_DATE_EPOCH, sorted(SOURCES), gzip_mtime=SOURCE_DATE_EPOCH)

h = lambda b: hashlib.sha256(b).hexdigest()
print("broken builds agree:", h(broken_build()) == h(broken_build()))
print("fixed builds agree: ", h(fixed_build()) == h(fixed_build()))
```

```text
broken builds agree: False
fixed builds agree:  True
```

The program prints only whether the hashes agree, not the hashes
themselves, and that hides a lesson: the compressed bytes depend on the
version of zlib that Python was built with, so the fixed build is
reproducible on machines that share it. The compressor is part of the
build environment, which is exactly why `.buildinfo` files record tool
versions.

Reproducibility would have changed the xz story. The backdoor's trigger
was in a build script, `build-to-host.m4`, that existed in the release
tarball and not in the Git repository. A distribution that built from the
Git tag, or that regenerated the tarball from the tag and compared, would
have found a file that the source did not contain. After xz, several
distributions discussed building from repository tags rather than
uploaded tarballs, and some packagers switched, for exactly this reason.

### Provenance and SLSA

When not everyone can rebuild, the next best thing is a signed record of
**how** a binary was built: from which source repository and commit, by
which builder, with which steps and inputs. Such a record is called
**provenance**, and the in-toto project (Santiago Torres-Arias and others,
USENIX Security 2019) defined a general format for signed statements
about artifacts, called **attestations**, that npm provenance and PyPI's
PEP 740 attestations use.

**SLSA** ("Supply-chain Levels for Software Artifacts", pronounced
"salsa"), introduced by Google in June 2021 and now an OpenSSF project,
grades how much a provenance statement can be trusted. Version 1.0 (April
2023) defines a **Build track** with levels:

- **Build L1**: provenance exists, describing how the artifact was built.
  It catches mistakes, not attackers.
- **Build L2**: the build ran on a hosted build platform, which signed the
  provenance itself. Forging it needs an attack on the platform.
- **Build L3**: the platform is hardened: builds are isolated from each
  other, and the provenance signing key is out of reach of the build's own
  steps, so even a malicious build script cannot forge where it came from.

SLSA is honest about its scope. Build L3 is aimed squarely at the
SolarWinds attack, a compromised build that ships in the vendor's name, and
makes it harder, but a build platform that is itself compromised still
produces genuine-looking provenance. And provenance says nothing about the
source being good: xz's malicious tarball was built by its maintainer on
his own machine, which SLSA would have graded as at most L1, a useful
warning sign, but a backdoor committed to the repository and built on a
hardened platform would get a perfect score.

!!! note "Life story: the Reproducible Builds project"
    **Born:** 2013 in Debian, started by Jérémy Bobbio (Lunar), joined by
    Holger Levsen and many others; became a cross-distribution project
    with reproducible-builds.org · **Purpose:** make every build
    bit-for-bit repeatable, so that anyone can check that a binary came
    from its source · **Helped:** SOURCE_DATE_EPOCH (2015), the diffoscope
    tool for finding why two builds differ, about 97% reproducibility in
    Debian 13 on amd64, reproducible packages in Arch, NixOS, Guix, Tor
    Browser and others · **Status:** active; the remaining hard cases are
    large ecosystems (compilers, Java, documentation tools) and getting
    users to rebuild and compare, not only to be able to

What to do:

- Make your builds reproducible: set SOURCE_DATE_EPOCH, sort file lists,
  strip build paths, pin tool versions, and test by building twice on
  different machines and comparing hashes.
- Build releases on a hosted platform from a tagged commit, never on a
  maintainer's laptop, and publish signed provenance (aim for SLSA Build
  L3 where the platform offers it).
- Build from the repository, not from a separately uploaded tarball, or
  compare the two.
- When you consume software, prefer packages with provenance and check it
  against the repository you expect, as with identities in §16.7.

## 16.9 Update frameworks: TUF and Uptane

*Level: intermediate.*

In 2008 Justin Cappos and colleagues at the University of Arizona looked at
how ten popular package managers handled a hostile mirror ("A look in the
mirror: attacks on package managers", ACM CCS 2008). Many signed their
packages or their metadata, and every one of them could still be attacked:
a mirror could serve old metadata, hold back updates, or send endless data.
The attacks that a valid signature does not stop have names:

- **Rollback**: serving older, validly signed metadata or files, to bring
  back a version with a known hole (the Break it of §16.2).
- **Freeze** (indefinite freeze): serving the same old metadata forever, so
  that the client never learns of a new version. Each file is genuine.
- **Mix-and-match**: combining metadata from different moments, so that
  the client sees a combination of versions that never existed together.
- **Endless data** and **slow retrieval**: wasting the client's resources
  or keeping an update from ever finishing.
- **Key compromise**: any one signing key stolen, which should not mean
  the whole system is lost.

**The Update Framework** (TUF), published by Justin Samuel, Nick
Mathewson, Justin Cappos and Roger Dingledine at ACM CCS 2010 ("Survivable
key compromise in software update systems"), and grown out of Thandy, the
updater the Tor Project built, answers all of them by splitting the
signing into **roles** with separate keys, each signing a small piece of
metadata with a version number and an expiry date (Figure 16.5):

- **root** lists the keys trusted for every role and how many signatures
  each role needs (a threshold). It is signed by a threshold of root keys
  kept offline, and it changes rarely. A new root must be signed by a
  threshold of both the old and the new root keys, so trust is carried
  from one root to the next, as signify carries it from one release to
  the next.
- **targets** lists the files (targets) with their hashes and lengths. It
  can **delegate** parts of the namespace to other roles, such as one per
  project, so that a project's key can sign only its own files.
- **snapshot** lists the current version of every targets metadata file,
  so that the client sees one consistent state of the repository
  (stopping mix-and-match).
- **timestamp** names the current snapshot and has a short expiry, often a
  day. It is re-signed frequently by an online key, so a client that
  receives an expired timestamp knows it is being frozen.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The four TUF roles: root, signed offline, names the keys of timestamp, snapshot and targets; timestamp points to snapshot, snapshot to targets, targets to the files, with expiry periods from a day to a year" fill="currentColor" font-size="14">
<rect x="250" y="10" width="140" height="56" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="250" y="10" width="140" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="33" text-anchor="middle" font-weight="bold">root</text>
<text x="320" y="53" text-anchor="middle" font-size="12">offline keys, ~1 year</text>
<rect x="20" y="120" width="140" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="90" y="143" text-anchor="middle" font-weight="bold">timestamp</text>
<text x="90" y="163" text-anchor="middle" font-size="12">online key, ~1 day</text>
<rect x="250" y="120" width="140" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="143" text-anchor="middle" font-weight="bold">snapshot</text>
<text x="320" y="163" text-anchor="middle" font-size="12">~1 week</text>
<rect x="480" y="120" width="140" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="550" y="143" text-anchor="middle" font-weight="bold">targets</text>
<text x="550" y="163" text-anchor="middle" font-size="12">offline, ~3 months</text>
<rect x="480" y="210" width="140" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="550" y="235" text-anchor="middle" font-size="13">files: hash, length</text>
<line x1="280" y1="66" x2="110" y2="114" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="320" y1="66" x2="320" y2="114" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="360" y1="66" x2="530" y2="114" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="470" y="76" font-size="12">names each role's keys</text>
<line x1="160" y1="148" x2="242" y2="148" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,148 240,143 240,153" fill="currentColor"/>
<line x1="390" y1="148" x2="472" y2="148" stroke="currentColor" stroke-width="1.4"/>
<polygon points="480,148 470,143 470,153" fill="currentColor"/>
<line x1="550" y1="176" x2="550" y2="202" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,210 545,200 555,200" fill="currentColor"/>
<text x="205" y="140" text-anchor="middle" font-size="12">hash of</text>
<text x="435" y="140" text-anchor="middle" font-size="12">version of</text>
<text x="200" y="220" text-anchor="middle" font-size="13">every file carries a version and an expiry;</text>
<text x="200" y="240" text-anchor="middle" font-size="13">the client never accepts a lower version</text>
</svg>
<figcaption>Figure 16.5. The TUF roles. Keys that sign often are online and short-lived in effect; keys that matter most are offline and used rarely. A stolen timestamp key can only freeze clients for a day.</figcaption>
</figure>

The split is what makes key compromise survivable. The timestamp key must
be online, so it will one day be stolen, and with it an attacker can at
most replay the current snapshot a little longer. The targets key, which
decides what software exists, is offline. The root keys, which can replace
all the others, are offline, several, and needed in a threshold. The
client's rules are simple: check signatures against the keys root names,
never accept a version lower than one already seen, refuse expired
metadata, and accept only the snapshot the timestamp names and only the
targets the snapshot names.

**Code it.** A tiny TUF-style client with the three online-facing roles
(root's key list is fixed in the code), against a repository that
publishes version 1 on day 100 and version 2 on day 130. The naive client
checks signatures and hashes only; the careful one adds versions, expiry
and the links between the roles.

```python
import hashlib, hmac, json

# Stand-in signatures (HMAC): a real TUF client holds only public keys and
# checks Ed25519 signatures (section 16.2); the checks around them are the point.
KEYS = {"timestamp": b"ts-key", "snapshot": b"snap-key", "targets": b"tgt-key"}
canon = lambda o: json.dumps(o, sort_keys=True, separators=(",", ":")).encode()
sha = lambda b: hashlib.sha256(b).hexdigest()

def signed(role, body):
    return {"signed": body, "sig": hmac.digest(KEYS[role], canon(body), "sha256").hex()}

def publish(v, files, day):          # what the repository signs for release v on a given day
    tg = signed("targets", {"version": v, "expires": day + 90,
                            "files": {n: sha(b) for n, b in files.items()}})
    sn = signed("snapshot", {"version": v, "expires": day + 7, "targets_version": v})
    ts = signed("timestamp", {"version": v, "expires": day + 1,
                              "snapshot_sha256": sha(canon(sn))})
    return ts, sn, tg

class Client:
    def __init__(self, careful):
        self.careful, self.seen = careful, {"timestamp": 0, "snapshot": 0, "targets": 0}

    def check(self, role, md, today):
        body = md["signed"]
        good = hmac.digest(KEYS[role], canon(body), "sha256").hex()
        if not hmac.compare_digest(good, md["sig"]):
            raise ValueError(role + ": bad signature")
        if self.careful and body["version"] < self.seen[role]:
            raise ValueError(role + ": rollback")
        if self.careful and body["expires"] < today:
            raise ValueError(role + ": expired (freeze?)")
        return body

    def update(self, repo, name, blob, today):
        ts, sn, tg = repo
        try:
            t = self.check("timestamp", ts, today)
            if self.careful and sha(canon(sn)) != t["snapshot_sha256"]:
                raise ValueError("snapshot: not the one timestamp names")
            s = self.check("snapshot", sn, today)
            g = self.check("targets", tg, today)
            if self.careful and g["version"] != s["targets_version"]:
                raise ValueError("targets: not the one snapshot names")
            if g["files"].get(name) != sha(blob):
                raise ValueError("target: hash mismatch")
        except ValueError as e:
            return "refused, " + str(e)
        self.seen.update(timestamp=t["version"], snapshot=s["version"], targets=g["version"])
        return "installed " + blob.decode()

v1 = {"app": b"app 1.0 (has a known hole)"}
v2 = {"app": b"app 2.0"}
repo1, repo2 = publish(1, v1, day=100), publish(2, v2, day=130)

for careful in (False, True):
    c = Client(careful)
    mixed = (repo2[0], repo2[1], repo1[2])     # new timestamp and snapshot, old targets
    print("careful" if careful else "naive  ", "| mix:     ", c.update(mixed, "app", v1["app"], today=130))
    print("        | update:  ", c.update(repo2, "app", v2["app"], today=130))
    print("        | rollback:", c.update(repo1, "app", v1["app"], today=131))
    print("        | freeze:  ", c.update(repo2, "app", v2["app"], today=200))
```

```text
naive   | mix:      installed app 1.0 (has a known hole)
        | update:   installed app 2.0
        | rollback: installed app 1.0 (has a known hole)
        | freeze:   installed app 2.0
careful | mix:      refused, targets: not the one snapshot names
        | update:   installed app 2.0
        | rollback: refused, timestamp: rollback
        | freeze:   refused, timestamp: expired (freeze?)
```

Every message the naive client accepted carried valid signatures. The
"freeze" line deserves a second look: on day 200 the naive client happily
installs version 2, which looks like success, but a mirror that keeps
serving day 130's metadata on day 200 is hiding whatever was released in
between, perhaps the fix for a hole in version 2. The careful client cannot
know what it is missing, but it knows that it is missing something,
because the timestamp it was given expired on day 131. What it does next
is policy: retry other mirrors, warn, refuse to run network services. What
it must not do is report "up to date".

A real TUF client does more: it updates root first (walking the chain of
root versions, each signed by the previous), applies signature
thresholds, follows delegations, and limits how many bytes it will
download for each file (endless data). The reference implementation is
python-tuf; go-tuf and rust-tuf exist, and TUF became a graduated project
of the Cloud Native Computing Foundation in December 2019. It is used, among
other places, to distribute Sigstore's trust root, in Docker's original
Notary, in AWS's Bottlerocket operating system, and in the agent
integrations of the monitoring company Datadog.

!!! note "Life story: The Update Framework (TUF)"
    **Born:** 2010, Samuel, Mathewson, Cappos and Dingledine, "Survivable
    key compromise in software update systems" (ACM CCS), from Tor's
    Thandy updater and the 2008 study of package-manager attacks ·
    **Purpose:** secure software updates even when mirrors are hostile and
    some signing keys are stolen, using separate roles, thresholds,
    versions and expiry · **Helped:** Notary, Sigstore's root of trust,
    Uptane, Bottlerocket, many in-house updaters · **Status:** active; a
    CNCF graduated project since December 2019; specification at version
    1.0

### Uptane: TUF for cars

A modern car has dozens to over a hundred electronic control units
(ECUs), from the engine controller to the infotainment system, and since
the 2010s many of them are updated over the air. Cars add problems a
package manager does not have: most ECUs are small microcontrollers that
cannot check a chain of metadata, the car connects through one gateway,
updates must be chosen per vehicle (this car, with these parts, gets these
images), and a car's software must be consistent across units that were
updated at different times. **Uptane**, published at the escar conference
in 2016 by Trishank Karthik Kuppusamy, Justin Cappos and colleagues from
New York University, the University of Michigan Transportation Research
Institute and Southwest Research Institute, adapts TUF with two ideas:

- **Two repositories.** The **image repository** is ordinary TUF, with
  offline keys, saying which images exist and are valid. The **director
  repository** is online and tells each vehicle which of those images to
  install. An update needs both: a compromised director can choose only
  among genuine images, and a compromised image repository cannot target
  a vehicle without the director.
- **Full and partial verification.** A **primary** ECU with enough power
  does the full TUF verification for both repositories. A small
  **secondary** ECU may do **partial verification**: it checks only the
  director's signature on the targets metadata that names its image, with
  one stored public key, plus its own version and expiry rules.

The first Uptane standard was published as IEEE-ISTO 6100.1.0.0 in July
2019, and the project moved to the Linux Foundation's Joint Development
Foundation that year; it is used in Automotive Grade Linux and in
commercial over-the-air systems.

!!! note "Life story: Uptane"
    **Born:** 2016, published at escar by Kuppusamy, Cappos and colleagues
    (NYU, UMTRI, SwRI), with US Department of Homeland Security funding ·
    **Purpose:** secure over-the-air updates for vehicles, surviving the
    compromise of online servers and supporting ECUs too small for full
    verification · **Helped:** a public standard (IEEE-ISTO 6100.1.0.0,
    July 2019) for a field where each maker had its own scheme ·
    **Status:** maintained under the Joint Development Foundation; later
    versions of the standard and deployment guidance followed

What to do:

- Do not write an updater from scratch with a single signing key; use TUF
  (python-tuf, go-tuf, rust-tuf) or a system built on it.
- Keep the keys that decide what software exists offline and in a
  threshold; let only the timestamp-like role be online.
- Give every piece of metadata a version and an expiry, store the highest
  version seen, and treat an expired timestamp as an attack, not a glitch.
- For fleets of small devices, separate "which images are genuine" from
  "which device installs what", as Uptane does.

## 16.10 When the chain broke: the incidents

*Level: intermediate.*

Figure 16.6 places the attacks of this chapter in time. Read them for
which link each one used, and for which defense from §16.2 to §16.9 would
have stopped it. The honest answer is often "none of them alone".

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Timeline of supply-chain incidents from 2010 to 2024: Stuxnet 2010, Flame 2012, NotPetya 2017, ShadowHammer 2019, SolarWinds 2020, Codecov 2021, 3CX 2023, xz 2024" fill="currentColor" font-size="14">
<line x1="30" y1="100" x2="620" y2="100" stroke="currentColor" stroke-width="1.6"/>
<circle cx="40" cy="100" r="5" fill="currentColor"/>
<text x="40" y="128" text-anchor="middle" font-weight="bold">2010</text>
<text x="40" y="148" text-anchor="middle" font-size="12">Stuxnet</text>
<text x="40" y="164" text-anchor="middle" font-size="12">stolen keys</text>
<circle cx="120" cy="100" r="5" fill="currentColor"/>
<text x="120" y="60" text-anchor="middle" font-weight="bold">2012</text>
<text x="120" y="78" text-anchor="middle" font-size="12">Flame: forged cert</text>
<circle cx="320" cy="100" r="5" fill="currentColor"/>
<text x="320" y="128" text-anchor="middle" font-weight="bold">2017</text>
<text x="320" y="148" text-anchor="middle" font-size="12">NotPetya</text>
<text x="320" y="164" text-anchor="middle" font-size="12">unsigned updates</text>
<circle cx="400" cy="100" r="5" fill="currentColor"/>
<text x="400" y="42" text-anchor="middle" font-weight="bold">2019</text>
<text x="400" y="60" text-anchor="middle" font-size="12">ShadowHammer</text>
<text x="400" y="78" text-anchor="middle" font-size="12">signed updates</text>
<circle cx="440" cy="100" r="5" fill="currentColor"/>
<text x="452" y="128" text-anchor="middle" font-weight="bold">2020</text>
<text x="452" y="148" text-anchor="middle" font-size="12">SolarWinds</text>
<text x="452" y="164" text-anchor="middle" font-size="12">build server</text>
<circle cx="480" cy="100" r="5" fill="currentColor"/>
<text x="500" y="60" text-anchor="middle" font-weight="bold">2021</text>
<text x="500" y="78" text-anchor="middle" font-size="12">Codecov</text>
<circle cx="560" cy="100" r="5" fill="currentColor"/>
<text x="548" y="128" text-anchor="middle" font-weight="bold">2023</text>
<text x="548" y="148" text-anchor="middle" font-size="12">3CX, chained</text>
<circle cx="600" cy="100" r="5" fill="currentColor"/>
<text x="600" y="42" text-anchor="middle" font-weight="bold">2024</text>
<text x="600" y="60" text-anchor="middle" font-size="12">xz</text>
<text x="600" y="78" text-anchor="middle" font-size="12">maintainer</text>
</svg>
<figcaption>Figure 16.6. Fifteen years of software supply-chain attacks. The attackers moved from stealing keys, to using the vendor's own update channel, to the build system, to the maintainers themselves.</figcaption>
</figure>

### Stuxnet's stolen certificates (2010)

In June 2010 the small Belarusian antivirus company VirusBlokAda reported
a worm that spread on USB sticks and installed two Windows kernel drivers.
The drivers were signed with the code-signing certificate of Realtek
Semiconductor, a Taiwanese chip maker. VeriSign revoked that certificate on
16 July; on 17 July the antivirus company ESET found a new driver from the
same family signed with the certificate of JMicron Technology, another
Taiwanese company with offices in the same science park in Hsinchu. Both
private keys had been stolen, and how has never been made public. The worm,
named Stuxnet, turned out to target the centrifuges at Iran's enrichment
plant at Natanz. Reporting in 2012 attributed it to a US and Israeli
program; neither government has confirmed it.

!!! note "Life story: Stuxnet's driver certificates"
    **Born:** 2009 to 2010, keys stolen from Realtek and JMicron by unknown
    means · **Purpose:** let Stuxnet's rootkit drivers load on Windows as
    trusted, signed code, without warnings · **Helped:** the first
    well-known malware signed with stolen, genuine certificates; revoked 16
    and 22 July 2010 · **Status:** a turning point: stolen code-signing keys
    became a standard tool of state attackers, and the push toward
    hardware-held keys and Microsoft-signed drivers followed

Two years later **Flame** went one step further and forged a Microsoft
code-signing certificate with an MD5 chosen-prefix collision, then used it
to pose as Windows Update inside networks. The collision and Microsoft's
response are told in
[Cryptanalysis Chapter 9](../cryptanalysis/09-Breaking-Hash-Functions.md#flame).
Flame's lesson for engineers is about the forgotten service: a licensing
CA that still signed with MD5 in 2012, chaining to a root that Windows
trusted for code.

### NotPetya through M.E.Doc (2017)

On 27 June 2017 a destructive program disguised as ransomware spread
through Ukraine and then the world. It entered through M.E.Doc, accounting
software used by a large share of Ukrainian businesses to file taxes. The attackers
had controlled the vendor's update server for weeks, and ESET found that
they had added a backdoor to updates from April 2017 onward; the updates
were not signed, so the clients had no way to tell. NotPetya encrypted
disks with no working way to decrypt them, and spread inside networks with
stolen credentials and the EternalBlue exploit. Maersk, Merck, FedEx's TNT
Express and many others lost entire networks. A White House official later
put the total damage at about \$10 billion, a figure that is an estimate.
The United States and the United Kingdom attributed it in February 2018 to
Russia's military intelligence, and in October 2020 the US indicted six
officers of its unit known as Sandworm.

!!! note "Life story: NotPetya and M.E.Doc"
    **Born:** backdoored M.E.Doc updates from April 2017; the destructive
    payload pushed on 27 June 2017 · **Purpose:** sabotage disguised as
    ransomware, aimed at Ukraine · **Helped:** cause the most expensive
    cyberattack on record (about \$10 billion, estimated) through an update
    channel with no signatures · **Status:** attributed to Russia's GRU
    (2018), indictments in 2020; the standard example of why update
    channels must be signed and verified by the client

### ASUS ShadowHammer (2019)

In March 2019 Kaspersky Lab reported that ASUS's own updater, ASUS Live
Update, preinstalled on the company's laptops, had delivered a backdoor
between June and November 2018. The malicious updates were signed with
genuine ASUS certificates and served from ASUS's own servers. Kaspersky's
products saw it on about 57,000 of their users' machines, and the real
number was likely far higher. The backdoor did nothing on almost all of
them: it carried a list of about 600 network-card MAC addresses, hashed,
and only on those machines did it fetch a second stage.

!!! note "Life story: ShadowHammer"
    **Born:** June to November 2018, in ASUS Live Update; reported by
    Kaspersky on 25 March 2019 · **Purpose:** reach about 600 specific
    machines through an updater installed on many more · **Helped:** show
    that a signed update from the vendor's own server proves nothing when
    the vendor's signing pipeline is compromised · **Status:** fixed in
    Live Update 3.6.8 (March 2019); attributed by researchers to a group
    also behind earlier supply-chain attacks, without official confirmation

### SolarWinds SUNBURST (2020)

FireEye announced on 8 December 2020 that it had been breached, and on 13
December that the way in had been an update to SolarWinds Orion. Versions
released between March and June 2020 contained a backdoor, SUNBURST, that
waited about two weeks after installation, disguised its traffic as
Orion's own, and let the attackers choose which of the thousands of
infected networks to enter further. The investigation found the means on
SolarWinds' build servers: a program later named SUNSPOT watched for the
build of Orion, replaced one source file with a backdoored version for the
duration of the compilation, and put the original back, so that the source
repository was always clean and the signed product was not. SolarWinds
said that fewer than 18,000 customers had installed an affected version.
US officials said about 100 companies and nine federal agencies had been
further compromised. The US government attributed the operation to
Russia's foreign intelligence service, the SVR, in April 2021.

!!! note "Life story: SolarWinds SUNBURST"
    **Born:** test code inserted in October 2019; the backdoor shipped in
    Orion releases from March to June 2020; disclosed 13 December 2020 ·
    **Purpose:** espionage against chosen targets among Orion's customers ·
    **Helped:** reach US federal agencies and large companies through a
    product signed by its vendor's real key, built by its real build system
    · **Status:** attributed to the SVR (April 2021); the case behind US
    Executive Order 14028 (May 2021) on software supply-chain security,
    and the attack that SLSA's Build L3 is designed against

### Codecov (2021)

From 31 January to 1 April 2021 an attacker modified Codecov's Bash
uploader script, which thousands of CI pipelines downloaded and ran on
every build, to send the build's environment variables to the attacker. A
customer caught it by comparing the script's hash with the one published
on GitHub, which is the whole case for pinning downloaded scripts by hash.
The full story, as a secrets incident, is in
[Chapter 12](12-Secrets-in-Operations.md).

### 3CX: one supply-chain attack inside another (2023)

On 29 March 2023 CrowdStrike, SentinelOne and Sophos reported that the
desktop application of 3CX, a business phone system, was carrying
malware in versions for Windows and macOS. The builds were signed by 3CX,
and the macOS build was notarized by Apple. In April, Mandiant, hired by
3CX, found how the attackers had reached 3CX's build environment: an
employee had installed X_TRADER, trading software from the company Trading
Technologies, in 2022. X_TRADER had been retired in 2020, but its installer
was still downloadable from the vendor's website, and the attackers had
compromised it there, signed with Trading Technologies' still-valid
certificate. The first supply-chain attack gave them the employee's
machine, and from it the build system of the second. Mandiant said it was
the first time it had seen one software supply-chain attack lead to
another, and attributed both to a group linked to North Korea.

!!! note "Life story: the 3CX compromise"
    **Born:** 2022, when a 3CX employee installed a trojanized X_TRADER;
    malicious 3CX builds detected 29 March 2023 · **Purpose:** reach 3CX's
    customers through signed, notarized desktop applications · **Helped:**
    demonstrate a chained supply-chain attack, and that notarization checks
    for known malware, not for a vendor's compromised build · **Status:**
    attributed by Mandiant to a North Korea-linked group; a reason to
    revoke the certificates of retired products and to isolate build
    systems from employees' workstations

### The xz backdoor (2024)

The xz story of §16.1 is the one that no signature, log or build system
could have stopped, because the attacker was the signer. The account
"Jia Tan" began sending patches to xz utils in 2021. In 2022 other
accounts, likely the same people, publicly pressed the original
maintainer, Lasse Collin, who was working alone, to hand over more of the
project; Jia Tan became co-maintainer and began making releases. Releases
5.6.0 (24 February 2024) and 5.6.1 (9 March 2024) contained the backdoor.
Its payload was hidden in two binary test files committed to the
repository, which look like corrupt and valid compressed data; a modified
build script, present only in the release tarballs, extracted it during the
build, and only when building a Debian or RPM package for x86-64 Linux. The
resulting `liblzma` used a GNU indirect-function resolver to replace the
RSA verification function in OpenSSH's server process, which loads
`liblzma` on the distributions that patch the server to talk to systemd.
A command hidden in the public key of an SSH client certificate, and
signed with the attacker's Ed448 key, would be executed as root; without
that key the backdoor did nothing visible, which is why it was a backdoor
only one party could use.

It reached the development and rolling-release versions of Debian, Fedora,
openSUSE Tumbleweed and Kali, and was removed before any major stable
release shipped it.
Freund's observation of half a second, and his decision to look, are the
only reason it was found then.

!!! note "Life story: the xz backdoor"
    **Born:** contributions from "Jia Tan" from 2021; backdoored releases
    5.6.0 and 5.6.1 in February and March 2024; found by Andres Freund and
    reported on 29 March 2024 (CVE-2024-3094) · **Purpose:** remote code
    execution as root, through OpenSSH's server, for whoever held one Ed448
    key · **Helped:** show that a patient attacker can become a trusted
    maintainer, and that release tarballs that differ from the repository
    hide code from reviewers · **Status:** removed from all distributions
    within days; xz is again maintained by Lasse Collin; who was behind it
    is unknown, though many researchers suspect a state-backed group

What each incident would have needed:

- **Stuxnet, ShadowHammer, SolarWinds, 3CX**: valid signatures from the
  vendor's key. What helps is protecting the signing path (keys in
  hardware with an authorization step that is not the build server,
  Chapter 11), hardened, isolated builds (SLSA Build L3), reproducible
  builds checked by an independent rebuilder, and transparency, so that a
  signature nobody intended is at least public.
- **NotPetya**: no signatures at all. Signed updates verified by the
  client would have stopped it.
- **Codecov**: a script fetched and run unverified. Pinning by hash, or a
  signature, stops it.
- **Flame**: a weak hash in a forgotten CA. Retiring old algorithms
  everywhere, including the corners, stops it (Chapter 18).
- **xz**: a trusted insider. Building from the repository, not from
  tarballs, would have exposed this one; in general only review, more
  maintainers, and less pressure on lone volunteers help.

## 16.11 Mars: signed updates to a rover

*Level: intermediate.*

A rover on Mars is the extreme case of a device that must verify its own
updates. Light takes between about 3 and 22 minutes to cross from Earth to
Mars, depending on where the two planets are in their orbits; commands
usually go through a relay orbiter that passes over the rover a few times
a day; and near solar conjunction, about every 26 months, there is no
contact at all for about two weeks (the keyring for that silence is
[Chapter 10](10-The-Life-of-a-Key.md)'s Mars example). Rovers do receive
new software in flight. In August 2012, days after landing, Curiosity's
flight software was replaced over four days with the version for driving on
the surface, and Perseverance did the same after its landing in February
2021.

The rover cannot ask anyone whether an update is current. Every rule of
§16.9 still applies, and two of them need rethinking.

**Rollback** is the easy one, with care about state. The rover stores the
highest version and the highest message sequence number it has accepted,
in non-volatile memory, in more than one copy, because radiation flips bits
([Chapter 7](07-Masking-and-Fault-Resistance.md)). A recorded uplink
replayed later, by an attacker or by a relay that kept an old message in
its buffer, has an old sequence number and is refused. The tension is with
**fallback**: if a new image fails to boot, the rover must be able to run
the previous one. Systems such as Android's verified boot resolve this by
raising the stored "rollback index" only after the new image has booted
and passed its health checks; until then, the old image remains allowed.

**Expiry** is the hard one. TUF's freeze protection compares the
metadata's expiry with the client's clock, but a rover's clock can be
reset by a fault, drift, or jump. A clock set back to zero makes every old
message look fresh; a clock that jumps far ahead makes every new message
look expired, and the rover refuses all updates, including the one that
would fix its clock. The answer is to let the rover's own clock decide
nothing that matters: order is decided by sequence numbers, and freshness
by the newest time that Earth itself has signed. A signed "time beacon"
sent with routine traffic tells the rover what time Earth vouches for, and
a message whose expiry is earlier than that is stale whatever the rover's
oscillator says. The rover's own clock is still useful for one thing:
noticing that it has heard nothing from Earth for too long, which is an
operations decision (go to safe mode, wait for conjunction to end), not a
reason to accept or refuse a signature.

**Code it.** Two rovers receive the same signed messages and suffer the
same two clock faults. The naive one checks expiry against its own clock
and has no sequence numbers; the careful one uses Earth's signed time and
sequence numbers.

```python
import hashlib, hmac, json

# Stand-in signature (HMAC). A rover would check Ed25519 or a hash-based
# signature with a public key burned in at launch; the rules are the point.
EARTH_KEY = b"mission update key (stand-in)"
canon = lambda o: json.dumps(o, sort_keys=True, separators=(",", ":")).encode()
def earth(**body):
    return {"body": body, "sig": hmac.digest(EARTH_KEY, canon(body), "sha256")}

class Rover:
    def __init__(self, careful):
        self.careful = careful
        # non-volatile state, kept in two copies in real hardware (radiation, Chapter 7)
        self.nv = {"installed": 41, "last_seq": 900, "earth_time": 1000}
        self.clock = 1000                  # the rover's own clock, in hours

    def receive(self, msg):
        b = msg["body"]
        if not hmac.compare_digest(msg["sig"], hmac.digest(EARTH_KEY, canon(b), "sha256")):
            return "refused: bad signature"
        if b["rover"] != "R2":
            return "refused: meant for another rover"
        if self.careful and b["seq"] <= self.nv["last_seq"]:
            return "refused: old or replayed (seq %d)" % b["seq"]
        now = self.nv["earth_time"] if self.careful else self.clock
        if b["expires"] < now:
            return "refused: expired"
        self.nv["last_seq"] = max(self.nv["last_seq"], b["seq"])
        self.nv["earth_time"] = max(self.nv["earth_time"], b["sent"])
        if b["kind"] == "time":
            return "noted Earth time %d" % b["sent"]
        if b["version"] <= self.nv["installed"]:
            return "refused: version %d is not newer" % b["version"]
        self.nv["installed"] = b["version"]  # really: only after the new image boots well
        return "installing version %d" % b["version"]

v42 = earth(kind="update", rover="R2", seq=901, sent=1001, expires=1073, version=42)
v43 = earth(kind="update", rover="R2", seq=902, sent=1010, expires=1082, version=43)
beat = earth(kind="time", rover="R2", seq=903, sent=1100, expires=1172)
v44 = earth(kind="update", rover="R2", seq=904, sent=1200, expires=1272, version=44)

for careful in (False, True):
    r = Rover(careful)
    print("careful rover" if careful else "naive rover")
    print("  v42:            ", r.receive(v42))
    # v43 was found to be bad and withdrawn, but a copy sits in a relay's buffer
    print("  time beacon:    ", r.receive(beat))
    r.clock = 0                                       # a fault resets the clock
    print("  stale v43:      ", r.receive(v43))
    r.clock = 5000                                    # a later fault: the clock runs far ahead
    print("  fresh v44:      ", r.receive(v44))
```

```text
naive rover
  v42:             installing version 42
  time beacon:     noted Earth time 1100
  stale v43:       installing version 43
  fresh v44:       refused: expired
careful rover
  v42:             installing version 42
  time beacon:     noted Earth time 1100
  stale v43:       refused: old or replayed (seq 902)
  fresh v44:       installing version 44
```

The naive rover fails in both directions: after its clock reset it
installs the withdrawn version 43, and after its clock jumps it refuses
the good version 44 and will refuse every update until someone fixes its
clock, which would need an update. The careful rover refuses the stale
message twice over (its sequence number is old, and its expiry, hour 1082,
is before the Earth time of 1100 that the beacon vouched for) and accepts
the fresh one whatever its clock says. The price is that freshness now
depends on Earth sending signed beacons; a rover that hears nothing knows
only that it has heard nothing.

Three more choices complete the design. The rover's public key, or a
small set of them in a threshold, is burned in before launch, with a
signed key-rotation message (old key signs new, as in signify and TUF's
root) so that a key can be retired in flight. Because a rover may run for
fifteen years or more, mission planners may choose a hash-based signature
scheme such as LMS or XMSS, whose security rests only on the hash function
and which NSA's CNSA 2.0 suite already names for firmware signing; the
state those schemes must keep is exactly the kind of thing a mission
control can manage carefully, as
[Post-quantum Chapter 11](../post-quantum/11-Stateful-Hash-Based-Signatures.md)
explains. And everything is verified on board, the whole image against the
signed hash before it is written to the inactive partition, and again at
boot: a relay orbiter, a ground station or a mission-control server can
be compromised, and none of them should be able to make the rover run
code that Earth's signing key did not approve.

What to do (on Mars and on any device that is often offline):

- Decide order with signed sequence numbers and versions stored in
  non-volatile memory, never with the device's clock.
- Measure freshness against the newest signed time from the update
  authority, not against a local clock that can reset or jump.
- Raise the rollback index only after the new image has proven itself, and
  keep the previous image bootable until then.
- Burn in the trust root with a planned rotation path, and choose a
  signature scheme for the device's whole life.

## 16.12 Going deeper

*Level: expert.*

**Trusting trust, answered.** Thompson's attack survives in a compiler
binary. In 2005 David A. Wheeler described **diverse double-compiling**
(DDC; his dissertation, 2009, gives proofs): compile the suspect
compiler's source with a different, independently written compiler, then
compile the same source again with the result; if the final binary is
identical to the suspect binary, the suspect binary corresponds to its
source, unless both compilers were backdoored in the same way. It needs
reproducible builds to work. **Bootstrappable builds** go further and
remove the need for any trusted binary compiler: GNU Guix announced in
2023 a full-source bootstrap that builds its whole system starting from a
hand-checkable seed of a few hundred bytes of machine code.

**Signing with several keys.** A release key held by one person is one
point of failure; TUF's thresholds spread trust over several keys, and
threshold signature schemes (FROST for Schnorr signatures) produce one
ordinary signature from several share holders, so verifiers need no
changes. The protocols are in
[Advanced protocols Chapter 4](../advanced/04-Threshold-Cryptography.md).

**Binary transparency for everything.** Newer logs of all three kinds (Go's
checksum database, Sigstore's Rekor and CT logs) are moving to the same
tile-based layout and checkpoint format, and a growing set of
independent witnesses cosign checkpoints for many logs at once. Firmware
and mobile vendors have begun publishing transparency logs of their
images, so that a targeted, specially signed image for one victim would
have to appear in public.

**The limits of the model.** SBOMs (software bills of materials, required
for US federal suppliers after Executive Order 14028) list what is in a
product but prove nothing about it. Provenance and signatures prove where
something came from, not what it does. The remaining defense against a
malicious maintainer is human: review of what is released, attention to
differences between repositories and tarballs, and funding and help for
the single volunteers on whom large parts of the world's software depend.
The xz case was a social attack on one tired maintainer before it was a
technical one.

## Check yourself

??? question "1. A download page lists a SHA-256 hash next to the file, on the same server. What attack does checking it stop, and what attack does it not stop?"
    It stops corruption in transit and a compromised mirror that serves
    the file but not the page. It does not stop an attacker who controls
    the server that publishes both the file and the hash, since they change
    both. A signature under a key obtained earlier, over another channel,
    does stop that attacker.

??? question "2. Why does signing a release tarball's bytes alone allow a rollback attack, and what should be signed instead?"
    The signature on an old version stays valid forever and says nothing
    about the version or the package name, so a mirror can serve the old
    signed file when the new one is requested. Sign a statement with the
    package name, version, file hash and expiry, and have the client check
    each field and keep the highest version it has installed.

??? question "3. What did the Janus bug exploit, and why did APK Signature Scheme v2 close it?"
    A file can be a DEX file read from its start and a ZIP file read from
    its end. Scheme v1 verified only the ZIP entries, while the runtime
    loaded the DEX at the start, so prepended code ran under the original
    app's signature. v2 signs the whole file outside the signing block, so
    any prepended bytes break the signature.

??? question "4. A build script runs `gpg --verify release.tar.gz.asc` and checks that the exit status is 0. What is wrong?"
    The exit status says that the signature is good under some key in the
    keyring, not under the project's release key. A release signed by any
    other key that happens to be in the keyring passes. Use `gpgv` with a
    keyring holding only the release key, or parse the `VALIDSIG` status
    line and compare the full fingerprint.

??? question "5. In RFC 9162, why are leaves hashed with a 0x00 prefix and interior nodes with 0x01?"
    So that a leaf hash and a node hash are never computed over the same
    input. Without the separation, the 64 bytes of a node's children form
    a valid leaf, and a different list of entries can have the same root,
    so a signed root no longer pins the log's contents.

??? question "6. A Sigstore verifier checks the certificate chain to Fulcio, the signature and the Rekor entry, and accepts. Why is that not enough?"
    Anyone with an OIDC identity can get a Fulcio certificate and sign
    anything, so these checks prove only that someone signed. The verifier
    must also require the expected identity (for example the release
    workflow of the right repository) and the expected OIDC issuer.

??? question "7. In TUF, which role's key is online, what can a thief do with it, and how long does the damage last?"
    The timestamp key is online, since the timestamp is re-signed often.
    With it a thief can keep pointing clients at an older (still genuine)
    snapshot, a freeze, but cannot add or change files, which needs the
    offline targets key. Because the stolen key can be replaced through
    root, and the timestamp's expiry is short, the freeze is limited.

??? question "8. Would an independent rebuilder with reproducible builds have caught SolarWinds, NotPetya or xz?"
    SolarWinds: yes, since the binary built on the compromised server
    differed from what the clean source produces. NotPetya: rebuilding is
    beside the point; the updates were unsigned and came from a
    compromised server, and signed updates checked by the client were the
    missing defense. xz: only partly. A rebuild from the release tarball
    reproduces the backdoor faithfully, because the tarball contained it;
    what exposes it is comparing the tarball with the Git tag, or building
    from the tag, which lacks the modified build script.

??? question "9. Why should a rover not check update expiry against its own clock, and what should it use?"
    The clock can reset (making stale messages look fresh) or jump ahead
    (making every fresh message look expired, which locks out the fix).
    Use signed sequence numbers for order and the newest time Earth has
    signed, stored on board, as the reference for expiry.

## What you learned

- A signature proves that a key signed some bytes. It does not prove that
  the code is good, current, built from its source, or meant for you.
- Sign statements (name, version, hash, expiry), verify the bytes you use
  and nothing else, and pin the one key or identity you expect.
- Platforms (Authenticode, Apple notarization, APK v2 to v4) and package
  managers (Debian's signed Release files, RPM, npm provenance, PyPI
  attestations) each sign differently, and each had bugs where the
  verifier and the parser disagreed.
- signify and minisign replaced OpenPGP's complexity with Ed25519 and a
  trust root that travels with each release.
- Transparency logs make every signature public. RFC 9162's Merkle tree,
  its domain-separated hashing, and its inclusion and consistency proofs
  are short enough to write and check by hand.
- Sigstore replaces long-lived keys with identities, ten-minute
  certificates and a log; its verifiers must check the identity.
- Reproducible builds and provenance (SLSA) address the build, which
  signatures cannot.
- TUF's roles, versions and expiry stop rollback, freeze and
  mix-and-match, and survive the theft of online keys; Uptane adapts them
  to cars.
- The incidents moved from stolen keys to compromised builds to
  compromised maintainers; the last needs people, not cryptography.
- On a rover, order comes from sequence numbers and freshness from signed
  Earth time, never from the rover's own clock.

## Further reading

- RFC 8032 (2017), Edwards-curve Digital Signature Algorithm (EdDSA).
- RFC 9162 (2021), Certificate Transparency Version 2.0; RFC 6962 (2013),
  Certificate Transparency.
- RFC 3161 (2001), Time-Stamp Protocol.
- Justin Cappos, Justin Samuel, Scott Baker and John H. Hartman, "A look
  in the mirror: attacks on package managers", ACM CCS 2008.
- Justin Samuel, Nick Mathewson, Justin Cappos and Roger Dingledine,
  "Survivable key compromise in software update systems", ACM CCS 2010;
  The Update Framework specification, version 1.0.
- Trishank Karthik Kuppusamy, Akan Brown, Sebastien Awwad, Damon McCoy,
  Russ Bielawski, Cameron Mott, Sam Lauzon, André Weimerskirch and Justin
  Cappos, "Uptane: securing software updates for automobiles", escar
  Europe 2016; IEEE-ISTO 6100.1.0.0, Uptane Standard for Design and
  Implementation (July 2019).
- Zachary Newman, John Speed Meyers and Santiago Torres-Arias, "Sigstore:
  software signing for everybody", ACM CCS 2022; Sigstore, "Sigstore
  announces general availability" (25 October 2022).
- Santiago Torres-Arias, Hammad Afzali, Trishank Karthik Kuppusamy, Reza
  Curtmola and Justin Cappos, "in-toto: providing farm-to-table guarantees
  for bits and bytes", USENIX Security 2019.
- SLSA specification v1.0 (April 2023), slsa.dev.
- PEP 740, "Index support for digital attestations" (accepted July 2024);
  PyPI blog, "PyPI now supports digital attestations" (14 November 2024);
  GitHub blog, "Introducing npm package provenance" (April 2023); PyPI
  blog, "Removing PGP from PyPI" (May 2023).
- Ken Thompson, "Reflections on trusting trust", Communications of the
  ACM, 1984 (Turing Award lecture).
- David A. Wheeler, "Countering trusting trust through diverse
  double-compiling", ACSAC 2005, and his PhD dissertation "Fully
  countering trusting trust through diverse double-compiling" (2009).
- Chris Lamb and Stefano Zacchiroli, "Reproducible builds: increasing the
  integrity of software supply chains", IEEE Software, 2022;
  reproducible-builds.org (SOURCE_DATE_EPOCH specification, 2015);
  tests.reproducible-builds.org (Debian statistics).
- Russ Cox, "Transparent logs for skeptical clients" (2019), and the Go
  checksum database design (proposal 25530).
- Android Open Source Project, "APK Signature Scheme v2", "v3" and "v4"
  documentation; GuardSquare, "New Android vulnerability allows attackers
  to modify apps without affecting their signatures" (Janus, December
  2017).
- Jann Horn, CVE-2016-1252 (apt InRelease), December 2016; Max Justicz,
  "Remote code execution in apt/apt-get" (CVE-2019-3462), January 2019.
- Marcus Brinkmann, "SigSpoof" (CVE-2018-12020), June 2018; Robert J.
  Hansen, "SKS keyserver network under attack" (June 2019).
- Ted Unangst, "signify: securing OpenBSD from us to you" (2015);
  minisign documentation, Frank Denis.
- Symantec (Nicolas Falliere, Liam O Murchu and Eric Chien), "W32.Stuxnet
  dossier" (version 1.4, February 2011).
- ESET (Anton Cherepanov), "Analysis of TeleBots' cunning backdoor" (July
  2017), on the M.E.Doc updates; Andy Greenberg, "The untold story of
  NotPetya, the most devastating cyberattack in history", Wired (August
  2018).
- Kaspersky Lab, "Operation ShadowHammer" (March and April 2019).
- FireEye, "Highly evasive attacker leverages SolarWinds supply chain to
  compromise multiple global victims with SUNBURST backdoor" (13 December
  2020); CrowdStrike, "SUNSPOT: an implant in the build process" (January
  2021).
- Mandiant, "3CX software supply chain compromise initiated by a prior
  software supply chain compromise" (20 April 2023).
- Andres Freund, "backdoor in upstream xz/liblzma leading to ssh server
  compromise", oss-security mailing list (29 March 2024); Russ Cox,
  "Timeline of the xz open source attack" (April 2024).
- NSA, "Commercial National Security Algorithm Suite 2.0" (September
  2022), on LMS and XMSS for firmware signing.
- Reference cards: [gpg](../../tools/gpg.md),
  [openssl](../../tools/openssl.md).
