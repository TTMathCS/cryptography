# 8. Hostile Input: Memory, Parsing and Denial of Service

*Every byte that arrives from outside your program was chosen by someone who
may want it to fail. This chapter is about the code that reads those bytes:
the length field that is believed, the end-of-buffer check that is one
character wrong, the key that stays in memory after it is freed, the hash
table that turns into a list, and the small file that expands to fill a disk.
You will build a toy Heartbleed and fix it, model Cloudbleed's pointer check,
wipe a key as well as Python allows and see where that stops, write a
twenty-line fuzzer that finds the toy bug by itself, and add the limits that
keep a parser from being turned into a denial of service.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Heartbleed (2014) worked, byte by byte, and why one comparison fixed it;
    - how Cloudbleed (2017) leaked memory through a parser's end-of-buffer check;
    - why wiping a secret is harder than calling `memset`, and what
      `explicit_bzero`, `memset_s`, `SecureZeroMemory` and `OPENSSL_cleanse` are for;
    - what Python can and cannot do about secrets in memory;
    - how to keep keys out of swap and core dumps (`mlock`, `MADV_DONTDUMP`);
    - what memory-safe languages fix, and the three things they leave to you;
    - where fuzzing came from (1988), how AFL, libFuzzer and OSS-Fuzz work, and
      what AddressSanitizer adds;
    - why hash tables need keyed hashes (hash flooding, 2011, and SipHash);
    - how to read compressed and nested input with limits on size, ratio and work.

    **You need:** [Chapter 3](03-ASN1-DER-and-Key-Files.md) (tag, length,
    value and the parser bugs of ASN.1; this chapter does not repeat them) and
    [Chapter 1](01-What-Cryptographic-Engineering-Is.md) (the layers where
    cryptography fails). The protocol side of Heartbleed is in
    [Protocols, Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md).
    You should be able to read short Python and a few lines of C.

    **Levels:** §8.1 to §8.3 are for beginners, §8.4 to §8.11 are
    intermediate, §8.12 is expert.

## 8.1 The problem

*Level: beginner.*

On the morning of 7 April 2014 the OpenSSL project published a short
advisory. It said that a missing bounds check in the handling of the TLS
heartbeat extension could be used to reveal up to 64 KB of memory to a
connected client or server. It gave a version range, 1.0.1 to 1.0.1f, and a
fixed version, 1.0.1g. The same day a Finnish security company put up a web
site with a name and a red, bleeding heart for a logo: Heartbleed.

Within a day, administrators learned what "reveal up to 64 KB of memory"
meant. Anyone could connect to an affected server, send one small malformed
message, and get back a chunk of the server's working memory. They could do
it again, and again, and each time get a different chunk. Nothing was
logged. In those chunks were other users' session cookies and passwords,
pieces of requests in flight, and, as people proved within the week, the
server's TLS private key.

None of the cryptography was wrong. AES, RSA and SHA-256 did exactly what
they were supposed to. The bug was a few lines of ordinary C that read a
length from the network and believed it.

That is the subject of this chapter. A cryptographic library spends most of
its code not on mathematics but on reading things: records, handshakes,
certificates, key files, compressed data, user names. Every one of those
readers sits on the boundary between your program and someone who may be
hostile. They can hurt you in three ways:

- **Memory.** In C and C++, a reader that trusts a length or misjudges the
  end of a buffer can read or write memory it does not own. Reading leaks
  secrets (Heartbleed, Cloudbleed). Writing can let an attacker run code.
  Even code that never reads out of bounds can leave secrets lying in memory
  long after it is done with them.
- **Logic.** A reader can accept something it should have refused: two
  encodings of one value, a signature with junk after it, a certificate name
  with a zero byte in it. [Chapter 3](03-ASN1-DER-and-Key-Files.md) covers
  these for ASN.1 and DER.
- **Resources.** A reader can be asked to do far more work than the input
  seems to justify: a hash table where every key collides, a few kilobytes
  that decompress to gigabytes, a key so large that one check takes minutes.
  That is a denial of service, and in a shared service it is an outage for
  everyone.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Three ways hostile input hurts a program: memory, logic and resources, each with examples" fill="currentColor" font-size="14">
<rect x="20" y="20" width="600" height="44" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="47" text-anchor="middle" font-weight="bold">bytes from outside: records, certificates, files, form fields</text>
<line x1="120" y1="64" x2="120" y2="100" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="64" x2="320" y2="100" stroke="currentColor" stroke-width="1.4"/>
<line x1="520" y1="64" x2="520" y2="100" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="100" width="190" height="130" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="225" y="100" width="190" height="130" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="430" y="100" width="190" height="130" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="126" text-anchor="middle" font-weight="bold">memory</text>
<text x="115" y="150" text-anchor="middle" font-size="12">read past the end</text>
<text x="115" y="168" text-anchor="middle" font-size="12">write past the end</text>
<text x="115" y="186" text-anchor="middle" font-size="12">secrets left behind</text>
<text x="115" y="214" text-anchor="middle" font-size="12" opacity="0.7">§8.2 to §8.8</text>
<text x="320" y="126" text-anchor="middle" font-weight="bold">logic</text>
<text x="320" y="150" text-anchor="middle" font-size="12">two encodings accepted</text>
<text x="320" y="168" text-anchor="middle" font-size="12">trailing junk ignored</text>
<text x="320" y="186" text-anchor="middle" font-size="12">wrong error path</text>
<text x="320" y="214" text-anchor="middle" font-size="12" opacity="0.7">Chapter 3, §8.8</text>
<text x="525" y="126" text-anchor="middle" font-weight="bold">resources</text>
<text x="525" y="150" text-anchor="middle" font-size="12">colliding hash keys</text>
<text x="525" y="168" text-anchor="middle" font-size="12">decompression bombs</text>
<text x="525" y="186" text-anchor="middle" font-size="12">huge keys and parameters</text>
<text x="525" y="214" text-anchor="middle" font-size="12" opacity="0.7">§8.10, §8.11</text>
</svg>
<figcaption>Figure 8.1. Three ways hostile input hurts. Memory bugs are mostly a property of C and C++; logic and resource bugs survive in every language.</figcaption>
</figure>

The defenses are not exotic. Check every length against what you actually
received. Treat the end of a buffer as a wall you can never pass, not a
point you hope to land on. Wipe secrets when you are done with them, with a
function the compiler is not allowed to remove, and keep them out of places
they can be copied to. Prefer languages that check bounds for you, and know
what they do not check. Throw random and mutated input at every parser until
it stops breaking. Use keyed hashes for tables that take untrusted keys.
Put a limit on everything: size, ratio, depth, count and time.

## 8.2 Heartbleed, told fully

*Level: beginner.*

TLS runs over TCP, which tells you nothing when a connection goes quiet. DTLS,
the version of TLS that runs over UDP, has it worse: there is no connection
at all, and an application cannot tell whether its peer is still there
without sending something. In 2011 Robin Seggelmann, then a PhD student at
the Münster University of Applied Sciences, with Michael Tüxen and Michael
Williams, proposed a small fix: a **heartbeat** extension. One side sends a
HeartbeatRequest containing some bytes; the other side sends them back in a
HeartbeatResponse. The echo proves the peer is alive and, for DTLS, can be
used to find the largest packet the path will carry. It became RFC 6520 in
February 2012.

The message is simple. Inside a TLS record of content type 24 (heartbeat),
it is:

| Field | Size | Meaning |
| --- | --- | --- |
| `type` | 1 byte | 1 = request, 2 = response |
| `payload_length` | 2 bytes | how many payload bytes follow |
| `payload` | `payload_length` bytes | anything; echoed back |
| `padding` | at least 16 bytes | random, ignored |

The record that carries the message has its own length, in the record
header, and the TLS layer has already read exactly that many bytes into a
buffer. So the server holds two lengths for one message: the record length,
which the network delivered, and `payload_length`, which the sender wrote.
RFC 6520 says what to do when they disagree: "If the payload_length of a
received HeartbeatMessage is too large, the received HeartbeatMessage MUST be
discarded silently."

Seggelmann wrote the implementation for OpenSSL as well. Stephen Henson, a
core developer, reviewed it and committed it on 31 December 2011, and it
shipped, on by default, in OpenSSL 1.0.1 on 14 March 2012. The heart of the
response code in `tls1_process_heartbeat` was this (lightly trimmed):

```c
/* Read type and payload length first */
hbtype = *p++;
n2s(p, payload);          /* payload = the 2-byte length, as sent */
pl = p;
...
if (hbtype == TLS1_HB_REQUEST) {
    buffer = OPENSSL_malloc(1 + 2 + payload + padding);
    bp = buffer;
    *bp++ = TLS1_HB_RESPONSE;
    s2n(payload, bp);
    memcpy(bp, pl, payload);   /* copy 'payload' bytes, however many arrived */
    ...
}
```

`memcpy(bp, pl, payload)` copies `payload` bytes starting at the payload.
Nothing compared `payload` with the record length. If the request said
`payload_length = 65535` and carried one byte, `memcpy` copied that one byte
and then 65,534 more from whatever followed the record in the server's
heap, and the server sent them all back, encrypted, to the person who asked.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A heartbeat request claiming 65535 bytes but carrying one byte; the server copies the one byte and the memory after the record" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">The request as it arrived (record length 20 bytes)</text>
<rect x="20" y="36" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="40" y="58" text-anchor="middle" font-size="12">01</text>
<rect x="60" y="36" width="80" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="100" y="58" text-anchor="middle" font-size="12">ff ff</text>
<rect x="140" y="36" width="40" height="34" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="160" y="58" text-anchor="middle" font-size="12">41</text>
<rect x="180" y="36" width="140" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="58" text-anchor="middle" font-size="12">16 bytes padding</text>
<rect x="320" y="36" width="300" height="34" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-dasharray="5 3"/>
<text x="470" y="58" text-anchor="middle" font-size="12">heap: other users' data, keys ...</text>
<text x="40" y="88" text-anchor="middle" font-size="11">type</text>
<text x="100" y="88" text-anchor="middle" font-size="11">claims 65535</text>
<text x="160" y="88" text-anchor="middle" font-size="11">1 byte</text>
<line x1="20" y1="110" x2="320" y2="110" stroke="currentColor" stroke-width="1.4"/>
<text x="170" y="128" text-anchor="middle" font-size="12">what the network delivered</text>
<line x1="140" y1="150" x2="620" y2="150" stroke="currentColor" stroke-width="2.2"/>
<text x="380" y="170" text-anchor="middle" font-size="12">what memcpy(bp, pl, payload) copied: 65535 bytes from the payload on</text>
<text x="20" y="210" font-weight="bold">The fix (OpenSSL 1.0.1g):</text>
<text x="20" y="234" font-family="monospace" font-size="13">if (1 + 2 + payload + 16 &gt; s-&gt;s3-&gt;rrec.length) return 0;  /* discard */</text>
</svg>
<figcaption>Figure 8.2. Two lengths for one message. The record length is what arrived; payload_length is what the sender claimed. The vulnerable code used the claim; the fix compares it with the record and silently drops a message that does not fit.</figcaption>
</figure>

The fix in 1.0.1g was two checks before the copy:

```c
if (1 + 2 + 16 > s->s3->rrec.length)
    return 0;   /* silently discard: too short for even an empty payload */
hbtype = *p++;
n2s(p, payload);
if (1 + 2 + payload + 16 > s->s3->rrec.length)
    return 0;   /* silently discard per RFC 6520 sec. 4 */
```

The first line rejects a record too short to hold a type, a length and the
minimum padding. The second rejects a payload length that, with the type,
the length field and 16 bytes of padding, does not fit in the record that
actually arrived. That is all.

