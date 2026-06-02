// src/utils/prompt_generator.js
// Module sinh prompt để gửi sang AI (Gemini/ChatGPT) tạo câu hỏi tương tự hoặc đề tương đương

export const STYLE_DICTIONARY = {
  thuc_te:         'BẮT BUỘC lồng ghép bối cảnh thực tế đời sống (như mua sắm, tính tiền, đo đạc, khoa học) vào câu hỏi.',
  lien_mon:        'BẮT BUỘC tích hợp dữ kiện liên môn (như Lịch sử, Địa lý Việt Nam, Văn học) vào bài toán.',
  hai_huoc:        'Hãy thiết kế câu hỏi với tình huống hài hước, dí dỏm, sử dụng tên các nhân vật đang bắt trend trên mạng xã hội hoặc truyện tranh.',
  thuan_tinh_toan: 'Đây là câu hỏi thuần tính toán, kiểm tra kỹ năng biến đổi. KHÔNG cần lồng ghép lời văn thực tế.',
};

export const GRAPH_PROMPT_GUIDELINES = `
📈 HƯỚNG DẪN TẠO HÌNH ẢNH MINH HỌA (BẮT BUỘC ÁP DỤNG KHI CÓ HÌNH VẼ/ĐỒ THỊ/BIỂU ĐỒ):
Nếu câu hỏi mới hoặc phần lời giải có liên quan đến khảo sát hàm số, đồ thị, hình học hoặc biểu đồ số liệu, PHẢI tự động sinh một thẻ "Hình ảnh:" chứa JSON minh họa ở cuối phần giải thích (sau dòng "Giải thích:"). Hệ thống sẽ tự động vẽ hình bằng Python Matplotlib.
Các loại hỗ trợ và mẫu JSON:
1️⃣ TOÁN — Đồ thị hàm số (cực trị, tiệm cận, khảo sát...):
Hình ảnh: {"loai":"do_thi_ham_so","hamSo":"x**3 - 3*x","xRange":[-4,4],"tieuDe":"y = x³ - 3x","diemDacBiet":[{"x":-1,"y":2,"nhan":"CĐ(-1;2)"},{"x":1,"y":-2,"nhan":"CT(1;-2)"}]}
2️⃣ TOÁN — Hình học Oxy (tam giác, đường tròn, tọa độ...):
Hình ảnh: {"loai":"hinh_hoc_oxy","tieuDe":"Tam giác ABC","xRange":[-1,6],"yRange":[-1,5],"diem":[{"x":0,"y":0,"nhan":"A"},{"x":5,"y":0,"nhan":"B"},{"x":2,"y":4,"nhan":"C"}],"doanThang":[{"x1":0,"y1":0,"x2":5,"y2":0},{"x1":5,"y1":0,"x2":2,"y2":4},{"x1":2,"y1":4,"x2":0,"y2":0}]}
3️⃣ TOÁN — Histogram thống kê (phân bố điểm, tần số...):
Hình ảnh: {"loai":"histogram","tieuDe":"Phân bố điểm thi","nhanX":"Điểm","nhanY":"Số HS","duLieu":[3,4,5,5,6,6,6,7,7,7,7,8,8,9,10],"soCot":8}
4️⃣ VẬT LÝ — Đồ thị v-t, s-t, U-I, P-V (đoạn thẳng nối tiếp):
Hình ảnh: {"loai":"do_thi_vat_ly","tieuDe":"Đồ thị v-t","nhanX":"t (s)","nhanY":"v (m/s)","doanThang":[{"x1":0,"y1":0,"x2":5,"y2":20},{"x1":5,"y1":20,"x2":10,"y2":20},{"x1":10,"y1":20,"x2":15,"y2":0}],"diemDacBiet":[{"x":5,"y":20,"nhan":"A(5;20)"}]}
5️⃣ ĐỊA LÝ / SINH / HÓA / SỬ / CÔNG NGHỆ / TIN — Biểu đồ cột:
Hình ảnh: {"loai":"bieu_do_cot","tieuDe":"Dân số ĐNÁ 2023","nhanX":"Quốc gia","nhanY":"Triệu người","nhan":["VN","Thái Lan","Indonesia"],"giaTri":[100,72,275]}
6️⃣ ĐỊA LÝ / SINH / HÓA / SỬ — Biểu đồ đường (so sánh xu hướng):
Hình ảnh: {"loai":"bieu_do_duong","tieuDe":"GDP 2018-2023","nhanX":"Năm","nhanY":"Tỷ USD","nhan":["2018","2019","2020","2021","2022","2023"],"chuoiDuLieu":[{"ten":"VN","giaTri":[245,262,271,366,409,430]}]}
7️⃣ ĐỊA LÝ / SINH / HÓA — Biểu đồ tròn (cơ cấu, tỉ lệ %):
Hình ảnh: {"loai":"bieu_do_tron","tieuDe":"Cơ cấu kinh tế VN","nhan":["Nông nghiệp","Công nghiệp","Dịch vụ"],"giaTri":[12,38,50]}
⚠️ QUY TẮC QUAN TRỌNG: Trường "hamSo" dùng cú pháp Python (x**2, np.sin(x), np.sqrt(x)).
`;

