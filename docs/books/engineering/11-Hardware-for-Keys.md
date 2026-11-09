# 11. Hardware for keys: HSMs, TPMs, enclaves and tokens

*A key in a file can be copied, and a copied key works for the thief forever, anywhere,
without a trace. The answer the industry has used since the 1970s is to put the key in a
box that does cryptography with it and will not give it back: a hardware security module
in a data center, a TPM on a laptop's motherboard, an enclave inside a phone's processor,
a token on a key ring. This chapter explains what each of those boxes promises, what it
does not, and how each has failed. You will build a toy token that signs but never
exports, break a PKCS#11-style key store by wrapping a key and then decrypting the
wrapped copy, fix it with the attribute policy the attack forced on the industry, replay
a TPM event log against its PCRs, catch a tampered log, seal a disk key to a measured
boot and check an attestation quote.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a key that cannot be extracted changes theft into misuse, and why misuse is
      still possible;
    - what is inside a hardware security module, and how key ceremonies and quorums
      control the people around it;
    - the PKCS#11 interface: slots, sessions, handles, templates, and the attributes
      `CKA_SENSITIVE`, `CKA_EXTRACTABLE`, `CKA_WRAP` and `CKA_DECRYPT`;
    - the API attacks on PKCS#11 (Clulow 2003; Bortolozzo, Centenaro, Focardi and Steel
      2010) and the policy that stops them;
    - what FIPS 140-3 levels 1 to 4 require, and what a certificate does not say;
    - what a cloud KMS or cloud HSM gives you, its quotas, and what the provider can see;
    - TPM 2.0: endorsement and attestation keys, PCRs, measured boot, sealing, quotes,
      and the bus-sniffing attacks on BitLocker;
    - secure enclaves: Apple's Secure Enclave, Android Keystore and StrongBox, Arm
      TrustZone, Intel SGX and its attacks, AMD SEV and Intel TDX;
    - security keys and smart cards (PIV, OpenPGP card, YubiKey), the ROCA keys, and
      what attestation proves and what it cannot.

    **You need:** [Chapter 10](10-The-Life-of-a-Key.md) (the life of a key: hierarchies,
    wrapping, rotation, destruction), and [Chapter 7](07-Masking-and-Fault-Resistance.md)
    for how the chips inside these devices resist side channels and faults (§7.10 on
    evaluation, §7.11 on smart cards and secure elements). Hash functions and MACs from
    [Chapter 9](../../book/09-Hash-Functions.md) and
    [Chapter 10](../../book/10-Message-Authentication.md) of the cryptography book, and
    PKI from its [Chapter 16](../../book/16-PKI-and-Key-Establishment.md).

    **Levels:** §11.1 and §11.2 are for beginners; §11.3 to §11.11 and §11.13 are
    intermediate; §11.12 and §11.14 are expert.

## 11.1 The problem

*Level: beginner.*

On 27 September 2012 Adobe announced that two pieces of malware had been signed with
Adobe's own code-signing certificate. The private key had not been stolen. Adobe kept it
in a hardware security module, and the module had done its job: the key had never left
it. What the attackers had taken was a build server, one of the machines allowed to
send files to the signing service. They submitted their tools, the service signed them,
and the signatures were perfectly valid. Adobe revoked the certificate on 4 October and
re-signed its legitimate software with a new one.

A year earlier the same pattern had ended a company. In the summer of 2011 an intruder
took over the certificate servers of DigiNotar, a Dutch certificate authority, and
issued at least 531 forged certificates, among them one for `*.google.com` that was used
to intercept the mail of about 300,000 people in Iran. DigiNotar's CA keys were also in
hardware modules. They did not need to leave: the modules were online and usable by the
CA software the intruder controlled, so the intruder had them sign. Browsers removed
DigiNotar's roots, and the company was bankrupt within weeks.

Compare those with the cases where the key was only a file. In 2010 the Stuxnet worm
carried drivers signed with private keys stolen from two Taiwanese hardware makers,
Realtek and JMicron ([Chapter 16](16-Signing-Software-and-the-Supply-Chain.md) tells the
story). Whoever held those files could sign anything, on any machine, for as long as the
certificates were trusted, and nobody at Realtek would see a single request. Once a key
file is copied there is no way to know how many copies exist, and the only remedy is to
revoke the key and replace it everywhere.

The two kinds of failure have different shapes, and hardware for keys exists to turn the
second kind into the first:

- **Theft** of a key is permanent, invisible and unlimited. The thief signs or decrypts
  wherever and whenever they like, and the owner may never learn of it.
- **Misuse** of a key that stays inside hardware is bounded. The attacker must keep
  control of a machine that is allowed to talk to the device, every request passes
  through a place that can log, rate-limit and refuse it, and when the attacker is
  evicted, the key is safe again without being replaced.

Adobe's breach was bad, but it was the second kind: Adobe knew which files had been
signed, because the signing service had logged them, and it could say so publicly.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="An application sends a request with a key handle to a hardware device; the key stays inside and only results come out" fill="currentColor" font-size="14">
<rect x="20" y="40" width="200" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="64" text-anchor="middle" font-weight="bold">application</text>
<text x="120" y="86" text-anchor="middle" font-size="12">holds handle 7, a PIN</text>
<text x="120" y="104" text-anchor="middle" font-size="12">or a cloud credential</text>
<text x="120" y="130" text-anchor="middle" font-size="12">(may be compromised)</text>
<rect x="400" y="30" width="220" height="140" rx="6" fill="currentColor" opacity="0.10"/>
<rect x="400" y="30" width="220" height="140" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="510" y="54" text-anchor="middle" font-weight="bold">hardware boundary</text>
<rect x="420" y="66" width="180" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="510" y="85" text-anchor="middle" font-size="13">key 7 (never leaves)</text>
<rect x="420" y="100" width="85" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="462" y="119" text-anchor="middle" font-size="12">policy</text>
<rect x="515" y="100" width="85" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="557" y="119" text-anchor="middle" font-size="12">audit log</text>
<text x="510" y="154" text-anchor="middle" font-size="12">tamper response, zeroize</text>
<line x1="220" y1="75" x2="392" y2="75" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,75 392,71 392,79"/>
<text x="310" y="68" text-anchor="middle" font-size="12">sign(handle 7, data)</text>
<line x1="400" y1="120" x2="228" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="220,120 228,116 228,124"/>
<text x="310" y="113" text-anchor="middle" font-size="12">signature only</text>
<line x1="20" y1="200" x2="620" y2="200" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="20" y="226" font-size="13" font-weight="bold">key in a file, stolen:</text>
<text x="200" y="226" font-size="13">signs forever, anywhere, unseen; fix = revoke and replace</text>
<text x="20" y="256" font-size="13" font-weight="bold">key in hardware, host owned:</text>
<text x="240" y="256" font-size="13">signs only while in control, through a logged door;</text>
<text x="240" y="276" font-size="13">fix = evict the attacker, review the log</text>
</svg>
<figcaption>Figure 11.1. The hardware boundary. The key is created inside and used by handle; only results cross. An attacker who owns the application can still ask for signatures, but only while they are in control, and every request passes the device's policy and log.</figcaption>
</figure>

The devices in this chapter differ in size, price and the attacker they expect, but they
make the same promise. A **hardware security module** (HSM) is a hardened computer, a
PCIe card or a network appliance, that holds a bank's PIN keys, a CA's root or a cloud's
master keys and performs thousands of operations a second. A **TPM** (trusted platform
module) is a slow, cheap chip on nearly every PC motherboard that holds a few keys for
the machine it is soldered to and records what that machine booted. A **secure enclave**
or trusted execution environment is a protected corner of a main processor: the Secure
Enclave in an iPhone, TrustZone in most Android phones, SGX or TDX in an Intel server. A
**token**, a smart card or security key, is a secure microcontroller you carry. In each,
the key is generated inside or imported once, it is used through an interface that names
it by a handle, and the interface has no operation that returns it in the clear.

That last clause is the whole design problem. An HSM's interface has hundreds of
functions: generate, derive, wrap for backup, unwrap, import, encrypt, decrypt, sign.
Each is harmless alone; some combinations are not. A device that refuses "give me the
key" but allows "encrypt the key under a key I chose, then decrypt that" has given the
key back in two steps, and §11.5 shows a real standard that did exactly that. The rest
of the chapter takes each kind of device in turn: what it protects against, how you use
it from code, the attacks that broke it, and what to do.

## 11.2 Keys that cannot leave

*Level: beginner.*

A hardware key store offers a small set of promises. It is worth stating them precisely,
because every attack in this chapter breaks one of them, and every product claim can be
checked against them.

1. **Generation inside.** The key is made by the device's own random generator, so no
   other machine ever held it. (An imported key was outside once; the device then
   promises only about the future.)
2. **No plaintext export.** No sequence of calls returns the key's value outside the
   boundary, except, if the owner allows it, encrypted under another key that is itself
   protected the same way (wrapping for backup or transfer).
3. **Use by handle, under policy.** Callers name a key by an opaque handle. Each key
   carries rules on what it may be used for (sign, decrypt, wrap) and who may use it
   (after which login, with what quorum).
4. **Authentication with limits.** A PIN or password guarded by a retry counter, so that
   a stolen token cannot be brute-forced: four digits are enough when only three guesses
   are allowed.
5. **Physical resistance.** Some level of tamper evidence, resistance or response
   (§11.6), and a chip built against side channels and faults
   ([Chapter 7](07-Masking-and-Fault-Resistance.md)).
6. **Attestation**, in some devices: a signed statement, rooted in the manufacturer,
   that this key really was generated inside such a device (§11.12).

**Code it.** The toy token below keeps those promises inside one Python object. Keys
are generated inside and named by handles; the PIN is stored as a salted PBKDF2 hash and
guarded by a counter of three; the token signs with HMAC-SHA256 (a real token would
usually sign with ECDSA or Ed25519, so that anyone with the public key can verify, but
HMAC keeps this to the standard library); and there is a key check value, a short
fingerprint that lets an operator confirm which key is loaded without seeing it, the way
banks have long identified keys on paper.

```python
import hashlib, hmac, secrets

class Token:
    """A toy signing token. Keys are made inside it and only handles come out."""

    def __init__(self, pin):
        self._salt = secrets.token_bytes(16)
        self._pin = hashlib.pbkdf2_hmac("sha256", pin.encode(), self._salt, 10_000)
        self._tries_left = 3
        self._logged_in = False
        self._keys = {}                      # handle -> key bytes, never returned

    def login(self, pin):
        if self._tries_left == 0:
            raise PermissionError("token locked: too many wrong PINs")
        guess = hashlib.pbkdf2_hmac("sha256", pin.encode(), self._salt, 10_000)
        if hmac.compare_digest(guess, self._pin):
            self._tries_left, self._logged_in = 3, True
        else:
            self._tries_left -= 1
        return self._logged_in

    def _check(self):
        if not self._logged_in:
            raise PermissionError("log in first")

    def generate_key(self, label):
        self._check()
        handle = len(self._keys) + 1
        self._keys[handle] = secrets.token_bytes(32)
        return handle

    def sign(self, handle, message):
        self._check()
        return hmac.new(self._keys[handle], message, hashlib.sha256).digest()

    def verify(self, handle, message, tag):
        return hmac.compare_digest(self.sign(handle, message), tag)

    def key_check_value(self, handle):
        # A short fingerprint that names the key without revealing it.
        return hmac.new(self._keys[handle], b"KCV", hashlib.sha256).hexdigest()[:6]

token = Token("4096")
print("login with 4096:", token.login("4096"))
h = token.generate_key("release signing")
tag = token.sign(h, b"release 2.4.1")
print("handle:", h, " tag length:", len(tag), "bytes")
print("verify good:", token.verify(h, b"release 2.4.1", tag))
print("verify forged:", token.verify(h, b"release 2.4.2", tag))
print("what the API offers:", [m for m in dir(token) if not m.startswith("_")])

thief = Token("4096")
for guess in ("0000", "1234", "1111", "4096"):
    try:
        print("thief tries", guess, "->", thief.login(guess))
    except PermissionError as e:
        print("thief tries", guess, "->", e)
```

It prints:

```
login with 4096: True
handle: 1  tag length: 32 bytes
verify good: True
verify forged: False
what the API offers: ['generate_key', 'key_check_value', 'login', 'sign', 'verify']
thief tries 0000 -> False
thief tries 1234 -> False
thief tries 1111 -> False
thief tries 4096 -> token locked: too many wrong PINs
```

The thief's fourth guess is the right PIN, and it is refused, because the counter ran
out first. With three tries against 10,000 PINs a thief's chance is 3 in 10,000; a real
token then demands a longer PUK (unblocking code) or erases itself.

Now the honest part. In Python, `token._keys` is one attribute away, and `gc`,
`ctypes` or a debugger can reach the bytes regardless of the underscore. Nothing inside
one process is a boundary. What the toy gets right is the *interface*: there is no call
that returns a key. What makes a real device worth buying is that the interface is the
only way in, because the key lives in different memory, on a different processor, behind
a different power supply, and in the best devices inside a mesh that erases it when cut.
Everything else in this chapter is about how real devices build that boundary, and how
attackers have found ways around the interface or through the walls.

Two consequences follow from the boundary, and they shape how systems use these
devices.

- **The device is slow and far away.** A smart card does a few RSA signatures a second;
  a TPM takes tens to hundreds of milliseconds for an RSA-2048 signature; a network HSM
  adds a network round trip; a cloud KMS adds an HTTPS request and a quota. So the
  device holds a few **key-encryption keys** at the top of a hierarchy, and bulk data is
  encrypted in software with data keys that the device wraps and unwraps
  ([Chapter 10](10-The-Life-of-a-Key.md) for hierarchies,
  [Chapter 14](14-Encrypting-Application-Data.md) for envelope encryption).
