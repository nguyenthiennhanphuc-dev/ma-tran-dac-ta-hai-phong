# Kế Hoạch: Giữ Nguyên Vị Trí Đáp Án Đúng Khi Sinh Đề Tương Tự

Yêu cầu: Khi sinh câu hỏi tương tự hoặc sinh toàn bộ đề tương đương, vị trí đáp án đúng của câu trắc nghiệm nhiều lựa chọn (A/B/C/D) và chuỗi mệnh đề Đúng/Sai (Đ/S) phải được **giữ nguyên y hệt** so với đề gốc.

## User Review Required

> [!IMPORTANT]
> **Xác nhận Phương pháp thực hiện:**
> Để buộc AI sinh đáp án đúng vào đúng vị trí mong muốn, cách tốt nhất và an toàn nhất (không cần code lại logic trộn đề) là **bổ sung trực tiếp yêu cầu vào Prompt (Câu lệnh)** gửi cho AI. 
> 
> Bạn xem cách tôi bổ sung yêu cầu dưới đây đã hợp lý chưa nhé:
> - **Với Trắc nghiệm 4 lựa chọn:** Cảnh báo AI *"BẮT BUỘC thiết kế câu hỏi sao cho đáp án đúng vẫn nằm ở phương án [A/B/C/D] giống hệt câu gốc."*
> - **Với Trắc nghiệm Đúng/Sai:** Cảnh báo AI *"BẮT BUỘC thiết kế 4 mệnh đề sao cho chuỗi đáp án Đúng/Sai vẫn tuân thủ y hệt như câu gốc là: [ví dụ: a-Đ, b-S, c-S, d-Đ]."*
> 
> Nhờ đó, người dùng không bị "lệch" barem điểm khi chấm thi nếu sử dụng chung một phiếu soi đáp án cho cả 2 đề.

## Proposed Changes

### [MODIFY] `src/utils/prompt_generator.js`
Cập nhật cả 2 hàm: `generateSimilarQuestionPrompt` (Tạo 1 câu) và `generateFullEquivalentExamPrompt` (Tạo cả đề).

**Chi tiết thay đổi:**
1. Đọc dữ liệu `dapAnDung` từ câu hỏi gốc (nằm trong `slotData` hoặc `slot.data`).
2. Gắn thêm cảnh báo in hoa, in đậm vào Prompt:
   - **Nếu là Loại 1 (Nhiều lựa chọn):** 
     Thêm câu: `⚠️ BẮT BUỘC YÊU CẦU: Thiết kế nội dung sao cho ĐÁP ÁN ĐÚNG BẮT BUỘC VẪN LÀ PHƯƠNG ÁN [${dapAnDungGoc}].`
   - **Nếu là Loại 2 (Đúng/Sai):**
     Thêm câu: `⚠️ BẮT BUỘC YÊU CẦU: Thiết kế nội dung sao cho chuỗi mệnh đề đúng/sai BẮT BUỘC VẪN LÀ [${dapAnDungGoc}] (VD: a-Đ, b-S...).`

## Verification Plan
1. **Kiểm tra Prompt Sinh 1 Câu:** Bấm nút đũa thần tạo 1 câu Loại 1 và Loại 2, xem text copy vào Clipboard có chứa câu lệnh ép vị trí đáp án không.
2. **Kiểm tra Prompt Sinh Toàn Đề:** Bấm nút "Tạo Đề Tương Đương", kiểm tra text ở Clipboard xem các câu Loại 1 và Loại 2 có kèm lời nhắc ép vị trí đáp án theo từng câu cụ thể không.
3. **Chạy thử Gemini:** Dán vào Gemini và kiểm chứng AI có nghe lời thiết kế đúng barem cũ không.
