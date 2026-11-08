# 14. OAuth, OpenID Connect and JSON Web Tokens

*"Sign in with Google." "Allow this app to see your calendar?" Behind both
buttons sits OAuth, the protocol that lets one service act for you at another
without ever learning your password, and OpenID Connect, the layer on top that
tells a site who you are. Both carry their results in JSON Web Tokens: short
strings of three base64 parts that anyone can read and only the issuer should
be able to write. This chapter takes the three apart. You will verify the
signature examples of RFC 7515 in three algorithms and re-create one byte for
byte, forge tokens against a verifier that trusts the token's own header,
steal an authorization code and watch PKCE make it worthless, and bind a token
to a key so that stealing the token alone gets an attacker nothing.*

!!! abstract "In this chapter"
    **You will learn:**

    - what OAuth is for (delegation) and what it is not (authentication);
    - the authorization code flow, why the implicit flow died, and PKCE;
    - how OpenID Connect adds identity with the ID token;
    - JWT, JWS, JWE and JWK, checked against RFC 7515's examples;
    - the classic token attacks: `"alg": "none"`, key confusion, psychic
      signatures, and how RFC 8725 prevents them;
    - bearer tokens, token theft, and sender-constrained tokens with DPoP;
    - SAML in brief, and Golden SAML;
    - what a login across a 20-minute light delay needs.

    **You need:** [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md) (how a user
    logs in to one site) and [Chapter 3](03-TLS-1.3-Message-by-Message.md)
    (TLS, which every flow here runs over); HMAC, RSA and ECDSA from Chapters
    [10](../../book/10-Message-Authentication.md),
    [13](../../book/13-RSA.md) and [15](../../book/15-Elliptic-Curves.md) of
    book 1.

    **Levels:** §14.1 and §14.2 are for beginners, §14.3 to §14.10 are
    intermediate, §14.11 is expert.

## 14.1 Delegation, not authentication

*Level: beginner.*

Around 2006, websites that wanted to import your contacts asked for your email
password. You typed it in, the site logged in to your mail account as you, read
the address book and, you hoped, forgot the password. It could equally have
read your mail, sent mail as you, or kept the password forever. Security people
called this the **password anti-pattern**, and it was everywhere.

OAuth was the answer. A group of developers from Twitter, Ma.gnolia and other
companies wrote OAuth 1.0 in 2007; it became RFC 5849 in 2010. OAuth 2.0, a
complete redesign, followed as RFC 6749 and RFC 6750 in October 2012. The idea
is the same in both: instead of handing over your password, you tell the
service that holds your data to give the other application a **token**, a
string that grants limited access (read the contacts, nothing else), for a
limited time, and that you can revoke without changing your password.

OAuth names four roles:

- the **resource owner**, you;
- the **client**, the application that wants access (a photo printing site, a
  phone app);
