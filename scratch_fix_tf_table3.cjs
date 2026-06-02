const fs = require('fs');

let content = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');
let lines = content.split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án')) {
        startIndex = i;
    }
    if (lines[i].includes('// --- Đáp án DẠNG 3 / PHẦN III: Trả lời ngắn')) {
        endIndex = i;
        break; // found both
    }
}

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const replacement = `        // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án — BỎ QUA khi mẫu Bộ 2025
        if (hasTuLuanModeAK && !isMinistry) {
          html += \\\`<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>\\\`;
        }

        // --- Đáp án DẠNG 1 / PHẦN I: Trắc nghiệm nhiều lựa chọn ---
        const totalMCQ = getTotalY('nhieuLuaChon');
        if (totalMCQ > 0) {
            const d1TitleAK = isMinistry
              ? \\\`Phần I.\\\`
              : hasTuLuanModeAK
                ? \\\`DẠNG 1. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu \${p1_pt} điểm)\\\`
                : \\\`PHẦN I. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu \${p1_pt} điểm)\\\`;
            html += \\\`<p class="bold">\${d1TitleAK}</p>\\\`;
            if (isMinistry) {
              const diemP1Str = String(p1_pt).replace('.', ',');
              html += \\\`<p style="font-style:italic;">(Mỗi câu trả lời đúng thí sinh được \${diemP1Str} điểm)</p>\\\`;
            }
            html += \\\`<table border="1" style="border-collapse:collapse;width:100%;">
              <tr class="bg-gray bold text-center"><td>Câu</td>\\\`;
            for (let i = 0; i < totalMCQ; i++) {
                const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                html += \\\`<td>\${displayNum}</td>\\\`;
            }
            html += \\\`</tr><tr class="text-center bold"><td class="bg-gray">Đáp án</td>\\\`;
            for (let i = 0; i < totalMCQ; i++) {
                const slotData = examSlots[\\\`phan1_cau\${i + 1}\\\`];
                html += \\\`<td>\${String(cleanAns(slotData?.dapAnDung)).replace(/\\*/g, '')}</td>\\\`;
            }
            html += \\\`</tr></table>\\\`;
        }

        // --- Đáp án DẠNG 2 / PHẦN II: Đúng/Sai ---
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (soCauTF > 0) {
            if (!isContinuousAK) globalAnswerIndex = 1;
            const d2TitleAK = isMinistry
              ? \\\`PHẦN II. Câu trắc nghiệm đúng sai\\\`
              : hasTuLuanModeAK
                ? \\\`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\\\`
                : \\\`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\\\`;
            html += \\\`<p class="bold">\${d2TitleAK}</p>\\\`;
            
            if (isMinistry) {
                html += \\\`<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                  <tr class="text-center"><td class="bold bg-gray">Điểm</td><td>1 ý đúng: 0,1đ</td><td>2 ý đúng: 0,25đ</td><td>3 ý đúng: 0,5đ</td><td>4 ý đúng: 1,0đ</td></tr>
                </table>\\\`;
                
                html += \\\`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center">
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                  </tr>\\\`;
                
                const cellsArray = [];
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\\\`phan2_cau\${i + 1}\\\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    
                    ['a', 'b', 'c', 'd'].forEach((lbl, idx) => {
                        cellsArray.push(idx === 0 ? \\\`<b>\${displayNum}</b>\\\` : "");
                        cellsArray.push(\\\`\${lbl})\\\`);
                        cellsArray.push([a, b, c, d][idx]);
                    });
                }
                
                for (let i = 0; i < cellsArray.length; i += 6) {
                    html += \\\`<tr class="text-center">\\\`;
                    for(let j=0; j<6; j++){
                        if(i+j < cellsArray.length){
                            html += \\\`<td>\${cellsArray[i+j]}</td>\\\`;
                        } else {
                            html += \\\`<td></td>\\\`;
                        }
                    }
                    html += \\\`</tr>\\\`;
                }
                html += \\\`</table>\\\`;
            } else {
                html += \\\`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center"><td>Câu</td><td>Ý a</td><td>Ý b</td><td>Ý c</td><td>Ý d</td></tr>\\\`;
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\\\`phan2_cau\${i + 1}\\\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    html += \\\`<tr class="text-center"><td><b>\${displayNum}</b></td><td>\${a}</td><td>\${b}</td><td>\${c}</td><td>\${d}</td></tr>\\\`;
                }
                html += \\\`</table>\\\`;
            }
        }`;

    lines.splice(startIndex, endIndex - startIndex, replacement);
    fs.writeFileSync('src/utils/exportWordMath.js', lines.join('\\n'));
    console.log("Lines replaced successfully from " + startIndex + " to " + endIndex);
} else {
    console.log("Could not find start or end index!");
    console.log("Start: " + startIndex + ", End: " + endIndex);
}
