# 5. Constant-Time Programming

*A cipher can be perfect on paper and still hand its key to anyone with a stopwatch.
The attacks are told in the Cryptanalysis book; this chapter is the defender's side.
It states the leak model precisely, then builds the toolbox that real libraries use:
comparing secrets without stopping early, turning a comparison into a mask, choosing
and swapping values without a branch, reading a table without a secret address, and
computing an S-box with no table at all. It then looks at the two things that undo
careful source code, the processor's variable-time instructions and the optimizing
compiler, at the switches CPUs now offer (Arm DIT, Intel DOIT), and at the tools that
check the compiled result. Along the way you will measure Python's `==` against
`hmac.compare_digest`, write a dudect-style leakage test, and build a small checker
that catches secret branches the way Valgrind does.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "constant time" means as a rule about instructions and addresses, and what it
      does not promise;
    - how to compare secrets, build masks from comparisons, select and swap without
      branches, and look up tables by scanning;
    - how to compute the AES S-box with no lookups, one byte at a time and 64 bytes at
      once by bitslicing;
    - which instructions take variable time (division almost everywhere, multiplication
      on some Arm Cortex-M cores, floating point on subnormals), and how to avoid them;
    - why the compiler is an adversary, what a value barrier is, and what Arm DIT and
      Intel DOIT promise;
    - why Python itself cannot be constant time, and what Python code is still good for;
    - how ctgrind, TIMECOP, dudect, ct-verif and Binsec/Rel check real code, and how to
      run a leakage test without fooling yourself.

    **You need:** [Chapter 18 of the cryptography book](../../book/18-Side-Channels.md)
    (side channels in general, and its §18.9, the first look at constant-time code);
    the attacks themselves are in
    [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).
    Binary numbers and two's complement help. [Chapter 1](01-What-Cryptographic-Engineering-Is.md)
    of this book sets out the layers at which cryptography fails; this chapter is the
    implementation layer.

    **Levels:** §5.1 to §5.3 are for beginners, §5.4 to §5.13 are intermediate,
    §5.14 is expert.

## 5.1 The problem

*Level: beginner.*

In 2007 a group of hobbyists who wanted to run their own software on the Microsoft
Xbox 360 found a way in that did not involve breaking any cryptography. The console
checked each stage of its boot code against an HMAC, a keyed hash that only Microsoft
could compute. The check itself was sound: a 16-byte tag, a strong hash, a secret key
buried in the chip. The flaw was one function call. The bootloader compared the tag it
computed with the tag stored beside the code using `memcmp`, the C library's ordinary
byte comparison, and `memcmp` stops at the first byte that differs. A tag that was
right in its first byte took slightly longer to reject than one that was wrong at
once. The people who found it (the Free60 project credits a hacker called arnezami
with the idea and another called robinsod with the hardware that timed it) could
therefore guess the tag one byte at a time: 256 tries for the first byte, 256 for the
second, at most $16 \times 256 = 4096$ guesses instead of $2^{128}$. They used it to
load an older, vulnerable kernel onto consoles that had been patched against it.
Microsoft could not fix the bootloader on consoles already sold; it changed the code
in later hardware revisions.

Two years later, in 2009, Nate Lawson looked at Keyczar, a library Google had written
precisely so that programmers would not have to make cryptographic choices. Its
Python and Java versions checked HMAC tags with comparisons that returned at the
first difference. Coda Hale then found that Java's own `MessageDigest.isEqual`, the
function a careful Java programmer would have used instead, did the same, and Sun
fixed it in Java SE 6 Update 17 later that year (CVE-2009-3875). The bug had sat in
the platform's own "compare two digests" function.

Neither story needs anything clever from the attacker: the leak is a few nanoseconds,
and the attacker repeats each measurement until the average shows it. How that
averaging works, how far it reaches across a network (Scott Crosby, Dan Wallach and
Rudolf Riedi measured differences of tens of microseconds across the internet and
about 100 nanoseconds on a local network, in 2009), and how the same idea reads AES
keys out of a shared cache are the subject of
[Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).
This chapter starts where that one ends. You are writing the code. You know the
attacker can time it, share a cache with it, or watch the branch predictor it trains.
What exactly must the code not do, how do you write it so it does not, and how do you
check that the machine code you ship still obeys?

The answer has a name, **constant-time programming**, and the name is misleading
twice over. The code need not take the same time on every call: it may take longer
for longer messages, because message lengths are usually public. And "constant" is not
something you can see in source code: it is a property of the instructions the
processor finally runs, which depend on the compiler, its flags and the processor
model. The rest of this chapter turns the slogan into rules, the rules into code, and
the code into something a tool can check.

!!! note "Life story: the Xbox 360 timing attack"
    **Born:** 2007, found by the Xbox 360 homebrew scene (credited by the Free60
    project to arnezami, with measurement hardware by robinsod) · **Purpose:** to get
    past the HMAC check on the console's boot stages by timing `memcmp`, one tag byte
    at a time, so that patched consoles could be downgraded to an exploitable kernel ·
    **Helped:** to make "compare MACs in constant time" a rule every library now
    follows; it is still the textbook example · **Retired:** Microsoft fixed the
    comparison in later boot code and hardware revisions; consoles with the old
    bootloader stayed vulnerable · **Replaced by:** the same team's later attacks were
    hardware glitches (the 2011 Reset Glitch Hack), a fault, not a timing, channel

## 5.2 The leak model

*Level: beginner.*

A program leaks through timing when something an observer can measure depends on a
secret. To write code that does not leak, you need a model of what the observer can
measure. The one used by almost every cryptographic library, by the verification tools
of §5.11 and §5.12 and by the formal definitions of §5.14 is short. An observer who runs on the
same machine, or times the answers over a network, learns:

1. **the control flow**: which instructions run, in what order, and how many times;
   in practice, the outcome of every branch and the count of every loop;
2. **the memory addresses**: which addresses are read and written, at least to the
   granularity of a cache line (64 bytes on most processors), and in the worst case
   down to the byte;
3. **the operands of variable-time instructions**: for instructions whose duration
   depends on their inputs (division on most processors, multiplication on some),
   the observer learns something about those inputs.

The observer does **not** learn the values in registers or memory directly. Code is
**constant time** (more precisely, it has **secret-independent timing**) when none of
the three depends on secret data. Then two runs on different secrets execute the same
instructions, touch the same addresses and feed the same timing-relevant operand
classes to the processor, and nothing on the list differs between them.

This is an abstraction, and it is chosen to be generous to the attacker. Real
attackers rarely see every branch or every address. But measuring tools keep getting
sharper (Flush+Reload sees single cache lines across cores; branch-predictor attacks
see single branches), and a rule that says "the observer sees everything on the list"
does not need updating each time one of them improves. It is also a rule about what
the code does, not about how long it takes, which is what makes it checkable: a tool
can follow every branch and every address, while no amount of timing can prove the
absence of a small leak.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The leak model: a secret can influence which instructions run, which addresses are touched, and how long variable-time instructions take; each of these reaches the observer as time, cache state or predictor state" fill="currentColor" font-size="14">
<defs><marker id="ar51" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="10" y="115" width="140" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="80" y="143" text-anchor="middle" font-weight="bold">secret data</text>
<text x="80" y="163" text-anchor="middle" font-size="12">key, plaintext, nonce</text>
<rect x="215" y="20" width="210" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="45" text-anchor="middle" font-weight="bold">1. control flow</text>
<text x="320" y="65" text-anchor="middle" font-size="12">if, loop exit, early return</text>
<rect x="215" y="120" width="210" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="145" text-anchor="middle" font-weight="bold">2. memory addresses</text>
<text x="320" y="165" text-anchor="middle" font-size="12">table[secret], ptr + secret</text>
<rect x="215" y="220" width="210" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="245" text-anchor="middle" font-weight="bold">3. operand-dependent time</text>
<text x="320" y="265" text-anchor="middle" font-size="12">division, some multiplies</text>
<rect x="490" y="40" width="140" height="220" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="560" y="68" text-anchor="middle" font-weight="bold">observer sees</text>
<text x="560" y="105" text-anchor="middle" font-size="12">total time</text>
<text x="560" y="135" text-anchor="middle" font-size="12">cache lines touched</text>
<text x="560" y="165" text-anchor="middle" font-size="12">branch predictor</text>
<text x="560" y="195" text-anchor="middle" font-size="12">port contention</text>
<text x="560" y="225" text-anchor="middle" font-size="12">page faults, TLB</text>
<line x1="150" y1="140" x2="213" y2="55" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
<line x1="150" y1="150" x2="213" y2="150" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
<line x1="150" y1="160" x2="213" y2="245" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
<line x1="425" y1="50" x2="488" y2="100" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
<line x1="425" y1="150" x2="488" y2="150" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
<line x1="425" y1="250" x2="488" y2="200" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar51)"/>
</svg>
<figcaption>Figure 5.1. The leak model. Constant-time code cuts the three middle arrows: no secret reaches control flow, addresses, or the operands of variable-time instructions, so nothing on the right depends on it.</figcaption>
</figure>

