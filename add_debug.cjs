const fs = require('fs');
const filePath = 'f:/2025-2026/các dự án app/matrix-app/src/components/Step5_AIGenerator.jsx';

let content = fs.readFileSync(filePath, 'utf-8');

// Add heavy debug logging right after "const lines = text.split('\\n');"
const target = "    const lines = text.split('\\n');\r\n";
const insertAfter = target;

const debugCode = `
    // === DEBUG: In ra 10 dòng đầu để kiểm tra format ===
    console.log('[parseExamDraft] === DEBUG: Tổng số dòng:', lines.length);
    lines.slice(0, 15).forEach((l, i) => {
      console.log('[parseExamDraft] LINE ' + i + ':', JSON.stringify(l.substring(0, 120)));
    });
    // === DEBUG: Thử match từng dòng với cauRegex ===
    const cauRegexDebug = /^\\s*(?:\\*\\*|__)?Câu\\s*(\\d+)/i;
    let matchCount = 0;
    lines.forEach((l, i) => {
      const trimmed = l.replace(/\\r/g, '');
      if (cauRegexDebug.test(trimmed)) {
        matchCount++;
        if (matchCount <= 5) console.log('[parseExamDraft] MATCH Câu at line ' + i + ':', JSON.stringify(trimmed.substring(0, 80)));
      }
    });
    console.log('[parseExamDraft] === DEBUG: Tổng dòng match Câu X:', matchCount);
`;

const idx = content.indexOf(target);
if (idx === -1) {
  console.error("Could not find target line!");
  process.exit(1);
}

content = content.substring(0, idx + target.length) + debugCode + content.substring(idx + target.length);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("SUCCESS: Added debug logging!");
