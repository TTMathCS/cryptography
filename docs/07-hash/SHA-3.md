# SHA-3 (Keccak)

*NIST's second hash standard, built on a completely different design from SHA-2
so that one break doesn't take out both.*

**Status and standards:** see [Hash functions](../index.md#7-hash-functions) in
the main table.

## What it is

After the attacks on MD5 and SHA-1, NIST ran an open competition (2007–2012)
for a hash that didn't share SHA-2's structure. Keccak won and became FIPS 202
in 2015. SHA-2 is still fine, so SHA-3 is mostly the safety net, but it has
become the hash inside the new post-quantum standards
([ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md)).

| Function | Output | Use |
|---|---|---|
| SHA3-224 / 256 / 384 / 512 | fixed | drop-in for the SHA-2 sizes |
| SHAKE128 / SHAKE256 | any length you ask for | XOFs: stream out as many bytes as needed |
| Keccak-256 | 256-bit | Ethereum: the pre-standard padding, so it differs from SHA3-256 |

## How it works

SHA-3 is a **sponge** over a 1600-bit state, split into a *rate* part and a
*capacity* part:

1. **Absorb:** XOR a rate-sized chunk of the message into the state, then run
   the Keccak-f permutation (24 rounds). Repeat for every chunk.
2. **Squeeze:** read rate-sized output from the state, permute, read again,
   until you have enough bytes.

The capacity part is never output directly, and that is where the security
comes from (SHA3-256 uses 512 bits of capacity). Because the digest is not the
whole internal state, **length extension doesn't work**, unlike SHA-2.

## When to use it

- **When a standard asks for it** (FIPS 202, ML-KEM/ML-DSA internals) or you
  want a hash unrelated to SHA-2.
- **SHAKE** when you need a variable-length output, such as deriving a stream of
  bytes from a seed.
- **Otherwise** SHA-256 is still the common, fastest choice in most software,
  and both are safe.

## Example (Python)

```python
import hashlib

print(hashlib.sha3_256(b"hello world").hexdigest())
# 644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938

print(hashlib.shake_128(b"hello world").hexdigest(16))   # 16 bytes out
# 3a9159f071e4dd1c8c4f968607c30942
```

## Security notes

- SHA3-256 has the same collision and preimage strength as SHA-256.
- Keccak-256 (Ethereum) and SHA3-256 give different digests for the same input;
  check which one a system means.
- Plain SHA-3 is a safe MAC as `SHA3(key ‖ message)` thanks to the sponge, but
  KMAC is the standard keyed form.

## See also

- [SHA-2](SHA-2.md): the Merkle–Damgård design SHA-3 backs up
- [HMAC](../06-mac/HMAC.md): the keyed construction for SHA-2

## References

- [FIPS 202: SHA-3 Standard](https://csrc.nist.gov/pubs/fips/202/final)
- [The Keccak team](https://keccak.team/keccak.html)