**What counts as secret.** Keys, obviously, and everything derived from them: round
keys, the internal state of a cipher, a private scalar, the nonce of an ECDSA
signature (a few leaked bits of many nonces give the key, as
[Cryptanalysis, Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
shows). Plaintext is secret too, including the plaintext a decryption produces,
before it has been authenticated. So is the outcome of a check while an attacker can
still learn from it: whether a padding byte was valid, whether a MAC matched, whether
a decapsulated message re-encrypts correctly. What is usually **public**: lengths of
messages and keys, the algorithm and its parameters, ciphertexts on the wire, and the
final accept-or-reject decision that the protocol announces anyway. Turning a secret
into a public value on purpose is called **declassification**, and good code does it
in exactly one place, at the end ("the MAC check failed, return an error"), never in
the middle.

**By hand.** Take the early-exit comparison of the Xbox bootloader, a loop that
compares byte $i$ of the guess with byte $i$ of the tag and returns at the first
difference. Say one loop iteration costs 3 nanoseconds. A guess wrong in its first
byte runs 1 iteration, 3 ns. A guess right in its first byte and wrong in its second
runs 2 iterations, 6 ns. Rule 1 is broken: the loop's exit, a branch, depends on the
secret tag. Each extra correct byte adds 3 ns, and an attacker who can average away
noise of, say, 1 microsecond needs about $(1000/3)^2 \approx 110{,}000$ samples per
guess before a 3 ns shift is as large as the standard error of the mean (which falls
as $1/\sqrt{n}$), and several times that to be sure.
Expensive, but finite, and the attacker has all night.

**What the model leaves out.** Three things, each handled elsewhere. **Power and
electromagnetic leaks** depend on the values computed, not only on the control flow,
so constant-time code still leaks to an oscilloscope; that is masking, in
[Chapter 7](07-Masking-and-Fault-Resistance.md). **Speculative execution** runs
instructions the program never asked for, so a branch-free program can still leak
through branches the processor guesses; §5.14 says what "speculative constant time"
adds. And **the processor's own optimizations** can break the third rule in new ways:
a data-dependent prefetcher looks at the values in memory, and frequency scaling
turns power into time. §5.10 covers both. The model is a floor, not a ceiling, but it
is the floor everything else stands on.

**What to do.**

1. Write down, for each function, which inputs are secret. A function's contract
   includes its secrets as much as its types.
2. Make every branch, loop bound and array index a function of public data only.
3. Declassify once, at the end, and only the value the protocol announces anyway.
4. Treat any plaintext as secret until it is authenticated, and any check result as
   secret until it is returned.

## 5.3 Comparing secrets

*Level: beginner.*

The first tool in the box is the one the Xbox and Keyczar lacked: a comparison whose
time does not depend on where the inputs differ.

**Break it.** This is the comparison every programmer writes first, and it is what
`memcmp`, Python's `==` and Java's old `isEqual` all do in spirit:

```python
def leaky_equal(a, b):
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:            # exits as soon as a byte differs: the exit point is the leak
            return False
    return True

tag = bytes.fromhex("9e4a1fc2770b35d8")
print(leaky_equal(tag, bytes.fromhex("9e4a1fc2770b35d8")),
      leaky_equal(tag, bytes.fromhex("9e4a000000000000")))
```

It prints `True False`, and the second call ran three loop iterations where a guess
wrong in the first byte would have run one.

**Fix it.** Accumulate the differences and decide only at the end. XOR is zero
exactly where two bytes agree, OR collects every nonzero bit, and the loop always runs
to the end:

```python
def ct_equal(a, b):
    if len(a) != len(b):      # lengths are public: returning early here is fine
        return False
    d = 0
    for x, y in zip(a, b):
        d |= x ^ y            # stays 0 only if every byte matched
    return d == 0             # one decision, at the end, about the whole value

tag = bytes.fromhex("9e4a1fc2770b35d8")
print(ct_equal(tag, bytes.fromhex("9e4a1fc2770b35d8")),
      ct_equal(tag, bytes.fromhex("9e4a000000000000")))
```

It prints `True False`. In C the same function is the one every library carries:

```c
int ct_memeq(const uint8_t *a, const uint8_t *b, size_t n)
{
    uint8_t d = 0;
    for (size_t i = 0; i < n; i++)
        d |= a[i] ^ b[i];
    /* d is 0..255; (d - 1) >> 8 is all ones only when d == 0 */
    return (int)(1 & (((uint32_t)d - 1) >> 8));
}
```

The last line is the subtle part. `return d == 0;` is correct and usually compiles to
a branch-free `sete` instruction on x86, but nothing in the C language promises that,
so libraries turn `d` into 0 or 1 with arithmetic: when $d = 0$, $d - 1$ wraps to
$2^{32} - 1$ and shifting right by 8 leaves its low bit 1; when $1 \le d \le 255$,
$d - 1 < 256$ and the shift gives 0. §5.4 generalizes this trick.

**Why the length is allowed to leak.** The fixed comparison still returns early when
the lengths differ. That is fine when the length is public, as it is for a MAC tag
(every HMAC-SHA-256 tag is 32 bytes) or a hash. It is not fine when the length is the
secret: comparing a typed password with a stored password character by character
leaks the stored password's length. The answer there is not a cleverer comparison but
not storing passwords at all: hash both to a fixed length and compare the hashes
([Chapter 13](13-Passwords-on-the-Server.md)).

**Python's answer: `hmac.compare_digest`.** Python added `hmac.compare_digest` in
version 3.3 (2012), after a long discussion on the bug tracker of exactly the Keyczar
problem, and backported it to 2.7.7 in 2014; `secrets.compare_digest` (3.6) is the
same function. It is written in C: the interpreter's own loop is too unpredictable to
trust (§5.9). Since Python 3.10 it calls OpenSSL's `CRYPTO_memcmp` when Python is
built with OpenSSL, and falls back to its own loop otherwise. Its documentation is
honest about the boundary: if the two inputs have different lengths, or an error
occurs, "a timing attack could theoretically reveal information about the types and
lengths of a and b, but not their values".

**Code it.** How much does `==` actually leak in Python? Time each comparison many
times with `time.perf_counter_ns` and look at the median, once for a guess wrong in
the first byte and once for a guess wrong in the last byte, for a 32-byte tag and for
a 100,000-byte value:

```python
import hmac, secrets, statistics, time

def timings(compare, secret, guess, runs=20000):
    out = []
    for _ in range(runs):
        t0 = time.perf_counter_ns()
        compare(secret, guess)
        out.append(time.perf_counter_ns() - t0)
    return out

def report(name, compare, size):
    secret = secrets.token_bytes(size)
    early = bytes([secret[0] ^ 1]) + secret[1:]     # differs in the first byte
    late = secret[:-1] + bytes([secret[-1] ^ 1])    # differs in the last byte
    a = statistics.median(timings(compare, secret, early))
    b = statistics.median(timings(compare, secret, late))
    print(f"{name:15} {size:>7} bytes   first-byte miss {a:7.0f} ns"
          f"   last-byte miss {b:7.0f} ns   ratio {b / a:5.2f}")

equal = lambda x, y: x == y
for size in (32, 100_000):
    report("==", equal, size)
    report("compare_digest", hmac.compare_digest, size)
```

The numbers depend on your processor, your Python build and what else the machine is
doing, so they change from run to run. One run, on a Linux server with Python 3.13,
printed:

```
==                   32 bytes   first-byte miss      69 ns   last-byte miss      69 ns   ratio  1.00
compare_digest       32 bytes   first-byte miss      78 ns   last-byte miss      79 ns   ratio  1.01
==               100000 bytes   first-byte miss      69 ns   last-byte miss    1824 ns   ratio 26.43
compare_digest   100000 bytes   first-byte miss   57535 ns   last-byte miss   57574 ns   ratio  1.00
```

Read it honestly. For a 32-byte tag the medians of `==` do not move at all at
nanosecond resolution: most of the 69 ns is the interpreter calling the function, and
the comparison itself is one or two vector instructions inside `memcmp`. That does
**not** mean `==` is safe for tags; it means a median of 20,000 samples is too blunt
to see the difference. §5.12 runs a sharper test on the same comparison and finds the
leak at once. For 100,000 bytes the leak is plain: a mismatch at the end costs 26
times more than one at the start, because `memcmp` stops early. `compare_digest` is
flat, and also slow, about half a nanosecond per byte: it walks the bytes one at a
time and does not let the compiler vectorize the loop or stop early. That is the
price, and for 32-byte tags it is invisible.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Comparison time against the position of the first differing byte: the early-exit comparison rises with the position, the constant-time comparison is flat" fill="currentColor" font-size="14">
<line x1="70" y1="210" x2="610" y2="210" stroke="currentColor" stroke-width="1.4"/>
<line x1="70" y1="210" x2="70" y2="20" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="245" text-anchor="middle">position of the first byte that differs (0 to n - 1)</text>
<text x="30" y="115" text-anchor="middle" font-style="italic">time</text>
<polyline points="80,195 140,178 200,161 260,144 320,127 380,110 440,93 500,76 560,59 600,48" fill="none" stroke="currentColor" stroke-width="2.2"/>
<line x1="80" y1="70" x2="600" y2="70" stroke="currentColor" stroke-width="2.2" stroke-dasharray="7 4"/>
<text x="360" y="150" font-weight="bold">early exit (memcmp, ==)</text>
<text x="360" y="168" font-size="12">each matching byte adds time</text>
<text x="110" y="58" font-weight="bold">OR of XORs (compare_digest)</text>
<text x="110" y="92" font-size="12">every byte is read, every time</text>
</svg>
<figcaption>Figure 5.2. What the two comparisons look like to a stopwatch. The attacker of the early-exit version climbs the solid line one byte at a time; the dashed line gives nothing to climb. Constant time costs speed: the flat line sits where the slowest early-exit case does.</figcaption>
</figure>

!!! note "Life story: the Keyczar and Java digest comparisons"
    **Born:** 2009, Nate Lawson's report that Google's Keyczar library checked HMAC
    tags with an early-exit loop, followed by Coda Hale's report (22 July 2009) that
    Java's own `MessageDigest.isEqual` did the same · **Purpose:** the libraries were
    meant to make HMAC verification safe for non-experts; the comparison undid it ·
    **Helped:** Keyczar was fixed; Sun made `isEqual` constant time in Java SE 6 Update
    17 and Java 5.0 Update 22 (CVE-2009-3875, late 2009); Python's
    `hmac.compare_digest` (3.3, 2012) and the habit of shipping a named constant-time
    comparison in every standard library followed · **Status:** the bug class is
    still found every year in application code that checks tokens, API keys and
    webhook signatures with `==`

The same lesson runs through every language. Go has `crypto/subtle.ConstantTimeCompare`,
Rust has the `subtle` crate's `ConstantTimeEq` (and `ring::constant_time`), Node.js has
`crypto.timingSafeEqual`, Java has `MessageDigest.isEqual` (fixed), .NET has
`CryptographicOperations.FixedTimeEquals`, libsodium has `sodium_memcmp`, OpenSSL has
`CRYPTO_memcmp`. They all do the OR of XORs of the fix above; they differ only in what
they do about lengths, and in how hard they work to stop the compiler from undoing
them (§5.8).

**What to do.**

1. Compare MAC tags, password hashes, session tokens, API keys, CSRF tokens and
   webhook signatures with your platform's constant-time function, never with `==`.
2. Compare fixed-length values. If an input can have any length, hash it first.
3. Better still, use an API that verifies for you (`hmac.compare_digest` inside a
   `verify()` method, an AEAD's decrypt that fails on a bad tag) so that no caller ever
   holds a tag and an `==` at the same time ([Chapter 9](09-APIs-That-Resist-Misuse.md)).
4. Make the failure path the same whatever went wrong: one error, one code path.

## 5.4 Masks from comparisons, select and swap

*Level: intermediate.*

Constant-time code cannot write `if secret: x = a else: x = b`. It needs the
choice without the branch. The whole toolbox rests on one representation: a
condition is held not as a Boolean but as a **mask**, a word that is either all ones
(`0xFFFFFFFF` for a 32-bit word) or all zeros. With a mask $m$, choosing is
arithmetic:

$$
\begin{aligned}
\mathrm{select}(m, a, b) &= (a \mathbin{\&} m) \\
&\quad \mathbin{|}\; (b \mathbin{\&} \lnot m),
\end{aligned}
$$

which is $a$ when $m$ is all ones and $b$ when $m$ is zero, with the same instructions
either way. Everything else is about getting masks out of comparisons without a
branch, and that rests on two facts of two's complement arithmetic on $w$-bit words.

**Fact 1: negation turns a bit into a mask.** For $b \in \{0, 1\}$, $-b \bmod 2^w$ is
$0$ when $b = 0$ and $2^w - 1$, all ones, when $b = 1$. So `mask = -bit` (on unsigned
words) is the bridge from a 0-or-1 answer to a mask.

**Fact 2: the top bit of $q \mathbin{|} (-q)$ says whether $q \neq 0$.** If $q = 0$,
then $-q = 0$ and the OR is 0. If $q \neq 0$, then either $q$ has its top bit set, or
$q < 2^{w-1}$ and $-q = 2^w - q$ has its top bit set. Either way, the OR has its top
bit set. Shifting right by $w - 1$ gives exactly $[q \neq 0]$.

From these:

$$
\begin{aligned}
\mathrm{nonzero}(q) &= (q \mathbin{|} -q) \gg (w-1), \\
\mathrm{eq}(x, y) &= 1 \oplus \mathrm{nonzero}(x \oplus y), \\
\mathrm{lt}(x, y) &= \big(z \oplus ((x \oplus y) \mathbin{\&} (y \oplus z))\big) \\
&\quad \gg (w-1), \\
z &= x - y \bmod 2^w .
\end{aligned}
$$

The last line, unsigned less-than, is the one people copy without understanding, so
here is why it works. Look only at the top bits. If $x$ and $y$ have the same top bit,
then $|x - y| < 2^{w-1}$, so $x - y$ wraps around exactly when $x < y$, and then
$z = x - y + 2^w$ has its top bit set; $(x \oplus y)$ has top bit 0, the AND clears
it, and the answer is the top bit of $z$. If $x$ and $y$ have different top bits,
the larger one is the one whose top bit is set, so $x < y$ exactly when $y$'s top bit
is 1; now $(x \oplus y)$ has top bit 1, the AND keeps the top bit of $y \oplus z$, and
$z \oplus y \oplus z = y$. This form is the one Thomas Pornin uses in BearSSL; *Hacker's
Delight* (Henry Warren, 2002) has several equivalents.

**By hand.** With $w = 32$, compare $x = 7$ and $y = 9$ for equality. $q = 7 \oplus 9 =$
`0x0000000E`; $-q =$ `0xFFFFFFF2`; $q \mathbin{|} -q =$ `0xFFFFFFFE`; its top bit is 1,
so they differ, and $\mathrm{eq} = 1 \oplus 1 = 0$, mask $-0 =$ `0x00000000`. For
$x = y = 7$: $q = 0$, the OR is 0, $\mathrm{eq} = 1$, mask `0xFFFFFFFF`. Now
less-than with $x = 5$, $y =$ `0x80000003`: $z = x - y =$ `0x80000002` after wrapping;
$x \oplus y =$ `0x80000006` (top bits differ); $y \oplus z =$ `0x00000001`; the AND is 0;
$z \oplus 0 =$ `0x80000002`, top bit 1: $5 < $ `0x80000003`, correct. A signed
comparison, or a naive "top bit of $x - y$", would have said the opposite.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Turning an equality test into a mask in five branch-free steps, shown for equal inputs and for different inputs" fill="currentColor" font-size="14">
<defs><marker id="ar53" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="30" font-weight="bold">step</text>
<text x="330" y="30" font-weight="bold" text-anchor="middle">x = 7, y = 7</text>
<text x="520" y="30" font-weight="bold" text-anchor="middle">x = 7, y = 9</text>
<line x1="20" y1="40" x2="620" y2="40" stroke="currentColor" stroke-width="1"/>
<text x="20" y="66">q = x ^ y</text>
<text x="330" y="66" text-anchor="middle" font-family="monospace">00000000</text>
<text x="520" y="66" text-anchor="middle" font-family="monospace">0000000E</text>
<text x="20" y="96">q | -q</text>
<text x="330" y="96" text-anchor="middle" font-family="monospace">00000000</text>
<text x="520" y="96" text-anchor="middle" font-family="monospace">FFFFFFFE</text>
<text x="20" y="126">&gt;&gt; 31 (differs?)</text>
<text x="330" y="126" text-anchor="middle" font-family="monospace">0</text>
<text x="520" y="126" text-anchor="middle" font-family="monospace">1</text>
<text x="20" y="156">1 ^ that (equal?)</text>
<text x="330" y="156" text-anchor="middle" font-family="monospace">1</text>
<text x="520" y="156" text-anchor="middle" font-family="monospace">0</text>
<text x="20" y="186">mask = -equal</text>
<text x="330" y="186" text-anchor="middle" font-family="monospace" font-weight="bold">FFFFFFFF</text>
<text x="520" y="186" text-anchor="middle" font-family="monospace" font-weight="bold">00000000</text>
<line x1="20" y1="200" x2="620" y2="200" stroke="currentColor" stroke-width="1"/>
<text x="20" y="230">select(mask, a, b)</text>
<text x="330" y="230" text-anchor="middle">gives a</text>
<text x="520" y="230" text-anchor="middle">gives b</text>
<line x1="250" y1="50" x2="250" y2="190" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>
</svg>
<figcaption>Figure 5.3. From comparison to mask. Both columns run exactly the same five operations; only the values differ, and values are what the leak model says the observer does not see.</figcaption>
</figure>

**Code it.** The masks, select and swap on 32-bit words, written as they are in C, with
every result reduced mod $2^{32}$ by hand (Python's integers do not wrap), and checked
against Python's own operators on edge cases and 100,000 random pairs:

```python
import random

M32 = 0xFFFFFFFF          # every value is a 32-bit unsigned word, as in C

def ct_nonzero(x):        # 1 if x != 0, else 0
    return ((x | (-x & M32)) >> 31) & 1

def ct_eq(x, y):          # 1 if x == y, else 0
    return 1 ^ ct_nonzero(x ^ y)

def ct_lt(x, y):          # 1 if x < y (unsigned), else 0
    z = (x - y) & M32
    return ((z ^ ((x ^ y) & (y ^ z))) >> 31) & 1

def mask_of(bit):         # 1 -> 0xFFFFFFFF, 0 -> 0x00000000
    return -bit & M32

def ct_select(bit, a, b): # a if bit else b
    m = mask_of(bit)
    return (a & m) | (b & ~m & M32)

def ct_swap(bit, a, b):   # (b, a) if bit else (a, b)
    t = mask_of(bit) & (a ^ b)
    return a ^ t, b ^ t

rng = random.Random(5)
edges = [0, 1, 2, 0x7FFFFFFF, 0x80000000, 0x80000001, M32 - 1, M32]
pairs = [(x, y) for x in edges for y in edges]
pairs += [(rng.getrandbits(32), rng.getrandbits(32)) for _ in range(100_000)]
pairs += [(x, x) for x, _ in pairs[:1000]]
ok = all(ct_eq(x, y) == (x == y) and ct_lt(x, y) == (x < y) and
         ct_select(1, x, y) == x and ct_select(0, x, y) == y and
         ct_swap(1, x, y) == (y, x) and ct_swap(0, x, y) == (x, y) for x, y in pairs)
print(len(pairs), "pairs checked:", ok)
print(hex(mask_of(1)), hex(mask_of(0)), ct_lt(5, 0x80000003), ct_lt(0x80000003, 5))
```

It prints:

```
101064 pairs checked: True
0xffffffff 0x0 1 0
```

The `all(...)` uses `==` and `<` freely: that is the test harness, which knows the
answers, not the code under test. A habit worth keeping: every branch-free trick gets
an exhaustive or randomized check against the obvious code, because these one-liners
are easy to get subtly wrong. (The first draft of `ct_lt` above had one operand
swapped, and the check caught it on the first run.)

**In C.** The same functions, as they appear, with small variations, in BearSSL,
BoringSSL's `crypto/internal.h` and libsodium:

```c
static inline uint32_t ct_nonzero_u32(uint32_t x) { return (x | -x) >> 31; }
static inline uint32_t ct_eq_u32(uint32_t x, uint32_t y) { return 1 ^ ct_nonzero_u32(x ^ y); }
static inline uint32_t ct_lt_u32(uint32_t x, uint32_t y)
{
    uint32_t z = x - y;
    return (z ^ ((x ^ y) & (y ^ z))) >> 31;
}
static inline uint32_t ct_select_u32(uint32_t bit, uint32_t a, uint32_t b)
{
    uint32_t m = -bit;              /* 0xFFFFFFFF or 0 */
    return (a & m) | (b & ~m);
}
static inline void ct_swap_u32(uint32_t bit, uint32_t *a, uint32_t *b)
{
    uint32_t t = -bit & (*a ^ *b);
    *a ^= t;
    *b ^= t;
}
```

Three details matter in C. Use **unsigned** types: overflow of signed integers is
undefined behavior, and a compiler may assume it never happens. Do not get a mask by
shifting a negative signed number right (`(int32_t)x >> 31`): that is
implementation-defined in C and usually, but not always, an arithmetic shift. And keep
the condition as a mask from the moment it is computed to the moment it is used: the
day someone writes `if (ct_eq_u32(a, b))` the work is undone.

**Conditional swap.** `ct_swap` swaps two values or leaves them, decided by a secret
bit, with the same instructions. It is the heart of the Montgomery ladder, where at
each step of a scalar multiplication the two working points are swapped according to
the next key bit, so that the ladder always does "add, then double" on the same
registers. RFC 7748 writes it exactly this way for X25519 (`dummy = mask(swap) AND
(x_2 XOR x_3)`). [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) builds the ladder
on top of it; the same swap, applied to every limb of a big number, is how
constant-time code conditionally subtracts a modulus.

**Masks on bigger things.** A mask works on anything made of words. To select between
two 256-bit numbers, select limb by limb with the same mask. To copy a buffer only if
a secret condition holds, `dst[i] = select(m, src[i], dst[i])` for every byte. To
compute "the length of the valid padding" without branching on the padding, build one
mask per position (`ct_lt(i, pad_len)`) and fold the checks together with AND. This
last one is the defender's half of the padding-oracle story: the TLS stacks repaired
after Lucky Thirteen (2013) check padding and MAC over a constant amount of data, with
masks, so that neither the padding's validity nor its length shows in the time; the
attack is told in [Cryptanalysis, Chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)
and the error-handling side in [Chapter 9](09-APIs-That-Resist-Misuse.md).

**What to do.**

1. Represent secret conditions as masks, not as `bool`, from where they are computed to
   where they are used.
2. Use unsigned arithmetic, and test every branch-free helper against the obvious code
   on edge cases (0, 1, the top bit, all ones) and random values.
3. Prefer your library's helpers (`subtle` in Rust, `crypto/subtle` in Go, BoringSSL's
   `constant_time_*`) over your own: they come with the compiler defenses of §5.8.

## 5.5 Table lookups without secret addresses

*Level: intermediate.*

The second rule of the leak model forbids memory addresses that depend on secrets.
The obvious offender is a table indexed by a secret: an S-box, a precomputed table of
multiples of a point, a window table of powers in modular exponentiation. The processor
loads the cache line that holds `table[secret]`, and an attacker who shares the cache
can tell which line was loaded (Prime+Probe, Flush+Reload; see
[Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)).
The AES T-table implementations, which did each round with four 1 KB tables, were
broken this way by Daniel Bernstein and by Dag Arne Osvik, Adi Shamir and Eran Tromer,
both in 2005, and the attack side of that story is
[Cryptanalysis §17.5](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).

**Break it.** One line:

```python
TABLE = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]

def lookup(secret_index):
    return TABLE[secret_index]     # the address read is TABLE + secret_index

print([lookup(i) for i in (0, 7, 15)])
```

It prints `[12, 13, 2]`. (The table is the 4-bit S-box of the PRESENT cipher.)

**Fix it.** Read every entry, every time, and keep the one you want with a mask. The
addresses read are `TABLE + 0`, `TABLE + 1`, ..., `TABLE + 15`, the same for every
index, so the cache sees nothing:

```python
M32 = 0xFFFFFFFF

def ct_eq(x, y):
    q = x ^ y
    return 1 ^ (((q | (-q & M32)) >> 31) & 1)

def ct_lookup(table, secret_index):
    r = 0
    for i, v in enumerate(table):          # i is public: it runs over every entry
        m = -ct_eq(i, secret_index) & M32  # all ones only at the wanted entry
        r |= v & m
    return r

TABLE = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]
print([ct_lookup(TABLE, i) for i in (0, 7, 15)])
print("matches the plain lookup:", all(ct_lookup(TABLE, i) == TABLE[i] for i in range(16)))
```

It prints:

```
[12, 13, 2]
matches the plain lookup: True
```

The cost is the size of the table. Sixteen reads for a 4-bit S-box are nothing; 256
reads for an 8-bit S-box, 16 times per AES round, 10 rounds per block, is 40,960 reads
per 16-byte block, which is why nobody scans the AES S-box in production and §5.6
computes it instead. For big-number code, scanning is the standard answer: a
scalar-multiplication window of 16 precomputed points, each 64 to 128 bytes, is
scanned in full at every step, and the cost (a few kilobytes read per step) is small
next to the field arithmetic.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A direct lookup reads one cache line chosen by the secret; a scanning lookup reads every entry and keeps one with a mask" fill="currentColor" font-size="14">
<defs><marker id="ar54" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="22" text-anchor="middle" font-weight="bold">table[secret]</text>
<text x="470" y="22" text-anchor="middle" font-weight="bold">scan with masks</text>
<rect x="100" y="35" width="100" height="200" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="100" y1="85" x2="200" y2="85" stroke="currentColor" stroke-width="1.4"/>
<line x1="100" y1="135" x2="200" y2="135" stroke="currentColor" stroke-width="1.4"/>
<line x1="100" y1="185" x2="200" y2="185" stroke="currentColor" stroke-width="1.4"/>
<rect x="100" y="135" width="100" height="50" fill="currentColor" opacity="0.25"/>
<text x="150" y="65" text-anchor="middle" font-size="12">line 0: 0-3</text>
<text x="150" y="115" text-anchor="middle" font-size="12">line 1: 4-7</text>
<text x="150" y="165" text-anchor="middle" font-size="12">line 2: 8-11</text>
<text x="150" y="215" text-anchor="middle" font-size="12">line 3: 12-15</text>
<line x1="20" y1="160" x2="98" y2="160" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar54)"/>
<text x="20" y="150" font-size="12">index 9</text>
<text x="150" y="262" text-anchor="middle" font-size="12">only line 2 is loaded:</text>
<text x="150" y="280" text-anchor="middle" font-size="12">the cache records "8 to 11"</text>
<rect x="420" y="35" width="100" height="200" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="85" x2="520" y2="85" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="135" x2="520" y2="135" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="185" x2="520" y2="185" stroke="currentColor" stroke-width="1.4"/>
<rect x="420" y="35" width="100" height="200" fill="currentColor" opacity="0.12"/>
<text x="470" y="65" text-anchor="middle" font-size="12">line 0: 0-3</text>
<text x="470" y="115" text-anchor="middle" font-size="12">line 1: 4-7</text>
<text x="470" y="165" text-anchor="middle" font-size="12">line 2: 8-11</text>
<text x="470" y="215" text-anchor="middle" font-size="12">line 3: 12-15</text>
<line x1="522" y1="60" x2="580" y2="130" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar54)"/>
<line x1="522" y1="110" x2="580" y2="135" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar54)"/>
<line x1="522" y1="160" x2="580" y2="140" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar54)"/>
<line x1="522" y1="210" x2="580" y2="145" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar54)"/>
<text x="600" y="132" text-anchor="middle" font-size="12">AND</text>
<text x="600" y="148" text-anchor="middle" font-size="12">mask,</text>
<text x="600" y="164" text-anchor="middle" font-size="12">OR</text>
<text x="470" y="262" text-anchor="middle" font-size="12">every entry is read:</text>
<text x="470" y="280" text-anchor="middle" font-size="12">the cache records "all of it"</text>
</svg>
<figcaption>Figure 5.4. Lookup by index against lookup by scanning, for a 16-entry table spread over four cache lines. Touching every line is necessary but, as CacheBleed showed, reading every entry of every line is what removes the leak.</figcaption>
</figure>

