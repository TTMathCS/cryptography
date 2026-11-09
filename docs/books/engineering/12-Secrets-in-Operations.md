# 12. Secrets in Operations

*A key that is generated well, stored in hardware and used by correct code can
still be lost in an afternoon: pasted into a configuration file, printed by a
build log, baked into a container image, copied into a crash dump, or left on a
certificate that nobody remembered to renew. This chapter is about the life of
secrets after the code ships. You will see where secrets leak and how often,
follow the Storm-0558 signing key from its creation in 2016 to the review
board's report in 2024, build a secret scanner with pattern and entropy rules,
replace stored cloud keys with short-lived credentials, write a rotation that
causes no outage, read a certificate's expiry straight from its DER bytes, and
configure and test the TLS server you run, from protocol versions to the
headers that ride on top of it.*

!!! abstract "In this chapter"
    **You will learn:**

    - where secrets leak in practice (code repositories, CI logs, environment
      variables, container images, logs, crash dumps), with the measured numbers;
    - how to find them: pattern rules, Shannon entropy, and token formats that
      are built to be found;
    - the Storm-0558 intrusion of 2023, told fully: the 2016 key, the
      validation gap, the crash-dump account and its 2024 correction, and what
      the Cyber Safety Review Board found;
    - how secret stores, dynamic secrets and OIDC federation replace long-lived
      keys, and the trust-policy mistake that undoes federation;
    - how to rotate a key without an outage, and what to do in the first hour
      after a secret leaks;
    - why certificates expire in production (Ericsson and O2 in 2018, Microsoft
      Teams in 2020, the DST Root CA X3 expiry of 2021) and how to stop it;
    - how to configure TLS on a server you run: versions, suites, HSTS and
      preloading, CSP, OCSP stapling, pinning, and how to test the result.

    **You need:** [Chapter 3](03-ASN1-DER-and-Key-Files.md) (DER, and the
    certificate reader this chapter cuts down),
    [Chapter 10](10-The-Life-of-a-Key.md) (key lifecycles and rotation) and
    [Chapter 11](11-Hardware-for-Keys.md) (HSMs and non-exportable keys).
    Certificates, ACME, lifetimes and revocation are explained in
    [Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md); the TLS
    handshake in [Protocols, Chapter 3](../protocols/03-TLS-1.3-Message-by-Message.md)
    and HTTPS deployment in [Protocols, Chapter 5](../protocols/05-TLS-in-Practice.md).
    This chapter does not repeat them.

    **Levels:** §12.1 and §12.2 are for beginners, §12.3 to §12.10 are
    intermediate, §12.11 is expert.

## 12.1 The problem

*Level: beginner.*

In October 2016 two men sent Uber an email. They had found a way into Uber's
private code repositories on GitHub, and in the code they had found an Amazon
Web Services access key, written into the source in plain text. The key opened
an Amazon storage bucket holding backups of Uber's databases, and they had
downloaded them: names, email addresses and phone numbers of about 57 million
riders and drivers around the world, and the driver's license numbers of about
600,000 drivers in the United States. They wanted money.

Uber paid them \$100,000 in December 2016, through its bug bounty program,
whose usual ceiling was \$10,000, and had them sign agreements saying they had
not kept the data. It told neither the regulators nor the people whose data
was taken. The breach became public in November 2017, after a change of
management. In 2018 Uber paid \$148 million to settle with all fifty US states
and the District of Columbia, and in October 2022 a federal jury convicted its
former chief security officer of obstruction for the cover-up. The cryptography
in this story never failed. The AWS key was a perfectly good random secret. It
was in the wrong place.

!!! note "Life story: the Uber breach of 2016"
    **Born:** October 2016, when attackers used stolen credentials to read
    Uber's private GitHub repositories and found an AWS access key in the code
    · **Purpose:** the key let Uber's own software reach its storage; it gave
    the attackers database backups covering about 57 million people ·
    **Helped:** a \$148 million settlement with the US states (2018) and the
    first criminal conviction of a company security chief over a breach
    response (October 2022); it is the standard example of a key in source
    code · **Status:** closed; the lesson, that a repository is not a vault,
    is still being learned

This chapter is about secrets once they leave the code that uses them. A
**secret**, in operations, is any value that grants access by being known: an
API key, a database password, an OAuth client secret, a session-signing key, a
TLS private key, a token-signing key, the passphrase to a key file. Each one is
a small key, and the rest of this book applies to it. But operations add three
problems that a cryptographer seldom sees.

**Secrets travel.** The key Uber's engineers wrote into the source went where
the source went: into every clone, every fork, every backup and every laptop
that held the repository. A running service needs its secrets in memory, so they
also pass through configuration files, environment variables, deployment tools,
logs and the debugging tools that engineers point at a crashed process. Each
copy is a place to leak.

**Secrets live too long.** A key that never expires is a key whose theft never
expires. The Storm-0558 key of §12.4 was created in 2016, should have been
retired in 2021, and was used against government mailboxes in 2023. The fix is
to make secrets expire on their own (§12.5) and to rotate them as routine
(§12.6), so that rotation is easy on the day it is urgent.

**Certificates are secrets with a deadline.** A TLS certificate is public, but
its private key is not, and the certificate stops working on a date written
inside it. When nobody renews it, the outage looks like any other: phones lose
data, video calls fail, payment terminals stop. Certificate lifetimes are
falling to 47 days by 2029, which turns renewal from a yearly chore into a job
that must be automated (§12.7). And the server that presents the certificate
must be configured well, which is the defender's side of TLS (§12.8 to §12.10).

The chapter follows that order: where secrets leak (§12.2) and how to find them
(§12.3); the Storm-0558 key, the case that touches almost every point (§12.4);
stores and short-lived credentials (§12.5); scanning, push protection and
rotation (§12.6); certificate operations (§12.7); and the TLS server you run
(§12.8 to §12.10).

What to do with this:

- Make a list of every secret your system uses: what it unlocks, where it is
  stored, who can read it, how it is rotated, and when it was last rotated.
- For each, ask the Uber question: if this value appeared on a public web page
  tomorrow, what could someone do with it, and how fast could you replace it?

## 12.2 Where secrets leak

*Level: beginner.*

Secrets leak along the path that code takes from a developer's laptop to
production, and then out of production into the tools that watch it. Figure
12.1 shows the path and the leaks that have been measured or exploited at each
step.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The path of a secret from laptop to repository, CI, image registry and running service, with the leaks at each step below it" fill="currentColor" font-size="14">
<rect x="10" y="40" width="104" height="54" rx="6" fill="none" stroke="currentColor"/>
<text x="62" y="64" text-anchor="middle">laptop</text>
<text x="62" y="82" text-anchor="middle" font-size="12">.env, shell</text>
<rect x="140" y="40" width="104" height="54" rx="6" fill="none" stroke="currentColor"/>
<text x="192" y="64" text-anchor="middle">repository</text>
<text x="192" y="82" text-anchor="middle" font-size="12">every commit</text>
<rect x="270" y="40" width="104" height="54" rx="6" fill="none" stroke="currentColor"/>
<text x="322" y="64" text-anchor="middle">CI build</text>
<text x="322" y="82" text-anchor="middle" font-size="12">env, logs</text>
<rect x="400" y="40" width="104" height="54" rx="6" fill="none" stroke="currentColor"/>
<text x="452" y="64" text-anchor="middle">image</text>
<text x="452" y="82" text-anchor="middle" font-size="12">every layer</text>
<rect x="530" y="40" width="104" height="54" rx="6" fill="none" stroke="currentColor"/>
<text x="582" y="64" text-anchor="middle">service</text>
<text x="582" y="82" text-anchor="middle" font-size="12">memory</text>
<line x1="114" y1="67" x2="136" y2="67" stroke="currentColor" stroke-width="1.5"/>
<polygon points="140,67 131,62 131,72"/>
<line x1="244" y1="67" x2="266" y2="67" stroke="currentColor" stroke-width="1.5"/>
<polygon points="270,67 261,62 261,72"/>
<line x1="374" y1="67" x2="396" y2="67" stroke="currentColor" stroke-width="1.5"/>
<polygon points="400,67 391,62 391,72"/>
<line x1="504" y1="67" x2="526" y2="67" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,67 521,62 521,72"/>
<text x="320" y="24" text-anchor="middle" font-weight="bold">where the secret goes</text>
<line x1="192" y1="94" x2="192" y2="128" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="322" y1="94" x2="322" y2="128" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="452" y1="94" x2="452" y2="128" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="582" y1="94" x2="582" y2="128" stroke="currentColor" stroke-dasharray="4 3"/>
<rect x="140" y="130" width="104" height="150" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.5"/>
<text x="192" y="152" text-anchor="middle" font-size="12">Uber 2016</text>
<text x="192" y="170" text-anchor="middle" font-size="12">Toyota 2017-22</text>
<text x="192" y="188" text-anchor="middle" font-size="12">100,000+ repos</text>
<text x="192" y="206" text-anchor="middle" font-size="12">(NDSS 2019)</text>
<text x="192" y="224" text-anchor="middle" font-size="12">28.6 million</text>
<text x="192" y="242" text-anchor="middle" font-size="12">in 2025</text>
<rect x="270" y="130" width="104" height="150" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.5"/>
<text x="322" y="152" text-anchor="middle" font-size="12">Codecov 2021:</text>
<text x="322" y="170" text-anchor="middle" font-size="12">env sent out</text>
<text x="322" y="188" text-anchor="middle" font-size="12">CircleCI 2023:</text>
<text x="322" y="206" text-anchor="middle" font-size="12">customer</text>
<text x="322" y="224" text-anchor="middle" font-size="12">secrets taken</text>
<rect x="400" y="130" width="104" height="150" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.5"/>
<text x="452" y="152" text-anchor="middle" font-size="12">8.5% of</text>
<text x="452" y="170" text-anchor="middle" font-size="12">337,171 images</text>
<text x="452" y="188" text-anchor="middle" font-size="12">(2023 study)</text>
<text x="452" y="206" text-anchor="middle" font-size="12">Codecov's own</text>
<text x="452" y="224" text-anchor="middle" font-size="12">key, 2021</text>
<rect x="530" y="130" width="104" height="150" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.5"/>
<text x="582" y="152" text-anchor="middle" font-size="12">logs</text>
<text x="582" y="170" text-anchor="middle" font-size="12">crash dumps</text>
<text x="582" y="188" text-anchor="middle" font-size="12">debug tools</text>
<text x="582" y="206" text-anchor="middle" font-size="12">Storm-0558</text>
<text x="582" y="224" text-anchor="middle" font-size="12">(§12.4)</text>
<text x="62" y="152" text-anchor="middle" font-size="12">infostealer</text>
<text x="62" y="170" text-anchor="middle" font-size="12">malware</text>
<text x="62" y="188" text-anchor="middle" font-size="12">(CircleCI's</text>
<text x="62" y="206" text-anchor="middle" font-size="12">way in)</text>
</svg>
<figcaption>Figure 12.1. A secret's path from a laptop to a running service, with the leaks found at each step. Every copy outlives the step that made it: a commit stays in history, a log line in the log store, a layer in the image.</figcaption>
</figure>

### Source repositories

The best measurement of the problem is a paper by Michael Meli, Matthew
McNiece and Bradley Reaves of North Carolina State University, "How Bad Can It
Git?", presented at NDSS in February 2019. They watched every public commit
pushed to GitHub for nearly six months, using GitHub's search interface, and
also scanned a snapshot of about 13% of all open-source repositories on
GitHub. They looked only for secrets with a distinctive shape, so that a match
was almost certainly real: private key files, and the API keys of eleven
high-value services such as AWS, Google, Stripe and Twilio. They found
secrets in more than 100,000 repositories, and thousands of new, unique
secrets were being pushed every day. Most leaked secrets were never removed;
and when developers did delete one, the commit that added it stayed in the
repository's history, where anyone could still read it.

The company GitGuardian has measured the same thing every year since 2021,
with its own scanner run over all public GitHub commits. Its numbers come with
their method attached and change as the method changes, so they are best read
one report at a time. Its *State of Secrets Sprawl 2025* (published March 2025)
counted 23.8 million new secrets in public commits during 2024, and found that
70% of the valid secrets it had seen leaked in 2022 were still valid. Its 2026
report (published 17 March 2026) counted 28,649,024 new secrets during 2025,
which it described as a 34% rise, and found that 64% of the secrets confirmed
valid in 2022 could still be used in January 2026. The two rates do not chain
neatly (a 34% rise from 23.8 million would give about 32 million), because the
counting method was revised between the reports. What does not change between
editions is the shape of the problem: millions of secrets a year, and most of
them never revoked.

Not every leak is fast. In October 2022 Toyota announced that a subcontractor
building its T-Connect service had pushed part of the site's source code to a
public GitHub repository in December 2017. The code contained an access key
for a server holding customer data. It stayed public for almost five years,
until 15 September 2022, and the key was changed two days later. Toyota said
296,019 email addresses and customer numbers could have been read in that
time, and that it could not tell whether anyone had.

!!! note "Life story: the Toyota T-Connect access key"
    **Born:** December 2017, in source code a subcontractor pushed to a public
    GitHub repository · **Purpose:** to let the T-Connect web site reach a
    customer data server · **Helped:** expose 296,019 email addresses and
    customer management numbers for nearly five years; disclosed by Toyota in
    October 2022 · **Status:** repository made private on 15 September 2022,
    key changed on 17 September 2022; an example of how long an unscanned leak
    can last

Private repositories are not safe either. Uber's were private; the attackers
got in with an engineer's reused password. A private repository is read by
everyone who works on it, every tool they connect to it, and every machine that
has cloned it.

### CI logs and environment variables

A build server needs secrets to do its job: a token to push the image, a key
to sign the release, cloud credentials to deploy. The usual way to hand them
over is an **environment variable**, and environment variables have three
habits that make them leak.

They are **inherited**. Every child process gets a copy of its parent's
environment, so a secret given to a deploy script is also given to every
compiler, test runner, package install hook and helper script it starts,
including ones written by strangers and pulled in as dependencies. They are
**visible**: on Linux, a process's environment can be read from
`/proc/<pid>/environ` by the same user, and error pages and debugging
endpoints are fond of printing them. And they are **printed**: `env`, `set -x`
in a shell script, a test that dumps its configuration on failure, a verbose
flag on a deploy tool. CI systems mask the secrets they know about in logs, but
masking matches exact strings, so a secret that has been Base64-encoded,
URL-encoded or split across lines comes out in the clear.

