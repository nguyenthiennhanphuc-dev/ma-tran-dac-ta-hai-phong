const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWord.js', 'utf8');
data = data.replace(/createCell\("Tổng \(Ý\)", true, AlignmentType\.RIGHT/g, 'createCell("Tổng (Ý)", true, AlignmentType.CENTER');
data = data.replace(/createCell\("Tổng số câu", true, AlignmentType\.RIGHT/g, 'createCell("Tổng số câu", true, AlignmentType.CENTER');
data = data.replace(/createCell\("Tổng điểm", true, AlignmentType\.RIGHT/g, 'createCell("Tổng điểm", true, AlignmentType.CENTER');
data = data.replace(/createCell\("Tỉ lệ %", true, AlignmentType\.RIGHT/g, 'createCell("Tỉ lệ %", true, AlignmentType.CENTER');
data = data.replace(/columnWidths: \[500, 1500, 1500/g, 'columnWidths: [500, 800, 2200');
data = data.replace(/columnWidths: \[500, 1300, 1300, 2500/g, 'columnWidths: [500, 800, 1500, 2800');
fs.writeFileSync('src/utils/exportWord.js', data);
