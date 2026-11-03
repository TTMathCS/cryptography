# 12. The Key Distribution Problem and Diffie-Hellman

*Every cipher in Part II needs a shared secret key before it can do anything.
This chapter is about how two people who have never met can make one while
the whole world listens. You will see the problem that drove the search,
Merkle's first answer with puzzles, the mathematics of groups that the real
answer needs, Diffie-Hellman worked by hand and in code, the ways it breaks
when the group is badly chosen, and why on its own it cannot tell you who is
on the other end.*

!!! abstract "In this chapter"
    **You will learn:**

    - why sharing keys in advance does not scale, and what "public-key" means
    - what a group, a generator and the order of an element are, and Lagrange's theorem
    - how Diffie-Hellman key exchange works, by hand and at 2048 bits
    - what the discrete logarithm problem is and how fast it can be attacked
    - how small subgroups, weak primes and Logjam broke real deployments
    - why an unauthenticated exchange falls to a man in the middle, and how signatures fix it

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (modular arithmetic, fast powers, inverses),
    and the idea of a symmetric key from [Chapter 5](05-Stream-Ciphers.md) or [Chapter 7](07-AES.md).
    [Chapter 10](10-Message-Authentication.md) helps for the MAC in §12.8.

    **Levels:** 12.1 to 12.3 are for beginners, 12.4 to 12.8 are intermediate, 12.9 to 12.11 go to expert level.

## 12.1 The problem: keys have to travel

Everything in Part II assumed that Alice and Bob already share a key. Where did
it come from? For most of history the answer was: somebody carried it.

Armies printed key lists and sent them by courier, months ahead. Diplomats
carried pads of random numbers in sealed bags. When the Washington-Moscow
hotline opened in 1963, its teleprinters were protected by one-time tapes that
each side delivered to the other's embassy. Banks in the 1970s moved key
material in armored vans and gave it to trusted staff to load by hand.

That works for a few parties. It does not work for a network. If every pair of
users needs its own key, $n$ users need

$$
\binom{n}{2} = \frac{n(n-1)}{2}
$$

keys. A thousand users need 499,500 of them; ten thousand need almost fifty
million. Each one has to be made, delivered in secret, stored and eventually
replaced. A trusted **key distribution center** shrinks the number (each user
shares one key with the center, and the center hands out session keys; this is
how [Kerberos](../protocols/Kerberos.md) works to this day), but the center now
knows every key and every user must still meet it once.

<figure class="mars-fig">
<svg viewBox="0 0 690 270" width="690" role="img" aria-label="Three panels with six users each: pairwise keys need 15 secret keys, a key distribution center needs 6 but knows them all, public-key methods need 6 public values and no secret delivery">
<line x1="122.8" y1="54.5" x2="167.8" y2="80.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="119.5" y1="57.8" x2="171.1" y2="147.2" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="115" y1="59" x2="115" y2="181" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="110.5" y1="57.8" x2="58.9" y2="147.2" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="107.2" y1="54.5" x2="62.2" y2="80.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="175.6" y1="94" x2="175.6" y2="146" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="171.1" y1="92.8" x2="119.5" y2="182.2" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="167.8" y1="89.5" x2="62.2" y2="150.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="166.6" y1="85" x2="63.4" y2="85" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="167.8" y1="159.5" x2="122.8" y2="185.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="166.6" y1="155" x2="63.4" y2="155" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="167.8" y1="150.5" x2="62.2" y2="89.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="107.2" y1="185.5" x2="62.2" y2="159.5" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="110.5" y1="182.2" x2="58.9" y2="92.8" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<line x1="54.4" y1="146" x2="54.4" y2="94" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.7"/>
<circle cx="115" cy="50" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="175.6" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="175.6" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="115" cy="190" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="54.4" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="54.4" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="115" y="225" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">pairwise keys</text>
<text x="115" y="245" font-size="13" text-anchor="middle" fill="currentColor">15 secret keys to deliver</text>
<line x1="345" y1="94" x2="345" y2="59" stroke="currentColor" stroke-width="1.3"/>
<line x1="367.5" y1="107" x2="397.8" y2="89.5" stroke="currentColor" stroke-width="1.3"/>
<line x1="367.5" y1="133" x2="397.8" y2="150.5" stroke="currentColor" stroke-width="1.3"/>
<line x1="345" y1="146" x2="345" y2="181" stroke="currentColor" stroke-width="1.3"/>
<line x1="322.5" y1="133" x2="292.2" y2="150.5" stroke="currentColor" stroke-width="1.3"/>
<line x1="322.5" y1="107" x2="292.2" y2="89.5" stroke="currentColor" stroke-width="1.3"/>
<rect x="323" y="106" width="44" height="28" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="345" y="125" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">KDC</text>
<circle cx="345" cy="50" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="405.6" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="405.6" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="345" cy="190" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="284.4" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="284.4" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="345" y="225" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">key distribution center</text>
<text x="345" y="245" font-size="13" text-anchor="middle" fill="currentColor">6 keys, but the center knows all</text>
<circle cx="575" cy="50" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="575" y1="50" x2="575" y2="93" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="575,99 572.3,93 577.7,93" fill="currentColor"/>
<circle cx="635.6" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="635.6" y1="85" x2="598.4" y2="106.5" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="593.2,109.5 597,104.2 599.7,108.8" fill="currentColor"/>
<circle cx="635.6" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="635.6" y1="155" x2="598.4" y2="133.5" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="593.2,130.5 599.7,131.2 597,135.8" fill="currentColor"/>
<circle cx="575" cy="190" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="575" y1="190" x2="575" y2="147" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="575,141 577.7,147 572.3,147" fill="currentColor"/>
<circle cx="514.4" cy="155" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="514.4" y1="155" x2="551.6" y2="133.5" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="556.8,130.5 553,135.8 550.3,131.2" fill="currentColor"/>
<circle cx="514.4" cy="85" r="9" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="514.4" y1="85" x2="551.6" y2="106.5" stroke="currentColor" stroke-width="1.1" stroke-dasharray="5 4"/>
<polygon points="556.8,109.5 550.3,108.8 553,104.2" fill="currentColor"/>
<rect x="545" y="106" width="60" height="28" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="575" y="125" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">public</text>
<text x="575" y="225" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">public key</text>
<text x="575" y="245" font-size="13" text-anchor="middle" fill="currentColor">6 public values, nothing secret</text>
</svg>
<figcaption>Figure 12.1. Six users three ways. With secret pairwise keys every line is a key someone must carry; a center cuts the count but must be trusted with everything; with public-key methods each user publishes one value and keeps one secret.</figcaption>
</figure>

In 1974 Whitfield Diffie, a young mathematician who had worked at MIT and in
Stanford's artificial intelligence lab, was traveling the United States asking
cryptographers two questions. Could two people who had never met set up a
secret over a line that anyone could tap? And could a message be "signed" on a
computer, so that anyone could check who wrote it but nobody could forge it? He
was sent to Martin Hellman, a young Stanford professor of electrical
engineering who was asking the same things. Their answer to the first question,
published in November 1976, is the subject of this chapter. The second became
[Chapter 13](13-RSA.md) and [Chapter 14](14-Discrete-Log-Systems.md).

They were not the only ones, and not the first. At Britain's signals agency,
GCHQ, James Ellis had shown in a classified paper of January 1970 that
"non-secret encryption" was possible in principle, and Malcolm Williamson found
what is essentially the Diffie-Hellman exchange in 1974. That work stayed
secret until 1997. In the open, the first person to solve the problem at all
was a student. (The full story is in [the History chapter on public key
cryptography](../history/07-Public-Key.md).)

<figure class="mars-fig">
<svg viewBox="0 0 600 606" width="600" role="img" aria-label="Timeline of the key distribution problem and Diffie-Hellman from 1963 to 2035">
<line x1="100" y1="10" x2="100" y2="598" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<text x="86" y="22.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1963</text>
<circle cx="100" cy="18" r="4" fill="currentColor"/>
<text x="114" y="22.5" font-size="13" text-anchor="start" fill="currentColor">Washington-Moscow hotline opens, keyed by one-time tapes</text>
<text x="114" y="41.5" font-size="13" text-anchor="start" fill="currentColor">carried by hand</text>
<text x="86" y="69.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1970</text>
<circle cx="100" cy="65" r="4" fill="currentColor"/>
<text x="114" y="69.5" font-size="13" text-anchor="start" fill="currentColor">James Ellis (GCHQ) shows 'non-secret encryption' is</text>
<text x="114" y="88.5" font-size="13" text-anchor="start" fill="currentColor">possible, in secret</text>
<text x="86" y="116.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1974</text>
<circle cx="100" cy="112" r="4" fill="currentColor"/>
<text x="114" y="116.5" font-size="13" text-anchor="start" fill="currentColor">Malcolm Williamson (GCHQ) finds the exchange in secret;</text>
<text x="114" y="135.5" font-size="13" text-anchor="start" fill="currentColor">Ralph Merkle proposes puzzles at Berkeley; Diffie meets</text>
<text x="114" y="154.5" font-size="13" text-anchor="start" fill="currentColor">Hellman</text>
<text x="86" y="182.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">1976</text>
<circle cx="100" cy="178" r="5" class="acc-fill"/>
<text x="114" y="182.5" font-size="13" text-anchor="start" fill="currentColor">Diffie and Hellman, 'New Directions in Cryptography'</text>
<text x="114" y="201.5" font-size="13" text-anchor="start" fill="currentColor">(November)</text>
<text x="86" y="229.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1978</text>
<circle cx="100" cy="225" r="4" fill="currentColor"/>
<text x="114" y="229.5" font-size="13" text-anchor="start" fill="currentColor">Merkle's puzzles published; Pohlig-Hellman algorithm;</text>
<text x="114" y="248.5" font-size="13" text-anchor="start" fill="currentColor">Pollard's rho for discrete logs</text>
<text x="86" y="276.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1980</text>
<circle cx="100" cy="272" r="4" fill="currentColor"/>
<text x="114" y="276.5" font-size="13" text-anchor="start" fill="currentColor">US patent 4,200,770 granted to Hellman, Diffie and</text>
<text x="114" y="295.5" font-size="13" text-anchor="start" fill="currentColor">Merkle</text>
<text x="86" y="323.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1992</text>
<circle cx="100" cy="319" r="4" fill="currentColor"/>
<text x="114" y="323.5" font-size="13" text-anchor="start" fill="currentColor">Station-to-station protocol adds signatures (Diffie, van</text>
<text x="114" y="342.5" font-size="13" text-anchor="start" fill="currentColor">Oorschot, Wiener)</text>
<text x="86" y="370.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1996-98</text>
<circle cx="100" cy="366" r="4" fill="currentColor"/>
<text x="114" y="370.5" font-size="13" text-anchor="start" fill="currentColor">SSL 3.0, SSH 2 and IPsec adopt Diffie-Hellman key</text>
<text x="114" y="389.5" font-size="13" text-anchor="start" fill="currentColor">exchange</text>
<text x="86" y="417.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1997</text>
<circle cx="100" cy="413" r="4" fill="currentColor"/>
<text x="114" y="417.5" font-size="13" text-anchor="start" fill="currentColor">Patent expires; GCHQ reveals Ellis, Cocks and Williamson</text>
<text x="86" y="445.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">2015</text>
<circle cx="100" cy="441" r="5" class="acc-fill"/>
<text x="114" y="445.5" font-size="13" text-anchor="start" fill="currentColor">Logjam: export-grade 512-bit groups broken in practice</text>
<text x="86" y="473.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2016</text>
<circle cx="100" cy="469" r="4" fill="currentColor"/>
<text x="114" y="473.5" font-size="13" text-anchor="start" fill="currentColor">Diffie and Hellman receive the Turing Award (for 2015)</text>
<text x="86" y="501.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2018</text>
<circle cx="100" cy="497" r="4" fill="currentColor"/>
<text x="114" y="501.5" font-size="13" text-anchor="start" fill="currentColor">TLS 1.3 keeps only key exchanges with forward secrecy</text>
<text x="86" y="529.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2019</text>
<circle cx="100" cy="525" r="4" fill="currentColor"/>
<text x="114" y="529.5" font-size="13" text-anchor="start" fill="currentColor">Record discrete log modulo a 795-bit prime</text>
<text x="86" y="557.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">2030-35</text>
<circle cx="100" cy="553" r="5" class="acc-fill"/>
<text x="114" y="557.5" font-size="13" text-anchor="start" fill="currentColor">NIST IR 8547: deprecated after 2030, disallowed after</text>
<text x="114" y="576.5" font-size="13" text-anchor="start" fill="currentColor">2035</text>
</svg>
<figcaption>Figure 12.2. The life of Diffie-Hellman at a glance. Highlighted: the open invention, the attack that retired weak groups, and the planned end because of quantum computers.</figcaption>
</figure>

