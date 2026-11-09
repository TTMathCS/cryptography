# 15. Anonymous Communication: Mixes, Onion Routing and Tor

*Encryption hides what you say. It does not hide that you said it, to whom, when,
how often and from where, and that record, the metadata, is often what an
adversary wants. This chapter is about hiding who talks to whom. You will build
David Chaum's mix of 1981 with small RSA keys and break a careless version of it,
peel a three-layer onion in which each relay learns only the next hop, watch a mix
fail when it forgets to batch, run the dining cryptographers' protocol for three
people, shake hands with a Tor relay in a toy group, tag a Tor cell the way a
malicious relay could, compute an onion address, and then link flows through a
low-latency relay by their timing alone, which is the attack Tor has never been
able to stop. The chapter ends with the newer designs that trade speed for
safety, the two-hop systems that now carry millions of requests a day, and a mail
system between Earth and Mars that is slow anyway.*

!!! abstract "In this chapter"
    **You will learn:**

    - why encryption leaves metadata exposed, what anonymity, unlinkability and an
      anonymity set mean, and which adversaries matter;
    - how Chaum's mix works with layered public-key encryption, random padding,
      batching and replay checks, and what goes wrong without each;
    - how threshold, timed and pool mixes batch messages, and how the $n-1$ and
      statistical disclosure attacks get around them;
    - how the remailers of the 1990s (anon.penet.fi, Cypherpunk, Mixmaster,
      Mixminion) put these ideas into service, and why most of them are gone;
    - how the dining cryptographers' protocol gives anonymity that no amount of
      computing power can break, and what it costs;
    - how onion routing grew at the US Naval Research Laboratory into Tor, and how
      Tor works: directory authorities and the consensus, guard, middle and exit
      relays, telescoping circuits with the ntor handshake, fixed-size cells and
      layered counter-mode encryption, and onion services v3;
    - how Tor is attacked: end-to-end traffic correlation, website fingerprinting,
      tagging and the 2014 relay-early attack, Sybil relays, snooping exits, and what
      the 2012 "Tor Stinks" slides do and do not show;
    - how Loopix and Nym use cover traffic and random delays, and how Oblivious HTTP
      (RFC 9458) and iCloud Private Relay split who you are from what you ask;
    - how verifiable shuffles connect anonymous channels to secret ballots.

    **You need:** stream ciphers and XOR from book 1,
    [Chapter 5](../../book/05-Stream-Ciphers.md); HMAC from
    [Chapter 10](../../book/10-Message-Authentication.md); Diffie-Hellman from
    [Chapter 12](../../book/12-Diffie-Hellman.md); RSA from
    [Chapter 13](../../book/13-RSA.md); and the ElGamal encryption of
    [Chapter 14](../../book/14-Discrete-Log-Systems.md) for §15.16. The privacy
    vocabulary (unlinkability, metadata) is introduced in
    [Chapter 1](01-Computing-With-Secrets.md) of this book. Chaum's other great
    invention, the blind signature, is the subject of
    [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md).

    **Levels:** §15.1, §15.2, §15.5, §15.8, §15.15 and §15.17 are for beginners;
    §15.3, §15.4, §15.6, §15.7 and §15.9 to §15.14 are intermediate; §15.16 and
    §15.18 are expert.

## 15.1 The problem

*Level: beginner.*

In June 2013 the *Guardian* published a secret order from the US Foreign
Intelligence Surveillance Court. It required Verizon to hand the National Security
Agency, every day, a record of the calls on its network: which number called which,
when, and for how long. Not a word of any conversation was included. Officials
said, correctly, that nobody was listening to the calls. Critics answered that
nobody needed to. A record of who calls whom shows who is a doctor's patient, who
calls a suicide hotline at three in the morning, who talks to a journalist the
week before a leak, who belongs to which church and which union. In a 2014 debate
Michael Hayden, a former director of both the NSA and the CIA, put it in six
words: "We kill people based on metadata."

Everything in the first fourteen chapters of book 1 protects **content**. TLS
(RFC 8446) hides the page you read, Signal hides the words you send, disk
encryption hides your files. None of them hides **metadata**: the facts about a
communication rather than in it. When your browser fetches a page over TLS, anyone
on the path still sees your IP address, the server's IP address, usually the
server's name in the TLS handshake, the time, and the size and rhythm of every
packet. From those alone an observer can often tell which page you read. A
messaging server that cannot read your messages still knows who sent a message to
whom, from which address, and when.

Hiding metadata is a harder problem than hiding content, for three reasons.

1. **The network needs addresses.** A packet must say where it is going, and the
   reply must find its way back. Encryption cannot remove the address from the
   envelope without the postman losing the letter.
2. **Timing and size survive encryption.** A ciphertext is as long as its
   plaintext, give or take a tag, and leaves when it is sent. If Alice sends 3,000
   bytes at 10:00:00.000 and Bob receives 3,000 bytes at 10:00:00.080, encryption
   does nothing to hide the match.
3. **You cannot hide alone.** Anonymity means being indistinguishable from other
   people. If you are the only person using a hiding system, an observer knows the
   hidden traffic is yours. Anonymity is a crowd, and the crowd must be large,
   active and doing similar things.

The tools of this chapter answer these three problems in different ways. A
**mix** (§15.3) collects many messages, changes their appearance with
cryptography, and sends them out in a new order, so that the link between input
and output is lost. **Onion routing** (§15.7 to §15.11) sends traffic through a
chain of relays, each of which knows only its neighbors, fast enough for the web.
The **dining cryptographers** (§15.6) make a broadcast in which nobody can tell who
spoke, even with unlimited computing power. Newer designs (§15.14, §15.15) add
fake traffic and random delays, or settle for splitting knowledge between just two
companies. Figure 15.1 shows forty-five years of this work.

<figure class="mars-fig">
<svg viewBox="0 0 640 440" width="640" role="img" aria-label="Timeline of anonymous communication from Chaum's mixes in 1981 to Tor's Counter Galois Onion in 2025" fill="currentColor" font-size="14">
<line x1="72" y1="10" x2="72" y2="430" stroke="currentColor" stroke-width="1.6"/>
<text x="60" y="27" text-anchor="end" font-weight="bold">1981</text>
<circle cx="72" cy="22" r="3.5"/>
<text x="86" y="27">Chaum: mixes, untraceable return addresses, pseudonyms</text>
<text x="60" y="53" text-anchor="end" font-weight="bold">1988</text>
<circle cx="72" cy="48" r="3.5"/>
<text x="86" y="53">Chaum: the dining cryptographers</text>
<text x="60" y="79" text-anchor="end" font-weight="bold">1992</text>
<circle cx="72" cy="74" r="3.5"/>
<text x="86" y="79">Cypherpunk remailers; anon.penet.fi follows in 1993</text>
<text x="60" y="105" text-anchor="end" font-weight="bold">1995</text>
<circle cx="72" cy="100" r="3.5"/>
<text x="86" y="105">Mixmaster: fixed-size packets, batching</text>
<text x="60" y="131" text-anchor="end" font-weight="bold">1996</text>
<circle cx="72" cy="126" r="3.5"/>
<text x="86" y="131">Goldschlag, Reed, Syverson: onion routing at NRL</text>
<text x="60" y="157" text-anchor="end" font-weight="bold">2002</text>
<circle cx="72" cy="152" r="3.5"/>
<text x="86" y="157">Tor's first code and network</text>
<text x="60" y="183" text-anchor="end" font-weight="bold">2003</text>
<circle cx="72" cy="178" r="3.5"/>
<text x="86" y="183">Mixminion, the type III remailer</text>
<text x="60" y="209" text-anchor="end" font-weight="bold">2004</text>
<circle cx="72" cy="204" r="3.5"/>
<text x="86" y="209">Tor paper at USENIX Security; hidden services</text>
<text x="60" y="235" text-anchor="end" font-weight="bold">2006</text>
<circle cx="72" cy="230" r="3.5"/>
<text x="86" y="235">The Tor Project becomes a nonprofit</text>
<text x="60" y="261" text-anchor="end" font-weight="bold">2007</text>
<circle cx="72" cy="256" r="4.5" opacity="0.6"/>
<text x="86" y="261">Egerstad reads embassy mail at his exit relays</text>
<text x="60" y="287" text-anchor="end" font-weight="bold">2013</text>
<circle cx="72" cy="282" r="4.5" opacity="0.6"/>
<text x="86" y="287">NSA's "Tor Stinks" slides published; ntor handshake</text>
<text x="60" y="313" text-anchor="end" font-weight="bold">2014</text>
<circle cx="72" cy="308" r="4.5" opacity="0.6"/>
<text x="86" y="313">The relay-early confirmation attack</text>
<text x="60" y="339" text-anchor="end" font-weight="bold">2017</text>
<circle cx="72" cy="334" r="3.5"/>
<text x="86" y="339">Loopix; onion services v3 in testing</text>
<text x="60" y="365" text-anchor="end" font-weight="bold">2021</text>
<circle cx="72" cy="360" r="3.5"/>
<text x="86" y="365">iCloud Private Relay; v2 onion services retired</text>
<text x="60" y="391" text-anchor="end" font-weight="bold">2024</text>
<circle cx="72" cy="386" r="3.5"/>
<text x="86" y="391">Oblivious HTTP published as RFC 9458</text>
<text x="60" y="417" text-anchor="end" font-weight="bold">2025</text>
<circle cx="72" cy="412" r="3.5"/>
<text x="86" y="417">Tor announces Counter Galois Onion relay encryption</text>
</svg>
<figcaption>Figure 15.1. Anonymous communication from Chaum's mixes to today. The faded dots mark attacks and incidents.</figcaption>
</figure>

## 15.2 What anonymity means

*Level: beginner.*

The words in this field were sorted out in a long-running terminology paper by
Andreas Pfitzmann and Marit Hansen, first circulated in 2000 and revised many times
since. Their definitions are the ones this chapter uses.

- **Sender anonymity:** an observer cannot tell which of a set of possible senders
  sent a given message. **Recipient anonymity** is the same for receivers.
- **Unlinkability:** an observer cannot tell whether two things are related, for
  example whether a message going into a relay and a message coming out are the
  same message, or whether two visits to a website were made by the same person.
  **Relationship anonymity**, the property most systems in this chapter aim for,
  is unlinkability of sender and recipient: the observer may know that Alice sent
  something and that Bob received something, but not that Alice talked to Bob.
- **Unobservability:** an observer cannot even tell whether a message was sent at
  all. It needs cover traffic: fake messages indistinguishable from real ones.
- **Pseudonymity:** acting under a stable name that is not your real one. A
  pseudonym lets people build a reputation, and lets an observer link all of its
  actions together.

The basic measure is the **anonymity set**: the set of people who, as far as the
observer can tell, might have done the thing. If a mix takes in messages from 100
people and sends out 100, and nothing else links them, each output's anonymity set
has 100 members. Sets are often uneven. If the observer believes Alice sent a given
output with probability $1/2$ and 50 others with probability $1/100$ each, the set
still has 51 members, but Alice is in trouble. Claudia Díaz, Stefaan Seys, Joris
Claessens and Bart Preneel, and independently Andrei Serjantov and George Danezis,
both in 2002, proposed measuring anonymity by the Shannon entropy of the
observer's probabilities:

$$
H = -\sum_i p_i \log_2 p_i,
$$

and the **effective anonymity set size** $2^H$. For 100 equally likely senders,
$H = \log_2 100 \approx 6.64$ bits and the effective size is 100. For the uneven
case, $H = -\tfrac12 \log_2 \tfrac12 - 50 \cdot \tfrac{1}{100} \log_2 \tfrac{1}{100}
\approx 0.5 + 3.32 = 3.82$ bits, an effective size of about 14. Entropy is not the
whole story (it averages, and the person at the top of the list cares about the
maximum), but it gives designs a number to compare.

### Who is watching

Every design in this chapter is safe against some observers and not others.
Naming the observer is the first step of any honest claim.

- **A local observer** sees one link: your Wi-Fi, your internet provider, the
  website's provider. Almost every design here defeats it.
- **A relay-owning adversary** runs some of the servers. It can see, drop, delay
  or modify what passes through them. Anyone can run a Tor relay, so this
  adversary is real (§15.13).
- **An end-to-end adversary** sees both where traffic enters the system and where
  it leaves, for example a country's internet exchange that carries both a user's
  connection and the website's, or a party that runs both the first and last relay
  of a circuit. Low-latency systems such as Tor do not defend against it (§15.12).
- **A global passive adversary** sees every link in the network at once. It is the
  textbook adversary for mixes. Nobody may have that view in full, but the
  agencies of a few countries come close for traffic that crosses their cables.
- **An active adversary** sends, delays, replays and floods messages to learn
  something. Mixes must survive it (§15.4).

The three requirements pull against each other. Strong anonymity needs either
lots of delay (to mix) or lots of cover traffic (to hide the real messages), and
users want low latency and low bandwidth. A 2018 paper by Debajyoti Das, Sebastian
Meiser, Esfandiar Mohammadi and Aniket Kate made this precise as the **anonymity
trilemma**: strong anonymity, low bandwidth overhead and low latency, pick two.
Tor picks low latency and low overhead; the mixes of §15.3 and §15.14 pick
anonymity and pay in delay or cover traffic.

## 15.3 Chaum's mix

*Level: intermediate.*

In February 1981 *Communications of the ACM* printed a five-page paper by David
Chaum, then a graduate student at the University of California, Berkeley:
"Untraceable Electronic Mail, Return Addresses, and Digital Pseudonyms". Public-key
cryptography was four years old. Chaum used it for something its inventors had not
considered: not to hide what a letter said, but to hide who sent it to whom. The
paper invented the **mix**, the anonymous return address and the digital
pseudonym, and nearly every system in this chapter descends from it.

### The idea

A mix is a server with a public key. To send message $M$ to address $A$ through a
mix with public key $K_1$, Alice sends

$$
K_1(R_1, M, A),
$$

the encryption under $K_1$ of a random string $R_1$, the message and the address.
The mix decrypts, throws away $R_1$, and sends $M$ to $A$. An observer watching
the mix sees encrypted messages arrive and plaintext messages leave. If the mix
sent each output the moment its input arrived, the timing would link them. So the
mix waits until it has a **batch** of messages, decrypts them all, and sends the
outputs out together in a fixed order unrelated to the arrival order (Chaum said
lexicographic order). Now each output could have come from any input in the batch.

One mix must be trusted not to keep a log. So Chaum chained them into a
**cascade**: Alice wraps the message once for each mix, innermost layer for the
last mix:

$$
K_1\bigl(R_1,\; K_2(R_2, M, A)\bigr).
$$

