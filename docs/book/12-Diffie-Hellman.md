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
was a student. (The full story is in [Appendix E, Public-key
cryptography](../history/07-Public-Key.md).)

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

It was a proof that the impossible-sounding thing could be done. It is not a
practical scheme. A quadratic gap is too small: an attacker with a million
times Bob's computing power keeps up with puzzles a thousand times harder, and
Alice has to send all $N$ puzzles. What was needed was a calculation with an
**exponential** gap: easy one way, and hopeless the other way however much
computing you buy. Merkle, Diffie and Hellman worked on the problem together
through 1975 and 1976.

## 12.3 A one-way street with a shortcut

Here is the shape of the answer, without any mathematics. Think of mixing
paint. Alice and Bob agree in public on a base color, yellow. Each picks a
secret color and mixes it into the yellow: Alice gets orange, Bob gets green.
They swap the mixtures in public. Each then adds their own secret color to what
they received. Both end up with yellow + Alice's secret + Bob's secret, the
same brown, while Eve holds only yellow, orange and green. Mixing is easy;
un-mixing paint is not.

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

### Subgroups and Lagrange's theorem

The powers of an element form a smaller group inside the big one, a
**subgroup**. The powers of 4 mod 23 are

$$
1, 4, 16, 18, 3, 12, 2, 8, 9, 13, 6
$$

eleven elements, closed under multiplication. (They are exactly the squares
mod 23.) Notice that 1, 2, 11 and 22 are the divisors of 22. That is no
accident:

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

**Why both get the same number.** $B^a = (g^b)^a = g^{ab}$ and
$A^b = (g^a)^b = g^{ab}$. Here $g^{ab} = 5^{90} \bmod 23 = 2$. Since 5 has order
22, only $90 \bmod 22 = 2$ matters, and indeed $5^2 = 25 \equiv 2$.

**What Eve has to do.** She knows 23, 5, 8 and 19. To get the shared 2 she
seems to need $a$ from $5^a \equiv 8$, or $b$ from $5^b \equiv 19$. In a group of
22 elements she just tries them all. In a group of $2^{2048}$ elements she
cannot.

Three problems, from strongest to weakest, describe Eve's position:

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

- **Use a group with no small subgroups to exploit.** With a safe prime
  $p = 2q + 1$, the only subgroups have sizes 1, 2, $q$ and $2q$. Or use a
  **Schnorr group**: a subgroup of large prime order $q$ inside $\mathbb{Z}_p^*$,
  as DSA does ([Chapter 14](14-Discrete-Log-Systems.md)).
- **Validate.** Check $Y^q \equiv 1 \pmod p$, so $Y$ lies in the prime-order
  subgroup. Or use a fresh $b$ for every exchange, so there is nothing to
  accumulate.

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

This is the **station-to-station protocol** of Whitfield Diffie, Paul van
Oorschot and Michael Wiener (1992), in simplified form. Hugo Krawczyk's SIGMA
family (2003) refined it, and it is the shape of the TLS 1.3 handshake: the
server signs a hash of the whole handshake transcript, including both key
shares. [Chapter 16](16-PKI-and-Key-Establishment.md) explains how Alice knows
the signing key really is Bob's, and [Chapter 19](19-Protocols.md) walks
through TLS.

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
