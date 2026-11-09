# 16. Electronic Voting

*An election has to do two things that pull against each other. It must keep
every ballot secret, so that nobody can buy or force a vote, and it must
produce a count that every loser can check, so that nobody has to take the
winner's word for it. Paper and a room full of observers do both, slowly. This
chapter shows how cryptography does both with mathematics instead: ballots
encrypted to a key that no single trustee holds, a proof on every ballot that
it contains a 0 or a 1, a tally computed by multiplying ciphertexts, and a
decryption that comes with its own proof. You will run a complete toy election
by hand and in code, stuff the ballot box with a vote worth five and watch the
proofs catch it, shuffle encrypted ballots with a proof that nothing was
swapped, and audit a paper count with a few dozen randomly drawn ballots. Then
come the real systems: Helios, Estonia, the Swiss Post system that a public
test pulled apart in 2019, the Washington, DC test that played a college fight
song, and the reasons most experts still say: paper, with proofs and audits,
and not the internet.*

!!! abstract "In this chapter"
    **You will learn:**

    - why secret ballots and checkable counts conflict, and why paper is so
      hard to beat;
    - the requirements a voting system is judged by: eligibility, ballot
      privacy, individual and universal verifiability (together, end-to-end
      verifiability), receipt-freeness and coercion resistance;
    - homomorphic tallying with exponential ElGamal (Cramer, Gennaro and
      Schoenmakers, 1997), worked by hand with a 2-of-3 shared key;
    - a complete toy election in code, with 0-or-1 proofs on every ballot and
      proofs on every partial decryption, and the ballot that counts five;
    - verifiable mix-nets and shuffle proofs, from Sako and Kilian (1995) to
      Terelius and Wikström (2010), with a toy shuffle proof in code;
    - how a voter checks a machine they cannot inspect: Benaloh's "cast or
      audit" challenge and tracking codes;
    - what happened in Helios, Estonia, Switzerland, Washington, DC, Voatz and
      ElectionGuard, and why risk-limiting audits of paper ballots are the
      practical gold standard.

    **You need:** [Chapter 4](04-Threshold-Cryptography.md) (threshold ElGamal
    decryption and Lagrange weights), [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)
    (Chaum-Pedersen proofs, the OR-proof, strong and weak Fiat-Shamir), and
    ElGamal from book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md).
    [Chapter 1](01-Computing-With-Secrets.md), §1.8, has a small council tally
    with secret shares; this chapter builds the full version.

    **Levels:** §16.1 and §16.2 are for beginners, §16.3 to §16.14 are
    intermediate, §16.15 is expert.

## 16.1 The problem

*Level: beginner.*

For most of history, voting was public. Rome brought in written ballots on
wax tablets in 139 BC, but in medieval and early modern Europe and in the
young United States many voters simply announced their choice aloud at the
polling place, or took a ballot printed
by their party in a recognizable color and dropped it in a box while the
party's agents watched. A landlord could see how his tenants voted, an
employer how his workers did, a vote buyer whether he had got what he paid
for. In 1856 the Australian colonies of Victoria and South Australia tried
something new: an official ballot printed by the government, listing every
candidate, marked by the voter alone in a booth and folded before it went
into the box. The **Australian ballot**, as it came to be called, spread to
Britain in 1872 and to most US states by the 1890s. It is what most of the
world means by a secret ballot.

The secret ballot solved one problem and made another. Once nobody can see
how anyone voted, nobody can check that their own vote was counted, or that
the totals announced at the end are the totals in the box. The answer that
democracies settled on is procedural, not mathematical. The paper stays in
sealed boxes under the eyes of observers from rival parties. It is counted by
hand in public, and it is kept so that it can be counted again. Every step
can be watched, and the evidence survives.

Paper is hard to beat for three reasons, and each is a requirement that any
replacement has to meet.

- **The voter can see their own ballot.** What the voter marked is what goes
  into the box. No software sits between the pen and the paper, so there is
  nothing to believe.
- **The evidence is durable and independent of any computer.** A recount
  months later looks at the same physical objects. Ronald Rivest and John
  Wack named this property in 2006: a system is **software independent** if
  an undetected change in its software cannot cause an undetected change in
  the outcome.
- **Attacks do not scale.** Changing a paper election means corrupting many
  people in many places, any one of whom might talk. Changing a server can
  take one person and an afternoon.

Paper's weaknesses are just as real. Counting by hand is slow and makes
mistakes; ballots can be lost, added or spoiled by whoever holds the boxes; a
voter who lives abroad or cannot hold a pen may not be able to vote at all;
and verifying a count still means trusting the people who watched it. When
counting machines arrived (lever machines in the 1890s, punch cards in the
1960s, optical scanners and touchscreens later), they made counting fast and
made checking harder. The 2000 US presidential election, decided in Florida by
537 votes after weeks of arguing over the hanging chads of punch cards,
convinced the US to replace its machines, and the touchscreen machines bought
in a hurry after 2002 were then shown, in study after study, to be insecure.

Cryptographers had been working on the problem since 1981, when David Chaum's
paper on untraceable mail ([Chapter 15](15-Anonymous-Communication.md))
mentioned elections as an application of his mix. Their goal is more
ambitious than "a computer that counts honestly". They want an election in
which **every voter can check that their own ballot was recorded as they
meant it, and anyone at all can check that the recorded ballots were counted
correctly, while no one can learn how any individual voted.** Such a system
is called **end-to-end verifiable** (E2E-V). It does not ask anyone to trust
the software, the servers or the officials: if any of them cheat, the checks
fail in public.

The tools for this are already in this book. Encrypt each ballot, so it stays
secret; publish all the encrypted ballots, so everyone sees the same list;
attach a zero-knowledge proof to each ballot, so a ballot cannot hold an
illegal value; combine the ballots without decrypting them, by homomorphic
multiplication or by a verifiable shuffle; and decrypt only the result, with
a key split among trustees ([Chapter 4](04-Threshold-Cryptography.md)), each
proving that its part of the decryption is honest
([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)). Figure 16.1 shows how
long it took to get from the idea to systems people actually use, and how
often the systems failed when they met the real world.

<figure class="mars-fig">
<svg viewBox="0 0 640 452" width="640" role="img" aria-label="Timeline of electronic voting from the Australian ballot in 1856 to the IACR's lost trustee key in 2025" fill="currentColor" font-size="14">
<line x1="78" y1="10" x2="78" y2="442" stroke="currentColor" stroke-width="1.6"/>
<text x="64" y="27" text-anchor="end" font-weight="bold">1856</text>
<circle cx="78" cy="22" r="3.5"/>
<text x="92" y="27">The Australian secret ballot (Victoria, South Australia)</text>
<text x="64" y="53" text-anchor="end" font-weight="bold">1981</text>
<circle cx="78" cy="48" r="3.5"/>
<text x="92" y="53">Chaum's mix: anonymous messages, and elections</text>
<text x="64" y="79" text-anchor="end" font-weight="bold">1985</text>
<circle cx="78" cy="74" r="3.5"/>
<text x="92" y="79">Cohen (Benaloh) and Fischer: a verifiable election scheme</text>
<text x="64" y="105" text-anchor="end" font-weight="bold">1994</text>
<circle cx="78" cy="100" r="3.5"/>
<text x="92" y="105">Benaloh and Tuinstra: receipt-free voting</text>
<text x="64" y="131" text-anchor="end" font-weight="bold">1995</text>
<circle cx="78" cy="126" r="3.5"/>
<text x="92" y="131">Sako and Kilian: a mix-net with a proof of shuffle</text>
<text x="64" y="157" text-anchor="end" font-weight="bold">1997</text>
<circle cx="78" cy="152" r="3.5"/>
<text x="92" y="157">Cramer, Gennaro, Schoenmakers: homomorphic tallying</text>
<text x="64" y="183" text-anchor="end" font-weight="bold">2005</text>
<circle cx="78" cy="178" r="3.5"/>
<text x="92" y="183">Estonia votes online; Juels-Catalano-Jakobsson coercion</text>
<text x="64" y="209" text-anchor="end" font-weight="bold">2006</text>
<circle cx="78" cy="204" r="3.5"/>
<text x="92" y="209">Benaloh's cast-or-audit; software independence</text>
<text x="64" y="235" text-anchor="end" font-weight="bold">2008</text>
<circle cx="78" cy="230" r="3.5"/>
<text x="92" y="235">Helios; Stark's risk-limiting audits</text>
<text x="64" y="261" text-anchor="end" font-weight="bold">2009</text>
<circle cx="78" cy="256" r="3.5"/>
<text x="92" y="261">Scantegrity II in Takoma Park's city election</text>
<text x="64" y="287" text-anchor="end" font-weight="bold">2010</text>
<circle cx="78" cy="282" r="5"/>
<text x="92" y="287" font-weight="bold">Washington, DC test hacked within two days</text>
<text x="64" y="313" text-anchor="end" font-weight="bold">2014</text>
<circle cx="78" cy="308" r="5"/>
<text x="92" y="313" font-weight="bold">Springall et al. analyze Estonia's i-voting</text>
<text x="64" y="339" text-anchor="end" font-weight="bold">2017</text>
<circle cx="78" cy="334" r="5"/>
<text x="92" y="339" font-weight="bold">ROCA: Estonian ID-card keys factorable</text>
<text x="64" y="365" text-anchor="end" font-weight="bold">2019</text>
<circle cx="78" cy="360" r="5"/>
<text x="92" y="365" font-weight="bold">Swiss Post system: trapdoored shuffle proof</text>
<text x="64" y="391" text-anchor="end" font-weight="bold">2020</text>
<circle cx="78" cy="386" r="3.5"/>
<text x="92" y="391">ElectionGuard's first pilot (Fulton, Wisconsin); Voatz study</text>
<text x="64" y="417" text-anchor="end" font-weight="bold">2023</text>
<circle cx="78" cy="412" r="3.5"/>
<text x="92" y="417">Switzerland restarts online voting trials</text>
<text x="64" y="443" text-anchor="end" font-weight="bold">2025</text>
<circle cx="78" cy="438" r="5"/>
<text x="92" y="443" font-weight="bold">IACR election voided: a trustee lost a key</text>
</svg>
<figcaption>Figure 16.1. Forty-five years of cryptographic voting, after a century and a half of the secret paper ballot. The bold entries are failures; only one of them, the Swiss shuffle proof, was a mistake in the cryptography itself.</figcaption>
</figure>

The hard part, it turned out, is not the mathematics. The mathematics of a
verifiable tally is a few pages, and this chapter codes it in about a hundred
lines. The hard parts are around it: the voter's own computer or phone, which
encrypts the ballot and can lie about what it encrypted; the voter who is
being watched, paid or threatened at home, where no booth protects them; the
list of who may vote; the servers that must stay up on election day; and the
people who must understand, or at least trust, a check they cannot do in their
heads. Book 1's [Chapter 23](../../book/23-Advanced-Protocols.md) mentions
the homomorphic tally in a few lines. This chapter builds the whole system,
then shows where real systems met those hard parts.

## 16.2 What a voting system must promise

*Level: beginner.*

Before any cryptography, it helps to write down what an election must
guarantee. The list below is the one the research field has settled on since
the 1990s. The words are used precisely, and real systems are judged by which
of them they deliver.

**Eligibility.** Only registered voters vote, and each votes at most once (or,
where re-voting is allowed, only their last vote counts). This is mostly a
matter of identity and registration, not cryptography, and it is where many
systems quietly trust an official: the server that keeps the voter list can
add ballots in the names of people who did not vote. A system is called
**eligibility verifiable** if the public can check that every counted ballot
came from a distinct registered voter, usually because each ballot is signed
with a credential only that voter holds.

**Ballot privacy.** Nobody, including the officials, the servers and any
coalition of trustees below a threshold, learns how a voter voted beyond what
the result itself reveals. (A unanimous result reveals every vote; no system
can prevent that.)

**Individual verifiability.** Each voter can check that their own ballot
reached the ballot box unaltered. It splits into two parts:

- **cast as intended:** the encrypted ballot really contains the choice the
  voter made, even though the voter's device did the encryption;
- **recorded as cast:** the ballot that the voter's device sent is the one
  that appears on the public list.

**Universal verifiability.** Anyone, voter or not, can check that the result
is the correct count of the recorded ballots: **tallied as recorded.**

A system that gives all three checks (cast as intended, recorded as cast,
tallied as recorded) is **end-to-end verifiable.** Figure 16.2 draws the
chain. The word "end-to-end" means there is no gap: no step in the middle
where a computer's honesty must simply be assumed. Note who does each check.
The first two can be done only by the voter, because only the voter knows what
they meant; the third can be done by anyone, and in practice it is done by a
few experts and observers running independent verifier programs.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The chain of end-to-end verifiability: intent to encrypted ballot (cast as intended, checked by the voter), ballot to public list (recorded as cast, checked by the voter with a tracking code), list to result (tallied as recorded, checked by anyone)" fill="currentColor" font-size="14">
<rect x="10" y="40" width="110" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="65" y="64" text-anchor="middle" font-weight="bold">voter's</text>
<text x="65" y="82" text-anchor="middle" font-weight="bold">choice</text>
<rect x="178" y="40" width="120" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="238" y="64" text-anchor="middle" font-weight="bold">encrypted</text>
<text x="238" y="82" text-anchor="middle" font-weight="bold">ballot</text>
<rect x="356" y="40" width="120" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="416" y="64" text-anchor="middle" font-weight="bold">public list</text>
<text x="416" y="82" text-anchor="middle" font-weight="bold">of ballots</text>
<rect x="534" y="40" width="96" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="582" y="73" text-anchor="middle" font-weight="bold">result</text>
<line x1="120" y1="68" x2="170" y2="68" stroke="currentColor" stroke-width="2"/>
<polygon points="178,68 168,63 168,73"/>
<line x1="298" y1="68" x2="348" y2="68" stroke="currentColor" stroke-width="2"/>
<polygon points="356,68 346,63 346,73"/>
<line x1="476" y1="68" x2="526" y2="68" stroke="currentColor" stroke-width="2"/>
<polygon points="534,68 524,63 524,73"/>
<text x="149" y="130" text-anchor="middle" font-weight="bold">cast as</text>
<text x="149" y="148" text-anchor="middle" font-weight="bold">intended</text>
<text x="149" y="172" text-anchor="middle" font-size="13">the voter, by</text>
<text x="149" y="189" text-anchor="middle" font-size="13">auditing a ballot</text>
<text x="327" y="130" text-anchor="middle" font-weight="bold">recorded</text>
<text x="327" y="148" text-anchor="middle" font-weight="bold">as cast</text>
<text x="327" y="172" text-anchor="middle" font-size="13">the voter, by</text>
<text x="327" y="189" text-anchor="middle" font-size="13">a tracking code</text>
<text x="505" y="130" text-anchor="middle" font-weight="bold">tallied as</text>
<text x="505" y="148" text-anchor="middle" font-weight="bold">recorded</text>
<text x="505" y="172" text-anchor="middle" font-size="13">anyone, by</text>
<text x="505" y="189" text-anchor="middle" font-size="13">checking the proofs</text>
<line x1="10" y1="215" x2="630" y2="215" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="320" y="238" text-anchor="middle">all three together: end-to-end verifiable (E2E-V)</text>
</svg>
<figcaption>Figure 16.2. The chain of checks. Each arrow is a place where a computer could cheat, and each has its own check. The first two can only be done by the voter; the last can be done by anyone with the published data.</figcaption>
</figure>

