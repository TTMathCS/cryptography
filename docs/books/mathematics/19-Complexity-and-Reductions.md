# 19. Complexity, Reductions and Hard Problems

*Cryptography rests on problems that are believed hard: factoring, discrete
logarithms, learning with errors. Nobody has proved any of them hard, and proving
it would settle the most famous open question in computer science. What
cryptographers can do is measure cost precisely, relate problems to each other by
reductions, and build everything from as few assumptions as possible. This chapter
explains running time and the classes P and NP, why NP-hardness is not what
cryptography needs, one-way functions and what follows from them, hard-core bits,
how to read a reduction and its tightness, random self-reducibility, and the map of
assumptions with what is known, and not known, between them. Along the way we factor
an RSA modulus from its private exponent, decrypt RSA with an oracle that leaks one
bit, and break the decision Diffie-Hellman assumption in a group where it is false.*

!!! abstract "In this chapter"
    **You will learn:**

    - running time measured in bits, and polynomial, subexponential and exponential
      cost, with the numbers behind key sizes;
    - P, NP and NP-completeness, and why cryptography needs average-case hardness;
    - one-way functions and the primitives equivalent to them, and Impagliazzo's
      five worlds;
    - hard-core bits, and a working attack that decrypts RSA from a parity leak;
    - reductions read carefully: advantage, running time, tightness and bit
      security, with the reduction from the RSA private key to factoring;
    - random self-reducibility of the discrete logarithm, demonstrated;
    - the map of assumptions, from factoring to LWE and syndrome decoding, and a
      group in which DDH fails.

    **You need:** [Chapter 16](16-Probability.md) (advantage, negligible functions),
    [Chapter 4](04-Powers-and-Primitive-Roots.md) (discrete logarithms) and
    [Chapter 2](02-Divisibility-Primes-and-Factoring.md) (RSA's arithmetic).

    **Levels:** §19.1 to §19.3 are for beginners, §19.4 to §19.6 are intermediate,
    §19.7 to §19.9 are expert.

## 19.1 The problem

*Level: beginner.*

Is RSA as hard as factoring? After almost fifty years, nobody knows. Breaking RSA
would follow from factoring, but an attacker might be able to take $e$-th roots
modulo $N$ without factoring $N$; no such method is known, and none has been ruled
out. The same uncertainty runs through the whole field. The security of every
public-key system in use depends on a conjecture, and the most we can prove is
relative: *if* this problem is hard, *then* this scheme is secure.

To say that precisely we need a way to measure cost, a vocabulary of problems, and a
discipline for comparing them. That is complexity theory, as cryptographers use it.

## 19.2 Running time

*Level: beginner.*

The cost of an algorithm is counted in basic operations as a function of the
**input size in bits**, not of the numbers themselves. Trial division of $N$ takes up
to $\sqrt{N} = 2^{n/2}$ steps for an $n$-bit $N$: exponential in the size, though it
sounds modest as "square root of $N$".

Three growth rates matter:

- **Polynomial**, $n^c$: multiplication ($n^2$ or less), modular exponentiation
  ($n^3$), primality testing (Chapter 6). Feasible for honest users.
- **Exponential**, $2^{cn}$: exhaustive key search, Pollard's rho on a curve
  ($2^{n/2}$), lattice sieving ($2^{0.292n}$). Infeasible for large $n$.
- **Subexponential**, written with the **L-notation**
  $$L_N[\alpha, c] = \exp\bigl((c + o(1))(\ln N)^{\alpha}(\ln \ln N)^{1 - \alpha}\bigr),$$
  between polynomial ($\alpha = 0$) and exponential ($\alpha = 1$). The number field
  sieve factors $N$ in $L_N[1/3, 1.923]$ (*Cryptanalysis*
  [chapter 11](../cryptanalysis/11-Factoring.md)).

```python
# Polynomial, subexponential and exponential growth: the cost exponents behind key sizes.
from math import log, log2, exp
for bits in (64, 128, 256, 512, 1024, 2048, 3072):
    lnN = bits * log(2)
    nfs = (64 / 9) ** (1 / 3) * lnN ** (1 / 3) * log(lnN) ** (2 / 3)      # L_N[1/3, 1.923]
    print(bits, round(3 * log2(bits), 1), round(nfs / log(2), 1), bits // 2, bits)
```

```text
64 18.0 23.9 32 64
128 21.0 33.7 64 128
256 24.0 46.7 128 256
512 27.0 63.9 256 512
1024 30.0 86.8 512 1024
2048 33.0 116.9 1024 2048
3072 34.8 138.7 1536 3072
```

The columns are the size $n$ in bits, $\log_2$ of $n^3$ (a polynomial cost), $\log_2$
of the number field sieve's $L_N[1/3, 1.923]$ without its $o(1)$, $n/2$ (generic
attacks on an $n$-bit group) and $n$ (exhaustive search). For RSA-2048 the formula
gives about $2^{117}$, which is why NIST rates it at 112 bits of security, and
RSA-3072 about $2^{139}$, rated 128; the published ratings fold in the $o(1)$ and
practical constants. Subexponential is the reason RSA keys are ten times longer than
elliptic-curve keys of the same strength.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Log of cost against key size for three growth rates: polynomial n cubed stays near the bottom, the number field sieve curve rises like the cube root, and exhaustive search rises linearly" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="220" x2="600" y2="220"/><line x1="70" y1="220" x2="70" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="2" d="M72.6 208.6 L74.2 206.6 L75.8 205.3 L77.5 204.3 L79.1 203.5 L80.7 202.8 L82.3 202.2 L83.9 201.7 L85.5 201.3 L87.2 200.8 L88.8 200.5 L90.4 200.1 L92.0 199.8 L93.6 199.5 L95.2 199.3 L96.9 199.0 L98.5 198.8 L100.1 198.5 L101.7 198.3 L103.3 198.1 L104.9 197.9 L106.6 197.7 L108.2 197.6 L109.8 197.4 L111.4 197.2 L113.0 197.1 L114.6 196.9 L116.3 196.8 L117.9 196.6 L119.5 196.5 L121.1 196.4 L122.7 196.2 L124.3 196.1 L126.0 196.0 L127.6 195.9 L129.2 195.7 L130.8 195.6 L132.4 195.5 L134.0 195.4 L135.7 195.3 L137.3 195.2 L138.9 195.1 L140.5 195.0 L142.1 194.9 L143.7 194.8 L145.4 194.8 L147.0 194.7 L148.6 194.6 L150.2 194.5 L151.8 194.4 L153.4 194.3 L155.1 194.3 L156.7 194.2 L158.3 194.1 L159.9 194.0 L161.5 194.0 L163.1 193.9 L164.8 193.8 L166.4 193.7 L168.0 193.7 L169.6 193.6 L171.2 193.5 L172.8 193.5 L174.5 193.4 L176.1 193.4 L177.7 193.3 L179.3 193.2 L180.9 193.2 L182.5 193.1 L184.2 193.0 L185.8 193.0 L187.4 192.9 L189.0 192.9 L190.6 192.8 L192.2 192.8 L193.9 192.7 L195.5 192.7 L197.1 192.6 L198.7 192.6 L200.3 192.5 L201.9 192.5 L203.6 192.4 L205.2 192.4 L206.8 192.3 L208.4 192.3 L210.0 192.2 L211.7 192.2 L213.3 192.1 L214.9 192.1 L216.5 192.0 L218.1 192.0 L219.7 191.9 L221.4 191.9 L223.0 191.8 L224.6 191.8 L226.2 191.8 L227.8 191.7 L229.4 191.7 L231.1 191.6 L232.7 191.6 L234.3 191.6 L235.9 191.5 L237.5 191.5 L239.1 191.4 L240.8 191.4 L242.4 191.4 L244.0 191.3 L245.6 191.3 L247.2 191.2 L248.8 191.2 L250.5 191.2 L252.1 191.1 L253.7 191.1 L255.3 191.1 L256.9 191.0 L258.5 191.0 L260.2 191.0 L261.8 190.9 L263.4 190.9 L265.0 190.8 L266.6 190.8 L268.2 190.8 L269.9 190.7 L271.5 190.7 L273.1 190.7 L274.7 190.6 L276.3 190.6 L277.9 190.6 L279.6 190.6 L281.2 190.5 L282.8 190.5 L284.4 190.5 L286.0 190.4 L287.6 190.4 L289.3 190.4 L290.9 190.3 L292.5 190.3 L294.1 190.3 L295.7 190.2 L297.3 190.2 L299.0 190.2 L300.6 190.2 L302.2 190.1 L303.8 190.1 L305.4 190.1 L307.0 190.0 L308.7 190.0 L310.3 190.0 L311.9 190.0 L313.5 189.9 L315.1 189.9 L316.7 189.9 L318.4 189.9 L320.0 189.8 L321.6 189.8 L323.2 189.8 L324.8 189.7 L326.4 189.7 L328.1 189.7 L329.7 189.7 L331.3 189.6 L332.9 189.6 L334.5 189.6 L336.2 189.6 L337.8 189.5 L339.4 189.5 L341.0 189.5 L342.6 189.5 L344.2 189.4 L345.9 189.4 L347.5 189.4 L349.1 189.4 L350.7 189.3 L352.3 189.3 L353.9 189.3 L355.6 189.3 L357.2 189.3 L358.8 189.2 L360.4 189.2 L362.0 189.2 L363.6 189.2 L365.3 189.1 L366.9 189.1 L368.5 189.1 L370.1 189.1 L371.7 189.1 L373.3 189.0 L375.0 189.0 L376.6 189.0 L378.2 189.0 L379.8 188.9 L381.4 188.9 L383.0 188.9 L384.7 188.9 L386.3 188.9 L387.9 188.8 L389.5 188.8 L391.1 188.8 L392.7 188.8 L394.4 188.8 L396.0 188.7 L397.6 188.7 L399.2 188.7 L400.8 188.7 L402.4 188.7 L404.1 188.6 L405.7 188.6 L407.3 188.6 L408.9 188.6 L410.5 188.6 L412.1 188.5 L413.8 188.5 L415.4 188.5 L417.0 188.5 L418.6 188.5 L420.2 188.4 L421.8 188.4 L423.5 188.4 L425.1 188.4 L426.7 188.4 L428.3 188.3 L429.9 188.3 L431.5 188.3 L433.2 188.3 L434.8 188.3 L436.4 188.3 L438.0 188.2 L439.6 188.2 L441.2 188.2 L442.9 188.2 L444.5 188.2 L446.1 188.1 L447.7 188.1 L449.3 188.1 L450.9 188.1 L452.6 188.1 L454.2 188.1 L455.8 188.0 L457.4 188.0 L459.0 188.0 L460.6 188.0 L462.3 188.0 L463.9 188.0 L465.5 187.9 L467.1 187.9 L468.7 187.9 L470.4 187.9 L472.0 187.9 L473.6 187.9 L475.2 187.8 L476.8 187.8 L478.4 187.8 L480.1 187.8 L481.7 187.8 L483.3 187.8 L484.9 187.7 L486.5 187.7 L488.1 187.7 L489.8 187.7 L491.4 187.7 L493.0 187.7 L494.6 187.6 L496.2 187.6 L497.8 187.6 L499.5 187.6 L501.1 187.6 L502.7 187.6 L504.3 187.6 L505.9 187.5 L507.5 187.5 L509.2 187.5 L510.8 187.5 L512.4 187.5 L514.0 187.5 L515.6 187.4 L517.2 187.4 L518.9 187.4 L520.5 187.4 L522.1 187.4 L523.7 187.4 L525.3 187.4 L526.9 187.3 L528.6 187.3 L530.2 187.3 L531.8 187.3 L533.4 187.3 L535.0 187.3 L536.6 187.3 L538.3 187.2 L539.9 187.2 L541.5 187.2 L543.1 187.2 L544.7 187.2 L546.3 187.2 L548.0 187.2 L549.6 187.1 L551.2 187.1 L552.8 187.1 L554.4 187.1 L556.0 187.1 L557.7 187.1 L559.3 187.1 L560.9 187.1 L562.5 187.0 L564.1 187.0 L565.7 187.0 L567.4 187.0 L569.0 187.0 L570.6 187.0 L572.2 187.0 L573.8 186.9 L575.4 186.9 L577.1 186.9 L578.7 186.9 L580.3 186.9 L581.9 186.9 L583.5 186.9 L585.1 186.9 L586.8 186.8 L588.4 186.8 L590.0 186.8"/>
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M80.4 197.3 L82.0 195.6 L83.6 194.0 L85.2 192.6 L86.8 191.2 L88.4 189.9 L90.0 188.7 L91.5 187.5 L93.1 186.3 L94.7 185.3 L96.3 184.2 L97.9 183.2 L99.5 182.2 L101.1 181.3 L102.7 180.4 L104.3 179.5 L105.9 178.6 L107.5 177.8 L109.1 176.9 L110.7 176.1 L112.2 175.4 L113.8 174.6 L115.4 173.8 L117.0 173.1 L118.6 172.4 L120.2 171.7 L121.8 171.0 L123.4 170.3 L125.0 169.6 L126.6 169.0 L128.2 168.3 L129.8 167.7 L131.4 167.0 L133.0 166.4 L134.5 165.8 L136.1 165.2 L137.7 164.6 L139.3 164.0 L140.9 163.5 L142.5 162.9 L144.1 162.3 L145.7 161.8 L147.3 161.2 L148.9 160.7 L150.5 160.2 L152.1 159.6 L153.7 159.1 L155.2 158.6 L156.8 158.1 L158.4 157.6 L160.0 157.1 L161.6 156.6 L163.2 156.1 L164.8 155.6 L166.4 155.2 L168.0 154.7 L169.6 154.2 L171.2 153.7 L172.8 153.3 L174.4 152.8 L175.9 152.4 L177.5 151.9 L179.1 151.5 L180.7 151.0 L182.3 150.6 L183.9 150.2 L185.5 149.7 L187.1 149.3 L188.7 148.9 L190.3 148.5 L191.9 148.1 L193.5 147.7 L195.1 147.2 L196.7 146.8 L198.2 146.4 L199.8 146.0 L201.4 145.6 L203.0 145.2 L204.6 144.9 L206.2 144.5 L207.8 144.1 L209.4 143.7 L211.0 143.3 L212.6 142.9 L214.2 142.6 L215.8 142.2 L217.4 141.8 L218.9 141.5 L220.5 141.1 L222.1 140.7 L223.7 140.4 L225.3 140.0 L226.9 139.7 L228.5 139.3 L230.1 138.9 L231.7 138.6 L233.3 138.2 L234.9 137.9 L236.5 137.6 L238.1 137.2 L239.7 136.9 L241.2 136.5 L242.8 136.2 L244.4 135.9 L246.0 135.5 L247.6 135.2 L249.2 134.9 L250.8 134.5 L252.4 134.2 L254.0 133.9 L255.6 133.6 L257.2 133.3 L258.8 132.9 L260.4 132.6 L261.9 132.3 L263.5 132.0 L265.1 131.7 L266.7 131.4 L268.3 131.1 L269.9 130.7 L271.5 130.4 L273.1 130.1 L274.7 129.8 L276.3 129.5 L277.9 129.2 L279.5 128.9 L281.1 128.6 L282.6 128.3 L284.2 128.0 L285.8 127.7 L287.4 127.5 L289.0 127.2 L290.6 126.9 L292.2 126.6 L293.8 126.3 L295.4 126.0 L297.0 125.7 L298.6 125.4 L300.2 125.2 L301.8 124.9 L303.4 124.6 L304.9 124.3 L306.5 124.0 L308.1 123.8 L309.7 123.5 L311.3 123.2 L312.9 122.9 L314.5 122.7 L316.1 122.4 L317.7 122.1 L319.3 121.9 L320.9 121.6 L322.5 121.3 L324.1 121.1 L325.6 120.8 L327.2 120.5 L328.8 120.3 L330.4 120.0 L332.0 119.7 L333.6 119.5 L335.2 119.2 L336.8 119.0 L338.4 118.7 L340.0 118.4 L341.6 118.2 L343.2 117.9 L344.8 117.7 L346.3 117.4 L347.9 117.2 L349.5 116.9 L351.1 116.7 L352.7 116.4 L354.3 116.2 L355.9 115.9 L357.5 115.7 L359.1 115.4 L360.7 115.2 L362.3 114.9 L363.9 114.7 L365.5 114.4 L367.1 114.2 L368.6 114.0 L370.2 113.7 L371.8 113.5 L373.4 113.2 L375.0 113.0 L376.6 112.8 L378.2 112.5 L379.8 112.3 L381.4 112.1 L383.0 111.8 L384.6 111.6 L386.2 111.4 L387.8 111.1 L389.3 110.9 L390.9 110.7 L392.5 110.4 L394.1 110.2 L395.7 110.0 L397.3 109.7 L398.9 109.5 L400.5 109.3 L402.1 109.1 L403.7 108.8 L405.3 108.6 L406.9 108.4 L408.5 108.2 L410.0 107.9 L411.6 107.7 L413.2 107.5 L414.8 107.3 L416.4 107.1 L418.0 106.8 L419.6 106.6 L421.2 106.4 L422.8 106.2 L424.4 106.0 L426.0 105.7 L427.6 105.5 L429.2 105.3 L430.8 105.1 L432.3 104.9 L433.9 104.7 L435.5 104.4 L437.1 104.2 L438.7 104.0 L440.3 103.8 L441.9 103.6 L443.5 103.4 L445.1 103.2 L446.7 103.0 L448.3 102.8 L449.9 102.5 L451.5 102.3 L453.0 102.1 L454.6 101.9 L456.2 101.7 L457.8 101.5 L459.4 101.3 L461.0 101.1 L462.6 100.9 L464.2 100.7 L465.8 100.5 L467.4 100.3 L469.0 100.1 L470.6 99.9 L472.2 99.7 L473.7 99.5 L475.3 99.3 L476.9 99.1 L478.5 98.9 L480.1 98.7 L481.7 98.5 L483.3 98.3 L484.9 98.1 L486.5 97.9 L488.1 97.7 L489.7 97.5 L491.3 97.3 L492.9 97.1 L494.4 96.9 L496.0 96.7 L497.6 96.5 L499.2 96.3 L500.8 96.1 L502.4 95.9 L504.0 95.7 L505.6 95.6 L507.2 95.4 L508.8 95.2 L510.4 95.0 L512.0 94.8 L513.6 94.6 L515.2 94.4 L516.7 94.2 L518.3 94.0 L519.9 93.8 L521.5 93.7 L523.1 93.5 L524.7 93.3 L526.3 93.1 L527.9 92.9 L529.5 92.7 L531.1 92.5 L532.7 92.3 L534.3 92.2 L535.9 92.0 L537.4 91.8 L539.0 91.6 L540.6 91.4 L542.2 91.2 L543.8 91.1 L545.4 90.9 L547.0 90.7 L548.6 90.5 L550.2 90.3 L551.8 90.2 L553.4 90.0 L555.0 89.8 L556.6 89.6 L558.1 89.4 L559.7 89.3 L561.3 89.1 L562.9 88.9 L564.5 88.7 L566.1 88.5 L567.7 88.4 L569.3 88.2 L570.9 88.0 L572.5 87.8 L574.1 87.7 L575.7 87.5 L577.3 87.3 L578.9 87.1 L580.4 87.0 L582.0 86.8 L583.6 86.6 L585.2 86.4 L586.8 86.3 L588.4 86.1 L590.0 85.9"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" d="M70.2 219.5 L71.8 214.8 L73.4 210.0 L75.0 205.3 L76.7 200.5 L78.3 195.8 L79.9 191.0 L81.5 186.3 L83.2 181.5 L84.8 176.8 L86.4 172.0 L88.0 167.3 L89.7 162.5 L91.3 157.8 L92.9 153.0 L94.5 148.3 L96.2 143.5 L97.8 138.8 L99.4 134.1 L101.0 129.3 L102.7 124.6 L104.3 119.8 L105.9 115.1 L107.5 110.3 L109.2 105.6 L110.8 100.8 L112.4 96.1 L114.0 91.3 L115.6 86.6 L117.3 81.8 L118.9 77.1 L120.5 72.3 L122.1 67.6 L123.8 62.8 L125.4 58.1 L127.0 53.3 L128.6 48.6 L130.3 43.8 L131.9 39.1 L133.5 34.3"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 4" d="M70.2 219.1 L71.8 209.6 L73.4 200.1 L75.0 190.6 L76.7 181.1 L78.3 171.6 L79.9 162.1 L81.5 152.6 L83.2 143.1 L84.8 133.6 L86.4 124.1 L88.0 114.6 L89.7 105.1 L91.3 95.6 L92.9 86.1 L94.5 76.6 L96.2 67.1 L97.8 57.6 L99.4 48.1 L101.0 38.6"/>
<circle cx="569.2" cy="98.4" r="5" class="acc-fill"/>
<circle cx="111.6" cy="98.4" r="5" class="acc-fill"/>
<line x1="70" y1="98.4" x2="600" y2="98.4" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity=".5"/>
<text x="121.6" y="90.4" font-size="12">256-bit curve</text>
<text x="561.2" y="88.4" font-size="12" text-anchor="end">RSA-3072</text>
<text x="313.8" y="140.8" font-size="12" class="acc">number field sieve</text>
<text x="427.5" y="180.4" font-size="12">n³ (honest use)</text>
<text x="72.5" y="30" font-size="12">2ⁿ</text>
<text x="141.0" y="30" font-size="12">2^(n/2)</text>
<text x="70.0" y="238" text-anchor="middle" font-size="12">0</text>
<text x="236.4" y="238" text-anchor="middle" font-size="12">1024</text>
<text x="402.8" y="238" text-anchor="middle" font-size="12">2048</text>
<text x="569.2" y="238" text-anchor="middle" font-size="12">3072</text>
<text x="62" y="224.0" text-anchor="end" font-size="12">2⁰</text>
<text x="62" y="163.2" text-anchor="end" font-size="12">2⁶⁴</text>
<text x="62" y="102.4" text-anchor="end" font-size="12">2¹²⁸</text>
<text x="62" y="41.6" text-anchor="end" font-size="12">2¹⁹²</text>
<text x="335" y="256" text-anchor="middle" font-size="12">input size n in bits</text>
</svg>
<figcaption>Figure 19.1. Three kinds of cost, as log₂ of the work against the input size in bits. Honest operations are polynomial (bottom); generic attacks are exponential (straight lines); the number field sieve is subexponential, which is why RSA needs 3,072 bits where a curve needs 256 for the same 128-bit level (dots).</figcaption>
</figure>

