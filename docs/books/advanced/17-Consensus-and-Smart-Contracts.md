# 17. Consensus and Smart Contracts

*A ledger is only useful if everyone reads the same one. When a bank keeps it,
the bank decides; when nobody is in charge and some of the keepers lie, the
keepers must agree among themselves, and that turns out to be one of the
deepest problems in computer science. This chapter starts with three generals
who cannot trust each other, proves by hand why three is not enough when one of
them is a traitor, and then follows the answers people have found: PBFT for a
known committee, Nakamoto's proof of work for an open crowd, proof of stake with
its slashing rules for the same crowd without the electricity bill. You will code
the double-spend probability from the Bitcoin whitepaper and reproduce its table,
split a committee that is one member too small, earn more than your share by
mining selfishly, and drain a toy bank contract the way The DAO was drained in
2016. The chapter ends with rollups, with the honest list of what a blockchain is
and is not good for, and with the reason Arcadia City cannot share a fast chain
with Earth.*

!!! abstract "In this chapter"
    **You will learn:**

    - what consensus asks for (agreement, validity, termination), and how the
      Byzantine generals problem turns it into a puzzle with a sharp answer:
      $n \ge 3f + 1$, proved by hand for three generals;
    - what the FLP impossibility theorem says in plain words, and the three
      ways real systems escape it: timing assumptions, randomness, and giving
      up on finality;
    - how Paxos and Raft agree when machines only crash, and how PBFT agrees
      when they lie, phase by phase for four replicas;
    - why Nakamoto consensus is a new kind of answer, with the whitepaper's
      attacker-success formula derived, computed by hand and coded;
    - how selfish mining and 51% attacks work, with the real attacks on
      Ethereum Classic and Bitcoin Gold;
    - how proof of stake replaces work with deposits that can be destroyed,
      and how Ethereum's Gasper finalizes blocks;
    - what a smart contract is, how gas bounds it, and how reentrancy, an
      unguarded library, bridge keys and transaction ordering have cost
      billions;
    - how rollups scale a chain, and why the data must stay available.

    **You need:** the Bitcoin protocol from
    [Protocols, Chapter 19](../protocols/index.md) (transactions,
    scripts, proof of work, Merkle trees, wallets; this chapter assumes it and
    does not retell it), hash functions from
    [Chapter 9 of book 1](../../book/09-Hash-Functions.md), signatures from
    [Chapter 14 of book 1](../../book/14-Discrete-Log-Systems.md), and threshold
    signatures from [Chapter 4](04-Threshold-Cryptography.md). The Poisson
    distribution is explained where it is used; the full treatment is in
    [Mathematics, Chapter 16](../mathematics/16-Probability.md).

    **Levels:** §17.1 and §17.2 are for beginners, §17.3 to §17.14 are
    intermediate, §17.15 is expert.

## 17.1 The problem

*Level: beginner.*

A bank account is a line in a ledger, and the ledger is believed because one
institution keeps it. If Ana pays Ben 50 coins, the bank subtracts 50 from one
line and adds 50 to another, and if Ana tries to spend the same 50 coins twice,
the bank refuses the second payment because it can see the first. The bank is
trusted to order events, to refuse impossible ones and not to rewrite the past.

