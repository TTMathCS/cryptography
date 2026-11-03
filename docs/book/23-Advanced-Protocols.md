# 23. Advanced protocols

*Everything so far protects a message between two people who trust each other:
encrypt it, sign it, agree on a key. This last chapter is about people who do
**not** trust each other but still need to work together: keep a key that no
single person can use, flip a fair coin over the phone, prove a statement
without revealing why it is true, compute a result from private inputs, check a
password against a breach list without sending it, or let a server compute on
data it can't read. Each tool starts from a problem and comes with an example
small enough to check by hand.*

!!! abstract "In this chapter"
    **You will learn:**

    - secret sharing (Shamir) and threshold signatures (FROST): keys that exist only in pieces;
    - commitments: sealing a value now and opening it later, with hiding and binding;
    - zero-knowledge proofs: Schnorr's protocol, simulation, Fiat-Shamir, and where SNARKs fit;
    - multi-party computation: Beaver triples, garbled circuits and oblivious transfer;
    - oblivious PRFs, verifiable random functions, and homomorphic encryption from Paillier to FHE.

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (inverses mod $p$),
    [Chapter 12](12-Diffie-Hellman.md) (groups, generators, discrete logs),
    [Chapter 14](14-Discrete-Log-Systems.md) (Schnorr signatures),
    [Chapter 17](17-Defining-Security.md) (security definitions), and for 23.9,
    [Chapter 21](21-Lattice-Cryptography.md) (LWE).

    **Levels:** 23.1 to 23.4 are intermediate; 23.5 to 23.10 are advanced; 23.12 is expert.

## 23.1 The problem

In 1979, the same year as Lamport's signatures, Adi Shamir published a two-page
paper called "How to Share a Secret", and George Blakley independently found
another way to do it. In 1981 Manuel Blum asked how two people who distrust each
other could flip a coin over the telephone. In 1982 Andrew Yao asked how two
millionaires could find out who is richer without either saying how rich they
are. In 1985 Shafi Goldwasser, Silvio Micali and Charles Rackoff asked whether
you could convince someone that a statement is true while teaching them nothing
else, and showed that you could.

These were puzzles at first, studied by theorists. Each turned into
infrastructure. Secret sharing backs up the key that signs the internet's DNS
root. Threshold signatures guard billions of dollars of cryptocurrency.
Zero-knowledge proofs check batches of transactions for blockchains and log
people into systems without sending passwords. Oblivious PRFs check passwords
against breach lists in browsers and phones. Homomorphic encryption lets a phone
ask a server about a photo or a caller without the server learning which. The
common thread: **the parties don't trust each other, and no trusted middleman
is needed.**

All the group examples in this chapter use the same small setting from
[Chapter 12](12-Diffie-Hellman.md): numbers mod a prime $p$, and a subgroup of
prime order $q$ with a generator $g$, so exponents count mod $q$. By hand we use
$p = 23$, $q = 11$, $g = 2$, or $p = 107$, $q = 53$; the programs use a 255-bit
safe prime, which shows the structure but is far too small for real use.

## 23.2 Secret sharing

*Level: intermediate.* **The problem.** A company's root signing key must
survive if the one person who holds it is hit by a bus, and must not be usable
by that person alone. Give copies to five people and any one can misuse it.
Split it so that, say, any **three of five** can rebuild it and two learn nothing.

**The easy case: everyone must agree.** To split a secret $s$ mod a prime among
$n$ people so that all $n$ are needed, give $n - 1$ of them random numbers and
the last one $s$ minus their sum. With $s = 13$ mod 17 and three people: 5, 9
and $13 - 14 \equiv 16$. Together $5 + 9 + 16 = 30 \equiv 13$. Any two shares are
two random numbers, saying nothing, exactly as a one-time pad
([Chapter 4](04-Randomness-and-Perfect-Secrecy.md)) says nothing.

**Shamir's threshold scheme.** Two points fix a line, three fix a parabola, and
$t$ points fix a polynomial of degree $t - 1$. So hide $s$ as the value at
$x = 0$ of a random polynomial of degree $t - 1$, and hand out points on it.

**By hand: 2 of 3, mod 17, secret 13.** A threshold of 2 needs a line. Pick a
random slope, 10: $f(x) = 13 + 10x \bmod 17$.

| Share | Calculation | Value |
|---|---|---|
| 1 | $f(1) = 23 \bmod 17$ | (1, 6) |
| 2 | $f(2) = 33 \bmod 17$ | (2, 16) |
| 3 | $f(3) = 43 \bmod 17$ | (3, 9) |

Holders 1 and 3 meet. **Lagrange interpolation** gives the line's value at 0
directly as a weighted sum of their shares, with weights that depend only on
which $x$ values are present:

$$
\lambda_1 = \frac{3}{3 - 1} = 3 \cdot 2^{-1}, \qquad \lambda_3 = \frac{1}{1 - 3} = -2^{-1} \pmod{17}.
$$

Since $2 \cdot 9 = 18 \equiv 1$, $2^{-1} = 9$, so $\lambda_1 = 27 \equiv 10$ and
$\lambda_3 = -9 \equiv 8$. Then $s = 6 \cdot 10 + 9 \cdot 8 = 132 \equiv 13$. The
other pairs work too: shares 1 and 2 use weights 2 and 16, shares 2 and 3 use 3
and 15, and both give 13.

**Why one share says nothing.** Holder 1 knows the point (1, 6). For every
possible secret $s'$ there is exactly one line through $(0, s')$ and $(1, 6)$,
and since the slope was random, every $s'$ is equally likely. This is perfect
secrecy: it holds against unlimited computing power, quantum computers included.

```python
import secrets
from itertools import combinations

p = 2**127 - 1                          # a Mersenne prime; the secret must be below p

def split(secret, t, n):                # a random polynomial of degree t - 1 with f(0) = secret
    a = [secret] + [secrets.randbelow(p) for _ in range(t - 1)]
    return [(x, sum(c * pow(x, k, p) for k, c in enumerate(a)) % p) for x in range(1, n + 1)]

def rebuild(shares):                    # Lagrange interpolation at x = 0
    s = 0
    for xi, yi in shares:
        num = den = 1
        for xj, _ in shares:
            if xj != xi:
                num, den = num * xj % p, den * (xj - xi) % p
        s = (s + yi * num * pow(den, -1, p)) % p
    return s

secret = int.from_bytes(b"open sesame", "big")
shares = split(secret, 3, 5)
print(all(rebuild(c) == secret for c in combinations(shares, 3)))
print(rebuild(shares[:2]) == secret)
print(rebuild(shares[2:]).to_bytes(11, "big"))
```

Output:

```
True
False
b'open sesame'
```

All ten groups of three rebuild the secret; two shares give a random number.

