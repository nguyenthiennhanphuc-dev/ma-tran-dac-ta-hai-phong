// src/components/data/khtnIndicators.js
// Chỉ số năng lực môn Khoa học tự nhiên (KHTN) THCS - GDPT 2018
// Tổ chức theo khối lớp (6, 7, 8, 9) và 3 nhóm năng lực lõi:
//   KHTN1: Nhận thức khoa học tự nhiên
//   KHTN2: Tìm hiểu thế giới tự nhiên
//   KHTN3: Vận dụng kiến thức, kĩ năng đã học

// =============================================================================
// LỚP 6 – 4 mạch nội dung cốt lõi
// =============================================================================
export const khtn6Indicators = [
  // --- KHTN1: Nhận thức khoa học tự nhiên ---
  { id: 'k6_1_1', code: 'KHTN1.1', content: 'Nêu được khái niệm, nhận biết được các đối tượng, hiện tượng khoa học tự nhiên cơ bản (lớp 6).', level: 'biet', lop: 6, mach: 'chung' },
  { id: 'k6_1_2', code: 'KHTN1.2', content: 'Trình bày, mô tả được đặc điểm của các đối tượng, hiện tượng khoa học tự nhiên (lớp 6).', level: 'biet', lop: 6, mach: 'chung' },
  { id: 'k6_1_3', code: 'KHTN1.3', content: 'Phân loại, so sánh được các đối tượng khoa học tự nhiên theo tiêu chí đã học (lớp 6).', level: 'hieu', lop: 6, mach: 'chung' },
  { id: 'k6_1_4', code: 'KHTN1.4', content: 'Phân tích, giải thích được mối liên hệ giữa các sự vật, hiện tượng trong tự nhiên (lớp 6).', level: 'hieu', lop: 6, mach: 'chung' },
  { id: 'k6_1_5', code: 'KHTN1.5', content: 'Vận dụng được kiến thức để giải quyết vấn đề thực tiễn đơn giản liên quan đến lớp 6.', level: 'vanDung', lop: 6, mach: 'chung' },

  // --- Mạch: Chất và sự biến đổi (Lớp 6) ---
  { id: 'k6_chat_1', code: 'KHTN1.1a', content: 'Nêu được khái niệm chất, hỗn hợp, dung dịch; phân biệt được chất tinh khiết và hỗn hợp.', level: 'biet', lop: 6, mach: 'chat' },
  { id: 'k6_chat_2', code: 'KHTN1.2a', content: 'Mô tả được tính chất vật lý của một số chất gần gũi (màu sắc, mùi vị, trạng thái, khối lượng riêng...).', level: 'biet', lop: 6, mach: 'chat' },
  { id: 'k6_chat_3', code: 'KHTN1.3a', content: 'Phân biệt được sự thay đổi tính chất vật lý và tính chất hoá học; nhận biết hiện tượng vật lý và hoá học.', level: 'hieu', lop: 6, mach: 'chat' },
  { id: 'k6_chat_4', code: 'KHTN3.1a', content: 'Đề xuất được cách tách chất ra khỏi hỗn hợp bằng phương pháp lọc, bay hơi, từ tính.', level: 'vanDung', lop: 6, mach: 'chat' },
  { id: 'k6_chat_5', code: 'KHTN3.2a', content: 'Thực hiện được thí nghiệm tách chất đơn giản và giải thích kết quả thí nghiệm.', level: 'vanDung', lop: 6, mach: 'chat' },

  // --- Mạch: Vật sống (Lớp 6) ---
  { id: 'k6_vatsong_1', code: 'KHTN1.1b', content: 'Nhận biết được tế bào là đơn vị cơ sở của sự sống; nêu được cấu tạo cơ bản của tế bào.', level: 'biet', lop: 6, mach: 'vatsong' },
  { id: 'k6_vatsong_2', code: 'KHTN1.2b', content: 'Mô tả được cấu tạo và chức năng của các bộ phận trong tế bào thực vật, tế bào động vật.', level: 'biet', lop: 6, mach: 'vatsong' },
  { id: 'k6_vatsong_3', code: 'KHTN1.3b', content: 'Phân biệt được tế bào thực vật và tế bào động vật; phân biệt được sinh vật đơn bào và đa bào.', level: 'hieu', lop: 6, mach: 'vatsong' },
  { id: 'k6_vatsong_4', code: 'KHTN3.1b', content: 'Quan sát và vẽ được tế bào qua kính hiển vi hoặc hình ảnh; xác định được tỉ lệ phóng đại.', level: 'vanDung', lop: 6, mach: 'vatsong' },

  // --- Mạch: Năng lượng (Lớp 6) ---
  { id: 'k6_nanglg_1', code: 'KHTN1.1c', content: 'Nhận biết được một số dạng năng lượng phổ biến (cơ năng, nhiệt năng, điện năng, quang năng).', level: 'biet', lop: 6, mach: 'nanglg' },
  { id: 'k6_nanglg_2', code: 'KHTN1.2c', content: 'Mô tả được sự truyền nhiệt và sự thay đổi nhiệt độ; nêu được vai trò của nhiệt độ với đời sống.', level: 'biet', lop: 6, mach: 'nanglg' },
  { id: 'k6_nanglg_3', code: 'KHTN3.1c', content: 'Giải thích được một số hiện tượng truyền nhiệt trong thực tiễn; thiết kế được mô hình cách nhiệt đơn giản.', level: 'vanDung', lop: 6, mach: 'nanglg' },

  // --- Mạch: Trái Đất và bầu trời (Lớp 6) ---
  { id: 'k6_tdat_1', code: 'KHTN1.1d', content: 'Nêu được hình dạng, kích thước của Trái Đất; mô tả được chuyển động của Trái Đất quanh trục và quanh Mặt Trời.', level: 'biet', lop: 6, mach: 'tdat' },
  { id: 'k6_tdat_2', code: 'KHTN1.2d', content: 'Giải thích được hiện tượng ngày đêm, mùa trong năm dựa trên chuyển động của Trái Đất.', level: 'hieu', lop: 6, mach: 'tdat' },
  { id: 'k6_tdat_3', code: 'KHTN3.1d', content: 'Lập được bảng/mô hình mô tả chuyển động của Trái Đất và liên hệ với thực tiễn địa phương.', level: 'vanDung', lop: 6, mach: 'tdat' },

  // --- KHTN2: Tìm hiểu thế giới tự nhiên (Lớp 6) ---
  { id: 'k6_2_1', code: 'KHTN2.1', content: 'Đặt được câu hỏi nghiên cứu; nhận ra được vấn đề khoa học tự nhiên đơn giản (lớp 6).', level: 'hieu', lop: 6, mach: 'chung' },
  { id: 'k6_2_2', code: 'KHTN2.2', content: 'Lập được kế hoạch, tiến hành được thí nghiệm; thu thập và xử lý số liệu đơn giản (lớp 6).', level: 'vanDung', lop: 6, mach: 'chung' },
  { id: 'k6_2_3', code: 'KHTN2.3', content: 'Trình bày được báo cáo kết quả tìm hiểu thực nghiệm; thảo luận kết quả và rút ra kết luận (lớp 6).', level: 'vanDung', lop: 6, mach: 'chung' },
];

