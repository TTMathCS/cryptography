# 19. Ledgers: Bitcoin

*Every protocol so far had someone to trust at the bottom: a certificate
authority, a server that delivers messages, the operating system that holds a
disk key. Bitcoin set itself a stranger task: keep a ledger of who owns what
among people who trust no one, with no bank, no server and no identity, where
anyone may join or leave and some participants are actively dishonest. Its
answer combines three things this book has met separately, digital
signatures, hash chains and Merkle trees, with one new idea, proof of work,
which turns electricity into votes. Nothing on the chain is encrypted. The
cryptography proves who may spend a coin and that history was not rewritten,
to anyone who cares to check. In this chapter you will verify a real
transaction signature by hand and reproduce it with RFC 6979, check the
genesis block's proof of work and a Merkle root from 2009, mine a toy block,
sign with Taproot's Schnorr scheme against BIP-340's test vectors, recover a
private key from a repeated nonce as thieves did in 2013, and watch what a
20-minute light delay does to a blockchain shared with Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - the double-spend problem and the ideas that led to Bitcoin;
    - transactions, unspent outputs, scripts and addresses;
    - what a Bitcoin signature covers, verified on BIP-143's example;
    - transaction malleability and how SegWit removed it;
    - proof of work, the difficulty target, Merkle trees and the longest
      chain, coded;
    - Schnorr signatures and Taproot (BIP-340 to 342), coded;
    - how wallets lose keys: repeated nonces, weak randomness, brain
      wallets;
    - what blockchains do not solve: majority attacks, selfish mining,
      privacy;
    - why one chain cannot stretch from Earth to Mars.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (what
    protocols guarantee) and [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md)
    (ECDSA in a protocol); hash functions, elliptic curves and signatures
    from Chapters [9](../../book/09-Hash-Functions.md) and
    [15](../../book/15-Elliptic-Curves.md) of book 1.

    **Levels:** §19.1 and §19.2 are for beginners, §19.3 to §19.10 are
    intermediate, §19.11 is expert.

## 19.1 The double-spend problem

*Level: beginner.*

A digital coin is a string of bits, and bits can be copied. If Alice can
send the same coin to Bob and to Carol, it is not money. A bank solves this
by keeping the ledger: it sees both payments and refuses the second. Every
digital cash system before 2008 kept some such authority. David Chaum's
**blind signatures** (CRYPTO 1982) and his company DigiCash (1989) made
untraceable electronic cash, but a bank still checked each coin against a
list of spent ones.

The ingredients of a bankless system appeared one by one in the 1990s. Adam
Back's **Hashcash** (1997) made an email sender attach a small proof of
computation, a hash with leading zeros, to make spam expensive. Wei Dai's
**b-money** (1998) and Nick Szabo's **bit gold** sketched money created by
solving computational puzzles and recorded by a group of servers. What none
of them solved convincingly was agreement: how do thousands of strangers,
some dishonest, agree on a single order of transactions, so that only the
first of two conflicting payments counts?

On 31 October 2008 someone using the name Satoshi Nakamoto posted
"Bitcoin: A Peer-to-Peer Electronic Cash System" to a cryptography mailing
list. The answer: everyone keeps the full ledger; transactions are grouped
into **blocks**; each block contains the hash of the previous one, forming a
**chain**; and the right to add the next block goes to whoever first finds a
nonce that makes the block's hash small enough, a **proof of work**. Honest
nodes always extend the chain with the most work. Rewriting history means
redoing the work of every block since, faster than the honest majority adds
new ones.

!!! note "Life story: Bitcoin"
    **Born:** 31 October 2008 (the white paper) and 3 January 2009 (the
    genesis block, whose coinbase quotes that day's front page of *The
    Times*: "Chancellor on brink of second bailout for banks"), by the
    still-unidentified Satoshi Nakamoto · **Purpose:** electronic cash
    without a trusted third party · **Grew:** the first transaction between
    people, from Nakamoto to Hal Finney, sits in block 170 (12 January 2009);
    Nakamoto stopped communicating in 2011 · **Changed:** only by soft forks
    that every old node still accepts: strict signature encoding (2015),
    Segregated Witness (2017), Schnorr signatures and Taproot (2021) ·
    **Status:** running continuously since 2009, about one block every ten
    minutes; the design, if not the coin, has been copied thousands of times

## 19.2 Coins locked by scripts

*Level: beginner.*

