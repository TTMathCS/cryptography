# 14. Discrete-Log Systems: ElGamal, DSA and Schnorr

*Diffie-Hellman gives two people who are both online a shared key. In this
chapter the same mathematics learns to do what RSA does: encrypt to someone's
published key, and sign. You will build ElGamal encryption and signatures by
hand, see how Schnorr's subgroup trick shrank them into DSA, and meet the one
number that has broken more discrete-log signatures than any mathematics: the
per-signature nonce $k$. Then Schnorr signatures, the cleanest design of all,
held back for years by a patent, and blind signatures, which let a bank sign a
coin it cannot see.*

!!! abstract "In this chapter"
    **You will learn:**

    - how ElGamal turns a Diffie-Hellman exchange into public-key encryption, and why it is malleable and homomorphic
    - how ElGamal signatures, DSA and Schnorr signatures work, by hand and at full size
    - why reusing or leaking the nonce $k$ gives away the private key, and how the PS3 and Android Bitcoin wallets lost theirs
    - how Schnorr's identification protocol becomes a signature through the Fiat-Shamir transform, and what "zero knowledge" means there
    - how blind signatures work, and where they are used
    - which of these schemes are still used, and what replaced the rest

    **You need:** [Chapter 12](12-Diffie-Hellman.md) (groups, generators, subgroups, the discrete log) and
    [Chapter 13](13-RSA.md) (public-key encryption and signatures, hash-then-sign).
    [Chapter 9](09-Hash-Functions.md) for the hashes.

    **Levels:** 14.1 to 14.3 are for beginners who have read Chapter 12; 14.4 to 14.8 are intermediate;
    14.10 is for experts.

## 14.1 The problem

By 1984 public-key cryptography had two working pieces. Diffie-Hellman agreed
on keys but could not encrypt to someone offline or sign anything. RSA could do
both, but it rested on a different problem (factoring), and from 1983 it was
patented in the United States. Anyone who wanted to sign or encrypt with a public
key in a product had to license it from RSA Data Security.

Taher Elgamal, born in Cairo in 1955, had come to Stanford to study with Martin
Hellman. At the CRYPTO conference in August 1984 he showed how to get both
encryption and signatures from the discrete logarithm alone, and published the
schemes in *IEEE Transactions on Information Theory* in 1985. They work in any
group where Diffie-Hellman is hard. Elgamal later led the work on SSL at
Netscape.

!!! note "Life story: ElGamal encryption"
    **Born:** 1984 (CRYPTO talk), 1985 (paper), Taher Elgamal at Stanford · **Purpose:** public-key encryption from
    the discrete log, free of the RSA patent · **Helped:** became the encryption half of PGP 5 and GnuPG keys for
    years; its homomorphic form runs verifiable voting (Helios, ElectionGuard) · **Retired:** RFC 9580 (2024)
    forbids new OpenPGP ElGamal keys; malleable and twice the size · **Replaced by:** hashed ElGamal in DHIES, ECIES
    and HPKE ([Chapter 16](16-PKI-and-Key-Establishment.md))

His schemes have one cost RSA does not: every encryption and every signature
needs a fresh random number. That number turns out to be the weak point of the
whole family, and much of this chapter is about it.

<figure class="mars-fig">
<svg viewBox="0 0 600 605" width="600" role="img" aria-label="Timeline of discrete-log encryption and signatures from 1982 to 2025">
<line x1="100" y1="10" x2="100" y2="597" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<text x="86" y="22.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1982</text>
<circle cx="100" cy="18" r="4" fill="currentColor"/>
<text x="114" y="22.5" font-size="13" text-anchor="start" fill="currentColor">David Chaum's blind signatures, for untraceable digital</text>
<text x="114" y="41.5" font-size="13" text-anchor="start" fill="currentColor">cash</text>
<text x="86" y="69.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">1984-85</text>
<circle cx="100" cy="65" r="5" class="acc-fill"/>
<text x="114" y="69.5" font-size="13" text-anchor="start" fill="currentColor">Taher Elgamal: encryption and signatures from discrete</text>
<text x="114" y="88.5" font-size="13" text-anchor="start" fill="currentColor">logs</text>
<text x="86" y="116.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1986</text>
<circle cx="100" cy="112" r="4" fill="currentColor"/>
<text x="114" y="116.5" font-size="13" text-anchor="start" fill="currentColor">Fiat and Shamir turn identification into signatures</text>
<text x="86" y="144.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">1989</text>
<circle cx="100" cy="140" r="5" class="acc-fill"/>
<text x="114" y="144.5" font-size="13" text-anchor="start" fill="currentColor">Schnorr's identification and signatures for smart cards</text>
<text x="86" y="172.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1991</text>
<circle cx="100" cy="168" r="4" fill="currentColor"/>
<text x="114" y="172.5" font-size="13" text-anchor="start" fill="currentColor">Schnorr patent granted (February); NIST proposes DSA</text>
<text x="114" y="191.5" font-size="13" text-anchor="start" fill="currentColor">(August)</text>
<text x="86" y="219.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1994</text>
<circle cx="100" cy="215" r="4" fill="currentColor"/>
<text x="114" y="219.5" font-size="13" text-anchor="start" fill="currentColor">DSA becomes FIPS 186</text>
<text x="86" y="247.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1996</text>
<circle cx="100" cy="243" r="4" fill="currentColor"/>
<text x="114" y="247.5" font-size="13" text-anchor="start" fill="currentColor">Pointcheval and Stern prove Schnorr signatures secure</text>
<text x="86" y="275.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1998</text>
<circle cx="100" cy="271" r="4" fill="currentColor"/>
<text x="114" y="275.5" font-size="13" text-anchor="start" fill="currentColor">Cramer-Shoup: chosen-ciphertext secure ElGamal</text>
<text x="86" y="303.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2008</text>
<circle cx="100" cy="299" r="4" fill="currentColor"/>
<text x="114" y="303.5" font-size="13" text-anchor="start" fill="currentColor">Schnorr patent expires</text>
<text x="86" y="331.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">2010</text>
<circle cx="100" cy="327" r="5" class="acc-fill"/>
<text x="114" y="331.5" font-size="13" text-anchor="start" fill="currentColor">PS3 signing key recovered from a repeated nonce</text>
<text x="86" y="359.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2011</text>
<circle cx="100" cy="355" r="4" fill="currentColor"/>
<text x="114" y="359.5" font-size="13" text-anchor="start" fill="currentColor">Ed25519: Schnorr on an Edwards curve, deterministic</text>
<text x="114" y="378.5" font-size="13" text-anchor="start" fill="currentColor">nonces</text>
<text x="86" y="406.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2013</text>
<circle cx="100" cy="402" r="4" fill="currentColor"/>
<text x="114" y="406.5" font-size="13" text-anchor="start" fill="currentColor">Android Bitcoin wallets leak keys; RFC 6979</text>
<text x="114" y="425.5" font-size="13" text-anchor="start" fill="currentColor">deterministic nonces</text>
<text x="86" y="453.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2015</text>
<circle cx="100" cy="449" r="4" fill="currentColor"/>
<text x="114" y="453.5" font-size="13" text-anchor="start" fill="currentColor">OpenSSH disables DSA keys by default</text>
<text x="86" y="481.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2021</text>
<circle cx="100" cy="477" r="4" fill="currentColor"/>
<text x="114" y="481.5" font-size="13" text-anchor="start" fill="currentColor">Bitcoin's Taproot switches on Schnorr signatures</text>
<text x="114" y="500.5" font-size="13" text-anchor="start" fill="currentColor">(BIP-340)</text>
<text x="86" y="528.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2023</text>
<circle cx="100" cy="524" r="4" fill="currentColor"/>
<text x="114" y="528.5" font-size="13" text-anchor="start" fill="currentColor">FIPS 186-5 drops DSA for new signatures; RFC 9474 blind</text>
<text x="114" y="547.5" font-size="13" text-anchor="start" fill="currentColor">RSA</text>
<text x="86" y="575.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2025</text>
<circle cx="100" cy="571" r="4" fill="currentColor"/>
<text x="114" y="575.5" font-size="13" text-anchor="start" fill="currentColor">OpenSSH 10.0 removes DSA</text>
</svg>
<figcaption>Figure 14.1. The family's history. Elgamal's 1985 schemes led to DSA; Schnorr's cleaner design waited for its patent to expire and then took over as EdDSA and BIP-340.</figcaption>
</figure>

## 14.2 ElGamal encryption

### The idea

Look again at Diffie-Hellman ([Chapter 12](12-Diffie-Hellman.md)). Bob publishes
$h = g^x$ once, as his **public key**, and keeps $x$. To send him a message, Alice
does her half of a Diffie-Hellman exchange on the spot, with a one-time secret
$k$: she sends $c_1 = g^k$, and she alone (besides Bob) can compute the shared
value $h^k = g^{xk}$. She uses that shared value as a mask and sends
$c_2 = m \cdot h^k$. Bob computes the same mask as $c_1^x = g^{kx}$ and divides it out.

$$
\begin{aligned}
\textbf{Keys:} \quad & x \text{ secret}, \quad h = g^x \text{ public} \\
\textbf{Encrypt } m: \quad & \text{fresh random } k, \quad c_1 = g^k, \quad c_2 = m \cdot h^k \\
\textbf{Decrypt:} \quad & m = c_2 \cdot (c_1^x)^{-1}
\end{aligned}
$$

### By hand

Use the group of Chapter 12: the numbers mod $p = 23$ with generator $g = 5$.
Messages are numbers from 1 to 22.

<div class="mars-steps" markdown>