**Receipt-freeness.** The voter cannot prove to anyone else how they voted,
even if they want to. This sounds like a strange thing to forbid, but it is the
point of the secret ballot. If a voter can prove their vote, a buyer can pay
for proof, and an employer or a family member can demand it. A paper ballot
in a booth is receipt-free, because the voter leaves with nothing. Josh
Benaloh and Dwight Tuinstra gave the first formal treatment in 1994 ("Receipt-
Free Secret-Ballot Elections", STOC 1994), and it immediately clashed with
verifiability. The naive way to let a voter check their encrypted ballot is to
give them the randomness $r$ used to encrypt it. But with $r$ in hand, anyone
can re-encrypt each possible choice and see which one matches the published
ciphertext: $r$ is a perfect receipt. Every design in this chapter has to
give the voter enough to check, and not enough to prove.

**Coercion resistance.** The voter can vote as they wish even while a coercer
is actively interfering, not just asking for a receipt. Ari Juels, Dario
Catalano and Markus Jakobsson defined it in 2005 ("Coercion-Resistant
Electronic Elections", ACM Workshop on Privacy in the Electronic Society).
Their coercer may demand that the voter abstain, vote in a particular way,
hand over their voting credential so the coercer can vote for them, or vote
at random. A coercion-resistant system defeats all four. Their construction
gives each voter a secret credential; a coerced voter hands over a **fake
credential** that looks identical, and votes cast with fake credentials are
silently removed at tally time by a blind comparison against the real
credential list, so the coercer cannot tell whether the vote they watched
will count. Coercion resistance is the strongest property on the list and
the hardest to get in practice, because it puts real burdens on the voter
(keep a secret credential safe, lie convincingly under pressure). No major
public election uses a full JCJ-style scheme. Estonia's partial answer,
re-voting, is in §16.9.

**Other requirements** come up in every real procurement: availability (the
system works on election day, under attack), accessibility (blind voters,
voters with limited mobility, voters who do not read the main language),
**dispute resolution** (if a check fails, can anyone prove whose fault it is,
or is it one voter's word against the server's?), and **usability** of the
checks themselves. A check that no voter performs protects nobody.

The table summarizes the properties and the tools that provide them.

| Property | What it guards against | Usual tool |
| --- | --- | --- |
| Eligibility | ballot stuffing, double voting | credentials, signed ballots, voter lists |
| Ballot privacy | anyone learning a vote | encryption to a threshold key; homomorphic tally or mix-net |
| Cast as intended | a lying voting device | Benaloh challenge, return codes, paper ballot |
| Recorded as cast | a server dropping or altering a ballot | public bulletin board, tracking codes |
| Tallied as recorded | a wrong count | zero-knowledge proofs, published for anyone to check |
| Receipt-freeness | vote buying | re-randomization, no secrets left with the voter |
| Coercion resistance | a watching or threatening coercer | fake credentials (JCJ), re-voting, the polling booth |

One object appears in almost every design: the **public bulletin board**, an
append-only list that everyone sees the same way. Ballots are posted there,
proofs are posted there, and the results are computed from what is there.
Making a bulletin board truly append-only and identical for all viewers is a
distributed-systems problem of its own. Real systems use a web page plus
published hashes; research systems use replicated logs, the same idea as
Certificate Transparency ([Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md))
or the consensus of [Chapter 17](17-Consensus-and-Smart-Contracts.md).

Three warnings belong at the start. First, verifiability is about detecting
problems, not preventing them: a verifiable election can still be disrupted,
and if a check fails, the system needs a plan for what happens next. Second,
"the proofs check" says the count is right for the ballots on the board; it
says nothing about whether those ballots came from real, uncoerced voters.
Third, the strongest property a paper election has, that voters understand
it, is the one cryptography is worst at.

## 16.3 Adding votes without opening them

*Level: intermediate.*

The first complete answer came in stages. At Yale, Josh Benaloh (then Josh
Cohen) and Michael Fischer published "A Robust and Verifiable
Cryptographically Secure Election Scheme" (FOCS 1985), and Benaloh's 1987
thesis developed it. Their scheme encrypted each yes-or-no vote with a
homomorphic scheme, so that the encrypted votes could be combined into an
encrypted total, and split the decryption among several tellers. It worked,
but its proofs were cut-and-choose games of many rounds, heavy for the
computers of the day. Ten years later Ronald Cramer, Rosario Gennaro and Berry
Schoenmakers published "A Secure and Optimally Efficient Multi-Authority
Election Scheme" (EUROCRYPT 1997), and that paper is the blueprint every
homomorphic voting system since has followed. Its three ingredients are ones
you already have: ElGamal with the vote in the exponent, the OR-proof of
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) to show each ballot is 0 or
1, and threshold decryption from [Chapter 4](04-Threshold-Cryptography.md)
with Chaum-Pedersen proofs.

### Exponential ElGamal

Ordinary ElGamal encrypts a group element $m$ as $(g^r, m X^r)$, where $X =
g^x$ is the public key. Multiplying two ciphertexts multiplies the messages:

$$
(g^{r_1}, m_1 X^{r_1}) \cdot (g^{r_2}, m_2 X^{r_2}) = (g^{r_1 + r_2},\ m_1 m_2\, X^{r_1 + r_2}) .
$$

A tally needs addition. So encode the vote $v$ as $m = g^v$: a "yes" becomes
$g^1 = g$ and a "no" becomes $g^0 = 1$. Now multiplying ciphertexts adds the
votes in the exponent:

$$
\prod_{k=1}^{n} (g^{r_k},\ g^{v_k} X^{r_k}) = \Big(g^{R},\ g^{V} X^{R}\Big),
\qquad R = \sum r_k,\quad V = \sum v_k .
$$

The product is itself an encryption of $V$, the number of yes votes, under
randomness $R$ that nobody knows. Decrypting it gives $g^V$, not $V$. Taking a
discrete logarithm is supposed to be hard, and here it is easy for a reason
worth stating: $V$ is at most the number of voters. Trying $g^0, g^1, g^2,
\dots$ finds it in $V$ steps, and the baby-step giant-step method of
[Cryptanalysis, Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md) does it
in about $\sqrt{n}$ steps: a thousand multiplications for a million voters.
The price of this design is that individual votes must be small numbers, and
that is exactly what the ballot proof will guarantee.

The other half of the plan is that no single party can decrypt. The election
key $X = g^x$ is shared among trustees with Shamir's scheme
([Chapter 2](02-Secret-Sharing.md)), and only the final product is ever
decrypted, by $t$ of them working together. An individual ballot could in
principle be decrypted by the same $t$ trustees, so ballot privacy rests on
fewer than $t$ of them colluding. That is a trust assumption, and it is
stated in every real system's documentation.

### By hand: three voters, three trustees

We use the group of [Chapter 4](04-Threshold-Cryptography.md): the order-23
subgroup of the numbers mod $p = 47$, generator $g = 2$. The trustees' key is
the one from §4.2: $x = 9$, shared on the line $f(i) = 9 + 4i \bmod 23$, so
trustee 1 holds 13, trustee 2 holds 17 and trustee 3 holds 21, and any two of
them can decrypt. The election key is $X = 2^9 \bmod 47 = 42$. Real systems use
256-bit groups or elliptic curves; this one is small enough that every step
fits on a page. A table of powers helps: $g^k \bmod 47$ for $k = 0, \dots, 22$
is

| $k$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $2^k$ | 1 | 2 | 4 | 8 | 16 | 32 | 17 | 34 | 21 | 42 | 37 | 27 |

| $k$ | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $2^k$ | 7 | 14 | 28 | 9 | 18 | 36 | 25 | 3 | 6 | 12 | 24 |

Because $X = g^9$, the factor $X^r$ is $g^{9r}$, and every product can be
done by adding exponents mod 23.

<div class="mars-steps" markdown>

1. **Ana votes yes** with randomness $r = 5$. $A = g^5 = 32$. $X^5 =
   g^{45} = g^{22} = 24$, and $B = g^1 \cdot 24 = 48 \equiv 1$. Her ballot is
   $(32, 1)$.
2. **Ben votes no** with $r = 7$. $A = g^7 = 34$, $X^7 = g^{63} = g^{17} =
   36$, and $B = g^0 \cdot 36 = 36$. His ballot is $(34, 36)$.
3. **Cy votes yes** with $r = 3$. $A = g^3 = 8$, $X^3 = g^{27} = g^4 = 16$,
   and $B = 2 \cdot 16 = 32$. Her ballot is $(8, 32)$.
4. **Multiply.** $A = 32 \cdot 34 \cdot 8 = 8704 \equiv 9$ and $B = 1 \cdot 36
   \cdot 32 = 1152 \equiv 24 \pmod{47}$. In exponents: $A = g^{5+7+3} =
   g^{15} = 9$, as it should be.
5. **Partial decryptions.** Trustee 1 is away. Trustee 2 sends $d_2 =
   A^{17} = g^{15 \cdot 17} = g^{255} = g^{2} = 4$ and trustee 3 sends $d_3
   = A^{21} = g^{315} = g^{16} = 18$.
6. **Combine.** The Lagrange weights for the set $\{2, 3\}$ are 3 and 21 (from
   §4.2). $K = 4^3 \cdot 18^{21} = 17 \cdot 28 = 476 \equiv 6$. Check:
   $K$ should be $X^{R} = g^{9 \cdot 15} = g^{135} = g^{20} = 6$.
7. **Decrypt.** $g^V = B / K = 24 \cdot 6^{-1}$. Since $6 \cdot 8 = 48 \equiv
   1$, $6^{-1} = 8$, and $24 \cdot 8 = 192 \equiv 4 \pmod{47}$.
8. **Small log.** $g^0 = 1$, $g^1 = 2$, $g^2 = 4$. So $V = 2$: two yes votes
   out of three.

</div>

Nobody decrypted a single ballot. Trustees 2 and 3 each saw only the product,
and each raised it to their share without learning the other's. Anyone can
redo steps 4 and 8 from the public ballots and the published partial
decryptions, and with the proofs below, anyone can check steps 5 to 7 too.
Figure 16.3 shows the whole flow.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Homomorphic election with the hand numbers: three ballots with 0-or-1 proofs go on a public board, are multiplied into one ciphertext, trustees 2 and 3 return partial decryptions with proofs, and the tally 2 is recovered by a small discrete log" fill="currentColor" font-size="14">
<rect x="10" y="20" width="150" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="45" text-anchor="middle">Ana: (32, 1) + proof</text>
<rect x="10" y="80" width="150" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="105" text-anchor="middle">Ben: (34, 36) + proof</text>
<rect x="10" y="140" width="150" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="165" text-anchor="middle">Cy: (8, 32) + proof</text>
<line x1="160" y1="40" x2="214" y2="86" stroke="currentColor" stroke-width="1.5"/>
<line x1="160" y1="100" x2="214" y2="100" stroke="currentColor" stroke-width="1.5"/>
<line x1="160" y1="160" x2="214" y2="114" stroke="currentColor" stroke-width="1.5"/>
<polygon points="222,100 212,95 212,105"/>
<rect x="222" y="60" width="170" height="80" rx="6" fill="currentColor" opacity="0.10"/>
<rect x="222" y="60" width="170" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="307" y="84" text-anchor="middle" font-weight="bold">public board</text>
<text x="307" y="105" text-anchor="middle">check every proof,</text>
<text x="307" y="126" text-anchor="middle">multiply: (9, 24)</text>
<line x1="392" y1="85" x2="452" y2="52" stroke="currentColor" stroke-width="1.5"/>
<polygon points="460,48 449,49 454,57"/>
<line x1="392" y1="115" x2="452" y2="148" stroke="currentColor" stroke-width="1.5"/>
<polygon points="460,152 454,143 449,151"/>
<rect x="460" y="20" width="170" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="43" text-anchor="middle" font-weight="bold">trustee 2 (17)</text>
<text x="545" y="64" text-anchor="middle">d₂ = 9¹⁷ = 4 + proof</text>
<rect x="460" y="124" width="170" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="147" text-anchor="middle" font-weight="bold">trustee 3 (21)</text>
<text x="545" y="168" text-anchor="middle">d₃ = 9²¹ = 18 + proof</text>
<line x1="545" y1="180" x2="545" y2="226" stroke="currentColor" stroke-width="1.5"/>
<polygon points="545,234 540,224 550,224"/>
<rect x="222" y="234" width="408" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="426" y="258" text-anchor="middle">K = 4³ · 18²¹ = 6,  g^V = 24 / 6 = 4</text>
<text x="426" y="281" text-anchor="middle">4 = 2², so V = 2 yes votes</text>
<text x="426" y="302" text-anchor="middle" font-size="13">anyone can redo this from the board</text>
<text x="85" y="220" text-anchor="middle" font-size="13" opacity="0.8">key X = 42, shared</text>
<text x="85" y="238" text-anchor="middle" font-size="13" opacity="0.8">2 of 3: shares 13, 17, 21</text>
</svg>
<figcaption>Figure 16.3. The homomorphic election of the hand example. Ballots are checked and multiplied on the public board; only the product is decrypted, by any two of the three trustees, each with a proof; the tally is a small discrete log.</figcaption>
</figure>

### By hand: the proof on Ben's ballot

Without a proof, Ben's device could have sent $(g^7, g^5 X^7)$, five votes
for yes, and nothing above would notice. So each ballot carries the OR-proof
of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md), §6.6: "this ciphertext
encrypts 0, or it encrypts 1." Encrypting 0 means $\log_g A = \log_X B$ (both
equal $r$); encrypting 1 means $\log_g A = \log_X (B/g)$. Ben's ballot
$(A, B) = (34, 36)$ really encrypts 0, so branch 0 is real and branch 1 is
simulated. Here $B / g = 36 \cdot 2^{-1} = 36 \cdot 24 \equiv 18 = g^{16}$.

<div class="mars-steps" markdown>

1. **Fake branch 1.** Pick its challenge and response first: $c_1 = 5$,
   $z_1 = 10$. Then $a_1 = g^{z_1} A^{-c_1} = g^{10 - 35} = g^{-25} =
   g^{21} = 12$, and $b_1 = X^{z_1} (B/g)^{-c_1} = g^{90 - 80} = g^{10} = 37$.
2. **Real branch 0.** Pick $w = 4$: $a_0 = g^4 = 16$, $b_0 = X^4 = g^{36} =
   g^{13} = 14$.
3. **Challenge.** In a live protocol a verifier would now send $c$. In a
   ballot, the device computes $c = H(\text{election}, p, g, X,
   \text{voter ID}, A, B, a_0, b_0, a_1, b_1) \bmod 23$: the strong
   Fiat-Shamir hash of the whole statement and all four commitments. Say it
   comes out as $c = 7$.
4. **Respond.** $c_0 = c - c_1 = 2$ and $z_0 = w + c_0 r = 4 + 2 \cdot 7 =
   18$. The proof is $(a_0, b_0, a_1, b_1; c_0, c_1; z_0, z_1) = (16, 14,
   12, 37;\ 2, 5;\ 18, 10)$.
5. **Anyone checks branch 0.** $g^{18} = 25$ and $a_0 A^{c_0} = g^{4 + 14} =
   g^{18}$; $X^{18} = g^{162} = g^{1} = 2$ and $b_0 B^{c_0} = g^{13 + 34} =
   g^{47} = g^1$. Passes.
6. **Anyone checks branch 1.** $g^{10} = 37$ and $a_1 A^{c_1} = g^{21 + 35} =
   g^{56} = g^{10}$; $X^{10} = g^{21} = 12$ and $b_1 (B/g)^{c_1} = g^{10 +
   80} = g^{90} = g^{21}$. Passes.
7. **And the split.** $c_0 + c_1 = 7 = c$, the hash.

</div>

Both branches pass, so the ballot holds 0 or 1, and the verifier cannot tell
which branch was faked: the four numbers $c_0, c_1, z_0, z_1$ are spread the
same way either way. A device trying to send $g^5$ would have to fake both
branches, fixing both $c_0$ and $c_1$ before the hash, and win only if their
sum happened to equal the hash output: one chance in $q$, which for a 256-bit
group is never.

### More than two choices

A race with $L$ candidates uses one ciphertext per candidate, each with its
own 0-or-1 proof, plus one more proof that the product of the $L$ ciphertexts
encrypts exactly 1 (the voter picked one candidate). That last proof is a
single Chaum-Pedersen proof, since the product is itself a ciphertext. "Vote
for up to 3" proves the product encrypts 0, 1, 2 or 3, an OR of four
branches. This is how Helios and ElectionGuard encode a ballot. It works
well for a handful of candidates and a few races, and it breaks down for
ballots that are not counts: ranked-choice voting, where the order matters,
and write-in names. Those need the other approach, the mix-net of §16.6.

