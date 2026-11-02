# HPKE (Hybrid Public Key Encryption)

*Public-key encryption from three swappable parts: a KEM, a KDF and an AEAD.
One spec with test vectors, under TLS Encrypted Client Hello, MLS and
Oblivious HTTP.*

**Status and standards:** see [Public-key encryption](../index.md#3-public-key-encryption)
in the main table.

## What it is

RFC 9180 (February 2022, Barnes, Bhargavan, Lipp and Wood) came out of the
IRTF's Crypto Forum Research Group after three years of drafts. It does the
job of [ECIES](ECIES.md) as one fixed design: a KEM makes a fresh shared
secret plus an encapsulation `enc` to send, HKDF turns the secret into keys,
and an AEAD encrypts.

A cipher suite is three 16-bit ids:

| Part | Ids in RFC 9180 |
|---|---|
| KEM | **NIST curves:** `0x0010` DHKEM(P-256), `0x0011` DHKEM(P-384), `0x0012` DHKEM(P-521)<br>**Montgomery curves:** `0x0020` DHKEM(X25519), `0x0021` DHKEM(X448) |
| KDF | `0x0001` HKDF-SHA256, `0x0002` HKDF-SHA384, `0x0003` HKDF-SHA512 |
| AEAD | **AES-GCM:** `0x0001` AES-128-GCM, `0x0002` AES-256-GCM<br>**ChaCha20-Poly1305:** `0x0003`<br>**No encryption:** `0xFFFF` export only |

The usual suite, and the one ECH requires, is X25519 + HKDF-SHA256 +
AES-128-GCM (`0x0020`, `0x0001`, `0x0001`).

## How it works

DHKEM is ECDH wrapped as a KEM:

- **Encap(pkR):** make an ephemeral key pair, compute `DH(skE, pkR)` and send
  `enc = pkE`. The shared secret is HKDF over the DH output, with `enc` and
  `pkR` as context.
- **Decap(enc, skR):** compute `DH(skR, enc)` and derive the same secret.

A key schedule then mixes the shared secret with the mode, an optional
pre-shared key and the application's `info` string. Out come an AEAD key, a
base nonce and an exporter secret. The resulting context seals messages in
order (nonce = base nonce XOR a counter) and can `Export()` extra secrets.

| Mode | Id | Who the sender is proven to be |
|---|---|---|
| base | `0x00` | nobody: anyone with the public key can send |
| psk | `0x01` | a holder of the pre-shared key |
| auth | `0x02` | the owner of a static key (a second DH, `DH(skS, pkR)`) |
| auth_psk | `0x03` | both |

The encapsulation adds 32 bytes for X25519 or 65 for P-256, and the AEAD a
16-byte tag.

## When to use it

- **Any new "encrypt to a public key" job.** Pick a suite and put a context
  string in `info`.
- **TLS Encrypted Client Hello** (RFC 9849, March 2026): the client encrypts
  its real ClientHello, including the server name, to a key the server
  publishes in DNS (RFC 9848).
- **MLS** (RFC 9420, 2023): group messaging uses base-mode HPKE to encrypt
  path secrets to other members' tree nodes, and group secrets to new
  members in Welcome messages.
- **Oblivious HTTP** (RFC 9458, 2024): the client encrypts a request to a
  gateway and sends it through a relay. The relay sees who, the gateway sees
  what, neither sees both. Oblivious DoH (RFC 9230) does the same for DNS.
- **Libraries:** PyCA `cryptography` (since 47.0, 2026), Apple CryptoKit
  (iOS 17, macOS 14), and Google Tink, which recommends it over its own ECIES.

## Post-quantum HPKE

DHKEM falls to a quantum computer, but HPKE only needs a KEM, so a
post-quantum one drops in. None of them support the auth modes. Status in
October 2026:

| Draft | What it adds | Status |
|---|---|---|
| draft-ietf-hpke-pq-05 (Jul 2026) | **ML-KEM alone:** ML-KEM-512/768/1024 (`0x0040`–`0x0042`)<br>**Hybrids:** MLKEM768-P256 (`0x0050`), MLKEM768-X25519 (`0x647A`), MLKEM1024-P384 (`0x0051`)<br>**KDFs:** SHAKE and TurboSHAKE | HPKE working group draft, not yet sent to the IESG |
| draft-connolly-cfrg-xwing-kem-11 (Sep 2026) | X-Wing: X25519 + ML-KEM-768 with a SHA3-256 combiner; 1,216 B public key, 1,120 B `enc` | individual draft, with the Independent Submissions Editor since May 2025 |
| draft-irtf-cfrg-hybrid-kems-12 and draft-irtf-cfrg-concrete-hybrid-kems-04 | the generic hybrid KEM design and its concrete KEMs; the concrete MLKEM768-X25519 is identical to X-Wing | CFRG drafts, waiting for a document shepherd |

IANA already lists these ids; `0x647A` points to the X-Wing draft for now.

The base spec is moving too. draft-ietf-hpke-hpke-06 (October 2026) would
make HPKE an IETF Proposed Standard and obsolete RFC 9180. It adds
single-stage KDFs and drops the auth and auth_psk modes. IETF Last Call
ended in August 2026, and it is now in IESG evaluation.

## Example (Python)

Needs PyCA `cryptography` 47 or later (`pip install cryptography`); 46 has
no `hpke` module. Run with 47.0.0 and 50.0.1 on Python 3.13, it prints
`53 b'hello'`.

```python
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.hpke import AEAD, KDF, KEM, Suite

suite = Suite(KEM.X25519, KDF.HKDF_SHA256, AEAD.AES_128_GCM)   # 0x0020, 0x0001, 0x0001

sk = x25519.X25519PrivateKey.generate()
ct = suite.encrypt(b"hello", sk.public_key(), info=b"demo v1")   # base mode, one shot
print(len(ct), suite.decrypt(ct, sk, info=b"demo v1"))          # 53 b'hello': 32 enc + 5 + 16 tag
```

## Security notes

- No forward secrecy for the recipient: whoever later gets `skR` can read
  every base-mode message sent to it, so rotate keys.
- Auth mode allows key-compromise impersonation: with `skR`, an attacker can
  forge messages to that recipient from any sender.
- No replay protection, and the plaintext length shows; the application
  handles both.
- Bad randomness in `Encap` can lose base-mode confidentiality completely.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 9180's first test vector, recomputed"

    Suite DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, base mode, `info` = "Ode on a Grecian Urn".
    Values from RFC 9180 Appendix A.1, shortened with `…`; the DH value, the shared secret and the first
    ciphertext were recomputed here with Python's `cryptography` and `hmac`, and match:

    | Step | Value |
    |---|---|
    | Receiver public key `pkR` | `3948cfe0…80815c4d` |
    | Sender's ephemeral `enc = pkE` | `37fda356…f1bf4431` (32 bytes, sent first) |
    | `dh = X25519(skE, pkR)` | `b3b5c19e…c9c72e35` |
    | `shared_secret` = HKDF of `dh`, `enc`, `pkR` | `fe0e18c9…7d2ea1fc` |
    | Key schedule: `key` | `4531685d41d65f03dc48f6b8302c05b0` (16 bytes for AES-128) |
    | Key schedule: `base_nonce` | `56d890e5accaaf011cff4b7d` (12 bytes) |
    | Message 0: nonce = `base_nonce ⊕ 0` | `…4b7d` |
    | Message 1: nonce = `base_nonce ⊕ 1` | `…4b7c` |
    | Message 2: nonce = `base_nonce ⊕ 2` | `…4b7f` |
    | Seal "Beauty is truth, truth beauty", aad "Count-0" | `f938558b…3c512a` (29 bytes + 16-byte tag) |

??? abstract "The math, with formulas"

    **Labeled HKDF.** Every HKDF call is prefixed with `"HPKE-v1"` and a suite id, so outputs for different
    uses or suites can never collide:

    ```
    LabeledExtract(salt, label, ikm)   = HKDF-Extract(salt, "HPKE-v1" ‖ suite_id ‖ label ‖ ikm)
    LabeledExpand(prk, label, info, L) = HKDF-Expand(prk, I2OSP(L, 2) ‖ "HPKE-v1" ‖ suite_id ‖ label ‖ info, L)
    ```

    **DHKEM:**
    `shared_secret = LabeledExpand(LabeledExtract("", "eae_prk", dh), "shared_secret", enc ‖ pkR, Nsecret)`.
    Including `enc` and `pkR` binds the secret to this exchange.

    **Key schedule:**

    ```
    context = mode ‖ LabeledExtract("", "psk_id_hash", psk_id) ‖ LabeledExtract("", "info_hash", info)
    secret  = LabeledExtract(shared_secret, "secret", psk)
    key        = LabeledExpand(secret, "key", context, Nk)
    base_nonce = LabeledExpand(secret, "base_nonce", context, Nn)
    exporter   = LabeledExpand(secret, "exp", context, Nh)
    ```

    **Sealing message `i`:** `nonce = base_nonce ⊕ I2OSP(i, Nn)`, then AEAD. The counter never repeats, so no
    nonce repeats; after `2⁹⁶ − 1` messages the context must stop.

    **Auth mode** adds a second DH with the sender's static key: `dh = DH(skE, pkR) ‖ DH(skS, pkR)`.

??? tip "Watch it step by step: one sealed message"

    <div class="mars-steps" markdown>

    1. The receiver publishes an X25519 public key.
    2. The sender makes a one-time key pair and computes the Diffie-Hellman value with the receiver's key.
    3. HKDF turns that value, the one-time public key and the receiver's key into the shared secret.
    4. The key schedule mixes in the mode and the `info` string and outputs an AES key and a base nonce.
    5. The sender seals message 0 with nonce `base_nonce ⊕ 0`, message 1 with `base_nonce ⊕ 1`, and so on.
    6. It sends the one-time public key once, then the ciphertexts.
    7. The receiver repeats steps 2 to 4 with its private key and opens the messages in order.

    </div>

??? info "The math underneath"

    - **KEMs** and the KEM/DEM design: [ECDH](../01-key-exchange/ECDH.md), [ML-KEM](../01-key-exchange/ML-KEM.md).
    - **HKDF** (extract-then-expand): [HKDF](../08-kdf-password-hashing/HKDF.md).
    - **AEADs** and nonce uniqueness: [AEAD](../05-modes-aead/AEAD.md).
    - **Domain separation:** labels and suite ids so one key never serves two purposes.
    - **Security proofs:** IND-CCA2 in base mode under the gap Diffie-Hellman assumption (Alwen, Blanchet,
      Hauck, Kiltz, Lipp and Riepel, 2021).

## See also

- [ECIES](ECIES.md): the older, option-heavy scheme HPKE replaces
- [ElGamal](ElGamal.md): where encrypting with Diffie-Hellman started
- [ECDH](../01-key-exchange/ECDH.md) / [ML-KEM](../01-key-exchange/ML-KEM.md): the KEMs it runs on
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [AEAD](../05-modes-aead/AEAD.md): the other two parts
- [TLS 1.3](../protocols/TLS-1.3.md): the handshake ECH protects

## References

- [RFC 9180: Hybrid Public Key Encryption](https://www.rfc-editor.org/rfc/rfc9180) / [IANA HPKE registry](https://www.iana.org/assignments/hpke/hpke.xhtml)
- [draft-ietf-hpke-hpke](https://datatracker.ietf.org/doc/draft-ietf-hpke-hpke/) / [draft-ietf-hpke-pq](https://datatracker.ietf.org/doc/draft-ietf-hpke-pq/)
- [draft-connolly-cfrg-xwing-kem](https://datatracker.ietf.org/doc/draft-connolly-cfrg-xwing-kem/) / [draft-irtf-cfrg-hybrid-kems](https://datatracker.ietf.org/doc/draft-irtf-cfrg-hybrid-kems/) / [draft-irtf-cfrg-concrete-hybrid-kems](https://datatracker.ietf.org/doc/draft-irtf-cfrg-concrete-hybrid-kems/)
- [RFC 9849: TLS Encrypted Client Hello](https://www.rfc-editor.org/rfc/rfc9849) / [RFC 9420: MLS](https://www.rfc-editor.org/rfc/rfc9420) / [RFC 9458: Oblivious HTTP](https://www.rfc-editor.org/rfc/rfc9458)
- [PyCA cryptography HPKE docs](https://cryptography.io/en/latest/hazmat/primitives/hpke/)
