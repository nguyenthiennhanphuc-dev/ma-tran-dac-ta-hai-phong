import React, { useEffect } from 'react';
import { useExamStore, isKHTNSubject, isMathSubject, isCongNgheSubject } from '../store/useExamStore';
import { FileBadge, RotateCcw } from 'lucide-react';

const DEFAULT_HEADER = {
  soGD: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO...',
  truong: 'TRƯỜNG:.............................',
  kyThi: 'ĐỀ KIỂM TRA ĐỊNH KÌ',
  monHoc: '........................',
  thoiGian: 'làm bài: 45 phút',
  namHoc: '202... - 202...'
};

const isMojibake = (str) => typeof str === 'string' && (/[├┤╖ñ£—ÉÇÈÍ¿»]/.test(str) || /SB╖|TR\s*├|l\s*├ím/i.test(str));

export default function Step1_HeaderInfo() {
  const { examHeader, updateExamHeader, config, updateConfig, toggleTraLoiNgan, examConfig, setCauTrucKHTNVao10, setCauTruc4213, setCauTrucDe, setCauTrucToan3223, setCauTrucToan8_5050, setCauTrucCongNghe8_7030 } = useExamStore();

  // Tự động kiểm tra và dọn dẹp ký tự lỗi font (mojibake) từ localStorage cũ
  useEffect(() => {
    ['soGD', 'truong', 'kyThi', 'thoiGian', 'namHoc'].forEach(field => {
      if (isMojibake(examHeader?.[field])) {
        updateExamHeader(field, DEFAULT_HEADER[field]);
      }
    });
    if (isMojibake(examHeader?.monHoc)) {
      updateExamHeader('monHoc', DEFAULT_HEADER.monHoc);
    }
  }, []);

  const handleResetHeader = () => {
    Object.entries(DEFAULT_HEADER).forEach(([k, v]) => {
      if (k !== 'monHoc' || isMojibake(examHeader?.monHoc)) {
        updateExamHeader(k, v);
      }
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <FileBadge className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Thông tin chung
            </h2>
            <p className="text-sm text-slate-500">Điền thông tin bìa đề thi</p>
          </div>
        </div>

        <button
          onClick={handleResetHeader}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all shadow-sm"
          title="Khôi phục tiêu đề mặc định và làm sạch font chữ"
        >
          <RotateCcw size={14} /> Khôi phục mặc định
        </button>
      </div>

      <div className="bg-slate-50/50 p-6 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-8 justify-between">
        
        {/* Cột Trái: Đơn vị chủ quản */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Sở Giáo dục / Phòng GD:</label>
            <input 
              type="text" 
              value={examHeader.soGD} 
              onChange={(e) => updateExamHeader('soGD', e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium text-slate-800 bg-white transition-all"
              placeholder="VD: SỞ GIÁO DỤC VÀ ĐÀO TẠO HÀ NỘI"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên Trường:</label>
            <input 
              type="text" 
              value={examHeader.truong} 
              onChange={(e) => updateExamHeader('truong', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-medium text-slate-800"
              placeholder="VD: TRƯỜNG THPT CHU VĂN AN"
            />
          </div>
        </div>

        {/* Cột Phải: Thông tin bài thi */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên kỳ thi:</label>
            <input 
              type="text" 
              value={examHeader.kyThi} 
              onChange={(e) => updateExamHeader('kyThi', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-bold text-blue-700 uppercase"
              placeholder="VD: ĐỀ KIỂM TRA GIỮA HỌC KÌ 1"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Môn học:</label>
              <input 
                type="text" 
                value={examHeader.monHoc} 
                onChange={(e) => updateExamHeader('monHoc', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                placeholder="VD: Môn: KHTN 6"
              />
              {isKHTNSubject(examHeader.monHoc) && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🔬</span> Cấu trúc đề thi Môn KHTN:
                    </span>
                    <span className="text-[10px] text-slate-500 italic">Chọn 1 trong các cấu trúc chuẩn</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Nút Cấu trúc 4-2-1-3 */}
                    <button
                      type="button"
                      onClick={() => setCauTruc4213()}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        examConfig.isCauTruc4213
                          ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-200 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          📘 Định kì (4-2-1-3)
                        </span>
                        {examConfig.isCauTruc4213 && <span className="text-teal-600 text-[10px] bg-teal-100 px-1.5 py-0.5 rounded">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        CV 4956 • Tự luận 3đ (16 TN + 2 Đ/S + 4 TLN + 3 TL)
                      </span>
                    </button>

                    {/* Nút Cấu trúc Vào 10 Hải Phòng */}
                    <button
                      type="button"
                      onClick={() => setCauTrucKHTNVao10(false)}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        examConfig.isCauTrucKHTNVao10
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-200 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          🎯 Vào 10 Hải Phòng
                        </span>
                        {examConfig.isCauTrucKHTNVao10 && <span className="text-indigo-600 text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        QĐ 1038 HP • 100% TN, 60p (22 TN + 3 Đ/S + 6 TLN)
                      </span>
                    </button>

                    {/* Nút Cấu trúc Khác / Tự do */}
                    <button
                      type="button"
                      onClick={() => setCauTrucDe('3')}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        !examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10
                          ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          ⚙️ Cấu trúc khác / Tự do
                        </span>
                        {!examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10 && <span className="text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        Cấu trúc 3-2-2-3 (TN 7đ + TL 3đ), 3-4-3 (100% TN), hoặc chỉnh tự do
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Panel chọn cấu trúc đề thi Môn Toán */}
              {!isKHTNSubject(examHeader.monHoc) && isMathSubject(examHeader.monHoc) && (
                <div className="mt-2 p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl shadow-sm animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <span>📐</span> Cấu trúc đề thi Môn Toán:
                    </span>
                    <span className="text-[10px] text-purple-600 italic">Chọn cấu trúc chuẩn GDPT 2018</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Nút Cấu trúc Toán Khánh Hòa (3-2-2-3) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCauTrucToan3223();
                        if (!examHeader.thoiGian || examHeader.thoiGian.includes('45')) {
                          updateExamHeader('thoiGian', 'làm bài: 90 phút');
                        }
                      }}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        examConfig.isCauTrucToan3223
                          ? 'bg-purple-100/80 border-purple-500 text-purple-900 ring-2 ring-purple-300 font-bold'
                          : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          ⚡ Toán Khánh Hòa (3-2-2-3)
                        </span>
                        {examConfig.isCauTrucToan3223 && <span className="text-purple-700 text-[10px] bg-purple-200 px-1.5 py-0.5 rounded font-bold">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        12 TN + 2 Đ/S + 4 TLN(0,5đ) + 4 TL (3-2-2-3đ · 90p)
                      </span>
                    </button>

                    {/* Nút Cấu trúc Toán 8 (50% TN - 50% TL) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCauTrucToan8_5050();
                        if (!examHeader.thoiGian || examHeader.thoiGian.includes('45')) {
                          updateExamHeader('thoiGian', 'làm bài: 90 phút');
                        }
                      }}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        examConfig.isCauTrucToan8_5050
                          ? 'bg-indigo-100/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-300 font-bold'
                          : 'bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          📐 Toán 8 (50% TN - 50% TL)
                        </span>
                        {examConfig.isCauTrucToan8_5050 && <span className="text-indigo-700 text-[10px] bg-indigo-200 px-1.5 py-0.5 rounded font-bold">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        12 TN + 1 Đ/S + 4 TLN + 5 TL (3-1-1-5đ · 22 câu)
                      </span>
                    </button>

                    {/* Nút Cấu trúc Khác / Tự do */}
                    <button
                      type="button"
                      onClick={() => setCauTrucDe('3')}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        !examConfig.isCauTrucToan3223 && !examConfig.isCauTrucToan8_5050 && !examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10 && !examConfig.isCauTrucCongNghe8_7030
                          ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          ⚙️ Cấu trúc khác / Tự do
                        </span>
                        {!examConfig.isCauTrucToan3223 && !examConfig.isCauTrucToan8_5050 && !examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10 && !examConfig.isCauTrucCongNghe8_7030 && <span className="text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        Cấu trúc theo Bộ GDĐT hoặc tự do tùy chỉnh điểm
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Panel chọn cấu trúc đề thi Môn Công nghệ */}
              {isCongNgheSubject(examHeader.monHoc) && (
                <div className="mt-2 p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-sm animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>⚙️</span> Cấu trúc đề thi Môn Công nghệ:
                    </span>
                    <span className="text-[10px] text-emerald-600 italic">Chuẩn GDPT 2018 (Hải Phòng / Toàn quốc)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Nút Cấu trúc Công nghệ 8 (70% TN - 30% TL · 45 phút) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCauTrucCongNghe8_7030();
                        updateExamHeader('thoiGian', '45 phút');
                      }}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        examConfig.isCauTrucCongNghe8_7030
                          ? 'bg-emerald-100/90 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300 font-bold'
                          : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          🔧 Công nghệ 8 (70% TN - 30% TL)
                        </span>
                        {examConfig.isCauTrucCongNghe8_7030 && <span className="text-emerald-700 text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-bold">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        12 NLC (3đ) + 4 Đ/S (4đ: 2B+2H) + 2 TL (3đ: C17 2đ VD + C18 1đ VDC) · 45p · 18 câu
                      </span>
                    </button>

                    {/* Nút Cấu trúc Khác / Tự do */}
                    <button
                      type="button"
                      onClick={() => setCauTrucDe('3')}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        !examConfig.isCauTrucCongNghe8_7030 && !examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10 && !examConfig.isCauTrucToan3223 && !examConfig.isCauTrucToan8_5050
                          ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          ⚙️ Cấu trúc khác / Tự do
                        </span>
                        {!examConfig.isCauTrucCongNghe8_7030 && !examConfig.isCauTruc4213 && !examConfig.isCauTrucKHTNVao10 && !examConfig.isCauTrucToan3223 && !examConfig.isCauTrucToan8_5050 && <span className="text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Đang chọn</span>}
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        Tùy chỉnh tự do số điểm các phần hoặc chọn cấu trúc chung
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian:</label>
              <input 
                type="text" 
                value={examHeader.thoiGian} 
                onChange={(e) => updateExamHeader('thoiGian', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                placeholder="VD: 45 phút"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Năm học:</label>
            <input 
              type="text" 
              value={examHeader.namHoc} 
              onChange={(e) => updateExamHeader('namHoc', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-medium text-slate-800"
              placeholder="VD: Năm học: 2024 - 2025"
            />
          </div>
        </div>

      </div>

      {/* Checkbox đánh số liên tục */}
      <div className="mt-4 bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isContinuousNumbering"
            checked={config.isContinuousNumbering}
            onChange={(e) => updateConfig('isContinuousNumbering', e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
          />
          <label htmlFor="isContinuousNumbering" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
            Đánh số câu hỏi liên tục từ 1 đến hết (bỏ tích = reset số câu mỗi phần)
          </label>
        </div>

      </div>
    </div>
  );
}