- **Whoever can call the device can use the key.** The hardware turns "protect the key"
  into "protect the right to call". The login, the network path, the cloud IAM policy
  and the host that holds the session become the real perimeter, as Adobe and DigiNotar
  found.

**What to do.**

1. List your keys whose theft would be permanent damage: CA and code-signing keys,
   root key-encryption keys, payment keys, the keys that sign tokens for your users.
   Those belong in hardware, generated there and marked non-extractable.
2. Treat the right to call the device as the secret: separate the signing service from
   build and application hosts, authenticate it, and log every request with enough
   detail to answer "what did we sign, for whom, and when?"
3. Put rate limits and content checks in front of signing keys, so that a compromised
   caller cannot sign a thousand things or the wrong kind of thing.
4. Keep a key check value or public-key fingerprint for every key in your inventory, so
   that you can say which key a device holds without exporting it.

## 11.3 Hardware security modules

*Level: intermediate.*

The first HSMs were built for cash machines. In 1972 Mohamed Atalla, an engineer who had
worked on silicon transistors at Bell Labs, founded Atalla Corporation in California to
solve a problem the banks had just created: customers typed PINs at machines connected
to a bank's computer, and the PINs had to be checked without being visible to the
bank's own programmers and operators. His answer, sold from the early 1970s as the
"Atalla Box", was a sealed unit that held the bank's PIN keys and did the PIN
encryption and verification itself, so that the host computer only ever handled
encrypted PIN blocks. IBM followed with the 3845 and 3848 cryptographic units for its
mainframes, and the design of a separate box that holds the keys and exposes a fixed
set of **transactions** has run bank payment networks ever since: a modern payment HSM
still translates PIN blocks from one key to another, generates card verification
values and checks the cryptograms that chip cards produce.

