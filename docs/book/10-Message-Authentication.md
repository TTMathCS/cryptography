# 10. Message Authentication

*Encryption hides a message; it does not stop anyone from changing it. This
chapter starts by editing a message protected by a perfect one-time pad, then
builds the tools that catch such edits: MACs (HMAC, CMAC, Poly1305 and others)
and authenticated encryption (AES-GCM and ChaCha20-Poly1305), which today
protects almost every byte sent over the internet. Along the way you will forge
CBC-MAC, recover a Poly1305 key, and forge an AES-GCM message from one repeated
nonce, and see why the rule "never reuse a nonce" is absolute.*

!!! abstract "In this chapter"
    **You will learn:**

    - why encryption alone is malleable, and what a MAC must guarantee
    - HMAC, CMAC and Poly1305: three ways to build a MAC, from a hash, a block cipher and polynomial arithmetic
    - how to combine a cipher and a MAC (encrypt-then-MAC), and the padding-oracle attacks that came from the other orders
    - AEAD: the interface, how AES-GCM and ChaCha20-Poly1305 work, and exactly what a repeated nonce gives away
    - nonce-misuse resistance (SIV, AES-GCM-SIV) and key commitment

    **You need:** [Chapter 5](05-Stream-Ciphers.md) (stream ciphers and
    ChaCha20), [Chapter 7](07-AES.md) (AES and $\mathrm{GF}(2^8)$),
    [Chapter 8](08-Modes-of-Operation.md) (CBC and CTR) and
    [Chapter 9](09-Hash-Functions.md) (hashes and length extension).

    **Levels:** 10.1 and 10.2 are for beginners; 10.3 to 10.11 are
    intermediate; 10.12 is expert.

## 10.1 The problem: encryption is not integrity

People have needed to know that a message was genuine for as long as they have
needed to keep it secret, and often more. Seals on letters, signatures and
countersigns did the job for centuries. When banks began moving money by
telegraph in the nineteenth century, a forged telegram could empty an account,
so banks agreed on secret **test keys**: numbers computed from the amount, the
date and a private table, added to each transfer so the receiving bank could
check it. Detailed records of how those tables worked are scattered, but they
were the ancestor of what this chapter builds.

Mathematics caught up in 1974, when Edgar Gilbert, Jessie MacWilliams and Neil
Sloane at Bell Labs published "Codes Which Detect Deception", the first theory
of authentication with provable odds against a forger. Gustavus Simmons at
Sandia National Laboratories developed it further in the 1980s, partly for a
very concrete problem: seismic sensors placed to verify a nuclear test ban had
to report readings the host country could read but could not fake. In 1981
Mark Wegman and Larry Carter at IBM found how to make such codes fast (§10.5).

<figure class="mars-fig">
<svg viewBox="0 0 560 505" width="560" role="img" aria-label="Timeline of message authentication from 1974 to 2023">
<line x1="78" y1="12" x2="78" y2="493" stroke="currentColor" stroke-width="2"/>
<circle cx="78" cy="20" r="5" fill="currentColor"/>
<text x="64" y="25" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1974</text>
<text x="94" y="25" font-size="14" fill="currentColor">Gilbert, MacWilliams, Sloane: codes that detect deception</text>
<circle cx="78" cy="47" r="5" fill="currentColor"/>
<text x="64" y="52" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1981</text>
<text x="94" y="52" font-size="14" fill="currentColor">Wegman and Carter: MACs from universal hashing</text>
<circle cx="78" cy="74" r="5" fill="currentColor"/>
<text x="64" y="79" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1985</text>
<text x="94" y="79" font-size="14" fill="currentColor">FIPS 113: DES CBC-MAC for banking</text>
<circle cx="78" cy="101" r="5" fill="currentColor"/>
<text x="64" y="106" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1996</text>
<text x="94" y="106" font-size="14" fill="currentColor">HMAC (Bellare, Canetti, Krawczyk)</text>
<circle cx="78" cy="128" r="5" fill="currentColor"/>
<text x="64" y="133" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2000</text>
<text x="94" y="133" font-size="14" fill="currentColor">Bellare and Namprempre: encrypt-then-MAC</text>
<circle cx="78" cy="155" r="5" class="acc-fill"/>
<text x="64" y="160" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2002</text>
<text x="94" y="160" font-size="14" fill="currentColor">Vaudenay&#x27;s padding oracle</text>
<circle cx="78" cy="182" r="5" fill="currentColor"/>
<text x="64" y="187" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2004</text>
<text x="94" y="187" font-size="14" fill="currentColor">GCM (McGrew and Viega)</text>
<circle cx="78" cy="209" r="5" fill="currentColor"/>
<text x="64" y="214" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2005</text>
<text x="94" y="214" font-size="14" fill="currentColor">Poly1305 (Bernstein); CMAC standardized</text>
<circle cx="78" cy="236" r="5" class="acc-fill"/>
<text x="64" y="241" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2006</text>
<text x="94" y="241" font-size="14" fill="currentColor">Joux&#x27;s &quot;forbidden attack&quot; on GCM</text>
<circle cx="78" cy="263" r="5" fill="currentColor"/>
<text x="64" y="268" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2008</text>
<text x="94" y="268" font-size="14" fill="currentColor">RFC 5116: the AEAD interface</text>
<circle cx="78" cy="290" r="5" class="acc-fill"/>
<text x="64" y="295" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2011</text>
<text x="94" y="295" font-size="14" fill="currentColor">Hash flooding takes down web servers</text>
<circle cx="78" cy="317" r="5" fill="currentColor"/>
<text x="64" y="322" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2012</text>
<text x="94" y="322" font-size="14" fill="currentColor">SipHash</text>
<circle cx="78" cy="344" r="5" class="acc-fill"/>
<text x="64" y="349" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2013</text>
<text x="94" y="349" font-size="14" fill="currentColor">Lucky Thirteen</text>
<circle cx="78" cy="371" r="5" class="acc-fill"/>
<text x="64" y="376" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2014</text>
<text x="94" y="376" font-size="14" fill="currentColor">POODLE ends SSL 3.0</text>
<circle cx="78" cy="398" r="5" fill="currentColor"/>
<text x="64" y="403" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2015</text>
<text x="94" y="403" font-size="14" fill="currentColor">ChaCha20-Poly1305 becomes RFC 7539</text>
<circle cx="78" cy="425" r="5" class="acc-fill"/>
<text x="64" y="430" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<text x="94" y="430" font-size="14" fill="currentColor">KRACK: nonce reuse in Wi-Fi</text>
<circle cx="78" cy="452" r="5" fill="currentColor"/>
<text x="64" y="457" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2018</text>
<text x="94" y="457" font-size="14" fill="currentColor">TLS 1.3 allows only AEADs</text>
<circle cx="78" cy="479" r="5" fill="currentColor"/>
<text x="64" y="484" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2023</text>
<text x="94" y="484" font-size="14" fill="currentColor">NIST chooses Ascon for small devices</text>
</svg>
<figcaption>Figure 10.1. Fifty years of message authentication. The accent years are attacks; each one pushed the field toward the designs that are standard today.</figcaption>
</figure>

Here is why it matters. In [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)
the one-time pad gave perfect secrecy: the ciphertext tells an attacker nothing
at all about the message. But look what an attacker can *do* to it:

```python
import os

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key = os.urandom(32)                     # a perfect one-time pad: unbreakable secrecy
msg = b"pay Bob   $100.00 from Alice"
ct = xor(msg, key)

# The attacker can't read ct, but guesses its format and edits it in flight.
old, new = b"Bob   $100", b"Eve $90000"
evil = ct[:4] + xor(ct[4:14], xor(old, new)) + ct[14:]
print(xor(evil, key))                    # what the bank decrypts
# b'pay Eve $90000.00 from Alice'
```

<figure class="mars-fig">
<svg viewBox="0 0 596 200" width="596" role="img" aria-label="Three rows of characters: Alice&#x27;s message, the difference the attacker XORs into the ciphertext, and the message the bank decrypts">
<text x="10" y="18" font-size="13" fill="currentColor">what Alice sent (the attacker never sees it)</text>
<rect x="11" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="26" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">p</text>
<rect x="43" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="58" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">a</text>
<rect x="75" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="90" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">y</text>
<rect x="107" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="122" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="139" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="154" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">B</text>
<rect x="171" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">o</text>
<rect x="203" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="218" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">b</text>
<rect x="235" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="267" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="282" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="299" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="314" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="331" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="346" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">$</text>
<rect x="363" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="378" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">1</text>
<rect x="395" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="410" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="427" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="442" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="459" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">.</text>
<rect x="491" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="506" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="523" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="538" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="555" y="25" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="570" y="46" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<text x="10" y="78" font-size="13" fill="currentColor">Δ the attacker XORs into the ciphertext</text>
<rect x="11" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="26" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="43" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="58" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="75" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="90" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="107" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="122" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="139" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="139" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="154" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">07</text>
<rect x="171" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="171" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">19</text>
<rect x="203" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="203" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="218" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">07</text>
<rect x="235" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="267" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="267" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="282" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">04</text>
<rect x="299" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="299" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="314" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">19</text>
<rect x="331" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="331" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="346" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">14</text>
<rect x="363" y="85" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="363" y="85" width="30" height="30" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="0.8"/>
<text x="378" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">01</text>
<rect x="395" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="410" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="427" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="442" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="459" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="491" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="506" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="523" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="538" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<rect x="555" y="85" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="570" y="105" font-size="13" text-anchor="middle" font-family="monospace" fill="currentColor">·</text>
<text x="10" y="138" font-size="13" font-weight="bold" fill="currentColor">what the bank decrypts</text>
<rect x="11" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="26" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">p</text>
<rect x="43" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="58" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">a</text>
<rect x="75" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="90" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">y</text>
<rect x="107" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="122" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="139" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="139" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="154" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">E</text>
<rect x="171" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="171" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">v</text>
<rect x="203" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="203" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="218" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">e</text>
<rect x="235" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="250" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
<rect x="267" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="267" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="282" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">$</text>
<rect x="299" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="299" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="314" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">9</text>
<rect x="331" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="331" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="346" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="363" y="145" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="363" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="378" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="395" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="410" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="427" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="442" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="459" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">.</text>
<rect x="491" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="506" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="523" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="538" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">0</text>
<rect x="555" y="145" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="570" y="166" font-size="16" text-anchor="middle" font-family="monospace" fill-opacity="0.45" fill="currentColor">␣</text>
</svg>
<figcaption>Figure 10.2. Editing a one-time-pad ciphertext. The attacker XORs Δ = old ⊕ new into the ciphertext bytes where they expect "Bob   $100"; decryption cancels the pad and leaves Alice's text XOR Δ, which is "Eve $90000". No key was needed.</figcaption>
</figure>

XORing a value into the ciphertext XORs the same value into the plaintext. The
attacker never learned the key and never read anything; they knew the format
of a payment order and rewrote it. This is **malleability**, and every stream
cipher and CTR mode has it, since they are all "XOR with a keystream". CBC is
malleable in a different pattern ([Chapter 8](08-Modes-of-Operation.md)), and
textbook RSA in yet another ([Chapter 13](13-RSA.md)).

So we need a second tool, separate from secrecy: a short **tag** sent with the
message that only someone holding the key could have produced, and that stops
matching if anything changes.

## 10.2 What a MAC is

A **message authentication code** (MAC) is a pair of algorithms that share a
secret key $K$:

- $\mathrm{Tag}(K, m)$ returns a short tag $t$, typically 16 or 32 bytes;
- $\mathrm{Verify}(K, m, t)$ returns "valid" or "invalid".

The sender sends $(m, t)$. The receiver recomputes the tag and accepts only if
it matches. A MAC does not hide $m$; it vouches for it.

<figure class="mars-fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="Alice computes a tag with key K and sends message and tag; Bob recomputes the tag with K and accepts only if it matches">
<rect x="10" y="50" width="150" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="77" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">Alice</text>
<text x="85" y="94" font-size="13" text-anchor="middle" fill="currentColor">t = Tag(K, m)</text>
<rect x="480" y="50" width="150" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="77" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">Bob</text>
<text x="555" y="94" font-size="13" text-anchor="middle" fill="currentColor">Verify(K, m, t)</text>
<polyline points="160,80 472,80" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="478,80 471.1,84 471.1,76" fill="currentColor"/>
<text x="320" y="70" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">m, t</text>
<text x="320" y="104" font-size="13" text-anchor="middle" font-style="italic" fill="currentColor">the network: anyone may read or change it</text>
<rect x="255" y="120" width="130" height="36" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="320" y="142.9" font-size="14" text-anchor="middle" fill="currentColor">attacker</text>
<polyline points="320,120 320,94" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="320,88 324,94.9 316,94.9" class="acc-fill"/>
<text x="85" y="30" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">key K</text>
<text x="555" y="30" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">key K</text>
<text x="555" y="136" font-size="14" text-anchor="middle" fill="currentColor">valid / invalid</text>
</svg>
<figcaption>Figure 10.3. A MAC in use. Both ends share the key K. The message travels in the clear with its tag; any change to either makes Bob's check fail, unless the attacker can compute a tag without K.</figcaption>
</figure>

**What "secure" means.** Imagine the strongest reasonable attacker. They may ask
for tags on any messages they like, as many as they like, and see every answer.
They win if they then produce a valid tag for any message they did *not* ask
about. A MAC is secure if no efficient attacker wins with more than tiny
probability. The formal name is **existential unforgeability under chosen-message
attack** (EUF-CMA): "existential" because forging *any* message counts, even
gibberish, since the MAC cannot know what the application considers meaningful.

<figure class="mars-fig">
<svg viewBox="0 0 600 250" width="600" role="img" aria-label="The forgery game: the attacker asks a tagging oracle for tags on chosen messages, then must output a valid tag on a new message">
<rect x="10" y="30" width="170" height="150" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="110.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">attacker</text>
<rect x="420" y="30" width="170" height="150" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="102" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">tag oracle</text>
<text x="505" y="119" font-size="13" text-anchor="middle" fill="currentColor">holds K</text>
<polyline points="180,58 412,58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="418,58 411.1,62 411.1,54" fill="currentColor"/>
<text x="300" y="51" font-size="13" text-anchor="middle" fill="currentColor">m₁  (any message)</text>
<polyline points="418,72 188,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="182,72 188.9,68 188.9,76" fill="currentColor"/>
<text x="300" y="89" font-size="13" text-anchor="middle" fill="currentColor">t₁</text>
<polyline points="180,112 412,112" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="418,112 411.1,116 411.1,108" fill="currentColor"/>
<text x="300" y="105" font-size="13" text-anchor="middle" fill="currentColor">m₂  (any message)</text>
<polyline points="418,126 188,126" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="182,126 188.9,122 188.9,130" fill="currentColor"/>
<text x="300" y="143" font-size="13" text-anchor="middle" fill="currentColor">t₂</text>
<text x="300" y="170" font-size="13" text-anchor="middle" font-style="italic" fill="currentColor">… as many as they like</text>
<polyline points="95,180 95,204" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="95,210 91,203.1 99,203.1" class="acc-fill"/>
<text x="110" y="234" font-size="14" font-weight="bold" class="acc-fill">output (m*, t*): wins if m* was never asked and t* is valid</text>
</svg>
<figcaption>Figure 10.4. The EUF-CMA game. The attacker gets tags on any messages they choose, then wins by producing a valid tag on any message not asked, even gibberish. A MAC is secure if no efficient attacker wins with more than negligible probability.</figcaption>
</figure>