In January 2021 an attacker changed a script that thousands of build pipelines
downloaded and ran on every build: the Bash uploader of Codecov, a
code-coverage service. One added line sent the output of `env`, the whole
environment of the build, to a server the attacker controlled. The change sat
there from 31 January until 1 April 2021, when a customer noticed that the
script's checksum did not match the one published on GitHub. Codecov disclosed
it on 15 April. Every secret in every affected build's environment had to be
treated as stolen. The way the attacker got in is the second lesson: a
credential that let them change the script had been extracted from one of
Codecov's own Docker images, because of a mistake in how the image was built.

!!! note "Life story: the Codecov uploader compromise"
    **Born:** 31 January 2021, when an attacker used a credential taken from
    a Codecov Docker image to alter the company's Bash uploader script ·
    **Purpose:** the added line posted each build's full environment to the
    attacker · **Helped:** steal CI secrets from Codecov's customers for two
    months; detected on 1 April 2021 by a customer who compared checksums,
    disclosed 15 April · **Status:** closed; the case for pinning downloaded
    scripts by hash, and for keeping long-lived secrets out of CI environments

The second big CI case came two years later. On 4 January 2023 CircleCI, a
hosted CI service, told every customer to rotate every secret they had stored
with it. Its incident report, published on 13 January, explained why. On 16
December 2022 malware on one engineer's laptop, missed by the antivirus
software, had stolen a session cookie for the company's single sign-on, a
session already backed by two-factor authentication. With it the attacker
impersonated the engineer, reached production systems, and on 22 December
copied customer data, including environment variables, tokens and keys.
CircleCI encrypted that data at rest, but the attacker also took the encryption
keys from a running process, so the encryption did not help. A customer's
report of suspicious GitHub OAuth activity late in December started the
investigation.

!!! note "Life story: the CircleCI breach"
    **Born:** 16 December 2022, when infostealer malware on an engineer's
    laptop stole a two-factor-backed single sign-on session cookie ·
    **Purpose:** to reach CircleCI's production systems and the secrets its
    customers stored there · **Helped:** the theft, on 22 December, of customer
    environment variables, tokens and keys, with the keys that decrypted them;
    a 4 January 2023 notice told all customers to rotate everything · **Status:**
    closed; the strongest argument for CI credentials that expire within the
    hour (§12.5)

Code it. The first fix for environment variables is to stop passing the whole
environment down. The demonstration needs no network, only Python and a child
process:

```python
# Environment variables are inherited: every child process gets a copy.
import os, subprocess, sys

os.environ["DB_PASSWORD"] = "correct-horse-battery"     # set by the deploy tool
child = "import os; print('  child sees:', os.environ.get('DB_PASSWORD'))"

print("Break it: run a helper with the default environment", flush=True)
subprocess.run([sys.executable, "-c", child], check=True)

print("Fix it: give the helper only what it needs", flush=True)
minimal = {"PATH": os.environ.get("PATH", ""), "LANG": "C.UTF-8"}
subprocess.run([sys.executable, "-c", child], env=minimal, check=True)
```

```text
Break it: run a helper with the default environment
  child sees: correct-horse-battery
Fix it: give the helper only what it needs
  child sees: None
```

The better fix is to not have the secret in the environment at all: read it
from a file the service alone can read (a mounted secret in Kubernetes is a
file on a memory-backed file system), or fetch it from a secret store at start
up with the service's own identity (§12.5), and keep it in one variable inside
the process.

### Container images

A container image is a stack of layers, and each layer is an archive of the
files one build step added or changed. Deleting a file in a later step adds a
"whiteout" marker; the file is still inside the earlier layer, and anyone who
can pull the image can unpack it. So `COPY .env .` followed by `RUN rm .env`
publishes the file. So does a build argument holding a token, which is recorded
in the image's history.

Markus Dahlmanns and colleagues at RWTH Aachen University measured this at
ASIA CCS 2023. They scanned 337,171 images from Docker Hub and from 8,076
private registries they found exposed on the internet, and found secrets in
8.5% of them: 52,107 private keys and 3,158 API secrets, most of them for cloud
services. They also found that some of the leaked private keys were in use on
the internet, on TLS and SSH servers. Codecov's key, above, came out of an
image in the same way.

The fix is in the build: use the build system's secret mounts (Docker
BuildKit's `--mount=type=secret`), which make a secret visible to one `RUN`
step without writing it to a layer; build in one stage and copy only the
output into a clean final stage; and scan the finished image, every layer, not
just the final file system.

### Logs, crash dumps and debugging

The last stop is the running service, and the tools that watch it. A request
log that records headers records `Authorization` and `Cookie`. An error
handler that prints its local variables prints the key it was holding. A crash
dump is a copy of the process's memory, and a process that signs tokens has
the signing key in its memory. [Chapter 8](08-Hostile-Input.md) (§8.7)
explains how to keep keys out of swap and core dumps at the operating system
level, and [Chapter 9](09-APIs-That-Resist-Misuse.md) how to design error paths
that do not leak. The operations rule is short: redact before you write, and
treat every dump as if it holds keys, because it may. §12.4 is the case where a
dump was blamed, and then the blame was withdrawn.

Code it. Redaction belongs at the point where the log line is formed, before
it reaches a file, a shipper or a third-party log service. Python's `logging`
module lets a filter rewrite each record:

```python
# Redact secrets before a log line is written, not after.
import logging, re

class PrintHandler(logging.Handler):
    def emit(self, record):
        print(self.format(record))

SECRET = re.compile(r"(?i)((?:authorization|cookie|x-api-key|password|token)['\"]?\s*[:=]\s*['\"]?)"
                    r"(?:Bearer\s+)?[^'\",\s}]+")

class Redact(logging.Filter):
    def filter(self, record):
        record.msg = SECRET.sub(r"\1[REDACTED]", record.getMessage())
        record.args = ()
        return True

log = logging.getLogger("api")
log.setLevel(logging.INFO)
handler = PrintHandler()
handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
log.addHandler(handler)

headers = {"Host": "api.example", "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.e30.ZRrH",
           "Cookie": "session=8f14e45fceea167a"}
log.info("Break it: request failed, headers=%s", headers)
handler.addFilter(Redact())
log.info("Fix it: request failed, headers=%s", headers)
log.info("retry with password=%s", "hunter2")
```

```text
INFO Break it: request failed, headers={'Host': 'api.example', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.ZRrH', 'Cookie': 'session=8f14e45fceea167a'}
INFO Fix it: request failed, headers={'Host': 'api.example', 'Authorization': '[REDACTED]', 'Cookie': '[REDACTED]'}
INFO retry with password=[REDACTED]
```

A filter like this is a safety net with holes: it catches the names it knows.
The stronger habit is structural. Log an allowlist of fields rather than whole
objects, and give secrets a type whose `__repr__` prints `[REDACTED]`, so that
no accidental `print` or `%s` can show them (chapter 9 builds one).

What to do with this:

- Turn on secret scanning for every repository, private ones included, and scan
  the full history once (§12.3, §12.6).
- Give build steps the secrets they need and no others; never `env`, `set -x`
  or print configuration in CI; pin downloaded scripts and actions by hash.
- Never copy a secret into an image layer; use build-time secret mounts and
  scan images, every layer, before you push them.
- Redact at the logger, log allowlisted fields, and keep crash dumps of
  key-holding processes off by default and on a short retention when on.

## 12.3 Code it: a secret scanner

*Level: intermediate.*

Every secret scanner, from the command-line tools to the ones built into code
hosts, combines two kinds of rule. **Pattern rules** match secrets with a known
shape: an AWS access key ID is `AKIA` or `ASIA` followed by sixteen capital
letters and digits; a PEM private key starts with `-----BEGIN` and ends its
first line with `PRIVATE KEY-----`; a GitHub token starts with `ghp_`, `gho_`,
`ghu_`, `ghs_` or `ghr_`. A pattern rule is precise when the shape is
distinctive, and blind to everything else. **Entropy rules** look for strings
that look random, on the theory that a random 32-character string in a
configuration file is more likely a key than a word. They catch secrets with
no fixed shape, and they also catch every hash, UUID and compressed blob in
the repository. Dylan Ayrey's truffleHog (2016) popularized entropy scanning of
Git history; gitleaks (2018) and Yelp's detect-secrets (2018) followed, and all
of them now mix both kinds of rule.

### Entropy by hand

The **Shannon entropy** of a string, as scanners compute it, treats the
string's own characters as a sample from an unknown source. If character $c$
appears $n_c$ times in a string of length $n$, its frequency is $p_c = n_c/n$
and

$$H = \sum_c p_c \log_2 \frac{1}{p_c} \quad \text{bits per character.}$$

Take `hunter2hunter2`, 14 characters. Seven distinct characters (`h u n t e r
2`) each appear twice, so every $p_c = 2/14 = 1/7$ and

$$H = 7 \cdot \tfrac{1}{7} \log_2 7 = \log_2 7 \approx 2.81 \text{ bits per character.}$$

Now take a 32-character string in which all 32 characters are different. Each
has $p_c = 1/32$, so $H = \log_2 32 = 5$ bits per character. That is the most
any 32-character string can score: $H \le \log_2 n$, and $H \le \log_2 k$ for an
alphabet of $k$ symbols. Two consequences follow. A random hexadecimal string
can never score above 4 (sixteen symbols), so a scanner needs a lower
threshold for hex than for Base64, whose 64 symbols allow up to 6. And short
strings cannot score high at all, so entropy rules only work above a minimum
length, usually 20 characters.

This number is not the entropy of the secret in the sense of
[book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md). It
measures how evenly the characters are spread in this one string, not how
unpredictable the source was. `password12345678` scores 3.88, the same as a
random Git commit hash, because both use their characters about evenly:

```python
import math
from collections import Counter

def entropy(s):
    """Shannon entropy in bits per character, from the string's own letter counts."""
    n = len(s)
    return sum(c / n * math.log2(n / c) for c in Counter(s).values())

for s in ["aaaaaaaaaaaaaaaa", "password12345678", "hunter2hunter2",
          "9fceb02d0ae598e95dc970b74767f19372d61af8",
          "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          "Zq8vP3kT9wLx2mN7rB4yC6dF1hJ5sA0e"]:
    print(f"{entropy(s):5.2f} bits/char  {len(s):3} chars  {s}")
```

```text
 0.00 bits/char   16 chars  aaaaaaaaaaaaaaaa
 3.88 bits/char   16 chars  password12345678
 2.81 bits/char   14 chars  hunter2hunter2
 3.87 bits/char   40 chars  9fceb02d0ae598e95dc970b74767f19372d61af8
 4.66 bits/char   40 chars  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
 5.00 bits/char   32 chars  Zq8vP3kT9wLx2mN7rB4yC6dF1hJ5sA0e
```

The fifth string is the example AWS secret access key from Amazon's own
documentation, which is why it ends in `EXAMPLEKEY`; scanners are tested
against it, and so is the one below.

### The scanner

The scanner below has four pattern rules and one entropy rule. The entropy
rule looks at runs of at least 20 Base64 or URL-safe characters, uses a
threshold of 3.0 for hex and 4.5 for everything else (the values truffleHog
started with), and, in its careful mode, fires only on a line that also names
something secret-sounding: `secret`, `token`, `password`, `key`. It prints each
finding redacted, because a scanner's own report is a place secrets leak.

```python
# A small secret scanner: pattern rules for secrets with a known shape, and
# an entropy rule for random-looking strings next to a secret-sounding name.
import math, re
from collections import Counter

def entropy(s):
    n = len(s)
    return sum(c / n * math.log2(n / c) for c in Counter(s).values())

RULES = [
    ("AWS access key ID", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("private key", re.compile(r"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36}\b")),
    ("password in URL", re.compile(r"\b[a-z][a-z0-9+.-]*://[^/\s:@]+:[^/\s:@]+@")),
]
TOKEN = re.compile(r"[A-Za-z0-9+/_-]{20,}={0,2}")
NAME = re.compile(r"(?i)(secret|token|passw|api.?key|private|credential|auth)")
HEX = set("0123456789abcdef")

def suspicious(word):
    # random hex carries at most 4 bits a character, base64 up to 6
    limit = 3.0 if set(word.lower()) <= HEX else 4.5
    return entropy(word) > limit

def scan(text, need_name=True):
    for lineno, line in enumerate(text.splitlines(), 1):
        for rule, pattern in RULES:
            for m in pattern.finditer(line):
                yield lineno, rule, m.group()
        if need_name and not NAME.search(line):
            continue
        for m in TOKEN.finditer(line):
            if suspicious(m.group()) and not any(p.search(m.group()) for _, p in RULES):
                yield lineno, f"high entropy ({entropy(m.group()):.2f})", m.group()

def redact(s):
    return s[:4] + "..." + f"[{len(s)} chars]"

SAMPLE = """\
# deploy.env, committed by mistake
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DATABASE_URL=postgres://app:hunter2hunter2@db.internal:5432/app
SESSION_SECRET=Zq8vP3kT9wLx2mN7rB4yC6dF1hJ5sA0e
LOG_LEVEL=info
# pinned dependency and build stamp: not secrets
BUILD_COMMIT=9fceb02d0ae598e95dc970b74767f19372d61af8
REQUEST_ID_FORMAT=550e8400-e29b-41d4-a716-446655440000
"""

print("with the name rule:")
for lineno, rule, hit in scan(SAMPLE):
    print(f"  line {lineno}: {rule:22} {redact(hit)}")
print("entropy alone, on every line:")
for lineno, rule, hit in scan(SAMPLE, need_name=False):
    if rule.startswith("high"):
        print(f"  line {lineno}: {rule:22} {redact(hit)}")
```

```text
with the name rule:
  line 2: AWS access key ID      AKIA...[20 chars]
  line 3: high entropy (4.66)    wJal...[40 chars]
  line 4: password in URL        post...[30 chars]
  line 5: high entropy (5.00)    Zq8v...[32 chars]
entropy alone, on every line:
  line 3: high entropy (4.66)    wJal...[40 chars]
  line 5: high entropy (5.00)    Zq8v...[32 chars]
  line 8: high entropy (3.87)    9fce...[40 chars]
```