**"Every cache line" is not enough.** A tempting shortcut is to touch every cache
line but read the wanted entry only: the cache state is then the same whatever the
index, and the code is faster than a full scan. OpenSSL did something close to this
for the window table of its RSA exponentiation. After Colin Percival showed in 2005
that a second hyper-thread could see which table entries RSA read, OpenSSL's
constant-time exponentiation stored the table "scattered": byte $j$ of every entry sat in the same cache line, so
reading any one entry touched every line. In 2016 Yuval Yarom, Daniel Genkin and Nadia
Heninger showed that this was not enough. A cache line on Intel's Sandy Bridge is
split into **banks**, and two hyper-threads reading the same bank at the same moment
slow each other down. Which bank inside the line was read gave away which entry was
wanted. They recovered 4096-bit RSA keys from about 16,000 decryptions. OpenSSL's fix
(1.0.2g, March 2016) was the full scan with masks: read every byte of every entry,
keep the wanted one.

!!! note "Life story: CacheBleed"
    **Born:** 2016, Yuval Yarom, Daniel Genkin and Nadia Heninger (CHES 2016),
    CVE-2016-0702 · **Purpose:** to show that cache-line granularity is not the
    attacker's limit, by reading cache-bank conflicts between hyper-threads on Intel
    Sandy Bridge and recovering RSA keys from OpenSSL's "scatter-gather" window table ·
    **Helped:** OpenSSL 1.0.2g replaced scatter-gather with a full masked scan; the
    leak model hardened from "no secret cache lines" to "no secret addresses at all" ·
    **Status:** the bank conflicts it used were removed in later Intel
    microarchitectures; the lesson, that the attacker's granularity keeps getting
    finer, was confirmed by MemJam (2018), which used 4K aliasing to see addresses
    inside a cache line

**What to do.**

1. Never index a table, an array or a pointer with a secret. That includes `switch`
   statements on secrets, which compilers turn into jump tables.
2. Small tables: scan them fully with masks. Large tables: change the algorithm
   (compute instead of looking up, §5.6) or use hardware instructions (AES-NI, Arm's
   AES instructions, carry-less multiply for GHASH).
3. Do not rely on cache-line tricks, prefetching or "the table fits in L1": each has
   been broken.

## 5.6 Computing instead of looking up: a lookup-free S-box

*Level: intermediate.*

AES needs an S-box with 256 entries, and scanning it for each of the 160 S-box
applications per block is far too slow. The other way out is to remember what the
table is. The AES S-box is not arbitrary: it is the inverse in the field
$\mathrm{GF}(2^8)$, followed by a fixed affine map (book 1,
[Chapter 7](../../book/07-AES.md)). Both can be computed with ANDs, XORs and shifts on
the input byte, with no memory access that depends on it.

**Multiplication without branches.** Field elements are bytes; adding is XOR;
multiplying is polynomial multiplication modulo $x^8 + x^4 + x^3 + x + 1$. The
textbook loop says "if the low bit of $b$ is set, add $a$; if the top bit of $a$ is
set, reduce". Both "if"s become masks:

$$
r \leftarrow r \oplus \big(a \mathbin{\&} -(b \mathbin{\&} 1)\big), \qquad
a \leftarrow (a \ll 1) \oplus \big(\texttt{0x1B} \mathbin{\&} -(a \gg 7)\big),
$$

repeated exactly eight times, whatever $a$ and $b$ are.