**A dishonest dealer.** Plain Shamir trusts whoever splits the secret. A dealer
could hand out shares that don't lie on one polynomial, and nobody would notice
until rebuilding fails. **Verifiable secret sharing** fixes that: Paul Feldman
(1987) has the dealer publish $g^{a_k}$ for each coefficient, so holder $i$ can
check $g^{f(i)} = \prod_k (g^{a_k})^{i^k}$ without learning the coefficients;
Torben Pedersen (1991) used commitments (section 23.4) to make the published
values reveal nothing at all.

**In the real world.** The key-signing key of the DNS root zone is backed up
under a five-of-seven scheme, with seven Recovery Key Share Holders around the
world. Hardware wallets offer SLIP-39 (SatoshiLabs, 2017) seed backups as
Shamir shares written as words. HashiCorp Vault splits its unseal key into five
shares with a threshold of three by default. Two cautions: rebuilding puts the
whole secret back on one machine, and a changed share gives a wrong secret with
no error. Full details: [Secret sharing reference](../11-advanced/Secret-Sharing.md).

## 23.3 Threshold signatures

*Level: intermediate.* **The problem.** Secret sharing protects a key at rest,
but every signature means rebuilding it somewhere. A cryptocurrency custodian
signing hundreds of withdrawals a day would rebuild the key hundreds of times.
Can $t$ share holders **sign together** without the key ever existing in one
place, and produce one ordinary signature that any verifier accepts?

For Schnorr signatures ([Chapter 14](14-Discrete-Log-Systems.md)) the answer is
yes, because everything in a Schnorr signature is linear. The shares satisfy
$x = \sum \lambda_i x_i$, and a linear formula on shares can be applied to each
share separately and the results added.

**By hand: 2 of 3, mod 23.** The group of order $q = 11$ mod $p = 23$, generator
$g = 2$. This is the simplified version with one nonce per signer.

| Step | Calculation | Value |
|---|---|---|
| Key and shares | $x = 7$, line $7 + 3i \bmod 11$ | $x_1 = 10$, $x_2 = 2$, $x_3 = 5$ |
| Public key | $P = 2^7 \bmod 23$ | 13 |
| Signers 1 and 3: Lagrange weights | $\lambda_1 = 3/(3 - 1)$, $\lambda_3 = 1/(1 - 3)$ mod 11 | 7, 5 |
| Nonces | $k_1 = 4$, $k_3 = 9$: $R_1 = 2^4$, $R_3 = 2^9$ mod 23 | 16, 6 |
| Group commitment | $R = 16 \cdot 6 \bmod 23$ | 4 |
| Challenge | $c = H(R, P, m) \bmod 11$, say | 5 |
| Answers | $z_1 = 4 + 7 \cdot 10 \cdot 5$, $z_3 = 9 + 5 \cdot 5 \cdot 5$, mod 11 | 2, 2 |
| Signature | $z = 2 + 2$ | $(R, z) = (4, 4)$ |
| Verify | $g^z = 2^4 = 16$; $R \cdot P^c = 4 \cdot 13^5 \bmod 23$ | $16 = 16$ |

Neither signer ever held 7, yet $\lambda_1 x_1 + \lambda_3 x_3 = 70 + 25 = 95 \equiv 7 \pmod{11}$.
The sum works because $z = k_1 + k_3 + c(\lambda_1 x_1 + \lambda_3 x_3) = k + c x$, a
plain Schnorr answer.

**FROST.** With one nonce each, an attacker who opens many signing sessions at
once can choose its own nonces after seeing everyone else's and forge (Drijvers
and others, 2019, on two-round multi-signatures). Chelsea Komlo and Ian
Goldberg's FROST (2020) gives each signer two nonces $d_i, e_i$ and a **binding
factor** $\rho_i$, a hash of the message and everyone's commitments, so each
nonce is tied to one message and one set of signers. It is RFC 9591 (2024), with
versions for Ed25519, Ed448, P-256, ristretto255 and secp256k1 whose signatures
any normal verifier accepts.

```python
import hashlib, secrets
from math import prod

p = 2**255 - 46545                      # a safe prime: q = (p - 1) / 2 is prime too (toy size)
q, g = (p - 1) // 2, 4                  # 4 is a square, so it generates the group of order q

def H(*xs):                             # toy hash to a number mod q
    return int.from_bytes(hashlib.sha256(repr(xs).encode()).digest(), "big") % q

x, a = secrets.randbelow(q), secrets.randbelow(q)       # a dealer draws a line through (0, x)
share = {i: (x + a * i) % q for i in (1, 2, 3)}          # 2-of-3 shares
P = pow(g, x, p)                        # the group's public key
del x                                   # from here on nobody holds x

m, S = b"pay 5 to carol", (1, 3)        # signers 1 and 3 sign
nonce = {i: (secrets.randbelow(q), secrets.randbelow(q)) for i in S}     # round 1: two nonces each
comm = {i: (pow(g, d, p), pow(g, e, p)) for i, (d, e) in nonce.items()}
rho = {i: H(P, m, sorted(comm.items()), i) for i in S}  # binding factors tie nonces to this message
R = prod(comm[i][0] * pow(comm[i][1], rho[i], p) for i in S) % p
c = H(R, P, m)
lam = {i: prod(j * pow(j - i, -1, q) for j in S if j != i) % q for i in S}   # Lagrange at 0
z = {i: (nonce[i][0] + nonce[i][1] * rho[i] + lam[i] * share[i] * c) % q for i in S}
s = sum(z.values()) % q                 # round 2: the coordinator adds the answers
print(pow(g, s, p) == R * pow(P, c, p) % p)                # an ordinary Schnorr check on (R, s)
```

Output:

```
True
```

A real system replaces the trusted dealer with **distributed key generation**:
every participant deals Feldman shares of its own random secret, and each
person's share of the group key is the sum of what it received. Nobody ever
sees the whole key.

**ECDSA is harder.** ECDSA's $s = k^{-1}(H(m) + r x)$ multiplies two secrets and
inverts one, and shares add but don't multiply. Threshold ECDSA protocols
(Gennaro and Goldfeder, 2018; Canetti and others, 2020) need homomorphic
encryption or oblivious transfer and zero-knowledge proofs that every party's
numbers are in range: more rounds and far more code. In 2023 two teams,
Verichains ("TSSHOCK") and Fireblocks ("BitForge"), showed that widely used
threshold ECDSA libraries had skipped or weakened those proofs, letting one
corrupt party extract the whole key, in one case from a single signature.

**BLS** signatures (Boneh, Lynn and Shacham, 2001), on pairing-friendly curves,
are deterministic and linear, so threshold BLS needs no extra rounds; Ethereum's
consensus aggregates thousands of them. Full details:
[Threshold signatures reference](../11-advanced/Threshold-Signatures.md).

## 23.4 Commitments

