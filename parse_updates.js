const fs = require('fs');

const referencePath = 'c:/Users/2521329/Desktop/anti/アプリ/技能照査/テスト/参考.txt';
const outputPath = 'c:/Users/2521329/Desktop/anti/アプリ/技能照査/new_candidates.json';

const content = fs.readFileSync(referencePath, 'utf-8');
const lines = content.split('\n');

const newItems = [];
let currentItem = null;

// Only start parsing from line 524
// But since we split by newline, we need to iterate and keep track of line numbers (1-indexed)
// actually it's easier to just slice the lines array if we knew the index.
// 524th line is index 523.

const targetLines = lines.slice(523);

function saveCurrent() {
    if (currentItem && currentItem.question) {
        // Clean up
        if (currentItem.explanation) {
            currentItem.explanation = currentItem.explanation.trim();
        }
        newItems.push(currentItem);
    }
}

targetLines.forEach(line => {
    line = line.trim();
    if (!line) return;

    if (/^Q\d+\./.test(line)) {
        saveCurrent();
        currentItem = {
            question: line.replace(/^Q\d+\.\s*/, ''),
            answer: '',
            explanation: '',
            folder: 'セキュア試験',
            id: 'new_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
        };
    } else if (currentItem) {
        if (line.startsWith('正解データ:')) {
            const match = line.match(/\[(.*?)\]/);
            if (match) {
                currentItem.answer = match[1];
            }
        } else if (line.startsWith('あなたの回答:') && !currentItem.answer) {
            // If we don't have a definitive "正解データ" yet, hold this potentially
            // But we need to verify if it's correct.
            // The format has '正解 (+1点)' on a subsequent line.
            // We'll store it in a temp property
            currentItem.tempUserAnswer = line.replace('あなたの回答:', '').trim();
        } else if (line.startsWith('正解 (+1点)')) {
            if (currentItem.tempUserAnswer) {
                currentItem.answer = currentItem.tempUserAnswer;
            }
        } else if (line.startsWith('解説:')) {
            const text = line.replace(/^解説:\s*/, '');
            if (text) {
                currentItem.explanation = (currentItem.explanation || '') + text + '\n';
            }
        } else if (currentItem.explanation !== undefined) {
            // Append continuation of explanation if we are in explanation block?
            // The file structure seems to have "解説:" prefix often.
            // But if it's just a raw line after explanation started?
            // Let's assume explanation continues until next Q.
            // Wait, "解説:" appears multiple times sometimes? "解説:\n解説: ..."
            if (!line.startsWith('あなたの回答') && !line.startsWith('正解') && !line.startsWith('不正解') && !line.startsWith('正解データ')) {
                // Check if it's just "解説:" empty line
                if (line === '解説:') return;
                currentItem.explanation += line + '\n';
            }
        }
    }
});
saveCurrent();

// Post-processing to remove "new_" IDs and match existing format if needed, 
// but for now we just want the content.
fs.writeFileSync(outputPath, JSON.stringify(newItems, null, 2));
console.log(`Parsed ${newItems.length} items.`);
