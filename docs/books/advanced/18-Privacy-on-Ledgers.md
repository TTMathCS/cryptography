# 18. Privacy on Ledgers, and Its Limits

*A blockchain is a ledger that everyone may copy and nobody may edit, and that is
exactly what makes it a poor place to keep a secret. Every payment ever made on
Bitcoin is still there, with its amount, its time and the addresses it joined,
for anyone to study forever. This chapter starts with the two rules that let an
analyst group thousands of addresses into one person, codes them on a made-up
ledger, and follows them into court in the Silk Road, Welcome to Video and
Bitfinex cases. Then it builds the answers people have tried: CoinJoin, which
mixes payments in one transaction; Monero's stealth addresses, rings and key
images, coded in a small group; Zcash's shielded pools; and Tornado Cash, a mixer
made of code that was sanctioned, tried and partly cleared, coded here as a toy
whose zero-knowledge proof is played by a clearly labeled trusted checker. It ends
with what no ledger cryptography can hide, and with the policy argument stated
from both sides.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a public ledger is a permanent public record of who paid whom, and why
      a pseudonym is not anonymity;
    - how the common-input and change-address heuristics cluster addresses, by
      hand and in code with a union-find over a twelve-transaction ledger;
    - how chain analysis became evidence in court, and where its limits are;
    - how CoinJoin breaks the naive heuristic, why equal amounts matter, and what
      happened to Wasabi and Samourai Wallet;
    - how a stealth address gives every payment a fresh key the recipient alone
      can find and spend, coded in a small prime-order group;
    - how key images stop double spending inside a ring, and how the 2017
      traceability papers traced most early Monero inputs anyway;
    - how Zcash's shielded pools work, why most of its value stayed transparent
      for years, and what viewing keys are for;
    - how a Tornado Cash style mixer works (commitments, a Merkle root,
      nullifiers, a proof), what the courts did with it, and how privacy pools
      try to separate honest users from thieves;
    - what a ledger cannot hide at all, and the arguments on both sides.

    **You need:** the Bitcoin protocol (transactions, inputs and outputs,
    addresses, scripts) from [Protocols, Chapter 19](../protocols/19-Ledgers-Bitcoin.md);
    smart contracts from [Chapter 17](17-Consensus-and-Smart-Contracts.md);
    Pedersen commitments and Merkle trees from [Chapter 3](03-Commitments.md);
    ring signatures and key images from
    [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md); what a SNARK
    proves, from [Chapter 7](07-SNARKs.md). Arithmetic modulo a prime, as in
    [Chapter 14 of book 1](../../book/14-Discrete-Log-Systems.md), is all the
    math the code uses.

    **Levels:** §18.1 is for beginners, §18.2 to §18.14 are intermediate,
    §18.15 is expert.

## 18.1 The problem

*Level: beginner.*

When you pay with a bank card, four parties learn about it: you, the shop, your
bank and the shop's bank, plus the card network between them. That is already
more than most people would like, and laws on banking secrecy and data
protection exist because of it. But the record is not public. A neighbor cannot
download your statement, and a stranger cannot read what you bought ten years ago.

Bitcoin turned that around. To let strangers check that nobody spends the same
coin twice without a bank in the middle, it publishes every transaction to
everyone ([Protocols, Chapter 19](../protocols/19-Ledgers-Bitcoin.md) tells how,
and [Chapter 17](17-Consensus-and-Smart-Contracts.md) why the copies agree).
Each transaction names the earlier outputs it spends, the new outputs it
creates, the amount of each, and, through the block that holds it, the time to
within minutes. Nothing is ever deleted. A payment made in 2011 can be studied
in 2031 with the tools of 2031.

Satoshi Nakamoto saw the problem and gave it a short section in the 2008
whitepaper. Section 10, "Privacy", explains that a bank keeps its customers
private by limiting who can see the records, while Bitcoin must publish them,
so privacy has to come from somewhere else: "by keeping public keys anonymous".
The public sees that someone sent an amount to someone, but not who. The same
section then gives the first warning, and it is worth quoting in full: "Some
linking is still unavoidable with multi-input transactions, which necessarily
reveal that their inputs were owned by the same owner. The risk is that if the
owner of a key is revealed, linking could reveal other transactions that
belonged to the same owner."

That paragraph is the whole of this chapter in miniature. An address is a
**pseudonym**: a name that is not your legal name but is the same every time you
use it. Pseudonyms are linkable by design, and once one link to the real world
appears, everything linked to it is exposed at once, backwards in time.
**Anonymity** is a stronger thing: among a set of possible senders, an observer
cannot tell which one acted. The set is the **anonymity set**, and its size,
or more precisely how evenly the observer's suspicion is spread across it, is
the measure of how anonymous you are (§18.15 makes this precise).

A payment can leak four separate things, and the designs of this chapter hide
different subsets of them:

| What leaks | Example | Hidden by |
|---|---|---|
| who paid | the input addresses | CoinJoin (partly), ring signatures, shielded pools |
| who was paid | the output addresses | stealth addresses, shielded pools |
| how much | the amounts | Confidential Transactions, RingCT, shielded pools |
| the link between payments | change, timing, reuse | everything above, imperfectly |

And there is a fifth leak that no ledger design can hide by itself: the
connection between the ledger and the rest of your life. The IP address that
broadcast the transaction, the exchange that checked your passport when you
bought the coins, the shop that knows where it shipped the parcel. §18.13 is
about that layer.

Figure 18.1 shows the history this chapter follows. It runs on two tracks that
push against each other: analysts learning to read the ledger, and designers
learning to make it unreadable, with the courts arriving in the 2020s.

<figure class="mars-fig">
<svg viewBox="0 0 640 404" width="640" role="img" aria-label="Timeline of ledger privacy from the Bitcoin whitepaper in 2008 to the Zcash Ironwood pool in 2026" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="396" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Bitcoin whitepaper: section 10 warns about linking</text>
<text x="78" y="54" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="49" r="3.5"/>
<text x="108" y="54">CoinJoin; "A Fistful of Bitcoins"; CryptoNote</text>
<text x="78" y="81" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="76" r="3.5"/>
<text x="108" y="81">Monero launches; the Zerocash paper</text>
<text x="78" y="108" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="103" r="3.5"/>
<text x="108" y="108">Zcash launches (Sprout); Bitfinex hacked</text>
<text x="78" y="135" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="130" r="3.5"/>
<text x="108" y="135">Monero RingCT; papers trace early Monero inputs</text>
<text x="78" y="162" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="157" r="3.5"/>
<text x="108" y="162">Zcash Sapling; Monero rings of 11</text>
<text x="78" y="189" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="184" r="3.5"/>
<text x="108" y="189">Tornado Cash; Welcome to Video arrests announced</text>
<text x="78" y="216" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="211" r="5"/>
<text x="108" y="216">Ronin theft; Bitfinex coins seized; Tornado sanctioned</text>
<text x="108" y="236" opacity="0.75">Zcash Orchard (Halo 2); Monero rings of 16</text>
<text x="78" y="263" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="258" r="3.5"/>
<text x="108" y="263">Privacy pools paper; Tornado developers indicted</text>
<text x="78" y="290" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="285" r="5"/>
<text x="108" y="290">Samourai founders arrested; Pertsev convicted</text>
<text x="108" y="310" opacity="0.75">Fifth Circuit: immutable contracts are not property</text>
<text x="78" y="337" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="332" r="5"/>
<text x="108" y="337">Bybit theft; Tornado delisted; Storm verdict</text>
<text x="108" y="357" opacity="0.75">Privacy Pools live on Ethereum</text>
<text x="78" y="384" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="379" r="3.5"/>
<text x="108" y="384">Orchard soundness flaw; Zcash opens the Ironwood pool</text>
</svg>
<figcaption>Figure 18.1. Eighteen years of reading and hiding ledgers. The large dots mark the years when the courts and the largest thefts shaped the field as much as the cryptography did.</figcaption>
</figure>

Why should a cryptography book care? Because the tools of the earlier chapters
were built for exactly this. Commitments ([Chapter 3](03-Commitments.md)) hide
amounts while letting anyone check that they add up. Ring signatures
([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)) hide which of
several keys signed. SNARKs ([Chapter 7](07-SNARKs.md)) prove that a hidden
transaction obeys the rules. Ledgers are where these tools met millions of users,
billions of dollars, and some of the world's most determined adversaries on both
sides of the law. The lessons were expensive and they generalize: an anonymity
set is only as large as the behavior of the people in it, and metadata outlives
encryption.

## 18.2 Reading a public ledger: address clustering

*Level: intermediate.*

A Bitcoin wallet is not one address. A careful wallet makes a new address for
every payment it receives and for every bit of change it returns to itself, as
section 10 advised, so a single person may own hundreds of addresses. The
analyst's first job is to undo that: to group addresses into **clusters** that
probably belong to one owner. Two rules, both older than the companies that now
sell them, do most of the work.

### Heuristic 1: inputs spent together have one owner

To spend several outputs in one transaction, the spender must sign for each of
them, which takes each output's private key. In 2009 nobody shared keys, so a
transaction with inputs from addresses $u$ and $v$ says: whoever made this held
both keys. That is the **common-input-ownership heuristic**, and it is the
"unavoidable" linking of the whitepaper. Fergal Reid and Martin Harrigan applied
it to the whole early transaction graph in 2011, and Dorit Ron and Adi Shamir to
the full graph up to 2012, in a paper published in 2013.

The rule is transitive: if $u$ and $v$ are spent together once and $v$ and
$w$ another time, then $u$, $v$ and $w$ form one cluster. Grouping things under a relation that chains like this is the
job of the **union-find** data structure: each address points to a parent, each
cluster has one root, `find` follows parents to the root, and `union` hangs one
root under another.

### Heuristic 2: the change goes to a new address

A Bitcoin output must be spent whole. If Alice holds an output of 1.0 coin and
pays 0.3, her transaction has two outputs: 0.3 to the payee and about 0.7 back to
herself, minus the fee. The second is **change**. If the analyst can tell which
output is change, it joins Alice's cluster.

Sarah Meiklejohn and her colleagues at the University of California, San Diego
gave the classic rule in "A Fistful of Bitcoins" (2013). Wallets of that time
sent change to a **fresh** address, one never seen on the ledger before, while
payees often reused an address they had published. So: in a transaction with two
outputs, if exactly one output address is appearing for the first time, it is
probably the change. The rule has false positives (a payee with a fresh invoice
address looks exactly like change), and the paper spent much of its care on
excluding the cases where it misfires. Later analysts added more signals: round
payment amounts ("0.3" is a payment, "0.6912" is change), the script type that
matches the inputs, the way particular wallet programs order outputs or set fees.

### By hand: twelve transactions

Here is a made-up ledger. Amounts are left out; the two heuristics need only
addresses. Letters hint at the owners the analyst does not know: Alice's
addresses start with a, Carol's with c, the shop's with b, the pharmacy's with
d, an exchange's with x.

| Tx | Spends | Pays |
|---|---|---|
| t01 | x1 | a1, x2 |
| t02 | x2 | c1, x3 |
| t03 | a1 | d1, a2 |
| t04 | c1 | b1, c2 |
| t05 | a2 | b1, a3 |
| t06 | x3 | a4, x4 |
| t07 | a3, a4 | d1, a5 |
| t08 | b1 | x4, b2 |
| t09 | c2 | d1, c3 |
| t10 | x4 | e1, x5 |
| t11 | b2, b3 | x5 |
| t12 | a5 | d1, a6 |

Heuristic 1 fires twice: t07 links a3 with a4, t11 links b2 with b3.

Heuristic 2 goes through the table in order, remembering which addresses have
appeared. In t01, t02, t03, t04 and t06 both outputs are new, so it cannot
choose. In t05, b1 has been seen (in t04) and a3 is new, so a3 is change of a2.
In t07, d1 has been seen (t03) and a5 is new: change of a3. Likewise c3 is the
change in t09, b2 in t08 and a6 in t12. t10 pays e1 and x5, both new: no
decision.

Chaining the links: a2–a3 (t05), a3–a4 (t07), a3–a5 (t07), a5–a6 (t12) give one
cluster $\{a2, a3, a4, a5, a6\}$. Now one outside fact finishes the job. The
address a4 was paid by the exchange in t06: it is a withdrawal, and the
exchange, which checked Alice's identity when she opened her account, knows it
is hers. A single tag names the entire cluster, and the cluster paid d1, a known
pharmacy, in t07 and t12. Figure 18.2 shows the chain.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three transactions linked by change outputs and one co-spend, with a single exchange tag naming the whole chain" fill="currentColor" font-size="14">
<defs><marker id="ar182" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="10" y="155">a2</text>
<line x1="30" y1="150" x2="68" y2="150" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar182)"/>
<rect x="70" y="125" width="100" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="155" text-anchor="middle" font-weight="bold">t05</text>
<line x1="120" y1="125" x2="120" y2="68" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar182)"/>
<text x="120" y="58" text-anchor="middle">b1 (shop)</text>
<line x1="170" y1="150" x2="258" y2="150" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#ar182)"/>
<text x="214" y="142" text-anchor="middle">a3</text>
<text x="214" y="172" text-anchor="middle" font-size="12" opacity="0.75">change</text>
<rect x="260" y="125" width="100" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="310" y="155" text-anchor="middle" font-weight="bold">t07</text>
<line x1="310" y1="125" x2="310" y2="68" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar182)"/>
<text x="310" y="58" text-anchor="middle">d1 (pharmacy)</text>
<line x1="310" y1="232" x2="310" y2="177" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar182)"/>
<text x="310" y="250" text-anchor="middle">a4, co-spent with a3</text>
<text x="310" y="272" text-anchor="middle" font-weight="bold">exchange records: a4 is Alice</text>
<line x1="360" y1="150" x2="448" y2="150" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#ar182)"/>
<text x="404" y="142" text-anchor="middle">a5</text>
<text x="404" y="172" text-anchor="middle" font-size="12" opacity="0.75">change</text>
<rect x="450" y="125" width="100" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="500" y="155" text-anchor="middle" font-weight="bold">t12</text>
<line x1="500" y1="125" x2="500" y2="68" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar182)"/>
<text x="500" y="58" text-anchor="middle">d1 (pharmacy)</text>
<line x1="550" y1="150" x2="598" y2="150" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#ar182)"/>
<text x="616" y="155" text-anchor="middle">a6</text>
<text x="320" y="22" text-anchor="middle" opacity="0.75">dashed: change (heuristic 2) · bottom: co-spend (heuristic 1)</text>
</svg>
<figcaption>Figure 18.2. Alice's cluster in the toy ledger. Change outputs chain t05, t07 and t12 together; the co-spend in t07 pulls in a4, and the exchange's record for a4 names everyone in the chain. Her first payment, t03, stays unlinked: the heuristics missed it.</figcaption>
</figure>