## 19.3 P, NP and NP-completeness

*Level: beginner.*

A **decision problem** asks a yes-or-no question about an input. **P** is the class of
problems decidable in polynomial time. **NP** is the class whose "yes" answers have a
**certificate** checkable in polynomial time: "is $N$ composite?" (certificate: a
factor), "is this Boolean formula satisfiable?" (certificate: an assignment), "does
this code have a codeword of weight at most $w$ with syndrome $s$?" (certificate: the
word).

A problem is **NP-complete** if it is in NP and every NP problem reduces to it in
polynomial time. Stephen Cook (1971) and Leonid Levin (1973) proved that
satisfiability is NP-complete; Richard Karp (1972) added 21 more, including subset
sum; thousands followed, among them syndrome decoding (1978) and, under randomized
reductions, the shortest vector problem (1998). An efficient algorithm for any
NP-complete problem would give one for all of NP.

Whether P = NP is open, and one of the Clay Mathematics Institute's seven Millennium
Prize Problems (2000). If P = NP, then every cipher could be broken efficiently:
"is there a key, starting with these bits, that decrypts this ciphertext to
something with a valid checksum?" is an NP question, and answering it bit by bit
recovers the key. So P ≠ NP is *necessary* for cryptography. It is far from
*sufficient*.

## 19.4 Why NP-hard is not what cryptography needs

