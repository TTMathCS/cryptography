# 6. SSH

*TLS protects the web with certificates from authorities. SSH protects the
machines behind it, and does it without authorities at all: the first time you
connect, you are shown a fingerprint and asked to trust it. This chapter takes
SSH apart layer by layer. You will build a small toolkit (X25519, Ed25519 and
SSH's wire encodings, all from scratch), run a real `curve25519-sha256` key
exchange from both sides, derive the six session keys of RFC 4253, seal a packet with
ChaCha20-Poly1305, issue and check an SSH certificate, sign a login the way
`ssh` does, and see why the signature cannot be replayed. Then
the attacks: the CRC flaw of SSH-1, plaintext recovery in CBC mode, Terrapin's
deleted message, the xz backdoor that nearly reached every Linux server, and
regreSSHion. It ends with post-quantum SSH, which arrived in 2022, earlier
than in any other widely used protocol.*

!!! abstract "In this chapter"
    **You will learn:**

    - why SSH was written, and the three layers of SSH-2: transport, user
      authentication and connection;
    - the key exchange in detail: negotiation, the exchange hash, the host key
      signature and key derivation, by computing them;
    - SSH's packet format and its ciphers, and why the length field caused
      trouble;
    - how SSH decides to trust a server: trust on first use, `known_hosts`,
      SSHFP records and SSH certificates;
    - how users log in with keys, security keys and certificates, and what
      exactly is signed;
    - port and agent forwarding, and their risks;
    - the attacks, from SSH-1's CRC to Terrapin (2023), the xz backdoor and
      regreSSHion (2024);
    - hybrid post-quantum key exchange in OpenSSH, and SSH over a link to Mars.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (authenticated
    key exchange, transcripts) and [Chapter 3](03-TLS-1.3-Message-by-Message.md)
    for comparison; X25519 and Ed25519 from
    [Chapter 15 of book 1](../../book/15-Elliptic-Curves.md). The
    [SSH guide](../../topics/SSH.md) and the [ssh-keygen recipes](../../tools/ssh-keygen.md)
    give the commands; this chapter explains what they do.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.12 are
    intermediate, §6.13 is expert.

## 6.1 The problem

*Level: beginner.*

In the spring of 1995 someone installed a password sniffer on the network of
the Helsinki University of Technology. Every time a user logged in to a remote
machine with `telnet`, `rlogin` or `ftp`, the password crossed the network in
plain text, and the sniffer collected thousands of them. Tatu Ylönen, a
researcher at the university, decided to write a replacement that encrypted
everything, including the password. He called it the Secure Shell. He released
it as free software in July 1995, and by the end of the year it had around
20,000 users in some fifty countries. He also wrote to the Internet Assigned
Numbers Authority asking for a port number, and was given 22, which sits
neatly between FTP's 21 and telnet's 23.

The remote login tools SSH replaced were worse than unencrypted. The "r"
commands (`rlogin`, `rsh`, `rcp`) could let users in *without* a password if
the connection came from a trusted host name or address, and both could be
forged. An attacker who could spoof an address, or poison a name lookup,
logged in as anyone. SSH replaced address-based trust with cryptographic
authentication of both the server and the user.

Ylönen's original protocol, now called SSH-1, had design flaws that became
clear within a few years (§6.10). An IETF working group designed SSH-2, a
cleaner protocol in three layers, between 1996 and its publication as RFCs
4251 to 4254 in January 2006. Meanwhile Ylönen's company, SSH Communications
Security, had made later versions of its software proprietary, and in 1999 the
OpenBSD project took the last free version, cleaned it up and released
**OpenSSH**. OpenSSH is now the SSH of Linux, macOS, the BSDs and, since 2018,
Windows; it runs on most servers on the Internet and inside most network
equipment. When this chapter says "SSH does X", it usually means "OpenSSH does
X", because OpenSSH has defined most of the protocol's modern extensions.

<figure class="mars-fig">
<svg viewBox="0 0 640 450" width="640" role="img" aria-label="Timeline of SSH from the 1995 Helsinki password sniffing to post-quantum key exchange in OpenSSH 10" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="442" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Ylönen writes SSH after a password-sniffing attack</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">IETF begins SSH-2</text>
<text x="78" y="79" text-anchor="end" font-weight="bold" class="acc-fill">1998</text>
<circle cx="92" cy="74" r="4.5" class="acc-fill"/>
<text x="108" y="79" class="acc-fill">CRC-32 insertion attack on SSH-1</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">OpenSSH released by the OpenBSD project</text>
<text x="78" y="131" text-anchor="end" font-weight="bold" class="acc-fill">2001</text>
<circle cx="92" cy="126" r="4.5" class="acc-fill"/>
<text x="108" y="131" class="acc-fill">CRC "compensation" bug exploited; keystroke timing</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2006</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">SSH-2 published as RFC 4251 to 4254</text>
<text x="78" y="183" text-anchor="end" font-weight="bold" class="acc-fill">2008</text>
<circle cx="92" cy="178" r="4.5" class="acc-fill"/>
<text x="108" y="183" class="acc-fill">Debian's weak keys; CBC plaintext recovery (2009)</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">OpenSSH certificates</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Curve25519 key exchange, Ed25519 keys, ChaCha20-Poly1305</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="256" r="3.5"/>
<text x="108" y="261">FIDO security keys for SSH (OpenSSH 8.2)</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">Hybrid post-quantum key exchange by default (9.0)</text>
<text x="78" y="313" text-anchor="end" font-weight="bold" class="acc-fill">2023</text>
<circle cx="92" cy="308" r="4.5" class="acc-fill"/>
<text x="108" y="313" class="acc-fill">Terrapin; GitHub's RSA host key exposed</text>
<text x="78" y="339" text-anchor="end" font-weight="bold" class="acc-fill">2024</text>
<circle cx="92" cy="334" r="4.5" class="acc-fill"/>
<text x="108" y="339" class="acc-fill">xz backdoor found; regreSSHion</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">ML-KEM hybrid is OpenSSH 10.0's default; DSA removed</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">Hybrid key exchanges published as RFC 9941 and 10042</text>
</svg>
<figcaption>Figure 6.1. Thirty years of SSH. Accent marks the attacks; note how early the post-quantum change came.</figcaption>
</figure>

## 6.2 Three layers

*Level: beginner.*

SSH-2 is three protocols stacked on each other, each with its own RFC.

- **The transport layer** (RFC 4253) runs over TCP. It negotiates algorithms,
  runs a key exchange, authenticates the *server* with its host key, and then
  encrypts and authenticates every packet. It is the SSH counterpart of the
  TLS handshake and record layer together.
- **The user authentication layer** (RFC 4252) runs inside the encrypted
  transport. The *client* proves who the user is: with a password, a public
  key, a security key or a certificate.
- **The connection layer** (RFC 4254) runs inside that. It multiplexes many
  **channels** over the one connection: an interactive shell, a command, a file
  transfer (SFTP), forwarded TCP ports, a forwarded agent.

The split matters for security. The server is authenticated first, by the
transport, before the user sends anything: a password typed into SSH goes only
to a server whose host key the client accepted. And the user's authentication
is bound to the transport's session (§6.6), so it cannot be relayed to a
different server.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="SSH's three layers: transport over TCP, user authentication inside it, connection layer with channels for shell, SFTP, port forwarding and agent" fill="currentColor" font-size="14">
<rect x="40" y="200" width="560" height="44" class="soft" stroke="currentColor"/>
<text x="320" y="227" text-anchor="middle">TCP, port 22</text>
<rect x="40" y="150" width="560" height="44" class="soft-acc" stroke="currentColor"/>
<text x="320" y="170" text-anchor="middle" font-weight="bold">transport (RFC 4253)</text>
<text x="320" y="187" text-anchor="middle" font-size="12.5">negotiation · key exchange · server's host key · encrypted packets</text>
<rect x="40" y="100" width="560" height="44" class="soft" stroke="currentColor"/>
<text x="320" y="120" text-anchor="middle" font-weight="bold">user authentication (RFC 4252)</text>
<text x="320" y="137" text-anchor="middle" font-size="12.5">password · public key · security key · certificate</text>
<rect x="40" y="50" width="560" height="44" class="soft" stroke="currentColor"/>
<text x="320" y="70" text-anchor="middle" font-weight="bold">connection (RFC 4254): channels</text>
<text x="320" y="87" text-anchor="middle" font-size="12.5">shell · exec · SFTP · port forwarding · agent forwarding · X11</text>
<text x="320" y="30" text-anchor="middle" font-size="12.5">the server is authenticated before the user sends anything</text>
</svg>
<figcaption>Figure 6.2. The three layers of SSH-2. Each runs inside the one below it.</figcaption>
</figure>

## 6.3 The key exchange, by hand

*Level: beginner.*

Here is what happens in the first round trips of every SSH connection.

<div class="mars-steps" markdown>

1. **Version strings.** Each side sends one line of text, such as
   `SSH-2.0-OpenSSH_10.0`. These lines are not encrypted, but they are fed into
   the exchange hash below, so an attacker who changes them is caught later.
2. **KEXINIT.** Each side sends a list of the algorithms it supports, in order
   of preference: key exchange methods, host key types, ciphers and MACs for
   each direction, and compression. For each category, the chosen algorithm is
   the first one on the *client's* list that the server also supports. Each
   KEXINIT starts with 16 random bytes, the cookie, so that no two are the
   same.
3. **Key exchange.** With `curve25519-sha256` (RFC 8731), the client sends an
   ephemeral X25519 public key $Q_C$; the server answers with its host key
   $K_S$, its own ephemeral key $Q_S$, and a **signature** with its host key
   over the **exchange hash** $H$.
4. **The exchange hash** is SHA-256 over the whole conversation so far: both
   version strings, both KEXINIT messages, the host key, both ephemeral keys,
   and the shared secret $K$:

   $$
   H = \mathrm{SHA256}(V_C \,\|\, V_S \,\|\, I_C \,\|\, I_S \,\|\, K_S \,\|\, Q_C \,\|\, Q_S \,\|\, K).
   $$

   This is SSH's transcript hash, ten years before TLS 1.3 made the idea
   central.
5. **The client checks** that it trusts the host key (§6.5) and that the
   signature on $H$ is valid. Both send **NEWKEYS**, and switch to the new
   keys.
6. **Keys.** Six values are derived from $K$ and $H$ (RFC 4253 §7.2): an IV,
   an encryption key and a MAC key for each direction, each as
   $\mathrm{HASH}(K \,\|\, H \,\|\, \text{letter} \,\|\, \text{session\_id})$
   with the letters A to F. The first $H$ of a connection becomes its
   permanent **session identifier**; later re-keys keep it.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="The SSH key exchange as a message sequence: version strings, KEXINIT lists, ECDH init and reply with the host key signature, NEWKEYS, then encrypted service request and user authentication" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">client</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">server</text>
<line x1="110" y1="32" x2="110" y2="435" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="435" stroke="currentColor"/>
<line x1="110" y1="60" x2="526" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,60 518,55 518,65"/>
<text x="320" y="52" text-anchor="middle">V_C: SSH-2.0-OpenSSH_10.0</text>
<line x1="530" y1="92" x2="114" y2="92" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,92 122,87 122,97"/>
<text x="320" y="84" text-anchor="middle">V_S: SSH-2.0-OpenSSH_9.9</text>
<line x1="110" y1="124" x2="526" y2="124" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,124 518,119 518,129"/>
<text x="320" y="116" text-anchor="middle">I_C: KEXINIT (cookie, algorithm lists)</text>
<line x1="530" y1="156" x2="114" y2="156" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,156 122,151 122,161"/>
<text x="320" y="148" text-anchor="middle">I_S: KEXINIT (cookie, algorithm lists)</text>
<line x1="110" y1="190" x2="526" y2="190" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,190 518,185 518,195"/>
<text x="320" y="182" text-anchor="middle">KEX_ECDH_INIT: Q_C</text>
<line x1="530" y1="228" x2="114" y2="228" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,228 122,223 122,233"/>
<text x="320" y="220" text-anchor="middle">KEX_ECDH_REPLY: K_S, Q_S, signature on H</text>
<rect x="135" y="242" width="370" height="40" rx="4" class="soft-acc"/>
<text x="320" y="258" text-anchor="middle" class="acc-fill" font-size="12.5">client: is K_S trusted? is the signature on H valid?</text>
<text x="320" y="275" text-anchor="middle" class="acc-fill" font-size="12.5">both: keys A to F from K, H and session_id</text>
<line x1="114" y1="305" x2="526" y2="305" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,305 518,300 518,310"/>
<polygon points="110,305 122,300 122,310"/>
<text x="320" y="297" text-anchor="middle">NEWKEYS (each side)</text>
<line x1="110" y1="340" x2="526" y2="340" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="530,340 518,335 518,345" class="acc-fill"/>
<text x="320" y="332" text-anchor="middle">{SERVICE_REQUEST ssh-userauth}</text>
<line x1="530" y1="375" x2="114" y2="375" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="110,375 122,370 122,380" class="acc-fill"/>
<text x="320" y="367" text-anchor="middle">{EXT_INFO} {SERVICE_ACCEPT}</text>
<line x1="110" y1="410" x2="526" y2="410" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="530,410 518,405 518,415" class="acc-fill"/>
<text x="320" y="402" text-anchor="middle">{USERAUTH_REQUEST, signed over session_id}</text>
<text x="20" y="460" font-size="12.5">plain: in the clear, but hashed into H     { }: encrypted with the new keys</text>
</svg>
<figcaption>Figure 6.3. One SSH connection up to login. Everything before NEWKEYS travels in the clear, but each of the first six messages is part of the exchange hash $H$ that the server signs.</figcaption>
</figure>

Compare with Chapter 1. The two ephemeral keys give forward secrecy. The
server's signature over a hash that contains both shares is SIGMA's signature;
since the client is not authenticated at this layer, there is no misbinding
question for the server's side, and the client's identity is bound later
through the session identifier. The design is close to TLS 1.3's, and older.

### Code it: the toolkit

The programs in this chapter need X25519, Ed25519 and SSH's encodings. The
first block builds all three from scratch: X25519 as in Chapter 3, Ed25519
following RFC 8032's reference code (it signs with a hashed secret scalar and a
deterministic nonce), and three encoders. In SSH's wire format a **string** is a
four-byte length followed by the bytes, an **mpint** is a big-endian
two's-complement integer as a string, and a **name-list** is a comma-separated
string. Getting the mpint right (with a leading zero byte when the top bit is
set) is a classic source of interoperability bugs.