Notice what the heuristics missed. Alice also owns a1 and paid the pharmacy in
t03, but t03's two outputs were both new, so a1–a2 was never linked. Carol's c1
is likewise orphaned. Clustering under-merges when wallets behave well and
over-merges when the heuristics' assumptions fail, which is the subject of
§18.4.

### Code it

The code builds the clusters with union-find, first with heuristic 1 alone, then
with both, and finally adds one CoinJoin transaction (§18.4) to show what it does
to the naive analysis.

```python
# A made-up ledger. Each transaction: (id, addresses spent, addresses paid).
LEDGER = [
    ("t01", ["x1"], ["a1", "x2"]),
    ("t02", ["x2"], ["c1", "x3"]),
    ("t03", ["a1"], ["d1", "a2"]),
    ("t04", ["c1"], ["b1", "c2"]),
    ("t05", ["a2"], ["b1", "a3"]),
    ("t06", ["x3"], ["a4", "x4"]),
    ("t07", ["a3", "a4"], ["d1", "a5"]),
    ("t08", ["b1"], ["x4", "b2"]),
    ("t09", ["c2"], ["d1", "c3"]),
    ("t10", ["x4"], ["e1", "x5"]),
    ("t11", ["b2", "b3"], ["x5"]),
    ("t12", ["a5"], ["d1", "a6"]),
]
TAGS = {"x1": "exchange", "d1": "pharmacy", "a4": "ALICE (exchange records)"}
COINJOIN = ("t13", ["a6", "c3", "e1"], ["m1", "m2", "m3"])

parent = {}
def find(u):
    parent.setdefault(u, u)
    while parent[u] != u:
        parent[u] = parent[parent[u]]          # path halving keeps trees flat
        u = parent[u]
    return u
def union(u, v):
    parent[find(u)] = find(v)

def cluster(ledger, use_change=True):
    parent.clear()
    seen = set()
    for txid, ins, outs in ledger:
        for a in ins + outs:
            find(a)
        for a in ins[1:]:                      # heuristic 1: inputs spent together
            union(ins[0], a)
        fresh = [a for a in outs if a not in seen]
        if use_change and len(outs) == 2 and len(fresh) == 1:
            union(ins[0], fresh[0])            # heuristic 2: the one new output is change
        seen.update(ins + outs)
    groups = {}
    for a in list(parent):
        groups.setdefault(find(a), []).append(a)
    return sorted(sorted(g) for g in groups.values() if len(g) > 1)

def show(title, groups):
    print(title)
    for g in groups:
        names = sorted({TAGS[a] for a in g if a in TAGS})
        print("  ", " ".join(g), "<-", ", ".join(names) or "?")

show("Heuristic 1 only:", cluster(LEDGER, use_change=False))
show("Heuristics 1 and 2:", cluster(LEDGER))
alice = [g for g in cluster(LEDGER) if "a4" in g][0]
paid = [t for t, ins, outs in LEDGER if ins[0] in alice and "d1" in outs]
print("Alice's cluster paid the pharmacy in", paid)
show("After one CoinJoin, read naively:", cluster(LEDGER + [COINJOIN]))
```

It prints:

```
Heuristic 1 only:
   a3 a4 <- ALICE (exchange records)
   b2 b3 <- ?
Heuristics 1 and 2:
   a2 a3 a4 a5 a6 <- ALICE (exchange records)
   b1 b2 b3 <- ?
   c2 c3 <- ?
Alice's cluster paid the pharmacy in ['t07', 't12']
After one CoinJoin, read naively:
   a2 a3 a4 a5 a6 c2 c3 e1 <- ALICE (exchange records)
   b1 b2 b3 <- ?
```

The last block of output is the warning. Transaction t13 is a CoinJoin in which
Alice, Carol and an unknown e1 each put in one input and take out one equal
output. Heuristic 1 assumes one owner, so it fuses all three into "Alice's"
cluster: Carol is now labeled as Alice, with no evidence at all. A real
analytics tool recognizes the CoinJoin shape and switches the heuristic off for
it; a careless one does not.

Real ledgers are larger, not different. Bitcoin's holds hundreds of millions of
addresses, and union-find merges them in close to linear time, which is why a
data structure described by Bernard Galler and Michael Fischer in 1964 (and
analyzed by Robert Tarjan in 1975) sits at the heart of a surveillance industry.

!!! note "Life story: address clustering"
    **Born:** 2008 as a warning in section 10 of the Bitcoin whitepaper; applied
    to the transaction graph by Reid and Harrigan (2011) and Ron and Shamir
    (2013); the change-address rule and real-world tagging by Meiklejohn et al.,
    "A Fistful of Bitcoins" (IMC 2013) · **Purpose:** group the many addresses
    of one wallet into one owner, then name the owner from a single tag ·
    **Helped:** every chain-analysis product, tax and sanctions investigations,
    and the cases of §18.3 · **Status:** current and refined with hundreds of
    wallet-specific signals; weakened, never defeated, by CoinJoin and careful
    wallets

## 18.3 Chain analysis goes to court

*Level: intermediate.*

By the mid-2010s the heuristics of §18.2 had become products. Elliptic was
founded in London in 2013, Chainalysis in 2014, CipherTrace in 2015 (bought by
Mastercard in 2021) and TRM Labs in 2018. What they sell is less the algorithms,
which are public, than the **tags**: millions of addresses labeled as belonging
to exchanges, darknet markets, ransomware gangs, sanctioned parties and
scammers, gathered by making test payments, by subpoenas, by leaked databases and
by the exchanges themselves. Their customers are exchanges that must screen
deposits, tax authorities, sanctions offices and police forces. The cases that
made the field credible are worth telling, because each one shows both the power
of the method and where it needed something else.

### Silk Road

Silk Road, the first large darknet market, ran as a Tor onion service from 2011
and took payment only in bitcoin, on the theory that bitcoin was anonymous. Its
operator, Ross Ulbricht, was arrested in a San Francisco public library on
1 October 2013; how investigators located the server is still argued about, and
it was not by chain analysis. But at his trial in early 2015 the ledger did the
connecting: an FBI agent traced thousands of transfers from the Silk Road
servers' wallets to wallets on Ulbricht's laptop, which held about 144,000
bitcoins. He was sentenced to life in prison in May 2015. (He was pardoned by
President Trump on 21 January 2025.)

The ledger then caught people on the other side. Two federal agents on the case,
Carl Force of the Drug Enforcement Administration and Shaun Bridges of the Secret
Service, stole bitcoins during the investigation; an IRS Criminal Investigation
agent, Tigran Gambaryan, followed the coins to accounts in their names, and both
went to prison in 2015. And because the ledger never forgets, Silk Road kept
producing seizures years after it closed: in November 2020 the US government took
69,370 bitcoins, then worth about \$1 billion, from a hacker who had stolen them
from the market in 2012 and 2013, and in November 2021 it seized about 50,676
bitcoins from James Zhong, who had stolen them from Silk Road in 2012, found in
an underground floor safe and on a single-board computer hidden in a popcorn
tin in his house.

!!! note "Life story: the Silk Road tracing"
    **Born:** 2013 to 2015, FBI and IRS Criminal Investigation work on the
    Silk Road market · **Purpose:** connect a darknet market's wallets to a
    person, and follow stolen coins out of it · **Helped:** the conviction of
    Ross Ulbricht (2015), of two corrupt federal agents (2015), and seizures of
    69,370 bitcoins (2020) and about 50,676 bitcoins (2021) years after the
    market closed · **Status:** the reference case for "the ledger never
    forgets"; Ulbricht was pardoned in January 2025

### Welcome to Video

The case that most changed minds was the worst. Welcome to Video, run from South
Korea by Son Jong-woo, was a Tor site selling access to videos of child sexual
abuse, paid in bitcoin. It gave each user a unique bitcoin address for
payments, which is good bookkeeping and terrible secrecy. IRS Criminal
Investigation agents, working with Chainalysis's software, followed the payments
out of the site's addresses to exchanges, which held the account holders'
identities, and followed the site's own cash-outs to Son. The server was seized
in South Korea in March 2018, holding about 8 terabytes of video. When the US
Department of Justice announced the case on 16 October 2019, it reported 337
arrests in a dozen countries, leads sent to 38 countries, and at least 23
children rescued from ongoing abuse. Son served his sentence in South Korea,
which refused to extradite him to the United States in 2020.

The method was nothing more than §18.2 plus tags: payments into a known
address, clusters on the paying side, and an exchange's records at the end of
each trail. Its moral weight is why later debates about ledger privacy rarely
start from zero: the same transparency that exposes an innocent pharmacy
customer exposed hundreds of abusers.

!!! note "Life story: the Welcome to Video takedown"
    **Born:** the site from 2015; the investigation from 2017, by IRS Criminal
    Investigation, Homeland Security Investigations and South Korean police,
    using Chainalysis tools · **Purpose:** identify the users and operator of a
    child-abuse site paid only in bitcoin · **Helped:** 337 arrests and at
    least 23 children rescued (announced October 2019); proof that "paid in
    bitcoin over Tor" was not anonymity · **Status:** closed; the case is the
    centerpiece of Andy Greenberg's *Tracers in the Dark* (2022)

### Bitfinex

On 2 August 2016 a hacker took 119,754 bitcoins from the Hong Kong exchange
Bitfinex, about \$70 million at the time. For years the coins barely moved, then
moved in thousands of small hops: peel chains (a long series of transactions each
shaving a little off), deposits at darknet markets used as mixers, swaps into
other currencies and back. On 8 February 2022 the US Department of Justice
arrested Ilya Lichtenstein and his wife Heather Morgan in New York and announced
the seizure of about 94,000 of the stolen bitcoins, then worth about \$3.6
billion, the largest financial seizure in its history. Lichtenstein pleaded guilty
in 2023 and admitted he was the hacker; he was sentenced to five years in November
2024 and Morgan to eighteen months.

The tracing narrowed the suspects, but the decisive step was ordinary police work:
a search warrant for Lichtenstein's cloud storage turned up a file listing the
addresses holding the stolen coins together with their private keys. Chain
analysis is usually like that. It points; a subpoena, a warrant or a mistake
confirms.

!!! note "Life story: the Bitfinex recovery"
    **Born:** the theft on 2 August 2016 (119,754 bitcoins); the arrests on
    8 February 2022 · **Purpose:** follow stolen coins through years of peel
    chains and swaps to the people holding them · **Helped:** recovery of about
    94,000 bitcoins (about \$3.6 billion in 2022), guilty pleas in 2023 and
    sentences in November 2024 · **Status:** closed; a reminder that a theft on
    a public ledger is never finished, because the coins stay visible

### The limits of the evidence

Every heuristic is a probability, and the courts have had to learn that. In the
trial of Roman Sterlingov, convicted in March 2024 of running the Bitcoin Fog
mixer, the defense argued that Chainalysis's Reactor software had never been
validated for error rates; the judge admitted the evidence, and the conviction
stood, but the argument is fair in general. Over-merging, as the CoinJoin line of
the code showed, attaches strangers to a suspect. Tags can be wrong. And the
result of an analysis depends on choices (which heuristics, which exceptions)
that the analyst rarely publishes. Good practice, slowly emerging, is to treat a
cluster as a lead that must be confirmed by records from outside the ledger.

## 18.4 CoinJoin and PayJoin

*Level: intermediate.*

If heuristic 1 says "inputs spent together have one owner", the obvious attack on
it is to spend together inputs that have different owners. In August 2013 Gregory
Maxwell, then a Bitcoin Core developer, described exactly that on the Bitcointalk
forum under the title "CoinJoin: Bitcoin privacy for the real world". Nothing in
Bitcoin requires a transaction's inputs to be signed by one person. Each input
carries its own signature, and each signature (with the default `SIGHASH_ALL`
flag) covers the whole transaction, every input and every output.

So several people can build one transaction together:

<div class="mars-steps" markdown>

1. Each participant names an input they own and an output address they want to be
   paid at, plus a change address if needed.
2. Someone, a coordinator or one of the participants, assembles the transaction
   from all the parts and shows it to everyone.
3. Each participant checks that their own output is there with the right amount,
   and only then signs their own input.
4. When every input is signed, the transaction is broadcast.

</div>

No one ever holds anyone else's coins: a participant whose output is missing
simply refuses to sign, and the transaction is invalid without that signature.
The coordinator can stall the round, but cannot steal. That non-custodial
property is what distinguishes CoinJoin from the older **custodial mixers**,
services such as Bitcoin Fog or Helix where you sent coins to the operator and
trusted them to send back different ones.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A CoinJoin with three inputs of different sizes and three equal outputs plus three change outputs" fill="currentColor" font-size="14">
<defs><marker id="ar183" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="64">Ana 1.5</text>
<text x="20" y="139">Ben 2.3</text>
<text x="20" y="214">Cy 4.1</text>
<line x1="90" y1="60" x2="238" y2="110" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<line x1="90" y1="135" x2="238" y2="135" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<line x1="90" y1="210" x2="238" y2="160" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<rect x="240" y="80" width="140" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="310" y="128" text-anchor="middle" font-weight="bold">one</text>
<text x="310" y="148" text-anchor="middle" font-weight="bold">transaction</text>
<line x1="380" y1="100" x2="478" y2="40" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<line x1="380" y1="112" x2="478" y2="76" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<line x1="380" y1="124" x2="478" y2="112" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar183)"/>
<text x="486" y="45">1.0 (someone)</text>
<text x="486" y="81">1.0 (someone)</text>
<text x="486" y="117">1.0 (someone)</text>
<line x1="380" y1="150" x2="478" y2="158" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ar183)"/>
<line x1="380" y1="162" x2="478" y2="194" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ar183)"/>
<line x1="380" y1="174" x2="478" y2="230" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ar183)"/>
<text x="486" y="163">0.5 change</text>
<text x="486" y="199">1.3 change</text>
<text x="486" y="235">3.1 change</text>
<text x="320" y="258" text-anchor="middle" opacity="0.75">fee ignored · each person signs only their own input</text>
</svg>
<figcaption>Figure 18.3. A CoinJoin with equal outputs. Any of the three 1.0 outputs could belong to any of the three people; the dashed change outputs, each the input minus 1.0, still point back to their owners.</figcaption>
</figure>