*Level: intermediate.* **The problem.** Alice and Bob, on the phone, want to flip
a coin. If Alice flips and announces, Bob has to trust her. Blum's 1981 answer:
Alice **commits** to a random bit, a sealed envelope; Bob calls heads or tails;
Alice **opens** the envelope. Bob wins if he guessed right. Neither can steer
the result: Alice can't change her bit after hearing Bob's guess, and Bob
learns nothing about it before guessing. Sealed-bid auctions and many
protocols in this chapter need the same envelope.

A commitment scheme needs two properties:

- **Hiding:** the commitment $C$ reveals nothing about the value $m$.
- **Binding:** nobody can open $C$ to two different values.

**The hash commitment.** Publish $C = H(r \,\Vert\, m)$ with $r$ 32 fresh random
bytes; to open, reveal $r$ and $m$. Binding: two openings would be a hash
collision ([Chapter 9](09-Hash-Functions.md)). Hiding: $r$ stops anyone from
testing guesses. Without $r$, a bid of "120" can be found by hashing every
number until one matches.

**The Pedersen commitment** (Torben Pedersen, 1991): with two generators $g$ and
$h$ of a group of prime order $q$, where nobody knows $\log_g h$,

$$
C = g^m \cdot h^r, \qquad r \text{ random mod } q.
$$

**By hand, mod 107.** The squares mod 107 form a group of prime order 53. Take
$g = 4$, $h = 9$ and commit to $m = 7$ with $r = 10$: $4^7 = 13$ and
$9^{10} = 11$, so $C = 13 \cdot 11 \bmod 107 = 36$. To open, reveal 7 and 10;
anyone recomputes 36. Commit to 5 with $r = 20$: $C_2 = 105$. Multiply:
$36 \cdot 105 \bmod 107 = 35$, and $4^{12} \cdot 9^{30} \bmod 107 = 35$ too. The
product is a commitment to the **sum**, $7 + 5 = 12$, opened with $10 + 20 = 30$.

**Hiding and binding can't both be perfect.** Pedersen is perfectly hiding:
$h^r$ is a uniformly random group element, so $C$ is too, whatever $m$ is. For
*every* $m'$ there is some $r'$ with $g^{m'} h^{r'} = 36$. That means someone with
unlimited power can find a second opening, so binding rests on a hard problem.
In this tiny group anyone can find $\log_4 9 = 17$ by trying all 53 powers, and
then $r' = 10 + (7 - 3) \cdot 17^{-1} \bmod 53 = 4$ opens 36 as $m = 3$:
$4^3 \cdot 9^4 \bmod 107 = 36$. In general, if $C$ fits every value, unlimited
power can reopen it; if $C$ fits only one value, unlimited power can find it by
trying them all. Every scheme picks which side rests on a hard problem.

```python
import hashlib, secrets

nonce = secrets.token_bytes(32)         # hash commitment: publish c; keep nonce and bid until opening
c = hashlib.sha256(nonce + b"bid: 120").hexdigest()
print(hashlib.sha256(nonce + b"bid: 120").hexdigest() == c, hashlib.sha256(nonce + b"bid: 90").hexdigest() == c)
c0 = hashlib.sha256(b"bid: 120").hexdigest()            # the same without a nonce
print(next(v for v in range(10**6) if hashlib.sha256(b"bid: %d" % v).hexdigest() == c0))

p = 2**255 - 46545                      # a safe prime (toy size); squares mod p form a group of prime order q
q, g = (p - 1) // 2, 4
h = pow(int.from_bytes(hashlib.sha256(b"Pedersen h").digest(), "big"), 2, p)   # nobody knows log_g h

def commit(m, r, h=h):                  # Pedersen: g^m h^r
    return pow(g, m, p) * pow(h, r, p) % p

ra, rb = secrets.randbelow(q), secrets.randbelow(q)
Ca, Cb = commit(120, ra), commit(90, rb)
print(commit(120, ra) == Ca, Ca * Cb % p == commit(210, (ra + rb) % q))      # opens; adds
k = secrets.randbelow(q - 1) + 1        # a bad h whose log k someone kept
bad = pow(g, k, p)
C = commit(120, ra, bad)
print(commit(90, (ra + 30 * pow(k, -1, q)) % q, bad) == C)                   # opens to 90 as well
```

Output:

```
True False
120
True True
True
```

The second line is the guessing attack on a commitment without a nonce. The
last line is why $h$ must come from hashing a public string: whoever knows
$\log_g h$ can open any commitment to anything.

**Where they are used.** Confidential Transactions (Gregory Maxwell, 2015) and
Monero replace every amount with a Pedersen commitment; because commitments add,
the network checks that inputs equal outputs without seeing any amount, with a
range proof (section 23.5) so no amount can be negative. Commitments are also
the first move of every zero-knowledge proof below. Full details:
[Commitments reference](../11-advanced/Commitments.md).

## 23.5 Zero-knowledge proofs

*Level: advanced.* **The problem.** You want to log in by proving you know the
secret behind your public key, but you don't want the server (or anyone
watching) to learn anything it could use to log in as you later. More
ambitiously: prove a transaction is valid without showing its amounts, or
prove a computation was done correctly without the verifier redoing it.

A zero-knowledge proof must be:

- **complete:** an honest prover convinces an honest verifier;
- **sound:** a prover who doesn't know the secret fails, except with tiny probability;
- **zero-knowledge:** the verifier learns nothing except that the statement is true.

The last one is made precise by **simulation**: a proof is zero-knowledge if the
verifier could have produced a transcript that looks exactly the same **on its
own**, without the prover. Then the real transcript can't have taught it anything.

**The cave.** Jean-Jacques Quisquater and colleagues explained it to children in
1989 with a circular cave whose two passages meet at a door with a secret word.
Peggy goes in by one passage while Victor waits outside; Victor shouts which
passage she should come out of; if she knows the word she can always comply.
Without it she succeeds half the time, so twenty rounds leave her a one in a
million chance of bluffing. And a video of the twenty rounds proves nothing to
anyone else, because Victor and Peggy could have agreed the shouts in advance
and edited out the failures. That is simulation.

**Schnorr's protocol** (Claus-Peter Schnorr, 1989) is the cave in algebra. Alice
knows $a$ with $A = g^a$.

1. **Commit:** Alice picks a random $v$ and sends $V = g^v$.
2. **Challenge:** Bob sends a random $c$.
3. **Respond:** Alice sends $r = v - a c \bmod q$. Bob checks $V = g^r A^c$.

It checks because $g^{v - ac} g^{ac} = g^v$.

**By hand, mod 23.** Order $q = 11$, $g = 2$. Alice's secret is $a = 9$, so
$A = 2^9 \bmod 23 = 6$.

<div class="mars-steps" markdown>