- the **authorization server**, which logs you in, asks for your consent and
  issues tokens (Google's or Microsoft's login service, or the city's);
- the **resource server**, the API that holds your data and accepts tokens.

The access token is a **bearer token**: whoever presents it gets the access,
like cash or a cinema ticket. The resource server does not ask who is
presenting it. That makes tokens simple to use and dangerous to lose, a theme
§14.7 returns to.

The most important sentence about OAuth is the one people forget: **OAuth is
about authorization, not authentication.** A token says "the bearer may read
these contacts". It does not say "the bearer is Alice", nor even that Alice is
present right now. Sites that used "I received an access token for Alice's
account" as proof that Alice was logging in to them were fooled in a
well-known way: any other application that Alice had ever authorized, holding
a token for her, could present it to the site and be logged in as her. OpenID
Connect (§14.4) exists to fix exactly that.

## 14.2 The authorization code flow

*Level: beginner.*

OAuth 2.0 defined several **grant types**, ways for a client to obtain a
token. The one that matters most, and the one modern guidance recommends for
almost everything, is the **authorization code** grant (Figure 14.1).

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="The OAuth authorization code flow with PKCE: the client sends the browser to the authorization server with a code challenge; the user logs in and consents; the browser brings back a code; the client exchanges code and verifier for tokens on a direct channel; then calls the API" fill="currentColor" font-size="13">
<rect x="10" y="20" width="110" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="65" y="45" text-anchor="middle">browser</text>
<rect x="175" y="20" width="120" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="235" y="45" text-anchor="middle">client app</text>
<rect x="345" y="20" width="140" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="415" y="45" text-anchor="middle">authorization server</text>
<rect x="525" y="20" width="105" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="577" y="45" text-anchor="middle">API</text>
<g stroke="currentColor" stroke-dasharray="4 4" opacity="0.5">
<line x1="65" y1="60" x2="65" y2="340"/><line x1="235" y1="60" x2="235" y2="340"/>
<line x1="415" y1="60" x2="415" y2="340"/><line x1="577" y1="60" x2="577" y2="340"/>
</g>
<line x1="235" y1="90" x2="69" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="67,90 79,85 79,95"/>
<text x="150" y="84" text-anchor="middle" font-size="11.5">1 redirect: client_id, scope,</text>
<text x="150" y="106" text-anchor="middle" font-size="11.5">state, code_challenge</text>
<line x1="65" y1="134" x2="411" y2="134" stroke="currentColor" stroke-width="1.5"/><polygon points="413,134 401,129 401,139"/>
<text x="320" y="128" text-anchor="middle" font-size="11.5">2 the same request</text>
<text x="424" y="150" font-size="11.5">3 log in (passkey)</text>
<text x="424" y="164" font-size="11.5">and consent</text>
<line x1="415" y1="176" x2="69" y2="176" stroke="currentColor" stroke-width="1.5"/><polygon points="67,176 79,171 79,181"/>
<text x="240" y="170" text-anchor="middle" font-size="11.5">4 redirect to redirect_uri: code, state</text>
<line x1="65" y1="204" x2="231" y2="204" stroke="currentColor" stroke-width="1.5"/><polygon points="233,204 221,199 221,209"/>
<text x="150" y="198" text-anchor="middle" font-size="11.5">5 code, state</text>
<line x1="235" y1="240" x2="411" y2="240" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="413,240 401,235 401,245" class="acc-fill"/>
<text x="325" y="234" text-anchor="middle" font-size="11.5" class="acc-fill">6 code + code_verifier</text>
<line x1="415" y1="268" x2="239" y2="268" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="237,268 249,263 249,273" class="acc-fill"/>
<text x="325" y="262" text-anchor="middle" font-size="11.5" class="acc-fill">7 access, refresh, ID token</text>
<line x1="235" y1="306" x2="573" y2="306" stroke="currentColor" stroke-width="1.5"/><polygon points="575,306 563,301 563,311"/>
<text x="470" y="300" text-anchor="middle" font-size="11.5">8 API call with the access token</text>
<rect x="10" y="352" width="620" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="370" text-anchor="middle" font-size="12">Steps 1 to 5 pass through the browser (front channel): visible, loggable, interceptable.</text>
<text x="320" y="386" text-anchor="middle" font-size="12">Steps 6 and 7 go directly over TLS (back channel). Tokens never touch the address bar.</text>
</svg>
<figcaption>Figure 14.1. The authorization code flow with PKCE. The code is a one-time voucher; only the holder of the verifier can cash it.</figcaption>
</figure>

1. The client sends the browser to the authorization server's
   `/authorize` endpoint with its `client_id`, the **scope** it wants (say
   `contacts.read`), its registered `redirect_uri`, a random `state` value,
   and (§14.3) a `code_challenge`.
2. The authorization server logs the user in, by whatever means it likes (a
   passkey, ideally), and shows a consent screen: "Library App wants to read
   your loans."
3. It redirects the browser back to the `redirect_uri` with a short-lived,
   one-time **authorization code** and the same `state`.
4. The client checks `state` against the value it stored, then sends the code
   to the `/token` endpoint directly, server to server, with its own
   credentials if it has any and the PKCE verifier.
5. The authorization server returns an **access token**, usually valid for
   minutes to an hour, and often a **refresh token**, long-lived, which the
   client can trade for new access tokens without bothering the user.

Each design choice answers a specific attack:

- **Two channels.** The browser redirects (the **front channel**) are visible
  to the user, browser extensions, the history, server logs and the `Referer`
  header of the next page. Only the code passes through them; the tokens come
  back on the **back channel**, a direct TLS connection. A leaked code is
  useless once used, and with PKCE useless to anyone else.
- **Exact redirect URIs.** The authorization server sends codes only to a
  `redirect_uri` registered in advance for that client, compared character
  for character. Early deployments allowed prefixes or wildcards, and
  attackers found open redirects on allowed hosts that forwarded the code to
  them.
- **The `state` parameter.** Without it, an attacker can start a login of
  their own, stop before step 4, and trick the victim's browser into
  completing it, so that the victim's session is linked to the attacker's
  account (a cross-site request forgery on the redirect). `state` ties the
  response to the browser that sent the request.

!!! note "Life story: OAuth 2.0"
    **Born:** October 2012, RFC 6749 (the framework) and RFC 6750 (bearer
    tokens) · **Purpose:** a simpler, more flexible successor to OAuth 1.0,
    without its per-request signatures, relying on TLS instead · **Controversy:**
    its lead editor, Eran Hammer, withdrew from the effort in July 2012 and
    published "OAuth 2.0 and the Road to Hell", arguing that the standard had
    become a framework of options that would make interoperable, secure
    implementations rare · **Helped:** almost every "Sign in with" button and
    third-party API on the web · **Status:** in use everywhere, with a decade of
    patches: PKCE (2015), the Security Best Current Practice (RFC 9700, 2025),
    DPoP (2023), and OAuth 2.1, a draft that folds them into one document

## 14.3 Why the implicit flow died, and PKCE

*Level: intermediate.*

OAuth 2.0 also defined the **implicit** grant, for code running in the
browser: the authorization server put the access token straight into the
redirect, in the URL fragment (`#access_token=...`), skipping the code
exchange. In 2012 browsers could not easily make cross-origin calls to a token
endpoint, so this was the practical choice. It put the token itself on the
front channel, where browser history, extensions and injected scripts could
see it, and gave no way to check that the token was meant for this client.
The OAuth Security Best Current Practice (RFC 9700, 2025) says the implicit
grant should not be used, and OAuth 2.1 removes it, together with the
**password grant**, in which the client simply collected the user's password,
the very anti-pattern OAuth was invented to end.

The second problem was mobile apps. A phone app cannot keep a secret: anyone
can unpack it and read its "client secret". So the token request in step 4 is
authenticated by nothing but the code. And on a phone, the redirect in step 3
is delivered to whichever app registered the URL scheme, such as
`libraryapp://callback`; a malicious app could register the same scheme and
receive the code. Whoever has the code has the token.

**PKCE**, Proof Key for Code Exchange (RFC 7636, 2015, pronounced "pixy"),
fixes this with a hash commitment:

1. Before step 1, the app picks a random **code verifier**, 32 bytes
   base64url-encoded into 43 characters.
2. It sends the **code challenge**, base64url(SHA-256(verifier)), with the
   authorization request. The authorization server stores it with the code.
3. In step 4, the app sends the verifier itself. The server hashes it and
   compares.

An attacker who intercepts the code has seen the challenge at most, and
cannot invert SHA-256 to get the verifier. The program checks RFC 7636's
example and then plays the attack:

```python
# The OAuth authorization code flow, with and without PKCE (RFC 7636), and
# the attack PKCE was made for: a stolen authorization code.
import base64, hashlib, secrets
b64u = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()

# RFC 7636 Appendix B: the code verifier and its S256 challenge.
verifier = b64u(bytes([116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186,
                       22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121]))
challenge = b64u(hashlib.sha256(verifier.encode()).digest())
print("verifier ", verifier)
print("challenge", challenge, challenge == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")

class AuthorizationServer:
    clients = {"library-app": "https://library.arcadia.mars/callback"}
    def __init__(self): self.codes = {}
    def authorize(self, client_id, redirect_uri, user, code_challenge=None):
        if self.clients.get(client_id) != redirect_uri:          # exact match only
            return None, "refused: redirect_uri not registered"
        code = secrets.token_urlsafe(16)
        self.codes[code] = {"client": client_id, "user": user, "challenge": code_challenge}
        return code, "user approved; code sent to " + redirect_uri
    def token(self, client_id, code, code_verifier=None):
        grant = self.codes.pop(code, None)                       # a code works once
        if grant is None or grant["client"] != client_id: return "refused: bad or used code"
        if grant["challenge"] is not None:
            if code_verifier is None or b64u(hashlib.sha256(code_verifier.encode()).digest()) != grant["challenge"]:
                return "refused: PKCE verifier does not match"
        return "access token for " + grant["user"]

AS = AuthorizationServer()
print(AS.authorize("library-app", "https://evil.example/callback", "alice")[1])

# Without PKCE: a malicious app on the phone that registered the same custom
# URL scheme receives the redirect, and with it the code.
code, _ = AS.authorize("library-app", "https://library.arcadia.mars/callback", "alice")
stolen = code
print("no PKCE, attacker redeems stolen code:", AS.token("library-app", stolen))

# With PKCE: the code is useless without the verifier, which never left the app.
code, _ = AS.authorize("library-app", "https://library.arcadia.mars/callback", "alice", challenge)
print("PKCE, attacker redeems stolen code:   ", AS.token("library-app", code, "a-guess"))
code, _ = AS.authorize("library-app", "https://library.arcadia.mars/callback", "alice", challenge)
print("PKCE, the real app:                   ", AS.token("library-app", code, verifier))
print("PKCE, the same code again:            ", AS.token("library-app", code, verifier))
```

```text
verifier  dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
challenge E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM True
refused: redirect_uri not registered
no PKCE, attacker redeems stolen code: access token for alice
PKCE, attacker redeems stolen code:    refused: PKCE verifier does not match
PKCE, the real app:                    access token for alice
PKCE, the same code again:             refused: bad or used code
```

The example verifier, `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`, is also
the HMAC tag in RFC 7515's first example, which appears again in the next
program: the authors of RFC 7636 reused a familiar random-looking string.
PKCE turned out to protect more than mobile apps. It also stops a code leaked
from any front channel being used by someone else, and it stops **code
injection**, where an attacker pushes a stolen code into the victim's own
session. RFC 9700 recommends PKCE for every client, including web servers
that do have secrets, and OAuth 2.1 makes it required.

## 14.4 OpenID Connect: adding identity

*Level: intermediate.*

OpenID Connect (OIDC), published by the OpenID Foundation in 2014, is a thin
layer on OAuth 2.0 that answers the question OAuth does not: who logged in?
The client adds the scope `openid` to its request, and the token response
then contains, beside the access token, an **ID token**: a signed JWT,
addressed to this client, about this login. A decoded ID token:

```
{"alg": "RS256", "kid": "rsa-2026", "typ": "JWT"}
{"iss": "https://login.arcadia.mars",
 "sub": "248289761001",
 "aud": "library-app",
 "exp": 1794200700, "iat": 1794200400, "auth_time": 1794200390,
 "nonce": "n-0S6_WzA2Mj",
 "amr": ["hwk", "user"]}
```

The claims that matter, and what the client must check (OIDC Core §3.1.3.7):

- `iss`: the issuer, exactly the authorization server the client asked;
- `aud`: this client's own ID. An ID token addressed to some other app must be
  refused; this is precisely the check that the "access token as login"
  mistake of §14.1 lacked;
- `exp` and `iat`: the token is current;
- `nonce`: the random value the client put in its request, binding the token
  to this login attempt;
- `sub`: the user's stable identifier at this issuer. Not the email address,
  which can change hands; the pair (`iss`, `sub`) is the identity;
- `amr` and `acr`: how the user authenticated (here a hardware key with user
  verification), so a bank can demand a phishing-resistant method.

OIDC also standardized **discovery**: a JSON document at
`/.well-known/openid-configuration` lists the issuer's endpoints, supported
algorithms and the `jwks_uri`, where its current public keys are published as a
JWK Set. A client fetches the keys, caches them, and verifies ID tokens
locally, with no call to the issuer per login. Keys rotate by adding a new key
with a new `kid` to the set, signing with it, and later removing the old one.

## 14.5 JSON Web Tokens: JWS, JWE and JWK

*Level: intermediate.*

The JOSE family (JSON Object Signing and Encryption) was published as five
RFCs in May 2015: JWS (RFC 7515) for signatures and MACs, JWE (RFC 7516) for
encryption, JWK (RFC 7517) for keys, JWA (RFC 7518) for the algorithm names,
and JWT (RFC 7519), which says how to put claims in them. A JWT in compact
form is three base64url strings joined by dots (Figure 14.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Anatomy of a JWS: base64url header, a dot, base64url claims, a dot, base64url signature computed over the first two parts with the dot" fill="currentColor" font-size="13">
<rect x="20" y="30" width="170" height="54" rx="6" class="soft" stroke="currentColor"/>
<text x="105" y="52" text-anchor="middle" font-weight="bold">header</text>
<text x="105" y="72" text-anchor="middle" font-size="12">{"alg":"RS256","kid":…}</text>
<text x="200" y="64" font-size="20">.</text>
<rect x="215" y="30" width="210" height="54" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="52" text-anchor="middle" font-weight="bold">claims (payload)</text>
<text x="320" y="72" text-anchor="middle" font-size="12">{"iss":…,"sub":…,"aud":…,"exp":…}</text>
<text x="435" y="64" font-size="20">.</text>
<rect x="450" y="30" width="170" height="54" rx="6" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="535" y="52" text-anchor="middle" font-weight="bold">signature</text>
<text x="535" y="72" text-anchor="middle" font-size="12">256 bytes (RS256)</text>
<path d="M20 96 L20 108 L425 108 L425 96" fill="none" stroke="currentColor"/>
<path d="M425 108 C 480 122, 530 120, 535 90" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="535,88 530,100 540,100"/>
<text x="222" y="128" text-anchor="middle" font-size="12">signed exactly as sent: the base64url text of both parts and the dot</text>
<rect x="20" y="150" width="600" height="74" rx="6" class="soft" stroke="currentColor"/>
<text x="40" y="172" font-size="12.5">Anyone can decode the header and claims: a JWS is signed, not secret.</text>
<text x="40" y="194" font-size="12.5">The header comes from the token's maker: never let it pick the key or the algorithm.</text>
<text x="40" y="216" font-size="12.5">A JWE has five parts instead: header . encrypted key . IV . ciphertext . tag.</text>
</svg>
<figcaption>Figure 14.2. A JSON Web Signature in compact form. The signature covers the encoded text, so no JSON canonicalization is needed.</figcaption>
</figure>

The signature is computed over the encoded text, `header.payload`, as it
appears in the token. That is a deliberate escape from a problem that plagued
XML signatures (§14.8): there is no need to agree on a canonical form of the
JSON, because the bytes signed are the bytes sent. The receiver may parse the
JSON however it likes after verifying.

The algorithms (`alg`) fall into three groups:

| `alg` | What it is | Who can create tokens |
|---|---|---|
| `HS256` | HMAC-SHA-256 with a shared key | anyone who can verify |
| `RS256`, `PS256` | RSA PKCS#1 v1.5 or PSS with SHA-256 | only the private key holder |
| `ES256`, `Ed25519` | ECDSA on P-256, or Ed25519 | only the private key holder |

The right column is the important one. With `HS256`, every service that can
check a token can also mint one, so it suits a single service that issues
tokens to itself. Anything shared, such as an OpenID provider's ID tokens,
must use signatures. RS256 is the default in OpenID Connect; ES256 is smaller.

### Code it: three signatures from RFC 7515

RFC 7515's Appendix A signs the same claims (`"iss":"joe"`, an expiry in 2011,
and an `is_root` flag) with HS256, RS256 and ES256, and prints every key. The
program checks all three. For RS256 it also signs again: PKCS#1 v1.5 padding is
deterministic, so our signature must equal the RFC's byte for byte. ECDSA is
not (the RFC's signature used a random nonce), so for ES256 it verifies only,
and checks that the printed private key belongs to the public key.

```python
# JSON Web Signatures three ways, checked against RFC 7515 Appendix A:
# HS256 (A.1), RS256 (A.2, signed again byte for byte) and ES256 (A.3).
import base64, hashlib, hmac, json

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def unb64u(s): return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
def num(s): return int.from_bytes(unb64u(s), "big")

payload_b64 = ("eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFt"
               "cGxlLmNvbS9pc19yb290Ijp0cnVlfQ")

# --- HS256: an HMAC; whoever verifies can also sign ---------------------------
hs_key = unb64u("AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow")
hs_input = "eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9." + payload_b64
tag = b64u(hmac.new(hs_key, hs_input.encode(), hashlib.sha256).digest())
print("HS256 tag:", tag, tag == "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
print("header:", unb64u(hs_input.split(".")[0]), " claims:", json.loads(unb64u(payload_b64)))

# --- RS256: RSASSA-PKCS1-v1_5 with SHA-256 (RFC 8017 section 8.2) ------------
rsa = {"n": num("ofgWCuLjybRlzo0tZWJjNiuSfb4p4fAkd_wWJcyQoTbji9k0l8W26mPddxHmfHQp-Vaw-4qPCJrcS2mJPMEz"
                "P1Pt0Bm4d4QlL-yRT-SFd2lZS-pCgNMsD1W_YpRPEwOWvG6b32690r2jZ47soMZo9wGzjb_7OMg0LOL-bSf6"
                "3kpaSHSXndS5z5rexMdbBYUsLA9e-KXBdQOS-UTo7WTBEMa2R2CapHg665xsmtdVMTBQY4uDZlxvb3qCo5Zw"
                "Kh9kG4LT6_I5IhlJH7aGhyxXFvUK-DWNmoudF8NAco9_h9iaGNj8q2ethFkMLs91kzk2PAcDTW9gb54h4FRW"
                "yuXpoQ"),
       "e": 65537,
       "d": num("Eq5xpGnNCivDflJsRQBXHx1hdR1k6Ulwe2JZD50LpXyWPEAeP88vLNO97IjlA7_GQ5sLKMgvfTeXZx9SE-7Y"
                "wVol2NXOoAJe46sui395IW_GO-pWJ1O0BkTGoVEn2bKVRUCgu-GjBVaYLU6f3l9kJfFNS3E0QbVdxzubSu3M"
                "kqzjkn439X0M_V51gfpRLI9JYanrC4D4qAdGcopV_0ZHHzQlBjudU2QvXt4ehNYTCBr6XCLQUShb1juUO1Zd"
                "iYoFaFQT5Tw8bGUl_x_jTj3ccPDVZFD9pIuhLhBOneufuBiB4cS98l2SR_RQyGWSeWjnczT0QU91p1DhOVRu"
                "OopznQ")}
SHA256_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")   # DER AlgorithmIdentifier
def emsa(msg, k):                                     # 00 01 FF..FF 00 DigestInfo
    t = SHA256_PREFIX + hashlib.sha256(msg).digest()
    return b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t
def rs256_sign(key, msg):
    k = (key["n"].bit_length() + 7) // 8
    return pow(int.from_bytes(emsa(msg, k), "big"), key["d"], key["n"]).to_bytes(k, "big")
def rs256_verify(key, msg, sig):
    k = (key["n"].bit_length() + 7) // 8
    return pow(int.from_bytes(sig, "big"), key["e"], key["n"]).to_bytes(k, "big") == emsa(msg, k)

rs_input = ("eyJhbGciOiJSUzI1NiJ9." + payload_b64).encode()
rs_sig = ("cC4hiUPoj9Eetdgtv3hF80EGrhuB__dzERat0XF9g2VtQgr9PJbu3XOiZj5RZmh7AAuHIm4Bh-0Qc_lF5YKt_O8W2Fp5"
          "jujGbds9uJdbF9CUAr7t1dnZcAcQjbKBYNX4BAynRFdiuB--f_nZLgrnbyTyWzO75vRK5h6xBArLIARNPvkSjtQBMHlb"
          "1L07Qe7K0GarZRmB_eSN9383LcOLn6_dO--xi12jzDwusC-eOkHWEsqtFZESc6BfI7noOPqvhJ1phCnvWh6IeYI2w9QO"
          "YEUipUTI8np6LbgGY9Fs98rqVt5AXLIhWkWywlVmtVrBp0igcN_IoypGlUPQGe77Rw")
print("RS256 verifies:", rs256_verify(rsa, rs_input, unb64u(rs_sig)),
      "  our signature equals the RFC's:", b64u(rs256_sign(rsa, rs_input)) == rs_sig)

# --- ES256: ECDSA on P-256, sent as r || s, 64 bytes, not DER ---------------
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    l = ((3 * P[0] * P[0] - 3) * pow(2 * P[1], -1, p) if P == Q else (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p)) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)
def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R
def es256_verify(Q, msg, sig):
    if len(sig) != 64: return False                   # RFC 7518 section 3.4
    r, s = int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")
    if not (0 < r < n and 0 < s < n): return False
    e, w = int.from_bytes(hashlib.sha256(msg).digest(), "big"), pow(s, -1, n)
    R = add(mul(e * w % n, G), mul(r * w % n, Q))
    return R is not None and R[0] % n == r

ec_pub = (num("f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU"), num("x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0"))
es_input = ("eyJhbGciOiJFUzI1NiJ9." + payload_b64).encode()
es_sig = unb64u("DtEhU3ljbEg8L38VWAfUAqOyKAM6-Xx-F4GawxaepmXFCgfTjDxw5djxLa8ISlSApmWQxfKTUJqPP3-Kg6NU1Q")
print("ES256 verifies:", es256_verify(ec_pub, es_input, es_sig),
      "  key matches d:", mul(num("jpsQnnGQmL-YBIffH1136cspYG6-0iY7X1fCE9-E9LI"), G) == ec_pub)
print("sizes: HS256", len(unb64u(tag)), " RS256", len(unb64u(rs_sig)), " ES256", len(es_sig), "bytes")
```

```text
HS256 tag: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk True
header: b'{"typ":"JWT",\r\n "alg":"HS256"}'  claims: {'iss': 'joe', 'exp': 1300819380, 'http://example.com/is_root': True}
RS256 verifies: True   our signature equals the RFC's: True
ES256 verifies: True   key matches d: True
sizes: HS256 32  RS256 256  ES256 64 bytes
```

Three details in the output. The header of the first example contains a
carriage return and line feed (`\r\n`): the RFC's authors formatted the JSON on
two lines to show that the signature covers bytes, not JSON meaning, and any
reformatting breaks it. ES256 sends the signature as `r` followed by `s`, each
exactly 32 bytes, 64 in all; the DER form used by X.509 and WebAuthn (Chapter
13) is not allowed, and a verifier should refuse any other length. And the
expiry is 22 March 2011: a correct verifier would reject all three tokens,
because checking the signature is only the first check.

**JWE** encrypts. A random **content encryption key** (CEK) encrypts the
payload with an AEAD (`enc`, usually `A256GCM`), with the encoded header as
associated data; the CEK reaches the recipient by one of several `alg` methods:
RSA-OAEP, ECDH-ES with a fresh ephemeral key in the header, AES key wrap under
a shared key, or `dir` (the shared key is the CEK). RFC 7516's own example,
RSA-OAEP with A256GCM, decodes to parts of 256, 12, 63 and 16 bytes: one
2048-bit RSA block holding the CEK, the GCM nonce, the ciphertext of a 63-byte
message and the tag. ID tokens are almost always signed only; JWE is used
where a token passes through parties that should not read it.

**JWK** writes keys as JSON: `{"kty":"EC","crv":"P-256","x":"…","y":"…"}`. A
**JWK thumbprint** (RFC 7638) is the SHA-256 hash of a key's required members
in sorted order without spaces, a stable name for a key, used as a `kid` and,
in §14.7, to bind a token to a key.

## 14.6 Break it: when the token chooses

*Level: intermediate.*

TLS and SSH negotiate algorithms; a token cannot. The issuer writes `alg` into
the header, and the receiver reads it before anything has been verified. In
March 2015 Tim McLean published "Critical vulnerabilities in JSON Web Token
libraries", showing that several popular libraries let that header decide how
the token would be checked. The program shows the two attacks against a naive
verifier and then a strict one.

```python
# Two JWT verifiers. The naive one lets the token's header choose the
# algorithm, as several libraries did until 2015; the strict one binds each key
# to one algorithm (RFC 8725 section 3.1). Continue from above.

def make(header, claims, sign):
    h = b64u(json.dumps(header, separators=(",", ":")).encode())
    c = b64u(json.dumps(claims, separators=(",", ":")).encode())
    return h + "." + c + "." + b64u(sign((h + "." + c).encode()))

# The server publishes its RSA public key, as every OpenID provider does.
published_key = json.dumps({"kty": "RSA", "n": b64u(rsa["n"].to_bytes(256, "big")), "e": "AQAB"}).encode()

def naive_verify(token, key):
    h, c, s = token.split(".")
    alg = json.loads(unb64u(h))["alg"]                      # the token decides
    msg = (h + "." + c).encode()
    if alg == "none": ok = True
    elif alg == "HS256": ok = hmac.compare_digest(hmac.new(key, msg, hashlib.sha256).digest(), unb64u(s))
    elif alg == "RS256": ok = rs256_verify(rsa, msg, unb64u(s))
    else: ok = False
    return json.loads(unb64u(c)) if ok else None

KEYS = {"rsa-2026": ("RS256", rsa)}                         # kid -> (the one alg, the key)
def strict_verify(token, now, audience):
    h, c, s = token.split(".")
    header = json.loads(unb64u(h))
    alg, key = KEYS.get(header.get("kid"), (None, None))
    if alg is None or header.get("alg") != alg: return "refused: alg " + str(header.get("alg"))
    if not rs256_verify(key, (h + "." + c).encode(), unb64u(s)): return "refused: signature"
    claims = json.loads(unb64u(c))
    if claims.get("iss") != "https://login.arcadia.mars": return "refused: issuer"
    if claims.get("aud") != audience: return "refused: audience " + str(claims.get("aud"))
    if not claims.get("nbf", 0) <= now < claims.get("exp", 0): return "refused: expired"
    return "accepted: " + claims["sub"]

now = 1_794_200_400
claims = {"iss": "https://login.arcadia.mars", "sub": "alice", "aud": "library", "exp": now + 300}
good = make({"alg": "RS256", "kid": "rsa-2026"}, claims, lambda m: rs256_sign(rsa, m))
evil = dict(claims, sub="admin")
forged_none = make({"alg": "none", "kid": "rsa-2026"}, evil, lambda m: b"")
forged_hs = make({"alg": "HS256", "kid": "rsa-2026"}, evil,
                 lambda m: hmac.new(published_key, m, hashlib.sha256).digest())   # public key as HMAC secret

print("naive,  real token:     ", naive_verify(good, published_key)["sub"])
print("naive,  alg none:       ", naive_verify(forged_none, published_key)["sub"])
print("naive,  RS256 -> HS256: ", naive_verify(forged_hs, published_key)["sub"])
print("strict, real token:     ", strict_verify(good, now, "library"))
print("strict, alg none:       ", strict_verify(forged_none, now, "library"))
print("strict, RS256 -> HS256: ", strict_verify(forged_hs, now, "library"))
print("strict, wrong audience: ", strict_verify(good, now, "clinic"))
print("strict, an hour later:  ", strict_verify(good, now + 3600, "library"))
```

```text
naive,  real token:      alice
naive,  alg none:        admin
naive,  RS256 -> HS256:  admin
strict, real token:      accepted: alice
strict, alg none:        refused: alg none
strict, RS256 -> HS256:  refused: alg HS256
strict, wrong audience:  refused: audience library
strict, an hour later:   refused: expired
```

**`"alg": "none"`.** JWS defines an algorithm `none`, an "unsecured JWS" with
an empty signature, meant for contexts where integrity is provided by other
means. A library that honors whatever `alg` the token names will accept an
unsigned token from anyone. Blocklists fail in subtle ways: a library that
refused the exact string `none` but matched algorithm names without regard to
case let `noNE` through.

**Key confusion, RS256 to HS256.** The server verifies RS256 tokens with its
RSA public key. A naive library's `verify(token, key)` does whatever the
header says. The attacker writes `"alg": "HS256"` and computes an HMAC using
the server's public key, which is public, as the HMAC secret. The library
reads HS256, uses the "key" it was given as an HMAC key, and the tag matches.
This was CVE-2015-9235 in the popular Node.js `jsonwebtoken` library and
appeared in many others.

The strict verifier refuses both because of one design rule from RFC 8725
(JWT Best Current Practices, 2020) §3.1: **each key is used with exactly one
algorithm, chosen by the verifier.** The `kid` in the header only selects a
key from the verifier's own list; the `alg` must then match that key's
algorithm. After the signature, the claims: issuer, audience, time window.
The last two lines of the output show a valid signature refused for the wrong
audience and after expiry.

Other attacks from the same family:

- **Psychic signatures.** In April 2022 Neil Madden found that Java 15 to 18's
  ECDSA verifier accepted a signature with r = 0 and s = 0 for any message and
  any key (CVE-2022-21449). Every ES256 JWT, and every WebAuthn assertion,
  checked by those Java versions could be forged with 64 zero bytes. The
  `0 < r < n and 0 < s < n` line in `es256_verify` is the check Java had
  dropped when its ECDSA code was rewritten.
- **Weak HMAC secrets.** One captured HS256 token lets an attacker test
  secrets offline, as in Chapter 11. Tools that crack JWT secrets from word
  lists find `secret`, `changeme` and the framework's example key in real
  deployments. RFC 7518 requires an HMAC key at least as long as the hash
  output.
- **Keys from the header.** The headers `jku` and `x5u` give a URL for the key,
  and `jwk` and `x5c` embed one. A verifier that fetches or uses them lets the
  attacker supply the key that checks the attacker's signature. A verifier
  must use only keys it already trusts. A `kid` used unescaped in a file path
  or database query has also led to path traversal and SQL injection.
- **Invalid curve points.** A JWE with ECDH-ES carries the sender's ephemeral
  public key in the header. A library that does not check that the point is on
  the curve can be made to leak its private key, a few bits per message
  (Antonio Sanso found this in several JOSE libraries in 2017).
- **RSA1_5.** JWE's `RSA1_5` key transport uses PKCS#1 v1.5 encryption, which
  is open to Bleichenbacher's padding-oracle attack (Chapter 4). RFC 8725 says
  not to use it.

### Fix it

RFC 8725's rules, short form: an allowlist of algorithms per key; never
`none` unless explicitly expected; validate every cryptographic input (point
on curve, signature length); check `iss`, `aud`, `exp` and `nbf` every time;
use the `typ` header (`at+jwt`, `dpop+jwt`) so that one kind of token cannot
be substituted for another; and keep HMAC keys long and random.

## 14.7 Stolen tokens and sender-constrained tokens

*Level: intermediate.*

A bearer token works for whoever holds it, so most real OAuth incidents are
token thefts, not cryptographic breaks:

- In September 2018 Facebook disclosed that a bug in its "View As" feature had
  let attackers obtain access tokens for almost 30 million accounts.
- In April 2022 attackers used OAuth tokens stolen from Heroku and Travis CI,
  two services that GitHub users had authorized, to download private
  repositories from dozens of organizations.
- Malware that steals browser data takes refresh tokens and session cookies
  along with passwords, and these work even when the user's login is protected
  by a passkey (Chapter 13).

!!! note "Life story: Storm-0558's forged tokens"
    **When:** discovered in June 2023 · **What happened:** an attacker
    group Microsoft calls Storm-0558 obtained a signing key Microsoft used for
    consumer accounts, created in 2016, and used it to forge access tokens for
    the enterprise mail of about 25 organizations, including US government
    agencies · **Why it worked:** the key should have been accepted only for
    consumer accounts, but a validation flaw let enterprise systems accept
    tokens signed with it; the issuer and the key were not tied together
    tightly enough · **Lesson:** a token-signing key is the master key of every
    service that accepts its tokens, the golden ticket of Chapter 12 in JSON
    form, and a verifier must check which keys may sign for which issuer · **Aftermath:**
    the US Cyber Safety Review Board's report (April 2024) called the intrusion
    preventable and criticized Microsoft's security culture

The answer to theft is a **sender-constrained** token: one that works only
for a client that can prove possession of a private key, which does not leave
the client. Two standards do this:

- **Mutual TLS** (RFC 8705, 2020): the client authenticates to the
  authorization server with a TLS client certificate, the token records the
  certificate's hash (`cnf.x5t#S256`), and the resource server accepts the
  token only over a TLS connection authenticated with that certificate. Strong
  and simple between servers; awkward in browsers and phones.
- **DPoP**, Demonstrating Proof of Possession (RFC 9449, 2023): the client
  makes a key pair; with each request it sends a small signed JWT, the
  **DPoP proof**, naming the HTTP method and URL, the time, a unique `jti`, and
  the hash of the access token, with its public key in the header. The
  authorization server puts the thumbprint of that key in the token
  (`cnf.jkt`), and the resource server checks that the proof was signed by
  that key.

The program checks RFC 7638's thumbprint example, then runs DPoP and the three
attacks it stops:

```python
# Sender-constrained tokens with DPoP (RFC 9449): the access token names a key
# by its JWK thumbprint (RFC 7638), and every request carries a fresh proof
# signed by that key. A stolen token alone is useless. Continue from above.
import secrets

def thumbprint(jwk):                                  # required members, sorted, no spaces
    req = {"RSA": ("e", "kty", "n"), "EC": ("crv", "kty", "x", "y")}[jwk["kty"]]
    canon = json.dumps({k: jwk[k] for k in req}, separators=(",", ":"), sort_keys=True)
    return b64u(hashlib.sha256(canon.encode()).digest())

rfc7638_key = {"kty": "RSA", "e": "AQAB", "alg": "RS256", "kid": "2011-04-29",
    "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECP"
         "ebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY"
         "368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0f"
         "M4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw"}
print("RFC 7638 thumbprint:", thumbprint(rfc7638_key), thumbprint(rfc7638_key) == "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs")

def es256_sign(d, msg):
    e = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    while True:
        k = secrets.randbelow(n - 1) + 1
        r = mul(k, G)[0] % n
        s = pow(k, -1, n) * (e + r * d) % n
        if r and s: return r.to_bytes(32, "big") + s.to_bytes(32, "big")

def new_key():
    d = secrets.randbelow(n - 1) + 1
    x, y = mul(d, G)
    return d, {"kty": "EC", "crv": "P-256", "x": b64u(x.to_bytes(32, "big")), "y": b64u(y.to_bytes(32, "big"))}

def dpop_proof(d, jwk, method, url, token, now):
    header = b64u(json.dumps({"typ": "dpop+jwt", "alg": "ES256", "jwk": jwk}).encode())
    claims = b64u(json.dumps({"jti": secrets.token_urlsafe(12), "htm": method, "htu": url, "iat": now,
                              "ath": b64u(hashlib.sha256(token.encode()).digest())}).encode())
    return header + "." + claims + "." + b64u(es256_sign(d, (header + "." + claims).encode()))

seen_jti = set()
def resource_server(token_claims, token, proof, method, url, now):
    h, c, s = proof.split(".")
    header, claims = json.loads(unb64u(h)), json.loads(unb64u(c))
    jwk = header["jwk"]
    if header.get("typ") != "dpop+jwt" or header.get("alg") != "ES256": return "refused: proof type"
    if not es256_verify((num(jwk["x"]), num(jwk["y"])), (h + "." + c).encode(), unb64u(s)):
        return "refused: proof signature"
    if thumbprint(jwk) != token_claims["cnf"]["jkt"]: return "refused: token bound to another key"
    if (claims["htm"], claims["htu"]) != (method, url): return "refused: proof for another request"
    if abs(claims["iat"] - now) > 60 or claims["jti"] in seen_jti: return "refused: stale or replayed proof"
    if claims["ath"] != b64u(hashlib.sha256(token.encode()).digest()): return "refused: proof for another token"
    seen_jti.add(claims["jti"])
    return "200 OK for " + token_claims["sub"]

now, url = 1_794_200_400, "https://library.arcadia.mars/api/loans"
d_app, jwk_app = new_key()
token_claims = {"sub": "alice", "cnf": {"jkt": thumbprint(jwk_app)}}  # issued after a DPoP token request
token = "opaque-access-token-" + thumbprint(jwk_app)[:8]

proof = dpop_proof(d_app, jwk_app, "GET", url, token, now)
print("the app:                    ", resource_server(token_claims, token, proof, "GET", url, now))
print("same proof replayed:        ", resource_server(token_claims, token, proof, "GET", url, now + 5))
d_thief, jwk_thief = new_key()                                         # stole the token, not the key
print("thief with the token:       ", resource_server(token_claims, token,
      dpop_proof(d_thief, jwk_thief, "GET", url, token, now), "GET", url, now))
print("proof used on another URL:  ", resource_server(token_claims, token,
      dpop_proof(d_app, jwk_app, "GET", url, token, now), "DELETE", url, now))
```

```text
RFC 7638 thumbprint: NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs True
the app:                     200 OK for alice
same proof replayed:         refused: stale or replayed proof
thief with the token:        refused: token bound to another key
proof used on another URL:   refused: proof for another request
```

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A bearer token works for anyone who holds it; a DPoP-bound token works only with a fresh proof signed by the key whose thumbprint is inside the token" fill="currentColor" font-size="13">
<rect x="20" y="20" width="285" height="190" rx="8" class="soft" stroke="currentColor"/>
<text x="162" y="44" text-anchor="middle" font-weight="bold">bearer token</text>
<text x="40" y="74" font-size="12.5">Authorization: Bearer eyJ…</text>
<text x="40" y="104" font-size="12.5">the API checks: signed by the issuer,</text>
<text x="40" y="122" font-size="12.5">not expired, right audience</text>
<text x="40" y="160" font-size="12.5" class="acc-fill">a copy in a log, a proxy or malware</text>
<text x="40" y="178" font-size="12.5" class="acc-fill">works exactly as well as the original</text>
<rect x="335" y="20" width="285" height="190" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="477" y="44" text-anchor="middle" font-weight="bold">DPoP-bound token</text>
<text x="355" y="74" font-size="12.5">Authorization: DPoP eyJ…</text>
<text x="355" y="92" font-size="12.5">DPoP: proof signed by the client key</text>
<text x="355" y="122" font-size="12.5">the API also checks: thumbprint(key)</text>
<text x="355" y="140" font-size="12.5">= cnf.jkt, method, URL, time, jti</text>
<text x="355" y="178" font-size="12.5">a copied token is useless without the key</text>
</svg>
<figcaption>Figure 14.3. Bearer and sender-constrained tokens. DPoP adds one signature per request.</figcaption>
</figure>

DPoP limits the damage of a stolen token; it does not stop malware running on
the client device itself, which can ask the client to sign proofs. Keeping the
private key in hardware (a phone's secure element or a TPM, marked
non-exportable) narrows that to the time the malware is running. Refresh
tokens, the most valuable thing a client holds, should be sender-constrained
or, for public clients, **rotated**: each use returns a new refresh token and
invalidates the old, so a stolen copy is detected the moment both copies are
used.

## 14.8 SAML in brief

*Level: intermediate.*

Before OpenID Connect, enterprise single sign-on on the web meant **SAML 2.0**
(Security Assertion Markup Language, OASIS, 2005), and in companies and
universities it still often does. The shape is the same: the identity provider
logs the user in and sends the service provider a signed **assertion**, an XML
document saying who the user is and when it expires, carried by the browser in
an HTML form post.

SAML's cryptography is XML Signature, and XML Signature's problem is that XML
can be rearranged. The signature covers an element identified by an ID; the
application then reads the document. If the code that checks the signature and
the code that reads the user name look at different elements, an attacker can
wrap a signed assertion inside a document that also contains an unsigned one
with a different name. Juraj Somorovsky and colleagues showed in 2012 ("On
Breaking SAML: Be Whoever You Want to Be") that 11 of 14 SAML frameworks they
tested fell to such **signature wrapping** attacks. JWS avoids the whole class
by signing the exact bytes, as §14.5 noted.

**Golden SAML**, named by CyberArk researchers in 2017, is the SAML form of the
golden ticket: whoever steals the identity provider's signing key can create
assertions for any user at every service that trusts it, and no login ever
happens at the identity provider. The attackers behind the SolarWinds
intrusion, discovered in December 2020, used it to reach cloud email.

## 14.9 Mars: logging in across the gap

*Level: intermediate.*

Arcadia City's residents use apps from both planets. Some are local, some are
Earth services (a university archive, a bank, a journal). OAuth and OpenID
Connect were built for a world where every redirect takes milliseconds.

**Redirects to Earth are impossible to use.** The authorization code flow
needs the browser to visit the authorization server and come back. With an
Earth authorization server, steps 2 to 4 of Figure 14.1 take at least one
light round trip, 6 to 44 minutes, and the code exchange another. The city's
answer is federation: residents log in to the city's own OpenID provider,
`login.arcadia.mars`, and Earth services that serve Mars residents accept its
ID tokens. Trust is configured once, by copying the city's JWK Set to the
Earth services and theirs to Mars, rather than looked up per login.

**Tokens are checked locally.** A self-contained JWT access token (RFC 9068)
can be verified with a cached public key and no network call, unlike an opaque
token that the resource server must look up by **introspection** at the
authorization server. Across 20 light minutes, only the first is usable. The
cost is revocation: a Mars service cannot ask Earth "is this token still
good?" in time, so tokens are short-lived, about an hour, and refresh tokens
are rotated.

**Asynchronous consent.** For the few cases where an Earth service must ask a
Mars resident for permission, a redirect is the wrong tool. OpenID's
Client-Initiated Backchannel Authentication (CIBA) lets the service ask the
user's own provider to get approval out of band, and wait. The waiting is
the point: the request arrives on the resident's phone, they approve it with
their passkey, and the answer travels back to Earth on its own schedule.

**Clocks matter again.** `exp`, `nbf` and `iat` are timestamps, and DPoP proofs
are accepted only within a short window. Like Kerberos in Chapter 12, a proof
created on Mars and checked on Earth arrives minutes late however good the
clocks are. For Mars-to-Earth calls the city's services accept DPoP proofs
within a window of the largest light time plus a few minutes, and keep their
record of used `jti` values that much longer: the same trade-off as Kerberos
authenticators, a larger replay cache in exchange for no extra round trip.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Federation between Mars and Earth: residents log in to the Mars OpenID provider; Earth services verify its ID tokens with a JWK Set copied in advance, without contacting Mars per login" fill="currentColor" font-size="13">
<rect x="20" y="20" width="280" height="190" rx="8" class="soft" stroke="currentColor"/>
<text x="160" y="44" text-anchor="middle" font-weight="bold">Mars</text>
<rect x="40" y="60" width="110" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="95" y="87" text-anchor="middle">resident</text>
<rect x="170" y="60" width="115" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="227" y="80" text-anchor="middle" font-size="12">login.arcadia</text>
<text x="227" y="96" text-anchor="middle" font-size="12">.mars (OIDC)</text>
<line x1="150" y1="82" x2="170" y2="82" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="134" text-anchor="middle" font-size="12">1 passkey login, milliseconds</text>
<text x="160" y="152" text-anchor="middle" font-size="12">2 ID token and access token</text>
<rect x="340" y="20" width="280" height="190" rx="8" class="soft" stroke="currentColor"/>
<text x="480" y="44" text-anchor="middle" font-weight="bold">Earth</text>
<rect x="400" y="60" width="160" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="480" y="80" text-anchor="middle" font-size="12">university archive</text>
<text x="480" y="96" text-anchor="middle" font-size="12">holds Mars's JWK Set</text>
<line x1="285" y1="82" x2="396" y2="82" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/><polygon points="398,82 386,77 386,87" class="acc-fill"/>
<text x="480" y="128" text-anchor="middle" font-size="12" class="acc-fill">3 request with token,</text>
<text x="480" y="144" text-anchor="middle" font-size="12" class="acc-fill">3 to 22 minutes later</text>
<text x="480" y="170" text-anchor="middle" font-size="12">verifies the signature locally;</text>
<text x="480" y="188" text-anchor="middle" font-size="12">no call back to Mars</text>
</svg>
<figcaption>Figure 14.4. Federation across the gap. Keys are exchanged ahead of time; each login stays on its own planet.</figcaption>
</figure>

## 14.10 In the real world

*Level: intermediate.*

Real tokens from the RFCs, checked with the `jose` command-line tool (latchset's
C tool, Ubuntu 24.04 package):

```
$ cut -d. -f1 rfc7519.jwt | jose b64 dec -i-
{"typ":"JWT",
 "alg":"HS256"}
$ jose jws ver -i rfc7519.jwt -k rfc7515-a1.jwk -O-
{"iss":"joe",
 "exp":1300819380,
 "http://example.com/is_root":true}
$ cut -d. -f1 rfc7516-a1.jwe | jose b64 dec -i-
{"alg":"RSA-OAEP","enc":"A256GCM"}
$ jose jwe dec -i rfc7516-a1.jwe -k rfc7516-a1.jwk
The true sign of intelligence is not knowledge but imagination.
```

To make and check your own:

```
jose jwk gen -i '{"alg":"ES256"}' -o ec.jwk    # new P-256 key pair as a JWK
jose jwk pub -i ec.jwk -o ec.pub.jwk           # public half, for verifiers
printf '{"sub":"alice"}' | jose jws sig -I- -k ec.jwk -c -o es256.jwt
jose jws ver -i es256.jwt -k ec.pub.jwk -O-    # prints the payload if it verifies
jose jwk thp -i ec.pub.jwk                     # RFC 7638 thumbprint, a good kid
```

Any OpenID provider shows its configuration at a well-known URL; for example
`https://accounts.google.com/.well-known/openid-configuration` lists Google's
endpoints, its `jwks_uri` and `"id_token_signing_alg_values_supported":
["RS256"]`.

Where the pieces are standardized:

| Piece | Standard |
|---|---|
| OAuth 2.0 framework and bearer tokens | RFC 6749, RFC 6750 (2012) |
| PKCE | RFC 7636 (2015) |
| JOSE and JWT | RFC 7515 to 7519 (2015), best practices RFC 8725 (2020) |
| JWT access tokens | RFC 9068 (2021) |
| Mutual TLS tokens, DPoP | RFC 8705 (2020), RFC 9449 (2023) |
| Security Best Current Practice | RFC 9700 (2025) |
| OpenID Connect Core and Discovery | OpenID Foundation (2014) |
| OAuth 2.1 | IETF draft |

A checklist for an application, condensed from RFC 9700:

- Authorization code flow with PKCE (S256) for every client; no implicit or
  password grants.
- Exact redirect URI matching; `state` or PKCE against CSRF; `nonce` for
  OpenID Connect.
- For an ID token, check `iss`, `aud`, `exp`, `nonce` and the signature with a
  key from the issuer's JWK Set and its expected algorithm.
- Short-lived access tokens, narrow scopes, sender-constrained where possible;
  rotated or sender-constrained refresh tokens.
- Tokens never in URLs, never in logs; in browsers, keep them out of reach of
  page scripts where the architecture allows (a backend that holds tokens and
  gives the browser only a session cookie).

## 14.11 Going deeper

*Level: expert.*

**Formal analysis finds real attacks.** Daniel Fett, Ralf Küsters and Guido
Schmitz built a formal model of the web, browsers, redirects and all, and used
it to analyze OAuth 2.0 (ACM CCS 2016). They found new attacks against the
standard itself, not only implementations. In the **mix-up attack**, a client
that works with several authorization servers can be tricked by a malicious
one into sending it a code or token that an honest server issued. The fix
is for the authorization server to name itself in the response (the `iss`
parameter, RFC 9207, 2022). They also showed that a 307 redirect makes the
browser re-post the user's password form to the client. Their model then
proved the patched protocol secure, and the same method was used for the
OpenID Foundation's **FAPI 2.0** profile, written for open banking, which
requires PKCE, sender-constrained tokens and pushed authorization requests
(RFC 9126), where the client posts its request to the server directly instead
of putting it in the browser's URL.

**GNAP.** The IETF's Grant Negotiation and Authorization Protocol (RFC 9635,
2024) is a clean-sheet successor that starts from the lessons above: every
request is bound to a client key from the start, there are no bearer tokens by
default, and interaction (a redirect, a code typed on another device, an
asynchronous approval) is negotiated rather than fixed. It is not widely
deployed; OAuth's installed base is enormous.

**Selective disclosure and wallets.** A JWT shows all its claims to everyone
who sees it. SD-JWT, an IETF specification used by the European digital
identity wallet, has the issuer sign salted hashes of each claim instead, so the
holder can reveal only some claims (age over 18, not the birth date) and the
verifier can still check the signature. It is the first step toward the
anonymous credentials of the Advanced protocols book.

**Post-quantum tokens.** Every signature in this chapter falls to a quantum
computer. RFC 9964 (2026) defines ML-DSA for JOSE, with a new key type `AKP`.
Size is the obstacle once again: an ML-DSA-44 signature is 2,420 bytes, 3,227
base64url characters, against 86 for ES256, and it travels in every request
that carries the token. Since tokens live for minutes and keys rotate through
a JWK Set, the switch can happen without users noticing; the harder part is
the HTTP header size limits of proxies and servers. The Post-quantum book
covers the migration.

## Check yourself

??? question "1. Why is \"OAuth is about authorization, not authentication\" more than a slogan?"
    An access token says the bearer may access some resource, not who the
    bearer is or that the user is present. A site that accepted any access
    token for Alice as a login could be logged in to by every other app Alice
    had authorized. OpenID Connect's ID token, with its audience check, fixes
    that.

??? question "2. Why does the authorization code flow return a code instead of the token?"
    The redirect passes through the browser (front channel), where URLs leak.
    A short-lived, one-time code is exchanged for tokens on a direct TLS
    connection (back channel), so the tokens never appear in the browser.

??? question "3. What attack does the `state` parameter prevent?"
    Cross-site request forgery on the redirect: an attacker making the victim's
    browser complete the attacker's own authorization, linking the victim's
    session to the attacker's account.

??? question "4. How does PKCE stop a stolen authorization code from being used?"
    The token request must include the code verifier whose SHA-256 hash was
    sent as the challenge. The attacker saw at most the challenge and cannot
    invert the hash.

??? question "5. Which ID token claims must a client check, and why `aud` in particular?"
    `iss`, `aud`, `exp` (and `iat`), `nonce` and the signature. `aud` makes
    sure the token was issued to this client, not to some other app that could
    replay it.

??? question "6. Explain the RS256-to-HS256 key confusion attack."
    The attacker changes `alg` to HS256 and computes an HMAC with the server's
    public RSA key as the secret. A library that follows the header uses the
    public key as an HMAC key and accepts the forgery. The fix is to bind each
    key to one algorithm chosen by the verifier.

??? question "7. Why does JWS sign the base64url text rather than the JSON?"
    So that no canonical JSON form is needed: the bytes verified are the bytes
    sent. XML Signature's need for canonicalization and element references is
    what made signature wrapping attacks on SAML possible.

??? question "8. What did CVE-2022-21449 allow, and which check prevents it?"
    Java 15 to 18 accepted ECDSA signatures with r = s = 0 for any message and
    key, so any ES256 token could be forged. Checking 0 < r < n and 0 < s < n
    prevents it.

??? question "9. How does DPoP make a stolen access token useless?"
    The token contains the thumbprint of the client's public key; each request
    needs a fresh proof signed by the matching private key, naming the method,
    URL, time, a unique ID and the token's hash. A thief without the key cannot
    produce one.

??? question "10. Why can't Mars residents use an Earth authorization server for ordinary logins?"
    The code flow needs browser redirects to the authorization server and back,
    each a light round trip of 6 to 44 minutes. Federation, with keys
    exchanged in advance and tokens verified locally, keeps each login on one
    planet.

## What you learned

- OAuth delegates limited, revocable access with tokens instead of passwords;
  OpenID Connect adds a signed ID token that says who logged in, to which
  client.
- The authorization code flow keeps tokens off the front channel; exact
  redirect URIs, `state` and PKCE close its known holes. The implicit and
  password grants are retired.
- A JWS is header, payload and signature over their encoded text; JWE wraps a
  random content key; JWK writes keys in JSON. You checked RFC 7515's HS256,
  RS256 and ES256 examples and reproduced the RS256 signature.
- Token attacks come from letting the token choose: `none`, key confusion,
  keys from headers. The verifier must pick key and algorithm, and check
  issuer, audience and time.
- Bearer tokens are stolen more often than broken; DPoP and mutual TLS bind
  them to a client key. A token-signing key is a golden ticket.
- SAML's XML signatures fell to wrapping attacks; Golden SAML is key theft.
- Across planets: federate, verify locally, keep tokens short-lived, and ask
  for consent asynchronously.

## Further reading

- RFC 6749 and RFC 6750, *The OAuth 2.0 Authorization Framework* and *Bearer
  Token Usage*, 2012.
- RFC 9700, *Best Current Practice for OAuth 2.0 Security*, 2025: the single
  most useful document in this chapter.
- RFC 7636 (PKCE), RFC 9449 (DPoP), RFC 8705 (mutual TLS), RFC 9207
  (authorization server issuer identification).
- RFC 7515 to RFC 7519 (JOSE and JWT), RFC 7638 (thumbprints) and RFC 8725 (JWT
  Best Current Practices).
- OpenID Foundation, *OpenID Connect Core 1.0*, section 3.1.3.7 (ID token
  validation).
- Tim McLean, "Critical vulnerabilities in JSON Web Token libraries", 2015.
- Daniel Fett, Ralf Küsters and Guido Schmitz, "A Comprehensive Formal
  Security Analysis of OAuth 2.0", ACM CCS 2016.
- Juraj Somorovsky, Andreas Mayer, Jörg Schwenk, Marco Kampmann and Meiko
  Jensen, "On Breaking SAML: Be Whoever You Want to Be", USENIX Security 2012.
- Cyber Safety Review Board, *Review of the Summer 2023 Microsoft Exchange
  Online Intrusion*, April 2024.
- Eran Hammer, "OAuth 2.0 and the Road to Hell", 2012.
