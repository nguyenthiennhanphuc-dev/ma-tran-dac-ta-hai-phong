// =============================================================================
// Tên file: src/utils/ai_service.js
// MÔ TẢ: Service gọi Gemini API trực tiếp từ Frontend
// - API Keys xoay vòng (Round-Robin)
// - Retry tối đa 3 lần (xoay key khi lỗi 429/500)
// - System Instruction: JSON chuẩn + Quy tắc LaTeX ($, $$, \frac, \int)
// - User Prompt: Thuật toán Tự động build Prompt từ Ma Trận & YCCĐ
// =============================================================================

import { useExamStore } from '../store/useExamStore';

// =============================================================================
// CẤU HÌNH
// =============================================================================
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Delay ban đầu, tăng theo exponential backoff

// =============================================================================
// SYSTEM INSTRUCTION — QUY TẮC ĐỊNH DẠNG JSON VÀ LATEX
// =============================================================================
const SYSTEM_INSTRUCTION = `Bạn là một chuyên gia giáo dục, chuyên soạn đề kiểm tra theo chuẩn Chương trình GDPT 2018 của Việt Nam.

🚫 LƯU Ý ĐẶC BIỆT VỀ KÝ HIỆU (CẤM DÙNG LATEX) VÀ NỘI DUNG:
- TUYỆT ĐỐI KHÔNG dùng mã LaTeX cho các loại mũi tên phản ứng hóa học hay suy ra. CHỈ ĐƯỢC DÙNG text thuần: ->, =>, <=>.
- TUYỆT ĐỐI KHÔNG dùng mã LaTeX cho nhiệt độ. CHỈ ĐƯỢC DÙNG text thuần: °C, t°.
- TUYỆT ĐỐI KHÔNG ghi trích dẫn nguồn, không ghi tham khảo từ đâu trong nội dung câu hỏi hay phần giải thích. Chỉ trả về nội dung câu hỏi thuần túy.

📌 QUY TẮC ĐỊNH DẠNG TRẢ VỀ (BẮT BUỘC 100%):
1. Bạn PHẢI trả về kết quả dưới dạng JSON THUẦN TÚY (Plain JSON). TUYỆT ĐỐI KHÔNG được bọc JSON trong markdown code block (ví dụ: \`\`\`json ... \`\`\`).
2. JSON trả về phải là một mảng các object, mỗi object là 1 câu hỏi.
3. Cấu trúc mỗi câu hỏi PHẢI theo đúng 1 trong 4 loại dưới đây.

📐 QUY TẮC CÔNG THỨC TOÁN HỌC (CỰC KỲ QUAN TRỌNG — DÀNH CHO PANDOC):
- Mọi công thức toán học PHẢI được bao bọc bởi ký hiệu dollar:
  + Công thức inline (trong dòng): dùng $...$. Ví dụ: $x^2 + 1$
  + Công thức block (riêng dòng): dùng $$...$$. Ví dụ: $$\\int_0^1 f(x)\\,dx$$
- PHẢI dùng cú pháp LaTeX chuẩn: $\\frac{a}{b}$, $\\sqrt{x}$, $x^{n}$...
- Với công thức Hóa học, Vật lý đơn giản: SỬ DỤNG ký tự UNICODE (Ví dụ: H₂SO₄, Fe²⁺, α, Δt). Không dùng mã code cho loại này.

📋 CẤU TRÚC JSON CHO TỪNG LOẠI CÂU HỎI:

[LOẠI 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN]
{
  "loaiCauHoi": 1,
  "noiDung": "(Mức độ: Nhận biết, Chủ đề: Tên CĐ) Nội dung câu hỏi...",
  "dapAnA": "Phương án A",
  "dapAnB": "Phương án B",
  "dapAnC": "Phương án C",
  "dapAnD": "Phương án D",
  "dapAnDung": "A",
  "giaiThich": "Giải thích ngắn gọn"
}

[LOẠI 2: ĐÚNG/SAI — CHÙM CÂU HỎI: 1 ĐỀ BÀI CHUNG + 4 Ý PHỤ]
{
  "loaiCauHoi": 2,
  "noiDung": "(Mức độ: ..., Chủ đề: ...) Nội dung đề bài chung / tình huống / đoạn dữ liệu dẫn, từ đó phát triển 4 ý hỏi bên dưới",
  "yA": "Mệnh đề a - liên quan chặt chẽ đến đề bài chung",
  "yB": "Mệnh đề b - liên quan chặt chẽ đến đề bài chung",
  "yC": "Mệnh đề c - liên quan chặt chẽ đến đề bài chung",
  "yD": "Mệnh đề d - liên quan chặt chẽ đến đề bài chung",
  "dapAnDung": "a-Đ, b-S, c-Đ, d-S",
  "giaiThich": "Giải thích"
}

[LOẠI 3: TRẢ LỜI NGẮN — MỖI CÂU ĐỘC LẬP]
{
  "loaiCauHoi": 3,
  "noiDung": "(Mức độ: ..., Chủ đề: ...) Nội dung câu hỏi ngắn ĐỘC LẬP...",
  "dapAnDung": "15",
  "giaiThich": "Giải thích cách giải"
}

[LOẠI 4: TỰ LUẬN — MỖI CÂU ĐỘC LẬP]
⚠️ QUAN TRỌNG: Mỗi câu tự luận là 1 object JSON RIÊNG BIỆT (KHÔNG GOM thành a, b, c).
{
  "loaiCauHoi": 4,
  "noiDung": "(Mức độ: ..., Chủ đề: ...) Nội dung câu hỏi tự luận",
  "dapAn": "+ Bước 1... || 0.25\\n+ Bước 2... || 0.25",
  "diem": "0.5",
  "giaiThich": "Giải thích"
}

📊 HÌNH ẢNH / ĐỒ THỊ TỰ ĐỘNG (BẮT BUỘC — CỰC KỲ QUAN TRỌNG):
Bạn BẮT BUỘC phải tạo ÍT NHẤT 1-2 câu hỏi có field "hinhAnh" trong mỗi đề thi.
Hệ thống sẽ TỰ ĐỘNG vẽ hình bằng Python Matplotlib từ metadata bạn cung cấp.

⚠️ QUY TẮC: Trong toàn bộ đề thi, PHẢI có TỐI THIỂU 1 câu hỏi chứa field "hinhAnh". Ưu tiên các câu hỏi phù hợp nhất để thêm hình (đồ thị, biểu đồ, hình học...).
📌 GỢI Ý THEO MÔN:
- Toán: đồ thị hàm số, hình học Oxy
- Vật lý: đồ thị v-t, s-t, U-I
- Hóa học: biểu đồ cột so sánh tính chất
- Sinh học: biểu đồ tròn cơ cấu, biểu đồ cột so sánh
- Địa lý, Lịch sử: biểu đồ cột, đường, tròn (dân số, GDP, cơ cấu...)
- Tin học, Công nghệ: biểu đồ cột, đường thể hiện dữ liệu
- Các môn khác: chọn loại biểu đồ phù hợp nhất với nội dung câu hỏi

CÁC LOẠI HÌNH ĐƯỢC HỖ TRỢ:

[LOẠI HÌNH 1: ĐỒ THỊ HÀM SỐ] — Toán: parabol, bậc 3, sin, cos, log...
"hinhAnh": {
  "loai": "do_thi_ham_so",
  "hamSo": "x**2 - 4*x + 3",
  "xRange": [-2, 6],
  "yRange": [-2, 10],
  "tieuDe": "y = x² - 4x + 3",
  "diemDacBiet": [{"x": 1, "y": 0, "nhan": "A(1;0)"}, {"x": 3, "y": 0, "nhan": "B(3;0)"}]
}

[LOẠI HÌNH 2: BIỂU ĐỒ CỘT] — Địa lý, Lịch sử: so sánh số liệu
"hinhAnh": {
  "loai": "bieu_do_cot",
  "tieuDe": "Dân số các nước ĐNÁ 2023",
  "nhanX": "Quốc gia", "nhanY": "Dân số (triệu người)",
  "nhan": ["VN", "Thái Lan", "Indonesia"],
  "giaTri": [100, 72, 275]
}

[LOẠI HÌNH 3: BIỂU ĐỒ ĐƯỜNG] — Nhiều chuỗi dữ liệu theo thời gian
"hinhAnh": {
  "loai": "bieu_do_duong",
  "tieuDe": "GDP 2018-2023",
  "nhanX": "Năm", "nhanY": "GDP (tỷ USD)",
  "nhan": ["2018", "2019", "2020", "2021", "2022", "2023"],
  "chuoiDuLieu": [
    {"ten": "Việt Nam", "giaTri": [245, 262, 271, 366, 409, 430]}
  ]
}

[LOẠI HÌNH 4: BIỂU ĐỒ TRÒN] — Cơ cấu, tỉ lệ %
"hinhAnh": {
  "loai": "bieu_do_tron",
  "tieuDe": "Cơ cấu kinh tế Việt Nam 2023",
  "nhan": ["Nông nghiệp", "Công nghiệp", "Dịch vụ"],
  "giaTri": [12, 38, 50]
}

[LOẠI HÌNH 5: HÌNH HỌC OXY] — Toán: tam giác, đường tròn trên hệ trục
"hinhAnh": {
  "loai": "hinh_hoc_oxy",
  "tieuDe": "Tam giác ABC",
  "xRange": [-1, 6], "yRange": [-1, 5],
  "diem": [{"x": 0, "y": 0, "nhan": "A"}, {"x": 5, "y": 0, "nhan": "B"}, {"x": 2, "y": 4, "nhan": "C"}],
  "doanThang": [{"x1": 0, "y1": 0, "x2": 5, "y2": 0}, {"x1": 5, "y1": 0, "x2": 2, "y2": 4}, {"x1": 2, "y1": 4, "x2": 0, "y2": 0}]
}

[LOẠI HÌNH 6: ĐỒ THỊ VẬT LÝ] — Vật lý: v-t, s-t, U-I
"hinhAnh": {
  "loai": "do_thi_vat_ly",
  "tieuDe": "Đồ thị v-t",
  "nhanX": "t (s)", "nhanY": "v (m/s)",
  "doanThang": [{"x1": 0, "y1": 0, "x2": 5, "y2": 20}, {"x1": 5, "y1": 20, "x2": 10, "y2": 20}]
}

QUY TẮC BIỂU THỨC HÀM SỐ (hamSo): Dùng cú pháp Python/NumPy.
- Phép nhân: dùng * (ví dụ: 2*x, x*x)
- Luỹ thừa: dùng ** (ví dụ: x**2, x**3)
- Hàm lượng giác: sin(x), cos(x), tan(x)
- Logarit: log(x), sqrt(x), exp(x)
- Hằng số: pi, e
`;