!!! note "Life story: homomorphic tallying"
    **Born:** 1985 to 1987, Josh Benaloh (with Michael Fischer) at Yale, with
    a homomorphic scheme and cut-and-choose proofs; made practical in 1997 by
    Ronald Cramer, Rosario Gennaro and Berry Schoenmakers ("A Secure and Optimally
    Efficient Multi-Authority Election Scheme", EUROCRYPT 1997) with
    exponential ElGamal, 0-or-1 OR-proofs and threshold decryption ·
    **Purpose:** count encrypted votes without decrypting any single one ·
    **Helped:** Helios (from version 2), ElectionGuard, Belenios, and most
    verifiable elections with simple yes-or-no or choose-one races ·
    **Status:** current; the standard design for count-style ballots

## 16.4 Code it: a complete toy election

*Level: intermediate.*

The program below runs a whole election. It uses the 127-bit safe prime
$p = 2^{127} - 2721$ of [Chapter 4](04-Threshold-Cryptography.md), large
enough that nobody solves discrete logs in it by hand, and far too small for
real use: real systems use 256-bit elliptic curves or, like ElectionGuard, a
subgroup of 256-bit prime order modulo a 4096-bit prime. The module `random` is fine for a demonstration; real
keys and nonces come from `secrets`.

The pieces, in order:

1. **Setup.** A dealer picks the key $x$, shares it 2-of-3 on a random line,
   publishes each trustee's check value $Y_i = g^{x_i}$ and the election key
   $X = g^x$, and forgets $x$. (A real election runs the distributed key
   generation of [Chapter 4](04-Threshold-Cryptography.md), §4.4, so that no
   dealer ever holds $x$.)
2. **Voting.** Each voter encrypts 0 or 1 and attaches the OR-proof. The
   Fiat-Shamir hash includes a label for the election, the group, the
   election key, the voter's ID, the ciphertext and all four commitments:
   everything the verifier checks, as [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md),
   §6.9, requires. Inputs are joined with a 4-byte length in front of each,
   so no two different lists hash the same bytes.
3. **Checking.** Anyone runs `ballot_ok` on every ballot on the board. It
   first checks that both halves of the ciphertext lie in the prime-order
   group (an element outside it would void the proof's guarantees), then the
   challenge split, then both branches.
4. **Tallying.** Multiply the valid ciphertexts.
5. **Decryption.** Two trustees each publish $d_i = A^{x_i}$ with a
   Chaum-Pedersen proof that $\log_g Y_i = \log_A d_i$; anyone checks the
   proofs, combines the shares with Lagrange weights, and finds the small
   discrete log.

```python
import hashlib, random
random.seed(1997)                    # random is for the demo; real keys and nonces use secrets

p = 2**127 - 2721                    # a 127-bit safe prime (toy size; real systems use 256-bit curves)
q, g = (p - 1) // 2, 4               # g = 4 generates the subgroup of prime order q
ELECTION = "Arcadia council demo, district 3"

def H(*parts):                       # strong Fiat-Shamir: length-prefixed, everything included
    data = b"".join(len(s).to_bytes(4, "big") + s for s in (str(v).encode() for v in parts))
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

# --- Setup: a 2-of-3 shared key (a dealer here; Chapter 4 shows how to do without one)
x = random.randrange(1, q)
a1 = random.randrange(q)
share = {i: (x + a1 * i) % q for i in (1, 2, 3)}       # points on the line x + a1*i
Y = {i: pow(g, share[i], p) for i in share}            # each trustee's public check value
X = pow(g, x, p)                                       # the election key
del x                                                  # nobody keeps the whole key

# --- A voter: encrypt v in {0, 1} and prove it with an OR of two Chaum-Pedersen proofs
def cast(voter, v):
    r = random.randrange(1, q)
    A, B = pow(g, r, p), pow(g, v, p) * pow(X, r, p) % p
    o = 1 - v                                          # the branch the voter cannot do
    c_o, z_o = random.randrange(q), random.randrange(q)
    Bo = B * pow(g, -o, p) % p
    com = {o: (pow(g, z_o, p) * pow(A, -c_o, p) % p, pow(X, z_o, p) * pow(Bo, -c_o, p) % p)}
    w = random.randrange(q)
    com[v] = (pow(g, w, p), pow(X, w, p))
    c = H(ELECTION, p, g, X, voter, A, B, com[0], com[1])
    c_v = (c - c_o) % q
    ch, z = {v: c_v, o: c_o}, {v: (w + c_v * r) % q, o: z_o}
    return {"voter": voter, "ct": (A, B), "com": (com[0], com[1]),
            "c": (ch[0], ch[1]), "z": (z[0], z[1])}

def ballot_ok(bal):                  # anyone can run this on every ballot
    A, B = bal["ct"]
    if not (0 < A < p and 0 < B < p and pow(A, q, p) == 1 and pow(B, q, p) == 1):
        return False                 # not in the prime-order group
    c = H(ELECTION, p, g, X, bal["voter"], A, B, bal["com"][0], bal["com"][1])
    if (bal["c"][0] + bal["c"][1]) % q != c:
        return False
    for j in (0, 1):                 # branch j: log_g A = log_X (B / g^j)
        (a, b), cj, zj = bal["com"][j], bal["c"][j], bal["z"][j]
        Bj = B * pow(g, -j, p) % p
        if pow(g, zj, p) != a * pow(A, cj, p) % p or pow(X, zj, p) != b * pow(Bj, cj, p) % p:
            return False
    return True

# --- Trustee i: partial decryption d = A^{x_i} with a proof that log_g Y_i = log_A d
def partial(i, A):
    d, w = pow(A, share[i], p), random.randrange(q)
    a, b = pow(g, w, p), pow(A, w, p)
    c = H(ELECTION, "decrypt", p, g, i, Y[i], A, d, a, b)
    return d, (a, b, (w + c * share[i]) % q)

def partial_ok(i, A, d, proof):
    a, b, z = proof
    c = H(ELECTION, "decrypt", p, g, i, Y[i], A, d, a, b)
    return pow(g, z, p) == a * pow(Y[i], c, p) % p and pow(A, z, p) == b * pow(d, c, p) % p

def lagrange(i, S):
    num = den = 1
    for j in S:
        if j != i:
            num, den = num * j % q, den * (j - i) % q
    return num * pow(den, -1, q) % q

# --- The election
votes = [1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0]          # 12 voters; 7 say yes
board = [cast(f"voter-{k:02}", v) for k, v in enumerate(votes, 1)]
print("first ballot:", board[0]["ct"][0], "...")
print("ballots that verify:", sum(ballot_ok(b) for b in board), "of", len(board))

A, B = 1, 1
for bal in board:                    # multiply every valid ciphertext
    if ballot_ok(bal):
        A, B = A * bal["ct"][0] % p, B * bal["ct"][1] % p

S = (1, 3)                           # trustee 2 cannot be reached; two of three suffice
parts = {i: partial(i, A) for i in S}
print("decryption proofs verify:", all(partial_ok(i, A, *parts[i]) for i in S))
K = 1
for i in S:
    K = K * pow(parts[i][0], lagrange(i, S), p) % p
M = B * pow(K, -1, p) % p           # M = g^tally
tally = next(t for t in range(len(board) + 1) if pow(g, t, p) == M)
print("yes:", tally, " no:", len(board) - tally)
```

Output:

```
first ballot: 57343727825218748126521349371521427921 ...
ballots that verify: 12 of 12
decryption proofs verify: True
yes: 7  no: 5
```

Everything a verifier needs is public: the parameters, the election key, the
trustees' check values, the twelve ballots with their proofs, and the two
partial decryptions with theirs. An observer who reruns `ballot_ok`, the
multiplication, `partial_ok` and the combination gets the same 7, without any
secret and without trusting whoever ran the election. That is universal
verifiability in about a hundred lines.

Three details deserve a second look.

- **The voter ID is in the hash.** A proof made for `voter-01` does not verify
  under any other name. §16.5 shows why that matters.
- **Trustee 2 was unreachable, and it did not matter.** With a 3-of-3 key the
  election would have stopped there. The International Association for
  Cryptologic Research found out what that means in 2025 (§16.8).
- **The ballots never get decrypted.** Even the trustees, together, only
  ever raised the product to their shares. If two trustees wanted to read
  Ana's ballot they could, by running the same decryption on it; the
  threshold is the line between privacy and its loss.

The program is a toy in the ways that matter in practice. It has no voter
authentication (anyone can post a ballot as `voter-01`), no protection for
the voter's device, no bulletin board, and no handling of a trustee who sends
a bad share beyond detecting it. Real systems add signatures on ballots,
tracking codes, a published election record in a fixed format, and
independent verifier programs written by people who did not write the
election software. ElectionGuard's specification, for instance, runs to
dozens of pages; the cryptography in it is the program above, and the
rest is everything around it.

## 16.5 Break it: the ballot that counts five

*Level: intermediate.*

The ballot proof is not decoration. Homomorphic tallying adds whatever is in
the exponent, and a malicious voter, or a malicious voting device, can put any
number there. A single ciphertext of $g^5$ adds five votes; a ciphertext of
$g^{-3}$, which is $g^{q-3}$, takes three away. Every ciphertext looks
uniformly random, so nothing in the tally reveals it. This is exactly the
gap left open in the council tally of [Chapter 1](01-Computing-With-Secrets.md),
§1.8, where a member could send shares of 5.

The program below runs a small election of eight honest voters, three of
whom vote yes. Mallory adds a ballot that encrypts 5 and carries no proof.
A tallier that skips the checks counts eight yes votes. Then Mallory tries
three ways past a tallier that checks: no proof, a proof with both branches
faked, and an honest voter's ballot copied with its proof under her own name.

```python
import hashlib, random
random.seed(5)                       # random is for the demo; real keys and nonces use secrets

p = 2**127 - 2721                    # the same toy group as before
q, g = (p - 1) // 2, 4
ELECTION = "Arcadia council demo, district 3"
x = random.randrange(1, q)           # one key holder is enough to show the break
X = pow(g, x, p)

def H(*parts):
    data = b"".join(len(s).to_bytes(4, "big") + s for s in (str(v).encode() for v in parts))
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def enc(v):
    r = random.randrange(1, q)
    return r, (pow(g, r, p), pow(g, v, p) * pow(X, r, p) % p)

def cast(voter, v):                  # an honest ballot with its 0-or-1 proof, as in the election code
    r, (A, B) = enc(v)
    o, w = 1 - v, random.randrange(q)
    c_o, z_o = random.randrange(q), random.randrange(q)
    Bo = B * pow(g, -o, p) % p
    com = {o: (pow(g, z_o, p) * pow(A, -c_o, p) % p, pow(X, z_o, p) * pow(Bo, -c_o, p) % p),
           v: (pow(g, w, p), pow(X, w, p))}
    c_v = (H(ELECTION, p, g, X, voter, A, B, com[0], com[1]) - c_o) % q
    ch, z = {v: c_v, o: c_o}, {v: (w + c_v * r) % q, o: z_o}
    return {"voter": voter, "ct": (A, B), "com": (com[0], com[1]), "c": (ch[0], ch[1]), "z": (z[0], z[1])}

def ballot_ok(bal):
    A, B = bal["ct"]
    if "com" not in bal or pow(A, q, p) != 1 or pow(B, q, p) != 1:
        return False
    if sum(bal["c"]) % q != H(ELECTION, p, g, X, bal["voter"], A, B, *bal["com"]):
        return False
    for j in (0, 1):
        (a, b), cj, zj = bal["com"][j], bal["c"][j], bal["z"][j]
        Bj = B * pow(g, -j, p) % p
        if pow(g, zj, p) != a * pow(A, cj, p) % p or pow(X, zj, p) != b * pow(Bj, cj, p) % p:
            return False
    return True

def tally(board):                    # multiply, decrypt with x, take a small log
    A = B = 1
    for bal in board:
        A, B = A * bal["ct"][0] % p, B * bal["ct"][1] % p
    M = B * pow(pow(A, x, p), -1, p) % p
    return next(t for t in range(100) if pow(g, t, p) == M)

votes = [1, 0, 0, 1, 0, 1, 0, 0]                       # honest yes votes: 3 of 8
board = [cast(f"voter-{k}", v) for k, v in enumerate(votes, 1)]
board.append({"voter": "mallory", "ct": enc(5)[1]})    # Mallory: an encrypted 5, no proof
print("honest yes votes:", sum(votes), " plus Mallory as one yes:", sum(votes) + 1)
print("tally, nothing checked:", tally(board))

# Mallory tries harder: she fakes both branches of a proof for her 5 ...
r, (A, B) = enc(5)
c0, c1, z0, z1 = (random.randrange(q) for _ in range(4))
com = tuple((pow(g, zj, p) * pow(A, -cj, p) % p, pow(X, zj, p) * pow(B * pow(g, -j, p) % p, -cj, p) % p)
            for j, cj, zj in ((0, c0, z0), (1, c1, z1)))
forged = {"voter": "mallory", "ct": (A, B), "com": com, "c": (c0, c1), "z": (z0, z1)}
# ... and copies an honest voter's ballot, proof and all, under her own name.
copied = dict(board[0], voter="mallory")
for label, bal in (("no proof", board[-1]), ("faked proof", forged), ("copied ballot", copied)):
    print(f"Mallory's {label:13} accepted: {ballot_ok(bal)}")
honest = [bal for bal in board if ballot_ok(bal)]
print("valid ballots:", len(honest), " tally of valid ballots:", tally(honest))
```

Output:

```
honest yes votes: 3  plus Mallory as one yes: 4
tally, nothing checked: 8
Mallory's no proof      accepted: False
Mallory's faked proof   accepted: False
Mallory's copied ballot accepted: False
valid ballots: 8  tally of valid ballots: 3
```

Without checks, one ballot moved the count from at most 4 to 8, and the
result decrypts cleanly, with nothing to show anything went wrong. With
checks, each of Mallory's attempts fails for a different reason.

- **No proof:** rejected outright. A system must refuse to count any ballot
  whose proof is missing or fails, and must say publicly which ballots it
  refused.
- **Faked proof:** the forger fixed $c_0$ and $c_1$ before the hash, so their
  sum matches the hash with probability $1/q$. Here $q$ is a 126-bit number.
- **Copied ballot:** the proof is valid, but for `voter-1`. The hash includes
  the voter ID, so under the name `mallory` the challenge changes and the
  proof fails. In Helios this mattered: Véronique Cortier and Ben Smyth
  showed in 2011 that a voter could copy another voter's ballot (or a
  re-randomized version of it, adjusting the proof to match), cast it as their
  own, and so double its weight; in a small election, the effect on the tally
  can reveal how the copied voter voted. Binding the proof to the voter and
  refusing duplicate ciphertexts closes this.

**Fix it.** The rules for a homomorphic tally are short and absolute. Check
every proof on every ballot before it is counted; check that every group
element is in the prime-order group; hash the whole statement, including the
election and the voter, into every challenge; publish the list of accepted and
rejected ballots so anyone can recount; and let anyone run the checks, with a
verifier written by someone other than the vendor. Each of these rules has
been broken at least once in a real system.

The same break exists for trustees. A trustee who publishes a wrong partial
decryption without a proof can make the tally come out as almost anything;
§4.2 of [Chapter 4](04-Threshold-Cryptography.md) shows the lying holder, and
§6.9 of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) shows that a
decryption proof under weak Fiat-Shamir lets a trustee lie with a proof that
checks. In 2012 that was a theoretical finding about Helios. In 2019, as §16.9
tells, it was a finding about a system that Switzerland was about to use for
real.

## 16.6 Shuffling encrypted ballots: verifiable mix-nets

*Level: intermediate.*

Homomorphic tallying counts. It cannot handle a ballot that is not a small
number: a ranked list of five candidates, a write-in name, a long ballot with
dozens of races. For those, there is a second road, older than the first. In
1981 David Chaum proposed the **mix**: a server that collects encrypted
messages, decrypts or transforms each one, and outputs them in a random
order, so that nobody watching the inputs and outputs can tell which input
became which output ([Chapter 15](15-Anonymous-Communication.md) follows the
idea into anonymous email and Tor). Apply it to ballots and the plan is
simple. Voters post encrypted ballots under their names; a chain of mix
servers shuffles them; at the end the ballots are decrypted in the open, as
anonymous plaintexts that anyone can count by any rule. A paper ballot box
does the same thing: the names are on the envelopes at the door, and the
shaking of the box separates them from the votes.

