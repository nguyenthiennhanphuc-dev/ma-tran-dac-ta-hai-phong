const fs = require('fs');

let c = fs.readFileSync('src/utils/exportWord.js', 'utf8');

const brokenPartIndex = c.indexOf('          const slotData = examSlots[`phan3_cau${i + 1}`];\n          const dapAn = slotData?.dapAnDung || \'...\';');

if (brokenPartIndex !== -1) {
  const searchStr = `          spacing: { after: 150 }\n        }));\n      }`;
  const startIdx = c.lastIndexOf(searchStr, brokenPartIndex);
  
  if (startIdx !== -1) {
      const fullStartIdx = startIdx + searchStr.length;
      
      const newContent = `
      // === PHỤC HỒI BẢNG ĐÚNG SAI ===
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
    }

    // ---------- DẠNG 3 / PHẦN III: ĐÁP ÁN TRẢ LỜI NGẮN (NÂNG CẤP: câu hỏi độc lập) ----------
    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      if (totalSA > 0) {
        if (!isContinuousAK) globalAnswerIndex = 1;
        if (isMinistry) {
          const diemMoiCauP3Str = String(examConfig.diemMoiYP3).replace('.', ',');
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: "Phần III", bold: true, size: 24, font: "Times New Roman" })],
            spacing: { before: 200, after: 60 }
          }));
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: \`(Mỗi câu trả lời đúng thí sinh được \${diemMoiCauP3Str} điểm)\`, italics: true, size: 24, font: "Times New Roman" })],
            spacing: { after: 150 }
          }));
          
          const saHeaderRow = new TableRow({
            children: [
              createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              createCell("Đáp án", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              createCell("Đáp án", true, AlignmentType.CENTER, 1, 1, "E2E8F0")
            ]
          });
          
          const saDataRows = [];
          const cellsArray = [];
          for (let i = 0; i < totalSA; i++) {
            const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
            const slotData = examSlots[\`phan3_cau\${i + 1}\`];
            const dapAn = slotData?.dapAnDung ? String(slotData.dapAnDung).replace(/\\*\\*/g, '').trim() : '...';
            cellsArray.push(displayNum);
            cellsArray.push(dapAn);
          }
          
          for (let i = 0; i < cellsArray.length; i += 4) {
            const rowChildren = [];
            for(let j=0; j<4; j++){
              if(i+j < cellsArray.length){
                rowChildren.push(createCell(cellsArray[i+j], false));
              } else {
                rowChildren.push(createCell("", false));
              }
            }
            saDataRows.push(new TableRow({ children: rowChildren }));
          }
          
          answerKeyParagraphs.push(new Table({
            rows: [saHeaderRow, ...saDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders // BẬT VIỀN ĐẸP
          }));
          answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else {
          const d3TitleAK = hasTuLuanModeAK
            ? \`DẠNG 3. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng được \${examConfig.diemMoiYP3} điểm)\`
            : \`PHẦN III. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng được \${examConfig.diemMoiYP3} điểm)\`;
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: d3TitleAK, bold: true, size: 24, font: "Times New Roman" })],
            spacing: { before: 200, after: 150 }
          }));

          // NÂNG CẤP: Dạng 3 giờ là câu độc lập → in "Câu X: [dapAnDung]"
          for (let i = 0; i < totalSA; i++) {
`;
      c = c.substring(0, fullStartIdx) + newContent + c.substring(brokenPartIndex);
      fs.writeFileSync('src/utils/exportWord.js', c);
      console.log('Fixed exportWord.js successfully!');
  } else {
      console.log('Start index not found!');
  }
} else {
  console.log('Broken part not found!');
}
