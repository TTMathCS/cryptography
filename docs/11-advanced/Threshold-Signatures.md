# Threshold signatures

*Any $t$ of $n$ key holders sign together and the key is never rebuilt. Out
comes one ordinary signature under one public key.*

**Status and standards:** see [Advanced primitives](../algorithms/table.md#11-advanced-primitives) in the main table.

## What it is

[Secret sharing](Secret-Sharing.md) protects a key at rest, but the key
comes back together every time it's used. A threshold scheme keeps it split:
each signer works only with its share, and any $t$ of them produce a
signature that checks under the group's single public key. A verifier
can't tell it from a normal signature, and a thief needs $t$ shares, not one.

- **FROST** (Komlo and Goldberg, SAC 2020) for Schnorr signatures. RFC 9591
  (June 2024, from the IRTF's CFRG) defines it for ristretto255, Ed25519,
  Ed448, P-256 and secp256k1. The Ed25519 and Ed448 versions produce
  signatures any RFC 8032 verifier accepts.
- **Threshold ECDSA**, because so much already verifies ECDSA. Two
  well-known protocols are GG18 (Gennaro and Goldfeder, CCS 2018) and CGGMP
  (Canetti, Gennaro, Goldfeder, Makriyannis and Peled, CCS 2020). There is
  no RFC.
- **BLS** (Boneh, Lynn and Shacham, ASIACRYPT 2001), on pairing-friendly
  curves. Its CFRG draft reached -07 in July 2026 and is still a draft.

NIST's call for threshold schemes (NIST IR 8214C) became final in January
2026. It asks for threshold signing, decryption, key generation and more,
for NIST-specified primitives (Class N) and others such as zero-knowledge
proofs and FHE (Class S). Teams presented previews through 2026; no
standard has come out of it yet.

## The story

- **Who made it:** Yvo Desmedt (1987) and Desmedt and Frankel (1989) first; Gennaro, Jarecki, Krawczyk and Rabin for DSS (1996); Gennaro and Goldfeder for ECDSA (2018); Komlo and Goldberg's FROST (2020).
- **What for:** Signing with a key that is never in one place.
- **What it solved:** No single stolen server or device can sign.
- **Where it stands:** Used heavily by crypto-currency custodians and for some certificate authority keys; FROST is RFC 9591 (2024).
- **Incidents:** **2023:** Verichains (TSSHOCK) and Fireblocks (BitForge) found flaws in widely used threshold ECDSA libraries that let one participant steal the whole key from the others.

## How it works

### FROST

The shares $x_i$ of a Schnorr key $x$ come from a trusted dealer (RFC 9591,
Appendix C) or from distributed key generation, where each participant
deals shares of its own random secret, with Feldman commitments and a
Schnorr proof that it knows the secret. Signing by a set $S$ of $t$ or more:

1. **Round 1:** each signer $i$ picks two nonces $d_i, e_i$ and publishes
   $D_i = g^{d_i}$ and $E_i = g^{e_i}$. This can be done ahead of time.
2. **Round 2:** the coordinator sends the message $m$ and the list $B$ of
   commitments. Each signer computes binding factors $\rho_j = H(P, m, B, j)$,
   the group commitment $R = \prod_j D_j \cdot E_j^{\rho_j}$, the challenge $c = H(R, P, m)$,
   and its share $z_i = d_i + e_i \cdot \rho_i + \lambda_i \cdot x_i \cdot c$, where $\lambda_i$ is its Lagrange
   coefficient for $S$.
3. **Aggregate:** $z = \sum_i z_i$. Then $(R, z)$ is a plain Schnorr signature:
   $g^z = R \cdot P^c$.

The second nonce and $\rho$ are FROST's main idea. With one nonce each, an
attacker running many sessions at once can choose its nonces after seeing
the others' and forge (Drijvers et al., 2019, on two-round
multi-signatures). $\rho$ ties every nonce to one message and one commitment list.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 385" role="img" aria-labelledby="sk-c-frost-t"><title id="sk-c-frost-t">Five key shares in a circle; three of them together produce one ordinary Schnorr signature checked with a single public key</title><defs><filter id="sk-c-frost-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-frost-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-frost-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-frost-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-frost-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="385" filter="url(#sk-c-frost-paper)"/><g filter="url(#sk-c-frost-pen)"><text x="30" y="44" class="h">Any three of five can sign</text><circle cx="200" cy="90" r="26" class="p gold"/><text x="200" y="96" text-anchor="middle" class="s">share 1</text><path class="p" fill="none" d="M226 90 Q340 110 396 196" opacity=".6" marker-end="url(#sk-c-frost-ah)"/><circle cx="305" cy="166" r="26" class="p room"/><text x="305" y="172" text-anchor="middle" class="s">share 2</text><circle cx="265" cy="289" r="26" class="p gold"/><text x="265" y="295" text-anchor="middle" class="s">share 3</text><path class="p" fill="none" d="M286 274 L396 200" opacity=".6" marker-end="url(#sk-c-frost-ah)"/><circle cx="135" cy="289" r="26" class="p gold"/><text x="135" y="295" text-anchor="middle" class="s">share 4</text><path class="p" fill="none" d="M160 281 L396 200" opacity=".6" marker-end="url(#sk-c-frost-ah)"/><circle cx="95" cy="166" r="26" class="p room"/><text x="95" y="172" text-anchor="middle" class="s">share 5</text><path class="p rust" d="M400 170 L600 170 L600 230 L400 230Z"/><text x="500.0" y="200.0" text-anchor="middle" class="s">one Schnorr signature</text><text x="500.0" y="218.0" text-anchor="middle" class="s">checked with one public key</text><text x="30" y="350" class="s">Two rounds of messages; the full key is never put together anywhere. The signature looks</text><text x="30" y="370" class="s">exactly like one from a single signer.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

### Threshold ECDSA

ECDSA's $s = k^{-1} \cdot (H(m) + r \cdot x)$ multiplies two secrets. Shares add but
don't multiply, so the signers must turn shares of two values into shares
of their product. GG18 and CGGMP do it with Paillier encryption and
zero-knowledge proofs that each party's numbers are in range. That means
more rounds and far more code than FROST. CGGMP also refreshes shares and
names the cheater when a run fails.

### BLS

A BLS signature is $\sigma = x \cdot H(m)$, a curve point, checked with a pairing:
$e(g, \sigma) = e(P, H(m))$. It is deterministic and linear, so threshold BLS
needs no extra rounds: each signer sends $x_i \cdot H(m)$, and anyone with $t$ of
them combines them with Lagrange coefficients into the $\sigma$ the whole key
would give (Boldyreva, PKC 2003).

BLS signatures from different keys also add into one point. Ethereum's
beacon chain (since 1 December 2020) uses the draft's -04
proof-of-possession suite on BLS12-381: 48-byte public keys, 96-byte
signatures. Votes on the same data are added and checked once against the
sum of the keys. The CFRG drafts put BLS12-381 at about 126 bits, a little
under 128.

## When to use it

- **Custody and "MPC wallets":** custodians and wallet makers keep coin
  keys as threshold ECDSA shares on separate machines, because Ethereum
  accounts and pre-Taproot Bitcoin outputs verify ECDSA.
- **Zcash:** ZIP 312 (a draft wallet spec) adapts FROST to shielded spends,
  re-randomized so signatures can't be linked. They verify as ordinary
  spend authorization signatures.
- **Ethereum validators:** BLS aggregation in consensus. Distributed
  validators split one validator's key with threshold BLS across several
  nodes, so a few can fail or misbehave.
- **Anything new:** FROST over Ed25519 or ristretto255, the only one of the
  three with an RFC.

## Example (Python)

The shape of FROST in the 2048-bit group from
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md): a dealer makes 2-of-3
shares, signers 1 and 3 sign, and the result checks as a plain Schnorr
signature under $P$. The hashing is made up for the demo; RFC 9591 fixes the
encodings for each ciphersuite, and real code uses an audited library.

