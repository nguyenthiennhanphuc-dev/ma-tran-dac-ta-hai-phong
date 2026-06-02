const fs = require('fs');

let lines = fs.readFileSync('src/utils/exportWord.js', 'utf8').split(/\r?\n/);

let borderLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('borders: standardBorders // BẬT VIỀN ĐẸP') && lines[i+1].includes('const slotData = examSlots[`phan3_cau${i + 1}`];')) {
    borderLineIndex = i;
    break;
  }
}

if (borderLineIndex !== -1) {
    const newContent = `      }));
      answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    }

    // ---------- DẠNG 2 / PHẦN II: ĐÁP ÁN ĐÚNG/SAI ----------
    const totalTF = getTotalY('dungSai');
    const soCauTF = Math.ceil(totalTF / 4);
    if (soCauTF > 0) {
      if (!isContinuousAK) globalAnswerIndex = 1;
      const d2TitleAK = isMinistry
        ? \`Phần II.\`
        : hasTuLuanModeAK
          ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`
          : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`;
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: d2TitleAK, bold: true, size: 24, font: "Times New Roman" })],
        spacing: { before: 200, after: 80 }
      }));
      // === BẢNG QUY ĐỊNH ĐIỂM CHUẨN BỘ 2025 ===
      if (isMinistry) {
        answerKeyParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: "- Trả lời đúng 1 ý: 0,1đ; ", size: 22, font: "Times New Roman" }),
            new TextRun({ text: "2 ý: 0,25đ; ", size: 22, font: "Times New Roman" }),
            new TextRun({ text: "3 ý: 0,5đ; ", size: 22, font: "Times New Roman" }),
            new TextRun({ text: "4 ý: 1,0đ.", bold: true, size: 22, font: "Times New Roman" }),
          ],
          spacing: { after: 150 }
        }));
      }

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

    // ---------- DẠNG 3 / PHẦN III: ĐÁP ÁN TRẢ LỜI NGẮN ----------
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
              createCell("Câu", true),
              createCell("Đáp án", true),
              createCell("Câu", true),
              createCell("Đáp án", true)
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

          for (let i = 0; i < totalSA; i++) {`;
  lines.splice(borderLineIndex + 1, 0, ...newContent.split('\n'));
  fs.writeFileSync('src/utils/exportWord.js', lines.join('\n'));
  console.log("Fixed successfully via splice!");
} else {
  console.log("Anchor not found!");
}