**By hand.** FIPS 197's own example: $\{57\} \cdot \{13\}$. Doubling $\{57\}$
repeatedly ("xtime") gives $\{57\}, \{ae\}, \{47\}, \{8e\}, \{07\}$ for
$x^0, \dots, x^4$ (at $\{ae\} \to \{47\}$ the top bit was set, so $\{1b\}$ was XORed
in). Since $\{13\} = x^4 + x + 1$, the product is
$\{57\} \oplus \{ae\} \oplus \{07\} = \{fe\}$. The branch-free loop computes exactly
this, but also computes the terms for the zero bits of $\{13\}$ and throws them away
with a zero mask.

**Inversion without branches.** The nonzero elements of $\mathrm{GF}(2^8)$ form a
group of order 255, so $x^{255} = 1$ and $x^{-1} = x^{254}$ for every $x \neq 0$; and
$0^{254} = 0$, which is the value AES assigns to "the inverse of 0". So inversion is a
fixed power, computed by a fixed **addition chain**: $x^2$, $x^3$, $x^6$, $x^{12}$, $x^{15}$, $x^{30}$, $x^{60}$, $x^{120}$, $x^{240}$, $x^{252}$, $x^{254}$, eleven multiplications, the same
eleven for every input. (The same idea computes inverses modulo a prime $p$ as
$a^{p-2}$ in elliptic-curve code; see
[Mathematics, Chapter 4](../mathematics/04-Powers-and-Primitive-Roots.md).)

**Code it.** The S-box computed, checked against the usual table on all 256 inputs:

```python
def gf_mul(a, b):              # multiply in GF(2^8) mod x^8+x^4+x^3+x+1, no branches
    r = 0
    for _ in range(8):         # always eight rounds, whatever a and b are
        r ^= a & -(b & 1)      # add a if the low bit of b is set (mask all ones or 0)
        a = ((a << 1) ^ (0x1B & -(a >> 7))) & 0xFF   # times x, reduce if the top bit was set
        b >>= 1
    return r

def gf_inv(x):                 # x^254 = x^-1 (and 0 -> 0), a fixed chain of 11 products
    x2 = gf_mul(x, x)
    x3 = gf_mul(x2, x)
    x6 = gf_mul(x3, x3)
    x12 = gf_mul(x6, x6)
    x15 = gf_mul(x12, x3)
    x30 = gf_mul(x15, x15)
    x60 = gf_mul(x30, x30)
    x120 = gf_mul(x60, x60)
    x240 = gf_mul(x120, x120)
    x252 = gf_mul(x240, x12)
    return gf_mul(x252, x2)

def rotl8(v, n):
    return ((v << n) | (v >> (8 - n))) & 0xFF

def sbox_computed(x):          # the AES S-box with no table at all
    b = gf_inv(x)
    return b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63

# The usual table, built the usual way (log and antilog tables), to check against.
def build_table():
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
    table = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        table.append(b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63)
    return table

SBOX = build_table()
print("{57}.{13} =", hex(gf_mul(0x57, 0x13)), "  {53}^-1 =", hex(gf_inv(0x53)))
print("S(0x00), S(0x53):", hex(sbox_computed(0x00)), hex(sbox_computed(0x53)))
print("all 256 match the table:", all(sbox_computed(x) == SBOX[x] for x in range(256)))
```

It prints:

```
{57}.{13} = 0xfe   {53}^-1 = 0xca
S(0x00), S(0x53): 0x63 0xed
all 256 match the table: True
```

The checking code builds its table with log and antilog lookups and an `if`: that is
fine, it is the reference, run on public values. The function under test,
`sbox_computed`, has no branch and no index that depends on `x`. ($\{53\}^{-1} =
\{ca\}$ and $S(\{53\}) = \{ed\}$ are the worked values in FIPS 197.)

This version does 88 shift-and-mask steps for one byte, which is slow. Real code goes
one step further.

**Bitslicing.** Eli Biham introduced the idea for DES in 1997: instead of storing one
byte per variable, store **one bit position of many bytes** per variable. With 64-bit
words, word $i$ holds bit $i$ of 64 different S-box inputs. The S-box becomes a
Boolean circuit of ANDs and XORs on whole words, and each instruction computes that
gate for 64 inputs at once. There are no table lookups and no data-dependent anything:
a circuit has no branches. Emilia Käsper and Peter Schwabe's bitsliced AES (CHES 2009)
made this fast enough to replace table-based AES on processors without AES
instructions, and Joan Boyar and René Peralta's minimized circuits (2010 to 2012, a
little over 110 gates for the whole S-box) are what bitsliced AES code uses today.

**Code it.** The same field arithmetic as above, but on bit planes: `bs_mul`
multiplies 64 pairs of field elements at once with 64 ANDs and about 80 XORs, written
as the schoolbook product followed by reduction with $x^8 = x^4 + x^3 + x + 1$:

```python
import secrets

LANES = 64
ALL = (1 << LANES) - 1

def to_planes(values):         # 64 bytes -> 8 words; word i holds bit i of every byte
    return [sum(((v >> i) & 1) << j for j, v in enumerate(values)) for i in range(8)]

def from_planes(planes):
    return [sum(((planes[i] >> j) & 1) << i for i in range(8)) for j in range(LANES)]

def bs_mul(a, b):              # 64 multiplications in GF(2^8) at once, ANDs and XORs only
    c = [0] * 15
    for i in range(8):
        for j in range(8):
            c[i + j] ^= a[i] & b[j]
    for k in range(14, 7, -1): # x^8 = x^4 + x^3 + x + 1
        c[k - 4] ^= c[k]
        c[k - 5] ^= c[k]
        c[k - 7] ^= c[k]
        c[k - 8] ^= c[k]
    return c[:8]

def bs_sbox(x):
    x2 = bs_mul(x, x); x3 = bs_mul(x2, x); x6 = bs_mul(x3, x3); x12 = bs_mul(x6, x6)
    x15 = bs_mul(x12, x3); x30 = bs_mul(x15, x15); x60 = bs_mul(x30, x30)
    x120 = bs_mul(x60, x60); x240 = bs_mul(x120, x120); x252 = bs_mul(x240, x12)
    b = bs_mul(x252, x2)
    out = []
    for i in range(8):         # the affine step; the constant 0x63 is public
        s = b[i] ^ b[(i + 4) % 8] ^ b[(i + 5) % 8] ^ b[(i + 6) % 8] ^ b[(i + 7) % 8]
        out.append(s ^ ALL if (0x63 >> i) & 1 else s)
    return out

def rotl8(v, n):
    return ((v << n) | (v >> (8 - n))) & 0xFF

def build_table():
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
    table = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        table.append(b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63)
    return table

SBOX = build_table()
ok = True
for start in range(0, 256, LANES):     # all 256 inputs, 64 at a time
    batch = list(range(start, start + LANES))
    ok &= from_planes(bs_sbox(to_planes(batch))) == [SBOX[v] for v in batch]
rand = list(secrets.token_bytes(LANES))
ok &= from_planes(bs_sbox(to_planes(rand))) == [SBOX[v] for v in rand]
print("bitsliced S-box matches on all 256 inputs and 64 random ones:", ok)
```

It prints:

```
bitsliced S-box matches on all 256 inputs and 64 random ones: True
```

The `if (0x63 >> i) & 1` in the affine step branches on the bits of a public constant,
not on data; in C it would be written out as eight fixed lines. `to_planes` and
`from_planes` are the transposition that real bitsliced code does with a few dozen
shifts and masks (a "bit-matrix transpose"); here they are written for clarity.

**Hardware does it better.** Since Intel's Westmere processors (2010), x86 has had
AES-NI, instructions that do a whole AES round in a fixed number of cycles with no
memory access; Armv8 has AESE and AESD, and most server, desktop and phone processors
now have one or the other. On those machines, table-free AES is also the fastest AES.
Bitslicing still matters for the many small processors without them, and for
primitives with no hardware support. And the lesson carries over to design: ciphers
chosen since 2010 (ChaCha20, the Keccak permutation of SHA-3, Ascon, the lightweight
standard of SP 800-232) use only additions, rotations, XORs and small Boolean
functions, so the natural implementation is already constant time.

**What to do.**

1. On processors with AES instructions, use them; every major library does by default.
2. Where AES must run without them, use a bitsliced implementation (BearSSL's
   `aes_ct` and `aes_ct64` are examples), never a T-table one.
3. Prefer primitives built from add, rotate and XOR (ChaCha20-Poly1305) on small
   devices without AES hardware.

## 5.7 Variable-time instructions

*Level: intermediate.*

The third rule of the leak model is the one programmers forget, because it is
invisible in the source: a single `/` or `*` can take a different number of cycles
depending on the values it is given. Processors do this to be fast on the common case,
and nobody documents it as a security property. What is known comes from measurement
(Agner Fog's instruction tables, Thomas Pornin's survey for BearSSL) and from the
lists that Arm and Intel now publish of the instructions they promise **not** to vary
(§5.10).

**Division.** Integer division is variable time on almost every processor that has a
divide instruction. On x86, the latency of `DIV` and `IDIV` depends on the size of the
operands on most Intel and AMD cores; on the Arm Cortex-M3 and Cortex-M4, `UDIV` and
`SDIV` take 2 to 12 cycles depending on the operands; on many Cortex-A cores it also
varies. Any `/` or `%` whose dividend or divisor is secret is therefore a leak, and so
is a library call that does one: big-number division, `printf("%d")` of a secret,
encoding a private key in decimal or Base58 (which divides the key by 10 or 58 again
and again).

Compilers usually replace division by a **constant** with a multiplication and a
shift, which is why the danger hides so well: the same source is safe at `-O2` on one
target and leaks at `-Os` on another, or on a processor without a fast multiplier.
That is what happened in **KyberSlash** (December 2023): the reference code of Kyber,
the scheme that became ML-KEM, computed `(2x + q/2) / q` on secret coefficients, some
compiler settings and targets kept the real division, and the time it took on a
Raspberry Pi 2's Cortex-A7 and on a Cortex-M4 was enough to recover keys in minutes to
hours. The fix wrote a multiplication and a shift into the source (multiply
$2x + 1665$ by $80635 \approx 2^{28}/q$, shift right by 28), so that no compiler could
choose division. The story, the
measurements and the fix in code are in
[Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).

**Fix it.** The general recipe for a public divisor $d$ and a secret dividend $x$ of
known size: find $m = \lceil 2^k / d \rceil$ for a shift $k$ large enough that
$\lfloor x m / 2^k \rfloor = \lfloor x / d \rfloor$ for every possible $x$, and check
that claim exhaustively when the input range allows it, as here for 16-bit inputs and
$d = 58$:

```python
D = 58                       # the divisor is public; the dividend x is secret
BITS = 16                    # x is any 16-bit value

def find_magic(d, bits):
    """Smallest shift k, and m = ceil(2^k / d), with (x * m) >> k == x // d for all x."""
    for k in range(bits, 2 * bits + 2):
        m = -(-(1 << k) // d)                 # ceiling division, done once, on public values
        if all((x * m) >> k == x // d for x in range(1 << bits)):
            return m, k

m, k = find_magic(D, BITS)
print(f"x // {D} == (x * {m}) >> {k} for every {BITS}-bit x")

def divmod58(x):             # what the constant-time code computes: a multiply and a shift
    q = (x * m) >> k
    return q, x - q * D

print(divmod58(40000), divmod(40000, D))
```

It prints:

```
x // 58 == (x * 18079) >> 20 for every 16-bit x
(689, 38) (689, 38)
```

The search itself uses `//` freely; it runs once, at design time, on public numbers.
The constant-time code is `divmod58`: one multiplication of a 16-bit value by a 15-bit
constant, which fits in 32 bits, one shift, one multiply-subtract. Torbjörn Granlund
and Peter Montgomery worked out the general theory of these "magic numbers" in 1994;
the Barrett reduction of [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) is the
same idea for big numbers and a divisor that is a modulus.

**Multiplication.** On modern 64-bit desktop and server processors, integer
multiplication takes a fixed number of cycles. On smaller cores it does not always.
The Arm Cortex-M3 finishes its 32 × 32 → 64-bit multiplies (`UMULL`, `SMULL`,
`UMLAL`, `SMLAL`) early when the operands are small: Arm documents 3 to 5 cycles for
`UMULL` and `SMULL` and 4 to 7 for the accumulating forms, and
Pornin's measurements for BearSSL found the behavior did not even match the
documentation, so no simple operand trick makes them safe. Older Arm cores such as
the ARM7TDMI and ARM9 terminate multiplies early too, and so did some PowerPC
processors. BearSSL answers with an alternative big-integer representation, "i15",
that uses 15-bit limbs and only 32-bit-result multiplies, which are constant time on
the M3. A library that targets microcontrollers needs this kind of per-core
knowledge, and a library that does not should say which cores it has checked.

**Floating point.** Operations on **subnormal** numbers, the tiny values just above
zero, take tens to over a hundred cycles more than normal ones on many x86 processors,
because they are handled by microcode. Marc Andrysco and co-authors showed in 2015
that this let a web page read pixels across origins in Firefox through the time of
SVG filters. Cryptographic code rarely uses floating point, but some does: Falcon (FN-DSA)
does its Gaussian sampling and FFT in floating point, which is one reason its
implementations are hard ([Post-quantum, Chapter 10](../post-quantum/10-NTRU-Falcon-and-FN-DSA.md)).

**Other instructions to know.** Shifts and rotations by a variable amount are fixed
time on current mainstream cores but were not on some older or embedded ones.
Instructions that stop early by design, such as x86's `REPE CMPSB` (which, like
`memcmp`, stops at the first mismatch), are best kept away from secrets.
Loads and stores are fixed time with respect to the **data** they move, but not to
their **address**, which is rule 2 again. And a conditional move (`CMOV` on x86, `CSEL`
on Arm) is on both vendors' lists of data-independent instructions (§5.10), which is
why compilers and libraries lean on it for `select`.

