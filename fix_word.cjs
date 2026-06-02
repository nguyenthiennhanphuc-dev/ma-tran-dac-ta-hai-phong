const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWord.js', 'utf8');

// 1. Merge Title and Desc
data = data.replace(
  /examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: (d[123]Title), bold: true, size: 24, font: "Times New Roman" \}\]\], spacing: \{ before: 300, after: 60 \} \}\)\);\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: (d[123]Desc), italics: true, size: 24, font: "Times New Roman" \}\]\], spacing: \{ after: 200 \} \}\)\);/g,
  `if (isMinistry) {
        examParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: $1, bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: " " + $2, size: 24, font: "Times New Roman" })
          ],
          spacing: { before: 300, after: 200 }
        }));
      } else {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: $1, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: $2, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));
      }`
);

// 2. Remove Point from Question
data = data.replace(
  /new TextRun\(\{ text: `\(\$\{([a-zA-Z0-9_]+)\}\ điểm\)\.\ `, bold: true, size: 24, font: "Times New Roman" \}\)/g,
  `(isMinistry ? new TextRun({ text: '. ', bold: true, size: 24, font: "Times New Roman" }) : new TextRun({ text: \`(\${\$1} điểm). \`, bold: true, size: 24, font: "Times New Roman" }))`
);

// 3. Remove Table for Dạng 2 (Đúng/Sai) in isMinistry
// There's only one block for Dạng 2 in exportWord.js (line 476+)
const dang2TableRegex = /\/\/ Vẽ bảng Nhận định \/ Đ-S\s*const tfTableRows = \[\];\s*\/\/ Header row\s*tfTableRows\.push\(new TableRow\(\{\s*children: \[\s*new TableCell\(\{ width: \{ size: 85, type: WidthType\.PERCENTAGE \}, verticalAlign: VerticalAlign\.CENTER, children: \[new Paragraph\(\{ alignment: AlignmentType\.CENTER, children: \[new TextRun\(\{ text: "Nhận định", bold: true, size: 22, font: "Times New Roman" \}\)\] \}\)\] \}\),\s*new TableCell\(\{ width: \{ size: 15, type: WidthType\.PERCENTAGE \}, verticalAlign: VerticalAlign\.CENTER, children: \[new Paragraph\(\{ alignment: AlignmentType\.CENTER, children: \[new TextRun\(\{ text: "Đ\/S", bold: true, size: 22, font: "Times New Roman" \}\)\] \}\)\] \}\),\s*\]\s*\}\)\);\s*\/\/ Data rows\s*const tfYKeys = \[\['a\)', slotData\.yA\], \['b\)', slotData\.yB\], \['c\)', slotData\.yC\], \['d\)', slotData\.yD\]\];\s*tfYKeys\.forEach\(\(\[label, content\]\) => \{\s*if \(content\) \{\s*tfTableRows\.push\(new TableRow\(\{\s*children: \[\s*new TableCell\(\{ width: \{ size: 85, type: WidthType\.PERCENTAGE \}, children: \[new Paragraph\(\{ children: \[new TextRun\(\{ text: `\$\{label\} \$\{cleanText\(content\)\}`, size: 22, font: "Times New Roman" \}\)\], spacing: \{ after: 40 \} \}\)\] \}\),\s*new TableCell\(\{ width: \{ size: 15, type: WidthType\.PERCENTAGE \}, verticalAlign: VerticalAlign\.CENTER, children: \[new Paragraph\(\{ alignment: AlignmentType\.CENTER, children: \[new TextRun\(\{ text: "", size: 22, font: "Times New Roman" \}\)\] \}\)\] \}\),\s*\]\s*\}\)\);\s*\}\s*\}\);\s*examParagraphs\.push\(new Table\(\{\s*rows: tfTableRows,\s*width: \{ size: 100, type: WidthType\.PERCENTAGE \},\s*borders: standardBorders,\s*\}\)\);/g;

const dang2TableReplace = `// Vẽ bảng Nhận định / Đ-S hoặc in đoạn thường theo chuẩn Bộ
          if (isMinistry) {
            const tfYKeys = [['a.', slotData.yA], ['b.', slotData.yB], ['c.', slotData.yC], ['d.', slotData.yD]];
            tfYKeys.forEach(([label, content]) => {
              if (content) {
                examParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: \`\${label} \${cleanText(content)}\`, size: 24, font: "Times New Roman" })],
                  indent: { left: 720 },
                  spacing: { after: 60 }
                }));
              }
            });
          } else {
            const tfTableRows = [];
            // Header row
            tfTableRows.push(new TableRow({
              children: [
                new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nhận định", bold: true, size: 22, font: "Times New Roman" })] })] }),
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đ/S", bold: true, size: 22, font: "Times New Roman" })] })] }),
              ]
            }));
            // Data rows
            const tfYKeys = [['a)', slotData.yA], ['b)', slotData.yB], ['c)', slotData.yC], ['d)', slotData.yD]];
            tfYKeys.forEach(([label, content]) => {
              if (content) {
                tfTableRows.push(new TableRow({
                  children: [
                    new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: \`\${label} \${cleanText(content)}\`, size: 22, font: "Times New Roman" })], spacing: { after: 40 } })] }),
                    new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 22, font: "Times New Roman" })] })] }),
                  ]
                }));
              }
            });
            examParagraphs.push(new Table({
              rows: tfTableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: standardBorders,
            }));
          }`;

data = data.replace(dang2TableRegex, dang2TableReplace);

fs.writeFileSync('src/utils/exportWord.js', data);
console.log("WORD SCRIPT DONE");