Bitcoin does not keep account balances. It keeps a set of **unspent
transaction outputs** (UTXOs). Each output is an amount and a small program,
the **locking script**, saying what is needed to spend it. A transaction
consumes some outputs, by naming them (the hash of the transaction that made
each one and its position) and supplying data that satisfies their scripts,
and creates new outputs. The amounts in must cover the amounts out; the
difference is the fee for the miner.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Bitcoin transactions as a graph: transaction 1 has two outputs; transaction 2 spends output 1 of transaction 1 and an output of another transaction, supplying a signature and public key for each; it creates two new outputs, one to Bob and one as change; unspent outputs make up everyone's balance" fill="currentColor" font-size="12.5">
<rect x="20" y="30" width="170" height="110" rx="8" class="soft" stroke="currentColor"/>
<text x="105" y="52" text-anchor="middle" font-weight="bold">transaction 1</text>
<rect x="34" y="64" width="142" height="30" rx="4" stroke="currentColor" fill="none"/><text x="105" y="84" text-anchor="middle" font-size="11.5">out 0: 2 BTC → Dave</text>
<rect x="34" y="100" width="142" height="30" rx="4" class="soft-acc" stroke="currentColor"/><text x="105" y="120" text-anchor="middle" font-size="11.5">out 1: 6 BTC → key A</text>
<rect x="20" y="160" width="170" height="70" rx="8" class="soft" stroke="currentColor"/>
<text x="105" y="182" text-anchor="middle" font-weight="bold">transaction 0</text>
<rect x="34" y="192" width="142" height="30" rx="4" class="soft-acc" stroke="currentColor"/><text x="105" y="212" text-anchor="middle" font-size="11.5">out 0: 6.25 BTC → key A′</text>
<rect x="250" y="60" width="200" height="170" rx="8" class="soft" stroke="currentColor"/>
<text x="350" y="82" text-anchor="middle" font-weight="bold">transaction 2</text>
<rect x="264" y="94" width="172" height="40" rx="4" stroke="currentColor" fill="none"/><text x="350" y="110" text-anchor="middle" font-size="11">in: tx 1 out 1</text><text x="350" y="125" text-anchor="middle" font-size="11">+ signature, key A</text>
<rect x="264" y="140" width="172" height="40" rx="4" stroke="currentColor" fill="none"/><text x="350" y="156" text-anchor="middle" font-size="11">in: tx 0 out 0</text><text x="350" y="171" text-anchor="middle" font-size="11">+ signature by A′</text>
<text x="350" y="208" text-anchor="middle" font-size="11">fee = 12.25 − 3.3579 = 8.8921</text>
<line x1="178" y1="115" x2="262" y2="114" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="264,114 252,109 252,119" class="acc-fill"/>
<line x1="178" y1="207" x2="262" y2="162" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="264,161 251,161 256,171" class="acc-fill"/>
<rect x="486" y="80" width="146" height="34" rx="4" stroke="currentColor" fill="none"/><text x="559" y="102" text-anchor="middle" font-size="11.5">1.1234 BTC → Bob</text>
<rect x="486" y="130" width="146" height="34" rx="4" stroke="currentColor" fill="none"/><text x="559" y="152" text-anchor="middle" font-size="11.5">2.2345 BTC → Carol</text>
<line x1="452" y1="120" x2="486" y2="98" stroke="currentColor"/><line x1="452" y1="140" x2="486" y2="147" stroke="currentColor"/>
<text x="320" y="262" text-anchor="middle" font-size="12">A balance is the sum of unspent outputs a key can unlock; spending consumes outputs whole.</text>
</svg>
<figcaption>Figure 19.1. Transactions consume and create outputs. The amounts here are those of BIP-143's example, which you will verify in §19.3; its outputs add to much less than its inputs (a test case, not a real payment), and the miner keeps the rest as the fee.</figcaption>
</figure>

The scripting language is small and deliberately not Turing-complete. The
common locking scripts:

- **P2PK** (pay to public key): `<pubkey> OP_CHECKSIG`. The spender supplies
  a signature. Used in 2009, including by the genesis block.
- **P2PKH** (pay to public-key hash): `OP_DUP OP_HASH160 <20-byte hash>
  OP_EQUALVERIFY OP_CHECKSIG`. The spender supplies the public key and a
  signature; the script checks that the key hashes to the 20 bytes, then the
  signature. HASH160 is RIPEMD-160 of SHA-256. Addresses starting with `1`.
- **P2WPKH** (SegWit version 0, 2017): the same check, with the signature and
  key moved to a separate **witness** field. Addresses `bc1q…`.
- **P2TR** (Taproot, 2021): a 32-byte Schnorr public key that can also commit
  to a tree of alternative scripts. Addresses `bc1p…`.

An **address** is just a human-friendly encoding of a locking script: a
version byte, the hash or key, and a checksum, in Base58 (older) or bech32
(newer). The checksums are error-detecting codes, chosen to catch typing
mistakes, not cryptographic hashes.

## 19.3 What a signature covers

*Level: intermediate.*

A signature in a spending transaction must commit to the transaction: which
outputs are spent, which are created, how much each is worth. Otherwise a
relaying node could change the destination. What exactly is hashed and
signed is the **signature hash** (sighash). The last byte of each signature
says which parts it covers: `SIGHASH_ALL` (0x01), the usual case, covers all
inputs and outputs.

The original sighash algorithm had two flaws. Its cost grew quadratically
with the number of inputs, so a large transaction could take minutes to
verify. And it did not include the **amount** of the output being spent, so
a hardware wallet, which sees only the transaction it is asked to sign, could
not know the fee without being shown every previous transaction in full.
**BIP-143** (part of SegWit, 2017) fixed both: it hashes the outpoints, the
sequence numbers and the outputs once each, and includes the spent amount
directly.

### A worked example by hand: reading a DER signature

The witness of BIP-143's "native P2WPKH" example starts with this signature:

```text
30 44                      SEQUENCE, 68 bytes follow
   02 20  3609e17b…1cc44a     INTEGER r, 32 bytes
   02 20  573a954c…7eebee     INTEGER s, 32 bytes
01                         SIGHASH_ALL
```

An integer whose top bit is set gets a leading 00 byte in DER, so r and s
take 33 bytes about half the time; here neither does, and the whole thing is
71 bytes plus the sighash byte. Strict DER encoding has been a consensus rule
since BIP-66 (2015), after OpenSSL's parser was found to accept variants
that other code rejected, which could have split the network.

### Code it: verify a real transaction signature

The program parses BIP-143's unsigned example transaction, computes the
sighash for its second input following BIP-143 step by step, verifies the
ECDSA signature on secp256k1 written out from scratch, and then signs again
from the published private key with an RFC 6979 deterministic nonce (book 1
Chapter 15). RIPEMD-160 comes from OpenSSL through `hashlib`; some OpenSSL 3
builds leave it out.

