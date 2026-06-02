// =============================================================================
// Tên file: src/utils/analyzeExam.js
// MÔ TẢ: Các hàm gọi Gemini API để:
//   1. Phân tích đề thi (nhận diện câu hỏi, mức độ nhận thức)
//   2. Sinh câu hỏi tương tự với các ràng buộc cố định
// =============================================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// =============================================================================
// SYSTEM INSTRUCTION — PHÂN TÍCH ĐỀ THI
// =============================================================================
const ANALYZE_SYSTEM_INSTRUCTION = `Bạn là chuyên gia phân tích đề thi theo chuẩn Chương trình GDPT 2018.

📌 NHIỆM VỤ: Đọc nội dung đề thi và trả về JSON array, mỗi phần tử là 1 câu hỏi.

🚫 BẮT BUỘC: Chỉ trả về JSON THUẦN TÚY. TUYỆT ĐỐI KHÔNG bọc trong markdown code block.

📋 CẤU TRÚC JSON MỖI CÂU HỎI:

[LOẠI 1 — TRẮC NGHIỆM NHIỀU LỰA CHỌN]
{
  "soCau": 1,
  "loaiCauHoi": 1,
  "mucDo": "nhanbiet" | "thonghieu" | "vandung",
  "chuDe": "Tên chủ đề/bài",
  "noiDung": "Nội dung câu hỏi (giữ nguyên LaTeX $...$)",
  "dapAnA": "Phương án A",
  "dapAnB": "Phương án B",
  "dapAnC": "Phương án C",
  "dapAnD": "Phương án D",
  "dapAnDung": "A",
  "giaiThich": "Giải thích ngắn"
}

[LOẠI 2 — ĐÚNG/SAI]
{
  "soCau": 5,
  "loaiCauHoi": 2,
  "mucDo": "thonghieu",
  "chuDe": "Tên chủ đề",
  "noiDung": "Đề bài chung",
  "yA": "Mệnh đề a",
  "yB": "Mệnh đề b",
  "yC": "Mệnh đề c",
  "yD": "Mệnh đề d",
  "dapAnDung": "a-Đ, b-S, c-Đ, d-S",
  "giaiThich": "Giải thích"
}

[LOẠI 3 — TRẢ LỜI NGẮN]
{
  "soCau": 9,
  "loaiCauHoi": 3,
  "mucDo": "vandung",
  "chuDe": "Tên chủ đề",
  "noiDung": "Nội dung câu hỏi",
  "dapAnDung": "Đáp án số hoặc text ngắn",
  "giaiThich": "Giải thích"
}

[LOẠI 4 — TỰ LUẬN]
{
  "soCau": 13,
  "loaiCauHoi": 4,
  "mucDo": "vandung",
  "chuDe": "Tên chủ đề",
  "noiDung": "Nội dung câu hỏi",
  "dapAn": "Hướng dẫn giải",
  "diem": "1.0",
  "giaiThich": "Giải thích"
}

📐 QUY TẮC PHÂN LOẠI MỨC ĐỘ:
- "nhanbiet": Ghi nhớ, nhận dạng, định nghĩa, kể tên, liệt kê
- "thonghieu": Giải thích, so sánh, phân tích, trình bày, mô tả, tính toán đơn giản
- "vandung": Vận dụng vào tình huống mới, tính toán phức tạp, giải quyết vấn đề

📐 QUY TẮC GIỮ NGUYÊN LATEX: Giữ nguyên tất cả công thức $...$ và $$...$$ từ đề gốc.

📐 QUY TẮC KÝ HIỆU TOÁN HỌC ĐẶC BIỆT (BẮT BUỘC — không được vi phạm):
- Ký hiệu góc: PHẢI dùng $\\angle ABC$ — TUYỆT ĐỐI không dùng ký tự ∠ trực tiếp ngoài LaTeX
- Số đo độ/góc/cung: PHẢI dùng $80^\\circ$ — TUYỆT ĐỐI không dùng ký tự ° hoặc ∘ trực tiếp ngoài LaTeX
- Ký hiệu cung: viết "sđ$\\widehat{AC}$" hoặc "sđ$\\overset{\\frown}{AC}$" (phần "sđ" là text thường)
- Ký hiệu vectơ: $\\vec{AB}$ thay cho ký tự → hay ⃗ trực tiếp
- Tất cả biểu thức toán (kể cả đơn giản như $x$, $n = 63$) đều PHẢI trong $...$

📊 TRƯỜNG BỔ SUNG (chỉ thêm khi câu HỎI THỰC SỰ CÓ bảng/hình):
- bangBieu: Khi câu hỏi có bảng số liệu → { "tieuDe": "...", "data": [["Tiêu đề 1","Tiêu đề 2",...], ["hàng1a","hàng1b",...], ...] }
  ⚠️ QUAN TRỌNG: Bảng số liệu PHẢI đặt vào field "bangBieu.data" — TUYỆT ĐỐI KHÔNG nhúng bảng vào "noiDung" dưới dạng text | col | hay markdown
- hinhAnh: Khi câu hỏi có hình/đồ thị → tùy loại (dùng ĐÚNG tên field, không được đổi):
  - Biểu đồ cột:   { "loai":"bieu_do_cot",   "tieuDe":"...", "nhan":["A","B","C",...], "giaTri":[10,20,15,...], "nhanX":"Tên trục ngang", "nhanY":"Tên trục dọc" }
  - Biểu đồ đường: { "loai":"bieu_do_duong", "tieuDe":"...", "nhan":["T1","T2","T3",...], "chuoiDuLieu":[{"ten":"Tên chuỗi 1","giaTri":[10,20,15,...]},{"ten":"Tên chuỗi 2","giaTri":[5,12,8,...]}] }
  - Biểu đồ tròn:  { "loai":"bieu_do_tron",  "tieuDe":"...", "nhan":["Phần A","Phần B","Phần C",...], "giaTri":[30,50,20,...] }
  - Đồ thị hàm số: { "loai":"do_thi_ham_so", "tieuDe":"y = x² - 2x + 1", "hamSo":"x**2 - 2*x + 1", "xRange":[-3,5] }
  - Vật lý (v-t, s-t, F-t...): { "loai":"do_thi_vat_ly", "tieuDe":"Đồ thị v-t", "doanThang":[{"x1":0,"y1":0,"x2":2,"y2":4},{"x1":2,"y1":4,"x2":5,"y2":4}], "nhanX":"t (s)", "nhanY":"v (m/s)" }
  - Hình học/ảnh/sơ đồ/hình vẽ khác: { "loai":"khac", "moTa":"Mô tả ngắn nội dung hình", "imageRef":"..." }
    Quy tắc imageRef:
    + Nếu prompt có nhãn "[Hình ảnh ID: img_X]" ngay trước một ảnh → câu hỏi liên quan đến ảnh đó đặt "imageRef":"img_X"
    + Nếu prompt có nhãn "[Trang: page_X]" ngay trước một ảnh trang PDF → câu hỏi nào có hình vẽ/sơ đồ thuộc trang đó đặt "imageRef":"page_X"
    + Nếu không có nhãn nào phù hợp → bỏ qua field imageRef (không thêm vào JSON)
    Quy tắc svgCode (TÙY CHỌN — chỉ dùng khi hình đơn giản, tái tạo được bằng SVG):
    + Nếu hình vẽ là hình học cơ bản (tam giác, hình chữ nhật, đường thẳng, điểm, trục tọa độ...) mà KHÔNG có imageRef, bạn CÓ THỂ tự vẽ bằng cách thêm "svgCode":"<svg ...>...</svg>" vào hinhAnh.
    + SVG phải hợp lệ, có viewBox, màu sắc rõ ràng, không dùng external fonts.
    + Nếu hình phức tạp (ảnh thực tế, đồ thị kỹ thuật) → KHÔNG thêm svgCode, chỉ dùng imageRef hoặc loai khác.
- ⚠️ GIÁ TRỊ "loai" CHỈ ĐƯỢC DÙNG 1 TRONG 6 GIÁ TRỊ SAU (không được tự đặt tên khác):
  "bieu_do_cot" | "bieu_do_duong" | "bieu_do_tron" | "do_thi_ham_so" | "do_thi_vat_ly" | "khac"
  Mọi loại hình vẽ không thuộc 5 loại đầu (hình học, sơ đồ, ảnh thực tế...) đều phải dùng "khac".
- ⚠️ TUYỆT ĐỐI KHÔNG dùng tên field sai: KHÔNG dùng nhanX/nhanY thay cho nhan/giaTri (nhan là mảng nhãn, nhanX/nhanY chỉ là chuỗi tên trục).
- Nếu câu KHÔNG có bảng/hình thì KHÔNG thêm bangBieu hoặc hinhAnh vào JSON.`;

