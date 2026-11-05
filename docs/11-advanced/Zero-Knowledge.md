# Zero-knowledge proofs

*Prove that a statement is true, or that you know a secret, and show
nothing else. The idea runs from Schnorr's smart-card login to proofs that
check whole batches of transactions.*

**Status and standards:** see [Advanced primitives](../algorithms/table.md#11-advanced-primitives) in the main table.

## What it is

Goldwasser, Micali and Rackoff defined zero-knowledge proofs in 1985. A
proof must be:

- **Complete:** an honest prover convinces an honest verifier.
- **Sound:** a cheater fails, except with tiny probability. A proof *of
  knowledge* goes further: whoever can answer must know the secret.
- **Zero-knowledge:** the verifier learns only that the statement is true.
  It could have made a transcript just like it on its own.

Schnorr's identification protocol (CRYPTO '89) proves you know a discrete
log in three moves. Fiat and Shamir (CRYPTO '86) had shown how to drop the
live verifier by taking the challenge from a hash. RFC 8235 (2017) writes
down the resulting non-interactive Schnorr proof.

General proofs write a computation as a circuit of additions and
multiplications, and show the prover has a secret input that satisfies it.
Groth16 (2016) and PLONK (2019), the best-known zk-SNARKs, have the
smallest proofs but rest on pairings and a trusted setup. zk-STARKs (2018)
and Bulletproofs (2017) need no setup, and STARKs use only hashes, which
should hold up against quantum computers.

## The story

- **Who made it:** Shafi Goldwasser, Silvio Micali and Charles Rackoff, 1985. Fiat and Shamir (1986) removed the need for a live verifier. Practical SNARKs came with Pinocchio (2013) and Groth16 (2016).
- **What for:** Proving a statement is true without revealing why.
- **What it solved:** Privacy and scale: proving a payment is valid without showing it, or proving a computation was done right with a tiny proof.
- **Where it stands:** In Zcash, Ethereum rollups and some identity systems; Goldwasser and Micali got the Turing Award in 2012.
- **Incidents:** **Zcash (2018):** Ariel Gabizon found a flaw in the proof system's parameters that would have let anyone mint coins without being seen; it was fixed quietly in October 2018 and disclosed in 2019. **Frozen Heart (2022):** Trail of Bits found that many implementations hashed too little into the Fiat-Shamir challenge, letting proofs be forged.

## How it works

### Schnorr's protocol

Take a group with generator $g$ of prime order $q$. Alice knows $a$ with
$A = g^a$.

1. **Commit:** Alice picks a random $v$ and sends $V = g^v$.
2. **Challenge:** Bob sends a random $c$.
3. **Respond:** Alice sends $r = v - a \cdot c \bmod q$. Bob checks $V = g^r \cdot A^c$.

It is sound because answers to two challenges $c_1 \ne c_2$ for the same $V$
give $a = (r_2 - r_1) / (c_1 - c_2) \bmod q$, so anyone who can answer two
different challenges knows $a$. It is zero-knowledge because Bob can fake a transcript: pick
$r$ and $c$ first, then set $V = g^r \cdot A^c$. (Strictly, this holds for a
verifier who picks $c$ at random.)

**Fiat–Shamir:** let $c = H(g, V, A, \mathit{UserID}, \mathit{OtherInfo})$, as RFC 8235 does.
The prover can't choose $V$ after seeing $c$, so no live verifier is needed;
the proof holds in the random-oracle model. Put a message in the hash and
you have a [Schnorr signature](../02-signatures/Schnorr.md).

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 405" role="img" aria-labelledby="sk-c-zkp-t"><title id="sk-c-zkp-t">Three messages: Alice sends a commitment, Bob sends a random challenge, Alice responds, and Bob checks an equation</title><defs><filter id="sk-c-zkp-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-zkp-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-zkp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-zkp-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-zkp-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="405" filter="url(#sk-c-zkp-paper)"/><g filter="url(#sk-c-zkp-pen)"><text x="30" y="44" class="h">Commit, challenge, respond</text><path class="p gold" d="M60 70 L180 70 L180 110 L60 110Z"/><text x="120.0" y="96.0" text-anchor="middle" class="s">Alice</text><path class="p room" d="M460 70 L580 70 L580 110 L460 110Z"/><text x="520.0" y="96.0" text-anchor="middle" class="s">Bob</text><path class="p dash" d="M120 112 L120 310 M520 112 L520 310"/><path class="p " d="M124 140 L516 156" marker-end="url(#sk-c-zkp-ah)"/><text x="320" y="136" text-anchor="middle" class="s">1 V = gᵛ (fresh random v)</text><path class="p " d="M516 200 L124 216" marker-end="url(#sk-c-zkp-ah)"/><text x="320" y="196" text-anchor="middle" class="s">2 a random challenge c</text><path class="p " d="M124 260 L516 276" marker-end="url(#sk-c-zkp-ah)"/><text x="320" y="256" text-anchor="middle" class="s">3 r = v − a·c</text><text x="320" y="330" text-anchor="middle" class="s">Bob checks V = gʳ · Aᶜ</text><text x="30" y="370" class="s">Bob is convinced Alice knows a, yet the transcript is something he could have made up alone,</text><text x="30" y="390" class="s">so it teaches him nothing about a.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

### Proofs for any computation

- **zk-SNARKs** have tiny proofs that check fast, however big the
  computation. Groth's (Eurocrypt 2016) is 3 group elements, 192 bytes on
  BLS12-381, checked with 3 pairings. Whoever keeps the setup's secret
  randomness can forge proofs, so setups run as multi-party ceremonies that
  are safe if any one participant destroys its part. PLONK (Gabizon,
  Williamson and Ciobotaru, 2019) needs one setup for all circuits up to a
  size limit, and anyone can add randomness to it later.
- **zk-STARKs** (Ben-Sasson, Bentov, Horesh and Riabzev, 2018) need no
  setup. They use only hash functions (Merkle trees over error-correcting
  codes), so Shor's algorithm doesn't apply. The price is proof size.
- **Bulletproofs** (Bünz et al., IEEE S&P 2018) rest only on discrete log
  and are built for range proofs: a committed amount lies in $[0, 2^n)$,
  shown with $2 \log_2(n) + 9$ group and field elements, about 700 bytes for
  64 bits. Checking takes time linear in $n$.

## When to use it

- **Proving you hold a key:** RFC 8235 lists J-PAKE, YAK, and proof of
  possession when registering a key with a CA.
- **Zcash:** Sapling (2018) uses Groth16 on BLS12-381, with parameters
  from a multi-party ceremony. Orchard (NU5, 2022) moved to Halo 2, which
  needs no trusted setup.
- **Rollups:** a zk-rollup posts a batch of transactions to Ethereum with a
  SNARK or STARK that the new state follows from the old, and Ethereum
  checks the proof instead of running the batch. Starknet, ZKsync Era,
  Scroll and Linea are examples.
- **Monero:** Bulletproofs since October 2018, and Bulletproofs+ since
  August 2022, prove amounts aren't negative without showing them.
- **Anonymous credentials:** in Signal's group design (Chase, Perrin and
  Zaverucha, CCS 2020), a member proves to the server that it matches some
  encrypted entry in the group list without saying which. Privacy Pass
  VOPRF tokens carry a proof that the issuer used its published key
  (RFC 9497).

