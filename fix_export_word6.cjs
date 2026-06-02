const fs = require('fs');

let lines = fs.readFileSync('src/utils/exportWord.js', 'utf8').split(/\r?\n/);

const startIdx = 833;
const endIdx = 857;

const replacement = `          for (let i = 0; i < totalSA; i++) {
            const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
            const slotData = examSlots[\`phan3_cau\${i + 1}\`];
            const dapAn = slotData?.dapAnDung || '...';
            answerKeyParagraphs.push(new Paragraph({
              children: [
                new TextRun({ text: \`Câu \${displayNum}: \`, bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: String(dapAn).replace(/\\*\\*/g, '').trim(), size: 24, font: "Times New Roman" })
              ],
              spacing: { after: 60 }
            }));
            // In giải thích nếu có
            if (slotData?.giaiThich) {
              answerKeyParagraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: \`Giải thích: \`, bold: true, italics: true, size: 22, font: "Times New Roman" }),
                  new TextRun({ text: slotData.giaiThich.replace(/\\*\\*/g, '').trim(), italics: true, size: 22, font: "Times New Roman" })
                ],
                spacing: { after: 120 }
              }));
            }
          }
          answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
      }
    }`;

lines.splice(startIdx, endIdx - startIdx + 1, ...replacement.split('\n'));

fs.writeFileSync('src/utils/exportWord.js', lines.join('\n'));
console.log("Fixed exportWord.js via line replacement!");