### By hand: why the amounts matter

Ana, Ben and Cy hold 1.5, 2.3 and 4.1 coins. Suppose they join without
coordinating amounts: Ana pays 1.0 and keeps 0.5, Ben pays 2.0 and keeps 0.3, Cy
sends all 4.1 to a new address. The outputs, shuffled, are 1.0, 0.5, 2.0, 0.3 and
4.1. An analyst adds up subsets: only $1.0 + 0.5$ makes 1.5, only $2.0 + 0.3$
makes 2.3, and 4.1 matches itself. The mixing has hidden nothing; the joint
transaction splits back into three ordinary payments. Kristov Atlas's 2014
"CoinJoin Sudoku" tool named the method well: the amounts are the constraints,
and the puzzle has one solution.

Now fix a denomination. Everyone takes one output of exactly 1.0 and the rest as
change: outputs 1.0, 1.0, 1.0, 0.5, 1.3, 3.1. The three 1.0 outputs are
interchangeable, and each could belong to any of the three; the anonymity set of
each is three. But each change output is still its input minus 1.0, and that
links Ana to 0.5, Ben to 1.3, Cy to 3.1. Change from a CoinJoin is "toxic": spend
it together with a mixed output and the mixing is undone.

### Code it: the sudoku

The code tries every subset of inputs against every subset of outputs and keeps
the single-input matches.

```python
from itertools import combinations

def subsets(items):
    for k in range(1, len(items) + 1):
        for combo in combinations(items, k):
            yield combo

def link(inputs, outputs, fee_per_input=0):
    """Find ways to split a mixed transaction into separate payments whose sums match."""
    found = []
    for ins in subsets(list(inputs)):
        need = sum(inputs[i] for i in ins) - fee_per_input * len(ins)
        for outs in subsets(list(outputs)):
            if sum(outputs[o] for o in outs) == need:
                found.append((ins, outs))
    return found

# Amounts in thousandths of a coin. Three people mix with unequal amounts.
bad = {"in_ana": 1500, "in_ben": 2300, "in_cy": 4100}
bad_out = {"o1": 1000, "o2": 500, "o3": 2000, "o4": 300, "o5": 4100}
print("Unequal mix:")
for ins, outs in link(bad, bad_out):
    if len(ins) == 1:
        print("  ", ins[0], "->", outs)

# Same people, equal 1000 outputs plus change.
good = {"in_ana": 1500, "in_ben": 2300, "in_cy": 4100}
good_out = {"m1": 1000, "m2": 1000, "m3": 1000, "ch_a": 500, "ch_b": 1300, "ch_c": 3100}
print("Equal-output mix, single-input matches:")
for ins, outs in link(good, good_out):
    if len(ins) == 1:
        print("  ", ins[0], "->", outs)
```

It prints:

```
Unequal mix:
   in_ana -> ('o1', 'o2')
   in_ben -> ('o3', 'o4')
   in_cy -> ('o5',)
Equal-output mix, single-input matches:
   in_ana -> ('m1', 'ch_a')
   in_ana -> ('m2', 'ch_a')
   in_ana -> ('m3', 'ch_a')
   in_ben -> ('m1', 'ch_b')
   in_ben -> ('m2', 'ch_b')
   in_ben -> ('m3', 'ch_b')
   in_cy -> ('m1', 'ch_c')
   in_cy -> ('m2', 'ch_c')
   in_cy -> ('m3', 'ch_c')
```

The unequal mix has exactly one reading. The equal mix has nine, three for each
person: the analyst knows each person's change but cannot tell which 1.0 output
is whose. That is the whole idea, and also its ceiling: with $n$ participants the
best possible anonymity set for a mixed output is $n$, and it shrinks every time
someone later spends carelessly. The search is exponential, so real analysts use
smarter subset-sum methods, but real CoinJoins have dozens to hundreds of inputs,
and with equal denominations the puzzle stops having a unique answer.

### Wasabi, JoinMarket and Samourai

Three designs carried CoinJoin from a forum post to real use.

**JoinMarket** (2015) is a market: "makers" offer their coins for joining and
earn a small fee, "takers" pay to join with them at a moment of their choosing.
There is no central coordinator.

**Wasabi Wallet** (2018, from the company zkSNACKs) used a central coordinator
that must not learn which input belongs to which output. It borrowed Chaum's
blind signatures from
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md): each participant
registers an input, receives a blind signature on an output address it keeps
hidden, then reconnects over a new Tor circuit and presents the unblinded
signature with the output. The coordinator sees a valid signature it issued, but
cannot match it to the input. Wasabi 2.0 (2022) replaced this with **WabiSabi**,
which uses keyed-verification anonymous credentials (§14.13 of that chapter) to let
each participant register arbitrary amounts and split them into standard
denominations, so rounds can hold hundreds of inputs.

**Samourai Wallet**, a mobile wallet, ran **Whirlpool** from 2019: fixed pools
(for example 0.01, 0.05 or 0.5 bitcoin) in which each round took five equal
inputs and made five equal outputs, with fees and change handled in a separate
setup transaction so that no toxic change sat in the mix.

Both coordinators collided with the law in 2024. On 24 April 2024 US prosecutors
in New York charged Samourai's founders, Keonne Rodriguez and William Lonergan
Hill, with conspiracy to commit money laundering and conspiracy to operate an
unlicensed money-transmitting business, alleging that more than \$2 billion of
unlawful transactions had passed through the service and that over \$100 million
of criminal proceeds had been laundered. The defense argued that a
non-custodial coordinator never controls anyone's money and so cannot be a money
transmitter, a reading supported by earlier guidance from FinCEN, the US
financial-crimes regulator. In July 2025 both men pleaded guilty to the
unlicensed-money-transmitting conspiracy, the laundering charge was dropped, and
in November 2025 Rodriguez was sentenced to five years in prison and Hill to four.
Supporters have asked for a pardon; President Trump said in late 2025 that he
would look at the case. No pardon had been reported by mid-2026.
Within weeks of the 2024 arrests zkSNACKs shut down its Wasabi coordinator (on
1 June 2024) and some hardware-wallet makers removed CoinJoin features; Wasabi
itself lives on with independent coordinators.

!!! note "Life story: CoinJoin"
    **Born:** August 2013, Gregory Maxwell, "CoinJoin: Bitcoin privacy for the
    real world" (Bitcointalk) · **Purpose:** break the common-input heuristic by
    letting several owners sign one transaction, with no one holding anyone
    else's coins · **Helped:** JoinMarket (2015), Wasabi (2018) and WabiSabi
    (2022), Samourai's Whirlpool (2019); every chain-analysis tool now detects
    the shape · **Status:** current but diminished; the largest coordinators
    closed in 2024, and analysts exploit post-mix mistakes and toxic change

!!! note "Life story: Samourai Wallet"
    **Born:** 2015, a privacy-focused Bitcoin wallet for phones; the Whirlpool
    CoinJoin coordinator from 2019 · **Purpose:** equal-amount CoinJoins with
    no toxic change, plus tools against chain analysis · **Helped:** a large
    share of Bitcoin's CoinJoin volume until 2024 · **Retired:** the founders
    were arrested on 24 April 2024 and the servers seized; guilty pleas to an
    unlicensed-money-transmitting conspiracy in July 2025; sentences of five and
    four years in November 2025 · **Replaced by:** independent Wasabi
    coordinators and PayJoin, on a much smaller scale

### PayJoin: hiding in ordinary payments

A CoinJoin is conspicuous: many equal outputs announce "mixing happened". PayJoin
takes the opposite approach and makes the heuristic lie quietly. When Alice pays
Bob, Bob adds one of his own inputs to the transaction and adds its value to his
own output. By hand: Alice spends an input of 0.5 and pays Bob 0.3; Bob adds an
input of 0.2. The outputs are 0.5 to Bob (his 0.2 back plus the 0.3) and 0.2 of
change to Alice.

An analyst who applies heuristic 1 merges Alice's and Bob's inputs into one
owner, which is false. One who looks for the payment sees outputs of 0.5 and 0.2
and guesses that one of them was paid, which is also false: the real payment, 0.3,
appears nowhere on the ledger. Because PayJoins look like ordinary two-input
payments, a few of them in circulation cast doubt on heuristic 1 for every
transaction of that shape.

PayJoin grew from proposals called Pay-to-EndPoint (Blockstream, 2018) and
Bustapay (BIP 79), and was standardized as BIP 78 by Nicolas Dorier for the
BTCPay Server merchant software; a newer version, BIP 77, lets the receiver be
offline. It needs the receiver's wallet to cooperate, which is why it has spread
slowly.

## 18.5 Hiding the amounts

*Level: intermediate.*

CoinJoin and PayJoin hide who paid whom by blurring the transaction graph; the
amounts stay public, and as the sudoku showed, amounts are often enough to
rebuild the graph. Hiding them is a solved problem, and the solution is in
[Chapter 3](03-Commitments.md): replace each amount $v$ with a Pedersen commitment
$C = g^v h^r$, where $r$ is a random blinding factor and nobody knows $\log_g h$.
Commitments multiply as their contents add, so a node can check that inputs and
outputs balance without seeing any number.

A quick check in this chapter's toy group (the order-233 subgroup of
$\mathbb{Z}_{467}^*$, with $g = 4$ and $h = 9$): an input of 5 coins with blinding
11 is $C = 4^5 \cdot 9^{11} \bmod 467 = 250$. The sender makes two outputs, 3
coins with blinding 4 and 2 coins with blinding 7, committed as $71$ and $214$.
Since $3 + 2 = 5$ and $4 + 7 = 11$,

$$
71 \cdot 214 = 15194 = 32 \cdot 467 + 250 \equiv 250 \pmod{467},
$$

and the node sees the product match without learning 5, 3 or 2. In a real
system the blinding factors are chosen so that they cancel out except for a
known excess, which the sender proves they know by signing with it.

Two more pieces make this safe. Every output needs a **range proof** that its
hidden amount is not negative (otherwise $-1000$ and $+1005$ would balance a 5,
printing money); that is the job of Bulletproofs, coded in
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md). And a fee, being public,
is committed with zero blinding.

Gregory Maxwell's Confidential Transactions (2015) put this into Bitcoin-style
transactions; Blockstream deployed it in the Liquid sidechain in 2018. The
**Mimblewimble** design, posted in August 2016 under the pseudonym Tom Elvis
Jedusor, went further: it builds the whole ledger from Pedersen commitments, has
no addresses at all, and lets spent outputs be cut out of the history. Grin and
Beam launched on it in 2019, and Litecoin added it as an optional extension
block (MWEB) in May 2022.

What confidential amounts do not hide is just as important: which outputs are
spent by which transaction. The graph of §18.2 is untouched, and with it the
common-input heuristic. Hiding the graph takes one of the two very different
ideas of the next sections: hiding the *spender* among decoys (Monero) or hiding
the *whole transaction* behind a zero-knowledge proof (Zcash, Tornado Cash).
Both start by solving a simpler problem first: how to receive money without
publishing an address that links all your payments.

## 18.6 Stealth addresses: a fresh key for every payment

*Level: intermediate.*

A shop that wants to be paid in bitcoin faces a small dilemma. If it prints one
address on its website, every payment to it is linked on the ledger, and anyone
can total its income. If it gives each customer a fresh address, it must be
online to hand them out. A charity, a streamer, a dissident collecting donations,
anyone who wants to publish a single payment address once and still receive
unlinkable payments, needs something cleverer.

The answer is a **stealth address**: a public address from which each payer
derives a different one-time key, so that the ledger shows unrelated keys while
the recipient alone can recognize them and spend from them. The idea is a
Diffie-Hellman exchange done in one direction, with the payer's half published on
the ledger. It appeared on the Bitcoin forums in 2011 and in a Bitcoin proposal
by Peter Todd in January 2014, but it entered real use in **CryptoNote**, a
protocol white paper of October 2013 by the pseudonymous Nicolas van Saberhagen,
the basis of Bytecoin and, from April 2014, of Monero.

### The construction

Work in a group of prime order $q$ with generator $g$, as in
[Chapter 14 of book 1](../../book/14-Discrete-Log-Systems.md), and let $H_s$ be a
hash function whose output is read as a number modulo $q$. The recipient keeps
two secrets:

- a **view key** $a$, with public $A = g^a$;
- a **spend key** $b$, with public $B = g^b$.

The pair $(A, B)$ is the published address. To pay it, the sender:

1. picks a fresh random $r$ and computes $R = g^r$;
2. computes the shared secret $s = A^r = g^{ar}$ and $h = H_s(s)$;
3. pays the coin to the **one-time key** $P = g^h \cdot B$, and publishes $R$
   alongside it in the transaction.

The recipient scans every new transaction on the ledger. For each pair
$(R, P)$ it computes $s' = R^a = g^{ra}$, the same shared secret, then
$h' = H_s(s')$, and checks whether $g^{h'} \cdot B = P$. If so, the payment is
theirs, and the one-time secret key is

$$
x = h' + b \pmod q, \qquad \text{since } g^x = g^{h'} g^b = g^{h'} B = P.
$$

Monero writes the same thing additively on the curve ed25519:
$R = rG$, $P = H_s(rA)G + B$, $x = H_s(aR) + b$. It also mixes the output's
position in the transaction into the hash, so that two outputs to the same
recipient in one transaction get different keys.

Why it works: only someone who knows $r$ or $a$ can compute $g^{ar}$, by the
Diffie-Hellman assumption. To everyone else, $P$ is a random-looking group element
and two payments to the same address are unlinkable. And the split of roles is
useful in practice: a wallet that holds only $a$ and $B$ can *find* incoming
payments (it computes $h'$ and checks $P$) but cannot *spend* them, because that
needs $b$. Monero calls this a **view key**: you can give it to an accountant,
an auditor or a server that scans the chain for your phone.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Message flow of a stealth payment between sender, public ledger and recipient" fill="currentColor" font-size="14">
<defs><marker id="ar184" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="90" y="24" text-anchor="middle" font-weight="bold">Sender</text>
<text x="320" y="24" text-anchor="middle" font-weight="bold">Ledger (public)</text>
<text x="550" y="24" text-anchor="middle" font-weight="bold">Recipient</text>
<line x1="90" y1="34" x2="90" y2="320" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="320" y1="34" x2="320" y2="320" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="550" y1="34" x2="550" y2="320" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="550" y="56" text-anchor="middle">keys a, b</text>
<line x1="550" y1="76" x2="94" y2="76" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar184)"/>
<text x="320" y="70" text-anchor="middle">address (A, B), published once</text>
<text x="90" y="110" text-anchor="middle">pick r</text>
<text x="90" y="132" text-anchor="middle">R = g^r</text>
<text x="90" y="154" text-anchor="middle">P = g^H(A^r) · B</text>
<line x1="90" y1="176" x2="316" y2="176" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar184)"/>
<text x="205" y="170" text-anchor="middle">pay to P, publish R</text>
<rect x="268" y="188" width="104" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="208" text-anchor="middle">(R, P)</text>
<line x1="372" y1="230" x2="546" y2="230" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#ar184)"/>
<text x="460" y="224" text-anchor="middle">scan every output</text>
<text x="550" y="258" text-anchor="middle">g^H(R^a) · B = P ?</text>
<text x="550" y="282" text-anchor="middle">yes: x = H(R^a) + b</text>
<text x="550" y="306" text-anchor="middle" opacity="0.75">(a finds it; b spends)</text>
<text x="320" y="260" text-anchor="middle" opacity="0.75">observers see an</text>
<text x="320" y="280" text-anchor="middle" opacity="0.75">unrelated new key</text>
</svg>
<figcaption>Figure 18.4. A stealth payment. The address is published once; every payer makes a fresh one-time key P from it, and only the holder of the view key a can recognize P, while only the holder of the spend key b can spend it.</figcaption>
</figure>

