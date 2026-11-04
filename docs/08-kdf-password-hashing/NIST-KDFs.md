# NIST KDFs (KBKDF, one-step and X9.63)

*The key derivation functions in NIST's and ANSI's standards. They do HKDF's
job, turning a strong secret into keys, and you meet them wherever a FIPS
profile or an older spec named them.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

Three families, all fast, all for secrets that are already strong. None of
them is for passwords.

| KDF | Starts from | Spec | Built on |
|---|---|---|---|
| KBKDF | a key you already have | SP 800-108 (2009), Rev. 1 (2022) | HMAC, CMAC or KMAC |
| one-step KDF ("ConcatKDF") | a key-exchange secret $Z$ | SP 800-56A (2006), now SP 800-56C Rev. 2 (2020) | a hash, HMAC or KMAC |
| X9.63 KDF | a key-exchange secret $Z$ | ANSI X9.63 (2001), SEC 1 | a hash |

KBKDF (key-based KDF) splits one key into several, for example one per
direction or per purpose. The other two sit right after a Diffie-Hellman or
ECDH step and turn its shared secret into keys.

## The story

- **Who made it:** NIST (Lily Chen and colleagues): SP 800-108 (2009), SP 800-56A's one-step KDF (2006), and ANSI X9.63 (2001) from the banking world.
- **What for:** Deriving keys inside US federal and banking systems.
- **What it solved:** One approved, testable way to turn a key or a key-exchange output into more keys.
- **Where it stands:** Approved and used in FIPS-validated products and smart cards.
- **Incidents:** None tied to the KDFs themselves.

## How it works

### KBKDF (SP 800-108)

Each block of output is one PRF call keyed with the input key $K_{\mathrm{IN}}$. Every
call also gets the same fixed input $\mathit{Label} \,\Vert\, \mathtt{0x00} \,\Vert\, \mathit{Context} \,\Vert\, [L]$: what the
key is for, a zero byte, who and which session it belongs to, and the output
length in bits. The three modes differ in what changes from call to call:

- **Counter:** $K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, [i] \,\Vert\, \text{fixed input})$, with an $r$-bit counter
  ($r \le 32$) starting at 1.
- **Feedback:** $K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, K(i-1) \{\Vert\, [i]\} \,\Vert\, \text{fixed input})$, with
  $K(0) = \mathit{IV}$. Each block feeds the next, and the counter is optional.
- **Double pipeline:** a first chain $A(i) = \mathrm{PRF}(K_{\mathrm{IN}}, A(i-1))$ starts from
  the fixed input, and $K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, A(i) \{\Vert\, [i]\} \,\Vert\, \text{fixed input})$.

The output is $K(1) \,\Vert\, K(2) \,\Vert\, \ldots$ cut to $L$ bits. Field order and widths are left
to the protocol, so two "SP 800-108 counter mode" implementations agree only
if they also agree on those. Rev. 1 added a KMAC KDF that needs no loop: one
call to $\mathrm{KMAC}(K_{\mathrm{IN}}, \mathit{Context}, L, \mathit{Label})$.

### One-step KDF (SP 800-56C)

$K(i) = H(\mathit{counter} \,\Vert\, Z \,\Vert\, \mathit{FixedInfo})$, with a 4-byte big-endian counter from 1.
$H$ is a hash, HMAC keyed with a salt, or KMAC. FixedInfo usually names the
algorithm and both parties. SP 800-56A (2006) called this the concatenation
KDF, which is where "ConcatKDF" comes from. In 2018 the full spec moved to
SP 800-56C Rev. 1.

### X9.63 KDF

$K(i) = \mathrm{Hash}(Z \,\Vert\, \mathit{counter} \,\Vert\, \mathit{SharedInfo})$: the same idea, with the counter
after $Z$ (SEC 1, Section 3.6.1). NIST approves it inside ANSI X9.63 key
agreement through SP 800-135.

