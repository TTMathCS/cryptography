# 19. Differential Privacy and Private Statistics

*Every chapter so far has protected the inputs of a computation: a secret
shared, a ballot encrypted, a record hidden inside a protocol. This last chapter
protects the output. A statistic computed perfectly, by the most secure protocol
in this book, can still give away one person, and the history of "anonymized"
data is a history of people being found in it: a governor in a hospital table, a
widow in a search log, film watchers in a list of ratings. You will find a person
in a made-up town by birth date alone, break k-anonymity, recover a secret column
from noisy counts, and then build the answer the field settled on, differential
privacy: Warner's coin from 1965, the Laplace and Gaussian mechanisms, the privacy
budget and how it runs out. Then come the deployments, from Chrome and the iPhone
to the 2020 United States census and the lawsuit it drew, the secure aggregation
that federated learning needs, and the things no amount of noise can protect. The
book ends in Arcadia City, with the privacy charter the settlement adopts, each
of its rules made possible by a chapter of this book.*

!!! abstract "In this chapter"
    **You will learn:**

    - why removing names does not make data anonymous, from the Massachusetts
      hospital data (1997) to the AOL search logs (2006) and the Netflix Prize
      (2008), and why k-anonymity does not fix it;
    - how exact answers to many counting queries let an attacker rebuild a
      whole database (Dinur and Nissim, 2003), and why some noise is therefore
      unavoidable;
    - what differential privacy promises, in plain words and formally, what
      $\varepsilon$ and $e^{\varepsilon}$ mean, and why $\varepsilon$ is a budget;
    - randomized response, the Laplace mechanism and the Gaussian mechanism,
      each worked by hand and coded, with their error measured;
    - composition, post-processing, and how averaging repeated answers drains
      the budget;
    - local differential privacy in Chrome, Apple's and Microsoft's telemetry,
      and the 2020 US census with its debate;
    - secure aggregation and DP-SGD for federated learning, and why federated
      learning alone is not private;
    - what differential privacy cannot protect.

    **You need:** [Chapter 1](01-Computing-With-Secrets.md), §1.7 (input
    versus output privacy, and the differencing attack in brief), and
    [Chapter 10](10-Multi-Party-Computation-in-Practice.md) (additive secret
    sharing, Prio). Probability at the level of expected value, variance and
    the exponential distribution, as in
    [Mathematics, Chapter 16](../mathematics/16-Probability.md). The idea that
    security is defined by what an attacker cannot tell apart comes from
    [book 1, Chapter 17](../../book/17-Defining-Security.md).

    **Levels:** §19.1, §19.2 and §19.5 are for beginners, §19.3, §19.4 and
    §19.6 to §19.15 are intermediate, §19.16 is expert.

## 19.1 The problem

*Level: beginner.*

A hospital wants to publish how many of its patients had each diagnosis last
year. A city wants to publish its census by street. A phone maker wants to know
which new words people type, so that its keyboard can suggest them. A school
board wants to report test scores by school, grade and family income. A medical
research team wants to share a data set so that others can check its results.
In every case the people who hold the data have a duty to the people in it, and
the people who want the data have a good reason to want it. The question of this
chapter is whether both can be satisfied: **can we publish useful facts about a
group without exposing any one person in it?**

The cryptography of the earlier chapters does not answer this. Secure
computation ([Chapters 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) and
[10](10-Multi-Party-Computation-in-Practice.md)) and homomorphic encryption
([Chapter 12](12-Homomorphic-Encryption.md)) make sure that nobody sees the
inputs, and they deliver the output exactly. If the output is the problem, they
deliver the problem exactly. [Chapter 1](01-Computing-With-Secrets.md), §1.7,
called this **output privacy** and showed it fail in two lines: the average of
two salaries gives away the other salary, and two monthly totals that differ by
one leaver give away the leaver's pay. It also told the story of the Strava heat
map, where an aggregate of a billion runs outlined military bases. This chapter
takes the question all the way down.

Statistical agencies have worked on it for a century. The US Census Bureau has
been bound since 1954 by Title 13 of the US Code, which forbids publishing
anything by which a person or household can be identified, and for decades it
protected its tables by rules of thumb: suppress any cell with fewer than a few
people, round numbers, swap a few households between neighborhoods, and publish
only a sample of records with the rare details coarsened. Medical researchers
removed names and addresses. Companies replaced user names with numbers. These
methods share an assumption, that a record without a name is anonymous, and a
hope, that no one would bother to undo them. Section 19.2 shows the assumption
failing; §19.4 shows that the hope does not matter, because enough exact
statistics betray everyone, whatever is done to the names.

The answer the field arrived at, from 2003 to 2006, is a definition rather than
a technique. **Differential privacy** does not say which data is sensitive or
who the attacker is. It says that the published result must come out almost the
same whether or not any one person's data was used, so that nobody, however
much they already know, can learn much about that person from it. "Almost the
same" is measured by one number, $\varepsilon$, and every answer spends some of
it. The rest of the chapter is about what that promise means, how to meet it,
what it costs in accuracy, and where it has been used and argued over.

Three kinds of release run through the chapter, and it helps to keep them apart.

- **Tables published once**, like a census. The publisher decides everything
  in advance and spends its whole budget at once.
- **Query systems**, where analysts ask questions and get answers, like a
  research database. The attacker chooses the questions, possibly adaptively,
  and the system must count what each answer costs.
- **Data collected from devices**, like telemetry. Nobody, not even the
  collector, should see each person's raw value, which leads to the *local*
  model of §19.10 and to secure aggregation in §19.13.

## 19.2 Why "anonymized" data fails

*Level: beginner.*

In the mid-1990s the Group Insurance Commission of Massachusetts, which bought
health insurance for state employees, released records of their hospital
visits to researchers. Names, addresses and Social Security numbers had been
removed. Each record still had the patient's ZIP code, date of birth and sex,
along with diagnoses, procedures and charges. William Weld, then governor of
Massachusetts, assured employees that their privacy was protected.

Latanya Sweeney, a graduate student at MIT, tested that in 1997. She bought the
voter registration list for Cambridge, Massachusetts, where Weld lived, for
twenty dollars, on two floppy disks. It had each voter's name and address, and
also their ZIP code, birth date and sex. Six people in Cambridge shared Weld's
date of birth, three of them were men, and only one lived in his ZIP code. The
hospital record that matched those three fields was his, including a stay after
he collapsed at a college graduation ceremony in May 1996. Sweeney mailed it to
his office. Figure 19.1 shows the join she made, which became known as a
**linkage attack**.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Two overlapping ovals: hospital data with diagnosis and charges, voter list with name and address; the overlap holds ZIP code, birth date and sex, the fields that link them" fill="currentColor" font-size="14">
<ellipse cx="225" cy="140" rx="200" ry="112" fill="none" stroke="currentColor" stroke-width="1.6"/>
<ellipse cx="415" cy="140" rx="200" ry="112" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="115" y="22" text-anchor="middle" font-weight="bold">Hospital data ("anonymous")</text>
<text x="525" y="22" text-anchor="middle" font-weight="bold">Voter list (public)</text>
<text x="125" y="95" text-anchor="middle">visit date</text>
<text x="125" y="120" text-anchor="middle">diagnosis</text>
<text x="125" y="145" text-anchor="middle">procedure</text>
<text x="125" y="170" text-anchor="middle">medication</text>
<text x="125" y="195" text-anchor="middle">charges</text>
<text x="515" y="95" text-anchor="middle">name</text>
<text x="515" y="120" text-anchor="middle">address</text>
<text x="515" y="145" text-anchor="middle">party</text>
<text x="515" y="170" text-anchor="middle">date registered</text>
<text x="515" y="195" text-anchor="middle">date last voted</text>
<text x="320" y="115" text-anchor="middle" font-weight="bold">ZIP code</text>
<text x="320" y="142" text-anchor="middle" font-weight="bold">birth date</text>
<text x="320" y="169" text-anchor="middle" font-weight="bold">sex</text>
<text x="320" y="266" text-anchor="middle" font-size="13">the shared fields join the two tables: a name lands on a diagnosis</text>
</svg>
<figcaption>Figure 19.1. Sweeney's linkage attack (1997). Neither table alone ties a name to a diagnosis; the three fields they share do.</figcaption>
</figure>

One governor could be a special case: his birth date was public and his
collapse had been in the news. So Sweeney measured how special he was. Using
the 1990 census, she estimated that **87% of the US population** was likely to
be unique on the combination of five-digit ZIP code, full date of birth and
sex, and published it in 2000 in a working paper called "Simple Demographics
Often Identify People Uniquely". Philippe Golle repeated the estimate with 2000
census data in 2006 and got about 63%, a lower number for the same lesson. The
fields that make the join possible are called **quasi-identifiers**: no one of
them names you, and together they do.

The arithmetic behind the 87% is the birthday problem turned around. Eighty
years of birth dates times two sexes is 58,400 combinations. A ZIP code with
10,000 people fills only a sixth of them, so most people sit alone in their
cell.

```python
import random
from collections import Counter

random.seed(1997)
DAYS = 80 * 365                        # birth dates spread over 80 years

def town(size):
    """A made-up ZIP code: each person is (birth day, sex)."""
    return [(random.randrange(DAYS), random.choice("FM")) for _ in range(size)]

def unique_share(people, key):
    counts = Counter(key(p) for p in people)
    return sum(1 for p in people if counts[key(p)] == 1) / len(people)

for size in (2000, 10000, 30000):
    people = town(size)
    full = unique_share(people, lambda p: p)
    year = unique_share(people, lambda p: (p[0] // 365, p[1]))
    print(f"{size:6} people: birth date + sex unique for {100*full:5.1f}%,"
          f" birth year + sex for {100*year:4.1f}%")
```

```
  2000 people: birth date + sex unique for  96.5%, birth year + sex for  0.0%
 10000 people: birth date + sex unique for  85.2%, birth year + sex for  0.0%
 30000 people: birth date + sex unique for  60.2%, birth year + sex for  0.0%
```

With birth year instead of birth date, nobody in these towns is unique. That
is the instinct behind coarsening data, and §19.3 shows where the instinct
stops working. Real birth dates are not spread evenly, and real ZIP codes vary
from a few hundred people to over a hundred thousand, which is why the real
figure depends on the census and the method. The point does not.

The story has a footnote. In 2012 Daniel Barth-Jones argued that the Weld
re-identification was easier than typical, because Weld was famous and because
the Cambridge voter list covered only part of the population, and that
re-identification risks in properly de-identified data are low. Sweeney and
others replied that the attack only has to work on someone. The argument about
how often linkage succeeds continues; the fact that it can succeed is settled,
and it changed the law: the de-identification rules of the US HIPAA Privacy
Rule (2000, in force from 2003) require removing full dates and all but the
first three digits of ZIP codes.

!!! note "Life story: the Massachusetts hospital data and Governor Weld"
    **Born:** mid-1990s, when the Massachusetts Group Insurance Commission
    released state employees' hospital records without names but with ZIP code,
    birth date and sex · **Purpose:** to let researchers study health costs ·
    **Helped:** Latanya Sweeney (1997) to find Governor William Weld's record
    by joining it to the Cambridge voter list, and to estimate (2000) that 87%
    of Americans are unique on those three fields · **Status:** the founding
    case of re-identification research; it shaped the HIPAA de-identification
    rules; its typicality is still debated (Barth-Jones, 2012)

### The AOL search logs

On 4 August 2006, AOL's research division put a file on a public web site for
academic researchers: about 20 million search queries typed by about 650,000
AOL users over three months, March to May 2006. Each user's name had been
replaced by a number. Within days, people were reading the logs for fun, and
some of the numbered users had typed things that were hard to read: searches
for ways to kill a spouse, for symptoms of illnesses, for their own names.

On 9 August *The New York Times* published the story of user 4417749. Her
searches included "landscapers in Lilburn, Ga", several people with the last
name Arnold, "homes sold in shadow lake subdivision gwinnett county georgia",
"60 single men" and "dog that urinates on everything". The reporters Michael
Barbaro and Tom Zeller Jr. found Thelma Arnold, a 62-year-old widow in Lilburn,
Georgia, and showed her the list. She recognized her searches. A search log is
a diary, and a diary does not need a name on the cover to say whose it is.

AOL withdrew the file within days, but copies spread. The researcher who
released it and his manager lost their jobs, AOL's chief technology officer
resigned, and the company faced a class-action lawsuit and a complaint to the
US Federal Trade Commission. The lesson for this chapter is that the
"identifier" was not one field. It was the whole pattern of a person's
behavior, and there was no column to delete.

!!! note "Life story: the AOL search data release"
    **Born:** 4 August 2006, about 20 million queries from about 650,000 users
    over three months, with user names replaced by numbers · **Purpose:** a
    research data set for information-retrieval scientists · **Helped:**
    *The New York Times* (9 August 2006) to identify user 4417749 as Thelma
    Arnold of Lilburn, Georgia, from her searches alone · **Status:** withdrawn
    within days, still circulating; jobs lost and lawsuits filed; the
    standard example of behavioral data that names its owner

### The Netflix Prize