*Level: intermediate.*

NP-completeness is about the **worst case**: some instances are hard. A cipher needs
**average-case** hardness: the instances it actually generates, at random, must be
hard almost always. Many NP-complete problems are easy on typical instances; the
Merkle-Hellman knapsack (Chapter 14) was built on an NP-complete problem, and its
instances fell to lattice reduction.

There is a deeper obstacle. Public-key cryptography needs a **trapdoor**: hard
problems whose instances come with a secret that makes them easy. The problems with
that structure tend to lie in $\mathrm{NP} \cap \mathrm{coNP}$: for factoring, a
claimed factorization *and* a claim that a number has no factor below some bound can
both be verified (with primality certificates). If such a problem were NP-complete,
then NP would equal coNP, which is believed false. Gilles Brassard (1979) made this
kind of argument precise for a class of one-way functions. So cryptographic problems
are believed to be hard but *not* NP-hard: they sit in the middle ground, outside P
but below NP-completeness.

## 19.5 One-way functions

*Level: intermediate.*

A **one-way function** $f$ is easy to compute and hard to invert on random inputs:
for every efficient algorithm $\mathcal{A}$,

$$
\Pr_{x}\bigl[f(\mathcal{A}(f(x))) = f(x)\bigr] \text{ is negligible}.
$$

