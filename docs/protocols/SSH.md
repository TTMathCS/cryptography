# SSH Keys (GitHub, Bitbucket, and servers)

*Which key type to generate for Git hosting and SSH logins, and why. Short
answer: Ed25519.*

## The choice

Three key types are in common use. The math underneath differs, but for SSH the
differences that matter are size, speed, and how easy each is to misuse. In SSH
auth the client proves it holds the private key by *signing* a login challenge.

| | RSA | ECDSA | Ed25519 |
|---|---|---|---|
| Math | factoring | EC discrete log (NIST curves) | EC discrete log (Curve25519) |
| SSH key type | `ssh-rsa` (SHA-2) | `ecdsa-sha2-nistp256/384/521` | `ssh-ed25519` |
| Typical size | 3072–4096-bit | 256-bit | 256-bit (32-byte key) |
| Security level | ~128-bit at 3072 | ~128-bit at P-256 | ~128-bit |
| Key generation | slow | fast | fast |
| Sign / verify | slow | fast | fastest |
| Per-signature nonce | n/a | needs good RNG | none (deterministic) |
| Compatibility | universal | wide | OpenSSH 6.5+ (2014) |

## RSA

Security rests on the difficulty of factoring a large number. See [RSA](../02-signatures/RSA.md).

- **Sizes:** 2048-bit is the floor (~112-bit security), 3072 gives ~128-bit, 4096
  is the common extra-margin choice. The public key is a long line.
- **Strengths:** works everywhere, including old servers and hardware; decades of
  scrutiny.
- **Weaknesses:** big keys, slow key generation (it must find two large primes),
  slower operations. The legacy `ssh-rsa` *with SHA-1* signatures is deprecated —
  GitHub removed it in 2022, so a usable RSA key signs with SHA-2 (modern OpenSSH
  does this automatically).

## ECDSA

Elliptic-curve [DSA](../02-signatures/DSA.md) over the NIST P-256/384/521 curves. See [ECDSA](../02-signatures/ECDSA.md).

- **Strengths:** small keys, fast, RSA-level security from far fewer bits (256-bit
  ≈ RSA-3072).
- **Weaknesses — why it's not the top pick:**
    - **Nonce dependence.** Every signature needs a fresh random nonce; a weak or
    repeated one lets an attacker recover the private key from the signatures.
    This is a real client-side risk at sign time.
    - **NIST-curve distrust.** P-256's constants are unexplained; no proven
    backdoor, but enough doubt that people avoid it when they can.

## Ed25519

EdDSA over Curve25519. Fixed 32-byte keys, 64-byte signatures. See [Ed25519](../02-signatures/EdDSA.md).

- **Strengths:**
    - **Deterministic** — the nonce comes from the message and key, so ECDSA's
    nonce-reuse key leak cannot happen, even with a broken RNG.
    - Fastest signing/verification and tiny keys (one short line).
    - Constant-time by design; resists timing/side-channel attacks.
    - Transparent curve — no NIST trust question.
- **Weaknesses:** needs OpenSSH 6.5+ (2014); a few legacy servers or old hardware
  tokens may not support it. One security level (~128-bit), which is plenty.
  GitHub and Bitbucket both support it.

## Which to use

**Use Ed25519** — safest, simplest, and what GitHub recommends:

```
ssh-keygen -t ed25519 -C "you@example.com"
```

Fall back only for a specific reason:

- **RSA-4096** for an old server or device that predates Ed25519 (OpenSSH < 6.5):
  `ssh-keygen -t rsa -b 4096`
- **ECDSA (P-256)** only when policy forces NIST curves (FIPS/government) or a
  hardware token supports ECDSA but not Ed25519.

Order of preference: **Ed25519 → RSA-4096 (compatibility) → ECDSA (compliance only)**.
Avoid DSA and SHA-1 `ssh-rsa` keys — Git hosts no longer accept them.

## See also

- [Ed25519](../02-signatures/EdDSA.md) / [ECDSA](../02-signatures/ECDSA.md) / [RSA](../02-signatures/RSA.md) — the algorithms in depth
- [Cryptography FAQ](../FAQ.md) — key sizes across algorithms, why randomness matters

## References

- [GitHub: Generating a new SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Bitbucket: Set up an SSH key](https://support.atlassian.com/bitbucket-cloud/docs/set-up-personal-ssh-keys-on-linux/)
