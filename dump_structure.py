import re
import json

content = open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8').read()
qs=re.findall(r'(\{\s*id:\s*\'[^\']+\',\s*folder:\s*\'教科書_文の構造\'.*?\})', content, re.DOTALL)

with open(r'Z:\開発課題\アプリ開発\最新\check_structure.json', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(qs[:2]))