```python
import hashlib, secrets
from math import prod

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g, q = 2, (p - 1) // 2                  # RFC 3526 group 14; 2 has prime order q

def H(*xs):                             # toy encoding, not RFC 9591's
    return int.from_bytes(hashlib.sha256(repr(xs).encode()).digest(), "big") % q

# trusted dealer: a random line through (0, x) gives 2-of-3 shares
x, a = secrets.randbelow(q), secrets.randbelow(q)
share = {i: (x + a * i) % q for i in (1, 2, 3)}
P = pow(g, x, p)                        # the group's public key
del x                                   # from here on nobody holds x

m, S = b"pay 5 to carol", (1, 3)        # signers 1 and 3 sign

# round 1: each signer picks two nonces and publishes g^d, g^e
nonce = {i: (secrets.randbelow(q), secrets.randbelow(q)) for i in S}
comm = {i: (pow(g, d, p), pow(g, e, p)) for i, (d, e) in nonce.items()}

# round 2: binding factors tie each nonce to this message and this set of commitments
rho = {i: H(P, m, sorted(comm.items()), i) for i in S}
R = 1
for i in S:
    R = R * comm[i][0] * pow(comm[i][1], rho[i], p) % p
c = H(R, P, m)
lam = {i: prod(j * pow(j - i, -1, q) for j in S if j != i) % q for i in S}   # Lagrange at 0
z = {i: (nonce[i][0] + nonce[i][1] * rho[i] + lam[i] * share[i] * c) % q for i in S}

s = sum(z.values()) % q                 # the coordinator adds the shares
print(pow(g, s, p) == R * pow(P, c, p) % p)   # True: a plain Schnorr check on (R, s)
```