### Re-encryption

Chaum's mix peeled off a layer of encryption at each server. Choonsik Park,
Kazutomo Itoh and Kaoru Kurosawa observed in 1993 that ElGamal allows something
neater. Anyone holding only the public key can **re-encrypt** a ciphertext:
multiply it by a fresh encryption of "nothing",

$$
(A, B) \longmapsto (A \cdot g^{s},\ B \cdot X^{s}),
$$

which encrypts the same message under randomness $r + s$, and looks like a
brand-new ciphertext to anyone who does not know $s$ or the key. A
re-encryption mix takes a list of ciphertexts, re-encrypts each one with its
own random $s_i$, and outputs them in a secret random order $\pi$. The
servers need no secret keys at all; the trustees decrypt only at the end,
with threshold decryption as before.

By hand, in the group of §16.3: re-encrypt Ana's ballot $(32, 1)$ with $s = 2$.
$A' = 32 \cdot g^2 = 32 \cdot 4 = 128 \equiv 34$ and $B' = 1 \cdot X^2 =
g^{18} = 25$. The new ciphertext $(34, 25)$ shares no number with $(32, 1)$
(in a group of 23 elements its first half happens to equal that of Ben's
ballot; in a 256-bit group such coincidences never happen). It still holds
Ana's vote: $A' = g^7$, and $B' = g^{18}$, so $B' / X^7 = g^{18 - 63} =
g^{-45} = g^{1}$, a yes.

A chain of mixes keeps ballots private if at least one mix in it is honest:
that one mix's secret permutation is enough to break the link between names
and votes. Figure 16.4 shows the chain.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A verifiable mix-net: encrypted ballots with names pass through three mix servers, each re-encrypting and permuting them and publishing a shuffle proof; the trustees decrypt the final anonymous list" fill="currentColor" font-size="14">
<text x="52" y="24" text-anchor="middle" font-weight="bold">board</text>
<rect x="10" y="36" width="84" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="52" y="54" text-anchor="middle" font-size="13">Ana: E(v₁)</text>
<rect x="10" y="70" width="84" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="52" y="88" text-anchor="middle" font-size="13">Ben: E(v₂)</text>
<rect x="10" y="104" width="84" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="52" y="122" text-anchor="middle" font-size="13">Cy: E(v₃)</text>
<rect x="10" y="138" width="84" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="52" y="156" text-anchor="middle" font-size="13">Dan: E(v₄)</text>
<line x1="94" y1="100" x2="124" y2="100" stroke="currentColor" stroke-width="1.6"/>
<polygon points="132,100 122,95 122,105"/>
<rect x="132" y="40" width="100" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="182" y="90" text-anchor="middle" font-weight="bold">mix 1</text>
<text x="182" y="110" text-anchor="middle" font-size="13">re-encrypt,</text>
<text x="182" y="127" text-anchor="middle" font-size="13">permute</text>
<line x1="232" y1="100" x2="262" y2="100" stroke="currentColor" stroke-width="1.6"/>
<polygon points="270,100 260,95 260,105"/>
<rect x="270" y="40" width="100" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="90" text-anchor="middle" font-weight="bold">mix 2</text>
<text x="320" y="110" text-anchor="middle" font-size="13">re-encrypt,</text>
<text x="320" y="127" text-anchor="middle" font-size="13">permute</text>
<line x1="370" y1="100" x2="400" y2="100" stroke="currentColor" stroke-width="1.6"/>
<polygon points="408,100 398,95 398,105"/>
<rect x="408" y="40" width="100" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="458" y="90" text-anchor="middle" font-weight="bold">mix 3</text>
<text x="458" y="110" text-anchor="middle" font-size="13">re-encrypt,</text>
<text x="458" y="127" text-anchor="middle" font-size="13">permute</text>
<line x1="508" y1="100" x2="538" y2="100" stroke="currentColor" stroke-width="1.6"/>
<polygon points="546,100 536,95 536,105"/>
<rect x="546" y="40" width="84" height="120" rx="6" fill="currentColor" opacity="0.10"/>
<rect x="546" y="40" width="84" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="588" y="82" text-anchor="middle" font-weight="bold">trustees</text>
<text x="588" y="104" text-anchor="middle" font-size="13">decrypt</text>
<text x="588" y="122" text-anchor="middle" font-size="13">v₃ v₁ v₄ v₂</text>
<text x="588" y="140" text-anchor="middle" font-size="13">(no names)</text>
<text x="182" y="186" text-anchor="middle" font-size="13">proof 1</text>
<text x="320" y="186" text-anchor="middle" font-size="13">proof 2</text>
<text x="458" y="186" text-anchor="middle" font-size="13">proof 3</text>
<line x1="182" y1="160" x2="182" y2="172" stroke="currentColor"/>
<line x1="320" y1="160" x2="320" y2="172" stroke="currentColor"/>
<line x1="458" y1="160" x2="458" y2="172" stroke="currentColor"/>
<line x1="10" y1="210" x2="630" y2="210" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="320" y="236" text-anchor="middle">private if one mix is honest; correct if every proof checks</text>
</svg>
<figcaption>Figure 16.4. A re-encryption mix-net. Each mix re-encrypts and reorders the list and publishes a proof that its output is a shuffle of its input. One honest mix is enough to hide who cast which ballot; the proofs, not the mixes' honesty, guarantee that no ballot was dropped, added or changed.</figcaption>
</figure>

### The proof of shuffle

The danger is obvious. A dishonest mix can drop a ballot it does not like and
replace it with a fresh encryption of its own choice; the output looks just as
random as an honest one. So each mix must prove, in zero knowledge, that its
output list is a re-encryption of a permutation of its input list, without
revealing the permutation. This is the **proof of shuffle**, and its history
is a small history of zero-knowledge proofs.