```python
# A small toolkit for this chapter: X25519 (RFC 7748), Ed25519 (RFC 8032) and
# SSH's wire encodings (RFC 4251). Slow and not constant time: for learning only.
import hashlib

P25519 = 2**255 - 19

def x25519(k, u):
    p = P25519
    k = bytearray(k); k[0] &= 248; k[31] &= 127; k[31] |= 64
    k, x1 = int.from_bytes(k, "little"), int.from_bytes(u, "little") % 2**255
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in reversed(range(255)):
        bit = (k >> t) & 1
        if swap ^ bit:
            x2, x3, z2, z3 = x3, x2, z3, z2
        swap = bit
        A, B_, C, D = x2 + z2, x2 - z2, x3 + z3, x3 - z3
        DA, CB, AA, BB = D * A, C * B_, A * A, B_ * B_
        E = AA - BB
        x3, z3 = (DA + CB) ** 2 % p, x1 * (DA - CB) ** 2 % p
        x2, z2 = AA * BB % p, E * (AA + 121665 * E) % p
    if swap:
        x2, z2 = x3, z3
    return (x2 * pow(z2, p - 2, p) % p).to_bytes(32, "little")

def x25519_public(k):
    return x25519(k, (9).to_bytes(32, "little"))

p = P25519                                     # Ed25519 below uses the same prime
L = 2**252 + 27742317777372353535851937790883648493
d = -121665 * pow(121666, p - 2, p) % p
I = pow(2, (p - 1) // 4, p)                         # square root of -1

def recover_x(y, sign):
    xx = (y * y - 1) * pow(d * y * y + 1, p - 2, p)
    x = pow(xx, (p + 3) // 8, p)
    if (x * x - xx) % p:
        x = x * I % p
    if x % 2 != sign:
        x = p - x
    return x

By = 4 * pow(5, p - 2, p) % p
B = (recover_x(By, 0), By, 1, recover_x(By, 0) * By % p)   # extended coordinates

def add(P, Q):
    A = (P[1] - P[0]) * (Q[1] - Q[0]) % p
    Bv = (P[1] + P[0]) * (Q[1] + Q[0]) % p
    C = 2 * P[3] * Q[3] * d % p
    D = 2 * P[2] * Q[2] % p
    E, F, G, H = Bv - A, D - C, D + C, Bv + A
    return (E * F % p, G * H % p, F * G % p, E * H % p)

def mul(s, P):
    Q = (0, 1, 1, 0)
    while s:
        if s & 1:
            Q = add(Q, P)
        P, s = add(P, P), s >> 1
    return Q

def encode(P):
    zi = pow(P[2], p - 2, p)
    x, y = P[0] * zi % p, P[1] * zi % p
    return (y | (x & 1) << 255).to_bytes(32, "little")

def decode(b):
    y = int.from_bytes(b, "little")
    sign, y = y >> 255, y & (2**255 - 1)
    x = recover_x(y, sign)
    return (x, y, 1, x * y % p)

def H(m):
    return int.from_bytes(hashlib.sha512(m).digest(), "little")

def expand(secret):
    h = hashlib.sha512(secret).digest()
    a = int.from_bytes(h[:32], "little")
    a &= (1 << 254) - 8
    a |= 1 << 254
    return a, h[32:]

def public_key(secret):
    return encode(mul(expand(secret)[0], B))

def sign(secret, msg):
    a, prefix = expand(secret)
    A = encode(mul(a, B))
    r = H(prefix + msg) % L
    R = encode(mul(r, B))
    s = (r + H(R + A + msg) * a) % L
    return R + s.to_bytes(32, "little")

def verify(public, msg, sig):
    R, s = sig[:32], int.from_bytes(sig[32:], "little")
    if s >= L:
        return False
    k = H(R + public + msg) % L
    left = encode(mul(s, B))
    right = encode(add(decode(R), mul(k, decode(public))))
    return left == right

def ssh_string(b):                       # uint32 length, then the bytes
    return len(b).to_bytes(4, "big") + b

def ssh_mpint(n):                        # two's complement, no leading zeros, sign byte if needed
    b = n.to_bytes((n.bit_length() + 8) // 8, "big") if n else b""
    return ssh_string(b)

def ssh_name_list(names):
    return ssh_string(",".join(names).encode())

print("toolkit ready; Ed25519 self-test:",
      verify(public_key(b"\x01" * 32), b"hi", sign(b"\x01" * 32, b"hi")))
```

```text
toolkit ready; Ed25519 self-test: True
```

Ed25519's correctness can be checked against RFC 8032's first test vector:
with secret key `9d61b19d...7f60`, the public key must be `d75a9801...511a`
and the signature on the empty message must begin `e5564300c360ac72`. The code
above produces exactly those values (try it).

### Code it: one key exchange, from both sides

Now the exchange itself. The private keys are fixed (made by hashing labels) so
that the output is the same every time you run it. Each side computes the
shared secret and $H$ independently; the server signs $H$; the client verifies.

