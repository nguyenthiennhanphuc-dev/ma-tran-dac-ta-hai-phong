const fs = require('fs');

let content = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

// 1. Add isMinistry
content = content.replace(
  /export const exportToWordMath = async \(\) => \{\s*const \{ matrix, config, examConfig, examHeader, generatedExam, examSlots \} = useExamStore\.getState\(\);/,
  `export const exportToWordMath = async () => {\n    const { matrix, config, examConfig, examHeader, generatedExam, examSlots } = useExamStore.getState();\n    const isMinistry = config.exportTemplate === 'ministry';`
);

// 2. Student info header
content = content.replace(
  /html \+= \`<h2 style="text-align:center;">ĐỀ KIỂM TRA<\/h2>\`;/g,
  `html += \`<h2 style="text-align:center;">ĐỀ KIỂM TRA</h2>\`;\n        if (isMinistry) {\n            html += \`<p style="font-size:14pt;margin-bottom:6pt;">Họ, tên thí sinh: ...........................................................................</p>\`;\n            html += \`<p style="font-size:14pt;margin-bottom:18pt;">Số báo danh: ................................................................................</p>\`;\n        }`
);

// 3. Part 1 title (two occurrences)
content = content.replace(
  /const d1Title = hasTuLuanMode\s*\?\s*"DẠNG 1\. Câu hỏi trắc nghiệm nhiều phương án lựa chọn"\s*:\s*"PHẦN I\. Câu trắc nghiệm nhiều phương án lựa chọn";\s*html \+= \`<p class="bold" style="font-size:14pt;">\$\{d1Title\}<\/p>\`;\s*html \+= \`<p style="font-size:14pt;font-style:italic;">Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:<\/p>\`;/g,
  `let d1Title = hasTuLuanMode
              ? "DẠNG 1. Câu hỏi trắc nghiệm nhiều phương án lựa chọn"
              : "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
            let d1Desc = "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:";
            if (isMinistry) {
              d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
              const totalM = (typeof questions !== 'undefined' && questions.length > 0) ? questions.length : getTotalY('nhieuLuaChon');
              d1Desc = \`Thí sinh trả lời từ câu 1 đến câu \${totalM}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.\`;
            }
            html += \`<p class="bold" style="font-size:14pt;">\${d1Title}</p>\`;
            html += \`<p style="font-size:14pt;font-style:italic;">\${d1Desc}</p>\`;`
);

// 4. Part 2 title (two occurrences)
content = content.replace(
  /const d2Title = hasTuLuanMode\s*\?\s*"DẠNG 2\. Câu hỏi trắc nghiệm đúng\/ sai"\s*:\s*"PHẦN II\. Câu trắc nghiệm đúng sai";\s*html \+= \`<p class="bold" style="font-size:14pt;">\$\{d2Title\}<\/p>\`;\s*html \+= \`<p style="font-size:14pt;font-style:italic;">Trong mỗi ý a\), b\), c\), d\) ở mỗi câu, học sinh chọn đúng ghi \(Đ\) hoặc sai ghi \(S\) vào bài làm\.<\/p>\`;/g,
  `let d2Title = hasTuLuanMode
              ? "DẠNG 2. Câu hỏi trắc nghiệm đúng/ sai"
              : "PHẦN II. Câu trắc nghiệm đúng sai";
            let d2Desc = "Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S) vào bài làm.";
            if (isMinistry) {
              d2Title = "PHẦN II. Câu trắc nghiệm đúng sai";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const totalTFItems = (typeof dung_sai !== 'undefined' && dung_sai.length > 0) ? dung_sai.length : Math.ceil(getTotalY('dungSai') / 4);
              const endQ = startQ + totalTFItems - 1;
              d2Desc = \`Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.\`;
            }
            html += \`<p class="bold" style="font-size:14pt;">\${d2Title}</p>\`;
            html += \`<p style="font-size:14pt;font-style:italic;">\${d2Desc}</p>\`;`
);

// 5. Part 3 title (two occurrences)
content = content.replace(
  /const d3Title = hasTuLuanMode\s*\?\s*"DẠNG 3\. Câu trả lời ngắn"\s*:\s*"PHẦN III\. Câu trắc nghiệm trả lời ngắn";\s*html \+= \`<p class="bold" style="font-size:14pt;">\$\{d3Title\}<\/p>\`;\s*html \+= \`<p style="font-size:14pt;font-style:italic;">Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi\.<\/p>\`;/g,
  `let d3Title = hasTuLuanMode
              ? "DẠNG 3. Câu trả lời ngắn"
              : "PHẦN III. Câu trắc nghiệm trả lời ngắn";
            let d3Desc = "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi.";
            if (isMinistry) {
              d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const totalSAItems = (typeof tra_loi_ngan !== 'undefined' && tra_loi_ngan.length > 0) ? tra_loi_ngan.length : getTotalY('traLoiNgan');
              const endQ = startQ + totalSAItems - 1;
              d3Desc = \`Thí sinh trả lời từ câu \${startQ} đến câu \${endQ}.\`;
            }
            html += \`<p class="bold" style="font-size:14pt;">\${d3Title}</p>\`;
            html += \`<p style="font-size:14pt;font-style:italic;">\${d3Desc}</p>\`;`
);

// 6. Answer Key (Math)
const oldAKMath = `            const d2TitleAK = hasTuLuanModeAK
              ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`
              : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`;
            html += \`<p class="bold">\${d2TitleAK}</p>\`;
            html += \`<table border="1" style="border-collapse:collapse;width:100%;">
              <tr class="bg-gray bold text-center"><td>Câu</td><td>Ý a</td><td>Ý b</td><td>Ý c</td><td>Ý d</td></tr>\`;
            for (let i = 0; i < soCauTF; i++) {
                const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                const slotData = examSlots[\`phan2_cau\${i + 1}\`];
                const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                html += \`<tr class="text-center"><td><b>\${displayNum}</b></td><td>\${a}</td><td>\${b}</td><td>\${c}</td><td>\${d}</td></tr>\`;
            }
            html += \`</table>\`;`;

const newAKMath = `            let d2TitleAK = hasTuLuanModeAK
              ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`
              : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng \${p2_pt} điểm)\`;
              
            if (isMinistry) {
                d2TitleAK = "PHẦN II. Câu trắc nghiệm đúng sai";
                html += \`<p class="bold">\${d2TitleAK}</p>\`;
                
                html += \`<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                  <tr class="text-center"><td class="bold bg-gray">Điểm</td><td>1 ý đúng: 0,1đ</td><td>2 ý đúng: 0,25đ</td><td>3 ý đúng: 0,5đ</td><td>4 ý đúng: 1,0đ</td></tr>
                </table>\`;
                
                html += \`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center">
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                  </tr>\`;
                
                const cellsArray = [];
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\`phan2_cau\${i + 1}\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    
                    ['a', 'b', 'c', 'd'].forEach((lbl, idx) => {
                        cellsArray.push(idx === 0 ? \`<b>\${displayNum}</b>\` : "");
                        cellsArray.push(\`\${lbl})\`);
                        cellsArray.push([a, b, c, d][idx]);
                    });
                }
                
                for (let i = 0; i < cellsArray.length; i += 6) {
                    html += \`<tr class="text-center">\`;
                    for(let j=0; j<6; j++){
                        if(i+j < cellsArray.length){
                            html += \`<td>\${cellsArray[i+j]}</td>\`;
                        } else {
                            html += \`<td></td>\`;
                        }
                    }
                    html += \`</tr>\`;
                }
                html += \`</table>\`;
            } else {
                html += \`<p class="bold">\${d2TitleAK}</p>\`;
                html += \`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center"><td>Câu</td><td>Ý a</td><td>Ý b</td><td>Ý c</td><td>Ý d</td></tr>\`;
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\`phan2_cau\${i + 1}\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    html += \`<tr class="text-center"><td><b>\${displayNum}</b></td><td>\${a}</td><td>\${b}</td><td>\${c}</td><td>\${d}</td></tr>\`;
                }
                html += \`</table>\`;
            }`;

content = content.replace(oldAKMath, newAKMath);

fs.writeFileSync('src/utils/exportWordMath.js', content);
