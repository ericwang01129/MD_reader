#!/usr/bin/env python3
"""
為每個 .md 檔產生對應的 .html stub，內含 OG / Twitter 預覽 meta，
真實使用者點入時自動 redirect 回 SPA 的 hash 路由。

執行於 GitHub Actions；亦可在本機手動跑：
    python scripts/build-og-stubs.py
"""
from __future__ import annotations
import html
import json
import os
import re
import urllib.parse
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_DIRS = {'.git', '.github', 'node_modules', 'assets', 'scripts'}
EXCLUDE_FILES = {'README.md', 'readme.md'}

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} · MD Reader</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title} · MD Reader">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url={redirect_attr}">
<link rel="canonical" href="{canonical_attr}">
<style>body{{font-family:sans-serif;background:#fafafa;color:#333;text-align:center;padding:4rem 1rem}}a{{color:#0066cc}}</style>
<script>(function(){{var h=location.hash?location.hash.slice(1):'';location.replace({redirect_js}+(h?'|'+h:''));}})();</script>
</head>
<body>
<h1>{title}</h1>
<p>{desc}</p>
<p>正在前往 <a href="{redirect_attr}">MD Reader</a> ……</p>
</body>
</html>
"""


def extract_title_and_preview(md: str) -> tuple[str, str]:
    lines = md.splitlines()
    title = ''
    in_fm = False
    in_fence = False
    parts: list[str] = []

    for i, raw in enumerate(lines):
        line = raw.strip()
        if i == 0 and line == '---':
            in_fm = True
            continue
        if in_fm:
            if line == '---':
                in_fm = False
            continue
        if line.startswith('```'):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if not title:
            m = re.match(r'^#\s+(.+?)\s*#*\s*$', line)
            if m:
                title = m.group(1).strip()
                continue
        if not line or re.match(r'^#{1,6}\s', line) or re.match(r'^[->|*_=]{3,}$', line):
            continue
        cleaned = re.sub(r'^>\s*', '', line)
        cleaned = re.sub(r'^[-*+]\s+', '', cleaned)
        cleaned = re.sub(r'^\d+\.\s+', '', cleaned)
        cleaned = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', cleaned)
        cleaned = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', cleaned)
        cleaned = re.sub(r'<[^>]+>', '', cleaned)
        cleaned = re.sub(r'[*_`~]+', '', cleaned).strip()
        if cleaned:
            parts.append(cleaned)
        if sum(len(p) for p in parts) >= 200:
            break

    desc = ' '.join(parts)
    desc = re.sub(r'\s+', ' ', desc).strip()
    if len(desc) > 160:
        desc = desc[:157] + '…'
    return title, desc


def iter_md_files():
    for dirpath, dirnames, filenames in os.walk(REPO_ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith('.')]
        for fn in filenames:
            if fn.lower().endswith('.md') and fn not in EXCLUDE_FILES:
                yield Path(dirpath) / fn


def main() -> int:
    written = 0
    for md_path in iter_md_files():
        rel = md_path.relative_to(REPO_ROOT).as_posix()
        try:
            md = md_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            print(f'skip non-utf8: {rel}')
            continue
        title, desc = extract_title_and_preview(md)
        if not title:
            title = md_path.stem
        if not desc:
            desc = title

        depth = rel.count('/')
        prefix = '../' * depth
        encoded_md = urllib.parse.quote(rel, safe='/')
        redirect = f'{prefix}index.html#{encoded_md}'
        canonical = rel[:-3] + '.html'

        title_esc = html.escape(title, quote=True)
        desc_esc = html.escape(desc, quote=True)

        out = TEMPLATE.format(
            title=title_esc,
            desc=desc_esc,
            redirect_attr=html.escape(redirect, quote=True),
            canonical_attr=html.escape(canonical, quote=True),
            redirect_js=json.dumps(redirect),
        )
        out_path = md_path.with_suffix('.html')
        if out_path.exists() and out_path.read_text(encoding='utf-8') == out:
            continue
        out_path.write_text(out, encoding='utf-8')
        print(f'wrote {out_path.relative_to(REPO_ROOT)}')
        written += 1
    print(f'done · {written} stubs updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
