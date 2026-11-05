# Elliptic Curves

*The groups under ECDH, ECDSA and EdDSA: how points add, the three ways to
write a curve, and the named curves people actually use.*

**Status and standards:** see [Math foundations](../algorithms/table.md#10-math-foundations) in the main table.

## What it is

An elliptic curve over a prime field is the set of points $(x, y)$, with $x$
and $y$ taken mod $p$, that satisfy an equation such as $y^2 = x^3 + ax + b$. One
extra point, the point at infinity $O$, acts as zero. Points can be added,
and with $O$ they form a group. Adding a point $G$ to itself $d$ times gives $d \cdot G$,
which is fast to compute. Getting $d$ back from $d \cdot G$ is the elliptic-curve
discrete log problem (see [Hard problems](Hard-Problems.md)). A private
key is a number $d$, and the public key is $d \cdot G$ for a fixed base point $G$.

The number of points is within $2\sqrt{p}$ of $p + 1$. The base point generates a
subgroup of prime order $n$, and the point count divided by $n$ is the
cofactor. Pollard's rho needs about $\sqrt{n}$ steps, so a 256-bit curve gives
about 128-bit security.

## The story

- **Who made it:** The curves themselves go back to Diophantus (about AD 250), who solved such equations, and to the 19th-century work of Weierstrass and others. Mordell proved in 1922 that their rational points form a finitely generated group. Hendrik Lenstra used them to factor (1985), and Koblitz and Miller to build keys (1985).
- **What for:** A group where discrete logs are much harder per bit than in ordinary numbers.
- **What it solved:** Small keys: 256 bits instead of 3072.
- **Where it stands:** The basis of X25519, Ed25519, ECDSA and Bitcoin; deprecated by NIST IR 8547 after 2030 because of quantum computers.
- **Incidents:** **Weak curves:** the MOV attack (Menezes, Okamoto and Vanstone, 1993) and Smart's attack (1999) broke special classes of curves, so standards avoid them. **Trust:** the NSA's unexplained seeds for the NIST curves and the Dual_EC back door led many to prefer curves with explained constants, such as Curve25519.

## How it works

Draw the line through $P$ and $Q$. It meets the curve in one more point; flip
that point over the $x$-axis and you have $P + Q$. For $P + P$ use the tangent.
On $y^2 = x^3 + ax + b$, with every division done mod $p$:

- slope $m = (y_2 - y_1)/(x_2 - x_1)$, or $m = (3x_1^2 + a)/(2y_1)$ when $P = Q$
- $x_3 = m^2 - x_1 - x_2$ and $y_3 = m(x_1 - x_3) - y_1$
- $-(x, y) = (x, -y)$, and $P + (-P) = O$

Scalar multiplication walks through the bits of $d$: double for every bit,
add when the bit is 1. A 256-bit $d$ takes 256 doublings and about 128
additions. Real code uses a ladder or fixed windows so the running time
doesn't depend on the bits.

Curves are written in one of three forms:

| Form | Equation | Used by | What it buys |
|---|---|---|---|
| Short Weierstrass | $y^2 = x^3 + ax + b$ | P-256, secp256k1, Brainpool | every curve (for $p > 3$) has this form; the formulas have special cases |
| Montgomery (1987) | $By^2 = x^3 + Ax^2 + x$ | Curve25519, Curve448 (X25519, X448) | the Montgomery ladder works on $x$ alone, with the same steps for every bit |
| Twisted Edwards (2007, 2008) | $ax^2 + y^2 = 1 + dx^2y^2$ | Ed25519, Ed448 | one addition formula with no exceptions when $a$ is a square and $d$ is not |

Montgomery and Edwards curves always have a point count divisible by 4, so
they come with a cofactor. Curve25519 and the Edwards curve under Ed25519
are the same group written two ways.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 405" role="img" aria-labelledby="sk-c-ecadd-t"><title id="sk-c-ecadd-t">The curve y squared equals x cubed minus x plus 1, with the line through P and Q meeting it at a third point, which flipped over the x-axis gives P plus Q</title><defs><filter id="sk-c-ecadd-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-ecadd-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-ecadd-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-ecadd-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-ecadd-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="405" filter="url(#sk-c-ecadd-paper)"/><g filter="url(#sk-c-ecadd-pen)"><text x="30" y="44" class="h">Adding points: draw a line, flip</text><path class="p" d="M311.0 69.5 L310.4 70.7 L309.8 71.9 L309.2 73.1 L308.6 74.2 L308.0 75.4 L307.4 76.6 L306.8 77.7 L306.2 78.9 L305.6 80.0 L305.0 81.2 L304.4 82.3 L303.8 83.5 L303.2 84.6 L302.6 85.7 L302.0 86.8 L301.4 88.0 L300.8 89.1 L300.2 90.2 L299.6 91.3 L299.0 92.4 L298.4 93.5 L297.8 94.6 L297.2 95.7 L296.6 96.7 L296.0 97.8 L295.4 98.9 L294.8 99.9 L294.2 101.0 L293.6 102.1 L293.0 103.1 L292.4 104.2 L291.8 105.2 L291.2 106.2 L290.6 107.2 L290.0 108.3 L289.4 109.3 L288.8 110.3 L288.2 111.3 L287.6 112.3 L287.0 113.3 L286.4 114.3 L285.8 115.2 L285.2 116.2 L284.6 117.2 L284.0 118.1 L283.4 119.1 L282.8 120.0 L282.2 121.0 L281.6 121.9 L281.0 122.8 L280.4 123.8 L279.8 124.7 L279.2 125.6 L278.6 126.5 L278.0 127.4 L277.4 128.2 L276.8 129.1 L276.2 130.0 L275.6 130.8 L275.0 131.7 L274.4 132.5 L273.8 133.4 L273.2 134.2 L272.6 135.0 L272.0 135.8 L271.4 136.6 L270.8 137.4 L270.2 138.2 L269.6 139.0 L269.0 139.7 L268.4 140.5 L267.8 141.3 L267.2 142.0 L266.6 142.7 L266.0 143.4 L265.4 144.1 L264.8 144.8 L264.2 145.5 L263.6 146.2 L263.0 146.9 L262.4 147.5 L261.8 148.1 L261.2 148.8 L260.6 149.4 L260.0 150.0 L259.4 150.6 L258.8 151.2 L258.2 151.7 L257.6 152.3 L257.0 152.8 L256.4 153.4 L255.8 153.9 L255.2 154.4 L254.6 154.9 L254.0 155.4 L253.4 155.8 L252.8 156.3 L252.2 156.7 L251.6 157.1 L251.0 157.6 L250.4 157.9 L249.8 158.3 L249.2 158.7 L248.6 159.0 L248.0 159.4 L247.4 159.7 L246.8 160.0 L246.2 160.3 L245.6 160.6 L245.0 160.8 L244.4 161.1 L243.8 161.3 L243.2 161.5 L242.6 161.7 L242.0 161.9 L241.4 162.1 L240.8 162.2 L240.2 162.3 L239.6 162.5 L239.0 162.6 L238.4 162.7 L237.8 162.8 L237.2 162.8 L236.6 162.9 L236.0 162.9 L235.4 162.9 L234.8 162.9 L234.2 162.9 L233.6 162.9 L233.0 162.9 L232.4 162.9 L231.8 162.8 L231.2 162.7 L230.6 162.7 L230.0 162.6 L229.4 162.5 L228.8 162.4 L228.2 162.2 L227.6 162.1 L227.0 162.0 L226.4 161.8 L225.8 161.6 L225.2 161.5 L224.6 161.3 L224.0 161.1 L223.4 160.9 L222.8 160.7 L222.2 160.5 L221.6 160.3 L221.0 160.1 L220.4 159.8 L219.8 159.6 L219.2 159.3 L218.6 159.1 L218.0 158.8 L217.4 158.6 L216.8 158.3 L216.2 158.0 L215.6 157.8 L215.0 157.5 L214.4 157.2 L213.8 156.9 L213.2 156.6 L212.6 156.4 L212.0 156.1 L211.4 155.8 L210.8 155.5 L210.2 155.2 L209.6 154.9 L209.0 154.6 L208.4 154.3 L207.8 154.0 L207.2 153.7 L206.6 153.4 L206.0 153.0 L205.4 152.7 L204.8 152.4 L204.2 152.1 L203.6 151.8 L203.0 151.5 L202.4 151.2 L201.8 150.9 L201.2 150.6 L200.6 150.3 L200.0 150.0 L199.4 149.7 L198.8 149.4 L198.2 149.1 L197.6 148.8 L197.0 148.5 L196.4 148.2 L195.8 147.9 L195.2 147.7 L194.6 147.4 L194.0 147.1 L193.4 146.8 L192.8 146.6 L192.2 146.3 L191.6 146.0 L191.0 145.8 L190.4 145.5 L189.8 145.2 L189.2 145.0 L188.6 144.7 L188.0 144.5 L187.4 144.3 L186.8 144.0 L186.2 143.8 L185.6 143.6 L185.0 143.3 L184.4 143.1 L183.8 142.9 L183.2 142.7 L182.6 142.5 L182.0 142.3 L181.4 142.1 L180.8 141.9 L180.2 141.7 L179.6 141.6 L179.0 141.4 L178.4 141.2 L177.8 141.1 L177.2 140.9 L176.6 140.8 L176.0 140.6 L175.4 140.5 L174.8 140.4 L174.2 140.3 L173.6 140.2 L173.0 140.1 L172.4 140.0 L171.8 139.9 L171.2 139.8 L170.6 139.7 L170.0 139.6 L169.4 139.6 L168.8 139.5 L168.2 139.5 L167.6 139.5 L167.0 139.4 L166.4 139.4 L165.8 139.4 L165.2 139.4 L164.6 139.4 L164.0 139.4 L163.4 139.4 L162.8 139.5 L162.2 139.5 L161.6 139.6 L161.0 139.6 L160.4 139.7 L159.8 139.8 L159.2 139.9 L158.6 140.0 L158.0 140.1 L157.4 140.2 L156.8 140.4 L156.2 140.5 L155.6 140.7 L155.0 140.9 L154.4 141.0 L153.8 141.2 L153.2 141.4 L152.6 141.7 L152.0 141.9 L151.4 142.2 L150.8 142.4 L150.2 142.7 L149.6 143.0 L149.0 143.3 L148.4 143.6 L147.8 144.0 L147.2 144.3 L146.6 144.7 L146.0 145.1 L145.4 145.5 L144.8 145.9 L144.2 146.3 L143.6 146.8 L143.0 147.3 L142.4 147.8 L141.8 148.3 L141.2 148.8 L140.6 149.4 L140.0 150.0 L139.4 150.6 L138.8 151.2 L138.2 151.9 L137.6 152.6 L137.0 153.3 L136.4 154.1 L135.8 154.8 L135.2 155.7 L134.6 156.5 L134.0 157.4 L133.4 158.3 L132.8 159.3 L132.2 160.3 L131.6 161.3 L131.0 162.4 L130.4 163.6 L129.8 164.8 L129.2 166.0 L128.6 167.4 L128.0 168.8 L127.4 170.3 L126.8 171.9 L126.2 173.5 L125.6 175.4 L125.0 177.3 L124.4 179.4 L123.8 181.8 L123.2 184.3 L122.6 187.3 L122.0 190.7 L121.4 195.1 L120.8 201.5 L120.8 218.5 L121.4 224.9 L122.0 229.3 L122.6 232.7 L123.2 235.7 L123.8 238.2 L124.4 240.6 L125.0 242.7 L125.6 244.6 L126.2 246.5 L126.8 248.1 L127.4 249.7 L128.0 251.2 L128.6 252.6 L129.2 254.0 L129.8 255.2 L130.4 256.4 L131.0 257.6 L131.6 258.7 L132.2 259.7 L132.8 260.7 L133.4 261.7 L134.0 262.6 L134.6 263.5 L135.2 264.3 L135.8 265.2 L136.4 265.9 L137.0 266.7 L137.6 267.4 L138.2 268.1 L138.8 268.8 L139.4 269.4 L140.0 270.0 L140.6 270.6 L141.2 271.2 L141.8 271.7 L142.4 272.2 L143.0 272.7 L143.6 273.2 L144.2 273.7 L144.8 274.1 L145.4 274.5 L146.0 274.9 L146.6 275.3 L147.2 275.7 L147.8 276.0 L148.4 276.4 L149.0 276.7 L149.6 277.0 L150.2 277.3 L150.8 277.6 L151.4 277.8 L152.0 278.1 L152.6 278.3 L153.2 278.6 L153.8 278.8 L154.4 279.0 L155.0 279.1 L155.6 279.3 L156.2 279.5 L156.8 279.6 L157.4 279.8 L158.0 279.9 L158.6 280.0 L159.2 280.1 L159.8 280.2 L160.4 280.3 L161.0 280.4 L161.6 280.4 L162.2 280.5 L162.8 280.5 L163.4 280.6 L164.0 280.6 L164.6 280.6 L165.2 280.6 L165.8 280.6 L166.4 280.6 L167.0 280.6 L167.6 280.5 L168.2 280.5 L168.8 280.5 L169.4 280.4 L170.0 280.4 L170.6 280.3 L171.2 280.2 L171.8 280.1 L172.4 280.0 L173.0 279.9 L173.6 279.8 L174.2 279.7 L174.8 279.6 L175.4 279.5 L176.0 279.4 L176.6 279.2 L177.2 279.1 L177.8 278.9 L178.4 278.8 L179.0 278.6 L179.6 278.4 L180.2 278.3 L180.8 278.1 L181.4 277.9 L182.0 277.7 L182.6 277.5 L183.2 277.3 L183.8 277.1 L184.4 276.9 L185.0 276.7 L185.6 276.4 L186.2 276.2 L186.8 276.0 L187.4 275.7 L188.0 275.5 L188.6 275.3 L189.2 275.0 L189.8 274.8 L190.4 274.5 L191.0 274.2 L191.6 274.0 L192.2 273.7 L192.8 273.4 L193.4 273.2 L194.0 272.9 L194.6 272.6 L195.2 272.3 L195.8 272.1 L196.4 271.8 L197.0 271.5 L197.6 271.2 L198.2 270.9 L198.8 270.6 L199.4 270.3 L200.0 270.0 L200.6 269.7 L201.2 269.4 L201.8 269.1 L202.4 268.8 L203.0 268.5 L203.6 268.2 L204.2 267.9 L204.8 267.6 L205.4 267.3 L206.0 267.0 L206.6 266.6 L207.2 266.3 L207.8 266.0 L208.4 265.7 L209.0 265.4 L209.6 265.1 L210.2 264.8 L210.8 264.5 L211.4 264.2 L212.0 263.9 L212.6 263.6 L213.2 263.4 L213.8 263.1 L214.4 262.8 L215.0 262.5 L215.6 262.2 L216.2 262.0 L216.8 261.7 L217.4 261.4 L218.0 261.2 L218.6 260.9 L219.2 260.7 L219.8 260.4 L220.4 260.2 L221.0 259.9 L221.6 259.7 L222.2 259.5 L222.8 259.3 L223.4 259.1 L224.0 258.9 L224.6 258.7 L225.2 258.5 L225.8 258.4 L226.4 258.2 L227.0 258.0 L227.6 257.9 L228.2 257.8 L228.8 257.6 L229.4 257.5 L230.0 257.4 L230.6 257.3 L231.2 257.3 L231.8 257.2 L232.4 257.1 L233.0 257.1 L233.6 257.1 L234.2 257.1 L234.8 257.1 L235.4 257.1 L236.0 257.1 L236.6 257.1 L237.2 257.2 L237.8 257.2 L238.4 257.3 L239.0 257.4 L239.6 257.5 L240.2 257.7 L240.8 257.8 L241.4 257.9 L242.0 258.1 L242.6 258.3 L243.2 258.5 L243.8 258.7 L244.4 258.9 L245.0 259.2 L245.6 259.4 L246.2 259.7 L246.8 260.0 L247.4 260.3 L248.0 260.6 L248.6 261.0 L249.2 261.3 L249.8 261.7 L250.4 262.1 L251.0 262.4 L251.6 262.9 L252.2 263.3 L252.8 263.7 L253.4 264.2 L254.0 264.6 L254.6 265.1 L255.2 265.6 L255.8 266.1 L256.4 266.6 L257.0 267.2 L257.6 267.7 L258.2 268.3 L258.8 268.8 L259.4 269.4 L260.0 270.0 L260.6 270.6 L261.2 271.2 L261.8 271.9 L262.4 272.5 L263.0 273.1 L263.6 273.8 L264.2 274.5 L264.8 275.2 L265.4 275.9 L266.0 276.6 L266.6 277.3 L267.2 278.0 L267.8 278.7 L268.4 279.5 L269.0 280.3 L269.6 281.0 L270.2 281.8 L270.8 282.6 L271.4 283.4 L272.0 284.2 L272.6 285.0 L273.2 285.8 L273.8 286.6 L274.4 287.5 L275.0 288.3 L275.6 289.2 L276.2 290.0 L276.8 290.9 L277.4 291.8 L278.0 292.6 L278.6 293.5 L279.2 294.4 L279.8 295.3 L280.4 296.2 L281.0 297.2 L281.6 298.1 L282.2 299.0 L282.8 300.0 L283.4 300.9 L284.0 301.9 L284.6 302.8 L285.2 303.8 L285.8 304.8 L286.4 305.7 L287.0 306.7 L287.6 307.7 L288.2 308.7 L288.8 309.7 L289.4 310.7 L290.0 311.7 L290.6 312.8 L291.2 313.8 L291.8 314.8 L292.4 315.8 L293.0 316.9 L293.6 317.9 L294.2 319.0 L294.8 320.1 L295.4 321.1 L296.0 322.2 L296.6 323.3 L297.2 324.3 L297.8 325.4 L298.4 326.5 L299.0 327.6 L299.6 328.7 L300.2 329.8 L300.8 330.9 L301.4 332.0 L302.0 333.2 L302.6 334.3 L303.2 335.4 L303.8 336.5 L304.4 337.7 L305.0 338.8 L305.6 340.0 L306.2 341.1 L306.8 342.3 L307.4 343.4 L308.0 344.6 L308.6 345.8 L309.2 346.9 L309.8 348.1 L310.4 349.3 L311.0 350.5" style="fill:none"/><path class="p dash" d="M90 210 L430 210" opacity=".5"/><path class="p blue" d="M104.0 150.0 L308.0 150.0"/><path class="p red dash" d="M140.0 150.0 L140.0 270.0"/><circle cx="200.0" cy="150.0" r="6" class="p gold"/><text x="210.0" y="140.0" class="s">P</text><circle cx="260.0" cy="150.0" r="6" class="p gold"/><text x="270.0" y="140.0" class="s">Q</text><circle cx="140.0" cy="150.0" r="6" class="p room"/><text x="150.0" y="140.0" class="s"></text><circle cx="140.0" cy="270.0" r="6" class="p rust"/><text x="150.0" y="288.0" class="s">P + Q</text><text x="440" y="110" class="s">1 the line through P and Q</text><text x="440" y="130" class="s">meets the curve once more</text><text x="440" y="170" class="s">2 flip that point over the</text><text x="440" y="190" class="s">x-axis: that is P + Q</text><text x="440" y="240" class="s">Drawn here over the real</text><text x="440" y="260" class="s">numbers; cryptography does</text><text x="440" y="280" class="s">the same sums modulo a prime.</text><text x="30" y="390" class="s">y² = x³ − x + 1, with P = (0, 1) and Q = (1, 1): the line meets the curve again at (−1, 1), so P + Q = (−1, −1).</text></g></svg><figcaption>Sketched for this page. Computed with the formulas on this page.</figcaption></figure>

## The named curves

| Curve | Field prime | Equation | Cofactor | Where from |
|---|---|---|---|---|
| Curve25519 | $2^{255} - 19$ | Montgomery, $A = 486662$ | 8 | Bernstein (2006), RFC 7748 |
| Curve448 | $2^{448} - 2^{224} - 1$ | Montgomery, $A = 156326$ | 4 | Hamburg (2015), RFC 7748 |
| P-256 / P-384 / P-521 | special shape; P-521 uses $2^{521} - 1$ | Weierstrass, $a = -3$ | 1 | NIST (1999), now SP 800-186 |
| P-192 / P-224 | special shape | Weierstrass, $a = -3$ | 1 | NIST (1999), now SP 800-186 |
| secp256k1 | $2^{256} - 2^{32} - 977$ | $y^2 = x^3 + 7$ | 1 | Certicom, SEC 2 (2000) |
| Brainpool | no special shape, 160 to 512 bits | Weierstrass | 1 | ECC Brainpool (2005), RFC 5639 |

**Curve25519 and Curve448.** $A = 486662$ is the smallest $A$, with $A - 2$
divisible by 4, that gives the curve cofactor 8 and its twist cofactor 4
(RFC 7748, appendix A), which leaves the designer little room to steer the
result. RFC 7748 (2016) defines X25519 and X448, and RFC 8032 (2017)
defines Ed25519 and Ed448. Curve448 gives about 224-bit security. SP 800-186
lists both curves, and FIPS 186-5 approves Ed25519 and Ed448.

**NIST P-curves.** FIPS 186-2 (2000) made them the federal curves, and
P-256 is still the usual curve for ECDSA in TLS certificates, smart cards
and FIPS modules. The special primes, such as the
[Mersenne prime](Mersenne-Primes.md) $2^{521} - 1$, make reduction fast.
NIST IR 8547 (final, October 2026) deprecates them after 2030 and
disallows them after 2035, with all other quantum-vulnerable public-key
algorithms. SP 800-186 keeps P-192 for legacy use only, such as checking
old signatures. P-224 is still allowed there, at NIST's 112-bit floor.

**The seeds.** Each P-curve's $b$ was made by hashing a 160-bit seed with
SHA-1, and anyone can check that (the example does). The seeds came with no
explanation, so whoever chose them could have tried seed after seed until
a curve had a property they wanted. SafeCurves calls such curves
"manipulatable". No weakness has been found. In October 2026 a team at
Anthropic showed that the seeds of P-192 to P-521 come out of the C
library's `lrand48` generator, started from Unix timestamps in 1997 and
1998. P-256's seed is the 1,842nd 20-byte block of a run started at 16
August 1997, 01:52:34 UTC. Still open: why that block was taken (block 876
also gives a prime-order curve) and how the base points were chosen.

**secp256k1.** With $a = 0$ it has an extra fast map (the GLV endomorphism)
that speeds up scalar multiplication. Bitcoin uses it for ECDSA and, since
Taproot (2021), for Schnorr signatures (BIP 340); Ethereum uses it too.
SP 800-186 allows it only for blockchain uses. Its constants are small and
simple but were never fully explained; SafeCurves rates it "somewhat
rigid".

**Brainpool.** RFC 5639 (2010) came from Germany's BSI and secunet. Each
size has a random "r1" curve and an isomorphic "t1" version with $a = -3$.
The primes come from the digits of $\pi$ and the coefficients from $e$. With no
special shape, the primes are slower to reduce. TLS can use the curves
(RFC 7027, RFC 8734), and SP 800-186 allows the 224-bit and larger ones for
interoperability.

## Why curve choice matters

- **Twist security.** A ladder that works on $x$ alone will compute on the
  curve's twist when handed an $x$ that isn't on the curve. If the twist's
  order has small factors, an attacker learns the key a piece at a time.
  SafeCurves puts the best attack on the twist at $2^{124.3}$ for Curve25519,
  $2^{120.3}$ for P-256, $2^{109.5}$ for secp256k1, $2^{58.4}$ for P-224 and $2^{44.5}$
  for brainpoolP256t1. SP 800-186 itself warns about P-224's twist. Code
  that checks every incoming point is safe from this.
- **Complete formulas.** Weierstrass addition has special cases ($P = Q$,
  $P = -P$, $O$). Code that branches on them leaks timing or gives wrong
  answers on rare inputs. Edwards curves have one formula for everything.
  Prime-order Weierstrass curves have complete formulas too (Renes, Costello
  and Batina, 2016), at some cost in speed.
- **No special structure.** A small embedding degree lets the MOV attack
  (1993) move the discrete log into a finite field, and a curve with
  exactly $p$ points falls in polynomial time (Smart, 1999).
- **SafeCurves** (Bernstein and Lange) checks all of this plus rigidity.
  Curve25519 and Ed448-Goldilocks pass. The NIST curves, secp256k1 and
  Brainpool each fail at least one test. That doesn't make them broken; it
  makes safe code for them harder to write.

## Example (Python)

Point addition and double-and-add on a toy curve, then checks on P-256:
the generator is on the curve, $n \cdot G = O$, $b$ comes from the seed, and the
seed comes from `lrand48`.

```python
from hashlib import sha1

def add(P, Q):
    # None is the point at infinity, the group's zero
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0: return None    # P + (-P)
    if P == Q: m = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else: m = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (m * m - x1 - x2) % p
    return x3, (m * (x1 - x3) - y1) % p

def mul(k, P):
    # double-and-add, one bit of k at a time
    R = None
    while k:
        if k & 1: R = add(R, P)
        P = add(P, P)
        k >>= 1
    return R

# toy curve y^2 = x^3 + 2x + 2 over F_17: 19 points counting infinity
p, a = 17, 2
G = (5, 1)
print([mul(k, G) for k in (1, 2, 3)])   # [(5, 1), (6, 3), (10, 6)]
print(mul(18, G), mul(19, G))           # (5, 16) None: 18G = -G, 19G = O

# P-256, constants from SP 800-186 section 3.2.1.3
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
a = p - 3
b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
seed = 0xc49d360886e704936a6678e1139d26b7819f7e90
x, y = G
print(y * y % p == (x**3 + a * x + b) % p, mul(n, G))   # True None

# b from the seed (SP 800-186 appendix C.3): c is the low 95 bits of
# SHA-1(seed) followed by SHA-1(seed + 1), and b*b*c = -27 mod p
H = lambda s: int.from_bytes(sha1(s.to_bytes(20, "big")).digest(), "big")
c = (H(seed) % 2**95) << 160 | H(seed + 1)
print(b * b * c % p == p - 27)                         # True

# the seed: lrand48 started from Unix time 871696354 (1997-08-16 01:52:34
# UTC), one byte (lrand48() >> 23) per call, 20-byte block number 1842
s, out = 871696354 << 16 | 0x330e, []
for _ in range(20 * 1842):
    s = (0x5deece66d * s + 0xb) % 2**48
    out.append(s >> 40)
print(bytes(out[-20:]).hex() == "%040x" % seed)        # True
```

This `add` is not constant time and checks nothing about its inputs. It is
for reading, not for keys.

## Security notes

- Check every point you receive: on the curve, not O, and in the right
  subgroup. X25519 is built so it doesn't need this; ECDH on Weierstrass
  curves does. In 2015 invalid points pulled server keys out of TLS built
  on two popular Java libraries.
- The cofactor lets a point carry a small extra part. Protocols that need a
  prime-order group on Curve25519 or Curve448 should use ristretto255 or
  decaf448 (RFC 9496).
- Use a library's constant-time scalar multiplication. Timing and cache
  leaks have recovered keys from real ECDSA code.
- Every curve here falls to Shor's algorithm, at any size.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: adding points on a toy curve"

    The curve from the example below: $y^2 = x^3 + 2x + 2$ over the integers mod 17, base point $G = (5, 1)$.

    | Step | Formula | Value |
    |---|---|---|
    | Is $G$ on the curve? | $1^2 = 1$ and $5^3 + 2 \cdot 5 + 2 = 137 = 8 \cdot 17 + 1$ | yes |
    | $2G$: tangent slope | $m = (3 \cdot 5^2 + 2) / (2 \cdot 1) = 77 \cdot 2^{-1} = 9 \cdot 9$ | $81 \bmod 17 = 13$ |
    | $2G$: $x$ | $13^2 - 5 - 5 = 159$ | 6 |
    | $2G$: $y$ | $13 \cdot (5 - 6) - 1 = -14$ | 3 |
    | $3G = 2G + G$: slope | $(3 - 1)/(6 - 5)$ | 2 |
    | $3G$ | $x = 4 - 6 - 5 = -7$, $y = 2 \cdot (5 - 10) - 1 = -11$ | $(10, 6)$ |

    $2^{-1} \bmod 17 = 9$ because $2 \cdot 9 = 18 \equiv 1$. Carrying on, the multiples of $G$ visit all 18 other points and
    $19G = O$: the group has 19 elements, within Hasse's bound $\lvert 19 - 18 \rvert \le 2\sqrt{17} \approx 8.2$.

??? abstract "The math, with formulas"

    On $E: y^2 = x^3 + ax + b$ over $\mathbb{F}_p$ ($p > 3$, $4a^3 + 27b^2 \ne 0$ so the curve has no cusps or crossings):

    $$
    \begin{aligned}
    P + Q: \quad & m = \frac{y_2 - y_1}{x_2 - x_1} & 2P: \quad & m = \frac{3x_1^2 + a}{2y_1} \\
    & x_3 = m^2 - x_1 - x_2 & & y_3 = m(x_1 - x_3) - y_1 \\
    & -P = (x, -y), \quad P + O = P, \quad P + (-P) = O
    \end{aligned}
    $$

    - **Hasse's theorem:** $\lvert \#E(\mathbb{F}_p) - (p + 1) \rvert \le 2\sqrt{p}$. Counting the points exactly takes Schoof's algorithm
      (polynomial time), which is how curve designers find a prime order.
    - **Projective coordinates** $(X : Y : Z)$ with $x = X/Z$, $y = Y/Z$ avoid a slow inversion on every step.
    - **Montgomery ladder** on $By^2 = x^3 + Ax^2 + x$ uses $x$ only: $x(2P)$ and $x(P + Q)$ from $x(P), x(Q), x(P - Q)$.
    - **Security:** $d \cdot G$ takes about $\log_2 n$ doublings; getting $d$ back takes about $\sqrt{\pi n / 4}$ steps with
      Pollard's rho, so a 256-bit $n$ gives about $2^{128}$.

??? tip "Watch it step by step: the multiples of G"

    <div class="mars-steps" markdown>

    1. $1G = (5, 1)$. The private key $d$ is "how many times"; the public key is the point you land on.
    2. $2G = (6, 3)$, by the tangent at $G$. $3G = (10, 6)$, by the line through $G$ and $2G$.
    3. $4G = (3, 1)$, $5G = (9, 16)$, $6G = (16, 13)$, $7G = (0, 6)$. The points jump around with no visible pattern.
    4. $13G = (16, 4)$. Double-and-add gets there from 13 = `1101` in binary: $G, 3G, 6G, 12G, 13G$.
    5. $18G = (5, 16) = -G$, the mirror image of $G$.
    6. $19G = O$, the point at infinity. Going back from a point to its $d$ is the hard part.

    </div>

??? info "The math underneath"

    - **Groups:** closure, an identity ($O$), inverses, and associativity, which is the non-obvious one for
      the chord-and-tangent rule.
    - **Finite fields** $\mathbb{F}_p$ and modular inverses (extended Euclid or $a^{p-2}$).
    - **The ECDLP** and why the number field sieve has no analogue here: [hard problems](Hard-Problems.md).
    - **Pairings** (Weil, Tate) map curve points to a finite field; they power BLS signatures and break
      curves with a small embedding degree (MOV attack).
    - **Isogenies** connect curves to each other; see SIDH and CSIDH in [hard problems](Hard-Problems.md).

## See also

- [Hard problems](Hard-Problems.md): the elliptic-curve discrete log and how it is attacked
- [ECDH](../01-key-exchange/ECDH.md) / [ECDSA](../02-signatures/ECDSA.md) / [EdDSA](../02-signatures/EdDSA.md) / [Schnorr](../02-signatures/Schnorr.md): what is built on these curves
- [Mersenne primes](Mersenne-Primes.md): the field of P-521

## References

- [NIST SP 800-186](https://csrc.nist.gov/pubs/sp/800/186/final) (February 2023): sections 3.2.1.1 to 3.2.1.3, Table 2, appendices C.3 and H
- [FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) / [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/final) (final, October 2026), Tables 2 and 4
- [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748) / [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) / [RFC 9496](https://www.rfc-editor.org/rfc/rfc9496)
- [RFC 5639](https://www.rfc-editor.org/rfc/rfc5639) / [RFC 7027](https://www.rfc-editor.org/rfc/rfc7027) / [RFC 8734](https://www.rfc-editor.org/rfc/rfc8734)
- [SEC 2, version 2.0](https://www.secg.org/sec2-v2.pdf) / [BIP 340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [Bernstein, "Curve25519: new Diffie-Hellman speed records" (PKC 2006)](https://cr.yp.to/ecdh/curve25519-20060209.pdf) / [Hamburg, "Ed448-Goldilocks, a new elliptic curve" (2015)](https://eprint.iacr.org/2015/625)
- Montgomery (Mathematics of Computation, 1987) / Edwards (Bulletin of the AMS, 2007) / Bernstein and Lange, "Faster addition and doubling on elliptic curves" (ASIACRYPT 2007) / Bernstein, Birkner, Joye, Lange and Peters, "Twisted Edwards curves" (AFRICACRYPT 2008)
- [Renes, Costello and Batina, "Complete addition formulas for prime order elliptic curves" (EUROCRYPT 2016)](https://eprint.iacr.org/2015/1060)
- Jager, Schwenk and Somorovsky, "Practical Invalid Curve Attacks on TLS-ECDH" (ESORICS 2015)
- Menezes, Okamoto and Vanstone (IEEE Trans. Inf. Theory, 1993) / Smart (Journal of Cryptology, 1999)
- [Bernstein and Lange, SafeCurves](https://safecurves.cr.yp.to/) (twist, ladder, completeness and rigidity pages)

*Weaker sources:* [Anthropic Frontier Red Team, the origin of the NIST
curve seeds (October 2026)](https://www.anthropic.com/research/ecdsa-curve-origins),
a research blog post, for the `lrand48` timestamps and block numbers; the
example reproduces P-256's seed from them.
