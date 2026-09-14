import re
import json

file_path = 'Z:/開発課題/アプリ開発/最新/data.js'
with open(file_path, 'r', encoding='utf-8') as f:
    data = f.read()

# Define the new data for T_0734_1 to T_0734_6
replacements = {
    'T_0734_1': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nWhen the shift lever is in reverse, the machine moves backward.',
        'answer': '主語: the shift lever, the machine\\n動詞: is, moves\\n\\n和訳: シフトレバーが逆になっている場合、機械は後方に動く。'
    },
    'T_0734_2': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nCopper is a reddish metal and an excellent conductor.',
        'answer': '主語: Copper\\n動詞: is\\n\\n和訳: 銅は赤みがかった金属であり、優れた導体である。'
    },
    'T_0734_3': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nRubber will lose elasticity after being exposed to ultraviolet rays for a long time.',
        'answer': '主語: Rubber\\n動詞: will lose\\n\\n和訳: ゴムは紫外線に長時間さらされると弾性を失う。'
    },
    'T_0734_4': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nAll animals and plants have a specific number of chromosomes, and all chromosomes are in pairs.',
        'answer': '主語: All animals and plants, all chromosomes\\n動詞: have, are\\n\\n和訳: すべての動植物は特定の数の染色体を持ち、すべての染色体は対になっている。'
    },
    'T_0734_5': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nClose curtains when using the air conditioner to prevent sunlight and heat from coming in.',
        'answer': '主語: (なし - 命令文)\\n動詞: Close\\n\\n和訳: 太陽光と熱が入るのを防ぐため、エアコンを使用する際はカーテンを閉めてください。'
    },
    'T_0734_6': {
        'question': '次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\nIf unauthorized individuals try to get into your computer, the program sounds an alarm.',
        'answer': '主語: unauthorized individuals, the program\\n動詞: try, sounds\\n\\n和訳: 許可されていない個人がコンピューターに侵入しようとすると、プログラムがアラームを鳴らします。'
    }
}

new_data = data
for id_key, repl in replacements.items():
    # Find the object with this ID
    pattern = r"\{\s*id:\s*'" + id_key + r"',\s*folder:\s*'[^']+',\s*question:\s*'[^']+',\s*answer:\s*'[^']+'(\s*,\s*explanation:\s*'[^']*')?\s*\}"
    match = re.search(pattern, new_data)
    if match:
        old_obj = match.group(0)
        # Create new object
        # Also, check if explanation existed
        exp_match = re.search(r"explanation:\s*'([^']*)'", old_obj)
        exp_str = ""
        if exp_match:
            exp_str = f", explanation: '{exp_match.group(1)}'"
            
        new_obj = f"{{ id: '{id_key}', folder: '教科書_文の構造', question: '{repl['question']}', answer: '{repl['answer']}'{exp_str} }}"
        new_data = new_data.replace(old_obj, new_obj)
    else:
        print(f"Match not found for {id_key}")

# Also replace window.DATA_VERSION
version_match = re.search(r'window\.DATA_VERSION\s*=\s*(\d+);', new_data)
if version_match:
    old_version = int(version_match.group(1))
    new_data = new_data.replace(f"window.DATA_VERSION = {old_version};", f"window.DATA_VERSION = {old_version + 1};")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_data)

print("Done replacing.")
