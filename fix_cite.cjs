const fs = require('fs');
const filePath = 'f:/2025-2026/các dự án app/matrix-app/src/components/Step5_AIGenerator.jsx';

let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add citation cleanup right after cleanLatexJunk call
const oldLine = "    const text = cleanLatexJunk(rawText);\r\n";
const newLine = `    let text = cleanLatexJunk(rawText);\r
    // DỌN RÁC CITATION CỦA GEMINI: [cite_start], [cite: 1, 2], [cite: 242] v.v.\r
    text = text.replace(/\\[cite_start\\]/g, '').replace(/\\[cite:\\s*[\\d,\\s]*\\]/g, '').replace(/\\[cite_end\\]/g, '');\r
`;

const idx = content.indexOf(oldLine);
if (idx === -1) {
  console.error("Could not find target line!");
  process.exit(1);
}

content = content.substring(0, idx) + newLine + content.substring(idx + oldLine.length);

// 2. Also add same cleanup to parseLoai1, parseLoai2, parseLoai3, parseLoai4
// They each receive blockText that might still have cite tags from lines
// Actually, since we clean the whole text upfront, the blocks derived from it should be clean already.
// But let's also clean in cleanLatexJunk for safety:
const oldCleanEnd = "        .replace(/\\$\\s*t\\^\\\\circ\\s*\\$/g, 't°');";
const newCleanEnd = `        .replace(/\\$\\s*t\\^\\\\circ\\s*\\$/g, 't°')\r
        .replace(/\\[cite_start\\]/g, '')\r
        .replace(/\\[cite:\\s*[\\d,\\s]*\\]/g, '')\r
        .replace(/\\[cite_end\\]/g, '');`;

// Find and replace the last line of cleanLatexJunk
const cleanIdx = content.indexOf(oldCleanEnd);
if (cleanIdx === -1) {
  console.error("Could not find cleanLatexJunk end line!");
  // Continue anyway since the main fix is above
} else {
  content = content.substring(0, cleanIdx) + newCleanEnd + content.substring(cleanIdx + oldCleanEnd.length);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("SUCCESS: Added citation cleanup!");