1. Alice picks $v = 8$ and sends $V = 2^8 \bmod 23 = 3$. That locks her in.
2. Bob sends the challenge $c = 3$.
3. Alice answers $r = 8 - 9 \cdot 3 = -19 \equiv 3 \pmod{11}$. On its own, 3 looks like any number mod 11.
4. Bob checks $2^3 \cdot 6^3 = 8 \cdot 9 = 72 \equiv 3 \pmod{23}$, which is $V$. He accepts.
5. Soundness: had Alice also answered $c = 5$ for the same $V$, her answer would be $r_2 = 8 - 45 \equiv 7$, and $a = (r_2 - r)/(c - c_2) = 4 / (-2) \equiv 9 \pmod{11}$. Anyone who can answer two challenges knows $a$.
6. Zero knowledge: Bob can fake a transcript by choosing $r = 5$ and $c = 2$ first and setting $V = 2^5 \cdot 6^2 \equiv 2$. It passes the same check, so a real transcript teaches him nothing.

</div>

**Fiat-Shamir.** Amos Fiat and Adi Shamir (1986) removed Bob: take the challenge
as a **hash** of everything public, $c = H(g, A, V, \text{context})$. Alice can't
choose $V$ after seeing $c$, because $c$ depends on $V$. Put a message in the hash
and the proof becomes a Schnorr signature. This program is the non-interactive
proof, bound to a name:

```python
import hashlib, secrets

p = 2**255 - 46545                      # a safe prime (toy size)
q, g = (p - 1) // 2, 4

def H(*xs):                             # Fiat-Shamir: the challenge is a hash of everything public
    return int.from_bytes(hashlib.sha256(repr(xs).encode()).digest(), "big") % q

def prove(a, who):                      # "I know a with A = g^a", bound to a name
    A = pow(g, a, p)
    v = secrets.randbelow(q)
    V = pow(g, v, p)
    return A, V, (v - a * H(g, A, V, who)) % q

def verify(A, V, r, who):
    return pow(A, q, p) == 1 and V == pow(g, r, p) * pow(A, H(g, A, V, who), p) % p

a = secrets.randbelow(q)                # Alice's secret
A, V, r = prove(a, b"alice")
print(verify(A, V, r, b"alice"), verify(A, V, r, b"mallory"), verify(A, V, (r + 1) % q, b"alice"))
```

Output:

```
True False False
```

The proof fails for another name, so Mallory can't replay it as her own. RFC 8235
specifies this proof.

**Proofs for any computation.** Goldreich, Micali and Wigderson showed in 1986
that every statement with a short checkable witness (every NP statement) has a
zero-knowledge proof. The practical systems write a computation as a circuit of
additions and multiplications over a finite field and prove that the prover
knows inputs satisfying it:

- **zk-SNARKs** (Groth16 in 2016, PLONK in 2019) have tiny proofs, Groth16's
  only 192 bytes, checked in milliseconds however big the computation. They rest
  on pairings and a **trusted setup**: whoever keeps the setup's secret
  randomness can forge proofs, so setups are run as ceremonies with many
  participants, safe if any one destroys its part.
- **zk-STARKs** (2018) need no setup and use only hash functions, so they should
  survive quantum computers; the proofs are larger, tens to hundreds of KB.
- **Bulletproofs** (2018) prove that a committed number is in a range, such as
  $[0, 2^{64})$, in about 700 bytes, with no setup; Monero has used them since
  2018.

Zcash uses SNARKs to hide payments; zk-rollups post a proof to Ethereum that a
whole batch of transactions was processed correctly. Full details:
[Zero-knowledge reference](../11-advanced/Zero-Knowledge.md).

## 23.6 Multi-party computation

*Level: advanced.* **The problem.** Yao's millionaires want to know who is richer.
Hospitals want a joint statistic over patients that no hospital may share. In
general, $n$ parties with private inputs want $f(x_1, \ldots, x_n)$, and each
should learn only what a trusted party computing $f$ would have told it. MPC
does it with no trusted party.

**Computing on shares.** Split every input with additive sharing (section 23.2).
**Adding** two shared values needs no messages: each party adds its own shares.
**Multiplying** needs help, and Donald Beaver's trick (1991) gives it: before
the computation, the parties get shares of a random **triple** $a, b$ and
$c = ab$. To multiply shared $x$ and $y$, they open $d = x - a$ and $e = y - b$,
which reveal nothing because $a$ and $b$ are random one-time pads. Then

$$
x y = (d + a)(e + b) = c + d\,b + e\,a + d\,e,
$$

and every term is either public or a share times a public number.

**By hand: 12 times 7, mod 97, two parties.**

| Value | Party 1 | Party 2 | Sum mod 97 |
|---|---|---|---|
| $x$ | 40 | 69 | 12 |
| $y$ | 50 | 54 | 7 |
| $a$ | 60 | 42 | 5 |
| $b$ | 20 | 86 | 9 |
| $c = ab$ | 30 | 15 | 45 |
| $x - a$, opened | 77 | 27 | $d = 7$ |
| $y - b$, opened | 30 | 65 | $e = 95$ |

Party 1 computes $c_1 + d b_1 + e a_1 + d e = 30 + 43 + 74 + 83 \equiv 36$.
Party 2 computes $c_2 + d b_2 + e a_2 = 15 + 20 + 13 = 48$ (only one party adds
the public $de$). Opened: $36 + 48 = 84 = 12 \cdot 7$. Neither party saw 12, 7 or
84 until the end. Since additions are free and each multiplication costs one
round of messages, any circuit can be computed this way.

**Garbled circuits.** Yao's method (1986) for two parties works differently.
Alice, the **garbler**, picks two random labels for every wire of the circuit,
one meaning 0 and one meaning 1. For each gate she encrypts the right output
label under each pair of input labels and shuffles the four rows. She sends the
tables and the labels for her own input bits; Bob gets the labels for his bits by
**oblivious transfer** (below). Bob can open exactly one row per gate, and
labels look random, so he learns nothing but the final output.

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