```python
# A Bitcoin transaction signature, checked by hand: BIP-143's "Native P2WPKH"
# example. Compute the sighash, verify the ECDSA signature on secp256k1, and
# derive the address the coins were locked to.
import hashlib, hmac

p = 2**256 - 2**32 - 977                                 # secp256k1: y^2 = x^3 + 7
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
     0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)
def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: l = 3 * P[0] * P[0] * pow(2 * P[1], -1, p) % p
    else: l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)
def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R
def decompress(b):
    x = int.from_bytes(b[1:], "big")
    y = pow(x ** 3 + 7, (p + 1) // 4, p)
    return (x, y if y % 2 == b[0] % 2 else p - y)
def compress(P): return bytes([2 + P[1] % 2]) + P[0].to_bytes(32, "big")

sha256d = lambda b: hashlib.sha256(hashlib.sha256(b).digest()).digest()
h = bytes.fromhex

# The unsigned transaction: two inputs (outpoints), two outputs, lock time
tx = h("0100000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffff"
       "ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb2060000"
       "00001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe"
       "6a21b2d50ce2f0167faa815988ac11000000")
version, locktime = tx[:4], tx[-4:]
ins = [(tx[5 + 41 * i:41 + 41 * i], tx[42 + 41 * i:46 + 41 * i]) for i in range(2)]   # outpoint, sequence
outs = tx[88:-4]

# BIP-143 sighash for input 1, which spends 6 BTC locked to HASH160 of this key
pub = h("025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357")
key_hash = hashlib.new("ripemd160", hashlib.sha256(pub).digest()).digest()
print("HASH160 of the key:", key_hash.hex(), "(the output said 1d0f172a...)")
amount = (600_000_000).to_bytes(8, "little")
script_code = b"\x19\x76\xa9\x14" + key_hash + b"\x88\xac"     # OP_DUP OP_HASH160 <20> OP_EQUALVERIFY OP_CHECKSIG
preimage = (version + sha256d(ins[0][0] + ins[1][0]) + sha256d(ins[0][1] + ins[1][1])
            + ins[1][0] + script_code + amount + ins[1][1] + sha256d(outs) + locktime
            + (1).to_bytes(4, "little"))                       # SIGHASH_ALL
z = sha256d(preimage)
print("sighash:", z.hex())

# The DER signature from the witness: 30 len 02 len r 02 len s, then the sighash byte
sig = h("304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a"
        "0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01")
r = int.from_bytes(sig[4:4 + sig[3]], "big")
s = int.from_bytes(sig[6 + sig[3]:-1], "big")
e, w = int.from_bytes(z, "big"), pow(s, -1, n)
R = add(mul(e * w % n, G), mul(r * w % n, decompress(pub)))
print("ECDSA signature verifies:", R is not None and R[0] % n == r, "  low S:", s <= n // 2)

# The same signature again from the private key, with RFC 6979's deterministic nonce
d = int.from_bytes(h("619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9"), "big")
print("private key gives the public key:", compress(mul(d, G)) == pub)
def rfc6979_k(d, z):
    x, V, K = d.to_bytes(32, "big"), b"\x01" * 32, b"\x00" * 32
    zz = (int.from_bytes(z, "big") % n).to_bytes(32, "big")
    K = hmac.new(K, V + b"\x00" + x + zz, hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()
    K = hmac.new(K, V + b"\x01" + x + zz, hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()
    while True:
        V = hmac.new(K, V, hashlib.sha256).digest()
        k = int.from_bytes(V, "big")
        if 1 <= k < n: return k
        K = hmac.new(K, V + b"\x00", hashlib.sha256).digest(); V = hmac.new(K, V, hashlib.sha256).digest()
k = rfc6979_k(d, z)
r2 = mul(k, G)[0] % n
s2 = pow(k, -1, n) * (e + r2 * d) % n
s2 = min(s2, n - s2)                                     # Bitcoin keeps the low S
print("re-signed with RFC 6979, same r and s:", (r2, s2) == (r, s))
```

```text
HASH160 of the key: 1d0f172a0ecb48aee1be1f2687d2963ae33f71a1 (the output said 1d0f172a...)
sighash: c37af31116d1b27caf68aae9e3ac82f1477929014d5b917657d0eb49478cb670
ECDSA signature verifies: True   low S: True
private key gives the public key: True
re-signed with RFC 6979, same r and s: True
```

The re-signed signature is identical to BIP-143's, byte for byte: Bitcoin
Core derives its ECDSA nonces with RFC 6979, so the same key and sighash
always give the same signature.

## 19.4 Malleability and SegWit

*Level: intermediate.*

A transaction is identified by its **txid**, the double SHA-256 of its
serialization, signatures included. That created a problem. If $(r, s)$ is a
valid ECDSA signature, so is $(r, n - s)$: anyone relaying a transaction can
flip $s$ and get a different txid for the same, still valid, payment.
Different but equivalent encodings of the signature, or of the script that
carries it, have the same effect. This is **transaction malleability**. It
cannot steal coins, but software that tracked payments by txid could be
fooled into thinking a payment had failed and pay again.

In February 2014 the Mt. Gox exchange halted withdrawals and blamed
malleability for its losses; it soon declared bankruptcy, having lost about
850,000 bitcoins. Christian Decker and Roger Wattenhofer analyzed the
network's traffic ("Bitcoin Transaction Malleability and MtGox", ESORICS
2014) and found that malleated transactions could account for only a tiny
fraction of that. The losses had other causes; but malleability was real,
and it blocked a whole class of protocols that need to refer to a
transaction before it is signed.

The fixes came in layers: a relay policy that only **low S** values
($s \le n/2$) are standard, strict DER (BIP-66), and finally **Segregated
Witness** (BIP-141, activated August 2017), which moves signatures out of the
data hashed for the txid into a separate witness. A SegWit transaction's
txid cannot be changed by anyone but its signers. That made payment channels
such as the Lightning Network practical.

## 19.5 Proof of work and the chain

*Level: intermediate.*

A block is a list of transactions and an 80-byte **header**:

| Field | Bytes | Meaning |
|---|---|---|
| version | 4 | rules the block follows |
| previous block hash | 32 | the chain link |
| Merkle root | 32 | commits to every transaction in the block |
| time | 4 | seconds since 1970, roughly |
| bits | 4 | the difficulty target, compressed |
| nonce | 4 | the miners' search space |

A block is valid only if the double SHA-256 of its header, read as a
little-endian number, is at most the **target**. Miners try nonce after nonce
(and, when the 4-byte nonce runs out, change other fields such as a counter
in the first transaction). Every 2,016 blocks, each node recomputes the
target so that, if the hash power stayed the same, the next 2,016 blocks
would take two weeks: one block every ten minutes on average.

### A worked example by hand: the target

The `bits` field is a floating-point number in base 256: one byte of
exponent, three of mantissa. The genesis block's bits are 0x1d00ffff:

$$
\mathit{target} = \texttt{0x00ffff} \times 256^{\,\texttt{0x1d} - 3} = \texttt{0xffff} \times 2^{208},
$$

