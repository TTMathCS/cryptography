# 5. Locks and keys

*About 5 minutes · You need: a box, two padlocks, two friends (or just imagine it)*

## Try it

Alice wants to send Bob a secret in a box. The post office opens everything it can. Alice and Bob have never met, so they don't share a key. How can she do it?

Think about it for a minute before you look.

??? question "One way"
    1. Alice puts the secret in the box and locks it with **her** padlock. She sends it.
    2. Bob can't open it, but he adds **his own** padlock and sends it back.
    3. Alice removes her padlock (she has her key) and sends the box again.
    4. Now only Bob's padlock is on it. Bob opens it.

    The box always had at least one lock, and no key ever travelled.

??? question "A simpler way"
    Bob sends Alice an **open** padlock and keeps the key. Alice snaps it shut on the box and sends it. Anyone can close Bob's padlock; only Bob can open it.

## What's happening

The second way is **public-key cryptography**, the big idea of the 1970s. Bob's open padlock is his **public key**: he can hand out as many as he likes. His **private key** never leaves him. Anyone can lock a message for Bob; only Bob can unlock it.

On the internet the "padlock" is a math problem that is easy one way and very hard backwards, such as multiplying two huge prime numbers (easy) versus finding them again from the answer (very hard). That is how **RSA** works, and your phone uses ideas like this every time it connects to a website.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 435" role="img" aria-labelledby="sk-c-3pass-t"><title id="sk-c-3pass-t">A box goes back and forth: Alice locks it, Bob adds his own lock, Alice removes hers, and Bob opens it, so no key is ever sent</title><defs><filter id="sk-c-3pass-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-3pass-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-3pass-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-3pass-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-3pass-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="435" filter="url(#sk-c-3pass-paper)"/><g filter="url(#sk-c-3pass-pen)"><text x="30" y="44" class="h">Two padlocks, and no key travels</text><text x="40" y="96" class="l">Alice</text><text x="560" y="96" class="l">Bob</text><path class="p room" d="M120 120 L220 120 L220 164 L120 164Z"/><path class="p" d="M141 138 L141 128 Q150 112 159 128 L159 138"/><path class="p gold" d="M135 138 L165 138 L165 160 L135 160Z"/><text x="150" y="156" text-anchor="middle" class="s" style="font-size:11px">A</text><text x="170" y="182" text-anchor="middle" class="s">1 Alice locks it</text><path class="p " d="M224 142 L416 212" marker-end="url(#sk-c-3pass-ah)"/><path class="p room" d="M420 190 L520 190 L520 234 L420 234Z"/><path class="p" d="M441 208 L441 198 Q450 182 459 198 L459 208"/><path class="p gold" d="M435 208 L465 208 L465 230 L435 230Z"/><text x="450" y="226" text-anchor="middle" class="s" style="font-size:11px">A</text><path class="p" d="M483 208 L483 198 Q492 182 501 198 L501 208"/><path class="p rust" d="M477 208 L507 208 L507 230 L477 230Z"/><text x="492" y="226" text-anchor="middle" class="s" style="font-size:11px">B</text><text x="470" y="252" text-anchor="middle" class="s">2 Bob adds his</text><path class="p " d="M416 212 L224 282" marker-end="url(#sk-c-3pass-ah)"/><path class="p room" d="M120 260 L220 260 L220 304 L120 304Z"/><path class="p" d="M141 278 L141 268 Q150 252 159 268 L159 278"/><path class="p rust" d="M135 278 L165 278 L165 300 L135 300Z"/><text x="150" y="296" text-anchor="middle" class="s" style="font-size:11px">B</text><text x="170" y="322" text-anchor="middle" class="s">3 Alice takes hers off</text><path class="p " d="M224 282 L416 352" marker-end="url(#sk-c-3pass-ah)"/><path class="p room" d="M420 330 L520 330 L520 374 L420 374Z"/><text x="470" y="392" text-anchor="middle" class="s">4 Bob opens it</text><text x="250" y="420" class="s">The box always carries at least one lock.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

**Next:** [6. Strong passwords](06-Passwords.md) · Going further: [Book, chapter 12](../book/12-Diffie-Hellman.md) and [chapter 13](../book/13-RSA.md)
