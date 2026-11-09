# 13. Code-Based Encryption: McEliece

*In 1978, a year after RSA, Robert McEliece proposed a public-key system built on
error-correcting codes. RSA fell to Shor's algorithm on paper in 1994; McEliece's system,
with its original kind of code, has never been broken in practice in nearly fifty years of
attack. Its drawback has always been the key: hundreds of kilobytes to over a megabyte. This
chapter is about that trade. You will decode a tiny Goppa code by hand with Patterson's
algorithm, build a working McEliece system with a binary Goppa code over GF(2^8), decrypt by
decoding errors with the Berlekamp-Massey algorithm, break the toy with three generations of
information-set decoding (Prange 1962, Lee-Brickell 1988, Stern 1989), and compute how far the
same attacks are from the real parameter sets. The chapter ends with where Classic McEliece
stands in November 2026: not chosen by NIST, standardized by ISO in 2026, and, after a run of
new structural attacks that summer, no longer recommended for new systems by Germany's BSI.*

!!! abstract "In this chapter"
    **You will learn:**

    - how McEliece and Niederreiter encryption hide a message as errors in a codeword;
    - binary Goppa codes, and how their secret structure allows decoding, by hand with
      Patterson's algorithm and in code with Berlekamp-Massey;
    - a complete toy Classic McEliece, from key generation to decoding;
    - information-set decoding from Prange to Stern in code, BJMM in outline, and why the
      clever variants gain little against McEliece's sparse errors;
    - why other codes failed where Goppa codes have held;
    - Classic McEliece's parameters, why its public keys are big and its private keys small,
      where it is deployed, and its standards status, including the 2026 attacks and BSI's
      change of advice.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (KEMs) and
    [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (decoding as a hard problem); linear
    algebra over GF(2). The theory of linear codes, finite fields and Goppa codes is in
    [Chapter 18 of the mathematics book](../mathematics/18-Error-Correcting-Codes.md); this
    chapter uses it. The attacker's side of the NIST competition is told in
    [Chapter 16 of the cryptanalysis book](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md).

    **Levels:** §13.1 to §13.3 are for beginners, §13.4 to §13.8 are intermediate, §13.9 to
    §13.11 are expert.

## 13.1 The problem

*Level: beginner.*

Every network adds noise. Error-correcting codes fight it by adding structured redundancy: a
$k$-bit message becomes an $n$-bit **codeword**, and as long as no more than $t$ bits are
flipped on the way, the receiver can find and undo the flips. Mars rovers and the Deep Space
Network have relied on such codes since the 1970s; McEliece himself worked at the Jet
Propulsion Laboratory on coding for deep-space links.

McEliece turned the problem around. Decoding a *random-looking* linear code with $t$ errors
is hard: no known algorithm, classical or quantum, does much better than guessing where the
errors are. Decoding a code *with a known structure* is easy. So publish a code that looks
random, keep its structure secret, and encrypt by deliberately adding $t$ errors. Only the
holder of the structure can remove them.

The general decoding problem is NP-hard (Berlekamp, McEliece and van Tilborg, 1978), and
quantum computers give only a Grover-type speed-up on the best known attacks. The question
for fifty years has been whether the hidden structure can be found from the public key. For
binary Goppa codes, McEliece's original choice, the answer for almost all of that time was
no. In 2026 a group of papers claimed the first structural attacks that might beat plain
decoding at real sizes; none has been run at full size, and their costs are argued over
(§13.10).

!!! note "Life story: the McEliece cryptosystem"
    **Born:** 1978, Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding
    Theory", JPL DSN Progress Report 42-44 · **Purpose:** public-key encryption from the
    hardness of decoding · **Helped:** the whole field of code-based cryptography;
    Niederreiter's 1986 variant; Classic McEliece (2017 onward) · **Status:** unbroken with
    binary Goppa codes; Classic McEliece was a finalist in NIST's third round and went on to the
    fourth, but NIST did not select it in March 2025 (NIST IR 8545), noting that it is under
    consideration for ISO standardization. ISO added it to ISO/IEC 18033-2 in 2026; in
    October 2026, after new structural attacks, BSI advised against it for new systems
    (§13.10).

### Fifty years in one picture

McEliece published his proposal as a short note in the Jet Propulsion Laboratory's *Deep Space
Network Progress Report*, a place few cryptographers read. His parameters were a binary Goppa
code of length $n = 1024$ and dimension $k = 524$ correcting $t = 50$ errors. The public key,
a full $524 \times 1024$ generator matrix, was 536,576 bits, about 67 kilobytes: a great deal of
memory for the computers of the day, while an RSA key fit in a few lines of digits. The scheme
was admired and set aside.

Its two pillars were older. Eugene Prange had described information-set decoding in 1962 as a
way to *decode*; it became the yardstick for every attack on McEliece. Valery Goppa published
his codes in 1970, and Nicholas Patterson gave them an efficient decoder in 1975.

Harald Niederreiter's 1986 version used parity-check matrices and, for smaller keys,
generalized Reed-Solomon codes. In 1994 Yuan Xing Li, Robert Deng and Xin Mei Wang showed that
McEliece and Niederreiter with the same code are equally hard to break, so the choice between
them is about sizes. The choice of code is another matter: in 1992 Vladimir Sidelnikov and
Sergey Shestakov recovered the secret structure of the Reed-Solomon variant in polynomial time
(§13.8). That set a pattern for thirty years: every attempt to swap Goppa codes for something
more compact was broken sooner or later, while Goppa codes stood.

Generic decoding improved slowly: Lee and Brickell and Jeffrey Leon in 1988, Stern in 1989,
Ilya Dumer in 1991, Anne Canteaut and Florent Chabaud in 1998, who put McEliece's original
parameters at about $2^{64}$ operations. In 2008 Bernstein, Tanja Lange and Christiane Peters
turned that into a real decryption under the 1978 parameters on a cluster of ordinary
computers. The scheme survived; its 1978 key size did not.

Then the engineering caught up. Bernstein, Tung Chou and Peter Schwabe's McBits (CHES 2013)
made Goppa decoding fast and constant-time at once. In 2017 a team led by Bernstein submitted
Classic McEliece to NIST; for round 2 it merged with NTS-KEM, a near-identical submission by
Martin Albrecht, Carlos Cid, Kenneth Paterson, Cen Jung Tjhai and Martin Tomlinson. It was a
round 3 finalist (2020), went on to the fourth round (2022), and was not selected in March
2025. The year 2026 brought both an ISO standard and the strongest structural attacks yet
published (§13.10).

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Timeline of McEliece cryptography from Prange's information-set decoding in 1962 through McEliece 1978, Niederreiter 1986 and the 1992 break of the Reed-Solomon variant, to Classic McEliece at NIST from 2017, NIST choosing HQC in 2025, and the ISO standard and new attacks of 2026" fill="currentColor" font-size="12">
  <line x1="30" y1="80" x2="610" y2="80" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="200" x2="610" y2="200" stroke="currentColor" stroke-width="2"/>
  <text x="30" y="98" font-size="11" fill-opacity=".7">1960–2000</text>
  <text x="30" y="216" font-size="11" fill-opacity=".7">2005–2027</text>
  <g>
    <circle cx="68" cy="80" r="4"/><text x="68" y="46" text-anchor="middle" font-weight="700">1962</text><text x="68" y="62" text-anchor="middle">Prange: ISD</text>
    <circle cx="180" cy="80" r="4"/><text x="180" y="102" text-anchor="middle" font-weight="700">1970</text><text x="180" y="118" text-anchor="middle">Goppa codes</text>
    <circle cx="250" cy="80" r="4"/><text x="250" y="46" text-anchor="middle" font-weight="700">1975</text><text x="250" y="62" text-anchor="middle">Patterson decoder</text>
    <circle cx="292" cy="80" r="5"/><text x="292" y="102" text-anchor="middle" font-weight="700">1978</text><text x="292" y="118" text-anchor="middle">McEliece</text>
    <circle cx="404" cy="80" r="4"/><text x="404" y="46" text-anchor="middle" font-weight="700">1986</text><text x="404" y="62" text-anchor="middle">Niederreiter</text>
    <circle cx="432" cy="80" r="4"/><circle cx="446" cy="80" r="4"/><text x="439" y="102" text-anchor="middle" font-weight="700">1988–89</text><text x="439" y="118" text-anchor="middle">Lee-Brickell, Stern</text>
    <circle cx="488" cy="80" r="4"/><text x="500" y="46" text-anchor="middle" font-weight="700">1992</text><text x="500" y="62" text-anchor="middle">GRS broken</text>
    <circle cx="572" cy="80" r="4"/><text x="565" y="118" text-anchor="middle">Canteaut-Chabaud</text><text x="565" y="102" text-anchor="middle" font-weight="700">1998</text>
  </g>
  <g>
    <circle cx="116" cy="200" r="4"/><text x="116" y="166" text-anchor="middle" font-weight="700">2008</text><text x="116" y="182" text-anchor="middle">1978 keys broken</text>
    <circle cx="193" cy="200" r="4"/><text x="193" y="222" text-anchor="middle" font-weight="700">2011</text><text x="193" y="238" text-anchor="middle">high-rate distinguisher</text>
    <circle cx="219" cy="200" r="4"/><circle cx="244" cy="200" r="4"/><text x="232" y="166" text-anchor="middle" font-weight="700">2012–13</text><text x="232" y="182" text-anchor="middle">BJMM; McBits</text>
    <circle cx="346" cy="200" r="4"/><text x="346" y="222" text-anchor="middle" font-weight="700">2017</text><text x="346" y="238" text-anchor="middle">submitted to NIST</text>
    <circle cx="422" cy="200" r="4"/><text x="422" y="166" text-anchor="middle" font-weight="700">2020</text><text x="422" y="182" text-anchor="middle">finalist</text>
    <circle cx="473" cy="200" r="4"/><text x="473" y="222" text-anchor="middle" font-weight="700">2022</text><text x="473" y="238" text-anchor="middle">round 4</text>
    <circle cx="549" cy="200" r="4"/><text x="549" y="166" text-anchor="middle" font-weight="700">2025</text><text x="549" y="182" text-anchor="middle">NIST picks HQC</text>
    <circle cx="575" cy="200" r="5"/><text x="568" y="222" text-anchor="middle" font-weight="700">2026</text><text x="568" y="238" text-anchor="middle">ISO; new attacks</text>
  </g>
</svg>
<figcaption>Figure 13.1. Half a century of McEliece. The upper row is the age of ideas: the attack (1962) and the decoder (1975) came before the cryptosystem. The lower row is the age of engineering and standards, which reached 2026 with an ISO standard and a new kind of attack in the same summer.</figcaption>
</figure>

## 13.2 Codes in one page

*Level: beginner.*

A binary linear code of length $n$ and dimension $k$ is a set of $2^k$ codewords in
$\{0,1\}^n$, closed under XOR. It can be described in two ways:

- by a **generator matrix** $G$ ($k \times n$): the codewords are $mG$ for all messages $m$;
- by a **parity-check matrix** $H$ ($(n-k) \times n$): the codewords are the vectors $x$ with
  $Hx = 0$.

If a codeword $x$ arrives with errors $e$, the receiver sees $y = x + e$ and can compute the
**syndrome** $Hy = He$, which depends only on the errors. Decoding means finding the
lowest-weight $e$ with a given syndrome. For a random code that is the **syndrome decoding
problem**, and it is hard.

<div class="mars-steps" markdown>

**Syndrome decoding with the [7, 4] Hamming code** (corrects one error).

1. The parity-check matrix has as columns the numbers 1 to 7 in binary:
   $H = \begin{pmatrix} 0&0&0&1&1&1&1 \\ 0&1&1&0&0&1&1 \\ 1&0&1&0&1&0&1 \end{pmatrix}$.
2. A codeword $x = 0110011$ has $Hx = 0$. Flip bit 5: $y = 0110111$.
3. $Hy$ = column 5 = $101$, the binary for 5.
4. The syndrome names the error position. Flip bit 5 back.

</div>

The Hamming code's structure is obvious from $H$. McEliece's idea is to use a code with a
powerful decoder, and publish a parity-check (or generator) matrix that hides it.

### Generator and parity-check matrices by hand

The two descriptions of a code are linked by one identity, $G H^{\mathsf T} = 0$: every row of
$G$ is a codeword, so every parity check vanishes on it. When $G$ is in **systematic form**
$G = [\,I_k \mid A\,]$, the matching parity-check matrix can be written down at once:
$H = [\,A^{\mathsf T} \mid I_{n-k}\,]$, because $G H^{\mathsf T} = A + A = 0$ over GF(2). A
systematic codeword is the message followed by $n - k$ check bits.

Take the [7, 4] Hamming code in systematic form, with

$$A = \begin{pmatrix} 1&1&0 \\ 1&0&1 \\ 0&1&1 \\ 1&1&1 \end{pmatrix},\qquad
G = [\,I_4 \mid A\,],\qquad H = [\,A^{\mathsf T} \mid I_3\,] =
\begin{pmatrix} 1&1&0&1&1&0&0 \\ 1&0&1&1&0&1&0 \\ 0&1&1&1&0&0&1 \end{pmatrix}.$$

Encode $m = 1011$: the check bits are the sum of rows 1, 3 and 4 of $A$, $110 + 011 + 111 =
010$, so the codeword is $c = 1011\,010$. Check it with $H$: the first four columns picked out
by $m$ give $110 + 011 + 111 = 010$ again, and the last three columns add the check bits $010$,
so $Hc = 000$. The columns of $H$ are $110, 101, 011, 111, 100, 010, 001$: all seven nonzero
3-bit vectors, in a different order from §13.2's. That is still the Hamming code, with its
positions permuted, which is exactly the kind of disguise McEliece uses.

Systematic form also fixes the key size: either matrix is determined by the $k(n-k)$ bits of
$A$. For the smallest Classic McEliece set that is $2{,}720 \times 768 = 2{,}088{,}960$ bits,
exactly the 261,120-byte public key of Table 13.3.

## 13.3 McEliece and Niederreiter

*Level: beginner.*

**McEliece (1978).** The private key is a code with an efficient decoder for $t$ errors, given
by a generator matrix $G$, plus a random invertible matrix $S$ and a permutation $P$. The public
key is $\hat G = S G P$, which generates an equivalent code that looks random. To encrypt
$m$, pick a random $e$ of weight exactly $t$ and send $c = m\hat G + e$. To decrypt, undo $P$,
decode to remove the errors, and undo $S$.

**Niederreiter (1986)** is the parity-check version: the public key is a scrambled
parity-check matrix $\hat H$, the message is encoded as the error vector $e$ itself, and the
ciphertext is the syndrome $c = \hat H e$. Decrypting means finding the weight-$t$ vector with
that syndrome, which only the key holder can do. The ciphertext is just $n - k$ bits: for the
smallest Classic McEliece set, 96 bytes, the shortest of any post-quantum KEM.

Classic McEliece is a KEM built on Niederreiter: encapsulation picks a random weight-$t$ vector
$e$, sends $c = He$, and both sides derive the key by hashing $e$ (and $c$). The public key is
put in **systematic form** $H = [I_{n-k} \mid T]$, so only $T$ needs to be published, and the
secret scrambling is replaced by the elimination that produces that form.

| | McEliece | Niederreiter / Classic McEliece |
|---|---|---|
| public key | generator matrix $\hat G$ | parity-check matrix $H = [I \mid T]$ |
| message | $m$, errors random | the error vector $e$ itself |
| ciphertext | $m\hat G + e$ ($n$ bits) | $He$ ($n - k$ bits) |
| decryption | decode $c$ | find $e$ from its syndrome |

*Table 13.1. The two forms are equally secure; Niederreiter's gives much shorter ciphertexts.*

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two pipelines: McEliece multiplies the message by the public generator matrix and adds a weight-t error; Niederreiter multiplies a weight-t error by the public parity-check matrix and sends the syndrome. Only decoding needs the secret Goppa structure" fill="currentColor" font-size="13">
  <defs><marker id="ar13" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="22" font-weight="700">McEliece (1978): the message is the codeword, the errors are random</text>
  <text x="10" y="142" font-weight="700">Niederreiter (1986), Classic McEliece: the message is the error</text>
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="10" y="40" width="100" height="44" rx="4"/><rect x="140" y="40" width="100" height="44" rx="4"/>
    <rect x="270" y="40" width="100" height="44" rx="4"/><rect x="400" y="40" width="100" height="44" rx="4"/>
    <rect x="530" y="40" width="100" height="44" rx="4"/>
    <rect x="10" y="160" width="100" height="44" rx="4"/><rect x="140" y="160" width="100" height="44" rx="4"/>
    <rect x="270" y="160" width="100" height="44" rx="4"/><rect x="400" y="160" width="100" height="44" rx="4"/>
    <rect x="530" y="160" width="100" height="44" rx="4"/>
  </g>
  <rect x="400" y="40" width="100" height="44" rx="4" fill-opacity=".12"/>
  <rect x="400" y="160" width="100" height="44" rx="4" fill-opacity=".12"/>
  <g stroke="currentColor" stroke-width="1.5" marker-end="url(#ar13)">
    <line x1="110" y1="62" x2="138" y2="62"/><line x1="240" y1="62" x2="268" y2="62"/>
    <line x1="370" y1="62" x2="398" y2="62"/><line x1="500" y1="62" x2="528" y2="62"/>
    <line x1="110" y1="182" x2="138" y2="182"/><line x1="240" y1="182" x2="268" y2="182"/>
    <line x1="370" y1="182" x2="398" y2="182"/><line x1="500" y1="182" x2="528" y2="182"/>
  </g>
  <g text-anchor="middle">
    <text x="60" y="60">message m</text><text x="60" y="76" font-size="11">k bits</text>
    <text x="190" y="60">m · Ĝ</text><text x="190" y="76" font-size="11">Ĝ = S G P public</text>
    <text x="320" y="60">c = mĜ + e</text><text x="320" y="76" font-size="11">n bits, wt(e) = t</text>
    <text x="450" y="60">decode</text><text x="450" y="76" font-size="11">secret g, L, S, P</text>
    <text x="580" y="60">message m</text><text x="580" y="76" font-size="11">recovered</text>
    <text x="60" y="180">error e</text><text x="60" y="196" font-size="11">random, wt t</text>
    <text x="190" y="180">s = H e</text><text x="190" y="196" font-size="11">H = [I | T] public</text>
    <text x="320" y="180">ciphertext s</text><text x="320" y="196" font-size="11">n − k bits</text>
    <text x="450" y="180">decode</text><text x="450" y="196" font-size="11">secret g, L</text>
    <text x="580" y="180" font-size="12">K = hash(1, e, s)</text><text x="580" y="196" font-size="11">both sides</text>
  </g>
  <text x="320" y="236" text-anchor="middle" font-size="12" fill-opacity=".7">Shaded: the only step that needs the secret Goppa structure.</text>
</svg>
<figcaption>Figure 13.2. The two pipelines. McEliece encodes the message and adds random noise; Niederreiter makes the noise the message and sends only its syndrome. Classic McEliece uses the lower row and hashes the error into a session key.</figcaption>
</figure>

### Both systems by hand on the Hamming code

The Hamming code corrects one error, so it is far too weak to hide anything, but it shows every
step with numbers small enough to follow. Use the systematic $G = [I_4 \mid A]$ and $H =
[A^{\mathsf T} \mid I_3]$ from §13.2.

<div class="mars-steps" markdown>

**McEliece with $t = 1$.**

1. Secret scrambler $S$: the $4 \times 4$ matrix with rows $1100, 0100, 0011, 0001$. It is its
   own inverse over GF(2) (each $2 \times 2$ block $\begin{pmatrix}1&1\\0&1\end{pmatrix}$
   squares to the identity). Secret permutation $P$: reverse the seven positions.
2. Message $m = 1011$. Scramble: $mS$ is the sum of rows 1, 3 and 4 of $S$: $1100 + 0011 +
   0001 = 1110$.
3. Encode: $1110 \cdot G = 1110\,|\,(110 + 101 + 011) = 1110\,000$. Permute (reverse):
   $0000111$. This is $m\hat G$ for the public $\hat G = SGP$.
4. Add one error, at position 2: $c = 0100111$. Send $c$.
5. The receiver undoes $P$ (reverse again): $1110010$. Syndrome with $H$: the first four bits
   pick columns 1, 2, 3 of $H$, $110 + 101 + 011 = 000$, and the last three bits add $010$. The
   syndrome $010$ is column 6 of $H$, so the error is at position 6 (position 2 before the
   reversal). Flip it: $1110000$.
6. The first four bits are $mS = 1110$. Multiply by $S^{-1} = S$: $1100 + 0100 + 0011 = 1011
   = m$.

</div>

<div class="mars-steps" markdown>

**Niederreiter with $t = 1$.**

1. The public key is $H$ (scrambled in a real system). A message is now a weight-1 vector: with
   seven positions there are seven messages, about 2.8 bits.
2. Message "position 5": $e = 0000100$. Ciphertext $s = He$ = column 5 of $H$ = $100$. Three
   bits, against seven for McEliece.
3. The receiver finds which column of $H$ equals $100$: column 5. That is the message.

</div>

A real message would need encoding as a weight-$t$ vector. Classic McEliece avoids that: as a
KEM, its "message" is a fresh random weight-$t$ vector, and the session key is derived from it.

### From encryption to a KEM

Textbook McEliece has the faults of any textbook public-key scheme. It is malleable: adding a
codeword to a ciphertext gives another valid ciphertext of a related message. It leaks when
the same message is sent twice with different errors: the sum of the two ciphertexts is the
sum of the two error vectors, which marks most of the error positions, and decoding the rest is
then easy (Thomas Berson, CRYPTO 1997). And a decryption oracle that reports failures teaches
an attacker which positions carry errors. Classic McEliece avoids all three with the KEM route
of [Chapter 3](03-KEMs-and-Signatures.md).

- **Key generation** produces the public $T$ (with $H = [I \mid T]$) and a private key holding
  $g$, the support $L$, and a random secret string $s$ of $n$ bits.
- **Encapsulation** draws a uniformly random $e$ of weight exactly $t$, computes $C = He$, and
  outputs the session key $K = \mathrm{SHAKE256}(1, e, C)$, 32 bytes.
- **Decapsulation** decodes $C$ to some $e'$. If the decoder succeeds and $e'$ has weight $t$
  and $He' = C$, the key is $\mathrm{SHAKE256}(1, e', C)$; otherwise it is
  $\mathrm{SHAKE256}(0, s, C)$. That is **implicit rejection**: a bad ciphertext gets a
  random-looking key, never an error message, so failures leak nothing an attacker can steer.