1. Bob picks $x = 6$ and publishes $h = 5^6 \bmod 23 = 8$.
2. Alice wants to send $m = 10$. She picks a fresh $k = 3$ and sends $c_1 = 5^3 \bmod 23 = 125 \bmod 23 = 10$.
3. She computes the mask $h^k = 8^3 \bmod 23 = 512 \bmod 23 = 6$ and sends $c_2 = 10 \cdot 6 \bmod 23 = 14$.
4. The ciphertext is $(10, 14)$.
5. Bob rebuilds the mask from $c_1$: $10^6 \bmod 23 = 6$.
6. He divides it out: $6^{-1} \equiv 4 \pmod{23}$ (since $6 \cdot 4 = 24$), and $14 \cdot 4 \bmod 23 = 56 \bmod 23 = 10$.

</div>

**Why it works:** $c_1^x = (g^k)^x = (g^x)^k = h^k$, the same mask Alice used.

<figure class="mars-fig">
<svg viewBox="0 0 600 308" width="600" role="img" aria-label="Sequence chart of ElGamal encryption with the toy numbers: Alice sends 10 and 14, Bob rebuilds the mask 6 and recovers 10">
<rect x="88" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="140" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="140" y1="38" x2="140" y2="302" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="408" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="460" y1="38" x2="460" y2="302" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="90" y="74" width="420" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="90" y="74" width="420" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="91" font-size="13" text-anchor="middle" fill="currentColor">public: p = 23, g = 5; Bob's key h = 5⁶ mod 23 = 8</text>
<rect x="58.2" y="116" width="163.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="58.2" y="116" width="163.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="140" y="133" font-size="13" text-anchor="middle" fill="currentColor">m = 10, fresh k = 3</text>
<text x="140" y="151" font-size="13" text-anchor="middle" fill="currentColor">mask = 8³ mod 23 = 6</text>
<rect x="407.3" y="116" width="105.4" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="407.3" y="116" width="105.4" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="133" font-size="13" text-anchor="middle" fill="currentColor">secret x = 6</text>
<line x1="140" y1="202" x2="452" y2="202" class="acc" stroke-width="1.5"/>
<polygon points="460,202 452,205.6 452,198.4" class="acc-fill"/>
<text x="300" y="195" font-size="13" text-anchor="middle" fill="currentColor">c₁ = 5³ mod 23 = 10,   c₂ = 10 · 6 mod 23 = 14</text>
<rect x="363.6" y="220" width="192.7" height="62" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="363.6" y="220" width="192.7" height="62" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="237" font-size="13" text-anchor="middle" fill="currentColor">mask = 10⁶ mod 23 = 6</text>
<text x="460" y="255" font-size="13" text-anchor="middle" fill="currentColor">14 · 6⁻¹ = 14 · 4 mod 23</text>
<text x="460" y="273" font-size="13" text-anchor="middle" fill="currentColor">= 10</text>
</svg>
<figcaption>Figure 14.2. ElGamal is half a Diffie-Hellman exchange done on the spot: c₁ is Alice's one-time public value, and the shared value 6 masks the message.</figcaption>
</figure>

### What follows from the design

- **It is randomized.** Encrypt the same $m$ twice with different $k$ and you
  get unrelated ciphertexts, so the guess-and-check attack on textbook RSA
  ([Chapter 13](13-RSA.md)) does not work. This was the first widely known
  public-key encryption that was randomized by design.
- **It doubles the size.** Two group elements go out for each element of
  message: 512 bytes in a 2048-bit group. In practice it only ever carried a
  session key.
- **It is malleable.** Anyone can multiply $c_2$ by $t$, and Bob will decrypt
  $t \cdot m$. So, like textbook RSA, it is not safe against an attacker who can
  get ciphertexts decrypted.
- **It is homomorphic.** Multiply two ciphertexts part by part and you get an
  encryption of the product:
  $(g^{k_1} g^{k_2},\; m_1 h^{k_1} \cdot m_2 h^{k_2}) = (g^{k_1 + k_2},\; m_1 m_2 \, h^{k_1 + k_2})$.
  With the toy key, $E(3)$ with $k = 4$ is $(4, 6)$; multiplying it into
  $(10, 14)$ gives $(17, 15)$, which decrypts to $7 = 10 \cdot 3 \bmod 23$.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Multiplying the ciphertexts (10, 14) and (4, 6) part by part gives (17, 15), which decrypts to 7, the product of 10 and 3 mod 23">
<rect x="20" y="30" width="150" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="30" width="150" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="95" y="59.9" font-size="14" text-anchor="middle" fill="currentColor">E(10) = (10, 14)</text>
<rect x="20" y="120" width="150" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="120" width="150" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="95" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">E(3) = (4, 6)</text>
<line x1="170" y1="55" x2="231" y2="88.2" stroke="currentColor" stroke-width="1.5"/>
<polygon points="238,92 229.3,91.3 232.7,85" fill="currentColor"/>
<line x1="170" y1="145" x2="231" y2="111.8" stroke="currentColor" stroke-width="1.5"/>
<polygon points="238,108 232.7,115 229.3,108.7" fill="currentColor"/>
<circle cx="255" cy="100" r="16" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="255" y="105" font-size="16" text-anchor="middle" fill="currentColor">×</text>
<line x1="271" y1="100" x2="310" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="318,100 310,103.6 310,96.4" fill="currentColor"/>
<rect x="320" y="75" width="140" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="320" y="75" width="140" height="50" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="390" y="104.9" font-size="14" text-anchor="middle" fill="currentColor">(17, 15)</text>
<line x1="460" y1="100" x2="510" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="518,100 510,103.6 510,96.4" fill="currentColor"/>
<text x="489" y="90" font-size="12" text-anchor="middle" fill="currentColor">decrypt</text>
<rect x="520" y="75" width="100" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="520" y="75" width="100" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="570" y="105.6" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">7</text>
<text x="320" y="200" font-size="13" text-anchor="middle" fill="currentColor">10 · 3 = 30 ≡ 7 (mod 23): the product, computed without the key</text>
<text x="255" y="62" font-size="12" text-anchor="middle" fill="currentColor">part by part</text>
</svg>
<figcaption>Figure 14.3. ElGamal's homomorphism with the toy key. Anyone can combine ciphertexts; only Bob can read the result.</figcaption>
</figure>

The last two points are the same fact seen from two sides. Malleability is a
flaw when you want integrity, and a feature when you want to compute on
encrypted data. **Exponential ElGamal** encrypts $g^m$ instead of $m$, so that
multiplying ciphertexts *adds* the messages. Decrypting then ends with a small
discrete log, which is easy when the answer is small, like a vote count.

### Code it

*Level: intermediate.* At full size, in the order-$q$ subgroup of the 2048-bit
safe-prime group from Chapter 12. Messages must be encoded into that subgroup
(the squares mod $p$); otherwise $c_2$ leaks whether $m$ is a square, the DDH
failure of [§12.11](12-Diffie-Hellman.md).

```python
from secrets import randbelow

# RFC 3526 group 14: p = 2q + 1 is a 2048-bit safe prime, and g = 2 has order q
p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
q, g = (p - 1) // 2, 2

x = randbelow(q - 1) + 1               # private key
h = pow(g, x, p)                       # public key

def encrypt(m):                        # m must lie in the order-q subgroup
    k = randbelow(q - 1) + 1           # fresh for every message
    return pow(g, k, p), m * pow(h, k, p) % p

def decrypt(c1, c2):
    return c2 * pow(c1, -x, p) % p     # divide by c1^x = h^k

c1, c2 = encrypt(100)                  # 100 is a square, so it is in the subgroup
print(decrypt(c1, c2), decrypt(c1, c2 * 2 % p))   # 100 200: doubled without the key

votes = [1, 0, 1, 1, 0]                # exponential ElGamal: encrypt g^v
A = B = 1
for v in votes:
    c1, c2 = encrypt(pow(g, v, p))
    A, B = A * c1 % p, B * c2 % p      # multiplying ciphertexts adds the votes
t = decrypt(A, B)                      # g^3, decrypted without opening a ballot
print(next(n for n in range(len(votes) + 1) if pow(g, n, p) == t))   # 3
```

The first line shows malleability: an attacker doubled the plaintext without
the key. The second shows the tally of five encrypted votes, computed without
decrypting any single ballot. This is how the Helios voting system elected the
president of the Université catholique de Louvain in 2009, with trustees who
share the key decrypting only the total.

