# 19. Protocols

*A protocol is where the pieces of this book meet: key exchange, signatures,
certificates, key derivation, authenticated encryption and random numbers, put
in a fixed order with fixed messages. This chapter walks through four
protocols that most people use every day, TLS 1.3, SSH, Signal and Wi-Fi, step
by step, and tells what went wrong in each one's history. Almost none of those
failures broke a cipher. They broke the way the parts were put together.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a secure channel protocol has to do, and why that is harder than it looks
    - the TLS 1.3 handshake message by message, with its key schedule in Python and a real handshake on your machine
    - how SSH sets up a connection, and the attacks on it from 1998 to 2024
    - how Signal's X3DH and Double Ratchet give every message its own key, with a working ratchet in Python
    - why WEP failed, how a WPA2 password can be cracked offline, what KRACK did, and what WPA3 changed
    - the patterns behind protocol failures: downgrade, bad composition, nonce reuse, error oracles

    **You need:** most of the book. In particular [Chapter 10](10-Message-Authentication.md) (MACs and AEAD),
    [Chapter 11](11-Passwords-and-Key-Derivation.md) (PBKDF2, HKDF), [Chapter 12](12-Diffie-Hellman.md),
    [Chapter 15](15-Elliptic-Curves.md) (X25519), [Chapter 16](16-PKI-and-Key-Establishment.md)
    (certificates, PAKE), [Chapter 17](17-Defining-Security.md) and [Chapter 18](18-Side-Channels.md).

    **Levels:** 19.1 and 19.2 are for beginners, 19.3 to 19.8 intermediate, 19.9 and 19.10 expert.

## 19.1 The problem

By now you have every tool. Diffie-Hellman agrees on a secret over an open
line. Signatures and certificates say who is on the other end. HKDF turns a
shared secret into keys. AEAD encrypts and authenticates data. So a secure
connection should be easy: do a key exchange, sign it, derive keys, encrypt.

It isn't, and the oldest example shows why. In 1978 Roger Needham of the
University of Cambridge and Michael Schroeder of Xerox PARC published protocols
for authentication using a trusted server or public keys. They were short, clear, and taught for years.
In 1995 Gavin Lowe, at Oxford, ran the public-key version through a model
checker and found an attack in a three-message exchange: if Alice talks to a
dishonest Mallory, Mallory can reuse her messages to pose as Alice to Bob. The
fix was to add one name to one message. The flaw had sat in plain sight for 17
years.