// =============================================================================
// SYSTEM INSTRUCTION — SINH CÂU HỎI TƯƠNG TỰ
// =============================================================================
function buildSimilarSystemInstruction(settings) {
    const { fixedAnswerPos, fixedTruePropCount, fixedTruePropPositions } = settings;

    // 'keep' được xử lý ở level prompt từng câu, không cần rule chung
    let answerRule = '';
    if (fixedAnswerPos && fixedAnswerPos !== 'random' && fixedAnswerPos !== 'keep') {
        answerRule = `\n⚠️ CỐ ĐỊNH VỊ TRÍ ĐÁP ÁN ĐÚNG (BẮT BUỘC 100%): Với mọi câu Trắc nghiệm nhiều lựa chọn [LOẠI 1], đáp án đúng PHẢI nằm ở vị trí ${fixedAnswerPos.toUpperCase()}. Field "dapAnDung" LUÔN LUÔN phải là "${fixedAnswerPos.toUpperCase()}".`;
    }

    let dsRule = '';
    if (fixedTruePropCount !== null && fixedTruePropCount !== undefined && fixedTruePropCount !== 'random' && fixedTruePropCount !== 'keep') {
        const count = Number(fixedTruePropCount);
        const positions = fixedTruePropPositions || [];
        if (positions.length > 0) {
            const trueList = positions.map(p => `${p}-Đ`).join(', ');
            const falseList = ['a','b','c','d'].filter(x => !positions.includes(x)).map(p => `${p}-S`).join(', ');
            dsRule = `\n⚠️ CỐ ĐỊNH MỆNH ĐỀ ĐÚNG/SAI (BẮT BUỘC 100%): Với mọi câu Đúng/Sai [LOẠI 2], PHẢI có đúng ${count} mệnh đề ĐÚNG tại vị trí: ${positions.join(', ')}. Field "dapAnDung" LUÔN LUÔN phải là "${[trueList, falseList].filter(Boolean).join(', ')}".`;
        }
    }

    return `Bạn là chuyên gia ra đề thi, chuyên soạn câu hỏi TƯƠNG TỰ theo chuẩn GDPT 2018.

🚫 BẮT BUỘC: Chỉ trả về JSON THUẦN TÚY. TUYỆT ĐỐI KHÔNG bọc trong markdown code block.

📌 NHIỆM VỤ: Tạo câu hỏi MỚI tương tự về cấu trúc và mức độ nhưng KHÁC về số liệu/ngữ cảnh/nhân vật.
${answerRule}${dsRule}

⚠️ BÁM SÁT DẠNG TOÁN VÀ CHỦ ĐỀ GỐC (TUYỆT ĐỐI BẮT BUỘC 100%):
- Mỗi câu hỏi mới sinh ra PHẢI bám sát và kế thừa chính xác DẠNG TOÁN, CHỦ ĐỀ, PHƯƠNG PHÁP GIẢI và KIẾN THỨC của câu hỏi gốc tương ứng.
- Ví dụ:
  + Nếu câu gốc yêu cầu "tìm tập xác định của hàm số phân thức y = 1/(x-1)", câu mới PHẢI là "tìm tập xác định của một hàm số phân thức tương tự dạng y = 1/(x-a)" (chỉ thay đổi các hệ số hoặc biểu thức, tuyệt đối không được đổi sang tìm tập xác định của hàm số mũ/lôgarit hay tìm đạo hàm).
  + Nếu câu gốc là hình học không gian tính "thể tích khối chóp tam giác đều có cạnh bên a, cạnh đáy b", câu mới PHẢI là tính "thể tích khối chóp tam giác đều tương tự" (chỉ đổi kích thước cạnh bên, cạnh đáy hoặc chiều cao, tuyệt đối không được đổi sang chóp tứ giác đều hay hình lăng trụ).
- TUYỆT ĐỐI KHÔNG xáo trộn hoặc hoán đổi dạng toán, chủ đề giữa các câu với nhau. Câu số X mới phải có cùng dạng toán, kiến thức, và chủ đề 100% với câu số X gốc.

📐 QUY TẮC LATEX: Mọi công thức PHẢI bọc $...$ hoặc $$...$$. Dùng cú pháp LaTeX chuẩn.

📐 QUY TẮC KÝ HIỆU ĐẶC BIỆT (BẮT BUỘC):
- Góc: $\\angle ABC$ — KHÔNG dùng ∠ trực tiếp
- Số đo độ: $80^\\circ$ — KHÔNG dùng ° hoặc ∘ trực tiếp
- Cung: sđ$\\widehat{AC}$ (sđ là text thường)
- Bảng số liệu: PHẢI dùng field "bangBieu" — KHÔNG nhúng bảng vào "noiDung" dạng text | col |

📋 CẤU TRÚC JSON (giống đề gốc, giữ nguyên loaiCauHoi và mucDo):
- LOẠI 1: { soCau, loaiCauHoi:1, noiDung, dapAnA, dapAnB, dapAnC, dapAnD, dapAnDung, giaiThich }
- LOẠI 2: { soCau, loaiCauHoi:2, noiDung, yA, yB, yC, yD, dapAnDung, giaiThich }
- LOẠI 3: { soCau, loaiCauHoi:3, noiDung, dapAnDung, giaiThich }
- LOẠI 4: { soCau, loaiCauHoi:4, noiDung, dapAn, diem, giaiThich }

📊 QUY TẮC BẢNG & HÌNH (BẮT BUỘC nếu câu gốc có):
- Nếu câu gốc CÓ bangBieu → câu mới PHẢI có bangBieu với cấu trúc bảng tương tự nhưng số liệu KHÁC HOÀN TOÀN.
- Nếu câu gốc CÓ hinhAnh → câu mới PHẢI có hinhAnh cùng loại (loai), chỉ thay đổi số liệu/hàm số/dữ liệu.
- ⚠️ FIELD NAME BẮT BUỘC cho hinhAnh (không được sai):
  - bieu_do_cot/bieu_do_tron: dùng "nhan":[...] và "giaTri":[...] — KHÔNG dùng "nhanX"/"nhanY" cho mảng dữ liệu
  - bieu_do_duong: dùng "nhan":[...] cho nhãn trục X và "chuoiDuLieu":[{"ten":"...","giaTri":[...]}] cho từng chuỗi số liệu
  - do_thi_vat_ly: dùng "doanThang":[{"x1":...,"y1":...,"x2":...,"y2":...}] — KHÔNG dùng "nhanX"/"nhanY" cho mảng
  - "nhanX" và "nhanY" chỉ là chuỗi TEXT tên trục (vd: "nhanX":"t (s)"), không phải mảng số liệu
- Quy tắc vẽ SVG cho hình vẽ mới (TÙY CHỌN — Khuyên dùng):
  - Nếu câu gốc có hình vẽ hình học cơ bản (tam giác, hình thang, đường tròn, đường thẳng, góc...) hoặc đồ thị hàm số đơn giản:
    + Bạn nên tự vẽ hình mới tương ứng với số liệu mới của câu hỏi tương tự bằng cách thêm trường "svgCode": "<svg ...>...</svg>" vào trong object hinhAnh.
    + SVG phải hợp lệ, có viewBox, nét vẽ sắc nét, nhãn chữ rõ ràng (dùng thẻ <text> ghi nhãn các điểm/độ dài để khớp với đề mới).
- ⚠️ GIÁ TRỊ "loai" CHỈ ĐƯỢC DÙNG 1 TRONG 6 GIÁ TRỊ: "bieu_do_cot" | "bieu_do_duong" | "bieu_do_tron" | "do_thi_ham_so" | "do_thi_vat_ly" | "khac" — KHÔNG tự đặt tên loại khác

⚠️ QUAN TRỌNG:
- 3 phương án sai phải được thiết kế DỰA TRÊN LỖI SAI PHỔ BIẾN, tuyệt đối không vô lý.
- Câu hỏi phải có cùng độ khó, cùng chủ đề, nhưng khác hoàn toàn về số liệu.
- KHÔNG ĐƯỢC copy nguyên câu gốc.
- Nếu câu hỏi gốc có ghi chú [YEU_CAU_DAP_AN: ...], PHẢI tuân thủ tuyệt đối yêu cầu đó.
- Nếu câu hỏi gốc có ghi chú [YEU_CAU_DAP_AN_DS: ...], field "dapAnDung" của câu Đúng/Sai mới PHẢI đúng theo pattern đó (ví dụ "a-Đ, b-S, c-Đ, d-S").`;
}

