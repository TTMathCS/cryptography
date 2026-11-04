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

**Next:** [6. Strong passwords](06-Passwords.md) · Going further: [Book, chapter 12](../book/12-Diffie-Hellman.md) and [chapter 13](../book/13-RSA.md)