## 12.2 Merkle's puzzles: the first answer

In the autumn of 1974 Ralph Merkle, an undergraduate at Berkeley, proposed a
project for Lance Hoffman's computer security course: a way for two people to
agree on a key over an open channel. Hoffman did not see the point and asked
for a rewrite, then rejected that too. Merkle dropped the course and kept
working. His paper, "Secure Communications over Insecure Channels", finally
appeared in *Communications of the ACM* in 1978, after a reviewer had called the
idea outside the mainstream of cryptographic thinking.

The idea fits in a paragraph. Alice makes a large number $N$ of **puzzles**.
Each is a short message, "this is puzzle *ID*, the key is *K*", locked with a
deliberately weak key that takes about $W$ tries to find. She sends them all to
Bob. Bob picks one at random, solves it by brute force, and announces only the
ID. Alice looks the ID up in her table, and now both know $K$. Eve, who heard
everything, does not know which puzzle Bob picked. She has to solve puzzles
until she finds the one with the right ID: on average half of them.

```python
import hashlib, random

rng = random.Random(1974)          # fixed seed so the run repeats; real use needs secrets
N = 2000                           # number of puzzles
HARD = 2000                        # each puzzle hides its key among this many guesses

def lock(secret, data):
    pad = hashlib.sha256(secret.to_bytes(4, "big")).digest()
    return bytes(a ^ b for a, b in zip(data, pad))

# Alice makes N puzzles. Each holds an ID and a session key, locked with a
# small random secret that takes about HARD tries to find.
puzzles, table = [], {}
for i in range(N):
    pid, key = rng.getrandbits(32), rng.getrandbits(64)
    body = b"PUZZLE" + pid.to_bytes(4, "big") + key.to_bytes(8, "big")
    puzzles.append(lock(rng.randrange(HARD), body))
    table[pid] = key

def solve(puzzle):
    for guess in range(HARD):                        # brute force one puzzle
        body = lock(guess, puzzle)
        if body.startswith(b"PUZZLE"):
            return int.from_bytes(body[6:10], "big"), int.from_bytes(body[10:], "big"), guess + 1

# Bob picks one at random, solves it and announces only its ID
pid, bob_key, tries = solve(rng.choice(puzzles))
print("Bob tried", tries, "secrets and sent ID", pid)
print("Alice looks up the ID:", table[pid] == bob_key)

# Eve hears the ID but must solve puzzles until she finds that one
eve = 0
for p in puzzles:
    found, key, t = solve(p)
    eve += t
    if found == pid:
        break
print("Eve tried", eve, "secrets")
```

Output:

```
Bob tried 1752 secrets and sent ID 1279578275
Alice looks up the ID: True
Eve tried 1654764 secrets
```

Bob did about $W$ work; Eve did about $NW/2$. With $N = W$ that is a
**quadratic** gap: Bob does $W$, Eve about $W^2/2$. Make $W$ a million and Bob
does a million steps while Eve does half a trillion.

<figure class="mars-fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Alice sends many locked puzzles to Bob, Bob solves one and announces its ID, Eve must solve about half of them; a bar chart compares Bob's 1,752 tries with Eve's 1,654,764">
<rect x="20" y="20" width="110" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="110" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="75" y="39.1" font-size="13" text-anchor="middle" fill="currentColor">Alice</text>
<text x="75" y="56" font-size="13" text-anchor="middle" fill="currentColor">makes N puzzles</text>
<rect x="530" y="20" width="110" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="530" y="20" width="110" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="585" y="39.1" font-size="13" text-anchor="middle" fill="currentColor">Bob</text>
<text x="585" y="56" font-size="13" text-anchor="middle" fill="currentColor">solves one</text>
<rect x="150" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="162" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="181" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="193" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="212" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="224" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="243" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="255" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="274" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="286" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="305" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="317" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="336" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="348" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="367" y="28" width="24" height="30" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="379" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="398" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="410" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="429" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="441" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="460" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="472" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<rect x="491" y="28" width="24" height="30" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="503" y="48" font-size="13" text-anchor="middle" fill="currentColor">?</text>
<line x1="140" y1="74" x2="512" y2="74" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,74 512,77.6 512,70.4" fill="currentColor"/>
<text x="330" y="92" font-size="13" text-anchor="middle" fill="currentColor">all N puzzles, in public</text>
<line x1="520" y1="112" x2="148" y2="112" class="acc" stroke-width="1.5"/>
<polygon points="140,112 148,108.4 148,115.6" class="acc-fill"/>
<text x="330" y="130" font-size="13" text-anchor="middle" fill="currentColor">only the ID of the solved puzzle</text>
<rect x="220" y="146" width="220" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="220" y="146" width="220" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="170.6" font-size="13" text-anchor="middle" fill="currentColor">Eve: which one was it?</text>
<text x="330" y="206" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Work done (from the run above)</text>
<text x="110" y="236" font-size="13" text-anchor="end" fill="currentColor">Bob</text>
<rect x="120" y="224" width="2" height="18" rx="2" class="soft-acc acc" stroke-width="1.3"/>
<text x="130" y="238" font-size="13" text-anchor="start" fill="currentColor">1,752 tries</text>
<text x="110" y="270" font-size="13" text-anchor="end" fill="currentColor">Eve</text>
<rect x="120" y="258" width="500" height="18" rx="2" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="370" y="272" font-size="13" text-anchor="middle" fill="currentColor">1,654,764 tries</text>
</svg>
<figcaption>Figure 12.3. Merkle's puzzles. Bob opens one box; Eve, who does not know which, opens about half of them. The gap is real but only quadratic: here about 900 times Bob's work.</figcaption>
</figure>

It was a proof that the impossible-sounding thing could be done. It is not a
practical scheme. A quadratic gap is too small: an attacker with a million
times Bob's computing power keeps up with puzzles a thousand times harder, and
Alice has to send all $N$ puzzles. What was needed was a calculation with an
**exponential** gap: easy one way, and hopeless the other way however much
computing you buy. Merkle, Diffie and Hellman worked on the problem together
through 1975 and 1976.

Merkle's later work went far beyond the puzzles. He moved to Stanford as
Hellman's PhD student, and in his 1979 thesis invented the **hash tree** that
now carries his name: [Chapter 16](16-PKI-and-Key-Establishment.md) uses it for
Certificate Transparency, and [Chapter 9](09-Hash-Functions.md) for the
Merkle-Damgård construction behind SHA-2. The puzzles themselves were never
deployed, but they settled an argument. Before them, many experts believed a
secret could not be agreed in public at all.

!!! note "Life story: Merkle's puzzles"
    **Born:** 1974 as a Berkeley course proposal by Ralph Merkle; published 1978 · **Purpose:** agree on a key
    over a channel everyone can hear · **Helped:** the first open proof that it can be done, and a direct
    influence on Diffie and Hellman · **Retired:** never used in practice, because the attacker's work grows only
    as the square of the user's · **Replaced by:** Diffie-Hellman (1976), with an exponential gap

## 12.3 A one-way street with a shortcut

Here is the shape of the answer, without any mathematics. Think of mixing
paint. Alice and Bob agree in public on a base color, yellow. Each picks a
secret color and mixes it into the yellow: Alice gets orange, Bob gets green.
They swap the mixtures in public. Each then adds their own secret color to what
they received. Both end up with yellow + Alice's secret + Bob's secret, the
same brown, while Eve holds only yellow, orange and green. Mixing is easy;
un-mixing paint is not.

<figure class="mars-fig">
<svg viewBox="0 0 660 330" width="660" role="img" aria-label="Paint analogy: Alice and Bob each mix a secret color into the public yellow, swap the mixtures, add their secret again and get the same final color; Eve sees only yellow and the two mixtures">
<text x="110" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<text x="330" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">public (Eve sees)</text>
<text x="550" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<rect x="30" y="40" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="40" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="110" y="65.5" font-size="13" text-anchor="middle" fill="currentColor">secret: red</text>
<rect x="250" y="40" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="250" y="40" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="65.5" font-size="13" text-anchor="middle" fill="currentColor">yellow</text>
<rect x="470" y="40" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="470" y="40" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="550" y="65.5" font-size="13" text-anchor="middle" fill="currentColor">secret: blue</text>
<rect x="30" y="140" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="140" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="110" y="165.6" font-size="13" text-anchor="middle" fill="currentColor">yellow + red</text>
<rect x="470" y="140" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="470" y="140" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="550" y="165.6" font-size="13" text-anchor="middle" fill="currentColor">yellow + blue</text>
<line x1="110" y1="82" x2="110" y2="130" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,138 106.4,130 113.6,130" fill="currentColor"/>
<line x1="550" y1="82" x2="550" y2="130" stroke="currentColor" stroke-width="1.5"/>
<polygon points="550,138 546.4,130 553.6,130" fill="currentColor"/>
<line x1="290" y1="82" x2="182.2" y2="134.5" stroke="currentColor" stroke-width="1.5"/>
<polygon points="175,138 180.6,131.3 183.8,137.7" fill="currentColor"/>
<line x1="370" y1="82" x2="477.8" y2="134.5" stroke="currentColor" stroke-width="1.5"/>
<polygon points="485,138 476.2,137.7 479.4,131.3" fill="currentColor"/>
<rect x="250" y="140" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="250" y="140" width="160" height="42" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="165.6" font-size="13" text-anchor="middle" fill="currentColor">sees both mixtures</text>
<line x1="190" y1="161" x2="240" y2="161" stroke="currentColor" stroke-width="1.5"/>
<polygon points="248,161 240,164.6 240,157.4" fill="currentColor"/>
<line x1="470" y1="161" x2="420" y2="161" stroke="currentColor" stroke-width="1.5"/>
<polygon points="412,161 420,157.4 420,164.6" fill="currentColor"/>
<line x1="150" y1="182" x2="150" y2="248" stroke="currentColor" stroke-width="1.5"/>
<polygon points="150,256 146.4,248 153.6,248" fill="currentColor"/>
<line x1="510" y1="182" x2="510" y2="248" stroke="currentColor" stroke-width="1.5"/>
<polygon points="510,256 506.4,248 513.6,248" fill="currentColor"/>
<text x="160" y="214" font-size="12" text-anchor="start" fill="currentColor">swap: Alice gets</text>
<text x="160" y="230" font-size="12" text-anchor="start" fill="currentColor">Bob's, adds red</text>
<text x="500" y="214" font-size="12" text-anchor="end" fill="currentColor">Bob gets Alice's,</text>
<text x="500" y="230" font-size="12" text-anchor="end" fill="currentColor">adds blue</text>
<rect x="30" y="258" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="258" width="160" height="42" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="110" y="283.6" font-size="13" text-anchor="middle" fill="currentColor">yellow + blue + red</text>
<rect x="470" y="258" width="160" height="42" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="470" y="258" width="160" height="42" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="550" y="283.6" font-size="13" text-anchor="middle" fill="currentColor">yellow + red + blue</text>
<text x="330" y="284" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">the same color</text>
<line x1="270" y1="280" x2="204" y2="280" stroke="currentColor" stroke-width="1"/>
<polygon points="196,280 204,276.4 204,283.6" fill="currentColor"/>
<line x1="390" y1="280" x2="456" y2="280" stroke="currentColor" stroke-width="1"/>
<polygon points="464,280 456,283.6 456,276.4" fill="currentColor"/>
<text x="330" y="320" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">dashed = never leaves its owner</text>
</svg>
<figcaption>Figure 12.4. The paint picture of Diffie-Hellman. Mixing is easy and un-mixing is hard; because the order of mixing does not matter, both sides end with the same color.</figcaption>
</figure>