// =============================================================================
// HÀM SỬA JSON BỊ LỖI ESCAPE VÀ HÌNH VẼ
// =============================================================================
function extractJsonArray(text) {
    // Tìm vị trí của "[{" đầu tiên (có thể có khoảng trắng ở giữa) để định vị mảng JSON chứa các câu hỏi
    const matchStart = text.match(/\[\s*\{/);
    if (!matchStart) return text;
    
    const startIndex = matchStart.index;
    
    // Tìm vị trí của "}]" cuối cùng (có thể có khoảng trắng ở giữa) làm điểm kết thúc mảng
    let endIndex = -1;
    const matchEnd = [...text.matchAll(/\}\s*\]/g)];
    if (matchEnd.length > 0) {
        const lastMatch = matchEnd[matchEnd.length - 1];
        endIndex = lastMatch.index + lastMatch[0].length;
    } else {
        endIndex = text.lastIndexOf(']') + 1;
    }
    
    if (endIndex > startIndex) {
        return text.substring(startIndex, endIndex);
    }
    return text;
}

function removeMarkdownLinks(text) {
    // Sửa regex cực kỳ cụ thể để tránh greedy match tới tận dấu [ ở đầu file JSON
    return text.replace(/\[(https?:\/\/[^\]\s"]+)\]\((https?:\/\/[^\)\s"]+)\)/g, (match, p1, p2) => {
        return p2;
    });
}

function repairSvgCodeQuotes(text) {
    let index = 0;
    while (true) {
        const matchIndex = text.indexOf('"svgCode"', index);
        if (matchIndex === -1) break;
        
        const colonIndex = text.indexOf(':', matchIndex);
        if (colonIndex === -1) {
            index = matchIndex + 9;
            continue;
        }
        
        const valStartIndex = text.indexOf('"', colonIndex + 1);
        if (valStartIndex === -1) {
            index = colonIndex + 1;
            continue;
        }
        
        // Tìm dấu nháy đóng của chuỗi svgCode (phải theo sau bởi , hoặc })
        let closingQuoteIndex = -1;
        let scanIndex = valStartIndex + 1;
        while (scanIndex < text.length) {
            const nextQuote = text.indexOf('"', scanIndex);
            if (nextQuote === -1) break;
            
            const afterText = text.substring(nextQuote + 1, nextQuote + 50);
            if (/^\s*[,}]/.test(afterText)) {
                closingQuoteIndex = nextQuote;
                break;
            }
            scanIndex = nextQuote + 1;
        }
        
        if (closingQuoteIndex === -1) {
            index = valStartIndex + 1;
            continue;
        }
        
        const rawSvg = text.substring(valStartIndex + 1, closingQuoteIndex);
        
        // Escape toàn bộ dấu nháy kép bên trong SVG nếu chưa được escape
        let escapedSvg = '';
        for (let i = 0; i < rawSvg.length; i++) {
            const ch = rawSvg[i];
            if (ch === '"') {
                if (i > 0 && rawSvg[i - 1] === '\\') {
                    escapedSvg += ch;
                } else {
                    escapedSvg += '\\"';
                }
            } else {
                escapedSvg += ch;
            }
        }
        
        text = text.substring(0, valStartIndex + 1) + escapedSvg + text.substring(closingQuoteIndex);
        index = valStartIndex + 1 + escapedSvg.length + 2;
    }
    return text;
}

function repairUnescapedQuotes(text) {
    const keyRegex = /"([a-zA-Z0-9_]+)"\s*:\s*"/;
    let result = '';
    let index = 0;
    
    while (index < text.length) {
        // Tìm pattern bắt đầu của value dạng string
        const keyMatch = text.slice(index).match(keyRegex);
        if (!keyMatch) {
            result += text.slice(index);
            break;
        }
        
        const matchStart = index + keyMatch.index;
        const valueStart = matchStart + keyMatch[0].length; // Ký tự đầu tiên của chuỗi value (sau dấu nháy kép mở)
        
        result += text.slice(index, valueStart);
        
        let closingQuoteIndex = -1;
        let scanIndex = valueStart;
        
        while (scanIndex < text.length) {
            const nextQuote = text.indexOf('"', scanIndex);
            if (nextQuote === -1) break;
            
            // Một dấu nháy kép được coi là nháy đóng của value nếu theo sau nó là:
            // 1) Dấu phẩy và key tiếp theo (vd: , "soCau":)
            // 2) Dấu đóng ngoặc nhọn }
            // 3) Dấu đóng ngoặc vuông ]
            const afterText = text.slice(nextQuote + 1, nextQuote + 300);
            const isClosing = /^\s*,\s*"[a-zA-Z0-9_]+"\s*:/.test(afterText) || 
                              /^\s*\}/.test(afterText) || 
                              /^\s*\]/.test(afterText);
                              
            if (isClosing) {
                closingQuoteIndex = nextQuote;
                break;
            }
            scanIndex = nextQuote + 1;
        }
        
        if (closingQuoteIndex !== -1) {
            const rawValue = text.slice(valueStart, closingQuoteIndex);
            // Escape tất cả các dấu nháy kép chưa được escape bên trong chuỗi
            let escapedValue = '';
            for (let i = 0; i < rawValue.length; i++) {
                const ch = rawValue[i];
                if (ch === '"') {
                    if (i === 0 || rawValue[i - 1] !== '\\') {
                        escapedValue += '\\"';
                    } else {
                        escapedValue += ch;
                    }
                } else {
                    escapedValue += ch;
                }
            }
            
            result += escapedValue + '"';
            index = closingQuoteIndex + 1;
        } else {
            result += text.slice(valueStart, valueStart + 1);
            index = valueStart + 1;
        }
    }
    
    return result;
}

