import json

with open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8') as f:
    content = f.read()

# Extract items
# Since it's a JS object array, we can parse it roughly or just use regex more carefully
import re
items = re.findall(r'(\{\s*id:\s*\'[^\']+\',\s*folder:\s*\'[^\']+\'.*?\})', content, re.DOTALL)

out = []
for item in items:
    if '並べ替え' in item:
        out.append(item)

with open(r'Z:\開発課題\アプリ開発\最新\sorting_extracted.txt', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(out[:10]))