which in 64 hex digits is eight zeros, then `ffff`, then zeros. A random hash
is below it with probability about $2^{-32}$, so the genesis block needed
about four billion tries on average. (Bitcoin reports difficulty as this
original target divided by the current one.)

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three block headers chained by the hash of the previous header; one header's Merkle root sits at the top of a binary tree of hashes whose leaves are the transaction ids of four transactions" fill="currentColor" font-size="12">
<g>
<rect x="20" y="30" width="170" height="90" rx="6" class="soft" stroke="currentColor"/><text x="105" y="50" text-anchor="middle" font-weight="bold">block 169</text>
<text x="34" y="72" font-size="11.5">prev: …</text><text x="34" y="90" font-size="11.5">Merkle root</text><text x="34" y="108" font-size="11.5">bits · nonce</text>
<rect x="235" y="30" width="170" height="90" rx="6" class="soft-acc" stroke="currentColor"/><text x="320" y="50" text-anchor="middle" font-weight="bold">block 170</text>
<text x="249" y="72" font-size="11.5">prev: hash(169)</text><text x="249" y="90" font-size="11.5">Merkle root 7dac2c56…</text><text x="249" y="108" font-size="11.5">bits · nonce</text>
<rect x="450" y="30" width="170" height="90" rx="6" class="soft" stroke="currentColor"/><text x="535" y="50" text-anchor="middle" font-weight="bold">block 171</text>
<text x="464" y="72" font-size="11.5">prev: hash(170)</text><text x="464" y="90" font-size="11.5">Merkle root</text><text x="464" y="108" font-size="11.5">bits · nonce</text>
<line x1="192" y1="68" x2="231" y2="68" stroke="currentColor" stroke-width="1.5"/><polygon points="233,68 221,63 221,73"/>
<line x1="407" y1="68" x2="446" y2="68" stroke="currentColor" stroke-width="1.5"/><polygon points="448,68 436,63 436,73"/>
</g>
<line x1="320" y1="122" x2="320" y2="150" stroke="currentColor" class="acc"/>
<rect x="250" y="150" width="140" height="28" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/><text x="320" y="169" text-anchor="middle">H(H12 ‖ H34)</text>
<line x1="290" y1="180" x2="200" y2="206" stroke="currentColor"/><line x1="350" y1="180" x2="440" y2="206" stroke="currentColor"/>
<rect x="140" y="206" width="120" height="28" rx="4" stroke="currentColor" fill="none"/><text x="200" y="225" text-anchor="middle">H12 = H(t1 ‖ t2)</text>
<rect x="380" y="206" width="120" height="28" rx="4" stroke="currentColor" fill="none"/><text x="440" y="225" text-anchor="middle">H34 = H(t3 ‖ t4)</text>
<line x1="180" y1="236" x2="140" y2="258" stroke="currentColor"/><line x1="220" y1="236" x2="260" y2="258" stroke="currentColor"/>
<line x1="420" y1="236" x2="380" y2="258" stroke="currentColor"/><line x1="460" y1="236" x2="500" y2="258" stroke="currentColor"/>
<rect x="105" y="258" width="70" height="26" rx="4" class="soft" stroke="currentColor"/><text x="140" y="276" text-anchor="middle">txid 1</text>
<rect x="225" y="258" width="70" height="26" rx="4" class="soft" stroke="currentColor"/><text x="260" y="276" text-anchor="middle">txid 2</text>
<rect x="345" y="258" width="70" height="26" rx="4" class="soft" stroke="currentColor"/><text x="380" y="276" text-anchor="middle">txid 3</text>
<rect x="465" y="258" width="70" height="26" rx="4" class="soft" stroke="currentColor"/><text x="500" y="276" text-anchor="middle">txid 4</text>
<text x="20" y="160" font-size="11.5">H = SHA-256 twice</text>
<text x="20" y="178" font-size="11.5">(block 170 itself</text>
<text x="20" y="196" font-size="11.5">has only two txids)</text>
</svg>
<figcaption>Figure 19.2. The chain and the Merkle tree. Changing any transaction changes its txid, the Merkle root, the block hash and every later block's "previous" field.</figcaption>
</figure>

**Merkle trees** let a block commit to thousands of transactions with one
32-byte root, and let a light client check that a transaction is in a block
with a path of $\log_2 n$ hashes instead of the whole block. Bitcoin's tree
duplicates the last hash at any level with an odd count. That shortcut had a
cost: a block with a duplicated pair of transactions has the same root as one
without, which let an attacker in 2012 (CVE-2012-2459) make nodes reject a
valid block as invalid; nodes now detect duplicates explicitly.

### Code it: blocks, Merkle roots and mining

The program checks the genesis block's proof of work, computes the Merkle
root of block 170 from its two transaction IDs (the second is Nakamoto's
payment to Hal Finney), and mines a toy block: the genesis header with a new
nonce, until the hash has 20 leading zero bits.

```python
# Blocks: the genesis block's proof of work, a Merkle root, and mining in
# miniature. Uses sha256d and h from above.
def target(bits):                                        # 1-byte exponent, 3-byte mantissa
    return (bits & 0x7fffff) << 8 * ((bits >> 24) - 3)

genesis = h("01000000" + "00" * 32                       # version 1, no previous block
            + "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a"   # Merkle root
            + "29ab5f49" + "ffff001d" + "1dac2b7c")       # time, bits, nonce, little-endian
bits = int.from_bytes(genesis[72:76], "little")
bh = sha256d(genesis)
print("genesis hash:", bh[::-1].hex())
print("at most the target:", int.from_bytes(bh, "little") <= target(bits),
      "  time:", int.from_bytes(genesis[68:72], "little"), "= 3 January 2009, 18:15 UTC")

def merkle_root(txids):                                  # txids as shown (big-endian hex)
    level = [h(t)[::-1] for t in txids]
    while len(level) > 1:
        if len(level) % 2: level.append(level[-1])       # an odd one out pairs with itself
        level = [sha256d(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
    return level[0][::-1].hex()
block170 = ["b1fea52486ce0c62bb442b530a3f0132b826c74e473d1f2c220bfa78111c5082",   # coinbase
            "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16"]   # Satoshi to Hal Finney
print("block 170 Merkle root:", merkle_root(block170))

# Mining in miniature: find a nonce that gives 20 leading zero bits
header = genesis[:76]
for nonce in range(10**7):
    hh = sha256d(header + nonce.to_bytes(4, "little"))
    if int.from_bytes(hh, "little") >> 236 == 0:
        print(f"nonce {nonce:,} gives", hh[::-1].hex()[:16] + "...", "after", nonce + 1, "tries")
        break
print("expected tries for 20 zero bits: 2^20 =", f"{2**20:,}")
print("expected tries at the difficulty of mid-2025: about 2^79 =", f"{2**79:.2e}")
```