The ciphertext is just $C$. Round 2 of the competition had a 32-byte confirmation hash
appended; round 3 dropped it, which is why mceliece348864's ciphertext is 96 bytes rather than
128. Decapsulation is deterministic, and every valid ciphertext decodes, because Goppa decoding
of $t$ errors never fails. Classic McEliece therefore has no decryption-failure attacks of the
kind that worry lattice designers and BIKE (Chapter 14).

## 13.4 Binary Goppa codes

*Level: intermediate.*

Valery Goppa described his codes in 1970. Choose:

- a finite field $\mathrm{GF}(2^m)$;
- a **support** $L = (\alpha_1, \dots, \alpha_n)$ of $n$ distinct field elements;
- a **Goppa polynomial** $g(x)$ of degree $t$ over $\mathrm{GF}(2^m)$ with no roots in $L$.

The code is the set of binary vectors $c$ with

$$\sum_{j=1}^{n} \frac{c_j}{x - \alpha_j} \equiv 0 \pmod{g(x)}.$$

Equivalently, its parity checks are the rows $i = 0, \dots, t - 1$ of the matrix with entries
$\alpha_j^{\,i} / g(\alpha_j)$, each field element written as $m$ bits. That gives $mt$ binary
checks, so the code has dimension at least $n - mt$.

The useful fact: if $g$ is squarefree (Classic McEliece uses an irreducible $g$, which is), the
binary Goppa code for $g$ is the same as the one for $g^2$, and the $g^2$ description has $2t$
checks over $\mathrm{GF}(2^m)$. With $2t$ syndromes, standard algebraic decoding corrects $t$
errors. That is twice what the $mt$ binary checks would suggest, and it is why binary Goppa
codes give such good parameters. Without $L$ and $g$, though, the public matrix is just a
binary matrix. Until 2024 no one had a way to tell it from a random one at the sizes used
cheaper than decoding itself; the distinguishers of 2024 to 2026, and what they do and do not
give an attacker, are in §13.10.

Classic McEliece's parameter sets use $m = 12$ or $13$, $n$ from 3,488 to 8,192, and $t$ from 64
to 128. Its Goppa polynomial is irreducible of degree $t$ (made as the minimal polynomial of a
random element of $\mathrm{GF}(2^{m t})$), and its support is $n$ distinct elements of
$\mathrm{GF}(2^m)$ in a secret random order.

### A Goppa code by hand

The smallest interesting binary Goppa code fits on a page. Take $\mathrm{GF}(8)$, built from
$x^3 + x + 1$, with $\alpha$ a root, so $\alpha^3 = \alpha + 1$. Each element is three bits
(the coefficients of $\alpha^2$, $\alpha$, $1$):

| element | $0$ | $1$ | $\alpha$ | $\alpha^2$ | $\alpha^3$ | $\alpha^4$ | $\alpha^5$ | $\alpha^6$ |
|---|---|---|---|---|---|---|---|---|
| bits | 000 | 001 | 010 | 100 | 011 | 110 | 111 | 101 |