print([both_yes(x, y) for x in (0, 1) for y in (0, 1)])
```

Output:

```
[0, 0, 0, 1]
```

One AND gate tells two people whether both said yes; if Alice says no, she learns
nothing about Bob's answer. A comparison of two 64-bit numbers, the millionaires'
problem, is a circuit of a few hundred gates.

**Oblivious transfer.** Alice has two messages; Bob wants one of them, chosen by a
bit $b$. Bob must get $m_b$ and learn nothing about the other, and Alice must not
learn $b$. A Diffie-Hellman version (Chou and Orlandi, 2015): Alice sends
$A = g^\alpha$; Bob sends $B = g^\beta$ if $b = 0$ or $B = A g^\beta$ if $b = 1$; Alice
encrypts $m_0$ under a hash of $B^\alpha$ and $m_1$ under a hash of $(B/A)^\alpha$; Bob can
compute only $A^\beta$, the key for the one he chose. Joe Kilian proved in 1988 that
oblivious transfer alone is enough to compute any function securely.

**What MPC protects, and what not.** MPC hides inputs, not what the output
reveals: if two people compute the average of their two salaries, each can work
out the other's. Protocols also differ in what cheating they survive:
**semi-honest** parties follow the rules and only look; **malicious** ones do
anything. With an honest majority, protocols such as BGW (1988) need no hardness
assumption at all; with no honest majority (SPDZ, 2012) they need public-key
tools and can only abort when cheating is detected.

**First real use.** On 14 January 2008 about 1,200 Danish farmers bid for
contracts to grow sugar beets in an auction cleared by MPC: three servers, run by
the buyer Danisco, the growers' association and a research project, held shares
of the bids and found the market price without anyone seeing an individual bid.
Full details: [MPC reference](../11-advanced/MPC.md).

## 23.7 Oblivious PRFs

*Level: advanced.* **The problem.** Your browser wants to check whether your
password appears in a list of billions of leaked passwords on a server. Sending
the password, or even its hash, lets the server (or a thief who breaks in) learn
it. Downloading the list is too big and gives away the list. What you want: the
server applies its secret key $k$ to your input $x$, you get $F(k, x)$, and the
server sees neither $x$ nor the answer.

That is an **oblivious pseudorandom function** (Freedman, Ishai, Pinkas and
Reingold, 2005). The version in use, 2HashDH (Jarecki, Kiayias and Krawczyk,
2014), is $F(k, x) = H(x, H'(x)^k)$, where $H'$ hashes onto a prime-order group.

1. **Blind:** the client picks a random $r$ and sends $B = H'(x)^r$.
2. **Evaluate:** the server sends $Z = B^k$.
3. **Unblind:** the client computes $Z^{r^{-1} \bmod q} = H'(x)^{k r r^{-1}} = H'(x)^k$ and hashes.

**By hand, mod 107** (order 53). Say the input hashes to $H'(x) = 30$; the
server's key is $k = 11$; the client picks $r = 7$.

| Step | Who | Calculation | Value |
|---|---|---|---|
| Blind | client | $B = 30^7 \bmod 107$ | 39 |
| Evaluate | server | $Z = 39^{11} \bmod 107$ | 85 |
| Inverse of $r$ | client | $7^{-1} \bmod 53$, since $7 \cdot 38 = 266 = 5 \cdot 53 + 1$ | 38 |
| Unblind | client | $85^{38} \bmod 107$ | 69 |
| Check | anyone with $k$ | $30^{11} \bmod 107$ | 69 |

Run it again with $r = 20$: the server sees $B = 62$ and answers $Z = 100$, and
unblinding with $20^{-1} = 8$ gives 69 again. The server saw 39 and then 62, two
unrelated elements, and can't even tell the two requests carried the same input.
In a prime-order group $H'(x)^r$ for random $r$ is uniformly random, so the
server learns nothing even with unlimited computing power.

```python
import hashlib, secrets

p = 2**255 - 46545                      # a safe prime (toy size)
q = (p - 1) // 2

def to_group(x):                        # toy hash onto the group of squares (real code: RFC 9380)
    return pow(int.from_bytes(hashlib.sha512(b"H2G" + x).digest(), "big"), 2, p)

k = secrets.randbelow(q - 1) + 1        # the server's key

def oprf(x):
    r = secrets.randbelow(q - 1) + 1
    B = pow(to_group(x), r, p)          # client blinds; this is all the server sees
    Z = pow(B, k, p)                    # server applies its key
    N = pow(Z, pow(r, -1, q), p)        # client unblinds
    return B, hashlib.sha256(x + N.to_bytes(32, "big")).hexdigest()

