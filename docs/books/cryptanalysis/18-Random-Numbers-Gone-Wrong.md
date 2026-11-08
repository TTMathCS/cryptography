# 18. Random Numbers Gone Wrong

*Most cryptography assumes one thing it cannot check for itself: that the
secret numbers it starts from were chosen at random. When that assumption
fails, the cipher, the curve and the key length stop mattering, because the
attacker no longer has to break anything. It only has to list the few
numbers the victim could have chosen. This chapter tells the great
random-number failures in full, from Netscape's browser in 1995 to the
Infineon chips of 2017, and works the attacker's side of each one. You will
recover a session key by searching a seed made from the clock, rebuild every
key of a Debian-style generator from a list of process IDs, clone a Java
generator from two outputs, factor thousands of keys at once with batch gcd,
spot an Infineon key by its fingerprint, and predict a Dual_EC_DRBG generator
on a toy curve from the secret its designer kept.*

!!! abstract "In this chapter"
    **You will learn:**

    - the four ways a generator fails: a guessable seed, a seed with no
      entropy in it, an output that gives away the state, and a generator
      someone else holds a key to;
    - how Goldberg and Wagner broke Netscape's SSL keys in 1995, and how to
      search a seed space in code;
    - what the two deleted lines in Debian's OpenSSL did, why there were only
      32,767 keys of each kind, and how an attacker uses such a list;
    - how to recover the state of linear congruential generators, including
      Java's, from a handful of outputs;
    - how routers and firewalls came to share prime factors, and how batch gcd
      (product tree and remainder tree) finds them among millions of keys;
    - the Android `SecureRandom` failure and the Bitcoin thefts of 2013;
    - the structure of ROCA's weak primes, why a public key gives it away, and
      how Coppersmith's method then factors it;
    - the Dual_EC_DRBG story, its back door worked on a toy curve, and what
      happened when someone changed the point $Q$ inside Juniper's firewalls;
    - how generators are tested (SP 800-22 statistical tests, SP 800-90B
      entropy estimates and health tests), what tests cannot show, and what
      good practice is today.

    **You need:** book 1 [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md),
    which explains what a good generator is (entropy, min-entropy, true and
    pseudorandom generators, the operating system's generator) and gives each
    of these failures a paragraph; this chapter assumes it. RSA and gcd from
    book 1 [Chapter 13](../../book/13-RSA.md); elliptic-curve point arithmetic
    from book 1 [Chapter 15](../../book/15-Elliptic-Curves.md) for §18.10.
    [Chapter 13](13-Attacks-on-RSA.md) of this book has Coppersmith's method,
    which ROCA uses, and [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)
    has the nonce algebra behind the Android thefts.

    **Levels:** §18.1, §18.2, §18.3, §18.5, §18.7, §18.9 and §18.13 are for
    beginners; §18.4, §18.6, §18.8, §18.11 and §18.12 are intermediate;
    §18.10 and §18.14 are expert.

## 18.1 The problem

*Level: beginner.*

Every key starts as a random number. An AES key is 128 or 256 random bits.
An RSA key is two random primes. An ECDSA signature needs a fresh random
nonce every time it signs, a TLS handshake needs random values from both
sides, and a password-reset link needs a random token. The rest of this book
assumes these numbers are what they claim to be: drawn uniformly from a space
so large that guessing is hopeless.

The attacks of Parts II and III go after the algorithm: they find structure
in AES, in SHA-1, in the RSA problem. This chapter goes after the input. The
attacker's question is not "how do I break a 128-bit key?" but "how many
different keys could this machine actually have made?" If the answer is a
million, the attack is a loop. If it is 32,767, the attacker can make every
key in advance and look the victim's up in a table.

A random-number failure has four common shapes, and every story in this
chapter is one of them:

1. **A guessable seed.** The generator is fine but was started from
   something the attacker can guess: the time, a process ID, a counter.
   Netscape 1995 (§18.2) is the classic case.
2. **A seed with nothing in it.** The generator was meant to gather entropy
   and did not, through a bug or because the machine had none to give yet.
   Debian 2006 to 2008 (§18.3), the routers of "Mining your Ps and Qs"
   (§18.5) and Android 2013 (§18.7).
3. **An output that gives away the state.** A generator built for speed,
   not secrecy, whose outputs let the attacker rebuild its internal state
   and predict the rest. Linear congruential generators and the Mersenne
   Twister (§18.4); ROCA (§18.8) is a cousin, a key generator whose output
   carries a visible pattern.
4. **A generator someone else holds a key to.** Dual_EC_DRBG (§18.9 to
   §18.11): its output is unpredictable to everyone except whoever chose
   its constants.

Two facts make these failures dangerous. The first is that **bad random
numbers look exactly like good ones.** A key made from 15 bits of entropy is
still a valid 2048-bit RSA key. It encrypts, decrypts, and passes every test
the software runs on it. Nothing turns red. The second is that **the damage
is silent and permanent.** A key made badly in 2006 stays weak until it is
replaced, and every message it protected stays readable to anyone who
recorded it.

Figure 18.1 shows the stories of this chapter in order. Book 1
[§4.10](../../book/04-Randomness-and-Perfect-Secrecy.md) gives each of them a
paragraph; here each is told in full, and each is then attacked in code.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Timeline of random-number failures from Netscape in 1995 to ROCA in 2017" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="370" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="24" r="4"/>
<text x="108" y="29">Goldberg and Wagner break Netscape's seed</text>
<text x="78" y="61" text-anchor="end" font-weight="bold">2006</text>
<circle cx="92" cy="56" r="4"/>
<text x="108" y="61">Debian's OpenSSL loses its entropy; SP 800-90 includes Dual_EC</text>
<text x="78" y="93" text-anchor="end" font-weight="bold">2007</text>
<circle cx="92" cy="88" r="4"/>
<text x="108" y="93">Shumow and Ferguson: Dual_EC could hide a back door</text>
<text x="78" y="125" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="120" r="4"/>
<text x="108" y="125">Luciano Bello finds the Debian bug; Juniper adopts Dual_EC</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="152" r="4"/>
<text x="108" y="157">Shared primes across the Internet; someone changes Juniper's Q</text>
<text x="78" y="189" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="184" r="4"/>
<text x="108" y="189">Android wallets robbed; Snowden papers on Dual_EC; Taiwan cards</text>
<text x="78" y="221" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="216" r="4"/>
<text x="108" y="221">Linux gains getrandom(); Dual_EC exploited in TLS, on paper</text>
<text x="78" y="253" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="248" r="4"/>
<text x="108" y="253">Juniper announces "unauthorized code"; SP 800-90A Rev. 1</text>
<text x="78" y="285" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="280" r="4"/>
<text x="108" y="285">ROCA: Infineon keys factored; Estonian ID cards suspended</text>
<rect x="108" y="310" width="500" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="358" y="331" text-anchor="middle">In every case the cipher was sound.</text>
<text x="358" y="350" text-anchor="middle">The number fed into it was not.</text>
</svg>
<figcaption>Figure 18.1. Twenty-two years of random numbers gone wrong. None of these attacks broke an algorithm; each counted the keys a machine could really have made.</figcaption>
</figure>

The attacker's method is the same in all of them, and it is worth stating
once. First, **find where the randomness came from**: read the code,
reverse-engineer the binary, or study the keys themselves for patterns.
Second, **count**: how many states could the source really have been in?
Third, **search or solve**: try every state against something public (a
nonce, a challenge, a public key), or solve equations that the outputs
satisfy. Fourth, **scale**: one weak key is an incident, but a weakness in a
library or a chip is a class of keys, and the attacker who can recognize the
class can find every member of it on the Internet.

## 18.2 Netscape, 1995: a seed you could guess

*Level: beginner.*

In 1995 the web learned to keep secrets. Netscape Communications designed
the Secure Sockets Layer, SSL, so that its Navigator browser could send
credit card numbers to shops without anyone on the network reading them.
Navigator was by far the most popular browser, and SSL was the protocol of
online commerce. US export rules then limited the browser sold abroad to
40-bit keys, and the summer of 1995 showed what that meant: in August, Damien
Doligez of INRIA in France answered a public challenge by finding one 40-bit
SSL session key by brute force in about eight days on borrowed workstations.
The domestic version, with 128-bit keys, looked safe from that kind of
search.

In September 1995 Ian Goldberg and David Wagner, graduate students in
computer science at the University of California, Berkeley, asked a
different question: where did Navigator's keys come from? Netscape did not
publish its source code, so they reverse-engineered the Unix version of the
browser and reconstructed the code that seeded its random number generator.
They announced the result on 17 September 1995, and the *New York Times*
reported it two days later. Their write-up, "Randomness and the
Netscape Browser", appeared in *Dr. Dobb's Journal* in January 1996.

### What Navigator did

Goldberg and Wagner published the seeding code as pseudocode. Written
in the same spirit, it was:

$$
\begin{aligned}
a &= \text{mklcpr}(\text{microseconds}),\\
b &= \text{mklcpr}(\text{pid} + \text{seconds} + (\text{ppid} \ll 12)),\\
\text{seed} &= \text{MD5}(a, b),
\end{aligned}
$$

where *seconds* and *microseconds* are the time of day, *pid* is the
browser's process ID, *ppid* its parent's process ID, and mklcpr is a small
linear scrambling step,
$\text{mklcpr}(x) = (\texttt{0xDEECE66D} \cdot x + \texttt{0x2BBB62DC}) \gg 1$.
Each random output was then $\text{MD5}(\text{seed})$, after which the seed
was increased by one. To start an SSL connection the browser drew several
outputs in a row; among them were a **challenge**, which SSL 2.0 sends to
the server in the clear, and then the **secret session key**.

MD5 mixes its input thoroughly. That is the trap in this design, and it is
the lesson of the whole chapter: **mixing does not add uncertainty.** The
output of MD5 can be no harder to guess than its input, and the input here
was four numbers, every one of them guessable.

### Counting the seed space

How many seeds were possible? Take the attacker's position.

- **The seconds.** The attacker who watches the network knows when the
  connection was made, to within a second or so. Almost no uncertainty.
- **The microseconds.** At most $10^6$ values, about 20 bits.
- **The process IDs.** On the Unix systems of 1995, process IDs were below
  32,768, so 15 bits each. But an attacker with an account on the same
  machine (a university server, say) could simply list the running
  processes and read both. And even a remote attacker could do better than
  30 bits, because the parent's ID was often 1 or a number just below the
  browser's own.

So a local attacker had about 20 bits to search, a million MD5 computations.
Goldberg and Wagner reported that their program found the key in under a
minute, and often in seconds. A remote attacker faced more, but still a few
tens of bits rather than 128: a search measured in hours or days, not in
lifetimes of the universe.

To know when it has the right seed, the attacker needs one value that the
victim's generator produced and that it can see. The challenge is ideal: it
comes from the same generator a moment before the key, and SSL 2.0 sends it
in the clear. Any known plaintext would do as well.

### Code it

The code below follows the structure Goldberg and Wagner described, with
the details (byte order, how $a$ and $b$ are fed to MD5) chosen for the
toy rather than copied from Navigator. The victim's connection happens at a
time whose seconds are known; the attacker, on the same machine, also knows
the two process IDs and searches the microseconds.

```python
import hashlib

def mklcpr(x):                       # Netscape's "not cryptographically significant" mixer
    return ((0xDEECE66D * x + 0x2BBB62DC) >> 1) & 0xFFFFFFFF

def make_seed(sec, usec, pid, ppid):
    a = mklcpr(usec)
    b = mklcpr(pid + sec + (ppid << 12))
    d = hashlib.md5(a.to_bytes(4, "little") + b.to_bytes(4, "little")).digest()
    return int.from_bytes(d, "big")

def rng(seed, i):                    # the i-th output after seeding: MD5(seed + i)
    return hashlib.md5(((seed + i) % 2**128).to_bytes(16, "big")).digest()

# The victim's browser opens a connection
sec, usec, pid, ppid = 811_303_475, 637_214, 2_407, 2_391
seed = make_seed(sec, usec, pid, ppid)
challenge = rng(seed, 2)             # sent in the clear in SSL 2.0's client hello
key = rng(seed, 3)                   # the secret session key

# The attacker, logged in to the same machine, knows sec, pid and ppid
for guess in range(1_000_000):
    s = make_seed(sec, guess, pid, ppid)
    if rng(s, 2) == challenge:
        print("microseconds:", guess, "tries:", guess + 1)
        print("key found:", rng(s, 3) == key)
        break
```

It prints:

```
microseconds: 637214 tries: 637215
key found: True
```

The search took about a second in Python. The 128-bit key was never
attacked as a 128-bit key; its strength was the strength of the clock's
microsecond counter. (The time 811,303,475 seconds after 1 January 1970 is
the early hours of 17 September 1995, the day of the announcement.)

### What Netscape did

Netscape's response was quick and public. Within days it released a fixed
version of Navigator that gathered far more unpredictable input for its
seed, and it offered rewards for bugs found in its software, an early bug
bounty. The broader fix took longer. Gathering entropy well is hard for an
application: it sees only its own process. The job moved to the operating
system, which sees disk timings, network interrupts and keystrokes. Linux's
`/dev/random`, written by Theodore Ts'o, had appeared in 1994; over the next
years every major system gained one. The modern rule, "ask the operating
system", is in large part a lesson from this break.

Notice the constant `0xDEECE66D` in mklcpr. It is the low 32 bits of
`0x5DEECE66D`, the multiplier of the 48-bit linear congruential generator
from the Unix `drand48` family, which Java later adopted for
`java.util.Random`. You will break that generator in §18.4.

!!! note "Life story: the Netscape seed attack"
    **Born:** 17 September 1995, Ian Goldberg and David Wagner, graduate
    students at the University of California, Berkeley; published in
    *Dr. Dobb's Journal*, January 1996 · **Purpose:** to show that
    Navigator's SSL keys, 40-bit and 128-bit alike, came from a seed made of
    the time of day and two process IDs, and could be found in under a
    minute by a local attacker · **Helped:** made "where does the seed come
    from?" the first question in every security review; pushed entropy
    gathering into the operating system; an early example of
    reverse-engineering a closed product to check its cryptography ·
    **Status:** fixed within days; the textbook example of a guessable seed

## 18.3 Debian, 2006 to 2008: a seed with nothing in it

*Level: beginner.*

Netscape's seed was guessable because it was badly chosen. Debian's was
guessable because a well-meant change removed almost everything from it, and
for twenty months nobody noticed.

### Two lines and a memory checker

Valgrind is a tool that runs a program and reports when it reads memory that
was never written. Programmers use it to find bugs, and a clean Valgrind run
is a mark of careful code. OpenSSL did not run cleanly. Its random generator,
in the file `md_rand.c`, deliberately mixed the contents of a buffer into its
pool without first setting that buffer to anything, on the theory that
whatever happened to be there could only add unpredictability. Valgrind
flagged every program that used OpenSSL.

In the spring of 2006 a Debian maintainer of the OpenSSL package, Kurt
Roeckx, looked at the warnings. On 1 May 2006 he asked on the openssl-dev
mailing list whether two lines that Valgrind complained about could be
removed. Both were the same call, `MD_Update(&m,buf,j);`, one in the function
that adds data to the pool (`ssleay_rand_add`) and one in the function that
produces output (`ssleay_rand_bytes`). A reply on the list said that if it
helped with debugging, removing them was fine. The OpenSSL code already
contained a compile-time switch, `PURIFY`, that disabled the second line
for the same reason. Debian commented out both, and the change shipped in
the package version 0.9.8c-1 in September 2006.

The second line was harmless to remove: it mixed in an uninitialized buffer,
which added little. The first was not. `ssleay_rand_add` is the function
every caller uses to feed entropy into the pool: the contents of
`/dev/urandom`, the saved seed file, everything. With that line gone, all of
those inputs were silently ignored. What still reached the pool was the one
thing OpenSSL mixed in separately each time it produced output: **the
process ID.**

### How many keys?

Linux process IDs then ran from 1 to 32,767 by default (`pid_max` was
32,768, and 0 is never a process). So a program generating a key on a
Debian or Ubuntu machine had one of 32,767 possible generator states, and
therefore one of 32,767 possible keys, for each combination of:

- **key type and size:** 1024-bit DSA, 2048-bit RSA, 4096-bit RSA and so
  on, since a different request consumes the same random stream
  differently;
- **architecture:** the generator's arithmetic depended on byte order and
  word size, so 32-bit x86, 64-bit x86 and big-endian machines each had
  their own sets.

That is about 15 bits of entropy for a key that was supposed to have 2048
bits of structure and at least 112 bits of security. The keys affected
included OpenSSH host and user keys, TLS server keys and certificate
requests, OpenVPN keys, DNSSEC keys, and anything else made with OpenSSL's
generator on Debian 4.0 ("etch"), Ubuntu 7.04 to 8.04, and the systems built
on them.

The failure reached further than key generation, in two ways. **DSA keys
were exposed even if they had been made elsewhere.** A DSA signature needs a
random nonce, and the private key falls out of one signature whose nonce is
known ([Chapter 14](14-Attacks-on-Signatures-and-Nonces.md), §14.2). So a
perfectly good DSA key, generated on a healthy machine and then used once to
sign on an affected one (to log in over SSH, say), was compromised: the
attacker tried the 32,767 possible nonces against the signature. And **TLS
sessions were exposed even with good keys**, wherever the affected side
chose the session's secret values from the broken generator.

### Discovery

On 13 May 2008 Debian published security advisory DSA-1571-1 (CVE-2008-0166).
The bug had been found by Luciano Bello, a Debian developer in Argentina,
who had been checking the generator's behavior. The advisory was blunt: the
random number generator in Debian's OpenSSL package was predictable, and
"all cryptographic key material" created on affected systems since
September 2006 should be regenerated.

The attack tools appeared within days. H. D. Moore, the author of the
Metasploit framework, generated every possible SSH key for the common
types and architectures and published the lists; on a few machines that
took hours. Debian shipped `ssh-vulnkey`, a tool that checked a key against
the published blacklists, and packages of blacklists for OpenSSH, OpenSSL
and OpenVPN. Certificate authorities had to revoke and reissue certificates
whose keys were on the lists.

Replacing keys was slower than fixing code. In "When Private Keys are
Public" (2009), Scott Yilek, Eric Rescorla, Hovav Shacham, Brandon Enright
and Stefan Savage followed tens of thousands of TLS servers after the
announcement and found that many kept their weak keys for months, and that
some administrators replaced a weak key with another weak one by
regenerating on a system that was still unpatched. Years later, scans still
found keys from the Debian lists in use on the Internet.

### Code it

The toy below has one generator with the Debian property: its only input is
the process ID. It makes toy RSA moduli from 32-bit primes. The attacker
makes the whole table once, one key per process ID, then looks up any key
it meets.

```python
import hashlib

def is_prime(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:
        d, r = d // 2, r + 1
    for a in (2, 3, 5, 7, 11, 13, 17):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

class BrokenRand:
    """A toy generator whose only input is the process ID, as on Debian 2006-2008."""
    def __init__(self, pid):
        self.state = hashlib.sha256(b"pid" + pid.to_bytes(2, "big")).digest()
    def bits(self, n):
        self.state = hashlib.sha256(self.state).digest()
        return int.from_bytes(self.state, "big") >> (256 - n)

def keygen(pid, bits=32):            # a toy RSA modulus from two 32-bit primes
    r = BrokenRand(pid)
    primes = []
    while len(primes) < 2:
        c = r.bits(bits) | (1 << (bits - 1)) | 1
        if is_prime(c):
            primes.append(c)
    return primes[0] * primes[1]

# The attacker builds the whole table once: one key per possible process ID
table = {keygen(pid): pid for pid in range(1, 32768)}
print("distinct keys:", len(table))

victim = keygen(23_456)              # some server's "random" key
pid = table[victim]
print("found pid", pid, "for modulus", victim)
```

It prints:

```
distinct keys: 32767
found pid 23456 for modulus 13574412797683482529
```

The table took about two seconds to build. Notice what the attacker did
*not* do: it never factored anything. For real 2048-bit RSA keys the work is
the same in kind. Generating 32,767 keys of one type takes hours on one
machine (most of it spent finding primes), and once the list exists, finding
a victim's private key is a dictionary lookup on its public key. The SHA-256
in the toy is as strong as you like, and it does not help: a strong function
of 15 bits of input has 15 bits of output entropy.

### The lessons people drew

The Debian bug was argued about for years, and both sides had a point. The
change was made by a packager, not by OpenSSL's authors; it was asked about
on a public list, but on a list the core developers did not treat as the
place for such questions, and the reply came from someone who did not see
what the first line did. OpenSSL's code mixed in uninitialized memory on
purpose, which was clever and fragile. And nothing tested the property that
mattered: a check that two runs of the generator gave different output would
have caught the bug at once, but the generator's only tests checked that its
output looked random, and each run's output did.

The deepest lesson is the one this chapter keeps finding: **a generator's
output gives no sign of how much entropy went in.** The keys looked perfect.
Only reading the code, or comparing keys from many machines, could show that
they came from a list.

!!! note "Life story: the Debian OpenSSL bug"
    **Born:** September 2006, when Debian's OpenSSL package 0.9.8c-1 shipped
    with two `MD_Update` lines commented out to silence Valgrind; found by
    Luciano Bello and announced on 13 May 2008 (DSA-1571-1, CVE-2008-0166) ·
    **Purpose:** none; a debugging cleanup that removed every entropy input
    except the process ID · **Helped:** attackers to precompute all 32,767
    keys of each type and architecture, and to recover DSA keys from a single
    signature made on an affected machine; it also produced blacklists,
    `ssh-vulnkey`, and a lasting rule that distributions send cryptographic
    changes upstream · **Status:** fixed the day it was announced; weak keys
    from the lists stayed in use for years

## 18.4 Seed searches and state recovery

*Level: intermediate.*

Netscape and Debian were broken by the same method, and it is worth
separating it from the stories. An attacker who faces a weak generator has
three tools.

**Seed search.** Enumerate every seed the generator could have started from,
run the generator forward from each, and compare with something public. The
cost is

$$
\text{work} = (\text{number of seeds}) \times (\text{cost of one trial}),
$$

and the attacker's art is in shrinking the first factor with knowledge
(the time of the connection, the range of process IDs, the boot sequence of
a device) and the second by testing against the cheapest public value
available, such as a nonce that comes out before the expensive key.

**State recovery.** Some generators reveal their internal state through
their outputs. The attacker solves for the state from a few outputs, then
runs the generator forward (to predict) or, for many designs, backward (to
recover earlier secrets).

**Precomputation.** When the seed space is small and the same for every
victim, as with Debian, the attacker runs the search once, stores the
results, and then breaks each new victim with a lookup. This is the
time-memory trade-off of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)
in its simplest form: there are so few keys that the table holds all of them.

