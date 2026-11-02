#!/bin/sh
# Checks hooks/standards.json: every NIST page and draft name still answers, and lists the NIST and draft names on
# the site that have no link yet (add them to standards.json once their official page exists). Run from the repo root.
set -e
python3 - <<'PY'
import json, re, glob, subprocess
d = json.load(open("hooks/standards.json"))
def code(u):
    return subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25", u],
                          capture_output=True, text=True).stdout
bad = [(k, u) for k, u in d["nist"].items() if code(u) != "200"]
bad += [(n, "") for n in d["drafts"] if code("https://datatracker.ietf.org/doc/%s/" % n) not in ("200", "302")]
txt = "".join(open(f, encoding="utf-8").read() for f in glob.glob("docs/**/*.md", recursive=True))
import sys; sys.path.insert(0, "hooks"); import standard_links as s
missing = set()
for m in s.PATTERN.finditer(txt):
    if (m.group("nist") or m.group("draft")) and s._link(m) == m.group(0):
        missing.add(m.group(0))
print("broken:", bad or "none")
print("named but not linked:", sorted(missing) or "none")
PY
