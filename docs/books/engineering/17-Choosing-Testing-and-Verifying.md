# 17. Choosing, Testing and Verifying

*Almost nobody should write the cryptography their program runs. They choose a
library, and then they have to trust it. This chapter is about earning that trust
instead of assuming it: how to choose a cryptographic library as a dependency you will
live with for years, how to test that it (or your own code) computes the right answers,
and what the stronger forms of assurance, formal proofs, audits and FIPS validation,
actually promise. It ends with the two jobs that keep a system honest after it ships:
an inventory of every algorithm in it, and a calm way to decide what a new CVE in a
cryptographic dependency means for you. You will write a vector runner for the HMAC and
HKDF test cases in their RFCs, a SHA-256 in pure Python that is tested against
`hashlib` until two planted bugs fall out, a small Wycheproof-style runner that catches
a signature verifier accepting all-zero signatures, and an inventory scanner that
writes its findings in the CycloneDX cryptography format.*

!!! abstract "In this chapter"
    **You will learn:**

    - the questions to ask before adopting a cryptographic library, and how ten
      widely used libraries answer them (as of November 2026);
    - what known-answer tests are, where the vectors come from (RFCs, NIST's CAVP and
      ACVP), and how a test runner can pass while testing nothing;
    - differential testing: comparing an implementation with a trusted one on random,
      edge-length and chunked inputs;
    - what Project Wycheproof is, what its edge cases catch, and how to run its files;
    - how differential fuzzing (Cryptofuzz) found about two hundred bugs in mature
      libraries;
    - which formally verified code runs in production today (HACL\*, EverCrypt, Vale,
      Fiat-Crypto, Jasmin and libjade, s2n-bignum, the SAW proofs of s2n), and what a
      proof does and does not cover;
    - how audits are scoped and how to read an audit report;
    - what FIPS 140-3 validation costs in time and money, and the traps of "FIPS mode";
    - how to build a cryptographic inventory (a CBOM) and how to triage a CVE in a
      cryptographic dependency.

    **You need:** [Chapter 1](01-What-Cryptographic-Engineering-Is.md) (the layers of
    cryptographic engineering and the misuse studies),
    [Chapter 5](05-Constant-Time-Programming.md) (the tools that check constant time,
    which this chapter does not repeat), [Chapter 8](08-Hostile-Input.md) (fuzzing and
    sanitizers), [Chapter 9](09-APIs-That-Resist-Misuse.md) (what makes a library's
    interface safe) and [Chapter 11](11-Hardware-for-Keys.md) §11.6 (FIPS 140-3 and its
    levels). From book 1: SHA-256 in [Chapter 9](../../book/09-Hash-Functions.md),
    HMAC in [Chapter 10](../../book/10-Message-Authentication.md), HKDF in
    [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) and ECDSA in
    [Chapter 15](../../book/15-Elliptic-Curves.md).

    **Levels:** §17.1 and §17.2 are for beginners, §17.3 to §17.6 and §17.8 to §17.11
    are intermediate, §17.7 and §17.12 are expert.

## 17.1 The problem

*Level: beginner.*

In September 2020 Oracle released Java 15. Among its changes was a piece of quiet
housekeeping: the code that verified ECDSA signatures, which had been C++ inside the
SunEC provider, was rewritten in Java. Java code is memory-safe and easier to maintain,
and the rewrite passed the platform's tests. In November 2021 Neil Madden, a security
researcher at ForgeRock, tried something that no test had tried. He handed Java's
verifier a signature whose two numbers, $r$ and $s$, were both zero. It accepted it.
It accepted it for every message and every public key.

The ECDSA standard says, in its first verification step, that $r$ and $s$ must both lie
between 1 and $n - 1$, where $n$ is the order of the curve's group. The old C++ code
checked. The new Java code did not, and the arithmetic that followed went wrong in a
way that made zero look right: the inverse of $s = 0$ came out as zero, the two scalar
multiplications gave the point at infinity, and the infinity's $x$-coordinate was
stored as zero, which equals $r$. Section 17.5 builds exactly this bug and catches it.
Every system that trusted Java 15 to 18 to check an ECDSA signature, whether on a
JSON Web Token, a SAML assertion, a WebAuthn login or a TLS certificate, could be
handed a forgery made of zeros. Oracle fixed it in its April 2022 patch update and
rated it 7.5 out of 10; Madden argued it deserved a 10. He named it **psychic
signatures**, after the blank paper in *Doctor Who* that shows whatever the viewer
expects to see.

!!! note "Life story: psychic signatures (CVE-2022-21449)"
    **Born:** September 2020, in Java 15, when ECDSA verification was rewritten from
    C++ to Java without the range check on $r$ and $s$; reported by Neil Madden in
    November 2021, disclosed on 19 April 2022 · **Purpose:** none; a missing line ·
    **Helped:** show that a large, well-funded library can lose a check in a rewrite,
    and that the test vectors which would have caught it had been public since 2016
    (Project Wycheproof includes "r=0 and s=0" among its ECDSA cases) ·
    **Status:** fixed in the April 2022 Critical Patch Update for Java 17 and 18 (15
    and 16 were already out of support)

The bug is a small one, and that is the point. Nothing about it needed new
mathematics. It needed one test with an input that no honest signer produces. The
people who wrote the rewrite were competent; the library had users in the billions; and
still the question "what happens with $r = 0$?" had not been asked of the new code.

So this chapter is about questions, and about the tools that ask them for you. There
are four kinds:

- **Which library?** You are adding a dependency that will hold your keys for years.
  What matters is less its speed than who maintains it, how it handles its own bugs,
  what has been checked, and whether it runs where you need it (§17.2).
- **Does it compute the right answers?** Known-answer tests compare outputs with
  published values (§17.3); differential testing compares them with another
  implementation on inputs you generate (§17.4); Wycheproof adds the inputs that
  attackers choose (§17.5); and differential fuzzing does all of it at scale (§17.6).
- **What has been proved, reviewed or certified?** Formal verification can rule out
  whole classes of bugs, within a model (§17.7). An audit puts experienced people in
  front of the code for a fixed number of days (§17.8). FIPS 140-3 validation checks
  conformance to a standard, which is a different thing from security (§17.9).
- **What do we run, and what does this CVE mean for us?** An inventory says where every
  algorithm lives, which is the precondition for replacing any of them (§17.10), and a
  triage routine turns a frightening advisory into a decision (§17.11).

Figure 17.1 arranges the testing and assurance methods as a ladder. Each rung costs
more than the one below and catches something the lower rungs miss; none of them
catches everything, which is why serious libraries use all of them.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A ladder of six assurance methods from known-answer tests to FIPS validation, with what each catches and what it misses" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">Method</text>
<text x="230" y="22" font-weight="bold">Catches</text>
<text x="440" y="22" font-weight="bold">Misses</text>
<rect x="20" y="34" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="58">Known-answer tests</text>
<text x="230" y="52" font-size="13">wrong answers on</text>
<text x="230" y="68" font-size="13">ordinary inputs</text>
<text x="440" y="52" font-size="13">missing checks, odd lengths,</text>
<text x="440" y="68" font-size="13">streaming, timing</text>
<rect x="20" y="82" width="190" height="40" fill="currentColor" opacity="0.06"/>
<rect x="20" y="82" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="106">Differential tests</text>
<text x="230" y="100" font-size="13">disagreement on random,</text>
<text x="230" y="116" font-size="13">edge and chunked inputs</text>
<text x="440" y="100" font-size="13">bugs shared with the</text>
<text x="440" y="116" font-size="13">reference; invalid inputs</text>
<rect x="20" y="130" width="190" height="40" fill="currentColor" opacity="0.12"/>
<rect x="20" y="130" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="154">Wycheproof vectors</text>
<text x="230" y="148" font-size="13">accepting what must be</text>
<text x="230" y="164" font-size="13">rejected; known attacks</text>
<text x="440" y="148" font-size="13">attacks nobody wrote</text>
<text x="440" y="164" font-size="13">a vector for yet</text>
<rect x="20" y="178" width="190" height="40" fill="currentColor" opacity="0.18"/>
<rect x="20" y="178" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="202">Differential fuzzing</text>
<text x="230" y="196" font-size="13">crashes and disagreements</text>
<text x="230" y="212" font-size="13">across many libraries</text>
<text x="440" y="196" font-size="13">paths no mutation reaches;</text>
<text x="440" y="212" font-size="13">side channels</text>
<rect x="20" y="226" width="190" height="40" fill="currentColor" opacity="0.24"/>
<rect x="20" y="226" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="250">Formal proof</text>
<text x="230" y="244" font-size="13">every bug of the proved</text>
<text x="230" y="260" font-size="13">kinds, on every input</text>
<text x="440" y="244" font-size="13">a wrong specification; code</text>
<text x="440" y="260" font-size="13">and effects outside the model</text>
<rect x="20" y="274" width="190" height="40" fill="currentColor" opacity="0.30"/>
<rect x="20" y="274" width="190" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="292">Audit and</text>
<text x="30" y="308">FIPS validation</text>
<text x="230" y="292" font-size="13">design and misuse (audit);</text>
<text x="230" y="308" font-size="13">conformance (FIPS)</text>
<text x="440" y="292" font-size="13">whatever was out of scope</text>
<text x="440" y="308" font-size="13">or out of time</text>
<line x1="8" y1="34" x2="8" y2="308" stroke="currentColor" stroke-width="1.4"/>
<polygon points="8,314 3,304 13,304" fill="currentColor"/>
</svg>
<figcaption>Figure 17.1. The assurance ladder. Cost and strength rise from top to bottom; each method catches bugs the ones above it miss, and each has its own blind spot. Psychic signatures would have been caught on the third rung.</figcaption>
</figure>

**What to do.**

1. Treat every cryptographic library as code that can be wrong, including the famous
   ones, and including the next version of one you trust.
2. For every primitive you call, know which of the rungs in Figure 17.1 its authors
   climbed, and which you can climb yourself (the first three cost an afternoon).
3. When you rewrite or port cryptographic code, run the old code's edge-case tests
   against the new code before anything else.

## 17.2 Choosing a library

*Level: beginner.*

[Chapter 9](09-APIs-That-Resist-Misuse.md) compared libraries by their interfaces:
how hard libsodium, Tink and Go's packages make it to misuse them. That matters most,
and it is the first filter. This section asks the questions you ask of any dependency,
sharpened for one that holds your keys. A cryptographic library is unusually hard to
replace once adopted, because its formats end up in your stored data, so the choice
deserves an hour of reading.

**The questions.**

1. **Who maintains it, and how many of them are there?** A library with one maintainer
   is one illness away from being unmaintained. Look at the last year of commits, how
   many people made them, and whether a company or foundation pays for the work. After
   Heartbleed (2014) it emerged that OpenSSL, which secured most of the web, had about
   one full-time developer; the Linux Foundation's Core Infrastructure Initiative was
   founded that year largely in response.
2. **How does it handle security reports?** Look for a security policy, a contact
   address, a published history of advisories and how fast they were fixed. A library
   with no advisories at all is more often unexamined than perfect.
3. **What has been checked?** Does its test suite run Wycheproof (§17.5)? Is it fuzzed
   continuously, for example in OSS-Fuzz or Cryptofuzz (§17.6)? Are any parts formally
   verified (§17.7)? Has it had a public audit, of what version, and what was found
   (§17.8)?
4. **Does it run where you need it?** Operating systems, processor architectures,
   embedded targets, WebAssembly. Assembly fast paths often exist for x86-64 and
   AArch64 only, and the portable fallback on other platforms may be slower, or less
   tested, or not constant time.
5. **Does it need to be FIPS validated?** If you sell to US or Canadian government
   agencies, or to customers who copy their rules (banks, health care, many large
   companies), you need a module with a FIPS 140-3 certificate, used in its approved
   mode (§17.9). Few libraries have one, and the ones that do have it only for specific
   versions.
6. **What is its license?** Most are permissive (ISC, MIT, BSD, Apache 2.0). Apache 2.0
   carries a patent grant and is incompatible with code licensed under GPL version 2
   only; OpenSSL moved to it with 3.0 in 2021, which made it usable from GPL version 3
   code (the old OpenSSL license suited neither version).
7. **How stable is its API?** Some libraries promise compatibility for years; others say
   plainly that they change their interface whenever they like. Know which you are
   choosing.
8. **What is its CVE history like?** Not the count, which grows with popularity and
   scrutiny, but the kinds: memory-safety bugs in parsers, missing checks, timing
   leaks, and whether the same kind keeps returning (§17.11).

!!! note "Life story: the libraries after Heartbleed"
    **Born:** April to June 2014, in answer to Heartbleed: the OpenBSD developers forked
    OpenSSL as LibreSSL in April and deleted large parts of it; Google announced
    BoringSSL, its own fork, in June; the Core Infrastructure Initiative began funding
    OpenSSL developers · **Purpose:** a smaller, audited, better-funded code base for
    the most important cryptographic library on the internet · **Helped:** OpenSSL
    gained paid staff, a security policy and regular audits; BoringSSL became the
    library of Chrome and Android and, through its fork AWS-LC, of much of Amazon;
    LibreSSL ships in OpenBSD and provides macOS's `openssl` command · **Status:** all three alive in 2026, with
    different goals: OpenSSL for everyone, BoringSSL for Google, LibreSSL for OpenBSD

**The libraries, as of November 2026.** Table 17.1 summarizes ten libraries a team is
likely to consider. Versions, certificates and maintenance status change; check each
line against the project's own pages before relying on it.

