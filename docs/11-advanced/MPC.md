# Multi-party computation

*Several parties compute a function of their private inputs. Each learns
the output and nothing else, and no trusted party is needed. The price is
rounds of messages between them.*

**Status and standards:** see [Advanced primitives](../algorithms/table.md#11-advanced-primitives) in the main table.

*The full story: Advanced protocols and privacy, [chapter 9](../books/advanced/09-Oblivious-Transfer-and-Garbled-Circuits.md) and [chapter 10](../books/advanced/10-Multi-Party-Computation-in-Practice.md).*

## What it is

Andrew Yao posed the millionaires' problem in 1982: two millionaires want
to know who is richer without saying how rich they are. In general, $n$
parties with inputs $x_1, \ldots, x_n$ want $f(x_1, \ldots, x_n)$, and each should learn
only what a trusted party computing $f$ would have told it.

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

## The story

- **Who made it:** Andrew Yao (1982, 1986), then Goldreich, Micali and Wigderson (1987), and Ben-Or, Goldwasser and Wigderson (1988).
- **What for:** Computing a result from several people's secret inputs without anyone revealing their own.
- **What it solved:** Joint calculations without a trusted middleman.
- **Where it stands:** First real use: Denmark's sugar beet auction (2008), where farmers' bids were cleared by MPC. Today it guards crypto-currency keys and runs privacy-preserving statistics, such as Boston's pay-gap study (2017).
- **Incidents:** The 2023 threshold ECDSA flaws (see [Threshold signatures](Threshold-Signatures.md)) were MPC bugs.

## How it works

### Oblivious transfer

In 1-out-of-2 oblivious transfer (OT), a sender holds $m_0$ and $m_1$. A
receiver with a choice bit $c$ gets $m_c$ and nothing about the other, and
the sender learns nothing about $c$. Even, Goldreich and Lempel gave this
form in 1985, after Rabin's 1981 variant. Kilian (STOC 1988) showed OT
alone is enough for any secure computation. A Diffie-Hellman version
(Chou and Orlandi, 2015):

1. The sender sends $A = g^a$.
2. The receiver sends $B = g^b$ if $c = 0$, or $B = A \cdot g^b$ if $c = 1$.
3. The sender encrypts $m_0$ under $H(B^a)$ and $m_1$ under $H((B/A)^a)$.
4. The receiver can compute only $H(A^b)$, the key for $m_c$.

$B$ looks random either way, and the other key needs $g^{a^2}$, as hard as a
Diffie-Hellman secret. Public-key OT is slow, so systems run about 128 of
them and stretch them into millions with symmetric crypto (OT extension;
Ishai, Kilian, Nissim and Petrank, CRYPTO 2003).

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 345" role="img" aria-labelledby="sk-c-ot-t"><title id="sk-c-ot-t">In oblivious transfer the sender holds two messages and the receiver a choice bit; the receiver gets only the chosen message and the sender never learns the choice</title><defs><filter id="sk-c-ot-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-ot-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-ot-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-ot-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-ot-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="345" filter="url(#sk-c-ot-paper)"/><g filter="url(#sk-c-ot-pen)"><text x="30" y="44" class="h">Take one, learn nothing more</text><path class="p gold" d="M30 100 L210 100 L210 190 L30 190Z"/><text x="120.0" y="151.0" text-anchor="middle" class="s">sender</text><path class="p room" d="M430 100 L610 100 L610 190 L430 190Z"/><text x="520.0" y="151.0" text-anchor="middle" class="s">receiver</text><text x="50" y="170" class="s">holds m₀ and m₁</text><text x="450" y="170" class="s">holds a choice bit c = 1</text><path class="p " d="M212 125 L428 125" marker-end="url(#sk-c-ot-ah)"/><path class="p " d="M428 155 L212 155" marker-end="url(#sk-c-ot-ah)"/><text x="320" y="117" text-anchor="middle" class="s">A</text><text x="320" y="176" text-anchor="middle" class="s">B</text><path class="p " d="M212 180 L428 230" marker-end="url(#sk-c-ot-ah)"/><path class="p rust" d="M430 220 L610 220 L610 264 L430 264Z"/><text x="520.0" y="248.0" text-anchor="middle" class="s">gets m₁ only</text><text x="30" y="250" class="s">sender never learns c</text><text x="30" y="310" class="s">With this one tool, two parties can compute any function of their inputs together,</text><text x="30" y="330" class="s">each keeping its own input secret (Kilian, 1988).</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

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

Each input is split into shares, additive ($x = x_1 + \cdots + x_n \bmod p$) or
[Shamir](Secret-Sharing.md). Adding shared values needs no messages.
Multiplying needs help. Beaver's trick (CRYPTO '91) uses a shared random
triple $a, b, c = a \cdot b$: the parties open $d = x - a$ and $e = y - b$,
which reveal nothing, and $x \cdot y = c + d \cdot b + e \cdot a + d \cdot e$ is then a sum of
shares and public values.