*Table 13.2. GF(8). Adding is XOR of the bits; multiplying adds exponents mod 7.*

Choose $g(x) = x^2 + x + 1$. Its roots lie in $\mathrm{GF}(4)$, which is not inside
$\mathrm{GF}(8)$, so $g$ has no roots here and is irreducible over $\mathrm{GF}(8)$. That lets
the support be the whole field, $L = (0, 1, \alpha, \alpha^2, \dots, \alpha^6)$, so $n = 8$
and $t = 2$.

1. **Evaluate $g$ on the support.** $g(0) = g(1) = 1$; $g(\alpha) = \alpha^2 + \alpha + 1 =
   100 + 010 + 001 = 111 = \alpha^5$; similarly $g(\alpha^2) = \alpha^3$, $g(\alpha^3) =
   \alpha^5$, $g(\alpha^4) = g(\alpha^5) = \alpha^6$, $g(\alpha^6) = \alpha^3$.
2. **Two rows over GF(8).** Row 0 has $1/g(\alpha_j)$: $1, 1, \alpha^2, \alpha^4, \alpha^2,
   \alpha, \alpha, \alpha^4$. Row 1 has $\alpha_j / g(\alpha_j)$: $0, 1, \alpha^3, \alpha^6,
   \alpha^5, \alpha^5, \alpha^6, \alpha^3$ (for example $\alpha / \alpha^5 = \alpha^{-4} =
   \alpha^3$).
3. **Expand to bits.** Each entry becomes a column of three bits, giving $mt = 6$ binary
   rows:

$$H = \begin{pmatrix}
0&0&1&1&1&0&0&1\\ 0&0&0&1&0&1&1&1\\ 1&1&0&0&0&0&0&0\\
0&0&0&1&1&1&1&0\\ 0&0&1&0&1&1&0&1\\ 0&1&1&1&1&1&1&1
\end{pmatrix}.$$

4. **Find the code.** The six rows are independent, so the code has dimension $8 - 6 = 2$:
   four codewords, $00000000$, $00111111$, $11001011$ and $11110100$. The smallest nonzero
   weight is 5, so the code corrects 2 errors, as the theory promised: twice what six parity
   checks on a general code would suggest.

The rate is poor ($k/n = 1/4$) because $mt$ is most of $n$. Real parameters take $n$ close to
$2^m$ and $mt$ between about 20 and 27 percent of $n$, which gives rates from 0.73 to 0.80.

### Decoding it by hand: Patterson's algorithm

Patterson's 1975 decoder works with the syndrome *modulo $g$*, which has $t$ coefficients over
$\mathrm{GF}(2^m)$, and still corrects $t$ errors. For a received word $y$ it runs:

<div class="mars-steps" markdown>

1. **Syndrome polynomial.** $S(x) = \sum_{j : y_j = 1} 1/(x - \alpha_j) \bmod g$. (For a
   codeword this is 0 by definition, so only the errors count.)
2. **Invert.** $T(x) = S(x)^{-1} \bmod g$.
3. **Square root.** $R(x) = \sqrt{T(x) + x} \bmod g$. Squaring is a bijection in
   characteristic 2, so the root exists and is unique.
4. **Half Euclid.** Find $a(x), b(x)$ with $a \equiv b R \pmod g$, $\deg a \le t/2$, $\deg b
   \le (t-1)/2$, by running the extended Euclidean algorithm on $g$ and $R$ until the
   remainder's degree drops to $t/2$ or below.
5. **Locator.** $\sigma(x) = a(x)^2 + x\, b(x)^2$. Its roots are the error positions.

</div>

For $g = x^2 + x + 1$ there is a short cut for step 1. Since $g(x) + g(a) = (x + a)(x + a +
1)$ in characteristic 2,

$$\frac{1}{x + a} \equiv \frac{x + a + 1}{g(a)} \pmod g.$$

Send the codeword $11001011$ and let the channel flip positions 3 and 6 (counting from 0),
whose support points are $\alpha^2$ and $\alpha^5$. The receiver sees $y = 11011001$.

- **Step 1.** The codeword part cancels, leaving the two errors. For $a = \alpha^2$: $a + 1 =
  101 = \alpha^6$ and $g(\alpha^2) = \alpha^3$, so the term is $(x + \alpha^6)/\alpha^3 =
  \alpha^4 x + \alpha^3$. For $a = \alpha^5$: $a + 1 = 110 = \alpha^4$ and $g(\alpha^5) =
  \alpha^6$, giving $\alpha x + \alpha^5$. Sum: $(\alpha^4 + \alpha) x + (\alpha^3 +
  \alpha^5) = \alpha^2 x + \alpha^2$. So $S(x) = \alpha^2 (x + 1)$.
- **Step 2.** By the short cut with $a = 1$, $1/(x + 1) = x / g(1) = x$. So $T(x) =
  \alpha^{-2} x = \alpha^5 x$.
- **Step 3.** $T + x = (\alpha^5 + 1) x = \alpha^4 x$. Square roots split: $\sqrt{\alpha^4} =
  \alpha^2$, and $\sqrt{x} = x + 1$ because $(x + 1)^2 = x^2 + 1 \equiv x \pmod g$. So $R(x) =
  \alpha^2 x + \alpha^2$.
- **Step 4.** With $t = 2$, $R$ already has degree 1, so $a = R$ and $b = 1$.
- **Step 5.** $\sigma(x) = (\alpha^2 x + \alpha^2)^2 + x = \alpha^4 x^2 + x + \alpha^4$. Check
  the roots: $\sigma(\alpha^2) = \alpha^8 + \alpha^2 + \alpha^4 = \alpha + \alpha^2 + \alpha^4
  = 010 + 100 + 110 = 0$, and $\sigma(\alpha^5) = \alpha^{14} + \alpha^5 + \alpha^4 = 001 + 111
  + 110 = 0$. Both errors found.

**Code it.** The same code and decoder in Python. The decoder is general (it would work for
any $t$ with an irreducible $g$); the last line runs it on every word within distance 2 of
every codeword.

```python
# A binary Goppa code by hand: GF(8), g(x) = x^2 + x + 1, support = all 8 field elements.
EXP, LOG = [0] * 14, [0] * 8             # GF(8) built from x^3 + x + 1; alpha = 2
v = 1
for i in range(7):
    EXP[i] = EXP[i + 7] = v
    LOG[v] = i
    v <<= 1
    if v & 8:
        v ^= 0b1011
def mul(a, b): return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]
def inv(a):    return EXP[7 - LOG[a]]
def name(a):   return "0" if a == 0 else "1" if a == 1 else "a" if a == 2 else "a^%d" % LOG[a]
def g(a):      return mul(a, a) ^ a ^ 1  # g(x) = x^2 + x + 1, no roots in GF(8)

L = [0] + [EXP[i] for i in range(7)]     # support: 0, 1, a, a^2, ..., a^6
print("g(alpha_j):", [name(g(a)) for a in L])
# Parity checks over GF(8): row i has alpha_j^i / g(alpha_j), i = 0, 1; then 3 bits per entry.
row0 = [inv(g(a)) for a in L]
row1 = [mul(a, inv(g(a))) for a in L]
H = [[(x >> b) & 1 for x in row] for row in (row0, row1) for b in (2, 1, 0)]
for r in H:
    print("".join(map(str, r)))
words = [w for w in range(256)
         if all(sum(r[j] * (w >> (7 - j) & 1) for j in range(8)) % 2 == 0 for r in H)]
print("codewords:", [format(w, "08b") for w in words])
```

It prints:

```text
g(alpha_j): ['1', '1', 'a^5', 'a^3', 'a^5', 'a^6', 'a^6', 'a^3']
00111001
00010111
11000000
00011110
00101101
01111111
codewords: ['00000000', '00111111', '11001011', '11110100']
```

The rows match the matrix above, and the four codewords are the ones found by hand. Now the
decoder, step by step on the example, then on all 148 words with at most two errors:

```python
# Uses mul(), inv(), name(), L and words from the listing above.
# Patterson's algorithm (1975) for the GF(8) Goppa code, g(x) = x^2 + x + 1, t = 2.
G, T = [1, 1, 1], 2                       # polynomials as coefficient lists, lowest degree first
def trim(p):
    while p and p[-1] == 0:
        p = p[:-1]
    return p
def padd(p, q):
    n = max(len(p), len(q))
    return trim([(p[i] if i < len(p) else 0) ^ (q[i] if i < len(q) else 0) for i in range(n)])
def pmul(p, q):
    r = [0] * (len(p) + len(q))
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] ^= mul(a, b)
    return trim(r)
def pdivmod(p, q):
    p, quo = trim(p[:]), [0] * max(1, len(p))
    while len(p) >= len(q):
        c, s = mul(p[-1], inv(q[-1])), len(p) - len(q)
        quo[s] = c
        p = padd(p, [0] * s + [mul(c, x) for x in q])
    return trim(quo), p
def pmod(p):  return pdivmod(p, G)[1]
def pinv(p):                              # inverse mod G by the extended Euclidean algorithm
    r0, r1, s0, s1 = G, pmod(p), [], [1]
    while len(r1) > 1:
        q, r = pdivmod(r0, r1)
        r0, r1, s0, s1 = r1, r, s1, padd(s0, pmul(q, s1))
    return pmul([inv(r1[0])], s1)
def psqrt(p):                             # in GF(8)[x]/g, a field of 2^6 elements: sqrt(u) = u^(2^5)
    for _ in range(5):
        p = pmod(pmul(p, p))
    return p
def peval(p, x):
    r = 0
    for c in reversed(p):
        r = mul(r, x) ^ c
    return r
def pname(p):
    return " + ".join(name(c) + ("" if i == 0 else "x" if i == 1 else "x^%d" % i)
                      for i, c in enumerate(p) if c) or "0"

def patterson(y, show=False):
    S = []                                 # syndrome S(x) = sum over set bits of 1/(x - alpha_j) mod g
    for j, a in enumerate(L):
        if y >> (7 - j) & 1:
            S = padd(S, pinv([a, 1]))
    if not S:
        return y
    Tp = pinv(S)
    R = psqrt(padd(Tp, [0, 1]))           # R = sqrt(T(x) + x) mod g
    r0, r1, b0, b1 = G, R, [], [1]        # find a = b R mod g with deg a <= t/2, deg b <= (t-1)/2
    while len(r1) - 1 > T // 2:
        q, r = pdivmod(r0, r1)
        r0, r1, b0, b1 = r1, r, b1, padd(b0, pmul(q, b1))
    sigma = padd(pmul(r1, r1), pmul([0, 1], pmul(b1, b1)))
    errs = [j for j, a in enumerate(L) if peval(sigma, a) == 0]
    if show:
        print("S(x) =", pname(S), "  T(x) = 1/S =", pname(Tp))
        print("R(x) = sqrt(T + x) =", pname(R), "  sigma(x) =", pname(sigma))
        print("error positions:", errs, "=", [name(L[j]) for j in errs])
    for j in errs:
        y ^= 1 << (7 - j)
    return y

y = int("11001011", 2) ^ int("00010010", 2)    # codeword 11001011, errors at positions 3 and 6
print("received:", format(y, "08b"))
print("decoded: ", format(patterson(y, show=True), "08b"))
ok = sum(patterson(c ^ e) == c for c in words for e in range(256) if bin(e).count("1") <= 2)
print("corrected", ok, "of", 4 * 37, "words with up to 2 errors")
```

It prints:

```text
received: 11011001
S(x) = a^2 + a^2x   T(x) = 1/S = a^5x
R(x) = sqrt(T + x) = a^2 + a^2x   sigma(x) = a^4 + 1x + a^4x^2
error positions: [3, 6] = ['a^2', 'a^5']
decoded:  11001011
corrected 148 of 148 words with up to 2 errors
```

Every intermediate value matches the hand computation. The code takes square roots as
$u^{32}$, since $\mathrm{GF}(8)[x]/(g)$ is a field of $2^6$ elements. Why the five steps work is
the subject of §13.6.

## 13.5 A toy Classic McEliece

*Level: intermediate.*

**Code it.** A complete toy with $\mathrm{GF}(2^8)$, $n = 128$ and $t = 8$: 64 parity checks,
an 8-kilobit public key and a 64-bit ciphertext. Key generation draws a random support and a
random squarefree Goppa polynomial, builds the $64 \times 128$ binary parity-check matrix,
and brings it to systematic form $[I \mid T]$. Encryption picks 8 random error positions and
outputs their syndrome. Decryption treats the ciphertext as a received word (the syndrome
padded with zeros, which has the same syndrome under $[I \mid T]$), computes the $2t$ syndromes
of the $g^2$ code, finds the error-locator polynomial with the Berlekamp-Massey algorithm, and
finds its roots.