SP 800-135 Rev. 1 dates from 2011. In August 2024 NIST decided to revise
it: to add more application-specific KDFs, match the coming SP 800-131A
revision on which hash functions stay approved, and update references to
the protocols it covers. No draft had appeared as of November 2026.

### Where HKDF fits

The first SP 800-56C (2011) added a two-step method: extract, then expand. A
MAC of $Z$ keyed with a salt (HMAC or AES-CMAC) makes one key, and an
SP 800-108 KDF expands it. [HKDF](HKDF.md) is that with HMAC for
both steps and a feedback-mode expand (its one-byte counter goes last). NIST's
algorithm test spec calls HKDF a subset of the two-step KDF, so a FIPS module
can offer HKDF as an approved KDF.

In January 2026 NIST said it will revise SP 800-56C to let $Z$ include a KEM
shared secret and to allow KMAC in the extract step.

## When to use it

- **When a spec names one.** JWE's ECDH-ES (RFC 7518) runs the one-step KDF
  with SHA-256. SEC 1 offers the X9.63 KDF for
  [ECIES](../03-public-key-encryption/ECIES.md), and 5G's subscriber ID
  encryption uses it. Kerberos with AES and SHA-2 (RFC 8009) uses KBKDF
  counter mode with HMAC-SHA-256 or HMAC-SHA-384.
- **In FIPS modules.** OpenSSL's FIPS provider has KBKDF, SSKDF (its name for
  the one-step KDF) and X963KDF next to HKDF. Its KBKDF does counter and
  feedback mode, not double pipeline.
- **In a new design,** use HKDF. Every library has it, and NIST accepts it.

## Example (Python)

KBKDF in counter mode with HMAC-SHA-256 as Kerberos uses it, and the one-step
KDF as JWE uses it. Both outputs match the test values in RFC 8009 Appendix A
and RFC 7518 Appendix C.

```python
import base64, hashlib, hmac

def kbkdf(key, label, context, n):           # SP 800-108 counter mode
    fixed = label + b"\0" + context + (8 * n).to_bytes(4, "big")
    out, i = b"", 1
    while len(out) < n:
        out += hmac.new(key, i.to_bytes(4, "big") + fixed, hashlib.sha256).digest()
        i += 1
    return out[:n]

def onestep(z, info, n):                      # SP 800-56C one-step with SHA-256
    out, i = b"", 1
    while len(out) < n:
        out += hashlib.sha256(i.to_bytes(4, "big") + z + info).digest()
        i += 1
    return out[:n]

# RFC 8009: the checksum key Kc for key usage 2
base = bytes.fromhex("3705d96080c17728a0e800eab6e0d23c")
print(kbkdf(base, bytes.fromhex("0000000299"), b"", 16).hex())
# b31a018a48f54776f403e9a396325dc3

# RFC 7518: ECDH-ES with "enc": "A128GCM", "apu": "Alice", "apv": "Bob"
z = bytes([158, 86, 217, 29, 129, 113, 53, 211, 114, 131, 66, 131, 191, 132, 38, 156,
           251, 49, 110, 163, 218, 128, 106, 72, 246, 218, 167, 121, 140, 254, 144, 196])
lv = lambda s: len(s).to_bytes(4, "big") + s  # length, then the bytes
info = lv(b"A128GCM") + lv(b"Alice") + lv(b"Bob") + (128).to_bytes(4, "big")
print(base64.urlsafe_b64encode(onestep(z, info, 16)).rstrip(b"=").decode())
# VqqN6vgjbSBcIijNcacQGg
```