**Who found it, and when.** Two teams found the bug independently in the
spring of 2014. Neel Mehta of Google's security team reported it privately
to the OpenSSL team on 1 April 2014. Engineers at Codenomicon, a Finnish
company that made protocol testing tools, found it while testing their own
products and reported it to the Finnish national computer security team,
NCSC-FI, a few days later; Codenomicon gives 3 April as its date of
discovery. The fixed release and the advisory came out on 7 April, a little
earlier than planned because the people involved feared the news was
spreading. The Codenomicon team registered heartbleed.com, chose the name,
and drew the logo. Some accounts put Mehta's discovery in March, before he
reported it; the 1 April report date is the one the OpenSSL project gives.

**How much of the internet was affected.** Nobody knows exactly, because
nobody scanned for the bug before it was public. The most careful estimate
is Zakir Durumeric and colleagues' "The Matter of Heartbleed" (IMC 2014).
Combining several data sources, they estimated that between 24% and 55% of
HTTPS sites in the Alexa Top 1 Million were vulnerable when the bug was
disclosed, including 44 of the Top 100; the range is wide because it is a
reconstruction, not a measurement. Their own scans began about a day after
disclosure. Two days after disclosure 11% of HTTPS sites in the Top 1 Million
were still vulnerable; patching then slowed, and about 3% were still
vulnerable almost two months later. Fixing the bug was not enough: a server
that had been vulnerable had to assume its private key was gone, revoke the
certificate and get a new one with a new key. Far fewer did that than
patched; the same paper found that only a small fraction of vulnerable sites
replaced their certificates in the following weeks, and some that did reused
the old key. Other surveys at the time gave other numbers (Netcraft's widely
quoted figure was about 17% of all TLS web servers); treat any single
percentage as an estimate.

**What leaked.** At first some people doubted that private keys could come
out, since the key is loaded once at startup and the heartbeat buffer is
allocated much later. CloudFlare set up a deliberately vulnerable server on
11 April 2014 and challenged anyone to get its key. Within about a day two
people independently did so, Fedor Indutny first and Ilkka Mattila soon
after. In practice the most valuable leaks were less exotic: session cookies
and passwords from other users' requests, which needed no cleverness at all.
The Canada Revenue Agency shut down its online filing service during the
peak of tax season after social insurance numbers of about 900 taxpayers were
taken through the bug, and a student was later charged. In August 2014 a large
US hospital group, Community Health Systems, disclosed the theft of records of
about 4.5 million patients; outside investigators attributed the break-in to a
network device vulnerable to Heartbleed, an attribution from a security firm
rather than the company, best read as likely rather than proven.

**Was it used before April 2014?** Durumeric's team looked through traffic
records from two large research networks going back months before disclosure
and found no sign of anyone attacking the bug. That is evidence, not proof:
those networks are a small part of the internet. A Bloomberg report of 11
April 2014, citing unnamed sources, said the US National Security Agency had
known of and used the bug for years; the Office of the Director of National
Intelligence denied it the same day. The claim remains disputed.

!!! note "Life story: Heartbleed (CVE-2014-0160)"
    **Born:** the heartbeat code for RFC 6520, written by Robin Seggelmann,
    committed after review on 31 December 2011, released enabled by default in
    OpenSSL 1.0.1 (14 March 2012); affected 1.0.1 to 1.0.1f and the 1.0.2 beta ·
    **Purpose:** none; a `memcpy` whose length came from the network ·
    **Helped:** the mass revocation and reissue of certificates in 2014; the Linux
    Foundation's Core Infrastructure Initiative (announced 24 April 2014) to fund
    critical open-source projects; the LibreSSL (April 2014) and BoringSSL (June
    2014) forks; fuzzing of TLS libraries as routine; the habit of naming bugs ·
    **Status:** fixed in OpenSSL 1.0.1g on 7 April 2014; servers still answering
    with leaked memory were found in scans for years afterward

**Why the private key could come out at all.** Allocators reuse memory. The
heartbeat buffers sat on the heap next to whatever the server had allocated
and freed recently: other connections' records, decrypted request bodies, and
the temporary numbers RSA uses while it signs. OpenSSL made this worse with a
cache of its own. To be fast on platforms with slow `malloc`, it kept freed
record buffers on a private "freelist" and handed them out again, so the
operating system's protections against reading freed memory never saw them.
The LibreSSL fork removed the freelist in its first days. The lesson recurs in
§8.5: a secret that was "freed" is not gone.

### What the bug teaches

Heartbleed is the clearest example of a rule that applies to every reader
of untrusted input: **when the input carries a length, there are two
lengths, and only one of them is a fact.** The record length is a fact: the
TLS layer read that many bytes. The payload length is a claim. Every read
from the payload must be checked against the fact.

Three things made Heartbleed worse than an ordinary bounds bug:

1. **It was on by default** in every build, for an extension almost nobody
   used. The cheapest code to secure is code you do not ship.
2. **It could be repeated.** Each request leaked a new 64 KB with no crash
   and no log line, so an attacker could keep sampling until something
   valuable came out.
3. **It ran before authentication.** Heartbeats were accepted during the
   handshake, so the attacker needed no account, no session, and nothing but
   a TCP connection.

The protocol view, and the other TLS implementation bugs of the same year,
are in [Protocols, Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md).

## 8.3 Code it: a toy Heartbleed and the fix

*Level: beginner.*

Python checks bounds, so to see the bug we have to give it something to
over-read. The toy below uses a `bytearray` to stand for the server's
memory. The incoming record is copied into it at a fixed place, and a
secret, standing for a private key, sits a little further along, the way
unrelated data sits next to a buffer on a real heap. The server function
reads the record out of that memory, exactly as C code reads through a
pointer.

**Break it.** The vulnerable server trusts `payload_length`:

```python
# A toy server heap: 64 bytes for incoming records, then other data.
MEMORY = bytearray(256)
RECORD_AT = 0
SECRET = b"SECRET:k=7f3a9c41d2e8b0aa5566"
MEMORY[96:96 + len(SECRET)] = SECRET     # someone else's data, nearby

def receive(record):
    """Copy an arriving record into the server's memory, as the TLS layer does."""
    MEMORY[RECORD_AT:RECORD_AT + len(record)] = record
    return len(record)            # the record length: a fact

def heartbeat_broken(record_len):
    p = RECORD_AT
    hbtype = MEMORY[p]
    payload = int.from_bytes(MEMORY[p + 1:p + 3], "big")    # a claim
    if hbtype != 1:
        return b""
    start = p + 3
    return bytes([2]) + payload.to_bytes(2, "big") + bytes(MEMORY[start:start + payload])

def request(payload, claimed=None):
    claimed = len(payload) if claimed is None else claimed
    return bytes([1]) + claimed.to_bytes(2, "big") + payload + bytes(16)

n = receive(request(b"hello"))
print(heartbeat_broken(n)[3:])
n = receive(request(b"A", claimed=140))
leak = heartbeat_broken(n)[3:]
print(len(leak), b"SECRET" in leak)
print(leak[93:123])
```

It prints:

```text
b'hello'
140 True
b'SECRET:k=7f3a9c41d2e8b0aa5566\x00'
```

The honest request comes back as sent. The second request carries one
byte and claims 140; the server returns 140 bytes, and the other data that
happened to live after the record comes with them. A real attacker did not
know where anything was, and did not need to: they asked for 64 KB again
and again and searched what came back.

**Fix it.** Compare the claim with the fact before reading anything, and
drop the message silently if it does not fit, as RFC 6520 requires:

```python
MEMORY = bytearray(256)
RECORD_AT = 0
SECRET = b"SECRET:k=7f3a9c41d2e8b0aa5566"
MEMORY[96:96 + len(SECRET)] = SECRET

def receive(record):
    MEMORY[RECORD_AT:RECORD_AT + len(record)] = record
    return len(record)

def heartbeat_fixed(record_len):
    if 1 + 2 + 16 > record_len:                  # too short to be a heartbeat
        return b""
    p = RECORD_AT
    hbtype = MEMORY[p]
    payload = int.from_bytes(MEMORY[p + 1:p + 3], "big")
    if 1 + 2 + payload + 16 > record_len:        # the claim does not fit the fact
        return b""
    if hbtype != 1:
        return b""
    start = p + 3
    return bytes([2]) + payload.to_bytes(2, "big") + bytes(MEMORY[start:start + payload])

def request(payload, claimed=None):
    claimed = len(payload) if claimed is None else claimed
    return bytes([1]) + claimed.to_bytes(2, "big") + payload + bytes(16)

print(heartbeat_fixed(receive(request(b"hello")))[3:])
print(heartbeat_fixed(receive(request(b"A", claimed=140))))
print(heartbeat_fixed(receive(b"\x01\x00")))
```

It prints:

```text
b'hello'
b''
b''
```

Two details in the fix matter as much as the comparison.

**The order.** The length check comes before the type is acted on and
before any buffer is allocated. Validate first, then use; never use and then
validate.

**The arithmetic.** In C, a check written as `offset + length > buffer_len`
is wrong when `offset + length` wraps around to a small number; the safe form
is `length > buffer_len - offset`, after checking `offset <= buffer_len`.
Python's integers never wrap, which hides this class of bug from Python
programmers and makes it worth stating.

**What to do.**

1. For every length field you read, find the length that is a fact (bytes
   actually received, the size of the enclosing structure) and check the
   claim against it before you read, copy or allocate.
2. Write bounds checks in a form that cannot overflow: subtract from the
   known size rather than add to the offset.
3. On a length mismatch, reject the whole message. Do not truncate and carry
   on, and do not echo anything back.
4. Turn off protocol features you do not use. OpenSSL 1.0.1 could be built
   with `-DOPENSSL_NO_HEARTBEATS`, and the servers that had done so were
   safe; TLS 1.3 has no heartbeat at all.

## 8.4 Cloudbleed: a parser that stepped past the end

*Level: intermediate.*

Three years later the same kind of leak came from a different direction: not
a length that was believed, but an end that was missed.