```python
# A toy Classic McEliece (Niederreiter form) with a binary Goppa code over GF(2^8).
import random
random.seed(1978)
M, N, T = 8, 128, 8                      # field GF(2^8), code length 128, corrects 8 errors

EXP, LOG = [0] * 512, [0] * 256          # GF(2^8) with the polynomial x^8 + x^4 + x^3 + x^2 + 1
x = 1
for i in range(255):
    EXP[i] = EXP[i + 255] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
def mul(a, b):  return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]
def inv(a):     return EXP[255 - LOG[a]]
def peval(p, x):                         # p[0] + p[1] x + ..., by Horner's rule
    r = 0
    for c in reversed(p):
        r = mul(r, x) ^ c
    return r

def keygen():
    while True:
        L = random.sample(range(1, 256), N)                  # the support: N distinct points
        g = [random.randrange(256) for _ in range(T)] + [1]  # monic Goppa polynomial, degree T
        if any(peval(g, a) == 0 for a in L) or not squarefree(g):
            continue
        # Private parity checks: row i, column j is L_j^i / g(L_j), as M bits each.
        rows = []
        for i in range(T):
            vals = [mul(pow_gf(a, i), inv(peval(g, a))) for a in L]
            for bit in range(M):
                rows.append(sum(((v >> bit) & 1) << j for j, v in enumerate(vals)))
        H = systematic(rows)
        if H:
            return (L, g), H                                 # H = [I | T], as row bitmasks

def pow_gf(a, e):
    return 1 if e == 0 else EXP[(LOG[a] * e) % 255]

def squarefree(g):                       # gcd(g, g') = 1; in characteristic 2, g' keeps odd terms
    d = [g[i] if i % 2 else 0 for i in range(1, len(g))]
    while d and d[-1] == 0:
        d.pop()
    a, b = g[:], d
    while b:
        while len(a) >= len(b):
            if a[-1]:
                c = mul(a[-1], inv(b[-1]))
                for k in range(len(b)):
                    a[len(a) - len(b) + k] ^= mul(c, b[k])
            a.pop()
        a, b = b, a
        while b and b[-1] == 0:
            b.pop()
    return len(a) == 1

def systematic(rows):
    """Gaussian elimination over GF(2) to H = [I | T]; None if the left block is singular."""
    rows = rows[:]
    for c in range(len(rows)):
        p = next((r for r in range(c, len(rows)) if rows[r] >> c & 1), None)
        if p is None:
            return None
        rows[c], rows[p] = rows[p], rows[c]
        for r in range(len(rows)):
            if r != c and rows[r] >> c & 1:
                rows[r] ^= rows[c]
    return rows

def encrypt(H):                          # a random weight-T error vector e; ciphertext = H e
    e = sum(1 << j for j in random.sample(range(N), T))
    return e, sum((bin(row & e).count("1") & 1) << i for i, row in enumerate(H))

def decrypt(priv, c):
    L, g = priv
    v = c                                # (c, 0, ..., 0) has syndrome c under H = [I | T]
    # Syndromes for the Goppa code with g^2 (the same binary code, but now 2T checks).
    S = []
    for i in range(2 * T):
        s = 0
        for j, a in enumerate(L):
            if v >> j & 1:
                s ^= mul(pow_gf(a, i), inv(mul(peval(g, a), peval(g, a))))
        S.append(s)
    sigma = berlekamp_massey(S)
    e = 0
    for j, a in enumerate(L):            # error at j exactly when sigma(1 / L_j) = 0
        if peval(sigma, inv(a)) == 0:
            e |= 1 << j
    return e

def berlekamp_massey(S):
    C, B, l, m, b = [1], [1], 0, 1, 1
    for n_ in range(len(S)):
        d = S[n_]
        for i in range(1, l + 1):
            if i < len(C):
                d ^= mul(C[i], S[n_ - i])
        if d == 0:
            m += 1
            continue
        coef = mul(d, inv(b))
        newC = C[:] + [0] * max(0, len(B) + m - len(C))
        for i, x in enumerate(B):
            newC[i + m] ^= mul(coef, x)
        if 2 * l <= n_:
            B, l, b, m = C, n_ + 1 - l, d, 1
        else:
            m += 1
        C = newC
    return C

priv, H = keygen()
e, c = encrypt(H)
print("public key:", len(H), "x", N, "bits; ciphertext:", len(H), "bits")
print("decrypted error vector correct:", decrypt(priv, c) == e)
```

It prints:

```text
public key: 64 x 128 bits; ciphertext: 64 bits
decrypted error vector correct: True
```

The decoder recovers the exact 8 error positions. The real scheme has the same steps with $m =
12$ or $13$ and a careful constant-time implementation of each: field arithmetic, the
Berlekamp-Massey algorithm, and root finding by evaluating the locator at every support
element (Classic McEliece uses an additive FFT for that).

## 13.6 Why decoding works

*Level: intermediate.*

The decoder in the listing has three steps, each standard coding theory.

1. **Syndromes.** For a received word $v$ with errors in a set $E$, the $g^2$-syndromes are
   $S_i = \sum_{j \in E} \alpha_j^{\,i} / g(\alpha_j)^2$ for $i = 0, \dots, 2t - 1$ (the
   codeword part contributes nothing). These are $2t$ "power sums" of the unknown error
   positions, with weights.
2. **The error locator.** The polynomial $\sigma(x) = \prod_{j \in E} (1 - \alpha_j x)$ has
   degree $|E| \le t$ and satisfies a linear recurrence with the $S_i$. The Berlekamp-Massey
   algorithm (Berlekamp 1968, Massey 1969) finds the shortest such recurrence from $2t$ terms.
   This is the step that needs $2t$ syndromes for $t$ errors, and the $g^2$ trick supplies them.
3. **Roots.** $\sigma(1/\alpha_j) = 0$ exactly when $j$ is an error position. Test every
   support element.

The same machinery decodes Reed-Solomon codes in CDs, QR codes and deep-space links. Goppa codes
are subfield subcodes of generalized Reed-Solomon codes, binary codes cut out of a code over
$\mathrm{GF}(2^m)$, and that cutting is what hides the algebraic structure from an attacker
(§13.8).

### Why Patterson's algorithm works

Patterson's decoder, run by hand in §13.4, reaches the same locator by a different road. Let
$E$ be the set of error positions and define the locator the other way round, $\sigma(x) =
\prod_{j \in E} (x - \alpha_j)$, whose roots are the error points themselves. Its formal
derivative is $\sigma'(x) = \sum_{j \in E} \prod_{i \in E, i \ne j} (x - \alpha_i)$, so

$$S(x) = \sum_{j \in E} \frac{1}{x - \alpha_j} = \frac{\sigma'(x)}{\sigma(x)}, \qquad
\text{hence}\qquad \sigma(x)\, S(x) \equiv \sigma'(x) \pmod{g}.$$

Now use characteristic 2. Split $\sigma$ into its even and odd parts, $\sigma(x) = a(x)^2 + x\,
b(x)^2$: every polynomial over $\mathrm{GF}(2^m)$ can be written this way, because every field
element is a square. Differentiate: $(a^2)' = 2aa' = 0$ and $(x b^2)' = b^2$, so $\sigma' =
b^2$. The key equation becomes

$$\bigl(a^2 + x b^2\bigr) S \equiv b^2 \pmod g \quad\Longrightarrow\quad a^2 \equiv b^2
\bigl(S^{-1} + x\bigr) = b^2 (T + x) \pmod g \quad\Longrightarrow\quad a \equiv b\,R \pmod g,$$

taking square roots, which are unique modulo an irreducible $g$. Since $\deg \sigma = |E| \le
t$, the even part has $\deg a \le t/2$ and the odd part $\deg b \le (t - 1)/2$. A pair of
polynomials that small satisfying $a \equiv bR$ is unique up to a constant factor, and the
extended Euclidean algorithm stopped halfway finds it, exactly as it finds a rational
reconstruction of a number. Then $\sigma = a^2 + x b^2$ follows.

The trick is that squaring halves the unknowns: instead of finding a degree-$t$ locator from
$2t$ equations, Patterson finds two polynomials of degree about $t/2$ from $t$ equations. The
alternant decoder of §13.5 spends the extra equations instead, by working modulo $g^2$. Both
correct exactly $t$ errors, and both end with the same root search.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Two decoding routes for binary Goppa codes: Patterson's, with the example's values under each step, and the alternant route with 2t syndromes and Berlekamp-Massey" fill="currentColor" font-size="13">
  <defs><marker id="ar13b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" font-weight="700">Patterson (1975): t syndrome coefficients, modulo g</text>
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="10" y="32" width="90" height="40" rx="4"/><rect x="116" y="32" width="90" height="40" rx="4"/>
    <rect x="222" y="32" width="90" height="40" rx="4"/><rect x="328" y="32" width="90" height="40" rx="4"/>
    <rect x="434" y="32" width="90" height="40" rx="4"/><rect x="540" y="32" width="90" height="40" rx="4"/>
  </g>
  <g stroke="currentColor" stroke-width="1.5" marker-end="url(#ar13b)">
    <line x1="100" y1="52" x2="114" y2="52"/><line x1="206" y1="52" x2="220" y2="52"/>
    <line x1="312" y1="52" x2="326" y2="52"/><line x1="418" y1="52" x2="432" y2="52"/>
    <line x1="524" y1="52" x2="538" y2="52"/>
  </g>
  <g text-anchor="middle">
    <text x="55" y="57">S(x) mod g</text><text x="161" y="57">T = 1/S</text>
    <text x="267" y="57">R = √(T + x)</text><text x="373" y="57">a ≡ b·R</text>
    <text x="479" y="57">σ = a² + x b²</text><text x="585" y="57">roots of σ</text>
    <g font-size="11" fill-opacity=".7">
      <text x="55" y="90">α²x + α²</text><text x="161" y="90">α⁵x</text>
      <text x="267" y="90">α²x + α²</text><text x="373" y="90">a = R, b = 1</text>
      <text x="479" y="90">α⁴x² + x + α⁴</text><text x="585" y="90">α², α⁵</text>
    </g>
  </g>
  <text x="10" y="132" font-weight="700">Alternant route (Classic McEliece): 2t syndromes, modulo g²</text>
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="10" y="144" width="130" height="40" rx="4"/><rect x="170" y="144" width="140" height="40" rx="4"/>
    <rect x="340" y="144" width="130" height="40" rx="4"/><rect x="500" y="144" width="130" height="40" rx="4"/>
  </g>
  <g stroke="currentColor" stroke-width="1.5" marker-end="url(#ar13b)">
    <line x1="140" y1="164" x2="168" y2="164"/><line x1="310" y1="164" x2="338" y2="164"/>
    <line x1="470" y1="164" x2="498" y2="164"/>
  </g>
  <g text-anchor="middle">
    <text x="75" y="169">S₀ … S₂ₜ₋₁</text><text x="240" y="169">Berlekamp-Massey</text>
    <text x="405" y="169">locator σ(x)</text><text x="565" y="169">roots: σ(1/αⱼ) = 0</text>
  </g>
  <text x="320" y="214" text-anchor="middle" font-size="12" fill-opacity=".7">Both correct t errors; Berlekamp-Massey is easier to make constant-time.</text>
</svg>
<figcaption>Figure 13.3. Two roads to the error locator. The upper row carries the values from the hand-decoded GF(8) example of §13.4; the lower row is the decoder in the §13.5 listing and in Classic McEliece's reference code.</figcaption>
</figure>

### Decoding in constant time

The decoder is where the secrets are used, so it is where implementations leak. Patterson's
algorithm has data-dependent steps everywhere: the Euclidean algorithm's number of rounds
depends on the error pattern. Falko Strenzke and coauthors showed from 2008 onward that timing
differences in McEliece decoders reveal the error vector and, in some implementations, the
secret permutation.

McBits (2013) and Chou's "McBits revisited" (2017) made every step a fixed sequence of
operations on bits. Field elements are processed in **bitsliced** form, many decodings' worth
of the same bit position packed into one machine word. Berlekamp-Massey always runs its full
$2t$ iterations, with conditional updates done by masks. Root finding evaluates the locator at
*every* element of $\mathrm{GF}(2^m)$ with an additive fast Fourier transform (Shuhong Gao and
Todd Mateer, 2010), so no branch depends on where the roots are. The secret order of the
support is applied by a **Beneš network**, a fixed layout of conditional swaps whose control
bits are the secret; the private key stores those bits (§13.9). The general method is in the
[implementation chapter](17-Implementing-Post-Quantum-Safely.md).

Constant time does not end the story. Qian Guo, Andreas Johansson and Thomas Johansson (TCHES
2022) recovered key material from power traces of the additive FFT step on a microcontroller,
and a 2025 paper (ePrint 2025/2043) recovered the full secret support from power traces of
*unprotected* Berlekamp-Massey implementations. Where a device can be measured, use a library
hardened against physical attacks.

## 13.7 Break it: information-set decoding

*Level: intermediate.*

The attacker sees $H$ and $c = He$ and wants $e$, a vector of weight $t$. In 1962 Eugene Prange
proposed the simplest strategy that still underlies every serious attack. Pick $n - k$ columns
of $H$ at random and hope all $t$ errors fall among them. If they do, $c$ is a combination of
those columns only, and Gaussian elimination finds which ones. Check that the answer has weight
$t$; if not, pick again.

**Break it.** Prange's algorithm on the toy key.

```python
# Uses keygen() and encrypt() from the listing above.
# Break the toy with Prange's information-set decoding (1962): guess that all errors sit in
# a random set of columns, solve the linear system there, and check the weight.
R = len(H)                                # 64 parity checks
cols = [sum((H[i] >> j & 1) << i for i in range(R)) for j in range(N)]   # columns as bitmasks
def prange(c):
    tries = 0
    while True:
        tries += 1
        pick = random.sample(range(N), R)
        # Solve: which subset of the picked columns adds up to c? (elimination over GF(2))
        basis = []                        # pairs (vector, which picked columns make it)
        for k, j in enumerate(pick):
            v, mask = cols[j], 1 << k
            for bv, bm in basis:
                if v ^ bv < v:
                    v, mask = v ^ bv, mask ^ bm
            if v:
                basis.append((v, mask))
                basis.sort(reverse=True)
        v, mask = c, 0
        for bv, bm in basis:
            if v ^ bv < v:
                v, mask = v ^ bv, mask ^ bm
        if v == 0 and bin(mask).count("1") == T:
            return sum(1 << pick[k] for k in range(R) if mask >> k & 1), tries
random.seed(62)
e, c = encrypt(H)
found, tries = prange(c)
print("Prange recovered the error vector:", found == e, "after", tries, "guesses")
```

It prints:

```text
Prange recovered the error vector: True after 522 guesses
```

Each guess succeeds with probability $\binom{n-k}{t} / \binom{n}{t}$, which for the toy is about
$2^{-8.3}$, so a few hundred guesses are expected, as observed.

### Lee-Brickell and Stern: let a few errors out

Prange insists that *all* $t$ errors land in the chosen columns. Every later algorithm relaxes
that and pays with a search. Put the matrix in the attacker's working form: permute the columns at random, then row-reduce so that $r = n - k$ of them (the
**pivot** columns) become the identity. The syndrome becomes $s'$, the other $k$ columns form
a matrix $Q$, and the unknown error splits into a pivot part $e_1$ and a rest $e_2$ with