Mix 1 removes the outer layer and passes $K_2(R_2, M, A)$ on; mix 2 removes the
inner layer and delivers. Mix 1 knows Alice sent something but not to whom; mix 2
knows what went to $A$ but not who sent it. As long as one mix in the cascade is
honest and batches properly, the link is broken. Figure 15.2 shows a cascade of
two mixes.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Four senders send encrypted messages to mix 1, which outputs them in sorted order to mix 2, which delivers them in sorted order to four recipients; the crossing lines are hidden from an observer" fill="currentColor" font-size="14">
<text x="60" y="24" text-anchor="middle" font-weight="bold">senders</text>
<rect x="20" y="40" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="62" text-anchor="middle">Alice</text>
<rect x="20" y="96" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="118" text-anchor="middle">Dave</text>
<rect x="20" y="152" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="174" text-anchor="middle">Erin</text>
<rect x="20" y="208" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="230" text-anchor="middle">Frank</text>
<rect x="190" y="60" width="100" height="160" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="240" y="122" text-anchor="middle" font-weight="bold">mix 1</text>
<text x="240" y="144" text-anchor="middle">collect 4,</text>
<text x="240" y="162" text-anchor="middle">peel, sort</text>
<rect x="370" y="60" width="100" height="160" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="420" y="122" text-anchor="middle" font-weight="bold">mix 2</text>
<text x="420" y="144" text-anchor="middle">collect 4,</text>
<text x="420" y="162" text-anchor="middle">peel, sort</text>
<line x1="100" y1="57" x2="186" y2="90" stroke="currentColor" stroke-width="1.3"/>
<line x1="100" y1="113" x2="186" y2="120" stroke="currentColor" stroke-width="1.3"/>
<line x1="100" y1="169" x2="186" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="100" y1="225" x2="186" y2="190" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="90" x2="366" y2="90" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="120" x2="366" y2="120" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="160" x2="366" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="190" x2="366" y2="190" stroke="currentColor" stroke-width="1.3"/>
<text x="580" y="24" text-anchor="middle" font-weight="bold">recipients</text>
<rect x="540" y="40" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="62" text-anchor="middle">address 3</text>
<rect x="540" y="96" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="118" text-anchor="middle">address 4</text>
<rect x="540" y="152" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="174" text-anchor="middle">address 7</text>
<rect x="540" y="208" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="230" text-anchor="middle">address 7</text>
<line x1="470" y1="90" x2="536" y2="57" stroke="currentColor" stroke-width="1.3"/>
<line x1="470" y1="120" x2="536" y2="113" stroke="currentColor" stroke-width="1.3"/>
<line x1="470" y1="160" x2="536" y2="169" stroke="currentColor" stroke-width="1.3"/>
<line x1="470" y1="190" x2="536" y2="225" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="262" text-anchor="middle">inside each mix the pairing of inputs to outputs is secret;</text>
<text x="320" y="284" text-anchor="middle">one honest mix in the chain is enough to break the link</text>
</svg>
<figcaption>Figure 15.2. A cascade of two mixes. Each waits for a full batch, removes its layer of encryption, and sends the results in sorted order, so arrival order says nothing about departure order.</figcaption>
</figure>

### By hand: a two-mix cascade with small RSA keys

Take two toy RSA keys (book 1, [Chapter 13](../../book/13-RSA.md)). Mix 2 has
$n_2 = 61 \cdot 53 = 3233$, $e = 17$, $d_2 = 2753$. Mix 1 has
$n_1 = 1009 \cdot 1013 = 1{,}022{,}117$, $e = 17$, and $d_1 = 17^{-1} \bmod
(1008 \cdot 1012) = 180{,}017$. Real mixes use keys of 2048 bits or more, or
elliptic curves; these are small enough to follow.

Alice wants to send the message $M = 42$ to the person at address $A = 7$. Numbers
must be packed into one integer per layer, so we use decimal digits as fields.

1. **Inner layer, for mix 2.** Alice picks a random $R_2 = 2$ and packs
   $(R_2, A, M)$ as $2\,|\,7\,|\,42 = 2742$. She encrypts:
   $c_2 = 2742^{17} \bmod 3233 = 2327$.
2. **Outer layer, for mix 1.** Alice picks $R_1 = 55$ and packs $(R_1, c_2)$ as
   $55\,|\,2327 = 552{,}327$, using four digits for $c_2$. She encrypts:
   $c_1 = 552327^{17} \bmod 1022117 = 516{,}584$, and sends $c_1$ to mix 1.
3. **Mix 1** computes $516584^{180017} \bmod 1022117 = 552{,}327$, drops the
   leading $R_1 = 55$, and holds $2327$ for the next batch to mix 2.
4. **Mix 2** computes $2327^{2753} \bmod 3233 = 2742$, reads $R_2 = 2$, address 7,
   message 42, and delivers 42 to address 7.

It is correct for the reason RSA is correct: each mix's $d$ undoes its $e$, and
the layers come off in the reverse of the order they went on. Mix 1 saw only
$516{,}584$ come in from Alice and $2327$ go out; it cannot open $2327$, which is
encrypted to mix 2. Mix 2 saw $2327$ come in from mix 1, not from Alice.

Now the batch. Dave, Erin and Frank send their own onions to mix 1 at about the
same time. Mix 1 waits for all four, decrypts them, and forwards the four inner
ciphertexts in increasing order: $99, 153, 654, 2327$. Alice's message left fourth
because $2327$ is the largest, not because she arrived first. Nothing in the
numbers or the order ties $2327$ to $516{,}584$, as long as nobody can compute
RSA decryption without $d_1$.

### Code it

The program builds the onion above, peels it, and runs the batch of four.

```python
# Chaum's two-mix cascade with toy RSA keys (real mixes use 2048-bit RSA or curves).
n2, e2, d2 = 3233, 17, 2753                         # mix 2: 61 * 53
p1, q1 = 1009, 1013                                  # mix 1
n1, e1 = p1 * q1, 17
d1 = pow(e1, -1, (p1 - 1) * (q1 - 1))
print("mix 1 key: n1 =", n1, " d1 =", d1)

def wrap(message, address, r2, r1):
    inner = r2 * 1000 + address * 100 + message       # (R2, A, M) for mix 2
    c2 = pow(inner, e2, n2)
    outer = r1 * 10000 + c2                           # (R1, c2) for mix 1
    return inner, c2, pow(outer, e1, n1)

inner, c2, c1 = wrap(42, 7, r2=2, r1=55)
print("inner =", inner, " c2 =", c2, " c1 =", c1)

x = pow(c1, d1, n1)                                   # mix 1 peels its layer
print("mix 1 decrypts", x, "-> drops R1 =", x // 10000, ", forwards", x % 10000)
y = pow(x % 10000, d2, n2)                            # mix 2 peels the last layer
print("mix 2 decrypts", y, "-> R2 =", y // 1000, ", address", y // 100 % 10, ", message", y % 100)

# A batch at mix 1: four senders, outputs sent in sorted order.
batch = {"Alice": wrap(42, 7, 2, 55)[2], "Dave": wrap(13, 3, 5, 71)[2],
         "Erin": wrap(88, 7, 9, 12)[2], "Frank": wrap(5, 4, 1, 90)[2]}
for who, c in batch.items():
    print(f"in : {who:5} sends {c:7}")
outs = sorted(pow(c, d1, n1) % 10000 for c in batch.values())
print("out:", outs)
```

It prints:

```
mix 1 key: n1 = 1022117  d1 = 180017
inner = 2742  c2 = 2327  c1 = 516584
mix 1 decrypts 552327 -> drops R1 = 55 , forwards 2327
mix 2 decrypts 2742 -> R2 = 2 , address 7 , message 42
in : Alice sends  516584
in : Dave  sends  390300
in : Erin  sends  777157
in : Frank sends  207679
out: [99, 153, 654, 2327]
```

### Break it: why the random strings are there

RSA as used here is deterministic: the same plaintext always gives the same
ciphertext. Suppose Alice left out $R_2$. An observer sees mix 2 deliver message
42 to address 7. It knows mix 2's public key, so it packs $(7, 42)$ itself,
encrypts it, and looks for the result among mix 2's inputs. The match tells it
which input became this output, and the mix's batching is worthless. With a random
$R_2$ the observer must guess $R_2$ too. In our toy $R_2$ is one digit, so the
guessing is easy:

```python
n2, e2 = 3233, 17
entered_mix2 = [99, 153, 654, 2327]       # the four inputs mix 2 received
delivered = (7, 42)                        # mix 2 handed message 42 to address 7
for r in range(10):                        # R2 = 0 is "no random string at all"
    guess = pow(r * 1000 + delivered[0] * 100 + delivered[1], e2, n2)
    if guess in entered_mix2:
        print("R2 =", r, "re-encrypts to", guess, "-> output linked to its input")
print("guesses needed with a 128-bit R2:", 2**128)
```

```
R2 = 2 re-encrypts to 2327 -> output linked to its input
guesses needed with a 128-bit R2: 340282366920938463463374607431768211456
```

Chaum's random strings are the first appearance in this chapter of a rule that
returns again and again: anything an observer can recompute, it can match. Today
the same job is done by randomized public-key encryption (RSA-OAEP, or a fresh
Diffie-Hellman key per message, as in the Sphinx format of §15.14).

Chaum saw a second attack in 1981: **replay**. If the observer copies Alice's
$c_1$ and sends it to mix 1 again in a later batch, the same $2327$ comes out of
both batches, and the only output common to the two batches is Alice's. So a mix
must remember what it has processed and refuse duplicates. Every mix since has
needed a replay cache, and the cache must be cleared somehow, usually by changing
keys on a schedule so that old messages simply fail to decrypt.

### Return addresses and pseudonyms

Chaum also showed how Bob can reply to Alice without learning who she is. Alice
makes an **untraceable return address**: $K_1(R_1, A_x)$ together with a fresh
public key $K_x$ of her own, where $A_x$ is her real address. Bob encrypts his
reply under $K_x$ and sends it with the return address to mix 1. The mix decrypts
the address, learns $A_x$, encrypts the reply further with $R_1$ used as a key so
that its appearance changes, and delivers it. Only Alice, who knows $R_1$ and the
secret half of $K_x$, can read it. A long-lived public key used this way, with
signed messages, is a **digital pseudonym**: a name others can recognize and reply
to, attached to nobody. The remailers of §15.5 and the onion services of §15.11
both rebuilt this idea.

!!! note "Life story: Chaum's mix"
    **Born:** 1981, David Chaum, a graduate student at UC Berkeley, in
    *Communications of the ACM* · **Purpose:** to hide who sends mail to whom by
    passing it through servers that decrypt, batch, reorder and forward ·
    **Helped:** the remailers of the 1990s, onion routing and Tor, Mixminion,
    Loopix and Nym, and the verifiable mix-nets used to count electronic ballots
    ([Chapter 16](16-Electronic-Voting.md)) · **Status:** current; the basic design
    for every high-latency anonymity system

## 15.4 Batching, and the attacks on it

*Level: intermediate.*

Encryption makes the outputs of a mix look unrelated to its inputs. Batching makes
their order and timing unrelated too. Without the second, the first is useless,
because arrival order alone links the messages. The program below plays the
observer. A thousand messages pass through a mix; the observer knows the order of
senders going in and the order of recipients coming out, and pairs them as best it
can. With no batching (first in, first out) it pairs them all correctly. With a
**threshold mix** that waits for $n$ messages and shuffles them, every pairing
inside a batch looks the same to the observer, so its best guess is right with
probability $1/n$.

```python
# Who can an observer link? A mix that forwards at once, and a threshold mix.
# random is fine for a simulation; real mixes shuffle with the secrets module.
import random
random.seed(15)

def no_batching(arrivals):
    return list(arrivals)                     # first in, first out

def threshold_mix(arrivals, n):
    out = []
    for i in range(0, len(arrivals), n):
        batch = arrivals[i:i + n]
        random.shuffle(batch)                 # the mix shuffles each full batch
        out += batch
    return out

def observer_score(arrivals, outputs, n):
    # The observer sees who sent in which order, and which recipient got each
    # output. Within a batch every pairing looks the same, so it guesses at random.
    right = 0
    for i in range(0, len(arrivals), n):
        guess = arrivals[i:i + n]
        random.shuffle(guess)
        right += sum(g == o for g, o in zip(guess, outputs[i:i + n]))
    return right / len(arrivals)

senders = [f"s{i}" for i in range(1000)]      # each message stands for its sender
print("no batching   :", observer_score(senders, no_batching(senders), 1))
for n in (5, 20, 100):
    print(f"batch of {n:3}  :", observer_score(senders, threshold_mix(senders, n), n))

# The n-1 attack: hold back every honest message except the target's, then
# fill the batch with the attacker's own, which it can recognize on the way out.
batch = ["target"] + [f"mine{i}" for i in range(4)]
out = threshold_mix(batch, 5)
print("mix output    :", out)
print("left over     :", [m for m in out if not m.startswith("mine")])
```

```
no batching   : 1.0
batch of   5  : 0.203
batch of  20  : 0.054
batch of 100  : 0.009
mix output    : ['mine0', 'target', 'mine1', 'mine2', 'mine3']
left over     : ['target']
```

The scores match $1/n$: $0.2$, $0.05$ and $0.01$, up to the luck of the draw.

### Kinds of mix

Mix designers have tried several ways to decide when to send.

- **Threshold mix:** send when $n$ messages have arrived. Simple, but when traffic
  is light a message may wait for hours.
- **Timed mix:** send everything every $t$ seconds. The delay is bounded, but a
  quiet period may leave one message alone in its batch, with an anonymity set of
  one.
- **Pool mix:** at each round, send all but a pool of $f$ messages, chosen at
  random, and keep the pool for the next round. A message may stay for several
  rounds, so its anonymity set reaches back into earlier batches. Mixmaster
  (§15.5) used a timed pool mix.
- **Continuous mix:** delay each message independently by a random amount.
  Dogan Kesdogan, Jan Egner and Roland Büschkes proposed the **stop-and-go mix**
  in 1998: the sender picks each delay from an exponential distribution. Because
  the exponential distribution has no memory, a message that has already waited
  ten seconds is no more likely to leave next than one that just arrived, so the
  observer learns nothing from how long a message has been inside. Loopix
  (§15.14) uses the same idea.

### Break it: the $n-1$ attack

The last lines of the program show the oldest active attack on a mix. An adversary
who controls the links into a threshold mix lets the target's message through,
holds back everybody else's, and fills the batch with $n-1$ messages of its own.
The mix shuffles faithfully. The adversary recognizes its own $n-1$ outputs, and
the one left over is the target's. Andrei Serjantov, Roger Dingledine and Paul
Syverson classified these **blending attacks** in 2002, under the title "From a
Trickle to a Flood": trickle the honest messages, flood with fake ones. Every
batching rule above can be attacked this way, at different costs. Pool mixes
make the attacker flush the pool over several rounds; timed mixes force it to
block everyone for a whole period.

The defenses are partial. Mixes can require senders to pay for each message, or
to prove they are distinct people (both are hard on an open network). A mix can
send its own **cover traffic**: George Danezis and Len Sassaman proposed in 2003
that each mix send "heartbeat" messages to itself through the network, so it notices
when its own messages stop coming back, a sign that someone is holding its traffic.
Loopix (§15.14) built that idea in from the start.

### Break it: the long-term intersection

Batching protects one message. People send many. Suppose Alice writes to Bob every
day through a mix, and an observer sees, each day, which recipients received mail
from the batch that contained Alice's message:

| day | recipients of Alice's batch |
| --- | --- |
| 1 | Bob, Carol, Dan |
| 2 | Bob, Erin, Fay |
| 3 | Bob, Carol, Gus |

Only Bob is in all three sets. Dogan Kesdogan, Dakshi Agrawal and Stefan Penz
described this **intersection** or **disclosure attack** in 2002. In real traffic
the sets overlap more and Alice writes to several people, so George Danezis turned
it in 2003 into the **statistical disclosure attack**: add up, over many rounds, how
often each recipient appears when Alice sends and subtract how often it appears
when she does not. Her regular correspondents stand out from the noise as the
rounds pile up. No mix design defeats it completely, because it uses only what
must be visible: who was active when. Cover traffic, sent whether or not the user
has anything to say, slows it down, at a cost in bandwidth that most users will not
pay.

## 15.5 Remailers: anonymous mail in the 1990s

*Level: beginner.*

Chaum's paper waited a decade for a network to run on. When it came, the first
anonymous mail service in wide use did not follow it at all.

