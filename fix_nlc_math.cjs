const fs = require('fs');

let contentMath = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

contentMath = contentMath.replace(
  /(\/\/ ==================== HƯỚNG DẪN MÃ HÓA NĂNG LỰC ====================)/,
  `if (config.showCompetencySymbol !== false) {\n    $1`
);

contentMath = contentMath.replace(
  /(html \+= \`<p style="font-size:12pt;"><b>Lưu ý:<\/b> <i>Mã năng lực được ghi kèm theo số lượng câu hỏi\\\/ý trong Bảng Đặc tả nhằm giúp giáo viên dễ dàng đối chiếu yêu cầu cần đạt với mức độ nhận thức tương ứng khi ra đề kiểm tra\. Các mã viết tắt cụ thể theo từng môn được quy ước trong bảng trên\.<\/i><\/p>\`;\n)/,
  `$1    }\n`
);

fs.writeFileSync('src/utils/exportWordMath.js', contentMath);
console.log('Wrapped HƯỚNG DẪN in exportWordMath.js');