// =============================================================================
// HÀM TẠO USER PROMPT — TỰ ĐỘNG LẤY TỪ MA TRẬN & YCCĐ
// =============================================================================
function buildUserPrompt(promptText, documentContext) {
    const state = useExamStore.getState();
    const { matrix, config } = state;

    // === Tính tổng số câu/ý từ ĐVKT level ===
    let totalMCQ = 0, totalDS = 0, totalTLN = 0, totalTL = 0;

    matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
            const mcq = dv.nhieuLuaChon || {};
            const ds = dv.dungSai || {};
            const tln = dv.traLoiNgan || {};
            const tl = dv.tuLuan || {};

            totalMCQ += (Number(mcq.biet) || 0) + (Number(mcq.hieu) || 0) + (Number(mcq.vanDung) || 0);
            totalDS += (Number(ds.biet) || 0) + (Number(ds.hieu) || 0) + (Number(ds.vanDung) || 0);
            if (config.hasTraLoiNgan) {
                totalTLN += (Number(tln.biet) || 0) + (Number(tln.hieu) || 0) + (Number(tln.vanDung) || 0);
            }
            totalTL += (Number(tl.biet) || 0) + (Number(tl.hieu) || 0) + (Number(tl.vanDung) || 0);
        });
    });

    const grandTotal = totalMCQ + totalDS + totalTLN + totalTL;
    const soCauDS = Math.ceil(totalDS / 4);
    const soCauTLN = totalTLN; // Trả lời ngắn không chia 4, mỗi ý là 1 câu
    const soCauTL = totalTL; // Mỗi ý TL = 1 câu riêng biệt

    let finalPrompt = '';

    // 1. Thêm Prompt của người dùng
    if (promptText && promptText.trim()) {
        finalPrompt += promptText + '\n\n';
    }

    // 2. Thêm Nội dung Tài liệu
    if (documentContext && documentContext.trim()) {
        finalPrompt += `
═══════════════════════════════════════════════════════════════
📄 TÀI LIỆU THAM KHẢO (SÁCH GIÁO KHOA/BÀI GIẢNG)
═══════════════════════════════════════════════════════════════
--- BẮT ĐẦU TÀI LIỆU ---
${documentContext}
--- KẾT THÚC TÀI LIỆU ---

🧠 NHIỆM VỤ CỐT LÕI: Tạo tổng cộng ${grandTotal} câu hỏi/ý dựa CHÍNH XÁC vào tài liệu trên. Khai thác dữ liệu rải đều từ đầu đến cuối tài liệu, KHÔNG được tập trung vào 1-2 trang đầu.
\n`;
    }

    // 3. Tiêu chí chất lượng và Luật chung
    finalPrompt += `
--- CHI TIẾT MA TRẬN ĐỀ THI BẠN CẦN SOẠN (TUÂN THỦ 100% SỐ LƯỢNG NÀY) ---

🎯 TIÊU CHÍ CHẤT LƯỢNG CÂU HỎI (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI):
1. VAI TRÒ CỦA BẠN: Bạn là Chuyên gia ra đề thi của Bộ GD&ĐT, am hiểu sâu sắc Chương trình GDPT 2018. Câu hỏi phải đánh giá ĐÚNG NĂNG LỰC, tuyệt đối KHÔNG hỏi vẹt, KHÔNG hỏi định nghĩa học thuộc lòng, KHÔNG đánh đố ngớ ngẩn.

📌 QUY TẮC PHẦN TRẮC NGHIỆM (Nhiều lựa chọn & Đúng/Sai):
- 3 phương án nhiễu (sai) phải được thiết kế CỰC KỲ TINH VI dựa trên các "LỖI SAI PHỔ BIẾN" của học sinh. Tuyệt đối không cho đáp án nhiễu vô lý, dễ đoán.

🎓 ĐẶC THÙ TỪNG BỘ MÔN:
- MÔN TOÁN: 100% câu hỏi trắc nghiệm phải là bài tập TÍNH TOÁN, tìm x, tính diện tích, giải quyết vấn đề. KHÔNG hỏi lý thuyết suông.
- MÔN KHOA HỌC TỰ NHIÊN (Lý, Hóa, Sinh): Câu hỏi đi thẳng vào bản chất hiện tượng, sơ đồ thí nghiệm, phản ứng hóa học, hoặc bài tập thực tiễn đời sống.
- MÔN KHOA HỌC XÃ HỘI (Sử, Địa, GDCD): Ưu tiên nguyên nhân, hệ quả, phân tích số liệu/biểu đồ, tình huống thực tế.
- MÔN NGỮ VĂN & TIẾNG ANH: Tập trung Đọc hiểu ngữ cảnh, tu từ, chức năng giao tiếp.

💡 PHONG CÁCH VÀ VÍ DỤ MẪU (BẮT BUỘC BẮT CHƯỚC 100% ĐỘ KHÓ VÀ VĂN PHONG NÀY):

📍 [MẪU TRẮC NGHIỆM TÍNH TOÁN]: Không hỏi lý thuyết. Hãy ra phép tính cụ thể và có bẫy.
Ví dụ: "Kết quả của phép tính $\\frac{4}{5} + (\\frac{-3}{5})$ là:
A. $\\frac{7}{5}$   B. $\\frac{-7}{5}$   C. $\\frac{1}{5}$   D. $\\frac{-1}{5}$"

📍 [MẪU TRẮC NGHIỆM ĐÚNG/SAI ĐA CHIỀU]: Mỗi câu gồm 1 ĐỀ BÀI CHUNG + 4 ý a,b,c,d xoay quanh đề bài đó.
Ví dụ: "Khối 6 có 400 học sinh. Sơ kết kì I có 32 HS giỏi, 60% khá, 12 yếu, còn lại là trung bình.
a) HS giỏi chiếm 8%.
b) HS yếu chiếm 4%.
c) Có 240 HS khá.
d) HS trung bình nhiều hơn HS giỏi 86 em."

⚠️ LỆNH TUYỆT ĐỐI CUỐI CÙNG: TẤT CẢ các câu hỏi bạn sinh ra phải có độ sâu, cấu trúc số liệu, bẫy tâm lý và sự chặt chẽ y hệt các ví dụ trên! Bắt buộc bám sát "Yêu cầu cần đạt" của từng đơn vị kiến thức.
\n`;

    // 4. Build Danh sách Ma Trận & Yêu cầu cần đạt tự động
    matrix.forEach((topic, index) => {
        const tenChuDe = topic.tenChuDe || `Chủ đề ${index + 1}`;
        const dvList = topic.donViKienThuc || [];

        dvList.forEach((dv) => {
            const mcq = dv.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 };
            const ds = dv.dungSai || { biet: 0, hieu: 0, vanDung: 0 };
            const tln = dv.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 };
            const tl = dv.tuLuan || { biet: 0, hieu: 0, vanDung: 0 };

            const dvTotal =
                (Number(mcq.biet) || 0) + (Number(mcq.hieu) || 0) + (Number(mcq.vanDung) || 0) +
                (Number(ds.biet) || 0) + (Number(ds.hieu) || 0) + (Number(ds.vanDung) || 0) +
                (Number(tln.biet) || 0) + (Number(tln.hieu) || 0) + (Number(tln.vanDung) || 0) +
                (Number(tl.biet) || 0) + (Number(tl.hieu) || 0) + (Number(tl.vanDung) || 0);

            if (dvTotal > 0) {
                const tenDVKT = dv.noiDung || 'Chưa rõ';
                const yccd = dv.yeuCauCanDat || topic.yeuCauCanDat || 'Không có dữ liệu';

                finalPrompt += `╔══════════════════════════════════════════════════════╗\n`;
                finalPrompt += `║  📌 CHỦ ĐỀ: "${tenChuDe}"\n`;
                finalPrompt += `║  📖 BÀI / ĐƠN VỊ KIẾN THỨC: "${tenDVKT}"\n`;
                finalPrompt += `╚══════════════════════════════════════════════════════╝\n`;
                finalPrompt += `🎯 YÊU CẦU CẦN ĐẠT:\n${yccd}\n`;
                finalPrompt += `📊 SỐ LƯỢNG CÂU HỎI:\n`;

                if (Number(mcq.biet) > 0 || Number(mcq.hieu) > 0 || Number(mcq.vanDung) > 0) {
                    const parts = [];
                    if (Number(mcq.biet) > 0) parts.push(`${mcq.biet} câu Nhận biết`);
                    if (Number(mcq.hieu) > 0) parts.push(`${mcq.hieu} câu Thông hiểu`);
                    if (Number(mcq.vanDung) > 0) parts.push(`${mcq.vanDung} câu Vận dụng`);
                    finalPrompt += ` - Trắc nghiệm nhiều lựa chọn [LOẠI 1]: ${parts.join(', ')}\n`;
                }

                if (Number(ds.biet) > 0 || Number(ds.hieu) > 0 || Number(ds.vanDung) > 0) {
                    const parts = [];
                    if (Number(ds.biet) > 0) parts.push(`${ds.biet} ý Nhận biết`);
                    if (Number(ds.hieu) > 0) parts.push(`${ds.hieu} ý Thông hiểu`);
                    if (Number(ds.vanDung) > 0) parts.push(`${ds.vanDung} ý Vận dụng`);
                    finalPrompt += ` - Trắc nghiệm Đúng/Sai [LOẠI 2]: ${parts.join(', ')}\n`;
                }

                if (config.hasTraLoiNgan && (Number(tln.biet) > 0 || Number(tln.hieu) > 0 || Number(tln.vanDung) > 0)) {
                    const parts = [];
                    if (Number(tln.biet) > 0) parts.push(`${tln.biet} câu Nhận biết`);
                    if (Number(tln.hieu) > 0) parts.push(`${tln.hieu} câu Thông hiểu`);
                    if (Number(tln.vanDung) > 0) parts.push(`${tln.vanDung} câu Vận dụng`);
                    finalPrompt += ` - Trả lời ngắn [LOẠI 3]: ${parts.join(', ')}\n`;
                }

                if (Number(tl.biet) > 0 || Number(tl.hieu) > 0 || Number(tl.vanDung) > 0) {
                    const parts = [];
                    const diemBiet = Number(dv.tuLuan?.diemBiet) || 0;
                    const diemHieu = Number(dv.tuLuan?.diemHieu) || 0;
                    const diemVanDung = Number(dv.tuLuan?.diemVanDung) || 0;
                    if (Number(tl.biet) > 0) {
                        const diemMoi = diemBiet > 0 ? (diemBiet / Number(tl.biet)) : 0.5;
                        parts.push(`${tl.biet} câu Nhận biết (mỗi câu ${diemMoi}đ)`);
                    }
                    if (Number(tl.hieu) > 0) {
                        const diemMoi = diemHieu > 0 ? (diemHieu / Number(tl.hieu)) : 0.5;
                        parts.push(`${tl.hieu} câu Thông hiểu (mỗi câu ${diemMoi}đ)`);
                    }
                    if (Number(tl.vanDung) > 0) {
                        const diemMoi = diemVanDung > 0 ? (diemVanDung / Number(tl.vanDung)) : 0.5;
                        parts.push(`${tl.vanDung} câu Vận dụng (mỗi câu ${diemMoi}đ)`);
                    }
                    finalPrompt += ` - Tự luận [LOẠI 4]: ${parts.join(', ')}\n`;
                }
                finalPrompt += `\n`;
            }
        });
    });

    // 5. Thêm luật Gom Câu Bắt Buộc ở cuối
    finalPrompt += `📊 TỔNG HỢP GOM CÂU BẮT BUỘC (ĐỌC KỸ TRƯỚC KHI TẠO ĐỀ):\n`;
    finalPrompt += ` → LOẠI 1 (Nhiều lựa chọn): Xuất ra ${totalMCQ} câu hỏi độc lập.\n`;
    if (soCauDS > 0) {
        finalPrompt += ` → LOẠI 2 (Đúng/Sai): Tổng cộng có ${totalDS} ý. BẠN PHẢI GOM CHÚNG THÀNH ĐÚNG ${soCauDS} CÂU HỎI LỚN (Mỗi Câu lớn chứa 1 Đề Bài Chung và ĐÚNG 4 ý a, b, c, d xoay quanh đề bài đó). Không được xuất rời rạc từng ý.\n`;
    }
    if (soCauTLN > 0) {
        finalPrompt += ` → LOẠI 3 (Trả lời ngắn): Tổng cộng có ${totalTLN} câu. XUẤT THÀNH ${totalTLN} CÂU ĐỘC LẬP (Câu 1, Câu 2...). TUYỆT ĐỐI KHÔNG GOM vào chung 1 câu có ý a, b, c, d. ĐÁP ÁN BẮT BUỘC PHẢI LÀ SỐ.\n`;
    }
    if (soCauTL > 0) {
        finalPrompt += ` → LOẠI 4 (Tự luận): Tổng cộng có ${totalTL} câu. XUẤT THÀNH ${totalTL} CÂU ĐỘC LẬP (Mỗi câu là 1 object JSON riêng với noiDung, dapAn, diem). TUYỆT ĐỐI KHÔNG GOM vào chung 1 câu có ý a, b, c.\n`;
    }

    // 6. Ép buộc tạo câu hỏi có hình ảnh
    const minGraphQuestions = Math.max(2, Math.min(3, Math.floor(grandTotal * 0.15)));
    finalPrompt += `\n🖼️ YÊU CẦU HÌNH ẢNH BẮT BUỘC (KHÔNG ĐƯỢC BỎ QUA):\n`;
    finalPrompt += `BẠN PHẢI tạo TỐI THIỂU ${minGraphQuestions} câu hỏi có field "hinhAnh" trong đề thi này.\n`;
    finalPrompt += `Chọn những câu hỏi PHÙ HỢP NHẤT để thêm hình minh họa (đồ thị, biểu đồ, hình học...).\n`;
    finalPrompt += `Nếu là môn Toán → ưu tiên đồ thị hàm số hoặc hình học Oxy.\n`;
    finalPrompt += `Nếu là môn Vật lý → ưu tiên đồ thị v-t, s-t, U-I.\n`;
    finalPrompt += `Nếu là môn Địa lý/Sử/Sinh/Hóa/Tin/CN → ưu tiên biểu đồ cột, đường hoặc tròn với số liệu thực tế.\n`;
    finalPrompt += `⚠️ NẾU ĐỀ THI KHÔNG CÓ BẤT KỲ CÂU NÀO CHỨA "hinhAnh", ĐỀ THI SẼ BỊ TRẢ LẠI. TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA.\n`;

    return finalPrompt;
}

