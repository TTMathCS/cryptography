# Moving to post-quantum guide

*What a quantum computer would break, what replaces it, and how to check and plan your own systems. Four parts: stop at the one you need.*

[In one minute](#in-one-minute) · [Do it](#do-it) · [Expert](#expert) · [Now and next](#now-and-next)

## In one minute

Most of the locks on the internet rest on two hard puzzles: **factoring** big numbers (RSA) and **discrete logarithms** (Diffie-Hellman, elliptic curves). A large enough **quantum computer** could solve both quickly. None exists yet that can, but building one is a serious engineering race.

Two problems follow:

- **Record now, decrypt later.** Someone can save your encrypted traffic today and open it when the machine arrives. Secrets that must stay secret for ten years or more are already at risk.
- **Forged signatures later.** Once the machine exists, it could fake signatures on software updates and certificates.

The fix is new math that quantum computers don't help with, mostly **lattices**. The new standards (ML-KEM for key exchange, ML-DSA for signatures) are published, and your browser probably already uses one. Symmetric encryption (AES) and hashes (SHA-2) only need longer keys, and mostly have them.

## Do it

**Is my connection post-quantum already?**

```
ssh -Q kex | grep -E 'mlkem|sntrup'                           # what your SSH knows
ssh -v git@github.com 2>&1 | grep 'kex: algorithm'           # what it picked
openssl s_client -connect example.com:443 -groups X25519MLKEM768 </dev/null 2>&1 | grep -i 'group'   # OpenSSL 3.5+
openssl list -kem-algorithms | grep -i ml-kem                 # OpenSSL 3.5+
```

In Chrome, open the developer tools, Security tab: the connection line names `X25519MLKEM768` when it is in use. Cloudflare's [radar](https://radar.cloudflare.com/adoption-and-usage#post-quantum-encryption) shows what share of traffic is post-quantum.

**Turn it on where it isn't yet**

```
# ~/.ssh/config (OpenSSH 9.9+; the default from 10.0)
Host *
    KexAlgorithms ^mlkem768x25519-sha256

# nginx with OpenSSL 3.5+
ssl_ecdh_curve X25519MLKEM768:X25519:prime256v1;
```

**Try the new algorithms** (OpenSSL 3.5+)

```
openssl genpkey -algorithm ML-KEM-768 -out kem.pem
openssl genpkey -algorithm ML-DSA-65 -out sig.pem
openssl pkeyutl -sign -inkey sig.pem -in msg.txt -out msg.sig
openssl pkeyutl -verify -inkey sig.pem -in msg.txt -sigfile msg.sig
age-keygen -pq -o key.txt                                     # post-quantum file encryption, age 1.3+
```

**Plan for an organisation**: an inventory first, then the order below.

1. List where public-key crypto is used: TLS, VPNs, SSH, code signing, certificates, stored encrypted data, hardware.
2. Turn on hybrid key exchange wherever the software already supports it (browsers, OpenSSH, Cloudflare, OpenSSL 3.5). That stops "record now, decrypt later".
3. Ask vendors for their dates; prefer products that can swap algorithms by configuration ("crypto agility").
4. Signatures and certificates later, as the standards and the CA rules settle; long-lived roots and firmware signing first.

## Expert

### The replacements

| Job | Today | Post-quantum | Standard | Notes |
|---|---|---|---|---|
| Key exchange | ECDH (X25519, P-256), DH, RSA key transport | **ML-KEM** (Kyber), as a hybrid with X25519 | FIPS 203 (2024) | 1,184-byte public key at ML-KEM-768; fast |
| Key exchange, backup | | **HQC** (codes), **Classic McEliece** | NIST IR 8545 (HQC selected 2025); ISO | a different hard problem, in case lattices fall |
| Signatures | RSA, ECDSA, Ed25519 | **ML-DSA** (Dilithium) | FIPS 204 (2024) | 2,420-byte signatures at ML-DSA-44 |
| Signatures, small | | **FN-DSA** (Falcon) | FIPS 206 (in preparation) | smaller, but hard to implement in constant time |
| Signatures, conservative | | **SLH-DSA** (SPHINCS+); **LMS / XMSS** (stateful) | FIPS 205 (2024); SP 800-208 | hash-based only; large or stateful; for firmware and roots |
| Symmetric | AES-128, SHA-256 | AES-256, SHA-256/384 | | Grover's algorithm only halves the security level |

**Hybrid** means running a classical and a post-quantum key exchange together and combining the secrets, so the result is safe if either one holds: `X25519MLKEM768` in TLS (RFC 10024), `mlkem768x25519-sha256` in SSH (RFC 10042), X-Wing in HPKE and age.

**Timelines.** NIST IR 8547 (final October 2026): RSA and elliptic-curve algorithms deprecated after 2030 and disallowed after 2035. NSA's CNSA 2.0 sets earlier dates for US national-security systems and asks for ML-KEM-1024 and ML-DSA-87. The EU and the UK's NCSC aim for most systems moved by 2035.

### Implementations

| Library | Post-quantum support |
|---|---|
| **OpenSSL 3.5+** (2025) | ML-KEM, ML-DSA, SLH-DSA; `X25519MLKEM768` in TLS by default |
| **BoringSSL** (Chrome), **NSS** (Firefox), **Go `crypto/tls`** and `crypto/mlkem` | hybrid ML-KEM in TLS, on by default |
| **OpenSSH 10** | `mlkem768x25519-sha256` by default (formally verified code from libcrux); ML-DSA host keys in 10.6 |
| **liboqs** (Open Quantum Safe) and its OpenSSL provider | every candidate, for research and testing |
| **AWS-LC**, **Bouncy Castle**, **wolfSSL**, **rustls** (with aws-lc-rs) | ML-KEM, ML-DSA |
| **PQClean**, **libcrux**, **mlkem-native** | reference and verified C / Rust code |

### Common mistakes

| Mistake | Why it matters |
|---|---|
| **Waiting until a quantum computer is announced** | Data recorded before then is already exposed. Key exchange should move now; it is cheap. |
| **Post-quantum alone, no hybrid, too early** | New schemes have less history. SIKE, a candidate in NIST's fourth round, was broken in 2022 by a classical laptop in about an hour (Castryck and Decru). Hybrids guard against that. |
| **Rolling your own implementation** | KyberSlash (2023–2024): a division in several Kyber implementations took time that depended on secret data, enough to recover keys. Use a maintained library. |
| **Forgetting message size** | ML-DSA signatures and ML-KEM keys are tens of times bigger. Some middleboxes dropped TLS ClientHello messages that grew past one packet when Chrome first enabled Kyber (2024). Test on your real network. |
| **Reusing a stateful hash-signature state** | LMS and XMSS keys must never sign twice with the same state: a restored backup or a cloned VM can reveal the key. Use them only where the signer is tightly controlled. |
| **Assuming AES-128 is broken** | Grover's search needs a long, sequential quantum computation; AES-128 is still considered safe for most uses, AES-256 for the cautious. |

### Best practices

- Hybrid key exchange everywhere it is already offered; it costs a few hundred bytes and almost no time.
- An inventory of algorithms, key sizes and where keys live, kept current.
- Crypto agility: algorithm names in configuration, not hard-coded; the ability to roll certificates and keys quickly.
- Signatures: start with long-lived trust anchors and firmware signing (SLH-DSA, LMS); move web certificates when browsers and CAs are ready.
- AES-256 and SHA-384 for new designs that must last decades.

### Learn it properly

- [Book, chapter 20](../book/20-Quantum-Computers.md): what a quantum computer is, and Shor's and Grover's algorithms
- [Book, chapter 21](../book/21-Lattice-Cryptography.md): lattices, LWE, ML-KEM and ML-DSA from the ground up
- [Book, chapter 22](../book/22-Hash-and-Code-Based.md): hash-based signatures and code-based encryption
- [ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md), [FN-DSA](../02-signatures/FN-DSA.md), [SLH-DSA](../02-signatures/SLH-DSA.md), [stateful hash signatures](../02-signatures/Stateful-Hash-Signatures.md), [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md): each in depth

## Now and next

*Last checked: 4 November 2026.*

- **Key exchange has largely moved.** Chrome, Firefox, Safari, Cloudflare, OpenSSL 3.5 and OpenSSH 10 use hybrid ML-KEM by default.
- **Signatures are the open problem.** Post-quantum certificates make every handshake much bigger. Chrome plans to accept only Merkle Tree Certificates in its quantum-resistant root store (target 2027); see [HTTPS and certificates](HTTPS.md#now-and-next).
- **More standards are coming:** FIPS 206 (FN-DSA); an HQC standard; NIST's extra signature round (smaller signatures from other families such as isogenies, codes and multivariate schemes).
- **Quantum hardware:** estimates of the qubits needed to break RSA-2048 keep falling (Gidney, 2025: under a million noisy qubits in under a week), while today's machines have at most a few thousand physical qubits and only a handful of error-corrected logical ones. Nobody can give a date, which is why the move is happening now.
- **To watch:** [NIST's post-quantum project](https://csrc.nist.gov/projects/post-quantum-cryptography), the IETF PQUIP working group, [Open Quantum Safe](https://openquantumsafe.org/).
