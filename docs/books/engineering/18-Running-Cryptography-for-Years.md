# 18. Running Cryptography for Years

*Every chapter so far has ended with code that is correct on the day it ships.
This one is about the days after: the years in which keys leak, algorithms
weaken, certificate authorities make mistakes, standards bodies set deadlines,
and the people who understood the system move on. You will decide what a
cryptographic log line may and may not contain, watch the public Certificate
Transparency logs for certificates issued in your name, follow MD5, SHA-1,
triple DES, RSA-1024 and TLS 1.0 through their long deaths, count what your own
servers still negotiate before you switch anything off, and learn from the
great clean-ups: Debian's weak keys in 2008, the Heartbleed revocation wave in
2014, Let's Encrypt's three million certificates in 2020 and Entrust's
distrust in 2024. You will write an incident playbook as a numbered procedure
and a small program that runs it, plan the cryptographic operations of a
settlement on Mars that is cut off from Earth for two weeks at a time, and
close the book with one checklist that points back to every chapter.*

!!! abstract "In this chapter"
    **You will learn:**

    - what to log about cryptographic events (key IDs, versions, outcomes,
      failure counts) and what never to log, and how to alert on failures;
    - how to monitor Certificate Transparency for your own names, and why a
      careless monitor misses the certificate that matters;
    - how algorithms die: the timelines of MD5, SHA-1, triple DES, RSA-1024
      and TLS 1.0 and 1.1, and what each took from first warning to removal;
    - how to measure what your systems still negotiate, counting clients and
      not only connections, before you remove anything;
    - how operators responded to a broken generator (Debian, 2008), a memory
      leak of private keys (Heartbleed, 2014), a CA's own bug (Let's Encrypt,
      2020) and a CA losing trust (Entrust, 2024);
    - how to write an incident playbook, how to deploy algorithms behind flags
      with dual-running and rollback, and how ceremonies, documentation and
      on-call keep a system safe when people change;
    - how a settlement on Mars runs its cryptography through solar
      conjunction, and the engineer's checklist that gathers the whole book.

    **You need:** [Chapter 9](09-APIs-That-Resist-Misuse.md) (versioned
    envelopes, errors and logs that do not leak),
    [Chapter 10](10-The-Life-of-a-Key.md) (key life cycles, rotation and
    revocation), [Chapter 12](12-Secrets-in-Operations.md) (secrets,
    certificate operations and TLS server configuration) and
    [Chapter 17](17-Choosing-Testing-and-Verifying.md) (crypto inventories).
    Certificate Transparency and revocation are explained in
    [Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md), and the
    post-quantum migration plan is in
    [Post-quantum, Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md).
    This chapter links to them and does not repeat them.

    **Levels:** §18.1 and §18.12 are for beginners, §18.2 to §18.11 are
    intermediate, §18.13 is expert.

## 18.1 The problem

*Level: beginner.*

In February 2005 three researchers at Shandong University, Wang Xiaoyun, Yin
Yiqun Lisa and Yu Hongbo, announced that they could find collisions in SHA-1
with about $2^{69}$ operations instead of the $2^{80}$ its design promised. Nobody
had a collision yet, and $2^{69}$ was still far out of reach. But SHA-1 signed
almost every certificate on the web, and cryptographers said plainly that it
was time to move.

The move took twelve years. NIST deprecated SHA-1 for digital signatures in
2011 and disallowed signature generation with it after 2013. Microsoft
announced in November 2013 that Windows would stop accepting SHA-1
certificates. The CA/Browser Forum told certificate authorities to stop issuing
SHA-1 certificates for websites after 1 January 2016. Chrome 56 and Firefox
51 and 52, released in January and March 2017, finally refused them. On 23
February 2017, in the same weeks, a team from CWI Amsterdam and Google
published SHAttered: two different PDF files with the same SHA-1 hash, made
with about $2^{63}$ SHA-1 computations. The browsers had finished their
migration, or nearly, just in time. In 2026, Git, which names every file and commit
by its SHA-1 hash, was still preparing to make SHA-256 its default.

Nothing in that story is about mathematics. The attack was published in 2005;
what took the next twelve years was finding every place SHA-1 was used,
persuading the owners of each one to change, setting dates, measuring who
would break, and moving the dates when too many would. That work is
operations, and it never stops. While SHA-1 was being retired, Debian found
that its OpenSSL package had generated predictable keys for twenty months
(2008), Heartbleed let anyone read private keys out of a server's memory
(2014), and a certificate authority discovered a bug that obliged it to revoke
three million certificates within five days (2020). None of those could be
planned for in detail. All of them could be planned for in outline, and the
teams that had a plan did better.

Running cryptography for years is five jobs, and this chapter takes them in
turn:

- **Watch.** Log cryptographic events so that misuse and failure can be seen
  (§18.2), and watch the public record for certificates in your name (§18.3).
- **Retire.** Algorithms and protocol versions die slowly; know the dates
  (§18.4) and measure what you still use before you remove it (§18.5).
- **Respond.** Keys leak and algorithms break; replace and revoke at scale
  (§18.6), survive your CA's mistakes (§18.7), and do it from a written
  playbook (§18.8).
- **Change safely.** Deploy algorithms behind flags with a way back (§18.9).
- **Keep people able.** Ceremonies, documentation and on-call (§18.10).

Then a settlement on Mars puts all five under the hardest constraint, two
weeks with no Earth (§18.11), and the book closes with one checklist (§18.12).

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Timeline of operational events from 2005 to 2030: SHA-1 attack 2005, Debian weak keys 2008, NIST SHA-1 signature cutoff 2013, Heartbleed 2014, SHA-1 certificates rejected and SHAttered 2017, Let's Encrypt CAA bug 2020, RFC 8996 in 2021, triple DES disallowed 2023, Entrust distrust 2024, NIST SHA-1 end date 2030" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="372" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Wang, Yin and Yu: SHA-1 collisions in about 2<tspan dy="-6" font-size="10">69</tspan></text>
<text x="78" y="61" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="56" r="3.5"/>
<text x="108" y="61">Debian's predictable keys; blocklists and mass regeneration</text>
<text x="78" y="95" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="90" r="3.5"/>
<text x="108" y="95">NIST cutoff for SHA-1 and RSA-1024 signatures</text>
<text x="78" y="129" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="124" r="3.5"/>
<text x="108" y="129">Heartbleed: patch, rekey, revoke; CRLs grow a hundredfold</text>
<text x="78" y="163" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="158" r="3.5"/>
<text x="108" y="163">Browsers refuse SHA-1 certificates; SHAttered published</text>
<text x="78" y="197" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="192" r="3.5"/>
<text x="108" y="197">Let's Encrypt must revoke 3 million certificates in 5 days</text>
<text x="78" y="231" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="226" r="3.5"/>
<text x="108" y="231">RFC 8996 retires TLS 1.0 and 1.1</text>
<text x="78" y="265" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="260" r="3.5"/>
<text x="108" y="265">Triple DES encryption disallowed by NIST after this year</text>
<text x="78" y="299" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="294" r="3.5"/>
<text x="108" y="299">Chrome and Mozilla stop trusting new Entrust certificates</text>
<text x="78" y="333" text-anchor="end" font-weight="bold">2030</text>
<circle cx="92" cy="328" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="333">NIST's end date for all remaining uses of SHA-1</text>
<text x="108" y="364" font-size="12" opacity="0.8">filled: happened · open: scheduled</text>
</svg>
<figcaption>Figure 18.1. Twenty-five years of cryptographic operations. The sudden events (2008, 2014, 2020, 2024) sit between slow deprecations that each took a decade or more.</figcaption>
</figure>

## 18.2 Logging without leaking

*Level: intermediate.*

