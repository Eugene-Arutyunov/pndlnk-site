#!/usr/bin/env python3
"""
Bulk-update case HTML: ul→p, loud.mono→badges, case-standard headers, back-link spacing.
"""
from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "src" / "projects"
SKIP_UL_AND_BADGES = {"inappstory.html"}
YEAR_ONLY = re.compile(r"^\d{4}\s*$")
YEAR_RANGE = re.compile(r"^\d{4}\s*[–-]\s*\d{4}\s*$")


def page_title_from_file(text: str) -> str:
    m = re.search(r"{% set pageTitle = '([^']*)' %}", text)
    return m.group(1) if m else ""


def split_brand_rest(title: str) -> tuple[str | None, str]:
    if ": " in title:
        a, b = title.split(": ", 1)
        return a.strip(), b.strip()
    return None, title.strip()


def cap_first(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return s
    return s[0].upper() + s[1:]


def case_h1_and_brand_chip(page_title: str) -> tuple[str, str]:
    """h1 text (no brand prefix) and first badge text copied from pageTitle."""
    t = page_title.strip()
    if ": " in t:
        b, r = t.split(": ", 1)
        return cap_first(r.strip()), b.strip()
    return cap_first(t), t


def is_year_chip(s: str) -> bool:
    s = s.strip()
    return bool(YEAR_ONLY.match(s) or YEAR_RANGE.match(s))


def ensure_space_before_back(text: str) -> str:
    target = '<p><a href="/projects/">← обратно ко всем проектам</a></p>'
    out: list[str] = []
    idx = 0
    while True:
        i = text.find(target, idx)
        if i == -1:
            out.append(text[idx:])
            break
        out.append(text[idx:i])
        window = text[max(0, i - 160) : i]
        if 'class="ids__space L"' in window and "</div>" in window:
            out.append(target)
        else:
            out.append('<div class="ids__space L"></div>\n    ' + target)
        idx = i + len(target)
    return "".join(out)


def fragment_to_str(soup: BeautifulSoup) -> str:
    if soup.body:
        return "".join(str(c) for c in soup.body.contents)
    return str(soup)


def convert_uls(soup: BeautifulSoup) -> None:
    for ul in list(soup.find_all("ul")):
        lis = [ch for ch in ul.contents if getattr(ch, "name", None) == "li"]
        if not lis:
            ul.decompose()
            continue
        last = None
        for li in lis:
            inner = "".join(str(c) for c in li.contents).strip()
            p = soup.new_tag("p")
            inner_soup = BeautifulSoup(inner, "html.parser")
            for node in list(inner_soup.contents):
                p.append(node)
            if last is None:
                ul.insert_before(p)
                last = p
            else:
                last.insert_after(p)
                last = p
        ul.decompose()


def ensure_std_title(h1) -> None:
    c = h1.get("class") or []
    if "case-standard__title" not in c:
        h1["class"] = c + ["case-standard__title"]


def strip_existing_outlined_badges(tw) -> None:
    for div in tw.find_all("div", class_=lambda x: x and "case-standard__badges--outlined" in x):
        div.decompose()


def strip_badges_immediately_after(h1) -> None:
    if not h1:
        return
    nxt = h1.next_sibling
    while nxt:
        if isinstance(nxt, NavigableString) and not str(nxt).strip():
            nxt = nxt.next_sibling
            continue
        if getattr(nxt, "name", None) == "div":
            cl = nxt.get("class") or []
            if "case-standard__badges--outlined" in cl:
                rm = nxt
                nxt = nxt.next_sibling
                rm.decompose()
                continue
        break


def add_outlined_badges_after(soup: BeautifulSoup, h1, a: str, b: str) -> None:
    strip_badges_immediately_after(h1)
    div = soup.new_tag("div")
    div["class"] = ["case-standard__badges", "case-standard__badges--outlined"]
    for t in (a, b):
        sp = soup.new_tag("span")
        sp["class"] = ["case-standard__badge"]
        sp.string = t
        div.append(sp)
    h1.insert_after(div)


def absorb_loud_monos(tw, soup: BeautifulSoup, page_title: str) -> None:
    h1 = tw.find("h1")
    if not h1:
        return
    brand, rest = split_brand_rest(page_title)
    texts: list[str] = []
    nxt = h1.next_sibling
    while nxt:
        if isinstance(nxt, NavigableString) and not str(nxt).strip():
            nxt = nxt.next_sibling
            continue
        if getattr(nxt, "name", None) != "p":
            break
        cl = nxt.get("class") or []
        if "loud" not in cl or "mono" not in cl:
            break
        texts.append(nxt.get_text(strip=True))
        rm = nxt
        nxt = nxt.next_sibling
        rm.extract()
    if not texts:
        return
    h1_text, chip = case_h1_and_brand_chip(page_title)
    h1.clear()
    h1.append(h1_text)
    ensure_std_title(h1)

    if len(texts) == 2:
        if not is_year_chip(texts[0]) and is_year_chip(texts[1]):
            b1, b2 = chip, texts[1]
        else:
            b1, b2 = chip, texts[1]
    elif len(texts) == 1:
        if is_year_chip(texts[0]):
            b1, b2 = chip, texts[0]
        else:
            b1, b2 = chip, texts[0]
    else:
        b1, b2 = chip, " · ".join(texts)
    add_outlined_badges_after(soup, h1, b1, b2)


def fix_meta_header_longform(tw, soup: BeautifulSoup, page_title: str) -> None:
    h1 = tw.find("h1")
    meta = tw.find("p", class_=lambda x: x and "case-standard__meta" in x)
    if not h1 or not meta:
        return
    mt = meta.get_text(strip=True)
    m = re.match(r"^(\d{4})\s*·\s*(.+)$", mt, re.DOTALL)
    if not m:
        return
    year, rest_meta = m.group(1), m.group(2).strip()
    h1_text, brand_chip = case_h1_and_brand_chip(page_title)
    label = tw.find("p", class_=lambda x: x and "case-standard__label" in x)
    if label and "кейс" in label.get_text(" ", strip=True).lower():
        label.decompose()
    ensure_std_title(h1)
    h1.clear()
    h1.append(h1_text)
    strip_existing_outlined_badges(tw)
    add_outlined_badges_after(soup, h1, brand_chip, year)
    meta.clear()
    meta.append(rest_meta)


def fix_telezhki(tw, soup: BeautifulSoup, page_title: str) -> None:
    h1 = tw.find("h1", class_=lambda x: x and "case-standard__title" in x)
    if not h1:
        return
    meta = h1.find_next_sibling("p", class_=lambda x: x and "case-standard__meta" in x)
    if not meta:
        return
    mt = meta.get_text(strip=True)
    m = re.match(r"^(\d{4})\s*·\s*(.+)$", mt, re.DOTALL)
    if not m:
        return
    year, rest = m.group(1), m.group(2).strip()
    if tw.find("div", class_=lambda x: x and "case-standard__badges--outlined" in x):
        return
    h1_text, brand_chip = case_h1_and_brand_chip(page_title)
    h1.clear()
    h1.append(h1_text)
    add_outlined_badges_after(soup, h1, brand_chip, year)
    meta.clear()
    meta.append(rest)


def fix_vkusvill_giper(tw, soup: BeautifulSoup, page_title: str) -> None:
    h1 = tw.find("h1", class_=lambda x: x and "case-standard__title" in x)
    if not h1:
        return
    h1_text, brand_chip = case_h1_and_brand_chip(page_title)
    h1.clear()
    h1.append(h1_text)
    strip_existing_outlined_badges(tw)
    add_outlined_badges_after(soup, h1, brand_chip, "2023")


def fix_mts_file(tw, soup: BeautifulSoup, page_title: str) -> None:
    h1 = tw.find("h1")
    if not h1:
        return
    ensure_std_title(h1)
    h1_text, brand_chip = case_h1_and_brand_chip(page_title)
    h1.clear()
    h1.append(h1_text)
    strip_existing_outlined_badges(tw)
    add_outlined_badges_after(soup, h1, brand_chip, "2022–2023")
    for p in list(tw.find_all("p", class_=lambda x: x and "loud" in x and "mono" in x)):
        p.decompose()


def mts_second_section_badge(tw, soup: BeautifulSoup, page_title: str) -> None:
    chip = case_h1_and_brand_chip(page_title)[1]
    for h2 in tw.find_all("h2"):
        if "Опыт кандидатов" not in h2.get_text():
            continue
        nxt = h2.next_sibling
        while nxt:
            if isinstance(nxt, NavigableString) and not str(nxt).strip():
                nxt = nxt.next_sibling
                continue
            break
        if getattr(nxt, "name", None) == "div":
            cl = nxt.get("class") or []
            if "case-standard__badges--outlined" in cl:
                return
        div = soup.new_tag("div")
        div["class"] = ["case-standard__badges", "case-standard__badges--outlined"]
        for t in (chip, "2023"):
            sp = soup.new_tag("span")
            sp["class"] = ["case-standard__badge"]
            sp.string = t
            div.append(sp)
        h2.insert_after(div)
        return


def add_missing_back_link(content: str, fname: str) -> str:
    if "обратно ко всем проектам" in content:
        return content
    if fname not in (
        "rembot-issledovanie-opyta-polzovatelya.html",
        "leroy-merlin-issledovanie-opyta-pokupateley-gruppy-otdelka-sten.html",
    ):
        return content
    old = """    </div>
  </div>
  <div class="ids__space L"></div>
</div>"""
    new = """    </div>

    <div class="ids__space L"></div>
    <p><a href="/projects/">← обратно ко всем проектам</a></p>
  </div>
  <div class="ids__space L"></div>
</div>"""
    if old not in content:
        return content
    return content.replace(old, new, 1)


def ensure_all_h1_std_title(tw) -> None:
    for h1 in tw.find_all("h1"):
        ensure_std_title(h1)


def process_file(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    raw = ensure_space_before_back(raw)
    text = raw
    if path.name in SKIP_UL_AND_BADGES:
        path.write_text(text, encoding="utf-8")
        return
    m = re.search(
        r"({% block content %}\n)(.*?)(\n{% endblock %})",
        text,
        re.DOTALL,
    )
    if not m:
        path.write_text(text, encoding="utf-8")
        return
    pre, content, post = m.group(1), m.group(2), m.group(3)
    page_title = page_title_from_file(text)
    content = add_missing_back_link(content, path.name)

    soup = BeautifulSoup(content, "html.parser")
    tw = soup.select_one(".ids__text-width")
    fname = path.name
    if tw:
        convert_uls(soup)
        if fname == "mts-issledovanie-opyta-produktovyh-komand.html":
            fix_mts_file(tw, soup, page_title)
            mts_second_section_badge(tw, soup, page_title)
        elif fname == "vkusvill-gipersegmentatsiya-i-dizayn-sistema.html":
            fix_vkusvill_giper(tw, soup, page_title)
        elif fname == "pyaterochka-razrabotka-idealnoy-telezhki.html":
            fix_telezhki(tw, soup, page_title)
        else:
            absorb_loud_monos(tw, soup, page_title)
            if fname in (
                "vkusvill-kontseptsiya-novoy-seti-magazinov-u-doma.html",
                "mavt-vinoteka-issledovanie-opyta-pokupateley.html",
                "sozdanie-partnerskoy-programmy-dlya-vendora-onlayn-kass.html",
            ):
                fix_meta_header_longform(tw, soup, page_title)
        ensure_all_h1_std_title(tw)
    new_inner = fragment_to_str(soup)
    out = text[: m.start()] + pre + new_inner + post + text[m.end() :]
    path.write_text(out, encoding="utf-8")


def main() -> None:
    for p in sorted(PROJECTS.glob("*.html")):
        process_file(p)
    print("Updated", len(list(PROJECTS.glob("*.html"))), "files")


if __name__ == "__main__":
    main()