Now take the bank away. Suppose the ledger is kept by many machines run by
people who do not know each other, and suppose that some of them may lie: they
may tell one keeper that Ana paid Ben and another that Ana paid Carla with the
same coins, they may go silent at the worst moment, or they may try to rewrite
yesterday. Messages between honest keepers may be slow. The keepers still have
to end up with **one history**: the same transactions in the same order, with
nothing that has been accepted quietly disappearing later. That is the
**consensus problem**, and stated for a ledger it is called **state machine
replication**: every keeper runs the same deterministic program (the "state
machine") on the same ordered list of inputs, so if they agree on the list,
they agree on everything.

Three properties define success. **Agreement**: no two honest keepers decide
different things. **Validity**: what they decide was really proposed by someone
(otherwise "always decide nothing" would be a perfect protocol). **Termination**:
every honest keeper eventually decides. Agreement and validity are **safety**
properties: nothing bad ever happens. Termination is a **liveness** property:
something good eventually happens. Keep that split in mind; most of this chapter
is about which of the two a protocol gives up when the network misbehaves.

The problem is older than any cryptocurrency. It began in the 1970s with flight
control computers. NASA wanted computers that could keep an aircraft in the air
even when one of them failed in an arbitrary, possibly malicious-looking way,
and a research project at SRI International called SIFT (Software Implemented
Fault Tolerance) asked how many computers were needed. The answer, written up by
Marshall Pease, Robert Shostak and Leslie Lamport in 1980 and retold as a story
about generals in 1982, is the subject of §17.2. Distributed databases took the
problem up in the 1980s, Paxos and its descendants now run the coordination
services inside every large cloud, and in 2008 a pseudonymous author named
Satoshi Nakamoto found a way to run consensus among keepers who do not even know
how many of them there are. You have met Nakamoto's system from the inside in
[Protocols, Chapter 19](../protocols/index.md): its transactions,
scripts, proof of work and Merkle trees. This chapter looks at it from the
outside, as one answer among several to the question of agreement, and asks
how good an answer it is.

<figure class="mars-fig">
<svg viewBox="0 0 640 460" width="640" role="img" aria-label="Timeline of consensus and smart contracts from the Byzantine generals paper in 1982 to Ethereum's blobs in 2024" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="450" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1982</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Lamport, Shostak, Pease: the Byzantine generals</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">Fischer, Lynch, Paterson: the FLP impossibility</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">Dwork, Lynch, Stockmeyer: partial synchrony</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1989</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">Lamport writes Paxos (published 1998)</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">Szabo names "smart contracts"</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">Castro and Liskov: Practical Byzantine Fault Tolerance</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="178" r="4.5"/>
<text x="108" y="183">Nakamoto's whitepaper: proof-of-work consensus</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Eyal and Sirer: selfish mining; Ethereum whitepaper</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Raft; Tendermint</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="256" r="4.5"/>
<text x="108" y="261">Ethereum launches (30 July)</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">The DAO drained; the hard fork; Ethereum Classic</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">Parity multisig wallets frozen</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="334" r="3.5"/>
<text x="108" y="339">Flash Boys 2.0 names MEV; Ethereum Classic attacked</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">Ethereum's beacon chain starts (1 December)</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">Wormhole and Ronin bridges drained</text>
<text x="78" y="417" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="412" r="4.5"/>
<text x="108" y="417">The Merge: Ethereum moves to proof of stake</text>
<text x="78" y="443" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="438" r="3.5"/>
<text x="108" y="443">Blob transactions give rollups cheap data (March)</text>
</svg>
<figcaption>Figure 17.1. Forty years of agreeing with strangers. The large dots mark the three turning points: open-membership consensus (2008), programmable ledgers (2015) and the end of mining on Ethereum (2022).</figcaption>
</figure>

**Two kinds of fault.** A machine that simply stops is a **crash fault**. It is
annoying but honest: what it said before it stopped was true. A machine that
sends wrong or contradictory messages, by bug or by malice, is a **Byzantine
fault**, named after the generals of §17.2. Protocols that survive only crashes
(Paxos, Raft) need fewer machines and fewer messages than protocols that survive
lies (PBFT, Tendermint, Nakamoto). A data center that runs all its own machines
can usually assume crashes; a ledger kept by strangers cannot.

**Two kinds of membership.** In a **permissioned** system the keepers are a known
list: four banks, seven district wardens, a hundred validators with registered
keys. Votes can be counted because voters can be counted. In a
**permissionless** system anyone may join, under as many names as they like. A
vote by name is then meaningless, because one person can create a million names
(a **Sybil attack**, named after a 1973 book about a woman with many
personalities). Nakamoto's insight was to count votes by something that cannot
be faked by making up names: computing work. Proof of stake counts deposited
coins instead. Everything before 2008 in this chapter is permissioned; Nakamoto
consensus and proof of stake are the permissionless answers.

**Why cryptography is here at all.** Consensus is a distributed-systems problem,
but cryptography is what makes the answers work. Signatures let a keeper prove
what another keeper said, so lies become evidence (§17.2, §17.8). Hash chains and
Merkle trees make the history tamper-evident. Proof of work is a hash puzzle.
Threshold signatures shrink a committee's votes to one short certificate
([Chapter 4](04-Threshold-Cryptography.md)), verifiable random functions pick
leaders fairly, and zero-knowledge proofs let a chain check a computation
without re-running it (§17.12). Remove the cryptography and only the
crash-fault protocols remain.

## 17.2 The Byzantine generals

*Level: beginner.*

Lamport, Shostak and Pease told the problem as a story, and the name stuck.
Several divisions of the Byzantine army surround an enemy city. Each division
has a general, and the generals can talk only by messenger. They must agree on
a common plan, attack or retreat: if they all attack the city falls, if they all
retreat they survive, but a split attack is a disaster. Some generals are
traitors who will try to prevent agreement. One general, the **commander**, issues
an order and the others, the **lieutenants**, must decide what to do. The goal has
two parts:

- **IC1.** All loyal lieutenants decide the same thing.
- **IC2.** If the commander is loyal, every loyal lieutenant decides what the
  commander ordered.

The messengers are reliable (messages arrive, and the receiver knows who sent
them), but a traitor may say anything. Lamport later wrote that he chose the
Byzantine Empire so as not to offend anyone living; an earlier draft had
Albanian generals.

### Three generals cannot handle one traitor

Take a commander C and two lieutenants L1 and L2, with at most one traitor. The
obvious protocol: C sends the order to both lieutenants, each lieutenant tells
the other what C said, and then each decides. Watch what L1 sees in two
different worlds (Figure 17.2).

**World 1.** C is loyal and orders "attack" to both. L2 is the traitor and tells
L1 "C told me to retreat". L1 has heard *attack* from C and *retreat* reported
by L2. By IC2, since C is loyal, L1 must attack.

**World 2.** C is the traitor. It orders "attack" to L1 and "retreat" to L2. L2
is loyal and truthfully tells L1 "C told me to retreat". L1 has heard *attack*
from C and *retreat* reported by L2.

L1's view is identical in the two worlds, letter for letter. Whatever rule L1
follows, it does the same thing in both, so in World 2 it also attacks. Now look
at World 2 from L2's side: L2 heard *retreat* from C and *attack* reported by L1.
That is exactly what L2 would see in a **World 3** where C is loyal and orders
retreat and L1 is a traitor who lies about it, and in World 3 IC2 forces L2 to
retreat. So in World 2, L2 retreats. But in World 2 both lieutenants are loyal,
and one attacks while the other retreats. IC1 fails.

No cleverness in the decision rule helps, because the argument never looked at
the rule: it only used the fact that a node cannot distinguish worlds it sees
identically. Adding more rounds of "he said that she said" does not help either;
the traitor simply lies consistently in every round. With three generals and
one traitor, the problem has no solution.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two worlds that look the same to lieutenant L1: in the first the commander is loyal and L2 lies; in the second the commander lies and L2 is loyal" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">World 1: L2 is the traitor</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">World 2: C is the traitor</text>
<line x1="320" y1="10" x2="320" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.5"/>
<rect x="125" y="40" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="60" text-anchor="middle">C</text>
<rect x="30" y="200" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="220" text-anchor="middle">L1</text>
<rect x="220" y="200" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 3"/>
<text x="255" y="220" text-anchor="middle">L2</text>
<line x1="145" y1="70" x2="72" y2="194" stroke="currentColor" stroke-width="1.6"/>
<polygon points="68,200 69,188 77,193"/>
<text x="60" y="130" text-anchor="middle" font-size="13">attack</text>
<line x1="175" y1="70" x2="248" y2="194" stroke="currentColor" stroke-width="1.6"/>
<polygon points="252,200 243,193 251,188"/>
<text x="262" y="130" text-anchor="middle" font-size="13">attack</text>
<line x1="220" y1="215" x2="106" y2="215" stroke="currentColor" stroke-width="1.6"/>
<polygon points="100,215 110,210 110,220"/>
<text x="160" y="255" text-anchor="middle" font-size="13">"C said retreat" (a lie)</text>
<rect x="445" y="40" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 3"/>
<text x="480" y="60" text-anchor="middle">C</text>
<rect x="350" y="200" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="220" text-anchor="middle">L1</text>
<rect x="540" y="200" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="575" y="220" text-anchor="middle">L2</text>
<line x1="465" y1="70" x2="392" y2="194" stroke="currentColor" stroke-width="1.6"/>
<polygon points="388,200 389,188 397,193"/>
<text x="380" y="130" text-anchor="middle" font-size="13">attack</text>
<line x1="495" y1="70" x2="568" y2="194" stroke="currentColor" stroke-width="1.6"/>
<polygon points="572,200 563,193 571,188"/>
<text x="582" y="130" text-anchor="middle" font-size="13">retreat</text>
<line x1="540" y1="215" x2="426" y2="215" stroke="currentColor" stroke-width="1.6"/>
<polygon points="420,215 430,210 430,220"/>
<text x="480" y="255" text-anchor="middle" font-size="13">"C said retreat" (true)</text>
<text x="320" y="288" text-anchor="middle" font-size="13" font-style="italic">L1 hears "attack" from C and "retreat" from L2 in both worlds</text>
</svg>
<figcaption>Figure 17.2. The proof that three generals cannot tolerate one traitor. Dashed boxes are traitors. L1 cannot tell the two worlds apart, so it must act the same in both; World 1 forces it to attack, and a mirror-image argument forces L2 to retreat in World 2.</figcaption>
</figure>

**From three to many.** The same trick proves the general bound. Suppose
$n \le 3f$ generals could tolerate $f$ traitors. Split them into three groups of
at most $f$ each, and let three super-generals simulate one group each. Any one
super-general can be a traitor, because a group of at most $f$ traitors can
behave however it likes. So the $n$-general protocol would give a three-general
protocol tolerating one traitor, which we just showed is impossible. Hence:

$$
\text{Byzantine agreement with } f \text{ traitors needs } n \ge 3f + 1 .
$$

### Four generals can

With one more general the problem becomes solvable. Lamport, Shostak and Pease
give an algorithm called **OM(1)** ("oral messages, one traitor"): the commander
sends its order to each lieutenant; each lieutenant relays what it received to
every other lieutenant; each lieutenant then takes the **majority** of the three
values it holds (its own from the commander, and the two relayed ones),
defaulting to "retreat" on a tie.

Work it by hand. Commander C, lieutenants L1, L2, L3.

1. **C is the traitor** and sends *attack* to L1 and L2 but *retreat* to L3. The
   lieutenants are all loyal and relay truthfully. L1 holds (attack from C,
   attack via L2, retreat via L3): majority attack. L2 holds (attack, attack via
   L1, retreat via L3): attack. L3 holds (retreat from C, attack via L1, attack
   via L2): attack. All three agree. The deep reason: every loyal lieutenant
   ends up holding *the same multiset* of three values, because all the relays
   are honest, so they all compute the same majority. IC1 holds; IC2 is not
   required since C is a traitor.
2. **L3 is the traitor** and C loyally orders *attack*. L1 holds (attack from C,
   attack via L2, whatever L3 claims): at least two attacks, so attack. L2
   likewise. IC1 and IC2 both hold: one lying voice is outvoted by two true
   ones.

With $f$ traitors the algorithm recurses: OM($f$) runs $f + 1$ rounds and sends a
number of messages that grows like $n^{f+1}$, which is fine for four flight
computers and hopeless for a thousand ledger keepers. PBFT in §17.5 gets the
same tolerance with about $n^2$ messages per decision.

### Code it

The code plays every possible traitor: each position, and every choice of lie on
every message it sends, for three generals and for four. The loyal commander
always orders attack.

```python
from itertools import product

def om1(n, traitor, lies):
    """Commander is general 0 and orders 'attack'. 'lies' is the traitor's
    choice for every message it sends. Returns each loyal lieutenant's decision."""
    order = {}
    for i in range(1, n):                       # round 1: commander -> lieutenants
        order[i] = lies[("c", i)] if traitor == 0 else "attack"
    decision = {}
    for i in range(1, n):                       # round 2: lieutenants relay
        if i == traitor:
            continue
        heard = [order[i]]
        for j in range(1, n):
            if j != i:
                heard.append(lies[(j, i)] if j == traitor else order[j])
        a = heard.count("attack")
        decision[i] = "attack" if a > len(heard) - a else "retreat"
    return decision

def worst_case(n):
    for traitor in range(n):
        senders = ["c"] if traitor == 0 else [traitor]
        slots = [(s, i) for s in senders for i in range(1, n) if i != traitor]
        for choice in product(["attack", "retreat"], repeat=len(slots)):
            lies = dict(zip(slots, choice))
            d = om1(n, traitor, lies)
            agree = len(set(d.values())) == 1
            obey = traitor == 0 or all(v == "attack" for v in d.values())
            if not (agree and obey):
                return f"traitor {traitor} wins with {lies}: loyal decide {d}"
    return "no traitor strategy breaks it"

for n in (3, 4):
    print(f"n = {n}:", worst_case(n))
```

```
n = 3: traitor 1 wins with {(1, 2): 'retreat'}: loyal decide {2: 'retreat'}
n = 4: no traitor strategy breaks it
```

For $n = 3$ the search finds World 1: lieutenant 1 is the traitor, tells
lieutenant 2 "retreat", and lieutenant 2, holding one attack and one retreat,
falls back to the default and disobeys a loyal commander. (A different tie rule
just moves the failure to World 2.) For $n = 4$ the exhaustive search over all
traitor positions and all lies comes back clean.

### Signatures change the count, but only with clocks

The 1982 paper has a second algorithm, **SM($f$)**, for "signed messages": if a
traitor cannot forge a loyal general's signature, then a relayed order carries
the commander's signature and cannot be altered. In World 2 above, L1 and L2
would compare the signed orders, see that C signed two different ones, and know
C is the traitor. With signatures, agreement is possible for *any* number of
traitors, $n \ge f + 2$, in $f + 1$ rounds. Danny Dolev and Ray Strong gave an
efficient version in 1983.

There is a catch hidden in the word "rounds". SM($f$) and Dolev-Strong assume a
**synchronous** network: every message arrives within a known time, so a missing
message can be treated as a traitor's silence. Drop that assumption and the bound
returns: in a network where honest messages can be delayed for an unknown time,
Byzantine agreement needs $n \ge 3f + 1$ even with signatures (Dwork, Lynch and
Stockmeyer, 1988). The reason is the subject of the next section: when you cannot
tell a slow node from a dead one, you must be able to decide without waiting for
$f$ of them, and the $n - f$ you do hear from must still contain an honest
majority over the $f$ liars among them. That is $n - f > 2f$, or $n \ge 3f + 1$.
Every Byzantine protocol in practical use, from PBFT to Ethereum's finality
gadget, works in that regime, and the number one third will keep coming back.

!!! note "Life story: the Byzantine generals problem"
    **Born:** 1980 as "Reaching Agreement in the Presence of Faults" (Pease,
    Shostak, Lamport), from SRI's SIFT flight-control project for NASA; told as
    the generals story in *ACM Transactions on Programming Languages and
    Systems* in July 1982 · **Purpose:** decide how many computers are needed
    to agree when some fail arbitrarily · **Helped:** fault-tolerant avionics,
    PBFT, every blockchain finality rule; the $n \ge 3f + 1$ bound is the
    reason "one third" appears throughout this chapter · **Status:** a
    foundation of distributed computing; Lamport received the Turing Award in
    2013, partly for this work

## 17.3 FLP: why no protocol can always decide

*Level: intermediate.*

Byzantine faults are the dramatic enemy. The quiet one is time. In 1985 Michael
Fischer, Nancy Lynch and Michael Paterson proved a result that surprised
everyone working on distributed databases: in an **asynchronous** network,
where messages always arrive but may take any finite time, **no deterministic
protocol can guarantee that consensus terminates if even one process may crash**.
Not lie; just stop. The paper, "Impossibility of Distributed Consensus with One
Faulty Process", is known by its authors' initials, FLP, and it won the Dijkstra
Prize in 2001.

### The three timing models

How much a protocol may assume about time decides what it can do.

- **Synchronous.** There is a known bound $\Delta$ on message delay and on how
  fast processes run. A protocol can wait $\Delta$ and treat silence as failure.
  The 1982 algorithms live here. Real networks give this only with very
  generous $\Delta$.
- **Asynchronous.** No bound at all. A message may take a second or a week. The
  model is pessimistic but honest about the internet under attack.
- **Partially synchronous.** Dwork, Lynch and Stockmeyer's 1988 middle road: the
  network may behave asynchronously for a while, but after some unknown **global
  stabilization time** (GST) messages arrive within $\Delta$. The protocol does
  not know when GST is. It must be safe always and live after GST.

### The theorem in plain words

The heart of FLP is that **a slow process and a dead process look the same**. A
deterministic protocol that is waiting to hear from process P must at some point
either keep waiting (and if P has crashed, wait forever) or move on without P (and
if P was only slow, its vote, when it arrives, may have been the one that mattered).
The proof shows that an adversary who controls only the *order and timing* of
message delivery, and crashes at most one process, can always steer the system
into this dilemma, forever.

The proof uses one idea, **valence**. Call a state of the whole system
*0-valent* if every possible future decides 0, *1-valent* if every future decides
1, and **bivalent** if both outcomes are still reachable. A protocol has decided
only once it has left the bivalent states. FLP shows two things.

**Step 1: some starting state is bivalent.** You can check this by hand. Take
three processes, each starting with an input bit. The start (0, 0, 0) must decide 0
and (1, 1, 1) must decide 1, by validity. Walk from one to the other changing one
input at a time:

$$
(0,0,0) \to (1,0,0) \to (1,1,0) \to (1,1,1).
$$

If no start were bivalent, each would be 0-valent or 1-valent, so somewhere along
this chain a 0-valent start sits next to a 1-valent one, differing only in one
process's input, say process 2's in $(1,0,0)$ versus $(1,1,0)$. Now crash process 2
at the very beginning, before it sends anything. The other two processes cannot
tell the two starts apart, so they run identically and decide the same value in
both. But one start was 0-valent and the other 1-valent, a contradiction. So some
start is bivalent: the outcome genuinely depends on how the run unfolds.

**Step 2: from any bivalent state, the adversary can reach another bivalent
state.** This is the clever part of the paper. Take any pending message $m$. The
adversary considers delivering $m$ now versus delaying it behind other messages,
and shows that at least one of those choices still leaves both outcomes open; if
every choice led to a decided state, a small case analysis about which process
receives which message produces the same "the others cannot tell" contradiction
as in Step 1. Since every message is eventually delivered, the run is fair, yet it
never leaves the bivalent states. The protocol never decides.

The theorem does **not** say that consensus protocols usually fail. Bad schedules
are rare in practice. It says that no deterministic protocol can *guarantee*
safety and termination together in a fully asynchronous network. Every working
protocol therefore gives something up, and the art is choosing what.

### Three ways out

**1. Assume some timing, but only for liveness.** Paxos, Raft, PBFT and Tendermint
are always safe, whatever the network does, and they decide once the network is
calm enough for a round to finish (partial synchrony). During a bad period they
simply stall: leaders time out, new leaders are elected, no two nodes ever decide
differently. FLP's endless bivalent run corresponds to an endless sequence of
leader changes, which a real network does not produce for long.

**2. Use randomness.** FLP is about *deterministic* protocols. In 1983 Michael
Ben-Or showed that if processes may flip coins, consensus terminates with
probability 1 even in a fully asynchronous network: whenever the votes are
split, everyone adopts a coin flip, and sooner or later enough of the coins land
the same way. Ben-Or's private coins take exponentially many rounds in the worst
case; a **common coin**, one random bit that all honest nodes see but nobody can
predict, brings the expected number of rounds down to a constant. Common coins
are made from threshold signatures: the coin for round $r$ is a bit of the
threshold signature on $r$, which needs a quorum to produce and nobody can bias
([Chapter 4](04-Threshold-Cryptography.md) builds one). HoneyBadgerBFT (2016) is a
fully asynchronous Byzantine protocol built this way.

**3. Give up deterministic finality.** Nakamoto consensus does not decide in the
FLP sense at all. A block is never final; it becomes exponentially unlikely to be
reversed as blocks pile on top of it (§17.6). In exchange it needs a rough bound on
message delay to be safe: the analyses of Bitcoin (Garay, Kiayias and Leonardos,
2015; Pass, Seeman and shelat, 2017) assume that blocks reach everyone in a time
much shorter than the block interval. Bitcoin thus trades the model: it is live
in any network, but safe only while the network is fast compared with ten minutes.
That trade matters a great deal for a city 4 to 24 light-minutes away (§17.13).

**A relative: the CAP theorem.** Eric Brewer's conjecture of 2000, proved by Seth
Gilbert and Nancy Lynch in 2002, says a replicated store cannot be always
Consistent and always Available while the network is Partitioned. It is FLP's
practical cousin: during a partition, a consensus protocol chooses consistency and
stalls on one side; a longest-chain protocol chooses availability and lets both
sides keep extending their own chain, then throws one side's history away when
the partition heals.

!!! note "Life story: the FLP impossibility result"
    **Born:** 1983 at the ACM Symposium on Principles of Database Systems;
    journal version in the *Journal of the ACM* in April 1985 (Michael Fischer,
    Nancy Lynch, Michael Paterson) · **Purpose:** find the limits of fault-tolerant
    agreement without clocks · **Helped:** made "safe always, live eventually" the
    design rule; led to partial synchrony (1988), randomized consensus (Ben-Or
    1983) and failure detectors (Chandra and Toueg, 1996) · **Status:** a
    permanent theorem; Dijkstra Prize 2001

## 17.4 Crash faults: Paxos and Raft

*Level: intermediate.*

Before the liars, the simpler case. If machines can crash but never lie, how many
are needed, and how do they agree? The answer is **majorities**. With $n = 2f + 1$
machines, any two groups of $f + 1$ share at least one machine, because
$(f + 1) + (f + 1) = n + 1 > n$. A decision recorded by one majority is therefore
seen by any later majority, and the protocol can always make progress with the
$f + 1$ machines still running. Byzantine protocols need $3f + 1$ because their
quorums must overlap in an *honest* machine, not just in a machine; with crash
faults every machine is honest, so overlap in one is enough.

### Paxos

Leslie Lamport wrote **Paxos** in 1989 as the story of a parliament on the Greek
island of Paxos whose part-time legislators wander in and out of the chamber but
must still pass a consistent sequence of decrees. The referees found the
archaeological framing distracting, the paper sat unpublished, and "The Part-Time
Parliament" finally appeared in *ACM Transactions on Computer Systems* in 1998.
Lamport's "Paxos Made Simple" (2001) begins by saying the algorithm is among the
simplest distributed algorithms, which generations of engineers have found
debatable.

The roles are **proposers**, which suggest values, and **acceptors**, which vote.
Each attempt carries a **ballot number**, unique and increasing. One decision
takes two phases:

1. **Prepare.** A proposer picks ballot $b$ and asks the acceptors: "promise to
   ignore ballots below $b$, and tell me the highest-ballot value you have
   already accepted, if any." An acceptor that has not promised a higher ballot
   promises and reports.
2. **Accept.** Once a majority has promised, the proposer sends "accept $(b, v)$",
   where $v$ **must be** the value of the highest-ballot acceptance any of them
   reported, and only if none reported one may it use its own value. An acceptor
   accepts unless it has since promised a higher ballot. When a majority has
   accepted $(b, v)$, the value $v$ is **chosen**.

The rule in step 2 is the whole trick. Work it with three acceptors A1, A2, A3.
Proposer P gets promises for ballot 1 from A1 and A2 and sends accept(1, "X"); both
accept, so "X" is chosen, and then P crashes before telling anyone. Proposer Q now
tries ballot 2 with its own value "Y". It hears back from A2 and A3, a majority.
A3 has accepted nothing, but A2 reports "I accepted (1, X)". The rule forces Q to
send accept(2, "X"), not "Y". Because Q's majority {A2, A3} overlaps P's majority
{A1, A2} in A2, the chosen value survives P's crash. Had P managed only one
acceptance (say only A1 accepted), nothing would have been chosen, and if Q's
majority missed A1 it would be free to propose "Y", which is also safe.

Two proposers can block each other forever, each preparing a higher ballot just
before the other's accept: FLP's endless run, in the flesh. Real systems elect a
**leader** that alone proposes, and repeat Phase 2 for a whole sequence of slots
("Multi-Paxos"), so a calm network decides each new log entry in one round trip.

### Raft

Diego Ongaro and John Ousterhout designed **Raft** (USENIX ATC, 2014; the paper is
titled "In Search of an Understandable Consensus Algorithm") because, they wrote,
students and engineers struggled to understand Paxos and to turn it into a
complete system. Raft gives the same guarantees with a structure that maps onto
code:

- Time is divided into **terms**, each with at most one leader. A follower that
  hears nothing from a leader for an **election timeout** becomes a candidate,
  increments the term and asks for votes; a majority makes it leader. Timeouts
  are **random** (150 to 300 milliseconds in the paper), so two candidates rarely
  collide twice: a small dose of randomness that keeps FLP's endless split votes
  improbable.
- The leader appends client commands to its **log** and sends them to followers.
  An entry is **committed** once a majority stores it, and every server applies
  committed entries in order to its state machine.
- A candidate wins votes only if its log is at least as up to date as the voter's,
  so a new leader always holds every committed entry. This is Paxos's "adopt the
  highest accepted value" rule, moved into the election.

Paxos and Raft are the consensus inside the cloud. Google's Chubby lock service
(2006) and Spanner database (2012) use Paxos; Apache ZooKeeper uses a close
relative called Zab; etcd, the store that holds the state of every Kubernetes
cluster, uses Raft, as do Consul, CockroachDB and many others. None of them
tolerates a lying member, and none needs to: the machines all belong to one
operator, and the threat is a failed disk, not a rival bank.

!!! note "Life story: Paxos and Raft"
    **Born:** Paxos written by Leslie Lamport in 1989, published in 1998; Raft by
    Diego Ongaro and John Ousterhout at Stanford in 2014 · **Purpose:** keep
    replicated logs consistent when machines crash and messages are delayed,
    with $2f + 1$ machines for $f$ crashes · **Helped:** Chubby, Spanner,
    ZooKeeper (Zab), etcd and Kubernetes, CockroachDB; the ordering service of
    Hyperledger Fabric runs Raft · **Status:** the standard for crash-fault
    consensus; no protection against Byzantine members

## 17.5 PBFT: practical Byzantine agreement

*Level: intermediate.*

For seventeen years after the generals paper, Byzantine agreement was considered
too slow to use outside cockpits. In 1999 Miguel Castro and Barbara Liskov at MIT
published **Practical Byzantine Fault Tolerance** (PBFT) and showed that a
replicated file system tolerating a lying server could run a standard benchmark
only a few percent slower than an unreplicated one. PBFT is the template for most
committee-based blockchains, from Tendermint to Ethereum's finality votes, so it is
worth working through once in detail.

### The setting

There are $n = 3f + 1$ **replicas**. Each signs (or MACs) its messages, so a
replica cannot pretend another said something. One replica is the **primary**
(the leader) for the current **view** $v$; the primary of view $v$ is replica
$v \bmod n$. Clients send requests to the primary, which assigns each a
**sequence number** $s$. The protocol must make every honest replica execute the
same request at each sequence number, even if the primary lies.

A **quorum** is any $2f + 1$ replicas. Two quorums overlap in at least

$$
(2f+1) + (2f+1) - (3f+1) = f + 1
$$

replicas, and since at most $f$ are faulty, **at least one honest replica is in
both**. An honest replica never votes for two different requests at the same
$(v, s)$. So two quorums can never vote for two different requests at the same
slot. That single fact carries the whole safety proof.

### Four replicas, one traitor, by hand

Take $f = 1$, $n = 4$, replicas R0 (primary of view 0), R1, R2, R3. A client sends
request $m$ to R0. Let $d = H(m)$ be its digest.

1. **Pre-prepare.** R0 assigns $s = 7$ and sends $\langle\text{PRE-PREPARE}, v{=}0, s{=}7, d\rangle$
   with $m$ to R1, R2, R3: 3 messages. A backup accepts it if it is in view 0, the
   signature is R0's and it has not accepted a different digest for $(0, 7)$.
2. **Prepare.** Each backup that accepted broadcasts
   $\langle\text{PREPARE}, 0, 7, d, i\rangle$ to all others: 3 senders times 3
   receivers, 9 messages. A replica is **prepared** for $(m, 0, 7)$ when it holds
   the pre-prepare and $2f = 2$ matching prepares from different backups: with
   the primary's pre-prepare, that is a quorum of 3 replicas vouching for $d$ at
   slot 7. Prepared certificates for one slot cannot exist for two digests, by
   the overlap argument.
3. **Commit.** A prepared replica broadcasts $\langle\text{COMMIT}, 0, 7, d, i\rangle$ to all: up to 4
   times 3, 12 messages. When a replica holds $2f + 1 = 3$ matching commits, it
   **commits**, executes $m$ in order after slot 6, and replies to the client.
4. **Reply.** The client waits for $f + 1 = 2$ identical replies. At most one can
   be a lie, so two matching replies include an honest one.

Now let a replica misbehave. If **R3 is faulty** and stays silent, R0, R1 and R2
still form a quorum of 3 and everything above completes. If R3 sends a prepare for
a different digest $d'$, nobody can collect 2 matching prepares for $d'$ without an
honest replica, so it is ignored. If **the primary R0 is faulty** and sends digest
$d$ to R1 but $d'$ to R2 and R3, then R2 and R3 each hold the pre-prepare for $d'$
and one matching prepare (from each other), one short of the $2f = 2$ they need,
and R1 holds no matching prepare for $d$ at all. Nobody becomes prepared, the
backups time out, and a view change (below) replaces R0. A faulty primary can
waste a view, but it cannot make two honest replicas prepared for different
digests: that would need two quorums of 3 out of 4 with no honest replica in
common.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="PBFT message flow for four replicas: the client sends a request to the primary R0, R0 sends pre-prepare to R1 to R3, every backup broadcasts prepare, every replica broadcasts commit, and all reply to the client" fill="currentColor" font-size="14">
<text x="20" y="44">client</text>
<text x="20" y="104">R0</text>
<text x="20" y="164">R1</text>
<text x="20" y="224">R2</text>
<text x="20" y="284">R3</text>
<line x1="70" y1="40" x2="620" y2="40" stroke="currentColor" opacity="0.5"/>
<line x1="70" y1="100" x2="620" y2="100" stroke="currentColor" opacity="0.5"/>
<line x1="70" y1="160" x2="620" y2="160" stroke="currentColor" opacity="0.5"/>
<line x1="70" y1="220" x2="620" y2="220" stroke="currentColor" opacity="0.5"/>
<line x1="70" y1="280" x2="620" y2="280" stroke="currentColor" opacity="0.5"/>
<line x1="90" y1="40" x2="150" y2="100" stroke="currentColor" stroke-width="1.6"/>
<line x1="150" y1="100" x2="230" y2="160" stroke="currentColor" stroke-width="1.6"/>
<line x1="150" y1="100" x2="230" y2="220" stroke="currentColor" stroke-width="1.6"/>
<line x1="150" y1="100" x2="230" y2="280" stroke="currentColor" stroke-width="1.6"/>
<line x1="250" y1="160" x2="350" y2="100" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="160" x2="350" y2="220" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="160" x2="350" y2="280" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="220" x2="350" y2="100" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="220" x2="350" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="220" x2="350" y2="280" stroke="currentColor" stroke-width="1.2"/>
<line x1="250" y1="280" x2="350" y2="100" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
<line x1="250" y1="280" x2="350" y2="160" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
<line x1="250" y1="280" x2="350" y2="220" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
<line x1="370" y1="100" x2="470" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="100" x2="470" y2="220" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="160" x2="470" y2="100" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="160" x2="470" y2="220" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="220" x2="470" y2="100" stroke="currentColor" stroke-width="1.2"/>
<line x1="370" y1="220" x2="470" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="490" y1="100" x2="580" y2="40" stroke="currentColor" stroke-width="1.6"/>
<line x1="490" y1="160" x2="580" y2="40" stroke="currentColor" stroke-width="1.6"/>
<line x1="490" y1="220" x2="580" y2="40" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="312" text-anchor="middle" font-size="13">request</text>
<text x="190" y="312" text-anchor="middle" font-size="13">pre-prepare</text>
<text x="300" y="312" text-anchor="middle" font-size="13">prepare</text>
<text x="420" y="312" text-anchor="middle" font-size="13">commit</text>
<text x="535" y="312" text-anchor="middle" font-size="13">reply</text>
<text x="300" y="20" text-anchor="middle" font-size="13" font-style="italic">R3 silent or lying (dashed): R0, R1, R2 still form a quorum of 3</text>
</svg>
<figcaption>Figure 17.3. One PBFT decision with n = 4 and f = 1. Each phase waits for a quorum of 2f + 1 = 3 matching messages, so the faulty R3 can neither block progress nor make two honest replicas commit different requests. The client accepts after f + 1 = 2 matching replies.</figcaption>
</figure>

**Why two voting phases?** Prepare alone guarantees that within one view no two
honest replicas order different requests at slot 7. But a replica might be
prepared, and execute, just before the primary is replaced, while the others never
saw enough prepares. Commit makes sure that when any honest replica executes, a
quorum is prepared, so at least $f + 1$ prepared replicas, one of them honest,
will carry the request into any future view.

**View change.** If the primary stalls or equivocates, backups time out and
broadcast VIEW-CHANGE messages for view $v + 1$, each carrying the prepared
certificates it holds. The new primary, replica $(v + 1) \bmod n$, collects
$2f + 1$ of them and broadcasts a NEW-VIEW that re-proposes every request that
was prepared anywhere in that quorum. Because any committed request was prepared
at a quorum, and any two quorums share an honest replica, no committed request is
lost. Timeouts double after each failed view change, which is how PBFT relies on
partial synchrony for liveness and on nothing at all for safety.

**Cost.** The prepare and commit phases are all-to-all, so a decision costs about
$2n^2$ messages. That is fine for 4 or 20 replicas and the reason PBFT is not run
with 10,000. Later protocols cut it down: threshold signatures let a leader
combine $2f + 1$ votes into one certificate ([Chapter 4](04-Threshold-Cryptography.md)),
and HotStuff (2019) makes every phase linear (§17.15).

### Code it

The quorum argument, tested by brute force. A traitor leader sends proposal A to
some honest replicas and B to the rest; every traitor then tells each honest
replica whatever that replica already believes, the most damaging thing it can
say. Each replica commits a value once it holds a quorum of votes for it. We use
the largest quorum a protocol can afford to wait for, $n - f$ (waiting for more
would let $f$ silent traitors stall it), and try every split of the honest
replicas.

```python
from itertools import combinations

def run(n, f, quorum, split):
    """Nodes 0..f-1 are traitors (node 0 is the leader). Honest nodes in
    'split' receive proposal A, the other honest nodes receive B. Every node
    broadcasts a vote for what it received; a traitor tells each honest node
    whatever that node already believes. An honest node commits a value once
    it holds 'quorum' votes for it, counting its own."""
    honest = range(f, n)
    got = {h: ("A" if h in split else "B") for h in honest}
    commits = {}
    for h in honest:
        votes = [got[h]] * f                     # the traitors echo h's value
        votes += [got[k] for k in honest]        # the honest votes (h's own included)
        for v in "AB":
            if votes.count(v) >= quorum:
                commits[h] = v
    return commits

def try_all(n, f):
    quorum = n - f                               # the most one can wait for
    honest = list(range(f, n))
    for size in range(1, len(honest)):
        for split in combinations(honest, size):
            c = run(n, f, quorum, set(split))
            if len(set(c.values())) > 1:
                return f"quorum {quorum}: SPLIT {c}"
    return f"quorum {quorum}: honest nodes never commit different values"

for f in (1, 2, 3):
    print(f"f={f}  n={3*f+1}:", try_all(3 * f + 1, f))
    print(f"f={f}  n={3*f}:  ", try_all(3 * f, f))

# n = 3f with a larger quorum: safe again, but silent traitors stall it.
f = 1; n = 3 * f
honest_votes = n - f                             # the traitors simply say nothing
print(f"n={n}, quorum {2*f+1}: {honest_votes} votes arrive, commit = {honest_votes >= 2*f+1}")
```

```
f=1  n=4: quorum 3: honest nodes never commit different values
f=1  n=3:   quorum 2: SPLIT {1: 'A', 2: 'B'}
f=2  n=7: quorum 5: honest nodes never commit different values
f=2  n=6:   quorum 4: SPLIT {2: 'A', 3: 'A', 4: 'B', 5: 'B'}
f=3  n=10: quorum 7: honest nodes never commit different values
f=3  n=9:   quorum 6: SPLIT {3: 'A', 4: 'A', 5: 'A', 6: 'B', 7: 'B', 8: 'B'}
n=3, quorum 3: 2 votes arrive, commit = False
```

With $n = 3f$ the traitors are a committee member short of harmless: they split
the honest replicas into two halves of $f$, and each half, topped up with the $f$
traitors' votes, reaches its quorum of $2f$. Raising the quorum to $2f + 1$
restores safety but loses liveness, as the last line shows: if the traitors go
quiet, the $2f$ honest replicas can never reach it. With $n = 3f + 1$ both hold at
once. This is the $3f + 1$ bound of §17.2, seen from the engineering side.

!!! note "Life story: PBFT"
    **Born:** 1999, Miguel Castro and Barbara Liskov at MIT, presented at OSDI
    in New Orleans; the full version with proactive recovery appeared in *ACM
    Transactions on Computer Systems* in 2002 · **Purpose:** state machine
    replication that survives $f$ lying replicas out of $3f + 1$, fast enough
    for real services · **Helped:** BFT-SMaRt, Tendermint, HotStuff and the
    committee-based blockchains; Liskov received the Turing Award in 2008 for
    her wider work on systems and languages · **Status:** the reference design;
    its descendants run most permissioned and proof-of-stake chains

## 17.6 Nakamoto consensus

*Level: intermediate.*

Every protocol so far counts votes from a known list of replicas. In 2008 Satoshi
Nakamoto's whitepaper, "Bitcoin: A Peer-to-Peer Electronic Cash System", proposed
consensus among keepers nobody has listed. Its mechanics are in
[Protocols, Chapter 19](../protocols/index.md): blocks of
transactions chained by hashes, each block carrying a proof of work, an
expected 10 minutes between blocks. Here we look only at the consensus rule and
what it guarantees.

### What is new

The rule fits in a sentence: **extend the valid chain with the most accumulated
work, and treat its blocks as the history.** The whitepaper says "longest chain";
the software has always meant the chain with the most total work, which is the
same thing when difficulty is constant and the right thing when it is not.

Three ideas make this a new kind of answer.

- **Votes cost energy, not identities.** A miner's chance of producing the next
  block is proportional to its share of the total hash rate. Making up a million
  names gains nothing, so Sybil attacks are pointless; to outvote the honest
  miners you must out-compute them.
- **The leader is chosen by lottery, after the fact.** Nobody knows who will
  propose the next block until a miner finds a valid hash. There is no leader to
  bribe in advance and no view change; a crashed miner simply stops winning.
- **Finality is probabilistic.** Two miners sometimes find blocks at nearly the
  same moment, and the network briefly holds two branches. Miners build on
  whichever they saw first, one branch gets ahead, and the other is abandoned:
  its blocks become **stale** (often called orphans). A transaction is never
  final in PBFT's sense; it becomes harder to reverse with each block on top,
  and a recipient chooses how many **confirmations** to wait for.

The price of these ideas is the energy spent on hashing, a latency measured in
tens of minutes for strong guarantees, and the timing assumption of §17.3: if blocks
took as long to spread as to find, honest miners would constantly work on
different branches, and the honest majority would be split against itself.

### The double-spend race

Section 11 of the whitepaper asks the question a merchant cares about. A customer
pays; the merchant waits for the payment to be buried under $z$ blocks and ships
the goods. Meanwhile the customer, who controls a fraction $q$ of the hash rate,
has been secretly mining an alternative chain in which the same coins go back to
himself. If his secret chain ever becomes longer than the public one, he
publishes it, everyone switches, and the payment vanishes. What is the chance he
succeeds?

Let $p = 1 - q$ be the honest share. Each new block is honest with probability
$p$ and the attacker's with probability $q$, so the attacker's deficit moves like
a **random walk**: down one step with probability $q$, up one with probability
$p$. The chance that such a walk ever climbs from $z$ blocks behind to level is
the classic **gambler's ruin** answer:

$$
q_z =
\begin{cases}
1 & \text{if } p \le q,\\
(q/p)^{z} & \text{if } p > q.
\end{cases}
$$

With $q < p$ the chance drops exponentially in $z$. That is the heart of the
paper: an attacker with less than half the hash rate falls further behind on
average, and his chance of catching up shrinks by a factor $q/p$ per block.

But the attacker is not exactly $z$ blocks behind when the merchant ships; he has
been mining during the wait. While the honest miners produce $z$ blocks, the
attacker's progress is, to a good approximation, a **Poisson** random variable with
mean

$$
\lambda = z \, \frac{q}{p},
$$

since he finds blocks at $q/p$ times the honest rate. The Poisson probability of
exactly $k$ blocks is $e^{-\lambda} \lambda^k / k!$. If he has $k$ blocks he is
$z - k$ behind and needs luck $(q/p)^{z-k}$; if $k > z$ he has already won. So

$$
P = \sum_{k=0}^{\infty} \frac{\lambda^k e^{-\lambda}}{k!}
\begin{cases}
(q/p)^{z-k} & k \le z\\
1 & k > z
\end{cases}
$$

and, to avoid the infinite sum, Nakamoto rearranges it as one minus the chance he
fails:

$$
P = 1 - \sum_{k=0}^{z} \frac{\lambda^k e^{-\lambda}}{k!}\left(1 - (q/p)^{z-k}\right).
$$

**By hand: $q = 0.1$, $z = 1$.** Then $q/p = 1/9$ and $\lambda = 1/9 \approx 0.1111$.

- $k = 0$: $e^{-0.1111} = 0.89484$, times $(1 - (1/9)^1) = 0.88889$, gives $0.79541$.
- $k = 1$: the factor is $1 - (1/9)^0 = 0$, so this term is 0.

So $P = 1 - 0.79541 = 0.20459$: an attacker with a tenth of the hash rate
reverses a one-confirmation payment about one time in five. One block is not
much protection.

### Code it

The whitepaper gives this function in C. Here it is in Python, run on the same
inputs as the paper's two tables, followed by its third table: how many blocks
make the attacker's chance less than 0.1%.

```python
import math

def attacker_success(q, z):
    """Section 11 of the Bitcoin whitepaper: the chance an attacker with share q
    of the hash power ever catches up from z blocks behind."""
    p = 1.0 - q
    lam = z * (q / p)
    total = 1.0
    for k in range(z + 1):
        poisson = math.exp(-lam)
        for i in range(1, k + 1):
            poisson *= lam / i
        total -= poisson * (1 - (q / p) ** (z - k))
    return total

print("q=0.1")
for z in range(0, 11):
    print(f"z={z:<3d} P={attacker_success(0.1, z):.7f}")
print("q=0.3")
for z in range(0, 51, 5):
    print(f"z={z:<3d} P={attacker_success(0.3, z):.7f}")
print("Solving for P less than 0.1%...")
for q in (0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45):
    z = 0
    while attacker_success(q, z) >= 0.001:
        z += 1
    print(f"q={q:.2f} z={z}")
```

```
q=0.1
z=0   P=1.0000000
z=1   P=0.2045873
z=2   P=0.0509779
z=3   P=0.0131722
z=4   P=0.0034552
z=5   P=0.0009137
z=6   P=0.0002428
z=7   P=0.0000647
z=8   P=0.0000173
z=9   P=0.0000046
z=10  P=0.0000012
q=0.3
z=0   P=1.0000000
z=5   P=0.1773523
z=10  P=0.0416605
z=15  P=0.0101008
z=20  P=0.0024804
z=25  P=0.0006132
z=30  P=0.0001522
z=35  P=0.0000379
z=40  P=0.0000095
z=45  P=0.0000024
z=50  P=0.0000006
Solving for P less than 0.1%...
q=0.10 z=5
q=0.15 z=8
q=0.20 z=11
q=0.25 z=15
q=0.30 z=24
q=0.35 z=41
q=0.40 z=89
q=0.45 z=340
```

Every digit matches the whitepaper's tables, including the famous line
$q = 0.10$, $z = 5$: against an attacker with 10% of the hash rate, five
confirmations push the chance below 0.1%. The custom of waiting for **six
confirmations**, about an hour, comes from this table: at $q = 0.1$ it gives
0.024%. Look at the bottom rows too. At $q = 0.45$ the merchant needs 340 blocks,
more than two days, and as $q$ approaches one half no number is enough.

Two cautions belong next to the table. First, the formula is an approximation:
the Poisson step treats the attacker's progress as independent of how long the
honest miners took, and later work (Meni Rosenfeld in 2014; Cyril Grunspan and
Ricardo Pérez-Marco in 2017) computed the exact probability, which for a few
confirmations is two to three times higher (§17.15). Second, it assumes the attacker
plays this one simple strategy with a fixed share of hash power. Rented hash
power and strategies that withhold blocks change the picture, which is the
subject of the next section.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A double-spend race: the public chain holds the payment and z confirmations; the attacker mines a secret branch from the block before the payment and publishes it if it becomes longer" fill="currentColor" font-size="14">
<rect x="20" y="60" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="50" y="82" text-anchor="middle">fork</text>
<line x1="80" y1="77" x2="110" y2="50" stroke="currentColor" stroke-width="1.5"/>
<rect x="110" y="30" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="150" y="52" text-anchor="middle">payment</text>
<line x1="190" y1="47" x2="215" y2="47" stroke="currentColor" stroke-width="1.5"/>
<rect x="215" y="30" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="245" y="52" text-anchor="middle">1</text>
<line x1="275" y1="47" x2="300" y2="47" stroke="currentColor" stroke-width="1.5"/>
<rect x="300" y="30" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="330" y="52" text-anchor="middle">2</text>
<text x="390" y="52" text-anchor="middle">...</text>
<rect x="420" y="30" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="52" text-anchor="middle">z</text>
<text x="500" y="52" font-size="13">goods shipped</text>
<line x1="80" y1="77" x2="110" y2="110" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="110" y="95" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="150" y="117" text-anchor="middle">refund</text>
<line x1="190" y1="112" x2="215" y2="112" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="215" y="95" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="245" y="117" text-anchor="middle">a1</text>
<line x1="275" y1="112" x2="300" y2="112" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="300" y="95" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="330" y="117" text-anchor="middle">a2</text>
<text x="390" y="117" text-anchor="middle">...</text>
<text x="420" y="117" font-size="13">secret, published only if longer</text>
<text x="20" y="170" font-size="13">public chain: honest miners, share p</text>
<text x="20" y="192" font-size="13">dashed branch: the attacker, share q; catch-up chance (q/p) per block of deficit</text>
<text x="20" y="214" font-size="13">attacker blocks found while the merchant waits: Poisson with mean z q / p</text>
</svg>
<figcaption>Figure 17.4. The race of the whitepaper's section 11. The attacker starts a secret branch where the coins go back to himself. If it overtakes the public chain after the merchant has shipped, the payment disappears.</figcaption>
</figure>

**In the real world.** Stale blocks happen naturally: Christian Decker and Roger
Wattenhofer measured in 2013 that a Bitcoin block took a median of about 6.5
seconds to reach the network and that about 1.7% of blocks went stale. Exchanges
today credit Bitcoin deposits after anything from one to six confirmations, and
far more for small proof-of-work coins whose hash rate can be rented (§17.7).
Ethereum's proof-of-work chain (2015 to 2022) made blocks every 13 to 15 seconds,
so stale blocks were common; it paid partial rewards for them ("uncles"), an idea
adapted from Yonatan Sompolinsky and Aviv Zohar's GHOST rule, which picks the
branch with the heaviest subtree rather than the longest path.

!!! note "Life story: Nakamoto consensus"
    **Born:** 31 October 2008, the Bitcoin whitepaper, posted by Satoshi Nakamoto
    to a cryptography mailing list; running since the genesis block of 3 January
    2009 · **Purpose:** agreement on one ordered history among keepers who are
    not known in advance and may come and go, with votes weighted by work ·
    **Helped:** Bitcoin and hundreds of proof-of-work coins; Ethereum until 2022;
    the formal "backbone" analyses that made blockchains a research field ·
    **Status:** secures Bitcoin, the largest cryptocurrency; probabilistic
    finality, high energy use, and safety that rests on an honest majority of
    hash power and a fast network

## 17.7 Attacking proof of work: selfish mining and 51%

*Level: intermediate.*

The whitepaper's argument says an honest majority wins the race. It quietly
assumes something stronger: that following the protocol is the best thing a
miner can do. In November 2013 Ittay Eyal and Emin Gün Sirer of Cornell showed
that it is not, in a paper titled "Majority is not Enough".

### Selfish mining

A **selfish** pool with a share $\alpha$ of the hash rate keeps the blocks it finds
secret and builds on them privately, publishing strategically so that honest
miners waste their work on blocks that will be orphaned. The strategy, with the
pool's private lead over the public chain as its state:

- The pool finds a block: keep it secret (lead + 1). If two branches of length 1
  were racing, publish at once and win the race.
- The honest miners find a block:
    - lead 0: nothing to do, the honest block counts;
    - lead 1: publish the secret block at once, creating a race between two
      branches of equal length;
    - lead 2: publish both secret blocks; the pool's branch is longer, the honest
      block is orphaned;
    - lead 3 or more: publish one block, staying ahead; all honest blocks found
      meanwhile will be orphaned when the pool finally publishes.

During a race, a fraction $\gamma$ (gamma) of the honest miners happen to build on
the pool's block. Gamma measures how well connected the pool is: how often its
block reaches miners before the competitor's.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The selfish-mining state machine: states 0, 1, 2, 3 and so on count the pool's secret lead, with a race state 0-prime; the pool's blocks move right with probability alpha, honest blocks move left" fill="currentColor" font-size="14">
<circle cx="90" cy="100" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="90" y="105" text-anchor="middle">0</text>
<circle cx="220" cy="100" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="220" y="105" text-anchor="middle">1</text>
<circle cx="350" cy="100" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="350" y="105" text-anchor="middle">2</text>
<circle cx="480" cy="100" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="480" y="105" text-anchor="middle">3</text>
<text x="590" y="105" text-anchor="middle">...</text>
<circle cx="155" cy="205" r="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<text x="155" y="210" text-anchor="middle">0'</text>
<path d="M 112 86 Q 155 55 198 86" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="198,86 187,84 192,77"/>
<text x="155" y="55" text-anchor="middle" font-size="13">α</text>
<path d="M 242 86 Q 285 55 328 86" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="328,86 317,84 322,77"/>
<text x="285" y="55" text-anchor="middle" font-size="13">α</text>
<path d="M 372 86 Q 415 55 458 86" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="458,86 447,84 452,77"/>
<text x="415" y="55" text-anchor="middle" font-size="13">α</text>
<path d="M 502 86 Q 540 60 572 90" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="58" text-anchor="middle" font-size="13">α</text>
<path d="M 458 114 Q 415 140 372 114" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="372,114 383,115 379,123"/>
<text x="415" y="150" text-anchor="middle" font-size="13">1−α: publish one</text>
<path d="M 330 118 Q 220 190 110 118" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="110,118 121,121 115,128"/>
<text x="300" y="185" font-size="13">1−α: publish both, honest block orphaned</text>
<line x1="208" y1="123" x2="170" y2="182" stroke="currentColor" stroke-width="1.4"/>
<polygon points="166,188 167,176 175,181"/>
<text x="200" y="160" font-size="13">1−α: race</text>
<line x1="140" y1="183" x2="102" y2="126" stroke="currentColor" stroke-width="1.4"/>
<polygon points="98,120 107,126 100,131"/>
<text x="20" y="160" font-size="13">any block</text>
<path d="M 70 82 Q 50 40 90 40 Q 130 40 110 82" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="90" y="30" text-anchor="middle" font-size="13">1−α</text>
<text x="20" y="245" font-size="13" font-style="italic">State = the pool's secret lead; 0' = two public branches of length 1 racing</text>
</svg>
<figcaption>Figure 17.5. Eyal and Sirer's selfish-mining strategy as a state machine. The pool's blocks (probability α) extend its secret lead; honest blocks (1 − α) make it publish just enough to orphan them.</figcaption>
</figure>

The pool loses some blocks in races, but the honest miners lose more: every time
the pool publishes two blocks against one, an honest block is wasted. Since the
difficulty adjusts to keep blocks coming every 10 minutes, what matters is the
**share** of blocks in the final chain, and the pool's share grows. Eyal and Sirer
solved the Markov chain of Figure 17.5 and found the pool's revenue share

$$
R(\alpha, \gamma) = \frac{\alpha(1-\alpha)^2\bigl(4\alpha + \gamma(1-2\alpha)\bigr) - \alpha^3}{1 - \alpha\bigl(1 + (2-\alpha)\alpha\bigr)},
$$

which beats honest mining ($R > \alpha$) exactly when

$$
\frac{1 - \gamma}{3 - 2\gamma} < \alpha < \frac{1}{2}.
$$

For $\gamma = 0$ the threshold is $1/3$; for $\gamma = 1/2$ it is $1/4$; for a pool
that wins every race ($\gamma = 1$) any size profits. Worse, the strategy feeds
itself: miners earn more by joining the selfish pool, which grows until it holds a
majority.

### Code it

The strategy, simulated block by block with $\gamma = 0$, next to the formula.
(`random` is fine for a simulation; keys come from `secrets`.)

```python
import random

def selfish(alpha, gamma=0.0, blocks=1_000_000):
    """Eyal and Sirer's selfish-mining strategy. Returns the pool's share of
    the blocks that end up in the longest chain."""
    pool = honest = 0
    lead, tie = 0, False                 # tie: two branches of length 1 are racing
    for _ in range(blocks):
        if random.random() < alpha:      # the pool finds a block
            if tie:
                pool += 2                # its branch wins the race
                lead, tie = 0, False
            else:
                lead += 1                # keep it secret
        else:                            # the honest miners find a block
            if tie:
                if random.random() < gamma:
                    pool += 1; honest += 1   # they built on the pool's block
                else:
                    honest += 2
                tie = False
            elif lead == 0:
                honest += 1
            elif lead == 1:
                lead, tie = 0, True      # publish, and race
            elif lead == 2:
                pool += 2; lead = 0      # publish both: the honest block is orphaned
            else:
                pool += 1; lead -= 1     # publish one; still ahead
    return pool / (pool + honest)

def formula(a, g=0.0):
    return (a * (1 - a) ** 2 * (4 * a + g * (1 - 2 * a)) - a ** 3) / (1 - a * (1 + (2 - a) * a))

random.seed(2013)
print("alpha  simulated  formula")
for alpha in (0.20, 0.25, 0.30, 1/3, 0.35, 0.40, 0.45):
    print(f"{alpha:.3f}  {selfish(alpha):.4f}     {formula(alpha):.4f}")
print(f"gamma = 0.5, alpha = 0.25: {formula(0.25, 0.5):.4f}")
```

```
alpha  simulated  formula
0.200  0.1289     0.1297
0.250  0.1947     0.1951
0.300  0.2732     0.2731
0.333  0.3342     0.3333
0.350  0.3666     0.3665
0.400  0.4825     0.4837
0.450  0.6487     0.6518
gamma = 0.5, alpha = 0.25: 0.2500
```

Below a third the selfish pool earns less than its share (0.1951 for a quarter of
the hash rate); at exactly a third it breaks even; above, it wins big: 40% of the
hash rate earns 48% of the blocks, 45% earns 65%. The last line is the $\gamma = 1/2$
threshold: a pool with a quarter of the hash rate breaks even. Eyal and Sirer
proposed that miners break ties at random, which forces $\gamma = 1/2$ and puts the
threshold at $1/4$ instead of zero; later work found cleverer strategies that do a
little better than theirs (§17.15). No selfish mining has been clearly observed on
Bitcoin. The pool GHash.io briefly approached and, by some measurements, passed half
of Bitcoin's hash rate in June 2014 and then promised to stay below 40%, which shows
the more direct danger.

### The 51% attack

With more than half of the hash rate, no cleverness is needed: the attacker runs
the race of §17.6 with $q > p$ and wins with certainty, given time. Bitcoin's hash
rate is too large to rent, but small proof-of-work coins share mining algorithms
with bigger ones, and hash power can be hired by the hour on marketplaces. The
attack then costs only a few hours of rental, and the targets are exchanges, which
credit deposits after a fixed number of confirmations.

!!! note "Life story: the Bitcoin Gold double spends (2018)"
    **Born:** mid-May 2018, against Bitcoin Gold, a 2017 fork of Bitcoin with a
    different, GPU-friendly mining algorithm · **Purpose:** an attacker with
    majority hash power deposited coins at exchanges, traded them away, then
    published a longer secret chain that sent the same coins back to
    himself · **Helped:** about 388,000 BTG, roughly \$18 million at the time,
    moved through the attacker's address according to the Bitcoin Gold team;
    the exchange Bittrex later delisted the coin · **Status:** Bitcoin Gold
    changed its mining algorithm in July 2018 and was attacked again on a
    smaller scale in January 2020

!!! note "Life story: the Ethereum Classic 51% attacks (2019, 2020)"
    **Born:** 5 to 7 January 2019, when Coinbase saw a series of deep
    reorganizations on Ethereum Classic, the chain that kept the pre-DAO-fork
    history (§17.10) · **Purpose:** double-spend deposits at exchanges with
    rented hash power · **Helped:** Coinbase counted 219,500 ETC, about
    \$1.1 million, in double spends in 2019; in August 2020 three more attacks
    followed in a month, the first (1 August) rewriting 3,693 blocks and the
    second about 4,000; chain analysts put the first one's take above
    \$5 million, though estimates differ · **Status:** Ethereum Classic still runs
    proof of work; it added a scoring rule in late 2020 that penalizes long
    reorganizations

The lesson is about economics as much as cryptography. A proof-of-work chain is as
secure as the cost of out-computing it for a few hours, minus whatever the attacker
can steal in that time. For Bitcoin that cost is enormous. For a coin whose
algorithm can be rented, it was a few thousand dollars an hour.

## 17.8 Proof of stake and finality

*Level: intermediate.*

Proof of work makes votes expensive by burning electricity. **Proof of stake**
makes them expensive by putting money at risk: validators lock up coins as a
deposit, are chosen to propose and vote in proportion to their deposit, and can
lose the deposit if they misbehave. Peercoin (2012) was the first coin to use
stake; Ethereum, after years of research, switched in 2022. Three problems stood
in the way.

### Three problems

**Nothing at stake.** A proof-of-work miner who mines on two branches splits its
hash rate between them and earns less. A proof-of-stake validator can sign blocks
on every branch at once, for free, and so collect rewards whichever branch wins.
If everyone does that, forks never resolve, and an attacker's branch gets votes
from everyone. The fix is to make equivocation **provable and punishable**: two
signed messages that contradict each other are evidence, anyone can submit them
to the chain, and the validator's deposit is cut. This is called **slashing**.
Signatures turn a lie into a confession, the same idea as the 1982 signed-messages
algorithm.

**Long-range attacks.** Slashing only works while the deposit is still locked. A
validator who withdrew its stake a year ago has nothing left to lose, but its old
keys still sign valid messages for the epochs when it held stake. A group of former
validators, or someone who buys their old keys cheaply, can build an alternative
history starting a year back, and a newcomer who sees two histories cannot tell
by the rules alone which one is real: there is no work to compare. The accepted
answer, named **weak subjectivity** by Vitalik Buterin in 2014, is social: a node
that has been offline longer than the withdrawal delay (or is new) must get a
recent checkpoint from a source it trusts, such as friends, a block explorer or its
client software, and then refuses to revert past it. Proof of stake trades
Bitcoin's "anyone can verify from genesis" for "anyone can verify from a recent
checkpoint".

**Who proposes?** Proposers must be chosen unpredictably, or an attacker could
bribe or knock out the next one. Ethereum mixes validators' BLS signatures on the
epoch number into a running value called RANDAO; Algorand and Cardano use
verifiable random functions ([Chapter 4](04-Threshold-Cryptography.md)).

### Ethereum's Gasper

Ethereum's consensus, specified in 2020 as **Gasper**, combines two pieces.

**LMD-GHOST** is the fork-choice rule, the replacement for "longest chain". Time is
divided into **slots** of 12 seconds, grouped into **epochs** of 32 slots (6.4
minutes). In each slot one validator proposes a block and a committee of others
**attests**, voting for the block they see as the head. To choose the head, a node
starts at the last finalized block and, at each fork, steps into the branch whose
subtree carries the most stake in validators' *latest* attestations ("latest
message driven", the LMD; "greedy heaviest observed subtree", the GHOST). It keeps
the chain moving even when finality stalls.

**Casper FFG** ("the friendly finality gadget", Buterin and Virgil Griffith, 2017) is
a PBFT-style vote laid on top. The first block of each epoch is a **checkpoint**. In
every attestation a validator also votes for a link from a **source** checkpoint
(the latest justified one it knows) to a **target** checkpoint (the current epoch's).

- A checkpoint is **justified** when validators holding at least two thirds of the
  stake have voted for a link to it from a justified source. Genesis is justified.
- A justified checkpoint is **finalized** when the checkpoint of the very next epoch
  is justified with it as the source.

A validator is slashed for breaking either of two rules:

1. **No double vote:** never cast two different votes with the same target epoch.
2. **No surround vote:** never cast a vote whose source and target lie strictly
   inside the span of another of your votes ($s_1 < s_2 < t_2 < t_1$).

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Casper FFG checkpoints: epochs 0, 1 and 2 linked by two-thirds votes; epoch 0 and 1 are finalized, epoch 2 is justified, epoch 3 is pending" fill="currentColor" font-size="14">
<rect x="30" y="90" width="110" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="85" y="110" text-anchor="middle">epoch 0</text>
<text x="85" y="127" text-anchor="middle" font-size="12">finalized</text>
<rect x="185" y="90" width="110" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="240" y="110" text-anchor="middle">epoch 1</text>
<text x="240" y="127" text-anchor="middle" font-size="12">finalized</text>
<rect x="340" y="90" width="110" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="395" y="110" text-anchor="middle">epoch 2</text>
<text x="395" y="127" text-anchor="middle" font-size="12">justified</text>
<rect x="495" y="90" width="110" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 3"/>
<text x="550" y="110" text-anchor="middle">epoch 3</text>
<text x="550" y="127" text-anchor="middle" font-size="12">votes arriving</text>
<path d="M 85 90 Q 162 30 240 90" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polygon points="240,90 229,86 235,79"/>
<text x="162" y="45" text-anchor="middle" font-size="13">≥ 2/3 stake</text>
<path d="M 240 90 Q 317 30 395 90" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polygon points="395,90 384,86 390,79"/>
<text x="317" y="45" text-anchor="middle" font-size="13">≥ 2/3 stake</text>
<path d="M 395 90 Q 472 30 550 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 3"/>
<text x="472" y="45" text-anchor="middle" font-size="13">so far 41%</text>
<text x="320" y="170" text-anchor="middle" font-size="13">32 slots of 12 s per epoch; LMD-GHOST picks the head between checkpoints</text>
<text x="320" y="195" text-anchor="middle" font-size="13">finalized: justified, and the next epoch justified from it</text>
</svg>
<figcaption>Figure 17.6. Casper FFG on top of the chain. Each arc is a supermajority link from a justified source to a target checkpoint. Epoch 1 became final when epoch 2 was justified from it; epoch 2 will be final when epoch 3 is.</figcaption>
</figure>

**Accountable safety.** The two rules give the guarantee PBFT gives, and more. If two
conflicting checkpoints are both finalized, each was supported by two thirds of the
stake, so the two supporting sets overlap in at least one third, and every validator
in the overlap must have broken rule 1 or rule 2. Safety can fail only if a third of
the stake is willing to be destroyed, and when it fails the chain knows exactly
whom to punish. This is the $3f + 1$ bound with a price tag.

**Code it.** Four validators with equal stake. Validators 1 and 2 vote on both
branches of a fork, so both branches finalize; the code then finds the guilty.

```python
# A Casper FFG vote names a source and a target checkpoint (epoch, block):
# (validator, source_epoch, source_block, target_epoch, target_block)
def slashable(v1, v2):
    _, s1, _, t1, _ = v1
    _, s2, _, t2, _ = v2
    double = t1 == t2 and v1 != v2                     # rule 1: two votes, one target epoch
    surround = (s1 < s2 and t2 < t1) or (s2 < s1 and t1 < t2)   # rule 2: one vote inside another
    return double or surround

def supermajority(votes, n, src, tgt):
    voters = {v[0] for v in votes if (v[1], v[2]) == src and (v[3], v[4]) == tgt}
    return 3 * len(voters) >= 2 * n

def finality(votes, n, checkpoints):
    justified = [(0, "genesis")]
    finalized = [(0, "genesis")]
    for tgt in checkpoints:                            # in epoch order
        for src in list(justified):
            if supermajority(votes, n, src, tgt):
                justified.append(tgt)
                if tgt[0] == src[0] + 1 and src not in finalized:   # from its direct parent
                    finalized.append(src)
    return justified, finalized

n = 4                                                  # validators 0..3, equal stake
checkpoints = [(1, "X"), (1, "Y"), (2, "X2"), (2, "Y2")]
votes = []
for v in (0, 1, 2):                                    # 0, 1, 2 build on branch X
    votes += [(v, 0, "genesis", 1, "X"), (v, 1, "X", 2, "X2")]
for v in (1, 2, 3):                                    # 1, 2, 3 build on branch Y
    votes += [(v, 0, "genesis", 1, "Y"), (v, 1, "Y", 2, "Y2")]
j, f = finality(votes, n, checkpoints)
print("finalized:", f)
guilty = sorted({a[0] for a in votes for b in votes if a[0] == b[0] and slashable(a, b)})
print("provably guilty:", guilty, f"({len(guilty)} of {n}, at least n/3)")
```

```
finalized: [(0, 'genesis'), (1, 'X'), (1, 'Y')]
provably guilty: [1, 2] (2 of 4, at least n/3)
```

Two conflicting checkpoints, X and Y, are finalized at epoch 1: a safety failure.
But validators 1 and 2 each signed two votes with target epoch 1, and those
signatures are on the chain for anyone to check. Half the stake is provably guilty,
more than the one third the theorem promises.

**Liveness and the inactivity leak.** If more than a third of the stake goes offline,
no checkpoint can be justified and finality stops (blocks still flow under
LMD-GHOST). After four epochs without finality, Ethereum starts draining the
deposits of validators that are not voting, slowly at first and then faster, until
the ones still online again hold two thirds and finality resumes. This is how
Ethereum chooses availability over consistency during a partition: each side of a
split network would eventually finalize on its own, a deliberate choice discussed
under "ebb and flow" in §17.15.

### Tendermint: finality in one block

**Tendermint**, designed by Jae Kwon in 2014 and refined by Ethan Buchman (2016) and
with Zarko Milosevic (2018), applies PBFT directly to a blockchain. In each height,
a proposer (rotated by stake) proposes a block; validators broadcast a **prevote**,
then, after seeing prevotes from two thirds of the stake, a **precommit**; two
thirds of precommits commit the block. A validator that precommits a block **locks**
on it and will not prevote another block at that height unless it sees two thirds
prevoting for it in a later round. A committed block is final at once, usually
within seconds. The price is PBFT's: with more than a third offline, Tendermint
halts instead of forking. The Cosmos Hub has run it since March 2019, and its
maintained successor, CometBFT, underlies many chains.

!!! note "Life story: the Merge"
    **Born:** Ethereum's proof-of-stake beacon chain started on 1 December 2020
    and ran beside the proof-of-work chain; on 15 September 2022, after block
    15,537,393, the last one mined, the two merged and mining stopped · **Purpose:** replace energy
    spent on hashing with deposits that can be slashed, and add finality ·
    **Helped:** cut Ethereum's electricity use by about 99.95% by the Ethereum
    Foundation's estimate (an independent study by the Crypto Carbon Ratings
    Institute put it slightly higher); finality in about 13 minutes (two epochs);
    each validator deposits at least 32 ether · **Status:** running; the largest
    proof-of-stake system, with stake concentrated in a few large staking
    services, a known concern

## 17.9 Smart contracts and the EVM

*Level: intermediate.*

In the mid-1990s the computer scientist and lawyer Nick Szabo asked what contracts
would look like if they were enforced by software instead of courts. His essay
"Smart Contracts" (1994) and the longer "Formalizing and Securing Relationships on
Public Networks" (*First Monday*, 1997) used the vending machine as the model: put
in a coin and the machine, not a clerk, delivers the drink, and the terms are built
into the machine so that breaking them is expensive. Szabo imagined contracts
embedded in property itself, such as a car loan whose car stops starting when
payments stop. What he lacked was a place to run such code that no single party
controlled.

Bitcoin's script language ([Protocols, Chapter 19](../protocols/index.md))
is a deliberately small version of the idea: a coin can require several signatures,
a time lock or a hash preimage before it moves. It has no loops and little state.
In late 2013 Vitalik Buterin, then 19, wrote the **Ethereum whitepaper**, proposing a
blockchain whose transactions run programs in a general-purpose language; Gavin Wood's
"Yellow Paper" (2014) specified the machine precisely. A crowd sale in mid-2014 raised
about 31,000 bitcoins, and the network launched on **30 July 2015**.

### Accounts, the EVM and gas

Ethereum's state is a table of **accounts**. An externally owned account belongs to a
key pair and holds a balance. A **contract account** holds a balance, code and
persistent storage. A transaction from a key pair can transfer ether, create a
contract, or call one; the call runs the contract's code on the **Ethereum Virtual
Machine** (EVM), a stack machine with 256-bit words, and every node re-runs it to
check the new state. A contract can call other contracts, so programs compose: a
loan contract can call an exchange contract that calls a token contract, all inside
one transaction that either completes entirely or reverts entirely.

General-purpose code raises an old problem: a program that loops forever would make
every node loop forever, and by the halting problem no checker can reject such
programs in advance. Ethereum's answer is **gas**. Every instruction has a fixed gas
cost, every transaction names a gas limit and a price per unit of gas, and execution
stops (and reverts, keeping the fee) when the gas runs out. Some real costs: a plain
ether transfer costs 21,000 gas; `ADD` costs 3; writing a new nonzero value to
storage costs 20,000, because every node must keep it forever. At a gas price of 20
gwei ($20 \times 10^{-9}$ ether), a transfer costs $21{,}000 \times 20 \times 10^{-9} =
0.00042$ ether. Since the London upgrade of August 2021 (EIP-1559) part of each fee,
the base fee, is burned rather than paid to the block producer, and the base fee
rises and falls with demand.

Gas makes the system safe from runaway code, not from wrong code. A contract is
public, immutable once deployed (unless designed to be upgradable, which brings its
own risks), holds real money, and can be called by anyone with any inputs, including
other contracts written by attackers. Every bug is a public bounty.

!!! note "Life story: Ethereum"
    **Born:** whitepaper by Vitalik Buterin in late 2013; Yellow Paper by Gavin
    Wood in 2014; network launched 30 July 2015 ("Frontier") · **Purpose:** a
    blockchain that runs arbitrary programs, so that tokens, exchanges, loans and
    organizations can be written as contracts · **Helped:** the token standards,
    decentralized exchanges and lending, NFTs, and the rollups of §17.12; proof of
    work until the Merge of 2022 · **Status:** the second-largest cryptocurrency and
    the largest smart-contract platform; its history is also a catalogue of
    contract failures, told next

## 17.10 When contracts break: The DAO, Parity and the bridges

*Level: intermediate.*

### The DAO and reentrancy

**The DAO** ("decentralized autonomous organization") was a contract-run investment
fund. Its crowd sale in May 2016 collected about 12 million ether, then worth some
\$150 million and roughly a seventh of all ether in existence. Members could leave
by "splitting" into a child DAO and taking their ether with them. On **17 June
2016** an attacker drained about **3.6 million ether** into such a child, using a
bug now called **reentrancy**.

In the EVM, sending ether to a contract runs that contract's code. The DAO's
withdrawal function sent the ether *first* and updated the member's balance
*afterwards*. The attacker's contract, on receiving the ether, immediately called
the withdrawal function again; the balance had not yet been zeroed, so the DAO paid
again, and again, each payment nested inside the previous one.

### Break it

A bank contract in Python, with the same mistake. Paying a depositor calls the
depositor's `receive` method, as sending ether calls a contract.

```python
class Bank:
    """A toy contract: it holds coins for its depositors."""
    def __init__(self):
        self.balance = {}
        self.coins = 0

    def deposit(self, who, amount):
        self.balance[who] = self.balance.get(who, 0) + amount
        self.coins += amount

    def withdraw(self, who):
        amount = self.balance.get(who, 0)
        if amount > 0 and self.coins >= amount:      # check
            self.coins -= amount
            who.receive(self, amount)                # interaction: pay, which runs the caller's code
            self.balance[who] = 0                    # effect, too late

class Honest:
    def __init__(self): self.coins = 0
    def receive(self, bank, amount): self.coins += amount

class Thief:
    def __init__(self): self.coins = 0
    def receive(self, bank, amount):
        self.coins += amount
        if bank.coins >= amount:                     # call back in before the balance is zeroed
            bank.withdraw(self)

bank = Bank()
alice, bob, thief = Honest(), Honest(), Thief()
bank.deposit(alice, 50); bank.deposit(bob, 40); bank.deposit(thief, 10)
print("bank holds", bank.coins)
bank.withdraw(thief)
print("thief deposited 10, now has", thief.coins, "| bank holds", bank.coins)
bank.withdraw(alice)
print("alice tries to withdraw 50, gets", alice.coins)
```

```
bank holds 100
thief deposited 10, now has 100 | bank holds 0
alice tries to withdraw 50, gets 0
```

The thief's balance of 10 is checked ten times, once per nested call, and is
zeroed only after the bank is empty.

### Fix it

The rule is called **checks-effects-interactions**: check the conditions, update
your own state, and only then call out to anything else. A **reentrancy lock** that
refuses nested calls is a second guard.

```python
class Bank:
    def __init__(self):
        self.balance = {}
        self.coins = 0
        self.busy = False

    def deposit(self, who, amount):
        self.balance[who] = self.balance.get(who, 0) + amount
        self.coins += amount

    def withdraw(self, who):
        if self.busy:                                # a lock, as a second guard
            raise RuntimeError("reentrant call refused")
        amount = self.balance.get(who, 0)
        if amount <= 0 or self.coins < amount:       # checks
            return
        self.balance[who] = 0                        # effects: update the books first
        self.coins -= amount
        self.busy = True
        try:
            who.receive(self, amount)                # interactions: pay last
        finally:
            self.busy = False

class Honest:
    def __init__(self): self.coins = 0
    def receive(self, bank, amount): self.coins += amount

class Thief:
    def __init__(self): self.coins = 0
    def receive(self, bank, amount):
        self.coins += amount
        try:
            bank.withdraw(self)
        except RuntimeError as e:
            print("  the bank says:", e)

bank = Bank()
alice, bob, thief = Honest(), Honest(), Thief()
bank.deposit(alice, 50); bank.deposit(bob, 40); bank.deposit(thief, 10)
bank.withdraw(thief)
print("thief has", thief.coins, "| bank holds", bank.coins)
bank.withdraw(alice)
print("alice gets", alice.coins, "| bank holds", bank.coins)
```

```
  the bank says: reentrant call refused
thief has 10 | bank holds 90
alice gets 50 | bank holds 40
```

Either fix alone stops this thief: with the balance zeroed first, the nested call
finds nothing to withdraw. Locks matter when the reentry goes through a *different*
function that reads the same state. Reentrancy has not gone away: in July 2023 a bug
in the Vyper compiler broke the reentrancy locks it generated, and pools on the Curve
exchange lost tens of millions of dollars.

**The fork.** The DAO's code made the drained ether wait 28 days in the child DAO
before it could move, which gave the community time to argue. On 20 July 2016, at
block 1,920,000, Ethereum's clients applied a **hard fork**: an irregular state change
that moved the DAO's ether to a contract from which the original investors could
withdraw. A minority refused, on the principle that the chain's history must not be
rewritten by a vote of its users, and kept running the unforked chain. It became
**Ethereum Classic**, the chain of the 51% attacks in §17.7. The episode settled, in
practice, that "code is law" holds only until enough people disagree.

!!! note "Life story: The DAO"
    **Born:** April 2016, a crowd-funded venture fund run by a smart contract;
    the sale closed in late May with about 12 million ether · **Purpose:** let
    token holders vote on which projects to fund, with no managers · **Helped:**
    nobody as intended; on 17 June 2016 a reentrancy bug let an attacker move
    about 3.6 million ether · **Retired:** by the hard fork of 20 July 2016, which
    returned the ether to investors · **Replaced by:** two chains, Ethereum and
    Ethereum Classic, and a lasting lesson in contract design

### The Parity multisig freeze

Parity, a popular Ethereum client, offered **multisignature wallets**: contracts
that move funds only when, say, two of three owners approve. To save gas, each wallet
was a thin shell that delegated its logic to one shared **library contract**. In July
2017 a bug let attackers re-run the initialization function of some wallets, make
themselves owners and take about 150,000 ether. The fixed library was deployed, but
the library contract *itself* had never been initialized. On 6 November 2017 a user
called it, became its owner, and then called its self-destruct function, which removed
the library's code. Every wallet that depended on it lost its logic. About 513,000
ether in 587 wallets, then worth roughly \$150 million (reports range higher), could
no longer be moved. A proposal to restore the funds by another irregular state change
(EIP-999) failed to win support, and the ether remains frozen.

!!! note "Life story: the Parity library freeze"
    **Born:** 6 November 2017, when an uninitialized shared library contract
    was taken over and self-destructed · **Purpose:** none; the user who did it
    said it was an accident · **Helped:** froze about 513,000 ether in 587
    multisignature wallets; showed that shared code is a shared single point of
    failure · **Status:** frozen to this day; library contracts are now
    initialized at deployment and Ethereum has since restricted self-destruct

### Bridges: consensus in a small room

A **bridge** moves assets between chains. Most work by locking coins in a contract
on chain A and minting matching tokens on chain B, and the minting contract must
decide whether the lock on chain A really happened. Usually it trusts a small
committee that signs "this deposit happened". The bridge is then exactly as secure as
that committee, however secure the two chains are. Bridges hold large pools of locked
coins and have become the largest single source of losses.

!!! note "Life story: the Wormhole bridge hack"
    **Born:** 2 February 2022, on the bridge between Solana and Ethereum ·
    **Purpose:** the attacker passed a fake account to the Solana contract's
    signature-verification step, which used a deprecated function that did not
    check it, and so convinced the bridge that its guardians had approved a
    deposit that never happened · **Helped:** about 120,000 wrapped ether minted
    with nothing behind them, roughly \$320 million · **Status:** Jump Crypto,
    the bridge's backer, replaced the missing ether within days

!!! note "Life story: the Ronin bridge hack"
    **Born:** 23 March 2022, on the bridge of Ronin, the Ethereum-linked chain
    of the game Axie Infinity; noticed only on 29 March, when a user could not
    withdraw · **Purpose:** withdrawals needed 5 of 9 validator signatures;
    attackers obtained four keys run by the game's developer, Sky Mavis, and a
    fifth through an old permission granted to it by another validator ·
    **Helped:** 173,600 ether and 25.5 million USDC, about \$625 million at the
    time; the FBI attributed the attack to North Korea's Lazarus Group ·
    **Status:** the bridge reopened with more validators and a higher threshold

Both hacks are consensus failures in disguise. Wormhole's guardians never signed; the
check that they had was broken. Ronin's 5-of-9 committee was really a committee of
two organizations. Bridges that verify the other chain's consensus directly, with a
light client or a zero-knowledge proof of its finality (§17.12), replace the room of
signers with mathematics, at a higher cost per transfer.

## 17.11 MEV and front-running

*Level: intermediate.*

Consensus decides the order of transactions, and on a chain full of exchanges and
loans the order is worth money. A block producer who sees a large pending purchase
can buy just before it and sell just after it. In April 2019 Philip Daian and seven
co-authors published "Flash Boys 2.0", named after Michael Lewis's book on
high-frequency trading. They showed bots bidding against each other in **priority gas
auctions** to have their arbitrage transactions included first, and named the profit
a block producer can capture by ordering, inserting or censoring transactions
**miner extractable value**, now **maximal extractable value**, or MEV.

**A sandwich, by hand.** Automated exchanges price assets with a formula. The common
constant-product pool keeps $x \cdot y = k$ for its two reserves. Take a pool of
$x = 100$ ether and $y = 200{,}000$ USDC, so $k = 2 \times 10^7$ and the price is 2,000.

- Alone, a victim spends 20,000 USDC: $y$ becomes 220,000, $x = k/y = 90.909$, and the
  victim receives $100 - 90.909 = 9.091$ ether.
- Sandwiched: the attacker first spends 20,000 USDC and receives 9.091 ether. The
  victim's 20,000 then takes $y$ to 240,000 and $x$ to 83.333: the victim receives only
  $90.909 - 83.333 = 7.576$ ether. The attacker sells its 9.091 ether: $x = 92.424$,
  $y = k/x = 216{,}393$, and receives $240{,}000 - 216{,}393 = 23{,}607$ USDC.

The attacker made 3,607 USDC in one block, at no risk; the victim lost 1.515 ether,
about 3,000 USDC. Exchange fees, ignored here, shrink both numbers but not the idea.

**Where MEV went.** Front-running bots once flooded the network with competing bids.
Flashbots, a research group founded in 2020, moved the competition into sealed-bid
auctions off the chain. Since the Merge, Ethereum's block production has been split
in practice: specialized **builders** assemble the most profitable block they can,
bid for the right to have it proposed, and the validator whose turn it is simply signs
the highest bid, through relay software called MEV-Boost that most validators run.
This **proposer-builder separation** keeps MEV from rewarding validators who invest in
trading infrastructure, but it concentrates block building in a handful of builders,
which can censor. Proposals to write PBS into the protocol itself, and to encrypt
transactions until their order is fixed (with threshold decryption,
[Chapter 4](04-Threshold-Cryptography.md)), address that. MEV is a consensus problem
nobody had in 1999: PBFT promises that replicas agree on *an* order, not a *fair* one.

!!! note "Life story: Flash Boys 2.0 and MEV"
    **Born:** April 2019, Daian, Goldfeder, Kell, Li, Zhao, Bentov, Breidenbach
    and Juels, published at IEEE Security and Privacy in 2020 · **Purpose:**
    measure front-running and priority gas auctions on Ethereum and name the
    value of transaction ordering · **Helped:** led to Flashbots (2020), MEV-Boost
    and proposer-builder separation (2022), and research on fair ordering ·
    **Status:** MEV is a permanent feature of public chains with open order books;
    estimates of its total size run to hundreds of millions of dollars a year and
    are uncertain

## 17.12 Scaling: rollups and data availability

*Level: intermediate.*

Every Ethereum node re-runs every transaction. That is the source of its security and
the reason it processes only tens of transactions per second. A **rollup** keeps the
security and moves the work: an operator collects thousands of transactions, executes
them off the main chain, and posts to the main chain (layer 1) a new **state root**
(a Merkle commitment to all balances) together with the transaction **data**,
compressed. A contract on layer 1 holds the users' funds and accepts a new state root
only under one of two rules.

**Optimistic rollups** assume the state root is correct and allow anyone to challenge
it during a window, usually seven days. A challenger who disagrees starts an
interactive game in which the two sides bisect the disputed computation until they
reach a single step, which the layer 1 contract executes itself to decide who lied:
a **fraud proof**. One honest watcher is enough. The cost is the window: a
withdrawal to layer 1 waits a week (third-party services pay out earlier for a fee).
Arbitrum and Optimism, both launched in 2021, are the largest.

**Zero-knowledge rollups** post a **validity proof** with every batch: a SNARK or
STARK showing that the new state root is the result of correctly executing the batch
on the old one ([Chapter 7](07-SNARKs.md), [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)).
The contract checks the proof in milliseconds, and a withdrawal is final as soon as the
proof is accepted. Proving is expensive, and proving the EVM itself ("zkEVM") took
years of work; several zkEVM rollups have run since 2023.

**Why the data must be posted.** Neither rule works if the operator posts a state root
but withholds the transactions. Under the optimistic rule nobody could compute the
disputed state to challenge it. Under the validity rule the state would be correct but
unknown: users could not build the Merkle proofs they need to withdraw, and the
operator could freeze them out. Rollups therefore depend on **data availability**: the
guarantee that the data behind a commitment was published and could be downloaded by
anyone who wanted it. Mustafa Al-Bassam, Alberto Sonnino and Vitalik Buterin showed
in 2018 how light nodes can check this by **sampling**: extend the data with an
erasure code, so that withholding any of it means withholding a large fraction, and
download a few random pieces; if they all arrive, the whole is almost certainly
available. An earlier scaling design, Plasma (2017), had foundered on exactly this
problem.

Posting data was the main cost of a rollup until the Dencun upgrade of March 2024
added **blob transactions** (EIP-4844): large chunks of data, committed to with KZG
polynomial commitments, kept by the network for about 18 days and then dropped, priced
in their own fee market. Rollup fees fell by an order of magnitude or more.
[Chapter 3](03-Commitments.md) explains blobs, their KZG commitments and the sampling
that followed in 2025; this chapter only needs the role they play.

Rollups are a consensus design as much as a scaling one. The rollup does not run its
own Byzantine agreement: it borrows layer 1's ordering and finality, and adds either
one honest watcher (optimistic) or one sound proof (zero-knowledge). Most rollups
today still have a single operator ordering transactions and an upgrade key that a
small council controls, so the full guarantee is a work in progress.

## 17.13 A ledger between Mars and Earth

*Level: intermediate.*

Arcadia City trades with Earth: it buys spare parts and medicines, sells data and
water-ice rights, and its residents send money home. Could the city simply join one
of Earth's proof-of-work chains, or run a joint one with Earth? The one-way light
time between the planets runs from about 4 to about 24 minutes, and §17.3 already
warned that Nakamoto consensus is safe only while blocks spread much faster than they
are found. Put numbers on it. If blocks arrive as a Poisson process with mean
interval $T$, and a new block takes time $d$ to reach the other side, the chance that
the other side finds a competing block meanwhile is $1 - e^{-d/T}$.

```python
import math, random

def stale_rate(delay, interval):
    """Chance that a competing block is found while a new block is still in
    flight: 1 - exp(-delay / interval), for Poisson block arrivals."""
    return 1 - math.exp(-delay / interval)

print("delay        10-minute blocks   12-second blocks")
for label, d in (("2 s (Earth)", 2), ("4 min", 240), ("12 min", 720), ("24 min", 1440)):
    print(f"{label:<12} {stale_rate(d, 600):>8.1%}          {stale_rate(d, 12):>8.1%}")

random.seed(4)                                   # check one case by simulation
d, T, trials, hit = 240, 600, 100_000, 0
for _ in range(trials):
    if random.expovariate(1 / T) < d:            # next block arrives before this one does
        hit += 1
print(f"simulated, 4 min and 10-minute blocks: {hit / trials:.1%}")
```

```
delay        10-minute blocks   12-second blocks
2 s (Earth)      0.3%             15.4%
4 min           33.0%            100.0%
12 min          69.9%            100.0%
24 min          90.9%            100.0%
simulated, 4 min and 10-minute blocks: 33.0%
```

The model is crude (on Earth most blocks reach most miners in well under 2 seconds,
so real stale rates are lower than the first row suggests), but the Mars rows need no
precision. Even at closest approach a third of the blocks mined on one planet would
collide with blocks mined on the other; at the far end nine in ten would. In practice
the planet with more hash power wins every race, Arcadia's miners would waste nearly
all their work, and the effective attacker threshold falls far below one half, since
honest Martian hash power is not helping the honest chain. A fast chain is hopeless.
And for about two weeks every 26 months, when the Sun sits between the planets, the
link goes dark altogether; a shared longest-chain ledger would split in two and, when
the link returned, erase one side's two weeks of history.

**What a settlement would use instead.** Arcadia should keep its own ledger with
**BFT finality**: a permissioned committee, say seven validators run by the district
wardens and the city utilities (tolerating $f = 2$ faulty), running a Tendermint-style
protocol inside the city, where messages take milliseconds. Payments inside Arcadia are
final in seconds and never reverted. Earth's institutions run their own ledgers the same
way. Between the two, a **federation** settles: each side periodically publishes its
latest finalized block header with a threshold signature from at least $2f + 1$ of its
validators ([Chapter 4](04-Threshold-Cryptography.md)), and each side checks the
other's header as a light client. Cross-planet payments are locked on one side and
released on the other against a proof of inclusion under a signed header, or simply
netted and settled once a day. The light delay then costs latency only, the 4 to 24
minutes a letter takes anyway, never safety, and a conjunction blackout pauses
settlement without forking anyone's history: PBFT's choice of consistency over
availability, made on purpose. The trust assumption is explicit: each side trusts
that fewer than a third of the *other* side's validators would sign a false header,
and a false header, being signed, is evidence.

## 17.14 In the real world

*Level: intermediate.*

| System | Consensus | Who may take part | Finality | Faults tolerated |
|---|---|---|---|---|
| etcd, ZooKeeper, Spanner | Raft, Zab, Paxos | one operator's machines | immediate | $f$ crashes of $2f + 1$ |
| Hyperledger Fabric | Raft ordering service | known organizations | immediate | crashes (ordering) |
| Bitcoin | proof of work, most work | anyone | probabilistic; about 1 hour for 6 blocks | hash-rate minority |
| Ethereum | Gasper (FFG + LMD-GHOST) | anyone with 32 ether | about 13 minutes | under 1/3 of stake |
| Cosmos chains | Tendermint (CometBFT) | a fixed validator set, by stake | one block, seconds | under 1/3 of stake |

**What blockchains are good for.** A public chain is a way for parties who do not
trust each other, and do not trust any one operator, to share a ledger that nobody can
quietly edit. That is valuable in some places: moving value across borders without
asking permission, for people whose banks or governments are unreliable or hostile;
public, timestamped commitments that anyone can audit, as in the transparency logs of
[Chapter 3](03-Commitments.md); settlement among rival institutions that would rather
share a neutral rulebook than appoint one of themselves as keeper; and programs, such as
an exchange or an auction, whose rules everyone can read and nobody can change after
the money is in.

**What they are not good for.** If a trusted operator exists and is acceptable, a
database is faster, cheaper and easier to fix, and Byzantine agreement among one
company's own servers buys nothing. A chain records what it is told: it cannot know
whether a shipping container really holds bananas, so supply-chain ledgers inherit
the honesty of whoever types in the data. Several large projects reached that
conclusion: the TradeLens shipping platform of IBM and Maersk was shut down in 2023,
and the Australian Securities Exchange abandoned its blockchain replacement for its
settlement system in 2022 after years of work. Public chains are poor places for
personal data, since nothing can be deleted and everything is visible; that problem has
its own chapter ([Chapter 18](18-Privacy-on-Ledgers.md)). Transactions are irreversible,
which is the point and also a hazard: a stolen key or a contract bug is final, as
§17.10 showed, unless the community forks. And the security of a chain, the
cost of attacking it, depends on the value of its coin, so small chains are weak
chains.

**The record of losses.** Most money lost on blockchains has been lost not to broken
consensus but to everything around it: contract bugs, stolen keys, compromised bridge
committees and front ends. The consensus protocols of this chapter, where they were
large enough, have held up; the attacks on them (§17.7) hit small chains whose hash
power could be rented.

## 17.15 Going deeper

*Level: expert.*

**Proving Nakamoto consensus.** Juan Garay, Aggelos Kiayias and Nikos Leonardos's
"backbone" paper (EUROCRYPT 2015) defined the properties a longest-chain protocol
provides, **common prefix** (honest chains agree except for their last $k$ blocks),
**chain quality** (a fair fraction of blocks are honest) and **chain growth**, and
proved them for an honest majority in a synchronous model. Rafael Pass, Lior Seeman and
abhi shelat (2017) extended this to networks with delay $\Delta$ and showed that safety
needs the honest hash rate, discounted by the forks that $\Delta$ causes, to exceed the
attacker's. Selfish mining fits this frame: chain quality falls below the honest share.

**The exact double-spend probability.** Nakamoto's Poisson step treats the attacker's
progress as if the honest miners took exactly the expected time. Meni Rosenfeld (2014)
modeled the attacker's blocks as negative-binomially distributed, and Grunspan and
Pérez-Marco (2017) found a closed form,

$$
P(z, q) = I_{4pq}\!\left(z, \tfrac12\right),
$$

where $I$ is the regularized incomplete beta function. It gives larger probabilities
than the whitepaper once $z \ge 2$: for $q = 0.1$ about 0.0018 at $z = 5$ and 0.00059 at
$z = 6$, against the whitepaper's 0.00091 and 0.00024. Against a 10% attacker the
exact answer needs six blocks, not five, for $P < 0.1\%$; the six-block custom
survives, with less margin than the table suggests.

**Optimal selfish mining.** Ayelet Sapirshtein, Yonatan Sompolinsky and Aviv Zohar
(2016) solved the full Markov decision process and found strategies better than Eyal and
Sirer's; with $\gamma = 0$ the profitability threshold drops from $1/3$ to about $0.232$.
Combined with double spending and with "eclipse" attacks that isolate victims' network
connections, withholding strategies are the main theoretical threat to proof of work
short of a majority.

**Linear BFT and DAGs.** PBFT's view change needs $O(n^2)$ messages, or worse.
HotStuff (Yin, Malkhi, Reiter, Gueta and Abraham, PODC 2019) uses threshold signatures so
each phase costs $O(n)$, and chains its phases so that one round of votes advances
several decisions; it was the basis of Facebook's abandoned Diem project and of later
chains. DAG-based protocols (Narwhal and Tusk, 2022; Bullshark, 2022) separate spreading
transactions from ordering them, reaching high throughput with hundreds of validators,
and HoneyBadgerBFT (2016) showed a fully asynchronous BFT protocol with threshold
encryption and a common coin.

**Availability versus finality.** Joachim Neu, Ertem Nusret Tas and David Tse (2021)
proved that no protocol can be both live under dynamic participation (validators coming
and going, as in Bitcoin) and safe under network partitions (as in PBFT). Their answer,
"ebb-and-flow" protocols, runs two ledgers at once: an available one that always grows
and a finalized prefix of it that stops during partitions. Gasper is such a pair, which
explains its design. Research on single-slot finality aims to shorten Ethereum's 13
minutes to one slot.

**Provable proof of stake.** Ouroboros (Kiayias, Russell, David and Oliynykov, CRYPTO
2017), behind Cardano, was the first proof-of-stake protocol with a security proof in
the backbone style; Algorand (Gilad, Hemo, Micali, Vlachos and Zeldovich, SOSP 2017) uses
verifiable random functions to select a small secret committee for each step, so an
adversary cannot know whom to attack until the committee has already spoken. Both
connect this chapter to the VRFs and threshold signatures of
[Chapter 4](04-Threshold-Cryptography.md).

## Check yourself

??? question "1. Why does validity matter in the definition of consensus?"

    Without it, a protocol in which every node always decides "nothing", or always
    decides 0, would satisfy agreement and termination trivially. Validity forces the
    decided value to be one that was actually proposed.

??? question "2. A Byzantine-tolerant committee must survive 3 traitors. How many members does it need, and how large is a quorum?"

    $n = 3f + 1 = 10$ members, quorums of $2f + 1 = 7$. Two quorums share at least
    $7 + 7 - 10 = 4$ members, so at least one honest member is in both.

??? question "3. Why do Paxos and Raft need only 2f + 1 machines while PBFT needs 3f + 1?"

    With crash faults every machine that answers tells the truth, so two quorums
    need to overlap in just one machine: majorities of $2f + 1$ do. With Byzantine
    faults the overlap must contain an honest machine, so it must hold at least
    $f + 1$ machines, which needs $n \ge 3f + 1$.

??? question "4. Does FLP mean consensus protocols cannot work in practice?"

    No. It says no deterministic protocol can guarantee both safety and termination
    in a fully asynchronous network with one crash. Practical protocols stay safe
    always and terminate when the network is timely enough (partial synchrony), use
    randomness, or, like Bitcoin, give up deterministic finality.

??? question "5. In PBFT with n = 4, the faulty replica stays silent. Show that the other three can still commit."

    A quorum is $2f + 1 = 3$. The primary's pre-prepare plus prepares from the two
    honest backups make each honest replica prepared; their three commits form a
    quorum, so each commits and replies. The client sees three matching replies and
    needs only $f + 1 = 2$.

??? question "6. Compute by hand the chance that an attacker with 20% of the hash rate reverses a payment with one confirmation."

    $q/p = 0.25$, $\lambda = 0.25$. The $k = 0$ term is $e^{-0.25}(1 - 0.25) = 0.7788 \times 0.75 = 0.5841$; the $k = 1$ term is 0. So $P = 1 - 0.5841 = 0.4159$, about 42%.

??? question "7. For gamma = 0, why does selfish mining stop paying below one third of the hash rate?"

    The pool wins whole runs of blocks when it gets ahead, but loses every race from
    lead 1 when $\gamma = 0$, and with a small $\alpha$ it rarely builds a lead of 2.
    Eyal and Sirer's formula gives $R(\alpha, 0) > \alpha$ exactly when
    $\alpha > (1 - 0)/(3 - 0) = 1/3$; the simulation shows 0.1951 for $\alpha = 0.25$.

??? question "8. Slashing solves nothing-at-stake. Why does it not solve long-range attacks?"

    Slashing takes the deposit of a validator caught signing conflicting messages,
    but only while the deposit is still locked. Keys of validators who withdrew long
    ago can sign an alternative old history with nothing left to lose. The defense is
    weak subjectivity: nodes refuse to revert past a recent trusted checkpoint.

??? question "9. In the toy bank, why does zeroing the balance before paying stop the thief even without the lock?"

    When the thief's `receive` calls `withdraw` again, the bank reads its balance,
    which is already 0, and the check fails. The nested call gets nothing. The lock
    adds protection when the reentry comes through another function that reads state
    the first function has not yet updated.

??? question "10. Why must an optimistic rollup wait about a week before a withdrawal is final, and why do both kinds of rollup need data availability?"

    An optimistic rollup accepts state roots without proof, so it must give any
    honest watcher time to detect a wrong one and win a fraud-proof game. A
    zero-knowledge rollup proves every batch, so no window is needed. Both need the
    data published: without it nobody can compute the state to challenge it, and
    users cannot build the Merkle proofs they need to withdraw their funds.

## What you learned

- Consensus asks for agreement, validity and termination among parties some of whom
  fail. Byzantine agreement needs $n \ge 3f + 1$; three generals cannot handle one
  traitor, because a loyal lieutenant cannot tell which of two worlds it is in.
- FLP proves that no deterministic protocol always terminates in an asynchronous
  network with one crash. Real protocols escape by assuming timing only for liveness,
  by using randomness, or by giving up deterministic finality.
- Paxos and Raft handle crashes with majorities of $2f + 1$; PBFT handles lies with
  quorums of $2f + 1$ out of $3f + 1$, in three phases, because two such quorums
  always share an honest replica.
- Nakamoto consensus counts work instead of identities and offers probabilistic
  finality; the whitepaper's formula shows the attacker's chance falling
  exponentially with confirmations, five blocks for $P < 0.1\%$ at $q = 0.1$.
- Selfish mining pays above one third of the hash rate ($\gamma = 0$), and 51% attacks
  with rented hash power have hit Bitcoin Gold and Ethereum Classic.
- Proof of stake replaces work with slashable deposits; Gasper combines LMD-GHOST with
  Casper FFG, and conflicting finality makes a third of the stake provably guilty.
  Tendermint finalizes every block but halts when a third is offline.
- Smart contracts are public programs holding money: reentrancy drained The DAO, an
  unguarded library froze Parity's wallets, and bridges lost hundreds of millions
  through small committees and broken checks. Transaction order itself is valuable
  (MEV).
- Rollups move execution off the chain and keep security with fraud proofs or validity
  proofs, provided the data stays available.
- A city light-minutes from Earth needs its own BFT ledger and a federation for
  settlement, not a shared fast chain.

**Next:** [Chapter 18](18-Privacy-on-Ledgers.md), why a public ledger is a
surveillance tool, and what Monero, Zcash and mixers can and cannot hide.

## Further reading

- Marshall Pease, Robert Shostak and Leslie Lamport, "Reaching Agreement in the
  Presence of Faults", *Journal of the ACM* 27 (1980).
- Leslie Lamport, Robert Shostak and Marshall Pease, "The Byzantine Generals Problem",
  *ACM Transactions on Programming Languages and Systems* 4 (1982).
- Danny Dolev and H. Raymond Strong, "Authenticated Algorithms for Byzantine
  Agreement", *SIAM Journal on Computing* 12 (1983).
- Michael Ben-Or, "Another Advantage of Free Choice: Completely Asynchronous Agreement
  Protocols" (PODC 1983).
- Michael Fischer, Nancy Lynch and Michael Paterson, "Impossibility of Distributed
  Consensus with One Faulty Process", *Journal of the ACM* 32 (1985).
- Cynthia Dwork, Nancy Lynch and Larry Stockmeyer, "Consensus in the Presence of
  Partial Synchrony", *Journal of the ACM* 35 (1988).
- Leslie Lamport, "The Part-Time Parliament", *ACM Transactions on Computer Systems* 16
  (1998), and "Paxos Made Simple" (2001).
- Miguel Castro and Barbara Liskov, "Practical Byzantine Fault Tolerance" (OSDI 1999).
- Seth Gilbert and Nancy Lynch, "Brewer's Conjecture and the Feasibility of Consistent,
  Available, Partition-Tolerant Web Services", *ACM SIGACT News* 33 (2002).
- Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008), section 11.
- Christian Decker and Roger Wattenhofer, "Information Propagation in the Bitcoin
  Network" (IEEE P2P 2013).
