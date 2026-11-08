# 16. Breaking Post-Quantum Candidates

*Between 2017 and 2025 the world's cryptanalysts were handed a gift: 69 new
public-key systems, each with a specification, reference code and a claim of
security, and a public process that rewarded anyone who knocked one down. This
chapter reads NIST's post-quantum standardization as a cryptanalysis tournament.
It counts the casualties round by round, tells the quick early kills, and then
gives the attacker's summary of the two great breaks of 2022: SIKE, which fell to
a 25-year-old theorem about curves of genus two in about an hour on one core,
and Rainbow, which fell in a weekend on a laptop. It covers the MinRank attacks
that sank GeMSS, the attacks that did not break the lattice schemes but moved
their parameters, the implementation attacks on ML-KEM, the one real danger to
hash-based signatures, and the quantum attacker's own tools at honest prices.
You will count the secrets in a SIKE key, watch a toy Oil and Vinegar key vanish
on its hidden subspace, forge a hash-based signature after a key is used twice,
and price Grover's algorithm against a depth limit. The chapter ends with what
survived, why, and how to read a post-quantum security claim.*

!!! abstract "In this chapter"
    **You will learn:**

    - how NIST's process ran from the 2016 call to FIPS 203, FIPS 204 and FIPS 205
      in August 2024 and HQC in March 2025, and how many candidates were broken in
      each round;
    - a handful of early casualties, and the patterns that killed them;
    - what the SIKE break used (the published torsion points and Kani's theorem),
      how long it took, and why it left CSIDH and SQIsign standing;
    - what Beullens' attack on Rainbow exploited, why it needed 53 hours, and what
      it said about multivariate signatures; GeMSS and the MinRank attacks;
    - the attacks that reshaped lattice parameters without breaking them: the dual
      attack debate, decryption failures, and side channels and faults on ML-KEM
      code;
    - why hash-based signatures have held, and how a reused state breaks them;
    - what Shor and Grover would cost on real hardware, and what today's machines
      can actually factor;
    - how to read a post-quantum security claim.

    **You need:** book 1's [Chapter 20](../../book/20-Quantum-Computers.md) (what a
    quantum computer does, Shor and Grover, the NIST competition in short),
    [Chapter 21](../../book/21-Lattice-Cryptography.md) (LWE and ML-KEM) and
    [Chapter 22](../../book/22-Hash-and-Code-Based.md) (hash-based signatures and the
    short story of SIKE and Rainbow). The idea of a cost measured against brute force
    from [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md), and for §16.8 the
    lattice attacks of [Chapter 15](15-Lattices-as-a-Weapon.md). The full mathematics
    of isogenies and multivariate equations lives in the Post-quantum book
    ([chapter 15](../post-quantum/index.md) and
    [chapter 16](../post-quantum/index.md)); this chapter gives the attacker's
    summary and links there.

    **Levels:** §16.1 to §16.3 are for beginners, §16.4 to §16.7 and §16.10 to §16.12
    are intermediate, §16.8, §16.9 and §16.13 are expert.

## 16.1 The problem

*Level: beginner.*

Every public-key system in wide use in 2016 rested on one of two problems:
factoring large numbers (RSA) or computing discrete logarithms (Diffie-Hellman,
DSA, elliptic curves). Peter Shor had shown in 1994 that a large enough quantum
computer solves both in polynomial time ([Chapter 11](11-Factoring.md) and
[Chapter 12](12-Discrete-Logarithms.md) tell the classical side of those
problems; book 1's [Chapter 20](../../book/20-Quantum-Computers.md) tells the
quantum side). Nobody had such a computer, but encrypted traffic recorded in 2016
could be read whenever one arrived, and replacing the cryptography in every phone,
server, smart card and car takes ten or twenty years. So the replacements had to
be chosen long before the threat was real.

The replacements existed, after a fashion. Code-based encryption went back to
Robert McEliece in 1978, hash-based signatures to Leslie Lamport and Ralph Merkle
in 1979, lattices to the NTRU system of 1996 and Oded Regev's learning with errors
of 2005, multivariate signatures to Tsutomu Matsumoto and Hideki Imai in 1988 and
Jacques Patarin in the 1990s, and isogeny-based key exchange to the 2000s. What
they lacked was the thing that makes a cipher trustworthy: years of skilled people
trying to break it. RSA had been attacked for forty years. Most post-quantum
schemes had been attacked by a few dozen people, part time.

The US National Institute of Standards and Technology chose a method it had used
twice before, for AES (1997 to 2001) and SHA-3 (2007 to 2012): an open call, public
submissions, and several rounds in which anyone could attack anything. In
December 2016 NIST published its call for proposals. It avoided the word
"competition", because it expected to pick more than one winner, but it ran like
one. And because the submissions arrived all at once, each with a specification,
code and a claimed security level, the process became the largest public
cryptanalysis exercise ever held. A break was the fastest way for a young
researcher to make a name, and many did.

From the attacker's side, the rules of this tournament were simple:

- **The target is the claim.** Each submission named a security category, from 1
  (as hard as finding an AES-128 key) to 5 (as hard as an AES-256 key), and
  parameter sets meant to meet it. An attack that beats the claimed category for
  a parameter set is a break of that set, even if it costs $2^{100}$ operations.
  This is the same rule as in [Chapter 1](01-What-Cryptanalysis-Is.md): a break is
  measured against what was promised, not against what anyone can afford.
- **Everything is public.** Attacks were posted to NIST's mailing list, the
  pqc-forum, often within days, and many came with code that anyone could run.
- **Practical breaks end careers.** A scheme whose key falls on a laptop is
  dropped at once; a scheme whose security margin shrinks is asked to raise its
  parameters, and the bigger keys may cost it the next round anyway.

Figure 16.1 shows the whole contest, from the call to the standards and the
second contest for signatures that is still running.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of the NIST post-quantum process from the 2016 call to the additional signatures round 3 in 2026, with the major breaks marked" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">Dec 2016</text>
<circle cx="92" cy="22" r="4" fill="currentColor"/>
<text x="106" y="27">NIST's call for proposals</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">Dec 2017</text>
<circle cx="92" cy="52" r="4" fill="currentColor"/>
<text x="106" y="57">82 received, 69 complete: round 1 begins</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">early 2018</text>
<circle cx="92" cy="82" r="4" fill="currentColor"/>
<text x="106" y="87">within weeks, a dozen broken or badly damaged</text>
<text x="78" y="117" text-anchor="end" font-weight="bold">Jan 2019</text>
<circle cx="92" cy="112" r="4" fill="currentColor"/>
<text x="106" y="117">26 go to round 2</text>
<text x="78" y="147" text-anchor="end" font-weight="bold">Jul 2020</text>
<circle cx="92" cy="142" r="4" fill="currentColor"/>
<text x="106" y="147">round 3: 7 finalists, 8 alternates</text>
<text x="78" y="177" text-anchor="end" font-weight="bold">Feb 2022</text>
<circle cx="92" cy="172" r="6" fill="currentColor"/>
<text x="106" y="177" font-weight="bold">Beullens: Rainbow key in 53 hours on a laptop</text>
<text x="78" y="207" text-anchor="end" font-weight="bold">Jul 2022</text>
<circle cx="92" cy="202" r="4" fill="currentColor"/>
<text x="106" y="207">Kyber, Dilithium, Falcon, SPHINCS+ selected; 4 KEMs to round 4</text>
<text x="78" y="237" text-anchor="end" font-weight="bold">Jul 2022</text>
<circle cx="92" cy="232" r="6" fill="currentColor"/>
<text x="106" y="237" font-weight="bold">Castryck and Decru: SIKE key in about an hour</text>
<text x="78" y="267" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="262" r="4" fill="currentColor"/>
<text x="106" y="267">40 additional signatures; KyberSlash timing leaks</text>
<text x="78" y="297" text-anchor="end" font-weight="bold">Aug 2024</text>
<circle cx="92" cy="292" r="4" fill="currentColor"/>
<text x="106" y="297">FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)</text>
<text x="78" y="327" text-anchor="end" font-weight="bold">Mar 2025</text>
<circle cx="92" cy="322" r="4" fill="currentColor"/>
<text x="106" y="327">HQC chosen as a code-based backup to ML-KEM</text>
<text x="78" y="357" text-anchor="end" font-weight="bold">Sep 2025</text>
<circle cx="92" cy="352" r="4" fill="currentColor"/>
<text x="106" y="357">SP 800-227: how to use a KEM</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">May 2026</text>
<circle cx="92" cy="382" r="4" fill="currentColor"/>
<text x="106" y="387">additional signatures: nine in round 3</text>
</svg>
<figcaption>Figure 16.1. The NIST post-quantum process as the attacker saw it. Most casualties came in the first year; the two famous breaks came in 2022, one in the last regular round and one weeks after the selections.</figcaption>
</figure>

The result, as of November 2026, is three published standards (ML-KEM in
FIPS 203, ML-DSA in FIPS 204, SLH-DSA in FIPS 205), a fourth on the way (FN-DSA,
from Falcon), a code-based backup KEM chosen in March 2025 (HQC), and a second
call for signatures in its third round. Along the way roughly half of the original
submissions were broken. This chapter is about how.

It is also about a quieter kind of attack. Most of what changed ML-KEM between
2017 and 2024 was not a break at all, but a series of attacks that shaved bits off
the estimates, found ways to exploit rare decryption failures, or read secret keys
out of the timing and power use of real code. Those attacks did not knock anything
out of the tournament; they set the parameters and the implementation rules of
the winners. And behind all of it stands the attacker the whole contest was
about, the one with a quantum computer, whose real costs §16.11 works out.

A word on where the full mathematics lives. The Post-quantum book on this site
builds every scheme in this chapter from the ground up, and its chapters on
multivariate signatures
([chapter 15](../post-quantum/index.md)) and
isogenies ([chapter 16](../post-quantum/index.md)) tell the Rainbow and
SIKE breaks with all their algebra. Here you get the attacker's summary: what was
exposed, what the attack did with it, what it cost, and what it means.

## 16.2 The tournament, round by round

*Level: beginner.*

**The call.** NIST's call of December 2016 set a deadline of 30 November 2017 and
asked for three kinds of scheme: public-key encryption, key encapsulation
mechanisms (KEMs) and digital signatures. Each submission had to include a written
specification, a reference implementation in C, known-answer test values, a
statement of the security level of each parameter set, and an analysis of known
attacks. The five security categories, defined by the cost of breaking AES or
finding a SHA-2 collision, made every claim checkable: a scheme claiming category 1
must cost at least as much to break as an AES-128 key search, by the best attack,
classical or quantum.

**Round 1 (December 2017 to January 2019).** NIST received 82 submissions and
just before Christmas 2017 posted the 69 it judged complete and proper. Some came from
established teams with decades of work behind them; others from small groups or
single authors, some of whom had never designed a cipher before. Daniel Bernstein,
Nadia Heninger, Paul Lou and Luke Valenta entered "post-quantum RSA", with
terabyte-sized keys, partly to make the point that a quantum computer does not
break RSA if the modulus is absurd enough.

The first breaks were posted within days. By NIST's own early count, about three
weeks after the submissions went public, a dozen schemes had been broken or
significantly attacked and five had been withdrawn. At NIST's first standardization
conference in April 2018 the list was longer. The round 1 report, published in
January 2019, explained each cut.

**Round 2 (January 2019 to July 2020).** NIST chose 26 candidates: 17 KEMs and 9
signatures. Several teams had merged (LAKE, LOCKER and Ouroboros-R became ROLLO; HILA5 and
Round2 became Round5), which is why counts of "round 2 schemes" differ between
sources by one or two. Round 2 broke fewer schemes outright but damaged more:
new algebraic attacks on rank-metric codes, a weak-key attack on LEDAcrypt, a
forgery shortcut for MQDSS, a structural attack on LUOV, and the first of Ward
Beullens' attacks on Rainbow.

**Round 3 (July 2020 to July 2022).** Seven finalists and eight alternates:

| | Finalists | Alternates |
|---|---|---|
| KEMs | Classic McEliece, CRYSTALS-Kyber, NTRU, SABER | BIKE, FrodoKEM, HQC, NTRU Prime, SIKE |
| Signatures | CRYSTALS-Dilithium, Falcon, Rainbow | GeMSS, Picnic, SPHINCS+ |

Of the fifteen, Rainbow fell in February 2022 and GeMSS was ruled out by attacks
on its parameters. On 5 July 2022 NIST announced its selections: Kyber for key
establishment, and Dilithium, Falcon and SPHINCS+ for signatures. Four KEMs went
to a fourth round: BIKE, Classic McEliece, HQC and SIKE.