Cloudflare sits in front of millions of web sites. Requests go to
Cloudflare's servers, which fetch pages from the site's own server and can
rewrite them on the way back: hiding e-mail addresses from scrapers
("Email Obfuscation"), removing marked sections for suspicious visitors
("Server-side Excludes"), and changing `http:` links to `https:` ("Automatic
HTTPS Rewrites"). Rewriting HTML means parsing it, quickly, as a stream of
bytes through a buffer. Cloudflare's older HTML parser was generated by
Ragel, a tool that turns a description of a language as a state machine
into C code. In 2016 Cloudflare began moving these features to a new parser,
cf-html, while keeping the old one for some paths.

On Friday 17 February 2017 Tavis Ormandy of Google's Project Zero noticed
something strange in data his fuzzing work had collected: fragments of
HTTPS requests, cookies, and private messages from web sites he had never
visited, mixed into pages served through Cloudflare. He contacted
Cloudflare that evening (by a message on Twitter, asking for someone in
their security team; Cloudflare's timeline logs it at 00:11 UTC on
18 February). Cloudflare turned off Email Obfuscation within about an hour
of getting the details, and disabled the other two features and fixed the
code worldwide over the following hours. They published an incident report
by John Graham-Cumming, their chief technology officer, on 23 February 2017.

The root cause, in the report's words, was that "reaching the end of a
buffer was checked using the equality operator and a pointer was able to
step past the end of the buffer". Had the check been `>=`, the overrun would
have been caught. The generated C code moved a pointer `p` through the
buffer and tested for the end with a line of the form:

```c
if ( ++p == pe )      /* pe points one past the last byte */
    goto _test_eof;
```

In normal operation `p` advanced one byte at a time and so always landed on
`pe` exactly. But one path in Cloudflare's grammar, taken when a page ended
in the middle of an unfinished HTML attribute, could move `p` one byte past
the end before the test ran. Then `p` was never equal to `pe` again, and the
parser went on reading, and copying into the response, whatever followed the
buffer in memory: pieces of other customers' requests and responses that
had passed through the same server process. The old parser had had the same
flaw for years without harm, because of how it was given its buffers;
switching some features to cf-html changed the buffer layout and made the
latent bug reachable.

The rates were small and the scale was large. Cloudflare's report put the
earliest possible leak at 22 September 2016, when the first feature moved to
the new parser, and the worst period between 13 and 18 February 2017, when
about 1 in every 3,300,000 HTTP requests through Cloudflare could have
leaked memory. The leaked data was in ordinary web pages, so search engines
had cached some of it. Cloudflare worked with Google, Microsoft (Bing),
Yahoo and others to find and remove cached pages before announcing; reports
at the time noted that some remained in caches afterward.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="A pointer moving through a buffer; an equality check against the end is skipped when the pointer jumps over it, while a greater-or-equal check would stop it" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">buffer [start, pe)</text>
<rect x="20" y="40" width="360" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="380" y="40" width="240" height="40" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-dasharray="5 3"/>
<text x="200" y="65" text-anchor="middle" font-size="12">the page being parsed</text>
<text x="500" y="65" text-anchor="middle" font-size="12">other requests' data</text>
<line x1="380" y1="30" x2="380" y2="95" stroke="currentColor" stroke-width="2.4"/>
<text x="380" y="112" text-anchor="middle" font-size="12">pe</text>
<text x="340" y="140" text-anchor="middle" font-size="12">p</text>
<line x1="340" y1="128" x2="340" y2="88" stroke="currentColor" stroke-width="1.4"/>
<path d="M 340 150 C 360 175, 390 175, 410 150" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="410" y="140" text-anchor="middle" font-size="12">p + 2</text>
<text x="20" y="196" font-family="monospace" font-size="13">p == pe   never true again: parsing runs into other data</text>
<text x="20" y="214" font-family="monospace" font-size="13">p &gt;= pe   true at p + 2: the parser stops</text>
</svg>
<figcaption>Figure 8.3. Cloudbleed's end test. A pointer that always moves one byte at a time lands on the end exactly; one path that moved it further jumped over the end, and the equality test never fired.</figcaption>
</figure>

**Break it.** A toy of the same shape: a scanner that copies text out of a
buffer and normally moves one byte at a time, but skips two bytes after a
backslash. The end test is `==`. Here the "memory" is again a `bytearray`,
with another request's data placed right after the page:

```python
MEMORY = bytearray(b"<a title=\"x\\" + b"|cookie=sess-91c2|")
END = 12                          # the page is MEMORY[0:12]; the rest is not ours

def copy_text_broken(start, end):
    out = bytearray()
    p = start
    while True:
        c = MEMORY[p]
        out.append(c)
        p += 2 if c == ord("\\") else 1   # an escape skips the next byte
        if p == end:                       # equality: assumes we land on the end
            break
        if p >= len(MEMORY):               # (only so the toy stops)
            break
    return bytes(out)

print(copy_text_broken(0, END))
```

It prints:

```text
b'<a title="x\\cookie=sess-91c2|'
```

The page ends with a backslash. The scanner copies it, steps two bytes, and
is now one past the end. `p == end` is false for ever after, so it reads on
into the next request's data until it runs off the end of the toy memory.
(In the real parser there was no "end of memory" check at all; it stopped
only when its state machine happened to reach an end state.)

**Fix it.** Two changes, either of which alone would have stopped the leak:
test with `>=`, and never read a byte without checking that it is inside the
buffer:

```python
MEMORY = bytearray(b"<a title=\"x\\" + b"|cookie=sess-91c2|")
END = 12

def copy_text_fixed(start, end):
    out = bytearray()
    p = start
    while p < end:                         # a wall, not a point to land on
        c = MEMORY[p]
        out.append(c)
        if c == ord("\\"):
            if p + 1 >= end:               # an escape with nothing after it
                raise ValueError("truncated escape at end of input")
            p += 2
        else:
            p += 1
    return bytes(out)

try:
    print(copy_text_fixed(0, END))
except ValueError as e:
    print("rejected:", e)
print(copy_text_fixed(0, 11))
```

It prints:

```text
rejected: truncated escape at end of input
b'<a title="x'
```

!!! note "Life story: Cloudbleed"
    **Born:** a latent end-of-buffer bug in Cloudflare's Ragel-generated HTML
    parser, made reachable when features moved to the new cf-html parser from
    22 September 2016 · **Purpose:** none; an `==` where `>=` belonged ·
    **Helped:** reported by Tavis Ormandy (Google Project Zero) on 17 to 18
    February 2017, mitigated within hours, incident report 23 February 2017;
    made "check with `>=`, and fuzz the generated code" a standard lesson, and
    showed that a shared proxy's memory leak is every customer's leak ·
    **Status:** fixed February 2017; Cloudflare later moved its HTML rewriting
    to a parser written in Rust (lol-html)

### What the two bugs share

Heartbleed and Cloudbleed are mirror images. Heartbleed believed a length
from the input; Cloudbleed believed its own pointer arithmetic. Both read past
the end of a buffer, both sent what they read back to a stranger, and both
mixed one user's secrets into another user's response because many users
shared one process. Neither touched any cryptography, and both defeated it:
TLS faithfully encrypted the leaked memory on its way to the attacker.

The general rules:

- **A buffer has a size, and every access is checked against it.** Not "the
  pointer will reach the end", but "the pointer is less than the end".
- **Generated code is still code.** Ragel's output was correct for the
  grammar Cloudflare gave it; the grammar had an error action that moved the
  pointer. Fuzz parsers in the form they are deployed, generated code
  included.
- **Rare paths matter most.** Both bugs lived on paths that honest input
  never takes: a heartbeat with a lying length, a page that ends inside an
  attribute. Testing with real traffic does not reach them; §8.9's fuzzers
  do.
- **Isolation limits the damage.** A process that serves one user cannot
  leak another's data. Many services now isolate tenants by process for
  this reason, at a cost in memory and speed.

## 8.5 Wiping secrets

*Level: intermediate.*

Heartbleed leaked memory that the program was no longer using. The heartbeat
copy reached past the record into buffers that had held other connections'
data and had been freed. Freed memory is not empty memory. `free()` returns
a block to the allocator and changes a few bytes of bookkeeping; the rest
keeps its old contents until something else is written there. A key that a
program decrypted with an hour ago may still be sitting in the heap, waiting
for the next over-read, the next core dump, or the next page that is swapped
to disk.

So careful cryptographic code **wipes** secrets as soon as it is done with
them: keys, key schedules, intermediate values, plaintext buffers,
passwords. FIPS 140-3 makes this a requirement for validated modules, which
must be able to "zeroize" their secret keys and other sensitive parameters.
The obvious way to do it in C is one line before the `free`:

```c
void handle_request(...)
{
    uint8_t key[32];
    derive_key(key, ...);
    decrypt_with(key, ...);
    memset(key, 0, sizeof key);    /* wipe before returning */
}
```

**Break it: the compiler deletes the wipe.** The C standard describes what a
program does in terms of its observable behavior: input, output, and
accesses to `volatile` objects. After the `memset`, nothing in the program
ever reads `key` again; the function returns and the array ceases to exist.
So the store of zeros is a **dead store**, and every optimizing compiler is
allowed to remove it, and does. GCC and Clang at `-O2` routinely compile the
function above with no `memset` at all. The same happens to a wipe before
`free(p)`, because the compiler knows what `free` means. The source code
says the key is wiped; the binary does not wipe it.

This is not a theoretical worry. In "Dead Store Elimination (Still)
Considered Harmful" (USENIX Security 2017), Zhaomo Yang, Brian Johannesmeyer,
Anders Trier Olesen, Sorin Lerner and Kirill Levchenko surveyed how real
projects tried to scrub memory and found the wipes removed or weakened in
widely used software, including cryptographic libraries, and found that some
of the tricks used to keep them were defeated by newer compilers or by
link-time optimization. [Chapter 5](05-Constant-Time-Programming.md) meets
the same adversary from the timing side: an optimizer that is entitled to
remove any work whose result is never used.

**Fix it: a wipe the compiler must keep.** Every platform now has a function
whose whole purpose is to be a store that is not allowed to disappear:

| Function | Where | Notes |
| --- | --- | --- |
| `explicit_bzero(p, n)` | OpenBSD 5.5 (2014), FreeBSD, glibc 2.25 (2017), musl | the common choice on Unix |
| `memset_s(p, smax, c, n)` | C11 Annex K (optional) | the standard's answer, but Annex K is rarely implemented; macOS has it, glibc does not |
| `memset_explicit(p, c, n)` | C23 | the newer standard's answer; support is arriving |
| `SecureZeroMemory(p, n)` | Windows | writes through a `volatile` pointer so the compiler cannot drop it |
| `OPENSSL_cleanse(p, n)` | OpenSSL | calls `memset` through a `volatile` function pointer, so the compiler cannot know what it does |
| `sodium_memzero(p, n)` | libsodium | uses the platform's function where there is one |
| `zeroize` | Rust crate | volatile writes plus a compiler fence; can wipe on drop |

The fixed function:

```c
#include <string.h>        /* explicit_bzero on glibc 2.25+, BSDs */

void handle_request(...)
{
    uint8_t key[32];
    derive_key(key, ...);
    decrypt_with(key, ...);
    explicit_bzero(key, sizeof key);   /* kept: the call is defined to have an effect */
}
```

If none of these is available, the portable fallback is a loop through a
`volatile` pointer, or a call through a `volatile` function pointer to
`memset`, as OpenSSL does. Both work today because compilers do not optimize
`volatile` accesses; neither is as clear as a named function.

!!! note "Life story: explicit_bzero"
    **Born:** OpenBSD 5.5 (May 2014), added by Ted Unangst and others during
    the clean-up that followed Heartbleed · **Purpose:** a `bzero` that the
    compiler may not remove, for wiping keys and passwords · **Helped:**
    adopted by FreeBSD, NetBSD, musl and glibc (2.25, 2017), and used by
    LibreSSL, OpenSSH and libsodium; pushed the C committee toward
    `memset_explicit` in C23 · **Status:** the standard name on Unix systems;
    Windows has `SecureZeroMemory` instead

### What a wipe does not reach

A wipe clears the one buffer you pass it. A secret has usually been copied
to other places by the time you call it, and no wiping function can find
those:

- **Registers and the stack.** Computing with a key moves it into CPU
  registers, and the compiler spills registers to the stack when it runs out
  of them. Those stack slots belong to no variable you can name. Colin
  Percival made the point in 2014 in "Zeroing buffers is insufficient": the
  only reliable way to clear them is code written for it, below the level of
  C.
- **Copies you made.** Passing a key by value, `realloc` to a larger buffer
  (which may copy and free the old one without clearing it), serializing a
  key to send to another function: each makes a copy.
- **Copies the library made.** An AES key schedule, an HMAC object's padded
  key blocks, a big-number library's temporaries. A good library wipes its
  own; a careless one does not.
- **Copies the system made.** Pages swapped to disk, a hibernation file,
  a core dump, a crash report sent to a vendor (§8.7), and the kernel's own
  network and file buffers.

There is also physical memory itself: Halderman and colleagues showed in
"Lest We Remember" (2008) that DRAM keeps much of its contents for seconds
after power is cut, and minutes if chilled, so disk-encryption keys could be
read from a laptop just "turned off". A wipe shortens the window in which any
of these can find the key; it does not close it. That is why keys that matter
most live in hardware that never lets them out
([Chapter 11](11-Hardware-for-Keys.md)).

**What to do.**

1. In C and C++, wipe every buffer that held a secret with `explicit_bzero`,
   `memset_explicit`, `SecureZeroMemory` or your library's function, never
   with plain `memset`, and wipe on every exit path, errors included.
2. Keep secrets in as few buffers as possible, for as short a time as
   possible. Do not copy keys around to be convenient.
3. Avoid `realloc` on buffers that hold secrets; allocate the final size,
   or allocate new, copy, and wipe the old one yourself.
4. Prefer library objects that wipe themselves (libsodium's and OpenSSL's
   key objects do) to raw byte arrays you manage by hand.

## 8.6 What Python cannot do

*Level: intermediate.*

Python programmers often ask how to wipe a key. The honest answer is that
you can do less than in C, and you should know exactly how much less.

**Break it: `bytes` cannot be wiped.** The usual first attempt looks like
this:

```python
import secrets

key = secrets.token_bytes(16)          # bytes: immutable, cannot be wiped
hexkey = key.hex()                     # a second copy, as text
key = bytes(16)                        # "wipe": only rebinds the name
print(len(hexkey), hexkey != "00" * 16)
```

It prints `32 True`. The last assignment does not touch the old key at all.
It makes the name `key` point at a new object full of zeros; the old object
is still in memory until its reference count drops to zero, and even then
CPython's allocator hands the block back to its own pools without clearing
it. And the hex string made on the second line is a separate copy that
nobody even thought about.

Python's design makes this the normal case, not the careless one:

- **`bytes` and `str` are immutable.** No Python code can change their
  contents, by design: they can be shared, interned and used as dictionary
  keys because they never change.
- **Almost everything copies.** Slicing a `bytes` object, decoding it,
  calling `.hex()`, formatting it into a string, concatenating, passing it
  through `base64`: each makes a new object. A key read from a file with
  `f.read()` has already been copied out of the file object's buffer.
- **Freed memory is not cleared.** When an object dies, its memory goes
  back to CPython's small-object allocator or to `malloc`, contents intact.
  The garbage collector decides when cyclic garbage dies, not you.
- **Libraries copy too.** `hmac.new(key, ...)` builds padded copies of the
  key inside OpenSSL; `hashlib` objects hold state you cannot reach; `ssl`
  loads the private key into OpenSSL's memory, which Python does not manage
  at all.

**Fix it, as far as it goes: a `bytearray` you overwrite.** A `bytearray`
is mutable, and you can overwrite its contents in place, through a
`memoryview` or through `ctypes`, which reaches the same bytes by address
the way C code would:

```python
import ctypes, hashlib, hmac

def wipe(buf):
    """Overwrite a bytearray in place: every byte, then check."""
    view = memoryview(buf)
    view[:] = bytes(len(buf))
    view.release()
    return not any(buf)

key = bytearray(b"\x8f" * 32)          # stands for a key read with readinto()
msg = b"pay 100 to bob"
try:
    tag = hmac.new(key, msg, hashlib.sha256).hexdigest()   # HMAC copies the key inside
finally:
    print("wiped:", wipe(key))
print(tag[:16], key[:4])

# ctypes can reach the same buffer by address, as C code would
buf = bytearray(b"another secret")
addr = ctypes.addressof((ctypes.c_char * len(buf)).from_buffer(buf))
ctypes.memset(addr, 0, len(buf))
print(bytes(buf))
```

It prints:

```text
wiped: True
67e9966c293abb06 bytearray(b'\x00\x00\x00\x00')
b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
```

That is a real improvement over `bytes`: the buffer you control is zero,
and the `try`/`finally` makes sure it is zeroed even if the HMAC call
raises. Read a key into a `bytearray` directly (`f.readinto(buf)`,
`sock.recv_into(buf)`) and you avoid the first copy, too.

**Why even this is not a guarantee.** Look again at what the program did.
`hmac.new` received the key and made its own copies inside OpenSSL, which
the wipe never touched. If the `bytearray` had ever grown, Python would have
moved it to a larger block and freed the old one, contents and all. If you
had printed the key, logged it, or converted it to `bytes` even once, those
copies would remain. And the interpreter itself is free to make temporary
copies inside any C function it calls. A wiped `bytearray` means "the copy I
own is gone"; it does not mean "the key is gone from this process".

Do not try to go further by writing into a `bytes` object with `ctypes`. It
can be done, and it breaks the interpreter's assumptions: a `bytes` object
may be shared, interned, or have its hash cached, and changing it can corrupt
unrelated code in ways that are very hard to debug.

The practical conclusion for Python is the same as the one
[Chapter 5](05-Constant-Time-Programming.md) reached for timing: Python is a
good language for orchestrating cryptography and a poor one for holding the
most sensitive secrets. Keep long-term keys out of the Python process where
you can: in an HSM or a cloud KMS, in an agent process (like `ssh-agent`)
that signs on your behalf, or at least inside a C library's key object that
manages and wipes its own memory.

**What to do.**

1. Never assume that rebinding a name or calling `del` removes a secret.
2. When you must hold a secret in Python, hold it in a `bytearray`, read it
   in with `readinto`/`recv_into`, wipe it in a `finally` block, and never
   convert it to `bytes` or `str`.
3. Keep the most valuable keys in a separate process or device, so that a
   bug in the Python process (or a dump of its memory) cannot reveal them.
4. Combine this with §8.7: a secret that is never written to disk and never
   dumped has far fewer places to linger.

## 8.7 Swap, core dumps and crash reports

*Level: intermediate.*

Memory does not stay in memory. Three mechanisms copy a process's memory
to places that last much longer than the process.

**Swap and hibernation.** When physical memory runs short, the kernel
writes pages that have not been used recently to a swap file or partition.
A key in such a page is now on disk, possibly for months, possibly on a disk
that is later sold or sent for repair. Hibernation writes all of memory to
disk at once. Encrypted swap removes most of the risk; macOS and OpenBSD
encrypt swap by default, Linux systems usually encrypt it only as part of
full-disk encryption, and some do not encrypt it at all.

**Core dumps.** When a process crashes, Unix systems can write its entire
memory to a core file for debugging. Every key it held is in that file. Core
files are written to disk, collected by tools, attached to bug reports and
copied to developers' machines. On Linux, `systemd-coredump` and similar
services store them centrally.

**Crash reports.** Operating systems and applications collect crash data
and upload it to the vendor for analysis. A crash report may contain a
partial or full memory dump, which then travels to a different company's
systems and is looked at by people who are not thinking about keys. The
most expensive example on record is Microsoft's: a consumer signing key that,
by Microsoft's September 2023 account, ended up in a crash dump in 2021 and
moved to a less protected debugging environment (in March 2024 Microsoft said
it had found no such crash dump), and was used by the group Microsoft calls
Storm-0558 to forge access tokens in 2023. [Chapter 12](12-Secrets-in-Operations.md) tells that
story in full.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Where copies of a secret end up: registers, stack, heap, library buffers, swap, core dumps and crash reports, with the tool that covers each" fill="currentColor" font-size="14">
<rect x="250" y="20" width="140" height="40" fill="currentColor" opacity="0.25" stroke="currentColor"/>
<text x="320" y="45" text-anchor="middle" font-weight="bold">the key</text>
<line x1="320" y1="60" x2="90" y2="110" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="250" y2="110" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="400" y2="110" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="555" y2="110" stroke="currentColor" stroke-width="1.2"/>
<rect x="20" y="110" width="140" height="52" fill="none" stroke="currentColor"/>
<text x="90" y="132" text-anchor="middle" font-size="12">registers, stack</text>
<text x="90" y="150" text-anchor="middle" font-size="11" opacity="0.7">no tool in C</text>
<rect x="180" y="110" width="140" height="52" fill="none" stroke="currentColor"/>
<text x="250" y="132" text-anchor="middle" font-size="12">your heap buffer</text>
<text x="250" y="150" text-anchor="middle" font-size="11" opacity="0.7">explicit_bzero</text>
<rect x="340" y="110" width="120" height="52" fill="none" stroke="currentColor"/>
<text x="400" y="132" text-anchor="middle" font-size="12">library copies</text>
<text x="400" y="150" text-anchor="middle" font-size="11" opacity="0.7">library frees</text>
<rect x="480" y="110" width="140" height="52" fill="none" stroke="currentColor"/>
<text x="550" y="132" text-anchor="middle" font-size="12">copies you made</text>
<text x="550" y="150" text-anchor="middle" font-size="11" opacity="0.7">avoid them</text>
<line x1="320" y1="162" x2="320" y2="190" stroke="currentColor" stroke-width="1.2"/>
<text x="330" y="182" font-size="11" opacity="0.7">the operating system copies pages</text>
<rect x="20" y="198" width="190" height="52" fill="none" stroke="currentColor"/>
<text x="115" y="220" text-anchor="middle" font-size="12">swap, hibernation</text>
<text x="115" y="238" text-anchor="middle" font-size="11" opacity="0.7">mlock, encrypted swap</text>
<rect x="225" y="198" width="190" height="52" fill="none" stroke="currentColor"/>
<text x="320" y="220" text-anchor="middle" font-size="12">core dumps</text>
<text x="320" y="238" text-anchor="middle" font-size="11" opacity="0.7">MADV_DONTDUMP, RLIMIT_CORE</text>
<rect x="430" y="198" width="190" height="52" fill="none" stroke="currentColor"/>
<text x="525" y="220" text-anchor="middle" font-size="12">crash reports</text>
<text x="525" y="238" text-anchor="middle" font-size="11" opacity="0.7">scrub, restrict, review</text>
</svg>
<figcaption>Figure 8.4. Where a secret's copies end up, and the tool for each. The top row is the program's own memory; the bottom row is where the operating system and the crash machinery put copies that outlive the process.</figcaption>
</figure>

The operating system offers controls for each.

- **`mlock(addr, len)`** asks the kernel to keep a range of pages in RAM, so
  they are never swapped. `mlockall` does it for the whole process. Locked
  memory is limited per user (`RLIMIT_MEMLOCK`, often 64 KB or 8 MB by
  default), because locked pages cannot be reclaimed; lock the few pages
  that hold keys, not everything. On Windows the equivalent is
  `VirtualLock`. Note that `mlock` does not prevent hibernation from writing
  the page to disk.
- **`madvise(addr, len, MADV_DONTDUMP)`** (Linux 3.4, 2012) marks pages to
  be left out of core dumps (FreeBSD has `MADV_NOCORE`), and
  **`MADV_WIPEONFORK`** (Linux 4.14, 2017) makes a forked child see the pages
  as zeros, so it cannot inherit a parent's keys or RNG state
  ([Chapter 4](04-Randomness-in-Practice.md) covers the fork problem).
- **`setrlimit(RLIMIT_CORE, 0)`** stops core files for the process, and
  **`prctl(PR_SET_DUMPABLE, 0)`** on Linux also stops other processes of the
  same user from attaching a debugger or reading its memory through `/proc`;
  OpenSSH's `ssh-agent` does this at startup. **`memfd_secret`** (Linux 5.14,
  2021) creates memory removed from the kernel's own direct map, so that even
  most kernel code cannot read it.