- **Sako and Kilian, 1995.** Kazue Sako and Joe Kilian ("Receipt-Free
  Mix-Type Voting Scheme", EUROCRYPT 1995) gave the first proof, by
  cut-and-choose. The mix makes a second, **shadow** shuffle of its input,
  with a fresh permutation and fresh randomness. The verifier flips a coin.
  On heads the mix opens the shadow: here is the permutation and the
  randomness that take the input to the shadow. On tails it opens the link:
  here is the permutation and randomness that take the shadow to the output.
  Either answer alone reveals nothing about the real permutation, because the
  shadow's permutation is random. But a mix whose output is not a shuffle of
  its input cannot answer both questions for the same shadow, so it is
  caught with probability 1/2 per round. Eighty rounds give $2^{-80}$, at the
  cost of eighty shadow shuffles.
- **Neff, 2001.** Andrew Neff ("A Verifiable Secret Shuffle and Its
  Application to E-Voting", ACM CCS 2001) found a proof whose size grows
  linearly with the number of ballots and does not need repetition. Its idea
  is that two lists of numbers are permutations of each other exactly when
  the polynomials having them as roots are equal, which can be tested at a
  random point. In the same year Jun Furukawa and Kazue Sako gave a proof
  based on permutation matrices.
- **Terelius and Wikström, 2010.** Björn Terelius and Douglas Wikström
  ("Proofs of Restricted Shuffles", AFRICACRYPT 2010) commit to the
  permutation matrix with Pedersen-style commitments and prove that the
  committed matrix is a permutation matrix and that the output was made with
  it. Wikström's Verificatum software implements it, and it has been used in
  real elections, including Norway's internet voting trials and Estonia's
  i-voting since its 2017 redesign. Stephanie Bayer and Jens Groth's 2012
  proof, with size growing like the square root of the number of ballots, is
  the one the Swiss Post system used.

Every one of the efficient proofs rests on a commitment scheme with
independent generators $g, h_1, h_2, \dots$, where nobody may know the
discrete logarithm of any one in terms of the others. If the mix does know
those logarithms, the commitments stop binding and it can prove a false
shuffle. Hold on to that sentence: it is what went wrong in Switzerland in
2019 (§16.9).

### Code it: a shuffle and a cut-and-choose proof

The program mixes six ballots, each naming candidate 1, 2 or 3, and proves the
shuffle in the Sako-Kilian style with 20 shadow rounds, the challenge bits
taken from a hash of everything (Fiat-Shamir). Then a cheating mix replaces
one ballot with a vote for candidate 3. Its best strategy is to guess each
challenge bit and build each shadow from whichever list (input or its own
output) it can answer for. It fails unless all 20 guesses match the hash. The
last experiment runs a one-round proof 1,000 times against a live verifier, to
show the 1/2 per round.

```python
import hashlib, random
random.seed(1995)                    # random is for the demo; real keys and nonces use secrets

p = 2**127 - 2721                    # toy group again
q, g = (p - 1) // 2, 4
x = random.randrange(1, q)           # the election key (shared among trustees in real life)
X = pow(g, x, p)
ROUNDS = 20                          # soundness 2^-20 here; real proofs need 2^-128 or better

def enc(m):
    r = random.randrange(1, q)
    return (pow(g, r, p), pow(g, m, p) * pow(X, r, p) % p)

def reenc(ct, s):                    # same plaintext, fresh-looking ciphertext
    return (ct[0] * pow(g, s, p) % p, ct[1] * pow(X, s, p) % p)

def shuffle(cts):                    # a random permutation and fresh randomness
    perm = random.sample(range(len(cts)), len(cts))
    rnd = [random.randrange(q) for _ in cts]
    return [reenc(cts[perm[i]], rnd[i]) for i in range(len(cts))], perm, rnd

def challenge_bits(inp, out, shadows):   # Fiat-Shamir: the bits come from a hash of everything
    h = hashlib.sha256(repr((p, g, X, inp, out, shadows)).encode()).digest()
    return [(h[k // 8] >> (k % 8)) & 1 for k in range(ROUNDS)]

def prove(inp, out, perm, rnd):          # Sako-Kilian style: a shadow shuffle per round
    shadows, secrets_ = [], []
    for _ in range(ROUNDS):
        sh, phi, t = shuffle(inp)
        shadows.append(sh); secrets_.append((phi, t))
    answers = []
    for e, (phi, t) in zip(challenge_bits(inp, out, shadows), secrets_):
        if e == 0:                       # open the shadow: input -> shadow
            answers.append((phi, t))
        else:                            # open the link: shadow -> output
            inv = {phi[j]: j for j in range(len(phi))}
            psi = [inv[perm[i]] for i in range(len(perm))]
            answers.append((psi, [(rnd[i] - t[psi[i]]) % q for i in range(len(perm))]))
    return shadows, answers

def verify(inp, out, shadows, answers, bits=None):  # bits=None: Fiat-Shamir; else a live verifier's
    bits = bits or challenge_bits(inp, out, shadows)
    for e, sh, (perm, rnd) in zip(bits, shadows, answers):
        if sorted(perm) != list(range(len(inp))):
            return False
        src, dst = (inp, sh) if e == 0 else (sh, out)
        if any(reenc(src[perm[i]], rnd[i]) != dst[i] for i in range(len(inp))):
            return False
    return True

ballots = [enc(m) for m in (2, 1, 3, 1, 2, 2)]         # each ballot names candidate 1, 2 or 3
out, perm, rnd = shuffle(ballots)
proof = prove(ballots, out, perm, rnd)
print("honest mix, proof accepted:", verify(ballots, out, *proof))

def decrypt(ct):
    M = ct[1] * pow(pow(ct[0], x, p), -1, p) % p
    return next(m for m in range(1, 4) if pow(g, m, p) == M)
print("decrypted after mixing:", [decrypt(c) for c in out])

# A cheating mixer swaps one output for a fresh vote for candidate 3. Its best
# strategy in each round is to guess the challenge bit and build the shadow from
# the input (to survive e = 0) or from its own output (to survive e = 1).
bad = out[:]
bad[0] = enc(3)
def cheat_prove(inp, bad, guesses):
    shadows, answers = [], []
    for b in guesses:
        if b == 0:
            sh, phi, t = shuffle(inp); ans = (phi, t)
        else:                            # shadow[j] = reenc(bad[rho[j]], -v[j]), so bad = shadow re-encrypted
            rho = random.sample(range(len(bad)), len(bad)); v = [random.randrange(q) for _ in bad]
            sh = [reenc(bad[rho[j]], -v[j]) for j in range(len(bad))]
            inv = {rho[j]: j for j in range(len(rho))}
            ans = ([inv[i] for i in range(len(bad))], [v[inv[i]] for i in range(len(bad))])
        shadows.append(sh); answers.append(ans)
    return shadows, answers
guesses = [random.randrange(2) for _ in range(ROUNDS)]
shadows, answers = cheat_prove(ballots, bad, guesses)
bits = challenge_bits(ballots, bad, shadows)
print("cheating mix, proof accepted:", verify(ballots, bad, shadows, answers))
print("rounds where the guess matched the hash:", sum(a == b for a, b in zip(guesses, bits)), "of", ROUNDS)

# Against a live verifier, one round alone catches the cheater only half the time.
wins = 0
for _ in range(1000):
    b, e = random.randrange(2), random.randrange(2)
    sh, ans = cheat_prove(ballots, bad, [b])
    wins += verify(ballots, bad, sh[:1], ans[:1], bits=[e])
print("one-round proofs a cheater passes:", wins, "of 1000")
```

Output:

```
honest mix, proof accepted: True
decrypted after mixing: [1, 1, 3, 2, 2, 2]
cheating mix, proof accepted: False
rounds where the guess matched the hash: 8 of 20
one-round proofs a cheater passes: 514 of 1000
```

The honest mix's output decrypts to the same multiset of votes, two for
candidate 1, three for 2 and one for 3, in an order unrelated to the input. The
cheater's proof fails: only 8 of its 20 guesses matched, and it needed all 20.
Against a live verifier, one round lets the cheater through 514 times in
1,000, close to the expected half.

Two cautions about this toy. With Fiat-Shamir, a cheater can retry: build
new shadows, hash again, and hope. With 20 rounds that takes about a million
tries, feasible on a laptop; a real cut-and-choose proof needs at least 128
rounds, and that cost is why Neff's and later proofs replaced it. And a mix-net
is only as private as its weakest assumption: in 2002 Markus Jakobsson, Ari
Juels and Ronald Rivest proposed a cheaper check, **randomized partial
checking**, in which each mix reveals half of its input-output links, and a
decade later Shahram Khazaei and Douglas Wikström showed that several
versions of it, as proposed and implemented, let a mix cheat or break privacy
far more easily than claimed.

!!! note "Life story: verifiable mix-nets"
    **Born:** 1981, David Chaum's decryption mix; 1993, re-encryption mixes
    (Park, Itoh and Kurosawa); 1995, the first proof of shuffle (Sako and
    Kilian, EUROCRYPT 1995) · **Purpose:** separate voters from their ballots
    so that any ballot format can be decrypted and counted in public, with a
    proof that nothing was added, dropped or changed · **Helped:** Neff's
    shuffle (2001), Terelius-Wikström (2010) in Verificatum, Bayer-Groth (2012);
    used in Norway's trials, Estonia's i-voting and Switzerland's systems ·
    **Status:** current; the standard design for complex ballots, with
    lattice-based shuffles under research for the post-quantum era

## 16.7 The voter's side: cast or audit

*Level: intermediate.*

Everything so far assumed that the encrypted ballot holds what the voter
chose. But the voter does not encrypt anything; a computer does, and the voter
cannot see inside a ciphertext. A voting machine in a polling place, a
browser with a bad plug-in, a phone with malware, or the server that delivered
the voting web page could encrypt a vote for the other candidate and show the
voter a cheerful "thank you". The proofs would all check, because the ballot
really is a valid encryption of 0 or 1. Just not the voter's.

### Benaloh's challenge

Josh Benaloh's answer ("Simple Verifiable Elections", USENIX EVT 2006; and
"Ballot Casting Assurance via Voter-Initiated Poll Station Auditing", EVT
2007) is a cut-and-choose game played by the voter, and it is now in almost
every verifiable system. The device must **commit** to an encrypted ballot
before it learns whether the voter will use it:

1. The voter makes a choice. The device encrypts it and shows (or prints) a
   short fingerprint of the ciphertext, a **tracking code**, such as the
   first characters of its hash.
2. The voter now picks one of two buttons. **Cast**: the ballot is signed
   and sent to the board. **Audit** (also called challenge or spoil): the
   device must reveal the randomness $r$ it used. The voter, or any other
   device the voter trusts, recomputes the encryption of each possible
   choice with that $r$ and checks which one matches the committed
   ciphertext.
3. An audited ballot is never counted. The voter goes back and votes again,
   and may audit as many times as they like before casting.

Figure 16.5 draws the game. The device cannot know in advance which ballots
will be audited. If it cheats on a ballot that gets audited, the cheat is
caught with certainty, and the voter has proof: the device's own committed
ciphertext and revealed randomness show a choice the voter did not make.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The Benaloh challenge: the device encrypts the choice and commits with a tracking code; the voter chooses cast, which sends the ballot to the board, or audit, which reveals the randomness for checking on another device and spoils the ballot" fill="currentColor" font-size="14">
<rect x="10" y="20" width="150" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="85" y="44" text-anchor="middle" font-weight="bold">voter chooses</text>
<text x="85" y="64" text-anchor="middle">"yes"</text>
<line x1="160" y1="48" x2="212" y2="48" stroke="currentColor" stroke-width="2"/>
<polygon points="220,48 210,43 210,53"/>
<rect x="220" y="20" width="200" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="44" text-anchor="middle" font-weight="bold">device encrypts</text>
<text x="320" y="64" text-anchor="middle">shows tracker 7F3A-91C2</text>
<line x1="320" y1="76" x2="320" y2="110" stroke="currentColor" stroke-width="2"/>
<polygon points="320,118 315,108 325,108"/>
<rect x="230" y="118" width="180" height="40" rx="20" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="143" text-anchor="middle" font-weight="bold">cast or audit?</text>
<line x1="270" y1="158" x2="160" y2="200" stroke="currentColor" stroke-width="2"/>
<polygon points="152,203 163,204 159,195"/>
<line x1="370" y1="158" x2="480" y2="200" stroke="currentColor" stroke-width="2"/>
<polygon points="488,203 481,195 477,204"/>
<rect x="10" y="203" width="250" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="135" y="227" text-anchor="middle" font-weight="bold">cast</text>
<text x="135" y="248" text-anchor="middle">ballot goes to the board;</text>
<text x="135" y="268" text-anchor="middle">voter looks up 7F3A-91C2 there</text>
<rect x="380" y="203" width="250" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="505" y="227" text-anchor="middle" font-weight="bold">audit</text>
<text x="505" y="248" text-anchor="middle">device reveals r; another device</text>
<text x="505" y="268" text-anchor="middle">checks; ballot spoiled, vote again</text>
</svg>
<figcaption>Figure 16.5. Benaloh's challenge. The device must commit to a ciphertext before it knows whether the voter will cast or audit it. A cheating device is caught on every ballot that is audited, and an audited ballot never counts, so revealing its randomness gives away nothing about the vote that is cast.</figcaption>
</figure>

**By hand.** Suppose a corrupt device changes $k$ ballots, and each voter, at
random, audits one ballot before casting with probability $a$. The device is
not caught only if none of the $k$ voters it cheated chose to audit:

$$
\Pr[\text{undetected}] = (1 - a)^{k}.
$$

With $a = 10\%$ and $k = 10$, that is $0.9^{10} \approx 0.35$: a small cheat
has a fair chance. With $k = 100$, $0.9^{100} \approx 2.7 \times 10^{-5}$.
Changing enough votes to swing an election means cheating many voters, and
the chance of no audit at all falls exponentially.

```python
# A device cheats on k ballots; each voter audits instead of casting with probability a.
# The cheat goes unnoticed only if none of those k voters audits: (1 - a)^k.
print("ballots changed   a = 1%     a = 5%     a = 10%")
for k in (10, 50, 100, 500, 1000):
    row = [(1 - a) ** k for a in (0.01, 0.05, 0.10)]
    print(f"{k:>14}   " + "   ".join(f"{v:8.2e}" for v in row))
```

Output:

```
ballots changed   a = 1%     a = 5%     a = 10%
            10   9.04e-01   5.99e-01   3.49e-01
            50   6.05e-01   7.69e-02   5.15e-03
           100   3.66e-01   5.92e-03   2.66e-05
           500   6.57e-03   7.27e-12   1.32e-23
          1000   4.32e-05   5.29e-23   1.75e-46
```

The table also shows the weakness. Detection depends on voters actually
auditing, and the evidence comes from studies of real use: few voters do it,
and fewer still finish the check correctly. In a 2014 study by Claudia Acemyan,
Philip Kortum, Michael Byrne and Dan Wallach, many participants could not
both cast and verify a ballot in Helios, Prêt à Voter or Scantegrity II, and
later studies found voters who did not understand what auditing was for, or
who audited a ballot and then left without casting one. A check that most people skip still deters a cheater who
wants to change thousands of ballots, but it is a weak guard against a
targeted one.

### Why the audit is not a receipt

The randomness $r$ of an audited ballot is exactly the receipt that §16.2
warned about: with it, anyone can see what that ciphertext encrypts. The
reason it does no harm is that the audited ballot is **spoiled**: it never
counts. The voter could show it to a vote buyer, but it proves nothing about
the ballot that was cast, which the voter's device encrypted with fresh
randomness that is never revealed. The tracking code of the cast ballot, in
turn, is just a hash of a ciphertext: it lets the voter find their ballot on
the board, and it says nothing about what is inside.

In a polling place, this is receipt-free. At home, it is not quite. A coercer
standing behind the voter can watch the screen, and a voter who wants to sell
their vote can record it. The polling booth's privacy is one of paper's
advantages that no protocol can provide remotely.

### Return codes

Internet voting systems in Norway (2011 and 2013 trials) and Switzerland use
a different answer for "cast as intended", one that needs no second device.
Before the election, each voter receives a code sheet by post: a short code
next to every candidate, different for every voter. After the voter's device
sends the encrypted ballot, the servers compute, from the ciphertext and a
secret they share, the code for whatever choice the ciphertext holds, and send
it back. If the code shown matches the one printed next to the voter's choice
on the paper sheet, the device encrypted what the voter meant. The security
argument now rests on the postal channel and on the servers that compute the
codes not colluding with the voter's device, and the 2019 Swiss analysis
(§16.9) found a flaw in exactly this part.

!!! note "Life story: the Benaloh challenge"
    **Born:** 2006 to 2007, Josh Benaloh (Microsoft Research), "Simple
    Verifiable Elections" and "Ballot Casting Assurance via Voter-Initiated
    Poll Station Auditing" (USENIX EVT 2006 and 2007) · **Purpose:** let a
    voter test that a device encrypts honestly, without the test becoming a
    receipt · **Helped:** Helios ("audit"), ElectionGuard ("spoil" or
    "challenge"), STAR-Vote, and most E2E-V designs · **Status:** current and
    standard; its weak point is that few voters use it

## 16.8 Helios: verifiable voting in a browser

*Level: intermediate.*

Ben Adida built Helios as a PhD student and postdoc in Ron Rivest's group at
MIT and at Harvard, and presented it at the USENIX Security Symposium in 2008
("Helios: Web-based Open-Audit Voting"). It was the first time the whole
academic recipe ran as a website that anyone could use to set up an election.
A voter opens a web page; JavaScript in the browser encrypts the ballot,
shows a **smart ballot tracker** (a hash of the ciphertext), and offers the
Benaloh choice between auditing and casting; the voter logs in to cast; the
ballot goes to a public list. The first version shuffled ballots with a
Sako-Kilian mix-net; from version 2 Helios used homomorphic tallying with
exponential ElGamal, 0-or-1 proofs and decryption proofs, just like §16.4.
Anyone can download the election's data and run an independent verifier.

Adida was candid about what Helios was for. Its own documentation and the
2008 paper say it suits elections where coercion is unlikely and the stakes
are moderate: a university, a professional society, a club. In such elections
the alternative was usually a web form with no verification at all, and
Helios was a large improvement.

### Where it was used

The Université catholique de Louvain in Belgium elected its president with
Helios in March 2009, in an election with more than 25,000 eligible voters
(students and staff, with weighted votes), of whom a few thousand took part.
Adida and the Louvain cryptographers who ran it wrote up the experience,
including a version of Helios adapted for weighted votes and a key held by
several trustees. Princeton's student government used it. The International
Association for Cryptologic Research, after a trial and a membership vote,
moved its board elections to Helios in 2010, and 475 of its 1,555 members
voted in that first electronic election. The IACR has used Helios every year
since, and several other academic societies followed. Successor systems
built on the same design, notably **Belenios** (developed at Inria from 2013,
by Véronique Cortier, Pierrick Gaudry and Stéphane Glondu), are used for
thousands of small elections, mostly in universities and associations in
France.

### What it does not protect against

Helios's weaknesses are instructive, because each one is a requirement from
§16.2 that a browser-based system finds hard.

- **The voter's browser and the server's code.** The encryption runs in
  JavaScript served by the Helios server. A compromised server can serve
  JavaScript that encrypts the wrong vote. The Benaloh audit can catch this,
  but only if the voter audits on a device that does not run the same bad
  code.
- **Eligibility.** The server decides who may vote and authenticates voters,
  often with passwords sent by email. A dishonest server can cast ballots for
  voters who abstain, and the public cannot tell. Helios publishes the list
  of voters who cast ballots, so a voter who did not vote can notice a ballot
  in their name, but only if they look. Belenios adds per-voter signing
  credentials generated by a separate authority to close this gap.
- **No receipt-freeness, no coercion resistance.** A voter at home can show
  their screen to anyone, and a voter who keeps the randomness of their cast
  ballot (a modified browser can do it) has a perfect receipt. Helios allows
  re-voting, which helps a little against a coercer who is not watching to the
  end.
- **Weak Fiat-Shamir.** As [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md),
  §6.9, tells in full, David Bernhard, Olivier Pereira and Bogdan Warinschi
  showed in 2012 that Helios's proofs hashed only the commitments, not the
  statement, which in principle let a dishonest authority announce a false
  result with proofs that checked. Helios was fixed; no real election is known
  to have been affected.
- **Ballot copying.** Cortier and Smyth's 2011 replay attack (§16.5) let one
  voter's ballot be re-cast by another, which can break privacy in small
  elections. Helios now rejects duplicates.

### The lost key, 2025

The most recent lesson came from the IACR itself, and it was not about
cryptanalysis at all. In its 2025 election, which ran from 17 October to 16
November, the decryption key was split among three trustees with all three
needed, a 3-of-3 sharing. After the vote closed, one trustee announced that
they had irretrievably lost their private key, "an honest but unfortunate
human mistake" in the IACR's words, and so could not compute their partial
decryption. Without it the tally could not be decrypted by anyone, ever. The
ballots were valid, the proofs checked, and the result was gone. The IACR
voided the election and ran it again from 21 November to 20 December, with a
replacement trustee, and announced that future elections would need only two
of the three trustees' keys.

It is the trade-off of [Chapter 4](04-Threshold-Cryptography.md) in its
purest form. A threshold $t = n$ maximizes privacy (every trustee would have
to collude to read a ballot) and minimizes availability (any one trustee can
stop the count by accident). The program in §16.4 used 2 of 3 and finished
the count with trustee 2 unreachable. Choosing $t$ is a decision about which
failure is worse, and an election that cannot be decrypted is a failure too.

!!! note "Life story: Helios"
    **Born:** 2008, Ben Adida (MIT and Harvard), USENIX Security 2008;
    version 1 with a Sako-Kilian mix-net, homomorphic from version 2 ·
    **Purpose:** verifiable elections for organizations, run from a web
    browser, for settings with low coercion risk · **Helped:** UCLouvain's
    presidential election (2009), the IACR's elections every year since 2010,
    Princeton's student elections, and the design of Belenios and later
    systems; the research that found weak Fiat-Shamir (2012) and ballot
    copying (2011) · **Status:** in use for small and medium elections; its
    3-of-3 key cost the IACR its 2025 election, rerun the same year

## 16.9 Voting over the internet: Estonia and Switzerland

*Level: intermediate.*

Helios was built for elections where little is at stake. Two countries have
gone much further and let citizens vote over the internet in binding
national elections and referendums. Their stories show what the cryptography
of this chapter does, and what it does not, once the voter is at home.

### Estonia, since 2005

Estonia is the most digital state in Europe. Since 2002 every citizen has had
a national ID card with a chip that holds two RSA key pairs, one for logging
in and one for legally binding signatures. In the local elections of October
2005 Estonia became the first country to offer internet voting to its whole
electorate in a binding election; 9,317 people used it, about 2 percent of
voters. In 2007 it did the same for its parliament, the Riigikogu. The share
then rose steadily: about 44 percent of votes in the 2019 parliamentary
election, and in March 2023, for the first time anywhere, a majority: about
312,000 of the 610,000 votes cast, 51 percent. In the 2024 European Parliament
election the online share was about 41 percent, and in the October 2025 local
elections slightly fewer people voted online than in 2021.

The design is a **double envelope**. The voting application on the voter's
computer encrypts the vote to the election's public key (the inner envelope)
and signs the ciphertext with the voter's ID card (the outer envelope, the
signature that proves eligibility). The servers check the signature and
store the signed ciphertext. At the close, the signatures are stripped off
and the anonymous ciphertexts are decrypted with a private key whose use
requires several members of the National Electoral Committee. Since the
system was rebuilt for the 2017 elections (as **IVXV**), the ciphertexts
pass through a Verificatum mix-net before decryption, and the decryption
comes with proofs that independent auditors check.

Estonia's answer to coercion is **re-voting**. A voter may vote online as
many times as they like during the advance voting period; only the last
online vote counts, and a paper vote cast at a polling station during that
period cancels any online vote. A voter who was watched while voting can
vote again later, alone. It is not coercion resistance in the JCJ sense: a
coercer who takes the ID card and PIN until voting ends wins, and a coercer
can at least learn whether a person voted online. Since 2013 a smartphone
application has let a voter check their vote: the voting application shows a
QR code, and for a short time afterwards the phone can download the stored
ciphertext from the server and, with the randomness from the QR code,
confirm what it contains. That is a recorded-as-cast and cast-as-intended
check that relies on the phone and the computer not being compromised
together, and like every such check it is used by few voters.

What Estonia does not have is end-to-end verifiability in the sense of
§16.2. Voters cannot check that their ballot was counted, and the public
cannot check the tally: the auditors can, on behalf of the public.

**The 2014 analysis.** In 2013 a team led by J. Alex Halderman of the
University of Michigan, with Drew Springall, Travis Finkenauer, Zakir
Durumeric, Jason Kitcat, Harri Hursti and Margaret MacAlpine, observed
Estonia's local elections as accredited observers, rebuilt the system from its
published source code in their laboratory, and published "Security Analysis of
the Estonian Internet Voting System" (ACM CCS 2014). They showed that malware
on a voter's computer could change votes undetected by most voters, and that
an attacker inside the servers, including a state-level attacker, could change
results. They also filmed procedural lapses: officials typing passwords and
PINs in view of the public cameras, election software downloaded over
unprotected connections, and server set-up done on personal computers. They
recommended that Estonia stop internet voting. Estonia's election officials
answered that the attacks were theoretical and the procedures sound, and
continued.

**The ID card, 2017.** Three years later the outer envelope cracked. In
August 2017, researchers at Masaryk University informed Estonia that the RSA
keys generated on the chips of about 750,000 ID cards, all those issued since
October 2014, had a hidden structure that let the private key be computed from
the public key with Coppersmith's method. This was **ROCA**, a flaw in
Infineon's key-generation library; the attack is told in
[Cryptanalysis, Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md), and the
story of the keys in Cryptanalysis, Chapter 18. Factoring one 2048-bit key
was estimated at tens of thousands of dollars of computing, far too much for
mass fraud and well within reach of a state that wanted to vote in a few
thousand people's names. The October 2017 local elections went ahead with
the vulnerable cards; on 3 November Estonia suspended the certificates and
asked citizens to update their keys. No abuse was found. The episode showed
that the security of an internet election can rest on a chip in every
voter's pocket that no election official chose or could inspect.