In October 2006 Netflix offered a million dollars to anyone who could improve
its film recommendations by 10%. It published the training data: about 100
million ratings, from 1 to 5 stars with dates, given by about 480,000
subscribers to 17,770 films, with subscriber names replaced by random numbers
and some ratings perturbed. Netflix's FAQ said that even someone who knew all
your ratings would find it hard to find you, because the data was a sample and
had been altered.

Arvind Narayanan and Vitaly Shmatikov, at the University of Texas at Austin,
showed otherwise in a paper posted in 2006 and published at the IEEE Symposium
on Security and Privacy in 2008. The ratings were **sparse**: each subscriber
had rated a few hundred of the 17,770 films, and no two subscribers' patterns
were alike. Their algorithm scored every record against what an attacker knew,
weighting rare films more, and declared a match only when the best score stood
far above the second best. Knowing 8 of a subscriber's ratings, two of which
could be completely wrong, with dates known only to within two weeks, was
enough to pick out 99% of the records; 2 ratings with dates within three days
picked out 68%. Where did an attacker get ratings? The authors used public
reviews on the Internet Movie Database, posted under people's own names, and
matched a few of them to Netflix records, which then revealed every other film
those people had rated in private, including ones that suggested their
political and religious views and sexuality.

The prize was won in September 2009. A second contest was announced, and in
December 2009 a lawsuit, *Doe v. Netflix*, was filed on behalf of a woman who
said that the data could reveal she was a lesbian, which she had not told her
community. The FTC raised concerns, and in March 2010 Netflix settled the suit
and canceled the second contest.

!!! note "Life story: the Netflix Prize data set"
    **Born:** October 2006, about 100 million ratings by about 480,000
    subscribers of 17,770 films, names replaced by numbers · **Purpose:** a
    public benchmark for a \$1 million recommendation contest · **Helped:**
    Narayanan and Shmatikov (2008) to show that sparse data re-identifies:
    8 known ratings with rough dates single out 99% of subscribers ·
    **Status:** prize awarded 2009; second contest canceled in March 2010
    after a lawsuit and FTC concerns; the standard case for "high-dimensional
    data cannot be anonymized by removing names"

### The taxi data

One more case belongs in the list, and [Chapter 3](03-Commitments.md) has
already told it: in 2014 New York City released 173 million taxi trips with
drivers' license and medallion numbers replaced by unsalted MD5 hashes, and
every hash was reversed in minutes by hashing every possible number. That was a
cryptographic mistake with a cryptographic fix. Even with the fix, though, the
trips themselves remained. Researchers soon matched photographs of celebrities
getting into New York cabs, with the time and place, to trips in the data and
read off the fares and tips. Correct pseudonyms protect the identifier; they do
not protect the pattern.

### What the cases have in common

Each release removed what looked like the identifying fields and kept the rest.
Each was undone by joining with outside information that the publisher did not
control and could not predict: a voter list, a person's neighborhood, public
film reviews, a photograph. The more detailed and useful a record is, the more
of it acts as a fingerprint. Paul Ohm, a law professor, summed it up in 2010 as
"data can be either useful or perfectly anonymous but never both". That is
slightly too strong, as the rest of this chapter shows, but it is correct about
records: any release of individual records that keeps their detail keeps their
fingerprints. The way out is to stop releasing records and to release
statistics instead, under a rule that bounds what any one record can do to
them. Before that rule, the field tried a fix that kept the records.

## 19.3 k-anonymity, and why it is not enough

*Level: intermediate.*

If a record is dangerous because it is unique on its quasi-identifiers, make it
not unique. That is **k-anonymity**, formalized by Pierangela Samarati and
Latanya Sweeney in 1998 and published by Sweeney in 2002: a table is
k-anonymous if every combination of quasi-identifier values that appears in it
appears at least $k$ times. A linkage attack that knows someone's
quasi-identifiers then lands on a group of at least $k$ records, an
**equivalence class**, and cannot tell which is theirs.

Two operations get a table there. **Generalization** coarsens values: ZIP
02138 becomes 021\*\*, age 34 becomes 30-39, a birth date becomes a birth year.
**Suppression** deletes the records, or the values, that still stand out. The
art is to find the least generalization that reaches the chosen $k$, and that
optimization problem is NP-hard in general, so tools use heuristics.

By hand, take twelve clinic records. After generalizing ZIP to three digits
and age to a decade, the quasi-identifiers fall into four classes of three. The
table is 3-anonymous: a neighbor who knows that Bob is a man in his forties
living in 021xx finds three records that could be Bob's. Now look at the
diagnoses in Bob's class. All three say HIV. The neighbor does not know which
record is Bob's and does not need to.

```python
from collections import defaultdict

# A clinic table after generalization: ZIP cut to 3 digits, age to a decade.
# Quasi-identifiers: (zip, age band, sex). Sensitive value: diagnosis.
rows = [
    ("021**", "30-39", "F", "asthma"),   ("021**", "30-39", "F", "flu"),
    ("021**", "30-39", "F", "diabetes"), ("021**", "40-49", "M", "HIV"),
    ("021**", "40-49", "M", "HIV"),      ("021**", "40-49", "M", "HIV"),
    ("024**", "20-29", "F", "flu"),      ("024**", "20-29", "F", "asthma"),
    ("024**", "20-29", "F", "flu"),      ("024**", "60-69", "M", "cancer"),
    ("024**", "60-69", "M", "heart"),    ("024**", "60-69", "M", "flu"),
]

classes = defaultdict(list)
for zip3, age, sex, diagnosis in rows:
    classes[(zip3, age, sex)].append(diagnosis)

k = min(len(v) for v in classes.values())
print(f"the table is {k}-anonymous")
for qi, diagnoses in classes.items():
    distinct = len(set(diagnoses))
    note = "  <- everyone here has the same diagnosis" if distinct == 1 else ""
    print(qi, "size", len(diagnoses), "distinct diagnoses", str(distinct) + note)

# The neighbor knows Bob is a man in his forties living in 021xx.
print("Bob's diagnosis:", set(classes[("021**", "40-49", "M")]))
```

```
the table is 3-anonymous
('021**', '30-39', 'F') size 3 distinct diagnoses 3
('021**', '40-49', 'M') size 3 distinct diagnoses 1  <- everyone here has the same diagnosis
('024**', '20-29', 'F') size 3 distinct diagnoses 2
('024**', '60-69', 'M') size 3 distinct diagnoses 3
Bob's diagnosis: {'HIV'}
```

This is the **homogeneity attack**, one of two that Ashwin Machanavajjhala,
Johannes Gehrke, Daniel Kifer and Muthuramakrishnan Venkitasubramaniam
described in 2006. The second is the **background knowledge attack**. Take the
class of women in their thirties in 021xx, with asthma, flu and diabetes. A
neighbor who knows that Carol belongs to it learns little from the table alone;
but if she also knows that Carol is not diabetic and never missed a day of work
all winter, she rules out two of the three and is left with asthma. k-anonymity counts how many
records look alike; it says nothing about how many different secrets they hold
or what the attacker already knows.

The patches came quickly. **l-diversity** (2006) asks each class to contain at
least $l$ "well-represented" sensitive values; it stops homogeneity but not the
skew of a class that is 90% one diagnosis. **t-closeness** (Ninghui Li,
Tiancheng Li and Suresh Venkatasubramanian, 2007) asks the distribution of
sensitive values in each class to be within distance $t$ of the distribution in
the whole table; it is strong, and it destroys exactly the correlations that
researchers wanted to study. Three deeper problems remained.

- **Sparse, high-dimensional data does not generalize.** A search log or a
  ratings list has thousands of columns, every one a potential
  quasi-identifier. Making such records look alike in groups of $k$ erases
  almost everything; Charu Aggarwal showed this in 2005 for k-anonymity in
  high dimensions.
- **The attacker chooses the quasi-identifiers.** The publisher has to guess
  which columns an outsider can join on. After the Netflix case it is clear
  that any column can be one.
- **Releases compose badly.** Srivatsava Ganta, Shiva Kasiviswanathan and Adam
  Smith showed in 2008 the **composition attack**: two hospitals each publish
  a k-anonymous table, each safe alone, and a person who visited both lies in
  one class in each. Intersecting the two classes' sensitive values often
  leaves only one. Neither publisher made a mistake, and together they exposed
  the patient.

The last problem is the one that matters most. A privacy method that can fail
when two careful publishers act independently cannot be checked by either of
them. What was wanted was a guarantee about the *process* that made a release,
one that adds up predictably when releases pile up, whatever else is public.
To see why such a guarantee must involve randomness, the next section takes away
the records entirely and publishes only statistics.

!!! note "Life story: k-anonymity"
    **Born:** 1998 (Samarati and Sweeney, technical report), published by
    Sweeney in 2002 · **Purpose:** to stop linkage attacks by making every
    record share its quasi-identifiers with at least $k - 1$ others ·
    **Helped:** a generation of de-identification tools and medical data
    releases; the idea survives in k-anonymous lookups such as Have I Been
    Pwned's password range query ([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md))
    · **Status:** still used for record releases; known to fail against
    homogeneity, background knowledge, high-dimensional data and composition
    (2006 to 2008); followed by l-diversity and t-closeness, and superseded
    as a guarantee by differential privacy

## 19.4 Differencing and reconstruction

*Level: intermediate.*

Suppose the publisher gives up on records and offers only statistics: counts,
sums and averages over any group an analyst describes, computed exactly on the
real data, with small groups refused. Chapter 1 showed the simplest way this
fails. Here it is again with a query system instead of monthly reports, because
the details matter for what follows.

A workplace of twelve keeps a staff table with each person's age, department and
whether they have a particular medical condition. The table itself is never
shown. The system answers counting queries exactly and refuses any query whose
answer is about fewer than five people. An analyst asks two questions.

1. How many staff have the condition? Answer: 5.
2. How many staff under 60 have the condition? Answer: 4.

Both queries are about at least eleven people, so both pass the size rule. But
everyone in the office knows that Wen, at 63, is the only person aged 60 or
over, and $5 - 4 = 1$.

```python
# A differencing attack: two exact counts, each harmless alone.
staff = [  # name, age, department, has the condition (1) or not (0)
    ("Ana", 34, "hydroponics", 0), ("Ben", 29, "hydroponics", 1),
    ("Chen", 45, "power", 0),      ("Dee", 38, "power", 1),
    ("Eli", 52, "medical", 0),     ("Fay", 41, "medical", 0),
    ("Gus", 27, "water", 1),       ("Hal", 33, "water", 0),
    ("Ida", 48, "school", 0),      ("Jon", 36, "school", 0),
    ("Kim", 44, "airlocks", 1),    ("Wen", 63, "airlocks", 1),
]

def count(condition):
    """The database answers any counting query exactly."""
    return sum(1 for row in staff if condition(row))

q1 = count(lambda r: r[3] == 1)                 # "How many have it?"
q2 = count(lambda r: r[3] == 1 and r[1] < 60)   # "How many under 60 have it?"
print("query 1:", q1, " query 2:", q2)
print("Wen is the only person aged 60 or over, so Wen's value is", q1 - q2)
```

```
query 1: 5  query 2: 4
Wen is the only person aged 60 or over, so Wen's value is 1
```

Rules that look at one query at a time cannot stop this, because each query is
innocent; the leak is in the pair. Statistical agencies tried **query
auditing**: keep every past query and refuse any new one that, together with the
old ones, pins down a person. Auditing exactly is expensive, and worse, the
refusal itself leaks: Jon Kleinberg, Christos Papadimitriou and Prabhakar
Raghavan showed in 2000, and Krishnaram Kenthapadi, Nina Mishra and Kobbi Nissim
in 2005, that "I cannot answer that" can tell the analyst what the answer would
have been. The other classic defense is to add a little noise or round every
answer. That brings us to the question Irit Dinur and Kobbi Nissim asked in
2003: how much noise is enough?

### The reconstruction theorem

Dinur and Nissim stripped the problem to its bones. The database is a column of
$n$ secret bits $d_1, \dots, d_n$, one per person: has the condition or not. A
query names a subset $S$ of the people and gets back the count
$\sum_{i \in S} d_i$ plus some error. The publisher may choose the error any way
it likes, cleverly, randomly, adversarially, as long as every answer is within
$E$ of the truth. The attacker wants the column.

**Theorem 1 (too many questions).** If the attacker may ask about every subset,
then whatever the publisher does, the attacker can find a column that disagrees
with the real one in at most $4E$ places.

The proof is short enough to do in your head. The attacker keeps any candidate
column $c$ whose counts are within $E$ of every published answer; the real
column is such a candidate, so one exists. Now let $S_1$ be the people where
the real bit is 1 and the candidate says 0. The real count over $S_1$ is
$|S_1|$, the candidate's count over $S_1$ is 0, and both are within $E$ of the
same published answer, so $|S_1| \le 2E$. The same argument on the people where
the real bit is 0 and the candidate says 1 gives at most $2E$ more. So $c$ and
$d$ differ in at most $4E$ places. If the error is small compared with $n$, say
$E = n/100$, the attacker has 96% of everyone's secret.

Asking all $2^n$ subsets is not practical for a large database, so the second
result matters more.

**Theorem 2 (not many questions).** If the error is $o(\sqrt{n})$, that is,
much smaller than $\sqrt{n}$, then an attacker who asks about $n \log^2 n$
random subsets and solves a linear program recovers all but a small fraction of
the bits, in polynomial time.