### By hand

Use the toy group of this chapter: $p = 467 = 2 \cdot 233 + 1$, the subgroup of
order $q = 233$, generator $g = 4$. (Real systems use a curve with a group of
order about $2^{252}$; in a group of 233 elements every secret can be guessed.)
The recipient picks $a = 17$ and $b = 29$, so $A = 4^{17} \bmod 467 = 208$ and
$B = 4^{29} \bmod 467 = 159$.

The sender picks $r = 41$, so $R = 4^{41} \bmod 467 = 25$. The shared secret is
$A^r = 4^{17 \cdot 41} = 4^{697}$. Exponents live modulo 233, and
$697 = 3 \cdot 233 - 2$, so $A^r = 4^{-2} = 16^{-1} \bmod 467$. Since
$16 \cdot 146 = 2336 = 5 \cdot 467 + 1$, the shared secret is $s = 146$. The hash
(SHA-256 of the text "146", reduced mod 233, as in the code below) gives
$h = 225$. Then $g^h = 4^{225} = 4^{-8}$, the inverse of $4^8 = 65536 \equiv 156$,
which is 3, because $3 \cdot 156 = 468 \equiv 1$. So

$$
P = g^h \cdot B = 3 \cdot 159 = 477 \equiv 10 \pmod{467}.
$$

The ledger shows the pair $(R, P) = (25, 10)$. The recipient computes
$R^a = 25^{17} \bmod 467$, which is $4^{41 \cdot 17}$, the same 146, hashes it to
225, and checks $3 \cdot 159 \equiv 10$. Match. Its one-time secret is
$x = 225 + 29 = 254 \equiv 21 \pmod{233}$, and indeed $4^{21} \bmod 467 = 10$.

### Code it

```python
import hashlib, random

p, q, g = 467, 233, 4          # p = 2q + 1; g = 4 generates the subgroup of order q
                               # (real systems: a 256-bit curve such as ed25519)

def Hs(*parts):                # hash to a scalar mod q
    data = "|".join(str(x) for x in parts).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

# Recipient: view key a, spend key b; the public address is (A, B).
a, b = 17, 29
A, B = pow(g, a, p), pow(g, b, p)

def send(A, B, r):
    R = pow(g, r, p)                       # published with the transaction
    h = Hs(pow(A, r, p))                   # shared secret A^r = g^(ar)
    P = pow(g, h, p) * B % p               # the one-time key the coin is paid to
    return R, P

def scan(a, B, R, P):                      # needs only a and B: a "view-only" wallet
    h = Hs(pow(R, a, p))                   # R^a = g^(ra), the same shared secret
    return pow(g, h, p) * B % p == P

def one_time_secret(a, b, R):
    return (Hs(pow(R, a, p)) + b) % q      # x with g^x = P; needs the spend key b

print("address A, B =", A, B)
R, P = send(A, B, r=41)
print("payment 1: R =", R, " P =", P)
print("recipient's scan finds it:", scan(a, B, R, P))
x = one_time_secret(a, b, R)
print("one-time secret x =", x, " g^x == P:", pow(g, x, p) == P)
R2, P2 = send(A, B, r=88)
print("payment 2: R =", R2, " P =", P2, " (unrelated to P)")

random.seed(18)                            # random is for the demo; use secrets for keys
hits = 0
for _ in range(1000):                      # strangers' payments on the ledger
    a2, b2, r = (random.randrange(1, q) for _ in range(3))
    Rx, Px = send(pow(g, a2, p), pow(g, b2, p), r)
    hits += scan(a, B, Rx, Px)
print("false matches among 1000 strangers' payments:", hits)
```

It prints:

```
address A, B = 208 159
payment 1: R = 25  P = 10
recipient's scan finds it: True
one-time secret x = 21  g^x == P: True
payment 2: R = 373  P = 91  (unrelated to P)
false matches among 1000 strangers' payments: 3
```

The last line is the toy group showing its size. A stranger's one-time key
equals the value the recipient expects with probability $1/233$, so about 4 in
1000 payments to other people look like ours; we saw 3. On ed25519 the chance is
about $2^{-252}$, and a match is proof. The scan is also the cost of the design:
the wallet must do one exponentiation for every output on the chain. In August
2022 Monero added a one-byte **view tag**, a short hash of the shared secret
stored with each output, so a wallet can discard 255 of every 256 outputs after
a hash instead of a full check.

**Break it: reusing $r$.** If a careless sender uses the same $r$ for two
payments to the same address, both get the same one-time key and the ledger links
them at once. With the output index in the hash, as Monero does, two outputs in
the same transaction still differ; across transactions, $r$ must be fresh and
secret, generated with `secrets` (and leaking $r$ to anyone lets them recognize
the payment, though not spend it).

### In the real world

Every Monero output since 2014 goes to a one-time key built this way; the
published address never appears on the chain. Monero later added
**subaddresses**, so one wallet can hand out many unlinkable addresses from the
same keys. On Ethereum, ERC-5564 (proposed in 2022) defines stealth
addresses for ordinary accounts, with the same view-key and spend-key split, and
several wallets support it. On Bitcoin, the idea returned as **silent payments**
(BIP 352, 2023), where the sender's input keys play the role of $R$, so nothing
extra is published.

!!! note "Life story: stealth addresses"
    **Born:** discussed on Bitcoin forums from 2011; specified in the CryptoNote
    white paper (October 2013, "Nicolas van Saberhagen") and in Peter Todd's
    Bitcoin proposal (January 2014) · **Purpose:** publish one address, receive
    payments to unlinkable one-time keys that only the recipient can find and
    spend · **Helped:** every Monero output since 2014, view-only wallets and
    audits, Ethereum's ERC-5564, Bitcoin's silent payments (BIP 352) · **Status:**
    current; hides the recipient only, so it is always paired with something
    that hides the sender

## 18.7 Rings, key images and RingCT

*Level: intermediate.*

Stealth addresses hide who is paid. They do nothing for the payer: when Alice
spends the output $P = 10$, a plain signature would show that this transaction
spends that output, and the graph of §18.2 is back. CryptoNote's second idea hides
the spender in a crowd. Each input lists a **ring**: the real output being spent
plus several other outputs taken from the chain as **decoys**. It carries a
**ring signature** ([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)
§14.7), which proves that the signer holds the secret key of one ring member
without saying which. An observer sees that one of, say, sixteen outputs was
spent, and cannot tell which.

### The double-spending problem returns

A ring signature is unconditionally anonymous, and that is a problem for money.
If nobody can tell which output was spent, nobody can tell when the same output
is spent twice. The fix is the **key image** of
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md): a deterministic
tag computed from the one-time secret,

$$
I = H_p(P)^{x},
$$

where $H_p$ hashes a public key to a group element whose discrete logarithm
nobody knows. The ring signature is extended (as a **linkable** ring signature)
to prove that $I$ was made with the same $x$ as one of the ring's keys. The
network keeps the set of all key images ever used and refuses a transaction whose
image is already in it. The same output always gives the same image, whatever
decoys surround it; different outputs give unrelated images.

Why $H_p(P)$ and not simply $g$? Because $g^x$ is $P$ itself: the "image" would
name the output being spent, and the ring would hide nothing. With a base whose
logarithm is unknown, $I$ reveals nothing about which $P$ it belongs to (under the
decisional Diffie-Hellman assumption) while still being fixed by $x$.

By hand, continuing §18.6: Alice's one-time key is $P = 10$ with secret $x = 21$.
The code's hash-to-group (hash, reduce mod 467, square, so that the result lands in
the order-233 subgroup) sends $10$ to $H_p(10) = 27$, and her key image is
$27^{21} \bmod 467 = 152$. Whatever ring she uses, spending this output publishes
152.

### Code it: same key, same image

The ring signature itself is coded in
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md); here a comment
stands in for it, and the code shows what the key image adds.

```python
import hashlib

p, q, g = 467, 233, 4                      # toy group; Monero uses ed25519

def Hp(P):                                 # hash a key to a group element
    h = int.from_bytes(hashlib.sha256(b"Hp|%d" % P).digest(), "big") % p
    return h * h % p or 1                  # squaring lands in the order-q subgroup

def key_image(x):
    P = pow(g, x, p)
    return pow(Hp(P), x, p)                # I = Hp(P)^x

class Ledger:
    def __init__(self):
        self.images = set()
    def spend(self, ring, image):
        # A real node first checks the linkable ring signature (Chapter 14):
        # "the signer knows x for one key in the ring, and image = Hp(that key)^x".
        if image in self.images:
            return "REFUSED: key image already used"
        self.images.add(image)
        return "accepted"

x_alice = 21                               # the one-time secret from the stealth payment
P_alice = pow(g, x_alice, p)
decoys1, decoys2 = [90, 123, 448], [449, 317, 151]   # other users' keys
I = key_image(x_alice)
print("one-time key P =", P_alice, " Hp(P) =", Hp(P_alice), " key image I =", I)

chain = Ledger()
print("spend 1, ring", sorted(decoys1 + [P_alice]), ":", chain.spend(decoys1 + [P_alice], I))
print("spend 2, ring", sorted(decoys2 + [P_alice]), ":", chain.spend(decoys2 + [P_alice], I))
print("another key, x = 50:", chain.spend([P_alice, 90], key_image(50)))

# Break it: with base g instead of Hp(P), the "image" is g^x = P itself.
print("image with base g:", pow(g, x_alice, p), "== P:", pow(g, x_alice, p) == P_alice)
```

It prints:

```
one-time key P = 10  Hp(P) = 27  key image I = 152
spend 1, ring [10, 90, 123, 448] : accepted
spend 2, ring [10, 151, 317, 449] : REFUSED: key image already used
another key, x = 50: accepted
image with base g: 10 == P: True
```

The second spend hides Alice's output among different decoys, and it does not
matter: the image is the same 152. The third line is a different owner whose ring
happens to include Alice's key: a different secret, a different image, accepted.
The last line is the Break it: the obvious base would publish $P$ itself.

### RingCT: hiding the amounts too

Early CryptoNote showed amounts in the clear, and that forced a bad compromise:
decoys had to be outputs of the *same amount* as the real one, which for unusual
amounts meant few or no decoys at all. Shen Noether's **Ring Confidential
Transactions** (2015) combined the rings with the Pedersen commitments of §18.5.
Each input's ring now includes each member's amount commitment, and the
signature proves, at the same position for both, that the signer knows the key
*and* that a fresh "pseudo-output" commitment hides the same amount as that
member's commitment. The pseudo-outputs then balance the transaction's outputs,
and range proofs show nothing is negative. Any RingCT output can now be a decoy
for any other.

