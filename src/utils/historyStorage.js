// src/utils/historyStorage.js
// Module quản lý lịch sử làm bài / đề thi đã tạo trên Web (localStorage)
// Độc lập hoàn toàn, an toàn bộ nhớ và không ảnh hưởng tới dữ liệu khác.

import { useExamStore } from '../store/useExamStore';

export const HISTORY_STORAGE_KEY = 'PROEXAM_HISTORY_V1';
export const MAX_HISTORY_ITEMS = 30; // Giới hạn tối đa 30 bản ghi để tối ưu dung lượng

/**
 * Tự động phát hiện cấu trúc đề thi từ trạng thái
 */
export const detectStructureType = (state) => {
  const ec = state.examConfig || {};
  const monHoc = state.examHeader?.monHoc || '';

  if (ec.isCauTruc4213) return 'KHTN 4-2-1-3';
  if (ec.isCauTrucKHTNVao10) return 'KHTN Vào 10';
  if (ec.isCauTrucToan3223) return 'Toán 3-2-2-3';
  
  if (/toán|toan|đại số|hình học/i.test(monHoc)) return 'Toán';
  if (/khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(monHoc)) return 'KHTN';
  if (/hóa|hoa học/i.test(monHoc)) return 'Hóa học';
  if (/lý|lí|vật lí/i.test(monHoc)) return 'Vật lí';
  if (/sinh|sinh học/i.test(monHoc)) return 'Sinh học';
  if (/địa|địa lí/i.test(monHoc)) return 'Địa lí';

  return 'Chuẩn GDPT 2018';
};

/**
 * Tính tổng số câu / ý hỏi từ ma trận và câu hỏi
 */
export const computeTotalQuestions = (state) => {
  const matrix = state.matrix || [];
  let count = 0;
  matrix.forEach(t => {
    (t.donViKienThuc || []).forEach(dv => {
      const nlc = (Number(dv.nhieuLuaChon?.biet) || 0) + (Number(dv.nhieuLuaChon?.hieu) || 0) + (Number(dv.nhieuLuaChon?.vanDung) || 0);
      const ds = (Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0);
      const tln = (Number(dv.traLoiNgan?.biet) || 0) + (Number(dv.traLoiNgan?.hieu) || 0) + (Number(dv.traLoiNgan?.vanDung) || 0);
      const tl = (Number(dv.tuLuan?.biet) || 0) + (Number(dv.tuLuan?.hieu) || 0) + (Number(dv.tuLuan?.vanDung) || 0) + (Number(dv.tuLuan?.vanDungCao) || 0);
      count += nlc + (ds > 0 ? ds * 0.25 : 0) + tln + tl;
    });
  });
  return Math.round(count * 10) / 10;
};

/**
 * Lấy toàn bộ danh sách lịch sử (mới nhất lên đầu)
 */
export const getHistoryList = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  } catch (err) {
    console.warn('Lỗi đọc lịch sử làm bài từ localStorage:', err);
    return [];
  }
};

/**
 * Ghi danh sách lịch sử vào localStorage có xử lý an toàn tràn bộ nhớ
 */
const safeSaveHistoryList = (list) => {
  let targetList = list.slice(0, MAX_HISTORY_ITEMS);
  let attempts = 0;

  while (attempts < 5 && targetList.length > 0) {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(targetList));
      // Bắn sự kiện cập nhật để các component lắng nghe (header counter, modal)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('proexam_history_updated', { detail: { count: targetList.length } }));
      }
      return true;
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        // Tràn bộ nhớ: loại bỏ 3 bản ghi cũ nhất và thử lại
        console.warn('LocalStorage đầy, tự động dọn bớt bản ghi lịch sử cũ...');
        targetList = targetList.slice(0, Math.max(1, targetList.length - 3));
        attempts++;
      } else {
        console.error('Lỗi khi ghi lịch sử:', err);
        return false;
      }
    }
  }
  return false;
};

/**
 * Lưu trạng thái làm bài hiện tại vào Lịch sử
 * @param {string} [customTitle] - Tiêu đề tự đặt (tùy chọn)
 * @param {string} [tag] - Nhãn: 'Thủ công' | 'Đã xuất Word' | 'Lưu dự án'
 */
