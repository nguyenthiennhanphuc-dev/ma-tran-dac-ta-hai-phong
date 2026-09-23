import React, { useState, useEffect } from 'react';
import { Settings2, X, CheckCircle2, AlertTriangle, Sparkles, BookOpen, Layers, RotateCcw } from 'lucide-react';

export default function DungSaiConfigModal({ show, onClose, matrix = [], dungSaiConfig = {}, setDungSaiConfig, isKHTN = true, isCauTrucToan3223 = false }) {
  const defaultLabel1 = isCauTrucToan3223 ? 'Câu 13' : 'Câu 1';
  const defaultLabel2 = isCauTrucToan3223 ? 'Câu 14' : 'Câu 2';

  const [localConfig, setLocalConfig] = useState({
    enabled: false,
    mode: 'phan_tan_chu_de',
    questions: [
      { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
      { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
    ]
  });

  useEffect(() => {
    if (dungSaiConfig && dungSaiConfig.questions) {
      setLocalConfig(JSON.parse(JSON.stringify(dungSaiConfig)));
    } else {
      setLocalConfig({
        enabled: false,
        mode: 'phan_tan_chu_de',
        questions: [
          { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
          { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
        ]
      });
    }
  }, [show, dungSaiConfig, isCauTrucToan3223]);

  if (!show) return null;

  const topics = matrix || [];
  const q1 = localConfig.questions?.[0] || { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' };
  const q2 = localConfig.questions?.[1] || { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' };

  const updateQuestion = (qIdx, field, value) => {
    const nextQuestions = [...(localConfig.questions || [])];
    if (!nextQuestions[qIdx]) return;
    
    // Nếu đổi topic, reset dvktIndex
    if (field === 'topicIndex') {
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        topicIndex: value === '' ? null : Number(value),
        dvktIndex: null
      };
    } else if (field === 'dvktIndex') {
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        dvktIndex: value === '' ? null : Number(value)
      };
    } else {
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        [field]: value
      };
    }

    setLocalConfig(prev => ({
      ...prev,
      enabled: true,
      questions: nextQuestions
    }));
  };

  const applyPreset = (presetType) => {
    if (presetType === 'chuan_su_pham') {
      setLocalConfig({
        enabled: false,
        mode: 'phan_tan_chu_de',
        questions: [
          { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
          { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
        ]
      });
    } else if (presetType === 'rai_theo_chu_de') {
      setLocalConfig({
        enabled: true,
        mode: 'phan_tan_chu_de',
        questions: [
          { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cac_bai_cung_chu_de' },
          { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cac_bai_cung_chu_de' },
        ]
      });
    }
  };

  const handleSave = () => {
    if (setDungSaiConfig) {
      setDungSaiConfig(localConfig);
    }
    onClose();
  };

  const handleReset = () => {
    const defaultCfg = {
      enabled: false,
      mode: 'phan_tan_chu_de',
      questions: [
        { id: 'ds_q1', label: defaultLabel1, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
        { id: 'ds_q2', label: defaultLabel2, topicIndex: null, dvktIndex: null, phamVi: 'cung_bai' },
      ]
    };
    setLocalConfig(defaultCfg);
    if (setDungSaiConfig) {
      setDungSaiConfig(defaultCfg);
    }
  };

  // Kiểm tra cảnh báo trùng chủ đề nếu cả 2 câu đều chọn đích danh cùng 1 chủ đề
  const isSameTopicSelected = q1.topicIndex !== null && q2.topicIndex !== null && q1.topicIndex === q2.topicIndex;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Settings2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                Cấu hình Trắc nghiệm Đúng / Sai (Phần II)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                  2 câu · 8 ý · 2.0 điểm
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập phân tán chủ đề và vị trí bài học cho từng câu Đúng/Sai khi Auto-Fill
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          
          {/* NÚT CHỌN NHANH (PRESETS) */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Sparkles size={14} className="text-amber-500" />
              <span>Thiết lập nhanh (1-Click):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => applyPreset('chuan_su_pham')}
                className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  !localConfig.enabled
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <span className="text-xl">🌟</span>
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Chuẩn sư phạm (Khuyên dùng)
                    {!localConfig.enabled && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">Đang chọn</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <strong>{defaultLabel1}</strong> ở Chủ đề A, <strong>{defaultLabel2}</strong> ở Chủ đề B. Mỗi câu trọn vẹn trong 1 bài (ưu tiên bài ≥ 2 tiết để chung ngữ cảnh).
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('rai_theo_chu_de')}
                className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  localConfig.enabled && localConfig.questions?.every(q => q.phamVi === 'cac_bai_cung_chu_de')
                    ? 'border-purple-500 bg-purple-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                <span className="text-xl">🔄</span>
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Rải theo Chủ đề
                    {localConfig.enabled && localConfig.questions?.every(q => q.phamVi === 'cac_bai_cung_chu_de') && (
                      <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-bold">Đang chọn</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Mỗi câu ở 1 chủ đề khác nhau, 4 mệnh đề a, b, c, d rải đều ra các bài khác nhau trong cùng chủ đề đó.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* TOGGLE TÙY BIẾN CHI TIẾT */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span>✍️ Tự chỉ định vị trí từng câu</span>
                {localConfig.enabled && <span className="text-[11px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">Đã bật tùy chỉnh</span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Bật để tự chọn đích danh Chủ đề và Bài học cho từng câu. Tắt để thuật toán tự động phân tán tối ưu.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localConfig.enabled}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* DANH SÁCH 2 CÂU HỎI ĐÚNG / SAI */}
          <div className="flex flex-col gap-3">
            {[q1, q2].map((q, idx) => {
              const selectedTopic = q.topicIndex !== null && q.topicIndex !== undefined && topics[q.topicIndex] ? topics[q.topicIndex] : null;
              const dvList = selectedTopic?.donViKienThuc || [];

              return (
                <div
                  key={q.id || idx}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    localConfig.enabled
                      ? 'border-indigo-200 bg-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 opacity-90'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {q.label || `Câu ${idx + 1}`}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        (4 ý a, b, c, d — 1.0 điểm)
                      </span>
                    </div>

                    {/* Badge trạng thái */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {(isKHTN || isCauTrucToan3223) ? '2 Biết · 1 Hiểu · 1 VD' : '1 Biết · 1 Hiểu · 2 VD'}
                      </span>
                    </div>
                  </div>

                  {/* FORM CẤU HÌNH CHO TỪNG CÂU */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    
                    {/* CỘT 1: CHỌN CHỦ ĐỀ */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <BookOpen size={13} className="text-indigo-600" /> Chủ đề:
                      </label>
                      <select
                        disabled={!localConfig.enabled}
                        value={q.topicIndex !== null && q.topicIndex !== undefined ? q.topicIndex : ''}
                        onChange={(e) => updateQuestion(idx, 'topicIndex', e.target.value)}
                        className={`w-full p-2 rounded-lg border font-medium outline-none transition-all cursor-pointer ${
                          !localConfig.enabled
                            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}
                      >
                        <option value="">
                          {idx === 0 ? '✨ Tự động (Chủ đề có số tiết lớn nhất)' : '✨ Tự động (Khác chủ đề Câu 1)'}
                        </option>
                        {topics.map((t, tIdx) => (
                          <option key={t.id || tIdx} value={tIdx}>
                            CĐ {tIdx + 1}: {t.tenChuDe || `Chủ đề ${tIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CỘT 2: PHẠM VI Ý TRONG CÂU */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <Layers size={13} className="text-indigo-600" /> Phạm vi kiến thức:
                      </label>
                      <select
                        disabled={!localConfig.enabled}
                        value={q.phamVi || 'cung_bai'}
                        onChange={(e) => updateQuestion(idx, 'phamVi', e.target.value)}
                        className={`w-full p-2 rounded-lg border font-medium outline-none transition-all cursor-pointer ${
                          !localConfig.enabled
                            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}
                      >
                        <option value="cung_bai">Trọn vẹn 1 bài (Khuyên dùng - chung ngữ cảnh)</option>
                        <option value="cac_bai_cung_chu_de">Rải đều các bài trong cùng chủ đề</option>
                      </select>
                    </div>

                    {/* CỘT 3: CHỌN BÀI CỤ THỂ (NẾU CHỌN CÙNG BÀI) */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <span>📝 Bài học (ĐVKT):</span>
                      </label>
                      {q.phamVi === 'cac_bai_cung_chu_de' ? (
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 italic text-[11px]">
                          (Rải tự động các bài trong chủ đề)
                        </div>
                      ) : (
                        <select
                          disabled={!localConfig.enabled || q.topicIndex === null || q.topicIndex === undefined}
                          value={q.dvktIndex !== null && q.dvktIndex !== undefined ? q.dvktIndex : ''}
                          onChange={(e) => updateQuestion(idx, 'dvktIndex', e.target.value)}
                          className={`w-full p-2 rounded-lg border font-medium outline-none transition-all cursor-pointer ${
                            !localConfig.enabled || q.topicIndex === null || q.topicIndex === undefined
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        >
                          <option value="">✨ Tự động bài tối ưu (≥ 2 tiết)</option>
                          {dvList.map((dv, dIdx) => (
                            <option key={dv.id || dIdx} value={dIdx}>
                              Bài {dIdx + 1}: {dv.noiDung ? (dv.noiDung.length > 28 ? dv.noiDung.substring(0, 28) + '...' : dv.noiDung) : `Bài ${dIdx + 1}`} ({dv.soTiet || 1}t)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* CẢNH BÁO HOẶC XÁC NHẬN SƯ PHẠM */}
          {isSameTopicSelected ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Lưu ý về phân bổ:</strong> Thầy/Cô đang chỉ định cả <strong>{q1.label || defaultLabel1}</strong> và <strong>{q2.label || defaultLabel2}</strong> vào cùng một Chủ đề. Khuyến nghị nên phân tán 2 câu vào 2 Chủ đề khác nhau để đề thi có độ bao quát tốt nhất.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <strong>Phân bổ tối ưu:</strong> Hệ thống bảo đảm <strong>Câu 1 và Câu 2 nằm ở 2 Chủ đề KHÁC NHAU</strong> (khi đề có từ 2 chủ đề trở lên) và mỗi bài học chỉ nhận tối đa 1 câu Đúng/Sai.
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors border border-slate-200 cursor-pointer"
            title="Khôi phục phân bổ mặc định thông minh"
          >
            <RotateCcw size={14} /> Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              Lưu & Áp dụng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
