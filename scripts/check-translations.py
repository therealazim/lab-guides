#!/usr/bin/env python3
"""Validate that every supported language has every UI translation key."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "src" / "i18n.tsx"
LANGS = ("en", "uz", "kk", "ru", "ko")

source = I18N.read_text(encoding="utf-8")
DICTIONARY_SOURCE = source.split("\n}\n\ninterface I18nContextType", 1)[0]

# UI_STRINGS is a flat object per language. Capture each language block and all
# property names inside it, including multiple comma-separated properties on one line.
blocks: dict[str, str] = {}
for match in re.finditer(r"^  (en|uz|kk|ru|ko):\s*\{", DICTIONARY_SOURCE, re.MULTILINE):
    lang = match.group(1)
    next_match = re.search(r"^  (?:en|uz|kk|ru|ko):\s*\{", DICTIONARY_SOURCE[match.end():], re.MULTILINE)
    end = match.end() + (next_match.start() if next_match else len(DICTIONARY_SOURCE[match.end():]))
    blocks[lang] = DICTIONARY_SOURCE[match.end():end]

def strip_string_literals(value: str) -> str:
    output: list[str] = []
    quote: str | None = None
    escaped = False
    for char in value:
        if quote is not None:
            output.append(' ')
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
        elif char in {'"', "'"}:
            quote = char
            output.append(' ')
        else:
            output.append(char)
    return ''.join(output)

# Keep the parser independent of punctuation inside translated values.
# Original regex-based implementation removed.(r"(['\"])(?:\\\\.|(?!\\1).)*\\1", "", value, flags=re.DOTALL)

keys_by_lang: dict[str, set[str]] = {}
for lang in LANGS:
    block = blocks.get(lang, "")
    keys_by_lang[lang] = set(re.findall(r"\b([A-Za-z][A-Za-z0-9_]*)\s*:", strip_string_literals(block)))

all_keys = set().union(*keys_by_lang.values())
source_files = [p for p in (ROOT / "src").rglob("*.ts*") if p.name != "i18n.tsx"]
used_source = "\n".join(p.read_text(encoding="utf-8") for p in source_files)
used_keys = set(re.findall(r"\bt\(\s*['\"]([^'\"]+)['\"]", used_source))
missing_by_lang = {lang: sorted(all_keys - keys_by_lang[lang]) for lang in LANGS}
used_without_dictionary = sorted(used_keys - all_keys)
empty_values: list[str] = []

for lang in LANGS:
    block = blocks.get(lang, "")
    for key in all_keys:
        value_match = re.search(rf"\b{re.escape(key)}\s*:\s*(['\"])(.*?)\1", block, re.DOTALL)
        if value_match and not value_match.group(2).strip():
            empty_values.append(f"{lang}.{key}")

print("Translation completeness report")
print(f"Languages: {', '.join(LANGS)}")
print(f"Dictionary keys: {len(all_keys)}")
print(f"Used translation keys: {len(used_keys)}")
for lang in LANGS:
    print(f"{lang}: {len(keys_by_lang[lang])} keys; missing {len(missing_by_lang[lang])}")
    if missing_by_lang[lang]:
        print("  " + ", ".join(missing_by_lang[lang]))
if used_without_dictionary:
    print("Used without dictionary: " + ", ".join(used_without_dictionary))
if empty_values:
    print("Empty values: " + ", ".join(empty_values))

if any(missing_by_lang.values()) or used_without_dictionary or empty_values:
    sys.exit(1)
print("PASS: all translation keys are present and non-empty in all five languages.")