**Round 4 (July 2022 to March 2025).** SIKE was broken within four weeks of the
announcement. On 11 March 2025 NIST chose HQC as the backup KEM, based on codes
rather than lattices, and did not select BIKE or Classic McEliece.

**The standards.** On 13 August 2024 NIST published FIPS 203 (ML-KEM, from Kyber),
FIPS 204 (ML-DSA, from Dilithium) and FIPS 205 (SLH-DSA, from SPHINCS+). FN-DSA,
from Falcon, and a standard for HQC were still in preparation in November 2026.
SP 800-227 (September 2025) gives the rules for using a KEM safely.

**The second tournament.** Because almost every surviving signature was
lattice-based, NIST opened a second call for additional signatures in 2022. It
received 50 submissions and in mid-2023 accepted 40 for a first round. The pattern
of 2017 repeated: within weeks several of the forty were broken outright, some
by the same people who had broken round 1 schemes six years earlier. Fourteen
went to round 2 in October 2024, among them UOV and MAYO (multivariate), SQIsign
(isogenies), HAWK (lattices) and several schemes built from zero-knowledge proofs.
Nine went to round 3 in May 2026.

**Counting the dead.** There is no official tally of broken schemes, because
"broken" is not a single thing: a key recovered on a laptop, a parameter set that
misses its category by ten bits, and a scheme that was withdrawn before anyone
finished the attack all count differently. The most careful public count is
Daniel Bernstein's 2023 paper "Quantifying risks in cryptographic selection
processes". He called a submission broken if its smallest parameter set is now
known to be easier to break than AES-128, which is exactly the tournament's
definition, and he gave three percentages: 48% of the 69 round 1 submissions are
broken by that standard; 25% of the 48 submissions that survived round 1 unbroken
were broken later; and 36% of the 28 submissions NIST selected for round 2 (his
count, before mergers) were broken. Those percentages turn back into counts with
a few lines of arithmetic.

**Code it.**

```python
# Bernstein's 2023 tally of the round-1 submissions, turned back into counts
total = 69
broken_now = round(0.48 * total)        # smallest parameters now easier than AES-128
survived_round1 = 48                    # not broken during round 1 itself
broken_in_round1 = total - survived_round1
broken_later = round(0.25 * survived_round1)
round2 = 28                             # his count of round-2 schemes, before mergers
print("broken during round 1:", broken_in_round1)
print("broken later, of the 48 survivors:", broken_later)
print("together:", broken_in_round1 + broken_later, "of", total, "=", broken_now)
print("of the 28 picked for round 2, broken by 2023:", round(0.36 * round2))
```

```
broken during round 1: 21
broken later, of the 48 survivors: 12
together: 33 of 69 = 33
of the 28 picked for round 2, broken by 2023: 10
```

The two routes to 33 agree, which is a small check that the percentages were read
correctly. Read the result plainly: about 21 of the 69 submissions were broken
during round 1 itself, about 12 more were broken later, and about 10 of the
schemes NIST judged good enough for round 2 have since fallen. Of the fifteen in
round 3, three have fallen by the same definition (Rainbow, GeMSS and SIKE), and
of the four in round 4, one (SIKE). Of the five algorithms NIST finally chose
(Kyber, Dilithium, Falcon, SPHINCS+ and HQC), none. Figure 16.2 draws the counts.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bar chart: of 69 round 1 submissions about 33 are now broken; of 28 in round 2, 10; of 15 in round 3, 3; of 4 in round 4, 1; of the 5 chosen, none" fill="currentColor" font-size="14">
<text x="120" y="40" text-anchor="end">round 1</text>
<rect x="130" y="24" width="400" height="24" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<rect x="130" y="24" width="191" height="24" fill="currentColor" opacity="0.75"/>
<text x="538" y="41">33 of 69</text>
<text x="120" y="90" text-anchor="end">round 2</text>
<rect x="130" y="74" width="162" height="24" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<rect x="130" y="74" width="58" height="24" fill="currentColor" opacity="0.75"/>
<text x="300" y="91">10 of 28</text>
<text x="120" y="140" text-anchor="end">round 3</text>
<rect x="130" y="124" width="87" height="24" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<rect x="130" y="124" width="17" height="24" fill="currentColor" opacity="0.75"/>
<text x="225" y="141">3 of 15: Rainbow, GeMSS, SIKE</text>
<text x="120" y="190" text-anchor="end">round 4</text>
<rect x="130" y="174" width="23" height="24" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<rect x="130" y="174" width="6" height="24" fill="currentColor" opacity="0.75"/>
<text x="161" y="191">1 of 4: SIKE</text>
<text x="120" y="240" text-anchor="end">chosen</text>
<rect x="130" y="224" width="29" height="24" fill="currentColor" opacity="0.2" stroke="currentColor"/>
<text x="167" y="241">0 of 5: Kyber, Dilithium, Falcon, SPHINCS+, HQC</text>
<rect x="130" y="270" width="16" height="14" fill="currentColor" opacity="0.75"/>
<text x="152" y="282">broken (smallest parameters easier than AES-128)</text>
</svg>
<figcaption>Figure 16.2. The tournament's casualties, counted with Bernstein's definition. Rounds 1 and 2 use his 2023 percentages; rounds 3 and 4 are counted by name. The filter worked: the rate of later breaks fell sharply at each stage, and nothing NIST chose has been broken.</figcaption>
</figure>

Two readings of these numbers are both true. The pessimistic one is that a third
of the schemes judged worth a second look in 2019 were broken afterwards, and that
one of them, SIKE, fell after it had reached the final round. A scheme's survival
of one round is weak evidence. The optimistic one is that the filter worked: the
deeper a scheme went, the less likely it was to fall, and the schemes that were
chosen had been through five years of open attack without a break. That is the
whole value of a tournament.

!!! note "Life story: the NIST post-quantum tournament"
    **Born:** December 2016, NIST's call; 69 complete submissions in December 2017 ·
    **Purpose:** to choose quantum-resistant KEMs and signatures by public attack ·
    **Helped:** FIPS 203, FIPS 204 and FIPS 205 (August 2024) and HQC (March 2025);
    about a third of the original field broken in public before anyone deployed it ·
    **Status:** running: FN-DSA and HQC drafts to come, the additional signatures in
    round 3 since May 2026

## 16.3 Early casualties, told briefly

*Level: beginner.*

The schemes that died in the first weeks of round 1 died of a small number of
diseases. A few examples show each, without the full mathematics.

**A message that leaks through the ciphertext: Guess Again.** Guess Again was a
public-key encryption scheme with an unusual design based on random guessing.
Within days of publication Lorenz Panny, then a PhD student in the Netherlands,
showed that its ciphertexts revealed the message bits with simple statistics, and
posted a short script that decrypted challenge ciphertexts without the key. The
scheme had no hard problem underneath it that anyone could name. That was the
first lesson of the tournament: a scheme whose security argument is "nobody sees
how to break it" lasts about as long as it takes someone to look.

**A signature you can forge for free: RaCoSS.** RaCoSS was a code-based signature.
Bernstein, Andreas Hülsing, Tanja Lange and Panny found that its verification
accepted many signatures for any message, and produced forgeries by hashing a few
messages until one passed. The flaw was in the verification equation, not the
code: the check was too weak to tie a signature to its message. It is the
post-quantum cousin of the signature malleability problems of
[Chapter 14](14-Attacks-on-Signatures-and-Nonces.md).

**Structure that was supposed to be hidden: Edon-K and others.** Edon-K, a KEM
built from binary Goppa-like codes with extra structure, was broken by Matthieu
Lequesne and Jean-Pierre Tillich, who recovered messages from its ciphertexts.
Several schemes in rank-metric and multivariate families fell the same way: the
designer added structure to make keys smaller, and the structure let an
attacker see through the disguise. McEliece's original 1978 design has survived
forty-eight years precisely because it hides very little structure; most attempts
to shrink its keys have been broken.

**Groups that are not as hard as they look: WalnutDSA.** WalnutDSA, from SecureRF,
was a signature built on braid groups, a family with a long history of proposals
and breaks. Ward Beullens and Simon Blackburn, and independently Matvei Kotov,
Anton Menshov and Alexander Ushakov, showed in 2018 how to forge signatures by
solving the underlying group problems far faster than claimed. Exotic algebra
attracts designers because it looks unlike everything that is known to fail; it
attracts attackers for the same reason.

**A missing check in the CCA transform: HILA5.** HILA5 was a ring-LWE KEM, a cousin
of the eventual winner. Its lattice problem was sound. Bernstein, Leon Groot
Bruinderink, Lange and Panny showed in 2018 that its error-correcting step and
the way it claimed security against chosen-ciphertext attacks did not fit
together: an attacker who could submit chosen ciphertexts and see whether
decapsulation succeeded could recover the secret key. HILA5 merged into Round5
for round 2. The lesson carried straight into the winners: the Fujisaki-Okamoto
transform that makes a lattice KEM secure against chosen ciphertexts must be
applied exactly, with re-encryption and a constant-time comparison (§16.8 and
§16.9).

**Lattice schemes with the wrong shape: Compact-LWE and others.** Several
lattice-flavored schemes made their own variants of LWE with special, compact
distributions. Jonathan Bootle and Mehdi Tibouchi, and separately Keita Xagawa, broke
Compact-LWE by showing its structure could be solved with lattice reduction in
small dimension. LWE is hard when its secret and error are random enough and its
dimension large enough; a variant that saves bytes by giving up either is a new,
unstudied problem.

**Round 2: damage, not death.** In round 2 the attacks became slower and more
technical. Magali Bardet, Pierre Briaud, Maxime Bros, Philippe Gaborit, Ray
Perlner, Daniel Smith-Tone, Jean-Pierre Tillich and Javier Verbel's 2020 algebraic
attacks on the rank decoding problem reduced the security of the rank-metric KEMs
ROLLO and RQC below their claims, and neither went on. Daniel Apon, Ray Perlner,
Angela Robinson and Paolo Santini found classes of weak keys in LEDAcrypt. Daniel
Kales and Greg Zaverucha showed that the five-pass Fiat-Shamir signatures in
MQDSS could be forged faster than claimed, by attacking the proof rather than the
equations, and the scheme had to grow. LUOV, an Oil and Vinegar variant that
saved space by working over a small subfield, fell to a "subfield differential"
attack by Jintai Ding, Joshua Deaton, Kurt Schmidt, Vishakha and Zheng Zhang.

**The diseases, listed.** Read across the casualties and five causes recur:

<div class="mars-steps" markdown>

1. **No hard problem.** The scheme's security was an absence of known attacks, not
   a reduction to anything studied.
2. **Structure added for size.** Compression, quasi-cyclic or subfield structure,
   extra layers: each saved bytes and opened a door.
3. **A new problem dressed as an old one.** A variant of LWE, of decoding or of a
   group problem that no one had attacked before the submission.
4. **A weak glue layer.** A sound core with a flawed verification, error
   correction or CCA transform around it.
5. **Optimistic parameters.** The attack was known; the designers underestimated
   its cost. These schemes survived by growing, if they could afford it.

</div>

The winners avoided all five, or survived by fixing the fifth. The rest of the
chapter follows the two schemes that avoided the first four for years and then
fell anyway.

!!! note "Life story: the round 1 quick kills"
    **Born:** December 2017 to April 2018, on the pqc-forum, often within days of
    publication · **Purpose:** to test each new scheme against its own claim ·
    **Helped:** removed about a dozen schemes in the first three weeks and about 21 in
    round 1; taught the field to ask "what is the hard problem?" first · **Status:**
    repeated in 2023, when several of the 40 additional signatures fell within weeks

## 16.4 SIKE: what the key exchange gave away

*Level: intermediate.*

**The scheme in the attacker's terms.** SIDH, the Supersingular Isogeny
Diffie-Hellman key exchange of David Jao and Luca De Feo (2011), and SIKE, the KEM
built on it and submitted to NIST in 2017, worked with **isogenies**: maps between
elliptic curves that respect the curves' addition. An isogeny is determined, up to
the target curve, by its kernel, the finite group of points it sends to zero; its
**degree** is the size of that kernel. A secret isogeny of degree $2^{216}$ can be
computed as a walk of 216 steps, each a map of degree 2, and the walk's path is
the secret. Book 1's [Chapter 22](../../book/22-Hash-and-Code-Based.md) has the
short version; the Post-quantum book's [chapter 16](../post-quantum/index.md)
builds isogenies by hand on a tiny curve.

The public data for SIKEp434, the category 1 parameter set, was:

- a prime $p = 2^{216} \cdot 3^{137} - 1$ and a fixed starting curve $E_0$ over
  $\mathbb{F}_{p^2}$, a special curve whose ring of endomorphisms (its maps to
  itself) is known;
