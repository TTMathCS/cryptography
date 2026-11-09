# 19. Hardware, quantum and the long view

*A cipher is mathematics, but a key has to live somewhere: in a clerk's head, on a card, in a chip, in a rack of servers. This last chapter tells what happened once keys moved into machines: the first time a machine gave away its secret by the noise it made (Bell Labs, 1943), the boxes, cards and chips built to hold keys, the security keys that beat the phishing page, the attackers who read keys from time, current and heat, and the machines built only to crack. It then tells the quantum story, from Feynman's question in 1981 through Shor's algorithm and the NIST competition to the migration under way, saying at each step what has been shown and what has only been claimed. It ends with an essay on what four thousand years of ciphers show, and a paragraph on what a cipher office on Mars could learn. You will time a careless check and read a secret out of it, run the classical half of Shor's algorithm and a simulated Grover search, play BB84, and work out how long the machines that crack would take.*

!!! abstract "In this chapter"
    **You will learn:**

    - how a Bell Labs engineer in 1943 saw a cipher machine's plaintext on an oscilloscope, and who built the first hardware security modules, chip cards and security keys;
    - why SIM cards, transport cards and the French bank card failed, and why a security key stops a phishing page that a one-time code does not;
    - how Kocher's timing attack (1996), power and fault attacks and Spectre (2018) turned correct mathematics into broken products (the history only), and what GPUs and ASICs did to safe key lengths;
    - how Feynman, Deutsch, Shor and Grover built the case against public-key cryptography, what quantum machines have and have not done, and how big a machine must be;
    - how the NIST competition of 2016 to 2025 chose its algorithms, what broke along the way, what other countries did, and why governments prefer post-quantum algorithms to quantum key distribution;
    - what the whole history shows about how ciphers live and die, who is missing from it, and what a settlement on Mars could take from it.

    **You need:** [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (the one-time pad and why keys are used once), [chapter 15](15-Shannon-and-the-Agencies.md) (the agencies and their secrecy), [chapter 16](16-Feistel-Lucifer-and-DES.md) (DES and Deep Crack), [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) (RSA and the crypto wars) and [chapter 18](18-The-Internet-Era.md) (TLS, the AES competition and the bugs of the internet years). Book 1's [chapter 18](../../book/18-Side-Channels.md) and [chapter 20](../../book/20-Quantum-Computers.md) teach the side channels and the quantum computer; this chapter tells who found them and when.

    **Levels:** §19.1 to §19.3, §19.5 and §19.13 are for beginners, §19.4, §19.6 to §19.12 are intermediate, §19.14 is expert.

## 19.1 The problem: the key is in a machine

*Level: beginner.*

Through the first eighteen chapters of this book a key was a thing a person kept: a keyword, a page of numbers, a card of daily settings. The attacker's job was to read the messages, and the defender's job was to keep the key from the enemy's hands. After the Second World War a second job appeared that no clerk had needed to think about. The machine that held the key was now an object with a power supply, a clock, a case and wires, and every one of those could tell a listener something. A cipher could be mathematically sound and the box that ran it could still talk.

Two stories run side by side in this chapter. The first is about **where the key lives**. Banks, phone companies and later everyone else wanted keys that a thief could not copy, so they put them inside boxes, cards, chips and tokens that do the cryptography themselves and give only the answer. That works until someone finds out how to read the key out of the box anyway. The second is about **what is waiting at the end of the road**. The public-key systems of chapter 17 rest on problems that a large quantum computer would solve, and since 2016 the world has been replacing them before that machine exists, the first time in this book that a cipher is being retired for a threat that has not yet arrived.

Between them is a third strand, shorter: **machines built only to crack**, which from 1998 on have set the length a key needs to have. Figure 19.1 gives the dates of the first half of the chapter.

<figure class="mars-fig">
<svg viewBox="0 0 640 358" width="640" role="img" aria-label="Timeline of keys in hardware and the leaks from it, 1943 to 2018" fill="currentColor" font-size="14" stroke="none">
<path d="M102 8V350" fill="none" stroke="currentColor" stroke-width="1.6"/>
<g text-anchor="end" font-weight="bold">
<text x="88" y="27">1943</text>
<text x="88" y="53">1951</text>
<text x="88" y="79">1956</text>
<text x="88" y="105">1972</text>
<text x="88" y="131">1974</text>
<text x="88" y="157">1985</text>
<text x="88" y="183">1996</text>
<text x="88" y="209">1998</text>
<text x="88" y="235">1999</text>
<text x="88" y="261">2008</text>
<text x="88" y="287">2014</text>
<text x="88" y="313">2017</text>
<text x="88" y="339">2018</text>
</g>
<path d="M102 22h0M102 48h0M102 74h0M102 100h0M102 126h0M102 152h0M102 178h0M102 204h0M102 230h0M102 256h0M102 282h0M102 308h0M102 334h0" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
<text x="118" y="27" font-weight="bold">Bell Labs sees spikes from the 131-B2 mixer</text>
<text x="118" y="53">The CIA finds the same leak again</text>
<text x="118" y="79">MI5 reportedly listens to a Hagelin machine</text>
<text x="118" y="105">The Atalla box guards ATM PINs</text>
<text x="118" y="131">Moreno's patent for a chip card</text>
<text x="118" y="157">Van Eck reads a screen from the street</text>
<text x="118" y="183" font-weight="bold">Kocher: keys from timing</text>
<text x="118" y="209">Deep Crack; COMP128 broken; Humpich's card</text>
<text x="118" y="235">Kocher, Jaffe, Jun: power analysis</text>
<text x="118" y="261">The first YubiKey</text>
<text x="118" y="287">U2F; TPM 2.0; Rowhammer</text>
<text x="118" y="313">ROCA: weak keys made inside secure chips</text>
<text x="118" y="339" font-weight="bold">Spectre and Meltdown</text>
</svg>
<figcaption>Figure 19.1. Keys in hardware and the leaks from it. The first leak (1943) is also the oldest secret in the chapter.</figcaption>
</figure>

Two warnings about the sources. For the first half of the century the evidence is thin and comes from the services themselves, declassified decades later. For the last twenty years it is abundant and contested, written by companies, researchers and governments who each want you to believe something. Where a date or number rests on one source, or on a press report I could not check, the sentence says so.

## 19.2 The first leak: Bell Labs, 1943, and Tempest

*Level: beginner.*

In 1943 the United States Army and Navy were enciphering their teleprinter traffic with a machine made by Bell Telephone Laboratories. Its core was a device called the 131-B2 mixer, which combined the characters of the message with a stream of key characters. A teleprinter message that went through it left the building as noise. The cipher itself was sound, and nobody had reason to doubt it.

The account that survives comes from the NSA. In 1972 its internal journal *Cryptologic Spectrum* printed "TEMPEST: A Signal Problem", declassified in 2007. A Bell Labs engineer was testing the mixer when he noticed that every time the machine stepped, a spike appeared on an oscilloscope in a distant corner of the laboratory. The spikes were the electrical signal of the machine's relays, and with some work they could be read as the characters being enciphered. The output was safe; the plaintext was radiating through the wall.

The Army's Signal Corps did not believe it, the article says. Bell Labs then ran a demonstration from across the street, at about 80 feet, and recovered most of the plaintext of a message typed in the test room, which the article gives as about three-quarters. After that the Army took it seriously, but the services found Bell's shielding and filtering costly in the field, and the problem was not widely fixed during the war. I have only that one account, so the distances and the percentage are as the NSA gave them and no better. It does not name the engineer.

!!! note "Life story: the 131-B2 leak and TEMPEST"
    **Born:** 1943, at Bell Telephone Laboratories, New York; the NSA's account printed in 1972, declassified in 2007 · **Purpose:** the leak was an accident; the response was to find how far a cipher machine's electrical signal could be read, and to stop it · **Helped:** started the field the US government code-named TEMPEST: shielded rooms, filtered power lines, and the rule of keeping circuits that carry plain text ("red") apart from those that carry cipher ("black") · **Status:** still a requirement for equipment that handles classified information; the many versions online of what the letters stand for are guesses

The phenomenon was found again. By the NSA's account the CIA rediscovered it in 1951, and through the 1950s and 1960s the American services built up rules and tested equipment, most of them still classified. Outside the United States we know the idea from stories. Peter Wright, a British scientist at MI5, says in his memoir *Spycatcher* (1987) that in 1956, during the Suez crisis, MI5 and GCHQ put a microphone near a Hagelin cipher machine (the company of chapter 15) in the Egyptian embassy in London, an operation he calls ENGULF, and listened to its rotors click to work out the settings. Wright was a man with a grievance and a taste for a good story, so I give it as his account.

In the open world nobody knew. In 1985 a Dutch engineer, Wim van Eck, published a paper in *Computers & Security* showing that the image on an ordinary video display could be reconstructed from the radio waves it gave off, with a modified television set, from some distance, and demonstrated it on British television. Banks and governments were alarmed, though the problem was forty years old. In 1998 Markus Kuhn and Ross Anderson at Cambridge showed that software could control what a screen radiated, to hide text in the emissions or to set text in fonts that radiate less. They called it soft Tempest.

The pattern returns in every section of this chapter. A weakness is found inside a government, which keeps it secret and fixes it for itself. Years later the same weakness is found in the open, by people who had not been told. The 131-B2 is the first example in the record; GCHQ's secret discovery of public-key cryptography (chapter 17) is another, and §19.13 returns to what the pattern costs.

### In the real world

What the sources show: the NSA article exists and was declassified in 2007; van Eck's paper and the Kuhn and Anderson paper are in print. What they do not show: which Allied machines leaked, or whether any enemy used the leak in war. The Tempest standards are mostly still classified, so it would be wrong to say anyone read wartime traffic this way. In 1943 the possibility was known.

## 19.3 Keys in boxes and cards: HSMs and smart cards

*Level: beginner.*

By the late 1960s banks were putting cash machines on the street and connecting them to central computers by telephone line. The customer typed a PIN, and somewhere it had to be checked. If the check ran on a computer that a programmer or a thief could read, the PIN was safe only while everyone with access was honest.

The answer was a box that did the checking and let no one see inside. Mohamed Atalla, an Egyptian-born engineer who had worked at Bell Labs on transistors before starting his own company, built one in the early 1970s. The Atalla box (dated 1972 or 1973) is often called the first **hardware security module**, or HSM: a tamper-resistant box that holds keys and does the cryptography itself, so that a program next to it can ask "is this PIN correct?" or "sign this" and get only the answer. If someone opens the box it is built to erase its keys. I take the dating and the "first" from histories of the company, so read "first" as the first I can find.

HSMs now sit behind banks, certificate authorities and cloud key services. The most public use is the signing of the internet's naming system: the root keys of DNSSEC ([Protocols book](../protocols/10-DNSSEC-and-Private-DNS.md)) live in HSMs used only at filmed ceremonies where keyholders from several countries each bring a smart card and a quorum is needed to wake the device. It is a modern answer to an old question: who can be trusted to hold the key, and how can everyone else check?

### The chip card

The second place for a key was a card in a pocket. The history of the **smart card** is a priority argument with several claimants. Kunitaka Arimura in Japan patented a card with an integrated circuit in 1970 (I know that only from encyclopedia accounts). In West Germany Jürgen Dethloff and Helmut Gröttrup (a rocket engineer taken to the Soviet Union after the war and later returned) filed a patent in 1968. The French inventor Roland Moreno filed his in March 1974 for a small memory chip in a card, and he is the name most widely credited, partly because French industry turned the idea into a product. As usually told, his design could count wrong tries and lock itself, the idea behind every PIN-protected card since.

A memory card is not yet a secure one. What let a card keep a secret was a *microprocessor* on it, so that the key lived inside and the card computed with it and never revealed it. Michel Ugon, an engineer at the French computer company Bull, patented such a design in 1977, and Bull's CP8 card followed. France then did what no other country did at once. France Télécom issued memory-chip phone cards from 1983, and the banks, who had issued their magnetic-stripe *Carte Bleue* since the late 1960s, moved the whole country to chip cards in the late 1980s and early 1990s. A stripe can be copied by anyone with a reader; a chip that answers a challenge with a calculation using a secret key inside cannot be (Figure 19.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A program asks a device that holds the key to sign or decrypt and gets only the answer back; five kinds of device are listed below" fill="currentColor" font-size="14" stroke="none">
<rect x="10" y="30" width="150" height="64" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="85" y="58" text-anchor="middle" font-weight="bold">a program</text>
<text x="85" y="78" font-size="13" text-anchor="middle">on a computer</text>
<rect x="480" y="30" width="150" height="64" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="555" y="58" text-anchor="middle" font-weight="bold">the device</text>
<text x="555" y="78" font-size="13" text-anchor="middle">holds the key</text>
<path d="M160 52H480" fill="none" stroke="currentColor" stroke-width="1.3"/>
<path d="M480 52l-7 -3v6z"/>
<text x="320" y="44" font-size="13" text-anchor="middle">“sign this” or “decrypt this”</text>
<path d="M480 76H160" fill="none" stroke="currentColor" stroke-width="1.3"/>
<path d="M160 76l7 -3v6z"/>
<text x="320" y="96" font-size="13" text-anchor="middle">only the answer comes back</text>
<path d="M555 94V130" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<rect x="10" y="130" width="114" height="74" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="67" y="156" text-anchor="middle" font-weight="bold">HSM</text>
<text x="67" y="176" font-size="13" text-anchor="middle">a box</text>
<text x="67" y="195" font-size="12" text-anchor="middle">1972</text>
<rect x="136" y="130" width="114" height="74" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="193" y="156" text-anchor="middle" font-weight="bold">smart card</text>
<text x="193" y="176" font-size="13" text-anchor="middle">a chip</text>
<text x="193" y="195" font-size="12" text-anchor="middle">1974</text>
<rect x="262" y="130" width="114" height="74" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="319" y="156" text-anchor="middle" font-weight="bold">TPM</text>
<text x="319" y="176" font-size="13" text-anchor="middle">on the board</text>
<text x="319" y="195" font-size="12" text-anchor="middle">2003</text>
<rect x="388" y="130" width="114" height="74" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="445" y="156" text-anchor="middle" font-weight="bold">enclave</text>
<text x="445" y="176" font-size="13" text-anchor="middle">in the CPU</text>
<text x="445" y="195" font-size="12" text-anchor="middle">2004-15</text>
<rect x="514" y="130" width="114" height="74" rx="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
<text x="571" y="156" text-anchor="middle" font-weight="bold">security key</text>
<text x="571" y="176" font-size="13" text-anchor="middle">in a hand</text>
<text x="571" y="195" font-size="12" text-anchor="middle">2008-14</text>
<text x="320" y="230" font-size="13" text-anchor="middle">The key never has to leave. The price is that the device has its own</text>
<text x="320" y="250" font-size="13" text-anchor="middle">weaknesses: home-made ciphers, timing, power draw, its maker.</text>
<text x="320" y="276" font-size="12" text-anchor="middle">(dates are the first use of the idea, not of the standard)</text>
</svg>
<figcaption>Figure 19.2. Five places a key has been put so that a program can use it without ever holding it.</figcaption>
</figure>

!!! note "Life story: Roland Moreno"
    **Born:** 1945, in Cairo; died 2012 in Paris · **Purpose:** a small, cheap object with a memory that holds a person's identity and refuses to answer after a few wrong guesses; patent filed 1974, licensed through his company Innovatron · **Helped:** the idea became the chip in the French bank card, the SIM, the passport and the transit card · **Status:** the patent has long expired; the priority question with Arimura, Dethloff, Gröttrup and Ugon is told differently by each country

The French story has a famous end. The bank card had a secure design and a weak key: cards authenticated themselves to terminals with an RSA signature, and the issuer's public key was only 320 bits long. In 1997 and 1998, as most accounts give it, a French engineer named Serge Humpich factored that number on ordinary computers, worked out how to make a card that terminals accepted without a valid secret (a "yes card"), and used it to buy Paris metro tickets. When he tried to sell his discovery to the banks he was arrested, and in 2000 he was convicted of fraud and given a suspended sentence. I give the dates and key size as the press and later accounts do; I did not see the court record. The banks replaced the key. The lesson was the oldest in the book: a cipher is as strong as its key, and a key chosen for the machines of a decade earlier is a quiet liability.

### EMV, SIMs and the small, secret ciphers

The French lead became the world's standard. Europay, Mastercard and Visa published the EMV specification in 1996, and EMVCo took it over in 1999. The United Kingdom changed to "chip and PIN" between 2003 and 2006. Ross Anderson's earlier "Why Cryptosystems Fail" (1993) had shown that most cash-machine losses came from staff and procedures, not broken ciphers, a point §19.13 returns to.

The other great chip-card system was the mobile phone. GSM gave every subscriber a **SIM card** (in service from 1991) holding a secret key shared with the network, checked by an algorithm the operators kept secret. Small chips meant small and secret ciphers, and they failed as soon as someone looked. In 1998 Marc Briceno, Ian Goldberg and David Wagner broke COMP128, which many SIMs used, and could clone a card. GSM's voice cipher A5/2 was broken in 1999, and attacks on the stronger A5/1 became practical with precomputed tables around 2009 and 2010. In 2007 and 2008 groups in Germany (Karsten Nohl, Henryk Plötz and colleagues) and the Netherlands (Radboud University) reverse-engineered the Crypto-1 cipher of the MIFARE Classic, the contactless card behind London's Oyster and the Dutch OV-chipkaart, from the chip itself and broke it. Its key was 48 bits. Its makers had kept the cipher secret, and the secret held until someone took a microscope to the chip.

Kerckhoffs's rule of 1883 ([chapter 10](10-The-Telegraph.md)) predicts all three: COMP128, A5/2 and Crypto-1 were home-made, kept secret on the theory that secrecy added strength, and fell within months or a few years of being examined.

## 19.4 Keys in the computer: TPMs, enclaves and instructions

*Level: intermediate.*

From the late 1990s the same idea moved from the bank and the telephone into the ordinary computer. A personal computer is a poor place for a key. It runs software from many authors, and any of them may be hostile, so the key must sit somewhere the software can use it but not read it.

The first answer was a small chip on the motherboard. A group of companies formed the Trusted Computing Platform Alliance in 1999, and in 2003 it became the Trusted Computing Group, which specified the **Trusted Platform Module**, or TPM. The chip stores keys and, as the machine starts, records a fingerprint of each piece of software that loads; it releases a key only if the fingerprints match what they were when the key was stored. That is how a disk can open only on its own machine in its own unaltered state, and Windows used it that way for BitLocker from 2007. TPM 2.0 came out in 2014, and Microsoft made it a requirement for Windows 11 in 2021.

The TPM was also a political fight. A chip that keeps the owner out of his own machine and lets the software vendor in could lock people into one program or one music store. Richard Stallman said so in "Can You Trust Your Computer?" (2002). In practice the TPM mostly serves the owner, protecting the disk key and the login, but it showed that every key in a device raises the question of who controls the device.

A TPM is also only as good as the code that made its keys. In 2017 researchers led from Masaryk University in the Czech Republic published the ROCA flaw. A widely used library from the chip maker Infineon generated RSA keys whose primes had a hidden structure, so a 2048-bit key could be factored at a cost in the tens of thousands of dollars. The affected chips included TPMs, security tokens and the national identity cards of Estonia, about 750,000 of them by the figures reported. They were certified and correct in every way the certification checked.

### Enclaves

The second answer was to carve a protected region out of the processor itself. ARM's **TrustZone** (2004) divided a chip into a "normal world" and a "secure world". Apple's **Secure Enclave**, a separate small processor in the phone's chip, arrived with the iPhone 5s in 2013. It holds the fingerprint data and the keys that encrypt the phone, and it counts wrong passcode guesses, so that no program, not even the operating system, can try passcodes faster than it allows. It figured in a famous dispute. In February 2016 the FBI asked a court to order Apple to write software that would remove the limit on passcode tries from a phone used by one of the San Bernardino attackers. That phone was an iPhone 5c, an older model without a Secure Enclave, and the FBI withdrew in March when an outside company got into it. What governments may demand of the people who build such hardware is the crypto-war question of chapter 17, moved into silicon.

Intel's **SGX** (2015) tried to let ordinary programs run code in protected memory that even the operating system could not read. A series of attacks, among them Foreshadow (2018), read that memory through the processor's speculative execution (§19.6), and Intel removed SGX from its consumer processors in the early 2020s. Cloud providers now sell whole encrypted virtual machines instead (AMD's SEV, Intel's TDX), with the same question: is the hardware's maker inside the circle of trust?

### Instructions

The last step was to put the cipher itself into the processor. Intel announced the **AES-NI** instructions in 2008 and shipped them in the Westmere processors in 2010; AMD followed in 2011, and ARM's 64-bit architecture added AES and SHA instructions. AES went from tens of cycles per byte in software to about one, so speed was no longer a reason not to encrypt, and the instructions run in constant time, which closes the cache leak of §19.6. Phones without them got ChaCha20-Poly1305, which Google began to deploy in Chrome and on its servers in 2014. Intel added a hardware random-number instruction, RDRAND, in 2012, and the Linux maintainers declined to rely on it alone, a caution that looked wiser after the Snowden documents of 2013.

## 19.5 Keys you hold: security keys and passkeys

*Level: beginner.*

The weakest key in most people's lives is a password, and the cheapest attack on a password is to ask for it. A **phishing** page copies the look of a bank's login and the person types the password into it. Organizations answered with a second factor: RSA's SecurID tokens (since the 1980s) showed a six-digit number that changed every minute, and phone apps did the same under the open standards HOTP (RFC 4226, 2005) and TOTP (RFC 6238, 2011). They stop a thief who has only the password. They do not stop a phishing page that asks for the code too, because the code does not know where it is being typed. The page relays it to the real bank within the thirty seconds it lasts.

The token system had its own weak point. In March 2011 attackers broke into RSA's network and stole data about SecurID, and the company later said the data had been used in an attack on at least one defense contractor, which press reports named as Lockheed Martin.

The change that worked was to let the device see the website. Yubico, a Swedish company founded in 2007 by Stina Ehrensvärd and Jakob Ehrensvärd, sold the first **YubiKey** in 2008. Google and Yubico, with others, developed **U2F**, and the FIDO Alliance, founded in 2012, published it in December 2014. A U2F key holds a private key for each website it is registered with. At login the website sends a challenge; the browser passes the challenge and the real name of the website to the key, which signs both. A look-alike page has a different name, so the answer is useless to it. FIDO2, pairing the key protocol with the W3C's WebAuthn browser standard (a recommendation in March 2019), went on to logins with no password at all, and in 2022 Apple, Google and Microsoft each announced **passkeys**: the same credential kept in a phone or computer and synchronized between a person's devices. The Protocols book tells the protocol in its [chapter on passkeys](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md).

### Try it: why the code is phished and the key is not

A real security key signs with a public-key pair. The toy below uses a keyed hash (HMAC) from the standard library where the key would sign, which keeps the code short and shows the one idea that matters: the key's answer depends on the name of the site it is given.

```python
import hmac, hashlib, struct

def hm(key, msg):
    return hmac.new(key, msg, hashlib.sha256).digest()

master = hashlib.sha256(b"inside the security key").digest()   # never leaves the device

def key_answer(site, challenge):
    site_key = hm(master, site.encode())       # a different key for every site name
    return hm(site_key, challenge).hex()[:8]

def totp(seed, t):
    # a one-time code depends on the seed and the clock, not on where you type it
    return hm(seed, struct.pack(">Q", t // 30)).hex()[:6]

challenge = b"login-attempt-7731"
bank_expects = hm(hm(master, b"bank.example"), challenge).hex()[:8]

real = key_answer("bank.example", challenge)             # the browser says which site it is on
fake = key_answer("bank-example.login.test", challenge)  # a phishing page relays the challenge
print("security key, real site accepted:   ", real == bank_expects)
print("security key, phishing page accepted:", fake == bank_expects)

seed = hashlib.sha256(b"phone app seed").digest()
t = 1_700_000_000                                        # a fixed moment so the run repeats
typed_into_phishing_page = totp(seed, t)                 # what the person reads off the phone
print("one-time code, relayed to the bank accepted:", typed_into_phishing_page == totp(seed, t))
```

Output:

```
security key, real site accepted:    True
security key, phishing page accepted: False
one-time code, relayed to the bank accepted: True
```

The last line is the whole weakness of the one-time code: relayed within its thirty seconds, it is as good as the real thing.

### In the real world

Google said in 2018, as reported by the journalist Brian Krebs, that after it required security keys for its employees in early 2017, none of its more than 85,000 employees had had an account taken over by phishing. That is a company's statement about a workforce that was told what to do, not an independent study, but it is the best evidence we have. Weak points remain: a person can be talked into approving a login, a thief can steal a phone that holds synchronized passkeys, and the recovery path for a lost key is usually weaker than the key. The claim is narrow and it holds: the credential is bound to the site's name, so it cannot be handed to the wrong site.

## 19.6 The leak in the open: timing, power, faults and caches

*Level: intermediate.*

The Bell Labs engineer of 1943 found a leak by accident and the services kept it secret. In the open world the leaks came out of the 1990s, found by people who wanted them known. The techniques are the subject of [the Cryptanalysis book's chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md), which works out how an attacker turns each into a key, and of [book 1's chapter 18](../../book/18-Side-Channels.md); how to write code that leaks nothing is the [Engineering book's](../engineering/index.md). This section tells who found what, and when.

In 1996 Paul Kocher, an independent consultant in his twenties who had studied biology at Stanford and had founded a small company, Cryptography Research, in 1995, presented a paper at CRYPTO. The time a device took to do an RSA or Diffie-Hellman private-key operation depended on the bits of the key, he showed, and an attacker who could time many operations could recover the key bit by bit. In 1998 Jean-François Dhem and colleagues made it work on a smart card. In 2003 David Brumley and Dan Boneh made it work against an OpenSSL web server across a local network, which ended the argument that network noise would hide the signal.

!!! note "Life story: Kocher's timing attack"
    **Born:** 1996, Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems" (CRYPTO '96) · **Purpose:** to show that a correct implementation could leak a key through how long it took · **Helped:** started the study of implementation attacks; led to *blinding* (randomizing the input) and *constant-time* code (the same steps in the same order whatever the key) · **Status:** every serious library is now written to resist it; it still works against code that is not

The idea is easier to see in a toy than in an RSA exponent. A check that compares a secret one character at a time and stops at the first mismatch takes longer the more characters are right. The program below counts the steps that stand in for time. The attacker never sees the secret, only how long each check takes.

```python
import hmac, string

SECRET = "K7QX2M"                   # the server's secret code

def leaky_check(guess):
    # Compares one character at a time and stops at the first mismatch.
    # `steps` stands in for the time the check takes.
    steps = 0
    for a, b in zip(guess, SECRET):
        steps += 1
        if a != b:
            return False, steps
    return len(guess) == len(SECRET), steps

# The attacker never sees SECRET, only how long each check takes
known = ""
for position in range(len(SECRET)):
    timings = {}
    for ch in string.ascii_uppercase + string.digits:
        guess = (known + ch).ljust(len(SECRET), "-")
        ok, steps = leaky_check(guess)
        timings[ch] = (steps, ok)           # how long it took, and whether it worked
    known += max(timings, key=timings.get)  # the slowest guess got one more right
    print(known)

print(leaky_check(known)[0], "after", 36 * len(SECRET), "guesses instead of", f"{36 ** 6:,}")
print(hmac.compare_digest(known, SECRET))  # the fix: a comparison that takes the same time
```

Output:

```
K
K7
K7Q
K7QX
K7QX2
K7QX2M
True after 216 guesses instead of 2,176,782,336
True
```

216 guesses instead of two billion. Real timing differences are tiny and noisy, so a real attacker repeats each guess many times and averages, but the principle is exactly this. Python's `hmac.compare_digest` exists for this reason.

The other leaks followed in order. In September 1996 Bellcore announced, and in 1997 Dan Boneh, Richard DeMillo and Richard Lipton published, the **fault attack**: if a smart card makes one error while computing an RSA signature with the Chinese-remainder shortcut, the faulty signature gives away the private key. In 1998 and 1999 Kocher, Joshua Jaffe and Benjamin Jun published **power analysis**: the current a card draws depends on the data, and statistics over thousands of traces can pull out an AES key. Every payment-card chip since has been built against it. In 2005 Daniel Bernstein, Colin Percival, and Dag Arne Osvik with Adi Shamir and Eran Tromer showed that AES's table lookups leave marks in the processor's **cache** that another program on the same machine can read. In 2013 Daniel Genkin, Shamir and Tromer recovered 4096-bit RSA keys from a laptop by recording the faint noise its electronics made while decrypting. In 2014 Yoongu Kim and colleagues showed **Rowhammer**: reading one row of memory over and over flips bits in the rows beside it.

### Spectre and Meltdown

The leak that ended the argument was found in the way processors work. A modern processor guesses which way a program will go and runs ahead, undoing the work if it guessed wrong. On 3 January 2018, a few days earlier than planned because press reports had begun, researchers disclosed that the undoing is incomplete: the guessed work leaves traces in the cache that can be measured. **Meltdown** let an ordinary program read the kernel's memory; **Spectre** let one program, or a web page's JavaScript, trick another into leaking its secrets. They were found separately by Jann Horn of Google's Project Zero, by Paul Kocher with Daniel Genkin, Mike Hamburg and Yuval Yarom, and by a team at Graz University of Technology with researchers at Cyberus Technology. Almost every high-performance processor of the previous twenty years was affected. Fixing it took changes to operating systems, browsers, compilers and the chips, and variants kept coming; the *GoFetch* attack of 2024 broke constant-time cryptography on Apple's M-series chips through a memory-prefetching feature added for speed.

!!! note "Life story: Spectre and Meltdown"
    **Born:** reported privately in 2017; public on 3 January 2018 · **Purpose:** not designed; a side effect of speed, present in processors for about twenty years · **Helped:** made every cryptographer and chip designer treat the processor's guessing as attack surface; browsers now isolate sites in separate processes · **Status:** mitigated, not removed; new variants appeared through the 2020s

### How the practice changed

Out of these two decades came new habits: libraries with fewer sharp edges (Bernstein, Lange and Schwabe's NaCl of 2008 and libsodium of 2013), BoringSSL and LibreSSL after Heartbleed ([chapter 18](18-The-Internet-Era.md)), constant-time code that tools can check, test suites built from past attacks (Google's Project Wycheproof, 2016) and machine-checked proofs (the verified HACL* code ships in Firefox). That is the Engineering book's subject. The history says one thing: after 1996, a proof about the mathematics of a cipher no longer ended the argument about whether a product was secure.

## 19.7 Machines that crack

*Level: intermediate.*

Hardware also worked for the attacker, and it settled the length of keys more than any argument did. Deep Crack, the Electronic Frontier Foundation's machine of 1998, is told in [chapter 16](16-Feistel-Lucifer-and-DES.md): a machine of custom chips that cost less than \$250,000 and that found a 56-bit key in about two days. It had been foreseen. In January 1996 Matt Blaze, Whitfield Diffie, Ronald Rivest, Bruce Schneier, Tsutomu Shimomura, Eric Thompson and Michael Wiener published a short report estimating what a determined attacker could build, and concluded that 75 bits was the least a key should have then and about 90 bits for a key meant to last twenty years. A cheaper machine followed: COPACOBANA, built by German university groups in 2006 from 120 off-the-shelf programmable chips for under 10,000 euros, found a DES key in under nine days on average.

Then the hardware changed under everyone. Graphics cards, built to do thousands of simple sums at once for games, proved ideal for trying password guesses, and programs such as hashcat made it routine from about 2009. In December 2012 the researcher Jeremi Gosney showed a cluster of 25 graphics cards that tried about 350 billion guesses a second against the fast hash Windows used for passwords. That year attackers had published the unsalted SHA-1 hashes of 6.5 million LinkedIn accounts, and press reports said most were cracked within days. This is why a fast hash like MD5 or SHA-256 is the wrong way to store a password and a deliberately slow, memory-hungry one (book 1's [chapter 11](../../book/11-Passwords-and-Key-Derivation.md)) is the right one.

The third kind was an accident of money. Bitcoin's proof of work is a race to compute double SHA-256 hashes. Miners moved from processors (2009) to graphics cards (2010), programmable chips (2011) and, from 2013, chips that do nothing but Bitcoin hashing, the first sold as the Avalon in January 2013. By the mid-2020s the whole network computed more than $5 \times 10^{20}$ hashes a second, as the public statistics show.

```python
# How fast is fast? Three numbers from the history of cracking machines.
deep_crack = 90e9                      # DES keys a second, Deep Crack, 1998
whole = 2 ** 56 / deep_crack / 3600
print(f"DES: the whole key space takes {whole:.0f} hours; the average search, {whole / 2:.0f}")

gosney = 350e9                         # guesses a second, 25 graphics cards, 2012
every_password = 95 ** 8               # every 8-character password of printable ASCII
print(f"8-character passwords: {every_password / gosney / 3600:.1f} hours")

bitcoin = 5e20                         # hashes a second, the whole network, mid-2020s
print(f"2^80 hashes (an old '80-bit' security level): {2 ** 80 / bitcoin / 60:.0f} minutes")
```

Output:

```
DES: the whole key space takes 222 hours; the average search, 111
8-character passwords: 5.3 hours
2^80 hashes (an old '80-bit' security level): 40 minutes
```

Deep Crack's find took 56 hours, about half the average, which was luck. The last line is a comparison and not a threat, since the Bitcoin network can compute one function and cannot be pointed at a cipher. But it says what a specialized machine with enough money behind it can do, and why every modern recommendation asks for 128-bit security and not 80.

## 19.8 A computer made of physics: Feynman to Shor and Grover

*Level: intermediate.*

The last strand begins with a physicist's complaint. In 1980 Paul Benioff and Yuri Manin had each sketched how a computer might obey quantum mechanics. In May 1981, at an MIT conference on the physics of computation, Richard Feynman pointed out that ordinary computers are hopelessly slow at simulating quantum systems, because the information needed doubles with every particle added. Why not build the computer out of quantum parts? His talk appeared in 1982, and in 1985 David Deutsch at Oxford described a *universal quantum computer* in precise terms. Its unit is the *qubit*; with $n$ of them there are $2^n$ numbers (amplitudes) in play at once, and an algorithm works by making the amplitudes of wrong answers cancel and those of right answers add. Book 1's [chapter 20](../../book/20-Quantum-Computers.md) teaches how.

For a decade it was a physicist's toy, with speedups for made-up problems (Deutsch and Richard Jozsa 1992, Daniel Simon 1994). Then in 1994 **Peter Shor** at AT&T Bell Labs, who has said Simon's paper gave him the idea, showed how a quantum computer could factor large numbers and compute discrete logarithms in polynomial time; he presented it at the FOCS conference that November. The method turns factoring into finding a *period*: the powers $a, a^2, a^3, \ldots \bmod N$ repeat with some period $r$, and knowing $r$ gives a factor of $N$ at least half the time. Finding $r$ is as hard classically as factoring, but a quantum computer can put all the exponents in superposition and use a *quantum Fourier transform* to make the answer show up. The same method breaks discrete logarithms, in ordinary numbers and on elliptic curves, so RSA, Diffie-Hellman, DSA and ECDSA fall together.

!!! note "Life story: Shor's algorithm"
    **Born:** 1994, Peter Shor, AT&T Bell Labs; FOCS in November, the *SIAM Journal on Computing* in 1997 · **Purpose:** to show a task a quantum computer could do that no known classical computer could do in reasonable time · **Helped:** turned quantum computing from a curiosity into a funded research field, and started the search for algorithms that resist it · **Status:** correct, and run only on toy numbers; it needs a machine that does not exist

The program below does the classical half. It finds the period the slow way, by trying every exponent, which is exactly the step a quantum computer would do fast, and then turns the period into factors. The last case is the textbook RSA modulus $3233 = 61 \times 53$.

```python
from math import gcd

def period(a, N):
    # The step a quantum computer does fast: the smallest r with a^r = 1 mod N.
    # Done here the slow way, by trying r = 1, 2, 3, ...
    r, x = 1, a % N
    while x != 1:
        x = x * a % N
        r += 1
    return r

for N, a in ((15, 7), (21, 2), (3233, 3)):
    r = period(a, N)
    half = pow(a, r // 2, N)                 # works when r is even and half != N - 1
    print(f"N={N} a={a}: period {r}, factors {gcd(half - 1, N)} x {gcd(half + 1, N)}")
```

Output:

```
N=15 a=7: period 4, factors 3 x 5
N=21 a=2: period 6, factors 7 x 3
N=3233 a=3: period 260, factors 61 x 53
```

For a 2048-bit modulus the period has hundreds of digits and the slow loop would never finish. That loop is the only part a quantum computer replaces, and it is enough.

Doubt followed at once, since a quantum state is fragile and errors might swamp any long computation. The answer came in 1995 and 1996, when Shor and Andrew Steane independently found that quantum information can be protected by error-correcting codes, and several groups proved a *threshold theorem*: below a certain error rate per operation, errors can be suppressed as far as you like by spending more physical qubits on each reliable ("logical") one. That is the theory behind every claim about error correction in the next section.

In 1996 **Lov Grover**, also at Bell Labs, found the other algorithm that matters: a search through $N$ possibilities for the one that passes a test, such as the key that opens a message, takes about $\sqrt{N}$ steps instead of about $N/2$. Bennett, Bernstein, Brassard and Vazirani showed in 1997 that no quantum algorithm can do better on an unstructured search. A 128-bit key then costs about $2^{64}$ quantum steps, but those steps must run one after another on one machine, and splitting the work over $k$ machines gains only $\sqrt{k}$, so symmetric ciphers survive with longer keys. The simulation below runs Grover's algorithm on 64 "boxes" on an ordinary computer: each step flips the sign of the right answer's amplitude and reflects every amplitude about the average.

```python
from math import pi, sqrt

N, target = 64, 42                        # 64 boxes; the key is in box 42
amp = [1 / sqrt(N)] * N                   # start in an even superposition

for step in range(1, 9):
    amp[target] = -amp[target]            # the oracle flips the sign of the answer
    mean = sum(amp) / N
    amp = [2 * mean - a for a in amp]     # "inversion about the mean"
    print(step, f"{amp[target] ** 2:.3f}")

print("best after about", round(pi / 4 * sqrt(N)), "steps; a classical search needs", N // 2, "on average")
```

Output:

```
1 0.135
2 0.344
3 0.591
4 0.816
5 0.964
6 0.997
7 0.907
8 0.718
best after about 6 steps; a classical search needs 32 on average
```

After six steps the right box comes up 99.7% of the time; keep going and the probability falls again, which is why the number of steps must be right. Shor's algorithm is a disaster for public keys and Grover's a nuisance for secret keys: AES-256 is comfortably safe. The [Post-quantum book's first chapter](../post-quantum/01-The-Quantum-Threat-Measured.md) measures both.

## 19.9 The machines so far, and how big they must be

*Level: intermediate.*

Here the page has to be careful, because every sentence about quantum computers comes in two flavors: what has been shown, and what has been claimed. The record to November 2026, as I can reconstruct it from papers and company announcements, is this.

**Toy factorizations.** In 2001 a team from IBM's Almaden laboratory and Stanford, led by Isaac Chuang with Lieven Vandersypen as first author, used the seven nuclear spins of one molecule to "factor" 15 with Shor's algorithm, and in 2012 a photonic experiment did 21. These were real experiments but not real factorizations: to fit the hardware the circuits were simplified using knowledge of the answer, as John Smolin, Graeme Smith and Alexander Vargo pointed out in "Oversimplifying quantum factoring" (2013). No quantum computer has run Shor's algorithm, without such shortcuts, on a number a pencil could not factor. Claims otherwise, the best known a Chinese group's 2022 claim of breaking RSA-2048 with 372 qubits, have not survived inspection.

**Supremacy and advantage.** In October 2019 Google's 53-qubit Sycamore chip did a random-sampling task in about 200 seconds that Google estimated would take the best supercomputer 10,000 years, and called it "quantum supremacy". IBM replied that a classical machine could do it in days, and later classical simulations narrowed the gap. The task was chosen to be hard for classical computers and had no use: it shows a quantum device can do something hard for a classical machine, not that it can do anything of value.

**Error correction.** This is the milestone that matters for cryptography, and the one with the best evidence. In December 2024 Google described its 105-qubit Willow chip, on which a larger error-correcting code (a distance-7 surface code) made fewer errors than a smaller one, and the smaller fewer than a smaller still, each step roughly halving the logical error rate. That is "below threshold" in practice, the first clear demonstration on superconducting qubits. Other groups, using trapped ions and neutral atoms, have shown small numbers of logical qubits since 2023. What is not shown is a machine with the hundreds or thousands of long-lived logical qubits Shor's algorithm needs.

**Claims in dispute.** Microsoft announced a chip in February 2025 based on a new "topological" qubit, and many physicists question whether the evidence shows what is claimed. Companies report "logical qubits" in the dozens under different definitions, so the numbers do not compare, and IBM's Condor chip passed 1,000 physical qubits in 2023, which says little without their quality. Roadmaps are promises, not measurements. The summary for November 2026: the largest machines have from about a hundred to a few thousand physical qubits; error correction works in small examples; nothing close to a cryptographically relevant machine exists.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Bars on a logarithmic scale: today's largest machines about a hundred to a few thousand physical qubits, Gidney's 2025 estimate under one million, Gidney and Ekerå's 2019 estimate twenty million" fill="currentColor" font-size="14" stroke="none">
<path d="M190 40V176M264 40V176M338 40V176M412 40V176M486 40V176M560 40V176" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="5 4"/>
<g font-size="12" text-anchor="middle">
<text x="190" y="196">100</text>
<text x="264" y="196">10^3</text>
<text x="338" y="196">10^4</text>
<text x="412" y="196">10^5</text>
<text x="486" y="196">10^6</text>
<text x="560" y="196">10^7</text>
</g>
<text x="8" y="67" font-size="12">machines built, 2024-26</text>
<rect x="190" y="52" width="109" height="22" fill-opacity="0.25" stroke="currentColor"/>
<text x="305" y="68" font-size="12" text-anchor="start">about 100 to a few thousand</text>
<text x="8" y="109" font-size="12">RSA-2048, Gidney 2025</text>
<rect x="190" y="94" width="296" height="22" fill-opacity="0.25" stroke="currentColor"/>
<text x="492" y="110" font-size="12" text-anchor="start">under 1 million</text>
<text x="8" y="151" font-size="12">RSA-2048, Gidney-Ekerå 2019</text>
<rect x="190" y="136" width="392" height="22" fill-opacity="0.25" stroke="currentColor"/>
<text x="574" y="152" font-size="12" text-anchor="end">about 20 million</text>
<text x="320" y="222" font-size="12" text-anchor="middle">physical qubits (noisy), logarithmic scale; each step is ten times larger</text>
</svg>
<figcaption>Figure 19.3. How big a machine RSA-2048 needs, against the machines that exist. The estimates assume an error rate near one in a thousand per operation.</figcaption>
</figure>

**How big must it be?** An *estimate* is a full design on paper that counts every qubit and operation. In 2019 Craig Gidney (Google) and Martin Ekerå (the Swedish NCSA and KTH) estimated that RSA-2048 could be factored in about eight hours with 20 million noisy physical qubits. In May 2025 Gidney alone cut that to under a million qubits and under a week, with a cheaper arithmetic method and denser error-correcting layouts. Both assume each operation fails about one time in a thousand. Papers in 2026 claim much smaller machines for other hardware; they are preprints about hardware that has not been built, several from companies selling it, so I give no numbers (the [Post-quantum book's first chapter](../post-quantum/01-The-Quantum-Threat-Measured.md) reads them with care). Since 2019 the estimate has fallen about twentyfold, mostly through better algorithms and not better qubits. Nobody can say when, or whether, a cryptographically relevant machine will exist.

**Harvest now, decrypt later.** The reason to act before the machine exists is that an adversary can record encrypted traffic today and keep it. Michele Mosca put it as an inequality: if $x$ is how many years your data must stay secret, $y$ the years your migration takes and $z$ the years until the machine, you have a problem whenever $x + y > z$. For key exchange the conclusion was to switch at once; for signatures, which matter only when someone can forge them, it is less urgent, but root keys and devices in the field for decades cannot wait. Services have long kept recordings they cannot yet read, as Venona in [chapter 14](14-The-Rest-of-the-War.md) shows, so the fear is not fanciful.

## 19.10 The NIST competition, 2016 to 2025

*Level: intermediate.*

In August 2015 the NSA announced that it planned to move to quantum-resistant algorithms, which surprised many, since ten years earlier it had made elliptic curves the center of its public Suite B. In April 2016 NIST published a report on the threat, NIST IR 8105, and in December a formal call for proposals. It avoided the word competition, but ran the process as the AES and SHA-3 competitions had been run ([chapter 18](18-The-Internet-Era.md)): open submissions, public attack, several rounds. It asked for *key-encapsulation mechanisms* (KEMs) and digital signatures. By the deadline of 30 November 2017 there were 82 submissions, and 69 were complete enough for the first round. Twenty-six went to a second round in January 2019, and in July 2020 NIST named seven finalists and eight alternates (Figure 19.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Timeline of the NIST post-quantum process from 2015 to 2025" fill="currentColor" font-size="14" stroke="none">
<path d="M102 8V272" fill="none" stroke="currentColor" stroke-width="1.6"/>
<g text-anchor="end" font-weight="bold">
<text x="88" y="27">Aug 2015</text>
<text x="88" y="53">Dec 2016</text>
<text x="88" y="79">Nov 2017</text>
<text x="88" y="105">Jan 2019</text>
<text x="88" y="131">Jul 2020</text>
<text x="88" y="157">Feb 2022</text>
<text x="88" y="183">5 Jul 2022</text>
<text x="88" y="209">Jul 2022</text>
<text x="88" y="235">13 Aug 2024</text>
<text x="88" y="261">11 Mar 2025</text>
</g>
<path d="M102 22h0M102 48h0M102 74h0M102 100h0M102 126h0M102 152h0M102 178h0M102 204h0M102 230h0M102 256h0" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
<text x="118" y="27">NSA says it will move to quantum-resistant algorithms</text>
<text x="118" y="53">NIST's call for proposals</text>
<text x="118" y="79">82 submissions; 69 accepted for round one</text>
<text x="118" y="105">Round two: 26 candidates</text>
<text x="118" y="131">Round three: 7 finalists, 8 alternates</text>
<text x="118" y="157">Rainbow broken on a laptop</text>
<text x="118" y="183" font-weight="bold">Kyber, Dilithium, Falcon, SPHINCS+ chosen</text>
<text x="118" y="209">SIKE broken in about an hour</text>
<text x="118" y="235" font-weight="bold">FIPS 203, 204 and 205 published</text>
<text x="118" y="261">HQC chosen as a second KEM</text>
</svg>
<figcaption>Figure 19.4. The NIST process, from the call to the standards. Two candidates fell in 2022, in the middle of it.</figcaption>
</figure>

Two candidates fell in 2022, and the way they fell shaped the result. In February **Ward Beullens** of IBM Research broke **Rainbow**, a multivariate signature scheme and a third-round finalist; his title said it: "Breaking Rainbow Takes a Weekend on a Laptop" (53 hours for the smallest parameters). In July **Wouter Castryck and Thomas Decru** of KU Leuven broke **SIKE**, an isogeny-based KEM with very small keys that had reached the fourth round, recovering a SIKEp434 key in about an hour on one core with a theorem of Ernst Kani from 1997 about curves of genus two that nobody had thought to apply. The Cryptanalysis book's [chapter 16](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md) tells both. The point here is that they happened in public, in the middle of the process, to candidates the world had been about to trust.

!!! note "Life story: SIKE"
    **Born:** the idea (SIDH) by David Jao and Luca De Feo, 2011; submitted to NIST in 2017 as SIKE · **Purpose:** a post-quantum key exchange with the smallest keys of any candidate, from isogenies between elliptic curves · **Helped:** showed how far a new family could get in a decade; ran in a Google and Cloudflare experiment in 2019 · **Retired:** broken in July 2022, weeks after being listed for a fourth round · **Replaced by:** the lattice and code-based KEMs

On 5 July 2022 NIST announced its choices: **CRYSTALS-Kyber** for key encapsulation, and **CRYSTALS-Dilithium**, **Falcon** and **SPHINCS+** for signatures, with BIKE, Classic McEliece, HQC and SIKE kept for a fourth round. Drafts came out in August 2023, and on 13 August 2024 NIST published the first three as final standards under new names: **FIPS 203** (ML-KEM, from Kyber), **FIPS 204** (ML-DSA, from Dilithium) and **FIPS 205** (SLH-DSA, from SPHINCS+). Falcon is to become **FIPS 206** (FN-DSA); in my sources no public draft existed in November 2026. On 11 March 2025 NIST chose **HQC**, a code-based KEM, as a backup to ML-KEM in case lattices ever fall; the Post-quantum book expects it to be FIPS 207. Hash-based signatures had been standardized earlier, in **SP 800-208** (2020), because their idea goes back to Lamport and Merkle in 1979 and needs only a hash function, and **SP 800-227** (2025) gives guidance on using KEMs. The designers were international: Kyber and Dilithium came from the CRYSTALS team, at institutions in several European countries and North America, and SPHINCS+ from a team that included Daniel Bernstein, Andreas Hülsing, Tanja Lange and Peter Schwabe.

The process was watched for signs of influence. After Dual_EC_DRBG (chapter 18) many cryptographers asked how much the NSA shaped what NIST chose. Daniel Bernstein, who had submitted candidates of his own, criticized NIST's handling of Kyber's security estimates and, as I understand it, sued under the Freedom of Information Act in 2022 for records of NIST's contacts with the NSA. NIST defended its process, and I cannot say what the documents show. What can be said is that the algorithms and attacks were public, and two candidates died in the open, the opposite of how DES was chosen in 1975.

### Why lattices: errors that hide a key

Most winners rest on lattices and on the *learning with errors* (LWE) problem that Oded Regev introduced in 2005. Given many equations $a \cdot s = b \bmod q$ with $s$ secret, anyone can find $s$ by linear algebra. Add a small random error to each $b$ and the problem becomes, as far as anyone knows, hard even for a quantum computer; the error hides $s$ but is small enough for the key holder to round away. The toy below encrypts bits with Regev's scheme, using ML-KEM's modulus 3329 but a dimension of 16 (ML-KEM uses 256 coefficients per block, structured for speed). A bit decrypts to a number near 0 for a 0, or near $q/2$ for a 1.

```python
import random

rng = random.Random(2024)           # fixed seed so the run repeats; real use needs secrets
q, n, m = 3329, 16, 32              # q is ML-KEM's modulus; real n is 256 per block, here 16

# Private key: a random vector s. Public key: m random rows a with
# b = a.s + e, where e is a small error. Without e this is just linear algebra.
s = [rng.randrange(q) for _ in range(n)]
rows = []
for _ in range(m):
    a = [rng.randrange(q) for _ in range(n)]
    e = rng.randint(-2, 2)
    rows.append((a, (sum(x * y for x, y in zip(a, s)) + e) % q))

def encrypt(bit):
    pick = [r for r in rows if rng.random() < 0.5]       # add up a random subset of rows
    u = [sum(a[i] for a, b in pick) % q for i in range(n)]
    v = (sum(b for a, b in pick) + bit * (q // 2)) % q   # hide the bit at 0 or q/2
    return u, v

def decrypt(u, v):
    d = (v - sum(x * y for x, y in zip(u, s))) % q       # = small noise, or q/2 + small noise
    return d, int(q // 4 < d < 3 * q // 4)

message = [0, 1, 1, 0, 1, 0, 0, 1]
results = [decrypt(*encrypt(bit)) for bit in message]
print([d for d, bit in results])
print([bit for d, bit in results] == message)
```

Output:

```
[2, 1663, 1662, 3321, 1665, 3322, 3327, 1666]
True
```

The values near 3329 are small negative noise (3321 is −8). A toy this size is easy to break; the security comes from large dimensions and carefully chosen noise, built step by step in the Post-quantum book's chapters [5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md) to [8](../post-quantum/08-ML-KEM.md).

!!! note "Life story: the NIST post-quantum process"
    **Born:** call for proposals December 2016; first standards 13 August 2024 · **Purpose:** to choose public, tested replacements for RSA, Diffie-Hellman and elliptic curves before a quantum computer exists · **Helped:** produced ML-KEM, ML-DSA and SLH-DSA, a backup in HQC, and the habit of keeping more than one mathematical family in reserve; killed Rainbow and SIKE in public · **Status:** continuing; FN-DSA and the backup KEM are unfinished, and a second process for more signatures opened in 2022

## 19.11 Other nations, and the quantum link

*Level: intermediate.*

NIST was not alone. Germany's BSI and France's ANSSI advise using post-quantum algorithms only together with classical ones for now, and have backed algorithms NIST did not choose, such as FrodoKEM (the plainest form of the lattice problem) and Classic McEliece (a code-based system from 1978). South Korea ran its own competition, KpqC, from 2021 or 2022 (accounts differ), and in January 2025 chose the signatures HAETAE (lattices) and AIMer (built on a symmetric cipher) and the key-establishment schemes SMAUG-T and NTRU+. China has long set its own standards (SM2, SM3, SM4); in February 2025 its Institute of Commercial Cryptography Standards opened a worldwide call for new algorithms, post-quantum schemes among them, meant to become national standards. I have the Korean and Chinese processes from agency and press reports, not the competition documents. They show that the transition is also a question of who will trust whose algorithm, an echo of DES and Dual_EC.

### Quantum key distribution

A different use of quantum physics predates Shor. In the late 1960s Stephen Wiesner, a graduate student at Columbia, had the idea of using quantum states to make banknotes impossible to copy; his paper was rejected and not published until 1983. It inspired Charles Bennett of IBM and Gilles Brassard of the University of Montreal, who in 1984 described **BB84**, a way to agree on a key whose security rests on physics. Alice sends single photons, each polarized in one of two bases (straight or diagonal), and Bob measures each in a basis picked at random. When his basis matches hers he reads her bit correctly; otherwise his result is a coin flip. Afterwards they announce only the bases and keep the bits where the bases matched (Figure 19.5). An eavesdropper cannot copy a photon and does not know the basis either, so by measuring she disturbs about a quarter of the bits they keep, which a comparison of a sample reveals.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A table of eight photons: Alice's bit and basis, Bob's basis, whether the bases match, and the bits they keep" fill="currentColor" font-size="14" stroke="none">
<rect x="168" y="32" width="44" height="176" fill-opacity="0.08" stroke="currentColor"/>
<rect x="276" y="32" width="44" height="176" fill-opacity="0.08" stroke="currentColor"/>
<rect x="384" y="32" width="44" height="176" fill-opacity="0.08" stroke="currentColor"/>
<rect x="492" y="32" width="44" height="176" fill-opacity="0.08" stroke="currentColor"/>
<rect x="546" y="32" width="44" height="176" fill-opacity="0.08" stroke="currentColor"/>
<text x="10" y="58" font-size="13">Alice's bit</text>
<text x="10" y="92" font-size="13">her basis</text>
<text x="10" y="126" font-size="13">Bob's basis</text>
<text x="10" y="160" font-size="13">same basis?</text>
<text x="10" y="194" font-size="13">key bit</text>
<text x="190 244 298 352 406 460 514 568" y="58" text-anchor="middle">10110010</text>
<text x="190 244 298 352 406 460 514 568" y="92" text-anchor="middle">+xx+x++x</text>
<text x="190 244 298 352 406 460 514 568" y="126" text-anchor="middle">++xxxx+x</text>
<text x="190 244 298 352 406 460 514 568" y="160" text-anchor="middle">✓✗✓✗✓✗✓✓</text>
<text x="190 244 298 352 406 460 514 568" y="194" text-anchor="middle" font-weight="bold">1-1-0-10</text>
<text x="320" y="226" font-size="13" text-anchor="middle">Alice and Bob announce only the bases and keep the shaded columns: key = 11010</text>
</svg>
<figcaption>Figure 19.5. Eight photons in BB84 (bits and bases made up). + is straight polarization, x diagonal. Where Bob guessed the wrong basis his result is a coin flip, so that column is thrown away.</figcaption>
</figure>

```python
import random

rng = random.Random(1984)           # fixed seed so the run repeats

def bb84(n, eve=False):
    alice_bits = [rng.randint(0, 1) for _ in range(n)]
    alice_bases = [rng.choice("+x") for _ in range(n)]   # + straight, x diagonal
    photons = list(zip(alice_bits, alice_bases))

    if eve:                         # Eve measures each photon in a random basis
        resent = []
        for bit, basis in photons:  # and sends on what she saw
            guess = rng.choice("+x")
            seen = bit if guess == basis else rng.randint(0, 1)
            resent.append((seen, guess))
        photons = resent

    bob_bases = [rng.choice("+x") for _ in range(n)]
    bob_bits = [bit if basis == b else rng.randint(0, 1)    # wrong basis: a coin flip
                for (bit, basis), b in zip(photons, bob_bases)]

    # In public, they compare bases (never bits) and keep the matching ones
    keep = [i for i in range(n) if alice_bases[i] == bob_bases[i]]
    errors = sum(alice_bits[i] != bob_bits[i] for i in keep)
    return len(keep), errors

for eve in (False, True):
    kept, errors = bb84(2000, eve)
    print("Eve listening:" if eve else "No Eve:      ", kept, "bits kept,",
          errors, f"errors ({errors / kept:.0%})")
```

Output:

```
No Eve:       1011 bits kept, 0 errors (0%)
Eve listening: 996 bits kept, 256 errors (26%)
```

Bennett and Brassard, with John Smolin and others, sent the first quantum key across 32 centimeters of open air at IBM in 1989. Artur Ekert at Oxford proposed an entangled-photon version in 1991. The Geneva firm ID Quantique, founded in 2001, sold fibre systems, and the canton used one in 2007 to send election results. China built a fibre backbone of about 2,000 kilometers between Beijing and Shanghai with trusted relay stations, and launched the satellite *Micius* in August 2016, which in 2017 helped set up a key for a video call between Beijing and Vienna.

!!! note "Life story: BB84"
    **Born:** 1984, Charles Bennett and Gilles Brassard, presented at a conference in Bangalore; built on Wiesner's idea, published 1983 · **Purpose:** to agree a key whose secrecy is guaranteed by physics, not by the difficulty of a calculation · **Helped:** started quantum cryptography and quantum communication · **Status:** works in the laboratory and in niche installations; not recommended by the agencies below for national secrets

### Why the agencies prefer post-quantum algorithms

QKD has real limits. It needs special hardware and a dedicated fibre or line of sight. Photons are lost, so links reach roughly a hundred kilometers without relays, and every relay must be trusted. It still needs an authenticated classical channel, so it does not remove the need for the algorithms it is meant to replace. And the hardware has been attacked: in 2010 researchers in Norway and Germany blinded the detectors of commercial QKD systems with bright light and took control of the key without raising the error rate. For these reasons the NSA does not recommend QKD for US national security systems, Britain's NCSC does not endorse it for government use, and in January 2024 the French, German, Dutch and Swedish agencies published a joint position favoring post-quantum cryptography first. I have the NSA and NCSC positions from secondary quotations and the joint paper by title and date. Their argument is that a software algorithm on hardware people already own does the job at lower cost and with fewer things to trust.

## 19.12 Hybrids, deadlines and what is still open

*Level: intermediate.*

Switching the world's key exchange to a young algorithm is risky: ML-KEM might have a flaw, as Rainbow and SIKE did. So the first deployments were **hybrids**, which run X25519 and a post-quantum KEM side by side and combine both secrets, so an attacker must break both. Google tested NewHope next to X25519 in a test version of Chrome in 2016. OpenSSH 9.0 (April 2022) was the first widely used software to make a hybrid its default (sntrup761 with X25519). Chrome switched on a hybrid with a draft of Kyber in April 2024 and, in November, the standardized **X25519MLKEM768**; Firefox, Cloudflare, Apple (from the fall of 2025) and OpenSSL followed, and Cloudflare's blog reported about half of the human web traffic it handled using post-quantum key exchange by late 2025. Signal added **PQXDH** in September 2023, Apple's iMessage **PQ3** in 2024 and Signal a post-quantum ratchet step in October 2025, told one by one in the Post-quantum book's [chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md). Signatures and certificates are harder: an ML-DSA-44 signature is 2,420 bytes against Ed25519's 64, and public web certificates were still RSA and ECDSA in late 2026.

Governments have set deadlines that differ in detail and agree in shape. The NSA's CNSA 2.0 (September 2022) asks national-security systems to prefer ML-KEM-1024, ML-DSA-87 and the hash-based LMS and XMSS, with kinds of equipment to be exclusive between about 2030 and 2033 and everything done by 2035; a presidential memorandum of 2022 (NSM-10) set 2035 for the federal government. **NIST IR 8547**, published as a draft in November 2024, would deprecate the 112-bit-strength sizes of RSA, Diffie-Hellman and elliptic-curve algorithms after 2030 and disallow all quantum-vulnerable public-key algorithms after 2035. The Post-quantum book reports a final version in October 2026; I did not see it, and its dates may differ from the draft. Britain's NCSC (2025) asks for plans by 2028, the most important systems by 2031 and everything by 2035, and the European Union's roadmap (June 2025) gives 2030 for high-risk systems. Treat every date as the date on a plan.

### Can these be broken today?

| What | Broken today? | Note |
|---|---|---|
| RSA, Diffie-Hellman, elliptic curves | no | A large quantum computer would break them; none exists. Recorded traffic can be read later. |
| AES-128 and AES-256, SHA-256 and SHA-3 | no | Grover halves the key length in bits at most; steps cannot be spread over many machines. |
| ML-KEM, ML-DSA, SLH-DSA | no | No known attack beyond the design margin. Lattices have had about thirty years of study, much less than factoring. |
| Rainbow, SIKE | yes | Beullens (2022) and Castryck and Decru (2022), on ordinary computers. |
| Quantum key distribution | the physics no, the hardware sometimes | Detectors can be blinded by bright light (2010). |
| Any of them in careless code | sometimes | A timing leak called KyberSlash (2023 to 2024) showed up in many Kyber libraries; the flaw was in the code, not the mathematics. |

### What is still open

When, or whether, a machine will exist is unknown. In April 2024 Yilei Chen posted a paper claiming a quantum algorithm for learning with errors (for some parameters, not ML-KEM's), and within about ten days other researchers found a bug that sank it, which showed both the worry and how fast the community checks. FN-DSA and the backup KEM lack finished standards. The second process for more signature schemes has run since 2022 (forty candidates in 2023, fourteen in a second round in 2024) and I could not verify the later rounds. Certificates for the public web are unsettled. And the work that remains is inventory: finding every file, device and protocol that still uses RSA or elliptic curves somewhere.

## 19.13 What four thousand years show

*Level: beginner.*

The oldest evidence in this book is the tomb of Khnumhotep II, whose scribe carved some of his titles in unusual hieroglyphs about 1900 BC ([chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md)). The newest is a lattice-based key agreement that you may have used a minute ago. Between them lie about 3,900 years. This section stops telling and asks what it adds up to. It is an essay, and unlike the rest of the chapter it gives opinions; the evidence is in the earlier chapters.

### The shape of a cipher's life

Almost every cipher in this book went through the same four stages. Someone invented it, or adopted it from a neighbor. The people who used it came to trust it, usually because nobody who used it had seen it broken, which is weak evidence and the only evidence they had. Someone broke it, often in secret first. And then the long part: the news traveled slowly, the replacement came slower, and the broken cipher stayed in use after the people who mattered had stopped trusting it.

The history gives examples at every scale. The repeating-key cipher that Giovan Battista Bellaso put in print in 1553, later called Vigenère's, was named *le chiffre indéchiffrable* and lasted 310 years until Friedrich Kasiski published a general solution in 1863, nine years after Charles Babbage had found one and told nobody ([chapter 10](10-The-Telegraph.md)). The German Army's Enigma was believed secure by its users to the end of the war and was first broken by the Poles in 1932, four years after the Army adopted it ([chapter 12](12-Rotors-and-Enigma.md)). DES lasted 21 years to its first practical break. MD5 and SHA-1 were broken in practice 12 and 22 years after they were published. Rainbow, a NIST finalist, and SIKE, a fourth-round candidate, fell in 2022.

```python
# Years from adoption to the first practical break (dates from this book)
ciphers = [
    ("repeating-key cipher", 1553, 1863),
    ("Army Enigma", 1928, 1932),
    ("DES", 1977, 1998),
    ("RC4 (made public)", 1994, 2001),
    ("MD5", 1992, 2004),
    ("SHA-1", 1995, 2017),
    ("SIKE (as SIDH)", 2011, 2022),
    ("Rainbow", 2005, 2022),
]
for name, adopted, broken in sorted(ciphers, key=lambda c: c[2] - c[1]):
    print(f"{name:22} {adopted} -> {broken}: {broken - adopted:3d} years")
modern = sorted(b - a for _, a, b in ciphers if a > 1900)
print("median of the modern ones:", modern[len(modern) // 2], "years")
```

Output:

```
Army Enigma            1928 -> 1932:   4 years
RC4 (made public)      1994 -> 2001:   7 years
SIKE (as SIDH)         2011 -> 2022:  11 years
MD5                    1992 -> 2004:  12 years
Rainbow                2005 -> 2022:  17 years
DES                    1977 -> 1998:  21 years
SHA-1                  1995 -> 2017:  22 years
repeating-key cipher   1553 -> 1863: 310 years
median of the modern ones: 12 years
```

Figure 19.6 draws the same dates.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bars showing the years from adoption to the first practical break: Army Enigma 4, RC4 7, SIKE 11, MD5 12, Rainbow 17, DES 21, SHA-1 22" fill="currentColor" font-size="14" stroke="none">
<path d="M170 30V236M245 30V236M320 30V236M395 30V236M470 30V236M545 30V236" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="5 4"/>
<g font-size="12" text-anchor="middle">
<text x="170" y="254">0</text>
<text x="245" y="254">5</text>
<text x="320" y="254">10</text>
<text x="395" y="254">15</text>
<text x="470" y="254">20</text>
<text x="545" y="254">25</text>
</g>
<text x="8" y="53" font-size="12">Army Enigma 1928</text>
<rect x="170" y="38" width="60" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="236" y="53" font-size="12">4 years (1932)</text>
<text x="8" y="81" font-size="12">RC4 (made public) 1994</text>
<rect x="170" y="66" width="105" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="281" y="81" font-size="12">7 years (2001)</text>
<text x="8" y="109" font-size="12">SIDH / SIKE 2011</text>
<rect x="170" y="94" width="165" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="341" y="109" font-size="12">11 years (2022)</text>
<text x="8" y="137" font-size="12">MD5 1992</text>
<rect x="170" y="122" width="180" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="356" y="137" font-size="12">12 years (2004)</text>
<text x="8" y="165" font-size="12">Rainbow 2005</text>
<rect x="170" y="150" width="255" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="431" y="165" font-size="12">17 years (2022)</text>
<text x="8" y="193" font-size="12">DES 1977</text>
<rect x="170" y="178" width="315" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="491" y="193" font-size="12">21 years (1998)</text>
<text x="8" y="221" font-size="12">SHA-1 1995</text>
<rect x="170" y="206" width="330" height="20" fill-opacity="0.25" stroke="currentColor"/>
<text x="506" y="221" font-size="12">22 years (2017)</text>
<text x="320" y="272" font-size="12" text-anchor="middle">years from adoption to the first practical break</text>
<text x="320" y="288" font-size="12" text-anchor="middle">The repeating-key cipher of 1553 lasted 310 years (to Kasiski, 1863): off the scale.</text>
</svg>
<figcaption>Figure 19.6. How long some ciphers lasted before the first practical break. Use of each continued well beyond the date shown.</figcaption>
</figure>

Do not read too much into eight rows. I picked cases where the dates are well known, and ciphers never broken (the one-time pad, used once) are not in the list. But three things stand out. A modern cipher with a public specification and thousands of eyes gets broken about as fast as a wartime machine. The first break and the last use are far apart: MD5 collisions were shown in 2004, a collision attack built a forged certificate authority in 2008, and malware found in 2012 used a variant of the attack to forge Microsoft code-signing certificates. And some breaks were known to a few people long before they were known to all, which is taken up under "Who knew first" below.

Replacement is slower than breaking, and that is the part people forget. NIST withdrew the single-DES standard only in 2005, seven years after Deep Crack. RC4 was attacked in WEP in 2001 and prohibited in TLS in 2015 (RFC 7465). Triple DES, still found in payment systems, had a published attack against it in 2016 and was scheduled for retirement in NIST's guidance at the end of 2023. Mosca's inequality (§19.9) is the same lesson in numbers: the years it takes to move are part of the risk, and they are usually longer than the planners think.

### What mattered

If you had to say what decided a cipher's fate, there are four candidates. **Key length** mattered, and it is the cheapest thing to get right. DES's 56 bits, the French bank card's 320-bit RSA key, MIFARE's 48 bits and the 40-bit exports of the 1990s are cases where the mathematics was fine and the size was chosen for the machines of the past or by a rule that wanted it weak. But more key was no guarantee: Army Enigma had about $10^{20}$ settings, Lorenz more, and both fell to structure and to people (chapters [12](12-Rotors-and-Enigma.md) and [13](13-Bletchley-Park.md)).

**Secrecy of the design** is the point on which the history is most one-sided. Kerckhoffs wrote in 1883 that a system must not need to be secret. The twentieth century tested the rule many times: COMP128, A5/2, Crypto-1 and the other secret ciphers of chips and phones fell once examined, usually within a few years, while the open ciphers, AES and SHA-3 and now ML-KEM, are the ones that have lasted. I do not claim that secrecy never helps; the services kept designs secret as a second layer, and Crypto AG shows what a rigged secret design can do ([chapter 15](15-Shannon-and-the-Agencies.md)). I claim that a secret design adds little to a good cipher and does not rescue a weak one.

**Operator error** is the large entry. The Zimmermann telegram went out over a cable the British could read ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). Mary, Queen of Scots, wrote down a plot in a cipher her enemy's codebreaker could read ([chapter 9](09-Queens-Spies-and-Black-Chambers.md)). German operators chose obvious message keys and sent routine texts that gave Bletchley its cribs, the Soviet pad factory printed duplicate pages and so made Venona possible ([chapter 14](14-The-Rest-of-the-War.md)), and the *Pueblo* and the Walker ring handed over keys, not ciphers ([chapter 15](15-Shannon-and-the-Agencies.md)). The modern cases are the same: a reused nonce, a code cleanup that cut a random-number generator to 32,768 possibilities ([chapter 18](18-The-Internet-Era.md)). Ross Anderson's study of cash machines found that most fraud came from staff and procedures, not broken ciphers. The weak point is rarely the mathematics.

**Politics** decided who could use what: the key size of DES, the export rules that put 40-bit ciphers in browsers, the Clipper chip, the Dual_EC_DRBG generator, the secrecy that kept Enigma's break from the public until 1974 and the Poles' work from its credit. Politics also helped: the NBS call of 1973, the open competitions, the courts that held code to be speech. It is the hardest to measure, because its work is done in rooms where nobody takes minutes, and the most dangerous, because it can undo the other three. A strong cipher with a short key by order, or a rigged generator, is a weak cipher.

Two things mattered less than people expected. One is the word "unbreakable", which predicted nothing: it was said of the repeating-key cipher, of Enigma and of many a modern product, and it was said most loudly by those selling or using them. The other is the cleverness of the design. Rainbow was clever, and so was its break. What mattered more was whether anyone with skill and a reason was looking: DES drew attackers because it was a standard, Enigma drew the Poles because Poland was next to Germany, and SIKE drew Castryck and Decru because the NIST process had made it important to try.

If I must rank them from the cases in the book: operator error broke more traffic than any mathematical attack; key length decided more standards than any other number; secrecy of design mostly failed; and politics set the rules the other three played under. The mathematical breaks (Kasiski, Rejewski, differential cryptanalysis, Wang's collisions, Castryck and Decru) were rarer, but they ended whole families of ciphers.

### Who knew first

Another pattern is about knowledge. In 1969 to 1974 three mathematicians at GCHQ, James Ellis, Clifford Cocks and Malcolm Williamson, found the ideas of public-key cryptography, including what became RSA and Diffie-Hellman, and were forbidden to tell anyone. Diffie and Hellman published theirs in 1976, Rivest, Shamir and Adleman theirs in 1977, and the British work was made public in 1997 ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). The IBM team under Horst Feistel knew in 1974 of the attack that Biham and Shamir published in 1990 as differential cryptanalysis, and strengthened DES against it without saying so; Don Coppersmith told the story in 1994 ([chapter 16](16-Feistel-Lucifer-and-DES.md)). The British read Enigma and Lorenz and did not say so until 1974; the Americans read Soviet pad traffic for decades and did not say so until 1995; the Bell Labs engineer saw plaintext on his oscilloscope in 1943 and the open literature heard of it in 1985.

The cost is twofold. The public re-invents what a government already knows, which wastes years, and during those years it uses ciphers that a few people know to be weak. And the record is incomplete: every history of the twentieth century had to be rewritten when the files opened, and this book stops where the files stop. Whatever the agencies know in 2026 about lattices, or about Kyber's margin, is not in it. The public record trails the secret one by decades, in the cases we can check.

### Competitions

One institution tried to close that gap. From the AES competition of 1997 to 2000 and the SHA-3 competition of 2007 to 2012, by way of Europe's NESSIE (2000 to 2003), Japan's CRYPTREC, eSTREAM (2004 to 2008) and CAESAR (2013 to 2019), to the NIST post-quantum process, the idea was the same: ask everyone for designs, publish them, let cryptanalysts attack them for years, and choose from what survives. It replaced the 1970s method, in which an agency chose and the public lived with the result. Competitions are good at surfacing breaks (Rainbow, SIKE), spreading expertise and lending a standard legitimacy. They need enough skilled people to look; they are slow (about eight years from the call to the first post-quantum standards); they say nothing about implementations; and they have politics too, as the arguments over Kyber and over hybrids show.

### The people who are missing

The history in this book is incomplete in a particular direction, and it would be dishonest to end without saying how.

**Women.** The Friedman unit in the Coast Guard, the Wrens at the bombes and the women of Hut 6, Joan Clarke and Mavis Batey at Bletchley, Genevieve Grotjan and Gene Grabeel at Arlington Hall, Agnes Meyer Driscoll in the Navy, Ann Caracristi and Juanita Moody at the NSA: chapters [11](11-Radio-War-and-the-One-Time-Pad.md), [13](13-Bletchley-Park.md), [14](14-The-Rest-of-the-War.md) and [15](15-Shannon-and-the-Agencies.md) name them, and the histories of the 1960s and 1970s did not. There were two causes. The work was filed as clerical, so the records list a clerk where today there would be a mathematician; and it was secret, so a woman who had broken a code at twenty-two said nothing of it for fifty years. Elizebeth Friedman's work was credited to others. After 1945 the open academic phase of the field was mostly male, from Shannon to Diffie, Hellman, Rivest, Shamir, Adleman and Merkle; Shafi Goldwasser's Turing Award with Silvio Micali in 2012, Tanja Lange's work on SPHINCS+, NTRU Prime and Classic McEliece, and Kristin Lauter's on the cost of quantum attacks are why it is not wholly so. The record of the women of the 1940s is thinner than the men's, and the thinness is itself the finding.

**Cryptology outside Europe.** For centuries the textbooks said that codebreaking began in Renaissance Italy. It began in Baghdad around 850, and the treatise that proves it, al-Kindi's, survives in a single manuscript found in Istanbul and published only in 1987 ([chapter 4](04-Baghdad-and-Cairo.md)). The Chinese tallies and poems, the Indian lists of secret writing, the Ottoman and Safavid chanceries and the Korean and Japanese methods ([chapter 8](08-The-World-Beyond-Europe.md)) are known from a handful of texts, often by way of scholars in the capitals of the empires that ruled them. The reasons are ordinary. The sources are in languages few historians of cryptology read. Libraries were sacked, as Baghdad's were in 1258, or burned, as the Japanese services reportedly burned their records in August 1945. And colonial powers kept their own histories: the story of the Wireless Experimental Centre in Delhi ([chapter 14](14-The-Rest-of-the-War.md)) is, as far as I can find, known mostly from British files and memoirs. The Choctaw and Navajo code talkers used languages the American government had spent decades trying to suppress, in boarding schools where many had been punished as children for speaking them, as the histories of the program record; the Navajo were not allowed to talk about their work until it was declassified in 1968. A history written from archives will find what the archives kept.

**The side that wrote the history.** The twentieth-century story is told mostly from the archives that opened. British and American files began to open in the 1970s and 1990s; Soviet cryptologic archives remain largely closed; German and Japanese services destroyed or lost much of what they had. So the Allied successes are documented in detail, and the Soviet, German and Japanese cryptologists appear mostly as the people who were read, with Kotelnikov's priority on the one-time pad ([chapter 15](15-Shannon-and-the-Agencies.md)) as one of the few glimpses from the other side.

**Everyone else.** Beneath the named people were thousands who never appear: typists, signal clerks, code-room orderlies and the machine operators whose mistakes made the breaks. Ciphers were mostly lost by clerks and mostly broken by clerks.

### What stays, and what travels

**A cipher office on Mars.** A settlement on Mars with a cipher office of its own would start from arithmetic. A radio signal takes between about 3 and 22 minutes to cross from Earth to Mars, and for about two weeks around each solar conjunction, roughly every 26 months, little or nothing can be sent. A protocol that asks Earth a question at every step, such as an online check of whether a certificate has been withdrawn, would stall, so the settlement has to issue, check and revoke certificates for itself and treat Earth as a source of updates, not an authority to consult. Keys must rotate on a schedule, with the new one in place before the old one expires, because a correction may be twenty minutes away or two weeks. Its root keys will have to last for decades, and the DES and post-quantum stories show what it costs to change an algorithm where nothing is easily resupplied, so it should choose standardized algorithms with margin, run hybrids, and build in the ability to change before it needs it. It should keep its own copies of the standards, source code, test vectors and logs and be able to check them without asking anyone, because the open scrutiny that broke Rainbow and SIKE will not be a message away. It must work when the home planet's networks are out of reach for a day or a month. Above all it would take the lessons of chapters 11 to 18, which are about people: train the operators, write the procedures down, never use a one-time key twice, do not trust a secret design, and name the clerks. The Post-quantum book's [chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md) works out one such settlement's migration in numbers.

The tools change: a clay tablet, a disk, a rotor, a shift register, a lattice. What has not changed in 3,900 years is the situation. Somebody has a message and somebody else wants it. The one with the message has to trust something, and the trust is placed before anyone has had time to test it. Everything this book describes as a defense, from Kerckhoffs's rule to the open competition to the hybrid, is a way of buying time for the testing to catch up with the trust. The post-quantum migration is the largest such purchase yet, and the first that tries to retire the main public-key algorithms before anyone has broken them in practice. It is not the first replacement made on a prediction: the move from 80-bit to 128-bit keys was made on arithmetic, and browsers began to refuse SHA-1 certificates before the first practical collision. It may prove unnecessary, too late or just in time, and from here nobody can say which.

## 19.14 Going deeper

*Level: expert.*

**Reading a resource estimate.** A line such as "one million physical qubits" hides a calculation you can follow. In the standard surface code a logical qubit of code distance $d$ takes about $2d^2$ physical qubits in the simplest layout, so at $d = 27$ one logical qubit is about 1,450 physical ones, and a thousand logical qubits would need about 1.5 million for the data alone, before the factories that make the special states a quantum computer needs for its non-trivial gates. An estimate falls when the algorithm needs fewer logical qubits, when the code packs them more densely, or when the physical error rate $p$ drops (the logical error rate falls roughly as $(p/p_{th})^{(d+1)/2}$, so a lower $p$ buys a smaller $d$). When someone says "RSA-2048 with 100,000 qubits", ask what error rate they assume, whether the count includes the factories, and whether such hardware exists. The Post-quantum book's first chapter works the arithmetic through.

**Where this chapter's dates are weak.** The 1943 story has one source, the NSA's own, written 29 years afterwards. The priority question among Arimura, Dethloff and Gröttrup, Moreno and Ugon is told differently in French, German and Japanese histories, and I have not seen the patents. The Humpich details come from press accounts. The discoverers of Spectre and Meltdown agree on who found what but not on who came first. The NIST dates are public and sound, but a national date is what a plan says, not what will happen. For the quantum machines the problem is the opposite of thin sources: abundant claims, many by the people selling the machines.

**The survivorship problem.** The eight rows of §19.13 and the stories of the whole book come from ciphers whose breaks someone recorded. A cipher broken by someone who kept quiet leaves no trace, and one never examined leaves none either. Any claim about how ciphers live and die is a claim about that group.

**Open questions.** Whether a large enough quantum computer will be built, and when. Whether lattice cryptography, seriously studied for about thirty years, holds for another thirty; the Chen episode of 2024 was a false alarm, and nobody can say there will not be a true one. Whether a verification culture (open code, tests, proofs) can keep up with the volume of cryptographic software, most of which no outsider has read. And what governments know that the public does not, which, if this chapter is a guide, is at least one thing.

## Check yourself

??? question "1. In 1943 a Bell Labs engineer saw spikes on an oscilloscope. What were they, and what is this kind of leak called?"
    The spikes were the electrical signal of the 131-B2 teleprinter mixer's relays each time it stepped, and they could be read as the plaintext being enciphered. A leak from the machine and not the cipher is a *side channel*; the US program to prevent it was code-named TEMPEST.

??? question "2. Why is a chip card that checks a PIN harder to clone than a magnetic-stripe card, and why did the French bank card fail anyway?"
    A stripe holds data anyone with a reader can copy. A chip keeps a secret key inside, answers a challenge with a calculation that depends on it, and locks after a few wrong PIN tries. The French card failed because its 320-bit RSA key was short enough to factor.

??? question "3. In the program of §19.6 the secret has 6 characters from an alphabet of 36. How many guesses does the timing attack need, compared with brute force, and what is the fix?"
    At most $36 \times 6 = 216$, against $36^6 = 2{,}176{,}782{,}336$. The fix is a comparison that takes the same time whatever the guess, such as `hmac.compare_digest`.

??? question "4. Why does a security key defeat a phishing page that a six-digit one-time code does not?"
    The code depends only on the seed and the clock, so a phishing page can relay it to the real site within thirty seconds. The key's answer depends on the name of the site the browser gives it, so the answer produced for a look-alike site is useless at the real one.

??? question "5. Do Shor's classical steps by hand for $N = 15$, $a = 7$. What is the period, and what are the factors?"
    The powers of 7 mod 15 are 7, 4, 13, 1, so $r = 4$. Then $7^2 = 49 \equiv 4$, and $\gcd(4 - 1, 15) = 3$ and $\gcd(4 + 1, 15) = 5$.

??? question "6. Grover's algorithm needs about $\sqrt{N}$ steps. Why does that not make AES-128 breakable the day a quantum computer exists?"
    A 128-bit key needs about $2^{64}$ Grover steps, each a long fault-tolerant operation, and they must run one after another on one machine; $k$ machines gain only $\sqrt{k}$. That is out of reach, and AES-256 has a wide margin.

??? question "7. Mosca's inequality is $x + y > z$. A hospital keeps records 25 years, needs 5 years to migrate, and thinks a quantum computer is 20 years away. Is it exposed?"
    Yes: $25 + 5 = 30 > 20$. Records encrypted today under a classical key exchange could be read ten years before their secrecy ends, so it should begin migrating at once, with hybrids for the key exchange.

??? question "8. Which two candidates were broken in 2022 during the NIST process, by whom, and what did both breaks leave untouched?"
    Rainbow (a multivariate signature), by Ward Beullens in February, and SIKE (an isogeny KEM), by Wouter Castryck and Thomas Decru in July. Neither touched the lattice or hash-based schemes standardized as ML-KEM, ML-DSA and SLH-DSA.

??? question "9. Give two reasons the NSA and several European agencies prefer post-quantum algorithms to quantum key distribution."
    QKD needs special hardware and dedicated links, reaches about a hundred kilometers without trusted relays, and still needs a classically authenticated channel. Real detectors have also been attacked (the 2010 blinding attack). A software algorithm runs on existing hardware.

??? question "10. Using §19.13, argue whether key length or operator error did more to bring ciphers down, and say what your argument leaves out."
    A good answer sets key length (DES, the French card, MIFARE) against operator error (Enigma message keys and cribs, the Venona pads, the Zimmermann telegram, the *Pueblo*, reused nonces), and concludes that operator error broke more traffic while key length decided more standards. It leaves out politics (who set the key length, and why), the survivorship of the sample, and secret breaks that left no record.

## What you learned

- In 1943 Bell Labs found that the 131-B2 teleprinter mixer leaked plaintext as spikes on an oscilloscope. The US services spent decades on what they called TEMPEST; the open world met the problem in 1985 with van Eck's screen-reading paper.
- Keys moved into hardware: HSMs (early 1970s), chip cards (Moreno 1974, Ugon 1977), SIMs, TPMs, enclaves and security keys. Secret home-made ciphers in small chips (COMP128, A5/2, Crypto-1) fell once examined; the French bank card fell to a 320-bit key. Security keys (U2F 2014, WebAuthn 2019, passkeys 2022) resist phishing because the credential is bound to the site's name.
- Kocher's timing attack (1996), fault and power attacks, cache attacks, Rowhammer and Spectre and Meltdown (2018) showed that a proof about a cipher is not a proof about a product. GPUs and Bitcoin ASICs showed that cheap hardware reaches key lengths that once looked safe.
- Feynman (1981) and Deutsch (1985) imagined the quantum computer; Shor (1994) showed it would break RSA, Diffie-Hellman and elliptic curves; Grover (1996) showed it would only weaken symmetric keys. No machine has factored more than a classroom example; error correction below threshold was shown in 2024; Gidney's 2025 estimate is under a million noisy qubits for RSA-2048.
- NIST's process (call December 2016, 82 submissions) gave FIPS 203, 204 and 205 in August 2024, with FN-DSA to follow as FIPS 206 and HQC chosen in March 2025. Rainbow and SIKE fell in 2022. Hybrids are how the internet is moving, and governments have set dates around 2030 to 2035.
- Four thousand years show trust, break and slow replacement. Operator error and politics did more damage than mathematics; secret designs mostly failed; discoveries were often made in secret first; and the record leaves out women, non-European cryptologists and the clerks who did the work.

**Next:** this is the last chapter. The [glossary](Glossary.md) collects the vocabulary; [Cryptanalysis](../cryptanalysis/index.md) and [Post-quantum cryptography](../post-quantum/index.md) go deeper into what this chapter only tells.

## Further reading

- NSA, "TEMPEST: A Signal Problem", *Cryptologic Spectrum* 2, no. 3 (1972; declassified 2007). Wim van Eck, "Electromagnetic Radiation from Video Display Units: An Eavesdropping Risk?", *Computers & Security* 4 (1985). Markus Kuhn and Ross Anderson, "Soft Tempest" (Information Hiding 1998). Peter Wright, *Spycatcher* (Viking, 1987).
- Ross Anderson, "Why Cryptosystems Fail", *Communications of the ACM* 37, no. 11 (1994), and *Security Engineering* (Wiley, 3rd ed., 2020). Steven Murdoch, Saar Drimer, Ross Anderson and Mike Bond, "Chip and PIN is Broken" (IEEE S&P 2010).
- Marc Briceno, Ian Goldberg and David Wagner on cloning GSM SIMs (COMP128, 1998). Flavio Garcia et al., "Dismantling MIFARE Classic" (ESORICS 2008). Matúš Nemec et al., "The Return of Coppersmith's Attack" (CCS 2017).
- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems" (CRYPTO '96); Kocher, Jaffe and Jun, "Differential Power Analysis" (CRYPTO '99); Boneh, DeMillo and Lipton on faults (EUROCRYPT '97); Kocher et al., "Spectre Attacks" (IEEE S&P 2019); Lipp et al., "Meltdown" (USENIX Security 2018).
- Blaze, Diffie, Rivest, Schneier, Shimomura, Thompson and Wiener, "Minimal Key Lengths for Symmetric Ciphers to Provide Adequate Commercial Security" (1996). Electronic Frontier Foundation, *Cracking DES* (O'Reilly, 1998). Sandeep Kumar et al., "Breaking Ciphers with COPACOBANA" (CHES 2006).
- W3C, *Web Authentication, Level 1* (Recommendation, March 2019); FIDO Alliance, U2F and CTAP specifications. Richard Stallman, "Can You Trust Your Computer?" (2002).
- Richard Feynman, "Simulating Physics with Computers", *International Journal of Theoretical Physics* 21 (1982). David Deutsch, *Proceedings of the Royal Society A* 400 (1985). Peter Shor, FOCS 1994 and *SIAM Journal on Computing* 26 (1997). Lov Grover, STOC 1996.
- Vandersypen et al., *Nature* 414 (2001). Smolin, Smith and Vargo, "Oversimplifying Quantum Factoring", *Nature* 499 (2013). Arute et al., *Nature* 574 (2019). Google Quantum AI, "Quantum Error Correction below the Surface Code Threshold", *Nature* 638 (2025).
- Craig Gidney and Martin Ekerå, *Quantum* 5 (2021). Craig Gidney, "How to Factor 2048 Bit RSA Integers with Less than a Million Noisy Qubits" (arXiv, 2025). Michele Mosca, *IEEE Security & Privacy* 16, no. 5 (2018).
- NIST IR 8105 (2016); NIST IR 8545 (2025); NIST SP 800-208 (2020); FIPS 203, 204 and 205 (2024); NIST SP 800-227 (2025); NIST IR 8547 (draft, November 2024). NSA, *Commercial National Security Algorithm Suite 2.0* (2022).
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022). Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023). Oded Regev, "On Lattices, Learning with Errors, Random Linear Codes, and Cryptography" (STOC 2005).
- Stephen Wiesner, "Conjugate Coding", *SIGACT News* 15 (1983). Bennett and Brassard (Bangalore, 1984). Artur Ekert, *Physical Review Letters* 67 (1991). Lydersen et al., *Nature Photonics* 4 (2010). ANSSI, BSI, NLNCSA and the Swedish Armed Forces, position paper on QKD (January 2024).
- David Kahn, *The Codebreakers* (1967; rev. 1996); Steven Levy, *Crypto* (2001); Liza Mundy, *Code Girls* (2017); Jason Fagone, *The Woman Who Smashed Codes* (2017); Ibrahim Al-Kadi, "Origins of Cryptology: The Arab Contributions", *Cryptologia* 16, no. 2 (1992).
- *Weaker sources behind particular statements:* company histories for the Atalla box and the IBM 4758; encyclopedia accounts of the Arimura, Dethloff and Gröttrup patents; press for the Humpich case, Gosney's cluster, the LinkedIn figures, Cloudflare's adoption figure and Bernstein's lawsuit; Brian Krebs's report of Google's statement on security keys; secondary quotations of the NSA and NCSC positions on QKD; agency and press reports of the Korean and Chinese processes; the Post-quantum book for the October 2026 final of NIST IR 8547; company announcements for logical-qubit counts.
