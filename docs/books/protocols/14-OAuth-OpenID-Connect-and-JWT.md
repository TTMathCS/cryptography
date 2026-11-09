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
    - a full ID-token check, with `at_hash` by hand;
    - bearer tokens, token theft, and sender-constrained tokens with DPoP,
      checked on RFC 9449's own proofs;
    - PAR, RAR, token exchange, refresh-token rotation and OAuth 2.1;
    - SAML in brief, and Golden SAML;
    - what a login across a 20-minute light delay needs.

    **You need:** [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md) (how a user
    logs in to one site) and [Chapter 3](03-TLS-1.3-Message-by-Message.md)
    (TLS, which every flow here runs over); HMAC, RSA and ECDSA from Chapters
    [10](../../book/10-Message-Authentication.md),
    [13](../../book/13-RSA.md) and [15](../../book/15-Elliptic-Curves.md) of
    book 1.

    **Levels:** §14.1 and §14.2 are for beginners, §14.3 to §14.13 are
    intermediate, §14.14 is expert.

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

### Discovery, field by field

Discovery lets a client be configured with one string, the issuer URL. The
client appends `/.well-known/openid-configuration`, fetches the document over
TLS and reads (OpenID Connect Discovery 1.0, §3):

- `issuer`, which must be exactly the URL the client started from, character
  for character, and the string every ID token must carry in `iss`, so one
  provider's document cannot vouch for another's tokens;
- `authorization_endpoint` and `token_endpoint`, the two addresses of
  Figure 14.1;