```text
genesis hash: 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f
at most the target: True   time: 1231006505 = 3 January 2009, 18:15 UTC
block 170 Merkle root: 7dac2c5666815c17a3b36427de37bb9d2e2c5ccec3f8633eb91a4205cb4c10ff
nonce 1,085,914 gives 0000073e55b84200... after 1085915 tries
expected tries for 20 zero bits: 2^20 = 1,048,576
expected tries at the difficulty of mid-2025: about 2^79 = 6.04e+23
```

The toy target took about a million tries, as expected. The real network,
in 2025, needed around $2^{79}$ tries per block, and found one every ten
minutes: about $10^{21}$ hashes per second, from specialized chips.

**The longest chain.** Nodes follow the valid chain with the most total
work. If two miners find blocks at about the same moment, the network
briefly has two tips; the next block found decides, and the losing block is
**orphaned**, its transactions returned to the pool. A payment in a block
with $k$ blocks on top is reversed only if an attacker outpaces the honest
network by $k$ blocks. Nakamoto's white paper computed the probability: for
an attacker with fraction $q$ of the hash power it falls roughly like
$(q/(1-q))^k$, which is why six confirmations (an hour) became the custom for
large payments.

## 19.6 Schnorr and Taproot

*Level: intermediate.*

When Bitcoin was designed, Schnorr signatures (Claus Schnorr, 1989) were
still patented, and ECDSA was the standard choice. Schnorr's patent expired
in 2008. **BIP-340** (Pieter Wuille, Jonas Nick and Tim Ruffing), activated
with Taproot in November 2021, brought them to Bitcoin:

$$
\begin{aligned}
R &= kG,\qquad e = H_{\text{challenge}}(R_x \,\|\, P_x \,\|\, m),\\
s &= k + e\,d \bmod n,\qquad \text{signature} = (R_x, s).
\end{aligned}
$$

Verification checks $sG = R + eP$. The design choices are visible in BIP-340:

- **x-only keys.** Public keys are 32 bytes, the x coordinate; the point with
  even y is meant. Signers whose key has odd y negate their secret.
- **Tagged hashes.** Each use hashes with $\mathrm{SHA256}(\mathit{tag})$ twice
  in front, so a hash computed for one purpose can never be valid for
  another.
- **Deterministic nonces with optional randomness.** The nonce is a hash of
  the secret key (masked with fresh randomness if available), the public key
  and the message, so a broken random generator cannot repeat it for
  different messages.
- **Linearity.** Schnorr signatures add: keys $P_1 + P_2$ and suitable nonces
  give one signature for the sum. **MuSig2** (BIP-327) lets several people
  produce one ordinary-looking signature for a combined key, so a 2-of-2
  wallet looks like any other on chain. Linearity also allows **batch
  verification** of many signatures at once.

**Taproot** (BIP-341) builds on it. An output is a single key
$Q = P + t\,G$, where $t$ is a tagged hash of an internal key $P$ and the
root of a Merkle tree of alternative scripts. Usually the owners just sign
with $Q$ (the "key path"): the chain sees one key and one 64-byte signature,
indistinguishable from any other payment. If they cannot, they reveal $P$,
one script from the tree and its Merkle path (the "script path"); the other
scripts stay hidden.

### Code it: BIP-340 signatures, and a stolen key

The program signs and verifies BIP-340's first two test vectors. Then it
repeats what thieves did in 2013, when a flaw in Android's `SecureRandom`
made Bitcoin wallets on Android phones reuse ECDSA nonces: two signatures
with the same $k$ show the same $r$ on the public chain, and two lines of
algebra give the private key.

```python
# Taproot's Schnorr signatures (BIP-340), checked against the BIP's test
# vectors, and the 2013 Android theft: two ECDSA signatures with one nonce.
# Uses the secp256k1 code (add, mul, G, n, p) and h from above.
def tagged(tag, data):
    t = hashlib.sha256(tag.encode()).digest()
    return hashlib.sha256(t + t + data).digest()
def lift_x(x):                                           # the point with this x and even y
    y = pow(x ** 3 + 7, (p + 1) // 4, p)
    return (x, y if y % 2 == 0 else p - y)
num = lambda b: int.from_bytes(b, "big")
b32 = lambda i: i.to_bytes(32, "big")

def schnorr_sign(sk, msg, aux):
    P = mul(num(sk), G)
    d = num(sk) if P[1] % 2 == 0 else n - num(sk)        # x-only keys: use the even-y twin
    t = b32(d ^ num(tagged("BIP0340/aux", aux)))
    k = num(tagged("BIP0340/nonce", t + b32(P[0]) + msg)) % n
    R = mul(k, G)
    k = k if R[1] % 2 == 0 else n - k
    e = num(tagged("BIP0340/challenge", b32(R[0]) + b32(P[0]) + msg)) % n
    return b32(R[0]) + b32((k + e * d) % n)
def schnorr_verify(pk, msg, sig):
    P, r, s = lift_x(num(pk)), num(sig[:32]), num(sig[32:])
    e = num(tagged("BIP0340/challenge", sig[:32] + pk + msg)) % n
    R = add(mul(s, G), mul(n - e, P))                    # R = sG - eP
    return R is not None and R[1] % 2 == 0 and R[0] == r

vectors = [  # BIP-340 test vectors 0 and 1: secret key, public key, aux_rand, message, signature
    ("00" * 31 + "03", "F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9", "00" * 32, "00" * 32,
     "E907831F80848D1069A5371B402410364BDF1C5F8307B0084C55F1CE2DCA821525F66A4A85EA8B71E482A74F382D2CE5EBEEE8FDB2172F477DF4900D310536C0"),
    ("B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEF",
     "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659", "00" * 31 + "01",
     "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89",
     "6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0A")]
for i, (sk, pk, aux, msg, sig) in enumerate(vectors):
    mine = schnorr_sign(h(sk), h(msg), h(aux))
    print(f"BIP-340 vector {i}: signature matches {mine == h(sig)}, verifies {schnorr_verify(h(pk), h(msg), mine)}")

# The 2013 Android bug: a broken random generator repeated ECDSA nonces.
d = num(hashlib.sha256(b"a wallet on a phone").digest()) % n
k = num(hashlib.sha256(b"the same 'random' nonce, twice").digest()) % n
def ecdsa(z, k): r = mul(k, G)[0] % n; return r, pow(k, -1, n) * (z + r * d) % n
z1, z2 = num(hashlib.sha256(b"pay 1 BTC to Bob").digest()), num(hashlib.sha256(b"pay 2 BTC to Carol").digest())
(r1, s1), (r2, s2) = ecdsa(z1, k), ecdsa(z2, k)
print("both signatures show the same r:", r1 == r2)
k_found = (z1 - z2) * pow(s1 - s2, -1, n) % n           # s1 - s2 = (z1 - z2) / k
d_found = (s1 * k_found - z1) * pow(r1, -1, n) % n      # then d from either signature
print("private key recovered from the chain alone:", d_found == d)
```

