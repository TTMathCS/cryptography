# WPA2 and WPA3 (Wi-Fi Protected Access)

*Encryption for Wi-Fi. A 4-way handshake turns a pairwise master key (PMK) into
fresh session keys. WPA2-Personal derives the PMK from the password alone, so
one recorded handshake lets anyone test guesses offline; WPA3's SAE gets it
from a Diffie-Hellman exchange tied to the password.*

**Standard:** IEEE 802.11i (2004) brought CCMP and the 4-way handshake, 802.11w
(2009) protected management frames; both are now in IEEE 802.11-2024. The Wi-Fi
Alliance certifies WPA2 (2004) and WPA3 (2018; v3.5, 2025). SAE is also
Dragonfly, RFC 7664 (2015), and Enhanced Open is OWE, RFC 8110 (2017), both
Informational. **Implementations:** hostapd and wpa_supplicant (2.12, August
2026), iwd, and the Wi-Fi stacks of Windows, Apple's systems and access points.

## One connection, one algorithm per category

Real output from hostapd and wpa_supplicant 2.10 (Ubuntu 24.04), Oct 2026, in a
QEMU virtual machine inside the container with simulated radios
(`mac80211_hwsim`): one AP in WPA3 transition mode (SSID `IEEE`, passphrase
`password`), wlan1 joining with SAE and wlan2 with WPA2-PSK:

```
$ wpa_cli -i wlan1 status | grep -E 'cipher|key_mgmt|pmf|sae_group|sae_h2e'
pairwise_cipher=CCMP
group_cipher=CCMP
key_mgmt=SAE
pmf=1
mgmt_group_cipher=BIP
sae_group=19
sae_h2e=0
$ hostapd_cli -i wlan0 all_sta | grep -E '^02|AKM'
02:00:00:00:02:00
AKMSuiteSelector=00-0f-ac-2
02:00:00:00:01:00
AKMSuiteSelector=00-0f-ac-8
```

00-0F-AC is the OUI registered to IEEE 802.11: AKM 2 is PSK, AKM 8 is SAE.
`pmf=1`: management frame protection is on but optional; WPA3-only shows 2.