## Example (Python)

A non-interactive Schnorr proof in the RFC 3526 2048-bit group from
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md), with the hash input
laid out as in RFC 8235. RFC 8235 wants a hash at least as long as $q$, here
2047 bits, so it uses SHAKE256. This group gives about 112-bit security;
the main table's 128-bit row is the elliptic-curve version, such as P-256
in the RFC's section 3.

```python
import hashlib, secrets

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g, q = 2, (p - 1) // 2                  # RFC 3526 group 14; 2 has prime order q

def H(*items):                          # RFC 8235: a 4-byte length before each item
    data = b""
    for x in items:
        b = x if isinstance(x, bytes) else x.to_bytes((x.bit_length() + 7) // 8, "big")
        data += len(b).to_bytes(4, "big") + b
    return int.from_bytes(hashlib.shake_256(data).digest(256), "big")   # as long as q

def prove(a, user):
    A = pow(g, a, p)
    v = secrets.randbelow(q - 1) + 1
    V = pow(g, v, p)
    return A, V, (v - a * H(g, V, A, user)) % q

def verify(A, V, r, user):
    if not (1 < A < p and pow(A, q, p) == 1):        # A must be in the group
        return False
    return V == pow(g, r, p) * pow(A, H(g, V, A, user), p) % p

a = secrets.randbelow(q - 1) + 1        # Alice's secret
A, V, r = prove(a, b"alice")
print(verify(A, V, r, b"alice"))        # True
print(verify(A, V, r, b"mallory"))      # False: the proof is bound to Alice's ID
print(verify(A, V, r + 1, b"alice"))    # False
```

