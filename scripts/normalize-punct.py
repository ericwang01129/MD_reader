#!/usr/bin/env python3
"""
一次性標點正規化：將 decamahoro/ 下 .md 內文（不含 code block / HTML tag /
markdown 連結 URL / 裸 URL）中的半形 , ( ) 換成全形 ， （ ）。
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'decamahoro'

SKIP = re.compile(
    r'`[^`\n]*`'               # 行內 code
    r'|<[^>\n]*>'              # HTML 標籤
    r'|\]\([^)\n]*\)'          # markdown 連結的 (url) 部分
    r'|https?://\S+'           # 裸 URL
)

REPLACE = str.maketrans({',': '，', '(': '（', ')': '）'})


def transform_line(line: str) -> str:
    out, last = [], 0
    for m in SKIP.finditer(line):
        out.append(line[last:m.start()].translate(REPLACE))
        out.append(m.group(0))
        last = m.end()
    out.append(line[last:].translate(REPLACE))
    return ''.join(out)


def transform(content: str) -> str:
    lines = content.split('\n')
    out, in_fence = [], False
    for line in lines:
        if line.lstrip().startswith('```'):
            in_fence = not in_fence
            out.append(line)
            continue
        out.append(line if in_fence else transform_line(line))
    return '\n'.join(out)


def main() -> int:
    changed = 0
    for md in ROOT.rglob('*.md'):
        original = md.read_text(encoding='utf-8')
        updated = transform(original)
        if updated != original:
            md.write_text(updated, encoding='utf-8')
            print(f'updated {md.relative_to(ROOT.parent)}')
            changed += 1
    print(f'done · {changed} file(s) modified')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
