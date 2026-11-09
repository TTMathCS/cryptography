# 9. APIs That Resist Misuse

*Most cryptographic failures happen where a program calls a library: a nonce
reused, a MAC left out, an error message that says too much. This chapter is
about the other side of that call, the interface itself, and how to design
one that makes the safe use the easy use. It starts from what the usability
studies found when they watched programmers at work, looks at the libraries
built in answer (NaCl, libsodium, Tink, Go's standard library), and then
builds the pieces one at a time: nonces the caller never sees, keys that know
their job and refuse to print, a versioned envelope with key IDs and
associated data, one error for every failure, logs that cannot hold a token,
and a way to retire an old function without breaking the people who use it.
You will write a bad API and a good one side by side, recover a secret
through a padding oracle and then close the oracle, and write a log filter
that removes keys and bearer tokens.*

!!! abstract "In this chapter"
    **You will learn:**

    - what the usability studies of 2016 and 2017 found, and the design rules
      that follow from them;
    - how a toolkit API invites the classic mistakes, and how a sealed-box API
      removes them, in code;
    - what NaCl, libsodium, Google's Tink and Go's cryptography packages each
      do to be hard to misuse;
    - how to take nonces out of the caller's hands: random 192-bit nonces
      (XChaCha20), and nonce-misuse-resistant modes (SIV, AES-GCM-SIV);
    - typed keys that check their purpose and will not appear in logs, and key
      IDs that make rotation possible;
    - why a version byte is safer than algorithm negotiation, with JWT's
      `alg: none` as the warning, and a full sealed-message format;
    - how one error path closes padding oracles, and why the time an error
      takes matters as much as its text;
    - how to keep keys and tokens out of logs and crash dumps;
    - how to deprecate a cryptographic API without breaking its users or
      their stored data.

    **You need:** [Chapter 1](01-What-Cryptographic-Engineering-Is.md), whose
    §1.7 states the principles this chapter puts into code and whose §1.9
    builds the small sealed format that this chapter grows into a full one;
    [Chapter 5](05-Constant-Time-Programming.md) for constant-time
    comparison. What an AEAD is and how the modes work are in
    [Chapter 8](../../book/08-Modes-of-Operation.md) and
    [Chapter 10](../../book/10-Message-Authentication.md) of the cryptography
    book and on the [AEAD](../../05-modes-aead/AEAD.md) page; this chapter
    does not teach them again.

    **Levels:** §9.1 and §9.2 are for beginners, §9.3 to §9.10 are
    intermediate, §9.11 is expert.

## 9.1 The problem

*Level: beginner.*

In September 2010, at the Ekoparty conference in Buenos Aires, Juliano Rizzo
and Thai Duong showed an attack on ASP.NET, Microsoft's framework for web
applications, which ran a large share of the world's corporate and government
web sites. ASP.NET encrypted pieces of state that it handed to the browser
and expected back: view state, authentication tickets, and the names of
resources to fetch. It used AES in CBC mode. When a request came back with
encrypted data that would not decrypt, the framework answered differently
depending on what had gone wrong. A ciphertext whose padding was invalid
produced one kind of error; a ciphertext whose padding was valid but whose
contents made no sense produced another.

That difference was enough. Serge Vaudenay had shown in 2002 that a receiver
who reveals whether the padding of a CBC ciphertext is valid lets an attacker
decrypt any ciphertext, one byte at a time, with about 128 guesses per byte,
without the key ([Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)
tells the attack fully). Rizzo and Duong's tool, POET (the Padding Oracle
Exploit Tool), did that against ASP.NET and then ran the oracle backwards to
encrypt data of the attacker's choosing. With it they could forge
authentication tickets and make the server send its own configuration file,
`web.config`, which often held database passwords and the machine's keys.

Microsoft published Security Advisory 2416728 on 17 September 2010 and a
patch, MS10-070, out of the usual monthly cycle on 28 September. The
workaround it gave administrators in the eleven days between is the lesson of
this chapter in one line of configuration: turn on ASP.NET's `customErrors`
feature so that **every** error returns the same page, and add a small random
delay to that page. The cryptography did not change. The fix was to make the
failures look alike.

!!! note "Life story: the ASP.NET padding oracle"
    **Born:** 2010, Juliano Rizzo and Thai Duong: "Practical padding oracle
    attacks" (USENIX WOOT, August 2010) on JavaServer Faces and other web
    software, then the ASP.NET attack at Ekoparty in Buenos Aires in
    September · **Purpose:** to show that Vaudenay's 2002 padding oracle
    worked against the web frameworks of the day · **Helped:** Microsoft's
    advisory 2416728 (17 September 2010), whose workaround was one error page
    for every error, and the out-of-band patch MS10-070 (28 September 2010);
    a decade of advice to authenticate before decrypting · **Status:** fixed;
    the same mistake, a distinguishable decryption error, keeps returning in
    new products

The AES implementation was correct and CBC is a standard mode. The bug was
in what the framework said when they failed, which is to say in its
**interface**: the boundary between code that knows the cryptography and code
that does not. That boundary runs through every system several times: cipher
to library, library to framework, framework to application, application to
the person who reads its logs.

Chapter 1 counted where cryptography fails and found most failures on the
caller's side of a library call (§1.3). This chapter is about the library's
side of that call: what an interface should ask, what it should refuse to
ask, what it should return, and what it should say when something goes wrong.
Figure 9.1 shows the difference in its plainest form, as the number of
decisions each kind of interface hands to the caller.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Two interfaces compared by the decisions they hand to the caller: ten for a toolkit, two for a sealed box" fill="currentColor" font-size="14">
<text x="160" y="24" text-anchor="middle" font-weight="bold">A toolkit asks the caller</text>
<text x="480" y="24" text-anchor="middle" font-weight="bold">A sealed box asks the caller</text>
<rect x="40" y="38" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="56">1. which cipher, which key size</text>
<rect x="40" y="66" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="84">2. which mode</text>
<rect x="40" y="94" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="112">3. which padding</text>
<rect x="40" y="122" width="240" height="26" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="40" y="122" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="140">4. how to make the IV or nonce</text>
<rect x="40" y="150" width="240" height="26" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="40" y="150" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="168">5. whether to add a MAC at all</text>
<rect x="40" y="178" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="196">6. which MAC, which MAC key</text>
<rect x="40" y="206" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="224">7. MAC before or after encrypting</text>
<rect x="40" y="234" width="240" height="26" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="40" y="234" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="252">8. how to compare the tag</text>
<rect x="40" y="262" width="240" height="26" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="40" y="262" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="280">9. what to say when it fails</text>
<rect x="40" y="290" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="52" y="308">10. how to store the parts</text>
<rect x="360" y="38" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="372" y="56">1. which key (from new_key())</text>
<rect x="360" y="66" width="240" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="372" y="84">2. what the message belongs to</text>
<text x="372" y="130" opacity="0.7">Everything else is fixed by</text>
<text x="372" y="150" opacity="0.7">the library and the version</text>
<text x="372" y="170" opacity="0.7">byte. A shaded question on</text>
<text x="372" y="190" opacity="0.7">the left has a wrong answer</text>
<text x="372" y="210" opacity="0.7">that works perfectly until</text>
<text x="372" y="230" opacity="0.7">someone attacks it.</text>
</svg>
<figcaption>Figure 9.1. The decisions an interface hands to its caller. Each question on the left is one the caller can answer wrongly; the shaded ones were the commonest mistakes in the misuse studies of chapter 1. The sealed box on the right asks for a key and a context and decides the rest.</figcaption>
</figure>

Every question in the left column of Figure 9.1 has at least one wrong answer
that works. ECB and a fixed nonce both encrypt and decrypt correctly. Leaving
out the MAC makes the code shorter and still round-trips every test. Comparing tags with `==` passes every unit test. An
error that says "bad padding" helps the programmer debugging the code, and
the attacker. None of these mistakes shows until someone attacks, so tests
do not catch them, and across thousands of callers an interface that asks
these questions will get every wrong answer.

The rest of this chapter shrinks the left column, and then deals with the
questions that stay hard even in a good design: nonces, keys, versions, and
what to say when it fails.

What to do with this:

- List the decisions your cryptographic interface asks its callers to make.
  For each one, ask whether a caller who answers it wrongly would notice.
  If not, take the decision away.
- Treat every distinct error from a decryption or verification as a possible
  oracle until you have shown otherwise.
- Review the interfaces between layers (library, framework, application,
  logs), not only the code inside each one.

## 9.2 What the usability studies found

*Level: beginner.*

Chapter 1 quoted the counts: 88% of Android apps that used cryptographic APIs
made at least one mistake (Egele and colleagues, 2013), and 83% of
cryptography CVEs in one three-year span were applications misusing correct
libraries (Lazar and colleagues, 2014). Counts say how often programmers get
it wrong. Two later studies asked why, by watching and asking programmers
directly, and their answers are the design brief for the rest of this
chapter.