SPDZ makes the triples ahead of time with somewhat homomorphic
encryption. Each shared value also carries a shared MAC $\alpha \cdot x$ under a key
$\alpha$ nobody knows, so a party who changes a share is caught at the end.

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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: multiplying shared numbers with a Beaver triple"

    Two parties work mod 97. Party 1 and party 2 hold additive shares of $x = 12$ and $y = 7$, and of a
    triple $a = 5$, $b = 9$, $c = a \cdot b = 45$ made ahead of time. Neither party sees $x$, $y$, $a$, $b$ or $c$.

    | Value | Party 1 share | Party 2 share | Sum mod 97 |
    |---|---|---|---|
    | $x$ | 40 | 69 | 12 |
    | $y$ | 50 | 54 | 7 |
    | $a$ | 60 | 42 | 5 |
    | $b$ | 20 | 86 | 9 |
    | $c$ | 30 | 15 | 45 |
    | $d = x - a$, opened | 77 | 27 | 7 |
    | $e = y - b$, opened | 30 | 65 | 95 (that is, $-2$) |
    | $z = x \cdot y$ | $30 + 43 + 74 + 83 = 36$ | $15 + 20 + 13 = 48$ | **$84 = 12 \cdot 7$** |

    Party 1 computes $c_1 + d \cdot b_1 + e \cdot a_1 + d \cdot e$; party 2 computes $c_2 + d \cdot b_2 + e \cdot a_2$. Only one party
    adds the public $d \cdot e = 83$. Opening $d = 7$ and $e = 95$ gives nothing away, because $a$ and $b$ are random
    and used once. Adding needs no help at all: shares of $x + y$ are $40 + 50 = 90$ and $69 + 54 = 26$,
    which sum to $116 \equiv 19$.

??? abstract "The math, with formulas"

    $$
    \begin{aligned}
    &\text{Additive sharing:} && x = x_1 + x_2 + \cdots + x_n \pmod{p}, \quad \text{all but one share random} \\
    &\text{Add:} && [x + y]_i = x_i + y_i \qquad (\text{no messages}) \\
    &\text{Beaver triple:} && [a],\ [b],\ [c] \text{ with } c = a \cdot b \\
    &\text{Open:} && d = x - a, \quad e = y - b \\
    &\text{Multiply:} && x \cdot y = c + d \cdot b + e \cdot a + d \cdot e
    \end{aligned}
    $$

    - **Why it works:** expand $(d + a)(e + b) = d \cdot e + d \cdot b + e \cdot a + a \cdot b$, and $a \cdot b = c$. Every term is
      either public or a share times a public number, so each party works on its own.
    - **Why $d$ and $e$ leak nothing:** $a$ is uniform and used once, so $x - a$ is uniform whatever $x$ is.
      It is a one-time pad mod $p$.
    - **Cost:** one triple and one round of opening per multiplication. Additions are free, so the
      number of rounds follows the circuit's multiplicative depth.
    - **SPDZ MACs:** each value also carries shares of $\alpha \cdot x$; a party who changes a share is caught by the
      MAC check at the end, except with probability about $1/p$.

??? tip "Watch it step by step: 12 times 7 on shares"

    <div class="mars-steps" markdown>

    1. Share the inputs mod 97: $x = 12$ as 40 and 69, $y = 7$ as 50 and 54.
    2. Take a prepared triple: $a = 5$ (60, 42), $b = 9$ (20, 86), $c = 45$ (30, 15).
    3. Each party subtracts locally, then both open $d = 77 + 27 = 7$ and $e = 30 + 65 = 95$.
    4. Party 1: $30 + 7 \cdot 20 + 95 \cdot 60 + 7 \cdot 95 \bmod 97 = 30 + 43 + 74 + 83 = 36$.
    5. Party 2: $15 + 7 \cdot 86 + 95 \cdot 42 \bmod 97 = 15 + 20 + 13 = 48$.
    6. Only the output is opened: $36 + 48 = 84 = 12 \cdot 7$. The triple is thrown away.

    </div>

??? info "The math underneath"

    - **Finite fields:** working mod a prime makes every nonzero number invertible, which Shamir
      sharing and its interpolation need; see [secret sharing](Secret-Sharing.md).
    - **Linearity:** any linear function of shared values is computed on the shares alone. Only
      multiplication needs interaction.
    - **Security by simulation:** a protocol is secure if whatever a party sees could be made up from
      its own input and the output, as if a trusted party had computed $f$.
    - **Thresholds:** BGW needs no hardness assumption if fewer than a third of the parties cheat.
      With no honest majority, protocols need public-key tools such as oblivious transfer.
    - **Oblivious transfer** in the Chou-Orlandi version on this page rests on a Diffie-Hellman
      problem; see [hard problems](../10-math-foundations/Hard-Problems.md).

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
