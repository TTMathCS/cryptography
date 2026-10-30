# Commitments

*Seal a value now and open it later. Until then the seal says nothing
about the value, and it can't be opened to anything else. Pedersen's 1991
scheme sits inside many zero-knowledge proofs and private payments.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

To **commit** to a value m, pick a random r and publish C. To **open**,
reveal m and r, and anyone can recompute C. A scheme needs two things:

- **Hiding:** C says nothing about m.
- **Binding:** nobody can find a second opening (m′, r′) for the same C.

No scheme has both against unlimited computing power. If every value has an
opening that fits C, as perfect hiding needs, unlimited power can find a
second one. If C fixes m, unlimited power can find m by trying every
value. So each scheme picks the side that rests on a hard problem.

- **Hash commitment:** `C = H(r ‖ m)` with r about 32 random bytes. Two
  openings would be a hash collision, so binding rests on collision
  resistance. Hiding holds if the hash acts like a random function; r
  stops anyone from checking guesses.
- **Pedersen commitment** (CRYPTO '91): in a group of prime order q with
  generators g and h, `C = g^m·h^r` with r random mod q. C is a uniformly
  random group element whatever m is, so it is perfectly hiding. Two
  openings give `log_g h = (m − m′) / (r′ − r) mod q`, so it is binding as
  long as nobody knows that log. It is also additively homomorphic:
  `C(m₁, r₁) · C(m₂, r₂) = C(m₁ + m₂, r₁ + r₂)`.
- **ElGamal-style commitment** `(g^r, g^m·h^r)` makes the opposite choice:
  perfectly binding, and hiding only while decisional Diffie-Hellman is
  hard.

## How it works

- **Getting h.** Whoever knows `log_g h` can open a Pedersen commitment to
  any value, and that includes whoever set up the system. So h comes from
  hashing a public string onto the group: anyone can redo it, and nobody
  picked it.
- **Opening.** The verifier recomputes `g^m·h^r`. It should check that C
  is in the group, and since m only counts mod q (m and m + q open the
  same C), that m is in the range it expects.
- **Adding.** Multiply commitments to add the values and add the r's to
  open the sum. If the r's are chosen to cancel, a verifier can check that
  inputs and outputs balance just by comparing products, without seeing
  any value.
- **Proving things without opening.** Schnorr-style proofs show that you
  know an opening, or that two commitments hold the same value.
  Bulletproofs show that a committed value lies in `[0, 2ⁿ)`, and commit
  to a whole vector at once as `g₁^a₁ ⋯ gₙ^aₙ · h^r`.

## When to use it

Use a commitment when someone must fix a choice before seeing what others
do, or when a system must check arithmetic on values it never sees.

- **Zero-knowledge proofs.** The first move of a Schnorr proof, `V = g^v`,
  commits to v. Goldreich, Micali and Wigderson (FOCS 1986) showed with
  commitments that every NP statement has a zero-knowledge proof: the
  prover commits to the colours of a graph 3-colouring, the verifier picks
  an edge, and the prover opens its two ends. KZG commitments (Kate,
  Zaverucha and Goldberg, ASIACRYPT 2010) commit to a whole polynomial
  with one pairing-group element; PLONK builds on them, and Ethereum's
  blob transactions (EIP-4844) carry a 48-byte KZG commitment per blob.
- **Confidential transactions.** Gregory Maxwell's Confidential
  Transactions replace each amount with a 33-byte Pedersen commitment. The
  network checks that the commitments add up to zero, so no money is
  made from nothing, without seeing any amount. Each output also needs a
  range proof, or a huge amount would wrap around mod q and act like a
  negative one. Monero hides amounts the same way (RingCT, Noether, 2015)
  and has used Bulletproofs for the range proofs since October 2018.
- **Coin flipping and sealed bids.** Blum's "Coin Flipping by Telephone"
  (CRYPTO '81) asked how two people who don't trust each other can flip a
  coin over the phone. Alice commits to a random bit, Bob guesses it, and
  Alice opens: Bob wins if he guessed right, and neither can steer the
  result. A sealed-bid auction works the same way: everyone commits to a
  bid, and the bids are opened after bidding closes.
- **Key transparency.** Each CONIKS leaf holds a commitment to the
  username and key, and a lookup opens only the one asked about. The IETF's
  draft protocol commits with HMAC under a fixed published key and a random
  opening. The tree position comes from a [VRF](VRF.md).

## Example (Python)

A hash commitment with SHA-256, then Pedersen commitments in the RFC 3526
2048-bit group from [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md).
h is a SHAKE256 hash squared mod p: squaring puts it in the subgroup of
order q, and since it comes from a hash, nobody knows its log base g. The
last part makes a bad h with a known log and opens one commitment to two
values. This group gives about 112-bit security; the main table's 128-bit
row is the elliptic-curve version.

```python
import hashlib, secrets

# hash commitment: publish c, keep the nonce and the message until it is time to open
nonce = secrets.token_bytes(32)
c = hashlib.sha256(nonce + b"bid: 120").hexdigest()
print(hashlib.sha256(nonce + b"bid: 120").hexdigest() == c)     # True: the opening checks out
print(hashlib.sha256(nonce + b"bid: 90").hexdigest() == c)      # False
c0 = hashlib.sha256(b"bid: 120").hexdigest()                     # the same without a nonce
print(next(v for v in range(10**6) if hashlib.sha256(b"bid: %d" % v).hexdigest() == c0))   # 120: guessed

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g, q = 2, (p - 1) // 2                  # RFC 3526 group 14; 2 has prime order q
h = pow(int.from_bytes(hashlib.shake_256(b"toy Pedersen h").digest(256), "big"), 2, p)
# h is a hash squared into the same group, so nobody knows its log base g

def commit(m, r, h=h):                  # Pedersen: g^m h^r
    return pow(g, m, p) * pow(h, r, p) % p

a, ra = 120, secrets.randbelow(q)
b, rb = 90, secrets.randbelow(q)
Ca, Cb = commit(a, ra), commit(b, rb)
print(commit(a, secrets.randbelow(q)) != Ca)            # True: same value, unrelated commitment
print(commit(a, ra) == Ca, commit(b, ra) == Ca)         # True False: opening
print(Ca * Cb % p == commit(a + b, (ra + rb) % q))      # True: C(a)·C(b) = C(a + b)

x = secrets.randbelow(q - 1) + 1        # a bad h = g^x, made by someone who keeps x
bad = pow(g, x, p)
C = commit(a, ra, bad)
r2 = (ra + (a - b) * pow(x, -1, q)) % q
print(commit(b, r2, bad) == C)          # True: the same C opens to 90 as well
```

## Security notes

- **Fresh, long randomness every time.** Without it, a hash commitment to
  a bid or a vote falls to guessing, as the example shows. Reusing r in
  two Pedersen commitments gives away the difference of the values to
  anyone who can guess it: `C₁/C₂ = g^(m₁ − m₂)`.
- **Nobody may know `log_g h`.** Derive h by hashing, and never take h from
  the party that commits.
- **Commitments can be copied or shifted.** Anyone can resend your hash
  commitment and open it once you open yours. From a Pedersen C anyone can
  make `C·g`, a commitment to m + 1, and open it after you open C. In an
  auction that means outbidding you without knowing your bid. Tie each
  commitment to its sender, for example with a proof of knowledge of the
  opening that hashes in the sender's ID, or use a non-malleable scheme
  (Dolev, Dwork and Naor, 1991).
- A quantum computer that finds `log_g h` can open old Pedersen
  commitments to any value, so binding fails, but perfect hiding means
  they still reveal nothing. Hash commitments don't rest on discrete log.

## See also

- [Zero-knowledge proofs](Zero-Knowledge.md): Bulletproofs and other proofs about committed values
- [Secret sharing](Secret-Sharing.md): Pedersen's verifiable secret sharing, where his commitment comes from
- [VRF](VRF.md): the other half of a key transparency leaf
- [Hard problems](../10-math-foundations/Hard-Problems.md): the discrete log behind Pedersen's binding

## References

- [Pedersen, "Non-Interactive and Information-Theoretic Secure Verifiable Secret Sharing" (CRYPTO '91)](https://doi.org/10.1007/3-540-46766-1_9)
- [Blum, "Coin Flipping by Telephone" (SIGACT News, 1983; first at CRYPTO '81)](https://doi.org/10.1145/1008908.1008911)
- [Goldreich, Micali and Wigderson, "Proofs that Yield Nothing But Their Validity" (JACM 1991; FOCS 1986)](https://doi.org/10.1145/116825.116852)
- [Dolev, Dwork and Naor, "Nonmalleable Cryptography" (SIAM J. Computing 2000; STOC 1991)](https://doi.org/10.1137/S0097539795291562)
- [Maxwell, Confidential Transactions](https://elementsproject.org/features/confidential-transactions/investigation) / [Noether, "Ring Signature Confidential Transactions for Monero" (2015)](https://eprint.iacr.org/2015/1098)
- [Bünz et al., "Bulletproofs" (IEEE S&P 2018)](https://eprint.iacr.org/2017/1066) / [Monero 0.13.0 release (October 2018)](https://getmonero.org/2018/10/11/monero-0.13.0-released.html)
- [Kate, Zaverucha and Goldberg, "Constant-Size Commitments to Polynomials and Their Applications" (ASIACRYPT 2010)](https://iacr.org/archive/asiacrypt2010/6477178/6477178.pdf) / [EIP-4844: Shard Blob Transactions](https://eips.ethereum.org/EIPS/eip-4844)
- [Melara et al., "CONIKS: Bringing Key Transparency to End Users" (USENIX Security 2015)](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/melara) / [draft-ietf-keytrans-protocol](https://datatracker.ietf.org/doc/draft-ietf-keytrans-protocol/)
- [RFC 3526: MODP groups](https://www.rfc-editor.org/rfc/rfc3526)