```python
# One SSH key exchange, curve25519-sha256 (RFC 8731) with an Ed25519 host key,
# from both sides. Continue from the toolkit above.
import base64

seed = lambda label: hashlib.sha256(label.encode()).digest()   # fixed keys: repeatable run
V_C, V_S = b"SSH-2.0-OpenSSH_10.0", b"SSH-2.0-OpenSSH_9.9"
I_C = b"\x14" + seed("client cookie")[:16] + ssh_name_list(["mlkem768x25519-sha256", "curve25519-sha256"])
I_S = b"\x14" + seed("server cookie")[:16] + ssh_name_list(["curve25519-sha256"])
# (Real KEXINIT messages list ten name-lists; two are enough to show the idea.)

host_secret = seed("server host key")
K_S = ssh_string(b"ssh-ed25519") + ssh_string(public_key(host_secret))   # host key blob

# Each side's ephemeral key pair, exchanged in SSH_MSG_KEX_ECDH_INIT / _REPLY.
c_priv, s_priv = seed("client ephemeral"), seed("server ephemeral")
Q_C, Q_S = x25519_public(c_priv), x25519_public(s_priv)

def exchange_hash(shared):
    K = int.from_bytes(shared, "big")             # RFC 8731: the X25519 output as an mpint
    data = (ssh_string(V_C) + ssh_string(V_S) + ssh_string(I_C) + ssh_string(I_S) +
            ssh_string(K_S) + ssh_string(Q_C) + ssh_string(Q_S) + ssh_mpint(K))
    return K, hashlib.sha256(data).digest()

# Server: compute the secret, the exchange hash H, and sign H with the host key.
K_srv, H_srv = exchange_hash(x25519(s_priv, Q_C))
signature = sign(host_secret, H_srv)

# Client: compute the same, then check the signature with the host key it was sent.
K_cli, H_cli = exchange_hash(x25519(c_priv, Q_S))
host_pub = K_S[4 + 11 + 4:]                       # skip the two length fields and the name
print("same exchange hash:", H_cli == H_srv)
print("host signature valid:", verify(host_pub, H_cli, signature))

# Keys, RFC 4253 section 7.2. The first H of a connection is the session_id.
session_id = H_cli
def derive(letter, size):
    return hashlib.sha256(ssh_mpint(K_cli) + H_cli + letter + session_id).digest()[:size]
for letter, use in ((b"A", "IV client->server"), (b"C", "key client->server"),
                    (b"D", "key server->client"), (b"E", "MAC key client->server")):
    print(f"{use:24s} {derive(letter, 16).hex()}")

# The fingerprint a user is asked to check on first connection:
fp = base64.b64encode(hashlib.sha256(K_S).digest()).decode().rstrip("=")
print("host key fingerprint: ED25519 SHA256:" + fp)
```

```text
same exchange hash: True
host signature valid: True
IV client->server        41fa1484638607718c968e09031ed6d1
key client->server       5a154c04539cd5021d9fad37a4c8ff25
key server->client       ab5849a7dcca0ae34f124b76f43ba2cb
MAC key client->server   751cf9430b108941ecd4eae82249d8d8
host key fingerprint: ED25519 SHA256:oHv8MGHTZlpxazNhwiHiyRL3XF/whPe6xanj9rtxC0E
```

The fingerprint at the end is what `ssh` shows on first contact: SHA-256 of
the host key blob, in base64 without padding. It hashes the *key*, not the
exchange, so it stays the same on every connection to that server; that is
what lets a user check it once.

## 6.4 Packets and ciphers

*Level: intermediate.*

After NEWKEYS, every SSH message travels in a **binary packet**:

| Field | Size |
| --- | --- |
| `packet_length` | 4 bytes: length of what follows, excluding the MAC |
| `padding_length` | 1 byte |
| payload | the message |
| random padding | 4 to 255 bytes, so the total is a multiple of the block size |
| MAC | computed over a 32-bit **sequence number** and the packet |

The sequence number is never sent; each side counts packets, starting at zero
when the connection opens, and it is part of every MAC. This gives replay and
reordering protection, as in TLS, and is at the center of the Terrapin attack
(§6.10).

The original design, in RFC 4253, encrypted the whole packet, including the
length field, with a block cipher in CBC mode, and computed the MAC over the
*plaintext* (MAC-and-encrypt). The receiver therefore had to decrypt the first
block to learn how long the packet was, before it could check any MAC. In 2009
Martin Albrecht, Kenneth Paterson and Gaven Watson showed what that allowed: an
attacker who injects a block of captured ciphertext as the start of a new
packet makes the server decrypt it and treat 32 bits of secret plaintext as a
length, then wait for that many bytes. By watching when the server gave up, the
attacker learned those bits. It worked with a low probability per attempt
(each try killed the connection), but it was a real plaintext recovery against
the RFC as written. The fix was to stop using CBC.

OpenSSH introduced three families of better modes:

- **Counter mode** (`aes128-ctr` and friends, RFC 4344, 2006), which removed
  CBC's padding and IV issues but kept MAC-and-encrypt.
- **Encrypt-then-MAC** MACs (`hmac-sha2-256-etm@openssh.com`, 2012): the length
  is sent in the clear, and the MAC covers the ciphertext and is checked before
  anything is decrypted. This is the order Chapter 4 recommends.
- **AEAD** ciphers: `aes128-gcm@openssh.com` (RFC 5647, 2009) and
  `chacha20-poly1305@openssh.com` (OpenSSH 6.5, 2014). The ChaCha20 mode uses
  two keys: one encrypts only the four-byte length, so a length can be
  decrypted without decrypting the payload, and the other encrypts the payload,
  with a Poly1305 tag over the whole packet that is checked before the payload
  is used. It is OpenSSH's first choice on machines without fast AES hardware.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three SSH packet layouts: the original with everything encrypted and a MAC over the plaintext, encrypt-then-MAC with the length in the clear, and chacha20-poly1305 with the length encrypted under its own key" fill="currentColor" font-size="13">
<text x="40" y="26" font-weight="bold">original, CBC, MAC-and-encrypt (1996)</text>
<rect x="40" y="36" width="80" height="40" class="soft-acc" stroke="currentColor"/>
<text x="80" y="61" text-anchor="middle">length</text>
<rect x="120" y="36" width="60" height="40" class="soft-acc" stroke="currentColor"/>
<text x="150" y="61" text-anchor="middle">pad</text>
<rect x="180" y="36" width="230" height="40" class="soft-acc" stroke="currentColor"/>
<text x="295" y="61" text-anchor="middle">payload</text>
<rect x="410" y="36" width="80" height="40" class="soft-acc" stroke="currentColor"/>
<text x="450" y="61" text-anchor="middle">padding</text>
<rect x="500" y="36" width="100" height="40" class="soft" stroke="currentColor"/>
<text x="550" y="54" text-anchor="middle">MAC of</text>
<text x="550" y="69" text-anchor="middle">plaintext</text>
<text x="40" y="96" font-size="12.5" class="acc-fill">the length must be decrypted before any MAC can be checked</text>
<text x="40" y="126" font-weight="bold">encrypt-then-MAC (2012)</text>
<rect x="40" y="136" width="80" height="40" class="soft" stroke="currentColor"/>
<text x="80" y="161" text-anchor="middle">length</text>
<rect x="120" y="136" width="370" height="40" class="soft-acc" stroke="currentColor"/>
<text x="305" y="161" text-anchor="middle">pad · payload · padding (encrypted)</text>
<rect x="500" y="136" width="100" height="40" class="soft" stroke="currentColor"/>
<text x="550" y="154" text-anchor="middle">MAC of</text>
<text x="550" y="169" text-anchor="middle">ciphertext</text>
<text x="40" y="196" font-size="12.5">length in the clear; MAC checked before decryption</text>
<text x="40" y="226" font-weight="bold">chacha20-poly1305@openssh.com (2014)</text>
<rect x="40" y="236" width="80" height="40" class="acc-fill" fill-opacity="0.35" stroke="currentColor"/>
<text x="80" y="261" text-anchor="middle">length</text>
<rect x="120" y="236" width="370" height="40" class="soft-acc" stroke="currentColor"/>
<text x="305" y="261" text-anchor="middle">pad · payload · padding (main key)</text>
<rect x="500" y="236" width="100" height="40" class="soft" stroke="currentColor"/>
<text x="550" y="254" text-anchor="middle">Poly1305</text>
<text x="550" y="269" text-anchor="middle">tag</text>
<text x="40" y="294" font-size="12.5">length under its own key; tag over length and ciphertext, checked first</text>
</svg>
<figcaption>Figure 6.4. Three generations of SSH packet. Shaded boxes are encrypted. The darker length in the last row uses a separate key, so it can be read without touching the payload.</figcaption>
</figure>

### Code it: one ChaCha20-Poly1305 packet

The OpenSSH ChaCha20 mode is small enough to write out in full. The program
below builds ChaCha20 and Poly1305 from their definitions, checks each against
the test vectors of RFC 8439, and then seals and opens one SSH packet. Two
details are worth watching. First, the cipher needs 64 bytes of key, but
SHA-256 gives only 32, so RFC 4253 §7.2 extends the output: the second 32 bytes
are $\mathrm{HASH}(K \,\|\, H \,\|\, K_1)$. Second, the **nonce is the packet's
sequence number**, so a packet replayed or moved to another position fails.