| WPA3 name | Category | Algorithm inside |
|---|---|---|
| `SAE`, `sae_group=19` | [Key exchange](../index.md#1-key-exchange) | [SAE](../01-key-exchange/PAKE.md) (Dragonfly): [ECDH on P-256](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) with a base point derived from the password |
| `WPA2-PSK` (AKM 2) | [KDF](../index.md#8-key-derivation-and-password-hashing) | no exchange: the PMK is [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-HMAC-SHA-1 of the passphrase, salted with the SSID, 4,096 rounds |
| none | [Signature](../index.md#2-digital-signatures) | none in Personal mode; Enterprise relies on the RADIUS server's certificate inside EAP |
| PTK derivation | [KDF](../index.md#8-key-derivation-and-password-hashing) | the 802.11 KDF, [HMAC](../06-mac/HMAC.md)-SHA-256 with a counter, for SAE; a PRF built on HMAC-SHA-1 for WPA2-PSK |
| `CCMP` (00-0F-AC:4) | [Cipher](../index.md#5-cipher-modes-and-aead) | [AES](../04-symmetric-ciphers/AES.md)-128 in [CCM](../05-modes-aead/AEAD.md#aes-ccm) with an 8-byte MIC on every data frame, unicast (`pairwise`) and broadcast (`group`) |
| EAPOL-Key MIC | [MAC](../index.md#6-mac) | [AES-CMAC](../06-mac/Block-Cipher-MACs.md#cmac) on handshake messages for SAE; HMAC-SHA-1 cut to 16 bytes for WPA2-PSK |
| `BIP` (00-0F-AC:6) | [MAC](../index.md#6-mac) | BIP-CMAC-128: AES-128-CMAC on broadcast management frames such as deauthentication |
| key data | [Key wrap](../index.md#5-cipher-modes-and-aead) | [AES key wrap](../05-modes-aead/Key-Wrap.md) under the KEK carries the group keys in message 3 |
| (inside SAE and the KDF) | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md); SHA-1 for WPA2-PSK |

**Why WPA2-Personal can be cracked offline and SAE can't.** The WPA2-PSK PMK
depends only on passphrase and SSID, the nonces travel in the clear, and
message 2 carries a MIC: one recorded handshake lets an attacker test guesses
at home (as the Python below does), and anyone with the passphrase can decrypt
recorded sessions. SAE's PMK comes from Diffie-Hellman with fresh random
values: a recording gives nothing to test, a fake AP gets one guess per try,
and a password learned later doesn't open old sessions.

## How a connection works

1. **Discovery.** Beacons carry the AP's RSN element (`iw` shows `PSK SAE`
   and `MFP-capable` here); the station names its choice when it associates.
2. **WPA2-Personal PMK.** PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096,
   256 bits), the same for every device and session.
3. **WPA3-Personal PMK (SAE).** Before associating, both sides hash the
   password, both MAC addresses and a counter until the result lands on the
   curve: the password element PWE (here at counter 4, but all 40 rounds run
   so timing hides it). Each picks random rand and mask, sends scalar = rand +
   mask and element = −mask·PWE (98 bytes on P-256), and computes K =
   rand·(scalar′·PWE + element′). Its x coordinate gives a KCK and the PMK
   (HMAC-SHA-256, then the KDF); 34-byte confirms prove both got the same.
4. **The 4-way handshake.** Message 1 brings the AP's ANonce. The station
   picks an SNonce and computes PTK = KDF(PMK, "Pairwise key expansion", both
   addresses and both nonces, each pair sorted): KCK (MIC key), KEK (key-wrap
   key) and TK (traffic key), 16 bytes each. Message 2 sends the SNonce,
   message 3 the group keys under the KEK, message 4 an acknowledgement.
5. **Data frames.** Each frame gets a 48-bit packet number (PN), part of the
   CCM nonce; receivers drop any PN not above the last. Broadcast frames use
   the group key (GTK), which every station shares.
6. **Management frames (PMF, 802.11w).** Unicast deauthentication and action
   frames are encrypted under the TK; broadcast ones carry a BIP MIC under the
   IGTK. WPA3 requires PMF; WPA2 only allows it.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange, Personal | **Default:** SAE on P-256 (group 19)<br>**Longer keys:** P-384 and P-521 (groups 20, 21) under SAE-EXT-KEY (AKM 24) | IEEE 802.11-2024, RFC 7664, WPA3 | PSK (AKM 2, 6): no exchange; refused on 6 GHz |
| Key exchange, other | Enterprise: EAP-TLS or PEAP to a RADIUS server, whose EAP session key becomes the PMK; OWE (unauthenticated ECDH, group 19) for open networks | IEEE 802.1X, RFC 5216, RFC 9190, RFC 8110 | open networks with no encryption |
| Signature | none in Personal (SAE-PK adds an ECDSA key whose fingerprint is in the password); RSA or ECDSA server certificates in EAP | WPA3 v3.0 (SAE-PK), RFC 5216 | — |
| Cipher (AEAD) | CCMP-128 (AES-128-CCM); GCMP-256 for Wi-Fi 7 and 192-bit mode; CCMP-256, GCMP-128 | 802.11i (2004), 802.11ad (2012), 802.11ac (2013) | TKIP (RC4 plus Michael), WEP (RC4) |
| MAC | **Data:** inside CCMP and GCMP<br>**Handshake (EAPOL-Key MIC):** AES-CMAC (SAE), HMAC-SHA-1-128 (WPA2-PSK), HMAC-SHA-384 (192-bit)<br>**Management frames:** BIP-CMAC-128, BIP-GMAC-256 | 802.11w (2009) | Michael (TKIP), HMAC-MD5 (WPA) |
| Hash | SHA-256; SHA-384 and SHA-512 with SAE-EXT-KEY groups 20, 21 and in 192-bit mode | FIPS 180-4 | SHA-1 (WPA2-PSK), MD5 (WPA) |
| KDF | 802.11 KDF (HMAC-SHA-256 with a counter); HKDF in OWE and in SAE's hash-to-element (H2E) | IEEE 802.11-2024, RFC 5869 | PBKDF2 and the PRF with HMAC-SHA-1 (WPA2-PSK) |

WEP's per-packet IV in front of the [RC4](../04-symmetric-ciphers/Retired.md#rc4)
key fell to Fluhrer, Mantin and Shamir in 2001. On 6 GHz (Wi-Fi 6E and 7)
hostapd allows only SAE, OWE and Enterprise, requires PMF, and turns on H2E,
which maps SSID and password to a point with HKDF and RFC 9380's simplified SWU
map instead of the loop. Wi-Fi 7 also asks for SAE-EXT-KEY, GCMP-256 and beacon
protection. WPA3 v3.4 (2024) added RSN overriding ("WPA3-Personal Compatibility
Mode") to show WPA2 to old clients and WPA3 to new ones; hostapd 2.12 has it.

## Known attacks

| Attack | What goes wrong | Fix |
|---|---|---|
| KRACK (Vanhoef and Piessens, CCS 2017) | a replayed message 3 makes a client reinstall the PTK and reset its PN, so CCMP reuses nonces ([CTR](../05-modes-aead/Classic-Modes.md#ctr)) | never reinstall a key in use; patched clients and APs |
| Dragonblood (Vanhoef and Ronen, 2019) | timing and cache leaks in hunting and pecking; in transition mode a fake WPA2 AP captures a handshake from a WPA3 client | constant-time code, H2E, Transition Disable (WPA3 v3.0, 2020) |
| FragAttacks (Vanhoef, USENIX Security 2021) | flaws in fragmentation and frame aggregation (A-MSDU) let an attacker inject frames, in WPA2 and WPA3 alike | device patches; SPP A-MSDU (hostapd 2.12, off by default) |
| AirSnitch (NDSS 2026) | all clients share the GTK, so any of them can forge broadcast frames to the others, past client isolation | isolation done properly; WPA3 and PMF alone don't help |

## Seeing it on your machine

```
wpa_passphrase IEEE password                     # psk= is the WPA2 PMK for that SSID
wpa_cli -i wlan0 status                          # key_mgmt, ciphers, pmf, sae_group, sae_h2e
wpa_cli -i wlan0 scan_results                    # flags per network, e.g. [WPA2-PSK+SAE-CCMP]
sudo iw dev wlan0 scan dump                      # RSN elements: ciphers, AKMs, MFP bits
sudo wpa_supplicant -dd -K -i wlan1 -c sae.conf  # debug log with every key: test setups only
```

- **Python:** what an attacker computes per guess. Press Enter twice for wlan2
  in the run above; any other passphrase prints `False`.

```python
import hashlib, hmac

passphrase = input("passphrase: ") or "password"
ssid = input("SSID: ") or "IEEE"
pmk = hashlib.pbkdf2_hmac("sha1", passphrase.encode(), ssid.encode(), 4096, 32)
print("PMK", pmk.hex())

# from the run above: MAC addresses, ANonce (message 1), SNonce and MIC (message 2)
aa, spa = bytes.fromhex("020000000000"), bytes.fromhex("020000000200")
anonce = bytes.fromhex("477400533b80b46a2a03c637fae04598fdf03c06b56e01551699960f33aa55b6")
snonce = bytes.fromhex("d34e0d83d9e5997fccd94974c97b5456976b666f6cebf891e20bc00a4460ab2b")
mic = bytes.fromhex("4470e6b894b7255f204ec8a4aeea0a66")
data = min(aa, spa) + max(aa, spa) + min(anonce, snonce) + max(anonce, snonce)
ptk = b"".join(hmac.new(pmk, b"Pairwise key expansion\0" + data + bytes([i]),
                        hashlib.sha1).digest() for i in range(3))[:48]   # 802.11 PRF
for name, key in (("KCK", ptk[:16]), ("KEK", ptk[16:32]), ("TK ", ptk[32:])):
    print(name, key.hex())

# message 2 with its MIC zeroed: header, key info, counter, SNonce, empty fields, RSN element
rsne = bytes.fromhex("30140100000fac040100000fac040100000fac020000")
msg2 = (bytes.fromhex("0103007502010a0000") + (1).to_bytes(8, "big") + snonce
        + bytes(48) + len(rsne).to_bytes(2, "big") + rsne)
print("MIC matches:", hmac.new(ptk[:16], msg2, hashlib.sha1).digest()[:16] == mic)
```

```
PMK f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e
KCK 8202928cfc832489a01fdcd187cb905b
KEK 4700ff26dddb728587a906b1c4708fa0
TK  797bf41d264da28238525af437b6c353
MIC matches: True
```

The PMK is IEEE 802.11 Annex J's first pass-phrase test vector (also in hostap's
`crypto_module_tests.c`). The keys and MIC match wpa_supplicant's log for wlan2.

## See also

- [PAKE](../01-key-exchange/PAKE.md): SAE next to SPAKE2, CPace and OPAQUE
- [WireGuard](WireGuard.md) / [IPsec](IPsec.md) / [TLS 1.3](TLS-1.3.md): protection past the access point; TLS also runs inside EAP-TLS
- [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) / [AEAD](../05-modes-aead/AEAD.md) / [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md): the algorithms in depth

## References

- [IEEE 802.11 Working Group](https://www.ieee802.org/11/) (IEEE Std 802.11-2024) / [IEEE 802.11w-2009](https://standards.ieee.org/ieee/802.11w/3736/) / [Wi-Fi Alliance, WPA3 Specification v3.5](https://www.wi-fi.org/system/files/WPA3%20Specification%20v3.5.pdf)
- [RFC 7664: Dragonfly](https://www.rfc-editor.org/rfc/rfc7664) (Section 3.2) / [RFC 8110: OWE](https://www.rfc-editor.org/rfc/rfc8110) / [RFC 9380: Hashing to Elliptic Curves](https://www.rfc-editor.org/rfc/rfc9380) / [RFC 8018: PBKDF2](https://www.rfc-editor.org/rfc/rfc8018) / [RFC 5216](https://www.rfc-editor.org/rfc/rfc5216) and [RFC 9190](https://www.rfc-editor.org/rfc/rfc9190): EAP-TLS
- [hostap source](https://w1.fi/cgit/hostap/): `src/common/wpa_common.h` and `wpa_common.c` (selectors, PTK, MIC), `sae.c` and `dragonfly.c` (SAE, H2E), `src/ap/ap_config.c` (6 GHz rules), `hostapd/hostapd.conf`, `hostapd/ChangeLog` / [Linux `mac80211_hwsim`](https://docs.kernel.org/networking/mac80211_hwsim/mac80211_hwsim.html)
- [Vanhoef and Piessens, KRACK (CCS 2017)](https://papers.mathyvanhoef.com/ccs2017.pdf) / [Vanhoef and Ronen, Dragonblood](https://papers.mathyvanhoef.com/dragonblood.pdf) / [Vanhoef, FragAttacks (USENIX Security 2021)](https://papers.mathyvanhoef.com/usenix2021.pdf) / [AirSnitch (NDSS 2026)](https://papers.mathyvanhoef.com/ndss2026-airsnitch.pdf) and [tool](https://github.com/vanhoefm/airsnitch)

*Weaker sources:* search-engine summaries of pages not reachable here: the WPA3
specification's revision history (v1.0 2018, v3.0 2020, v3.4 2024, v3.5 2025),
the IEEE 802.11 WG page (802.11-2024), Cisco
Meraki and HPE Aruba guides (Wi-Fi 7 requirements), Fuchsia's code (Annex J
vector), and press reports of the first WPA2 certifications (September 2004).
