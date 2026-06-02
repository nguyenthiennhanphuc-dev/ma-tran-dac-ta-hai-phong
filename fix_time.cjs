const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWord.js', 'utf8');

const targetStr = "Thời gian làm bài: ${(examHeader.thoiGian || \"\").replace(/^làm bài:\\s*/i, '')}, không kể thời gian phát đề";
const replaceStr = "Thời gian làm bài: ${cleanThoiGian}, không kể thời gian phát đề";

data = data.replace(targetStr, replaceStr);

// Thêm const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\\s*:\\s*|làm bài\\s*:\\s*)/i, '').trim(); 
// nếu chưa có. Ở dòng 1022 có: const cleanMonHoc = ...
data = data.replace(
  /const cleanMonHoc = \(examHeader\.monHoc \|\| ""\)\.replace\(\/\^Môn\\s\*:\\s\*\|\^Môn\\s\+\/i, ''\)\.trim\(\)\.toUpperCase\(\);/,
  `const cleanMonHoc = (examHeader.monHoc || "").replace(/^Môn\\s*:\\s*|^Môn\\s+/i, '').trim().toUpperCase();\n  const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\\s*:\\s*|làm bài\\s*:\\s*)/i, '').trim();`
);

fs.writeFileSync('src/utils/exportWord.js', data);
console.log("Fixed exportWord.js duplicate time");