<figure class="mars-fig">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="Five encrypted ballots for 1, 0, 1, 1, 0 are multiplied together into one ciphertext that decrypts to g cubed, so the tally is 3">
<rect x="20" y="30" width="70" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="30" width="70" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="55" y="57.5" font-size="13" text-anchor="middle" fill="currentColor">E(g^1)</text>
<line x1="55" y1="76" x2="204.2" y2="120.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210,122 203.5,122.9 205,117.7" fill="currentColor"/>
<rect x="102" y="30" width="70" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="102" y="30" width="70" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="137" y="57.5" font-size="13" text-anchor="middle" fill="currentColor">E(g^0)</text>
<line x1="137" y1="76" x2="204.9" y2="118.8" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210,122 203.5,121.1 206.4,116.5" fill="currentColor"/>
<rect x="184" y="30" width="70" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="184" y="30" width="70" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="219" y="57.5" font-size="13" text-anchor="middle" fill="currentColor">E(g^1)</text>
<line x1="219" y1="76" x2="211.2" y2="116.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210,122 208.5,115.6 213.8,116.6" fill="currentColor"/>
<rect x="266" y="30" width="70" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="266" y="30" width="70" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="301" y="57.5" font-size="13" text-anchor="middle" fill="currentColor">E(g^1)</text>
<line x1="301" y1="76" x2="215.4" y2="119.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210,122 214.1,116.9 216.6,121.7" fill="currentColor"/>
<rect x="348" y="30" width="70" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="348" y="30" width="70" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="383" y="57.5" font-size="13" text-anchor="middle" fill="currentColor">E(g^0)</text>
<line x1="383" y1="76" x2="215.8" y2="120.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210,122 215.1,117.8 216.5,123.1" fill="currentColor"/>
<rect x="150" y="124" width="120" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="150" y="124" width="120" height="44" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="210" y="150.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">× all</text>
<line x1="270" y1="146" x2="340" y2="146" stroke="currentColor" stroke-width="1.5"/>
<polygon points="348,146 340,149.6 340,142.4" fill="currentColor"/>
<text x="309" y="136" font-size="12" text-anchor="middle" fill="currentColor">trustees</text>
<rect x="350" y="124" width="120" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="350" y="124" width="120" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="410" y="151.2" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">g³</text>
<line x1="470" y1="146" x2="520" y2="146" stroke="currentColor" stroke-width="1.5"/>
<polygon points="528,146 520,149.6 520,142.4" fill="currentColor"/>
<text x="499" y="136" font-size="12" text-anchor="middle" fill="currentColor">small log</text>
<rect x="530" y="124" width="110" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="530" y="124" width="110" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="585" y="150.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">tally = 3</text>
<text x="540" y="50" font-size="12" text-anchor="middle" fill="currentColor">no single ballot</text>
<text x="540" y="66" font-size="12" text-anchor="middle" fill="currentColor">is ever opened</text>
</svg>
<figcaption>Figure 14.4. Exponential ElGamal adds votes inside the encryption, as in the code above and in Helios.</figcaption>
</figure>

**The fix for malleability** is to stop multiplying by the shared secret and
instead hash it into a key for an authenticated cipher. That is the hashed
ElGamal behind DHIES and ECIES, and today's HPKE ([Chapter
16](16-PKI-and-Key-Establishment.md)).

## 14.3 ElGamal signatures

Elgamal's paper also signed. The signer has $x$ and $y = g^x$, in a group of
order $p - 1$ (the full group mod $p$). To sign a message with hash $H$:

$$
\begin{aligned}
\textbf{Sign:} \quad & \text{fresh } k \text{ with } \gcd(k, p-1) = 1, \quad r = g^k \bmod p, \quad s = k^{-1}(H - x r) \bmod (p-1) \\
\textbf{Verify:} \quad & g^H \equiv y^r \cdot r^s \pmod p
\end{aligned}
$$

**Why it works.** From the definition of $s$, $H \equiv x r + k s \pmod{p-1}$.
Exponents of $g$ work mod $p - 1$ (Lagrange), so
$g^H = g^{xr} g^{ks} = (g^x)^r (g^k)^s = y^r r^s$.

**By hand,** with $p = 23$, $g = 5$, $x = 6$, $y = 8$, and a made-up hash $H = 10$:

| Step | Calculation | Value |
|---|---|---|
| Nonce | $k = 3$ (coprime to 22); $k^{-1} \bmod 22 = 15$ since $3 \cdot 15 = 45 = 2 \cdot 22 + 1$ | |
| $r$ | $5^3 \bmod 23$ | $r = 10$ |
| $s$ | $15 \cdot (10 - 6 \cdot 10) \bmod 22 = 15 \cdot 16 \bmod 22 = 240 \bmod 22$ | $s = 20$ |
| Verify, left | $g^H = 5^{10} \bmod 23$ | 9 |
| Verify, right | $y^r \cdot r^s = 8^{10} \cdot 10^{20} \bmod 23 = 3 \cdot 3$ | 9: valid |

The signature $(r, s)$ is two numbers the size of $p$: 512 bytes for a 2048-bit
group, twice an RSA signature of the same strength. ElGamal signatures were used
in early OpenPGP, until in 2003 Phong Nguyen found that GnuPG's implementation
used short secret values that let anyone recover the signing key from a single
signature. GnuPG dropped ElGamal signing.

!!! note "Life story: ElGamal signatures"
    **Born:** 1985, Taher Elgamal · **Purpose:** digital signatures from the discrete log · **Helped:** the
    signing equation became the template for DSA and ECDSA · **Retired:** large and slow; dropped from GnuPG after
    Nguyen's 2003 key-recovery attack, and forbidden by RFC 9580 · **Replaced by:** DSA, then Schnorr-style
    signatures

## 14.4 Schnorr groups and DSA

*Level: intermediate.*

### Working in a small subgroup

Claus-Peter Schnorr, a mathematician at Goethe University Frankfurt, wanted
signatures cheap enough for the smart cards of the late 1980s. His observation
(CRYPTO 1989): the computations do not need the whole group mod $p$. Pick a prime
$q$ of 160 bits that divides $p - 1$, and a $g$ of order $q$. Then $g$ generates a
subgroup of only $q$ elements, exponents live mod $q$, and every number in the
signature except the group elements is only 160 bits.

Is the small subgroup still safe? There are two attacks to consider
([Chapter 12](12-Diffie-Hellman.md)):

- the number field sieve works on the big group mod $p$, so $p$ must still be
  large (1024 bits then, 2048 or more now);