The analogy needs two things from mathematics:

1. An operation that is **easy to do and hard to undo**, like mixing.
2. An operation where **the order does not matter**, so that "yellow, then
   Alice's, then Bob's" equals "yellow, then Bob's, then Alice's".

Hellman found both in modular exponentiation in May 1976. Take a prime $p$ and
a number $g$. Alice's secret is a number $a$, and her "mixture" is
$g^a \bmod p$. Powers combine in either order:

$$
(g^a)^b = g^{ab} = (g^b)^a .
$$

Computing $g^a \bmod p$ is fast even for numbers with hundreds of digits, by
square and multiply ([Chapter 3](03-The-Arithmetic-of-Secrets.md)). Going back
from $g^a \bmod p$ to $a$ is the **discrete logarithm problem**, and for a
well-chosen prime nobody knows how to do it in any reasonable time.

To see why that is true, and to see exactly what "well chosen" means, we need
the structure that $g$, $g^2$, $g^3, \ldots$ live in: a group.

## 12.4 Groups

*Level: intermediate.* Groups appear in every chapter of Part III, so it is
worth learning them properly once.

### The four rules

A **group** is a set together with one operation, written here as $\cdot$, that
obeys four rules:

1. **Closure:** if $a$ and $b$ are in the set, so is $a \cdot b$.
2. **Associativity:** $(a \cdot b) \cdot c = a \cdot (b \cdot c)$.
3. **Identity:** there is an element $1$ with $1 \cdot a = a \cdot 1 = a$ for every $a$.
4. **Inverses:** every $a$ has an $a^{-1}$ with $a \cdot a^{-1} = 1$.

If also $a \cdot b = b \cdot a$ always, the group is **abelian**, after the
Norwegian mathematician Niels Henrik Abel (1802 to 1829). Every group in this
book is abelian. The idea grew out of early 19th-century algebra: Lagrange's
study of equations (1771), Gauss's work on remainders (1801), and Évariste
Galois, who wrote down his theory the night before he was killed in a duel in
1832, aged 20.

You already know some groups. The integers under $+$ form one (identity 0,
inverse of $a$ is $-a$). The numbers $0, 1, \ldots, n-1$ under addition mod $n$
form a finite one, written $\mathbb{Z}_n$; the Caesar cipher of
[Chapter 2](02-Classical-Ciphers.md) lives in $\mathbb{Z}_{26}$.

The group Diffie-Hellman uses is $\mathbb{Z}_p^*$: the numbers
$1, 2, \ldots, p-1$ under **multiplication** mod a prime $p$. Closure holds
because a product of numbers not divisible by $p$ is not divisible by $p$. The
identity is 1. Inverses exist because $\gcd(a, p) = 1$ for every $a$ in the set,
so extended Euclid finds $a^{-1}$. That last step is why $p$ must be prime: mod
10, the number 2 has no inverse, and $\{1, \ldots, 9\}$ under multiplication is
not a group.

### Order and generators

Pick an element $g$ and keep multiplying: $g, g^2, g^3, \ldots$ In a finite group
the powers must eventually repeat, and the first repeat is always back to 1.
The **order** of $g$ is the smallest $k > 0$ with $g^k = 1$. If the powers of $g$
reach every element, $g$ is a **generator** and the group is **cyclic**.

Take $p = 23$. The group $\mathbb{Z}_{23}^*$ has 22 elements. The powers
$5^0, 5^1, \ldots, 5^{21}$ mod 23 are

$$
1, 5, 2, 10, 4, 20, 8, 17, 16, 11, 9, 22, 18, 21, 13, 19, 3, 15, 6, 7, 12, 14
$$

All 22 elements appear once, so 5 is a generator. A short program finds the
order of every element:

```python
def order(g, p):                    # smallest k > 0 with g^k = 1 mod p
    k, x = 1, g % p
    while x != 1:
        x, k = x * g % p, k + 1
    return k

print([order(g, 23) for g in range(1, 23)])
print([g for g in range(1, 23) if order(g, 23) == 22])
```

Output:

```
[1, 11, 11, 11, 22, 11, 22, 11, 11, 22, 22, 11, 11, 22, 22, 11, 22, 11, 22, 22, 22, 2]
[5, 7, 10, 11, 14, 15, 17, 19, 20, 21]
```

Every order is 1, 2, 11 or 22. Ten elements are generators; ten have order 11;
$22 \equiv -1$ has order 2; and 1 has order 1.

<figure class="mars-fig">
<svg viewBox="0 0 560 156" width="560" role="img" aria-label="Bar chart of how many elements of the group mod 23 have each order: 1, 1, 10 and 10">
<text x="102" y="35" font-size="13" text-anchor="end" fill="currentColor">order 1</text>
<rect x="110" y="19" width="33" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="149" y="35" font-size="13" text-anchor="start" fill="currentColor">1 element: 1</text>
<text x="102" y="69" font-size="13" text-anchor="end" fill="currentColor">order 2</text>
<rect x="110" y="53" width="33" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="149" y="69" font-size="13" text-anchor="start" fill="currentColor">1 element: 22</text>
<text x="102" y="103" font-size="13" text-anchor="end" fill="currentColor">order 11</text>
<rect x="110" y="87" width="330" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="446" y="103" font-size="13" text-anchor="start" fill="currentColor">10 elements</text>
<text x="102" y="137" font-size="13" text-anchor="end" fill="currentColor">order 22</text>
<rect x="110" y="121" width="330" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="446" y="137" font-size="13" text-anchor="start" fill="currentColor">10 generators</text>
</svg>
<figcaption>Figure 12.5. How the 22 elements mod 23 split by order. Only the divisors of 22 (1, 2, 11, 22) occur.</figcaption>
</figure>

### Subgroups and Lagrange's theorem

The powers of an element form a smaller group inside the big one, a
**subgroup**. The powers of 4 mod 23 are

$$
1, 4, 16, 18, 3, 12, 2, 8, 9, 13, 6
$$

eleven elements, closed under multiplication. (They are exactly the squares
mod 23.) Notice that 1, 2, 11 and 22 are the divisors of 22. That is no
accident:

<figure class="mars-fig">
<svg viewBox="0 0 440 440" width="440" role="img" aria-label="The 22 powers of 5 modulo 23 arranged in a circle; every second one, the powers of 4, is highlighted">
<line x1="235.8" y1="52.3" x2="246.1" y2="53.8" stroke="currentColor" stroke-width="1.1"/>
<polygon points="252.1,54.6 245.7,56.4 246.5,51.1" fill="currentColor"/>
<line x1="282.4" y1="63.5" x2="291.9" y2="67.8" stroke="currentColor" stroke-width="1.1"/>
<polygon points="297.4,70.3 290.8,70.3 293,65.4" fill="currentColor"/>
<line x1="324" y1="87.5" x2="331.9" y2="94.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="336.4,98.2 330.1,96.3 333.6,92.2" fill="currentColor"/>
<line x1="357.1" y1="122.1" x2="362.7" y2="130.9" stroke="currentColor" stroke-width="1.1"/>
<polygon points="366,135.9 360.5,132.3 365,129.4" fill="currentColor"/>
<line x1="379.1" y1="164.7" x2="382.1" y2="174.7" stroke="currentColor" stroke-width="1.1"/>
<polygon points="383.8,180.5 379.5,175.5 384.7,173.9" fill="currentColor"/>
<line x1="388.3" y1="211.8" x2="388.3" y2="222.2" stroke="currentColor" stroke-width="1.1"/>
<polygon points="388.3,228.2 385.6,222.2 391,222.2" fill="currentColor"/>
<line x1="383.8" y1="259.5" x2="380.8" y2="269.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="379.1,275.3 378.2,268.8 383.4,270.3" fill="currentColor"/>
<line x1="366" y1="304.1" x2="360.4" y2="312.8" stroke="currentColor" stroke-width="1.1"/>
<polygon points="357.1,317.9 358.1,311.4 362.6,314.3" fill="currentColor"/>
<line x1="336.4" y1="341.8" x2="328.5" y2="348.6" stroke="currentColor" stroke-width="1.1"/>
<polygon points="324,352.5 326.8,346.6 330.3,350.6" fill="currentColor"/>
<line x1="297.4" y1="369.7" x2="287.9" y2="374" stroke="currentColor" stroke-width="1.1"/>
<polygon points="282.4,376.5 286.8,371.5 289,376.4" fill="currentColor"/>
<line x1="252.1" y1="385.4" x2="241.8" y2="386.9" stroke="currentColor" stroke-width="1.1"/>
<polygon points="235.8,387.7 241.4,384.2 242.2,389.5" fill="currentColor"/>
<line x1="204.2" y1="387.7" x2="193.9" y2="386.2" stroke="currentColor" stroke-width="1.1"/>
<polygon points="187.9,385.4 194.3,383.6 193.5,388.9" fill="currentColor"/>
<line x1="157.6" y1="376.5" x2="148.1" y2="372.2" stroke="currentColor" stroke-width="1.1"/>
<polygon points="142.6,369.7 149.2,369.7 147,374.6" fill="currentColor"/>
<line x1="116" y1="352.5" x2="108.1" y2="345.7" stroke="currentColor" stroke-width="1.1"/>
<polygon points="103.6,341.8 109.9,343.7 106.4,347.8" fill="currentColor"/>
<line x1="82.9" y1="317.9" x2="77.3" y2="309.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="74,304.1 79.5,307.7 75,310.6" fill="currentColor"/>
<line x1="60.9" y1="275.3" x2="57.9" y2="265.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="56.2,259.5 60.5,264.5 55.3,266.1" fill="currentColor"/>
<line x1="51.7" y1="228.2" x2="51.7" y2="217.8" stroke="currentColor" stroke-width="1.1"/>
<polygon points="51.7,211.8 54.4,217.8 49,217.8" fill="currentColor"/>
<line x1="56.2" y1="180.5" x2="59.2" y2="170.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="60.9,164.7 61.8,171.2 56.6,169.7" fill="currentColor"/>
<line x1="74" y1="135.9" x2="79.6" y2="127.2" stroke="currentColor" stroke-width="1.1"/>
<polygon points="82.9,122.1 81.9,128.6 77.4,125.7" fill="currentColor"/>
<line x1="103.6" y1="98.2" x2="111.5" y2="91.4" stroke="currentColor" stroke-width="1.1"/>
<polygon points="116,87.5 113.2,93.4 109.7,89.4" fill="currentColor"/>
<line x1="142.6" y1="70.3" x2="152.1" y2="66" stroke="currentColor" stroke-width="1.1"/>
<polygon points="157.6,63.5 153.2,68.5 151,63.6" fill="currentColor"/>
<line x1="187.9" y1="54.6" x2="198.2" y2="53.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="204.2,52.3 198.6,55.8 197.8,50.5" fill="currentColor"/>
<circle cx="220" cy="50" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="220" y="54.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="220" y="24" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^0</text>
<circle cx="267.9" cy="56.9" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="267.9" y="61.4" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<text x="276.3" y="32.1" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^1</text>
<circle cx="311.9" cy="77" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="311.9" y="81.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<text x="328.1" y="55.7" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^2</text>
<circle cx="348.5" cy="108.7" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="348.5" y="113.2" font-size="13" text-anchor="middle" fill="currentColor">10</text>
<text x="371.1" y="93" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^3</text>
<circle cx="374.6" cy="149.4" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="374.6" y="153.9" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<text x="401.9" y="140.9" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^4</text>
<circle cx="388.3" cy="195.8" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="388.3" y="200.3" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<text x="418" y="195.5" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^5</text>
<circle cx="388.3" cy="244.2" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="388.3" y="248.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">8</text>
<text x="418" y="252.5" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^6</text>
<circle cx="374.6" cy="290.6" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="374.6" y="295.1" font-size="13" text-anchor="middle" fill="currentColor">17</text>
<text x="401.9" y="307.1" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^7</text>
<circle cx="348.5" cy="331.3" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="348.5" y="335.8" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">16</text>
<text x="371.1" y="355" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^8</text>
<circle cx="311.9" cy="363" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="311.9" y="367.5" font-size="13" text-anchor="middle" fill="currentColor">11</text>
<text x="328.1" y="392.3" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^9</text>
<circle cx="267.9" cy="383.1" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="267.9" y="387.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">9</text>
<text x="276.3" y="415.9" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^10</text>
<circle cx="220" cy="390" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="220" y="394.5" font-size="13" text-anchor="middle" fill="currentColor">22</text>
<text x="220" y="424" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^11</text>
<circle cx="172.1" cy="383.1" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="172.1" y="387.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">18</text>
<text x="163.7" y="415.9" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^12</text>
<circle cx="128.1" cy="363" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="128.1" y="367.5" font-size="13" text-anchor="middle" fill="currentColor">21</text>
<text x="111.9" y="392.3" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^13</text>
<circle cx="91.5" cy="331.3" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="91.5" y="335.8" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">13</text>
<text x="68.9" y="355" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^14</text>
<circle cx="65.4" cy="290.6" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="65.4" y="295.1" font-size="13" text-anchor="middle" fill="currentColor">19</text>
<text x="38.1" y="307.1" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^15</text>
<circle cx="51.7" cy="244.2" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="51.7" y="248.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="22" y="252.5" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^16</text>
<circle cx="51.7" cy="195.8" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="51.7" y="200.3" font-size="13" text-anchor="middle" fill="currentColor">15</text>
<text x="22" y="195.5" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^17</text>
<circle cx="65.4" cy="149.4" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="65.4" y="153.9" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<text x="38.1" y="140.9" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^18</text>
<circle cx="91.5" cy="108.7" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="91.5" y="113.2" font-size="13" text-anchor="middle" fill="currentColor">7</text>
<text x="68.9" y="93" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^19</text>
<circle cx="128.1" cy="77" r="15" class="soft-acc acc" stroke-width="1.3"/>
<text x="128.1" y="81.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">12</text>
<text x="111.9" y="55.7" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^20</text>
<circle cx="172.1" cy="56.9" r="15" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="172.1" y="61.4" font-size="13" text-anchor="middle" fill="currentColor">14</text>
<text x="163.7" y="32.1" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.7">5^21</text>
<text x="220" y="206" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">multiply by 5</text>
<text x="220" y="226" font-size="14" text-anchor="middle" fill="currentColor">each step</text>
<text x="220" y="250" font-size="12" text-anchor="middle" fill="currentColor">highlighted: the 11 powers of 4</text>
<text x="220" y="266" font-size="12" text-anchor="middle" fill="currentColor">(the squares mod 23)</text>
</svg>
<figcaption>Figure 12.6. The group of 22 elements mod 23 as one cycle generated by 5 (small labels are the exponents). Every second step lands in the subgroup generated by 4 = 5², which has 11 elements. 11 divides 22, as Lagrange's theorem demands.</figcaption>
</figure>

