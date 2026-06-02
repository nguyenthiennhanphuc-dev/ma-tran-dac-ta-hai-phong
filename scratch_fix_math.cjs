const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

const fixTargetRegex = /\s*<div style="font-size:14pt;font-weight:bold;">\$\{examHeader\.soGD \|\| ""\}<\/div>[\s\S]*?\/\/\s*==================== 1\. MA TRẬN ĐỀ KIỂM TRA ====================/;

const properReplacement = `    @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 1.5cm; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Times New Roman', serif; font-size: 14pt; }
    p { margin: 0; padding: 0; margin-bottom: 4pt; line-height: 1.2; }
    h2, h3 { margin: 10pt 0; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; table-layout: fixed; mso-cellspacing: 0; mso-padding-alt: 0; }
    th, td { border: 1px solid black; padding: 2px 4px; vertical-align: top; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .bg-gray { background-color: #E2E8F0; }
    .no-border td, .no-border th { border: none !important; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
<div class="WordSection1">
\`;

    // ==================== HEADER SỞ / TRƯỜNG ====================
    const tongSoCauHeader = (() => {
      let total = getTotalY('nhieuLuaChon');
      total += Math.ceil(getTotalY('dungSai') / 4);
      if (hasTraLoiNgan) total += getTotalY('traLoiNgan');
      total += Math.ceil(getTotalY('tuLuan') / 3);
      return total;
    })();

    const cleanMonHoc = (examHeader.monHoc || "").replace(/^Môn\\s*:\\s*|^Môn\\s+/i, '').trim().toUpperCase();
    const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\\s*:\\s*|làm bài\\s*:\\s*)/i, '').trim();
    const soTrangHeader = Math.max(2, Math.ceil(tongSoCauHeader / 10));

    if (isMinistry) {
      html += \`
<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 6pt;">
  <tr>
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;"><u>\${examHeader.truong || ""}</u></div>
      <div style="font-size:12pt;font-style:italic;margin-top:4pt;">(Đề thi gồm \${String(soTrangHeader).padStart(2, '0')} trang)</div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.kyThi || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">Môn: \${cleanMonHoc}</div>
      <div style="font-size:12pt;font-style:italic;">Thời gian làm bài: \${cleanThoiGian}, không kể thời gian phát đề</div>
    </td>
  </tr>
</table>
\`;
    } else {
      html += \`
<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 6pt;">
  <tr>
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.truong || ""}</div>
      <div style="font-size:14pt;font-weight:bold;margin-top:6pt;"><u>Mã đề: 01</u></div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.kyThi || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">\${examHeader.namHoc || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">MÔN: \${cleanMonHoc}</div>
      <div style="font-size:14pt;font-style:italic;">Thời gian: \${examHeader.thoiGian || ""}</div>
      <div style="font-size:12pt;font-style:italic;">(Đề kiểm tra gồm \${tongSoCauHeader} câu, 0\${Math.ceil(tongSoCauHeader / 10)} trang)</div>
    </td>
  </tr>
</table>
\`;
    }

    // ==================== 1. MA TRẬN ĐỀ KIỂM TRA ====================`;

data = data.replace(fixTargetRegex, properReplacement);
fs.writeFileSync('src/utils/exportWordMath.js', data);

// We also need to fix the duplicate time in exportWord.js
let data2 = fs.readFileSync('src/utils/exportWord.js', 'utf8');
data2 = data2.replace(/const cleanMonHoc = \(examHeader\.monHoc \|\| ""\)\.replace\(\/\^Môn\\s\*:\\s\*\|\^Môn\\s\+\/i, ''\)\.trim\(\)\.toUpperCase\(\);\s*const soTrangHeader = Math\.max\(2, Math\.ceil\(tongSoCauHeader \/ 10\)\);/, 
  \`const cleanMonHoc = (examHeader.monHoc || "").replace(/^Môn\\\\s*:\\\\s*|^Môn\\\\s+/i, '').trim().toUpperCase();\\n  const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\\\\s*:\\\\s*|làm bài\\\\s*:\\\\s*)/i, '').trim();\\n  const soTrangHeader = Math.max(2, Math.ceil(tongSoCauHeader / 10));\`);

data2 = data2.replace(/Thời gian làm bài: \$\{\(examHeader\.thoiGian \|\| ""\)\.replace\(\/\^làm bài:\\s\*\/\i, ''\)\}, không kể thời gian phát đề/g, 
  \`Thời gian làm bài: \${cleanThoiGian}, không kể thời gian phát đề\`);

fs.writeFileSync('src/utils/exportWord.js', data2);
console.log("Fixed files successfully!");