- Ittay Eyal and Emin Gün Sirer, "Majority is not Enough: Bitcoin Mining is Vulnerable"
  (Financial Cryptography 2014; arXiv 2013).
- Diego Ongaro and John Ousterhout, "In Search of an Understandable Consensus
  Algorithm" (USENIX ATC 2014).
- Meni Rosenfeld, "Analysis of Hashrate-Based Double Spending" (2014).
- Juan Garay, Aggelos Kiayias and Nikos Leonardos, "The Bitcoin Backbone Protocol"
  (EUROCRYPT 2015).
- Yonatan Sompolinsky and Aviv Zohar, "Secure High-Rate Transaction Processing in
  Bitcoin" (Financial Cryptography 2015): GHOST.
- Ayelet Sapirshtein, Yonatan Sompolinsky and Aviv Zohar, "Optimal Selfish Mining
  Strategies in Bitcoin" (Financial Cryptography 2016).
- Andrew Miller, Yu Xia, Kyle Croman, Elaine Shi and Dawn Song, "The Honey Badger of BFT
  Protocols" (CCS 2016).
- Rafael Pass, Lior Seeman and abhi shelat, "Analysis of the Blockchain Protocol in
  Asynchronous Networks" (EUROCRYPT 2017).
- Cyril Grunspan and Ricardo Pérez-Marco, "Double Spend Races" (2017).
- Vitalik Buterin and Virgil Griffith, "Casper the Friendly Finality Gadget" (2017).
- Vitalik Buterin, Diego Hernandez, Thor Kamphefner and others, "Combining GHOST and
  Casper" (2020): Gasper.
