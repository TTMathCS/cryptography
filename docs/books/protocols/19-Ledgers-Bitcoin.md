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
20-minute light delay does to a blockchain shared with Mars. You will also
malleate a real transaction and watch SegWit keep its ID fixed, build and
spend a Taproot output both ways against BIP-341's test vector, derive
wallet keys from twelve words against the BIP-32 and BIP-39 vectors, and
check Lightning's revocation keys against BOLT 3 and trace a payment
across two channels.*

!!! abstract "In this chapter"
    **You will learn:**

    - the double-spend problem and the ideas that led to Bitcoin;
    - transactions, unspent outputs, scripts and addresses;
    - what a Bitcoin signature covers, verified on BIP-143's example;
    - transaction malleability and how SegWit removed it;
    - proof of work, the difficulty target, Merkle trees and the longest
      chain, coded;
    - Schnorr signatures and Taproot (BIP-340 to 342), coded, and a
      Taproot output spent by its key path and by its script path;
    - wallet seeds: BIP-39 words and BIP-32 key trees, coded;
    - Lightning: commitments, revocation keys and HTLCs, with a payment
      routed across two channels;
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

    **Levels:** §19.1 and §19.2 are for beginners; §19.3 to §19.6 and
    §19.8 to §19.14 are intermediate; §19.7 (Taproot spent in full) and
    §19.15 are expert.

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
<g stroke="currentColor"><rect x="20" y="30" width="170" height="110" rx="8" class="soft"/><rect x="34" y="64" width="142" height="30" rx="4" fill="none"/><rect x="34" y="100" width="142" height="30" rx="4" class="soft-acc"/><rect x="20" y="160" width="170" height="70" rx="8" class="soft"/><rect x="34" y="192" width="142" height="30" rx="4" class="soft-acc"/><rect x="250" y="60" width="200" height="170" rx="8" class="soft"/><rect x="264" y="94" width="172" height="40" rx="4" fill="none"/><rect x="264" y="140" width="172" height="40" rx="4" fill="none"/><line x1="178" y1="115" x2="262" y2="114" stroke-width="1.5" class="acc"/><line x1="178" y1="207" x2="262" y2="162" stroke-width="1.5" class="acc"/><rect x="486" y="80" width="146" height="34" rx="4" fill="none"/><rect x="486" y="130" width="146" height="34" rx="4" fill="none"/><line x1="452" y1="120" x2="486" y2="98"/><line x1="452" y1="140" x2="486" y2="147"/></g>
<polygon points="264,114 252,109 252,119" class="acc-fill"/><polygon points="264,161 251,161 256,171" class="acc-fill"/>
<g text-anchor="middle"><text x="105" y="52" font-weight="bold">transaction 1</text><text x="105" y="182" font-weight="bold">transaction 0</text><text x="350" y="82" font-weight="bold">transaction 2</text></g>
<g text-anchor="middle" font-size="11.5"><text x="105" y="84">out 0: 2 BTC → Dave</text><text x="105" y="120">out 1: 6 BTC → key A</text><text x="105" y="212">out 0: 6.25 BTC → key A′</text><text x="559" y="102">1.1234 BTC → Bob</text><text x="559" y="152">2.2345 BTC → Carol</text></g>
<g text-anchor="middle" font-size="11"><text x="350" y="110">in: tx 1 out 1</text><text x="350" y="125">+ signature, key A</text><text x="350" y="156">in: tx 0 out 0</text><text x="350" y="171">+ signature by A′</text><text x="350" y="208">fee = 12.25 − 3.3579 = 8.8921</text></g>
<g text-anchor="middle" font-size="12"><text x="320" y="262">A balance is the sum of unspent outputs a key can unlock; spending consumes outputs whole.</text></g>
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

### Locks in time and locks on a hash

