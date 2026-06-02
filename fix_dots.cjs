const fs = require('fs');

// 1. Fix exportWord.js
let contentWord = fs.readFileSync('src/utils/exportWord.js', 'utf8');

// Replace dots line 1
contentWord = contentWord.replace(
  /examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: \`   \$\{dotsFill\}\`, size: 22, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/g,
  `if (!isMinistry) {
              examParagraphs.push(new Paragraph({ children: [new TextRun({ text: \`   \${dotsFill}\`, size: 22, font: "Times New Roman" })], spacing: { after: 200 } }));
            } else {
              // Add an empty paragraph for spacing
              examParagraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
            }`
);

fs.writeFileSync('src/utils/exportWord.js', contentWord);
console.log("Fixed exportWord.js!");

// 2. Fix exportWordMath.js
let contentMath = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

contentMath = contentMath.replace(
  /html \+= \`<p>&nbsp;&nbsp;&nbsp;\$\{dotsFillHtml\}<\/p>\`;/g,
  `if (!isMinistry) {
                        html += \`<p>&nbsp;&nbsp;&nbsp;\${dotsFillHtml}</p>\`;
                    } else {
                        html += \`<br/>\`;
                    }`
);

fs.writeFileSync('src/utils/exportWordMath.js', contentMath);
console.log("Fixed exportWordMath.js!");
