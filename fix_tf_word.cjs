const fs = require('fs');

let lines = fs.readFileSync('src/utils/exportWord.js', 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('// ---------- DẠNG 2 / PHẦN II: ĐÁP ÁN ĐÚNG/SAI ----------'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('// ---------- DẠNG 3 / PHẦN III: ĐÁP ÁN TRẢ LỜI NGẮN ----------'));

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `    // ---------- DẠNG 2 / PHẦN II: ĐÁP ÁN ĐÚNG/SAI ----------
    const totalTF = getTotalY('dungSai');
    const soCauTF = Math.ceil(totalTF / 4);
    if (soCauTF > 0) {
      if (!isContinuousAK) globalAnswerIndex = 1;
      const d2TitleAK = isMinistry
        ? \`Phần II\`
        : hasTuLuanModeAK
          ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`
          : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)\`;
      
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: d2TitleAK, bold: true, size: 24, font: "Times New Roman" })],
        spacing: { before: 200, after: 80 }
      }));

      if (isMinistry) {
        // Text guide exactly as image
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "Điểm tối đa của 01 câu hỏi là 1 điểm.", size: 24, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 01 ý trong 1 câu hỏi được 0,1 điểm.", size: 24, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 02 ý trong 1 câu hỏi được 0,25 điểm.", size: 24, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 03 ý trong 1 câu hỏi được 0,50 điểm.", size: 24, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh lựa chọn chính xác cả 04 ý trong 1 câu hỏi được 1 điểm.", size: 24, font: "Times New Roman" })],
          spacing: { after: 150 }
        }));

        const tfHeaderRow = new TableRow({
          children: [
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, null),
          ]
        });

        const tfDataRows = [];
        for (let i = 0; i < soCauTF; i += 2) {
          const idx1 = i;
          const idx2 = i + 1;
          
          const num1 = isContinuousAK ? globalAnswerIndex++ : (idx1 + 1);
          const slotData1 = examSlots[\`phan2_cau\${idx1 + 1}\`];
          const raw1 = (slotData1?.dapAnDung || '').replace(/\\*/g, '');
          const parts1 = raw1.split(',').map(s => s.trim());
          const dapAn1 = [parts1[0] || '...', parts1[1] || '...', parts1[2] || '...', parts1[3] || '...'];

          let num2 = "";
          let dapAn2 = ["", "", "", ""];
          if (idx2 < soCauTF) {
            num2 = isContinuousAK ? globalAnswerIndex++ : (idx2 + 1);
            const slotData2 = examSlots[\`phan2_cau\${idx2 + 1}\`];
            const raw2 = (slotData2?.dapAnDung || '').replace(/\\*/g, '');
            const parts2 = raw2.split(',').map(s => s.trim());
            dapAn2 = [parts2[0] || '...', parts2[1] || '...', parts2[2] || '...', parts2[3] || '...'];
          }

          const labels = ['a', 'b', 'c', 'd'];
          for (let r = 0; r < 4; r++) {
            const rowChildren = [];
            
            // Cột 1-3
            if (r === 0) {
              rowChildren.push(createCell(num1, true, AlignmentType.CENTER, 1, 4, null));
            }
            rowChildren.push(createCell(labels[r], false, AlignmentType.CENTER));
            rowChildren.push(createCell(dapAn1[r], false, AlignmentType.CENTER));

            // Cột 4-6
            if (idx2 < soCauTF) {
              if (r === 0) {
                rowChildren.push(createCell(num2, true, AlignmentType.CENTER, 1, 4, null));
              }
              rowChildren.push(createCell(labels[r], false, AlignmentType.CENTER));
              rowChildren.push(createCell(dapAn2[r], false, AlignmentType.CENTER));
            } else {
              if (r === 0) {
                rowChildren.push(createCell("", false, AlignmentType.CENTER, 1, 4, null));
              }
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
            }

            tfDataRows.push(new TableRow({ children: rowChildren }));
          }
        }

        answerKeyParagraphs.push(new Table({
          rows: [tfHeaderRow, ...tfDataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      } else {
        // ORIGINAL LOGIC (5 columns)
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
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }
    }

`;
    lines.splice(startIdx, endIdx - startIdx, ...replacement.split('\n'));
    fs.writeFileSync('src/utils/exportWord.js', lines.join('\n'));
    console.log("Fixed exportWord.js Part 2 Answer Key!");
} else {
    console.log("Indices not found!", startIdx, endIdx);
}