// =============================================================================
// LỚP 7 – 4 mạch nội dung cốt lõi
// =============================================================================
export const khtn7Indicators = [
  // --- KHTN1: Nhận thức chung (Lớp 7) ---
  { id: 'k7_1_1', code: 'KHTN1.1', content: 'Nêu được, nhận biết được các khái niệm, hiện tượng, quy luật khoa học tự nhiên (lớp 7).', level: 'biet', lop: 7, mach: 'chung' },
  { id: 'k7_1_2', code: 'KHTN1.2', content: 'Mô tả, trình bày được đặc điểm, cấu tạo, quá trình của các đối tượng khoa học tự nhiên (lớp 7).', level: 'biet', lop: 7, mach: 'chung' },
  { id: 'k7_1_3', code: 'KHTN1.3', content: 'Phân tích, giải thích, so sánh được các đối tượng, hiện tượng khoa học tự nhiên (lớp 7).', level: 'hieu', lop: 7, mach: 'chung' },
  { id: 'k7_1_4', code: 'KHTN1.4', content: 'Vận dụng được kiến thức lớp 7 để giải quyết vấn đề thực tiễn và vấn đề khoa học.', level: 'vanDung', lop: 7, mach: 'chung' },

  // --- Mạch: Chất và sự biến đổi (Lớp 7) ---
  { id: 'k7_chat_1', code: 'KHTN1.1a', content: 'Nêu được khái niệm nguyên tử, nguyên tố hoá học, phân tử, đơn chất, hợp chất.', level: 'biet', lop: 7, mach: 'chat' },
  { id: 'k7_chat_2', code: 'KHTN1.2a', content: 'Trình bày được mô hình nguyên tử Bohr đơn giản; mô tả cấu tạo nguyên tử gồm hạt nhân và lớp electron.', level: 'biet', lop: 7, mach: 'chat' },
  { id: 'k7_chat_3', code: 'KHTN1.3a', content: 'Giải thích được sự hình thành liên kết ion, liên kết cộng hoá trị cơ bản; viết được công thức hoá học.', level: 'hieu', lop: 7, mach: 'chat' },
  { id: 'k7_chat_4', code: 'KHTN3.1a', content: 'Lập được phương trình hoá học chữ và phương trình hoá học (đơn giản); tính được theo phương trình.', level: 'vanDung', lop: 7, mach: 'chat' },

  // --- Mạch: Vật sống (Lớp 7) ---
  { id: 'k7_vatsong_1', code: 'KHTN1.1b', content: 'Nêu được đặc điểm cấu tạo và chức năng của các cơ quan trong hệ sinh sản ở thực vật (hoa, quả, hạt).', level: 'biet', lop: 7, mach: 'vatsong' },
  { id: 'k7_vatsong_2', code: 'KHTN1.2b', content: 'Mô tả được quá trình quang hợp, hô hấp ở thực vật; nêu vai trò của mỗi quá trình.', level: 'biet', lop: 7, mach: 'vatsong' },
  { id: 'k7_vatsong_3', code: 'KHTN1.3b', content: 'Giải thích được mối quan hệ giữa quang hợp và hô hấp; giải thích sự vận chuyển nước và chất dinh dưỡng trong cây.', level: 'hieu', lop: 7, mach: 'vatsong' },
  { id: 'k7_vatsong_4', code: 'KHTN3.1b', content: 'Thiết kế và thực hiện được thí nghiệm chứng minh quang hợp, hô hấp ở thực vật.', level: 'vanDung', lop: 7, mach: 'vatsong' },
  { id: 'k7_vatsong_5', code: 'KHTN3.2b', content: 'Đề xuất được biện pháp chăm sóc cây trồng dựa trên hiểu biết về quang hợp, hô hấp, trao đổi nước.', level: 'vanDung', lop: 7, mach: 'vatsong' },

  // --- Mạch: Năng lượng (Lớp 7) ---
  { id: 'k7_nanglg_1', code: 'KHTN1.1c', content: 'Nêu được khái niệm tốc độ; công thức v = s/t và đơn vị tốc độ.', level: 'biet', lop: 7, mach: 'nanglg' },
  { id: 'k7_nanglg_2', code: 'KHTN1.2c', content: 'Mô tả được sự truyền âm; nêu đặc điểm âm thanh (tần số, biên độ, mức âm).', level: 'biet', lop: 7, mach: 'nanglg' },
  { id: 'k7_nanglg_3', code: 'KHTN1.3c', content: 'Giải thích được các hiện tượng liên quan đến tốc độ, âm thanh và ánh sáng trong thực tiễn.', level: 'hieu', lop: 7, mach: 'nanglg' },
  { id: 'k7_nanglg_4', code: 'KHTN3.1c', content: 'Tính được tốc độ, quãng đường, thời gian trong bài tập thực tiễn; vẽ được đồ thị s-t đơn giản.', level: 'vanDung', lop: 7, mach: 'nanglg' },

  // --- Mạch: Trái Đất và bầu trời (Lớp 7) ---
  { id: 'k7_tdat_1', code: 'KHTN1.1d', content: 'Nêu được thành phần của khí quyển; mô tả được hiện tượng thời tiết và khí hậu.', level: 'biet', lop: 7, mach: 'tdat' },
  { id: 'k7_tdat_2', code: 'KHTN1.3d', content: 'Giải thích được nguyên nhân gây ra biến đổi khí hậu và ảnh hưởng đến đời sống.', level: 'hieu', lop: 7, mach: 'tdat' },
  { id: 'k7_tdat_3', code: 'KHTN3.1d', content: 'Đề xuất được biện pháp ứng phó biến đổi khí hậu; lập được kế hoạch tiết kiệm năng lượng.', level: 'vanDung', lop: 7, mach: 'tdat' },

  // --- KHTN2: Tìm hiểu thế giới tự nhiên (Lớp 7) ---
  { id: 'k7_2_1', code: 'KHTN2.1', content: 'Đặt được câu hỏi nghiên cứu, xây dựng giả thuyết liên quan đến các hiện tượng khoa học (lớp 7).', level: 'hieu', lop: 7, mach: 'chung' },
  { id: 'k7_2_2', code: 'KHTN2.2', content: 'Lập và thực hiện được kế hoạch tìm hiểu; thu thập, xử lý, trình bày được số liệu (lớp 7).', level: 'vanDung', lop: 7, mach: 'chung' },
];