RingCT became available in Monero in January 2017 and mandatory in September
2017. Its signatures were MLSAG ("multilayered linkable spontaneous anonymous
group"), replaced by the shorter CLSAG in October 2020; its range proofs became
Bulletproofs in October 2018 and Bulletproofs+ in August 2022
([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md) tells that story).

### How big a crowd

The minimum ring size grew as researchers showed small rings were too small:

| Since | Ring size (real plus decoys) |
|---|---|
| 2014 (launch) | any, including 1: no decoys at all |
| 2016 | at least 3 |
| September 2017 | at least 5, with RingCT required |
| April 2018 | at least 7 |
| October 2018 | exactly 11 |
| August 2022 | exactly 16 |

Making the ring size fixed rather than a minimum (2018) was itself a privacy
fix: a user who chose an unusual ring size stood out.

!!! note "Life story: Monero"
    **Born:** 18 April 2014, as BitMonero, a fork of the CryptoNote coin
    Bytecoin, soon renamed Monero · **Purpose:** private by default: stealth
    addresses for recipients, linkable ring signatures with key images for
    senders, RingCT for amounts (January 2017, mandatory September 2017) ·
    **Helped:** the largest privacy coin by use; research on decoys, range proofs
    (Bulletproofs, 2018) and compact ring signatures (CLSAG, 2020); also ransomware
    and darknet payments, which brought delistings from many exchanges ·
    **Status:** current with rings of 16; full-chain membership proofs (FCMP++)
    were on a test network in October 2026, with no mainnet date set as of
    November 2026

## 18.8 How the rings were traced

*Level: intermediate.*

A ring of eleven sounds like an anonymity set of eleven. In 2017 two research
groups showed independently that, for most of Monero's history up to then, the
real number was closer to one.

### Zero decoys poison everyone else's rings

Until 2016, Monero allowed transactions with no decoys at all, and many wallets
and exchanges made them, because they were cheaper. An input with a ring of one
shows exactly which output it spends. That output is then known to be spent. But
the same output may also have been picked as a decoy in other people's rings,
and there it is now known to be a decoy, because an output can be spent only
once. Remove it, and some of those rings shrink to one member, which reveals
*their* real spend, which removes more decoys elsewhere. Malte Möser and his
coauthors called this a **chain reaction**.

### By hand

Seven inputs, eight outputs; one output in each ring is real:

| Input | Ring |
|---|---|
| in1 | o1 |
| in2 | o1, o4 |
| in3 | o4, o2, o6 |
| in4 | o2, o5 |
| in5 | o3 |
| in6 | o3, o5 |
| in7 | o6, o7, o8 |

in1 has no decoys: it spends o1. So o1 is a decoy in in2, which must spend o4.
in5 spends o3, so in6 spends o5. Then o5 is a decoy in in4, which spends o2, and
with o4 and o2 gone, in3 spends o6. Only in7 keeps any doubt, between o7 and o8,
down from three because o6 was eliminated. Two careless zero-decoy spends traced
six of seven inputs.

### Code it

```python
# Each input's ring: the outputs it might be spending. One of each is real.
RINGS = {
    "in1": ["o1"],                       # zero mixins: the ring is the real output
    "in2": ["o1", "o4"],
    "in3": ["o4", "o2", "o6"],
    "in4": ["o2", "o5"],
    "in5": ["o3"],                       # zero mixins
    "in6": ["o3", "o5"],
    "in7": ["o6", "o7", "o8"],
}

def chain_reaction(rings):
    rings = {k: list(v) for k, v in rings.items()}
    spent, step = {}, 0
    changed = True
    while changed:
        changed = False
        for inp, ring in rings.items():
            if inp not in spent and len(ring) == 1:
                out = ring[0]
                spent[inp] = out
                step += 1
                print(f"  step {step}: {inp} must spend {out}")
                for other, r in rings.items():   # an output is spent only once
                    if other != inp and out in r:
                        r.remove(out)
                changed = True
    return spent, rings

spent, left = chain_reaction(RINGS)
print("traced", len(spent), "of", len(RINGS), "inputs")
for inp in RINGS:
    if inp not in spent:
        print("  still hidden:", inp, "among", left[inp])
```

It prints:

```
  step 1: in1 must spend o1
  step 2: in2 must spend o4
  step 3: in5 must spend o3
  step 4: in6 must spend o5
  step 5: in4 must spend o2
  step 6: in3 must spend o6
traced 6 of 7 inputs
  still hidden: in7 among ['o7', 'o8']
```

### The two papers

Amrit Kumar, Clément Fischer, Shruti Tople and Prateek Saxena ("A Traceability
Analysis of Monero's Blockchain", ESORICS 2017) ran this kind of elimination,
together with other heuristics, on the real chain, and reported that in 87
percent of the cases they analyzed the real output being spent could be
identified with certainty. Malte Möser, Kyle Soska and colleagues ("An Empirical
Analysis of Traceability in the Monero Blockchain", posted in April 2017,
published at PETS 2018) found that about 62 percent of inputs *with* one or more
decoys were deducible by the chain reaction alone.

Möser's paper found a second, subtler leak. Wallets chose decoys uniformly from
the whole history, but people tend to spend coins they received recently. So in a
ring of mostly old outputs and one new one, the new one is usually real: the
"guess the newest" rule was right over 90 percent of the time where it could be
checked, and they estimated about 80 percent over all inputs with decoys.
Kumar's group reported the same pattern among the inputs they could trace. A decoy is only useful if it looks like a real spend, and a real
spend has a typical age.

### What changed

Monero had already raised the minimum ring size and made RingCT mandatory in
2017; since RingCT outputs could only be mixed with other RingCT outputs, the
poisoned zero-decoy history was cut off from new rings. In 2018 it changed decoy
selection to follow the observed age of real spends (a gamma distribution, as
Möser's paper proposed), so the newest member of a ring is no longer a good guess.
Fixed ring sizes of 11 and then 16 followed. The papers did not break the
cryptography; every ring signature was sound. They broke the assumption that the
decoys were indistinguishable from the real thing.

Later research kept finding statistical leaks of the same kind: decoys selected
by a wallet bug, the "Eve-Alice-Eve" pattern in which an adversary who both pays
Alice and receives from her can spot its own outputs among her decoys, and floods
of cheap transactions that, if an adversary created them, would make many decoys
the adversary's own outputs, which it can rule out. An unusual surge of such
transactions in early 2024 was widely discussed as a possible attack of this
kind; whether it was one has not been established publicly.

The structural answer is to stop choosing decoys at all. Monero's planned
**FCMP++** (full-chain membership proofs) replaces the ring with a zero-knowledge
proof that the spent output is *somewhere* in the set of all outputs on the
chain, an anonymity set of every output ever made instead of fifteen chosen
decoys. As of November 2026 it was
running on a test network (forked there in October 2026), and its mainnet
activation had not been scheduled; developers' tentative plans pointed to 2027.
That is the same move Zcash made from the start, and the subject of the next
section.

!!! note "Life story: the Monero traceability papers"
    **Born:** April 2017, two independent studies: Kumar, Fischer, Tople and
    Saxena (ESORICS 2017) and Möser, Soska et al. (PETS 2018) · **Purpose:**
    measure how anonymous Monero's rings really were · **Helped:** showed that
    zero-decoy transactions and uniform decoy selection let most early inputs
    be traced; led to mandatory minimum rings, age-matched decoy selection
    (2018) and fixed ring sizes · **Status:** the lesson stands: a decoy must be
    indistinguishable from a real spend, and statistics, not cryptanalysis,
    find the difference

## 18.9 Zcash: hiding the whole transaction

*Level: intermediate.*

Monero hides a spend among a handful of decoys and spends years learning which
decoys are convincing. A group of cryptographers at Johns Hopkins, the Technion,
MIT and Tel Aviv University took the other road: prove, in zero knowledge, that a
spend is valid, and publish nothing else. The anonymity set is then every coin in
the pool.

The first step was **Zerocoin** (Ian Miers, Christina Garman, Matthew Green and
Aviel Rubin, IEEE Security and Privacy 2013), which let a Bitcoin user turn a coin
into an anonymous token of fixed value and back, with an RSA accumulator and a
proof of tens of kilobytes. The second was **Zerocash** (Eli Ben-Sasson,
Alessandro Chiesa, Christina Garman, Matthew Green, Ian Miers, Eran Tromer and
Madars Virza, IEEE Security and Privacy 2014), which used the then-new SNARKs of
[Chapter 7](07-SNARKs.md) to hide sender, receiver and amount in a proof of a few
hundred bytes.

### Notes, commitments and nullifiers

In Zerocash, value lives in **notes**. A note says, in effect, "$v$ coins
belong to the holder of key $a_{pk}$", with a random serial $\rho$ and
randomness $r$. The ledger never sees a note. It sees a **commitment** to it,
$cm = \mathrm{Commit}_r(a_{pk}, v, \rho)$ ([Chapter 3](03-Commitments.md)), and
every commitment ever made goes into one append-only Merkle tree.

To spend a note, the owner publishes:

- its **nullifier** $nf = \mathrm{PRF}_{a_{sk}}(\rho)$, a value fixed by the
  note and the owner's secret key but unlinkable to the commitment;
- commitments to the new notes being created (the payment and any change),
  encrypted to their recipients so they can find them;
- a SNARK proving: "there is a commitment in the tree with root $rt$ whose
  opening I know; I hold its spending key; $nf$ is that note's nullifier; and the
  values of the notes I destroy equal the values of the notes I create plus the
  public fee".

The network checks the proof, checks that $rt$ is a real past root, and checks
that $nf$ has never appeared before. That last check is the key image of §18.7
again: the same note always gives the same nullifier, so it cannot be spent twice,
but the nullifier says nothing about which commitment it belongs to. Nobody
watching can link a spend to the deposit that created it, among all the notes in
the tree.

### Zcash's pools

Zcash launched on 28 October 2016, built by the company that became the Electric
Coin Company, led by Zooko Wilcox-O'Hearn. It kept a Bitcoin-style **transparent**
part (t-addresses, public amounts) beside the **shielded** part, and over the
years the shielded part was rebuilt three times, each as a separate **pool**
with its own tree and its own nullifier set:

- **Sprout** (2016) proved its "JoinSplit" statements with the BCTV14 SNARK over
  BN254. A shielded transaction took tens of seconds and gigabytes of memory to
  prove, which ruled out phones. Its trusted-setup ceremony is in
  [Chapter 3](03-Commitments.md); the flaw in its parameters, found in 2018 and
  disclosed in 2019, is in [Chapter 7](07-SNARKs.md).
- **Sapling** (activated 28 October 2018) moved to Groth16 over BLS12-381, with
  separate spend and output proofs; proving dropped to a few seconds and tens of
  megabytes, and shielded payments on phones became possible. It also introduced
  the key structure that makes viewing keys practical.
- **Orchard** (Network Upgrade 5, 31 May 2022) moved to Halo 2 over the Pallas
  and Vesta curves, with no trusted setup at all
  ([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)), and **unified
  addresses** that bundle receivers for several pools in one string.

The pools are walled off from each other: value moves between them only through a
**turnstile**, a transaction whose amount crossing the wall is public. Zcash's
consensus rules track each pool's total and refuse any transaction that would
make it negative (ZIP 209). That rule is what bounded the damage of every
soundness flaw: counterfeit notes inside a pool can never leave it in excess of
the value honestly put in. It was used in anger in 2026. After a soundness flaw
was reported in the Orchard circuit on 29 May 2026 (the story is in
[Chapter 7](07-SNARKs.md)), Zcash disabled and then patched Orchard in June, and on
28 July 2026 the NU6.3 upgrade opened a new pool, **Ironwood**, running the
corrected circuit with its own tree. Orchard was sealed: its notes can only leave,
through a turnstile, so if anyone had counterfeited coins inside it, the excess
could never get out. Because shielded transactions hide their details, nobody
can prove whether the flaw was ever exploited; the turnstile makes the answer
matter less.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Zcash's transparent part and four shielded pools, with value crossing between them only through turnstiles" fill="currentColor" font-size="14">
<defs><marker id="ar185" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="105" width="150" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="95" y="135" text-anchor="middle" font-weight="bold">transparent</text>
<text x="95" y="157" text-anchor="middle">public, like Bitcoin</text>
<rect x="400" y="20" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>
<text x="500" y="42" text-anchor="middle">Sprout (2016)</text>
<text x="500" y="61" text-anchor="middle" font-size="12">closed to new deposits</text>
<rect x="400" y="85" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="500" y="107" text-anchor="middle">Sapling (2018)</text>
<text x="500" y="126" text-anchor="middle" font-size="12">Groth16, BLS12-381</text>
<rect x="400" y="150" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>
<text x="500" y="172" text-anchor="middle">Orchard (2022)</text>
<text x="500" y="191" text-anchor="middle" font-size="12">sealed July 2026: exits only</text>
<rect x="400" y="215" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="500" y="237" text-anchor="middle" font-weight="bold">Ironwood (2026)</text>
<text x="500" y="256" text-anchor="middle" font-size="12">Halo 2, corrected circuit</text>
<line x1="170" y1="130" x2="396" y2="110" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar185)"/>
<line x1="396" y1="118" x2="174" y2="140" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar185)"/>
<line x1="170" y1="165" x2="396" y2="238" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar185)"/>
<line x1="396" y1="248" x2="174" y2="175" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar185)"/>
<line x1="610" y1="180" x2="610" y2="230" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#ar185)"/>
<text x="280" y="105" text-anchor="middle" font-size="12">turnstile: amount public</text>
<text x="252" y="232" text-anchor="middle" font-size="12">turnstile</text>
<text x="200" y="278" opacity="0.75">each pool: its own tree, nullifiers and public total</text>
</svg>
<figcaption>Figure 18.5. Zcash's pools. Inside a shielded pool, sender, receiver and amount are hidden; every crossing of a wall shows its amount, and each pool's public total can never go negative. Orchard's notes now leave only through a turnstile, into Ironwood or the transparent part.</figcaption>
</figure>

### Why most of the value stayed transparent

Zcash's cryptography gave every shielded note an anonymity set of the whole pool.
Its users mostly did not use it. For years most exchanges supported only
t-addresses, Sprout's proving cost kept wallets transparent, and mining rewards
arrived transparent. Shielding was optional, and an option most people did not
take.

George Kappos, Haaroon Yousaf, Mary Maller and Sarah Meiklejohn measured the
result in "An Empirical Analysis of Anonymity in Zcash" (USENIX Security 2018).
The large majority of transactions never touched the shielded pool. Of the value
that did, much came from miners and from the founders' reward, deposited and
withdrawn in recognizable patterns; simple heuristics linked many withdrawals to
their deposits and shrank the effective anonymity set well below the pool's
size. The simplest heuristic is the one of §18.4: a transparent deposit of
12.3456 coins and a transparent withdrawal of 12.3455 an hour later, with a
public amount at each turnstile, are almost certainly the same money. A shielded
pool hides only what stays inside it.

The picture changed slowly. Sapling made shielding cheap; wallets began to shield
by default; exchanges added shielded withdrawals. By the end of 2025 analysts
reported that about 30 percent of all ZEC sat in shielded pools, up from well
under a fifth for most of the coin's earlier history, and the share stayed close
to 30 percent through 2026 (figures differ by source and by date, and by whether
total or circulating supply is the denominator).

### Viewing keys: privacy with an audit door

Sapling and Orchard split an owner's keys like Monero's view and spend keys, but
finer. An **incoming viewing key** lets its holder see the notes that arrive at an
address and their memos, but not spend them or see where they go. A **full
viewing key** also lets its holder recognize the owner's nullifiers, and so see
outgoing payments: a complete statement of the account, without spending power.
A business can hand a full viewing key to its auditor, or an incoming viewing key
to a tax office, for one address and nothing else. This is **selective
disclosure**: the default is private, and the owner decides who sees what.
Regulators who object that shielded money cannot be audited are partly answered
by it; what it cannot do is force disclosure on someone who will not cooperate,
which is the heart of the policy argument in §18.13.

!!! note "Life story: Zcash"
    **Born:** Zerocoin (2013) and Zerocash (2014) papers; launched 28 October 2016
    · **Purpose:** payments whose sender, receiver and amount are hidden by a
    zero-knowledge proof, with the whole pool as the anonymity set ·
    **Helped:** the first large SNARK deployment; trusted-setup ceremonies,
    Groth16 (Sapling, 2018), Halo 2 without setup (Orchard, 2022), viewing keys
    for audits; turnstiles that bounded two soundness flaws · **Status:**
    current; about 30 percent of ZEC shielded in 2025 and 2026; Orchard sealed
    and Ironwood opened on 28 July 2026 after the Orchard circuit flaw

## 18.10 Tornado Cash: a mixer made of code

*Level: intermediate.*