| Library | Language | License | FIPS 140-3 | Notes |
| --- | --- | --- | --- | --- |
| libsodium | C, bindings for most languages | ISC | none | one main maintainer (Frank Denis) since 2013; audited 2017; few advisories, among them CVE-2025-69277 (an incomplete Ed25519 point check, fixed in 1.0.21) |
| BoringSSL | C, C++ | Apache 2.0 | through Google's BoringCrypto module | Google's fork; the README says it is not intended for general use and gives no API or ABI stability; Fiat-Crypto field arithmetic |
| AWS-LC | C | Apache 2.0 and ISC | certificate #4631 (October 2023), later versions since | Amazon's fork of BoringSSL with a stable API; s2n-bignum and CBMC proofs; used by AWS SDKs and `aws-lc-rs` |
| OpenSSL 3.x and 4.x | C | Apache 2.0 | FIPS provider 3.1.2, certificate #4985 | 3.0 reached end of life on 7 September 2026; 3.5 is the long-term release to April 2030; 4.0 came out in April 2026 |
| LibreSSL | C | ISC and the old OpenSSL license | none | OpenBSD's fork (2014); releases follow OpenBSD's; also behind macOS's `openssl` command |
| Go standard library | Go | BSD 3-clause | Go Cryptographic Module v1.0.0, certificate #5247 (Go 1.24 and later) | written in Go with assembly fast paths; audited by Trail of Bits in 2025 |
| RustCrypto | Rust | MIT or Apache 2.0 | none | a family of separate crates of different maturity; the AEAD crates were reviewed by NCC Group in 2020 |
| ring | Rust, C, assembly | permissive (ISC-style) | none | derived from BoringSSL; its author announced an indefinite pause in February 2025; the rustls team stepped in for security maintenance, and RustSec later noted that things were more or less back to normal |
| Bouncy Castle | Java, C# | MIT | separate FIPS editions | since 2000; broad algorithm coverage; the usual choice on the JVM when the JDK lacks something |
| pyca `cryptography` | Python and Rust over OpenSSL | Apache 2.0 or BSD | none of its own | the standard Python library; its wheels bundle OpenSSL; required Rust to build from version 3.4 (2021) |

*Table 17.1. Ten libraries as a dependency, November 2026. "FIPS 140-3" names the
route to a validated module, not a property of every build.*

Three stories from the table show why the questions matter more than the features.

**Platform support: pyca and Rust.** In February 2021 the Python `cryptography`
package, version 3.4, began to require a Rust compiler to build from source, because
its maintainers were moving parsing code out of C. On the common platforms nothing
changed: users installed prebuilt wheels. On platforms without wheels or without Rust,
such as some Alpine Linux images, IBM mainframes and older embedded distributions,
installs broke overnight, and the issue thread became one of the longest the project
had. Both sides had a case: memory-safe parsers prevent a class of bug that has cost
OpenSSL dearly ([Chapter 8](08-Hostile-Input.md)), and a library that will not build
on your platform protects nothing. If your platform is unusual, test the next major
version of a library before it becomes the only one with security fixes.

**Maintenance: ring.** ring, a Rust library built from BoringSSL's code by Brian
Smith, was for years the default cryptography under rustls and much of the Rust
ecosystem. In February 2025 a RustSec advisory, RUSTSEC-2025-0007, declared it
unmaintained after its author announced an indefinite pause. Projects that ran
dependency auditors saw warnings everywhere at once. The advisory was withdrawn two
days later, after the author gave the rustls team access and they committed to
security-only maintenance (a later note on it says things are more or less back to
how they were before), and many projects moved to `aws-lc-rs` in the meantime. The lesson is not
that ring was a bad choice; it was a good library with one maintainer, which is the
risk the first question asks about.

**API stability: BoringSSL.** BoringSSL's own README says that it is not intended for
general use, that Google changes its interfaces when it needs to, and that third
parties should not depend on it. That is honest and it is not a defect: Google builds
it into its own products and updates every caller at once. For anyone else, the right
reading is "choose AWS-LC, which forked it partly to offer a stable interface", or
pin an exact version and accept the cost of upgrading by hand.

**A short decision rule.** For application code, start from the highest-level library
your language has: libsodium or its bindings, Tink, Go's standard packages, or pyca
`cryptography`'s recipes layer ([Chapter 9](09-APIs-That-Resist-Misuse.md)). Choose a
toolkit library (OpenSSL, AWS-LC, Bouncy Castle) when you need a specific protocol, a
standard format or FIPS validation. Avoid small libraries with one maintainer and no
tests against Wycheproof for anything that verifies signatures or decrypts data from
strangers, however pleasant their API. And never choose a library because it is
fastest in a benchmark; the difference rarely matters, and the fastest code is often
the least checked.

**What to do.**

1. Write down the answers to the eight questions for each cryptographic dependency,
   with the date, and keep them next to the dependency list.
2. Subscribe to each library's security announcements, not only its releases.
3. If you need FIPS 140-3, choose the library by its certificate first and its features
   second.
4. Budget a review when a library changes maintainers, build requirements or major
   version, as you would for a new dependency.

## 17.3 Known-answer tests and where vectors come from

*Level: intermediate.*

The oldest test in cryptography is to run the algorithm on an input someone else has
already run it on, and compare. FIPS 180, the Secure Hash Standard, has printed the
SHA-256 of the three bytes `abc` since 2002; every implementation in the world has been
checked against `ba7816bf...15ad`. Such a pair of input and expected output is a
**known-answer test** (KAT), and a collection of them is a set of **test vectors**.

**Where vectors come from.** In order of how much to trust them:

- **The standard itself.** Many RFCs end with an appendix of test vectors: RFC 4231
  for HMAC with SHA-2, RFC 5869 for HKDF, RFC 7748 for X25519, RFC 8032 for Ed25519,
  RFC 8439 for ChaCha20-Poly1305. NIST's FIPS and SP documents point to example
  values published alongside them. These vectors were usually computed by the
  designers with two independent implementations, and an error in them is itself
  published as an erratum.
- **NIST's validation programs.** The Cryptographic Algorithm Validation Program
  (CAVP) has published large sets of vectors for every approved algorithm since the
  1990s, as `.rsp` files grouped by test type. For SHA-256 there are short messages
  (every length from 0 to 512 bits), long messages, and a **Monte Carlo test**, which
  feeds each output back as the next input thousands of times so that one wrong bit
  anywhere poisons every later checkpoint. Since 2019 the program runs on the
  **Automated Cryptographic Validation Protocol** (ACVP), in which a lab's client
  fetches JSON test cases from NIST's server, computes the answers, and uploads them;
  NIST stopped accepting results from the old CAVS tool on 1 July 2020, and the
  ACVP server's code and sample vectors are public on GitHub.
- **Other implementations.** Vectors generated by a well-tested library are useful for
  regression, but they inherit that library's bugs. Label them as such.
- **Your own.** Vectors you computed with the code under test prove only that the code
  still does what it did. They are worth keeping as regression tests, and worth nothing
  as evidence of correctness.

A CAVP response file looks like this (the first two entries of `SHA256ShortMsg.rsp`,
lengths in bits):

```text
[L = 32]

Len = 0
Msg = 00
MD = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

Len = 8
Msg = d3
MD = 28969cdfa74a12c82f3bad960b0b000aca2ac329deea5c2328ebc6f2ba9802c1
```

Note `Msg = 00` with `Len = 0`: the file writes one zero byte for the empty message,
and a runner that hashes the byte instead of reading the length gets the first vector
wrong. Every vector format has quirks like this, which is why the runner deserves as
much care as the code it tests. For post-quantum algorithms, the ACVP vectors and how
this book's own ML-KEM and ML-DSA code was held to them are in
[Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).

**Code it: a vector runner for RFC 4231 and RFC 5869.** The block below quotes the
vectors exactly as the RFCs print them: the HMAC-SHA-256 lines of RFC 4231's seven
test cases and the three SHA-256 cases of RFC 5869's appendix A. It parses the RFC
text rather than a hand-made copy, so that nothing is lost in retyping, runs HMAC from
the standard library and an HKDF written from the RFC, and reports. RFC 4231 has one
quirk worth knowing: in test case 3 the key line reads `Key` with no `=` sign. Test
case 5 gives only the first 128 bits of the output, because it tests truncation.

```python
import hashlib, hmac, re

# RFC 4231, section 4: the HMAC-SHA-256 lines of test cases 1 to 7, copied as printed.
RFC4231 = """
4.2.  Test Case 1
   Key =          0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b
                  0b0b0b0b                          (20 bytes)
   Data =         4869205468657265                  ("Hi There")
   HMAC-SHA-256 = b0344c61d8db38535ca8afceaf0bf12b
                  881dc200c9833da726e9376c2e32cff7
4.3.  Test Case 2
   Key =          4a656665                          ("Jefe")
   Data =         7768617420646f2079612077616e7420  ("what do ya want ")
                  666f72206e6f7468696e673f          ("for nothing?")
   HMAC-SHA-256 = 5bdcc146bf60754e6a042426089575c7
                  5a003f089d2739839dec58b964ec3843
4.4.  Test Case 3
   Key            aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaa                          (20 bytes)
   Data =         dddddddddddddddddddddddddddddddd
                  dddddddddddddddddddddddddddddddd
                  dddddddddddddddddddddddddddddddd
                  dddd                              (50 bytes)
   HMAC-SHA-256 = 773ea91e36800e46854db8ebd09181a7
                  2959098b3ef8c122d9635514ced565fe
4.5.  Test Case 4
   Key =          0102030405060708090a0b0c0d0e0f10
                  111213141516171819                (25 bytes)
   Data =         cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
                  cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
                  cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
                  cdcd                              (50 bytes)
   HMAC-SHA-256 = 82558a389a443c0ea4cc819899f2083a
                  85f0faa3e578f8077a2e3ff46729665b
4.6.  Test Case 5
   Key =          0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c
                  0c0c0c0c                          (20 bytes)
   Data =         546573742057697468205472756e6361  ("Test With Trunca")
                  74696f6e                          ("tion")
   HMAC-SHA-256 = a3b6167473100ee06e0c796c2955552b
4.7.  Test Case 6
   Key =          aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaa                            (131 bytes)
   Data =         54657374205573696e67204c61726765  ("Test Using Large")
                  72205468616e20426c6f636b2d53697a  ("r Than Block-Siz")
                  65204b6579202d2048617368204b6579  ("e Key - Hash Key")
                  204669727374                      (" First")
   HMAC-SHA-256 = 60e431591ee0b67f0d8a26aacbf5b77f
                  8e0bc6213728c5140546040f0ee37f54
4.8.  Test Case 7
   Key =          aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                  aaaaaa                            (131 bytes)
   Data =         54686973206973206120746573742075  ("This is a test u")
                  73696e672061206c6172676572207468  ("sing a larger th")
                  616e20626c6f636b2d73697a65206b65  ("an block-size ke")
                  7920616e642061206c61726765722074  ("y and a larger t")
                  68616e20626c6f636b2d73697a652064  ("han block-size d")
                  6174612e20546865206b6579206e6565  ("ata. The key nee")
                  647320746f2062652068617368656420  ("ds to be hashed ")
                  6265666f7265206265696e6720757365  ("before being use")
                  642062792074686520484d414320616c  ("d by the HMAC al")
                  676f726974686d2e                  ("gorithm.")
   HMAC-SHA-256 = 9b09ffa71b942fcb27635fbcd5b0e944
                  bfdc63644f0713938a7f51535c3a35e2
"""

# RFC 5869, appendix A: test cases 1 to 3 (HKDF with SHA-256), copied as printed.
RFC5869 = """
A.1.  Test Case 1
   Hash = SHA-256
   IKM  = 0x0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b (22 octets)
   salt = 0x000102030405060708090a0b0c (13 octets)
   info = 0xf0f1f2f3f4f5f6f7f8f9 (10 octets)
   L    = 42
   PRK  = 0x077709362c2e32df0ddc3f0dc47bba63
          90b6c73bb50f9c3122ec844ad7c2b3e5 (32 octets)
   OKM  = 0x3cb25f25faacd57a90434f64d0362f2a
          2d2d0a90cf1a5a4c5db02d56ecc4c5bf
          34007208d5b887185865 (42 octets)
A.2.  Test Case 2
   Hash = SHA-256
   IKM  = 0x000102030405060708090a0b0c0d0e0f
          101112131415161718191a1b1c1d1e1f
          202122232425262728292a2b2c2d2e2f
          303132333435363738393a3b3c3d3e3f
          404142434445464748494a4b4c4d4e4f (80 octets)
   salt = 0x606162636465666768696a6b6c6d6e6f
          707172737475767778797a7b7c7d7e7f
          808182838485868788898a8b8c8d8e8f
          909192939495969798999a9b9c9d9e9f
          a0a1a2a3a4a5a6a7a8a9aaabacadaeaf (80 octets)
   info = 0xb0b1b2b3b4b5b6b7b8b9babbbcbdbebf
          c0c1c2c3c4c5c6c7c8c9cacbcccdcecf
          d0d1d2d3d4d5d6d7d8d9dadbdcdddedf
          e0e1e2e3e4e5e6e7e8e9eaebecedeeef
          f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff (80 octets)
   L    = 82
   PRK  = 0x06a6b88c5853361a06104c9ceb35b45c
          ef760014904671014a193f40c15fc244 (32 octets)
   OKM  = 0xb11e398dc80327a1c8e7f78c596a4934
          4f012eda2d4efad8a050cc4c19afa97c
          59045a99cac7827271cb41c65e590e09
          da3275600c2f09b8367793a9aca3db71
          cc30c58179ec3e87c14c01d5c1f3434f
          1d87 (82 octets)
A.3.  Test Case 3
   Hash = SHA-256
   IKM  = 0x0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b (22 octets)
   salt = (0 octets)
   info = (0 octets)
   L    = 42
   PRK  = 0x19ef24a32c717b167f33a91d6f648bdf
          96596776afdb6377ac434c1c293ccb04 (32 octets)
   OKM  = 0x8da4e775a563c18f715f802a063c5a31
          b8a11f5c5ee1879ec3454e5f3c738d2d
          9d201395faa4b61a96c8 (42 octets)
"""


def parse(text, strict=True):
    """Turn RFC-style vectors into {case number: {field: hex string}}."""
    # A field line is three spaces, a name, then "=". RFC 4231 prints test case 3's
    # key without the "=", so the strict pattern makes it optional.
    field_re = r"   (\S[\w-]*)\s*=?\s+(.*)" if strict else r"   (\S[\w-]*) +=\s+(.*)"
    cases, case, field = {}, None, None
    for line in text.splitlines():
        m = re.match(r"\S+\s+Test Case (\d+)", line)
        if m:
            case, field = cases.setdefault(int(m.group(1)), {}), None
            continue
        m = re.match(field_re, line)
        if m:
            field, value = m.groups()
            case[field] = ""
        elif line.startswith(" " * 10) and field:
            value = line                      # a continuation line
        else:
            field = None
            continue
        value = re.sub(r"\(.*?\)", "", value)     # drop ("Hi There"), (20 bytes)
        case[field] += value.replace("0x", "").strip()
    return cases


def hkdf(ikm, salt, info, length):
    if length > 255 * 32:
        raise ValueError("RFC 5869 allows at most 255 blocks of output")
    prk = hmac.new(salt or bytes(32), ikm, "sha256").digest()   # extract
    okm, block, i = b"", b"", 1
    while len(okm) < length:                                    # expand
        block = hmac.new(prk, block + info + bytes([i]), "sha256").digest()
        okm, i = okm + block, i + 1
    return prk, okm[:length]


def run_hmac(cases):
    results = {}
    for n, c in sorted(cases.items()):
        try:
            mac = hmac.new(bytes.fromhex(c["Key"]), bytes.fromhex(c["Data"]), "sha256").digest()
        except KeyError:
            continue                          # the lazy runner's fatal habit
        want = bytes.fromhex(c["HMAC-SHA-256"])
        if n == 5:
            mac = mac[:16]                    # the RFC truncates case 5 to 128 bits
        results[n] = hmac.compare_digest(mac, want)
    return results


def run_hkdf(cases):
    results = {}
    for n, c in sorted(cases.items()):
        h = {k: bytes.fromhex(c[k]) for k in ("IKM", "salt", "info", "PRK", "OKM")}
        prk, okm = hkdf(h["IKM"], h["salt"], h["info"], int(c["L"]))
        results[n] = (prk == h["PRK"] and okm == h["OKM"])
    return results


def report(name, results, expected=None):
    passed = sum(results.values())
    line = f"{name}: {passed} passed, {len(results) - passed} failed"
    if expected is not None:
        missing = sorted(set(expected) - set(results))
        line += f", not run: {missing}" if missing else ", all cases ran"
    print(line)


lazy = run_hmac(parse(RFC4231, strict=False))
report("HMAC, lazy parser            ", lazy)
report("HMAC, lazy parser, counted   ", lazy, range(1, 8))
report("HMAC, strict parser, counted ", run_hmac(parse(RFC4231)), range(1, 8))
report("HKDF, strict parser, counted ", run_hkdf(parse(RFC5869)), range(1, 4))
```