Candidates: multiplication of two random primes (inverting is factoring), modular
exponentiation $x \mapsto g^x$ (discrete logarithm), $x \mapsto \mathrm{SHA\text{-}256}(x)$,
$(A, s, e) \mapsto (A, As + e)$ (LWE).

Their existence is unproved (it implies P ≠ NP), but once one exists, a remarkable
amount follows:

- **pseudorandom generators** (Johan Håstad, Russell Impagliazzo, Leonid Levin and
  Michael Luby, 1999), and conversely;
- **pseudorandom functions** (Oded Goldreich, Shafi Goldwasser and Silvio Micali,
  1986) and pseudorandom permutations (Michael Luby and Charles Rackoff, 1988);
- symmetric encryption, message authentication codes, commitments;
- **digital signatures** (John Rompel, 1990, after Moni Naor and Moti Yung).

Every one of these also implies a one-way function, so they are all equivalent: the
whole of symmetric cryptography, and signatures, stand or fall together. **Public-key
encryption** is different: Russell Impagliazzo and Steven Rudich (1989) showed that it
cannot be built from a one-way function in a "black-box" way. It needs more
structure, a trapdoor.

Impagliazzo (1995) described **five worlds** we might live in: *Algorithmica* (P =
NP), *Heuristica* (NP hard in the worst case but easy on average), *Pessiland* (hard
problems but no one-way functions), *Minicrypt* (one-way functions but no public-key
encryption) and *Cryptomania* (public-key cryptography exists). Practice bets on
Cryptomania; theory has not ruled out the others.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The map of primitives: one-way functions are equivalent to pseudorandom generators, pseudorandom functions, symmetric encryption, MACs and signatures; public-key encryption and key exchange need trapdoor functions, which are a stronger assumption" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="20" y="40" width="360" height="170" rx="10"/>
<rect x="420" y="40" width="200" height="170" rx="10" class="acc"/>
</g>
<rect x="420" y="40" width="200" height="170" rx="10" class="acc-fill" fill-opacity=".12"/>
<text x="200" y="30" text-anchor="middle">Minicrypt: from any one-way function</text>
<text x="520" y="30" text-anchor="middle" class="acc">Cryptomania: needs a trapdoor</text>
<g font-size="12" text-anchor="middle">
<text x="110" y="75">one-way functions</text>
<text x="290" y="75">pseudorandom generators</text>
<text x="110" y="115">pseudorandom functions</text>
<text x="290" y="115">symmetric encryption</text>
<text x="110" y="155">MACs, commitments</text>
<text x="290" y="155">digital signatures</text>
<text x="200" y="195">all equivalent to each other</text>
<text x="520" y="85">public-key encryption</text>
<text x="520" y="115">key exchange</text>
<text x="520" y="145">(factoring, DL, LWE,</text>
<text x="520" y="162">syndrome decoding)</text>
</g>
<path d="M385 125 L 415 125" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="240" text-anchor="middle" font-size="12">no black-box construction from left to right (Impagliazzo and Rudich, 1989)</text>
</svg>
<figcaption>Figure 19.2. What follows from what. A single one-way function gives all of symmetric cryptography and signatures, and each of those gives back a one-way function. Public-key encryption needs more: a trapdoor, which every known construction gets from algebraic structure.</figcaption>
</figure>