- two pairs of points: $P_A, Q_A$ generating the points of order dividing
  $2^{216}$, and $P_B, Q_B$ generating those of order dividing $3^{137}$. Points of
  order dividing $N$ are called the **$N$-torsion**.

Alice picks a secret isogeny $\varphi_A$ of degree $2^{216}$ from $E_0$; Bob a
secret $\varphi_B$ of degree $3^{137}$. Bob publishes his target curve $E_B$
**and the images of Alice's torsion points under his secret map**,
$\varphi_B(P_A)$ and $\varphi_B(Q_A)$. Alice publishes the same for Bob. The
images are there so that each side can push its own kernel through the other's
isogeny and both arrive at the same final curve, whose $j$-invariant is the shared
secret. Without them, the two walks do not commute and there is no key exchange.

**What the attacker sees.** Ordinary isogeny problems give an attacker two curves
and ask for a path between them. SIDH gave more: the secret map's values on a
whole subgroup of $2^{216} \cdot 2^{216}$ points. Figure 16.3 shows the picture.
That is a great deal of information about a map whose degree is about $2^{217}$,
and cryptographers had worried about it from the start.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="SIDH public data: the starting curve E0, Bob's secret isogeny to E_B, and the published images of Alice's torsion basis; the attacker adds an auxiliary isogeny to a curve C and tests whether a two-dimensional isogeny from C times E_B splits" fill="currentColor" font-size="14">
<rect x="40" y="40" width="150" height="54" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="115" y="63" text-anchor="middle" font-weight="bold">E₀</text>
<text x="115" y="83" text-anchor="middle" font-size="12">P_A, Q_A (2²¹⁶-torsion)</text>
<rect x="440" y="40" width="170" height="54" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="63" text-anchor="middle" font-weight="bold">E_B (public)</text>
<text x="525" y="83" text-anchor="middle" font-size="12">φ_B(P_A), φ_B(Q_A) public</text>
<line x1="190" y1="67" x2="434" y2="67" stroke="currentColor" stroke-width="2"/>
<polygon points="440,67 430,62 430,72" fill="currentColor"/>
<text x="312" y="57" text-anchor="middle" font-weight="bold">φ_B, secret, degree 3¹³⁷</text>
<text x="312" y="87" text-anchor="middle" font-size="12">a walk of 137 steps of degree 3</text>
<rect x="40" y="196" width="150" height="54" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="115" y="219" text-anchor="middle" font-weight="bold">C</text>
<text x="115" y="239" text-anchor="middle" font-size="12">attacker's curve</text>
<line x1="115" y1="94" x2="115" y2="190" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="115,196 110,186 120,186" fill="currentColor"/>
<text x="125" y="140" font-size="12">γ, degree c = 2ᵃ − 3ᵇ</text>
<text x="125" y="156" font-size="12">(built from E₀'s known endomorphisms)</text>
<rect x="330" y="180" width="280" height="86" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor"/>
<text x="470" y="204" text-anchor="middle" font-weight="bold">Kani's test on C × E_B</text>
<text x="470" y="226" text-anchor="middle" font-size="12">a (2ᵃ, 2ᵃ)-isogeny of surfaces, computed</text>
<text x="470" y="242" text-anchor="middle" font-size="12">from the published torsion images:</text>
<text x="470" y="258" text-anchor="middle" font-size="12">it splits into two curves iff the guess is right</text>
<line x1="190" y1="223" x2="324" y2="223" stroke="currentColor" stroke-width="1.5"/>
<polygon points="330,223 320,218 320,228" fill="currentColor"/>
<line x1="525" y1="94" x2="525" y2="174" stroke="currentColor" stroke-width="1.5"/>
<polygon points="525,180 520,170 530,170" fill="currentColor"/>
</svg>
<figcaption>Figure 16.3. The attacker's view of SIDH. Everything above the line was public in SIKE; the torsion images on the right were the opening. The attacker builds an auxiliary isogeny γ from the special starting curve and uses Kani's theorem as a yes-or-no test on a guess about Bob's walk.</figcaption>
</figure>

**How big the search was meant to be.** The number of possible secret isogenies of
degree $\ell^e$ from a curve (cyclic kernels of order $\ell^e$) is
$(\ell + 1)\ell^{e-1}$. The best generic classical attack is a meet in the middle:
walk halfway from each end and look for a collision, about the square root of the
number of secrets. SIKE's designers priced it more carefully, with the van
Oorschot-Wiener parallel collision search of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)
and real memory costs, which is how a $2^{108}$ square root came to be counted as
category 1. The arithmetic is quick.

**Code it.**

```python
# SIKEp434: p = 2^216 * 3^137 - 1. How many secret isogenies are there,
# and what does each attack have to try?
import math

def is_probable_prime(n, rounds=20):
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71][:rounds]:
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

eA, eB = 216, 137
p = 2**eA * 3**eB - 1
print("p has", p.bit_length(), "bits; prime:", is_probable_prime(p))

def kernels(l, e):          # cyclic subgroups of order l^e in E[l^e]
    return (l + 1) * l**(e - 1)

for name, l, e in [("Alice (degree 2^216)", 2, eA), ("Bob (degree 3^137)", 3, eB)]:
    n = kernels(l, e)
    print(name, "secrets: 2^%.1f" % math.log2(n),
          " meet in the middle: 2^%.1f" % (math.log2(n) / 2))

# Castryck-Decru guess Bob's walk a few steps at a time; a correct guess is confirmed
# by a test that costs a chain of genus-2 isogenies, not by exhaustive search.
guesses = 4 + 3 * (eB - 1)  # worst case, one ternary step at a time
print("one-step-at-a-time guesses for Bob's key, at most:", guesses)
```

```
p has 434 bits; prime: True
Alice (degree 2^216) secrets: 2^216.6  meet in the middle: 2^108.3
Bob (degree 3^137) secrets: 2^217.6  meet in the middle: 2^108.8
one-step-at-a-time guesses for Bob's key, at most: 412
```

The last line is the whole story of the break in one number. If an attacker has a
test that says whether a guess of the *first few steps* of Bob's walk is right,
the search collapses from $2^{217}$ secrets to a few hundred guesses, three per
step, each followed by one run of the test. The test, of course, is the hard part.
It is also why the published torsion points matter: the test is built from them.

**Earlier warnings.** The torsion points had been attacked before 2022, in two
ways. In 2016 Steven Galbraith, Christophe Petit, Barak Shani and Yan Bo Ti showed
that if a party reuses a static SIDH key, an attacker who sends manipulated torsion
points and watches whether the key exchange succeeds recovers the key one bit at a
time. That is why SIKE wrapped SIDH in the Fujisaki-Okamoto transform: Bob checks
that Alice's points were honestly made by recomputing them. In 2017 Petit showed
that for unbalanced variants, where one side's degree is much larger than the
other's, the torsion images reveal the secret isogeny outright. SIKE's balanced
parameters were outside his attack's range. The community knew the points were
the weak spot; nobody saw how to use them on the real parameters.

**The challenge.** In 2021 Microsoft Research, whose researchers were among
SIKE's authors, offered prizes for breaking two small, deliberately weakened
instances: \$IKEp182 for \$5,000 and \$IKEp217 for \$50,000. The point was to
measure the cost of the best classical attack on real hardware. The smaller one
was solved in 2021 by Aleksei Udovenko and Giuseppe Vitto with a large, carefully
engineered collision search, which confirmed that the known generic attacks cost
what the designers said. By mid-2022 SIKE looked like the slow, small-key, well
understood alternate it had always been: its public keys and ciphertexts, about
330 bytes at category 1, were the smallest of any post-quantum KEM, and it was the
only candidate based on isogenies in round 4.

## 16.5 SIKE: an hour on one core

*Level: intermediate.*

On 30 July 2022, twenty-five days after NIST had sent SIKE to round 4, Wouter
Castryck and Thomas Decru of KU Leuven posted "An efficient key recovery attack on
SIDH (preliminary version)". Their Magma code broke the \$IKEp182 and \$IKEp217
challenges in about 4 and 6 minutes on a single core. A run on SIKEp434, the
category 1 parameter set, took about 62 minutes. Their reports for the higher
levels gave about 2 hours 19 minutes for SIKEp503, 8 hours 15 minutes for SIKEp610
and 20 hours 37 minutes for SIKEp751, the category 5 set. No quantum computer was
involved, and no large cluster: one core of an ordinary computer.

**What the attack used.** The attacker's summary has three pieces.

1. **A theorem from 1997.** Ernst Kani, studying when curves of genus two have
   maps to elliptic curves, proved a criterion about "isogeny diamonds": given two
   isogenies out of one curve with coprime degrees $d_1$ and $d_2$, there is a
   certain isogeny of the two-dimensional product of curves, of type
   $(N, N)$ with $N = d_1 + d_2$, and whether its target **splits** into a product
   of two elliptic curves (rather than being the Jacobian of a genus-two curve)
   tells you about the original pair. The isogeny can be computed in steps of
   degree $(2, 2)$ with Richelot's formulas from the nineteenth century, provided
   you know the original maps on the $N$-torsion.
2. **The torsion images.** In SIDH the attacker knows Bob's secret $\varphi_B$ on
   Alice's whole $2^{216}$-torsion. That is exactly the information Kani's
   construction needs when $N$ is a power of 2.
3. **An auxiliary isogeny.** To make the degrees add up to a power of 2, the
   attacker needs a second isogeny $\gamma$ out of the starting curve with degree
   $c = 2^a - 3^b$ for suitable $a$ and $b$. Because SIKE's starting curve $E_0$
   had a known endomorphism ring, such a $\gamma$ could be built directly. Since
   $3^{137}$ is a little larger than $2^{216}$, the attacker first guesses a few
   ternary steps of Bob's walk, which shortens what is left until $c$ is positive.

Put together, the test reads: guess the next step (three choices, or four at the
very first step), build the matching $(2^a, 2^a)$-isogeny from the torsion images
and $\gamma$, and see whether it splits. It splits exactly when the guess is
right. Repeat 137 times and Bob's whole walk is known. The chain of $(2,2)$-steps
is long but polynomial, which is why each guess costs seconds to minutes and the
whole attack an hour.

The Post-quantum book's [chapter 16](../post-quantum/index.md) works through
Kani's criterion and the gluing step with the algebra this summary leaves out.

**Making it unconditional.** The first attack relied on the special starting
curve. Within weeks Luciano Maino and Chloe Martindale posted an attack that does
not need it, and Damien Robert showed, using isogenies between abelian varieties
of dimension up to eight, that SIDH's key recovery runs in polynomial time for
**any** starting curve. Later implementations, including one in SageMath by Rémy
Oudompheng and Giacomo Pope, brought SIKEp751 well under the original twenty
hours. The SIKE team itself soon acknowledged that SIKE was insecure and should
not be used. No patch to the parameters can help: the attack is polynomial, so
bigger primes only slow it down polynomially.

!!! note "Life story: the Castryck-Decru attack"
    **Born:** 30 July 2022, Wouter Castryck and Thomas Decru (KU Leuven), from Ernst
    Kani's 1997 theorem on genus-two curves · **Purpose:** recover an SIDH secret
    isogeny from the published torsion-point images · **Helped:** SIKEp434 in about
    62 minutes on one core, SIKEp751 in about 21 hours; the \$IKEp217 challenge in
    about 6 minutes; extended by Maino-Martindale and by Robert to any starting
    curve in polynomial time · **Status:** final for SIDH and SIKE; the same
    mathematics is now used to build isogeny schemes

**Why it did not touch other isogeny schemes.** The attack needs one thing: the
values of the secret isogeny on a large torsion subgroup. Schemes that never
publish such values are not exposed.