**"Jumping through hoops", 2016.** Sarah Nadi, Stefan Krüger, Mira Mezini and
Eric Bodden, at the Technical University of Darmstadt, studied Java
developers and the Java Cryptography Architecture (JCA) for a paper at ICSE,
the main software engineering conference, in May 2016. They combined four
sources: 100 Stack Overflow questions about the Java cryptography APIs, 100
GitHub repositories that used them, a pilot survey of 11 developers who had
asked such questions, and a main survey of 37 developers who used the APIs,
48 people in all. The developers were, surprisingly, confident about the
concepts: they knew when they needed encryption and when a signature. What
defeated them was the API. To encrypt a string with the JCA you choose a
transformation string such as `"AES/CBC/PKCS5Padding"`, build a key spec,
make an IV, initialize a `Cipher` object in the right mode, and call
`doFinal`, and every one of those steps has a variant that compiles and runs
and is insecure. The developers described the APIs as too low-level and said
they wanted interfaces organized by task ("encrypt this file", "store this
password") rather than by algorithm. The Stack Overflow questions showed the
same thing from the other side: the same few tasks asked again and again,
and answered with code that worked and was often unsafe.

**"Comparing the usability of cryptographic APIs", 2017.** Yasemin Acar,
Michael Backes, Sascha Fahl, Simson Garfinkel, Doowon Kim, Michelle Mazurek
and Christian Stransky ran a controlled experiment, published at the IEEE
Symposium on Security and Privacy in May 2017. They recruited 256 Python
developers from GitHub and gave each one short programming tasks to do with
one of five libraries, chosen to range from low-level to deliberately simple:
PyCrypto, M2Crypto, cryptography.io, Keyczar and PyNaCl. The tasks were
ordinary: generate a key and store it, encrypt and decrypt, derive a key from
a password (for symmetric cryptography), and check a certificate (for public
key). Then the researchers scored every solution for whether it worked and,
separately, whether it was secure.

Three findings matter for designers:

1. **Simpler interfaces gave more secure code, with caveats.** PyNaCl and
   cryptography.io, which hide the mode, the nonce handling and the MAC, gave
   the most working solutions, and M2Crypto and Keyczar the fewest; on
   security, the simplified libraries beat the low-level ones, with Keyczar's
   few working solutions the most often secure (a small sample) and PyCrypto
   and M2Crypto the least. Taking away a parameter took away the chance to
   choose it badly.
2. **Simple is not enough if the library cannot do the task.** Keyczar was
   built by Google in 2008 precisely to be easy and safe, yet participants
   rated it, with M2Crypto, the least usable of the five. It, and PyNaCl, had no direct support for some
   of the tasks, such as storing a key securely, so participants went
   elsewhere, wrote their own, or gave up. A safe library that does not cover
   the job pushes its users back to an unsafe one.
3. **Documentation and examples decide what people write.** Participants
   copied the first example that worked. Good documentation with complete
   examples made a complicated library usable, but it raised the share of
   working solutions more than the share of secure ones: people copied
   examples that worked and were not safe. The example in the documentation
   is part of the interface.

Acar and colleagues had shown the third point in 2016 ("You get where you're
looking for"): Android developers allowed to use Stack Overflow wrote working
code faster, and less secure code, than those limited to the official
documentation.

Put together with the counts of chapter 1, the studies support a short list
of rules, and the rest of this chapter applies them:

- **Organize the interface by task, not by primitive.** "Seal this record",
  "sign this release", "hash this password". The caller should not have to
  know what a mode is.
- **Remove parameters that have wrong answers.** If a nonce, a padding or a
  MAC can be chosen badly, the library chooses it.
- **Cover the whole task.** Key generation, key storage, rotation and
  serialization are part of the job; a library that leaves them out has
  left out the hardest part.
- **Make the dangerous thing look dangerous.** Low-level operations are
  sometimes needed. Put them under a name nobody types by accident:
  `hazmat`, `Insecure`, `Unsafe`, `legacy`.
- **Ship examples that are safe as written**, because they will be copied
  as written.
- **Fail loudly and uniformly.** A wrong key, a wrong context or a tampered
  ciphertext raises one exception, which the caller cannot mistake for
  success and the attacker cannot tell apart.

What to do with this:

- Before choosing a library, do the tasks you need with it from its
  documentation, and check whether the first example you find is safe.
- When you wrap a library for your team, document each task with one
  complete, correct example.

## 9.3 Code it: a bad API and a good one

*Level: intermediate.*

The best way to see what an interface does to its callers is to write two and
give them the same callers. Python's standard library has no AES or ChaCha20,
so both interfaces here use the stand-in from chapter 1: a keystream made by
running HMAC-SHA256 over a nonce and a counter. It is a pseudorandom function
used in counter mode, which is sound as a teaching device, and it is
**not** a cipher to deploy. Everything in this section is about the
interface, not the cipher, so the stand-in costs nothing.

**Break it.** The first interface is a toolkit. It does what it is told: the
caller supplies the key, the nonce and, if they want one, a MAC key; on the
way back, the caller says whether to check the tag. Each parameter has a
default or a value that looks reasonable in an example. Three callers use it,
each making a mistake that a real study recorded:

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):        # teaching stand-in for a stream cipher: HMAC-SHA256 in counter mode
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

# The toolkit: every decision is the caller's. (BROKEN by design.)
def toolkit_encrypt(key, nonce, data, mac_key=None):
    body = xor(data, keystream(key, nonce, len(data)))
    if mac_key is not None:
        body += hmac.new(mac_key, nonce + body, hashlib.sha256).digest()
    return body

def toolkit_decrypt(key, nonce, body, mac_key=None, verify=False):
    if mac_key is not None:
        body, tag = body[:-32], body[-32:]
        good = hmac.new(mac_key, nonce + body, hashlib.sha256).digest()
        if verify and not hmac.compare_digest(tag, good):
            raise ValueError("bad tag")
    return xor(body, keystream(key, nonce, len(body)))

key, mkey = secrets.token_bytes(32), secrets.token_bytes(32)

# Caller 1 copied the example from the docs, which used a zero nonce.
a = toolkit_encrypt(key, bytes(16), b"PIN 4071 for ann", mkey)
b = toolkit_encrypt(key, bytes(16), b"PIN 9930 for bob", mkey)
leak = xor(xor(a[:16], b[:16]), b"PIN 9930 for bob")   # knowing bob's message gives ann's
print("caller 1:", leak)

# Caller 2 left out the optional MAC key: a working program, and a malleable one.
n = secrets.token_bytes(16)
c = toolkit_encrypt(key, n, b"pay 0100 to bob")
c = c[:4] + xor(c[4:8], xor(b"0100", b"9100")) + c[8:]
print("caller 2:", toolkit_decrypt(key, n, c))

# Caller 3 passed the MAC key but not verify=True, the default being False.
c = toolkit_encrypt(key, n, b"pay 0100 to bob", mkey)
c = c[:4] + xor(c[4:8], xor(b"0100", b"9100")) + c[8:]
print("caller 3:", toolkit_decrypt(key, n, c, mkey))
```

```text
caller 1: b'PIN 4071 for ann'
caller 2: b'pay 9100 to bob'
caller 3: b'pay 9100 to bob'
```

Every caller's program worked: each encrypted and decrypted its own data
correctly, and a test suite that checks round trips would pass all three. The
first caller reused a nonce, so two ciphertexts under the same key and nonce
XOR to the XOR of their plaintexts, and anyone who knows or guesses one
message reads the other. The second never added a MAC, so an attacker changed
an amount without the key. The third did add one and never checked it,
because checking was optional and off by default, a choice that sounds
absurd until you remember that real APIs have shipped it: certificate
verification switches, `verify=False` in HTTP clients and JWT libraries, and
streaming decryption that hands out plaintext before the tag is read.

Notice also what the toolkit returns: raw bytes, with the nonce kept
separately by the caller. Where to store the nonce, how long the tag is, and
which bytes are which are all left to the caller's own format, which is a
fourth place to go wrong (chapter 2 showed what ambiguous concatenation does).

**Fix it.** The second interface is a box. It takes a key once, when it is
made, and after that has two operations: `seal` and `open`. It picks the
nonce itself from the operating system's generator, makes it long enough that
random choice is safe (§9.5), always computes the tag, always checks it
before decrypting, compares in constant time, packs everything into one byte
string, and raises one exception for every failure. It also refuses keys that
are not keys and does not show its key when printed:

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):        # the same teaching stand-in for a stream cipher
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

class OpenError(Exception):
    """The one error open() ever raises."""

class SecretBox:
    NONCE, TAG = 24, 32

    def __init__(self, key):
        if not isinstance(key, (bytes, bytearray)) or len(key) != 32:
            raise TypeError("SecretBox needs a 32-byte key from SecretBox.new_key()")
        self._enc = hmac.new(key, b"secretbox enc", hashlib.sha256).digest()
        self._mac = hmac.new(key, b"secretbox mac", hashlib.sha256).digest()

    @staticmethod
    def new_key():
        return secrets.token_bytes(32)

    def __repr__(self):              # a box never shows its key
        return "SecretBox(key=<hidden>)"

    def _tag(self, nonce, body, context):
        data = len(context).to_bytes(4, "big") + context + nonce + body
        return hmac.new(self._mac, data, hashlib.sha256).digest()

    def seal(self, plaintext, context=b""):
        nonce = secrets.token_bytes(self.NONCE)          # the box picks the nonce, never the caller
        body = bytes(p ^ k for p, k in zip(plaintext, keystream(self._enc, nonce, len(plaintext))))
        return nonce + body + self._tag(nonce, body, context)

    def open(self, sealed, context=b""):
        if len(sealed) < self.NONCE + self.TAG:
            raise OpenError("cannot open")
        nonce, body, tag = sealed[:self.NONCE], sealed[self.NONCE:-self.TAG], sealed[-self.TAG:]
        if not hmac.compare_digest(tag, self._tag(nonce, body, context)):
            raise OpenError("cannot open")               # checked before any decryption
        return bytes(c ^ k for c, k in zip(body, keystream(self._enc, nonce, len(body))))

box = SecretBox(SecretBox.new_key())
a, b = box.seal(b"PIN 4071 for ann"), box.seal(b"PIN 9930 for bob")
print("caller 1:", a[:24] != b[:24], "(fresh nonce each time)")
c = box.seal(b"pay 0100 to bob")
evil = c[:28] + bytes([c[28] ^ 0x09]) + c[29:]
for name, blob in [("caller 2", evil), ("caller 3", c[:-1])]:
    try:
        box.open(blob)
    except OpenError as e:
        print(name + ":", e)
print(box.open(c), box)
try:
    SecretBox(b"password123")
except TypeError as e:
    print(e)
```

```text
caller 1: True (fresh nonce each time)
caller 2: cannot open
caller 3: cannot open
b'pay 0100 to bob' SecretBox(key=<hidden>)
SecretBox needs a 32-byte key from SecretBox.new_key()
```

The three callers' mistakes cannot be written against this interface. There
is no nonce parameter to fix at zero. There is no MAC to leave out and no
`verify` flag to forget. The caller who passes a password where a key belongs
is stopped at once with a message that says where keys come from, instead of
getting a working program keyed with eleven guessable bytes. And the last
line shows the box keeping its secret when it is printed, which matters more
than it looks: §9.9 is about the logs that would otherwise hold it.

The good interface is also shorter to use: sealing is one call with one
argument. That is the finding of §9.2 in code. When the safe call is the
short call, the example people copy is the safe one.

Two more choices recur in every good library. The key is bound once, at
construction, so later calls cannot pass the wrong one. And the box derives
its encryption and MAC subkeys inside with labels, so "one key, one purpose"
holds without the caller knowing it exists (chapter 10 does this with HKDF).

What the box still lacks is a version and a key ID: nothing in its output says
which format or which key made it, so it cannot change either without
breaking every stored ciphertext. §9.7 adds both.

What to do with this:

- Wrap whatever primitive you have in a seal/open interface once, review the
  wrapper, and make it the only way your codebase encrypts.
- Remove every `verify`, `check` or `insecure` flag from interfaces you
  control; where a test needs to skip a check, give the test its own fake.
- Make constructors reject wrong key types and lengths with a message that
  says where a correct key comes from.

## 9.4 NaCl, libsodium, Tink and Go

*Level: intermediate.*

Several libraries were built on the argument of §9.2 before the studies made
it. They took different routes to the same place, and the differences are
instructive.

**NaCl.** Daniel Bernstein, Tanja Lange and Peter Schwabe began NaCl
(pronounced "salt", for Networking and Cryptography library) in 2008, in a
European research project on computer-aided cryptography engineering, and
explained its design in "The security impact of a new cryptographic library"
at LATINCRYPT 2012. The paper is a list of decisions taken away from the
caller. The central function, `crypto_box`, does public-key authenticated
encryption in one call: it takes a message, a nonce, the receiver's public key
and the sender's secret key, and returns a ciphertext that only the receiver
can open and that proves who sent it. Inside, it runs an X25519 key agreement,
derives a key, encrypts with XSalsa20 and authenticates with Poly1305; the
caller never sees those names in the call. Its symmetric twin,
`crypto_secretbox`, does the same with a shared key. `crypto_box_open`
returns plaintext only if the authenticator checks, and otherwise returns
`-1` and nothing else.

The paper is just as firm about what happens beneath the interface. NaCl has
no branches that depend on secret data and no array indices that depend on
secret data, so its timing does not leak keys (chapter 5). It allocates no
memory dynamically, so it cannot fail halfway for lack of it. It takes its
randomness from the operating system rather than keeping a generator of its
own that a fork or a bad seed could break (chapter 4). And it uses 24-byte
nonces, long enough that a nonce chosen at random will not repeat, so the
caller's one remaining decision about nonces has an easy safe answer.

NaCl had warts. Its C interface made the caller put 32 zero bytes in front
of every plaintext and skip 16 at the front of every ciphertext, an internal
detail pushed onto the caller. The nonce was still a parameter. And its build
tuned itself to the machine, which made it hard to package.

!!! note "Life story: NaCl"
    **Born:** 2008, Daniel J. Bernstein, Tanja Lange and Peter Schwabe, in
    the EU-funded CACE project (2008 to 2010); design paper at LATINCRYPT
    2012 · **Purpose:** a library whose high-level functions (`crypto_box`,
    `crypto_secretbox`, `crypto_sign`) need no choices of algorithm, mode or
    padding, and whose code is constant-time throughout · **Helped:** the
    idea of the sealed box as the unit of cryptographic API; libsodium,
    TweetNaCl (a version that fits in 100 tweets) and the many bindings that
    copied its interface; WireGuard and other designs that use its
    algorithms · **Status:** stable and little changed since 2011; most
    programs now use it through libsodium

**libsodium.** Frank Denis started libsodium in 2013 as a portable,
packageable fork of NaCl that kept NaCl's function names and behavior. It
then fixed the warts without breaking that compatibility, by adding new
functions beside the old ones. The `_easy` functions, such as
`crypto_secretbox_easy`, take and return ordinary buffers with no zero
padding. Each primitive gained a key-generation function, such as
`crypto_secretbox_keygen`, so the caller does not have to know how long a key
is or where to get its bytes. An AEAD with a 192-bit nonce,
`crypto_aead_xchacha20poly1305_ietf_encrypt`, made random nonces safe for
general use (§9.5), and in 2017 `crypto_secretstream` added encryption of
long streams in authenticated chunks, which marks the last chunk so that a
truncated stream is detected. It also covers whole tasks that NaCl left out:
password hashing with Argon2 (`crypto_pwhash`), key exchange
(`crypto_kx`), memory that is locked, guarded and wiped (`sodium_malloc`,
`sodium_memzero`; chapter 8). The documentation leads with complete,
correct examples, which §9.2 showed matters as much as the interface.

!!! note "Life story: libsodium"
    **Born:** 2013, Frank Denis, as a portable and API-compatible fork of
    NaCl · **Purpose:** NaCl's interface, installable everywhere, with the
    rough edges removed and the missing tasks (password hashing, key exchange,
    streams, secure memory) added · **Helped:** bindings for nearly every
    language; PHP made it part of the language's core in version 7.2 (2017),
    the same release that removed the old `mcrypt` extension (§9.10); a
    generation of applications that never chose a mode · **Status:** actively
    maintained and widely deployed; the usual answer to "which library should
    I use?" for application cryptography

**Tink.** Google published Tink on 30 August 2018, at version 1.2.0, after
using it inside its own products. Its designers, among them Daniel
Bleichenbacher and Thai Duong, had spent years finding misuse in Google's
code and attacks in other people's. Where NaCl names operations, Tink names **security
properties**. An `Aead` encrypts with associated data; a
`DeterministicAead` gives the same ciphertext for the same input, which is
sometimes what you want and is labeled so; a `StreamingAead` handles large
files; `Mac`, `PublicKeySign`, `PublicKeyVerify` and `HybridEncrypt` do what
their names say. The caller writes code against the property, and the
algorithm is a property of the **key**, not of the code. An `Aead`'s
`encrypt` takes a plaintext and associated data, and no nonce at all; the
announcement said plainly that Tink does not let users pass nonces where
reuse would be insecure.

The keys live in a **keyset**: a list of keys, each with an ID, a status and
the template that made it, one of them marked primary. The primary key
encrypts; any enabled key decrypts. Every ciphertext starts with a five-byte
prefix, the byte `0x01` and the four-byte ID of the key that made it, so
decryption goes straight to the right key (Figure 9.2). Rotation is then an
operation on the keyset, not on the code: add a key, make it primary, and old
ciphertexts still open under their old keys until they are re-encrypted and
the old key is disabled. Keysets can be stored encrypted under a key in a
cloud key management service, and the APIs that would write a keyset in
clear text carry names that warn the reader, such as Java's
`CleartextKeysetHandle` and the `InsecureSecretKeyAccess` token a caller must
pass to reach raw key bytes.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A Tink keyset with three keys and a ciphertext whose five-byte prefix names the key that made it" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">Keyset</text>
<rect x="20" y="34" width="360" height="26" fill="currentColor" opacity="0.1"/>
<text x="30" y="52">key ID</text>
<text x="140" y="52">status</text>
<text x="250" y="52">template</text>
<rect x="20" y="60" width="360" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="78">0x1c8e2a07</text>
<text x="140" y="78">enabled</text>
<text x="250" y="78">AES128_GCM</text>
<rect x="20" y="86" width="360" height="26" fill="currentColor" opacity="0.15"/>
<rect x="20" y="86" width="360" height="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="30" y="104" font-weight="bold">0x5f30b9d4</text>
<text x="140" y="104" font-weight="bold">primary</text>
<text x="250" y="104">AES256_GCM</text>
<rect x="20" y="112" width="360" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="30" y="130" opacity="0.6">0x0b77e310</text>
<text x="140" y="130" opacity="0.6">disabled</text>
<text x="250" y="130" opacity="0.6">AES128_GCM</text>
<text x="400" y="78" opacity="0.8">opens old ciphertexts</text>
<text x="400" y="104" opacity="0.8">seals everything new</text>
<text x="400" y="130" opacity="0.8">opens nothing</text>
<text x="20" y="180" font-weight="bold">Ciphertext</text>
<rect x="20" y="190" width="50" height="34" fill="currentColor" opacity="0.15"/>
<rect x="20" y="190" width="50" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="45" y="212" text-anchor="middle">0x01</text>
<rect x="70" y="190" width="130" height="34" fill="currentColor" opacity="0.15"/>
<rect x="70" y="190" width="130" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="212" text-anchor="middle">5f 30 b9 d4</text>
<rect x="200" y="190" width="420" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="410" y="212" text-anchor="middle">output of the key's own algorithm (nonce, body, tag)</text>
<text x="45" y="246" text-anchor="middle" opacity="0.7">format</text>
<text x="135" y="246" text-anchor="middle" opacity="0.7">key ID</text>
<line x1="135" y1="190" x2="135" y2="140" stroke="currentColor" stroke-width="1.2"/>
<line x1="135" y1="140" x2="70" y2="114" stroke="currentColor" stroke-width="1.2"/>
<polygon points="70,114 79,114 75,120" fill="currentColor"/>
</svg>
<figcaption>Figure 9.2. A Tink-style keyset and ciphertext. The code calls "encrypt" on the keyset; the primary key does the work and writes its ID into a five-byte prefix. Decryption reads the prefix and uses that key, so rotating keys changes the keyset and never the code. (Key IDs here are made up.)</figcaption>
</figure>

!!! note "Life story: Tink"
    **Born:** inside Google, released as open source on 30 August 2018
    (version 1.2.0) for Java, C++ and Objective-C, later Go, Python and
    others · **Purpose:** a multi-language library whose interfaces name
    security properties instead of algorithms, with keysets, key IDs and
    rotation built in, and no nonce parameters · **Helped:** Google products
    first (AdMob, Google Pay, Assistant, Firebase), then many outside users;
    it succeeded Google's earlier Keyczar (2008), whose goals it shared, and
    was hardened against the weaknesses Project Wycheproof (chapter 17) had
    found in other libraries · **Status:** maintained, now in separate
    repositories per language

**Go.** Go's standard library takes a third route: it is one library, shipped
with the language, maintained by a small team, and governed by a written
policy. The Go cryptography principles, written by Filippo Valsorda and last
updated in June 2019, rank four goals in order: secure, safe, practical,
modern. "Safe" means the libraries should be easy to use correctly, and that
unsafe functionality must be opted into explicitly. Several decisions follow
from that order. Go's TLS 1.3 implementation does not let a program choose
TLS 1.3 cipher suites at all, because every suite it offers is good. In Go
1.24 (February 2025), `crypto/rand.Read` was documented never to return an
error: if the operating system's generator ever fails, the program crashes
rather than hand a caller an error that might be ignored and a buffer of
zeros that might be used as a key. The same release added
`cipher.NewGCMWithRandomNonce`, an AES-GCM whose `Seal` chooses the nonce and
prepends it, because the older `cipher.AEAD` interface takes the nonce from the caller.
The older interface remains the one most Go code calls, an example of how
long an interface lives once it ships (§9.10).

The four libraries side by side:

| | NaCl (2008) | libsodium (2013) | Tink (2018) | Go standard library |
|---|---|---|---|---|
| unit of the API | operation (`box`, `secretbox`) | operation, plus `_easy` forms | security property (`Aead`, `Mac`) | package per primitive, high-level TLS |
| algorithm chosen by | the library | the library (some choice in AEAD) | the key's template | the caller, from a short list |
| nonce | caller, 24 bytes | caller, 24 bytes (random is safe) | never the caller | caller, except `NewGCMWithRandomNonce` |
| key IDs and rotation | none | none | built into keysets | none |
| failure | `-1`, no plaintext | `-1`, no plaintext | one exception | one error value, or a crash for the generator |

Only Tink takes the nonce away entirely and records which key made a
ciphertext. The next three sections build those properties, and a version,
into a format of our own.

What to do with this:

- For application code, start from libsodium (or a binding of it) or Tink;
  use your platform's low-level primitives only inside a reviewed wrapper.
- Prefer interfaces that hold the nonce and the algorithm for you. If yours
  takes a nonce, generate it in one function that everything calls.
- Store keys in a structure that records an ID, a status and an algorithm
  for each key, even if you have only one key today.

## 9.5 Nonces the caller never sees

*Level: intermediate.*

Of the questions in Figure 9.1, the nonce is the one even good libraries
still ask, and the one whose wrong answer costs most. With a stream cipher or
a counter mode, a repeated nonce under one key repeats the keystream, and two
ciphertexts XOR to the XOR of their plaintexts, as caller 1 found in §9.3.
With AES-GCM it is worse: a repeat also hands the attacker enough to compute
the authentication key and forge messages from then on
([Cryptanalysis §10.7](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)).
In 2016 Böck and colleagues found 184 HTTPS servers on the internet repeating
GCM nonces (chapter 1, §1.10). There are three ways to take this decision away
from the caller.

**Counters kept by the protocol.** A nonce only needs to be unique, not
secret or unpredictable, so a counter is the natural choice when one party
sends everything under a key and can remember where it got to. TLS 1.3 does
exactly that: the nonce for each record is the record's sequence number mixed
with a fixed per-connection value, and the implementation has no say in it.
Counters fail when there is no single place to keep them: several servers
sharing a key, a process that restarts and forgets, a virtual machine
restored from a snapshot that replays the same counter values (chapter 4).

**Random nonces long enough to be safe.** If each nonce is chosen at random
from $2^n$ values, the chance that $q$ messages contain a repeat is close to
the birthday bound:

$$
p \approx \frac{q^2}{2^{n+1}}.
$$

With GCM's 96-bit nonce and $q = 2^{32}$ messages, $p \approx 2^{64}/2^{97} =
2^{-33}$, which is why SP 800-38D limits a key used with random 96-bit nonces
to $2^{32}$ messages. That limit is real: a busy service can send $2^{32}$
messages in days. With a 192-bit nonce, even $2^{64}$ messages give $2^{-65}$.
The program prints the table:

```python
def chance(q_log2, bits):            # q random nonces of this size: P(some repeat) ~ q^2 / 2^(bits+1)
    e = 2 * q_log2 - 1 - bits
    return "~1" if e >= 0 else "2^%d" % e

print("messages    64-bit   96-bit  192-bit")
for q in (32, 40, 48, 64):
    print("  2^%-6d" % q, *["%7s" % chance(q, b) for b in (64, 96, 192)])
```

```text
messages    64-bit   96-bit  192-bit
  2^32        2^-1   2^-33  2^-129
  2^40          ~1   2^-17  2^-113
  2^48          ~1    2^-1   2^-97
  2^64          ~1      ~1   2^-65
```

The approximation is good only while $p$ is small; where it reaches 1 the
table just says that a repeat is all but certain. Figure 9.3 turns the same
formula around and asks how many messages a key can protect before the chance
of a repeat reaches $2^{-32}$, a common safety margin.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Bar chart: messages per key before a one in four billion chance of a nonce repeat, for 64, 96, 128 and 192-bit random nonces" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">Messages per key before a 2^-32 chance of any nonce repeat</text>
<line x1="150" y1="36" x2="150" y2="196" stroke="currentColor" stroke-width="1.2"/>
<text x="140" y="60" text-anchor="end">64-bit nonce</text>
<rect x="150" y="44" width="83" height="24" fill="currentColor" opacity="0.4"/>
<text x="240" y="61">2^16, about 65,000</text>
<text x="140" y="96" text-anchor="end">96-bit (GCM)</text>
<rect x="150" y="80" width="163" height="24" fill="currentColor" opacity="0.4"/>
<text x="320" y="97">2^32, about 4 billion</text>
<text x="140" y="132" text-anchor="end">128-bit</text>
<rect x="150" y="116" width="243" height="24" fill="currentColor" opacity="0.4"/>
<text x="400" y="133">2^48</text>
<text x="140" y="168" text-anchor="end">192-bit (XChaCha)</text>
<rect x="150" y="152" width="403" height="24" fill="currentColor" opacity="0.7"/>
<text x="560" y="169">2^80</text>
<text x="150" y="216" opacity="0.7">bar length is the power of two: each extra 2 bits of nonce doubles the safe count</text>
</svg>
<figcaption>Figure 9.3. How many messages one key can protect with random nonces before the chance of a repeat reaches 2<sup>-32</sup>, from q ≈ 2<sup>(n-31)/2</sup>. At 96 bits the budget is reachable by a busy service; at 192 bits it is not reachable by anything.</figcaption>
</figure>

That is the argument for **XChaCha20-Poly1305**, the AEAD with a 192-bit
nonce. It is built from ChaCha20-Poly1305 (RFC 8439) with one extra step that
Bernstein first used for XSalsa20 in 2008: a function called HChaCha20 takes
the key and the first 16 bytes of the nonce and produces a fresh 256-bit
subkey, and ordinary ChaCha20-Poly1305 then runs under that subkey with the
remaining 8 bytes of the nonce. The cost is one extra ChaCha20 block per
message. In return, the library can choose every nonce at random and the
caller never needs to see one; this is what libsodium recommends and what
§9.3's `SecretBox` imitates with its 24-byte nonce.

!!! note "Life story: XChaCha20-Poly1305"
    **Born:** 2008 in its first form, when Daniel Bernstein extended
    Salsa20's nonce to 192 bits as XSalsa20 (used in NaCl's `secretbox`);
    the ChaCha version written up by Scott Arciszewski as
    draft-arciszewski-xchacha (September 2018), adopted by the IRTF's CFRG
    as draft-irtf-cfrg-xchacha, last revised in January 2020 · **Purpose:**
    an AEAD whose nonce is long enough to choose at random for any number of
    messages a key will ever see · **Helped:** libsodium's default AEAD,
    Tink, Go's `chacha20poly1305.NewX`, WireGuard's cookie messages, and
    every design that wants nonces out of the caller's hands · **Status:**
    widely implemented; the draft expired in July 2020 without becoming an
    RFC, so the specification of record is still an expired draft, a gap
    worth knowing when a standards checklist asks for an RFC