So the line between safety and collapse sits near $\sqrt{n}$. For a database of
a million people, answers accurate to within 1,000 on random subsets are enough
to rebuild almost every row. Since the ordinary sampling error of a survey of a
million people is also about $\sqrt{n}$, this says that a database answering
many questions more precisely than sampling error could ever justify is giving
itself away. Cynthia Dwork later called this the **fundamental law of
information recovery**: overly accurate answers to too many questions will
destroy privacy in a spectacular way. It holds whatever the publisher does to
names, and it is why every method in the rest of this chapter adds noise and
limits the number of questions.

Here is a small version. Fourteen people each have a secret bit. The attacker
asks 40 random subset counts, each answered with an error of up to $E$ chosen
at random, then tries all $2^{14} = 16{,}384$ possible columns and keeps those
that fit every answer.

```python
import random
from itertools import product

random.seed(2003)
n = 14                                        # 14 people, one secret bit each
secret = [random.randrange(2) for _ in range(n)]

def noisy_answers(m, E):
    """m random subset-sum queries, each answer off by up to E."""
    out = []
    for _ in range(m):
        subset = [i for i in range(n) if random.random() < 0.5]
        true = sum(secret[i] for i in subset)
        out.append((subset, true + random.randint(-E, E)))
    return out

def reconstruct(answers, E):
    """Keep every candidate database that fits every answer within E."""
    fits = []
    for cand in product((0, 1), repeat=n):
        if all(abs(sum(cand[i] for i in s) - a) <= E for s, a in answers):
            fits.append(cand)
    return fits

for E in (1, 2, 4):
    answers = noisy_answers(40, E)
    fits = reconstruct(answers, E)
    vote = [int(2 * sum(c[i] for c in fits) > len(fits)) for i in range(n)]
    wrong = sum(v != b for v, b in zip(vote, secret))
    print(f"noise up to {E}: {len(fits):3} candidates fit; "
          f"a bit-by-bit vote gets {n - wrong} of {n} bits right")
```

```
noise up to 1:   1 candidates fit; a bit-by-bit vote gets 14 of 14 bits right
noise up to 2:   1 candidates fit; a bit-by-bit vote gets 14 of 14 bits right
noise up to 4:  41 candidates fit; a bit-by-bit vote gets 11 of 14 bits right
```

With errors of up to 2 on counts that run up to 14, forty questions give away
every bit. At 4, a little above $\sqrt{14} \approx 3.7$, the attack starts to
lose its grip, though it still gets most bits right. Real attacks replace the
brute force with linear programming and scale to millions of rows.

This is not a thought experiment. In 2010 the US Census Bureau published about
150 billion statistics from the census of 308.7 million people, each table
protected by the old methods. In the late 2010s its own researchers ran the
reconstruction attack on a subset of those tables and rebuilt a record of
block, sex, age, race and ethnicity for every person, as §19.11 tells. That
experiment is why the 2020 census used differential privacy.

!!! note "Life story: the Dinur-Nissim reconstruction attack"
    **Born:** 2003, Irit Dinur and Kobbi Nissim, "Revealing Information while
    Preserving Privacy" (PODS 2003) · **Purpose:** to measure how much noise
    a database must add before its answers stop revealing its rows ·
    **Helped:** prove that error well below $\sqrt{n}$ on about $n \log^2 n$
    random counts lets a polynomial-time attacker rebuild nearly the whole
    database; led directly to the definition of differential privacy, and
    motivated the Census Bureau's 2010 reconstruction experiment ·
    **Status:** a foundational result, extended to fewer queries and to more
    general noise; the "fundamental law of information recovery"

## 19.5 Randomized response

*Level: beginner.*

The oldest working answer to the problem is older than computers. In 1965 the
statistician Stanley Warner, writing in the *Journal of the American
Statistical Association*, worried about **evasive answer bias**: ask people
whether they have cheated on their taxes, used drugs or had an abortion where
it was illegal, and many of them lie, so the survey measures embarrassment
rather than behavior. His fix was to let each person randomize their own answer
in private, so that no single answer means anything, while the randomness
averages out over many people.

Warner's own design used a spinner that told the respondent which of two
opposite statements to answer. The version usually taught today, a variant
proposed soon after, uses two coin flips, as in Figure 19.2. The respondent
flips a coin out of the interviewer's sight. On heads, they answer the question
truthfully. On tails, they flip again and answer "yes" for heads and "no" for
tails, whatever the truth.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Randomized response: the first coin decides between telling the truth and letting a second coin answer yes or no; a truthful yes becomes yes with probability three quarters, a truthful no becomes yes with probability one quarter" fill="currentColor" font-size="14">
<rect x="10" y="100" width="150" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="127" text-anchor="middle">your true answer</text>
<line x1="160" y1="122" x2="214" y2="122" stroke="currentColor" stroke-width="1.5"/>
<circle cx="235" cy="122" r="21" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="127" text-anchor="middle" font-size="13">coin 1</text>
<line x1="250" y1="107" x2="300" y2="62" stroke="currentColor" stroke-width="1.5"/>
<text x="262" y="74" text-anchor="end" font-size="13">heads, ½</text>
<rect x="300" y="38" width="320" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="460" y="65" text-anchor="middle">say the truth</text>
<line x1="250" y1="137" x2="300" y2="182" stroke="currentColor" stroke-width="1.5"/>
<text x="262" y="180" text-anchor="end" font-size="13">tails, ½</text>
<circle cx="322" cy="196" r="21" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="322" y="201" text-anchor="middle" font-size="13">coin 2</text>
<line x1="341" y1="186" x2="400" y2="158" stroke="currentColor" stroke-width="1.5"/>
<line x1="341" y1="206" x2="400" y2="232" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="160" text-anchor="middle" font-size="13">½</text>
<text x="370" y="243" text-anchor="middle" font-size="13">½</text>
<rect x="400" y="138" width="220" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="161" text-anchor="middle">say "yes"</text>
<rect x="400" y="214" width="220" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="237" text-anchor="middle">say "no"</text>
<text x="320" y="282" text-anchor="middle" font-size="13">P(yes | truly yes) = ½ + ¼ = ¾        P(yes | truly no) = ¼</text>
</svg>
<figcaption>Figure 19.2. Randomized response with two coins. Every answer could have come from either truth; only the proportions carry information.</figcaption>
</figure>

**Why it protects each person.** A respondent who says "yes" may be telling the
truth or may have flipped tails then heads. From the interviewer's side,

$$
\frac{P(\text{"yes"} \mid \text{truly yes})}{P(\text{"yes"} \mid \text{truly no})}
= \frac{3/4}{1/4} = 3,
$$

and the same ratio holds for "no". Whatever the interviewer believed before
the answer, the answer can shift the odds by at most a factor of 3. If they
thought there was a 10% chance this person had cheated (odds 1 to 9), after a
"yes" they can think at most 25% (odds 3 to 9). The person can always say that
the coin made them say it, and it is true often enough to be believed.

**Why the group's answer survives.** Let $p$ be the true fraction of "yes" in
the population and $\lambda$ the fraction of "yes" answers collected. Half the
people answer truthfully and half answer by coin, so

$$
\lambda = \tfrac{1}{2} p + \tfrac{1}{4}, \qquad\text{so}\qquad
\hat p = 2\lambda - \tfrac{1}{2}
$$

is an unbiased estimate of $p$.

**By hand.** A survey of 1,000 people gets 400 "yes" answers, so
$\lambda = 0.40$ and $\hat p = 0.80 - 0.50 = 0.30$: about 30% truly answer yes.
How sure is that? The number of "yes" answers is binomial with variance
$n\lambda(1-\lambda)$, so $\lambda$ has standard deviation
$\sqrt{0.4 \times 0.6 / 1000} \approx 0.0155$, and $\hat p = 2\lambda - 0.5$
has twice that, about $0.031$. The answer is 30% give or take 3 points. An
honest survey of the same 1,000 people, if they would answer honestly, would
have standard deviation $\sqrt{0.3 \times 0.7/1000} \approx 0.0145$. Privacy
roughly doubled the error, so the survey needs about four times as many people
for the same precision. That trade, privacy paid for in accuracy, is the shape
of everything in this chapter.

```python
import random, math

random.seed(1965)   # random is fine for a demo; real systems draw from secrets

def respond(truth):
    """Warner's coin: heads, tell the truth; tails, flip again and say heads = yes."""
    if random.random() < 0.5:
        return truth
    return random.random() < 0.5

def survey(n, true_rate):
    answers = [respond(random.random() < true_rate) for _ in range(n)]
    observed = sum(answers) / n
    return observed, 2 * observed - 0.5        # unbiased estimate of the true rate

n, true_rate = 10000, 0.30
observed, estimate = survey(n, true_rate)
print(f"observed yes: {observed:.4f}  estimated true rate: {estimate:.4f}")

errors = [survey(n, true_rate)[1] - true_rate for _ in range(200)]
spread = math.sqrt(sum(e * e for e in errors) / len(errors))
q = 0.25 + true_rate / 2
print(f"measured spread over 200 surveys: {spread:.4f}")
print(f"theory, 2*sqrt(q(1-q)/n):          {2 * math.sqrt(q * (1 - q) / n):.4f}")
print(f"an honest survey would have:       {math.sqrt(true_rate * (1 - true_rate) / n):.4f}")
```

```
observed yes: 0.3954  estimated true rate: 0.2908
measured spread over 200 surveys: 0.0107
theory, 2*sqrt(q(1-q)/n):          0.0098
an honest survey would have:       0.0046
```

The demo uses Python's `random`, which is predictable and fine for an
illustration; a real system must draw its coins from `secrets` or the operating
system, or an attacker who can predict the coins can undo them. The measured
spread matches the theory to within the noise of 200 trials.

Change the first coin's bias and you change the trade. If the respondent tells
the truth with probability $t$ and otherwise answers by a fair coin, the ratio
becomes $(t + (1-t)/2)/((1-t)/2) = (1+t)/(1-t)$. At $t = 0.9$ the ratio is 19
and the error is small; at $t = 0.1$ the ratio is about 1.22 and the error is
enormous. That ratio is exactly what the next section turns into a definition,
and its logarithm, here $\ln 3 \approx 1.10$, is the $\varepsilon$ that every
deployment in this chapter reports.

!!! note "Life story: randomized response"
    **Born:** 1965, Stanley L. Warner, "Randomized Response: A Survey
    Technique for Eliminating Evasive Answer Bias" (*Journal of the American
    Statistical Association* 60) · **Purpose:** honest answers to embarrassing
    survey questions, by letting each respondent randomize in private ·
    **Helped:** decades of surveys on drug use, abortion, cheating and crime;
    rediscovered as the simplest $\varepsilon$-differentially private mechanism
    ($\varepsilon = \ln 3$ for the two-coin version); the core of RAPPOR and
    other local-privacy telemetry (§19.10) · **Status:** in use in both fields;
    its weakness, that respondents must trust and understand the coin, is the
    same as in software

## 19.6 Differential privacy: the definition

*Level: intermediate.*

In 2006 Cynthia Dwork, Frank McSherry, Kobbi Nissim and Adam Smith published
"Calibrating Noise to Sensitivity in Private Data Analysis" at the Theory of
Cryptography Conference, and in the same year Dwork named the idea
**differential privacy** in a paper at ICALP. It grew out of the reconstruction
result of §19.4 and the noisy-query systems that followed it (Dwork and Nissim,
2004; Blum, Dwork, McSherry and Nissim, 2005). The four authors of the 2006
paper received the Gödel Prize for it in 2017.

### In plain words