$$s' = e_1 + Q\, e_2 .$$

- **Prange (1962)** bets that $e_2 = 0$. Then $e_1 = s'$, and the test is whether $s'$ has
  weight $t$.
- **Lee and Brickell (1988)** allow $p$ errors in the rest. For every weight-$p$ choice of
  $e_2$, compute $s' + Q e_2$ and test whether its weight is $t - p$. With $p = 2$ a single
  elimination now succeeds far more often, at the price of $\binom{k}{2}$ cheap tests.
- **Stern (1989)** splits the $k$ rest columns into two halves, puts $p$ errors in each, and
  also bets that a window of $\ell$ pivot rows is error-free. Then on those $\ell$ rows,
  $Q_X e_X = s' + Q_Y e_Y$, a **collision** between a list built from the left half and a list
  built from the right, which hashing finds without trying every pair. Dumer's 1991 variant is
  close to the same idea.

The success chance per elimination of each bet is a ratio of counts:

$$P_{\text{Prange}} = \frac{\binom{r}{t}}{\binom{n}{t}},\qquad
P_{\text{LB}} = \frac{\binom{r}{t-p}\binom{k}{p}}{\binom{n}{t}},\qquad
P_{\text{Stern}} = \frac{\binom{r-\ell}{t-2p}\binom{k/2}{p}^2}{\binom{n}{t}}.$$

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Where Prange, Lee-Brickell and Stern expect the t errors: in the pivot columns, in the other columns, and in Stern's window and two halves" fill="currentColor" font-size="13">
  <text x="190" y="20" text-anchor="middle" font-weight="700">r = n − k pivot columns (identity)</text>
  <text x="490" y="20" text-anchor="middle" font-weight="700">k other columns (Q)</text>
  <text x="10" y="58">Prange</text>
  <rect x="100" y="40" width="270" height="28" fill-opacity=".25" stroke="currentColor"/>
  <rect x="370" y="40" width="250" height="28" fill="none" stroke="currentColor"/>
  <text x="235" y="59" text-anchor="middle">all t errors</text><text x="495" y="59" text-anchor="middle">0 errors</text>
  <text x="10" y="118">Lee-Brickell</text>
  <rect x="100" y="100" width="270" height="28" fill-opacity=".25" stroke="currentColor"/>
  <rect x="370" y="100" width="250" height="28" fill-opacity=".1" stroke="currentColor"/>
  <text x="235" y="119" text-anchor="middle">t − p errors</text><text x="495" y="119" text-anchor="middle">p errors (try all C(k, p))</text>
  <text x="10" y="178">Stern</text>
  <rect x="100" y="160" width="60" height="28" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
  <rect x="160" y="160" width="210" height="28" fill-opacity=".25" stroke="currentColor"/>
  <rect x="370" y="160" width="125" height="28" fill-opacity=".1" stroke="currentColor"/>
  <rect x="495" y="160" width="125" height="28" fill-opacity=".1" stroke="currentColor"/>
  <text x="130" y="179" text-anchor="middle">0 in ℓ</text><text x="265" y="179" text-anchor="middle">t − 2p errors</text>
  <text x="432" y="179" text-anchor="middle">p in X</text><text x="557" y="179" text-anchor="middle">p in Y</text>
  <text x="130" y="206" text-anchor="middle" font-size="11" fill-opacity=".7">window</text>
  <text x="495" y="206" text-anchor="middle" font-size="11" fill-opacity=".7">X and Y collide on the ℓ window bits</text>
  <text x="320" y="238" text-anchor="middle" font-size="12" fill-opacity=".7">Each bet fails most of the time; the attacker re-permutes, re-eliminates and bets again.</text>
</svg>
<figcaption>Figure 13.4. The three bets of information-set decoding. Moving a few errors out of the pivot set makes each bet far more likely to be right; Stern's window turns the search for those few errors into a collision search.</figcaption>
</figure>

**Break it, three ways.** The listing runs all three on one toy ciphertext, 20 times each,
and counts eliminations (the expensive step) and candidate tests (the cheap one).

```python
# Uses keygen(), encrypt(), H, N, T and R from the listings above.
# Three generations of information-set decoding on the same toy ciphertext:
# Prange (1962), Lee-Brickell (1988, p = 2) and Stern (1989, p = 1 on each half, window l = 4).
from math import comb
from itertools import combinations
def reduce_random(c):
    """Permute the columns at random and eliminate: R pivot columns become the identity.
    Returns the pivot columns, the other columns as R-bit vectors q_j, and the new syndrome."""
    order = random.sample(range(N), N)
    rows = [sum((H[i] >> j & 1) << k for k, j in enumerate(order)) | (c >> i & 1) << N
            for i in range(R)]
    pivots, r = [], 0
    for k in range(N):
        p = next((i for i in range(r, R) if rows[i] >> k & 1), None)
        if p is None:
            continue
        rows[r], rows[p] = rows[p], rows[r]
        for i in range(R):
            if i != r and rows[i] >> k & 1:
                rows[i] ^= rows[r]
        pivots.append(order[k])
        r += 1
        if r == R:
            break
    pset = set(pivots)
    others = [(j, sum((rows[i] >> k & 1) << i for i in range(R)))
              for k, j in enumerate(order) if j not in pset]
    s = sum((rows[i] >> N & 1) << i for i in range(R))
    return pivots, others, s

def wt(v): return bin(v).count("1")
def error_from(pivots, s_left, extra):  # pivot bits of the leftover syndrome, plus the chosen columns
    return sum(1 << pivots[i] for i in range(R) if s_left >> i & 1) | sum(1 << j for j in extra)

def isd(c, method):
    tries = checks = 0
    while True:
        tries += 1
        pivots, others, s = reduce_random(c)
        if method == "Prange":
            checks += 1
            if wt(s) == T:
                return error_from(pivots, s, []), tries, checks
        elif method == "Lee-Brickell":           # exactly 2 errors outside the pivot columns
            for (a, qa), (b, qb) in combinations(others, 2):
                checks += 1
                if wt(s ^ qa ^ qb) == T - 2:
                    return error_from(pivots, s ^ qa ^ qb, [a, b]), tries, checks
        else:                                     # Stern: one error in each half, none in the window
            mask, half = (1 << 4) - 1, len(others) // 2
            table = {}
            for a, qa in others[:half]:
                table.setdefault((s ^ qa) & mask, []).append((a, qa))
            for b, qb in others[half:]:
                for a, qa in table.get(qb & mask, []):
                    checks += 1
                    if wt(s ^ qa ^ qb) == T - 2:
                        return error_from(pivots, s ^ qa ^ qb, [a, b]), tries, checks

K = N - R
expect = {"Prange": comb(R, T), "Lee-Brickell": comb(R, T - 2) * comb(K, 2),
          "Stern": comb(K // 2, 1) ** 2 * comb(R - 4, T - 2)}
random.seed(1989)
e, c = encrypt(H)
for method in ("Prange", "Lee-Brickell", "Stern"):
    runs = [isd(c, method) for _ in range(20)]
    assert all(found == e for found, _, _ in runs)
    print(f"{method:13s} eliminations {sum(r[1] for r in runs) / 20:6.1f} (expected "
          f"{comb(N, T) / expect[method]:5.1f}), candidate checks {sum(r[2] for r in runs) / 20:7.1f}")
```

It prints:

```text
Prange        eliminations  272.2 (expected 323.0), candidate checks   272.2
Lee-Brickell  eliminations    7.5 (expected   9.5), candidate checks 14039.7
Stern         eliminations   28.9 (expected  27.9), candidate checks  1823.0
```

All 60 runs found the right error vector. Lee-Brickell needs about 35 times fewer
eliminations than Prange but tests 2,016 pairs after each; Stern sits between, because its
window rejects most pairs before they are tested. On real sizes the elimination of a $768
\times 3488$ matrix and the list sizes dominate, and $p$ and $\ell$ are tuned to balance them.

### How far from the real thing

**Fix it** with size: the same formulas for the real parameter sets. First Prange alone, with
the key and ciphertext sizes that follow from $m$, $n$ and $t$:

```python
# How many Prange guesses would the real Classic McEliece parameter sets need?
from math import comb, log2
SETS = [("mceliece348864", 12, 3488, 64), ("mceliece460896", 13, 4608, 96),
        ("mceliece6688128", 13, 6688, 128), ("mceliece6960119", 13, 6960, 119),
        ("mceliece8192128", 13, 8192, 128)]
print("toy (n=128, t=8): Prange guesses about 2^%.1f" % log2(comb(128, 8) / comb(64, 8)))
for name, m, n, t in SETS:
    r = m * t                                     # parity checks
    guesses = comb(n, t) / comb(r, t)             # a guess works if all t errors fall in its r columns
    pk = r * -(-(n - r) // 8)                     # the T part of H = [I | T], rows padded to bytes
    print(f"{name}: public key {pk:9,d} B, ciphertext {-(-r // 8):3d} B, Prange guesses about 2^{log2(guesses):.0f}")
```

It prints:

```text
toy (n=128, t=8): Prange guesses about 2^8.3
mceliece348864: public key   261,120 B, ciphertext  96 B, Prange guesses about 2^143
mceliece460896: public key   524,160 B, ciphertext 156 B, Prange guesses about 2^185
mceliece6688128: public key 1,044,992 B, ciphertext 208 B, Prange guesses about 2^262
mceliece6960119: public key 1,047,319 B, ciphertext 194 B, Prange guesses about 2^263
mceliece8192128: public key 1,357,824 B, ciphertext 208 B, Prange guesses about 2^300
```

Prange's plain algorithm needs about $2^{143}$ guesses for the smallest set, each a large
Gaussian elimination. The next listing prices each step in a deliberately crude model: an elimination costs about $r^2 n / 2$ bit operations, a candidate test about $p r$,
and memory is free. It searches the best $p$ (and $\ell$ for Stern) and also prints
$t \log_2 (n/r) = t \log_2 \frac{1}{1-R}$, a quantity explained below.