```text
BIP-340 vector 0: signature matches True, verifies True
BIP-340 vector 1: signature matches True, verifies True
both signatures show the same r: True
private key recovered from the chain alone: True
```

From $s_1 = k^{-1}(z_1 + r d)$ and $s_2 = k^{-1}(z_2 + r d)$, subtracting
gives $k = (z_1 - z_2)/(s_1 - s_2)$, and then $d = (s_1 k - z_1)/r$. The
[Attacks on signatures and nonces](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
chapter of the Cryptanalysis book takes this much further: even a few
biased bits of nonce, over enough signatures, reveal the key through lattice
reduction.

## 19.7 Break it: how keys are lost

*Level: intermediate.*

The cryptography of Bitcoin has held. The coins people lost went through
the keys.

- **Bad randomness.** In August 2013 the Android `SecureRandom` bug led to
  repeated nonces and stolen coins from several wallet apps; the
  [Random numbers gone wrong](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)
  chapter of the Cryptanalysis book tells the story. In December 2014 a bug
  in the blockchain.info web wallet produced repeated nonces too.
  Researchers scanning the chain have found hundreds of keys exposed by
  repeated $r$ values.
- **Brain wallets.** Some users derived their key from a passphrase with
  one SHA-256. Attackers hash dictionaries, song lyrics and quotations
  continuously and sweep any matching address within seconds of a deposit;
  Ryan Castellucci's talk at DEF CON 2015 showed how many such wallets were
  emptied.
- **Exchanges and custody.** Most large losses were not cryptographic at
  all: compromised servers, stolen hot-wallet keys, insiders. Mt. Gox
  (2014) is the best known.
- **The wrong thing signed.** Hardware wallets that trusted the host's word
  for input amounts could be tricked into paying huge fees, which BIP-143's
  inclusion of amounts addresses; Taproot's sighash goes further and
  commits to all spent amounts and scripts.

### Fix it

Deterministic nonces (RFC 6979 for ECDSA, BIP-340's construction for
Schnorr), keys generated from a high-entropy seed (BIP-39's 12 or 24 words
carry 128 or 256 bits, stretched by PBKDF2 with 2,048 rounds of HMAC-SHA512),
**hierarchical deterministic** derivation (BIP-32, HMAC-SHA512 from one seed
to a tree of keys, so one backup covers every future address), hardware
wallets that show the destination and amount on their own screen, and
multisignature or MuSig2 custody so that no single device can spend.

## 19.8 What a blockchain does not solve

*Level: intermediate.*

**Majority attacks.** Proof of work gives security only as long as honest
miners have most of the hash power. Smaller coins that share Bitcoin's design
but have little hash power have been attacked repeatedly: Bitcoin Gold in
2018, Ethereum Classic in 2019 and 2020, with attackers renting hash power to
reverse deposits on exchanges.

**Selfish mining.** Ittay Eyal and Emin Gün Sirer showed (Financial
Cryptography 2014) that a miner who keeps found blocks secret and releases
them strategically can earn more than its share with less than half the
power, in some network conditions with about a third. The incentive
compatibility that the white paper assumed is not unconditional.

**Privacy.** Bitcoin is pseudonymous, not anonymous. Every transaction is
public forever, and heuristics such as "inputs spent together belong to one
owner" link addresses into wallets. Sarah Meiklejohn and colleagues ("A
Fistful of Bitcoins", IMC 2013) clustered the chain and followed coins to
exchanges; companies now do this commercially for law enforcement. Privacy
coins use ring signatures or zero-knowledge proofs, a subject for the
Advanced protocols and privacy book.

**Consensus theory, smart contracts and other ledgers.** Proof-of-stake,
Byzantine fault-tolerant consensus, Ethereum's general-purpose contracts and
their spectacular failures are also for that book. This chapter stays with
the cryptographic core.

## 19.9 Mars: a chain across 20 minutes

*Level: intermediate.*

Suppose Arcadia City wants to use Bitcoin. Sending a transaction to Earth and
waiting for confirmations is slow but possible: a payment confirmed in six
Earth blocks is final on Mars about 20 minutes after it is final on Earth.
The interesting question is mining. Could miners on Mars take part?

### Code it: mining with a light delay

The simulation gives Mars 10 percent of the hash power. Blocks are found at
random, every ten minutes on average, and each side mines on the longest
chain it has heard of. Blocks cross between the planets after a delay: two
seconds (as if Mars were next door) or twenty minutes.

```python
# Mars: one blockchain across a 20-minute light delay. Miners on Mars have 10%
# of the hash power; blocks come every 10 minutes on average. Each side mines
# on the longest chain it has heard of. How many Mars blocks survive?
import heapq, random

def simulate(delay, mars_share=0.10, blocks=20000, seed=1):
    rng = random.Random(seed)
    parent, height, miner = {0: None}, {0: 0}, {0: "genesis"}
    tip = {"earth": 0, "mars": 0}                       # the chain each side builds on
    events, t, next_id = [], 0.0, 1
    for _ in range(blocks):
        t += rng.expovariate(1 / 600)                   # the next block, anywhere
        while events and events[0][0] <= t:             # deliver blocks that have arrived
            _, b, side = heapq.heappop(events)
            if height[b] > height[tip[side]]: tip[side] = b
        side = "mars" if rng.random() < mars_share else "earth"
        b, next_id = next_id, next_id + 1
        parent[b], height[b], miner[b] = tip[side], height[tip[side]] + 1, side
        tip[side] = b
        heapq.heappush(events, (t + delay, b, "earth" if side == "mars" else "mars"))
    best = max(tip.values(), key=lambda b: height[b])
    main = []
    while best: main.append(miner[best]); best = parent[best]
    found = sum(1 for m in miner.values() if m == "mars")
    kept = main.count("mars")
    return found, kept, len(main)

for name, delay in [("Mars miners 2 seconds away", 2), ("Mars miners 20 minutes away", 1200)]:
    found, kept, length = simulate(delay)
    print(f"{name}: Mars found {found} blocks, {kept} are in the final chain "
          f"({kept / found:.0%}); Mars share of the chain {kept / length:.1%}")
```

```text
Mars miners 2 seconds away: Mars found 2112 blocks, 2099 are in the final chain (99%); Mars share of the chain 10.5%
Mars miners 20 minutes away: Mars found 2112 blocks, 159 are in the final chain (8%); Mars share of the chain 0.9%
```

With a short delay, Mars gets its fair share. With a 20-minute delay, a Mars
block reaches Earth long after Earth has usually found one or two blocks of
its own; Earth's chain is longer, Mars switches to it, and the Mars block is
orphaned. Only 8 percent of Mars's blocks survive. Worse, while Mars mines on
a stale tip its hash power is wasted, which makes the whole system weaker
against an attacker on Earth.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Timeline of blocks on Earth and Mars with a 20-minute delay: a Mars block reaches Earth after Earth has already added two blocks, so the Mars block is orphaned and Mars switches to Earth's longer chain" fill="currentColor" font-size="12">
<text x="20" y="54" font-weight="bold">Earth</text>
<text x="20" y="164" font-weight="bold">Mars</text>
<line x1="80" y1="50" x2="620" y2="50" stroke="currentColor" opacity="0.4"/>
<line x1="80" y1="160" x2="620" y2="160" stroke="currentColor" opacity="0.4"/>
<rect x="100" y="36" width="44" height="28" rx="4" class="soft" stroke="currentColor"/><text x="122" y="55" text-anchor="middle">100</text>
<rect x="260" y="36" width="44" height="28" rx="4" class="soft" stroke="currentColor"/><text x="282" y="55" text-anchor="middle">101</text>
<rect x="390" y="36" width="44" height="28" rx="4" class="soft" stroke="currentColor"/><text x="412" y="55" text-anchor="middle">102</text>
<rect x="200" y="146" width="44" height="28" rx="4" class="acc-fill" fill-opacity="0.3" stroke="currentColor"/><text x="222" y="165" text-anchor="middle">101′</text>
<line x1="144" y1="64" x2="196" y2="146" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="244" y1="160" x2="452" y2="66" stroke="currentColor" class="acc"/><polygon points="454,65 441,66 447,76" class="acc-fill"/>
<text x="330" y="132" font-size="11.5" class="acc-fill">arrives 20 min later</text>
<line x1="434" y1="64" x2="560" y2="146" stroke="currentColor" stroke-dasharray="4 3"/>
<rect x="560" y="146" width="60" height="28" rx="4" class="soft" stroke="currentColor"/><text x="590" y="165" text-anchor="middle" font-size="11">101, 102</text>
<text x="520" y="84" font-size="11.5">Earth is at 102:</text>
<text x="520" y="100" font-size="11.5">101′ is orphaned</text>
<text x="320" y="210" text-anchor="middle" font-size="12">Delays comparable to the block interval turn honest Mars blocks into orphans.</text>
</svg>
<figcaption>Figure 19.3. One chain, two planets. Nakamoto consensus assumes that blocks spread much faster than they are found.</figcaption>
</figure>

The formal analyses of §19.11 say exactly this: Nakamoto consensus is secure
only when the network delay is small compared with the block interval. A
chain shared between planets would need blocks every few hours, or a
separate Mars chain with its own miners, linked to Earth's by protocols that
tolerate delay. Payment channels fit well: two parties lock funds on chain
once and then exchange signed updates directly; their timeouts are measured
in blocks, hours to days, far longer than a light delay. For everyday
payments inside Arcadia City, a local system with known operators, like the
banks Bitcoin set out to replace, would serve far better than any global
chain.

## 19.10 In the real world

*Level: intermediate.*

| Use | Algorithm | Specification |
|---|---|---|
| Legacy and SegWit v0 signatures | ECDSA on secp256k1, DER, low S, RFC 6979 nonces in Bitcoin Core | SEC 2, BIP-66, BIP-146 |
| Taproot signatures | Schnorr, 64 bytes, x-only keys | BIP-340 to 342 |
| Transaction IDs, blocks, proof of work, Merkle trees | SHA-256 applied twice | white paper, BIP-141 |
| Addresses | HASH160 (RIPEMD-160 of SHA-256), Base58Check, bech32, bech32m | BIP-13, 173, 350 |
| Wallet keys | HMAC-SHA512 tree from a seed; PBKDF2-HMAC-SHA512 from words | BIP-32, BIP-39 |
| Node-to-node transport | X25519-like ECDH on secp256k1 (ElligatorSwift), ChaCha20-Poly1305 | BIP-324 (default since 2024) |

**Encrypted transport.** Until 2024 Bitcoin nodes talked in plain text, so
anyone on the path could see which transactions a node announced first, a
strong hint of their origin. BIP-324, on by default since Bitcoin Core 27.0
(April 2024), encrypts connections with keys that look like random bytes; it
does not authenticate peers, so an active man in the middle is still
possible, but passive observation is not.

**Post-quantum.** Shor's algorithm would recover a private key from any
public key that has appeared on chain: in old P2PK outputs, in every Taproot
output, and in any address that has spent once and still holds coins. Hashes
lose only to Grover's square-root speedup. Two draft proposals, BIP-360 (an
output type without a public key in it) and BIP-361 (a plan to phase out
vulnerable spends), were under discussion in 2026, with no post-quantum
signature yet chosen. The difficulty is political as well as technical:
coins whose owners never move them, Nakamoto's among them, cannot migrate,
and freezing them would change what "ownership" has meant on Bitcoin. The
[KEMs and signatures](../post-quantum/03-KEMs-and-Signatures.md) chapter of
the Post-quantum book explains the candidate signatures and their sizes,
which matter a great deal when every byte is paid for in fees.

