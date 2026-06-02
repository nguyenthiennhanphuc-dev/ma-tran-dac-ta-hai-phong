const fs = require('fs');

let lines = fs.readFileSync('src/utils/exportWordMath.js', 'utf8').split(/\r?\n/);

const startIdx = 1173;
const endIdx = 1193;

const replacement = `        // --- Đáp án DẠNG 3 / PHẦN III: Trả lời ngắn (NÂNG CẤP: câu hỏi độc lập) ---
        if (hasTraLoiNgan) {
            const totalSA = getTotalY('traLoiNgan');
            if (totalSA > 0) {
                if (!isContinuousAK) globalAnswerIndex = 1;
                if (isMinistry) {
                    const diemP3Str = String(p3_pt).replace('.', ',');
                    html += \`<p class="bold" style="font-size:14pt;">PHẦN III</p>\`;
                    html += \`<p style="font-style:italic;font-size:14pt;">(Mỗi câu trả lời đúng thí sinh được \${diemP3Str} điểm)</p>\`;
                    html += \`<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                      <tr style="text-align:center;font-weight:bold;font-size:14pt;">
                        <td style="width:25%;">Câu</td><td style="width:25%;">Đáp án</td>
                        <td style="width:25%;">Câu</td><td style="width:25%;">Đáp án</td>
                      </tr>\`;
                    
                    const cellsArray = [];
                    for (let i = 0; i < totalSA; i++) {
                        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                        const slotData = examSlots[\`phan3_cau\${i + 1}\`];
                        const dapAn = cleanAns(slotData?.dapAnDung) || '...';
                        cellsArray.push(displayNum);
                        cellsArray.push(dapAn);
                    }
                    
                    for (let i = 0; i < cellsArray.length; i += 4) {
                        html += \`<tr style="text-align:center;font-size:14pt;">\`;
                        for(let j=0; j<4; j++){
                            if(i+j < cellsArray.length){
                                html += \`<td style="padding:4pt;">\${cellsArray[i+j]}</td>\`;
                            } else {
                                html += \`<td style="padding:4pt;"></td>\`;
                            }
                        }
                        html += \`</tr>\`;
                    }
                    html += \`</table>\`;
                } else {
                    const d3TitleAK = hasTuLuanModeAK
                      ? \`DẠNG 3. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng \${p3_pt} điểm)\`
                      : \`PHẦN III. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng \${p3_pt} điểm)\`;
                    html += \`<p class="bold">\${d3TitleAK}</p>\`;
                    for (let i = 0; i < totalSA; i++) {
                        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                        const slotData = examSlots[\`phan3_cau\${i + 1}\`];
                        const dapAn = cleanAns(slotData?.dapAnDung) || '...';
                        html += \`<p><b>Câu \${displayNum}:</b> \${dapAn}</p>\`;
                        // In giải thích nếu có
                        if (slotData?.giaiThich) {
                            html += \`<p style="margin-left:2em;"><i><b>Giải thích:</b> \${formatTextWithMath(slotData.giaiThich)}</i></p>\`;
                        }
                    }
                }
            }
        }`;

lines.splice(startIdx, endIdx - startIdx + 1, ...replacement.split('\n'));

fs.writeFileSync('src/utils/exportWordMath.js', lines.join('\n'));
console.log("Fixed exportWordMath.js via line replacement!");
