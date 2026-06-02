const fs = require('fs');
let content = fs.readFileSync('src/utils/exportWord.js', 'utf8');

// Fix Part 1
content = content.replace(
  /d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";\s+d1Desc = `Thí sinh trả lời từ câu 1 đến câu \$\{totalMCQ\}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`;\s+\}\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d1Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d1Desc, italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/,
  `d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.";
        d1Desc = \` Thí sinh trả lời từ câu 1 đến câu \${totalMCQ}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.\`;
      }
      if (isMinistry) {
        examParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: d1Title, bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: d1Desc, size: 24, font: "Times New Roman" })
          ],
          spacing: { before: 300, after: 60 }
        }));
      } else {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));
      }`
);

// Fix Part 2
content = content.replace(
  /d2Title = "PHẦN II. Câu trắc nghiệm đúng sai";\s+const startQ = isContinuous \? globalQuestionIndex : 1;\s+const endQ = startQ \+ soCauTF - 1;\s+d2Desc = `Thí sinh trả lời từ câu \$\{startQ\} đến câu \$\{endQ\}. Trong mỗi ý a\), b\), c\), d\) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;\s+\}\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d2Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d2Desc, italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/,
  `d2Title = "PHẦN II. Câu trắc nghiệm đúng sai.";
        const startQ = isContinuous ? globalQuestionIndex : 1;
        const endQ = startQ + soCauTF - 1;
        d2Desc = \` Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.\`;
      }
      if (isMinistry) {
        examParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: d2Title, bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: d2Desc, size: 24, font: "Times New Roman" })
          ],
          spacing: { before: 300, after: 60 }
        }));
      } else {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));
      }`
);

// Fix Part 3
content = content.replace(
  /d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn";\s+const startQ = isContinuous \? globalQuestionIndex : 1;\s+const endQ = startQ \+ totalSA - 1;\s+d3Desc = `Thí sinh trả lời từ câu \$\{startQ\} đến câu \$\{endQ\}.`;\s+\}\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d3Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s+examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d3Desc, italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/,
  `d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn.";
          const startQ = isContinuous ? globalQuestionIndex : 1;
          const endQ = startQ + totalSA - 1;
          d3Desc = \` Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}.\`;
        }
        if (isMinistry) {
          examParagraphs.push(new Paragraph({
            children: [
              new TextRun({ text: d3Title, bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: d3Desc, size: 24, font: "Times New Roman" })
            ],
            spacing: { before: 300, after: 60 }
          }));
        } else {
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));
        }`
);

// Remove spaces in \`Câu \${displayNum} \`
content = content.replace(/\`Câu \$\{displayNum\} \`/g, '\`Câu \${displayNum}\`');

fs.writeFileSync('src/utils/exportWord.js', content);
console.log("Replaced headers in exportWord.js successfully!");