Libraries package these. libsodium's `sodium_malloc` returns memory placed
between guard pages, locked with `mlock`, excluded from dumps, and wiped and
unlocked by `sodium_free`. OpenSSL has a "secure heap" (`CRYPTO_secure_malloc`)
used for private keys when it is turned on.

**Code it.** Python's standard library can reach most of these: `resource`
for the core-dump limit, `mmap` for a private page with `madvise` (Python
3.8 and later), and `ctypes` for `mlock` and `memset`. This sketch keeps a
32-byte key in one locked page that is left out of dumps, and wipes it
before giving the page back:

```python
import ctypes, ctypes.util, mmap, resource, secrets

# 1. No core dumps from this process (soft and hard limit 0).
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
print("core limit:", resource.getrlimit(resource.RLIMIT_CORE))

# 2. One private page for the key, left out of any dump.
page = mmap.mmap(-1, mmap.PAGESIZE, flags=mmap.MAP_PRIVATE | mmap.MAP_ANONYMOUS)
if hasattr(mmap, "MADV_DONTDUMP"):
    page.madvise(mmap.MADV_DONTDUMP)
    print("excluded from core dumps")

# 3. Ask the kernel not to swap it out. This can fail: RLIMIT_MEMLOCK is small.
libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
buf = (ctypes.c_char * mmap.PAGESIZE).from_buffer(page)
addr = ctypes.addressof(buf)
locked = libc.mlock(ctypes.c_void_p(addr), ctypes.c_size_t(mmap.PAGESIZE)) == 0
print("locked in RAM:", locked or "no (errno %d)" % ctypes.get_errno())

# 4. Use it, then wipe it before giving it back.
page[:32] = secrets.token_bytes(32)
ctypes.memset(addr, 0, mmap.PAGESIZE)
print("wiped:", page[:32] == bytes(32))
if locked:
    libc.munlock(ctypes.c_void_p(addr), ctypes.c_size_t(mmap.PAGESIZE))
del buf
page.close()
```