In 1997 IBM released the 4758, a PCI card with a tamper-responding mesh around the whole
circuit board, battery-backed memory that was erased the moment the mesh was cut or the
temperature left its range, and a layered boot that would only load signed code. It was
the first device validated at FIPS 140-1 Level 4, in 1998, and its published design
(Sean Smith and Steve Weingart's papers) became the textbook for every tamper-responding
module since. Two other companies founded in the 1990s set the shape of the general
purpose HSM market: nCipher in Cambridge, England (later part of Thales, now Entrust
nShield) and Chrysalis-ITS in Ottawa, whose Luna tokens and appliances passed through
Rainbow, SafeNet, Gemalto and Thales. Utimaco, Marvell (inside several cloud HSMs),
Futurex and others make the rest.

Inside a modern HSM you find, in some combination:

- a hardened general-purpose processor running signed firmware, often with room for the
  customer's own signed code to run inside the boundary;
- accelerators for RSA, elliptic curves and AES, rated in thousands to tens of
  thousands of operations per second;
- a hardware random number generator with health tests (SP 800-90B,
  [Chapter 4](04-Randomness-in-Practice.md));
- a tamper envelope: a mesh or potting compound with sensors for cutting, drilling,
  light, temperature and voltage, wired to circuits that zeroize the master key in
  microseconds;
- a small store of master keys inside the boundary, with every other key kept outside
  as a blob wrapped under them, so that the HSM can hold millions of keys in an ordinary
  database;
- interfaces: PKCS#11 (§11.4), Microsoft CNG, Java JCE, KMIP, and vendor APIs.

The last point matters for design. Most HSMs do not store your keys in the device: they
store one or a few **master keys** and hand you each application key as an encrypted,
integrity-protected blob. The blob is useless outside an HSM that holds the master key,
so it can sit in a database, a backup or a cluster of identical HSMs. That makes the
master key's backup the most important ceremony in the system, and it is why HSM
vendors build in **quorums**.

**People are part of the boundary.** An HSM can refuse to export a key, but it cannot
tell an honest administrator from a dishonest one. So high-value HSMs split
administrative power among cards or tokens held by different people: nCipher's
"operator card sets" and "administrator card sets" need $k$ of $n$ cards, and Luna
devices use PIN-entry devices with M-of-N splits. Creating a CA root key, restoring a
master key or changing a policy then needs several named people in one room, following
a written script, on camera. The best-known example is the DNSSEC root zone. Since June
2010 the key-signing key for the root has lived in HSMs in two secure facilities, in
Culpeper, Virginia, and El Segundo, California; each **key ceremony** (several a year,
streamed online) needs three of the seven crypto officers assigned to that site to open
safe-deposit boxes holding the smart cards that activate the HSM, plus ICANN staff and
outside witnesses. The script, the video and the auditors' reports are published.

This is a threshold scheme built from procedure and hardware: the cards hold shares of
an activation secret, and the key itself never leaves the HSM. The cryptographic
version, where several devices each hold a share of the signing key and jointly sign
without the key ever being assembled (threshold RSA, FROST for Schnorr signatures,
threshold ECDSA), is taught in
[Advanced protocols, Chapter 4](../advanced/04-Threshold-Cryptography.md) of book 6
([book 6](../advanced/index.md) owns threshold signatures and multiparty computation).
In HSM practice the two are combined: cryptocurrency custodians and some CAs run
threshold signing across HSMs from different vendors in different places, so that no
single device, vendor bug or site can sign alone. The cost is complexity: threshold
ECDSA protocols have had serious implementation bugs (book 6 §4.8), and a quorum of
cards in a safe is far easier to audit.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Timeline of hardware for keys from the Atalla Box in the early 1970s to EUCLEAK in 2024" fill="currentColor" font-size="14">
<line x1="40" y1="160" x2="610" y2="160" stroke="currentColor" stroke-width="1.6"/>
<text x="40" y="186" font-size="12">1970</text>
<text x="160" y="186" font-size="12">1990</text>
<text x="280" y="186" font-size="12">2000</text>
<text x="400" y="186" font-size="12">2010</text>
<text x="520" y="186" font-size="12">2020</text>
<line x1="60" y1="160" x2="60" y2="130" stroke="currentColor"/>
<text x="40" y="122" font-size="12">Atalla Box</text>
<line x1="168" y1="160" x2="168" y2="100" stroke="currentColor"/>
<text x="120" y="92" font-size="12">FIPS 140-1 (1994)</text>
<line x1="186" y1="160" x2="186" y2="70" stroke="currentColor"/>
<text x="150" y="62" font-size="12">PKCS#11 (1995)</text>
<line x1="210" y1="160" x2="210" y2="40" stroke="currentColor"/>
<text x="170" y="32" font-size="12">IBM 4758, Level 4 (1998)</text>
<line x1="292" y1="160" x2="292" y2="130" stroke="currentColor"/>
<text x="260" y="122" font-size="12">FIPS 140-2</text>
<line x1="316" y1="160" x2="316" y2="100" stroke="currentColor"/>
<text x="290" y="92" font-size="12">Clulow's API attack (2003)</text>
<line x1="400" y1="160" x2="400" y2="70" stroke="currentColor"/>
<text x="350" y="62" font-size="12">Tookan (2010)</text>
<line x1="436" y1="160" x2="436" y2="130" stroke="currentColor"/>
<text x="420" y="122" font-size="12">Secure Enclave (2013)</text>
<line x1="448" y1="160" x2="448" y2="40" stroke="currentColor"/>
<text x="440" y="32" font-size="12">AWS KMS (2014), TPM 2.0</text>
<line x1="460" y1="160" x2="460" y2="100" stroke="currentColor"/>
<text x="470" y="92" font-size="12">SGX (2015)</text>
<line x1="484" y1="160" x2="484" y2="70" stroke="currentColor"/>
<text x="494" y="62" font-size="12">ROCA (2017)</text>
<line x1="496" y1="160" x2="496" y2="200" stroke="currentColor"/>
<text x="400" y="216" font-size="12">Foreshadow, StrongBox (2018)</text>
<line x1="508" y1="160" x2="508" y2="230" stroke="currentColor"/>
<text x="420" y="246" font-size="12">FIPS 140-3, Plundervolt (2019)</text>
<line x1="520" y1="160" x2="520" y2="260" stroke="currentColor"/>
<text x="430" y="276" font-size="12">SGAxe (2020); SGX leaves PCs</text>
<line x1="568" y1="160" x2="568" y2="290" stroke="currentColor"/>
<text x="470" y="306" font-size="12">EUCLEAK, BitLocker sniff (2024)</text>
<text x="40" y="250" font-size="12" opacity="0.8">Above the line: devices and standards.</text>
<text x="40" y="268" font-size="12" opacity="0.8">Below: the attacks of the last decade,</text>
<text x="40" y="286" font-size="12" opacity="0.8">mostly on enclaves and on the</text>
<text x="40" y="304" font-size="12" opacity="0.8">paths around the hardware.</text>
</svg>
<figcaption>Figure 11.2. Fifty years of hardware for keys. The early decades built boxes and standards; since 2017 the record is mostly attacks, on general-purpose processors' enclaves and on the paths around otherwise sound hardware.</figcaption>
</figure>

**HSMs have bugs.** An HSM is a computer with firmware, a network stack and a parser for
every command it accepts. In 2019 Jean-Baptiste Bédrune and Gabriel Campana of Ledger's
Donjon security team presented the first public remote attack on a general-purpose HSM,
at SSTIC in June and at Black Hat USA in August. They fuzzed its PKCS#11 command handler
and found 14 vulnerabilities, chained them into code execution inside the HSM, read its
secrets, and found a way past the firmware signature check, so that an implant could
persist. Ledger did not name the vendor; the vendor had fixed the flaws a year earlier
during coordinated disclosure. Earlier, Mike Bond and Ross Anderson at Cambridge had
shown in 2001 that the transaction sets of banking HSMs (IBM's Common Cryptographic
Architecture among them) let an insider combine legitimate commands to recover keys and
PINs, and the decimalization-table attack of Bond and Piotr Zieliński (2003) let a bank
programmer find a customer's PIN in about fifteen guesses. The lesson of both lines of
work is the same as §11.5's: the interface is the attack surface, and every command
that touches a key is part of it.

!!! note "Life story: the Atalla Box"
    **Born:** early 1970s, Atalla Corporation (founded 1972 by Mohamed M. Atalla) ·
    **Purpose:** to keep cash-machine PINs secret from the bank's own computers and
    staff by encrypting and verifying them inside a sealed box that held the keys ·
    **Helped:** set the pattern of a separate tamper-resistant key box with a fixed
    transaction set, which became the payment HSM; Atalla's PIN block format and
    key-management ideas fed the banking standards of the 1980s · **Status:** the
    product line survives in payment HSMs (Atalla passed through Tandem, Compaq, HP
    and Micro Focus to Utimaco, in 2018); the idea is in every HSM

**What to do.**

1. Use HSMs for keys whose theft would be catastrophic and whose use you can route
   through a service: CA roots and intermediates, code signing, payment keys, the root
   key-encryption keys of your data.
2. Run key generation, backup and restore as written ceremonies with a quorum, two
   people at least, and keep the script and the record.
3. Back up master keys only to other HSMs or to quorum-split media, and test a restore
   before you need one.
4. Keep HSM firmware current, put the HSM's management and command interfaces on their
   own network, and allow only the services that need it to connect.

## 11.4 PKCS#11: slots, sessions, handles and attributes

*Level: intermediate.*

Every HSM vendor once had its own API, and a program written for one could not use
another. In 1995 RSA Laboratories, which already published the PKCS series of
public-key standards (PKCS#1 for RSA, PKCS#7 for signed messages, PKCS#12 for key
files, all met in [Chapter 3](03-ASN1-DER-and-Key-Files.md)), released PKCS#11, a C
interface it named **Cryptoki**, "cryptographic token interface". It was written for
smart cards and grew to cover HSMs. RSA Labs published versions up to 2.20 (2004) and a
2.30 draft (2009); the work then moved to OASIS, where a PKCS 11 technical committee
took over in 2013. OASIS approved version 2.40 in April 2015, version 3.0 in June 2020
(adding EdDSA, X25519, ChaCha20-Poly1305, SHA-3 and message-based encryption calls),
and version 3.1 on 23 July 2023; version 3.2, with post-quantum mechanisms, went out
as a committee draft in April 2025 and became a committee specification late that
year. Thirty years on, PKCS#11 is the one interface nearly every HSM, smart card,
cloud HSM and software token speaks, from Firefox's certificate store (NSS) to
OpenSSL's providers, Java's SunPKCS11 and DNSSEC signers.

The model has five nouns:

- a **module**: the vendor's shared library (`libsofthsm2.so`, `opensc-pkcs11.so`),
  which the application loads and calls `C_Initialize` on;
- a **slot**: a place where a token can be, such as a card reader or a partition of an
  HSM, listed by `C_GetSlotList`;
- a **token**: the device (or partition) in the slot, with its own PINs: one for the
  security officer (`CKU_SO`), who initializes the token and resets PINs, and one for
  the normal user (`CKU_USER`), who uses the keys;
- a **session**: a logical connection opened with `C_OpenSession`, read-only or
  read-write, in which the application logs in with `C_Login` and does its work;
- an **object**: a key, certificate or data item, named inside the session by a
  **handle**, an integer with no meaning outside the module. Token objects
  (`CKA_TOKEN` true) persist; session objects vanish when the session closes.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The PKCS#11 object model: application, module, slot, token, session and objects with attributes" fill="currentColor" font-size="14">
<rect x="20" y="30" width="130" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="52" text-anchor="middle">application</text>
<text x="85" y="70" text-anchor="middle" font-size="12">C_Sign(s, data)</text>
<rect x="20" y="120" width="130" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="142" text-anchor="middle">module (.so)</text>
<text x="85" y="160" text-anchor="middle" font-size="12">vendor library</text>
<line x1="85" y1="80" x2="85" y2="114" stroke="currentColor" stroke-width="1.4"/>
<polygon points="85,120 81,112 89,112"/>
<rect x="190" y="30" width="420" height="250" rx="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 3"/>
<text x="200" y="50" font-size="12">slot 0 (reader or HSM partition)</text>
<rect x="210" y="60" width="380" height="205" rx="6" fill="currentColor" opacity="0.08"/>
<rect x="210" y="60" width="380" height="205" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="222" y="80" font-weight="bold">token</text>
<text x="290" y="80" font-size="12">SO PIN, user PIN, retry counters</text>
<rect x="225" y="92" width="120" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="285" y="110" text-anchor="middle" font-size="12">session s</text>
<text x="285" y="125" text-anchor="middle" font-size="12">logged in as user</text>
<line x1="150" y1="145" x2="219" y2="117" stroke="currentColor" stroke-width="1.4"/>
<polygon points="225,115 216,114 219,121"/>
<rect x="370" y="92" width="205" height="160" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="382" y="110" font-size="12" font-weight="bold">object, handle 7</text>
<text x="382" y="130" font-size="12">CKA_CLASS = CKO_SECRET_KEY</text>
<text x="382" y="148" font-size="12">CKA_TOKEN = true</text>
<text x="382" y="166" font-size="12">CKA_SENSITIVE = true</text>
<text x="382" y="184" font-size="12">CKA_EXTRACTABLE = false</text>
<text x="382" y="202" font-size="12">CKA_DECRYPT = true</text>
<text x="382" y="220" font-size="12">CKA_WRAP = false</text>
<text x="382" y="240" font-size="12" opacity="0.8">CKA_VALUE: never returned</text>
<line x1="345" y1="112" x2="364" y2="112" stroke="currentColor" stroke-width="1.2"/>
<polygon points="370,112 363,108 363,116"/>
<text x="225" y="160" font-size="12">mechanisms:</text>
<text x="225" y="178" font-size="12">CKM_AES_GCM</text>
<text x="225" y="196" font-size="12">CKM_ECDSA</text>
<text x="225" y="214" font-size="12">CKM_RSA_PKCS_PSS</text>
<text x="225" y="232" font-size="12">CKM_AES_KEY_WRAP</text>
</svg>
<figcaption>Figure 11.3. The PKCS#11 model. The application loads a vendor module, opens a session on a token, logs in, and names keys by handles. What a key may do is written in its attributes, and the token enforces them.</figcaption>
</figure>

What a key may do is set by its **attributes**, chosen in a template when the key is
created. Four of them carry most of the security:

| Attribute | Meaning | Rule in the standard |
| --- | --- | --- |
| `CKA_SENSITIVE` | the value can never be read in the clear | may change only from false to true |
| `CKA_EXTRACTABLE` | the key may leave, wrapped under another key | may change only from true to false |
| `CKA_WRAP` / `CKA_UNWRAP` | the key may encrypt / decrypt other keys | set by the template |
| `CKA_ENCRYPT` / `CKA_DECRYPT` | the key may encrypt / decrypt data | set by the template |

Two read-only attributes record history: `CKA_ALWAYS_SENSITIVE` and
`CKA_NEVER_EXTRACTABLE` stay true only if the key has been sensitive and unextractable
since it was created, which is how a relying party can tell a key born in the token
from one imported into it. `CKA_MODIFIABLE` false freezes the rest, and since version
2.20 `CKA_TRUSTED` and `CKA_WRAP_WITH_TRUSTED` let the security officer mark a few keys
as trusted wrapping keys and say that a given key may be wrapped only by those.

Creating an AES key that never leaves, in C, looks like this (the template is the
security decision; the rest is plumbing):

```c
CK_BBOOL yes = CK_TRUE, no = CK_FALSE;
CK_ULONG len = 32;
CK_ATTRIBUTE tmpl[] = {
    {CKA_TOKEN,       &yes, sizeof yes},   /* stored on the token          */
    {CKA_SENSITIVE,   &yes, sizeof yes},   /* value never readable         */
    {CKA_EXTRACTABLE, &no,  sizeof no},    /* not even wrapped for backup  */
    {CKA_ENCRYPT,     &yes, sizeof yes},
    {CKA_DECRYPT,     &yes, sizeof yes},
    {CKA_WRAP,        &no,  sizeof no},
    {CKA_UNWRAP,      &no,  sizeof no},
    {CKA_VALUE_LEN,   &len, sizeof len},
};
CK_MECHANISM mech = {CKM_AES_KEY_GEN, NULL, 0};
CK_OBJECT_HANDLE key;
CK_RV rv = C_GenerateKey(session, &mech, tmpl, sizeof tmpl / sizeof tmpl[0], &key);
```

From Python, the third-party `python-pkcs11` and `PyKCS11` packages wrap the same calls,
and SoftHSM, a software token from the OpenDNSSEC project, lets you test PKCS#11 code
without hardware. (Use it only for tests: a software token's keys are in a file.)

Three traps catch PKCS#11 programmers often enough to name:

- **Defaults differ by vendor.** If a template leaves out `CKA_SENSITIVE` or
  `CKA_EXTRACTABLE`, the module chooses, and modules choose differently. Always state
  every security attribute explicitly, and read them back after creation with
  `C_GetAttributeValue` to check.
- **Handles are not names.** A handle is valid only in the application and module that
  produced it, and may be reused after an object is destroyed. Find keys by `CKA_LABEL`
  or `CKA_ID` at start-up and keep the handles in memory.
- **Sessions and threads.** A session is not thread-safe in many modules, and an
  HSM limits how many are open. Use a pool of sessions, one per worker, and handle
  `CKR_SESSION_HANDLE_INVALID` after a network HSM restarts by logging in again.

!!! note "Life story: PKCS#11"
    **Born:** 1995, RSA Laboratories, as "Cryptoki", one of the PKCS documents ·
    **Purpose:** one C interface to any cryptographic token, so that an application
    could use smart cards and HSMs from different vendors without change ·
    **Helped:** became the common language of HSMs, smart cards and cloud HSMs; its
    attribute model made "sensitive" and "non-extractable" standard ideas; its API
    attacks (2003, 2010) created the field of formally analyzed security APIs ·
    **Status:** maintained by the OASIS PKCS 11 technical committee since 2013;
    version 2.40 (2015), 3.0 (2020) and 3.1 (2023) are OASIS standards; 3.2, with
    post-quantum mechanisms, a committee specification since late 2025

## 11.5 Break it, fix it: the PKCS#11 API attacks

*Level: intermediate.*

In 2003 Jolyon Clulow, a doctoral student in Ross Anderson's group at Cambridge,
published "On the Security of PKCS #11" at the CHES workshop. His first observation is
the one the introduction to this chapter promised. PKCS#11 lets a key be both a
wrapping key and a decryption key. Wrapping is encryption of a key; decryption returns
the plaintext of a ciphertext. So:

1. Find, or create, a key $W$ with `CKA_WRAP` and `CKA_DECRYPT` both true.
2. Call `C_WrapKey` to wrap the target key $K$ (sensitive, but extractable, as backup
   keys are) under $W$: $c = E_W(K)$.
3. Call `C_Decrypt` on $c$ with $W$: the token returns $D_W(c) = K$, in the clear.

No call returned a sensitive value directly, and each call obeyed the rules for its own
attributes. Clulow found more: wrapping a strong key under a weaker one (a triple-DES
key under single DES, then a brute-force search of the weak key); wrapping a key in
pieces so that each piece could be found separately; and importing a key the attacker
already knows through `C_UnwrapKey`, then using it to wrap the target. The standard did
not say which combinations to forbid, so tokens allowed all of them.

Five years later Stéphanie Delaune, Steve Kremer and Graham Steel modeled PKCS#11 as a
set of rules about which values an attacker can learn and gave the model to a model
checker (CSF 2008), which found Clulow's attacks and new ones automatically. In 2010
Matteo Bortolozzo, Matteo Centenaro, Riccardo Focardi and Graham Steel built **Tookan**,
a tool that reverse-engineers what a real token allows, builds the model, runs the model
checker and then replays any attack it finds on the device. At ACM CCS 2010 they
reported on 17 commercial tokens and smart cards: 9 gave up sensitive keys to attacks
found this way, and the other 8 avoided it mostly by supporting so few functions that
they were barely useful. Keys came out of devices from Aladdin, Bull, Gemalto, RSA and
Siemens, among others. One attack the tool found had not been published before: it
needed no conflicting attributes on any single key, only a wrap followed by an unwrap
that created a second copy of the target with different attributes.

**Break it.** The toy token below models PKCS#11's objects, handles and attributes,
with the toy cipher of an HMAC-SHA256 keystream standing in for AES. It obeys every rule
it states: a sensitive key's value is never returned. Three sequences of legal calls
still return it.

```python
import hashlib, hmac, random

rng = random.Random(1995)   # repeatable here; a real token uses its hardware generator
def rand(n):
    return bytes(rng.randrange(256) for _ in range(n))

# A toy cipher: HMAC-SHA256 in counter mode stands in for AES (standard library only).
def stream(key, nonce, n):
    blocks = (hmac.new(key, nonce + i.to_bytes(4, "big"), hashlib.sha256).digest()
              for i in range((n + 31) // 32))
    return b"".join(blocks)[:n]

def encrypt(key, data):
    nonce = rand(12)
    return nonce + bytes(a ^ b for a, b in zip(data, stream(key, nonce, len(data))))

def decrypt(key, blob):
    nonce, body = blob[:12], blob[12:]
    return bytes(a ^ b for a, b in zip(body, stream(key, nonce, len(body))))

DEFAULTS = dict(sensitive=True, extractable=False, wrap=False, unwrap=False,
                encrypt=False, decrypt=False)

class Token:
    """PKCS#11 in miniature: key objects behind handles, each with attributes."""

    def __init__(self):
        self.obj = {}

    def _new(self, value, attrs):
        self.obj[len(self.obj) + 1] = dict(DEFAULTS, **attrs, value=value)
        return len(self.obj)

    def generate_key(self, **attrs):                       # C_GenerateKey
        return self._new(rand(16), attrs)

    def set_attribute(self, h, **attrs):                   # C_SetAttributeValue
        self.obj[h].update(attrs)

    def get_value(self, h):                                # C_GetAttributeValue
        if self.obj[h]["sensitive"]:
            raise PermissionError("CKR_ATTRIBUTE_SENSITIVE")
        return self.obj[h]["value"]

    def wrap_key(self, wrapping, target):                  # C_WrapKey
        if not self.obj[wrapping]["wrap"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        if not self.obj[target]["extractable"]:
            raise PermissionError("CKR_KEY_UNEXTRACTABLE")
        return encrypt(self.obj[wrapping]["value"], self.obj[target]["value"])

    def unwrap_key(self, unwrapping, blob, **template):    # C_UnwrapKey
        if not self.obj[unwrapping]["unwrap"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        return self._new(decrypt(self.obj[unwrapping]["value"], blob), template)

    def decrypt(self, h, blob):                            # C_Decrypt
        if not self.obj[h]["decrypt"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        return decrypt(self.obj[h]["value"], blob)

def attacks(tok, secret):
    real = tok.obj[secret]["value"]          # we peek, only to check the results
    def report(name, attack):
        try:
            print(f"  {name:14s}", "LEAKED" if attack() == real else "no")
        except PermissionError as e:
            print(f"  {name:14s} refused: {e}")
    def direct():
        return tok.get_value(secret)
    def wrap_then_decrypt():                 # Clulow (2003)
        k = tok.generate_key(wrap=True, decrypt=True)
        return tok.decrypt(k, tok.wrap_key(k, secret))
    def add_role_later():                    # the same, one attribute at a time
        k = tok.generate_key(wrap=True)
        blob = tok.wrap_key(k, secret)
        tok.set_attribute(k, decrypt=True)
        return tok.decrypt(k, blob)
    def reimport():                          # unwrap a copy that is not sensitive
        k = tok.generate_key(wrap=True, unwrap=True)
        blob = tok.wrap_key(k, secret)
        return tok.get_value(tok.unwrap_key(k, blob, sensitive=False))
    for name, attack in [("read value", direct), ("wrap+decrypt", wrap_then_decrypt),
                         ("add role later", add_role_later), ("re-import", reimport)]:
        report(name, attack)

tok = Token()
# A data key that may be exported, wrapped, for backup. Sensitive, so never read in clear.
secret = tok.generate_key(extractable=True, encrypt=True, decrypt=True)
attacks(tok, secret)
```

It prints:

```
  read value     refused: CKR_ATTRIBUTE_SENSITIVE
  wrap+decrypt   LEAKED
  add role later LEAKED
  re-import      LEAKED
```

The direct read is refused, as the attribute promises, and then the key comes out three
ways. The second attack is the reason a check at creation time is not enough: if roles
can be added later with `C_SetAttributeValue`, the conflict is assembled one legal step
at a time. The third needs no conflict on any key at all; the copy made by
`C_UnwrapKey` simply takes whatever attributes the caller's template asks for. (The
real standard already makes `CKA_SENSITIVE` one-way, as the table in §11.4 says; Tookan
found tokens that did not enforce even that, and the unwrap path, which creates a new
object, was never covered by the rule.)

**Fix it.** The fix is a policy, enforced inside the token on every path that creates
or changes a key. It has three parts, each answering one attack:

1. **No conflicting roles on one key.** A key may wrap or decrypt, never both; may
   unwrap or encrypt, never both (the second pair stops an attacker from encrypting a
   value of their choice and unwrapping it as a "key" they know).
2. **Sticky attributes.** Roles cannot be changed after creation; `sensitive` can only
   become true and `extractable` only false.
3. **Wrapped keys carry their attributes.** The wrapped blob includes the key's
   attributes under a MAC with the wrapping key, and unwrapping restores exactly those
   attributes, refusing any template that asks for different ones. A key can then
   travel between tokens without ever being weakened on the way.

```python
import hashlib, hmac, random

rng = random.Random(1995)   # repeatable here; a real token uses its hardware generator
def rand(n):
    return bytes(rng.randrange(256) for _ in range(n))

def stream(key, nonce, n):   # the same toy cipher as in the Break it code
    blocks = (hmac.new(key, nonce + i.to_bytes(4, "big"), hashlib.sha256).digest()
              for i in range((n + 31) // 32))
    return b"".join(blocks)[:n]

def encrypt(key, data):
    nonce = rand(12)
    return nonce + bytes(a ^ b for a, b in zip(data, stream(key, nonce, len(data))))

def decrypt(key, blob):
    nonce, body = blob[:12], blob[12:]
    return bytes(a ^ b for a, b in zip(body, stream(key, nonce, len(body))))

DEFAULTS = dict(sensitive=True, extractable=False, wrap=False, unwrap=False,
                encrypt=False, decrypt=False)
CONFLICTS = [("wrap", "decrypt"), ("unwrap", "encrypt")]
ROLES = ("wrap", "unwrap", "encrypt", "decrypt")
NAMES = sorted(DEFAULTS)

class SafeToken:
    """The same token with a policy: no conflicting roles, sticky attributes,
    and wrapped keys that carry their attributes with them."""

    def __init__(self):
        self.obj = {}

    def _new(self, value, attrs):
        a = dict(DEFAULTS, **attrs)
        for x, y in CONFLICTS:
            if a[x] and a[y]:
                raise PermissionError(f"CKR_TEMPLATE_INCONSISTENT ({x} with {y})")
        self.obj[len(self.obj) + 1] = dict(a, value=value)
        return len(self.obj)

    def generate_key(self, **attrs):
        return self._new(rand(16), attrs)

    def set_attribute(self, h, **attrs):
        for name, v in attrs.items():
            if name in ROLES or (name == "sensitive" and not v) or (name == "extractable" and v):
                raise PermissionError(f"CKR_ATTRIBUTE_READ_ONLY ({name})")
        self.obj[h].update(attrs)

    def get_value(self, h):
        if self.obj[h]["sensitive"]:
            raise PermissionError("CKR_ATTRIBUTE_SENSITIVE")
        return self.obj[h]["value"]

    def _seal(self, key, meta, body):
        return hmac.new(key, b"wrapped key" + meta + body, hashlib.sha256).digest()

    def wrap_key(self, wrapping, target):
        w, t = self.obj[wrapping], self.obj[target]
        if not w["wrap"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        if not t["extractable"]:
            raise PermissionError("CKR_KEY_UNEXTRACTABLE")
        meta = bytes([sum(1 << i for i, n in enumerate(NAMES) if t[n])])
        body = encrypt(w["value"], t["value"])
        return meta + body + self._seal(w["value"], meta, body)

    def unwrap_key(self, unwrapping, blob, **template):
        u = self.obj[unwrapping]
        if not u["unwrap"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        meta, body, tag = blob[:1], blob[1:-32], blob[-32:]
        if not hmac.compare_digest(tag, self._seal(u["value"], meta, body)):
            raise PermissionError("CKR_WRAPPED_KEY_INVALID")
        attrs = {n: bool(meta[0] >> i & 1) for i, n in enumerate(NAMES)}
        if any(template.get(n, attrs[n]) != attrs[n] for n in NAMES):
            raise PermissionError("CKR_TEMPLATE_INCONSISTENT (the blob fixes the attributes)")
        return self._new(decrypt(u["value"], body), attrs)

    def decrypt(self, h, blob):
        if not self.obj[h]["decrypt"]:
            raise PermissionError("CKR_KEY_FUNCTION_NOT_PERMITTED")
        return decrypt(self.obj[h]["value"], blob)

def attacks(tok, secret):    # the same three attacks
    real = tok.obj[secret]["value"]
    def report(name, attack):
        try:
            print(f"  {name:14s}", "LEAKED" if attack() == real else "no")
        except PermissionError as e:
            print(f"  {name:14s} refused: {e}")
    def direct():
        return tok.get_value(secret)
    def wrap_then_decrypt():
        k = tok.generate_key(wrap=True, decrypt=True)
        return tok.decrypt(k, tok.wrap_key(k, secret))
    def add_role_later():
        k = tok.generate_key(wrap=True)
        blob = tok.wrap_key(k, secret)
        tok.set_attribute(k, decrypt=True)
        return tok.decrypt(k, blob)
    def reimport():
        k = tok.generate_key(wrap=True, unwrap=True)
        blob = tok.wrap_key(k, secret)
        return tok.get_value(tok.unwrap_key(k, blob, sensitive=False))
    for name, attack in [("read value", direct), ("wrap+decrypt", wrap_then_decrypt),
                         ("add role later", add_role_later), ("re-import", reimport)]:
        report(name, attack)

tok = SafeToken()
secret = tok.generate_key(extractable=True, encrypt=True, decrypt=True)
attacks(tok, secret)

# The honest use still works: back the key up under a wrap-only key, restore it.
backup = tok.generate_key(wrap=True, unwrap=True)
restored = tok.unwrap_key(backup, tok.wrap_key(backup, secret))
old = encrypt(tok.obj[secret]["value"], b"payroll, March")   # made with the original
print("restored copy decrypts:", tok.decrypt(restored, old))
print("restored copy sensitive:", tok.obj[restored]["sensitive"])
```

It prints:

```
  read value     refused: CKR_ATTRIBUTE_SENSITIVE
  wrap+decrypt   refused: CKR_TEMPLATE_INCONSISTENT (wrap with decrypt)
  add role later refused: CKR_ATTRIBUTE_READ_ONLY (decrypt)
  re-import      refused: CKR_TEMPLATE_INCONSISTENT (the blob fixes the attributes)
restored copy decrypts: b'payroll, March'
restored copy sensitive: True
```

All three attacks are refused, and the reason for each refusal names the rule it broke.
The legitimate operation, a backup and restore that preserves the key's protection,
still works. The `backup` key has both wrap and unwrap, which is allowed: those two
roles move keys only into and out of the token's protection, never into the caller's
hands.

This policy is not a proof. Bortolozzo and his co-authors implemented a secure
configuration as a patch to a software token and checked it with their model; Véronique
Cortier and Graham Steel had designed a key-management API with a security proof
(ESORICS 2009) in which each key's use is fixed by a level, so that a key can only wrap
keys of a lower level. In practice vendors ship a mixture: conflicting roles are
refused in "restricted" or "FIPS" modes, wrap templates and trusted wrapping keys are
supported, and attribute-carrying blobs are how HSMs move keys between their own
devices. France's ANSSI published Caml Crush (2015), a PKCS#11 proxy that sits between
applications and a token and filters calls by such a policy, for tokens that cannot be
fixed.

!!! note "Life story: the PKCS#11 API attacks"
    **Born:** 2003, Jolyon Clulow, "On the Security of PKCS #11" (CHES 2003), after Mike
    Bond and Ross Anderson's API attacks on banking HSMs (2001); automated by Delaune,
    Kremer and Steel (CSF 2008) and by Bortolozzo, Centenaro, Focardi and Steel's
    Tookan (ACM CCS 2010) · **Purpose:** to show that a set of individually safe key
    operations can be combined to return a "sensitive" key in the clear · **Helped:**
    made trusted wrapping keys, wrap templates, sticky attributes and restricted modes
    standard features; started the formal analysis of security APIs · **Status:** the
    wrap-then-decrypt attack still works on any token configured to allow it; the
    defense is a policy you must turn on and check

**What to do.**

1. Create every key with a full template, never relying on defaults: sensitive true,
   extractable false unless backup by wrapping is required, and only the roles the key
   needs.
2. Never give one key both wrap and decrypt, or both unwrap and encrypt. Make roles
   unmodifiable (`CKA_MODIFIABLE` false).
3. Allow wrapping only under trusted wrapping keys that the security officer controls
   (`CKA_WRAP_WITH_TRUSTED`), and use the module's restricted or FIPS mode, which
   enforces most of this.
4. Read back the attributes of every key you rely on, in a start-up check, and alarm if
   they are not what you expect.

## 11.6 FIPS 140-3 and its four levels

*Level: intermediate.*

Buyers of HSMs, governments first, needed a way to know that a box did what its maker
claimed without opening it themselves. In January 1994 NIST published FIPS 140-1,
Security Requirements for Cryptographic Modules, and in July 1995 NIST and Canada's
Communications Security Establishment started the **Cryptographic Module Validation
Program** (CMVP), today run on the Canadian side by CSE's cyber security
agency. Accredited private laboratories test a module against the standard, the CMVP
reviews the lab's report, and the module receives a numbered certificate listed on
NIST's website. FIPS 140-2 replaced the first version in May 2001. FIPS 140-3, approved
on 22 March 2019 and effective that September, does not contain its own requirements:
it points to the international standard ISO/IEC 19790:2012 and its test methods,
ISO/IEC 24759, with US changes in NIST's SP 800-140 series. The CMVP stopped accepting
FIPS 140-2 submissions in 2021, and on 21 September 2026 the remaining FIPS 140-2
certificates moved to the historical list; agencies may keep using such modules in
existing systems, but not choose them for new ones.

A module is defined by its **boundary**: the box, chip, card or piece of software that
the certificate covers. The standard sets requirements in eleven areas (specification,
interfaces, roles and authentication, software and firmware security, operating
environment, physical security, non-invasive security, management of sensitive
security parameters, self-tests, life-cycle assurance, mitigation of other attacks),
and grades the module at one of four levels.

| Level | Physical security | Authentication | Typical module |
| --- | --- | --- | --- |
| 1 | production-grade parts; nothing more | none required | a software library (OpenSSL's FIPS provider, BoringCrypto, AWS-LC) |
| 2 | tamper evidence: seals, coatings, opaque covers | role-based | a smart card, a TPM, some appliances |
| 3 | tamper resistance and response: opening it erases keys | identity-based; keys enter and leave only encrypted or by trusted channel | most network HSMs and cloud HSMs |
| 4 | a complete protective envelope; protection against voltage and temperature outside the operating range | multi-factor | the most hardened HSMs |

Levels 3 and 4 also bring in the non-invasive (side-channel) requirements that
[Chapter 7](07-Masking-and-Fault-Resistance.md) §7.10 describes, together with what
they do and do not test. Every level requires approved algorithms (validated
separately, by the Cryptographic Algorithm Validation Program, with test vectors;
[Chapter 17](17-Choosing-Testing-and-Verifying.md) shows how such tests work), power-on
and conditional self-tests, and a public **security policy**: a document that lists the
approved and non-approved services, the roles, the keys and how each is zeroized, and
the rules an operator must follow to use the module in its validated configuration.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="FIPS 140-3 levels as a staircase, each adding requirements to the one below" fill="currentColor" font-size="14">
<rect x="30" y="200" width="140" height="50" fill="currentColor" opacity="0.10"/>
<rect x="30" y="200" width="140" height="50" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="100" y="222" text-anchor="middle" font-weight="bold">Level 1</text>
<text x="100" y="240" text-anchor="middle" font-size="12">approved algorithms</text>
<rect x="180" y="150" width="140" height="100" fill="currentColor" opacity="0.16"/>
<rect x="180" y="150" width="140" height="100" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="172" text-anchor="middle" font-weight="bold">Level 2</text>
<text x="250" y="190" text-anchor="middle" font-size="12">+ tamper evidence</text>
<text x="250" y="206" text-anchor="middle" font-size="12">+ role-based login</text>
<rect x="330" y="100" width="140" height="150" fill="currentColor" opacity="0.22"/>
<rect x="330" y="100" width="140" height="150" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="122" text-anchor="middle" font-weight="bold">Level 3</text>
<text x="400" y="140" text-anchor="middle" font-size="12">+ tamper response</text>
<text x="400" y="156" text-anchor="middle" font-size="12">+ identity-based login</text>
<text x="400" y="172" text-anchor="middle" font-size="12">+ trusted channels</text>
<text x="400" y="188" text-anchor="middle" font-size="12">+ side-channel tests</text>
<rect x="480" y="50" width="140" height="200" fill="currentColor" opacity="0.28"/>
<rect x="480" y="50" width="140" height="200" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="550" y="72" text-anchor="middle" font-weight="bold">Level 4</text>
<text x="550" y="90" text-anchor="middle" font-size="12">+ full envelope</text>
<text x="550" y="106" text-anchor="middle" font-size="12">+ voltage and</text>
<text x="550" y="122" text-anchor="middle" font-size="12">temperature protection</text>
<text x="550" y="138" text-anchor="middle" font-size="12">+ multi-factor login</text>
<line x1="30" y1="250" x2="620" y2="250" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="272" font-size="12" opacity="0.8">Each level includes everything below it. None says the firmware has no bugs.</text>
</svg>
<figcaption>Figure 11.4. The four levels of FIPS 140-3 (ISO/IEC 19790). Each adds physical protection and stronger operator authentication; side-channel testing enters at Level 3. A certificate covers the module's boundary in its validated configuration, and nothing outside it.</figcaption>
</figure>

**Reading a certificate.** A FIPS 140-3 certificate is useful evidence, and it is often
read as more than it says. Four questions keep you honest:

1. **Which module and version?** The certificate names exact hardware, firmware and
   software versions. A firmware update that has not been validated is, formally, a
   different module. Because validations take a long time (in recent years, more than a
   year from submission to certificate has been common), vendors often ship versions
   newer than the validated one; ask which you are running.
2. **Which operating environment?** A software module is validated on the platforms
   the lab tested. "FIPS validated" software on an untested platform is "vendor
   affirmed" at best.
3. **Which mode?** Most modules have an approved mode and other modes. The security
   policy says how to enter the approved mode (OpenSSL 3 calls it loading the FIPS
   provider; HSMs call it FIPS mode or restricted mode), and in the other modes the
   certificate says nothing.
4. **Validated or "compliant"?** "FIPS 140 compliant", "FIPS-ready" or "uses FIPS
   algorithms" are marketing phrases with no certificate behind them. Search the CMVP
   list for the certificate number.

What a certificate does not cover is equally important. It does not say the firmware
has no exploitable bugs (Ledger's 2019 HSM attack hit a validated product); it does not
evaluate the application's use of the module, which is where Adobe and DigiNotar failed;
and below Level 3 it does not say the device resists side channels. Common Criteria,
which attacks the device rather than checking requirements, is the complement
([Chapter 7](07-Masking-and-Fault-Resistance.md) §7.10).

!!! note "Life story: FIPS 140"
    **Born:** January 1994, NIST, FIPS 140-1, with the CMVP (NIST and Canada's CSE)
    from July 1995 · **Purpose:** one set of testable requirements for cryptographic
    modules, so that US and Canadian government buyers could rely on a laboratory's
    report instead of their own analysis · **Helped:** made "validated" a purchasing
    condition well beyond government (finance, health care, cloud), and gave HSMs,
    smart cards and libraries a common ladder of four levels · **Status:** FIPS 140-3
    (2019), built on ISO/IEC 19790; FIPS 140-2 certificates became historical on 21
    September 2026; validation queues are long, which pushes vendors to ship versions
    newer than the ones validated

**What to do.**

1. If you must buy validated, ask for the certificate number and read the security
   policy, not the brochure.
2. Run the module in its approved mode, on a validated version and platform, and keep
   evidence of that for your auditors.
3. Choose Level 3 for keys an attacker could reach physically (data-center HSMs), and
   remember that Level 1 is a statement about algorithms, not about protection.
4. Do not stop at the certificate: the firmware patch level, the network exposure and
   who can call the module matter more in most breaches.

## 11.7 Cloud KMS and cloud HSMs

*Level: intermediate.*

Most keys that live in hardware today live in someone else's. Amazon offered the first
cloud HSM in March 2013 (AWS CloudHSM, at first SafeNet Luna appliances rented one per
customer) and the first multi-tenant key service on 12 November 2014, the **AWS Key
Management Service**. Microsoft's Azure Key Vault reached general availability in 2015,
and Google launched Cloud KMS in 2017 and an HSM-backed tier, Cloud HSM, in beta in
August 2018. Microsoft added a single-tenant Azure Key Vault Managed HSM, generally
available in June 2021. The offers fall into two kinds.

- **Key management services** (AWS KMS, Google Cloud KMS, Azure Key Vault) are an API.
  You create a key and receive an identifier; you call `Encrypt`, `Decrypt`, `Sign` or
  `GenerateDataKey` over HTTPS; the provider's fleet of HSMs does the work. The key
  cannot be exported in the clear. Access is controlled by the cloud's identity system
  and a key policy, every call is logged (AWS CloudTrail, Google Cloud Audit Logs, Azure
  Monitor), automatic rotation keeps old versions for decryption
  ([Chapter 10](10-The-Life-of-a-Key.md)), and deletion waits a configurable period
  (7 to 30 days on AWS) so that a mistake can be undone.
- **Dedicated HSMs** (AWS CloudHSM, Azure Managed HSM and Dedicated HSM, Google's
  single-tenant Cloud HSM) give you an HSM partition that only you administer, with
  PKCS#11, JCE or CNG interfaces. You get the control of §11.3 and its duties too:
  clustering, backups, users and quorum.

A KMS is built for envelope encryption ([Chapter 14](14-Encrypting-Application-Data.md)):
`Encrypt` takes at most 4 KB, so bulk data is encrypted locally with a data key, and
only the data key goes to the service. `GenerateDataKey` returns the data key twice,
once in the clear for immediate use and once wrapped under the KMS key for storage
beside the data.

**Quotas and latency.** Every call is a network round trip of milliseconds, and calls
are rationed. AWS KMS shares one request quota for symmetric cryptographic operations
across an account in a region: 10,000 per second in several regions, and since July
2024 up to 100,000 in the largest ones (the quota can be raised on request). A worked
example shows how quickly that is reached. A service that stores 30,000 objects a
second, each with its own data key, needs 30,000 `GenerateDataKey` calls a second and
is throttled. Reusing each data key for 1,000 objects needs 30 calls a second. That is
what the data key caching in AWS's Encryption SDK does, at a price: one plaintext data
key stays in memory longer and protects more data, so set the limits (messages, bytes,
seconds) on purpose. Decryption is the harder case, because every reader of an old
object needs its data key unwrapped; caches of unwrapped data keys, keyed by the
wrapped key, are the usual answer. And a KMS outage in your region is an outage of
everything that decrypts, so plan for it as you would for a database.

**What the provider can see.** The provider runs the HSMs, the software in front of
them, and the identity system that decides who may call. AWS publishes the design of
its KMS (the HSMs are validated at FIPS 140-3 Level 3, operators cannot use keys
directly, and changes to the HSM software need a quorum of AWS staff), and the other
providers make similar statements. What none can avoid is that:

- the provider sees every request's metadata: which key, which caller, when, from
  where, and the encryption context you attach;
- data you send to `Encrypt` and data keys returned by `Decrypt` pass through the
  provider's front end in the clear, inside TLS;
- when a provider's own service (a database, object storage) encrypts with your key on
  your behalf, it holds your plaintext data keys in its memory while it works;
- a legal order to the provider reaches the keys as far as the provider's own access
  does.

For customers who need more, the providers offer keys held outside: AWS External Key
Store (2022), Google Cloud External Key Manager and Azure's equivalents send each
wrap or unwrap to an HSM that the customer runs. That gives the customer a switch: cut
the connection and the provider's services can no longer decrypt new requests. It does
not hide data already decrypted in the provider's memory, and it makes the customer's
key server a single point of failure for everything.

!!! note "Life story: AWS KMS"
    **Born:** 12 November 2014, Amazon Web Services, after the single-tenant CloudHSM
    of March 2013 · **Purpose:** non-exportable keys behind an API, integrated with the
    provider's storage and databases, so that encryption at rest needs no key handling
    by the customer · **Helped:** made envelope encryption with hardware-held master
    keys the default for a large share of the world's stored data, and was copied by
    Google Cloud KMS (2017) and Azure Key Vault (2015) · **Status:** current; its HSMs
    validated at FIPS 140-3 Level 3; external key stores since 2022

**What to do.**

1. Use the cloud KMS for master keys and envelope encryption; keep plaintext data keys
   in memory only as long as your cache policy says.
2. Write key policies that separate administrators (who can manage keys) from users
   (who can encrypt and decrypt), and alarm on policy changes and on deletions.
3. Bind ciphertexts to their context with the encryption context or associated data,
   and log it, so that a decrypt call for the wrong record fails and shows up.
4. Model your quota and latency before launch, and decide what your service does when
   the KMS is throttling or down.

## 11.8 TPM 2.0 and measured boot

*Level: intermediate.*

In 1999 Compaq, HP, IBM, Intel and Microsoft formed the Trusted Computing Platform
Alliance to put a small security chip in every PC. Its successor, the **Trusted
Computing Group** (2003), published TPM 1.2, standardized as ISO/IEC 11889 in 2009, and
then TPM 2.0, a redesign published in 2014 and adopted as ISO/IEC 11889:2015. TPM 1.2
knew only SHA-1 and RSA; TPM 2.0 is algorithm-agile (SHA-256, elliptic curves, and
more). Since 2016 Microsoft has required TPM 2.0 on new Windows devices, and Windows 11
(2021) refuses to install without one. A TPM comes as a **discrete** chip on the
motherboard, talking to the processor over the LPC, SPI or I2C bus; as a **firmware**
TPM running in the processor's own security processor (Intel PTT, AMD fTPM); inside the
CPU package (Microsoft's Pluton, 2020); or as a **virtual** TPM for a virtual machine.

A TPM is slow and has very little memory, so it keeps almost nothing. Its persistent
secrets are a few **seeds**, one per hierarchy: platform (for the firmware), storage
(for the owner), endorsement (for identity). A primary key, such as the storage root
key, is derived from a seed and a template by a KDF each time it is needed, so it is
the same key every time without being stored. Every other key is created under a
parent and handed back to the caller as a blob wrapped by that parent, to be loaded
again later, as with an HSM (§11.3).

Two keys give a TPM its identity.

- The **endorsement key** (EK) is derived from the endorsement seed, and the
  manufacturer (Infineon, STMicroelectronics, Nuvoton and others) signs an **EK
  certificate** for it at the factory. It says "this is a genuine TPM". It is a
  decryption key, not a signing key, deliberately: a permanent, unique signing identity
  would let every signature be linked to one machine.
- An **attestation key** (AK) is a *restricted* signing key: it will sign only data
  that the TPM itself produced, which begins with a fixed magic value, never data
  supplied from outside. That stops anyone from getting the AK to sign something that
  looks like a TPM statement. A certificate authority confirms that an AK lives in the
  same TPM as a known EK with a challenge encrypted to the EK
  (`TPM2_MakeCredential`/`TPM2_ActivateCredential`).

**Platform configuration registers.** A PCR is a 32-byte register (in the SHA-256
bank) that is set to zero at reset and can only be **extended**:

$$\mathrm{PCR}_{\text{new}} = \mathrm{SHA256}(\mathrm{PCR}_{\text{old}} \,\|\, d),$$

where $d$ is the digest of whatever is being measured. There is no command to set a PCR
to a value. Because SHA-256 is preimage resistant, the final value commits to the whole
ordered sequence of measurements: no other sequence leads to it, and nothing extended
later can bring it back. In **measured boot**, each stage measures the next before
running it: the firmware's root of trust measures the rest of the firmware into PCR 0,
the firmware measures the Secure Boot configuration into PCR 7 and the boot manager
into PCR 4, the boot loader measures the kernel, and so on. Each stage also writes an
entry to the **event log**, a list of (PCR, description, digest) kept in ordinary
memory, which Linux exposes at `/sys/kernel/security/tpm0/binary_bios_measurements`.

A worked example. The firmware image is the bytes `vendor firmware image 1.42`. Its
SHA-256 digest begins `1da3950d`. PCR 0 starts as 32 zero bytes, so after the first
extend it is $\mathrm{SHA256}(0^{32} \,\|\, \texttt{1da3950d...})$, which begins
`d42fcf97`. Anyone with the log can repeat this computation; nobody can produce a
different log that reaches `d42fcf97...`.

Measured boot and **Secure Boot** are different things that work together. Secure Boot
enforces: firmware refuses to run a boot loader whose signature is not in its database.
Measured boot only records, and runs anything, but the record cannot be falsified
afterward. A machine with both refuses the obvious attack and reports the subtle one.

**Code it.** A TPM reduced to its PCRs, a boot that measures each stage, a replay of
the event log, and then a bootkit that rewrites the log to hide itself:

```python
import hashlib

def H(b):
    return hashlib.sha256(b).digest()

class TPM:
    """Only what a PCR does: it starts at zero and can be extended. There is no 'set'."""
    def __init__(self):
        self.pcr = {i: bytes(32) for i in range(24)}
    def extend(self, i, digest):
        self.pcr[i] = H(self.pcr[i] + digest)

def boot(stages):
    # Each stage measures the next one into a PCR and logs it, then runs it.
    tpm, log = TPM(), []
    for pcr, name, code in stages:
        tpm.extend(pcr, H(code))
        log.append((pcr, name, H(code)))
    return tpm, log

def replay(log):
    pcr = {}
    for i, name, digest in log:
        pcr[i] = H(pcr.get(i, bytes(32)) + digest)
    return pcr

def check(tpm, log):
    calc = replay(log)
    bad = [i for i in sorted(calc) if calc[i] != tpm.pcr[i]]
    return "matches" if not bad else f"does NOT match in PCR {bad}"

GOOD = [(0, "firmware 1.42",        b"vendor firmware image 1.42"),
        (7, "secure boot on",       b"SecureBoot=1;PK=OEM;db=Microsoft,OEM"),
        (4, "shim 15.8",            b"shim 15.8 binary"),
        (4, "grub 2.12",            b"grub 2.12 binary"),
        (9, "kernel 6.12.1",        b"linux 6.12.1 image")]

tpm, log = boot(GOOD)
for i in (0, 4, 7, 9):
    print(f"PCR[{i}] = {tpm.pcr[i].hex()[:16]}...")
print("honest log:", check(tpm, log))

# A bootkit replaces GRUB. Shim measured the real (evil) GRUB before running it,
# so the TPM holds the truth; the bootkit then rewrites the log to look clean.
EVIL = GOOD[:3] + [(4, "grub 2.12", b"grub 2.12 binary + implant")] + GOOD[4:]
tpm2, log2 = boot(EVIL)
forged = list(log2)
forged[3] = (4, "grub 2.12", H(b"grub 2.12 binary"))          # claim the good digest
print("forged log:", check(tpm2, forged))
print("forged log, entry dropped:", check(tpm2, forged[:3] + forged[4:]))

# Can the bootkit extend PCR 4 further until it reaches the good value? Only by
# finding a SHA-256 preimage: every extend moves it somewhere new.
tpm2.extend(4, H(b"try to repair"))
print("PCR 4 after one more extend equals the good value:", tpm2.pcr[4] == tpm.pcr[4])
```

It prints:

```
PCR[0] = d42fcf976639d001...
PCR[4] = b39247c598859b50...
PCR[7] = d78ad3ce1556d7a3...
PCR[9] = 6a91f7c8d32fc0fa...
honest log: matches
forged log: does NOT match in PCR [4]
forged log, entry dropped: does NOT match in PCR [4]
PCR 4 after one more extend equals the good value: False
```

The forged log fails in PCR 4 and only there, which tells the verifier where to look.
Two details make this work in practice and are easy to get wrong. First, each stage is
measured by the stage *before* it, so a malicious stage cannot avoid its own
measurement; it can lie only about what comes after it, which is why the chain must
start from a root of trust in read-only firmware. Second, the verifier must replay the
log against PCR values it trusts, which means values signed by the TPM in a quote
(§11.9), not values reported by the possibly compromised operating system.

!!! note "Life story: the TPM"
    **Born:** 1999, Trusted Computing Platform Alliance (Compaq, HP, IBM, Intel,
    Microsoft); Trusted Computing Group from 2003; TPM 1.2 (ISO/IEC 11889:2009), TPM
    2.0 (2014, ISO/IEC 11889:2015) · **Purpose:** a cheap chip on every computer to hold
    a few keys bound to that machine and to record, unforgeably, what it booted ·
    **Helped:** BitLocker and other disk encryption without a boot password, measured
    boot and remote attestation, Windows Hello and platform passkeys, virtual TPMs for
    cloud machines · **Status:** required by Windows 11; moving into the processor
    (firmware TPMs, Pluton); attacked through its bus (§11.9), its firmware (TPM-Fail,
    faulTPM) and its key generation (ROCA, §11.11)

## 11.9 Sealing, quotes, and BitLocker on the bus

*Level: intermediate.*

PCRs are useful because a TPM will make its other services depend on them. **Sealing**
binds a secret to a state: the secret is stored in a TPM object whose authorization
policy says "only when PCRs 0, 4 and 7 have these values". The policy is itself a hash.
`TPM2_PolicyPCR` extends a 32-byte policy digest, starting from zeros, with its command
code, the selection of PCRs and the digest of their values, much as a PCR is extended.
At unseal time the TPM computes the same digest from its current PCRs in a policy
session, and releases the secret only if the two match. A **quote** is how a remote
party learns the PCRs: the TPM signs, with an AK, a structure containing a nonce from
the verifier, the PCR selection and the digest of the selected PCRs. The verifier
checks the signature and the nonce, replays the event log, and compares.

**Code it.** Sealing a disk key with the policy digest computed as TPM 2.0 defines it,
and a verifier that checks quotes (a toy: the AK is an HMAC key here, where a real AK is
an asymmetric key whose public half the verifier holds):

```python
import hashlib, hmac, struct

def H(b):
    return hashlib.sha256(b).digest()

def boot(stages):
    pcr, log = {i: bytes(32) for i in range(24)}, []
    for i, name, code in stages:
        pcr[i] = H(pcr[i] + H(code))
        log.append((i, name, H(code)))
    return pcr, log

GOOD = [(0, "firmware 1.42", b"vendor firmware image 1.42"),
        (7, "secure boot on", b"SecureBoot=1;PK=OEM;db=Microsoft,OEM"),
        (4, "shim 15.8", b"shim 15.8 binary"),
        (4, "grub 2.12", b"grub 2.12 binary"),
        (9, "kernel 6.12.1", b"linux 6.12.1 image")]
EVIL = GOOD[:3] + [(4, "grub 2.12", b"grub 2.12 binary + implant")] + GOOD[4:]
SELECT = (0, 4, 7)

def selection(pcrs):
    # TPML_PCR_SELECTION: one bank, SHA-256 (0x000B), a 3-byte bitmap of PCRs.
    bitmap = bytearray(3)
    for i in pcrs:
        bitmap[i // 8] |= 1 << (i % 8)
    return struct.pack(">IHB", 1, 0x000B, 3) + bytes(bitmap)

def pcr_digest(pcr, pcrs):
    return H(b"".join(pcr[i] for i in pcrs))

def policy_pcr(pcr, pcrs):
    # TPM2_PolicyPCR: new = H(old || TPM_CC_PolicyPCR || selection || pcrDigest)
    return H(bytes(32) + struct.pack(">I", 0x17F) + selection(pcrs) + pcr_digest(pcr, pcrs))

# --- Sealing: the disk key is released only when the PCRs match the policy ---
good_pcr, good_log = boot(GOOD)
sealed = {"policy": policy_pcr(good_pcr, SELECT), "secret": b"volume master key"}

def unseal(pcr):
    if not hmac.compare_digest(policy_pcr(pcr, SELECT), sealed["policy"]):
        return "refused (TPM_RC_POLICY_FAIL)"
    return sealed["secret"]

evil_pcr, evil_log = boot(EVIL)
print("unseal after a good boot:", unseal(good_pcr))
print("unseal after the bootkit:", unseal(evil_pcr))

# --- Attestation: a quote over a fresh nonce, checked against the event log ---
AK = H(b"toy attestation key")      # really an asymmetric key, certified through the EK

def quote(pcr, nonce):
    body = nonce + selection(SELECT) + pcr_digest(pcr, SELECT)
    return body, hmac.new(AK, body, hashlib.sha256).digest()

KNOWN_GOOD = {d for _, _, d in good_log}

def verify(body, sig, log, nonce):
    if not hmac.compare_digest(sig, hmac.new(AK, body, hashlib.sha256).digest()):
        return "reject: bad signature"
    if body[:16] != nonce:
        return "reject: stale nonce"
    replay = {i: bytes(32) for i in range(24)}
    for i, name, d in log:
        replay[i] = H(replay[i] + d)
    if body[16:] != selection(SELECT) + pcr_digest(replay, SELECT):
        return "reject: the log does not match the quote"
    unknown = [name for _, name, d in log if d not in KNOWN_GOOD]
    return f"reject: unknown component {unknown}" if unknown else "accept"

n1, n2 = b"nonce-0000000001", b"nonce-0000000002"
forged_log = evil_log[:3] + [(4, "grub 2.12", H(b"grub 2.12 binary"))] + evil_log[4:]
print("good machine:         ", verify(*quote(good_pcr, n1), good_log, n1))
print("bootkit, forged log:  ", verify(*quote(evil_pcr, n1), forged_log, n1))
print("bootkit, honest log:  ", verify(*quote(evil_pcr, n1), evil_log, n1))
print("old quote replayed:   ", verify(*quote(good_pcr, n1), good_log, n2))
```

It prints:

```
unseal after a good boot: b'volume master key'
unseal after the bootkit: refused (TPM_RC_POLICY_FAIL)
good machine:          accept
bootkit, forged log:   reject: the log does not match the quote
bootkit, honest log:   reject: unknown component ['grub 2.12']
old quote replayed:    reject: stale nonce
```

Two of the rejections deserve a second look. The bootkit with an *honest* log passes
the replay (the log is true) and fails only because its GRUB digest is not on the list
of known-good components. Replay proves the log is genuine; it says nothing about
whether what was booted is good. That judgment needs a reference list, kept current
with every update, and that is where most attestation deployments struggle. And the
replayed quote fails only because the verifier chose a fresh nonce; without one, a
quote recorded on a clean day could be played back forever.

Sealing has its own operational trap: PCR 0 changes with every firmware update, so a
secret sealed to it becomes unreadable after an update, and the user meets a recovery
prompt. That is why Windows binds BitLocker by default to PCR 7 (the Secure Boot policy,
which survives firmware updates) and PCR 11, and why newer designs seal to a *signed*
policy (`TPM2_PolicyAuthorize`): the vendor signs the new expected PCR values, and the
sealed secret accepts any values signed by that key.

**BitLocker on the bus.** In its default "TPM-only" mode, BitLocker seals the volume
master key to the PCRs, and at every boot the TPM checks the measurements and returns
the key to the boot manager, with no user input. On a discrete TPM, "returns" means the
key crosses the motherboard on the LPC or SPI bus, in the clear. In March 2019 Denis
Andzakovic of Pulse Security showed this with a logic analyzer and then a cheap FPGA
board on the LPC bus of an HP laptop (TPM 1.2) and a Surface Pro 3 (TPM 2.0), reading
the key as it passed. In February 2024 Thomas Roth ("stacksmashing") did it with a
Raspberry Pi Pico of a few dollars pressed against an unused LPC connector on a Lenovo
laptop's board, and recovered the key in 43 seconds. Nothing in the TPM was broken.
The measured state was correct; the attacker simply read the answer on its way out.
(Christopher Tarnovsky had shown at Black Hat in 2010 that the chip itself could be
opened, decapsulating an Infineon TPM with months of microscope and probe work; the bus
needs minutes.)

The fixes are known. **TPM plus PIN** makes the unseal depend on something the thief
does not have, and the TPM's dictionary-attack lockout limits guesses; Microsoft's own
advice for laptops at risk of theft is to set one. **Parameter encryption**: TPM 2.0
sessions can encrypt command and response parameters with a key agreed with the TPM, so
that a sniffer sees ciphertext; Linux 6.10 (2024) began protecting its TPM traffic this
way. **No bus**: a firmware TPM or Pluton has no external wires, but moves the attack
inside: in 2023 Hans Niklas Jacob, Christian Werling, Robert Buhren and Jean-Pierre
Seifert's faulTPM attack glitched the voltage of AMD's security processor and extracted
the firmware TPM's secrets from Zen 2 and Zen 3 machines with a few hours of physical
access. And the TPM's own cryptography has leaked through timing: TPM-Fail (2019)
recovered ECDSA keys from Intel's firmware TPM and an STMicroelectronics chip, as
[Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) §6.11 tells.

!!! note "Life story: BitLocker bus sniffing"
    **Born:** March 2019, Denis Andzakovic (Pulse Security), on TPM 1.2 and TPM 2.0
    laptops; repeated with a Raspberry Pi Pico by Thomas Roth in February 2024 (43
    seconds) · **Purpose:** to show that TPM-only disk encryption hands the disk key
    to anyone who can read the wires between the TPM and the CPU · **Helped:** made
    "TPM plus PIN" the standard advice for laptops, and pushed TPMs into the processor
    and toward encrypted sessions · **Status:** works on any discrete-TPM machine using
    TPM-only unlock without parameter encryption; physical access needed

**What to do.**

1. For laptops that can be stolen, use TPM plus PIN (or a startup key) for disk
   encryption, not TPM-only.
2. Seal to stable PCRs (Secure Boot policy) or to signed policies, so that firmware
   updates do not lock users out and train them to type recovery keys.
3. In attestation, always use a fresh nonce, replay the event log against the quoted
   PCRs, and judge every component against a maintained reference list.
4. Prefer TPMs without an exposed bus, and software that uses encrypted TPM sessions.

## 11.10 Secure enclaves: phones and servers

*Level: intermediate.*

A TPM is a separate, slow chip. An **enclave**, or trusted execution environment (TEE),
puts the protected computer inside the main processor, where it is fast and close to
the data, and shares the silicon with everything it is meant to be protected from.
That trade explains both why enclaves spread and why most of the attacks of the last
decade landed on them.

**Phones.** Apple introduced the **Secure Enclave** with the A7 processor in the iPhone
5s in September 2013, alongside Touch ID. It is a separate processor core on the same
die, with its own boot ROM, its own encrypted memory and a unique AES key fused into it
at manufacture (the UID) that no software, Apple's included, can read. It holds the
fingerprint and face templates, enforces the passcode retry limits and delays, and
derives the file-system keys from the passcode entangled with the UID, so that
guessing must happen on the phone, at the enclave's pace. It also holds the private keys
of Apple Pay and of passkeys, generated inside and used by handle, exactly the model of
§11.2. On Android, the **Keystore** gives apps keys that the system's TEE holds
(hardware-backed since Android 4.3 in 2013, through a trusted application called
Keymaster, renamed KeyMint in Android 12). The TEE on most Android phones runs in
**Arm TrustZone** (introduced in 2004), which splits one processor into a "normal
world" and a "secure world" by a bit on every bus transaction. Android 9 (2018) added
**StrongBox**, a Keystore backed by a separate secure element, such as the Titan M chip
of the Pixel 3, for keys that should survive a compromise of the main processor.
Android key attestation (Android 7.0, 2016) lets a server check, through a certificate
chain to Google, that a key really lives in a TEE or StrongBox and was created with the
claimed restrictions.

The secure world is still software on a shared processor, and it has fallen to both
software and hardware attacks. In 2016 Gal Beniamini showed how a bug in Qualcomm's
TrustZone code let an Android app take over the secure world and read the key that
protected full-disk encryption, which reduced the passcode's protection to an offline
search. In 2017 Adrian Tang, Simha Sethumadhavan and Salvatore Stolfo's CLKSCREW used
the phone's own software-controlled clock and voltage regulators to inject faults into
TrustZone and extract an AES key, with no physical access at all.

**Servers.** Intel's **Software Guard Extensions** (SGX), shipped with the Skylake
processors of 2015, let an ordinary application create an enclave: pages of memory
encrypted and integrity-protected by the CPU, which even the operating system and the
hypervisor cannot read, plus remote attestation that a given enclave binary is running
on a genuine Intel CPU. It promised that a cloud customer need not trust the cloud. The
attacks came quickly, because the enclave shares caches, branch predictors and
voltage with its adversary:

- **Foreshadow** (Jo Van Bulck and colleagues, USENIX Security, August 2018) used a
  speculative-execution flaw to read enclave memory, including the keys behind SGX's
  attestation;
- **Plundervolt** (Kit Murdock, David Oswald, Flavio Garcia and colleagues, December
  2019) used the CPU's software voltage interface to inject faults into enclave code
  and recover AES and RSA-CRT keys, fixed by microcode that locks the interface;
- **SGAxe** (Stephan van Schaik, Andrew Kwong, Daniel Genkin and Yuval Yarom, June
  2020) used another transient-execution leak to extract the sealing key of Intel's own
  quoting enclave and then its attestation key, so that a fake enclave could produce
  genuine-looking attestations.

Each was fixed by microcode and a security-version number that attestation reports, so
verifiers can reject unpatched machines. But the stream of fixes, and the trust the
model put in Intel, wore SGX down on the desktop: in 2021 Intel's datasheets for its
11th and 12th generation Core processors listed SGX as deprecated, which among other
things ended Ultra HD Blu-ray playback on new PCs (it required SGX). SGX remains on Xeon
server processors. The industry's newer answer protects whole virtual machines instead
of pieces of applications: **AMD SEV** (Secure Encrypted Virtualization, announced 2016
and shipped with EPYC in 2017, with integrity protection added as SEV-SNP in 2021) and
**Intel TDX** (Trust Domain Extensions, with the 4th generation Xeon in 2023) encrypt
each VM's memory with its own key, held by the processor. They have their own record:
in 2019 Robert Buhren, Christian Werling and Jean-Pierre Seifert extracted AMD's chip
endorsement keys by faulting its security processor, and in December 2024 the BadRAM
researchers broke SEV-SNP's memory protection with about \$10 of equipment that made a
memory module lie about its size, fixed by firmware that checks the memory
configuration at boot.

!!! note "Life story: Apple's Secure Enclave"
    **Born:** September 2013, Apple A7, iPhone 5s · **Purpose:** a separate core with a
    fused device key to hold biometric templates, enforce passcode limits and protect
    the keys of data protection, payments and later passkeys · **Helped:** made
    on-device brute force of a passcode slow and rate-limited, and showed that a phone
    could carry a security processor for every user · **Status:** in every Apple phone,
    tablet, watch and Mac with Apple silicon or a T2 chip; the 2020 Pangu Team report of
    an unpatchable flaw in older (A7 to A11) Secure Enclave boot ROMs showed that
    hardware bugs in it cannot be fixed by update

!!! note "Life story: Android Keystore and StrongBox"
    **Born:** hardware-backed Keystore in Android 4.3 (2013); key attestation in
    Android 7.0 (2016); StrongBox in Android 9 (2018), first on the Pixel 3's Titan M ·
    **Purpose:** to let any app hold keys that the Android system itself cannot read,
    with the keys' restrictions (user authentication, purpose, validity) enforced in
    the TEE or a secure element · **Helped:** made hardware-held keys available to every
    app developer through one API, and gave servers attestation of how a key is held ·
    **Status:** current; Keymaster became KeyMint in Android 12; quality varies with
    each phone maker's TEE

!!! note "Life story: Intel SGX"
    **Born:** described in 2013, shipped in 2015 with Skylake · **Purpose:** enclaves
    whose memory even the operating system and hypervisor cannot read, with remote
    attestation, so that code could be trusted on a machine whose owner is not ·
    **Helped:** created the field of confidential computing and its research, and
    showed by attack how much a shared processor leaks · **Status:** broken repeatedly
    (Foreshadow 2018, Plundervolt 2019, SGAxe 2020) and patched each time; deprecated on
    client processors from 2021; still on Xeon servers; largely succeeded in the cloud
    by whole-VM protection (AMD SEV-SNP, Intel TDX)

**What to do.**

1. On phones, use the platform keystore (Secure Enclave, Android Keystore with
   StrongBox where available) for keys that authenticate the user or device; ask for
   user authentication on each use for the valuable ones.
2. Treat an enclave as raising the cost of an attack, not as a boundary against a
   determined attacker with the hardware: plan for microcode updates, and check the
   security version in attestation.
3. In confidential computing, verify attestation yourself before releasing secrets to
   an enclave or VM, and pin the measurements you accept.

## 11.11 Security keys and smart cards

*Level: intermediate.*

The chips of [Chapter 7](07-Masking-and-Fault-Resistance.md) §7.11, packaged to be
carried, are the hardware most people actually hold. Three interfaces cover most uses.

- **PIV.** After Homeland Security Presidential Directive 12 (2004), FIPS 201 (2005;
  FIPS 201-3 in 2022) defined the Personal Identity Verification card that every US
  federal employee carries, with its interface in SP 800-73. A PIV card has fixed key
  slots: 9A for authentication (logging in, TLS client certificates), 9C for digital
  signatures (with a PIN required for every use), 9D for key management (decryption),
  9E for card authentication (doors, no PIN). Windows, macOS and Linux speak PIV
  natively, and many tokens that are not government cards implement it.
- **OpenPGP card.** A specification by Achim Pietig, first published in the early
  2000s and now at version 3.4, for a card with signature, decryption and
  authentication keys that GnuPG and OpenSSH can use through `gpg-agent`.
- **FIDO.** Security keys for WebAuthn and passkeys, told in
  [Protocols, Chapter 13](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md): a key pair
  per site, generated in the token, with user presence (a touch) and optionally a PIN.

Yubico, founded in 2007 by Stina Ehrensvärd, sold the first YubiKey in 2008 as a
one-time-password device that typed codes like a keyboard; the YubiKey NEO (2012) added
PIV and OpenPGP, and the YubiKey 5 (2018) FIDO2. Its history also holds three hardware
lessons. In October 2017 the **ROCA** flaw (Matúš Nemec, Marek Sýs, Petr Švenda, Dušan
Klinec and Vashek Matyáš) showed that Infineon's RSA key-generation library, used in
YubiKey 4 PIV, in TPMs and in 750,000 Estonian identity cards, made primes of a special
form that let anyone factor the 1024- and 2048-bit public keys at a cost from days to
months of computing per key; Yubico replaced affected keys, and the story is told in
[Cryptanalysis, Chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) §18.8. In
June 2019 Yubico found that its FIPS-series keys produced partly predictable random
values just after power-up, a flaw that matters for ECDSA nonces (advisory YSA-2019-02).
And in 2024 EUCLEAK extracted ECDSA keys through a side channel in Infineon's library
([Chapter 7](07-Masking-and-Fault-Resistance.md) §7.1). Each time, the device could not
be patched, because the firmware cannot be updated, by design: an updatable key can be
updated by an attacker too. Each time, the remedy was replacing the hardware.

**What to do.**

1. Generate keys on the token, not on a computer and then import them, unless you need
   an escrowed copy; check `NEVER_EXTRACTABLE`-style attestation where the token offers
   it.
2. Set a PIN and a touch policy for signing keys, and change the default PIN, PUK and
   management key of PIV tokens.
3. Keep an inventory of token models and firmware versions, so that the next ROCA or
   EUCLEAK is a list of keys to replace, not a search.
4. Enroll two tokens for every account that matters, so that loss or replacement is
   routine.

## 11.12 Attestation and its limits

*Level: expert.*

Attestation is a signed statement from hardware about itself: "this key was generated
inside me and cannot leave" (an HSM's key attestation, Android key attestation, a
YubiKey's PIV attestation certificate, a FIDO attestation), or "this is what I booted"
(a TPM quote, an SGX or SEV-SNP report). The signature chains to a key the manufacturer
put in the device and to the manufacturer's root certificate. Figure 11.5 shows the
chain for a TPM.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The attestation chain from manufacturer root to EK certificate, attestation key, quote and verifier" fill="currentColor" font-size="14">
<rect x="10" y="40" width="110" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="62" text-anchor="middle" font-size="13">maker's root</text>
<text x="65" y="80" text-anchor="middle" font-size="12">CA certificate</text>
<rect x="140" y="40" width="110" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="195" y="62" text-anchor="middle" font-size="13">EK certificate</text>
<text x="195" y="80" text-anchor="middle" font-size="12">"a genuine TPM"</text>
<rect x="270" y="40" width="110" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="325" y="62" text-anchor="middle" font-size="13">AK</text>
<text x="325" y="80" text-anchor="middle" font-size="12">bound to the EK</text>
<rect x="400" y="40" width="110" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="455" y="62" text-anchor="middle" font-size="13">quote</text>
<text x="455" y="80" text-anchor="middle" font-size="12">nonce + PCRs</text>
<rect x="530" y="40" width="100" height="56" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="530" y="40" width="100" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="62" text-anchor="middle" font-size="13">verifier</text>
<text x="580" y="80" text-anchor="middle" font-size="12">+ event log</text>
<line x1="120" y1="68" x2="134" y2="68" stroke="currentColor" stroke-width="1.4"/>
<polygon points="140,68 133,64 133,72"/>
<line x1="250" y1="68" x2="264" y2="68" stroke="currentColor" stroke-width="1.4"/>
<polygon points="270,68 263,64 263,72"/>
<line x1="380" y1="68" x2="394" y2="68" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,68 393,64 393,72"/>
<line x1="510" y1="68" x2="524" y2="68" stroke="currentColor" stroke-width="1.4"/>
<polygon points="530,68 523,64 523,72"/>
<text x="65" y="126" text-anchor="middle" font-size="12">trust: the maker</text>
<text x="195" y="126" text-anchor="middle" font-size="12">trust: the factory</text>
<text x="325" y="126" text-anchor="middle" font-size="12">trust: the TPM's</text>
<text x="325" y="142" text-anchor="middle" font-size="12">key stays inside</text>
<text x="455" y="126" text-anchor="middle" font-size="12">trust: the root</text>
<text x="455" y="142" text-anchor="middle" font-size="12">of measurement</text>
<text x="580" y="126" text-anchor="middle" font-size="12">trust: your list</text>
<text x="580" y="142" text-anchor="middle" font-size="12">of good values</text>
<line x1="10" y1="170" x2="630" y2="170" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="10" y="196" font-size="12">Proves: this report came from a genuine device, recently, in this measured state.</text>
<text x="10" y="216" font-size="12">Does not prove: that the measured software is good, that it is still in that state,</text>
<text x="10" y="236" font-size="12">or that the maker's keys were never extracted (SGAxe, 2020).</text>
</svg>
<figcaption>Figure 11.5. The attestation chain for a TPM. Each link adds something to trust. The verifier ends with a statement about what was measured at one moment, which is only as good as the maker's keys and the verifier's own list of good values.</figcaption>
</figure>

Its limits follow from the chain.

- **It trusts the maker, completely.** If a manufacturer's attestation key is extracted
  (SGAxe did it for Intel's quoting enclave; the 2019 AMD work for SEV's chip keys), the
  attacker can attest anything until the key is revoked. Revocation of hardware keys is
  slow, and verifiers often do not check it.
- **It reports measurements, not goodness.** A quote proves which hashes were extended,
  as §11.9's honest bootkit showed. Deciding that those hashes are acceptable needs a
  reference list that tracks every firmware, driver and kernel update.
- **It is a moment.** A quote describes the boot; a runtime exploit after the quote is
  invisible to it. Enclave reports describe the code loaded, not what an attacker later
  did to its memory through a side channel.
- **It identifies.** An attestation key unique to a device is a permanent identifier
  across every site it attests to. FIDO requires batches of at least 100,000 devices to
  share a key; TPM 1.2 defined Direct Anonymous Attestation (Ernie Brickell, Jan
  Camenisch and Liqun Chen, 2004), a group signature that proves "a genuine TPM"
  without saying which.
- **It can be turned against users.** Attestation lets a service refuse anything that
  is not an approved device and software stack. Google's 2023 proposal for Web
  Environment Integrity, which would have let websites ask browsers for such
  attestation, was withdrawn in November 2023 after objections that it would let sites
  exclude modified browsers and devices. Using attestation to protect your own keys and
  servers is uncontroversial; using it to decide which users may participate is a
  policy question, not a cryptographic one.

## 11.13 In the real world

*Level: intermediate.*

| Year | Event | What failed | What would have helped |
| --- | --- | --- | --- |
| 2001 | Bond and Anderson's HSM API attacks | banking transaction sets combined to leak keys | formally checked APIs |
| 2003 | Clulow's PKCS#11 attacks | wrap plus decrypt on one key | role separation, sticky attributes |
| 2010 | Tookan, 9 of 17 tokens leak keys | the same, in shipped products | restricted modes, trusted wrapping |
| 2011 | DigiNotar | HSM keys used by an intruder on the CA servers | offline roots, isolated signing, monitoring |
| 2012 | Adobe signs malware | build server could submit to the signing HSM | separate, logged signing service |
| 2016 | Qualcomm TrustZone key extraction | TEE software bug | hardware-bound keys, separate secure element |
| 2017 | ROCA | key generation in Infineon's library | independent review of key generation |
| 2018 to 2020 | Foreshadow, Plundervolt, SGAxe | shared processor leaks into enclaves | microcode, attestation of security version |
| 2019 | Ledger's HSM remote exploit | firmware bugs behind PKCS#11 | fuzzing, smaller attack surface |
| 2019, 2024 | BitLocker bus sniffing | key sent in clear over LPC | TPM plus PIN, encrypted sessions |
| 2023 | faulTPM | voltage fault on AMD's security processor | physical-access threat model |
| 2024 | EUCLEAK | side channel in a secure element library | replace hardware; updatable designs |

Two patterns run through the table. The hardware usually held; what failed was the
interface (API attacks), the path around the device (the bus, the build server, the
intruder with a session), or a component that shared too much with the attacker (the
enclaves). And key generation is part of the hardware: ROCA's keys were generated inside
certified chips and were weak from birth. One sentence sums up the design practice that
follows: put the key in hardware, then spend as much effort on who can call it as on
the box itself. A city's root keys on Mars, for example, would sit in an HSM whose
activation cards are held by people on Mars, because a quorum up to twenty-two light-minutes
away cannot be called into the room.

## 11.14 Going deeper

*Level: expert.*

**Formal models of security APIs.** After Tookan, the same group built tools that check
real tokens and propose safe configurations, and Véronique Cortier and Graham Steel's
API with a security proof showed that a usable key-management interface can be proved
to never reveal a sensitive key under a Dolev-Yao attacker. KMIP (OASIS, version 1.0 in
2010) standardizes the management side (creating, rotating and destroying keys across a
network) that PKCS#11 leaves to vendors.

**Open roots of trust.** OpenTitan (announced 2019, led by lowRISC with Google) is an
open-source silicon root of trust whose design anyone can review, and Caliptra
(announced 2022 by AMD, Google, Microsoft and NVIDIA) is an open root of trust to be
built into data-center processors. The TCG's DICE (Device Identifier Composition
Engine) gives small devices without a TPM a measured identity: each boot layer derives
its own key from the previous layer's secret and the hash of the next layer, so that a
change in code changes the identity, the way a PCR changes.

**Threshold and multi-vendor signing.** Combining HSMs from different vendors with a
threshold signature protects against one vendor's bug or back door, at the cost of the
protocol risks taught in
[book 6](../advanced/04-Threshold-Cryptography.md).

**Post-quantum keys in hardware.** HSMs, TPMs and secure elements must hold ML-KEM and
ML-DSA keys and run them without leaking, on chips with little memory; the
implementation hazards are in
[Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md), and
the TCG and PKCS#11 3.2 are adding the mechanisms.

**Confidential computing's open problems.** Whole-VM protection reduces what the host
can see, but the guest still trusts its own kernel, its device drivers and every
interface the hypervisor offers it; papers since 2023 (interrupt injection, memory
remapping, BadRAM) keep finding that the boundary between guest and host is wide. The
research direction is smaller trusted bases and attested, verified firmware.

## Check yourself

??? question "1. A CA keeps its signing key in an HSM, and an intruder takes over the CA's issuing server. Is the key safe?"

    The key is not stolen: it never leaves the HSM. But the intruder can ask the HSM to
    sign whatever the issuing server is allowed to sign, for as long as they control
    it, as at DigiNotar (2011) and Adobe (2012). The protection has moved to the right
    to call the HSM: isolation of the signing service, request logging, rate limits and
    content checks.

??? question "2. Why can a token with only three PIN attempts safely use a four-digit PIN?"

    The attacker gets three guesses out of 10,000 before the token locks, a 0.03%
    chance. The retry counter, enforced inside the hardware, replaces the size of the
    password space. The same PIN protecting a file that can be copied would fall in
    milliseconds.

??? question "3. Describe Clulow's wrap-and-decrypt attack in three steps."

    Use (or create) a key $W$ with both `CKA_WRAP` and `CKA_DECRYPT`. Call `C_WrapKey`
    to encrypt the extractable target key $K$ under $W$, giving $c = E_W(K)$. Call
    `C_Decrypt` with $W$ on $c$: the token returns $K$ in the clear, though no single
    call broke the attribute rules.

??? question "4. A token forbids wrap and decrypt on the same key at creation time. Why is that not enough?"

    If roles can be changed later with `C_SetAttributeValue`, an attacker creates a
    wrap-only key, wraps the target, then adds decrypt. And if unwrapping lets the
    caller choose the new key's attributes, the target can be re-imported as a
    non-sensitive copy. Attributes must be sticky, and wrapped keys must carry their
    attributes.

??? question "5. What does FIPS 140-3 Level 3 add over Level 2?"

    Tamper resistance with response (opening the module erases its keys) instead of
    only tamper evidence; identity-based rather than role-based authentication;
    sensitive parameters entering and leaving only encrypted or through a trusted
    channel; and testing of the non-invasive (side-channel) mitigations.

??? question "6. A PCR in the SHA-256 bank holds 32 zero bytes and is extended with digest d. Write the new value, and say why malware cannot set it back."

    $\mathrm{SHA256}(0^{32} \,\|\, d)$. There is no set command, only extend; to
    reach any chosen value the malware would need a SHA-256 preimage, and every
    further extend moves the register somewhere new. Only a reset (a reboot) returns
    it to zero, and the reboot measures everything again.

??? question "7. An event log replays exactly to the quoted PCR values. What does that prove, and what does it not?"

    It proves the log is the true record of what was measured, on a genuine TPM if the
    AK chains to a valid EK certificate and the nonce is fresh. It does not prove that
    what was measured is good: that needs a reference list of acceptable digests, and
    it says nothing about what happened after boot.

??? question "8. Why did TPM-only BitLocker leak its key to a \$10 device, and what stops it?"

    With a discrete TPM, the unsealed volume master key travels to the CPU over the
    LPC or SPI bus in the clear, where a probe can read it in seconds. A PIN (TPM plus
    PIN) makes unsealing need a secret the thief lacks; encrypted TPM sessions hide the
    key on the bus; a TPM inside the processor has no exposed bus.

??? question "9. A cloud KMS quota allows 10,000 symmetric operations a second, and your service encrypts 50,000 records a second, one data key each. What do you change, and what does it cost?"

    Reuse each data key for many records (for example 1,000, giving 50 calls a second)
    with a data key cache. The cost: a plaintext data key stays in memory longer and
    protects more data, so its compromise exposes more; set limits on messages, bytes
    and lifetime, and plan for decryption load, which needs its own cache.

??? question "10. Intel's attestation key for SGX was extracted by SGAxe. Why is this worse than the extraction of one enclave's secrets?"

    Attestation is what lets remote parties trust any enclave. With the quoting
    enclave's key, an attacker can produce genuine-looking reports for a fake enclave
    running anywhere, so every verifier trusting that key is fooled until the key is
    revoked and the platform's security version raised; one enclave's secrets affect
    only that enclave.

## What you learned

- Keeping a key in hardware turns theft, which is permanent and invisible, into misuse,
  which is bounded, logged and ends when the attacker is evicted; the right to call the
  device becomes the secret to protect.
- HSMs hold master keys inside a tamper-responding boundary and other keys as wrapped
  blobs; quorums and written ceremonies control the people; firmware and command
  parsers are attack surface.
- PKCS#11 names keys by handles and restricts them by attributes; Clulow's
  wrap-and-decrypt and the Tookan attacks show that the combination of operations is
  what must be safe, and the fix is role separation, sticky attributes and wrapped keys
  that carry their attributes.
- FIPS 140-3 grades modules from Level 1 (approved algorithms) to Level 4 (a full
  envelope and environmental protection); a certificate covers one version, one
  boundary and the approved mode, and not the application's use.
- Cloud KMS gives non-exportable keys behind an API with quotas and logs, built for
  envelope encryption; the provider still sees metadata and handles plaintext at its
  front end and in its services.
- A TPM records boot in PCRs that can only be extended; a quote with a fresh nonce,
  replayed against the event log and judged against a reference list, attests a boot;
  sealing ties secrets to PCR values; the bus between a discrete TPM and the CPU leaks
  TPM-only BitLocker keys.
- Enclaves (Secure Enclave, TrustZone, SGX, SEV, TDX) are fast and close to the data,
  and share enough with the attacker that most recent attacks have landed on them.
- Security keys and smart cards (PIV, OpenPGP card, FIDO) put keys in a carried secure
  element; ROCA and EUCLEAK showed that unpatchable flaws mean replacing hardware.
- Attestation proves a device and a measured state at a moment, trusts the maker
  completely, and says nothing about whether what was measured is good.

**Next:** [Chapter 12](12-Secrets-in-Operations.md), where the secrets that cannot live
in hardware (API tokens, passwords, certificates on busy servers) are handled in
operations, and where a signing key that left its protection, Storm-0558's, is told in
full.

## Further reading

- Jolyon Clulow, "On the Security of PKCS #11" (CHES 2003).
- Mike Bond and Ross Anderson, "API-Level Attacks on Embedded Systems" (*IEEE
  Computer*, October 2001); Mike Bond and Piotr Zieliński, "Decimalisation Table
  Attacks for PIN Cracking" (Cambridge technical report, 2003).
- Stéphanie Delaune, Steve Kremer and Graham Steel, "Formal Analysis of PKCS#11"
  (IEEE CSF 2008); Matteo Bortolozzo, Matteo Centenaro, Riccardo Focardi and Graham
  Steel, "Attacking and Fixing PKCS#11 Security Tokens" (ACM CCS 2010).
- Véronique Cortier and Graham Steel, "A Generic Security API for Symmetric Key
  Management on Cryptographic Devices" (ESORICS 2009); ANSSI, Caml Crush PKCS#11
  filtering proxy (2015).
- OASIS, PKCS #11 Specification Version 3.1 (OASIS Standard, 23 July 2023), Version
  3.0 (2020) and Version 2.40 (2015); RSA Laboratories, PKCS #11 v2.20 (2004).
- Sean W. Smith and Steve Weingart, "Building a High-Performance, Programmable Secure
  Coprocessor" (*Computer Networks*, 1999), on the IBM 4758.
- Jean-Baptiste Bédrune and Gabriel Campana, "Everybody be Cool, This is a Robbery!"
  (SSTIC and Black Hat USA, 2019).
- FIPS 140-3, Security Requirements for Cryptographic Modules (2019); ISO/IEC
  19790:2012 and ISO/IEC 24759; the SP 800-140 series; FIPS 140-2 (2001) and FIPS 140-1
  (1994); NIST CMVP, validated modules list.
- Fox-IT, "Black Tulip: Report of the Investigation into the DigiNotar Certificate
  Authority Breach" (August 2012); Adobe, "Inappropriate Use of Adobe Code Signing
  Certificate" (27 September 2012).
- AWS, "AWS Key Management Service Cryptographic Details" (whitepaper) and "Request
  Quotas" (AWS KMS Developer Guide); AWS, "Introducing AWS Key Management Service"
  (12 November 2014).
- Trusted Computing Group, TPM 2.0 Library Specification (2014 onward; ISO/IEC
  11889:2015), PC Client Platform Firmware Profile (event log and PCR usage); Will
  Arthur and David Challener, *A Practical Guide to TPM 2.0* (Apress, 2015).
- Denis Andzakovic, "Extracting BitLocker Keys from a TPM" (Pulse Security, March
  2019); Thomas Roth (stacksmashing), "Breaking BitLocker: Bypassing the Windows Disk
  Encryption" (February 2024).
- Hans Niklas Jacob, Christian Werling, Robert Buhren and Jean-Pierre Seifert,
  "faulTPM: Exposing AMD fTPMs' Deepest Secrets" (IEEE EuroS&P 2023); Daniel Moghimi
  et al., "TPM-FAIL" (USENIX Security 2020).
- Apple, *Apple Platform Security* guide (current edition), on the Secure Enclave;
  Android Open Source Project, "Hardware-backed Keystore" and "Key and ID
  Attestation".
- Gal Beniamini, "Extracting Qualcomm's KeyMaster Keys: Breaking Android Full Disk
  Encryption" (2016); Adrian Tang, Simha Sethumadhavan and Salvatore Stolfo,
  "CLKSCREW" (USENIX Security 2017).
- Jo Van Bulck et al., "Foreshadow" (USENIX Security 2018); Kit Murdock et al.,
  "Plundervolt" (IEEE S&P 2020); Stephan van Schaik, Andrew Kwong, Daniel Genkin and
  Yuval Yarom, "SGAxe: How SGX Fails in Practice" (2020); Victor Costan and Srinivas
  Devadas, "Intel SGX Explained" (IACR ePrint 2016/086).
- Robert Buhren, Christian Werling and Jean-Pierre Seifert, "Insecure Until Proven
  Updated: Analyzing AMD SEV's Remote Attestation" (ACM CCS 2019); Jesse De Meulemeester
  et al., "BadRAM" (IEEE S&P 2025).
- FIPS 201-3, Personal Identity Verification of Federal Employees and Contractors
  (2022); SP 800-73-4, Interfaces for Personal Identity Verification; Achim Pietig,
  Functional Specification of the OpenPGP Application on ISO Smart Card Operating
  Systems, version 3.4.
- Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš, "The Return of
  Coppersmith's Attack: Practical Factorization of Widely Used RSA Moduli" (ACM CCS
  2017); Yubico, YSA-2019-02 (June 2019).
- Ernie Brickell, Jan Camenisch and Liqun Chen, "Direct Anonymous Attestation" (ACM
  CCS 2004).