- Ethan Buchman, Jae Kwon and Zarko Milosevic, "The Latest Gossip on BFT Consensus"
  (2018): Tendermint.
- Maofan Yin, Dahlia Malkhi, Michael Reiter, Guy Golan Gueta and Ittai Abraham,
  "HotStuff: BFT Consensus with Linearity and Responsiveness" (PODC 2019).
- Joachim Neu, Ertem Nusret Tas and David Tse, "Ebb-and-Flow Protocols" (IEEE S&P 2021).
- Nick Szabo, "Formalizing and Securing Relationships on Public Networks", *First
  Monday* 2 (1997).
- Vitalik Buterin, "Ethereum: A Next-Generation Smart Contract and Decentralized
  Application Platform" (2013); Gavin Wood, "Ethereum: A Secure Decentralised
  Generalised Transaction Ledger" (Yellow Paper, 2014).
- Philip Daian and others, "Flash Boys 2.0: Frontrunning, Transaction Reordering, and
  Consensus Instability in Decentralized Exchanges" (IEEE S&P 2020; arXiv 2019).
- Mustafa Al-Bassam, Alberto Sonnino and Vitalik Buterin, "Fraud and Data Availability
  Proofs" (2018).
- EIP-1559 (fee market, 2021), EIP-4844 (blob transactions, 2024), EIP-6780 (restricting
  self-destruct, 2024).
- Incident reports: Parity Technologies, "A Postmortem on the Parity Multi-Sig Library
  Self-Destruct" (November 2017); Sky Mavis, "Community Alert: Ronin Validators
  Compromised" (March 2022); Coinbase, "Deep Chain Reorganization Detected on Ethereum
  Classic" (January 2019).
- In this book: [Chapter 3](03-Commitments.md) (KZG and blobs),
  [Chapter 4](04-Threshold-Cryptography.md) (threshold signatures, VRFs, beacons),
  [Chapter 7](07-SNARKs.md) and [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)
  (the proofs inside zk-rollups), [Chapter 18](18-Privacy-on-Ledgers.md) (privacy on
  ledgers). Bitcoin itself: [Protocols, Chapter 19](../protocols/index.md).