/**
 * Sinh prompt cho AI tạo câu hỏi tương tự.
 * @param {Object} slotData  - Dữ liệu câu hỏi gốc từ examSlots
 * @param {Object} metaInfo  - { topic, dvkt, level, loaiCauHoi, diem, diemA, diemB, diemC, indicators, monHoc, namHoc }
 * @param {Object} options   - { phongCach, soLuong, yeuCauThem, cauKhacList }
 * @returns {string} Prompt text để dán vào Gemini
 */
export function generateSimilarQuestionPrompt(slotData, metaInfo, options = {}) {
  const { topic, dvkt, level, diem, diemA, diemB, diemC, indicators = [], monHoc, namHoc, kienThuc } = metaInfo;
  const { phongCach, soLuong = 1, yeuCauThem, cauKhacList = [] } = options;

  const loai = slotData.loaiCauHoi || metaInfo.loaiCauHoi || 1;
  const isMultiY = loai === 4 && Boolean(slotData.yB);
  const soLuongVal = Math.min(Math.max(parseInt(soLuong) || 1, 1), 3);

  // ──────────────────────────────────────────
  // MỞ ĐẦU
  // ──────────────────────────────────────────
  let prompt = `Bạn là một chuyên gia ra đề thi xuất sắc bám sát Chương trình GDPT 2018.\n`;
  prompt += `Hãy tạo ${soLuongVal > 1 ? soLuongVal + ' CÂU HỎI TƯƠNG TỰ' : '1 CÂU HỎI TƯƠNG TỰ'} với câu hỏi gốc dưới đây.\n\n`;

  // Thông tin đề thi
  if (monHoc || namHoc) {
    prompt += `📚 THÔNG TIN ĐỀ THI:\n`;
    if (monHoc) prompt += `- Môn học: ${monHoc}\n`;
    if (namHoc) prompt += `- Năm học: ${namHoc}\n`;
    prompt += `\n`;
  }

  // ──────────────────────────────────────────
  // YÊU CẦU BẮT BUỘC
  // ──────────────────────────────────────────
  prompt += `⚠️ YÊU CẦU BẮT BUỘC:\n`;
  prompt += `- Câu hỏi mới phải CÙNG MỨC ĐỘ NHẬN THỨC: "${level}"\n`;
  if (dvkt) prompt += `- Câu hỏi mới phải CÙNG ĐƠN VỊ KIẾN THỨC: "${dvkt}"\n`;
  prompt += `- Câu hỏi mới phải CÙNG CHỦ ĐỀ: "${topic}"\n`;
  prompt += `- Thay đổi số liệu, dữ kiện, tình huống nhưng GIỮ NGUYÊN độ khó và dạng bài tập.\n`;
  prompt += `- BẢO TOÀN 100% định dạng LaTeX ($...$ và $$...$$). Không được bỏ sót.\n`;
  prompt += `- Với công thức Hóa học, Vật lý đơn giản: SỬ DỤNG ký tự UNICODE (H₂SO₄, Fe²⁺, α, Δt). Không dùng mã code/LaTeX cho loại này.\n`;
  prompt += `- TUYỆT ĐỐI KHÔNG dùng LaTeX cho mũi tên phản ứng hóa học (->, =>, <=>), ký hiệu nhiệt độ (°C, ^oC).\n`;

  // Yêu cầu phương án nhiễu loại 1
  if (loai === 1) {
    prompt += `- CÁC PHƯƠNG ÁN SAI (B, C, D hoặc phương án không phải đáp án đúng) phải có tính "bẫy": mỗi phương án sai tương ứng với một lỗi tính toán thường gặp (nhầm dấu, bỏ sót điều kiện, sai bước cuối, áp dụng sai công thức). TUYỆT ĐỐI không để phương án sai quá dễ nhận ra.\n`;
  }

  prompt += `- BẮT BUỘC VẼ HÌNH: Nếu câu hỏi mới hoặc phần lời giải có liên quan đến khảo sát hàm số, đồ thị, hình học hoặc biểu đồ số liệu, PHẢI tự động sinh một thẻ "Hình ảnh:" chứa JSON minh họa ở cuối phần giải thích (sau dòng "Giải thích:").\n`;

  // Hình ảnh gốc
  if (slotData.hinhAnh && slotData.hinhAnh.loai) {
    prompt += `- Câu gốc có metadata hình ảnh (loai: "${slotData.hinhAnh.loai}"). Câu mới BẮT BUỘC sinh lại "Hình ảnh:" JSON tương đương, chỉ thay đổi tham số cho khớp đề mới.\n`;
  }

  // Mã năng lực nếu có
  if (indicators && indicators.length > 0) {
    prompt += `- Câu hỏi phải KIỂM TRA ĐÚNG CÁC NĂNG LỰC: ${indicators.join(', ')} (giữ nguyên như câu gốc).\n`;
  }

  // Lĩnh vực kiến thức Toán
  if (kienThuc === 'hinh_hoc') {
    prompt += `- Câu hỏi BẮT BUỘC thuộc lĩnh vực HÌNH HỌC (hình học phẳng, hình không gian, tọa độ, hình học giải tích...). TUYỆT ĐỐI không ra câu đại số hay giải tích thuần túy.\n`;
  } else if (kienThuc === 'dai_so') {
    prompt += `- Câu hỏi BẮT BUỘC thuộc lĩnh vực ĐẠI SỐ / GIẢI TÍCH (hàm số, phương trình, bất phương trình, tích phân, số phức...). TUYỆT ĐỐI không ra câu hình học.\n`;
  }

  // Phong cách ra đề nếu có
  if (phongCach) {
    prompt += `\n🎨 PHONG CÁCH RA ĐỀ BẮT BUỘC:\n- ${phongCach}\n`;
  }

  // Yêu cầu thêm của giáo viên
  if (yeuCauThem && yeuCauThem.trim()) {
    prompt += `\n📝 YÊU CẦU RIÊNG CỦA GIÁO VIÊN:\n- ${yeuCauThem.trim()}\n`;
  }

  // Tránh trùng lặp với câu khác
  if (cauKhacList && cauKhacList.length > 0) {
    prompt += `\n🚫 TRÁNH TRÙNG LẶP — Đề hiện tại đã có các câu sau, KHÔNG được dùng cùng số liệu, tình huống hoặc cách hỏi:\n`;
    cauKhacList.forEach((nd, i) => {
      prompt += `  ${i + 1}. ${nd}\n`;
    });
  }

  // ──────────────────────────────────────────
  // CÂU HỎI GỐC
  // ──────────────────────────────────────────
  prompt += `\n📌 CÂU HỎI GỐC (Loại ${loai}):\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (loai === 1) {
    prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): ${slotData.noiDung || ''}\n`;
    prompt += `A. ${slotData.dapAnA || ''}\n`;
    prompt += `B. ${slotData.dapAnB || ''}\n`;
    prompt += `C. ${slotData.dapAnC || ''}\n`;
    prompt += `D. ${slotData.dapAnD || ''}\n`;
    prompt += `Đáp án đúng: ${slotData.dapAnDung || ''}\n`;
    if (slotData.giaiThich) prompt += `Giải thích: ${slotData.giaiThich}\n`;
  } else if (loai === 2) {
    prompt += `Câu 1 (Chủ đề: ${topic}): ${slotData.noiDung || ''}\n`;
    prompt += `a) (Mức độ: Nhận biết) ${slotData.yA || ''}\n`;
    prompt += `b) (Mức độ: Thông hiểu) ${slotData.yB || ''}\n`;
    prompt += `c) (Mức độ: Vận dụng) ${slotData.yC || ''}\n`;
    prompt += `d) (Mức độ: Vận dụng cao) ${slotData.yD || ''}\n`;
    prompt += `Đáp án đúng: ${slotData.dapAnDung || ''}\n`;
    if (slotData.giaiThich) prompt += `Giải thích: ${slotData.giaiThich}\n`;
  } else if (loai === 3) {
    prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): ${slotData.noiDung || ''}\n`;
    prompt += `Đáp án đúng: ${slotData.dapAnDung || ''}\n`;
    if (slotData.giaiThich) prompt += `Giải thích: ${slotData.giaiThich}\n`;
  } else if (loai === 4) {
    if (isMultiY) {
      const cauDanChung = slotData.noiDung || '';
      prompt += `Câu 1 (Chủ đề: ${topic})${cauDanChung ? ': ' + cauDanChung : ''}\n`;
      if (slotData.yA) prompt += `a) (Mức độ: ${level}${diemA ? ', ' + diemA + 'đ' : ''}) ${slotData.yA}\n`;
      if (slotData.yB) prompt += `b) ${slotData.yB}${diemB ? ' (' + diemB + 'đ)' : ''}\n`;
      if (slotData.yC) prompt += `c) ${slotData.yC}${diemC ? ' (' + diemC + 'đ)' : ''}\n`;
      prompt += `Đáp án đúng và biểu điểm:\n`;
      if (slotData.dapAnA) prompt += `Ý a:\n${slotData.dapAnA}\n`;
      if (slotData.dapAnB) prompt += `Ý b:\n${slotData.dapAnB}\n`;
      if (slotData.dapAnC) prompt += `Ý c:\n${slotData.dapAnC}\n`;
    } else {
      const noiDungGoc = slotData.yA || slotData.noiDung || '';
      prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): ${noiDungGoc}\n`;
      if (slotData.dapAnA) {
        prompt += `Đáp án đúng và biểu điểm:\n`;
        prompt += `${slotData.dapAnA}\n`;
      }
    }
    if (slotData.giaiThich) prompt += `Giải thích: ${slotData.giaiThich}\n`;
  }

  if (slotData.hinhAnh && slotData.hinhAnh.loai) {
    prompt += `Hình ảnh: ${JSON.stringify(slotData.hinhAnh)}\n`;
  }

  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // ──────────────────────────────────────────
  // YÊU CẦU TRÌNH BÀY ĐẦU RA
  // ──────────────────────────────────────────
  prompt += GRAPH_PROMPT_GUIDELINES + `\n`;
  prompt += `📝 YÊU CẦU TRÌNH BÀY ${soLuongVal > 1 ? soLuongVal + ' CÂU HỎI MỚI' : 'CÂU HỎI MỚI'}:\n`;
  if (soLuongVal > 1) {
    prompt += `⚠️ Sinh ra đúng ${soLuongVal} câu hỏi độc lập (Câu 1, Câu 2${soLuongVal > 2 ? ', Câu 3' : ''}), mỗi câu có số liệu/tình huống KHÁC NHAU hoàn toàn.\n`;
  }
  prompt += `Hãy viết câu hỏi mới theo ĐÚNG định dạng bên dưới:\n\n`;

  // Template output theo loại
  const templatePrefix = soLuongVal > 1 ? '[Lặp lại cấu trúc dưới đây cho từng câu, đánh số Câu 1, Câu 2...]\n' : '';

  if (loai === 1) {
    prompt += templatePrefix;
    prompt += `[LOẠI 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN]\n`;
    if (slotData.dapAnDung) {
      prompt += `⚠️ BẮT BUỘC: ĐÁP ÁN ĐÚNG VẪN LÀ PHƯƠNG ÁN [${slotData.dapAnDung}].\n`;
    }
    prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): [Nội dung câu hỏi mới]\n`;
    prompt += `A. [Lựa chọn A]\n`;
    prompt += `B. [Lựa chọn B]\n`;
    prompt += `C. [Lựa chọn C]\n`;
    prompt += `D. [Lựa chọn D]\n`;
    prompt += `Đáp án đúng: [Chỉ ghi chữ cái A, B, C hoặc D]\n`;
    prompt += `Giải thích: [Giải thích từng phương án — nêu rõ tại sao đáp án đúng và tại sao từng phương án sai]\n`;
  } else if (loai === 2) {
    prompt += templatePrefix;
    prompt += `[LOẠI 2: TRẮC NGHIỆM ĐÚNG/SAI — CHÙM CÂU HỎI]\n`;
    if (slotData.dapAnDung) {
      prompt += `⚠️ BẮT BUỘC: Chuỗi đúng/sai VẪN LÀ [${slotData.dapAnDung}] giống câu gốc.\n`;
    }
    prompt += `⚠️ QUY TẮC CẤU TRÚC 4 MỆNH ĐỀ: Ý a) mức Nhận biết, ý b) mức Thông hiểu, ý c) mức Vận dụng, ý d) mức Vận dụng cao. Hãy tuân thủ đúng trật tự này.\n`;
    prompt += `Câu 1 (Chủ đề: ${topic}): [Nội dung đề bài chung mới]\n`;
    prompt += `a) (Mức độ: Nhận biết) [Mệnh đề a mới]\n`;
    prompt += `b) (Mức độ: Thông hiểu) [Mệnh đề b mới]\n`;
    prompt += `c) (Mức độ: Vận dụng) [Mệnh đề c mới]\n`;
    prompt += `d) (Mức độ: Vận dụng cao) [Mệnh đề d mới]\n`;
    prompt += `Đáp án đúng: a-[Đ hoặc S], b-[Đ hoặc S], c-[Đ hoặc S], d-[Đ hoặc S]\n`;
    prompt += `Giải thích: [Giải thích ngắn gọn]\n`;
  } else if (loai === 3) {
    prompt += templatePrefix;
    prompt += `[LOẠI 3: TRẢ LỜI NGẮN]\n`;
    prompt += `⚠️ Đáp án phải là MỘT CON SỐ CỤ THỂ (tối đa 4 chữ số).\n`;
    prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): [Nội dung câu hỏi mới]\n`;
    prompt += `Đáp án đúng: [CHỈ GHI 1 CON SỐ]\n`;
    prompt += `Giải thích: [Cách giải chi tiết]\n`;
  } else if (loai === 4) {
    prompt += templatePrefix;
    prompt += `[LOẠI 4: TỰ LUẬN]\n`;
    if (isMultiY) {
      prompt += `Câu 1 (Chủ đề: ${topic}): [Câu dẫn chung / đề bài chung]\n`;
      prompt += `a) (Mức độ: ${level}) [Nội dung ý a]\n`;
      if (slotData.yB) prompt += `b) [Nội dung ý b]\n`;
      if (slotData.yC) prompt += `c) [Nội dung ý c]\n`;
      prompt += `Đáp án đúng và biểu điểm:\n`;
      prompt += `Ý a:\n`;
      prompt += `+ [Bước giải ý a chi tiết] || ${diemA ? diemA + 'đ' : '[Điểm]'}\n`;
      if (slotData.yB) {
        prompt += `Ý b:\n`;
        prompt += `+ [Bước giải ý b chi tiết] || ${diemB ? diemB + 'đ' : '[Điểm]'}\n`;
      }
      if (slotData.yC) {
        prompt += `Ý c:\n`;
        prompt += `+ [Bước giải ý c chi tiết] || ${diemC ? diemC + 'đ' : '[Điểm]'}\n`;
      }
      if (diem) prompt += `⚠️ Tổng điểm tất cả các ý phải = ${diem} điểm.\n`;
    } else {
      prompt += `Câu 1 (Mức độ: ${level}, Chủ đề: ${topic}): [Nội dung câu hỏi mới]\n`;
      prompt += `Đáp án đúng và biểu điểm:\n`;
      prompt += `+ [Bước 1 chi tiết] || [Điểm]\n`;
      prompt += `+ [Bước 2 chi tiết] || [Điểm]\n`;
      if (diem) prompt += `⚠️ Tổng điểm các bước phải = ${diem} điểm.\n`;
    }
    prompt += `Giải thích: [Ngắn gọn]\n`;
  }

  if (slotData.hinhAnh && slotData.hinhAnh.loai) {
    prompt += `\n🖼️ Câu mới PHẢI có dòng "Hình ảnh:" kèm JSON metadata tương tự.\n`;
    prompt += `Ví dụ: Hình ảnh: {"loai":"${slotData.hinhAnh.loai}",...}\n`;
  }

  prompt += `\n⚠️ CHỈ VIẾT ${soLuongVal > 1 ? soLuongVal + ' CÂU HỎI' : '1 CÂU HỎI'} THEO ĐÚNG FORMAT TRÊN. KHÔNG viết thêm lời chào hay giải thích ngoài lề.\n`;

  return prompt;
}