Payment channels are built from two more conditions. A **time lock** forbids
spending before some moment: `OP_CHECKLOCKTIMEVERIFY` (CLTV, BIP-65, 2015)
compares against an absolute block height ("not before block 920,058"),
and `OP_CHECKSEQUENCEVERIFY` (CSV, BIP-68 and BIP-112, 2016) counts from
the block that confirmed the output ("not until 144 blocks after this was
mined", about a day). A **hash lock**, `OP_SHA256 <h> OP_EQUAL`, demands a
preimage of $h$; once revealed anywhere, the preimage opens every lock with
the same hash. A hash lock on one branch of an `OP_IF` and a time lock on
the other make a **hash time-locked contract** (HTLC): the payee claims
with the preimage, or the payer takes the money back after the deadline.
Section 19.10 routes a payment across a network with them.

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
70 bytes plus the sighash byte. Strict DER encoding has been a consensus rule
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

### What SegWit changed on the wire

BIP-141 (Eric Lombrozo, Johnson Lau and Pieter Wuille, 2015) had to remove
malleability without breaking a single old node. Its answer has four parts.

1. **A new output form.** A SegWit output is a **witness program**: a
   version and a short push. Version 0 with 20 bytes is P2WPKH, version 0
   with 32 bytes is P2WSH (the SHA-256 of a script revealed when
   spending), version 1 with 32 bytes is Taproot (§19.7). Old nodes see
   an output anyone may spend, so the new rules only tighten theirs: a
   soft fork.
2. **A new serialization.** A marker byte `00` and a flag `01` follow the
   version, and the witness stacks (signatures, keys, scripts) follow the
   outputs. Old nodes are sent the transaction without them.
3. **Two identifiers.** The **txid** hashes the old-style serialization,
   which for SegWit inputs contains no signatures; the **wtxid** hashes
   everything. A second Merkle tree, over wtxids, is committed in a
   coinbase output beginning `6a24aa21a9ed`, so signatures are still bound
   to the block, just not to the txid.
4. **Weight.** The one-megabyte limit became 4,000,000 **weight units**:
   a byte outside the witness counts four, a witness byte one.

### A worked example by hand: the weight of a transaction

BIP-143's signed transaction is 343 bytes; without marker, flag and
witness it is 233. The other 110 are the marker and flag (2), an empty
stack for the first input (1), and for the second a count (1), the 71-byte
signature and the 33-byte key with their length bytes (72 + 34). So

$$
\text{weight} = 3 \times 233 + 343 = 1{,}042 \text{ units},
\qquad \text{virtual size} = \lceil 1{,}042 / 4 \rceil = 261 \text{ vbytes},
$$

against $4 \times 343 = 1{,}372$ at the old rate: a quarter off the fee,
on purpose, since signatures can be pruned once checked while outputs
stay in every node's unspent set.

### Code it: malleate a transaction

The program parses BIP-143's signed transaction, whose first input is a
P2PK spend (signature in the scriptSig) and whose second a P2WPKH spend
(signature in the witness), replaces $s$ by $n - s$ in each signature in
turn, and prints both identifiers.

```python
# Malleability: replace s by n - s in one input of BIP-143's signed transaction.
# Uses h, sha256d, n, add, mul, G, decompress, z, pub, r and s from the first listing.
signed = h("01000000000102fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f00000000494830"
           "450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f928"
           "1a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01eeffffffef51e1b804cc89d182d279655c3aa89e81"
           "5b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f6"
           "6f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988"
           "ac000247304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c"
           "4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee0121025476c2e83188368da1ff3e292e7aca"
           "fcdb3566bb0ad253f62fc70f07aeee635711000000")

def parse(raw):                       # every length here fits in one byte
    i, ins, wits = 7, [], []          # skip version, marker, flag, input count
    for _ in range(raw[6]):           # outpoint (36), script length, scriptSig, sequence (4)
        L = raw[i + 36]
        ins.append([raw[i:i + 36], raw[i + 37:i + 37 + L], raw[i + 37 + L:i + 41 + L]])
        i += 41 + L
    start, i = i, i + 1
    for _ in range(raw[start]):       # amount (8), script length, script
        i += 9 + raw[i + 8]
    outs = raw[start:i]
    for _ in ins:                     # one witness stack per input
        items, count, i = [], raw[i], i + 1
        for _ in range(count):
            items.append(raw[i + 1:i + 1 + raw[i]]); i += 1 + raw[i]
        wits.append(items)
    return ins, outs, wits, raw[i:i + 4]

def serialize(ins, outs, wits, lock, witness=True):
    out = b"\x01\x00\x00\x00" + (b"\x00\x01" if witness else b"") + bytes([len(ins)])
    for outpoint, script, seq in ins:
        out += outpoint + bytes([len(script)]) + script + seq
    out += outs
    if witness:
        for items in wits:
            out += bytes([len(items)]) + b"".join(bytes([len(x)]) + x for x in items)
    return out + lock

def ids(ins, wits):                   # txid leaves the witness out; wtxid hashes everything
    txid = sha256d(serialize(ins, outs, wits, lock, witness=False))[::-1].hex()
    wtxid = sha256d(serialize(ins, outs, wits, lock))[::-1].hex()
    return "txid " + txid[:16] + "...  wtxid " + wtxid[:16] + "..."

def der_int(x):                       # minimal big-endian, with a 00 byte if the top bit is set
    b = x.to_bytes((x.bit_length() + 8) // 8, "big")
    return b"\x02" + bytes([len(b)]) + b
def flip_s(sig):                      # DER signature plus sighash byte -> same r, s replaced by n - s
    rl = sig[3]
    r_, s_ = int.from_bytes(sig[4:4 + rl], "big"), int.from_bytes(sig[6 + rl:-1], "big")
    body = der_int(r_) + der_int(n - s_)
    return b"\x30" + bytes([len(body)]) + body + sig[-1:]

ins, outs, wits, lock = parse(signed)
print("parsed and rebuilt byte for byte:", serialize(ins, outs, wits, lock) == signed)
print("as signed:            ", ids(ins, wits))

legacy = [list(x) for x in ins]       # input 0 is P2PK: its signature sits in the scriptSig
sig0 = flip_s(ins[0][1][1:])
legacy[0][1] = bytes([len(sig0)]) + sig0
print("input 0 (legacy) s->n-s:", ids(legacy, wits))

segwit = [list(x) for x in wits]      # input 1 is P2WPKH: its signature sits in the witness
segwit[1][0] = flip_s(wits[1][0])
print("input 1 (SegWit) s->n-s:", ids(ins, segwit))

w = pow(n - s, -1, n)                 # and (r, n - s) still verifies against the same sighash
R = add(mul(int.from_bytes(z, "big") * w % n, G), mul(r * w % n, decompress(pub)))
print("flipped signature still verifies:", R[0] % n == r)
```

It prints:

```text
parsed and rebuilt byte for byte: True
as signed:             txid e8151a2af31c368a...  wtxid c36c38370907df23...
input 0 (legacy) s->n-s: txid d1cfba03fcf676e3...  wtxid 15a47744bde54629...
input 1 (SegWit) s->n-s: txid e8151a2af31c368a...  wtxid 05a2eb2eb45a327a...
flipped signature still verifies: True
```

Flipping the legacy signature changes the txid, as any relaying node
could have done, orphaning any child transaction already signed against
the old txid. Flipping the witness signature changes only the wtxid. The
flipped signature is still valid ECDSA; only a relay rule (low $s$,
BIP-146) refuses it, not consensus. A transaction is safe only if all its
inputs are SegWit, which is why Lightning wants funding transactions with
only SegWit inputs: the channel's first refund is signed against the
funding txid before the funding is broadcast.

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
<g stroke="currentColor"><rect x="20" y="30" width="170" height="90" rx="6" class="soft"/><rect x="235" y="30" width="170" height="90" rx="6" class="soft-acc"/><rect x="450" y="30" width="170" height="90" rx="6" class="soft"/><line x1="192" y1="68" x2="231" y2="68" stroke-width="1.5"/><line x1="407" y1="68" x2="446" y2="68" stroke-width="1.5"/><line x1="320" y1="122" x2="320" y2="150" class="acc"/><rect x="250" y="150" width="140" height="28" rx="4" class="acc-fill" fill-opacity="0.25"/><line x1="290" y1="180" x2="200" y2="206"/><line x1="350" y1="180" x2="440" y2="206"/><rect x="140" y="206" width="120" height="28" rx="4" fill="none"/><rect x="380" y="206" width="120" height="28" rx="4" fill="none"/><line x1="180" y1="236" x2="140" y2="258"/><line x1="220" y1="236" x2="260" y2="258"/><line x1="420" y1="236" x2="380" y2="258"/><line x1="460" y1="236" x2="500" y2="258"/><rect x="105" y="258" width="70" height="26" rx="4" class="soft"/><rect x="225" y="258" width="70" height="26" rx="4" class="soft"/><rect x="345" y="258" width="70" height="26" rx="4" class="soft"/><rect x="465" y="258" width="70" height="26" rx="4" class="soft"/></g>
<polygon points="233,68 221,63 221,73"/><polygon points="448,68 436,63 436,73"/>
<g text-anchor="middle"><text x="105" y="50" font-weight="bold">block 169</text><text x="320" y="50" font-weight="bold">block 170</text><text x="535" y="50" font-weight="bold">block 171</text><text x="320" y="169">H(H12 ‖ H34)</text><text x="200" y="225">H12 = H(t1 ‖ t2)</text><text x="440" y="225">H34 = H(t3 ‖ t4)</text><text x="140" y="276">txid 1</text><text x="260" y="276">txid 2</text><text x="380" y="276">txid 3</text><text x="500" y="276">txid 4</text></g>
<g font-size="11.5"><text x="34" y="72">prev: …</text><text x="34" y="90">Merkle root</text><text x="34" y="108">bits · nonce</text><text x="249" y="72">prev: hash(169)</text><text x="249" y="90">Merkle root 7dac2c56…</text><text x="249" y="108">bits · nonce</text><text x="464" y="72">prev: hash(170)</text><text x="464" y="90">Merkle root</text><text x="464" y="108">bits · nonce</text><text x="20" y="160">H = SHA-256 twice</text><text x="20" y="178">(block 170 itself</text><text x="20" y="196">has only two txids)</text></g>
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

## 19.7 Taproot spent in full

*Level: expert.*

A coin often needs several ways to be spent: "Alice alone; or Bob alone;
or Carol, but only after a day". Before 2021 the whole policy went on the
chain when the coin moved. Taproot's aim is that the common case, everyone
agreeing, looks like a payment by one key, and that an unusual case
reveals only the one condition used. This section takes one output apart.

### The pieces

**Tagged hashes.** Every hash in BIP-340 to 342 is
$H_{\mathit{tag}}(x) = \mathrm{SHA256}(\mathrm{SHA256}(\mathit{tag}) \,\|\,
\mathrm{SHA256}(\mathit{tag}) \,\|\, x)$, with tags such as `TapLeaf`,
`TapBranch`, `TapTweak` and `TapSighash`. The 64-byte prefix is one
SHA-256 block, so its state can be precomputed, and the tag keeps a hash
made for one purpose from passing as another: a leaf hash can never be
offered as a branch hash or a tweak.

**The script tree.** Each spending condition is a script in a leaf, hashed
as $H_{\mathrm{TapLeaf}}(v \,\|\, \mathit{len} \,\|\, \mathit{script})$
with a leaf version $v$ (0xc0 for BIP-342's scripts). A branch hashes its
two children with $H_{\mathrm{TapBranch}}$, **sorted** first, so a proof
needs no left-or-right bits. Likely scripts sit near the root, so the
common case has the shortest proof.

**The tweak.** The owners choose an **internal key** $P$, often a MuSig2
aggregate of everyone's keys. The output key is

$$
Q = P + t\,G, \qquad t = H_{\mathrm{TapTweak}}(P_x \,\|\, \mathit{root}),
$$

and the output is `OP_1` and a 32-byte push of $Q_x$. Whoever knows the
secret $d$ of $P$ knows the secret $d + t$ of $Q$. Hashing $P$ into $t$ is
essential: if $t$ depended on the scripts alone, anyone could take another
person's $Q$, pick a root, and claim the internal key $P' = Q - tG$,
attaching a fake tree to coins not theirs. With $P$ in the hash, changing
$P'$ changes $t$; a fixed point means breaking the hash. An
output with no scripts is still tweaked, with $t = H_{\mathrm{TapTweak}}(P_x)$
(BIP-86), so its owner can show that no hidden script exists.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="A Taproot output: the output key Q equals the internal key P plus t times G, where t is the TapTweak hash of P and the Merkle root; the root is the TapBranch hash of two leaves, one holding Bob's script and one holding Carol's time-locked script; a script-path spend by Bob reveals his script, the internal key and the hash of Carol's leaf" fill="currentColor" font-size="12.5">
<g stroke="currentColor"><rect x="210" y="16" width="220" height="34" rx="6" fill="currentColor" fill-opacity="0.12"/><rect x="210" y="74" width="220" height="30" rx="4" fill="none"/><rect x="24" y="74" width="150" height="30" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="190" y="130" width="260" height="30" rx="4" fill="none"/><rect x="60" y="190" width="240" height="30" rx="4" fill="none"/><rect x="340" y="190" width="240" height="30" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="60" y="244" width="240" height="30" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="340" y="244" width="240" height="30" rx="4" fill="none" stroke-dasharray="4 3"/><line x1="174" y1="89" x2="208" y2="89"/><line x1="320" y1="130" x2="320" y2="106"/><line x1="320" y1="74" x2="320" y2="52"/><line x1="180" y1="190" x2="280" y2="162"/><line x1="460" y1="190" x2="360" y2="162"/><line x1="180" y1="244" x2="180" y2="222"/><line x1="460" y1="244" x2="460" y2="222"/></g>
<g text-anchor="middle"><text x="320" y="38" font-weight="bold">output key Q = P + t·G</text><text x="320" y="94">t = H_TapTweak(P ‖ root)</text><text x="99" y="94">internal key P</text><text x="320" y="150">root = H_TapBranch(sorted L_B, L_C)</text><text x="180" y="210">L_B = H_TapLeaf(c0 ‖ script_B)</text><text x="460" y="210">L_C = H_TapLeaf(c0 ‖ script_C)</text><text x="180" y="264">script_B: &lt;Bob&gt; CHECKSIG</text><text x="460" y="264" fill-opacity="0.7">script_C: 144 CSV DROP &lt;Carol&gt; CHECKSIG</text></g>
<g font-size="12"><text x="20" y="302">Key path: the witness is one 64-byte signature valid for Q. Nothing else is shown.</text><text x="20" y="322">Script path for Bob: signature, script_B, control block = (c0 | parity of Q) ‖ P ‖ L_C. Shaded parts are revealed.</text></g>
</svg>
<figcaption>Figure 19.3. A Taproot output with two scripts. Bob's spend reveals his script, the internal key and one sibling hash; Carol's script stays hidden, and so would every other leaf in a larger tree.</figcaption>
</figure>

**Key path.** The owners sign with the secret of $Q$. The witness is one
64-byte BIP-340 signature; nobody can tell whether a tree exists.

**Script path.** The witness holds the script's inputs (here Bob's
signature), the script, and a **control block**: one byte with the leaf
version and, in its lowest bit, the parity of $Q$'s $y$; the 32-byte
internal key; and the sibling hashes from the leaf to the root, 32 bytes
each, at most 128. A node hashes the leaf, climbs the path, recomputes $t$
and $Q$, checks them against the output, and only then runs the script.

**Tapscript.** BIP-342 changes the language inside the leaves.
`OP_CHECKSIG` checks BIP-340 signatures against 32-byte keys;
`OP_CHECKMULTISIG` is gone, replaced by `OP_CHECKSIGADD`, which counts
valid signatures key by key; unused opcodes became `OP_SUCCESSx`, room
for later soft forks. A script-path signature commits to its leaf, so it cannot be
replayed in another leaf, and every Taproot signature commits to the
amounts and scripts of *all* inputs being spent, closing the
hardware-wallet fee trick of §19.11.

### A worked example by hand: the cost of a path

BIP-341's test vector with two leaves has internal key `ee4fe085…3786592`
and leaf hashes `8ad69ec7…` and `f224a923…`; the tweak comes out as
`9e0517ed…eba4a9`. The control block for the first leaf is
$1 + 32 + 32 = 65$ bytes: `c0` (version 0xc0, parity 0), the internal key
and the other leaf's hash. In a tree of depth $m$ it is $33 + 32m$ bytes,
so a balanced tree of 1,024 scripts ($m = 10$) needs 353 bytes to prove
one of them, while the key path costs 64 bytes whatever the tree holds. A
2-of-3 multisignature as P2WSH puts two DER signatures and the 105-byte
script with all three keys in every spend, about 250 bytes; in Taproot,
two cooperating signers spend with one aggregate signature and reveal
nothing about the third.

### Code it: build and spend a Taproot output

The program rebuilds BIP-341's two-leaf test vector, then makes a toy
output with Alice's internal key and the two scripts of Figure 19.3. It
spends the toy by the key path with the tweaked secret, and by the script
path as Bob, checking the control block as a node would. It signs with the
BIP-340 code of §19.6, already checked against that BIP's vectors. A real
spend signs BIP-341's signature message; the toy signs a fixed stand-in.

```python
# Taproot (BIP-341): check a test vector, then spend a toy output both ways.
# Uses tagged, lift_x, num, b32, schnorr_sign, schnorr_verify, add, mul, G, n, h.
def tap_leaf(script, version=0xc0):          # scripts here are shorter than 253 bytes
    return tagged("TapLeaf", bytes([version, len(script)]) + script)
def tap_branch(a, b):                         # children sorted, so no left/right bits
    return tagged("TapBranch", min(a, b) + max(a, b))
def taproot(internal, root):                  # Q = P + tG, t = H_TapTweak(P || root)
    t = num(tagged("TapTweak", internal + root)) % n
    return add(lift_x(num(internal)), mul(t, G)), t

# 1. BIP-341's wallet test vector with two leaves (the second has leaf version 0xfa)
P_v = h("ee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592")
leaf0 = tap_leaf(h("20387671353e273264c495656e27e39ba899ea8fee3bb69fb2a680e22093447d48ac"))
leaf1 = tap_leaf(h("06424950333431"), 0xfa)
Q_v, t_v = taproot(P_v, tap_branch(leaf0, leaf1))
print("leaf hashes:", leaf0.hex()[:16] + "...", leaf1.hex()[:16] + "...")
print("tweak:  ", b32(t_v).hex())
print("output: ", b32(Q_v[0]).hex())
print("control block for leaf 0:", (bytes([0xc0 | Q_v[1] % 2]) + P_v + leaf1).hex()[:24] + "...")

# 2. A toy output: Alice's key, or Bob's key alone, or Carol's key after 144 blocks
sec = lambda name: num(hashlib.sha256(name).digest()) % n
alice, bob, carol = sec(b"alice"), sec(b"bob"), sec(b"carol")
x_only = lambda d: b32(mul(d, G)[0])
script_bob = b"\x20" + x_only(bob) + b"\xac"                            # <Bob> OP_CHECKSIG
script_carol = b"\x02\x90\x00\xb2\x75\x20" + x_only(carol) + b"\xac"    # 144 OP_CSV OP_DROP <Carol> OP_CHECKSIG
leaf_b, leaf_c = tap_leaf(script_bob), tap_leaf(script_carol)
P = x_only(alice)
Q, t = taproot(P, tap_branch(leaf_b, leaf_c))
print("toy output key:", b32(Q[0]).hex()[:16] + "...")
msg = hashlib.sha256(b"stand-in for the BIP-341 signature message").digest()

# Key path: Alice signs with the tweaked secret; the chain sees one key and 64 bytes
d = alice if mul(alice, G)[1] % 2 == 0 else n - alice
sig = schnorr_sign(b32((d + t) % n), msg, bytes(32))
print("key path:    witness = [64-byte signature], verifies:", schnorr_verify(b32(Q[0]), msg, sig))

# Script path: Bob reveals his leaf, the internal key and the sibling hash
control = bytes([0xc0 | Q[1] % 2]) + P + leaf_c
witness = [schnorr_sign(b32(bob), msg, bytes(32)), script_bob, control]
def check_script_path(output_x, witness):
    sig, script, cb = witness
    k = tap_leaf(script, cb[0] & 0xfe)
    for i in range(33, len(cb), 32):          # climb the Merkle path to the root
        k = tap_branch(k, cb[i:i + 32])
    Q2, _ = taproot(cb[1:33], k)
    if b32(Q2[0]) != output_x or Q2[1] % 2 != cb[0] & 1:
        return False                          # this script was not committed in the output
    return script[0] == 0x20 and script[33] == 0xac and schnorr_verify(script[1:33], msg, sig)
print("script path: witness =", [len(x) for x in witness], "bytes, verifies:", check_script_path(b32(Q[0]), witness))
forged = witness[:2] + [bytes([control[0]]) + x_only(bob) + leaf_c]
print("same leaf claimed under another internal key:", check_script_path(b32(Q[0]), forged))
```

It prints:

```text
leaf hashes: 8ad69ec7cf41c2a4... f224a923cd0021ab...
tweak:   9e0517edc8259bb3359255400b23ca9507f2a91cd1e4250ba068b4eafceba4a9
output:  712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5
control block for leaf 0: c0ee4fe085983462a184015d...
toy output key: aee13fc9895cb1a2...
key path:    witness = [64-byte signature], verifies: True
script path: witness = [64, 34, 65] bytes, verifies: True
same leaf claimed under another internal key: False
```

The first four lines match BIP-341's `wallet-test-vectors.json` byte for
byte (tweak `9e0517ed…`, output key `71244720…`, control block
`c0ee4fe0…`). The last line is the attack from above: Bob's leaf and
Carol's sibling hash under an internal key of the attacker's choosing. The
recomputed $Q$ is another point, and the spend fails before any script
runs.

**In the real world.** Taproot activated at block 709,632 on 14 November
2021. Its most visible early use was unplanned: from January 2023,
"inscriptions" stored images in script-path witnesses, which get the
witness discount and have no 10,000-byte script limit in tapscript.

## 19.8 Wallet seeds: BIP-39 words and BIP-32 trees

*Level: intermediate.*

Wallets use a new address per payment, for privacy. When each key was
random, last month's backup lacked every newer key, and coins were lost.
The fix derives every key from one secret, backed up once.

### BIP-32: a tree of keys from one seed

Pieter Wuille's **BIP-32** (2012) turns a seed of 16 to 64 bytes into a
tree. The root is one HMAC-SHA512:

$$
I = \mathrm{HMAC\text{-}SHA512}(\texttt{"Bitcoin seed"},\ \mathit{seed}),
\qquad k_m = I_L,\quad c_m = I_R,
$$

the master private key and a **chain code**, extra secret entropy mixed
into every derivation. Child number $i$ gives

$$
I = \mathrm{HMAC\text{-}SHA512}\bigl(c_{\mathit{par}},\ \mathit{data}\bigr),
\qquad k_i = I_L + k_{\mathit{par}} \bmod n, \qquad c_i = I_R,
$$

where $\mathit{data}$ is the parent's compressed **public** key and $i$ for
a **normal** child ($i < 2^{31}$), and a zero byte, the parent's
**private** key and $i$ for a **hardened** one ($i \ge 2^{31}$, written
$i'$ or $i$H). For a normal child only the chain code is secret, so whoever holds the
parent's public key and chain code, its **extended public key** or xpub,
can compute every child public key $K_i = I_L\,G + K_{\mathit{par}}$: a
shop's server can hand out fresh addresses without a key that spends. Paths name the
keys: `m/86'/0'/0'/0/5` is, by BIP-86's convention for Taproot wallets,
purpose 86, coin 0 (bitcoin), account 0, receiving chain 0 (change is 1),
address 5; BIP-44 (2014) set the pattern.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A BIP-32 key tree: the seed gives the master key m; hardened children 86 prime, 0 prime and 0 prime lead to an account key; below it normal children give the receive chain 0 and change chain 1, each with numbered address keys; everything below the account can be derived from the account's extended public key" fill="currentColor" font-size="12.5">
<g stroke="currentColor"><rect x="14" y="30" width="86" height="30" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="124" y="30" width="60" height="30" rx="4" fill="none" stroke-width="2"/><rect x="208" y="30" width="70" height="30" rx="4" fill="none" stroke-width="2"/><rect x="302" y="30" width="70" height="30" rx="4" fill="none" stroke-width="2"/><rect x="396" y="30" width="110" height="30" rx="4" fill="currentColor" fill-opacity="0.12" stroke-width="2"/><line x1="100" y1="45" x2="122" y2="45"/><line x1="184" y1="45" x2="206" y2="45"/><line x1="278" y1="45" x2="300" y2="45"/><line x1="372" y1="45" x2="394" y2="45"/><rect x="300" y="96" width="330" height="164" rx="8" fill="none" stroke-dasharray="5 4"/><rect x="356" y="126" width="110" height="28" rx="4" fill="none"/><rect x="510" y="126" width="100" height="28" rx="4" fill="none"/><line x1="440" y1="60" x2="411" y2="124"/><line x1="462" y1="60" x2="560" y2="124"/><rect x="318" y="196" width="50" height="26" rx="4" fill="none"/><rect x="386" y="196" width="50" height="26" rx="4" fill="none"/><rect x="454" y="196" width="50" height="26" rx="4" fill="none"/><rect x="535" y="196" width="50" height="26" rx="4" fill="none"/><line x1="400" y1="154" x2="343" y2="194"/><line x1="411" y1="154" x2="411" y2="194"/><line x1="422" y1="154" x2="479" y2="194"/><line x1="560" y1="154" x2="560" y2="194"/></g>
<g text-anchor="middle"><text x="57" y="50">seed</text><text x="154" y="50">m</text><text x="243" y="50">86′</text><text x="337" y="50">0′</text><text x="451" y="50">0′ account</text><text x="411" y="145">0 receive</text><text x="560" y="145">1 change</text><text x="343" y="214">0/0</text><text x="411" y="214">0/1</text><text x="479" y="214">0/2</text><text x="560" y="214">1/0</text></g>
<g text-anchor="middle" font-size="11"><text x="57" y="80" fill-opacity="0.7">HMAC-SHA512</text><text x="290" y="80" fill-opacity="0.7">hardened: need the parent's private key</text><text x="465" y="245" fill-opacity="0.7">normal: K_i = I_L·G + K_parent, no private key needed</text></g>
<g font-size="11"><text x="312" y="114" fill-opacity="0.7">derivable from the account xpub</text></g>
<g font-size="12"><text x="14" y="285">Address key m/86′/0′/0′/0/2: one 12- or 24-word backup recovers it and every other key in the tree.</text></g>
</svg>
<figcaption>Figure 19.4. A BIP-32 key tree on BIP-86's path for Taproot. Thick boxes are hardened derivations; inside the dashed box every public key follows from the account's xpub, which a watch-only wallet or a shop's server can hold.</figcaption>
</figure>

### Break it: one leaked child key and the xpub

Normal derivation has a price. A child's private key is
$k_i = k_{\mathit{par}} + I_L$, and $I_L$ follows from the xpub. Anyone
with the xpub and **any** normal child's private key subtracts and gets the
parent's private key, and with it every sibling. So the levels above an
account are hardened: an account xpub given to an accountant risks, at
worst, that account. Hardened derivation puts the parent's private key
into the HMAC and blocks the subtraction, at the cost of public
derivation.

### BIP-39: twelve words

**BIP-39** (Marek Palatinus, Pavol Rusnak, Aaron Voisine and Sean Bowe,
2013) writes the entropy as words. Take 128 to 256 bits (a multiple of
32), append the first $\mathit{ENT}/32$ bits of its SHA-256 as a checksum,
cut the result into 11-bit numbers and replace each by a word from a list
of 2,048. 128 bits plus 4 make 132 = 12 × 11, twelve words; 256 plus 8 make
24 words. The BIP-32 seed is then

$$
\mathit{seed} = \mathrm{PBKDF2\text{-}HMAC\text{-}SHA512}\bigl(\mathit{words},\
\texttt{"mnemonic"} \,\|\, \mathit{passphrase},\ 2048 \text{ rounds},\ 64 \text{ bytes}\bigr).
$$

The words themselves are hashed, so they must be kept exactly, and every
passphrase gives a valid seed: a mistyped one silently opens a different,
empty wallet. The 2,048 rounds slow a guesser only a little; the
security is the 128 bits of entropy, which is why a phrase a person
invents (the brain wallets of §19.11) is no substitute.

### A worked example by hand: twelve words from zero

Take BIP-39's first test vector, sixteen zero bytes (never a real wallet).
Its SHA-256 is `374708ff…`; the first byte 0x37 is 0011 0111, so the
checksum is 0011. The first eleven 11-bit groups are zero: word 0,
"abandon". The twelfth holds the last seven entropy bits and the checksum,
000 0000 0011 = 3, the fourth word, "about". With the passphrase "TREZOR"
the seed begins `c55257c3…`.

### Code it: words, seed and key tree

The program derives m/0H/1 of BIP-32's test vector 1 and checks the
serialized keys, runs the attack above on them, then encodes the zero
entropy as word numbers and checks the seed's master key against the
Trezor reference vector. Only the two words needed are written out.

```python
# Wallet seeds: BIP-32 test vector 1, then twelve BIP-39 words to a master key.
# Uses h, sha256d, mul, add, G, n, compress, num and b32 from the listings above.
B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
def base58check(payload):
    data = payload + sha256d(payload)[:4]
    x, out = int.from_bytes(data, "big"), ""
    while x:
        x, digit = divmod(x, 58); out = B58[digit] + out
    return "1" * (len(data) - len(data.lstrip(b"\0"))) + out
hash160 = lambda b: hashlib.new("ripemd160", hashlib.sha256(b).digest()).digest()
H = 2**31                                         # index i + H means "hardened"

def master(seed):
    I = hmac.new(b"Bitcoin seed", seed, hashlib.sha512).digest()
    return num(I[:32]), I[32:]                    # private key, chain code
def child(k, c, i):                               # CKDpriv
    data = (b"\0" + b32(k) if i >= H else compress(mul(k, G))) + i.to_bytes(4, "big")
    I = hmac.new(c, data, hashlib.sha512).digest()
    return (num(I[:32]) + k) % n, I[32:]
def xkey(k, c, depth, parent_k, i, private=True):  # the xprv / xpub text format
    fp = hash160(compress(mul(parent_k, G)))[:4] if depth else bytes(4)
    body = bytes([depth]) + fp + i.to_bytes(4, "big") + c
    if private: return base58check(h("0488ade4") + body + b"\0" + b32(k))
    return base58check(h("0488b21e") + body + compress(mul(k, G)))

# BIP-32 test vector 1: seed 000102...0f, path m/0H/1
k0, c0 = master(h("000102030405060708090a0b0c0d0e0f"))
k1, c1 = child(k0, c0, 0 + H)
k2, c2 = child(k1, c1, 1)
print("m      ", xkey(k0, c0, 0, None, 0))
print("m/0H   ", xkey(k1, c1, 1, k0, 0 + H))
print("m/0H/1 ", xkey(k2, c2, 2, k1, 1, private=False))
print("match BIP-32:", xkey(k2, c2, 2, k1, 1, private=False) == "xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ")

# A watch-only wallet derives m/0H/1's public key from m/0H's xpub (CKDpub)
K1 = mul(k1, G)
I = hmac.new(c1, compress(K1) + (1).to_bytes(4, "big"), hashlib.sha512).digest()
print("CKDpub gives the same m/0H/1 key:", add(mul(num(I[:32]), G), K1) == mul(k2, G))
# Break it: that xpub plus one leaked non-hardened child key gives the parent key
print("parent private key from xpub + child key:", (k2 - num(I[:32])) % n == k1)

# BIP-39: 128 bits of entropy + 4 checksum bits = twelve 11-bit word numbers
entropy = bytes(16)
bitstr = format(num(entropy), "0128b") + format(hashlib.sha256(entropy).digest()[0], "08b")[:4]
numbers = [int(bitstr[i:i + 11], 2) for i in range(0, 132, 11)]
print("word numbers:", numbers)
words = {0: "abandon", 3: "about"}                # 2 of the 2,048 English words
mnemonic = " ".join(words[i] for i in numbers)
seed = hashlib.pbkdf2_hmac("sha512", mnemonic.encode(), b"mnemonic" + b"TREZOR", 2048)
print("seed:", seed.hex()[:32] + "...")
print("master key from the words:", xkey(*master(seed), 0, None, 0)[:24] + "...",
      xkey(*master(seed), 0, None, 0) == "xprv9s21ZrQH143K3h3fDYiay8mocZ3afhfULfb5GX8kCBdno77K4HiA15Tg23wpbeF1pLfs1c5SPmYHrEpTuuRhxMwvKDwqdKiGJS9XFKzUsAF")
```

It prints:

```text
same leaf claimed under another internal key: False
m       xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi
m/0H    xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7
m/0H/1  xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ
match BIP-32: True
CKDpub gives the same m/0H/1 key: True
parent private key from xpub + child key: True
word numbers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3]
seed: c55257c360c07c72029aebc1b53c05ed...
master key from the words: xprv9s21ZrQH143K3h3fDYia... True
```

All three keys are the ones printed in BIP-32's text for test vector 1,
and the master key from the twelve words is the reference vector's.

**In the real world.** Seeds fail where they are made and where they are
kept. In August 2023 researchers disclosed "Milk Sad" (CVE-2023-39910):
Libbitcoin Explorer's `bx seed` drew entropy from a Mersenne Twister seeded
with 32 bits of time, so its wallets were among four billion, and thieves
had already emptied many. SLIP-39 splits a seed into Shamir shares, as the
[Secret sharing](../advanced/02-Secret-Sharing.md) chapter of the Advanced
book shows.

## 19.9 Payment channels: Lightning's commitments and revocation

*Level: intermediate.*

Bitcoin settles roughly seven transactions a second for the whole world,
each paying a fee and waiting for confirmations. A **payment channel**
moves payments off the chain: two parties lock funds in one output, update
who owns how much by exchanging signed but unbroadcast transactions, and
touch the chain again only to close. The chain is the court of appeal.

After one-way channels (Jeremy Spilman, 2013) and duplex ones (Christian
Decker and Roger Wattenhofer, 2015), Joseph Poon and Thaddeus
Dryja's "The Bitcoin Lightning Network" (draft 2015, final January 2016)
gave the design used today: channels updated indefinitely, enforced by
penalties, linked into a network by hash time-locked contracts. It needed
CSV (2016) and SegWit's fixed txids (2017). The specification is the
**BOLTs** ("Basis of Lightning Technology"); the first three
implementations (lnd, c-lightning, now Core Lightning, and Eclair) paid
each other in December 2017, and real money moved from early 2018.

### Funding and commitment transactions

**Funding.** The **funding transaction** pays the channel's capacity into
a P2WSH output with the script `2 <pubkey1> <pubkey2> 2 OP_CHECKMULTISIG`,
the two funding keys sorted (BOLT 3). Before Alice broadcasts it, Bob
signs her first **commitment transaction**, a refund that spends it, which
needs the funding txid fixed in advance (§19.4).
In BOLT 2: `open_channel`, `accept_channel`, `funding_created`,
`funding_signed`, then `channel_ready` once the funding has confirmed.

**Commitments are asymmetric.** Each side holds its own version of the
current state, signed by the other. Alice's pays Bob's balance to Bob at
once (`to_remote`), one output per payment in flight (§19.10), small
"anchor" outputs for adding fees later, and Alice's own balance through
this script (`to_local`):

```text
OP_IF
    <revocationpubkey>                                   penalty: at once
OP_ELSE
    <to_self_delay> OP_CHECKSEQUENCEVERIFY OP_DROP        owner: after the delay
    <local_delayedpubkey>
OP_ENDIF
OP_CHECKSIG
```

Whoever broadcasts their own version waits `to_self_delay` blocks for
their money, a delay set by the other side, typically from 144 blocks (a
day) to 2,016 (two weeks). During the wait the other side may take it all,
if they know the secret of `revocationpubkey`.

### Revocation: why old states are punishable

Signed transactions cannot be unsigned. When Alice pays Bob and they move
from state 1 to state 2, she still holds her state-1 commitment, richer
for her, signed by Bob, valid. The protocol cannot take it back; it makes
using it ruinous.

Each of Alice's commitments $j$ carries a fresh **per-commitment point**
$C_j = c_j G$, with $c_j$ known only to Alice; Bob has a **revocation
basepoint** $B = bG$. The revocation key in Alice's commitment $j$ is
(BOLT 3)

$$
R_j = B \cdot \mathrm{SHA256}(B \,\|\, C_j) \;+\; C_j \cdot \mathrm{SHA256}(C_j \,\|\, B),
$$

with secret $b \cdot \mathrm{SHA256}(B\|C_j) + c_j \cdot
\mathrm{SHA256}(C_j\|B)$. Bob lacks $c_j$, Alice lacks $b$, so nobody can
sign for $R_j$ while the state is current. To move on, Bob signs Alice's
next commitment (`commitment_signed`) and Alice answers `revoke_and_ack`,
which **reveals $c_j$**; now Bob holds both halves. The hash factors
matter: with a plain sum $B + C_j$, Alice could pick $C_j = X - B$ for a
key $X$ of her own and own the "revocation" key herself. Bob mirrors every
move on his own version, so each update costs one and a half round trips.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three successive versions of Alice's commitment transaction: state 1 pays Alice 500,000 and Bob 300,000, state 2 pays 400,000 each, state 3 pays Alice 350,000 and Bob 450,000; each pays Bob at once and Alice only after 144 blocks or to the revocation key at once; states 1 and 2 are revoked because Alice has given Bob their secrets" fill="currentColor" font-size="12">
<g stroke="currentColor"><rect x="14" y="30" width="190" height="196" rx="8" fill="currentColor" fill-opacity="0.08" stroke-dasharray="5 4"/><rect x="225" y="30" width="190" height="196" rx="8" fill="currentColor" fill-opacity="0.08" stroke-dasharray="5 4"/><rect x="436" y="30" width="190" height="196" rx="8" fill="none" stroke-width="2"/><rect x="26" y="86" width="166" height="44" rx="4" fill="none"/><rect x="237" y="86" width="166" height="44" rx="4" fill="none"/><rect x="448" y="86" width="166" height="44" rx="4" fill="none"/><rect x="26" y="140" width="166" height="62" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="237" y="140" width="166" height="62" rx="4" fill="currentColor" fill-opacity="0.2"/><rect x="448" y="140" width="166" height="62" rx="4" fill="none"/><line x1="204" y1="215" x2="223" y2="215"/><line x1="415" y1="215" x2="434" y2="215"/></g>
<polygon points="225,215 217,211 217,219"/><polygon points="436,215 428,211 428,219"/>
<g text-anchor="middle"><text x="109" y="52" font-weight="bold">state 1</text><text x="320" y="52" font-weight="bold">state 2</text><text x="531" y="52" font-weight="bold">state 3 (current)</text></g>
<g text-anchor="middle" font-size="11.5"><text x="109" y="72">Alice 500,000 · Bob 300,000</text><text x="320" y="72">Alice 400,000 · Bob 400,000</text><text x="531" y="72">Alice 350,000 · Bob 450,000</text><text x="109" y="246">revoked: Bob holds c1</text><text x="320" y="246">revoked: Bob holds c2</text><text x="531" y="246">nobody can sign for R3 yet</text></g>
<g text-anchor="middle" font-size="11"><text x="109" y="104">to_remote: Bob 300,000</text><text x="109" y="121">spendable at once</text><text x="320" y="104">to_remote: Bob 400,000</text><text x="320" y="121">spendable at once</text><text x="531" y="104">to_remote: Bob 450,000</text><text x="531" y="121">spendable at once</text><text x="109" y="158">to_local: Alice 500,000</text><text x="109" y="175">after 144 blocks, or</text><text x="109" y="192">revocation key R1 now</text><text x="320" y="158">to_local: Alice 400,000</text><text x="320" y="175">after 144 blocks, or</text><text x="320" y="192">revocation key R2 now</text><text x="531" y="158">to_local: Alice 350,000</text><text x="531" y="175">after 144 blocks, or</text><text x="531" y="192">revocation key R3 now</text></g>
<g text-anchor="middle" font-size="12"><text x="320" y="282">If Alice broadcasts state 1, Bob signs for R1 within 144 blocks and takes her 500,000 too.</text></g>
</svg>
<figcaption>Figure 19.5. Alice's copies of three channel states. Each step to a new state reveals the secret of the old one, so an old commitment on chain hands the other side every satoshi in the channel. Bob holds the mirror image of every box.</figcaption>
</figure>

### A worked example by hand: the cost of cheating

Take Figure 19.5's states: 500,000 and 300,000 satoshis, then 400,000
each, then 350,000 and 450,000. Alice broadcasts her state-1 commitment,
hoping to recover 150,000. Bob's 300,000 in `to_remote` are his at once;
Alice's 500,000 are locked for 144 blocks, during which Bob computes the
revocation secret from $c_1$ and $b$ and spends `to_local` through the
`OP_IF` branch. Bob ends with all 800,000; to gain 150,000 Alice lost her current
350,000. The deterrent works only if Bob looks at the chain at least once
per `to_self_delay`; a node offline for longer leaves encrypted penalty
transactions with a **watchtower**, which can decrypt one only when the
matching revoked commitment appears.

### Code it: revocation keys and a million secrets in 49 slots

A busy channel goes through millions of states, and the honest side must
be able to punish any of them. BOLT 3 derives the per-commitment secrets
from one seed: for index $I$, counting down from $2^{48}-1$, walk the bits
of $I$ from the top and, at each set bit, flip that bit of the running
value and hash it. A secret whose index ends in $k$ zero bits regenerates
the $2^k - 1$ secrets revealed before it, so the receiver keeps at most 49.
The program checks the key formulas and the first secret against BOLT 3's
test vectors (which use one base point for both derivations), then the
storage claim on 1,024 states.

```python
# Lightning's revocation keys and per-commitment secrets, against BOLT 3's vectors.
# Uses h, mul, add, G, n, compress, decompress, num and b32 from the listings above.
sha = lambda b: hashlib.sha256(b).digest()

# Alice's revocation basepoint secret, and Bob's secret for one commitment
base_secret = num(h("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"))
pc_secret = num(h("1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100"))
base_point, pc_point = compress(mul(base_secret, G)), compress(mul(pc_secret, G))
f1, f2 = num(sha(base_point + pc_point)), num(sha(pc_point + base_point))

# Bob's to_local output pays, without delay, to this key; nobody knows its secret yet
rev_pub = compress(add(mul(f1, decompress(base_point)), mul(f2, decompress(pc_point))))
print("revocationpubkey: ", rev_pub.hex())
print("matches BOLT 3:   ", rev_pub == h("02916e326636d19c33f13e8c0c3a03dd157f332f3e99c317c141dd865eb01f8ff0"))

# Moving to the next state, Bob sends pc_secret in revoke_and_ack. Now Alice can:
rev_priv = (base_secret * f1 + pc_secret * f2) % n
print("revocationprivkey:", b32(rev_priv).hex())
print("matches BOLT 3:   ", b32(rev_priv) == h("d09ffff62ddb2297ab000cc85bcb4283fdeb6aa052affbc9dddcf33b61078110"),
      "  opens the key:", compress(mul(rev_priv, G)) == rev_pub)

# Bob's own key for the same output (local_delayedpubkey) is tweaked the same way
local_pub = compress(add(decompress(base_point), mul(num(sha(pc_point + base_point)), G)))
print("localpubkey matches BOLT 3:", local_pub == h("0235f2dbfaa89b57ec7b055afe29849ef7ddfeb1cefdb9ebdc43f5494984db29e5"))

# Per-commitment secrets come from one seed; indexes count down from 2^48 - 1
def generate_from_seed(seed, index, bits=48):
    P = bytearray(seed)
    for B in range(bits - 1, -1, -1):
        if index >> B & 1:
            P[B // 8] ^= 1 << (B % 8)        # flip bit B, then hash
            P = bytearray(sha(bytes(P)))
    return bytes(P)
first = generate_from_seed(bytes(32), 2**48 - 1)
print("first secret matches BOLT 3:", first == h("02a40c85b6f28da08dfdbe0926c53fab2de6d28c10301f8f7c4073d5e42e3148"))

# A secret whose index ends in ten 0 bits regenerates the 1,023 revealed before it
seed = sha(b"Bob's channel seed")
low = 2**48 - 1024
stored = generate_from_seed(seed, low)
ok = all(generate_from_seed(stored, I & 1023, bits=10) == generate_from_seed(seed, I) for I in range(low, 2**48))
print("one stored secret regenerates the 1,023 before it:", ok)
```

It prints:

```text
master key from the words: xprv9s21ZrQH143K3h3fDYia... True
revocationpubkey:  02916e326636d19c33f13e8c0c3a03dd157f332f3e99c317c141dd865eb01f8ff0
matches BOLT 3:    True
revocationprivkey: d09ffff62ddb2297ab000cc85bcb4283fdeb6aa052affbc9dddcf33b61078110
matches BOLT 3:    True   opens the key: True
localpubkey matches BOLT 3: True
first secret matches BOLT 3: True
one stored secret regenerates the 1,023 before it: True
```

Every value matches BOLT 3's Appendix E and its `generate_from_seed`
vectors. The `localpubkey` line shows why each commitment's keys are
tweaked: a watchtower given what it needs to punish one state cannot link
it to the channel's other states.

## 19.10 HTLCs: paying across a network of channels

*Level: intermediate.*

A channel pays only its partner, so Lightning forwards payments along
paths: Alice, with a channel to Bob, pays Carol, who also has one with
Bob. If Alice paid Bob first, Bob could keep it; if Bob paid Carol first,
Alice could refuse to repay him. The **hash time-locked contract** of
§19.2 makes the two transfers one: both depend on the same secret, and
revealing it to collect downstream lets the upstream payment complete.

### The HTLC output

An HTLC offered by Alice to Bob adds an output to both commitments. In
Alice's version (BOLT 3's "offered HTLC"), Bob takes it with the
**preimage** $r$ and his signature; Alice takes it back after the
**expiry** through HTLC-timeout, a transaction both signed in advance,
time-locked to that height; and if this commitment is revoked, Bob takes
it with the revocation key. The preimage test is
`OP_HASH160 <RIPEMD160(payment_hash)> OP_EQUALVERIFY`: HASH160 is
RIPEMD-160 of SHA-256, so this checks $\mathrm{SHA256}(r) =
\mathit{payment\_hash}$ in 20 bytes instead of 32.

### A two-hop payment, step by step

The channels of Figure 19.6: Alice and Bob hold 500,000 and 300,000
satoshis; Bob and Carol 400,000 and 100,000. The chain is at block
920,000. Carol sells something for 100,000 satoshis.

<div class="mars-steps" markdown>

1. **Invoice.** Carol picks a random 32-byte $r$ and sends Alice a BOLT 11
   invoice signed by her node key: the amount, $H = \mathrm{SHA256}(r)$,
   and a `min_final_cltv_expiry_delta` (18 blocks if absent).
2. **Route.** From the gossip of BOLT 7, Alice knows Bob's terms for his
   channel to Carol: a base fee of 1,000 millisatoshis, 100 parts per
   million, and a `cltv_expiry_delta` of 40 blocks. She works backwards.
   Carol must get 100,000 satoshis, expiring no earlier than
   $920{,}000 + 18 = 920{,}018$. Bob must get $100{,}000{,}000 + 1{,}000 +
   100{,}000{,}000 \times 100 / 10^6 = 100{,}011{,}000$ millisatoshis,
   expiring at $920{,}018 + 40 = 920{,}058$.
3. **Onion.** Alice wraps each hop's instructions in a Sphinx onion
   (BOLT 4, 1,300 bytes); Bob decrypts only "forward 100,000 to Carol,
   expiry 920,018", not who pays or who is paid.
4. **Alice to Bob.** `update_add_htlc` (100,011 sat, $H$, 920,058, onion)
   and `commitment_signed`; Bob answers `revoke_and_ack` and
   `commitment_signed`; Alice answers `revoke_and_ack`. The HTLC is now in
   both commitments, the old ones revoked.
5. **Bob to Carol.** Bob checks his fee and that $920{,}058 - 920{,}018 \ge
   40$, then does the same with Carol: 100,000 sat, $H$, 920,018.
6. **Carol settles.** Carol checks the HTLC against her invoice and sends
   `update_fulfill_htlc` with $r$. Bob checks $\mathrm{SHA256}(r) = H$;
   after the next commitment exchange their channel reads 300,000 and
   200,000.
7. **Bob settles upstream.** Bob sends $r$ to Alice. Her channel with Bob
   reads 399,989 and 400,011: Bob earned 11 satoshis, and Alice holds $r$
   as a receipt that Carol was paid.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A two-hop Lightning payment: Alice offers Bob an HTLC of 100,011 satoshis on hash H expiring at block 920,058; Bob offers Carol 100,000 satoshis on the same hash expiring at 920,018; Carol reveals the preimage to Bob, who reveals it to Alice" fill="currentColor" font-size="12.5">
<g stroke="currentColor"><circle cx="80" cy="70" r="34" fill="currentColor" fill-opacity="0.12"/><circle cx="320" cy="70" r="34" fill="currentColor" fill-opacity="0.12"/><circle cx="560" cy="70" r="34" fill="currentColor" fill-opacity="0.12"/><line x1="116" y1="62" x2="280" y2="62" stroke-width="1.5"/><line x1="356" y1="62" x2="520" y2="62" stroke-width="1.5"/><line x1="520" y1="84" x2="358" y2="84" stroke-dasharray="5 3"/><line x1="280" y1="84" x2="118" y2="84" stroke-dasharray="5 3"/><rect x="20" y="130" width="600" height="56" rx="6" fill="currentColor" fill-opacity="0.06"/><line x1="60" y1="226" x2="600" y2="226" stroke-opacity="0.5"/><line x1="60" y1="220" x2="60" y2="232"/><line x1="330" y1="220" x2="330" y2="232"/><line x1="600" y1="220" x2="600" y2="232"/></g>
<polygon points="284,62 272,57 272,67"/><polygon points="524,62 512,57 512,67"/><polygon points="356,84 368,79 368,89"/><polygon points="116,84 128,79 128,89"/>
<g text-anchor="middle"><text x="80" y="75" font-weight="bold">Alice</text><text x="320" y="75" font-weight="bold">Bob</text><text x="560" y="75" font-weight="bold">Carol</text></g>
<g text-anchor="middle" font-size="11.5"><text x="200" y="30">1. HTLC: 100,011 sat, hash H</text><text x="200" y="46">expires at block 920,058</text><text x="440" y="30">2. HTLC: 100,000 sat, hash H</text><text x="440" y="46">expires at block 920,018</text><text x="440" y="104">3. preimage r</text><text x="200" y="104">4. preimage r</text></g>
<g text-anchor="middle" font-size="12"><text x="320" y="152">Carol chose r and put H = SHA-256(r) in her invoice; no one else can open either lock early.</text><text x="320" y="172">Bob's margin, 920,058 − 920,018 = 40 blocks, is his time to claim from Alice once r appears.</text><text x="320" y="278">Expiries shrink toward the payee, so each hop is paid before its own refund window opens.</text></g>
<g text-anchor="middle" font-size="11"><text x="60" y="250">920,000 now</text><text x="330" y="250">920,018: Bob may reclaim from Carol</text><text x="560" y="250">920,058: Alice may reclaim</text></g>
</svg>
<figcaption>Figure 19.6. One payment over two channels. The same hash locks both HTLCs; the expiries step down by each forwarder's delta; the preimage travels back the way the money came.</figcaption>
</figure>

Bob is safe: he paid Carol only against $r$, and $r$ opens Alice's HTLC
to him. If Carol claims on chain at block 920,017, Bob reads $r$ there and
has about 40 blocks to claim from Alice. If Carol never answers, the HTLCs
refund last hop first, at 920,018 and 920,058. BOLT 2 sizes the delta from
reorganization depth, a grace period and confirmation time. Failed payments unwind with `update_fail_htlc`,
whose error only Alice can decrypt.

### What HTLCs leak, and what replaces them

Every hop uses the same $H$, so two nodes on one path can tell they carried
the same payment, and a node can skip the hops between them in settlement
and take their fees (the "wormhole attack", Malavolta and others, NDSS
2019). **Point time-locked contracts** (PTLCs) would lock each hop to a
different point, $T + \delta_i G$, opened by an adaptor signature that
reveals a discrete log; Taproot's Schnorr signatures make them possible,
but as of November 2026 they are not deployed in the main
implementations. Other weak points are economic: payments never settled tie
up liquidity (channel jamming), and transaction replacement can keep an
HTLC claim out of blocks until its lock expires ("replacement cycling",
disclosed by Antoine Riard in October 2023). The link between nodes is the solved part: BOLT 8
runs Noise `XK` over secp256k1 with ChaCha20-Poly1305, the pattern of the
[WireGuard and Noise](08-WireGuard-and-Noise.md#82-noise-key-exchanges-as-strings-of-tokens)
chapter.

## 19.11 Break it: how keys are lost

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
Schnorr), keys generated from a high-entropy seed (§19.8; BIP-39's 12 or 24 words
carry 128 or 256 bits, stretched by PBKDF2 with 2,048 rounds of HMAC-SHA512),
**hierarchical deterministic** derivation (BIP-32, HMAC-SHA512 from one seed
to a tree of keys, so one backup covers every future address), hardware
wallets that show the destination and amount on their own screen, and
multisignature or MuSig2 custody so that no single device can spend.

## 19.12 What a blockchain does not solve

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

## 19.13 Mars: a chain across 20 minutes

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
<g stroke="currentColor"><line x1="80" y1="50" x2="620" y2="50" opacity="0.4"/><line x1="80" y1="160" x2="620" y2="160" opacity="0.4"/><rect x="100" y="36" width="44" height="28" rx="4" class="soft"/><rect x="260" y="36" width="44" height="28" rx="4" class="soft"/><rect x="390" y="36" width="44" height="28" rx="4" class="soft"/><rect x="200" y="146" width="44" height="28" rx="4" class="acc-fill" fill-opacity="0.3"/><line x1="144" y1="64" x2="196" y2="146" stroke-dasharray="4 3"/><line x1="244" y1="160" x2="452" y2="66" class="acc"/><line x1="434" y1="64" x2="560" y2="146" stroke-dasharray="4 3"/><rect x="560" y="146" width="60" height="28" rx="4" class="soft"/></g>
<polygon points="454,65 441,66 447,76" class="acc-fill"/>
<text x="20" y="54" font-weight="bold">Earth</text><text x="20" y="164" font-weight="bold">Mars</text>
<g text-anchor="middle"><text x="122" y="55">100</text><text x="282" y="55">101</text><text x="412" y="55">102</text><text x="222" y="165">101′</text></g>
<g font-size="11.5"><text x="330" y="132" class="acc-fill">arrives 20 min later</text><text x="520" y="84">Earth is at 102:</text><text x="520" y="100">101′ is orphaned</text></g>
<g text-anchor="middle" font-size="11"><text x="590" y="165">101, 102</text></g>
<g text-anchor="middle" font-size="12"><text x="320" y="210">Delays comparable to the block interval turn honest Mars blocks into orphans.</text></g>
</svg>
<figcaption>Figure 19.7. One chain, two planets. Nakamoto consensus assumes that blocks spread much faster than they are found.</figcaption>
</figure>

The formal analyses of §19.15 say exactly this: Nakamoto consensus is secure
only when the network delay is small compared with the block interval. A
chain shared between planets would need blocks every few hours, or a
separate Mars chain with its own miners, linked to Earth's by protocols that
tolerate delay. Payment channels fit well: two parties lock funds on chain
once and then exchange signed updates directly; their timeouts are measured
in blocks, hours to days, far longer than a light delay. For everyday
payments inside Arcadia City, a local system with known operators, like the
banks Bitcoin set out to replace, would serve far better than any global
chain.

### Channels across the light delay

Channels need no mining on Mars, so they look like the answer. Put in the
numbers: Arcadia City's hub keeps a channel with a hub on Earth, and a
family on Earth pays a Mars shop through it, over a one-way delay of 3 to
22 minutes.

- **Adding the HTLC** takes §19.9's ping-pong, three one-way trips: 9
  minutes at closest approach, 66 at the farthest. Settling adds one trip
  before Earth sees the preimage, so the family's receipt comes 12 to 88
  minutes after the click, no faster than an on-chain payment. The gain is
  in fees, and in the shop's local channels, which run at Mars speed.
- **Solar conjunction** is the real problem. For about two weeks every 26
  months the Sun blocks the link. A revoked commitment broadcast on Earth
  then cannot be punished from Mars, because the penalty cannot reach
  Earth's miners. Either `to_self_delay` must exceed the blackout, more
  than 2,016 blocks, which most implementations refuse, or Arcadia's hub
  must leave its penalty transactions with a watchtower on Earth before
  the blackout and stop forwarding HTLCs that expire inside it.

Every deadline must outlast the longest silence, and the Earth-Mars link
falls silent for weeks.

## 19.14 In the real world

*Level: intermediate.*

| Use | Algorithm | Specification |
|---|---|---|
| Legacy and SegWit v0 signatures | ECDSA on secp256k1, DER, low S, RFC 6979 nonces in Bitcoin Core | SEC 2, BIP-66, BIP-146 |
| Taproot signatures | Schnorr, 64 bytes, x-only keys | BIP-340 to 342 |
| Transaction IDs, blocks, proof of work, Merkle trees | SHA-256 applied twice | white paper, BIP-141 |
| Addresses | HASH160 (RIPEMD-160 of SHA-256), Base58Check, bech32, bech32m | BIP-13, 173, 350 |
| Wallet keys | HMAC-SHA512 tree from a seed; PBKDF2-HMAC-SHA512 from words | BIP-32, BIP-39 |
| Node-to-node transport | X25519-like ECDH on secp256k1 (ElligatorSwift), ChaCha20-Poly1305 | BIP-324 (default since 2024) |
| Lightning channels | 2-of-2 multisig funding, revocation keys, SHA-256 hash locks, CLTV and CSV time locks | BOLT 2, 3 and 5 |
| Lightning routing and transport | Sphinx onions; Noise `XK` over secp256k1 with ChaCha20-Poly1305 | BOLT 4 and 8 |

**Encrypted transport.** Until 2024 Bitcoin nodes talked in plain text, so
anyone on the path could see which transactions a node announced first, a
strong hint of their origin. BIP-324, on by default since Bitcoin Core 27.0
(April 2024), encrypts connections with keys that look like random bytes; it
does not authenticate peers, so an active man in the middle is still
possible, but passive observation is not.

**Post-quantum.** Shor's algorithm would recover a private key from any
public key that has appeared on chain: in old P2PK outputs, in every Taproot
output, and in any address that has spent once and still holds coins. Hashes
lose only to Grover's square-root speedup. Two draft proposals, BIP-360
("Pay-to-Merkle-Root", P2MR: Taproot's script tree without the key path,
so no public key sits in the output) and BIP-361 (a plan to phase out
vulnerable spends), were under discussion in 2026, with no post-quantum
signature yet chosen. The difficulty is political as well as technical:
coins whose owners never move them, Nakamoto's among them, cannot migrate,
and freezing them would change what "ownership" has meant on Bitcoin. The
[KEMs and signatures](../post-quantum/03-KEMs-and-Signatures.md) chapter of
the Post-quantum book explains the candidate signatures and their sizes,
which matter a great deal when every byte is paid for in fees.

### Changes under discussion, as of November 2026

Bitcoin's rules change only by soft fork, and slowly; the last was Taproot
in 2021. As of November 2026 none of the consensus proposals in the BIPs
repository has been activated or has an agreed activation plan:

- **Consensus Cleanup** (BIP-54, Antoine Poinsot and Matt Corallo) fixes
  the "timewarp" manipulation of block times, blocks crafted to validate
  slowly, 64-byte transactions that can pass for inner Merkle nodes (the
  family of §19.5's CVE-2012-2459) and duplicate coinbases. Its
  specification was marked complete in May 2026.
- **Covenants**, opcodes that constrain the spending transaction:
  `OP_CHECKTEMPLATEVERIFY` (BIP-119), `OP_CHECKSIGFROMSTACK` (BIP-348),
  `OP_CAT` (BIP-347), `OP_TEMPLATEHASH` (BIP-446) and `SIGHASH_ANYPREVOUT`
  (BIP-118), which would allow penalty-free channels (§19.15).
- **Post-quantum outputs**: BIP-360 and BIP-361, above.

One change did ship, as policy rather than consensus: Bitcoin Core 30.0
(October 2025) raised the default limit on relayed `OP_RETURN` data from
80 bytes to about 100,000. Opponents answered with BIP-110, a "Reduced Data
Temporary Softfork"; the repository now lists it as closed. Check the BIPs
repository and Bitcoin Core's release notes for anything newer.

## 19.15 Going deeper

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

**Channels in theory.** Aggelos Kiayias and Orfeas Stefanos Thyfronitis
Litos proved Lightning secure in a composable model (CSF 2020), assuming
honest parties watch the chain often enough and get their transactions
confirmed in time. Attacks target exactly those assumptions:
"time-dilation" (Antoine Riard and Gleb Naumenko, 2020) feeds an eclipsed
node stale blocks so its deadlines pass unseen, and "flood and loot" (Jona
Harris and Aviv Zohar, AFT 2020) forces more HTLC claims on chain than can
confirm before they expire. LN-Symmetry, the 2018 "eltoo" proposal of
Christian Decker, Rusty Russell and Olaoluwa Osuntokun, would drop
penalties: any newer state simply replaces an older one on chain. It needs
`SIGHASH_ANYPREVOUT` (BIP-118), not part of Bitcoin.

**Wallets in theory.** Poulami Das and colleagues ("The Exact Security of
BIP32 Wallets", CCS 2021) reduced BIP-32's security to ECDSA's and put it
at roughly 90 bits, less than the key size suggests but ample, with a
variant derivation adding about 20.

## Check yourself

??? question "1. What is the double-spend problem, and how does Bitcoin solve it?"
    Digital coins can be copied, so something must decide which of two
    conflicting payments counts. Bitcoin orders all transactions in a single
    chain of blocks; the first spend in the chain with the most work counts,
    and rewriting it would require redoing that work.

??? question "2. Why did BIP-143 add the spent amount to the sighash?"
    So that a signer, such as a hardware wallet, commits to the amounts and
    can compute the fee without seeing the previous transactions; and to
    make sighash computation linear instead of quadratic.

??? question "3. What is transaction malleability, and how did SegWit remove it?"
    Anyone could change a transaction's encoding (for example s into n − s)
    without invalidating it, changing its txid. SegWit moves signatures into
    a witness that is not part of the data hashed for the txid.

??? question "4. How does a repeated ECDSA nonce reveal the private key?"
    Two signatures with the same k share r. Subtracting the two signing
    equations gives k = (z1 − z2)/(s1 − s2), and then d = (s1 k − z1)/r.

??? question "5. What does Taproot's key path hide?"
    Whether the output had any alternative scripts at all: a key-path spend
    is one key and one signature, like any single-signature payment, even if
    the key is a MuSig2 aggregate.

??? question "6. Why are the top levels of a BIP-32 wallet path hardened?"
    A normal child's key is k_parent + I_L, with I_L computable from the
    parent's xpub, so the xpub plus one leaked child key gives the parent
    key. Hardened derivation hashes the parent's private key instead, so
    an account xpub can be shared without risking the levels above.

??? question "7. What does a Taproot script-path spend reveal, and how does a node check it?"
    The script, its inputs, and a control block: leaf version and parity of
    Q, the internal key P, and the sibling hashes up to the root. The node
    rebuilds the root, computes t = H_TapTweak(P || root), checks that
    P + tG is Q, then runs the script. Other scripts stay hidden.

??? question "8. Why would Alice lose money by broadcasting an old commitment transaction?"
    Her own balance in it (to_local) is locked for to_self_delay blocks or
    spendable at once with the revocation key. When she moved past that
    state she revealed its per-commitment secret, so Bob now knows both
    halves of the revocation key's secret and can take her whole balance
    during the delay, provided he or a watchtower is watching the chain.

??? question "9. In a payment Alice -> Bob -> Carol, why must the HTLC from Alice to Bob expire later than the one from Bob to Carol?"
    Bob pays Carol only against the preimage. If Carol reveals it at the
    last moment, on chain, Bob needs time to read it and claim Alice's HTLC
    before Alice can take her money back. The difference between the two
    expiries (Bob's cltv_expiry_delta, 40 blocks in §19.10) is that time.

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
- Malleable signatures changed txids until SegWit separated witnesses;
  you flipped s in a real transaction and only the legacy input's txid
  changed.
- Proof of work, the difficulty target, Merkle trees and the most-work chain
  give an order everyone can check. You verified the genesis block, block
  170's Merkle root, and mined a toy block.
- Schnorr signatures (BIP-340) are linear, enabling MuSig2 and Taproot's
  hidden scripts. You matched BIP-340's vectors and recovered a key from a
  repeated ECDSA nonce.
- A Taproot output key is $Q = P + tG$ with $t$ a tagged hash of $P$ and
  the script root; you rebuilt BIP-341's vector and spent a toy output
  both ways.
- BIP-39 words become a PBKDF2 seed and BIP-32 a tree of keys; you matched
  both standards' vectors and broke an xpub with one leaked child key.
- Lightning channels make old states punishable with revocation keys, and
  HTLCs chain payments with one hash lock and expiries that shrink toward
  the payee; you checked BOLT 3's vectors and traced a two-hop payment.
- Coins are lost through keys and custody, not broken cryptography; majority
  attacks, selfish mining and chain analysis are the system's limits.
- A chain spanning Earth and Mars fails because consensus needs delays much
  shorter than the block interval; channels to Mars work, slowly, if every
  time lock outlasts the solar-conjunction blackout.

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
- BIP-141 (Segregated Witness, 2015); BIP-65, BIP-68 and BIP-112 (time
  locks); BIP-32 (Pieter Wuille, 2012); BIP-39 (Palatinus, Rusnak, Voisine
  and Bowe, 2013); BIP-44 and BIP-86 (derivation paths).
- Joseph Poon and Thaddeus Dryja, "The Bitcoin Lightning Network: Scalable
  Off-Chain Instant Payments", January 2016; the BOLT specifications,
  github.com/lightning/bolts (BOLT 2, 3, 4, 8 and 11).
- Christian Decker and Roger Wattenhofer, "A Fast and Scalable Payment
  Network with Bitcoin Duplex Micropayment Channels", SSS 2015; Christian
  Decker, Rusty Russell and Olaoluwa Osuntokun, "eltoo", 2018.
- Giulio Malavolta et al., "Anonymous Multi-Hop Locks for Blockchain
  Scalability and Interoperability", NDSS 2019.
- Aggelos Kiayias and Orfeas Stefanos Thyfronitis Litos, "A Composable
  Security Treatment of the Lightning Network", CSF 2020; Antoine Riard and
  Gleb Naumenko, "Time-Dilation Attacks on the Lightning Network", 2020;
  Jona Harris and Aviv Zohar, "Flood & Loot", AFT 2020.
- Poulami Das et al., "The Exact Security of BIP32 Wallets", CCS 2021.
- The BIPs repository (BIP-54, 110, 118, 119, 347, 348, 360, 361, 446) as of
  November 2026; Bitcoin Core 30.0 release notes, October 2025.
- "Milk Sad", CVE-2023-39910, August 2023 (milksad.info).