In 1993 Johan Helsingius, a Finnish systems administrator known as Julf, opened
anon.penet.fi. You mailed the server; it stripped your headers, gave you a
pseudonym of the form an12345@anon.penet.fi, and forwarded your message to its
destination or newsgroup. Replies to the pseudonym came back to your real address.
It was easy to use and popular with people posting about abuse, addiction, sexuality
and whistleblowing; it reportedly handled thousands of messages a day, and the
number of registered pseudonyms is usually given as several hundred thousand,
though no audited count exists. It was also a single machine holding a table of
every pseudonym and its real address. In February 1995 the Church of Scientology,
which said an anonymous user had posted its copyrighted documents, obtained a
Finnish police search warrant, and Helsingius gave up that one user's identity.
When new demands for user identities came in 1996, and a court case suggested that
Finnish law gave him no protection, he shut the service down. His announcement is
dated 30 August 1996.

The lesson was the one Chaum had built into his design: a single operator who
knows both ends will be made to tell. The **Cypherpunk remailers**, written in 1992
by Eric Hughes and Hal Finney on the cypherpunks mailing list, did it differently.
You encrypted your message with PGP to a remailer, which decrypted it and forwarded
it according to a header inside; by nesting encryptions you could chain several
remailers, each knowing only the previous and next hop. These **type I** remailers
were mixes in spirit but not in detail: messages shrank at each hop, were often
forwarded immediately, and could be replayed.

Lance Cottrell's **Mixmaster** (1995), the **type II** remailer, fixed most of
that. Every message was padded to the same size and split into fixed-size packets;
each hop's header was encrypted to that hop with RSA and the body with triple DES;
remailers kept a pool and sent at timed intervals; and each remailer kept a replay
cache. Chains of up to twenty remailers were possible. Mixmaster ran for over two
decades on a few dozen volunteer servers; by the 2010s only a handful were left.

The **type III** remailer, **Mixminion** (2003), by George Danezis, Roger
Dingledine and Nick Mathewson, was the most careful design of the series. It added
**single-use reply blocks** whose replies look exactly like forward messages (so an
observer cannot even tell a reply from a new message), link encryption between
remailers with forward secrecy, key rotation to bound replay caches, and signed
directories listing the remailers. It never had many users, and two of its authors
went on to work full time on a different design, Tor (§15.8).

Remailers faded for reasons that had little to do with cryptography. They were
slow and hard to use; spammers and harassers abused them, so operators faced
complaints and legal risk; and the internet moved from mail and newsgroups to the
interactive web, which a mix that holds messages for hours cannot serve. With few
users, the anonymity sets shrank, which made the systems less safe, which kept
users away. Dingledine and Mathewson later named the effect in the title of a 2006
paper: "Anonymity Loves Company".

!!! note "Life story: anon.penet.fi"
    **Born:** 1993, Johan Helsingius in Finland · **Purpose:** pseudonymous email
    and newsgroup posting by a simple forwarding server · **Helped:** showed how
    much demand there was for anonymous speech, and, by its end, why one operator
    with a lookup table is not anonymity · **Retired:** 30 August 1996, after legal
    demands for user identities · **Replaced by:** the Cypherpunk and Mixmaster
    remailer networks

!!! note "Life story: Mixmaster and Mixminion"
    **Born:** Mixmaster (type II), Lance Cottrell, 1995; Mixminion (type III),
    George Danezis, Roger Dingledine and Nick Mathewson, IEEE Security and Privacy
    2003 · **Purpose:** Chaum mixes for real email: fixed-size packets, pools,
    replay caches, and in Mixminion indistinguishable replies · **Helped:** set the
    design vocabulary for later mix-nets; Mixminion's authors carried its lessons
    into Tor and its packet ideas into Sphinx · **Retired:** both are effectively
    unused; Mixminion development stopped in the late 2000s · **Replaced by:** Tor
    for interactive use; Loopix-style mix-nets such as Nym for high-latency use

## 15.6 The dining cryptographers

*Level: intermediate.*

Every mix has a weakness the mathematics cannot remove: it relies on computational
assumptions (RSA, Diffie-Hellman) and on at least one honest server. In 1988 Chaum
published a protocol with neither, in the first issue of the *Journal of
Cryptology*, under the title "The Dining Cryptographers Problem: Unconditional
Sender and Recipient Untraceability".

He told it as a story. Three cryptographers have dinner. The waiter tells them the
bill has been paid anonymously. Either one of them paid, or the NSA did. They
respect each other's right to pay in secret, but they want to know whether the NSA
paid. Each pair of diners flips a coin behind a menu, so that only those two see
it; each diner therefore sees two coins. Then each diner says aloud the XOR of the
two coins she saw, that is, "same" (0) or "different" (1), except that a diner who
paid says the opposite. The XOR of the three announcements is 1 if one of them
paid and 0 if the NSA did, and it says nothing about which diner paid.

### By hand: one round

Call the diners Alice, Bob and Carol, and the coins $k_{AB}$, $k_{BC}$ and $k_{AC}$.
Say the coins come up $k_{AB} = 1$, $k_{BC} = 0$, $k_{AC} = 1$, and Alice paid
(her message bit is $m_A = 1$; the others' are 0).

$$
\begin{aligned}
\text{Alice says } & k_{AB} \oplus k_{AC} \oplus m_A = 1 \oplus 1 \oplus 1 = 1,\\
\text{Bob says } & k_{AB} \oplus k_{BC} = 1 \oplus 0 = 1,\\
\text{Carol says } & k_{BC} \oplus k_{AC} = 0 \oplus 1 = 1.
\end{aligned}
$$

The XOR of the three is $1 \oplus 1 \oplus 1 = 1$: someone at the table paid.

**Why it is correct.** Every coin appears in exactly two announcements, so in the
XOR of all three each coin cancels ($k \oplus k = 0$), and what is left is
$m_A \oplus m_B \oplus m_C$, the XOR of the messages. If at most one diner sends
a 1, that is exactly her bit.

**Why it is anonymous.** Look at it from Bob's seat. He knows $k_{AB} = 1$ and
$k_{BC} = 0$, and he did not pay. He hears Alice say 1 and Carol say 1. Could
Carol have paid instead? If Carol paid, her announcement $0 \oplus k_{AC} \oplus 1
= 1$ means $k_{AC} = 0$, and then Alice's announcement $1 \oplus 0 = 1$ is also
consistent. If Alice paid, $k_{AC} = 1$ as above. Both stories fit what Bob heard
exactly, and they differ only in the coin $k_{AC}$, which Bob never saw and which
was a fair coin. So the two stories are equally likely in Bob's eyes, whatever
computing power he has. This is the one-time pad's argument (book 1,
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)) in a new setting: a
key bit that is uniformly random and used once hides perfectly.

Figure 15.3 draws the table.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three diners in a triangle; each edge carries a shared coin; each diner announces the XOR of her two coins, and Alice also XORs in her message bit; the XOR of all three announcements is the message" fill="currentColor" font-size="14">
<rect x="250" y="20" width="140" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="43" text-anchor="middle" font-weight="bold">Alice (paid)</text>
<text x="320" y="64" text-anchor="middle">says 1⊕1⊕1 = 1</text>
<rect x="60" y="200" width="140" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="130" y="223" text-anchor="middle" font-weight="bold">Bob</text>
<text x="130" y="244" text-anchor="middle">says 1⊕0 = 1</text>
<rect x="440" y="200" width="140" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="510" y="223" text-anchor="middle" font-weight="bold">Carol</text>
<text x="510" y="244" text-anchor="middle">says 0⊕1 = 1</text>
<line x1="270" y1="76" x2="160" y2="200" stroke="currentColor" stroke-width="1.4"/>
<line x1="370" y1="76" x2="480" y2="200" stroke="currentColor" stroke-width="1.4"/>
<line x1="200" y1="228" x2="440" y2="228" stroke="currentColor" stroke-width="1.4"/>
<text x="168" y="130" text-anchor="middle">k_AB = 1</text>
<text x="472" y="130" text-anchor="middle">k_AC = 1</text>
<text x="320" y="218" text-anchor="middle">k_BC = 0</text>
<text x="320" y="128" text-anchor="middle" opacity="0.8">each coin is seen</text>
<text x="320" y="148" text-anchor="middle" opacity="0.8">by two diners only</text>
<text x="320" y="288" text-anchor="middle">XOR of announcements: 1 ⊕ 1 ⊕ 1 = 1 = Alice's bit, but whose bit?</text>
</svg>
<figcaption>Figure 15.3. The dining cryptographers. Each coin enters the total twice and cancels; only the message survives. Bob cannot tell whether Alice or Carol paid, because the one coin that would tell him is the one he did not see.</figcaption>
</figure>

### From one bit to a channel

To send a message instead of one bit, the diners share long random strings instead
of coins, one per pair, and announce the XOR of their strings, with the sender
also XORing in her message. Chaum called the result a **DC-net**. It works for any
number $n$ of people: each pair shares a key, everyone announces the XOR of all
their keys, and the sender adds her message. Colluders can pool their keys, and
what they learn is limited by a simple rule: the sender is hidden among all the
honest participants who remain connected to her by shared keys the colluders do not
know. In practice the pads come from a key exchange and a stream cipher, which
replaces perfect secrecy with computational secrecy, but keeps the structure.

```python
# One round of a three-party DC-net. Each pair shares a random pad; every party
# announces the XOR of its pads, and the sender also XORs in the message.
# random is for a repeatable demo; real pads come from a key exchange or secrets.
import random
random.seed(1988)

def pad(n):
    return bytes(random.getrandbits(8) for _ in range(n))

def xor(*parts):
    out = bytes(len(parts[0]))
    for p in parts:
        out = bytes(a ^ b for a, b in zip(out, p))
    return out

def round_(messages, size=16):
    k_ab, k_bc, k_ac = pad(size), pad(size), pad(size)
    zero = bytes(size)
    say = {
        "Alice": xor(k_ab, k_ac, messages.get("Alice", zero)),
        "Bob":   xor(k_ab, k_bc, messages.get("Bob", zero)),
        "Carol": xor(k_bc, k_ac, messages.get("Carol", zero)),
    }
    for who, s in say.items():
        print(f"  {who:5} announces {s.hex()}")
    return xor(*say.values())

print("Bob sends, the others are silent:")
print("  result:", round_({"Bob": b"I paid for this!"}))
print("Alice and Carol both send (a collision):")
m1, m2 = b"meet at airlock ", b"dinner is at six"
result = round_({"Alice": m1, "Carol": m2})
print("  result:", result)
print("  equals Alice's message XOR Carol's:", result == xor(m1, m2))
```

```
Bob sends, the others are silent:
  Alice announces fb90027ce5f87a431ec8b5fee16ceaab
  Bob   announces 8ab78e63b41952829e970db9e0761f5e
  Carol announces 3807fc7e388508a7ef2d9833697386d4
  result: b'I paid for this!'
Alice and Carol both send (a collision):
  Alice announces 68586f08c8e5cce64ad124a7a9ff5111
  Bob   announces 38d5d8e38272125362238272927e8ae3
  Carol announces 5981bcf10f848afc3abbb5cd7491d9aa
  result: b'\t\x0c\x0b\x1aE\x13TI\x12I\x13\x18O\x10\x02X'
  equals Alice's message XOR Carol's: True
```

The three announcements in each round look random, and Bob's message comes out of
their XOR without any of them pointing to Bob.

### Break it: collisions and jammers

The second round shows the first practical problem. A DC-net is a shared
broadcast channel, and when two people send in the same slot their messages XOR
together into garbage. Real DC-nets add a **reservation** phase: a short round in
which each would-be sender sets one bit at a random position, so that senders can
see which slots are taken and each use its own. Collisions in the reservation round
are resolved by retrying.

The second problem is worse. A participant who wants to silence the group simply
XORs random bits into every round. Everyone's messages turn to garbage, and the
protocol's own anonymity hides who did it. Chaum suggested traps; later work made
DC-nets accountable. Philippe Golle and Ari Juels (2004) added zero-knowledge
proofs that each announcement was formed correctly. Henry Corrigan-Gibbs and Bryan
Ford's **Dissent** (2010) combined a verifiable shuffle (§15.16) with a DC-net, so
that a disruptor can be traced and expelled without unmasking honest senders; later
versions moved most of the work onto a few servers to scale to thousands of
clients. Riposte (Corrigan-Gibbs, Boneh and Mazières, 2015) used distributed point
functions to build an anonymous bulletin board in the same spirit.

The third problem is cost. Everyone must send in every round, whether they have
anything to say or not, and with $n$ participants there are up to $n(n-1)/2$ shared
keys. DC-nets give the strongest anonymity in this chapter, unobservability
included, and they scale worst. They live on in small groups, in research systems,
and as a building block, including in electronic voting, where a closely related
idea, the verifiable shuffle, matters most ([Chapter 16](16-Electronic-Voting.md)).

!!! note "Life story: the dining cryptographers network"
    **Born:** 1988, David Chaum, in the first volume of the *Journal of
    Cryptology* · **Purpose:** a broadcast channel in which nobody can tell who
    sent a message, even with unlimited computing power · **Helped:** Herbivore
    (2003), Dissent (2010) and its successors, Riposte (2015), and the theory of
    information-theoretic anonymity · **Status:** current in research and small
    groups; its cost in traffic keeps it out of mass use

## 15.7 Onions: one key per hop

*Level: intermediate.*

Chaum's cascade wrapped a message in one layer of encryption per mix. Strip away
the batching and that wrapping is an **onion**: a packet with one layer for each
relay on the path, built from the inside out by the sender, peeled from the outside
in by the relays. Each relay removes its layer and finds two things: the address of
the next hop, and a smaller onion it cannot open. No relay sees both the sender and
the destination. Figure 15.4 shows a three-layer onion.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A three-layer onion: the outer layer for relay A holds 'next B' and the layer for B, which holds 'next C' and the layer for C, which holds 'next bob' and the message; each relay removes one layer" fill="currentColor" font-size="14">
<rect x="20" y="30" width="600" height="150" rx="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="34" y="54">layer for A (key k_A):  next = B</text>
<rect x="60" y="66" width="540" height="102" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="74" y="90">layer for B (key k_B):  next = C</text>
<rect x="100" y="102" width="480" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="114" y="126">layer for C (key k_C):  next = bob</text>
<text x="114" y="148">"meet at the north airlock at 9"</text>
<text x="50" y="214" font-weight="bold">A sees:</text>
<text x="130" y="214">the sender and B; 198 bytes in, 142 out</text>
<text x="50" y="238" font-weight="bold">B sees:</text>
<text x="130" y="238">A and C; 142 bytes in, 86 out</text>
<text x="50" y="262" font-weight="bold">C sees:</text>
<text x="130" y="262">B, bob and the message; 86 bytes in, 30 out</text>
</svg>
<figcaption>Figure 15.4. A three-layer onion. Each relay learns only its neighbors. The shrinking sizes are a leak, taken up in the Break it below.</figcaption>
</figure>

### Code it: build and peel

The program below builds and peels an onion for relays A, B and C. It needs a
cipher, and the standard library has none, so it uses a **teaching cipher**: the
keystream is HMAC-SHA256 of a nonce and a counter (HMAC used as a pseudorandom
function, in counter mode, like the stream ciphers of book 1,
[Chapter 5](../../book/05-Stream-Ciphers.md)), and an HMAC-SHA256 tag over the
nonce and ciphertext detects tampering. This is encrypt-then-MAC with separate keys
and is sound in principle, but it is slow and unreviewed; real systems use AES or
ChaCha20 with an authenticated mode. The relays' keys are shared with the sender in
advance here; in a mix-net each layer would carry its own Diffie-Hellman share, and
in Tor the keys come from the circuit handshake of §15.9.