## 19.6 Hard-core bits

*Level: intermediate.*

A one-way function can leak a lot: if $f$ is one-way, so is $f'(x, y) = (f(x), y)$,
which reveals half its input. Which parts of $x$ are truly hidden? A **hard-core
predicate** $b(x)$ is a bit that is easy to compute from $x$ but cannot be guessed from
$f(x)$ with probability noticeably above $\frac{1}{2}$.

**Goldreich-Levin theorem** (Oded Goldreich and Leonid Levin, 1989). For any one-way
function $f$, the inner product $\langle x, r \rangle \bmod 2$ is hard-core for
$g(x, r) = (f(x), r)$. *Idea*: an algorithm that predicts $\langle x, r \rangle$ for
random $r$ with advantage $\varepsilon$ can be queried at $r$ and $r \oplus e_i$; the
two answers' XOR is $x_i$ when both are right, and pairwise-independent sampling with
a majority vote makes "both right" likely enough, recovering $x$ in time polynomial in
$n/\varepsilon$. This is list decoding of the Hadamard code in disguise.

For specific functions, specific bits are hard-core. For RSA, the least significant
bit of the plaintext is as hard to compute as the whole plaintext (Werner Alexi, Benny
Chor, Oded Goldreich and Claus-Peter Schnorr, 1988). The proof is an algorithm, and it
works as an attack if any system leaks that bit.

### Code it: decryption from a parity leak

Given $c = m^e \bmod N$, multiplying by $2^e$ gives the encryption of $2m \bmod N$.
Since $N$ is odd, $2m \bmod N$ is even exactly when $2m < N$, that is, when
$m < N/2$. So the parity of the plaintext of $c \cdot 2^e$ tells which half of
$[0, N)$ holds $m$; the parity of $c \cdot 4^e$ splits that half again; and $\log_2 N$
queries pin $m$ down.

```python
# An RSA key, and an oracle that reveals only the LAST BIT of a plaintext: it decrypts everything.
import random
from math import gcd

def is_probable_prime(n, rng=random.Random(0)):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for _ in range(25):
        x = pow(rng.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def random_prime(bits, rng):
    while True:
        p = rng.getrandbits(bits) | (1 << (bits - 1)) | 1
        if is_probable_prime(p):
            return p

rng = random.Random(19)
p, q = random_prime(256, rng), random_prime(256, rng)
N, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))

def parity_oracle(c):
    return pow(c, d, N) & 1                     # the leak: one bit per query

def decrypt_with_parity(c):
    """Multiply the plaintext by 2 (c * 2^e).  2m mod N is even iff 2m < N (N is odd),
    so each answer halves the interval that holds m."""
    from fractions import Fraction
    lo, hi = Fraction(0), Fraction(N)
    two_e = pow(2, e, N)
    cc = c
    for _ in range(N.bit_length()):
        cc = cc * two_e % N
        if parity_oracle(cc) == 0:
            hi = (lo + hi) / 2
        else:
            lo = (lo + hi) / 2
    return int(hi)

m = rng.randrange(N)
print(decrypt_with_parity(pow(m, e, N)) == m, N.bit_length())
```