```python
# chacha20-poly1305@openssh.com: one encrypted SSH packet, with the length
# hidden under its own key. Continue from the two programs above (K_cli, H_cli).
import hmac, struct

def rotl(v, n): return ((v << n) & 0xffffffff) | (v >> (32 - n))
def quarter(s, a, b, c, d):
    s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 16)
    s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 12)
    s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 8)
    s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 7)
def chacha_block(key, counter, nonce8):        # original ChaCha20: 64-bit counter, 64-bit nonce
    s = list(struct.unpack("<4I", b"expand 32-byte k") + struct.unpack("<8I", key) +
             struct.unpack("<2I", counter.to_bytes(8, "little")) + struct.unpack("<2I", nonce8))
    w = s[:]
    for _ in range(10):
        for a, b, c, d in ((0,4,8,12),(1,5,9,13),(2,6,10,14),(3,7,11,15),
                           (0,5,10,15),(1,6,11,12),(2,7,8,13),(3,4,9,14)):
            quarter(w, a, b, c, d)
    return struct.pack("<16I", *[(x + y) & 0xffffffff for x, y in zip(w, s)])
def chacha(key, nonce8, counter, data):
    out = bytearray()
    for i in range(0, len(data), 64):
        block = chacha_block(key, counter + i // 64, nonce8)
        out += bytes(x ^ y for x, y in zip(data[i:i + 64], block))
    return bytes(out)
def poly1305(key, msg):
    r = int.from_bytes(key[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    s, acc, P = int.from_bytes(key[16:], "little"), 0, (1 << 130) - 5
    for i in range(0, len(msg), 16):
        n = int.from_bytes(msg[i:i + 16] + b"\x01", "little")
        acc = (acc + n) * r % P
    return ((acc + s) & ((1 << 128) - 1)).to_bytes(16, "little")

# Check both against RFC 8439's test vectors (sections 2.3.2 and 2.5.2).
k = bytes(range(32))
blk = chacha_block(k, 1 + (0x09000000 << 32), bytes.fromhex("0000004a00000000"))
print("ChaCha20 block matches RFC 8439:", blk[:16].hex() == "10f1e7e4d13b5915500fdd1fa32071c4")
pk = bytes.fromhex("85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b")
print("Poly1305 tag matches RFC 8439:  ",
      poly1305(pk, b"Cryptographic Forum Research Group").hex() == "a8061dc1305136c6c22b8baf0c0127a9")

# 64 bytes of key from the key exchange: SHA-256 gives 32, so RFC 4253 section 7.2
# extends it: K1 = HASH(K || H || "C" || session_id), K2 = HASH(K || H || K1).
k1 = hashlib.sha256(ssh_mpint(K_cli) + H_cli + b"C" + session_id).digest()
k2 = hashlib.sha256(ssh_mpint(K_cli) + H_cli + k1).digest()
main_key, header_key = (k1 + k2)[:32], (k1 + k2)[32:]

def seal(seq, payload):
    pad = 8 - (1 + len(payload)) % 8
    pad += 8 if pad < 4 else 0                       # 4 to 255 bytes of padding
    body = bytes([pad]) + payload + bytes(pad)       # (real padding is random)
    nonce = seq.to_bytes(8, "big")                   # the sequence number is the nonce
    enc_len = chacha(header_key, nonce, 0, len(body).to_bytes(4, "big"))
    enc_body = chacha(main_key, nonce, 1, body)
    poly_key = chacha(main_key, nonce, 0, bytes(32))
    return enc_len + enc_body + poly1305(poly_key, enc_len + enc_body)
def open_packet(seq, packet):
    nonce = seq.to_bytes(8, "big")
    length = int.from_bytes(chacha(header_key, nonce, 0, packet[:4]), "big")  # length first
    enc, tag = packet[4:4 + length], packet[4 + length:4 + length + 16]
    if not hmac.compare_digest(tag, poly1305(chacha(main_key, nonce, 0, bytes(32)), packet[:4] + enc)):
        return "bad tag: disconnect, before anything is decrypted"
    body = chacha(main_key, nonce, 1, enc)
    return body[1:len(body) - body[0]]

msg = b"\x5e" + struct.pack(">I", 0) + ssh_string(b"uptime\n")   # CHANNEL_DATA on channel 0
pkt = seal(3, msg)
print("packet on the wire:", len(pkt), "bytes:", pkt[:4].hex(), "...", pkt[-16:].hex()[:16], "...")
print("received as packet 3:", open_packet(3, pkt)[9:])
print("replayed as packet 4:", open_packet(4, pkt))
flipped = pkt[:10] + bytes([pkt[10] ^ 1]) + pkt[11:]
print("one bit flipped:     ", open_packet(3, flipped))
```

```text
ChaCha20 block matches RFC 8439: True
Poly1305 tag matches RFC 8439:   True
packet on the wire: 44 bytes: 93574f00 ... 0e8a0acd89a4918b ...
received as packet 3: b'uptime\n'
replayed as packet 4: bad tag: disconnect, before anything is decrypted
one bit flipped:      bad tag: disconnect, before anything is decrypted
```

The receiver decrypts four bytes with the header key to learn the length,
then checks the tag over the whole packet before decrypting the payload. An
attacker who sends random bytes learns nothing from the length step, because
a wrong length only produces a failed tag and a closed connection; this is
what the 2009 attack on CBC lacked. Note also that the payload key is never
used to encrypt with counter 0: that block becomes the one-time Poly1305 key,
as in the IETF construction of RFC 8439, so each packet has its own MAC key.

Why encrypt the length at all, when encrypt-then-MAC leaves it in the clear?
Packet lengths reveal something about the traffic: in an interactive session,
a stream of short packets is typing. Hiding the length does not hide the size
of the TCP segment, so the gain is small, and OpenSSH's later keystroke
obfuscation (§6.10) does more. The real benefit of the design was that it let
the length be authenticated without being sent in the clear, at the price of a
second key.

Compression (`zlib@openssh.com`) is still allowed, but only after user
authentication, to keep secrets and attacker-chosen data out of the same
compression window during login. After authentication the risk of a CRIME-style
attack (Chapter 4) remains if an application mixes secrets with attacker data,
which is one reason compression is off by default.

## 6.5 Trusting the server

*Level: intermediate.*

SSH's transport proves that the server holds the private key for host key
$K_S$. Whether $K_S$ belongs to the machine you meant is a separate question,
and SSH offers four answers.

**Trust on first use (TOFU).** The first time you connect, `ssh` shows the key's
fingerprint and asks whether to continue. If you say yes, it writes the key into
`~/.ssh/known_hosts`. Every later connection must present the same key, or
`ssh` refuses with a famous warning. TOFU is protected against attackers who
arrive *later*; it is not protected on the first connection, and most users
type "yes" without comparing the fingerprint with anything.

OpenSSH can **hash** the host names in `known_hosts` (the `HashKnownHosts`
option, the default on several Linux distributions), so that someone who steals
the file cannot read off a list of the machines you connect to. Each entry
stores a random salt and HMAC-SHA1(salt, host name).

```python
# known_hosts: trust on first use, and the hashed host names OpenSSH writes
# when HashKnownHosts is on (|1|salt|HMAC-SHA1(salt, hostname)).
import base64, hashlib, hmac, os

def hashed_entry(host, key_line, salt=None):
    salt = salt or os.urandom(20)
    mac = hmac.new(salt, host.encode(), hashlib.sha1).digest()
    return "|1|%s|%s %s" % (base64.b64encode(salt).decode(), base64.b64encode(mac).decode(), key_line)

def lookup(known_hosts, host):
    for line in known_hosts:
        names, key = line.split(" ", 1)
        if names.startswith("|1|"):
            _, _, salt, mac = names.split("|")
            test = hmac.new(base64.b64decode(salt), host.encode(), hashlib.sha1).digest()
            if hmac.compare_digest(test, base64.b64decode(mac)):
                return key
        elif host in names.split(","):
            return key
    return None

def connect(known_hosts, host, offered_key):
    stored = lookup(known_hosts, host)
    if stored is None:
        known_hosts.append(hashed_entry(host, offered_key))
        return "first contact: ask the user to check the fingerprint, then remember it"
    if stored == offered_key:
        return "key matches: connect"
    return "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! refusing to connect"

real = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKbOnuWj0ZVtSn9nLqkG8gEAjEoqPeL3e9g0F0zbWGa2"
fake = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEkAMbmUHWFYtrM4N9iTNydw86Q0xS3AaM9YRuj4X+JN"
kh = []
print(connect(kh, "habitat.arcadia.mars", real))
print(connect(kh, "habitat.arcadia.mars", real))
print(connect(kh, "habitat.arcadia.mars", fake))
salt, mac = kh[0].split("|")[2:4]
print("stored entry: |1|<%d-byte salt>|<%d-byte HMAC> %s..." % (
      len(base64.b64decode(salt)), len(base64.b64decode(mac.split()[0])), kh[0].split(" ", 1)[1][:24]))
print("host name in the file?", "arcadia" in kh[0])
```

```text
first contact: ask the user to check the fingerprint, then remember it
key matches: connect
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! refusing to connect
stored entry: |1|<20-byte salt>|<20-byte HMAC> ssh-ed25519 AAAAC3NzaC1l...
host name in the file? False
```

Hashing slows an attacker down only a little: host names are guessable, and an
attacker who suspects you use `habitat.arcadia.mars` can test it against every
entry. It hides the list from casual reading, not from a determined search.

**SSHFP records** (RFC 4255, 2006) put the host key's fingerprint in DNS. With
`VerifyHostKeyDNS`, the client compares the key with the record, which is
meaningful only if the DNS answer is authenticated by DNSSEC
([Chapter 10](10-DNSSEC-and-Private-DNS.md)).

**SSH certificates** (OpenSSH 5.4, 2010) are the answer for organizations. An
SSH certificate is not X.509; it is a short OpenSSH-specific structure in which
a **certificate authority key** signs a host or user key with a list of
**principals** (host names, or user names), a validity period, a serial number,
and options. A client that trusts the CA (`@cert-authority *.arcadia.mars ...`
in `known_hosts`) accepts any host key signed by it for those names, with no
first-use prompt. Servers that trust a CA for users accept any user key signed
for a principal they allow. Large companies issue users certificates that last
a working day, after a login with a security key, and never distribute
`authorized_keys` files at all.

### Code it: an SSH certificate

An OpenSSH certificate is a short sequence of SSH strings and integers, signed
by the CA key. The program below writes one in the real format for an Ed25519
user key, for the user `jim`, valid for eight hours, and then checks it the way
`sshd` does for a server whose `TrustedUserCAKeys` file names the city's CA.