It is written for Linux. One run there printed:

```text
core limit: (0, 0)
excluded from core dumps
locked in RAM: True
wiped: True
```

On another system, or with a small memory-lock limit, the third line can
say `no` with an error number; the program should then carry on, but you
should know it did. Everything in §8.6 still applies: the key was created
as a `bytes` object by `secrets.token_bytes` before it was copied into the
page, and that object is not in the locked page. A production design would
generate the key directly into the page, or better, never let it into the
Python process.

**What to do.**

1. Turn off core dumps for services that hold keys (`RLIMIT_CORE`,
   `PR_SET_DUMPABLE`, or the service manager's setting), or at least mark
   key pages with `MADV_DONTDUMP`.
2. Lock the pages that hold long-term keys with `mlock`, or use a library
   allocator that does (`sodium_malloc`).
3. Encrypt swap, or run without swap on machines that hold important keys,
   and treat hibernation files as copies of memory.
4. Treat crash dumps as secret material: restrict who can read them, scrub
   them where the tooling allows, and never move them to a less protected
   environment without checking for keys first.

## 8.8 Memory-safe languages and what they do not fix

*Level: intermediate.*

Heartbleed and Cloudbleed were possible because C lets a program read any
address it can compute. A language that checks every array access against
the array's length turns those bugs into something else. The numbers on how
much this matters are consistent across large code bases:

- **Microsoft** (Matt Miller, BlueHat IL, February 2019): about 70% of the
  vulnerabilities Microsoft assigned CVEs to each year from 2006 to 2018 were
  memory-safety issues.
- **Chromium** (2020): about 70% of high-severity security bugs were
  memory-safety problems.
- **Android** (Jeff Vander Stoep, Google, December 2022): as new code was
  written in Rust, Kotlin and Java instead of C and C++, memory-safety
  vulnerabilities fell from 76% of Android's vulnerabilities in 2019 to 35%
  in 2022, even though the old C code remained.

The US National Security Agency (November 2022) and CISA (December 2023) have
since urged new code in memory-safe languages. For cryptographic libraries the
2021 study by Blessing, Specter and Weitzner, quoted in
[Chapter 1](01-What-Cryptographic-Engineering-Is.md), found more
memory-safety bugs than cryptographic ones. Rust's `rustls` and Go's
`crypto/tls` are TLS implementations in which a Heartbleed of the C kind
cannot happen in safe code.

**What changes.** In Rust, `&record[3..3 + len]` with `len` too large does
not read past the record. It **panics**: the thread stops with an error. In
Go, the same slice expression panics with "slice bounds out of range". The
over-read becomes a crash. That is a large improvement: a crash leaks
nothing, is noisy, and shows up in logs and tests.

**What does not change.** Three classes of bug survive any bounds checker.

1. **Logic.** A memory-safe parser can still accept an encoding it should
   reject, skip a check, or return "success" on an error path. BERserk, the
   null-prefix certificates and Bleichenbacher's 2006 forgery
   ([Chapter 3](03-ASN1-DER-and-Key-Files.md)) were all logic bugs and could
   have been written in any language. So could Apple's `goto fail`. Python
   shows a quiet version of this: slicing past the end of a `bytes` object
   does not raise at all; it returns fewer bytes.

2. **Timing.** A memory-safe language checks addresses, not how long code
   takes. Rust and Go programs need exactly the constant-time techniques of
   [Chapter 5](05-Constant-Time-Programming.md), and their compilers are the
   same kind of adversary.

3. **Denial of service.** A panic is safe for memory but is still a crash.
   If one malformed message makes a server process panic, an attacker can
   send it once a second and keep the server down. Go's `crypto/elliptic`
   had such a panic for oversized scalars, fixed in April 2022
   (CVE-2022-28327). And memory safety says nothing about work: Go's
   `crypto/tls` accepted certificates with very large RSA keys whose
   verification took a long time, until Go 1.21 and the August 2023 security
   releases capped them at 8,192 bits (CVE-2023-29409). §8.10 and §8.11 deal
   with that class.

There are also two ways out of the safety: Rust's `unsafe` blocks and every
call into C through a foreign-function interface are places where the compiler
stops checking, and much of the fast cryptography in Rust and Go is assembly
or C underneath.

**Code it: the toy heartbeat in a memory-safe style.** Here is the toy
heartbeat written against the record itself, the way a Python, Rust or Go
programmer would naturally write it, with no shared "memory" to over-read:

```python
def heartbeat_safe_but_wrong(record):
    payload = int.from_bytes(record[1:3], "big")
    data = record[3:3 + payload]          # Python: silently shorter if too long
    return bytes([2]) + payload.to_bytes(2, "big") + data

def heartbeat_strict(record):
    if len(record) < 1 + 2 + 16:
        raise ValueError("record too short")
    payload = int.from_bytes(record[1:3], "big")
    if 1 + 2 + payload + 16 > len(record):
        raise ValueError("payload length does not fit the record")
    return bytes([2]) + payload.to_bytes(2, "big") + record[3:3 + payload]

evil = bytes([1]) + (140).to_bytes(2, "big") + b"A" + bytes(16)
reply = heartbeat_safe_but_wrong(evil)
print(len(reply), int.from_bytes(reply[1:3], "big"), len(reply) - 3)
try:
    heartbeat_strict(evil)
except ValueError as e:
    print("rejected:", e)
```

It prints:

```text
20 140 17
rejected: payload length does not fit the record
```

The first version leaks nothing; the bounds check that Python does on
every slice saw to that. It is still wrong. It echoes the padding as if it
were payload and sends a response whose length field says 140 while 17
bytes follow, which the other side may misread in turn. In Rust or Go the
same code would panic instead, and an unhandled panic is a crash the
attacker can trigger at will. The strict version is what RFC 6520 asks for,
in any language: check the claim against the fact, and refuse.

**What to do.**

1. Write new parsers and protocol code in a memory-safe language where you
   can; in a C code base, start with the code that reads untrusted input.
2. Keep `unsafe` and FFI boundaries small, reviewed and fuzzed.
3. Treat a panic reachable from input as a vulnerability (a denial of
   service), and catch and handle errors at the boundary rather than letting
   them crash the process.
4. Do not stop at memory safety: the parser still needs strict validation
   (Chapter 3), constant-time code where secrets are involved (Chapter 5),
   and limits on work (§8.10, §8.11).

## 8.9 Finding the bugs: fuzzing and sanitizers

*Level: intermediate.*

Heartbleed and Cloudbleed both lived on paths that honest input never takes.
No normal client sends a heartbeat whose length lies, and no normal page
ends inside an attribute. Testing with hand-written cases and real traffic
will not reach them, because you only write tests for the cases you thought
of, and the attacker's whole job is to think of the ones you did not. The
tool that reaches them is **fuzzing**: throw random and mangled input at the
program, by the million, and watch for it to misbehave.

**Where it came from.** In the autumn of 1988, Barton Miller was logging in
to a Unix machine over a dial-up line during a thunderstorm. The line noise
put random characters into his commands, and programs that should have
shrugged them off crashed instead. He turned the accident into a class
project at the University of Wisconsin and then a study. The 1990 paper by
Miller, Lars Fredriksen and Bryan So, "An Empirical Study of the Reliability
of UNIX Utilities", fed streams of random bytes to about 90 standard Unix
programs across seven versions and crashed or hung a quarter to a third of
them, 25% to 33% depending on the system. They named the random generator
`fuzz`, and the name stuck. Their point was not that random input is a
clever attack; it was that mature, trusted programs fell over on input
nobody had bothered to test.

For twenty years fuzzing stayed a specialist tool, because pure random input
is inefficient: a parser rejects almost all of it at the first byte, so the
fuzzer never reaches the interesting code. Two ideas changed that.

**Coverage guidance (AFL, 2013).** Michał Zalewski's **american fuzzy lop**
instruments the program so that it can tell which branches each input
reached, and keeps the inputs that reached somewhere new. It then mutates
those: flipping bits, inserting known interesting values, splicing two inputs
together. An input that gets one byte deeper into the parser is kept and
built on, so the fuzzer "learns" the input format without being told it.
Starting from the single seed "hello", AFL can find its way to a valid,
nested structure that reaches deep code, by keeping each small step that made
progress. Hanno Böck showed in 2015 that AFL, given OpenSSL 1.0.1f (the last
vulnerable version) and a wrapper to feed it handshake messages, found
Heartbleed on its own in about six hours, with no knowledge of the bug.

**In-process fuzzing (libFuzzer, 2015).** Kostya Serebryany's libFuzzer runs
in the same process as the code under test. You write one function,
`LLVMFuzzerTestOneInput(data, size)`, that feeds the bytes to your parser;
libFuzzer calls it millions of times a second with mutated inputs, using the
same coverage feedback as AFL but without starting a new process each time,
and finds the same Heartbleed in about five minutes. The one function you
write is a **fuzz target** or harness, and writing good ones (small, fast, one
feature each) is most of the work.

**Running it forever (OSS-Fuzz, 2016).** In December 2016 Google launched
OSS-Fuzz, a service that runs fuzz targets for important open-source
projects continuously on Google's machines, files a bug privately when it
finds one, and tells the maintainers when it is fixed. By the project's own
count, as of May 2025 OSS-Fuzz had helped find and fix over 13,000
vulnerabilities and over 50,000 bugs across more than 1,000 projects.
OpenSSL, BoringSSL, LibreSSL, libsodium and most other cryptographic
libraries are fuzzed this way around the clock.

**Sanitizers.** A fuzzer can only catch a bug it can see. A crash is easy to
see. A bug that reads one byte past a buffer, like Heartbleed, usually does
not crash: it returns slightly wrong data and keeps going. The answer is to
run the program under a **sanitizer** that turns silent corruption into a
loud crash. **AddressSanitizer** (ASan), by Serebryany and colleagues in
2012, surrounds every allocation with poisoned "red zones" and marks freed
memory as poisoned, in a shadow map beside the real memory; any read or
write of a poisoned byte stops the program with a detailed report. Under
ASan, Heartbleed's one-byte-past read is a crash the fuzzer notices at once.
Its relatives catch other classes: MemorySanitizer (reads of uninitialized
memory, which is what Cloudbleed leaked), UndefinedBehaviorSanitizer (signed
overflow, bad shifts, misaligned pointers), and ThreadSanitizer (data
races). Running a fuzzer with a sanitizer is the standard setup: the fuzzer
finds the input, the sanitizer catches the damage.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A fuzzing loop: a corpus of inputs is mutated, run through the target under a sanitizer with coverage feedback, new coverage is kept, and a crash is reported" fill="currentColor" font-size="14">
<rect x="20" y="90" width="120" height="50" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="112" text-anchor="middle" font-size="12">corpus of</text>
<text x="80" y="130" text-anchor="middle" font-size="12">inputs</text>
<line x1="140" y1="115" x2="200" y2="115" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah8)"/>
<text x="170" y="106" text-anchor="middle" font-size="11">mutate</text>
<rect x="200" y="90" width="130" height="50" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265" y="112" text-anchor="middle" font-size="12">target under</text>
<text x="265" y="130" text-anchor="middle" font-size="12">a sanitizer</text>
<line x1="330" y1="115" x2="400" y2="115" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah8)"/>
<rect x="400" y="60" width="120" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="460" y="85" text-anchor="middle" font-size="12">new coverage?</text>
<rect x="400" y="130" width="120" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="460" y="155" text-anchor="middle" font-size="12">crash?</text>
<path d="M 460 100 C 300 60, 120 55, 80 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 3" marker-end="url(#ah8)"/>
<text x="250" y="52" text-anchor="middle" font-size="11">keep the input</text>
<line x1="520" y1="150" x2="590" y2="150" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah8)"/>
<text x="560" y="140" text-anchor="middle" font-size="11">report</text>
<defs><marker id="ah8" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
</svg>
<figcaption>Figure 8.5. The fuzzing loop. Coverage feedback keeps inputs that reach new code, so the fuzzer learns the input format; a sanitizer turns a silent over-read into a crash the loop can see.</figcaption>
</figure>