```python
# A three-layer onion. TEACHING CIPHER: HMAC-SHA256 in counter mode for the
# keystream, plus an HMAC-SHA256 tag. Real systems use AES or ChaCha20 with an AEAD.
import hmac, hashlib, secrets

def keystream(key, nonce, n):
    out, counter = b"", 0
    while len(out) < n:
        out += hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        counter += 1
    return out[:n]

def subkeys(key):
    return (hmac.new(key, b"encrypt", hashlib.sha256).digest(),
            hmac.new(key, b"authenticate", hashlib.sha256).digest())

def seal(key, plaintext):
    enc, mac = subkeys(key)
    nonce = secrets.token_bytes(16)
    ct = bytes(a ^ b for a, b in zip(plaintext, keystream(enc, nonce, len(plaintext))))
    return nonce + ct + hmac.new(mac, nonce + ct, hashlib.sha256).digest()

def unseal(key, packet):
    enc, mac = subkeys(key)
    nonce, ct, tag = packet[:16], packet[16:-32], packet[-32:]
    if not hmac.compare_digest(tag, hmac.new(mac, nonce + ct, hashlib.sha256).digest()):
        raise ValueError("bad tag: packet was changed")
    return bytes(a ^ b for a, b in zip(ct, keystream(enc, nonce, len(ct))))

keys = {name: secrets.token_bytes(32) for name in ("A", "B", "C")}
route = ["A", "B", "C"]

def build(message, route, destination):
    packet, next_hop = message, destination
    for relay in reversed(route):                     # innermost layer first
        packet = seal(keys[relay], next_hop.encode().ljust(8, b"\0") + packet)
        next_hop = relay
    return packet

def relay_step(name, packet):
    plain = unseal(keys[name], packet)
    next_hop, inner = plain[:8].rstrip(b"\0").decode(), plain[8:]
    print(f"{name}: got {len(packet):3} bytes, learns only 'next = {next_hop}', forwards {len(inner):3}")
    return next_hop, inner

packet = build(b"meet at the north airlock at 9", route, "bob")
hop = "A"
while hop in keys:
    hop, packet = relay_step(hop, packet)
print(hop, "reads:", packet.decode())

bad = bytearray(build(b"meet at the north airlock at 9", route, "bob"))
_, inner = relay_step("A", bytes(bad))
inner = bytearray(inner); inner[40] ^= 1              # someone flips one bit on the A-B link
try:
    relay_step("B", bytes(inner))
except ValueError as err:
    print("B:", err)
```

```
A: got 198 bytes, learns only 'next = B', forwards 142
B: got 142 bytes, learns only 'next = C', forwards  86
C: got  86 bytes, learns only 'next = bob', forwards  30
bob reads: meet at the north airlock at 9
A: got 198 bytes, learns only 'next = B', forwards 142
B: bad tag: packet was changed
```

The keys and nonces come from `secrets`, so they differ on every run, but the
sizes and hops printed do not. Each relay learned exactly one fact about the
route: its successor. A changed bit is caught by the next relay's tag.

### Break it: the onion's size tells its position

Look at the sizes: 198, 142, 86, 30. Each layer adds 8 bytes of address, a 16-byte
nonce and a 32-byte tag, so every relay can work out how many layers remain. Relay
A knows it is first, so the machine that sent it 198 bytes is the sender, not
another relay. Relay C knows it is last. An observer on any link learns the same.
Worse, the size of the message itself shows through every layer, so a 30-byte
message and a 3,000-byte message are easy to tell apart and to follow.

The fix is to make every packet on every link the same size, whatever its position
and content. Mix-nets do it with a fixed-size header that is padded as it is peeled:
in the **Sphinx** format of George Danezis and Ian Goldberg (2009), each relay
removes its part of the header and appends filler computed so that the header keeps
its length and the next relay cannot tell how much path is left. Tor does it with
fixed-size **cells** and a length-preserving cipher, so that a cell is 509 bytes of
payload at every hop (§15.10). Both also cut long messages into fixed-size pieces,
which lets the size of a whole message leak through the number of pieces. That is
one reason why padding policy remains an open question.

### Mixes and onion routers are different machines

The two designs share the onion and differ in almost everything else. A mix-net
message carries its keys inside it: each layer has a fresh public-key share, so a
message can be sent with no setup, and every message is processed on its own,
delayed and shuffled. An onion router sets up a **circuit** once, with a handshake
per hop, and then sends many small cells through it with cheap symmetric
encryption and no deliberate delay. The circuit makes interactive traffic such as
web pages possible. It also makes every circuit a long-lived stream of cells whose
timing an end-to-end observer can match (§15.12). The rest of the chapter's middle
is about that bargain.

## 15.8 From the Naval Research Laboratory to Tor

*Level: beginner.*

In the mid-1990s three researchers at the US Naval Research Laboratory in
Washington, David Goldschlag, Michael Reed and Paul Syverson, asked how
government staff could use the public internet without revealing who was talking
to whom: an investigator visiting a website without the site seeing a ".navy.mil"
address, or a field office contacting headquarters without advertising the link.
Chaum's mixes were too slow for web browsing and remote login. Their answer, first
published as "Hiding Routing Information" at the Information Hiding workshop in
Cambridge in May 1996, kept the layered encryption and dropped the batching. They
called it **onion routing**. The first prototypes ran on a handful of machines at
the laboratory, with funding from the Office of Naval Research and DARPA.

The researchers saw early that their sponsor could not hide alone. A network
used only by the US Navy tells an observer that any traffic on it is the US Navy's.
Onion routing would protect government users only if it also carried traffic from
journalists, businesses, activists and ordinary people. That argument is why an
anonymity network built with military funding was released as free software and
opened to everyone, and it has kept being misunderstood in both directions ever
since.

Commercial and academic designs came and went around the turn of the century. The
Freedom Network of the Montreal company Zero-Knowledge Systems carried paying
customers' traffic through onion-routed paths from 1999 and closed in 2001, unable
to cover its costs. The Java Anon Proxy, later JonDonym, built at the Technical
University of Dresden from 2000, used fixed mix cascades run by known
organizations.

In 2002 Syverson started a second-generation design with two young programmers,
Roger Dingledine and Nick Mathewson, both MIT graduates who had worked on
anonymity before (Dingledine on the Free Haven storage project). They called it
**Tor**, first spelled TOR for "The Onion Router"; the project asks that it be
written Tor. Its first code appeared in September 2002 and a small network ran
from that autumn. The design paper, "Tor: The Second-Generation Onion Router",
appeared at the USENIX Security Symposium in August 2004. It listed what was new:
**perfect forward secrecy** through telescoping circuits built one hop at a time
with ephemeral Diffie-Hellman keys, instead of onions encrypted with the relays'
long-term RSA keys; many TCP streams sharing one circuit; a small group of
**directory servers** that tell everyone which relays exist; **exit policies**
that let each relay say which destinations it will contact; end-to-end integrity
checks; congestion control; and **location-hidden services**, servers reachable
through Tor whose own location stays hidden (§15.11). It also said plainly what Tor
would not do: it would not mix, pad or batch, because no known way of doing so
cheaply stopped an end-to-end observer, and it would not protect against one.

The Electronic Frontier Foundation funded the project in 2004 and 2005. In December
2006 Dingledine, Mathewson and five others founded The Tor Project, Inc., a
nonprofit based in Massachusetts. For many years most of its budget came from US
government grants, the State Department and research agencies among them, a fact
its critics and its supporters both point to; it has since drawn more from
foundations and individual donors. In 2008 the project began shipping the **Tor
Browser**, a modified Firefox that routes everything through Tor and works to make
every user's browser look the same. Today, by the project's own estimates, which
come from directory requests and are approximate by design, two to three million
people connect to Tor on a typical day, through roughly seven to eight thousand
volunteer relays.

!!! note "Life story: onion routing"
    **Born:** 1996, David Goldschlag, Michael Reed and Paul Syverson at the US Naval
    Research Laboratory ("Hiding Routing Information", Information Hiding workshop) ·
    **Purpose:** anonymous connections fast enough for interactive use, by layered
    encryption without batching · **Helped:** the Freedom Network, Tor, I2P's garlic
    routing, and every low-latency anonymity system since · **Status:** current; its
    second generation is Tor

!!! note "Life story: Tor"
    **Born:** first code September 2002 (Roger Dingledine, Nick Mathewson, Paul
    Syverson); paper at USENIX Security, August 2004; The Tor Project, Inc. founded
    December 2006 · **Purpose:** low-latency anonymous TCP connections over
    volunteer relays, and servers whose location is hidden · **Helped:** journalists,
    dissidents and ordinary users under censorship, whistleblowing platforms such
    as SecureDrop, and millions of people a day who want a website not to know who
    they are · **Status:** current; the largest anonymity network ever run

## 15.9 How Tor builds a circuit

*Level: intermediate.*

A Tor client needs to do four things before it can fetch a page: learn which relays
exist, choose three of them, agree on a key with each without any relay learning
more than its neighbors, and then ask the last one to open a connection. This
section takes them in order.

### The directory and the consensus