// =============================================================================
// LỚP 8 – 4 mạch nội dung cốt lõi
// =============================================================================
export const khtn8Indicators = [
  // --- KHTN1: Nhận thức chung (Lớp 8) ---
  { id: 'k8_1_1', code: 'KHTN1.1', content: 'Nhận biết, nêu được các khái niệm, định luật, quy trình khoa học tự nhiên (lớp 8).', level: 'biet', lop: 8, mach: 'chung' },
  { id: 'k8_1_2', code: 'KHTN1.2', content: 'Mô tả, trình bày được cơ chế, quá trình của các đối tượng khoa học tự nhiên (lớp 8).', level: 'biet', lop: 8, mach: 'chung' },
  { id: 'k8_1_3', code: 'KHTN1.3', content: 'Phân tích, giải thích, lập luận được về các vấn đề khoa học tự nhiên (lớp 8).', level: 'hieu', lop: 8, mach: 'chung' },
  { id: 'k8_1_4', code: 'KHTN1.4', content: 'Vận dụng được kiến thức lớp 8 để giải quyết vấn đề và thiết kế giải pháp thực tiễn.', level: 'vanDung', lop: 8, mach: 'chung' },

  // --- Mạch: Chất và sự biến đổi (Lớp 8) ---
  { id: 'k8_chat_1', code: 'KHTN1.1a', content: 'Nêu được khái niệm phản ứng hoá học, dấu hiệu nhận biết phản ứng hoá học; định luật bảo toàn khối lượng.', level: 'biet', lop: 8, mach: 'chat' },
  { id: 'k8_chat_2', code: 'KHTN1.2a', content: 'Viết được phương trình hoá học chữ và PTHH (cân bằng); phân loại được phản ứng (hoá hợp, phân huỷ, thế, trao đổi).', level: 'biet', lop: 8, mach: 'chat' },
  { id: 'k8_chat_3', code: 'KHTN1.3a', content: 'Phân tích được các yếu tố ảnh hưởng đến tốc độ phản ứng hoá học (nhiệt độ, nồng độ, diện tích bề mặt).', level: 'hieu', lop: 8, mach: 'chat' },
  { id: 'k8_chat_4', code: 'KHTN3.1a', content: 'Tính được theo phương trình hoá học (tính khối lượng, thể tích chất phản ứng/sản phẩm).', level: 'vanDung', lop: 8, mach: 'chat' },
  { id: 'k8_chat_5', code: 'KHTN3.2a', content: 'Đề xuất và thực hiện được thí nghiệm về phản ứng hoá học; giải thích hiện tượng xảy ra.', level: 'vanDung', lop: 8, mach: 'chat' },

  // --- Mạch: Vật sống (Lớp 8) ---
  { id: 'k8_vatsong_1', code: 'KHTN1.1b', content: 'Nêu được cấu tạo và chức năng của các cơ quan trong hệ tuần hoàn, hô hấp, tiêu hoá, bài tiết ở người.', level: 'biet', lop: 8, mach: 'vatsong' },
  { id: 'k8_vatsong_2', code: 'KHTN1.2b', content: 'Mô tả được chu trình tim mạch, đường đi của máu; mô tả quá trình hô hấp ngoài và hô hấp trong.', level: 'biet', lop: 8, mach: 'vatsong' },
  { id: 'k8_vatsong_3', code: 'KHTN1.3b', content: 'Giải thích được mối quan hệ cấu tạo – chức năng trong các hệ cơ quan; so sánh được hô hấp và quang hợp.', level: 'hieu', lop: 8, mach: 'vatsong' },
  { id: 'k8_vatsong_4', code: 'KHTN3.1b', content: 'Đề xuất được biện pháp bảo vệ sức khoẻ hệ tuần hoàn, hô hấp, tiêu hoá, bài tiết.', level: 'vanDung', lop: 8, mach: 'vatsong' },
  { id: 'k8_vatsong_5', code: 'KHTN3.2b', content: 'Lập được sơ đồ tư duy tổng hợp các hệ cơ quan ở người; thiết kế mô hình phổi nhân tạo.', level: 'vanDung', lop: 8, mach: 'vatsong' },

  // --- Mạch: Năng lượng (Lớp 8) ---
  { id: 'k8_nanglg_1', code: 'KHTN1.1c', content: 'Nêu được khái niệm lực, áp suất, lực đẩy Archimedes; phát biểu được định luật Pascal.', level: 'biet', lop: 8, mach: 'nanglg' },
  { id: 'k8_nanglg_2', code: 'KHTN1.2c', content: 'Mô tả được tác dụng của lực lên vật; mô tả được nguyên tắc hoạt động của các máy cơ đơn giản.', level: 'biet', lop: 8, mach: 'nanglg' },
  { id: 'k8_nanglg_3', code: 'KHTN1.3c', content: 'Giải thích được hiện tượng nổi, chìm; phân tích được lợi ích của các máy cơ đơn giản trong đời sống.', level: 'hieu', lop: 8, mach: 'nanglg' },
  { id: 'k8_nanglg_4', code: 'KHTN3.1c', content: 'Tính được áp suất, lực đẩy Archimedes trong bài tập thực tiễn; giải thích sự nổi của tàu thuyền, khinh khí cầu.', level: 'vanDung', lop: 8, mach: 'nanglg' },

  // --- Mạch: Trái Đất và bầu trời (Lớp 8) ---
  { id: 'k8_tdat_1', code: 'KHTN1.1d', content: 'Nêu được cấu trúc nội của Trái Đất; mô tả được hiện tượng núi lửa, động đất.', level: 'biet', lop: 8, mach: 'tdat' },
  { id: 'k8_tdat_2', code: 'KHTN1.3d', content: 'Giải thích được nguyên nhân xảy ra núi lửa, động đất dựa trên thuyết kiến tạo mảng.', level: 'hieu', lop: 8, mach: 'tdat' },
  { id: 'k8_tdat_3', code: 'KHTN3.1d', content: 'Đề xuất được biện pháp ứng phó với thiên tai từ kiến thức về cấu trúc Trái Đất và địa chất.', level: 'vanDung', lop: 8, mach: 'tdat' },

  // --- KHTN2: Tìm hiểu thế giới tự nhiên (Lớp 8) ---
  { id: 'k8_2_1', code: 'KHTN2.1', content: 'Đề xuất vấn đề, xây dựng giả thuyết, thiết kế phương án thí nghiệm khoa học (lớp 8).', level: 'hieu', lop: 8, mach: 'chung' },
  { id: 'k8_2_2', code: 'KHTN2.2', content: 'Sử dụng được công cụ số hoá (AI, phần mềm) để xử lý và trình bày kết quả thực nghiệm KHTN (lớp 8).', level: 'vanDung', lop: 8, mach: 'chung' },
];