B1, y1 = oprf(b"hunter2")
B2, y2 = oprf(b"hunter2")
print(y1 == y2, B1 != B2, oprf(b"hunter3")[1] == y1)
```

Output:

```
True True False
```

**Where it is used.** RFC 9497 (2023) standardizes OPRFs, including a
**verifiable** mode where the server proves (with a Chaum-Pedersen proof, a
two-sided Schnorr proof) that it used its published key. **OPAQUE** (Jarecki,
Krawczyk and Xu, 2018; RFC 9807) is a password login in which the server never
sees the password: the client runs the OPRF on its password, stretches the
result with a slow hash ([Chapter 11](11-Passwords-and-Key-Derivation.md)), and
uses it to open an encrypted envelope holding its keys. A stolen server database
gives nothing to guess against offline. WhatsApp's encrypted backups build on
it. **Privacy Pass** (RFC 9578) issues anonymous tokens with a VOPRF so a site
can skip a CAPTCHA without tracking you. Apple's and Microsoft's password breach
checks use the same blind-evaluate-unblind step. Full details:
[OPRF reference](../11-advanced/OPRF.md).

## 23.8 Verifiable random functions

*Level: advanced.* **The problem.** A blockchain must pick the next block's
leader at random, fairly, with nobody able to steer the choice, and without
announcing the winner in advance (so attackers can't target them). Each
participant could hash a public seed with its key, but then nobody else could
check the result. A signature can be checked, but ECDSA has a valid signature for
every nonce, so a signer could try many and keep the luckiest.

A **verifiable random function** (Micali, Rabin and Vadhan, 1999) gives the key
holder an output $\beta$ and a proof $\pi$. Anyone with the public key can check
them, and each input has exactly **one** output that verifies, so the holder
can't choose. Without the key, outputs look random.

The elliptic-curve VRF of RFC 9381 (2023) works like this, written here
multiplicatively with secret $x$ and public $Y = g^x$: hash the input to a group
element $H$; the VRF value is $\Gamma = H^x$; the proof is a Chaum-Pedersen proof
that $\Gamma$ and $Y$ use the same exponent; the output is a hash of $\Gamma$.

**By hand, mod 23** (order 11, $g = 2$). The hash of the input and the challenge
are made up; the rest is computed.

| Step | Calculation | Value |
|---|---|---|
| Keys | $x = 6$, $Y = 2^6 \bmod 23$ | 18 |
| Input hashed to the group | say | $H = 3$ |
| VRF value | $\Gamma = 3^6 \bmod 23$ | 16 |
| Nonce $k = 5$ | $U = 2^5$, $V = 3^5$ mod 23 | 9, 13 |
| Challenge | $c = \mathrm{Hash}(Y, H, \Gamma, U, V)$, say | 7 |
| Response | $s = 5 + 7 \cdot 6 \bmod 11$ | 3 |
| Verifier rebuilds $U$ | $2^3 \cdot 18^{-7} \bmod 23$ | 9 |
| Verifier rebuilds $V$ | $3^3 \cdot 16^{-7} \bmod 23$ | 13 |

The verifier recomputes $U$ and $V$ from $(\Gamma, c, s)$, hashes them, and gets
the same $c$. A false $\Gamma = 12$ would give $V = 6$ instead of 13, a different
hash, and the proof fails. The output is a hash of 16.

**Where it is used.** Algorand (2017) picks committees by running each user's VRF
on a public seed; a user learns it was selected privately and proves it when it
speaks. Cardano's Ouroboros Praos picks slot leaders the same way. Key
transparency systems place each user in a public tree at a VRF of their name, so
the tree can be audited without listing everyone's name. One rule: the input must
come from something the key holder can't influence, or it can still try many
inputs. Full details: [VRF reference](../11-advanced/VRF.md).

## 23.9 Homomorphic encryption

*Level: advanced.* **The problem.** You want a server to compute on your data, a
sum of votes, a lookup in a database, a machine-learning model on your medical
record, without the server reading the data. In 1978 Ronald Rivest, Leonard
Adleman and Michael Dertouzos asked for "privacy homomorphisms": encryption you
can compute on. Textbook RSA is one already: $m_1^e \cdot m_2^e = (m_1 m_2)^e$, so
multiplying ciphertexts multiplies messages.

**Adding: Paillier.** Pascal Paillier's 1999 scheme adds. Take primes $p, q$,
$n = pq$, $\lambda = \operatorname{lcm}(p - 1, q - 1)$, $\mu = \lambda^{-1} \bmod n$.

$$
\begin{aligned}
\text{Encrypt:}\quad & c = (n + 1)^m \cdot r^n \bmod n^2 \quad (r \text{ fresh and random}) \\
\text{Decrypt:}\quad & m = L(c^\lambda \bmod n^2) \cdot \mu \bmod n, \qquad L(u) = (u - 1) / n
\end{aligned}
$$

It adds because $(n + 1)^m = 1 + mn \pmod{n^2}$ (every later term of the binomial
expansion has $n^2$ in it), so multiplying ciphertexts adds exponents, and the
random parts multiply into another $r^n$, which raising to $\lambda$ wipes out.

**By hand: $p = 5$, $q = 7$.** $n = 35$, $n^2 = 1225$, $\lambda = \operatorname{lcm}(4, 6) = 12$,
$\mu = 12^{-1} \bmod 35 = 3$ (since $12 \cdot 3 = 36 \equiv 1$).

| Step | Calculation | Value mod 1225 |
|---|---|---|
| Encrypt 5 with $r = 2$ | $36^5 = 176$, $2^{35} = 18$, product | 718 |
| Encrypt 8 with $r = 3$ | $36^8 = 281$, $3^{35} = 607$, product | 292 |
| Server multiplies | $718 \cdot 292$ | 181 |
| Decrypt: power | $181^{12}$ | 561 |
| Decrypt: $L$ | $(561 - 1)/35$ | 16 |
| Decrypt: times $\mu$ | $16 \cdot 3 \bmod 35$ | **13** |

$13 = 5 + 8$, and the server that multiplied 718 by 292 never saw 5, 8 or 13.
Notice $36^5 = 176 = 1 + 5 \cdot 35$ and $36^8 = 281 = 1 + 8 \cdot 35$: the message
sits in the exponent, exactly as the formula said.

```python
import secrets
from math import gcd

p, q = 2**61 - 1, 2**89 - 1             # toy primes; a real n has 2048 bits or more
n, n2 = p * q, (p * q) ** 2
lam = (p - 1) * (q - 1) // gcd(p - 1, q - 1)            # the private key
mu = pow(lam, -1, n)

def enc(m):
    r = secrets.randbelow(n - 1) + 1    # fresh r every time
    return pow(n + 1, m, n2) * pow(r, n, n2) % n2

def dec(c):
    return (pow(c, lam, n2) - 1) // n * mu % n

a, b = enc(20), enc(22)
print(dec(a * b % n2), dec(pow(a, 3, n2)), enc(20) == enc(20))
total = 1
for v in (1, 0, 1, 1, 0, 1):            # six encrypted yes/no votes
    total = total * enc(v) % n2         # the tally runs on ciphertexts only