!!! note "Life story: Estonian i-voting"
    **Born:** October 2005, local elections; national parliament from 2007;
    the IVXV system with a mix-net and decryption proofs from 2017 ·
    **Purpose:** let every citizen vote from home with the national ID card,
    during the advance voting period · **Helped:** a majority of votes online
    for the first time in a national election (Riigikogu, March 2023, about 51
    percent); re-voting as a practical partial defense against coercion ·
    **Status:** in use; criticized by most outside security researchers
    (Springall et al., 2014) and shaken by the ROCA ID-card flaw (2017)

### Switzerland: the public test of 2019

Switzerland votes several times a year in federal referendums, and about
800,000 Swiss citizens live abroad, for whom postal ballots often arrive too
late. Cantons began trials of internet voting in 2004, with two systems in
the end: Geneva's own CHVote and one offered by Swiss Post, built by the
Barcelona company Scytl. Federal rules tied the share of voters who could vote
online to the system's verifiability: individual verifiability (return
codes, §16.7) for limited use, and full, universal verifiability before a
canton could offer it to everyone. In November 2018 Geneva announced it would
stop developing CHVote, leaving Swiss Post as the only provider.

To win approval for its fully verifiable version, Swiss Post published the
source code in February 2019, under restrictive terms, and ran a public
intrusion test with bug bounties from 25 February to 24 March 2019. The code
leaked publicly within days, and cryptographers read it. On 12 March, Sarah
Jamie Lewis, Olivier Pereira and Vanessa Teague published a note titled
"Ceci n'est pas une preuve" ("This is not a proof"). The shuffle proof, a
Bayer-Groth proof (§16.6), used commitment parameters, a list of generators,
that the system generated with no evidence of how they were made. Whoever
generated them could know the discrete-log relations between them, and with
those relations could produce a valid-looking proof for a shuffle that had
replaced votes. The proof was sound only if the authority that set up the
election was honest, which is the one assumption a verifiable election exists
to remove. Thomas Haines of NTNU and Rolf Haenni of the Bern University of
Applied Sciences had found the same flaw independently, and Lewis, Pereira and
Teague soon reported a related flaw in the decryption proof. Days later the same researchers found a
problem in the return-code mechanism of the version already in use in four
cantons: a malicious server could make a vote invalid while still showing the
voter the right codes.

Swiss Post withdrew both systems; no canton offered internet voting in the
May 2019 vote, and in June 2019 the Federal Council dropped its plan to make
internet voting a regular channel. In a fuller analysis, "How Not to Prove
Your Election Outcome" (IEEE Symposium on Security and Privacy, 2020), Thomas
Haines, Sarah Jamie Lewis, Olivier Pereira and Vanessa Teague documented
further flaws, among them proofs whose Fiat-Shamir hashes left out parts of
the statement, the mistake of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md),
§6.9, seven years after it was found in Helios.

**The restart.** Switzerland rewrote the rules rather than giving up. A
revised ordinance took effect on 1 July 2022, requiring complete
verifiability, published source code, a permanent bug bounty and independent
examinations. Swiss Post had bought the source code from Scytl and rebuilt the
system, publishing it from 2021. On 3 March 2023 the Federal Council allowed
three cantons to resume trials, and on 18 June 2023 voters in Basel-Stadt,
St. Gallen and Thurgau, mainly Swiss citizens abroad, voted online again;
Graubünden joined in March 2024. Use remains capped at a small share of the
electorate. In the federal vote of 8 March 2026, Basel-Stadt could not decrypt
2,048 electronic votes: the canton said the USB keys needed to decrypt its
electronic ballot box failed, and that the Swiss Post system itself was not
at fault. The votes were not enough to change any result, but the canton
suspended its trial until at least the end of 2026 and the public
prosecutor opened proceedings. Like the IACR's lost key four months earlier,
it was a failure not of the mathematics but of the people and hardware
holding the keys.

!!! note "Life story: the Swiss Post e-voting system"
    **Born:** Scytl's system, offered by Swiss Post to cantons from 2016;
    fully verifiable version tested in public, February to March 2019 ·
    **Purpose:** internet voting for Swiss referendums, above all for citizens
    abroad · **Helped:** by failing in public: a trapdoor in the shuffle
    proof's commitment parameters, flawed decryption proofs and a return-code
    flaw (Lewis, Pereira, Teague, Haenni, 2019; Haines et al., IEEE S&P 2020)
    led to new federal rules on published code and verifiability ·
    **Status:** withdrawn in 2019; a rebuilt Swiss Post system in trials
    since June 2023 in a few cantons; Basel-Stadt's trial suspended in 2026
    after 2,048 votes could not be decrypted

## 16.10 Voting over the internet: the breaks

*Level: intermediate.*

Estonia and Switzerland run their systems with care, publish code and invite
scrutiny. Other attempts show what happens when the internet meets an
election with less of that.

### Washington, DC, 2010

In 2010 the District of Columbia Board of Elections and Ethics built a
**Digital Vote-by-Mail** system for its overseas and military voters: download
a ballot as a PDF, mark it, and upload it back through a website. Before the
November general election it opened a mock election and invited the public to
test it. J. Alex Halderman's group at the University of Michigan (with Scott
Wolchok, Eric Wustrow and Dawn Isabel) took up the invitation. Within 36
hours they had control of the server, through an ordinary flaw: the server
passed the name of an uploaded file to a shell command without cleaning it,
so a file name containing shell commands ran those commands.

They used their control the way a real attacker would, and then signed their
work. They changed every ballot already cast to votes for write-in candidates
taken from fiction about computers that turn against people, such as Skynet
and Bender. They collected the files that would have let them read real
ballots and cast votes for real voters. And they set the confirmation page to
play "The Victors", the University of Michigan's fight song, after each vote.
They also found that the network's equipment used default passwords, and
that they could watch the server room through its security cameras. It took
the Board almost two business days to notice, and it learned of the attack
mostly from the song. The District withdrew the upload option for the
election, and Wolchok, Wustrow, Isabel and Halderman published "Attacking
the Washington, D.C. Internet Voting System" (Financial Cryptography 2012).

No cryptography was broken, because none was needed. That is the usual way
an internet voting system falls: through the ordinary flaws of any web
application, which a public test found in a day and a half, and which a
quieter attacker would have exploited without a song.

!!! note "Life story: the Washington, DC Digital Vote-by-Mail test"
    **Born:** September to October 2010, a public mock election by the
    District of Columbia Board of Elections and Ethics · **Purpose:** let
    overseas and military voters return marked ballots over the internet ·
    **Helped:** by being broken in public: Halderman's Michigan team took over
    the server in 36 hours through a shell-injection bug, changed every vote,
    and made it play "The Victors"; the most cited demonstration of why
    internet ballot return is dangerous · **Retired:** the upload option was
    dropped before the November 2010 election · **Replaced by:** ballots
    downloaded online but returned on paper

### Voatz, 2020

Voatz, a Boston start-up, offered a smartphone voting app that recorded votes
on a blockchain and checked identity with face matching. West Virginia used it
in 2018 for some overseas and military voters, and a few other US
jurisdictions tried it. In February 2020, Michael Specter, James Koppel and
Daniel Weitzner of MIT published "The Ballot is Busted Before the Blockchain"
(USENIX Security 2020): working from the Android app alone, since Voatz
published nothing else, they showed that an attacker controlling the phone
could change votes, that an attacker controlling the servers could see and
change them, and that the blockchain played no part in protecting either.
Voatz disputed the findings; an audit by Trail of Bits, commissioned by Voatz
and released the following month, confirmed many of them. A blockchain
stores what it is given; it does nothing to make sure that what it is given
is the voter's choice.

### Other lessons

- **New South Wales, Australia.** The state's iVote system took about 280,000
  votes in its 2015 election. During voting, Halderman and Vanessa Teague
  showed that it loaded code from a third-party server vulnerable to the
  FREAK and Logjam downgrade attacks, which could have let an attacker change
  votes. In December 2021 an outage during local elections kept some voters
  from voting, and in 2022 the state's Supreme Court voided the results in
  three councils where the lost votes could have changed the outcome. The
  state did not use iVote in its 2023 election.
- **Moscow, 2019.** A blockchain-based internet voting system for the Moscow
  City Duma election encrypted ballots with ElGamal keys of about 256 bits
  in a prime field, a size chosen perhaps for speed. In a public test that
  summer the French researcher Pierrick Gaudry recovered the private keys in
  about 20 minutes on an ordinary personal computer. The organizers switched to larger keys; Gaudry and
  Alexander Golovnev then showed that the replacement leaked information
  about each vote, because its group did not have prime order ("Breaking the Encryption Scheme of the Moscow Internet Voting System",
  Financial Cryptography 2020). The discrete logarithms of
  [Cryptanalysis, Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md) are
  not only a textbook topic.

## 16.11 Paper with proofs: Scantegrity, STAR-Vote and ElectionGuard

*Level: intermediate.*

The systems in §16.9 and §16.10 replaced paper. A different line of work
keeps the paper ballot, marked by hand or printed by a machine and dropped in
a box, and adds an encrypted, verifiable record of it alongside. The voter
still has a booth, so receipt-freeness and coercion resistance come from the
polling place as they always have. The paper is the evidence for recounts and
audits, and the encrypted record lets every voter check their ballot was
included and anyone check the tally. If the two disagree, there is something
to investigate, with evidence on both sides.

### Scantegrity II at Takoma Park, 2009

David Chaum, Ronald Rivest, Peter Ryan, Poorvi Vora, Alan Sherman and
colleagues designed **Scantegrity II** (USENIX EVT 2008) as an add-on to
ordinary optical-scan paper ballots. Each oval on the ballot hides a short
confirmation code printed in invisible ink; marking the oval with a special pen
reveals the code. The voter can write the codes down, and after the election
check on a public website that the codes recorded for their ballot are the
ones they saw. The codes are random per ballot, so they reveal nothing about
the vote to anyone without the election's secret tables, and the published
tally comes with proofs (based on commitments and partial openings) linking
codes to counts. On 3 November 2009 the city of Takoma Park, Maryland, used
Scantegrity II for its mayor and city council election, the first binding
election for public office run with an end-to-end verifiable system and a
secret ballot. It used it again in 2011.

### STAR-Vote

In 2012 Dana DeBeauvoir, the county clerk of Travis County, Texas (Austin),
asked a group of researchers for a voting system the county could own, and
they designed **STAR-Vote** (Bell, Benaloh, Byrne, DeBeauvoir, Eakin, Fisher,
Kortum, McBurnett, Montoya, Parker, Pereira, Stark, Wallach and Winn, USENIX
JETS 2013): a touchscreen that prints a paper ballot and at the same time
produces an exponential-ElGamal encryption of it, with a homomorphic tally,
threshold trustees, Benaloh challenges ("spoil this ballot") at the ballot
box, and a risk-limiting audit of the paper. It brought together almost
everything in this chapter in one design for a real county. When the county
put it out to bid, no vendor offered to build it as specified, and the project
ended in 2017. Its ideas lived on, above all in ElectionGuard.

### ElectionGuard

In May 2019 Microsoft announced **ElectionGuard**, a free, open-source
software development kit designed by Josh Benaloh and colleagues to add end-to-end
verifiability to existing voting equipment. Its cryptography is §16.4 at full
size: exponential ElGamal (in a 256-bit prime-order subgroup modulo a
4096-bit prime), a threshold key
created in a "key ceremony" among guardians, 0-or-1 and range proofs on every
selection, Chaum-Pedersen decryption proofs, a confirmation code (tracking
code) for every ballot, and Benaloh challenges (a voter may "spoil" a ballot to
have it decrypted and checked). The output is a published **election record**
in a fixed format, which independent verifiers written by other teams, such as
MITRE's, recompute.

Its public-election use so far has been in small pilots alongside paper:

- **Fulton, Wisconsin, 18 February 2020**: the first use in a real election, a
  spring primary for a school board and a state supreme court seat, with
  equipment from the nonprofit VotingWorks.
- **Preston, Idaho (Franklin County), 8 November 2022**: one precinct in the US
  midterm elections, using Hart InterCivic scanners; a MITRE verifier checked
  the record.
- **College Park, Maryland, 5 November 2023**: the city's mayor and council
  election, on Hart scanners with ElectionGuard, with the election record
  published for independent verification.

We found no use of ElectionGuard in a 2024 public election; Microsoft had
said it would not be deployed for the 2024 presidential election, since
officials avoid new technology right before a major vote. The version 2.0
specification and a description of the whole system appeared in 2024
(Benaloh, Naehrig, Pereira and Wallach, USENIX Security 2024).

!!! note "Life story: ElectionGuard"
    **Born:** announced May 2019 by Microsoft; designed by Josh Benaloh and
    colleagues, open source · **Purpose:** add end-to-end verifiability to
    existing paper-based voting equipment: encrypted records, tracking codes,
    Benaloh challenges and a public election record · **Helped:** pilots in
    Fulton, Wisconsin (2020), Preston, Idaho (2022) and College Park,
    Maryland (2023); independent verifiers such as MITRE's · **Status:**
    specification 2.0 (2024); in pilots, not yet in routine use

## 16.12 Risk-limiting audits: checking the paper

*Level: intermediate.*

An end-to-end verifiable record proves that the published tally is the
correct count of the encrypted ballots. It does not prove that the encrypted
ballots match the paper, because a scanner might have misread the paper
before encrypting it, or have been programmed to. For that, the field's answer
is the **risk-limiting audit** (RLA), proposed by the Berkeley statistician
Philip Stark in 2008 ("Conservative Statistical Post-Election Audits", *Annals
of Applied Statistics*). It needs no cryptography at all, and it is what the
National Academies (§16.14) and most election-security experts recommend for
every election.

The idea is to check the machine count against the paper by hand, but only as
much as needed. A risk-limiting audit has a **risk limit** $\alpha$, say 5
percent, and a promise: if the reported winner actually lost, the audit will
catch it and lead to a full hand count with probability at least $1 - \alpha$.
If the reported winner really won, the audit usually stops after a small
random sample. Wide margins need few ballots; narrow margins need more; a
tie needs them all.

### A ballot-comparison audit

In a **ballot-comparison** audit, the machines record an interpretation of
each paper ballot (a cast vote record), each with an identifier that links it
to its paper. The auditors draw ballots at random, find each paper ballot, read
it by hand, and compare it with its record. For a two-candidate race with
reported winner $W$ and loser $L$, each comparison gives an **overstatement**
$e$: how many votes the record overstated $W$'s margin by. A record that says
$W$ when the paper says $L$ overstates by 2; one that says $W$ for a blank
ballot, by 1; matches give 0; errors in the loser's favor give $-1$ or $-2$.

Stark's simplest sequential test keeps a running number $P$, starting at 1.
After each ballot,

$$
P \leftarrow P \cdot \frac{1 - \mu / (2\gamma)}{1 - e / (2\gamma)},
\qquad \mu = \frac{\text{reported margin in votes}}{\text{ballots cast}},
$$

where $\mu$ is the **diluted margin** and $\gamma$ is a small safety factor
a bit above 1 (here 1.1). The audit stops and confirms the result as soon as
$P \le \alpha$. $P$ is a bound on the chance of evidence this good if the
reported outcome were wrong (formally, a P-value from Markov's inequality,
the Kaplan-Markov bound). A matching ballot shrinks $P$ a little; an
overstatement grows it, a 2-vote overstatement a lot.