## 19.11 Going deeper

*Level: expert.*

**What has been proved.** Juan Garay, Aggelos Kiayias and Nikos Leonardos
("The Bitcoin Backbone Protocol", EUROCRYPT 2015) gave the first formal
model of Nakamoto consensus in a synchronous network and proved two
properties, common prefix (honest nodes agree on all but the last few blocks)
and chain quality (enough blocks come from honest miners), under an honest
majority. Rafael Pass, Lior Seeman and abhi shelat ("Analysis of the
Blockchain Protocol in Asynchronous Networks", EUROCRYPT 2017) added a network
delay $\Delta$ and showed that security needs the block rate to be small
compared with $1/\Delta$; as $\Delta$ approaches the block interval, the
fraction of hash power an attacker needs drops well below one half. The Mars
simulation is that theorem in miniature.

**Merkle proofs and light clients.** Nakamoto's "simplified payment
verification" lets a phone check a transaction with block headers and a
Merkle path, trusting that the chain with most work is valid. Header-only
clients cannot detect an invalid block that miners accept, and they reveal
their addresses to the servers they ask; compact block filters (BIP-157 and
158) improve the second problem.

**Schnorr's security.** BIP-340 relies on the hardness of discrete
logarithms on secp256k1 and on SHA-256 behaving like a random oracle. Its
security proof in that model (and the analysis of MuSig2, by Nick, Ruffing
and Seurin, CRYPTO 2021) shows that multi-signatures are subtle: naive key
aggregation lets one participant cancel the others' keys ("rogue key"
attacks), which MuSig2's key coefficients prevent.