!!! note "Lagrange's theorem"
    In a finite group of $N$ elements, the size of every subgroup divides $N$.
    In particular the order of every element divides $N$, so $g^N = 1$ for every $g$.

**Fermat's little theorem**, $a^{p-1} \equiv 1 \pmod p$, is the special case
$N = p - 1$. Lagrange's theorem will matter twice in this chapter: it tells us
how to pick a good group, and it tells the attacker where to look in a bad one.

## 12.5 Diffie-Hellman by hand

*Level: intermediate.* Now the exchange itself, in the group of §12.4: $p = 23$
and $g = 5$. Both are public. Eve knows them too.

<div class="mars-steps" markdown>

1. Everyone, including the eavesdropper Eve, knows $p = 23$ and $g = 5$.
2. Alice picks a secret $a = 6$ and keeps it. Bob picks $b = 15$ and keeps it.
3. Alice computes $A = 5^6 \bmod 23 = 8$ and sends 8. Eve sees 8.
4. Bob computes $B = 5^{15} \bmod 23 = 19$ and sends 19. Eve sees 19.
5. Alice raises Bob's 19 to her secret: $19^6 \bmod 23 = 2$.
6. Bob raises Alice's 8 to his secret: $8^{15} \bmod 23 = 2$.
7. Both hold 2. Eve holds 8 and 19, and would need $a$ or $b$ to get 2.

</div>

Alice's first step, by square and multiply ($6 = 110_2$):

<div class="mars-modexp" data-base="5" data-exp="6" data-mod="23" data-label="Alice's public value: A = 5⁶ mod 23"></div>

| | Alice | Bob |
|---|---|---|
| Secret | $a = 6$ | $b = 15$ |
| Public value | $A = 5^6 \bmod 23 = 8$ | $B = 5^{15} \bmod 23 = 19$ |
| Sends | 8 to Bob | 19 to Alice |
| Shared secret | $B^a = 19^6 \bmod 23 = 2$ | $A^b = 8^{15} \bmod 23 = 2$ |

<figure class="mars-fig">
<svg viewBox="0 0 600 316" width="600" role="img" aria-label="Message sequence chart of Diffie-Hellman with p 23 and g 5: Alice sends 8, Bob sends 19, both compute 2 while Eve only sees 8 and 19">
<rect x="48" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="100" y1="38" x2="100" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="248" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Eve</text>
<line x1="300" y1="38" x2="300" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="448" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="500" y1="38" x2="500" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="50" y="74" width="500" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="50" y="74" width="500" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="91" font-size="13" text-anchor="middle" fill="currentColor">public: p = 23, g = 5</text>
<rect x="47.3" y="116" width="105.4" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="47.3" y="116" width="105.4" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="133" font-size="13" text-anchor="middle" fill="currentColor">secret a = 6</text>
<rect x="443.7" y="116" width="112.6" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="443.7" y="116" width="112.6" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="133" font-size="13" text-anchor="middle" fill="currentColor">secret b = 15</text>
<line x1="100" y1="184" x2="492" y2="184" stroke="currentColor" stroke-width="1.5"/>
<polygon points="500,184 492,187.6 492,180.4" fill="currentColor"/>
<text x="300" y="177" font-size="13" text-anchor="middle" fill="currentColor">A = 5⁶ mod 23 = 8</text>
<line x1="500" y1="228" x2="108" y2="228" stroke="currentColor" stroke-width="1.5"/>
<polygon points="100,228 108,224.4 108,231.6" fill="currentColor"/>
<text x="300" y="221" font-size="13" text-anchor="middle" fill="currentColor">B = 5¹⁵ mod 23 = 19</text>
<rect x="54.6" y="246" width="90.8" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="54.6" y="246" width="90.8" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="263" font-size="13" text-anchor="middle" fill="currentColor">19⁶ mod 23</text>
<text x="100" y="281" font-size="13" text-anchor="middle" fill="currentColor">= 2</text>
<rect x="247.3" y="246" width="105.4" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="247.3" y="246" width="105.4" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="263" font-size="13" text-anchor="middle" fill="currentColor">knows 23, 5,</text>
<text x="300" y="281" font-size="13" text-anchor="middle" fill="currentColor">8 and 19</text>
<rect x="454.6" y="246" width="90.8" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="454.6" y="246" width="90.8" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="263" font-size="13" text-anchor="middle" fill="currentColor">8¹⁵ mod 23</text>
<text x="500" y="281" font-size="13" text-anchor="middle" fill="currentColor">= 2</text>
</svg>
<figcaption>Figure 12.7. The exchange of this section as messages. Everything on the arrows is public; the highlighted results are computed privately and never sent.</figcaption>
</figure>

**Why both get the same number.** $B^a = (g^b)^a = g^{ab}$ and
$A^b = (g^a)^b = g^{ab}$. Here $g^{ab} = 5^{90} \bmod 23 = 2$. Since 5 has order
22, only $90 \bmod 22 = 2$ matters, and indeed $5^2 = 25 \equiv 2$.

**What Eve has to do.** She knows 23, 5, 8 and 19. To get the shared 2 she
seems to need $a$ from $5^a \equiv 8$, or $b$ from $5^b \equiv 19$. In a group of
22 elements she just tries them all. In a group of $2^{2048}$ elements she
cannot.

Three problems, from hardest to easiest for Eve, describe her position:

- **Discrete logarithm (DLP):** given $g$ and $g^a$, find $a$.
- **Computational Diffie-Hellman (CDH):** given $g$, $g^a$ and $g^b$, find $g^{ab}$.
- **Decisional Diffie-Hellman (DDH):** given $g$, $g^a$, $g^b$ and some $Z$,
  tell whether $Z = g^{ab}$ or a random element.

Solving the DLP solves CDH, and solving CDH solves DDH. Nobody has proved the
reverse directions in general, but in the groups used in practice no way is
known to solve CDH except by taking a discrete log. DDH is what we actually want
(it says the shared secret looks random to Eve), and §12.11 shows a group where
it fails even though the DLP is hard.

## 12.6 How hard is the discrete logarithm?

*Level: intermediate.* The obvious attack tries $a = 1, 2, 3, \ldots$ until
$g^a = A$. For a group of $N$ elements that is up to $N$ multiplications. There
is a much better generic method, **baby-step giant-step**, due to Daniel Shanks
(1971).

Write the unknown $x$ as $x = im + j$ with $m \approx \sqrt N$ and
$0 \le j < m$. Then $g^x = h$ becomes

$$
h \cdot \left(g^{-m}\right)^i = g^j .
$$

Make a table of the **baby steps** $g^0, g^1, \ldots, g^{m-1}$. Then take **giant
steps**: multiply $h$ by $g^{-m}$ again and again, and look each result up in the
table. A match at $(i, j)$ gives $x = im + j$.

**By hand.** Find $x$ with $2^x \equiv 48 \pmod{101}$. The group has 100
elements, so $m = 10$.

Baby steps, $2^j \bmod 101$ for $j = 0, \ldots, 9$: 1, 2, 4, 8, 16, 32, 64, 27,
54, 7. The giant step multiplier is $2^{-10} \equiv 65 \pmod{101}$.

| $i$ | $48 \cdot 65^i \bmod 101$ | In the baby table? |
|---|---|---|
| 0 | 48 | no |
| 1 | 90 | no |
| 2 | 93 | no |
| 3 | 86 | no |
| 4 | 35 | no |
| 5 | 53 | no |
| 6 | 11 | no |
| 7 | 8 | yes, $8 = 2^3$ |

So $x = 7 \cdot 10 + 3 = 73$, and indeed $2^{73} \bmod 101 = 48$. Eighteen
steps instead of up to a hundred.

