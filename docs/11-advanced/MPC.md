# Multi-party computation

*Several parties compute a function of their private inputs. Each learns
the output and nothing else, and no trusted party is needed. The price is
rounds of messages between them.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

Andrew Yao posed the millionaires' problem in 1982: two millionaires want
to know who is richer without saying how rich they are. In general, n
parties with inputs x₁ … xₙ want `f(x₁, …, xₙ)`, and each should learn
only what a trusted party computing f would have told it.

- **Garbled circuits** (Yao): two parties, a constant number of rounds.
  Credited to Yao's FOCS 1986 paper, though he gave the construction in
  talks; Lindell and Pinkas published the first full proof in 2004.
- **GMW** (Goldreich, Micali and Wigderson, STOC 1987): any function, any
  number of parties, computed on shares of every wire.
- **BGW** and **CCD** (STOC 1988): no hardness assumption at all, if fewer
  than a third of the parties cheat.
- **SPDZ** (Damgård, Pastro, Smart and Zakarias, CRYPTO 2012): secret
  sharing with MACs, safe even when all but one party cheats.

The cost depends on the threat. **Semi-honest** parties follow the
protocol and only look at what they see; **malicious** ones do anything.
Protocols that assume an honest majority are much cheaper.

ISO/IEC 4922-2 (2024) specifies MPC on the secret sharing of ISO/IEC
19592-2. Part 3, on garbled circuits, is a draft; its DIS vote closed in
June 2026.

## How it works

### Oblivious transfer

In 1-out-of-2 oblivious transfer (OT), a sender holds `m₀` and `m₁`. A
receiver with a choice bit c gets `m_c` and nothing about the other, and
the sender learns nothing about c. Even, Goldreich and Lempel gave this
form in 1985, after Rabin's 1981 variant. Kilian (STOC 1988) showed OT
alone is enough for any secure computation. A Diffie-Hellman version
(Chou and Orlandi, 2015):

1. The sender sends `A = gᵃ`.
2. The receiver sends `B = gᵇ` if c = 0, or `B = A·gᵇ` if c = 1.
3. The sender encrypts `m₀` under `H(Bᵃ)` and `m₁` under `H((B/A)ᵃ)`.
4. The receiver can compute only `H(Aᵇ)`, the key for `m_c`.

B looks random either way, and the other key needs `g^(a²)`, as hard as a
Diffie-Hellman secret. Public-key OT is slow, so systems run about 128 of
them and stretch them into millions with symmetric crypto (OT extension;
Ishai, Kilian, Nissim and Petrank, CRYPTO 2003).

### Garbled circuits

Alice, the garbler, picks two random labels for every wire of the
circuit, one meaning 0 and one meaning 1. For each gate she encrypts the
right output label under each of the four pairs of input labels, and
shuffles the rows. She sends the tables and the labels for her own input
bits, and Bob gets the labels for his bits by OT. He opens one row per
gate, and Alice tells him what the final labels mean. Bob only ever holds
one label per wire, and labels look random.

Modern garbling makes XOR gates free and sends two 16-byte ciphertexts per
AND gate (half gates; Zahur, Rosulek and Evans, EUROCRYPT 2015). Plain Yao
only stops a semi-honest garbler; a cheating Alice can garble a different
circuit.

### Secret sharing

Each input is split into shares, additive (`x = x₁ + … + xₙ mod p`) or
[Shamir](Secret-Sharing.md). Adding shared values needs no messages.
Multiplying needs help. Beaver's trick (CRYPTO '91) uses a shared random
triple `a, b, c = a·b`: the parties open `d = x − a` and `e = y − b`,
which reveal nothing, and `x·y = c + d·b + e·a + d·e` is then a sum of
shares and public values.

SPDZ makes the triples ahead of time with somewhat homomorphic
encryption. Each shared value also carries a shared MAC `α·x` under a key
α nobody knows, so a party who changes a share is caught at the end.

### Threshold signatures and FHE

A [threshold signature](Threshold-Signatures.md) is MPC for one function:
sign with a key that exists only as shares. Protocols built for that one
job, like FROST, are far cheaper than general MPC. Threshold ECDSA borrows
MPC tools (Paillier or OT) to multiply shares.

[Homomorphic encryption](Homomorphic-Encryption.md) puts the work on one
server in one round, but computes slowly. MPC computes fast but sends
messages for every layer of multiplications. The two mix: SPDZ uses
homomorphic encryption for its preprocessing, and threshold FHE, with the
decryption key split among the parties, gives MPC in 3 rounds, or 2 with a
reusable public-key setup (Asharov et al., EUROCRYPT 2012).

## When to use it

Use it when the inputs belong to parties who won't hand them to anyone,
and only a result should come out.

- **The Danish sugar beet auction** (14 January 2008), the first
  large-scale use. 1,229 farmers bid to buy or sell contracts to grow
  beets for Danisco. Three servers, run by Danisco, the growers'
  association DKS and the SIMAP research project, held Shamir shares of
  the bids and found the market-clearing price among 4,000 possible
  prices. About 25,000 tons of production rights changed hands.
