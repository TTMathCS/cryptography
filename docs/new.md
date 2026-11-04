# What's new

*Recent changes in cryptography that matter for practice or research, newest first, two lines each with a link. Last checked: 4 November 2026.*

| When | What changed | More |
|---|---|---|
| October 2026 | **OpenSSH 10.6** turns on post-quantum signatures: `ssh-mldsa44-ed25519` keys (ML-DSA-44 + Ed25519), last in the preference list. | [SSH guide](topics/SSH.md#now-and-next) |
| October 2026 | **NIST IR 8547 final**: RSA, Diffie-Hellman and elliptic-curve algorithms deprecated after 2030, disallowed after 2035. | [Moving to post-quantum](topics/Post-quantum.md) |
| September 2026 | **No more SHA-1** in public TLS certificates or CRLs after 15 September (CA/Browser Forum rules). | [PKI](protocols/PKI.md) |
| August 2026 | **RFC 10042**: ML-KEM hybrid key exchange for SSH (`mlkem768x25519-sha256`) gets its RFC. | [SSH](protocols/SSH.md) |
| June 2026 | **RFC 9980**: post-quantum algorithms (ML-KEM, ML-DSA) for OpenPGP. | [OpenPGP](protocols/OpenPGP.md) |
| March 2026 | **Certificates live at most 200 days** (was 398); 100 days from March 2027, 47 from March 2029. | [HTTPS guide](topics/HTTPS.md#now-and-next) |
| February 2026 | **Chrome** says its quantum-resistant root store will take only Merkle Tree Certificate authorities, not post-quantum X.509 roots. | [PKI](protocols/PKI.md) |
| January 2026 | **Let's Encrypt** opens 6-day certificates to everyone. | [HTTPS guide](topics/HTTPS.md#now-and-next) |
| December 2025 | **age v1.1.0** spec adds post-quantum recipients (ML-KEM-768 + X25519). | [Encrypting files](topics/Encrypting-files.md#now-and-next) |
| April 2025 | **OpenSSL 3.5** ships ML-KEM, ML-DSA and SLH-DSA, with `X25519MLKEM768` on by default in TLS. **OpenSSH 10.0** makes `mlkem768x25519-sha256` its default key exchange. | [TLS 1.3](protocols/TLS-1.3.md) |
| March 2025 | **NIST picks HQC** (code-based) as a backup key exchange beside ML-KEM. | [Code-based KEMs](01-key-exchange/Code-Based-KEMs.md) |
| August 2024 | **FIPS 203, 204, 205** published: ML-KEM, ML-DSA, SLH-DSA, the first post-quantum standards. | [ML-KEM](01-key-exchange/ML-KEM.md), [ML-DSA](02-signatures/ML-DSA.md), [SLH-DSA](02-signatures/SLH-DSA.md) |

## Where to follow

- [NIST post-quantum project](https://csrc.nist.gov/projects/post-quantum-cryptography) and [NIST news](https://csrc.nist.gov/news)
- [IACR ePrint](https://eprint.iacr.org/): new research papers, every day
- [IETF datatracker](https://datatracker.ietf.org/): new drafts and RFCs (TLS, SSH, OpenPGP, CFRG)
- [OpenSSH](https://www.openssh.com/releasenotes.html) and [OpenSSL](https://openssl-library.org/news/) release notes