It prints:

```text
HMAC, lazy parser            : 6 passed, 0 failed
HMAC, lazy parser, counted   : 6 passed, 0 failed, not run: [3]
HMAC, strict parser, counted : 7 passed, 0 failed, all cases ran
HKDF, strict parser, counted : 3 passed, 0 failed, all cases ran
```

**Break it.** The first line is the dangerous one. The lazy parser insists on `=`
after a field name, so it never sees test case 3's key; the runner then meets a case
with no `Key`, and its `except KeyError: continue` skips it. The report says "6
passed, 0 failed", in green, and nobody counts to seven. A runner that skips is worse
than no runner, because it produces confidence. Real test suites do this constantly:
a vector file is updated with a new field, the parser ignores it, and a whole group
of cases quietly stops running.

**Fix it.** Two changes. The strict parser accepts what the RFC actually prints, and,
more important, the report compares the cases that ran with the cases that should
have run, so a skipped case is a failure (lines 2 and 3). Every runner should know
how many vectors it expects and fail when the count is wrong. It should also be seen
to fail at least once: change one hex digit in an expected value and check that the
runner reports it. A test that has never failed has not been shown to test anything.

**What known answers catch, and what they miss.** A KAT catches wrong constants, byte
order mix-ups, a misread specification and padding errors at the lengths it covers.
RFC 4231's cases are chosen for this: keys shorter than the hash output (case 2),
key and data together longer than a block (cases 3 and 4), and keys longer than the
block, which HMAC must hash first (cases 6 and 7). What a KAT cannot catch is
anything about inputs it does not contain. All its inputs are valid, so it says
nothing about whether a verifier rejects what it should; it uses one-shot calls, so it
says nothing about streaming; and it measures outputs, so it says nothing about timing
([Chapter 5](05-Constant-Time-Programming.md)). The next three sections each add one
of those.

**In the real world.** Known-answer tests are compulsory in validated modules: FIPS
140-3 requires a module to run self-tests of its algorithms each time it starts, and
to refuse to work if any fails ([Chapter 11](11-Hardware-for-Keys.md) §11.6). Those
power-on self-tests are KATs, usually one vector per algorithm, and they exist to catch
a corrupted binary or a broken build rather than a design bug.

**What to do.**

1. Run every primitive you implement or wrap against the vectors in its standard, from
   the standard's own text, and against the CAVP or ACVP files where they exist.
2. Make the runner count: expected cases, cases run, cases passed.
3. Break one vector on purpose and watch the runner fail before you trust it.
4. Keep vectors you generated yourself in a separate, clearly labeled file.

## 17.4 Differential testing: SHA-256 against hashlib

*Level: intermediate.*

A second implementation that you trust is a test oracle for every input, not just the
ones in a file. **Differential testing**, named by William McKeeman in a 1998 paper on
testing C compilers, runs both implementations on the same inputs and reports every
disagreement. For cryptography the trusted one is usually a mature library, and the
inputs are chosen in three ways: at random, at the edges of the algorithm's internal
structure, and split up in the ways a streaming interface allows.

**Where SHA-256's edges are.** SHA-256 works on 64-byte blocks. Before the last block
it appends a byte `0x80`, then zero bytes, then the message length in bits as an 8-byte
number, so that the total is a multiple of 64. For a message of $L$ bytes the number of
zero bytes is

$$k = (55 - L) \bmod 64,$$

because $L + 1 + k + 8 \equiv 0 \pmod{64}$. A 55-byte message fills one block exactly
($55 + 1 + 0 + 8 = 64$). A 56-byte message leaves no room for the length, so it needs
a second block, almost all padding ($56 + 1 + 63 + 8 = 128$). Messages of 63, 64 and
65 bytes sit around the block boundary itself. Figure 17.2 shows them. Any
implementation that computes $k$ with an `if` instead of the formula has a branch at
55 or 56 where it can be wrong, and random lengths hit that one length only once in 64
tries.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="How SHA-256 pads messages of 55, 56, 63, 64 and 65 bytes into one or two 64-byte blocks" fill="currentColor" font-size="14">
<text x="20" y="20" font-weight="bold">Message length</text>
<text x="160" y="20" font-weight="bold">Padded blocks (each box = 64 bytes)</text>
<text x="20" y="54">55 bytes</text>
<rect x="160" y="38" width="190" height="26" fill="currentColor" opacity="0.15"/>
<rect x="350" y="38" width="4" height="26" fill="currentColor" opacity="0.6"/>
<rect x="354" y="38" width="28" height="26" fill="currentColor" opacity="0.35"/>
<rect x="160" y="38" width="222" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="400" y="56" font-size="13">1 block: message, 0x80, length</text>
<text x="20" y="96">56 bytes</text>
<rect x="160" y="80" width="194" height="26" fill="currentColor" opacity="0.15"/>
<rect x="354" y="80" width="4" height="26" fill="currentColor" opacity="0.6"/>
<rect x="160" y="80" width="222" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="382" y="80" width="194" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="548" y="80" width="28" height="26" fill="currentColor" opacity="0.35"/>
<text x="420" y="98" font-size="13">63 zeros</text>
<text x="20" y="138">63 bytes</text>
<rect x="160" y="122" width="218" height="26" fill="currentColor" opacity="0.15"/>
<rect x="378" y="122" width="4" height="26" fill="currentColor" opacity="0.6"/>
<rect x="160" y="122" width="222" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="382" y="122" width="194" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="548" y="122" width="28" height="26" fill="currentColor" opacity="0.35"/>
<text x="420" y="140" font-size="13">56 zeros</text>
<text x="20" y="180">64 bytes</text>
<rect x="160" y="164" width="222" height="26" fill="currentColor" opacity="0.15"/>
<rect x="160" y="164" width="222" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="382" y="164" width="194" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="382" y="164" width="4" height="26" fill="currentColor" opacity="0.6"/>
<rect x="548" y="164" width="28" height="26" fill="currentColor" opacity="0.35"/>
<text x="420" y="182" font-size="13">0x80, 55 zeros</text>
<text x="20" y="222">65 bytes</text>
<rect x="160" y="206" width="222" height="26" fill="currentColor" opacity="0.15"/>
<rect x="382" y="206" width="4" height="26" fill="currentColor" opacity="0.15"/>
<rect x="386" y="206" width="4" height="26" fill="currentColor" opacity="0.6"/>
<rect x="160" y="206" width="222" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="382" y="206" width="194" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="548" y="206" width="28" height="26" fill="currentColor" opacity="0.35"/>
<text x="420" y="224" font-size="13">54 zeros</text>
<rect x="160" y="242" width="14" height="12" fill="currentColor" opacity="0.15"/>
<text x="180" y="252" font-size="12">message</text>
<rect x="250" y="242" width="6" height="12" fill="currentColor" opacity="0.6"/>
<text x="262" y="252" font-size="12">0x80</text>
<rect x="310" y="242" width="14" height="12" fill="currentColor" opacity="0.35"/>
<text x="330" y="252" font-size="12">8-byte length in bits</text>
</svg>
<figcaption>Figure 17.2. SHA-256 padding at the edge lengths. Up to 55 bytes the padding fits in the message's last block; from 56 to 63 it spills into a new one; at exact multiples of 64 the padding is a block of its own. Test these lengths explicitly; random lengths reach each of them only once in 64 tries.</figcaption>
</figure>

**Code it: SHA-256 from FIPS 180-4, tested against `hashlib`.** The implementation
below has the streaming interface real libraries have (`update` any number of times,
then `digest`). Instead of copying FIPS 180-4's 72 constants, it computes them: they are
the first 32 bits of the fractional parts of the cube roots of the first 64 primes and
the square roots of the first eight, which removes a whole category of typo. The
harness hashes 160 messages, ten at the edge lengths and 150 of random length, each
once in one call and once fed in random pieces of 1 to 79 bytes, and compares every
digest with `hashlib`. Two subclasses carry bugs of the kind real libraries have
shipped: one in the padding branch, one in the buffer that holds a partial block
between `update` calls.

