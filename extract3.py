import json
import re

with open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8') as f:
    content = f.read()

# Extract items
items = re.findall(r'(\{\s*id:\s*\'[^\']+\',\s*folder:\s*\'[^\']+\'.*?\})', content, re.DOTALL)

out = []
for item in items:
    if '並べ替え' in item:
        out.append(item)

with open(r'Z:\開発課題\アプリ開発\最新\sorting_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