### Break it, fix it

**Patterns alone miss.** Drop the entropy rule and the scanner reports lines 2
and 4 only. The AWS secret access key on line 3 and the session secret on line
5 have no fixed shape, and they are the dangerous ones: the access key ID on
line 2 identifies a key, but the secret on line 3 is the key.

**Entropy alone cries wolf.** Run the entropy rule on every line and it flags
line 8, a Git commit hash, which is random-looking hex because SHA-1 output is
meant to look random. A real repository has thousands of such strings: commit
hashes in lock files, `integrity="sha384-..."` attributes, test vectors,
minified code, Base64 images. A scanner that reports them all is a scanner
people learn to ignore. The UUID on line 9 escapes only because its hyphens
lower the score below 4.5.

**The fix is context.** Requiring a secret-sounding name on the line keeps
lines 3 and 5 and drops line 8, at the cost of missing a random secret stored
under an innocent name. Real scanners add more context of the same kind:
allowlists of paths (`package-lock.json`, `test/vectors/`), allowlists of
known-public values (the AWS documentation keys above, which a production
scanner should list and skip), checksums built into the token format (§12.6),
and, best of all, **verification**: asking the service whether the candidate
key works. GitHub, GitGuardian and truffleHog all check many candidates against
the issuing service before alerting, which turns "this looks like a key" into
"this is a live key". Verification must use a harmless read-only call, and it
must never send the candidate anywhere but the service that issued it.

A scanner is a safety net, not a design. It finds the secrets that were
committed; it does nothing about the secret that is copied into a chat message,
a ticket or a wiki page, all of which GitGuardian's later reports found to be
leaking too. The design answer is to have fewer long-lived secrets to leak,
which is §12.5.

What to do with this:

- Run a scanner in three places: on the developer's machine before commit, on
  the code host before a push is accepted (§12.6), and over the full history
  of every repository once, because the old leaks are still there.
- Tune by context and by allowlists, not by raising entropy thresholds until the
  noise stops; and prefer tools that verify candidates with the issuer.
- Redact findings in the scanner's own output and in tickets about them.

## 12.4 Storm-0558, told fully

*Level: intermediate.*

[Chapter 1](01-What-Cryptographic-Engineering-Is.md) previewed this case in a
paragraph. It belongs here because it contains almost every lesson in this
chapter at once: a long-lived key, a rotation that stopped, a validation rule
that was assumed rather than written, a debugging environment, an explanation
that was later withdrawn, and logs that one customer happened to pay for.
Figure 12.2 shows the timeline.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Timeline of the Storm-0558 signing key from its creation in 2016 to the Cyber Safety Review Board report in April 2024" fill="currentColor" font-size="13">
<line x1="40" y1="160" x2="610" y2="160" stroke="currentColor" stroke-width="2"/>
<polygon points="618,160 606,154 606,166"/>
<line x1="60" y1="152" x2="60" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="60" y="186" text-anchor="middle">2016</text>
<text x="60" y="124" text-anchor="middle">consumer</text>
<text x="60" y="140" text-anchor="middle">key created</text>
<line x1="150" y1="152" x2="150" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="150" y="186" text-anchor="middle">Sep 2018</text>
<text x="150" y="208" text-anchor="middle">one key list for</text>
<text x="150" y="224" text-anchor="middle">consumer and</text>
<text x="150" y="240" text-anchor="middle">enterprise</text>
<line x1="250" y1="152" x2="250" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="250" y="186" text-anchor="middle">2021</text>
<text x="250" y="92" text-anchor="middle">due to retire;</text>
<text x="250" y="108" text-anchor="middle">rotation stopped;</text>
<text x="250" y="124" text-anchor="middle">crash dump said</text>
<text x="250" y="140" text-anchor="middle">to hold key</text>
<line x1="360" y1="152" x2="360" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="360" y="186" text-anchor="middle">15 May 2023</text>
<text x="360" y="208" text-anchor="middle">forged tokens</text>
<text x="360" y="224" text-anchor="middle">read mail</text>
<line x1="430" y1="152" x2="430" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="430" y="124" text-anchor="middle">Jun-Jul 2023</text>
<text x="430" y="140" text-anchor="middle">found, disclosed</text>
<line x1="490" y1="152" x2="490" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="490" y="208" text-anchor="middle">6 Sep 2023</text>
<text x="490" y="224" text-anchor="middle">crash-dump</text>
<text x="490" y="240" text-anchor="middle">account</text>
<line x1="560" y1="152" x2="560" y2="168" stroke="currentColor" stroke-width="2"/>
<text x="560" y="92" text-anchor="middle">Mar 2024</text>
<text x="560" y="108" text-anchor="middle">dump account</text>
<text x="560" y="124" text-anchor="middle">withdrawn;</text>
<text x="560" y="140" text-anchor="middle">Apr: CSRB report</text>
<rect x="56" y="270" width="308" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="210" y="304" text-anchor="middle" font-size="12.5">the key stays valid for seven years</text>
<rect x="250" y="288" width="114" height="6" fill="currentColor" fill-opacity="0.7"/>
<text x="460" y="304" text-anchor="middle" font-size="12.5">dark: past its planned retirement</text>
</svg>
<figcaption>Figure 12.2. The Storm-0558 key, from creation to the review. The forgeries took weeks; the conditions for them took seven years to build. The timeline is not to scale.</figcaption>
</figure>

### What happened

On 11 July 2023 Microsoft announced that a group it tracks as Storm-0558,
which it assessed to be a China-based espionage actor, had been reading email
in Outlook on the web (OWA) and Outlook.com since 15 May. The accounts belonged
to about 25 organizations, government agencies among them, and to consumer
accounts linked to them. The group had not stolen passwords or phished anyone.
It had forged the access tokens that Microsoft's mail services accept as proof
of who is asking, and it had signed them with a genuine Microsoft key.

Microsoft has two identity systems. Microsoft accounts (MSA) are the consumer
side: Outlook.com, Xbox, a personal OneDrive. Azure Active Directory, since
renamed Entra ID, is the enterprise side: a company's or an agency's
employees. Each system signs its tokens with its own keys, and publishes the
public halves in a metadata document so that services can check signatures.
The key Storm-0558 held was an MSA consumer signing key, created in 2016.

Microsoft's technical analysis of 14 July 2023 said two things had to go wrong
together. First, the attackers had the private half of that consumer key.
Second, a validation error in Microsoft's code let the enterprise mail service
accept a token signed with a consumer key as if it were an enterprise token.
The first is a key-storage failure; the second is a key-scope failure. Either
alone would have been survivable: a stolen consumer key could have reached
consumer mailboxes, which is bad but bounded, and the validation gap without a
stolen key reached nothing.

### The key that should have been retired

The Cyber Safety Review Board, a US body that reviews major cyber incidents,
published its report on 2 April 2024. It found that the 2016 key had been due
for retirement in March 2021. Microsoft had rotated consumer keys by hand and
rarely, and in 2021 it stopped rotating them altogether after a manual
rotation caused a major cloud outage. It put no automated rotation in place
and no alert for keys that were still active past their age. So a key created
in 2016 was still trusted in 2023, and every token it signed was good.

This is the plainest operations lesson in the case. A rotation that is manual
and risky gets postponed, and a postponed rotation becomes no rotation. The fix
is to make rotation automatic and boring, with an overlap so that it cannot
cause an outage (§12.6), and to alert on age, not just on expiry.

### The check that was assumed

In September 2018 Microsoft had introduced a common key metadata endpoint, a
single published list of signing keys, to serve applications that accept both
consumer and enterprise accounts. With one list, a validator that checked only
"is this signature made by a key on the list?" would accept a consumer key's
signature on an enterprise token. Validating correctly needed one more check:
that the key which signed the token is allowed to sign for the issuer the
token names. Microsoft updated its documentation to say so, but, by its own
September 2023 account, the libraries were not changed to do that check
automatically, and the mail system's developers assumed the library performed
the full validation. Wiz researcher Shir Tamari argued on 21 July 2023 that the
same key could therefore have forged tokens for other Azure applications that
used the shared endpoint; Microsoft called that speculative. Microsoft
revoked the key and blocked tokens signed with it before the July
announcement.

The token formats are explained in
[Protocols, Chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md); the
bug can be reproduced in a few lines. HMAC stands in for the real RSA
signatures, which changes nothing about the logic:

```python
# Storm-0558 in miniature: one published key set, two kinds of issuer.
# HMAC stands in for the real RSA signatures to keep the code short; the bug
# is in which keys are trusted for which issuer, not in the algorithm.
import base64, hashlib, hmac, json

def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def unb64(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))

def sign(kid, key, claims):
    head = b64(json.dumps({"alg": "HS256", "kid": kid}).encode())
    body = b64(json.dumps(claims).encode())
    tag = hmac.new(key, f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{b64(tag)}"

CONSUMER = "https://login.consumer.example"            # personal accounts
ENTERPRISE = "https://login.enterprise.example/tenant-42"  # one company's tenant
KEYS = {"msa-2016": b"consumer key, created 2016",     # the stolen one
        "aad-2023": b"enterprise key, in an HSM"}
SCOPE = {"msa-2016": {CONSUMER}, "aad-2023": {ENTERPRISE}}   # who each key may speak for

def check_signature(token):
    head, body, tag = token.split(".")
    kid = json.loads(unb64(head))["kid"]
    good = hmac.new(KEYS[kid], f"{head}.{body}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(good, unb64(tag)):
        raise ValueError("bad signature")
    return kid, json.loads(unb64(body))

def validate_broken(token, expected_issuer):
    kid, claims = check_signature(token)      # any key in the set will do
    if claims["iss"] != expected_issuer:
        raise ValueError("wrong issuer")
    return claims

def validate_fixed(token, expected_issuer):
    kid, claims = check_signature(token)
    if claims["iss"] != expected_issuer or claims["iss"] not in SCOPE[kid]:
        raise ValueError(f"key {kid} may not sign for {claims['iss']}")
    return claims

# The attacker holds only the consumer key, and signs an enterprise token with it.
forged = sign("msa-2016", KEYS["msa-2016"],
              {"iss": ENTERPRISE, "aud": "mail", "sub": "diplomat@agency.example"})
for check in (validate_broken, validate_fixed):
    try:
        claims = check(forged, ENTERPRISE)
        print(f"{check.__name__}: ACCEPTED, mailbox of {claims['sub']}")
    except ValueError as e:
        print(f"{check.__name__}: rejected ({e})")
```

```text
validate_broken: ACCEPTED, mailbox of diplomat@agency.example
validate_fixed: rejected (key msa-2016 may not sign for https://login.enterprise.example/tenant-42)
```

The broken validator checks the issuer claim, which is what most people think
of. But the issuer claim is inside the token, written by whoever signed it, so
checking it proves nothing about the key. Only the binding from key to issuer,
held by the verifier, does. In the language of
[Chapter 10](10-The-Life-of-a-Key.md), each key needs a purpose, and the
verifier must enforce it.

### How the key got out: two accounts

On 6 September 2023 Microsoft published the results of its investigation into
how the key was taken. The account was specific. In April 2021 the consumer
signing system crashed, and a crash dump was written. A race condition, it
said, had let the key material be included in the dump, which should never
have happened. The company's credential scanning, which is meant to catch keys
in such files, did not detect it. The dump was then moved from the isolated
production network into a debugging environment on the internet-connected
corporate network, where engineers could look at it. Some time after April
2021, Storm-0558 compromised the corporate account of a Microsoft engineer who
had access to that environment. Microsoft said this was the most probable
route, and that its logs from that period, under its retention policies, did
not go back far enough to show the copying.

On 12 March 2024 Microsoft added a correction to the same post. It had not, in
fact, found a crash dump containing the key. The crash-dump story was a
hypothesis, not a finding. The Review Board's report says Microsoft told the
Board this in November 2023, and that the public post stayed uncorrected for
months. The Board concluded that Microsoft did not know how or when the key was
taken. That is where the public record stands.

The withdrawn account is still worth learning from, because every step in it
is a common failure: secrets in crash dumps, dumps moved to less protected
networks for convenience, scanners that look for key-shaped text and miss raw
key bytes, and engineering accounts that reach both production data and the
internet. The scanner failure is easy to show. A pattern scanner of the kind
in §12.3 looks for PEM headers and `secret=` text; a key in a dump is 32 raw
bytes in the middle of a heap. What finds it is a scanner that knows which keys
the system owns and looks for their fingerprints:

```python
# Is a signing key inside this crash dump? Two scanners, one dump.
import hashlib, random, re

rng = random.Random(2021)
def noise(n):
    return bytes(rng.getrandbits(8) for _ in range(n))

signing_key = hashlib.sha256(b"a raw 32-byte signing key, for the demo").digest()
dump = (noise(5000) + b"\x00stack frame: sign_token()\x00" + noise(77)
        + signing_key + noise(9000))            # the key sits in a heap block

# Scanner 1 looks for things that look like credentials: PEM blocks, key=... text.
looks_like = re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:secret|password)\s*[=:]")
print("pattern scanner:", [m.start() for m in looks_like.finditer(dump)] or "nothing found")

# Scanner 2 knows the fingerprints (SHA-256) of the keys the system owns, and
# hashes every 32-byte window of the dump. It never holds the keys themselves.
owned = {hashlib.sha256(signing_key).hexdigest(): "token-signing key 2016"}
hits = [(i, owned[h]) for i in range(len(dump) - 31)
        if (h := hashlib.sha256(dump[i:i + 32]).hexdigest()) in owned]
print("fingerprint scanner:", hits)
```

```text
pattern scanner: nothing found
fingerprint scanner: [(5104, 'token-signing key 2016')]
```

A real system holds RSA keys, whose private parts are a few large integers in
some library's internal layout, so a production fingerprint scanner looks for
each prime factor's bytes in both byte orders. But the principle is the same,
and the better fix sits one layer down: a key held in a hardware security
module never appears in the memory of the process that uses it, so no dump can
contain it ([Chapter 11](11-Hardware-for-Keys.md)).

### Detection, and what the Board found

