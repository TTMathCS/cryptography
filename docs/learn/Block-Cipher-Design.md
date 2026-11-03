# How block ciphers are built

*Confusion and diffusion, the Feistel network behind DES, the substitution-
permutation network behind AES, and the two great attacks every design must
now survive.*

A **block cipher** is a keyed permutation: for each key $k$, $E_k$ maps every
$b$-bit block to a different $b$-bit block, and $D_k$ undoes it. DES has
$b = 64$; AES has $b = 128$. Used alone it encrypts one block; a
[mode](../05-modes-aead/Classic-Modes.md) turns it into a cipher for whole
messages.

The goal is a permutation that looks, to anyone without the key, like one
chosen at random from all $2^b!$ possibilities. Nobody knows how to prove a
design does that. What we have instead is a recipe that has held up for 50
years, and a list of attacks it must beat.

## Shannon's recipe: confusion and diffusion

In "Communication Theory of Secrecy Systems" (1949) Claude Shannon named the
two properties a cipher needs:

- **Confusion:** the relation between key and ciphertext should be as
  complicated as possible. In practice: small lookup tables (**S-boxes**) that
  are highly nonlinear.
- **Diffusion:** each plaintext bit should affect many ciphertext bits, so the
  statistics of the plaintext are spread out. In practice: permutations and
  linear mixing.

Neither is enough alone (substitution and transposition ciphers each have one,
and both fell, see [Classical ciphers](Classical-Ciphers.md)). Shannon's idea
was the **product cipher**: alternate weak confusion and weak diffusion steps
in many **rounds**, each with its own **round key** derived from the main key.

The test is the **avalanche effect**: flip one bit of plaintext or key, and
after a few rounds about half the output bits should flip, with no pattern
in which ones.

## The Feistel network

**The story.** Horst Feistel fled Germany for the US in 1934, worked on
identification-friend-or-foe systems for the US Air Force, and joined IBM in the
late 1960s. There he designed Lucifer (early 1970s), which became DES in 1977.
He described the structure publicly in Scientific American in 1973.

**How it works.** Split the block into halves $L$ and $R$. Each round:

$$
L_{i+1} = R_i, \qquad R_{i+1} = L_i \oplus F(K_i, R_i).
$$

The magic is that $F$ never has to be reversed. To decrypt, run the same steps
with the round keys in reverse order: from $L_{i+1}, R_{i+1}$ you get
$R_i = L_{i+1}$ and $L_i = R_{i+1} \oplus F(K_i, L_{i+1})$. So $F$ can be any
function at all, even a hash.

```python
import hashlib

def F(k, i, x):                     # any function works here, it never needs undoing
    return int.from_bytes(hashlib.sha256(k + bytes([i]) + x.to_bytes(4, "big")).digest()[:4], "big")

def enc(k, b, rounds=8):            # b is a 64-bit block: two 32-bit halves
    L, R = b >> 32, b & 0xffffffff
    for i in range(rounds):
        L, R = R, L ^ F(k, i, R)
    return L << 32 | R

def dec(k, b, rounds=8):            # same steps, keys in reverse order
    L, R = b >> 32, b & 0xffffffff
    for i in reversed(range(rounds)):
        L, R = R ^ F(k, i, L), L
    return L << 32 | R

k = b"secret key"
c = enc(k, 0x0123456789abcdef)
print(hex(c), hex(dec(k, c)))       # 0x9c699dda3e1d47c8 0x123456789abcdef

for r in range(1, 7):               # flip one input bit, count output bits that change
    print(r, bin(enc(k, 0, r) ^ enc(k, 1, r)).count("1"))
# 1 17, then 35, 31, 26, 34, 35: about half of 64 from round 2 on
```

In 1988 Michael Luby and Charles Rackoff proved that a Feistel network with
three rounds of truly random functions is indistinguishable from a random
permutation, and four rounds are enough even against chosen ciphertexts. Real
ciphers use far more rounds, because their $F$ is not truly random.

**Who uses it:** DES (16 rounds), 3DES, Blowfish, CAST5, Camellia, the Russian
Magma and Korean SEED, and the [format-preserving](../05-modes-aead/Format-Preserving.md)
FF1. China's SM4 uses an unbalanced variant with four branches.

## The substitution-permutation network

**How it works.** Instead of half the block per round, an SPN transforms the
whole block every round: XOR in the round key, pass every byte through an
S-box, then mix the bytes. Every step must be invertible, so decryption runs the
inverse steps backwards.