- generic attacks (baby-step giant-step, Pollard's rho) work inside the
  subgroup in about $\sqrt q$ steps, so $q$ must be large enough for that: 160
  bits gave 80-bit security, 256 bits give 128.

A subgroup of prime order also has no smaller subgroups (Lagrange again), so the
small-subgroup attack has nothing to grab. Such a group is called a **Schnorr
group**.

<figure class="mars-fig">
<svg viewBox="0 0 620 170" width="620" role="img" aria-label="The numbers 1 to 22 mod 23 in a row; the 11 squares, which form the subgroup generated by 4, are highlighted">
<rect x="20" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="43" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<rect x="74" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="74" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="97" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<rect x="128" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="128" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="151" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<rect x="182" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="182" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="205" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<rect x="236" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="236" y="20" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="259" y="43.9" font-size="14" text-anchor="middle" fill="currentColor">5</text>
<rect x="290" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="290" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="313" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<rect x="344" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="344" y="20" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="367" y="43.9" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="398" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="398" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="421" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">8</text>
<rect x="452" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="452" y="20" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="475" y="43.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">9</text>
<rect x="506" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="506" y="20" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="529" y="43.9" font-size="14" text-anchor="middle" fill="currentColor">10</text>
<rect x="560" y="20" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="560" y="20" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="583" y="43.9" font-size="14" text-anchor="middle" fill="currentColor">11</text>
<rect x="20" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="70" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="43" y="93.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">12</text>
<rect x="74" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="74" y="70" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="97" y="93.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">13</text>
<rect x="128" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="128" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="151" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">14</text>
<rect x="182" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="182" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="205" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">15</text>
<rect x="236" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="236" y="70" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="259" y="93.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">16</text>
<rect x="290" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="290" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="313" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">17</text>
<rect x="344" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="344" y="70" width="46" height="38" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="367" y="93.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">18</text>
<rect x="398" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="398" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="421" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">19</text>
<rect x="452" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="452" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="475" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">20</text>
<rect x="506" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="506" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="529" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">21</text>
<rect x="560" y="70" width="46" height="38" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="560" y="70" width="46" height="38" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="583" y="93.9" font-size="14" text-anchor="middle" fill="currentColor">22</text>
<text x="310" y="140" font-size="13" text-anchor="middle" fill="currentColor">whole group mod p = 23: 22 elements, order p − 1</text>
<text x="310" y="160" font-size="13" text-anchor="middle" class="acc-fill">highlighted: subgroup of prime order q = 11, generated by g = 4</text>
</svg>
<figcaption>Figure 14.5. The toy Schnorr group used for DSA and Schnorr below. Exponents now live mod 11 instead of mod 22; at real sizes, a 256-bit q inside a 2048-bit p.</figcaption>
</figure>

### The Digital Signature Algorithm

In August 1991 the US National Institute of Standards and Technology (NIST)
proposed a Digital Signature Standard. Its algorithm, DSA, had been designed at
the NSA (the patent is in David Kravitz's name, and the government made it
royalty-free). It combined ElGamal's signing equation with Schnorr's subgroup,
and it could sign but not encrypt, which suited a government that controlled the
export of encryption. It was published as FIPS 186 in 1994.

The proposal was attacked from all sides. RSA's supporters argued that RSA was
already the de facto standard; the first version allowed only 512-bit $p$, which
critics called too small (NIST then allowed up to 1024 bits); and Schnorr argued
that DSA used his patented idea. NIST disagreed with the patent claim and DSA went
ahead.

!!! note "Life story: DSA"
    **Born:** 1991, designed at the NSA (patent in David Kravitz's name), proposed by NIST; FIPS 186 in 1994 ·
    **Purpose:** a royalty-free US government signature standard that could not be used to encrypt · **Helped:**
    signed government documents, PGP keys and SSH logins for two decades; its elliptic-curve version ECDSA still
    signs much of the internet · **Retired:** FIPS 186-5 (2023) withdrew DSA for new signatures; OpenSSH removed
    it in 2025 · **Replaced by:** ECDSA and EdDSA

The domain parameters are $(p, q, g)$ with $q \mid p - 1$ and $g$ of order $q$.

$$
\begin{aligned}
\textbf{Keys:} \quad & x \in [1, q-1] \text{ secret}, \quad y = g^x \bmod p \\
\textbf{Sign:} \quad & \text{fresh } k, \quad r = (g^k \bmod p) \bmod q, \quad s = k^{-1}(H(m) + x r) \bmod q \\
\textbf{Verify:} \quad & w = s^{-1}, \quad u_1 = H(m) \, w, \quad u_2 = r \, w \pmod q, \quad \text{accept if } (g^{u_1} y^{u_2} \bmod p) \bmod q = r
\end{aligned}
$$

**Why it works.** From $s = k^{-1}(H + xr)$ we get $k = s^{-1}(H + xr) = u_1 + x u_2 \pmod q$, so
$g^{u_1} y^{u_2} = g^{u_1 + x u_2} = g^k$, whose value mod $q$ is $r$.

### DSA by hand

Domain parameters $p = 23$, $q = 11$ (11 divides 22) and $g = 4$, which has order
11 mod 23 (its powers are the eleven squares of §12.4).

<div class="mars-steps" markdown>

1. Public: $p = 23$, $q = 11$, $g = 4$. The signer's secret is $x = 3$, so $y = 4^3 \bmod 23 = 18$.
2. The message hashes to $H = 7$ (made up for the example). The signer picks a fresh secret $k = 5$.
3. $r = (4^5 \bmod 23) \bmod 11 = 12 \bmod 11 = 1$.
4. $k^{-1} \bmod 11 = 9$ (since $5 \cdot 9 = 45 = 4 \cdot 11 + 1$), so $s = 9 \cdot (7 + 3 \cdot 1) \bmod 11 = 90 \bmod 11 = 2$. The signature is $(1, 2)$.
5. The verifier computes $w = 2^{-1} \bmod 11 = 6$, $u_1 = 7 \cdot 6 \bmod 11 = 9$, $u_2 = 1 \cdot 6 = 6$.
6. $4^9 \cdot 18^6 \bmod 23 = 13 \cdot 8 \bmod 23 = 12$, and $12 \bmod 11 = 1$.
7. That equals $r$, so the signature is valid.

<figure class="mars-fig">
<svg viewBox="0 0 660 270" width="660" role="img" aria-label="DSA by hand: the signer turns k 5 into r 1 and s 2; the verifier computes u1 9 and u2 6, finds 4 to the 9 times 18 to the 6 is 12, and 12 mod 11 equals r">
<text x="160" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">signer (x = 3, H = 7)</text>
<rect x="30" y="36" width="260" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="36" width="260" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="60.5" font-size="13" text-anchor="middle" fill="currentColor">k = 5:  4⁵ mod 23 = 12</text>
<rect x="30" y="92" width="260" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="92" width="260" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="116.5" font-size="13" text-anchor="middle" fill="currentColor">r = 12 mod 11 = 1</text>
<rect x="30" y="148" width="260" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="148" width="260" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="172.6" font-size="13" text-anchor="middle" fill="currentColor">s = 5⁻¹ (7 + 3·1) mod 11 = 2</text>
<line x1="160" y1="76" x2="160" y2="82" stroke="currentColor" stroke-width="1.5"/>
<polygon points="160,90 156.4,82 163.6,82" fill="currentColor"/>
<line x1="160" y1="132" x2="160" y2="138" stroke="currentColor" stroke-width="1.5"/>
<polygon points="160,146 156.4,138 163.6,138" fill="currentColor"/>
<line x1="290" y1="168" x2="360" y2="168" class="acc" stroke-width="1.5"/>
<polygon points="368,168 360,171.6 360,164.4" class="acc-fill"/>
<text x="329" y="158" font-size="13" text-anchor="middle" class="acc-fill">(1, 2)</text>
<text x="500" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">verifier (y = 18)</text>
<rect x="370" y="36" width="270" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="370" y="36" width="270" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="505" y="60.5" font-size="13" text-anchor="middle" fill="currentColor">w = 2⁻¹ mod 11 = 6</text>
<rect x="370" y="92" width="270" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="370" y="92" width="270" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="505" y="116.5" font-size="13" text-anchor="middle" fill="currentColor">u₁ = 7·6 mod 11 = 9,  u₂ = 1·6 = 6</text>
<rect x="370" y="148" width="270" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="370" y="148" width="270" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="505" y="172.6" font-size="13" text-anchor="middle" fill="currentColor">4⁹ · 18⁶ mod 23 = 13 · 8 mod 23 = 12</text>
<rect x="370" y="204" width="270" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="370" y="204" width="270" height="40" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="505" y="228.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">12 mod 11 = 1 = r  ✓</text>
<line x1="505" y1="76" x2="505" y2="82" stroke="currentColor" stroke-width="1.5"/>
<polygon points="505,90 501.4,82 508.6,82" fill="currentColor"/>
<line x1="505" y1="132" x2="505" y2="138" stroke="currentColor" stroke-width="1.5"/>
<polygon points="505,146 501.4,138 508.6,138" fill="currentColor"/>
<line x1="505" y1="188" x2="505" y2="194" stroke="currentColor" stroke-width="1.5"/>
<polygon points="505,202 501.4,194 508.6,194" fill="currentColor"/>
<text x="160" y="230" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">the verifier rebuilds gᵏ = 12</text>
<text x="160" y="248" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">without ever learning k</text>
</svg>
<figcaption>Figure 14.6. The DSA example of this section. Both sides arrive at the same group element 12 = gᵏ, and only its value mod q is sent.</figcaption>
</figure>

</div>

### DSA in code

Generating parameters means finding a 256-bit prime $q$ and then a 2048-bit
prime $p$ with $p \equiv 1 \pmod q$. FIPS 186 has a careful procedure with a
published seed so others can check the primes were not chosen with a trapdoor;
this sketch just searches. It takes several seconds.

```python
import hashlib, secrets

def is_prime(n, rounds=40):                  # Miller-Rabin, as in Chapter 13
    if n < 2: return False
    for sp in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
        if n % sp == 0: return n == sp
    d, s = n - 1, 0
    while d % 2 == 0: d, s = d // 2, s + 1
    for _ in range(rounds):
        x = pow(secrets.randbelow(n - 3) + 2, d, n)
        if x in (1, n - 1): continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1: break
        else: return False
    return True

def dsa_params(L=2048, N=256):               # p of L bits with a prime q of N bits dividing p - 1
    while True:
        q = secrets.randbits(N) | 1 << (N - 1) | 1
        if is_prime(q): break
    while True:
        p = secrets.randbits(L) | 1 << (L - 1)
        p -= p % (2 * q) - 1                 # now p = 1 mod 2q
        if p.bit_length() == L and is_prime(p): break
    while True:
        g = pow(secrets.randbelow(p - 3) + 2, (p - 1) // q, p)
        if g != 1: return p, q, g            # g has order q

def H(msg, q):
    return int.from_bytes(hashlib.sha256(msg).digest(), "big") % q

def sign(msg, x, k=None):
    k = k or secrets.randbelow(q - 1) + 1    # MUST be fresh, secret and uniform
    r = pow(g, k, p) % q
    s = pow(k, -1, q) * (H(msg, q) + x * r) % q
    return r, s

def verify(msg, y, r, s):
    if not (0 < r < q and 0 < s < q): return False
    w = pow(s, -1, q)
    u1, u2 = H(msg, q) * w % q, r * w % q
    return pow(g, u1, p) * pow(y, u2, p) % p % q == r

p, q, g = dsa_params()
x = secrets.randbelow(q - 1) + 1             # private key
y = pow(g, x, p)                             # public key
r, s = sign(b"launch at 9", x)
print(p.bit_length(), q.bit_length(), verify(b"launch at 9", y, r, s), verify(b"launch at 8", y, r, s))
# 2048 256 True False
```

A DSA signature with these sizes is two 256-bit numbers, 64 bytes, against 256
bytes for RSA-2048 and 512 for ElGamal. The code blocks in §14.5 and §14.6
continue from this one.

<figure class="mars-fig">
<svg viewBox="0 0 600 156" width="600" role="img" aria-label="Bar chart of signature sizes: ElGamal 512 bytes, RSA-2048 256 bytes, DSA with a 256-bit q 64 bytes, Ed25519 64 bytes">
<text x="132" y="35" font-size="13" text-anchor="end" fill="currentColor">ElGamal</text>
<rect x="140" y="19" width="340" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="486" y="35" font-size="13" text-anchor="start" fill="currentColor">512 bytes</text>
<text x="132" y="69" font-size="13" text-anchor="end" fill="currentColor">RSA-2048</text>
<rect x="140" y="53" width="170" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="316" y="69" font-size="13" text-anchor="start" fill="currentColor">256 bytes</text>
<text x="132" y="103" font-size="13" text-anchor="end" fill="currentColor">DSA (2048, 256)</text>
<rect x="140" y="87" width="42.5" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="188.5" y="103" font-size="13" text-anchor="start" fill="currentColor">64 bytes</text>
<text x="132" y="137" font-size="13" text-anchor="end" fill="currentColor">Ed25519</text>
<rect x="140" y="121" width="42.5" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="188.5" y="137" font-size="13" text-anchor="start" fill="currentColor">64 bytes</text>
</svg>
<figcaption>Figure 14.7. Signature sizes at roughly comparable strength. Working in a small subgroup is what shrank DSA's signature to two 256-bit numbers.</figcaption>
</figure>

## 14.5 Break it: the nonce

*Level: intermediate.* DSA, ElGamal and Schnorr signatures all need a fresh
secret $k$ for every signature. The signing equation is linear in $x$ and $k$:
$s k = H + x r \pmod q$. If an attacker ever learns $k$ for one signature, that
one equation has a single unknown, and

$$
x = (s k - H) \cdot r^{-1} \bmod q .
$$

**If $k$ repeats,** the attacker does not even need to know it. Two signatures
with the same $k$ have the same $r$ (anyone can spot this), and

$$
s_1 - s_2 = k^{-1}(H_1 - H_2) \quad\Longrightarrow\quad k = \frac{H_1 - H_2}{s_1 - s_2} \bmod q .
$$

**By hand,** with the toy DSA key ($x = 3$) and $k = 5$ used twice: hashes
$H_1 = 7$ and $H_2 = 3$ give $r = 1$, $s_1 = 2$ and $s_2 = 9 \cdot (3 + 3) \bmod 11 = 10$. The
attacker computes $s_1 - s_2 = -8 \equiv 3$, whose inverse mod 11 is 4, so
$k = 4 \cdot 4 \bmod 11 = 5$. Then $x = (2 \cdot 5 - 7) \cdot 1^{-1} \bmod 11 = 3$. The private
key, from two public signatures.

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Nonce reuse with the toy DSA key: two signatures with the same r give k = 5 and then x = 3">
<rect x="20" y="20" width="200" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="200" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="120" y="42.1" font-size="13" text-anchor="middle" fill="currentColor">sig 1: H₁ = 7</text>
<text x="120" y="59" font-size="13" text-anchor="middle" fill="currentColor">r = 1, s₁ = 2</text>
<rect x="20" y="92" width="200" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="92" width="200" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="120" y="114.1" font-size="13" text-anchor="middle" fill="currentColor">sig 2: H₂ = 3</text>
<text x="120" y="131" font-size="13" text-anchor="middle" fill="currentColor">r = 1, s₂ = 10</text>
<text x="120" y="170" font-size="13" text-anchor="middle" class="acc-fill">same r: anyone can see it</text>
<line x1="220" y1="46" x2="280.6" y2="71" stroke="currentColor" stroke-width="1.5"/>
<polygon points="288,74 279.2,74.3 282,67.6" fill="currentColor"/>
<line x1="220" y1="118" x2="280.6" y2="93" stroke="currentColor" stroke-width="1.5"/>
<polygon points="288,90 282,96.4 279.2,89.7" fill="currentColor"/>
<rect x="290" y="52" width="180" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="290" y="52" width="180" height="60" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="380" y="78.1" font-size="13" text-anchor="middle" fill="currentColor">k = (7 − 3) / (2 − 10)</text>
<text x="380" y="95" font-size="13" text-anchor="middle" fill="currentColor">= 4 · 4 mod 11 = 5</text>
<line x1="470" y1="82" x2="490" y2="82" stroke="currentColor" stroke-width="1.5"/>
<polygon points="498,82 490,85.6 490,78.4" fill="currentColor"/>
<rect x="500" y="52" width="145" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="500" y="52" width="145" height="60" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="572.5" y="78.1" font-size="13" text-anchor="middle" fill="currentColor">x = (2·5 − 7) / 1</text>
<text x="572.5" y="95" font-size="13" text-anchor="middle" fill="currentColor">mod 11 = 3</text>
<text x="572" y="140" font-size="13" text-anchor="middle" class="acc-fill" font-weight="bold">private key</text>
<text x="330" y="210" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">two public signatures with one k → the private key</text>
<text x="330" y="232" font-size="13" text-anchor="middle" fill="currentColor">the same algebra cost Sony its PS3 key in 2010</text>
</svg>
<figcaption>Figure 14.8. The repeated-nonce attack on the toy key, step by step. Subtracting the two signing equations eliminates the private key, so k falls out first and x follows.</figcaption>
</figure>

At full size, continuing the code of §14.4:

```python
k = secrets.randbelow(q - 1) + 1             # the bug: one k for two messages
r1, s1 = sign(b"message one", x, k)
r2, s2 = sign(b"message two", x, k)
print(r1 == r2)                              # True: the repeat is visible to anyone
h1, h2 = H(b"message one", q), H(b"message two", q)
k_found = (h1 - h2) * pow(s1 - s2, -1, q) % q
x_found = (s1 * k_found - h1) * pow(r1, -1, q) % q
print(x_found == x)                          # True: the private key, from public data
```

This is not a theoretical worry. It has happened again and again:

- **Sony PlayStation 3 (2010).** The PS3 accepted only software signed with
  Sony's ECDSA key (the elliptic-curve DSA of [Chapter 15](15-Elliptic-Curves.md),
  with the same equations). At the 27th Chaos Communication Congress in
  Berlin in December 2010, the fail0verflow group showed that Sony's signing tool
  used the same $k$ for every signature. Two signed files gave the private key, and
  in January 2011 George Hotz published it. Anyone could now sign software that
  every PS3 would run.
- **Android Bitcoin wallets (2013).** In August 2013 Bitcoin wallet apps on
  Android were found to be signing transactions with repeated $k$ values. Google
  confirmed that Android's `SecureRandom`, the Java random number generator, had
  not been seeded properly in some cases, so different signatures could get the
  same "random" nonce. Because Bitcoin transactions are public, attackers scanned
  the blockchain for repeated $r$ values, computed the private keys and took the
  coins. Wallets were patched to generate nonces differently and users had to
  move their funds to new keys.
- **Debian (2008).** The Debian OpenSSL bug ([Chapter 13](13-RSA.md)) left only a
  few thousand possible random streams. A DSA key used to sign even once on an
  affected machine was exposed, because its $k$ could be guessed and the equation
  above solved, even if the key itself had been generated safely elsewhere.

**Partly known nonces are enough.** If $k$ is not reused but merely *biased*, say
its top few bits are always zero, or a timing leak reveals them, then each
signature gives a linear relation with a small unknown. With enough signatures,
lattice reduction finds $x$. This is the **hidden number problem** of Dan Boneh and
Ramarathnam Venkatesan (1996), first used against DSA by Nick Howgrave-Graham and
Nigel Smart (2001). Real attacks include Minerva and TPM-Fail (both 2019), which
timed smart cards and TPM chips; a leak of a few bits per signature over a few
thousand signatures was enough.

**The fix: derive $k$, don't draw it.** RFC 6979 (Thomas Pornin, 2013) computes
$k$ deterministically from the private key and the message hash with HMAC. The
same message always gets the same $k$ (harmless: the signature is the same too),
and different messages get unrelated $k$ values, with no random generator to
fail. Many libraries now go one step further and **hedge**: they hash the key,
the message and fresh randomness together, so that neither a bad generator nor a
fault attack on a deterministic computation can repeat $k$. EdDSA
([Chapter 15](15-Elliptic-Curves.md)) builds deterministic nonces into the
standard.

!!! note "Life story: deterministic nonces (RFC 6979)"
    **Born:** 2013, Thomas Pornin, after years of nonce disasters · **Purpose:** compute DSA and ECDSA nonces from
    the key and the message, so no random generator can fail · **Helped:** adopted by Bitcoin wallets, OpenSSL,
    BoringSSL and most libraries; EdDSA builds the same idea in · **Status:** current, often hedged with extra
    randomness against fault attacks

## 14.6 Schnorr signatures

*Level: intermediate.*

### First, an identification protocol

Schnorr's 1989 paper starts not with a signature but with a way to **prove you
know $x$ without revealing it**. The prover has $y = g^x$ published.

1. **Commit.** The prover picks a fresh secret $k$ and sends $R = g^k$.
2. **Challenge.** The verifier picks a random $e$ and sends it.
3. **Response.** The prover sends $s = k + e x \bmod q$.
4. **Check.** The verifier accepts if $g^s = R \cdot y^e$.

It works because $g^s = g^{k + ex} = g^k (g^x)^e = R \, y^e$.

<figure class="mars-fig">
<svg viewBox="0 0 600 336" width="600" role="img" aria-label="Sequence chart of Schnorr identification: commit R, random challenge e, response s, and the check g to the s equals R times y to the e">
<rect x="88" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="140" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Prover</text>
<line x1="140" y1="38" x2="140" y2="330" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="408" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Verifier</text>
<line x1="460" y1="38" x2="460" y2="330" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="72.8" y="74" width="134.5" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="72.8" y="74" width="134.5" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="140" y="91" font-size="13" text-anchor="middle" fill="currentColor">knows x,</text>
<text x="140" y="109" font-size="13" text-anchor="middle" fill="currentColor">y = gˣ is public</text>
<line x1="140" y1="160" x2="452" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="460,160 452,163.6 452,156.4" fill="currentColor"/>
<text x="300" y="153" font-size="13" text-anchor="middle" fill="currentColor">1. commit: R = gᵏ   (fresh k)</text>
<line x1="460" y1="204" x2="148" y2="204" class="acc" stroke-width="1.5"/>
<polygon points="140,204 148,200.4 148,207.6" class="acc-fill"/>
<text x="300" y="197" font-size="13" text-anchor="middle" fill="currentColor">2. challenge: random e</text>
<line x1="140" y1="248" x2="452" y2="248" stroke="currentColor" stroke-width="1.5"/>
<polygon points="460,248 452,251.6 452,244.4" fill="currentColor"/>
<text x="300" y="241" font-size="13" text-anchor="middle" fill="currentColor">3. response: s = k + e·x mod q</text>
<rect x="411" y="266" width="98.1" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="411" y="266" width="98.1" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="283" font-size="13" text-anchor="middle" fill="currentColor">4. check</text>
<text x="460" y="301" font-size="13" text-anchor="middle" fill="currentColor">gˢ = R · yᵉ</text>
</svg>
<figcaption>Figure 14.9. Schnorr's three-move identification protocol. The order matters: the prover must commit to R before seeing e.</figcaption>
</figure>

**Why a cheater fails.** Someone without $x$ can prepare an answer for one
challenge, but not for two. If a prover could answer two different challenges
$e_1 \ne e_2$ for the same $R$, then $s_1 - s_2 = (e_1 - e_2) x$ and
$x = (s_1 - s_2)/(e_1 - e_2)$: the prover must know $x$. (This also shows, once
more, why a nonce must never repeat.)

**Why the verifier learns nothing.** Anyone can produce a valid-looking
conversation $(R, e, s)$ without knowing $x$, by choosing $e$ and $s$ first and
setting $R = g^s y^{-e}$. Such fake conversations look exactly like real ones.
So a transcript tells the verifier nothing they could not have made up, which is
what cryptographers call **zero knowledge** (more in
[Chapter 23](23-Advanced-Protocols.md)).

### From identification to signature: Fiat-Shamir

Amos Fiat and Adi Shamir showed in 1986 how to remove the verifier: let the
challenge be a **hash** of the commitment and the message, $e = H(R \,\Vert\, y \,\Vert\, m)$.
The prover cannot choose $R$ after seeing $e$, because $e$ depends on $R$; so the
hash plays the honest, unpredictable verifier. The result is the Schnorr
signature:

<figure class="mars-fig">
<svg viewBox="0 0 660 200" width="660" role="img" aria-label="Fiat-Shamir: the verifier's random challenge is replaced by a hash of the commitment, the public key and the message">
<text x="165" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">interactive</text>
<rect x="30" y="40" width="100" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="40" width="100" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="80" y="64.9" font-size="14" text-anchor="middle" fill="currentColor">R</text>
<rect x="200" y="40" width="100" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="200" y="40" width="100" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="250" y="64.5" font-size="13" text-anchor="middle" fill="currentColor">verifier</text>
<line x1="130" y1="60" x2="190" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="198,60 190,63.6 190,56.4" fill="currentColor"/>
<line x1="250" y1="80" x2="250" y2="110" class="acc" stroke-width="1.5"/>
<polygon points="250,118 246.4,110 253.6,110" class="acc-fill"/>
<rect x="190" y="120" width="120" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="190" y="120" width="120" height="40" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="250" y="144.6" font-size="13" text-anchor="middle" fill="currentColor">random e</text>
<text x="495" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">signature</text>
<rect x="350" y="40" width="100" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="350" y="40" width="100" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="64.5" font-size="13" text-anchor="middle" fill="currentColor">R ‖ y ‖ m</text>
<rect x="510" y="40" width="120" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="510" y="40" width="120" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="570" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">hash H</text>
<line x1="450" y1="60" x2="500" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="508,60 500,63.6 500,56.4" fill="currentColor"/>
<line x1="570" y1="80" x2="570" y2="110" class="acc" stroke-width="1.5"/>
<polygon points="570,118 566.4,110 573.6,110" class="acc-fill"/>
<rect x="500" y="120" width="140" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="500" y="120" width="140" height="40" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="570" y="144.6" font-size="13" text-anchor="middle" fill="currentColor">e = H(R ‖ y ‖ m)</text>
<line x1="330" y1="20" x2="330" y2="180" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<text x="495" y="186" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">e depends on R, so R cannot be chosen after e</text>
<text x="165" y="186" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">an honest verifier picks e after seeing R</text>
</svg>
<figcaption>Figure 14.10. The Fiat-Shamir transform. A hash stands in for the verifier, which turns a conversation into a signature anyone can check later.</figcaption>
</figure>

$$
\begin{aligned}
\textbf{Sign:} \quad & \text{fresh } k, \quad R = g^k, \quad e = H(R \,\Vert\, y \,\Vert\, m), \quad s = k + e x \bmod q; \quad \text{signature } (R, s) \\
\textbf{Verify:} \quad & g^s = R \cdot y^e
\end{aligned}
$$

**By hand,** in the order-11 subgroup mod 23 with $g = 4$, $x = 3$, $y = 18$:

| Step | Calculation | Value |
|---|---|---|
| Nonce, commitment | $k = 5$, $R = 4^5 \bmod 23$ | $R = 12$ |
| Challenge | $e = H(R \,\Vert\, y \,\Vert\, m) \bmod 11$, say | $e = 6$ |
| Response | $s = 5 + 6 \cdot 3 \bmod 11 = 23 \bmod 11$ | $s = 1$ |
| Verify, left | $g^s = 4^1$ | 4 |
| Verify, right | $R \cdot y^e = 12 \cdot 18^6 \bmod 23 = 12 \cdot 8 \bmod 23 = 96 \bmod 23$ | 4: valid |

Compare the signing equations. DSA: $s = k^{-1}(H + xr)$. Schnorr: $s = k + ex$.
Schnorr's has no inverse, is linear, and hashes the commitment together with the
message. Those differences give it a clean security proof (below) and make
signatures from several signers easy to add up.

!!! note "Life story: the Fiat-Shamir transform"
    **Born:** 1986, Amos Fiat and Adi Shamir, Weizmann Institute of Science · **Purpose:** turn an interactive
    proof of identity into a signature anyone can check later · **Helped:** Schnorr signatures, EdDSA, ML-DSA
    ([Chapter 21](21-Lattice-Cryptography.md)) and most zero-knowledge proof systems · **Setbacks:** implementations
    that hash too little into the challenge (the "Frozen Heart" bugs of 2022) · **Status:** current

### Code it

Continuing in the DSA group of §14.4:

```python
b = lambda v: v.to_bytes(256, "big")         # group elements as 256 bytes

def challenge(R, y, msg):
    return H(b(R) + b(y) + msg, q)

def schnorr_sign(msg, x):
    k = secrets.randbelow(q - 1) + 1         # fresh nonce
    R = pow(g, k, p)                         # commitment
    return R, (k + challenge(R, y, msg) * x) % q

def schnorr_verify(msg, y, R, s):
    return pow(g, s, p) == R * pow(y, challenge(R, y, msg), p) % p

R, s = schnorr_sign(b"launch at 9", x)
print(schnorr_verify(b"launch at 9", y, R, s), schnorr_verify(b"launch at 8", y, R, s))

# Zero knowledge: anyone can make a transcript (R, e, s) that passes the
# interactive check g^s = R * y^e, without x, by choosing e and s first.
e, s = secrets.randbelow(q), secrets.randbelow(q)
R = pow(g, s, p) * pow(y, -e, p) % p
print(pow(g, s, p) == R * pow(y, e, p) % p)  # True: so a transcript proves nothing to others
```

Output:

```
True False
True
```

The simulated transcript passes the interactive check. It would not pass as a
*signature*, because there $e$ must equal the hash of $R$, and the simulator
chose $R$ after $e$.

### The patent story

Schnorr patented the scheme; US 4,995,082 was granted in February 1991, six months before NIST proposed DSA. NIST chose the ElGamal-style equation
instead of Schnorr's simpler one, and the elliptic-curve version, ECDSA, copied
DSA. So for two decades the world's standard discrete-log signatures were the
more awkward, harder-to-prove design, partly because the better one was owned.

The patent expired in 2008. Schnorr signatures then came back twice. **EdDSA**
(Bernstein and others, 2011; [Chapter 15](15-Elliptic-Curves.md)) is a Schnorr
signature on an Edwards curve with a deterministic nonce, and is now the default
SSH key. **BIP-340** brought Schnorr signatures to Bitcoin's secp256k1 curve,
switched on by the Taproot upgrade at block 709,632 in November 2021.

Schnorr himself, born in 1943, spent his career at Goethe University Frankfurt,
where he is also known for lattice reduction (the BKZ algorithm he developed with
Martin Euchner is still the workhorse of lattice cryptanalysis, as
[Chapter 21](21-Lattice-Cryptography.md) explains). His signature is a rare case of
a design that was right from the start and simply had to wait.

!!! note "Life story: Schnorr signatures"
    **Born:** 1989, Claus-Peter Schnorr, Goethe University Frankfurt · **Purpose:** short, fast signatures for
    smart cards · **Held back:** by its US patent (1991 to 2008), so standards chose DSA · **Helped:** became EdDSA
    (Ed25519, 2011), the default SSH key, and Bitcoin's BIP-340 (2021); its linearity enables MuSig2 and FROST ·
    **Status:** current, the preferred discrete-log signature design

### Adding signatures together

Because $s = k + ex$ is linear, two signers can add their nonces and keys and
produce one signature valid for the combined key $y_1 y_2$. Done naively it is
insecure: a dishonest signer can publish a key $y_2 = g^{x_2} y_1^{-1}$ that
cancels the other's (a **rogue-key attack**), and in 2019 Manu Drijvers and
co-authors showed that several published two-round multi-signature schemes,
including the first version of MuSig, could be forged. The current designs are
**MuSig2** (BIP-327) for $n$-of-$n$ signing and **FROST** (RFC 9591) for
$t$-of-$n$ threshold signing. Either way the result is one ordinary Schnorr
signature that verifiers cannot tell from a single signer's.

## 14.7 Blind signatures, briefly

*Level: intermediate.* In 1982 David Chaum asked how a bank could issue digital
cash that is as private as paper money. The bank must sign each coin (so it
can't be forged) but must not see the coin's serial number (so it can't follow
where it is spent). His answer, at CRYPTO 1982, was the **blind signature**,
built on RSA.

The bank has an RSA key $(n, e)$, $d$. The client wants a signature on $m$:

1. **Blind:** pick a random $r$ and send $m' = m \cdot r^e \bmod n$. With $r$
   random, $m'$ reveals nothing about $m$.
2. **Sign:** the bank returns $s' = m'^d = m^d \cdot r \bmod n$.
3. **Unblind:** the client computes $s = s' \cdot r^{-1} = m^d \bmod n$, an
   ordinary RSA signature on $m$ that the bank has never seen.

By hand with the key of [Chapter 13](13-RSA.md) ($n = 3233$, $e = 17$,
$d = 2753$), $m = 65$ and $r = 7$: $m' = 65 \cdot 7^{17} \bmod 3233 = 2034$; the bank
returns $2034^{2753} \bmod 3233 = 883$; and $883 \cdot 7^{-1} = 883 \cdot 462 \bmod 3233 = 588$,
which is exactly the signature on 65 from §13.3. In code, with a toy key:

<figure class="mars-fig">
<svg viewBox="0 0 640 334" width="640" role="img" aria-label="Sequence chart of an RSA blind signature: the client blinds 65 into 2034, the bank signs it to 883, the client unblinds to 588, the signature on 65">
<rect x="108" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Client</text>
<line x1="160" y1="38" x2="160" y2="328" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="428" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bank</text>
<line x1="480" y1="38" x2="480" y2="328" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="52.7" y="74" width="214.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="52.7" y="74" width="214.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="91" font-size="13" text-anchor="middle" fill="currentColor">wants a signature on m = 65</text>
<text x="160" y="109" font-size="13" text-anchor="middle" fill="currentColor">picks random r = 7</text>
<rect x="409.1" y="74" width="141.8" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="409.1" y="74" width="141.8" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="91" font-size="13" text-anchor="middle" fill="currentColor">RSA key n = 3233,</text>
<text x="480" y="109" font-size="13" text-anchor="middle" fill="currentColor">e = 17, secret d</text>
<line x1="160" y1="160" x2="472" y2="160" class="acc" stroke-width="1.5"/>
<polygon points="480,160 472,163.6 472,156.4" class="acc-fill"/>
<text x="320" y="153" font-size="13" text-anchor="middle" fill="currentColor">m′ = 65 · 7¹⁷ mod 3233 = 2034  (looks random)</text>
<line x1="480" y1="204" x2="168" y2="204" stroke="currentColor" stroke-width="1.5"/>
<polygon points="160,204 168,200.4 168,207.6" fill="currentColor"/>
<text x="320" y="197" font-size="13" text-anchor="middle" fill="currentColor">s′ = 2034^d mod 3233 = 883</text>
<rect x="60" y="222" width="200" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="60" y="222" width="200" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="239" font-size="13" text-anchor="middle" fill="currentColor">s = 883 · 7⁻¹ = 883 · 462</text>
<text x="160" y="257" font-size="13" text-anchor="middle" fill="currentColor">mod 3233 = 588</text>
<rect x="110" y="282" width="420" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="110" y="282" width="420" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="299" font-size="13" text-anchor="middle" fill="currentColor">588 is the ordinary signature on 65; the bank never saw 65</text>
</svg>
<figcaption>Figure 14.11. Chaum's blind signature with the numbers above. The random factor r hides the message on the way in and is divided out on the way back.</figcaption>
</figure>

```python
import hashlib, secrets

p, q = 2**61 - 1, 2**89 - 1                # toy key from two Mersenne primes
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))          # the signer's secret

msg = b"token 7f3a"
m = int.from_bytes(hashlib.sha256(msg).digest(), "big") % n

r = secrets.randbelow(n - 2) + 2           # client: random blinding factor
blinded = m * pow(r, e, n) % n             # this is all the signer sees

blind_sig = pow(blinded, d, n)             # signer: plain RSA on the blinded value

s = blind_sig * pow(r, -1, n) % n          # client: divide r back out
print(pow(s, e, n) == m, s == pow(m, d, n))   # True True
```

Chaum's company DigiCash ran eCash with a few banks from 1995 and went bankrupt in
1998. The idea came back as **anonymous tokens**: Privacy Pass (RFC 9576 to 9578)
and Apple's Private Access Tokens (2022) use RSA blind signatures, standardized in
RFC 9474 (2023), to let a site check that a visitor passed a test elsewhere
without linking the two. Two cautions: the blind-signing key must be used for
nothing else, since the signer raises *any* number it receives to $d$; and blind
Schnorr signatures are harder than they look (the ROS attack of 2021 forges them
when many sessions run at once). Details: [Blind signatures
reference](../02-signatures/Blind-Signatures.md).

!!! note "Life story: blind signatures"
    **Born:** 1982, David Chaum, then a graduate student at Berkeley · **Purpose:** digital cash as private as
    banknotes · **Helped:** DigiCash's eCash (1995 to 1998) and GNU Taler; today anonymous tokens in Privacy Pass and
    Apple's Private Access Tokens (RFC 9474, 2023) · **Setbacks:** eCash failed commercially; blind Schnorr fell
    to the ROS attack (2021) · **Status:** current, as RSA blind signatures

## 14.8 In the real world

| Scheme | Introduced | Where it was used | Status today |
|---|---|---|---|
| ElGamal encryption | 1985 | OpenPGP (GnuPG's default subkey until 2009) | RFC 9580 (2024) forbids new ElGamal keys; e-voting (Helios, ElectionGuard) uses its homomorphic form |
| ElGamal signatures | 1985 | early OpenPGP | dropped; RFC 9580 forbids them |
| DSA | 1991, FIPS 186 (1994) | PGP, SSH (ssh-dss), government PKI | FIPS 186-5 (2023) withdrew it for new signatures; OpenSSH disabled ssh-dss by default in 7.0 (2015) and removed it in 10.0 (2025) |
| Schnorr | 1989 | little, until the patent expired | as EdDSA, the default in SSH and many protocols; as BIP-340, in Bitcoin since 2021 |
| ECDSA | 1992, ANSI X9.62 (1999) | TLS certificates, Bitcoin, Ethereum, smart cards | widely used; see [Chapter 15](15-Elliptic-Curves.md) |
| RSA blind signatures | 1982 | DigiCash, GNU Taler | RFC 9474; Privacy Pass, Private Access Tokens |

The finite-field versions are fading for the same reason finite-field
Diffie-Hellman did: the elliptic-curve versions in the next chapter give the same
security with keys and signatures a fraction of the size. All of them, finite
field or elliptic, fall to Shor's algorithm, and NIST IR 8547 deprecates them
after 2030.

If you must use DSA for compatibility, use $(L, N) = (2048, 256)$ or
$(3072, 256)$, SHA-256, and RFC 6979 nonces. For anything new, use Ed25519.

Full details: [ElGamal](../03-public-key-encryption/ElGamal.md),
[DSA](../02-signatures/DSA.md), [Schnorr](../02-signatures/Schnorr.md).

## 14.9 Choosing between them

A short guide to the design choices this chapter has shown, since you will meet
all of them inside larger protocols:

- **Encrypting to a public key:** never multiply by a shared secret (ElGamal);
  hash it into an AEAD key (DHIES, ECIES, HPKE).
- **Signing:** prefer Schnorr-style equations (EdDSA, BIP-340) over DSA-style
  ones (DSA, ECDSA). They have proofs, need no inverses, and aggregate.
- **Nonces:** never draw $k$ from a random generator alone. Derive it (RFC 6979,
  EdDSA) or hedge it.
- **Groups:** prime-order subgroups, standard parameters, checked inputs.

## 14.10 Going deeper

*Level: expert.*

### The forking lemma: why Schnorr is secure

David Pointcheval and Jacques Stern proved in 1996 that Schnorr signatures are
unforgeable if the discrete log is hard, modeling the hash as a random oracle. The
idea is the "two challenges" argument of §14.6, done by a simulator. Run the
forger once and it outputs a signature $(R, s)$ on a challenge $e$ that the
simulator supplied as the hash value. **Rewind** the forger to the moment it asked
for that hash, and answer with a different $e'$. With noticeable probability it
forges again with the same $R$ and a new $s'$. Then
$x = (s - s')/(e - e') \bmod q$, and the simulator has solved a discrete log.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The forking lemma: the forger is run, then rewound to the hash query for R and given a different challenge; the two forgeries with the same R reveal x">
<rect x="20" y="90" width="140" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="90" width="140" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="90" y="116.5" font-size="13" text-anchor="middle" fill="currentColor">forger starts</text>
<line x1="160" y1="112" x2="230" y2="112" stroke="currentColor" stroke-width="1.5"/>
<polygon points="238,112 230,115.6 230,108.4" fill="currentColor"/>
<rect x="240" y="90" width="150" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="240" y="90" width="150" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="315" y="116.5" font-size="13" text-anchor="middle" fill="currentColor">asks H(R ‖ y ‖ m)</text>
<line x1="390" y1="104" x2="461.3" y2="56.4" stroke="currentColor" stroke-width="1.5"/>
<polygon points="468,52 463.3,59.4 459.3,53.4" fill="currentColor"/>
<line x1="390" y1="120" x2="461.3" y2="167.6" class="acc" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="468,172 459.3,170.6 463.3,164.6" class="acc-fill"/>
<rect x="470" y="30" width="160" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="470" y="30" width="160" height="44" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="550" y="56.5" font-size="13" text-anchor="middle" fill="currentColor">answer e → forgery s</text>
<rect x="470" y="150" width="160" height="44" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="470" y="150" width="160" height="44" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="550" y="176.6" font-size="13" text-anchor="middle" fill="currentColor">rewind: e′ → s′</text>
<text x="320" y="220" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">same R, two challenges: x = (s − s′) / (e − e′) mod q</text>
<text x="430" y="108" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">fork</text>
</svg>
<figcaption>Figure 14.12. Pointcheval and Stern's rewinding argument. A forger that works at all can be made to answer two challenges for one commitment, which hands the simulator a discrete log.</figcaption>
</figure>

The rewinding costs tightness: a forger succeeding with probability $\varepsilon$
gives a discrete-log solver succeeding with probability about $\varepsilon^2/Q$,
where $Q$ is the number of hash queries. Whether a tighter proof is possible was
studied for years; results by Seurin (2012) and others show the loss is
unavoidable for this kind of reduction. In the **generic group model**, though,
Schnorr signatures are about as strong as the group itself.

DSA and ECDSA have no comparable proof under standard assumptions, because the
"mod $q$" in $r = (g^k \bmod p) \bmod q$ mixes two unrelated structures. Proofs
exist only in idealized models (Fersch, Kiltz and Poettering, 2016, in a
"bijective random oracle" model for ECDSA).

### Lattices and biased nonces

Write each signature as $k_i \equiv s_i^{-1} H_i + s_i^{-1} r_i x \pmod q$, that is
$k_i = a_i + b_i x \pmod q$ with known $a_i$, $b_i$. If every $k_i$ is below $2^{\ell}$
for some $\ell$ smaller than the bit length of $q$ (say the top 4 bits are always
zero), then the vector $(k_1, \ldots, k_m)$ is unusually short, and it lies in a
lattice built from the $a_i$, $b_i$ and $q$. Lattice reduction (LLL, BKZ) finds
short vectors, and with them $x$. As a rule of thumb, $m$ signatures that each
leak $\ell$ bits suffice when $m \ell$ comfortably exceeds the size of $q$; with
better algorithms, even fractions of a bit per signature have been exploited.
This is why nonce generation must be exactly uniform mod $q$, not "a 256-bit
random number reduced mod $q$" when $q$ is a little smaller than $2^{256}$.
[Chapter 21](21-Lattice-Cryptography.md) explains lattice reduction.

### ElGamal and chosen-ciphertext security

Plain ElGamal is IND-CPA secure (semantically secure against chosen-plaintext
attack) if DDH is hard in the group, but its malleability means it can never be
IND-CCA2 secure. Ronald Cramer and Victor Shoup (1998) gave the first practical
scheme secure against adaptive chosen-ciphertext attacks without random oracles:
an ElGamal variant with two extra group elements that act as a proof the
ciphertext was formed honestly. In practice, the hashed (DHIES/ECIES/HPKE) route
won: it is simpler and secure in the random oracle model under a slightly
stronger assumption (gap or strong Diffie-Hellman). [Chapter 17](17-Defining-Security.md)
defines these notions.

### Bad parameters

Domain parameters can be malicious too. Serge Vaudenay showed in 1996 that whoever
generates DSA parameters can choose $q$ so that two chosen messages have hashes
that collide mod $q$, so a signature on one is a signature on the other. FIPS 186
answers with **verifiable generation**: $p$ and $q$ come from a published seed
through a hash, so anyone can check that they were not chosen to order. Daniel
Bleichenbacher (1996) showed a similar trap in ElGamal signatures when the
generator is chosen badly. The lesson repeats through Part III: public parameters
deserve as much scrutiny as keys.

## Check yourself

??? question "1. With $p = 23$, $g = 5$ and Bob's public key $h = 8$, encrypt $m = 4$ using $k = 2$."

    $c_1 = 5^2 \bmod 23 = 2$ and the mask is $8^2 \bmod 23 = 64 \bmod 23 = 18$, so
    $c_2 = 4 \cdot 18 \bmod 23 = 72 \bmod 23 = 3$. The ciphertext is $(2, 3)$. Bob checks:
    $c_1^6 = 2^6 = 64 \equiv 18$, $18^{-1} \equiv 9$ (since $18 \cdot 9 = 162 = 7 \cdot 23 + 1$), and $3 \cdot 9 = 27 \equiv 4$.

??? question "2. Why must ElGamal use a fresh $k$ for every message, even for encryption?"

    Two messages encrypted with the same $k$ share the mask $h^k$, and $c_1$ is the same. Then
    $c_2 / c_2' = m / m'$, so anyone who knows one message learns the other.

??? question "3. An ElGamal ciphertext of a secret $m$ is $(c_1, c_2)$. Without the key, produce an encryption of $3m$."

    $(c_1, 3 c_2)$. It decrypts to $3 c_2 / c_1^x = 3m$. This malleability is why ElGamal is not secure
    against chosen-ciphertext attacks.

??? question "4. In DSA with $p = 23$, $q = 11$, $g = 4$ and $x = 3$, sign $H = 3$ with $k = 5$, then verify."

    $r = (4^5 \bmod 23) \bmod 11 = 1$ and $s = 5^{-1} (3 + 3 \cdot 1) = 9 \cdot 6 = 54 \equiv 10 \pmod{11}$.
    Verify: $w = 10^{-1} \bmod 11 = 10$ (since $10 \cdot 10 = 100 = 9 \cdot 11 + 1$), $u_1 = 3 \cdot 10 \bmod 11 = 8$,
    $u_2 = 1 \cdot 10 = 10$. Then $4^8 \bmod 23 = 9$ and $18^{10} \bmod 23 = 9$, so
    $g^{u_1} y^{u_2} = 81 \bmod 23 = 12$, and $12 \bmod 11 = 1 = r$. Valid.

??? question "5. Two DSA signatures from the same key share the same $r$. What should you conclude, and what can you compute?"

    The same $k$ was used (two different $k$ almost never give the same $r$). From the two hashes and
    $s$ values, $k = (H_1 - H_2)/(s_1 - s_2) \bmod q$, and then $x = (s_1 k - H_1)/r \bmod q$.

??? question "6. Show that knowing $k$ for a single Schnorr signature $(R, s)$ reveals $x$."

    $s = k + e x \bmod q$ and $e = H(R \,\Vert\, y \,\Vert\, m)$ is public, so $x = (s - k) e^{-1} \bmod q$.

??? question "7. Why can't a Schnorr signature's verifier simply accept transcripts made by the simulator of §14.6?"

    The simulator picks $e$ first and builds $R$ from it. In a signature, $e$ must equal $H(R \,\Vert\, y \,\Vert\, m)$;
    to make that hold for a precomputed $R$, the simulator would need to find a hash input that maps to the $e$ it
    already chose, which a good hash prevents.

??? question "8. With the RSA key $n = 3233$, $e = 17$, $d = 2753$, blind the message $m = 65$ with $r = 2$ instead of 7. What does the bank see, and what does the client end up with?"

    The bank sees $m' = 65 \cdot 2^{17} \bmod 3233 = 725$ and returns $725^{2753} \bmod 3233 = 1176$. The client
    computes $1176 \cdot 2^{-1} \bmod 3233 = 588$, the same signature as with $r = 7$: the result is $65^{2753} \bmod 3233$
    whatever $r$ was. For a random $r$, the value the bank sees is a random number.

??? question "9. Why does RFC 6979 make $k$ depend on both the private key and the message, and not just on the message?"

    If $k$ depended only on the message, anyone could compute it from the public message and then solve
    $x = (sk - H)/r$. The private key makes $k$ unpredictable to everyone else; the message makes it differ
    between messages.

## What you learned

- ElGamal encryption is a one-sided Diffie-Hellman exchange: send $g^k$, mask
  the message with $h^k$. It is randomized, doubles the size, and is malleable
  and homomorphic.
- ElGamal signatures, DSA and Schnorr all prove knowledge of $x$ with $y = g^x$;
  DSA and Schnorr work in a prime-order subgroup to keep signatures small.
- Every signature uses a secret nonce $k$. Knowing it, repeating it or biasing
  it reveals the private key; Sony's PS3 and Android Bitcoin wallets lost keys
  this way. Derive or hedge nonces (RFC 6979, EdDSA).
- Schnorr signatures come from a zero-knowledge identification protocol via
  Fiat-Shamir. They are linear, simple and provably secure in the random oracle
  model; a patent kept them out of standards until EdDSA and BIP-340.
- Blind signatures let a signer sign without seeing the message: digital cash
  then, anonymous tokens now.
- The finite-field versions are retired or retiring in favor of elliptic curves,
  and all of them fall to quantum computers.

**Next:** [Chapter 15](15-Elliptic-Curves.md), the same ideas on elliptic curves.

## Further reading

- T. ElGamal, "A Public Key Cryptosystem and a Signature Scheme Based on Discrete Logarithms", *IEEE Transactions on Information Theory* 31(4), 1985.
- C. P. Schnorr, "Efficient Identification and Signatures for Smart Cards", CRYPTO 1989 (journal version: *Journal of Cryptology* 4, 1991).
- A. Fiat and A. Shamir, "How to Prove Yourself: Practical Solutions to Identification and Signature Problems", CRYPTO 1986.
- D. Pointcheval and J. Stern, "Security Proofs for Signature Schemes", EUROCRYPT 1996.
- D. Chaum, "Blind Signatures for Untraceable Payments", CRYPTO 1982.
- N. Howgrave-Graham and N. Smart, "Lattice Attacks on Digital Signature Schemes", *Designs, Codes and Cryptography* 23, 2001.
- fail0verflow, "Console Hacking 2010: PS3 Epic Fail", 27th Chaos Communication Congress, 2010.
- R. Cramer and V. Shoup, "A Practical Public Key Cryptosystem Provably Secure against Adaptive Chosen Ciphertext Attack", CRYPTO 1998.
- FIPS 186-5, RFC 6979, RFC 9474, RFC 9591, RFC 9580.
- Reference pages: [ElGamal](../03-public-key-encryption/ElGamal.md), [DSA](../02-signatures/DSA.md), [Schnorr](../02-signatures/Schnorr.md), [Blind signatures](../02-signatures/Blind-Signatures.md).