<figure class="mars-fig">
<svg viewBox="0 0 690 215" width="690" role="img" aria-label="Number line of exponents 0 to 99: the baby-step table covers 0 to 9; giant steps start at the unknown 73 and move down by 10 until they land on 3 inside the table">
<line x1="40" y1="160" x2="643.9" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="155" x2="40" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="40" y="182" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="101" y1="155" x2="101" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="101" y="182" font-size="12" text-anchor="middle" fill="currentColor">10</text>
<line x1="162" y1="155" x2="162" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="162" y="182" font-size="12" text-anchor="middle" fill="currentColor">20</text>
<line x1="223" y1="155" x2="223" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="223" y="182" font-size="12" text-anchor="middle" fill="currentColor">30</text>
<line x1="284" y1="155" x2="284" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="284" y="182" font-size="12" text-anchor="middle" fill="currentColor">40</text>
<line x1="345" y1="155" x2="345" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="345" y="182" font-size="12" text-anchor="middle" fill="currentColor">50</text>
<line x1="406" y1="155" x2="406" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="406" y="182" font-size="12" text-anchor="middle" fill="currentColor">60</text>
<line x1="467" y1="155" x2="467" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="467" y="182" font-size="12" text-anchor="middle" fill="currentColor">70</text>
<line x1="528" y1="155" x2="528" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="528" y="182" font-size="12" text-anchor="middle" fill="currentColor">80</text>
<line x1="589" y1="155" x2="589" y2="165" stroke="currentColor" stroke-width="1"/>
<text x="589" y="182" font-size="12" text-anchor="middle" fill="currentColor">90</text>
<rect x="40" y="146" width="54.9" height="28" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="67.5" y="204" font-size="13" text-anchor="middle" fill="currentColor">baby steps 2^0 … 2^9</text>
<circle cx="485.3" cy="160" r="5" fill="currentColor"/>
<text x="485.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=0</text>
<path d="M485.29999999999995,120 Q454.79999999999995,76 424.29999999999995,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="424.3,131 421.1,124 427.4,124" fill="currentColor"/>
<circle cx="424.3" cy="160" r="5" fill="currentColor"/>
<text x="424.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=1</text>
<path d="M424.29999999999995,120 Q393.79999999999995,76 363.29999999999995,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="363.3,131 360.1,124 366.4,124" fill="currentColor"/>
<circle cx="363.3" cy="160" r="5" fill="currentColor"/>
<text x="363.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=2</text>
<path d="M363.29999999999995,120 Q332.79999999999995,76 302.3,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="302.3,131 299.2,124 305.4,124" fill="currentColor"/>
<circle cx="302.3" cy="160" r="5" fill="currentColor"/>
<text x="302.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=3</text>
<path d="M302.3,120 Q271.79999999999995,76 241.29999999999998,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="241.3,131 238.1,124 244.4,124" fill="currentColor"/>
<circle cx="241.3" cy="160" r="5" fill="currentColor"/>
<text x="241.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=4</text>
<path d="M241.29999999999998,120 Q210.79999999999998,76 180.29999999999998,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="180.3,131 177.1,124 183.4,124" fill="currentColor"/>
<circle cx="180.3" cy="160" r="5" fill="currentColor"/>
<text x="180.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=5</text>
<path d="M180.29999999999998,120 Q149.8,76 119.3,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="119.3,131 116.1,124 122.5,124" fill="currentColor"/>
<circle cx="119.3" cy="160" r="5" fill="currentColor"/>
<text x="119.3" y="146" font-size="12" text-anchor="middle" fill="currentColor">i=6</text>
<path d="M119.3,120 Q88.8,76 58.3,126" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="58.3,131 55.1,124 61.4,124" fill="currentColor"/>
<circle cx="58.3" cy="160" r="5" class="acc-fill"/>
<text x="58.3" y="140" font-size="12" text-anchor="middle" class="acc-fill" font-weight="bold">i=7</text>
<text x="495.3" y="100" font-size="13" text-anchor="start" fill="currentColor">start: 48 = 2^x, x unknown (it is 73)</text>
<text x="271.8" y="62" font-size="12" text-anchor="middle" fill="currentColor">each giant step: × 2^-10, x drops by 10</text>
</svg>
<figcaption>Figure 12.8. Baby-step giant-step for 2^x ≡ 48 (mod 101), drawn on the exponent line. Each giant step multiplies by 2^-10 = 65 and so moves the unknown exponent down by 10; after 7 steps it lands on 3, inside the table.</figcaption>
</figure>

```python
from math import isqrt

def bsgs(g, h, p):                             # find x with g^x = h mod p
    m = isqrt(p - 1) + 1
    baby = {pow(g, j, p): j for j in range(m)} # g^0 .. g^(m-1)
    step = pow(g, -m, p)                       # g^(-m)
    y = h
    for i in range(m):                         # h * g^(-im) for i = 0, 1, ...
        if y in baby:
            return i * m + baby[y]
        y = y * step % p
    return None

print(bsgs(2, 48, 101))                        # 73
p = 4294967291                                 # the largest prime below 2^32
h = pow(2, 3141592653, p)                      # a 32-bit "export-grade" public key
x = bsgs(2, h, p)
print(x, pow(2, x, p) == h)                    # an exponent that works, in a blink
```

Output:

```
73
3141592653 True
```

A 32-bit group falls in a fraction of a second, using a table of 65,536
entries. Baby-step giant-step costs about $\sqrt N$ time and memory, and
Pollard's rho method (1978) gets the same time with almost no memory. Victor
Shoup proved in 1997 that any algorithm that treats the group as a black box
needs about $\sqrt N$ steps. So in a group with no exploitable structure, a
256-bit group order gives about 128-bit security.

Daniel Shanks, an American number theorist who had spent years at the US Navy's
research laboratories before becoming a professor at the University of Maryland,
published the method in 1971 as a tool for computing class numbers, a question in
pure number theory. It was cryptography's luck that it applies to any group. John
Pollard, a British mathematician at British Telecom's research laboratories who had
already given factoring his $p - 1$ method (1974) and his rho method (1975), added
the low-memory rho method for discrete logs in 1978. These generic attacks never retired:
they set the yardstick. Every group in this book is sized so that $\sqrt N$ is out
of reach.

!!! note "Life story: baby-step giant-step"
    **Born:** 1971, Daniel Shanks · **Purpose:** class-number computations in number theory · **Helped:** became
    the standard generic discrete-log attack, with Pollard's rho (1978) as its low-memory partner · **Status:**
    current, as an attack; Shoup's 1997 bound says nothing generic does better, so it fixes group sizes

The integers mod $p$ do have structure: numbers factor into primes. The
**number field sieve** uses that, and solves discrete logs mod $p$ in roughly the
same time as factoring a number of the same size. That is why finite-field
Diffie-Hellman needs primes of 2048 bits or more, not 256 bits; the record
discrete log mod a prime is 795 bits (December 2019). [Chapter 15](15-Elliptic-Curves.md)
shows groups where no such sieve is known, which is why elliptic-curve keys are
so much smaller.

## 12.7 Code it

*Level: intermediate.* A real exchange uses a published group of at least 2048
bits. RFC 3526 group 14 is a **safe prime** $p = 2q + 1$ with $q$ also prime, and
$g = 2$ has order $q$. Two more things make it usable:

- **Check what you receive.** Reject 0, 1 and $p - 1$, and check that the value
  is in the subgroup of order $q$ ($Y^q \equiv 1$). §12.8 shows why.
- **Never use the raw secret as a key.** $g^{ab}$ is a group element, not a
  string of uniform random bits. Pass it through a key derivation function such as
  HKDF ([Chapter 11](11-Passwords-and-Key-Derivation.md)) with a label naming its
  purpose.

```python
import hashlib, hmac, secrets

# RFC 3526 group 14: a 2048-bit safe prime p = 2q + 1, generator g = 2
p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g, q = 2, (p - 1) // 2

def keypair():
    x = secrets.randbelow(q - 1) + 1          # secret exponent
    return x, pow(g, x, p)                    # (private, public)

def check(Y):                                 # reject 0, 1, p-1 and anything outside the order-q subgroup
    return 1 < Y < p - 1 and pow(Y, q, p) == 1

def hkdf(secret, info, n=32):                 # RFC 5869 with SHA-256, empty salt
    prk = hmac.new(bytes(32), secret, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out, i = out + t, i + 1
    return out[:n]

a, A = keypair()                              # Alice
b, B = keypair()                              # Bob
assert check(A) and check(B)
za = pow(B, a, p).to_bytes(256, "big")        # Alice's view
zb = pow(A, b, p).to_bytes(256, "big")        # Bob's view
ka, kb = hkdf(za, b"demo v1 key"), hkdf(zb, b"demo v1 key")
print(p.bit_length(), ka == kb, len(ka))      # 2048 True 32
```

The whole exchange takes a few milliseconds. The `hkdf` function matches test
case 3 of RFC 5869. Both sides now hold the same 32-byte key, ready for
AES-GCM or ChaCha20-Poly1305 ([Chapter 10](10-Message-Authentication.md)).
Notice that the shared secret is written as exactly 256 bytes, leading zeros
included; §12.9 shows an attack on a protocol that stripped them.

## 12.8 Break it

*Level: intermediate.* Diffie-Hellman has been broken in practice many times,
almost never by solving a well-chosen 2048-bit discrete log. Here are the ways it
actually fails.

### Attack 1: the man in the middle

Diffie-Hellman proves to Alice that she shares a key with *whoever sent $B$*. It
says nothing about who that was. Mallory, sitting on the wire, runs one exchange
with Alice and another with Bob:

```python
import secrets

p, g = 2**127 - 1, 3                           # a Mersenne prime; small, for show
rand = lambda: secrets.randbelow(p - 2) + 1

a, b, m = rand(), rand(), rand()               # Alice, Bob and Mallory's secrets
A, B, M = pow(g, a, p), pow(g, b, p), pow(g, m, p)

# Mallory sits on the wire: Bob receives M instead of A, Alice receives M instead of B
alice_key = pow(M, a, p)                       # Alice thinks this is shared with Bob
bob_key = pow(M, b, p)                         # Bob thinks this is shared with Alice
print(alice_key == bob_key)                                   # False
print(alice_key == pow(A, m, p), bob_key == pow(B, m, p))     # True True: Mallory has both
```

Alice and Bob each hold a perfectly good key, shared with Mallory. She decrypts
what Alice sends, reads or changes it, and re-encrypts it for Bob. Neither sees
anything wrong. No choice of group helps; this is a hole in the protocol, not
in the mathematics. §12.9 fixes it.

<figure class="mars-fig">
<svg viewBox="0 0 600 362" width="600" role="img" aria-label="Sequence chart of the man in the middle: Mallory swaps both public values for her own and ends up with a key shared with each side">
<rect x="48" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="100" y1="38" x2="100" y2="356" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="248" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Mallory</text>
<line x1="300" y1="38" x2="300" y2="356" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="448" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="500" y1="38" x2="500" y2="356" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<line x1="100" y1="100" x2="292" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="300,100 292,103.6 292,96.4" fill="currentColor"/>
<text x="200" y="93" font-size="13" text-anchor="middle" fill="currentColor">A = gᵃ</text>
<line x1="300" y1="144" x2="492" y2="144" class="acc" stroke-width="1.5"/>
<polygon points="500,144 492,147.6 492,140.4" class="acc-fill"/>
<text x="400" y="137" font-size="13" text-anchor="middle" fill="currentColor">M = gᵐ  (as 'Alice')</text>
<line x1="500" y1="188" x2="308" y2="188" stroke="currentColor" stroke-width="1.5"/>
<polygon points="300,188 308,184.4 308,191.6" fill="currentColor"/>
<text x="400" y="181" font-size="13" text-anchor="middle" fill="currentColor">B = gᵇ</text>
<line x1="300" y1="232" x2="108" y2="232" class="acc" stroke-width="1.5"/>
<polygon points="100,232 108,228.4 108,235.6" class="acc-fill"/>
<text x="200" y="225" font-size="13" text-anchor="middle" fill="currentColor">M = gᵐ  (as 'Bob')</text>
<rect x="69.2" y="250" width="61.7" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="69.2" y="250" width="61.7" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="267" font-size="13" text-anchor="middle" fill="currentColor">key Mᵃ</text>
<text x="100" y="285" font-size="13" text-anchor="middle" fill="currentColor">= gᵃᵐ</text>
<rect x="265.5" y="250" width="69" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="265.5" y="250" width="69" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="267" font-size="13" text-anchor="middle" fill="currentColor">has gᵃᵐ</text>
<text x="300" y="285" font-size="13" text-anchor="middle" fill="currentColor">and gᵇᵐ</text>
<rect x="469.2" y="250" width="61.7" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="469.2" y="250" width="61.7" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="267" font-size="13" text-anchor="middle" fill="currentColor">key Mᵇ</text>
<text x="500" y="285" font-size="13" text-anchor="middle" fill="currentColor">= gᵇᵐ</text>
<rect x="50" y="310" width="500" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="50" y="310" width="500" height="26" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="327" font-size="13" text-anchor="middle" fill="currentColor">Mallory decrypts, reads, changes, re-encrypts</text>
</svg>
<figcaption>Figure 12.9. The man in the middle. Each side completes a correct exchange, but with Mallory. Nothing in the numbers says who sent them.</figcaption>
</figure>

### Attack 2: forced values

If Mallory replaces $A$ with $1$, Bob's "shared secret" is $1^b = 1$. With
$A = p - 1$, it is $(-1)^b = \pm 1$. With $A = 0$, it is 0. Mallory now knows the
key without solving anything. The fix is the check in §12.7: reject 0, 1 and
$p - 1$.

### Attack 3: small subgroups