[AES](../04-symmetric-ciphers/AES.md) is the best-known SPN. Each of its rounds
does:

1. **SubBytes:** the S-box on each of 16 bytes (confusion). It is the inverse
   in [$\mathrm{GF}(2^8)$](Groups-and-Fields.md#fields), which is as nonlinear as a byte
   function can be.
2. **ShiftRows:** shift row $r$ of the $4 \times 4$ byte grid left by $r$.
3. **MixColumns:** multiply each column by a fixed matrix, so each output byte
   depends on all four input bytes (diffusion).
4. **AddRoundKey:** XOR with the round key.

ShiftRows and MixColumns together guarantee that after two rounds every byte
depends on every input byte. Daemen and Rijmen called their method the **wide
trail strategy**: arrange the mixing so that any attack pattern must pass
through many S-boxes, and then prove a lower bound on how many. For AES, any
4-round differential or linear trail touches at least 25 S-boxes.

## The attacks that shaped every modern design

### Differential cryptanalysis

**The story.** Eli Biham and Adi Shamir published it in 1990. It broke many
ciphers of the time, but against DES it needed $2^{47}$ chosen plaintexts, no
better than brute force in practice. In 1994 Don Coppersmith of IBM explained
why: IBM had found the attack in 1974 (they called it the "T-attack"), and the
DES S-boxes, quietly adjusted at the NSA's request, were designed to resist it.
The NSA had asked IBM to keep it secret.

**The idea.** Take pairs of plaintexts with a chosen difference $\Delta P$ (their
XOR). Some input differences to an S-box lead to some output differences more
often than chance. Chain those biases through the rounds; if
$\Delta P \to \Delta C$ happens with probability $p$ much larger than $2^{-b}$,
about $1/p$ pairs will reveal bits of the last round key.

**Defence:** S-boxes whose best difference probability is tiny (for AES,
$4/256 = 2^{-6}$) and enough rounds that every trail passes through many of them.

### Linear cryptanalysis

**The story.** Mitsuru Matsui of Mitsubishi Electric in Japan published it in
1993 and in 1994 broke full DES with $2^{43}$ known plaintexts, the first
experimental break of DES faster than brute force. It took 50 days on twelve
workstations.

**The idea.** Find a linear equation, an XOR of some plaintext, ciphertext and
key bits, that holds with probability $\frac12 + \varepsilon$ instead of exactly
$\frac12$. Collect about $1/\varepsilon^2$ known plaintexts and count which way
the equation goes most often; that gives a bit of key.

**Defence:** S-boxes with small linear bias, plus the wide trail strategy.

### Others worth knowing

- **Integral (square) attack:** Daemen, Knudsen and Rijmen (1997), found
  against Square, AES's ancestor. It breaks AES cut down to 6 rounds, one reason
  the full cipher has 10.
- **Related-key attacks:** use encryptions under keys with known differences.
  They break AES-256 in theory (Biryukov and Khovratovich, 2009) but don't apply
  when keys are random.
- **Slide attacks** (Biryukov and Wagner, 1999): defeat ciphers whose rounds are
  all identical, whatever the number of rounds; round constants stop them.
- **Meet-in-the-middle:** why double DES gives only 57 bits, not 112, and why 3DES
  uses three passes.

## Why 128-bit blocks

A cipher's key length stops brute force. Its **block length** stops the
[birthday bound](Probability-and-Security-Levels.md#the-birthday-paradox): after
$2^{b/2}$ blocks under one key, repeats leak data. DES's 64-bit block was fine in
1977 and is fatal at today's data rates (Sweet32). AES's 128-bit block gives
$2^{64}$ blocks of headroom.

## Try it

??? question "1. In a Feistel network, what happens if $F$ always returns 0?"

    Each round just swaps the halves: $L_{i+1} = R_i$, $R_{i+1} = L_i$. After an even number
    of rounds the output equals the input. The structure is only as good as $F$.

??? question "2. Why must every step of an SPN be invertible, but not $F$ in a Feistel network?"

    An SPN decrypts by undoing each step, so each step needs an inverse. A Feistel
    network decrypts by recomputing $F$ on a half it already has and XORing it away,
    so $F$ is only ever run forwards.

??? question "3. Matsui's attack needed $2^{43}$ known plaintexts. Why was DES still used for years after?"

    Collecting $2^{43}$ plaintext-ciphertext pairs, 64 terabytes, under one key is
    unrealistic in most systems. The practical threat was the short key, which fell
    to brute force in 1998.