**What to do.**

1. No `/` or `%` on secrets. Replace division by a public constant with a multiply and
   shift written in the source, verified exhaustively; replace reduction by a secret
   modulus with Montgomery or Barrett arithmetic ([Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)).
2. On microcontrollers, check which multiplies are constant time for your exact core,
   and pick a library that documents it.
3. No floating point on secrets.
4. Grep the compiled code, not only the source, for divide instructions (`div`,
   `idiv`, `udiv`, `sdiv`) in functions that handle secrets; TIMECOP-style tools in
   §5.11 do this automatically.

## 5.8 The compiler as adversary

*Level: intermediate.*

A C compiler is bound by one rule, the **as-if rule**: the program must behave as if
the source were executed literally, where "behave" means the values it computes and
its input and output. Time is not behavior. Nor is which instructions run, or which
memory is touched. The compiler knows nothing about which values are secret, and every
transformation that keeps the values right is allowed, including ones that undo
everything in §5.3 to §5.6:

- **Turning a mask back into a branch.** A compiler that sees
  `(a & -bit) | (b & ~-bit)` can recognize "bit ? a : b", and then choose between a
  conditional move and a branch on its own cost model. LLVM has a pass on x86 that
  converts `CMOV` instructions into branches when it predicts the branch is cheap.
- **Recognizing the comparison.** `1 & ((d - 1) >> 8)` is "d == 0" for a byte, and a
  compiler that knows `d` is a byte can rewrite it as a compare and a branch.
- **Exiting a loop early.** In the OR-of-XORs loop, once `d` has every bit set, further
  iterations cannot change the result. Nothing forbids a compiler from noticing.
- **Seeing through function boundaries.** Link-time optimization inlines helpers across
  files, so "put the select in another file" stops working the day someone turns LTO on.
- **Removing "useless" work.** A dummy operation, a wipe of a key buffer before it is
  freed, a second computation for fault checking: if the result is never used, it
  can be deleted ([Chapter 8](08-Hostile-Input.md) has the wiping side).

These are not hypothetical. In June 2024 Antoon Purnal showed that Clang versions 15 to
18 on x86, at several common optimization levels, compiled the mask in the ML-KEM
reference code's `poly_frommsg` back into a conditional branch on a bit of the
decrypted message, which during decapsulation is a secret. Measured through the
re-encryption check, that branch recovered an ML-KEM-512 key in minutes. He named it
**clangover** (CVE-2024-37880); it was fixed by hiding the mask from the optimizer with
a value barrier. The code and the attack are in
[Post-quantum §17.4](../post-quantum/17-Implementing-Post-Quantum-Safely.md); the
lesson here is general. Lesly-Ann Daniel, Sébastien Bardin and Tamara Rezk's Binsec/Rel
study (2020) found the same kind of thing when they checked compiled binaries of
source code that was constant time: the compiler, flags and target decided whether the
binary still was.

**Value barriers.** The standard defense is to make a value opaque to the optimizer at
the one place where it would otherwise reason about it. In GCC and Clang an empty
inline-assembly statement does it: the compiler must assume the assembly may have
changed the register, so it can no longer prove the value is 0 or 1 and cannot rewrite
the select. BoringSSL's version:

```c
static inline crypto_word_t value_barrier_w(crypto_word_t a)
{
#if defined(__GNUC__) || defined(__clang__)
    __asm__("" : "+r"(a) : /* no inputs */);
#endif
    return a;
}

static inline crypto_word_t constant_time_select_w(crypto_word_t mask,
                                                   crypto_word_t a, crypto_word_t b)
{
    /* The barrier stops the compiler from seeing that mask is all-or-nothing,
       which is the fact it would need to turn this into a branch. */
    mask = value_barrier_w(mask);
    return (mask & a) | (~mask & b);
}
```

The barrier emits no instruction; it only blocks reasoning. Other forms: reading the
mask through a `volatile` variable (the Kyber reference fix and libsodium have used
variants), which costs a memory access; Rust's `subtle` crate, whose `Choice` type
passes every condition through an optimization barrier; Go's `crypto/subtle`, whose
functions are written to avoid patterns the Go compiler would branch on and are
checked in its tests. None of these is a promise from the language. In late 2025 Trail
of Bits announced `__builtin_ct_select` for Clang, backed by an LLVM intrinsic that the
back end must lower to `CMOV`, `CSEL` or masked arithmetic, never a branch: the first
attempt to make constant-time selection part of a mainstream compiler's contract rather
than a trick against it. (Which LLVM release carries it is worth checking before you
rely on it.)

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="From source code to the observer: four layers where constant time can be lost, with the tool that checks each layer" fill="currentColor" font-size="14">
<defs><marker id="ar55" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="130" y="20" text-anchor="middle" font-weight="bold">layer</text>
<text x="345" y="20" text-anchor="middle" font-weight="bold">how it is lost</text>
<text x="545" y="20" text-anchor="middle" font-weight="bold">checked by</text>
<rect x="40" y="32" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="62" text-anchor="middle">source (C, Rust)</text>
<text x="345" y="55" text-anchor="middle" font-size="12">if, index, / on a secret</text>
<text x="345" y="71" text-anchor="middle" font-size="12">written by a person</text>
<text x="545" y="62" text-anchor="middle" font-size="12">review, ct-verif (LLVM IR)</text>
<rect x="40" y="112" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="142" text-anchor="middle">compiler</text>
<text x="345" y="135" text-anchor="middle" font-size="12">mask turned into a branch</text>
<text x="345" y="151" text-anchor="middle" font-size="12">(clangover, 2024)</text>
<text x="545" y="142" text-anchor="middle" font-size="12">Binsec/Rel (binary)</text>
<rect x="40" y="192" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="222" text-anchor="middle">machine code run</text>
<text x="345" y="215" text-anchor="middle" font-size="12">branch or address taken</text>
<text x="345" y="231" text-anchor="middle" font-size="12">on this input</text>
<text x="545" y="222" text-anchor="middle" font-size="12">ctgrind, TIMECOP</text>
<rect x="40" y="272" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="302" text-anchor="middle">processor</text>
<text x="345" y="295" text-anchor="middle" font-size="12">variable-time DIV (KyberSlash),</text>
<text x="345" y="311" text-anchor="middle" font-size="12">prefetcher (GoFetch)</text>
<text x="545" y="302" text-anchor="middle" font-size="12">dudect, DIT / DOIT</text>
<line x1="130" y1="82" x2="130" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar55)"/>
<line x1="130" y1="162" x2="130" y2="190" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar55)"/>
<line x1="130" y1="242" x2="130" y2="270" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar55)"/>
<line x1="450" y1="32" x2="450" y2="322" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>
</svg>
<figcaption>Figure 5.5. Constant time is a property of the last layer, but it is written at the first. Each layer can lose it, and each has its own kind of check; no single tool covers all four.</figcaption>
</figure>

**Other defenses.** Some libraries take the compiler out of the loop for the most
sensitive code: OpenSSL's hand-written assembly (generated from Perl scripts per
platform); the Jasmin language (2017), whose compiler is designed to preserve
constant time and comes with a checker for it, used for the libjade library; and code generated from verified sources,
such as Fiat-Crypto's field arithmetic in BoringSSL and HACL\* in Firefox and the Linux
kernel, whose generated C is restricted to operations that are constant time on the
platforms they target ([Chapter 17](17-Choosing-Testing-and-Verifying.md)). For
everything else there is one rule: check the binary you ship, built with the compiler
and flags you ship it with, on every change. §5.11 and §5.12 show how.

**What to do.**

1. Put a value barrier on every mask at the point where it is used to select, swap or
   look up, and use your library's helper rather than an open-coded expression.
2. Treat a compiler upgrade, a change of optimization level and turning on LTO as
   changes to your cryptographic code, and rerun the checks of §5.11 and §5.12.
3. Read the assembly of the few functions that matter (the comparison, the select, the
   ladder step): `objdump -d` and a search for conditional jumps takes minutes.

## 5.9 Why Python cannot be constant time, and what it is still for

*Level: intermediate.*

Every Python block in this chapter has the **shape** of constant-time code: the same
masks, the same full scans, the same fixed loops as the C. None of them is constant
time, and nothing written in pure Python can be. The reasons are worth knowing,
because they apply in some measure to every high-level language.

**Integers are as big as their values.** A Python `int` is a variable-length array of
30-bit digits, allocated for each result, with leading zero digits removed. So
`x & 0` returns the small cached object `0`, while `x & mask` with an all-ones mask
allocates and fills an object as long as `x`; adding two numbers costs time in
proportion to their length; and the length of a secret number (how many leading zero
bits it has) shows in the time of everything done with it. The small integers
from $-5$ to 256 are shared objects that are never allocated at all. Since Python 3.12
the interpreter also has fast paths for "compact" integers that fit in one digit, so
small and large values take different code paths through the interpreter itself.

**`pow` skips zeros.** Built-in `pow(g, e, m)` uses a sliding-window method that does
work only for the nonzero windows of the exponent, so its time depends on the
exponent's bits. That is fine for a public exponent and a leak for a private one.

**The interpreter branches everywhere.** Each `^`, `&` or `|` in Python is a call that
checks the types of its operands, picks a fast or slow path, adjusts reference counts,
and may allocate memory and trigger the garbage collector. Python's `and` and `or`
short-circuit, which makes them branches. `==` on `bytes` checks the length, then the
first byte, then calls `memcmp` (in CPython today).

**Code it.** Two measurements, one for each of the first two points:

```python
import secrets, statistics, time

def median_ns(f, runs):
    out = []
    for _ in range(runs):
        t0 = time.perf_counter_ns()
        f()
        out.append(time.perf_counter_ns() - t0)
    return statistics.median(out)

# 1. pow() with a secret exponent: the time follows the exponent's bits.
m = secrets.randbits(2048) | (1 << 2047) | 1        # an odd 2048-bit modulus
g = secrets.randbelow(m)
light = (1 << 2047) | 1                              # 2048 bits long, 2 bits set
heavy = (1 << 2048) - 1                              # 2048 bits long, all set
print("pow, 2 exponent bits set:   ", median_ns(lambda: pow(g, light, m), 31), "ns")
print("pow, 2048 exponent bits set:", median_ns(lambda: pow(g, heavy, m), 31), "ns")

# 2. The mask trick itself: an int is as long as its value.
x = secrets.randbits(4096)
none, every = 0, (1 << 4096) - 1
print("x & 0:     ", median_ns(lambda: x & none, 20001), "ns, result", (x & none).__sizeof__(), "bytes")
print("x & 1...1: ", median_ns(lambda: x & every, 20001), "ns, result", (x & every).__sizeof__(), "bytes")
```

The times differ from machine to machine; one run (Python 3.13, Linux) printed:

```
pow, 2 exponent bits set:    16061281 ns
pow, 2048 exponent bits set: 19974969 ns
x & 0:      78 ns, result 28 bytes
x & 1...1:  93 ns, result 572 bytes
```

The two exponents have the same length, so the 2,047 squarings are the same; the
four milliseconds of difference are the multiplications for the nonzero windows,
which an attacker who can time many signatures turns into the Hamming weight of the
key, and with a cache attack on the window table, into the key itself. The second pair
shows the branch-free `select` of §5.4 leaking in Python: the mask is all ones or all
zeros, exactly the secret it was meant to hide, and the result object is 28 or 572
bytes long.

**What Python code is still good for.** Quite a lot, as long as it is honest about
what it is:

1. **Showing the shape of the C.** The constant-time algorithm is the same in any
   language; Python makes it short enough to read, run and change. When you port it,
   the structure (masks, fixed loops, full scans) carries over line by line.
2. **Being the reference.** Exhaustive checks like those in §5.4, §5.6 and §5.7 are
   how branch-free tricks are validated, and they are easiest to write in a language
   with big integers and no overflow.
3. **Measuring.** The test harness of §5.12 is Python, and it can drive C code just as
   well (through `ctypes` or a subprocess) as Python code. dudect itself is a small
   harness; the statistics are the same in any language.
4. **Using the C that is already there.** In production Python, the constant-time code
   is in C: `hmac.compare_digest`, `hashlib`, `hmac`, `ssl`, and the OpenSSL or
   libsodium bindings that packages like `cryptography` and PyNaCl provide. Python code
   that calls those, and never does arithmetic on keys itself, inherits their
   properties, with one condition: it must not leak the secrets on its own, by
   comparing tokens with `==`, by branching on a decrypted value before it is
   authenticated, or by building a lookup table indexed by key bytes.

The same is true of JavaScript, Ruby, Java and the rest to varying degrees: the
runtime's numbers, allocator and just-in-time compiler are outside your control.
Java and .NET, whose JIT compilers make the same as-if bargain as C compilers, have
the extra problem that the code is recompiled while it runs. Constant-time code in
those languages lives in carefully written intrinsics or native libraries.

## 5.10 Help from the processor: Arm DIT and Intel DOIT

*Level: intermediate.*

For thirty years constant-time programmers relied on folklore: measurements and
manuals that said, in effect, "on this core, `ADD` happens to take one cycle whatever
its inputs". Nothing promised that the next core would behave the same, and as
processors added more data-dependent tricks (zero-skipping multipliers, value
prediction, data-dependent prefetchers), the folklore grew riskier. Both main
architectures now offer a switch that turns folklore into a documented promise.