Figure 18.2 puts the seed spaces of this chapter on one scale.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Bars comparing seed spaces in bits: Debian 15, Java Random after one output 16, Netscape local attacker 20, a seed from a millisecond clock over a year 35, Java Random's whole state 48, a 128-bit key 128, a 256-bit seed 256" fill="currentColor" font-size="14">
<text x="180" y="34" text-anchor="end">Debian, 2006-2008</text>
<rect x="190" y="20" width="24" height="20" rx="2" fill="currentColor" opacity="0.75"/>
<text x="222" y="35">15 bits</text>
<text x="180" y="68" text-anchor="end">Java Random, seen once</text>
<rect x="190" y="54" width="25.6" height="20" rx="2" fill="currentColor" opacity="0.75"/>
<text x="224" y="69">16 bits</text>
<text x="180" y="102" text-anchor="end">Netscape, local</text>
<rect x="190" y="88" width="32" height="20" rx="2" fill="currentColor" opacity="0.75"/>
<text x="230" y="103">20 bits</text>
<text x="180" y="136" text-anchor="end">a year of milliseconds</text>
<rect x="190" y="122" width="56" height="20" rx="2" fill="currentColor" opacity="0.75"/>
<text x="254" y="137">35 bits</text>
<text x="180" y="170" text-anchor="end">Java Random, full</text>
<rect x="190" y="156" width="76.8" height="20" rx="2" fill="currentColor" opacity="0.75"/>
<text x="275" y="171">48 bits</text>
<text x="180" y="204" text-anchor="end">a 128-bit key</text>
<rect x="190" y="190" width="204.8" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="402" y="205">128 bits</text>
<text x="180" y="238" text-anchor="end">a 256-bit OS seed</text>
<rect x="190" y="224" width="409.6" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="590" y="239" text-anchor="end">256 bits</text>
<line x1="190" y1="12" x2="190" y2="256" stroke="currentColor" stroke-width="1"/>
<line x1="254" y1="12" x2="254" y2="256" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3"/>
<text x="254" y="276" text-anchor="middle" font-size="12">40 bits: a laptop, an afternoon</text>
<text x="320" y="310" text-anchor="middle" font-style="italic" font-size="13">Each bit doubles the search. Filled bars were searched in practice.</text>
</svg>
<figcaption>Figure 18.2. Seed spaces on one scale, in bits. Everything left of the dashed line falls to a laptop; the keys these seeds made were all 128 bits or more.</figcaption>
</figure>

### A clock is not a seed: the online poker shuffle

The purest case of seed search is a game. In 1999 a team at Reliable
Software Technologies (Brad Arkin, Frank Hill, Scott Marks, Matt Schmid and
Thomas Walls, with Gary McGraw) studied the shuffling code that the
company ASF Software had published for its online poker servers, to show
players that the game was fair. A deck of 52 cards can be shuffled in
$52! \approx 2^{226}$ ways. The code used a standard library generator with a
32-bit seed, so it could produce at most $2^{32}$ decks. Worse, the seed was
the number of milliseconds since midnight, of which there are only
86,400,000, about $2^{26}$. And a player whose clock was synchronized with
the server's could narrow that to a few hundred thousand candidates. After
seeing the first few cards of a hand, the team's program found the seed in
real time and showed every other player's cards and the cards still to come.

The arithmetic is the whole attack: $2^{226}$ was the security the shuffle
claimed, $2^{32}$ was what the generator allowed, $2^{26}$ was what the seed
allowed, and about $2^{18}$ was what the attacker had to search.

### Breaking Java's `Random` from two outputs

Many languages ship a fast generator for simulations next to a secure one
for secrets, and programmers keep using the fast one for secrets: session
identifiers, password-reset tokens, coupon codes. The most common fast
design is the **linear congruential generator** (LCG),

$$
x_{i+1} = (a\,x_i + c) \bmod m .
$$

Java's `java.util.Random` is an LCG with $m = 2^{48}$, $a =$ `0x5DEECE66D`
and $c = 11$, and its `nextInt()` returns the top 32 bits of the 48-bit state.
So one output reveals 32 of the 48 bits, and only 16 are hidden. An attacker
who sees one output tries all $2^{16} = 65{,}536$ values of the hidden bits,
steps each candidate forward once, and keeps the one that gives the second
output it saw. From then on it is in step with the victim.

```python
A, C, M = 0x5DEECE66D, 0xB, 2**48     # java.util.Random's constants

class JavaRandom:
    def __init__(self, seed):
        self.seed = (seed ^ A) % M
    def next_int(self):               # nextInt(): the top 32 of the 48 state bits
        self.seed = (A * self.seed + C) % M
        return self.seed >> 16

victim = JavaRandom(1_731_024_000_123)   # say, seeded from a clock in milliseconds
out1, out2 = victim.next_int(), victim.next_int()
print("seen:", out1, out2)

# The state after out1 is out1 * 2^16 + (16 unknown bits). Try them all.
for low in range(2**16):
    s = (out1 << 16) | low
    if ((A * s + C) % M) >> 16 == out2:
        break
clone = JavaRandom(0)
clone.seed = (A * s + C) % M             # now in step with the victim
print("predicted:", [clone.next_int() for _ in range(3)])
print("actual:   ", [victim.next_int() for _ in range(3)])
```

It prints:

```
seen: 581780820 572612980
predicted: [1164832708, 1794129233, 1636720483]
actual:    [1164832708, 1794129233, 1636720483]
```

(Java returns these as signed 32-bit integers; the toy keeps them unsigned,
which changes nothing in the attack.) Because the LCG step is invertible
modulo $2^{48}$ ($a$ is odd), the attacker can also run the generator
backwards and recover every earlier output, and the original seed.

### When the constants are secret too

Suppose a programmer, aware that the constants of standard generators are
public, writes an LCG with secret $a$, $c$ and $m$, and outputs the whole
state each time. This was studied by Joan Plumstead (later Joan Boyar) in
1982, and it falls to algebra. Let $t_i = x_{i+1} - x_i$. Subtracting
consecutive steps cancels $c$:

$$
t_{i+1} \equiv a\,t_i \pmod m ,
$$

so

$$
t_{i+2}\,t_i - t_{i+1}^2 \equiv a^2 t_i^2 - a^2 t_i^2 \equiv 0 \pmod m .
$$