function fixJsonEscapes(text) {
    // 1. Trích xuất mảng JSON thực sự (bỏ qua các phần text giải thích/tiêu đề bao quanh)
    text = extractJsonArray(text);

    // 2. Sửa link markdown và dấu nháy kép chưa escape trong svgCode
    text = removeMarkdownLinks(text);
    text = repairSvgCodeQuotes(text);
    
    // 3. Sửa tất cả các dấu nháy kép chưa escape trong các string fields khác
    text = repairUnescapedQuotes(text);

    // 4. Quét từng ký tự, theo dõi đang trong string hay không
    // để sửa: (1) escape không hợp lệ, (2) control character thô trong string
    const validEscapes = new Set(['"', '\\', '/', 'u']);
    let result = '';
    let inString = false;
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (inString) {
            if (ch === '\\') {
                const next = text[i + 1];
                if (next !== undefined && validEscapes.has(next)) {
                    result += ch + next; // escape hợp lệ, giữ nguyên
                    i += 2;
                } else {
                    result += '\\\\'; // escape không hợp lệ → double backslash
                    i++;
                }
            } else if (ch === '"') {
                inString = false;
                result += ch;
                i++;
            } else if (ch === '\n') {
                result += '\\n'; // newline thô → escaped
                i++;
            } else if (ch === '\r') {
                result += '\\r';
                i++;
            } else if (ch < ' ') {
                i++; // bỏ qua control char khác
            } else {
                result += ch;
                i++;
            }
        } else {
            if (ch === '"') inString = true;
            result += ch;
            i++;
        }
    }
    return result;
}

// =============================================================================
// HÀM GỌI GEMINI API (có retry + key rotation)
// =============================================================================
// Hàm map model giả định sang model Gemini thực tế
function mapModelForApi(modelName) {
    if (!modelName) return 'gemini-2.5-flash';

    const mapping = {
        // Các model thật — giữ nguyên tên
        'gemini-2.5-flash': 'gemini-2.5-flash',
        'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
        // Các model giả (tên không tồn tại trên API) — fallback về model thật
        'gemini-3.5-flash': 'gemini-2.5-flash',
        'gemini-3-flash-preview': 'gemini-2.5-flash',
        'gemini-3.1-flash-lite-preview': 'gemini-2.5-flash-lite'
    };

    return mapping[modelName] || modelName;
}

function cleanBase64(b64) {
    if (typeof b64 !== 'string') return '';
    const commaIdx = b64.indexOf(',');
    if (commaIdx !== -1) {
        return b64.substring(commaIdx + 1);
    }
    return b64;
}

async function callGeminiRaw(systemInstruction, userPrompt, apiKeys, selectedModel, pageImages = []) {
    let keyIndex = 0;
    let lastError = null;

    // Map model thực tế trước khi gọi API
    const realModel = mapModelForApi(selectedModel);
    console.log(`[Gemini Raw API] Model được chọn: ${selectedModel} -> Map sang model thực tế: ${realModel}`);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const apiKey = apiKeys[keyIndex % apiKeys.length];
        keyIndex++;

        // Ẩn bớt API key khi log
        const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'NULL';
        console.log(`[Gemini Raw API] Thử lần ${attempt + 1}/${MAX_RETRIES} bằng key: ${maskedKey}, ảnh đính kèm: ${pageImages.length}`);

        const url = `${GEMINI_API_BASE}/${realModel}:generateContent?key=${apiKey}`;

        // Xây dựng parts: text prompt + ảnh đính kèm
        // - Ảnh trích xuất riêng (pdf_draw/pdf_img, không có isPageRender): thêm nhãn [Hình ảnh ID: ...]
        // - Ảnh trang PDF (isPageRender):
        //     + Nếu KHÔNG có ảnh trích xuất → thêm nhãn [Trang: page_X] để Gemini dùng làm imageRef
        //     + Nếu CÓ ảnh trích xuất → gửi không nhãn (chỉ để AI đọc ngữ cảnh, KHÔNG dùng làm imageRef)
        const hasExtractedFigures = pageImages.some(img => !img.isPageRender);
        const contentParts = [{ text: userPrompt }];
        for (const img of pageImages) {
            if (img.isPageRender && img.id) {
                if (!hasExtractedFigures) {
                    contentParts.push({ text: `[Trang: ${img.id}]` });
                }
                // Nếu có ảnh trích xuất: page render gửi không nhãn, chỉ để AI đọc ngữ cảnh
            } else if (!img.isPageRender && img.id) {
                // Thêm label vào nhãn nếu có (label cho biết câu hỏi nào gần hình này)
                const labelSuffix = img.label ? ` — ${img.label}` : '';
                contentParts.push({ text: `[Hình ảnh ID: ${img.id}${labelSuffix}]` });
            }
            contentParts.push({
                inline_data: {
                    mime_type: img.mime || 'image/png',
                    data: cleanBase64(img.base64),
                }
            });
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ parts: contentParts }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        // gemini-2.5-flash hỗ trợ tới 65536, gemini-2.0-flash giới hạn 8192
                        maxOutputTokens: realModel.includes('2.5') ? 65536 : 8192,
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const msg = errorData?.error?.message || `HTTP ${status}`;
                console.error(`[Gemini Raw API] API trả về lỗi HTTP ${status}: ${msg}`);
                
                lastError = new Error(`Lỗi API (${status}): ${msg}`);
                
                // Nếu lỗi 400 (Bad Request - cấu hình sai) hoặc 404 (Không tìm thấy model) thì ta dừng ngay
                if (status === 400 || status === 404) {
                    throw lastError;
                }
                
                // Các lỗi 429, 500, 503... ta tiếp tục thử key khác
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
                    continue;
                }
                throw lastError;
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                const finishReason = data?.candidates?.[0]?.finishReason;
                throw new Error(`AI không trả về kết quả (Lý do kết thúc: ${finishReason || 'Không rõ'}).`);
            }

            // Parse JSON
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
            else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
            if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
            cleanText = cleanText.trim();

            let parsed;
            try {
                parsed = JSON.parse(cleanText);
            } catch (jsonErr) {
                // Thử 1: Sửa escape LaTeX không hợp lệ và control characters
                try {
                    parsed = JSON.parse(fixJsonEscapes(cleanText));
                    console.log('[Gemini Raw API] Đã tự động sửa JSON escape sequences.');
                } catch (_) {
                    // Thử 2: JSON bị cắt nửa chừng → khôi phục phần hợp lệ
                    try {
                        const lastBrace = cleanText.lastIndexOf('}');
                        if (lastBrace > 0) {
                            parsed = JSON.parse(fixJsonEscapes(cleanText.slice(0, lastBrace + 1) + ']'));
                            console.warn('[Gemini Raw API] JSON bị cắt — đã khôi phục một phần dữ liệu.');
                        } else {
                            throw new Error('Không tìm thấy object hợp lệ.');
                        }
                    } catch (jsonErr3) {
                        console.error('[Gemini Raw API] Lỗi parse JSON:', cleanText.substring(0, 300));
                        throw new Error(`Không thể parse JSON phản hồi từ AI: ${jsonErr.message}`);
                    }
                }
            }

            if (!Array.isArray(parsed)) {
                if (parsed.cauHoi && Array.isArray(parsed.cauHoi)) return parsed.cauHoi;
                if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
                throw new Error('AI trả về cấu trúc JSON nhưng không chứa danh sách câu hỏi dạng mảng.');
            }
            return parsed;

        } catch (err) {
            console.warn(`[Gemini Raw API] Lỗi ở lần thử ${attempt + 1}:`, err.message);
            lastError = err;
            
            // Nếu lỗi là 400 hoặc 404 thì throw ngay lập tức không cần retry
            if (err.message.includes('400') || err.message.includes('404')) {
                throw err;
            }
            
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
            }
        }
    }
    throw new Error(`Không thể kết nối đến AI sau ${MAX_RETRIES} lần thử. Lỗi cuối: ${lastError?.message || 'Không rõ'}`);
}