**Modes that survive a repeat.** The third answer accepts that nonces will
sometimes repeat and limits the damage. A **synthetic IV** (SIV) mode, from
Phillip Rogaway and Thomas Shrimpton (2006), first computes a MAC over the
associated data, the nonce and the plaintext, then uses that MAC as the IV
for counter-mode encryption. Two different messages get different IVs even
under the same nonce, so no keystream is shared; the same message under the
same nonce gives the same ciphertext, so a repeat reveals only that a message
was sent twice. AES-SIV is RFC 5297 (2008); AES-GCM-SIV, by Shay Gueron, Adam
Langley and Yehuda Lindell, builds the same structure from GCM's fast parts
and is RFC 8452 (2019). Book 1's [§10.10](../../book/10-Message-Authentication.md)
describes both constructions; the program shows the property that matters to
an API designer, using the HMAC stand-in for both the MAC and the keystream:

```python
import hashlib, hmac, secrets

def keystream(key, iv, n):           # teaching stand-in for a stream cipher
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, iv + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

enc, mac = secrets.token_bytes(32), secrets.token_bytes(32)

def ctr_seal(nonce, pt):             # nonce-based: the nonce alone picks the keystream
    return xor(pt, keystream(enc, nonce, len(pt)))

def siv_seal(nonce, pt, ad=b""):     # SIV-shaped: the IV is a MAC of everything, computed first
    siv = hmac.new(mac, len(ad).to_bytes(4, "big") + ad + nonce + pt, hashlib.sha256).digest()[:16]
    return siv + xor(pt, keystream(enc, siv, len(pt)))

def siv_open(nonce, ct, ad=b""):
    siv, body = ct[:16], ct[16:]
    pt = xor(body, keystream(enc, siv, len(body)))
    good = hmac.new(mac, len(ad).to_bytes(4, "big") + ad + nonce + pt, hashlib.sha256).digest()[:16]
    if not hmac.compare_digest(siv, good):
        raise ValueError("cannot open")
    return pt

stuck = bytes(12)                    # a nonce that repeats: a restored snapshot, a reset counter
m1, m2 = b"transfer 500 to carol", b"transfer 900 to dave!"
c1, c2 = ctr_seal(stuck, m1), ctr_seal(stuck, m2)
print("CTR, repeated nonce:  c1 xor c2 == m1 xor m2 ->", xor(c1, c2) == xor(m1, m2))
s1, s2, s3 = siv_seal(stuck, m1), siv_seal(stuck, m2), siv_seal(stuck, m1)
print("SIV, repeated nonce:  c1 xor c2 == m1 xor m2 ->", xor(s1[16:], s2[16:]) == xor(m1, m2))
print("SIV, same message twice gives the same bytes ->", s1 == s3)
print(siv_open(stuck, s2))
```