Each such number is a multiple of $m$, and the gcd of a few of them is $m$
itself (or a small multiple of it, which a few more outputs remove). With
$m$ known, $a = t_1 / t_0 \bmod m$ and $c = x_1 - a x_0 \bmod m$.

```python
from math import gcd

def lcg(x, a, c, m):
    while True:
        x = (a * x + c) % m
        yield x

g = lcg(4_242_424_242, 1_103_515_245, 12_345, 2**31 - 1)   # parameters unknown to the attacker
xs = [next(g) for _ in range(8)]

# Step 1: the modulus. Differences t satisfy t[i+1] = a*t[i] mod m, so
# t[i+2]*t[i] - t[i+1]^2 is a multiple of m; the gcd of a few of them is m.
t = [b - a for a, b in zip(xs, xs[1:])]
m = 0
for i in range(len(t) - 2):
    m = gcd(m, abs(t[i + 2] * t[i] - t[i + 1] ** 2))
# Step 2: the multiplier and increment, by modular division
a = (xs[2] - xs[1]) * pow(xs[1] - xs[0], -1, m) % m
c = (xs[1] - a * xs[0]) % m
print("m =", m, " a =", a, " c =", c)
print("next output predicted:", (a * xs[-1] + c) % m, " actual:", next(g))
```

It prints:

```
m = 2147483647  a = 1103515245  c = 12345
next output predicted: 1597747339  actual: 1597747339
```

Eight outputs gave away all three secret parameters. When the generator
outputs only the top bits of each state, as Java's does, the hidden low bits
make the equations approximate rather than exact, and the tool becomes a
lattice: Alan Frieze, Johan Håstad, Ravi Kannan, Jeffrey Lagarias and Adi
Shamir showed in 1988 that truncated LCGs fall to lattice reduction too,
the same weapon [Chapter 15](15-Lattices-as-a-Weapon.md) aims at nonces.

### The Mersenne Twister, and the general lesson

Python's `random`, Ruby's, PHP's `mt_rand` and many others use the Mersenne
Twister, MT19937, which is far better than an LCG statistically. Its state
is 624 words of 32 bits, and each output is one state word passed through an
invertible "tempering" step. Book 1
([§4.10](../../book/04-Randomness-and-Perfect-Secrecy.md)) undoes the
tempering and clones the generator from 624 outputs, so it is not repeated
here. For PHP, where `mt_rand` was seeded with 32 bits, tools such as
`php_mt_seed` search all $2^{32}$ seeds from a single output in minutes, and
password-reset tokens made with it have been predicted in real web
applications.

The lesson is the same for every generator in this section. **Statistical
quality and unpredictability are different properties.** An LCG and the
Mersenne Twister are linear over some ring or field, so their outputs
satisfy equations, and equations can be solved. A cryptographic generator
is built so that its outputs satisfy no equation the attacker can solve:
its next-bit unpredictability rests on a cipher or a hash, not on a
statistical test.

## 18.5 Shared primes across the Internet

*Level: beginner.*

The Debian bug was found by reading code. The next failure was found by
reading keys: millions of them, collected from the whole Internet and
compared with each other.

### Two teams, one discovery

In 2011 and early 2012 two groups, independently, collected every RSA public
key they could find and asked a simple question: do any two of them share a
prime? An RSA modulus is $N = pq$. If two moduli share a prime, $N_1 = p q_1$
and $N_2 = p q_2$, then

$$
\gcd(N_1, N_2) = p ,
$$

and both keys are factored at once by Euclid's algorithm, which takes
microseconds. For properly generated 1024-bit keys this should never happen:
there are about $2^{502}$ primes of 512 bits, and the chance that two
independent choices collide is far smaller than the chance of guessing an AES
key.

The first group was Arjen Lenstra, James Hughes, Maxime Augier, Joppe Bos,
Thorsten Kleinjung and Christophe Wachter, working mostly at EPFL in
Lausanne. They gathered several million public keys, most of them from
X.509 certificates and PGP key servers, and posted their paper in February
2012 under a title that summarized their conclusion: "Ron was wrong, Whit is
right." About two of every thousand RSA moduli they collected offered no
security, because they shared a factor with another. The title is a joke
with a serious point. Ron Rivest is the R of RSA, which needs two secret
random primes per key; Whit Diffie is a creator of Diffie-Hellman, whose
keys are a single random number. A system that needs more secret randomness
per key, the authors argued, gives a bad generator more ways to fail. The
*New York Times* reported the paper on 14 February 2012.

The second group was Nadia Heninger, Zakir Durumeric, Eric Wustrow and
J. Alex Halderman, at the University of California, San Diego, and the
University of Michigan. They had found the same thing and were preparing to
publish; they released a summary the next day, titled "There's no need to
panic over factorable keys, just mind your Ps and Qs", and their full paper,
"Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network
Devices", won the best paper award at USENIX Security in August 2012. They
had scanned the whole IPv4 address space for TLS and SSH servers. They
found that they could compute the RSA private keys of 0.50% of the TLS hosts
and 0.03% of the SSH hosts, because their moduli shared factors, and the DSA
private keys of 1.03% of the SSH hosts, because their signatures repeated a
nonce or used related ones. More hosts, 5.57% of TLS hosts and 9.60% of SSH
hosts, used exactly the same key as some other host, mostly default keys
built into device firmware.

### Whose keys were they?

Heninger's team did what Lenstra's could not easily do: because their keys
came from live servers, they could look at what was answering. Almost none
of the weak keys belonged to ordinary web servers. They belonged to
**embedded network devices**: routers, firewalls, VPN gateways, remote
management cards, printers, and similar boxes, from dozens of manufacturers.
The team contacted the vendors before publishing.

The devices had something in common. Each generated its keys itself,
automatically, the first time it was switched on. And on the first boot of a
headless box, a computer with no keyboard, no mouse, often no disk and a
network that had not started yet, the operating system's generator had
gathered almost nothing.

### The boot-time entropy hole

Linux of that time collected entropy from the timing of keystrokes, mouse
movements, disk operations and some interrupts. A server or desktop gets
plenty of those. A router at first boot gets almost none: its storage is
flash memory with predictable timing, it has no human attached, and many
drivers did not contribute their interrupts to the pool at all. The
generator's state at boot was largely determined by the device's firmware,
which was the same on every unit of a model, plus the few events that had
happened so far.

`/dev/urandom` never blocked. It answered every request immediately,
whether or not it had been seeded. So the script that ran `ssh-keygen` or
made a TLS certificate at first boot got output from a generator whose state
was nearly the same on thousands of devices. Figure 18.3 shows the sequence.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="First boot of a headless device: key generation starts while the entropy pool is nearly empty; the first prime p is generated from the same state on many devices, then the clock ticks and the second prime q differs" fill="currentColor" font-size="14">
<line x1="40" y1="200" x2="610" y2="200" stroke="currentColor" stroke-width="1.6"/>
<polygon points="618,200 608,195 608,205"/>
<text x="610" y="224" text-anchor="end" font-size="12">time since power-on</text>
<path d="M40 196 L180 194 L300 190 L400 170 L500 120 L600 60" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="600" y="50" text-anchor="end" font-size="13">entropy gathered</text>
<line x1="60" y1="200" x2="60" y2="208" stroke="currentColor"/>
<text x="60" y="244" text-anchor="middle" font-size="12">kernel</text>
<text x="60" y="258" text-anchor="middle" font-size="12">starts</text>
<rect x="140" y="80" width="80" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="100" text-anchor="middle">make p</text>
<text x="180" y="116" text-anchor="middle" font-size="12">same state</text>
<line x1="180" y1="124" x2="180" y2="194" stroke="currentColor" stroke-dasharray="3 3"/>
<rect x="250" y="80" width="80" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="290" y="100" text-anchor="middle">make q</text>
<text x="290" y="116" text-anchor="middle" font-size="12">+ the time</text>
<line x1="290" y1="124" x2="290" y2="191" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="220" y1="102" x2="244" y2="102" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,102 242,98 242,106"/>
<text x="235" y="40" text-anchor="middle" font-weight="bold">first-boot key generation</text>
<text x="235" y="60" text-anchor="middle" font-size="12">(ssh-keygen, a self-signed certificate)</text>
<line x1="480" y1="200" x2="480" y2="208" stroke="currentColor"/>
<text x="480" y="244" text-anchor="middle" font-size="12">network up,</text>
<text x="480" y="258" text-anchor="middle" font-size="12">pool well seeded</text>
<text x="320" y="290" text-anchor="middle" font-style="italic" font-size="13">Many devices: same p, different q. One gcd factors both keys.</text>
</svg>
<figcaption>Figure 18.3. The boot-time entropy hole. Keys were made in the first seconds, before the pool had anything in it; the clock moved between the two primes, so devices shared p but not q.</figcaption>
</figure>

One detail explains why the devices shared *one* prime rather than whole
keys. If the generator's state had been identical throughout, two devices
would have made identical keys (and many did: that was part of the 5.57% and
9.60% of repeated keys). But OpenSSL mixes the current time into its pool as
it works. Heninger's team found that in many cases the first prime $p$ was
made before the clock had ticked to a new second, from a state that many
devices shared, and then the time changed, so the second prime $q$ was
different. A key that shares *one* prime with another is the worst outcome:
an identical key reveals nothing new to an outsider, but a shared prime
gives both factorizations to anyone who computes a gcd.

### What changed

Linux was fixed first. In the summer of 2012 Theodore Ts'o reworked the
kernel's generator (released in Linux 3.6) to mix in the timing of every
interrupt and device-specific data such as MAC addresses and serial
numbers, which differ between units even if they are not secret. In 2014
Linux 3.17 added the `getrandom()` system call, which by default blocks
until the generator has been seeded once and never after; it is the call
§18.13 recommends. Later versions went further: since Linux 5.4 (2019) the
kernel generates entropy at boot from CPU timing jitter if nothing else
arrives, so the wait is short.

