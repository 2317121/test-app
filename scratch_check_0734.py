import re

with open('Z:/開発課題/アプリ開発/最新/data.js', 'r', encoding='utf-8') as f:
    data = f.read()

# Let's see the T_0734 items
matches = re.findall(r"(\{\s*id:\s*'T_0734_[^']+',\s*folder:\s*'[^']+',\s*question:\s*'[^']+',\s*answer:\s*'[^']+'.*?\})", data, re.DOTALL)
print("Found T_0734 items:", len(matches))
for m in matches:
    print(m)

# Let's see the T_0735 items (Wait, T_0735 might be vocab questions as I saw earlier, they don't have "並び替え" in folder, wait, they were in folder: '教科書_単語 (Part 1)' probably?)
# Let's search by ID
matches_0735 = re.findall(r"(\{\s*id:\s*'T_0735_[^']+',\s*folder:\s*'[^']+',\s*question:\s*'[^']+',\s*answer:\s*'[^']+'.*?\})", data, re.DOTALL)
print("Found T_0735 items:", len(matches_0735))
for m in matches_0735[:2]:
    print(m)