## Check yourself

??? question "1. What is the double-spend problem, and how does Bitcoin solve it?"
    Digital coins can be copied, so something must decide which of two
    conflicting payments counts. Bitcoin orders all transactions in a single
    chain of blocks; the first spend in the chain with the most work counts,
    and rewriting it would require redoing that work.

??? question "2. What does a P2PKH output require from the spender?"
    A public key whose HASH160 equals the 20 bytes in the script, and a valid
    signature with that key over the spending transaction's sighash.

??? question "3. Why did BIP-143 add the spent amount to the sighash?"
    So that a signer, such as a hardware wallet, commits to the amounts and
    can compute the fee without seeing the previous transactions; and to
    make sighash computation linear instead of quadratic.

??? question "4. What is transaction malleability, and how did SegWit remove it?"
    Anyone could change a transaction's encoding (for example s into n − s)
    without invalidating it, changing its txid. SegWit moves signatures into
    a witness that is not part of the data hashed for the txid.

??? question "5. Decode bits = 0x1d00ffff into a target."
    0x00ffff × 256^(0x1d − 3) = 0xffff × 2^208: eight leading zero hex digits,
    then ffff, then zeros.

??? question "6. Why does Bitcoin's Merkle tree have a duplicate-transaction weakness?"
    It duplicates the last hash at a level with an odd count, so a list with a
    duplicated final pair has the same root as one without. Nodes must check
    for duplicates explicitly (CVE-2012-2459).

??? question "7. How does a repeated ECDSA nonce reveal the private key?"
    Two signatures with the same k share r. Subtracting the two signing
    equations gives k = (z1 − z2)/(s1 − s2), and then d = (s1 k − z1)/r.

??? question "8. What does Taproot's key path hide?"
    Whether the output had any alternative scripts at all: a key-path spend
    is one key and one signature, like any single-signature payment, even if
    the key is a MuSig2 aggregate.

??? question "9. Why are Bitcoin addresses pseudonymous rather than anonymous?"
    All transactions are public and permanent; heuristics such as common
    input ownership link addresses together and to exchanges that know their
    customers.

??? question "10. Why can't Mars miners usefully share Bitcoin's chain?"
    Their blocks reach Earth a light delay later, by which time Earth has
    usually extended its chain, so most Mars blocks are orphaned and their
    work wasted. Nakamoto consensus needs delays much smaller than the block
    interval.

## What you learned

- Bitcoin keeps a public set of unspent outputs, locked by small scripts and
  spent with signatures; nothing is encrypted.
- The sighash defines what a signature covers. You computed BIP-143's sighash,
  verified its ECDSA signature on secp256k1 and reproduced it with RFC 6979.
- Malleable signatures changed txids until SegWit separated witnesses.
- Proof of work, the difficulty target, Merkle trees and the most-work chain
  give an order everyone can check. You verified the genesis block, block
  170's Merkle root, and mined a toy block.
- Schnorr signatures (BIP-340) are linear, enabling MuSig2 and Taproot's
  hidden scripts. You matched BIP-340's vectors and recovered a key from a
  repeated ECDSA nonce.
- Coins are lost through keys and custody, not broken cryptography; majority
  attacks, selfish mining and chain analysis are the system's limits.
- A chain spanning Earth and Mars fails because consensus needs delays much
  shorter than the block interval.

## Further reading

- Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System", 2008.
- BIP-143, BIP-340, BIP-341 and BIP-342, github.com/bitcoin/bips, with their
  test vectors.
- Arvind Narayanan, Joseph Bonneau, Edward Felten, Andrew Miller and Steven
  Goldfeder, *Bitcoin and Cryptocurrency Technologies*, Princeton University
  Press, 2016.
- Juan Garay, Aggelos Kiayias and Nikos Leonardos, "The Bitcoin Backbone
  Protocol: Analysis and Applications", EUROCRYPT 2015.
- Rafael Pass, Lior Seeman and abhi shelat, "Analysis of the Blockchain
  Protocol in Asynchronous Networks", EUROCRYPT 2017.
- Ittay Eyal and Emin Gün Sirer, "Majority is not Enough: Bitcoin Mining is
  Vulnerable", Financial Cryptography 2014.
- Sarah Meiklejohn et al., "A Fistful of Bitcoins: Characterizing Payments
  Among Men with No Names", IMC 2013.
- Christian Decker and Roger Wattenhofer, "Bitcoin Transaction Malleability
  and MtGox", ESORICS 2014.
- Jonas Nick, Tim Ruffing and Yannick Seurin, "MuSig2: Simple Two-Round
  Schnorr Multi-Signatures", CRYPTO 2021.