Storm-0558 was not found by Microsoft. In the middle of June 2023 the US State
Department's security team noticed mail being read in a pattern it did not
expect. It could see that because its license included Microsoft's premium
audit logging, which records an event called `MailItemsAccessed` each time a
mailbox item is read; customers on cheaper licenses did not get that record.
The State Department alerted Microsoft, which began its investigation on 16
June. Under pressure from the US government, Microsoft announced on 19 July
2023 that it would give the detailed logs to more customers at no extra cost.

The Board's report, dated 20 March 2024 and released on 2 April, said the
intrusion had reached the Exchange Online mailboxes of 22 organizations and
more than 500 individuals around the world, among them the US Secretary of
Commerce and the US ambassador to China. The State Department told Senate staff
in September 2023 that about 60,000 unclassified emails had been taken from
its accounts alone. The Board called the intrusion preventable, the result of
"a cascade of security failures" at Microsoft, and said the company's security
culture was inadequate and needed an overhaul. Among its recommendations: keep
identity signing keys in hardware, rotate them automatically, and give every
customer the logs needed to detect an intrusion as a basic feature, not a paid
one.

Microsoft's response, under the Secure Future Initiative it announced in
November 2023, was to move the MSA and Entra ID token-signing keys into
hardware security modules and, later, into confidential virtual machines, with
automatic rotation, and to fix scope validation in its identity libraries.

!!! note "Life story: the Storm-0558 signing key"
    **Born:** 2016, a Microsoft consumer-account (MSA) token-signing key, due
    for retirement in March 2021 but never rotated after manual rotation was
    stopped that year · **Purpose:** to sign tokens for consumer Microsoft
    services · **Helped:** an espionage group to forge enterprise tokens,
    through a missing key-scope check, and read mail at 22 organizations and
    more than 500 individuals from 15 May 2023; a crash-dump explanation
    (September 2023) later withdrawn (March 2024); the Cyber Safety Review
    Board's report of April 2024 · **Status:** revoked in 2023; how it was
    stolen is not publicly known; [Chapter 1](01-What-Cryptographic-Engineering-Is.md)
    has the short version

What to do with this:

- Give every signing key a scope (issuer, audience, purpose) held by the
  verifier, and check it on every token; never trust a claim in a token to
  choose the rules for checking that token.
- Rotate signing keys automatically on a schedule, alert on any key older than
  its planned life, and make rotation cheap enough that nobody postpones it.
- Keep signing keys in hardware; if a key must be in process memory, keep
  dumps of that process off, and scan dumps for your own keys' fingerprints.
- Keep the logs that would show the theft, for longer than an attacker is
  likely to wait (Microsoft's logs from 2021 had aged out before anyone
  looked).

## 12.5 Secret stores and short-lived credentials

*Level: intermediate.*

Scanning finds leaks. The deeper fix is to change what can leak. Two changes do
most of the work: keep the secrets that must exist in one guarded place, and
replace as many as possible with credentials that expire on their own within
minutes or hours.

### Secret stores

A **secret store** holds secrets and hands each one only to the identities a
policy names, logging every read. HashiCorp's Vault, released as version 0.1 in
April 2015, is the best-known independent one; the cloud providers each have
one (AWS Secrets Manager, Google Cloud Secret Manager, Azure Key Vault), and
Kubernetes has its own `Secret` objects, which are only Base64-encoded unless
encryption at rest is turned on. A store gives four things that a file or an
environment variable cannot: one place to look, a policy per reader, an audit
log of reads, and versions, so that a new value can be written while the old
one is still in use.

A store does not make a secret safe once it has been read. The value still
reaches the process's memory, and from there every leak of §12.2 is still
open. And a store raises the **secret zero** problem: to read from the store,
a service must prove who it is, and if it proves that with a stored password,
that password is the new secret to leak. The way out is to let the platform
vouch for the workload. A cloud virtual machine gets an identity from its
instance metadata service; a Kubernetes pod gets a signed service-account
token; a CI job gets a signed token from its CI provider. None of these is
typed by a person or stored in a repository.

Vault's most useful idea goes further: **dynamic secrets**. Instead of storing
a database password, Vault holds an administrator credential for the database
and creates a new user with a random password for each client that asks,
attached to a **lease** of, say, one hour. When the lease ends, Vault deletes
the user. A leaked dynamic credential is useful only until its lease runs out,
and the audit log says exactly which client it was issued to.

!!! note "Life story: HashiCorp Vault"
    **Born:** April 2015, version 0.1, from HashiCorp · **Purpose:** a
    central store for secrets with per-identity policies, audit logs, and
    dynamic credentials that are created on request and revoked when their
    lease ends · **Helped:** make "no secrets in config files" practical for
    ordinary teams; its lease model shaped the cloud providers' own tools ·
    **Status:** maintained; relicensed from the Mozilla Public License to the
    Business Source License in August 2023, after which the Linux Foundation's
    OpenBao project forked the last open version

### Federation: no key at all

The best long-lived secret is the one that does not exist. A CI pipeline that
deploys to a cloud account used to need a cloud access key stored in the CI
system, which is what the Codecov and CircleCI attackers collected. **OIDC
federation** replaces it. GitHub announced it for GitHub Actions on 27 October
2021 and made it generally available on 23 November 2021; GitLab, CircleCI and
the other CI services followed. Figure 12.3 shows the exchange.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="OIDC federation: a CI job gets a signed identity token from its CI provider and exchanges it at the cloud's token service for a credential that expires" fill="currentColor" font-size="14">
<rect x="20" y="30" width="150" height="60" rx="6" fill="none" stroke="currentColor"/>
<text x="95" y="56" text-anchor="middle" font-weight="bold">CI job</text>
<text x="95" y="76" text-anchor="middle" font-size="12">holds no cloud key</text>
<rect x="245" y="30" width="150" height="60" rx="6" fill="none" stroke="currentColor"/>
<text x="320" y="56" text-anchor="middle" font-weight="bold">CI provider</text>
<text x="320" y="76" text-anchor="middle" font-size="12">signs ID tokens</text>
<rect x="470" y="30" width="150" height="60" rx="6" fill="none" stroke="currentColor"/>
<text x="545" y="56" text-anchor="middle" font-weight="bold">cloud STS</text>
<text x="545" y="76" text-anchor="middle" font-size="12">trust policy</text>
<line x1="170" y1="48" x2="241" y2="48" stroke="currentColor" stroke-width="1.5"/>
<polygon points="245,48 236,43 236,53"/>
<text x="207" y="40" text-anchor="middle" font-size="12">1 ask</text>
<line x1="245" y1="74" x2="174" y2="74" stroke="currentColor" stroke-width="1.5"/>
<polygon points="170,74 179,69 179,79"/>
<text x="207" y="104" text-anchor="middle" font-size="12">2 signed token:</text>
<text x="207" y="120" text-anchor="middle" font-size="12">iss, aud, sub, exp</text>
<path d="M 95 90 L 95 160 L 545 160 L 545 94" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polygon points="545,90 540,99 550,99"/>
<text x="320" y="152" text-anchor="middle" font-size="11.5">3 present token; STS checks signature against provider's published keys,</text>
<text x="320" y="178" text-anchor="middle" font-size="11.5">then iss, aud and the subject (repository, branch) against the role's policy</text>
<path d="M 600 90 L 600 210 L 40 210 L 40 94" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="40,90 35,99 45,99"/>
<text x="320" y="232" text-anchor="middle" font-size="12">4 credential that expires in about an hour, scoped to one role</text>
</svg>
<figcaption>Figure 12.3. OIDC federation for CI. Nothing in the CI system is a long-lived cloud secret: the ID token lives minutes, the cloud credential about an hour, and the trust policy decides which repositories and branches may have one.</figcaption>
</figure>

The CI provider signs a short-lived OpenID Connect ID token for each job. It
names the provider (`iss`), the intended audience (`aud`), and the job's
**subject** (`sub`): for GitHub, a string such as
`repo:acme/web:ref:refs/heads/main`, or `repo:acme/web:pull_request` for a
pull request. The cloud's security token service checks the signature against
the provider's published keys, then checks the claims against the **trust
policy** of the role being requested, and returns a credential that expires.

All of the security now sits in that trust policy, and that is where it goes
wrong. In July 2023 Datadog Security Labs reported finding AWS roles that
trusted GitHub's token issuer without any condition on the subject. Every
GitHub Actions job in the world gets tokens from the same issuer, so any
GitHub user could write a workflow in their own repository and assume such a
role. Wiz and other researchers reported the same mistake. It is Storm-0558's
lesson in another form: the signature is real, and the question that matters
is whether this signer may speak for this purpose.

```python
# OIDC federation in miniature: a CI job proves who it is with a signed token
# from its CI provider, and the cloud trades it for a credential that expires.
from fnmatch import fnmatchcase

CI_ISSUER = "https://token.ci.example"

def ci_token(repo, ref, event="push"):
    # What the CI provider signs into its OIDC token (signature checks omitted:
    # assume the token's signature and expiry were verified already).
    sub = f"repo:{repo}:pull_request" if event == "pull_request" else f"repo:{repo}:ref:{ref}"
    return {"iss": CI_ISSUER, "aud": "cloud-sts", "sub": sub}

def exchange(claims, policy, now):
    if claims["iss"] != policy["iss"] or claims["aud"] != policy["aud"]:
        return "denied (issuer or audience)"
    if "sub" in policy and not fnmatchcase(claims["sub"], policy["sub"]):
        return f"denied (subject {claims['sub']})"
    return f"granted, a credential valid until t={now + 900} s"

broken = {"iss": CI_ISSUER, "aud": "cloud-sts"}                      # no subject at all
loose  = {"iss": CI_ISSUER, "aud": "cloud-sts", "sub": "repo:acme/*"}
fixed  = {"iss": CI_ISSUER, "aud": "cloud-sts", "sub": "repo:acme/web:ref:refs/heads/main"}

jobs = [("acme deploy from main", ci_token("acme/web", "refs/heads/main")),
        ("stranger's own repo", ci_token("mallory/anything", "refs/heads/main")),
        ("pull request to acme", ci_token("acme/web", "", "pull_request")),
        ("acme test repo", ci_token("acme/sandbox", "refs/heads/dev"))]
for name, policy in (("no sub", broken), ("sub acme/*", loose), ("exact sub", fixed)):
    print(f"policy {name}:")
    for job, claims in jobs:
        print(f"  {job:22} {exchange(claims, policy, now=0)}")
```

```text
policy no sub:
  acme deploy from main  granted, a credential valid until t=900 s
  stranger's own repo    granted, a credential valid until t=900 s
  pull request to acme   granted, a credential valid until t=900 s
  acme test repo         granted, a credential valid until t=900 s
policy sub acme/*:
  acme deploy from main  granted, a credential valid until t=900 s
  stranger's own repo    denied (subject repo:mallory/anything:ref:refs/heads/main)
  pull request to acme   granted, a credential valid until t=900 s
  acme test repo         granted, a credential valid until t=900 s
policy exact sub:
  acme deploy from main  granted, a credential valid until t=900 s
  stranger's own repo    denied (subject repo:mallory/anything:ref:refs/heads/main)
  pull request to acme   denied (subject repo:acme/web:pull_request)
  acme test repo         denied (subject repo:acme/sandbox:ref:refs/heads/dev)
```

The middle policy is the subtle one. A wildcard over the organization looks
strict, but it lets any repository in the organization deploy to production,
including a test repository anyone in the company can push to, and it lets a
pull request run with production credentials. Pull requests run code that has
not been reviewed, sometimes from outside contributors. The production role
should trust exactly the deploying branch (or a protected deployment
environment), and nothing else.

What to do with this:

- Move every CI-to-cloud credential to OIDC federation, and pin each role's
  trust policy to an exact repository and branch or environment; audit
  existing roles for missing or wildcard subject conditions.
- Use the platform's identity to reach the secret store, so that no
  bootstrap password exists; prefer dynamic, leased credentials for databases.
- For secrets that must stay static, keep them in one store, with a named
  owner, a policy per reader, and read logging that someone looks at.

## 12.6 Scanning, push protection and rotation

*Level: intermediate.*

### Tokens built to be found

The scanner of §12.3 struggled because most secrets have no shape. The fix
that works best is on the issuer's side: give every secret a shape. In April
2021 GitHub changed its token formats: every token now starts with a prefix
naming its type (`ghp_` for a personal access token, `gho_` for OAuth, `ghs_`
for server-to-server and so on), and its last six characters are a CRC32
checksum of the random part, written in base62. A scanner can then find
GitHub tokens with an exact pattern and reject almost every lookalike by
recomputing the checksum, before making any network call. npm and many other
services adopted the same idea.

```python
# A token format that scanners can find without guessing: a fixed prefix, the
# random part, and a CRC32 checksum, the idea behind GitHub's 2021 formats.
import secrets, string, zlib

ALPHABET = string.digits + string.ascii_letters          # base62
PREFIX = "demo_pat_"

def base62(n, width):
    out = ""
    for _ in range(width):
        n, r = divmod(n, 62)
        out = ALPHABET[r] + out
    return out

def mint():
    body = "".join(secrets.choice(ALPHABET) for _ in range(30))   # about 178 bits
    return PREFIX + body + base62(zlib.crc32(body.encode()), 6)

def looks_real(token):
    if not token.startswith(PREFIX) or len(token) != len(PREFIX) + 36:
        return False
    body, check = token[len(PREFIX):-6], token[-6:]
    return base62(zlib.crc32(body.encode()), 6) == check

t = mint()
print("minted:", t[:len(PREFIX)] + "...", len(t), "chars, checksum ok:", looks_real(t))
typo = t[:20] + ("A" if t[20] != "A" else "B") + t[21:]
print("one character changed:", looks_real(typo))
print("same shape, made up:", looks_real("demo_pat_" + "x" * 36))
```

```text
minted: demo_pat_... 45 chars, checksum ok: True
one character changed: False
same shape, made up: False
```

The checksum is not a security feature; CRC32 is public and anyone can compute
it. It is an accuracy feature: a random string has about a one in $2^{32}$
chance of carrying a valid checksum, so the false-positive rate of the
pattern drops to almost nothing. The random part, 30 base62 characters, holds
$30 \log_2 62 \approx 178.6$ bits. If you issue API keys, copy this design:
a prefix that names your service and the key type, enough randomness, a
checksum, and an entry in the code hosts' scanning programs so that leaked
keys are reported to you.