A fixed list of **directory authorities** is built into every Tor client. There have
been nine for most of the network's life (the number has varied between eight and
ten), run by people and organizations in several countries. Each relay uploads a
signed **descriptor** to them: its identity key, its onion key for handshakes, its
address, its exit policy and the bandwidth it claims. Once an hour the authorities
**vote**. Each publishes its view of the network, including flags it assigns after
testing the relays (Running, Stable, Fast, Guard, Exit, BadExit, HSDir) and
bandwidth figures measured by separate bandwidth scanners, and from the votes each
computes the same **consensus** document by a deterministic rule. The consensus is
valid when a majority of authorities have signed it. Clients download it (in a
compact form, with "microdescriptors" for each relay's keys) and choose paths from
it.

The authorities are the most centralized part of Tor and its most attractive
target. A majority acting together could publish a consensus listing only relays
they control. The design limits the damage: a client needs a majority of
signatures, the authorities are spread across jurisdictions, and the documents are
public, so anybody can audit what they sign.

### Choosing a path

A circuit has three relays. The client chooses them at random, weighted by
bandwidth (so that a relay with twice the capacity carries about twice the
circuits), with rules against choosing two relays in the same /16 network block or
the same declared family of relays run by one operator.

- The **exit** must have the Exit flag and a policy allowing the destination. It
  sees the destination and, unless the traffic is end-to-end encrypted with TLS,
  the content. It does not see the client.
- The **middle** sees only the guard and the exit.
- The **guard** sees the client's IP address. It does not see the destination.

The guard is special: the client picks it once and keeps it for months. Here is
why. Suppose an adversary runs a fraction $c$ of the relays, by bandwidth, and can
link a circuit whenever it holds both the first and the last relay (§15.12 shows how
easy that link is). If every circuit chose its first hop afresh, each circuit would
be compromised with probability about $c^2$, and over many circuits the chance of
at least one compromise climbs toward certainty. With $c = 0.1$ and a thousand
circuits:

$$
1 - (1 - 0.01)^{1000} \approx 1 - e^{-10} \approx 0.99995 .
$$

With a fixed guard, the client is safe from this adversary for as long as the guard
is honest, which happens with probability about $1 - c = 0.9$, and exposed only in
the other case. Guards trade a small chance of being badly exposed for a large
chance of never being exposed at all. Tor has used entry guards since 2006, and
after a 2014 study it moved to a single primary guard kept for longer periods.

### The ntor handshake, by hand

The client needs a fresh shared key with each relay, and must be sure it is
talking to the relay listed in the consensus and not to someone in between. Since
2013 Tor has used the **ntor** handshake, designed by Ian Goldberg, Douglas Stebila
and Berkant Ustaoglu, which replaced an older RSA-based one called TAP. It is a
Diffie-Hellman exchange (book 1, [Chapter 12](../../book/12-Diffie-Hellman.md))
with two parts: one with the relay's **onion key** $B = g^b$, published in the
consensus, which proves the relay's identity, and one with a fresh key $Y = g^y$,
which gives forward secrecy.

Work it in the group of order 11 inside $\mathbb{Z}_{23}^*$ with $g = 2$. Tor uses
Curve25519; the structure is the same.

1. The relay's onion key is $b = 3$, so $B = 2^3 = 8$. The client knows $B$ from
   the consensus.
2. The client picks $x = 6$ and sends $X = 2^6 = 64 \bmod 23 = 18$.
3. The relay picks $y = 9$ and computes $Y = 2^9 = 512 \bmod 23 = 6$. It computes
   two shared values: $X^y = 18^9 \bmod 23 = 12$ and $X^b = 18^3 \bmod 23 = 13$.
4. The client computes the same two from its side: $Y^x = 6^6 \bmod 23 = 12$ and
   $B^x = 8^6 \bmod 23 = 13$. (Check: both pairs equal $2^{54} = 2^{10} = 12$ and
   $2^{18} = 2^{7} = 13$, since exponents work mod 11.)
5. Both hash the two values together with the relay's identity, $B$, $X$ and $Y$
   into a secret, derive from it a key seed and an authenticator $\mathit{AUTH}$.
   The relay sends $Y$ and $\mathit{AUTH}$. The client recomputes $\mathit{AUTH}$
   and accepts only if it matches.

An impostor can choose its own $y$, but without $b$ it cannot compute $X^b = 13$,
so its $\mathit{AUTH}$ will not match. An eavesdropper who later steals $b$ still
cannot compute $X^y$, because $y$ was erased after the handshake: that is forward
secrecy.

```python
# The shape of Tor's ntor handshake in a toy group: p = 23, g = 2 of order 11.
# Tor uses Curve25519 and HKDF-SHA256; only the structure is the same here.
import hmac, hashlib
p, g = 23, 2
PROTOID = b"ntor-curve25519-sha256-1"

def H(tweak, data):
    return hmac.new(PROTOID + tweak, data, hashlib.sha256).digest()

def enc(*numbers):
    return b"".join(n.to_bytes(1, "big") for n in numbers)

ID = b"relay-fingerprint"
b = 3; B = pow(g, b, p)                 # relay's long-term onion key, in the consensus
x = 6; X = pow(g, x, p)                 # client's one-time key
y = 9; Y = pow(g, y, p)                 # relay's one-time key
print("B =", B, " X =", X, " Y =", Y)

# Relay side: it knows b and y, receives X.
r_secret = enc(pow(X, y, p), pow(X, b, p)) + ID + enc(B, X, Y) + PROTOID
r_verify = H(b":verify", r_secret)
auth = H(b":mac", r_verify + ID + enc(B, Y, X) + PROTOID + b"Server")
print("relay computes X^y =", pow(X, y, p), " X^b =", pow(X, b, p))

# Client side: it knows x and B, receives Y and auth.
c_secret = enc(pow(Y, x, p), pow(B, x, p)) + ID + enc(B, X, Y) + PROTOID
c_verify = H(b":verify", c_secret)
expected = H(b":mac", c_verify + ID + enc(B, Y, X) + PROTOID + b"Server")
print("client computes Y^x =", pow(Y, x, p), " B^x =", pow(B, x, p))
print("auth matches:", hmac.compare_digest(auth, expected))
print("key seed:", H(b":key_extract", c_secret).hex()[:32], "...")

# An impostor without b can make its own Y but cannot compute X^b.
fake_secret = enc(pow(X, y, p), pow(X, 5, p)) + ID + enc(B, X, Y) + PROTOID
fake_auth = H(b":mac", H(b":verify", fake_secret) + ID + enc(B, Y, X) + PROTOID + b"Server")
print("impostor's auth matches:", hmac.compare_digest(fake_auth, expected))
```

```
B = 8  X = 18  Y = 6
relay computes X^y = 12  X^b = 13
client computes Y^x = 12  B^x = 13
auth matches: True
key seed: 7a3df5f6518f6c2fdada31eacd78afcc ...
impostor's auth matches: False
```

The tweak strings `:verify`, `:mac` and `:key_extract` and the order of the fields
follow Tor's specification. In a group of order 11 an impostor could guess $b$ with
probability $1/11$; on Curve25519 the chance is about $2^{-252}$.

### Telescoping

The client cannot talk to the middle relay directly, or the middle would learn the
client's address. So it builds the circuit like a telescope, one section at a time,
as Figure 15.5 shows.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Message flow of telescoping circuit construction between client, guard, middle and exit: CREATE2 and CREATED2 with the guard, then EXTEND2 relayed by the guard as CREATE2 to the middle, then EXTEND2 through guard and middle to the exit, then BEGIN and DATA" fill="currentColor" font-size="14">
<text x="70" y="24" text-anchor="middle" font-weight="bold">client</text>
<text x="250" y="24" text-anchor="middle" font-weight="bold">guard</text>
<text x="420" y="24" text-anchor="middle" font-weight="bold">middle</text>
<text x="580" y="24" text-anchor="middle" font-weight="bold">exit</text>
<line x1="70" y1="34" x2="70" y2="410" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="250" y1="34" x2="250" y2="410" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="420" y1="34" x2="420" y2="410" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="580" y1="34" x2="580" y2="410" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="70" y1="60" x2="244" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,60 241,56 241,64"/>
<text x="160" y="54" text-anchor="middle">CREATE2 (X₁)</text>
<line x1="250" y1="92" x2="76" y2="92" stroke="currentColor" stroke-width="1.4"/>
<polygon points="70,92 79,88 79,96"/>
<text x="160" y="86" text-anchor="middle">CREATED2 (Y₁, AUTH₁)</text>
<text x="330" y="96" opacity="0.8">key 1 shared</text>
<line x1="70" y1="136" x2="244" y2="136" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,136 241,132 241,140"/>
<text x="160" y="130" text-anchor="middle">EXTEND2 (X₂) [1]</text>
<line x1="250" y1="150" x2="414" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="420,150 411,146 411,154"/>
<text x="335" y="144" text-anchor="middle">CREATE2 (X₂)</text>
<line x1="420" y1="176" x2="256" y2="176" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,176 259,172 259,180"/>
<text x="335" y="170" text-anchor="middle">CREATED2 (Y₂, AUTH₂)</text>
<line x1="250" y1="192" x2="76" y2="192" stroke="currentColor" stroke-width="1.4"/>
<polygon points="70,192 79,188 79,196"/>
<text x="160" y="186" text-anchor="middle">EXTENDED2 [1]</text>
<text x="470" y="196" opacity="0.8">key 2 shared</text>
<line x1="70" y1="236" x2="414" y2="236" stroke="currentColor" stroke-width="1.4"/>
<polygon points="420,236 411,232 411,240"/>
<text x="245" y="230" text-anchor="middle">EXTEND2 (X₃) [1, 2]</text>
<line x1="420" y1="250" x2="574" y2="250" stroke="currentColor" stroke-width="1.4"/>
<polygon points="580,250 571,246 571,254"/>
<text x="500" y="244" text-anchor="middle">CREATE2 (X₃)</text>
<line x1="580" y1="276" x2="426" y2="276" stroke="currentColor" stroke-width="1.4"/>
<polygon points="420,276 429,272 429,280"/>
<text x="500" y="270" text-anchor="middle">CREATED2</text>
<line x1="420" y1="292" x2="76" y2="292" stroke="currentColor" stroke-width="1.4"/>
<polygon points="70,292 79,288 79,296"/>
<text x="245" y="286" text-anchor="middle">EXTENDED2 [2, 1]</text>
<line x1="70" y1="336" x2="574" y2="336" stroke="currentColor" stroke-width="1.4"/>
<polygon points="580,336 571,332 571,340"/>
<text x="325" y="330" text-anchor="middle">BEGIN example.org:443 [1, 2, 3]</text>
<line x1="580" y1="372" x2="76" y2="372" stroke="currentColor" stroke-width="1.4"/>
<polygon points="70,372 79,368 79,376"/>
<text x="325" y="366" text-anchor="middle">CONNECTED, then DATA cells [3, 2, 1]</text>
<text x="325" y="404" text-anchor="middle" opacity="0.8">[1, 2] = inside layers of key 1 and key 2, removed hop by hop</text>
</svg>
<figcaption>Figure 15.5. Building a Tor circuit by telescoping. The client does an ntor handshake with the guard directly, then with the middle through the guard, then with the exit through both. No relay ever sees the client and the exit together.</figcaption>
</figure>

1. The client opens a TLS connection to its guard and sends a **CREATE2** cell
   carrying its ntor share $X_1$. The guard answers **CREATED2** with $Y_1$ and
   $\mathit{AUTH}_1$. Client and guard now share key 1.
2. The client sends an **EXTEND2** cell, encrypted with key 1, carrying the middle
   relay's identity and a new share $X_2$. The guard decrypts it, opens a
   connection to the middle, and sends it a CREATE2 with $X_2$. The middle replies;
   the guard wraps the reply in an **EXTENDED2** cell back to the client. Client
   and middle now share key 2, and the guard, which only carried $X_2$ and $Y_2$,
   does not know it.
3. The client repeats the step through guard and middle to reach the exit, and now
   shares key 3 with the exit.
4. To open a connection, the client sends a **BEGIN** cell with the destination
   host and port, encrypted in three layers. The exit connects, looks up the name
   itself (so the client's own resolver never sees it), and data flows in **DATA**
   cells.

A circuit carries many streams and is used for new streams for about ten minutes
before the client builds a fresh one. Tor Browser keeps different websites on
different circuits, so the exit for one site does not see the client's visits to
another.

### And the quantum computer?

Every key in a Tor circuit today comes from elliptic-curve Diffie-Hellman, so an
adversary who records circuits now and builds a large quantum computer later could
derive the keys and read what the exit read, including where the client went. Tor's
designers have discussed hybrid handshakes that add a post-quantum key
encapsulation mechanism to ntor since proposals 269 and 270 in 2016, and a March
2025 proposal (number 355, by Nick Mathewson) set out the options again: one KEM
or two, with or without forward secrecy, and how each fits Tor's cell sizes. As of
late 2025 none had been deployed. Post-quantum KEMs and the general move to hybrids
are the subject of the post-quantum book,
[Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md).

## 15.10 Cells and relay encryption

*Level: intermediate.*

Everything on a Tor circuit travels in **cells** of a fixed size. On the link
between two relays a cell is 514 bytes: a 4-byte circuit identifier, a 1-byte
command (CREATE2, CREATED2, RELAY, RELAY_EARLY, DESTROY and a few others), and 509
bytes of payload. The fixed size hides the length of what is inside, as §15.7
asked. A **relay cell**, the kind that carries data along a circuit, puts an
11-byte header inside those 509 bytes:

| field | bytes | meaning |
| --- | --- | --- |
| relay command | 1 | BEGIN, DATA, END, EXTEND2, EXTENDED2, ... |
| recognized | 2 | zero when the cell is fully decrypted |
| stream ID | 2 | which stream on the circuit |
| digest | 4 | part of a running hash, to check integrity |
| length | 2 | how many of the next 498 bytes are data |
| data | 498 | the payload, padded |

### How the layers work

Each hop on the circuit has, from its handshake, one key for each direction. In the
original relay encryption, now called **tor1**, every hop uses AES-128 in counter
mode, with a keystream that runs on from one cell to the next for the whole life of
the circuit. To send a cell to the exit, the client fills in the header with
recognized set to zero, computes the digest, and encrypts the 509 bytes three
times: with the exit's key, then the middle's, then the guard's. Counter mode is
length-preserving, so the cell stays 509 bytes at every hop.

Each relay that receives the cell removes one layer and checks whether the cell is
now for it: is recognized zero, and does the digest match? The digest is the first
four bytes of a SHA-1 hash kept running over every cell this hop has accepted on
this circuit, seeded from the handshake. A relay for which the cell is not meant
sees what looks like random bytes in those fields, so the check fails (with
probability about $1 - 2^{-48}$) and it passes the cell on. The program below
builds three hops' worth of keys and sends a cell through them. As before, an
HMAC-SHA256 keystream stands in for AES-CTR; the digest is SHA-1, as in tor1.

```python
# Tor-style relay cells on a three-hop circuit. Each hop removes one layer of a
# length-preserving stream cipher; only the hop that finds recognized = 0 and a
# matching running digest treats the cell as its own. TEACHING CIPHER: HMAC-SHA256
# counter mode stands in for AES-128-CTR; SHA-1 is the digest of Tor's "tor1" format.
import hmac, hashlib, secrets

class Layer:                                 # one direction of one hop's keys
    def __init__(self, key, digest_seed):
        self.key, self.counter = key, 0
        self.digest = hashlib.sha1(digest_seed)
    def crypt(self, data):                   # the keystream continues across cells
        out = b""
        while len(out) < len(data):
            out += hmac.new(self.key, self.counter.to_bytes(8, "big"), hashlib.sha256).digest()
            self.counter += 1
        return bytes(a ^ b for a, b in zip(data, out))

def new_hop():                               # in Tor these come from the ntor key seed
    k, d = secrets.token_bytes(32), secrets.token_bytes(20)
    return Layer(k, d), Layer(k, d)          # (client's copy, relay's copy)

def make_cell(layer, data):                  # command, recognized, stream, digest, length, data
    body = bytes([2]) + b"\0\0" + b"\0\1" + b"\0\0\0\0" + len(data).to_bytes(2, "big")
    body += data.ljust(498, b"\0")
    h = layer.digest.copy(); h.update(body)
    layer.digest = h
    return body[:5] + h.digest()[:4] + body[9:]

def is_mine(layer, cell):
    if cell[1:3] != b"\0\0":
        return False
    h = layer.digest.copy(); h.update(cell[:5] + b"\0\0\0\0" + cell[9:])
    if h.digest()[:4] != cell[5:9]:
        return False
    layer.digest = h
    return True

hops = [new_hop() for _ in range(3)]         # guard, middle, exit
names = ["guard", "middle", "exit"]

def send(data, tamper=None):
    cell = make_cell(hops[2][0], data)
    for client_layer, _ in reversed(hops):   # exit's layer first, guard's last
        cell = client_layer.crypt(cell)
    print(f"cell on the wire: {len(cell)} bytes")
    for i, (_, relay_layer) in enumerate(hops):
        cell = relay_layer.crypt(cell)
        if i == 0 and tamper:
            cell = bytes(a ^ b for a, b in zip(cell, tamper))
        if is_mine(relay_layer, cell):
            n = int.from_bytes(cell[9:11], "big")
            print(f"  {names[i]}: recognized, data = {cell[11:11 + n]!r}")
            return cell
        print(f"  {names[i]}: " + ("not for me, pass it on" if i < 2 else
              "digest fails, an honest exit closes the circuit"))
    return cell

send(b"GET / HTTP/1.1")

# Break it: a guard XORs a pattern into the cell (no per-hop integrity in tor1).
pattern = bytes(20) + b"\x5a" * 4 + bytes(488)
cell = send(b"GET /news", tamper=pattern)
untagged = bytes(a ^ b for a, b in zip(cell, pattern))
print("a colluding exit removes the guard's pattern:", is_mine(hops[2][1], untagged))
```

```
cell on the wire: 509 bytes
  guard: not for me, pass it on
  middle: not for me, pass it on
  exit: recognized, data = b'GET / HTTP/1.1'
cell on the wire: 509 bytes
  guard: not for me, pass it on
  middle: not for me, pass it on
  exit: digest fails, an honest exit closes the circuit
a colluding exit removes the guard's pattern: True
```

### Break it: tagging

The second half of the program is an attack. Counter mode is **malleable**: XOR a
pattern into the ciphertext and the same pattern appears in the plaintext after
decryption, at every later hop. In tor1 only the last hop checks integrity, so a
malicious guard can XOR a secret pattern into a cell it forwards. The middle notices
nothing. At the exit the digest fails. An honest exit closes the circuit, but a
colluding exit that knows the pattern XORs it back out, sees the cell become valid,
and learns that this circuit came through its partner guard, which knows the
client's address. The attack is called **tagging**. The defense in tor1 is that a
failed digest destroys the circuit, so the tag can be used only once and its use is
visible; the tagger still learns something from each attempt, and a guard and exit
working together have a simpler way to link circuits in any case, by timing
(§15.12). That is the main reason the weakness was tolerated for so long.

In November 2025 the Tor Project announced a replacement relay encryption called
**Counter Galois Onion** (CGO), based on work by Jean Paul Degabriele, Alessandro
Melloni, Jean-Pierre Münch and Martijn Stam with Tor's developers. It encrypts each
cell with a construction that behaves like a wide-block cipher, so that changing any
bit garbles the whole cell; it chains each cell's authentication tag into the next,
so that a tampered cell ruins the rest of the circuit; it replaces the 4-byte SHA-1
digest with a 16-byte authenticator; and it updates keys as cells are processed,
which gives forward secrecy within a circuit. At the time of the announcement it was
experimental in both Tor implementations (the C one and Arti, the newer one in Rust),
with no date for making it the default.

### Bridges and pluggable transports

The consensus lists every public relay, so a government that wants to block Tor
can block their addresses. **Bridges** are relays left out of the public list and
handed out a few at a time, by email, by web form with a captcha, or in person.
Blocking a bridge needs finding it first. Censors then learned to recognize Tor's
traffic by its shape, so the project wraps it in **pluggable transports**: obfs4
makes it look like random bytes, meek hid it inside connections to large cloud
services, and Snowflake routes it through short-lived WebRTC proxies run in
volunteers' browsers. The fight is one of detection and disguise rather than
cryptography, and it moves every year.

## 15.11 Onion services

*Level: intermediate.*

A Tor circuit hides the client from the server. An **onion service** also hides the
server from the client: a website, chat server or file drop reachable only through
Tor, whose IP address nobody using it learns. Tor's 2004 paper introduced them as
"location-hidden services"; their address is a name ending in `.onion`.

### The rendezvous

The protocol needs a meeting place that neither side's location reveals.

1. The service picks a few relays as **introduction points**, builds circuits to
   them, and publishes a signed **descriptor** listing them. Descriptors are stored
   on relays with the HSDir flag, at positions on a hash ring that depend on the
   service's key and the current day.
2. A client that knows the `.onion` address computes where the descriptor lives,
   fetches it over a Tor circuit, and checks its signature against the key in the
   address.
3. The client picks a relay as **rendezvous point**, builds a circuit to it, and
   leaves a one-time secret there.
4. Through another circuit, the client sends a message to one of the introduction
   points, encrypted to the service: "meet me at this rendezvous point, with this
   secret, and here is my handshake share."
5. The service builds a circuit to the rendezvous point and presents the secret.
   The rendezvous point joins the two circuits. Client and service finish an
   ntor-style handshake end to end.

The finished connection runs over six relays, three chosen by each side, and neither
side knows the other's guard. The address is **self-authenticating**: it is derived
from the service's public key, so nobody can impersonate the service without its
private key, and no certificate authority is involved.

### From v2 to v3

The first design, now called **v2**, used a 1024-bit RSA key and an address of 16
characters: the first 80 bits of the SHA-1 hash of the key, in base32. By the 2010s
all three choices were weak. Eighty bits is short enough that people computed
addresses with chosen prefixes, and in principle collisions. Worse, the HSDir
relays that stored a v2 descriptor learned the service's address, so anyone running
HSDirs could collect addresses of services meant to stay unlisted, and could position
relays on the hash ring to become the HSDir for a chosen service and watch its
traffic.

The **v3** design (Tor proposal 224) fixed both. The address is the service's whole
32-byte ed25519 public key, with a checksum and a version byte, in 56 base32
characters. Descriptors are stored under a **blinded key**: for each time period
the service derives $A' = hA$ from its public key $A$, where $h$ is a hash of $A$ and
the period, and signs the descriptor with the matching blinded private key. Anyone
who knows the address can compute $A'$ and find the descriptor; an HSDir that sees
only $A'$ cannot work back to $A$, so it learns neither the address nor, since the
descriptor is also encrypted with a key derived from $A$, its contents. The program
below computes an address the way the specification says.

```python
# A v3 onion address is the service's ed25519 public key, a 2-byte checksum and a
# version byte, in base32. The 32 bytes below stand in for a real public key.
import base64, hashlib

def onion_address(pubkey):
    version = b"\x03"
    checksum = hashlib.sha3_256(b".onion checksum" + pubkey + version).digest()[:2]
    return base64.b32encode(pubkey + checksum + version).decode().lower() + ".onion"

def check(address):
    raw = base64.b32decode(address[:-len(".onion")].upper())
    pubkey, checksum, version = raw[:32], raw[32:34], raw[34:]
    good = hashlib.sha3_256(b".onion checksum" + pubkey + version).digest()[:2]
    return version == b"\x03" and checksum == good

pubkey = bytes(range(32))
addr = onion_address(pubkey)
print(addr, len(addr) - len(".onion"), "characters")
print("valid:", check(addr))
typo = addr[:10] + ("b" if addr[10] != "b" else "c") + addr[11:]
print("one letter changed, valid:", check(typo))
```

```
aaaqeayeaudaocajbifqydiob4ibceqtcqkrmfyydenbwha5dyp3kead.onion 56 characters
valid: True
one letter changed, valid: False
```

Thirty-five bytes are 280 bits, exactly 56 characters of 5 bits each. The checksum
catches typing mistakes, not attacks; security comes from the key itself.

Tor 0.3.2.9, released in January 2018, was the first stable version to support v3
services. In 2020 the project set a schedule for retiring v2: warnings from that
autumn, then removal in the 0.4.6 series in 2021; by October 2021, when Tor Browser
moved to that series, v2 addresses no longer worked.

Onion services had a reputation problem from the start, because the most famous
were drug markets such as Silk Road. They also carry SecureDrop, the whistleblowing
system used by many newsrooms, and onion versions of mainstream sites: Facebook
opened one in October 2014, and news organizations such as the New York Times and
the BBC followed. A connection to an onion site never leaves Tor, so there is no exit
relay to snoop on it. Their own weak point is denial of service, since a service
cannot block clients it cannot identify; since 2023 Tor has offered services a
proof-of-work defense, in which clients solve a small puzzle whose difficulty rises
under attack.

!!! note "Life story: onion services"
    **Born:** 2004, as location-hidden services in the Tor design paper; v3 in Tor
    0.3.2.9, January 2018 · **Purpose:** servers reachable through Tor whose location
    is hidden, with self-authenticating addresses · **Helped:** SecureDrop and other
    whistleblowing drops, onion mirrors of news sites and social networks, and
    services in countries that block the open web · **Status:** current (v3); v2,
    with RSA-1024 and 80-bit addresses, was retired in 2021

## 15.12 Traffic correlation and fingerprinting

*Level: intermediate.*

Tor's design paper was frank that Tor does not stop an adversary who watches both
ends. This section shows why, and then shows a second attack that needs to watch
only one end.

### End-to-end correlation

A low-latency relay must forward a cell within milliseconds, so the pattern of
traffic going in, bursts and pauses and sizes, comes out the other side almost
unchanged. An adversary who sees the client's connection to the guard and the exit's
connection to the website can compare the two patterns. It does not need to break
any encryption, or even to know where the circuit went in between. The program
below plays that adversary. Twelve clients send bursty traffic, like web browsing,
through a relay that delays each packet by 50 to 250 milliseconds and sends it on a
different connection; the adversary sees packets go in labeled by client and come
out labeled by destination, counts them in one-second bins, and pairs each client
with the destination whose counts correlate best. Then the relay is replaced by a
mix that delays each packet by a random time with a mean of 30 seconds.

```python
# Linking flows through a relay by packet timing alone. The observer sees packets
# enter (labeled by client) and leave (labeled by destination), never their content.
import random
random.seed(2004)
FLOWS, SECONDS, BIN = 12, 120, 1.0

def bursty_flow():                         # on/off traffic, like web browsing
    t, times = 0.0, []
    while t < SECONDS:
        if random.random() < 0.3:          # a burst of packets
            for _ in range(random.randint(5, 40)):
                t += random.expovariate(50)
                times.append(t)
        t += random.expovariate(0.5)       # think time
    return [x for x in times if x < SECONDS]

def counts(times):
    c = [0] * int(SECONDS / BIN + 300)
    for t in times:
        c[int(t / BIN)] += 1
    return c

def corr(a, b):
    n = len(a); ma, mb = sum(a) / n, sum(b) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    va = sum((x - ma) ** 2 for x in a); vb = sum((y - mb) ** 2 for y in b)
    return cov / (va * vb) ** 0.5 if va and vb else 0.0

def attack(delay):
    inputs = [bursty_flow() for _ in range(FLOWS)]
    order = list(range(FLOWS)); random.shuffle(order)       # secret: input i -> output order[i]
    outputs = [None] * FLOWS
    for i, times in enumerate(inputs):
        outputs[order[i]] = [t + delay() for t in times]
    right = 0
    for i in range(FLOWS):
        scores = [corr(counts(inputs[i]), counts(outputs[j])) for j in range(FLOWS)]
        right += scores.index(max(scores)) == order[i]
    return right

print("low-latency relay (50-250 ms):", attack(lambda: random.uniform(0.05, 0.25)), "of", FLOWS, "linked")
print("mix, mean delay 30 s         :", attack(lambda: random.expovariate(1 / 30)), "of", FLOWS, "linked")
```

```
low-latency relay (50-250 ms): 12 of 12 linked
mix, mean delay 30 s         : 2 of 12 linked
```

Through the fast relay every flow is linked, with a statistic a student could write
in an afternoon. Through the slow mix the adversary does about as well as guessing
(one in twelve per flow, so one or two right by luck). That is the anonymity
trilemma of §15.2 in two lines of output: the delay that defeats correlation is the
delay web users will not accept.

The research record matches the toy. Steven Murdoch and George Danezis showed in
2005 that even an adversary who sees only one end can confirm a circuit's path by
loading relays and watching latency change. Aaron Johnson, Chris Wacek, Rob Jansen,
Micah Sherr and Paul Syverson estimated in 2013 ("Users Get Routed") that an
adversary running a moderate share of relays, or controlling a large internet
exchange, would deanonymize most users of some kinds within months. The RAPTOR study
(2015) showed that internet routing changes, natural or forced with BGP, give an
autonomous system more chances to sit on both ends. DeepCorr (2018) used a neural
network to correlate Tor flows with high accuracy from only a few hundred packets
each. Tor's defenses lower the odds rather than removing them: guards limit how
often a client's entry is exposed, path rules avoid relays in the same network,
and since 2019 a padding framework lets relays add dummy cells to blur some patterns.

### Website fingerprinting

The second attack needs only the client's side, which a home internet provider, a
workplace network or a national firewall already sees. The connection to the guard
is encrypted and carries fixed-size cells, but the sequence of cells, how many go
up, how many come down, in what bursts and at what times, differs from one website
to another. The attacker loads many sites through Tor itself, records their traces,
and trains a classifier; then it matches the victim's trace.

Early attempts on Tor around 2009 recognized only a few percent of pages. Later
classifiers did far better: Andriy Panchenko and colleagues in 2011, Tao Wang and
Ian Goldberg's work from 2013, and the neural-network "Deep Fingerprinting" of
Payap Sirinam, Mohsen Imani, Marc Juarez and Matthew Wright (2018), which reported
about 98 percent accuracy in a **closed world** where the victim visits one of 95
known sites. Real users live in an **open world** of millions of pages, revisit the
same few, and open several tabs at once. Marc Juarez and colleagues showed in 2014
how much accuracy falls under those conditions, and how a low base rate turns a
small false-positive rate into mostly false alarms when the attacker watches for a
rare page. The attack is real but its strength depends heavily on the setting, and
published accuracy figures should be read with the setting in mind. Defenses add
padding and reshape bursts (WTF-PAD, FRONT and others) at a bandwidth cost; a
constant-rate defense such as Tamaraw stops the attack and costs the most.

## 15.13 Attacks in the wild

*Level: intermediate.*

The attacks above come from papers. These happened on the live network.

### Exit snooping: Egerstad, 2007

Tor encrypts traffic only as far as the exit. From there to the website it is
whatever the application makes it, and in 2007 much of it was plain text. In the
summer of that year Dan Egerstad, a Swedish security consultant, ran five Tor exit
relays and recorded what left them. In late August and early September he published
the user names and passwords of 100 email accounts, among them accounts of embassies
and government agencies of several countries, which had evidently been using Tor
without understanding that it gave them anonymity, not encryption. He said he had
captured credentials for many more. Swedish police questioned him that November. The
lesson was not new to Tor's designers, but it reached the public: an exit relay is a
stranger reading your traffic, and only end-to-end encryption such as TLS stops it.
The Tor Project now scans exits for tampering and marks bad ones with the BadExit
flag; as late as 2020 an independent researcher who signs as nusenu reported a group
of malicious exits, at one point a large share of exit capacity by the researcher's
estimate, that stripped HTTPS from visits to cryptocurrency sites to steal coins.

!!! note "Life story: Egerstad's exit relays"
    **Born:** 2007, Dan Egerstad, a Swedish consultant, running five Tor exits as an
    experiment · **Purpose:** to show what an exit operator can read · **Helped:**
    made "Tor is not encryption" common knowledge; pushed users, and Tor Browser,
    toward HTTPS everywhere · **Status:** a closed episode, but its threat is
    permanent: any exit can read unencrypted traffic

### The relay-early attack, 2014

On 30 January 2014 a group of about 115 fast relays, all in one network block
(50.7.0.0/16), joined Tor and soon held, by the Tor Project's later estimate, about
6.4 percent of guard capacity. They also took the HSDir flag. When a client asked one
of them, as an HSDir, for an onion service's descriptor, the relay encoded the name
of the service it had been asked for into a pattern of cell types sent back down
the circuit: RELAY_EARLY cells, a type meant for the client's extend requests, in
place of ordinary RELAY cells. Cell types are not encrypted end to end, so a
colluding guard on that circuit could read the pattern and learn that this client,
whose address it knew, was looking up that service. It was a traffic confirmation
attack combined with a Sybil attack: one end of the circuit injected a signal, the
other end read it.

The Tor Project found and removed the relays on 4 July 2014 and published an
advisory on 30 July, with a fix that made clients tear down circuits on which an
inbound RELAY_EARLY cell appeared. The same month, a talk at the Black Hat
conference by two researchers at Carnegie Mellon University's Software Engineering
Institute, promising to show how to deanonymize Tor users cheaply, was withdrawn.
The Tor Project said it believed the attack came from that research. In 2016 a
federal court ruling in a case arising from the Silk Road 2.0 market stated that the
FBI had obtained IP addresses from the institute's research by subpoena. The Tor
Project also alleged that the FBI paid for the work, which the university disputed.
The full account has never been published, and this book treats the attribution as
established in outline and unsettled in detail.

!!! note "Life story: the relay-early confirmation attack"
    **Born:** January 2014, about 115 relays on 50.7.0.0/16, widely attributed to
    researchers at Carnegie Mellon's Software Engineering Institute · **Purpose:**
    to link clients to the onion services they looked up, by signaling in cell types
    from HSDir relays to guards · **Helped:** deanonymize users of onion services,
    with results that reached FBI investigations; prompted Tor's fix, tighter Sybil
    monitoring and the Tor Research Safety Board · **Status:** stopped by the July
    2014 release; the class of attack, confirmation by colluding ends, remains open

### Sybil relays

Anybody can run a relay, so an adversary can run many. The directory authorities
look for groups of new relays that appear together, share addresses or software
quirks, or claim to be unrelated while behaving alike, and remove them. They do not
catch everything. In late 2021 nusenu described a long-running group, nicknamed
KAX17, that had operated hundreds of mostly non-exit relays since at least 2017
without declaring them as one family, enough at its peak, by the researcher's
estimate, to give it a noticeable chance of being a user's guard or middle relay.
The operator was never identified. The authorities removed the relays, and the Tor
Project has since tightened its rules for relay operators.

### "Tor Stinks"

On 4 October 2013 the *Guardian* published a set of NSA slides, from the documents
Edward Snowden had taken, titled "Tor Stinks" and dated June 2012. They are the most
quoted and the most misquoted evidence about Tor's strength. They say that the agency
"will never be able to de-anonymize all Tor users all the time", that with manual
analysis it could de-anonymize "a very small fraction" of them, and that it had had
no success de-anonymizing a user in response to a specific request. They describe
ideas under study, among them running relays, correlating traffic, and attacking the
users' browsers. Published alongside were reports of an attack called EgotisticalGiraffe
that exploited a flaw in the Firefox version inside Tor Browser.

Three cautions apply. The slides are a snapshot of what one part of one agency could
do in 2012. They are partial, published with redactions, and the agency's other
capabilities were not described. And the reported successes went around Tor rather
than through it, by exploiting the browser. That pattern held in later public cases
as well: the best-known deanonymizations of Tor users, from the FBI's operations
against Freedom Hosting in 2013 and the Playpen site in 2015 to the arrest of Silk
Road's operator, came from software exploits, mistakes by the users or servers, and
ordinary investigation, more than from breaking Tor's routing. What the slides do
suggest is that, in 2012, Tor's design was a real obstacle to a powerful agency.
They do not prove it still was, or that correlation attacks were beyond it.

## 15.14 Paying in time and noise: Loopix and Nym

*Level: intermediate.*

After two decades of Tor, a new generation of mix-nets asked whether there was a
middle ground: delays of seconds rather than hours, and enough fake traffic to
protect against the global observer that Tor gives up on. The best-known answer is
**Loopix**, published in 2017 by Ania Piotrowska, Jamie Hayes, Tariq Elahi,
Sebastian Meiser and George Danezis at University College London.

Loopix combines four ideas, all met earlier in this chapter.

- **Continuous mixing with exponential delays.** Each message carries, for each
  mix, a delay chosen by the sender from an exponential distribution (the
  stop-and-go idea of §15.4). Mixes do not batch; they hold each message for its
  delay and send it. Because the exponential distribution is memoryless, a message
  leaving a mix is equally likely to be any of the messages inside, so the mix's
  anonymity set is everything it holds, and the observer gains nothing by watching
  how long messages stay.
- **Poisson sending with cover traffic.** Each client sends packets at random
  times, at a steady average rate, whether it has anything to say or not. When it has
  a real message queued, the next slot carries it; otherwise the slot carries a
  **drop** message to a random recipient, discarded on arrival. An observer of the
  client's link sees the same rate either way, which gives sender unobservability.
- **Loops.** Clients and mixes also send messages that travel through the network
  and come back to themselves. If its loops stop returning, a mix knows someone is
  holding its traffic: Danezis and Sassaman's heartbeat defense against the $n-1$
  attack of §15.4, built in.
- **Layers and providers.** Mixes are arranged in layers, and every path takes one
  mix from each, which keeps the anonymity sets large. Each client is attached to a
  **provider** that stores its incoming mail while it is offline and sends cover
  traffic on its behalf.

Packets use the **Sphinx** format (§15.7): fixed size, unlinkable from hop to hop,
with each layer's key derived from one Diffie-Hellman element that each mix
re-randomizes, so the header stays small. The paper reported latencies of seconds,
fine for messaging and email, too slow for the web.

**Nym** carries the design into service. Nym Technologies, founded in 2018 with
several Loopix authors involved, runs a mix-net of the Loopix type whose nodes are
operated by independent parties and paid in a cryptocurrency token, an answer to the
volunteer-relay economics of Tor, and one with its own critics. Its commercial
NymVPN launched on 13 March 2025 with two modes: a five-hop mix-net mode with cover
traffic and delays, and a faster two-hop mode without them. How large and how
active its user base is, which decides how much its anonymity sets are worth, is
not yet established by independent measurement.

!!! note "Life story: Loopix and Nym"
    **Born:** Loopix, 2017, Piotrowska, Hayes, Elahi, Meiser and Danezis (USENIX
    Security); Nym, a company founded in 2018, mix-net in service from the early
    2020s, NymVPN launched March 2025 · **Purpose:** protection against a global
    passive observer at latencies of seconds, by exponential delays, Poisson cover
    traffic and loops · **Helped:** Katzenpost and other Loopix-family mix-nets;
    renewed interest in paying mix operators · **Status:** current; deployment young
    and its anonymity sets still small

### Mars: mail that is slow anyway

The trilemma looks different from Arcadia City. A message from Mars to Earth takes
between 4 and 24 minutes at the speed of light, and in practice longer, since it
waits for a relay orbiter's pass or a deep-space antenna's schedule and travels as a
store-and-forward bundle (the Bundle Protocol, RFC 9171). Nobody on either planet
expects a reply in seconds. A high-latency mix-net costs almost nothing here: if the
settlement's mail passes through three mixes, one in Arcadia City, one aboard the
relay orbiter and one at an Earth ground station, each run by a different
operator, and each holds messages for a random few minutes, the added delay is lost
inside the 20 minutes the light already takes. The link itself helps: the downlink
runs at a fixed rate during each pass, so filling every pass with the same number of
fixed-size Sphinx packets, real or cover, is constant-rate padding the radio is doing
anyway. An observer on Earth then learns that the settlement sent a full pass of
mail, as it always does, and not which of its few thousand residents wrote to a
lawyer, a journalist or a doctor at home. The settlement's small size is the real
limit: with few senders the anonymity set is small however good the mixing, which is
an argument for routing Earth-side mail through the same mixes, so that each Martian
hides in a crowd of Earth users too.

## 15.15 Two hops: Oblivious HTTP and Private Relay

*Level: beginner.*

Tor and mix-nets aim to hide you from almost everyone. A simpler goal covers a lot
of everyday privacy: make sure no single company sees both **who you are** and
**what you ask**. Two relays run by two different organizations are enough, if they
do not collude, and both can be fast. Figure 15.6 shows the pattern.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Oblivious HTTP: the client sends an encrypted request to a relay, which sees the client's address but not the request; the relay forwards it to a gateway, which decrypts the request but sees only the relay's address, and passes it to the target" fill="currentColor" font-size="14">
<rect x="10" y="60" width="110" height="60" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="65" y="86" text-anchor="middle" font-weight="bold">client</text>
<text x="65" y="106" text-anchor="middle">address C</text>
<rect x="180" y="60" width="120" height="60" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="240" y="86" text-anchor="middle" font-weight="bold">relay</text>
<text x="240" y="106" text-anchor="middle">company 1</text>
<rect x="360" y="60" width="120" height="60" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="420" y="86" text-anchor="middle" font-weight="bold">gateway</text>
<text x="420" y="106" text-anchor="middle">company 2</text>
<rect x="530" y="60" width="100" height="60" rx="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="580" y="86" text-anchor="middle" font-weight="bold">target</text>
<text x="580" y="106" text-anchor="middle">server</text>
<line x1="120" y1="90" x2="174" y2="90" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,90 171,86 171,94"/>
<line x1="300" y1="90" x2="354" y2="90" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,90 351,86 351,94"/>
<line x1="480" y1="90" x2="524" y2="90" stroke="currentColor" stroke-width="1.4"/>
<polygon points="530,90 521,86 521,94"/>
<text x="150" y="50" text-anchor="middle" font-size="13">HPKE box</text>
<text x="330" y="50" text-anchor="middle" font-size="13">HPKE box</text>
<text x="505" y="50" text-anchor="middle" font-size="13">request</text>
<text x="240" y="160" text-anchor="middle">sees: C, a sealed box</text>
<text x="240" y="182" text-anchor="middle">not: the request</text>
<text x="420" y="160" text-anchor="middle">sees: the request</text>
<text x="420" y="182" text-anchor="middle">not: C</text>
<text x="320" y="236" text-anchor="middle">privacy holds while company 1 and company 2 do not pool their logs</text>
</svg>
<figcaption>Figure 15.6. Oblivious HTTP splits knowledge across two parties. The relay knows who is asking, the gateway knows what is asked, and neither knows both. The reply returns the same way, encrypted to the client.</figcaption>
</figure>

**Oblivious HTTP**, published in January 2024 as RFC 9458 by Martin Thomson and
Christopher Wood, is the pattern for single requests. The client fetches the
gateway's public key configuration, encrypts its HTTP request (encoded as
Binary HTTP, RFC 9292) to that key with HPKE (RFC 9180), and sends the sealed box
to the relay. The relay forwards it to the gateway, which decrypts it, passes the
request to the target server, and encrypts the response back to the client under a
key derived from the same HPKE exchange. The relay sees the client's address and a
box; the gateway sees the request and the relay's address. It is a two-hop onion
with no circuit: each request stands alone, so requests cannot be linked to each
other through a shared connection. It suits services that collect data or answer
queries, such as telemetry, safe-browsing checks or DNS (Oblivious DNS over HTTPS,
RFC 9230, came first, in 2022), where the service wants the data but should not be
able to attach it to a person. Large content-delivery networks offer relays as a
service.

**iCloud Private Relay**, announced by Apple in June 2021 and launched as a beta with
iOS 15 that September for paying iCloud+ subscribers, applies the pattern to
browsing in Safari. Traffic goes first to an **ingress** relay run by Apple, which
sees the user's IP address but not the destination, because the destination is
encrypted to the second hop. The **egress** relay, run by a partner content-delivery
company (reported to be Akamai, Cloudflare and Fastly), decrypts the destination and
connects to it, giving the website an address that reveals only a rough region; it
never sees the user's IP address. To stop the egress relays or anyone else from
using the service without paying, and without telling Apple which user is behind
which connection, clients authenticate with single-use tokens issued by RSA blind
signatures, the protocol of RFC 9474 and
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md). Apple does not offer
the service in some countries, and some networks block it.