Ethereum accounts are reused by design: an account is one address with one
balance, not a scatter of change outputs, so every payment from it is linked to
every other. Tornado Cash, launched on Ethereum in 2019 by Roman Semenov, Roman
Storm and Alexey Pertsev, took the Zerocash idea and stripped it to its core:
a smart contract that accepts deposits of one fixed amount and pays them out to
anyone who proves, in zero knowledge, that they made one of the deposits. There
are no amounts to hide (every deposit in a pool is the same: 0.1, 1, 10 or 100
ether in the main pools) and no recipients to hide (the withdrawal goes to a
fresh address). What is hidden is the *link*.

### How it works

<div class="mars-steps" markdown>

1. **Deposit.** The user picks two random 31-byte values, a **nullifier** $k$ and
   a **secret** $s$, and keeps them as a **note** (a string the user must not
   lose). The commitment $C = H(k \parallel s)$ is sent to the contract with, say,
   exactly 1 ether. The contract adds $C$ as the next leaf of a Merkle tree of
   depth 20 (room for about a million deposits) and remembers the new root.
2. **Wait.** Other people deposit. The longer the wait, the more leaves the
   withdrawal could have come from.
3. **Withdraw.** From a fresh address, or through a **relayer** who pays the
   transaction fee so the fresh address needs no funding, the user submits a
   recent root $rt$, the **nullifier hash** $H(k)$, the recipient address, and a
   SNARK proving: "I know $k$, $s$ and a Merkle path such that $H(k \parallel s)$
   is a leaf of the tree with root $rt$, and the nullifier hash is $H(k)$."
4. **Pay.** The contract checks that $rt$ is one of its recent roots, that $H(k)$
   has not been used before, and that the proof verifies. It records $H(k)$ and
   pays 1 ether, minus the relayer's fee, to the recipient.

</div>

The real circuit was written in Circom, used a Pedersen hash for commitments and
MiMC for the tree, and was proved with Groth16 after a public trusted-setup
ceremony ([Chapter 7](07-SNARKs.md) tells how a missing constraint in its MiMC
template nearly let anyone drain it in 2019). The recipient, relayer and fee are
public inputs to the proof, so a front-runner who copies a pending withdrawal
cannot redirect it.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Deposits from known addresses go into a Merkle tree in the contract; a withdrawal with a root, nullifier hash and proof pays a fresh address" fill="currentColor" font-size="14">
<defs><marker id="ar186" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="54">address 1</text>
<text x="20" y="104">address 2</text>
<text x="20" y="154">address 3</text>
<text x="20" y="204">address 4</text>
<line x1="95" y1="50" x2="196" y2="95" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar186)"/>
<line x1="95" y1="100" x2="196" y2="115" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar186)"/>
<line x1="95" y1="150" x2="196" y2="135" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar186)"/>
<line x1="95" y1="200" x2="196" y2="155" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar186)"/>
<text x="145" y="240" text-anchor="middle" font-size="12">deposit C = H(k‖s)</text>
<text x="145" y="256" text-anchor="middle" font-size="12">and 1 ether each</text>
<rect x="200" y="60" width="220" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="310" y="82" text-anchor="middle" font-weight="bold">pool contract</text>
<line x1="310" y1="100" x2="260" y2="135" stroke="currentColor" stroke-width="1.2"/>
<line x1="310" y1="100" x2="360" y2="135" stroke="currentColor" stroke-width="1.2"/>
<text x="310" y="98" text-anchor="middle" font-size="12">root</text>
<text x="235" y="160" font-size="12">C1</text>
<text x="267" y="160" font-size="12">C2</text>
<text x="335" y="160" font-size="12">C3</text>
<text x="367" y="160" font-size="12">C4</text>
<text x="310" y="196" text-anchor="middle" font-size="12">spent: H(k) list</text>
<line x1="424" y1="135" x2="520" y2="135" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar186)"/>
<text x="472" y="112" text-anchor="middle" font-size="12">via relayer:</text>
<text x="472" y="160" text-anchor="middle" font-size="12">root, H(k),</text>
<text x="472" y="176" text-anchor="middle" font-size="12">recipient, proof</text>
<text x="528" y="140">fresh</text>
<text x="528" y="158">address</text>
<text x="320" y="288" text-anchor="middle" opacity="0.75">the proof says "one of C1 to C4", never which</text>
</svg>
<figcaption>Figure 18.6. A Tornado Cash style pool. Deposits are public and come from known addresses; the withdrawal shows only a root, a nullifier hash and a proof, so it could belong to any deposit in the tree.</figcaption>
</figure>

### By hand: a pool of four

Four people deposit 1 ether each; the tree has leaves $C_1, \dots, C_4$ and root
$rt = H(H(C_1, C_2), H(C_3, C_4))$. Bea made deposit 3 with note $(k_3, s_3)$.
To withdraw, her Merkle path is $C_4$ (the sibling of her leaf) and
$H(C_1, C_2)$ (the sibling one level up). The statement she proves is about
$rt$ and $H(k_3)$; the path and the note stay in her wallet. The contract learns
that *some* leaf of four was spent, and records $H(k_3)$. If she tries to
withdraw again with the same note, the nullifier hash is the same and the
contract refuses. If she tries with a made-up note, no path leads from
$H(k \parallel s)$ to $rt$, and no valid proof exists.

### Code it: a toy pool

