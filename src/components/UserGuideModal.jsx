import React, { useState } from 'react';
import { HelpCircle, X, Settings, LayoutGrid, FileText, Wand2, Download, CheckCircle2 } from 'lucide-react';

export default function UserGuideModal() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full shadow-2xl hover:scale-105 transition-transform animate-bounce hover:animate-none"
            >
                <HelpCircle size={24} />
                Hướng dẫn sử dụng
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <HelpCircle className="text-indigo-600" size={28} />
                        Cẩm nang Sử dụng Hệ thống Tạo Đề AI
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Nội dung Hướng dẫn (Cuộn được) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    <p className="text-slate-600 font-medium text-lg text-center mb-4">
                        Hệ thống giúp thầy cô tự động hóa 100% quy trình ra đề thi chuẩn GDPT 2018 chỉ với 5 bước đơn giản.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bước 1 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700">1</span>
                                Cài đặt & Header
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Nhập thông tin cơ bản: Tên Sở/Phòng, Tên Trường, Môn thi, Thời gian làm bài. Sau đó thiết lập điểm số cho từng câu (Ví dụ: Trắc nghiệm 0.25đ/câu).
                            </p>
                        </div>

                        {/* Bước 2 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700">2</span>
                                Lập Ma trận & Đặc tả
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Nhập các Chủ đề và Đơn vị kiến thức. <b>Đặc biệt quan trọng:</b> Hãy dán nội dung <i>"Yêu cầu cần đạt"</i> vào để AI bám sát tiêu chí ra đề. Có thể dùng nút tùy chọn phong cách (Thực tế, Vui nhộn...).
                            </p>
                        </div>

                        {/* Bước 3 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-emerald-700 flex items-center gap-2 mb-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700">3</span>
                                Phân bổ Câu hỏi
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Điền số lượng câu hỏi Nhận biết, Thông hiểu, Vận dụng cho từng Đơn vị kiến thức. <b>Mẹo:</b> Nếu thi 100% trắc nghiệm, hãy tắt công tắc "Tự luận" ở đầu bảng.
                            </p>
                        </div>

                        {/* Bước 4 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-5"><Wand2 size={100} /></div>
                            <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2 mb-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700">4</span>
                                Nhờ AI Sinh Đề (Quan trọng)
                            </h3>
                            <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1">
                                <li>Bấm <b>"Copy Lệnh Ma Trận"</b>.</li>
                                <li>Mở ChatGPT/Gemini, dán lệnh và đính kèm file Sách Giáo Khoa (PDF/Docx).</li>
                                <li>Copy kết quả AI trả về, dán vào khung của phần mềm.</li>
                                <li>Bấm <b>"Bóc tách câu hỏi"</b>, chọn tất cả rồi ấn <b>"Đẩy lên Khung đề"</b>.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Bước 5 */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200 shadow-sm">
                        <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800">5</span>
                            Xuất File Word
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">
                            Tại màn hình "Xem trước Đề thi", thầy cô có thể chỉnh sửa lại nội dung câu hỏi nếu AI làm chưa ưng ý. Kéo xuống dưới cùng để chọn 1 trong 2 nút xuất Word:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                                <span className="block font-bold text-blue-600 mb-1">Môn Xã Hội / Môn Thường</span>
                                <span className="text-xs text-slate-500">Dùng cho Văn, Sử, Địa, GDCD... Bảng biểu chuẩn, không xử lý công thức phức tạp.</span>
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-lg border border-purple-200 ring-1 ring-purple-100">
                                <span className="block font-bold text-purple-600 mb-1">Toán / Lý / Hóa</span>
                                <span className="text-xs text-slate-500">Tự động dịch mã LaTeX thành công thức Equation Toán học nguyên bản của Word.</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Modal */}
                <div className="border-t border-slate-200 bg-white p-4 flex justify-end">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Đã hiểu, Bắt đầu ngay!
                    </button>
                </div>
            </div>
        </div>
    );
}