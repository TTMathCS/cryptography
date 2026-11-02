"""Turns every named standard on the site into a link to its official text (Jim, 2 Nov 2026: "for rfc and
ietf/other standards, please make those clickable to direct to official standard link ... for all pages").

Runs on each page's HTML at build time, so the Markdown stays plain and new pages get links on their own:
  RFC 8446, RFC 4253 §7.2, RFC 7748 section 5, RFCs 4251–4254  -> www.rfc-editor.org (to the section when named)
  FIPS 180-4, SP 800-38D, NIST IR 8547                         -> csrc.nist.gov (the page listed in standards.json)
  draft-ietf-hpke-pq-05                                        -> datatracker.ietf.org (names listed in standards.json)
  BIP-340, BIP 32, BIP0340                                     -> github.com/bitcoin/bips
  SEC 1, SEC 2 (secg.org, version 2.0) and WebAuthn Level 1-3 (w3.org)
Text already inside a link, code, a heading or a script is left as it is. A NIST or draft name that is not in
standards.json stays plain text, so a wrong guess never becomes a broken link; tools/check-standards.sh lists them.
"""
import json
import os
import re

_DATA = json.load(open(os.path.join(os.path.dirname(__file__), "standards.json"), encoding="utf-8"))
NIST = _DATA["nist"]
DRAFTS = set(_DATA["drafts"])

SKIP = {"a", "code", "pre", "kbd", "script", "style", "h1", "h2", "h3", "h4", "h5", "h6", "title", "svg"}
TAG = re.compile(r"(<!--.*?-->|<[^>]+>)", re.S)
TAG_NAME = re.compile(r"<\s*(/?)\s*([a-zA-Z0-9]+)")

PATTERN = re.compile(
    r"(?P<rfc>RFCs? ?(?P<rfcn>\d{3,5})(?P<rsec>(?: §| [Ss]ection )(?P<secn>\d+(?:\.\d+)*))?)"
    r"(?P<range>[–-](?P<rfc2>\d{3,5}))?"
    r"|(?P<nist>(?:SP ?800-\d+[A-Z]?(?:-\d)?|FIPS ?\d{2,3}(?:-\d)?)(?: Rev\. ?\d)?|NIST ?IR ?\d+)"
    r"|(?P<draft>draft-[a-z0-9]+(?:-[a-z0-9]+)*)"
    r"|(?P<bip>BIP[- ]?0*(?P<bipn>\d{1,4}))(?![\d-])"
    r"|(?P<sec>SEC (?P<secv>[12]))(?![\d.])"
    r"|(?P<webauthn>WebAuthn Level (?P<wal>[123]))"
)


def _a(url, text):
    return '<a class="std-link" href="%s">%s</a>' % (url, text)


def _rfc(n, sec=None):
    return "https://www.rfc-editor.org/rfc/rfc%s.html%s" % (int(n), "#section-" + sec if sec else "")


def _nist_key(text):
    t = re.sub(r"^SP ?800-", "SP 800-", text)
    t = re.sub(r"^FIPS ?", "FIPS ", t)
    t = re.sub(r"^NIST ?IR ?", "NIST IR ", t)
    return re.sub(r" Rev\. ?", " Rev. ", t)


def _link(m):
    text = m.group(0)
    if m.group("rfc"):
        out = _a(_rfc(m.group("rfcn"), m.group("secn")), m.group("rfc"))
        if m.group("range"):
            out += text[len(m.group("rfc")):-len(m.group("rfc2"))] + _a(_rfc(m.group("rfc2")), m.group("rfc2"))
        return out
    if m.group("nist"):
        key = _nist_key(text)
        url = NIST.get(key) or NIST.get(re.sub(r" Rev\. \d$", "", key))
        return _a(url, text) if url else text
    if m.group("draft"):
        base = re.sub(r"-\d{2}$", "", text)
        return _a("https://datatracker.ietf.org/doc/%s/" % text, text) if base in DRAFTS else text
    if m.group("sec"):
        return _a("https://www.secg.org/sec%s-v2.pdf" % m.group("secv"), text)
    if m.group("webauthn"):
        return _a("https://www.w3.org/TR/webauthn-%s/" % m.group("wal"), text)
    n = int(m.group("bipn"))
    return _a("https://github.com/bitcoin/bips/blob/master/bip-%04d.mediawiki" % n, text)


def link_standards(html):
    out, skip = [], []
    for part in TAG.split(html):
        if not part:
            continue
        if part.startswith("<"):
            t = TAG_NAME.match(part)
            if t and not part.startswith("<!--"):
                closing, name = t.group(1) == "/", t.group(2).lower()
                if name in SKIP and not part.rstrip().endswith("/>"):
                    if closing:
                        if name in skip:
                            del skip[len(skip) - 1 - skip[::-1].index(name)]
                    else:
                        skip.append(name)
            out.append(part)
        elif skip:
            out.append(part)
        else:
            out.append(PATTERN.sub(_link, part))
    return "".join(out)


def on_page_content(html, page, config, files):
    return link_standards(html)