The standard library has no SNARK. The code below keeps everything else real (the
commitments, the Merkle tree, the nullifier list, the contract's checks) and
replaces the proof with a **trusted checker**: a function that is allowed to see
the witness, checks the same statement the SNARK circuit would, and signs only
the public statement with a key the contract trusts. This is exactly what a
SNARK removes. With a real proof there is no checker, nobody sees the witness,
and anyone can verify; here you must trust the checker not to lie or to talk.
Treat it as a model of the logic, not of the privacy.

```python
import hashlib, hmac, random

def H(*parts):
    return hashlib.sha256(b"|".join(parts)).digest()

DEPTH = 3                                    # 8 leaves; Tornado Cash used 20
EMPTY = H(b"empty")

def root_and_path(leaves, index):
    level = leaves + [EMPTY] * (2 ** DEPTH - len(leaves))
    path = []
    for _ in range(DEPTH):
        path.append(level[index ^ 1])        # the sibling at this level
        level = [H(level[i], level[i + 1]) for i in range(0, len(level), 2)]
        index //= 2
    return level[0], path

# ---- The stand-in for the zero-knowledge proof --------------------------
# A SNARK would let the user prove the statement without showing the witness.
# The standard library has no SNARK, so a TRUSTED CHECKER plays its part: it
# sees the witness, checks it, and signs only the public statement.
CHECKER_KEY = b"held by the trusted checker only"

def trusted_checker(statement, witness):
    root, nullifier_hash, recipient = statement
    nullifier, secret, index, path = witness
    node = H(nullifier, secret)              # the commitment (the leaf)
    for sibling in path:
        node = H(node, sibling) if index % 2 == 0 else H(sibling, node)
        index //= 2
    if node != root or H(nullifier) != nullifier_hash:
        return None
    return hmac.new(CHECKER_KEY, b"".join(statement), "sha256").digest()

def checker_says_yes(statement, proof):      # what the contract can verify
    good = hmac.new(CHECKER_KEY, b"".join(statement), "sha256").digest()
    return proof is not None and hmac.compare_digest(proof, good)
# --------------------------------------------------------------------------

class Mixer:
    def __init__(self, check_nullifiers=True):
        self.leaves, self.roots, self.spent = [], set(), set()
        self.check_nullifiers = check_nullifiers
    def deposit(self, commitment):           # 1 coin, a fixed denomination
        self.leaves.append(commitment)
        self.roots.add(root_and_path(self.leaves, 0)[0])
        return len(self.leaves) - 1
    def withdraw(self, root, nullifier_hash, recipient, proof):
        if root not in self.roots:
            return "refused: unknown root"
        if self.check_nullifiers and nullifier_hash in self.spent:
            return "refused: nullifier already spent"
        if not checker_says_yes((root, nullifier_hash, recipient), proof):
            return "refused: bad proof"
        self.spent.add(nullifier_hash)
        return "paid 1 coin to " + recipient.decode()

def rand16():                                # random is for the demo; use secrets
    return bytes(random.getrandbits(8) for _ in range(16))

def make_note():                             # (nullifier, secret)
    return rand16(), rand16()

def withdraw_with(mixer, note, index, recipient):
    nullifier, secret = note
    root, path = root_and_path(mixer.leaves, index)
    statement = (root, H(nullifier), recipient)
    proof = trusted_checker(statement, (nullifier, secret, index, path))
    return mixer.withdraw(*statement, proof)

random.seed(2019)
for check in (True, False):
    m = Mixer(check_nullifiers=check)
    notes = [make_note() for _ in range(5)]
    for n in notes:
        m.deposit(H(*n))
    print("nullifier check on:" if check else "nullifier check forgotten:")
    print("  ", withdraw_with(m, notes[2], 2, b"fresh-address-1"))
    print("  ", withdraw_with(m, notes[2], 2, b"fresh-address-2"))
    print("  ", withdraw_with(m, make_note(), 2, b"thief"))
```

It prints:

```
nullifier check on:
   paid 1 coin to fresh-address-1
   refused: nullifier already spent
   refused: bad proof
nullifier check forgotten:
   paid 1 coin to fresh-address-1
   paid 1 coin to fresh-address-2
   refused: bad proof
```

Read the three lines of each run. An honest withdrawal works. A second
withdrawal with the same note is stopped only by the nullifier list: in the
second run, where the contract forgets to check it, the same deposit pays out
twice, and the pool is now short one coin that some honest depositor will never
get back. A made-up note fails because no Merkle path leads from its commitment
to any root. Notice also what `withdraw` receives: a root, a hash and a
signature. The index 2 and the note never reach the contract.

### Break it: an anonymity set of one

The cryptography of a pool like this is sound; its users often are not. The
anonymity set of a withdrawal is the set of deposits it could plausibly have
come from, and studies of Tornado Cash (Béres and colleagues, 2021; the Tutela
tool by Wu and colleagues, 2021) found ways to shrink it that need no
cryptanalysis:

- **The same address** deposits and later receives the withdrawal. It happened.
- **Timing:** a deposit to a quiet pool followed minutes later by a withdrawal,
  with no deposits between, has an anonymity set of one.
- **Linked addresses:** the fresh address is funded for gas from the depositing
  address, or later sends money back to it.
- **Fingerprints:** an unusual gas price or wallet setting used for both the
  deposit and the withdrawal.
- **Multi-denomination patterns:** depositing 3 × 10 and 2 × 1 ether and
  withdrawing the same mix at the same time.

The fixed denomination solves the amount problem of §18.4; nothing in the
contract can solve the behavior problem.

!!! note "Life story: Tornado Cash"
    **Born:** 2019, on Ethereum, by Roman Semenov, Roman Storm and Alexey
    Pertsev; core contracts made unchangeable in 2020 · **Purpose:** break the
    link between a deposit and a withdrawal of one fixed amount, with a Groth16
    proof of membership and a nullifier against double withdrawal ·
    **Helped:** ordinary users wanting privacy on a fully public chain, and
    also, by the US Treasury's count, the laundering of billions, including
    North Korean thefts · **Status:** the contracts still run, because nobody
    can stop them; sanctioned in August 2022 and delisted in March 2025; its
    developers' criminal cases continue (§18.11)

## 18.11 Tornado Cash in court, and the thieves it served

*Level: intermediate.*

A Tornado Cash pool is code on a public chain. Once its developers gave up the
ability to change it, there was no operator to subpoena, no server to seize and
no switch to turn off. That raised a question no court had faced: what can a
government do about software that nobody controls?

### The thieves

The case for doing something was made by the users the developers least wanted.
On 23 March 2022 attackers took about 173,600 ether and 25.5 million USDC, some
\$625 million, from the Ronin bridge of the game Axie Infinity
([Chapter 17](17-Consensus-and-Smart-Contracts.md) tells how its validator keys
fell). In April the FBI attributed the theft to North Korea's Lazarus Group, and
much of the ether went through Tornado Cash. On 8 August 2022 the US Treasury's
Office of Foreign Assets Control (OFAC) added Tornado Cash and dozens of its
contract addresses to its sanctions list, saying it had been used to launder more
than \$7 billion since 2019, including over \$455 million stolen by Lazarus. Any
US person who interacted with the contracts now risked breaking sanctions law.
Circle froze the USDC held by the listed addresses, GitHub removed the project's
repository and suspended its developers' accounts, and some front-end and node
providers began blocking the addresses.

The counterpoint to that counterpoint arrived in February 2025. On 21 February
attackers took about 401,000 ether, roughly \$1.5 billion, from the exchange
Bybit, by tampering with the signing interface its staff used to approve a
routine transfer from a multisignature cold wallet: the largest theft in the
history of cryptocurrency. The FBI attributed it to North Korea's "TraderTraitor"
operators, part of the same Lazarus cluster, within days. With Tornado Cash under
sanctions, the thieves barely needed a mixer. They split the coins across
thousands of addresses and swapped much of the ether into bitcoin through
cross-chain services such as THORChain within about ten days. Analysts followed
nearly all of it in public; by Bybit's own count a month later, most of the
stolen funds were still traceable, about a fifth had "gone dark" and only a few
percent had been frozen. Tracing is not recovery: the ledger shows where the
money went, and that helps only where someone at the destination will act.

!!! note "Life story: the Bybit theft"
    **Born:** 21 February 2025, an attack on the signing process of Bybit's
    Ethereum cold wallet · **Purpose:** theft of about 401,000 ether (about
    \$1.5 billion) for North Korea, attributed by the FBI to TraderTraitor
    (Lazarus) · **Helped:** the clearest demonstration that public tracing and
    actual recovery are different things; the money moved through cross-chain
    swaps, not mixers · **Status:** the largest cryptocurrency theft on record;
    most funds traced, a small share frozen

### The courts

Three sets of cases followed the sanctions.

**The developers in the Netherlands.** Alexey Pertsev was arrested in Amsterdam
on 10 August 2022. On 14 May 2024 a Dutch court in 's-Hertogenbosch convicted him
of laundering about \$1.2 billion of criminal proceeds through Tornado Cash and
sentenced him to 64 months in prison, reasoning that the developers had built and
run a system they knew was used for laundering and had not added means to stop
it. He appealed; he was released from detention to await the appeal under
electronic monitoring, and as far as public reports show, the appeal had not been
decided as of November 2026.

**The developers in the United States.** In August 2023 US prosecutors in New
York charged Roman Storm and Roman Semenov with conspiracy to commit money
laundering, conspiracy to operate an unlicensed money-transmitting business and
conspiracy to violate sanctions. Semenov, who is outside the United States,
remains at large and on the sanctions list. Storm was tried in July 2025. On
6 August 2025 the jury convicted him of the unlicensed-money-transmitting
conspiracy (a maximum of five years) and could not agree on the laundering and
sanctions counts. His motion for acquittal, filed in September 2025 and argued
in April 2026, was still undecided in late 2026; on 25 August 2026 the judge
moved the retrial on the deadlocked counts to 26 April 2027. As of November 2026
he had not been sentenced. In between, in August 2025, a senior Justice
Department official said the department would not use the
unlicensed-money-transmitting law against developers of truly decentralized,
non-custodial software who lack criminal intent; how that squares with the
Storm prosecution is part of what the court is still deciding.

**The users against the Treasury.** Six Tornado Cash users, backed by Coinbase,
sued the Treasury in Texas, arguing that sanctions law lets OFAC block
*property* of a foreign person, and that an immutable smart contract is nobody's
property. They lost in the district court in 2023. On 26 November 2024 the US
Court of Appeals for the Fifth Circuit reversed, in *Van Loon v. Department of the
Treasury*: the immutable contracts cannot be owned, controlled or excluded from
use by anyone, so they are not "property" under the International Emergency
Economic Powers Act, and OFAC had exceeded its authority in listing them. The
ruling did not say that Tornado Cash was harmless or that its developers were
innocent; it said that this particular law does not reach code nobody owns. On
21 March 2025 the Treasury removed Tornado Cash from the sanctions list, saying
it was using its discretion, while keeping Semenov listed. A parallel challenge
in Florida (*Coin Center v. Yellen*) was then treated as moot.

!!! note "Life story: Van Loon v. Department of the Treasury"
    **Born:** 2022, a suit by six Tornado Cash users backed by Coinbase,
    after the sanctions of 8 August 2022 · **Purpose:** decide whether a
    government can sanction an immutable smart contract as "property" ·
    **Helped:** the Fifth Circuit's ruling of 26 November 2024 that immutable
    contracts are not property under IEEPA, and the delisting of 21 March 2025
    · **Status:** binding only in the Fifth Circuit and only on that statute; it
    left the developers' criminal cases untouched

The cases separate three questions that are easy to blur. Is it legal to *use*
a privacy tool? (In the United States, yes again, for Tornado Cash, since March
2025.) Is it legal to *write and publish* one? (Code has been treated as speech
in American courts since the cryptography export cases of the 1990s, but the
prosecutions say the developers did more than publish code.) And is someone who
*runs a service* around it, a website, a relayer network, a coordinator, a money
transmitter with duties to know its customers? The Samourai pleas (§18.4) and the
Storm verdict both landed on that third question.

## 18.12 Privacy pools and association sets

*Level: intermediate.*

The Tornado Cash story looks like a forced choice: either a pool accepts anyone,
and thieves' coins mix with everyone else's, or someone controls who gets in,
and the privacy depends on trusting them. In September 2023 Vitalik Buterin,
Jacob Illum, Matthias Nadler, Fabian Schär and Ameen Soleimani proposed a way
between in "Blockchain Privacy and Regulatory Compliance: Towards a Practical
Equilibrium".

The idea is to add one clause to the withdrawal proof. Besides "my deposit is in
the pool", the user proves "my deposit is in this **association set**", a subset
of deposits published as its own Merkle root. The set might be "all deposits
except those traced to known thefts" (an exclusion list) or "deposits from
addresses that passed a check" (an inclusion list). Anyone may publish a set,
and each withdrawal names the one it uses. The proof still does not say *which*
deposit is being withdrawn; it narrows the anonymity set from the pool to the
association set, and it lets the withdrawer show, publicly, that their money is
not from the listed thefts.

The authors argue this leads to a **separating equilibrium**. Honest users all
choose sets that exclude known thefts; a thief cannot prove membership in them,
so the thief's withdrawals stand out by using a bad set or a tiny one. The pool
stays open, nobody holds custody, and the honest majority still hides in a
large crowd.

### Code it

Five deposits; deposit 3 is known stolen. An association-set provider publishes
a root over the other four. The trusted checker again stands in for the
zero-knowledge proof.

```python
import hashlib

def H(*parts):
    return hashlib.sha256(b"|".join(parts)).digest()

def merkle_root(leaves, size=8):
    level = leaves + [H(b"empty")] * (size - len(leaves))
    while len(level) > 1:
        level = [H(level[i], level[i + 1]) for i in range(0, len(level), 2)]
    return level[0]

# Five deposits. Deposit 3 came straight from a known theft.
notes = [(b"n%d" % i, b"s%d" % i) for i in range(5)]
commitments = [H(n, s) for n, s in notes]
pool_root = merkle_root(commitments)

# An association-set provider publishes a subset it vouches for.
clean = [c for i, c in enumerate(commitments) if i != 3]
clean_root = merkle_root(clean)

def trusted_checker(pool_root, assoc_root, nullifier_hash, witness):
    """Stand-in for the zero-knowledge proof: it sees the witness, says yes or no.
    (For brevity it rebuilds the trees; a real proof uses two Merkle paths.)"""
    nullifier, secret, pool_leaves, assoc_leaves = witness
    c = H(nullifier, secret)
    return (H(nullifier) == nullifier_hash
            and c in pool_leaves and merkle_root(pool_leaves) == pool_root
            and c in assoc_leaves and merkle_root(assoc_leaves) == assoc_root)

for i in (1, 3):
    n, s = notes[i]
    ok = trusted_checker(pool_root, clean_root, H(n), (n, s, commitments, clean))
    print("deposit", i, "proves membership in the clean set:", ok)

# Ragequit: deposit 3 can still leave, but only by opening its note publicly,
# to the address that made the deposit. No privacy, no confiscation.
n, s = notes[3]
print("ragequit opens commitment:", H(n, s) == commitments[3])
```

It prints:

```
deposit 1 proves membership in the clean set: True
deposit 3 proves membership in the clean set: False
ragequit opens commitment: True
```

### In the real world

The company 0xbow launched Privacy Pools on Ethereum on 31 March 2025, with
Buterin among the first depositors. Deposits wait while 0xbow's association-set
provider screens them; approved deposits join the set that withdrawals prove
against; a rejected depositor can **ragequit**, withdrawing publicly to the
original address, which gives up privacy but not the money. Deposits were capped
small at launch.

The design moves the hard judgment rather than removing it. Someone decides
what counts as tainted, theft is often discovered after the coins have been
approved, and a set provider is a point where pressure can be applied. But it
changes the question from "should this pool exist?" to "whose list do you trust,
and can you prove you are not on the other one?", which is a question
compliance officers and privacy advocates can at least argue about in the same
room.

!!! note "Life story: privacy pools"
    **Born:** September 2023, Buterin, Illum, Nadler, Schär and Soleimani,
    "Blockchain Privacy and Regulatory Compliance: Towards a Practical
    Equilibrium"; deployed by 0xbow on 31 March 2025 · **Purpose:** keep a
    shielded pool open to everyone while letting honest users prove their
    deposits are not from known thefts · **Helped:** a working compromise
    between mixers and compliance, and the ragequit exit for rejected deposits
    · **Status:** current and small; its value depends on the association-set
    providers being trusted and timely

## 18.13 What a ledger cannot hide

*Level: intermediate.*

Every design in this chapter hides something *on the ledger*. The people using it
live off the ledger, and that is where most real deanonymization happens.

**The network.** A transaction reaches the world from some computer. A node that
relays it first is usually close to its origin, and an adversary who runs many
nodes, or watches the network, can often name the IP address that broadcast it.
Alex Biryukov, Dmitry Khovratovich and Ivan Pustogarov showed in 2014 that a few
dozen well-connected Bitcoin nodes could link many transactions to IP addresses.
Defenses route the first hops through Tor ([Chapter 15](15-Anonymous-Communication.md))
or use **Dandelion++** (Giulia Fanti and colleagues, 2018), which passes a new
transaction along a random line of peers before broadcasting it, so the first
broadcaster is probably not the origin; Monero adopted Dandelion++ in 2020. In
September 2024 a leaked Chainalysis training video described collecting IP
addresses by running Monero nodes that light wallets connect to; Chainalysis did
not comment, and how much it achieved is not public. A wallet that sends its view
key or its transactions to someone else's server tells that server everything
the cryptography hid.

**The edges.** Most people buy coins at an exchange that has checked their
identity, as required in most countries by anti-money-laundering rules, and
cash out the same way. The Financial Action Task Force's "travel rule" (2019)
asks exchanges to pass sender and recipient identity along with transfers
between them. A shielded pool hides what happens inside; the deposit from an
identified exchange account and the withdrawal to another are public, with
amounts and times. Welcome to Video (§18.3) was cracked at the exits.

**Amounts and timing.** Even with every amount hidden, a payment of an unusual
size entering a pool and leaving an hour later, or a salary arriving every month
on the same day, is a pattern. Small anonymity sets make the patterns sharper:
a pool with ten users a day is a pool where timing does most of the analyst's
work.

**The future.** A ledger is forever, and the cryptography protecting its
privacy is not. Pedersen commitments hide amounts perfectly, even against a
quantum computer, but stealth addresses and key images rest on discrete
logarithms, which a large quantum computer could compute. The rings and one-time
keys published today could then be re-examined: an adversary who recovers view
keys from public data could link payments made years before. This is the
"harvest now, decrypt later" problem of
[Post-quantum, Chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md)
applied to a record that is public by design.

### The policy debate, stated fairly

The argument for strong financial privacy on ledgers starts from the record. A
public ledger exposes salaries, medical purchases, donations to causes and
political movements, and the balances of people who can then be robbed; there
have been kidnappings and home invasions aimed at people believed to hold
large amounts of cryptocurrency. Cash has always been private, and a society that moves to digital
money without private digital money has lost something. Privacy tools are also
used by businesses that do not want competitors reading their supply chains, and
by people under hostile governments. Code is speech, and punishing its authors
for others' crimes chills research. And the tracing record shows that criminals
are caught anyway, usually at the edges.

The argument for limits starts from a different record. Mixers and privacy coins
have moved the proceeds of ransomware attacks on hospitals, of fraud against the
elderly, and of thefts that fund North Korea's weapons programs, by the US
government's count billions of dollars. Anti-money-laundering law has long said
that services moving money for others must know their customers, and a privacy
tool that serves thieves at scale, with its developers' knowledge, is not merely
speech. Exchanges in Japan and South Korea delisted privacy coins years ago, many
exchanges in Europe have followed, and the EU's anti-money-laundering regulation
of 2024 bars regulated crypto-asset service providers from handling
anonymity-enhancing coins from July 2027.

Both sides agree on more than they admit. Hardly anyone argues that a ledger
should be fully transparent forever, and hardly anyone argues that stolen
billions should be unrecoverable. The live questions are narrower: who may see
what (viewing keys, association sets), who is responsible for software nobody
controls, and whether privacy should be the default or a special request. The
cryptography can support most of the answers; it cannot choose among them.

### Mars: the settlement's credit ledger

Arcadia City keeps its own ledger of credits for water, air and housing, shared
by its districts and checked by all of them, because no single office should be
able to rewrite it (the consensus is [Chapter 17](17-Consensus-and-Smart-Contracts.md)'s).
In a town of a few thousand people a transparent ledger would be a disaster:
everyone knows everyone, and a clustered address is a neighbor's medical
supplies. So the settlement's design follows this chapter's lessons. Payments
are shielded notes, with the whole pool as the anonymity set, because rings of
16 in a town of 3,000 would leak. Each household holds an incoming viewing key
it can hand to the auditor once a year, and the auditor's full report is
encrypted to the council's threshold key ([Chapter 4](04-Threshold-Cryptography.md)).
Pools have public totals, so a counterfeiting flaw cannot drain the reserve
unseen. And the link to Earth's banks, 3 to 22 light-minutes away, crosses one
public turnstile, run by the treasury office, where Earth's rules on knowing the
customer apply and the settlement's do not. The privacy charter that governs
who may ask for which key is in [Chapter 19](19-Differential-Privacy.md).

## 18.14 In the real world

*Level: intermediate.*

| System | Since | Hides sender | Hides receiver | Hides amount | Anonymity set |
|---|---|---|---|---|---|
| Bitcoin, careful wallet | 2009 | no (pseudonym) | no (pseudonym) | no | one cluster |
| CoinJoin (WabiSabi, Whirlpool) | 2013 | among the round | among the round | no (equal outputs) | the round's participants |
| PayJoin (BIP 78) | 2018 | confuses heuristic 1 | no | hides the payment amount | not a set: doubt |
| Confidential Transactions (Liquid) | 2018 | no | no | yes | none for the graph |
| Monero | 2014 (RingCT 2017) | among the ring (16) | yes (stealth) | yes | 16 per input |
| Zcash shielded (Sapling, Orchard, Ironwood) | 2016 | yes | yes | yes | the whole pool |
| Tornado Cash | 2019 | among the pool's deposits | fresh address | fixed denomination | the pool's deposits |
| Privacy Pools | 2025 | among the association set | fresh address | fixed per deposit | the chosen set |

Three patterns stand out. The schemes that hide the most (Zcash shielded,
Tornado-style pools) rest on zero-knowledge proofs, and the two Zcash
soundness flaws and the Tornado circuit bug of [Chapter 7](07-SNARKs.md) show
that the proof system and its circuit are now part of the money's security,
which is why public pool totals and turnstiles matter. The schemes that rely on
decoys or participants (rings, CoinJoin) are only as strong as the statistics of
real behavior. And in every case the off-ledger leaks of §18.13, exchanges,
networks and habits, do more practical damage than any break of the
cryptography.

The industry around these systems is now as important as the systems. Chain
analysis firms sell tracing to governments and exchanges; exchanges screen
deposits against their tags; sanctions lists name addresses; and privacy
coins have been delisted by many large exchanges, with Monero the most affected.
Users who want privacy increasingly get it inside other systems: shielded pools
built into rollups, stealth-address support in Ethereum wallets, silent payments
in Bitcoin wallets.

## 18.15 Going deeper

*Level: expert.*

**Measuring anonymity.** "An anonymity set of 16" is a ceiling. If the analyst
assigns probabilities $p_1, \dots, p_n$ to the candidates, Claudia Díaz and
colleagues and, independently, Andrei Serjantov and George Danezis (both 2002)
proposed measuring anonymity by the Shannon entropy

$$
H = -\sum_{i=1}^{n} p_i \log_2 p_i,
$$

with $2^H$ as the **effective anonymity set size**: the number of equally likely
candidates that would give the same uncertainty. Sixteen equally likely ring
members give $H = 4$ bits and an effective size of 16. If the "newest member"
rule of §18.8 puts probability $1/2$ on one member and spreads the rest evenly,
$H = \tfrac12 + \tfrac12 \log_2 30 \approx 2.95$ bits, and the effective size is
$\sqrt{60} \approx 7.7$: half the ring's nominal size, before any chain reaction.
Entropy has its critics (it averages over cases, and a user cares about the
worst case), and min-entropy, $-\log_2 \max_i p_i$, is often the more honest
number: here exactly 1 bit, "a coin flip".

**Formal privacy for ledgers.** Zerocash defined **ledger indistinguishability**:
an adversary who chooses two sequences of transactions that are publicly
consistent (same public values, same transparent parts) cannot tell which one
was executed, even with oracle access to honest users. It is the
ideal-versus-real idea of [Chapter 1](01-Computing-With-Secrets.md) specialized to
a ledger, and its proof is where the SNARK's zero knowledge, the commitments'
hiding and the PRF's pseudorandomness are each used once. Ring-based systems have
no comparable end-to-end theorem; their privacy depends on a model of decoy
selection that the real world does not follow exactly.

**Membership proofs over the whole chain.** The direction of travel is clear:
replace "one of these 16" with "one of all outputs". Monero's FCMP++ does it with
a proof over a curve tree (a Merkle-like tree whose internal nodes are curve
points, verified on a cycle of curves), in the style of the recursive proofs of
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md); Firo's Lelantus and Spark
used one-out-of-many proofs over large sets; Zcash has had it from the start. Once
the set is the whole chain, the remaining leaks are timing and the edges.

**Private computation, not just payments.** Hiding a payment is a special case of
hiding the state of a program. Rollups such as Aztec keep private state as notes
and nullifiers and prove each transition, which brings the same design (and the
same circuit-bug risk) to smart contracts. A shared private state, like an
exchange's order book, is harder: someone must compute on data nobody may see,
which leads to the threshold decryption of [Chapter 4](04-Threshold-Cryptography.md),
the MPC of [Chapter 10](10-Multi-Party-Computation-in-Practice.md) and the
homomorphic encryption of [Chapter 12](12-Homomorphic-Encryption.md).

**Quantum and the permanent record.** A privacy coin that wants its past to stay
private needs post-quantum hiding, not just post-quantum soundness. Pedersen
commitments already hide amounts against any adversary. Key exchanges for
stealth addresses can move to lattice-based KEMs
([Post-quantum, Chapter 8](../post-quantum/08-ML-KEM.md)); hash-based proofs
(STARKs) give plausibly post-quantum soundness; lattice-based ring signatures and
membership proofs exist in the research literature. None of this rescues
transactions already published under discrete-log assumptions: those are part of
the harvest.

**Compliance by proof.** Association sets are one point in a larger design space
of proofs about private money: proofs that a payment is under a limit, that the
payer holds a credential from a regulated issuer
([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)), that a
withdrawal is not from a list, or that a regulator holding a threshold-shared key
could open one transaction under a court order. Each moves some trust from
"nobody can see" to "only someone with a good reason can see", and each moves the
argument from cryptography to governance.

## Check yourself

??? question "1. Why is a Bitcoin address a pseudonym rather than an anonymous identity?"

    It is a stable name that is not your legal name. Everything paid to or from
    it is linked forever on the public ledger, and one link to the real world
    (an exchange's records, a shipping address, an IP address) names every
    transaction linked to it, past and future. Anonymity would mean the observer
    cannot tell which member of a set acted.

??? question "2. A transaction spends addresses p and q and pays r (seen before) and s (new). What do the two heuristics conclude?"

    Heuristic 1: p and q have one owner. Heuristic 2: r has appeared before and s
    is the only fresh output, so s is probably change and joins the p–q cluster;
    r is probably the payee. Both conclusions are probabilistic: a CoinJoin or a
    PayJoin breaks the first, a payee with a fresh address breaks the second.

??? question "3. In an equal-output CoinJoin of inputs 1.5, 2.3 and 4.1 with outputs of 1.0, why is the change toxic?"

    Each change output (0.5, 1.3, 3.1) is its owner's input minus 1.0, so it is
    linked to that input by arithmetic. If the owner later spends change together
    with their mixed 1.0 output, heuristic 1 links the mixed output back to the
    input and the mixing is undone.

??? question "4. In a PayJoin, Alice spends 0.8 and pays Bob 0.25; Bob adds an input of 0.4. What outputs appear, and what does a naive analyst conclude?"

    Bob receives $0.4 + 0.25 = 0.65$; Alice's change is $0.8 - 0.25 = 0.55$
    (ignoring the fee). The analyst sees inputs 0.8 and 0.4 and outputs 0.65
    and 0.55, concludes that one person owned both inputs (false) and that the
    payment was 0.65 or 0.55 (both false). The real amount, 0.25, appears
    nowhere.

??? question "5. In the toy stealth example, a server holds the view key a = 17 and the spend key's public half B = 159. What can it do with (R, P) = (25, 10), and what can it not do?"

    It computes $R^a = 25^{17} \bmod 467 = 146$, hashes it to 225, and checks
    $4^{225} \cdot 159 \equiv 10$: it knows the payment is the user's. To spend,
    it would need $x = 225 + b$, and without $b = 29$ it cannot compute $x$; finding
    $b$ from $B$ is a discrete logarithm (trivial in the toy group, infeasible on
    ed25519).

??? question "6. Why does Monero's key image use the base H_p(P) instead of the generator g?"

    With base $g$ the image would be $g^x = P$, the one-time key itself, which
    names the output being spent and makes the ring pointless. With a base whose
    discrete log nobody knows, the image is fixed by $x$ (so a second spend is
    caught) but reveals nothing about which ring member it belongs to.

??? question "7. Rings: in1 = {o1, o2}, in2 = {o2}, in3 = {o1, o3}. Which outputs does each input spend?"

    in2 has one member, so it spends o2. Then o2 is a decoy in in1, which must
    spend o1. Then o1 is a decoy in in3, which must spend o3. One zero-decoy
    input traced all three.

??? question "8. Someone moves exactly 12.3456 ZEC from a transparent address into the Sapling pool and, an hour later, 12.3455 ZEC from the pool to another transparent address. Why is this weak, and what would help?"

    Each turnstile crossing shows its amount, and an unusual amount in and
    almost the same amount out shortly after are almost certainly the same money:
    the anonymity set collapses to one. Keeping value inside the pool, paying
    shielded recipients, waiting, and using round or split amounts help; the
    strongest fix is to never cross the wall with that money.

??? question "9. A Tornado-style circuit proves knowledge of a leaf and its nullifier, but the recipient address is not a public input of the proof. What can an attacker do?"

    Watch the pending withdrawal, copy its root, nullifier hash and proof, and
    submit them first with their own address as recipient and a higher fee. The
    proof still verifies, the nullifier is recorded, and the attacker is paid.
    Binding the recipient (and relayer and fee) into the proof's public inputs,
    as Tornado Cash did, makes the copied proof useless for any other recipient.

??? question "10. An analyst assigns probability 1/2 to the newest member of a ring of 16 and spreads the rest evenly. What are the entropy, the effective anonymity set size and the min-entropy?"

    $H = \tfrac12 \log_2 2 + 15 \cdot \tfrac{1}{30} \log_2 30 = \tfrac12 + \tfrac12 \log_2 30 \approx 2.95$
    bits; the effective size is $2^{2.95} = \sqrt{60} \approx 7.7$ members, not 16.
    The min-entropy is $-\log_2 \tfrac12 = 1$ bit: the analyst's best guess is
    right half the time.

## What you learned

- A public ledger is a permanent record of every payment. Addresses are
  pseudonyms, and the common-input and change heuristics, run with union-find,
  group them into clusters that a single outside tag can name.
- Chain analysis became evidence in the Silk Road, Welcome to Video and Bitfinex
  cases; it usually points, and a subpoena or a warrant confirms.
- CoinJoin defeats the common-input heuristic only with equal amounts, and leaks
  through change and later behavior; PayJoin makes the heuristic quietly wrong.
  The largest CoinJoin coordinators closed after the 2024 Samourai arrests.
- Confidential Transactions hide amounts with Pedersen commitments and range
  proofs, but leave the transaction graph public.
- Stealth addresses give every payment a one-time key $P = g^{H(A^r)} B$ that only
  the view key can find and only the spend key can spend; key images
  $H_p(P)^x$ stop double spending inside rings.
- Monero's early rings were mostly traceable through zero-decoy chain reactions
  and the age of real spends; the fixes were mandatory rings, realistic decoys
  and, in prospect, membership proofs over the whole chain.
- Zcash hides sender, receiver and amount in shielded pools with nullifiers and
  SNARKs, but for years most of its value stayed transparent; viewing keys allow
  selective audits, and turnstiles bound the damage of soundness flaws.
- A Tornado Cash style pool hides the link between deposit and withdrawal; the
  nullifier list stops double withdrawals; users' habits shrink the anonymity
  set. Its sanctions were overturned for immutable contracts in *Van Loon*
  (2024) and lifted in 2025, while its developers' criminal cases continue.
- Privacy pools let honest users prove they are not withdrawing listed thefts.
- No ledger cryptography hides the network, the identified exchanges at the
  edges, or patterns of amount and time, and a public record outlives the
  assumptions that protect it.

**Next:** [Chapter 19](19-Differential-Privacy.md), privacy for statistics:
what can be published about a population without exposing any one person in it.

## Further reading

- Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008),
  section 10, "Privacy".
- Fergal Reid and Martin Harrigan, "An Analysis of Anonymity in the Bitcoin
  System" (2011; in *Security and Privacy in Social Networks*, 2013).
- Dorit Ron and Adi Shamir, "Quantitative Analysis of the Full Bitcoin
  Transaction Graph" (Financial Cryptography 2013).
- Sarah Meiklejohn, Marjori Pomarole, Grant Jordan, Kirill Levchenko, Damon
  McCoy, Geoffrey M. Voelker and Stefan Savage, "A Fistful of Bitcoins:
  Characterizing Payments Among Men with No Names" (IMC 2013).
- Gregory Maxwell, "CoinJoin: Bitcoin privacy for the real world" (Bitcointalk,
  2013) and "Confidential Transactions" (2015).
- Ádám Ficsór, Yuval Kogman, Lucas Ontivero and István András Seres, "WabiSabi:
  Centrally Coordinated CoinJoins with Variable Amounts" (2021).
- BIP 78, "A Simple Payjoin Proposal" (2019); BIP 352, "Silent Payments" (2023).
- Nicolas van Saberhagen, "CryptoNote v2.0" (2013).
- Shen Noether, "Ring Confidential Transactions" (Monero Research Lab, 2015).
- Joseph K. Liu, Victor K. Wei and Duncan S. Wong, "Linkable Spontaneous
  Anonymous Group Signature for Ad Hoc Groups" (ACISP 2004).
- Amrit Kumar, Clément Fischer, Shruti Tople and Prateek Saxena, "A Traceability
  Analysis of Monero's Blockchain" (ESORICS 2017).
- Malte Möser, Kyle Soska, Ethan Heilman, Kevin Lee, Henry Heffan, Shashvat
  Srivastava, Kyle Hogan, Jason Hennessey, Andrew Miller, Arvind Narayanan and
  Nicolas Christin, "An Empirical Analysis of Traceability in the Monero
  Blockchain" (PETS 2018).
- Ian Miers, Christina Garman, Matthew Green and Aviel D. Rubin, "Zerocoin:
  Anonymous Distributed E-Cash from Bitcoin" (IEEE S&P 2013).
- Eli Ben-Sasson, Alessandro Chiesa, Christina Garman, Matthew Green, Ian Miers,
  Eran Tromer and Madars Virza, "Zerocash: Decentralized Anonymous Payments from
  Bitcoin" (IEEE S&P 2014).
- Daira Hopwood, Sean Bowe, Taylor Hornby and Nathan Wilcox, *Zcash Protocol
  Specification* (2016 onward), and ZIP 209 (shielded pool balances).
- George Kappos, Haaroon Yousaf, Mary Maller and Sarah Meiklejohn, "An Empirical
  Analysis of Anonymity in Zcash" (USENIX Security 2018).
- Alexey Pertsev, Roman Semenov and Roman Storm, "Tornado Cash Privacy Solution,
  Version 1.4" (2019).
- Ferenc Béres, István András Seres, András A. Benczúr and Mikerah
  Quintyne-Collins, "Blockchain is Watching You: Profiling and Deanonymizing
  Ethereum Users" (IEEE DAPPS 2021).
- Vitalik Buterin, Jacob Illum, Matthias Nadler, Fabian Schär and Ameen Soleimani,
  "Blockchain Privacy and Regulatory Compliance: Towards a Practical
  Equilibrium" (2023).
- US Department of the Treasury, press release on the Tornado Cash designation
  (8 August 2022); *Van Loon v. Department of the Treasury*, No. 23-50669 (5th
  Cir., 26 November 2024).
- Alex Biryukov, Dmitry Khovratovich and Ivan Pustogarov, "Deanonymisation of
  Clients in Bitcoin P2P Network" (ACM CCS 2014).
- Giulia Fanti, Shaileshh Bojja Venkatakrishnan, Surya Bakshi, Bradley Denby,
  Shruti Bhargava, Andrew Miller and Pramod Viswanath, "Dandelion++: Lightweight
  Cryptocurrency Networking with Formal Anonymity Guarantees" (SIGMETRICS 2018).
- Claudia Díaz, Stefaan Seys, Joris Claessens and Bart Preneel, "Towards
  Measuring Anonymity", and Andrei Serjantov and George Danezis, "Towards an
  Information Theoretic Metric for Anonymity" (both PET 2002).
- Andy Greenberg, *Tracers in the Dark: The Global Hunt for the Crime Lords of
  Cryptocurrency* (Doubleday, 2022).
- In this book: [Chapter 3](03-Commitments.md) (Pedersen commitments, Merkle
  trees, the Zcash ceremony), [Chapter 7](07-SNARKs.md) (the Sprout and Orchard
  flaws, the circomlib bug), [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)
  (Bulletproofs in Monero, Halo 2), [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)
  (ring signatures and key images), [Chapter 15](15-Anonymous-Communication.md)
  (Tor and the network layer); [Protocols, Chapter 19](../protocols/19-Ledgers-Bitcoin.md)
  for Bitcoin itself.