The devices were fixed much more slowly, because firmware is updated
rarely and many devices never are. In 2016 Marcella Hastings, Joshua Fried
and Nadia Heninger revisited the problem ("Weak keys remain widespread in
network devices", IMC 2016) and found that most affected devices had never
been patched, and that vulnerable models were still being sold. Later
scans, including one by Keyfactor in 2019 over 75 million certificates,
kept finding shared factors, almost always from small devices.

A settlement on Mars would face the same hole in a sharp form: hundreds of
identical sensors and controllers unpacked and switched on in the same week,
each making its keys at first boot, on firmware flashed from one image, with
no human typing and no network yet. The fix is the same as on Earth: give
each unit a seed at manufacture, or wait for real entropy before making a
key.

!!! note "Life story: the shared-factor survey"
    **Born:** February 2012, two independent teams: Arjen Lenstra and
    colleagues ("Ron was wrong, Whit is right") and Nadia Heninger, Zakir
    Durumeric, Eric Wustrow and J. Alex Halderman ("Mining Your Ps and Qs",
    USENIX Security 2012, best paper) · **Purpose:** to test, across the
    whole Internet, the assumption that different keys are made from
    different random choices · **Helped:** factor tens of thousands of RSA
    keys and recover DSA keys from repeated nonces, almost all on embedded
    devices; prompted the Linux 3.6 changes and `getrandom()`; made
    Internet-wide key scanning a standing practice · **Status:** the
    weakness persists in old and cheap devices; repeated scans still find
    shared factors

## 18.6 Batch gcd: millions of keys at once

*Level: intermediate.*

Heninger's team had about 11 million distinct RSA moduli. Checking every
pair with Euclid's algorithm means about $n^2/2 \approx 6 \times 10^{13}$
gcds of 1024-bit numbers: years of computer time. Batch gcd, due to Daniel
Bernstein, answers the real question, "does $N_i$ share a factor with *any*
other modulus?", for all $i$ at once, in time close to that of multiplying
all the moduli together.

### The idea

Let $P = N_1 N_2 \cdots N_n$ be the product of all the moduli. Then
$P / N_i$ is the product of all the *other* moduli, and

$$
g_i = \gcd\!\left(\frac{P}{N_i} \bmod N_i,\; N_i\right)
$$

is the part of $N_i$ that it shares with the rest. If $g_i = 1$ the key
shares nothing; if $g_i$ is a prime, the key is factored. (If $g_i = N_i$,
both primes of $N_i$ appear elsewhere, often because the same key is
repeated; then a pairwise check among the few such keys sorts it out.)

Computing $P/N_i \bmod N_i$ directly for each $i$ would cost a division of a
gigantic number per key. Two tricks make it cheap.

The first: $P/N_i \bmod N_i$ can be read off from $P \bmod N_i^2$. If
$P \bmod N_i^2 = r$, then $P = q N_i^2 + r$ for some $q$, and since $N_i$
divides $P$ it also divides $r$, so

$$
\frac{P}{N_i} = q N_i + \frac{r}{N_i}, \qquad
\frac{P}{N_i} \bmod N_i = \frac{r}{N_i} \bmod N_i .
$$

The second: compute all the $P \bmod N_i^2$ with two trees.

1. **Product tree.** Put the moduli at the leaves. Each node is the product
   of its two children. The root is $P$. Each level holds the same total
   number of digits, so with fast multiplication the whole tree costs about
   $\log_2 n$ big multiplications' worth of work.
2. **Remainder tree.** Go back down. The root holds $P$. Each node replaces
   its parent's value by that value modulo the square of its own product
   from the product tree. Since $X \bmod (ab)^2$ determines $X \bmod a^2$,
   reducing step by step gives the same answer as reducing $P$ directly, but
   every division is by a number about the size of the one being divided.
   The leaves end up holding $P \bmod N_i^2$.

### By hand

Take four tiny "keys": $N_1 = 35 = 5 \cdot 7$, $N_2 = 55 = 5 \cdot 11$,
$N_3 = 221 = 13 \cdot 17$ and $N_4 = 323 = 17 \cdot 19$. Pretend you do not
know the factors.

<div class="mars-steps" markdown>

1. **Product tree.** $35 \cdot 55 = 1925$ and $221 \cdot 323 = 71{,}383$.
   The root is $P = 1925 \cdot 71{,}383 = 137{,}412{,}275$.
2. **Remainder tree, first level.** $1925^2 = 3{,}705{,}625$ and
   $137{,}412{,}275 = 37 \cdot 3{,}705{,}625 + 304{,}150$, so the left node
   holds $304{,}150$. $71{,}383^2 = 5{,}095{,}532{,}689$ is larger than $P$, so
   the right node keeps $137{,}412{,}275$.
3. **Leaves.** $304{,}150 \bmod 35^2 = 304{,}150 \bmod 1225 = 350$ and
   $304{,}150 \bmod 55^2 = 304{,}150 \bmod 3025 = 1650$. On the right,
   $137{,}412{,}275 \bmod 221^2 = 137{,}412{,}275 \bmod 48{,}841 = 22{,}542$ and
   $137{,}412{,}275 \bmod 323^2 = 137{,}412{,}275 \bmod 104{,}329 = 10{,}982$.
4. **Divide by $N_i$.** $350/35 = 10$, $1650/55 = 30$, $22{,}542/221 = 102$,
   $10{,}982/323 = 34$. Each division is exact, as it must be.
5. **Gcd.** $\gcd(10, 35) = 5$, $\gcd(30, 55) = 5$, $\gcd(102, 221) = 17$,
   $\gcd(34, 323) = 17$. All four keys are factored: $35 = 5 \cdot 7$,
   $55 = 5 \cdot 11$, $221 = 17 \cdot 13$, $323 = 17 \cdot 19$.

</div>

Figure 18.4 shows the same computation as two trees.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Product tree from the leaves 35, 55, 221, 323 up to the root 137,412,275, and remainder tree back down to the leaves 350, 1650, 22542, 10982, giving the shared factors 5, 5, 17, 17" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">product tree (up)</text>
<rect x="95" y="36" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="56" text-anchor="middle">137,412,275</text>
<rect x="20" y="106" width="110" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="126" text-anchor="middle">1,925</text>
<rect x="190" y="106" width="110" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="245" y="126" text-anchor="middle">71,383</text>
<line x1="75" y1="106" x2="140" y2="66" stroke="currentColor" stroke-width="1.2"/>
<line x1="245" y1="106" x2="180" y2="66" stroke="currentColor" stroke-width="1.2"/>
<rect x="10" y="176" width="60" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="40" y="196" text-anchor="middle">35</text>
<rect x="80" y="176" width="60" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="196" text-anchor="middle">55</text>
<rect x="180" y="176" width="60" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="210" y="196" text-anchor="middle">221</text>
<rect x="250" y="176" width="60" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="280" y="196" text-anchor="middle">323</text>
<line x1="40" y1="176" x2="65" y2="136" stroke="currentColor" stroke-width="1.2"/>
<line x1="110" y1="176" x2="85" y2="136" stroke="currentColor" stroke-width="1.2"/>
<line x1="210" y1="176" x2="235" y2="136" stroke="currentColor" stroke-width="1.2"/>
<line x1="280" y1="176" x2="255" y2="136" stroke="currentColor" stroke-width="1.2"/>
<text x="480" y="22" text-anchor="middle" font-weight="bold">remainder tree (down)</text>
<rect x="415" y="36" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="56" text-anchor="middle">P</text>
<rect x="340" y="106" width="110" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="126" text-anchor="middle">304,150</text>
<rect x="510" y="106" width="120" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="126" text-anchor="middle">137,412,275</text>
<line x1="460" y1="66" x2="395" y2="106" stroke="currentColor" stroke-width="1.2"/>
<line x1="500" y1="66" x2="570" y2="106" stroke="currentColor" stroke-width="1.2"/>
<text x="395" y="152" text-anchor="middle" font-size="11">P mod 1925²</text>
<text x="570" y="152" text-anchor="middle" font-size="11">P mod 71383²</text>
<rect x="330" y="176" width="64" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="362" y="196" text-anchor="middle">350</text>
<rect x="400" y="176" width="64" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="432" y="196" text-anchor="middle">1,650</text>
<rect x="490" y="176" width="70" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="196" text-anchor="middle">22,542</text>
<rect x="566" y="176" width="70" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="601" y="196" text-anchor="middle">10,982</text>
<line x1="385" y1="136" x2="362" y2="176" stroke="currentColor" stroke-width="1.2"/>
<line x1="405" y1="136" x2="432" y2="176" stroke="currentColor" stroke-width="1.2"/>
<line x1="560" y1="136" x2="525" y2="176" stroke="currentColor" stroke-width="1.2"/>
<line x1="580" y1="136" x2="601" y2="176" stroke="currentColor" stroke-width="1.2"/>
<text x="480" y="232" text-anchor="middle" font-size="12">leaf = P mod Nᵢ²</text>
<text x="480" y="262" text-anchor="middle">÷ Nᵢ :  10, 30, 102, 34</text>
<text x="480" y="290" text-anchor="middle" font-weight="bold">gcd with Nᵢ :  5, 5, 17, 17</text>
<text x="160" y="232" text-anchor="middle" font-size="12">leaves: the moduli Nᵢ</text>
<text x="160" y="262" text-anchor="middle" font-size="12">each node: product of children</text>
<text x="320" y="320" text-anchor="middle" font-style="italic" font-size="13">The trees have log₂ n levels; each level is as big as the root.</text>
</svg>
<figcaption>Figure 18.4. Batch gcd on four toy keys. Up the product tree to P, down the remainder tree to P mod Nᵢ², then one small gcd per key.</figcaption>
</figure>

### Code it

The code below is the whole algorithm. The first part runs it on six toy
moduli, three of which share the prime 1009, as three devices that booted
into the same state would.

```python
from math import gcd, prod

def product_tree(xs):
    tree = [xs]
    while len(tree[-1]) > 1:
        level = tree[-1]
        tree.append([prod(level[i:i + 2]) for i in range(0, len(level), 2)])
    return tree

def batch_gcd(ns):
    tree = product_tree(ns)
    rems = tree.pop()                     # [P], the product of all moduli
    while tree:
        level = tree.pop()
        rems = [rems[i // 2] % (x * x) for i, x in enumerate(level)]
    return [gcd(r // n, n) for r, n in zip(rems, ns)]

# Six toy RSA moduli. Three devices booted with the same early state and chose
# the same first prime 1009; their second primes differ.
ns = [1009 * 1013, 1019 * 1021, 1009 * 1031, 1033 * 1039, 1009 * 1049, 1051 * 1061]
print(product_tree(ns)[-1])
for n, g in zip(ns, batch_gcd(ns)):
    print(n, g, "factored: %d x %d" % (g, n // g) if g > 1 else "")
```

It prints:

```
[1401364116323154827008228672745357909]
1022117 1009 factored: 1009 x 1013
1040399 1 
1040279 1009 factored: 1009 x 1031
1073287 1 
1058441 1009 factored: 1009 x 1049
1115111 1 
```

The tree code works for any number of moduli, including odd counts (a lone
node is carried up as a product of one). On a simulated population of 2,000
keys with 512-bit moduli, where 40 devices booted into one of five shared
states, the same function factors exactly those 40 keys in a few seconds of
Python. Real runs use GMP, whose multiplication is fast enough for the
quasi-linear cost to show: Heninger's team processed their 11 million
moduli in hours rather than years, and the open-source tool they
released, `fastgcd`, is still used for Internet-wide scans.

**What batch gcd does not find.** It finds keys that share a prime with
another key *in the same batch*. A device whose state was unique, but small
(say, 32 bits), makes keys that share nothing with anyone in a scan and are
still weak. Batch gcd measures one symptom of a bad generator, the most
visible one. It is a lower bound on the trouble.

### The Taiwan citizen cards

In 2013 batch gcd found weak keys in a place where nobody expected them:
government smart cards with security certifications. Taiwan's "Citizen
Digital Certificate" lets citizens sign documents and file taxes with a key
held on a card, and the government publishes the certificates. Daniel
Bernstein, Yun-An Chang, Chen-Mou Cheng, Li-Ping Chou, Nadia Heninger, Tanja
Lange and Nicko van Someren downloaded more than two million 1024-bit RSA
keys from the database and ran batch gcd. It factored 103 of them. Looking at
the shared primes, the team saw that they were not random-looking at all:
many had long repeating bit patterns, such as a word of `0xc0000000`
followed by zeros and a few final bits, as if the card's hardware generator
had been stuck or had failed into a short cycle while software only fixed up
the low bits to make the number prime. Guessing such patterns and finishing
the job with Coppersmith's method (this book's [Chapter 13](13-Attacks-on-RSA.md),
§13.7) factored more keys that shared no prime with any other, bringing the
total to 184. The cards had passed FIPS 140-2 Level 2 and Common Criteria
evaluations. Their generator's health tests, if they ran, did not stop it.
The paper's title, "Factoring RSA keys from certified smart cards:
Coppersmith in the wild" (ASIACRYPT 2013), names both lessons.

!!! note "Life story: the Taiwan citizen card keys"
    **Born:** 2012 to 2013, Daniel Bernstein, Yun-An Chang, Chen-Mou Cheng,
    Li-Ping Chou, Nadia Heninger, Tanja Lange and Nicko van Someren;
    published at ASIACRYPT 2013 · **Purpose:** to check the keys of Taiwan's
    national Citizen Digital Certificate cards for the shared-factor problem
    · **Helped:** factor 103 keys by batch gcd and 184 in all by guessing the
    patterned primes and applying Coppersmith's method; showed that
    certified hardware generators can fail in ways no certification caught ·
    **Status:** the affected cards were replaced; the paper is the standard
    example of hardware generators failing silently

## 18.7 Android, 2013: the wallets that repeated themselves

*Level: beginner.*

Bitcoin makes random-number failures cost money, in public, within hours.
Every Bitcoin transaction is signed with ECDSA, and every ECDSA signature
needs a fresh secret nonce $k$. [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)
(§14.2 and §14.5) has the algebra: if one key signs two messages with the
same $k$, both signatures show the same value $r$, and anyone can solve two
linear equations for the private key. On the blockchain all signatures are
public forever, so thieves run programs that index every signature by $r$
and spend from any key that repeats.

### What happened

On 11 August 2013 the Bitcoin project published a security warning: every
Bitcoin wallet app on Android that generated its own keys and signatures was
vulnerable, and users should treat their coins as at risk. The warning came
after thefts. A few hours after one wallet signed transactions with a
repeated nonce, more than 55 bitcoins were moved from affected addresses to
a single address controlled by the thief, worth some thousands of dollars at
the price of the day. (The figure comes from community reports of the
transactions; the total taken by all thieves is not known.) The wallets
named were the most popular ones of the time: Bitcoin Wallet, BitcoinSpinner,
Mycelium and Blockchain.info's app.

The wallets' code was correct. Each asked Java's standard secure generator,
`java.security.SecureRandom`, for the nonce, exactly as the Java
documentation advised. The fault was in Android's implementation of that
generator.

### The generator

On 14 August 2013 Google confirmed the problem in a post on the Android
developers blog: applications that used the Java Cryptography Architecture
for key generation, signing or random number generation "may not receive
cryptographically strong values on Android devices due to improper
initialization of the underlying PRNG". The post gave developers a patch
class to install at start-up, which seeded the generator explicitly from
`/dev/urandom` and replaced the default with one that read `/dev/urandom`
directly, and Google sent a fix to phone makers.

Google's post did not describe the bug in detail, and the exact cause has
never been told officially. Independent researchers had already pointed at
two weaknesses, and either fits what was seen:

- **A bug in the Java generator.** Android's default `SHA1PRNG` came from
  the Apache Harmony project. Earlier in 2013 Kai Michaelis, Christopher
  Meyer and Jörg Schwenk ("Randomly Failed!", CT-RSA 2013) reported an
  error in how it handled its internal state that could reduce the entropy
  of its output drastically in some uses.
- **A generator copied at birth.** Every Android app starts as a copy
  (a `fork`) of one parent process, the Zygote, which is created at boot.
  The native OpenSSL generator inside it was seeded once, in the Zygote, and
  each app then inherited the same state. Unless an app added fresh entropy
  of its own, two apps, or two runs of one app, could draw the same "random"
  numbers. Soo Hyeon Kim, Daewan Han and Dong Hoon Lee analyzed this at ACM
  CCS 2013 and showed how predictable the Android OpenSSL generator was.

The second weakness is a general one and has bitten many systems: **a
process that forks, or a virtual machine that is cloned, duplicates its
generator state**. Two copies then produce the same "random" output until
something new is mixed in. §18.13 returns to it.

### Afterwards

Fixing the wallets was quick: each was updated within days to read
`/dev/urandom` itself. Fixing the keys was not. Every key that had ever
signed with a weak nonce might already be known to someone, so the updated
wallets generated new keys and moved the user's coins to them, and users who
had backups of old keys were told not to reuse them. The incident is the
second great example in [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)
after the PlayStation 3, and it is the reason most wallets today use
deterministic nonces (RFC 6979) or hedged nonces, which do not depend on the
generator at signing time at all.

!!! note "Life story: the Android SecureRandom failure"
    **Born:** found through Bitcoin thefts in August 2013; Bitcoin warning
    on 11 August, Google's confirmation on 14 August 2013 · **Purpose:**
    none; an improperly initialized `SecureRandom` on Android, with
    weaknesses in Harmony's `SHA1PRNG` and in the OpenSSL generator shared
    by every app forked from the Zygote · **Helped:** thieves to compute
    private keys from repeated ECDSA nonces, more than 55 bitcoins in the
    best-documented case; it pushed wallets to RFC 6979 nonces and Android to
    read the kernel generator directly · **Status:** fixed in Android and in
    the wallets in 2013; the keys exposed then stay exposed

## 18.8 ROCA: primes with a fingerprint

*Level: intermediate.*

Every failure so far had too little entropy. ROCA had plenty: its keys could
not be listed or found by gcd. Their weakness was **structure**. A key
generator, trying to be fast, made primes of a special shape, and the shape
was visible in every public key it produced.

### The story

Infineon Technologies, a German chip maker, supplied a software library,
known as RSALib, for generating RSA keys inside its secure chips. Those chips
were everywhere security mattered: national identity cards, Trusted Platform
Modules (the TPM chips in laptops and Chromebooks that hold disk-encryption
and login keys), YubiKey 4 tokens, payment and access cards. The library had
been in products since at least 2012, and it was certified: the chips had
Common Criteria and FIPS 140-2 certificates.

Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš of
Masaryk University in Brno, Czech Republic, had collected and studied keys
from many smart cards and libraries, looking at statistical properties of
the primes. Keys from Infineon chips stood out. They worked out the
structure, then a way to factor such keys, and told Infineon in early
February 2017. After an eight-month embargo, during which Infineon and the
makers of affected products prepared fixes, they published on 16 October
2017 (CVE-2017-15361), and presented "The Return of Coppersmith's Attack:
Practical Factorization of Widely Used RSA Moduli" at ACM CCS 2017 in
November. The initials of that title gave the attack its name.

### The structure of the weak primes

Infineon's primes had the form

$$
p = k \cdot M + (65537^{a} \bmod M),
$$