## Security notes

- **Hash everything.** The Fiat–Shamir challenge must cover the statement
  ($g$, $A$), the commitment and the context. Leaving the statement out
  ("weak Fiat–Shamir") made proofs in the Helios voting system unsound
  (Bernhard, Pereira and Warinschi, 2012), and the Bulletproofs paper itself
  was revised to fix a Fiat–Shamir mistake.
- **A fresh $v$ every time.** Two proofs with the same $v$ and different
  challenges give away $a$, by the soundness argument above.
- **Check the statement.** RFC 8235 has the verifier check that $A$ is in
  the group ($A^q = 1$) first.
- **The circuit is the weak point.** A proof shows the circuit is
  satisfied, not that the circuit says what you meant. In May 2026 a
  missing constraint in Zcash's Orchard circuit was found that could have
  allowed theft of funds. Zcash switched Orchard off by soft fork and
  brought it back with a fixed circuit in the NU6.2 upgrade (ZIP 257).
- **A leaked setup secret** lets its holder forge Groth16 or PLONK proofs
  that look valid.
- A quantum computer could forge discrete-log and pairing-based proofs;
  STARKs are the hash-based way out.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Schnorr's protocol mod 23"

    The subgroup of order $q = 11$ in the numbers mod $p = 23$, generated by $g = 2$. Alice proves she knows
    $a$ with $A = g^a$. Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Secret and statement | $a = 9$, $A = 2^9 \bmod 23$ | $A = 6$ |
    | Commit | $v = 8$, $V = 2^8 \bmod 23$ | $V = 3$ |
    | Challenge | Bob picks | $c = 3$ |
    | Respond | $r = v - a \cdot c = 8 - 27 = -19 \bmod 11$ | $r = 3$ |
    | Check | $g^r \cdot A^c = 2^3 \cdot 6^3 = 8 \cdot 9 \bmod 23$ | $3 = V$: accepted |
    | Same $V$, challenge 5 | $r_2 = 8 - 45 = -37 \bmod 11$ | $r_2 = 7$ |
    | Extract | $a = (r_2 - r)/(c - c_2) = 4 / (-2) \bmod 11$ | $a = 9$ |
    | Fake transcript | pick $r = 5$, $c = 2$, set $V = 2^5 \cdot 6^2 = 9 \cdot 13 \bmod 23$ | $V = 2$ |

    The fake ($V = 2$, $c = 2$, $r = 5$) passes the same check without knowing $a$. Bob could make it himself, so a
    real transcript teaches him nothing. But the fake needs $c$ chosen before $V$, which a live Bob does not allow.

??? abstract "The math, with formulas"

    $$
    \begin{aligned}
    &\text{Commit:} && V = g^v && v \text{ random in } [1, q) \\
    &\text{Challenge:} && c && \text{random, or } c = H(g, V, A, \mathit{UserID}, \mathit{OtherInfo}) \\
    &\text{Respond:} && r = v - a \cdot c \pmod{q} \\
    &\text{Verify:} && V = g^r \cdot A^c && \text{and } A^q = 1
    \end{aligned}
    $$

    - **Completeness:** $g^r \cdot A^c = g^{v - ac} \cdot g^{ac} = g^v = V$.
    - **Special soundness:** two accepting answers $(c_1, r_1)$, $(c_2, r_2)$ for one $V$ give
      $a = (r_2 - r_1) / (c_1 - c_2) \bmod q$. A cheater guesses $c$ right with probability only $1/q$.
    - **Honest-verifier zero-knowledge:** pick $r$ and $c$ at random, set $V = g^r \cdot A^c$. These triples have the
      same distribution as real ones.
    - **Fiat–Shamir:** taking $c$ from a hash makes the proof non-interactive, secure in the random-oracle model.