export const saveCurrentToHistory = (customTitle = '', tag = 'Thủ công') => {
  try {
    const state = useExamStore.getState();
    const header = state.examHeader || {};
    
    // Tiêu đề mặc định nếu không truyền
    const autoTitle = customTitle.trim() || 
      `${header.kyThi || 'ĐỀ KIỂM TRA'} - ${header.monHoc || 'Môn học'}${header.truong ? ` (${header.truong})` : ''}`;

    const now = Date.now();
    const structureType = detectStructureType(state);
    const questionCount = computeTotalQuestions(state);
    const hasExamQuestions = Boolean(
      state.examSlots && Object.keys(state.examSlots).some(k => state.examSlots[k]?.noiDung)
    );

    // Snapshot nguyên vẹn toàn bộ dữ liệu làm bài
    const snapshot = {
      examHeader: state.examHeader,
      matrix: state.matrix,
      config: state.config,
      examConfig: state.examConfig,
      tuLuanConfig: state.tuLuanConfig,
      dungSaiConfig: state.dungSaiConfig,
      khtnConfig: state.khtnConfig,
      examSlots: state.examSlots,
      draftQuestions: state.draftQuestions,
      generatedExam: state.generatedExam
    };

    const newRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `hist_${now}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      title: autoTitle,
      monHoc: header.monHoc || '',
      kyThi: header.kyThi || '',
      truong: header.truong || '',
      thoiGian: header.thoiGian || '',
      structureType,
      topicCount: state.matrix?.length || 0,
      questionCount,
      hasExamQuestions,
      tag,
      snapshot
    };

    const currentList = getHistoryList();
    // Thêm vào đầu danh sách
    const updatedList = [newRecord, ...currentList.filter(item => item.id !== newRecord.id)];
    safeSaveHistoryList(updatedList);
    return newRecord;
  } catch (err) {
    console.error('Lỗi khi lưu lịch sử:', err);
    return null;
  }
};

/**
 * Xóa 1 bản ghi khỏi lịch sử
 */
export const deleteHistoryItem = (id) => {
  try {
    const list = getHistoryList();
    const updated = list.filter(item => item.id !== id);
    safeSaveHistoryList(updated);
    return true;
  } catch (err) {
    console.error('Lỗi xóa bản ghi lịch sử:', err);
    return false;
  }
};

/**
 * Xóa toàn bộ lịch sử làm bài
 */
export const clearAllHistory = () => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('proexam_history_updated', { detail: { count: 0 } }));
    }
    return true;
  } catch (err) {
    console.error('Lỗi xóa tất cả lịch sử:', err);
    return false;
  }
};

/**
 * Khôi phục bản ghi lịch sử vào store làm việc hiện tại
 */
export const restoreHistorySnapshot = (snapshot) => {
  if (!snapshot) return false;
  try {
    const current = useExamStore.getState();
    useExamStore.setState({
      examHeader: snapshot.examHeader || current.examHeader,
      matrix: snapshot.matrix || current.matrix,
      config: snapshot.config || current.config,
      examConfig: snapshot.examConfig || current.examConfig,
      tuLuanConfig: snapshot.tuLuanConfig || current.tuLuanConfig,
      dungSaiConfig: snapshot.dungSaiConfig || current.dungSaiConfig,
      khtnConfig: snapshot.khtnConfig || current.khtnConfig,
      examSlots: snapshot.examSlots || {},
      draftQuestions: snapshot.draftQuestions || [],
      generatedExam: snapshot.generatedExam || ''
    });
    return true;
  } catch (err) {
    console.error('Lỗi khôi phục lịch sử:', err);
    return false;
  }
};

/**
 * Tải trực tiếp 1 bản ghi lịch sử thành file JSON dự án
 */
export const exportHistoryItemAsJson = (item) => {
  if (!item || !item.snapshot) return;
  try {
    const blob = new Blob([JSON.stringify(item.snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (item.title || 'Du_An_Ma_Tran')
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
      .slice(0, 40);
    const dateStr = new Date(item.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
    link.download = `${cleanName}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Lỗi xuất file JSON từ lịch sử:', err);
  }
};