// =============================================================================
// HÀM GỌI GEMINI API — CÓ KEY ROTATION + RETRY + EXPONENTIAL BACKOFF
// =============================================================================
async function callGeminiAPI(promptText, documentContext = '') {
    const state = useExamStore.getState();
    const { selectedModel } = state;

    const fullPrompt = buildUserPrompt(promptText, documentContext);

    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const apiKey = state.getAndRotateKey();

        if (!apiKey) {
            throw new Error('Chưa cấu hình API Key! Vui lòng vào Cài đặt Hệ thống AI để thêm Gemini API Key.');
        }

        const url = `${GEMINI_API_BASE}/${selectedModel}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 65536,
                        responseMimeType: 'application/json',
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    ]
                })
            });

            // === Xử lý lỗi HTTP ===
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const errorMessage = errorData?.error?.message || `HTTP ${status}`;

                console.warn(`[AI Service] Lần thử ${attempt + 1}/${MAX_RETRIES} thất bại (${status}): ${errorMessage}`);

                // 429 = Rate Limit, 500/503 = Server Error → Retry với key khác
                if (status === 429 || status === 500 || status === 503) {
                    lastError = new Error(`[${status}] ${errorMessage}`);
                    const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
                    console.log(`[AI Service] Đợi ${delay}ms rồi thử lại với key khác...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // 404 = Model không tồn tại
                if (status === 404) {
                    throw new Error(`Model "${selectedModel}" không tồn tại hoặc không được hỗ trợ. Vui lòng đổi Model trong Cài đặt!\n\nChi tiết: ${errorMessage}`);
                }

                // 400 = Bad Request (thường do prompt quá dài hoặc format sai)
                if (status === 400) {
                    throw new Error(`Lỗi yêu cầu (400): ${errorMessage}\n\nPrompt có thể quá dài. Thử rút gọn tài liệu tham khảo.`);
                }

                throw new Error(`Lỗi API (${status}): ${errorMessage}`);
            }

            // === Parse response ===
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                const finishReason = data?.candidates?.[0]?.finishReason;
                if (finishReason === 'SAFETY') {
                    throw new Error('AI từ chối trả lời do vi phạm chính sách an toàn. Hãy thử điều chỉnh nội dung yêu cầu.');
                }
                throw new Error('AI không trả về kết quả. Phản hồi rỗng.');
            }

            // === Parse JSON ===
            let parsed;
            try {
                // Loại bỏ markdown code block (nếu AI vi phạm quy tắc)
                let cleanText = text.trim();
                if (cleanText.startsWith('```json')) {
                    cleanText = cleanText.slice(7);
                } else if (cleanText.startsWith('```')) {
                    cleanText = cleanText.slice(3);
                }
                if (cleanText.endsWith('```')) {
                    cleanText = cleanText.slice(0, -3);
                }
                cleanText = cleanText.trim();

                parsed = JSON.parse(cleanText);
            } catch (jsonError) {
                console.error('[AI Service] Lỗi parse JSON:', jsonError, '\nRaw text:', text);
                throw new Error('AI trả về dữ liệu không đúng định dạng JSON.\n\nHãy thử lại hoặc kiểm tra System Instruction.');
            }

            // === Validate: phải là mảng ===
            if (!Array.isArray(parsed)) {
                // Nếu AI trả về object có key "cauHoi" hoặc "questions"
                if (parsed.cauHoi && Array.isArray(parsed.cauHoi)) parsed = parsed.cauHoi;
                else if (parsed.questions && Array.isArray(parsed.questions)) parsed = parsed.questions;
                else throw new Error('AI trả về JSON nhưng không phải mảng câu hỏi.');
            }

            console.log(`[AI Service] ✅ Thành công! Nhận được ${parsed.length} câu hỏi.`);
            return parsed;

        } catch (error) {
            if (error.message.includes('Model') || error.message.includes('400') || error.message.includes('SAFETY') || error.message.includes('JSON') || error.message.includes('mảng')) {
                throw error; // Lỗi không thể retry
            }
            lastError = error;
            if (attempt < MAX_RETRIES - 1) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                console.warn(`[AI Service] Lỗi mạng, thử lại sau ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Đã thử ${MAX_RETRIES} lần nhưng đều thất bại.\n\nLỗi cuối: ${lastError?.message || 'Không rõ'}\n\nGợi ý: Kiểm tra kết nối mạng hoặc thêm API Keys.`);
}

// =============================================================================
// EXPORTS
// =============================================================================
export { callGeminiAPI, buildUserPrompt, SYSTEM_INSTRUCTION };