```python
# An OpenSSH user certificate (format of PROTOCOL.certkeys, ssh-ed25519-cert-v01),
# signed by a CA and checked the way sshd does. Continue from the toolkit.
import struct

seed = lambda label: hashlib.sha256(label.encode()).digest()
u64, u32 = (lambda n: struct.pack(">Q", n)), (lambda n: struct.pack(">I", n))
CERT = b"ssh-ed25519-cert-v01@openssh.com"

def make_cert(ca_secret, user_pub, key_id, principals, after, before, serial):
    body = (ssh_string(CERT) + ssh_string(seed("nonce " + key_id)) + ssh_string(user_pub) +
            u64(serial) + u32(1) +                                   # type 1 = user
            ssh_string(key_id.encode()) +
            ssh_string(b"".join(ssh_string(p.encode()) for p in principals)) +
            u64(after) + u64(before) +
            ssh_string(b"") +                                        # critical options
            ssh_string(ssh_string(b"permit-pty") + ssh_string(b"")) +   # extensions
            ssh_string(b"") +                                        # reserved
            ssh_string(ssh_string(b"ssh-ed25519") + ssh_string(public_key(ca_secret))))
    sig = ssh_string(b"ssh-ed25519") + ssh_string(sign(ca_secret, body))
    return body + ssh_string(sig)

def read_strings(b):
    out = []
    while b:
        n = int.from_bytes(b[:4], "big"); out.append(b[4:4 + n]); b = b[4 + n:]
    return out
def parse(cert):
    f, i = {}, 0
    def take_string():
        nonlocal i
        n = int.from_bytes(cert[i:i + 4], "big"); v = cert[i + 4:i + 4 + n]; i += 4 + n; return v
    def take(n):
        nonlocal i
        v = int.from_bytes(cert[i:i + n], "big"); i += n; return v
    f["type_name"], f["nonce"], f["pk"] = take_string(), take_string(), take_string()
    f["serial"], f["type"], f["key_id"] = take(8), take(4), take_string()
    f["principals"] = [p.decode() for p in read_strings(take_string())]
    f["after"], f["before"] = take(8), take(8)
    f["critical"], f["extensions"], f["reserved"] = take_string(), take_string(), take_string()
    f["ca"] = read_strings(take_string())[1]
    signed_part = cert[:i]
    f["sig"] = read_strings(take_string())[1]
    return f, signed_part

def sshd_accepts(cert, user, now, trusted_ca, revoked=()):
    f, signed = parse(cert)
    if f["ca"] != trusted_ca:                 return "refused: not signed by a trusted CA"
    if not verify(f["ca"], signed, f["sig"]): return "refused: bad CA signature"
    if f["type"] != 1:                        return "refused: not a user certificate"
    if user not in f["principals"]:           return "refused: not valid for user " + user
    if not f["after"] <= now < f["before"]:   return "refused: expired or not yet valid"
    if f["serial"] in revoked:                return "refused: serial is revoked"
    return "accepted: key id %r, user %s" % (f["key_id"].decode(), user)

ca = seed("arcadia city user CA")
jim = public_key(seed("jim's laptop key"))
start = 1_794_200_400                         # 9 Nov 2026, 05:00 UTC
cert = make_cert(ca, jim, "jim@laptop, after security-key login", ["jim"],
                 start, start + 8 * 3600, serial=1041)
print("certificate size:", len(cert), "bytes")
print("09:00 UTC:", sshd_accepts(cert, "jim", start + 4 * 3600, public_key(ca)))
print("as root:", sshd_accepts(cert, "root", start + 4 * 3600, public_key(ca)))
print("18:00 UTC:", sshd_accepts(cert, "jim", start + 13 * 3600, public_key(ca)))
print("lost laptop:", sshd_accepts(cert, "jim", start + 3600, public_key(ca), revoked={1041}))
forged = cert.replace(ssh_string(b"jim"), ssh_string(b"ops"), 1)   # edit the principal
print("edited:", sshd_accepts(forged, "ops", start + 3600, public_key(ca)))
```

```text
certificate size: 359 bytes
09:00 UTC: accepted: key id 'jim@laptop, after security-key login', user jim
as root: refused: not valid for user root
18:00 UTC: refused: expired or not yet valid
lost laptop: refused: serial is revoked
edited: refused: bad CA signature
```

Every rule `sshd` applies is visible. The CA signature covers every field,
including the principals and the validity window, so editing the certificate
breaks it. The principal list says which accounts the key may enter; an empty
list would mean "any", which is why OpenSSH warns when a CA signs one. The
serial number lets the administrator revoke a single certificate in a **key
revocation list** (KRL), a compact file that `sshd` reads with `RevokedKeys`;
there is no online check like OCSP. And because the certificate expires the
same evening, a stolen laptop is a problem for hours, not years. The key ID
appears in the server's log at every login, so the CA can put in it who asked
for the certificate and how they proved it.

**Key rotation.** A server that wants to change its host key used to break every
client's `known_hosts`. Since OpenSSH 6.8 (2015) a server can send all its host
keys after authentication (`hostkeys-00@openssh.com`), and the client, if the
`UpdateHostKeys` option allows, adds the new ones, so a later switch is smooth.

!!! note "Life story: trust on first use"
    **Born:** 1995, in Ylönen's SSH; later named "TOFU" or "leap of faith"
    · **Purpose:** authenticate servers with no certificate authority by
    remembering their keys · **Helped:** made SSH deployable everywhere
    overnight; copied by Signal's safety numbers and by pinning in apps ·
    **Status:** current, and weakest at the first connection; certificates
    and SSHFP close the gap where an organization can run them

## 6.6 Logging in

*Level: intermediate.*

Once the transport is up, the client asks for the `ssh-userauth` service and
tries methods until one succeeds. The server answers each failure with the list
of methods that can continue.

**Password.** The password is sent, encrypted by the transport, to the server,
which checks it against its own records. This is safe from eavesdroppers but
not from a server you should not have trusted: if you accept a fake host key,
you hand the attacker your password. Servers on the Internet also see endless
password guessing by bots, which is why many disable passwords.

**Public key.** The user has a key pair; the server has the public key in
`~/.ssh/authorized_keys`. The client signs a message that contains the
**session identifier** of this connection, the user name, the service and the
public key, and the server checks the signature.

```python
# Public-key user authentication (RFC 4252 section 7): what the client signs.
# Continue from the two programs above (it needs session_id and the toolkit).
user_secret = seed("jim's laptop key")
user_pub = public_key(user_secret)
blob = ssh_string(b"ssh-ed25519") + ssh_string(user_pub)

def userauth_data(session_id, user):
    return (ssh_string(session_id) + bytes([50]) +        # SSH_MSG_USERAUTH_REQUEST
            ssh_string(user.encode()) + ssh_string(b"ssh-connection") +
            ssh_string(b"publickey") + b"\x01" +
            ssh_string(b"ssh-ed25519") + ssh_string(blob))

sig = sign(user_secret, userauth_data(session_id, "jim"))
authorized_keys = [blob]                                   # the server's ~/.ssh/authorized_keys
print("server accepts jim:", blob in authorized_keys and
      verify(user_pub, userauth_data(session_id, "jim"), sig))
other_session = hashlib.sha256(b"a different connection").digest()
print("same signature replayed on another connection:",
      verify(user_pub, userauth_data(other_session, "jim"), sig))
print("same signature for another user name:",
      verify(user_pub, userauth_data(session_id, "root"), sig))
```

```text
server accepts jim: True
same signature replayed on another connection: False
same signature for another user name: False
```

Because the session identifier is inside the signed data, the signature is
useless on any other connection. A malicious server cannot take your signature
and replay it to log in somewhere else as you, which is exactly the relay that
a password does not prevent. The user name is inside too, so the signature
cannot be moved to another account.

**Security keys.** Since OpenSSH 8.2 (2020), keys of type
`sk-ssh-ed25519@openssh.com` and `sk-ecdsa-sha2-nistp256@openssh.com` live on
a FIDO2 security key (Chapter 13). The private key never
leaves the device, and each signature requires a touch, so malware on the
laptop cannot use the key silently. The key file on disk is only a handle.

**Keyboard-interactive** is a general challenge-response method used for
one-time codes and other prompts (Chapter 11).
**GSSAPI** lets SSH use Kerberos tickets (Chapter 12).

`authorized_keys` lines can carry restrictions in front of the key:
`from="10.0.0.0/8"` limits where it may be used, `command="backup.sh"` forces
one command, `no-port-forwarding` and `restrict` take away abilities. A key
used by an automated job should always carry them.

### Choosing a key type

Three kinds of user and host key are in common use. All give about 128 bits of
security at the sizes shown; they differ in size, speed and how easy they are
to misuse.

| | RSA | ECDSA | Ed25519 |
| --- | --- | --- | --- |
| Hard problem | factoring | discrete log on NIST curves | discrete log on Curve25519 |
| SSH key type | `ssh-rsa` key, signing with `rsa-sha2-256/512` | `ecdsa-sha2-nistp256` (and 384, 521) | `ssh-ed25519` |
| Size for 128-bit security | 3,072 bits | 256 bits | 256 bits (32-byte key) |
| Speed | slow to generate and sign | fast | fastest |
| Per-signature nonce | none | must be random and secret | derived from the key and message |
| Supported since | always | OpenSSH 5.7 (2011) | OpenSSH 6.5 (2014) |

**Ed25519** is the right default: small keys, fast signatures, and no random
nonce to get wrong. **ECDSA** is fine with a good random number generator, but
a repeated or biased nonce reveals the private key ([Chapter 15 of book 1](../../book/15-Elliptic-Curves.md)), which
is why Ed25519's deterministic nonces matter. **RSA** is for old servers; use at
least 3,072 bits, and note that what was deprecated in 2021 was the SHA-1
*signature* (`ssh-rsa`), not RSA keys, which modern clients sign with SHA-2
automatically. DSA keys are gone from OpenSSH since version 10.0 (2025). Where a
security key is available, `ssh-keygen -t ed25519-sk` puts the key on it, and
the [ssh-keygen recipes](../../tools/ssh-keygen.md) give the commands.

## 6.7 Channels, forwarding and the agent

*Level: intermediate.*

The connection layer opens **channels**, each with its own flow control: a
`session` channel for a shell or command, `direct-tcpip` for a port forwarded
from the client side (`ssh -L`), `forwarded-tcpip` for one from the server side
(`ssh -R`). `ssh -D` turns SSH into a SOCKS proxy. SFTP is a subsystem that
runs in a session channel.