## Security notes

- **Never reuse a nonce pair.** RFC 9591 makes each signer delete its
  nonces after one signing. A few signings with the same pair give away
  the share by plain algebra, as with [Schnorr](../02-signatures/Schnorr.md).
- **FROST isn't robust.** One silent signer stops the run. A bad $z_i$ can
  be traced, a refusal can't; ROAST wraps FROST to try other subsets.
- **Threshold ECDSA is easy to get wrong.** In 2023 Makriyannis, Yomtov and
  Galansky showed key-extraction attacks on several popular implementations:
  one corrupt party could get the whole key, with one attack needing a
  single signature. Use a current protocol with every proof in place, from
  audited code.
- **Rogue keys.** Adding BLS public keys lets an attacker pick a key that
  cancels yours. The draft's three schemes block it with distinct messages,
  the key in the message, or proofs of possession (Ethereum checks one at
  deposit).
- **A trusted dealer sees the key.** Prefer distributed key generation.
- None of these survive a quantum computer running Shor's algorithm.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: a 2-of-3 Schnorr signature mod 23"

    The subgroup of order $q = 11$ in the numbers mod $p = 23$, generated by $g = 2$. This is a simplified
    round with one nonce per signer (FROST adds a second nonce and a binding factor). The challenge stands
    in for a hash; the rest is checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Key and shares | $x = 7$, line $7 + 3i \bmod 11$ | $x_1 = 10$, $x_2 = 2$, $x_3 = 5$ |
    | Public key | $P = 2^7 \bmod 23$ | 13 |
    | Signers 1 and 3: Lagrange | $\lambda_1 = 3/(3 - 1)$, $\lambda_3 = 1/(1 - 3)$ mod 11 | $\lambda_1 = 7$, $\lambda_3 = 5$ |
    | Nonces | $k_1 = 4$, $k_3 = 9$: $R_1 = 2^4$, $R_3 = 2^9$ mod 23 | $R_1 = 16$, $R_3 = 6$ |
    | Group commitment | $R = 16 \cdot 6 \bmod 23$ | 4 |
    | Challenge | $c = H(R, P, m) \bmod 11$, say | 5 |
    | Shares of $z$ | $z_1 = 4 + 7 \cdot 10 \cdot 5$, $z_3 = 9 + 5 \cdot 5 \cdot 5$ mod 11 | $z_1 = 2$, $z_3 = 2$ |
    | Signature | $z = 2 + 2$ | $(R, z) = (4, 4)$ |
    | Verify | $2^4 = 16$; $R \cdot P^5 = 4 \cdot 4 \bmod 23$ | $16 = 16$: valid |

    Neither signer ever held $x = 7$, yet $\lambda_1 x_1 + \lambda_3 x_3 = 70 + 25 = 95 \equiv 7 \pmod{11}$.

