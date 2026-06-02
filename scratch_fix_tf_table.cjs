const fs = require('fs');

let content = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

// I will reconstruct lines 1058 to 1104
const originalCode = `      <div style="font-size:14pt;font-weight:bold;">\${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;"><u>\${examHeader.truong || ""}</u></div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:16pt;font-weight:bold;">ĐÁP ÁN ĐỀ KIỂM TRA</div>
      <div style="font-size:14pt;font-weight:bold;">Môn: \${cleanMonHoc}</div>
    </td>
  </tr>
</table>
\`;
        } else {
          html += \`<h2 style="text-align:center;">HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM</h2>\`;
        }

        // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐÁP ÁN)
        let globalAnswerIndex = 1;
        const isContinuousAK = config.isContinuousNumbering;

        // === LOGIC TIÊU ĐỀ PHẦN ĐỘNG THEO TỰ LUẬN (ĐÁP ÁN) ===
        const hasTuLuanModeAK = config.hasTuLuan;

        // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án — BỎ QUA khi mẫu Bộ 2025
        if (hasTuLuanModeAK && !isMinistry) {
          html += \`<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>\`;
        }

        // --- Đáp án DẠNG 1 / PHẦN I: Trắc nghiệm nhiều lựa chọn ---
        const totalMCQ = getTotalY('nhieuLuaChon');
        if (totalMCQ > 0) {
            const d1TitleAK = isMinistry
              ? \`Phần I.\`
              : hasTuLuanModeAK
                ? \`DẠNG 1. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu \${p1_pt} điểm)\`
                : \`PHẦN I. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu \${p1_pt} điểm)\`;
            html += \`<p class="bold">\${d1TitleAK}</p>\`;
            if (isMinistry) {
              const diemP1Str = String(p1_pt).replace('.', ',');
              html += \`<p style="font-style:italic;">(Mỗi câu trả lời đúng thí sinh được \${diemP1Str} điểm)</p>\`;
            }
            html += \`<table border="1" style="border-collapse:collapse;width:100%;">
              <tr class="bg-gray bold text-center"><td>Câu</td>\`;
            for (let i = 0; i < totalMCQ; i++) {
                const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                html += \`<td>\${displayNum}</td>\`;`;

const targetRegex = /    <td style="width:40%;text-align:center;vertical-align:top;border:none;">\r?\n            \}\r?\n            for \(let i = 0; i < soCauTL; i\+\+\) \{[\s\S]*?\/\/\s*---\s*Đáp án DẠNG 1 \/ PHẦN I: Trắc nghiệm nhiều lựa chọn\s*---/m;

// wait, the file got corrupted with duplicated lines! Let's find exactly the corrupted block.
const corruptStart = `    <td style="width:40%;text-align:center;vertical-align:top;border:none;">\n            }\n            for (let i = 0; i < soCauTL; i++) {`;
const corruptEnd = `    <td style="width:40%;text-align:center;vertical-align:top;border:none;">\n            }\n            html += \`</tr><tr class="text-center bold"><td class="bg-gray">Đáp án</td>\`;`;

// Actually I'll do a string replacement for the corrupted section.
const regex = /<td style="width:40%;text-align:center;vertical-align:top;border:none;">\r?\n            \}\r?\n            for \(let i = 0; i < soCauTL; i\+\+\) \{[\s\S]*?<td style="width:40%;text-align:center;vertical-align:top;border:none;">\r?\n            \}\r?\n            html \+= \`<\/tr><tr class="text-center bold"><td class="bg-gray">Đáp án<\/td>\`;/;

if (regex.test(content)) {
    content = content.replace(regex, originalCode + "\n            }\n            html += `</tr><tr class=\"text-center bold\"><td class=\"bg-gray\">Đáp án</td>`;");
    fs.writeFileSync('src/utils/exportWordMath.js', content);
    console.log("Fixed successfully!");
} else {
    console.log("Regex not found for fix!");
}