### Scanning at the code host, and push protection

Code hosts now scan for you. GitHub runs secret scanning on public
repositories and passes matches to the issuing service through its partner
program, so that, for example, a cloud provider can revoke or quarantine a key
minutes after it is pushed. In May 2023 GitHub made **push protection**, which
rejects a push that contains a recognized secret, available for all public
repositories, and at the end of February 2024 turned it on by default for
pushes to public repositories by every user. A developer can bypass the block
by giving a reason, which is recorded.

Push protection stops a secret before it is public, which is the only point at
which a leak can be undone for free. It does not stop secrets without a known
shape, secrets in private repositories unless the owner enables it, or
secrets pasted anywhere other than code. GitGuardian's 2025 report found that
leaks on public GitHub kept growing after push protection became the default,
with "generic" secrets, the ones without a recognizable shape, the largest
share. That is an argument for prefixed formats and for federation, not
against push protection.

!!! note "Life story: GitHub push protection"
    **Born:** 2022 as a feature for paying organizations; available for all
    public repositories in May 2023; on by default for pushes to public
    repositories from the end of February 2024 · **Purpose:** reject a push
    that contains a recognized secret before it becomes public · **Helped:**
    together with prefixed, checksummed token formats (April 2021), make the
    most common keys detectable with almost no false alarms · **Status:**
    current; blind to secrets without a known pattern, which GitGuardian's 2025
    report found to be most leaks

### The first hour after a leak

When a secret leaks, the order of the steps matters more than their speed.

<div class="mars-steps" markdown>

1. **Revoke or rotate the secret first.** Deleting the commit, the log line or
   the message does not un-leak it: it is in clones, forks, caches, CI logs,
   public archives of GitHub events, and the attacker's copy. Public leaks are
   found by automated scrapers within minutes, so assume use has begun.
2. **Look for use.** Read the issuer's logs for the secret's activity since the
   moment it leaked (and before, if you do not know that moment): new
   resources, unusual regions, data reads, new credentials created with it.
   A leaked key is often used to make other keys.
3. **Rotate what it could reach.** Credentials stored where the leaked one gave
   access, tokens it could mint, and anything that shared its storage.
4. **Clean up the source**, for hygiene, not safety: rewrite history if the
   repository allows it, and purge logs and images that hold the value.
5. **Fix the path.** Ask how the secret came to be there, and change that: a
   template that wrote it into a file, a missing `.gitignore`, a step that
   printed its environment. Then write it down.

</div>

### Rotation without an outage

Step 1 is only fast if rotation is routine. The reason teams postpone rotation,
as Microsoft did with its consumer keys, is that a rotation done as one swap
breaks everything signed or configured with the old value. The standard
answer is an overlap in three steps: publish the new key for verification
only; switch signing to it, while the old one still verifies; and retire the
old key once the longest-lived token signed with it has expired. Tokens carry
a key ID so the verifier knows which to use.

```python
# Rotating a signing key without an outage: a key ring with three states.
import hashlib, hmac

class KeyRing:
    def __init__(self):
        self.keys = {}            # kid -> (key, state): "next", "current" or "previous"

    def add(self, kid, key):      # step 1: publish the new key, verify-only
        self.keys[kid] = (key, "next")

    def promote(self, kid):       # step 2: sign with it; the old one only verifies
        for k, (key, state) in self.keys.items():
            if state == "current":
                self.keys[k] = (key, "previous")
        self.keys[kid] = (self.keys[kid][0], "current")

    def retire(self, kid):        # step 3: after the longest token lifetime has passed
        del self.keys[kid]

    def sign(self, msg):
        kid = next(k for k, (_, s) in self.keys.items() if s == "current")
        return kid, hmac.new(self.keys[kid][0], msg, hashlib.sha256).digest()

    def verify(self, msg, kid, tag):
        if kid not in self.keys:
            return False
        good = hmac.new(self.keys[kid][0], msg, hashlib.sha256).digest()
        return hmac.compare_digest(good, tag)

ring = KeyRing()
ring.add("2025-a", b"old key material")
ring.promote("2025-a")
old_token = ring.sign(b"session 1")

ring.add("2026-b", b"new key material")
print("new key published:  old token valid?", ring.verify(b"session 1", *old_token))
ring.promote("2026-b")
new_token = ring.sign(b"session 2")
print("new key signing:    old token valid?", ring.verify(b"session 1", *old_token),
      "| new token kid:", new_token[0])
ring.retire("2025-a")
print("old key retired:    old token valid?", ring.verify(b"session 1", *old_token),
      "| new token valid?", ring.verify(b"session 2", *new_token))
```

```text
new key published:  old token valid? True
new key signing:    old token valid? True | new token kid: 2026-b
old key retired:    old token valid? False | new token valid? True
```

The same three steps work for secrets that are not signing keys. For a
database password, keep two database users and alternate between them: set a
new password on the idle user, move the application to it, and only then
change the other. For an API key issued by a third party, most providers allow
two active keys for exactly this reason. [Chapter 10](10-The-Life-of-a-Key.md)
covers rotation of encryption keys, where old data must stay readable.

What to do with this:

- Turn on push protection and secret scanning for every repository, private
  ones included, and treat each bypass as a reviewed decision.
- If you issue keys, give them a prefix and a checksum, and join the code hosts'
  scanning programs.
- Write the leak runbook before you need it, with revocation first, and
  practice it on a harmless key.
- Rotate every secret on a schedule using an overlap, so that the emergency
  rotation is a rerun of the routine one.

## 12.7 Certificate operations

*Level: intermediate.*

How certificates are issued, why their lifetimes are falling and why
revocation mostly failed are the subject of
[Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md) (§2.5 to §2.7).
The operations side is narrower and more often fatal: knowing every
certificate you depend on, renewing each before it expires, and keeping the
chains your clients can build working when the authorities above you change.

### Three expiries

At 04:30 UK time on 6 December 2018 a certificate embedded in two versions of
Ericsson's SGSN-MME software, part of the mobile core network that carries
phone data, reached its expiry time. The software failed. O2 in the United
Kingdom lost mobile data for about a day, along with the operators that use
its network (giffgaff, Sky Mobile, Tesco Mobile and others), more than 30
million customers in all; SoftBank in Japan had an outage from the same cause
the same day. Ericsson apologized and said the certificate had been in the
software, not in the operators' configuration, so the operators could not
have seen it coming. That is the worst kind of certificate: one nobody knows
is there.

!!! note "Life story: the Ericsson SGSN-MME certificate"
    **Born:** inside two software releases of Ericsson's mobile core node,
    with a fixed expiry date · **Purpose:** an internal certificate the
    software relied on to work · **Helped:** take down mobile data for O2 and
    its partner networks in the UK for about a day, and SoftBank in Japan,
    on 6 December 2018 · **Status:** replaced by a software fix within a day;
    the standard example of an expiry hidden inside a product

On 3 February 2020 Microsoft Teams stopped working for about three hours on a
Monday morning. Microsoft's status account said it
plainly: an authentication certificate had expired. And on 30 September 2021,
at 14:01:15 UTC, the root certificate DST Root CA X3 expired, as planned years
in advance, and parts of the internet broke anyway.

DST Root CA X3 was the IdenTrust root that had cross-signed Let's Encrypt's
own root, ISRG Root X1, so that Let's Encrypt certificates were trusted on
devices that did not yet know ISRG Root X1. By 2021 most clients had ISRG Root
X1 in their trust store and could build a chain to it directly. Some could
not, and some could but did not. Figure 12.4 shows the two paths.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two certificate paths from a Let's Encrypt leaf: one through R3 to the self-signed ISRG Root X1, one through R3 to ISRG Root X1 cross-signed by the expired DST Root CA X3" fill="currentColor" font-size="14">
<rect x="20" y="100" width="120" height="44" rx="6" fill="none" stroke="currentColor"/>
<text x="80" y="127" text-anchor="middle">your site</text>
<rect x="185" y="100" width="100" height="44" rx="6" fill="none" stroke="currentColor"/>
<text x="235" y="127" text-anchor="middle">R3</text>
<line x1="140" y1="122" x2="181" y2="122" stroke="currentColor" stroke-width="1.5"/>
<polygon points="185,122 176,117 176,127"/>
<rect x="335" y="30" width="140" height="54" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="405" y="54" text-anchor="middle">ISRG Root X1</text>
<text x="405" y="72" text-anchor="middle" font-size="12">self-signed, to 2035</text>
<rect x="335" y="160" width="140" height="54" rx="6" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="405" y="184" text-anchor="middle">ISRG Root X1</text>
<text x="405" y="202" text-anchor="middle" font-size="12">cross-signed copy</text>
<rect x="510" y="160" width="120" height="54" rx="6" fill="currentColor" fill-opacity="0.12" stroke="currentColor"/>
<text x="570" y="184" text-anchor="middle">DST Root CA X3</text>
<text x="570" y="202" text-anchor="middle" font-size="12">expired 30 Sep 2021</text>
<line x1="285" y1="112" x2="331" y2="64" stroke="currentColor" stroke-width="1.5"/>
<polygon points="335,60 325,62 331,70"/>
<line x1="285" y1="132" x2="331" y2="180" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="335,184 325,182 331,174"/>
<line x1="475" y1="187" x2="506" y2="187" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="510,187 501,182 501,192"/>
<text x="560" y="62" text-anchor="middle" font-size="12">in the trust store:</text>
<text x="560" y="78" text-anchor="middle" font-size="12">path works</text>
<text x="405" y="238" text-anchor="middle" font-size="12">old OpenSSL 1.0.2 chose this path and failed; old Android ignored root expiry</text>
</svg>
<figcaption>Figure 12.4. The two chains a Let's Encrypt certificate could build in 2021. A client that knew ISRG Root X1 and searched for paths found the solid one; OpenSSL 1.0.2 followed the certificates the server sent, reached the expired root and failed instead of looking further.</figcaption>
</figure>

The failures fell into three groups. Old systems that did not have ISRG Root
X1 at all (macOS before 10.12.1, iOS before 10, Windows before XP SP3) could
not connect, which was expected. Clients built on **OpenSSL 1.0.2** had ISRG
Root X1 but still failed, because that version preferred the chain the server
sent, and when the chain ended at an expired trusted root it reported an
error rather than trying the other path. Many servers and appliances still ran
it, so the outages were in back ends: Scott Helme collected confirmed reports
from Palo Alto Networks, Cisco Umbrella, Fortinet, Heroku, Auth0, Catchpoint
and others. The fix was to remove the expired root from the trust store or
upgrade. The third group was a pleasant surprise: old Android devices,
which have no ISRG Root X1 and rarely receive updates, kept working, because
Let's Encrypt had arranged for its cross-signed certificate to run until 2024
and Android does not enforce the expiry of its trust anchors.

!!! note "Life story: DST Root CA X3"
    **Born:** 30 September 2000, an IdenTrust (originally Digital Signature
    Trust) root · **Purpose:** in its last years, to cross-sign ISRG Root X1
    so that Let's Encrypt certificates worked on clients that lacked Let's
    Encrypt's own root · **Helped:** Let's Encrypt grow from 2015 to hundreds
    of millions of sites before its own root was widely trusted · **Retired:**
    expired 30 September 2021 at 14:01:15 UTC; clients with OpenSSL 1.0.2 and
    other weak path builders broke · **Replaced by:** ISRG Root X1 (to 2035),
    and the ECDSA root ISRG Root X2 (to 2040)

### Automation is now required

The CA/Browser Forum's ballot SC-081, passed in April 2025, cuts the maximum
lifetime of a public TLS certificate from 398 days to 200 days from 15 March
2026, 100 days from 15 March 2027, and 47 days from 15 March 2029
([Protocols, §2.6](../protocols/02-Certificates-and-PKI.md) has the full
schedule and the reasons). At 47 days, a team that renews by hand renews
eight times a year per certificate. The operations consequences are direct:

- **Renew automatically, early.** Renew at about two thirds of the lifetime,
  leaving a third for retries. ACME clients do this by default; the ACME
  Renewal Information extension (ARI, RFC 9773, June 2025) lets the CA tell
  each client when to renew, so that a CA that must revoke many certificates
  can ask for early renewal.
- **Monitor independently.** Let's Encrypt stopped sending expiry reminder
  emails on 4 June 2025. Your own monitoring, checking the certificate each
  server actually presents, is the alarm now.
- **Know every certificate.** Certificate Transparency logs list every public
  certificate for your names (chapter 18 sets up the monitoring); internal
  CAs, client certificates, appliances and embedded certificates like
  Ericsson's are on no public list, and need an inventory you keep.
- **Test chains, not just leaves.** Check what a client with an old trust
  store and an old library would build, before a root or intermediate changes.

### Code it: expiry from the bytes

An expiry monitor needs only one field. [Chapter 3](03-ASN1-DER-and-Key-Files.md)
built a full DER reader and walked ISRG Root X2; at offset 124 it printed the
validity:

```text
 124     SEQUENCE (30)
 126       UTCTime (13) 200904000000Z
 141       UTCTime (13) 400917160000Z
```

By hand: the bytes at 124 are `30 1e`, a SEQUENCE of 30 bytes; inside it
`17 0d` is a UTCTime of 13 bytes, the ASCII text `200904000000Z`, then a second
`17 0d` and `400917160000Z`. UTCTime has a two-digit year: RFC 5280 says
`YY` of 50 or more means 19YY and below 50 means 20YY, so `40` is 2040 (dates
from 2050 on must be written as GeneralizedTime, with four digits). The
certificate is valid from 4 September 2020 to 17 September 2040 at 16:00 UTC.

The checker below cuts chapter 3's reader down to what this job needs: step
into the certificate and the tbsCertificate, skip the optional version, the
serial, the signature algorithm and the issuer, and read the two times. It is
still strict about lengths, because a monitor that reads certificates from
servers reads attacker-controlled input.

