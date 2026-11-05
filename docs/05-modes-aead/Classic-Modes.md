# Classic modes

*ECB, CBC, CFB, OFB and CTR: the older ways to run a block cipher over a
long message. They hide data but don't protect it, and that gap fed years
of attacks on TLS.*

**Status and standards:** see [Cipher modes and AEAD](../algorithms/table.md#5-cipher-modes-and-aead)
in the main table.

[AES](../04-symmetric-ciphers/AES.md) encrypts one 16-byte block; a mode
says how to use it on a whole message. FIPS 81 (1980) defined ECB, CBC,
CFB and OFB for DES and was withdrawn in 2005. SP 800-38A (2001) has the
same four for AES, plus CTR. None of them notices a changed ciphertext. In
2023 NIST decided to revise SP 800-38A, limit ECB to uses other NIST
standards name, and push authentication. For new work use an
[AEAD](AEAD.md).

| Mode | IV | Parallel | One flipped ciphertext bit |
|---|---|---|---|
| ECB | none | both ways | garbles its block |
| CBC | unpredictable | decryption only | garbles its block, flips that bit in the next |
| CFB | unpredictable | decryption only | flips that bit, garbles the next 16 bytes |
| OFB | unique | no (keystream can be made ahead) | flips that bit |
| CTR | unique counter blocks | both ways | flips that bit |

## The story

- **Who made it:** ECB, CBC, CFB and OFB were published for DES in FIPS 81 (1980); CBC was patented by IBM's Ehrsam, Meyer, Smith and Tuchman (1976). Diffie and Hellman described CTR in 1979.
- **What for:** Turning a block cipher, which handles one block, into a way to encrypt whole messages.
- **What it solved:** Without a mode, equal blocks give equal ciphertext. CBC and CTR chain or count so that patterns disappear.
- **Where it stands:** CTR is the core of GCM and still fine. CBC survives in older systems. All of them only hide data and don't detect changes, which is why TLS 1.3 removed them in favor of AEAD.
- **Incidents:** **ECB:** the famous "ECB penguin" image still shows through; Adobe's 2013 breach exposed 153 million passwords encrypted with 3DES in ECB, so equal passwords were visible, and Zoom used AES in ECB until 2020. **Padding oracles:** Vaudenay (2002) showed CBC padding errors decrypt data; they hit ASP.NET in 2010 (Duong and Rizzo), TLS with Lucky Thirteen (2013) and SSL 3.0 with POODLE (2014). **BEAST (2011):** TLS 1.0's predictable CBC IVs let an attacker read cookies.

## ECB

**How it works.** Each block is encrypted alone: $C_i = E(K, P_i)$.

**What goes wrong.** Equal plaintext blocks give equal ciphertext blocks.
The famous picture is the "ECB penguin": a bitmap of Tux, the Linux
mascot, encrypted in ECB, and the penguin is still plain to see. Blocks can
also be cut, swapped or replayed. Zoom's client up to 4.6.9 encrypted
meeting audio and video this way (CVE-2020-11500). NIST still allows ECB
for one-block jobs such as the PIV card challenge in SP 800-73-4.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 345" role="img" aria-labelledby="sk-c-ecbshape-t"><title id="sk-c-ecbshape-t">A simple shape drawn in blocks, the same picture encrypted with ECB still showing the shape in different colours, and with CBC or CTR as random noise</title><defs><filter id="sk-c-ecbshape-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-ecbshape-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-ecbshape-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-ecbshape-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-ecbshape-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="345" filter="url(#sk-c-ecbshape-paper)"/><g filter="url(#sk-c-ecbshape-pen)"><text x="30" y="44" class="h">Same block in, same block out</text><rect x="20" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="84" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="100" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="116" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="132" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="148" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="164" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="80" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="84" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="100" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="148" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="164" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="96" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="84" y="112" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="112" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="112" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="112" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="164" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="112" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="84" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="164" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="128" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="84" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="164" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="144" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="84" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="116" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="132" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="164" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="160" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="84" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="176" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="164" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="176" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="192" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="192" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="68" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="84" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="100" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="148" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="164" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="180" y="192" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="192" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="68" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="84" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="100" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="148" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="164" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="180" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="208" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="20" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="36" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="52" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="68" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="84" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="100" y="224" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="116" y="224" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="132" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="148" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="164" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="180" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="196" y="224" width="16" height="16" style="fill:#f3ead8;stroke:none"/><rect x="230" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="294" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="310" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="326" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="342" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="358" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="374" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="294" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="310" y="96" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="96" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="358" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="374" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="294" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="374" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="294" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="374" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="128" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="294" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="374" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="160" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="294" y="160" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="326" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="342" y="160" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="160" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="374" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="294" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="374" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="192" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="192" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="278" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="294" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="310" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="358" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="374" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="390" y="192" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="192" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="278" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="294" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="310" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="358" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="374" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="390" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="230" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="246" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="262" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="278" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="294" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="310" y="224" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="326" y="224" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="342" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="358" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="374" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="390" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="406" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="440" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="456" y="80" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="472" y="80" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="488" y="80" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="504" y="80" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="520" y="80" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="536" y="80" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="552" y="80" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="568" y="80" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="584" y="80" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="600" y="80" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="616" y="80" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="440" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="456" y="96" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="472" y="96" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="488" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="504" y="96" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="520" y="96" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="536" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="552" y="96" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="568" y="96" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="584" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="600" y="96" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="616" y="96" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="440" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="456" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="472" y="112" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="488" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="504" y="112" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="520" y="112" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="536" y="112" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="552" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="568" y="112" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="584" y="112" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="600" y="112" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="616" y="112" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="440" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="456" y="128" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="472" y="128" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="488" y="128" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="504" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="520" y="128" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="536" y="128" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="552" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="568" y="128" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="584" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="600" y="128" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="616" y="128" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="440" y="144" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="456" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="472" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="488" y="144" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="504" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="520" y="144" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="536" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="552" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="568" y="144" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="584" y="144" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="600" y="144" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="616" y="144" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="440" y="160" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="456" y="160" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="472" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="488" y="160" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="504" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="520" y="160" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="536" y="160" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="552" y="160" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="568" y="160" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="584" y="160" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="600" y="160" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="616" y="160" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="440" y="176" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="456" y="176" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="472" y="176" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="488" y="176" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="504" y="176" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="520" y="176" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="536" y="176" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="552" y="176" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="568" y="176" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="584" y="176" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="600" y="176" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="616" y="176" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="440" y="192" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="456" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="472" y="192" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="488" y="192" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="504" y="192" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="520" y="192" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="536" y="192" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="552" y="192" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="568" y="192" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="584" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="600" y="192" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="616" y="192" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="440" y="208" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="456" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="472" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="488" y="208" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="504" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="520" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="536" y="208" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><rect x="552" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="568" y="208" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="584" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="600" y="208" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="616" y="208" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="440" y="224" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="456" y="224" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="472" y="224" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="488" y="224" width="16" height="16" style="fill:#a03a2a;stroke:none"/><rect x="504" y="224" width="16" height="16" style="fill:#3a2a1e;stroke:none"/><rect x="520" y="224" width="16" height="16" style="fill:#c9bfa8;stroke:none"/><rect x="536" y="224" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="552" y="224" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="568" y="224" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="584" y="224" width="16" height="16" style="fill:#d9b26a;stroke:none"/><rect x="600" y="224" width="16" height="16" style="fill:#8a4a2a;stroke:none"/><rect x="616" y="224" width="16" height="16" style="fill:#5a7a9a;stroke:none"/><text x="116" y="270" text-anchor="middle" class="s">the picture</text><text x="326" y="270" text-anchor="middle" class="s">ECB: shapes survive</text><text x="536" y="270" text-anchor="middle" class="s">CBC, CTR: noise</text><text x="30" y="310" class="s">Each square stands for one 16-byte block. ECB turns every equal block into the same</text><text x="30" y="330" class="s">scrambled block, so the outline shows through. Chained or counter modes do not.</text></g></svg><figcaption>Sketched for this page. A stand-in for the famous ECB penguin.</figcaption></figure>

<figure class="play" data-play="ecb"><span class="ai-tag">AI-created</span><figcaption><b>The ECB picture, drawn small.</b> Each 4 × 4 block of the picture goes through a toy stand-in for a block cipher (not AES). In ECB equal blocks give equal outputs and the outline survives; in CBC each block is first mixed with the one before, and it turns to noise.</figcaption></figure>

## CBC

**How it works.** XOR each plaintext block with the previous ciphertext
block, then encrypt: $C_i = E(K, P_i \oplus C_{i-1})$, with $C_0$ the IV. The IV must be
unpredictable. The message is padded to whole blocks; PKCS#7 adds $n$ bytes
of value $n$.

**What goes wrong.**

- **Predictable IVs.** TLS 1.0 used the last ciphertext block of one record
  as the next IV, and BEAST (Duong and Rizzo, 2011) used that to read
  cookies. TLS 1.1 already had a fresh IV per record.
- **Padding oracles.** Vaudenay (EUROCRYPT 2002): if the receiver lets
  slip whether the padding was valid, by an error or by timing, an attacker
  can decrypt any block by editing the one before it, at most 256 tries per
  byte. TLS 1.2 sends one alert for every error and always checks the MAC,
  and RFC 5246 says "a small timing channel" is left but too small to use.
- **Lucky 13.** AlFardan and Paterson (IEEE S&P 2013) used it: the MAC
  takes longer or shorter depending on how much the padding strips off.
  The name is for the 13 header bytes in the TLS MAC. OpenSSL's fix later
  opened a new padding oracle (CVE-2016-2107).
- **POODLE.** Möller, Duong and Kotowicz (Google, 2014): SSL 3.0 checks
  only the last padding byte, and the MAC doesn't cover the padding. After
  forcing a fallback to SSL 3.0, an attacker learns about one cookie byte
  per 256 requests. RFC 7568 (2015) deprecated SSL 3.0.

## CFB

**How it works.** The previous ciphertext goes through the cipher to make
keystream: $C_i = P_i \oplus E(K, C_{i-1})$. SP 800-38A also allows $s$-bit segments
(CFB1, CFB8, CFB128). Only the forward cipher is used, and decryption gets
back in step by itself after a damaged segment. OpenPGP uses a variant
(RFC 4880, Section 13.9).

**What goes wrong.** The first block is $P_1 \oplus E(K, \mathit{IV})$, so a repeated IV
leaks $P_1 \oplus P_1'$. Zerologon (CVE-2020-1472) shows how bad a fixed IV gets:
Netlogon ran AES-CFB8 with an all-zero IV. For one key in 256 the first
byte of $E(K, 0)$ is zero, and then all-zero plaintext encrypts to all
zeros. An attacker sending zeros got in after about 256 tries.

## OFB

**How it works.** Encrypt the IV, encrypt that, and so on; XOR the
keystream with the plaintext. It never depends on the data, so a bit error
in transit damages only that bit.

**What goes wrong.** The usual stream cipher trouble: a repeated IV
repeats the keystream, and flipped ciphertext bits flip the same plaintext
bits. The IV must also not equal an earlier output block, or the keystream
restarts partway. FIPS 81 allowed feeding back fewer than 64 bits, which
Davies and Parkin (1982) showed cuts the average cycle from $2^{63}$ steps to
about $2^{32}$. SP 800-38A keeps only full-block feedback.

## CTR

**How it works.** Encrypt a counter block and XOR it in: $C_i = P_i \oplus E(K, T_i)$,
with $T_i$ going up by one each block. Diffie and Hellman suggested it in
1979, but it waited until SP 800-38A for a NIST standard. It runs in
parallel, any block decrypts alone, and there is no padding. GCM and CCM
are CTR plus a MAC.

**What goes wrong.** A counter block must never repeat under one key,
across all messages. If one does, $C \oplus C' = P \oplus P'$, and one known plaintext
gives the other. With random 64-bit nonces a repeat is expected after about
$2^{32}$ messages. KRACK (Vanhoef and Piessens, CCS 2017) made WPA2 devices
reinstall a key and reset the packet number, so CCMP reused keystream and
packets could be decrypted.

## Encrypt-then-MAC or MAC-then-encrypt

These modes need a MAC, and the order matters. Three old protocols picked
one order each:

- **MAC-then-encrypt:** MAC the plaintext, encrypt both. SSL and TLS up to
  1.2.
- **Encrypt-and-MAC:** encrypt, and MAC the plaintext alongside. SSH
  (RFC 4253).
- **Encrypt-then-MAC:** encrypt, then MAC the ciphertext. IPsec ESP.

Bellare and Namprempre (ASIACRYPT 2000) proved encrypt-then-MAC secure for
any secure cipher and MAC, and the other two not secure in general;
Krawczyk (CRYPTO 2001) went through the three protocols. With
encrypt-then-MAC the receiver checks the tag first and drops a forgery
unread, so there is no padding check to probe. RFC 7366 (2014) added it to
TLS as an extension. An AEAD does the same job in one algorithm.

## Why TLS 1.3 dropped CBC

From SSL 3.0 to TLS 1.2, CBC ran MAC-then-encrypt, and each fix patched the
same design: fresh IVs for BEAST, one alert and a MAC check every time for
padding oracles, constant-time code for Lucky 13, then a bug in that code.
RFC 7457 (2015) puts the padding oracles down to MAC-then-encrypt itself.
TLS 1.3 (RFC 8446, 2018) kept only AEAD ciphers: AES-GCM,
ChaCha20-Poly1305 and AES-CCM.

## When to use them

- **Not for new designs.** Use AES-GCM or ChaCha20-Poly1305.
- **CTR** inside a bigger construction, or with an encrypt-then-MAC tag.
- **CBC, CFB, OFB** only to read old data or talk to old systems. **ECB**
  only for one block.

## Example (Python)

Python's standard library has no AES, so a toy 16-byte block cipher, four
Feistel rounds over HMAC-SHA256, stands in. It is only there so the modes
have something to call. First ECB against CBC on three equal blocks, then a
padding oracle attack that reads a CBC block from the server's yes or no
about the padding.

```python
import hmac, os

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def F(k, r, x):                    # round function: HMAC-SHA256 cut to 8 bytes
    return hmac.digest(k, bytes([r]) + x, "sha256")[:8]

def E(k, b):                       # toy 16-byte block cipher in place of AES
    L, R = b[:8], b[8:]
    for r in range(4):
        L, R = R, xor(L, F(k, r, R))
    return L + R

def D(k, b):
    L, R = b[:8], b[8:]
    for r in (3, 2, 1, 0):
        L, R = xor(R, F(k, r, L)), L
    return L + R

def cbc(k, iv, p):
    c = b""
    for i in range(0, len(p), 16):
        iv = E(k, xor(p[i:i + 16], iv))
        c += iv
    return c

key = os.urandom(16)
msg = b"YELLOW SUBMARINE" * 3                         # three equal blocks
c = cbc(key, os.urandom(16), msg)
print(len({E(key, msg[i:i + 16]) for i in range(0, 48, 16)}),   # ECB: 1 distinct block
      len({c[i:i + 16] for i in range(0, 48, 16)}))             # CBC: 3

def oracle(iv, c):                 # the server: is the padding good?
    p = xor(D(key, c), iv)
    return 1 <= p[-1] <= 16 and p[-p[-1]:] == bytes([p[-1]]) * p[-1]

def attack(prev, c):               # recover block c from the oracle alone
    mid = bytearray(16)            # becomes D(key, c), last byte first
    for i in range(15, -1, -1):
        n = 16 - i                 # aim for n padding bytes of value n
        f = bytearray(m ^ n for m in mid)
        for g in range(256):
            f[i] = g
            if oracle(bytes(f), c):
                if i == 15:        # rule out a lucky ...02 02 ending
                    f[14] ^= 1
                    if not oracle(bytes(f), c):
                        continue
                break
        mid[i] = g ^ n
    return xor(mid, prev)

iv = os.urandom(16)
c = cbc(key, iv, b"PIN=4417;user=jo" + bytes([16]) * 16)   # PKCS#7: a full padding block
print(attack(iv, c[:16]))          # b'PIN=4417;user=jo'
```

The attacker sends the block with a fake IV. When the padding is good, the
last byte came out as 01, which gives the last byte of $D(\mathit{key}, c)$. Then it
aims for 02 02, and so on back to the first byte. XOR with the real IV
gives the plaintext.

## Security notes

- CBC and CFB need an unpredictable IV; OFB and CTR need values that never
  repeat under the key.
- Change keys long before $2^{64}$ blocks with AES. With 64-bit blocks the limit
  is close enough to hit: see [Sweet32](../04-symmetric-ciphers/Retired.md#64-bit-block-ciphers).
- To decrypt CBC at all, check a MAC over the ciphertext first, and never
  let errors or timing depend on the padding.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ECB shows the pattern, CBC hides it"

    The 32-byte plaintext `YELLOW SUBMARINEYELLOW SUBMARINE` is the same 16-byte block twice. Encrypted with
    AES-128 (key all zeros; CBC IV `00 01 … 0f`), computed with Python's `cryptography`:

    | Mode | Block 1 | Block 2 |
    |---|---|---|
    | ECB | `9f966ace ece847cd 3333bb0f d5306172` | `9f966ace ece847cd 3333bb0f d5306172` |
    | CBC | `e73b6f01 735b3920 86885f75 3cd2eca6` | `7cb33a72 35464909 f9c9847c 0c7bd12d` |

    ECB turns equal blocks into equal ciphertext, which is how the famous "ECB penguin" stays visible. CBC
    XORs each block with the previous ciphertext first, so the repeat disappears.

??? abstract "The math, with formulas"

    | Mode | Encrypt | Decrypt | Notes |
    |---|---|---|---|
    | ECB | $C_i = E(P_i)$ | $P_i = D(C_i)$ | equal blocks leak |
    | CBC | $C_i = E(P_i \oplus C_{i-1})$, $C_0 = \mathit{IV}$ | $P_i = D(C_i) \oplus C_{i-1}$ | IV must be unpredictable; needs padding |
    | CFB | $C_i = P_i \oplus E(C_{i-1})$ | $P_i = C_i \oplus E(C_{i-1})$ | self-synchronizing stream |
    | OFB | $O_i = E(O_{i-1})$, $C_i = P_i \oplus O_i$ | same | keystream independent of data |
    | CTR | $C_i = P_i \oplus E(\mathit{nonce} \,\Vert\, i)$ | same | parallel; nonce must never repeat |

    **The padding oracle (Vaudenay, 2002).** In CBC, $P_i = D(C_i) \oplus C_{i-1}$. An attacker who changes the last byte
    of $C_{i-1}$ to $g$ and learns only "padding OK" (last byte `01`) knows $D(C_i)$ ends in $g \oplus \mathtt{01}$; XOR with the
    real $C_{i-1}$ byte gives the plaintext byte. At most 256 tries per byte, so a 16-byte block falls in at most
    4,096 queries. That is why CBC must be paired with a MAC checked first (encrypt-then-MAC), or replaced by
    an AEAD.

    **CTR keystream reuse.** With a repeated nonce, $C \oplus C' = P \oplus P'$, the same failure as a reused one-time
    pad.

??? tip "Watch it step by step: CBC encryption"

    <div class="mars-steps" markdown>

    1. Split the message into 16-byte blocks and pad the last one.
    2. XOR block 1 with a random IV, then encrypt: that is $C_1$.
    3. XOR block 2 with $C_1$, then encrypt: that is $C_2$.
    4. Continue: every block depends on all blocks before it.
    5. Decryption reverses it: decrypt $C_i$, then XOR with $C_{i-1}$.
    6. Equal plaintext blocks now give different ciphertext blocks, unlike ECB.

    </div>

??? info "The math underneath"

    - **Block ciphers as pseudorandom permutations:** [AES](../04-symmetric-ciphers/AES.md).
    - **XOR and the one-time pad:** why reusing a keystream is fatal.
    - **IND-CPA security:** CBC with a random IV and CTR with unique nonces are secure against eavesdroppers,
      ECB is not.
    - **Chosen-ciphertext attacks:** padding oracles and why integrity comes first ([AEAD](AEAD.md)).
    - **The birthday bound:** CBC and CTR wear out after about $2^{64}$ blocks with AES ($2^{32}$ with 64-bit ciphers).

## See also

- [ChaCha20-Poly1305](AEAD.md): an AEAD, what to use instead
- [AES](../04-symmetric-ciphers/AES.md): the block cipher these modes usually run
- [Disk encryption](Disk-Encryption.md): XTS, a mode built for sectors
- [Key wrap](Key-Wrap.md): a mode built for encrypting keys
- [TLS 1.3](../protocols/TLS-1.3.md): the protocol that went AEAD-only

## References

- [FIPS 81: DES Modes of Operation (1980, withdrawn 2005)](https://csrc.nist.gov/pubs/fips/81/final) / [NIST SP 800-38A (2001)](https://csrc.nist.gov/pubs/sp/800/38/a/final) / [NIST, "Decision to Revise SP 800-38A" (2023)](https://csrc.nist.gov/News/2023/decision-to-revise-nist-sp-800-38a)
- [Mouha and Dworkin, NIST IR 8459: Report on the Block Cipher Modes of Operation in the NIST SP 800-38 Series (2024)](https://csrc.nist.gov/pubs/ir/8459/final) (Section 4)
- Diffie and Hellman, "Privacy and Authentication: An Introduction to Cryptography", Proc. IEEE 67 (1979) / Davies and Parkin, "The Average Cycle Size of the Key Stream in Output Feedback Encipherment" (CRYPTO '82)
- [Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)](https://iacr.org/archive/eurocrypt2002/23320530/cbc02_e02d.pdf) / [RFC 5246: TLS 1.2](https://www.rfc-editor.org/rfc/rfc5246) (Section 6.2.3.2)
- [AlFardan and Paterson, "Lucky Thirteen: Breaking the TLS and DTLS Record Protocols" (IEEE S&P 2013)](http://www.isg.rhul.ac.uk/tls/Lucky13.html) / [CVE-2016-2107](https://nvd.nist.gov/vuln/detail/CVE-2016-2107)
- [Möller, Duong and Kotowicz, "This POODLE Bites: Exploiting the SSL 3.0 Fallback" (2014)](https://openssl-library.org/files/ssl-poodle.pdf) / [RFC 7568: Deprecating SSL 3.0](https://www.rfc-editor.org/rfc/rfc7568)
- [RFC 7457: Summarizing Known Attacks on TLS and DTLS](https://www.rfc-editor.org/rfc/rfc7457) / [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (Section 1.2)
- Bellare and Namprempre, "Authenticated Encryption: Relations among Notions and Analysis of the Generic Composition Paradigm" (ASIACRYPT 2000) / Krawczyk, "The Order of Encryption and Authentication for Protecting Communications (or: How Secure Is SSL?)" (CRYPTO 2001)
- [RFC 7366: Encrypt-then-MAC for TLS and DTLS](https://www.rfc-editor.org/rfc/rfc7366) / [RFC 4253: SSH Transport Layer](https://www.rfc-editor.org/rfc/rfc4253) (Section 6.4) / [RFC 4880: OpenPGP](https://www.rfc-editor.org/rfc/rfc4880) (Section 13.9)
- [Vanhoef and Piessens, "Key Reinstallation Attacks: Forcing Nonce Reuse in WPA2" (CCS 2017)](https://www.krackattacks.com/)
- [CVE-2020-11500 (Zoom)](https://nvd.nist.gov/vuln/detail/CVE-2020-11500) / [CVE-2020-1472 (Zerologon)](https://nvd.nist.gov/vuln/detail/CVE-2020-1472)

*Weaker sources:* [Wikimedia Commons, "Tux_ecb.jpg"](https://commons.wikimedia.org/wiki/File:Tux_ecb.jpg) for the ECB penguin; [Tervoort, "Zerologon" whitepaper (Secura, 2020)](https://www.secura.com/uploads/factsheets/Zerologon.pdf) for the CFB8 details.
