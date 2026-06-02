const fs = require('fs');

let content = fs.readFileSync('src/utils/exportWord.js', 'utf8');

// 1. Add isMinistry
content = content.replace(
  /export const exportToWord = async \(\) => \{\s*const \{ matrix, config, examConfig, examHeader, generatedExam, examSlots \} = useExamStore\.getState\(\);/,
  `export const exportToWord = async () => {\n  const { matrix, config, examConfig, examHeader, generatedExam, examSlots } = useExamStore.getState();\n  const isMinistry = config.exportTemplate === 'ministry';`
);

// 2. Add student info
content = content.replace(
  /let examParagraphs = \[\n\s*new Paragraph\(\{ text: "3\. KHUNG ĐỀ KIỂM TRA", heading: HeadingLevel\.HEADING_2, alignment: AlignmentType\.CENTER, spacing: \{ before: 600, after: 300 \} \}\)\n\s*\];\n\n\s*if \(generatedExam/g,
  `let examParagraphs = [
    new Paragraph({ text: "3. KHUNG ĐỀ KIỂM TRA", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { before: 600, after: 300 } })
  ];

  if (isMinistry) {
    examParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Họ, tên thí sinh: ...........................................................................", size: 24, font: "Times New Roman" })], spacing: { after: 120 } }));
    examParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Số báo danh: ................................................................................", size: 24, font: "Times New Roman" })], spacing: { after: 240 } }));
  }

  if (generatedExam`
);

// 3. Part I Title
content = content.replace(
  /const d1Title = hasTuLuanMode\s*\?\s*"DẠNG 1\. Câu trắc nghiệm nhiều phương án lựa chọn"\s*:\s*"PHẦN I\. Câu trắc nghiệm nhiều phương án lựa chọn";\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d1Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:", italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/g,
  `let d1Title = hasTuLuanMode
        ? "DẠNG 1. Câu trắc nghiệm nhiều phương án lựa chọn"
        : "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
      let d1Desc = "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:";
      if (isMinistry) {
        d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
        d1Desc = \`Thí sinh trả lời từ câu 1 đến câu \${totalMCQ}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.\`;
      }
      examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
      examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));`
);

// 4. Part II Title
content = content.replace(
  /const d2Title = hasTuLuanMode\s*\?\s*"DẠNG 2\. Câu trắc nghiệm đúng\/sai"\s*:\s*"PHẦN II\. Câu trắc nghiệm đúng sai";\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d2Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: "Trong mỗi ý a\), b\), c\), d\) ở mỗi câu, học sinh chọn đúng ghi \(Đ\) hoặc sai ghi \(S\) vào bài làm\.", italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/g,
  `let d2Title = hasTuLuanMode
        ? "DẠNG 2. Câu trắc nghiệm đúng/sai"
        : "PHẦN II. Câu trắc nghiệm đúng sai";
      let d2Desc = "Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S) vào bài làm.";
      if (isMinistry) {
        d2Title = "PHẦN II. Câu trắc nghiệm đúng sai";
        const startQ = isContinuous ? globalQuestionIndex : 1;
        const endQ = startQ + soCauTF - 1;
        d2Desc = \`Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.\`;
      }
      examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
      examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));`
);

// 5. Part III Title
content = content.replace(
  /const d3Title = hasTuLuanMode\s*\?\s*"DẠNG 3\. Câu trả lời ngắn"\s*:\s*"PHẦN III\. Câu trắc nghiệm trả lời ngắn";\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: d3Title, bold: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ before: 300, after: 60 \} \}\)\);\s*examParagraphs\.push\(new Paragraph\(\{ children: \[new TextRun\(\{ text: "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi\.", italics: true, size: 24, font: "Times New Roman" \}\)\], spacing: \{ after: 200 \} \}\)\);/g,
  `let d3Title = hasTuLuanMode
          ? "DẠNG 3. Câu trả lời ngắn"
          : "PHẦN III. Câu trắc nghiệm trả lời ngắn";
        let d3Desc = "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi.";
        if (isMinistry) {
          d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn";
          const startQ = isContinuous ? globalQuestionIndex : 1;
          const endQ = startQ + totalSA - 1;
          d3Desc = \`Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}.\`;
        }
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Title, bold: true, size: 24, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Desc, italics: true, size: 24, font: "Times New Roman" })], spacing: { after: 200 } }));`
);