A cryptographic system that keeps no record of its own operations cannot
answer the questions that matter during an incident: which key decrypted this
record, who asked, since when has this key been used from that host, how many
signatures failed last night. A system that keeps too detailed a record
leaks the secrets it was built to protect. Chapter 9
([§9.9](09-APIs-That-Resist-Misuse.md#99-logs-and-crash-dumps-that-do-not-leak))
showed the second failure, with passwords in Twitter's and Facebook's logs and
session tokens in Okta's support files, and built a redacting filter for it.
This section is about the first: deciding on purpose what a cryptographic event
log should contain, so that the record is useful and the filter has little to
do.

### What to log

A useful rule is to log the *names* of things and never their *values*. For
every operation that uses a key, record:

- **the key ID and version**, never the key. A versioned key ID (chapter 10,
  §10.8) is what lets an investigator say "every record decrypted under
  `records` version 7 between Tuesday and Thursday" and what lets a rotation
  be measured: when no event names version 6 for a month, version 6 can be
  retired;
- **the algorithm and mode** actually used, so that deprecation (§18.4) can
  count real uses rather than configured ones;
- **the operation and its outcome**: encrypt, decrypt, sign, verify, wrap,
  unwrap; success, authentication failure, policy refusal, key not found;
- **the caller**: service identity, user or role, host, and a request ID that
  joins this line to the application's own logs;
- **the time**, from a synchronized clock, because incident timelines are
  built by joining logs from many machines.

Managed key services work this way. AWS CloudTrail, for example, records each
call to AWS KMS with the key's identifier, the operation, the caller, the
source address and the *encryption context*, the non-secret associated data
the caller attached (chapter 14). That last field is logged in plain text,
which is why AWS's documentation warns never to put secrets in an encryption
context: it is designed to appear in logs.

**Failures deserve more attention than successes.** A padding-oracle or
invalid-curve attack (Cryptanalysis
[Chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)) looks, from the
server, like a burst of decryption or validation failures. A stolen signing
key used by someone else looks like signatures your own systems never asked
for. A misconfigured deployment after a rotation looks like a wall of "key not
found". Count failures per key version and per caller, and alert on a rate,
not on single events, which happen all day for innocent reasons (truncated
uploads, clients with stale keys).

### What never to log

Never log key material in any form: not raw, not hex, not Base64, and not an
unkeyed hash of a low-entropy secret, which can be searched. Never log
plaintext that was, or is about to be, encrypted; that is the whole point of
encrypting it. Never log passwords, session cookies, bearer tokens, API keys,
one-time codes, or private parts of a request (bodies, `Authorization`
headers). Be careful with things that look harmless: a nonce or IV is public,
but a full ciphertext with its key ID is something an attacker can replay, and
a JWT carries a usable credential in its middle.

For keys that need a stable public name beyond their ID, use a *check value*
as chapter 10 does: a short MAC or encryption of a fixed string under the key,
which proves which key is meant and reveals nothing useful about a random
256-bit key. For public keys, the SHA-256 fingerprint of the public key is the
natural name; it is public anyway.

### Break it: log the object

The broken version is what most code does under pressure. A decryption
fails, the developer wants to know why, and the easiest thing to log is the
whole key object and the whole request:

```python
import json

class Key:
    def __init__(self, key_id, version, material):
        self.key_id, self.version, self.material = key_id, version, material

def decrypt_failed(key, request):
    # "log everything, sort it out later"
    print(json.dumps({"event": "decrypt_failed", "key": vars(key), "request": request}))

key = Key("records", 7, "6f1c9a0e44d2b7c8a1f05e3b9d72c6e4")   # hex, so json can print it
decrypt_failed(key, {"user": "ann", "token": "s.9KQ2xv7Lw", "body": "3a1f..."})
```

```text
{"event": "decrypt_failed", "key": {"key_id": "records", "version": 7, "material": "6f1c9a0e44d2b7c8a1f05e3b9d72c6e4"}, "request": {"user": "ann", "token": "s.9KQ2xv7Lw", "body": "3a1f..."}}
```

The key, a session token and the ciphertext are now in a log that will be
shipped to a search service, kept for a year and read by anyone with log
access. The comment about hex is realistic too: `json` refuses `bytes`, so
someone "fixed" the error by converting the key to a printable form.

### Fix it: an allowlist of fields

The fix turns the rule around. Instead of removing what is dangerous (a
blocklist, which misses whatever nobody thought of), the event function
accepts only fields from a fixed list, refuses everything else, and counts
failures so that a burst raises an alert:

```python
import json
from collections import Counter

ALLOWED = {"event", "key_id", "key_version", "alg", "outcome", "caller", "request_id"}
ALERT_AT = 3                    # failures per key version before someone is paged

def crypto_event(**fields):
    extra = set(fields) - ALLOWED
    if extra:                   # a new field is reviewed before it reaches a log
        raise ValueError(f"not allowed in the crypto log: {sorted(extra)}")
    fields["ts"] = "2026-11-09T12:00:00Z"   # fixed here so the output repeats
    print(json.dumps(fields, sort_keys=True))

failures = Counter()

def decrypt_failed(key_id, version, caller, request_id):
    crypto_event(event="decrypt", key_id=key_id, key_version=version, alg="AES-256-GCM",
                 outcome="auth_failed", caller=caller, request_id=request_id)
    failures[(key_id, version)] += 1
    if failures[(key_id, version)] == ALERT_AT:
        print(f"ALERT: {ALERT_AT} failed decryptions under {key_id} v{version}")

for n in range(3):
    decrypt_failed("records", 7, "billing-api", f"r-{1040 + n}")
try:
    crypto_event(event="decrypt", token="s.9KQ2xv7Lw")
except ValueError as e:
    print("refused:", e)
```

```text
{"alg": "AES-256-GCM", "caller": "billing-api", "event": "decrypt", "key_id": "records", "key_version": 7, "outcome": "auth_failed", "request_id": "r-1040", "ts": "2026-11-09T12:00:00Z"}
{"alg": "AES-256-GCM", "caller": "billing-api", "event": "decrypt", "key_id": "records", "key_version": 7, "outcome": "auth_failed", "request_id": "r-1041", "ts": "2026-11-09T12:00:00Z"}
{"alg": "AES-256-GCM", "caller": "billing-api", "event": "decrypt", "key_id": "records", "key_version": 7, "outcome": "auth_failed", "request_id": "r-1042", "ts": "2026-11-09T12:00:00Z"}
ALERT: 3 failed decryptions under records v7
refused: not allowed in the crypto log: ['token']
```

Three things make this version safe. The function never receives the key, so
it cannot log it. A developer who wants to log something new gets an
exception in testing, not a leak in production, and has to add the field to
`ALLOWED` in a change someone reviews. And the failure counter turns a
scattered pattern into one alert. A real system would count over a sliding
window (failures in the last five minutes) and keep the counters outside the
process, but the shape is the same. The threshold of three is for the
example; set yours from a week of normal traffic.

### Keeping the log trustworthy

A security log is evidence, and evidence is worth attacking. An intruder who
can edit logs can erase the record of a stolen key's use. Ship cryptographic
events off the host as they happen, to a store the producing service can
append to but not change; keep a copy outside the production account; and
for the highest-value keys (CA signing, code signing, root KEKs) chain the
records with a hash, or sign them in batches, so that deletion shows. This is
the same append-only idea as Certificate Transparency, used privately.

Retention cuts both ways. Logs that name keys and callers are needed for as
long as the keys can be questioned, which for a signing key may be years; logs
that contain anything about users are personal data, subject to deletion
rules. Separate them: keep the key-use log long and the request log short.

**What to do.**

- Log key IDs and versions, algorithm, operation, outcome, caller, request ID
  and time for every key operation. Log through a function that accepts only
  listed fields.
- Never log key material, plaintext, passwords or tokens, in any encoding.
  Name keys by ID, check value or public-key fingerprint.
- Count failures per key version and caller; alert on rates.
- Ship the log off the host to append-only storage, and make deletion
  detectable for the most important keys.

## 18.3 Watching Certificate Transparency for your names

*Level: intermediate.*

Any of the hundred or so certificate authorities trusted by browsers can
issue a certificate for your domain. Domain validation (Protocols
[§2.5](../protocols/02-Certificates-and-PKI.md#25-proving-you-own-a-name-domain-validation-and-acme))
is supposed to stop them from issuing one to anybody but you, and mostly it
does. When it does not, because a CA has a bug, an employee runs a test, or an
attacker controls your DNS for an hour, the certificate is valid everywhere.
Before 2013 you had no way to know it existed.

Certificate Transparency changed that. Every publicly trusted certificate
must now be submitted to public, append-only logs before browsers will accept
it; Protocols
[§2.8](../protocols/02-Certificates-and-PKI.md#28-certificate-transparency)
explains the logs, the signed timestamps and the Merkle proofs. The part that
belongs to operations is the **monitor**: someone has to read the logs and
notice a certificate that should not exist. For your names, that someone is
you.

**Monitoring worked from the start.** On 14 September 2015 Symantec, then one
of the largest CAs, issued an Extended Validation precertificate for
`google.com` and `www.google.com`. Google had not asked for it. Google's own
CT monitoring found it in the logs; Symantec said that employees had issued it
during internal testing and dismissed them. Google pressed for a full audit,
which turned up more test certificates for other companies' domains and for
domains that did not exist, and required Symantec to log all of its
certificates to CT from June 2016. The story ended with Chrome's distrust of
Symantec in 2018 (Protocols
[§2.4](../protocols/02-Certificates-and-PKI.md#24-who-the-authorities-are-and-who-watches-them)).
It began with a monitor doing its job.

### How to watch

You do not need to download the logs yourself. Several services read every
log and let you search or subscribe:

- **crt.sh**, a free search engine over the CT logs run by Sectigo, answers
  queries such as `%.example.com` with every logged certificate and
  precertificate for those names, and returns JSON for scripts;
- **Cert Spotter** from SSLMate, Facebook's CT monitoring tool, and the
  monitors built into several CDNs and cloud providers send an email or a
  webhook when a new certificate for your domains appears;
- **your own monitor**, reading the logs through their RFC 6962 interface, is
  worth it only at large scale or for names you cannot share with a third
  party.

!!! note "Life story: crt.sh"
    **Born:** 2015, written by Rob Stradling at Comodo CA (now Sectigo) ·
    **Purpose:** a free, searchable index of every certificate in the public
    CT logs, with a web interface, JSON output and a public read-only
    database · **Helped:** domain owners finding certificates they did not
    request, researchers counting misissuance against the Baseline
    Requirements, and attackers and defenders alike enumerating subdomains ·
    **Status:** in daily use; it has outages under load, so production
    monitoring should not depend on it alone

A monitor needs a policy to compare against, and the policy is short: the
names you own, the CAs you use, and the shapes you allow (wildcards or not,
key types, lifetimes). Write the CAs down in two places: in your **CAA
records** (RFC 8659), the DNS entries that tell every CA which CAs may issue
for your domain and which every CA has had to check before issuing since
September 2017;
and in your monitor's allowlist, which catches the case CAA cannot: a CA that
ignores CAA or gets it wrong, as Let's Encrypt did in 2020 (§18.7).

The alerts that matter are few. A certificate from a CA you do not use is
the strongest signal. A certificate for a name you do not recognize under
your domain may be a forgotten team, a vendor, or a takeover of a dangling DNS
record. A wildcard where you never issue wildcards, a key type you do not use,
or a burst of certificates for one name all deserve a look. Most alerts will
be your own colleagues; the point is that you hear about it within hours
rather than not at all.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A CT monitor pipeline: certificate authorities submit certificates to CT logs; a monitor service reads the logs; your check compares each certificate with your policy (names, allowed CAs, wildcards, as in your CAA records) and either ignores it or raises an alert" fill="currentColor" font-size="14">
<rect x="14" y="30" width="110" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="69" y="52" text-anchor="middle">any trusted</text>
<text x="69" y="70" text-anchor="middle">CA</text>
<rect x="164" y="30" width="110" height="50" rx="6" fill="currentColor" opacity="0.10"/>
<rect x="164" y="30" width="110" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="219" y="52" text-anchor="middle">public</text>
<text x="219" y="70" text-anchor="middle">CT logs</text>
<rect x="314" y="30" width="110" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="369" y="52" text-anchor="middle">monitor</text>
<text x="369" y="70" text-anchor="middle" font-size="12">crt.sh, Cert Spotter</text>
<rect x="464" y="20" width="160" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="544" y="44" text-anchor="middle" font-weight="bold">your check</text>
<text x="544" y="62" text-anchor="middle" font-size="12">names, allowed CAs,</text>
<text x="544" y="78" text-anchor="middle" font-size="12">wildcards, key types</text>
<line x1="124" y1="55" x2="158" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="162,55 152,50 152,60"/>
<line x1="274" y1="55" x2="308" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="312,55 302,50 302,60"/>
<line x1="424" y1="55" x2="458" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="462,55 452,50 452,60"/>
<line x1="510" y1="90" x2="470" y2="140" stroke="currentColor" stroke-width="1.4"/>
<line x1="578" y1="90" x2="600" y2="140" stroke="currentColor" stroke-width="1.4"/>
<rect x="400" y="140" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="465" y="165" text-anchor="middle">matches: ignore</text>
<rect x="540" y="140" width="90" height="40" rx="6" fill="currentColor" opacity="0.15"/>
<text x="585" y="165" text-anchor="middle" font-weight="bold">alert</text>
<rect x="14" y="140" width="330" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="179" y="165" text-anchor="middle">CAA records: the same allowed CAs, in DNS</text>
<line x1="344" y1="160" x2="398" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<line x1="69" y1="140" x2="69" y2="84" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<polygon points="69,80 64,92 74,92"/>
<text x="76" y="118" font-size="12">CA checks before issuing</text>
<text x="320" y="214" text-anchor="middle" font-size="12">CAA asks the CA not to issue; the monitor tells you when one did anyway</text>
</svg>
<figcaption>Figure 18.2. Two controls with one policy. CAA records ask CAs not to issue for your names; the CT monitor, using the same list of CAs, tells you within hours when one issued anyway.</figcaption>
</figure>

### Code it: an allowlist check, broken and fixed

The program below takes entries shaped like crt.sh's JSON output, cut down to
four fields, and checks them twice. The naive check looks at the common name
only and matches the domain as a plain string suffix, which is what a quick
script does. The careful check reads every name in the certificate, matches
on label boundaries, ignores case and a trailing dot, reports a certificate
and its precertificate once, and compares the issuer's organization exactly:

```python
# Entries shaped like crt.sh's JSON output, trimmed to four fields.
ENTRIES = [
    {"serial": "04a1", "issuer": "C=US, O=Let's Encrypt, CN=R11",
     "common_name": "example.com", "names": "example.com\nwww.example.com"},
    {"serial": "04a1", "issuer": "C=US, O=Let's Encrypt, CN=R11",       # its precertificate
     "common_name": "example.com", "names": "example.com\nwww.example.com"},
    {"serial": "0c7e", "issuer": "C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1",
     "common_name": "api.example.com", "names": "api.example.com"},
    {"serial": "51d2", "issuer": "C=XX, O=Example Trust Services, CN=Example Trust TLS CA 1",
     "common_name": "mail.example.com", "names": "mail.example.com"},
    {"serial": "77b0", "issuer": "C=XX, O=Other Cloud CA, CN=Other Cloud Issuing CA",
     "common_name": "cdn.partner.net", "names": "cdn.partner.net\nStatic.Example.com."},
    {"serial": "09f3", "issuer": "C=US, O=Let's Encrypt, CN=R10",
     "common_name": "notexample.com", "names": "notexample.com"},
    {"serial": "1b44", "issuer": "C=US, O=Let's Encrypt, CN=E6",
     "common_name": "*.example.com", "names": "*.example.com"},
]

def naive(entries):                       # Break it: common name only, suffix only
    for e in entries:
        if e["common_name"].endswith("example.com"):
            ok = "Let's Encrypt" in e["issuer"] or "DigiCert" in e["issuer"]
            print("  ", e["serial"], e["common_name"], "ok" if ok else "ALERT")

OURS = {"example.com"}
ALLOWED_ORGS = {"Let's Encrypt", "DigiCert Inc"}   # the same CAs our CAA records name
WILDCARDS_OK = False

def clean(name):
    return name.strip().lower().rstrip(".")

def ours(name):
    base = clean(name)
    base = base[2:] if base.startswith("*.") else base
    return any(base == d or base.endswith("." + d) for d in OURS)

def org(issuer):
    return dict(p.split("=", 1) for p in issuer.split(", ")).get("O", "")

def careful(entries):                     # Fix it: every name, label boundaries, exact issuer
    seen = set()
    for e in entries:
        if (e["issuer"], e["serial"]) in seen:
            continue                      # certificate and precertificate: report once
        seen.add((e["issuer"], e["serial"]))
        mine = [clean(n) for n in e["names"].split("\n") if ours(n)]
        if not mine:
            continue
        problems = []
        if org(e["issuer"]) not in ALLOWED_ORGS:
            problems.append("unexpected issuer " + org(e["issuer"]))
        if not WILDCARDS_OK and any(n.startswith("*.") for n in mine):
            problems.append("wildcard")
        print("  ", e["serial"], ", ".join(mine), "->", "; ".join(problems) or "ok")

print("naive:")
naive(ENTRIES)
print("careful:")
careful(ENTRIES)
```

```text
naive:
   04a1 example.com ok
   04a1 example.com ok
   0c7e api.example.com ok
   51d2 mail.example.com ALERT
   09f3 notexample.com ok
   1b44 *.example.com ok
careful:
   04a1 example.com, www.example.com -> ok
   0c7e api.example.com -> ok
   51d2 mail.example.com -> unexpected issuer Example Trust Services
   77b0 static.example.com -> unexpected issuer Other Cloud CA
   1b44 *.example.com -> wildcard
```

The naive check caught one problem and missed two. Certificate `77b0` is the
dangerous one: its common name belongs to someone else, and your name hides
in the Subject Alternative Name list, written in capitals with a trailing dot.
Browsers ignore the common name when SANs are present, so that certificate
works for `static.example.com`, and a monitor that reads only the common name
will never see it. The naive check also reported a stranger's domain,
`notexample.com`, as one of yours (harmless here, but a source of noise that
teaches people to ignore alerts), printed the same certificate twice, and
passed a wildcard nobody ordered.

The issuer comparison has a subtler trap. Matching "Let's Encrypt" as a
substring of the issuer string would accept an organization named, say,
"Not Let's Encrypt Ltd". Comparing the parsed organization field exactly is
better; comparing the issuer's key identifier (the Authority Key Identifier
of chapter 3) is better still, with one cost: CAs rotate their intermediates
(Let's Encrypt introduced new ones in 2024), and an allowlist pinned to
intermediates must be updated when they do. Organization names change more
slowly. Whichever you choose, the allowlist and your CAA records should be
generated from the same file.

**What to do.**

- Subscribe to a CT monitor for every domain you own, including ones you
  only park; route its alerts to a person.
- Publish CAA records naming your CAs, and check new certificates against the
  same list.
- Check every SAN, match names on label boundaries, and treat an unknown CA,
  an unknown name or an unexpected wildcard as an incident until explained.
- Do not depend on a single free service; it is a best-effort source.

## 18.4 How algorithms die

*Level: intermediate.*

An algorithm is never switched off on one day. It goes through stages, and
each stage is set by a different group of people: researchers publish a
weakness, standards bodies *deprecate* it (still allowed, but plan to stop),
then *disallow* it for new protection, vendors stop *offering* it by default,
then stop *accepting* it, and finally the code is *removed*. Old data protected
by it may have to be readable long after that. The interesting number for an
engineer is the time between the first stage and the last, because it says how
long a migration really takes and how early to start the next one. Five
retirements show the pattern.

### MD5: twenty-eight years and counting

MD5 (RFC 1321, 1992) had its compression function broken by Hans Dobbertin in
1996, and full collisions were shown by Wang Xiaoyun and colleagues in August
2004 (the attacks are in Cryptanalysis
[Chapter 9](../cryptanalysis/09-Breaking-Hash-Functions.md)). In 2005 Arjen
Lenstra, Wang and Benne de Weger made two X.509 certificates with the same
MD5 signature. Certificate authorities kept signing with MD5 anyway, until
December 2008, when Marc Stevens, Alex Sotirov, Jacob Appelbaum and colleagues
used a cluster of about 200 PlayStation 3 consoles to make a rogue
intermediate CA certificate that a real, commercial CA had signed without
knowing it. The CA in question stopped using MD5 within days. In 2012 the
Flame malware used a different MD5 chosen-prefix collision to forge a
Microsoft code-signing certificate and spread across local networks by
posing as Windows Update.

That should have been the end, and it was not. RFC 6151 (2011) said MD5 must
not be used where collision resistance matters; RFC 9155 removed MD5 and SHA-1
from TLS 1.2's signature algorithms only in December 2021. And in July 2024
the Blast-RADIUS attack (CVE-2024-3596) used an MD5 chosen-prefix collision to
forge responses in RADIUS, the protocol that still authenticates network
logins in enterprises and at internet providers, because RADIUS over UDP had
been authenticated with an MD5-based construction since the 1990s. The fixes
were a new required attribute and, in the long run, moving RADIUS inside TLS.
Twenty years after the first collisions, MD5 was still holding a door shut.

!!! note "Life story: MD5 in the field"
    **Born:** 1992, RFC 1321, by Ron Rivest · **Purpose:** a fast 128-bit
    hash for signatures, checksums and MACs · **Helped:** a generation of
    software, from file checksums to password hashing to TLS ·
    **Retired:** for certificates after the rogue CA of December 2008; from
    TLS 1.2 signatures by RFC 9155 (2021) · **Status:** still inside RADIUS,
    old protocols and countless file-integrity checks; Blast-RADIUS (2024)
    showed what that costs · **Replaced by:** SHA-256 and SHA-3

### SHA-1: from a paper to a date in 2030

§18.1 told the core of SHA-1's story. The parts that matter for operations
are the mechanisms. Browsers did not just stop accepting SHA-1 certificates;
from late 2014 Chrome showed progressively worse warnings on sites whose
certificate chains used SHA-1 and expired after certain dates, so that site
owners saw a cost long before the cutoff. CAs were given a hard issuing
deadline (1 January 2016). Two CAs, WoSign and StartCom, were later caught
backdating SHA-1 certificates to before that deadline and lost browser trust
for it, which shows why a deadline needs public logs to be enforced. And
everything outside web certificates moved more slowly. Git added detection
of the SHAttered collision pattern in version 2.13 (May 2017), added SHA-256
repositories experimentally in 2.29 (October 2020) and stopped calling them
experimental in 2.42 (2023); making SHA-256 the default is planned for Git 3.0,
which had not shipped by late 2026, partly because the large hosting services
did not yet accept SHA-256 repositories. OpenSSH stopped accepting `ssh-rsa`
signatures, which use SHA-1, by default in version 8.8 (September 2021),
after Gaëtan Leurent and Thomas Peyrin's chosen-prefix collision, "SHA-1 is a
Shambles" (January 2020), which they used to make two PGP keys with colliding
certifications. NIST announced in December 2022 that SHA-1 would be retired
from all remaining uses by 31 December 2030.

!!! note "Life story: SHA-1 in web certificates"
    **Born:** 1995, FIPS 180-1; the default signature hash for certificates
    by the 2000s · **Purpose:** collision-resistant hashing under RSA and
    ECDSA signatures · **Helped:** sign most of the web's certificates for
    about fifteen years · **Retired:** NIST disallowed SHA-1 signature
    generation after 2013; CAs stopped issuing on 1 January 2016; Chrome 56
    and Firefox 51 began refusing the certificates in January 2017, weeks
    before SHAttered · **Replaced by:** SHA-256, with SHA-1 kept only where
    old signatures must still be checked, until 2030

### Triple DES, RSA-1024 and TLS 1.0

**Triple DES** fell to its 64-bit block, not its key. Karthikeyan Bhargavan
and Gaëtan Leurent's Sweet32 attack (2016) recovered an HTTP cookie from a
long 3DES-protected connection by waiting for a block collision; NIST then
limited a 3DES key to $2^{20}$ blocks in SP 800-67 Rev. 2 (2017), and
SP 800-131A Rev. 2 (2019) disallowed 3DES encryption after 31 December 2023.
SP 800-67 itself was withdrawn on 1 January 2024. Decrypting old data with it
is still allowed, which is the usual compromise: stop writing, keep reading.
Payment systems, which built a generation of hardware around DES and 3DES,
are the long tail.

**RSA-1024** was never publicly factored; RSA-768 fell in December 2009 and
the 829-bit RSA-250 in February 2020, and the trend was enough. SP 800-131A
disallowed 1024-bit RSA signatures after 2013, the CA/Browser Forum's Baseline
Requirements required 2048-bit keys for certificates valid past the end of
2013, and the browsers removed their 1024-bit root certificates over the
following two years. Roots were the slow part, because a root certificate is
built into devices that are rarely updated.

**TLS 1.0 and 1.1** were the protocol-level case. TLS 1.0 dates from 1999 and
carried CBC with predictable IVs (BEAST, 2011), MD5 and SHA-1 in its
handshake, and no AEAD suites; the attacks are in Protocols
[Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md). The PCI Security
Standards Council required payment sites to stop using early TLS by 30 June
2018. Apple, Google, Microsoft and Mozilla announced together in October 2018
that their browsers would drop TLS 1.0 and 1.1 in early 2020; the pandemic
delayed it by a few months, and Firefox 78 and Chrome 84 shipped without them
in mid-2020. The IETF formally deprecated both versions in RFC 8996 in March
2021. By then, as often happens, the standard recorded a decision the large
deployments had already made.

!!! note "Life story: TLS 1.0 and 1.1"
    **Born:** TLS 1.0 in RFC 2246 (1999), TLS 1.1 in RFC 4346 (2006) ·
    **Purpose:** the secure channel of the web after SSL 3.0 · **Helped:**
    carried most HTTPS traffic until about 2014 · **Retired:** forbidden for
    card payments after June 2018; dropped by the major browsers in 2020;
    deprecated by RFC 8996 in March 2021 · **Replaced by:** TLS 1.2
    (RFC 5246, 2008) and TLS 1.3 (RFC 8446, 2018)

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Bars from first public warning to removal: MD5 from 1996 to beyond 2024; SHA-1 from 2005 to 2017 for web certificates with a tail to 2030; triple DES from 2016 to 2024; RSA-1024 from about 2009 to 2015; TLS 1.0 from 2011 to 2021" fill="currentColor" font-size="13">
<line x1="120" y1="230" x2="620" y2="230" stroke="currentColor" stroke-width="1.2"/>
<text x="120" y="248" text-anchor="middle" font-size="12">1995</text>
<text x="220" y="248" text-anchor="middle" font-size="12">2002</text>
<text x="320" y="248" text-anchor="middle" font-size="12">2009</text>
<text x="420" y="248" text-anchor="middle" font-size="12">2016</text>
<text x="520" y="248" text-anchor="middle" font-size="12">2023</text>
<text x="620" y="248" text-anchor="middle" font-size="12">2030</text>
<text x="10" y="38">MD5</text>
<rect x="134" y="24" width="414" height="20" fill="currentColor" opacity="0.35"/>
<rect x="548" y="24" width="40" height="20" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="140" y="60" font-size="11.5">1996 compression attack · 2008 rogue CA · 2024 Blast-RADIUS, still in use</text>
<text x="10" y="88">SHA-1</text>
<rect x="263" y="74" width="171" height="20" fill="currentColor" opacity="0.35"/>
<rect x="434" y="74" width="186" height="20" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="268" y="110" font-size="11.5">2005 attack · 2017 certificates end · NIST end 2030</text>
<text x="10" y="138">3DES</text>
<rect x="420" y="124" width="114" height="20" fill="currentColor" opacity="0.35"/>
<text x="426" y="160" font-size="11.5">2016 Sweet32 · 2024 withdrawn</text>
<text x="10" y="188">RSA-1024</text>
<rect x="320" y="174" width="86" height="20" fill="currentColor" opacity="0.35"/>
<text x="312" y="188" font-size="11.5" text-anchor="end">2009 RSA-768 · 2015 roots</text>
<text x="10" y="218">TLS 1.0</text>
<rect x="349" y="204" width="143" height="20" fill="currentColor" opacity="0.35"/>
<text x="342" y="218" font-size="11.5" text-anchor="end">2011 BEAST · 2021 RFC 8996</text>
</svg>
<figcaption>Figure 18.3. From the first serious warning to removal. Solid bars end where the main deployments stopped; dashed bars show the tail that remained. Each took six years or more, and the tails are longer than the bars.</figcaption>
</figure>

### The pattern

Put side by side (Figure 18.3), the five retirements say three things. **It
takes six to fifteen years** from a credible warning to removal from the main
deployments, and the tail is longer: embedded devices, payment hardware,
industrial protocols and archives. **Deadlines work when someone with leverage
sets them**: browsers for certificates and TLS, the PCI Council for payments,
NIST for US government systems. Advice alone moved little. **Warnings before
the deadline work better than the deadline itself.** Chrome's escalating
indicators for SHA-1 and the test "brownouts" some services used before
removing TLS 1.0 found the users who would break while there was still time to
help them.

The post-quantum migration is the same pattern on a larger scale, with the
deadlines already set (2030 to 2035); its plan is in Post-quantum
[Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md), and its
inventory step in [Chapter 17](17-Choosing-Testing-and-Verifying.md) of this
book. What this chapter adds is the operational habit: keep a calendar of the
dates that apply to you, and treat each one as a project that starts years
before it.

**What to do.**

- Keep a dated list of every algorithm, key size and protocol version you use,
  with the deprecation and disallow dates that apply (NIST SP 800-131A, your
  industry's rules, your browsers' and platforms' announcements).
- Stop writing with a weakened algorithm first; keep reading old data with it
  only as long as the data needs it, and know when that is.
- Warn users of an old algorithm long before you remove it, and test the
  removal with short, announced brownouts.
- Assume the next retirement (RSA and elliptic curves, by 2035) will take as
  long as the last ones, and start now.

## 18.5 Measuring what you still use

*Level: intermediate.*

You cannot remove what you have not measured, and configuration files do not
tell you. A server that offers TLS 1.0 may never negotiate it; a server that
offers only TLS 1.2 and 1.3 may still have a partner connecting through an old
load balancer that downgrades on its side. What matters is what is actually
**negotiated**, by whom, and how often. The browsers decided to drop TLS 1.0
and 1.1 from their own telemetry: Google reported in 2018 that only about 0.5
percent of HTTPS connections made by Chrome still used them. They could
afford to break that half percent because they could measure it and announce
the change for over a year.

Servers can measure the same thing. Most TLS terminators can log the
negotiated version and cipher suite for every connection (in nginx, the
variables `$ssl_protocol` and `$ssl_cipher`; in HAProxy, `ssl_fc_protocol`
and `ssl_fc_cipher`; in cloud load balancers, a field in the access log).
Add the key exchange group and the signature algorithm where the software
exposes them, and, most important, **who** the client is: an API key, a
client certificate's subject, a user agent, or a source network. Then count.

### Code it: a tally that finds the people

The program below builds a day of log lines (in practice you would read
them from files), tallies versions and suites, and then does the step that
matters: it lists the clients behind the old versions.

```python
from collections import Counter, defaultdict

# A day of access-log lines: time, client, TLS version, cipher suite (nginx's
# $ssl_protocol and $ssl_cipher). Built here in bulk; real ones come from your logs.
LOG = []
def add(n, client, version, suite, hour=9):
    for i in range(n):
        LOG.append(f"2026-11-08T{hour + i % 8:02}:{i % 60:02}:00Z {client} {version} {suite}")
add(9000, "browser", "TLSv1.3", "TLS_AES_128_GCM_SHA256")
add(2400, "browser", "TLSv1.3", "TLS_CHACHA20_POLY1305_SHA256")
add(3100, "mobile-app", "TLSv1.3", "TLS_AES_256_GCM_SHA384")
add(400, "uptime-probe", "TLSv1.2", "ECDHE-RSA-AES128-GCM-SHA256")
add(12, "payroll-partner", "TLSv1", "AES128-SHA", hour=1)
add(3, "pos-terminal-17", "TLSv1.1", "DES-CBC3-SHA", hour=6)

versions, suites = Counter(), Counter()
clients = defaultdict(Counter)            # version -> client -> connections
last_seen = {}
for line in LOG:
    when, client, version, suite = line.split()
    versions[version] += 1
    suites[suite] += 1
    clients[version][client] += 1
    last_seen[(client, version)] = max(when, last_seen.get((client, version), ""))

total = sum(versions.values())
for v, n in versions.most_common():
    print(f"{v:8} {n:6} {100 * n / total:6.2f}%")
old = versions["TLSv1"] + versions["TLSv1.1"]
print(f"Break it: TLS 1.0 and 1.1 are {100 * old / total:.2f}% of connections; switch them off?")
print("Fix it: who is behind them:")
for v in ("TLSv1", "TLSv1.1"):
    for client, n in clients[v].items():
        print(f"  {v:8} {client:16} {n:3} connections, last {last_seen[(client, v)]}")
weak = [s for s in suites if "CBC3" in s or s.startswith("AES")]   # 3DES, or no forward secrecy
print("suites to retire:", ", ".join(sorted(weak)))
```

```text
TLSv1.3   14500  97.22%
TLSv1.2     400   2.68%
TLSv1        12   0.08%
TLSv1.1       3   0.02%
Break it: TLS 1.0 and 1.1 are 0.10% of connections; switch them off?
Fix it: who is behind them:
  TLSv1    payroll-partner   12 connections, last 2026-11-08T08:07:00Z
  TLSv1.1  pos-terminal-17    3 connections, last 2026-11-08T08:02:00Z
suites to retire: AES128-SHA, DES-CBC3-SHA
```

The **Break it** line is the mistake that a percentage invites. A tenth of a
percent of connections sounds like nothing, and the decision to switch off
TLS 1.0 and 1.1 looks easy. The **Fix it** lines show what the percentage hid:
the twelve connections are the company's payroll provider, which connects
once an hour overnight to deliver salaries, and the three are a point-of-sale
terminal in a shop. Switching off the old versions on Monday would stop
payroll on Monday night. Connections measure load; for deprecation you must
count **clients**, and weigh each by what breaks when it fails.

The suites line is the second finding: `AES128-SHA` uses RSA key transport,
with no forward secrecy, and `DES-CBC3-SHA` is triple DES. Both come from the
same two clients, which is common: old software is old in every way at once.

The tally is also how you know that a removal is done. Run it after each
step, keep the history, and remove the old code only when a week of logs,
including weekends and month-ends, shows no use. Monthly batch jobs, annual
renewals and devices that wake up rarely are the clients that surprise teams
which measured for one day.

### Brownouts

When the tally shows clients you cannot reach (anonymous devices, customers
who do not read email), a **brownout** finds them: disable the old version for
an hour, announced in advance, then turn it back on and look at who
complained or who failed. GitHub did this before removing TLS 1.0 and 1.1 and
weak SSH algorithms in February 2018, and several package registries did the
same for their own TLS changes. Each brownout is longer than the last; the
final one does not end.

**What to do.**

- Log the negotiated version, suite, group and signature algorithm with a
  client identity on every TLS terminator, and keep the counts.
- Decide removals by clients, not connections, and talk to each client that
  remains.
- Measure across a full business cycle before removing anything; run
  announced brownouts for clients you cannot identify.
- Use the same tally to prove a removal is complete.

## 18.6 When keys leak by the thousand: Debian and Heartbleed

*Level: intermediate.*

Chapter 12 described the first hour after one secret leaks. The two largest
key-replacement efforts in the history of the internet were different in
kind: the keys were not stolen from one company but made weak, or made
readable, across the whole internet at once, and every operator had to find
and replace their own.

### Debian, May 2008: find every key

On 13 May 2008 Debian announced (DSA-1571-1, CVE-2008-0166) that its OpenSSL
package had been generating predictable random numbers since September 2006.
How a two-line change had reduced the generator's seed to the process ID,
leaving 32,767 possible keys of each type, and how attackers enumerated them,
is told in Cryptanalysis
[§18.3](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md#183-debian-2006-to-2008-a-seed-with-nothing-in-it).
The operational side is what this chapter needs.

The first problem was **finding the keys**. Any key generated on an affected
Debian or Ubuntu system was weak: SSH host keys made at install time, users'
SSH keys, TLS keys and their certificate requests, OpenVPN keys, DNSSEC keys.
Worse, any **DSA** key *used* on an affected system was exposed, even if it
had been generated safely elsewhere, because each DSA signature needs a
secret random nonce and the nonce came from the broken generator; one
signature with a guessable nonce gives away the key. So the question was not
only "which keys were made on these machines" but "which keys signed anything
on them".

The answer Debian shipped was a **blocklist**. Because there were only
32,767 keys of each type, size and architecture, they could all be generated
in advance, and Debian published their fingerprints in packages named
`openssh-blacklist`, `openssl-blacklist` and `openvpn-blacklist`, with tools
(`ssh-vulnkey` and `openssl-vulnkey`) that checked a key against them.
Debian's patched OpenSSH server refused to accept blocklisted user keys by
default. Certificate authorities ran the same lists against their databases
and revoked matching certificates. The approach generalizes: when a bad key
generator has a small output space, the cheapest defense for everyone else is
a published list of its outputs, checked wherever keys are accepted.

The second problem was **replacing them**. Regenerating an SSH host key
changes every client's `known_hosts` entry, so each regeneration produced
warnings that users had been taught to fear, or to ignore. Regenerating a TLS
key meant a new certificate. And regenerating on a machine that had not yet
installed the fixed package produced another weak key. Scott Yilek, Eric
Rescorla, Hovav Shacham, Brandon Enright and Stefan Savage followed affected
TLS servers for six months afterwards and found that many kept their weak
keys for months, and that some replaced one weak key with another. Years
later, scans of the internet still found keys on the Debian lists.

!!! note "Life story: the Debian key blocklists"
    **Born:** May 2008, with DSA-1571-1 · **Purpose:** lists of every key
    the broken generator could produce, for SSH, OpenSSL and OpenVPN, with
    `ssh-vulnkey` and `openssl-vulnkey` to check keys and a patched OpenSSH
    server that refused them · **Helped:** administrators find weak keys,
    CAs revoke certificates for them, and servers reject them at login ·
    **Retired:** the packages were dropped from later Debian releases once
    the keys had aged out · **Replaced by:** the same idea in later
    incidents: ROCA (2017) shipped a fingerprint test instead of a list,
    because its weak keys were too many to enumerate

### Heartbleed, April 2014: patch, rekey, revoke, in that order

Heartbleed (CVE-2014-0160), told in full in
[Chapter 8](08-Hostile-Input.md), was disclosed on 7 April 2014. A missing
bounds check let anyone read up to 64 KB of a server's memory per request.
Whether private keys could be extracted was argued about for three days, until
CloudFlare set up a challenge server and, on 11 April, several people
recovered its private key. From then on, every operator of a vulnerable
server had to assume its TLS key was gone.

The response had a strict order, and doing it out of order wasted the work:

<div class="mars-steps" markdown>

1. **Patch** OpenSSL and restart every process that had loaded it. A new key
   on an unpatched server can be read out again.
2. **Generate a new key.** Reissuing a certificate for the *old* key, which
   some operators did, changes nothing.
3. **Obtain and deploy a certificate** for the new key, and check that every
   server behind the load balancer serves it.
4. **Revoke the old certificate**, so that a thief holding the old key cannot
   impersonate the site with it, as far as clients check revocation.
5. **Rotate everything else the memory could have held**: session ticket
   keys, passwords typed by users during the exposure, API tokens and cookies.

</div>

The measurements afterwards showed how hard that was to do at scale. Liang
Zhang and colleagues (IMC 2014) followed the certificates of vulnerable
sites: three weeks after disclosure, more than 73 percent had not been
reissued and more than 87 percent had not been revoked, and for about 60
percent of the certificates that *had* been reissued, the old certificate was
never revoked. Some sites reissued with the same key.

Those that did revoke changed the revocation system itself. CloudFlare, which
had to assume all its customers' keys were exposed, reissued and revoked them
in bulk, and reported that the certificate revocation list of its CA,
GlobalSign, grew from about 22 KB to about 4.7 MB in a day, and that clients
downloading it generated about 40 Gbit/s of new traffic. A CRL is fetched by
every client that checks it, so a list a hundred times larger costs a hundred
times more for every one of them. Yabing Liu and colleagues (IMC 2015) found
that about 8 percent of the certificates they studied had been revoked, a
figure inflated by Heartbleed, that CRLs could be very large (the largest
they saw was 76 MB), and that most browsers, especially on mobile, did not
check revocation reliably at all. That last finding is why revocation moved
to browser-pushed lists such as CRLSets and CRLite, explained in Protocols
[§2.7](../protocols/02-Certificates-and-PKI.md#27-revocation-and-why-it-mostly-failed),
and why the real defense against stolen keys became short certificate
lifetimes ([chapter 12](12-Secrets-in-Operations.md)).

!!! note "Life story: the Heartbleed revocation wave"
    **Born:** April 2014, after private keys were shown to be extractable on
    11 April · **Purpose:** retire every TLS key that a vulnerable server had
    held · **Helped:** remove many exposed keys, and showed by its failures
    that revocation does not scale and that operators reissue more readily
    than they revoke · **Status:** a reference point; the lessons became
    short lifetimes, automated issuance and browser-pushed revocation lists
    · **Replaced by:** ACME automation, under which replacing every
    certificate is a routine job rather than a project

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The order of a mass key replacement: patch the hole, generate a new key, deploy a certificate for it, revoke the old certificate, rotate secrets that were exposed alongside, then verify with scans; doing a later step before an earlier one wastes it" fill="currentColor" font-size="13.5">
<rect x="10" y="40" width="92" height="56" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="10" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="56" y="64" text-anchor="middle" font-weight="bold">1 patch</text>
<text x="56" y="82" text-anchor="middle" font-size="11.5">close the hole</text>
<rect x="116" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="162" y="64" text-anchor="middle" font-weight="bold">2 new key</text>
<text x="162" y="82" text-anchor="middle" font-size="11.5">never the old one</text>
<rect x="222" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="268" y="64" text-anchor="middle" font-weight="bold">3 deploy</text>
<text x="268" y="82" text-anchor="middle" font-size="11.5">new certificate</text>
<rect x="328" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="374" y="64" text-anchor="middle" font-weight="bold">4 revoke</text>
<text x="374" y="82" text-anchor="middle" font-size="11.5">the old one</text>
<rect x="434" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="64" text-anchor="middle" font-weight="bold">5 rotate</text>
<text x="480" y="82" text-anchor="middle" font-size="11.5">tickets, tokens</text>
<rect x="540" y="40" width="92" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="586" y="64" text-anchor="middle" font-weight="bold">6 verify</text>
<text x="586" y="82" text-anchor="middle" font-size="11.5">scan, CT, logs</text>
<line x1="102" y1="68" x2="112" y2="68" stroke="currentColor" stroke-width="1.4"/>
<line x1="208" y1="68" x2="218" y2="68" stroke="currentColor" stroke-width="1.4"/>
<line x1="314" y1="68" x2="324" y2="68" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="68" x2="430" y2="68" stroke="currentColor" stroke-width="1.4"/>
<line x1="526" y1="68" x2="536" y2="68" stroke="currentColor" stroke-width="1.4"/>
<text x="162" y="130" text-anchor="middle" font-size="12">key before patch:</text>
<text x="162" y="146" text-anchor="middle" font-size="12">stolen again</text>
<text x="320" y="130" text-anchor="middle" font-size="12">revoke before deploy:</text>
<text x="320" y="146" text-anchor="middle" font-size="12">your own outage</text>
<text x="480" y="130" text-anchor="middle" font-size="12">skip 4: a thief keeps</text>
<text x="480" y="146" text-anchor="middle" font-size="12">a working certificate</text>
<text x="320" y="184" text-anchor="middle" font-size="12">Heartbleed, 2014: most sites stopped after step 3, or never started</text>
</svg>
<figcaption>Figure 18.4. The order of a mass key replacement. Each step depends on the one before; most of the failures measured after Heartbleed were steps done out of order or not at all.</figcaption>
</figure>

### A modern case: GitHub's host key, 2023

Rotation at scale is not only a story about 2008 and 2014. On 24 March 2023
GitHub announced that it had replaced its RSA SSH host key, used by every
`git` client that connects over SSH, because the private key had been
briefly exposed in a public repository. There was no evidence of misuse, but
a host key cannot be un-exposed, and GitHub replaced it within hours. Every
user with the old key in `known_hosts` then saw OpenSSH's warning that the
remote host identification had changed, which is exactly what a
man-in-the-middle attack looks like. GitHub published the new fingerprints
and a one-line command to remove the old entry. Its ECDSA and Ed25519 host
keys were not affected, which is the lesson: a system that offers more than
one key type can replace one without everyone losing the ability to connect.

**What to do.**

- Know, for each kind of key you use, how you would find every instance:
  hosts, users, devices, certificates, and what signed with it.
- When a generator or library is found weak, fix it before you rekey; then
  rekey, deploy, revoke, rotate neighbors and verify, in that order.
- Where weak keys can be enumerated, check new keys against published
  blocklists at the point of acceptance.
- Prefer short certificate lifetimes and automated issuance to revocation;
  keep a second key type deployed where the protocol allows it.

## 18.7 When the authority is the problem: Let's Encrypt 2020 and Entrust 2024

*Level: intermediate.*

Some incidents start with the certificate authority, not with you. Your keys
are fine; your certificates are suddenly going to be revoked, or your CA is
going to stop being trusted. Two cases show the range, and both turn on the
same question: how fast can you replace every certificate you have?

### Let's Encrypt and the CAA re-check bug

Before issuing a certificate, a CA must check the domain's CAA records (§18.3)
within eight hours of issuance. Let's Encrypt lets a validated domain
authorization be reused for up to 30 days, so when an authorization was older
than eight hours, its software, Boulder, had to check CAA again at issuance.
On 29 February 2020 Let's Encrypt found a bug in that re-check: when a
certificate request contained several names that needed it, Boulder picked
one of the names and checked it once per name, instead of checking each name
once. Every other name on those certificates had gone out without the CAA
check the rules required.

The bug was fixed within hours. The certificates were the problem. The
Baseline Requirements give a CA five days to revoke certificates issued in
breach of the rules, and Let's Encrypt counted 3,048,289 affected
certificates that were still valid, out of about 116 million active. Of
those, only 445 had CAA records that would actually have forbidden the
issuance. On 3 March it announced that it would revoke all the affected
certificates by the deadline, 5 March at 03:00 UTC, emailed the subscribers
it could reach, and published the list of serial numbers and a checking
tool.

Then the operational reality arrived. Revoking certificates that are still
installed breaks the websites using them for every client that checks
revocation, and many of the affected subscribers could not renew within two
days: they had not read the email, or their renewal was not automated, or it
was automated on a schedule they could not change. Let's Encrypt revoked
about 1.7 million certificates by the deadline, a little over half: the ones
it could see had already been replaced, together with the 445. It held back
the remaining 1.3 million or so (more than a million of them possibly still in
use), judging that breaking that many sites would do more harm than leaving
certificates that were almost certainly correctly issued to expire within
their 90-day lifetimes; it said it would revoke more only where that would not
needlessly break sites, and it reported the missed deadline as a compliance
incident to the browsers' root programs.

!!! note "Life story: the Let's Encrypt CAA re-check bug"
    **Born:** a Boulder bug in the CAA re-check for reused authorizations,
    found on 29 February 2020 · **Purpose:** none; a loop that checked the
    same name repeatedly · **Helped:** show that a CA's revocation deadline
    is only as good as its subscribers' ability to renew in time, and push
    renewal automation further, including the ACME Renewal Information
    extension, which lets a CA tell clients to renew early · **Status:**
    closed: about 1.7 million of 3,048,289 certificates revoked by 5 March
    2020, most of the rest left to expire

The lesson for operators is the one in the Life story. A certificate that is
renewed automatically, every 60 days or so, by a client that can also be told
to renew *now*, survives this kind of incident without anyone noticing. A
certificate installed by hand once a year does not. The ACME Renewal
Information extension (ARI), standardized in 2025, gives CAs exactly that
"renew now" signal, and modern ACME clients support it.

### Entrust, 2024: a CA loses trust

The second case is larger and slower. Through 2024 Entrust, one of the older
commercial CAs, accumulated a series of compliance incidents reported on
Mozilla's public bug tracker: certificates issued with incorrect data, and,
more seriously for the browsers, revocations delayed past the rules'
deadlines, often because Entrust's customers said they could not replace
certificates in time. On 27 June 2024 Google announced that Chrome would stop
trusting TLS certificates from Entrust's roots whose earliest signed
certificate timestamp (the CT log's promise, Protocols §2.8) was dated after
31 October 2024. Mozilla announced a similar cutoff of 30 November 2024.
Certificates issued before the cutoffs kept working until they expired, so
nothing broke on the day; but every Entrust customer had about four months to
move to another CA. Entrust resold certificates issued by SSL.com and
Sectigo to its customers, and in January 2025 sold its public certificate
business to Sectigo.

!!! note "Life story: Entrust's public TLS certificates"
    **Born:** Entrust's web CA dates from the late 1990s · **Purpose:**
    commercial TLS certificates, including Extended Validation, for large
    companies and governments · **Helped:** secure part of the commercial web
    for over twenty years · **Retired:** Chrome distrusted certificates with
    CT timestamps after 31 October 2024, Mozilla after 30 November 2024,
    following a year of compliance incidents and delayed revocations ·
    **Replaced by:** other CAs; Entrust resold SSL.com and Sectigo
    certificates, then sold the business to Sectigo (January 2025)

There is an uncomfortable link between the two cases. Entrust's delayed
revocations were, in many cases, a CA giving in to customers who could not
replace certificates within the five-day window, and the browsers treated
that as a reason to stop trusting it. The ability of every site to replace
any certificate within days is not only your own resilience; the rules of the
web PKI depend on it.

**What to do.**

- Automate issuance and renewal for every certificate, with renewal at about
  two-thirds of the lifetime and support for ARI, so that a CA can ask you to
  renew early.
- Configure a second CA in advance (ACME makes this cheap), list both in your
  CAA records, and test issuing from the second one.
- Keep an inventory of certificates by issuer (your CT monitor already has
  one), so that a distrust announcement turns into a list, not a search.
- Read your CA's incident reports; a CA with a long public list of delayed
  revocations is a risk to you.

## 18.8 A written incident playbook

*Level: intermediate.*

Every story in this chapter went better for the teams that had decided in
advance what to do. An **incident playbook** is that decision written down: a
numbered procedure for one kind of incident, with an owner and a time limit
for each step, kept where the on-call engineer can find it at three in the
morning. It is not a policy document. It says *do this, then this*, and it
names who.

NIST's incident-handling guide gives the general frame. Its Rev. 2 (2012)
named the classic cycle: prepare, detect and analyze, contain, eradicate and
recover, and learn; Rev. 3 (2025) recasts it around the functions of the
Cybersecurity Framework 2.0.
For cryptographic incidents the playbooks are short and few. Most teams need
these:

- **a key or secret leaked** (chapter 12 and §18.6);
- **an algorithm, library or generator found weak** (a new CVE in your TLS
  library, a broken RNG, a deprecated algorithm in use);
- **a certificate problem**: expired, mass-revoked by the CA, or the CA
  distrusted (§18.7, and chapter 12 for expiry);
- **a key lost**: an HSM failed, a quorum of custodians is unavailable, a
  backup cannot be restored (chapters 10 and 11);
- **a signing key misused**: something you did not sign carries your
  signature (chapter 16).

Each playbook follows the same shape, which is worth more than any one of
them:

<div class="mars-steps" markdown>

1. **Declare.** One person says "this is an incident", names an incident lead
   and a scribe, and opens a channel and a timeline. Severity decides who is
   woken.
2. **Contain.** Stop the harm from growing: close the path the key leaked
   through, disable the vulnerable feature, block the forged signer.
3. **Replace.** Deploy the new key, version, algorithm or certificate, and
   confirm from your logs (§18.2) and tallies (§18.5) that traffic moved.
4. **Revoke and retire.** Disable the old key, revoke its certificates,
   publish blocklists; respect external clocks (a CA must revoke within 24
   hours for key compromise and five days for most other problems).
5. **Investigate.** Search the logs by key ID for use since the exposure;
   decide what data or signatures the old key's compromise affects.
6. **Repair.** Re-encrypt data whose confidentiality depended on the key;
   re-sign or re-issue what depended on its signatures.
7. **Tell.** Users, partners, regulators, and for a public key, everyone who
   relies on it. Templates written in advance save hours.
8. **Learn.** A blameless review: how it happened, what made it worse, which
   playbook steps were wrong. Then change the playbook.

</div>

### Code it: a playbook runner

A playbook kept as data can do more than a document. The program below holds
the leaked-key playbook as a list of steps with owners and time limits,
measured from the moment the incident is declared, and prints a checklist
with the steps done so far and any that are overdue. It is deliberately
plain; the point is that the procedure, the deadlines and the status live in
one place that everyone can read.

```python
from datetime import datetime, timedelta

# Each step: (what to do, who owns it, hours after the incident is declared).
PLAYBOOKS = {
    "leaked-key": [
        ("Declare the incident; name a lead and a scribe", "on-call", 0.25),
        ("Contain: close the path the key leaked through", "service owner", 1),
        ("Deploy a new key; confirm traffic has moved to it", "key owner", 4),
        ("Disable the old key; revoke its certificates (24 h rule)", "PKI", 24),
        ("Search the logs by key ID for use since the leak", "security", 24),
        ("Re-encrypt or re-sign what the old key protected", "data owner", 72),
        ("Tell affected users and partners", "comms", 72),
        ("Blameless review: how it leaked, what changes", "lead", 168),
    ],
}

def checklist(kind, declared, now, done):
    print(f"# {kind}, declared {declared:%Y-%m-%d %H:%M}, status at {now:%H:%M}")
    for n, (step, owner, hours) in enumerate(PLAYBOOKS[kind], 1):
        due = declared + timedelta(hours=hours)
        state = "x" if n in done else " "
        late = "  OVERDUE" if n not in done and now > due else ""
        print(f"{n}. [{state}] {step} ({owner}, by {due:%m-%d %H:%M}){late}")

checklist("leaked-key", datetime(2026, 11, 9, 9, 40), datetime(2026, 11, 9, 14, 0), done={1, 2})
```

```text
# leaked-key, declared 2026-11-09 09:40, status at 14:00
1. [x] Declare the incident; name a lead and a scribe (on-call, by 11-09 09:55)
2. [x] Contain: close the path the key leaked through (service owner, by 11-09 10:40)
3. [ ] Deploy a new key; confirm traffic has moved to it (key owner, by 11-09 13:40)  OVERDUE
4. [ ] Disable the old key; revoke its certificates (24 h rule) (PKI, by 11-10 09:40)
5. [ ] Search the logs by key ID for use since the leak (security, by 11-10 09:40)
6. [ ] Re-encrypt or re-sign what the old key protected (data owner, by 11-12 09:40)
7. [ ] Tell affected users and partners (comms, by 11-12 09:40)
8. [ ] Blameless review: how it leaked, what changes (lead, by 11-16 09:40)
```

The output is Markdown, so it can be pasted into the incident channel or
ticket as it stands, and rerun as steps are done. Step 3 is overdue at two in
the afternoon, and the lead can see it without asking anyone. The order of
steps 3 and 4 is the lesson of Figure 18.4: for a TLS or SSH key, the new key
goes in before the old one is revoked, or the incident causes its own outage.
For a bearer secret such as an API token, chapter 12's order applies instead
(revoke first, because a token cannot be "replaced" while the thief is using
it), and that difference is exactly what a separate playbook per kind of
incident captures.

**Rehearse.** A playbook that has never been run is a guess. Run a tabletop
exercise twice a year: one person plays the incident ("the release signing
key is in a public repository"), the team walks the playbook, and the scribe
writes down every step that was unclear, every permission nobody had and
every phone number that was wrong. The fixes from one exercise are worth more
than the playbook's first draft.

**What to do.**

- Write one short playbook per kind of cryptographic incident, with numbered
  steps, owners and time limits, and keep it next to the system.
- Know the external clocks: CA revocation deadlines, breach notification
  laws, contracts.
- Keep the procedure as data or a checklist that produces a status, and paste
  it into the incident record.
- Rehearse twice a year and change the playbook after every exercise and
  every real incident.

## 18.9 Crypto agility in deployment

*Level: intermediate.*

Every response in this chapter needed a change of algorithm, key or
certificate, made quickly and safely in production. **Crypto agility** is the
property that makes such changes cheap. Chapter 17 treats it as a design
property (algorithm identifiers in formats, inventories, room for larger
keys), and Post-quantum
[§18.8](../post-quantum/18-Hybrids-and-the-Migration.md#188-inventories-and-agility)
explains why the coming migration needs it. Here it is a deployment practice:
how to switch an algorithm on, run two at once, and switch back.

**Algorithms behind flags.** Treat each algorithm, key version or protocol
option as configuration with two separate sets: what the system will
**produce** (encrypt, sign, offer first) and what it will **accept** (decrypt,
verify, allow from a peer). Chapter 9
([§9.10](09-APIs-That-Resist-Misuse.md#910-deprecating-an-api-without-breaking-users))
used the same split for retiring an API: stop writing before you stop
reading. Separate flags let the two sets move on different days, per service
and per percentage of traffic, the way any feature is rolled out.

**Dual-running.** Many changes can run old and new side by side, so that
clients move at their own speed: a TLS server can hold an RSA and an ECDSA
certificate and serve each client the one it supports; a release can carry
two signatures; a key exchange can be hybrid, classical and post-quantum
together; a database can hold records under two key versions. Dual-running
costs bytes and code, and it is what turns a flag day into a migration.

**Rollback.** Every step must have a way back, and the way back must be
tested. That means the old key or algorithm stays available, in the accept
set and in the key store, until the new one has run long enough, through a
full business cycle (§18.5), to be trusted. Rollback is safe in one direction
only: you may re-enable *producing* the old format while it is still
accepted everywhere, but once data has been written in the new format, every
reader must keep accepting it.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Four stages of an algorithm change: stage 1 accept old, produce old; stage 2 accept old and new, produce old; stage 3 accept old and new, produce new; stage 4 accept new, produce new; rollback is possible between adjacent stages up to stage 3, and stage 4 is entered only when telemetry shows no use of the old algorithm" fill="currentColor" font-size="13.5">
<rect x="10" y="40" width="140" height="78" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="62" text-anchor="middle" font-weight="bold">1 today</text>
<text x="80" y="84" text-anchor="middle" font-size="12">accept: old</text>
<text x="80" y="102" text-anchor="middle" font-size="12">produce: old</text>
<rect x="170" y="40" width="140" height="78" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="240" y="62" text-anchor="middle" font-weight="bold">2 read both</text>
<text x="240" y="84" text-anchor="middle" font-size="12">accept: old + new</text>
<text x="240" y="102" text-anchor="middle" font-size="12">produce: old</text>
<rect x="330" y="40" width="140" height="78" rx="6" fill="currentColor" opacity="0.10"/>
<rect x="330" y="40" width="140" height="78" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="62" text-anchor="middle" font-weight="bold">3 write new</text>
<text x="400" y="84" text-anchor="middle" font-size="12">accept: old + new</text>
<text x="400" y="102" text-anchor="middle" font-size="12">produce: new</text>
<rect x="490" y="40" width="140" height="78" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="560" y="62" text-anchor="middle" font-weight="bold">4 old gone</text>
<text x="560" y="84" text-anchor="middle" font-size="12">accept: new</text>
<text x="560" y="102" text-anchor="middle" font-size="12">produce: new</text>
<line x1="150" y1="70" x2="166" y2="70" stroke="currentColor" stroke-width="1.4"/>
<polygon points="170,70 160,65 160,75"/>
<line x1="310" y1="70" x2="326" y2="70" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,70 320,65 320,75"/>
<line x1="470" y1="70" x2="486" y2="70" stroke="currentColor" stroke-width="1.4"/>
<polygon points="490,70 480,65 480,75"/>
<path d="M 240 118 C 240 150, 80 150, 80 122" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<path d="M 400 118 C 400 150, 240 150, 240 122" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="240" y="170" text-anchor="middle" font-size="12">rollback (dashed): safe while the old format is still accepted</text>
<text x="560" y="140" text-anchor="middle" font-size="12">enter only when the</text>
<text x="560" y="156" text-anchor="middle" font-size="12">tally shows no old use</text>
<text x="320" y="204" text-anchor="middle" font-size="12">every reader moves to stage 2 before any writer moves to stage 3</text>
</svg>
<figcaption>Figure 18.5. Four stages of an algorithm change. Readers learn the new algorithm before any writer uses it; writers can roll back while readers still accept the old one; the old algorithm leaves the accept set last, on evidence.</figcaption>
</figure>

**Agility is not negotiation.** The accept set is a list that you control,
and it must shrink as well as grow. Protocols that let the peer pick from a
long list of options gave attackers the downgrade attacks of Protocols
[Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md), and formats that
let the message name its own algorithm gave JWT its `alg: none` (chapter 9).
The safe form is the versioned envelope of chapter 9: a small, fixed set of
versions, each naming a complete choice of algorithms, with the accept set
reduced as soon as the tally says it can be. Agility also has a cost in code:
every option you keep is code that must be tested, and an option nobody uses
is where bugs wait. Remove old versions on schedule, not only when they break.

**What to do.**

- Control algorithms with separate produce and accept flags, per service,
  rolled out gradually.
- Dual-run where the protocol allows (two certificates, two signatures,
  hybrids, two key versions), so that clients migrate at their own pace.
- Move every reader before any writer; keep the old path in the accept set
  until telemetry shows it unused; test rollback before you need it.
- Keep the accept set short and named by versions, never chosen by the peer
  or the message.

## 18.10 People and process

*Level: intermediate.*

Cryptographic systems outlive the people who build them. A signing key may be
used for ten years; the engineer who generated it may stay for three. Most of
the failures of long-running systems are not failures of the cryptography or
even of the code, but of memory: nobody remembers where the backup is, which
two people hold the cards, why the configuration excludes that suite, or whose
email address receives the expiry warnings.

**Key ceremonies.** The most important keys (CA roots, release signing keys,
HSM master keys, root KEKs) are created, backed up and used in ceremonies:
written scripts, several named people, quorums of smart cards, recordings and
witnesses. Chapter 11 describes how they work, with the DNSSEC root's
ceremonies as the public example. The operational point is that a ceremony
is a procedure that is run rarely, so it must be written down completely,
rehearsed, and its participants kept current. A quorum of three out of seven
card holders is useless if four have left the company and nobody updated the
list.

The DNSSEC root itself gave the best example of changing a long-lived key
carefully. The root key-signing key had been in use since 2010. ICANN planned
to replace it on 11 October 2017, with the new key published in advance so
that resolvers could learn it automatically. Weeks before, new telemetry
(resolvers reporting which root keys they trusted, a mechanism standardized
in RFC 8145) showed that a noticeable share still trusted only the old key.
ICANN postponed the rollover by a year, studied the data, consulted the
community and rolled the key on 11 October 2018. The problems that followed
were small. Measuring before cutting over, and being willing to delay, is
the habit of §18.5 applied to the most widely trusted key on the internet.

!!! note "Life story: the 2018 DNSSEC root key rollover"
    **Born:** the first root key-signing key (KSK-2010) was put into use in
    July 2010; its successor, KSK-2017, was generated in 2016 and 2017 in
    public ceremonies · **Purpose:** replace the trust anchor of all DNSSEC
    validation · **Helped:** show that the most widely deployed trust anchor
    could be changed without an outage, by publishing the new key early,
    measuring who had it, and postponing when the numbers were wrong ·
    **Status:** done: postponed from 11 October 2017, rolled on 11 October
    2018; the old key was revoked in January 2019

**Documentation.** For every cryptographic component, someone should be able
to find, in one place: what keys it uses and where they live (the inventory
of chapter 10), who owns it, how to rotate each key, how to restore from
backup, which playbooks apply (§18.8), and why it is configured as it is. The
last item is the one most often missing. A configuration line that disables
a cipher suite looks arbitrary five years later; a comment with a link to the
incident or the standard keeps the next engineer from undoing it.

**Bus factor.** The bus factor of a system is the number of people who would
have to disappear before nobody could operate it. For cryptographic
operations it is often one: the person who set up the HSM, the only one who
knows the release signing procedure. Raise it deliberately. At least two
people should have performed every ceremony and every rotation, and the
second should do the next one with the first watching, not the other way
round.

**On-call.** Alerts from §18.2 and §18.3 must reach a person who can act.
The classic certificate-expiry outage (chapter 12) is often an alert that did
work, sent to the mailbox of someone who had left. Route cryptographic alerts
to a team rotation, never to an individual; give the on-call engineer the
playbooks and the permissions they assume; and review once a quarter that
every expiry, deprecation date and ceremony on the calendar has a current
owner.

**What to do.**

- Write every ceremony as a script, rehearse it, and keep the list of
  custodians current, with a quorum that survives departures.
- Document each component's keys, owners, rotation and restore procedures,
  and the reasons behind its configuration.
- Have at least two people perform every rare procedure; let the newer one
  lead.
- Route alerts to a rotation, keep a calendar of every cryptographic date,
  and check its owners every quarter.

## 18.11 Mars: a settlement's crypto operations plan

*Level: intermediate.*

Arcadia City, the settlement that runs through this shelf, is the hardest
place to run cryptography for years. Light takes from about 3 minutes (at
closest approach, some 55 million km) to about 22 minutes (at about 400
million km) to cross between the planets, so every exchange with Earth costs
between about 6 and 44 minutes of round trip. And roughly every 26 months,
around solar conjunction, the Sun sits between the planets and the link is
unusable for about two weeks.
[Chapter 10](10-The-Life-of-a-Key.md#1011-mars-a-keyring-for-the-conjunction)
planned the city's keyring for that fortnight, and
[Chapter 16](16-Signing-Software-and-the-Supply-Chain.md) the signed updates
sent to its rovers; Protocols
[§2.9](../protocols/02-Certificates-and-PKI.md#29-a-city-authority-on-mars)
built its certificate authority. This section is the operations plan that
sits around them, written as the city's key office would write it, section by
section of this chapter.

<div class="mars-steps" markdown>

1. **Roots of trust are local.** The city's root CA is offline in the council
   vault; its issuing CA and HSM keyring run on Mars. Earth's web PKI is
   trusted only for Earth services. No procedure in the city needs a
   signature from Earth to keep working.
2. **Lifetimes outlast the blackout.** Every certificate or token issued by
   Earth for use on Mars is renewed in the fortnight before the window, so
   that it has at least the window plus a guard band left. With 47-day web
   certificates and a 14-day blackout with a 10-day guard on each side,
   renewing 5 days before the guarded window opens leaves 42 days against the
   34 needed. City-issued certificates
   follow the city's own schedule and simply avoid expiring inside the
   window.
3. **Revocation is local.** The city publishes its own revocation list,
   signed on Mars and valid well past the window, and its servers check it.
   Revocation data for Earth certificates freezes at the start of the window;
   Earth-signed messages that arrive in the first minutes after contact are
   held until both sides have exchanged revocation news (chapter 10).
4. **The city watches its own CA.** It runs a small transparency log for its
   own issuing CA, and a monitor with an allowlist (§18.3) on Mars. The
   city's names in Earth's CT logs are watched by a partner on Earth, whose
   alerts queue until the link returns.
5. **Logs stay home.** Cryptographic event logs (§18.2) are kept and
   analyzed on Mars. Copies go to Earth for archive when there is bandwidth,
   never as a dependency.
6. **Nothing changes in the window.** No algorithm change, deprecation step or
   scheduled rotation of a key shared with Earth falls inside it (Figure 18.5
   stages are scheduled around it); updates are staged and verified before it.
7. **Incidents are handled on Mars.** Every playbook (§18.8) can be run with
   people, keys and quorums that are on Mars. Steps that need Earth (telling
   Earth partners, revoking Earth-issued certificates) are written down,
   signed and queued.
8. **People are the scarcest resource.** At least two residents have
   performed every ceremony and every restore, and a quorum of custodians is
   on Mars for every window. Supply ships can leave Earth only about every
   26 months; a missing skill takes longer.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="What lives on Mars and what waits for Earth: on Mars, the offline root CA, the issuing CA and HSM keyring, the city revocation list, a local transparency log and monitor, event logs, playbooks and custodians; across the link of about 3 to 22 minutes, closed for about two weeks every 26 months, Earth holds the web PKI CAs, CT logs and the partner's monitor, update signing, the archive replica and the queue of notices" fill="currentColor" font-size="13.5">
<rect x="10" y="20" width="250" height="230" rx="8" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="135" y="44" text-anchor="middle" font-weight="bold">Mars: must work alone</text>
<text x="26" y="72">offline root CA (council vault)</text>
<text x="26" y="96">issuing CA, HSM keyring</text>
<text x="26" y="120">city revocation list</text>
<text x="26" y="144">transparency log and monitor</text>
<text x="26" y="168">event logs and alerts</text>
<text x="26" y="192">playbooks, custodian quorum</text>
<text x="26" y="216">staged updates, verified</text>
<rect x="380" y="20" width="250" height="230" rx="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="505" y="44" text-anchor="middle" font-weight="bold">Earth: can wait</text>
<text x="396" y="72">web PKI CAs (renew before)</text>
<text x="396" y="96">CT logs, partner's monitor</text>
<text x="396" y="120">update signing (chapter 16)</text>
<text x="396" y="144">archive replica of logs</text>
<text x="396" y="168">notices to Earth partners</text>
<text x="396" y="192">Earth revocation news</text>
<line x1="262" y1="110" x2="378" y2="110" stroke="currentColor" stroke-width="1.6"/>
<line x1="262" y1="160" x2="378" y2="160" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 5"/>
<text x="320" y="100" text-anchor="middle" font-size="12">~3 to 22 min</text>
<text x="320" y="180" text-anchor="middle" font-size="12">closed ~2 weeks</text>
<text x="320" y="196" text-anchor="middle" font-size="12">every ~26 months</text>
</svg>
<figcaption>Figure 18.6. The settlement's split. Everything on the left runs with the link closed; everything on the right is either renewed before the window or queued until it opens.</figcaption>
</figure>

**What can wait for Earth.** The plan reduces Earth to three roles: issuing
certificates for Earth-facing names (renewed before the window), watching the
public CT logs for those names, and receiving notices and archives. Each
can be late by two weeks without harm. The opposite list is the test of the
plan: revoking a city key, rotating a local key, answering an incident and
rebuilding the master key must never appear on Earth's side.

**What any isolated system can take from this.** A ship at sea, a research
station in Antarctica, a factory network cut off by policy and a data center
whose CA is in another company all have a Mars problem of their own, only
shorter. Ask of each operation in this chapter: does it need someone outside,
and what happens if they are unreachable for the longest outage you can
imagine?

## 18.12 The engineer's checklist

*Level: beginner.*

The book ends with one table. Each line is a habit that a previous chapter
taught in full; the link goes to the chapter, where the reasons, the
failures and the code are. Use it as a review list for a design, a code
review or an audit, and read the chapter behind any line you cannot defend.

| # | Do this | Chapter |
|---|---|---|
| 1 | Use a misuse-resistant library and an AEAD; fail closed; version formats instead of negotiating | [1](01-What-Cryptographic-Engineering-Is.md), [9](09-APIs-That-Resist-Misuse.md) |
| 2 | Turn every value into bytes one way only: fixed widths, length prefixes, NFC for text, strict decoders | [2](02-Bytes-Encodings-and-Text.md) |
| 3 | Parse DER and key files strictly: minimal lengths, nothing left over; compare by re-encoding | [3](03-ASN1-DER-and-Key-Files.md) |
| 4 | Take every key, nonce and token from the operating system's generator, never `random`, never a fallback | [4](04-Randomness-in-Practice.md) |
| 5 | Keep branches, addresses and variable-time instructions independent of secrets; compare with `compare_digest` | [5](05-Constant-Time-Programming.md) |
| 6 | Validate every received point; use ladders, complete formulas, blinding and verify-before-release | [6](06-Big-Numbers-and-Public-Key-Code.md) |
| 7 | On devices an attacker can touch, mask, check for faults, and test the binary for leakage | [7](07-Masking-and-Fault-Resistance.md) |
| 8 | Check every length against the bytes received; fuzz under a sanitizer; bound decompression; key your hash tables | [8](08-Hostile-Input.md) |
| 9 | One error path for every failure; no secrets in errors, logs or crash dumps | [9](09-APIs-That-Resist-Misuse.md), [18.2](#182-logging-without-leaking) |
| 10 | Give every key an ID, owner, purpose and cryptoperiod in an inventory; one key per purpose, derived with labels | [10](10-The-Life-of-a-Key.md) |
| 11 | Put key versions in every ciphertext and signature; rotate routinely; plan compromise recovery before it happens | [10](10-The-Life-of-a-Key.md) |
| 12 | Keep roots and signing keys non-exportable in HSMs or a KMS; run ceremonies with quorums | [11](11-Hardware-for-Keys.md) |
| 13 | Keep secrets out of code, CI, images and environment dumps; prefer short-lived credentials; scan and block pushes | [12](12-Secrets-in-Operations.md) |
| 14 | Automate certificates and alert on expiry; serve TLS 1.2 and 1.3 only, with HSTS | [12](12-Secrets-in-Operations.md) |
| 15 | Hash passwords with Argon2id at measured cost; pepper in a KMS; check breach lists; no composition rules | [13](13-Passwords-on-the-Server.md) |
| 16 | Encrypt application data with envelope keys and AAD that names the row; know what deterministic and searchable schemes leak | [14](14-Encrypting-Application-Data.md) |
| 17 | Know what each command-line tool does underneath; never protect real data with `openssl enc` and a password | [15](15-The-Command-Line-Tools.md) |
| 18 | Verify signatures, not just checksums; sign releases; use transparency logs and update frameworks | [16](16-Signing-Software-and-the-Supply-Chain.md) |
| 19 | Choose maintained, tested libraries; run known-answer tests and Wycheproof in CI; read the audits | [17](17-Choosing-Testing-and-Verifying.md) |
| 20 | Keep a cryptographic inventory, and make algorithms configuration, not code | [17](17-Choosing-Testing-and-Verifying.md), [18.9](#189-crypto-agility-in-deployment) |
| 21 | Log key IDs, versions, outcomes and callers through an allowlist; alert on failure rates | [18.2](#182-logging-without-leaking) |
| 22 | Publish CAA records and monitor CT for every name you own | [18.3](#183-watching-certificate-transparency-for-your-names) |
| 23 | Keep a calendar of deprecation dates; stop writing before you stop reading | [18.4](#184-how-algorithms-die) |
| 24 | Measure negotiated versions and suites by client before removing anything; use brownouts | [18.5](#185-measuring-what-you-still-use) |
| 25 | For a mass key problem: patch, new key, deploy, revoke, rotate neighbors, verify | [18.6](#186-when-keys-leak-by-the-thousand-debian-and-heartbleed) |
| 26 | Be able to replace every certificate within days; keep a second CA ready | [18.7](#187-when-the-authority-is-the-problem-lets-encrypt-2020-and-entrust-2024) |
| 27 | Write and rehearse a numbered playbook for each kind of cryptographic incident | [18.8](#188-a-written-incident-playbook) |
| 28 | Change algorithms in stages behind produce and accept flags, with tested rollback | [18.9](#189-crypto-agility-in-deployment) |
| 29 | Script ceremonies; keep two people able to do every rare task; route alerts to a rotation | [18.10](#1810-people-and-process) |
| 30 | Make lifetimes, revocation and quorums outlast the longest time you can be cut off | [10](10-The-Life-of-a-Key.md), [18.11](#1811-mars-a-settlements-crypto-operations-plan) |
| 31 | Plan the post-quantum migration now, from the inventory up | [Post-quantum 18](../post-quantum/18-Hybrids-and-the-Migration.md) |

*Table 18.1. The engineer's checklist. Each line is taught in the chapter it
links to.*

## 18.13 Going deeper

*Level: expert.*

**Transparency beyond certificates.** CT's idea, a public append-only log that
makes misbehavior visible, has spread: Sigstore's Rekor for software
signatures (chapter 16), key transparency for messaging apps (WhatsApp
announced its deployment in 2023), and binary transparency for firmware and
app stores. The open problems are the same for all of them: detecting a log
that shows different histories to different people (split views), which
needs monitors to compare signed tree heads, and keeping logs cheap enough
that several independent ones exist. The CT ecosystem moved in 2024 and 2025
toward "static" logs served as plain tiles of the Merkle tree, which are much
cheaper to run; following that change is a good way into the details.

**Revocation.** Protocols chapter 2 tells how online revocation failed and
browser-pushed lists replaced it. The research behind that change is worth
reading as an operations lesson: Liu and colleagues' 2015 measurement, the
CRLite design of Larisch and colleagues (2017), and the shift to short
lifetimes that the CA/Browser Forum adopted in 2025 (chapter 12). Ask, for
any revocation mechanism you design, who is told, how fast, and what happens
when the message does not arrive.

**Agility as a design question.** Adam Langley's argument that agility is
costly (every option is attack surface and test burden) and the protocols
that answered it with a few fixed versions (WireGuard, the Noise framework,
age) are one side; the post-quantum migration, which needs agility
everywhere, is the other. NIST's white paper on crypto agility (CSWP 39,
final December 2025) and the IETF's guidance on algorithm identifiers try to reconcile
them. A useful exercise is to take one of your own formats and write down
exactly what would change, in code and in stored data, if its signature
algorithm had to be replaced next year.

**Measurement.** Most of the numbers in this chapter come from measurement
papers at IMC, USENIX Security and similar venues: who still uses what, who
reissued, who revoked. Running such a measurement on your own estate, with
the tally of §18.5 grown into a dashboard, is the most useful research an
operations team can do.

## Check yourself

??? question "1. A colleague wants to log the SHA-256 hash of each API token \"so we can tell tokens apart without logging them\". Is that safe? What would you log instead?"

    For a long random token, an unkeyed hash cannot be reversed, but it is
    still a stable identifier that lets anyone holding a token confirm it
    against the logs, and for short or structured secrets it can be searched.
    Log the token's ID (issue tokens with a public ID part), or a keyed hash
    with a key the log readers do not hold. Never log the token itself.

??? question "2. Why should a cryptographic event log accept fields from an allowlist instead of filtering secrets out with a blocklist?"

    A blocklist removes only the shapes someone thought of; a new field
    holding a key, a token in an unexpected format, or a whole request object
    passes through. An allowlist fails loudly in testing when someone adds a
    field, so every new field is reviewed before it reaches a log.

??? question "3. Your CT monitor matches certificates whose common name ends with your domain. Give two ways it can miss or misreport a certificate."

    It misses certificates where your name appears only in the Subject
    Alternative Names (browsers ignore the common name when SANs exist), or
    in a different case or with a trailing dot. It misreports others' domains
    such as `notexample.com` as yours, because a plain suffix match ignores
    label boundaries.

??? question "4. Why do CAA records and a CT monitor complement each other rather than duplicate each other?"

    CAA is preventive: it asks CAs not to issue, and works only if the CA
    checks correctly. The monitor is detective: it sees what was actually
    issued, including by a CA that ignored or misread CAA (as Let's Encrypt's
    2020 bug did). Using the same list of CAs in both keeps them consistent.

??? question "5. Your telemetry shows TLS 1.0 at 0.08 percent of connections. What do you do before switching it off?"

    Find out who those connections are: count distinct clients, see when they
    connect, and weigh what breaks for each. Measure over a full business
    cycle (weekends, month-end), contact each identified client, and run
    announced brownouts for those you cannot identify. Switch off when the
    remaining clients are known and accepted.

??? question "6. During Heartbleed some operators reissued their certificates before patching, and some reissued with the same key. Why did neither help?"

    A new key on an unpatched server could be read out of memory again, so
    patching had to come first. A new certificate for the same key leaves the
    stolen key valid; the attacker can still use it with the old certificate
    until that is revoked or expires. The fix needs a patched server, a new
    key, a certificate for it, and revocation of the old one.

??? question "7. Why could the Debian weak-key problem be handled with blocklists, while ROCA needed a test instead?"

    The broken Debian generator could produce only 32,767 keys per type, size
    and architecture, so every possible weak key could be generated and its
    fingerprint published. ROCA's weak keys came from a structured but huge
    family of primes, too many to list, but with a property that a quick
    mathematical test could detect.

??? question "8. Let's Encrypt did not revoke about 1.3 million affected certificates by the deadline in March 2020. What does this say about the operator's side of certificate management?"

    A CA's revocation is only safe if subscribers can replace certificates
    within days. Those who renewed automatically were unaffected; those with
    manual or rigid renewal would have had outages. Automate renewal, support
    ARI, and keep a second CA ready, so that a mass revocation is invisible.

??? question "9. In a dual-running algorithm change, why must every reader accept the new algorithm before any writer produces it, and when is rollback no longer safe?"

    A writer that produces the new format before all readers accept it breaks
    those readers. Rolling a writer back to the old format is safe while
    readers still accept the old one; once the old algorithm is removed from
    the accept set (stage 4), or data exists only in the new format, going
    back would leave data or peers unreadable.

??? question "10. A Mars settlement uses Earth-issued 47-day certificates. The blackout is 14 days, with a 10-day guard on each side. What is the latest day before the window starts on which it can renew, and why does revocation of Earth certificates still worry the plan?"

    The certificate must cover $10 + 14 + 10 = 34$ days from the start of the
    guarded window, so it needs at least 34 days left when the window opens:
    renew no more than $47 - 34 = 13$ days before the window starts. During
    the blackout, Earth revocation news cannot arrive, so a certificate
    revoked on Earth stays trusted on Mars; that is why Earth-signed traffic
    is held after contact until revocation state has been exchanged.

## What you learned

- Log names, never values: key IDs and versions, algorithm, operation,
  outcome, caller, request ID and time, through a function that accepts only
  listed fields; count failures and alert on rates; ship logs off the host.
- CT makes every public certificate visible; a monitor that reads every SAN,
  matches labels, and checks issuers against the same list as your CAA
  records turns that visibility into alerts.
- Algorithms die in stages over six to fifteen years, with longer tails:
  MD5 from 1996 to Blast-RADIUS in 2024, SHA-1 from 2005 to the 2017 browser
  cutoff and NIST's 2030 end date, 3DES withdrawn in 2024, RSA-1024 after
  2013, TLS 1.0 and 1.1 by RFC 8996 in 2021.
- Deadlines set by those with leverage, and warnings before them, move
  deployments; advice alone does not.
- Measure what is negotiated, by client, across a business cycle, before
  removing anything; percentages of connections hide the clients that break.
- Mass key replacement has an order: patch, new key, deploy, revoke, rotate
  neighbors, verify. After Heartbleed most sites never finished it, and
  revocation proved too slow to scale; short lifetimes replaced it.
- A CA's mistakes become your incident: be able to replace every certificate
  within days, automate renewal with ARI, and keep a second CA ready.
- Write a numbered playbook per kind of incident, with owners and time
  limits, keep it as a checklist that produces a status, and rehearse it.
- Change algorithms behind produce and accept flags, dual-run, move readers
  before writers, and keep rollback possible until telemetry says otherwise.
- People are part of the system: scripted ceremonies, current custodians,
  documented reasons, two people for every rare task, alerts to a rotation.
- An isolated system must keep its roots, revocation, incident response and
  quorums local, and make every outside dependency outlast its longest
  outage.

**This is the last chapter.** The checklist in §18.12 is the whole book on
one page; the [Glossary](Glossary.md) collects its terms, and the
[book's index](index.md) shows the parts and how they fit together.

## Further reading

- Wang Xiaoyun, Yin Yiqun Lisa and Yu Hongbo, "Finding Collisions in the Full
  SHA-1" (CRYPTO 2005); Marc Stevens, Elie Bursztein, Pierre Karpman, Ange
  Albertini and Yarik Markov, "The First Collision for Full SHA-1" (CRYPTO
  2017; SHAttered, announced 23 February 2017); Gaëtan Leurent and Thomas
  Peyrin, "SHA-1 is a Shambles" (USENIX Security 2020).
- Mozilla Security Blog, "The end of SHA-1 on the Public Web" (23 February
  2017); NIST, "NIST Transitioning Away from SHA-1 for All Applications"
  (15 December 2022).
- Marc Stevens, Alexander Sotirov, Jacob Appelbaum, Arjen Lenstra, David
  Molnar, Dag Arne Osvik and Benne de Weger, "Short Chosen-Prefix Collisions
  for MD5 and the Creation of a Rogue CA Certificate" (CRYPTO 2009; shown
  December 2008); RFC 6151, *Updated Security Considerations for the MD5
  Message-Digest and the HMAC-MD5 Algorithms* (2011); RFC 9155, *Deprecating
  MD5 and SHA-1 Signature Hashes in TLS 1.2 and DTLS 1.2* (2021).
- Sharon Goldberg, Miro Haller, Nadia Heninger, Mike Milano, Dan Shumow, Marc
  Stevens and Adam Suhl, "RADIUS/UDP Considered Harmful" (USENIX Security
  2024; Blast-RADIUS, CVE-2024-3596).
- Karthikeyan Bhargavan and Gaëtan Leurent, "On the Practical (In-)Security of
  64-bit Block Ciphers" (ACM CCS 2016; Sweet32); NIST SP 800-67 Rev. 2 (2017,
  withdrawn 1 January 2024); NIST SP 800-131A Rev. 2, *Transitioning the Use
  of Cryptographic Algorithms and Key Lengths* (2019).
- Kathleen Moriarty and Stephen Farrell, RFC 8996, *Deprecating TLS 1.0 and
  TLS 1.1* (March 2021).
- Debian Security Advisory DSA-1571-1, "openssl -- predictable random number
  generator" (13 May 2008, CVE-2008-0166); Scott Yilek, Eric Rescorla, Hovav
  Shacham, Brandon Enright and Stefan Savage, "When Private Keys are Public:
  Results from the 2008 Debian OpenSSL Vulnerability" (IMC 2009).
- Liang Zhang, David Choffnes, Tudor Dumitraș, Dave Levin, Alan Mislove,
  Aaron Schulman and Christo Wilson, "Analysis of SSL Certificate Reissues and
  Revocations in the Wake of Heartbleed" (IMC 2014).
- Yabing Liu, Will Tome, Liang Zhang, David Choffnes, Dave Levin, Bruce Maggs,
  Alan Mislove, Aaron Schulman and Christo Wilson, "An End-to-End Measurement
  of Certificate Revocation in the Web's PKI" (IMC 2015).
- CloudFlare blog, "The Hard Costs of Heartbleed" (April 2014), on the
  GlobalSign CRL and its bandwidth.
- Let's Encrypt, "2020.02.29 CAA Rechecking Bug" (community incident report,
  29 February to March 2020), and Mozilla's Bugzilla entries for the bug and
  the incomplete revocation; RFC 8659, *DNS Certification Authority
  Authorization (CAA) Resource Record* (2019).
- Google Security Blog, "Sustaining Digital Certificate Security: Entrust
  Certificate Distrust" (27 June 2024).
- GitHub blog, "We updated our RSA SSH host key" (24 March 2023).
- ICANN, root KSK rollover reports (2017 postponement and 11 October 2018
  rollover); RFC 8145, *Signaling Trust Anchor Knowledge in DNS Security
  Extensions (DNSSEC)* (2017).
- Ben Laurie, Adam Langley and Emilia Kasper, RFC 6962, *Certificate
  Transparency* (2013); crt.sh (Sectigo) and SSLMate Cert Spotter
  documentation.
- NIST SP 800-61 Rev. 3, *Incident Response Recommendations and
  Considerations for Cybersecurity Risk Management* (2025); NIST SP 800-57
  Part 1 Rev. 5 (2020) on key management and compromise recovery.
- Adam Langley, "Cryptographic Agility" (imperialviolet.org, 2016); NIST CSWP
  39, *Considerations for Achieving Crypto Agility: Strategies and Practices*
  (December 2025).
- AWS documentation, "Logging AWS KMS API calls with AWS CloudTrail" and
  "Encryption context" (the warning that context is logged in plain text).
