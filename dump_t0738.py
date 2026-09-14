import json
import re

with open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'\{[^\}]*?id:\s*\'T_0738_4a\'[^\}]*?\}', content)
if match:
    with open(r'Z:\開発課題\アプリ開発\最新\t0738.json', 'w', encoding='utf-8') as f2:
        f2.write(match.group(0))
else:
    with open(r'Z:\開発課題\アプリ開発\最新\t0738.json', 'w', encoding='utf-8') as f2:
        f2.write('NOT FOUND')