where $M$ is a **primorial**, the product of the first $n$ primes
$2 \cdot 3 \cdot 5 \cdots$, and $k$ and $a$ are the random parts. For
2048-bit keys, with 1024-bit primes, $M$ is the product of the first 126
primes, a number of about 971 bits. Figure 18.5 shows what is left.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A random 1024-bit prime has about 1014 bits of entropy. An Infineon prime is k times M plus 65537 to the a mod M: k has only about 53 bits, and 65537 to the a mod M takes one of about 2 to the 255 values, so the prime has far fewer possibilities" fill="currentColor" font-size="14">
<text x="20" y="30" font-weight="bold">a random 1024-bit prime</text>
<rect x="20" y="42" width="600" height="34" rx="4" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="64" text-anchor="middle">about 1014 bits of free choice</text>
<text x="20" y="116" font-weight="bold">an RSALib prime, p = k·M + (65537ᵃ mod M)</text>
<rect x="20" y="128" width="32" height="34" rx="4" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.3"/>
<text x="36" y="182" text-anchor="middle" font-size="12">k</text>
<text x="36" y="198" text-anchor="middle" font-size="12">~53 bits</text>
<rect x="52" y="128" width="568" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="336" y="150" text-anchor="middle">65537ᵃ mod M: one of about 2²⁵⁵ values</text>
<text x="336" y="182" text-anchor="middle" font-size="12">M = 2·3·5·…·701, the first 126 primes (971 bits)</text>
<text x="320" y="236" text-anchor="middle" font-style="italic" font-size="13">The modulus N = pq carries the same pattern: N mod r lies in a small subgroup for every r dividing M.</text>
</svg>
<figcaption>Figure 18.5. Where ROCA's primes keep their randomness. The prime is a short multiplier k times a fixed number M, plus a power of 65537: about 308 bits of choice where 1014 were expected. Sizes are for 2048-bit keys.</figcaption>
</figure>

The design is understandable. Primes of this form are quick to find: $p$ is
automatically not divisible by any of the first 126 primes (because
$65537^a \bmod M$ is a unit modulo each of them), so most of the work of
weeding out composite candidates is done in advance. But the count of
possible primes collapses. The value $65537^a \bmod M$ can take only as many
values as the multiplicative order of 65537 modulo $M$, which for this $M$
is a number of about 255 bits; and $k$ has only the remaining length of
the prime, about 53 bits. Instead of roughly $2^{1014}$ primes of 1024 bits,
the library chose from about $2^{308}$ candidates. That is still far too
many to list, so neither Debian's method nor batch gcd works. But the structure
gives two other attacks.

### The fingerprint

Take any small prime $r$ that divides $M$. Modulo $r$, each prime is
$p \equiv 65537^{a} \pmod r$, a power of 65537. So is $q$, and so the
public modulus satisfies

$$
N = pq \equiv 65537^{a + b} \pmod r .
$$

$N \bmod r$ must lie in the **subgroup generated by 65537** modulo $r$. For
some small primes that subgroup is tiny. Work it out by hand for two of
them:

- $r = 11$: $65537 = 2^{16} + 1$, and $2^{10} \equiv 1 \pmod{11}$, so
  $65537 \equiv 2^6 + 1 = 65 \equiv 10 \pmod{11}$. Then $10^2 = 100 \equiv 1$.
  The subgroup is $\{1, 10\}$: 2 of the 10 nonzero residues.
- $r = 37$: $65537 \equiv 10 \pmod{37}$ (since $37 \cdot 1771 = 65527$), and
  $10^2 = 100 \equiv 26$, $10^3 \equiv 260 \equiv 1$. The subgroup is
  $\{1, 10, 26\}$: 3 of 36.

A random modulus passes the test at 11 with probability $2/10$, and at 37 with
probability $3/36$; both at once, $1/60$. Now build a toy RSALib key with
$M = 11 \cdot 37 = 407$. Since $65537 \equiv 10 \pmod{407}$, the toy primes
are $k \cdot 407 + 10^a \bmod 407$. With $10^2 = 100$ and $k = 3$,
$p = 1221 + 100 = 1321$, a prime. With $10^3 \bmod 407 = 186$ and $k = 1$,
$q = 407 + 186 = 593$, also prime. Then $N = 1321 \cdot 593 = 783{,}353$, and
$783{,}353 \bmod 11 = 10$ and $783{,}353 \bmod 37 = 26$: both in their
subgroups, as they must be. A nearby number that was not made this way,
$783{,}355$, gives $1$ modulo 11 (in the subgroup, by chance) but $28$
modulo 37 (not in it), so it is not an RSALib key.

The real test checks dozens of primes $r$ at once. For each, it asks whether
$N \bmod r$ has a discrete logarithm to the base 65537, which is trivial for
such small $r$. A genuine RSALib key passes every check; a random key fails
almost surely. The researchers' test had no false negatives and a false
positive rate far too small to matter, and it takes a fraction of a
millisecond per key. Anyone could check any key: a TPM's
public key, a key in a certificate, a PGP key on a key server, an ID card's
certificate in a public directory.

### Code it

The code makes toy RSALib keys with $M$ the product of the first 20 primes
(about $2^{89}$), makes ordinary random keys of the same size, and runs the
fingerprint on all of them.

```python
import random
from math import prod

SMALL = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]
M = prod(SMALL)                          # about 2^89

def is_prime(n, rounds=20, rnd=random.Random(1)):
    if n < 2 or any(n % q == 0 for q in SMALL):
        return n in SMALL
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for _ in range(rounds):
        x = pow(rnd.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def weak_prime(rnd):                     # the RSALib shape: p = k*M + (65537^a mod M)
    while True:
        k = rnd.getrandbits(40)
        a = rnd.randrange(1, 2**20)
        p = k * M + pow(65537, a, M)
        if is_prime(p):
            return p

def good_prime(rnd):
    while True:
        p = rnd.getrandbits(129) | 1
        if is_prime(p):
            return p

def subgroup(r):                         # the powers of 65537 modulo r
    seen, x = set(), 1
    while x not in seen:
        seen.add(x)
        x = x * 65537 % r
    return seen

GROUPS = {r: subgroup(r) for r in SMALL}

def fingerprint(n):                      # True if n looks like an RSALib modulus
    return all(n % r in GROUPS[r] for r in SMALL)

rnd = random.Random(2017)                # a simulation, not for real keys
weak = [weak_prime(rnd) * weak_prime(rnd) for _ in range(200)]
good = [good_prime(rnd) * good_prime(rnd) for _ in range(200)]
print("weak keys flagged:", sum(map(fingerprint, weak)), "of 200")
print("good keys flagged:", sum(map(fingerprint, good)), "of 200")
chance = prod(len(GROUPS[r]) / (r - 1) for r in SMALL[1:])
print("chance a random key passes: about 1 in %.0f" % (1 / chance))
```

It prints:

```
weak keys flagged: 200 of 200
good keys flagged: 0 of 200
chance a random key passes: about 1 in 5760
```

With only 19 odd primes, a random key slips through about once in 5,760
tries. The real test uses many more primes $r$, and the subgroups for
several of them are very small (the order of 65537 is 3 modulo 37, 6 modulo
97, 13 modulo 79), so the chance falls far below anything that matters.

### From fingerprint to factors

A fingerprint is embarrassing; a factorization is a break. The researchers
factored the keys with Coppersmith's method, which [Chapter 13](13-Attacks-on-RSA.md)
(§13.6 and §13.7) develops in full: given an approximation of a factor $p$
of $N$, good to about half of $p$'s bits, it finds $p$ in polynomial time.