```python
# Certificate expiry from the raw bytes: a compact DER walk to the validity
# field (the reader of chapter 3, cut down to what this job needs).
import base64, datetime as dt

PEM = """
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn"""

def tlv(buf, i):
    """One DER header at offset i: (tag, start of value, end of value)."""
    tag, n = buf[i], buf[i + 1]
    i += 2
    if n & 0x80:                                  # long form: n & 0x7f length bytes
        count = n & 0x7F
        if not 1 <= count <= 4:
            raise ValueError("bad length")
        n, i = int.from_bytes(buf[i:i + count], "big"), i + count
    if i + n > len(buf):
        raise ValueError("value runs past the end")
    return tag, i, i + n

def asn1_time(tag, raw):
    text = raw.decode("ascii")
    if tag == 0x17:                               # UTCTime: YYMMDDHHMMSSZ
        year = int(text[:2])
        text = str(1900 + year if year >= 50 else 2000 + year) + text[2:]
    elif tag != 0x18:                             # GeneralizedTime: YYYYMMDDHHMMSSZ
        raise ValueError("not a time")
    return dt.datetime.strptime(text, "%Y%m%d%H%M%SZ").replace(tzinfo=dt.timezone.utc)

def validity(der):
    _, cert, _ = tlv(der, 0)                      # Certificate SEQUENCE
    _, i, _ = tlv(der, cert)                      # tbsCertificate SEQUENCE
    if der[i] == 0xA0:                            # [0] version, present in v3
        i = tlv(der, i)[2]
    for _ in range(3):                            # serial, signature algorithm, issuer
        i = tlv(der, i)[2]
    tag, v, end = tlv(der, i)
    if tag != 0x30:
        raise ValueError("validity is not a SEQUENCE")
    t1, s1, e1 = tlv(der, v)
    t2, s2, e2 = tlv(der, e1)
    return asn1_time(t1, der[s1:e1]), asn1_time(t2, der[s2:e2])

def status(not_after, now, warn=30, page=7):
    days = (not_after - now).days
    if days < 0:
        return f"EXPIRED {(now - not_after).days} days ago"
    if days < page:
        return f"PAGE SOMEONE: {days} days left"
    if days < warn:
        return f"warn: {days} days left"
    return f"ok: {days} days left"

der = base64.b64decode("".join(PEM.split()))
start, end = validity(der)
print("ISRG Root X2 valid from", start.date(), "to", end)
for day in ("2026-11-09", "2040-08-25", "2040-09-14", "2040-10-01"):
    now = dt.datetime.fromisoformat(day).replace(tzinfo=dt.timezone.utc)
    print(f"  checked on {day}: {status(end, now)}")
```

```text
ISRG Root X2 valid from 2020-09-04 to 2040-09-17 16:00:00+00:00
  checked on 2026-11-09: ok: 5061 days left
  checked on 2040-08-25: warn: 23 days left
  checked on 2040-09-14: PAGE SOMEONE: 3 days left
  checked on 2040-10-01: EXPIRED 13 days ago
```

The clock is a parameter, so the thresholds can be tested on any date, which
is how the alert levels above were checked. To run it over a machine's trust
store, decode each file in `/etc/ssl/certs/`; to run it against servers, feed
it the DER bytes that `ssl` returns from `getpeercert(binary_form=True)`, as
§12.10 does. With 47-day certificates the thresholds change: warn when less
than a third of the lifetime is left, and page when renewal has failed twice.

What to do with this:

- Automate every renewal, with ACME where you can, and renew at two thirds of
  the lifetime; watch for ARI hints.
- Monitor the certificate each endpoint actually serves, from outside, with
  alerts that go to a person; and keep an inventory of internal and embedded
  certificates that no public log will show you.
- Before a root or intermediate change, test with the oldest clients you
  support, including server-side libraries, not just browsers.

## 12.8 Configuring TLS on a server you run

*Level: intermediate.*

This section is the defender's checklist for a TLS server you operate. The
handshake is in [Protocols, Chapter 3](../protocols/03-TLS-1.3-Message-by-Message.md),
the attacks that shaped today's settings in
[Protocols, Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md), and a
short list of sound settings, with `openssl s_client` output, in
[Protocols, §5.8](../protocols/05-TLS-in-Practice.md). Here are the decisions
behind those settings, and the ones that are about operations.

**Versions: TLS 1.2 and 1.3 only.** RFC 8996 (March 2021) formally deprecated
TLS 1.0 and 1.1, and RFC 9325 (2022) is the IETF's current advice. Every
browser removed them by 2020. Turning them off on a public web server breaks
almost nothing now; on an internal API with old Java or embedded clients,
measure first by logging the negotiated version for a few weeks.

**Suites.** TLS 1.3 has five suites, all AEAD with forward secrecy, and
servers may enable the three common ones without thought. For TLS 1.2, allow
only ECDHE key exchange with AES-GCM or ChaCha20-Poly1305: no RSA key
transport (no forward secrecy, and the source of ROBOT), no CBC (Lucky 13,
POODLE), no 3DES (Sweet32), no RC4.

**Do not write the list yourself.** Mozilla's Server Side TLS guidelines
publish three profiles, kept current: *Modern* (TLS 1.3 only), *Intermediate*
(TLS 1.2 and 1.3, the recommended default for a general-purpose server) and
*Old* (back to TLS 1.0, for clients that cannot be upgraded). Its SSL
Configuration Generator turns a profile into a configuration for nginx,
Apache, HAProxy and others. An Intermediate-style configuration for nginx
looks like this (the generator's output adds three DHE suites, which most
sites can leave out):

```text
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_tickets off;
ssl_certificate     /etc/ssl/site/fullchain.pem;   # leaf first, then intermediates
ssl_certificate_key /etc/ssl/site/privkey.pem;     # readable by the server only
add_header Strict-Transport-Security "max-age=63072000" always;
```

`ssl_prefer_server_ciphers off` lets each client pick, which is safe once
every allowed suite is strong and lets phones without AES hardware choose
ChaCha20. Session tickets are off because one ticket key, if not rotated,
decrypts every resumed session it ever protected (Protocols §3.12); turn
them on only with daily key rotation. The certificate file must hold the
**full chain**: a missing intermediate is the most common error test tools
report, and browsers often hide it by fetching or caching intermediates, so
it shows up only in apps, scripts and other servers.

!!! note "Life story: Mozilla's Server Side TLS guidelines"
    **Born:** about 2014 on Mozilla's wiki, started by its operations security
    team (Julien Vehent), with the SSL Configuration Generator added later ·
    **Purpose:** one maintained answer to "which versions and suites should my
    server allow?", in three profiles for different client populations ·
    **Helped:** most of the web's TLS configurations, copied from the generator
    into nginx, Apache and HAProxy files; versioned, so a configuration can say
    which edition it follows · **Status:** maintained (edition 5.7 in 2025)

**OCSP stapling, and the end of OCSP.** Stapling (Protocols §2.7) has the
server fetch a signed "still good" answer from its CA and send it in the
handshake, saving the client a lookup and a privacy leak. It is worth turning
on for certificates that have an OCSP address. But Let's Encrypt, the largest
CA, ended OCSP in 2025: requests for Must-Staple certificates began to fail on
30 January for new accounts and on 7 May for everyone, OCSP addresses were
dropped from new certificates on 7 May, and the OCSP responders were turned
off on 6 August 2025. For a Let's Encrypt certificate, stapling now does
nothing (nginx logs a warning that the certificate has no responder URL), and
any certificate that still carries Must-Staple must be replaced before the
CA's responder disappears, or browsers that enforce it will refuse the site.

!!! note "Life story: OCSP at Let's Encrypt"
    **Born:** with Let's Encrypt's first certificates in 2015, answering
    billions of status queries a day at its peak · **Purpose:** tell clients
    that an unexpired certificate had not been revoked · **Helped:** stapling
    and Must-Staple (RFC 7633) experiments; showed the privacy cost of a CA
    seeing every visit · **Retired:** OCSP URLs removed from certificates on 7
    May 2025, responders shut down on 6 August 2025 · **Replaced by:** CRLs,
    aggregated by browsers into compact lists (Protocols §2.7)

**Pinning: mostly no.** Pinning tells a client to accept only certain public
keys for a site. HTTP Public Key Pinning (HPKP, RFC 7469, 2015) did it with a
header, and taught the web how easily a site can lock out its own users; Chrome
deprecated it in 2018 and removed it in Chrome 72 in January 2019, and Firefox
removed it in 2020 (Protocols §5.7 tells the story). Certificate Transparency
now catches misissued certificates without the risk. Mobile apps still pin,
and can, because the app and its pins ship together and an update can fix a
mistake. If you pin in an app: pin the public key (the SubjectPublicKeyInfo
hash), not the certificate, since certificates now change every few weeks;
pin at least two keys, one of them a backup kept offline or your CA's
intermediate key; give the pin set an expiry date after which the app falls
back to ordinary validation (Android's Network Security Configuration
supports exactly this); and remember that pinning also stops your own
debugging proxies and some corporate networks, which is sometimes the point.

What to do with this:

- Start from Mozilla's Intermediate profile (or Modern, if you control every
  client), generated, not hand-written; record which edition you use.
- Serve the full chain; keep the private key readable only by the server
  process; disable session tickets or rotate their key daily.
- Keep OCSP stapling on where it does something; replace any Must-Staple
  certificate from a CA that has ended OCSP.
- Do not pin on the web. In apps, pin keys with a backup and an expiry.

## 12.9 Headers: HSTS and CSP

*Level: intermediate.*

Two HTTP response headers sit on top of TLS and decide how much of its
protection the browser actually gets. HSTS makes the browser use HTTPS; CSP
decides which scripts may run inside the HTTPS page.

### HSTS, and the risk of preloading early

HTTP Strict Transport Security (RFC 6797, 2012) and the attack it answers,
SSL stripping, are explained in [Protocols, §5.7](../protocols/05-TLS-in-Practice.md).
The header is `Strict-Transport-Security: max-age=<seconds>`, with two optional
flags. `includeSubDomains` extends the rule to every name under the host.
`preload` says the owner wants the domain built into browsers, through the
list at hstspreload.org, so that even the first visit is protected. To be
accepted, the domain must serve a valid certificate, redirect HTTP to HTTPS on
the same host, serve HTTPS on all subdomains, and send the header from the
apex domain with a `max-age` of at least one year (31,536,000 seconds),
`includeSubDomains` and `preload`.

The header is easy to send and hard to take back. A browser that has seen it
will refuse plain HTTP for that host until `max-age` runs out, whatever the
site sends later. With `includeSubDomains` on the apex, that covers every name
in the domain: the intranet wiki on `http://wiki.corp.example.com`, the
printer's admin page, the device that cannot do TLS. Preloading makes it
permanent in practice: removal from the list is possible, but it reaches users
only as they update their browsers, over months, and old browsers keep the
entry. So the rollout goes in steps, each one long enough to see what breaks
(Figure 12.5).

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="HSTS rollout as a staircase: five minutes, one week, one month, two years with includeSubDomains, then preload" fill="currentColor" font-size="13">
<line x1="40" y1="190" x2="620" y2="190" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="190" x2="40" y2="20" stroke="currentColor" stroke-width="1.5"/>
<rect x="50" y="170" width="100" height="20" fill="currentColor" fill-opacity="0.25"/>
<text x="100" y="160" text-anchor="middle">max-age=300</text>
<rect x="160" y="145" width="100" height="45" fill="currentColor" fill-opacity="0.35"/>
<text x="210" y="135" text-anchor="middle">1 week</text>
<rect x="270" y="115" width="100" height="75" fill="currentColor" fill-opacity="0.45"/>
<text x="320" y="105" text-anchor="middle">1 month</text>
<rect x="380" y="75" width="110" height="115" fill="currentColor" fill-opacity="0.55"/>
<text x="435" y="55" text-anchor="middle">2 years +</text>
<text x="435" y="69" text-anchor="middle">includeSubDomains</text>
<rect x="500" y="35" width="110" height="155" fill="currentColor" fill-opacity="0.75"/>
<text x="555" y="25" text-anchor="middle">+ preload</text>
<text x="330" y="212" text-anchor="middle">each step held until logs show no subdomain still needs plain HTTP</text>
<text x="20" y="110" text-anchor="middle" transform="rotate(-90 20 110)">how long a mistake lasts</text>
</svg>
<figcaption>Figure 12.5. Rolling out HSTS. Each step raises the cost of a mistake: at 300 seconds a broken subdomain recovers in minutes, at two years it does not recover for returning visitors, and after preloading it does not recover for anyone until browsers ship a new list.</figcaption>
</figure>

### CSP: deciding which scripts run

TLS protects a page on the wire. Once it arrives, any script it loads runs
with the page's full authority: it can read what the user types, including
passwords and card numbers. **Content Security Policy**, a header the W3C
standardized in steps from 2012 (Level 2 became a Recommendation in 2016,
Level 3 is still a draft), tells the browser which sources of script, frames,
images and connections the page may use. Two of its tools are cryptography.

A **nonce** is a fresh random value the server puts in the header
(`script-src 'nonce-...'`) and in each `<script>` tag it wrote; an injected
script cannot know it, so it does not run. It must be new for every response,
generated by `secrets` and never by a template that caches. A **hash source**
(`'sha256-...'`) and the related **Subresource Integrity** attribute
(`integrity="sha384-..."` on a `<script>` tag) pin a script's exact bytes:

```python
# The two pieces of a strict script policy that are cryptography:
# a fresh random nonce per response, and a hash that pins a file's bytes.
import base64, hashlib, secrets

def nonce():
    return secrets.token_urlsafe(18)              # 144 random bits, new for every page

def integrity(script_bytes):
    return "sha384-" + base64.b64encode(hashlib.sha384(script_bytes).digest()).decode()

n = nonce()
print("nonce length:", len(n), "| two pages share a nonce?", n == nonce())

lib = b"function hello() { return 'hi'; }\n"
tag = integrity(lib)
print(f'<script src="https://cdn.example/hello.js" integrity="{tag}" crossorigin="anonymous">')
tampered = lib.replace(b"'hi'", b"steal()")
print("served file changed, still matches?", integrity(tampered) == tag)
```

```text
nonce length: 24 | two pages share a nonce? False
<script src="https://cdn.example/hello.js" integrity="sha384-JW2Z75hgGO+jPdBxr5ztKjkKczhXSUPGmm6QX9oRNQNFvOvSrX/Jj+pWpzoOnjcc" crossorigin="anonymous">
served file changed, still matches? False
```