Both designs rest on one assumption that should be stated in capital letters: the
two operators must not collude, and neither must be compelled to share logs with the
other or with the same third party. They offer no protection against an adversary
who watches both hops' networks and correlates timing, the attack of §15.12. They
are not anonymity networks in Tor's sense. They are the cheapest useful step beyond
a single VPN company that sees everything.

!!! note "Life story: Oblivious HTTP"
    **Born:** RFC 9458, January 2024 (Martin Thomson, Christopher Wood), after
    Oblivious DNS over HTTPS (RFC 9230, 2022) · **Purpose:** send an HTTP request
    so that no single party learns both who sent it and what it says · **Helped:**
    privacy-preserving telemetry, safe-browsing and DNS lookups behind relays run
    by content-delivery networks · **Status:** current; an IETF standard with
    several large deployments

!!! note "Life story: iCloud Private Relay"
    **Born:** announced June 2021, launched as a beta with iOS 15 in September 2021
    · **Purpose:** hide Safari users' IP addresses from websites and their browsing
    from any one company, with two relays run by different organizations · **Helped:**
    put a two-hop privacy relay in front of a very large number of ordinary users,
    and RSA blind-signature tokens into mass use · **Status:** current, for iCloud+
    subscribers, not offered in some countries

### Metadata in messengers