**By hand.** 10,000 ballots, reported $W$ 5,600 and $L$ 4,400: margin 1,200,
$\mu = 0.12$. Each matching ballot multiplies $P$ by $1 - 0.12/2.2 = 0.9455$.
To reach $0.05$ takes $n$ ballots with $0.9455^n \le 0.05$, so $n \ge \ln
0.05 / \ln 0.9455 = 53.4$: **54 ballots**, if all match. One 1-vote
overstatement multiplies $P$ by $1 / (1 - 1/2.2) = 1.83$, which costs
$\ln 1.83 / -\ln 0.9455 \approx 11$ more ballots; a 2-vote overstatement
multiplies it by $1 / (1 - 2/2.2) = 11$ and costs about 43 more. Fifty-four
ballots out of 10,000 confirm the outcome at a 5 percent risk limit.

### Code it: an audit, and the risk it promises

The program simulates two elections of 10,000 ballots. In the first the
machines named the right winner and made a few honest mistakes in both
directions. In the second they named the wrong winner: 110 ballots for $L$
were recorded as $W$, turning a 20-vote loss into a reported 200-vote win.
Each audit draws ballots at random (with replacement, as this test
assumes), and if it has not stopped by 3,000 draws it goes to a full hand
count. Running each audit 2,000 times measures what it costs and how often it
is fooled.

```python
import random
random.seed(2008)                    # a simulation: random is the right tool here

ALPHA, GAMMA = 0.05, 1.1             # risk limit 5%; GAMMA > 1 is Stark's safety factor

def audit(errors, n_ballots, margin, cap=3000):
    """Sequential ballot-comparison audit. errors maps ballot number to its
    overstatement in votes (+2, +1, -1, -2); every other ballot matches its record.
    Returns the number of ballots looked at, or None for 'go to a full hand count'."""
    mu = margin / n_ballots          # the diluted margin
    P = 1.0
    for n in range(1, cap + 1):
        e = errors.get(random.randrange(n_ballots), 0)   # draw a ballot, with replacement
        P *= (1 - mu / (2 * GAMMA)) / (1 - e / (2 * GAMMA))
        if P <= ALPHA:
            return n                 # the evidence is strong enough: stop
    return None

N = 10_000
# Case 1: the machines named the right winner (A 5,600, B 4,400) and made a few
# honest mistakes: 20 one-vote overstatements and 20 one-vote understatements.
spots = random.sample(range(N), 40)
honest = {b: (1 if k < 20 else -1) for k, b in enumerate(spots)}
sizes = [audit(honest, N, 1200) for _ in range(2000)]
done = [s for s in sizes if s is not None]
print("right outcome: certified in", len(done), "of 2000 audits; ballots examined:",
      "median", sorted(done)[len(done) // 2], " max", max(done))

# Case 2: the machines got it wrong. Reported A 5,100, B 4,900, but 110 ballots for B
# were read as A, so the true count is A 4,990, B 5,010.
flipped = {b: 2 for b in random.sample(range(N), 110)}
results = [audit(flipped, N, 200) for _ in range(2000)]
wrong = sum(r is not None for r in results)
print("wrong outcome: certified anyway in", wrong, "of 2000 audits",
      f"({wrong / 20:.1f}%; the promise is at most {ALPHA:.0%})")
print("sent to a full hand count, which finds the true winner:", 2000 - wrong)
```

Output:

```
right outcome: certified in 2000 of 2000 audits; ballots examined: median 54  max 76
wrong outcome: certified anyway in 67 of 2000 audits (3.4%; the promise is at most 5%)
sent to a full hand count, which finds the true winner: 1933
```

The right outcome was confirmed every time, after a median of 54 ballots,
exactly the hand calculation, and never more than 76. The wrong outcome was
confirmed in 3.4 percent of audits, under the 5 percent promised; in the
other 96.6 percent the audit kept finding flipped ballots, never got its
evidence, and sent the election to a full hand count, which would have found
the true winner. The audit's work is small when the result is right and
large only when it needs to be.

Two things about the risk limit are worth saying plainly. It is a promise
about the outcome, not about every vote: a few miscounted ballots that do not
change the winner can pass. And it rests on the paper: if ballots were lost,
added or altered before the audit, the audit checks the wrong evidence. That
is why RLAs come with **ballot accounting** and chain-of-custody rules, and
why Stark and David Wagner describe the goal as **evidence-based elections**:
a trustworthy paper record, a check that it was kept, and an audit of the
outcome against it.

!!! note "Life story: risk-limiting audits"
    **Born:** 2008, Philip Stark (UC Berkeley), "Conservative Statistical
    Post-Election Audits"; ballot-comparison "super-simple" audits (2010) and
    ballot-polling BRAVO (Lindeman, Stark and Yates, 2012) followed ·
    **Purpose:** confirm an election outcome from a small random sample of
    paper ballots, with a guaranteed bound on the chance of confirming a wrong
    outcome · **Helped:** Colorado's statewide audits from 2017, Georgia's
    full hand tally audit of about 5 million presidential ballots in November
    2020, and audit laws and pilots in a growing number of US states ·
    **Status:** current; recommended by the 2018 National Academies report
    for every election

## 16.13 Mars: an election Earth can check

*Level: intermediate.*

Arcadia City's council, the mayor and six district wardens of
[Chapter 1](01-Computing-With-Secrets.md), §1.8, is elected every three Mars
years. The city has a few thousand voters, and two kinds of distrust. Inside
the city, the computers that would count votes are run by staff who answer to
the sitting mayor, who is a candidate. Outside, the settlement's charter
promises its sponsors on Earth that elections will be free, and Earth wants to
check that promise without trusting the city's word, its computers or a
4-to-24-minute link that drops for two weeks every two years when the Sun
passes between the planets.

The council adopts paper ballots with an end-to-end verifiable record, much
like ElectionGuard:

1. **Paper first.** Voters mark paper ballots by hand in the district halls.
   Each ballot is scanned at the box; the scanner encrypts its reading with
   exponential ElGamal, attaches 0-or-1 and one-candidate proofs, and prints
   the voter a slip with a tracking code (a hash of the encrypted ballot,
   nothing else). A voter may instead challenge the scanner's encryption, as
   in §16.7, and mark a fresh ballot. The paper goes into the box.
2. **Five trustees, any three.** The election key is made by distributed key
   generation ([Chapter 4](04-Threshold-Cryptography.md), §4.4) among five
   guardians: three chosen by the districts that have no candidate standing
   that year, the city court's clerk, and one at the sponsors' electoral
   commission on Earth. Three of five are needed. The threshold is the IACR's
   lesson: one lost key, a broken tablet or a solar conjunction that cuts off
   Earth cannot stop the count. And since any three trustees could read a
   ballot, no three of them answer to the same person.
3. **The record goes to Earth.** After the polls close, the city publishes the
   election record: parameters, guardians' public keys, every encrypted ballot
   with its proofs, the product per race, the partial decryptions with their
   proofs. With a 256-bit curve, a ballot of two races with three candidates
   each is a few kilobytes, so the record for a few thousand voters is under
   10 megabytes, well within a day's share of the relay link.
4. **Earth checks later.** Verifiers on Earth, written by people who never saw
   the city's software, recompute every check of §16.4. Earth needs no secret
   and no conversation with Arcadia: the light delay, which would ruin an
   interactive proof, does not matter to a non-interactive one. Every voter
   can find their tracking code on the record, in the city or from Earth.
5. **The paper is audited in the city.** The record proves the tally matches
   the encrypted ballots; it cannot prove the scanners read the paper
   correctly. So the city runs a ballot-comparison risk-limiting audit (§16.12)
   in public, with observers from every district. For the mayor's race, say
   4,000 ballots and a 10-point margin ($\mu = 0.1$), the clean-ballot factor
   is $1 - 0.1/2.2 = 0.9545$, and $\ln 0.05 / \ln 0.9545 = 64.4$: 65
   ballots. For a district warden's race of 600 ballots won 318 to 282
   ($\mu = 0.06$), it is about 110 of the 600, close to a fifth. In very small
   races a full hand count is often simpler, and the council writes that into
   its rules.

Figure 16.6 shows who checks what. The division matters. Earth can verify
everything that is mathematics, from 225 million kilometers away, years later
if need be. Only people in the city can check the paper, and only the voter
can check that the scanner read their own ballot right. The council chose
paper not out of nostalgia, but because it is the one part of the system that
no software update can rewrite.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Arcadia City's election: paper ballots go into boxes and are audited in the city; the scanner's encrypted record goes to a public board; three of five guardians, one on Earth, decrypt the tally; verifiers on Earth recheck the record after a 3 to 22 minute delay" fill="currentColor" font-size="14">
<rect x="10" y="20" width="390" height="270" rx="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>
<text x="24" y="40" font-weight="bold">Arcadia City</text>
<rect x="30" y="56" width="120" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="77" text-anchor="middle">voter marks</text>
<text x="90" y="96" text-anchor="middle">paper ballot</text>
<line x1="150" y1="81" x2="192" y2="81" stroke="currentColor" stroke-width="1.6"/>
<polygon points="200,81 190,76 190,86"/>
<rect x="200" y="56" width="180" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="77" text-anchor="middle">scanner: encrypt,</text>
<text x="290" y="96" text-anchor="middle">prove, print tracker</text>
<line x1="90" y1="106" x2="90" y2="142" stroke="currentColor" stroke-width="1.6"/>
<polygon points="90,150 85,140 95,140"/>
<rect x="30" y="150" width="120" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="171" text-anchor="middle">ballot box</text>
<text x="90" y="190" text-anchor="middle">(the evidence)</text>
<line x1="90" y1="200" x2="90" y2="226" stroke="currentColor" stroke-width="1.6"/>
<polygon points="90,234 85,224 95,224"/>
<rect x="30" y="234" width="120" height="44" rx="5" fill="currentColor" opacity="0.10"/>
<text x="90" y="253" text-anchor="middle" font-weight="bold">risk-limiting</text>
<text x="90" y="270" text-anchor="middle" font-weight="bold">audit</text>
<line x1="290" y1="106" x2="290" y2="142" stroke="currentColor" stroke-width="1.6"/>
<polygon points="290,150 285,140 295,140"/>
<rect x="200" y="150" width="180" height="50" rx="5" fill="currentColor" opacity="0.10"/>
<rect x="200" y="150" width="180" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="171" text-anchor="middle" font-weight="bold">election record</text>
<text x="290" y="190" text-anchor="middle">ballots, proofs, tally</text>
<rect x="200" y="226" width="180" height="52" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="247" text-anchor="middle">guardians: 3 of 5</text>
<text x="290" y="266" text-anchor="middle">decrypt with proofs</text>
<line x1="290" y1="226" x2="290" y2="208" stroke="currentColor" stroke-width="1.4"/>
<polygon points="290,200 285,210 295,210"/>
<rect x="470" y="20" width="160" height="270" rx="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>
<text x="484" y="40" font-weight="bold">Earth</text>
<rect x="485" y="150" width="130" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="171" text-anchor="middle">independent</text>
<text x="550" y="190" text-anchor="middle">verifiers</text>
<rect x="485" y="226" width="130" height="52" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="247" text-anchor="middle">guardian 5</text>
<text x="550" y="266" text-anchor="middle">(optional)</text>
<line x1="380" y1="175" x2="477" y2="175" stroke="currentColor" stroke-width="1.6"/>
<polygon points="485,175 475,170 475,180"/>
<text x="432" y="166" text-anchor="middle" font-size="13">3 to 22</text>
<text x="432" y="194" text-anchor="middle" font-size="13">minutes</text>
<line x1="380" y1="252" x2="477" y2="252" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
</svg>
<figcaption>Figure 16.6. Arcadia City's council election. The paper stays in the city and is audited there; the encrypted record goes to Earth, where anyone can recheck the tally without trusting the city's computers. Three of five guardians decrypt, so neither the Earth guardian nor any single district can block the count.</figcaption>
</figure>

## 16.14 In the real world

*Level: intermediate.*

### Why most experts oppose internet voting

In September 2018 the US National Academies of Sciences, Engineering, and
Medicine published *Securing the Vote: Protecting American Democracy*, the
work of a committee of election officials, computer scientists and social
scientists formed after the interference in the 2016 election. Its
recommendations are the clearest summary of the field's consensus:

- elections should use human-readable paper ballots, marked by hand or by a
  machine the voter can check, and every machine that does not produce such a
  ballot should be taken out of service;
- states should require risk-limiting audits before results are certified;
- "at the present time, the Internet (or any network connected to the
  Internet) should not be used for the return of marked ballots", and should
  not be until very robust guarantees of security and verifiability are
  developed and in place;
- end-to-end verifiable systems are promising but need more research, above
  all on usability, before they can carry public elections over the internet.

The reasons follow from this chapter. Cryptography can make the tally
verifiable, but internet voting adds three problems it cannot solve. **The
voter's device** is outside anyone's control, and the cast-as-intended checks
that guard against it (Benaloh challenges, verification apps, return codes)
are used by few voters and rest on other assumptions. **Coercion and vote
selling** come back once the voter leaves the booth; re-voting helps, but
nothing yet deployed solves it. **Attacks scale**: one flaw, in a server, an
app, an ID card's chip or a library, can touch every ballot at once, and a
state-level attacker has the means to find it. Against that, paper with
audits gives up speed and convenience and keeps the three properties of §16.1.

The other side has arguments too. Voters abroad, voters with disabilities and
voters in remote places are often poorly served by paper; Estonia has run
internet voting for twenty years without a demonstrated attack on a result;
and postal voting, the usual alternative for those voters, has its own
weaknesses for coercion and custody. Switzerland's answer, internet voting
only with full verifiability, published code and caps on its use, is one way
to weigh the two. The record of §16.9 and §16.10 explains why most researchers
still weigh it the other way.

### The systems side by side

| System | Years | Ballot | Who can verify the tally | Status |
| --- | --- | --- | --- | --- |
| Helios | 2008- | browser | anyone | in use, small elections (IACR since 2010) |
| Belenios | 2013- | browser | anyone | in use, small elections |
| Estonia (IVXV) | 2005- | home computer, ID card | auditors | in use, national |
| Swiss Post | 2016-2019, 2023- | home computer, code sheet | auditors and examiners | trials, a few cantons |
| DC Digital Vote-by-Mail | 2010 | upload | nobody | broken in test, withdrawn |
| Voatz | 2018-2020 | phone app | nobody | criticized, little used |
| Scantegrity II | 2009, 2011 | paper | anyone | Takoma Park only |
| STAR-Vote | 2012-2017 | paper + touchscreen | anyone (designed) | never built |
| ElectionGuard | 2019- | paper + scanner | anyone | pilots |
| Risk-limiting audits | 2008- | paper | observers of the audit | growing use in the US |

The pattern is plain. Systems that keep the paper and add cryptography or
audits have been adopted slowly and have not failed in public; systems that
replace paper with the internet have been adopted quickly where they were
adopted at all, and most have failed in public at least once.

## 16.15 Going deeper

*Level: expert.*

**Definitions.** The properties of §16.2 have formal, game-based definitions,
and the details matter. Ballot privacy is usually stated as **BPRIV**
(Bernhard, Cortier, Galindo, Pereira and Warinschi, IEEE S&P 2015): an
adversary who sees the board and the tally cannot tell whether it is in a
world with the real ballots or with fake ones, where the tally is still
computed from the real ones. Verifiability has competing definitions
(Küsters, Truderung and Vogt's accountability framework, 2010; Cortier,
Galindo, Küsters, Müller and Truderung's survey of definitions, IEEE S&P
2016), and they disagree on details such as whether voters who do not check
are protected. Proofs for Helios-like systems in these models need strong
Fiat-Shamir and non-malleable ballots, which is the formal version of §16.5's
copied ballot.

**Privacy against the future.** Encrypted ballots on a public board are safe
only while the encryption holds. A quantum computer running Shor's algorithm
([Post-quantum, Chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md))
would decrypt every ElGamal ballot ever published, with the voter's name
beside it in systems that post signed ballots. **Everlasting privacy** (Moran
and Naor, CRYPTO 2006) publishes only perfectly hiding commitments, such as
Pedersen commitments ([Chapter 3](03-Commitments.md)), and sends the
encryptions privately to the trustees, so the public record stays private
even against unbounded attackers. There is a trade-off: a scheme cannot be
both unconditionally private and unconditionally verifiable (Chevallier-Mames,
Fouque, Pointcheval, Stern and Traoré, 2006). Lattice-based ballot
encryption and shuffle proofs, which would resist quantum attacks, have been
proposed since the late 2010s but are not yet deployed.