The plan is to guess the part of $p$ that has little entropy and let
Coppersmith find the rest. Write $p = k' M' + (65537^{a'} \bmod M')$ for a
well-chosen divisor $M'$ of $M$; such an expression always exists, since
reducing the structure modulo a divisor of $M$ keeps it. $M'$ is chosen
so that two things hold at once: $M'$ is larger than about $N^{1/4}$, so
that the unknown $k'$ is small enough for Coppersmith's method, and the
order of 65537 modulo $M'$ is as small as possible, so that there are few
values of $a'$ to try. For each guess of $a'$, the equation
$k' M' + (65537^{a'} \bmod M') \equiv 0 \pmod p$ is a linear polynomial in
$k'$ with a small root modulo an unknown factor of $N$, which is exactly the
problem Howgrave-Graham's lattice solves. The right guess of $a'$ gives $p$.

The cost is the number of guesses times the cost of one lattice reduction.
The researchers' worst-case estimates, for one core, were under three
CPU-months for a 1024-bit key and about 100 CPU-years (140.8 in their
table) for a 2048-bit key; the expected cost is half of that. Because each
guess is independent, the work splits across machines perfectly. On Amazon's
cloud of 2017 they priced the worst case at about \$76 for a 1024-bit key and
about \$40,000 for a 2048-bit key. A 4096-bit key made by the library was not
practically factorable by this method, though it still carried the
fingerprint.

### Estonia and the others

The most visible victim was Estonia, which has one of the most digital
governments in the world: its ID card signs contracts, votes and
prescriptions. On 30 August 2017, while the research was still under
embargo, Estonia announced that a "theoretical vulnerability" affected the
roughly 750,000 ID cards it had issued since October 2014. On 3 November
2017 it suspended the certificates on those cards, and citizens updated
their cards' keys remotely or at police offices over the following months.
Slovakia's eID cards, using the same chips, were affected too. Estonia's
Police and Border Guard Board later went to court against the card's
supplier, Gemalto, over the cost.

Elsewhere, Microsoft, Google, HP, Lenovo and Fujitsu issued advisories and
firmware updates for TPMs; Google's Chromebooks were affected through their
TPMs; Yubico replaced affected YubiKey 4 tokens for free; and several
code-signing and certificate authorities checked their keys. Keys already
issued had to be replaced, because a firmware update cannot change a public
key that has been certified.

ROCA joins Taiwan in a lesson about certification. RSALib had passed formal
evaluations, but those checked that the library did what its specification
said, and the specification itself was the problem. The method was secret,
and once outsiders could look at the output, it took them months to see
what evaluators had not.

!!! note "Life story: ROCA"
    **Born:** found by Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and
    Vashek Matyáš of Masaryk University; reported to Infineon in February
    2017, published 16 October 2017 (CVE-2017-15361), presented at ACM CCS
    2017 · **Purpose:** to show that Infineon's RSALib made primes of the
    form $kM + (65537^a \bmod M)$, which a public key reveals at once and
    Coppersmith's method factors · **Helped:** a public fingerprint test
    for any RSA key; the replacement of the keys on about 750,000 Estonian
    ID cards and on Slovak cards, TPMs and security tokens · **Status:** the
    library was fixed in 2017; certified keys made before then had to be
    replaced, and 4096-bit keys remain fingerprinted but unfactored

## 18.9 Dual_EC_DRBG: the story

*Level: beginner.*

Every failure so far was an accident. Dual_EC_DRBG is the case where the
generator itself appears to have been designed so that one party could
predict it. Book 1 ([§15.8](../../book/15-Elliptic-Curves.md)) shows the
trapdoor in one equation; this section and the next two tell the story,
work the mathematics on a toy curve, and follow the generator into
Juniper's firewalls.

### A generator in a standard

In the early 2000s the American banking standards committee X9 began a
standard for random bit generators, ANSI X9.82, and NIST worked on its own
version. The NSA contributed a design based on elliptic curves, the Dual
Elliptic Curve Deterministic Random Bit Generator. It was included in the
international standard ISO/IEC 18031 in 2005 and in NIST's
**SP 800-90** in June 2006, next to three generators built from hash
functions and block ciphers: Hash_DRBG, HMAC_DRBG and CTR_DRBG. The 2012
reissue was called SP 800-90A.

Dual_EC_DRBG was strange from the start. It was slow: each output block
costs two elliptic-curve scalar multiplications, hundreds of times the cost
of a block of AES. Its security argument depended on a problem, telling a
truncated $x$-coordinate from random bits, that was less studied than the
problems under the other three. And it used two fixed points on each curve,
$P$ and $Q$, printed in an appendix with no explanation of how they had been
chosen. The standard allowed users to generate their own points, but an
implementation that wanted FIPS 140-2 validation was in practice expected to
use the published ones.

The doubts were public early. In 2006 Kristian Gjøsteen, and independently
Berry Schoenmakers and Andrey Sidorenko, showed that the output was
measurably biased: the generator drops only 16 bits from each 256-bit
$x$-coordinate, too few to hide the fact that $x$-coordinates of points are
not uniformly distributed numbers. The bias is small, but a cryptographic
generator is supposed to have none that anyone can measure. And Certicom
researchers, Daniel Brown among them, had filed a patent application in
early 2005 that described how a generator of this kind could be used for
**key escrow**: whoever knew the relation between the two points could
recover the generator's state.

In August 2007 Dan Shumow and Niels Ferguson of Microsoft gave a short talk
at the rump session of the CRYPTO conference: "On the Possibility of a Back
Door in the NIST SP800-90 Dual Ec Prng". Their argument took a few slides.
If someone knows a number $e$ with $P = eQ$, then about 32 bytes of the
generator's output reveal its internal state, and from then on every output
is predictable. Nobody can tell from $P$ and $Q$ whether such an $e$ is
known: anyone who picked $Q$ first and then set $P = eQ$ would know it, and
the points look the same either way. Bruce Schneier wrote in *Wired* in
November 2007 that he would recommend against the generator, and most
cryptographers simply avoided it.

### 2013

On 5 September 2013 the *New York Times*, the *Guardian* and ProPublica
published stories based on documents taken from the NSA by Edward Snowden.
They described a program, code-named BULLRUN, to weaken commercial
encryption, including by influencing standards. The *Times* reported that
the documents appeared to confirm that a 2006 NIST standard contained a
weakness inserted by the NSA, and described the agency as having become the
standard's sole editor; the standard matched Dual_EC_DRBG. The NSA has never
publicly confirmed that it knows a trapdoor for the points, and the
documents themselves were not published in full. What the record shows is
that the points came from the NSA, that their origin was not explained, and
that the structure allows a trapdoor.

The consequences were fast. On 10 September 2013 NIST reopened SP 800-90A
for public comment and recommended that Dual_EC_DRBG not be used. On
19 September RSA Security told customers of its BSAFE toolkits, in which
Dual_EC_DRBG had been the **default** generator since 2004, to switch to
another. On 20 December 2013 Reuters reported that RSA had been paid
\$10 million by the NSA in a contract that made Dual_EC_DRBG the default;
RSA denied that it had ever knowingly weakened its products. NIST removed
the generator in a draft revision in April 2014, a review by its Visiting
Committee on Advanced Technology criticized how NIST had handled NSA input,
and SP 800-90A Revision 1, without Dual_EC_DRBG, was published in June 2015.

### Was it ever exploitable?

A generator nobody uses is a curiosity. The question after 2013 was whether
real products exposed enough output for the trapdoor to work. In 2014
Stephen Checkoway, Matthew Fredrikson, Ruben Niederhagen, Adam Everspaugh,
Matthew Green, Tanja Lange, Thomas Ristenpart, Daniel Bernstein, Jake
Maskiewicz and Hovav Shacham answered it for TLS ("On the Practical
Exploitability of Dual EC in TLS Implementations", USENIX Security 2014).
They could not know the NSA's $e$, so they generated their own $Q$ with a
known $e$, patched it into the libraries in place of the published point,
and measured how long it took to recover TLS session keys from recorded
handshakes. For RSA's BSAFE C library it took seconds; Microsoft's SChannel
and the BSAFE Java library took longer but were exploitable. The TLS server
random sends some of the generator's output in the clear, and some versions
of BSAFE supported an "Extended Random" extension, proposed to the IETF but
never standardized, that made the server send even more. OpenSSL's FIPS
module offered Dual_EC_DRBG too, but, as was found in December 2013, a bug
in its implementation meant it had never worked at all, so nobody could have
used it.

The other test came from an unexpected direction, and it is §18.11.

!!! note "Life story: Dual_EC_DRBG"
    **Born:** designed at the NSA; in ISO/IEC 18031 (2005), NIST SP 800-90
    (June 2006) and ANSI X9.82 · **Purpose,** officially: a random bit
    generator whose security rests on elliptic-curve problems · **Helped:**
    almost no one openly: it was slow and biased, yet RSA BSAFE made it the
    default; it showed that a generator can carry a trapdoor invisible in its
    output (Shumow and Ferguson, 2007), and it gave Juniper's attackers a
    ready-made lock to rekey · **Retired:** NIST advised against it in
    September 2013 and removed it in SP 800-90A Rev. 1 (June 2015) ·
    **Replaced by:** Hash_DRBG, HMAC_DRBG and CTR_DRBG

## 18.10 The back door, worked on a toy curve

*Level: expert.*

### How Dual_EC_DRBG works

Leave out the details (reseeding, additional input) and the generator on the
curve P-256 is this. Its secret state is a number $s$. The public points
$P$ and $Q$ lie on the curve; $x(\cdot)$ is the $x$-coordinate of a point.
Each step does

$$
s_i = x(s_{i-1} P), \qquad r_i = x(s_i Q), \qquad \text{output } o_i = r_i \bmod 2^{240} .
$$

The state moves forward with $P$; the output is made with $Q$ and loses its
top 16 bits. Without the trapdoor, getting $s_i$ from $r_i$ would mean
solving a discrete logarithm ($s_i Q$ is a point whose multiplier you want),
and getting $s_{i+1}$ from $r_i$ looks equally hard.

### The trapdoor

Suppose $P = eQ$ and you know $e$. You see one 30-byte output $o_i$.

1. **Restore the missing bits.** $r_i$ is $o_i$ plus one of $2^{16}$ possible
   top parts. For each, check whether it is the $x$-coordinate of a point on
   the curve (about half are) and compute the point $R$, up to its sign.
2. **Turn the output point into the next state.** If $R = \pm s_i Q$, then
   $$
   eR = \pm s_i (eQ) = \pm s_i P , \qquad x(eR) = x(s_i P) = s_{i+1} .
   $$
   The sign does not matter, since $x(-T) = x(T)$.
3. **Check.** Each candidate gives a candidate $s_{i+1}$, from which you
   compute $o_{i+1}$. Compare it with a couple of bytes of the generator's
   next output; about $2^{15}$ candidates against 16 bits leaves one or very
   few. That is why "about 32 bytes" suffice: one block, and a little of the
   next.

From then on you run the generator yourself. The whole attack is $2^{16}$
point decompressions and scalar multiplications, a fraction of a second on
a laptop.

The security of the generator depends entirely on nobody knowing $e$. If the
points had been derived in a public, verifiable way (by hashing a
published string to the curve, say), nobody would know $e$, and the
generator would merely be slow and slightly biased. The question was never
whether $e$ exists; for any two points of a prime-order group it does. The
question is whether anyone chose $Q$ and then computed $P$.

### By hand

Use the 19-point curve of [§14.3](14-Attacks-on-Signatures-and-Nonces.md):
$y^2 = x^3 + 2x + 2$ over $\mathbb{F}_{17}$, generated by $G = (5, 1)$. The
multiples you need are $2G = (6, 3)$, $5G = (9, 16)$, $6G = (16, 13)$,
$13G = (16, 4)$ and $18G = (5, 16)$. Leave out the truncation.

<div class="mars-steps" markdown>

1. **The designer's choice.** $Q = G$ and the secret $e = 3$, so the published
   $P = 3G = (10, 6)$.
2. **The generator runs.** Its seed is $s_0 = 7$. Then
   $s_1 = x(7P) = x(21G) = x(2G) = 6$ (since $21 \equiv 2 \pmod{19}$), and the
   output is $r_1 = x(6Q) = x(6G) = 16$.
3. **The next step**, which the attacker wants to predict:
   $s_2 = x(6P) = x(18G) = 5$, and $r_2 = x(5Q) = x(5G) = 9$.
4. **The attacker sees $r_1 = 16$.** The points with $x = 16$ are
   $(16, 13) = 6G$ and $(16, 4) = 13G$. Multiply by $e = 3$:
   $3 \cdot 6G = 18G = (5, 16)$ and $3 \cdot 13G = 39G = G = (5, 1)$. Both
   have $x = 5$, so $s_2 = 5$, whichever sign was right.
5. **Predict.** $r_2 = x(5Q) = x(5G) = 9$. Correct, and every later output
   follows the same way.

</div>

The attacker never solved a discrete logarithm. It used the one it was
given: $e$, the logarithm of $P$ to the base $Q$.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Dual_EC on the 19-point curve: state 7 goes to state 6 with output 16, then to state 5 with output 9; the attacker lifts 16 to the point 6G, multiplies by e equal to 3, gets x equal 5, the next state, and predicts output 9" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">the generator (everyone)</text>
<rect x="20" y="40" width="90" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="65" text-anchor="middle">s₀ = 7</text>
<line x1="110" y1="60" x2="172" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,60 172,56 172,64"/>
<text x="145" y="52" text-anchor="middle" font-size="12">x(·P)</text>
<rect x="180" y="40" width="90" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="65" text-anchor="middle">s₁ = 6</text>
<line x1="270" y1="60" x2="372" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="380,60 372,56 372,64"/>
<text x="325" y="52" text-anchor="middle" font-size="12">x(·P)</text>
<rect x="380" y="40" width="90" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="425" y="65" text-anchor="middle">s₂ = 5</text>
<line x1="225" y1="80" x2="225" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="225,120 221,112 229,112"/>
<text x="232" y="102" font-size="12">x(·Q)</text>
<rect x="180" y="120" width="90" height="36" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="143" text-anchor="middle">r₁ = 16</text>
<line x1="425" y1="80" x2="425" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="425,120 421,112 429,112"/>
<text x="432" y="102" font-size="12">x(·Q)</text>
<rect x="380" y="120" width="90" height="36" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.4"/>
<text x="425" y="143" text-anchor="middle">r₂ = 9</text>
<text x="560" y="143" text-anchor="middle" font-size="12">public outputs</text>
<text x="20" y="196" font-weight="bold">the holder of e (P = 3Q)</text>
<rect x="150" y="210" width="150" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="225" y="235" text-anchor="middle">lift: 6G = (16, 13)</text>
<line x1="225" y1="156" x2="225" y2="202" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<polygon points="225,210 221,202 229,202"/>
<line x1="300" y1="230" x2="372" y2="230" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<polygon points="380,230 372,226 372,234"/>
<text x="338" y="222" text-anchor="middle" font-size="12">× e = 3</text>
<rect x="380" y="210" width="170" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="465" y="235" text-anchor="middle">18G = (5, 16): x = s₂</text>
<text x="320" y="280" text-anchor="middle" font-style="italic" font-size="13">e·(s₁Q) = s₁·(eQ) = s₁P, whose x is the next state.</text>
</svg>
<figcaption>Figure 18.6. Dual_EC on the 19-point curve. The top row is what the generator does; the dashed path is open only to whoever knows e with P = eQ.</figcaption>
</figure>

### Code it

The code uses a curve big enough to make the truncation meaningful:
$y^2 = x^3 - 3x + 16$ over the prime $p = 1{,}048{,}583$ (about $2^{20}$, and
$p \equiv 3 \pmod 4$ so square roots are one exponentiation), which has a
prime number of points, $n = 1{,}048{,}387$, found by counting. The curve
has $a = -3$, like P-256. Outputs keep the low 16 of the 20 bits, so the
attacker tries $2^4 = 16$ top parts where P-256's generator would make it
try $2^{16}$.

```python
# A toy curve shaped like P-256: y^2 = x^3 - 3x + 16 over F_p, with a prime number of points
p, a, b, n = 1048583, -3, 16, 1048387

def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0:
        return None
    if P == Q:
        lam = (3 * P[0] * P[0] + a) * pow(2 * P[1], -1, p) % p
    else:
        lam = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (lam * lam - P[0] - Q[0]) % p
    return (x, (lam * (P[0] - x) - P[1]) % p)

def mul(k, P):
    R = None
    while k:
        if k & 1:
            R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

def lift(x):                              # a point with this x, if there is one
    v = (x ** 3 + a * x + b) % p
    y = pow(v, (p + 1) // 4, p)           # works because p = 3 mod 4
    return (x, y) if y * y % p == v else None

# The designer picks Q, a secret e, and publishes P = e*Q
Q = lift(2)
e = 271_828
P = mul(e, Q)
print("Q =", Q, " P =", P, " n*Q is infinity:", mul(n, Q) is None)

class DualEC:                             # the generator; outputs drop the top 4 bits
    def __init__(self, seed):
        self.s = seed
    def next(self):
        self.s = mul(self.s, P)[0]        # s_i = x(s_{i-1} * P)
        r = mul(self.s, Q)[0]             # r_i = x(s_i * Q)
        return r & 0xFFFF                 # keep the low 16 of 20 bits

victim = DualEC(seed=777_777)
out = [victim.next() for _ in range(5)]
print("outputs:", out)

# The attack: from out[0] alone, rebuild r_1 * Q, multiply by e, get s_2
candidates = []
for top in range(16):
    R = lift((top << 16) | out[0])
    if R is not None:
        s2 = mul(e, R)[0]                 # x(e * s_1 Q) = x(s_1 P) = s_2
        if mul(s2, Q)[0] & 0xFFFF == out[1]:
            candidates.append(s2)
print("states consistent with two outputs:", candidates)
spy = DualEC(seed=0)
spy.s = candidates[0]
print("predicted:", [spy.next() for _ in range(3)], " actual:", out[2:])
```

It prints:

```
Q = (2, 719980)  P = (278228, 314436)  n*Q is infinity: True
outputs: [39852, 43714, 31873, 32345, 18146]
states consistent with two outputs: [661507]
predicted: [31873, 32345, 18146]  actual: [31873, 32345, 18146]
```

Two outputs gave the state, and the state gave everything after. Nothing
in `outputs` hints at this: without $e$, they are as unpredictable as the
discrete logarithm on the curve is hard. The real attack on P-256 differs
only in size: $2^{16}$ candidates, 256-bit arithmetic, and the same three
lines in the loop.

### Why it matters for TLS

In TLS the server sends 28 or 32 random bytes in its hello message, in the
clear. If the server's generator is Dual_EC_DRBG, those bytes are (most of)
one output block. The next block is often used for the server's secret
values: its Diffie-Hellman exponent, or the nonce of its ECDSA signature.
The holder of $e$ reads the hello, recovers the state, computes the
Diffie-Hellman secret, and decrypts the session, passively, from a
recording. If the secret is an ECDSA nonce, the holder computes the private
signing key from one signature with [§14.2](14-Attacks-on-Signatures-and-Nonces.md)'s
formula.

## 18.11 Juniper: someone else's Q

*Level: intermediate.*

A trapdoor is only as safe as the trapdoor's key, and the key is just a
point in a configuration. On 17 December 2015 Juniper Networks, a large
maker of firewalls and VPN gateways, announced that an internal code review
had found "unauthorized code" in ScreenOS, the operating system of its
NetScreen firewalls. It published two vulnerabilities. One,
CVE-2015-7755, was a hidden administrator password for SSH and telnet logins,
in ScreenOS 6.3.0r17 to 6.3.0r20. The other, CVE-2015-7756, said only that
an attacker able to monitor VPN traffic could decrypt it. It affected
ScreenOS 6.2.0r15 to 6.2.0r18 and 6.3.0r12 to 6.3.0r20, versions released
from September 2012 onward.

Researchers compared the firmware before and after Juniper's patch within
days. Ralf-Philipp Weinmann and others found that the VPN fix changed a
single constant: a 64-character hexadecimal string that was the
$x$-coordinate of a point on P-256. It was Dual_EC_DRBG's $Q$.

### The history in the code

The full picture took a year, and came from Stephen Checkoway, Jacob
Maskiewicz, Christina Garman, Joshua Fried, Shaanan Cohney, Matthew Green,
Nadia Heninger, Ralf-Philipp Weinmann, Eric Rescorla and Hovav Shacham ("A
Systematic Analysis of the Juniper Dual EC Incident", ACM CCS 2016). They
reconstructed it from old firmware images:

1. **2008.** ScreenOS 6.2.0 added Dual_EC_DRBG, using a $Q$ that Juniper had
   generated itself rather than NIST's. Juniper's position, stated in a
   2013 knowledge-base article, was that this was safe: the Dual_EC output
   was used only to seed a second generator, ANSI X9.31, whose output was
   what the system used.
2. **Same release.** The length of the nonces in Juniper's IKE
   implementation, the key exchange that sets up IPsec VPNs, grew from 20
   bytes to 32, exactly one Dual_EC output block plus a little: the amount
   §18.10's attack needs.
3. **A bug.** The code that reseeded the X9.31 generator shared a loop
   counter, a global variable, with the code that produced its output. The
   effect was that on each reseed the X9.31 step was skipped, and **raw
   Dual_EC output** went straight into the IKE nonces. With the nonces
   generated before the Diffie-Hellman secret, an observer who knew the $e$
   for Juniper's $Q$ could read one handshake's nonce and compute its
   Diffie-Hellman secret.
4. **2012.** Someone changed $Q$ in the source or the build to a point of
   their own. Whoever knew the $e$ for that point could decrypt the VPN
   traffic of every firewall running the new versions, passively, from
   captured packets, with no trace on the device.

The researchers could not know the attacker's $e$, so they did what the TLS
study had done: they replaced $Q$ in a real ScreenOS image with a point of
their own, and decrypted IKE and IPsec traffic from a real device. Whether
the original Juniper $Q$ had an $e$ that anyone knew, and why the X9.31 layer
failed in exactly the way that exposed Dual_EC, cannot be told from the
code.

### Who?

Juniper never said who made the 2012 change, and no government has said so
officially. In September 2021 Bloomberg reported, citing unnamed sources,
that Juniper had added Dual_EC_DRBG in 2008 at the NSA's request, and that
the 2012 change had been traced to a hacking group linked to China; those
reports have not been confirmed by the governments or the company. US
senators asked the NSA in 2020 what it had learned from the incident;
the answers were not made public in full. Juniper removed Dual_EC_DRBG from
ScreenOS in 2016.

What the record does show is the technical lesson. A back door designed to
be usable by "nobody but us" is a single number. Whoever can change it, an
insider, a compromised build server, an intruder, inherits the door, and
the change looks like a one-line difference in a constant that no test
checks.

!!! note "Life story: the Juniper Dual_EC incident"
    **Born:** 2008, when ScreenOS 6.2.0 adopted Dual_EC_DRBG with Juniper's
    own $Q$; the $Q$ was changed by an unknown party in 2012; Juniper
    announced "unauthorized code" on 17 December 2015 (CVE-2015-7756) ·
    **Purpose,** of the 2012 change: passive decryption of IPsec VPN traffic
    through firewalls · **Helped:** the attacker, for three years, at an
    unknown number of sites; then the clearest demonstration that a
    generator back door can be captured by someone else (Checkoway and
    colleagues, CCS 2016) · **Status:** fixed in 2015 and 2016, with
    Dual_EC_DRBG removed; who changed $Q$ is not officially known

## 18.12 Testing a generator

*Level: intermediate.*

After these stories the obvious question is: can a generator be tested? The
honest answer has two halves. Statistical tests catch generators that are
broken in obvious ways, and catch them cheaply. They cannot show that a
generator is unpredictable, and every failure in this chapter except the
stuck Taiwan hardware would have passed them.

### Statistical test suites

A statistical test takes a long output, computes a statistic whose
distribution is known for truly random bits, and reports how surprising the
observed value is, as a p-value. NIST's **SP 800-22** (2001, revised 2010)
collects fifteen such tests: the frequency (monobit) test, frequency within
blocks, runs, the longest run of ones, matrix rank, a spectral test,
template matching, Maurer's universal test, linear complexity, serial and
approximate entropy tests, cumulative sums and random excursions. Other
suites go further: George Marsaglia's Diehard (1995), Robert Brown's
Dieharder, Pierre L'Ecuyer and Richard Simard's TestU01 (2007), whose
BigCrush battery runs for hours, and PractRand, which reads terabytes.

These suites are good at what they do. TestU01 rejects many generators that
shipped in standard libraries, LCGs among them, and the Mersenne Twister
fails two of its linear-complexity tests. A hardware source whose bits are
biased or correlated fails quickly. The code below runs the first two
SP 800-22 tests on two streams.

```python
import hashlib, random
from math import erfc, sqrt, log2, ceil

def bits_of(data):
    return [(byte >> i) & 1 for byte in data for i in range(8)]

def monobit_p(bits):                      # SP 800-22 frequency test
    s = sum(2 * b - 1 for b in bits)
    return erfc(abs(s) / sqrt(len(bits)) / sqrt(2))

def runs_p(bits):                         # SP 800-22 runs test
    n = len(bits)
    pi = sum(bits) / n
    if abs(pi - 0.5) >= 2 / sqrt(n):
        return 0.0                        # fails the frequency pre-test
    v = 1 + sum(bits[i] != bits[i + 1] for i in range(n - 1))
    return erfc(abs(v - 2 * n * pi * (1 - pi)) / (2 * sqrt(2 * n) * pi * (1 - pi)))

# Stream 1: SHA-256 of a counter. Zero entropy: anyone can recompute it.
counter = b"".join(hashlib.sha256(i.to_bytes(8, "big")).digest() for i in range(4000))
# Stream 2: a physical-looking source whose bits are 1 with probability 0.52
rnd = random.Random(90)                   # simulated noise, not for secrets
biased = bytes(sum((rnd.random() < 0.52) << i for i in range(8)) for _ in range(128000))

for name, data in (("hashed counter", counter), ("biased source", biased)):
    b = bits_of(data)
    print("%-15s monobit p = %.3f  runs p = %.3f" % (name, monobit_p(b), runs_p(b)))
```

It prints:

```
hashed counter  monobit p = 0.504  runs p = 0.288
biased source   monobit p = 0.000  runs p = 0.000
```

A p-value near 0 is a failure; anything comfortably above 0.01 is a pass.
Look at which stream passed. The hashed counter has **no entropy at all**:
anyone who guesses "SHA-256 of 0, 1, 2, ..." reproduces it exactly. It
passes, and would pass every test in every suite, because SHA-256 is
designed to look random. The biased source has almost a full bit of
entropy per bit (a 52/48 coin carries 0.9988 bits of Shannon entropy and
0.94 bits of min-entropy), and it fails at once. As a seed for a
cryptographic generator, the second stream is excellent after hashing, and
the first is worthless.

That is the general limit. **A test sees the output; security depends on
what the attacker knows about the input.** Netscape's keys, Debian's keys,
the Android nonces and Dual_EC's output were all outputs of good mixing
functions (MD5, SHA-1, elliptic-curve multiplication) and would pass any
battery. Dual_EC's bias was found by analysis of its design, not by running
a suite. ROCA's structure was found by statistics, but statistics aimed at
one specific property of primes, chosen by people who suspected something.

### Testing the source, not the output: SP 800-90B

Since output tests cannot measure entropy, the modern approach tests the
**entropy source** instead, before any cryptographic processing hides its
flaws. NIST's **SP 800-90B** (2018) defines the model: a physical **noise
source** (thermal noise, oscillator jitter), an optional **conditioning
component** that compresses its output, and **health tests** that watch it.
A designer must explain why the noise source is unpredictable, and a lab
then estimates its **min-entropy**, $H_\infty = -\log_2 p_{\max}$, where
$p_{\max}$ is the probability of the most likely sample. Min-entropy, not
Shannon entropy, is the right measure because the attacker guesses the most
likely value first (book 1 [§4.3](../../book/04-Randomness-and-Perfect-Secrecy.md)
explains the difference).

The estimation runs on raw samples, a million or more. If the samples pass
tests showing they are independent and identically distributed, a simple
estimate suffices. If not, which is the usual case, SP 800-90B runs ten
estimators, each built to catch a different kind of structure (the most
common value, collisions, Markov dependence, compression, repeated
substrings, and several predictors that try to guess the next sample), and
**takes the lowest**. The claim is conservative by construction: the source
is credited with only as much entropy as the cleverest estimator could not
predict. It is still an estimate. An estimator that does not model a
source's actual flaw will overestimate, which is why SP 800-90B also asks
for the designer's argument about the physics.

### Health tests

A source that was good in the lab can fail in the field: a component ages,
the temperature drops, an attacker injects a signal. SP 800-90B requires
two continuous tests on every sample, designed to have a false alarm rate
of about $2^{-20}$ to $2^{-40}$ per sample while catching gross failures
fast:

- the **repetition count test** raises an alarm if one value repeats
  $C = 1 + \lceil 20 / H \rceil$ times in a row (for a false alarm rate of
  $2^{-20}$ and a claimed $H$ bits per sample), which catches a source that
  is stuck;
- the **adaptive proportion test** looks at windows of 512 samples (1,024
  for binary sources) and raises an alarm if the first value of the window
  occurs too often in it, which catches a source that has drifted toward
  one value.

```python
import random
from math import ceil, comb, log2, sqrt
from collections import Counter

def mcv_entropy(samples):                 # SP 800-90B most common value estimate
    L = len(samples)
    p_hat = Counter(samples).most_common(1)[0][1] / L
    p_u = min(1.0, p_hat + 2.576 * sqrt(p_hat * (1 - p_hat) / (L - 1)))
    return -log2(p_u)

def rct_cutoff(H):                        # repetition count test, false alarm 2^-20
    return 1 + ceil(20 / H)

def apt_cutoff(H, W=512):                 # adaptive proportion test, false alarm 2^-20
    p, tail = 2 ** -H, 0.0
    for c in range(W, 0, -1):             # smallest c with P(count >= c) <= 2^-20
        tail += comb(W, c) * p**c * (1 - p) ** (W - c)
        if tail > 2**-20:
            return c + 1

def health(samples, H, W=512):
    rc, ac = rct_cutoff(H), apt_cutoff(H)
    run = 0
    for i, x in enumerate(samples):
        run = run + 1 if i and x == samples[i - 1] else 1
        if run >= rc:
            return "RCT alarm at sample %d" % i
        if i % W == 0:
            first, seen = x, 0            # a new APT window starts here
        seen += x == first
        if seen >= ac:
            return "APT alarm at sample %d" % i
    return "healthy"

rnd = random.Random(800)                  # simulated noise source, not for secrets
good = [min(rnd.randrange(36), 31) for _ in range(200_000)]   # 32 values; 31 comes up too often
H = mcv_entropy(good)
print("estimated min-entropy: %.2f bits per sample" % H)
print("cutoffs: RCT", rct_cutoff(H), " APT", apt_cutoff(H), "of 512")
print("good source:    ", health(good, H))
stuck = good[:5000] + [17] * 12 + good[5000:10000]            # the oscillator locks for a moment
print("stuck source:   ", health(stuck, H))
drift = good[:5000] + [3 if rnd.random() < 0.3 else rnd.randrange(32) for _ in range(5000)]
print("drifting source:", health(drift, H))
```

It prints:

```
estimated min-entropy: 2.82 bits per sample
cutoffs: RCT 9  APT 114 of 512
good source:     healthy
stuck source:    RCT alarm at sample 5008
drifting source: APT alarm at sample 5469
```

The simulated source has 32 possible values, so it looks like 5 bits per
sample, but one value has probability $5/36$, and the most-common-value
estimate credits it with only about 2.8 bits, a little below the true
$-\log_2(5/36) \approx 2.85$ because the estimate takes an upper confidence
bound on $p_{\max}$. The repetition test catches the moment the source
locks; the proportion test catches the slow drift that no single run
reveals. Neither would catch a source that an attacker controls cleverly,
or a deterministic pattern with no repeats: health tests are smoke
detectors, not proofs.

### Putting it together

**SP 800-90A** specifies the deterministic generators (Hash_DRBG, HMAC_DRBG,
CTR_DRBG), **SP 800-90B** the entropy sources, and **SP 800-90C** the ways to
combine them into a complete random bit generator, including how much
entropy must go in before output may come out. A cryptographic module
validated under **FIPS 140-3** must use an approved DRBG and document its
entropy source against SP 800-90B. Taiwan's cards and Infineon's library
show what validation can miss; Debian and Android show what happens with no
such discipline at all. The discipline helps. It does not replace reading
the code.

## 18.13 What good practice is today

*Level: beginner.*

The stories reduce to a short list of rules. None is new; each was paid for.

**Ask the operating system.** Every modern system runs a cryptographic
generator in the kernel, fed by every entropy source the machine has:
`getrandom()` on Linux, `getentropy()` and `arc4random()` on the BSDs and
macOS, `BCryptGenRandom` on Windows. Languages wrap them: `secrets` and
`os.urandom` in Python, `crypto/rand` in Go, `SecureRandom` backed by the
system's generator in modern Java, `randombytes_buf` in libsodium. An
application should not seed, mix or "improve" anything. Netscape and Debian
both broke a generator by managing its entropy themselves.

**Use `getrandom()` rather than reading a device file.** It cannot fail by
running out of file descriptors or by being run in a chroot without `/dev`,
and by default it blocks only until the kernel generator has been seeded
once, at boot, and never again. That single wait closes the hole that "Mining
your Ps and Qs" found. The older `/dev/random` blocked constantly on an
imagined "entropy depletion"; since Linux 5.6 (2020) it behaves like
`getrandom()`. The older advice to read `/dev/urandom` is right after boot
and wrong during it.

**Never use a simulation generator for secrets.** `random`, `Math.random`,
`java.util.Random`, `rand()` and `mt_rand` are built for speed and
statistics. §18.4 broke two of them from a handful of outputs.

**Mix hardware sources; do not trust one alone.** Intel added the `RDRAND`
and `RDSEED` instructions in 2012, and AMD followed. Operating systems use
them, but as one input among several, hashed together. In 2013, after the
Snowden documents, Linux's maintainers refused requests to use `RDRAND`
alone, on the grounds that nobody can audit a chip. Accidents justified the
caution too: in 2019 some AMD processors were found to return the same
value, all ones, from `RDRAND` after waking from suspend, until a firmware
update; software that trusted it alone got constant "random" numbers, while
systems that mixed it lost nothing.

**Watch for copies of the state.** A process that forks, a virtual machine
restored twice from one snapshot, a container image started a thousand times
from the same disk: each duplicates whatever generator state it held. User-
space generators must reseed after a fork (OpenSSL does since version
1.1.1), and Linux reseeds when a hypervisor signals that a virtual machine
has been cloned (the VM generation ID, since Linux 5.18). Android 2013 was a
fork problem.

**Make keys late, or give the device a seed.** A device that makes its keys
at first boot should wait for `getrandom()` to return, or better, receive a
unique seed at the factory and mix it in. Certificate authorities and key
servers can check keys as they arrive: the CA/Browser Forum's rules require
rejecting the known Debian weak keys, and a ROCA fingerprint test or a batch
gcd against a corpus of known keys costs almost nothing.

**Do not let a signature depend on the generator.** The Android thefts, the
Debian DSA keys and Dual_EC's signing risk all came from nonces drawn fresh
at signing time. Deterministic nonces (RFC 6979 for ECDSA, and EdDSA by
design) derive the nonce from the key and the message, so a broken
generator cannot leak the key. **Hedged** signing goes one step further and
mixes fresh randomness into that derivation, so that it survives both a bad
generator and the fault attacks that a purely deterministic signer invites
([Chapter 14](14-Attacks-on-Signatures-and-Nonces.md), §14.8); FIPS 204's
ML-DSA uses hedged signing by default.

**Prefer constants with explanations.** Dual_EC's points had none. A curve
or a generator whose constants come from a public, rigid procedure (digits
of $\pi$, a hash of a published string, the smallest value that meets
stated rules) leaves nowhere for a trapdoor to hide. Book 1
[Chapter 15](../../book/15-Elliptic-Curves.md) makes the same point for
curves.

## 18.14 Going deeper

*Level: expert.*

**Kleptography.** Dual_EC_DRBG is an instance of an idea that Adam Young and
Moti Yung named a decade before it was standardized. In "The Dark Side of
Black-Box Cryptography" (CRYPTO 1996) and "Kleptography: Using Cryptography
Against Cryptography" (EUROCRYPT 1997) they defined a **SETUP** (secretly
embedded trapdoor with universal protection): a modification of a
cryptosystem whose outputs look normal to everyone, even to someone who
later reads the device's code, but leak secrets to the designer, encrypted
under the designer's public key. Dual_EC fits exactly: $Q$ is like a public
key, $e$ is the private key, and the leak travels inside output that
everyone treats as random. Young and Yung also showed RSA key generators
whose public moduli encode the prime $p$ for the designer, undetectably
without the designer's key, the dark mirror of ROCA. Later work by Mihir
Bellare, Kenneth Paterson and Phillip Rogaway (2014) on algorithm-substitution
attacks and by Yevgeniy Dodis, Chaya Ganesh, Alexander Golovnev, Ari Juels
and Thomas Ristenpart (2015) on backdoored generators made these notions
formal, and asked which designs can resist them.

**Why Dual_EC is biased.** On P-256 roughly half of all 256-bit numbers
below $p$ are $x$-coordinates of points, and the set of $x$-coordinates
has visible structure. Dropping the top 16 bits hides it only partly: the
remaining 240 bits have a small, computable bias. Schoenmakers and
Sidorenko built a distinguisher with advantage about $2^{-8}$ per output
block, enough to tell Dual_EC from random with a modest amount of output.
Daniel Brown and Kristian Gjøsteen gave a security proof in 2007, under
assumptions that included the hardness of telling $x(sQ)$ truncated from
random and, implicitly, that nobody knew the discrete logarithm of $P$ to
the base $Q$. The proof was correct; its assumption about $Q$ was the part
nobody could check.

**Robustness and recovery.** SP 800-90A asks for **backtracking
resistance** (stealing today's state does not reveal yesterday's output) and
offers **prediction resistance** (fresh entropy before each request, so a
stolen state is useless for tomorrow's output). Academic models go further.
Boaz Barak and Shai Halevi (2005) defined a generator with input that
recovers from compromise once enough entropy has arrived. Dodis, David
Pointcheval, Sylvain Ruhault, Damien Vergnaud and Daniel Wichs ("Security
Analysis of Pseudo-Random Number Generators with Input: /dev/random is not
Robust", CCS 2013) gave a stronger definition, robustness, and showed that
the Linux generator of the time did not meet it: an attacker who knew the
state and could influence the inputs could keep it from ever recovering.
Fortuna, by Niels Ferguson and Bruce Schneier (2003), recovers in a
provable way by spreading entropy across pools that are emptied at
exponentially spaced intervals; designs like it are used in FreeBSD and
macOS. Linux's generator was rewritten from 2016 onward around ChaCha20 and,
from Linux 5.17 (2022), BLAKE2s, with Jason Donenfeld's changes simplifying
its entropy accounting.

**ROCA's choice of $M'$.** The attack of §18.8 is an optimization over
divisors of $M$. Let $M' \mid M$, and let $\text{ord}_{M'}(65537)$ be the
number of guesses. Coppersmith's method, in Howgrave-Graham's form, finds
a root $k'$ of the linear polynomial $k' M' + c$ modulo the unknown factor
$p \approx N^{1/2}$ when $k'$ is below about $N^{1/4}$, using a lattice whose
dimension grows as the root approaches that bound. Since
$k' \approx p / M'$, this needs $M'$ of at least a quarter of $N$'s bits. The researchers
searched for $M'$ that keeps $\log_2 M' \ge \log_2 N / 4$ while minimizing
$\text{ord}_{M'}(65537)$, by removing from $M$ the prime factors $r$ that
contribute large factors to the order and little to the size, a
knapsack-like greedy search. They then tuned the lattice dimension against
the number of guesses for each key size. The resulting costs (§18.8) are
far below generic factoring, and well above trivial, which is why 1024-bit
keys were broken in practice and 2048-bit keys for the price of a car.

**The arithmetic of prevention.** A random 2048-bit RSA key generated
correctly has about $2^{1014}$ choices for each prime. The probability that
two of a billion such keys share a prime is about
$\binom{2 \cdot 10^9}{2} \cdot 2^{-1014} \approx 2^{-953}$. Every shared prime
ever found on the Internet is therefore proof of a generator failure, not
bad luck. The same reasoning turns batch gcd into a monitoring tool: run it
on every key you can collect, and a single hit identifies a broken
generator somewhere.

## Check yourself

??? question "1. A generator is seeded with the number of seconds since 1 January 1970. An attacker knows the key was made some time in 2025. How many seeds must it try?"

    A year has $365 \cdot 86{,}400 = 31{,}536{,}000$ seconds, about $2^{25}$.
    The key, however long, has at most 25 bits of uncertainty, and the
    search takes seconds to minutes.

??? question "2. Netscape hashed its seed with MD5. Why did that not help?"

    MD5 is deterministic: each possible input gives one output. If the
    input is one of about $10^6$ values, so is the output. Hashing spreads
    the uncertainty evenly over 128 bits but cannot add any; the attacker
    simply hashes each candidate input too.

??? question "3. Why could Debian's bug expose a DSA key that had been generated on a healthy machine?"

    A DSA signature uses a fresh nonce $k$, and a signature with a known $k$
    gives the private key by one formula. If the key was used to sign once
    on an affected machine, its $k$ came from one of 32,767 states; the
    attacker tries each, and the one that reproduces $r$ gives the key.

??? question "4. Java's nextInt() reveals 32 of 48 state bits. How many outputs and how many trials does the attack of §18.4 need?"

    One output to fix the top 32 bits, a second to test candidates, and at
    most $2^{16} = 65{,}536$ trials. A third output removes any rare false
    match.

??? question "5. Run batch gcd by hand on $N_1 = 15$, $N_2 = 21$, $N_3 = 77$."

    $P = 15 \cdot 21 \cdot 77 = 24{,}255$. $P \bmod 15^2 = 24{,}255 \bmod 225 = 180$,
    and $180/15 = 12$, $\gcd(12, 15) = 3$. $P \bmod 21^2 = 24{,}255 \bmod 441 = 0$,
    so $0/21 = 0$ and $\gcd(0, 21) = 21$: both primes of $N_2$ appear
    elsewhere (3 in $N_1$, 7 in $N_3$). $P \bmod 77^2 = 24{,}255 \bmod 5929 = 539$,
    $539/77 = 7$, $\gcd(7, 77) = 7$. So $15 = 3 \cdot 5$, $77 = 7 \cdot 11$, and
    $21 = 3 \cdot 7$ follows from the other two.

??? question "6. Why did many devices in 2012 share one prime but not both?"

    The generator's state at first boot was nearly the same on many units,
    so the first prime came out the same. OpenSSL mixes the current time
    into its pool while it works; when the second ticked over between the
    two primes, the second prime differed. One shared prime is the worst
    case, because a gcd then factors both keys.

??? question "7. A modulus $N$ gives $N \bmod 11 = 5$. Can it be an Infineon RSALib key?"

    No. Modulo 11, every RSALib prime is a power of $65537 \equiv 10$, so
    $N \bmod 11$ must be in $\{1, 10\}$. A residue of 5 rules it out.

??? question "8. Statistical test suites passed Dual_EC_DRBG's output and the Debian keys. Why were they not useful there, and what does SP 800-90B test instead?"

    Both outputs came from good mixing functions; a test sees only the
    output and cannot know how many inputs were possible. SP 800-90B tests
    the raw noise source before any mixing, estimates its min-entropy with
    several estimators and takes the lowest, and adds continuous health
    tests (repetition count, adaptive proportion) that catch a source that
    fails in the field.

??? question "9. In the toy of §18.10 the designer had chosen $e = 5$ instead of 3, so $P = 5G$. With seed $s_0 = 7$, what is the first output, and how does the attacker get $s_2$?"

    $P = 5G$, so $s_1 = x(7P) = x(35G) = x(16G) = 10$ and
    $r_1 = x(10Q) = x(10G) = 7$. The points with $x = 7$ are $9G$ and $10G$.
    Multiplying by 5: $45G = 7G = (0, 6)$ and $50G = 12G = (0, 11)$; both give
    $s_2 = 0$. Then $s_2 = x(10P) = x(50G) = x(12G) = 0$, as predicted.
    (The next output, $x(0 \cdot Q)$, is the point at infinity: a toy curve
    this small breaks the generator in other ways too.)

??? question "10. Why is a deterministic or hedged nonce safe against Dual_EC_DRBG, but an RFC 6979 key-generation step would not be?"

    A deterministic nonce is computed from the private key and the message,
    so the generator never touches it, and knowing the generator's state
    reveals nothing about it. Key generation, though, needs fresh secret
    randomness by definition: there is no message to derive it from. If the
    key itself was drawn from a backdoored generator, the trapdoor holder
    can compute it, whatever the signing method.

## What you learned

- Keys are only as strong as the randomness they came from, and bad
  randomness gives no visible sign: the keys work and pass every check.
- Random-number failures take four shapes: a guessable seed (Netscape), a
  seed with no entropy (Debian, first-boot devices, Android), an output that
  gives away the state (LCGs, the Mersenne Twister), and a generator with a
  trapdoor (Dual_EC_DRBG).
- The attacker's method is to count the states the source could have been
  in, then search them against a public value, solve for the state from
  outputs, or precompute every key once.
- Hashing a weak seed hides its weakness from tests but not from an
  attacker, who hashes the candidates too.
- Batch gcd, with a product tree and a remainder tree, finds every pair of
  keys that share a prime in a corpus of millions, and found tens of
  thousands on embedded devices that made keys before they had entropy.
- Structured primes (ROCA) can be recognized from the public key alone and,
  with Coppersmith's method, factored; certification did not catch them.
- A trapdoor in a generator is a single constant, and whoever changes that
  constant (as at Juniper in 2012) takes over the trapdoor.
- Statistical tests catch crude failures only. SP 800-90B estimates the
  min-entropy of the raw source and runs health tests; SP 800-90A and
  SP 800-90C define the generators and how to assemble them.
- Today's practice: ask the operating system (`getrandom()`), mix hardware
  sources rather than trusting them, reseed after forks and clones, make
  keys only after seeding, and use deterministic or hedged nonces for
  signatures.

## Further reading

- Ian Goldberg and David Wagner, "Randomness and the Netscape Browser",
  *Dr. Dobb's Journal*, January 1996.
- Brad Arkin, Frank Hill, Scott Marks, Matt Schmid, Thomas John Walls and
  Gary McGraw, "How We Learned to Cheat at Online Poker: A Study in Software
  Security" (1999).
- Joan B. Plumstead, "Inferring a Sequence Generated by a Linear
  Congruence" (FOCS 1982).
- Alan M. Frieze, Johan Håstad, Ravi Kannan, Jeffrey C. Lagarias and Adi
  Shamir, "Reconstructing Truncated Integer Variables Satisfying Linear
  Congruences", *SIAM Journal on Computing* 17 (1988).
- Debian Security Advisory DSA-1571-1, "openssl: predictable random number
  generator" (13 May 2008), CVE-2008-0166.
- Scott Yilek, Eric Rescorla, Hovav Shacham, Brandon Enright and Stefan
  Savage, "When Private Keys are Public: Results from the 2008 Debian
  OpenSSL Vulnerability" (IMC 2009).
- Arjen K. Lenstra, James P. Hughes, Maxime Augier, Joppe W. Bos, Thorsten
  Kleinjung and Christophe Wachter, "Ron was wrong, Whit is right" (IACR
  ePrint 2012/064; at CRYPTO 2012 as "Public Keys").
- [Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman,
  "Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network
  Devices" (USENIX Security 2012)](https://factorable.net/).
- Daniel J. Bernstein, "How to Find Smooth Parts of Integers" (2004), the
  source of the product and remainder trees used by batch gcd.
- Marcella Hastings, Joshua Fried and Nadia Heninger, "Weak Keys Remain
  Widespread in Network Devices" (IMC 2016).
- Daniel J. Bernstein, Yun-An Chang, Chen-Mou Cheng, Li-Ping Chou, Nadia
  Heninger, Tanja Lange and Nicko van Someren, "Factoring RSA Keys from
  Certified Smart Cards: Coppersmith in the Wild" (ASIACRYPT 2013).
- Kai Michaelis, Christopher Meyer and Jörg Schwenk, "Randomly Failed! The
  State of Randomness in Current Java Implementations" (CT-RSA 2013).
- Soo Hyeon Kim, Daewan Han and Dong Hoon Lee, "Predictability of Android
  OpenSSL's Pseudo Random Number Generator" (ACM CCS 2013).
- Alex Klyubin, "Some SecureRandom Thoughts", Android Developers Blog
  (14 August 2013).
- [Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš,
  "The Return of Coppersmith's Attack: Practical Factorization of Widely
  Used RSA Moduli" (ACM CCS 2017)](https://crocs.fi.muni.cz/public/papers/rsa_ccs17).
- Dan Shumow and Niels Ferguson, "On the Possibility of a Back Door in the
  NIST SP800-90 Dual Ec Prng" (CRYPTO 2007 rump session).
- Berry Schoenmakers and Andrey Sidorenko, "Cryptanalysis of the Dual
  Elliptic Curve Pseudorandom Generator" (IACR ePrint 2006/190).
- Stephen Checkoway et al., "On the Practical Exploitability of Dual EC in
  TLS Implementations" (USENIX Security 2014).
- Stephen Checkoway et al., "A Systematic Analysis of the Juniper Dual EC
  Incident" (ACM CCS 2016).
- Daniel J. Bernstein, Tanja Lange and Ruben Niederhagen, "Dual EC: A
  Standardized Back Door" (2016), the full history.
- Adam Young and Moti Yung, "Kleptography: Using Cryptography Against
  Cryptography" (EUROCRYPT 1997).
- Yevgeniy Dodis, David Pointcheval, Sylvain Ruhault, Damien Vergnaud and
  Daniel Wichs, "Security Analysis of Pseudo-Random Number Generators with
  Input: /dev/random is not Robust" (ACM CCS 2013).
- Pierre L'Ecuyer and Richard Simard, "TestU01: A C Library for Empirical
  Testing of Random Number Generators", *ACM Transactions on Mathematical
  Software* 33 (2007).
- NIST SP 800-90A Rev. 1 (2015), SP 800-90B (2018), SP 800-90C, SP 800-22
  Rev. 1a (2010) and FIPS 140-3 (2019).