End-to-end encrypted messengers face the same problem from the inside. The server
must know where to deliver a message, so by default it learns who writes to whom and
when, even when it cannot read a word. Signal's **sealed sender** (2018) hides the
sender from the server by putting the sender's identity inside the encrypted envelope
and authorizing delivery with a short-lived certificate; it is told in full in the
protocols book, [Chapter 16](../protocols/index.md), and
not retold here. Sealed sender still leaves the recipient, the timing and the
sender's IP address visible to the server, which is why some messengers route
traffic through Tor (Briar, Ricochet Refresh, Cwtch use onion services) or plan to
use mix-nets. Finding which of your contacts use a service without uploading your
address book is a separate problem, private contact discovery, covered with private
set intersection in [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md).

## 15.16 Shuffles, DC-nets and the ballot box

*Level: expert.*

An election has an anonymity problem shaped exactly like Chaum's. Each voter's
ballot must be counted, so it must reach the tally; nobody, not even the election
authority, may learn which ballot came from whom. Chaum's 1981 paper proposed mixes
for this too. The version used in elections today is the **re-encryption mix-net**,
and it adds something the mixes of §15.3 cannot offer: a public proof that the mix
did its job honestly.

### Re-encryption

ElGamal encryption (book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md)) is
randomized: a message $m$ is encrypted as $(g^r, m h^r)$ for a random $r$, where
$h = g^x$ is the public key. Anyone can **re-encrypt** a ciphertext without knowing
the key or the message, by multiplying in an encryption of 1:

$$
(c_1, c_2) \mapsto (c_1 g^s,\; c_2 h^s) = (g^{r+s},\; m h^{r+s}).
$$

The result is a fresh-looking encryption of the same $m$. A re-encryption mix takes
a list of ciphertexts, re-encrypts each with a fresh $s$, and outputs them in a
random order. Unlike Chaum's mix it removes no layer and needs no secret key, so the
election's decryption key can be shared among trustees (threshold decryption,
[Chapter 4](04-Threshold-Cryptography.md)) and only the final, shuffled list is ever
decrypted.

**By hand.** Work in the order-11 subgroup of $\mathbb{Z}_{23}^*$ with $g = 2$ and
secret key $x = 3$, so $h = 8$. The vote $m = 4$ encrypted with $r = 2$ is
$(2^2, 4 \cdot 8^2) = (4, 4 \cdot 18) = (4, 72 \bmod 23) = (4, 3)$. Re-encrypt with
$s = 4$: $2^4 = 16$ and $8^4 = 4096 \bmod 23 = 2$, so the new ciphertext is
$(4 \cdot 16, 3 \cdot 2) = (64 \bmod 23, 6) = (18, 6)$. It shares no number with
$(4, 3)$. Decrypt it: $c_1^x = 18^3 \bmod 23 = 13$, whose inverse mod 23 is 16
(since $13 \cdot 16 = 208 = 9 \cdot 23 + 1$), and $6 \cdot 16 = 96 \bmod 23 = 4$.
The vote is still 4.

```python
# A re-encryption mix: ElGamal in the order-11 subgroup of Z_23^* (g = 2).
# Real mix-nets use 2048-bit groups or elliptic curves and add a shuffle proof.
import random
random.seed(16)                       # demo only; real mixes draw s with secrets
p, q, g = 23, 11, 2
x = 3; h = pow(g, x, p)               # the election key (shared among trustees in practice)

def encrypt(m, r):
    return (pow(g, r, p), m * pow(h, r, p) % p)

def reencrypt(c, s):
    return (c[0] * pow(g, s, p) % p, c[1] * pow(h, s, p) % p)

def decrypt(c):
    return c[1] * pow(c[0], q - x, p) % p      # c1^(-x) = c1^(q-x) in the subgroup

ballots = [encrypt(4, 2), encrypt(9, 5), encrypt(13, 7)]
print("in :", ballots)
mixed = [reencrypt(c, random.randrange(1, q)) for c in ballots]
random.shuffle(mixed)
print("out:", mixed)
print("decrypted in :", sorted(decrypt(c) for c in ballots))
print("decrypted out:", sorted(decrypt(c) for c in mixed))
```

```
in : [(4, 3), (9, 6), (13, 18)]
out: [(3, 16), (16, 3), (4, 1)]
decrypted in : [4, 9, 13]
decrypted out: [4, 9, 13]
```

Real systems use groups of 2048 bits or more, or elliptic curves; in a group of order
11 an observer could simply try every $s$.

### Proving the shuffle

A dishonest mix could drop a ballot and substitute its own, and the output would
look just as random. So each mix in a voting mix-net publishes a **proof of
shuffle**: a zero-knowledge proof that its output list is a permutation of
re-encryptions of its input list, revealing neither the permutation nor the
re-encryption factors. Kazue Sako and Joe Kilian gave a universally verifiable mix
in 1995; Andrew Neff (2001) and Jun Furukawa and Kazue Sako (2001) gave efficient
proofs; Stephanie Bayer and Jens Groth (2012) reduced their size further; Douglas
Wikström's Verificatum implementation has been used in national elections. With
several mixes run by different authorities, each proving its shuffle, the voter's
privacy holds if any one mix is honest, and the correctness of the count holds even
if all of them are dishonest, because the proofs are checked by anyone. When these
proofs are implemented wrongly, the guarantee disappears: the Swiss Post e-voting
system's shuffle proof was found in 2019 to allow undetectable ballot substitution.
That story, and how the tally is decrypted and proven, belongs to
[Chapter 16](16-Electronic-Voting.md); the proofs themselves are built from the sigma
protocols of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md).

DC-nets meet voting in the same place. Dissent (§15.6) runs a verifiable shuffle
first, so that each member gets an anonymous slot in the DC-net and a disruptor can
be identified without breaking anyone else's anonymity. Anonymous channels, shuffles
and secret ballots are one family of problems: move a set of messages from a set of
people to a public place, so that every message arrives, none is added, and none can
be traced home.

## 15.17 In the real world

*Level: beginner.*

- **Tor** is the largest anonymity network: by the project's estimates two to three
  million daily users and some seven to eight thousand volunteer relays. It is used
  by people under censorship (often through bridges and Snowflake), by journalists
  and their sources (SecureDrop), by security researchers, by criminals, and by
  ordinary people who do not want to be tracked. Its weak points are the ones this
  chapter coded: end-to-end correlation, fingerprinting, malicious relays, and the
  browser.