```python
# A crude cost model for Prange, Lee-Brickell and Stern on the real parameter sets.
# One iteration = one Gaussian elimination (about r*r*n/2 bit operations) plus the
# candidate work; we search for the best p and window l. Memory is free here, which flatters Stern.
from math import comb, log2
SETS = [("mceliece348864", 12, 3488, 64), ("mceliece460896", 13, 4608, 96),
        ("mceliece6688128", 13, 6688, 128), ("mceliece6960119", 13, 6960, 119),
        ("mceliece8192128", 13, 8192, 128)]
def prange(n, r, t):
    return log2(comb(n, t) / comb(r, t) * r * r * n / 2)
def lee_brickell(n, r, t):
    k, best = n - r, 999
    for p in range(1, 4):
        it = comb(n, t) / (comb(r, t - p) * comb(k, p))
        best = min(best, log2(it * (r * r * n / 2 + comb(k, p) * p * r)))
    return best
def stern(n, r, t):
    k, best = n - r, 999
    for p in range(1, 5):
        L = comb(k // 2, p)
        for l in range(10, 60):
            it = comb(n, t) / (L * L * comb(r - l, t - 2 * p))
            per = r * r * n / 2 + 2 * L * p * l + L * L / 2 ** l * 2 * p * r
            best = min(best, log2(it * per))
    return best
print(f"{'log2 of cost':16s} {'t*log2(n/r)':>12s} {'Prange':>8s} {'Lee-Brickell':>13s} {'Stern':>7s}")
for name, m, n, t in SETS:
    r = m * t
    print(f"{name:16s} {t * log2(n / r):12.1f} {prange(n, r, t):8.1f} {lee_brickell(n, r, t):13.1f} {stern(n, r, t):7.1f}")
```

It prints:

```text
log2 of cost      t*log2(n/r)   Prange  Lee-Brickell   Stern
mceliece348864          139.7    172.7         160.6   147.4
mceliece460896          180.9    216.6         203.7   189.2
mceliece6688128         256.9    295.5         281.5   264.9
mceliece6960119         258.2    296.4         282.5   265.6
mceliece8192128         294.3    333.5         319.2   301.4
```