**Tag length is a hard limit.** With a $\tau$-bit tag, an attacker who simply
guesses succeeds with probability $2^{-\tau}$ per try. A 32-bit tag, as in 4G
and 5G radio, is forged once in about four billion attempts, which is fine only
when the protocol drops the connection long before that. For general use, tags
are 128 bits or more.

**What a MAC does not do.**

- **Replay.** A valid $(m, t)$ stays valid. Sending "pay Bob \$100" twice is
  not a forgery. Protocols add a sequence number or timestamp inside $m$.
- **Non-repudiation.** Both sides hold the key, so either could have made the
  tag. To convince a third party who wrote a message you need a digital
  signature ([Chapter 13](13-RSA.md)).

**Three wrong MACs.** It is worth seeing why the obvious ideas fail.

1. **A plain hash, $t = H(m)$.** There is no key: the attacker changes $m$ and
   computes the new hash themselves.
2. **Key first, $t = H(K \,\Vert\, m)$.** With SHA-256 or any Merkle-Damgård hash,
   this falls to length extension. [§9.7](09-Hash-Functions.md) did exactly this
   to forge `&role=admin`, and Flickr's API fell to it in 2009.
3. **Key last, $t = H(m \,\Vert\, K)$.** Length extension no longer works, but
   now any hash *collision* is a forgery: if $H(m) = H(m')$ with equal lengths,
   then the chaining values agree before the key goes in, so
   $H(m \,\Vert\, K) = H(m' \,\Vert\, K)$. A MAC built on MD5 this way died with MD5's
   collision resistance.

The fixes are the subject of the next three sections.

## 10.3 HMAC

*Level: intermediate.*

In the mid-1990s the IETF was building IPsec and needed a MAC. The candidates
on the table were the ad hoc ones of §10.2: a secret key in front of the
message, behind it, or on both sides. In 1996 Mihir Bellare, Ran Canetti and
Hugo Krawczyk, then at UC San Diego and IBM, published HMAC: a way to turn any
hash into a MAC, with a proof. Its selling point was practical as much as
theoretical: it calls an existing hash function unchanged, as a black box, so
every library that already had MD5 or SHA-1 could add HMAC in a few lines. It
became RFC 2104 (1997) and FIPS 198 (2002), and it is now the most widely used
MAC there is: in TLS, SSH, IPsec, JSON Web Tokens (`HS256`), webhook
signatures, the six-digit codes of authenticator apps (TOTP), and inside HKDF
and PBKDF2 ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

The idea: hash twice, with the key mixed in differently each time.

$$
\mathrm{HMAC}(K, m) = H\big( (K' \oplus \mathit{opad}) \,\Vert\, H( (K' \oplus \mathit{ipad}) \,\Vert\, m ) \big)
$$

- $K'$ is the key padded with zeros to the hash's block size (64 bytes for
  SHA-256), or, if the key is longer than a block, its hash, padded.
- $\mathit{ipad}$ is the byte `36` repeated, $\mathit{opad}$ the byte `5c` repeated. They
  make the inner and outer keys different.

<figure class="mars-fig">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="HMAC: the key XOR ipad is hashed with the message; the key XOR opad is hashed with that inner digest to give the tag">
<rect x="10" y="20" width="120" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="42.9" font-size="14" text-anchor="middle" fill="currentColor">K′ ⊕ ipad</text>
<rect x="140" y="20" width="150" height="36" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="42.9" font-size="14" text-anchor="middle" fill="currentColor">message m</text>
<polyline points="70,56 70,66 170,66 170,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="170,78 166,71.1 174,71.1" fill="currentColor"/>
<polyline points="215,56 215,66 170,66 170,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="170,78 166,71.1 174,71.1" fill="currentColor"/>
<rect x="130" y="78" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="103.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">H</text>
<polyline points="210,98 324,98" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="330,98 323.1,102 323.1,94" fill="currentColor"/>
<rect x="330" y="80" width="120" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="102.5" font-size="13" text-anchor="middle" fill="currentColor">inner digest</text>
<rect x="330" y="140" width="120" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="162.9" font-size="14" text-anchor="middle" fill="currentColor">K′ ⊕ opad</text>
<polyline points="450,98 480,98 480,128 504,128" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="510,128 503.1,132 503.1,124" class="acc-fill"/>
<polyline points="450,158 480,158 480,128 504,128" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="510,128 503.1,132 503.1,124" class="acc-fill"/>
<rect x="510" y="108" width="60" height="40" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="133.6" font-size="16" text-anchor="middle" font-weight="bold" fill="currentColor">H</text>
<polyline points="570,128 594,128" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="600,128 593.1,132 593.1,124" class="acc-fill"/>
<text x="628" y="133" font-size="15" text-anchor="middle" font-weight="bold" class="acc-fill">tag</text>
<text x="170" y="150" font-size="13" text-anchor="middle" fill="currentColor">inner hash: key first,</text>
<text x="170" y="166" font-size="13" text-anchor="middle" fill="currentColor">open to length extension</text>
<text x="540" y="182" font-size="13" text-anchor="middle" class="acc-fill">outer hash: hides the inner</text>
<text x="540" y="198" font-size="13" text-anchor="middle" class="acc-fill">state behind a second key</text>
</svg>
<figcaption>Figure 10.5. HMAC hashes twice. The inner hash alone would be the weak "key first" MAC; the outer hash takes its short, fixed-length digest and hashes it again under a second key, so an attacker who extends the inner hash cannot compute the outer one.</figcaption>
</figure>

The inner hash is the "key first" MAC from §10.2, which on its own is open to
length extension. The outer hash fixes that: it takes the inner digest as a
short, fixed-length message and hashes it under a second key. An attacker who
extends the inner hash gets a different inner digest, and has no way to compute
the outer hash of it.

**By hand: RFC 4231's test case 2.** Key "Jefe", message "what do ya want for
nothing?". "Jefe" is `4a 65 66 65`; padded to 64 bytes and XORed:

| Step | Value |
|---|---|
| Inner key $K' \oplus \mathit{ipad}$ | `7c535053 36363636 ... 36` (64 bytes) |
| Outer key $K' \oplus \mathit{opad}$ | `16393a39 5c5c5c5c ... 5c` |
| Inner hash: SHA-256(inner key, then message) | `a2e48586 3d27f9d8 64ac8d80 2432a1ed 477d8c4c 6f349d16 d4e7e917 c629cad7` |
| Tag: SHA-256(outer key, then inner hash) | `5bdcc146 bf60754e 6a042426 089575c7 5a003f08 9d273983 9dec58b9 64ec3843` |

Check the first bytes: $\mathtt{4a} \oplus \mathtt{36} = \mathtt{7c}$ and $\mathtt{4a} \oplus \mathtt{5c} = \mathtt{16}$.

**Code it.** HMAC is a few lines on top of a hash:

```python
import hashlib, hmac

def my_hmac(key, msg):
    if len(key) > 64:                    # SHA-256's block is 64 bytes
        key = hashlib.sha256(key).digest()
    key = key.ljust(64, b"\0")
    ipad = bytes(k ^ 0x36 for k in key)
    opad = bytes(k ^ 0x5c for k in key)
    inner = hashlib.sha256(ipad + msg).digest()
    return hashlib.sha256(opad + inner).digest()

tag = my_hmac(b"Jefe", b"what do ya want for nothing?")
print(tag.hex())
print(tag == hmac.new(b"Jefe", b"what do ya want for nothing?", hashlib.sha256).digest())
print(my_hmac(b"k" * 100, b"x") == hmac.new(b"k" * 100, b"x", hashlib.sha256).digest())
# 5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
# True
# True
```

**Why it is secure.** Bellare, Canetti and Krawczyk proved HMAC secure if the
hash's compression function, keyed through its chaining input, behaves like a
pseudorandom function. In 2006 Bellare proved it again under a weaker
assumption, one that does not need collision resistance at all. That is why the
collapse of MD5 and SHA-1 in [Chapter 9](09-Hash-Functions.md) never turned
into practical forgeries of HMAC-MD5 or HMAC-SHA-1. (Use HMAC-SHA-256 anyway;
there is no reason to build on a broken hash.)

**Verify in constant time.** The receiver compares the tag it computed with the
one it received. An ordinary `==` stops at the first byte that differs, so a
wrong first byte is rejected a little faster than a wrong tenth byte. An
attacker who can time thousands of attempts learns the correct tag one byte at
a time, in about $256 \times 16$ guesses (each timed many times) instead of
$2^{128}$. This broke the Xbox
360's boot check in 2007 and Google's Keyczar library in 2009. Python's
`hmac.compare_digest` takes the same time wherever the difference is; use it
for every tag comparison.

**Keys.** Use a random key at least as long as the hash output, 32 bytes for
HMAC-SHA-256. A password is not a key ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

!!! note "Life story: HMAC"
    **Born:** 1996, Bellare, Canetti and Krawczyk (CRYPTO '96); RFC 2104 (1997), FIPS 198 (2002) ·
    **Purpose:** a MAC from any hash function, with a proof, to replace the ad hoc secret-prefix
    and secret-suffix MACs · **Helped:** IPsec, TLS, SSH, JSON Web Tokens, authenticator-app codes,
    and the key derivation functions HKDF and PBKDF2 · **Status:** current. HMAC-MD5 and HMAC-SHA-1
    were never practically broken, but they are retired with their hashes; HMAC-SHA-256 is the
    default.

<figure class="play" data-play="hmactag"><span class="ai-tag">AI-created</span><figcaption>Try it: an HMAC-SHA-256 tag made in your browser with a made-up key. Change one letter and the whole tag changes.</figcaption></figure>

## 10.4 MACs from a block cipher: CBC-MAC and CMAC

*Level: intermediate.*

Smart cards, payment terminals and radio chips often have AES in hardware and
little room for anything else, so there is a long tradition of building MACs
from a block cipher. It began in banking: the US standards FIPS 113 (1985) and
ANSI X9.9 (1986) authenticated payment messages with DES in CBC mode.

**CBC-MAC.** Encrypt the message in CBC mode with a zero IV and keep only the
last block:

$$
C_0 = 0, \qquad C_i = E_K(C_{i-1} \oplus M_i), \qquad t = C_n.
$$

Bellare, Kilian and Rogaway proved in 1994 that this is secure **if every
message has the same length**. With mixed lengths it breaks with one tag. Let
$t$ be the tag of a one-block message $M$. Now ask the receiver to check the
two-block message $M \,\Vert\, (M \oplus t)$: the first block encrypts to $t$, the
second enters the cipher as $t \oplus M \oplus t = M$, which encrypts to $t$ again.
So the forged message has tag $t$, and nobody needed the key.

<figure class="mars-fig">
<svg viewBox="0 0 600 230" width="600" role="img" aria-label="CBC-MAC forgery: the two-block message M then M XOR t has the same tag t as the one-block message M">
<rect x="40" y="12" width="120" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="34.2" font-size="15" text-anchor="middle" fill="currentColor">M</text>
<rect x="330" y="12" width="140" height="34" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="34.2" font-size="15" text-anchor="middle" fill="currentColor">M ⊕ t</text>
<polyline points="100,46 100,64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="100,70 96,63.1 104,63.1" fill="currentColor"/>
<rect x="60" y="72" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="97.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">E_K</text>
<polyline points="140,92 224,92" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="230,92 223.1,96 223.1,88" fill="currentColor"/>
<text x="185" y="84" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">t</text>
<polyline points="230,92 384,92" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="390,92 383.1,96 383.1,88" fill="currentColor"/>
<circle cx="400" cy="92" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="391" y1="92" x2="409" y2="92" stroke="currentColor" stroke-width="1.5"/>
<line x1="400" y1="83" x2="400" y2="101" stroke="currentColor" stroke-width="1.5"/>
<polyline points="400,46 400,76" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="400,82 396,75.1 404,75.1" class="acc-fill"/>
<polyline points="400,101 400,134" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="400,140 396,133.1 404,133.1" fill="currentColor"/>
<text x="470" y="126" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">(M ⊕ t) ⊕ t = M</text>
<rect x="360" y="142" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="167.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">E_K</text>
<polyline points="440,162 514,162" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="520,162 513.1,166 513.1,158" class="acc-fill"/>
<text x="550" y="167" font-size="17" text-anchor="middle" font-weight="bold" class="acc-fill">t</text>
<text x="100" y="150" font-size="14" text-anchor="middle" fill="currentColor">block 1 gives t</text>
<text x="300" y="214" font-size="14" text-anchor="middle" fill="currentColor">block 2 enters the cipher as M again, so the tag is t again</text>
</svg>
<figcaption>Figure 10.6. Forging plain CBC-MAC with one tag. After the first block the chaining value is t, and the attacker's second block M ⊕ t cancels it, so the cipher sees M a second time and outputs t again.</figcaption>
</figure>

**CMAC.** The fix is to treat the last block specially, with a secret mask the
attacker cannot predict. John Black and Phillip Rogaway's XCBC (2000) did it
with three keys; Tetsu Iwata and Kaoru Kurosawa at Ibaraki University in Japan
cut it to one key with OMAC (2003), which NIST adopted as **CMAC** in SP 800-38B
(2005). From the one key, compute $L = E_K(0^{128})$ and two subkeys:

$$
K_1 = L \cdot x, \qquad K_2 = L \cdot x^2 \qquad \text{in } \mathrm{GF}(2^{128}),
$$

where "multiply by $x$" means shift left one bit and, if a 1 fell off the top,
XOR `87` into the last byte. This is the same kind of field arithmetic as
[AES's $\mathrm{GF}(2^8)$](07-AES.md), with 128-bit elements and the polynomial
$x^{128} + x^7 + x^2 + x + 1$. If the last block is full, XOR in $K_1$; if not, pad
it with `80 00 ...` and XOR in $K_2$. Then finish the CBC chain. The masked last
block no longer equals the chaining value a longer message would continue from,
so the splice above fails.

<figure class="mars-fig">
<svg viewBox="0 0 640 190" width="640" role="img" aria-label="CMAC: a CBC chain where the last block is XORed with subkey K1, or padded and XORed with K2, before the final encryption">
<rect x="40" y="10" width="110" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="30.9" font-size="14" text-anchor="middle" fill="currentColor">M₁</text>
<polyline points="95,42 95,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="95,92 91,85.1 99,85.1" fill="currentColor"/>
<polyline points="95,92 95,122" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="95,128 91,121.1 99,121.1" fill="currentColor"/>
<rect x="55" y="128" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="153.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">E_K</text>
<rect x="220" y="10" width="110" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="275" y="30.9" font-size="14" text-anchor="middle" fill="currentColor">M₂</text>
<polyline points="275,42 275,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="275,92 271,85.1 279,85.1" fill="currentColor"/>
<circle cx="275" cy="101" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="266" y1="101" x2="284" y2="101" stroke="currentColor" stroke-width="1.5"/>
<line x1="275" y1="92" x2="275" y2="110" stroke="currentColor" stroke-width="1.5"/>
<polyline points="135,155 200,155 200,101 260,101" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="266,101 259.1,105 259.1,97" fill="currentColor"/>
<polyline points="275,110 275,122" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="275,128 271,121.1 279,121.1" fill="currentColor"/>
<rect x="235" y="128" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="275" y="153.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">E_K</text>
<rect x="420" y="10" width="110" height="32" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="475" y="30.9" font-size="14" text-anchor="middle" fill="currentColor">M₃ (last)</text>
<polyline points="475,42 475,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="475,58 471,51.1 479,51.1" fill="currentColor"/>
<circle cx="475" cy="68" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="466" y1="68" x2="484" y2="68" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="475" y1="59" x2="475" y2="77" stroke="currentColor" class="acc" stroke-width="1.5"/>
<polyline points="475,77 475,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="475,92 471,85.1 479,85.1" fill="currentColor"/>
<circle cx="475" cy="101" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="466" y1="101" x2="484" y2="101" stroke="currentColor" stroke-width="1.5"/>
<line x1="475" y1="92" x2="475" y2="110" stroke="currentColor" stroke-width="1.5"/>
<polyline points="315,155 400,155 400,101 460,101" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="466,101 459.1,105 459.1,97" fill="currentColor"/>
<polyline points="475,110 475,122" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="475,128 471,121.1 479,121.1" fill="currentColor"/>
<rect x="435" y="128" width="80" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="475" y="153.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">E_K</text>
<text x="600" y="68" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">K₁ or K₂</text>
<polyline points="520,68 492,68" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="486,68 492.9,64 492.9,72" class="acc-fill"/>
<polyline points="515,148 594,148" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="600,148 593.1,152 593.1,144" class="acc-fill"/>
<text x="620" y="153" font-size="17" text-anchor="middle" font-weight="bold" class="acc-fill">t</text>
</svg>
<figcaption>Figure 10.7. CMAC is CBC-MAC with a secret mask on the last block: K₁ if the block is full, K₂ if it had to be padded. Both come from L = E_K(0). The mask means the final chaining value is never one an attacker can continue from.</figcaption>
</figure>

The code uses real AES from the `cryptography` package and checks two of RFC
4493's test vectors, then tries the splice on both MACs:

```python
# pip install cryptography
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def E(k, block):                         # one AES block encryption
    enc = Cipher(algorithms.AES(k), modes.ECB()).encryptor()
    return enc.update(block) + enc.finalize()

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def cbc_mac(k, m):                       # raw CBC-MAC over whole 16-byte blocks
    t = bytes(16)
    for i in range(0, len(m), 16):
        t = E(k, xor(t, m[i:i + 16]))
    return t

def dbl(b):                              # multiply by x in GF(2^128)
    n = int.from_bytes(b, "big") << 1
    if n >> 128:
        n ^= (1 << 128) | 0x87
    return n.to_bytes(16, "big")

def cmac(k, m):                          # RFC 4493
    k1 = dbl(E(k, bytes(16)))
    k2 = dbl(k1)
    if m and len(m) % 16 == 0:
        head, last = m[:-16], xor(m[-16:], k1)
    else:
        r = len(m) % 16
        head, last = m[:len(m) - r], xor(m[len(m) - r:] + b"\x80" + bytes(15 - r), k2)
    return E(k, xor(cbc_mac(k, head), last))

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
print(cmac(key, b"").hex())                                          # RFC 4493 example 1
print(cmac(key, bytes.fromhex("6bc1bee22e409f96e93d7e117393172a")).hex())   # example 2

m = b"pay Bob $100.00!"                  # one block, tagged by the bank
t = cbc_mac(key, m)
print(cbc_mac(key, m + xor(m, t)) == t)  # True: a two-block forgery
t = cmac(key, m)
print(cmac(key, m + xor(m, t)) == t)     # False
```

```
bb1d6929e95937287fa37d129b756746
070a16b46b4d4144f79bdd9dd04a287c
True
False
```

**Where CMAC runs.** The 4G and 5G integrity algorithms 128-EIA2 and 128-NIA2
are AES-CMAC with a 32-bit tag. Smart-card secure channels (GlobalPlatform
SCP03), payment key blocks (ANSI X9.143) and IPsec (RFC 4494) use it too. A 128-bit
block cipher limits it: after about $2^{64}$ blocks, internal collisions appear,
so SP 800-38B advises at most $2^{48}$ messages per key. For anything that is not
tied to AES hardware, HMAC-SHA-256 has no such limit.

Full details: [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md).

!!! note "Life story: CBC-MAC and CMAC"
    **Born:** CBC-MAC in 1980s banking (FIPS 113, 1985; ANSI X9.9, 1986); XCBC (Black and Rogaway,
    2000), OMAC (Iwata and Kurosawa, 2003), standardized by NIST as CMAC in SP 800-38B (2005) ·
    **Purpose:** authenticate messages with nothing but a block cipher, first DES in bank
    hardware, then AES in chips · **Helped:** payment messages, smart cards, 4G and 5G radio
    integrity, IPsec · **Retired:** plain CBC-MAC as a general MAC, because mixed message lengths
    allow the splice forgery above · **Replaced by:** CMAC, which is current.

## 10.5 Universal hashing: Wegman-Carter and Poly1305

*Level: intermediate.*

HMAC and CMAC run a full hash or cipher on every block. In 1981 Wegman and
Carter showed that much less is needed. Take a family of simple keyed functions
$h_r$ where two different messages rarely collide (a **universal hash**), and
hide its output with a one-time pad $s$:

$$
t = h_r(m) + s.
$$

If $r$ and $s$ are random and used for **one** message, then even an attacker
with unlimited computing power cannot forge with better odds than the
collision probability of the family. Security comes from counting, not from
assuming that some cipher is hard to break.

**A polynomial hash, by hand.** Work mod the prime $p = 101$. Split the message
into numbers below $p$, say $m = (3, 1, 4)$, and evaluate it as a polynomial at
the secret point $r$:

$$
h_r(m) = 3r^3 + 1 \cdot r^2 + 4r \bmod 101.
$$

With $r = 10$ and $s = 57$: $3000 + 100 + 40 = 3140$, and $3140 = 31 \times 101 + 9$, so
$h = 9$ and the tag is $t = 9 + 57 = 66$.

*Why a forger fails.* Suppose the attacker sees $(m, 66)$ and wants a valid tag
$t'$ for some other $m'$. The difference $h_r(m) - h_r(m')$ is a nonzero polynomial in
$r$ of degree at most 3, so it has at most 3 roots mod 101. Since $s$ hides
$h_r(m)$ completely, every value of $r$ is still equally likely after seeing one
tag, and the attacker's best guess is right for at most 3 of the 101. Their
chance is at most $3/101$, and checking all $101 \times 101$ keys confirms that the
best possible forgery succeeds with probability exactly $3/101$. With $p$ near
$2^{130}$ instead of 101, that becomes negligible.

*Why one key, one message.* Now the sender makes a mistake and tags a second
message $m_2 = (2, 7, 1)$ with the same $r$ and $s$: $h = 2000 + 700 + 10 = 2710 \equiv 84$,
tag $84 + 57 = 141 \equiv 40$. Subtracting the tags removes $s$:

$$
66 - 40 \equiv (3-2)r^3 + (1-7)r^2 + (4-1)r \pmod{101}, \quad\text{that is}\quad r^3 - 6r^2 + 3r \equiv 26.
$$

Trying all 101 values gives one solution, $r = 10$, and then $s = 66 - 9 = 57$. The
attacker has the whole key and can tag anything. Reusing the pad of a
Wegman-Carter MAC is as fatal as reusing a one-time pad.

<figure class="mars-fig">
<svg viewBox="0 0 620 268" width="620" role="img" aria-label="Scatter plot of r cubed minus 6 r squared plus 3 r minus 26 mod 101 for r from 0 to 100; the only zero is at r = 10">
<line x1="50" y1="215" x2="600" y2="215" stroke="currentColor" stroke-width="1.5"/>
<line x1="50" y1="15" x2="50" y2="215" stroke="currentColor" stroke-width="1.5"/>
<line x1="50" y1="215" x2="50" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="50" y="235" font-size="13" text-anchor="middle" fill="currentColor">0</text>
<line x1="45" y1="215" x2="50" y2="215" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="220" font-size="13" text-anchor="end" fill="currentColor">0</text>
<line x1="160" y1="215" x2="160" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="235" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<line x1="45" y1="175" x2="50" y2="175" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="180" font-size="13" text-anchor="end" fill="currentColor">20</text>
<line x1="270" y1="215" x2="270" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="235" font-size="13" text-anchor="middle" fill="currentColor">40</text>
<line x1="45" y1="135" x2="50" y2="135" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="140" font-size="13" text-anchor="end" fill="currentColor">40</text>
<line x1="380" y1="215" x2="380" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="380" y="235" font-size="13" text-anchor="middle" fill="currentColor">60</text>
<line x1="45" y1="95" x2="50" y2="95" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="100" font-size="13" text-anchor="end" fill="currentColor">60</text>
<line x1="490" y1="215" x2="490" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="235" font-size="13" text-anchor="middle" fill="currentColor">80</text>
<line x1="45" y1="55" x2="50" y2="55" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="60" font-size="13" text-anchor="end" fill="currentColor">80</text>
<line x1="600" y1="215" x2="600" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="600" y="235" font-size="13" text-anchor="middle" fill="currentColor">100</text>
<line x1="45" y1="15" x2="50" y2="15" stroke="currentColor" stroke-width="1.5"/>
<text x="42" y="20" font-size="13" text-anchor="end" fill="currentColor">100</text>
<circle cx="50" cy="65" r="2.6" fill="currentColor"/>
<circle cx="55.5" cy="69" r="2.6" fill="currentColor"/>
<circle cx="61" cy="85" r="2.6" fill="currentColor"/>
<circle cx="66.5" cy="101" r="2.6" fill="currentColor"/>
<circle cx="72" cy="105" r="2.6" fill="currentColor"/>
<circle cx="77.5" cy="85" r="2.6" fill="currentColor"/>
<circle cx="83" cy="29" r="2.6" fill="currentColor"/>
<circle cx="88.5" cy="127" r="2.6" fill="currentColor"/>
<circle cx="94" cy="165" r="2.6" fill="currentColor"/>
<circle cx="99.5" cy="131" r="2.6" fill="currentColor"/>
<circle cx="110.5" cy="203" r="2.6" fill="currentColor"/>
<circle cx="116" cy="83" r="2.6" fill="currentColor"/>
<circle cx="121.5" cy="45" r="2.6" fill="currentColor"/>
<circle cx="127" cy="77" r="2.6" fill="currentColor"/>
<circle cx="132.5" cy="167" r="2.6" fill="currentColor"/>
<circle cx="138" cy="101" r="2.6" fill="currentColor"/>
<circle cx="143.5" cy="69" r="2.6" fill="currentColor"/>
<circle cx="149" cy="59" r="2.6" fill="currentColor"/>
<circle cx="154.5" cy="59" r="2.6" fill="currentColor"/>
<circle cx="160" cy="57" r="2.6" fill="currentColor"/>
<circle cx="165.5" cy="41" r="2.6" fill="currentColor"/>
<circle cx="171" cy="201" r="2.6" fill="currentColor"/>
<circle cx="176.5" cy="121" r="2.6" fill="currentColor"/>
<circle cx="182" cy="193" r="2.6" fill="currentColor"/>
<circle cx="187.5" cy="203" r="2.6" fill="currentColor"/>
<circle cx="193" cy="139" r="2.6" fill="currentColor"/>
<circle cx="198.5" cy="191" r="2.6" fill="currentColor"/>
<circle cx="204" cy="145" r="2.6" fill="currentColor"/>
<circle cx="209.5" cy="191" r="2.6" fill="currentColor"/>
<circle cx="215" cy="115" r="2.6" fill="currentColor"/>
<circle cx="220.5" cy="107" r="2.6" fill="currentColor"/>
<circle cx="226" cy="155" r="2.6" fill="currentColor"/>
<circle cx="231.5" cy="45" r="2.6" fill="currentColor"/>
<circle cx="237" cy="169" r="2.6" fill="currentColor"/>
<circle cx="242.5" cy="111" r="2.6" fill="currentColor"/>
<circle cx="248" cy="61" r="2.6" fill="currentColor"/>
<circle cx="253.5" cy="209" r="2.6" fill="currentColor"/>
<circle cx="259" cy="139" r="2.6" fill="currentColor"/>
<circle cx="264.5" cy="41" r="2.6" fill="currentColor"/>
<circle cx="270" cy="105" r="2.6" fill="currentColor"/>
<circle cx="275.5" cy="117" r="2.6" fill="currentColor"/>
<circle cx="281" cy="65" r="2.6" fill="currentColor"/>
<circle cx="286.5" cy="139" r="2.6" fill="currentColor"/>
<circle cx="292" cy="125" r="2.6" fill="currentColor"/>
<circle cx="297.5" cy="213" r="2.6" fill="currentColor"/>
<circle cx="303" cy="189" r="2.6" fill="currentColor"/>
<circle cx="308.5" cy="41" r="2.6" fill="currentColor"/>
<circle cx="314" cy="161" r="2.6" fill="currentColor"/>
<circle cx="319.5" cy="133" r="2.6" fill="currentColor"/>
<circle cx="325" cy="147" r="2.6" fill="currentColor"/>
<circle cx="330.5" cy="191" r="2.6" fill="currentColor"/>
<circle cx="336" cy="51" r="2.6" fill="currentColor"/>
<circle cx="341.5" cy="119" r="2.6" fill="currentColor"/>
<circle cx="347" cy="181" r="2.6" fill="currentColor"/>
<circle cx="352.5" cy="23" r="2.6" fill="currentColor"/>
<circle cx="358" cy="37" r="2.6" fill="currentColor"/>
<circle cx="363.5" cy="211" r="2.6" fill="currentColor"/>
<circle cx="369" cy="129" r="2.6" fill="currentColor"/>
<circle cx="374.5" cy="183" r="2.6" fill="currentColor"/>
<circle cx="380" cy="159" r="2.6" fill="currentColor"/>
<circle cx="385.5" cy="45" r="2.6" fill="currentColor"/>
<circle cx="391" cy="31" r="2.6" fill="currentColor"/>
<circle cx="396.5" cy="105" r="2.6" fill="currentColor"/>
<circle cx="402" cy="53" r="2.6" fill="currentColor"/>
<circle cx="407.5" cy="65" r="2.6" fill="currentColor"/>
<circle cx="413" cy="129" r="2.6" fill="currentColor"/>
<circle cx="418.5" cy="31" r="2.6" fill="currentColor"/>
<circle cx="424" cy="163" r="2.6" fill="currentColor"/>
<circle cx="429.5" cy="109" r="2.6" fill="currentColor"/>
<circle cx="435" cy="59" r="2.6" fill="currentColor"/>
<circle cx="440.5" cy="203" r="2.6" fill="currentColor"/>
<circle cx="446" cy="125" r="2.6" fill="currentColor"/>
<circle cx="451.5" cy="15" r="2.6" fill="currentColor"/>
<circle cx="457" cy="63" r="2.6" fill="currentColor"/>
<circle cx="462.5" cy="55" r="2.6" fill="currentColor"/>
<circle cx="468" cy="181" r="2.6" fill="currentColor"/>
<circle cx="473.5" cy="25" r="2.6" fill="currentColor"/>
<circle cx="479" cy="181" r="2.6" fill="currentColor"/>
<circle cx="484.5" cy="31" r="2.6" fill="currentColor"/>
<circle cx="490" cy="169" r="2.6" fill="currentColor"/>
<circle cx="495.5" cy="179" r="2.6" fill="currentColor"/>
<circle cx="501" cy="49" r="2.6" fill="currentColor"/>
<circle cx="506.5" cy="171" r="2.6" fill="currentColor"/>
<circle cx="512" cy="129" r="2.6" fill="currentColor"/>
<circle cx="517.5" cy="113" r="2.6" fill="currentColor"/>
<circle cx="523" cy="111" r="2.6" fill="currentColor"/>
<circle cx="528.5" cy="111" r="2.6" fill="currentColor"/>
<circle cx="534" cy="101" r="2.6" fill="currentColor"/>
<circle cx="539.5" cy="69" r="2.6" fill="currentColor"/>
<circle cx="545" cy="205" r="2.6" fill="currentColor"/>
<circle cx="550.5" cy="93" r="2.6" fill="currentColor"/>
<circle cx="556" cy="125" r="2.6" fill="currentColor"/>
<circle cx="561.5" cy="87" r="2.6" fill="currentColor"/>
<circle cx="567" cy="169" r="2.6" fill="currentColor"/>
<circle cx="572.5" cy="157" r="2.6" fill="currentColor"/>
<circle cx="578" cy="39" r="2.6" fill="currentColor"/>
<circle cx="583.5" cy="207" r="2.6" fill="currentColor"/>
<circle cx="589" cy="43" r="2.6" fill="currentColor"/>
<circle cx="594.5" cy="141" r="2.6" fill="currentColor"/>
<circle cx="600" cy="85" r="2.6" fill="currentColor"/>
<circle cx="105" cy="215" r="6" class="acc-fill"/>
<text x="97" y="259" font-size="14" font-weight="bold" class="acc-fill">▲ r = 10: the only root</text>
<text x="540" y="259" font-size="13" text-anchor="middle" fill="currentColor">candidate r</text>
</svg>
<figcaption>Figure 10.8. The attacker's equation r³ − 6r² + 3r ≡ 26 (mod 101), written as r³ − 6r² + 3r − 26 mod 101 for every candidate r. The values look random, and exactly one candidate gives zero: the secret r = 10.</figcaption>
</figure>

**Poly1305.** Daniel J. Bernstein, a mathematician then at the University of
Illinois at Chicago, was already known for suing the US government in the 1990s
over export rules on cryptographic software (Bernstein v. United States), and
for writing small, fast, carefully engineered programs. His Poly1305 (2005) is
this idea at full size.
The prime is $p = 2^{130} - 5$, chosen so reduction is a shift and a multiply by 5.
The 32-byte one-time key is $(r, s)$, with 22 bits of $r$ forced to zero
("clamped") so the arithmetic fits fast 64-bit multiplies. Each 16-byte block,
with a `01` byte appended so that trailing zeros still count, becomes a number
$c_i$, and

$$
t = \big( (c_1 r^q + c_2 r^{q-1} + \cdots + c_q r) \bmod p + s \big) \bmod 2^{128}.
$$

A forgery attempt on a message of $L$ bytes succeeds with probability at most
about $8\lceil L/16 \rceil / 2^{106}$, which for ordinary messages is around $2^{-100}$. In
ChaCha20-Poly1305 the one-time key comes from the cipher: block 0 of ChaCha20's
keystream for each nonce. So "one key, one message" becomes "one nonce, one
message".

The first part of this program checks RFC 8439's test vector; the second makes
the mistake above at full size and recovers $(r, s)$ from two tags:

```python
import os

P = (1 << 130) - 5
CLAMP = 0x0ffffffc0ffffffc0ffffffc0fffffff

def poly1305(key, msg):                       # RFC 8439, Section 2.5.1
    r = int.from_bytes(key[:16], "little") & CLAMP
    s = int.from_bytes(key[16:], "little")
    a = 0
    for i in range(0, len(msg), 16):
        a = (a + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % P
    return ((a + s) % (1 << 128)).to_bytes(16, "little")

key = bytes.fromhex("85d6be7857556d337f4452fe42d506a8"
                    "0103808afb0db2fd4abff6af4149f51b")
print(poly1305(key, b"Cryptographic Forum Research Group").hex())

key = os.urandom(32)                          # the mistake: one key, two messages
m1, m2 = b"pay Bob $100.00!", b"pay Eve $100.00!"
t1 = int.from_bytes(poly1305(key, m1), "little")
t2 = int.from_bytes(poly1305(key, m2), "little")
c1 = int.from_bytes(m1 + b"\x01", "little")
c2 = int.from_bytes(m2 + b"\x01", "little")
for j in range(-5, 6):                        # the tag dropped the top bits of the sum
    r = (t1 - t2 + (j << 128)) * pow(c1 - c2, -1, P) % P
    if r & CLAMP == r:
        s = (t1 - c1 * r % P) % (1 << 128)
        fake = r.to_bytes(16, "little") + s.to_bytes(16, "little")
        m3 = b"pay Eve $999.00!"
        print(poly1305(fake, m3) == poly1305(key, m3))
        break
# a8061dc1305136c6c22b8baf0c0127a9
# True
```

For one-block messages the two tags differ by $(c_1 - c_2) \cdot r \bmod p$, give or
take a multiple of $2^{128}$ lost in the last step, so a division and a few tries
give $r$, then $s$. This code is not constant-time, and RFC 8439 warns that
general big-number code leaks timing; it is for learning.

**GHASH**, inside AES-GCM, is the same idea in $\mathrm{GF}(2^{128})$, where adding is XOR.
**UMAC** (Black, Halevi, Krawczyk, Krovetz and Rogaway, 1999; RFC 4418) uses an
even faster hash called NH, and is one of OpenSSH's default MACs.

Full details: [Universal hash MACs](../06-mac/Universal-Hash-MACs.md).

!!! note "Life story: Wegman-Carter MACs and Poly1305"
    **Born:** 1981, Mark Wegman and Larry Carter at IBM (universal hashing for authentication);
    Poly1305 by Bernstein in 2005 · **Purpose:** MACs whose security is proved by counting, at the
    cost of about one multiplication per block · **Helped:** Poly1305 inside ChaCha20-Poly1305 (TLS,
    WireGuard, SSH), GHASH inside AES-GCM, UMAC in OpenSSH · **Status:** current, with one hard rule:
    the one-time key must never be used for a second message.

## 10.6 More MACs: KMAC, keyed BLAKE2 and SipHash

*Level: intermediate.*

**KMAC.** HMAC's double hashing exists only because Merkle-Damgård hashes leak
their state. A sponge does not ([§9.9](09-Hash-Functions.md)), so for SHA-3 the
naive "key first" MAC is already safe. NIST's KMAC (SP 800-185, 2016) is that
idea, done carefully: cSHAKE with the key encoded and padded into its own block,
then the message, then the requested output length, so that every input is
separated unambiguously and a 32-byte tag is not a prefix of a 64-byte one. It
comes as KMAC128 and KMAC256 and also serves as a NIST key derivation function.
Python's `hashlib` has SHAKE but not cSHAKE, so there is no stdlib example; see
the [KMAC reference](../06-mac/KMAC.md).

**Keyed BLAKE2.** BLAKE2 takes a key as a parameter and RFC 7693 says no HMAC
wrapper is needed: `hashlib.blake2b(msg, key=k)` is a MAC. WireGuard uses keyed
BLAKE2s as its MAC.

**SipHash and hash flooding.** A hash table puts each entry in a bucket chosen
by a hash of its key. If an attacker can choose many keys that land in the same
bucket, every lookup turns into a long list search, and inserting $n$ keys costs
about $n^2$ steps. Scott Crosby and Dan Wallach described this in 2003. In
December 2011 Alexander Klink and Julian Wälde showed at the 28C3 conference in
Berlin that it still worked against PHP, Java, ASP.NET, Python and Ruby web
servers: one crafted form submission of a few hundred kilobytes could keep a
server busy for a minute. Seeded versions of the old fast hashes turned out not
to help, because their collisions did not depend on the seed.

The real fix is a keyed function that is a MAC, small enough for hash tables.
Jean-Philippe Aumasson and Daniel J. Bernstein designed **SipHash** in 2012: a
128-bit key, a 64-bit output, and rounds of add, rotate and XOR on four 64-bit
words. Python (since 3.4), Rust, Ruby, Perl and the Linux kernel use it, each
with a random key per process. The program below is SipHash-2-4 straight from
the paper; it prints the paper's test value.

```python
M = (1 << 64) - 1

def rotl(x, b):
    return (x << b | x >> (64 - b)) & M

def siphash(key, msg, c=2, d=4):
    k0 = int.from_bytes(key[:8], "little")
    k1 = int.from_bytes(key[8:], "little")
    v = [k0 ^ 0x736f6d6570736575, k1 ^ 0x646f72616e646f6d,
         k0 ^ 0x6c7967656e657261, k1 ^ 0x7465646279746573]

    def sipround():
        v[0] = (v[0] + v[1]) & M; v[1] = rotl(v[1], 13) ^ v[0]; v[0] = rotl(v[0], 32)
        v[2] = (v[2] + v[3]) & M; v[3] = rotl(v[3], 16) ^ v[2]
        v[0] = (v[0] + v[3]) & M; v[3] = rotl(v[3], 21) ^ v[0]
        v[2] = (v[2] + v[1]) & M; v[1] = rotl(v[1], 17) ^ v[2]; v[2] = rotl(v[2], 32)

    msg += bytes(7 - len(msg) % 8) + bytes([len(msg) % 256])
    for i in range(0, len(msg), 8):
        m = int.from_bytes(msg[i:i + 8], "little")
        v[3] ^= m
        for _ in range(c):
            sipround()
        v[0] ^= m
    v[2] ^= 0xff
    for _ in range(d):
        sipround()
    return v[0] ^ v[1] ^ v[2] ^ v[3]

print(format(siphash(bytes(range(16)), bytes(range(15))), "016x"))
# a129ca6149be45e5
```

The constants are the ASCII text "somepseudorandomlygeneratedbytes". A 64-bit
tag is too short for a general-purpose MAC; SipHash is for hash tables and
other short-lived checks.

!!! note "Life story: SipHash"
    **Born:** 2012, Jean-Philippe Aumasson and Daniel J. Bernstein, months after the 28C3 hash-flooding
    talk · **Purpose:** a keyed hash fast enough for hash tables and strong enough that an attacker
    cannot pick colliding keys · **Helped:** made hash tables in Python (3.4 on), Rust, Ruby, Perl
    and the Linux kernel safe against flooding · **Status:** current, for hash tables and short
    checks; its 64-bit tag is too short for a general MAC.

## 10.7 Putting encryption and a MAC together

*Level: intermediate.*

Now combine a cipher with a MAC to get both secrecy and integrity. There are
three ways to order them, and in the 1990s each major protocol picked a
different one:

| Order | What is sent | Used by |
|---|---|---|
| **Encrypt-and-MAC** | $E(m)$ and $\mathrm{MAC}(m)$ | SSH |
| **MAC-then-encrypt** | $E(m \,\Vert\, \mathrm{MAC}(m))$ | SSL and TLS up to 1.2 |
| **Encrypt-then-MAC** | $c = E(m)$ and $\mathrm{MAC}(c)$ | IPsec ESP |

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three ways to combine encryption and a MAC: encrypt-and-MAC, MAC-then-encrypt, and encrypt-then-MAC">
<text x="10" y="38" font-size="15" font-weight="bold" fill="currentColor">Encrypt-and-MAC</text>
<text x="10" y="58" font-size="13" fill="currentColor">SSH</text>
<text x="10" y="76" font-size="13" font-style="italic" fill="currentColor">leaks, or fragile</text>
<rect x="200" y="18" width="40" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="37.9" font-size="14" text-anchor="middle" fill="currentColor">m</text>
<polyline points="240,33 264,33" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="270,33 263.1,37 263.1,29" fill="currentColor"/>
<rect x="270" y="18" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="37.9" font-size="14" text-anchor="middle" fill="currentColor">Enc</text>
<polyline points="330,33 354,33" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="360,33 353.1,37 353.1,29" fill="currentColor"/>
<rect x="360" y="18" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="37.9" font-size="14" text-anchor="middle" fill="currentColor">c</text>
<polyline points="220,48 220,68 264,68" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="270,68 263.1,72 263.1,64" fill="currentColor"/>
<rect x="270" y="54" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="73.9" font-size="14" text-anchor="middle" fill="currentColor">MAC</text>
<polyline points="330,69 354,69" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="360,69 353.1,73 353.1,65" fill="currentColor"/>
<rect x="360" y="54" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="73.9" font-size="14" text-anchor="middle" fill="currentColor">t</text>
<text x="440" y="54" font-size="14" fill="currentColor">send c, t</text>
<text x="440" y="74" font-size="13" font-style="italic" fill="currentColor">t is a tag of the plaintext</text>
<text x="10" y="134" font-size="15" font-weight="bold" fill="currentColor">MAC-then-encrypt</text>
<text x="10" y="154" font-size="13" fill="currentColor">SSL, TLS ≤ 1.2</text>
<text x="10" y="172" font-size="13" font-style="italic" fill="currentColor">leaks, or fragile</text>
<rect x="200" y="130" width="40" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">m</text>
<polyline points="240,145 254,145" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="260,145 253.1,149 253.1,141" fill="currentColor"/>
<rect x="260" y="130" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">MAC</text>
<polyline points="320,145 334,145" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="340,145 333.1,149 333.1,141" fill="currentColor"/>
<rect x="340" y="130" width="64" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="372" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">m ‖ t</text>
<polyline points="404,145 418,145" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="424,145 417.1,149 417.1,141" fill="currentColor"/>
<rect x="424" y="130" width="50" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="449" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">Enc</text>
<polyline points="474,145 488,145" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="494,145 487.1,149 487.1,141" fill="currentColor"/>
<rect x="494" y="130" width="40" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="514" y="149.9" font-size="14" text-anchor="middle" fill="currentColor">c</text>
<text x="440" y="182" font-size="13" text-anchor="middle" font-style="italic" fill="currentColor">receiver must decrypt before checking</text>
<text x="10" y="230" font-size="15" font-weight="bold" class="acc-fill">Encrypt-then-MAC</text>
<text x="10" y="250" font-size="13" fill="currentColor">IPsec ESP</text>
<text x="10" y="268" font-size="13" class="acc-fill">secure in general</text>
<rect x="200" y="226" width="40" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">m</text>
<polyline points="240,241 254,241" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="260,241 253.1,245 253.1,237" fill="currentColor"/>
<rect x="260" y="226" width="50" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="285" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">Enc</text>
<polyline points="310,241 324,241" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="330,241 323.1,245 323.1,237" fill="currentColor"/>
<rect x="330" y="226" width="40" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">c</text>
<polyline points="370,241 384,241" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="390,241 383.1,245 383.1,237" class="acc-fill"/>
<rect x="390" y="226" width="60" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">MAC</text>
<polyline points="450,241 464,241" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="470,241 463.1,245 463.1,237" class="acc-fill"/>
<rect x="470" y="226" width="40" height="30" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="245.9" font-size="14" text-anchor="middle" fill="currentColor">t</text>
<text x="520" y="246" font-size="14" fill="currentColor">send c, t</text>
<text x="420" y="278" font-size="13" text-anchor="middle" class="acc-fill">receiver checks t first, then decrypts</text>
</svg>
<figcaption>Figure 10.9. The three orders. Only encrypt-then-MAC (accent) is secure for every secure cipher and MAC: the tag covers exactly what travels, and a forged ciphertext is thrown away before any decryption code touches it.</figcaption>
</figure>

In 2000 Mihir Bellare and Chanathip Namprempre analyzed all three, and in 2001
Hugo Krawczyk asked directly "how secure is SSL?". The answer: only
**encrypt-then-MAC** is secure in general, for any secure cipher and any secure
MAC. Encrypt-and-MAC puts a tag of the *plaintext* in the open; a deterministic
MAC then shows when two messages are equal. MAC-then-encrypt makes the receiver
decrypt *before* it can check anything, so the decryption code handles data the
attacker chose, and any difference in how it fails becomes a leak.

That leak was found, again and again, in TLS:

- **Padding oracles (2002).** Serge Vaudenay showed that if a server using CBC
  ([Chapter 8](08-Modes-of-Operation.md)) reveals whether the *padding* of a
  tampered ciphertext was valid, an attacker can decrypt any block with about
  128 queries per byte. In MAC-then-encrypt the padding is checked before the
  MAC, so the server had to answer that question somehow.
- **Lucky Thirteen (2013).** Nadhem AlFardan and Kenny Paterson at Royal
  Holloway, London, measured that TLS servers took slightly longer to reject a
  record when the padding was valid, because they then computed a longer MAC.
  The timing difference was enough to recover plaintext.
- **POODLE (2014).** Bodo Möller, Thai Duong and Krzysztof Kotowicz at Google
  found that SSL 3.0's padding was not checked at all beyond its last byte,
  making the oracle easy. SSL 3.0 was retired soon after (RFC 7568).

The lesson is the same every time:
**check the tag first, on the ciphertext, and decrypt only if it is valid.**
RFC 7366 (2014) let TLS switch to encrypt-then-MAC, and TLS 1.3 removed the
question by allowing only AEAD ciphers (§10.8).

!!! note "Life story: padding-oracle attacks"
    **Born:** 2002, Serge Vaudenay at EPFL in Lausanne, Switzerland · **What it breaks:** CBC
    encryption whose receiver reveals, by an error message or by timing, whether a tampered
    ciphertext had valid padding · **Famous uses:** Juliano Rizzo and Thai Duong's attack on
    ASP.NET (2010), Lucky Thirteen (2013), POODLE (2014) · **Fixed by:** encrypt-then-MAC (RFC 7366)
    and AEAD-only TLS 1.3 · **Status:** still found in home-made protocols that decrypt before they
    verify.

**Code it: encrypt-then-MAC.** AES in CTR mode, then HMAC-SHA-256 over the IV and
ciphertext, with separate keys:

```python
# pip install cryptography
import hashlib, hmac, os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def seal(enc_key, mac_key, msg):
    iv = os.urandom(16)
    e = Cipher(algorithms.AES(enc_key), modes.CTR(iv)).encryptor()
    ct = iv + e.update(msg) + e.finalize()
    return ct + hmac.new(mac_key, ct, hashlib.sha256).digest()      # MAC the ciphertext

def open_(enc_key, mac_key, box):
    ct, tag = box[:-32], box[-32:]
    if not hmac.compare_digest(tag, hmac.new(mac_key, ct, hashlib.sha256).digest()):
        raise ValueError("forged or damaged")                        # check before decrypting
    d = Cipher(algorithms.AES(enc_key), modes.CTR(ct[:16])).decryptor()
    return d.update(ct[16:]) + d.finalize()

ek, mk = os.urandom(32), os.urandom(32)  # two keys: never one key for both jobs
box = seal(ek, mk, b"pay Bob $100.00 from Alice")
print(open_(ek, mk, box))
evil = bytearray(box)
evil[20] ^= 0x01                         # flip one ciphertext bit
try:
    open_(ek, mk, bytes(evil))
except ValueError as err:
    print(err)
# b'pay Bob $100.00 from Alice'
# forged or damaged
```

This is a sound design, and Signal's message encryption is built this way (AES-CBC
with HMAC-SHA-256). But it has three parts to get right: the IV must be covered
by the MAC (it is, here), the two keys must be separate, and the comparison must
be constant-time. Doing all of that in one well-tested function is the job of
AEAD.

## 10.8 AEAD: authenticated encryption with associated data

*Level: intermediate.*

An **AEAD** does encryption and authentication in one algorithm, with one key,
behind an interface that is hard to misuse. David McGrew wrote the interface
down in RFC 5116 (2008):

- $\mathrm{Encrypt}(K, N, P, A)$ returns a ciphertext with a tag attached.
- $\mathrm{Decrypt}(K, N, C, A)$ returns the plaintext $P$, or **FAIL**, and never
  anything else.

Here $K$ is the secret key and $N$ a **nonce**: not secret, but it must never
repeat under the same key. $A$ is the **associated data**: information that must
be authenticated but stays readable, such as a packet header, a sequence number
or a file name. If anyone changes a single bit of $C$ or $A$, decryption fails.

Phillip Rogaway named the notion and, with Mihir Bellare, John Black and Ted
Krovetz, designed OCB in 2001, an AEAD that needs about one AES call per block.
Charanjit Jutla at IBM found a similar design (IAPM) at the same time. Both were
patented, so the IETF and the Wi-Fi industry used patent-free designs instead:
CCM (CTR mode plus CBC-MAC, 2002, for WPA2) and then GCM.

**AES-GCM.** McGrew and John Viega designed the Galois/Counter Mode in 2004;
NIST standardized it in SP 800-38D (2007). It is CTR-mode encryption plus a
Wegman-Carter MAC whose universal hash, GHASH, works in $\mathrm{GF}(2^{128})$:

$$
\begin{aligned}
H &= \mathrm{AES}_K(0^{128}) && \text{the hash key} \\
J_0 &= N \,\Vert\, 0^{31} \,\Vert\, 1 && \text{the first counter block, for a 96-bit nonce} \\
C_i &= P_i \oplus \mathrm{AES}_K(J_0 + i) && \text{CTR mode, } i = 1, 2, \ldots \\
S &= X_1 H^m \oplus X_2 H^{m-1} \oplus \cdots \oplus X_m H && X_i \text{: blocks of } A,\ C \text{ and the lengths} \\
T &= S \oplus \mathrm{AES}_K(J_0) && \text{the tag}
\end{aligned}
$$

GHASH is a polynomial evaluated at the secret point $H$, exactly like the toy in
§10.5, and $\mathrm{AES}_K(J_0)$ is the one-time pad. Modern CPUs have instructions for
AES rounds and for the carry-less multiplication GHASH needs, which makes GCM
very fast, and it is the most used cipher on the internet.

<figure class="mars-fig">
<svg viewBox="0 0 700 330" width="700" role="img" aria-label="AES-GCM: counter blocks are encrypted to make keystream for the plaintext; GHASH multiplies the associated data, ciphertext blocks and lengths by H; the result is XORed with AES of J0 to give the tag">
<rect x="10" y="14" width="110" height="34" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="35.9" font-size="14" text-anchor="middle" fill="currentColor">J₀</text>
<rect x="170" y="14" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="225" y="35.9" font-size="14" text-anchor="middle" fill="currentColor">J₀ + 1</text>
<polyline points="225,48 225,58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="225,64 221,57.1 229,57.1" fill="currentColor"/>
<rect x="185" y="64" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="225" y="85.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">AES_K</text>
<polyline points="225,98 225,118" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="225,124 221,117.1 229,117.1" fill="currentColor"/>
<circle cx="225" cy="133" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="216" y1="133" x2="234" y2="133" stroke="currentColor" stroke-width="1.5"/>
<line x1="225" y1="124" x2="225" y2="142" stroke="currentColor" stroke-width="1.5"/>
<text x="164" y="138" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">P₁</text>
<polyline points="172,133 210,133" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="216,133 209.1,137 209.1,129" fill="currentColor"/>
<polyline points="225,142 225,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="225,166 221,159.1 229,159.1" fill="currentColor"/>
<rect x="195" y="166" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="225" y="185.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">C₁</text>
<rect x="330" y="14" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="35.9" font-size="14" text-anchor="middle" fill="currentColor">J₀ + 2</text>
<polyline points="385,48 385,58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,64 381,57.1 389,57.1" fill="currentColor"/>
<rect x="345" y="64" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="85.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">AES_K</text>
<polyline points="385,98 385,118" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,124 381,117.1 389,117.1" fill="currentColor"/>
<circle cx="385" cy="133" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="376" y1="133" x2="394" y2="133" stroke="currentColor" stroke-width="1.5"/>
<line x1="385" y1="124" x2="385" y2="142" stroke="currentColor" stroke-width="1.5"/>
<text x="324" y="138" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">P₂</text>
<polyline points="332,133 370,133" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="376,133 369.1,137 369.1,129" fill="currentColor"/>
<polyline points="385,142 385,160" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,166 381,159.1 389,159.1" fill="currentColor"/>
<rect x="355" y="166" width="60" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="185.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">C₂</text>
<text x="560" y="37" font-size="18" text-anchor="middle" fill="currentColor">…</text>
<polyline points="65,48 65,58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="65,64 61,57.1 69,57.1" fill="currentColor"/>
<rect x="25" y="64" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="85.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">AES_K</text>
<rect x="30" y="218" width="50" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="235.6" font-size="13" text-anchor="middle" fill="currentColor">A</text>
<polyline points="55,244 55,250" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="55,256 51,249.1 59,249.1" fill="currentColor"/>
<rect x="33" y="256" width="44" height="26" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="273.6" font-size="13" text-anchor="middle" fill="currentColor">·H</text>
<rect x="190" y="218" width="50" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="235.6" font-size="13" text-anchor="middle" fill="currentColor">C₁</text>
<circle cx="215" cy="265" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="206" y1="265" x2="224" y2="265" stroke="currentColor" stroke-width="1.5"/>
<line x1="215" y1="256" x2="215" y2="274" stroke="currentColor" stroke-width="1.5"/>
<polyline points="215,244 215,250" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="215,256 211,249.1 219,249.1" fill="currentColor"/>
<polyline points="77,265 200,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="206,265 199.1,269 199.1,261" fill="currentColor"/>
<polyline points="224,265 235,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="241,265 234.1,269 234.1,261" fill="currentColor"/>
<rect x="241" y="252" width="40" height="26" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="261" y="269.6" font-size="13" text-anchor="middle" fill="currentColor">·H</text>
<rect x="350" y="218" width="50" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="375" y="235.6" font-size="13" text-anchor="middle" fill="currentColor">C₂</text>
<circle cx="375" cy="265" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="366" y1="265" x2="384" y2="265" stroke="currentColor" stroke-width="1.5"/>
<line x1="375" y1="256" x2="375" y2="274" stroke="currentColor" stroke-width="1.5"/>
<polyline points="375,244 375,250" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="375,256 371,249.1 379,249.1" fill="currentColor"/>
<polyline points="281,265 360,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="366,265 359.1,269 359.1,261" fill="currentColor"/>
<polyline points="384,265 395,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="401,265 394.1,269 394.1,261" fill="currentColor"/>
<rect x="401" y="252" width="40" height="26" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="421" y="269.6" font-size="13" text-anchor="middle" fill="currentColor">·H</text>
<rect x="510" y="218" width="50" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="235.6" font-size="13" text-anchor="middle" fill="currentColor">len</text>
<circle cx="535" cy="265" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="526" y1="265" x2="544" y2="265" stroke="currentColor" stroke-width="1.5"/>
<line x1="535" y1="256" x2="535" y2="274" stroke="currentColor" stroke-width="1.5"/>
<polyline points="535,244 535,250" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="535,256 531,249.1 539,249.1" fill="currentColor"/>
<polyline points="441,265 520,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="526,265 519.1,269 519.1,261" fill="currentColor"/>
<polyline points="544,265 555,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="561,265 554.1,269 554.1,261" fill="currentColor"/>
<rect x="561" y="252" width="40" height="26" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="581" y="269.6" font-size="13" text-anchor="middle" fill="currentColor">·H</text>
<polyline points="215,196 215,212" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="215,218 211,211.1 219,211.1" fill="currentColor"/>
<polyline points="375,196 375,212" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="375,218 371,211.1 379,211.1" fill="currentColor"/>
<circle cx="640" cy="265" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="631" y1="265" x2="649" y2="265" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="640" y1="256" x2="640" y2="274" stroke="currentColor" class="acc" stroke-width="1.5"/>
<polyline points="601,265 625,265" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="631,265 624.1,269 624.1,261" fill="currentColor"/>
<polyline points="65,98 65,112 655,112 655,210 640,210 640,250" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="640,256 636,249.1 644,249.1" class="acc-fill"/>
<text x="600" y="106" font-size="13" text-anchor="end" class="acc-fill">AES_K(J₀): the one-time pad</text>
<polyline points="640,274 640,306" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="640,312 636,305.1 644,305.1" class="acc-fill"/>
<text x="620" y="322" font-size="15" text-anchor="end" font-weight="bold" class="acc-fill">tag T</text>
<text x="10" y="322" font-size="13" class="acc-fill">GHASH: multiply by H and add (XOR), block by block</text>
</svg>
<figcaption>Figure 10.10. AES-GCM with two plaintext blocks. Top: CTR mode, counters J₀+1, J₀+2 encrypted and XORed into the plaintext. Bottom: GHASH, a polynomial in the hash key H = AES_K(0) over the associated data, the ciphertext and the lengths, masked with AES_K(J₀) to give the tag.</figcaption>
</figure>

Those instructions arrived in 2010, when Intel added AES-NI and a carry-less
multiply to its processors; other chip makers followed. With them, AES-GCM runs
at a few clock cycles per byte, and wherever the hardware is present the choice
of AEAD is easy.

!!! note "Life story: AES-GCM"
    **Born:** 2004, David McGrew and John Viega; NIST SP 800-38D (2007) · **Purpose:** a fast,
    parallel, patent-free AEAD for high-speed networks · **Helped:** TLS 1.2 and 1.3, IPsec, SSH
    and WPA3 (GCMP); it now protects most internet traffic · **Status:**
    current, with two caveats: a repeated nonce is fatal (§10.9), and NIST is removing tags shorter
    than 96 bits.

**ChaCha20-Poly1305.** On phones and small chips without AES instructions, AES
is slower and hard to make constant-time. Adam Langley at Google proposed in 2013
combining Bernstein's ChaCha20 ([Chapter 5](05-Stream-Ciphers.md)) with
Poly1305; it became RFC 7539 (2015), now RFC 8439. Block 0 of ChaCha20 for the
key and nonce gives the Poly1305 key, the following blocks encrypt, and Poly1305
covers the associated data, the ciphertext and both lengths. TLS 1.3, WireGuard,
OpenSSH and QUIC all offer it.

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="ChaCha20-Poly1305: ChaCha20 block 0 gives the one-time Poly1305 key; blocks 1 onward encrypt the plaintext; Poly1305 tags the associated data, ciphertext and lengths">
<rect x="10" y="14" width="170" height="40" rx="4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="38.9" font-size="14" text-anchor="middle" fill="currentColor">ChaCha20(K, N, 0)</text>
<rect x="230" y="14" width="170" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="315" y="38.9" font-size="14" text-anchor="middle" fill="currentColor">ChaCha20(K, N, 1)</text>
<rect x="450" y="14" width="170" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="38.9" font-size="14" text-anchor="middle" fill="currentColor">ChaCha20(K, N, 2)</text>
<text x="640" y="40" font-size="18" text-anchor="middle" fill="currentColor">…</text>
<polyline points="95,54 95,144" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="95,150 91,143.1 99,143.1" class="acc-fill"/>
<text x="105" y="100" font-size="13" class="acc-fill">first 32 bytes:</text>
<text x="105" y="116" font-size="13" class="acc-fill">key (r, s)</text>
<polyline points="315,54 315,70" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="315,76 311,69.1 319,69.1" fill="currentColor"/>
<circle cx="315" cy="85" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="306" y1="85" x2="324" y2="85" stroke="currentColor" stroke-width="1.5"/>
<line x1="315" y1="76" x2="315" y2="94" stroke="currentColor" stroke-width="1.5"/>
<text x="285" y="90" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">P₁</text>
<polyline points="289,85 300,85" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="306,85 299.1,89 299.1,81" fill="currentColor"/>
<polyline points="315,94 315,104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="315,110 311,103.1 319,103.1" fill="currentColor"/>
<rect x="285" y="110" width="60" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="315" y="128.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">C₁</text>
<polyline points="315,138 315,144" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="315,150 311,143.1 319,143.1" fill="currentColor"/>
<polyline points="535,54 535,70" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="535,76 531,69.1 539,69.1" fill="currentColor"/>
<circle cx="535" cy="85" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="526" y1="85" x2="544" y2="85" stroke="currentColor" stroke-width="1.5"/>
<line x1="535" y1="76" x2="535" y2="94" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="90" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">P₂</text>
<polyline points="509,85 520,85" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="526,85 519.1,89 519.1,81" fill="currentColor"/>
<polyline points="535,94 535,104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="535,110 531,103.1 539,103.1" fill="currentColor"/>
<rect x="505" y="110" width="60" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="128.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">C₂</text>
<polyline points="535,138 535,144" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="535,150 531,143.1 539,143.1" fill="currentColor"/>
<rect x="30" y="150" width="600" height="36" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="330" y="172.9" font-size="14" text-anchor="middle" fill="currentColor">Poly1305 over  AD ‖ pad ‖ ciphertext ‖ pad ‖ lengths</text>
<polyline points="330,186 330,204" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="330,210 326,203.1 334,203.1" class="acc-fill"/>
<text x="345" y="222" font-size="15" font-weight="bold" class="acc-fill">tag</text>
</svg>
<figcaption>Figure 10.11. ChaCha20-Poly1305. Block 0 of ChaCha20 for this key and nonce is not used for encryption: its first 32 bytes become Poly1305's one-time key. A new nonce gives a new Poly1305 key, which is how "one key, one message" is kept.</figcaption>
</figure>

Google turned it on in Chrome for Android in 2014, because most phones of that
time had no AES instructions and AES-GCM in software was both slow and hard to
make constant-time. It is now one of the main cipher suites of TLS 1.3 and the
only cipher of WireGuard.

!!! note "Life story: ChaCha20-Poly1305"
    **Born:** 2013, Adam Langley's proposal at Google to pair Bernstein's ChaCha20 (2008) with
    Poly1305 (2005); RFC 7539 (2015), RFC 8439 (2018) · **Purpose:** a fast, constant-time AEAD for
    devices without AES hardware · **Helped:** Chrome on Android, TLS 1.3, WireGuard, OpenSSH, QUIC
    and, as XChaCha20-Poly1305, libsodium · **Status:** current.

With a library, both look the same:

```python
# pip install cryptography
import os
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305

for cls in (AESGCM, ChaCha20Poly1305):
    aead = cls(os.urandom(32))
    nonce = os.urandom(12)               # 96 bits, never reused with this key
    header = b"to:bank msg#42"           # associated data: readable, but covered by the tag
    ct = aead.encrypt(nonce, b"pay Bob $100.00", header)
    print(cls.__name__, len(ct), aead.decrypt(nonce, ct, header))
    try:
        aead.decrypt(nonce, ct, b"to:bank msg#43")    # same ciphertext, changed header
    except InvalidTag:
        print("  changed header: rejected")
```

```
AESGCM 31 b'pay Bob $100.00'
  changed header: rejected
ChaCha20Poly1305 31 b'pay Bob $100.00'
  changed header: rejected
```

The 15-byte message became 31 bytes: the ciphertext is the same length as the
plaintext, plus a 16-byte tag. The nonce travels with it in the clear.

**Choosing nonces.** A counter is safest: TLS 1.3 XORs the record number into a
fixed per-connection IV, so nonces never repeat. Random 96-bit nonces are fine
for a limited number of messages: by the birthday bound
([§9.3](09-Hash-Functions.md)), SP 800-38D caps one GCM key at $2^{32}$ random
nonces, which keeps the chance of a repeat near $2^{-33}$.

<figure class="mars-fig">
<svg viewBox="0 0 600 290" width="600" role="img" aria-label="Log-log plot of the chance of a repeated random 96-bit nonce against the number of messages, with marks at 2 to the 32 and 2 to the 40">
<line x1="70" y1="235" x2="570" y2="235" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="15" x2="70" y2="235" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="235" x2="70" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="255" font-size="13" text-anchor="middle" fill="currentColor">2²⁰</text>
<line x1="141.4" y1="235" x2="141.4" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="141.4" y="255" font-size="13" text-anchor="middle" fill="currentColor">2²⁴</text>
<line x1="212.9" y1="235" x2="212.9" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="212.9" y="255" font-size="13" text-anchor="middle" fill="currentColor">2²⁸</text>
<line x1="284.3" y1="235" x2="284.3" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="284.3" y="255" font-size="13" text-anchor="middle" fill="currentColor">2³²</text>
<line x1="355.7" y1="235" x2="355.7" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="355.7" y="255" font-size="13" text-anchor="middle" fill="currentColor">2³⁶</text>
<line x1="427.1" y1="235" x2="427.1" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="427.1" y="255" font-size="13" text-anchor="middle" fill="currentColor">2⁴⁰</text>
<line x1="498.6" y1="235" x2="498.6" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="498.6" y="255" font-size="13" text-anchor="middle" fill="currentColor">2⁴⁴</text>
<line x1="570" y1="235" x2="570" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="570" y="255" font-size="13" text-anchor="middle" fill="currentColor">2⁴⁸</text>
<line x1="65" y1="235" x2="70" y2="235" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="240" font-size="13" text-anchor="end" fill="currentColor">2⁻⁶⁰</text>
<line x1="70" y1="235" x2="570" y2="235" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="198.3" x2="70" y2="198.3" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="203.3" font-size="13" text-anchor="end" fill="currentColor">2⁻⁵⁰</text>
<line x1="70" y1="198.3" x2="570" y2="198.3" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="161.7" x2="70" y2="161.7" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="166.7" font-size="13" text-anchor="end" fill="currentColor">2⁻⁴⁰</text>
<line x1="70" y1="161.7" x2="570" y2="161.7" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="125" x2="70" y2="125" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="130" font-size="13" text-anchor="end" fill="currentColor">2⁻³⁰</text>
<line x1="70" y1="125" x2="570" y2="125" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="88.3" x2="70" y2="88.3" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="93.3" font-size="13" text-anchor="end" fill="currentColor">2⁻²⁰</text>
<line x1="70" y1="88.3" x2="570" y2="88.3" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="51.7" x2="70" y2="51.7" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="56.7" font-size="13" text-anchor="end" fill="currentColor">2⁻¹⁰</text>
<line x1="70" y1="51.7" x2="570" y2="51.7" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<line x1="65" y1="15" x2="70" y2="15" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="20" font-size="13" text-anchor="end" fill="currentColor">1</text>
<line x1="70" y1="15" x2="570" y2="15" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/>
<polyline points="70,224 71.8,223.3 73.6,222.5 75.4,221.8 77.1,221.1 78.9,220.3 80.7,219.6 82.5,218.9 84.3,218.1 86.1,217.4 87.9,216.7 89.6,215.9 91.4,215.2 93.2,214.5 95,213.7 96.8,213 98.6,212.3 100.4,211.5 102.1,210.8 103.9,210.1 105.7,209.3 107.5,208.6 109.3,207.9 111.1,207.1 112.9,206.4 114.6,205.7 116.4,204.9 118.2,204.2 120,203.5 121.8,202.7 123.6,202 125.4,201.3 127.1,200.5 128.9,199.8 130.7,199.1 132.5,198.3 134.3,197.6 136.1,196.9 137.9,196.1 139.6,195.4 141.4,194.7 143.2,193.9 145,193.2 146.8,192.5 148.6,191.7 150.4,191 152.1,190.3 153.9,189.5 155.7,188.8 157.5,188.1 159.3,187.3 161.1,186.6 162.9,185.9 164.6,185.1 166.4,184.4 168.2,183.7 170,182.9 171.8,182.2 173.6,181.5 175.4,180.7 177.1,180 178.9,179.3 180.7,178.5 182.5,177.8 184.3,177.1 186.1,176.3 187.9,175.6 189.6,174.9 191.4,174.1 193.2,173.4 195,172.7 196.8,171.9 198.6,171.2 200.4,170.5 202.1,169.7 203.9,169 205.7,168.3 207.5,167.5 209.3,166.8 211.1,166.1 212.9,165.3 214.6,164.6 216.4,163.9 218.2,163.1 220,162.4 221.8,161.7 223.6,160.9 225.4,160.2 227.1,159.5 228.9,158.7 230.7,158 232.5,157.3 234.3,156.5 236.1,155.8 237.9,155.1 239.6,154.3 241.4,153.6 243.2,152.9 245,152.1 246.8,151.4 248.6,150.7 250.4,149.9 252.1,149.2 253.9,148.5 255.7,147.7 257.5,147 259.3,146.3 261.1,145.5 262.9,144.8 264.6,144.1 266.4,143.3 268.2,142.6 270,141.9 271.8,141.1 273.6,140.4 275.4,139.7 277.1,138.9 278.9,138.2 280.7,137.5 282.5,136.7 284.3,136 286.1,135.3 287.9,134.5 289.6,133.8 291.4,133.1 293.2,132.3 295,131.6 296.8,130.9 298.6,130.1 300.4,129.4 302.1,128.7 303.9,127.9 305.7,127.2 307.5,126.5 309.3,125.7 311.1,125 312.9,124.3 314.6,123.5 316.4,122.8 318.2,122.1 320,121.3 321.8,120.6 323.6,119.9 325.4,119.1 327.1,118.4 328.9,117.7 330.7,116.9 332.5,116.2 334.3,115.5 336.1,114.7 337.9,114 339.6,113.3 341.4,112.5 343.2,111.8 345,111.1 346.8,110.3 348.6,109.6 350.4,108.9 352.1,108.1 353.9,107.4 355.7,106.7 357.5,105.9 359.3,105.2 361.1,104.5 362.9,103.7 364.6,103 366.4,102.3 368.2,101.5 370,100.8 371.8,100.1 373.6,99.3 375.4,98.6 377.1,97.9 378.9,97.1 380.7,96.4 382.5,95.7 384.3,94.9 386.1,94.2 387.9,93.5 389.6,92.7 391.4,92 393.2,91.3 395,90.5 396.8,89.8 398.6,89.1 400.4,88.3 402.1,87.6 403.9,86.9 405.7,86.1 407.5,85.4 409.3,84.7 411.1,83.9 412.9,83.2 414.6,82.5 416.4,81.7 418.2,81 420,80.3 421.8,79.5 423.6,78.8 425.4,78.1 427.1,77.3 428.9,76.6 430.7,75.9 432.5,75.1 434.3,74.4 436.1,73.7 437.9,72.9 439.6,72.2 441.4,71.5 443.2,70.7 445,70 446.8,69.3 448.6,68.5 450.4,67.8 452.1,67.1 453.9,66.3 455.7,65.6 457.5,64.9 459.3,64.1 461.1,63.4 462.9,62.7 464.6,61.9 466.4,61.2 468.2,60.5 470,59.7 471.8,59 473.6,58.3 475.4,57.5 477.1,56.8 478.9,56.1 480.7,55.3 482.5,54.6 484.3,53.9 486.1,53.1 487.9,52.4 489.6,51.7 491.4,50.9 493.2,50.2 495,49.5 496.8,48.7 498.6,48 500.4,47.3 502.1,46.5 503.9,45.8 505.7,45.1 507.5,44.3 509.3,43.6 511.1,42.9 512.9,42.1 514.6,41.4 516.4,40.7 518.2,39.9 520,39.2 521.8,38.5 523.6,37.7 525.4,37 527.1,36.3 528.9,35.5 530.7,34.8 532.5,34.1 534.3,33.3 536.1,32.6 537.9,31.9 539.6,31.1 541.4,30.4 543.2,29.7 545,28.9 546.8,28.2 548.6,27.5 550.4,26.7 552.1,26 553.9,25.3 555.7,24.5 557.5,23.8 559.3,23.1 561.1,22.3 562.9,21.6 564.6,20.9 566.4,20.1 568.2,19.4 570,18.7" fill="none" class="acc" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="284.3" cy="136" r="5" class="acc-fill"/>
<text x="294.3" y="154" font-size="13" font-weight="bold" fill="currentColor">2³² messages: 2⁻³³ (NIST&#x27;s limit)</text>
<circle cx="427.1" cy="77.3" r="5" class="acc-fill"/>
<text x="437.1" y="95.3" font-size="13" font-weight="bold" fill="currentColor">2⁴⁰ messages: 2⁻¹⁷</text>
<text x="320" y="282" font-size="13" text-anchor="middle" fill="currentColor">messages under one key</text>
<text x="78" y="29" font-size="13" fill="currentColor">chance some nonce repeats ≈ q² / 2⁹⁷</text>
</svg>
<figcaption>Figure 10.12. Random 96-bit nonces and the birthday bound. The chance of a repeat grows as the square of the number of messages q: each doubling of q makes a repeat four times likelier. At 2⁴⁸ messages it is close to certain.</figcaption>
</figure>

## 10.9 Break it: one repeated nonce

*Level: intermediate.*

What happens if a nonce is used twice under the same key, through a bug, a
restored virtual machine snapshot, or two servers sharing a key and a counter?

**Secrecy goes first.** Both messages are XORed with the same keystream, so the
XOR of the two ciphertexts equals the XOR of the two plaintexts, the "two-time
pad" of [Chapter 5](05-Stream-Ciphers.md). Anyone who knows or guesses one
message reads the other.

**Then integrity.** The two tags use the same pad $\mathrm{AES}_K(J_0)$ and the same $H$.
For two one-block messages with no associated data, each tag is

$$
T = C \cdot H^2 \oplus L \cdot H \oplus \mathrm{AES}_K(J_0),
$$

where $L$ is the length block. XOR the two tags and both the pad and the
$L \cdot H$ term cancel:

$$
T_1 \oplus T_2 = (C_1 \oplus C_2) \cdot H^2 .
$$

Everything here except $H$ is public, so the attacker divides to get $H^2$,
takes the square root (in $\mathrm{GF}(2^{128})$ squaring is a linear map, and every
element has exactly one root, $x^{2^{127}}$), and then recovers the pad. With $H$
and the pad they can tag any ciphertext for that nonce. Antoine Joux pointed this
out in 2006 and called it the "forbidden attack". For longer messages the
equation is a higher-degree polynomial in $H$, which is still easy to solve.

<figure class="mars-fig">
<svg viewBox="0 0 620 190" width="620" role="img" aria-label="Two GCM tags under a repeated nonce: XORing them cancels the length term and the pad, leaving the ciphertext difference times H squared">
<text x="20" y="34" font-size="16" font-weight="bold" fill="currentColor">T₁ =</text>
<text x="110" y="34" font-size="16" text-anchor="middle" font-weight="bold" class="acc-fill">C₁ · H²</text>
<text x="190" y="34" font-size="16" text-anchor="middle" fill="currentColor">⊕</text>
<text x="260" y="34" font-size="16" text-anchor="middle" fill="currentColor">L · H</text>
<text x="330" y="34" font-size="16" text-anchor="middle" fill="currentColor">⊕</text>
<text x="440" y="34" font-size="16" text-anchor="middle" fill="currentColor">AES_K(J₀)</text>
<line x1="225" y1="28" x2="295" y2="28" stroke="currentColor" stroke-width="2"/>
<line x1="380" y1="28" x2="500" y2="28" stroke="currentColor" stroke-width="2"/>
<text x="20" y="78" font-size="16" font-weight="bold" fill="currentColor">T₂ =</text>
<text x="110" y="78" font-size="16" text-anchor="middle" font-weight="bold" class="acc-fill">C₂ · H²</text>
<text x="190" y="78" font-size="16" text-anchor="middle" fill="currentColor">⊕</text>
<text x="260" y="78" font-size="16" text-anchor="middle" fill="currentColor">L · H</text>
<text x="330" y="78" font-size="16" text-anchor="middle" fill="currentColor">⊕</text>
<text x="440" y="78" font-size="16" text-anchor="middle" fill="currentColor">AES_K(J₀)</text>
<line x1="225" y1="72" x2="295" y2="72" stroke="currentColor" stroke-width="2"/>
<line x1="380" y1="72" x2="500" y2="72" stroke="currentColor" stroke-width="2"/>
<line x1="15" y1="104" x2="600" y2="104" stroke="currentColor" stroke-width="1.5"/>
<text x="20" y="136" font-size="16" font-weight="bold" fill="currentColor">T₁ ⊕ T₂ =</text>
<text x="260" y="136" font-size="16" text-anchor="middle" font-weight="bold" class="acc-fill">(C₁ ⊕ C₂) · H²</text>
<text x="572" y="50" font-size="13" text-anchor="middle" fill="currentColor">same nonce:</text>
<text x="572" y="66" font-size="13" text-anchor="middle" fill="currentColor">these cancel</text>
<text x="20" y="174" font-size="14" fill="currentColor">Everything but H is public, so the attacker solves for H², then H, then the pad.</text>
</svg>
<figcaption>Figure 10.13. The forbidden attack in one picture. Under a repeated nonce the length term and the pad AES_K(J₀) are the same in both tags, so XORing the tags wipes them out and leaves an equation whose only unknown is H.</figcaption>
</figure>

The program below does it against the real AES-GCM in the `cryptography`
package. The only arithmetic it needs is multiplication in GCM's field.

```python
# pip install cryptography
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def gf_mul(x, y):                        # multiply in GF(2^128), GCM's bit order
    z = 0
    for i in range(127, -1, -1):
        if y >> i & 1:
            z ^= x
        x = x >> 1 ^ (0xe1 << 120 if x & 1 else 0)
    return z

def gf_pow(x, e):
    r = 1 << 127                         # the field's "1" in GCM's bit order
    while e:
        if e & 1:
            r = gf_mul(r, x)
        x, e = gf_mul(x, x), e >> 1
    return r

def gf_inv(x):
    return gf_pow(x, (1 << 128) - 2)

key, nonce = os.urandom(16), os.urandom(12)
gcm = AESGCM(key)
m1, m2 = b"pay alice $10.00", b"pay steve $99.00"      # 16 bytes each
out1, out2 = gcm.encrypt(nonce, m1, None), gcm.encrypt(nonce, m2, None)   # the mistake
num = lambda b: int.from_bytes(b, "big")
c1, t1, c2, t2 = num(out1[:16]), num(out1[16:]), num(out2[:16]), num(out2[16:])

# For a one-block message, tag = C*H^2 + L*H + AES_K(J0). Subtract the two tags:
h2 = gf_mul(t1 ^ t2, gf_inv(c1 ^ c2))    # H^2
h = gf_pow(h2, 1 << 127)                 # square root: squaring is linear here
L = 128                                  # the length block: 0 bits of AD, 128 of text
mask = t1 ^ gf_mul(c1, h2) ^ gf_mul(L, h)            # AES_K(J0)

c3 = c1 ^ num(m1) ^ num(b"pay mallory $999")         # flip the bits we want
t3 = gf_mul(c3, h2) ^ gf_mul(L, h) ^ mask
forged = c3.to_bytes(16, "big") + t3.to_bytes(16, "big")
print(gcm.decrypt(nonce, forged, None))
# b'pay mallory $999'
```

The library checked the tag and accepted it. In GCM the recovered $H$ is
worse than a one-message loss: $H$ depends only on the key, so from any one
valid message under any other nonce the attacker can compute that nonce's pad
too and forge there, until the key changes. In ChaCha20-Poly1305 a
repeated nonce gives away only that nonce's Poly1305 key (§10.5), which is bad
but contained.

**It happens.** In 2016 Hanno Böck, Aaron Zauner, Sean Devlin, Juraj
Somorovsky and Philipp Jovanovic scanned the internet and found 184 HTTPS
servers repeating GCM nonces, among them sites belonging to Visa, and
about 70,000 more that used random nonces and so risked it. In 2017 Mathy
Vanhoef at KU Leuven in Belgium published **KRACK**: by replaying one message
of the Wi-Fi WPA2 handshake, an attacker could make a device reinstall its key
and reset its nonce counter, forcing nonce reuse in CCMP and GCMP on billions of
devices until they were patched.

!!! note "Life story: the forbidden attack (GCM nonce reuse)"
    **Born:** 2006, Antoine Joux's comment to NIST on the draft GCM standard · **What it breaks:**
    AES-GCM whenever a nonce repeats under one key: it recovers the hash key $H$ and lets the
    attacker forge · **Famous cases:** the 2016 scan that found HTTPS servers repeating nonces;
    KRACK (2017), which forced nonce reuse in Wi-Fi · **Fixed by:** counters for nonces, AES-GCM-SIV,
    and XChaCha20-Poly1305's long random nonces · **Status:** works against every GCM misuse.

## 10.10 Surviving nonce misuse

*Level: intermediate.*

If nonces cannot be trusted, use a design that degrades gracefully.

**SIV.** Rogaway and Thomas Shrimpton (2006) proposed the **synthetic IV**:
compute a MAC of the associated data and the plaintext *first*, and use that
tag as the IV for CTR-mode encryption. Encrypting the same message twice with
the same nonce gives the same ciphertext, which reveals only that the two
messages were equal, and nothing else. AES-SIV is RFC 5297 (2008). The price is
two passes: encryption cannot start until the whole message has been read.

<figure class="mars-fig">
<svg viewBox="0 0 620 170" width="620" role="img" aria-label="SIV: a MAC over the associated data and plaintext gives a tag that is also used as the IV for CTR encryption">
<rect x="10" y="20" width="120" height="36" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="43.2" font-size="15" text-anchor="middle" fill="currentColor">A, P</text>
<polyline points="130,38 174,38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="180,38 173.1,42 173.1,34" fill="currentColor"/>
<rect x="180" y="18" width="120" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="240" y="42.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">MAC (pass 1)</text>
<polyline points="300,38 344,38" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="350,38 343.1,42 343.1,34" class="acc-fill"/>
<rect x="350" y="20" width="100" height="36" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="42.9" font-size="14" text-anchor="middle" fill="currentColor">tag = IV</text>
<polyline points="450,38 594,38" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="600,38 593.1,42 593.1,34" class="acc-fill"/>
<text x="530" y="30" font-size="13" text-anchor="middle" class="acc-fill">sent</text>
<polyline points="400,56 400,90" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="400,96 396,89.1 404,89.1" class="acc-fill"/>
<rect x="330" y="96" width="140" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="120.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">CTR (pass 2)</text>
<polyline points="70,56 70,116 324,116" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="330,116 323.1,120 323.1,112" fill="currentColor"/>
<text x="80" y="108" font-size="14" fill="currentColor">P</text>
<polyline points="470,116 514,116" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="520,116 513.1,120 513.1,112" fill="currentColor"/>
<text x="540" y="121" font-size="16" font-weight="bold" fill="currentColor">C</text>
<text x="10" y="160" font-size="13" fill="currentColor">same A and P give the same IV, so a repeated nonce reveals only that a message repeated</text>
</svg>
<figcaption>Figure 10.14. The synthetic IV. The tag is computed first, from everything, and then reused as the IV for encryption. Nothing about the nonce can make two different messages share a keystream.</figcaption>
</figure>

**AES-GCM-SIV.** Shay Gueron and Yehuda Lindell (2015, RFC 8452 in 2019)
applied the same idea with GCM's fast parts: each nonce derives its own keys,
POLYVAL (a little-endian twin of GHASH) runs over the data, and its masked
output is both the tag and the starting counter. It runs at nearly GCM's speed.

!!! note "Life story: SIV and AES-GCM-SIV"
    **Born:** SIV in 2006 (Phillip Rogaway and Thomas Shrimpton), AES-SIV as RFC 5297 (2008);
    AES-GCM-SIV in 2015 (Shay Gueron and Yehuda Lindell), RFC 8452 (2019) · **Purpose:** an AEAD
    that degrades gracefully when a nonce repeats, and safe key wrapping · **Helped:** systems
    that cannot guarantee unique nonces: many senders, random nonces, restored snapshots ·
    **Status:** current.

**Longer nonces.** XChaCha20-Poly1305 has a 192-bit nonce, so random nonces
never collide in practice; it is the usual choice in libsodium. AEGIS-256 has a
256-bit nonce.

**Key commitment.** One more property most AEADs lack: a GCM or
ChaCha20-Poly1305 ciphertext can be built to decrypt validly under *two
different keys*, to two different messages. In 2018 Yevgeniy Dodis, Paul
Grubbs, Thomas Ristenpart and Joanne Woodage used this ("invisible
salamanders") to send an abusive image through Facebook Messenger's encrypted
abuse-reporting system that showed one picture to the recipient and another to
the moderators. In 2021 Julia Len, Grubbs and Ristenpart used it to test many
password guesses with one ciphertext against servers that derived keys from
passwords. Where an attacker can choose keys, add a key commitment (for
example a hash of the key stored with the ciphertext) or use an AEAD designed
to commit.

## 10.11 In the real world

**What to use.**

| Situation | Use |
|---|---|
| Encrypting anything | an AEAD: AES-GCM with AES hardware, ChaCha20-Poly1305 without |
| Random nonces, many senders, VM snapshots | XChaCha20-Poly1305, AES-GCM-SIV or AEGIS-256 |
| A MAC alone, with a long-term key | HMAC-SHA-256 |
| A MAC on AES-only hardware | AES-CMAC |
| Hash tables with untrusted keys | SipHash (your language already does it) |
| Small sensors and chips | Ascon-AEAD128 (NIST SP 800-232, 2025) or AES-CCM |

**Where they run.** TLS 1.3 (RFC 8446) allows only AEADs: AES-128-GCM is
mandatory, and AES-256-GCM, ChaCha20-Poly1305 and two CCM suites are defined.
WireGuard uses ChaCha20-Poly1305 only. Wi-Fi WPA2 uses AES-CCM (CCMP) and WPA3
adds GCMP. SSH offers `chacha20-poly1305@openssh.com`, AES-GCM, and
encrypt-then-MAC versions of HMAC and UMAC. IPsec ESP uses AES-GCM. Around the
world the same patterns appear with national algorithms: the 3GPP integrity
algorithm 128-EIA3 uses China's ZUC stream cipher, and RFC 8998 (2021) defines
TLS 1.3 suites with China's SM4 block cipher in GCM and CCM modes.

**Competitions.** Daniel J. Bernstein organized the CAESAR competition (2013 to
2019) for new AEADs. Its final portfolio named Ascon (Austria) and ACORN
(Singapore) for small devices, AEGIS-128 (Singapore and Belgium) and OCB for
speed, and Deoxys-II and COLM for defense in depth. NIST's lightweight
competition then chose Ascon in 2023.

**Rules that hold everywhere.**

- Never reuse a nonce under one key. Use counters where you can.
- Never act on decrypted data before the tag is checked; an API that streams
  plaintext out before verifying loses the protection.
- Compare tags in constant time.
- Rekey before the limits: TLS 1.3 asks for a new key after about $2^{24.5}$ full
  records with AES-GCM.
- Short tags (32 or 64 bits) only where the protocol limits forgery attempts.

**Standards.** RFC 2104 and FIPS 198-1 (HMAC), SP 800-38B and RFC 4493 (CMAC),
SP 800-38D (GCM and GMAC), RFC 8439 (ChaCha20-Poly1305), RFC 5116 (the AEAD
interface), RFC 8452 (AES-GCM-SIV), SP 800-185 (KMAC). Status and parameters:
the [MAC table](../algorithms/table.md#6-mac) and the
[modes and AEAD table](../algorithms/table.md#5-cipher-modes-and-aead). Reference pages:
[HMAC](../06-mac/HMAC.md), [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md),
[Universal hash MACs](../06-mac/Universal-Hash-MACs.md),
[KMAC](../06-mac/KMAC.md), [SipHash](../06-mac/SipHash.md) and
[AEAD](../05-modes-aead/AEAD.md).

## 10.12 Going deeper

*Level: expert.*

??? abstract "Why encrypt-then-MAC is secure: IND-CPA plus INT-CTXT"

    Bellare and Namprempre (ASIACRYPT 2000) defined two integrity notions. **INT-PTXT**: an attacker
    cannot make the receiver accept a ciphertext that decrypts to a plaintext never sent. **INT-CTXT**:
    an attacker cannot make the receiver accept *any* ciphertext never sent. The second is stronger.

    Their theorem: if a scheme is IND-CPA (secret under chosen-plaintext attack,
    [Chapter 17](17-Defining-Security.md)) and INT-CTXT, then it is **IND-CCA**, secret even when the
    attacker can submit ciphertexts for decryption. The proof is short: any decryption query the attacker
    makes is either a ciphertext it got from the encryption oracle (answer known) or a new one, which by
    INT-CTXT is rejected. So the decryption oracle is useless, and IND-CPA finishes the job.

    Encrypt-then-MAC with a strongly unforgeable MAC (one where even a new tag for an old message counts as
    a forgery) gives INT-CTXT directly, so it is IND-CCA for any IND-CPA cipher. MAC-then-encrypt gives only
    INT-PTXT in general; Krawczyk (CRYPTO 2001) showed it is secure with CTR or a stream cipher, but the
    padding oracles of §10.7 show how fragile that is in practice. An AEAD is required to meet both
    IND-CPA and INT-CTXT directly (Rogaway, 2002).

??? abstract "Generic forgeries on iterated MACs, and why HMAC stops at $2^{n/2}$"

    Any MAC that keeps an $n$-bit chaining value and processes the message block by block has a generic
    weakness found by Preneel and van Oorschot (CRYPTO 1995). Ask for tags on about $2^{n/2}$ messages that
    all end with the same block. By the birthday bound, two of them, $m$ and $m'$, collide in the internal
    state before the last block; you see this as equal tags. Then for any suffix $x$, $m \,\Vert\, x$ and
    $m' \,\Vert\, x$ have equal tags too, so one tag query gives a forgery.

    For HMAC-SHA-256 that needs about $2^{128}$ chosen messages under one key, which is why RFC 2104 quotes
    that bound. For CBC-MAC and CMAC with AES, the chaining value is 128 bits and the bound is $2^{64}$
    blocks, which is why SP 800-38B limits a key to $2^{48}$ messages. Wider-state designs and "beyond
    birthday bound" MACs (for example PMAC with tweakable block ciphers) exist for the cases where this
    matters.

??? abstract "Polynomial MACs: the exact bound, and short-tag attacks on GCM"

    For two different messages of at most $\ell$ blocks, $h_r(m) - h_r(m')$ is a nonzero polynomial of degree at
    most $\ell$ in $r$, with at most $\ell$ roots. With $r$ uniform in a field of size $q$, the collision
    probability is at most $\ell / q$. The family is **$\varepsilon$-almost-$\Delta$-universal** with
    $\varepsilon = \ell/q$: for any fixed difference $\delta$, $\Pr[h_r(m) - h_r(m') = \delta] \le \ell/q$. Adding a uniform pad
    $s$ turns this into a MAC where one forgery attempt succeeds with probability at most $\ell/q$, against an
    unbounded attacker. Replacing the truly random pad by $\mathrm{AES}_K(N)$ or ChaCha20 adds the PRF advantage of
    the cipher, plus a birthday term for AES since it is a permutation.

    For GCM, $q = 2^{128}$, but tags may be truncated to $\tau$ bits. Niels Ferguson (2005) showed that with
    short tags the polynomial's structure helps the forger: choose a forgery whose difference polynomial is
    *linear* over $\mathrm{GF}(2)$ in the bits of $H$ (using only blocks at positions $2^i$, since squaring
    is linear), so that many of the tag bits stay unchanged. Each successful forgery then reveals linear
    equations on $H$, and the next one is easier. For 32-bit tags on long messages, the first forgery takes
    about $2^{16}$ tries rather than $2^{32}$. That is why NIST is removing tags under 96 bits from SP 800-38D.

??? abstract "Multi-user security and why TLS 1.3 randomizes nonces"

    The bounds above are for one key. Real attackers face millions of users. Against a deterministic
    nonce such as a counter starting at 0, an attacker who precomputes AES of the first counter block under
    $2^k$ candidate keys can test them against all users at once, which costs a factor of the number of users
    in security. Bellare and Tackmann (CRYPTO 2016) analyzed this for TLS 1.3, whose record nonce is the
    sequence number XORed with a per-connection random IV derived from the handshake. That random mask makes
    each user's nonces unpredictable, restoring nearly single-user security. The same reasoning is why
    AES-256 is sometimes preferred for AEAD even where AES-128's single-key security would be enough.

??? abstract "Committing AEAD, and how to add it"

    An AEAD is **key-committing** if it is infeasible to find a ciphertext that decrypts validly under two
    keys. GCM fails because GHASH is linear: for any two keys $K_1, K_2$ and nonce, one can solve a linear
    system for a ciphertext block that makes both tags equal. ChaCha20-Poly1305 fails for a similar reason.

    Fixes: (1) append a commitment, such as $\mathrm{HMAC}(K, \text{"commit"} \,\Vert\, N)$, and check it before
    decrypting; (2) the "padding fix", prepend a block of zeros to the plaintext and check it on decryption,
    which gives commitment at about $2^{64}$ work for 128-bit blocks (Albertini, Duong, Gueron, Kölbl, Luykx
    and Schmieg, USENIX Security 2022); (3) use a design with a wide tag or an explicit commitment. Some
    newer specifications, such as RFC 10032's AEGIS, discuss their commitment level, and the IETF and NIST
    have work under way on committing modes.

## Check yourself

??? question "1. A message is encrypted with AES-CTR. An attacker knows it reads \"amount=0100\" at bytes 20 to 30. Without the key, how do they change it to \"amount=9100\"?"

    XOR $\mathtt{"0"} \oplus \mathtt{"9"} = \mathtt{0x30} \oplus \mathtt{0x39} = \mathtt{0x09}$ into ciphertext byte 27 (the first digit of the amount).
    CTR decryption XORs the same keystream back, and the plaintext digit becomes 9. A MAC over the
    ciphertext would catch it.

??? question "2. A MAC has 64-bit tags. An attacker can try 1,000 forgeries a second, forever. How long until one succeeds, on average?"

    About $2^{64}/1000 \approx 1.8 \times 10^{16}$ seconds, roughly 585 million years. With 32-bit tags it would be about
    50 days, which is why short tags need a protocol that cuts off repeated failures.

??? question "3. Why is $\mathrm{SHA3\text{-}256}(K \,\Vert\, m)$ a secure MAC while $\text{SHA-256}(K \,\Vert\, m)$ is not?"

    SHA-256 outputs its whole chaining state, so anyone can continue hashing from a tag (length extension).
    SHA3-256 outputs only part of the rate and never its 512 capacity bits, so the tag does not let anyone
    continue. KMAC formalizes this with careful encodings.

??? question "4. A server compares HMAC tags with `==` on Python byte strings. Is that a problem?"

    Yes in principle. Byte-string comparison can stop at the first difference, so the time depends on how
    many leading bytes are right, and over a network with enough samples that has been exploited. Use
    `hmac.compare_digest`. It costs nothing.

??? question "5. In the toy Wegman-Carter MAC of §10.5, with $p = 101$, $r = 10$, $s = 57$, compute the tag of $m = (1, 0, 0)$."

    $h = 1 \cdot 10^3 = 1000 = 9 \times 101 + 91$, so $h = 91$, and $t = 91 + 57 = 148 \equiv 47 \pmod{101}$.

??? question "6. Which order is this, and is it safe? The sender computes $t = \mathrm{HMAC}(K_2, m)$ and sends $\mathrm{AES\text{-}CBC}_{K_1}(m \,\Vert\, t)$."

    MAC-then-encrypt, as in TLS before 1.3. The receiver must decrypt and remove the padding before it can
    check the MAC, so any difference in how bad padding and bad MACs are handled (an error message, a
    timing difference) becomes a padding oracle, as in Vaudenay 2002, Lucky Thirteen and POODLE. It can be
    made safe with great care, but encrypt-then-MAC or an AEAD avoids the problem.

??? question "7. Two AES-GCM messages were sent with the same key and nonce. The plaintext of the first is known. What can an attacker do?"

    Read the second: XOR the two ciphertexts and the known plaintext. Recover $H$ from the two tags, and so
    forge any message under any nonce for that key (§10.9). The key must be thrown away.

??? question "8. A service encrypts with AES-GCM using random 96-bit nonces and sends $2^{40}$ messages under one key. Roughly what is the chance that some nonce repeated?"

    By the birthday bound, about $q^2 / 2^{97}$ with $q = 2^{40}$: $2^{80}/2^{97} = 2^{-17}$, about 1 in 131,000. That is far
    above NIST's $2^{-32}$ target, which is why random nonces are limited to $2^{32}$ messages per key. Use a
    counter, rekey, or switch to XChaCha20-Poly1305.

??? question "9. Why does Poly1305 append a `01` byte to each 16-byte block before turning it into a number?"

    Without it, a block and the same block with extra trailing zero bytes (in a short final block) would be
    the same number, so messages differing only in trailing zeros would get the same tag. The `01` marks
    where the block ends, and it also means no block is ever the number zero.

??? question "10. In the GCM attack of §10.9, why is the square root of $H^2$ unique, and why is it $x^{2^{127}}$?"

    In $\mathrm{GF}(2^{128})$, squaring is the Frobenius map, which is a bijection (and linear over $\mathrm{GF}(2)$), so each
    element has exactly one square root. Since every element satisfies $x^{2^{128}} = x$, the element
    $y = x^{2^{127}}$ satisfies $y^2 = x^{2^{128}} = x$.

## What you learned

- Encryption does not give integrity: XOR-based ciphers let an attacker edit
  plaintext without reading it. A MAC adds a tag only the key holder can make.
- HMAC hashes twice to defeat length extension and is secure even on hashes with
  broken collision resistance; CMAC fixes CBC-MAC for messages of any length;
  Wegman-Carter MACs such as Poly1305 and GHASH are fast and provably secure but
  need a fresh one-time key for every message.
- Compare tags in constant time. Never decrypt before verifying.
- Encrypt-then-MAC is the safe order; MAC-then-encrypt gave TLS a decade of
  padding oracles. AEAD (AES-GCM, ChaCha20-Poly1305) packages it correctly and
  authenticates headers as associated data.
- A repeated nonce breaks both secrecy and integrity; in GCM it reveals the hash
  key. Counters, AES-GCM-SIV or XChaCha20-Poly1305 prevent it.
- Most AEADs are not key-committing, which matters when an attacker can choose
  keys.

**Next:** [Chapter 11](11-Passwords-and-Key-Derivation.md) turns secrets that
are not proper keys, passwords and Diffie-Hellman outputs, into keys these
algorithms can use.

## Further reading

- Mihir Bellare, Ran Canetti and Hugo Krawczyk, "Keying Hash Functions for Message Authentication",
  CRYPTO '96; RFC 2104.
- Mark Wegman and Larry Carter, "New Hash Functions and Their Use in Authentication and Set Equality",
  *Journal of Computer and System Sciences* 22, 1981.
- Daniel J. Bernstein, "The Poly1305-AES message-authentication code", FSE 2005; RFC 8439.
- Mihir Bellare and Chanathip Namprempre, "Authenticated Encryption: Relations among Notions and Analysis
  of the Generic Composition Paradigm", ASIACRYPT 2000; Hugo Krawczyk, "The Order of Encryption and
  Authentication for Protecting Communications (or: How Secure Is SSL?)", CRYPTO 2001.
- Serge Vaudenay, "Security Flaws Induced by CBC Padding", EUROCRYPT 2002; AlFardan and Paterson,
  "Lucky Thirteen", IEEE S&P 2013.
- David McGrew and John Viega, "The Security and Performance of the Galois/Counter Mode", 2004;
  SP 800-38D; Antoine Joux, "Authentication Failures in NIST version of GCM", 2006.
- [Böck, Zauner, Devlin, Somorovsky and Jovanovic, "Nonce-Disrespecting Adversaries" (WOOT 2016)](https://eprint.iacr.org/2016/475);
  [Vanhoef and Piessens, "Key Reinstallation Attacks" (CCS 2017)](https://www.krackattacks.com/).
- Phillip Rogaway and Thomas Shrimpton, "A Provable-Security Treatment of the Key-Wrap Problem",
  EUROCRYPT 2006 (SIV); RFC 8452.
- Dodis, Grubbs, Ristenpart and Woodage, "Fast Message Franking: From Invisible Salamanders to
  Encryptment", CRYPTO 2018.
- David Wong, *Real-World Cryptography* (Manning, 2021), chapters 3 and 4, for a practitioner's view.