The check for 1 and $p - 1$ is not enough if the group has other small subgroups.
By Lagrange's theorem, $\mathbb{Z}_p^*$ has a subgroup for every divisor of
$p - 1$. If Bob keeps a long-term secret $b$ and raises *whatever he receives*
to it, Mallory can send an element $h$ of small order $r$. Then $h^b$ can take
only $r$ different values, and if Bob uses it in any way Mallory can see (say,
to MAC a reply), she tries all $r$ and learns $b \bmod r$. Repeat with several
small orders and the Chinese remainder theorem joins the pieces into $b$. Chae
Hoon Lim and Pil Joong Lee described this in 1997.

Here is the attack on a badly chosen 250-bit prime whose $p - 1$ is a product of
small primes:

```python
import hashlib, hmac, random

def is_prime(n):                               # Miller-Rabin, fixed bases, fine for a demo
    if n < 2: return False
    for sp in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % sp == 0: return n == sp
    d, s = n - 1, 0
    while d % 2 == 0: d, s = d // 2, s + 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1): continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1: break
        else: return False
    return True

# A badly chosen prime: p - 1 is a product of small primes, about 256 bits
rng = random.Random(2015)
smalls = [r for r in range(30000, 70000) if is_prime(r)]
while True:
    rs = rng.sample(smalls, 16)
    p = 2
    for r in rs: p *= r
    p += 1
    if is_prime(p): break
print(p.bit_length(), "bits, p - 1 = 2 *", " * ".join(map(str, sorted(rs)[:3])), "* ...")

b = rng.randrange(2, p - 1)                    # Bob's long-term secret
def bob(h):                                    # Bob answers any value with a MAC under h^b
    k = pow(h, b, p).to_bytes(32, "big")
    return hmac.new(k, b"hello", hashlib.sha256).digest()

residues = []
for r in rs:
    while True:                                # an element of order exactly r
        h = pow(rng.randrange(2, p - 1), (p - 1) // r, p)
        if h != 1: break
    tag = bob(h)
    for x in range(r):                         # only r possible keys: try them all
        if hmac.new(pow(h, x, p).to_bytes(32, "big"), b"hello", hashlib.sha256).digest() == tag:
            residues.append((x, r))            # now we know b mod r
            break

M, x = 1, 0                                    # join the pieces: Chinese remainder theorem
for xr, r in residues:
    x += M * ((xr - x) * pow(M, -1, r) % r)
    M *= r
print(M == (p - 1) // 2, b in (x, x + M))      # b is x or x + M: two guesses left
```

Output:

```
250 bits, p - 1 = 2 * 30631 * 31663 * 32869 * ...
True True
```

Sixteen fake messages and about 800,000 MAC computations recover a 250-bit
secret in a few seconds. Two defenses, used together:

<figure class="mars-fig">
<svg viewBox="0 0 680 300" width="680" role="img" aria-label="Small-subgroup attack: for each small prime r Mallory sends an element of order r, Bob answers with a MAC, Mallory tries r keys and learns b mod r; the Chinese remainder theorem joins sixteen residues into b">
<rect x="20" y="20" width="150" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="150" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="95" y="42.1" font-size="13" text-anchor="middle" fill="currentColor">1. send h of</text>
<text x="95" y="59" font-size="13" text-anchor="middle" fill="currentColor">small order r</text>
<rect x="20" y="100" width="150" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="100" width="150" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="95" y="122.1" font-size="13" text-anchor="middle" fill="currentColor">2. Bob replies</text>
<text x="95" y="139" font-size="13" text-anchor="middle" fill="currentColor">MAC under hᵇ</text>
<rect x="20" y="180" width="150" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="180" width="150" height="52" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="95" y="202.1" font-size="13" text-anchor="middle" fill="currentColor">3. try all r keys</text>
<text x="95" y="219" font-size="13" text-anchor="middle" fill="currentColor">→ b mod r</text>
<line x1="95" y1="72" x2="95" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="95,98 91.4,90 98.6,90" fill="currentColor"/>
<line x1="95" y1="152" x2="95" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="95,178 91.4,170 98.6,170" fill="currentColor"/>
<path d="M170,206 C 215,206 215,46 172,46" stroke="currentColor" fill="none" stroke-width="1.3"/>
<polygon points="172,46 179,42.9 179,49.1" fill="currentColor"/>
<text x="240" y="130" font-size="12" text-anchor="start" fill="currentColor">repeat for</text>
<text x="240" y="146" font-size="12" text-anchor="start" fill="currentColor">16 primes</text>
<rect x="330" y="30" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="330" y="30" width="140" height="34" rx="6" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="51.5" font-size="13" text-anchor="middle" fill="currentColor">b mod 30631</text>
<line x1="470" y1="47" x2="544.1" y2="135.4" stroke="currentColor" stroke-width="1.1"/>
<polygon points="548,140 542.1,137.1 546.2,133.7" fill="currentColor"/>
<rect x="330" y="76" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="330" y="76" width="140" height="34" rx="6" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="97.5" font-size="13" text-anchor="middle" fill="currentColor">b mod 31663</text>
<line x1="470" y1="93" x2="542.9" y2="136.9" stroke="currentColor" stroke-width="1.1"/>
<polygon points="548,140 541.5,139.2 544.3,134.6" fill="currentColor"/>
<rect x="330" y="122" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="330" y="122" width="140" height="34" rx="6" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="143.6" font-size="13" text-anchor="middle" fill="currentColor">b mod 32869</text>
<line x1="470" y1="139" x2="542" y2="139.9" stroke="currentColor" stroke-width="1.1"/>
<polygon points="548,140 542,142.6 542,137.2" fill="currentColor"/>
<rect x="330" y="168" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="330" y="168" width="140" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="189.6" font-size="13" text-anchor="middle" fill="currentColor">…</text>
<line x1="470" y1="185" x2="542.8" y2="143" stroke="currentColor" stroke-width="1.1"/>
<polygon points="548,140 544.2,145.3 541.5,140.7" fill="currentColor"/>
<rect x="330" y="214" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="330" y="214" width="140" height="34" rx="6" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="235.6" font-size="13" text-anchor="middle" fill="currentColor">b mod r₁₆</text>
<line x1="470" y1="231" x2="544.1" y2="144.6" stroke="currentColor" stroke-width="1.1"/>
<polygon points="548,140 546.1,146.3 542,142.8" fill="currentColor"/>
<rect x="550" y="115" width="110" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="550" y="115" width="110" height="50" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="605" y="135.8" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">CRT</text>
<text x="605" y="154" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">→ b</text>
<text x="340" y="284" font-size="13" text-anchor="middle" fill="currentColor">each piece costs at most r &lt; 70,000 MAC trials</text>
</svg>
<figcaption>Figure 12.10. The small-subgroup attack of the code above. Each fake value pins down Bob's secret modulo one small prime; the Chinese remainder theorem glues the pieces back together.</figcaption>
</figure>

- **Use a group with no small subgroups to exploit.** With a safe prime
  $p = 2q + 1$, the only subgroups have sizes 1, 2, $q$ and $2q$. Or use a
  **Schnorr group**: a subgroup of large prime order $q$ inside $\mathbb{Z}_p^*$,
  as DSA does ([Chapter 14](14-Discrete-Log-Systems.md)).
- **Validate.** Check $Y^q \equiv 1 \pmod p$, so $Y$ lies in the prime-order
  subgroup. Or use a fresh $b$ for every exchange, so there is nothing to
  accumulate.

!!! note "Life story: the small-subgroup attack"
    **Born:** 1997, Chae Hoon Lim and Pil Joong Lee (building on Pohlig and Hellman, 1978) · **Purpose:** an
    attack on protocols that reuse a secret exponent with unchecked inputs · **Impact:** made prime-order groups
    and input validation standard practice; it returns in new clothes as the invalid-curve attack of
    [Chapter 15](15-Elliptic-Curves.md) · **Status:** defeated by safe primes or Schnorr groups plus validation

### Attack 4: Logjam, weak and shared primes

In May 2015 David Adrian and thirteen co-authors published "Imperfect Forward
Secrecy: How Diffie-Hellman Fails in Practice". They found two problems.

The first was a protocol flaw. TLS still contained "export" cipher suites from
the 1990s, when US law limited exported cryptography; their Diffie-Hellman
groups were 512 bits. A man in the middle could rewrite a client's request so
the server picked an export suite, and the client, not checking, accepted a
512-bit group. Most of the number field sieve's work depends only on the prime,
not on the individual key. After a week of precomputation for one prime, the
team could compute individual discrete logs in about a minute, fast enough to
finish before the handshake timed out. Around 8% of the top million HTTPS sites
supported export DH.

<figure class="mars-fig">
<svg viewBox="0 0 640 398" width="640" role="img" aria-label="Sequence chart of the Logjam downgrade: the attacker rewrites the client's offer to export-grade Diffie-Hellman, the server signs a 512-bit group, the attacker solves the discrete log and completes the handshake">
<rect x="38" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="90" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Client</text>
<line x1="90" y1="38" x2="90" y2="392" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="268" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">MITM</text>
<line x1="320" y1="38" x2="320" y2="392" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="498" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="550" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Server</text>
<line x1="550" y1="38" x2="550" y2="392" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<line x1="90" y1="100" x2="312" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,100 312,103.6 312,96.4" fill="currentColor"/>
<text x="205" y="93" font-size="13" text-anchor="middle" fill="currentColor">ClientHello: normal DHE suites</text>
<line x1="320" y1="144" x2="542" y2="144" class="acc" stroke-width="1.5"/>
<polygon points="550,144 542,147.6 542,140.4" class="acc-fill"/>
<text x="435" y="137" font-size="13" text-anchor="middle" fill="currentColor">ClientHello: DHE_EXPORT only</text>
<line x1="550" y1="204" x2="328" y2="204" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,204 328,200.4 328,207.6" fill="currentColor"/>
<text x="435" y="181" font-size="13" text-anchor="middle" fill="currentColor">512-bit p, g, gʸ</text>
<text x="435" y="197" font-size="13" text-anchor="middle" fill="currentColor">+ signature (not over the suite)</text>
<line x1="320" y1="248" x2="98" y2="248" stroke="currentColor" stroke-width="1.5"/>
<polygon points="90,248 98,244.4 98,251.6" fill="currentColor"/>
<text x="205" y="241" font-size="13" text-anchor="middle" fill="currentColor">passed on unchanged</text>
<rect x="33.7" y="266" width="112.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="33.7" y="266" width="112.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="90" y="283" font-size="13" text-anchor="middle" fill="currentColor">accepts a</text>
<text x="90" y="301" font-size="13" text-anchor="middle" fill="currentColor">512-bit group</text>
<rect x="230.9" y="266" width="178.2" height="62" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="230.9" y="266" width="178.2" height="62" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="283" font-size="13" text-anchor="middle" fill="currentColor">log of gʸ in about</text>
<text x="320" y="301" font-size="13" text-anchor="middle" fill="currentColor">a minute (after a week</text>
<text x="320" y="319" font-size="13" text-anchor="middle" fill="currentColor">per prime, done once)</text>
<line x1="320" y1="370" x2="98" y2="370" class="acc" stroke-width="1.5"/>
<polygon points="90,370 98,366.4 98,373.6" class="acc-fill"/>
<text x="205" y="363" font-size="13" text-anchor="middle" fill="currentColor">forged Finished: handshake completes</text>
</svg>
<figcaption>Figure 12.11. Logjam's downgrade. The server's signature covered the group but not the cipher suite, so the client could not tell that its request had been rewritten.</figcaption>
</figure>

The second was an observation about scale. Most servers used one of a handful
of hard-coded 1024-bit primes. A 1024-bit precomputation is far beyond
academics but, the authors estimated, within reach of a national agency's
budget, and it would be done once per prime. Breaking the most common 1024-bit
prime would expose 18% of the top million HTTPS sites, and a second prime would
expose two thirds of the VPN servers and a quarter of the SSH servers they
scanned.

The fixes: remove export suites, use at least 2048-bit groups, and prefer the
named groups of RFC 7919 (or elliptic curves) whose primes were generated in a
verifiable way. Over the following years browsers stopped offering finite-field DH in TLS altogether.

The Logjam team came from universities and research labs in the United States and
France. Their internet-wide scans turned a known theoretical worry (the export
suites had been obsolete since US export rules were relaxed in 2000) into a
measured, fixable problem.