**Arm DIT.** Armv8.4-A, announced in 2017, added **Data Independent Timing**
(FEAT_DIT), mandatory from that version on. It is a bit in the processor state,
`PSTATE.DIT`, that a program sets with one instruction (`MSR DIT, #1`) and clears
when it is done. While it is set, Arm guarantees that the timing of a listed set of
instructions does not depend on the values of their data operands: most integer
arithmetic and logic, shifts, conditional selects, and the data (not the address) of
loads and stores. Without it, the architecture says nothing. The bit is per thread, so
the operating system saves and restores it on context switches. Apple's processors
from the M1 on implement it, and Apple's developer documentation asks cryptographic
code to enable it; Go 1.24 (February 2025) added `crypto/subtle.WithDataIndependentTiming`,
which runs a function with DIT set on arm64 and does nothing elsewhere.

**Intel DOIT.** In 2022 Intel published **Data Operand Independent Timing** guidance.
It lists instructions whose timing is independent of their data operands, and it
said something new: on processors from Ice Lake (client) and Gracemont (Atom) onward,
that independence is guaranteed only when software sets the DOITM bit in a
model-specific register, `IA32_UARCH_MISC_CTL`. For older processors, Intel says the
listed instructions can be assumed to behave that way already. Because the register
can be written only by the operating system, user programs cannot turn the mode on
themselves. In January 2023 Eric Biggers proposed that Linux enable it at boot for
every process; the debate on the kernel list turned on cost (Intel's guidance warns the
mode may disable data-dependent prefetching) and on whether to enable it per process
instead. Whether your kernel and processor run with it on is something to check, not
to assume.

What both switches have in common is what they leave out. They cover the third rule
of the leak model, operand-dependent timing, for a listed set of instructions. They do
nothing about rules 1 and 2: a branch on a secret, or a table indexed by one, leaks
with DIT set just as without it. Go's documentation says it plainly: the function
"does not make variable-time code constant-time".

!!! note "Life story: Arm DIT and Intel DOIT"
    **Born:** Arm's FEAT_DIT in Armv8.4-A (2017); Intel's Data Operand Independent
    Timing guidance and DOITM mode bit (2022) · **Purpose:** to make the timing of a
    documented set of instructions independent of their data, as an architectural
    promise instead of an observation about one core · **Helped:** Apple's guidance to
    enable DIT for cryptography, Go 1.24's `WithDataIndependentTiming`, PuTTY and
    other programs that set DIT around their cryptographic code; on Apple M3, setting
    DIT also turns off the data-dependent prefetcher that GoFetch abused · **Status:**
    current; DIT is easy to use from user space, DOITM needs the operating system, and
    neither excuses a branch or an index on a secret

**When the processor looks at your data.** The case that showed why these switches
matter is the **data memory-dependent prefetcher** (DMP). A DMP looks at the values
loaded from memory, and if a value looks like a pointer, it fetches the memory it
points to, in the hope that the program will soon follow it. That breaks the leak
model at its root: the model says data values do not reach the cache, and a DMP puts
them there. Researchers first described Apple's DMP in 2022 (Augury). In March 2024
**GoFetch** (Boru Chen, Yingchen Wang and five colleagues) used it against constant-time
code on Apple M1: by choosing inputs so that an intermediate value inside a
constant-time computation looked like a pointer only for certain key bits, they
recovered keys from Go's RSA, OpenSSL's Diffie-Hellman, and the CRYSTALS-Kyber and
CRYSTALS-Dilithium reference implementations. The code had no secret branches and no
secret addresses; the processor had made one. On the M3, setting DIT disables the DMP;
on the M1 and M2 it does not, and the defenses there are running cryptography on the
efficiency cores, which lack it, or blinding the inputs so that the attacker can no
longer choose which intermediate values look like pointers.

!!! note "Life story: GoFetch"
    **Born:** disclosed to Apple 5 December 2023, published 21 March 2024 by Boru
    Chen, Yingchen Wang, Pradyumna Shome, Christopher Fletcher, David Kohlbrenner,
    Riccardo Paccagnella and Daniel Genkin, building on the 2022 Augury work · **Purpose:** to show that a data memory-dependent
    prefetcher breaks constant-time code by turning data values into cache accesses ·
    **Helped:** made DIT (on M3) and DOITM part of the constant-time checklist, and
    pushed libraries to treat the leak model as something the hardware must also sign up
    to · **Status:** cannot be patched in M1 and M2 hardware; mitigated in software by
    core selection, input blinding and DIT where it applies

A second break of the model, **Hertzbleed** (2022), went through power: modern
processors raise and lower their clock frequency according to the power they draw,
power depends on the data, so the time of constant-time code depends on the data
after all. Its authors recovered keys from an implementation of the post-quantum
scheme SIKE remotely. It is told in book 1, [§18.6](../../book/18-Side-Channels.md)
and [Cryptanalysis §17.14](../cryptanalysis/17-Side-Channels-the-Attackers-View.md);
the defender's answer is the same as for power analysis, masking, plus the observation
that a leak that needs thousands of hours of remote measurement is less urgent than one
that needs a cache.

**What to do.**

1. On arm64, run cryptographic code with DIT set (Go: `WithDataIndependentTiming`;
   C: `MSR DIT, #1` and restore afterwards; many libraries now do it for you).
2. On Intel, find out whether your operating system enables DOITM; for a
   high-assurance service on Ice Lake or later, ask for it.
3. Remember what the switches do not cover: they fix instruction timing only.

## 5.11 Checking the code: taint tracking

*Level: intermediate.*

Constant time is a property of the machine code, and nobody reads all the machine
code. Tools do, in three families that answer different questions. **Taint
tracking** runs the code and watches whether any branch or address depends on data
marked secret; it is exact for the paths it runs and blind to the paths it does not.
**Statistical testing** runs the code and times it on two classes of inputs; it sees
everything the processor does, including variable-time instructions and
microarchitectural surprises, but only as far as its statistics reach. **Formal
verification** proves, for every input, that no secret reaches a branch or address;
it is complete for its model of the machine and says nothing outside it.

**Taint tracking with Valgrind.** In April 2010 Adam Langley noticed that the tool
every C programmer already had, Valgrind's memcheck, almost does the job. Memcheck
tracks, for every bit of memory and every register, whether it has been initialized,
and it complains when a program branches on, or computes an address from,
uninitialized data. Those are exactly the two things constant-time code must not do
with secrets. So: tell memcheck the key is "uninitialized", run the code, and every
complaint is a secret-dependent branch or address. Langley's first version, **ctgrind**,
was a small patch to Valgrind; it soon turned out that memcheck's own client requests
were enough, and the trick needs no patch at all:

```c
#include <valgrind/memcheck.h>

uint8_t key[32], msg[64], tag[32];
/* ... fill key and msg ... */
VALGRIND_MAKE_MEM_UNDEFINED(key, sizeof key);   /* mark the key secret */
hmac_sha256(tag, key, sizeof key, msg, sizeof msg);
VALGRIND_MAKE_MEM_DEFINED(tag, sizeof tag);     /* declassify the output on purpose */
/* valgrind ./test now reports
   "Conditional jump or move depends on uninitialised value(s)" for each secret branch,
   "Use of uninitialised value of size 8" for each secret address. */
```

BoringSSL builds its test suite this way in a dedicated configuration, with macros
`CONSTTIME_SECRET` and `CONSTTIME_DECLASSIFY` around the two calls; Moritz Neikes's
**TIMECOP** (2020) packaged the same approach for the SUPERCOP benchmarking suite,
where Daniel Bernstein added a modified version in August 2020 that marks all random
output as secret automatically; the KyberSlash authors extended Valgrind further to
flag divisions on secret data. Bernstein's own warning applies to all of them: passing
says the paths you ran were clean, not that the code is constant time.

**Code it.** A toy version of the idea in Python. Python asks an object's `__bool__`
method at every `if` and `while`, and its `__index__` method when it is used as a list
index, so a class that wraps a secret integer and propagates through arithmetic can
report both, the way memcheck reports uninitialized values:

```python
import traceback

found = []                       # what the checker saw, as (kind, source line)

class Secret:
    """An int that remembers it is secret, the way Valgrind remembers 'undefined'."""
    def __init__(self, v):
        self.v = v
    def _op(f):
        def run(self, other=None):
            o = other.v if isinstance(other, Secret) else other
            return Secret(f(self.v, o))
        return run
    __xor__ = __rxor__ = _op(lambda a, b: a ^ b)
    __or__ = __ror__ = _op(lambda a, b: a | b)
    __and__ = __rand__ = _op(lambda a, b: a & b)
    __add__ = __radd__ = _op(lambda a, b: a + b)
    __sub__ = _op(lambda a, b: a - b)
    __rsub__ = _op(lambda a, b: b - a)
    __rshift__ = _op(lambda a, b: a >> b)
    __neg__ = _op(lambda a, b: -a)
    __eq__ = _op(lambda a, b: int(a == b))
    __ne__ = _op(lambda a, b: int(a != b))
    __hash__ = None
    def _report(self, kind):
        line = traceback.extract_stack()[-3].line
        if (kind, line) not in found:
            found.append((kind, line))
    def __bool__(self):          # Python asks this at every if, while, and, or
        self._report("branch on a secret")
        return bool(self.v)
    def __index__(self):         # and this when a secret is used as a list index
        self._report("address from a secret")
        return self.v

def declassify(s):               # the result we mean to make public
    return s.v if isinstance(s, Secret) else s

PRESENT = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]

def naive_equal(a, b):
    for x, y in zip(a, b):
        if x != y:
            return 0
    return 1

def ct_equal(a, b):
    d = 0
    for x, y in zip(a, b):
        d |= x ^ y
    return ((d - 1) >> 8) & 1    # bytes, so d < 256: 1 if d == 0, else 0

def sbox_lookup(x):
    return PRESENT[x]

def sbox_scan(x):
    r = 0
    for i in range(16):          # read every entry, keep the one we want
        m = ((x ^ i) - 1) >> 8   # -1 (all ones) if x == i, else 0
        r |= PRESENT[i] & m
    return r

def check(name, f, *args):
    found.clear()
    result = declassify(f(*args))
    print(f"{name:12} result {result:2}  ", "clean" if not found else "leaks:")
    for kind, line in found:
        print(f"    {kind}: {line}")

tag = [Secret(b) for b in bytes.fromhex("9e4a1fc2")]
check("naive_equal", naive_equal, tag, list(bytes.fromhex("9e4a0000")))
check("ct_equal", ct_equal, tag, list(bytes.fromhex("9e4a0000")))
check("sbox_lookup", sbox_lookup, Secret(0x7))
check("sbox_scan", sbox_scan, Secret(0x7))
```

It prints:

```
naive_equal  result  0   leaks:
    branch on a secret: if x != y:
ct_equal     result  0   clean
sbox_lookup  result 13   leaks:
    address from a secret: return PRESENT[x]
sbox_scan    result 13   clean
```

The checker found the early exit in `naive_equal` and the secret index in
`sbox_lookup`, and passed the OR-of-XORs and the masked scan. It has the same blind
spot as memcheck: it sees only the path that ran, here one tag and one index, and a
leak on a path not taken goes unreported. It also needs every secret to enter through
a `Secret`, which is the real tools' "mark the key undefined" step, and the one
programmers forget most often (the nonce, the decrypted plaintext, the output of the
random generator).

!!! note "Life story: ctgrind"
    **Born:** April 2010, Adam Langley's blog post "Checking that functions are
    constant time with Valgrind" and a small Valgrind patch · **Purpose:** to find
    secret-dependent branches and memory addresses automatically, by marking secrets as
    uninitialized memory and letting memcheck's existing tracking do the rest ·
    **Helped:** the patch became unnecessary once it was clear that memcheck's
    `VALGRIND_MAKE_MEM_UNDEFINED` does the same; BoringSSL's constant-time test build,
    TIMECOP in SUPERCOP (2020), and the extended Valgrind of the KyberSlash work all
    descend from it · **Status:** current and the most widely used check, with a known
    limit: it covers only the paths executed and knows nothing of variable-time
    instructions unless extended

**What to do.**