An allowlist of hosts is weaker than either. In February 2024 the domain
`polyfill.io`, which served a popular JavaScript compatibility library from
its own CDN, was sold; in June 2024 the security firm Sansec reported that the
new owner was serving malicious code to mobile visitors of the more than
100,000 sites that loaded it. A policy that allowed `cdn.polyfill.io` let the
new code run, because the host was the same. Subresource Integrity would have
blocked it, but polyfill.io served different code to different browsers, so
it could not be pinned; the real fix was to host the library yourself.

**A strict policy breaks the bot check.** The lesson of strict CSP in
operations is that it blocks everything it was not told about, including the
third-party pieces the site depends on. A login page protected by a bot check
such as Cloudflare's Turnstile loads a script from
`https://challenges.cloudflare.com` and shows its widget in a frame from the
same host. Add a strict policy and the check silently fails to load; the form
cannot be submitted, or worse, the server stops receiving the check's token
and someone "fixes" it by turning the check off. Cloudflare's documentation
says what to allow: that origin in both `script-src` and `frame-src` (or a
nonce on its script with `'strict-dynamic'`). The checker below reads a
policy the way a browser does, including the fallback from `frame-src` to
`child-src` to `default-src`, and also checks an HSTS header for preload:

```python
# Reading two security headers the way a browser does.

def hsts(header):
    out = {}
    for part in header.split(";"):
        name, _, value = part.strip().partition("=")
        if name:
            out[name.lower()] = value.strip('"')
    return out

def preload_ready(header):
    h = hsts(header)
    missing = []
    if int(h.get("max-age", 0)) < 31536000:
        missing.append("max-age of at least one year")
    for word in ("includesubdomains", "preload"):
        if word not in h:
            missing.append(word)
    return "ready to submit" if not missing else "not ready: " + ", ".join(missing)

for header in ("max-age=300", "max-age=63072000; includeSubDomains",
               "max-age=63072000; includeSubDomains; preload"):
    print(f"{header!r:48} {preload_ready(header)}")

def csp(header):
    return {d.split()[0].lower(): d.split()[1:] for d in header.split(";") if d.strip()}

FALLBACK = {"script-src": "default-src", "frame-src": "child-src", "child-src": "default-src"}

def allows(policy, directive, origin):
    p = csp(policy)
    while directive not in p and directive in FALLBACK:
        directive = FALLBACK[directive]
    sources = p.get(directive)
    if sources is None:
        return True                               # nothing says no
    return origin in sources or "*" in sources

BOT_CHECK = "https://challenges.cloudflare.com"
strict = "default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'"
fixed = strict.replace("script-src 'self'", f"script-src 'self' {BOT_CHECK}") + f"; frame-src {BOT_CHECK}"
for name, policy in (("strict", strict), ("strict + bot check", fixed)):
    print(f"{name:20} script: {allows(policy, 'script-src', BOT_CHECK)}, "
          f"frame: {allows(policy, 'frame-src', BOT_CHECK)}")
```

```text
'max-age=300'                                    not ready: max-age of at least one year, includesubdomains, preload
'max-age=63072000; includeSubDomains'            not ready: preload
'max-age=63072000; includeSubDomains; preload'   ready to submit
strict               script: False, frame: False
strict + bot check   script: True, frame: True
```

The broken policy fails on both counts, and fixing only `script-src` is the
usual half-fix: the script loads and the frame it creates is blocked. Roll a
new policy out with `Content-Security-Policy-Report-Only` first, which reports
violations without blocking, and read the reports before you enforce it.

!!! note "Life story: Content Security Policy"
    **Born:** proposed at Mozilla around 2009 and shipped in Firefox 4 (2011)
    under a prefixed name; standardized by the W3C from 2012, Level 2 a
    Recommendation in 2016 · **Purpose:** let a site tell the browser which
    scripts, frames and connections a page may use, so that injected code does
    not run · **Helped:** nonce- and hash-based strict policies that defeat
    most cross-site scripting; report-only mode for safe rollout · **Status:**
    current, Level 3 in draft; host allowlists proved weak (polyfill.io, 2024),
    nonces and hashes did not

What to do with this:

- Roll HSTS out in steps; add `includeSubDomains` only after inventorying every
  subdomain, and preload only when you are sure, because it cannot be undone
  quickly.
- Use a nonce- or hash-based CSP with `object-src 'none'` and
  `base-uri 'none'`; deploy it report-only first; list every third-party
  service (bot check, payments, analytics) in each directive it needs.
- Pin third-party scripts with Subresource Integrity, or host them yourself.

## 12.10 Testing a live server

*Level: intermediate.*

A configuration file says what you meant; only a handshake says what the
server does. Qualys SSL Labs' public server test, started by Ivan Ristić in
2009, and the open-source `testssl.sh` script check the same things, and their
reports are a useful checklist:

- **The certificate:** trusted by the major root stores, valid now, covering
  the name, a strong key and signature, and its expiry date.
- **The chain:** complete, in order, with no expired or unneeded certificates.
- **Protocols and suites:** which versions and suites the server accepts,
  in what order, and the key exchange groups and their sizes.
- **Handshake simulation:** what dozens of real clients, from old Android to
  current browsers, would negotiate, and which would fail.
- **Known weaknesses:** Heartbleed, ROBOT, POODLE, compression, renegotiation
  and others, each tested directly.
- **Headers:** HSTS and its `max-age`.

SSL Labs turns this into a letter grade, with caps that encode current
policy: since 31 January 2020 a server that still accepts TLS 1.0 or 1.1 can
score no better than B, and an A+ requires HSTS with a long `max-age`. A grade
is a summary for managers; the useful part is the list of findings. Two limits
matter. The public test reaches only public servers on port 443, so internal
services, mail servers and APIs on other ports need `testssl.sh` or a script
of your own; and a test from one network sees one server, so a load-balanced
site must be tested at every front end or by repeating the test.

### Code it: a reporter

The script below connects with Python's `ssl` module, lets it verify the chain
and the host name exactly as a careful client would, and prints the version,
the suite, the names, the expiry and the chain. Blocks in this book cannot use
the network, so it starts its own TLS server on `127.0.0.1` in a thread, with
a throwaway certificate authority and server certificate made for this book
(an ECDSA P-256 pair, valid to 2036; the private key is printed in the code,
so never trust that CA anywhere). It then tries the same server under a wrong
name, and with the system's root store, which does not contain the test CA.

```python
# A TLS reporter: connect, verify, and print version, suite, chain and expiry.
# It starts its own server on 127.0.0.1 with a throwaway test CA and
# certificate made for this book. Never trust these anywhere else.
import hashlib, os, socket, ssl, tempfile, threading, time

TEST_CA = """-----BEGIN CERTIFICATE-----
MIIBnjCCAUOgAwIBAgIURLJtU2G6gQ00g9HhLQKGcOriMUQwCgYIKoZIzj0EAwIw
HDEaMBgGA1UEAwwRQm9vayBUZXN0IFJvb3QgQ0EwHhcNMjYxMTA5MTcxMDE5WhcN
NDYxMTA0MTcxMDE5WjAcMRowGAYDVQQDDBFCb29rIFRlc3QgUm9vdCBDQTBZMBMG
ByqGSM49AgEGCCqGSM49AwEHA0IABBBOuru71x8WmchiyROHV9adgIyXkm91f1NY
BZptEco6VujULRIqvp7LS7mhXdcE7Mhv+20DGwvel732ywIrKvijYzBhMB0GA1Ud
DgQWBBTw1CufRRGah4/nsBMhsZuRJFaVBDAfBgNVHSMEGDAWgBTw1CufRRGah4/n
sBMhsZuRJFaVBDAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAKBggq
hkjOPQQDAgNJADBGAiEA+AAFlMJ5rtyvqvgVaqNQzzmRpGGvYpDGEdGfDRdnzIoC
IQDFkgsUaYQ2Xf/mOxwj+OxQg5RMKyEWV5cgb/sXoNe7Hw==
-----END CERTIFICATE-----
"""
TEST_LEAF = """-----BEGIN CERTIFICATE-----
MIIBwjCCAWigAwIBAgIUZFXy5gMhbzRrMXFcLVF+51EMUcgwCgYIKoZIzj0EAwIw
HDEaMBgGA1UEAwwRQm9vayBUZXN0IFJvb3QgQ0EwHhcNMjYxMTA5MTcxMDE5WhcN
MzYxMTA2MTcxMDE5WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAAR+EABgbH8SVodtuoRIUDwDGvw/z+MXlIquzwZWs8ao4lb8
p25+He3oyiey3K5ce6zEJiCi5mHJvzvje0prTsxio4GPMIGMMBoGA1UdEQQTMBGC
CWxvY2FsaG9zdIcEfwAAATAJBgNVHRMEAjAAMA4GA1UdDwEB/wQEAwIHgDATBgNV
HSUEDDAKBggrBgEFBQcDATAdBgNVHQ4EFgQUIZpE3dT7VKgcaxPTgmET/1+kkrkw
HwYDVR0jBBgwFoAU8NQrn0URmoeP57ATIbGbkSRWlQQwCgYIKoZIzj0EAwIDSAAw
RQIgCPCzPzwjervzukVLyErTcrdNVOebGHSl6ITmRfKswEACIQDWgAAUeVNd0Xup
2ErAHNXZ8svkqI0eP0lPPSoMSK+GFA==
-----END CERTIFICATE-----
"""
TEST_KEY = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgswojlXVmBr06ohW7
xIH58srZBsLaQSrIsXdc7f0vWXKhRANCAAR+EABgbH8SVodtuoRIUDwDGvw/z+MX
lIquzwZWs8ao4lb8p25+He3oyiey3K5ce6zEJiCi5mHJvzvje0prTsxi
-----END PRIVATE KEY-----
"""

folder = tempfile.mkdtemp()
def save(name, text):
    path = os.path.join(folder, name)
    with open(path, "w") as f:
        f.write(text)
    return path

# The server: TLS 1.2 and 1.3 only, as section 12.8 recommends.
server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
server_ctx.minimum_version = ssl.TLSVersion.TLSv1_2
server_ctx.load_cert_chain(save("leaf.pem", TEST_LEAF), save("leaf.key", TEST_KEY))
listener = socket.create_server(("127.0.0.1", 0))
port = listener.getsockname()[1]

def serve():
    while True:
        conn, _ = listener.accept()
        try:
            with server_ctx.wrap_socket(conn, server_side=True) as tls:
                tls.recv(1)
        except (ssl.SSLError, OSError):
            pass
threading.Thread(target=serve, daemon=True).start()

def report(host, port, cafile=None, address=None):
    ctx = ssl.create_default_context(cafile=cafile)   # verifies chain and name
    try:
        with socket.create_connection((address or host, port), timeout=5) as raw:
            with ctx.wrap_socket(raw, server_hostname=host) as tls:
                cert, version = tls.getpeercert(), tls.version()
                suite, _, bits = tls.cipher()
                # the chain as DER bytes, leaf first (Python 3.13 and later)
                chain = tls.get_verified_chain() if hasattr(tls, "get_verified_chain") else []
    except (ssl.SSLError, ssl.CertificateError, OSError) as e:
        print(f"{host}: FAILED: {getattr(e, 'verify_message', None) or e}")
        return
    left = (ssl.cert_time_to_seconds(cert["notAfter"]) - time.time()) / 86400
    names = [v for k, v in cert.get("subjectAltName", ()) if k in ("DNS", "IP Address")]
    print(f"{host}: {version}, {suite} ({bits}-bit key)")
    print(f"  names {names}, expires {cert['notAfter']}",
          "(ok, over 30 days)" if left > 30 else f"(WARNING: {left:.0f} days)")
    for depth, der in enumerate(chain):
        print(f"  chain[{depth}]: {len(der)} bytes, SHA-256 {hashlib.sha256(der).hexdigest()[:16]}...")

report("localhost", port, cafile=save("ca.pem", TEST_CA), address="127.0.0.1")
report("www.wrong-name.example", port, cafile=save("ca.pem", TEST_CA), address="127.0.0.1")
report("localhost", port, address="127.0.0.1")   # the system's roots: our test CA is not one
```

On Python 3.13 with OpenSSL 3.0 it printed:

```text
localhost: TLSv1.3, TLS_AES_256_GCM_SHA384 (256-bit key)
  names ['localhost', '127.0.0.1'], expires Nov  6 17:10:19 2036 GMT (ok, over 30 days)
  chain[0]: 454 bytes, SHA-256 52b9b8c8c770e969...
  chain[1]: 418 bytes, SHA-256 f2207f4a5da557c9...
www.wrong-name.example: FAILED: Hostname mismatch, certificate is not valid for 'www.wrong-name.example'.
localhost: FAILED: unable to get local issuer certificate
```

The two chain entries are the 454-byte server certificate and the 418-byte
test root, in that order: `get_verified_chain` (Python 3.13 and later) returns
the chain the client actually built and verified, which can differ from the
one the server sent, and older versions of Python print no chain lines. The
two failures are what a correct client must do: refuse a certificate for
another name, and refuse a chain that ends at a root it does not trust. To use
it on a server of your own, call `report("www.example.org", 443)` with no
`cafile`, so that the system's roots are used. Against a typical public site
the output has this shape (an example, not run here):

```text
www.example.org: TLSv1.3, TLS_AES_128_GCM_SHA256 (128-bit key)
  names ['www.example.org', 'example.org'], expires Jan 20 23:59:59 2027 GMT (ok, over 30 days)
  chain[0]: 1490 bytes, SHA-256 ...
  chain[1]: 1306 bytes, SHA-256 ...
  chain[2]: 1380 bytes, SHA-256 ...
```

The network call and the judgment should be separate, so that the judgment can
be tested without a server. The function below takes what `ssl` returns (the
certificate as a dictionary, the version, the suite name) and a clock, and
lists problems. The test cases are written by hand in the same format
`getpeercert()` uses:

