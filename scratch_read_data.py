import re
import json

data = open('Z:/開発課題/アプリ開発/最新/data.js', encoding='utf-8').read()
folders = set(re.findall(r"folder:\s*'([^']+)'", data))
print("Folders:", folders)

# Also check for "When the shift lever"
matches = [line for line in data.split('\n') if 'shift lever' in line]
print("Shift lever:", matches)

# Check for anything containing "教科書"
matches2 = [line for line in data.split('\n') if '教科書' in line]
print("教科書:", matches2[:5])