- `jwks_uri`, the address of the key set;
- `id_token_signing_alg_values_supported`, which must include `RS256`;
- `subject_types_supported`: with **pairwise** subjects each client gets a
  different `sub` for the same person (for example a salted hash of the
  client's host and the account), so two sites cannot join their records.

All of it is only as good as the TLS connection that fetched it: whoever can
answer for `login.arcadia.mars` with a valid certificate can publish keys in
its name, so the provider's trust is the web PKI's
([Chapter 2](02-Certificates-and-PKI.md)). A client caches the key set and
refetches it when a token names an unknown `kid`, which is how it learns of a
rotation, but at most every few minutes: otherwise tokens with random `kid`
values turn every client into a machine for flooding the provider.

### at_hash and c_hash, by hand

Some flows deliver tokens on the front channel. The **hybrid** flow
(`response_type=code id_token`) puts the ID token in the redirect next to the
code, so the client knows who logged in before it
redeems anything; the old implicit flow (`id_token token`) put the access
token there too. An attacker who can touch the redirect could then pair a
genuine, signed ID token with a code or token of their own choosing. OpenID
Connect closes this by making the signed ID token vouch for its companions:
the claim `at_hash` is a hash of the access token, and `c_hash` a hash of the
code. Each is computed the same way: hash the token's ASCII text with the hash
of the ID token's `alg` (SHA-256 for RS256, ES256 and HS256), keep the left
half, and base64url it.

Take the access token `jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y` from
OpenID Connect Core's examples, 43 characters. Its SHA-256 is

$$
\begin{aligned}
&\texttt{efb42650fb633dfcd6b45d809e92bd45}\\
&\texttt{6a57ad696b79c75b2d4c890c86fb4ba4}
\end{aligned}
$$

and the left half is the first 16 bytes, `ef b4 26 50 fb 63 3d fc d6 b4 5d 80
9e 92 bd 45`. Base64url takes three bytes at a time and cuts their 24 bits
into four 6-bit numbers. The first three bytes are

$$
\begin{aligned}
\texttt{ef}\,\texttt{b4}\,\texttt{26} &= 11101111\;10110100\;00100110\\
&\to 111011\;111011\;010000\;100110 = 59,\ 59,\ 16,\ 38 .
\end{aligned}
$$

The alphabet runs `A` to `Z` for 0 to 25, `a` to `z` for 26 to 51, the
digits for 52 to 61, then `-` and `_`. So 59 is `7`, 16 is `Q` and 38 is `m`:
the hash begins `77Qm`. Sixteen bytes make five full groups of three and one
byte over, which gives 22 characters once the `==` padding is dropped:
`77QmUPtjPfzWtF2AnpK9RQ`, the value in the specification. Half a hash is
plenty here. The attacker does not get to choose both tokens; they hold a
signed `at_hash` and need some other access token with the same 128 bits,
a second-preimage search of about $2^{128}$ hashes.

```python
# at_hash and c_hash (OpenID Connect Core): hash the token's ASCII text with the
# ID token's hash (SHA-256 for RS256), keep the left half, base64url it.
# Checked against the examples in OpenID Connect Core's Appendix A.
import base64, hashlib

def half_hash(value):
    digest = hashlib.sha256(value.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest[:len(digest) // 2]).rstrip(b"=").decode()

access_token = "jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y"
code = "Qcb0Orv1zh30vL1MPRsbm-diHiMwcLyZvn1arpZv-Jxf_11jnpEX3Tgfvk"
print("SHA-256 of the token:", hashlib.sha256(access_token.encode()).hexdigest())
print("at_hash:", half_hash(access_token), half_hash(access_token) == "77QmUPtjPfzWtF2AnpK9RQ")
print("c_hash: ", half_hash(code), half_hash(code) == "LDktKdoQak3Pk0cnXxCltA")
print("one character changed:", half_hash(access_token[:-1] + "Z"))
```

It prints:

```text
SHA-256 of the token: efb42650fb633dfcd6b45d809e92bd456a57ad696b79c75b2d4c890c86fb4ba4
at_hash: 77QmUPtjPfzWtF2AnpK9RQ True
c_hash:  LDktKdoQak3Pk0cnXxCltA True
one character changed: 7Httt23NaMd6AwWtm5gJSw
```

In the plain code flow `at_hash` is optional: both tokens come from the token
endpoint on one TLS connection. §14.10 runs the whole ID-token check, `at_hash` included, on a
signed token.

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
used. §14.12 codes rotation and shows its weak spot.

### Code it: the RFC's own proofs

The program above made its own keys, so it only shows that our code agrees
with itself. RFC 9449 prints real proofs, both ES256 from one client key: one
sent to a token endpoint (its Figure 2) and one sent to an API with a bound
access token (Figure 13). The next program checks them against RFC 9449 §4.3,
leaving out the two checks that need server state (the `jti` cache and the
server nonce). The proofs are dated July 2019, so the window check runs at
their own time.

```python
# Uses es256_verify(), thumbprint() and jwk_app from the listings above.
# RFC 9449's example DPoP proofs (Figures 2 and 13), checked as section 4.3 says.
rfc_fig2 = ("eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwieCI6Imw4dEZyaHgt"
    "MzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCRnMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFq"
    "SG10NnY5VERWclUwQ2R2R1JEQSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRt"
    "IjoiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwiaWF0IjoxNTYyMjYyNjE2fQ."
    "2-GxA6T8lP4vfrg8v-FdWP0A0zdrj8igiMLvqRMUvwnQg4PtFLbdLXiOSsX0x7NVY-FNyJK70nfbV37xRZT3Lg")
rfc_fig13 = ("eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwieCI6Imw4dEZyaHgt"
    "MzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCRnMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFq"
    "SG10NnY5VERWclUwQ2R2R1JEQSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiJlMWozVl9iS2ljOC1MQUVCIiwiaHRt"
    "IjoiR0VUIiwiaHR1IjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZy9wcm90ZWN0ZWRyZXNvdXJjZSIsImlh"
    "dCI6MTU2MjI2MjYxOCwiYXRoIjoiZlVIeU8ycjJaM0RaNTNFc05yV0JiMHhXWG9hTnk1OUlpS0NBcWtzbVFFbyJ9."
    "2oW9RP35yRqzhrtNP86L-Ey71EOptxRimPPToA1plemAgR6pxHF8y6-yqyVnmcw6Fy1dqd-jfxSYoMxhAJpLjA")
rfc_token = "Kz~8mXK1EalYznwH-LC-1fBAo.4Ljp~zsPE_NeO.gxU"
rfc_jkt = "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I"          # cnf.jkt in RFC 9449 section 6

def check_proof(proof, method, url, now, jkt=None, token=None, window=300):
    h, c, s = proof.split(".")
    header, claims = json.loads(unb64u(h)), json.loads(unb64u(c))
    jwk = header.get("jwk", {})
    checks = [("typ", header.get("typ") == "dpop+jwt"),
              ("alg", header.get("alg") == "ES256"),                # asymmetric, never none or HS256
              ("public key only", "d" not in jwk),
              ("signature", es256_verify((num(jwk["x"]), num(jwk["y"])), (h + "." + c).encode(), unb64u(s))),
              ("htm", claims.get("htm") == method),
              ("htu", claims.get("htu") == url.split("?")[0].split("#")[0]),
              ("iat", abs(claims.get("iat", 0) - now) <= window)]
    if token is not None:
        checks += [("ath", claims.get("ath") == b64u(hashlib.sha256(token.encode()).digest())),
                   ("cnf.jkt", thumbprint(jwk) == jkt)]
    failed = [name for name, ok in checks if not ok]
    return "ok, %d checks" % len(checks) if not failed else "refused: " + ", ".join(failed)

api = "https://resource.example.org/protectedresource"
print("thumbprint of the proof key:", thumbprint(json.loads(unb64u(rfc_fig2.split(".")[0]))["jwk"]) == rfc_jkt)
print("ath of the RFC's token:     ", b64u(hashlib.sha256(rfc_token.encode()).digest()))
print("Figure 2, token request:    ", check_proof(rfc_fig2, "POST", "https://server.example.com/token", 1562262616))
print("Figure 13, API call:        ", check_proof(rfc_fig13, "GET", api + "?page=2", 1562262618, rfc_jkt, rfc_token))
print("Figure 13 sent as DELETE:   ", check_proof(rfc_fig13, "DELETE", api, 1562262618, rfc_jkt, rfc_token))
print("Figure 13, another token:   ", check_proof(rfc_fig13, "GET", api, 1562262618, rfc_jkt, "stolen-token"))
print("Figure 13, key not bound:   ", check_proof(rfc_fig13, "GET", api, 1562262618, thumbprint(jwk_app), rfc_token))
print("Figure 13 in November 2026: ", check_proof(rfc_fig13, "GET", api, 1794200400, rfc_jkt, rfc_token))
```

It prints:

```text
thumbprint of the proof key: True
ath of the RFC's token:      fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo
Figure 2, token request:     ok, 7 checks
Figure 13, API call:         ok, 9 checks
Figure 13 sent as DELETE:    refused: htm
Figure 13, another token:    refused: ath
Figure 13, key not bound:    refused: cnf.jkt
Figure 13 in November 2026:  refused: iat
```

The thumbprint is the `jkt` of the RFC's example token, and the `ath` is the
one inside Figure 13's proof. Figure 2's token request has no `ath`, since no
access token exists yet; that request is where the binding is made. The
authorization server computes the thumbprint of the proof's key and writes it
into the access token as `cnf.jkt`, and for a public client binds the refresh
token to the same key. The API call passed with `?page=2` because RFC 9449
compares the URL without query or fragment, which servers and proxies rewrite
too freely for exact matching; a proof is good for any query on its path
within its window, one more reason the window is short.

### Server nonces

Malware that runs on the device for one minute can have the client sign
proofs dated an hour ahead and use them after it is removed. RFC 9449 §8 and
§9 let a server stop this with its own nonce: it refuses a proof without one,
with the error `use_dpop_nonce` and a header such as
`DPoP-Nonce: eyJ7S_zG.eyJH0-Z.HX4w-7v` (the RFC's example), and the client
retries with that value in a `nonce` claim. Proofs can then be made only after
the server has spoken, so they cannot be stockpiled, and client clocks no
longer matter. The server sends the next nonce with each response, so the
extra round trip is paid once.

### Mutual TLS, by comparison

RFC 8705 binds a token to a TLS client certificate instead of a JWK. The
confirmation claim is `cnf` with the member `x5t#S256`, the base64url SHA-256
of the certificate's DER bytes, and the resource server compares it with the
hash of the certificate the client presented on this TLS connection. The
certificate may be self-signed, and there is no proof per request: the TLS
handshake already proved possession of the key (the client's
CertificateVerify, [Chapter 3](03-TLS-1.3-Message-by-Message.md)). Its trouble is architecture. TLS usually ends at a load
balancer in front of the API, which must then forward the certificate in a
header the API trusts; and browsers and phones make client certificates
awkward. Between servers, and in open banking, mutual TLS is common. For browsers and apps, DPoP works at the
application layer, through proxies, at the cost of one signature per request.

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

### What the newer pieces cost across the gap

The later sections add pieces designed, like the code flow, for round trips
of a fraction of a second. Each has a price across the gap.

- **Server nonces** (§14.7) need the server to speak first. A Mars client
  whose first call to Earth is refused for want of a nonce learns that 6 to
  44 minutes later. An Earth service that wants nonces from Mars clients
  issues them with a lifetime of hours and attaches the next one to every
  response, which still stops proofs being stockpiled for days.
- **Pushed authorization requests** (§14.11) add a back-channel round trip
  before the consent screen: milliseconds to the city's provider, another
  light round trip to an Earth one, so the city does not push across the gap.
- **Token exchange** (§14.11) fits well. A resident's Mars token is exchanged
  at the city's own authorization server for a token whose audience is the
  Earth service, narrowed to one scope, signed by a key the Earth service
  already holds. Nothing crosses to Earth until the request itself.
- **Refresh-token rotation** (§14.12) assumes the real client comes back
  soon. Around solar conjunction, roughly every 26 months, the link is down
  for about two weeks, and a stolen refresh token could be rotated on Earth
  all that time unnoticed. The city binds refresh tokens for Earth services to
  a DPoP key instead, with an absolute lifetime that outlasts a conjunction.

## 14.10 Checking an ID token, step by step

*Level: intermediate.*

§14.4 listed the claims and §14.6 showed what happens when a token chooses its
own algorithm. A client library that accepts an ID token does all of it, in
one function, on every login. This section writes that function, following
OpenID Connect Core §3.1.3.7, and breaks each check in turn.

### The setup

From the issuer string `https://login.arcadia.mars`, discovery (§14.4) gives
the library app the endpoints and a key set with one RSA key, `kid`
`rsa-2026`, for `RS256`. The app sends the browser to `/authorize` with
`scope=openid`, a PKCE challenge, a `state` and a fresh `nonce`, keeps the
`state`, the `nonce` and the PKCE verifier in the user's session, redeems the
code, and receives an access token and an ID token. It then runs these checks, and uses nothing from the
token until all have passed:

<div class="mars-steps" markdown>
1. If the token has five parts it is a JWE: decrypt it first with the
   client's own key. Most ID tokens are signed only and have three.
2. Find the key: look up `kid` in the cached key set. If it is not there,
   fetch the set again once; if it is still not there, refuse.
3. The `alg` in the header must be the algorithm of that key, and one the
   provider lists. The header never chooses (§14.6).
4. Verify the signature over the first two parts as sent.
5. `iss` equals the issuer from discovery, as an exact string.
6. `aud` contains this client's `client_id`. If it names more than one
   audience, `azp` must be this client's `client_id`.
7. `exp` is in the future and `iat` is not, each allowing a small clock skew.
8. `nonce` equals the value kept for this login attempt, which is then
   deleted so it can never match again.
9. If `at_hash` or `c_hash` is present, it matches the token or code that
   came with the ID token.
10. If the request set `max_age`, `auth_time` is recent enough; if it asked for
    an `acr`, the value is acceptable.
11. Only now: the user is the pair (`iss`, `sub`).
</div>

OpenID Connect Core lists the issuer and audience checks before the signature.
The order does not change the result as long as every check runs and nothing
from the claims is acted on before the signature has passed; most libraries
verify the signature first, as here. The specification also lets a client
that received the ID token straight from the token endpoint over TLS skip
the signature, since TLS has already authenticated the issuer. Libraries
check it anyway, because ID tokens are often handed on to other parts of a
system that never saw that TLS connection.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The ID token check as ten steps in two rows, from key lookup to the identity (iss, sub), each with the attack it stops" fill="currentColor" font-size="12.5">
<g stroke="currentColor" fill="none">
<rect x="10" y="30" width="112" height="44" rx="6"/><rect x="134" y="30" width="112" height="44" rx="6"/>
<rect x="258" y="30" width="112" height="44" rx="6"/><rect x="382" y="30" width="112" height="44" rx="6"/>
<rect x="506" y="30" width="112" height="44" rx="6"/>
<rect x="10" y="150" width="112" height="44" rx="6"/><rect x="134" y="150" width="112" height="44" rx="6"/>
<rect x="258" y="150" width="112" height="44" rx="6"/><rect x="382" y="150" width="112" height="44" rx="6"/>
</g>
<rect x="506" y="150" width="112" height="44" rx="6" fill-opacity="0.15" stroke="currentColor"/>
<path d="M122 52h10M246 52h10M370 52h10M494 52h10M122 172h10M246 172h10M370 172h10M494 172h10M618 52h12v76H66v18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polygon points="66,149 61,139 71,139"/>
<text x="66" y="50" text-anchor="middle">key by kid</text>
<text x="66" y="66" text-anchor="middle" font-size="11">from the JWK Set</text>
<text x="190" y="50" text-anchor="middle">alg = key's alg</text>
<text x="190" y="66" text-anchor="middle" font-size="11">verifier chooses</text>
<text x="314" y="50" text-anchor="middle">signature</text>
<text x="314" y="66" text-anchor="middle" font-size="11">over header.claims</text>
<text x="438" y="50" text-anchor="middle">iss</text>
<text x="438" y="66" text-anchor="middle" font-size="11">exact string</text>
<text x="562" y="50" text-anchor="middle">aud, azp</text>
<text x="562" y="66" text-anchor="middle" font-size="11">this client</text>
<text x="66" y="170" text-anchor="middle">exp, iat</text>
<text x="66" y="186" text-anchor="middle" font-size="11">± 60 s skew</text>
<text x="190" y="170" text-anchor="middle">nonce</text>
<text x="190" y="186" text-anchor="middle" font-size="11">this attempt, once</text>
<text x="314" y="170" text-anchor="middle">at_hash, c_hash</text>
<text x="314" y="186" text-anchor="middle" font-size="11">companions match</text>
<text x="438" y="170" text-anchor="middle">auth_time</text>
<text x="438" y="186" text-anchor="middle" font-size="11">within max_age</text>
<text x="562" y="170" text-anchor="middle" font-weight="bold">user =</text>
<text x="562" y="186" text-anchor="middle" font-size="11" font-weight="bold">(iss, sub)</text>
<g font-size="11" fill-opacity="0.7" text-anchor="middle">
<text x="66" y="92">stops: unknown keys</text><text x="190" y="92">stops: alg none,</text>
<text x="190" y="105">key confusion</text><text x="314" y="92">stops: edited claims</text>
<text x="438" y="92">stops: another</text><text x="438" y="105">provider's token</text>
<text x="562" y="92">stops: a token for</text><text x="562" y="105">another app</text>
<text x="66" y="212">stops: stale tokens</text><text x="190" y="212">stops: replayed</text>
<text x="190" y="225">ID tokens</text><text x="314" y="212">stops: swapped</text>
<text x="314" y="225">token or code</text><text x="438" y="212">stops: an hours-old</text>
<text x="438" y="225">login at a bank</text>
</g>
<rect x="10" y="246" width="608" height="44" rx="6" fill-opacity="0.08" stroke="currentColor"/>
<text x="314" y="265" text-anchor="middle">Any failure refuses the whole token. Never the email address as identity:</text>
<text x="314" y="282" text-anchor="middle">it is a profile attribute that some providers let users set (nOAuth, 2023).</text>
</svg>
<figcaption>Figure 14.5. Checking an ID token. Each box is one line of the function below, and each guards against one attack.</figcaption>
</figure>

### Code it: one function, eleven tokens

The provider signs with RFC 7515's RSA key from §14.5. The program builds a
good token and ten bad ones, each wrong in one way, and checks them all. The
access token `SlAV32hkKG` is OpenID Connect Core's example string.

```python
# Uses make(), rs256_sign() and rs256_verify() from the listings above.
# An ID token checked as OpenID Connect Core section 3.1.3.7 says.
discovery = {"issuer": "https://login.arcadia.mars",
             "jwks_uri": "https://login.arcadia.mars/jwks.json",
             "id_token_signing_alg_values_supported": ["RS256"]}
jwks = {"keys": [{"kty": "RSA", "kid": "rsa-2026", "use": "sig", "alg": "RS256",
                  "n": b64u(rsa["n"].to_bytes(256, "big")), "e": "AQAB"}]}

def half_hash(value):
    return b64u(hashlib.sha256(value.encode()).digest()[:16])

def check_id_token(id_token, client_id, nonce, now, access_token=None, max_age=None, skew=60):
    h, c, s = id_token.split(".")
    header, claims = json.loads(unb64u(h)), json.loads(unb64u(c))
    key = next((k for k in jwks["keys"] if k["kid"] == header.get("kid")), None)
    if key is None: return "refused: unknown kid " + str(header.get("kid"))
    if header.get("alg") != key["alg"] or key["alg"] not in discovery["id_token_signing_alg_values_supported"]:
        return "refused: alg"
    if not rs256_verify({"n": num(key["n"]), "e": num(key["e"])}, (h + "." + c).encode(), unb64u(s)):
        return "refused: signature"
    if claims.get("iss") != discovery["issuer"]: return "refused: iss " + str(claims.get("iss"))
    aud = claims.get("aud") if isinstance(claims.get("aud"), list) else [claims.get("aud")]
    if client_id not in aud: return "refused: aud " + str(aud)
    if len(aud) > 1 and claims.get("azp") != client_id: return "refused: azp " + str(claims.get("azp"))
    if now > claims["exp"] + skew: return "refused: expired"
    if claims["iat"] > now + skew: return "refused: issued in the future"
    if claims.get("nonce") != nonce: return "refused: nonce"
    if access_token and "at_hash" in claims and claims["at_hash"] != half_hash(access_token):
        return "refused: at_hash"
    if max_age is not None and now - claims["auth_time"] > max_age + skew:
        return "refused: login too old, send the user back with prompt=login"
    return "accepted: (%s, %s)" % (claims["iss"], claims["sub"])

now, nonce, at = 1_794_200_400, "n-0S6_WzA2Mj", "SlAV32hkKG"
base = {"iss": "https://login.arcadia.mars", "sub": "248289761001", "aud": "library-app",
        "exp": now + 300, "iat": now, "auth_time": now - 10, "nonce": nonce, "at_hash": half_hash(at)}
def issue(kid="rsa-2026", **changes):
    return make({"alg": "RS256", "kid": kid, "typ": "JWT"}, dict(base, **changes), lambda m: rs256_sign(rsa, m))

good = issue()
h, c, s = good.split(".")
edited = h + "." + b64u(json.dumps(dict(base, sub="1")).encode()) + "." + s   # claims changed after signing
tests = [("good token", good, {}),
         ("claims edited", edited, {}),
         ("issuer with a slash", issue(iss="https://login.arcadia.mars/"), {}),
         ("for another app", issue(aud="clinic-app"), {}),
         ("two audiences", issue(aud=["library-app", "clinic-app"], azp="clinic-app"), {}),
         ("old login's nonce", issue(nonce="n-earlier-login"), {}),
         ("access token swapped", good, {"access_token": "another-token"}),
         ("ten minutes later", good, {"now": now + 600}),
         ("issued 2 h ahead", issue(iat=now + 7200), {}),
         ("bank, max_age 300", issue(auth_time=now - 3600), {"max_age": 300}),
         ("unknown kid", issue(kid="rsa-2025"), {})]
for name, token, extra in tests:
    args = dict({"now": now, "access_token": at}, **extra)
    print("%-21s %s" % (name, check_id_token(token, "library-app", nonce, **args)))
```

It prints:

```text
good token            accepted: (https://login.arcadia.mars, 248289761001)
claims edited         refused: signature
issuer with a slash   refused: iss https://login.arcadia.mars/
for another app       refused: aud ['clinic-app']
two audiences         refused: azp clinic-app
old login's nonce     refused: nonce
access token swapped  refused: at_hash
ten minutes later     refused: expired
issued 2 h ahead      refused: issued in the future
bank, max_age 300     refused: login too old, send the user back with prompt=login
unknown kid           refused: unknown kid rsa-2025
```

### What each refusal guards

**The signature.** The edited token keeps its header and signature but carries
a different `sub`; the signature covers the encoded claims byte for byte.

**The issuer, as a string.** `https://login.arcadia.mars/` with a trailing
slash is a different issuer. The comparison is exact on purpose: a library that
normalizes URLs or accepts prefixes will one day accept a string an attacker
controls. Clients of several providers need it most, against the mix-up
attack (§14.14).

**The audience and `azp`.** The provider issues ID tokens about one person to
every app she uses. If the library accepted a token made for the clinic app,
the clinic app, or anyone who stole from it, could log in to the library as
her: the mistake of §14.1 again. With several audiences, `azp` (authorized
party) names the client the token was issued to.

**The nonce.** An ID token copied from an earlier login and pushed into a
fresh session carries the old attempt's nonce, and since each nonce is random,
kept in the user's session and deleted after use, it never matches. RFC 9700
lets a confidential OpenID Connect client use the nonce instead of
PKCE against code injection, with extra care; a public client must use PKCE,
because a thief holding a public client's code can call the token endpoint
directly, and no nonce check on the client's side is ever reached.

**auth_time and max_age.** A bank that sends `max_age=300` asks the provider to
log the user in again if their session is older than five minutes. A provider
may ignore that, so the client checks `auth_time` itself, and on failure sends
a new request with `prompt=login`.

**An unknown key.** After one refresh of the key set, a `kid` that is still
unknown is refused. The key set must also be this issuer's own: the tokens
Storm-0558 forged (§14.7) were signed with a real Microsoft key that enterprise
services should never have accepted for their issuer.

### Break it: identity from the wrong claim

The check ends with "the user is (`iss`, `sub`)", and many login bugs come
from ignoring that line. In June 2023 the security company Descope published
**nOAuth**. Microsoft's Azure AD (now Entra ID) let the owner of any tenant set
a user's email attribute to any address, without proving the domain, and put
it in the `email` claim. Applications behind a "Log in with Microsoft" button
that found accounts by email rather than by subject could be entered as
anyone: the attacker set their own email to the victim's and signed in. Descope reported it to Microsoft in April 2023.
Microsoft called the pattern "an insecure anti-pattern", added a claim that
says whether an email's domain has been verified, and gave applications a way
to keep unverified addresses out of their tokens. Every signature was valid;
the flaw was which claim the application took as the identity. An email
address is a profile attribute that can change hands or be set by the user. A
site that links accounts by email must check `email_verified` and trust it
only from a provider that controls the domain.

A second mix-up to avoid: **an ID token is not an access token.** Its audience
is the client, not an API, and clients log and pass ID tokens around freely;
an API that accepts them turns every copy into a key. JWT access
tokens (RFC 9068) carry `"typ": "at+jwt"` in the header so that an API can
refuse anything else; the update to the JWT best practices (§14.14) calls the
general problem **cross-JWT confusion**.

## 14.11 Beyond the basic flow: PAR, RAR and token exchange

*Level: intermediate.*

Open banking and other large deployments met three problems the code flow
leaves open: the request itself travels through the browser; a
scope such as `payments` is too coarse for "pay 45 credits to the greenhouse";
and a service in the middle of a chain must call another for the user.

### Pushed authorization requests

The authorization request (scope, `redirect_uri`, PKCE challenge) is a URL
that passes through the browser, where an extension or malware can read and
change it, and nothing proves the client wrote it. The first fix was to sign
it. **JWT-secured authorization requests** (JAR,
RFC 9101, August 2021) put the parameters in a JWT, the **request object**,
signed by the client, so the server can tell that nobody altered them. It
still rides in the browser, visible and often too long for proxies.

**Pushed authorization requests** (PAR, RFC 9126, September 2021) take it
out of the browser altogether (Figure 14.6). The client posts the parameters to the
server's PAR endpoint, authenticating as at the token endpoint, and receives a
reference:

```
POST /par   (client authentication, then the usual parameters)
  response_type=code&client_id=library-app&redirect_uri=...&scope=openid loans
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256

HTTP/1.1 201 Created
{"request_uri": "urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c",
 "expires_in": 60}
```

The redirect carries only `client_id` and `request_uri`, a reference that
lives briefly (60 seconds in the RFC's example) and works once, for that client
only. The server knows the request is the client's, unaltered, and nothing
sensitive sits in browser history or logs, for the cost of one back-channel
round trip. The FAPI 2.0 security profile, written for open banking, requires
PAR.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Pushed authorization request: the client posts the full request to the authorization server on the back channel and gets a short-lived request_uri; the browser carries only client_id and request_uri to the authorize endpoint" fill="currentColor" font-size="12.5">
<g stroke="currentColor" fill="none">
<rect x="20" y="16" width="120" height="36" rx="6"/><rect x="260" y="16" width="120" height="36" rx="6"/>
<rect x="480" y="16" width="140" height="36" rx="6" fill="currentColor" fill-opacity="0.12"/>
</g>
<text x="80" y="39" text-anchor="middle">browser</text>
<text x="320" y="39" text-anchor="middle">client app</text>
<text x="550" y="39" text-anchor="middle">authorization server</text>
<g stroke="currentColor" stroke-dasharray="4 4" stroke-opacity="0.5">
<line x1="80" y1="52" x2="80" y2="214"/><line x1="320" y1="52" x2="320" y2="214"/><line x1="550" y1="52" x2="550" y2="214"/>
</g>
<path d="M320 80H544M550 118H326M320 152H86M80 190H544" stroke="currentColor" stroke-width="1.5"/>
<polygon points="547,80 535,75 535,85"/><polygon points="323,118 335,113 335,123"/>
<polygon points="83,152 95,147 95,157"/><polygon points="547,190 535,185 535,195"/>
<text x="435" y="73" text-anchor="middle">1 POST /par: all parameters + client auth</text>
<text x="435" y="111" text-anchor="middle">2 request_uri, expires_in 60</text>
<text x="200" y="145" text-anchor="middle">3 redirect: client_id, request_uri</text>
<text x="312" y="183" text-anchor="middle">4 GET /authorize?client_id=…&amp;request_uri=urn:…:6esc_11ACC5…</text>
<rect x="20" y="226" width="600" height="36" rx="6" fill-opacity="0.08" stroke="currentColor"/>
<text x="320" y="249" text-anchor="middle">The browser never sees scope, redirect URI or challenge; the server knows who sent them.</text>
</svg>
<figcaption>Figure 14.6. A pushed authorization request. Steps 1 and 2 are the back channel; the front channel carries only a one-time reference.</figcaption>
</figure>

### Rich authorization requests

A scope is a string, and a string such as `payments` grants every payment.
**Rich authorization requests** (RAR, RFC 9396, May 2023) add a parameter,
`authorization_details`, a JSON array of objects, each with a `type` and the
fields that type defines. A payment for the greenhouse:

```
"authorization_details": [{
   "type": "payment_initiation",
   "locations": ["https://bank.arcadia.mars/payments"],
   "instructedAmount": {"currency": "ACR", "amount": "45.00"},
   "creditorName": "Greenhouse 3 cooperative"}]
```

The consent screen shows exactly this, the token carries it, and the bank's
API pays 45.00 to that creditor and nothing else. The cryptography is
unchanged, but the signature now covers what was approved, not only who
approved it. Such objects are large and must not be altered, so they are
usually pushed with PAR.

### Token exchange

The library app calls the catalog API with Alice's token, and the catalog must
call the loans service for her. Forwarding her token defeats the audience
check: any service that receives a token could replay it anywhere. Calling
with the catalog's own credentials loses whose loan it is, and makes the loans
service trust the catalog for everything, the confused-deputy setting.

**Token exchange** (RFC 8693, January 2020) adds a third. The catalog goes to
the authorization server's token endpoint with a new grant type:

```
POST /token
  grant_type=urn:ietf:params:oauth:grant-type:token-exchange
  &subject_token=<Alice's access token>
  &subject_token_type=urn:ietf:params:oauth:token-type:access_token
  &actor_token=<the catalog's own token>
  &actor_token_type=urn:ietf:params:oauth:token-type:access_token
  &audience=https://loans.arcadia.mars&scope=loans.request
```

The server checks its policy (may the catalog act for Alice towards the loans
service?) and issues a new token (Figure 14.7): audience the loans service,
one scope, subject Alice, and an `act` (actor) claim naming the catalog. A longer chain nests `act` inside `act`,
newest actor outermost. RFC 8693 says a service decides access from the
top-level claims and the current actor only; the nested actors are a history
for the audit log. Without `act`, the new token simply says "Alice": RFC 8693
calls that impersonation, as opposed to delegation, and it hides the
middleman from the logs.

Kerberos met the same problem years earlier and solved it in the same place: constrained delegation lets the KDC, not the front-end service, decide
which services a ticket may be passed on to
([Chapter 12](12-Kerberos.md)). In both, the policy
lives at the server that issues credentials, and each hop gets a narrower
one.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Token exchange: Alice's app calls the catalog with a token whose audience is the catalog; the catalog exchanges it at the authorization server for a token whose audience is the loans service, with an act claim naming the catalog; the loans service accepts only that" fill="currentColor" font-size="12.5">
<g stroke="currentColor" fill="none">
<rect x="10" y="20" width="120" height="44" rx="6"/><rect x="255" y="20" width="130" height="44" rx="6"/>
<rect x="510" y="20" width="120" height="44" rx="6"/>
<rect x="245" y="176" width="150" height="44" rx="6" fill="currentColor" fill-opacity="0.12"/>
</g>
<text x="70" y="47" text-anchor="middle">Alice's app</text>
<text x="320" y="47" text-anchor="middle">catalog API</text>
<text x="570" y="47" text-anchor="middle">loans API</text>
<text x="320" y="196" text-anchor="middle">authorization server</text>
<text x="320" y="211" text-anchor="middle" font-size="11">policy: who may act for whom</text>
<path d="M130 42H251M385 42H506M300 64V172M340 176V68" stroke="currentColor" stroke-width="1.5"/>
<polygon points="253,42 241,37 241,47"/><polygon points="508,42 496,37 496,47"/>
<polygon points="300,174 295,162 305,162"/><polygon points="340,66 335,78 345,78"/>
<text x="10" y="92" font-size="11.5">token 1</text>
<text x="10" y="108" font-size="11.5">sub: alice</text>
<text x="10" y="124" font-size="11.5">aud: catalog</text>
<text x="10" y="140" font-size="11.5">scope: catalog</text>
<text x="292" y="124" text-anchor="end" font-size="11.5">exchange token 1</text>
<text x="348" y="124" font-size="11.5">token 2</text>
<text x="480" y="92" font-size="11.5">token 2</text>
<text x="480" y="108" font-size="11.5">sub: alice</text>
<text x="480" y="124" font-size="11.5">aud: loans</text>
<text x="480" y="140" font-size="11.5">scope: loans.request</text>
<text x="480" y="156" font-size="11.5" font-weight="bold">act: {sub: catalog}</text>
<text x="320" y="240" text-anchor="middle" font-size="11.5" fill-opacity="0.7">Each hop gets a new token with a narrower audience and scope; token 1 never reaches the loans API.</text>
</svg>
<figcaption>Figure 14.7. Token exchange (RFC 8693). The loans service sees who the user is and who is acting for her.</figcaption>
</figure>

## 14.12 Refresh tokens and OAuth 2.1

*Level: intermediate.*

Access tokens live minutes to an hour; the refresh token, which lives for
days or months and gets new ones without the user, is the most valuable thing
a client holds. For public clients, which have no secret, RFC 9700 offers two
protections: bind it to a key (DPoP or mutual TLS, §14.7), or **rotate** it.

### Rotation, coded

With rotation, every refresh returns a new refresh token and retires the old
one. The server remembers which tokens belong to the same grant, a **family**.
If a retired token is ever presented again, two parties hold copies, and the
server cannot tell which is the thief, so it revokes the whole family. RFC 9700
§4.14.2 describes exactly this.

```python
# Refresh-token rotation with reuse detection (RFC 9700 section 4.14.2):
# each refresh retires the token and issues a new one; a retired token used
# again revokes the whole family, whoever presents it.
import secrets

class TokenEndpoint:
    def __init__(self):
        self.tokens, self.revoked = {}, set()          # token -> family; revoked families
    def login(self, user):
        return self._issue(user + "/" + secrets.token_hex(4))
    def _issue(self, family):
        rt = secrets.token_urlsafe(16)
        self.tokens[rt] = {"family": family, "used": False}
        return rt
    def refresh(self, rt):
        t = self.tokens.get(rt)
        if t is None: return None, "refused: unknown token"
        if t["family"] in self.revoked: return None, "refused: family revoked, log in again"
        if t["used"]:
            self.revoked.add(t["family"])
            return None, "refused: reuse detected, family revoked"
        t["used"] = True
        return self._issue(t["family"]), "ok: new access token and new refresh token"

AS = TokenEndpoint()
print("Story 1: the app refreshes first")
rt1 = AS.login("alice"); stolen = rt1                      # malware copies the refresh token
rt2, msg = AS.refresh(rt1); print("  app,   rt1:", msg)
_, msg = AS.refresh(stolen); print("  thief, rt1:", msg)
_, msg = AS.refresh(rt2); print("  app,   rt2:", msg)

print("Story 2: the thief refreshes first")
rt1 = AS.login("alice"); stolen = rt1
t2, msg = AS.refresh(stolen); print("  thief, rt1:", msg)
t3, msg = AS.refresh(t2); print("  thief, rt2:", msg)
_, msg = AS.refresh(rt1); print("  app,   rt1:", msg)
_, msg = AS.refresh(t3); print("  thief, rt3:", msg)
```

It prints:

```text
Story 1: the app refreshes first
  app,   rt1: ok: new access token and new refresh token
  thief, rt1: refused: reuse detected, family revoked
  app,   rt2: refused: family revoked, log in again
Story 2: the thief refreshes first
  thief, rt1: ok: new access token and new refresh token
  thief, rt2: ok: new access token and new refresh token
  app,   rt1: refused: reuse detected, family revoked
  thief, rt3: refused: family revoked, log in again
```

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Refresh token rotation timeline: the thief copies rt1 and refreshes twice, getting rt2 and rt3; when the real app presents rt1 the server sees a retired token used again and revokes the whole family, so rt3 stops working" fill="currentColor" font-size="12.5">
<text x="16" y="56">thief</text>
<text x="16" y="146">app</text>
<g stroke="currentColor" stroke-opacity="0.5"><line x1="70" y1="52" x2="620" y2="52"/><line x1="70" y1="142" x2="620" y2="142"/></g>
<g stroke="currentColor" fill="none">
<circle cx="110" cy="142" r="7"/><circle cx="210" cy="52" r="7"/><circle cx="310" cy="52" r="7"/>
<circle cx="430" cy="142" r="7"/><circle cx="560" cy="52" r="7"/>
</g>
<circle cx="430" cy="142" r="4"/>
<line x1="110" y1="135" x2="205" y2="58" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="110" y="168" text-anchor="middle" font-size="11.5">login: rt1</text>
<text x="132" y="96" font-size="11" fill-opacity="0.7">copied</text>
<text x="210" y="36" text-anchor="middle" font-size="11.5">rt1 → rt2</text>
<text x="310" y="36" text-anchor="middle" font-size="11.5">rt2 → rt3</text>
<text x="430" y="168" text-anchor="middle" font-size="11.5" font-weight="bold">rt1 again: reuse!</text>
<text x="430" y="184" text-anchor="middle" font-size="11.5">family revoked</text>
<text x="560" y="36" text-anchor="middle" font-size="11.5">rt3 refused</text>
<rect x="210" y="70" width="350" height="22" fill-opacity="0.12"/>
<text x="385" y="86" text-anchor="middle" font-size="11.5">the thief's window: until the app next refreshes</text>
<text x="320" y="212" text-anchor="middle" font-size="11.5" fill-opacity="0.7">Whoever uses a copy second triggers the alarm; the server cannot tell who is the thief, so both lose.</text>
</svg>
<figcaption>Figure 14.8. Refresh-token rotation, story 2 of the program. Detection waits for the real app to come back.</figcaption>
</figure>

In both stories the second use of a copy ends the family, and in the second
the thief had working tokens until then. That is rotation's weak spot: it
detects theft only when the real client next refreshes, so against an app
opened once a month a thief has a month, up to the family's absolute lifetime.
It also misfires: if a refresh response is lost and the app retries with the
old token, the user is logged out, so servers allow a short grace period,
which reopens a small window. A refresh token bound to a DPoP key has neither
problem. Confidential clients have a simpler protection: a refresh token
stolen from them is useless without the client's own credentials.

### OAuth 2.1, as of November 2026

OAuth 2.1 is a consolidation, not a new protocol: one document that would
replace RFC 6749 and RFC 6750 and fold in PKCE and the security BCP. As of
November 2026 it is still an Internet-Draft (`draft-ietf-oauth-v2-1`, revision
17, 31 October 2026). Its list of differences from OAuth 2.0 reads like this
chapter's advice:

- PKCE is required, and its `plain` method is gone;
- redirect URIs are compared by exact string match;
- the implicit grant and the password grant are omitted;
- bearer tokens may not be sent in URL query strings;
- public clients' refresh tokens must be sender-constrained or rotated;
- the token request no longer repeats the `redirect_uri`.

Browser-based applications have their own Best Current Practice, RFC 10017
(BCP 212, August 2026), *OAuth 2.0 for Browser-Based Applications*. Its core
worry is malicious JavaScript, which can steal any token the page can read,
and it describes a backend that holds the tokens and gives the browser only a
session cookie (the checklist in §14.13).

## 14.13 In the real world

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
| PAR, JAR, RAR | RFC 9126, RFC 9101 (2021), RFC 9396 (2023) |
| Token exchange | RFC 8693 (2020) |
| Browser-based applications | RFC 10017 (2026) |
| OAuth 2.1 | IETF draft, revision 17 (October 2026) |

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

### Incidents since 2023

OAuth's cryptography has held; recent incidents are about where tokens and
grants live, and who can reach them.

- **Okta's support system, October 2023.** An attacker used a stolen service
  account to read files that customers had uploaded to Okta's support system
  between 28 September and 17 October 2023, for 134 customers. Some were HTTP
  archive (HAR) files, browser recordings made for troubleshooting, holding
  live session tokens, which the attacker used to hijack sessions at five
  customers, among them Cloudflare, 1Password and BeyondTrust. A session
  token in a debug file is a bearer token like any other.
- **Midnight Blizzard at Microsoft, January 2024.** The Russian group Microsoft
  calls Midnight Blizzard guessed the password of a legacy test account
  without multifactor authentication, found an old test OAuth application
  with elevated access to the corporate tenant, and used it to grant new
  applications Exchange Online's `full_access_as_app` role, which reads any
  mailbox. Nothing was forged. An
  OAuth application with a powerful role is a standing credential and needs
  the review a privileged account gets.
- **Entra ID actor tokens, CVE-2025-55241, 2025.** Dirk-jan Mollema found that
  undocumented "actor tokens", which Microsoft services used to call each
  other for users, could be obtained in the attacker's own tenant and
  presented to the legacy Azure AD Graph API for any other tenant, which did
  not check where the token came from: impersonation of any user, global
  administrators included, in any tenant, with little logging. Microsoft fixed it in July 2025, soon after
  his report, published the CVE in September, rated it 10.0 on the CVSS scale, and reported no sign of
  exploitation. It is the issuer and audience check of §14.10, missing in one
  service.
- **Salesloft Drift, August 2025.** Attackers that Google's threat intelligence
  team tracks as UNC6395 stole the OAuth access and refresh tokens that the
  Drift chat application held for its customers' Salesforce integrations, and
  between 8 and 18 August 2025 used them to export data from many Salesforce
  instances, searching it for further secrets.
  Salesloft and Salesforce revoked every Drift token on 20 August. One
  integration's token store was a key to many customers' data: the
  same lesson as the Heroku and Travis CI theft of 2022 (§14.7), three years
  on. Sender-constrained tokens and narrow scopes limit what such a theft is
  worth.

## 14.14 Going deeper

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

**The JWT best practices, revised.** `draft-ietf-oauth-rfc8725bis`, waiting
in the RFC Editor's queue as of November 2026, keeps RFC 8725's rules and adds
attacks found since: a verifier that takes a successful JWE decryption for a
valid signature, huge PBES2 iteration counts that burn CPU, decompression
bombs, and **cross-JWT confusion**, a token minted for one purpose accepted for
another, which explicit `typ` values and audience checks prevent.

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

??? question "3. How does PKCE stop a stolen authorization code from being used?"
    The token request must include the code verifier whose SHA-256 hash was
    sent as the challenge. The attacker saw at most the challenge and cannot
    invert the hash.

??? question "4. Which ID token claims must a client check, and why `aud` in particular?"
    `iss`, `aud`, `exp` (and `iat`), `nonce` and the signature. `aud` makes
    sure the token was issued to this client, not to some other app that could
    replay it.

??? question "5. What is `at_hash`, and why is half of a SHA-256 hash enough?"
    It is base64url of the left half of the SHA-256 hash of the access token's
    text, signed inside the ID token, so the access token delivered beside it
    cannot be swapped (`c_hash` does the same for a code). An attacker must find another token with the
    same 128 bits, a second-preimage search of about $2^{128}$ work.

??? question "6. Explain the RS256-to-HS256 key confusion attack."
    The attacker changes `alg` to HS256 and computes an HMAC with the server's
    public RSA key as the secret. A library that follows the header uses the
    public key as an HMAC key and accepts the forgery. The fix is to bind each
    key to one algorithm chosen by the verifier.

??? question "7. Why does JWS sign the base64url text rather than the JSON?"
    So that no canonical JSON form is needed: the bytes verified are the bytes
    sent. XML Signature's need for canonicalization and element references is
    what made signature wrapping attacks on SAML possible.

??? question "8. How does DPoP make a stolen access token useless?"
    The token contains the thumbprint of the client's public key; each request
    needs a fresh proof signed by the matching private key, naming the method,
    URL, time, a unique ID and the token's hash. A thief without the key cannot
    produce one.

??? question "9. How does refresh-token rotation detect theft, and what is its weak spot?"
    Each refresh retires the old token and issues a new one in the same
    family; a retired token used again means two copies exist, and the server
    revokes the family. Detection waits for the real client's next refresh,
    so a thief has until then; binding the token to a DPoP key avoids that.

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
- An ID token is checked in one function, key to `auth_time`; the identity is
  (`iss`, `sub`), never the email (nOAuth, 2023). You computed an `at_hash` by
  hand and verified RFC 9449's own DPoP proofs.
- PAR takes the request off the front channel, RAR says what was approved,
  token exchange narrows each hop; rotation catches a stolen refresh token
  only when the real client returns. OAuth 2.1 is still a draft.

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
- RFC 9126 (PAR) and RFC 9101 (JAR), 2021; RFC 9396 (RAR), 2023; RFC 8693
  (token exchange), 2020; RFC 9068 (JWT access tokens), 2021; RFC 10017,
  *OAuth 2.0 for Browser-Based Applications*, 2026.
- OpenID Foundation, *OpenID Connect Discovery 1.0*, 2014.
- IETF, `draft-ietf-oauth-v2-1` (OAuth 2.1), revision 17, October 2026, and
  `draft-ietf-oauth-rfc8725bis` (JWT BCP update), 2026.
- Descope, "nOAuth: How Microsoft OAuth Misconfiguration Can Lead to Full
  Account Takeover", June 2023.
- Microsoft, "Midnight Blizzard: Guidance for responders on nation-state
  attack", January 2024.
- Dirk-jan Mollema, write-up of the Entra ID actor-token flaw
  (CVE-2025-55241), September 2025.
- Google Threat Intelligence Group, advisory on UNC6395 and the Salesloft
  Drift token theft, August 2025.