```python
import hashlib, random, struct


def iroot(x, k):
    """Largest integer r with r**k <= x."""
    lo, hi = 0, 1 << (x.bit_length() // k + 1)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        lo, hi = (mid, hi) if mid ** k <= x else (lo, mid - 1)
    return lo


# FIPS 180-4's constants are the fractional bits of square and cube roots of primes,
# so we compute them rather than copy 72 hex numbers (one typo would be a bug).
PRIMES = [p for p in range(2, 312) if all(p % d for d in range(2, p))][:64]
K = [iroot(p << 96, 3) & 0xFFFFFFFF for p in PRIMES]
H0 = [iroot(p << 64, 2) & 0xFFFFFFFF for p in PRIMES[:8]]
M32 = 0xFFFFFFFF


def rotr(x, r):
    return (x >> r | x << (32 - r)) & M32


def compress(h, block):
    w = list(struct.unpack(">16I", block))
    for t in range(16, 64):
        s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >> 3)
        s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >> 10)
        w.append((w[t - 16] + s0 + w[t - 7] + s1) & M32)
    a, b, c, d, e, f, g, hh = h
    for t in range(64):
        t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]
        t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))
        a, b, c, d, e, f, g, hh = (t1 + t2) & M32, a, b, c, (d + t1) & M32, e, f, g
    return [(x + y) & M32 for x, y in zip(h, (a, b, c, d, e, f, g, hh))]


class SHA256:
    def __init__(self):
        self.h, self.buf, self.n = H0[:], b"", 0

    def update(self, data):
        self.n += len(data)
        data = self.buf + data
        full = len(data) - len(data) % 64
        for i in range(0, full, 64):
            self.h = compress(self.h, data[i:i + 64])
        self.buf = data[full:]
        return self

    def zeros(self):
        return (55 - self.n) % 64           # 0x80, zeros, 8-byte length: a whole block

    def digest(self):
        tail = self.buf + b"\x80" + bytes(self.zeros()) + struct.pack(">Q", 8 * self.n)
        h = self.h
        for i in range(0, len(tail), 64):
            h = compress(h, tail[i:i + 64])
        return struct.pack(">8I", *h)


# Two bugs of the kind real libraries have shipped.
class PaddingBug(SHA256):
    def zeros(self):
        r = self.n % 64
        return 55 - r if r < 55 else 119 - r     # should be r <= 55


class BufferBug(SHA256):
    def update(self, data):
        self.n += len(data)
        if self.buf:                             # top up a partial block first
            need = 64 - len(self.buf)
            self.buf, data = self.buf + data[:need], data[need:]
            if len(self.buf) == 64:
                self.h, self.buf = compress(self.h, self.buf), b""
        full = len(data) - len(data) % 64
        for i in range(0, full, 64):
            self.h = compress(self.h, data[i:i + 64])
        self.buf = data[full:]                   # loses a buffer that was not filled
        return self


def run(h):
    try:
        return h.digest()
    except Exception:                            # a crash counts as a wrong answer
        return None


def differential(cls, seed=17):
    rng = random.Random(seed)
    lengths = [0, 1, 55, 56, 63, 64, 65, 119, 120, 128] + [rng.randrange(600) for _ in range(150)]
    one_shot = chunked = 0
    for n in lengths:
        msg = bytes(rng.getrandbits(8) for _ in range(n))
        want = hashlib.sha256(msg).digest()
        if run(cls().update(msg)) != want:
            one_shot += 1
        h, i = cls(), 0
        while i < n:                             # the same message in random pieces
            step = rng.randrange(1, 80)
            h.update(msg[i:i + step])
            i += step
        if run(h) != want:
            chunked += 1
    print(f"{cls.__name__:10} {len(lengths)} messages: one-shot wrong {one_shot:3}, chunked wrong {chunked:3}")


print(hex(K[0]), hex(H0[0]), SHA256().update(b"abc").digest().hex()[:16])
for cls in (SHA256, PaddingBug, BufferBug):
    differential(cls)
for n in (54, 55, 56):
    ok = PaddingBug().update(bytes(n)).digest() == hashlib.sha256(bytes(n)).digest()
    print(f"PaddingBug on {n} zero bytes:", "right" if ok else "WRONG")
```

It prints:

```text
0x428a2f98 0x6a09e667 ba7816bf8f01cfea
SHA256     160 messages: one-shot wrong   0, chunked wrong   0
PaddingBug 160 messages: one-shot wrong   6, chunked wrong   6
BufferBug  160 messages: one-shot wrong   0, chunked wrong 142
PaddingBug on 54 zero bytes: right
PaddingBug on 55 zero bytes: WRONG
PaddingBug on 56 zero bytes: right
```

The first line checks the computed constants against FIPS 180-4 (`0x428a2f98` and
`0x6a09e667` are its first values) and the `abc` digest against the standard's example.

**Break it.** `PaddingBug` writes the branch with `<` where `<=` belongs. At 55 bytes
it adds a whole block of zeros it did not need, and the length lands in the wrong place.
Every other length is right, so a test suite of "short message, long message, `abc`"
passes, and so does the empty string. The edge-length list catches it at once, at 55
and 119 bytes; the random lengths catch it four more times only because 150 tries
happened to include four lengths of the form $64m + 55$. `BufferBug` is subtler. When a partial block is waiting
and the next `update` is too short to fill it, the last line throws the waiting bytes
away. Hashing a message in one call never has a waiting partial block, so all 160
one-shot tests pass; feeding the same messages in pieces fails 142 times out of 160,
sometimes with a wrong digest and sometimes with a crash in `digest`.

**Fix it.** The `SHA256` class is the fix: the zero count is the formula
$(55 - L) \bmod 64$ with no branch, and `update` prepends the waiting bytes to the new
data before cutting whole blocks, so nothing is ever discarded. More useful than either
fix is the habit the harness encodes: always test edge lengths explicitly, and always
test streaming interfaces with random chunking against one-shot results.

**In the real world.** Streaming bugs of exactly this shape have been found in mature
libraries. Guido Vranken's differential fuzzer (§17.6) found in 2019 that OpenSSL's
ChaCha20-Poly1305 gave different results when the same data was passed in chunks, and
in 2020 a multi-part ChaCha20-Poly1305 bug in NSS (CVE-2020-12403) that could read and
write out of bounds. The most serious was in SHA-3.