??? abstract "The math, with formulas"

    For a signing set $S$, with shares $x_i$ of $x$ and $P = g^x$:

    $$
    \begin{aligned}
    x &= \sum_{i \in S} \lambda_i \cdot x_i \pmod{q} && \text{Lagrange at 0, never computed} \\
    R &= \prod_{i \in S} R_i, \quad R_i = g^{k_i} \\
    z_i &= k_i + \lambda_i \cdot x_i \cdot c \pmod{q}, && c = H(R, P, m) \\
    z &= \sum_i z_i, && \text{check } g^z = R \cdot P^c
    \end{aligned}
    $$

    - **Why the sum works:** $\sum z_i = \sum k_i + c \cdot \sum \lambda_i x_i = k + c \cdot x$, a plain Schnorr response.
    - **Checking one signer:** $g^{z_i} = R_i \cdot (g^{x_i})^{\lambda_i c}$, so a bad share can be traced to its sender.
    - **FROST (RFC 9591):** $R_i = D_i \cdot E_i^{\rho_i}$ with $\rho_i = H(P, m, B, i)$, so each nonce is bound to this message
      and this list of commitments.
    - **Threshold BLS:** $\sigma = \sum \lambda_i \cdot (x_i \cdot H(m))$, the same Lagrange step done on curve points.

??? tip "Watch it step by step: two holders, one signature"

    <div class="mars-steps" markdown>

    1. The dealer draws the line $7 + 3i \bmod 11$ and hands out 10, 2 and 5. The public key is $2^7 = 13$.
    2. Holders 1 and 3 will sign. Their Lagrange weights are 7 and 5.
    3. Each picks a nonce, 4 and 9, and publishes 16 and 6. Their product, 4, is $R$.
    4. The challenge for this message is $c = 5$.
    5. Holder 1 sends 2 and holder 3 sends 2. The coordinator adds them: $z = 4$.
    6. Anyone checks $2^4 = 16 = 4 \cdot 13^5 \bmod 23$. It looks like a signature from one key.

    </div>

??? info "The math underneath"

    - **Shamir sharing and Lagrange interpolation:** see [secret sharing](Secret-Sharing.md).
    - **Interpolation in the exponent:** because $g^{a+b} = g^a \cdot g^b$, a linear formula on shares also works on
      their public values, which is why Schnorr and BLS split easily and ECDSA's $k^{-1}$ does not.
    - **Discrete log** keeps $x$ hidden behind $P$: [hard problems](../10-math-foundations/Hard-Problems.md).
    - **Schnorr signatures** as the target format: [Schnorr](../02-signatures/Schnorr.md).
    - **Zero-knowledge proofs** in key generation show each dealer knows its secret:
      [zero-knowledge proofs](Zero-Knowledge.md).

## See also

- [Secret sharing](Secret-Sharing.md): the shares underneath
- [Schnorr](../02-signatures/Schnorr.md) / [EdDSA](../02-signatures/EdDSA.md): what FROST produces
- [ECDSA](../02-signatures/ECDSA.md): what threshold ECDSA produces
- [Zero-knowledge proofs](Zero-Knowledge.md): the proofs inside key generation and threshold ECDSA
- [Multi-party computation](MPC.md): threshold signing is one case of it

## References

- [Komlo and Goldberg, "FROST" (SAC 2020)](https://eprint.iacr.org/2020/852) / [RFC 9591: FROST](https://www.rfc-editor.org/rfc/rfc9591)
- [Drijvers et al., "On the Security of Two-Round Multi-Signatures" (IEEE S&P 2019)](https://eprint.iacr.org/2018/417)
- [Gennaro and Goldfeder (CCS 2018)](https://eprint.iacr.org/2019/114) / [Canetti et al. (CCS 2020)](https://eprint.iacr.org/2021/060)
- [Makriyannis, Yomtov and Galansky, "Practical Key-Extraction Attacks in Leading MPC Wallets" (2023)](https://eprint.iacr.org/2023/1234)
- Boneh, Lynn and Shacham, "Short Signatures from the Weil Pairing" (ASIACRYPT 2001) / [Boldyreva (PKC 2003)](https://eprint.iacr.org/2002/118)
- [draft-irtf-cfrg-bls-signature](https://datatracker.ietf.org/doc/draft-irtf-cfrg-bls-signature/) / [draft-irtf-cfrg-pairing-friendly-curves](https://datatracker.ietf.org/doc/draft-irtf-cfrg-pairing-friendly-curves/) (BLS12-381 security)
- [Ethereum consensus specs, phase 0](https://github.com/ethereum/consensus-specs/blob/master/specs/phase0/beacon-chain.md) / [distributed validator specs](https://github.com/ethereum/distributed-validator-specs)
- [ZIP 312: FROST for Spend Authorization Multisignatures](https://zips.z.cash/zip-0312)
- [NIST IR 8214C](https://csrc.nist.gov/pubs/ir/8214/c/final) / [NIST threshold cryptography project](https://csrc.nist.gov/projects/threshold-cryptography)