In this model Stern takes about 25 bits off Prange's total for mceliece348864, landing near
$2^{147}$, close to the $2^{143}$ that NIST uses as the cost of breaking AES-128 for
category 1. Careful estimates reuse most of each elimination between iterations (Canteaut and
Chabaud's trick) and differ on whether memory is charged; published figures for the best
decoding attacks on mceliece348864 fall roughly between $2^{140}$ and $2^{155}$ bit
operations. The listing shows the shape; estimators such as Esser and Bellini's set parameters.

### BJMM and the exponents

After Stern, progress came from three ideas. **Ball-collision decoding** (Bernstein, Lange
and Peters, 2011) lets a few errors fall into the window too. **Representations** (May, Meurer
and Thomae, 2011) write the weight-$p$ part of the error as a sum of two lighter vectors in
many ways; since any one representation will do, the lists can be cut by a random constraint
and still contain a solution. **BJMM** (Becker, Joux, May and Meurer, 2012) let the two halves
overlap, with positions where both are 1 and cancel ("$1 + 1 = 0$" in the paper's title),
which gives more representations and harder filtering in a three-level tree of merges. May and
Ozerov (2015) and Both and May (2018) then used nearest-neighbor search.

For random codes at the hardest rate the costs are quoted as $2^{cn}$, and $c$ fell slowly:
about 0.121 for Prange, 0.117 for Stern, 0.112 for May-Meurer-Thomae, 0.102 for BJMM, and
below 0.1 with nearest-neighbor methods. Sixty years cut the exponent by about a quarter.

McEliece is not in that regime. Its errors are sparse: $t$ is a vanishing fraction of $n$ as
codes grow. Rodolfo Canto Torres and Nicolas Sendrier proved in 2016 that for such sublinear
weights *every* ISD variant has the same leading cost,

$$2^{\,t \log_2 \frac{1}{1-R}\,(1 + o(1))},$$

where $R = k/n$ is the rate. That is the first column of the listing above: 139.7 bits for
mceliece348864, against 143 for plain Prange. All the cleverness of Stern, BJMM and their
successors lives in the $o(1)$ term: worth some bits, counted in the parameter sets, but unable
to change the scale of the problem. This is why McEliece's security estimates have moved so
little since 1978.

**A quantum attacker** gains through Grover's algorithm applied inside the search (Bernstein,
2010), which roughly halves the exponent of the guessing part; quantum walks with
representations (Kachigar and Tillich, 2017) add a little more. Each Grover step is a full
Gaussian elimination as a very deep reversible circuit, and NIST's categories limit depth
([Chapter 2](02-Security-Levels.md)).

## 13.8 Codes that failed

*Level: intermediate.*

McEliece with Goppa codes has survived; McEliece with many other codes has not. The pattern is
instructive: every code chosen for smaller keys had more visible structure, and the structure
leaked.

- **Generalized Reed-Solomon codes** (Niederreiter's original choice, 1986): broken in 1992 by
  Sidelnikov and Shestakov, who recovered the secret structure from the public key in
  polynomial time.
- **Reed-Muller codes** (Sidelnikov's own proposal, 1994): broken by Minder and Shokrollahi
  (2007) and later more efficiently by Chizhov and Borodin.
- **Quasi-cyclic and quasi-dyadic Goppa or alternant codes**, used to shrink keys: several
  were broken by algebraic attacks (Faugère, Otmani, Perret and Tillich, EUROCRYPT 2010).
- **High-rate Goppa codes**: Faugère, Gauthier-Umaña, Otmani, Perret and Tillich (2011) showed
  that when $n - k$ is very small, the public matrix *can* be told apart from random. The
  rates used in Classic McEliece are far from that regime, and the distinguisher does not
  give a key-recovery attack even where it works.

Binary Goppa codes owe their resilience to being binary subfield subcodes: the structure that
an algebraic attack would need lives over $\mathrm{GF}(2^m)$, and the public key only shows its
binary shadow. Chapter 14 covers the other road to small keys: codes with no algebraic decoder
at all, decoded probabilistically. The candidates of NIST's competition that fell, code-based
and otherwise, are told from the attacker's side in
[Chapter 16 of the cryptanalysis book](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md).

### The Sidelnikov-Shestakov attack in outline

A generalized Reed-Solomon code over $\mathrm{GF}(q)$ is given by distinct points $a_1, \dots,
a_n$ and nonzero multipliers $v_1, \dots, v_n$: its codewords are $\bigl(v_1 f(a_1), \dots, v_n
f(a_n)\bigr)$ for all polynomials $f$ of degree below $k$. Niederreiter's key hid $a$ and $v$
behind a scrambled generator matrix. Sidelnikov and Shestakov's observation was that
scrambling cannot hide what the code *is*:

1. Bring the public generator matrix to systematic form $[I_k \mid B]$. Row $i$ of it is the
   codeword whose polynomial vanishes at the other $k - 1$ information points, so every
   entry of $B$ is an explicit rational expression in the $a$'s and $v$'s.
2. Ratios of entries in two rows cancel the multipliers and leave cross-ratios of the points
   $a_j$. The points are only defined up to a change of variable $a \mapsto (\alpha a +
   \beta)/(\gamma a + \delta)$, so fix three of them to $0$, $1$ and $\infty$; the cross-ratios
   then give all the others by solving linear equations.
3. With the points known, the multipliers follow from one more linear system, and the
   attacker holds an equivalent private key and the fast decoder that goes with it.

Every step is polynomial in $n$. A Goppa code is the binary subcode of a GRS code, but only
its *binary* codewords are public, and the systematic-form entries are no longer the rational
expressions the attack needs. That gap held for thirty years; the 2026 attacks of §13.10 try to
cross it another way, through quadratic relations among the coordinates.

## 13.9 Classic McEliece in the world

*Level: expert.*

Classic McEliece (Bernstein, Chou, Lange, von Maurich, Misoczki, Niederhagen, Persichetti,
Peters, Schwabe, Sendrier, Szefer, Wang and others) is the conservative Niederreiter KEM with
binary Goppa codes.

| set | $m$ | $n$ | $t$ | public key | private key | ciphertext | category |
|---|---|---|---|---|---|---|---|
| mceliece348864 | 12 | 3,488 | 64 | 261,120 B | 6,492 B | 96 B | 1 |
| mceliece460896 | 13 | 4,608 | 96 | 524,160 B | 13,608 B | 156 B | 3 |
| mceliece6688128 | 13 | 6,688 | 128 | 1,044,992 B | 13,932 B | 208 B | 5 |
| mceliece6960119 | 13 | 6,960 | 119 | 1,047,319 B | 13,948 B | 194 B | 5 |
| mceliece8192128 | 13 | 8,192 | 128 | 1,357,824 B | 14,120 B | 208 B | 5 |

*Table 13.3. Classic McEliece parameter sets (round 4 submission, 2022). Public key and
ciphertext sizes follow from $m$, $n$ and $t$, as the code in §13.7 computes; private-key
sizes are from the submission.*

The shape is the opposite of ML-KEM's: a public key hundreds of times bigger (ML-KEM-768's is
1,184 bytes), a ciphertext several times smaller (1,088 bytes for ML-KEM-768). Key generation
is slow (it must find a systematic form of a large matrix), encapsulation and decapsulation
are fast.

### Why the public key is big and the private key small

The public key is the $k \times (n - k)$ block $T$ of a systematic parity-check matrix, and
§13.2 showed that this is already the minimum for a matrix with no visible structure: 261,120
bytes at category 1, all needed to make it look random, which is the whole security argument.
The only ways to shrink it are to give the code structure, such as quasi-cyclic blocks
described by one row each, or to change the code family; §13.8 records how that went. Classic
McEliece's name says "classic" because the code is McEliece's own, and the keys are the price.

The private key, by contrast, is a description of the *structure*, and structure is small:
the Goppa polynomial is $t$ field elements, and the support is a permutation of the field. The
format stores five things, and their sizes can be added by hand. For mceliece348864: a 32-byte
seed from which the key was made; an 8-byte field used by the faster key generation; $g$ as
$t = 64$ coefficients of two bytes each, 128 bytes; the support order as the control bits of a
Beneš network on $2^m$ elements, $(2m - 1)\,2^{m-1} = 23 \times 2{,}048 = 47{,}104$ bits or
5,888 bytes; and the secret string $s$ for implicit rejection, $n = 3{,}488$ bits or 436 bytes.
The total is 6,492 bytes, the figure in Table 13.3.

**Code it.** The same sum for every set:

```python
# Classic McEliece private-key sizes from the format: a 32-byte seed, an 8-byte field used by
# the faster "f" key generation, g (2 bytes per coefficient), the control bits of a Benes
# network that applies the secret support order, and the n-bit implicit-rejection string s.
SETS = [("mceliece348864", 12, 3488, 64), ("mceliece460896", 13, 4608, 96),
        ("mceliece6688128", 13, 6688, 128), ("mceliece6960119", 13, 6960, 119),
        ("mceliece8192128", 13, 8192, 128)]
for name, m, n, t in SETS:
    benes = (2 * m - 1) * 2 ** (m - 1) // 8
    total = 32 + 8 + 2 * t + benes + n // 8
    print(f"{name:16s} 32 + 8 + {2 * t:3d} + {benes:6,d} + {n // 8:5,d} = {total:6,d} bytes")
```

It prints:

```text
mceliece348864   32 + 8 + 128 +  5,888 +   436 =  6,492 bytes
mceliece460896   32 + 8 + 192 + 12,800 +   576 = 13,608 bytes
mceliece6688128  32 + 8 + 256 + 12,800 +   836 = 13,932 bytes
mceliece6960119  32 + 8 + 238 + 12,800 +   870 = 13,948 bytes
mceliece8192128  32 + 8 + 256 + 12,800 + 1,024 = 14,120 bytes
```

Every line matches the submission's private-key sizes. The Beneš network dominates: it is the
compact way to store "which field element sits at which position", and it doubles as the
constant-time way to apply that order during decoding (§13.6).

**Key generation** makes all this from the seed: generate a random irreducible $g$ and a random
ordering of the field, build the $mt \times n$ binary parity-check matrix, and reduce it to
$[I \mid T]$. The reduction fails if the first $mt$ columns are not independent, which for a
random-looking matrix happens about 71 percent of the time (a random square binary matrix is
invertible with probability about 0.289), so a key takes three or four attempts on average.
The "f" sets (mceliece348864f and so on) let the pivots come from a slightly wider window of
columns, which almost always succeeds, for faster key generation with the same sizes. Roughly,
key generation costs tens of milliseconds or more on a desktop core; encapsulation and
decapsulation take tens of microseconds.

<figure class="mars-fig">
<svg viewBox="0 0 640 390" width="640" role="img" aria-label="Logarithmic bar chart of public key and ciphertext sizes in bytes: X25519 32 and 32; ML-KEM-768 1,184 and 1,088; BIKE-L1 1,541 and 1,573; HQC-1 2,249 and 4,433; FrodoKEM-640 9,616 and 9,720; mceliece348864 261,120 and 96; mceliece6688128 1,044,992 and 208" fill="currentColor" font-size="13">
<line x1="190" y1="40" x2="190" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="190" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">10 B</text>
<line x1="260" y1="40" x2="260" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="260" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">100 B</text>
<line x1="330" y1="40" x2="330" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="330" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">1 kB</text>
<line x1="400" y1="40" x2="400" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="400" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">10 kB</text>
<line x1="470" y1="40" x2="470" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="470" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">100 kB</text>
<line x1="540" y1="40" x2="540" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="540" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">1 MB</text>
<line x1="610" y1="40" x2="610" y2="350" stroke="currentColor" stroke-opacity=".2"/>
<text x="610" y="368" text-anchor="middle" font-size="12" fill-opacity=".7">10 MB</text>
<rect x="200" y="12" width="14" height="10" fill-opacity=".6"/><text x="220" y="22" font-size="12">public key</text>
<rect x="320" y="12" width="14" height="10" fill-opacity=".2" stroke="currentColor"/><text x="340" y="22" font-size="12">ciphertext</text>
<text x="182" y="67" text-anchor="end">X25519 (classical)</text>
<rect x="190" y="50" width="35" height="13" fill-opacity=".6"/>
<text x="230" y="61" font-size="11">32</text>
<rect x="190" y="65" width="35" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="230" y="76" font-size="11">32</text>
<text x="182" y="107" text-anchor="end">ML-KEM-768</text>
<rect x="190" y="90" width="145" height="13" fill-opacity=".6"/>
<text x="340" y="101" font-size="11">1,184</text>
<rect x="190" y="105" width="143" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="338" y="116" font-size="11">1,088</text>
<text x="182" y="147" text-anchor="end">BIKE-L1</text>
<rect x="190" y="130" width="153" height="13" fill-opacity=".6"/>
<text x="348" y="141" font-size="11">1,541</text>
<rect x="190" y="145" width="154" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="349" y="156" font-size="11">1,573</text>
<text x="182" y="187" text-anchor="end">HQC-1</text>
<rect x="190" y="170" width="165" height="13" fill-opacity=".6"/>
<text x="360" y="181" font-size="11">2,249</text>
<rect x="190" y="185" width="185" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="380" y="196" font-size="11">4,433</text>
<text x="182" y="227" text-anchor="end">FrodoKEM-640</text>
<rect x="190" y="210" width="209" height="13" fill-opacity=".6"/>
<text x="404" y="221" font-size="11">9,616</text>
<rect x="190" y="225" width="209" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="404" y="236" font-size="11">9,720</text>
<text x="182" y="267" text-anchor="end">mceliece348864</text>
<rect x="190" y="250" width="309" height="13" fill-opacity=".6"/>
<text x="504" y="261" font-size="11">261,120</text>
<rect x="190" y="265" width="69" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="264" y="276" font-size="11">96</text>
<text x="182" y="307" text-anchor="end">mceliece6688128</text>
<rect x="190" y="290" width="351" height="13" fill-opacity=".6"/>
<text x="546" y="301" font-size="11">1,044,992</text>
<rect x="190" y="305" width="92" height="13" fill-opacity=".2" stroke="currentColor"/>
<text x="287" y="316" font-size="11">208</text>
</svg>
<figcaption>Figure 13.5. Public key and ciphertext sizes on a logarithmic scale. Every other KEM keeps the two within about a factor of two of each other; Classic McEliece trades a public key a thousand times larger for the smallest ciphertext of any post-quantum KEM. Sizes for HQC and BIKE are from Chapter 14.</figcaption>
</figure>

### Where it is deployed

The rule of thumb follows from Figure 13.5: Classic McEliece fits wherever a public key is sent
once and used many times, and it fits badly wherever a fresh public key must cross the network
in every handshake, as in TLS.

- **Post-quantum WireGuard.** Andreas Hülsing, Ka-Chun Ning, Peter Schwabe, Florian Weber and
  Philip Zimmermann (IEEE Symposium on Security and Privacy, 2021) redesigned WireGuard's
  handshake with KEMs: Classic McEliece for the static keys, exchanged once at configuration,
  and a lattice KEM for the ephemeral keys.
- **Rosenpass** (2023) is a working protocol built on that design. It runs beside an
  unmodified WireGuard and feeds it a post-quantum pre-shared key, using Classic McEliece
  (mceliece460896) for static keys and a lattice KEM for ephemeral ones.
- **Mullvad VPN** made "quantum-resistant tunnels" available on all its platforms in 2024 and
  the default on desktop in January 2025. The app negotiates a pre-shared key for WireGuard
  with two KEMs, Classic McEliece and Kyber at first and ML-KEM since the January 2025 release,
  so that both would have to fall.
- **McTiny** (Bernstein and Lange, USENIX Security 2020) sends a megabyte McEliece key to a
  server in small pieces without per-client server state, so even a tiny server can accept
  fresh keys and get forward secrecy.
- **Libraries.** The submission's own code, liboqs and Bouncy Castle carry it; mainstream TLS
  and SSH stacks do not.

Hybrids are the norm: the deployed protocols above pair Classic McEliece with a lattice KEM and
with WireGuard's classical Diffie-Hellman, which turned out to matter in 2026 (§13.10).

**Mars.** For Arcadia City's link to Earth, the key size matters once and the ciphertext size
matters forever. The ground station's Classic McEliece public key, about a megabyte, crosses the
link once and is stored in every habitat's control computer. After that, every session starts
with a 208-byte ciphertext, smaller than the ML-KEM-1024 ciphertext the city would otherwise
send, and with a 6 to 44 minute round trip it matters that the habitat can encapsulate to the
stored key and start talking without waiting for the ground station. The same delay makes key
*replacement* slow: a new megabyte key must be signed, sent and installed everywhere before
the old one is withdrawn, and a revocation takes at least one light-time to arrive. The city's
planners therefore run McEliece only in a hybrid with ML-KEM-1024, keep the replacement key staged in advance, and, after BSI's October
2026 advice (§13.10), treat McEliece as the second lock rather than the first.

## 13.10 Standards and the attacks of 2026

*Level: expert.*

### NIST: four rounds and a no

Classic McEliece entered NIST's competition in November 2017 as one of its most conservative
submissions, and it was never seriously threatened inside the competition. It became a
finalist in July 2020. In July 2022, when it chose Kyber, NIST moved Classic McEliece to a
fourth round with BIKE, HQC and SIKE (NIST IR 8413) rather than selecting it; SIKE was broken
weeks later (Chapter 16). In March 2025, NIST IR 8545 selected HQC as the one additional KEM to
standardize and did not select Classic McEliece. The report pointed to the work under way at
ISO and said that once it was finished NIST might consider a standard based on it. Bernstein
filed a formal request for correction of the report's performance figures for Classic
McEliece; NIST rejected it and stood by its conclusions.

The likeliest reading is that the choice was about use rather than security: NIST wanted a
second KEM, not based on lattices, that could serve where ML-KEM does, including in TLS, and
HQC's kilobyte keys fit that role while McEliece's megabyte keys do not.

### ISO/IEC 18033-2, 2026

ISO/IEC 18033-2, the international standard for asymmetric encryption (2006, with RSA-KEM,
ECIES and others), gained a second amendment, ISO/IEC 18033-2:2006/Amd 2:2026, which
added three post-quantum KEMs: ML-KEM, FrodoKEM and Classic McEliece. The Classic McEliece team
dates its publication to June 2026, and the parameter sets it includes are reported as
mceliece460896 and larger, without the category 1 set mceliece348864. The text is sold, not
free, and at least one large vendor said on NIST's forum that it would not build on a paywalled
standard.

Germany's BSI had listed Classic McEliece in its technical guideline TR-02102-1 since 2020, as
a conservative KEM for use in hybrids. In the summer of 2026 the scheme had an international
standard, a national recommendation and real deployments. Then the attacks came.

### The summer of 2026

For thirty years the structural question, whether a Goppa code's public matrix gives away
anything at all, had only partial answers: the high-rate distinguisher of 2011, which needs
rates far above Classic McEliece's, and a new approach through quadratic forms by Alain
Couvreur, Rocco Mora and Jean-Pierre Tillich (ASIACRYPT 2023). In 2024 Hugues Randriambololona
introduced the **syzygy distinguisher** (EUROCRYPT 2025), the first whose cost grows only
subexponentially in the number of errors and which applies to the codes Classic McEliece uses.
It is still far too slow to matter at real sizes, but it showed that the quadratic relations
among the coordinates of a Goppa code carry more information than had been thought.

2026 turned that into a stream of papers, all of them as preprints on the IACR ePrint archive:

- **June.** Pierre Briaud, Axel Lemoine, Hugues Randriambololona and Jean-Pierre Tillich
  (ePrint 2026/1232, ASIACRYPT 2026) recovered keys through rank-2 matrices in the code of
  quadratic relations, solved reduced-size challenge keys, and estimated about $2^{454}$ at
  best for the category 1 set: new, but nowhere near beating decoding. Tobias Hemmert of BSI
  (ePrint 2026/1339) recovered keys through polynomials vanishing to high order on the public
  columns, breaking several reduced-size challenge keys published by the Technology Innovation
  Institute, at estimated costs still above the real sets' targets.
- **August.** Ashrujit Ghoshal, Yuval Ishai, Aayush Jain and Nuozhou Sun (ePrint 2026/1630),
  while trying to build private information retrieval from codes, found a distinguisher that
  runs in quasipolynomial time, $n^{O(\log n)}$, in Classic McEliece's asymptotic regime ($m
  \approx \log n$, $t \approx n / \log n$). It "holds out" one coordinate and looks for
  polynomials vanishing to high order on the other columns, which for a Goppa code exist at
  degrees where for a random code they would not. They stated that it applies to every NIST
  parameter set, at about $2^{114}$ to $2^{124}$ bit operations, below generic decoding, and
  sketched heuristic key recovery.
- **August to October.** Kirill Vedenev (ePrint 2026/1747) recovered the full key from a single
  run of the distinguisher, solved two reduced-size challenge keys not solved before, and
  estimated $2^{90}$ to $2^{99}$ bit operations for Classic McEliece under stated heuristic
  assumptions. Daniel Apon (ePrint 2026/1810) argued that one assumption fails, pushing an early
  version beyond $2^{1500}$ for mceliece8192128; Vedenev says his later versions are not
  affected. Markku-Juhani Saarinen (ePrint 2026/1786) costed a conditional hold-out key recovery
  at $2^{127}$ to $2^{145}$ across the five sets, all below their targets, leaving out memory
  traffic.

!!! note "Life story: the hold-out distinguisher"
    **Born:** August 2026, Ghoshal, Ishai, Jain and Sun, "Quasipolynomial Cryptanalysis of
    the McEliece Cryptosystem (or: PIR Meets McEliece)", ePrint 2026/1630 · **Purpose:** a
    failed attempt at private information retrieval that turned into a way to tell Goppa-code
    public keys from random ones in time $n^{O(\log n)}$ · **Helped:** key-recovery attacks by
    Vedenev and others, cost estimates by Saarinen; BSI's change of advice in October 2026 ·
    **Status:** as of November 2026, never run at full size; estimated costs range from about
    $2^{90}$ to far above the security targets depending on heuristics still in dispute.

### How to read it

None of these computations has been run on a real key, the lowest estimates rest on
assumptions that can only be tested on small keys, and even they are far beyond any
computation ever carried out. The Classic McEliece team responded that a distinguisher alone
does not attack the scheme's security goals and that the computations remain far out of reach.
True, but that is not the standard the scheme was sold on. Classic McEliece claimed category 1
to 5 security, about $2^{143}$ to $2^{272}$ classical gate operations, on the argument that the best
attack is generic decoding. If any key recovery near $2^{100}$ to $2^{130}$ holds up, the
parameter sets miss their categories, and a quasipolynomial attack, unlike an exponential one,
cannot be outrun cheaply by making the code a little bigger.

BSI acted first. In a note announced at the start of October 2026 it advised
against using Classic McEliece in new developments and in planning new cryptographic
applications, while stating that the results do not give a practical attack on the parameter
sets its guideline recommends. It pointed to FrodoKEM, ML-KEM, and HQC once its standard is
published, and said it would revise its statement on Classic McEliece in the next edition of
TR-02102-1, planned for early 2027. As far as could be checked in November 2026, NIST had made
no new statement, ISO's amendment stood, and the cryptanalysis was moving week by week. Whatever the final numbers,
2026 ended the claim that binary Goppa codes hide their structure perfectly.

For a builder the advice is short. Existing hybrids, like Mullvad's and Rosenpass's, are at
worst as safe as their lattice half, and nobody has a practical attack on either half. New
designs wanting a conservative non-lattice KEM should look at FrodoKEM, or at HQC when its
standard arrives (Chapter 14); Classic McEliece, if chosen, belongs only in a hybrid with a
plan to replace it.

## 13.11 Going deeper

*Level: expert.*

- **The specification.** *Classic McEliece: conservative code-based cryptography*, round 4
  submission (2022), with its "Guide for security reviewers" and the parameter rationale.
- **ISD.** Becker, Joux, May and Meurer, "Decoding Random Binary Linear Codes in 2^(n/20)"
  (EUROCRYPT 2012); Canto Torres and Sendrier on sublinear error weights (PQCrypto 2016); Esser
  and Bellini's syndrome-decoding estimator for concrete costs.
- **Quantum ISD.** Bernstein, "Grover vs. McEliece" (PQCrypto 2010); Kachigar and Tillich on
  quantum ISD with representations (2017).
- **Implementation.** Chou, "McBits revisited" (CHES 2017), for constant-time Goppa decoding
  with additive FFTs; the round 4 submission's notes on side channels; Guo, Johansson and
  Johansson (TCHES 2022) for what power traces still reveal.
- **History.** Bernstein, Lange and Peters, "Attacking and defending the McEliece
  cryptosystem" (PQCrypto 2008), broke McEliece's original 1978 parameters ($n = 1024$, $t = 50$)
  in practice, about $2^{60}$ operations, while the scheme itself stood; they also proposed the
  larger parameters that Classic McEliece grew from.
- **Structure.** Randriambololona's "The syzygy distinguisher" (EUROCRYPT 2025) for the
  algebra behind the 2024-26 attacks, then ePrint 2026/1630 and its follow-ups in date order;
  check the ePrint versions, which changed often in 2026.

## Check yourself

??? question "1. In the [7, 4] Hamming code example, the codeword 0110011 arrives with bit 2 flipped. What is the syndrome?"

    Column 2 of $H$, which is $010$: the binary for 2.

??? question "2. What does a Niederreiter ciphertext consist of, and how long is it for mceliece348864?"

    The syndrome $He$ of a weight-$t$ error vector: $mt = 12 \times 64 = 768$ bits, 96 bytes.

??? question "3. Why can a binary Goppa code with a squarefree g of degree t correct t errors, when it has only mt binary parity checks?"

    For squarefree $g$, the code defined by $g$ equals the code defined by $g^2$, which gives
    $2t$ syndromes over $\mathrm{GF}(2^m)$, enough for algebraic decoding of $t$ errors.

??? question "4. In the GF(8) code of §13.4, a single error sits at the support point α³. Use the short cut 1/(x + a) = (x + a + 1)/g(a) to find S(x), then run Patterson's steps to the locator."

    $\alpha^3 + 1 = \alpha$ and $g(\alpha^3) = \alpha^5$, so $S(x) = (x + \alpha)/\alpha^5 =
    \alpha^2 x + \alpha^3$. Its inverse modulo $g$ is $T(x) = x + \alpha^3$ (check: $(\alpha^2 x +
    \alpha^3)(x + \alpha^3) = \alpha^2 x^2 + \alpha^5 x + \alpha^3 x + \alpha^6 \equiv \alpha^2(x +
    1) + \alpha^2 x + \alpha^6 = \alpha^2 + \alpha^6 = 1$). Then $T + x = \alpha^3$, whose square
    root is $R = \alpha^5$ (since $\alpha^{10} = \alpha^3$). So $a = \alpha^5$, $b = 1$, and $\sigma
    = a^2 + x b^2 = x + \alpha^3$, whose only root is $\alpha^3$.

??? question "5. In Prange's algorithm, what is the chance one guess succeeds?"

    That all $t$ errors fall in the $n - k$ chosen columns: $\binom{n-k}{t} / \binom{n}{t}$.

??? question "6. mceliece348864's public key is 261,120 bytes but its private key only 6,492. Where do the private bytes go, and why can't the public key be as small?"

    A 32-byte seed, an 8-byte field, $g$ in 128 bytes, the support order as Beneš-network
    control bits in 5,888 bytes, and the 436-byte rejection string. The private key describes
    the structure, which is small; the public key must hide it, so it is a full $2{,}720 \times
    768$ binary matrix that looks random. Compact structure is what broke the smaller-key
    variants (§13.8).

??? question "7. Name a code family that failed in McEliece, and why."

    Generalized Reed-Solomon codes: Sidelnikov and Shestakov (1992) recovered their structure
    from the public key in polynomial time, using the systematic form's entries, which are
    rational expressions in the secret points. (Reed-Muller codes and several quasi-cyclic
    alternant codes also fell to structural attacks.)

??? question "8. Compare mceliece348864 and ML-KEM-768 on public key and ciphertext, and say which kind of protocol suits McEliece's shape."

    Public key 261,120 bytes against 1,184; ciphertext 96 bytes against 1,088. McEliece suits
    static keys sent once and used many times (configured VPN peers, stored server keys, the
    Rosenpass and post-quantum WireGuard designs), not protocols that send a fresh public key in
    every handshake, such as TLS.

??? question "9. What does Stern's algorithm bet on that Prange's does not, and why do Stern, BJMM and their successors gain only a few bits against McEliece?"

    Prange bets that all $t$ errors fall in the pivot columns. Stern bets that $p$ errors fall in
    each half of the other columns and none in a window of $\ell$ pivot rows, and finds the
    $2p$ errors by a collision search on the window, so each bet succeeds far more often. But
    McEliece's error weight is sublinear in $n$, and Canto Torres and Sendrier (2016) proved
    that every ISD variant then has the same leading cost, $2^{t \log_2(1/(1-R))}$; the gains
    are lower-order terms.

??? question "10. A colleague says \"McEliece was broken in 2026.\" What is accurate in that, and what would you deploy for a new design in November 2026?"

    No practical attack exists, and none of the new attacks has been run on a full-size key.
    But in 2026 a quasipolynomial distinguisher (ePrint 2026/1630) and key-recovery estimates
    of about $2^{90}$ to $2^{145}$ bit operations, under disputed heuristics, would put the
    parameter sets below their claimed categories if they hold; BSI advised in October 2026
    against new uses. For a new design: ML-KEM in a hybrid, with FrodoKEM or HQC as a
    non-lattice second KEM; Classic McEliece only in a hybrid with a plan to replace it.

## What you learned

- McEliece (1978) hides a message as errors in a codeword of a disguised code; Niederreiter
  (1986) sends only the syndrome, and Classic McEliece turns that into a KEM with implicit
  rejection and no decryption failures.
- Binary Goppa codes decode $t$ errors from only $mt$ parity checks, either with Patterson's
  algorithm modulo $g$ (squaring halves the unknowns) or with Berlekamp-Massey on $2t$
  syndromes modulo $g^2$; both fit on a page for a GF(8) code with $t = 2$.
- A working toy fits in about 120 lines; Prange, Lee-Brickell and Stern all break it, and
  their cost on real sizes is about $2^{143}$ to $2^{150}$ for the smallest set. For
  McEliece's sparse errors every ISD variant shares the leading term $t \log_2 \frac{1}{1-R}$.
- Codes with more visible structure (GRS, Reed-Muller, some quasi-cyclic codes) were broken;
  binary Goppa codes held until 2026, when structural attacks appeared whose costs, if their
  heuristics hold, fall below the claimed categories; none has been run at full size.
- Public keys of 261 kilobytes to 1.36 megabytes are the price of a matrix that must look
  random; private keys of 6 to 14 kilobytes describe the hidden structure. It suits static
  keys (Rosenpass, Mullvad), not TLS.
- NIST did not select it in 2025; ISO standardized it in 2026 (ISO/IEC 18033-2:2006/Amd
  2:2026); BSI advised against new uses in October 2026.

**Next:** [Chapter 14](14-HQC-and-BIKE.md), HQC and BIKE, code-based KEMs with small keys, one of which NIST chose.

## Further reading

- Eugene Prange, "The use of information sets in decoding cyclic codes", *IRE Transactions on
  Information Theory* 8 (1962).
- V. D. Goppa, "A new class of linear error-correcting codes", *Problemy Peredachi
  Informatsii* 6 (1970).
- Nicholas Patterson, "The algebraic decoding of Goppa codes", *IEEE Transactions on
  Information Theory* 21 (1975).
- Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding Theory", JPL DSN
  Progress Report 42-44 (1978).
- Elwyn Berlekamp, Robert McEliece and Henk van Tilborg, "On the inherent intractability of
  certain coding problems", *IEEE Transactions on Information Theory* 24 (1978).
- Harald Niederreiter, "Knapsack-type cryptosystems and algebraic coding theory", *Problems of
  Control and Information Theory* 15 (1986).
- Pil Joong Lee and Ernest Brickell, "An observation on the security of McEliece's public-key
  cryptosystem" (EUROCRYPT 1988).
- Jacques Stern, "A method for finding codewords of small weight", *Coding Theory and
  Applications* (1989).
- V. M. Sidelnikov and S. O. Shestakov, "On insecurity of cryptosystems based on generalized
  Reed-Solomon codes", *Discrete Mathematics and Applications* 2 (1992).
- Yuan Xing Li, Robert H. Deng and Xin Mei Wang, "On the equivalence of McEliece's and
  Niederreiter's public-key cryptosystems", *IEEE Transactions on Information Theory* 40 (1994).
- Thomas Berson, "Failure of the McEliece public-key cryptosystem under message-resend and
  related-message attack" (CRYPTO 1997).
- Anne Canteaut and Florent Chabaud, "A new algorithm for finding minimum-weight words in a
  linear code", *IEEE Transactions on Information Theory* 44 (1998).
- Falko Strenzke, Erik Tews, H. Gregor Molter, Raphael Overbeck and Abdulhadi Shoufan, "Side
  channels in the McEliece PKC" (PQCrypto 2008).
- Daniel J. Bernstein, Tanja Lange and Christiane Peters, "Attacking and defending the McEliece
  cryptosystem" (PQCrypto 2008).
- Daniel J. Bernstein, "Grover vs. McEliece" (PQCrypto 2010).
- Anja Becker, Antoine Joux, Alexander May and Alexander Meurer, "Decoding Random Binary Linear
  Codes in 2^(n/20): How 1 + 1 = 0 Improves Information Set Decoding" (EUROCRYPT 2012).
- Daniel J. Bernstein, Tung Chou and Peter Schwabe, "McBits: fast constant-time code-based
  cryptography" (CHES 2013); Tung Chou, "McBits revisited" (CHES 2017).
- Rodolfo Canto Torres and Nicolas Sendrier, "Analysis of information set decoding for a
  sub-linear error weight" (PQCrypto 2016).
- Daniel J. Bernstein and Tanja Lange, "McTiny: fast high-confidence post-quantum key erasure
  for tiny network servers" (USENIX Security 2020).
- Andreas Hülsing, Ka-Chun Ning, Peter Schwabe, Florian Weber and Philip R. Zimmermann,
  "Post-quantum WireGuard" (IEEE Symposium on Security and Privacy 2021).
- Daniel J. Bernstein and others, *Classic McEliece: conservative code-based cryptography*,
  round 4 submission (2022).
- Qian Guo, Andreas Johansson and Thomas Johansson, "A key-recovery side-channel attack on
  Classic McEliece implementations", *TCHES* 2022(4).
- Alain Couvreur, Rocco Mora and Jean-Pierre Tillich, "A new approach based on quadratic forms
  to attack the McEliece cryptosystem" (ASIACRYPT 2023).
- Hugues Randriambololona, "The syzygy distinguisher" (EUROCRYPT 2025).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (July 2022).
- NIST IR 8545, *Status Report on the Fourth Round of the NIST Post-Quantum Cryptography
  Standardization Process* (March 2025).
- ISO/IEC 18033-2:2006/Amd 2:2026, *Information technology — Security techniques — Encryption
  algorithms — Part 2: Asymmetric ciphers*, Amendment 2 (2026).
- Pierre Briaud, Axel Lemoine, Hugues Randriambololona and Jean-Pierre Tillich, "A heuristic
  subexponential attack on the McEliece cryptosystem", ePrint 2026/1232 (ASIACRYPT 2026).
- Tobias Hemmert, "Key recovery for the McEliece cryptosystem using higher-order vanishing",
  ePrint 2026/1339 (2026).
- Ashrujit Ghoshal, Yuval Ishai, Aayush Jain and Nuozhou Sun, "Quasipolynomial cryptanalysis
  of the McEliece cryptosystem (or: PIR meets McEliece)", ePrint 2026/1630 (2026).
- Kirill Vedenev, "Extending distinguishing to key recovery for subfield subcodes of GRS
  codes", ePrint 2026/1747 (2026); Daniel Apon, "An algebraic-geometry lower bound against the
  ePrint:2026/1747 McEliece key-recovery attack", ePrint 2026/1810 (2026).
- Markku-Juhani O. Saarinen, "Bit operation cost of 'holdout' key-recovery attacks against
  Classic McEliece", ePrint 2026/1786 (2026).
- BSI, TR-02102-1, and its notes on recent developments concerning Classic McEliece (October
  2026).
- Mullvad, "Quantum-resistant tunnels are now the default on desktop" (January 2025).
