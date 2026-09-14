// src/components/BatchDeleteExamModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, X, Search, CheckSquare, Square, Lock, AlertCircle, CheckCircle2, Filter } from 'lucide-react';

export default function BatchDeleteExamModal({
  isOpen,
  onClose,
  mcqQuestions = [],
  tfQuestions = [],
  saQuestions = [],
  tlQuestions = [],
  examSlots = {},
  lockedSlots = [],
  config = {},
  examConfig = {},
  onClearSlot,
  onClearMultipleSlots,
  onClearAllSlots,
}) {
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Xác định cấu trúc số phần cho tự luận
  const phanTL = config.hasTraLoiNgan ? 4 : 3;

  // Thu thập danh sách toàn bộ câu hỏi trong khung đề
  const allQuestions = useMemo(() => {
    const list = [];
    const knownKeys = new Set();

    // 1. Phần I: Trắc nghiệm 4 lựa chọn
    mcqQuestions.forEach((qChunk, i) => {
      const slotKey = `phan1_cau${i + 1}`;
      knownKeys.add(slotKey);
      const slotData = examSlots[slotKey];
      const isFilled = Boolean(slotData && (slotData.noiDung || slotData.dapAnA || slotData.dapAnDung));
      const cleanSnippet = slotData?.noiDung
        ? slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '').trim()
        : '';

      list.push({
        slotKey,
        partKey: 'phan1',
        partLabel: examConfig.isCauTruc4213 ? 'Phần I' : 'Phần I',
        partName: examConfig.isCauTruc4213 ? 'Trắc nghiệm nhiều lựa chọn' : 'Trắc nghiệm 4 phương án',
        qNum: i + 1,
        title: `Câu ${i + 1} (Phần I)`,
        topic: qChunk[0]?.topic || '',
        level: qChunk[0]?.level || '',
        data: slotData,
        isFilled,
        isLocked: lockedSlots.includes(slotKey),
        snippet: cleanSnippet
      });
    });

    // 2. Phần II: Đúng / Sai
    tfQuestions.forEach((qChunk, i) => {
      const slotKey = `phan2_cau${i + 1}`;
      knownKeys.add(slotKey);
      const slotData = examSlots[slotKey];
      const isFilled = Boolean(slotData && (slotData.noiDung || slotData.yA || slotData.dapAnDung));
      const yPreview = [slotData?.yA, slotData?.yB, slotData?.yC, slotData?.yD]
        .filter(Boolean)
        .map((y, idx) => `${['a', 'b', 'c', 'd'][idx]}) ${y}`)
        .join(' • ');
      const cleanSnippet = slotData?.noiDung
        ? `${slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '').trim()} ${yPreview ? `[${yPreview}]` : ''}`
        : yPreview;

      list.push({
        slotKey,
        partKey: 'phan2',
        partLabel: 'Phần II',
        partName: 'Trắc nghiệm đúng sai',
        qNum: i + 1,
        title: `Câu ${i + 1} (Phần II)`,
        topic: qChunk[0]?.topic || '',
        level: qChunk[0]?.level || '',
        data: slotData,
        isFilled,
        isLocked: lockedSlots.includes(slotKey),
        snippet: cleanSnippet
      });
    });

    // 3. Phần III: Trả lời ngắn
    saQuestions.forEach((qChunk, i) => {
      const slotKey = `phan3_cau${i + 1}`;
      knownKeys.add(slotKey);
      const slotData = examSlots[slotKey];
      const isFilled = Boolean(slotData && (slotData.noiDung || slotData.dapAnDung));
      const cleanSnippet = slotData?.noiDung
        ? `${slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '').trim()} ${slotData.dapAnDung ? `[Đ/A: ${slotData.dapAnDung}]` : ''}`
        : '';

      list.push({
        slotKey,
        partKey: 'phan3',
        partLabel: 'Phần III',
        partName: 'Trả lời ngắn',
        qNum: i + 1,
        title: `Câu ${i + 1} (Phần III)`,
        topic: qChunk[0]?.topic || '',
        level: qChunk[0]?.level || '',
        data: slotData,
        isFilled,
        isLocked: lockedSlots.includes(slotKey),
        snippet: cleanSnippet
      });
    });

    // 4. Phần IV (hoặc III nếu không có trả lời ngắn): Tự luận
    tlQuestions.forEach((qChunk, i) => {
      const slotKey = `phan${phanTL}_cau${i + 1}`;
      knownKeys.add(slotKey);
      const slotData = examSlots[slotKey];
      const isFilled = Boolean(slotData && (slotData.noiDung || slotData.yA || slotData.yB));
      const yPreview = [slotData?.yA, slotData?.yB, slotData?.yC]
        .filter(Boolean)
        .map((y, idx) => `${['a', 'b', 'c'][idx]}) ${y}`)
        .join(' • ');
      const cleanSnippet = slotData?.noiDung
        ? `${slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '').trim()} ${yPreview ? `[${yPreview}]` : ''}`
        : yPreview;

      list.push({
        slotKey,
        partKey: 'phan4',
        partLabel: examConfig.isCauTruc4213 ? 'Phần IV' : (config.hasTraLoiNgan ? 'Phần IV' : 'Phần III'),
        partName: 'Tự luận',
        qNum: i + 1,
        title: `Câu ${i + 1} (${examConfig.isCauTruc4213 ? 'Phần IV' : 'Tự luận'})`,
        topic: qChunk[0]?.topic || '',
        level: qChunk[0]?.level || '',
        data: slotData,
        isFilled,
        isLocked: lockedSlots.includes(slotKey),
        snippet: cleanSnippet
      });
    });

    // 5. Quét thêm các key khác trong examSlots nếu có dữ liệu nhưng chưa thuộc các slot trên
    Object.keys(examSlots).forEach(key => {
      if (!knownKeys.has(key) && examSlots[key]) {
        const slotData = examSlots[key];
        const isFilled = Boolean(slotData && (slotData.noiDung || slotData.dapAnA || slotData.yA));
        list.push({
          slotKey: key,
          partKey: 'other',
          partLabel: 'Khác',
          partName: 'Câu hỏi khác',
          qNum: key,
          title: `Slot: ${key}`,
          topic: '',
          level: '',
          data: slotData,
          isFilled,
          isLocked: lockedSlots.includes(key),
          snippet: slotData?.noiDung || ''
        });
      }
    });

    return list;
  }, [mcqQuestions, tfQuestions, saQuestions, tlQuestions, examSlots, lockedSlots, config.hasTraLoiNgan, examConfig.isCauTruc4213, phanTL]);

  // Danh sách các câu hỏi ĐÃ CÓ NỘI DUNG (để xóa)
  const filledQuestions = useMemo(() => allQuestions.filter(q => q.isFilled), [allQuestions]);

  // Thống kê theo từng phần
  const stats = useMemo(() => {
    const p1 = allQuestions.filter(q => q.partKey === 'phan1');
    const p2 = allQuestions.filter(q => q.partKey === 'phan2');
    const p3 = allQuestions.filter(q => q.partKey === 'phan3');
    const p4 = allQuestions.filter(q => q.partKey === 'phan4');
    return {
      totalFilled: filledQuestions.length,
      totalSlots: allQuestions.length,
      p1Total: p1.length,
      p1Filled: p1.filter(q => q.isFilled).length,
      p2Total: p2.length,
      p2Filled: p2.filter(q => q.isFilled).length,
      p3Total: p3.length,
      p3Filled: p3.filter(q => q.isFilled).length,
      p4Total: p4.length,
      p4Filled: p4.filter(q => q.isFilled).length,
    };
  }, [allQuestions, filledQuestions]);

  // Khởi tạo: Mặc định chọn TẤT CẢ các câu đã điền khi mở modal
  useEffect(() => {
    if (isOpen) {
      setSelectedSlots(new Set(filledQuestions.map(q => q.slotKey)));
      setActiveTab('all');
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lọc câu hỏi theo Tab và Search
  const displayQuestions = filledQuestions.filter(q => {
    if (activeTab !== 'all' && q.partKey !== activeTab) return false;
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const matchText = (q.snippet || '').toLowerCase();
      const matchTopic = (q.topic || '').toLowerCase();
      const matchTitle = (q.title || '').toLowerCase();
      return matchText.includes(term) || matchTopic.includes(term) || matchTitle.includes(term);
    }
    return true;
  });

  // Toggle 1 slot
  const handleToggleSlot = (slotKey) => {
    const next = new Set(selectedSlots);
    if (next.has(slotKey)) {
      next.delete(slotKey);
    } else {
      next.add(slotKey);
    }
    setSelectedSlots(next);
  };

  // Toggle cả một phần (Phần 1, 2, 3, 4)
  const handleTogglePart = (partKey) => {
    const partFilledKeys = allQuestions
      .filter(q => q.partKey === partKey && q.isFilled)
      .map(q => q.slotKey);

    if (partFilledKeys.length === 0) return;

    const allSelected = partFilledKeys.every(k => selectedSlots.has(k));
    const next = new Set(selectedSlots);

    if (allSelected) {
      partFilledKeys.forEach(k => next.delete(k));
    } else {
      partFilledKeys.forEach(k => next.add(k));
    }
    setSelectedSlots(next);
  };

  // Chọn tất cả các câu đang hiển thị
  const handleSelectAllVisible = () => {
    const next = new Set(selectedSlots);
    displayQuestions.forEach(q => next.add(q.slotKey));
    setSelectedSlots(next);
  };

  // Bỏ chọn tất cả các câu đang hiển thị
  const handleDeselectAllVisible = () => {
    const next = new Set(selectedSlots);
    displayQuestions.forEach(q => next.delete(q.slotKey));
    setSelectedSlots(next);
  };

  // Xóa từng câu riêng lẻ trực tiếp trong modal
  const handleClearSingle = (slotKey, title) => {
    if (window.confirm(`Bạn có chắc muốn xóa nội dung ${title}?`)) {
      if (onClearSlot) onClearSlot(slotKey);
      const next = new Set(selectedSlots);
      next.delete(slotKey);
      setSelectedSlots(next);
    }
  };

  // Thực thi xóa các câu đã chọn
  const handleConfirmDelete = () => {
    const count = selectedSlots.size;
    if (count === 0) return;

    const hasLocked = Array.from(selectedSlots).some(k => lockedSlots.includes(k));
    let warnMsg = `Bạn có chắc chắn muốn xóa ${count} câu hỏi đã chọn khỏi khung đề?`;
    if (hasLocked) {
      warnMsg += `\n(Lưu ý: Một số câu hỏi đang được khóa sẽ tự động được mở khóa khi xóa).`;
    }

    if (window.confirm(warnMsg)) {
      if (onClearMultipleSlots) {
        onClearMultipleSlots(Array.from(selectedSlots));
      }
      onClose();
    }
  };

  // Thực thi xóa sạch toàn bộ khung đề
  const handleConfirmClearAll = () => {
    if (stats.totalFilled === 0) {
      alert("Khung đề hiện đang trống, không có câu hỏi nào để xóa!");
      return;
    }

    if (window.confirm(`⚠️ CẢNH BÁO NGUY HIỂM:\nBạn có chắc chắn muốn XÓA SẠCH TOÀN BỘ ${stats.totalFilled} câu hỏi trong toàn bộ khung đề thi không?\n\nThao tác này sẽ làm trống toàn bộ đề để điền lại từ đầu.`)) {
      if (onClearAllSlots) {
        onClearAllSlots();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Trash2 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Xóa Nhiều Câu Hỏi Trong Khung Đề
              </h2>
              <p className="text-xs text-red-100 font-normal">
                Chọn các câu hỏi cần làm trống nội dung để điền lại hoặc sinh đề mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white font-bold"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* CÁC THẺ CHỌN NHANH THEO PHẦN (Phần 1, 2, 3, 4) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>⚡ Chọn nhanh theo Phần:</span>
            <span className="text-slate-400 font-normal lowercase">(bấm để bật/tắt toàn bộ câu hỏi trong phần)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Phần 1 */}
            {stats.p1Total > 0 && (
              <button
                type="button"
                onClick={() => handleTogglePart('phan1')}
                disabled={stats.p1Filled === 0}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  stats.p1Filled === 0
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                    : allQuestions.filter(q => q.partKey === 'phan1' && q.isFilled).every(q => selectedSlots.has(q.slotKey))
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm ring-2 ring-rose-300/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs">Phần I: Trắc nghiệm</span>
                  {stats.p1Filled > 0 && (
                    <span className="text-[11px]">
                      {allQuestions.filter(q => q.partKey === 'phan1' && q.isFilled).every(q => selectedSlots.has(q.slotKey)) ? '☑️' : '⬜'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.p1Filled}/{stats.p1Total} câu có nội dung
                </span>
              </button>
            )}

            {/* Phần 2 */}
            {stats.p2Total > 0 && (
              <button
                type="button"
                onClick={() => handleTogglePart('phan2')}
                disabled={stats.p2Filled === 0}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  stats.p2Filled === 0
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                    : allQuestions.filter(q => q.partKey === 'phan2' && q.isFilled).every(q => selectedSlots.has(q.slotKey))
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm ring-2 ring-rose-300/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs">Phần II: Đúng/Sai</span>
                  {stats.p2Filled > 0 && (
                    <span className="text-[11px]">
                      {allQuestions.filter(q => q.partKey === 'phan2' && q.isFilled).every(q => selectedSlots.has(q.slotKey)) ? '☑️' : '⬜'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.p2Filled}/{stats.p2Total} câu có nội dung
                </span>
              </button>
            )}

            {/* Phần 3 */}
            {stats.p3Total > 0 && (
              <button
                type="button"
                onClick={() => handleTogglePart('phan3')}
                disabled={stats.p3Filled === 0}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  stats.p3Filled === 0
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                    : allQuestions.filter(q => q.partKey === 'phan3' && q.isFilled).every(q => selectedSlots.has(q.slotKey))
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm ring-2 ring-rose-300/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs">Phần III: Trả lời ngắn</span>
                  {stats.p3Filled > 0 && (
                    <span className="text-[11px]">
                      {allQuestions.filter(q => q.partKey === 'phan3' && q.isFilled).every(q => selectedSlots.has(q.slotKey)) ? '☑️' : '⬜'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.p3Filled}/{stats.p3Total} câu có nội dung
                </span>
              </button>
            )}

            {/* Phần 4 / Tự luận */}
            {stats.p4Total > 0 && (
              <button
                type="button"
                onClick={() => handleTogglePart('phan4')}
                disabled={stats.p4Filled === 0}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  stats.p4Filled === 0
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                    : allQuestions.filter(q => q.partKey === 'phan4' && q.isFilled).every(q => selectedSlots.has(q.slotKey))
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm ring-2 ring-rose-300/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs">Phần IV: Tự luận</span>
                  {stats.p4Filled > 0 && (
                    <span className="text-[11px]">
                      {allQuestions.filter(q => q.partKey === 'phan4' && q.isFilled).every(q => selectedSlots.has(q.slotKey)) ? '☑️' : '⬜'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.p4Filled}/{stats.p4Total} câu có nội dung
                </span>
              </button>
            )}
          </div>
        </div>

        {/* THANH TAB LỌC & TÌM KIẾM */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({stats.totalFilled})
            </button>
            {stats.p1Total > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('phan1')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'phan1'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phần I ({stats.p1Filled})
              </button>
            )}
            {stats.p2Total > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('phan2')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'phan2'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phần II ({stats.p2Filled})
              </button>
            )}
            {stats.p3Total > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('phan3')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'phan3'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phần III ({stats.p3Filled})
              </button>
            )}
            {stats.p4Total > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('phan4')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'phan4'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phần IV ({stats.p4Filled})
              </button>
            )}
          </div>

          {/* Ô tìm kiếm & Chọn nhanh */}
          <div className="flex items-center gap-3 flex-1 justify-end min-w-[240px]">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo nội dung / chủ đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-rose-400 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
              >
                Chọn hết
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAllVisible}
                className="text-slate-500 hover:text-slate-700 font-bold hover:underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* DANH SÁCH CÂU HỎI */}
        <div className="p-4 flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[50vh]">
          {displayQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle size={36} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-sm">
                {filledQuestions.length === 0
                  ? 'Khung đề hiện chưa có câu hỏi nào được điền nội dung.'
                  : 'Không tìm thấy câu hỏi nào phù hợp với bộ lọc hiện tại.'}
              </p>
            </div>
          ) : (
            displayQuestions.map(q => {
              const isChecked = selectedSlots.has(q.slotKey);

              return (
                <div
                  key={q.slotKey}
                  className={`p-3 rounded-xl transition-all flex items-start gap-3 select-none mb-1.5 border ${
                    isChecked
                      ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSlot(q.slotKey)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </label>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleToggleSlot(q.slotKey)}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-xs text-slate-800">
                        {q.title}
                      </span>

                      {q.topic && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium truncate max-w-[200px]">
                          {q.topic}
                        </span>
                      )}

                      {q.level && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                          {q.level}
                        </span>
                      )}

                      {q.isLocked && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                          <Lock size={10} /> Đã khóa
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {q.snippet || <span className="italic text-slate-400">(Chưa có nội dung xem trước)</span>}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClearSingle(q.slotKey, q.title)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title={`Xóa ngay ${q.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Nút xóa sạch toàn bộ */}
          <button
            type="button"
            onClick={handleConfirmClearAll}
            className="text-xs text-red-600 hover:text-red-800 hover:underline font-bold flex items-center gap-1.5 py-1 px-2 rounded hover:bg-red-50 transition-colors cursor-pointer"
            title="Xóa toàn bộ nội dung của tất cả các câu hỏi trong đề thi"
          >
            <Trash2 size={14} /> Xóa sạch toàn bộ khung đề ({stats.totalFilled} câu)
          </button>

          {/* Các nút hành động chính */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={selectedSlots.size === 0}
              onClick={handleConfirmDelete}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                selectedSlots.size > 0
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-rose-200 hover:shadow-md cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={14} />
              <span>Xóa {selectedSlots.size} câu đã chọn</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