### Code it: a twenty-line fuzzer that finds the toy Heartbleed

Real fuzzers need a compiler's help to measure coverage and a sanitizer to
see a one-byte over-read. We can reproduce the second part in Python with a
**shadow memory**: a parallel array that records which bytes of the toy
memory hold the current record, so that any read outside it raises, exactly
as ASan's shadow map does. Then a small mutation fuzzer, started from one
good heartbeat and a fixed seed, finds the bug of §8.3 by itself:

```python
import random

MEMORY = bytearray(256)
VALID = [False] * 256                  # shadow memory: which bytes hold live data

def receive(record):
    MEMORY[:len(record)] = record
    for i in range(256):
        VALID[i] = i < len(record)
    return len(record)

def load(addr, n):                     # every read goes through the "sanitizer"
    if not all(VALID[addr:addr + n]) or addr + n > len(MEMORY):
        raise MemoryError(f"read of {n} bytes at {addr} leaves the record")
    return bytes(MEMORY[addr:addr + n])

def heartbeat_broken(record_len):      # the toy of 8.3, reading through load()
    hbtype = load(0, 1)[0]
    payload = int.from_bytes(load(1, 2), "big")
    if hbtype != 1:
        return b""
    return b"\x02" + payload.to_bytes(2, "big") + load(3, payload)

def fuzz(target, seed_input, rounds, seed=1):
    rng = random.Random(seed)
    for i in range(1, rounds + 1):
        data = bytearray(seed_input)
        for _ in range(rng.randint(1, 4)):             # a few random mutations
            kind = rng.random()
            if kind < 0.6 and data:
                data[rng.randrange(len(data))] = rng.randrange(256)   # overwrite a byte
            elif kind < 0.8 and len(data) > 1:
                del data[rng.randrange(len(data))]                    # delete a byte
            else:
                data.insert(rng.randrange(len(data) + 1), rng.randrange(256))
        try:
            target(receive(bytes(data[:200])))
        except MemoryError as e:
            return i, bytes(data), e
    return None

good = b"\x01\x00\x05hello" + bytes(16)
found = fuzz(heartbeat_broken, good, 10000)
print("round", found[0], "input", found[1][:6].hex(), "...")
print(found[2])
```

With the seed fixed at 1, it prints the same thing every run:

```text
round 8 input 0100bf686537 ...
read of 191 bytes at 3 leaves the record
```

On the eighth mutation of the seed, the fuzzer changed the length byte from
`05` to `bf` (191) while the record still carried only a few payload bytes.
The server tried to read 191 bytes of payload; the shadow memory saw the
read leave the record and raised, the way ASan would stop the real OpenSSL.
A real fuzzer would need no shadow array of our own, because ASan provides
it, and no hand-written mutations, because coverage feedback guides them; but
the shape is the same: mutate, run, watch for a read that should not have
happened. Run the same fuzzer against `heartbeat_strict` from §8.8 and it
finds nothing, because the strict version checks the claim before the read.

!!! note "Life story: fuzzing"
    **Born:** 1988, Barton Miller's line-noise experiment at the University of
    Wisconsin; the 1990 paper named the `fuzz` generator · **Purpose:** find
    the inputs a program's authors never tested · **Helped:** american fuzzy
    lop (Michał Zalewski, 2013) added coverage guidance; AddressSanitizer
    (2012) and libFuzzer (2015) made over-reads visible and fast; OSS-Fuzz
    (2016) runs it forever for open source; between them they have found tens
    of thousands of bugs, Heartbleed among the ones they can rediscover in
    minutes · **Status:** standard practice; every serious parser and
    cryptographic library is fuzzed continuously

**A fuzzer is not proof.** It explores; it does not cover everything. A
fuzzer that has run for a week with no new crash tells you the easy bugs are
gone, not that none remain. It pairs with the differential and
known-answer testing of [Chapter 17](17-Choosing-Testing-and-Verifying.md),
which checks that the parser agrees with a reference, and with the strict
validation of [Chapter 3](03-ASN1-DER-and-Key-Files.md), which narrows what
the parser is allowed to accept in the first place.

**What to do.**

1. Write a small fuzz target for every parser that reads untrusted bytes:
   certificates, key files, protocol records, compressed data, user input.
2. Run the fuzzer under AddressSanitizer (and MemorySanitizer for
   uninitialized reads); without a sanitizer, over-reads pass silently.
3. Seed the corpus with real, valid inputs so the fuzzer starts deep in the
   parser, and keep the corpus in version control.
4. Enroll important open-source libraries in OSS-Fuzz, or run the same
   service's open-source tooling (ClusterFuzzLite) in your own CI.

## 8.10 Hash flooding

*Level: intermediate.*

Not every denial of service needs a memory bug. Some need only arithmetic.

A hash table stores each entry in a bucket chosen by a hash of its key. With
a good hash and $n$ entries spread over about $n$ buckets, each bucket holds
a few entries, and a lookup is fast: constant time on average. The average
hides an assumption. If many keys land in the same bucket, that bucket
becomes a linear list, and inserting or looking up among $k$ colliding keys
takes time proportional to $k$. Insert $n$ keys that all collide and the
work is proportional to $n^2$.

For a long time hash tables used fast, public, unkeyed hash functions, the
same for everyone. That means an attacker can compute, in advance, a set of
keys that all hash to the same bucket, and send them. Scott Crosby and Dan
Wallach described this as an attack in "Denial of Service via Algorithmic
Complexity Attacks" (USENIX Security 2003). The target need not be a visible
hash table: web frameworks put the fields of an HTTP form, or the keys of a
JSON object, into a dictionary as they parse the request, so a single POST
body full of colliding field names turns parsing itself into the $n^2$ loop.

That is exactly what Alexander Klink and Julian Wälde demonstrated at the
28th Chaos Communication Congress (28C3) in Berlin in December 2011. They
showed the attack still worked, eight years after Crosby and Wallach,
against PHP, ASP.NET, Java, Python, Ruby and others, because all of them
still used deterministic unkeyed hashes for their built-in maps. The
coordinated advisory was oCERT-2011-003. Their figures were stark: a couple
of megabytes of crafted POST data, well within normal request size limits,
could keep a server's CPU busy for minutes on a single request, because the
few hundred thousand colliding keys in it forced tens of billions of string
comparisons. One crafted request, one core pinned; a handful of requests,
a server down.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Two hash tables: with colliding keys all entries pile into one bucket as a long chain; with a keyed hash they spread across the buckets" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">unkeyed hash, chosen keys: all in one bucket</text>
<line x1="20" y1="40" x2="20" y2="110" stroke="currentColor" stroke-width="1.2"/>
<rect x="20" y="40" width="26" height="18" fill="none" stroke="currentColor"/>
<rect x="20" y="58" width="26" height="18" fill="none" stroke="currentColor"/>
<rect x="20" y="76" width="26" height="18" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<rect x="20" y="94" width="26" height="18" fill="none" stroke="currentColor"/>
<line x1="46" y1="85" x2="620" y2="85" stroke="currentColor" stroke-width="1.4"/>
<g font-size="11"><rect x="60" y="78" width="40" height="16" fill="none" stroke="currentColor"/><rect x="110" y="78" width="40" height="16" fill="none" stroke="currentColor"/><rect x="160" y="78" width="40" height="16" fill="none" stroke="currentColor"/><rect x="210" y="78" width="40" height="16" fill="none" stroke="currentColor"/><rect x="260" y="78" width="40" height="16" fill="none" stroke="currentColor"/><rect x="310" y="78" width="40" height="16" fill="none" stroke="currentColor"/></g>
<text x="60" y="122" font-size="12">one long chain: each insert walks all of it, so n inserts cost about n² steps</text>
<text x="20" y="150" font-weight="bold">keyed hash, same keys: spread out</text>
<line x1="20" y1="166" x2="20" y2="226" stroke="currentColor" stroke-width="1.2"/>
<g font-size="11"><rect x="20" y="166" width="26" height="16" fill="none" stroke="currentColor"/><rect x="60" y="166" width="40" height="14" fill="none" stroke="currentColor"/>
<rect x="20" y="184" width="26" height="16" fill="none" stroke="currentColor"/><rect x="60" y="184" width="40" height="14" fill="none" stroke="currentColor"/>
<rect x="20" y="202" width="26" height="16" fill="none" stroke="currentColor"/><rect x="60" y="202" width="40" height="14" fill="none" stroke="currentColor"/></g>
<rect x="150" y="166" width="40" height="14" fill="none" stroke="currentColor"/>
<rect x="260" y="184" width="40" height="14" fill="none" stroke="currentColor"/>
<rect x="360" y="202" width="40" height="14" fill="none" stroke="currentColor"/>
<rect x="450" y="166" width="40" height="14" fill="none" stroke="currentColor"/>
<text x="430" y="215" font-size="12">short chains: lookups stay fast</text>
</svg>
<figcaption>Figure 8.6. Hash flooding. With a public hash the attacker computes keys that share a bucket; with a secret per-process key they cannot predict which keys collide.</figcaption>
</figure>

**The wrong fix, and the right one.** The first instinct was to add a random
seed to the existing fast hash. That is not enough. At 29C3 a year later,
Jean-Philippe Aumasson, Daniel J. Bernstein and Martin Boßlet showed that
the seeded versions of MurmurHash and CityHash still had key-independent
collisions: inputs that collide for *every* seed, so the seed did not help.
Python's first seeded hash gave its seed away from a couple of outputs. The
real fix is a **keyed pseudorandom function**: a hash with a secret key such
that, without the key, you cannot predict which inputs collide at all.
Aumasson and Bernstein designed **SipHash** (INDOCRYPT 2012) for exactly
this: fast on short inputs, with a 128-bit key and a 64-bit output, cheap
enough to run on every table lookup. The [SipHash page](../../06-mac/SipHash.md)
has the algorithm and its uses.

Languages switched. Python added hash randomization (a random seed per
process, `PYTHONHASHSEED` to control it) in 2.6.8, 2.7.3, 3.1.5 and 3.2.3,
off by default at first and on by default from 3.3, and then replaced the
hash itself with SipHash-2-4 in 3.4 (PEP 456, by Christian Heimes), moving to
the faster SipHash-1-3 in 3.11. Rust, Ruby, Perl and others made the same
move. The key is random per process and secret, so an attacker cannot
compute colliding keys. (This is why `hash()` of a string gives a different
number each time you start Python; it is a security feature, and code must
not depend on the value being stable.)

### Code it: a weak hash flooded, a keyed hash not

A dictionary-like table that counts how many key comparisons it makes shows
the effect directly. We feed it 2,000 ordinary keys and 2,000 keys that are
rearrangements of the same eight letters, first with a weak hash that just
sums the bytes (so every rearrangement collides), then with a keyed hash
standing in for SipHash:

```python
import hashlib, itertools

class Table:
    """A chained hash table that counts key comparisons."""
    def __init__(self, hash_fn, buckets=1024):
        self.hash, self.slots, self.compares = hash_fn, [[] for _ in range(buckets)], 0
    def put(self, key, value):
        chain = self.slots[self.hash(key) % len(self.slots)]
        for i, (k, _) in enumerate(chain):
            self.compares += 1
            if k == key:
                chain[i] = (key, value)
                return
        chain.append((key, value))

def weak_hash(key):                    # adds up the bytes: order does not matter
    return sum(key)

SECRET = bytes(range(16))              # fixed here so the output repeats; use secrets.token_bytes(16)
def keyed_hash(key):                   # a keyed PRF, standing in for SipHash
    return int.from_bytes(hashlib.blake2b(key, key=SECRET, digest_size=8).digest(), "little")

# 2,000 different keys that are rearrangements of the same 8 letters
colliding = [bytes(p) for p in itertools.islice(itertools.permutations(b"abcdefgh"), 2000)]
ordinary = [b"user%04d" % i for i in range(2000)]

for name, fn in (("weak", weak_hash), ("keyed", keyed_hash)):
    for label, keys in (("ordinary", ordinary), ("colliding", colliding)):
        t = Table(fn)
        for k in keys:
            t.put(k, 1)
        print(f"{name:5} hash, {label:9} keys: {t.compares:>9,} comparisons")
```

