// src/components/ExamHistoryModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, X, Search, Trash2, RotateCcw, FileDown, Save, 
  Clock, BookOpen, Layers, CheckCircle2, AlertCircle, Sparkles, Filter 
} from 'lucide-react';
import { 
  getHistoryList, saveCurrentToHistory, deleteHistoryItem, 
  clearAllHistory, restoreHistorySnapshot, exportHistoryItemAsJson 
} from '../utils/historyStorage';
import { useToast } from './Toast';

export default function ExamHistoryModal({ isOpen, onClose, onRestoreSuccess }) {
  const [historyList, setHistoryList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isSavingNow, setIsSavingNow] = useState(false);
  const toast = useToast();

  // Tải danh sách lịch sử khi mở modal
  const reloadHistory = () => {
    setHistoryList(getHistoryList());
  };

  useEffect(() => {
    if (isOpen) {
      reloadHistory();
    }
  }, [isOpen]);

  // Lắng nghe sự kiện cập nhật lịch sử từ các nơi khác
  useEffect(() => {
    const handleUpdate = () => reloadHistory();
    window.addEventListener('proexam_history_updated', handleUpdate);
    return () => window.removeEventListener('proexam_history_updated', handleUpdate);
  }, []);

  // Lọc danh sách theo từ khóa tìm kiếm và cấu trúc
  const filteredList = useMemo(() => {
    return historyList.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.monHoc && item.monHoc.toLowerCase().includes(q)) ||
        (item.kyThi && item.kyThi.toLowerCase().includes(q)) ||
        (item.truong && item.truong.toLowerCase().includes(q));

      const matchFilter = filterType === 'all' || item.structureType === filterType;
      return matchQuery && matchFilter;
    });
  }, [historyList, searchQuery, filterType]);

  // Các loại cấu trúc có trong lịch sử để tạo bộ lọc
  const availableStructures = useMemo(() => {
    const types = new Set(historyList.map(item => item.structureType).filter(Boolean));
    return Array.from(types);
  }, [historyList]);

  // Định dạng ngày giờ thân thiện tiếng Việt
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Hôm nay lúc ${timeStr}`;
    }
    const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} · ${dateStr}`;
  };

  // Màu sắc cho huy hiệu cấu trúc
  const getStructureBadge = (type) => {
    if (type === 'Toán 3-2-2-3') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">📐 Toán 3-2-2-3</span>;
    }
    if (type === 'KHTN 4-2-1-3') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-100 text-teal-800 border border-teal-300">🔬 KHTN 4-2-1-3</span>;
    }
    if (type === 'KHTN Vào 10') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-300">🏆 KHTN Vào 10</span>;
    }
    if (type === 'Toán') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-violet-100 text-violet-800 border border-violet-200">📐 Toán</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">📚 {type || 'Chuẩn'}</span>;
  };

  // Xử lý lưu ngay bản hiện tại
  const handleSaveCurrentNow = () => {
    setIsSavingNow(true);
    setTimeout(() => {
      const saved = saveCurrentToHistory('', 'Lưu thủ công');
      setIsSavingNow(false);
      if (saved) {
        reloadHistory();
        toast.success(`Đã lưu bản làm bài vào Lịch sử: "${saved.title}"`);
      } else {
        toast.error('Không thể lưu lịch sử! Vui lòng thử lại.');
      }
    }, 200);
  };

  // Xử lý khôi phục
  const handleRestore = (item) => {
    const confirmMsg = `Bạn có chắc muốn khôi phục đề thi:\n"${item.title}"?\n\nLưu ý: Màn hình làm việc hiện tại sẽ được nạp lại toàn bộ ma trận và câu hỏi của bản lưu này.`;
    if (!window.confirm(confirmMsg)) return;

    const ok = restoreHistorySnapshot(item.snapshot);
    if (ok) {
      toast.success(`Khôi phục thành công: ${item.title}`);
      if (onRestoreSuccess) onRestoreSuccess(item);
      onClose();
    } else {
      toast.error('Lỗi khi khôi phục dữ liệu bản lưu này!');
    }
  };

  // Xử lý xóa 1 mục
  const handleDelete = (id, title) => {
    if (!window.confirm(`Xóa bản lưu "${title}" khỏi lịch sử?`)) return;
    deleteHistoryItem(id);
    reloadHistory();
    toast.info('Đã xóa bản lưu khỏi lịch sử.');
  };

  // Xử lý xóa tất cả
  const handleClearAll = () => {
    if (historyList.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn XÓA TOÀN BỘ ${historyList.length} bản ghi lịch sử làm bài trên trình duyệt không?\nThao tác này không thể hoàn tác!`)) return;
    clearAllHistory();
    reloadHistory();
    toast.info('Đã xóa toàn bộ lịch sử.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <History size={24} className="text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                Lịch Sử Làm Bài Trên Web
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {historyList.length} bản lưu
                </span>
              </h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Xem lại, khôi phục hoặc tải về các đề thi & ma trận bạn đã làm trên trình duyệt này
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Đóng">
            <X size={22} />
          </button>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-grow max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo môn học, kì thi, trường..."
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Bộ lọc cấu trúc */}
          {availableStructures.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer">
                <option value="all">Tất cả cấu trúc</option>
                {availableStructures.map(str => (
                  <option key={str} value={str}>{str}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nhóm nút hành động */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentNow}
              disabled={isSavingNow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 hover:shadow transition-all disabled:opacity-50">
              <Save size={15} />
              <span>{isSavingNow ? 'Đang lưu...' : 'Lưu bản hiện tại ngay'}</span>
            </button>

            {historyList.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                title="Xóa toàn bộ lịch sử">
                <Trash2 size={15} />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            )}
          </div>
        </div>

        {/* LIST CONTAINER */}
        <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-100/50">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Clock size={28} />
              </div>
              <h3 className="font-bold text-slate-700 text-base mb-1">
                {searchQuery ? 'Không tìm thấy bản lưu nào phù hợp' : 'Chưa có bản lưu nào trong lịch sử'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                {searchQuery 
                  ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                  : 'Mỗi khi bạn bấm "Lưu Dự án", "Xuất Word" hoặc bấm nút "Lưu bản hiện tại ngay" ở trên, hệ thống sẽ tự động lưu lại vào đây để bạn mở lại bất kỳ lúc nào.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleSaveCurrentNow}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all">
                  <Save size={14} /> Lưu bài làm hiện tại vào Lịch sử
                </button>
              )}
            </div>
          ) : (
            filteredList.map((item) => {
              const tagColor = item.tag === 'Đã xuất Word'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : item.tag === 'Lưu dự án'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group">
                  
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStructureBadge(item.structureType)}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tagColor}`}>
                        {item.tag || 'Tự động'}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {formatDateTime(item.updatedAt || item.createdAt)}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug line-clamp-1 group-hover:text-purple-700 transition-colors">
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {item.truong && (
                        <span>🏫 {item.truong}</span>
                      )}
                      {item.thoiGian && (
                        <span>⏱️ {item.thoiGian}</span>
                      )}
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Layers size={13} className="text-slate-400" />
                        {item.topicCount || 0} chủ đề
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <BookOpen size={13} className="text-slate-400" />
                        {item.questionCount || 0} câu
                      </span>
                      {item.hasExamQuestions ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={12} /> Đã có đề chi tiết
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Ma trận & Đặc tả
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                    <button
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow transition-all"
                      title="Nạp lại đề này vào ứng dụng">
                      <RotateCcw size={15} />
                      <span>Khôi phục</span>
                    </button>
                    <button
                      onClick={() => exportHistoryItemAsJson(item)}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                      title="Tải file .json dự án về máy">
                      <FileDown size={15} />
                      <span className="hidden sm:inline">JSON</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Xóa bản lưu này">
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 Bản lưu được lưu an toàn trong trình duyệt của bạn (tối đa 30 bản ghi gần nhất).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all">
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