!!! note "Life story: Logjam"
    **Born:** May 2015, David Adrian and thirteen co-authors · **Purpose:** show how finite-field Diffie-Hellman
    fails in practice: export-grade downgrade plus shared, precomputable primes · **Impact:** browsers rejected
    groups under 1024 bits, then dropped finite-field DHE in TLS; export suites were removed everywhere · **Lesson:**
    one shared prime is one shared target

## 12.9 Authentication: who is on the other end?

*Level: intermediate.* The man in the middle is beaten by making each side
**prove who sent its public value**. With digital signatures (the subject of
the next two chapters), the fix looks like this:

1. Alice sends $A = g^a$.
2. Bob sends $B = g^b$, his certificate, and his signature on $(A, B)$.
3. Alice checks the certificate and the signature, then sends her certificate
   and her signature on $(A, B)$.
4. Both compute $g^{ab}$ and derive keys.

Mallory can still replace $A$ with $M$, but then Bob signs $(M, B)$, and Alice,
who sent $A$, rejects it. To forge a signature on the right pair she would need
Bob's private signing key.

<figure class="mars-fig">
<svg viewBox="0 0 520 350" width="520" role="img" aria-label="Sequence chart of signed Diffie-Hellman: each side signs both public values with a certified key">
<rect x="78" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="130" y1="38" x2="130" y2="344" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="338" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="390" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="390" y1="38" x2="390" y2="344" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<line x1="130" y1="100" x2="382" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="390,100 382,103.6 382,96.4" fill="currentColor"/>
<text x="260" y="93" font-size="13" text-anchor="middle" fill="currentColor">A = gᵃ</text>
<line x1="390" y1="160" x2="138" y2="160" class="acc" stroke-width="1.5"/>
<polygon points="130,160 138,156.4 138,163.6" class="acc-fill"/>
<text x="260" y="137" font-size="13" text-anchor="middle" fill="currentColor">B = gᵇ, cert_Bob,</text>
<text x="260" y="153" font-size="13" text-anchor="middle" fill="currentColor">Sign_Bob(A, B)</text>
<rect x="73.7" y="178" width="112.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="73.7" y="178" width="112.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="195" font-size="13" text-anchor="middle" fill="currentColor">checks cert</text>
<text x="130" y="213" font-size="13" text-anchor="middle" fill="currentColor">and signature</text>
<line x1="130" y1="280" x2="382" y2="280" class="acc" stroke-width="1.5"/>
<polygon points="390,280 382,283.6 382,276.4" class="acc-fill"/>
<text x="260" y="257" font-size="13" text-anchor="middle" fill="currentColor">cert_Alice,</text>
<text x="260" y="273" font-size="13" text-anchor="middle" fill="currentColor">Sign_Alice(A, B)</text>
<rect x="77.3" y="298" width="105.4" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="77.3" y="298" width="105.4" height="26" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="315" font-size="13" text-anchor="middle" fill="currentColor">key from gᵃᵇ</text>
<rect x="337.3" y="298" width="105.4" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="337.3" y="298" width="105.4" height="26" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="390" y="315" font-size="13" text-anchor="middle" fill="currentColor">key from gᵃᵇ</text>
</svg>
<figcaption>Figure 12.12. Signed Diffie-Hellman in the station-to-station shape. A swapped value no longer matches what the other side signed.</figcaption>
</figure>

This is the **station-to-station protocol** of Whitfield Diffie, Paul van
Oorschot and Michael Wiener (1992), in simplified form. Hugo Krawczyk's SIGMA
family (2003) refined it, and it is the shape of the TLS 1.3 handshake: the
server signs a hash of the whole handshake transcript, including both key
shares. [Chapter 16](16-PKI-and-Key-Establishment.md) explains how Alice knows
the signing key really is Bob's, and [Chapter 19](19-Protocols.md) walks
through TLS.

!!! note "Life story: signed Diffie-Hellman (STS and SIGMA)"
    **Born:** 1992, Whitfield Diffie, Paul van Oorschot and Michael Wiener (station-to-station); refined by Hugo Krawczyk's SIGMA in 2003 · **Purpose:** stop the man in the middle
    by binding each exchange to certified identities · **Helped:** the design behind IKE in IPsec and the TLS 1.3
    handshake · **Status:** current

The signatures add **authentication**. The Diffie-Hellman part adds something a
signature cannot: **forward secrecy**. If Alice and Bob throw away $a$ and $b$
after the session, then even someone who later steals both of their long-term
signing keys cannot recover $g^{ab}$ from a recording of the traffic. The
signing keys only ever proved identity; they never protected the session key.
That is why TLS 1.3 (RFC 8446, 2018) removed every key exchange without it.

Raccoon (Robert Merget and others, 2020) is a reminder that the details still
matter. TLS 1.2 strips leading zero bytes from the Diffie-Hellman secret before
hashing it, so the hash runs slightly faster when the secret starts with a zero
byte. A server that reused its secret exponent leaked, through timing, whether
$g^{ab}$ for a victim's connection began with zeros. With enough related
connections that was enough to recover the secret. TLS 1.3 keeps the zeros.

!!! note "Life story: Raccoon"
    **Born:** September 2020, Robert Merget, Marcus Brinkmann, Nimrod Aviram, Juraj Somorovsky, Johannes Mittmann
    and Jörg Schwenk · **Purpose:** a timing attack on TLS 1.2 servers that reuse a Diffie-Hellman exponent ·
    **Impact:** hard to exploit in practice, but it showed one more reason to use fresh exponents and fixed-length
    secrets · **Fixed by:** TLS 1.3's key schedule, and libraries refusing to reuse DH secrets

## 12.10 In the real world

**Where it runs.** Finite-field Diffie-Hellman carried the session keys of SSL
and TLS (the DHE suites), SSH (diffie-hellman-group14-sha256), IPsec's IKE
(RFC 7296) and OpenPGP's ElGamal ([Chapter 14](14-Discrete-Log-Systems.md)).
Today most of those connections use the elliptic-curve version, X25519
([Chapter 15](15-Elliptic-Curves.md)), which does the same job with 32-byte keys
instead of 256-byte ones, and increasingly a hybrid of X25519 with the
post-quantum ML-KEM ([Chapter 21](21-Lattice-Cryptography.md)).

**Parameters.**

| Use | Group | Notes |
|---|---|---|
| TLS 1.3 | ffdhe2048 to ffdhe8192 (RFC 7919) | safe primes derived from the digits of $e$; rarely negotiated in practice |
| SSH, IKE | RFC 3526 groups 14 to 18 (2048 to 8192 bits) | safe primes derived from $\pi$ |
| minimum | 2048 bits (about 112-bit security) | NIST SP 800-56A Rev. 3, SP 800-57 |
| 128-bit security | 3072 bits | |
| avoid | 512 and 768 bits; 1024 bits | broken (Logjam); within reach of a well-funded attacker |

**Status.** Sound at 2048 bits and up against ordinary computers. A large
quantum computer running Shor's algorithm ([Chapter 20](20-Quantum-Computers.md))
would solve discrete logs at any size, so NIST IR 8547 deprecates finite-field
and elliptic-curve Diffie-Hellman after 2030 and disallows them after 2035.
Traffic recorded today could be decrypted then, which is why key exchange is the
first thing being moved to hybrids.

**Credit and patents.** Stanford patented the method (US 4,200,770, Hellman,
Diffie and Merkle); it expired in 1997. Hellman has asked that the exchange be
called Diffie-Hellman-Merkle. Diffie and Hellman received the Turing Award for
2015.

Diffie and Hellman's paper did more than describe one protocol. It named the
problems (public-key encryption, digital signatures, one-way trapdoor functions)
that the next two chapters solve, and it opened cryptography as an academic field
in the United States. The NSA did not welcome that: in 1977 a letter to the IEEE
from one of its employees, Joseph Meyer, warned that publishing such work might
break arms-export law. Stanford's lawyers told Hellman that his students could be
at risk if they presented their papers, so at a symposium at Cornell that October
he presented them himself. Nothing came of the threat, and open research went on.

The exchange then spread into almost everything: SSL 3.0's ephemeral "DHE"
suites (1996), version 2 of SSH (designed from 1996), IPsec's key exchange (1998), and through its elliptic-curve
form into TLS 1.3, Signal and WireGuard. Its finite-field form is now mostly
retired from the web in favor of X25519, but the idea has not aged at all: every
modern key exchange, including the post-quantum KEMs of
[Chapter 21](21-Lattice-Cryptography.md), still answers the question Diffie was
asking in 1974.

!!! note "Life story: Diffie-Hellman key exchange"
    **Born:** 1976, Whitfield Diffie and Martin Hellman at Stanford, with Ralph Merkle (found in secret at GCHQ by
    Malcolm Williamson in 1974) · **Purpose:** let two strangers agree on a secret key over a public line ·
    **Helped:** made key distribution automatic for SSH, SSL/TLS, IPsec and messaging; gave forward secrecy ·
    **Weakened:** 512-bit export groups broken by Logjam (2015); 1024-bit groups now considered within a nation's
    reach · **Status:** current at 2048 bits and up, mostly replaced on the web by X25519
    ([Chapter 15](15-Elliptic-Curves.md)); deprecated by NIST after 2030 because of quantum computers, with
    hybrid ML-KEM as the successor

Full details: [Diffie-Hellman reference](../01-key-exchange/Diffie-Hellman.md),
[Hard problems](../10-math-foundations/Hard-Problems.md).

## 12.11 Going deeper

*Level: expert.*

### Pohlig-Hellman: the order's largest prime factor is what counts

Stephen Pohlig and Martin Hellman (1978) turned the small-subgroup idea into a
general algorithm. Let $g$ have order $N = \prod r_i^{e_i}$, and suppose
$h = g^x$. For each prime power $r^e$ dividing $N$, raise both sides to $N / r^e$:

$$
\left(g^{N/r^e}\right)^x = h^{N/r^e} .
$$

The new base has order $r^e$, so this equation determines only $x \bmod r^e$,
and a discrete log in a group of size $r^e$ costs about $e\sqrt r$ steps (digit
by digit in base $r$). The Chinese remainder theorem then gives $x \bmod N$.
Total cost: about $\sum e_i \sqrt{r_i}$, dominated by the **largest prime factor**
of $N$.

**By hand.** Solve $3^x \equiv 26 \pmod{31}$, where 3 generates the group of
order $30 = 2 \cdot 3 \cdot 5$.

| Prime | Raise to | Equation | Result |
|---|---|---|---|
| 2 | $30/2 = 15$ | $(3^{15})^x = 26^{15}$, that is $30^x = 30$ | $x \equiv 1 \pmod 2$ |
| 3 | $30/3 = 10$ | $(3^{10})^x = 26^{10}$, that is $25^x = 5$; $25^2 = 625 \equiv 5$ | $x \equiv 2 \pmod 3$ |
| 5 | $30/5 = 6$ | $(3^6)^x = 26^6$, that is $16^x = 1$ | $x \equiv 0 \pmod 5$ |

