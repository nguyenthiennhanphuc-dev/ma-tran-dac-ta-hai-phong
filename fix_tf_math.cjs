const fs = require('fs');

let lines = fs.readFileSync('src/utils/exportWordMath.js', 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('// --- Đáp án DẠNG 2 / PHẦN II: Đúng/Sai ---'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('} else {') && lines[i+1].includes('<table border="1" style="border-collapse:collapse;width:100%;">'));

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `        // --- Đáp án DẠNG 2 / PHẦN II: Đúng/Sai ---
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (soCauTF > 0) {
            if (!isContinuousAK) globalAnswerIndex = 1;
            const d2TitleAK = isMinistry
              ? \`Phần II\`
              : hasTuLuanModeAK
                ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`
                : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`;
            html += \`<p class="bold" style="font-size:14pt;">\${d2TitleAK}</p>\`;
            
            if (isMinistry) {
                html += \`<p>Điểm tối đa của 01 câu hỏi là 1 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 01 ý trong 1 câu hỏi được 0,1 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 02 ý trong 1 câu hỏi được 0,25 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 03 ý trong 1 câu hỏi được 0,50 điểm.</p>
<p>- Thí sinh lựa chọn chính xác cả 04 ý trong 1 câu hỏi được 1 điểm.</p>\`;
                
                html += \`<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                  <tr style="text-align:center;font-weight:bold;font-size:14pt;">
                    <td style="padding:4pt;">Câu</td><td style="padding:4pt;">Lệnh hỏi</td><td style="padding:4pt;">Đáp án (Đ/S)</td>
                    <td style="padding:4pt;">Câu</td><td style="padding:4pt;">Lệnh hỏi</td><td style="padding:4pt;">Đáp án (Đ/S)</td>
                  </tr>\`;
                
                for (let i = 0; i < soCauTF; i += 2) {
                    const idx1 = i;
                    const idx2 = i + 1;
                    
                    const num1 = isContinuousAK ? globalAnswerIndex++ : (idx1 + 1);
                    const slotData1 = examSlots[\`phan2_cau\${idx1 + 1}\`];
                    const dapAn1 = extractABCD(slotData1?.dapAnDung);
                    
                    let num2 = "";
                    let dapAn2 = ["", "", "", ""];
                    if (idx2 < soCauTF) {
                        num2 = isContinuousAK ? globalAnswerIndex++ : (idx2 + 1);
                        const slotData2 = examSlots[\`phan2_cau\${idx2 + 1}\`];
                        dapAn2 = extractABCD(slotData2?.dapAnDung);
                    }
                    
                    const labels = ['a', 'b', 'c', 'd'];
                    for (let r = 0; r < 4; r++) {
                        html += \`<tr style="text-align:center;font-size:14pt;">\`;
                        if (r === 0) {
                            html += \`<td rowspan="4" style="font-weight:bold;padding:4pt;vertical-align:middle;">\${num1}</td>\`;
                        }
                        html += \`<td style="padding:4pt;">\${labels[r]}</td><td style="padding:4pt;">\${dapAn1[r]}</td>\`;
                        
                        if (idx2 < soCauTF) {
                            if (r === 0) {
                                html += \`<td rowspan="4" style="font-weight:bold;padding:4pt;vertical-align:middle;">\${num2}</td>\`;
                            }
                            html += \`<td style="padding:4pt;">\${labels[r]}</td><td style="padding:4pt;">\${dapAn2[r]}</td>\`;
                        } else {
                            if (r === 0) {
                                html += \`<td rowspan="4" style="padding:4pt;"></td>\`;
                            }
                            html += \`<td style="padding:4pt;"></td><td style="padding:4pt;"></td>\`;
                        }
                        html += \`</tr>\`;
                    }
                }
                html += \`</table>\`;`;
    lines.splice(startIdx, endIdx - startIdx, ...replacement.split('\n'));
    fs.writeFileSync('src/utils/exportWordMath.js', lines.join('\n'));
    console.log("Fixed exportWordMath.js via line replacement!");
} else {
    console.log("Indices not found!", startIdx, endIdx);
}
