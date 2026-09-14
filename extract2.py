import json
import re

with open(r'Z:\開発課題\アプリ開発\最新\data.js', encoding='utf-8') as f:
    content = f.read()

# remove window.DATA_VERSION = ...
# and window.initialData = 
# leaving just the array
match = re.search(r'window\.initialData\s*=\s*(\[.*\]);', content, re.DOTALL)
if match:
    array_str = match.group(1)
    
    # Python json cannot parse JS objects if keys are unquoted or single quotes are used.
    # So I will just use regex to find items
    items = re.findall(r'\{[^}]+folder:\s*\'教科書_並べ替え[^\}]+\}', content)
    
    with open(r'Z:\開発課題\アプリ開発\最新\sorting_extracted2.txt', 'w', encoding='utf-8') as f2:
        f2.write('\n\n'.join(items))
    print(f"Found {len(items)} items")
else:
    print("Could not find window.initialData")