It prints:

```text
weak  hash, ordinary  keys:   108,999 comparisons
weak  hash, colliding keys: 1,999,000 comparisons
keyed hash, ordinary  keys:     1,947 comparisons
keyed hash, colliding keys:     1,990 comparisons
```

The colliding keys all sum to the same value, so under the weak hash they
pile into one bucket: inserting 2,000 of them costs $0 + 1 + \dots + 1999 =
1{,}999{,}000$ comparisons, the $n^2$ curve exactly. Ten times the keys would
cost a hundred times the work. Under the keyed hash the attacker cannot
predict the buckets, so the same keys spread out and the count stays near
$n$. The real attack sends keys chosen to collide under the specific weak
hash the target uses, which an attacker can compute offline; the keyed hash
makes that computation impossible without the secret.

!!! note "Life story: hash flooding and SipHash"
    **Born:** the attack described by Scott Crosby and Dan Wallach (USENIX
    Security 2003); shown against most web platforms by Alexander Klink and
    Julian Wälde at 28C3, December 2011 (oCERT-2011-003) · **Purpose of the
    fix:** a keyed hash whose collisions nobody can predict without the key ·
    **Helped:** SipHash (Aumasson and Bernstein, 2012) became the default
    table hash in Python 3.4 (PEP 456), Rust, Ruby, Perl and the Linux kernel;
    randomized, keyed hashing of untrusted keys is now standard · **Status:**
    the fix is in place in every major language; code that rolls its own hash
    table with an unkeyed hash can still be flooded

**What to do.**

1. Use your language's built-in map for untrusted keys and leave its random
   hash alone. Do not disable hash randomization for speed or for stable
   output.
2. If you implement your own hash table (or a Bloom filter, cache or set)
   that takes attacker-controlled keys, key it with SipHash and a secret
   per-process key.
3. Cap the number of fields, headers and parameters you will parse from one
   request, so a single message cannot carry a flooding payload.