```python
# The reporter's judgment, kept apart from the network so it can be tested:
# give it what ssl returned (a certificate dict, a version, a suite) and a clock.
import ssl

GOOD_VERSIONS = {"TLSv1.2", "TLSv1.3"}

def audit(host, cert, version, suite, now):
    problems = []
    if version not in GOOD_VERSIONS:
        problems.append(f"protocol {version} (RFC 8996 retired it)")
    if version != "TLSv1.3":                       # TLS 1.3 suites are all fine
        if "ECDHE" not in suite:
            problems.append(f"{suite}: no forward secrecy")
        if "GCM" not in suite and "CHACHA20" not in suite:
            problems.append(f"{suite}: not an AEAD suite")
    names = [v for k, v in cert.get("subjectAltName", ()) if k == "DNS"]
    if not any(n == host or (n.startswith("*.") and host.split(".", 1)[-1] == n[2:])
               for n in names):
        problems.append(f"{host} not in subjectAltName {names}")
    days = (ssl.cert_time_to_seconds(cert["notAfter"]) - now) / 86400
    if days < 0:
        problems.append("certificate expired")
    elif days < 30:
        problems.append(f"certificate expires in {days:.0f} days")
    return problems or ["ok"]

NOW = ssl.cert_time_to_seconds("Nov  9 12:00:00 2026 GMT")
cases = [
    ("www.example.org", {"subjectAltName": (("DNS", "www.example.org"),),
                         "notAfter": "Jan 20 23:59:59 2027 GMT"}, "TLSv1.3", "TLS_AES_128_GCM_SHA256"),
    ("shop.example.org", {"subjectAltName": (("DNS", "*.example.org"),),
                          "notAfter": "Nov 21 08:00:00 2026 GMT"}, "TLSv1.2", "ECDHE-RSA-AES128-SHA"),
    ("old.example.net", {"subjectAltName": (("DNS", "example.net"),),
                         "notAfter": "Sep 30 14:01:15 2021 GMT"}, "TLSv1", "AES256-SHA"),
]
for host, cert, version, suite in cases:
    print(host + ":", "; ".join(audit(host, cert, version, suite, NOW)))
```

```text
www.example.org: ok
shop.example.org: ECDHE-RSA-AES128-SHA: not an AEAD suite; certificate expires in 12 days
old.example.net: protocol TLSv1 (RFC 8996 retired it); AES256-SHA: no forward secrecy; AES256-SHA: not an AEAD suite; old.example.net not in subjectAltName ['example.net']; certificate expired
```

The second host shows two findings a grade would hide: a TLS 1.2 suite that
has forward secrecy but uses CBC, and a certificate twelve days from expiry.
The third is a server frozen in 2021, still offering TLS 1.0 and RSA key
transport with an expired certificate for the wrong name. Run the network half
on a schedule against every endpoint you own, feed its results to the
judgment, and alert on anything that is not "ok".

What to do with this:

- Test every public endpoint with SSL Labs or `testssl.sh` after each change,
  and internal ones with `testssl.sh` or a script like this one.
- Monitor continuously: version, suite, chain and expiry, from outside, on a
  schedule, with the judgment in code you can test.
- Read the findings, not the grade.

## 12.11 Going deeper

*Level: expert.*

**What an entropy threshold costs.** The scanner's hex threshold of 3.0 is
below what almost any random hex string of length 40 scores: the expected
per-string entropy of 40 random hex characters is about 3.7 bits, close to the
maximum of 4, so every commit hash, every SHA-1 or SHA-256 digest in a lock
file, passes (in a simulation of 20,000 random 40-character hex strings the
lowest score was 3.15). That is why hex hits need context. The Base64
threshold of 4.5 has the opposite problem. Since $H \le \log_2 n$, a string of
22 characters or fewer can never reach 4.5, however random it is; random
32-character Base64 strings average about 4.56 and clear the threshold only
about two times in three; 40-character ones average 4.78 and clear it 98% of
the time. The session secret in §12.3 was caught because all 32 of its
characters happened to differ. An entropy rule is a classifier with measurable
miss and false-alarm rates that depend on length, so the threshold should
scale with length (or be replaced by a test against the expected entropy of a
random string of that length), and be tuned on a sample of the repository it
runs on, not by intuition.

**Secret zero and workload identity.** Federation (§12.5) generalizes into
**workload identity**: every service gets a short-lived, automatically rotated
credential from the platform, usually an X.509 certificate or a signed token,
and authenticates to everything else with it. The SPIFFE standard and its
SPIRE implementation, Kubernetes service-account tokens bound to a pod and
an audience, and the cloud providers' instance identities all work this way.
The root of trust moves from a stored secret to the platform's attestation of
what is running ([Chapter 11](11-Hardware-for-Keys.md) covers the hardware
end), and the security question becomes, as in Storm-0558 and in the OIDC
trust policies, whether each verifier checks *which* identity may do *what*.

**Key sets are configuration too.** A verifier's list of trusted signing keys
(a JWKS document, a trust store, a CA bundle) is security-critical
configuration that most teams fetch and cache without review. Log every change
to the keys you trust, alert on new keys and on keys past their planned
retirement, and keep the key-to-issuer scope beside each key, as §12.4's fix
does.

**Post-quantum certificates.** ML-DSA signatures and public keys are tens of
times larger than ECDSA's, so a post-quantum certificate chain will add
kilobytes to each handshake. That changes operations (packet sizes, middlebox
limits, the cost of sending intermediates the client already has) more than it
changes configuration. The migration is in
[Post-quantum, Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md);
the inventory it needs is the one this chapter asked you to build.

## Check yourself

??? question "1. A developer commits an API key, notices a minute later, and pushes a commit that deletes it. Is the key safe?"

    No. The first commit is still in the repository's history, in every clone
    and fork, and in public event archives; automated scrapers find new public
    keys within minutes. Revoke or rotate the key first, then check its use,
    then clean the history if you like.

??? question "2. Compute the scanner entropy of `abcabcabcabc`, and say whether a 4.5-bit threshold would flag it."

    Three characters, each with frequency $1/3$: $H = \log_2 3 \approx 1.58$
    bits per character. Far below 4.5; and no 12-character string can exceed
    $\log_2 12 \approx 3.58$ anyway.

??? question "3. Why does the scanner in §12.3 use a lower threshold for hexadecimal strings than for Base64 ones?"

    A string over $k$ symbols scores at most $\log_2 k$ bits per character:
    4 for hex, 6 for Base64. A random hex key scores about 3.7, below any
    sensible Base64 threshold, so hex needs its own lower limit, which in turn
    flags every hash, so hex hits need context.

??? question "4. A Dockerfile copies `.env` into the image and deletes it in the next `RUN` step. What leaks, and how should the build be written?"

    The file is still in the layer created by `COPY`; the deletion only adds a
    whiteout in a later layer, and anyone who pulls the image can extract it.
    Use a build-time secret mount (BuildKit's `--mount=type=secret`) for the
    step that needs it, or a multi-stage build that copies only the output into
    a clean final image, and scan every layer.

??? question "5. In Storm-0558, the validator checked that the token's issuer was the expected enterprise issuer. Why was that not enough?"

    The issuer is a claim inside the token, written by whoever signed it. The
    attacker signed an enterprise-issuer token with a consumer key. The
    verifier must hold, for each key, the issuers it may sign for, and check
    that binding; the signature only proves which key signed.

??? question "6. An AWS role trusts GitHub's OIDC issuer with `sub` set to `repo:acme/*`. Name two jobs that get credentials and should not."

    A job in any other repository of the `acme` organization (a sandbox or test
    repository with looser access), and a pull-request job in `acme/web`, whose
    subject is `repo:acme/web:pull_request` and which may run unreviewed or
    outside code. Pin the policy to the exact repository and branch or
    deployment environment.

??? question "7. Why does the key ring in §12.6 have three states instead of simply replacing the key?"

    Verifiers must know the new key before anything is signed with it
    ("next"), and must keep accepting the old key until every token it signed
    has expired ("previous"). A single swap rejects valid tokens in flight
    (outage) or accepts the old key forever (no rotation).

??? question "8. Clients with OpenSSL 1.0.2 failed on 30 September 2021 although they trusted ISRG Root X1. Why?"

    The server sent the chain through the ISRG Root X1 copy cross-signed by DST
    Root CA X3. OpenSSL 1.0.2 followed that chain to the expired DST root and
    reported an error instead of trying the alternative path that ended at the
    self-signed ISRG Root X1 in its trust store. Removing the expired root from
    the trust store, or upgrading, fixed it.

??? question "9. A site adds `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on its apex on day one. What can go wrong, and for how long?"

    Every subdomain is forced to HTTPS in every browser that sees it, for two
    years, including internal hosts that only speak HTTP; once preloaded, even
    first-time visitors are affected, and removal reaches users only as their
    browsers update, over months. Roll out in steps with short `max-age`
    values first.

??? question "10. A login page sets `script-src 'self' 'nonce-...'` and the bot check stops working. The team adds the bot check's origin to `script-src`. It still fails. Why, and what is the full fix?"

    The bot check's widget runs in a frame from the same origin, and
    `frame-src` (falling back to `child-src`, then `default-src 'self'`) still
    blocks it. Add the origin to `frame-src` too (or put the nonce on its
    script and use `'strict-dynamic'` for the script side), and test changes
    with `Content-Security-Policy-Report-Only` first.

## What you learned

- Secrets leak along the whole path from laptop to production: repositories
  (over 100,000 leaking repositories in 2019; 28.6 million new secrets on
  public GitHub in 2025), CI environments (Codecov 2021, CircleCI 2023),
  container layers (8.5% of images in a 2023 study), logs and crash dumps.
- Scanners combine pattern rules and entropy rules; entropy is a weak signal
  that depends on length and alphabet, so context, allowlists, checksummed
  token formats and verification with the issuer make the difference.
- Storm-0558 combined a 2016 key that was never rotated, a key-scope check that
  was assumed and not written, and an escape route that is still unknown: the
  crash-dump account of September 2023 was withdrawn in March 2024.
- Secret stores, dynamic secrets and OIDC federation replace long-lived keys
  with credentials that expire; their security rests on trust policies that
  name exactly who may receive them.
- Rotation without outage uses overlap (publish, switch, retire), and the
  first step after a leak is always revocation.
- Certificates expire in production because nobody owns them; with lifetimes
  falling to 47 days by 2029, renewal and monitoring must be automated, and
  chains must be tested against old clients before roots change.
- A TLS server today allows TLS 1.2 and 1.3 with AEAD suites, serves its full
  chain, uses HSTS rolled out in steps, a nonce- or hash-based CSP that names
  every third party it needs, no web pinning, and is tested from outside on a
  schedule.

**Next:** [Chapter 13](13-Passwords-on-the-Server.md), the secrets that users
bring with them: passwords, and how a server stores and checks them.

## Further reading

- Michael Meli, Matthew R. McNiece and Bradley Reaves, "How Bad Can It Git?
  Characterizing Secret Leakage in Public GitHub Repositories", NDSS 2019.
- GitGuardian, *The State of Secrets Sprawl 2025* (March 2025) and *The State
  of Secrets Sprawl 2026* (17 March 2026).
- Markus Dahlmanns, Constantin Sander, Robin Decker and Klaus Wehrle, "Secrets
  Revealed in Container Images: An Internet-wide Study on Occurrence and
  Impact", ASIA CCS 2023.
- US Federal Trade Commission, revised complaint and settlement with Uber
  (2018); US Department of Justice, conviction of Uber's former chief security
  officer (5 October 2022).
- Toyota Motor Corporation, notice on the T-Connect source code exposure
  (7 October 2022).
- Codecov, "Bash Uploader Security Update" (15 April 2021).
- CircleCI, "CircleCI incident report for January 4, 2023 security incident"
  (13 January 2023).
- Microsoft, "Microsoft mitigates China-based threat actor Storm-0558
  targeting of customer email" (11 July 2023) and "Analysis of Storm-0558
  techniques for unauthorized email access" (14 July 2023).
- Microsoft Security Response Center, "Results of major technical
  investigations for Storm-0558 key acquisition" (6 September 2023, addendum
  12 March 2024).
- Shir Tamari, "Compromised Microsoft Key: More Impactful Than We Thought",
  Wiz (21 July 2023).
- Cyber Safety Review Board, *Review of the Summer 2023 Microsoft Exchange
  Online Intrusion* (dated 20 March 2024, released 2 April 2024).
- Datadog Security Labs, "No keys attached: Exploring GitHub-to-AWS keyless
  authentication flaws" (July 2023).
- GitHub, "Behind GitHub's new authentication token formats" (5 April 2021);
  "Secure deployments with OpenID Connect and GitHub Actions now generally
  available" (23 November 2021); "Keeping secrets out of public repositories"
  (29 February 2024).
- HashiCorp, "Vault" announcement (28 April 2015).
- Ericsson statement on the O2 and SoftBank outages (6 December 2018); Ofcom,
  decision to close its investigation into the O2 network outage.
- Let's Encrypt, "DST Root CA X3 Expiration (September 2021)"; Scott Helme,
  "Let's Encrypt Root CA expiry" (2021); OpenSSL blog, "Old Let's Encrypt root
  certificate expiration and OpenSSL 1.0.2" (13 September 2021).
- CA/Browser Forum, Ballot SC-081v3, "Introduce Schedule of Reducing Validity
  and Data Reuse Periods" (April 2025).
- RFC 9773, ACME Renewal Information (ARI) Extension (June 2025); Let's
  Encrypt, "Ending OCSP Support in 2025" (5 December 2024) and "Ending
  Expiration Emails" (22 January 2025).
- RFC 8996, Deprecating TLS 1.0 and TLS 1.1 (March 2021); RFC 9325,
  Recommendations for Secure Use of TLS and DTLS (November 2022).
- Mozilla, *Server Side TLS* guidelines and the SSL Configuration Generator.
- RFC 6797, HTTP Strict Transport Security (2012); hstspreload.org submission
  requirements; RFC 7469, Public Key Pinning Extension for HTTP (2015).
- W3C, *Content Security Policy Level 3* (working draft) and *Subresource
  Integrity* (2016); Cloudflare, Turnstile "Content Security Policy"
  reference; Sansec, polyfill.io supply chain report (25 June 2024).
- Qualys SSL Labs, *SSL Server Rating Guide*, and "Grade change for TLS 1.0
  and TLS 1.1 protocols" (2018, effective 31 January 2020).
- Reference cards on this site: [openssl](../../tools/openssl.md) and the
  [HTTPS guide](../../topics/HTTPS.md).