```text
CTR, repeated nonce:  c1 xor c2 == m1 xor m2 -> True
SIV, repeated nonce:  c1 xor c2 == m1 xor m2 -> False
SIV, same message twice gives the same bytes -> True
b'transfer 900 to dave!'
```

Under a stuck nonce, the counter-mode ciphertexts leak the XOR of the two
messages, as before. The SIV ciphertexts do not: each message got its own IV
from its own contents. The one thing SIV gives away is the third line: the
same message sealed twice under the same nonce is the same bytes, so an
observer learns that it repeated. That is the best any scheme can do with a
repeated nonce, and it is called **nonce-misuse resistance**.

The price is that the whole plaintext must be read before the IV is known,
so encryption takes two passes and cannot stream a message of unknown length.
For records, tokens, keys and database fields that is no price at all, and an
API that encrypts such things can use AES-GCM-SIV and stop worrying about the
nonce. SIV with no nonce at all is deterministic encryption, which Tink offers
as a separate `DeterministicAead` precisely so that nobody gets it by
accident: it is right for wrapping keys and for looking up an encrypted value
by equality, and wrong for anything where equal plaintexts must not be
visible (chapter 14).

One more property belongs here. GCM and ChaCha20-Poly1305 are not
**key-committing**: an attacker who chooses keys can build one ciphertext
that opens under two keys to two messages (book 1, §10.10, tells the 2018
Facebook Messenger case). An API that lets users supply keys, or derives them
from passwords, should store and check a hash of the key or use a committing
AEAD.

What to do with this:

- Do not expose a nonce parameter in an interface you design. Choose it
  inside, from a counter you can prove unique or at random from at least 192
  bits.
- If you must use AES-GCM with random 96-bit nonces, count the messages per
  key and rotate the key well before $2^{32}$.
- For small records whose nonces you cannot guarantee (many writers, restored
  snapshots), use AES-GCM-SIV or AES-SIV.
- Never expose deterministic encryption under the same name as randomized
  encryption.

## 9.6 Typed keys and key IDs

*Level: intermediate.*

In most code a key is a byte string: `bytes` in Python, `[]byte` in Go,
`byte[]` in Java, `unsigned char *` in C. A byte string has no idea what it
is for. It can be passed as a MAC key when it was made as an encryption key,
compared with `==`, written into a configuration dump, put in a cache,
pickled into a task queue, or printed by a debugging line, and nothing
complains. JWT's algorithm-confusion attack, in which a server's RSA public
key is used as an HMAC secret
([Protocols §14.6](../protocols/14-OAuth-OpenID-Connect-and-JWT.md)), is
at bottom this problem: the verification function accepted "a key", and a
public key is a key.

**Break it.** Two lines of ordinary code, both wrong, both silent:

```python
import hashlib, hmac, secrets

# Break it: keys as bare bytes. Nothing stops a key doing the wrong job or being printed.
enc_key = secrets.token_bytes(32)
mac_key = secrets.token_bytes(32)
def make_tag(key, msg):
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:16]
config = {"service": "billing", "enc_key": enc_key}
log_line = "starting with %s" % config                  # the kind of line every service writes
print("tag made with the encryption key:", len(make_tag(enc_key, b"refund 40")), "hex digits")
print("the whole key is in the log line:", repr(enc_key) in log_line)
```

```text
tag made with the encryption key: 16 hex digits
the whole key is in the log line: True
```

**Fix it.** Give keys a type. A key object carries its purpose and a public
ID, hands out its bytes only to code that asks for the right purpose,
compares in constant time, prints as a placeholder, and refuses to be
serialized by the general-purpose machinery that would otherwise copy it into
caches, queues and crash reports:

```python
import hashlib, hmac, secrets

class SecretKey:
    """A key that knows its job, has a public ID, and will not print itself."""
    __slots__ = ("_raw", "purpose", "kid")

    def __init__(self, raw, purpose, kid):
        self._raw, self.purpose, self.kid = bytes(raw), purpose, kid

    @classmethod
    def generate(cls, purpose):
        raw = secrets.token_bytes(32)
        kid = hashlib.sha256(b"key id" + raw).hexdigest()[:8]   # a public name derived from the key
        return cls(raw, purpose, kid)

    def material_for(self, purpose):
        if purpose != self.purpose:
            raise TypeError("this key is for %r, not %r" % (self.purpose, purpose))
        return self._raw

    def __repr__(self):
        return "SecretKey(%s, kid=%s, <hidden>)" % (self.purpose, self.kid)
    __str__ = __repr__

    def __reduce__(self):            # no pickling into caches, queues or crash reports
        raise TypeError("SecretKey cannot be serialized; use the key store")

    def __eq__(self, other):         # equal only to itself, compared in constant time
        return isinstance(other, SecretKey) and hmac.compare_digest(self._raw, other._raw)
    __hash__ = object.__hash__

def make_tag(key, msg):
    return hmac.new(key.material_for("mac"), msg, hashlib.sha256).hexdigest()[:16]

enc_key = SecretKey(bytes(range(32)), "encrypt", "4c1e9d07")   # a fixed demo key, so the output is stable
mac_key = SecretKey.generate("mac")
config = {"service": "billing", "enc_key": enc_key}
print("logged:", config)
print("tag:   ", len(make_tag(mac_key, b"refund 40")), "hex digits")
for attempt in (lambda: make_tag(enc_key, b"refund 40"),
                lambda: __import__("pickle").dumps(enc_key)):
    try:
        attempt()
    except TypeError as e:
        print("refused:", e)
```

```text
logged: {'service': 'billing', 'enc_key': SecretKey(encrypt, kid=4c1e9d07, <hidden>)}
tag:    16 hex digits
refused: this key is for 'encrypt', not 'mac'
refused: SecretKey cannot be serialized; use the key store
```

Python cannot stop a determined caller from reaching `_raw`, and it cannot
wipe the bytes afterwards (chapter 8, §8.6). The type is not a security
boundary against the program's own code. It is a guard against accidents,
which is what the misuse studies found most mistakes to be. In languages with
stronger types the same idea goes further: Rust libraries give each key kind
its own type, so passing an encryption key to a MAC function does not
compile; Tink requires a `SecretKeyAccess` token, which only code that has
been reviewed should hold, to read key bytes at all.