// 6. Part II Answer Key
const oldAK = `      const d2TitleAK = hasTuLuanModeAK
        ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`
        : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`;
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: d2TitleAK, bold: true, size: 24, font: "Times New Roman" })],
        spacing: { before: 200, after: 150 }
      }));

      const tfHeaderRow = new TableRow({
        children: [
          createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Ý a", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Ý b", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Ý c", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Ý d", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
        ]
      });
      const tfDataRows = [];
      for (let i = 0; i < soCauTF; i++) {
        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
        const slotData = examSlots[\`phan2_cau\${i + 1}\`];
        const raw = (slotData?.dapAnDung || '').replace(/\\*/g, '');
        const parts = raw.split(',').map(s => s.trim());
        const yA = parts[0] || '...';
        const yB = parts[1] || '...';
        const yC = parts[2] || '...';
        const yD = parts[3] || '...';
        tfDataRows.push(new TableRow({
          children: [
            createCell(displayNum, true),
            createCell(yA, false),
            createCell(yB, false),
            createCell(yC, false),
            createCell(yD, false),
          ]
        }));
      }
      answerKeyParagraphs.push(new Table({
        rows: [tfHeaderRow, ...tfDataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: standardBorders // BẬT VIỀN ĐẸP
      }));
      answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));`;

const newAK = `      let d2TitleAK = hasTuLuanModeAK
        ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`
        : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`;
      
      if (isMinistry) {
        d2TitleAK = "PHẦN II. Câu trắc nghiệm đúng sai";
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: d2TitleAK, bold: true, size: 24, font: "Times New Roman" })],
          spacing: { before: 200, after: 100 }
        }));
        
        answerKeyParagraphs.push(new Table({
          rows: [
            new TableRow({ children: [
              createCell("Điểm", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              createCell("1 ý đúng: 0,1đ", false, AlignmentType.CENTER),
              createCell("2 ý đúng: 0,25đ", false, AlignmentType.CENTER),
              createCell("3 ý đúng: 0,5đ", false, AlignmentType.CENTER),
              createCell("4 ý đúng: 1,0đ", false, AlignmentType.CENTER),
            ]})
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 150 } }));

        const tfHeaderRow = new TableRow({
          children: [
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          ]
        });
        
        const tfDataRows = [];
        const cellsArray = [];
        for (let i = 0; i < soCauTF; i++) {
          const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
          const slotData = examSlots[\`phan2_cau\${i + 1}\`];
          const raw = (slotData?.dapAnDung || '').replace(/\\*/g, '');
          const parts = raw.split(',').map(s => s.trim());
          
          ['a', 'b', 'c', 'd'].forEach((lbl, idx) => {
            cellsArray.push(createCell(idx === 0 ? displayNum : "", false));
            cellsArray.push(createCell(lbl + ")", false));
            cellsArray.push(createCell(parts[idx] || "...", false));
          });
        }
        
        for (let i = 0; i < cellsArray.length; i += 6) {
          const rowCells = cellsArray.slice(i, i + 6);
          while(rowCells.length < 6) rowCells.push(createCell("", false));
          tfDataRows.push(new TableRow({ children: rowCells }));
        }

        answerKeyParagraphs.push(new Table({
          rows: [tfHeaderRow, ...tfDataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      } else {
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: d2TitleAK, bold: true, size: 24, font: "Times New Roman" })],
          spacing: { before: 200, after: 150 }
        }));

        const tfHeaderRow = new TableRow({
          children: [
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý a", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý b", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý c", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý d", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          ]
        });
        const tfDataRows = [];
        for (let i = 0; i < soCauTF; i++) {
          const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
          const slotData = examSlots[\`phan2_cau\${i + 1}\`];
          const raw = (slotData?.dapAnDung || '').replace(/\\*/g, '');
          const parts = raw.split(',').map(s => s.trim());
          const yA = parts[0] || '...';
          const yB = parts[1] || '...';
          const yC = parts[2] || '...';
          const yD = parts[3] || '...';
          tfDataRows.push(new TableRow({
            children: [
              createCell(displayNum, true),
              createCell(yA, false),
              createCell(yB, false),
              createCell(yC, false),
              createCell(yD, false),
            ]
          }));
        }
        answerKeyParagraphs.push(new Table({
          rows: [tfHeaderRow, ...tfDataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders // BẬT VIỀN ĐẸP
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }`;

content = content.replace(oldAK, newAK);

fs.writeFileSync('src/utils/exportWord.js', content);