!!! note "Life story: the XKCP SHA-3 buffer overflow (CVE-2022-37454)"
    **Born:** in the Keccak team's eXtended Keccak Code Package, the reference SHA-3
    code that Python, PHP and others had copied; found in 2022 by Nicky Mouha, who had
    been testing hash implementations with unusual sequences of `update` calls ·
    **Purpose:** none; an integer overflow in the sponge's absorb function when a
    small update was followed by one of about 4 GiB, which then wrote past the end of
    a buffer · **Helped:** show that reference code is not verified code, and that the
    streaming interface needs tests the one-shot interface never exercises; Mouha and
    Christopher Celi described the method at CT-RSA 2023 · **Status:** fixed in XKCP
    and in the copies (Python's built-in SHA-3 and PHP among them) in October and
    November 2022; rated 9.8 out of 10

**The limits of a reference.** Differential testing finds disagreements, so it is blind
to any bug the two implementations share, and it only tests inputs both accept. Make the
reference as independent as possible: `hashlib` normally calls OpenSSL, and when
OpenSSL is absent CPython falls back to its own SHA-2 code, which since Python 3.12 is
generated from the formally verified HACL\* library (§17.7). Testing an OpenSSL wrapper
against `hashlib` on a machine where both call the same OpenSSL tests nothing. And a
reference that is itself wrong turns your correct code into a failure; when the two
disagree, a third implementation or the standard's vectors decide.

**What to do.**

1. For every algorithm with internal block structure, write down its edge lengths
   (empty, one byte, block minus padding, block, block plus one, two blocks) and test
   them by name.
2. Test streaming interfaces by comparing random chunkings with the one-shot result.
3. Choose a reference that shares no code with the thing you test.
4. Keep the random seed in the test output, so a failure can be replayed.

## 17.5 Project Wycheproof: the inputs attackers choose

*Level: intermediate.*

Known answers and differential tests use valid inputs. Attacks use invalid ones: a
signature with $r = 0$, a public key that is not on the curve, a tag one byte long. In
2016 a group of Google security engineers, Daniel Bleichenbacher, Thai Duong, Emilia
Kasper and Quan Nguyen, with Charles Lee, set out to turn their years of finding such
bugs into tests anyone could run. Bleichenbacher and Duong announced **Project
Wycheproof** on 19 December 2016, named after Mount Wycheproof in Victoria, Australia,
which is billed as the smallest mountain in the world: the point was to make each test
small and easy to climb. The first release had more than 80 test cases for Java
cryptography providers, and running them had already found more than 40 bugs, among
them private-key recovery from DSA and ECDH implementations.

The project's list of historic bugs reads like a syllabus. In OpenJDK: DSA with biased
nonces that leaked the signing key (CVE-2016-0695), DSA and ECDSA verifiers that
accepted modified signatures, a GCM implementation whose counter wrapped around. In
Bouncy Castle: ECDH open to invalid-curve attacks, ECIES that used ECB mode by default,
DSA keys generated weak. In Go's JOSE library: an invalid-curve attack and an HMAC
bypass through integer overflow. In OpenSSL: an X25519 carry bug and malleable Ed25519
signatures, found by Alex Gaynor and Paul Kehrer while running the vectors in pyca
`cryptography`. In 2024 and 2025 the vectors found five CVEs in `elliptic`, a JavaScript
library with millions of weekly downloads, where verifiers accepted malleable ECDSA
and EdDSA signatures and rejected some valid ones.

The tests began as Java code and later became language-neutral JSON files: one per
algorithm and parameter set, with a schema, which any test harness can
read. Maintenance has since moved from Google to C2SP, a community group that also
looks after other cryptographic specifications, and the files live at
`github.com/C2SP/wycheproof`.

!!! note "Life story: Project Wycheproof"
    **Born:** announced 19 December 2016 by Daniel Bleichenbacher and Thai Duong; built
    with Emilia Kasper, Quan Nguyen and Charles Lee at Google · **Purpose:** turn known
    attacks on cryptographic implementations into reusable test vectors, so that a
    library's authors find the bugs before attackers do · **Helped:** more than 40 bugs
    at launch, dozens since (OpenJDK, Bouncy Castle, Conscrypt, Go, OpenSSL, LibreSSL,
    `elliptic`); the vectors run in the test suites of BoringSSL, pyca `cryptography`,
    Tink, Go and many others · **Status:** active, as JSON files maintained by C2SP;
    passing them shows a library is not vulnerable to the attacks they encode, not
    that it is secure

**What is in a file.** Figure 17.3 shows the shape. A file names the algorithm and its
schema and lists **test groups**; each group holds the parameters shared by its tests
(a public key, a hash, a tag size) and a list of tests. Each test has an ID (`tcId`),
a comment saying what was changed, **flags** naming the bug class it targets
(explained in the file's `notes`), the inputs, and a `result`: `valid` (must be
accepted), `invalid` (must be rejected) or `acceptable` (either is fine, for inputs
such as legacy encodings or weak but legal parameters). The ECDSA file for P-256 with
SHA-256 has 262 tests. Some of the edge cases they contain:

- **ECDSA and DSA:** $r$ or $s$ equal to 0, 1, $n$, $n-1$, $n+1$, $p$; $r$ replaced by
  $r + n$ or $n - r$; non-minimal DER encodings and trailing garbage
  ([Chapter 3](03-ASN1-DER-and-Key-Files.md) on why parsers must be strict); hashes
  chosen so that intermediate values hit special cases in point arithmetic.
- **ECDH:** public points not on the curve, on the twist, of small order, or with
  coordinates not reduced modulo $p$ (the invalid-curve attacks of
  [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)).
- **AEAD:** modified and truncated tags, unusual nonce sizes including zero length,
  counters that wrap.
- **MACs:** every single flipped bit of a tag, all-zero and all-one tags.
- **RSA:** PKCS#1 v1.5 signatures with extra data hidden in the padding, the forgery
  class of Bleichenbacher's 2006 attack; OAEP and PSS edge cases.
- **EdDSA:** values of $s$ at or above the group order, which make signatures
  malleable.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Structure of a Wycheproof test vector file: header, notes, test groups with a key, and tests with an ID, flags, inputs and an expected result" fill="currentColor" font-size="14">
<rect x="20" y="14" width="600" height="222" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="34" y="36" font-weight="bold">ecdsa_secp256r1_sha256_p1363_test.json</text>
<text x="34" y="58" font-size="13">algorithm: ECDSA · schema · numberOfTests: 262 · notes: flag → bug type</text>
<rect x="34" y="70" width="572" height="152" fill="currentColor" opacity="0.06"/>
<rect x="34" y="70" width="572" height="152" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="46" y="90" font-weight="bold">testGroups[ ]</text>
<text x="160" y="90" font-size="13">publicKey (curve, wx, wy) · sha: SHA-256 · type</text>
<rect x="46" y="100" width="548" height="110" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="58" y="120" font-weight="bold">tests[ ]</text>
<text x="58" y="142" font-size="13">tcId 1   "signature malleability"       flags [ValidSignature]   result: valid</text>
<text x="58" y="162" font-size="13">tcId 2   "replaced r by r + n"          flags [RangeCheck]       result: invalid</text>
<text x="58" y="182" font-size="13">tcId 11  "r=0 and s=0"                  flags [InvalidSignature] result: invalid</text>
<text x="58" y="202" font-size="13">... each with msg and sig in hex</text>
</svg>
<figcaption>Figure 17.3. A Wycheproof file. Shared parameters live in the test group; each test changes one thing and says, in its comment and flags, what it is trying to catch. A runner needs only the group's key, each test's inputs and the expected result.</figcaption>
</figure>

**Code it: a mini Wycheproof runner.** The block embeds a cut-down copy of the real
file `ecdsa_secp256r1_sha256_p1363_test.json` (one key, nine of its tests, unchanged)
and runs two P-256 verifiers against it. The curve arithmetic is plain affine
arithmetic, enough for testing and far too slow and leaky for production
([Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)). The first verifier,
`verify_buggy`, reproduces the three mistakes behind psychic signatures: no range check
on $r$ and $s$, an inverse computed by Fermat's little theorem ($s^{n-2} \bmod n$),
which quietly returns 0 for $s = 0$ instead of failing, and the point at infinity
stored as $(0, 0)$. The second, `verify`, is the standard's algorithm.

```python
import hashlib, json

# A Wycheproof file, cut down to one key and nine of its 262 tests
# (ecdsa_secp256r1_sha256_p1363_test.json; signatures are r || s).
VECTORS = json.loads("""
{
  "algorithm": "ECDSA",
  "schema": "ecdsa_p1363_verify_schema_v1.json",
  "testGroups": [{
    "type": "EcdsaP1363Verify", "sha": "SHA-256",
    "publicKey": {"curve": "secp256r1",
      "wx": "2927b10512bae3eddcfe467828128bad2903269919f7086069c8c4df6c732838",
      "wy": "00c7787964eaac00e5921fb1498a60f4606766b3d9685001558d1a974e7341513e"},
    "tests": [
      {"tcId": 1, "comment": "signature malleability", "msg": "313233343030", "result": "valid",
       "sig": "2ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e184cd60b855d442f5b3c7b11eb6c4e0ae7525fe710fab9aa7c77a67f79e6fadd76"},
      {"tcId": 2, "comment": "replaced r by r + n", "msg": "313233343030", "result": "invalid",
       "sig": "012ba3a8bd6b94d5ed80a6d9d1190a436ebccc0833490686deac8635bcb9bf536900b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db"},
      {"tcId": 4, "comment": "replaced r by n - r", "msg": "313233343030", "result": "invalid",
       "sig": "d45c5740946b2a147f59262ee6f5bc90bd01ed280528b62b3aed5fc93f06f739b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db"},
      {"tcId": 7, "comment": "replaced s by s + n", "msg": "313233343030", "result": "invalid",
       "sig": "01b329f478a2bbd0a6c384ee1493b1f518276e0e4a5375928d6fcd160c11cb6d2c00b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db"},
      {"tcId": 11, "comment": "Signature with special case values r=0 and s=0", "msg": "313233343030", "result": "invalid",
       "sig": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"},
      {"tcId": 13, "comment": "Signature with special case values r=0 and s=n", "msg": "313233343030", "result": "invalid",
       "sig": "0000000000000000000000000000000000000000000000000000000000000000ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"},
      {"tcId": 18, "comment": "Signature with special case values r=1 and s=0", "msg": "313233343030", "result": "invalid",
       "sig": "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"},
      {"tcId": 25, "comment": "Signature with special case values r=n and s=0", "msg": "313233343030", "result": "invalid",
       "sig": "ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc6325510000000000000000000000000000000000000000000000000000000000000000"},
      {"tcId": 60, "comment": "Edge case for Shamir multiplication", "msg": "3639383139", "result": "valid",
       "sig": "64a1aab5000d0e804f3e2fc02bdee9be8ff312334e2ba16d11547c97711c898e6af015971cc30be6d1a206d4e013e0997772a2f91d73286ffd683b9bb2cf4f1b"}
    ]}]
}
""")

# NIST P-256 (secp256r1). None is the point at infinity.
P = 2**256 - 2**224 + 2**192 + 2**96 - 1
B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
G = (0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
     0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5)


def on_curve(Q):
    x, y = Q
    return 0 <= x < P and 0 <= y < P and (y * y - x ** 3 + 3 * x - B) % P == 0


def add(Q, R):
    if Q is None or R is None:
        return Q or R
    if Q[0] == R[0] and (Q[1] + R[1]) % P == 0:
        return None
    if Q == R:
        lam = (3 * Q[0] * Q[0] - 3) * pow(2 * Q[1], -1, P)
    else:
        lam = (R[1] - Q[1]) * pow(R[0] - Q[0], -1, P)
    x = (lam * lam - Q[0] - R[0]) % P
    return x, (lam * (Q[0] - x) - Q[1]) % P


def mul(k, Q):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, Q)
    return R


def verify_buggy(pub, msg, sig):
    half = len(sig) // 2
    r, s = int.from_bytes(sig[:half], "big"), int.from_bytes(sig[half:], "big")
    e = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    w = pow(s, N - 2, N)                    # Fermat's inverse: silently 0 when s = 0
    R = add(mul(e * w % N, G), mul(r * w % N, pub)) or (0, 0)   # infinity stored as (0, 0)
    return (R[0] - r) % N == 0


def verify(pub, msg, sig):
    if len(sig) != 64 or not on_curve(pub):
        return False
    r, s = int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")
    if not (0 < r < N and 0 < s < N):       # the check every standard puts first
        return False
    e = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    w = pow(s, -1, N)
    R = add(mul(e * w % N, G), mul(r * w % N, pub))
    return R is not None and R[0] % N == r


def run(verify_fn, vectors):
    wrong = 0
    for group in vectors["testGroups"]:
        key = group["publicKey"]
        pub = (int(key["wx"], 16), int(key["wy"], 16))
        for t in group["tests"]:
            got = verify_fn(pub, bytes.fromhex(t["msg"]), bytes.fromhex(t["sig"]))
            if t["result"] == "acceptable" or got == (t["result"] == "valid"):
                continue
            wrong += 1
            print(f"  tcId {t['tcId']:>2} ({t['comment']}): expected {t['result']}, got",
                  "accepted" if got else "rejected")
    print(f"  {wrong} wrong")


for fn in (verify_buggy, verify):
    print(fn.__name__)
    run(fn, VECTORS)
```

It prints:

```text
verify_buggy
  tcId  2 (replaced r by r + n): expected invalid, got accepted
  tcId 11 (Signature with special case values r=0 and s=0): expected invalid, got accepted
  tcId 13 (Signature with special case values r=0 and s=n): expected invalid, got accepted
  tcId 25 (Signature with special case values r=n and s=0): expected invalid, got accepted
  4 wrong
verify
  0 wrong
```

**Break it.** Follow test 11 through `verify_buggy`. With $s = 0$, Fermat's inverse
gives $w = 0^{n-2} = 0$, so both scalars $u_1 = ew$ and $u_2 = rw$ are 0, and
$u_1 G + u_2 Q$ is the point at infinity. Stored as $(0, 0)$, its $x$-coordinate is 0,
which equals $r$. The signature verifies for any message and any key: a forgery that
needs no key, no computation and no luck. Tests 13 and 25 are the same bug in
disguise, since $n \equiv 0 \pmod n$. Test 2 shows the missing range check from the
other side: $r + n$ is not a valid signature value, but the comparison
$(x - r) \bmod n = 0$ cannot tell it from $r$, which makes every valid signature
malleable. Both valid tests pass, so a known-answer suite of honest signatures would
never notice anything.

**Fix it.** `verify` does what the standard says, in its order: reject a signature of
the wrong length, reject a public key that is not on the curve, reject $r$ or $s$
outside $[1, n-1]$, compute a real inverse (`pow(s, -1, N)` raises an error for 0
rather than inventing an answer), and treat the point at infinity as failure, not as a
point with coordinates. All nine tests pass. The general lesson is about arithmetic that
cannot fail: an inverse of 0, a division by 0, a point at infinity are signals that the
input was wrong, and code that turns them into ordinary numbers turns an error into an
acceptance.

**Running the real thing.** A production runner reads every file for the algorithms you
support, skips groups with parameters you do not support (and counts them), checks
`numberOfTests` against what ran, and reports failures by `tcId` and flag so they can
be looked up. Treat `acceptable` with care: it means "the standard allows either", not
"anything goes", and a library should make a deliberate choice for each such flag and
test that it sticks to it.

**What to do.**

1. If your library verifies signatures, does key agreement or decrypts, run the
   Wycheproof files for every algorithm it supports, in continuous integration.
2. When you add a new algorithm or port code, look for its Wycheproof file first.
3. Never write arithmetic that maps an impossible case (inverse of 0, infinity) to a
   number; make it an error, and test the error.

## 17.6 Differential fuzzing: Cryptofuzz

*Level: intermediate.*

[Chapter 8](08-Hostile-Input.md) introduced coverage-guided fuzzing and sanitizers: a
fuzzer mutates inputs to reach new code, and sanitizers turn silent memory errors
into crashes. Combine that with differential testing and you get a tool that needs no
expected answers at all. **Differential fuzzing** runs the same operation, on the same
fuzzer-generated input, through several implementations, and reports a bug whenever
they disagree or any of them crashes.

Guido Vranken, a Dutch security researcher, built the best-known example, **Cryptofuzz**,
in 2019. It is one libFuzzer harness with a module for each library it supports:
OpenSSL, BoringSSL, LibreSSL, NSS, Botan, Crypto++, libgcrypt, mbed TLS, wolfCrypt,
Go's packages, several Rust and JavaScript libraries, big-number libraries, and more
than thirty in all. The fuzzer's input bytes are decoded into an operation and its
parameters: a digest, an HMAC, a cipher operation, a key derivation, an elliptic-curve
or big-number operation; the key, the data, and how the data is split into chunks for
streaming calls. Each module runs the operation, the harness compares the outputs, and
any difference aborts the run with a report (Figure 17.4). The SHA-256 harness of §17.4
is a twenty-line version of the same idea with one library and one operation.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Cryptofuzz: fuzzer bytes are decoded into one operation, which runs in several library modules whose results are compared" fill="currentColor" font-size="14">
<rect x="20" y="80" width="120" height="50" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="102" text-anchor="middle">fuzzer</text>
<text x="80" y="120" text-anchor="middle" font-size="12">random bytes</text>
<line x1="140" y1="105" x2="176" y2="105" stroke="currentColor" stroke-width="1.4"/>
<polygon points="182,105 172,100 172,110" fill="currentColor"/>
<rect x="184" y="70" width="140" height="70" fill="currentColor" opacity="0.08"/>
<rect x="184" y="70" width="140" height="70" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="254" y="94" text-anchor="middle">decode into</text>
<text x="254" y="112" text-anchor="middle" font-size="12">HMAC-SHA256, key K,</text>
<text x="254" y="128" text-anchor="middle" font-size="12">data D in 3 chunks</text>
<line x1="324" y1="105" x2="360" y2="40" stroke="currentColor" stroke-width="1.2"/>
<line x1="324" y1="105" x2="360" y2="105" stroke="currentColor" stroke-width="1.2"/>
<line x1="324" y1="105" x2="360" y2="170" stroke="currentColor" stroke-width="1.2"/>
<rect x="362" y="22" width="110" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="417" y="45" text-anchor="middle">OpenSSL</text>
<rect x="362" y="87" width="110" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="417" y="110" text-anchor="middle">Botan</text>
<rect x="362" y="152" width="110" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="417" y="175" text-anchor="middle">Go, NSS, ...</text>
<line x1="472" y1="40" x2="510" y2="105" stroke="currentColor" stroke-width="1.2"/>
<line x1="472" y1="105" x2="510" y2="105" stroke="currentColor" stroke-width="1.2"/>
<line x1="472" y1="170" x2="510" y2="105" stroke="currentColor" stroke-width="1.2"/>
<rect x="512" y="76" width="110" height="58" fill="currentColor" opacity="0.15"/>
<rect x="512" y="76" width="110" height="58" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="567" y="100" text-anchor="middle">compare</text>
<text x="567" y="118" text-anchor="middle" font-size="12">differ or crash = bug</text>
<text x="320" y="212" text-anchor="middle" font-size="12">every module is built with sanitizers, so memory errors abort the run too</text>
</svg>
<figcaption>Figure 17.4. Differential fuzzing as Cryptofuzz does it. No test vectors are needed: the libraries check each other, and the fuzzer's coverage feedback steers it toward inputs that reach new code in any of them.</figcaption>
</figure>

Cryptofuzz ran continuously in Google's OSS-Fuzz, and the list of bugs in its README
has nearly two hundred entries across more than forty libraries: about twenty in OpenSSL,
eighteen in the relic toolkit, sixteen in Botan, fourteen in LibreSSL, eleven in NSS,
and others in libgcrypt, mbed TLS, wolfCrypt, Crypto++, Go and Zig. They include memory
errors (a stack buffer overflow in NSS's HKDF with SHA-1, CVE-2019-11759), wrong
answers (MD4, MD5 and RIPEMD-160 in libgcrypt; Streebog in Botan and LibreSSL), the
chunking bugs of §17.4, and arithmetic bugs that matter for security: Go's
`elliptic.IsOnCurve` returned true for some invalid field elements (CVE-2022-23806),
and specific unreduced P-256 scalars gave wrong results (CVE-2023-24532). One entry is
for EverCrypt, a formally verified library (§17.7): it crashed with an illegal
instruction on processors without AVX, a property of the code around the proved
functions rather than of the functions themselves.

!!! note "Life story: Cryptofuzz"
    **Born:** 2019, Guido Vranken; integrated into OSS-Fuzz the same year ·
    **Purpose:** find bugs in cryptographic libraries without test vectors, by making
    the libraries check each other on fuzzer-chosen operations, inputs and chunkings ·
    **Helped:** nearly two hundred bugs listed across more than forty libraries, several
    with CVEs; pushed bignum and elliptic-curve code toward edge-case correctness ·
    **Status:** Vranken withdrew from open-source work in late 2024; the code continues
    as a community-maintained fork, and the OSS-Fuzz runs continue for libraries that
    keep their modules up to date

**Limits.** All the libraries can share a bug, especially when they share ancestry (as
OpenSSL, LibreSSL, BoringSSL and AWS-LC do). Disagreement finds wrong answers only where
the libraries overlap, so an operation only one library supports is fuzzed for crashes
alone. And like any fuzzer it reaches what its mutations reach: a bug that needs a
4 GiB input, like the XKCP overflow, is out of range.

**What to do.**

1. If you maintain a cryptographic library, add it to OSS-Fuzz and, where it fits, as
   a Cryptofuzz module; if you depend on one, check that it is there.
2. For your own primitives, write a small differential harness against an independent
   library, with sanitizers on, and leave it running.

## 17.7 Formal verification in production

*Level: expert.*

Testing samples the inputs; a proof covers all of them. **Formal verification** of
cryptographic code means a machine-checked proof that the code meets a specification,
usually for three properties at once: **functional correctness** (it computes the
specified function on every input), **memory safety** (no out-of-bounds access, no use
after free), and **secret independence** (no branch or memory address depends on a
secret, the constant-time property of [Chapter 5](05-Constant-Time-Programming.md),
proved rather than measured). Twenty years ago this was a research topic. Today a
large share of the world's TLS key exchanges run verified field arithmetic, and the
reader's browser almost certainly contains some.

**HACL\*, Vale and EverCrypt.** Project Everest, a collaboration of Microsoft Research,
Inria and Carnegie Mellon, set out around 2016 to build a verified HTTPS stack. Its
most widely used product is **HACL\***, a library of primitives (Curve25519, Ed25519,
ChaCha20, Poly1305, the SHA-2 and SHA-3 families, HMAC, HKDF, P-256 and more)
written in Low\*, a subset of the F\* language, proved correct,
memory-safe and secret-independent, and compiled to readable C. Jean Karim
Zinzindohoué, Karthikeyan Bhargavan, Jonathan Protzenko and Benjamin Beurdouche
described it at CCS 2017. **Vale** (USENIX Security 2017) does the same for
hand-written assembly, such as AES-GCM with the processor's AES instructions.
**EverCrypt** (IEEE S&P 2020) combines the two into one provider that picks the fastest
verified implementation for the processor it finds itself on.

!!! note "Life story: HACL\*"
    **Born:** 2016 to 2017, Inria and Microsoft Research in Project Everest; paper at
    CCS 2017 · **Purpose:** a library of modern primitives proved correct, memory-safe
    and secret-independent in F\*, shipped as ordinary C that other projects can drop
    in · **Helped:** Firefox 57 (November 2017) took its Curve25519 into NSS 3.33,
    about 20% faster than the code it replaced, and later its ChaCha20 and Poly1305;
    the Linux kernel's 64-bit Curve25519, used by WireGuard; CPython's built-in SHA-2
    from Python 3.12 · **Status:** actively developed; its C is vendored, with its
    proofs, into a growing list of projects

**Fiat-Crypto.** The arithmetic modulo a prime is where elliptic-curve libraries have
historically been wrong ([Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)): a missed
carry in one limb that shows up once in billions of inputs. Andres Erbsen, Jade
Philipoom, Jason Gross, Robert Sloan and Adam Chlipala at MIT built **Fiat
Cryptography**, which takes a prime and a target word size and generates field
arithmetic in C (and now assembly) together with a proof in the Coq proof assistant
that it is correct. BoringSSL began using its Curve25519 and P-256 code in early 2018,
which put it into Chrome and Android; the authors' 2019 paper (IEEE S&P) estimated
that their code was then involved in about half of all HTTPS connections from browsers.
Firefox uses it for 32-bit Curve25519, and Go's standard library generates its NIST
curve field arithmetic with it.

!!! note "Life story: Fiat Cryptography"
    **Born:** about 2015 at MIT (Adam Chlipala's group); deployed in BoringSSL in early
    2018; paper at IEEE S&P 2019 · **Purpose:** generate fast field arithmetic for any
    prime, with a Coq proof that it computes the right answer, so that nobody writes
    carry chains by hand again · **Helped:** Curve25519 and P-256 in BoringSSL, hence
    Chrome and Android; 32-bit Curve25519 in Firefox and the Linux kernel; NIST curves
    in Go · **Status:** maintained; newer versions emit verified assembly as well as C

**Jasmin and libjade.** Jasmin (José Bacelar Almeida, Manuel Barbosa, Gilles Barthe
and colleagues, CCS 2017) is a language just above assembly whose compiler is proved
in Coq to preserve the program's meaning, and which comes with a checker for
constant-time code. The Formosa Crypto project's **libjade** collects primitives
written and proved in it, including X25519, ChaCha20-Poly1305 and ML-KEM.

**Amazon's proofs.** When AWS released its TLS library s2n in 2015, it worked with
Galois to prove parts of it with SAW, the Software Analysis Workbench: the HMAC and
DRBG code were proved equivalent to specifications written in Cryptol, and the proofs
were wired into continuous integration so that a change that broke them failed the
build (Andrey Chudnov and colleagues, "Continuous formal verification of Amazon s2n",
CAV 2018). Later, John Harrison, the author of the HOL Light prover, led
**s2n-bignum**: big-number and elliptic-curve routines in x86-64 and AArch64 assembly,
each proved correct in HOL Light against a model of the processor's instructions, with
no trust in a compiler. AWS-LC uses them, and every change to AWS-LC must pass the
proofs before it merges. The post-quantum descendants of this work, libcrux and
mlkem-native, are described in
[Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).

**What a proof covers.** Figure 17.5 draws the line. A proof says that the code,
compiled by the toolchain the proof assumes, running on the machine the proof models,
computes the function the specification describes. Everything outside that sentence is
trusted, not proved:

- **The specification.** It is written by people from the prose of a standard. If it
  says the wrong thing, the code is proved to do the wrong thing. Specifications are
  shorter and closer to the standard than the code, which makes their errors rarer and
  easier to spot, not impossible; running the standard's test vectors against the
  specification itself is the usual cross-check.
- **The unproved code around the proved code.** Processor feature detection, fallbacks,
  build glue, bindings to other languages. Cryptofuzz's EverCrypt crash (§17.6) was in
  the dispatch on processor features. In December 2025 a RustSec advisory
  (RUSTSEC-2025-0133) reported that an unverified fallback in `libcrux-intrinsics`,
  used on AArch64 platforms lacking one instruction, passed wrong arguments, corrupting
  SHA-3 outputs and so producing wrong ML-KEM shared secrets and invalid ML-DSA
  signatures. The verified code was correct; the code that called it on that platform
  was not.
- **The machine model.** A constant-time proof assumes that the instructions it allows
  take the same time for all operands. KyberSlash's variable-time division and Arm's
  data-dependent timing on some instructions ([Chapter 5](05-Constant-Time-Programming.md))
  are exactly the cases where that assumption has to be checked against the processor's
  documentation. Power, electromagnetic and fault attacks, and speculative execution,
  are outside every model in production use.
- **The use.** A proof of AES-GCM says nothing about whether the caller reuses a nonce.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="What a proof of cryptographic code covers: the proved code against its specification, surrounded by trusted parts that are not proved" fill="currentColor" font-size="14">
<rect x="20" y="20" width="600" height="210" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<text x="34" y="42" font-weight="bold">Trusted, not proved</text>
<rect x="190" y="70" width="260" height="90" fill="currentColor" opacity="0.15"/>
<rect x="190" y="70" width="260" height="90" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="320" y="96" text-anchor="middle" font-weight="bold">Proved code</text>
<text x="320" y="118" text-anchor="middle" font-size="13">correct · memory-safe</text>
<text x="320" y="136" text-anchor="middle" font-size="13">secret-independent</text>
<text x="320" y="152" text-anchor="middle" font-size="12">(for every input)</text>
<text x="40" y="76" font-size="13">specification</text>
<text x="40" y="94" font-size="12" opacity="0.8">(from the standard)</text>
<text x="40" y="132" font-size="13">proof checker and</text>
<text x="40" y="150" font-size="13">compiler (unless asm)</text>
<text x="470" y="76" font-size="13">CPU dispatch, fallbacks,</text>
<text x="470" y="94" font-size="13">bindings, build</text>
<text x="470" y="132" font-size="13">timing model of</text>
<text x="470" y="150" font-size="13">the processor</text>
<text x="40" y="200" font-size="13">outside every model: power, EM, faults, speculation</text>
<text x="470" y="200" font-size="13">the caller's use</text>
<line x1="128" y1="72" x2="188" y2="96" stroke="currentColor" stroke-width="1"/>
<line x1="466" y1="84" x2="452" y2="96" stroke="currentColor" stroke-width="1"/>
</svg>
<figcaption>Figure 17.5. The edges of a proof. The shaded box is what verification establishes; everything in the dashed frame is assumed. Real failures of verified libraries have come from the frame: unproved fallbacks, feature detection, and timing assumptions about the hardware.</figcaption>
</figure>

None of this makes verification less valuable. It moves the remaining risk from
millions of lines of arithmetic, where humans are bad at finding bugs, to a few
specifications and some glue code, where they are good at it. It also changes what to
test: run Wycheproof and differential fuzzing against verified libraries too, aimed at
the frame rather than the arithmetic.

**What to do.**

1. Prefer libraries whose field arithmetic and core primitives come from verified
   sources (HACL\*, Fiat-Crypto, s2n-bignum, libjade, libcrux, mlkem-native) when they
   offer what you need.
2. Ask what exactly was proved, for which platforms, and what runs on platforms the
   proofs do not cover.
3. Keep testing verified code at its edges: other platforms, fallbacks, bindings.

## 17.8 Audits and how to read one

*Level: intermediate.*

An **audit** puts experienced reviewers in front of a code base for a fixed time and
asks them to find what is wrong. For cryptographic code the best auditors combine
three skills: reading C or Rust for memory errors, knowing the attacks of the
[Cryptanalysis](../cryptanalysis/index.md) book, and checking the use of each
primitive against its specification. An audit is the only rung of Figure 17.1 that can
find design mistakes, misuse in the code that calls the primitives, and bugs no tool
was looking for. It is also a snapshot: one version, one scope, a fixed number of days.

**How audits are scoped.** Before work starts, client and auditor agree on the commit
or release, the components (often "the core library, not the bindings"), the threat
model, the effort (people and days), and whether there will be a retest after fixes.
Funding shapes all of it, and much of the public audit record comes from users who paid
for a review of a library they depended on.

**How to read a report.** Read it in this order.

1. **Date, version and commit.** Everything after that commit is unaudited.
2. **Scope, and what was out of scope.** The out-of-scope list is the most important
   paragraph in the report. "TLS and X.509 were not reviewed" means exactly that.
3. **Effort.** Person-days tell you how deep the review could go. A week of one
   reviewer on a large library is a skim.
4. **The severity scale.** Firms rate findings by impact and by how hard they are to
   exploit, each on its own scale; read the definitions before the findings. A "low"
   finding can be a real vulnerability that is hard to reach.
5. **Findings and their status.** Were they fixed, and did the auditor check the fixes?
6. **Informational notes.** Often the most useful part: hardening advice and areas the
   reviewers thought fragile but could not break in the time.

"No significant findings" means the reviewers found nothing serious in the scope, in
the time. It is good news and not a certificate.

**Four public audits, read this way.**

- **TrueCrypt, 2014 to 2015.** After TrueCrypt's anonymous developers abandoned it, the
  crowd-funded Open Crypto Audit Project paid for a two-phase audit: iSEC Partners
  reviewed the bootloader and Windows driver in 2014, and NCC Group's cryptography
  services reviewed the cryptography of version 7.1a, published in April 2015. Phase two
  reported four issues: a Windows random-number call (`CryptAcquireContext`) whose
  failure could go unnoticed, rated high; keyfile mixing that was not cryptographically
  sound, rated low; volume headers decrypted with weak integrity checks; and an AES
  implementation open to cache-timing attacks. It found no evidence of a deliberate
  backdoor. Scope: the cryptography, not the whole program, of a version that would
  never be updated.
- **libsodium, 2017.** Private Internet Access paid Matthew Green of Cryptography
  Engineering to review versions 1.0.12 and 1.0.13. The report found no critical flaws,
  with lower-severity findings such as a Windows randomness source that relied on an
  unofficial API. Scope: the core library, at two versions; libsodium has changed a
  great deal since.
- **RustCrypto's AEADs, 2020.** MobileCoin paid NCC Group to review the AES-GCM and
  ChaCha20-Poly1305 crates. Two consultants spent five person-days in total; none of
  their observations was a vulnerability. Five person-days on two well-scoped crates is
  a reasonable review of those crates, and says nothing about the dozens of other crates
  in the project.
- **Go's cryptography, 2025.** Google paid Trail of Bits to review the core packages
  that form Go's FIPS 140-3 module. The report had one low-severity finding, in the
  legacy Go+BoringCrypto integration, and five informational ones, which were fixed for
  Go 1.25. TLS and X.509 were out of scope.

!!! note "Life story: the TrueCrypt audit"
    **Born:** 2013, the Open Crypto Audit Project, founded by Matthew Green and Kenneth
    White and funded by public donations after the Snowden disclosures raised doubts
    about widely used encryption tools · **Purpose:** an independent review of
    TrueCrypt, whose developers were anonymous · **Helped:** phase one (iSEC Partners,
    2014) and phase two (NCC Group, April 2015) found real but limited flaws and no
    backdoor; the report shaped VeraCrypt, the fork most users moved to · **Status:**
    finished; the template for crowd-funded audits of open-source security tools

**What to do.**

1. Before relying on an audit, find the commit it covered and diff it against what you
   run.
2. Read the out-of-scope list first and the findings second.
3. If you pay for an audit, scope it to what an attacker would attack in your system,
   including your use of the library, and pay for the retest.

## 17.9 FIPS 140-3 validation in practice

*Level: intermediate.*

[Chapter 11](11-Hardware-for-Keys.md) §11.6 explains FIPS 140-3: the four levels, the
module boundary, the security policy, and how to read a certificate. This section is
the other side: what it takes to get a library validated, and what goes wrong when a
team switches "FIPS mode" on.

**Two programs, in order.** First every approved algorithm in the module is tested by
the **CAVP**, through ACVP (§17.3): an accredited lab runs NIST's generated vectors
through the module's own code on each tested platform and receives an algorithm
certificate (Go's, for example, is A6650). Only then does the lab test the module
itself against FIPS 140-3, write its report and submit it to the **CMVP**, where NIST
and Canada's cyber security agency review it and, after questions and
answers, issue a module certificate.

**Time and money.** The lab work is the short part: a few months for a software
module. The queue is the long part. Through 2023 to 2025, more than a year between
submission and certificate was common, and lab and industry estimates for a whole
project, from first preparation to certificate, ranged from about a year to two and a
half years; the CMVP has been working to shorten the queue, and how far it has
succeeded is worth checking on the day you plan. Money is mostly the lab's fees and
your engineers' time: NIST's own cost-recovery fees are a few thousand dollars, and
industry analysts put whole projects at roughly \$100,000 to \$200,000 or more. Both
ranges are reported estimates, not published prices, which is why "rebranding"
services exist: a vendor validates a module once and licenses it, certificate and
all, to others.

**Freezing the module.** Because a certificate covers exact versions, validated
libraries split the module from everything else and change it rarely. OpenSSL 3 puts
its approved algorithms in a separately built FIPS provider: the provider validated as
3.1.2 (certificate #4985) works with OpenSSL 3.0 to 3.5, so the rest of the library can
take bug fixes without touching the certificate. Go builds a frozen module into the
standard library: building with `GOFIPS140=v1.0.0` selects the validated snapshot
(certificate #5247) and turns FIPS mode on. AWS-LC keeps separate FIPS branches. The
price is a real tension with security fixes. A CVE in the validated code cannot be
fixed in the validated version; the fix is a new version that is not validated until
it passes the queue. OpenSSL publishes, for each CVE, whether its FIPS provider is
affected, and teams that must run validated code then choose between running the known
bug and running an unvalidated fix, a choice their compliance officer should make
with them.

**The traps of "FIPS mode".**

1. **Installed is not enabled.** OpenSSL 3 with the FIPS provider installed still uses
   the default provider unless its configuration loads the FIPS provider and sets the
   default property `fips=yes`. A program can pass every compliance checklist and never
   call validated code. Check at run time (`openssl list -providers`, or the library's
   own query) rather than in the build script.
2. **Enabled breaks things you did not expect.** In FIPS mode non-approved algorithms
   fail. MD5 used as a cache key or file checksum, which has nothing to do with
   security, suddenly raises an error. Python added `hashlib.md5(usedforsecurity=False)`
   in version 3.9 so such code can say so and keep working on FIPS systems. Expect also
   minimum key sizes, approved curves only, and refused password-hashing parameters.
3. **System-wide switches reach everything.** Booting Linux with `fips=1`, or Red Hat's
   `fips-mode-setup`, changes the kernel's own cryptography, OpenSSH, every
   OpenSSL-linked program and more. Test the whole image in FIPS mode before production
   does it for you.
4. **Validated on which platform?** The certificate lists operating environments; a
   container on a different kernel or processor family may not be one of them
   ([Chapter 11](11-Hardware-for-Keys.md) §11.6).
5. **Validated is not the same as secure.** The lab checks conformance: approved
   algorithms, self-tests, key zeroization, documentation. It does not look for memory
   errors or protocol bugs above the module. Heartbleed was in OpenSSL's TLS code, not
   in its FIPS module, and validated products were vulnerable all the same.

**What to do.**

1. Decide early whether you need validation, because it decides your library.
2. Prove at run time, in a test, that the validated module is the one being used.
3. Run your full test suite in FIPS mode, and mark non-security hashes as such.
4. Keep a written decision for each CVE in the validated module: run the old validated
   code, or the fixed unvalidated code, and why.

## 17.10 Crypto inventories and agility

*Level: intermediate.*

Every algorithm in use will one day have to be replaced, whether because it is broken
(MD5, SHA-1, RC4, 3DES), because keys of its size have become cheap to attack
(RSA-1024), or because a quantum computer will break it (RSA and elliptic curves). The
first step of every such replacement is the same, and it is the one teams most often
skip: **find out where the algorithm is**. [Chapter 10](10-The-Life-of-a-Key.md)
argued this for keys. This section is about algorithms and the code that calls them;
the migration plan itself, for post-quantum cryptography, is in
[Post-quantum, Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md) §18.8.

**A cryptography bill of materials.** A software bill of materials (SBOM) lists the
components of a program. A **CBOM** extends it to cryptographic assets: algorithms,
keys, certificates and protocols, with where each occurs and what depends on it. The
idea came largely from IBM's research on post-quantum migration in 2023, and on 9 April
2024 OWASP's CycloneDX 1.6 made it part of the standard, which Ecma International
adopted that June as ECMA-424. In CycloneDX a cryptographic asset is a component of
type `cryptographic-asset`; its `cryptoProperties` give an `assetType` (`algorithm`,
`certificate`, `protocol` or `related-crypto-material`) and, for an algorithm, its
`primitive` (`hash`, `block-cipher`, `signature`, `kem` and so on), mode, padding,
parameter set and security level; `evidence.occurrences` records each place it was
found.

**Where the entries come from.** Source code (calls into cryptographic APIs, algorithm
names in strings and configuration), binaries and containers (which libraries are
linked, which symbols are called), the dependency tree, network scans of what
servers actually negotiate, and certificate stores and key managers. No single source
is complete: a scanner of source code sees `getInstance("RSA")` but not which key size
a configuration file chooses at run time, and a network scan sees what a server
offers, not what is stored in its database.

**Code it: an inventory scanner.** The block scans three small source files, in
Python, Java and Go, and writes what it finds as CycloneDX-shaped components. It first
runs the scan most teams start with, a case-insensitive substring search for algorithm
names, and then a scan with word boundaries and API-shaped patterns.

```python
import json, re

SOURCES = {
    "billing/export.py": '''import hashlib
digest = hashlib.md5(row).hexdigest()       # file checksum for the export
token = hashlib.sha256(secret + nonce).digest()
# description of the export format: docs/export.md
''',
    "auth/Session.java": '''Cipher c = Cipher.getInstance("AES/ECB/PKCS5Padding");
Cipher old = Cipher.getInstance("DESede/CBC/PKCS5Padding");
KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
kpg.initialize(1024);
Signature sig = Signature.getInstance("SHA1withRSA");
''',
    "edge/tls.go": '''cfg := &tls.Config{MinVersion: tls.VersionTLS10}
key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
// TODO: describe the des-ign of the cache
''',
}

# (pattern, algorithm, CycloneDX primitive, why it matters)
RULES = [
    (r"\bmd5\b", "MD5", "hash", "broken for collisions"),
    (r"\bsha-?1(?:withrsa)?\b", "SHA-1", "hash", "broken for collisions"),
    (r"\bsha-?256\b", "SHA-256", "hash", "fine"),
    (r"\b(?:3des|desede|des_ede3)\b", "3DES", "block-cipher", "disallowed after 2023"),
    (r"/ecb/", "AES-ECB", "block-cipher", "leaks patterns"),
    (r"keypairgenerator\.getinstance\(\"rsa\"\)", "RSA", "pke", "quantum-vulnerable"),
    (r"\.initialize\((?:512|768|1024)\)", "RSA-1024", "pke", "too short since 2013"),
    (r"versiontls1[01]\b", "TLS 1.0/1.1", "protocol", "retired by RFC 8996"),
    (r"elliptic\.p256\(\)", "ECDSA P-256", "signature", "quantum-vulnerable"),
]


def naive(sources):
    names = ["md5", "sha1", "sha256", "des", "ecb", "rsa", "p256"]
    return sorted({(path, n) for path, text in sources.items()
                   for n in names if n in text.lower()})


def scan(sources):
    found = {}
    for path, text in sources.items():
        for lineno, line in enumerate(text.splitlines(), 1):
            for pattern, name, primitive, note in RULES:
                if re.search(pattern, line.lower()):
                    comp = found.setdefault(name, {
                        "type": "cryptographic-asset", "name": name, "bom-ref": "crypto/" + name,
                        "cryptoProperties": {"assetType": "algorithm",
                                             "algorithmProperties": {"primitive": primitive}},
                        "evidence": {"occurrences": []},
                        "properties": [{"name": "note", "value": note}]})
                    comp["evidence"]["occurrences"].append({"location": path, "line": lineno})
    return {"bomFormat": "CycloneDX", "specVersion": "1.6", "components": list(found.values())}


print("naive substring scan:", naive(SOURCES))
cbom = scan(SOURCES)
for c in cbom["components"]:
    where = ", ".join(f"{o['location']}:{o['line']}" for o in c["evidence"]["occurrences"])
    print(f"{c['name']:12} {c['cryptoProperties']['algorithmProperties']['primitive']:13} {where:22} {c['properties'][0]['value']}")
print(json.dumps(cbom["components"][0]))
```

It prints:

```text
naive substring scan: [('auth/Session.java', 'des'), ('auth/Session.java', 'ecb'), ('auth/Session.java', 'rsa'), ('auth/Session.java', 'sha1'), ('billing/export.py', 'des'), ('billing/export.py', 'md5'), ('billing/export.py', 'sha256'), ('edge/tls.go', 'des'), ('edge/tls.go', 'p256')]
MD5          hash          billing/export.py:2    broken for collisions
SHA-256      hash          billing/export.py:3    fine
AES-ECB      block-cipher  auth/Session.java:1    leaks patterns
3DES         block-cipher  auth/Session.java:2    disallowed after 2023
RSA          pke           auth/Session.java:3    quantum-vulnerable
RSA-1024     pke           auth/Session.java:4    too short since 2013
SHA-1        hash          auth/Session.java:5    broken for collisions
TLS 1.0/1.1  protocol      edge/tls.go:1          retired by RFC 8996
ECDSA P-256  signature     edge/tls.go:2          quantum-vulnerable
{"type": "cryptographic-asset", "name": "MD5", "bom-ref": "crypto/MD5", "cryptoProperties": {"assetType": "algorithm", "algorithmProperties": {"primitive": "hash"}}, "evidence": {"occurrences": [{"location": "billing/export.py", "line": 2}]}, "properties": [{"name": "note", "value": "broken for collisions"}]}
```

**Break it.** The substring scan reports nine hits and is wrong in both directions. It
finds "des" in `export.py` ("description") and in `tls.go` ("des-ign"), two false
alarms that teach people to ignore the scanner. It misses the two findings that matter
most: the Go server still accepts TLS 1.0, and the Java code makes 1024-bit RSA keys,
because neither "TLS 1.0" nor a key size is an algorithm name. And it cannot tell
whether "des" means DES or 3DES.

**Fix it.** The second scan uses word boundaries, looks for API shapes
(`getInstance("RSA")`, `.initialize(1024)`, `VersionTLS10`) and records the line of
each occurrence, so a person can check it. It is still only a start: the MD5 on line 2
is a file checksum, which may be acceptable, and only someone who reads the code can
say so. That is why a CBOM records evidence and leaves judgment to people. Real tools
work the same way with far larger rule sets, and parse code instead of matching lines:
IBM's open-source CBOM tooling and Sonar plugin for Java and Python, CodeQL and Semgrep
rule packs for weak cryptography, and the research misuse detectors that
[Chapter 1](01-What-Cryptographic-Engineering-Is.md) §1.11 mentions, such as CogniCrypt
with its CrySL rules (ECOOP 2018) and CryptoGuard (CCS 2019), which check not only which
algorithm is named but how it is called.

**Agility.** An inventory tells you where the algorithms are; **agility** decides how
much it costs to change them. Code is agile when the algorithm is chosen in one place
(a configuration or a key's metadata, as Tink's keysets do;
[Chapter 9](09-APIs-That-Resist-Misuse.md)), when stored data says which algorithm and
key produced it (a version byte or key ID), when formats do not fix the size of keys,
signatures or ciphertexts, and when there is a tested way to re-encrypt or re-sign
old data. It is not agile when SHA-1 is called in forty files, or when a database
column is exactly 64 bytes wide because that is the size of an Ed25519 signature.
Agility is not free: every option is code that can be wrong, and protocols that
negotiated algorithms too freely gave attackers downgrade attacks. The engineering
answer is a small set of options chosen by you, identified in the data, never
negotiated by the attacker.

**What to do.**

1. Build a first inventory from source, dependencies and network scans, in CycloneDX
   format, and keep it in the repository next to the SBOM.
2. Run the scanner in continuous integration and fail the build on new uses of
   algorithms on a deny list.
3. Put the algorithm choice in one place per system, and an identifier in every stored
   ciphertext and signature.

## 17.11 Triaging a CVE in a cryptographic dependency

*Level: intermediate.*

Sooner or later a security advisory arrives for a cryptographic library you depend on.
The worst responses are the two extremes: panic, and the belief that it cannot matter.
The way between them is a fixed set of questions answered in order.

!!! note "Life story: CVE-2022-3602 and the OpenSSL pre-announcement"
    **Born:** OpenSSL 3.0.0 (September 2021), in the code that decodes Punycode email
    addresses while checking certificate name constraints; announced in advance on 25
    October 2022 as a CRITICAL fix due on 1 November · **Purpose:** none; an off-by-one that let a crafted certificate write
    four bytes past a stack buffer, during verification of a certificate chain ·
    **Helped:** a week of industry-wide triage that showed who could answer "which
    OpenSSL do we run, and where?" (most production systems still ran 1.1.1, which was
    not affected); on 1 November the fix in 3.0.7 came with a downgrade to HIGH, because
    stack protections and the need for a CA-signed malicious certificate (or an
    application that ignores verification failures) made exploitation unlikely ·
    **Status:** fixed; remembered as the model case for triage

**The questions.**

1. **Do we have it?** Search the inventory and SBOM, and then look harder: libraries
   statically linked into binaries, copies vendored into other projects, base images of
   containers, language packages that bundle their own copy (pyca `cryptography`'s
   wheels bundle OpenSSL, separately from the system's), appliances and firmware.
2. **Which versions?** Advisories name affected ranges. Linux distributions backport
   fixes without changing the upstream version number, so a scanner that compares
   version strings reports fixed packages as vulnerable; check the distribution's own
   advisory.
3. **Can the vulnerable code be reached?** CVE-2022-3602 needed certificate
   verification, so a server that did not request client certificates was reachable
   only through its outgoing connections. A bug in an algorithm you never call does
   not matter today, though it may matter after the next configuration change.
4. **By whom?** Exposure to the internet, to authenticated users only, or to local
   processes changes the urgency, not whether to fix.
5. **What does it give the attacker?** Read the impact class: memory disclosure (a
   Heartbleed means keys may already be gone and must be replaced, not merely the
   library), forgery or authentication bypass (psychic signatures: check logs for
   forged tokens), denial of service, or a timing leak (usually needs many
   measurements and proximity). Treat CVSS scores as a starting point; the project's
   own severity, with its reasoning, is usually better informed.
6. **How do we fix it, and how fast?** Upgrade, take the distribution's backport,
   switch off the feature, or add a mitigation in front. For a validated module, see
   §17.9.
7. **What do we tell people, and what do we learn?** Record the decision and the
   evidence. If question 1 took a day, the inventory of §17.10 is the lesson.

**What to do.**

1. Write the seven questions into your incident playbook before the next advisory
   ([Chapter 18](18-Running-Cryptography-for-Years.md) builds the rest of it).
2. Practice on an old advisory: time how long it takes to answer question 1 for every
   system.
3. Subscribe to the security lists of every library in Table 17.1 that you use, and to
   your distribution's advisories.

## 17.12 Going deeper

*Level: expert.*

**Verifying whole protocols.** Project Everest also produced miTLS, a verified TLS
implementation, and the line of work continues in verified QUIC record layers and
verified implementations of protocol state machines. Proving the composition of
verified primitives into a verified protocol is harder than proving either alone, and
the protocol proofs of the [Protocols](../protocols/index.md) book are the
specifications such code is checked against.

**Executable specifications.** Cryptol (Galois) and hacspec (a subset of Rust used by
libcrux through the hax toolchain) let a specification be run against the standard's
test vectors before any implementation is proved against it, which attacks the
"specification bug" gap of §17.7 directly.

**Testing that tests can fail.** Mutation testing changes the code under test in small
ways (flip a comparison, drop a check) and asks whether the test suite notices. Applied
to cryptographic code it finds exactly the missing tests that let psychic signatures
through: a suite in which deleting the range check on $r$ and $s$ breaks nothing does
not test that check.

**Constant time, proved.** The tools that check or prove constant-time behavior
(ctgrind, dudect, ct-verif, Binsec/Rel, Jasmin's checker) are covered in
[Chapter 5](05-Constant-Time-Programming.md) §5.11 and §5.12; this chapter has
assumed them.

**Supply chain.** A library you have chosen, tested and verified still reaches you
through a build and a download, and the xz backdoor of 2024 was in that path, not in
the algorithm. [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md) covers signing
and reproducible builds.

## Check yourself

??? question "1. A library has had no security advisories in five years. Is that good news?"
    Not by itself. It may mean the code is excellent, or that nobody has looked. Ask
    whether it is fuzzed, whether it runs Wycheproof, whether it has been audited, and
    how many people use it. A popular, well-tested library with a steady trickle of
    promptly fixed advisories is usually a safer choice than an obscure one with none.

??? question "2. Your HMAC test runner reports \"6 passed, 0 failed\" on RFC 4231's HMAC-SHA-256 vectors. What should you check?"
    That all seven test cases ran. RFC 4231 has seven; a parser that requires `=` after
    the field name skips test case 3, whose key line is printed without one. A runner
    should compare the cases that ran with the cases expected, and should be seen to
    fail when one expected value is changed.

??? question "3. How many zero bytes does SHA-256 add to a 120-byte message, and how many blocks does the padded message have?"
    $k = (55 - 120) \bmod 64 = (-65) \bmod 64 = 63$. The padded length is
    $120 + 1 + 63 + 8 = 192$ bytes, three blocks. (120 is $64 + 56$, so it behaves like
    the 56-byte case of Figure 17.2.)

??? question "4. Why did BufferBug pass every one-shot test in §17.4?"
    Its bug is in the path that tops up a partial block left over from an earlier
    `update` call. A message hashed in a single call never leaves a partial block
    before the next call, so that path never runs. Only tests that split messages
    into pieces reach it.

??? question "5. In ECDSA verification, why must the verifier reject $s = 0$ explicitly, rather than rely on the arithmetic to fail?"
    Because arithmetic written to "never fail" will produce some number instead. Fermat's
    inverse $s^{n-2} \bmod n$ returns 0 for $s = 0$, both scalars become 0, the result is
    the point at infinity, and if infinity is stored as $(0, 0)$ its $x$-coordinate
    equals $r = 0$. The check $1 \le r, s \le n - 1$ comes first in the standard so that
    none of this can happen.

??? question "6. What does a Wycheproof result of `acceptable` mean, and how should a library treat it?"
    The standard allows either acceptance or rejection, for example of a legacy
    encoding or a weak but legal parameter. The library should decide deliberately for
    each such flag, document the choice, and test that it keeps it; it should not
    treat `acceptable` as "untested".

??? question "7. Differential fuzzing compares OpenSSL, LibreSSL and BoringSSL and finds no disagreement for an operation. What kind of bug could still be there?"
    One the three share. They have a common ancestor, so a bug inherited from old
    OpenSSL code may be identical in all of them. Differential testing finds
    disagreements, not errors; an independent implementation (Go, Botan, a verified
    library) or the standard's vectors are needed to catch shared bugs.

??? question "8. A library's ML-KEM is formally verified, yet on one platform it produced wrong shared secrets. How can both be true?"
    The proof covered the verified code on the platforms and instruction sets it
    modeled. On platforms lacking one instruction, an unverified fallback in a helper
    crate passed wrong arguments and corrupted SHA-3 outputs (RUSTSEC-2025-0133). Proofs
    cover the proved code against its specification; fallbacks, dispatch, bindings and
    the hardware model are trusted, not proved.

??? question "9. Your product has OpenSSL's FIPS provider installed, and the security team says it is \"FIPS compliant\". What two things do you check?"
    That the configuration actually loads the FIPS provider and makes it the default
    (`fips=yes`), checked at run time, not in the build; and that the provider's
    version and your operating environment match the certificate (3.1.2, #4985, on
    a listed platform). "Compliant" is not a certificate.

??? question "10. An advisory says OpenSSL 3.0.0 to 3.0.6 are vulnerable. Your scanner reports 40 servers running \"OpenSSL 3.0.2\". What do you check before patching all 40 in a panic?"
    Whether the distribution has backported the fix without changing the version
    string (Ubuntu and Red Hat routinely do); whether the vulnerable function is
    reachable in each server's configuration; and what an attacker gains. Then patch in
    order of exposure. Also check for other copies the scanner does not see: static
    builds, containers and bundled wheels.

## What you learned

- Choosing a cryptographic library is choosing a long-term dependency: ask about
  maintainers, security process, testing, verification, platforms, FIPS needs, license,
  API stability and the kinds of bugs in its history.
- Known-answer tests come from standards (RFC appendices), from NIST's CAVP and ACVP,
  and from other implementations; a runner must count the cases it runs and be seen
  to fail.
- Differential testing against an independent implementation, at edge lengths and with
  random chunking, finds padding and buffering bugs that vectors never reach.
- Project Wycheproof (2016, now maintained by C2SP) encodes attacks as JSON test
  vectors; its ECDSA cases with $r = 0$, $s = 0$ would have caught psychic signatures.
- Cryptofuzz showed that libraries checking each other on fuzzed operations find wrong
  answers and memory errors in the most mature code, nearly two hundred times.
- Verified code (HACL\*, Vale, EverCrypt, Fiat-Crypto, Jasmin and libjade, s2n-bignum,
  SAW proofs of s2n) runs in browsers, kernels and clouds; a proof covers the proved
  code against its specification, while the specification, glue code, hardware model
  and caller remain trusted.
- An audit report is read from its commit, scope, effort and severity scale before its
  findings; "no significant findings" is evidence, not a certificate.
- FIPS 140-3 validation takes a year or more and six figures, freezes the module, and
  brings its own traps: modules installed but not enabled, broken non-security uses
  of MD5, and fixes that are not yet validated.
- A CBOM (CycloneDX 1.6, ECMA-424) records which algorithms are where, with evidence;
  agility comes from choosing algorithms in one place and labeling stored data.
- CVE triage asks, in order: do we have it, which version, is it reachable, by whom,
  what does it give, how do we fix it, and what did we learn.

**Next:** [Chapter 18](18-Running-Cryptography-for-Years.md), running all of this in
production for years: logging, monitoring, retiring algorithms and responding to
incidents.

## Further reading

- Neil Madden, "CVE-2022-21449: Psychic Signatures in Java" (19 April 2022); Oracle
  Critical Patch Update Advisory, April 2022.
- Daniel Bleichenbacher and Thai Duong, "Project Wycheproof", Google Security Blog (19
  December 2016); the Wycheproof repository and its list of historic bugs
  (github.com/C2SP/wycheproof, `doc/bugs.md`).
- Trail of Bits, "We found cryptography bugs in the elliptic library using Wycheproof"
  (November 2025).
- RFC 4231 (2005), Identifiers and Test Vectors for HMAC-SHA-224, HMAC-SHA-256,
  HMAC-SHA-384, and HMAC-SHA-512; RFC 5869 (2010), HMAC-based Extract-and-Expand Key
  Derivation Function (HKDF); RFC 2104 (1997), HMAC.
- FIPS 180-4 (2015), Secure Hash Standard; NIST CAVP, SHA test vectors
  (`shabytetestvectors`, `SHA256ShortMsg.rsp`); NIST, "CAVP and CST lab transition to
  ACVP" (2019 to 2020); the ACVP server (github.com/usnistgov/ACVP-Server).
- William M. McKeeman, "Differential Testing for Software", *Digital Technical Journal*
  10(1), 1998.
- Nicky Mouha and Christopher Celi, "A Vulnerability in Implementations of SHA-3,
  SHAKE, EdDSA, and Other NIST-Approved Algorithms", CT-RSA 2023; XKCP security
  advisory for CVE-2022-37454 (October 2022).
- Guido Vranken, Cryptofuzz (2019), and the community fork with its list of bugs found
  (github.com/MozillaSecurity/cryptofuzz).
- Jean Karim Zinzindohoué, Karthikeyan Bhargavan, Jonathan Protzenko and Benjamin
  Beurdouche, "HACL\*: A Verified Modern Cryptographic Library", CCS 2017; Benjamin
  Beurdouche and Franziskus Kiefer, "Verified cryptography for Firefox 57", Mozilla
  Security Blog (13 September 2017); CPython issue gh-99108 (HACL\* SHA-2, 2023).
- Barry Bond and colleagues, "Vale: Verifying High-Performance Cryptographic Assembly
  Code", USENIX Security 2017; Jonathan Protzenko and colleagues, "EverCrypt: A Fast,
  Verified, Cross-Platform Cryptographic Provider", IEEE S&P 2020.
- Andres Erbsen, Jade Philipoom, Jason Gross, Robert Sloan and Adam Chlipala, "Simple
  High-Level Code For Cryptographic Arithmetic: With Proofs, Without Compromises", IEEE
  S&P 2019; MIT News, "Automated cryptocode generator is helping secure the web" (June
  2019).
- José Bacelar Almeida and colleagues, "Jasmin: High-Assurance and High-Speed
  Cryptography", CCS 2017; the Formosa Crypto libjade repository.
- Andrey Chudnov and colleagues, "Continuous Formal Verification of Amazon s2n", CAV
  2018; the s2n-bignum repository and documentation (AWS, HOL Light).
- RustSec advisories RUSTSEC-2025-0007 (ring, withdrawn) and RUSTSEC-2025-0133
  (libcrux-intrinsics, December 2025).
- NCC Group, "Open Crypto Audit Project: TrueCrypt Cryptographic Review" (2015);
  Matthew Green, "Libsodium v1.0.12 and v1.0.13 Security Assessment" (2017); NCC Group,
  "RustCrypto AES-GCM and ChaCha20+Poly1305 Implementation Review" (February 2020);
  The Go Blog, "Go Cryptography Security Audit" (19 May 2025).
- FIPS 140-3 (2019); NIST CMVP, certificates #4631 (AWS-LC), #4985 (OpenSSL FIPS
  provider 3.1.2) and #5247 (Go Cryptographic Module v1.0.0); The Go Blog, "The FIPS
  140-3 Go Cryptographic Module" (2025); OpenSSL, "CVEs and the FIPS provider"; NIST,
  CMVP cost recovery fees; ABI Research and lab presentations on validation timelines
  (2025, estimates).
- OWASP CycloneDX 1.6 release announcement (9 April 2024) and specification
  (`cryptoProperties`); ECMA-424, 1st edition (June 2024).
- Stefan Krüger and colleagues, "CrySL: An Extensible Approach to Validating the
  Correct Usage of Cryptographic APIs", ECOOP 2018; Sazzadur Rahaman and colleagues,
  "CryptoGuard: High Precision Detection of Cryptographic Vulnerabilities in Massive-sized
  Java Projects", CCS 2019.
- OpenSSL Security Advisory, 1 November 2022 (CVE-2022-3602 and CVE-2022-3786); the
  OpenSSL release strategy (LTS dates); RFC 8996 (2021), deprecating TLS 1.0 and 1.1.
- pyca `cryptography` 3.4 changelog (February 2021) and the discussion of the Rust
  requirement; BoringSSL README; AWS Security Blog, "AWS-LC is now FIPS 140-3
  certified" (2023).
- Related chapters: [Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md)
  (ACVP vectors and verified post-quantum code) and
  [Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md) (the migration);
  reference pages [HMAC](../../06-mac/HMAC.md) and [OpenSSL](../../tools/openssl.md).