/**
 * Sinh prompt cho AI tạo một Đề thi mới tương đương (Đề số 2) dựa trên Đề hiện tại.
 * Hỗ trợ tính năng "Khóa" các câu muốn giữ lại.
 * @param {Array} examSlotsList - Danh sách các câu hỏi hiện tại trong Khung Đề (đã được sort theo thứ tự)
 * @param {Array} lockedSlots - Danh sách các slotKey bị khóa (muốn giữ nguyên)
 * @returns {string} Prompt text để dán vào Gemini
 */
export function generateFullEquivalentExamPrompt(examSlotsList, lockedSlots) {
  let prompt = `Bạn là một chuyên gia ra đề thi xuất sắc. Dưới đây là nội dung của một ĐỀ THI MẪU (Đề số 1).\n`;
  prompt += `Nhiệm vụ của bạn là dựa vào cấu trúc và mức độ khó của đề mẫu này, tạo ra một ĐỀ THI MỚI (Đề số 2) tương đương 100% về cấu trúc, độ phân hóa và định dạng.\n\n`;

  prompt += `⚠️ QUY TẮC TRÌNH BÀY CÔNG THỨC TOÁN/LÝ/HÓA (BẮT BUỘC):\n`;
  prompt += `- CÔNG THỨC TOÁN/HÓA PHỨC TẠP (phân số, căn thức, hệ phương trình, tích phân...): Mới sử dụng mã LaTeX và BẮT BUỘC bọc trong cặp dấu $...$ (ví dụ: $\\frac{1}{2}$) hoặc $$...$$ cho công thức đứng 1 dòng.\n`;
  prompt += `- Với công thức Hóa học, Vật lý đơn giản: SỬ DỤNG ký tự UNICODE (Ví dụ: H₂SO₄, Fe²⁺, α, Δt). Tuyệt đối không dùng mã code/LaTeX cho loại này.\n`;
  prompt += `- TUYỆT ĐỐI KHÔNG dùng định dạng LaTeX ($...$) cho các mũi tên phản ứng hóa học (->, =>, <=>), ký hiệu nhiệt độ (°C, ^oC). Bắt buộc viết chúng dưới dạng text thường.\n\n`;

  prompt += `⚠️ QUY TẮC CƠ BẢN (BẮT BUỘC TUÂN THỦ):\n`;
  prompt += `1. BẢO TOÀN ĐỊNH DẠNG: Giữ nguyên cách đánh số "Câu 1:", "A.", "B.", "a)", "b)", "Đáp án đúng:", "Giải thích:".\n`;
  prompt += `2. BẢO TOÀN CÔNG THỨC: Phải giữ nguyên định dạng LaTeX và Unicode theo quy tắc trên. Không tự ý thay đổi.\n`;
  prompt += `3. NẾU CÂU GỐC CÓ CHỨA "Hình ảnh: {"loai":...}": Bắt buộc câu mới cũng phải có thẻ Hình ảnh JSON tương ứng, chỉ thay đổi các hệ số bên trong JSON cho khớp với bài toán mới.\n`;
  prompt += `4. BẢO TOÀN LOẠI CÂU HỎI: Câu nào là Trắc nghiệm nhiều lựa chọn thì sinh mới Trắc nghiệm nhiều lựa chọn. Câu nào là Đúng/Sai thì sinh mới Đúng/Sai (gồm 4 ý a,b,c,d). Câu tự luận có bao nhiêu ý thì sinh ra bấy nhiêu ý.\n`;
  prompt += `5. BẮT BUỘC VẼ HÌNH: NẾU lời giải của bất kỳ bài toán nào có chứa hàm số, đồ thị, hình học hoặc biểu đồ: BẮT BUỘC phải sinh ra một thẻ "Hình ảnh:" chứa JSON minh họa ở cuối phần giải thích.\n`;
  prompt += `6. ĐÚNG/SAI (LOẠI 2) PHÂN PHỐI MỨC ĐỘ: Với mỗi câu Đúng/Sai mới, bắt buộc mệnh đề a) mức Nhận biết, ý b) mức Thông hiểu, ý c) mức Vận dụng, ý d) mức Vận dụng cao.\n`;
  prompt += `7. BẢO TOÀN BIỂU ĐIỂM TỰ LUẬN: Đối với các ý của câu tự luận, các bước giải chi tiết và điểm số tương ứng (ví dụ: || 0.25) phải được bảo toàn khớp với tổng điểm của câu đó.\n`;
  prompt += `8. BẢO TOÀN LĨNH VỰC HỌC TẬP (Hình học / Đại số): Ở phần tự luận, nếu câu hỏi ghi rõ [Lĩnh vực: Hình học] hoặc [Lĩnh vực: Đại số/Giải tích], đề thi tương đương mới BẮT BUỘC phải ra câu hỏi thuộc đúng lĩnh vực đó, không được đổi ngược hoặc bỏ qua.\n\n`;

  prompt += GRAPH_PROMPT_GUIDELINES + `\n`;

  prompt += `=================================================\n`;
  prompt += `NỘI DUNG ĐỀ THI MẪU (ĐỀ SỐ 1):\n`;
  prompt += `=================================================\n\n`;

  let cauIndex = 1;
  let currentPhan = 0;

  for (const slot of examSlotsList) {
    const q = slot.data;
    if (!q || !q.loaiCauHoi) continue;

    if (q.loaiCauHoi !== currentPhan) {
      if (q.loaiCauHoi === 1) prompt += `[PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN]\n`;
      if (q.loaiCauHoi === 2) prompt += `\n[PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI]\n`;
      if (q.loaiCauHoi === 3) prompt += `\n[PHẦN III: TRẢ LỜI NGẮN]\n`;
      if (q.loaiCauHoi === 4) prompt += `\n[PHẦN TỰ LUẬN]\n`;
      currentPhan = q.loaiCauHoi;
      cauIndex = 1;
    }

    const isLocked = lockedSlots.includes(slot.key);
    if (isLocked) {
      prompt += `[BẮT BUỘC GIỮ NGUYÊN 100% NỘI DUNG, KHÔNG ĐƯỢC ĐỔI BẤT CỨ CHỮ NÀO ĐỐI VỚI CÂU NÀY]\n`;
    }

    if (q.loaiCauHoi === 1) {
      if (!isLocked && q.dapAnDung) {
        prompt += `[⚠️ LƯU Ý: ĐÁP ÁN ĐÚNG VẪN LÀ PHƯƠNG ÁN ${q.dapAnDung}]\n`;
      }
      prompt += `Câu ${cauIndex}: ${q.noiDung || ''}\n`;
      prompt += `A. ${q.dapAnA || ''}\n`;
      prompt += `B. ${q.dapAnB || ''}\n`;
      prompt += `C. ${q.dapAnC || ''}\n`;
      prompt += `D. ${q.dapAnD || ''}\n`;
      prompt += `Đáp án đúng: ${q.dapAnDung || ''}\n`;
      if (q.giaiThich) prompt += `Giải thích: ${q.giaiThich}\n`;
    } else if (q.loaiCauHoi === 2) {
      if (!isLocked && q.dapAnDung) {
        prompt += `[⚠️ LƯU Ý: Chuỗi đúng/sai VẪN LÀ ${q.dapAnDung}]\n`;
      }
      prompt += `Câu ${cauIndex}: ${q.noiDung || ''}\n`;
      prompt += `a) (Mức độ: Nhận biết) ${q.yA || ''}\n`;
      prompt += `b) (Mức độ: Thông hiểu) ${q.yB || ''}\n`;
      prompt += `c) (Mức độ: Vận dụng) ${q.yC || ''}\n`;
      prompt += `d) (Mức độ: Vận dụng cao) ${q.yD || ''}\n`;
      prompt += `Đáp án đúng: ${q.dapAnDung || ''}\n`;
      if (q.giaiThich) prompt += `Giải thích: ${q.giaiThich}\n`;
    } else if (q.loaiCauHoi === 3) {
      prompt += `Câu ${cauIndex}: ${q.noiDung || ''}\n`;
      prompt += `Đáp án đúng: ${q.dapAnDung || ''}\n`;
      if (q.giaiThich) prompt += `Giải thích: ${q.giaiThich}\n`;
    } else if (q.loaiCauHoi === 4) {
      const isMultiY = Boolean(q.yB);
      const ktLabel = q.kienThuc === 'hinh_hoc' ? ' [Lĩnh vực: Hình học]' : q.kienThuc === 'dai_so' ? ' [Lĩnh vực: Đại số/Giải tích]' : '';
      if (isMultiY) {
        const cauDanChung = q.noiDung || '';
        prompt += `Câu ${cauIndex}${ktLabel}${cauDanChung ? ': ' + cauDanChung : ''}\n`;
        if (q.yA) prompt += `a) (Mức độ: Nhận biết) ${q.yA}\n`;
        if (q.yB) prompt += `b) (Mức độ: Thông hiểu) ${q.yB}\n`;
        if (q.yC) prompt += `c) (Mức độ: Vận dụng) ${q.yC}\n`;
        prompt += `Đáp án đúng và biểu điểm:\n`;
        if (q.dapAnA) prompt += `Ý a:\n${q.dapAnA}\n`;
        if (q.dapAnB) prompt += `Ý b:\n${q.dapAnB}\n`;
        if (q.dapAnC) prompt += `Ý c:\n${q.dapAnC}\n`;
      } else {
        const noiDungGoc = q.yA || q.noiDung || '';
        prompt += `Câu ${cauIndex} (Mức độ: Vận dụng)${ktLabel}: ${noiDungGoc}\n`;
        if (q.dapAnA) {
          prompt += `Đáp án đúng và biểu điểm:\n`;
          prompt += `${q.dapAnA}\n`;
        }
      }
      if (q.giaiThich) prompt += `Giải thích: ${q.giaiThich}\n`;
    }

    if (q.hinhAnh && q.hinhAnh.loai) {
      prompt += `Hình ảnh: ${JSON.stringify(q.hinhAnh)}\n`;
    }

    prompt += `\n`;
    cauIndex++;
  }

  prompt += `=================================================\n`;
  prompt += `Hãy tạo ra TOÀN BỘ ĐỀ SỐ 2 theo đúng hướng dẫn bên trên. KHÔNG cần viết lời chào hỏi, hãy trả về toàn bộ đề thi luôn.\n`;

  return prompt;
}
