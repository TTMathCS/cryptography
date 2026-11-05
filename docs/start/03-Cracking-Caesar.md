# 3. Cracking Caesar

*About 5 minutes · You need: paper, a pencil*

## Try it

You found this secret message, but not the key:

```
PHHW PH DW WKH SDUN
```

**Way 1: try every key.** Shift each letter back by 1, then 2, then 3... Stop when you see real words. (It won't take long.)

**Way 2: count letters.** In English, **E** is the most common letter. Which letter appears most in the message? If `H` stands for `E`, how far is the shift?

??? question "Answer"
    `H` appears four times, more than any other letter. `H` is three places after `E`, so the key is 3: `MEET ME AT THE PARK`.

<figure class="play" data-play="freq"><span class="ai-tag">AI-created</span><figcaption><b>Crack one yourself.</b> The bars count the letters of the secret message; the blue line is how often each letter turns up in ordinary English (Lewand, <i>Cryptological Mathematics</i>, 2000). Slide the shift until the bars fit the line, and the message reads. Paste in your own Caesar message to try it on that.</figcaption></figure>

## What's happening

Way 1 is called **brute force**: try every key. It works when there are only a few keys. Real codes today have more keys than there are grains of sand on Earth, so trying them all is impossible.

Way 2 is **frequency analysis**, invented by the Arab scholar **al-Kindi** more than 1,100 years ago. Letters in a language are not equally common, and a simple swap code keeps that pattern. For hundreds of years, it broke almost every code.

??? question "Why does counting work better on a long message than on a short one?"
    A long message shows the usual pattern clearly. A short one, like "OK", has too few letters to tell which is the most common.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 375" role="img" aria-labelledby="sk-c-freq-t"><title id="sk-c-freq-t">A bar chart of the letters in the secret message: H appears four times, more than any other, which points to E shifted by 3</title><defs><filter id="sk-c-freq-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-freq-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-freq-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-freq-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-freq-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="375" filter="url(#sk-c-freq-paper)"/><g filter="url(#sk-c-freq-pen)"><text x="30" y="44" class="h">Count the letters</text><text x="30" y="80" style="font-family:'IBM Plex Mono',monospace;font-size:15px;fill:#3a2a1e">PHHW PH DW WKH SDUN</text><path class="p gold" d="M40 300 L76 300 L76 120 L40 120Z"/><text x="58" y="324" text-anchor="middle" class="l">H</text><text x="58" y="112" text-anchor="middle" class="s">4</text><path class="p room" d="M92 300 L128 300 L128 165 L92 165Z"/><text x="110" y="324" text-anchor="middle" class="l">W</text><text x="110" y="157" text-anchor="middle" class="s">3</text><path class="p room" d="M144 300 L180 300 L180 210 L144 210Z"/><text x="162" y="324" text-anchor="middle" class="l">D</text><text x="162" y="202" text-anchor="middle" class="s">2</text><path class="p room" d="M196 300 L232 300 L232 210 L196 210Z"/><text x="214" y="324" text-anchor="middle" class="l">P</text><text x="214" y="202" text-anchor="middle" class="s">2</text><path class="p room" d="M248 300 L284 300 L284 255 L248 255Z"/><text x="266" y="324" text-anchor="middle" class="l">K</text><text x="266" y="247" text-anchor="middle" class="s">1</text><path class="p room" d="M300 300 L336 300 L336 255 L300 255Z"/><text x="318" y="324" text-anchor="middle" class="l">N</text><text x="318" y="247" text-anchor="middle" class="s">1</text><path class="p room" d="M352 300 L388 300 L388 255 L352 255Z"/><text x="370" y="324" text-anchor="middle" class="l">S</text><text x="370" y="247" text-anchor="middle" class="s">1</text><path class="p room" d="M404 300 L440 300 L440 255 L404 255Z"/><text x="422" y="324" text-anchor="middle" class="l">U</text><text x="422" y="247" text-anchor="middle" class="s">1</text><path class="p" d="M30 300 L480 300"/><text x="470" y="140" class="s">H is the most common.</text><text x="470" y="160" class="s">In English that is</text><text x="470" y="180" class="s">usually E, and</text><text x="470" y="200" class="s">E + 3 = H.</text><text x="470" y="240" class="l">key: 3</text><text x="30" y="360" class="s">Shift every letter back by 3: MEET ME AT THE PARK.</text></g></svg><figcaption>Sketched for this page. Counts from the message on this page.</figcaption></figure>

**Next:** [4. A code nobody can break](04-One-Time-Pad.md) · Going further: [History: Arab cryptanalysis](../history/02-Arab-Cryptanalysis.md)