**Key IDs.** The second field of the type, the key ID, solves a problem that
every long-lived system meets: a ciphertext made last year must still be
opened after the key has been rotated. Without an ID the reader must try
every key it has, which is slow, makes failures ambiguous, and, if trying a
key has any side effect, can be its own oracle. With an ID in the ciphertext
the reader picks the one key and either opens or fails. There are three
common ways to make IDs:

- **Random IDs**, as Tink's 32-bit IDs. They reveal nothing about the key;
  the keyset must check for collisions.
- **Fingerprints**, a labeled hash of the key, as `SecretKey.generate` above
  and as PGP and SSH do for public keys. Never use a prefix of a secret key.
- **Names with dates**, such as `billing-2026-11`: readable in logs, unique
  by policy.

Whatever the choice, the key ID in a message is **attacker-controlled
input**. It may select only among keys the reader already holds and trusts
for this purpose. JOSE's `kid`, `jku` and `x5u` header fields have been abused
in exactly this way: libraries that used `kid` as a file path or a database
query, or fetched a key from the URL a token named, let the token choose its
own verification key. A key ID is an index into your keyring, never a
pointer out of it.

What to do with this:

- Wrap raw key bytes in a type that records purpose and ID, hides itself when
  printed and refuses serialization; give it one method that returns the
  bytes for a stated purpose.
- Put a key ID in every ciphertext, signature and token you produce.
- Look key IDs up in a fixed keyring; treat an unknown ID as an ordinary
  failure, with the same error as a bad tag.

## 9.7 Versioned envelopes instead of negotiation

*Level: intermediate.*

Formats change. Algorithms are retired, keys grow, a better mode appears. A
format that cannot say which rules it was written under cannot change without
breaking every stored copy. Chapter 1 (§1.7) set out the two ways to allow
for change, **negotiation**, where each message names its algorithms from a
list, and **versioning**, where a single version number fixes every choice,
and argued for the second. This section builds it.

JSON Web Tokens are the standing argument against the first. A JWT's header
carries an `alg` field naming the algorithm that signed it, and a verifier
reads that field before it has verified anything. In March 2015 Tim McLean
showed that several popular libraries simply obeyed it. A token with
`"alg": "none"`, an "unsecured" token with an empty signature that the
standard allows, was accepted as valid by anyone. A token signed with HMAC,
using the server's published RSA public key as the HMAC secret, was accepted
by servers that expected RSA, because the library used whatever key it was
given with whatever algorithm the token named. In both cases the attacker
chose the algorithm, which is the defining weakness of negotiation inside a
message. RFC 8725 (2020), the JWT best current practice, now requires
verifiers to fix the algorithm for each key rather than read it from the
token; [Protocols §14.6](../protocols/14-OAuth-OpenID-Connect-and-JWT.md)
shows both forgeries in code and the strict verifier that stops them.

The versioned alternative has a long and quiet record. **Fernet**, the token
format behind the `cryptography` package's high-level recipe in Python, starts
every token with the byte `0x80`, followed by an 8-byte timestamp, a 16-byte
IV, the AES-128-CBC ciphertext and an HMAC-SHA256 tag over everything before
it. A reader checks the version byte and refuses anything else; version
`0x80` means exactly those algorithms and nothing more. PASETO, designed in
2018 as a replacement for JWT, puts a version and a purpose in clear text at
the start of each token (`v4.local.`, `v4.public.`), and each version fixes
its algorithms. Neither format has an algorithm field to lie about.

