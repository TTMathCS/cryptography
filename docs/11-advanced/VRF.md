# VRF (verifiable random function)

*A keyed hash that comes with a proof. Only the key holder can compute the
output, and anyone with the public key can check it. Proof-of-stake chains
use it to pick leaders, and key directories use it to hide usernames.*

**Status and standards:** see [Advanced primitives](../algorithms/table.md#11-advanced-primitives) in the main table.

## What it is

A pseudorandom function $F(k, x)$ looks random to anyone without the key
$k$, but nobody else can check that a value really is $F(k, x)$. Micali,
Rabin and Vadhan (FOCS 1999) added a public key: the key holder gives the
output $\beta$ with a proof $\pi$, and anyone with the public key can check them.
RFC 9381 asks for three things:

- **Uniqueness:** each input has only one output that verifies, so the key
  holder can't pick a convenient one. ECDSA, by contrast, has a valid
  signature for every nonce.
- **Collision resistance:** nobody can find two inputs with the same output.
- **Pseudorandomness:** without the secret key or a proof, the output
  looks random.

"Full" uniqueness and collision resistance hold even for a key made to
cheat; "trusted" ones assume an honest key.

RFC 9381 (August 2023, from the IRTF's CFRG) defines two VRFs. RSA-FDH-VRF
uses SHA-256, SHA-384 or SHA-512, and its proof is as long as the modulus.
ECVRF runs on P-256 or edwards25519 with an 81- or 80-byte proof; it grew
out of the NSEC5 work (Papadopoulos et al., 2017). Its suites hash the
input onto the curve either by try-and-increment (TAI) or with the
RFC 9380 maps (SSWU for P-256, ELL2 for edwards25519).

## The story

- **Who made it:** Silvio Micali, Michael Rabin and Salil Vadhan, 1999; RFC 9381 (2023).
- **What for:** A random value that only the key holder can make but anyone can check.
- **What it solved:** Fair lotteries without a trusted party: who leads the next block, who sits on a committee.
- **Where it stands:** Used in Algorand, Cardano and Chainlink, and proposed for DNSSEC (NSEC5).
- **Incidents:** None known.

## How it works

### RSA-FDH-VRF

The key is an RSA key $(n, e, d)$ with $n$ $k$ bytes long.

1. **Prove:** hash the input to $k - 1$ bytes with MGF1,
   $m = \mathrm{MGF1}(\mathit{suite} \,\Vert\, \mathtt{0x01} \,\Vert\, k \,\Vert\, n \,\Vert\, \alpha)$ with $k$ and $n$ written out as bytes,
   so $m$ is below $n$. Sign it: $\pi = m^d \bmod n$.
2. **Output:** $\beta = \mathrm{Hash}(\mathit{suite} \,\Vert\, \mathtt{0x02} \,\Vert\, \pi)$.
3. **Verify:** check $\pi^e \bmod n = m$ with the public key, then compute $\beta$.

For a proper RSA key, $m$ has exactly one $e$-th root mod $n$, so each input has
one $\pi$ and one $\beta$. A bad $n$ or $e$ can break that, so RFC 9381 claims only the

### ECVRF

The secret is $x$ and the public key is $Y = x \cdot B$ (written additively).

1. **Prove:** hash to a point, $H = \text{encode\_to\_curve}(Y, \alpha)$, and set
   $\Gamma = x \cdot H$. With a deterministic nonce $k$ (made as in RFC 6979 on P-256,
   or RFC 8032 on edwards25519), let $c$ be the first 16 bytes of
   $\mathrm{Hash}(\mathit{suite} \,\Vert\, \mathtt{0x02} \,\Vert\, Y \,\Vert\, H \,\Vert\, \Gamma \,\Vert\, k \cdot B \,\Vert\, k \cdot H \,\Vert\, \mathtt{0x00})$ and
   $s = k + c \cdot x \bmod q$. The proof is $\pi = \Gamma \,\Vert\, c \,\Vert\, s$.
2. **Output:** $\beta = \mathrm{Hash}(\mathit{suite} \,\Vert\, \mathtt{0x03} \,\Vert\, \mathit{cofactor} \cdot \Gamma \,\Vert\, \mathtt{0x00})$.
3. **Verify:** with $U = s \cdot B - c \cdot Y$ and $V = s \cdot H - c \cdot \Gamma$, the same hash of
   $Y, H, \Gamma, U, V$ must give back $c$.

The proof is a Chaum–Pedersen proof that $\Gamma$ and $Y$ share $x$, the one a
[VOPRF](OPRF.md) server sends. An OPRF computes the same kind of value, a
key times a hash of the input, but blind, for a client. ECVRF has full
uniqueness. The optional `validate_key`
check, which rejects small-order public keys, adds full collision
resistance and keeps outputs unpredictable even under a key made to cheat.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 330" role="img" aria-labelledby="sk-c-vrf-t"><title id="sk-c-vrf-t">An input goes through the prove step with the secret key, giving a random-looking output and a proof that anyone can check with the public key</title><defs><filter id="sk-c-vrf-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-vrf-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-vrf-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-vrf-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-vrf-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="330" filter="url(#sk-c-vrf-paper)"/><g filter="url(#sk-c-vrf-pen)"><text x="30" y="44" class="h">A random number you can prove</text><path class="p room" d="M30 120 L150 120 L150 170 L30 170Z"/><text x="90.0" y="151.0" text-anchor="middle" class="s">input α</text><path class="p " d="M152 145 L198 145" marker-end="url(#sk-c-vrf-ah)"/><path class="p gold" d="M200 110 L350 110 L350 180 L200 180Z"/><text x="275.0" y="145.0" text-anchor="middle" class="s">prove</text><text x="275.0" y="163.0" text-anchor="middle" class="s">secret key</text><path class="p " d="M352 130 L418 110" marker-end="url(#sk-c-vrf-ah)"/><path class="p rust" d="M420 86 L610 86 L610 130 L420 130Z"/><text x="515.0" y="114.0" text-anchor="middle" class="s">output β: random-looking</text><path class="p " d="M352 160 L418 180" marker-end="url(#sk-c-vrf-ah)"/><path class="p room" d="M420 160 L610 160 L610 204 L420 204Z"/><text x="515.0" y="188.0" text-anchor="middle" class="s">proof π</text><text x="30" y="250" class="s">Anyone with the public key checks π and gets the same β. There is exactly one β per input,</text><text x="30" y="270" class="s">so the key owner cannot shop for a nicer value, and nobody can predict β before it is shown.</text><text x="30" y="310" class="s">Used to pick block producers fairly and to stop people listing a zone's names (NSEC5).</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

Use a VRF when one party has to produce a random-looking value that it
can't choose, and everyone else has to be able to check it.

- **Leader election.** In Algorand (Gilad et al., SOSP 2017) each user runs
  its VRF on a public seed and its role in the round. The output decides
  whether it sits on the committee, with odds that grow with its stake.
  Nobody knows who was picked until they send a message with the proof, so
  an attacker can't go after them in advance. Ouroboros Praos (David,
  Gaži, Kiayias and Russell, EUROCRYPT 2018), which Cardano runs, makes a
  stake pool the leader of a slot when its VRF output on the slot and an
  epoch nonce falls below a threshold set by its stake.
- **Key transparency.** A key directory keeps users in a Merkle tree. If
  the position were a plain hash of the name, a lookup proof would let
  anyone test guessed names offline. CONIKS (USENIX Security 2015) puts
  each user at $H(\mathrm{VUF}(\mathit{name}))$, using a verifiable unpredictable function, a
  weaker relative of the VRF. Google's Key Transparency (archived in 2024)
  used a VRF, and the IETF's draft protocol uses `ECVRF-P256-SHA256-TAI`
  or `ECVRF-EDWARDS25519-SHA512-TAI`.
- **NSEC5.** DNSSEC's NSEC3 (RFC 5155) proves a name is missing with a
  signed record that covers its hash, and those hashes can be collected
  and cracked offline to list the zone. NSEC5 (Goldberg et al., NDSS 2015)
  uses a VRF instead, so only the nameserver holding the VRF key can
  compute them, at one public-key operation per negative answer. Its last
  draft (December 2018) expired without becoming a standard.

## Example (Python)

RSA-FDH-VRF-SHA256 as RFC 9381 section 4 writes it, with the 2048-bit test
key from the RFC's appendix A.1. The first line checks the RFC's $\beta$ for the
empty input. The key is published, so it is only good for testing.

```python
import hashlib

# the RFC 9381 test key from appendix A.1: it is public, so it is only for testing
p = int("efb52a568fa3038fffb853e2183791c6bc81ceee86d20e8f9b6401dc79a8f1f6248d3a25fdb3f99245fce41667da038f59745b87cc1aed8b4a9c1d74e7d5c16c"
        "f7343f2b12f1b5055337369bf018fa07adc0d16f2164a516e80d2b4734f0c6563d6ee6d4a9e1a54e300cfe9ee679afc3d14a152dfb49b6cfb208bbf921f764af", 16)
q = int("ecbca5ee88bbc635d8263aaba84f6502fdb2b4998a40f7c149133d840b6b1bd9a972fe2a981c770272b78fda213f76a062dd865dd116d4c8980975ee9347fe0f"
        "500567e51d78dbee4a34e626051cf018d7feb72f19189525d4f70b6467d0cef514633ab08a9e7a9ec632064b7b5e3e82128fe563757a614092fc5cf624d10e1b", 16)
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
k = (n.bit_length() + 7) // 8           # 256 bytes
suite = b"\x01"                         # RSA-FDH-VRF-SHA256

def mgf1(seed, length):                 # MGF1 with SHA-256 (RFC 8017)
    return b"".join(hashlib.sha256(seed + i.to_bytes(4, "big")).digest() for i in range((length + 31) // 32))[:length]

def encode(alpha):                      # the full-domain hash, k - 1 bytes so it is below n
    salt = k.to_bytes(4, "big") + n.to_bytes(k, "big")
    return int.from_bytes(mgf1(suite + b"\x01" + salt + alpha, k - 1), "big")

def prove(alpha):                       # pi is an RSA signature on the hash
    return pow(encode(alpha), d, n).to_bytes(k, "big")

def proof_to_hash(pi):                  # beta, the VRF output
    return hashlib.sha256(suite + b"\x02" + pi).hexdigest()

def verify(alpha, pi):                  # needs only (n, e); gives beta or None
    s = int.from_bytes(pi, "big")
    if s >= n or pow(s, e, n) != encode(alpha):
        return None
    return proof_to_hash(pi)

print(verify(b"", prove(b"")) == "79f0615d4677fb72571889453644013f1a31b08d222e3cee349d64ce1c41045a")   # True: the RFC's beta
pi = prove(b"slot 42")
print(prove(b"slot 42") == pi)          # True: one proof per input, so one output
print(verify(b"slot 42", pi)[:16])      # fefc0e369699926c: the start of beta
print(verify(b"slot 43", pi))           # None
```

## Security notes

- **The key holder sees every output first.** Pseudorandomness only holds
  for people without the key. If the holder can steer the input, it can
  try many and keep the best, so a lottery's input must come from
  something it can't influence, and its key must be fixed before that
  input is known.
- **RSA-FDH-VRF trusts the key.** Its guarantees assume a proper RSA key
  (RFC 8017). RFC 9381 gives unpredictability under a key made to cheat
  only to ECVRF with `validate_key`, and names Algorand and Ouroboros
  Praos as users that need it.
- **TAI leaks timing.** Try-and-increment runs longer for some inputs, so
  RFC 9381 says not to use the TAI suites when $\alpha$ is secret.
- **A proof doesn't hide the input.** With the public key and $\pi$, anyone can
  test guesses of $\alpha$ offline; $\beta$ alone reveals nothing about $\alpha$. Use $\beta$ only
  after $\pi$ verifies.
- A quantum computer could recover the secret key from the public key and
  compute every output. RFC 9381 has no post-quantum VRF.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: a discrete-log VRF mod 23"

    The ECVRF steps, written multiplicatively in the subgroup of order $q = 11$ mod $p = 23$, generator
    $g = 2$. The hashed input point and the challenge are made up; the rest is checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Keys | $x = 6$, $Y = 2^6 \bmod 23$ | $Y = 18$ |
    | Hash input to the group | $H = \text{hash\_to\_group}(Y, \alpha)$, say | $H = 3$ |
    | VRF point | $\Gamma = H^x = 3^6 \bmod 23$ | $\Gamma = 16$ |
    | Nonce | $k = 5$: $U = 2^5$, $V = 3^5$ mod 23 | $U = 9$, $V = 13$ |
    | Challenge | $c = \mathrm{Hash}(Y, H, \Gamma, U, V)$, say | $c = 7$ |
    | Response | $s = k + c \cdot x = 5 + 42 \bmod 11$ | $s = 3$ |
    | Verify $U$ | $g^s \cdot Y^{-c} = 8 \cdot 6^{-1} = 8 \cdot 4 \bmod 23$ | $9 = U$ |
    | Verify $V$ | $H^s \cdot \Gamma^{-c} = 4 \cdot 18^{-1} = 4 \cdot 9 \bmod 23$ | $13 = V$ |
    | Output | $\beta = \text{SHA-256}(\Gamma)$, $\Gamma$ as one byte | `c555eab4…` |

    The verifier recomputes $U$ and $V$ from the proof $(\Gamma, c, s)$, hashes again and gets the same $c$. A false
    $\Gamma = 12$ would give $V = 6$ instead of 13, a different hash, and the proof would fail.

??? abstract "The math, with formulas"

    In ECVRF notation (additive, base point $B$, secret $x$, public key $Y = x \cdot B$):

    $$
    \begin{aligned}
    &\text{Prove:} && H = \text{encode\_to\_curve}(Y, \alpha), \quad \Gamma = x \cdot H \\
    & && c = \mathrm{Hash}(Y, H, \Gamma, k \cdot B, k \cdot H), \quad s = k + c \cdot x \pmod{q}, \quad \pi = (\Gamma, c, s) \\
    &\text{Verify:} && U = s \cdot B - c \cdot Y, \quad V = s \cdot H - c \cdot \Gamma, \quad \text{accept if } \mathrm{Hash}(Y, H, \Gamma, U, V) = c \\
    &\text{Output:} && \beta = \mathrm{Hash}(\mathit{cofactor} \cdot \Gamma)
    \end{aligned}
    $$

    - **Why it verifies:** $s \cdot B - c \cdot Y = (k + cx) \cdot B - c \cdot x \cdot B = k \cdot B$, and the same for $H$.
    - **Uniqueness:** $\Gamma$ is fixed by $x$ and $\alpha$, and the proof shows $\Gamma$ uses the same $x$ as $Y$. So no second $\Gamma$
      passes for the same input.
    - **Pseudorandomness:** telling $\Gamma$ from random without $x$ is a decisional Diffie-Hellman problem.
    - **RSA-FDH-VRF:** $\pi = m^d \bmod n$, $\beta = \mathrm{Hash}(\pi)$; one $e$-th root per $m$ gives uniqueness.

??? tip "Watch it step by step: prove and verify one output"

    <div class="mars-steps" markdown>

    1. The key holder's secret is 6. Its public key is $2^6 = 18$.
    2. The input $\alpha$ hashes to the group element 3. Raising it to the secret gives $\Gamma = 16$.
    3. A nonce 5 gives the pair $U = 9$ and $V = 13$. The hash of everything gives $c = 7$.
    4. The response is $s = 5 + 7 \cdot 6 = 47 \equiv 3 \pmod{11}$. The proof is (16, 7, 3).
    5. The verifier rebuilds $U = 2^3 \cdot 18^{-7} = 9$ and $V = 3^3 \cdot 16^{-7} = 13$. Same hash, same $c$: accepted.
    6. The output $\beta$ is a hash of $\Gamma = 16$. Nobody without the secret could have found it first.

    </div>

??? info "The math underneath"

    - **Discrete log:** getting $x$ from $Y$ must be infeasible, or anyone could compute every output:
      [hard problems](../10-math-foundations/Hard-Problems.md).
    - **Chaum–Pedersen proof:** shows two pairs $(B, Y)$ and $(H, \Gamma)$ share one exponent, a two-sided
      Schnorr proof. See [zero-knowledge proofs](Zero-Knowledge.md).
    - **Fiat–Shamir:** the challenge $c$ is a hash, so the proof needs no live verifier.
    - **Hashing to curves** (RFC 9380): $H$ must be a point whose discrete log nobody knows.
    - **Elliptic curves:** the real groups are P-256 and edwards25519:
      [elliptic curves](../10-math-foundations/Elliptic-Curves.md).

## See also

- [OPRF](OPRF.md): the same kind of keyed hash, computed blind for a client
- [RSA](../02-signatures/RSA.md): the signature inside RSA-FDH-VRF
- [Zero-knowledge proofs](Zero-Knowledge.md): Schnorr-style proofs like the one in ECVRF
- [Commitments](Commitments.md): the other half of a key transparency leaf

## References

- [Micali, Rabin and Vadhan, "Verifiable Random Functions" (FOCS 1999)](https://doi.org/10.1109/SFFCS.1999.814584)
- [RFC 9381: Verifiable Random Functions](https://www.rfc-editor.org/rfc/rfc9381) / [RFC 9380: Hashing to Elliptic Curves](https://www.rfc-editor.org/rfc/rfc9380) / [RFC 8017: PKCS #1 v2.2](https://www.rfc-editor.org/rfc/rfc8017)
- [Goldberg et al., "NSEC5: Provably Preventing DNSSEC Zone Enumeration" (NDSS 2015)](https://eprint.iacr.org/2014/582) / [Papadopoulos et al., "Making NSEC5 Practical for DNSSEC" (2017)](https://eprint.iacr.org/2017/099)
- [draft-vcelak-nsec5](https://datatracker.ietf.org/doc/draft-vcelak-nsec5/) / [RFC 5155: NSEC3](https://www.rfc-editor.org/rfc/rfc5155)
- [Gilad et al., "Algorand: Scaling Byzantine Agreements for Cryptocurrencies" (SOSP 2017)](https://doi.org/10.1145/3132747.3132757)
- [David, Gaži, Kiayias and Russell, "Ouroboros Praos" (EUROCRYPT 2018)](https://eprint.iacr.org/2017/573)
- [Melara et al., "CONIKS: Bringing Key Transparency to End Users" (USENIX Security 2015)](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/melara)
- [Google Key Transparency (archived)](https://github.com/google/keytransparency) / [draft-ietf-keytrans-protocol](https://datatracker.ietf.org/doc/draft-ietf-keytrans-protocol/)

*Weaker sources:* Cardano's [CIP-0059 feature table](https://cips.cardano.org/cip/cip-0059/annex/feature-table)
for Cardano running Ouroboros Praos (since the Shelley upgrade in 2020).