// =============================================================================
// HELPER: Chuẩn hóa hinhAnh.loai — Gemini đôi khi tự đặt loai không hợp lệ
// Chỉ cho phép 6 giá trị chuẩn; tất cả loại khác → 'khac'
// =============================================================================
const VALID_LOAI = new Set([
    'bieu_do_cot', 'bieu_do_duong', 'bieu_do_tron',
    'do_thi_ham_so', 'do_thi_vat_ly', 'khac'
]);

function _normalizeQuestion(q) {
    if (!q.hinhAnh || !q.hinhAnh.loai) return q;
    if (VALID_LOAI.has(q.hinhAnh.loai)) return q;
    // Loai không hợp lệ (hinh_hoc, so_do, bieu_do, ...) → 'khac'
    return {
        ...q,
        hinhAnh: { ...q.hinhAnh, loai: 'khac' },
    };
}

// =============================================================================
// HÀM 1: PHÂN TÍCH ĐỀ THI → MA TRẬN CÂU HỎI
// =============================================================================
export async function analyzeExamWithAI(examText, apiKeys, selectedModel, allImages = []) {
    if ((!examText || !examText.trim()) && allImages.length === 0) {
        throw new Error('Nội dung đề thi rỗng. Vui lòng kiểm tra lại file đã tải lên.');
    }
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error('Chưa cấu hình API Key! Vui lòng vào Cài đặt Hệ thống để thêm Gemini API Key.');
    }

    // Phân loại ảnh: nhúng (Word/PDF embedded) vs page render (ảnh toàn trang PDF)
    const embeddedImages = allImages.filter(img => !img.isPageRender);
    const pageRenders    = allImages.filter(img =>  img.isPageRender);

    let imageRefNote = '';
    if (embeddedImages.length > 0) {
        // Word hoặc PDF có ảnh/hình vẽ trích xuất riêng lẻ — Gemini nhìn thấy từng ảnh kèm nhãn ID
        const ids = embeddedImages.map(img => img.id).join(', ');
        imageRefNote = `\n\nFile này có ${embeddedImages.length} hình ảnh/hình vẽ được trích xuất riêng lẻ, gửi kèm ngay trước mỗi ảnh là nhãn dạng "[Hình ảnh ID: <id> — Câu N: ...]" (danh sách ID: ${ids}). Phần "— Câu N:..." trong nhãn gợi ý ảnh đó thuộc câu nào. Khi câu hỏi có hình vẽ/sơ đồ không tái tạo được từ dữ liệu (loai:"khac"), dựa vào nhãn để đặt "imageRef":"<id_tương_ứng>". CHỈ dùng các ID sau: ${ids}. TUYỆT ĐỐI KHÔNG dùng "page_X" hay bất kỳ ID nào khác ngoài danh sách này.`;
    } else if (pageRenders.length > 0) {
        // PDF chỉ có page render — ảnh hình vẽ được rasterized thẳng vào trang
        // Mỗi trang gửi kèm có nhãn "[Trang: page_X]". Gemini cần dùng ID trang để tham chiếu.
        const pageIds = pageRenders.map(img => img.id).join(', ');
        imageRefNote = `\n\nFile PDF này có ${pageRenders.length} trang được gửi kèm dưới dạng ảnh (ID trang: ${pageIds}). Mỗi trang có nhãn "[Trang: page_X]" ngay trước ảnh trang đó. Khi câu hỏi có hình vẽ/biểu đồ/sơ đồ nằm trong trang và không thể tái tạo từ dữ liệu (loai:"khac"), hãy thêm "imageRef":"page_X" (X là số trang chứa hình đó) vào field hinhAnh.`;
    }

    const prompt = `Hãy phân tích đề thi sau và trả về JSON array các câu hỏi với đầy đủ thông tin:

--- BẮT ĐẦU ĐỀ THI ---
${examText || '(Xem hình ảnh trang đề đính kèm)'}
--- KẾT THÚC ĐỀ THI ---

Lưu ý:
- Nhận diện CHÍNH XÁC từng câu hỏi, không bỏ sót (kể cả câu trong bảng, hình ảnh)
- Phân loại đúng loại câu hỏi (1: MCQ, 2: Đúng/Sai, 3: TLN, 4: Tự luận)
- Đánh giá mức độ nhận thức dựa trên nội dung thực sự của câu hỏi
- Giữ nguyên công thức LaTeX từ đề gốc${imageRefNote}`;

    const result = await callGeminiRaw(ANALYZE_SYSTEM_INSTRUCTION, prompt, apiKeys, selectedModel, allImages);
    
    // Đảm bảo mỗi câu có soCau + normalize loai hinhAnh
    return result.map((q, idx) => _normalizeQuestion({
        ...q,
        soCau: q.soCau || (idx + 1),
        _selected: false, // false = giữ lại, true = sinh tương tự
    }));
}