- **Mix-nets** survive in two forms: in elections, as verifiable re-encryption mixes
  (Estonia, Switzerland's systems, research systems), and in messaging and VPN
  products of the Loopix family, such as Nym, whose user bases are still small.
- **Two-hop relays** carry by far the most traffic: iCloud Private Relay, Oblivious
  HTTP relays run by content-delivery networks, Oblivious DNS. They protect against
  any single operator, not against collusion or a global observer.
- **Remailers** are gone, and so is anon.penet.fi, but the lesson of 1996 holds:
  any service where one party holds the map from pseudonym to person will be made to
  open it.
- **Messengers** increasingly protect metadata partway: sealed sender, private
  contact discovery, and onion services for peer-to-peer apps.
- **Incidents** show where anonymity actually fails. Egerstad (2007) read what exits
  could read; the 2014 relay-early attack linked users to onion services; malicious
  exits in 2020 stripped HTTPS; and most arrests of Tor users have come from
  browser exploits and operational mistakes rather than from breaking circuits.

## 15.18 Going deeper

*Level: expert.*

**Formal models.** The ideal-world method of [Chapter 1](01-Computing-With-Secrets.md)
applies to anonymity. Jan Camenisch and Anna Lysyanskaya gave a formal treatment of
onion routing in 2005, defining what a secure onion is and building one; later work
gave universally composable definitions of onion routing and of Tor-like circuits,
and Sphinx was designed against such a definition. The anonymity trilemma of Das,
Meiser, Mohammadi and Kate (2018) proves lower bounds: against a global passive
observer, a protocol whose users send with little overhead must accept latency
growing with the number of users, or lose strong anonymity.

**Metadata-private messaging at scale.** A line of systems hides even who talks to
whom against a global observer by giving up some latency and accepting a carefully
measured leak. Vuvuzela (2015) passes every user's messages, real or dummy, through
a chain of servers into "dead drops" and adds noise to the counts so that what leaks
satisfies differential privacy ([Chapter 19](19-Differential-Privacy.md)); Stadium,
Karaoke and others scale the idea across many servers. Atom (2017) uses verifiable
shuffles in many small groups. cMix (2017), by Chaum and coauthors, moves a mix-net's
public-key work into a precomputation phase so that real-time mixing needs only
multiplications.

**Scaling Tor's directory.** Every client downloads the consensus, which costs
bandwidth on slow and mobile links and centralizes trust in the authorities. Walking
Onions (2020) proposed that clients choose relays from signed index ranges instead of
holding the whole list. Arti, the Tor Project's rewrite in Rust (version 1.0 in
2022), is the vehicle for many of these changes, CGO among them.

**Post-quantum anonymity.** Tor's handshakes and onion service keys, Sphinx headers,
and OHTTP's HPKE all rest on elliptic-curve Diffie-Hellman. Recorded anonymity
traffic is a natural target for "harvest now, decrypt later", because decrypting
it later reveals not only content but who talked to whom, which is what the user
wanted to hide. Hybrid KEMs fit OHTTP and Private Relay easily, since HPKE and TLS
already support them. They fit Tor and Sphinx less easily, because a lattice KEM's
public key and ciphertext, about 1,100 bytes each for ML-KEM-768 (FIPS 203), do not
fit in a 509-byte cell or a compact header, and Tor proposal 355 (2025) weighs these
costs. Lattice schemes and the migration are covered in the post-quantum book,
[Chapter 8](../post-quantum/08-ML-KEM.md) and
[Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md).

**Research ethics.** Studying a live anonymity network means studying its users,
who never agreed to be studied, and the 2014 attack showed what happens when
researchers attack the real thing. The Tor Research Safety Board, founded in 2016,
reviews proposed studies, and the field now expects measurement to use the least
data needed, aggregate it, and add noise where it can.

## Check yourself

??? question "1. TLS encrypts a web page completely. Name three things an observer on your home network still learns."

    Your IP address and the server's IP address; usually the server's name, from
    the TLS handshake (unless Encrypted Client Hello is used); the time of the
    visit; and the sizes and timing of the packets, which can reveal which page you
    loaded.

??? question "2. A mix receives messages from 10 senders, and the observer thinks one of them, Alice, sent output $X$ with probability 0.55, and each of the other nine with probability 0.05. Compute the entropy and the effective anonymity set size."

    $H = -0.55 \log_2 0.55 - 9 \cdot 0.05 \log_2 0.05 \approx 0.474 + 9 \cdot 0.216 =
    0.474 + 1.945 = 2.42$ bits. The effective size is $2^{2.42} \approx 5.3$,
    about half the nominal 10, and Alice is far more exposed than that number
    suggests.

??? question "3. In the two-mix example of §15.3, why does mix 2 never learn that the message came from Alice?"

    Mix 2 receives $2327$ from mix 1, together with three other messages from the
    same batch. It knows mix 1 sent them, not who sent them to mix 1, and the
    batching and sorted output at mix 1 broke the link between Alice's $516{,}584$
    and $2327$.

??? question "4. Why did Chaum include a random string $R$ in each layer, and what attack does a replay cache stop?"

    Without $R$ the encryption is deterministic, so an observer who sees an output
    can re-encrypt it under the mix's public key and find the matching input. A
    replay cache stops an attacker from resubmitting a copy of a message in a later
    batch and finding the one output the two batches have in common.

??? question "5. Three diners share coins $k_{AB} = 0$, $k_{BC} = 1$, $k_{AC} = 1$. Carol paid. What does each announce, and what is the XOR?"

    Alice: $0 \oplus 1 = 1$. Bob: $0 \oplus 1 = 1$. Carol: $1 \oplus 1 \oplus 1 = 1$.
    The XOR is $1 \oplus 1 \oplus 1 = 1$: one of the diners paid. Each coin appears
    twice and cancels, leaving Carol's bit.

??? question "6. In the onion of §15.7, how can relay A tell it is the first hop, and how do Sphinx and Tor prevent this?"

    The onion shrinks by 56 bytes per layer, so a 198-byte onion with a 30-byte
    message must have three layers left, and A is first. Sphinx keeps the header at
    a fixed length by appending filler as each layer is removed; Tor uses fixed-size
    cells and a length-preserving cipher, so every cell is 509 bytes of payload at
    every hop.

??? question "7. An adversary runs 5 percent of Tor's relays by bandwidth. Compare the chance that at least one of 500 circuits has a bad first and last hop, with and without a fixed guard."

    Without guards each circuit is bad with probability about $0.05^2 = 0.0025$, so
    500 circuits give $1 - 0.9975^{500} \approx 1 - e^{-1.25} \approx 0.71$. With a
    fixed guard the client is exposed only if its guard is bad, probability about
    0.05; in that case a bad exit appears often, but in the other 95 percent of
    cases it is never exposed this way.

??? question "8. Why does a guard XORing a pattern into a cell in tor1 not get caught by the middle relay, and what does Counter Galois Onion change?"

    In tor1 relays use counter mode, which is malleable, and only the hop the cell is
    addressed to checks the digest; the middle just decrypts and forwards, and the
    pattern survives decryption. CGO makes any change garble the whole cell and
    chains authentication tags from cell to cell, so a modified cell and everything
    after it become unusable rather than silently readable by a colluding exit.

??? question "9. Why does a v3 onion service store its descriptor under a blinded key rather than its real public key?"

    So that HSDir relays, which store the descriptor, cannot learn the service's
    address. Anyone who knows the address can compute the blinded key $A' = hA$ for
    the current period and find the descriptor, but $A'$ does not reveal $A$, and the
    descriptor is encrypted with a key derived from $A$. In v2 HSDirs learned
    addresses and could collect unlisted ones.

??? question "10. In the timing program of §15.12, the mix with 30-second delays defeated the correlation. Why does Tor not do the same, and what do Loopix and the Mars mail system do instead?"

    Delays of tens of seconds make the web unusable, and Tor chose low latency and
    low overhead (the anonymity trilemma). Loopix uses shorter exponential delays
    plus Poisson cover traffic and loops, acceptable for messaging. Earth-Mars mail
    already takes 4 to 24 minutes, so it can afford real mixing delays and
    constant-rate padding of each relay pass at almost no cost to its users.

## What you learned

- Encryption hides content, not metadata; who talks to whom, when and how much is
  visible unless the network itself is designed to hide it.
- Anonymity is measured by anonymity sets and their entropy, and every claim needs a
  named adversary: local, relay-owning, end-to-end, global or active.
- Chaum's mix (1981) hides links by layered public-key encryption with random
  padding, batching, reordering and replay checks; leave out any of these and the
  link returns.
- Batching gives an observer a $1/n$ guess per message, but the $n-1$ attack and the
  long-term statistical disclosure attack work around it; cover traffic and loops
  slow them down.
- The dining cryptographers' protocol gives information-theoretic sender anonymity,
  at the cost of everyone sending in every round, collisions and disruption.
- Onion routing drops the batching for speed. Tor builds three-hop circuits by
  telescoping ntor handshakes, sends fixed 509-byte cells under layered counter-mode
  encryption, chooses long-lived guards, and gets its view of the network from a
  consensus signed by directory authorities.
- Onion services meet clients at rendezvous points; v3 uses ed25519 addresses and
  blinded keys, replacing v2's RSA-1024 and 80-bit names in 2021.
- Tor does not stop end-to-end traffic correlation, and website fingerprinting works
  from one end in some settings; real incidents include snooping exits (2007), the
  relay-early attack (2014) and Sybil relays.
- Loopix and Nym trade seconds of delay and cover traffic for protection against a
  global observer; OHTTP (RFC 9458) and iCloud Private Relay split who from what
  across two non-colluding operators.
- Verifiable re-encryption shuffles bring anonymous channels to elections, with
  public proofs that no ballot was dropped or added.

**Next:** [Chapter 16](16-Electronic-Voting.md), where shuffles, homomorphic
tallies and threshold decryption come together to count a secret ballot that anyone
can verify.

## Further reading

- David Chaum, "Untraceable Electronic Mail, Return Addresses, and Digital
  Pseudonyms", *Communications of the ACM* 24(2) (1981).
- David Chaum, "The Dining Cryptographers Problem: Unconditional Sender and
  Recipient Untraceability", *Journal of Cryptology* 1(1) (1988).
- Andreas Pfitzmann and Marit Hansen, "A Terminology for Talking about Privacy by
  Data Minimization: Anonymity, Unlinkability, Undetectability, Unobservability,
  Pseudonymity, and Identity Management" (first version 2000, revised to 2010).
- Claudia Díaz, Stefaan Seys, Joris Claessens and Bart Preneel, "Towards Measuring
  Anonymity", and Andrei Serjantov and George Danezis, "Towards an Information
  Theoretic Metric for Anonymity" (both Privacy Enhancing Technologies, 2002).
- Dogan Kesdogan, Jan Egner and Roland Büschkes, "Stop-and-Go-MIXes Providing
  Probabilistic Anonymity in an Open System" (Information Hiding, 1998).
- Andrei Serjantov, Roger Dingledine and Paul Syverson, "From a Trickle to a Flood:
  Active Attacks on Several Mix Types" (Information Hiding, 2002).
- Dogan Kesdogan, Dakshi Agrawal and Stefan Penz, "Limits of Anonymity in Open
  Environments" (Information Hiding, 2002); George Danezis, "Statistical Disclosure
  Attacks" (IFIP SEC, 2003).
- George Danezis and Len Sassaman, "Heartbeat Traffic to Counter (n-1) Attacks"
  (WPES, 2003).
- Ulf Möller, Lance Cottrell, Peter Palfrader and Len Sassaman, "Mixmaster Protocol
  Version 2" (Internet-Draft, 2003).
- George Danezis, Roger Dingledine and Nick Mathewson, "Mixminion: Design of a Type
  III Anonymous Remailer Protocol" (IEEE Symposium on Security and Privacy, 2003).
- Roger Dingledine and Nick Mathewson, "Anonymity Loves Company: Usability and the
  Network Effect" (Workshop on the Economics of Information Security, 2006).
- Philippe Golle and Ari Juels, "Dining Cryptographers Revisited" (EUROCRYPT 2004);
  Henry Corrigan-Gibbs and Bryan Ford, "Dissent: Accountable Anonymous Group
  Messaging" (CCS 2010); Henry Corrigan-Gibbs, Dan Boneh and David Mazières,
  "Riposte: An Anonymous Messaging System Handling Millions of Users" (IEEE S&P
  2015).
- David Goldschlag, Michael Reed and Paul Syverson, "Hiding Routing Information"
  (Information Hiding, 1996).
- Roger Dingledine, Nick Mathewson and Paul Syverson, "Tor: The Second-Generation
  Onion Router" (USENIX Security, 2004).
- Ian Goldberg, Douglas Stebila and Berkant Ustaoglu, "Anonymity and One-Way
  Authentication in Key Exchange Protocols", *Designs, Codes and Cryptography* 67
  (2013).
- The Tor Project, *Tor Protocol Specification* (tor-spec), *Tor Rendezvous
  Specification Version 3* (rend-spec-v3, from proposal 224), and proposal 355,
  "Options for Postquantum Circuit Extension Handshakes" (2025).
- George Danezis and Ian Goldberg, "Sphinx: A Compact and Provably Secure Mix Format"
  (IEEE S&P 2009).
- Lasse Øverlier and Paul Syverson, "Locating Hidden Servers" (IEEE S&P 2006).
- Steven Murdoch and George Danezis, "Low-Cost Traffic Analysis of Tor" (IEEE S&P
  2005).
- Aaron Johnson, Chris Wacek, Rob Jansen, Micah Sherr and Paul Syverson, "Users Get
  Routed: Traffic Correlation on Tor by Realistic Adversaries" (CCS 2013).
- Yixin Sun and others, "RAPTOR: Routing Attacks on Privacy in Tor" (USENIX
  Security 2015); Milad Nasr, Alireza Bahramali and Amir Houmansadr, "DeepCorr:
  Strong Flow Correlation Attacks on Tor Using Deep Learning" (CCS 2018).
- Andriy Panchenko, Lukas Niessen, Andreas Zinnen and Thomas Engel, "Website
  Fingerprinting in Onion Routing Based Anonymization Networks" (WPES 2011); Marc
  Juarez, Sadia Afroz, Gunes Acar, Claudia Díaz and Rachel Greenstadt, "A Critical
  Evaluation of Website Fingerprinting Attacks" (CCS 2014); Payap Sirinam, Mohsen
  Imani, Marc Juarez and Matthew Wright, "Deep Fingerprinting" (CCS 2018).
- The Tor Project, "Tor Security Advisory: 'Relay Early' Traffic Confirmation
  Attack" (30 July 2014).
- "Tor Stinks" (NSA presentation, June 2012), published by the *Guardian*,
  4 October 2013.
- Jean Paul Degabriele, Alessandro Melloni, Jean-Pierre Münch and Martijn Stam, work
  on onion encryption behind Counter Galois Onion; the Tor Project's announcement of
  CGO (November 2025).
- Ania Piotrowska, Jamie Hayes, Tariq Elahi, Sebastian Meiser and George Danezis,
  "The Loopix Anonymity System" (USENIX Security 2017).
- Claudia Díaz, Harry Halpin and Aggelos Kiayias, "The Nym Network" (whitepaper,
  2021).
- Debajyoti Das, Sebastian Meiser, Esfandiar Mohammadi and Aniket Kate, "Anonymity
  Trilemma: Strong Anonymity, Low Bandwidth Overhead, Low Latency, Choose Two" (IEEE
  S&P 2018).
- RFC 9458, *Oblivious HTTP* (2024); RFC 9230, *Oblivious DNS over HTTPS* (2022);
  RFC 9180, *Hybrid Public Key Encryption* (2022); RFC 9292, *Binary HTTP* (2022);
  RFC 9474, *RSA Blind Signatures* (2023).
- Apple, "iCloud Private Relay Overview" (2021).
- Jan Camenisch and Anna Lysyanskaya, "A Formal Treatment of Onion Routing" (CRYPTO
  2005).
- Kazue Sako and Joe Kilian, "Receipt-Free Mix-Type Voting Scheme" (EUROCRYPT 1995);
  C. Andrew Neff, "A Verifiable Secret Shuffle and its Application to E-Voting" (CCS
  2001); Stephanie Bayer and Jens Groth, "Efficient Zero-Knowledge Argument for
  Correctness of a Shuffle" (EUROCRYPT 2012).
- Jelle van den Hooff, David Lazar, Matei Zaharia and Nickolai Zeldovich, "Vuvuzela:
  Scalable Private Messaging Resistant to Traffic Analysis" (SOSP 2015).
- RFC 9171, *Bundle Protocol Version 7* (2022).