The format below grows §1.9's sealed message into the shape used in
production. It is called version 2 here so that a reader can tell it from
chapter 1's version 1. It adds a key ID, a 192-bit nonce and a keyring with
rotation, and it keeps the associated data, the context, out of the stored
bytes but inside the tag (Figure 9.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Layout of the version 2 sealed format: version, key ID, nonce, ciphertext, tag; the tag covers the header, the context and the ciphertext" fill="currentColor" font-size="14">
<text x="45" y="30" text-anchor="middle" opacity="0.7">1</text>
<text x="115" y="30" text-anchor="middle" opacity="0.7">4</text>
<text x="235" y="30" text-anchor="middle" opacity="0.7">24 bytes</text>
<text x="410" y="30" text-anchor="middle" opacity="0.7">as long as the plaintext</text>
<text x="565" y="30" text-anchor="middle" opacity="0.7">32</text>
<rect x="20" y="40" width="50" height="40" fill="currentColor" opacity="0.15"/>
<rect x="20" y="40" width="50" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="45" y="65" text-anchor="middle" font-weight="bold">0x02</text>
<rect x="70" y="40" width="90" height="40" fill="currentColor" opacity="0.15"/>
<rect x="70" y="40" width="90" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="65" text-anchor="middle">key ID</text>
<rect x="160" y="40" width="150" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="65" text-anchor="middle">random nonce</text>
<rect x="310" y="40" width="200" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="410" y="65" text-anchor="middle">ciphertext</text>
<rect x="510" y="40" width="110" height="40" fill="currentColor" opacity="0.15"/>
<rect x="510" y="40" width="110" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="65" text-anchor="middle" font-weight="bold">tag</text>
<line x1="20" y1="96" x2="310" y2="96" stroke="currentColor" stroke-width="1.2"/>
<text x="165" y="114" text-anchor="middle" opacity="0.8">header: read first, checked by the tag</text>
<rect x="160" y="136" width="300" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="310" y="158" text-anchor="middle">context (row ID, user ID): not stored</text>
<text x="20" y="192" opacity="0.8">tag = HMAC(MAC subkey of that key ID, header + length + context + ciphertext)</text>
<line x1="460" y1="153" x2="550" y2="84" stroke="currentColor" stroke-width="1.2"/>
<polygon points="550,84 541,87 547,92" fill="currentColor"/>
</svg>
<figcaption>Figure 9.4. The version 2 sealed format, 61 bytes plus the plaintext. The version byte fixes every algorithm; the key ID picks one key from the keyring; the context is supplied by the reader and must match. Every failure, from an unknown version to a wrong context, gives the same error.</figcaption>
</figure>

```python
import hashlib, hmac, secrets

VERSION = 2                           # version 2 fixes every choice below; anything else is refused
HEAD = 1 + 4 + 24                     # version, key ID, nonce
TAG = 32

class CannotOpen(Exception):
    pass

def keystream(key, nonce, n):         # teaching stand-in for XChaCha20 (192-bit nonce)
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

class Keyring:
    def __init__(self):
        self._keys = {}               # key ID (4 bytes) -> (encryption subkey, MAC subkey)
        self.primary = None

    def rotate(self):                 # a new key seals from now on; old keys still open
        master = secrets.token_bytes(32)
        kid = secrets.token_bytes(4)
        while kid in self._keys:
            kid = secrets.token_bytes(4)
        self._keys[kid] = (hmac.new(master, b"seal v2 enc", hashlib.sha256).digest(),
                           hmac.new(master, b"seal v2 mac", hashlib.sha256).digest())
        self.primary = kid
        return kid

    def retire(self, kid):            # after every record has been re-sealed
        del self._keys[kid]

    def get(self, kid):
        return self._keys.get(kid)

def _tag(mac_key, head, context, body):
    data = head + len(context).to_bytes(4, "big") + context + body
    return hmac.new(mac_key, data, hashlib.sha256).digest()

def seal(ring, plaintext, context):
    enc, mac = ring.get(ring.primary)
    head = bytes([VERSION]) + ring.primary + secrets.token_bytes(24)
    body = bytes(p ^ k for p, k in zip(plaintext, keystream(enc, head[5:], len(plaintext))))
    return head + body + _tag(mac, head, context, body)

def open_(ring, sealed, context):
    keys = ring.get(sealed[1:5]) if len(sealed) >= HEAD + TAG and sealed[0] == VERSION else None
    if keys is None:
        raise CannotOpen("cannot open")
    enc, mac = keys
    head, body, tag = sealed[:HEAD], sealed[HEAD:-TAG], sealed[-TAG:]
    if not hmac.compare_digest(tag, _tag(mac, head, context, body)):
        raise CannotOpen("cannot open")
    return bytes(c ^ k for c, k in zip(body, keystream(enc, head[5:], len(body))))

ring = Keyring()
k1 = ring.rotate()
old = seal(ring, b"card ending 4242", b"customer 1001")
k2 = ring.rotate()
new = seal(ring, b"card ending 1881", b"customer 1002")
print(len(new), "bytes;", "key IDs differ:", old[1:5] != new[1:5])
print(open_(ring, old, b"customer 1001"), open_(ring, new, b"customer 1002"))

tests = [("wrong row", new, b"customer 1001"),
         ("version 1", b"\x01" + new[1:], b"customer 1002"),
         ("unknown key", new[:1] + bytes(4) + new[5:], b"customer 1002"),
         ("flipped bit", new[:40] + bytes([new[40] ^ 1]) + new[41:], b"customer 1002"),
         ("cut short", new[:60], b"customer 1002")]
for name, blob, ctx in tests:
    try:
        open_(ring, blob, ctx)
    except CannotOpen as e:
        print("%-12s %s" % (name + ":", e))
ring.retire(k1)
try:
    open_(ring, old, b"customer 1001")
except CannotOpen as e:
    print("%-12s %s" % ("retired key:", e))
```

```text
77 bytes; key IDs differ: True
b'card ending 4242' b'card ending 1881'
wrong row:   cannot open
version 1:   cannot open
unknown key: cannot open
flipped bit: cannot open
cut short:   cannot open
retired key: cannot open
```

The 77 bytes are 29 of header, 16 of ciphertext and 32 of tag. Each part of
the format has a reason:

- **The version comes first and is inside the tag.** A reader decides from
  one byte whether it knows the format at all, and an attacker who changes
  that byte breaks the tag. The subkeys are also derived with labels that
  name the version (`seal v2 enc`), so even a future reader that accepted
  several versions could not be tricked into reading a version 2 ciphertext
  under version 3's rules: the keys would differ.
- **The key ID selects, it does not describe.** It names a key the reader
  already holds; it carries no algorithm, no URL, no parameters. An unknown ID
  fails like everything else.
- **The context is required here**, not optional as in `SecretBox`. Moving
  customer 1002's card number into customer 1001's row fails, which stops an
  attacker who can write to the database but not read keys from rearranging
  valid ciphertexts. Chapter 14 builds database encryption on this.
- **Lengths are fixed or prefixed**, so no two different inputs give the same
  bytes under the MAC (chapter 2).
- **Rotation is a keyring operation**: `rotate` adds a primary key, old
  ciphertexts still open under their own IDs, and `retire` removes a key once
  its records are re-sealed. Chapter 10 builds the full key life cycle.

A real implementation would replace the stand-in with XChaCha20-Poly1305 or
AES-GCM-SIV, pass the header and context as associated data, and keep the
same layout. What the reader can trust is that a version 2 ciphertext means
one thing, forever.

What to do with this:

- Start every ciphertext, token and key file you define with a version, put
  the version under the authentication, and refuse versions you do not list.
- Never let a message name its own algorithm, key location or parameters; let
  it name a version and a key ID, and look both up in tables you control.
- Pass the record's identity as associated data, so a ciphertext cannot be
  moved.
- In JWT verifiers, configure the expected algorithm per key and reject
  `none` (RFC 8725).

## 9.8 Errors that do not leak

*Level: intermediate.*

An attacker who cannot read your ciphertexts can usually send you some. Each
one they send gets a reaction: an error message, a status code, a log line, a
closed connection, a delay. If the reaction depends on anything about the
plaintext, the receiver is an **oracle**, a machine that answers questions
about secrets one bit at a time. The ASP.NET attack of §9.1 used one
difference in an error. [Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)
tells the attacker's side of padding oracles, POODLE and Lucky Thirteen; this
section is the defender's side, and it has one rule: **every failure takes the
same path**, with the same answer, at the same time.

The program below builds the classic case. It has a toy 128-bit block cipher
(a four-round Feistel network with HMAC as its round function, the
construction Michael Luby and Charles Rackoff proved sound in 1988, standing
in for AES), CBC mode with PKCS#7 padding, and three servers. The first two
use **MAC-then-encrypt**, the order of SSL, TLS's CBC suites and ASP.NET: the
sender appends a MAC to the message and encrypts both; the receiver decrypts,
removes the padding and only then checks the MAC. The first server says what
went wrong. The second has learned from Microsoft's advisory and says
"cannot open" for everything, but it still checks the padding first and
returns at once when the padding is bad. The program models the time a reply
takes as a count of steps, as chapter 1 did: one step for a bad padding, two
when the server goes on to compute the MAC. The third server uses
**encrypt-then-MAC**: the tag covers the IV and the ciphertext and is checked
before anything is decrypted. The attacker is given everything a network
attacker sees, the reply and the time, and uses any difference it finds:

```python
import hashlib, hmac, secrets

# A toy 128-bit block cipher: a 4-round Feistel network with HMAC as the round
# function (Luby and Rackoff's construction). A teaching stand-in for AES.
def _f(key, r, half):
    return hmac.new(key, bytes([r]) + half, hashlib.sha256).digest()[:8]
def _x(a, b):
    return bytes(i ^ j for i, j in zip(a, b))
def block_dec(key, c):
    l, r = c[:8], c[8:]
    for rnd in (3, 2, 1, 0):
        l, r = _x(r, _f(key, rnd, l)), l
    return l + r
def block_enc(key, p):
    l, r = p[:8], p[8:]
    for rnd in range(4):
        l, r = r, _x(l, _f(key, rnd, r))
    return l + r

def cbc_enc(key, data):
    n = 16 - len(data) % 16
    data += bytes([n]) * n                       # PKCS#7 padding
    out = prev = secrets.token_bytes(16)
    for i in range(0, len(data), 16):
        prev = block_enc(key, _x(data[i:i + 16], prev))
        out += prev
    return out

def cbc_dec(key, blob):                          # returns (plaintext or None if the padding is bad)
    pt = b"".join(_x(block_dec(key, blob[i:i + 16]), blob[i - 16:i]) for i in range(16, len(blob), 16))
    n = pt[-1]
    if not 1 <= n <= 16 or pt[-n:] != bytes([n]) * n:
        return None
    return pt[:-n]

ek, mk = secrets.token_bytes(32), secrets.token_bytes(32)

def server_mac_then_encrypt(blob, one_error):    # returns what an attacker sees: (reply, time)
    pt = cbc_dec(ek, blob)
    if pt is None:
        return ("cannot open" if one_error else "bad padding"), 1
    msg, tag = pt[:-32], pt[-32:]                # padding was fine, so the server goes on to the MAC
    ok = len(pt) >= 32 and hmac.compare_digest(tag, hmac.new(mk, msg, hashlib.sha256).digest())
    return ("ok" if ok else "cannot open" if one_error else "bad MAC"), 2

def server_encrypt_then_mac(blob):               # the MAC covers the IV and ciphertext: checked first
    body, tag = blob[:-32], blob[-32:]
    if len(blob) < 64 or not hmac.compare_digest(tag, hmac.new(mk, body, hashlib.sha256).digest()):
        return "cannot open", 1
    return ("ok" if cbc_dec(ek, body) is not None else "cannot open"), 1

def attack(target, oracle):
    """Recover one block's plaintext, using any difference the oracle shows."""
    inter = bytearray(16)                        # the block cipher's output for target, byte by byte
    for j in range(15, -1, -1):
        pad = 16 - j
        def ask(g, tweak=0):
            fake = bytearray(16)
            fake[j] = g
            for k in range(j + 1, 16):
                fake[k] = inter[k] ^ pad
            if j == 15:
                fake[14] = tweak
            return oracle(bytes(fake) + target)
        answers = [ask(g) for g in range(256)]
        usual = max(set(answers), key=answers.count)               # the answer to a bad padding
        hits = [g for g in range(256) if answers[g] != usual]
        if j == 15:
            hits = [g for g in hits if ask(g, tweak=1) != usual]   # rule out a lucky ...02 02 ending
        if not hits:
            return None                                            # every answer looked the same
        inter[j] = hits[0] ^ pad
    return bytes(inter)

secret = b"token=7Hq2xL9pVw"
blob = cbc_enc(ek, secret + hmac.new(mk, secret, hashlib.sha256).digest())
iv, c1 = blob[:16], blob[16:32]

for name, oracle in [("different errors", lambda b: server_mac_then_encrypt(b, False)),
                     ("one error message", lambda b: server_mac_then_encrypt(b, True))]:
    inter = attack(c1, oracle)
    print("%-18s" % name, _x(inter, iv) if inter else "nothing learned")
etm = cbc_enc(ek, secret)
etm += hmac.new(mk, etm, hashlib.sha256).digest()
inter = attack(etm[16:32], server_encrypt_then_mac)
print("%-18s" % "encrypt-then-MAC", _x(inter, etm[:16]) if inter else "nothing learned")
```

```text
different errors   b'token=7Hq2xL9pVw'
one error message  b'token=7Hq2xL9pVw'
encrypt-then-MAC   nothing learned
```

The first server gave the secret away in about 4,100 questions, 256 for each
of 16 bytes and one more to check the last. The second gave it away just as
fast. Its replies were identical, but its timing was not, and the attacker
did not care which channel carried the difference. Microsoft's workaround
added a random delay for that reason, and a random delay only adds noise
that more samples average away; it does not remove the signal. The third
server leaked nothing, because a forged ciphertext never reaches the code
whose behavior depends on the plaintext: every forgery fails at the first
check, in the same way, after the same work.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two receivers: one that decrypts, checks padding and then the MAC, with two failure exits; one that checks the MAC over everything first, with one failure exit" fill="currentColor" font-size="14">
<text x="150" y="22" text-anchor="middle" font-weight="bold">An oracle: two ways to fail</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">One way to fail</text>
<rect x="70" y="36" width="160" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="56" text-anchor="middle">decrypt</text>
<line x1="150" y1="66" x2="150" y2="86" stroke="currentColor" stroke-width="1.2"/>
<rect x="70" y="86" width="160" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="106" text-anchor="middle">padding valid?</text>
<line x1="150" y1="116" x2="150" y2="136" stroke="currentColor" stroke-width="1.2"/>
<rect x="70" y="136" width="160" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="156" text-anchor="middle">MAC valid?</text>
<line x1="150" y1="166" x2="150" y2="186" stroke="currentColor" stroke-width="1.2"/>
<text x="150" y="204" text-anchor="middle">plaintext</text>
<line x1="70" y1="101" x2="30" y2="101" stroke="currentColor" stroke-width="1.2"/>
<text x="26" y="96" text-anchor="end" font-size="12">no</text>
<rect x="8" y="216" width="120" height="26" fill="currentColor" opacity="0.2"/>
<text x="68" y="234" text-anchor="middle" font-size="13">fail fast (1 step)</text>
<line x1="30" y1="101" x2="30" y2="216" stroke="currentColor" stroke-width="1.2"/>
<line x1="230" y1="151" x2="260" y2="151" stroke="currentColor" stroke-width="1.2"/>
<line x1="260" y1="151" x2="260" y2="216" stroke="currentColor" stroke-width="1.2"/>
<rect x="170" y="216" width="130" height="26" fill="currentColor" opacity="0.2"/>
<text x="235" y="234" text-anchor="middle" font-size="13">fail slow (2 steps)</text>
<line x1="320" y1="30" x2="320" y2="244" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<rect x="390" y="36" width="180" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="480" y="56" text-anchor="middle">MAC over everything?</text>
<line x1="480" y1="66" x2="480" y2="86" stroke="currentColor" stroke-width="1.2"/>
<rect x="390" y="86" width="180" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="480" y="106" text-anchor="middle">decrypt</text>
<line x1="480" y1="116" x2="480" y2="136" stroke="currentColor" stroke-width="1.2"/>
<text x="480" y="154" text-anchor="middle">plaintext</text>
<line x1="570" y1="51" x2="610" y2="51" stroke="currentColor" stroke-width="1.2"/>
<line x1="610" y1="51" x2="610" y2="216" stroke="currentColor" stroke-width="1.2"/>
<text x="600" y="46" text-anchor="end" font-size="12">no</text>
<rect x="420" y="216" width="200" height="26" fill="currentColor" opacity="0.2"/>
<text x="520" y="234" text-anchor="middle" font-size="13">"cannot open", every time</text>
</svg>
<figcaption>Figure 9.5. Where the oracle lives. On the left, a forged ciphertext can fail at two places, and the attacker learns which from the reply or from the time. On the right, every forgery fails at the first check, before any plaintext exists, so there is nothing for the failure to depend on.</figcaption>
</figure>

**One error path** therefore means more than one error message. It means:

1. **Authenticate first, over everything.** Check the tag over the version,
   the key ID, the nonce, the associated data and the ciphertext before
   decrypting, parsing or decompressing anything. With an AEAD this is
   automatic, provided the API returns no plaintext until the tag has checked;
   a streaming API that releases plaintext early rebuilds the oracle.
2. **One exception type, one message.** `CannotOpen("cannot open")` for a bad
   length, an unknown version, an unknown key ID, a wrong context and a bad
   tag. The caller has nothing to branch on, so it cannot leak a branch.
3. **Constant-time comparison of the tag** ([chapter 5](05-Constant-Time-Programming.md)),
   so the time of the one failure does not depend on how close the forgery
   came.
4. **The same outward behavior.** The same HTTP status, the same response
   size, the same connection handling, the same log line. An attacker reads
   all of these.

Where the design cannot avoid parsing before authenticating, the defense is
to make the failure **implicit**: compute something plausible and carry on, so
that the difference surfaces later, everywhere at once. RSA encryption with
PKCS#1 v1.5 padding is the standing example. Daniel Bleichenbacher showed in
1998 that a server revealing whether the padding of an RSA ciphertext was
valid lets an attacker decrypt it, with about a million queries. TLS answered
by telling servers, on a bad padding, to substitute a random premaster
secret and continue the handshake, so that the failure would show only as a
wrong Finished message, the same as for a wrong key. Implementations kept
getting the substitution subtly wrong. In December 2017 Hanno Böck, Juraj
Somorovsky and Craig Young found the oracle alive again (ROBOT), and in 2023
Hubert Kario's "Marvin" work showed that many RSA implementations still
leaked the padding check through timing alone. The lasting fix was to stop
using RSA key transport: TLS 1.3 removed it.

!!! note "Life story: ROBOT"
    **Born:** December 2017, Hanno Böck, Juraj Somorovsky and Craig Young,
    "Return Of Bleichenbacher's Oracle Threat" (USENIX Security 2018) ·
    **Purpose:** to test whether servers still leaked RSA PKCS#1 v1.5 padding
    validity, 19 years after Bleichenbacher; they found almost a third of
    the top 100 web domains vulnerable, Facebook and PayPal among them, and
    used Facebook's oracle to sign a message with its certificate's key · **Helped:**
    vendor patches, and the case for TLS 1.3's removal of RSA key transport;
    followed in 2023 by Kario's Marvin attack on timing · **Status:**
    patched where found; the safe answer is to disable RSA key exchange.
    The attack itself is in [Cryptanalysis chapter 13](../cryptanalysis/13-Attacks-on-RSA.md)

What to do with this:

- Use encrypt-then-MAC or an AEAD, and never let a decryption API return or
  act on plaintext before the tag is checked.
- Map every cryptographic failure to one exception with one fixed message,
  and translate it to one fixed external response.
- Test your error path: send forgeries that fail at each check and assert that
  the replies, response sizes and logged lines are identical, and that their
  timings are not distinguishable (chapter 5's t-test).
- Disable RSA PKCS#1 v1.5 decryption wherever you can; where you cannot, use
  a library with implicit rejection.

## 9.9 Logs and crash dumps that do not leak

*Level: intermediate.*

The second way an error leaks is through the people and systems that read
about it later. A log line is written for an engineer who is debugging, and
the most useful thing to log is everything: the request, its headers, the
values that went wrong. Those are exactly the things that carry passwords,
session cookies, bearer tokens and keys. A log is then copied: to a central
log service, to a search index, to backups, to a vendor's support portal, to
an engineer's laptop. Each copy is kept longer and guarded less than the
database the secret came from.

The incidents are regular. In May 2018 Twitter told its users to consider
changing their passwords: a bug had written passwords to an internal log
before they were hashed with bcrypt. GitHub disclosed a bug of the same kind,
affecting a small number of users, the same week. In March 2019 Facebook said
that it had found passwords of hundreds of millions of users stored readable
in internal logs, some going back years; in September 2024 the Irish Data
Protection Commission fined Meta €91 million over it. In October 2023 an
attacker inside Okta's support system took HAR files, browser recordings that
customers had uploaded to help debug problems, and used the session tokens in
them to reach the Okta accounts of customers including Cloudflare,
1Password and BeyondTrust. And a Microsoft signing key that, by Microsoft's
2023 account, ended up in a crash dump in 2021 (an account it withdrew in
March 2024, having found no such dump) was the start of the Storm-0558
intrusion that [chapter 12](12-Secrets-in-Operations.md) tells in full.

!!! note "Life story: passwords in logs"
    **Born:** wherever a request is logged before its secrets are removed;
    disclosed at Twitter and GitHub in May 2018 and at Facebook in March
    2019 · **Purpose:** none; a side effect of logging for debugging ·
    **Helped:** forced password resets, regulatory penalties (€91 million for
    Meta in September 2024), and the now-standard rules that logs are
    redacted at the source and that support uploads (HAR files, dumps) are
    scrubbed before they are shared · **Status:** still found in audits
    every year; no library prevents it unless secrets are typed and logs are
    filtered

There are three defenses, and they work best together. The first is at the
source, and §9.6 built it: secrets carried in types that print as
placeholders never reach a log in the first place. The second is a filter at
the logging layer that catches what slipped through, by pattern. The third
is operational: short log retention, restricted access, and tokens short-lived
enough that an old log is worth little (chapter 12).

**Code it: a log redactor.** Python's `logging` module lets a filter rewrite
every record before it is written. The filter below formats the message
first, so that it sees the same text a reader would, and then removes private
key blocks, bearer and basic credentials, anything shaped like a JWT, common
secret field names, and cloud keys with recognizable prefixes. A small
handler collects the lines so that the program can print them:

```python
import logging, re

RULES = [   # (pattern, replacement); the most specific first
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S),
     "[PRIVATE KEY]"),
    (re.compile(r"(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}"), r"\1 [REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*"), "[JWT]"),
    (re.compile(r"(?i)\b(password|passwd|secret|token|api[_-]?key|client_secret)"
                r"(\"?'?\s*[:=]\s*\"?'?)[^\s\"'&,;}]+"), r"\1\2[REDACTED]"),
    (re.compile(r"\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36})\b"), "[CLOUD KEY]"),
]

def redact(text):
    for pattern, replacement in RULES:
        text = pattern.sub(replacement, text)
    return text

class RedactingFilter(logging.Filter):
    def filter(self, record):
        record.msg = redact(record.getMessage())  # format first, then scrub the finished line
        record.args = None
        return True

class ListHandler(logging.Handler):              # collects lines so we can print them here
    def __init__(self):
        super().__init__()
        self.lines = []
    def emit(self, record):
        self.lines.append(self.format(record))

log = logging.getLogger("api")
log.setLevel(logging.INFO)
out = ListHandler()
out.addFilter(RedactingFilter())                 # on the handler, so every logger's lines pass it
log.addHandler(out)

headers = {"Host": "api.example", "Authorization": "Bearer 9f8c1d0e7a6b5c4d3e2f1a0b"}
log.info("request headers %s", headers)
log.info("login user=ann password=correct-horse-battery")
log.info("webhook body {\"client_secret\": \"s3cr3t-v4lu3\", \"amount\": 40}")
log.info("callback ?code=abc&token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbm4ifQ.c2lnbmF0dXJl")
log.info("loaded key -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY----- ok")
log.info("aws AKIAIOSFODNN7EXAMPLE, retries=3")
for line in out.lines:
    print(line)
```

```text
request headers {'Host': 'api.example', 'Authorization': 'Bearer [REDACTED]'}
login user=ann password=[REDACTED]
webhook body {"client_secret": "[REDACTED]", "amount": 40}
callback ?code=abc&token=[REDACTED]
loaded key [PRIVATE KEY] ok
aws [CLOUD KEY], retries=3
```

The filter sits on the handler, so lines from every library are scrubbed.
Its limits are worth stating. A
pattern filter catches the shapes it knows and nothing else: a password in a
field called `pw`, a token in a URL path, or a key printed as a Python
`bytes` literal passes straight through, which is why typed secrets come
first and the filter second. The OAuth `code` in the fourth line survived,
and it is a short-lived secret too; a real rule set grows from the secrets
your own system handles. Chapter 12 builds the same patterns, plus
an entropy test, into a scanner for repositories and CI logs.

**Crash dumps and error reports** are logs that nobody filters. A core dump
holds the whole memory of the process, keys included; a crash reporter that
captures local variables on every stack frame (as several error-tracking
services do by default) sends the arguments of `open_` to a third party.
Chapter 8 (§8.7) shows how to keep keys out of core dumps with `MADV_DONTDUMP`
and `prctl`. For error reports, turn off local-variable capture in modules
that handle secrets, and make sure exception messages never include the
inputs: `CannotOpen("cannot open")` is safe to send anywhere, while
`ValueError("bad tag for %r" % plaintext)` is not. The single-error rule of
§9.8 and the logging rule meet here: the message that tells an attacker
nothing also tells a log reader nothing secret.

**Timing of error returns** is the last channel. A server that logs more for
one kind of failure than another takes longer for it, and a synchronous
remote log widens the gap. Log every failure the same way, and do the slow
work (alerts, diagnostics) off the request path.

What to do with this:

- Carry every secret in a type that prints as a placeholder; then add a
  redacting filter to every log handler as a second line.
- Never log request bodies or authorization headers by default; when you
  need them for debugging, log a keyed hash or a length instead.
- Turn off local-variable capture in crash reporting for code that holds
  keys, keep keys out of core dumps, and scrub HAR files and dumps before
  they leave the building.
- Keep logs for as short a time as your operations allow, and make bearer
  tokens short-lived.

## 9.10 Deprecating an API without breaking users

*Level: intermediate.*

Every interface in this chapter will one day be wrong: an algorithm weakens,
a better design appears, or a function turns out to be easy to misuse. A
cryptographic API is harder to retire than most, for two reasons. Its callers
are often in code nobody maintains any more, and its outputs are stored: a
ciphertext written today must open in ten years. The answer is to deprecate
in stages and to treat writing and reading separately.

Python's `ssl.wrap_socket` shows the slow path. It was a convenience function
with weak defaults: no host name check and no certificate verification unless
the caller asked. It was deprecated in Python 3.7 (2018) in favor of
`SSLContext.wrap_socket`, and removed in Python 3.12 (2023), five years
later, and the removal still broke projects that had ignored the warnings.
PHP took the fast path: the `mcrypt` extension, unmaintained since 2007 and
full of traps, was deprecated in PHP 7.1 (December 2016) and removed in 7.2
(November 2017), the same release that added libsodium to the language's
core, so the replacement arrived with the removal. OpenSSL 3.0 (September
2021) deprecated most of its low-level interfaces, such as `AES_encrypt` and
the `RSA_` functions, in favor of the EVP layer; they still compile, with
warnings, and a build can hide them entirely with `OPENSSL_NO_DEPRECATED`.

The stages that work:

1. **Ship the replacement first**, documented with complete examples, and
   make it the one the documentation leads with.
2. **Warn**, at compile time where the language allows and at run time
   otherwise, naming the replacement in the warning.
3. **Count**: record every call to the old interface in metrics, so you know
   who still uses it and when they stop.
4. **Refuse to write**: the old encryption or signing call stops working, with
   an error that names the replacement.
5. **Keep reading**: decryption and verification of old data stay, counted,
   until the data has been migrated; then the old keys are retired.

The program shows stages 2 to 5 for one function across three releases of a
library:

```python
import warnings

LEGACY_USES = {}                      # what the service's metrics would export

def as_tuple(v):
    return tuple(int(x) for x in v.split("."))

def deprecated(name, since, removed_in, instead, version):
    """Before `since`: silent. Then it warns. From `removed_in`: it refuses. Every call is counted."""
    def wrap(func):
        def inner(*args, **kwargs):
            LEGACY_USES[name] = LEGACY_USES.get(name, 0) + 1
            if as_tuple(version) >= as_tuple(removed_in):
                raise RuntimeError("%s was removed in %s; use %s" % (name, removed_in, instead))
            if as_tuple(version) >= as_tuple(since):
                warnings.warn("%s is deprecated since %s and goes in %s; use %s"
                              % (name, since, removed_in, instead), DeprecationWarning, stacklevel=2)
            return func(*args, **kwargs)
        return inner
    return wrap

def library(version):                 # the same library at three releases
    @deprecated("encrypt_cbc", "2.0", "3.0", "SecretBox.seal", version)
    def encrypt_cbc(key, iv, data):
        return b"old-format ciphertext"
    def decrypt_cbc(key, iv, blob):   # reading old data is never removed, only counted
        LEGACY_USES["decrypt_cbc"] = LEGACY_USES.get("decrypt_cbc", 0) + 1
        return b"old data"
    return encrypt_cbc, decrypt_cbc

for version in ("1.9", "2.4", "3.0"):
    encrypt_cbc, decrypt_cbc = library(version)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            encrypt_cbc(b"k" * 16, bytes(16), b"hello")
            result = "worked"
        except RuntimeError as e:
            result = "refused: " + str(e)
        decrypt_cbc(b"k" * 16, bytes(16), b"...")
    print(version, result)
    for w in caught:
        print("    warning:", w.message)
print("counted:", LEGACY_USES)
```

```text
1.9 worked
2.4 worked
    warning: encrypt_cbc is deprecated since 2.0 and goes in 3.0; use SecretBox.seal
3.0 refused: encrypt_cbc was removed in 3.0; use SecretBox.seal
counted: {'encrypt_cbc': 3, 'decrypt_cbc': 3}
```

Python shows `DeprecationWarning` by default only for code run as the main
program, which is why the demonstration turns warnings on. A warning nobody
sees is not a stage: run test suites with warnings as errors, so a deprecated
call fails a build long before the release that removes it.

Stored data follows the same pattern through its version byte. A reader that
knows versions 1 and 2 opens both, counts version 1, and re-seals each
version 1 record as version 2 when it next writes it; a background job
re-seals the rest. When the count of version 1 opens reaches zero and stays
there, the version 1 code and its keys can go. This is the agility that
chapter 1 said versioning needs, and chapters 17 and 18 turn it into an
inventory and a plan.

What to do with this:

- Never remove a decryption or verification path while data that needs it
  exists; remove the encryption and signing paths first.
- Count every use of a deprecated interface and every open of an old format
  version, and decide removals from the counts.
- Run tests with deprecation warnings as errors.
- Ship the replacement, with examples, before the first warning.

## 9.11 Going deeper

*Level: expert.*

**Misuse resistance as a definition.** Rogaway and Shrimpton's 2006 paper
defined **MRAE**, misuse-resistant authenticated encryption: an attacker who
may repeat nonces learns nothing beyond whether whole (nonce, associated
data, message) triples repeated. SIV meets it; GCM and ChaCha20-Poly1305 do
not. Hoang, Krovetz and Rogaway's "robust authenticated encryption" (AEZ,
2015) asked for the best security possible for any amount of ciphertext
expansion, including none. Such definitions turn API advice ("never reuse a
nonce") into properties a proof can check.

**Errors as part of the scheme.** The classical definition of an AEAD has
one failure symbol, ⊥. Real decryption code has many, and Alexandra
Boldyreva, Jean Paul Degabriele, Kenneth Paterson and Martijn Stam showed
(FSE 2013) that a scheme secure with one failure symbol can be broken when
failures are distinguishable, and gave definitions that model multiple
errors. Their related work on ciphertext fragmentation, where the receiver
reads a length field before it can authenticate it (SSH's encrypted length
was the case study), is the formal version of §9.8's rule to authenticate
before parsing.

**Streams.** A long message cannot wait for one tag at the end without
releasing unverified plaintext. Hoang, Reyhanitabar, Rogaway and Vizár's
STREAM construction (CRYPTO 2015) splits the message into segments, each
an AEAD ciphertext whose nonce includes a counter and a final-segment flag,
so that reordering, dropping or truncating segments is detected. libsodium's
`secretstream` and Tink's `StreamingAead` follow the same pattern.

**Commitment.** Key commitment (§9.5) extends naturally to commitment to the
whole context: the key, the nonce and the associated data, so that one
ciphertext cannot be valid under two different contexts. Bellare and Hoang
(EUROCRYPT 2022) give definitions and efficient schemes.

**Types as proofs.** The `SecretKey` of §9.6 checks at run time. Richer type
systems check at compile time: Rust's ownership can make a nonce value usable
once, and typestate designs make misordered calls fail to compile. Verified
libraries (chapter 17) prove that code matches a specification, and an
interface with no wrong answers is the easiest kind to specify.

## Check yourself

??? question "1. Name three questions a toolkit encryption API asks its caller that have a wrong answer which still passes every round-trip test."
    Any three of: how to choose the nonce or IV (a fixed one works); whether
    to add a MAC (leaving it out works); whether to verify the tag (skipping
    it works); which mode (ECB works); how to compare tags (`==` works); what
    to say on failure (a detailed message works). Each mistake is invisible
    until someone attacks.

??? question "2. What did Acar and colleagues find about Keyczar, a library designed to be easy to use?"
    Participants rated it, with M2Crypto, the least usable of the five
    libraries, and few of them got it to work; the few working solutions were
    usually secure. Its simplicity did not help when it lacked support for a
    task, such as storing keys, or had weak documentation; participants then
    wrote their own code or failed. A safe library must cover the whole task and come with
    complete, safe examples.

??? question "3. Why does the SecretBox of §9.3 have no nonce parameter, and how can it choose nonces at random safely?"
    A nonce parameter can be fixed, reused or reset by the caller. The box
    draws 24 random bytes per message; with 192 bits the chance of any repeat
    among $q$ messages is about $q^2/2^{193}$, below $2^{-65}$ even for
    $2^{64}$ messages.

??? question "4. A service encrypts with AES-GCM and random 96-bit nonces. How many messages can one key protect before the chance of a repeated nonce reaches about $2^{-33}$, and what are two remedies?"
    About $2^{32}$, from $q^2/2^{97} = 2^{-33}$. Rotate keys well before
    that count (as SP 800-38D requires), or switch to XChaCha20-Poly1305
    (192-bit nonces) or AES-GCM-SIV, which survives a repeat.

??? question "5. What does an SIV mode reveal when a nonce is repeated, and what does it cost?"
    Only whether the same message (with the same associated data) was sealed
    twice under that nonce, because equal inputs give equal ciphertexts. The
    cost is two passes: the MAC over the whole plaintext must be computed
    before encryption starts, so it cannot stream.

??? question "6. Why must a key ID in a ciphertext be looked up in a fixed keyring rather than used to fetch a key?"
    The key ID is attacker-controlled. If it can name a file, a URL or a
    database query, the attacker chooses the verification key, as in JWT
    `kid` and `jku` abuses. As an index into keys the reader already trusts,
    it can only select a key or fail.

??? question "7. Why is a version byte safer than an algorithm field such as JWT's `alg`?"
    A version names a fixed set of choices that the reader already knows and
    accepts or refuses as a whole; an attacker can only pick a version the
    reader supports, and the version is under the tag. An algorithm field
    lets the message choose how it is checked, which allowed `alg: none` and
    the RSA-to-HMAC confusion.

??? question "8. A server returns the same message for every decryption failure but checks padding before the MAC. Is it safe? What is the fix?"
    No. A bad padding returns sooner than a good padding with a bad MAC, so
    the time is an oracle, as the program in §9.8 showed by recovering the
    whole block. Random delays only add noise. The fix is to authenticate the
    whole ciphertext first (encrypt-then-MAC or an AEAD), so every forgery
    fails at the same check.

??? question "9. A log filter removes bearer tokens and passwords by pattern. Name two secrets it can miss and the defense that catches them."
    A secret under an unfamiliar field name (`pw`, `auth`), a token in a URL
    path, a key printed as a `bytes` literal, an OAuth code, a secret in a
    crash report's captured local variables. Typed secrets that print as
    placeholders stop them at the source; the filter is the second line.

??? question "10. You must retire version 1 of a ciphertext format used for stored records. In what order do you remove things, and how do you know when you are done?"
    Ship version 2 and make it the default for writing; stop writing version
    1; keep reading version 1, re-sealing records as version 2 when they are
    written and with a background job; count version 1 opens. When the count
    is zero and stays there, remove the version 1 reader and retire its keys.

## What you learned

- Most cryptographic failures happen at interfaces, and an interface that
  asks a question with a wrong-but-working answer will get that answer from
  some caller.
- The usability studies (Nadi and colleagues 2016, Acar and colleagues 2017)
  found developers wanting task-level APIs, more secure code from simpler
  libraries, and code shaped by whatever example they copied.
- NaCl, libsodium, Tink and Go each remove decisions: algorithms, padding,
  nonces, error codes; Tink adds keysets with key IDs and rotation.
- Nonces leave the caller's hands through protocol counters, long random
  nonces (XChaCha20's 192 bits) or misuse-resistant modes (SIV, AES-GCM-SIV).
- Keys should be typed: purpose-checked, ID-carrying, unprintable and
  unserializable; key IDs index a fixed keyring.
- A version byte under the tag replaces algorithm negotiation; JWT's
  `alg: none` shows what a message-chosen algorithm costs.
- One error path means authenticate first, one exception, constant-time
  comparison and identical outward behavior, including timing.
- Logs, support uploads and crash dumps leak secrets unless secrets are typed
  and logs are filtered.
- Deprecate in stages, count every use, stop writing before you stop reading,
  and remove a reader only when no data needs it.

## Further reading

- Sarah Nadi, Stefan Krüger, Mira Mezini and Eric Bodden, "Jumping through
  hoops: why do Java developers struggle with cryptography APIs?", ICSE 2016.
- Yasemin Acar, Michael Backes, Sascha Fahl, Simson Garfinkel, Doowon Kim,
  Michelle Mazurek and Christian Stransky, "Comparing the usability of
  cryptographic APIs", IEEE Symposium on Security and Privacy 2017.
- Yasemin Acar, Michael Backes, Sascha Fahl, Doowon Kim, Michelle Mazurek and
  Christian Stransky, "You get where you're looking for: the impact of
  information sources on code security", IEEE Symposium on Security and
  Privacy 2016.
- Daniel J. Bernstein, Tanja Lange and Peter Schwabe, "The security impact of
  a new cryptographic library", LATINCRYPT 2012; and nacl.cr.yp.to.
- The libsodium documentation (doc.libsodium.org), Frank Denis, 2013 onward.
- Thai Duong for the Tink team, "Introducing Tink cryptographic software
  library", Google Security Blog (30 August 2018); the Tink wire format
  documentation.
- Filippo Valsorda and the Go team, "Cryptography principles" (go.dev, June
  2019); Go 1.24 release notes (February 2025).
- Phillip Rogaway and Thomas Shrimpton, "A provable-security treatment of the
  key-wrap problem", EUROCRYPT 2006; RFC 5297 (2008), AES-SIV; RFC 8452
  (2019), AES-GCM-SIV.
- Scott Arciszewski, "XChaCha: eXtended-nonce ChaCha and
  AEAD_XChaCha20_Poly1305", draft-irtf-cfrg-xchacha-03 (January 2020);
  Daniel J. Bernstein, "Extending the Salsa20 nonce" (2008); RFC 8439 (2018).
- SP 800-38D (2007), GCM and its limits on random nonces.
- Tim McLean, "Critical vulnerabilities in JSON Web Token libraries" (March
  2015); RFC 8725 (2020), JSON Web Token best current practices.
- The Fernet specification (github.com/fernet/spec); PASETO
  (paseto.io, 2018).
- Serge Vaudenay, "Security flaws induced by CBC padding", EUROCRYPT 2002;
  Juliano Rizzo and Thai Duong, "Practical padding oracle attacks", USENIX
  WOOT 2010; Microsoft Security Advisory 2416728 and bulletin MS10-070
  (September 2010).
- Daniel Bleichenbacher, "Chosen ciphertext attacks against protocols based
  on the RSA encryption standard PKCS #1", CRYPTO 1998; Hanno Böck, Juraj
  Somorovsky and Craig Young, "Return Of Bleichenbacher's Oracle Threat
  (ROBOT)", USENIX Security 2018; Hubert Kario, "Everlasting ROBOT: the
  Marvin attack", IACR ePrint 2023/1442.
- Michael Luby and Charles Rackoff, "How to construct pseudorandom
  permutations from pseudorandom functions", *SIAM Journal on Computing* 17
  (1988).
- Twitter's and GitHub's password-logging disclosures (May 2018); Irish Data
  Protection Commission, decision on Meta Platforms Ireland (27 September
  2024); Okta's reports on its support system breach (October and November
  2023).
- Python 3.12 "What's New" (removal of `ssl.wrap_socket`); PHP 7.2 release
  notes (libsodium in core, mcrypt removed); OpenSSL 3.0 migration guide.
- Alexandra Boldyreva, Jean Paul Degabriele, Kenneth G. Paterson and Martijn
  Stam, "On symmetric encryption with distinguishable decryption failures",
  FSE 2013; Viet Tung Hoang, Reza Reyhanitabar, Phillip Rogaway and Damian
  Vizár, "Online authenticated-encryption and its nonce-reuse
  misuse-resistance", CRYPTO 2015; Viet Tung Hoang, Ted Krovetz and Phillip
  Rogaway, "Robust authenticated-encryption: AEZ and the problem that it
  solves", EUROCRYPT 2015; Mihir Bellare and Viet Tung Hoang, "Efficient
  schemes for committing authenticated encryption", EUROCRYPT 2022.
- Reference pages: [AEAD](../../05-modes-aead/AEAD.md),
  [ChaCha and Salsa20](../../04-symmetric-ciphers/ChaCha.md),
  [Key Wrap](../../05-modes-aead/Key-Wrap.md) and
  [HMAC](../../06-mac/HMAC.md).
