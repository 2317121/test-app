import re
import json

file_path = r'Z:\開発課題\アプリ開発\最新\data.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper function to modify questions
def process_data(content):
    # 1. Move T_0737_2a ~ 2d to 教科書_同義語
    for sub in ['a', 'b', 'c', 'd']:
        old_str = f"id: 'T_0737_2{sub}', folder: '教科書_並び替え (Part 1)'"
        new_str = f"id: 'T_0737_2{sub}', folder: '教科書_同義語'"
        content = content.replace(old_str, new_str)
        
    # 2. Convert 教科書_文の構造 into sorting questions
    # Example T_0734_1:
    # question: '次の英文の主語に一重線、動詞に二重線を引きましょう。\n\nWhen the shift lever is in reverse, the machine moves backward.'
    # answer: '主語: the shift lever, the machine\n動詞: is, moves\n\n【和訳】\nシフトレバーがバックになっている場合、その機械は後退する。'
    # Needs to become:
    # question: 'シフトレバーがバックになっている場合、その機械は後退する。\n(1. backward 2. in 3. is 4. lever 5. machine 6. moves 7. reverse 8. shift 9. the 10. the 11. when)' (sorted alphabetically for choices, or just jumbled)
    # answer: 'When the shift lever is in reverse, the machine moves backward.'
    
    import random
    
    def replace_sentence_structure(match):
        full_match = match.group(0)
        
        # Extract the english sentence
        eng_match = re.search(r'次の文の主語に一重線、動詞に二重線を引きましょう。\\n\\n(.*?)\'', full_match)
        if not eng_match: return full_match
        eng_sentence = eng_match.group(1).strip()
        
        # Extract the Japanese translation
        jp_match = re.search(r'和訳:\s*(.*?)\'', full_match)
        if not jp_match: return full_match
        jp_sentence = jp_match.group(1).strip()
        
        # Jumble words for English sentence
        # Remove punctuation for the jumbled words, except keep them in the answer.
        # Actually, standard sorting questions usually don't have punctuation in the choices or keep them attached?
        # Let's strip punctuation for the words to sort
        clean_eng = re.sub(r'[^\w\s]', '', eng_sentence)
        words = clean_eng.split()
        
        # Make the first letter lowercase if it's the start of the sentence (unless it's a proper noun, but simple lowercase is fine based on "文頭にくる単語も小文字にしてある")
        words = [w.lower() if i==0 else w for i, w in enumerate(words)]
        
        # Sort words alphabetically to pseudo-randomize
        words.sort()
        
        # Create the numbered choices
        choices = " ".join([f"{i+1}. {w}" for i, w in enumerate(words)])
        
        new_question = f"{jp_sentence}\\n({choices})"
        new_answer = eng_sentence
        
        # Replace question and answer fields
        full_match = re.sub(r'question:\s*\'.*?\'', f"question: '{new_question}'", full_match, flags=re.DOTALL)
        full_match = re.sub(r'answer:\s*\'.*?\'', f"answer: '{new_answer}'", full_match, flags=re.DOTALL)
        
        return full_match

    content = re.sub(r'\{\s*id:\s*\'T_073[45]_[^\']+\',\s*folder:\s*\'教科書_文の構造\'.*?\}', replace_sentence_structure, content, flags=re.DOTALL)
    
    # 3. Increment DATA_VERSION
    ver_match = re.search(r'window\.DATA_VERSION\s*=\s*(\d+);', content)
    if ver_match:
        old_ver = int(ver_match.group(1))
        content = content.replace(f'window.DATA_VERSION = {old_ver};', f'window.DATA_VERSION = {old_ver + 1};')
        
    return content

new_content = process_data(content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Data modified successfully.")