```text
True 512
```

All 512 bits of the plaintext, from 512 one-bit answers. The same idea, with a
"does this decrypt to valid padding?" oracle instead of parity, is Daniel
Bleichenbacher's 1998 attack on RSA encryption in TLS, told in *Protocols*.

## 19.7 Reductions, read carefully

*Level: expert.*

A security proof is a **reduction**: an algorithm $\mathcal{B}$ that uses any
adversary $\mathcal{A}$ against the scheme as a subroutine to solve the hard problem.
The theorem reads: *if $\mathcal{A}$ runs in time $t$ and has advantage $\varepsilon$,
then $\mathcal{B}$ runs in time $t'$ and solves the problem with probability
$\varepsilon'$*. If the problem cannot be solved with $(t', \varepsilon')$, the scheme
cannot be broken with $(t, \varepsilon)$.

### Example: the private key gives the factors

Knowing $\varphi(N)$ gives the factors at once ($p + q = N - \varphi(N) + 1$, then a
quadratic). Knowing $d$ is less direct but also enough. Since $ed - 1$ is a multiple
of $\lambda(N)$, write $ed - 1 = 2^s r$ with $r$ odd. For a random $a$, the sequence
$a^r, a^{2r}, a^{4r}, \ldots, a^{2^s r} = 1$ ends at 1. The last element before the
first 1 is a square root of 1 modulo $N$. Modulo $N = pq$ there are four square roots
of 1, $\pm 1$ and two others, and for at least half of all $a$ the sequence passes
through one of the others, $x$. Then $x^2 \equiv 1$ but $x \not\equiv \pm 1$, so
$\gcd(x - 1, N)$ is $p$ or $q$. $\blacksquare$

```python
# A reduction done carefully: anyone who knows the RSA private exponent d can factor N.
def factor_from_d(N, e, d, rng):
    """ed - 1 = 2^s r with r odd.  For random a, the sequence a^r, a^(2r), ... ends at 1;
    the last value before 1, if not -1, is a square root of 1 other than +-1, and gcd reveals p."""
    k = e * d - 1
    s, r = 0, k
    while r % 2 == 0:
        r, s = r // 2, s + 1
    tries = 0
    while True:
        tries += 1
        a = rng.randrange(2, N - 1)
        x = pow(a, r, N)
        for _ in range(s):
            y = x * x % N
            if y == 1 and x not in (1, N - 1):
                return gcd(x - 1, N), tries
            x = y

f, tries = factor_from_d(N, e, d, rng)
print(f in (p, q), tries, N.bit_length())
```

```text
True 1 512
```

A 512-bit modulus, factored on the first try. So "recover the RSA private key" is exactly as
hard as factoring; "decrypt RSA ciphertexts" is not known to be.

### Tightness and concrete security

The quality of a reduction is in its losses. If $t' \approx t$ and $\varepsilon'
\approx \varepsilon$, it is **tight**: breaking the scheme is as hard as the problem.
Many proofs lose a factor: $\varepsilon' = \varepsilon/q$, where $q$ is the number
of queries, users or messages, because the reduction must guess where to plant its
challenge. With a 128-bit problem and a loss of $2^{30}$, the theorem guarantees only
about 98 bits.

```python
# Tightness: what a reduction's loss does to concrete security.
def bits_left(problem_bits, loss_log2, time_ratio_log2=0):
    """If adversary advantage eps in time t gives a solver with eps / L in time T * t,
    an adversary is only guaranteed to need about 2^(bits - log L - log T) work."""
    return problem_bits - loss_log2 - time_ratio_log2

for name, loss in (("tight reduction", 0), ("loss = number of users, 2^30", 30),
                   ("loss = queries squared, 2^64", 64)):
    print(name, bits_left(128, loss))
```

```text
tight reduction 128
loss = number of users, 2^30 98
loss = queries squared, 2^64 64
```