<figure class="mars-fig" id="fig-19-ns">
<svg viewBox="0 0 660 420" width="660" role="img" aria-label="Lowe's 1995 attack on the Needham-Schroeder public-key protocol, as a message sequence chart"><rect x="30" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="30" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Alice</text><text x="90" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">honest</text><line x1="90" y1="62" x2="90" y2="350" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="270" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="270" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Mallory</text><text x="330" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">dishonest insider</text><line x1="330" y1="62" x2="330" y2="350" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="510" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="510" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Bob</text><text x="570" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">honest</text><line x1="570" y1="62" x2="570" y2="350" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="90" y1="90" x2="330" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="330,90 322.7,93.3 322.7,86.7" fill="currentColor" stroke="none"/><text x="210" y="84" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">1.  {N<tspan dy="4" font-size="9">a</tspan><tspan dy="-4">&#8203;</tspan>, A}<tspan dy="4" font-size="9">M</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="330" y1="125" x2="570" y2="125" class="acc" stroke-width="1.5"/><polygon points="570,125 562.7,128.3 562.7,121.7" class="acc-fill" stroke="none"/><text x="450" y="119" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">1′.  {N<tspan dy="4" font-size="9">a</tspan><tspan dy="-4">&#8203;</tspan>, A}<tspan dy="4" font-size="9">B</tspan><tspan dy="-4">&#8203;</tspan>   (posing as Alice)</text><line x1="570" y1="160" x2="330" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="330,160 337.3,156.7 337.3,163.3" fill="currentColor" stroke="none"/><text x="450" y="154" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">2′.  {N<tspan dy="4" font-size="9">a</tspan><tspan dy="-4">&#8203;</tspan>, N<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>}<tspan dy="4" font-size="9">A</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="330" y1="195" x2="90" y2="195" stroke="currentColor" stroke-width="1.5"/><polygon points="90,195 97.3,191.7 97.3,198.3" fill="currentColor" stroke="none"/><text x="210" y="189" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">2.  {N<tspan dy="4" font-size="9">a</tspan><tspan dy="-4">&#8203;</tspan>, N<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>}<tspan dy="4" font-size="9">A</tspan><tspan dy="-4">&#8203;</tspan>  (passed on unread)</text><line x1="90" y1="230" x2="330" y2="230" stroke="currentColor" stroke-width="1.5"/><polygon points="330,230 322.7,233.3 322.7,226.7" fill="currentColor" stroke="none"/><text x="210" y="224" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">3.  {N<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>}<tspan dy="4" font-size="9">M</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="330" y1="265" x2="570" y2="265" class="acc" stroke-width="1.5"/><polygon points="570,265 562.7,268.3 562.7,261.7" class="acc-fill" stroke="none"/><text x="450" y="259" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">3′.  {N<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>}<tspan dy="4" font-size="9">B</tspan><tspan dy="-4">&#8203;</tspan></text><rect x="450" y="290" width="200" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="450" y="290" width="200" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="550" y="308.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">Bob: "I am talking to Alice"</text><text x="550" y="323.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">wrong: it is Mallory</text><text x="330" y="372" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">{x}<tspan dy="4" font-size="9">Y</tspan><tspan dy="-4">&#8203;</tspan> = x encrypted to Y's public key;  N = a random nonce</text><text x="330" y="396" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">Lowe's fix: message 2′ becomes {N<tspan dy="4" font-size="9">a</tspan><tspan dy="-4">&#8203;</tspan>, N<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>, B}<tspan dy="4" font-size="9">A</tspan><tspan dy="-4">&#8203;</tspan>, so Alice sees it came from Bob, not Mallory</text></svg>
<figcaption>Figure 19.1. Lowe's man-in-the-middle attack. Alice runs an honest session with Mallory; Mallory replays its pieces to Bob, using Alice as a decryption service for Bob's nonce. Seventeen years in plain sight, fixed by adding one name.</figcaption>
</figure>

!!! note "Life story: the Needham-Schroeder protocols"
    **Born:** 1978, Roger Needham (Cambridge) and Michael Schroeder (Xerox PARC), in *Communications of the ACM* ·
    **Purpose:** authentication over an untrusted network, with a trusted server (symmetric version) or with
    public keys · **Helped:** the symmetric version, patched with timestamps, became the basis of Kerberos (MIT,
    1980s) · **Broken:** the public-key version, by Gavin Lowe at Oxford in 1995 with the FDR model checker ·
    **Replaced by:** the Needham-Schroeder-Lowe fix, and the habit of checking protocols with formal tools

A protocol has to get many things right at once:

- **Agree on keys** that only the two ends know, fresh for each session.
- **Authenticate** the other end (usually the server; sometimes both).
- **Negotiate** versions and algorithms without letting an attacker push both
  sides to the weakest choice (a **downgrade**).
- **Bind everything together**: the keys must depend on the whole conversation
  (the **transcript**), so that no message can be swapped, dropped or replayed
  from another session.
- **Protect the records** that follow: confidentiality, integrity, order.
- **Survive key theft**: recorded traffic should stay safe if a long-term key
  is stolen later (**forward secrecy**), and ideally the session should recover
  after a short compromise (**post-compromise security**).

Each section below shows how one real protocol meets these goals, and what
happened when it didn't.

<figure class="mars-fig" id="fig-19-lifespans">
<svg viewBox="0 0 680 480" width="680" role="img" aria-label="Lifespans of TLS, SSH, messaging, Wi-Fi and VPN protocol versions from 1995 to today"><line x1="146.1" y1="24" x2="146.1" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="146.1" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">1995</text><line x1="226.4" y1="24" x2="226.4" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="226.4" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2000</text><line x1="306.7" y1="24" x2="306.7" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="306.7" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2005</text><line x1="387" y1="24" x2="387" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="387" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2010</text><line x1="467.3" y1="24" x2="467.3" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="467.3" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2015</text><line x1="547.6" y1="24" x2="547.6" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="547.6" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2020</text><line x1="627.9" y1="24" x2="627.9" y2="420" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="627.9" y="438" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2025</text><line x1="656.8" y1="24" x2="656.8" y2="420" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/><text x="656.8" y="18" font-size="11" text-anchor="end" fill="currentColor" stroke="none">today</text><text x="120" y="46" font-size="13" text-anchor="end" fill="currentColor" stroke="none">SSL 2.0</text><rect x="146.1" y="34" width="257" height="16" rx="3" class="soft" stroke="none"/><text x="409" y="46" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">RFC 6176 prohibits</text><text x="120" y="72" font-size="13" text-anchor="end" fill="currentColor" stroke="none">SSL 3.0</text><rect x="162.1" y="60" width="305.2" height="16" rx="3" class="soft" stroke="none"/><text x="473.3" y="72" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">POODLE; RFC 7568</text><text x="120" y="98" font-size="13" text-anchor="end" fill="currentColor" stroke="none">TLS 1.0</text><rect x="210.3" y="86" width="353.3" height="16" rx="3" class="soft" stroke="none"/><text x="569.6" y="98" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">RFC 8996</text><text x="120" y="124" font-size="13" text-anchor="end" fill="currentColor" stroke="none">TLS 1.1</text><rect x="322.7" y="112" width="240.9" height="16" rx="3" class="soft" stroke="none"/><text x="569.6" y="124" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">RFC 8996</text><text x="120" y="150" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">TLS 1.2</text><rect x="354.8" y="138" width="301.9" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="354.8" y="138" width="301.9" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="176" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">TLS 1.3</text><rect x="515.5" y="164" width="141.3" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="515.5" y="164" width="141.3" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="202" font-size="13" text-anchor="end" fill="currentColor" stroke="none">SSH-1</text><rect x="146.1" y="190" width="353.3" height="16" rx="3" class="soft" stroke="none"/><text x="505.4" y="202" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">OpenSSH drops it</text><text x="120" y="228" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">SSH-2</text><rect x="162.1" y="216" width="494.7" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="162.1" y="216" width="494.7" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="168.1" y="228" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">RFCs 2006</text><text x="120" y="254" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">OTR</text><rect x="290.6" y="242" width="366.2" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="290.6" y="242" width="366.2" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="280" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">Signal Protocol</text><rect x="435.2" y="268" width="221.6" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="435.2" y="268" width="221.6" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="306" font-size="13" text-anchor="end" fill="currentColor" stroke="none">WEP</text><rect x="178.2" y="294" width="112.4" height="16" rx="3" class="soft" stroke="none"/><text x="296.6" y="306" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">replaced by 802.11i</text><text x="120" y="332" font-size="13" text-anchor="end" fill="currentColor" stroke="none">WPA (TKIP)</text><rect x="274.5" y="320" width="144.5" height="16" rx="3" class="soft" stroke="none"/><text x="425.1" y="332" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">TKIP deprecated</text><text x="120" y="358" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">WPA2</text><rect x="290.6" y="346" width="366.2" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="290.6" y="346" width="366.2" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="384" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">WPA3</text><rect x="515.5" y="372" width="141.3" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="515.5" y="372" width="141.3" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="120" y="410" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">WireGuard</text><rect x="499.4" y="398" width="157.4" height="16" rx="3" class="soft-acc" stroke="none"/><rect x="499.4" y="398" width="157.4" height="16" rx="3" class="acc" fill="none" stroke-width="1.2"/><text x="340" y="472" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">highlighted: still in use (TLS 1.2 is legacy, kept for compatibility)</text></svg>
<figcaption>Figure 19.2. The protocols of this chapter, from first release to retirement. Almost every retired version was retired because of an attack told in this chapter.</figcaption>
</figure>

## 19.2 TLS: thirty years of lessons

TLS (Transport Layer Security) protects HTTPS, most email between servers, and
countless apps. Its history is the history of applied cryptography.

In 1994 Netscape wanted people to type credit-card numbers into web pages. Its
engineers designed the **Secure Sockets Layer**. Version 1.0 was never
released; SSL 2.0 shipped in Netscape Navigator in 1995 and had serious flaws,
including no protection for the handshake itself, so an attacker could quietly
strike strong ciphers from the list both sides saw. SSL 3.0, redesigned in 1996
by Paul Kocher with Netscape's Phil Karlton and Alan Freier, fixed most of them,
and its outline survives: exchange random values, prove the server's identity
with a certificate, agree on a key with public-key cryptography (at first by
encrypting a random secret to the server's RSA key), then protect everything
with a symmetric cipher and a MAC. The IETF took the protocol over and renamed
it TLS: 1.0 in 1999 (RFC 2246), 1.1 in 2006, 1.2 in 2008 (RFC 5246).

Each version patched the attacks on the last. The list is long, and it is the
best map of what goes wrong:

| Year | Attack | What it exploited | Chapter |
|---|---|---|---|
| 1998 | Bleichenbacher | RSA PKCS#1 v1.5 padding errors | [18](18-Side-Channels.md) |
| 2002 | Vaudenay padding oracle | CBC padding errors, MAC-then-encrypt | [18](18-Side-Channels.md) |
| 2009 | Renegotiation (Marsh Ray) | a new handshake inside an old one, not bound to it | 19.4 |
| 2011 | BEAST | predictable CBC IVs in TLS 1.0 | [17](17-Defining-Security.md) |
| 2012 | CRIME | compression before encryption leaks length | 19.4 |
| 2013 | Lucky Thirteen; RC4 biases | MAC timing; RC4's biased keystream | [18](18-Side-Channels.md), [5](05-Stream-Ciphers.md) |
| 2014 | Heartbleed | a buffer over-read in OpenSSL (not cryptography at all) | 19.4 |
| 2014 | POODLE; Triple Handshake | SSL 3.0 padding; sessions not bound to the transcript | [18](18-Side-Channels.md), [17](17-Defining-Security.md) |
| 2015 | FREAK; Logjam | 1990s export-grade RSA and DH still accepted | 19.4 |
| 2016 | DROWN; Sweet32 | SSL 2.0 as a Bleichenbacher oracle; 64-bit blocks | [18](18-Side-Channels.md), [17](17-Defining-Security.md) |
| 2017 | ROBOT | Bleichenbacher again | [18](18-Side-Channels.md) |

TLS 1.3 was the answer: four years of open design with academic analysts
checking each draft, 28 drafts in all, published in August 2018 as RFC 8446.
It removed almost everything on that list instead of patching it: RSA key
transport, CBC mode, RC4, compression, renegotiation, static and custom
Diffie-Hellman groups, export ciphers, and MD5 and SHA-1 in signatures. Every
full handshake now uses ephemeral Diffie-Hellman, so recorded traffic stays safe
even if the server's key is stolen later, and the handshake takes one round
trip instead of two.

!!! note "Life story: SSL and TLS 1.0 to 1.2"
    **Born:** 1994 to 1995 at Netscape (SSL 2.0), redesigned in 1996 (SSL 3.0, Paul Kocher with Phil Karlton and
    Alan Freier), standardized by the IETF as TLS 1.0 (1999), 1.1 (2006) and 1.2 (2008) · **Purpose:** let people
    type credit-card numbers into web pages · **Helped:** made e-commerce and HTTPS possible; for two decades it
    protected almost all web traffic · **Retired:** SSL 2.0 in 2011 (RFC 6176), SSL 3.0 in 2015 after POODLE
    (RFC 7568), TLS 1.0 and 1.1 in 2021 (RFC 8996); TLS 1.2 is still allowed but legacy · **Replaced by:** TLS 1.3

!!! note "Life story: TLS 1.3"
    **Born:** 2014 to 2018, IETF TLS working group, edited by Eric Rescorla, with academic teams analyzing the
    drafts; RFC 8446, August 2018 · **Purpose:** remove every feature behind twenty years of attacks, and save a
    round trip · **Helped:** most HTTPS connections now use it; QUIC (HTTP/3) is built on its handshake ·
    **Status:** current; hybrid post-quantum key exchange (X25519MLKEM768) is now on by default in major browsers

## 19.3 The TLS 1.3 handshake, step by step

*Level: intermediate.*

Here is a full handshake as a browser opens `https://example.com`. Messages in
braces are encrypted. Press Step to follow it.

<div class="mars-steps" markdown>

1. **ClientHello** (client to server, in the clear). A 32-byte random value; the list of cipher suites it accepts (for example `TLS_AES_128_GCM_SHA256`, `TLS_CHACHA20_POLY1305_SHA256`); `supported_versions` saying TLS 1.3; `supported_groups` and a `key_share`: an ephemeral public key for the group it guesses the server will pick, such as X25519 or the post-quantum hybrid X25519MLKEM768; `signature_algorithms`; and `server_name`, the site it wants.
2. **ServerHello** (server to client, in the clear). Its own random value, the chosen suite, and its own ephemeral `key_share`. Now both sides compute the Diffie-Hellman shared secret ([Chapter 12](12-Diffie-Hellman.md)) and derive **handshake keys** from it and from the hash of the two Hello messages. Everything after this is encrypted.
3. **{EncryptedExtensions}**. Settings that need no secrecy but don't have to be public either, such as the application protocol (HTTP/2).
4. **{Certificate}**. The server's certificate chain ([Chapter 16](16-PKI-and-Key-Establishment.md)), which binds the name `example.com` to a public signature key.
5. **{CertificateVerify}**. A signature with that key over the **hash of the whole transcript so far**. This proves the server holds the private key *and* that it saw exactly these Hello messages, including the client's offers.
6. **{Finished}** (server). An HMAC, under a key derived from the handshake secret, over the transcript hash. It confirms that both sides derived the same keys from the same conversation.
7. The client checks the chain against its trust store, the name, the signature and the Finished MAC, then sends its own **{Finished}**. Both derive **application keys** from the full transcript, and HTTP requests flow, encrypted with the AEAD.

</div>

<figure class="mars-fig" id="fig-19-tls13">
<svg viewBox="0 0 660 430" width="660" role="img" aria-label="TLS 1.3 full handshake between client and server, with the point where keys are derived"><rect x="70" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="70" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><text x="130" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">browser</text><line x1="130" y1="62" x2="130" y2="420" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="470" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="470" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><text x="530" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">example.com</text><line x1="530" y1="62" x2="530" y2="420" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="130" y1="90" x2="530" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="530,90 522.7,93.3 522.7,86.7" fill="currentColor" stroke="none"/><text x="330" y="84" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">ClientHello + key_share (X25519 public key)</text><line x1="530" y1="130" x2="130" y2="130" stroke="currentColor" stroke-width="1.5"/><polygon points="130,130 137.3,126.7 137.3,133.3" fill="currentColor" stroke="none"/><text x="330" y="124" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">ServerHello + key_share</text><rect x="470" y="142" width="120" height="28" rx="6" class="soft-acc" stroke="none"/><rect x="470" y="142" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="160.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">handshake keys</text><rect x="70" y="142" width="120" height="28" rx="6" class="soft-acc" stroke="none"/><rect x="70" y="142" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="160.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">handshake keys</text><line x1="530" y1="200" x2="130" y2="200" class="acc" stroke-width="1.5"/><polygon points="130,200 137.3,196.7 137.3,203.3" class="acc-fill" stroke="none"/><text x="330" y="194" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{EncryptedExtensions}</text><line x1="530" y1="228" x2="130" y2="228" class="acc" stroke-width="1.5"/><polygon points="130,228 137.3,224.7 137.3,231.3" class="acc-fill" stroke="none"/><text x="330" y="222" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{Certificate}</text><line x1="530" y1="256" x2="130" y2="256" class="acc" stroke-width="1.5"/><polygon points="130,256 137.3,252.7 137.3,259.3" class="acc-fill" stroke="none"/><text x="330" y="250" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{CertificateVerify}: signature over transcript</text><line x1="530" y1="284" x2="130" y2="284" class="acc" stroke-width="1.5"/><polygon points="130,284 137.3,280.7 137.3,287.3" class="acc-fill" stroke="none"/><text x="330" y="278" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{Finished}: HMAC over transcript</text><rect x="70" y="296" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="314.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">check, then</text><line x1="130" y1="350" x2="530" y2="350" class="acc" stroke-width="1.5"/><polygon points="530,350 522.7,353.3 522.7,346.7" class="acc-fill" stroke="none"/><text x="330" y="344" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{Finished}</text><rect x="470" y="362" width="120" height="28" rx="6" class="soft-acc" stroke="none"/><rect x="470" y="362" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="380.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">application keys</text><rect x="70" y="362" width="120" height="28" rx="6" class="soft-acc" stroke="none"/><rect x="70" y="362" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="380.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">application keys</text><line x1="130" y1="406" x2="530" y2="406" class="acc" stroke-width="1.5"/><polygon points="530,406 522.7,409.3 522.7,402.7" class="acc-fill" stroke="none"/><polygon points="130,406 137.3,402.7 137.3,409.3" class="acc-fill" stroke="none"/><text x="330" y="400" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">[HTTP requests and responses, AEAD]</text><text x="330" y="172" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">everything below is encrypted</text><line x1="200" y1="178" x2="460" y2="178" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" stroke-opacity="0.7"/></svg>
<figcaption>Figure 19.3. The TLS 1.3 handshake. Messages in braces are encrypted. After one round trip both sides hold the same keys, bound to a transcript that the server has signed and both sides have MACed.</figcaption>
</figure>

That is one round trip before the client can send data. Every tool in the book
appears once: random numbers (step 1), Diffie-Hellman on an elliptic curve
(steps 1 and 2), hash functions (the transcript), HKDF (all the keys), a
signature and a certificate (steps 4 and 5), HMAC (step 6), AEAD (everything
after step 2).

<figure class="mars-fig" id="fig-19-rtt">
<svg viewBox="0 0 660 330" width="660" role="img" aria-label="TLS 1.2 needs two round trips before data, TLS 1.3 needs one"><text x="160" y="20" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">TLS 1.2 (RSA or ECDHE)</text><text x="50" y="44" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><line x1="50" y1="52" x2="50" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><text x="270" y="44" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><line x1="270" y1="52" x2="270" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="50" y1="80" x2="270" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="270,80 262.7,83.3 262.7,76.7" fill="currentColor" stroke="none"/><text x="160" y="74" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ClientHello</text><line x1="270" y1="125" x2="50" y2="125" stroke="currentColor" stroke-width="1.5"/><polygon points="50,125 57.3,121.7 57.3,128.3" fill="currentColor" stroke="none"/><text x="160" y="119" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ServerHello, Certificate, KeyExchange</text><line x1="50" y1="175" x2="270" y2="175" stroke="currentColor" stroke-width="1.5"/><polygon points="270,175 262.7,178.3 262.7,171.7" fill="currentColor" stroke="none"/><text x="160" y="169" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">KeyExchange, Finished</text><line x1="270" y1="220" x2="50" y2="220" stroke="currentColor" stroke-width="1.5"/><polygon points="50,220 57.3,216.7 57.3,223.3" fill="currentColor" stroke="none"/><text x="160" y="214" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">Finished</text><line x1="50" y1="275" x2="270" y2="275" class="acc" stroke-width="1.5"/><polygon points="270,275 262.7,278.3 262.7,271.7" class="acc-fill" stroke="none"/><text x="160" y="269" font-size="12" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">first request</text><text x="500" y="20" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">TLS 1.3</text><text x="390" y="44" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><line x1="390" y1="52" x2="390" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><text x="610" y="44" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><line x1="610" y1="52" x2="610" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="390" y1="80" x2="610" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="610,80 602.7,83.3 602.7,76.7" fill="currentColor" stroke="none"/><text x="500" y="74" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ClientHello + key_share</text><line x1="610" y1="125" x2="390" y2="125" stroke="currentColor" stroke-width="1.5"/><polygon points="390,125 397.3,121.7 397.3,128.3" fill="currentColor" stroke="none"/><text x="500" y="119" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ServerHello … {Finished}</text><line x1="390" y1="175" x2="610" y2="175" class="acc" stroke-width="1.5"/><polygon points="610,175 602.7,178.3 602.7,171.7" class="acc-fill" stroke="none"/><text x="500" y="169" font-size="12" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">first request</text><text x="160" y="300" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">2 round trips</text><text x="500" y="300" font-size="13" text-anchor="middle" font-weight="700" class="acc-fill" stroke="none">1 round trip</text><line x1="330" y1="30" x2="330" y2="310" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/></svg>
<figcaption>Figure 19.4. TLS 1.3 sends its key share in the very first message, guessing the group, so the client can send its request after one round trip instead of two.</figcaption>
</figure>

**The signed content.** In step 5 the server does not sign just the transcript
hash. It signs 64 space characters, then the text `TLS 1.3, server
CertificateVerify`, a zero byte, and the hash. The prefix keeps a TLS 1.3
signature from ever being valid as a signature in an older TLS version or as
the client's, a cheap defense against cross-protocol attacks.

**Downgrade protection.** If an attacker strips TLS 1.3 from the ClientHello,
a TLS 1.3 server that ends up speaking TLS 1.2 sets the last 8 bytes of its
random value to `44 4F 57 4E 47 52 44 01`, which is ASCII `DOWNGRD` followed by
1. The random value is covered by the old version's signature, so the attacker
cannot remove the marker, and a TLS 1.3 client that sees it aborts.

### The key schedule

All keys come from a chain of HKDF steps ([Chapter 11](11-Passwords-and-Key-Derivation.md))
defined in RFC 8446 §7.1. HKDF-Extract mixes in new secret material; a
"Derive-Secret" step expands it with a label and the hash of the transcript so
far:

$$
\begin{aligned}
\text{early} &= \mathrm{Extract}(0,\; \mathit{PSK} \text{ or } 0) \\
\text{handshake} &= \mathrm{Extract}\big(\mathrm{Derive}(\text{early}, \texttt{"derived"}),\; \mathit{ECDHE}\big) \\
\text{c hs}, \text{s hs} &= \mathrm{Derive}(\text{handshake},\; \texttt{"c hs traffic"} \text{ / } \texttt{"s hs traffic"},\; H(\text{ClientHello} \ldots \text{ServerHello})) \\
\text{master} &= \mathrm{Extract}\big(\mathrm{Derive}(\text{handshake}, \texttt{"derived"}),\; 0\big) \\
\text{c ap}, \text{s ap} &= \mathrm{Derive}(\text{master},\; \texttt{"c ap traffic"} \text{ / } \texttt{"s ap traffic"},\; H(\text{ClientHello} \ldots \text{server Finished}))
\end{aligned}
$$

Each traffic secret then gives an AEAD key and a 12-byte IV with the labels
`key` and `iv`. The nonce for record number $i$ is the IV XOR $i$, so nonces
never repeat within a key, as [Chapter 17](17-Defining-Security.md) requires.

<figure class="mars-fig" id="fig-19-schedule">
<svg viewBox="0 0 660 470" width="660" role="img" aria-label="TLS 1.3 key schedule: three HKDF-Extract steps producing early, handshake and master secrets"><text x="250" y="16" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">0</text><line x1="250" y1="22" x2="250" y2="40" stroke="currentColor" stroke-width="1.5"/><polygon points="250,40 246.7,32.7 253.3,32.7" fill="currentColor" stroke="none"/><rect x="195" y="40" width="110" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="59.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Extract</text><line x1="50" y1="55" x2="195" y2="55" stroke="currentColor" stroke-width="1.5"/><polygon points="195,55 187.7,58.3 187.7,51.7" fill="currentColor" stroke="none"/><text x="45" y="60" font-size="13" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">PSK or 0</text><line x1="250" y1="70" x2="250" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="250,90 246.7,82.7 253.3,82.7" fill="currentColor" stroke="none"/><rect x="160" y="90" width="180" height="34" rx="6" class="soft" stroke="none"/><rect x="160" y="90" width="180" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="111.5" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">early secret</text><line x1="250" y1="124" x2="250" y2="146" stroke="currentColor" stroke-width="1.5"/><polygon points="250,146 246.7,138.7 253.3,138.7" fill="currentColor" stroke="none"/><text x="258" y="140" font-size="12" text-anchor="start" fill="currentColor" stroke="none">Derive "derived"</text><rect x="195" y="146" width="110" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="165.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Extract</text><line x1="50" y1="161" x2="195" y2="161" stroke="currentColor" stroke-width="1.5"/><polygon points="195,161 187.7,164.3 187.7,157.7" fill="currentColor" stroke="none"/><text x="45" y="166" font-size="13" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">(EC)DHE</text><line x1="250" y1="176" x2="250" y2="196" stroke="currentColor" stroke-width="1.5"/><polygon points="250,196 246.7,188.7 253.3,188.7" fill="currentColor" stroke="none"/><rect x="160" y="196" width="180" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="160" y="196" width="180" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="217.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">handshake secret</text><line x1="250" y1="230" x2="250" y2="252" stroke="currentColor" stroke-width="1.5"/><polygon points="250,252 246.7,244.7 253.3,244.7" fill="currentColor" stroke="none"/><text x="258" y="246" font-size="12" text-anchor="start" fill="currentColor" stroke="none">Derive "derived"</text><rect x="195" y="252" width="110" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="271.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Extract</text><line x1="50" y1="267" x2="195" y2="267" stroke="currentColor" stroke-width="1.5"/><polygon points="195,267 187.7,270.3 187.7,263.7" fill="currentColor" stroke="none"/><text x="45" y="272" font-size="13" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">0</text><line x1="250" y1="282" x2="250" y2="302" stroke="currentColor" stroke-width="1.5"/><polygon points="250,302 246.7,294.7 253.3,294.7" fill="currentColor" stroke="none"/><rect x="160" y="302" width="180" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="160" y="302" width="180" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250" y="323.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">master secret</text><line x1="340" y1="213" x2="400" y2="213" stroke="currentColor" stroke-width="1.5"/><polygon points="400,213 392.7,216.3 392.7,209.7" fill="currentColor" stroke="none"/><text x="408" y="202" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">c hs traffic, s hs traffic</text><text x="408" y="217" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">+ H(ClientHello … ServerHello)</text><line x1="340" y1="319" x2="400" y2="319" stroke="currentColor" stroke-width="1.5"/><polygon points="400,319 392.7,322.3 392.7,315.7" fill="currentColor" stroke="none"/><text x="408" y="301" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">c ap traffic, s ap traffic,</text><text x="408" y="316" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">exporter, resumption</text><text x="408" y="331" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">+ H(ClientHello … server Finished)</text><text x="408" y="116" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">binder key, early traffic (0-RTT)</text><line x1="340" y1="107" x2="400" y2="112" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><polygon points="400,112 392.4,114.6 393,108.1" fill="currentColor" stroke="none"/><rect x="390" y="384" width="250" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="515" y="408.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">each traffic secret →</text><text x="515" y="423.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">key (16 or 32 bytes), iv (12 bytes)</text><text x="250" y="400" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">Derive = HKDF-Expand-Label</text><text x="250" y="418" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">with a label and a transcript hash</text></svg>
<figcaption>Figure 19.5. The TLS 1.3 key schedule (RFC 8446 §7.1). Secret material enters from the left at three Extract steps; every key that leaves to the right is tied to the transcript so far.</figcaption>
</figure>

**Code it.** The whole schedule in the standard library. The ECDHE secret and the
transcript are stand-ins (in a real handshake they come from X25519 and the
actual messages), but the first two lines are the same in every TLS 1.3
handshake without a pre-shared key and SHA-256, so you can check them against
the published example handshake in RFC 8448:

```python
import hashlib, hmac

H = hashlib.sha256
def extract(salt, ikm):
    return hmac.new(salt, ikm, H).digest()

def expand_label(secret, label, context, length):     # RFC 8446 section 7.1
    full = b"tls13 " + label
    info = length.to_bytes(2, "big") + bytes([len(full)]) + full + bytes([len(context)]) + context
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(secret, t + info + bytes([i]), H).digest()
        out, i = out + t, i + 1
    return out[:length]

def derive(secret, label, transcript):
    return expand_label(secret, label, H(transcript).digest(), 32)

zeros = bytes(32)
early = extract(zeros, zeros)                         # no pre-shared key
print("early secret   ", early.hex()[:16])
salt = derive(early, b"derived", b"")
print("derived        ", salt.hex()[:16])

ecdhe = bytes(range(32))                              # stands in for the X25519 result
hello = b"ClientHello...ServerHello"                  # stands in for the real messages
hs = extract(salt, ecdhe)
c_hs = derive(hs, b"c hs traffic", hello)
s_hs = derive(hs, b"s hs traffic", hello)
key = expand_label(s_hs, b"key", b"", 16)             # AES-128-GCM key
iv = expand_label(s_hs, b"iv", b"", 12)
print("server hs key  ", key.hex())
print("server hs iv   ", iv.hex())
master = extract(derive(hs, b"derived", b""), zeros)
print("master secret  ", master.hex()[:16])
```

Output:

```
early secret    33ad0a1c607ec03b
derived         6f2615a108c702c5
server hs key   46d2f8e18b48e9be709147630995970d
server hs iv    e43e0b432d0b08feeda6b789
master secret   055796c9a2f048dd
```

**A real handshake.** Python's `ssl` module can run both ends of a TLS
connection in memory. This program makes a throwaway certificate (with the
`cryptography` package), runs a full handshake between a client and a server
object, and asks OpenSSL to write the traffic secrets to a "key log", the file
format Wireshark reads to decrypt captured traffic:

```python
# pip install cryptography   (only to make a test certificate)
import datetime, os, ssl, tempfile
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

key = ec.generate_private_key(ec.SECP256R1())
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test.example")])
now = datetime.datetime.now(datetime.timezone.utc)
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
        .public_key(key.public_key()).serial_number(1)
        .not_valid_before(now).not_valid_after(now + datetime.timedelta(days=1))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("test.example")]), False)
        .sign(key, hashes.SHA256()))
d = tempfile.mkdtemp()
with open(os.path.join(d, "c.pem"), "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))
    f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                              serialization.NoEncryption()))

srv = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
srv.load_cert_chain(os.path.join(d, "c.pem"))
cli = ssl.create_default_context(cafile=os.path.join(d, "c.pem"))
cli.keylog_filename = os.path.join(d, "keys.log")      # what Wireshark reads

bio = [ssl.MemoryBIO() for _ in range(4)]               # two one-way pipes
s = srv.wrap_bio(bio[0], bio[1], server_side=True)
c = cli.wrap_bio(bio[2], bio[3], server_hostname="test.example")
while True:                                             # pass bytes until both are done
    done = 0
    for me, out, other_in in ((c, bio[3], bio[0]), (s, bio[1], bio[2])):
        try:
            me.do_handshake()
            done += 1
        except ssl.SSLWantReadError:
            pass
        if out.pending:
            other_in.write(out.read())
    if done == 2:
        break
print(c.version(), c.cipher()[0])
for line in open(os.path.join(d, "keys.log")):
    if not line.startswith("#"):
        print(line.split()[0])
```

With Python 3.13 and OpenSSL 3.0.13 it printed:

```
TLSv1.3 TLS_AES_256_GCM_SHA384
SERVER_HANDSHAKE_TRAFFIC_SECRET
EXPORTER_SECRET
SERVER_TRAFFIC_SECRET_0
CLIENT_HANDSHAKE_TRAFFIC_SECRET
CLIENT_TRAFFIC_SECRET_0
```

Those are the secrets of the key schedule above ("s hs traffic", "s ap
traffic", and so on). Another TLS library may pick another suite or list the
lines in another order. This suite uses SHA-384, so its schedule runs HKDF with
SHA-384 instead of SHA-256. Change `server_hostname` to another name and the
handshake fails with a certificate error: step 7's name check at work.

**Resumption and 0-RTT.** After a handshake the server can send a ticket that
lets the client resume later with a pre-shared key (the PSK in the first line of
the schedule). With it, the client may send **0-RTT** "early data" in its very
first message. Early data has no forward secrecy and can be replayed by an
attacker, so servers should accept it only for requests that are safe to repeat.

**If the guess is wrong.** If the server supports none of the groups in the
client's `key_share`, it answers with a HelloRetryRequest naming one it does
support, and the handshake costs one more round trip.

## 19.4 What went wrong in TLS, and how 1.3 closed it

*Level: intermediate.*

Most of the attacks in the table in 19.2 are taught in other chapters. Four
more show protocol-level mistakes.

**Renegotiation (2009).** TLS allowed a new handshake inside an existing
connection, for example to ask for a client certificate. Marsh Ray and Steve
Dispensa noticed that the new handshake was not bound to the old one. An
attacker could open a connection to a bank, send the start of a request of its
own, then pass the victim's handshake through as a "renegotiation". The server
saw one connection whose first part came from the attacker and whose second part
came from the authenticated victim, and glued them together. The fix (RFC 5746,
2010) binds each renegotiation to the previous Finished messages. TLS 1.3 has
no renegotiation at all.

<figure class="mars-fig" id="fig-19-reneg">
<svg viewBox="0 0 660 390" width="660" role="img" aria-label="Renegotiation attack of 2009: the attacker's request is glued to the victim's authenticated session"><rect x="30" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="30" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Victim</text><line x1="90" y1="40" x2="90" y2="380" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="270" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="270" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Attacker</text><line x1="330" y1="40" x2="330" y2="380" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="510" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="510" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Bank server</text><line x1="570" y1="40" x2="570" y2="380" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="330" y1="75" x2="570" y2="75" stroke="currentColor" stroke-width="1.5"/><polygon points="570,75 562.7,78.3 562.7,71.7" fill="currentColor" stroke="none"/><polygon points="330,75 337.3,71.7 337.3,78.3" fill="currentColor" stroke="none"/><text x="450" y="69" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">TLS handshake 1</text><line x1="330" y1="110" x2="570" y2="110" class="acc" stroke-width="1.5"/><polygon points="570,110 562.7,113.3 562.7,106.7" class="acc-fill" stroke="none"/><text x="450" y="104" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">"GET /transfer?to=attacker …"</text><text x="450" y="125" font-size="11" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">sent inside session 1, unfinished</text><line x1="90" y1="160" x2="330" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="330,160 322.7,163.3 322.7,156.7" fill="currentColor" stroke="none"/><text x="210" y="154" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">ClientHello (victim)</text><line x1="330" y1="195" x2="570" y2="195" stroke="currentColor" stroke-width="1.5"/><polygon points="570,195 562.7,198.3 562.7,191.7" fill="currentColor" stroke="none"/><text x="450" y="189" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">victim's handshake, tunneled as</text><text x="450" y="210" font-size="11" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">a renegotiation of session 1</text><line x1="90" y1="245" x2="570" y2="245" stroke="currentColor" stroke-width="1.5"/><polygon points="570,245 562.7,248.3 562.7,241.7" fill="currentColor" stroke="none"/><polygon points="90,245 97.3,241.7 97.3,248.3" fill="currentColor" stroke="none"/><text x="330" y="239" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">handshake 2: victim proves who it is (certificate or cookie)</text><line x1="90" y1="290" x2="570" y2="290" stroke="currentColor" stroke-width="1.5"/><polygon points="570,290 562.7,293.3 562.7,286.7" fill="currentColor" stroke="none"/><text x="330" y="284" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">"Cookie: victim's login"</text><rect x="400" y="315" width="250" height="50" rx="6" class="soft-acc" stroke="none"/><rect x="400" y="315" width="250" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="525" y="336.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">server joins both parts:</text><text x="525" y="351.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">attacker's request + victim's login</text></svg>
<figcaption>Figure 19.6. The renegotiation attack (Marsh Ray and Steve Dispensa, 2009). The new handshake was not bound to the old one, so the server treated the attacker's prefix as part of the victim's authenticated session. RFC 5746 ties each renegotiation to the previous Finished messages.</figcaption>
</figure>

**CRIME (2012).** TLS could compress data before encrypting it. Compression
makes repeated strings shorter, and encryption does not hide length. Juliano
Rizzo and Thai Duong had a web page make the browser send requests containing a
guess next to its secret cookie; when the guess matched part of the cookie, the
compressed record was a byte shorter. TLS compression was turned off
everywhere, and TLS 1.3 removed it. The lesson, that encryption hides content
but not length, keeps coming back (BREACH did the same in 2013 with HTTP's own
compression).

**FREAK and Logjam (2015).** In the 1990s US export rules limited cryptography
sold abroad to 512-bit RSA and Diffie-Hellman. The rules were relaxed around
2000, but "export" cipher suites stayed in many servers. In FREAK, a bug in
many clients' state machines let an attacker in the middle make them accept a
512-bit RSA key, which could be factored in hours on rented cloud machines.
Logjam did the same for Diffie-Hellman, and its authors estimated that the
1024-bit groups most servers shared could be broken by a nation-state with a
one-time precomputation. Both were possible because a TLS 1.2 server signed its
key-exchange values but not the negotiation that came before them. In TLS 1.3 the server signs the whole
transcript (step 5), and the weak options no longer exist.

<figure class="mars-fig" id="fig-19-downgrade">
<svg viewBox="0 0 660 410" width="660" role="img" aria-label="Logjam-style downgrade: a man in the middle rewrites the cipher suite to export-grade Diffie-Hellman"><rect x="30" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="30" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><line x1="90" y1="40" x2="90" y2="400" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="270" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="270" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Attacker</text><line x1="330" y1="40" x2="330" y2="400" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="510" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="510" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><line x1="570" y1="40" x2="570" y2="400" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="90" y1="85" x2="330" y2="85" stroke="currentColor" stroke-width="1.5"/><polygon points="330,85 322.7,88.3 322.7,81.7" fill="currentColor" stroke="none"/><text x="210" y="79" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">ClientHello: DHE suites</text><line x1="330" y1="120" x2="570" y2="120" class="acc" stroke-width="1.5"/><polygon points="570,120 562.7,123.3 562.7,116.7" class="acc-fill" stroke="none"/><text x="450" y="114" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">ClientHello: DHE_EXPORT only</text><line x1="570" y1="160" x2="330" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="330,160 337.3,156.7 337.3,163.3" fill="currentColor" stroke="none"/><text x="450" y="154" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">ServerHello (EXPORT), 512-bit p, g, gˣ</text><line x1="570" y1="195" x2="330" y2="195" stroke="currentColor" stroke-width="1.5"/><polygon points="330,195 337.3,191.7 337.3,198.3" fill="currentColor" stroke="none"/><text x="450" y="189" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">signed: randoms, p, g, gˣ</text><line x1="330" y1="235" x2="90" y2="235" class="acc" stroke-width="1.5"/><polygon points="90,235 97.3,231.7 97.3,238.3" class="acc-fill" stroke="none"/><text x="210" y="229" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">ServerHello rewritten to DHE; same signed values</text><rect x="255" y="255" width="150" height="50" rx="6" class="soft-acc" stroke="none"/><rect x="255" y="255" width="150" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="276.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">breaks 512-bit</text><text x="330" y="291.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">discrete log</text><line x1="90" y1="330" x2="330" y2="330" stroke="currentColor" stroke-width="1.5"/><polygon points="330,330 322.7,333.3 322.7,326.7" fill="currentColor" stroke="none"/><text x="210" y="324" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Finished</text><line x1="330" y1="365" x2="90" y2="365" class="acc" stroke-width="1.5"/><polygon points="90,365 97.3,361.7 97.3,368.3" class="acc-fill" stroke="none"/><text x="210" y="359" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">forged Finished: client accepts</text><text x="330" y="396" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">the signature never covered the suite the client offered</text></svg>
<figcaption>Figure 19.7. Logjam in outline (2015). TLS 1.2's server signature covered the Diffie-Hellman values but not the negotiation, so the attacker could swap in export-grade parameters and solve the small discrete log fast enough to finish the handshake. TLS 1.3 signs the whole transcript.</figcaption>
</figure>

**Heartbleed (2014).** Not every disaster is cryptographic. A missing length
check in OpenSSL's "heartbeat" code let anyone read up to 64 KB of the server's
memory per request, including private keys. No protocol design can prevent
that; memory-safe languages, fuzzing and well-funded maintenance can. Two
months earlier, in February 2014, Apple had patched "goto fail": one duplicated
line, `goto fail;`, in its TLS code skipped the check of the server's signature
on the (EC)DHE key exchange, so any attacker in the middle could pose as any site to iPhones and Macs.

**What TLS 1.3 changed, in one table.**

| Problem in TLS 1.2 and older | TLS 1.3 |
|---|---|
| RSA key transport: no forward secrecy, Bleichenbacher | removed; ephemeral DH only |
| CBC with MAC-then-encrypt, RC4 | removed; AEAD only (AES-GCM, ChaCha20-Poly1305, AES-CCM) |
| compression | removed |
| renegotiation | removed |
| arbitrary DH groups, export suites | named groups only (RFC 7919 groups, curves, hybrids) |
| signature covered only part of the handshake | signature and Finished cover the full transcript |
| downgrade to older versions | `DOWNGRD` marker in the server random |
| handshake in the clear, including the certificate | encrypted from ServerHello on |

The remaining plaintext is mostly the ClientHello, whose `server_name` reveals
which site you are visiting. **Encrypted Client Hello** (ECH) encrypts it to a
key the server publishes in DNS, using HPKE ([Chapter 16](16-PKI-and-Key-Establishment.md)).

Full details, cipher suites and versions: [TLS 1.3 reference](../protocols/TLS-1.3.md),
[PKI reference](../protocols/PKI.md).

## 19.5 SSH

*Level: intermediate.*

In 1995 a password-sniffing attack on the network of the Helsinki University of
Technology prompted Tatu Ylönen, a researcher there, to write a replacement for
the remote-login tools of the time, which sent passwords in the clear. He
released **SSH** (Secure Shell) that July, and it spread to tens of thousands
of users within months. When later versions became commercial, the OpenBSD
project built a free one, **OpenSSH**, released in 1999. The redesigned SSH-2
protocol was published as RFCs 4251 to 4254 in 2006.

### How a connection works

Unlike TLS, SSH has no certificate authorities in the usual case. The client
**trusts on first use** (TOFU): the first time it connects to a server, it shows
the host key's fingerprint and asks; after that it remembers the key in
`~/.ssh/known_hosts` and refuses (with the famous "REMOTE HOST IDENTIFICATION
HAS CHANGED" warning) if the key ever changes.

1. Both sides send a version line, such as `SSH-2.0-OpenSSH_9.6`.
2. Each sends `KEXINIT`: ordered lists of key exchange, host key, cipher, MAC and
   compression algorithms. For each category the first algorithm on the
   **client's** list that the server also supports wins (TLS lets the server choose).
3. They run the key exchange, for example ECDH on Curve25519 or the hybrid
   `mlkem768x25519-sha256`. The server signs the **exchange hash** with its host
   key. For ECDH (RFC 5656) it is

    $$
    H = \mathrm{HASH}(V_C \,\Vert\, V_S \,\Vert\, I_C \,\Vert\, I_S \,\Vert\, K_S \,\Vert\, Q_C \,\Vert\, Q_S \,\Vert\, K),
    $$

    covering both version lines $V$, both `KEXINIT` messages $I$, the host key
    $K_S$, both ephemeral public keys $Q$ and the shared secret $K$: a transcript,
    as in TLS.
4. Keys come from $\mathrm{HASH}(K \,\Vert\, H \,\Vert\, X \,\Vert\, \mathit{session\_id})$, where $X$ is the
   single letter `A` to `F`: IVs, encryption keys and MAC keys for each direction
   (RFC 4253 §7.2). Both send `NEWKEYS` and switch on encryption.
5. The user authenticates, usually by signing data that includes the session
   identifier with their own key, so the signature cannot be replayed into
   another session.
6. One connection then carries many **channels**: shells, commands, port
   forwarding, file transfer.

<figure class="mars-fig" id="fig-19-ssh">
<svg viewBox="0 0 660 430" width="660" role="img" aria-label="SSH-2 connection: versions, KEXINIT, ECDH key exchange with host-key signature, NEWKEYS, user authentication, channels"><rect x="70" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="70" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><text x="130" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">remembers host keys</text><line x1="130" y1="62" x2="130" y2="420" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="470" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="470" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><text x="530" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">host key K<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="530" y1="62" x2="530" y2="420" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="130" y1="85" x2="530" y2="85" stroke="currentColor" stroke-width="1.5"/><polygon points="530,85 522.7,88.3 522.7,81.7" fill="currentColor" stroke="none"/><polygon points="130,85 137.3,81.7 137.3,88.3" fill="currentColor" stroke="none"/><text x="330" y="79" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">SSH-2.0-OpenSSH_9.6  (version lines V<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan>, V<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan>)</text><line x1="130" y1="120" x2="530" y2="120" stroke="currentColor" stroke-width="1.5"/><polygon points="530,120 522.7,123.3 522.7,116.7" fill="currentColor" stroke="none"/><polygon points="130,120 137.3,116.7 137.3,123.3" fill="currentColor" stroke="none"/><text x="330" y="114" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">KEXINIT: algorithm lists I<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan>, I<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="130" y1="155" x2="530" y2="155" stroke="currentColor" stroke-width="1.5"/><polygon points="530,155 522.7,158.3 522.7,151.7" fill="currentColor" stroke="none"/><text x="330" y="149" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">KEX_ECDH_INIT: Q<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="530" y1="195" x2="130" y2="195" class="acc" stroke-width="1.5"/><polygon points="130,195 137.3,191.7 137.3,198.3" class="acc-fill" stroke="none"/><text x="330" y="189" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">KEX_ECDH_REPLY: K<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan>, Q<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan>, signature over H</text><rect x="60" y="210" width="140" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="60" y="210" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="228.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">check K<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan> against</text><text x="130" y="243.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">known_hosts (TOFU)</text><line x1="130" y1="285" x2="530" y2="285" stroke="currentColor" stroke-width="1.5"/><polygon points="530,285 522.7,288.3 522.7,281.7" fill="currentColor" stroke="none"/><polygon points="130,285 137.3,281.7 137.3,288.3" fill="currentColor" stroke="none"/><text x="330" y="279" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">NEWKEYS: encryption on (keys from K, H, "A" … "F")</text><line x1="130" y1="330" x2="530" y2="330" class="acc" stroke-width="1.5"/><polygon points="530,330 522.7,333.3 522.7,326.7" class="acc-fill" stroke="none"/><text x="330" y="324" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">{USERAUTH: signature over session id}</text><line x1="130" y1="375" x2="530" y2="375" class="acc" stroke-width="1.5"/><polygon points="530,375 522.7,378.3 522.7,371.7" class="acc-fill" stroke="none"/><polygon points="130,375 137.3,371.7 137.3,378.3" class="acc-fill" stroke="none"/><text x="330" y="369" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">{channels: shell, port forwarding, sftp}</text><text x="330" y="412" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">H = HASH(V<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan> ‖ V<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan> ‖ I<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan> ‖ I<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan> ‖ K<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan> ‖ Q<tspan dy="4" font-size="9">C</tspan><tspan dy="-4">&#8203;</tspan> ‖ Q<tspan dy="4" font-size="9">S</tspan><tspan dy="-4">&#8203;</tspan> ‖ K)</text></svg>
<figcaption>Figure 19.8. An SSH-2 connection. The host key signs the exchange hash H, which covers the whole negotiation; the user's signature covers the session identifier, so it cannot be replayed into another session.</figcaption>
</figure>

### What went wrong

- **SSH-1's CRC-32 (1998 to 2001).** SSH-1 protected integrity with CRC-32, a
  checksum, inside the encryption. CRC is linear, so in 1998 Ariel Futoransky and
  Emiliano Kargieman of Core SDI showed how to insert data with a correct
  checksum. The patch, a "CRC-32 compensation attack detector", itself had an
  integer overflow that allowed remote code execution (2001). It became famous
  when the film *The Matrix Reloaded* (2003) showed Trinity breaking in with it.
  SSH-1 was abandoned for SSH-2, which uses real MACs.
- **SSH-2's packet format (2002, 2009).** SSH-2 used encrypt-and-MAC with CBC and
  IVs chained between packets. Bellare, Kohno and Namprempre showed in 2002 that
  this is not IND-CPA ([Chapter 17](17-Defining-Security.md)), and CTR modes were
  added (RFC 4344). In 2009 Martin Albrecht, Kenneth Paterson and Gaven Watson
  recovered plaintext from OpenSSH in CBC mode: SSH encrypts the packet length,
  and the server decrypted the first block to learn the length, then waited for
  that many bytes before checking the MAC. Feeding it a target block as a "first
  block" and watching when it gave up revealed bits of the plaintext. The answer
  was AEAD modes (`aes128-gcm@openssh.com`, `chacha20-poly1305@openssh.com`) and
  encrypt-then-MAC (`hmac-sha2-256-etm@openssh.com`).
- **Keystroke timing (2001).** In interactive sessions SSH sends each keystroke
  in its own packet as you type. Dawn Song, David Wagner and Xuqing Tian showed
  in 2001 that the timing between packets reveals information about what is typed,
  including passwords typed inside the session. OpenSSH 9.5 (2023) added
  keystroke timing obfuscation, sending packets at fixed intervals with chaff.
- **Debian's random numbers (2008).** Debian's OpenSSL generated keys from at
  most 32,768 seeds for two years ([Chapter 4](04-Randomness-and-Perfect-Secrecy.md)).
  Every SSH host and user key made on those systems was guessable, and any DSA key
  merely *used* on them leaked through its weak signature nonces.
- **Terrapin (2023).** Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk found that
  an attacker in the middle could add messages during the unencrypted handshake,
  shifting the packet sequence numbers, and then delete the same number of
  messages at the start of the encrypted phase without detection. The integrity
  check covers each packet and its sequence number, but nothing checked that the
  *first* encrypted packets were all there. It could strip the message that
  negotiates extensions, disabling keystroke obfuscation or downgrading
  signature algorithms. It worked against ChaCha20-Poly1305 and the
  encrypt-then-MAC modes. The fix, "strict key exchange" in OpenSSH 9.6
  (December 2023), resets sequence numbers at each key exchange and rejects any
  unexpected message during it.
- **The xz backdoor (2024).** On 29 March 2024 Andres Freund, a developer at
  Microsoft, noticed that SSH logins on a test system were half a second slower
  than they should be. He traced it to a backdoor that a maintainer of the xz
  compression library had prepared over two years. Through a chain of library loading
  on some Linux distributions, it replaced a function OpenSSH used to check RSA
  keys, letting the holder of one specific private key run commands on any
  affected server. It was caught before it reached most stable releases. The
  cryptography was fine; the supply chain was not.

<figure class="mars-fig" id="fig-19-terrapin">
<svg viewBox="0 0 660 400" width="660" role="img" aria-label="Terrapin: the attacker injects one message in the plaintext phase and deletes one in the encrypted phase"><rect x="30" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="30" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><line x1="90" y1="40" x2="90" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="270" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="270" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Attacker</text><line x1="330" y1="40" x2="330" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="510" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="510" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Server</text><line x1="570" y1="40" x2="570" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><text x="330" y="72" font-size="12" text-anchor="middle" font-weight="600" fill-opacity="0.85" fill="currentColor" stroke="none">unencrypted handshake</text><line x1="570" y1="100" x2="90" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="90,100 97.3,96.7 97.3,103.3" fill="currentColor" stroke="none"/><text x="330" y="94" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">KEXINIT, KEX …</text><line x1="330" y1="135" x2="90" y2="135" class="acc" stroke-width="1.5"/><polygon points="90,135 97.3,131.7 97.3,138.3" class="acc-fill" stroke="none"/><text x="210" y="129" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">IGNORE (injected)</text><text x="210" y="150" font-size="11" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">client's receive counter +1</text><line x1="90" y1="175" x2="570" y2="175" stroke="currentColor" stroke-width="1.5"/><polygon points="570,175 562.7,178.3 562.7,171.7" fill="currentColor" stroke="none"/><polygon points="90,175 97.3,171.7 97.3,178.3" fill="currentColor" stroke="none"/><text x="330" y="169" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">NEWKEYS</text><text x="330" y="200" font-size="12" text-anchor="middle" font-weight="600" fill-opacity="0.85" fill="currentColor" stroke="none">encrypted (sequence numbers continue)</text><line x1="570" y1="230" x2="330" y2="230" stroke="currentColor" stroke-width="1.5"/><polygon points="330,230 337.3,226.7 337.3,233.3" fill="currentColor" stroke="none"/><text x="450" y="224" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">EXT_INFO  (seq n)</text><text x="320" y="252" font-size="13" text-anchor="end" font-weight="700" class="acc-fill" stroke="none">✗ deleted</text><line x1="570" y1="290" x2="90" y2="290" stroke="currentColor" stroke-width="1.5"/><polygon points="90,290 97.3,286.7 97.3,293.3" fill="currentColor" stroke="none"/><text x="330" y="284" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">next message (seq n + 1)</text><rect x="20" y="310" width="260" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="310" width="260" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="328.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">client expected n + 1: MAC checks out,</text><text x="150" y="343.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">EXT_INFO never noticed missing</text><text x="330" y="380" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">fix (OpenSSH 9.6, 2023): strict key exchange resets counters at NEWKEYS</text></svg>
<figcaption>Figure 19.9. The Terrapin attack (2023). One injected message before encryption and one deleted message after it cancel out in the sequence numbers, so every MAC still verifies.</figcaption>
</figure>

!!! note "Life story: SSH-1"
    **Born:** July 1995, Tatu Ylönen at the Helsinki University of Technology, after a password-sniffing attack on
    its network · **Purpose:** replace telnet, rlogin and rsh, which sent passwords in the clear · **Helped:** spread
    to tens of thousands of users within months and ended cleartext remote login · **Retired:** its CRC-32
    integrity check fell in 1998 and its patch in 2001; OpenSSH dropped SSH-1 completely in 2017 ·
    **Replaced by:** SSH-2

!!! note "Life story: SSH-2 and OpenSSH"
    **Born:** SSH-2 designed from 1996, published as RFCs 4251 to 4254 in 2006; OpenSSH released by the OpenBSD
    project in 1999 · **Purpose:** a redesigned protocol with real MACs and negotiable algorithms, and a free
    implementation · **Helped:** became the way every server on the internet is administered · **Status:**
    current; repaired over time with CTR, encrypt-then-MAC and AEAD modes, strict key exchange after Terrapin, and
    hybrid post-quantum key exchange (mlkem768x25519-sha256 is the default in recent OpenSSH)

Full details, algorithms and key choices: [SSH reference](../protocols/SSH.md).

## 19.6 Signal: encryption that heals

*Level: intermediate.*

TLS and SSH protect a connection between two machines that are online at the
same time. Messaging is different. Alice may write to Bob while his phone is
off; conversations last for years; phones get lost, seized or infected. The
goals are also stronger: the server in the middle should learn nothing, a key
stolen today should not open yesterday's messages (**forward secrecy**), and a
thief who copies a phone's keys once should be locked out again soon
(**post-compromise security**).

**History.** In 2004 Nikita Borisov, Ian Goldberg and Eric Brewer designed
**Off-the-Record messaging** (OTR) for instant messaging. It ran a new
Diffie-Hellman exchange as messages went back and forth and deleted old keys,
giving forward secrecy; and it authenticated with MACs rather than signatures,
so a transcript proves nothing to a third party (**deniability**). But it
needed both people online. In 2010 Moxie Marlinspike and Stuart Anderson's
company Whisper Systems released TextSecure, an encrypted SMS app. In 2013
Marlinspike and Trevor Perrin designed the **Axolotl ratchet**, later renamed
the **Double Ratchet**, which combined OTR's Diffie-Hellman ratchet with a hash
ratchet and worked when the other side was offline, using keys left on the
server. The app became Signal. WhatsApp finished turning on the Signal Protocol
for all its users in April 2016, and Google Messages and others followed. In
2017 Katriel Cohn-Gordon, Cas Cremers, Benjamin Dowling, Luke Garratt and Douglas
Stebila published the first formal security analysis of the protocol.

!!! note "Life story: Off-the-Record messaging (OTR)"
    **Born:** 2004, Nikita Borisov, Ian Goldberg and Eric Brewer (Berkeley) · **Purpose:** private instant
    messaging that is forward-secret and deniable, like a conversation in person · **Helped:** introduced the
    ratcheting Diffie-Hellman idea to messaging and was used through plug-ins for Pidgin and Adium · **Status:**
    still specified, but it needs both people online; the Signal Protocol took its place

### X3DH: starting a conversation with someone offline

Bob, when he installs the app, uploads to the server:

- his long-term **identity key** $IK_B$,
- a **signed prekey** $SPK_B$, signed with $IK_B$ and replaced every so often,
- a batch of **one-time prekeys** $OPK_B$, each used once and then deleted.

Alice fetches this bundle, checks the signature, makes an **ephemeral key**
$EK_A$, and computes four Diffie-Hellman values (X25519, [Chapter 15](15-Elliptic-Curves.md)):

$$
\begin{aligned}
DH_1 &= DH(IK_A, SPK_B) && \text{Alice's identity, Bob's prekey} \\
DH_2 &= DH(EK_A, IK_B) && \text{Alice's ephemeral, Bob's identity} \\
DH_3 &= DH(EK_A, SPK_B) && \text{ephemeral and prekey: forward secrecy} \\
DH_4 &= DH(EK_A, OPK_B) && \text{ephemeral and one-time key: more forward secrecy}
\end{aligned}
$$

and then

$$
SK = \mathrm{HKDF}(\texttt{FF} \ldots \texttt{FF} \,\Vert\, DH_1 \,\Vert\, DH_2 \,\Vert\, DH_3 \,\Vert\, DH_4) .
$$

$DH_1$ and $DH_2$ authenticate both sides (only the owners of the identity
keys can compute them); $DH_3$ and $DH_4$ involve keys that are deleted soon,
which gives forward secrecy. No signature covers the conversation itself, so it
stays deniable. Alice sends her first message with $IK_A$ and $EK_A$ attached, and
Bob computes the same four values with his private keys.

<figure class="mars-fig" id="fig-19-x3dh">
<svg viewBox="0 0 660 330" width="660" role="img" aria-label="X3DH: four Diffie-Hellman values between Alice's identity and ephemeral keys and Bob's identity, signed prekey and one-time prekey"><text x="110" y="30" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">Alice</text><text x="550" y="30" font-size="15" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">Bob (keys on the server)</text><rect x="40" y="68" width="140" height="44" rx="6" class="soft" stroke="none"/><rect x="40" y="68" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="110" y="86.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">IK<tspan dy="4" font-size="9">A</tspan><tspan dy="-4">&#8203;</tspan></text><text x="110" y="101.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">identity</text><rect x="40" y="198" width="140" height="44" rx="6" class="soft" stroke="none"/><rect x="40" y="198" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="110" y="216.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">EK<tspan dy="4" font-size="9">A</tspan><tspan dy="-4">&#8203;</tspan></text><text x="110" y="231.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ephemeral</text><rect x="480" y="38" width="140" height="44" rx="6" class="soft" stroke="none"/><rect x="480" y="38" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="550" y="56.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">IK<tspan dy="4" font-size="9">B</tspan><tspan dy="-4">&#8203;</tspan></text><text x="550" y="71.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">identity</text><rect x="480" y="138" width="140" height="44" rx="6" class="soft" stroke="none"/><rect x="480" y="138" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="550" y="156.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">SPK<tspan dy="4" font-size="9">B</tspan><tspan dy="-4">&#8203;</tspan></text><text x="550" y="171.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">signed prekey</text><rect x="480" y="238" width="140" height="44" rx="6" class="soft" stroke="none"/><rect x="480" y="238" width="140" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="550" y="256.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">OPK<tspan dy="4" font-size="9">B</tspan><tspan dy="-4">&#8203;</tspan></text><text x="550" y="271.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">one-time prekey</text><line x1="180" y1="90" x2="480" y2="160" stroke="currentColor" stroke-width="1.5"/><text x="270" y="105" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">DH1</text><line x1="180" y1="220" x2="480" y2="60" stroke="currentColor" stroke-width="1.5"/><text x="285" y="158" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">DH2</text><line x1="180" y1="220" x2="480" y2="160" class="acc" stroke-width="2"/><text x="285" y="193" font-size="13" text-anchor="middle" font-weight="700" class="acc-fill" stroke="none">DH3</text><line x1="180" y1="220" x2="480" y2="260" class="acc" stroke-width="2"/><text x="285" y="228" font-size="13" text-anchor="middle" font-weight="700" class="acc-fill" stroke="none">DH4</text><rect x="200" y="288" width="260" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="200" y="288" width="260" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="309.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">SK = HKDF(DH1 ‖ DH2 ‖ DH3 ‖ DH4)</text><text x="110" y="300" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">DH1, DH2: who</text><text x="560" y="310" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">DH3, DH4: forward secrecy</text></svg>
<figcaption>Figure 19.10. X3DH. Alice combines her two keys with Bob's three in four Diffie-Hellman operations. The identity pairs prove who is talking; the pairs with keys Bob deletes soon give forward secrecy.</figcaption>
</figure>

Since 2023 Signal uses **PQXDH**, which adds a fifth secret from a post-quantum
KEM (Kyber, now standardized as ML-KEM, [Chapter 21](21-Lattice-Cryptography.md))
so that recorded first messages stay safe from a future quantum computer.

### The Double Ratchet

After X3DH both sides hold $SK$, and every message gets its own key from two
interlocking ratchets:

- **The symmetric (hash) ratchet.** Each sending direction has a **chain key**
  $CK$. For each message, $MK = \mathrm{HMAC}(CK, \texttt{01})$ is the message key
  and $CK \leftarrow \mathrm{HMAC}(CK, \texttt{02})$ is the next chain key. Used
  keys are deleted. HMAC is one-way, so a stolen chain key gives future keys in
  that chain but not past ones: forward secrecy.
- **The Diffie-Hellman ratchet.** Every message carries the sender's current
  **ratchet public key**. When the conversation changes direction, the new
  sender makes a fresh ratchet key pair and mixes a new DH result into the
  **root key**: $(RK, CK) \leftarrow$
  $\mathrm{HKDF}(RK, DH(\text{new}, \text{theirs}))$.
  A thief who copied the state before this step does not have the new private
  key, so after one round trip the thief is locked out: post-compromise security.

<figure class="mars-fig" id="fig-19-ratchet">
<svg viewBox="0 0 660 380" width="660" role="img" aria-label="Double Ratchet: a root chain fed by new Diffie-Hellman outputs starts sending chains; each chain step gives one message key"><rect x="10" y="40" width="90" height="36" rx="6" class="soft" stroke="none"/><rect x="10" y="40" width="90" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="55" y="62.5" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">RK₀ = SK</text><line x1="100" y1="58" x2="135" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="135,58 127.7,61.3 127.7,54.7" fill="currentColor" stroke="none"/><rect x="135" y="40" width="90" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="180" y="62.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">KDF</text><line x1="180" y1="18" x2="180" y2="40" stroke="currentColor" stroke-width="1.5"/><polygon points="180,40 176.7,32.7 183.3,32.7" fill="currentColor" stroke="none"/><text x="180" y="14" font-size="11" text-anchor="middle" class="acc-fill" stroke="none">DH(new ratchet key)</text><text x="270" y="52" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">RK₁</text><line x1="180" y1="76" x2="180" y2="110" stroke="currentColor" stroke-width="1.5"/><polygon points="180,110 176.7,102.7 183.3,102.7" fill="currentColor" stroke="none"/><text x="180" y="118" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Alice → Bob</text><rect x="140" y="130" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="140" y="130" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="180" y="149.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="220" y1="145" x2="250" y2="145" stroke="currentColor" stroke-width="1.5"/><polygon points="250,145 242.7,148.3 242.7,141.7" fill="currentColor" stroke="none"/><rect x="250" y="132" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="250" y="132" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="275" y="149.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="180" y1="160" x2="180" y2="200" stroke="currentColor" stroke-width="1.5"/><polygon points="180,200 176.7,192.7 183.3,192.7" fill="currentColor" stroke="none"/><rect x="140" y="200" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="140" y="200" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="180" y="219.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="220" y1="215" x2="250" y2="215" stroke="currentColor" stroke-width="1.5"/><polygon points="250,215 242.7,218.3 242.7,211.7" fill="currentColor" stroke="none"/><rect x="250" y="202" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="250" y="202" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="275" y="219.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="180" y1="230" x2="180" y2="270" stroke="currentColor" stroke-width="1.5"/><polygon points="180,270 176.7,262.7 183.3,262.7" fill="currentColor" stroke="none"/><rect x="140" y="270" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="140" y="270" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="180" y="289.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="220" y1="285" x2="250" y2="285" stroke="currentColor" stroke-width="1.5"/><polygon points="250,285 242.7,288.3 242.7,281.7" fill="currentColor" stroke="none"/><rect x="250" y="272" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="250" y="272" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="275" y="289.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="225" y1="58" x2="315" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="315,58 307.7,61.3 307.7,54.7" fill="currentColor" stroke="none"/><rect x="315" y="40" width="90" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="360" y="62.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">KDF</text><line x1="360" y1="18" x2="360" y2="40" stroke="currentColor" stroke-width="1.5"/><polygon points="360,40 356.7,32.7 363.3,32.7" fill="currentColor" stroke="none"/><text x="360" y="14" font-size="11" text-anchor="middle" class="acc-fill" stroke="none">DH(new ratchet key)</text><text x="450" y="52" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">RK₂</text><line x1="360" y1="76" x2="360" y2="110" stroke="currentColor" stroke-width="1.5"/><polygon points="360,110 356.7,102.7 363.3,102.7" fill="currentColor" stroke="none"/><text x="360" y="118" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Bob → Alice</text><rect x="320" y="130" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="320" y="130" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="360" y="149.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="400" y1="145" x2="430" y2="145" stroke="currentColor" stroke-width="1.5"/><polygon points="430,145 422.7,148.3 422.7,141.7" fill="currentColor" stroke="none"/><rect x="430" y="132" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="430" y="132" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="455" y="149.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="360" y1="160" x2="360" y2="200" stroke="currentColor" stroke-width="1.5"/><polygon points="360,200 356.7,192.7 363.3,192.7" fill="currentColor" stroke="none"/><rect x="320" y="200" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="320" y="200" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="360" y="219.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="400" y1="215" x2="430" y2="215" stroke="currentColor" stroke-width="1.5"/><polygon points="430,215 422.7,218.3 422.7,211.7" fill="currentColor" stroke="none"/><rect x="430" y="202" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="430" y="202" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="455" y="219.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="360" y1="230" x2="360" y2="270" stroke="currentColor" stroke-width="1.5"/><polygon points="360,270 356.7,262.7 363.3,262.7" fill="currentColor" stroke="none"/><rect x="320" y="270" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="320" y="270" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="360" y="289.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="400" y1="285" x2="430" y2="285" stroke="currentColor" stroke-width="1.5"/><polygon points="430,285 422.7,288.3 422.7,281.7" fill="currentColor" stroke="none"/><rect x="430" y="272" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="430" y="272" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="455" y="289.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="405" y1="58" x2="495" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="495,58 487.7,61.3 487.7,54.7" fill="currentColor" stroke="none"/><rect x="495" y="40" width="90" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="62.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">KDF</text><line x1="540" y1="18" x2="540" y2="40" stroke="currentColor" stroke-width="1.5"/><polygon points="540,40 536.7,32.7 543.3,32.7" fill="currentColor" stroke="none"/><text x="540" y="14" font-size="11" text-anchor="middle" class="acc-fill" stroke="none">DH(new ratchet key)</text><line x1="540" y1="76" x2="540" y2="110" stroke="currentColor" stroke-width="1.5"/><polygon points="540,110 536.7,102.7 543.3,102.7" fill="currentColor" stroke="none"/><text x="540" y="118" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Alice → Bob</text><rect x="500" y="130" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="500" y="130" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="149.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="580" y1="145" x2="610" y2="145" stroke="currentColor" stroke-width="1.5"/><polygon points="610,145 602.7,148.3 602.7,141.7" fill="currentColor" stroke="none"/><rect x="610" y="132" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="610" y="132" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="635" y="149.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="540" y1="160" x2="540" y2="200" stroke="currentColor" stroke-width="1.5"/><polygon points="540,200 536.7,192.7 543.3,192.7" fill="currentColor" stroke="none"/><rect x="500" y="200" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="500" y="200" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="219.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="580" y1="215" x2="610" y2="215" stroke="currentColor" stroke-width="1.5"/><polygon points="610,215 602.7,218.3 602.7,211.7" fill="currentColor" stroke="none"/><rect x="610" y="202" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="610" y="202" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="635" y="219.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><line x1="540" y1="230" x2="540" y2="270" stroke="currentColor" stroke-width="1.5"/><polygon points="540,270 536.7,262.7 543.3,262.7" fill="currentColor" stroke="none"/><rect x="500" y="270" width="80" height="30" rx="6" class="soft" stroke="none"/><rect x="500" y="270" width="80" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="289.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">CK</text><line x1="580" y1="285" x2="610" y2="285" stroke="currentColor" stroke-width="1.5"/><polygon points="610,285 602.7,288.3 602.7,281.7" fill="currentColor" stroke="none"/><rect x="610" y="272" width="50" height="26" rx="6" class="soft-acc" stroke="none"/><rect x="610" y="272" width="50" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="635" y="289.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">MK</text><text x="591" y="62" font-size="16" text-anchor="start" fill="currentColor" stroke="none">…</text><text x="90" y="180" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">symmetric</text><text x="90" y="196" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">ratchet:</text><text x="90" y="212" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">CK → next CK</text><text x="90" y="228" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">and one MK</text><text x="330" y="362" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">old CKs and MKs are deleted: forward secrecy.  New DH input: post-compromise security.</text></svg>
<figcaption>Figure 19.11. The two ratchets. Across the top, every change of direction mixes a fresh Diffie-Hellman result into the root key; down each column, HMAC steps the chain key once per message and drops one message key (MK).</figcaption>
</figure>

**Code it.** Here is X3DH followed by a minimal Double Ratchet, using X25519 and
AES-GCM from the `cryptography` package and HKDF written with `hmac`. It leaves
out what the real protocol needs for messages that arrive out of order, and it
skips the prekey signature. At the end, Eve steals Bob's whole state:

```python
# pip install cryptography   (for X25519 and AES-GCM)
import copy, hashlib, hmac
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

def new_key():
    return X25519PrivateKey.generate()

def pub(k):
    return k.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

def dh(k, p):
    return k.exchange(X25519PublicKey.from_public_bytes(p))

def hkdf(salt, ikm, info, n):
    prk, t, out = hmac.new(salt, ikm, hashlib.sha256).digest(), b"", b""
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([len(out) // 32 + 1]), hashlib.sha256).digest()
        out += t
    return out[:n]

# X3DH. Bob left identity IK_B, signed prekey SPK_B and one-time OPK_B on the server.
IK_B, SPK_B, OPK_B = new_key(), new_key(), new_key()
IK_A, EK_A = new_key(), new_key()
a = dh(IK_A, pub(SPK_B)) + dh(EK_A, pub(IK_B)) + dh(EK_A, pub(SPK_B)) + dh(EK_A, pub(OPK_B))
b = dh(SPK_B, pub(IK_A)) + dh(IK_B, pub(EK_A)) + dh(SPK_B, pub(EK_A)) + dh(OPK_B, pub(EK_A))
SK = hkdf(bytes(32), b"\xff" * 32 + a, b"X3DH demo", 32)
print("X3DH agrees:", SK == hkdf(bytes(32), b"\xff" * 32 + b, b"X3DH demo", 32))

class Party:                                  # the Double Ratchet, minus out-of-order messages
    def __init__(self, rk, dhs, their=None):
        self.rk, self.dhs, self.their, self.cks, self.ckr = rk, dhs, their, None, None
        if their:                             # the first sender ratchets at once
            self.rk, self.cks = self.kdf_rk(dh(dhs, their))

    def kdf_rk(self, dh_out):                 # DH ratchet step: new root key and chain key
        k = hkdf(self.rk, dh_out, b"ratchet", 64)
        return k[:32], k[32:]

    @staticmethod
    def kdf_ck(ck):                           # symmetric ratchet: next chain key, message key
        return (hmac.new(ck, b"\x02", hashlib.sha256).digest(),
                hmac.new(ck, b"\x01", hashlib.sha256).digest())

    def send(self, text):
        self.cks, mk = self.kdf_ck(self.cks)
        head = pub(self.dhs)
        return head, AESGCM(mk).encrypt(bytes(12), text, head)

    def receive(self, head, ct):
        if head != self.their:                # a new ratchet key: two DH steps
            self.their = head
            self.rk, self.ckr = self.kdf_rk(dh(self.dhs, head))
            self.dhs = new_key()
            self.rk, self.cks = self.kdf_rk(dh(self.dhs, head))
        self.ckr, mk = self.kdf_ck(self.ckr)
        return AESGCM(mk).decrypt(bytes(12), ct, head)

alice = Party(SK, new_key(), pub(SPK_B))      # Bob's signed prekey is his first ratchet key
bob = Party(SK, SPK_B)
print(bob.receive(*alice.send(b"hi Bob")))
print(alice.receive(*bob.send(b"hi Alice")))

eve = copy.copy(bob)                          # Eve steals Bob's whole state here
m = alice.send(b"are you free at 6?")
print("Eve reads:", eve.receive(*m))          # the theft works for now...
bob.receive(*m)
alice.receive(*bob.send(b"yes"))              # ...until a round trip brings new DH keys
m = alice.send(b"see you then")
print(bob.receive(*m))
try:
    eve.receive(*m)
except Exception as err:
    print("Eve fails:", type(err).__name__)
```

Output:

```
X3DH agrees: True
b'hi Bob'
b'hi Alice'
Eve reads: b'are you free at 6?'
b'see you then'
Eve fails: InvalidTag
```

Every message key is used once with a zero nonce, which is safe only because
each key encrypts exactly one message. (Signal itself derives an AES-CBC key, an
HMAC key and an IV from each message key; see the [Signal reference](../protocols/Signal.md).)
Eve read the message sent while her copy was current. Then Bob made a new
ratchet key she never saw, and her copy was useless.

### What went wrong, and what it doesn't cover

The Signal Protocol's core has held up well; the problems were around it.

- **Group chats.** Paul Rösler, Christian Mainka and Jörg Schwenk showed in 2018
  that in WhatsApp's groups the server controlled membership, so the server (or
  someone controlling it) could add a member to a group without the others'
  approval, beyond a notice in the chat. Signal later rebuilt its groups with
  anonymous credentials and zero-knowledge proofs ([Chapter 23](23-Advanced-Protocols.md)).
  For large groups the IETF designed a separate protocol, **MLS** (RFC 9420, 2023).
- **Who, not what.** End-to-end encryption hides content, not metadata: the
  server sees who sends to whom and when. Signal's "sealed sender" (2018) hides
  the sender from the server for most messages.
- **Checking the keys.** Everything rests on Alice having Bob's real identity
  key. Apps show **safety numbers** to compare in person, which few people do;
  key transparency logs are the newer answer.
- **Analysis catches spec gaps.** When Signal published PQXDH in 2023, a formal
  analysis by Karthikeyan Bhargavan, Charlie Jacomme, Franziskus Kiefer and Rolfe
  Schmidt found weaknesses in the first version of the specification, which
  Signal revised. That is the process of [Chapter 17](17-Defining-Security.md)
  working as intended.

!!! note "Life story: the Signal Protocol"
    **Born:** 2013, Trevor Perrin and Moxie Marlinspike (the Axolotl, later Double, Ratchet) for TextSecure, which
    became Signal · **Purpose:** forward-secret, self-healing encryption for phones that are often offline ·
    **Helped:** WhatsApp turned it on for all users in April 2016, and Google Messages, Facebook Messenger and
    others followed, bringing end-to-end encryption to billions of people · **Status:** current; PQXDH (2023) and
    the SPQR post-quantum ratchet (2025) extend it against quantum computers

## 19.7 Wi-Fi: from WEP to WPA3

*Level: intermediate.*

Wi-Fi sends every packet through the air, to anyone with an antenna. Its
security history is the clearest set of cautionary tales in this book.

### WEP (1997): every mistake at once

The original IEEE 802.11 standard (1997) included **Wired Equivalent Privacy**.
Each packet was encrypted with RC4 ([Chapter 5](05-Stream-Ciphers.md)) under a
key made by **prepending a 24-bit IV to the shared key** (40 bits, later 104),
with a CRC-32 checksum for integrity.

<figure class="mars-fig" id="fig-19-wep">
<svg viewBox="0 0 660 260" width="660" role="img" aria-label="WEP encryption: a 24-bit IV prepended to the shared key seeds RC4; data plus CRC-32 is XORed with the keystream; the IV travels in clear"><rect x="20" y="30" width="90" height="36" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="30" width="90" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="65" y="52.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IV (24 bits)</text><rect x="110" y="30" width="150" height="36" rx="6" class="soft" stroke="none"/><rect x="110" y="30" width="150" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="185" y="52.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">shared key (40 or 104)</text><line x1="140" y1="66" x2="140" y2="96" stroke="currentColor" stroke-width="1.5"/><polygon points="140,96 136.7,88.7 143.3,88.7" fill="currentColor" stroke="none"/><rect x="90" y="96" width="100" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="140" y="118.5" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">RC4</text><line x1="190" y1="114" x2="300" y2="114" stroke="currentColor" stroke-width="1.5"/><polygon points="300,114 292.7,117.3 292.7,110.7" fill="currentColor" stroke="none"/><text x="245" y="106" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">keystream</text><circle cx="316" cy="114" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="316" y="119" font-size="18" text-anchor="middle" fill="currentColor" stroke="none">⊕</text><rect x="380" y="30" width="160" height="36" rx="6" class="soft" stroke="none"/><rect x="380" y="30" width="160" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="460" y="52.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">data ‖ CRC-32(data)</text><path d="M460 66 L460 80 L316 80 L316 100" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="316,100 312.7,92.7 319.3,92.7" fill="currentColor" stroke="none"/><line x1="330" y1="114" x2="420" y2="114" stroke="currentColor" stroke-width="1.5"/><polygon points="420,114 412.7,117.3 412.7,110.7" fill="currentColor" stroke="none"/><rect x="420" y="96" width="120" height="36" rx="6" class="soft" stroke="none"/><rect x="420" y="96" width="120" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="480" y="118.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ciphertext</text><text x="330" y="168" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">frame on the air:</text><rect x="180" y="180" width="90" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="180" y="180" width="90" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="225" y="201.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IV (clear)</text><rect x="270" y="180" width="200" height="34" rx="6" class="soft" stroke="none"/><rect x="270" y="180" width="200" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="370" y="201.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ciphertext</text><text x="20" y="236" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">2²⁴ IVs repeat within hours; CRC-32 is linear, so bits can be flipped and the checksum fixed;</text><text x="20" y="251" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">a public IV next to a fixed key is exactly what Fluhrer, Mantin and Shamir's RC4 attack needs.</text></svg>
<figcaption>Figure 19.12. WEP's packet encryption. Each of its three parts fails on its own: the nonce is too short, the integrity check is linear, and RC4 leaks keys built this way.</figcaption>
</figure>

- **Nonce reuse.** 24 bits of IV means only about 16.8 million keystreams. A busy
  network repeats them within hours, and many cards started the IV at 0 on every
  reset. Two packets under the same keystream XOR to the XOR of their plaintexts.
- **No real integrity.** CRC-32 is linear, so an attacker can flip bits in the
  ciphertext and fix the checksum without knowing the key (Nikita Borisov, Ian
  Goldberg and David Wagner, 2001).
- **Related keys in RC4.** In 2001 Scott Fluhrer, Itsik Mantin and Adi Shamir
  showed that RC4 keys made from a public IV and a fixed secret leak the secret
  through the first keystream bytes. Within weeks there were tools; by 2007
  Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin recovered a 104-bit key
  in under a minute from about 40,000 packets.

The cost was real: the attackers behind the TJX breach, disclosed in 2007,
first got in through a store's WEP-protected network, and at least 45 million
card numbers were stolen.

!!! note "Life story: WEP"
    **Born:** 1997, in the first IEEE 802.11 standard; key sizes held to 40 bits at first by US export rules ·
    **Purpose:** make wireless as private as a cable ("wired equivalent") · **Broken:** 2001 (Borisov, Goldberg and
    Wagner; Fluhrer, Mantin and Shamir), with key recovery in under a minute by 2007 · **Retired:** superseded by
    IEEE 802.11i in 2004, and later dropped from Wi-Fi certification · **Replaced by:** WPA (TKIP) as a stopgap,
    then WPA2

### WPA2 and the 4-way handshake

After an interim fix, WPA with TKIP (2003), which wrapped RC4 in per-packet key
mixing so old hardware could run it, the full redesign IEEE 802.11i (2004)
arrived as **WPA2**: AES in CCM mode (CCMP) and a **4-way handshake** that turns
a pairwise master key (PMK) into fresh session keys.

In WPA2-Personal the PMK comes from the password alone
([Chapter 11](11-Passwords-and-Key-Derivation.md)):

$$
\mathit{PMK} = \mathrm{PBKDF2}(\text{HMAC-SHA1}, \text{passphrase}, \text{SSID}, 4096, 256 \text{ bits}) .
$$

Then:

<div class="mars-steps" markdown>

1. The access point sends a random **ANonce**.
2. The client picks an **SNonce** and computes the session key PTK $= \mathrm{PRF}(\mathit{PMK},\ \text{both MAC addresses},\ \text{both nonces})$, split into a key for handshake MICs (KCK), a key-wrapping key (KEK) and the traffic key (TK). It sends the SNonce with a MIC under the KCK.
3. The AP computes the same PTK, checks the MIC, and sends the group key (for broadcast traffic) wrapped under the KEK, with a MIC.
4. The client acknowledges and **installs** the keys. Data frames are now encrypted with AES-CCM, using a 48-bit packet number as part of the nonce.

</div>

<figure class="mars-fig" id="fig-19-4way">
<svg viewBox="0 0 660 360" width="660" role="img" aria-label="The WPA2 4-way handshake between access point and client"><rect x="470" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="470" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Access point</text><text x="530" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">knows PMK</text><line x1="530" y1="62" x2="530" y2="350" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="70" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="70" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><text x="130" y="56" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">knows PMK</text><line x1="130" y1="62" x2="130" y2="350" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="530" y1="90" x2="130" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="130,90 137.3,86.7 137.3,93.3" fill="currentColor" stroke="none"/><text x="330" y="84" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">1. ANonce</text><rect x="55" y="104" width="150" height="30" rx="6" class="soft" stroke="none"/><rect x="55" y="104" width="150" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="123.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">PTK = PRF(PMK, …)</text><line x1="130" y1="160" x2="530" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="530,160 522.7,163.3 522.7,156.7" fill="currentColor" stroke="none"/><text x="330" y="154" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">2. SNonce + MIC (under KCK)</text><rect x="455" y="174" width="150" height="30" rx="6" class="soft" stroke="none"/><rect x="455" y="174" width="150" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="530" y="193.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">same PTK; check MIC</text><line x1="530" y1="230" x2="130" y2="230" class="acc" stroke-width="1.5"/><polygon points="130,230 137.3,226.7 137.3,233.3" class="acc-fill" stroke="none"/><text x="330" y="224" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">3. group key (wrapped by KEK) + MIC</text><rect x="55" y="244" width="150" height="30" rx="6" class="soft-acc" stroke="none"/><rect x="55" y="244" width="150" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="263.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">install PTK, PN = 0</text><line x1="130" y1="300" x2="530" y2="300" stroke="currentColor" stroke-width="1.5"/><polygon points="530,300 522.7,303.3 522.7,296.7" fill="currentColor" stroke="none"/><text x="330" y="294" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">4. ACK + MIC</text><line x1="130" y1="335" x2="530" y2="335" class="acc" stroke-width="1.5"/><polygon points="530,335 522.7,338.3 522.7,331.7" class="acc-fill" stroke="none"/><polygon points="130,335 137.3,331.7 137.3,338.3" class="acc-fill" stroke="none"/><text x="330" y="329" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">data frames: AES-CCM, nonce includes packet number</text></svg>
<figcaption>Figure 19.13. The 4-way handshake in WPA2. Messages 1 and 2 travel in the clear and, in WPA2-Personal, depend only on the password; that is what makes a recorded handshake testable offline.</figcaption>
</figure>

**The offline attack.** Everything in steps 1 and 2 travels in the clear, except
the PMK. So an attacker who records one handshake can test password guesses at
home: for each guess compute the PMK, the PTK and the MIC, and compare. No
contact with the network is needed, and nothing limits the number of guesses
but the attacker's hardware. Here is the attack against a handshake recorded in
a test network (the same data as in the [Wi-Fi reference](../protocols/Wi-Fi.md)):

```python
import hashlib, hmac

# Recorded from one WPA2-PSK handshake (SSID "IEEE"): addresses, both nonces, the MIC in message 2
ssid = b"IEEE"
aa, spa = bytes.fromhex("020000000000"), bytes.fromhex("020000000200")
anonce = bytes.fromhex("477400533b80b46a2a03c637fae04598fdf03c06b56e01551699960f33aa55b6")
snonce = bytes.fromhex("d34e0d83d9e5997fccd94974c97b5456976b666f6cebf891e20bc00a4460ab2b")
mic = bytes.fromhex("4470e6b894b7255f204ec8a4aeea0a66")
rsne = bytes.fromhex("30140100000fac040100000fac040100000fac020000")
msg2 = (bytes.fromhex("0103007502010a0000") + (1).to_bytes(8, "big") + snonce
        + bytes(48) + len(rsne).to_bytes(2, "big") + rsne)        # message 2, MIC zeroed
data = min(aa, spa) + max(aa, spa) + min(anonce, snonce) + max(anonce, snonce)

def try_password(pw):
    pmk = hashlib.pbkdf2_hmac("sha1", pw.encode(), ssid, 4096, 32)
    kck = hmac.new(pmk, b"Pairwise key expansion\0" + data + b"\0", hashlib.sha1).digest()[:16]
    return hmac.new(kck, msg2, hashlib.sha1).digest()[:16] == mic

for pw in ["123456789", "qwertyuiop", "letmein!", "iloveyou", "password", "sunshine"]:
    if try_password(pw):
        print("found:", pw)
        break
```

Output:

```
found: password
```

Each guess costs 4,096 iterations of HMAC-SHA1 (two SHA-1 compressions each),
which graphics cards do hundreds of thousands of times per second. The SSID as
salt only stops tables shared across networks with different names. In 2018
Jens Steube, the author of hashcat, found that many access points send a
**PMKID** (an HMAC of the PMK and the two addresses) in their first message,
so an attacker does not even need to wait for a client to connect.

<figure class="mars-fig" id="fig-19-crack">
<svg viewBox="0 0 660 200" width="660" role="img" aria-label="Offline password guessing against a recorded WPA2 handshake"><rect x="10" y="30" width="118" height="56" rx="6" class="soft" stroke="none"/><rect x="10" y="30" width="118" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="69" y="54.9" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">guess</text><text x="69" y="68.8" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">"password"</text><line x1="128" y1="58" x2="140" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="140,58 132.7,61.3 132.7,54.7" fill="currentColor" stroke="none"/><rect x="140" y="30" width="118" height="56" rx="6" class="soft-acc" stroke="none"/><rect x="140" y="30" width="118" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="199" y="54.9" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">PBKDF2-SHA1</text><text x="199" y="68.8" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">4096 rounds, SSID</text><line x1="258" y1="58" x2="270" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="270,58 262.7,61.3 262.7,54.7" fill="currentColor" stroke="none"/><rect x="270" y="30" width="118" height="56" rx="6" class="soft" stroke="none"/><rect x="270" y="30" width="118" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="329" y="54.9" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">PMK</text><text x="329" y="68.8" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">256 bits</text><line x1="388" y1="58" x2="400" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="400,58 392.7,61.3 392.7,54.7" fill="currentColor" stroke="none"/><rect x="400" y="30" width="118" height="56" rx="6" class="soft" stroke="none"/><rect x="400" y="30" width="118" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="459" y="54.9" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">PRF-SHA1</text><text x="459" y="68.8" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">addresses, nonces</text><line x1="518" y1="58" x2="530" y2="58" stroke="currentColor" stroke-width="1.5"/><polygon points="530,58 522.7,61.3 522.7,54.7" fill="currentColor" stroke="none"/><rect x="530" y="30" width="118" height="56" rx="6" class="soft" stroke="none"/><rect x="530" y="30" width="118" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="589" y="54.9" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">KCK → MIC</text><text x="589" y="68.8" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">HMAC over msg 2</text><line x1="590" y1="86" x2="590" y2="120" stroke="currentColor" stroke-width="1.5"/><polygon points="590,120 586.7,112.7 593.3,112.7" fill="currentColor" stroke="none"/><rect x="470" y="120" width="180" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="560" y="142.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">= recorded MIC ?</text><text x="240" y="130" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no → next guess</text><text x="240" y="148" font-size="12" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">yes → found the password</text><text x="330" y="186" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">no network contact needed; the cost is set by the 4096 rounds and the attacker's GPUs</text></svg>
<figcaption>Figure 19.14. The offline attack from the program above, as a pipeline. Everything except the guess was captured from the air.</figcaption>
</figure>

Two more failures came from features around the handshake. **WPS** (Wi-Fi
Protected Setup) let devices join with an 8-digit PIN; in 2011 Stefan Viehböck
showed the AP confirmed the two halves separately and the last digit was a
checksum, so at most $10^4 + 10^3 = 11{,}000$ guesses find it.

!!! note "Life story: WPA and WPA2"
    **Born:** WPA in 2003, a Wi-Fi Alliance stopgap with TKIP so that WEP hardware could be upgraded by software;
    WPA2 in 2004, the full IEEE 802.11i design with AES-CCM · **Purpose:** repair WEP · **Helped:** protected almost
    every Wi-Fi network for fifteen years · **Retired:** TKIP was deprecated in IEEE 802.11-2012; WPA2 is still
    common, but weakened by offline guessing and KRACK · **Replaced by:** WPA3 (2018)

### KRACK (2017): a proven handshake, broken

The 4-way handshake had a published security proof (2005). In 2017 Mathy
Vanhoef and Frank Piessens broke it anyway, with **key reinstallation attacks**.
Message 3 can be lost in the air, so the standard says the AP should resend it,
and a client that receives it again should install the key again. Installing the
key resets the packet number, which is part of the CCM nonce. An attacker in
the middle replays message 3, the client reinstalls the same key, and starts
encrypting new packets with **nonces it has already used**.

In CTR-based modes, a repeated nonce means a repeated keystream
([Chapter 8](08-Modes-of-Operation.md)), and two ciphertexts XOR to the two
plaintexts XORed. If the attacker knows or guesses one plaintext, it reads the
other:

```python
import hashlib

def keystream(key, nonce, n):             # any stream cipher: here SHA-256 in counter mode
    out = b""
    for i in range(0, n, 32):
        out += hashlib.sha256(key + nonce + i.to_bytes(4, "big")).digest()
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key, pn = b"k" * 16, (1).to_bytes(6, "big")    # KRACK resets the packet number to 1
c1 = xor(b"GET /login HTTP/1.1", keystream(key, pn, 19))
c2 = xor(b"user=jim&pass=hunter2", keystream(key, pn, 21))   # same key, same nonce
known = b"GET /login HTTP/1.1"                # the attacker guesses the first packet
print(xor(xor(c1, c2), known))
```

Output:

```
b'user=jim&pass=hunte'
```

(The last two bytes are missing only because the known plaintext is two bytes
shorter.) Worse, Linux's and Android's `wpa_supplicant` versions 2.4 and 2.5
cleared the key from memory after installing it, so a reinstall installed an
**all-zero key**, and the attacker could decrypt everything. The proof was
correct; it simply did not model *when* keys are installed. Patches made
clients refuse to reinstall a key already in use.

<figure class="mars-fig" id="fig-19-krack">
<svg viewBox="0 0 660 400" width="660" role="img" aria-label="KRACK: the attacker blocks message 4 so the access point resends message 3, and the client reinstalls the key and resets its nonce"><rect x="30" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="30" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Client</text><line x1="90" y1="40" x2="90" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="270" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="270" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Attacker (relay)</text><line x1="330" y1="40" x2="330" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="510" y="10" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="510" y="10" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="29.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Access point</text><line x1="570" y1="40" x2="570" y2="390" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="570" y1="85" x2="90" y2="85" stroke="currentColor" stroke-width="1.5"/><polygon points="90,85 97.3,81.7 97.3,88.3" fill="currentColor" stroke="none"/><text x="330" y="79" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">3. group key + MIC</text><rect x="20" y="98" width="140" height="28" rx="6" class="soft" stroke="none"/><rect x="20" y="98" width="140" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="90" y="116.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">install key, PN = 0</text><line x1="90" y1="150" x2="330" y2="150" stroke="currentColor" stroke-width="1.5"/><polygon points="330,150 322.7,153.3 322.7,146.7" fill="currentColor" stroke="none"/><text x="210" y="144" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">4. ACK</text><text x="340" y="154" font-size="13" text-anchor="start" font-weight="700" class="acc-fill" stroke="none">✗ blocked</text><line x1="90" y1="190" x2="570" y2="190" stroke="currentColor" stroke-width="1.5"/><polygon points="570,190 562.7,193.3 562.7,186.7" fill="currentColor" stroke="none"/><text x="330" y="184" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">data, PN 1  (key k, nonce 1)</text><line x1="570" y1="235" x2="90" y2="235" class="acc" stroke-width="1.5"/><polygon points="90,235 97.3,231.7 97.3,238.3" class="acc-fill" stroke="none"/><text x="330" y="229" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">3. again (AP thinks it was lost)</text><rect x="20" y="248" width="170" height="28" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="248" width="170" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="105" y="266.2" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">reinstall same key, PN = 0</text><line x1="90" y1="310" x2="570" y2="310" class="acc" stroke-width="1.5"/><polygon points="570,310 562.7,313.3 562.7,306.7" class="acc-fill" stroke="none"/><text x="330" y="304" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">data, PN 1  (key k, nonce 1 again)</text><rect x="230" y="330" width="400" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="230" y="330" width="400" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="430" y="348.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">two packets, one keystream:</text><text x="430" y="363.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">c₁ ⊕ c₂ = p₁ ⊕ p₂</text></svg>
<figcaption>Figure 19.15. A key reinstallation attack (Vanhoef and Piessens, 2017). The standard told clients to accept a resent message 3 and install the key again, which also reset the packet number, so nonces repeated under the same key.</figcaption>
</figure>

!!! note "Life story: KRACK"
    **Born:** 2017, Mathy Vanhoef and Frank Piessens at KU Leuven, Belgium (ACM CCS 2017) · **Purpose:** to show
    that a handshake with a security proof could still force nonce reuse · **Helped:** patches for nearly every
    Wi-Fi client, a fix in the standard, and a lasting lesson that proofs must model key installation ·
    **Status:** patched; Vanhoef went on to find Dragonblood (2019) and FragAttacks (2021)

### WPA3 and SAE

WPA3 (2018) replaced the password-derived PMK with **SAE** (Simultaneous
Authentication of Equals), a PAKE ([Chapter 16](16-PKI-and-Key-Establishment.md))
based on Dan Harkins's Dragonfly (RFC 7664). Both sides turn the password and
both MAC addresses into a point $\mathit{PWE}$ on an elliptic curve. Each picks
random $\mathit{rand}$ and $\mathit{mask}$ and sends

$$
\mathit{scalar} = \mathit{rand} + \mathit{mask}, \qquad \mathit{element} = -\mathit{mask} \cdot \mathit{PWE},
$$

and computes $K = \mathit{rand} \cdot (\mathit{scalar}' \cdot \mathit{PWE} + \mathit{element}')$
from the other side's values. Since $\mathit{scalar}' \cdot \mathit{PWE} + \mathit{element}' = \mathit{rand}' \cdot \mathit{PWE}$,
both get $K = \mathit{rand} \cdot \mathit{rand}' \cdot \mathit{PWE}$. The PMK comes from $K$, which
depends on fresh randomness: a recorded exchange gives an attacker nothing to
test guesses against, a fake access point gets one guess per attempt, and a
password learned later does not decrypt old sessions. WPA3 also requires
protected management frames.

It had its own troubles. **Dragonblood** (Vanhoef and Eyal Ronen, 2019)
recovered passwords through timing and cache side channels
([Chapter 18](18-Side-Channels.md)) in the "hunting and pecking" loop that
turned the password into a point, and through downgrade: in transition mode, a
fake WPA2 access point could capture a WPA2 handshake from a WPA3 client. The
fixes were constant-time code, a new hash-to-curve method (hash-to-element),
and a "transition disable" signal. **FragAttacks** (Vanhoef, 2021) found design
flaws in frame fragmentation and aggregation that went back to 1997 and affected
every Wi-Fi security protocol, WEP to WPA3.

!!! note "Life story: WPA3 and SAE"
    **Born:** 2018, Wi-Fi Alliance, using Dan Harkins's Dragonfly PAKE (RFC 7664) as SAE · **Purpose:** end
    offline password guessing and give forward secrecy to password-protected networks · **Helped:** recorded
    handshakes no longer reveal anything to test guesses against · **Status:** current, after the 2019 Dragonblood
    fixes (constant-time code, hash-to-element); required for Wi-Fi 6 certification and in the 6 GHz band

Full details, algorithms and the 6 GHz rules: [Wi-Fi reference](../protocols/Wi-Fi.md).

## 19.8 More protocols in brief

*Level: intermediate.*

The reference appendix has pages on more protocols; each is a variation on
this chapter's themes.

- **WireGuard** (Jason Donenfeld, 2017; in Linux since version 5.6, 2020): a VPN
  with no negotiation at all. One fixed suite (X25519, ChaCha20-Poly1305,
  BLAKE2s) built on Trevor Perrin's Noise framework, and public keys pinned in a
  config file. If an algorithm breaks, the protocol gets a new version. See
  [WireGuard](../protocols/WireGuard.md).
- **IPsec** (1990s on): encryption at the network layer, with the IKE
  key-exchange protocol. Flexible and complex; see [IPsec](../protocols/IPsec.md).
- **MLS** (RFC 9420, 2023): group messaging that scales to thousands of members
  with a tree of keys. See [MLS](../protocols/MLS.md).
- Also: [Kerberos](../protocols/Kerberos.md), [DNSSEC](../protocols/DNSSEC.md),
  [FIDO2 and passkeys](../protocols/FIDO2.md), [OpenPGP](../protocols/OpenPGP.md),
  [age](../protocols/age.md), [JWT](../protocols/JWT.md),
  [disk encryption](../protocols/Disk-Encryption.md) and [Bitcoin](../protocols/Bitcoin.md).

!!! note "Life story: WireGuard"
    **Born:** 2016 to 2017, Jason Donenfeld (NDSS 2017), built on Trevor Perrin's Noise framework · **Purpose:** a
    VPN small enough to audit, about 4,000 lines of kernel code against the hundreds of thousands in IPsec and
    OpenVPN stacks · **Helped:** merged into Linux 5.6 in 2020 and adopted by many commercial VPNs · **Status:**
    current

## 19.9 Patterns: what the histories teach

*Level: expert.*

Put the four histories side by side and the same mistakes keep appearing.

| Pattern | TLS | SSH | Signal / messaging | Wi-Fi |
|---|---|---|---|---|
| **Negotiation invites downgrade** | SSL 2.0 suite stripping, FREAK, Logjam, POODLE's fallback | Terrapin stripping extensions | (no negotiation in the core) | WPA3 transition mode, Dragonblood |
| **Weak composition of cipher and MAC** | MAC-then-encrypt: Vaudenay, Lucky Thirteen | encrypt-and-MAC with CBC: BKN 2002, APW 2009 | (encrypt-then-MAC from the start) | WEP's CRC-32 |
| **Nonce or IV reuse and predictability** | BEAST | chained IVs | | WEP IVs, KRACK |
| **Errors and timing as oracles** | Bleichenbacher, ROBOT, Lucky Thirteen | packet-length oracle, keystroke timing | | Dragonblood |
| **Keys not bound to the whole transcript** | renegotiation, Triple Handshake | Terrapin (sequence numbers) | early group management | |
| **Bad randomness** | | Debian 2008 | | |
| **Implementation and supply chain** | Heartbleed, goto fail | CRC-32 detector overflow, xz | | `wpa_supplicant` zero key |

And the answers that newer designs share:

1. **Fewer choices.** TLS 1.3 cut the menu; WireGuard and Signal have no menu at
   all. Every option is a place for a downgrade.
2. **AEAD only**, with nonces from counters that cannot repeat.
3. **Bind everything to the transcript**: sign it, MAC it, derive keys from it.
4. **Ephemeral key exchange** for forward secrecy, and ratchets for
   post-compromise security.
5. **No secret-dependent errors**: implicit rejection, a single failure path.
6. **Analysis before deployment**: TLS 1.3, Signal's PQXDH and MLS were all
   checked with formal tools while still drafts, and the tools found real flaws
   each time.

## 19.10 Going deeper

*Level: expert.*

### Formal analysis of protocols

Two kinds of tools check protocols. **Symbolic** tools such as ProVerif and
Tamarin treat cryptography as perfect black boxes (an encryption can be opened
only with its key) and search all possible interleavings of messages for an
attack on secrecy or authentication. Lowe's 1995 attack on Needham-Schroeder was
found this way, with the FDR model checker. **Computational** proofs, written by
hand or checked with CryptoVerif or EasyCrypt, use the games of
[Chapter 17](17-Defining-Security.md) and give concrete bounds. TLS 1.3 was
analyzed both ways, by several teams, before RFC 8446 was published; the Tamarin
analysis by Cas Cremers and colleagues found a flaw in draft 10 that was fixed.
KRACK is a reminder of the limits: the model has to include the behavior that
is attacked, such as when keys are installed.

### Forward secrecy and post-compromise security

**Forward secrecy** concerns the past: compromise at time $t$ must not reveal
sessions that ended before $t$. Ephemeral Diffie-Hellman gives it, *if* the
ephemeral private keys and all derived keys are really erased. TLS 1.3 session
tickets weaken it: a server that keeps a long-lived ticket-encryption key can
decrypt resumed sessions until that key is rotated.

**Post-compromise security** (named by Cohn-Gordon, Cremers and Garratt in 2016)
concerns the future: after a compromise at time $t$, security comes back once
the parties run a step the attacker could not see, such as a fresh DH exchange.
No protocol can heal against an attacker who stays in the middle actively,
impersonating with the stolen keys; healing works against an attacker who took
a copy and then only watches.

### Hybrid post-quantum key exchange

TLS (`X25519MLKEM768`), SSH (`mlkem768x25519-sha256`) and Signal (PQXDH and SPQR)
now combine a classical exchange with ML-KEM ([Chapter 21](21-Lattice-Cryptography.md)),
and feed both secrets into the key schedule. The combined key is secure if
*either* problem is hard: a break of ML-KEM leaves X25519's protection, and a
quantum computer that breaks X25519 still faces ML-KEM. The goal is to stop
"record now, decrypt later": traffic captured today and stored until a quantum
computer exists ([Chapter 20](20-Quantum-Computers.md)). Authentication is less
urgent, since a signature only has to resist forgery while the handshake is
running, so post-quantum certificates are coming more slowly.

### Key compromise impersonation and identity misbinding

Two subtler properties appear in the analyses. **Key compromise impersonation
(KCI)**: if Alice's long-term key is stolen, the thief can of course pose as
Alice; but can the thief pose as *Bob to Alice*? Protocols that authenticate
with a static-static DH alone can allow it. An **identity misbinding** (or
"unknown key share") attack makes Alice believe she shares a key with Bob while
Bob believes he shares it with Mallory. Lowe's attack on Needham-Schroeder is
one, and the defense, putting both identities into the authenticated
transcript, is the same one TLS 1.3, SSH and Noise use.

## Check yourself

??? question "1. In the TLS 1.3 handshake, which messages are sent in the clear, and from which point is everything encrypted?"

    The ClientHello and ServerHello are in the clear. Everything after the ServerHello, starting with
    EncryptedExtensions and including the certificate, is encrypted with the handshake keys.

??? question "2. Why does the server sign the transcript hash in CertificateVerify, and not just a random challenge?"

    Signing the transcript proves the server saw exactly the client's offers and its own replies. An
    attacker who changed the list of cipher suites or groups (a downgrade) would change the transcript,
    and the signature would fail. FREAK and Logjam worked because older versions signed too little.

??? question "3. A client connects to a TLS 1.3 server, and the ServerHello says TLS 1.2 with a random value ending in `44 4F 57 4E 47 52 44 01`. What should the client do, and why?"

    Abort the handshake. The bytes spell `DOWNGRD` plus 1: the server supports TLS 1.3 but was told
    the client didn't, so someone in the middle removed TLS 1.3 from the ClientHello.

??? question "4. What does SSH do on the first connection to a server, since it has no certificate authority, and what is the risk?"

    It shows the host key fingerprint and asks the user to accept it, then remembers it in `known_hosts`
    (trust on first use). The risk is an attacker in the middle on that first connection: if the user
    accepts without checking the fingerprint, the attacker's key is remembered instead.

??? question "5. In X3DH, which of the four DH values would an attacker need Bob's identity private key for, and which give forward secrecy?"

    $DH_2 = DH(EK_A, IK_B)$ needs Bob's identity key (and $DH_1$ needs Alice's). $DH_3$ and $DH_4$ use Bob's
    signed prekey and one-time prekey, which are deleted after use or rotation, so they give forward secrecy.

??? question "6. In the Double Ratchet, why can a stolen chain key not decrypt earlier messages?"

    Each new chain key is $\mathrm{HMAC}(CK, \texttt{02})$ of the previous one. HMAC is one-way, so going backward
    from a stolen chain key to earlier chain keys (and so earlier message keys) would mean inverting
    HMAC. The earlier keys themselves were deleted.

??? question "7. Why does a WPA2-Personal handshake allow an offline password attack, and why doesn't WPA3's SAE?"

    In WPA2 the PMK depends only on the password and SSID, and the nonces and MIC are sent in the clear,
    so each guess can be checked against the recorded MIC. In SAE the PMK comes from a Diffie-Hellman
    exchange with fresh secret values; the recording contains no value that a guess can be checked
    against, so the attacker must interact with a real device for each guess.

??? question "8. KRACK made a client reuse packet numbers under one key. Why is that catastrophic for AES-CCM but would not even arise in a scheme that derived a fresh key per message?"

    CCM encrypts with CTR mode, so the same key and nonce give the same keystream, and two ciphertexts
    XOR to the XOR of the plaintexts. With a fresh key per message (as in the Double Ratchet) a repeated
    nonce would be harmless, because the keystreams under different keys are unrelated.

??? question "9. WEP used a 24-bit IV. Using the birthday bound, after roughly how many packets with random IVs does a repeat become likely?"

    About $\sqrt{2^{24}} = 2^{12} = 4096$ packets give a good chance of a repeat (the probability reaches about
    one half near $1.18 \times 4096 \approx 4800$). A busy network sends that in seconds.

??? question "10. Terrapin deleted messages at the start of the encrypted phase without breaking any MAC. Which design principle from this chapter would have prevented it?"

    Binding everything to the transcript. The sequence numbers continued from the unauthenticated
    handshake, so the attacker could shift them there; nothing authenticated the count of handshake
    messages. Strict key exchange resets the counters and rejects unexpected handshake messages, and
    TLS 1.3's transcript hash in Finished achieves the same thing.

## What you learned

- A secure channel protocol must agree on fresh keys, authenticate, negotiate
  safely, bind everything to the transcript, protect records, and limit the
  damage of key theft.
- TLS 1.3 does all of this in one round trip: ephemeral (EC)DH, a signature and a
  MAC over the transcript, an HKDF key schedule, and AEAD only. It got there by
  removing every feature behind twenty years of attacks.
- SSH trusts on first use and binds keys to an exchange hash; its history runs
  from CRC-32 to Terrapin and the xz backdoor.
- Signal's X3DH starts a conversation with someone offline; the Double Ratchet
  gives each message its own key, with forward secrecy and post-compromise security.
- WEP failed through nonce reuse, a linear checksum and RC4's related keys; WPA2
  falls to offline guessing of weak passwords and fell to KRACK's nonce reuse; WPA3
  uses a PAKE so recorded handshakes reveal nothing.
- The recurring failures are downgrades, weak cipher-MAC composition, nonce reuse,
  error oracles, missing transcript binding, bad randomness and plain bugs. The
  recurring fixes are fewer choices, AEAD, transcript binding, ephemeral keys and
  formal analysis.

**Next:** [Chapter 20](20-Quantum-Computers.md), the machine that would break
the key exchanges in every protocol in this chapter, and why they are already
adding ML-KEM.

## Further reading

- RFC 8446, *The Transport Layer Security (TLS) Protocol Version 1.3* (2018),
  and RFC 8448, its example handshakes with every intermediate value.
- RFC 4251 to RFC 4254 (SSH), and RFC 9142 on SSH key exchange choices.
- Trevor Perrin and Moxie Marlinspike, "The X3DH Key Agreement Protocol" and
  "The Double Ratchet Algorithm" (2016), at [signal.org/docs](https://signal.org/docs/).
- Katriel Cohn-Gordon, Cas Cremers, Benjamin Dowling, Luke Garratt and Douglas
  Stebila, "A Formal Security Analysis of the Signal Messaging Protocol", IEEE
  EuroS&P 2017.
- Mathy Vanhoef and Frank Piessens, "Key Reinstallation Attacks: Forcing Nonce
  Reuse in WPA2", ACM CCS 2017.
- Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk, "Terrapin Attack: Breaking
  SSH Channel Integrity by Sequence Number Manipulation", USENIX Security 2024.
- Gavin Lowe, "Breaking and Fixing the Needham-Schroeder Public-Key Protocol
  using FDR", TACAS 1996.
- David Wong, *Real-World Cryptography* (Manning, 2021), and Jean-Philippe
  Aumasson, *Serious Cryptography* (No Starch Press, 2nd edition 2024), for
  protocols in practice.