4. Watch for the general shape: any data structure whose worst case is much
   worse than its average, fed by untrusted input, is a denial-of-service
   risk. Regular expressions (catastrophic backtracking) and sorting
   (quicksort's worst case) are the other common ones.

## 8.11 Decompression bombs and resource limits

*Level: intermediate.*

The last way a small input does large damage is compression. Compression
trades computation for size, and a hostile input can push the trade to an
extreme: a few kilobytes that expand to gigabytes, or a few megabytes to
petabytes. A program that reads the compressed bytes and decompresses them
into memory, trusting that the result will be a reasonable size, runs out of
memory or disk and falls over.

The classic is the "zip of death", `42.zip`: 42 kilobytes that expand,
through nested zip files, to about 4.5 petabytes. Nesting is easy to defend
against (refuse to open archives inside archives), but David Fifield showed
in "A better zip bomb" (USENIX WOOT 2019) that nesting is not needed. By
overlapping files inside a single zip so that many entries share the same
compressed data, he built a flat, standard zip of 42 kB that expands to 5.5
GB, and one of 46 MB that expands to 4.5 PB, with no nesting at all. The
DEFLATE algorithm that zip and gzip use has a maximum compression ratio of
1032 to 1 for any single stream, so a plain gzipped stream is bounded; the
zip container's structure is what let Fifield beat that.

The same risk appears wherever compression meets untrusted input: HTTP
request and response bodies with `Content-Encoding: gzip`, compressed TLS
certificates, XML with entity expansion (the "billion laughs" attack, a
compression bomb in a different coat), compressed container image layers, and
PNG or PDF streams. In 2015 a bug in how browsers and servers handled
compressed data in HTTP/2's header compression (HPACK) had to be guarded the
same way.

The defense is never to decompress blindly. Bound three things before and
during decompression:

- **The output size.** Stop as soon as the output passes a limit you set
  from what the input is supposed to be, not from what it claims.
- **The ratio.** A legitimate body of a given compressed size expands by
  some sensible factor; refuse one that expands far more.
- **The work and time.** Decompression itself takes CPU; cap it, and cap
  the number of files or entries in an archive and the nesting depth.

### Code it: decompress with a limit

Python's `zlib` lets you decompress a little at a time and stop. The trick is
`decompressobj().decompress(data, max_length)`, which never returns more than
`max_length` bytes and keeps the rest in `unconsumed_tail`. Ask for one byte
more than your limit, and if you get it, you know the output is too big
without ever building the whole thing:

```python
import zlib

class TooBig(ValueError):
    pass

def inflate_limited(data, max_out=1 << 20, max_ratio=100):
    """Decompress zlib data, refusing more than max_out bytes or max_ratio x the input."""
    limit = min(max_out, max_ratio * max(len(data), 1))
    d = zlib.decompressobj()
    out = bytearray()
    chunk = data
    while chunk:
        out += d.decompress(chunk, limit + 1 - len(out))   # never more than we allow
        if len(out) > limit:
            raise TooBig(f"output passes {limit:,} bytes from {len(data):,} input bytes")
        chunk = d.unconsumed_tail
    if not d.eof:
        raise ValueError("truncated stream")
    return bytes(out)

bomb = zlib.compress(bytes(20_000_000), 9)          # 20 MB of zeros
text = zlib.compress(b"an ordinary JSON body " * 200, 9)
print(f"bomb: {len(bomb):,} bytes, ratio {20_000_000 / len(bomb):.0f} to 1")
print(len(inflate_limited(text)))
try:
    inflate_limited(bomb)
except TooBig as e:
    print("refused:", e)
try:
    inflate_limited(text[:-6])
except ValueError as e:
    print("refused:", e)
```

It prints:

```text
bomb: 19,453 bytes, ratio 1028 to 1
4400
refused: output passes 1,048,576 bytes from 19,453 input bytes
refused: truncated stream
```

The honest body comes back decoded. The bomb is 19 kB that would become 20
MB; the limiter stops it a megabyte in and raises, having allocated only a
megabyte, not twenty. The truncated stream is caught by `d.eof`: a stream
that ends early is as much an attack as one that is too large.

**Resource limits around the code.** Bounds in the code are the first line.
The operating system provides a second, which catches the cases the code
missed and the work you cannot easily bound:

- **Memory and CPU per process** with `setrlimit` (`RLIMIT_AS`,
  `RLIMIT_CPU`, `RLIMIT_DATA`) on Unix, or a container's memory and CPU
  limits (cgroups). A worker that exceeds them is killed, not the whole
  service.
- **Request size and time** at the front door: a maximum request body, a
  maximum number of headers and fields, a timeout on each request, a timeout
  on reading a slow client (the Slowloris attack sends a request one byte at
  a time to tie up a connection).
- **Concurrency limits** so that a flood of expensive requests cannot start
  an unbounded number of workers.
- **Isolation** so that one request's resource use cannot starve another's:
  separate processes or containers per tenant, as §8.4 noted for memory.

This is defense in depth. The code's bounds stop the attacks you anticipated;
the system's limits contain the ones you did not, turning "the server fell
over" into "one request was rejected".

!!! note "Life story: the zip bomb"
    **Born:** the nested `42.zip` circulated in the early 2000s (42 kB to
    about 4.5 PB); David Fifield's non-nested construction in "A better zip
    bomb" (USENIX WOOT 2019) reached the same sizes in a single flat archive ·
    **Purpose:** to exhaust the memory or disk of anything that decompresses
    input without a limit · **Helped:** made "bound output size, ratio and
    depth before decompressing" a rule for antivirus scanners, mail servers,
    web servers and image libraries · **Status:** a standing hazard; every
    decompressor that reads untrusted input needs the limits, and many have
    been caught without them

**What to do.**

1. Never decompress untrusted data into memory without a size limit and a
   ratio limit; stop as soon as either is passed.
2. Refuse nested archives, cap the number of entries and the nesting depth,
   and treat a truncated stream as an error.
3. Put operating-system or container limits on memory, CPU and time around
   any code that processes untrusted input, as a backstop.
4. Limit request size, field count, and connection time at the edge, and
   isolate tenants so one cannot exhaust another's resources.

## 8.12 Going deeper

*Level: expert.*

**Over-reads that are not leaks, and leaks that are not over-reads.**
Heartbleed read memory and sent it back. A subtler cousin reads *uninitialized*
memory: a buffer that was allocated but never fully written, so it still
holds whatever was in those bytes before. Cloudbleed leaked some memory of
this kind. MemorySanitizer exists precisely to catch reads of uninitialized
memory, which AddressSanitizer does not, because the read is within the
allocation's bounds; nothing is "out of bounds", the bytes are simply stale.
The defense is to zero or fully initialize buffers before use, and some
systems now do it for the whole kernel or language runtime
(`CONFIG_INIT_STACK_ALL_ZERO` in the Linux kernel; Go zeroes all memory on
allocation by design).

**Algorithmic complexity beyond hash tables.** The hash-flooding pattern,
worst case far worse than average on attacker-chosen input, recurs:

- **Regular expressions.** A pattern like `(a+)+$` on a string of `a`s
  followed by something else can take exponential time to fail, because the
  engine backtracks through every way to split the `a`s. This "ReDoS" has
  taken down real services (Stack Overflow in 2016, Cloudflare's WAF in
  2019). The fix is an engine that does not backtrack (RE2, Rust's `regex`,
  Go's `regexp`), or careful patterns and a timeout.
- **Sorting and selection.** Quicksort's worst case is $n^2$ on inputs
  chosen to hit its pivot badly; library sorts now randomize or use
  introsort to avoid it.
- **JSON and XML.** Deeply nested structures can exhaust the stack of a
  recursive parser; bound the depth.

**Timing as a covert channel in error handling.** The §8.11 limiter raises as
soon as the output is too big. If the time it takes to reject leaks something
about the input, that can itself be an oracle. This is the defender's side of
the padding-oracle and error-timing problems of
[Cryptanalysis, Chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md),
taken up for APIs in [Chapter 9](09-APIs-That-Resist-Misuse.md): one error,
one path, and where it matters, a constant-time one.

**The CVE-2021-43527 lesson: fuzzing is not automatic.** In November 2021
Tavis Ormandy found a heap overflow in Mozilla's NSS library (nicknamed
"BigSig"): verifying a DSA or RSA-PSS signature larger than NSS's fixed
16,384-bit maximum overflowed a buffer. NSS was fuzzed, by OSS-Fuzz among
others, and the bug had been reachable for years. Ormandy's write-up, "This
should not have happened", traced why the fuzzers missed it: the signature
fuzz target did not actually reach the verification code (it stopped at
decoding), the fuzzers capped input sizes below the threshold that triggered
the bug, and the templates fed to the fuzzer did not include the structures
that reach the vulnerable path. The lesson is that a fuzz target is only as
good as the code it reaches and the inputs it is allowed to try: "we fuzz it"
is not the same as "the fuzzer can get there". Measuring coverage, and
checking that it includes the dangerous functions, is part of the work.

**KeyTrap: a specification that was a denial of service.** In February 2024,
researchers at the ATHENE center in Germany published KeyTrap
(CVE-2023-50387), a denial-of-service attack on DNSSEC-validating resolvers.
By crafting a single DNS response with many colliding keys and signatures,
an attacker could make a resolver do an enormous amount of validation work
for one packet; the paper reported CPU costs raised about two million-fold,
stalling some resolvers (BIND 9 worst) for up to 16 hours. The flaw was not
in any one implementation but in the DNSSEC standards, which told resolvers
to try every key against every signature. The fixes had to limit that work,
in the resolvers and eventually in the standards. It is the §8.10 pattern at
internet scale: a protocol that said "try everything" meets an input built to
make "everything" enormous.

**Spectre and friends.** A bounds check can be correct in the source and in
the binary and still be bypassed by the processor: Spectre (2018) showed that
speculative execution can run past a bounds check before it resolves and leave
traces of the out-of-bounds data in the cache, where a timing attack reads
them. No language-level bounds check prevents this; the mitigations live below
the languages of §8.8, and the attacker's side is in
[Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).

## Check yourself

??? question "1. In Heartbleed, the server held two lengths for one message. Name them, and say which one the vulnerable code used."

    The **record length**, which the TLS layer actually read from the network
    (a fact), and the **payload_length** written in the heartbeat message by
    the sender (a claim). The vulnerable code used the claim as the length for
    its `memcpy`, without checking it against the record length. The fix
    compares them and silently discards a message whose claim does not fit the
    record.

??? question "2. Why could Heartbleed leak the server's private key, when the key is loaded once at startup and the heartbeat buffer is allocated much later?"

    Because allocators reuse memory. The key, and the temporary values RSA
    produces while signing, are freed and the blocks handed back to the
    allocator with their contents intact; the heartbeat response buffer can
    later be placed near them, and the over-read copies whatever is adjacent.
    OpenSSL's own freelist made this worse by recycling buffers below the
    operating system's view. A "freed" secret is not a gone secret (§8.5).

??? question "3. Cloudbleed's bug was `if (++p == pe)`. What was wrong, and what one-character change fixes the class of bug?"

    The check tests for the pointer being *exactly* at the end. On a path that
    advanced the pointer past the end in one step, it was never equal to `pe`
    again, so the parser ran off the end. Changing `==` to `>=` makes the test
    fire whenever the pointer is at or past the end. The deeper fix is to treat
    the end as a wall checked on every access (`while (p < pe)`), not a point
    to land on.

??? question "4. A C function wipes a key with `memset(key, 0, 32)` just before returning, but the key is still in memory afterward. Why, and what is the fix?"

    After the `memset`, nothing in the program ever reads `key` again, so the
    store is a dead store and the optimizing compiler is allowed to remove it,
    and does at `-O2`. The fix is a function the compiler may not remove:
    `explicit_bzero`, `memset_explicit` (C23), `SecureZeroMemory` (Windows),
    `OPENSSL_cleanse`, or a `volatile` write.

??? question "5. In Python, `key = secrets.token_bytes(16)` then `key = bytes(16)`. Is the first key wiped? What is the best Python can do?"

    No. The second assignment rebinds the name to a new all-zero object; the
    original 16 random bytes are untouched and remain in memory until the
    allocator reuses the block, without clearing it. `bytes` is immutable and
    cannot be overwritten. The best Python can do is hold the secret in a
    `bytearray`, overwrite it in place (through a `memoryview` or `ctypes`) in
    a `finally` block, and never copy it to `bytes` or `str`. Even then,
    library copies and interpreter temporaries remain, so the most valuable
    keys belong outside the Python process.

??? question "6. Rust and Go check array bounds. Give three kinds of bug in cryptographic code that this does not prevent."

    Logic bugs (accepting a bad encoding, skipping a check, `goto fail`-style
    errors); timing side channels (bounds checking says nothing about how long
    code takes, so constant-time techniques are still needed); and denial of
    service (a panic on bad input is memory-safe but is still a crash an
    attacker can trigger repeatedly, and unbounded work on large inputs is
    still possible). FFI and `unsafe` are also escapes from the safety.

??? question "7. A fuzzer runs your parser for a week with no crash. Why is that not proof it is safe, and what makes a fuzzer far more likely to find an over-read?"

    A fuzzer explores; it does not cover everything, and a week without a
    crash means the reachable easy bugs are gone, not that none remain
    (CVE-2021-43527 sat behind years of fuzzing because the target never
    reached the vulnerable code). It finds over-reads far more often when run
    under a sanitizer such as AddressSanitizer, which turns a silent
    one-byte-past read into a crash the fuzzer can see; without a sanitizer,
    such a read usually returns slightly wrong data and passes unnoticed.

??? question "8. Why does adding a random seed to a fast public hash not fully stop hash flooding, and what does?"

    Because some fast hashes have collisions that hold for *every* seed:
    Aumasson, Bernstein and Boßlet showed such key-independent collisions in
    seeded MurmurHash and CityHash at 29C3 (2012), so the attacker can still
    compute colliding keys without knowing the seed. The real fix is a keyed
    pseudorandom function such as SipHash, where without the secret key you
    cannot predict which inputs collide at all. Python switched to SipHash in
    3.4 (PEP 456).

??? question "9. You accept a gzip-compressed request body. What two numbers must you bound while decompressing, and how do you bound them without building the whole output?"

    The total **output size** and the **compression ratio** (output size
    divided by input size). Bound them by decompressing incrementally with a
    cap, for example `zlib.decompressobj().decompress(chunk, max_length)`,
    asking for at most one byte more than your limit each step and raising as
    soon as the output passes it, so you never allocate the full expansion. A
    truncated stream (no clean end) should also be rejected.

??? question "10. Heartbleed, Cloudbleed and hash flooding all let a stranger with only a network connection cause harm before any login. Why is that property so dangerous, and what does it argue for?"

    Code that runs before authentication is exposed to the entire internet
    with no cost of entry: the attacker needs no account, no session, nothing
    but the ability to connect, and can repeat the attack at will. That makes
    pre-authentication parsers and resource handlers the highest-value targets.
    It argues for making that code as small and strict as possible, fuzzing it
    hardest, putting resource limits in front of it, and turning off features
    (like the heartbeat extension) that are not needed.

## What you learned

- Every length a parser reads is a claim; somewhere there is a fact (bytes
  actually received, the size of the enclosing structure) to check it
  against. Heartbleed believed the claim.
- Write bounds checks as walls, not landing points (`p < end`, not
  `p == end`), and in a form that cannot overflow (subtract from the size,
  do not add to the offset). Cloudbleed missed the wall by one character.
- Over-reads leak secrets because freed memory keeps its contents and
  processes are shared. Isolate tenants, and wipe secrets you are done with.
- In C, wipe secrets with `explicit_bzero`, `memset_explicit`,
  `SecureZeroMemory` or `OPENSSL_cleanse`, never plain `memset`, which the
  compiler deletes as a dead store. A wipe clears only the buffer you pass;
  registers, copies and library buffers remain.
- Python cannot wipe `bytes` (immutable) and copies secrets everywhere; the
  best it can do is a `bytearray` overwritten in a `finally`, which is why
  the most valuable keys belong outside the process. Keep secrets out of
  swap and core dumps with `mlock`, `MADV_DONTDUMP` and no-core-dump limits.
- Memory-safe languages turn over-reads into panics, a large gain, but do not
  fix logic bugs, timing leaks, or denial of service, and panics are
  themselves a denial of service.
- Fuzzing (Miller 1988; AFL 2013; libFuzzer 2015; OSS-Fuzz 2016) finds the
  inputs you never tested; run it under a sanitizer (ASan) so silent
  over-reads become visible crashes. A fuzz target is only as good as the
  code it reaches.
- Hash tables fed untrusted keys need a keyed hash (SipHash); unkeyed public
  hashes let an attacker flood one bucket and turn parsing into $n^2$ work.
- Never decompress untrusted input without bounding output size, ratio and
  depth, and back the code's limits with operating-system or container
  limits on memory, CPU and time.

**Next:** [Chapter 9](09-APIs-That-Resist-Misuse.md) builds interfaces that
are hard to use wrongly in the first place, so that the single error path and
the misuse-resistant envelope close the gaps this chapter has been patching.

## Further reading

- OpenSSL Security Advisory, "TLS heartbeat read overrun (CVE-2014-0160)"
  (7 April 2014), and the fix in OpenSSL 1.0.1g.
- Robin Seggelmann, Michael Tüxen and Michael Williams, "Transport Layer
  Security (TLS) and Datagram Transport Layer Security (DTLS) Heartbeat
  Extension", RFC 6520 (February 2012).
- Zakir Durumeric, Frank Li, James Kasten, Johanna Amann, Jethro Beekman,
  Mathias Payer, Nicolas Weaver, David Adrian, Vern Paxson, Michael Bailey
  and J. Alex Halderman, "The Matter of Heartbleed" (IMC 2014).
- Ted Unangst, "analysis of openssl freelist reuse" and the LibreSSL
  announcement (April 2014), www.tedunangst.com and www.libressl.org.
- John Graham-Cumming, "Incident report on memory leak caused by Cloudflare
  parser bug" (Cloudflare blog, 23 February 2017); Tavis Ormandy, Project
  Zero issue 1139 (February 2017).
- Colin Percival, "Zeroing buffers is insufficient" (2014), and "How to zero
  a buffer" (daemonology.net).
- Zhaomo Yang, Brian Johannesmeyer, Anders Trier Olesen, Sorin Lerner and
  Kirill Levchenko, "Dead Store Elimination (Still) Considered Harmful"
  (USENIX Security 2017).
- J. Alex Halderman et al., "Lest We Remember: Cold Boot Attacks on
  Encryption Keys" (USENIX Security 2008).
- OpenBSD manual pages `explicit_bzero(3)`; Microsoft, `SecureZeroMemory`;
  OpenSSL, `OPENSSL_cleanse(3)`; libsodium, "Securing memory allocations".
- Linux manual pages `mlock(2)`, `madvise(2)` (MADV_DONTDUMP, MADV_WIPEONFORK),
  `memfd_secret(2)`; `core(5)` and `setrlimit(2)` (RLIMIT_CORE).
- Matt Miller, "Trends, Challenges, and Strategic Shifts in the Software
  Vulnerability Mitigation Landscape" (BlueHat IL, 2019); Jeff Vander Stoep,
  "Memory Safe Languages in Android 13" (Google Security Blog, 2022); NSA,
  "Software Memory Safety" (November 2022).
- Barton P. Miller, Lars Fredriksen and Bryan So, "An Empirical Study of the
  Reliability of UNIX Utilities" (*Communications of the ACM* 33:12, 1990).
- Michał Zalewski, american fuzzy lop (lcamtuf.coredump.cx, 2013); Kostya
  Serebryany et al., "AddressSanitizer: A Fast Address Sanity Checker"
  (USENIX ATC 2012) and libFuzzer (LLVM documentation); Hanno Böck, "How
  Heartbleed could've been found" (blog.hboeck.de, 2015).
- Google, "OSS-Fuzz: Continuous Fuzzing for Open Source Software"
  (github.com/google/oss-fuzz; figures as of May 2025).
- Tavis Ormandy, "This should not have happened: A vulnerability postmortem"
  (Project Zero blog, December 2021), on CVE-2021-43527 in NSS.
- Scott A. Crosby and Dan S. Wallach, "Denial of Service via Algorithmic
  Complexity Attacks" (USENIX Security 2003).
- Alexander Klink and Julian Wälde, "Efficient Denial of Service Attacks on
  Web Application Platforms" (28C3, December 2011); oCERT-2011-003.
- Jean-Philippe Aumasson and Daniel J. Bernstein, "SipHash: a fast
  short-input PRF" (INDOCRYPT 2012); Aumasson, Bernstein and Martin Boßlet,
  "Hash-flooding DoS reloaded" (29C3, 2012); Christian Heimes, PEP 456,
  "Secure and interchangeable hash algorithm" (Python 3.4).
- David Fifield, "A better zip bomb" (USENIX WOOT 2019); bamsoftware.com.
- Elias Heftrig, Haya Shulman, Niklas Vogel and Michael Waidner, "The Harder
  You Try, The Harder You Fail: The KeyTrap Denial-of-Service Algorithmic
  Complexity Attacks on DNSSEC" (CCS 2024; CVE-2023-50387).