This is not a pedantic point. Multi-user settings with billions of keys, and proofs
with quadratic losses in the number of queries, can make a "128-bit" proof guarantee
much less, and some standards (TLS 1.3's analyses, for example) were revisited to get
tighter bounds. Daniele Micciancio and Michael Walter (2018) gave a definition of
**bit security** that handles decision problems properly: roughly, a primitive has
$k$ bits of security if every adversary with running time $t$ and advantage
$\varepsilon$ has $t/\varepsilon^2 \ge 2^k$ for decision games.

## 19.8 Random self-reducibility

*Level: expert.*

For some problems, the average case is exactly as hard as the worst case. In a cyclic
group of order $n$ with generator $g$, to solve $h = g^x$, pick a random $r$ and ask
for the logarithm of $h' = h g^r$, which is a *uniformly random* group element
whatever $h$ was. If the answer is $x'$, then $x = x' - r \bmod n$. So an algorithm
that solves even 1% of random instances solves every instance, with about 100 tries.
This is **random self-reducibility** (Martín Abadi, Joan Feigenbaum and Joe Kilian,
1989), and it is why the discrete logarithm in a fixed group has no weak instances:
once the group is chosen well, every key is as safe as any other.

```python
# Random self-reducibility: an oracle that solves discrete logs for only 1% of inputs
# solves them for every input, after about 100 queries on average.
P = 1_000_003                                   # prime; 2 generates Z_P^*
g = 2
order = P - 1
print(all(pow(g, order // f, P) != 1 for f in (2, 3, 166667)))   # P - 1 = 2 * 3 * 166667
table = {}
x = 1
for i in range(order):                          # a full log table, to build the weak oracle
    table[x] = i
    x = x * g % P

def weak_oracle(h):
    """Answers only when h mod 100 == 7 (about 1% of inputs); otherwise gives up."""
    return table[h] if h % 100 == 7 else None

def strong_dlog(h, rng):
    queries = 0
    while True:
        r = rng.randrange(order)
        queries += 1
        ans = weak_oracle(h * pow(g, r, P) % P)   # a uniformly random group element
        if ans is not None:
            return (ans - r) % order, queries

qs = []
for _ in range(200):
    secret = rng.randrange(order)
    found, qn = strong_dlog(pow(g, secret, P), rng)
    assert found == secret
    qs.append(qn)
print(sum(qs) / len(qs))
```

```text
True
97.175
```

The oracle answers only when the input ends in the digits 07, about one time in 100;
200 random instances in a group of order 1,000,002 were all solved, with 97 queries on
average.

Factoring has no known random self-reduction: the hardness of a random 2048-bit RSA
modulus is an average-case assumption about how moduli are generated, and special
moduli (with $p - 1$ smooth, $p$ and $q$ close, or ROCA's structure) are weak.

## 19.9 The map of assumptions

*Level: expert.*

Here is what is known about the main assumptions. An arrow "A ⇒ B" means that an
algorithm for problem A gives one for problem B, so B is no harder than A.

- **Factoring ⇒ RSA** (computing $e$-th roots). The converse is open, and Dan Boneh and
  Ramarathnam Venkatesan (1998) gave evidence that for small $e$ it might be false.
- **Factoring ⇔ Rabin** (computing square roots modulo $N$; Michael Rabin, 1979): two
  different square roots of the same number give a factor, exactly as in §19.7.
- **Factoring ⇔ RSA key recovery** (§19.7).
- **DL ⇒ CDH ⇒ DDH**. For many groups CDH and DL are equivalent (Ueli Maurer and
  Stefan Wolf, 1999, given auxiliary information). DDH is strictly weaker in some
  groups: it is *false* in $\mathbb{Z}_p^*$ itself, and in groups with a computable
  pairing (Chapter 13), while CDH can still hold there.
- **Gap problems**: CDH may be hard even when a DDH oracle is available; pairing-based
  signatures such as BLS rely on exactly that.
- **Lattices**: average-case **SIS** ⇒ worst-case approximate SIVP and GapSVP
  (Miklós Ajtai, 1996): an algorithm for random SIS instances would solve the
  hardest lattice instances. **LWE** ⇒ the same worst-case problems by a quantum
  reduction (Oded Regev, 2005). Their module and ring versions are behind ML-KEM and
  ML-DSA (Chapter 15).
- **Syndrome decoding** of random codes (Chapter 18): NP-hard in the worst case,
  assumed hard on average; no worst-case-to-average-case reduction is known.
- **Quantum computers**: Shor's algorithm (Chapter 20) breaks factoring, RSA, DL,
  CDH and DDH in every group used in practice; it does not touch LWE, SIS or syndrome
  decoding.

### Code it: DDH fails in $\mathbb{Z}_p^*$

Let $g$ generate all of $\mathbb{Z}_p^*$. Then $g^x$ is a quadratic residue exactly
when $x$ is even, and the Legendre symbol (Chapter 5) computes that in polynomial
time. $ab$ is even when $a$ or $b$ is, so in a real Diffie-Hellman triple the residue
status of $g^{ab}$ is determined by those of $g^a$ and $g^b$; in a random triple it
is a coin flip.

```python
# DDH is false in the full group Z_p^*: the Legendre symbol of g^(ab) is determined by those of g^a, g^b.
def legendre(x, p):
    return pow(x, (p - 1) // 2, p)

def ddh_distinguisher(A, B, C):
    """g is a non-residue; g^x is a residue iff x is even.  ab is even iff a or b is even."""
    qa, qb, qc = legendre(A, P) == 1, legendre(B, P) == 1, legendre(C, P) == 1
    return int(qc == (qa or qb))                # 1 = "looks like a real DH triple"

real = rand = 0
trials = 4000
for _ in range(trials):
    a, b, c = rng.randrange(order), rng.randrange(order), rng.randrange(order)
    real += ddh_distinguisher(pow(g, a, P), pow(g, b, P), pow(g, a * b, P))
    rand += ddh_distinguisher(pow(g, a, P), pow(g, b, P), pow(g, c, P))
print(real / trials, rand / trials, round(real / trials - rand / trials, 3))
```

```text
1.0 0.49975 0.5
```

The test accepts every real triple and half of the random ones: advantage $1/2$. The
fix is to work in a subgroup of prime order $q$ (Chapter 7), such as the quadratic
residues modulo a safe prime $p = 2q + 1$, where no such character exists.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A map of assumptions with arrows: factoring implies RSA and is equivalent to Rabin; discrete log implies CDH which implies DDH; SIS and LWE imply worst-case lattice problems; Shor's quantum algorithm breaks the factoring and discrete log families but not lattices or codes" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="20" y="40" width="120" height="34" rx="6"/><rect x="20" y="110" width="120" height="34" rx="6"/><rect x="20" y="180" width="120" height="34" rx="6"/>
<rect x="190" y="40" width="100" height="34" rx="6"/><rect x="190" y="110" width="100" height="34" rx="6"/><rect x="190" y="180" width="100" height="34" rx="6"/>
<rect x="340" y="40" width="150" height="34" rx="6" class="acc"/><rect x="340" y="110" width="150" height="34" rx="6" class="acc"/>
<rect x="502" y="110" width="128" height="34" rx="6" class="acc"/>
<path d="M80 74 V 108 M80 144 V 178"/>
<path d="M240 74 V 108 M240 144 V 178"/>
<path d="M415 74 V 108"/>
</g>
<g text-anchor="middle">
<text x="80" y="62">Rabin</text><text x="80" y="132">factoring</text><text x="80" y="202">RSA</text>
<text x="240" y="62">DL</text><text x="240" y="132">CDH</text><text x="240" y="202">DDH</text>
<text x="415" y="62" class="acc">SIS, LWE</text><text x="415" y="132" class="acc">worst-case SVP, SIVP</text><text x="430" y="98" font-size="11" text-anchor="start">⇒ (quantum for LWE)</text>
<text x="566" y="132" class="acc">syndrome decoding</text>
<text x="80" y="98" font-size="11">⇔</text><text x="80" y="168" font-size="11">⇒</text>
<text x="240" y="98" font-size="11">⇒</text><text x="240" y="168" font-size="11">⇒</text>
</g>
<path d="M14 235 H 296" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="155" y="256" text-anchor="middle">broken by Shor's algorithm</text>
<path d="M344 235 H 626" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="485" y="256" text-anchor="middle" class="acc">no known quantum attack</text>
<text x="320" y="282" text-anchor="middle" font-size="11">A ⇒ B: an algorithm for A solves B, so B is no harder than A</text>
</svg>
<figcaption>Figure 19.3. The map of assumptions. Left: the factoring family; middle: the discrete-logarithm family; right: the post-quantum assumptions. Reading down, each problem is no harder than the one above it. Shor's algorithm breaks the left two columns completely.</figcaption>
</figure>

## In the real world

- **Key sizes** are set from the best known algorithms' cost formulas, with margins
  (NIST SP 800-57, ECRYPT and BSI recommendations).
- **Security proofs** come with every modern standard: TLS 1.3, Signal's protocols,
  ML-KEM's Fujisaki-Okamoto transform. Their tightness, and the models they assume
  (random oracles, generic groups), are part of what reviewers check.
- **Assumption diversity** is policy: NIST chose HQC (codes) alongside ML-KEM
  (lattices) so that one mathematical surprise does not leave the world without a
  key-exchange standard.

## Going deeper

- *Fine-grained complexity* asks for exact exponents rather than "polynomial" and
  matters for concrete security estimates.
- *The generic group model* (Victor Shoup, 1997) proves lower bounds like $\sqrt{q}$
  for algorithms that use only group operations (Chapter 7).
- *Indistinguishability obfuscation* (Aayush Jain, Huijia Lin and Amit Sahai, 2021,
  from well-studied assumptions) would imply most of Cryptomania from a single
  primitive.
- *Interactive proofs and zero knowledge*: every NP statement has a zero-knowledge
  proof if one-way functions exist (Goldreich, Micali and Wigderson, 1986).

## Check yourself

??? question "1. Is an algorithm that runs in time $N$ to factor $N$ polynomial?"

    No: polynomial means polynomial in the number of bits $n = \log_2 N$, and $N =
    2^n$ is exponential in $n$.

??? question "2. Why would P = NP break every block cipher?"

    "Is there a key starting with these bits that maps these known plaintexts to these
    ciphertexts?" is an NP question; answering it for each bit in turn recovers the
    key in polynomial time.

??? question "3. Why is factoring unlikely to be NP-complete?"

    It is in NP ∩ coNP (factorizations and primality certificates can be verified),
    and an NP-complete problem in coNP would make NP = coNP.

??? question "4. Name two primitives that are equivalent to one-way functions and one that is not known to be."

    Pseudorandom generators and digital signatures are equivalent; public-key
    encryption is not known to follow from one-way functions.

??? question "5. In the parity-oracle attack, why does an even $2m \bmod N$ mean $m < N/2$?"

    If $m < N/2$, then $2m < N$ and $2m \bmod N = 2m$ is even. If $m > N/2$, then
    $2m \bmod N = 2m - N$, which is odd because $N$ is odd.

??? question "6. A proof loses a factor equal to the number of users, $2^{32}$, from a 128-bit problem. What does it guarantee?"

    About $128 - 32 = 96$ bits.

??? question "7. Why does random self-reducibility mean that a discrete-log group has no weak keys?"

    Any instance can be turned into a uniformly random one; if a fraction of random
    instances were easy, every instance would be easy. So either almost all keys are
    weak or none is.

??? question "8. Why is DDH false in $\mathbb{Z}_p^*$ but believed true in its subgroup of quadratic residues modulo a safe prime?"

    In $\mathbb{Z}_p^*$ the Legendre symbol reveals the parity of exponents; in the
    subgroup of prime order $q$ every element is a residue, and no efficiently
    computable homomorphism to a small group is known.

??? question "9. Which assumptions in Figure 19.3 survive a large quantum computer?"

    SIS, LWE (and their ring and module versions) and syndrome decoding, as far as
    is known; factoring, RSA, Rabin, DL, CDH and DDH do not.

## What you learned

- Cost is measured in the bit length; polynomial is feasible, exponential is not,
  and subexponential $L_N[1/3]$ is why RSA keys are long.
- P ≠ NP is necessary for cryptography; NP-hardness is about the worst case, and
  cryptographic problems are believed hard on average but not NP-hard.
- One-way functions give all of symmetric cryptography and signatures; public-key
  encryption needs trapdoors.
- Hard-core bits are as hard as the whole secret; one leaked RSA plaintext bit per
  query decrypts everything.
- Reductions have costs; tight ones preserve security, loose ones lose bits.
- The discrete log is random self-reducible; factoring is not known to be.
- The assumptions form families; Shor's algorithm breaks the number-theoretic ones,
  not lattices or codes.

**Next:** [Chapter 20](20-Quantum-Algorithms.md), the mathematics of quantum
algorithms: qubits, the quantum Fourier transform, Shor and Grover.

## Further reading

- Sanjeev Arora and Boaz Barak, *Computational Complexity: A Modern Approach*
  (Cambridge, 2009), chapters 1, 2 and 9.
- Oded Goldreich, *Foundations of Cryptography*, volume 1 (Cambridge, 2001): one-way
  functions, hard-core predicates, pseudorandomness.
- Russell Impagliazzo, "A Personal View of Average-Case Complexity", IEEE Structure in
  Complexity Theory, 1995.
- Russell Impagliazzo and Steven Rudich, "Limits on the Provable Consequences of
  One-Way Permutations", STOC 1989.
- Oded Goldreich and Leonid Levin, "A Hard-Core Predicate for All One-Way Functions",
  STOC 1989.
- Werner Alexi, Benny Chor, Oded Goldreich and Claus-Peter Schnorr, "RSA and Rabin
  Functions: Certain Parts Are as Hard as the Whole", *SIAM Journal on Computing* 17
  (1988).
- Neal Koblitz and Alfred Menezes, "Another Look at 'Provable Security'", *Journal of
  Cryptology* 20 (2007), on reading reductions critically.
- Daniele Micciancio and Michael Walter, "On the Bit Security of Cryptographic
  Primitives", EUROCRYPT 2018.
- In *The cryptography book*: [Chapter 17](../../book/17-Defining-Security.md).