1. Mark secrets with `VALGRIND_MAKE_MEM_UNDEFINED` (or your library's `CONSTTIME_SECRET`)
   in a test build and run the tests under memcheck in CI. Mark every secret: keys,
   nonces, random output, decrypted plaintext.
2. A clean run speaks only for the paths it ran: drive the code with many inputs,
   including the error paths (bad tags, bad padding, invalid points).

## 5.12 Checking the timing, and proving it

*Level: intermediate.*

**Statistical testing: dudect.** In 2017 Oscar Reparaz, Josep Balasch and Ingrid
Verbauwhede asked the question the other way round: instead of looking inside the
code, time it, on the real processor, with two classes of inputs, and test whether
the two timing distributions differ. Their tool, **dudect** ("Dude, is my code
constant time?", DATE 2017), is a few hundred lines of C. It borrows the leakage test
of hardware evaluation labs (TVLA, explained with its statistics in
[Cryptanalysis §17.13](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)):
one class gets a fixed input, the other random inputs, interleaved at random so that
drifts affect both; the slowest measurements are cropped, since they are mostly
interrupts; and Welch's $t$-statistic is computed. If $|t|$ exceeds 4.5 the
distributions differ and the code leaks; if it stays small, no leak was found at that
number of measurements. Because it measures the processor itself, dudect catches what
taint tracking cannot: the division of KyberSlash, a subnormal float, a compiler's
branch on a path you did not think to run.

**Code it.** A dudect-style test of `==` and `hmac.compare_digest`. The secret is a
random value; class 0 compares it with a fixed guess that is wrong only in the last
byte (so an early-exit comparison runs to the end), class 1 with random guesses (wrong,
almost always, in the first byte). The last line runs the same test with a mistake in
the harness, explained below:

```python
import hmac, random, secrets, time

def welch_t(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    return (ma - mb) / (va / len(a) + vb / len(b)) ** 0.5

def dudect(compare, size, n=100_000, fresh=True):
    secret = secrets.token_bytes(size)
    fixed = secret[:-1] + bytes([secret[-1] ^ 1])   # class 0: wrong only in the last byte
    classes = [secrets.randbelow(2) for _ in range(n)]
    # Build every input before timing anything, so only the comparison is timed.
    inputs = []
    for c in classes:
        if c == 1:
            inputs.append(secrets.token_bytes(size))  # class 1: random, wrong almost at once
        elif fresh:
            inputs.append(bytes(bytearray(fixed)))  # a new copy of the fixed value
        else:
            inputs.append(fixed)                      # the very same object every time
    times = []
    for x in inputs:
        t0 = time.perf_counter_ns()
        compare(secret, x)
        times.append(time.perf_counter_ns() - t0)
    cut = sorted(times)[int(0.9 * n)]                 # drop the slowest tenth (interrupts)
    a = [t for t, c in zip(times, classes) if c == 0 and t <= cut]
    b = [t for t, c in zip(times, classes) if c == 1 and t <= cut]
    return welch_t(a, b)

def show(name, compare, size, fresh=True):
    t = dudect(compare, size, fresh=fresh)
    verdict = "leak" if abs(t) > 4.5 else "no leak found"
    print(f"{name:28} {size:5} bytes   t = {t:7.1f}   {verdict}")

equal = lambda x, y: x == y
for size in (32, 1024):
    show("==", equal, size)
    show("compare_digest", hmac.compare_digest, size)
show("compare_digest, same object", hmac.compare_digest, 1024, fresh=False)
```

The values of $t$ change from run to run and machine to machine. One run printed:

```
==                              32 bytes   t =    26.8   leak
compare_digest                  32 bytes   t =    -0.4   no leak found
==                            1024 bytes   t =   228.7   leak
compare_digest                1024 bytes   t =     0.7   no leak found
compare_digest, same object   1024 bytes   t =  -133.5   leak
```

The first line is the leak that the medians of §5.3 could not see: for a 32-byte tag,
`==` on a random guess stops at CPython's first-byte check, while the fixed guess goes
on to `memcmp`. The difference is a few nanoseconds, below the resolution of the
medians, but 100,000 measurements put $t$ far above 4.5. The test's power grows like
$\sqrt{n}$: a difference too small to see in a thousand samples is obvious in a
million, which is exactly the attacker's position. `compare_digest` stays near 0 at
both lengths in this run; in other runs it has reached 3 or 4, which is why the
threshold is 4.5 and why a real evaluation repeats a test before believing a failure.

**Break it: the harness that lies.** The last line tests the same `compare_digest`,
which has just passed, and fails it with $t = -133$. The only change is in the
harness: class 0 reuses one `bytes` object for every fixed input, while class 1 gets a
fresh object for each random one. The same object stays in the processor's cache, so
comparing against it is faster, and the test duly reports a difference between the
classes, which has nothing to do with the code under test. (In Python, `bytes(fixed)`
returns the very same object, which is how this mistake slipped into the first
version of this test.) **Fix it:** prepare every input of both classes the same way,
as a new copy (`bytes(bytearray(fixed))`), so that the only difference between the
classes is the value. Real leakage tests fail for the same kinds of reasons: inputs
generated inside the timed region, a class that triggers a slower code path in the
harness, frequency changes between blocks of measurements. A "leak" from dudect is a
reason to look, and the first place to look is the harness.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Two pairs of timing distributions: for leaky code the fixed-input and random-input distributions are shifted apart; for constant-time code they overlap" fill="currentColor" font-size="14">
<line x1="20" y1="200" x2="300" y2="200" stroke="currentColor" stroke-width="1.4"/>
<line x1="340" y1="200" x2="620" y2="200" stroke="currentColor" stroke-width="1.4"/>
<polyline points="30,199.1 36,198.4 42,197.4 48,195.9 54,193.6 60,190.5 66,186.1 72,180.3 78,172.9 84,163.9 90,153.1 96,141.0 102,127.9 108,114.4 114,101.3 120,89.6 126,80.0 132,73.4 138,70.2 144,70.8 150,75.2 156,82.9 162,93.3 168,105.6 174,118.9 180,132.3 186,145.2 192,156.9 198,167.1 204,175.6 210,182.4 216,187.7 222,191.6 228,194.5 234,196.5 240,197.8 246,198.7 252,199.2 258,199.6 264,199.8 270,199.9 276,199.9 282,200.0 288,200.0 294,200.0 300,200.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="30,200.0 36,200.0 42,199.9 48,199.8 54,199.7 60,199.4 66,199.0 72,198.3 78,197.2 84,195.6 90,193.2 96,189.8 102,185.2 108,179.2 114,171.5 120,162.2 126,151.2 132,138.9 138,125.7 144,112.2 150,99.3 156,87.8 162,78.7 168,72.6 174,70.1 180,71.3 186,76.3 192,84.5 198,95.2 204,107.8 210,121.2 216,134.5 222,147.2 228,158.7 234,168.6 240,176.8 246,183.4 252,188.4 258,192.2 264,194.9 270,196.7 276,198.0 282,198.8 288,199.3 294,199.6 300,199.8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<polyline points="350,199.6 356,199.4 362,198.9 368,198.1 374,197.0 380,195.2 386,192.7 392,189.1 398,184.3 404,178.0 410,170.1 416,160.5 422,149.2 428,136.7 434,123.4 440,110.0 446,97.2 452,86.1 458,77.4 464,71.9 470,70.0 476,71.9 482,77.4 488,86.1 494,97.2 500,110.0 506,123.4 512,136.7 518,149.2 524,160.5 530,170.1 536,178.0 542,184.3 548,189.1 554,192.7 560,195.2 566,197.0 572,198.1 578,198.9 584,199.4 590,199.6 596,199.8 602,199.9 608,199.9 614,200.0 620,200.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="350,199.8 356,199.6 362,199.4 368,198.9 374,198.2 380,197.0 386,195.3 392,192.8 398,189.3 404,184.6 410,178.4 416,170.6 422,161.1 428,150.0 434,137.7 440,124.6 446,111.4 452,98.8 458,87.9 464,79.3 470,73.9 476,72.0 482,73.9 488,79.3 494,87.9 500,98.8 506,111.4 512,124.6 518,137.7 524,150.0 530,161.1 536,170.6 542,178.4 548,184.6 554,189.3 560,192.8 566,195.3 572,197.0 578,198.2 584,198.9 590,199.4 596,199.6 602,199.8 608,199.9 614,199.9 620,200.0" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="160" y="30" text-anchor="middle" font-weight="bold">leaky: means apart, |t| large</text>
<text x="480" y="30" text-anchor="middle" font-weight="bold">clean: overlap, |t| small</text>
<text x="160" y="222" text-anchor="middle" font-size="12">time per call</text>
<text x="480" y="222" text-anchor="middle" font-size="12">time per call</text>
<line x1="200" y1="245" x2="230" y2="245" stroke="currentColor" stroke-width="2"/>
<text x="236" y="249" font-size="12">random inputs</text>
<line x1="350" y1="245" x2="380" y2="245" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="386" y="249" font-size="12">fixed input</text>
</svg>
<figcaption>Figure 5.6. What a fixed-versus-random timing test compares. Welch's t measures how far apart the two means are in units of their standard error, so with enough measurements even a small shift on the left gives a large t.</figcaption>
</figure>

!!! note "Life story: dudect"
    **Born:** 2017, Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede (KU Leuven),
    "Dude, is my code constant time?" (DATE 2017) · **Purpose:** a leakage test for
    software that needs no model of the processor and no source code: fixed versus
    random inputs, cropped timings, Welch's t-test, adapted from hardware leakage
    assessment · **Helped:** became a standard step in testing constant-time
    libraries and post-quantum submissions, and a model for statistical timing tests in
    other languages · **Status:** current; a pass means no leak at that number of
    measurements on that machine, and like every statistical test it depends on a
    harness that does not leak by itself

**Formal verification.** The third family proves the property instead of testing it.
José Bacelar Almeida, Manuel Barbosa, Gilles Barthe, François Dupressoir and Michael
Emmi's **ct-verif** (USENIX Security 2016) works on LLVM's intermediate code: it builds
a "product program" that runs two copies of the function side by side on inputs that
agree on public data and differ on secrets, and asks a verifier to prove that both
copies always take the same branches and touch the same addresses. It checked code
from libraries including OpenSSL, NaCl and libsodium. Because it works before the
back end of the compiler, the last steps of code generation are outside its view;
Lesly-Ann Daniel, Sébastien Bardin and Tamara Rezk's **Binsec/Rel** (IEEE S&P 2020)
closes that gap by doing the same relational analysis on the final binary, with
symbolic execution, and it is with Binsec/Rel that they showed compilers breaking
source-level constant time. Other tools in this family check particular languages
(the Jasmin checker), particular properties (CacheAudit, 2013, bounds cache leakage
rather than forbidding it), or combine fuzzing with taint (ct-fuzz, Microwalk).

**Which tools do people actually use?** In 2022 Jan Jancar and co-authors surveyed 44
developers of 27 cryptographic libraries (IEEE S&P 2022, "They're not that hard to
mitigate"). Nearly all knew timing attacks mattered; few ran any of these tools
regularly, and the reasons they gave were practical: the tools were hard to install,
hard to apply to a whole library, and noisy. The authors' recommendation, and this
chapter's, is to start with the cheapest tool that would have caught the bugs you
already know about: memcheck-based taint tracking in the continuous-integration build,
plus a dudect-style test of the few functions that handle secrets, run on the
processors you ship to.

**What to do.**

1. Add a fixed-versus-random timing test for each secret-handling entry point, on
   real hardware of each architecture you support, and debug the harness first when
   it fails.
2. For new primitives, prefer code that is verified or generated from verified
   sources (HACL\*, Fiat-Crypto, libcrux, Jasmin-based code), and keep the dynamic
   checks anyway: they test the binary you actually ship.

## 5.13 In the real world

*Level: intermediate.*

The incidents of this chapter, seen from the defender's chair. Each row is a place
where code that someone believed safe met one of the three rules, or the machine
underneath them:

| Year | Incident | Rule broken | The defender's fix |
| --- | --- | --- | --- |
| 2005 | Percival; Bernstein; Osvik, Shamir, Tromer | 2: secret addresses (RSA windows, AES T-tables) | scatter-gather tables, then bitsliced AES and AES-NI |
| 2007 | Xbox 360 HMAC check | 1: early exit in `memcmp` | constant-time compare in later boot code |
| 2009 | Keyczar; Java `MessageDigest.isEqual` | 1: early exit | OR of XORs; Java SE 6u17 |
| 2013 | Lucky Thirteen (TLS CBC) | 1 and 2: padding-dependent MAC work | masked, constant-amount MAC checks |
| 2016 | CacheBleed (OpenSSL RSA) | 2: addresses inside a cache line | full masked scan of the table |
| 2019 | Minerva, TPM-Fail (ECDSA) | 1: loop length follows the nonce's bit length | fixed-length scalar loops ([Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)) |
| 2022 | Hertzbleed | the model: power changes frequency | masking; no general fix |
| 2023 | KyberSlash (ML-KEM reference) | 3: division on secrets | multiply and shift in the source |
| 2024 | clangover (ML-KEM reference) | the compiler restored a branch | value barrier, binary-level checks |
| 2024 | GoFetch (Apple M1 to M3) | the model: prefetcher reads values | DIT on M3, blinding, core choice |

The attacks behind the rows are in
[Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)
and [Chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md), and the
post-quantum ones in [Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).
Three things stand out. The early rows are bugs in the code; the later rows are
increasingly bugs in the layers below the code, which is why the checks have moved
from the source toward the binary and the processor. Almost every row was in a library
written by people who knew about timing attacks, which is the argument for tools over
care. And every fix was known before the incident: the defenders' toolbox of
§5.3 to §5.8 has barely changed since the mid-2000s; what changed is how strictly it
is applied and checked.

**What good libraries do today.** BoringSSL runs its tests under Valgrind with secrets
marked, uses value barriers in its constant-time helpers, and takes the field arithmetic
for several curves from Fiat-Crypto. libsodium was designed around constant-time primitives
(X25519, Ed25519, ChaCha20-Poly1305) from the start and avoids table lookups by
construction. BearSSL documents, per primitive, which implementations are constant
time and on which processors. Go's standard library writes its cryptography to avoid
secret branches and exposes `crypto/subtle` for applications, now with DIT. The
reference implementations of the NIST post-quantum standards are checked with
TIMECOP-style tools since KyberSlash, and libraries such as libcrux and mlkem-native
ship ML-KEM code with machine-checked proofs of correctness and constant-time checks
built into their testing.

**What to do on Monday.**

1. Search your code for `==`, `!=`, `memcmp`, `equals` and `strcmp` on anything that
   is a tag, a token, a hash or a key. Replace each with the constant-time function.
2. Search for table lookups, `switch` statements, `/` and `%` on key material in any
   cryptographic code you maintain yourself. Better: stop maintaining it, and call a
   library.
3. If you do maintain such code: mark secrets for memcheck in a test build and run it
   in CI; add a dudect-style test for each entry point; read the assembly of the
   comparison, select and swap after each compiler upgrade.
4. On arm64, set DIT around cryptographic work; on recent Intel servers, find out
   whether DOITM is on.
5. Do not write cryptography in Python, JavaScript or any other managed language
   except as glue around constant-time native code.

## 5.14 Going deeper

*Level: expert.*

**A formal definition.** Model a program $P$ as taking a public input $p$ and a
secret input $s$, and as producing, besides its output, a **leakage trace**
$\mathrm{leak}(P, p, s)$: the sequence of branch outcomes and memory addresses (and,
in richer models, the operands of variable-time instructions). $P$ is constant time
if for every $p$ and every pair of secrets $s_1, s_2$,

$$
\mathrm{leak}(P, p, s_1) = \mathrm{leak}(P, p, s_2).
$$

This is a **noninterference** property: the secret does not interfere with what the
observer sees. It is a property of pairs of runs, not of one run, which is why
testing a single input (the toy checker, memcheck) can find violations but never prove
their absence, and why ct-verif and Binsec/Rel reason about two copies at once. The
choice of $\mathrm{leak}$ is the leak model: "branches and addresses" is the classic
one, "plus cache-line granularity only" is weaker and was what scatter-gather assumed,
"plus operands of a listed set of instructions" is what DIT and DOIT promise to make
unnecessary. Gilles Barthe and colleagues built the theory of compiling such programs
from 2014 on, and in 2020 proved that a version of the verified CompCert C compiler
preserves constant time: the same guarantee Jasmin's compiler is designed to give.

**Speculative constant time.** Spectre (2018) showed that the processor runs
instructions on paths the program does not take, and leaves traces of them in the
cache. A program that is constant time by the definition above can still, during a
mispredicted branch on public data, load from an address computed from a secret.
Sunjay Cauligi and colleagues defined **speculative constant time** in 2020 (PLDI): the
leakage trace includes what happens on mispredicted paths, up to some speculation
window. Meeting it needs either speculation barriers (`LFENCE` on x86) at the right
places or code structured so that secrets are never in registers when a misprediction
could use them. Most libraries today handle the main Spectre variants with compiler
mitigations and process isolation rather than by proving this property; Jasmin can
check it.

**Hardware-software contracts.** Marco Guarnieri, Boris Köpf, Jan Reineke and Pepe
Vila proposed in 2021 to make the leak model an explicit **contract** between hardware
and software: the processor documents which observations its microarchitecture can
produce, and software is checked against that contract. DIT and DOIT are small steps
in this direction for one rule; GoFetch and Hertzbleed are examples of processors that
broke an unwritten contract. Expect future instruction-set manuals to say more.

**Constant time is not enough against physical attackers.** The leak model assumes the
observer sees control flow and addresses, not values. An oscilloscope on a smart card
sees values, through power and electromagnetic emanations, and constant-time AES leaks
its key to a correlation power attack in a few hundred traces. The defense against
that is **masking**, which hides the values themselves by splitting them into random
shares, at a cost of two to ten times the work, and it is the subject of
[Chapter 7](07-Masking-and-Fault-Resistance.md). Masking does not remove the need for
constant time: a masked implementation with a secret branch still leaks the branch.

**Constant time for big numbers.** The hardest constant-time code in practice is
public-key arithmetic: numbers of thousands of bits, reductions, inversions, scalar
multiplications with secret scalars. The tools are the ones of this chapter (masks,
conditional swaps, full table scans, no division), applied to arrays of limbs, plus
the algorithms that need no data-dependent decisions at all: the Montgomery ladder,
complete addition formulas, fixed-window exponentiation with scanned tables,
inversion by Fermat's little theorem or by Bernstein and Yang's constant-time gcd
(2019). That is [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md).

## Check yourself

??? question "1. Constant-time code may take longer for a 1 KB message than for a 100-byte one. Why is that not a contradiction?"

    "Constant time" means the time does not depend on **secret** data. The length of a
    message is normally public (it is visible on the wire), so loops whose count
    depends on it are allowed. A loop whose count depends on a secret, such as the
    bit length of a private scalar, is not.

??? question "2. Name the three things the leak model says an observer learns."

    The control flow (which instructions run: every branch outcome and loop count), the
    memory addresses read and written, and the operands of variable-time instructions
    such as division. Constant-time code makes all three independent of secrets.

??? question "3. A web service checks an API key with `if request_key == stored_key:`. What is wrong, and what are two fixes?"

    `==` stops at the first differing byte (in CPython, after the length and first-byte
    checks it calls `memcmp`), so an attacker who times many requests can learn the key
    byte by byte. Fix 1: `hmac.compare_digest(request_key, stored_key)`. Fix 2, better:
    store only a hash of each key and compare hashes of fixed length with
    `compare_digest`, so that a database leak does not reveal the keys either.

??? question "4. Compute the equality mask for x = 12, y = 12 and for x = 12, y = 13, step by step, with 32-bit words."

    For 12 and 12: $q = 0$, $q \mathbin{|} -q = 0$, top bit 0, $\mathrm{eq} = 1$,
    mask $-1 =$ `0xFFFFFFFF`. For 12 and 13: $q = 1$, $-q =$ `0xFFFFFFFF`, the OR is
    `0xFFFFFFFF`, top bit 1, $\mathrm{eq} = 0$, mask `0x00000000`.

??? question "5. Why is `if ct_eq(a, b): grant()` no better than `if a == b: grant()` in the middle of a computation, but fine at the very end of a MAC check?"

    The `if` is a branch on the result, so it leaks the result. In the middle of a
    computation the result is secret, and leaking it is the bug. At the end of a MAC
    check the result (accept or reject) is announced to the sender anyway, so branching
    on it declassifies only what is public. The important part is that the comparison
    itself did not leak **where** the tags differed.

??? question "6. A 256-entry table is laid out so that every lookup touches all four cache lines it occupies, but reads only the wanted entry. Is that constant time?"

    Not under the leak model, which forbids secret addresses at any granularity.
    CacheBleed (2016) recovered RSA keys from exactly such a layout in OpenSSL by
    observing cache-bank conflicts inside a line, and MemJam (2018) used 4K aliasing to
    the same end. The fix is to read every entry and select with masks.

??? question "7. The source code uses `x / 3329` on a secret coefficient. The binary built with -O2 on x86-64 has no divide instruction. Is the code safe?"

    On that build, probably, because the compiler turned the division into a
    multiplication. But the same source may compile to a real division at another
    optimization level or on another target (KyberSlash found exactly this on Arm
    cores). Write the multiply and shift into the source, verify the constant
    exhaustively, and check binaries for divides.

??? question "8. Why can no pure-Python function be constant time, even if it uses only masks and fixed loops?"

    Python's integers are variable-length and sized by value (`x & 0` returns a cached
    small object, `x & mask` allocates one as long as `x`), the interpreter takes
    different paths for small and large integers, allocation and garbage collection add
    data-dependent work, and built-ins such as `pow` and `==` on bytes are not
    constant time. The masks are right; the machine running them is not.

??? question "9. A dudect-style test of a new constant-time function reports t = 38. What should you check before concluding that the function leaks?"

    The harness: are both classes prepared the same way, outside the timed region,
    as fresh objects or buffers (the "same object" mistake of §5.12)? Is the fixed
    input causing a different code path in the harness? Was the run interleaved and
    repeated? If the result survives a clean harness and a second run, look at the
    function's compiled code for branches, table lookups and divisions.

??? question "10. Arm DIT is enabled. Which of these is now safe: (a) a table lookup indexed by a key byte; (b) a multiplication of two secret words; (c) a branch on a secret bit?"

    Only (b), and only if the multiply instruction is on Arm's DIT list. DIT promises
    that listed instructions take time independent of their data operands. It changes
    nothing about which addresses are loaded (a) or which way a branch goes (c); those
    are rules 2 and 1 of the leak model and still the programmer's job.

## What you learned

- Constant-time code keeps three things independent of secrets: control flow, memory
  addresses, and the operands of variable-time instructions. Lengths and other public
  values may still change the time.
- The toolbox is small: compare by OR-ing XORs; turn comparisons into all-ones or
  all-zeros masks with two's complement tricks; select and swap with masks; read
  tables by scanning them; compute (bitsliced, or with AES instructions) instead of
  looking up.
- Division is variable time almost everywhere, multiplication on some small cores,
  floating point on subnormals. Replace division by a constant with a multiply and a
  shift written in the source, and check it exhaustively.
- The compiler may undo any of it. Value barriers help; checking the shipped binary is
  what counts. KyberSlash and clangover are the recent proofs.
- Arm DIT and Intel DOIT turn instruction timing into an architectural promise, for
  rule 3 only. GoFetch and Hertzbleed show that processors can break the model in
  new ways.
- Python can show the shape of constant-time code and measure leaks, but cannot itself
  be constant time; production Python relies on C such as `hmac.compare_digest`.
- Checks come in three kinds: taint tracking (ctgrind, memcheck, TIMECOP), statistical
  timing tests (dudect), and formal proofs (ct-verif, Binsec/Rel). Use the cheap ones
  in CI, and suspect the harness first when a test fails.

**Next:** [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) applies all of this to
the hardest case: multiprecision arithmetic, the Montgomery ladder and X25519.

## Further reading

- Scott Crosby, Dan Wallach and Rudolf Riedi, "Opportunities and Limits of Remote
  Timing Attacks", *ACM Transactions on Information and System Security* 12 (2009).
- Free60 project, "Timing Attack" (the Xbox 360 HMAC `memcmp` attack, 2007),
  free60.org.
- Coda Hale, "A Lesson in Timing Attacks (or, Don't Use MessageDigest.isEquals)"
  (2009), and CVE-2009-3875.
- Python documentation, `hmac.compare_digest` (added in 3.3, 2012).
- Thomas Pornin, "Constant-Time Crypto" and "Constant-Time Mul", bearssl.org
  (2016 onward).
- Daniel J. Bernstein, "Cache-timing attacks on AES" (2005); Dag Arne Osvik, Adi Shamir
  and Eran Tromer, "Cache Attacks and Countermeasures: the Case of AES" (CT-RSA 2006);
  Colin Percival, "Cache Missing for Fun and Profit" (BSDCan 2005).
- Yuval Yarom, Daniel Genkin and Nadia Heninger, "CacheBleed: A Timing Attack on
  OpenSSL Constant Time RSA" (CHES 2016).
- Eli Biham, "A Fast New DES Implementation in Software" (FSE 1997); Emilia Käsper and
  Peter Schwabe, "Faster and Timing-Attack Resistant AES-GCM" (CHES 2009); Joan Boyar
  and René Peralta, "A New Combinational Logic Minimization Technique with Applications
  to Cryptology" (SEA 2010).
- FIPS 197, Advanced Encryption Standard (2001, updated 2023): the S-box and the
  worked multiplication.
- Torbjörn Granlund and Peter Montgomery, "Division by Invariant Integers using
  Multiplication" (PLDI 1994).
- Marc Andrysco, David Kohlbrenner, Keaton Mowery, Ranjit Jhala, Sorin Lerner and Hovav
  Shacham, "On Subnormal Floating Point and Abnormal Timing" (IEEE S&P 2015).
- Daniel J. Bernstein et al., "KyberSlash: Exploiting secret-dependent division timings
  in Kyber implementations" (ePrint 2024/1049); Antoon Purnal, "clangover"
  (CVE-2024-37880, 2024).
- Arm, *Arm Architecture Reference Manual for A-profile architecture*, FEAT_DIT and
  the DIT register (Armv8.4-A); Intel, "Data Operand Independent Timing Instruction Set
  Architecture (ISA) Guidance" (2022); Eric Biggers, "x86: enable Data Operand
  Independent Timing Mode", Linux kernel mailing list (January 2023); Go 1.24 release
  notes, `crypto/subtle.WithDataIndependentTiming` (2025).
- Boru Chen et al., "GoFetch: Breaking Constant-Time Cryptographic Implementations Using
  Data Memory-Dependent Prefetchers" (USENIX Security 2024); Yingchen Wang et al.,
  "Hertzbleed: Turning Power Side-Channel Attacks Into Remote Timing Attacks on x86"
  (USENIX Security 2022).
- Adam Langley, "Checking that functions are constant time with Valgrind",
  imperialviolet.org (April 2010).
- Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede, "Dude, is my code constant
  time?" (DATE 2017).
- José Bacelar Almeida, Manuel Barbosa, Gilles Barthe, François Dupressoir and Michael
  Emmi, "Verifying Constant-Time Implementations" (USENIX Security 2016).
- Lesly-Ann Daniel, Sébastien Bardin and Tamara Rezk, "Binsec/Rel: Efficient Relational
  Symbolic Execution for Constant-Time at Binary-Level" (IEEE S&P 2020).
- Moritz Neikes, TIMECOP (2020), and Daniel J. Bernstein's notes on TIMECOP in
  SUPERCOP, bench.cr.yp.to.
- Jan Jancar, Marcel Fourné, Daniel De Almeida Braga, Mohamed Sabt, Peter Schwabe,
  Gilles Barthe, Pierre-Alain Fouque and Yasemin Acar, "They're not that hard to
  mitigate: What Cryptographic Library Developers Think About Timing Attacks" (IEEE S&P
  2022).
- José Bacelar Almeida et al., "Jasmin: High-Assurance and High-Speed Cryptography"
  (CCS 2017); Gilles Barthe, Sandrine Blazy, Benjamin Grégoire, Rémi Hutin, Vincent
  Laporte, David Pichardie and Alix Trieu, "Formal Verification of a Constant-Time
  Preserving C Compiler" (POPL 2020).
- Sunjay Cauligi et al., "Constant-Time Foundations for the New Spectre Era" (PLDI
  2020); Marco Guarnieri, Boris Köpf, Jan Reineke and Pepe Vila, "Hardware-Software
  Contracts for Secure Speculation" (IEEE S&P 2021).
- Trail of Bits, "Introducing constant-time support for LLVM to protect cryptographic
  code" (December 2025).
- Related chapters: book 1 [Chapter 18](../../book/18-Side-Channels.md);
  [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md);
  [Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).