print(dec(total))
```

Output:

```
42 60 False
4
```

Multiplying ciphertexts adds (42), a power multiplies by a known number (60), and
the same message encrypts differently each time. The vote tally is the classic use.

**Adding and multiplying: fully homomorphic encryption.** With both addition and
multiplication you can evaluate any circuit. For thirty years nobody knew how.
In 2009 Craig Gentry, then a Stanford PhD student, built the first scheme, from
lattices. The schemes in use rest on the LWE problem of
[Chapter 21](21-Lattice-Cryptography.md). A ciphertext is roughly
$(a, \langle a, s \rangle + e + \Delta m)$: adding two adds the messages and the
noises. Multiplying works too, but multiplies the noise. After enough
multiplications the noise swamps the message, exactly the decryption failure of
Chapter 21.

Gentry's answer is **bootstrapping**: run the decryption circuit itself
homomorphically, on the noisy ciphertext, using an encryption of the secret key.
Out comes a fresh ciphertext of the same message with small noise, and the
computation can continue forever. (It assumes the scheme stays secure when it
encrypts its own key, which nobody has proved.) The modern schemes are **BGV**
and **BFV** (exact arithmetic on integers, thousands of values packed into one
ciphertext), **CKKS** (Cheon, Kim, Kim and Song, 2017: approximate arithmetic on
real numbers, for statistics and machine learning) and **TFHE** (2016: one bit
or small number per ciphertext, bootstrapped after every gate).

**The cost.** Gentry and Halevi's 2011 implementation took 30 minutes per
bootstrap with a 2.3 GB public key. TFHE brought a bootstrapped gate to around
13 ms on one core by 2019: millions of times slower than an unencrypted gate, but
usable for small computations. A BFV ciphertext holding 8,192 values is a few
hundred KB.

**Where it is used.** Apple's Live Caller ID Lookup (iOS 18) sends the incoming
number encrypted under BFV, and the server answers without learning which number
was asked; Enhanced Visual Search in Photos scores an encrypted image embedding
the same way. Microsoft Edge's Password Monitor combines an OPRF with
homomorphic lookup. Full details:
[Homomorphic encryption reference](../11-advanced/Homomorphic-Encryption.md).

## 23.10 Break it

*Level: advanced.* The protocols in this chapter have more moving parts than a
cipher, and their failures come from the parts.

- **Reused randomness.** Two Schnorr proofs, or two FROST signing rounds, with
  the same nonce and different challenges give away the secret, by the
  soundness argument of section 23.5. Two Pedersen commitments with the same $r$
  reveal the difference of the values; two Paillier ciphertexts with the same $r$
  reveal the difference of the messages.
- **Hashing too little in Fiat-Shamir.** If the challenge doesn't cover the
  statement, a prover can pick the statement after the challenge. That made
  proofs in the Helios voting system unsound (Bernhard, Pereira and Warinschi,
  2012), and in 2022 Trail of Bits found the same "Frozen Heart" bug in many
  zero-knowledge libraries, allowing forged proofs.
- **Skipped proofs in threshold ECDSA.** The 2023 TSSHOCK and BitForge attacks
  worked because libraries left out range proofs or used too few rounds of a
  proof. One malicious party then extracted every other party's key share.
- **A flaw in a setup.** In March 2018 Ariel Gabizon found an error in the
  parameters of the proof system Zcash then used that would have let anyone mint
  coins undetectably. It was fixed quietly in the October 2018 upgrade and
  disclosed in February 2019; no exploitation was found.
- **The circuit is not the specification.** A zero-knowledge proof shows the
  circuit is satisfied, not that the circuit says what its authors meant. A
  missing constraint lets a prover satisfy it with nonsense, and most real
  vulnerabilities in deployed proof systems are of this kind.
- **Rogue keys.** Adding BLS or Schnorr public keys for aggregation lets an
  attacker choose its key as $g^{x'} / P_{\text{yours}}$ so the sum is a key it
  controls. Proofs of possession or key-dependent coefficients prevent it.
- **The output leaks.** MPC and FHE protect inputs, not what the result reveals.
  CKKS adds a subtler leak: Li and Micciancio (2021) recovered secret keys from
  decrypted CKKS results that were shared back, because the result's tiny errors
  depend on the key; libraries now add noise before sharing.
- **Malleability.** Homomorphic encryption is malleable by design, so it can
  never be CCA-secure ([Chapter 17](17-Defining-Security.md)). Sign what parties
  submit; never decrypt arbitrary ciphertexts for others.

## 23.11 In the real world

| Tool | Standard or main reference | Where you meet it | Survives a quantum computer? |
|---|---|---|---|
| Shamir sharing | Shamir 1979; SLIP-39 | DNS root key backup, wallets, Vault | yes (information-theoretic) |
| Threshold signatures | RFC 9591 (FROST) | custody, validators, CA keys | no (discrete log) |
| Pedersen commitments | Pedersen 1991 | confidential amounts, ZK proofs | hiding yes, binding no |
| Hash commitments | | coin flips, auctions, key transparency | yes |
| Schnorr proofs, SNARKs | RFC 8235; Groth16, PLONK | logins, Zcash, rollups | no |
| STARKs | | rollups | believed yes (hashes) |
| MPC | ISO/IEC 4922 | auctions, statistics, wallets | depends on the building blocks |
| OPRF | RFC 9497, RFC 9807 (OPAQUE), RFC 9578 | password logins, breach checks, Privacy Pass | inputs stay hidden; key no |
| VRF | RFC 9381 | leader election, key transparency | no |
| Paillier | Paillier 1999 | e-voting, threshold ECDSA | no (factoring) |
| Lattice FHE | HomomorphicEncryption.org standard (2018) | private lookups, ML inference | believed yes (LWE) |

NIST began a call for threshold schemes (NIST IR 8214 and its follow-ups), and
ISO is standardizing FHE as ISO/IEC 28033; the reference pages under
[Advanced primitives](../index.md#11-advanced-primitives) track their status.
As with every chapter in this book: use audited libraries, never home-made
protocols, and check what each one assumes about the other parties.

## 23.12 Going deeper

*Level: expert.*

??? abstract "The ideal/real paradigm: what 'secure' means for a protocol"

    A protocol for $f$ is secure if, for every adversary attacking the real protocol, there is a **simulator**
    that, given only the corrupted parties' inputs and outputs in an **ideal world** where a trusted party
    computes $f$, produces a view indistinguishable from the real one. Zero-knowledge is the special case
    where $f$ outputs one bit, "the statement is true". Canetti's **universal composability** (2001) strengthens
    this so a protocol stays secure when run alongside arbitrary other protocols, at the cost of needing setup
    assumptions (a common reference string, or an honest majority) for most tasks. The threshold results are
    tight: perfect security for any function is possible exactly when fewer than a third of the parties are
    malicious (BGW, CCD 1988); with a broadcast channel, statistical security up to a half (Rabin and Ben-Or,
    1989); beyond that, only computational security with abort.

??? abstract "How a SNARK checks a computation it never runs"

    Write the computation as polynomial identities over a field $\mathbb{F}$: for example, a polynomial $P(X)$ that must
    vanish on a set $D$ of $N$ points, which holds exactly when $P(X) = Z_D(X)\,Q(X)$ for the vanishing polynomial
    $Z_D$ and some quotient $Q$. The prover commits to $P$ and $Q$ (with KZG commitments, a pairing-based
    commitment to a whole polynomial; or with Merkle trees of evaluations in STARKs). The verifier picks a random
    point $z$ (by Fiat-Shamir) and checks $P(z) = Z_D(z) Q(z)$ from opened values. By the **Schwartz-Zippel lemma**,
    two different polynomials of degree $d$ agree at a random point with probability at most $d / \lvert \mathbb{F} \rvert$,
    negligible for a 255-bit field. So one random evaluation checks $N$ constraints. Zero knowledge comes from
    adding random multiples of $Z_D$ that vanish on $D$ but mask the values elsewhere.

??? abstract "Noise growth and bootstrapping in numbers"

    In BGV, a fresh ciphertext has noise of size $B$. Adding gives at most $2B$; multiplying gives about $B^2$ times a
    factor depending on the dimension. Without management, depth $L$ multiplications grow noise like $B^{2^L}$.
    **Modulus switching** divides the ciphertext, and with it the noise, by a factor $p_i$ after each multiplication,
    dropping from $q_L = p_1 \cdots p_L$ to $q_{L-1}$, so noise stays near $B$ and the modulus shrinks instead: a leveled
    scheme supports depth $L$ with $\log q_L \approx L \log B$ bits. Security requires the dimension to grow with $\log q$,
    which is why deep circuits need large rings (dimension $2^{15}$ to $2^{16}$). Bootstrapping evaluates decryption,
    itself a circuit of fixed depth, to reset the level. TFHE instead bootstraps after each gate with a "blind
    rotation" that also applies a lookup table, so it never needs a large modulus.

??? abstract "Oblivious transfer extension"

    Public-key OT costs an exponentiation per transfer, too slow for the millions a garbled circuit needs.
    Ishai, Kilian, Nissim and Petrank (2003) showed how to run about 128 public-key OTs once (with roles reversed)
    and stretch them into any number of OTs using only a hash function: the receiver's choice bits form a matrix
    whose columns are transferred, and each row, hashed, becomes a key for one extended transfer. Modern
    variants (silent OT, from learning parity with noise) generate correlated randomness for millions of
    OTs with almost no communication. OT extension is why two-party computation runs at millions of gates
    per second.

## Check yourself

??? question "1. Split 10 mod 17 among three people so all three are needed. The first two get the random shares 4 and 11. What does the third get?"

    $10 - 4 - 11 = -5 \equiv 12 \pmod{17}$. Check: $4 + 11 + 12 = 27 \equiv 10$.

??? question "2. With the shares (1, 6), (2, 16), (3, 9) mod 17, rebuild the secret from shares 2 and 3."

    $\lambda_2 = 3/(3 - 2) = 3$ and $\lambda_3 = 2/(2 - 3) = -2 \equiv 15$. Then $16 \cdot 3 + 9 \cdot 15 = 48 + 135 = 183 = 10 \cdot 17 + 13$, so 13.

??? question "3. Why can't a 3-of-5 Shamir scheme use the share x = 0?"

    $f(0)$ is the secret itself. That share would not be a share.

??? question "4. In the threshold example, signers 1 and 2 sign instead. What are their Lagrange weights mod 11, and do they rebuild 7?"

    $\lambda_1 = 2/(2 - 1) = 2$ and $\lambda_2 = 1/(1 - 2) = -1 \equiv 10$. Then $2 \cdot 10 + 10 \cdot 2 = 40 \equiv 7 \pmod{11}$. Yes.

??? question "5. Alice commits to her coin bit as SHA-256 of the bit alone. What goes wrong?"

    There are only two possible commitments, so Bob hashes 0 and 1 and compares: no hiding at all. She must add a
    long random nonce.

??? question "6. In the Pedersen example (p = 107, g = 4, h = 9), someone publishes C = 4^2 · 9^r. Can you tell m = 2 from C?"

    No. For every $m'$ from 0 to 52 there is some $r'$ that gives the same $C$, and $r$ was uniform, so every $m'$ is
    equally likely. That is perfect hiding.

??? question "7. In Schnorr's protocol mod 23, Alice (a = 9) reuses v = 8 and gets challenges 3 and 4. Recover a."

    $r_1 = 8 - 27 \equiv 3$ and $r_2 = 8 - 36 = -28 \equiv 5 \pmod{11}$. Then $a = (r_2 - r_1)/(c_1 - c_2) = 2/(-1) = -2 \equiv 9 \pmod{11}$.

??? question "8. Two parties hold additive shares mod 97 of x = 3 (shares 50, 50) and y = 4 (shares 90, 11). What are the shares of x + y, without any messages?"

    $50 + 90 = 140 \equiv 43$ and $50 + 11 = 61$. Check: $43 + 61 = 104 \equiv 7 = 3 + 4$.

??? question "9. In the OPRF, why must the client's r be random every time, and what would a fixed r leak?"

    With a fixed $r$, the same password always gives the same $B$, so the server can tell when two requests carry the
    same input, and if $r$ ever leaks it can test password guesses against old requests. A fresh $r$ makes every $B$ a
    uniformly random group element, unrelated to the input.

??? question "10. Paillier with n = 35: encrypt 2 with r = 2 and add it to the ciphertext 181 (which holds 13). What does decryption give?"

    $36^2 = 1296 \equiv 71$ and $2^{35} \equiv 18 \pmod{1225}$, so $E(2) = 71 \cdot 18 = 1278 \equiv 53$. Then $181 \cdot 53 = 9593 \equiv 1018$.
    Decrypting: $1018^{12} \bmod 1225$, then $L$ and $\mu$, gives $15 = 13 + 2$.

## What you learned

- **Secret sharing** splits a secret so $t$ shares rebuild it and fewer reveal
  nothing, unconditionally. **Threshold signatures** sign with the shares and
  never rebuild the key; FROST does it for Schnorr, while ECDSA needs heavy
  machinery and has had serious bugs.
- **Commitments** are sealed envelopes: hiding and binding, and never both
  unconditionally. Pedersen commitments add up, which hides amounts.
- **Zero-knowledge proofs** convince without teaching: soundness by extracting
  the secret from two answers, zero knowledge by simulation, non-interactive by
  Fiat-Shamir. SNARKs and STARKs scale this to whole computations.
- **MPC** computes on shares: additions free, multiplications with Beaver
  triples, or garbled circuits with oblivious transfer. It hides inputs, not
  what the output reveals.
- **OPRFs** apply a server's key to a blinded input (OPAQUE, Privacy Pass,
  breach checks); **VRFs** give verifiable, unchoosable randomness.
- **Homomorphic encryption** computes on ciphertexts: Paillier adds; lattice FHE
  adds and multiplies, managing noise by rescaling and bootstrapping, at a large
  but shrinking cost.

**This is the end of the book.** The appendices hold the reference material:
the [algorithm table](../index.md), one page per algorithm, the
[protocols](../protocols/index.md), and the
[world history of cryptography](../history/index.md).

## Further reading

- Adi Shamir, "How to Share a Secret", *Communications of the ACM* 22 (1979).
- Manuel Blum, "Coin Flipping by Telephone", CRYPTO '81.
- Shafi Goldwasser, Silvio Micali and Charles Rackoff, "The Knowledge Complexity
  of Interactive Proof Systems", STOC 1985; Jean-Jacques Quisquater et al., "How
  to Explain Zero-Knowledge Protocols to Your Children", CRYPTO '89.
- Andrew C. Yao, "How to Generate and Exchange Secrets", FOCS 1986; Oded
  Goldreich, Silvio Micali and Avi Wigderson, "How to Play Any Mental Game",
  STOC 1987.
- David Evans, Vladimir Kolesnikov and Mike Rosulek, *A Pragmatic Introduction
  to Secure Multi-Party Computation* (now publishers, 2018), free online.
- Justin Thaler, *Proofs, Arguments, and Zero-Knowledge* (2022), free online: the
  standard text on SNARKs and STARKs.
- Pascal Paillier, "Public-Key Cryptosystems Based on Composite Degree
  Residuosity Classes", EUROCRYPT '99; Craig Gentry, "Fully Homomorphic
  Encryption Using Ideal Lattices", STOC 2009.
- Chelsea Komlo and Ian Goldberg, "FROST: Flexible Round-Optimized Schnorr
  Threshold Signatures", SAC 2020, and RFC 9591.
- RFC 9497 (OPRFs), RFC 9381 (VRFs), RFC 8235 (Schnorr proofs).
- The reference pages: [Secret sharing](../11-advanced/Secret-Sharing.md),
  [Threshold signatures](../11-advanced/Threshold-Signatures.md),
  [Commitments](../11-advanced/Commitments.md),
  [Zero-knowledge proofs](../11-advanced/Zero-Knowledge.md),
  [MPC](../11-advanced/MPC.md), [OPRF](../11-advanced/OPRF.md),
  [VRF](../11-advanced/VRF.md) and
  [Homomorphic encryption](../11-advanced/Homomorphic-Encryption.md).