// =============================================================================
// HÀM 2: SINH CÂU HỎI TƯƠNG TỰ
// =============================================================================
export async function generateSimilarQuestions(questionsToReplace, settings, apiKeys, selectedModel, additionalImages = []) {
    if (!questionsToReplace || questionsToReplace.length === 0) return [];
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error('Chưa cấu hình API Key!');
    }

    const sysInstruction = buildSimilarSystemInstruction(settings);

    const { perQuestionAnswerPos, perQuestionTrueProp } = settings;

    // Gom tất cả câu cần sinh vào 1 prompt để tiết kiệm API call
    // Nếu chế độ "keep" (giữ nguyên gốc), gắn thêm ghi chú yêu cầu đáp án từng câu
    const questionsJson = JSON.stringify(questionsToReplace.map(q => {
        const base = {
            soCau: q.soCau,
            loaiCauHoi: q.loaiCauHoi,
            mucDo: q.mucDo,
            chuDe: q.chuDe,
            noiDung: q.noiDung,
            dapAnA: q.dapAnA,
            dapAnB: q.dapAnB,
            dapAnC: q.dapAnC,
            dapAnD: q.dapAnD,
            yA: q.yA, yB: q.yB, yC: q.yC, yD: q.yD,
            dapAnDung: q.dapAnDung,
        };
        if (perQuestionAnswerPos && perQuestionAnswerPos[q.soCau]) {
            base._yeuCauDapAn = `[YEU_CAU_DAP_AN: dapAnDung của câu mới PHẢI là "${perQuestionAnswerPos[q.soCau]}"]`;
        }
        if (perQuestionTrueProp && perQuestionTrueProp[q.soCau] && q.loaiCauHoi === 2) {
            base._yeuCauDapAnDS = `[YEU_CAU_DAP_AN_DS: dapAnDung của câu Đúng/Sai mới PHẢI là "${perQuestionTrueProp[q.soCau]}"]`;
        }
        return base;
    }), null, 2);

    // Ghi chú bổ sung trong prompt
    let extraRules = '';
    if (settings.fixedAnswerPos && settings.fixedAnswerPos !== 'random' && settings.fixedAnswerPos !== 'keep') {
        extraRules += `\n- QUAN TRỌNG: Đáp án đúng của MỌI câu MCQ PHẢI ở vị trí ${settings.fixedAnswerPos.toUpperCase()}`;
    }
    if (perQuestionAnswerPos) {
        extraRules += `\n- QUAN TRỌNG: Mỗi câu có ghi chú [YEU_CAU_DAP_AN: ...] → bắt buộc tuân theo đúng vị trí đáp án đó`;
    }
    if (perQuestionTrueProp) {
        extraRules += `\n- QUAN TRỌNG: Mỗi câu Đúng/Sai có ghi chú [YEU_CAU_DAP_AN_DS: ...] → bắt buộc tuân theo đúng pattern dapAnDung đó`;
    }
    if (settings.fixedTruePropCount !== 'random' && settings.fixedTruePropPositions?.length) {
        extraRules += `\n- QUAN TRỌNG: Câu Đúng/Sai phải có đúng ${settings.fixedTruePropCount} mệnh đề đúng tại vị trí: ${settings.fixedTruePropPositions.join(', ')}`;
    }

    // Nếu có ảnh thủ công (manual images), thêm ghi chú để Gemini biết và dùng imageRef đúng
    let imageNote = '';
    if (additionalImages.length > 0) {
        const imgRefs = additionalImages.map(img => {
            const lbl = img.label || img.id;
            return `"${img.id}" (${lbl})`;
        }).join(', ');
        imageNote = `\n- Ảnh hình vẽ đính kèm: ${imgRefs}. Khi câu mới cần hình vẽ tương tự câu gốc, giữ nguyên "imageRef" trỏ đúng ảnh tương ứng.`;
    }

    const prompt = `Dưới đây là ${questionsToReplace.length} câu hỏi GỐC. Hãy tạo ${questionsToReplace.length} câu hỏi TƯƠNG TỰ (mỗi câu gốc → 1 câu mới tương ứng):

--- CÂU HỎI GỐC ---
${questionsJson}
--- KẾT THÚC ---

YÊU CẦU TUYỆT ĐỐI BẮT BUỘC (vi phạm là SAI):
- Trả về JSON array có đúng ${questionsToReplace.length} phần tử, theo đúng thứ tự câu gốc
- TUYỆT ĐỐI BÁM SÁT DẠNG TOÁN VÀ KIẾN THỨC GỐC: Mỗi câu mới PHẢI có cùng dạng toán, kiến thức, phương pháp giải và chủ đề với câu gốc tương ứng (ví dụ: câu gốc là tìm tập xác định thì câu mới phải là tìm tập xác định của hàm số cùng loại, câu gốc là hình chóp tam giác thì câu mới phải là hình chóp tam giác). Tuyệt đối không xáo trộn chủ đề giữa các câu.
- TUYỆT ĐỐI KHÔNG thay đổi soCau: câu gốc soCau=X thì câu mới PHẢI có soCau=X (không được đánh lại từ 1)
- TUYỆT ĐỐI KHÔNG thay đổi loaiCauHoi: câu gốc loaiCauHoi=X thì câu mới PHẢI có loaiCauHoi=X
- TUYỆT ĐỐI KHÔNG thay đổi mucDo: câu gốc mucDo=X thì câu mới PHẢI có mucDo=X
- Cấu trúc bắt buộc theo từng loại:
  + LOẠI 1 (TNKQ, loaiCauHoi=1): PHẢI có đầy đủ dapAnA, dapAnB, dapAnC, dapAnD, dapAnDung
  + LOẠI 2 (Đúng/Sai, loaiCauHoi=2): PHẢI có đầy đủ yA, yB, yC, yD, dapAnDung
  + LOẠI 3 (Trả lời ngắn, loaiCauHoi=3): CHỈ có dapAnDung — KHÔNG có dapAnA/B/C/D, KHÔNG có yA/B/C/D
  + LOẠI 4 (Tự luận, loaiCauHoi=4): có dapAn, diem
- Câu mới phải khác câu gốc hoàn toàn về số liệu/ngữ cảnh${extraRules}${imageNote}`;

    const result = await callGeminiRaw(sysInstruction, prompt, apiKeys, selectedModel, additionalImages);

    // Map câu hỏi trả về từ AI 1-đối-1 với câu hỏi gốc theo index của mảng gửi đi
    return result.map((q, idx) => {
        const orig = questionsToReplace[idx];
        if (!orig) return _normalizeQuestion(q);
        return _normalizeQuestion({
            ...q,
            soCau: orig.soCau,
            loaiCauHoi: orig.loaiCauHoi,
            mucDo: orig.mucDo,
            chuDe: orig.chuDe || q.chuDe,
        });
    });
}

// =============================================================================
// HÀM 3: PARSE FILE QUA BACKEND PYTHON (Word/PDF)
// =============================================================================
export async function parseExamFileViaBackend(file, apiBaseUrl) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiBaseUrl}/api/parse-exam-file`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Lỗi server: ${response.status}`);
    }

    return await response.json();
    // { text: "...", images: [{id, base64, mime}], pageCount: N }
}

// =============================================================================
// EXPORT HELPERS CHO TÍNH NĂNG COPY LỆNH THỦ CÔNG (Tab Step6)
// Các hàm này chỉ export thêm, không thay đổi logic hiện có.
// =============================================================================

/** Chuẩn hóa câu hỏi — export để Step6 dùng khi parse JSON thủ công */
export function normalizeQuestion(q) {
    return _normalizeQuestion(q);
}

/** Fix escape sequences JSON — export để Step6 dùng khi parse JSON thủ công */
export { fixJsonEscapes };

/**
 * Xây dựng prompt phân tích đề thi để người dùng copy gửi Gemini thủ công.
 * @param {string} examText  - Văn bản đề thi đã trích xuất từ file
 * @param {Array}  allImages - Mảng ảnh [{id, base64, mime, isPageRender}]
 * @returns {string} Chuỗi prompt hoàn chỉnh (system + user)
 */
export function buildAnalyzePromptForCopy(examText, allImages = []) {
    const embeddedImages = allImages.filter(img => !img.isPageRender);
    const pageRenders    = allImages.filter(img =>  img.isPageRender);

    let imageRefNote = '';
    if (embeddedImages.length > 0) {
        const ids = embeddedImages.map(img => img.id).join(', ');
        imageRefNote = `\n\nFile này có ${embeddedImages.length} hình ảnh/hình vẽ được trích xuất riêng lẻ (danh sách ID: ${ids}).
HƯỚNG DẪN GÁN IMAGE_REF (BẮT BUỘC):
- Do bạn đang đọc trực tiếp file PDF/Word, hãy đối chiếu số trang hoặc thứ tự chứa câu hỏi để chọn đúng ID ảnh trong danh sách trên:
  + Đối với PDF: Ký tự "pX" trong ID đại diện cho Trang X của tài liệu (ví dụ: "pdf_draw_p2_1" là hình vẽ ở trang 2, "pdf_draw_p4_4" là hình vẽ ở trang 4, "pdf_qcrop_p5_6" là hình ở trang 5, v.v.). Hãy tìm câu hỏi tương ứng trên trang X đó và gán đúng ID chứa "pX" tương ứng vào field "imageRef".
    * Ví dụ: Câu 10 nằm ở Trang 2 có hình vẽ trục lăn sơn → gán "imageRef": "pdf_draw_p2_1" (hoặc ID khác chứa "p2").
    * Ví dụ: Câu 15 ở Trang 4 có hình học → gán "imageRef": "pdf_draw_p4_4".
    * Ví dụ: Câu 21 ở Trang 5 có hình vẽ sợi dây chuyền → gán "imageRef": "pdf_qcrop_p5_6" (hoặc ID khác chứa "p5").
  + Đối với Word (.docx): Các ID được đặt tên tăng dần theo thứ tự xuất hiện (img_0, img_1, img_2...). Hãy đối chiếu thứ tự các câu hỏi có hình từ đầu đến cuối để gán đúng ID (ví dụ: câu có hình đầu tiên sẽ nhận img_0, câu có hình thứ hai nhận img_1, v.v.).
- Đảm bảo gán đầy đủ "hinhAnh": { "loai": "khac", "moTa": "Mô tả ngắn của hình", "imageRef": "<ID vừa tìm được>" } cho từng câu có hình vẽ. TUYỆT ĐỐI KHÔNG bỏ sót.`;
    } else if (pageRenders.length > 0) {
        const pageIds = pageRenders.map(img => img.id).join(', ');
        imageRefNote = `\n\nFile PDF này có ${pageRenders.length} trang được gửi kèm dưới dạng ảnh (ID trang: ${pageIds}). Mỗi trang có nhãn "[Trang: page_X]" ngay trước ảnh trang đó. Khi câu hỏi có hình vẽ/biểu đồ/sơ đồ nằm trong trang và không thể tái tạo từ dữ liệu (loai:"khac"), hãy thêm "imageRef":"page_X" (X là số trang chứa hình đó) vào field hinhAnh.`;
    }

    let attachNote = '';
    if (embeddedImages.length > 0 || pageRenders.length > 0) {
        attachNote = `\n\n⚠️ LƯU Ý KHI GỬI THỦ CÔNG: Đính kèm file đề thi gốc (hoặc ảnh từng trang) vào cuộc trò chuyện để AI nhận diện hình ảnh chính xác.`;
    }

    const userPrompt =
`Hãy phân tích đề thi sau và trả về JSON array các câu hỏi với đầy đủ thông tin:

--- BẮT ĐẦU ĐỀ THI ---
${examText || '(Xem hình ảnh trang đề đính kèm)'}
--- KẾT THÚC ĐỀ THI ---

Lưu ý:
- Nhận diện CHÍNH XÁC từng câu hỏi, không bỏ sót (kể cả câu trong bảng, hình ảnh)
- Phân loại đúng loại câu hỏi (1: MCQ, 2: Đúng/Sai, 3: TLN, 4: Tự luận)
- Đánh giá mức độ nhận thức dựa trên nội dung thực sự của câu hỏi
- Giữ nguyên công thức LaTeX từ đề gốc${imageRefNote}`;

    return (
        `=== SYSTEM INSTRUCTION (dán vào ô System / Instructions của Gemini/ChatGPT) ===\n\n` +
        ANALYZE_SYSTEM_INSTRUCTION +
        attachNote +
        `\n\n${'─'.repeat(60)}\n\n` +
        `=== USER PROMPT (dán vào ô chat, đính kèm file nếu có ảnh) ===\n\n` +
        userPrompt
    );
}

