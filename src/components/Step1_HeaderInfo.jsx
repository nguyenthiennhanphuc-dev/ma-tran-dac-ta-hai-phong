import React from 'react';
import { useExamStore } from '../store/useExamStore';
import { FileBadge } from 'lucide-react';

export default function Step1_HeaderInfo() {
  const { examHeader, updateExamHeader, config, updateConfig, toggleTraLoiNgan } = useExamStore();

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
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
                placeholder="VD: Môn: Toán 10"
              />
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