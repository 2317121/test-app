import json
import re

with open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8') as f:
    content = f.read()

items = re.findall(r'(\{\s*id:\s*\'[^\']+\',\s*folder:\s*\'教科書_並び替え[^\']*\'.*?\})', content, re.DOTALL)

with open(r'Z:\開発課題\アプリ開発\最新\dump_narabikae.json', 'w', encoding='utf-8') as f2:
    f2.write('\n'.join(items[:5]))