/**
 * Xây dựng prompt sinh đề tương tự để người dùng copy gửi Gemini thủ công.
 * Prompt tự chứa toàn bộ dữ liệu — không cần đính kèm file.
 * @param {Array}  questionsToReplace - Câu hỏi gốc cần sinh lại
 * @param {Object} settings           - { fixedAnswerPos, fixedTruePropCount, fixedTruePropPositions,
 *                                        perQuestionAnswerPos?, perQuestionTrueProp? }
 * @returns {string} Chuỗi prompt hoàn chỉnh (system + user)
 */
export function buildGeneratePromptForCopy(questionsToReplace, settings) {
    const { perQuestionAnswerPos, perQuestionTrueProp } = settings;
    const sysInstruction = buildSimilarSystemInstruction(settings);

    const questionsJson = JSON.stringify(questionsToReplace.map(q => {
        const base = {
            soCau:       q.soCau,
            loaiCauHoi:  q.loaiCauHoi,
            mucDo:       q.mucDo,
            chuDe:       q.chuDe,
            noiDung:     q.noiDung,
            dapAnA:      q.dapAnA,
            dapAnB:      q.dapAnB,
            dapAnC:      q.dapAnC,
            dapAnD:      q.dapAnD,
            yA: q.yA, yB: q.yB, yC: q.yC, yD: q.yD,
            dapAnDung:   q.dapAnDung,
        };
        if (q.bangBieu) base.bangBieu = q.bangBieu;
        if (q.hinhAnh)  base.hinhAnh  = q.hinhAnh;
        if (perQuestionAnswerPos && perQuestionAnswerPos[q.soCau]) {
            base._yeuCauDapAn = `[YEU_CAU_DAP_AN: dapAnDung của câu mới PHẢI là "${perQuestionAnswerPos[q.soCau]}"]`;
        }
        if (perQuestionTrueProp && perQuestionTrueProp[q.soCau] && q.loaiCauHoi === 2) {
            base._yeuCauDapAnDS = `[YEU_CAU_DAP_AN_DS: dapAnDung của câu Đúng/Sai mới PHẢI là "${perQuestionTrueProp[q.soCau]}"]`;
        }
        return base;
    }), null, 2);

    let extraRules = '';
    if (settings.fixedAnswerPos && settings.fixedAnswerPos !== 'random' && settings.fixedAnswerPos !== 'keep') {
        extraRules += `\n- QUAN TRỌNG: Đáp án đúng của MỌI câu MCQ PHẢI ở vị trí ${settings.fixedAnswerPos.toUpperCase()}`;
    }
    if (perQuestionAnswerPos) {
        extraRules += `\n- QUAN TRỌNG: Mỗi câu có ghi chú [YEU_CAU_DAP_AN: ...] → bắt buộc tuân theo đúng vị trí đáp án đó`;
    }
    if (perQuestionTrueProp) {
        extraRules += `\n- QUAN TRỌNG: Mỗi câu Đúng/Sai có ghi chú [YEU_CAU_DAP_AN_DS: ...] → bắt buộc tuân theo đúng pattern dapAnDung đó`;
    }

    const userPrompt =
`Dưới đây là ${questionsToReplace.length} câu hỏi GỐC. Hãy tạo ${questionsToReplace.length} câu hỏi TƯƠNG TỰ (mỗi câu gốc → 1 câu mới tương ứng):

--- CÂU HỎI GỐC ---
${questionsJson}
--- KẾT THÚC ---

YÊU CẦU:
- Trả về JSON array có đúng ${questionsToReplace.length} phần tử
- Mỗi câu mới tương ứng 1-1 với câu gốc (giữ nguyên soCau, loaiCauHoi, mucDo)
- TUYỆT ĐỐI BÁM SÁT DẠNG TOÁN VÀ KIẾN THỨC GỐC: Mỗi câu mới PHẢI có cùng dạng toán, kiến thức, phương pháp giải và chủ đề với câu gốc tương ứng (ví dụ: câu gốc là tìm tập xác định thì câu mới phải là tìm tập xác định của hàm số cùng loại, câu gốc là hình chóp tam giác thì câu mới phải là hình chóp tam giác). Tuyệt đối không xáo trộn chủ đề giữa các câu.
- Câu mới phải khác câu gốc hoàn toàn về số liệu/ngữ cảnh${extraRules}`;

    return (
        `=== SYSTEM INSTRUCTION (dán vào ô System / Instructions của Gemini/ChatGPT) ===\n\n` +
        sysInstruction +
        `\n\n${'─'.repeat(60)}\n\n` +
        `=== USER PROMPT (dán vào ô chat) ===\n\n` +
        userPrompt +
        `\n\n⚠️ Prompt này tự chứa toàn bộ dữ liệu — KHÔNG cần đính kèm file gì thêm.`
    );
}


// =============================================================================
// HÀM 4: TỰ ĐỘNG SINH MÃ TYPST VẼ HÌNH BẰNG AI (Cơ chế 3 — Tab Step6)
// Gọi Gemini trực tiếp từ frontend để sinh/sửa mã Typst cho 1 câu hỏi cụ thể.
// Không ảnh hưởng đến bất kỳ hàm nào khác đã có.
// =============================================================================

/**
 * buildTypstPrompt: Xây dựng system instruction + user prompt cho AI sinh/sửa Typst.
 * @param {Object}      question     - Câu hỏi
 * @param {Object|null} errorContext - null = sinh mới, { code, errorMsg } = sửa lỗi
 */
