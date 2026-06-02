import React, { useState, useEffect } from 'react';
import { useExamStore } from '../store/useExamStore';
import { Key, Eye, EyeOff, CheckCircle2, ShieldCheck, Cpu, Save } from 'lucide-react';

export default function SystemSettings() {
  const { geminiApiKeys, selectedModel, updateApiSettings } = useExamStore();

  const [keysInput, setKeysInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (geminiApiKeys && geminiApiKeys.length > 0) {
      setKeysInput(geminiApiKeys.join('\n'));
    }
  }, [geminiApiKeys]);

  const handleSaveKeys = () => {
    const keysArray = keysInput.split('\n').map(k => k.trim()).filter(k => k !== '');
    // Truyền chính xác tên model, không thêm bất kỳ hậu tố nào
    updateApiSettings(keysArray, selectedModel || 'gemini-2.0-flash');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    // Truyền chính xác tên model được chọn, không chỉnh sửa gì thêm
    updateApiSettings(geminiApiKeys, newModel);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="w-full mb-8 p-6 bg-slate-50 border-2 border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b pb-3 border-slate-200">
        <Key className="text-slate-800" size={24} />
        <h2 className="text-xl font-bold text-slate-800 uppercase">Cài đặt Hệ thống AI</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Khối chọn Model */}
        <div className="col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-inner h-fit">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <Cpu size={18} className="text-blue-600" />
            Phiên bản Trí tuệ nhân tạo
          </label>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Sử dụng tên model chuẩn xác theo API v1beta của Google. Chọn bản Flash để có tốc độ và độ ổn định tốt nhất.
          </p>
          <select
            value={selectedModel || 'gemini-2.0-flash'}
            onChange={handleModelChange}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-blue-800 cursor-pointer"
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Nhanh nhất - Khuyên dùng)</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Nhẹ, tiết kiệm)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Hạn mức miễn phí lớn)</option>
          </select>
        </div>

        {/* Khối nhập API Key */}
        <div className="col-span-1 md:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              Danh sách Google Gemini API Key <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded"
            >
              {showKey ? <><EyeOff size={14} /> Ẩn Key</> : <><Eye size={14} /> Xem Key</>}
            </button>
          </div>

          <div className="text-sm text-slate-500 mb-4 flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="text-green-600 shrink-0 mt-0.5" size={18} />
            <span>
              Hệ thống hỗ trợ <strong>cơ chế xoay vòng Key (Rotation)</strong>. Dán nhiều API Key vào đây, mỗi Key 1 dòng để tránh bị lỗi quá tải (429).
            </span>
          </div>

          <div className="relative mb-3">
            {showKey ? (
              <textarea
                value={keysInput}
                onChange={(e) => setKeysInput(e.target.value)}
                placeholder="AIzaSy...&#10;AIzaSy...&#10;(Mỗi dòng 1 Key)"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-all min-h-[100px] resize-y"
              />
            ) : (
              <div className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-400 font-mono text-sm flex items-center justify-center min-h-[100px] cursor-not-allowed select-none">
                ••••••••••••••••••••••••••••••••<br />
                (Danh sách Key đang được ẩn)
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="h-6">
              {isSaved && (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium animate-pulse">
                  <CheckCircle2 size={16} /> Đã lưu cài đặt hệ thống!
                </div>
              )}
            </div>
            <button
              onClick={handleSaveKeys}
              disabled={!showKey && keysInput === ''}
              className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-lg shadow hover:bg-slate-900 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} /> Lưu danh sách Key
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}