The only $x$ below 30 with those three remainders is $x = 5$, and
$3^5 = 243 = 7 \cdot 31 + 26$. Each piece needed a search through at most five
values.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Pohlig-Hellman tree: the equation 3^x = 26 mod 31 splits into equations mod 2, 3 and 5 with answers 1, 2 and 0, which the Chinese remainder theorem joins into x = 5">
<rect x="200" y="14" width="240" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="200" y="14" width="240" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="40.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">3^x ≡ 26 (mod 31), order 30</text>
<line x1="320" y1="58" x2="117.9" y2="90.7" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,92 117.3,87.2 118.5,94.3" fill="currentColor"/>
<rect x="25" y="94" width="170" height="48" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="25" y="94" width="170" height="48" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="110" y="114.1" font-size="13" text-anchor="middle" fill="currentColor">raise to 15</text>
<text x="110" y="131" font-size="13" text-anchor="middle" fill="currentColor">30^x = 30</text>
<line x1="110" y1="142" x2="110" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,168 106.4,160 113.6,160" fill="currentColor"/>
<rect x="40" y="170" width="140" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="40" y="170" width="140" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="110" y="190.6" font-size="13" text-anchor="middle" fill="currentColor">x ≡ 1 (mod 2)</text>
<line x1="110" y1="202" x2="312.1" y2="225.1" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,226 311.6,228.7 312.5,221.5" fill="currentColor"/>
<line x1="320" y1="58" x2="320" y2="84" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,92 316.4,84 323.6,84" fill="currentColor"/>
<rect x="235" y="94" width="170" height="48" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="235" y="94" width="170" height="48" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="114.1" font-size="13" text-anchor="middle" fill="currentColor">raise to 10</text>
<text x="320" y="131" font-size="13" text-anchor="middle" fill="currentColor">25^x = 5</text>
<line x1="320" y1="142" x2="320" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,168 316.4,160 323.6,160" fill="currentColor"/>
<rect x="250" y="170" width="140" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="250" y="170" width="140" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="320" y="190.6" font-size="13" text-anchor="middle" fill="currentColor">x ≡ 2 (mod 3)</text>
<line x1="320" y1="202" x2="320" y2="218" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,226 316.4,218 323.6,218" fill="currentColor"/>
<line x1="320" y1="58" x2="522.1" y2="90.7" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,92 521.5,94.3 522.7,87.2" fill="currentColor"/>
<rect x="445" y="94" width="170" height="48" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="445" y="94" width="170" height="48" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="530" y="114.1" font-size="13" text-anchor="middle" fill="currentColor">raise to 6</text>
<text x="530" y="131" font-size="13" text-anchor="middle" fill="currentColor">16^x = 1</text>
<line x1="530" y1="142" x2="530" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,168 526.4,160 533.6,160" fill="currentColor"/>
<rect x="460" y="170" width="140" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="460" y="170" width="140" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="530" y="190.6" font-size="13" text-anchor="middle" fill="currentColor">x ≡ 0 (mod 5)</text>
<line x1="530" y1="202" x2="327.9" y2="225.1" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,226 327.5,221.5 328.4,228.7" fill="currentColor"/>
<rect x="250" y="228" width="140" height="34" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="250" y="228" width="140" height="34" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="320" y="249.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">CRT: x = 5</text>
</svg>
<figcaption>Figure 12.13. Pohlig-Hellman on the example: one search in a group of 30 becomes three searches in groups of 2, 3 and 5. The cost is set by the largest prime factor of the order.</figcaption>
</figure>

!!! note "Life story: the Pohlig-Hellman algorithm"
    **Born:** 1978, Stephen Pohlig (Hellman's student) and Martin Hellman, Stanford · **Purpose:** solve discrete
    logs fast whenever the group order has only small prime factors · **Impact:** explains why every standard group
    has a large prime-order subgroup (safe primes, DSA parameters, prime-order curves) · **Status:** current, as
    the reason group orders are chosen with care

This is why every standard group has a prime-order subgroup of at least 224 or
256 bits: a safe prime makes $q = (p-1)/2$ prime, and DSA-style parameters pick
$p$ so that $p - 1$ has a chosen prime factor $q$.

### Where DDH fails: the Legendre symbol

In the full group $\mathbb{Z}_p^*$, half the elements are squares (quadratic
residues) and half are not, and anyone can tell which by computing
$Y^{(p-1)/2} \bmod p$ (Euler's criterion: $1$ for a square, $p - 1$ otherwise).
If $g$ is a generator, $g^a$ is a square exactly when $a$ is even. So Eve learns
the parity of $a$ from $A$ and of $b$ from $B$, and therefore whether $ab$ is
even, which tells her whether $g^{ab}$ is a square. A random element would be a
square only half the time, so Eve wins the DDH game with probability 3/4. The
discrete log is still hard; the shared secret just isn't uniformly random. In
the subgroup of order $q$ (the squares) this leak disappears. It is one more
reason to work in a prime-order subgroup, and to hash $g^{ab}$ before use.

### The number field sieve and precomputation

The best algorithm for discrete logs mod a large prime is the number field sieve
(Gordon, 1993, and many improvements since). Its running time is

$$
L_p\left[\tfrac13, \sqrt[3]{64/9}\right] = \exp\left( (1.923 + o(1)) (\ln p)^{1/3} (\ln \ln p)^{2/3} \right),
$$

the same shape as factoring ([Chapter 13](13-RSA.md)). It runs in phases:
polynomial selection, sieving, linear algebra and finally the individual log.
Only the last phase depends on the target $A$. That is the arithmetic behind
Logjam: the first three phases are paid once per prime and amortized over every
connection that uses it. It argues for many primes, or for primes so big that
even one precomputation is out of reach. Special primes, such as those close to a
power of 2, can admit a faster "special" number field sieve; that is one
reason standard groups take their bits from $\pi$ or $e$, which have no known
relation to such shortcuts.

!!! note "Life story: the number field sieve for discrete logs"
    **Born:** 1993, Daniel Gordon, adapting the factoring sieve of John Pollard and others (1988 to 1990) ·
    **Purpose:** the fastest known way to take discrete logs modulo a large prime · **Impact:** sets the size of
    finite-field groups (2048 bits and up), powered the Logjam precomputation and every record, most recently
    795 bits (2019) · **Status:** current, the attack every finite-field parameter is measured against

### Trapdoored primes

A prime can be built so that its discrete logs are easy for the person who
generated it and hard for everyone else. Joshua Fried, Pierrick Gaudry, Nadia
Heninger and Emmanuel Thomé (2017) built a 1024-bit prime with a hidden
special-sieve structure and computed a discrete log in it in about two months,
far less than for a random 1024-bit prime, and showed that the trapdoor would be
very hard to spot. Groups with "nothing up my sleeve" constants, such as those
in RFC 3526 and RFC 7919, are the defense: their primes come from a published
formula with digits of $\pi$ or $e$.

### What a proof can say

Diffie-Hellman itself has no security proof; it is a conjecture that CDH and
DDH are hard in the chosen group. What can be proved is that protocols built on
it are secure *if* those problems are hard. For example, hashed ElGamal and DHIES
are secure against chosen-ciphertext attack under DDH-like assumptions, and
signed-DH protocols like SIGMA are secure key exchanges in the Canetti-Krawczyk
model. [Chapter 17](17-Defining-Security.md) explains what such proofs mean.

## Check yourself

??? question "1. With $p = 23$ and $g = 5$, Alice picks $a = 4$ and Bob picks $b = 9$. What do they send, and what key do they share?"

    $A = 5^4 \bmod 23 = 4$ and $B = 5^9 \bmod 23 = 11$. Alice computes $11^4 \bmod 23 = 13$
    and Bob computes $4^9 \bmod 23 = 13$. The shared secret is 13.

??? question "2. How many pairwise keys do 10,000 users need, and how many keys does Diffie-Hellman need them to publish?"

    $10000 \cdot 9999 / 2 = 49{,}995{,}000$ secret keys to distribute, against 10,000 public values,
    one per user, none of them secret. (Each pair still has to authenticate those public values; see §12.9.)

??? question "3. Is 3 a generator of $\mathbb{Z}_7^*$?"

    The powers of 3 mod 7 are 3, 2, 6, 4, 5, 1. All six elements appear, so yes, 3 has order 6.

??? question "4. $\mathbb{Z}_{29}^*$ has 28 elements. Which orders can its elements have? Can one have order 8?"

    By Lagrange, only divisors of 28: 1, 2, 4, 7, 14 and 28. No element has order 8.

??? question "5. In Merkle's puzzles, Alice makes a million puzzles that each take a million steps to solve. How much work do Bob and Eve do?"

    Bob solves one puzzle: about a million steps. Eve must on average solve half the puzzles:
    about $10^6 \cdot 10^6 / 2 = 5 \times 10^{11}$ steps. The gap is only the square of Bob's work.

??? question "6. Solve $3^x \equiv 13 \pmod{17}$ by baby-step giant-step with $m = 4$."

    Baby steps $3^0, \ldots, 3^3$: 1, 3, 9, 10. The giant multiplier is $3^{-4} \bmod 17$; since $3^4 = 81 \equiv 13$
    and $13 \cdot 4 = 52 \equiv 1$, it is 4. Giant steps: $i = 0$: 13, not in the table; $i = 1$: $13 \cdot 4 = 52 \equiv 1$,
    which is $3^0$. So $x = 1 \cdot 4 + 0 = 4$. Check: $3^4 = 81 = 4 \cdot 17 + 13$.

??? question "7. Bob validates that the value he receives is not 0, 1 or $p - 1$. Is that enough when $p = 2q + 1$ is a safe prime? When $p - 1$ has many small factors?"

    For a safe prime, the only elements of small order are 1 (order 1) and $p - 1$ (order 2), so the check
    leaves only elements of order $q$ or $2q$, and the order-$2q$ ones leak only one bit; checking $Y^q \equiv 1$
    removes even that. When $p - 1$ has many small factors, elements of those small orders pass the check,
    and the small-subgroup attack of §12.8 works.

??? question "8. Why does signing only your own public value ($A$) not stop the man in the middle as well as signing the pair $(A, B)$?"

    Mallory can replay Alice's genuine signed $A$ from an old session, or pass it along unchanged while
    swapping $B$. Signing the pair (better, the whole transcript) binds each signature to this exchange
    and to the value the other side actually sent. Station-to-station and TLS 1.3 sign the transcript.

??? question "9. Use Pohlig-Hellman to solve $5^x \equiv 7 \pmod{23}$. (The order of 5 is $22 = 2 \cdot 11$.)"

    Mod 2: raise to 11. $5^{11} \equiv 22$ and $7^{11} \equiv 22$, so $x \equiv 1 \pmod 2$.
    Mod 11: raise to 2. $5^2 = 25 \equiv 2$ and $7^2 = 49 \equiv 3$; search $2^y \equiv 3 \pmod{23}$ for $y < 11$:
    the powers of 2 are 1, 2, 4, 8, 16, 9, 18, 13, 3, so $y = 8$ and $x \equiv 8 \pmod{11}$.
    Then $x \equiv 1 \pmod 2$ and $x \equiv 8 \pmod{11}$ give $x = 19$. Check against the list in §12.4: $5^{19} \equiv 7$.

## What you learned

- Sharing a secret key with every partner in advance needs $n(n-1)/2$ keys and
  a secure way to carry each; public-key methods remove that.
- Merkle's puzzles (1974) were the first open solution, but gave only a
  quadratic advantage.
- A group is a set with an associative operation, an identity and inverses.
  In a finite group, Lagrange's theorem says element orders divide the group size.
- Diffie-Hellman: Alice sends $g^a$, Bob sends $g^b$, both compute $g^{ab}$.
  It rests on the discrete logarithm (and CDH, DDH) being hard.
- Generic attacks cost about $\sqrt N$; for numbers mod $p$ the number field
  sieve is faster, so primes must be 2048 bits or more.
- Use a prime-order subgroup, validate received values, derive keys with a KDF,
  and use fresh exponents for forward secrecy.
- Unauthenticated Diffie-Hellman falls to a man in the middle. Sign the
  transcript with keys whose owners you can check.

**Next:** [Chapter 13](13-RSA.md), the first scheme that could encrypt and sign with a public key.

## Further reading

- W. Diffie and M. Hellman, "New Directions in Cryptography", *IEEE Transactions on Information Theory* 22(6), 1976.
- R. Merkle, "Secure Communications over Insecure Channels", *Communications of the ACM* 21(4), 1978.
- S. Pohlig and M. Hellman, "An Improved Algorithm for Computing Logarithms over GF(p) and Its Cryptographic Significance", *IEEE Transactions on Information Theory*, 1978.
- W. Diffie, P. van Oorschot and M. Wiener, "Authentication and Authenticated Key Exchanges", *Designs, Codes and Cryptography* 2, 1992.
- D. Adrian et al., "Imperfect Forward Secrecy: How Diffie-Hellman Fails in Practice", ACM CCS 2015.
- J. Fried, P. Gaudry, N. Heninger and E. Thomé, "A Kilobit Hidden SNFS Discrete Logarithm Computation", EUROCRYPT 2017.
- RFC 3526, RFC 7919, RFC 5869, RFC 8446.
- Simon Singh, *The Code Book* (1999), chapter 6, for the story of Diffie, Hellman, Merkle and GCHQ.
- Reference pages: [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md), [Hard problems](../10-math-foundations/Hard-Problems.md).
