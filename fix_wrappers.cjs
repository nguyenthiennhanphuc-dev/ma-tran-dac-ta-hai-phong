const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

// PHẦN I: TRẮC NGHIỆM
data = data.replace(
  /\/\/ PHẦN I: TRẮC NGHIỆM \(nếu có Tự luận\)\s*if \(hasTuLuanMode\) \{\s*html \+= `<p class="bold" style="font-size:15pt;">PHẦN I\. TRẮC NGHIỆM<\/p>`;\s*\}/g,
  `// PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — BỎ QUA khi mẫu Bộ 2025\n        if (hasTuLuanMode && !isMinistry) {\n          html += \`<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>\`;\n        }`
);

// PHẦN II: TỰ LUẬN (có 2 chỗ)
data = data.replace(
  /\/\/ PHẦN II: TỰ LUẬN \(nếu có Tự luận mode\)\s*if \(hasTuLuanMode\) \{\s*html \+= `<p class="bold" style="font-size:15pt;">PHẦN II\. TỰ LUẬN<\/p>`;\s*\} else \{\s*const sectionTitle = hasTraLoiNgan \? "PHẦN IV\. Câu hỏi tự luận" : "PHẦN III\. Câu hỏi tự luận";\s*html \+= `<p class="bold" style="font-size:14pt;">\$\{sectionTitle\}<\/p>`;\s*\}/g,
  `// PHẦN II: TỰ LUẬN (nếu có Tự luận mode)\n            if (isMinistry) {\n              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";\n              html += \`<p class="bold" style="font-size:14pt;">\${sectionTitle}</p>\`;\n            } else if (hasTuLuanMode) {\n              html += \`<p class="bold" style="font-size:15pt;">PHẦN II. TỰ LUẬN</p>\`;\n            } else {\n              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";\n              html += \`<p class="bold" style="font-size:14pt;">\${sectionTitle}</p>\`;\n            }`
);

// PHẦN I: TRẮC NGHIỆM (ĐÁP ÁN)
data = data.replace(
  /\/\/ PHẦN I: TRẮC NGHIỆM \(nếu có Tự luận\) — cho đáp án\s*if \(hasTuLuanModeAK\) \{\s*html \+= `<p class="bold" style="font-size:15pt;">PHẦN I\. TRẮC NGHIỆM<\/p>`;\s*\}/g,
  `// PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án — BỎ QUA khi mẫu Bộ 2025\n        if (hasTuLuanModeAK && !isMinistry) {\n          html += \`<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>\`;\n        }`
);

// Tự luận đáp án
data = data.replace(
  /\/\/ Tiêu đề đáp án tự luận — dynamic theo mode\s*if \(hasTuLuanModeAK\) \{\s*html \+= `<p class="bold" style="font-size:15pt;">PHẦN II\. TỰ LUẬN<\/p>`;\s*\} else \{\s*const sectionTitle = hasTraLoiNgan \? "PHẦN IV\. Tự luận" : "PHẦN III\. Tự luận";\s*html \+= `<p class="bold">\$\{sectionTitle\}<\/p>`;\s*\}/g,
  `// Tiêu đề đáp án tự luận — dynamic theo mode\n                if (isMinistry) {\n                  const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";\n                  html += \`<p class="bold">\${sectionTitle}</p>\`;\n                } else if (hasTuLuanModeAK) {\n                  html += \`<p class="bold" style="font-size:15pt;">PHẦN II. TỰ LUẬN</p>\`;\n                } else {\n                  const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";\n                  html += \`<p class="bold">\${sectionTitle}</p>\`;\n                }`
);

fs.writeFileSync('src/utils/exportWordMath.js', data);
console.log("Replaced exportWordMath.js wrappers successfully!");