For the X9.63 KDF, swap the order inside `onestep` to `z + i.to_bytes(4, "big")`.
That version matches all 20 SHA-256 cases in NIST's CAVS test file for
ANS X9.63 (as copied into PyCA `cryptography`'s test vectors).

## Security notes

- **Not for passwords.** One PRF or hash call per block makes every guess
  cheap. Use [Argon2](Argon2.md).
- **Label everything.** Put the purpose and the length into Label, Context or
  FixedInfo, so one secret gives unrelated keys for different jobs and sizes.
- **CMAC can be steered.** SP 800-108 Rev. 1 warns that with CMAC as the PRF,
  a party who knows $K_{\mathrm{IN}}$ and picks enough of the input can force some output
  blocks to chosen values. Use HMAC or KMAC, or the fixes it gives for each
  mode, when that matters.
- **Length limits:** counter mode stops at $2^r - 1$ blocks, and feedback,
  double pipeline, one-step and X9.63 at $2^{32} - 1$. Nobody gets near that.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: one key in, separate keys out"

    SP 800-108 counter mode with HMAC-SHA-256, recomputed with Python's `hmac`. The input key is 32 bytes
    of `01`, the context is "session 42", and the fixed input is
    $[i]_4 \,\Vert\, \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L]_4$ (4-byte big-endian counter and length):

    | Label | $L$ (bits) | Output |
    |---|---|---|
    | "encryption" | 256 | `d21b20ec21bc798f461038325da5f426d9e06c05a014e384928a5d2b64e872b6` |
    | "authentication" | 256 | `cdb0d3bdae99f54b8ed6068395b2231d54942d38cd1f5886823176569dc9cfc9` |
    | "encryption" | 512 | `0fdb19efbd7acfed5102f7ca1425906d…` (first 32 of 64 bytes) |

    The last row is not the first row with more bytes added: $L$ is part of every PRF input, so asking for a
    longer key changes the whole output.

    The one-step KDF and the X9.63 KDF, with $Z$ = bytes `00 01 … 1f` and FixedInfo "AES-256 alice bob", one
    SHA-256 call each:

    | KDF | Hash input | Output |
    |---|---|---|
    | One-step (SP 800-56C) | $\mathtt{00000001} \,\Vert\, Z \,\Vert\, \mathit{FixedInfo}$ | `4dd979e57b584004b50e341434b1a3213348b5f04e40ddbc13484aa02405944f` |
    | X9.63 | $Z \,\Vert\, \mathtt{00000001} \,\Vert\, \mathit{FixedInfo}$ | `48c11d1d90d9820d72d1c03d65c651ab9894cfeb4d0a9518ee79321e4deaeea3` |

    Moving the counter from front to back is the only difference, and it gives a different key: the two are
    not interchangeable.

??? abstract "The math, with formulas"

    With $n = \lceil L / h \rceil$ PRF calls ($h$ = output bits of the PRF):

    $$
    \begin{aligned}
    \text{Counter:} \quad & K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, [i] \,\Vert\, \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L]) \\
    \text{Feedback:} \quad & K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, K(i-1) \{\Vert\, [i]\} \,\Vert\, \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L]), \quad K(0) = \mathit{IV} \\
    \text{Double pipeline:} \quad & A(0) = \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L], \quad A(i) = \mathrm{PRF}(K_{\mathrm{IN}}, A(i-1)) \\
    & K(i) = \mathrm{PRF}(K_{\mathrm{IN}}, A(i) \{\Vert\, [i]\} \,\Vert\, \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L]) \\
    \text{KMAC (Rev. 1):} \quad & K_{\mathrm{OUT}} = \mathrm{KMAC}(K_{\mathrm{IN}}, \mathit{Context}, L, \mathit{Label}) \\
    \text{One-step:} \quad & K(i) = H(i_4 \,\Vert\, Z \,\Vert\, \mathit{FixedInfo}) \\
    \text{X9.63:} \quad & K(i) = \mathrm{Hash}(Z \,\Vert\, i_4 \,\Vert\, \mathit{SharedInfo}) \\
    \text{Output:} \quad & K_{\mathrm{OUT}} = \text{first } L \text{ bits of } K(1) \,\Vert\, K(2) \,\Vert\, \cdots \,\Vert\, K(n)
    \end{aligned}
    $$

    $[i]$ and $[L]$ are big-endian integers of an agreed width. In SP 800-108 the counter is at most
    32 bits, so a KDF can make at most $(2^{32} - 1) \cdot h$ bits; the one-step KDF also caps $n$ at $2^{32} - 1$.