// =============================================================================
// LỚP 9 – 4 mạch nội dung cốt lõi
// =============================================================================
export const khtn9Indicators = [
  // --- KHTN1: Nhận thức chung (Lớp 9) ---
  { id: 'k9_1_1', code: 'KHTN1.1', content: 'Nhận biết, nêu được các khái niệm, định luật, quy luật khoa học tự nhiên phức tạp hơn (lớp 9).', level: 'biet', lop: 9, mach: 'chung' },
  { id: 'k9_1_2', code: 'KHTN1.2', content: 'Mô tả, trình bày được cơ chế và quá trình của các đối tượng khoa học tự nhiên ở mức độ cao hơn (lớp 9).', level: 'biet', lop: 9, mach: 'chung' },
  { id: 'k9_1_3', code: 'KHTN1.3', content: 'Phân tích, lập luận, đánh giá được các vấn đề khoa học tự nhiên có tính hệ thống (lớp 9).', level: 'hieu', lop: 9, mach: 'chung' },
  { id: 'k9_1_4', code: 'KHTN1.4', content: 'Vận dụng kiến thức lớp 9 để giải quyết vấn đề mở rộng; đánh giá, phản biện được giải pháp đề xuất.', level: 'vanDung', lop: 9, mach: 'chung' },

  // --- Mạch: Chất và sự biến đổi (Lớp 9) ---
  { id: 'k9_chat_1', code: 'KHTN1.1a', content: 'Nêu được khái niệm, tính chất của axit, bazơ, muối, oxit; bảng tuần hoàn các nguyên tố hoá học.', level: 'biet', lop: 9, mach: 'chat' },
  { id: 'k9_chat_2', code: 'KHTN1.2a', content: 'Mô tả được tính chất hoá học của các loại hợp chất vô cơ; viết được PTHH biểu diễn tính chất.', level: 'biet', lop: 9, mach: 'chat' },
  { id: 'k9_chat_3', code: 'KHTN1.3a', content: 'Giải thích được quy luật biến đổi tính chất các nguyên tố qua bảng tuần hoàn; xác định tính axit – bazơ qua pH.', level: 'hieu', lop: 9, mach: 'chat' },
  { id: 'k9_chat_4', code: 'KHTN3.1a', content: 'Giải được bài toán hoá học định lượng (nồng độ mol, % khối lượng, thể tích dung dịch).', level: 'vanDung', lop: 9, mach: 'chat' },
  { id: 'k9_chat_5', code: 'KHTN3.2a', content: 'Thiết kế được thí nghiệm kiểm chứng tính chất hoá học; đề xuất ứng dụng trong thực tiễn sản xuất, đời sống.', level: 'vanDung', lop: 9, mach: 'chat' },

  // --- Mạch: Vật sống (Lớp 9) ---
  { id: 'k9_vatsong_1', code: 'KHTN1.1b', content: 'Nêu được quy luật di truyền của Mendel; cấu trúc AND, ARN và cơ chế tổng hợp protein.', level: 'biet', lop: 9, mach: 'vatsong' },
  { id: 'k9_vatsong_2', code: 'KHTN1.2b', content: 'Mô tả được chuỗi xoắn kép AND; mô tả quá trình nguyên phân, giảm phân ở cấp độ đơn giản.', level: 'biet', lop: 9, mach: 'vatsong' },
  { id: 'k9_vatsong_3', code: 'KHTN1.3b', content: 'Giải thích được cơ chế di truyền, biến dị; phân tích được ứng dụng di truyền học trong y học, nông nghiệp.', level: 'hieu', lop: 9, mach: 'vatsong' },
  { id: 'k9_vatsong_4', code: 'KHTN3.1b', content: 'Giải được bài tập di truyền quy luật Mendel; xác định kiểu gen, kiểu hình ở các thế hệ.', level: 'vanDung', lop: 9, mach: 'vatsong' },
  { id: 'k9_vatsong_5', code: 'KHTN3.2b', content: 'Phân tích được đạo đức sinh học trong nghiên cứu gen; đề xuất ứng dụng công nghệ gen có trách nhiệm.', level: 'vanDung', lop: 9, mach: 'vatsong' },

  // --- Mạch: Năng lượng (Lớp 9) ---
  { id: 'k9_nanglg_1', code: 'KHTN1.1c', content: 'Nêu được khái niệm năng lượng tái tạo (năng lượng mặt trời, gió, nước, địa nhiệt, sinh khối); định luật bảo toàn năng lượng.', level: 'biet', lop: 9, mach: 'nanglg' },
  { id: 'k9_nanglg_2', code: 'KHTN1.2c', content: 'Mô tả được nguyên lý hoạt động của pin mặt trời, tua-bin gió; mô tả sự chuyển hoá năng lượng trong các quá trình.', level: 'biet', lop: 9, mach: 'nanglg' },
  { id: 'k9_nanglg_3', code: 'KHTN1.3c', content: 'Phân tích được ưu điểm, hạn chế của từng loại năng lượng tái tạo; so sánh với năng lượng hoá thạch.', level: 'hieu', lop: 9, mach: 'nanglg' },
  { id: 'k9_nanglg_4', code: 'KHTN3.1c', content: 'Tính được công suất, hiệu suất, điện năng tiêu thụ; giải bài tập thực tiễn về năng lượng xanh.', level: 'vanDung', lop: 9, mach: 'nanglg' },
  { id: 'k9_nanglg_5', code: 'KHTN3.2c', content: 'Thiết kế được mô hình tua-bin gió/pin mặt trời mini; đề xuất giải pháp sử dụng năng lượng tiết kiệm.', level: 'vanDung', lop: 9, mach: 'nanglg' },

  // --- Mạch: Trái Đất và bầu trời (Lớp 9) ---
  { id: 'k9_tdat_1', code: 'KHTN1.1d', content: 'Nêu được đặc điểm của Hệ Mặt Trời; mô tả được chuyển động của các hành tinh.', level: 'biet', lop: 9, mach: 'tdat' },
  { id: 'k9_tdat_2', code: 'KHTN1.3d', content: 'Giải thích được hiện tượng nhật thực, nguyệt thực, thuỷ triều dựa trên cơ học thiên thể cơ bản.', level: 'hieu', lop: 9, mach: 'tdat' },
  { id: 'k9_tdat_3', code: 'KHTN3.1d', content: 'Lập được sơ đồ Hệ Mặt Trời; sử dụng được công cụ quan sát thiên văn hoặc mô phỏng số hoá.', level: 'vanDung', lop: 9, mach: 'tdat' },

  // --- KHTN2: Tìm hiểu thế giới tự nhiên (Lớp 9) ---
  { id: 'k9_2_1', code: 'KHTN2.1', content: 'Đề xuất vấn đề nghiên cứu, xây dựng giả thuyết và đánh giá được giả thuyết khoa học (lớp 9).', level: 'hieu', lop: 9, mach: 'chung' },
  { id: 'k9_2_2', code: 'KHTN2.2', content: 'Sử dụng được AI để hỗ trợ xây dựng ý tưởng dự án NCKHKT và mô hình STEM; trình bày được báo cáo khoa học (lớp 9).', level: 'vanDung', lop: 9, mach: 'chung' },
];