Imagine two worlds that differ in one person: in one, your record is in the
database; in the other, it is not (or it is replaced by someone else's). A
mechanism is differentially private if **whatever it publishes, it was about
as likely to publish that in either world**. Then nobody looking at the output,
whatever else they know, can tell much about which world they are in, and so
cannot learn much about you that they could not have learned without your data.
You could have opted out, and it would have made almost no difference to what
the world can conclude about you.

Three things about this promise are unusual. It is about the **mechanism**,
not the data: it says nothing about which fields are sensitive and needs no
list of quasi-identifiers. It holds **whatever the attacker knows**, including
every other record in the database, which the k-anonymity attacks exploited. And
it requires **randomness**: a deterministic answer that changes when you leave
changes with certainty, which is the differencing attack.

### Formally

Call two databases $D$ and $D'$ **neighbors** if they differ in one person's
data. A randomized algorithm $M$ is **$\varepsilon$-differentially private**
if for every pair of neighbors and every set $S$ of possible outputs,

$$
P[\,M(D) \in S\,] \;\le\; e^{\varepsilon}\, P[\,M(D') \in S\,].
$$

Because $D$ and $D'$ can be swapped, the ratio is bounded in both directions,
between $e^{-\varepsilon}$ and $e^{\varepsilon}$. Randomized response is
$\ln 3$-differentially private: the database is one person, the neighbors are
"truly yes" and "truly no", and the output probabilities differ by a factor of
at most 3.

Two choices of "neighbor" are in use. **Unbounded** differential privacy adds
or removes one person; **bounded** differential privacy replaces one person's
record with another, keeping the size fixed. A replacement is a removal and an
addition, so a mechanism that is $\varepsilon$-private for one is at most
$2\varepsilon$-private for the other. Always check which one a published
$\varepsilon$ uses. What counts as "one person's data" also matters: in
telemetry, a mechanism may protect one report, one day of reports or one device
forever, and these give very different guarantees for the same $\varepsilon$.

### What $e^{\varepsilon}$ means

$\varepsilon$ is a logarithm, so the real number to look at is $e^{\varepsilon}$,
the largest factor by which your participation can change the probability of
any outcome, and so the largest factor by which it can change anyone's odds
about you. If someone believed beforehand, with odds $o$, that you have a
condition, then after seeing the output their odds are at most
$e^{\varepsilon} \cdot o$, compared with what they would have believed had your
record been left out. The table starts from a prior belief of 1%.

| $\varepsilon$ | $e^{\varepsilon}$ | 1% belief can rise to at most | where it is used |
|---|---|---|---|
| 0.1 | 1.105 | 1.1% | strong, academic |
| 1 | 2.72 | 2.67% | a common recommendation |
| $\ln 3 \approx 1.10$ | 3 | 2.94% | two-coin randomized response |
| 4 | 54.6 | 35.6% | Apple's stated budget for emoji |
| 8 | 2,981 | 96.8% | Apple's stated budget for keyboard words |
| 19.61 | about $3.3 \times 10^{8}$ | nearly 100% | 2020 US census redistricting data, whole release |

Read the table carefully. A small $\varepsilon$ is a strong promise: below
about 1, the output barely moves anyone's beliefs. A large $\varepsilon$ is a
weak promise in the worst case, though not necessarily a weak protection in
practice: the bound is for the luckiest attacker with the most damaging output,
and a well-designed mechanism usually leaks far less on typical outputs. Both
statements are true, and much of the public argument about deployments in
§19.10 and §19.11 is people quoting one of them.

A second reading, which statisticians often find clearer, is about testing. An
attacker who sees the output and must guess whether you are in the data, with
both possibilities equally likely beforehand, cannot be right with probability
more than $e^{\varepsilon}/(1 + e^{\varepsilon})$: 52.5% at $\varepsilon = 0.1$,
73.1% at $\varepsilon = 1$, 88.1% at $\varepsilon = 2$. Section 19.7 will
measure this on the differencing attack.

### Why $\varepsilon$ is a budget

The definition has two properties, proved in §19.9, that turn $\varepsilon$
into a currency. If you publish the outputs of two mechanisms with
$\varepsilon_1$ and $\varepsilon_2$, the pair is
$(\varepsilon_1 + \varepsilon_2)$-private: privacy losses add up. And anything
computed from a private output, without going back to the data, is just as
private. So a data holder can set a total $\varepsilon$, the **privacy
budget**, and spend it across questions, the way one spends money from an
account. When it is spent, the data must stop answering. This is what
k-anonymity lacked: two releases under differential privacy combine into a
release whose guarantee is known in advance.

### What the definition does not say

It does not say that nothing can be learned about you. If a study shows that
smoking causes cancer, an insurer who knows you smoke learns something about
your health, whether or not you were in the study. Differential privacy
promises only that your being in it made little difference. It also does not
say that the result is accurate; accuracy is a separate property of each
mechanism, and the price of privacy. Section 19.14 lists the other limits.

!!! note "Life story: differential privacy"
    **Born:** 2006, Cynthia Dwork, Frank McSherry, Kobbi Nissim and Adam Smith
    (TCC 2006), named by Dwork at ICALP 2006, after Dinur and Nissim (2003)
    and the noisy-query work of 2004 and 2005 · **Purpose:** a mathematical
    guarantee that a release reveals little about any individual, whatever
    the attacker knows and however many releases pile up · **Helped:** the
    2020 US census, telemetry at Google, Apple and Microsoft, and a field of
    research; the four authors won the Gödel Prize in 2017 · **Status:** the
    accepted standard for private statistics; the choice of $\varepsilon$
    remains a policy decision rather than a mathematical one

## 19.7 The Laplace mechanism

*Level: intermediate.*

Randomized response adds noise to each person's answer. When a trusted curator
holds the data, as a census office or a hospital does, it can do far better by
computing the exact answer and adding noise once, scaled to how much one person
could have moved it.

### Sensitivity

The **sensitivity** of a numeric query $f$ is the most it can change between
neighboring databases:

$$
\Delta f = \max_{D, D' \text{ neighbors}} |f(D) - f(D')|.
$$

A count has sensitivity 1: adding or removing one person changes it by at most
one. A sum of incomes has unbounded sensitivity, since one billionaire moves it
by a billion, so private sums first **clip** each value to a range, say
$[0, B]$, which makes the sensitivity $B$ at the cost of distorting the people
outside the range. A maximum has sensitivity as large as the range. An average
is best computed as a noisy sum divided by a noisy count. Sensitivity is a
property of the question, not of the data, and that is what lets the mechanism
promise something about every possible database.

### The mechanism

The **Laplace distribution** with scale $b$ has density

$$
p(x) = \frac{1}{2b}\, e^{-|x|/b},
$$

a two-sided exponential: a sharp peak at 0, falling by a factor of $e$ for every
$b$ you move away. Its mean absolute value is $b$ and its standard deviation is
$\sqrt{2}\,b$. The **Laplace mechanism** publishes

$$
M(D) = f(D) + \mathrm{Lap}(\Delta f / \varepsilon).
$$

**Why it is $\varepsilon$-private.** Fix any output $y$. Its density is
proportional to $e^{-\varepsilon |y - f(D)|/\Delta f}$ in one world and
$e^{-\varepsilon |y - f(D')|/\Delta f}$ in the other. Their ratio is

$$
\exp\!\Big(\frac{\varepsilon}{\Delta f}\big(|y - f(D')| - |y - f(D)|\big)\Big)
\le \exp\!\Big(\frac{\varepsilon}{\Delta f}\,|f(D) - f(D')|\Big)
\le e^{\varepsilon},
$$

by the triangle inequality and then the definition of sensitivity. A bound on
the density ratio at every point gives the same bound for every set of
outputs, which is the definition.

**By hand.** Return to the staff table, where the true count is 5 with Wen and
would be 4 without. Spend $\varepsilon = 0.5$ on the count, so $b = 1/0.5 = 2$.
To draw Laplace noise from a uniform number, use the inverse of its
distribution function: take $u$ uniform between 0 and $\tfrac12$ and a random
sign, and the noise is $\pm b \ln\!\big(1/(1 - 2u)\big)$. With $u = 0.3$ and a
plus sign, the noise is $2 \ln(1/0.4) = 1.83$ and the published answer is
$6.83$. In the world without Wen, the same output needed noise $2.83$, and the
ratio of the two densities at 6.83 is $e^{-1.83/2} / e^{-2.83/2} = e^{0.5}
\approx 1.65$, exactly the bound. Figure 19.3 shows the two curves: wherever
you stand on the axis, one is at most 1.65 times the other.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Two Laplace curves of scale 2, one peaked at 4 and one dashed curve peaked at 5; a dashed vertical line at the output 6.83, where the curves differ by a factor of 1.65" fill="currentColor" font-size="14">
<line x1="40" y1="210" x2="600" y2="210" stroke="currentColor" stroke-width="1.3"/>
<polyline fill="none" stroke="currentColor" stroke-width="2" points="40.0,206.9 55.6,206.0 71.1,204.9 86.7,203.4 102.2,201.5 117.8,199.1 133.3,196.0 148.9,192.1 164.4,187.0 180.0,180.5 195.6,172.1 211.1,161.3 226.7,147.5 242.2,129.7 257.8,106.9 273.3,77.6 288.9,40.0 304.4,77.6 320.0,106.9 335.6,129.7 351.1,147.5 366.7,161.3 382.2,172.1 397.8,180.5 413.3,187.0 428.9,192.1 444.4,196.0 460.0,199.1 475.6,201.5 491.1,203.4 506.7,204.9 522.2,206.0 537.8,206.9 553.3,207.6 568.9,208.1 584.4,208.5 600.0,208.9"/>
<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" points="40.0,208.1 55.6,207.6 71.1,206.9 86.7,206.0 102.2,204.9 117.8,203.4 133.3,201.5 148.9,199.1 164.4,196.0 180.0,192.1 195.6,187.0 211.1,180.5 226.7,172.1 242.2,161.3 257.8,147.5 273.3,129.7 288.9,106.9 304.4,77.6 320.0,40.0 335.6,77.6 351.1,106.9 366.7,129.7 382.2,147.5 397.8,161.3 413.3,172.1 428.9,180.5 444.4,187.0 460.0,192.1 475.6,196.0 491.1,199.1 506.7,201.5 522.2,203.4 537.8,204.9 553.3,206.0 568.9,206.9 584.4,207.6 600.0,208.1"/>
<line x1="376.9" y1="40" x2="376.9" y2="210" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
<text x="384" y="58" font-size="13">output 6.83</text>
<text x="384" y="76" font-size="13">ratio of heights e^0.5 ≈ 1.65</text>
<text x="282" y="32" text-anchor="end" font-size="13">without Wen: true count 4</text>
<text x="330" y="32" font-size="13">with Wen: 5 (dashed)</text>
<text x="40" y="230" text-anchor="middle" font-size="13">−4</text>
<text x="164.4" y="230" text-anchor="middle" font-size="13">0</text>
<text x="288.9" y="230" text-anchor="middle" font-size="13">4</text>
<text x="413.3" y="230" text-anchor="middle" font-size="13">8</text>
<text x="537.8" y="230" text-anchor="middle" font-size="13">12</text>
<text x="320" y="258" text-anchor="middle" font-size="13">published answer = true count + Laplace noise of scale 2 (epsilon 0.5)</text>
</svg>
<figcaption>Figure 19.3. The Laplace mechanism on the staff count. The two worlds' output distributions overlap everywhere, and at no point is one more than e^ε times the other.</figcaption>
</figure>

### Code it: the differencing attack, stopped

A neat way to draw Laplace noise in Python is as the difference of two
independent exponential variables with mean $b$, which has exactly the
Laplace distribution. The code runs the differencing attack of §19.4 many
times, in random worlds where Wen has the condition or not, with each of the
two counts answered at $\varepsilon = 0.5$.

```python
import random, math

random.seed(2006)   # random is fine for a demo; real systems draw from secrets

def laplace(b):
    """Laplace noise with scale b: the difference of two exponentials."""
    return random.expovariate(1 / b) - random.expovariate(1 / b)

def private_count(true_count, epsilon, sensitivity=1):
    return true_count + laplace(sensitivity / epsilon)

eps = 0.5                       # each query; the two together spend 1.0
runs = 20000
right = 0
errors = []
for _ in range(runs):
    wen = random.randrange(2)            # the world: Wen has it (1) or not (0)
    q1 = private_count(4 + wen, eps)     # the other eleven contribute 4
    q2 = private_count(4, eps)
    guess = 1 if q1 - q2 > 0.5 else 0
    right += (guess == wen)
    errors.append(abs(q1 - (4 + wen)))

print(f"attacker guesses Wen's value right in {100 * right / runs:.1f}% of runs")
print(f"best possible at total epsilon 1: {100 * math.e / (1 + math.e):.1f}%")
print(f"average error of one answer: {sum(errors) / runs:.2f} (theory {1 / eps:.2f})")
```

```
attacker guesses Wen's value right in 56.4% of runs
best possible at total epsilon 1: 73.1%
average error of one answer: 2.01 (theory 2.00)
```

The attack that was certain is now barely better than a coin, and the
guarantee says no attack on these two answers can do better than 73.1%. The
price is an error of about 2 on each count. On a count of 5, that is a lot. On
a count of 50,000 it is nothing. **The noise depends on the sensitivity and
$\varepsilon$, not on the size of the group**, so differential privacy is cheap
for statistics about many people and expensive for statistics about few. That
one sentence explains most of the census debate in §19.11.

### Break it: noise that leaks through its last bits

The proof above is about real numbers. Computers use floating point, and in 2012
Ilya Mironov, then at Microsoft Research, showed that textbook Laplace code
breaks the guarantee completely. The usual code draws $u$ from
`random.random()`, which returns one of $2^{53}$ evenly spaced values, and
computes $x + b \ln u$ with a random sign. Only a sparse, irregular set of
floating-point numbers can come out, and the set for true value 0 is
different from the set for true value 1. An attacker who sees the exact bits
of the output can check which set it lies in.

```python
import random, math

random.seed(2012)   # random is fine for a demo; real systems draw from secrets
b = 2.0             # Laplace scale: sensitivity 1, epsilon 0.5
GRID = 2 ** 53      # random.random() returns k / 2**53

def naive_laplace_release(x):
    """The textbook formula in floating point: x + sign * b * ln(u)."""
    u = random.random() or 0.5
    sign = 1 if random.random() < 0.5 else -1
    return x - sign * b * math.log(u)

def possible(y, x):
    """Could output y have come from true value x? Search the grid near u."""
    for sign in (1, -1):
        target = math.exp(-(y - x) / (sign * b)) if sign * (y - x) >= 0 else None
        if target is None or target > 1:
            continue
        k = round(target * GRID)
        for kk in range(max(k - 3, 1), k + 4):
            if x - sign * b * math.log(kk / GRID) == y:
                return True
    return False

trials, exposed = 2000, 0
for _ in range(trials):
    y = naive_laplace_release(1)            # the true count is 1
    if possible(y, 1) and not possible(y, 0):
        exposed += 1
print(f"outputs that rule out 'the count is 0': {exposed} of {trials}")
```

```
outputs that rule out 'the count is 0': 1232 of 2000
```

In 62% of releases, the output is one that true value 0 could never have
produced. The definition allows a factor of $e^{0.5}$, not a factor of
infinity; this mechanism is not differentially private at all, and nothing in
its statistics looks wrong.

**Fix it.** Mironov proposed the **snapping mechanism**, which rounds the
output to a coarse grid and clamps it. The simpler fix for counts is to make
the noise an integer from the start: the **discrete Laplace** (or two-sided
geometric) distribution, with $P(k) \propto e^{-\varepsilon |k|}$, is
$\varepsilon$-private for integer queries of sensitivity 1, and every integer
can come from either world. Clément Canonne, Gautam Kamath and Thomas Steinke
gave exact samplers for it and for a **discrete Gaussian** in 2020, and the
2020 census used the discrete Gaussian.

```python
import random, math
from collections import Counter

random.seed(2020)   # random is fine for a demo; real systems draw from secrets
eps = 0.5
p = 1 - math.exp(-eps)

def geometric():
    """Failures before the first success, each try succeeding with probability p."""
    k = 0
    while random.random() >= p:
        k += 1
    return k

def discrete_laplace_release(x):
    """Integer noise: P(noise = k) is proportional to exp(-eps * |k|)."""
    return x + geometric() - geometric()

runs = 200000
from0 = Counter(discrete_laplace_release(0) for _ in range(runs))
from1 = Counter(discrete_laplace_release(1) for _ in range(runs))
print(f"output  count=0  count=1  ratio   (limit e^eps = {math.exp(eps):.3f})")
for y in range(-3, 5):
    print(f"{y:6} {from0[y]:8} {from1[y]:8} {from1[y] / from0[y]:6.3f}")
```

```
output  count=0  count=1  ratio   (limit e^eps = 1.649)
    -3    10942     6599  0.603
    -2    18155    10897  0.600
    -1    29653    18028  0.608
     0    48887    29771  0.609
     1    29743    49033  1.649
     2    18040    29580  1.640
     3    11098    18103  1.631
     4     6504    10966  1.686
```

Every output appears in both worlds, and the ratio sits at $e^{0.5}$ or
$e^{-0.5}$, up to the sampling noise of the experiment (the 1.686 is a count of
about 6,500 wobbling by 1.5%). A careful implementation also samples without
floating point at all, as Canonne, Kamath and Steinke do, and runs in time that
does not depend on the secret, since a sampler that takes longer for some
outputs leaks through the clock.

!!! note "Life story: the floating-point attack on Laplace noise"
    **Born:** 2012, Ilya Mironov, "On Significance of the Least Significant
    Bits for Differential Privacy" (CCS 2012) · **Purpose:** to show that
    the textbook Laplace mechanism, run in double-precision arithmetic, can
    reveal its input exactly through which floating-point values it is able
    to output · **Helped:** the snapping mechanism; a habit of integer and
    exact samplers, including the discrete Gaussian of Canonne, Kamath and
    Steinke (2020) used by the 2020 census; later attacks on timing and on
    other floating-point mechanisms (2021 to 2022) · **Status:** the
    standard warning that a proof about real numbers is not a proof about code

## 19.8 The Gaussian mechanism and (ε, δ)

*Level: intermediate.*

The Laplace mechanism is ideal for one number. For a long vector of numbers,
such as a histogram where one person can move every bar, or a gradient in
machine learning, it is wasteful, and a relaxation of the definition allows
the bell-shaped Gaussian instead.

A mechanism is **$(\varepsilon, \delta)$-differentially private** if for all
neighbors and all sets of outputs

$$
P[\,M(D) \in S\,] \le e^{\varepsilon}\, P[\,M(D') \in S\,] + \delta.
$$

Read $\delta$ as a small probability with which the $e^{\varepsilon}$ bound may
fail. How small? Consider the mechanism that publishes each person's full
record with probability $\delta$ and otherwise nothing. It satisfies the
definition with $\varepsilon = 0$, and it publishes about $\delta n$ complete
records. So $\delta$ must be much smaller than $1/n$; values like $10^{-6}$ to
$10^{-10}$ are typical. In return, the Gaussian becomes available.

**The Gaussian mechanism** adds noise $N(0, \sigma^2)$ to each coordinate, with
the sensitivity now measured in the Euclidean ($L_2$) norm:

$$
\Delta_2 f = \max_{D, D'} \lVert f(D) - f(D') \rVert_2, \qquad
\sigma = \frac{\Delta_2 f \sqrt{2 \ln(1.25/\delta)}}{\varepsilon}
$$

gives $(\varepsilon, \delta)$-privacy for $\varepsilon < 1$ (the classic
analysis in Dwork and Roth's 2014 book; tighter calibrations exist). The gain
is in the norm. If one person can change each of $d$ counts by 1, the $L_1$
sensitivity that Laplace needs is $d$, but the $L_2$ sensitivity is only
$\sqrt{d}$.

```python
import math

# A survey of d yes/no questions: one person can move every count by 1.
# L1 sensitivity is d, L2 sensitivity is sqrt(d).
eps, delta = 0.5, 1e-6
c = math.sqrt(2 * math.log(1.25 / delta))       # about 5.30 for this delta

print("questions  Laplace std  Gaussian std   (per count, total epsilon 0.5)")
for d in (1, 10, 100, 1000):
    laplace_std = math.sqrt(2) * d / eps         # scale d/eps on every count
    gauss_std = c * math.sqrt(d) / eps           # sigma from the L2 sensitivity
    print(f"{d:9} {laplace_std:12.1f} {gauss_std:13.1f}")
```

```
questions  Laplace std  Gaussian std   (per count, total epsilon 0.5)
        1          2.8          10.6
       10         28.3          33.5
      100        282.8         106.0
     1000       2828.4         335.1
```

For one count, Laplace wins by a factor of almost four. For a thousand, the
Gaussian wins by a factor of eight. The Gaussian also adds up gracefully under
composition (§19.9 and §19.16), which is why training neural networks with
differential privacy (§19.13) and the 2020 census both use Gaussian noise, the
census in the discrete form of §19.7. The cost is $\delta$ and a weaker
worst-case statement: with probability up to $\delta$, an output may be much
more revealing than $e^{\varepsilon}$ allows.

## 19.9 Composition, the budget and post-processing

*Level: intermediate.*

Privacy is spent by answering. This section proves that, measures it, and shows
the one operation that is free.

### Basic composition

If $M_1$ is $\varepsilon_1$-private and $M_2$ is $\varepsilon_2$-private, then
publishing both outputs is $(\varepsilon_1 + \varepsilon_2)$-private, even if
$M_2$ is chosen after seeing the output of $M_1$. For independent noise the
proof is one line: the probability of a pair of outputs is the product of the
two probabilities, and each changes by at most its own factor, so the product
changes by at most $e^{\varepsilon_1} e^{\varepsilon_2} =
e^{\varepsilon_1 + \varepsilon_2}$. For $(\varepsilon, \delta)$ mechanisms the
$\delta$s add too.

The definition is doing exactly what it should. Here is what happens to a
system that answers each query at $\varepsilon = 0.5$ and lets the analyst ask
again.

```python
import random

random.seed(42)     # random is fine for a demo; real systems draw from secrets

def laplace(b):
    return random.expovariate(1 / b) - random.expovariate(1 / b)

true_count = 5          # query 1 from the staff table
eps = 0.5               # what each single answer costs

print("  asks   average answer   rounded   epsilon spent")
for k in (1, 10, 100, 1000, 10000):
    answers = [true_count + laplace(1 / eps) for _ in range(k)]
    avg = sum(answers) / k
    print(f"{k:6} {avg:16.3f} {round(avg):9} {k * eps:15.1f}")
```

```
  asks   average answer   rounded   epsilon spent
     1            6.989         7             0.5
    10            5.798         6             5.0
   100            5.414         5            50.0
  1000            4.888         5           500.0
 10000            5.021         5          5000.0
```

The noise averages away as $1/\sqrt{k}$. After 100 repeats the rounded average
is the exact count, and the same trick on query 2 gives Wen's value exactly.
Every answer was "private"; the system was not. That is why a deployment must
**track a budget per person across all queries and refuse to answer once it is
spent**, why it must not let users get fresh noise by asking the same question
in a different way, and why caching the first noisy answer to a repeated
question is a cheap and common defense. The same arithmetic is the reason a
telemetry system that sends a fresh noisy report every day leaks the truth
over a year, unless it memoizes (§19.10).

### Advanced composition

Adding $\varepsilon$s is a worst-case bound, and for many small steps it is
pessimistic. Cynthia Dwork, Guy Rothblum and Salil Vadhan proved in 2010 that
$k$ adaptively chosen $\varepsilon$-private steps are, for any $\delta' > 0$,
$(\varepsilon', k\delta + \delta')$-private with

$$
\varepsilon' = \sqrt{2k \ln(1/\delta')}\;\varepsilon + k\,\varepsilon\,(e^{\varepsilon} - 1).
$$

For small $\varepsilon$ the total grows like $\sqrt{k}$ rather than $k$.

```python
import math

def basic(k, eps):
    return k * eps

def advanced(k, eps, delta_prime):
    """Dwork, Rothblum and Vadhan (2010): k adaptive eps-DP steps."""
    return (math.sqrt(2 * k * math.log(1 / delta_prime)) * eps
            + k * eps * (math.exp(eps) - 1))

eps, dp = 0.1, 1e-6
print("   k   basic   advanced (delta' = 1e-6)")
for k in (10, 100, 1000, 10000):
    print(f"{k:5} {basic(k, eps):7.1f} {advanced(k, eps, dp):10.1f}")
```

```
   k   basic   advanced (delta' = 1e-6)
   10     1.0        1.8
  100    10.0        6.3
 1000   100.0       27.1
10000  1000.0      157.7
```

For ten steps the simple sum is better; for ten thousand, the advanced bound is
six times smaller. Modern accounting (Rényi and zero-concentrated privacy,
§19.16) is tighter still, and it is how the census and private machine learning
count their budgets. None of them makes the budget infinite: every bound still
grows without limit as $k$ grows, as the fundamental law of §19.4 says it must.

### Parallel composition

If the queries look at **disjoint** groups of people, say one count per census
block, each person affects only one answer, and the whole set costs only the
largest $\varepsilon$ among them, not the sum. That is why a census can publish
millions of block counts without spending millions of budgets, and why the
budget in §19.11 is split across *levels of geography and kinds of table*, not
across places.

### Post-processing is free

If $M$ is $\varepsilon$-private and $g$ is any function that does not look at
the data, then $g(M(D))$ is $\varepsilon$-private. The reason: for any set $S$
of final results, $g(M(D)) \in S$ is the same event as $M(D) \in g^{-1}(S)$,
and the definition already covers every set of $M$'s outputs. So rounding to
integers, replacing negative counts by zero, making a table's rows add up to its
total, fitting a model, or drawing a chart all cost nothing. A public agency can
let anyone reprocess its noisy tables. The census's TopDown algorithm relies on
this: it spends its budget on noisy measurements and then does a large amount
of post-processing, all of it free in privacy, though, as §19.11 shows, not free
in accuracy.

## 19.10 Local differential privacy

*Level: intermediate.*

Everything since §19.6 assumed a **trusted curator**: someone who holds the raw
data and adds noise before publishing. For a census office that may be
acceptable. For a company collecting what millions of people type, it is the
problem itself: the raw data can be breached, subpoenaed or misused, however
carefully the published statistics are noised. In the **local model**, each
device randomizes its own data before it leaves, as Warner's respondents did,
and the collector never holds anything true about any one person. Figure 19.4
puts the two models side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Central model: people send true data to a curator who adds noise once before publishing. Local model: each device adds noise before sending, and the collector only ever sees noisy reports" fill="currentColor" font-size="14">
<text x="10" y="22" font-weight="bold">Central model</text>
<rect x="10" y="34" width="120" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="64" text-anchor="middle">people</text>
<text x="70" y="84" text-anchor="middle" font-size="13">true values</text>
<line x1="130" y1="69" x2="230" y2="69" stroke="currentColor" stroke-width="1.5"/>
<text x="180" y="62" text-anchor="middle" font-size="13">raw data</text>
<rect x="230" y="34" width="190" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="64" text-anchor="middle">trusted curator</text>
<text x="325" y="84" text-anchor="middle" font-size="13">exact answer + noise once</text>
<line x1="420" y1="69" x2="500" y2="69" stroke="currentColor" stroke-width="1.5"/>
<rect x="500" y="34" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="565" y="64" text-anchor="middle">published</text>
<text x="565" y="84" text-anchor="middle" font-size="13">error ~ 1/ε</text>
<text x="10" y="146" font-weight="bold">Local model</text>
<rect x="10" y="158" width="120" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="188" text-anchor="middle">each device</text>
<text x="70" y="208" text-anchor="middle" font-size="13">adds its own noise</text>
<line x1="130" y1="193" x2="230" y2="193" stroke="currentColor" stroke-width="1.5"/>
<text x="180" y="186" text-anchor="middle" font-size="13">noisy reports</text>
<rect x="230" y="158" width="190" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="188" text-anchor="middle">collector</text>
<text x="325" y="208" text-anchor="middle" font-size="13">never sees a true value</text>
<line x1="420" y1="193" x2="500" y2="193" stroke="currentColor" stroke-width="1.5"/>
<rect x="500" y="158" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="565" y="188" text-anchor="middle">published</text>
<text x="565" y="208" text-anchor="middle" font-size="13">error ~ √n/ε</text>
</svg>
<figcaption>Figure 19.4. Central and local differential privacy. The local model removes the trusted curator and pays for it in accuracy.</figcaption>
</figure>

Formally, a randomizer $R$ is **$\varepsilon$-locally private** if for any two
inputs $x, x'$ and any report $y$, $P[R(x) = y] \le e^{\varepsilon} P[R(x') = y]$.
Randomized response is the basic example. The price is large: in the central
model the noise on a count is about $1/\varepsilon$ whatever $n$ is; in the local
model every one of the $n$ reports carries its own noise, and the total error
grows like $\sqrt{n}/\varepsilon$.

```python
import random, math

random.seed(2014)   # random is fine for a demo; real systems draw from secrets
eps = math.log(3)   # the same privacy level for both models
n = 10000
people = [random.random() < 0.30 for _ in range(n)]   # one fixed population
true_rate = sum(people) / n

def laplace(b):
    return random.expovariate(1 / b) - random.expovariate(1 / b)

def central():
    """A trusted curator counts exactly, then adds Laplace noise once."""
    return (sum(people) + laplace(1 / eps)) / n

def local():
    """Every person randomizes their own bit with Warner's coin (epsilon ln 3)."""
    yes = sum(t if random.random() < 0.5 else random.random() < 0.5 for t in people)
    return 2 * yes / n - 0.5

def rms_error(model, trials=200):
    return math.sqrt(sum((model() - true_rate) ** 2 for _ in range(trials)) / trials)

c, l = rms_error(central), rms_error(local)
print(f"true rate {true_rate:.4f}")
print(f"central model error: {c:.5f}  ({c * n:.1f} people)")
print(f"local model error:   {l:.5f}  ({l * n:.1f} people)")
print(f"the local model is about {l / c:.0f} times noisier")
```

```
true rate 0.2986
central model error: 0.00013  (1.3 people)
local model error:   0.00852  (85.2 people)
the local model is about 64 times noisier
```

At ten thousand people the local model is off by 85 people where the central
one is off by about one. Local privacy is therefore used where there are
millions or billions of reports and the question is "what is common?", not
"how many exactly?".

**Google's RAPPOR** (Úlfar Erlingsson, Vasyl Pihur and Aleksandra Korolova,
2014) was the first large deployment. Chrome used it to learn, among other
things, which home pages and search engines users had set, to spot software
that hijacked those settings. Each client hashes its string into a small Bloom
filter and applies randomized response to every bit twice. The first, the
**permanent** randomized response, is computed once per value and remembered,
so that sending the same value every day does not let the server average the
noise away as in §19.9. The second, **instantaneous** one is fresh each time,
so that the remembered bits do not become a stable fingerprint.

**Apple** announced differential privacy at its developer conference in June
2016 and used it from iOS 10 and macOS 10.12 to learn popular emoji, new words
typed on the keyboard, and later problem web sites in Safari and which Health
data types people use. Its published overview lists, for each use, a privacy
budget and a limit on reports ("donations") per day: $\varepsilon = 4$ and one
donation a day for emoji, $\varepsilon = 8$ and two a day for keyboard words,
and $\varepsilon = 2$ for Health types; the figures have changed between
versions of the document. In 2017 Jun Tang, Aleksandra Korolova and colleagues
reverse-engineered the macOS implementation and reported that each submitted
datum cost $\varepsilon$ of 1 or 2 but that the daily loss across four
features could reach 16, and that the budget **renewed every day**, so the loss over time had no
bound. Apple disputed the reading, saying the researchers added up budgets of
different features that are kept apart. Both sides agree on the facts that
matter here: the guarantee was per day, and the numbers were large.

**Microsoft** (Bolin Ding, Janardhan Kulkarni and Sergey Yekhanin, 2017)
collected app-usage statistics from Windows 10 with local mechanisms designed
for repeated collection: one randomized bit about a counter per report, and a
memoization scheme so that a device whose value does not change keeps sending
the same noisy answer. The paper reports deployment across millions of devices.

!!! note "Life story: RAPPOR"
    **Born:** 2014, Úlfar Erlingsson, Vasyl Pihur and Aleksandra Korolova,
    Google (CCS 2014) · **Purpose:** collect statistics about strings, such as
    Chrome settings, from millions of browsers without learning any one
    browser's value · **Helped:** Chrome's detection of settings hijacking;
    the first large deployment of local differential privacy, and the idea of
    memoized (permanent) randomized response · **Status:** published as open
    source; the reference design for local randomized response, which later
    local and shuffle-model systems build on

!!! note "Life story: Apple's local differential privacy"
    **Born:** June 2016, announced at Apple's developer conference; in iOS 10
    and macOS 10.12 · **Purpose:** learn popular emoji, new words, problem
    web sites and Health data types without collecting what each user did ·
    **Helped:** brought the phrase "differential privacy" to the public;
    count-mean sketches at very large scale · **Status:** in use; criticized
    in 2017 (Tang et al.) for per-day budgets as high as 16 that renew
    daily, which Apple disputed; the standard example of why a published
    $\varepsilon$ must say per what

## 19.11 The 2020 United States census

*Level: intermediate.*

The largest and most argued-over use of differential privacy is the 2020
census of the United States. The Census Bureau must publish detailed counts by
block, the smallest unit of geography, of which there are millions, because
those counts draw congressional and local districts under the Voting Rights Act
and apportion federal money. Title 13 forbids it from publishing anything that
identifies a person.

For 1990, 2000 and 2010 its main protection was **swapping**: a small, secret
fraction of households with rare characteristics were swapped with similar
households in other blocks before tabulation. Then, after the reconstruction
results of §19.4, the Bureau tried the attack on itself. Using a subset of the
2010 tables, its researchers reconstructed a record of block, sex, age, race and
ethnicity for each of the 308.7 million people counted. The Bureau reported that
the reconstructed records matched the confidential ones exactly for about 46%
of people, and for about 71% when age was allowed to be off by one year. It then
linked the reconstructed records to commercial databases with names: the links
named about 45% of the population, and when checked against the confidential
census, about 38% of those were right, some 17% of the population, roughly 52
million people. The figures come from the Bureau's own presentations and court
filings; Steven Ruggles and David Van Riper, among others, argued that many such
matches would occur by chance and that the risk was overstated. The Bureau
concluded that swapping no longer protected anyone against an attacker with a
laptop and a linear-program solver, and adopted differential privacy for 2020.

### TopDown

The algorithm, called **TopDown**, works down the geographic hierarchy shown in
Figure 19.5.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The TopDown algorithm: noisy measurements are taken at six levels, nation, state, county, tract, block group and block; then post-processing works from the top down to make every level non-negative, whole and consistent with the level above" fill="currentColor" font-size="14">
<text x="10" y="20" font-weight="bold">1. Measure (spends ε)</text>
<text x="380" y="20" font-weight="bold">2. Post-process (free)</text>
<rect x="10" y="32" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="51" text-anchor="middle">nation: tables + noise</text>
<rect x="10" y="66" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="85" text-anchor="middle">state: tables + noise</text>
<rect x="10" y="100" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="119" text-anchor="middle">county: tables + noise</text>
<rect x="10" y="134" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="153" text-anchor="middle">tract: tables + noise</text>
<rect x="10" y="168" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="187" text-anchor="middle">block group: tables + noise</text>
<rect x="10" y="202" width="300" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="221" text-anchor="middle">block: tables + noise</text>
<line x1="330" y1="46" x2="330" y2="216" stroke="currentColor" stroke-width="1.5"/>
<polygon points="324,206 336,206 330,218" fill="currentColor"/>
<text x="350" y="51">fix the nation's tables</text>
<text x="350" y="85">fit states to the nation</text>
<text x="350" y="119">fit counties to their state</text>
<text x="350" y="153">... and so on down,</text>
<text x="350" y="187">whole, non-negative, adding up</text>
<text x="350" y="221">state totals kept exact</text>
<text x="320" y="246" text-anchor="middle" font-size="13">the budget is divided among levels and tables; each person counts once per level</text>
</svg>
<figcaption>Figure 19.5. TopDown, in outline. Noise is added to many tables at every level; the post-processing that makes the results look like a census costs no privacy but moves numbers around.</figcaption>
</figure>

First, for each level (nation, state, county, tract, block group, block), the
Bureau computes a set of tables from the confidential data and adds noise to
every cell: in production, discrete Gaussian noise accounted under
zero-concentrated differential privacy (§19.16). Each person appears once per
level, so the levels compose by addition and the tables within a level by
parallel composition across places. Second, post-processing, free in privacy,
turns the noisy measurements into an ordinary-looking census: starting at the
top, it solves an optimization problem to find whole, non-negative counts as
close as possible to the noisy measurements that also add up to the level
above. A few numbers were declared **invariant** and published exactly, outside
the privacy guarantee: each state's total population, and the number of housing
units and of group-quarters facilities in each block.

### The budget

On 9 June 2021 the Bureau announced the budget for the redistricting data: a
total of $\varepsilon = 19.61$, with 17.14 for the person tables and 2.47 for
the housing-unit tables. (In the zero-concentrated accounting actually used,
the persons file had $\rho = 2.56$; converting to an $\varepsilon$ needs a
choice of $\delta$, which is why papers quote slightly different
$\varepsilon$s.) This number is **a budget across the whole release**, every
table at every level for every person, not the privacy of one statistic, and
it was chosen by the Bureau's Data Stewardship Executive Policy committee after
data users had studied demonstration files made with smaller budgets that they
found too noisy. Later releases, such as the Demographic and Housing
Characteristics File of 2023, spent further budgets of their own.

### The argument

Accuracy was good for states and large counties and poor for small places. A
block of a few dozen people could gain or lose several people, and early
demonstration files showed oddities such as blocks with children and no adults,
which post-processing creates when it forces noisy numbers to be whole and
consistent. Rural counties, small towns and tribal nations, which rely on
small-area counts for funding, objected. Christopher Kenny and colleagues
argued in *Science Advances* in 2021 that the demonstration data distorted
the racial and partisan make-up of districts enough to matter for redistricting
and Voting Rights Act cases. Others replied that swapping had always moved
small-area numbers too, only secretly, and that the noise was now published
and measurable, which let users account for it.

On 10 March 2021 Alabama sued the Department of Commerce, challenging both the
delay of the redistricting data and the use of differential privacy. On 29 June
2021 a three-judge federal court denied a preliminary injunction, holding among
other things that, since no data had been released yet, there was no evidence
that differential privacy would in practice skew it. The redistricting data was
released in August 2021, and the case was dismissed in September 2021 without a
ruling on the merits. The underlying question, how much accuracy a democracy
should trade for whose privacy, was not one a court could settle, and §19.14
returns to it.

!!! note "Life story: the 2020 census Disclosure Avoidance System"
    **Born:** decided after the Bureau's 2010 reconstruction experiment;
    production budget announced 9 June 2021 · **Purpose:** publish the 2020
    census, including block-level redistricting data, under differential
    privacy instead of household swapping · **Helped:** the largest
    differentially private release ever made; open-source code; a public
    record of exactly how much noise was added · **Status:** used for the
    2020 census products ($\varepsilon = 19.61$ for the redistricting data,
    17.14 persons and 2.47 housing units); challenged by Alabama in 2021
    (injunction denied, case dismissed); the accuracy debate for small areas
    continues

## 19.12 In the real world

*Level: intermediate.*

The census was not the first official use. The Bureau's **OnTheMap**, which maps
where people live and work, has used a differentially private synthetic-data
method since 2008 (Ashwin Machanavajjhala and colleagues, ICDE 2008), the first
production deployment. Some other uses, briefly:

- **Google** released an open-source differential privacy library in 2019, and
  in April 2020 published COVID-19 Community Mobility Reports, showing
  changes in visits to shops, parks and workplaces by region, computed with
  differential privacy.
- **LinkedIn** applies differential privacy to analytics it shows advertisers
  and to its Audience Engagements API (described by Ryan Rogers and colleagues,
  2020), which answers marketers' questions about what members engage with.
- **Facebook** and the Social Science One project released a data set of
  URLs shared on Facebook to election researchers in 2020, with differentially
  private noise on the counts of who saw, shared and clicked them.
- **OpenDP**, a Harvard-led open-source project launched in 2020, builds
  vetted libraries; with Microsoft it produced SmartNoise.
- **The Wikimedia Foundation** began publishing, in June 2023, daily
  pageview counts per article and per country, long requested by editors and
  researchers and withheld because they could reveal what readers in small
  countries read. The release uses Tumult Analytics.

A pattern runs through all of them: differential privacy is chosen where the
data is valuable, the releases are repeated or open-ended, and nobody can list
in advance what outside data an attacker will have. The open-source libraries
matter as much as the theory, because §19.7 showed how easily a correct
formula becomes a broken program.

## 19.13 Secure aggregation and federated learning

*Level: intermediate.*

**Federated learning** (Brendan McMahan and colleagues at Google, 2017) trains a
model without collecting the training data: each phone improves the current
model on its own data, say what its owner typed, and sends back only the
change, a vector of numbers called an update; the server averages the updates
and repeats. Google used it for the Gboard keyboard from 2017. It is often
described as private, and **on its own it is not**. An update is a function of
the data it was computed from. Ligeng Zhu, Zhijian Liu and Song Han showed in
2019 that images and text can be rebuilt from a single update; Reza Shokri and
colleagues showed in 2017 that a model's outputs reveal whether a given record
was in its training set; and Nicholas Carlini and colleagues extracted
verbatim training text, including names and phone numbers, from the language
model GPT-2 in 2021. Two separate tools are needed: one so that the server sees
only the sum of updates, and one so that the sum itself does not reveal anyone.

### Secure aggregation

Keith Bonawitz and colleagues at Google published **practical secure
aggregation** in 2017. Every pair of phones agrees on a secret seed by
Diffie-Hellman, expands it into a random mask, and one of the pair adds the mask
to its update while the other subtracts it. Each upload looks random to the
server, and in the sum every mask cancels.

**By hand**, with three phones, arithmetic mod 100, private values 7, 3 and 9,
and pair masks $m_{12} = 41$, $m_{13} = 18$, $m_{23} = 66$: phone 1 sends
$7 + 41 + 18 = 66$; phone 2 sends $3 - 41 + 66 = 28$; phone 3 sends
$9 - 18 - 66 = -75 \equiv 25$. The server adds $66 + 28 + 25 = 119 \equiv 19$,
which is $7 + 3 + 9$, and has seen nothing else.

The hard part is phones that drop out midway, since their masks then fail to
cancel. In the real protocol each phone also splits its Diffie-Hellman secret
into Shamir shares ([Chapter 2](02-Secret-Sharing.md)) among the others, so
that any $t$ survivors can rebuild a dropped phone's masks. A second, private
"self-mask" on each update, also shared, stops a server from claiming a slow
phone dropped out in order to unmask it.

```python
import hashlib

M = 2 ** 16                                   # all arithmetic mod 65536
values = {1: 7, 2: 3, 3: 9, 4: 5}             # each phone's private number

def seed(i, j):
    """A secret shared by phones i and j; real phones agree on it with Diffie-Hellman."""
    return hashlib.sha256(f"pair {min(i, j)}-{max(i, j)}".encode()).digest()

def mask(i, j):
    return int.from_bytes(hashlib.sha256(seed(i, j) + b"mask").digest(), "big") % M

def masked(i):
    """Add the mask shared with every higher phone, subtract every lower one's."""
    y = values[i]
    for j in values:
        if j > i:
            y += mask(i, j)
        elif j < i:
            y -= mask(i, j)
    return y % M

sent = {i: masked(i) for i in values}
print("what the server receives:", sent)
print("sum of what it receives: ", sum(sent.values()) % M, " true sum:", sum(values.values()))

# Phone 3 drops out after the masks were agreed but before it sends.
alive = [1, 2, 4]
partial = sum(sent[i] for i in alive) % M
print("sum without phone 3:     ", partial, " (garbage: phone 3's masks do not cancel)")
# The survivors reveal what they shared with phone 3 (in the real protocol,
# shares of phone 3's key let any t survivors rebuild it), and the server removes it.
for i in alive:
    partial = (partial - mask(i, 3)) % M if i < 3 else (partial + mask(i, 3)) % M
print("after removing them:     ", partial, " true sum of 1, 2, 4:", values[1] + values[2] + values[4])
```

```
what the server receives: {1: 16233, 2: 21077, 3: 35446, 4: 58340}
sum of what it receives:  24  true sum: 24
sum without phone 3:      30114  (garbage: phone 3's masks do not cancel)
after removing them:      15  true sum of 1, 2, 4: 15
```

Secure aggregation hides each input and checks none: a phone can send an
enormous update and poison the model. Prio
([Chapter 10](10-Multi-Party-Computation-in-Practice.md), §10.8) adds proofs
that each input is valid, with two or more servers instead of one.

### DP-SGD

The sum still describes its inputs. Martín Abadi and colleagues at Google showed
in 2016 how to train a neural network with differential privacy, a method now
called **DP-SGD**. For each batch of examples, compute each example's gradient
separately, **clip** it to a fixed length $C$ so that no one example can move
the model by more than $C$ (that is the sensitivity), add up the clipped
gradients, and add Gaussian noise with standard deviation $\sigma C$ before
taking the step. A careful accountant, their **moments accountant**, tracks the
privacy spent over thousands of steps far more tightly than §19.9's bounds. In
federated learning the same recipe runs per user rather than per example, and
the noise can be added inside secure aggregation, each phone contributing a
share of it, so that no party ever sees an un-noised sum. Accuracy drops, often
by a few percentage points, and the drop is worst for rare groups and unusual
examples, the very people a model most needs to learn from.

!!! note "Life story: secure aggregation"
    **Born:** 2017, Keith Bonawitz, Vladimir Ivanov, Ben Kreuter, Antonio
    Marcedone, Brendan McMahan, Sarvar Patel, Daniel Ramage, Aaron Segal and
    Karn Seth, Google (CCS 2017) · **Purpose:** let a server learn the sum of
    many phones' updates and nothing else, even when phones drop out ·
    **Helped:** federated learning at Google; later protocols with lower
    cost per phone (Bell et al., 2020) · **Status:** in use; protects inputs
    from the server, not the sum from its readers, so it is paired with
    differential privacy

!!! note "Life story: DP-SGD"
    **Born:** 2016, Martín Abadi, Andy Chu, Ian Goodfellow, Brendan McMahan,
    Ilya Mironov, Kunal Talwar and Li Zhang, Google ("Deep Learning with
    Differential Privacy", CCS 2016) · **Purpose:** train neural networks so
    that the model reveals little about any one training example ·
    **Helped:** open-source libraries for private training; private
    federated learning in production · **Status:** the standard method for
    private training; its accuracy cost and the choice of $\varepsilon$ are
    active research

## 19.14 What differential privacy cannot protect

*Level: intermediate.*

Differential privacy is a precise promise, and its limits are as precise.

- **Groups.** The promise is about one person. For a group of $k$ it degrades
  to $k\varepsilon$: a household of four in a release at $\varepsilon = 1$ is
  protected only at $\varepsilon = 4$, where $e^{4} \approx 55$.
- **Correlated data.** "One person's record" is not always one person's
  information. Genomes are shared with relatives, a household's records
  describe each other, a person's location today predicts tomorrow's. Daniel
  Kifer and Ashwin Machanavajjhala showed in 2011 that no mechanism can be
  useful and protect against every pattern of correlation; the definition
  protects the record you contribute, not every fact that others' records
  carry about you.
- **What the aggregate itself says.** A private study can still show that a
  district's children have high lead levels, which then affects everyone
  known to live there. Had Strava's heat map of 2017 been differentially
  private, it would have hidden each soldier and still shown the base, because
  the base was a group pattern. Differential privacy protects individuals, not
  groups, places or populations from what is true about them.
- **Small numbers.** Noise of fixed size swamps small counts. The people in
  small towns, rare diseases and small minorities get the least accurate
  statistics, and they are the ones whose statistics are hardest to get any
  other way.
- **The choice of $\varepsilon$.** The mathematics says what $\varepsilon$
  means; it does not say what it should be. Theorists suggest values around
  1; deployments run from about 1 to well above 10, often per day or per
  report. Who chooses, who gains the accuracy and who bears the risk are
  political questions, as the census showed, and they deserve a public answer.
- **The curator and the code.** In the central model the raw data still sits
  somewhere, and differential privacy says nothing about who can read it.
  Floating-point leaks (§19.7), timing, budget bugs and repeated queries break
  the guarantee in practice. It is a property of a whole system, checked like
  cryptography: by proof, by review and by attack.

## 19.15 Mars: Arcadia City's privacy charter

*Level: intermediate.*

Arcadia City, on the slopes of Erebus Montes, is a few thousand people in sealed
domes, 3 to 22 light-minutes from Earth, where everyone knows everyone and any
"anonymous" record of the clinic or the airlocks is a portrait of a neighbor.
Chapters 10, 12 and 14 mentioned in passing that the settlement's charter
forbids some things. Here is the charter. Each rule is short, and each points to
the chapter of this book that makes it possible rather than a promise.

<div class="mars-steps" markdown>

1. **Collect only what is needed, and prove rather than show.** The airlocks
   check that a resident is cleared without learning who
   ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)); the school and the
   swim club see one vaccine claim, not a record
   ([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)).
2. **No single person holds the city's keys.** The master key is shared among
   the six district wardens, any four of whom can rebuild it, refreshed every
   year ([Chapter 2](02-Secret-Sharing.md)); daily decryption and signing are
   done by threshold, so the key is never assembled
   ([Chapter 4](04-Threshold-Cryptography.md)).
3. **Medical records do not leave Mars.** Earth laboratories compute on them
   encrypted ([Chapter 12](12-Homomorphic-Encryption.md)); clinics on both
   planets pool numbers by secure computation
   ([Chapter 10](10-Multi-Party-Computation-in-Practice.md)); records inside
   the city are encrypted to roles, such as the medic on shift
   ([Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md)); drug
   lookups from Earth's registry do not reveal the drug
   ([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)).
4. **Children's and women's health data are pooled only by secure aggregation
   with noise.** Each clinic's contribution is secret-shared or masked as in
   §19.13, with differentially private noise added before any total is opened,
   so that neither Earth nor the city's own analysts ever see a child's or a
   patient's numbers.
5. **Statistics are published only under differential privacy, from a public
   budget.** The statistics office has a yearly budget for each family of
   tables, $\varepsilon = 2$ per resident, set by the council in open session
   with the dissent recorded; every release and its cost is entered in a public
   ledger; repeated questions get the cached answer; noise is drawn as integers
   from the city's hardware random source (§19.7). Households count as groups
   (§19.14).
6. **Draws are public and unriggable.** Lotteries for housing and rations use
   commitments and a threshold randomness beacon
   ([Chapters 3](03-Commitments.md) and [4](04-Threshold-Cryptography.md)).
7. **Elections are secret and end-to-end verifiable.** Every voter can check
   their ballot was counted and anyone can check the count
   ([Chapter 16](16-Electronic-Voting.md)); the council's own votes are
   tallied on shares ([Chapter 1](01-Computing-With-Secrets.md)).
8. **Who talks to whom is nobody's business.** Mail to Earth goes through
   mixes, which the light delay makes cheap
   ([Chapter 15](15-Anonymous-Communication.md)), and no resident's payments
   go on a public ledger ([Chapter 18](18-Privacy-on-Ledgers.md)).

</div>

Rule 5 is the one this chapter adds, and it is the easiest to get wrong in a
town this small, so the office's tools enforce it. The ledger below charges
every release against the year's budget, rounds and clips for free, and refuses
the release that would overspend.

```python
import random

random.seed(2071)   # random is fine for a demo; the office draws noise from secrets

class Ledger:
    """The statistics office's budget: every release is written down and charged."""
    def __init__(self, cap):
        self.cap, self.spent, self.entries = cap, 0.0, []

    def release(self, name, true_count, eps):
        if self.spent + eps > self.cap + 1e-9:
            self.entries.append((name, eps, "REFUSED"))
            return None
        self.spent += eps
        noise = random.expovariate(eps) - random.expovariate(eps)   # Laplace, scale 1/eps
        answer = max(0, round(true_count + noise))                   # post-processing is free
        self.entries.append((name, eps, answer))
        return answer

year = Ledger(cap=2.0)                       # the charter's yearly cap per table family
for month in ("Jan", "Feb", "Mar"):
    year.release(f"{month} clinic visits, District 3", 412, 0.25)
year.release("asthma cases, all districts", 37, 0.5)
year.release("asthma cases, under-10s, District 5", 3, 0.5)
year.release("one more look at District 5", 3, 0.5)
for name, eps, answer in year.entries:
    print(f"{name:38} eps {eps:4.2f}  {answer}")
print(f"spent {year.spent:.2f} of {year.cap:.2f}")
```

```
Jan clinic visits, District 3          eps 0.25  405
Feb clinic visits, District 3          eps 0.25  412
Mar clinic visits, District 3          eps 0.25  416
asthma cases, all districts            eps 0.50  37
asthma cases, under-10s, District 5    eps 0.50  5
one more look at District 5            eps 0.50  REFUSED
spent 1.75 of 2.00
```

The demo uses the floating-point Laplace of §19.7 for brevity; the office's
real tool uses integer noise. The clinic-visit counts are useful as published.
The count of 3 asthmatic children in District 5 came out as 5, which is the
price of a small number in a small town, and the analyst's second look was
refused rather than averaged.

That is where this book ends. It began with Yao's two millionaires, who wanted
to know who was richer without saying how rich; it ends with a town that wants
to know itself without exposing anyone in it. In between, every tool was a way
to separate what must be known from what need not be: shares that mean
nothing alone, commitments that bind without showing, proofs that convince
without explaining, computations on data nobody sees, ballots counted but not
read, and, last, answers blurred just enough that no one person can be found in
them. None of it works by itself. Arcadia's charter works because it uses all
of them, each for the job it can actually do, and because it says plainly what
each one cannot do.

## 19.16 Going deeper

*Level: expert.*

**Better accounting.** **Rényi differential privacy** (Mironov, 2017) and
**zero-concentrated differential privacy** (zCDP; Mark Bun and Thomas Steinke,
2016) measure privacy loss as a whole distribution rather than its worst
point. The Gaussian mechanism with sensitivity $\Delta$ and noise $\sigma$ is
$\rho$-zCDP with $\rho = \Delta^2 / (2\sigma^2)$, zCDP composes by adding
$\rho$s, and $\rho$-zCDP implies $(\rho + 2\sqrt{\rho \ln(1/\delta)}, \delta)$-DP.
The census accounted in $\rho$; DP-SGD libraries account in Rényi divergences.
The **hypothesis-testing view**, $f$-DP and Gaussian DP (Jinshuo Dong, Aaron
Roth and Weijie Su, 2019), describes privacy by the whole trade-off between an
attacker's two kinds of error and composes exactly in the Gaussian case.

**Beyond adding noise.** The **exponential mechanism** (Frank McSherry and
Kunal Talwar, 2007) chooses among non-numeric outcomes, such as the best
location for a clinic, with probability proportional to
$e^{\varepsilon\, \mathrm{score}/(2\Delta)}$. The **sparse vector technique**
answers a long stream of threshold queries ("is this count above 1,000?") and
pays only for the ones above the threshold. **Synthetic data** methods release
a fake data set whose statistics match the private one, OnTheMap's approach.

**Amplification.** Running a mechanism on a random sample of a fraction $q$ of
the people multiplies its $\varepsilon$ by about $q$ for small $\varepsilon$,
which is how DP-SGD's per-batch noise becomes affordable. **Shuffling**
anonymous local reports before analysis (Prochlo, 2017; Úlfar Erlingsson and
colleagues, 2019) amplifies local $\varepsilon$s into much smaller central ones,
a middle ground between Figure 19.4's two models, and is one reason secure
aggregation, mixes ([Chapter 15](15-Anonymous-Communication.md)) and
differential privacy keep appearing together.

**Lower bounds.** Dinur-Nissim style reconstruction has been extended to
attacks with fewer queries, to linear queries with noise of size about
$\sqrt{n}$, and to machine-learning models. The matching upper side is the
Gaussian mechanism under advanced composition, which answers $k$ counting
queries with error about $\sqrt{k}/\varepsilon$ each: for $k$ near $n$ that
is $\sqrt{n}$, exactly where reconstruction stops working. Differential privacy
does not beat the fundamental law; it sits right on its edge.

## Check yourself

??? question "1. The AOL logs had no names. Why did they still identify people?"

    A person's searches together form a pattern: their town, their
    neighbors' names, their illnesses, their own name. The identifier was the
    whole record, so there was no column to delete.

??? question "2. A clinic table is 5-anonymous. Give two ways it can still reveal someone's diagnosis."

    Homogeneity: all five records in a class share one diagnosis, so knowing
    the class is enough. Background knowledge: the attacker can rule out the
    other diagnoses in the class from what they already know. A third is
    composition with another k-anonymous release of the same person.

??? question "3. A randomized-response survey (two fair coins) of 2,000 people gets 700 yes answers. Estimate the true rate and its standard error."

    $\lambda = 0.35$, so $\hat p = 2(0.35) - 0.5 = 0.20$. The standard error
    is $2\sqrt{0.35 \times 0.65 / 2000} \approx 0.021$: about 20%, give or take
    2 points.

??? question "4. A count is released with the Laplace mechanism at ε = 0.25. What is the noise scale, and the average size of the error?"

    The sensitivity is 1, so the scale is $b = 1/0.25 = 4$; the mean absolute
    error is $b = 4$ and the standard deviation $4\sqrt{2} \approx 5.7$.

??? question "5. Dinur and Nissim's first theorem: n = 1,000 people, every answer within E = 10. How many bits can the attacker get wrong at most?"

    At most $4E = 40$, so at least 960 of the 1,000 secret bits are
    recovered, whatever the publisher does with its error.

??? question "6. Why does rounding, clipping at zero and making a census table add up cost no privacy budget?"

    Post-processing: each is a function of the noisy output alone. Any event
    about the processed result is an event about the noisy output, which the
    definition already bounds. It can cost accuracy, as TopDown's small-area
    artifacts showed.

??? question "7. A system answers each query at ε = 0.5 and lets users repeat it. What goes wrong, and name two defenses."

    Averaging $k$ answers shrinks the noise like $1/\sqrt{k}$, so the exact
    value appears after enough repeats while the real loss is $0.5k$.
    Defenses: track and cap a total budget per person, and return the cached
    first answer to a repeated question (memoize, as RAPPOR does on devices).

??? question "8. A household of five appears in a release made at ε = 0.5 per person. What guarantee does the household have as a group?"

    $5 \times 0.5 = 2.5$, so its presence can change outcome probabilities by
    up to $e^{2.5} \approx 12$, far weaker than the $e^{0.5} \approx 1.65$ each
    member has alone.

??? question "9. For a vector of 100 counts that one person can each change by 1, why is Gaussian noise better than Laplace, and what does it cost?"

    Laplace scales with the $L_1$ sensitivity, 100; the Gaussian with the $L_2$
    sensitivity, $\sqrt{100} = 10$, so its noise per count is several times
    smaller at the same $\varepsilon$. The cost is $\delta$: a small chance
    that the $e^{\varepsilon}$ bound fails, which must be well below $1/n$.

??? question "10. Secure aggregation hides each phone's update from the server. Why is it not enough on its own, and why does the real protocol need a second mask?"

    The server still sees the exact sum, and a sum over few phones, or a
    model trained on it, can reveal individuals; noise is needed too. Without
    the self-mask, a server could claim an honest but slow phone had dropped
    out, collect its pairwise masks from the others, and then unmask its
    update when it arrived.

## What you learned

- Removing names does not anonymize records: quasi-identifiers (Sweeney,
  1997), behavior (AOL, 2006) and sparse preferences (Netflix, 2008) identify
  people when joined with outside data. k-anonymity fails to homogeneity,
  background knowledge, high dimensions and composition.
- Exact or nearly exact answers to many statistics rebuild the data (Dinur and
  Nissim, 2003); the Census Bureau did it to its own 2010 tables.
- Differential privacy requires every output to be about as likely with or
  without any one person; $e^{\varepsilon}$ bounds how much anyone's odds about
  you can move. Randomized response, the Laplace mechanism (noise scaled to
  sensitivity over $\varepsilon$) and the Gaussian mechanism (with $\delta$)
  achieve it.
- Privacy losses add up under composition, so $\varepsilon$ is a budget that
  repeated questions spend; post-processing is free; code must use exact,
  integer noise.
- The local model removes the trusted curator at a cost of about $\sqrt{n}$ in
  error (RAPPOR, Apple, Microsoft). The 2020 census spent
  $\varepsilon = 19.61$ across its redistricting tables, and the small-area
  accuracy debate and a lawsuit followed.
- Federated learning is not private alone: it needs secure aggregation to hide
  updates and DP-SGD to protect what the sum reveals.
- Differential privacy does not protect groups, correlated data or what a
  population's statistics say, and choosing $\varepsilon$ is a public decision.

**Next:** this is the last chapter. The [Glossary](Glossary.md) collects the
book's terms, and the [front page](index.md) has its map.

## Further reading

- Stanley L. Warner, "Randomized Response: A Survey Technique for Eliminating
  Evasive Answer Bias", *Journal of the American Statistical Association* 60
  (1965).
- Latanya Sweeney, "Simple Demographics Often Identify People Uniquely",
  Carnegie Mellon University, Data Privacy Working Paper 3 (2000), and
  "k-Anonymity: A Model for Protecting Privacy", *International Journal of
  Uncertainty, Fuzziness and Knowledge-Based Systems* 10 (2002).
- Philippe Golle, "Revisiting the Uniqueness of Simple Demographics in the US
  Population" (WPES 2006).
- Michael Barbaro and Tom Zeller Jr., "A Face Is Exposed for AOL Searcher No.
  4417749", *The New York Times* (9 August 2006).
- Arvind Narayanan and Vitaly Shmatikov, "Robust De-anonymization of Large
  Sparse Datasets" (IEEE Symposium on Security and Privacy, 2008).
- Ashwin Machanavajjhala, Johannes Gehrke, Daniel Kifer and Muthuramakrishnan
  Venkitasubramaniam, "l-Diversity: Privacy Beyond k-Anonymity" (ICDE 2006;
  *ACM TKDD* 2007); Ninghui Li, Tiancheng Li and Suresh Venkatasubramanian,
  "t-Closeness" (ICDE 2007); Srivatsava Ganta, Shiva Kasiviswanathan and Adam
  Smith, "Composition Attacks and Auxiliary Information in Data Privacy" (KDD
  2008).
- Paul Ohm, "Broken Promises of Privacy", *UCLA Law Review* 57 (2010).
- Irit Dinur and Kobbi Nissim, "Revealing Information while Preserving
  Privacy" (PODS 2003).
- Cynthia Dwork, Frank McSherry, Kobbi Nissim and Adam Smith, "Calibrating
  Noise to Sensitivity in Private Data Analysis" (TCC 2006); Cynthia Dwork,
  "Differential Privacy" (ICALP 2006).
- Cynthia Dwork and Aaron Roth, *The Algorithmic Foundations of Differential
  Privacy* (Now Publishers, 2014): the standard text, free online.
- Cynthia Dwork, Guy Rothblum and Salil Vadhan, "Boosting and Differential
  Privacy" (FOCS 2010): advanced composition.
- Ilya Mironov, "On Significance of the Least Significant Bits for
  Differential Privacy" (CCS 2012), and "Rényi Differential Privacy" (CSF
  2017); Mark Bun and Thomas Steinke, "Concentrated Differential Privacy"
  (TCC 2016); Clément Canonne, Gautam Kamath and Thomas Steinke, "The
  Discrete Gaussian for Differential Privacy" (NeurIPS 2020).
- Frank McSherry and Kunal Talwar, "Mechanism Design via Differential Privacy"
  (FOCS 2007); Jinshuo Dong, Aaron Roth and Weijie Su, "Gaussian Differential
  Privacy" (2019; *JRSS B* 2022).
- Úlfar Erlingsson, Vasyl Pihur and Aleksandra Korolova, "RAPPOR" (CCS 2014).
- Apple, "Differential Privacy Overview" (technical overview, 2017 and later
  versions); Jun Tang, Aleksandra Korolova, Xiaolong Bai, Xueqiang Wang and
  XiaoFeng Wang, "Privacy Loss in Apple's Implementation of Differential
  Privacy on MacOS 10.12" (2017).
- Bolin Ding, Janardhan Kulkarni and Sergey Yekhanin, "Collecting Telemetry
  Data Privately" (NeurIPS 2017).
- Ashwin Machanavajjhala, Daniel Kifer, John Abowd, Johannes Gehrke and Lars
  Vilhuber, "Privacy: Theory meets Practice on the Map" (ICDE 2008).
- John Abowd et al., "The 2020 Census Disclosure Avoidance System TopDown
  Algorithm", *Harvard Data Science Review* (2022); US Census Bureau, "Census
  Bureau Sets Key Parameters to Protect Privacy in 2020 Census Results" (press
  release, 9 June 2021).
- Christopher Kenny et al., "The Use of Differential Privacy for Census Data
  and Its Impact on Redistricting", *Science Advances* 7 (2021); Steven
  Ruggles and David Van Riper, "The Role of Chance in the Census Bureau
  Database Reconstruction Experiment", *Population Research and Policy Review*
  (2022); National Academies of Sciences, Engineering, and Medicine,
  *Assessing the 2020 Census: Final Report* (2023).
- Daniel Kifer and Ashwin Machanavajjhala, "No Free Lunch in Data Privacy"
  (SIGMOD 2011).
- Brendan McMahan et al., "Communication-Efficient Learning of Deep Networks
  from Decentralized Data" (AISTATS 2017); Keith Bonawitz et al., "Practical
  Secure Aggregation for Privacy-Preserving Machine Learning" (CCS 2017).
- Martín Abadi et al., "Deep Learning with Differential Privacy" (CCS 2016).
- Ligeng Zhu, Zhijian Liu and Song Han, "Deep Leakage from Gradients"
  (NeurIPS 2019); Reza Shokri et al., "Membership Inference Attacks against
  Machine Learning Models" (IEEE S&P 2017); Nicholas Carlini et al.,
  "Extracting Training Data from Large Language Models" (USENIX Security 2021).
- Temilola Adeleye et al. (Wikimedia Foundation and Tumult Labs),
  "Publishing Wikipedia Usage Data with Strong Privacy Guarantees" (2023).
- Earlier in this book: [Chapter 1](01-Computing-With-Secrets.md), §1.7
  (output privacy); [Chapter 10](10-Multi-Party-Computation-in-Practice.md)
  (Prio and private measurement); [Chapter 3](03-Commitments.md) (the taxi
  data).