??? tip "Watch it step by step: counter mode"

    <div class="mars-steps" markdown>

    1. Start with one 32-byte key, for example the output of a key exchange.
    2. Write the fixed input: the label "encryption", a zero byte, the context "session 42", and the length 256.
    3. Put the counter 1 in front and run HMAC-SHA-256: 32 bytes, `d21b20ec…72b6`.
    4. Need more? Counter 2, same fixed input, another HMAC, and so on.
    5. Change only the label to "authentication": an unrelated key, `cdb0d3bd…cfc9`.
    6. Each part of the system gets its own key, and leaking one tells nothing about the others.

    </div>

??? info "The math underneath"

    - **Pseudorandom functions:** if the PRF ([HMAC](../06-mac/HMAC.md), [CMAC](../06-mac/Block-Cipher-MACs.md) or
      [KMAC](../06-mac/KMAC.md)) can't be told apart from random, neither can the derived keys.
    - **Domain separation:** distinct labels and contexts make distinct PRF inputs, so keys for different
      jobs are independent.
    - **Why the zero byte and $[L]$:** they stop "label + context" from being split two ways and stop a short
      key from being a prefix of a long one.
    - **Extract, then expand:** a Diffie-Hellman secret is not uniform, so SP 800-56C's two-step method
      first condenses it; [HKDF](HKDF.md) is the best-known example.

## See also

- [HKDF](HKDF.md): the extract-then-expand KDF most protocols use
- [KMAC](../06-mac/KMAC.md): the Keccak MAC that both NIST KDF specs allow
- [ECIES](../03-public-key-encryption/ECIES.md): where the X9.63 KDF is used
- [HMAC](../06-mac/HMAC.md): the usual PRF

## References

- [NIST SP 800-108 Rev. 1 (2022, updated 2024)](https://csrc.nist.gov/pubs/sp/800/108/r1/upd1/final) (Sections 4.1–4.4, 6.7, Appendix B) / [SP 800-108 (2009)](https://csrc.nist.gov/pubs/sp/800/108/upd1/final)
- [NIST SP 800-56C Rev. 2 (2020)](https://csrc.nist.gov/pubs/sp/800/56/c/r2/final) (Sections 4.1, 5, Appendix A) / NIST SP 800-56A (2006), Section 5.8.1
- [NIST SP 800-135 Rev. 1 (2011)](https://csrc.nist.gov/pubs/sp/800/135/r1/final) (Section 5.1) ([decision to revise, August 2024](https://csrc.nist.gov/News/2024/decision-to-revise-sp-800135-rev-1)) / [SEC 1 v2.0 (2009)](https://www.secg.org/sec1-v2.pdf) (Section 3.6.1) / [CAVS 12.0 X9.63 KDF vectors, PyCA copy](https://github.com/pyca/cryptography/blob/main/vectors/cryptography_vectors/KDF/ansx963_2001.txt)
- [NIST ACVP, "KDA HKDF" test spec](https://pages.nist.gov/ACVP/draft-hammett-acvp-kas-kdf-hkdf.html) (Section 6.2.1)
- [NIST, "NIST to Update Special Publication 800-56A and Revise 800-56C" (2026)](https://csrc.nist.gov/news/2026/nist-to-revise-key-establishment-recommendations)
- [RFC 7518: JSON Web Algorithms](https://www.rfc-editor.org/rfc/rfc7518) (Section 4.6.2, Appendix C) / [RFC 8009: AES-SHA2 for Kerberos 5](https://www.rfc-editor.org/rfc/rfc8009) (Section 3, Appendix A)
- [OpenSSL 3.0: FIPS provider](https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-FIPS/) / [EVP_KDF-KB](https://docs.openssl.org/3.0/man7/EVP_KDF-KB/) / [EVP_KDF-SS](https://docs.openssl.org/3.0/man7/EVP_KDF-SS/)