- **Threshold wallets:** coin keys kept as shares on separate machines,
  signing with threshold ECDSA or FROST.
- **Private statistics:** in Estonia, Bogdanov et al. (PoPETs 2016) joined
  ten million tax records with half a million education records on the
  Sharemind system, to see whether students who work fail to graduate on
  time. No server saw the records.

## Example (Python)

A garbled AND gate: Alice and Bob learn whether both said yes. If Alice
says no, she learns nothing about Bob's answer. Bob's label would come by
oblivious transfer; here it is handed over. Real garbling hashes with
fixed-key AES and marks the right row instead of trying all four.

```python
import hashlib, secrets

def H(x, y):
    return hashlib.sha256(x + y).digest()                # 32 bytes

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def garble():                                            # Alice: two random labels per wire
    A, B, C = [[secrets.token_bytes(16), secrets.token_bytes(16)] for _ in range(3)]
    table = [xor(H(A[x], B[y]), C[x & y] + bytes(16)) for x in (0, 1) for y in (0, 1)]
    secrets.SystemRandom().shuffle(table)                # row order must give nothing away
    return A, B, C, table

def evaluate(table, la, lb):                             # Bob: one label per input wire
    for row in table:
        out = xor(H(la, lb), row)
        if out[16:] == bytes(16):                        # only one row opens to 16 zero bytes
            return out[:16]

def both_yes(alice, bob):
    A, B, C, table = garble()
    lb = B[bob]                                          # really fetched by oblivious transfer
    return C.index(evaluate(table, A[alice], lb))        # Alice says which output label means 1

print([both_yes(x, y) for x in (0, 1) for y in (0, 1)])  # [0, 0, 0, 1]
```

## Security notes

- **The output is not protected.** MPC hides only what the result doesn't
  show. If two people compute the average of their salaries, each can work
  out the other's.
- **Know the model.** A semi-honest protocol does nothing against a
  cheater, and an honest-majority one fails if enough parties collude.
- **Garble once.** Reusing a garbled circuit, or leaking both labels of a
  wire, lets Bob compute on other inputs.
- **Aborts.** Without an honest majority a cheater can quit after seeing
  the output. SPDZ catches cheating but can only abort.
- The DH-based OT and Paillier fall to Shor's algorithm. Secret sharing
  with information-theoretic MACs doesn't.

## See also

- [Secret sharing](Secret-Sharing.md): the shares under GMW, BGW and SPDZ
- [Threshold signatures](Threshold-Signatures.md): MPC for signing
- [Homomorphic encryption](Homomorphic-Encryption.md): the one-round alternative
- [OPRF](OPRF.md): a two-party computation of one function

## References

- [Yao, "Protocols for Secure Computations" (FOCS 1982)](https://doi.org/10.1109/SFCS.1982.38) / [Yao, "How to Generate and Exchange Secrets" (FOCS 1986)](https://doi.org/10.1109/SFCS.1986.25)
- [Lindell and Pinkas, "A Proof of Security of Yao's Protocol for Two-Party Computation" (2004)](https://eprint.iacr.org/2004/175)
- [Goldreich, Micali and Wigderson, "How to Play ANY Mental Game" (STOC 1987)](https://doi.org/10.1145/28395.28420) / [Ben-Or, Goldwasser and Wigderson (STOC 1988)](https://doi.org/10.1145/62212.62213) / Chaum, Crépeau and Damgård (STOC 1988)
- [Even, Goldreich and Lempel (CACM, 1985)](https://doi.org/10.1145/3812.3818) / [Kilian (STOC 1988)](https://doi.org/10.1145/62212.62215) / [Chou and Orlandi (LATINCRYPT 2015)](https://eprint.iacr.org/2015/267) / [Ishai et al. (CRYPTO 2003)](https://doi.org/10.1007/978-3-540-45146-4_9)
- [Zahur, Rosulek and Evans, "Two Halves Make a Whole" (EUROCRYPT 2015)](https://doi.org/10.1007/978-3-662-46803-6_8)
- [Beaver (CRYPTO '91)](https://doi.org/10.1007/3-540-46766-1_34) / [Damgård, Pastro, Smart and Zakarias (CRYPTO 2012)](https://eprint.iacr.org/2011/535)
- [Asharov et al., "Multiparty Computation with Low Communication, Computation and Interaction via Threshold FHE" (EUROCRYPT 2012)](https://eprint.iacr.org/2011/613)
- [Bogetoft et al., "Secure Multiparty Computation Goes Live" (FC 2009)](https://doi.org/10.1007/978-3-642-03549-4_20)
- [Bogdanov et al., "Students and Taxes" (PoPETs 2016)](https://eprint.iacr.org/2015/1159)
- [ISO/IEC 4922-2:2024](https://www.iso.org/standard/80514.html) / [ISO/IEC DIS 4922-3](https://www.iso.org/standard/87557.html)

*Weaker sources:* the ISO/IEC 4922-3 stage from the Serbian standards
institute's copy of the ISO project data, since iso.org didn't load.