// =============================================================================
// GỘP TẤT CẢ chỉ số cho việc tìm kiếm toàn cục
// =============================================================================
export const khtnAllIndicators = [
  ...khtn6Indicators,
  ...khtn7Indicators,
  ...khtn8Indicators,
  ...khtn9Indicators,
];

// =============================================================================
// MAP theo khối lớp để tra cứu nhanh
// =============================================================================
export const khtnIndicatorsByLop = {
  6: khtn6Indicators,
  7: khtn7Indicators,
  8: khtn8Indicators,
  9: khtn9Indicators,
};

// =============================================================================
// NHÓM NĂNG LỰC theo khối lớp (dùng trong panel chọn chỉ số)
// =============================================================================
const makeGroupsByLop = (indicators) => ({
  KHTN1: {
    name: 'Nhận thức khoa học tự nhiên',
    color: 'blue',
    indicators: indicators.filter(i => i.code.startsWith('KHTN1')),
  },
  KHTN2: {
    name: 'Tìm hiểu thế giới tự nhiên',
    color: 'green',
    indicators: indicators.filter(i => i.code.startsWith('KHTN2')),
  },
  KHTN3: {
    name: 'Vận dụng kiến thức, kĩ năng',
    color: 'orange',
    indicators: indicators.filter(i => i.code.startsWith('KHTN3')),
  },
});