- **CSIDH** (Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost
  Renes, 2018; the same Castryck) uses a commutative group action on curves defined
  over $\mathbb{F}_p$. Public keys are single curves, nothing more, so there is
  nothing for Kani's test to use. CSIDH has its own, older debate: a quantum
  attack (Kuperberg's algorithm for the hidden shift problem) is subexponential,
  and how large its parameters must be for category 1 is disputed. That is a
  matter of sizing, not of a break.
- **SQIsign** (Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and
  Benjamin Wesolowski, 2020) is a signature whose public key is a curve and whose
  signatures reveal a carefully randomized isogeny, again without exposing the
  secret map on torsion points. SQIsign was in round 2 of the additional
  signatures and is in round 3 as of November 2026. Its newer versions use the
  higher-dimensional isogenies of the attack *constructively*, to make signing and
  verifying faster: the weapon became a tool within two years.
- **Repaired SIDH.** Variants that mask the torsion images (for example M-SIDH, by
  Tako Boris Fouotsa, Tomoki Moriya and Christophe Petit, 2023) resist the attack
  but need much larger parameters, which removes SIDH's one advantage.

**What the attacker should take from it.** SIKE was not a careless scheme. It had
a decade of study, a large and respected team, a real-world experiment with
Google and Cloudflare in 2019 that ran it in TLS, and prize challenges that
confirmed its costs. The flaw was in a place everyone had pointed at (the torsion
points), and the tool came from a neighboring field (the arithmetic of abelian
surfaces) that few cryptographers read. The break is a reminder that "studied for
ten years" is not the same as "studied with every relevant idea". It is also
the clearest case for the tournament's rule of choosing backups from different
families: SIKE's fall cost nothing, because nothing depended on it.

## 16.6 Rainbow: a weekend on a laptop

*Level: intermediate.*

**The family.** A multivariate signature's public key is a system of $m$
quadratic equations in $n$ variables over a small finite field. A signature is a
solution: values for the variables that make the equations equal the hash of the
message. Solving random quadratic systems is NP-hard and, as far as anyone knows,
hard for quantum computers too; the signer can do it because the public system is
a disguised copy of an easy one. The family's attraction is speed and very short
signatures; its cost is public keys of tens to hundreds of kilobytes.

The easy system behind Rainbow goes back to Jacques Patarin's **Oil and Vinegar**
(1997). The variables are split into $v$ "vinegar" and $o$ "oil" variables, and
the central equations contain no products of two oil variables. Fix the vinegar
at random and the equations become *linear* in the oil, which the signer solves.
The public key hides this with a secret change of variables $S$, and the attacker
sees only a generic-looking system. Aviad Kipnis and Adi Shamir broke the
balanced version ($v = o$) in 1998; the **unbalanced** version, UOV (Kipnis,
Patarin and Louis Goubin, 1999), with more vinegar than oil, has survived to this
day.

The secret has a geometric shape that every attack on the family uses. The oil
variables, pulled back through $S$, form a subspace $O$ of dimension $o$ on which
**every public equation vanishes**: set the vinegar to zero, and with no oil-times-oil
terms the central equations are identically zero. Finding $O$ is equivalent to
finding the key. The toy below builds a tiny UOV key and shows the shape.

**Code it.**

```python
# A toy Oil and Vinegar key over GF(31): 4 vinegar, 2 oil variables, 2 equations.
# The secret is a change of variables S; the public key is the central map after S.
import random
q, v, o = 31, 4, 2
n = v + o
random.seed(16)

def rand_matrix(rows, cols):
    return [[random.randrange(q) for _ in range(cols)] for _ in range(rows)]

def central():                       # upper-triangular form, no oil*oil terms
    F = rand_matrix(n, n)
    for i in range(n):
        for j in range(n):
            if j < i or (i >= v and j >= v):
                F[i][j] = 0
    return F

def quad(F, x):
    return sum(F[i][j] * x[i] * x[j] for i in range(n) for j in range(n)) % q

def inverse(M):                      # Gauss-Jordan mod q; None if singular
    A = [row[:] + [int(i == j) for j in range(n)] for i, row in enumerate(M)]
    for c in range(n):
        r = next((r for r in range(c, n) if A[r][c]), None)
        if r is None:
            return None
        A[c], A[r] = A[r], A[c]
        inv = pow(A[c][c], q - 2, q)
        A[c] = [a * inv % q for a in A[c]]
        for r in range(n):
            if r != c and A[r][c]:
                f = A[r][c]
                A[r] = [(a - f * b) % q for a, b in zip(A[r], A[c])]
    return [row[n:] for row in A]

Fs = [central() for _ in range(o)]
while True:
    S = rand_matrix(n, n)
    Sinv = inverse(S)
    if Sinv:
        break

def apply(M, x):
    return [sum(M[i][j] * x[j] for j in range(n)) % q for i in range(n)]

def public(x):                       # P(x) = F(S x): what everyone can evaluate
    y = apply(S, x)
    return [quad(F, y) for F in Fs]

# The secret oil space: vectors that S sends to (0,0,0,0,a,b)
def oil_vector(a, b):
    return apply(Sinv, [0] * v + [a, b])

print("P at 3 random points:     ", [public([random.randrange(q) for _ in range(n)]) for _ in range(3)])
print("P at 3 points of the oil: ", [public(oil_vector(random.randrange(q), random.randrange(q))) for _ in range(3)])
```

```
P at 3 random points:      [[29, 3], [25, 13], [30, 1]]
P at 3 points of the oil:  [[0, 0], [0, 0], [0, 0]]
```

Random points give random outputs; every point of the hidden oil space gives zero.
An attacker who finds one nonzero vector of $O$ is most of the way to the key, and
every serious attack on UOV and Rainbow is a clever way to find such a vector
faster than solving the equations blindly. In plain UOV, with enough vinegar, no
such way is known.

**Rainbow's extra layer.** Jintai Ding and Dieter Schmidt's Rainbow (2005) stacked
two Oil and Vinegar layers. The first layer's equations use the vinegar and the
first oil set; the second layer treats all of those as vinegar and adds a second
oil set. For the round 2 category 1 parameters this meant 32 vinegar variables,
two oil sets of 32, so 96 variables and 64 equations over the field of 16
elements. The layers let Rainbow use fewer variables than UOV for the same
security, so its public keys (about 160 kilobytes) and signatures (66 bytes) were
smaller. Rainbow became a round 3 finalist in 2020.

The layers also left more shape for an attacker. There is now a nested pair of
hidden subspaces: the second oil space $O_2$, of dimension 32, on which the whole
public system vanishes, inside a larger space $O_1$ on which the first layer's
equations vanish. And the first layer does not see the second oil variables at
all, which puts linear constraints on how $O_2$ interacts with every other vector.
Figure 16.4 draws the structure.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Rainbow's two layers: layer 1 equations use the vinegar and first oil variables; layer 2 uses all variables with no products of second oil variables; the second oil space is where every equation vanishes" fill="currentColor" font-size="14">
<text x="20" y="34" font-weight="bold">variables (96)</text>
<rect x="160" y="18" width="150" height="26" fill="currentColor" opacity="0.15" stroke="currentColor"/>
<text x="235" y="36" text-anchor="middle">vinegar v = 32</text>
<rect x="310" y="18" width="150" height="26" fill="currentColor" opacity="0.35" stroke="currentColor"/>
<text x="385" y="36" text-anchor="middle">oil o₁ = 32</text>
<rect x="460" y="18" width="150" height="26" fill="currentColor" opacity="0.6" stroke="currentColor"/>
<text x="535" y="36" text-anchor="middle" font-weight="bold">oil o₂ = 32</text>
<text x="20" y="92" font-weight="bold">layer 1 (32 eqs)</text>
<rect x="160" y="74" width="300" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="92" text-anchor="middle">uses v and o₁; no o₁ × o₁</text>
<text x="535" y="92" text-anchor="middle" font-size="12">does not see o₂</text>
<text x="20" y="142" font-weight="bold">layer 2 (32 eqs)</text>
<rect x="160" y="124" width="450" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="142" text-anchor="middle">uses all 96; no o₂ × o₂</text>
<line x1="535" y1="44" x2="535" y2="184" stroke="currentColor" stroke-dasharray="4 4"/>
<rect x="420" y="186" width="210" height="44" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor"/>
<text x="525" y="205" text-anchor="middle" font-weight="bold">O₂: all 64 equations vanish</text>
<text x="525" y="222" text-anchor="middle" font-size="12">and layer 1 constrains it linearly</text>
<rect x="20" y="186" width="370" height="90" rx="6" fill="none" stroke="currentColor"/>
<text x="34" y="208" font-weight="bold">Beullens 2022, in three moves</text>
<text x="34" y="230" font-size="13">1. use the layer-1 constraints to cut the search space</text>
<text x="34" y="250" font-size="13">2. solve a small quadratic system: one vector of O₂</text>
<text x="34" y="270" font-size="13">3. linear algebra and older attacks give the rest</text>
</svg>
<figcaption>Figure 16.4. Rainbow's structure from the attacker's side (round 2 category 1 sizes). The second layer made signatures cheaper and left a hidden subspace O₂ with extra linear constraints on it; plain UOV has a hidden subspace too, but without the second set of constraints.</figcaption>
</figure>

**Beullens' attacks.** Ward Beullens, then at IBM Research Zurich, attacked
Rainbow twice. In late 2020 he posted "Improved cryptanalysis of UOV and Rainbow"
(EUROCRYPT 2021), with two new attacks: an **intersection attack**, which looks
for a vector lying in the hidden oil space of several public equations at once,
and a **rectangular MinRank attack**, which phrases part of the key recovery as a
low-rank problem (§16.7). Together they cut Rainbow's estimated security below its claims
for every parameter set, though not to anything practical. The Rainbow team adjusted parameters
and argued about the costs.

In February 2022 he posted "Breaking Rainbow takes a weekend on a laptop". Its
**simple attack** uses the layer structure directly. The linear constraints that
the first layer puts on $O_2$ shrink the space in which a vector of $O_2$ must lie;
inside that smaller space, the condition "all public equations vanish" becomes an
overdetermined system of quadratic equations in far fewer variables than the
original problem. Such systems are solved by linearization methods (XL, or a
Gröbner basis computation), and their cost falls steeply as the ratio of
equations to variables grows. Once one vector of $O_2$ is found, the rest of
$O_2$ follows by linear algebra, and what remains is a smaller, nearly balanced
Oil and Vinegar system that the 1998 Kipnis-Shamir attack handles.

On the round 2 category 1 parameters the attack recovered the secret key in, on
average, 53 hours on a standard laptop. The paper also showed that its attacks
beat the previously known attacks for every Rainbow parameter set submitted to
NIST. Repairing Rainbow would have meant parameters so large that it lost its
advantage over plain UOV. NIST did not select it. The Post-quantum book's
[chapter 15](../post-quantum/index.md) works
the attack's algebra in full.

!!! note "Life story: Beullens' attack on Rainbow"
    **Born:** February 2022 (IACR ePrint 2022/214; CRYPTO 2022), Ward Beullens,
    after his 2020 intersection and rectangular MinRank attacks · **Purpose:**
    recover Rainbow's secret key through the second layer's hidden subspace ·
    **Helped:** a category 1 key (round 2 parameters) in about 53 hours on a
    laptop; Rainbow's removal from the standard · **Status:** final for Rainbow;
    plain UOV and Beullens' own MAYO are unaffected and in NIST's additional
    signatures

**What it said about the multivariate family.** Two things, pulling in
opposite directions.

- **The core held.** The simple attack exploits Rainbow's second layer. Plain
  UOV, with its single oil space and $v$ about twice $o$, has no such constraints
  to use, and its security after Beullens is close to what it was in 1999. UOV
  and MAYO (Beullens, 2021, a UOV variant with smaller public keys that "whips
  up" a small oil space into a larger one) were both in the additional signatures'
  round 2, and the multivariate family has continued there.
- **Every shortcut is suspect.** Rainbow was the third major multivariate design to
  fall to its efficiency trick, after Matsumoto-Imai (broken by Patarin in 1995)
  and balanced Oil and Vinegar (Kipnis and Shamir, 1998); HFE and its variants
  followed (§16.7). The family's record is that the basic hard problem (solving
  random quadratic systems) has never been touched, while nearly every clever
  trapdoor built on it has. A multivariate scheme earns trust in proportion to how
  little structure it adds to UOV.

## 16.7 GeMSS and the MinRank attacks

*Level: intermediate.*

**The problem.** Several of the tournament's casualties fell to one problem that
most people outside the field have never heard of. **MinRank**: given matrices
$M_0, M_1, \dots, M_k$ of the same size over a field, and a target rank $r$, find
coefficients $\lambda_1, \dots, \lambda_k$ such that

$$\operatorname{rank}\Big(M_0 + \sum_{i=1}^{k} \lambda_i M_i\Big) \le r.$$

In general it is NP-hard. But a trapdoor often leaves a combination of the public
matrices of unusually low rank, and then the attacker's job is a MinRank instance
with small $r$, which can be far easier than the problem the scheme was supposed
to rest on. A quadratic equation is a symmetric matrix (its "quadratic form"), so
every multivariate public key is a list of matrices; a code in the rank metric is a
space of matrices; so MinRank appears wherever those two families do.

**How MinRank is solved.** The classical methods are two. The **kernel method**
guesses vectors in the kernel of the low-rank matrix: if the target has rank $r$
in dimension $n$, a random vector lies in its kernel with probability about
$q^{-r}$, and each correct guess gives linear equations in the $\lambda_i$. The
**minors method** writes down the condition that every $(r+1) \times (r+1)$
minor of the combination vanishes, a large system of polynomial equations in the
$\lambda_i$, and solves it. Kipnis and Shamir's 1999 attack on HFE used a third
modeling with extra unknowns for the kernel. In 2020 Bardet, Bros, Cabarcas,
Gaborit, Perlner, Smith-Tone, Tillich and Verbel introduced the **Support-Minors
modeling**, which combines the two ideas in a way that makes the polynomial systems
much smaller; it cut the cost of rank-decoding attacks enough to end ROLLO and RQC,
and it fed directly into the attacks on Rainbow and GeMSS.

**HFE and GeMSS.** Patarin's **Hidden Field Equations** (HFE, 1996) hides a single
polynomial of low degree $D$ over a large extension field $\mathbb{F}_{q^n}$, which
the signer can solve with standard root finding. Viewed over the small field $\mathbb{F}_q$
it becomes $n$ quadratic equations in $n$ variables. The low degree is the
trapdoor, and it is also the weakness: as a quadratic form over the big field, the
secret polynomial has rank only about $\log_q D$. Kipnis and Shamir saw in 1999
that recovering it is a MinRank problem with that small target rank. Patarin's
answer was to perturb the system: the **minus** modifier removes some public
equations, and the **vinegar** modifier adds extra variables that the signer
guesses. The result, HFEv-, was the basis of Quartz (2001) and of **GeMSS** (Great
Multivariate Short Signature), by A. Casanova, Jean-Charles Faugère, Gilles
Macario-Rat, Patarin, Ludovic Perret and Jocelyn Ryckeghem, a round 3 alternate.
GeMSS had tiny signatures, a few dozen bytes, and very large public keys, around
350 kilobytes at category 1.

**The attacks.** Chengdong Tao, Albrecht Petzoldt and Jintai Ding's "Efficient
key recovery for all HFE signature variants" (CRYPTO 2021) is the attacker's
summary in its title. They modeled HFEv- key recovery as a MinRank problem with
minors and showed that the minus modifier does not raise the security of HFE-type
schemes at all, while vinegar raises it only by a polynomial factor. Their
conclusion was that GeMSS's proposed parameters were not as secure as claimed.
John Baena, Pierre Briaud, Daniel Cabarcas, Ray Perlner, Daniel Smith-Tone and
Javier Verbel's "Improving Support-Minors rank attacks: applications to GeMSS and
Rainbow" (CRYPTO 2022) pushed the cost down again. NIST's round 3 report gave the
attacks as the reason GeMSS was not chosen. Like Rainbow, GeMSS could only be
saved by much larger parameters, and its public keys were already among the largest
in round 3.

!!! note "Life story: the MinRank attacks"
    **Born:** 1999, Kipnis and Shamir on HFE; the minors and kernel methods of the
    early 2000s; Support-Minors in 2020 (Bardet and seven co-authors) · **Purpose:**
    find a hidden low-rank combination of public matrices · **Helped:** ended HFE
    with practical parameters, the rank-metric KEMs ROLLO and RQC (2020), GeMSS
    (Tao-Petzoldt-Ding 2021, Baena et al. 2022), and part of Rainbow's margin
    (Beullens 2020) · **Status:** the standard first test for any multivariate or
    rank-metric design

**The general lesson for attackers.** MinRank is what "structure added for size"
(§16.3) looks like in linear algebra. A trapdoor needs the secret object to be
special, and "special" for a matrix usually means low rank. Before trusting a new
multivariate or rank-metric scheme, ask what the lowest-rank combination of its
public matrices is, and what Support-Minors costs to find it. The additional
signatures' designers now include that calculation in their submissions, and
the round 2 and round 3 reports check it.

## 16.8 Lattices: attacks that moved the parameters

*Level: expert.*

No lattice scheme that NIST chose has been broken. But the lattice candidates were
the most attacked in the tournament, because they were the most likely to win, and
the attacks changed them. This section is about attacks that do not recover a key
from a real parameter set but move the line that says how big the parameters must
be. [Chapter 15](15-Lattices-as-a-Weapon.md) explains the lattice attacks
themselves; the Post-quantum book's
[chapter 6](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md) builds the
estimator. Here is the attacker's summary of how the numbers are made and where
they were contested.

**How a lattice security claim is computed.** An LWE instance with secret $s$ and
small error $e$ is attacked by embedding it in a lattice where $(s, e)$, or
something built from it, is an unusually short vector, and running the BKZ
reduction algorithm with some block size $\beta$ until that vector appears. Two
attack shapes dominate:

- the **primal** attack (unique-SVP): build a lattice in which the secret is the
  shortest vector, and find it with BKZ;
- the **dual** attack: find many short vectors in the dual lattice and use them as
  distinguishers, scoring guesses for part of the secret by how strongly the
  short vectors correlate with the samples.

Each gives a required block size $\beta$. The cost of one call to the inner SVP
solver in dimension $\beta$ is then estimated with the best sieving algorithm:
about $2^{0.292\beta}$ operations classically and $2^{0.265\beta}$ with quantum
search, ignoring lower-order terms. This "core-SVP" number is the yardstick that
all lattice submissions used. It is deliberately conservative: it counts one SVP
call where BKZ makes many, and it ignores memory. Kyber's round 3 specification,
for instance, gave Kyber-512 a classical core-SVP cost of about $2^{118}$, below AES-128's
$2^{128}$ on its face, and then argued from more detailed gate counts and memory
costs that the real cost of the attack was well above category 1's floor, with a
stated uncertainty.

**The dual attack debate.** In 2021 Qian Guo and Thomas Johansson published faster
dual attacks using fast Fourier transforms to score many guesses at once. In April
2022 MATZOV, a cryptography unit of the Israel Defense Forces, published "Report on
the Security of LWE: Improved Dual Lattice Attack", which combined these ideas and
estimated that Kyber, Saber and Dilithium were a few bits weaker than their
designers' figures; for the smallest parameter sets the margin above category 1
became thin. Then Léo Ducas and Ludo Pulles asked, in a CRYPTO 2023 paper titled
"Does the dual-sieve attack on learning with errors even work?", whether the
statistical heuristic behind those estimates holds. They showed that the
independence assumption used to predict how well the dual distinguisher works
contradicts experiments and theory in the regime that mattered, so the claimed
improvements might not be real. Later papers proposed corrected dual attacks with
better-founded analyses; as of November 2026 the primal attack remains the basis
of most headline estimates, and the dual attack's exact power is still argued. The
debate moved claimed costs by a few bits either way, never by enough to break
anything.

**Counting Kyber-512.** In late 2023 Bernstein argued in public that NIST had
miscalculated Kyber-512's security by combining the costs of the attack's
steps incorrectly; NIST replied that its assessment rested on
the memory and access costs of the attack, which core-SVP ignores. The argument
was about whether Kyber-512 sits just above or just below category 1, not about a
practical attack. FIPS 203 kept ML-KEM-512 and recommends ML-KEM-768 as the
default parameter set, which leaves a margin either way.

**A quantum scare.** On 10 April 2024 Yilei Chen posted a paper claiming a
polynomial-time quantum algorithm for LWE with certain parameters. Had it held and
been extended, it would have broken the foundation of ML-KEM and ML-DSA against a
quantum attacker. The parameters it handled were not those of the standards, but
the field held its breath. About a week later Chen added a note: Hongxun Wu and Thomas
Vidick had found a bug in a step of the algorithm that he did not know how to fix.
The claim was withdrawn. The episode is a model of how breaks are checked in
public: within days, dozens of experts read the paper line by line.

!!! note "Life story: Chen's quantum LWE algorithm"
    **Born:** 10 April 2024, Yilei Chen, IACR ePrint · **Purpose:** to solve LWE
    in quantum polynomial time for some parameters · **Helped:** a public
    stress test of the lattice assumption; a bug found by Hongxun Wu and Thomas
    Vidick within days · **Status:** withdrawn; no quantum algorithm is
    known that solves LWE much faster than the classical attacks plus Grover-type
    speedups

**Decryption failures.** ML-KEM, like most lattice and some code-based KEMs, is
**not perfectly correct**: with a tiny probability, decapsulation produces a key
different from the one the sender encapsulated. Failures happen when the
accumulated noise, roughly the inner product of the errors with the secret, is
unusually large, so each failure is a statement about the secret key. An attacker
who can submit ciphertexts and learn which ones fail collects linear inequalities
on $s$ and can, with enough of them, recover it.

The precedent came from codes. In 2016 Qian Guo, Thomas Johansson and Paul
Stankovski recovered QC-MDPC keys (the family behind BIKE) from the pattern of
decoding failures, a **reaction attack**, and showed that a code-based KEM must
have a failure rate small enough to prove, not just to observe. For lattices,
Jan-Pieter D'Anvers and co-authors developed **failure boosting**: precompute,
offline, ciphertexts more likely than average to fail (under the Fujisaki-Okamoto
transform the attacker cannot choose the noise directly, but can try many random
messages and keep the "weak" ciphertexts), then submit only those. Their 2020
paper "(One) failure is not an option", with Mélissa Rossi and Fernando Virdia,
added **directional** failure boosting: once one failure is found, it points
towards the secret, and later failures come much faster.

The defense is arithmetic. ML-KEM's failure probabilities are about $2^{-139}$,
$2^{-164}$ and $2^{-174}$ for its three parameter sets. With NIST's assumption of
at most $2^{64}$ decapsulation queries per key, an attacker cannot expect to see
even one failure, and failure boosting does not change that by enough. Schemes
with failure rates of $2^{-60}$ or $2^{-80}$, as several round 1 and round 2
candidates had, were exposed, and some raised their parameters or added error
correction. The rule that came out of it is in every lattice KEM now: the failure
rate must be far below $2^{-128}$, and the analysis must be done on the exact noise
distribution, not a Gaussian approximation.

## 16.9 Implementations: side channels and faults on ML-KEM

*Level: expert.*

The lattice standards were never broken on paper, but their code was. This is the
attacker's summary; Chapter 17 teaches
the side-channel methods themselves, and the Post-quantum book's
[chapter 17](../post-quantum/index.md) is the
defender's guide.

**Why ML-KEM is a side-channel target.** Decapsulation in ML-KEM does three things
with the secret key on every ciphertext: decrypts to a message $m'$, re-encrypts
$m'$ to get a ciphertext $c'$, and compares $c'$ with the received $c$, returning
a pseudorandom key if they differ (implicit rejection). Each step can leak. Worse,
the Fujisaki-Okamoto re-encryption turns a tiny leak into a powerful oracle: an
attacker who sends a modified ciphertext and learns, from timing or power, whether
the decrypted message was the original one has a **plaintext-checking oracle**,
and a few thousand such answers recover the secret key. Prasanna Ravi, Sujoy Sinha
Roy, Anupam Chattopadhyay and Shivam Bhasin showed in 2020 that this generic attack
applies to essentially every CCA-secure lattice KEM in the competition, given a
side channel that distinguishes one bit of the decrypted message.

**Timing in the comparison.** In 2020 Qian Guo, Thomas Johansson and Alexander
Nilsson attacked FrodoKEM's reference implementation, whose final comparison of
$c$ and $c'$ used a `memcmp` that stopped at the first difference. The time it
took told the attacker how many leading bytes matched, which was enough for a
plaintext-checking oracle and a full key recovery. The fix is a constant-time
comparison, now required everywhere.

**KyberSlash (2023-24).** In December 2023 researchers found that the reference
implementation of Kyber, and many libraries derived from it, divided by the
modulus $q = 3329$ in two places where the dividend depended on secret data: when
converting a polynomial to the message and when compressing. On many processors,
especially small Arm cores, division takes a variable number of cycles depending on
its inputs, and compilers do not always turn division by a constant into a
multiplication. The two leaks were named KyberSlash1 and KyberSlash2. The
researchers who studied them (a team including Daniel Bernstein, Karthikeyan
Bhargavan, Shivam Bhasin, Anupam Chattopadhyay, Tee Kiah Chia, Matthias
Kannwischer, Franziskus Kiefer, Thales Paiva, Prasanna Ravi and Goutam Tamvada)
demonstrated key recovery from the timing on real Arm boards. The fix replaced the
divisions with multiplications and shifts; maintainers of more than a dozen
libraries patched within weeks.

!!! note "Life story: KyberSlash"
    **Born:** December 2023, found in Kyber's reference code and its descendants;
    paper 2024 · **Purpose:** recover ML-KEM secret keys from the timing of a
    secret-dependent division by $q$ · **Helped:** key recovery demonstrated on Arm
    boards; patches across most Kyber libraries · **Status:** fixed in maintained
    code; the test for it (no secret-dependent division) is now part of every audit

**Clangover (2024).** In June 2024 Antoon Purnal showed that a correct,
constant-time C function in Kyber's reference code became variable-time after
compilation: certain versions of the Clang compiler, at common optimization
levels, recognized a bit-masking idiom and turned it back into a secret-dependent
branch. He demonstrated key recovery from the timing in minutes on a local
machine. The lesson was not new, but it was sharp: constant time is a property of
the machine code, not the source, and must be checked on the binary.

**Power and electromagnetic leakage.** On microcontrollers, the attacker can
measure power. Unprotected ML-KEM falls to template and correlation attacks on
its arithmetic (the number-theoretic transform, the message decoding) with few
traces. The standard defense is **masking**: splitting the secret into random
shares that are processed separately. Masking lattice KEMs is expensive because
compression and decoding are not linear. In 2022-23 Elena Dubrova's group at KTH
(Rui Wang, Kalle Ngo, Joel Gärtner and Dubrova) used deep-learning models trained
on one device to recover messages, and then keys, from a fifth-order masked Kyber
implementation on another, by attacking the moment the shares are recombined.
Higher-order masking slows these attacks; it has not ended them.

**Faults.** If the attacker can disturb the device, for example with a voltage
glitch or a laser, the simplest attack is to skip the re-encryption check, which
removes CCA security and reopens the chosen-ciphertext attacks of the 1990s. More
subtle are **ineffective fault** attacks, such as Peter Pessl and Lukas Prokop's
2021 attack on CCA-secure lattice KEMs: inject a fault that changes a
decoder value, and observe whether the output is still correct; whether the fault
mattered reveals a coefficient's range. Jeroen Delvaux's "Roulette" (2022) extended
such attacks to masked Kyber. For signatures, Leon Groot Bruinderink and Peter
Pessl showed in 2018 that a single fault during *deterministic* lattice signing
(as in round 1 Dilithium) gives two signatures with the same randomness and leaks
the key, one reason FIPS 204 makes hedged (randomized) signing the default.

**Codes too.** HQC and BIKE implementations leaked their keys in 2022 through
timing in rejection sampling, the step that draws random positions for errors:
Guo, Clemens Hlauschek, Johansson, Norman Lahr, Nilsson and Robin Leander
Schröder's "Don't reject this" showed that the number of rejected samples depended
on the secret seed and could be measured remotely. Both were fixed before HQC's
selection.

**The pattern.** Every scheme that survived the mathematical tournament then had
to survive an implementation tournament, and none came through with its first
code intact. The defender's response has been constant-time rules checked on
binaries, formally verified implementations, masking for hardware that faces
physical attackers, and known-answer and fault tests. The attacker's lesson is
that a new scheme's first several years of code are the soft target.

## 16.10 Hash-based signatures: robust, except the state

*Level: intermediate.*

**Why they held.** A hash-based signature is secure if the hash function is: its
security reduces to properties like second-preimage resistance of SHA-256 or
SHAKE, which have been attacked for decades by everyone in
[Chapter 9](09-Breaking-Hash-Functions.md). There is no algebraic trapdoor for an
attacker to unpick. SPHINCS+ went through the whole tournament without a
structural break, and became SLH-DSA in FIPS 205. Its cost is size and speed:
signatures of about 8 to 50 kilobytes depending on the parameter set.

The attacks on SPHINCS+ during the tournament were real, and instructive because
they were small:

- **Multi-target attacks.** A hash-based scheme computes enormous numbers of hashes
  under one key. An attacker who wants a second preimage for *any* of $2^{60}$ hash
  outputs gets a $2^{60}$ speedup over attacking one. SPHINCS+ and SLH-DSA defeat
  this by tweaking every hash call with a public seed and a unique address, so that
  no two calls are the same function. This is design, not repair; the
  round 3 argument over whether extra "robust" tweaks were needed ended with
  FIPS 205 standardizing only the leaner "simple" form.
- **SHA-256 at the higher levels.** In 2022 Ray Perlner, John Kelsey and David
  Cooper found that the SHA-256 instances of SPHINCS+ at the highest category fell
  short, because SHA-256's internal state is only 256 bits and some of the
  scheme's hashing could be attacked through the state. FIPS 205 uses SHA-512 for
  those calls.
- **Faults.** Aymeric Genêt, Matthias Kannwischer, Hervé Pelletier and Andrew
  McLauchlan (2018), and Laurent Castelnovi, Ange Martinelli and Thomas Prest
  (2018), showed that a fault during SPHINCS signing can make one Winternitz key
  sign two different values, which allows a forgery: the same failure as the
  state reuse below, caused by a glitch. Devices open to fault attacks should sign
  twice and compare, or verify before releasing.

**The one real danger: the state.** The stateful schemes, XMSS (RFC 8391) and LMS
with its multi-tree form HSS (RFC 8554), approved by SP 800-208 in 2020, are
smaller and faster than SLH-DSA because they use each one-time key exactly once,
tracked by a counter. If the counter ever goes backwards (a virtual machine
restored from a snapshot, a key copied to a second signing server, a backup
restored after a crash) one one-time key signs two different messages, and the
security argument is gone.

What the attacker gains is easy to see on Winternitz one-time signatures, the
building block of both. Each chunk of the message digest is a number $d$ from 0 to
15; the signature reveals the secret for that chain hashed $d$ times, and the
verifier hashes it the remaining $15 - d$ times to reach the public key. Anyone can
hash *forward*, so a signature for digit $d$ also gives valid values for every
digit above $d$. A checksum of the digits stops this for one signature: raising a
message digit lowers a checksum digit, which would need hashing backwards. With two
signatures from the same key, the attacker holds, for every chain, the smaller of
the two revealed positions, and can sign any message whose digits, checksum
included, are all at or above those minimums. Figure 16.5 shows one chain.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="One Winternitz chain of 16 positions: signature 1 reveals position 9, signature 2 reveals position 4; the attacker can now produce any position from 4 to 15 by hashing forward" fill="currentColor" font-size="14">
<text x="20" y="34" font-weight="bold">one chain, w = 16</text>
<g stroke="currentColor" stroke-width="1.2">
<rect x="20" y="60" width="32" height="32" fill="none"/><rect x="58" y="60" width="32" height="32" fill="none"/>
<rect x="96" y="60" width="32" height="32" fill="none"/><rect x="134" y="60" width="32" height="32" fill="none"/>
<rect x="172" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="210" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
<rect x="248" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="286" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
<rect x="324" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="362" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
<rect x="400" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="438" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
<rect x="476" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="514" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
<rect x="552" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/><rect x="590" y="60" width="32" height="32" fill="currentColor" fill-opacity="0.35"/>
</g>
<text x="36" y="81" text-anchor="middle" font-size="12">0</text>
<text x="188" y="81" text-anchor="middle" font-size="12">4</text>
<text x="378" y="81" text-anchor="middle" font-size="12">9</text>
<text x="606" y="81" text-anchor="middle" font-size="12">15</text>
<text x="36" y="118" text-anchor="middle" font-size="12">secret</text>
<text x="606" y="118" text-anchor="middle" font-size="12">public</text>
<line x1="378" y1="140" x2="378" y2="98" stroke="currentColor" stroke-width="1.5"/>
<polygon points="378,94 373,104 383,104" fill="currentColor"/>
<text x="390" y="150">signature 1 reveals position 9</text>
<line x1="188" y1="170" x2="188" y2="98" stroke="currentColor" stroke-width="1.5"/>
<polygon points="188,94 183,104 193,104" fill="currentColor"/>
<text x="200" y="180">signature 2 (same key) reveals position 4</text>
<text x="20" y="208">shaded: every position the attacker can now reach by hashing forward</text>
</svg>
<figcaption>Figure 16.5. Why a one-time key must be used once. Each signature reveals one position per chain; hashing forward is free, backward is impossible. After two signatures the attacker owns every position from the smaller of the two upward, on every chain, and the checksum no longer protects anything it can satisfy.</figcaption>
</figure>

**Code it.** A toy Winternitz key with eight message chains and three checksum
chains, used twice by a device that lost its counter, and a search for a third
message the attacker can sign.

```python
# Winternitz one-time signatures (w = 16) and what happens when the state is lost
# and one key signs twice. Toy sizes: a 32-bit message digest, 8 chains plus 3 for the checksum.
import hashlib, os

W, LEN1, LEN2 = 16, 8, 3

def chain(x, steps):
    for _ in range(steps):
        x = hashlib.sha256(x).digest()
    return x

def digits(msg):                     # 8 base-16 digits of the digest, then the checksum
    h = hashlib.sha256(msg).digest()[:4]
    d = [n for b in h for n in (b >> 4, b & 15)]
    c = sum(W - 1 - x for x in d)    # at most 8 * 15 = 120, three base-16 digits
    return d + [(c >> 8) & 15, (c >> 4) & 15, c & 15]

secret = [os.urandom(32) for _ in range(LEN1 + LEN2)]
public = [chain(s, W - 1) for s in secret]

def sign(msg):
    return [chain(s, d) for s, d in zip(secret, digits(msg))]

def verify(msg, sig):
    return all(chain(s, W - 1 - d) == p for s, d, p in zip(sig, digits(msg), public))

# The device restored from a backup and signed again with leaf 0.
m1, m2 = b"firmware 7.1", b"firmware 7.2"
s1, s2 = sign(m1), sign(m2)
known = [min((d1, x1), (d2, x2)) for d1, x1, d2, x2 in zip(digits(m1), s1, digits(m2), s2)]

tries = 0
while True:
    tries += 1
    fake = b"evil firmware " + str(tries).encode()
    d = digits(fake)
    if all(di >= k[0] for di, k in zip(d, known)):   # every chain can be walked forward
        forged = [chain(x, di - k) for di, (k, x) in zip(d, known)]
        break
print("forged", fake, "after", tries, "tries; verifies:", verify(fake, forged))
print("a fresh key would need the attacker to invert SHA-256")
```

```
forged b'evil firmware 1069' after 1069 tries; verifies: True
a fresh key would need the attacker to invert SHA-256
```

The secret key is random on every run, but the digits depend only on the
messages, so the forgery is found at the same try each time. With real sizes (67
chains for a 256-bit digest) a forgery after two signatures takes more tries, but
the cost is a few million hashes, not $2^{128}$; after several reuses it is
trivial. The checksum did its job for one signature and is helpless after two.

**Where state is lost.** Picture a Mars settlement that signs firmware for its
rovers with LMS, because LMS is small, fast and approved for exactly this use. The
signing key lives on a server in the habitat. A dust storm cuts power, the server
is restored from the previous night's backup, and the counter rolls back by the
eighty signatures made that day. The next eighty firmware images are signed with
one-time keys that have already been used. Nothing fails; every signature
verifies. An attacker who has collected the earlier images can now sign firmware
of his own. SP 800-208 exists largely to prevent this: it requires key generation
and signing to happen inside a hardware cryptographic module, forbids exporting
private keys, and requires the state to be updated in non-volatile memory before
a signature is released. It also allows splitting the key space among several
modules so that one can fail without anyone being tempted to copy a key.

!!! note "Life story: state reuse in XMSS and LMS"
    **Born:** with Lamport's one-time signatures (1979): a one-time key must sign
    once · **Purpose:** for the attacker, a forgery from two signatures under one
    leaf, for the cost of hashing forward · **Helped:** SP 800-208's hardware-only
    rules (2020); the stateless design of SPHINCS+ and SLH-DSA · **Status:** the
    only practical danger to correctly implemented hash-based signatures; it comes
    from operations, not mathematics

## 16.11 The quantum attacker's tools, at honest prices

*Level: intermediate.*

The whole tournament was organized around an attacker who has a large,
error-corrected quantum computer. This section prices that attacker's two tools.
Book 1's [Chapter 20](../../book/20-Quantum-Computers.md) explains how they work;
the Post-quantum book's
[chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md) follows the
estimates in more detail.

**Shor's algorithm** finds the period of a function, which factors $N$ and solves
discrete logarithms in any group, including elliptic curves, in polynomial time.
It is the reason the tournament exists: RSA, Diffie-Hellman, ECDSA and EdDSA fall
to it completely, with no parameter increase that helps. Its real cost is not its
asymptotic running time but the size of the machine. Because physical qubits make
errors, every logical qubit must be built from hundreds or thousands of physical
ones with an error-correcting code, and the arithmetic has to be designed around
the slow operations those codes allow. The published estimates for RSA-2048 are
the best measure of progress:

- **2019, Craig Gidney and Martin Ekerå:** about 20 million noisy physical qubits
  running for about 8 hours, assuming a physical error rate of one in a thousand
  and the surface code ("How to factor 2048 bit RSA integers in 8 hours using 20
  million noisy qubits").
- **2025, Craig Gidney:** fewer than a million noisy qubits running for less than a
  week, under the same error assumptions, using approximate modular arithmetic and
  denser ways to store idle qubits and make the costly non-Clifford gates ("How to
  factor 2048 bit RSA integers with less than a million noisy qubits").

Elliptic curves are a smaller target: a 256-bit curve needs fewer logical qubits
than RSA-2048 (Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter
estimated about 2,330 in 2017), so the curves in today's key exchanges would fall
first. Newer preprints claim lower counts still, with other codes and hardware;
until they are checked by others, the 2025 figure is the one to quote.

**What today's machines can factor.** The honest answer is: nothing that a pocket
calculator cannot. The first demonstration of Shor's algorithm factored 15 on a
seven-qubit nuclear magnetic resonance machine in 2001 (Lieven Vandersypen and
colleagues at IBM). A photonic experiment factored 21 in 2012. Both simplified
the circuits using knowledge of the answer, and in 2013 John Smolin, Graeme Smith
and Alexander Vargo showed that with such shortcuts one can "factor" numbers of
any size with almost no quantum hardware. An attempt to factor 35 with an honest
circuit on IBM's cloud machines in 2019 failed because the errors swamped the
signal. The largest chips of 2026 hold hundreds to a few thousand physical qubits,
and Google's 105-qubit Willow showed in December 2024 that error correction can
start to work as codes grow, an engineering milestone, not a cryptanalytic one.
The gap to a million good physical qubits is still a factor of several hundred.

Claims of larger factorizations appear regularly, and they are worth reading as an
attacker would. In December 2022 a team in China (Bao Yan and colleagues)
published a paper suggesting that RSA-2048 could be broken with 372 qubits,
combining Claus Schnorr's 2021 lattice factoring method with a variational quantum
optimizer; they factored a 48-bit number on 10 qubits. Schnorr's method had already
failed to perform as claimed on classical hardware, and the quantum step had no
demonstrated speedup. Experts dismissed the extrapolation. Reports of factoring
numbers in the millions or beyond on quantum annealers are similar: they turn
factoring into an optimization problem that classical computers also solve
easily, and they do not scale like Shor's algorithm. The test for every such claim
is the same: does the method's cost grow polynomially with the size of the number,
and was any step simplified using the answer?

!!! note "Life story: the Gidney-Ekerå estimate"
    **Born:** May 2019, Craig Gidney (Google) and Martin Ekerå (KTH and the Swedish
    NCSA) · **Purpose:** a complete, careful cost for breaking RSA-2048 with Shor's
    algorithm on a surface-code machine · **Helped:** 20 million noisy qubits and 8
    hours became the standard reference figure, and planning documents used it for
    years · **Replaced by:** Gidney's 2025 estimate of under a million noisy qubits
    in under a week

**Grover's algorithm** searches $2^k$ possibilities in about
$\frac{\pi}{4}\sqrt{2^k}$ steps, which halves the bit security of a symmetric key.
On paper that turns AES-128 into a 64-bit problem. In practice it is far weaker,
because Grover's steps must run **one after another**: unlike a classical key
search, it cannot be split across many machines without losing most of its
advantage. If each machine may run only $2^D$ iterations in sequence (NIST's call
suggested depth limits of $2^{40}$, $2^{64}$ and $2^{96}$ as plausible), the key
space must be cut into $2^{k-2D}$ slices, one per machine, and the total work is
$2^{k-D}$ iterations, each one a full AES circuit on a quantum computer.

**Code it.**

```python
# Grover against a k-bit key: iterations in a row, and what a depth limit does.
import math

def grover_iterations(k):            # about (pi/4) * sqrt(2^k) for one marked key
    return math.pi / 4 * 2 ** (k / 2)

for k in (20, 64, 128, 256):
    print("%3d-bit key: about 2^%.1f Grover iterations in sequence" % (k, math.log2(grover_iterations(k))))

# With a depth limit of 2^D iterations, split the key space into S slices,
# one machine per slice: each needs sqrt(2^k / S) <= 2^D, so S = 2^(k - 2D).
print()
for D in (40, 64, 96):
    k = 128
    machines = max(0, k - 2 * D)     # log2 of the number of machines
    depth = min(D, k // 2)           # one machine needs only 2^(k/2) iterations
    total = machines + depth         # machines times iterations each
    who = "1 machine" if machines == 0 else "2^%d machines" % machines
    print("AES-128, depth 2^%d: %s, 2^%d iterations in all" % (D, who, total))
```

```
 20-bit key: about 2^9.7 Grover iterations in sequence
 64-bit key: about 2^31.7 Grover iterations in sequence
128-bit key: about 2^63.7 Grover iterations in sequence
256-bit key: about 2^127.7 Grover iterations in sequence

AES-128, depth 2^40: 2^48 machines, 2^88 iterations in all
AES-128, depth 2^64: 1 machine, 2^64 iterations in all
AES-128, depth 2^96: 1 machine, 2^64 iterations in all
```

With a realistic depth limit of $2^{40}$ iterations (each iteration itself thousands
of logical gates deep), attacking one AES-128 key takes $2^{48}$ quantum computers
and $2^{88}$ AES evaluations on them: more total work than a classical search of a
64-bit key by a factor of $2^{24}$, on hardware that costs vastly more per
operation. Figure 16.6 draws the trade-off. This is why NIST's categories treat
AES-128 as adequate for category 1 against quantum attackers, and why no serious
post-quantum plan doubles symmetric key sizes in a hurry. AES-256 and SHA-384
remove any doubt where it is cheap to do so.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Grover on AES-128: as the allowed depth grows from 2 to the 32 to 2 to the 64, total work falls from 2 to the 96 to 2 to the 64 and the number of machines falls from 2 to the 64 to one" fill="currentColor" font-size="14">
<line x1="100" y1="260" x2="590" y2="260" stroke="currentColor" stroke-width="1.2"/>
<line x1="100" y1="20" x2="100" y2="260" stroke="currentColor" stroke-width="1.2"/>
<line x1="100" y1="183.2" x2="590" y2="183.2" stroke="currentColor" opacity="0.3"/>
<line x1="100" y1="106.4" x2="590" y2="106.4" stroke="currentColor" opacity="0.3"/>
<line x1="100" y1="29.6" x2="590" y2="29.6" stroke="currentColor" opacity="0.3"/>
<text x="92" y="264" text-anchor="end" font-size="12">2⁰</text>
<text x="92" y="187" text-anchor="end" font-size="12">2³²</text>
<text x="92" y="110" text-anchor="end" font-size="12">2⁶⁴</text>
<text x="92" y="34" text-anchor="end" font-size="12">2⁹⁶</text>
<text x="100" y="280" text-anchor="middle" font-size="12">2³²</text>
<text x="220" y="280" text-anchor="middle" font-size="12">2⁴⁰</text>
<text x="340" y="280" text-anchor="middle" font-size="12">2⁴⁸</text>
<text x="460" y="280" text-anchor="middle" font-size="12">2⁵⁶</text>
<text x="580" y="280" text-anchor="middle" font-size="12">2⁶⁴</text>
<text x="340" y="302" text-anchor="middle">allowed depth (Grover iterations in sequence)</text>
<polyline points="100,29.6 580,106.4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<polyline points="100,106.4 580,260" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<circle cx="220" cy="48.8" r="5" fill="currentColor"/>
<circle cx="220" cy="144.8" r="5" fill="currentColor"/>
<text x="232" y="42" font-size="13">total work 2⁸⁸ at depth 2⁴⁰</text>
<text x="232" y="160" font-size="13">2⁴⁸ machines at depth 2⁴⁰</text>
<text x="440" y="70" font-size="13" font-weight="bold">total work</text>
<text x="440" y="230" font-size="13" font-weight="bold">machines (dashed)</text>
</svg>
<figcaption>Figure 16.6. Grover under a depth limit, for AES-128. Total work is 2¹²⁸ divided by the depth; the number of machines is 2¹²⁸ divided by the depth squared. Only a machine that can run 2⁶⁴ iterations in a row reaches the textbook 2⁶⁴.</figcaption>
</figure>

**Quantum attacks on the new schemes.** For the post-quantum families themselves,
quantum computers help much less. Lattice sieving gains a modest constant in the
exponent ($2^{0.265\beta}$ against $2^{0.292\beta}$, and even that assumes cheap
quantum memory); code-based and multivariate attacks get Grover-type speedups on
their search steps; hash-based signatures lose half their bits to Grover, which
their parameters already account for. The one family with a known subexponential
quantum attack is the group-action isogeny family (CSIDH), through Kuperberg's
algorithm, and its parameters are sized for it. None of the 2022 breaks used a
quantum computer at all. That is the most important fact about the quantum
attacker in this chapter: so far, every post-quantum scheme that fell was broken
by classical mathematics.

## 16.12 What survived, and how to read a security claim

*Level: intermediate.*

**What survived.** After eight years of attack, the survivors share a profile.

- **ML-KEM and ML-DSA** rest on Module-LWE, a problem with a reduction to
  worst-case lattice problems, attacked since the 1980s through lattice reduction
  and since 2005 directly. The attacks moved their estimates by bits, not by
  orders of magnitude, and every serious problem found in them was in code.
- **FN-DSA** (Falcon) rests on NTRU lattices, studied since 1996. Its risks are in
  implementation: its sampler uses floating point, which is hard to make
  constant-time.
- **SLH-DSA** rests on hash functions alone. Its only real danger, state reuse,
  belongs to its stateful cousins, and SLH-DSA was designed to remove it.
- **HQC** and **Classic McEliece** rest on decoding random-looking codes, studied
  since 1962 (Eugene Prange's information-set decoding). Classic McEliece hides
  almost no structure and has huge keys; HQC uses quasi-cyclic structure and has
  had implementation leaks but no structural break.

What fell had one or more of the five diseases of §16.3, and the two famous
victims had the second: structure added for efficiency. SIKE published torsion
images to make key exchange work at all; Rainbow added a layer to shrink keys and
signatures. Both had a decade of study. Both fell to ideas that had existed for
years in a neighboring field (Kani's theorem; MinRank and Gröbner-basis solving
tuned to a new shape).

**How to read a post-quantum security claim.** When a scheme, a product or a paper
says "category 3" or "192-bit post-quantum security", an attacker reads it as a
list of questions.

<div class="mars-steps" markdown>

1. **Which hard problem, and how old is it?** A named problem attacked for decades
   (LWE, decoding random linear codes, hash preimages) is worth more than a new
   variant. Ask what is new about this instance: a ring, a module, a subfield, a
   quasi-cyclic code, an extra layer.
2. **Which attacks were costed?** The claim should list the primal and dual
   lattice attacks, information-set decoding, MinRank and Gröbner basis attacks,
   or whatever fits, with a cost for each. A claim that names only brute force is
   no claim.
3. **In what cost model?** Core-SVP, gate counts and gate counts with memory costs
   can differ by 20 bits or more for the same attack. Know which one the number
   uses, and compare like with like.
4. **Classical or quantum, and with what depth?** A quantum figure that ignores
   depth limits overstates Grover; one that assumes free quantum memory overstates
   quantum sieving.
5. **What is left of the margin?** If the best attack sits a few bits above the
   category, the next paper may push it below. ML-KEM-768 is recommended over
   ML-KEM-512 for exactly this reason.
6. **What does the scheme reveal beyond the public key?** Torsion images,
   decryption failures, signature distributions, rejection-sampling counts, timing:
   everything published or observable is an input to some attacker.
7. **Is the implementation part of the claim?** A mathematical category says
   nothing about timing, power or faults. Look for constant-time verification on
   the binary, masking where physical attacks matter, and tests.
8. **Who has attacked it?** The best single predictor of survival in the
   tournament was how deep into the process a scheme had gone, which is to say how
   many skilled people had tried and failed.

</div>

Applied to the survivors, the questions give reassuring answers. Applied to a
proprietary "quantum-proof" product with no published specification, they give
none, and the tournament's first weeks showed what usually happens to those.

## 16.13 Going deeper

*Level: expert.*

**The estimators.** The lattice estimator by Martin Albrecht and co-authors (the
successor to the 2015 "LWE estimator" of Albrecht, Rachel Player and Sam Scott)
encodes every major attack on LWE, LWR, NTRU and SIS, with several cost models
for BKZ and sieving. Running it on the ML-KEM parameters is the best way to see how
the published numbers are made and how much they depend on the model. For codes,
the equivalent tools estimate information-set decoding (Prange, Stern, Dumer, and
the May-Meurer-Thomae and Becker-Joux-May-Meurer algorithms with nearest-neighbor
search); for multivariate schemes, tools such as Bellini, Esser and co-authors'
estimators cost Gröbner-basis, MinRank and the special attacks on UOV-type schemes.
Chapter 6 of the Post-quantum book walks the lattice estimator; this book's
[Chapter 15](15-Lattices-as-a-Weapon.md) shows what the attacks underneath it do.

**Quantum sieving and memory.** The $2^{0.265\beta}$ figure for quantum sieving
assumes quantum random-access memory of exponential size that can be queried in
superposition at unit cost. Whether such memory can be built at all, and what it
would cost, is disputed; analyses that charge for it find that quantum sieving
gains little or nothing over classical sieving at cryptographic sizes. NIST's
categories sidestep the question by measuring everything against the cost of
attacking AES under the same assumptions.

**Higher-dimensional isogenies.** After 2022 the gluing and splitting technique
became a general tool: Robert's polynomial-time "evaluation" of any isogeny given
enough torsion information, the SQIsign variants that represent isogenies through
two-dimensional ones, and new encryption proposals built on them. The open
question for attackers is which of these new schemes reveal torsion information
in some disguised form.

**Open problems an attacker would pick.** Whether UOV's security against the
known attacks (Kipnis-Shamir, reconciliation, intersection) is close to optimal,
and whether MAYO's "whipping" adds exploitable structure; whether quasi-cyclic
codes (HQC, BIKE) have structural attacks that random codes do not; whether the
dual attack can be made rigorous and how much it really gains; how cheaply a
masked ML-KEM implementation can be broken by learned models on unseen devices;
and whether any classical algorithm improves on the $2^{0.292\beta}$ sieving
exponent, which has stood since 2016 (Anja Becker, Léo Ducas, Nicolas Gama and
Thijs Laarhoven). Chapter 20 returns to these.

**The record of competitions.** Bernstein's 2023 paper compares the NIST process
with earlier selections and argues that a process with more public scrutiny per
candidate, and a slower funnel, breaks more schemes before standardization. Read
it alongside NIST's round reports, which explain each decision from the other
side, and the pqc-forum archive, where most of the breaks in this chapter were
first posted.

## Check yourself

??? question "1. NIST's categories define category 1 by the cost of an AES-128 key search. A scheme's best attack costs 2^120 classical operations. Is the scheme broken at category 1?"

    Yes, by the tournament's definition, if the comparison is made in the same cost
    model. Category 1 means at least as hard as attacking AES-128, about $2^{143}$
    classical gates by NIST's own estimate of AES-128 key search; an attack well
    below that breaks the claim even though nobody can run $2^{120}$ operations
    today.

??? question "2. Using Bernstein's percentages, about how many of the 69 round 1 submissions are broken, and how many of those were broken during round 1?"

    About 33 (48% of 69), of which about 21 fell during round 1 itself (69 minus
    the 48 that survived round 1 unbroken), and about 12 later (25% of 48).

??? question "3. Name two of the five recurring causes of the early casualties, with an example of each."

    Any two of: no hard problem (Guess Again); structure added for size (Edon-K,
    and later Rainbow and SIKE); a new problem dressed as an old one (Compact-LWE,
    WalnutDSA's braid-group problems); a weak glue layer (RaCoSS's verification,
    HILA5's CCA transform with its error correction); optimistic parameters (MQDSS,
    GeMSS).

??? question "4. What did SIDH publish that the Castryck-Decru attack needed, and why did SIDH have to publish it?"

    The images of the other party's torsion basis under the secret isogeny,
    $\varphi_B(P_A)$ and $\varphi_B(Q_A)$. Each party needs them to push its own
    secret kernel through the other's isogeny, so that both reach the same final
    curve. Kani's criterion turns those images into a test of guesses about the
    secret walk.

??? question "5. Why did the SIKE attack not break CSIDH or SQIsign?"

    Neither publishes the values of a secret isogeny on a large torsion subgroup.
    CSIDH's public key is a single curve; SQIsign reveals a randomized isogeny but
    not the secret one's action on torsion points. Without that information the
    gluing-and-splitting test cannot be built.

??? question "6. In a UOV or Rainbow key, what is special about the oil subspace, and why does finding one vector of it matter?"

    Every public equation vanishes on it, because the central equations contain no
    oil-times-oil terms and the oil subspace is the preimage of the oil
    coordinates under the secret change of variables. One vector of it (for Rainbow,
    of the second oil space) gives, with linear algebra and older attacks, the rest
    of the secret key.

??? question "7. ML-KEM-768's failure probability is about 2^-164. Why can an attacker limited to 2^64 decapsulation queries not mount a failure-boosting attack?"

    Even if failure boosting raises the failure rate of chosen ciphertexts by many
    orders of magnitude, the attacker needs to observe at least one failure, and
    the expected number in $2^{64}$ queries is around $2^{64-164}$, far below one.
    Without a first failure, directional boosting has nothing to start from.

??? question "8. A device signs firmware with LMS. After a restore from backup it signs two different images with the same leaf. Explain in one or two sentences why a forgery is now possible, and what SP 800-208 requires to prevent it."

    For each Winternitz chain the attacker holds the lower of the two revealed
    positions and can hash forward to any higher one, so any message whose digits
    and checksum digits are all at or above those minimums can be signed. SP 800-208
    requires the keys to be generated and used only inside hardware modules that do
    not export them, with the state updated before each signature is released.

??? question "9. With a depth limit of 2^50 Grover iterations, how many machines and how many iterations in total does a Grover search of a 128-bit key need?"

    The key space is cut into $2^{128 - 2 \cdot 50} = 2^{28}$ slices, one machine
    each, each running $2^{50}$ iterations: $2^{78}$ iterations in all.

??? question "10. A vendor claims its new scheme has '256-bit post-quantum security' because its key is 512 bits long and Grover halves that. What questions from §16.12 does this fail, and what would you ask for?"

    It names no hard problem, costs no structural attack, gives no cost model, and
    treats brute force as the only attack. Ask for the underlying problem and its
    history, the best known classical and quantum attacks with their costs in a
    stated model, the remaining margin, what the scheme reveals beyond the key, and
    who outside the company has attacked it.

## What you learned

- NIST's post-quantum process (call in December 2016, 69 complete submissions in
  December 2017, rounds in 2019, 2020 and 2022, FIPS 203, FIPS 204 and FIPS 205 in
  August 2024, HQC in March 2025) worked as a public cryptanalysis tournament.
  About 33 of the 69 originals are now broken, most in round 1; none of the chosen
  algorithms is.
- The early casualties died of five recurring causes: no hard problem, structure
  added for size, a new problem dressed as an old one, a weak glue layer, and
  optimistic parameters.
- SIKE fell in July 2022 because SIDH publishes the secret isogeny's values on
  torsion points; Castryck and Decru used Kani's 1997 theorem to turn them into a
  step-by-step test, recovering a SIKEp434 key in about an hour on one core.
  Isogeny schemes that publish no torsion images, CSIDH and SQIsign, were untouched.
- Rainbow fell in February 2022 when Beullens used its second layer's hidden
  subspace to reduce key recovery to a small quadratic system, solved in about 53
  hours on a laptop. Plain UOV and MAYO were unaffected; GeMSS fell to MinRank
  attacks on HFEv-.
- Lattice schemes were not broken, but the dual attack debate, Kyber-512's margin,
  decryption-failure attacks and a short-lived quantum LWE claim all shaped their
  parameters; their code fell repeatedly (KyberSlash, clangover, masked
  implementations, faults).
- Hash-based signatures have only one practical danger, state reuse in XMSS and
  LMS, which turns two signatures from one leaf into a forgery; SP 800-208 exists
  to stop it.
- Shor's algorithm for RSA-2048 is estimated at under a million noisy qubits for
  under a week (2025), against machines of hundreds to thousands; honest Shor
  demonstrations have factored only 15 and 21. Grover under a depth limit costs
  far more than $2^{64}$ for AES-128.
- A post-quantum security claim is read as a list of questions: the problem and
  its age, the attacks costed, the cost model, quantum assumptions, margin, what
  is revealed, implementation, and who has attacked it.

**Next:** Chapter 17, side channels from
the attacker's side: timing, caches, power and faults, with a correlation power
attack on AES coded on simulated traces.

## Further reading

- NIST, "Submission Requirements and Evaluation Criteria for the Post-Quantum
  Cryptography Standardization Process" (call for proposals, December 2016), and
  NIST's status reports on rounds 1, 2 and 3 (2019, 2020, 2022) and the fourth
  round (2025).
- NIST, FIPS 203, FIPS 204 and FIPS 205 (August 2024); SP 800-208 (October 2020);
  SP 800-227 (September 2025).
- Daniel J. Bernstein, "Quantifying risks in cryptographic selection processes"
  (IACR ePrint 2023/1838).
- David Jao and Luca De Feo, "Towards Quantum-Resistant Cryptosystems from
  Supersingular Elliptic Curve Isogenies" (PQCrypto 2011).
- Steven Galbraith, Christophe Petit, Barak Shani and Yan Bo Ti, "On the Security
  of Supersingular Isogeny Cryptosystems" (ASIACRYPT 2016); Christophe Petit,
  "Faster Algorithms for Isogeny Problems Using Torsion Point Images" (ASIACRYPT
  2017).
- Ernst Kani, "The number of curves of genus two with elliptic differentials",
  *Journal für die reine und angewandte Mathematik* 485 (1997).
- [Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH"
  (IACR ePrint 2022/975; EUROCRYPT 2023)](https://eprint.iacr.org/2022/975).
- Luciano Maino, Chloe Martindale, Lorenz Panny, Giacomo Pope and Benjamin
  Wesolowski, "A Direct Key Recovery Attack on SIDH" (EUROCRYPT 2023); Damien
  Robert, "Breaking SIDH in Polynomial Time" (EUROCRYPT 2023).
- Wouter Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes,
  "CSIDH: An Efficient Post-Quantum Commutative Group Action" (ASIACRYPT 2018);
  Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and Benjamin
  Wesolowski, "SQISign" (ASIACRYPT 2020).
- Aviad Kipnis, Jacques Patarin and Louis Goubin, "Unbalanced Oil and Vinegar
  Signature Schemes" (EUROCRYPT 1999); Jintai Ding and Dieter Schmidt, "Rainbow, a
  New Multivariable Polynomial Signature Scheme" (ACNS 2005).
- Ward Beullens, "Improved Cryptanalysis of UOV and Rainbow" (EUROCRYPT 2021) and
  [ "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022, IACR ePrint
  2022/214)](https://eprint.iacr.org/2022/214).
- Aviad Kipnis and Adi Shamir, "Cryptanalysis of the HFE Public Key Cryptosystem by
  Relinearization" (CRYPTO 1999); Magali Bardet and seven co-authors, "Improvements
  of Algebraic Attacks for Solving the Rank Decoding and MinRank Problems"
  (ASIACRYPT 2020).
- Chengdong Tao, Albrecht Petzoldt and Jintai Ding, "Efficient Key Recovery for All
  HFE Signature Variants" (CRYPTO 2021); John Baena and five co-authors, "Improving
  Support-Minors Rank Attacks: Applications to GeMSS and Rainbow" (CRYPTO 2022).
- MATZOV, "Report on the Security of LWE: Improved Dual Lattice Attack" (2022);
  Léo Ducas and Ludo Pulles, "Does the Dual-Sieve Attack on Learning with Errors
  Even Work?" (CRYPTO 2023).
- Qian Guo, Thomas Johansson and Paul Stankovski, "A Key Recovery Attack on MDPC
  with CCA Security Using Decoding Errors" (ASIACRYPT 2016); Jan-Pieter D'Anvers,
  Mélissa Rossi and Fernando Virdia, "(One) Failure Is Not an Option" (EUROCRYPT
  2020).
- Prasanna Ravi, Sujoy Sinha Roy, Anupam Chattopadhyay and Shivam Bhasin, "Generic
  Side-Channel Attacks on CCA-Secure Lattice-Based PKE and KEMs" (TCHES 2020);
  Qian Guo, Thomas Johansson and Alexander Nilsson, "A Key-Recovery Timing Attack
  on Post-Quantum Primitives Using the Fujisaki-Okamoto Transformation and Its
  Application on FrodoKEM" (CRYPTO 2020).
- Daniel J. Bernstein and nine co-authors, "KyberSlash: Exploiting
  Secret-Dependent Division Timings in Kyber Implementations" (2024); Antoon
  Purnal, "clangover" (2024).
- Ray Perlner, John Kelsey and David Cooper, "Breaking Category Five SPHINCS+ with
  SHA-256" (PQCrypto 2022).
- Craig Gidney and Martin Ekerå, "How to Factor 2048 Bit RSA Integers in 8 Hours
  Using 20 Million Noisy Qubits" (*Quantum*, 2021; arXiv 2019); Craig Gidney, "How
  to Factor 2048 Bit RSA Integers with Less than a Million Noisy Qubits" (arXiv
  2025).
- John Smolin, Graeme Smith and Alexander Vargo, "Oversimplifying Quantum
  Factoring" (*Nature*, 2013).