**Agent forwarding** deserves care. `ssh-agent` holds your private keys in
memory and signs on request, so you type a passphrase once. With `ssh -A`, the
agent is made available on the remote machine, so you can hop from there to a
third machine with your keys. But anyone with root on the intermediate machine
(or anyone who can reach the agent's socket there) can ask your agent to sign
for them, for as long as you stay connected, and log in to anything your keys
open. The keys are never copied; they are *used*. **ProxyJump** (`ssh -J`)
avoids this: the client opens a tunnel *through* the jump host and runs the
second SSH connection end to end from the laptop, so the jump host only
forwards encrypted bytes. Agents can also be told to confirm each use
(`ssh-add -c`), and security keys require a touch per signature.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Agent forwarding compared with ProxyJump: with ssh -A the jump host can ask the laptop's agent to sign; with ssh -J the jump host only relays encrypted bytes of a connection that runs from laptop to target" fill="currentColor" font-size="13.5">
<text x="20" y="24" font-weight="bold">ssh -A: agent forwarding</text>
<rect x="20" y="40" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="90" y="65" text-anchor="middle">laptop</text>
<text x="90" y="85" text-anchor="middle" font-size="12.5">agent with keys</text>
<rect x="250" y="40" width="140" height="60" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="65" text-anchor="middle">jump host</text>
<text x="320" y="85" text-anchor="middle" font-size="12.5" class="acc-fill">agent socket here</text>
<rect x="480" y="40" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="550" y="75" text-anchor="middle">target</text>
<line x1="160" y1="70" x2="250" y2="70" stroke="currentColor" stroke-width="2"/>
<line x1="390" y1="70" x2="480" y2="70" stroke="currentColor" stroke-width="2"/>
<text x="205" y="62" text-anchor="middle" font-size="12">SSH 1</text>
<text x="435" y="62" text-anchor="middle" font-size="12">SSH 2</text>
<path d="M300 100 C 280 135, 140 135, 100 102" fill="none" stroke="currentColor" class="acc" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="100,102 104,115 112,107" class="acc-fill"/>
<text x="200" y="148" text-anchor="middle" font-size="12.5" class="acc-fill">root on the jump host: "please sign this"</text>
<text x="20" y="194" font-weight="bold">ssh -J: ProxyJump</text>
<rect x="20" y="210" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="90" y="235" text-anchor="middle">laptop</text>
<text x="90" y="255" text-anchor="middle" font-size="12.5">agent with keys</text>
<rect x="250" y="210" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="235" text-anchor="middle">jump host</text>
<text x="320" y="255" text-anchor="middle" font-size="12.5">relays bytes only</text>
<rect x="480" y="210" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="550" y="245" text-anchor="middle">target</text>
<line x1="160" y1="226" x2="250" y2="226" stroke="currentColor" stroke-width="2"/>
<text x="205" y="220" text-anchor="middle" font-size="12">SSH 1</text>
<line x1="160" y1="290" x2="480" y2="290" stroke="currentColor" class="acc" stroke-width="2.5"/>
<line x1="550" y1="270" x2="550" y2="290" stroke="currentColor" class="acc" stroke-width="2.5"/>
<line x1="160" y1="290" x2="160" y2="270" stroke="currentColor" class="acc" stroke-width="2.5"/>
<line x1="480" y1="290" x2="550" y2="290" stroke="currentColor" class="acc" stroke-width="2.5"/>
<text x="320" y="315" text-anchor="middle" font-size="12.5" class="acc-fill">SSH 2 runs end to end, laptop to target, inside SSH 1</text>
</svg>
<figcaption>Figure 6.5. Two ways to reach a machine through a jump host. With agent forwarding, the jump host can use your keys while you are connected. With ProxyJump, it sees only encrypted bytes.</figcaption>
</figure>

In 2023 OpenSSH added **agent restriction** (`ssh-add -h`), which tells the
agent which hosts each key may be used for and through which paths, binding
signatures to host keys the agent can check. It is the first serious fix for
forwarding's risk in twenty years.

## 6.8 Post-quantum SSH

*Level: intermediate.*

SSH changed its key exchange to resist quantum computers years before most
protocols. OpenSSH 9.0, in April 2022, made
`sntrup761x25519-sha512@openssh.com` the default: a hybrid of X25519 and
Streamlined NTRU Prime, a lattice KEM that was a finalist alternate in NIST's
competition. The reasoning was harvest-now-decrypt-later (Chapter 1): SSH
sessions carry administrator passwords and configuration secrets with long
lives. When NIST standardized ML-KEM in 2024, OpenSSH 9.9 (September 2024)
added `mlkem768x25519-sha256`, and OpenSSH 10.0 (April 2025) made it the
default. The two hybrids were published as RFC 9941 (April 2026) and RFC 10042
(August 2026).

The hybrid works just like TLS's (Chapter 3, §3.10): the client sends an ML-KEM
encapsulation key and an X25519 key, the server returns a ciphertext and its
X25519 key, and the two shared secrets are hashed together into $K$. The rest
of the protocol, including the exchange hash and key derivation, does not
change.

Host and user keys, which are signatures, can wait longer, for the reason given
in Chapter 3. OpenSSH has begun adding hybrid signature types that pair ML-DSA
with Ed25519; check `ssh -Q key` on your version to see what it supports.

## 6.9 Mars: SSH over a light-time link

*Level: intermediate.*

An administrator on Earth wants to fix a server in Arcadia City. How many round
trips does one SSH session take before the first command runs? Count: TCP's
handshake (1), version strings and KEXINIT (they can be sent together, but the
choice depends on both lists: 1), the key exchange (1), NEWKEYS and the service
request (1), user authentication (1, more if the first method fails), opening
a session channel (1), and the command (1). About seven round trips: at the
average distance, nearly three hours before the first output comes back. Every
keystroke in an interactive shell then takes 25 minutes to echo.

Interactive SSH is simply the wrong tool at that distance, and the city would
not use it across the link. The pieces of SSH that do survive are the
cryptographic ones: a signed, encrypted **command** that a machine on Mars
verifies against a key it already trusts and runs, sending back a signed
result, with no live session. That is the store-and-forward model of
Chapter 20. Inside the city, SSH works as usual, and
the city's administrators would use SSH certificates from the city's own CA
(Chapter 2's offline root), so that a new machine never needs a first-use
prompt and a lost laptop's certificate simply expires at the end of the day.

A milder version of the problem exists on Earth. Keith Winstein and Hari
Balakrishnan's **mosh** (2012) keeps a session alive over mobile networks with
high delay by running its own encrypted UDP protocol (with AES-OCB) and
predicting locally which characters the remote side will echo. It uses SSH
only to start.

## 6.10 Attacks

*Level: intermediate.*

**SSH-1's CRC-32** (1998 and 2001). SSH-1 protected integrity with CRC-32, a
checksum, not a MAC. In 1998 Ariel Futoransky and Emiliano Kargieman of CORE
SDI showed that because CRC is linear, an attacker could insert chosen data into
an encrypted stream and fix up the checksum. The patch, a "CRC-32 compensation
attack detector", contained an integer overflow that let attackers run code on
the server before login (CVE-2001-0144). It was exploited widely; in the 2003
film *The Matrix Reloaded*, Trinity breaks into a power station with `nmap` and
an exploit for this very bug, one of the few accurate hacking scenes in film.
SSH-1 was removed from OpenSSH's server in 2017.

**Keystroke timing** (2001). Dawn Song, David Wagner and Xuqing Tian showed
that in an interactive session each keystroke is sent in its own packet the
moment it is typed, so the timing between packets leaks information about what
is typed, including passwords typed into a remote `su`. OpenSSH 9.5 (2023)
added keystroke timing obfuscation, which sends packets at fixed intervals with
fake ones mixed in while typing.

**Weak keys.** In May 2008 Debian discovered that a change it had made to
OpenSSL two years earlier left only the process ID as a source of randomness,
so every key generated on Debian and Ubuntu systems in that period came from a
set of about 32,768 per key type and size. Every such SSH host key and user key
had to be replaced, and OpenSSH added a blacklist. Book 2 tells the story from
the attacker's side.

**Passive key recovery** (2023). Keegan Ryan, Kaiwen He, George Sullivan and
Nadia Heninger collected SSH handshakes from Internet scans and found RSA host
key signatures that had been corrupted by hardware faults in certain devices.
A faulty RSA-CRT signature reveals a factor of the modulus ([Chapter 13 of
book 1](../../book/13-RSA.md)), and they recovered private host keys of
network devices purely by observing their handshakes.

### Terrapin (2023)

In December 2023 Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk of Ruhr
University Bochum published **Terrapin** (CVE-2023-48795). The SSH key exchange
authenticates its messages through the exchange hash, but the hash does not
cover *how many* packets were sent during the unencrypted handshake. Packet
sequence numbers, which every MAC covers, keep counting from the start of the
connection, through the handshake. So an attacker can **insert** one harmless
message (an IGNORE) during the handshake, which raises the client's count by
one, and then **delete** the first encrypted message from the server, which
lowers it by one. The counts line up again, every later MAC checks, and nobody
notices that a message is missing.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Terrapin: the attacker inserts an IGNORE message before NEWKEYS and deletes EXT_INFO after it; the client's sequence numbers line up again so the next MAC verifies" fill="currentColor" font-size="13.5">
<text x="150" y="22" text-anchor="middle" font-weight="bold">server sends</text>
<text x="490" y="22" text-anchor="middle" font-weight="bold">client receives</text>
<g font-size="13">
<text x="40" y="58">0</text><rect x="60" y="42" width="200" height="26" class="soft" stroke="currentColor"/><text x="160" y="60" text-anchor="middle">KEXINIT</text>
<text x="40" y="98">1</text><rect x="60" y="82" width="200" height="26" class="soft" stroke="currentColor"/><text x="160" y="100" text-anchor="middle">KEX_ECDH_REPLY</text>
<text x="40" y="178">2</text><rect x="60" y="162" width="200" height="26" class="soft" stroke="currentColor"/><text x="160" y="180" text-anchor="middle">NEWKEYS</text>
<text x="40" y="218">3</text><rect x="60" y="202" width="200" height="26" class="soft-acc" stroke="currentColor"/><text x="160" y="220" text-anchor="middle">{EXT_INFO}</text>
<text x="40" y="258">4</text><rect x="60" y="242" width="200" height="26" class="soft-acc" stroke="currentColor"/><text x="160" y="260" text-anchor="middle">{SERVICE_ACCEPT}, MAC with 4</text>
<rect x="380" y="42" width="200" height="26" class="soft" stroke="currentColor"/><text x="480" y="60" text-anchor="middle">KEXINIT</text><text x="598" y="58">0</text>
<rect x="380" y="82" width="200" height="26" class="soft" stroke="currentColor"/><text x="480" y="100" text-anchor="middle">KEX_ECDH_REPLY</text><text x="598" y="98">1</text>
<rect x="380" y="122" width="200" height="26" fill="none" stroke="currentColor" class="acc" stroke-width="2"/><text x="480" y="140" text-anchor="middle" class="acc-fill">IGNORE (inserted)</text><text x="598" y="138" class="acc-fill">2</text>
<rect x="380" y="162" width="200" height="26" class="soft" stroke="currentColor"/><text x="480" y="180" text-anchor="middle">NEWKEYS</text><text x="598" y="178">3</text>
<rect x="380" y="242" width="200" height="26" class="soft-acc" stroke="currentColor"/><text x="480" y="260" text-anchor="middle">{SERVICE_ACCEPT}</text><text x="598" y="258">4</text>
</g>
<line x1="260" y1="55" x2="380" y2="55" stroke="currentColor"/>
<line x1="260" y1="95" x2="380" y2="95" stroke="currentColor"/>
<line x1="260" y1="175" x2="380" y2="175" stroke="currentColor"/>
<line x1="260" y1="255" x2="380" y2="255" stroke="currentColor"/>
<line x1="260" y1="215" x2="320" y2="215" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="310" y1="205" x2="330" y2="225" stroke="currentColor" class="acc" stroke-width="2.5"/>
<line x1="330" y1="205" x2="310" y2="225" stroke="currentColor" class="acc" stroke-width="2.5"/>
<text x="320" y="300" text-anchor="middle" font-size="12.5">one message in, one message out: both sides reach 4, and the MAC checks</text>
<text x="320" y="320" text-anchor="middle" font-size="12.5" class="acc-fill">EXT_INFO is gone, and nothing reports it</text>
</svg>
<figcaption>Figure 6.6. Terrapin. Numbers are the implicit sequence numbers each side counts. The inserted IGNORE travels in the unauthenticated phase, and the deleted EXT_INFO restores the count.</figcaption>
</figure>

```python
# Terrapin (2023): the attacker deletes a message right after the key exchange
# without being noticed, because SSH's sequence numbers keep counting across it.
import hashlib, hmac

def mac(key, seq, payload):            # SSH MACs cover the implicit sequence number
    return hmac.new(key, seq.to_bytes(4, "big") + payload, hashlib.sha256).digest()

def run(strict):
    key = b"keys from the new key exchange"
    # Server sends: KEXINIT, KEX_ECDH_REPLY, NEWKEYS (unencrypted), then encrypted
    # EXT_INFO (which, e.g., turns on a security feature) and a first reply.
    server_plain = [b"KEXINIT", b"KEX_ECDH_REPLY", b"NEWKEYS"]
    server_secure = [b"EXT_INFO: enable keystroke-timing protection", b"SERVICE_ACCEPT"]
    # The attacker inserts one IGNORE before NEWKEYS (unauthenticated phase) ...
    received_plain = server_plain[:2] + [b"IGNORE (injected)"] + server_plain[2:]
    # ... and deletes the first encrypted message.
    sent = []
    seq = 0 if strict else len(server_plain)      # strict kex resets the counter at NEWKEYS
    for msg in server_secure:
        sent.append((msg, mac(key, seq, msg)))
        seq += 1
    delivered = sent[1:]                          # EXT_INFO dropped by the attacker
    # Client: counts every packet it received, including the injected IGNORE.
    rseq = 0 if strict else len(received_plain)
    if strict and any(m.startswith(b"IGNORE") for m in received_plain):
        return "strict kex: unexpected message during key exchange -> disconnect"
    for msg, tag in delivered:
        if not hmac.compare_digest(tag, mac(key, rseq, msg)):
            return "MAC failure -> disconnect"
        rseq += 1
    got = [m.decode() for m, _ in delivered]
    return "accepted " + str(got) + "; EXT_INFO silently lost"

print("original SSH:", run(strict=False))
print("with strict: ", run(strict=True))
```

```text
original SSH: accepted ['SERVICE_ACCEPT']; EXT_INFO silently lost
with strict:  strict kex: unexpected message during key exchange -> disconnect
```

The first encrypted message is usually EXT_INFO (RFC 8308), which negotiates
extensions; deleting it can turn off security features such as the keystroke
timing protection above, or switch signature algorithms. The attack works with
`chacha20-poly1305@openssh.com` and with CBC encrypt-then-MAC modes; it does not
work with AES-GCM, whose nonces come from their own counter. When it was
published, the authors estimated that a large majority of SSH servers on the
Internet supported an affected mode.

The fix, **strict key exchange** (`kex-strict-c-v00@openssh.com` and its
server twin, OpenSSH 9.6, December 2023), resets the sequence numbers to zero
after each NEWKEYS and makes any unexpected message during the initial key
exchange fatal. Both sides must support it. The deeper lesson is Chapter 1's:
the transcript hash must cover *everything* that affects the session's state,
and the sequence number was state that it did not cover.

### The xz backdoor (2024)

On 29 March 2024 Andres Freund, an engineer at Microsoft who works on the
PostgreSQL database, noticed that SSH logins on a test machine running a
pre-release Debian took about half a second longer than usual and used more
CPU. He traced it to the compression library **liblzma**, part of the xz
utilities, versions 5.6.0 and 5.6.1. A contributor using the name "Jia Tan"
had spent more than two years becoming a trusted maintainer of xz, and had then
hidden a backdoor in its test files and build scripts. On Linux distributions
that link `sshd` to `libsystemd`, which loads liblzma, the backdoor replaced an
RSA function inside `sshd`. A client could then present a key containing a
command signed with the attacker's own Ed448 key, and `sshd` would run it as
root, before any authentication. Nobody without the attacker's private key
could use it.

It was caught before it reached the stable releases of the major
distributions. Nothing about SSH's cryptography was wrong: the attack went
around it, through the software supply chain. It changed how open-source
projects think about maintainer trust, release tarballs that differ from the
repository, and the number of libraries loaded into security-critical daemons.
OpenSSH has since reduced the code that runs in its listener before
authentication.

### regreSSHion (2024)

In July 2024 Qualys found that a 2006 race condition in `sshd`'s handling of
the login timeout signal (CVE-2006-5051, fixed then) had been reintroduced by a
code change in OpenSSH 8.5 (2020). On glibc-based Linux systems, an attacker
who kept connecting until a signal arrived at exactly the wrong moment could
run code as root, without authentication, after many hours of attempts.
CVE-2024-6387 was fixed in OpenSSH 9.8. OpenSSH then split the pre-authentication
listener into a separate, smaller program (`sshd-session`, then
`sshd-auth`), continuing the privilege separation design that Niels Provos,
Markus Friedl and Peter Honeyman introduced in 2002.

!!! note "Life story: Terrapin"
    **Born:** December 2023, Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk
    (Ruhr University Bochum), USENIX Security 2024 · **Purpose:** delete
    messages at the start of an SSH session by manipulating sequence numbers
    · **Helped:** strict key exchange in OpenSSH 9.6 and other
    implementations · **Status:** fixed where both ends support strict kex

!!! note "Life story: the xz backdoor"
    **Born:** inserted February 2024 into xz 5.6.0 and 5.6.1 after years of
    social engineering; found 29 March 2024 by Andres Freund (CVE-2024-3094)
    · **Purpose:** remote code execution as root in `sshd` for the holder of
    one Ed448 key · **Helped:** a reckoning with open-source supply chains,
    reproducible builds and the load placed on lone maintainers · **Status:**
    removed before reaching stable distribution releases; the attacker's
    identity is unknown

## 6.11 In the real world

*Level: intermediate.*

- **GitHub's host key** (March 2023). GitHub announced that its RSA SSH host
  private key had been briefly exposed in a public repository, and replaced it.
  Every user who connected afterward saw the "REMOTE HOST IDENTIFICATION HAS
  CHANGED" warning, which in this case was genuine. It was a mass lesson in
  TOFU: the right reaction was to check GitHub's published fingerprints, not to
  delete the warning blindly.
- **SHA-1 signatures.** The old `ssh-rsa` signature type uses SHA-1. After the
  SHA-1 chosen-prefix collision of 2020 ("SHA-1 is a Shambles"), OpenSSH 8.8
  (2021) disabled it by default, while keeping RSA keys usable with
  `rsa-sha2-256` and `rsa-sha2-512` (RFC 8332). DSA keys were removed entirely
  in OpenSSH 10.0 (2025).
- **Bots.** Any SSH server on a public address is tried by password-guessing
  bots within minutes of going online. Key-only authentication, or a VPN in
  front ([Chapter 8](08-WireGuard-and-Noise.md)), ends the problem.
- **Keys that never die.** Audits of large organizations routinely find
  `authorized_keys` entries for people who left years ago, and private keys
  copied between machines without passphrases. Certificates with a lifetime of
  hours, issued after a login with a security key, are how large companies
  closed that hole.

- **Shared keys in devices** (2015). SEC Consult scanned the Internet for the
  host keys and certificates built into router and modem firmware, and found
  that a few hundred private keys, extracted from firmware images anyone could
  download, were in use on millions of devices. Anyone with the firmware could
  impersonate all of them. A host key must be generated on the machine, at
  first boot, never shipped in an image.
- **libssh accepts "success"** (2018). In the libssh server library, a client
  could skip authentication by sending the message that a *server* uses to say
  "authentication succeeded" (CVE-2018-10933, found by Peter Winter-Smith of
  NCC Group). The state machine did not check which side was allowed to send
  it. The cryptography was intact; the protocol's order was not enforced.
- **Erlang/OTP's SSH** (2025). The same class of bug, worse: the SSH server in
  Erlang/OTP processed connection-layer messages, including ones that run
  commands, before the user had authenticated (CVE-2025-32433). It was found
  by researchers at Ruhr University Bochum, the Terrapin group, and affected
  many network devices built on Erlang. Both cases are why §6.13 mentions state
  machine learning.

A good client configuration in 2026 is mostly the default of a current
OpenSSH: hybrid post-quantum key exchange first, Ed25519 or security-key user
keys, AEAD ciphers, strict key exchange, `ProxyJump` instead of agent
forwarding, and host certificates where an organization can run a CA. The
[SSH guide](../../topics/SSH.md) lists the commands.

## 6.12 Comparing SSH and TLS

*Level: intermediate.*

| | SSH | TLS 1.3 |
| --- | --- | --- |
| Server trust | TOFU, known_hosts, SSHFP, SSH certificates | X.509 chains to public CAs |
| Client authentication | almost always (keys, passwords, certificates) | rare on the web; mTLS between services |
| Transcript binding | exchange hash $H$ since 1996 | transcript hash in every key |
| Round trips before data | about 3 to 4 after TCP | 1 after TCP (0 with 0-RTT) |
| Session identifier usable by the application | yes, `session_id` signed in user auth | yes, exporters (RFC 9266) |
| Post-quantum key exchange by default | 2022 (sntrup), 2025 (ML-KEM) | 2024 in Chrome (ML-KEM) |
| Encrypted server identity | no: host key sent in the clear | yes: certificate encrypted |

The biggest difference is in who decides trust. TLS defers to a global system of
authorities; SSH leaves it to each user or organization. For a public web
server, TLS's choice is right: a visitor cannot be expected to check a
fingerprint. For machines one manages oneself, SSH's choice is often better:
no outside party can issue a certificate for your server.

## 6.13 Going deeper

*Level: expert.*

**Provable security of SSH.** Bellare, Kohno and Namprempre (2002) analyzed
SSH's binary packet protocol and proposed the counter-mode and encrypt-then-MAC
fixes later adopted; the 2009 plaintext recovery showed that their model, which
assumed the length field was handled atomically, did not match the
implementations. Florian Bergsma, Benjamin Dowling, Florian Kohlar, Jörg
Schwenk and Douglas Stebila (CCS 2014) proved the SSH key exchange secure even
when one long-term key is used across several cipher suites. Terrapin was found
partly by modeling the handshake's sequence numbers, which earlier models had
abstracted away.

**The agent protocol.** `ssh-agent` speaks a small protocol over a Unix socket,
recently written up as an IETF draft. Agent restriction (2023) extends it so
that a signing request carries the host keys of each hop, signed by those
hosts, and the agent checks them against the destinations allowed for the key.
It turns a forwarded agent from "sign anything for anyone" into "sign only for
these hosts".

**SSH certificates versus X.509.** OpenSSH's certificate format is
deliberately minimal: no chains (one CA signs leaves directly), no name
constraints, no revocation protocol (a key revocation list file is
distributed by the administrator). The simplicity is a security feature, as
Chapter 2's parser bugs suggest.

**Key derivation, in detail.** RFC 4253 §7.2 computes each key as
$\mathrm{HASH}(K \,\|\, H \,\|\, X \,\|\, \text{session\_id})$, and when more
bytes are needed, appends $\mathrm{HASH}(K \,\|\, H \,\|\, K_1)$, then
$\mathrm{HASH}(K \,\|\, H \,\|\, K_1 \,\|\, K_2)$, and so on. $K$ enters as an
`mpint`, a signed big-endian integer with no leading zero bytes and an extra
zero byte when the top bit is set. That encoding is a standing interoperability
trap: about one X25519 secret in 256 starts with a zero byte, and one in two has
its top bit set, so an implementation that hashes the raw 32 bytes agrees with
others most of the time and fails at random. RFC 8731 spells this out for
`curve25519-sha256`. The hybrid post-quantum methods avoid the trap by hashing
the combined secret and encoding the result as a fixed-length string.

**Strict key exchange as a specification.** OpenSSH documents strict kex in
its `PROTOCOL` file: each side signals support with a pseudo-algorithm name in
its first KEXINIT, and when both do, any message other than the expected
key-exchange messages before the first NEWKEYS ends the connection, and both
sequence numbers reset to zero after every NEWKEYS. It is a patch, not a
redesign; a design from scratch would have put the sequence numbers, or a count
of handshake messages, into the exchange hash, which is what TLS 1.3's
transcript does by hashing every handshake message.

**Formal tools on SSH implementations.** State machine learning (Paul Fiterău-Broştean
and colleagues, 2017) has been used to infer and check the state machines of
OpenSSH and other implementations, finding non-conforming behaviors similar to
TLS's SMACK results.

**What a post-quantum signature costs SSH.** An ML-DSA-44 signature is 2,420
bytes and its public key 1,312; in SSH the host key and one signature are sent
once per connection, and user keys once per login, so the size is not a
problem. The obstacle is the installed base of `known_hosts` files and
`authorized_keys` entries, all of which will need new keys, which is why
hybrid key types that pair ML-DSA with Ed25519 are being added before they are
required.

## Check yourself

??? question "1. Which SSH layer authenticates the server, and which the user? Why does the order matter?"

    The transport layer authenticates the server with its host key; the user
    authentication layer, running inside it, authenticates the user. The
    server is checked first, so a password or signature is only sent to a
    server whose key the client has accepted.

??? question "2. How is the algorithm in each category chosen from the two KEXINIT lists?"

    The first algorithm on the client's list that also appears on the
    server's list.

??? question "3. What goes into SSH's exchange hash $H$, and what does the server do with it?"

    Both version strings, both KEXINIT payloads, the server's host key, both
    ephemeral public keys and the shared secret $K$. The server signs $H$ with
    its host key; both sides derive keys from $K$ and $H$.

??? question "4. What is the session identifier, and how does it protect public-key login?"

    The exchange hash of the connection's first key exchange. The user's
    signature covers it, so the signature is only valid on that connection
    and cannot be relayed by a malicious server to log in elsewhere.

??? question "5. What did the 2009 plaintext recovery attack exploit in SSH's original packet format?"

    The length field was encrypted together with the data in CBC mode and had
    to be decrypted and acted on before any MAC was checked. Injected
    ciphertext was decrypted as a length, and the server's behavior while
    waiting for that many bytes leaked bits of the plaintext.

??? question "6. Why is hashing host names in `known_hosts` only a weak protection?"

    Host names are guessable. Anyone with the file can compute HMAC(salt,
    guess) for each entry and test candidate names, so hashing only hides the
    list from casual reading.

??? question "7. What is the risk of agent forwarding, and what is the safer alternative?"

    Root (or anyone with access to the agent socket) on the intermediate host
    can ask your agent to sign and log in as you anywhere your keys work, while
    you are connected. ProxyJump runs the second connection end to end from
    your machine, so the intermediate host only relays encrypted bytes.

??? question "8. In Terrapin, why does inserting one message and deleting another go unnoticed?"

    The exchange hash does not cover how many handshake packets there were,
    and sequence numbers keep counting through the handshake. One inserted
    IGNORE raises the receiver's count by one, one deleted message lowers the
    sender's effective count by one, so later MACs still verify.

??? question "9. The xz backdoor did not break any cryptography. How did it get code into `sshd`?"

    Through a dependency: on distributions that link `sshd` to `libsystemd`,
    which loads liblzma, the compromised liblzma replaced an RSA function in
    `sshd`'s memory at load time.

??? question "10. Why did SSH adopt post-quantum key exchange before post-quantum host keys?"

    Recorded sessions can be decrypted later by a quantum computer, so key
    exchange must be safe now (harvest now, decrypt later). A host key
    signature only needs to resist forgery at the time of connection.

## What you learned

- SSH-2 is three layers: a transport that authenticates the server and
  encrypts, user authentication inside it, and a connection layer of channels.
- Its key exchange is an ephemeral Diffie-Hellman (now hybrid with ML-KEM)
  whose exchange hash over the whole conversation is signed by the host key;
  six keys are derived from the secret and the hash.
- Packets carry an implicit sequence number under the MAC; the original
  CBC format leaked plaintext through its encrypted length, and modern SSH uses
  AEAD or encrypt-then-MAC.
- Servers are trusted by first use, SSHFP or certificates; users by
  passwords, keys bound to the session identifier, security keys or
  certificates.
- Agent forwarding lends your keys to the remote machine; ProxyJump does not.
- Terrapin, the xz backdoor and regreSSHion show three different ways to fail:
  a gap in the transcript, the supply chain, and a regression in old code.

**Next:** [Chapter 7](07-IPsec-and-IKEv2.md), protecting not one connection but
every packet between two networks.

## Further reading

- Tatu Ylönen, "SSH: secure login connections over the Internet" (USENIX
  Security 1996).
- RFC 4251 to 4254, the SSH-2 protocol (2006); RFC 4255 (SSHFP); RFC 4344
  (counter modes); RFC 5647 (AES-GCM); RFC 8308 (extension negotiation); RFC
  8332 (RSA with SHA-2); RFC 8709 (Ed25519 keys); RFC 8731 (Curve25519 key
  exchange); RFC 9142 (key exchange recommendations, 2022); RFC 9941 and RFC
  10042 (hybrid post-quantum key exchange, 2026).
- OpenSSH's `PROTOCOL`, `PROTOCOL.certkeys`, `PROTOCOL.chacha20poly1305` and
  `PROTOCOL.agent` files, which document its extensions.
- Mihir Bellare, Tadayoshi Kohno and Chanathip Namprempre, "Breaking and
  provably repairing the SSH authenticated encryption scheme", *ACM TISSEC* 7
  (2004).
- Dawn Song, David Wagner and Xuqing Tian, "Timing analysis of keystrokes and
  timing attacks on SSH" (USENIX Security 2001).
- Martin Albrecht, Kenneth Paterson and Gaven Watson, "Plaintext recovery
  attacks against SSH" (IEEE S&P 2009).
- Niels Provos, Markus Friedl and Peter Honeyman, "Preventing privilege
  escalation" (USENIX Security 2003).
- Florian Bergsma, Benjamin Dowling, Florian Kohlar, Jörg Schwenk and Douglas
  Stebila, "Multi-ciphersuite security of the Secure Shell (SSH) protocol" (CCS
  2014).
- Keegan Ryan, Kaiwen He, George Sullivan and Nadia Heninger, "Passive SSH key
  compromise via lattices" (CCS 2023).
- Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk, "Terrapin attack: breaking
  SSH channel integrity by sequence number manipulation" (USENIX Security
  2024).
- Andres Freund, "backdoor in upstream xz/liblzma leading to ssh server
  compromise", oss-security mailing list (29 March 2024).
- Qualys, "regreSSHion: remote unauthenticated code execution vulnerability in
  OpenSSH server" (July 2024).
- Keith Winstein and Hari Balakrishnan, "Mosh: an interactive remote shell for
  mobile clients" (USENIX ATC 2012).
- Site pages: the [SSH guide](../../topics/SSH.md),
  [ssh-keygen recipes](../../tools/ssh-keygen.md).