export const khtnCompetencyGroupsByLop = {
  6: makeGroupsByLop(khtn6Indicators),
  7: makeGroupsByLop(khtn7Indicators),
  8: makeGroupsByLop(khtn8Indicators),
  9: makeGroupsByLop(khtn9Indicators),
};

// Mặc định (dùng khi chưa chọn lớp)
export const khtnCompetencyGroups = khtnCompetencyGroupsByLop[8];

// =============================================================================
// HÀM TÌM KIẾM
// =============================================================================
export const searchKhtnIndicators = (text, lop = null) => {
  const source = lop ? (khtnIndicatorsByLop[Number(lop)] || khtnAllIndicators) : khtnAllIndicators;
  if (!text || text.trim() === '') return [];
  const lower = text.toLowerCase();
  return source.filter(i =>
    i.code.toLowerCase().includes(lower) ||
    i.content.toLowerCase().includes(lower)
  ).slice(0, 20);
};

// =============================================================================
// CÁC HẰNG SỐ MẠCH NỘI DUNG
// =============================================================================
export const KHTN_MACH_LIST = [
  { value: 'chung', label: 'Chung (năng lực cốt lõi)' },
  { value: 'chat', label: 'Chất và sự biến đổi của chất' },
  { value: 'nanglg', label: 'Năng lượng và sự biến đổi' },
  { value: 'vatsong', label: 'Vật sống' },
  { value: 'tdat', label: 'Trái Đất và bầu trời' },
];
