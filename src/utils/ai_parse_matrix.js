// =============================================================================
// Tên file: src/utils/ai_parse_matrix.js
// MÔ TẢ: Gọi Gemini API để bóc tách văn bản MA TRẬN ĐỀ THI thô
//         → trả về mảng matrix[] đúng cấu trúc useQuickStore
// =============================================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// =============================================================================
// SYSTEM PROMPT — BÓC TÁCH MA TRẬN
// =============================================================================
const MATRIX_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích ma trận đề thi theo Chương trình GDPT 2018 Việt Nam.

Nhiệm vụ: Nhận văn bản MA TRẬN ĐỀ THI (có thể được copy từ Word, Excel, bảng text, hoặc bất kỳ định dạng nào), phân tích và trả về JSON THUẦN TÚY (không bọc markdown).

QUY TẮC PHÂN TÍCH:
- Ma trận thường có cấu trúc: Chủ đề → Đơn vị kiến thức → Số câu theo loại và mức độ
- Loại câu hỏi: Nhiều lựa chọn (TN/TNKQ/NLC), Đúng/Sai (ĐS/DS/TF), Trả lời ngắn (TLN/TNgan), Tự luận (TL)
- Mức độ nhận thức: Nhận biết (NB/Biết/B), Thông hiểu (TH/Hiểu/H), Vận dụng (VD), Vận dụng cao (VDC)
- Nếu không rõ loại câu, đặt vào "nhieuLuaChon"
- Nếu không có số tiết, đặt soTiet = 1
- Nếu không rõ mức độ, phân bổ đều vào biet/hieu
- Trong trường "tuLuan", ngoài các trường số lượng "biet", "hieu", "vanDung", hãy bóc tách thêm điểm số của các mức độ này vào "diemBiet", "diemHieu", "diemVanDung" nếu văn bản ma trận có ghi rõ số điểm hoặc tỷ lệ điểm tự luận (ví dụ: "1 câu (1,0đ)" -> vanDung = 1, diemVanDung = 1.0. Nếu chỉ ghi số câu/ý không ghi điểm hoặc chỉ ghi điểm chung, hãy tính toán hoặc phân bổ điểm tương ứng dựa trên tổng số câu tự luận để ra điểm từng mức độ. Nếu hoàn toàn không thể xác định điểm, hãy để bằng 0).

OUTPUT FORMAT (JSON THUẦN TÚY — mảng):
[
  {
    "tenChuDe": "Tên chủ đề / chương",
    "donViKienThuc": [
      {
        "noiDung": "Tên bài / đơn vị kiến thức",
        "soTiet": 3,
        "yeuCauCanDat": "",
        "nhieuLuaChon": { "biet": 2, "hieu": 1, "vanDung": 0 },
        "dungSai":      { "biet": 1, "hieu": 1, "vanDung": 1, "vanDungCao": 1 },
        "traLoiNgan":   { "biet": 0, "hieu": 0, "vanDung": 0 },
        "tuLuan":       { "biet": 0, "hieu": 0, "vanDung": 1, "diemBiet": 0, "diemHieu": 0, "diemVanDung": 1.0 }
      }
    ]
  }
]

QUY TẮC BẮT BUỘC:
1. Trả về JSON THUẦN TÚY — TUYỆT ĐỐI KHÔNG bọc trong \`\`\`json ... \`\`\`
2. Đây phải là một MẢNG [] ngay cả khi chỉ có 1 chủ đề
3. Nếu văn bản có cột tổng số câu mà không chia mức độ → phân bổ đều vào biet/hieu/vanDung
4. Ưu tiên giữ nguyên tên chủ đề và tên đơn vị kiến thức từ văn bản gốc`;

// =============================================================================
// HÀM GỌI GEMINI — BÓC TÁCH MA TRẬN
// =============================================================================
export async function parseMatrixFromText(rawText, apiKeys, model = 'gemini-2.0-flash') {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('Chưa có API Key. Vui lòng nhập Gemini API Key trong phần cài đặt.');
  }
  if (!rawText || !rawText.trim()) {
    throw new Error('Vui lòng nhập nội dung ma trận đề thi.');
  }

  let keyIndex = 0;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiKey = apiKeys[keyIndex % apiKeys.length];
    keyIndex++;

    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: MATRIX_SYSTEM_PROMPT }]
          },
          contents: [{
            parts: [{ text: `Đây là văn bản MA TRẬN ĐỀ THI cần bóc tách:\n\n${rawText}` }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 16384,
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
        const errorMessage = errorData?.error?.message || `HTTP ${status}`;
        if (status === 429 || status === 500 || status === 503) {
          lastError = new Error(`[${status}] ${errorMessage}`);
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Lỗi API (${status}): ${errorMessage}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('AI không trả về kết quả. Phản hồi rỗng.');
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
      } catch (jsonError) {
        throw new Error('AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại.');
      }

      if (!Array.isArray(parsed)) {
        if (parsed.matrix && Array.isArray(parsed.matrix)) parsed = parsed.matrix;
        else if (parsed.chuDe && Array.isArray(parsed.chuDe)) parsed = parsed.chuDe;
        else parsed = [parsed]; // wrap single object
      }

      console.log(`[parseMatrixFromText] ✅ Bóc tách thành công: ${parsed.length} chủ đề`);
      return parsed;

    } catch (error) {
      if (error.message.includes('400') || error.message.includes('JSON') || error.message.includes('Model')) {
        throw error;
      }
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Bóc tách thất bại sau ${MAX_RETRIES} lần thử.\n\nLỗi: ${lastError?.message || 'Không rõ'}`);
}
