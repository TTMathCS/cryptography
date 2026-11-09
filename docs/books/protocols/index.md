# Protocols

*A book in 20 chapters about how cryptography is used together. Book 1 builds
the pieces: ciphers, hashes, signatures, key exchange. This book puts them to
work in the protocols that carry the Internet, from TLS and SSH to Signal,
passkeys and Wi-Fi. Each chapter starts from the problem a protocol had to
solve, walks one real run of it message by message, codes a small working
model in Python, tells how it was broken and fixed, and ends with how to use it
well today.*

## Who it is for

Readers who know what a cipher, a hash and a signature do, at the level of
book 1's first three parts, and want to see how they become HTTPS, a VPN or a
messaging app. Students can read it in order. Engineers can go straight to the
protocol they run and use the chapter's "In the real world" and configuration
sections. Each chapter marks its sections *beginner*, *intermediate* or
*expert*, so a first reading can stop at the intermediate ones.

## How the book works

- **One protocol family per chapter.** Each opens with a box: what you will
  learn, which chapters you need first, and the level of each section.
- **The problem first.** The history of why the protocol exists is told as
  the problem it solves; the protocol is the answer.
- **Real bytes.** Where an RFC publishes test vectors, the code computes them
  and checks the result: the TLS 1.3 key schedule against RFC 8448, QUIC's
  first keys against RFC 9001.
- **Break it, then fix it.** Each chapter runs the attacks that shaped the
  protocol, in small programs, and then the fix.
- **Mars.** Arcadia City is between 3 and 22 light-minutes from Earth. Where
  it helps, a chapter asks what that delay does to the protocol.
- **Code.** Every example is short Python 3.8 or later with only the standard
  library. These are models that show how a protocol works, never tools to
  protect real data.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. The secure channel** | [1. What a protocol must do](01-What-a-Protocol-Must-Do.md) | beginner to intermediate |
| | [2. Certificates and public-key infrastructure](02-Certificates-and-PKI.md) | beginner to intermediate |
| | [3. TLS 1.3, message by message](03-TLS-1.3-Message-by-Message.md) | intermediate |
| | [4. Thirty years of TLS attacks](04-Thirty-Years-of-TLS-Attacks.md) | intermediate |
| | [5. TLS in practice: QUIC, DTLS and the web](05-TLS-in-Practice.md) | intermediate |
| **II. Links and networks** | [6. SSH](06-SSH.md) | intermediate |
| | [7. IPsec and IKEv2](07-IPsec-and-IKEv2.md) | intermediate |
| | [8. WireGuard and the Noise framework](08-WireGuard-and-Noise.md) | intermediate |
| | [9. Wi-Fi security](09-Wi-Fi-Security.md) | beginner to intermediate |
| | [10. DNSSEC and private DNS](10-DNSSEC-and-Private-DNS.md) | intermediate |
| **III. Identity and access** | [11. One-time codes and password protocols](11-One-Time-Codes-and-Password-Protocols.md) | beginner to intermediate |
| | [12. Kerberos](12-Kerberos.md) | intermediate |
| | [13. Passkeys: FIDO2 and WebAuthn](13-Passkeys-FIDO2-and-WebAuthn.md) | beginner to intermediate |
| | [14. OAuth, OpenID Connect and JSON Web Tokens](14-OAuth-OpenID-Connect-and-JWT.md) | intermediate |
| **IV. Messages, data and ledgers** | [15. Email: OpenPGP and S/MIME](15-Email-OpenPGP-and-SMIME.md) | beginner to intermediate |
| | [16. Signal and the Double Ratchet](16-Signal-and-the-Double-Ratchet.md) | intermediate |
| | [17. Group messaging: MLS](17-Group-Messaging-MLS.md) | intermediate to advanced |
| | [18. Encrypting files and disks](18-Encrypting-Files-and-Disks.md) | beginner to intermediate |
| | [19. Ledgers: Bitcoin](19-Ledgers-Bitcoin.md) | intermediate |
| | [20. Designing and verifying protocols](20-Designing-and-Verifying-Protocols.md) | beginner to expert |

The [Glossary](Glossary.md) explains the book's terms in a line or two each,
with the chapter where each is explained in full. The one-page comparison of
what every protocol runs by default is under
[Topics, Protocols](../../protocols/index.md).

**Where to start:** new to protocols, read chapters 1 to 3 in order. Running a
web server: chapters 2, 3 and 5. Running servers, VPNs or a network:
chapters 6 to 10. Logins, single sign-on and tokens: chapters 11 to 14.
Messaging, mail, files and blockchains: chapters 15 to 19. Designing a
protocol of your own: chapter 1, then chapter 20. Interested in attacks: chapter 4, then book 2,
*Cryptanalysis*. The short tour of the same ground is
[Chapter 19 of book 1](../../book/19-Protocols.md).