**Coercion resistance in practice.** JCJ's tally removes duplicate and fake
credentials with a plaintext-equivalence test between every pair of ballots,
so it costs quadratic work in the number of ballots. Civitas (Clarkson, Chong
and Myers, IEEE S&P 2008) built it, and much later work reduces the cost to
near-linear. The harder problem is human: voters must keep a real credential
secret and produce a fake one convincingly under pressure, and usability
studies of such schemes are discouraging.

**Other ballots and other audits.** Ranked-choice ballots leak through the
**Italian attack**: with many candidates, the order of the lower preferences
can act as a signature a coercer asks for, so mix-net tallies of ranked
ballots must not publish every decrypted ballot in full. Risk-limiting audits
extend beyond plurality: BRAVO samples ballots without cast vote records
(Lindeman, Stark and Yates, 2012); SHANGRLA (Stark, 2020) turns any social
choice function's correctness into a set of assertions about averages that
can be tested by the same martingale methods; and RAIRE (Blom, Stuckey and
Teague, 2019) generates such assertions for instant-runoff voting. Combining
E2E-V and RLAs, so that a verifiable record also drives the audit, is the
subject of current research and of ElectionGuard's design.

**Where to learn more.** Cortier, Gaudry and Glondu's description of Belenios,
the Haines et al. Swiss Post paper, and the ElectionGuard specification are
the best way into how real verifiable systems are built; Lindeman and Stark's
"A Gentle Introduction to Risk-Limiting Audits" (2012) is the way into audits.

## Check yourself

??? question "1. Why does a homomorphic tally use exponential ElGamal ($g^v$) and not ordinary ElGamal on $v$ itself?"

    Multiplying ElGamal ciphertexts multiplies the plaintexts. Encoding the
    vote as $g^v$ turns that multiplication into addition of the exponents,
    so the product of the ballots encrypts $g^{\sum v}$, the tally. The cost
    is a small discrete log at the end, easy because the tally is at most the
    number of voters.

??? question "2. In the hand example of §16.3, Dan also votes yes with $r = 2$. Find his ballot and the new product."

    $A = g^2 = 4$. $X^2 = g^{18} = 25$, so $B = 2 \cdot 25 = 50 \equiv 3$. The
    ballot is $(4, 3)$. The new product is $A = 9 \cdot 4 = 36$ and $B = 24
    \cdot 3 = 72 \equiv 25$. In exponents, $A = g^{17}$ and $B = g^{3 + 9 \cdot
    17} = g^{156} = g^{18} = 25$, which decrypts to $g^{18 - 153} = g^{-135}
    = g^{3}$: three yes votes.

??? question "3. What is the difference between individual and universal verifiability, and who can do each check?"

    Individual verifiability lets a voter check that their own ballot was cast
    as intended and recorded as cast; only that voter knows what they meant,
    so only they can do it. Universal verifiability lets anyone check that
    the published ballots were tallied correctly, from public data and
    proofs. Together they make a system end-to-end verifiable.

??? question "4. Why would giving each voter the randomness $r$ of their cast ballot destroy receipt-freeness, while revealing $r$ for an audited ballot does not?"

    With $r$, anyone can encrypt each possible vote and see which matches the
    published ciphertext, so $r$ proves how the ballot was cast: a receipt a
    buyer could pay for. An audited ballot is spoiled and never counted, so
    proving its contents says nothing about the vote that was actually cast.

??? question "5. A device cheats on 200 ballots, and each voter audits with probability 2 percent. What is the chance that no cheated voter audits?"

    $(1 - 0.02)^{200} = 0.98^{200} = e^{200 \ln 0.98} \approx e^{-4.04}
    \approx 0.018$: under 2 percent. Small audit rates still catch cheating at
    scale, as long as voters who see a problem can report it with evidence.

??? question "6. Mallory copies another voter's valid ballot, proof and all, and submits it under her own name. What stops it in the code of §16.5, and what was the risk in Helios?"

    The Fiat-Shamir hash includes the voter ID, so under Mallory's name the
    challenge changes and the proof fails. In Helios (Cortier and Smyth,
    2011), copied ballots were accepted, doubling one voter's choice; in a
    small election, comparing tallies can then reveal how the copied voter
    voted.

??? question "7. In a Sako-Kilian shuffle proof, why does answering only one of the two questions about each shadow reveal nothing about the real permutation, and why must a cheater lose half the rounds?"

    The shadow uses a fresh random permutation $\varphi$. Opening input to
    shadow reveals $\varphi$, which is independent of the real $\pi$; opening
    shadow to output reveals $\varphi^{-1}\pi$, which is uniformly random
    because $\varphi$ is. If the output is not a shuffle of the input, no
    shadow can be both a shuffle of the input and something the output is a
    shuffle of, so the cheater can answer at most one of the two questions
    and is caught when asked the other.

??? question "8. Why was the Swiss Post shuffle proof of 2019 unsound even though the mathematics of the Bayer-Groth proof is correct?"

    The proof relies on commitments with generators whose discrete-log
    relations nobody knows. The system generated them with no evidence of
    how, so whoever made them could know the relations, open commitments to
    other values, and prove a shuffle that replaced votes. The fix is to
    derive the generators verifiably, for example by hashing a public seed
    into the group, so that nobody can know their logs.

??? question "9. A two-candidate race has 20,000 ballots and a reported margin of 400 votes. With $\gamma = 1.1$ and a 5 percent risk limit, how many ballots must a ballot-comparison audit examine if every one matches?"

    $\mu = 400 / 20{,}000 = 0.02$; each matching ballot multiplies $P$ by
    $1 - 0.02/2.2 = 0.99091$. We need $n \ge \ln 0.05 / \ln 0.99091 =
    -2.996 / -0.009132 = 328.04$, so 329 ballots, under 2 percent of the
    race. A single 2-vote overstatement would cost about 263 more.

??? question "10. The IACR's 2025 election used a 3-of-3 trustee key. What threshold would you choose for Arcadia City's five guardians, and what does each choice risk?"

    With $t$ of $n$, privacy fails if $t$ guardians collude, and the count
    fails if $n - t + 1$ are lost or unreachable. 5 of 5 gives the most
    privacy and lets one lost key stop the election, as at the IACR. 1 of 5
    lets any guardian read every ballot. 3 of 5, as in §16.13, survives two
    failures (including the Earth guardian during a solar conjunction) and
    needs three colluders, which the council makes unlikely by choosing
    guardians who answer to different people.

## What you learned

- An election must keep each ballot secret and make the count checkable at
  once. Paper does it with a booth, durable evidence and attacks that do not
  scale, and any replacement is judged against it.
- The requirements are eligibility, ballot privacy, individual verifiability
  (cast as intended, recorded as cast), universal verifiability (tallied as
  recorded), receipt-freeness and coercion resistance (Juels, Catalano and
  Jakobsson, 2005). The first four together are end-to-end verifiability.
- Homomorphic tallying (Cramer, Gennaro and Schoenmakers, 1997) encrypts each
  vote as $g^v$ under a threshold ElGamal key, proves each ballot holds 0 or
  1 with an OR of Chaum-Pedersen proofs, multiplies the ballots, and has $t$
  trustees decrypt only the product, each with a proof. The tally is a small
  discrete log.
- Without ballot proofs, one ballot of $g^5$ adds five votes undetectably;
  strong Fiat-Shamir with the voter ID in the hash also stops copied ballots.
- Mix-nets re-encrypt and permute ballots with a proof of shuffle (Sako and
  Kilian 1995, Neff 2001, Terelius and Wikström 2010) and handle any ballot
  format; their proofs need commitment generators nobody has a trapdoor for.
- Benaloh's cast-or-audit challenge and tracking codes let voters check
  devices they cannot inspect, without receipts, but few voters use them.
- Helios brought verifiable voting to small elections; Estonia and
  Switzerland run internet voting for public elections, and their flaws
  (Springall et al. 2014, ROCA 2017, the Swiss Post proofs 2019) and the
  breaks in Washington, DC (2010) and Voatz (2020) are why the National
  Academies (2018) advised against internet ballot return.
- Lost keys stopped the IACR's 2025 election and 2,048 Basel votes in 2026:
  choose thresholds for availability as well as privacy.
- Paper ballots with risk-limiting audits (Stark, 2008), and with E2E-V
  records such as ElectionGuard where possible, are the practical gold
  standard. An audit confirms a right outcome with a small sample and sends a
  wrong one to a full hand count with probability at least $1 - \alpha$.

**Next:** [Chapter 17](17-Consensus-and-Smart-Contracts.md), agreement among
strangers without a trusted count at all, and the public ledgers it produces.

## Further reading

- David Chaum, "Untraceable Electronic Mail, Return Addresses, and Digital
  Pseudonyms", *Communications of the ACM* 24 (1981).
- Josh Cohen (Benaloh) and Michael Fischer, "A Robust and Verifiable
  Cryptographically Secure Election Scheme" (FOCS 1985); Josh Benaloh,
  *Verifiable Secret-Ballot Elections*, PhD thesis, Yale University (1987).
- Choonsik Park, Kazutomo Itoh and Kaoru Kurosawa, "Efficient Anonymous
  Channel and All/Nothing Election Scheme" (EUROCRYPT 1993).
- Josh Benaloh and Dwight Tuinstra, "Receipt-Free Secret-Ballot Elections"
  (STOC 1994).
- Kazue Sako and Joe Kilian, "Receipt-Free Mix-Type Voting Scheme"
  (EUROCRYPT 1995).
- Ronald Cramer, Rosario Gennaro and Berry Schoenmakers, "A Secure and
  Optimally Efficient Multi-Authority Election Scheme" (EUROCRYPT 1997).
- C. Andrew Neff, "A Verifiable Secret Shuffle and Its Application to
  E-Voting" (ACM CCS 2001); Jun Furukawa and Kazue Sako, "An Efficient
  Scheme for Proving a Shuffle" (CRYPTO 2001).
- Markus Jakobsson, Ari Juels and Ronald Rivest, "Making Mix Nets Robust for
  Electronic Voting by Randomized Partial Checking" (USENIX Security 2002).
- Ari Juels, Dario Catalano and Markus Jakobsson, "Coercion-Resistant
  Electronic Elections" (WPES 2005).
- Ronald Rivest and John Wack, "On the Notion of 'Software Independence' in
  Voting Systems" (2006).
- Josh Benaloh, "Simple Verifiable Elections" (USENIX EVT 2006) and "Ballot
  Casting Assurance via Voter-Initiated Poll Station Auditing" (USENIX EVT
  2007).
- Tal Moran and Moni Naor, "Receipt-Free Universally-Verifiable Voting with
  Everlasting Privacy" (CRYPTO 2006).
- Ben Adida, "Helios: Web-based Open-Audit Voting" (USENIX Security 2008);
  Ben Adida, Olivier de Marneffe, Olivier Pereira and Jean-Jacques
  Quisquater, "Electing a University President Using Open-Audit Voting:
  Analysis of Real-World Use of Helios" (EVT/WOTE 2009).
- David Chaum, Richard Carback, Jeremy Clark, Aleksander Essex, Stefan
  Popoveniuc, Ronald Rivest, Peter Ryan, Emily Shen and Alan Sherman,
  "Scantegrity II: End-to-End Verifiability for Optical Scan Election
  Systems Using Invisible Ink Confirmation Codes" (USENIX EVT 2008).
- Michael Clarkson, Stephen Chong and Andrew Myers, "Civitas: Toward a
  Secure Voting System" (IEEE S&P 2008).
- Philip Stark, "Conservative Statistical Post-Election Audits", *Annals of
  Applied Statistics* 2 (2008); "Super-Simple Simultaneous Single-Ballot
  Risk-Limiting Audits" (EVT/WOTE 2010).
- Björn Terelius and Douglas Wikström, "Proofs of Restricted Shuffles"
  (AFRICACRYPT 2010).
- Véronique Cortier and Ben Smyth, "Attacking and Fixing Helios: An Analysis
  of Ballot Secrecy" (IEEE CSF 2011).
- Mark Lindeman and Philip Stark, "A Gentle Introduction to Risk-Limiting
  Audits", *IEEE Security & Privacy* 10 (2012); Mark Lindeman, Philip Stark
  and Vincent Yates, "BRAVO: Ballot-Polling Risk-Limiting Audits to
  Verify Outcomes" (EVT/WOTE 2012).
- Stephanie Bayer and Jens Groth, "Efficient Zero-Knowledge Argument for
  Correctness of a Shuffle" (EUROCRYPT 2012).
- David Bernhard, Olivier Pereira and Bogdan Warinschi, "How Not to Prove
  Yourself: Pitfalls of the Fiat-Shamir Heuristic and Applications to Helios"
  (ASIACRYPT 2012).
- Scott Wolchok, Eric Wustrow, Dawn Isabel and J. Alex Halderman, "Attacking
  the Washington, D.C. Internet Voting System" (Financial Cryptography 2012).
- Philip Stark and David Wagner, "Evidence-Based Elections", *IEEE Security
  & Privacy* 10 (2012).
- Susan Bell, Josh Benaloh, Michael Byrne, Dana DeBeauvoir, Bryce Eakin,
  Gail Fisher, Philip Kortum, Neal McBurnett, Julian Montoya, Michelle
  Parker, Olivier Pereira, Philip Stark, Dan Wallach and Michael Winn,
  "STAR-Vote: A Secure, Transparent, Auditable, and Reliable Voting System",
  *USENIX JETS* 1 (2013).
- Claudia Acemyan, Philip Kortum, Michael Byrne and Dan Wallach, "From Error
  to Error: Why Voters Could Not Cast a Ballot and Verify Their Vote With
  Helios, Prêt à Voter, and Scantegrity II", *USENIX JETS* 3 (2014).
- Drew Springall, Travis Finkenauer, Zakir Durumeric, Jason Kitcat, Harri
  Hursti, Margaret MacAlpine and J. Alex Halderman, "Security Analysis of the
  Estonian Internet Voting System" (ACM CCS 2014).
- J. Alex Halderman and Vanessa Teague, "The New South Wales iVote System:
  Security Failures and Verification Flaws in a Live Online Election"
  (VoteID 2015).
- David Bernhard, Véronique Cortier, David Galindo, Olivier Pereira and
  Bogdan Warinschi, "SoK: A Comprehensive Analysis of Game-Based Ballot
  Privacy Definitions" (IEEE S&P 2015).
- Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš, "The
  Return of Coppersmith's Attack: Practical Factorization of Widely Used RSA
  Moduli" (ACM CCS 2017).
- National Academies of Sciences, Engineering, and Medicine, *Securing the
  Vote: Protecting American Democracy* (2018).
- Sarah Jamie Lewis, Olivier Pereira and Vanessa Teague, "Ceci n'est pas une
  preuve: The Use of Trapdoor Commitments in Bayer-Groth Proofs and the
  Implications for the Verifiability of the Scytl-SwissPost Internet Voting
  System" (2019).
- Thomas Haines, Sarah Jamie Lewis, Olivier Pereira and Vanessa Teague, "How
  Not to Prove Your Election Outcome" (IEEE S&P 2020).
- Michael Specter, James Koppel and Daniel Weitzner, "The Ballot is Busted
  Before the Blockchain: A Security Analysis of Voatz" (USENIX Security 2020).
- Pierrick Gaudry and Alexander Golovnev, "Breaking the Encryption Scheme of
  the Moscow Internet Voting System" (Financial Cryptography 2020).
- Philip Stark, "Sets of Half-Average Nulls Generate Risk-Limiting Audits:
  SHANGRLA" (Voting 2020).
- Josh Benaloh, Michael Naehrig, Olivier Pereira and Dan Wallach,
  "ElectionGuard: a Cryptographic Toolkit to Enable Verifiable Elections"
  (USENIX Security 2024); the ElectionGuard specification, version 2.0.
- IACR, "IACR 2025 Election" announcements (November 2025), on the voided
  election and its rerun.