??? tip "Watch it step by step: prove you know 9 without saying it"

    <div class="mars-steps" markdown>

    1. The statement is $A = 6$. Alice knows that $2^9 \bmod 23 = 6$.
    2. She picks $v = 8$ and sends $V = 3$. That locks her in.
    3. Bob sends the challenge $c = 3$.
    4. Alice answers $r = 3$. On its own, 3 looks like any random number mod 11.
    5. Bob checks $2^3 \cdot 6^3 = 72 \equiv 3 \pmod{23}$, which is $V$. He accepts.
    6. If Alice ever answered $c = 5$ for the same $V$, her two answers 3 and 7 would give away $a = 9$.

    </div>

??? info "The math underneath"

    - **Discrete log:** $A$ hides $a$ only because inverting $a \mapsto g^a$ is hard:
      [hard problems](../10-math-foundations/Hard-Problems.md).
    - **Proof of knowledge:** the extraction above is the formal meaning of "knows $a$". A prover who answers
      two challenges can be rewound to get $a$; the forking lemma (Pointcheval and Stern) does this for the
      hashed version.
    - **Fiat–Shamir:** the same equations with a message in the hash are a
      [Schnorr signature](../02-signatures/Schnorr.md).
    - **Commitments:** $V$ is a commitment to $v$; Pedersen's version is in [commitments](Commitments.md).
    - **Circuits:** SNARKs and STARKs prove a whole computation, written as additions and multiplications
      over a finite field, with polynomials checked at random points.

## See also

- [Schnorr](../02-signatures/Schnorr.md): the same equations as a signature
- [Threshold signatures](Threshold-Signatures.md): Schnorr proofs in FROST's key generation
- [Secret sharing](Secret-Sharing.md): Pedersen's commitments, also behind Bulletproofs
- [Commitments](Commitments.md): hash and Pedersen commitments, the first move in many of these proofs

## References

- Goldwasser, Micali and Rackoff, "The Knowledge Complexity of Interactive Proof-Systems" (STOC 1985)
- Fiat and Shamir, "How to Prove Yourself" (CRYPTO '86) / [Schnorr (CRYPTO '89)](https://doi.org/10.1007/0-387-34805-0_22)
- [RFC 8235: Schnorr Non-interactive Zero-Knowledge Proof](https://www.rfc-editor.org/rfc/rfc8235) / [RFC 3526: MODP groups](https://www.rfc-editor.org/rfc/rfc3526)
- [Groth, "On the Size of Pairing-based Non-interactive Arguments" (Eurocrypt 2016)](https://eprint.iacr.org/2016/260) / [Gabizon, Williamson and Ciobotaru, "PLONK" (2019)](https://eprint.iacr.org/2019/953)
- [Ben-Sasson et al., "Scalable, transparent, and post-quantum secure computational integrity" (2018)](https://eprint.iacr.org/2018/046)
- [Bünz et al., "Bulletproofs" (IEEE S&P 2018)](https://eprint.iacr.org/2017/1066)
- [ZIP 224: Orchard](https://zips.z.cash/zip-0224) / [ZIP 257: Orchard vulnerability mitigation and NU6.2](https://zips.z.cash/zip-0257)
- [Monero 0.13.0 release (October 2018)](https://getmonero.org/2018/10/11/monero-0.13.0-released.html) / [Monero 0.18.0.0 release (2022)](https://getmonero.org/2022/07/19/monero-0.18.0.0-released.html)
- [Chase, Perrin and Zaverucha, "The Signal Private Group System" (CCS 2020)](https://eprint.iacr.org/2019/1416) / [RFC 9497: OPRFs](https://www.rfc-editor.org/rfc/rfc9497)
- [Bernhard, Pereira and Warinschi, "How not to Prove Yourself" (ASIACRYPT 2012)](https://eprint.iacr.org/2016/771)

*Weaker sources:* [ethereum.org on zk-rollups](https://ethereum.org/developers/docs/scaling/zk-rollups/)
for how rollups use proofs and the project names; the Sapling (2018) and NU5
(2022) activation years from news reports and
[Electric Coin Co.'s 5.0.0 release post](https://electriccoin.co/blog/new-release-5-0-0);
the ZIPs give only block heights.
