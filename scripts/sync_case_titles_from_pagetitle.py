#!/usr/bin/env python3
"""Sync case page h1 and brand badge text from pageTitle (catalog uses CSV, unchanged)."""
from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "src" / "projects"
SKIP = {"inappstory.html"}


def page_title(text: str) -> str:
    m = re.search(r"{% set pageTitle = '([^']*)' %}", text)
    return m.group(1) if m else ""


def cap_first(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return s
    return s[0].upper() + s[1:]


def brand_and_h1(full_title: str) -> tuple[str, str]:
    t = full_title.strip()
    if ": " in t:
        brand, rest = t.split(": ", 1)
        return brand.strip(), cap_first(rest.strip())
    return t, cap_first(t)


def fragment_to_str(soup: BeautifulSoup) -> str:
    if soup.body:
        return "".join(str(c) for c in soup.body.contents)
    return str(soup)


def patch_content(html: str, brand: str, h1_text: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    tw = soup.select_one(".ids__text-width")
    if not tw:
        return html
    h1 = tw.find("h1")
    if h1:
        h1.clear()
        h1.append(h1_text)
    for div in tw.find_all("div", class_=lambda c: c and "case-standard__badges--outlined" in c):
        spans = div.find_all("span", class_=lambda c: c and "case-standard__badge" in c)
        if spans:
            spans[0].string = brand
    return fragment_to_str(soup)


def process_file(path: Path) -> None:
    if path.name in SKIP:
        return
    raw = path.read_text(encoding="utf-8")
    m = re.search(
        r"({% block content %}\n)(.*?)(\n{% endblock %})",
        raw,
        re.DOTALL,
    )
    if not m:
        return
    pt = page_title(raw)
    if not pt:
        return
    brand, h1_txt = brand_and_h1(pt)
    new_inner = patch_content(m.group(2), brand, h1_txt)
    out = raw[: m.start()] + m.group(1) + new_inner + m.group(3) + raw[m.end() :]
    path.write_text(out, encoding="utf-8")


def main() -> None:
    for p in sorted(PROJECTS.glob("*.html")):
        process_file(p)
    print("Patched case titles from pageTitle")


if __name__ == "__main__":
    main()