function buildTypstPrompt(question, errorContext) {
    const q = question;
    let qText = `Câu ${q.soCau}: ${q.noiDung || ''}`;
    if (q.loaiCauHoi === 1) {
        qText += `\nA. ${q.dapAnA || ''}\nB. ${q.dapAnB || ''}\nC. ${q.dapAnC || ''}\nD. ${q.dapAnD || ''}`;
    } else if (q.loaiCauHoi === 2) {
        qText += `\na) ${q.yA || ''}\nb) ${q.yB || ''}\nc) ${q.yC || ''}\nd) ${q.yD || ''}`;
    }

    const systemInstruction = `Bạn là chuyên gia viết mã Typst sử dụng thư viện CeTZ 0.3.2 để vẽ hình học, đồ thị và hình vẽ toán học/vật lý cho đề thi.
Nhiệm vụ: Chỉ trả về MÃ TYPST THUẦN TÚY trong khối \`\`\`typst ... \`\`\`, không giải thích hay mở đầu/kết thúc gì thêm.

CÁC QUY TẮC CÚ PHÁP QUAN TRỌNG ĐỂ TRÁNH LỖI BIÊN DỊCH:
1. IMPORT VÀ SETUP TRANG:
   Luôn bắt đầu bằng:
   \`\`\`typst
   #import "@preview/cetz:0.3.2": canvas, draw
   #set page(width: auto, height: auto, margin: 0.2cm) // Dùng auto để trang khít hình vẽ, tránh bị cắt
   #canvas({
     import draw: *
     // Các lệnh vẽ ở đây
   })
   \`\`\`

2. TUYỆT ĐỐI KHÔNG DÙNG LỆNH LATEX TRONG TYPST:
   Mã Typst có cú pháp toán riêng (dùng cặp dấu $...$), KHÔNG hỗ trợ các dấu gạch chéo ngược \`\\\` của LaTeX. Hãy dịch LaTeX sang ký hiệu Typst:
   - Dùng [alpha] hoặc [$alpha$] thay vì [$\\alpha$] hay [\\alpha].
   - Dùng [beta] hoặc [$beta$] thay vì [$\\beta$].
   - Dùng [pi] hoặc [$pi$] thay vì [$\\pi$].
   - Dùng [Delta] hoặc [$Delta$] thay vì [$\\Delta$].
   - Dùng [$arrow(a)$] hoặc [$arrow(v)$] thay vì [$\\vec{a}$], [$\\vec{v}$].
   - Dùng [$A B$] hoặc [$triangle A B C$] thay vì [$\\triangle ABC$].
   - Dùng [$<=$], [$>=$], [$times$] thay vì [$\\le$], [$\\ge$], [$\\times$].
   - Dùng [$x^2$], [$y_1$] thay vì [$x^2$], [$y_1$].

3. CÚ PHÁP VẼ CƠ BẢN CỦA CETZ 0.3.2 (TẤT CẢ TỌA ĐỘ PHẢI LÀ TUPLE HAI PHẦN TỬ):
   - Đường thẳng: line((x1, y1), (x2, y2), stroke: 1pt + black, mark: (start: none, end: "stealth")) (mark hỗ trợ "stealth", "arrow")
   - Đường tròn: circle((x, y), radius: 1.5, stroke: 1pt + black, fill: none)
   - Hình chữ nhật: rect((x1, y1), (x2, y2), stroke: 1pt + black, fill: none)
   - Nhãn chữ (nhãn điểm, số liệu): content((x, y), [Nhãn], anchor: "north")
     Các anchor hợp lệ: "north", "south", "east", "west", "north-east", "north-west", "south-east", "south-west", "center".
   - Cung tròn (vẽ góc): arc((x, y), start: 0deg, delta: 90deg, radius: 1)
   - Vẽ đường cong/đồ thị: Nên dùng bezier curve: bezier((x1, y1), (x2, y2), (ctrl_x, ctrl_y)) hoặc vẽ nhiều phân đoạn line ngắn liên tiếp để tạo đường cong, tránh dùng gói "plot" phức tạp dễ lỗi.

4. YÊU CẦU THẨM MỸ:
   - Đường nét rõ ràng, phân biệt nét đứt (stroke: (paint: black, dash: "dashed")) cho các nét khuất trong hình học không gian.
   - Nhãn điểm phải nằm lệch ra ngoài hình vẽ một chút (dùng anchor phù hợp hoặc dịch tọa độ của content) để không bị đè lên nét vẽ.
   - Tô màu nhẹ nhàng dễ nhìn (ví dụ: fill: blue.lighten(80%), fill: orange.lighten(90%)).
   - Số liệu và nhãn điểm phải khớp 100% với đề bài được cung cấp.`;

    let userPrompt;
    if (errorContext) {
        userPrompt = `Đoạn mã Typst vẽ hình bị lỗi biên dịch. Hãy phân tích và sửa lại toàn bộ mã.

[CÂU HỎI]:
${qText}

[MÃ TYPST HIỆN TẠI]:
\`\`\`typst
${errorContext.code}
\`\`\`

[THÔNG BÁO LỖI]:
\`\`\`
${errorContext.errorMsg}
\`\`\`

Hãy viết lại toàn bộ đoạn mã Typst đã sửa lỗi hoàn chỉnh (chỉ trả về khối \`\`\`typst ... \`\`\`).`;
    } else {
        userPrompt = `Hãy viết mã Typst để vẽ hình phù hợp với câu hỏi sau:

[CÂU HỎI]:
${qText}

Yêu cầu: Chỉ trả về mã Typst trong khối \`\`\`typst ... \`\`\`. Các nhãn, số liệu trong hình phải khớp chính xác với câu hỏi trên.`;
    }

    return { systemInstruction, userPrompt };
}

/**
 * generateTypstDrawingWithAI — Gọi Gemini API trực tiếp để sinh hoặc sửa mã Typst.
 * @param {Object}      question      - Câu hỏi cần vẽ hình
 * @param {string[]}    apiKeys       - Danh sách Gemini API key
 * @param {string}      selectedModel - Tên model Gemini
 * @param {Object|null} errorContext  - null = sinh mới; { code, errorMsg } = sửa lỗi
 * @returns {Promise<string>}          Mã Typst trả về từ AI
 */
export async function generateTypstDrawingWithAI(question, apiKeys, selectedModel, errorContext) {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error('Chưa cấu hình API Key! Vui lòng thêm Gemini API Key.');
    }
    const ctx = errorContext || null;
    const { systemInstruction, userPrompt } = buildTypstPrompt(question, ctx);
    const realModel = mapModelForApi(selectedModel);
    const actionLabel = ctx ? 'sửa lỗi Typst' : 'sinh mã Typst';
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const apiKey = apiKeys[attempt % apiKeys.length];
        const url = `${GEMINI_API_BASE}/${realModel}:generateContent?key=${apiKey}`;
        console.log(`[Typst AI] ${actionLabel} — Thử lần ${attempt + 1}/${MAX_RETRIES}`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: realModel.includes('2.5') ? 8192 : 4096,
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    ],
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData?.error?.message || `HTTP ${response.status}`;
                lastError = new Error(`Lỗi API (${response.status}): ${msg}`);
                if (response.status === 400 || response.status === 404) throw lastError;
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
                    continue;
                }
                throw lastError;
            }

            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!rawText.trim()) throw new Error('AI không trả về nội dung. Thử lại sau.');

            // Trích xuất khối ```typst ... ```
            const typstMatch = rawText.match(/```typst\s*([\s\S]*?)```/);
            if (typstMatch && typstMatch[1] && typstMatch[1].trim()) {
                return typstMatch[1].trim();
            }
            return rawText.trim();

        } catch (err) {
            console.warn(`[Typst AI] Lỗi lần ${attempt + 1}:`, err.message);
            lastError = err;
            if (err.message && (err.message.includes('400') || err.message.includes('404'))) throw err;
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
            }
        }
    }
    throw new Error(`Không thể gọi AI sau ${MAX_RETRIES} lần thử. Lỗi: ${lastError?.message || 'Không rõ'}`);
}

