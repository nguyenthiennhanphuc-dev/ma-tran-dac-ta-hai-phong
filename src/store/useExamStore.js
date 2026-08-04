import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mathIndicators } from '../components/data/mathIndicators';
import { chemistryIndicators } from '../components/data/chemistryIndicators';
import { biologyIndicators } from '../components/data/biologyIndicators';
import { physicsIndicators } from '../components/data/physicsIndicators';
import { geographyIndicators } from '../components/data/geographyIndicators';

// =============================================================================
// HELPER: Phát hiện môn học hiện tại
// =============================================================================
const isMathSubject = (monHoc) => /toán|toan|đại số|hình học|giải tích/i.test(monHoc || '');
const isChemistrySubject = (monHoc) => /hóa|hoa học|hóa học/i.test(monHoc || '');
const isBiologySubject = (monHoc) => /sinh|sinh học/i.test(monHoc || '');
const isPhysicsSubject = (monHoc) => /lý|lí|vật lí|vật lý/i.test(monHoc || '');
const isGeographySubject = (monHoc) => /địa|địa lí|địa lý/i.test(monHoc || '');

// Kiểm tra cấu trúc 4-2-0 (Toán) và có Tự luận để áp dụng bảng đặc tả mẫu mới
const isNewMathStructure = (examConfig, config) => {
  const ec = examConfig || {};
  const c = config || {};
  return (Number(ec.tongDiemP1) === 4) && 
         (Number(ec.tongDiemP2) === 2) && 
         (Number(ec.tongDiemP3) === 0) && 
         c.hasTuLuan;
};

// =============================================================================
// TẠO ĐVKT MẶC ĐỊNH — BÂY GIỜ CHỨA CẢ SỐ LƯỢNG CÂU HỎI
// =============================================================================
const createDefaultDonVi = () => ({
  id: crypto.randomUUID(),
  noiDung: '',
  yeuCauCanDat: '', // <--- THÊM TRƯỜNG YCCĐ CẤP ĐVKT
  soTiet: 1,
  isNuaDauKi: false, // <--- DI CHUYỂN TỪ CẤP CHỦ ĐỀ XUỐNG CẤP ĐVKT
  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
  selectedIndicators: [], // Mã năng lực chỉ báo đã chọn
  indicatorMap: {},       // Gán mã cho từng câu
});

const defaultTopic = {
  id: crypto.randomUUID(),
  tenChuDe: '',
  donViKienThuc: [createDefaultDonVi()],
  yeuCauCanDat: '',
};

// =============================================================================
// THUẬT TOÁN LARGEST REMAINDER METHOD (Số dư lớn nhất) — CHUẨN XÁC
// =============================================================================
const distributeLargestRemainder = (totalItems, weights) => {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights === 0 || totalItems === 0) return weights.map(() => 0);

  let exact = weights.map(w => (w / sumWeights) * totalItems);
  let intPart = exact.map(Math.floor);
  let remainders = exact.map((e, i) => ({ index: i, rem: e - intPart[i] }));

  let unallocated = totalItems - intPart.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.rem - a.rem);

  for (let i = 0; i < unallocated; i++) {
    intPart[remainders[i].index]++;
  }
  return intPart;
};

// Helper: Tính tổng số tiết của 1 Chủ đề từ các ĐVKT bên trong
const getTotalSoTiet = (topic) => {
  if (!topic.donViKienThuc || topic.donViKienThuc.length === 0) {
    return Number(topic.soTiet) || 0;
  }
  return topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv.soTiet) || 0), 0);
};

// =============================================================================
// HELPER: Tính tổng số câu hỏi của 1 Chủ đề = SUM các ĐVKT bên trong
// =============================================================================
const getTopicSum = (topic, type, level) => {
  if (!topic.donViKienThuc) return 0;
  return topic.donViKienThuc.reduce((sum, dv) => {
    const obj = dv[type];
    if (!obj) return sum;
    // Hỗ trợ subItems cho tuLuan (cấu trúc mới)
    if (type === 'tuLuan' && Array.isArray(obj.subItems) && obj.subItems.length > 0) {
      return sum + obj.subItems.filter(s => s.level === level).length;
    }
    return sum + (Number(obj[level]) || 0);
  }, 0);
};

const getTopicTuLuanDiem = (topic, diemField) => {
  if (!topic.donViKienThuc) return 0;
  return topic.donViKienThuc.reduce((sum, dv) => {
    const tl = dv.tuLuan || {};
    // Nếu có subItems (cấu trúc mới), tính từ subItems
    if (Array.isArray(tl.subItems) && tl.subItems.length > 0) {
      const levelMap = { diemBiet: 'biet', diemHieu: 'hieu', diemVanDung: 'vanDung' };
      const level = levelMap[diemField];
      if (level) {
        return sum + tl.subItems.filter(s => s.level === level).reduce((s2, sub) => s2 + (sub.diem || 0), 0);
      }
    }
    // Fallback: dùng field cũ
    return sum + (tl[diemField] ? (Number(tl[diemField]) || 0) : 0);
  }, 0);
};

export const useExamStore = create(
  persist(
    (set, get) => ({
      examHeader: {
        soGD: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO...',
        truong: 'TRƯỜNG:.............................',
        kyThi: 'ĐỀ KIỂM TRA ĐỊNH KÌ',
        monHoc: '........................',
        thoiGian: 'làm bài: 45 phút',
        namHoc: '202... - 202...'
      },
      updateExamHeader: (field, value) => set((state) => ({
        examHeader: { ...state.examHeader, [field]: value }
      })),

      matrix: [{ ...defaultTopic }],

      // State cho tính năng Sinh đề tương đương
      lockedSlots: [],
      toggleLockSlot: (slotKey) => set((state) => ({
        lockedSlots: state.lockedSlots.includes(slotKey)
          ? state.lockedSlots.filter(k => k !== slotKey)
          : [...state.lockedSlots, slotKey]
      })),
      clearLockedSlots: () => set({ lockedSlots: [] }),

      config: {
        diemNhieuLuaChon: 0.25,
        diemDungSai: 0.25,
        diemTraLoiNgan: 0.25,
        diemTuLuan: 1.0,
        hasTraLoiNgan: true,
        hasTuLuan: true,
        isCuoiKi: false,  // false | '30-70' | '25-75' | '20-80' | '2.25-7.75'
        isContinuousNumbering: true, // true = đánh số câu hỏi liên tục từ 1 đến hết, false = reset mỗi phần
        exportTemplate: 'ministry',
        showCompetencySymbol: true, // Toggle ký hiệu năng lực trong bảng đặc tả
        showCompetencyCode: true, // Toggle mã năng lực [HH1.1] trong cột Yêu cầu cần đạt
        groupTfByTopic: false, // Gom 4 ý Đúng/Sai từ các bài khác nhau trong cùng chủ đề
      },

      // =====================================================================
      // CẤU HÌNH TỰ LUẬN CHI TIẾT (số câu, số ý mỗi câu, điểm mỗi ý)
      // =====================================================================
      tuLuanConfig: {
        enabled: false, // true = dùng cấu hình tự do, false = autofill tự tính
        questions: [
          { id: 'tl_q1', label: 'Câu 1', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
          { id: 'tl_q2', label: 'Câu 2', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 1.0 }] },
          { id: 'tl_q3', label: 'Câu 3', kienThuc: '', subItems: [{ diem: 1.0 }] },
          { id: 'tl_q4', label: 'Câu 4', kienThuc: '', subItems: [{ diem: 1.0 }] },
        ],
      },

      setTuLuanConfig: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state.tuLuanConfig) : { ...state.tuLuanConfig, ...updater };
        return { tuLuanConfig: next };
      }),

      // =====================================================================
      // CẤU HÌNH ĐIỂM LINH HOẠT CHO 3 PHẦN TNKQ
      // =====================================================================
      examConfig: {
        tongDiem: 10.0,                        // Tổng điểm toàn bài
        tongDiemP1: 3.0, diemMoiCauP1: 0.25,  // Phần I: TN nhiều lựa chọn
        tongDiemP2: 2.0, diemMoiYP2: 0.25,    // Phần II: Đúng/Sai (điểm 1 ý)
        tongDiemP3: 2.0, diemMoiYP3: 0.25,    // Phần III: Trả lời ngắn (điểm 1 ý)
        diemMoiYTuLuan: 0.5,                  // Điểm mỗi ý Tự luận
        tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
      },

      updateExamConfig: (field, value) => set((state) => ({
        examConfig: { ...state.examConfig, [field]: value }
      })),

      toggleTuLuan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        if (val) {
          // Bật Tự luận -> Cấu hình P2, P3 theo tongDiemP1 hiện tại
          if (p1 === 3.5) {
            // Cấu trúc 3.5 - 2.0 - 1.5 (có Tự luận)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Mặc định: P1-2-2-TL
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 2.0;
          }
        } else {
          // Tắt Tự luận → 100% Trắc nghiệm, chia phần còn lại cho P2+P3
          if (p1 === 3 || p1 === 3.0) {
            // Cấu trúc 3 - 4 - 3
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 3.0;
          } else if (p1 === 3.5) {
            // Cấu trúc 3.5 - 4.0 - 2.5 (100% TN)
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 2.5;
          } else if (p1 === 4.5) {
            // Cấu trúc 4.5 - 4 - 1.5
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else if (p1 === 5.5) {
            // Cấu trúc 5.5 - 3 - 1.5
            newExamConfig.tongDiemP2 = 3.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Fallback: chia đều phần còn lại
            const remaining = 10.0 - p1;
            newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100;
            newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100;
          }
        }
        return {
          config: { ...state.config, hasTuLuan: val },
          examConfig: newExamConfig
        };
      }),

      // Chuyển đổi cấu trúc đề (khi thay đổi dropdown P1)
      setCauTrucDe: (tongDiemP1) => set((state) => {
        const isCauTruc4213 = String(tongDiemP1) === '4.01';
        const p1 = isCauTruc4213 ? 4.0 : (Number(tongDiemP1) || 3.0);
        const newExamConfig = { ...state.examConfig, tongDiemP1: p1, isCauTruc4213 };
        const hasTLN = state.config.hasTraLoiNgan !== false;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === CHẾ ĐỘ CÓ TỰ LUẬN (TL = 3đ) ===
          const tnTotal = 10.0 - 3.0; // TNKQ = 7đ
          if (hasTLN) {
            // Có TLN: P1 + P2 + P3 = 7đ
            if (isCauTruc4213) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              // Mặc định: P1=3, P2=2, P3=2
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else {
            // Không TLN: P1 + P2 = 7đ, P3=0
            if (p1 === 4.0 || p1 === 4) {
              // Cấu trúc Toán 4-2-0 (P1=4đ, P2=2đ, P3=0, TL=4đ)
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 3.5;
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((tnTotal - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        } else {
          // === CHẾ ĐỘ 100% TRẮC NGHIỆM (TN = 10đ) ===
          if (hasTLN) {
            // Có TLN: P1 + P2 + P3 = 10đ
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 3.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 2.5;
            } else if (p1 === 4.0 || p1 === 4) {
              // Cấu trúc Toán 4-2-0 → Tự luận 4đ
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 4.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else if (p1 === 5.5) {
              newExamConfig.tongDiemP2 = 3.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              const remaining = 10.0 - p1;
              newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100;
              newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100;
            }
          } else {
            // Không TLN: P1 + P2 = 10đ, P3=0
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 7.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 6.5;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 4.0 || p1 === 4) {
              newExamConfig.tongDiemP2 = 6.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 4.5) {
              newExamConfig.tongDiemP2 = 5.5;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 5.5) {
              newExamConfig.tongDiemP2 = 4.5;
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((10.0 - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        }
        return { examConfig: newExamConfig };
      }),

      // Toggle Trả lời ngắn - xử lý trong 1 lần set để tránh race condition
      toggleTraLoiNgan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === CÓ TỰ LUẬN (TL = 3đ, TNKQ = 7đ) ===
          const tnTotal = 7.0;
          if (val) {
            // Bật TLN
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else if (p1 === 4.0 || p1 === 4) {
            // Cấu trúc Toán 4-2-0 (TL giữ 4đ)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 0;
          } else {
            // Tắt TLN: P3 → P2, TL giữ nguyên 3đ
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 3.5; // 2.0 + 1.5
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((tnTotal - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        } else {
          // === 100% TRẮC NGHIỆM (TN = 10đ) ===
          if (val) {
            // Bật TLN
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 3.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 2.5;
            } else if (p1 === 4.0 || p1 === 4) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 2.0;
            } else if (p1 === 4.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else if (p1 === 5.5) {
              newExamConfig.tongDiemP2 = 3.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              const remaining = 10.0 - p1;
              newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100;
              newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100;
            }
          } else {
            // Tắt TLN: P3 → P2
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 7.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 6.5;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 4.0 || p1 === 4) {
              newExamConfig.tongDiemP2 = 6.0;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 4.5) {
              newExamConfig.tongDiemP2 = 5.5;
              newExamConfig.tongDiemP3 = 0;
            } else if (p1 === 5.5) {
              newExamConfig.tongDiemP2 = 4.5;
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((10.0 - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        }

        return {
          config: { ...state.config, hasTraLoiNgan: val },
          examConfig: newExamConfig
        };
      }),

      generatedExam: '',
      setGeneratedExam: (text) => set({ generatedExam: text }),

      draftQuestions: [],
      setDraftQuestions: (questions) => set({ draftQuestions: questions }),

      examSlots: {},

      pushToExamSlot: (slotKey, questionData, originalQuestion) => set((state) => ({
        examSlots: { ...state.examSlots, [slotKey]: questionData },
        draftQuestions: state.draftQuestions.filter(q => q !== (originalQuestion || questionData))
      })),

      clearExamSlot: (slotKey) => set((state) => {
        const newSlots = { ...state.examSlots };
        delete newSlots[slotKey];
        return { examSlots: newSlots };
      }),

      updateExamSlot: (slotKey, subKey, value) => set((state) => {
        const oldSlot = state.examSlots[slotKey] || {};
        return {
          examSlots: {
            ...state.examSlots,
            [slotKey]: { ...oldSlot, [subKey]: value }
          }
        };
      }),

      geminiApiKeys: [],
      currentKeyIndex: 0,
      selectedModel: 'gemini-2.0-flash',

      updateApiSettings: (keysArray, model) => set({
        geminiApiKeys: keysArray,
        selectedModel: model,
        currentKeyIndex: 0
      }),

      getAndRotateKey: () => {
        const state = get();
        if (!state.geminiApiKeys || state.geminiApiKeys.length === 0) return null;
        const keyToUse = state.geminiApiKeys[state.currentKeyIndex];
        const nextIndex = (state.currentKeyIndex + 1) % state.geminiApiKeys.length;
        set({ currentKeyIndex: nextIndex });
        return keyToUse;
      },

      updateConfig: (field, value) => set((state) => ({ config: { ...state.config, [field]: value } })),

      updateDonViPhase: (topicId, dvId, isDau) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: topic.donViKienThuc.map(dv => 
              dv.id === dvId ? { ...dv, isNuaDauKi: isDau } : dv
            )
          };
        })
      })),

      // =======================================================================
      // ACTIONS CHO ĐƠN VỊ KIẾN THỨC (ĐVKT)
      // =======================================================================
      addDonVi: (topicId) => set((state) => ({
        matrix: state.matrix.map(topic =>
          topic.id === topicId
            ? { ...topic, donViKienThuc: [...(topic.donViKienThuc || []), createDefaultDonVi()] }
            : topic
        )
      })),

      removeDonVi: (topicId, dvId) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          const filtered = (topic.donViKienThuc || []).filter(dv => dv.id !== dvId);
          return { ...topic, donViKienThuc: filtered.length > 0 ? filtered : [createDefaultDonVi()] };
        })
      })),

      updateDonVi: (topicId, dvId, field, value) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv =>
              dv.id === dvId ? { ...dv, [field]: field === 'soTiet' ? (Number(value) || 0) : value } : dv
            )
          };
        })
      })),

      // Hành động cập nhật YCCĐ cho từng ĐVKT
      updateDvYccd: (topicId, dvId, text) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv =>
              dv.id === dvId ? { ...dv, yeuCauCanDat: text } : dv
            )
          };
        })
      })),

      // Cập nhật mã chỉ báo được chọn cho ĐVKT
      updateDvIndicators: (topicId, dvId, indicators) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv =>
              dv.id === dvId ? { ...dv, selectedIndicators: indicators } : dv
            )
          };
        })
      })),

      importYccdFromAIText: (topicId, rawText) => set((state) => {
        let newMatrix = [...state.matrix];
        const topicIndex = newMatrix.findIndex(t => t.id === topicId);
        if (topicIndex === -1) return state;

        // Chia văn bản thành các dòng
        const lines = rawText.split('\n');
        let currentDvIndex = -1;
        let yccdBlocks = {};

        for (let line of lines) {
          // Dò tìm các dòng tiêu đề có chứa số thứ tự: "1.", "**1.**", "1)", "**1**"
          // Regex này bắt chữ số đứng đầu (có thể bọc bởi dấu in đậm/gạch chân)
          const match = line.match(/^\s*(?:\*\*|__)?(\d+)(?:\.|\))?(?:\*\*|__)?\s+/);

          if (match) {
            const num = parseInt(match[1], 10);
            currentDvIndex = num - 1; // Mảng bắt đầu từ 0
            if (!yccdBlocks[currentDvIndex]) yccdBlocks[currentDvIndex] = [];
          } else {
            // Nếu đang ở trong block của một Bài học và dòng không trống, thì lưu dòng đó lại
            if (currentDvIndex >= 0 && line.trim() !== '') {
              yccdBlocks[currentDvIndex].push(line.trim());
            }
          }
        }

        // Đổ dữ liệu YCCĐ vào đúng ĐVKT tương ứng
        const dvList = newMatrix[topicIndex].donViKienThuc || [];
        dvList.forEach((dv, index) => {
          if (yccdBlocks[index] && yccdBlocks[index].length > 0) {
            dv.yeuCauCanDat = yccdBlocks[index].join('\n');
          }
        });

        return { matrix: newMatrix };
      }),

      // ĐẠI PHẪU: Cập nhật số câu hỏi ở CẤP ĐVKT
      updateDvQuestionCount: (topicId, dvId, type, level, value) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv => {
              if (dv.id !== dvId) return dv;
              return {
                ...dv,
                [type]: { ...(dv[type] || {}), [level]: Number(value) || 0 }
              };
            })
          };
        })
      })),

      // ĐẠI PHẪU: Cập nhật điểm tự luận ở CẤP ĐVKT
      updateDvTuLuanPoint: (topicId, dvId, field, value) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv => {
              if (dv.id !== dvId) return dv;
              return {
                ...dv,
                tuLuan: { ...(dv.tuLuan || {}), [field]: Number(value) || 0 }
              };
            })
          };
        })
      })),

      // --- ACTIONS CHO TỰ LUẬN SUB-ITEMS (linh hoạt điểm theo ý) ---
      addTuLuanSubItem: (topicId, dvId, level) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv => {
              if (dv.id !== dvId) return dv;
              const subItems = dv.tuLuan?.subItems || [];
              const newSub = {
                id: crypto.randomUUID(),
                y: '',
                diem: 0.5,
                level: level || 'biet'
              };
              const updated = { ...(dv.tuLuan || {}), subItems: [...subItems, newSub] };
              // Sync old fields
              updated.biet = updated.subItems.filter(s => s.level === 'biet').length;
              updated.hieu = updated.subItems.filter(s => s.level === 'hieu').length;
              updated.vanDung = updated.subItems.filter(s => s.level === 'vanDung').length;
              updated.diemBiet = Math.round(updated.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              updated.diemHieu = Math.round(updated.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              updated.diemVanDung = Math.round(updated.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              return { ...dv, tuLuan: updated };
            })
          };
        })
      })),

      removeTuLuanSubItem: (topicId, dvId, subItemId) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv => {
              if (dv.id !== dvId) return dv;
              const subItems = (dv.tuLuan?.subItems || []).filter(s => s.id !== subItemId);
              const updated = { ...(dv.tuLuan || {}), subItems };
              // Sync old fields
              updated.biet = updated.subItems.filter(s => s.level === 'biet').length;
              updated.hieu = updated.subItems.filter(s => s.level === 'hieu').length;
              updated.vanDung = updated.subItems.filter(s => s.level === 'vanDung').length;
              updated.diemBiet = Math.round(updated.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              updated.diemHieu = Math.round(updated.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              updated.diemVanDung = Math.round(updated.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              return { ...dv, tuLuan: updated };
            })
          };
        })
      })),

      updateTuLuanSubItem: (topicId, dvId, subItemId, field, value) => set((state) => ({
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            donViKienThuc: (topic.donViKienThuc || []).map(dv => {
              if (dv.id !== dvId) return dv;
              const subItems = (dv.tuLuan?.subItems || []).map(s =>
                s.id === subItemId ? { ...s, [field]: value } : s
              );
              // Auto-sync old fields for backward compatibility
              const newTuLuan = { ...(dv.tuLuan || {}), subItems };
              newTuLuan.biet = subItems.filter(s => s.level === 'biet').length;
              newTuLuan.hieu = subItems.filter(s => s.level === 'hieu').length;
              newTuLuan.vanDung = subItems.filter(s => s.level === 'vanDung').length;
              newTuLuan.diemBiet = Math.round(subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              newTuLuan.diemHieu = Math.round(subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              newTuLuan.diemVanDung = Math.round(subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
              return { ...dv, tuLuan: newTuLuan };
            })
          };
        })
      })),

      autoFillMatrix: () => set((state) => {
        const topics = JSON.parse(JSON.stringify(state.matrix));
        topics.forEach(t => {
          t.donViKienThuc.forEach(dv => {
            dv.nhieuLuaChon = { biet: 0, hieu: 0, vanDung: 0 };
            dv.dungSai = { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 };
            dv.traLoiNgan = { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 };
            dv.tuLuan = { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] };
            dv.indicatorMap = {}; // Reset mapping cũ
          });
        });

        const tongSoTietToanBai = topics.reduce((sum, t) =>
          sum + t.donViKienThuc.reduce((s, dv) => s + (Number(dv.soTiet) || 0), 0), 0);

        if (tongSoTietToanBai === 0) {
          alert("Vui lòng nhập 'Số tiết' lớn hơn 0!");
          return {};
        }

        const ec = state.examConfig;
        const dP1 = Number(ec.diemMoiCauP1) || 0.25;
        const dP2 = Number(ec.diemMoiYP2) || 0.25;
        const dP3 = Number(ec.diemMoiYP3) || 0.25;
        const dTL = Number(ec.diemMoiYTuLuan) || 0.5;

        let pool = [];
        let tuLuanPool = []; // Pool riêng cho tự luận để ưu tiên phân bổ
        const addPool = (type, lvl, count, pts) => {
          for (let i = 0; i < count; i++) pool.push({ type, lvl, pts: Math.round(pts * 100) / 100 });
        };
        const addTuLuanPool = (lvl, pts, qLabel = '') => {
          tuLuanPool.push({ type: 'tuLuan', lvl, pts: Math.round(pts * 100) / 100, qLabel });
        };

        const tP1 = Number(ec.tongDiemP1) || 0.0;
        const tP2 = Number(ec.tongDiemP2) || 0.0;
        const tP3 = state.config.hasTraLoiNgan ? (Number(ec.tongDiemP3) || 0.0) : 0;
        const tTL = state.config.hasTuLuan ? (10 - tP1 - tP2 - tP3) : 0;

        // === CÂN ĐỐI TỔNG THỂ THEO TỈ LỆ 40-30-30 ===
        const tiLe = state.examConfig.tiLeNhanThuc || { biet: 40, hieu: 30, vanDung: 30 };
        const tongDiemDe = 10.0;
        const tongDiemBiet = Math.round(tongDiemDe * tiLe.biet / 100 * 100) / 100;
        const tongDiemHieu = Math.round(tongDiemDe * tiLe.hieu / 100 * 100) / 100;
        const tongDiemVanDung = Math.round((tongDiemDe - tongDiemBiet - tongDiemHieu) * 100) / 100;

        console.log(`🎯 Tỉ lệ tổng thể: ${tiLe.biet}% Biết (${tongDiemBiet}đ), ${tiLe.hieu}% Hiểu (${tongDiemHieu}đ), ${tiLe.vanDung}% Vận dụng (${tongDiemVanDung}đ)`);

        // === BƯỚC 1: CHIA TỪ LUẬN TRƯỚC THEO TỈ LỆ TỔNG THỂ ===
        let tlBiet = 0, tlHieu = 0, tlVanDung = 0;
        if (tTL > 0) {
          tlBiet = Math.round((tTL * tiLe.biet / 100) * 100) / 100;
          tlHieu = Math.round((tTL * tiLe.hieu / 100) * 100) / 100;
          tlVanDung = Math.round((tTL - tlBiet - tlHieu) * 100) / 100;
          console.log(`📘 Tự luận: ${tlBiet}đ Biết, ${tlHieu}đ Hiểu, ${tlVanDung}đ Vận dụng`);
        }

        // === BƯỚC 2: PHÂN BỔ TỪ LUẬN VÀO POOL ===
        if (tTL > 0) {
          const tlCfg = state.tuLuanConfig;
          const hasManualConfig = tlCfg?.enabled && tlCfg?.questions && tlCfg.questions.length > 0 && tlCfg.questions.some(q => q.subItems && q.subItems.length > 0);

          if (hasManualConfig) {
            console.log('🔧 Autofill: Tự luận - chế độ cấu hình thủ công');
            // Thu thập tất cả subItems từ config
            const allSubItems = [];
            tlCfg.questions.forEach((q) => {
              if (q.subItems && q.subItems.length > 0) {
                q.subItems.forEach((sub, subIdx) => {
                  allSubItems.push({
                    pts: Math.round((Number(sub.diem) || 0.5) * 100) / 100,
                    qLabel: q.label || '',
                    subIdx: subIdx
                  });
                });
              }
            });

            const totalItems = allSubItems.length;
            if (totalItems > 0) {
              // Phân bổ số lượng ý theo tỉ lệ 40-30-30
              const counts = distributeLargestRemainder(totalItems, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
              const levels = ['biet', 'hieu', 'vanDung'];

              let assigned = 0;
              for (let li = 0; li < 3; li++) {
                for (let i = 0; i < counts[li]; i++) {
                  const item = allSubItems[assigned++];
                  addTuLuanPool(levels[li], item.pts, item.qLabel);
                }
              }
            }
          } else {
            console.log('🤖 Autofill: Tự luận - chế độ tự động');
            // Xác định số ý sao cho soY × dTL = tTL (ưu tiên đúng tổng điểm)
            const soYTuLuan = Math.max(3, Math.min(10, Math.round(tTL / dTL)));
            // Điểm thực mỗi ý = tTL / soY (có thể không tròn 0.25)
            const diemMoiY = Math.round((tTL / soYTuLuan) * 100) / 100;
            // Phân bổ ý theo tỉ lệ 40-30-30 (bằng số lượng)
            const arrTL = distributeLargestRemainder(soYTuLuan, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
            const levels = ['biet', 'hieu', 'vanDung'];
            let totalAdded = 0;
            let yIdx = 0;
            for (let li = 0; li < 3; li++) {
              for (let i = 0; i < arrTL[li]; i++) {
                yIdx++;
                // Ý cuối cùng (tổng thể): bù sai số để tổng = tTL chính xác
                const pts = (yIdx === soYTuLuan)
                  ? Math.round((tTL - totalAdded) * 100) / 100
                  : diemMoiY;
                addTuLuanPool(levels[li], Math.max(0.25, pts));
                totalAdded += pts;
              }
            }
          }
        }

        // === BƯỚC 3: TÍNH SỐ CÂU ĐÚNG/SAI TRỰC TIẾP ===
        // Mỗi câu ĐS = 4 ý (1B + 1H + 1VD + 1VDC), cố định theo quy định Bộ GD-ĐT
        // Tính trực tiếp từ tổng điểm P2, không qua pool (tránh mất ý do rounding)
        const numTfBlocks = Math.round(tP2 / (dP2 * 4));

        // Điểm ĐS THỰC TẾ per level (VDC gộp vào VD khi tính tỉ lệ nhận thức)
        const dsActualBiet = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualHieu = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualVD   = Math.round(numTfBlocks * dP2 * 2 * 100) / 100; // VD + VDC

        console.log(`📗 Đúng/Sai: ${numTfBlocks} câu × 4 ý = ${numTfBlocks * 4} ý = ${dsActualBiet + dsActualHieu + dsActualVD}đ (B=${dsActualBiet}đ, H=${dsActualHieu}đ, VD=${dsActualVD}đ)`);

        // === TÍNH ĐIỂM TỰ LUẬN THỰC TẾ TỪ POOL (không dùng giá trị lý thuyết) ===
        const tlActualBiet = Math.round(tuLuanPool.filter(p => p.lvl === 'biet').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualHieu = Math.round(tuLuanPool.filter(p => p.lvl === 'hieu').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualVanDung = Math.round(tuLuanPool.filter(p => p.lvl === 'vanDung').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        console.log(`📘 TL thực tế: ${tlActualBiet}đ Biết, ${tlActualHieu}đ Hiểu, ${tlActualVanDung}đ VD (tổng=${Math.round((tlActualBiet+tlActualHieu+tlActualVanDung)*100)/100}đ)`);

        // === BƯỚC 4: TÍNH TARGET CÒN LẠI CHO P1+P3 (dựa trên ĐS + TL THỰC TẾ) ===
        const conLaiBiet = Math.max(0, Math.round((tongDiemBiet - tlActualBiet - dsActualBiet) * 100) / 100);
        const conLaiHieu = Math.max(0, Math.round((tongDiemHieu - tlActualHieu - dsActualHieu) * 100) / 100);
        const conLaiVanDung = Math.max(0, Math.round((tongDiemVanDung - tlActualVanDung - dsActualVD) * 100) / 100);

        console.log(`📊 Target còn lại P1+P3: ${conLaiBiet}đ Biết, ${conLaiHieu}đ Hiểu, ${conLaiVanDung}đ Vận dụng`);

        // === BƯỚC 5: PHÂN BỔ P1 VÀ P3 ĐỂ BÙ ĐẠT 40-30-30 ===
        const tongConLai = conLaiBiet + conLaiHieu + conLaiVanDung;
        if (tongConLai > 0) {
          const soCauP1 = tP1 > 0 ? Math.round(tP1 / dP1) : 0;
          const soCauP3 = tP3 > 0 ? Math.round(tP3 / dP3) : 0;

          let arrP3 = [0, 0, 0];
          let arrP1 = [0, 0, 0];

          // Ưu tiên phân bổ P3 trước vì điểm mỗi câu P3 thường lớn hơn (vd 0.5đ), khó khít điểm hơn P1
          if (soCauP3 > 0) {
            arrP3 = distributeLargestRemainder(soCauP3, [conLaiBiet, conLaiHieu, conLaiVanDung]);
            addPool('traLoiNgan', 'biet', arrP3[0], dP3);
            addPool('traLoiNgan', 'hieu', arrP3[1], dP3);
            addPool('traLoiNgan', 'vanDung', arrP3[2], dP3);
          }

          // Tính lại target điểm CÒN LẠI THỰC TẾ cho P1 sau khi P3 đã chiếm
          const p1TargetBiet = Math.max(0, conLaiBiet - arrP3[0] * dP3);
          const p1TargetHieu = Math.max(0, conLaiHieu - arrP3[1] * dP3);
          const p1TargetVanDung = Math.max(0, conLaiVanDung - arrP3[2] * dP3);

          if (soCauP1 > 0) {
            arrP1 = distributeLargestRemainder(soCauP1, [p1TargetBiet, p1TargetHieu, p1TargetVanDung]);
            addPool('nhieuLuaChon', 'biet', arrP1[0], dP1);
            addPool('nhieuLuaChon', 'hieu', arrP1[1], dP1);
            addPool('nhieuLuaChon', 'vanDung', arrP1[2], dP1);
          }
        }

        // Pool giờ chỉ chứa NLC + TLN (ĐS tính trực tiếp, không qua pool)
        pool.sort((a, b) => b.pts - a.pts);
        const otherItems = pool;

        const flatDvList = [];
        if (state.config.isCuoiKi) {
          const mode = state.config.isCuoiKi;
          let dDau = 2.5, dSau = 7.5;
          if (mode === '20-80') { dDau = 2.0; dSau = 8.0; }
          else if (mode === '2.25-7.75') { dDau = 2.25; dSau = 7.75; }
          else if (mode === '30-70') { dDau = 3.0; dSau = 7.0; }
          let sDau = 0, sSau = 0;
          topics.forEach(t => t.donViKienThuc.forEach(dv => {
            if (dv.isNuaDauKi) sDau += (Number(dv.soTiet) || 0);
            else sSau += (Number(dv.soTiet) || 0);
          }));
          topics.forEach((t, ti) => t.donViKienThuc.forEach((dv, di) => {
            const st = Number(dv.soTiet) || 0;
            let w = 0;
            if (dv.isNuaDauKi && sDau > 0) w = (st / sDau) * (dDau / 10);
            else if (!dv.isNuaDauKi && sSau > 0) w = (st / sSau) * (dSau / 10);
            flatDvList.push({ ti, di, target: w * 10, current: 0 });
          }));
        } else {
          topics.forEach((t, ti) => t.donViKienThuc.forEach((dv, di) => {
            const st = Number(dv.soTiet) || 0;
            flatDvList.push({ ti, di, target: (st / tongSoTietToanBai) * 10, current: 0 });
          }));
        }

        // numTfBlocks đã tính ở bước 3
        if (state.config.groupTfByTopic) {
          // CHẾ ĐỘ GOM THEO CHỦ ĐỀ: Phân bổ 4 ý Đúng/Sai ra các Bài khác nhau trong cùng Chủ đề
          for (let i = 0; i < numTfBlocks; i++) {
            // Tìm chủ đề đang "đói" điểm nhất
            let bestTopicIdx = -1, maxTopicGap = -Infinity;
            topics.forEach((topic, ti) => {
              const topicTarget = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.target, 0);
              const topicCurrent = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.current, 0);
              const gap = topicTarget - topicCurrent;
              if (gap > maxTopicGap) { maxTopicGap = gap; bestTopicIdx = ti; }
            });

            if (bestTopicIdx !== -1) {
              const topicDvs = flatDvList.filter(f => f.ti === bestTopicIdx);
              // Phân bổ 4 ý (B, H, VD, VDC) cho các bài trong chủ đề này (theo gap lớn nhất)
              const levels = ['biet', 'hieu', 'vanDung', 'vanDung'];
              levels.forEach(lvl => {
                let bestDvIdxInTopic = -1, maxDvGap = -Infinity;
                topicDvs.forEach((dvRef, idx) => {
                  const gap = dvRef.target - dvRef.current;
                  if (gap > maxDvGap) { maxDvGap = gap; bestDvIdxInTopic = idx; }
                });
                
                if (bestDvIdxInTopic !== -1) {
                  const targetRef = topicDvs[bestDvIdxInTopic];
                  const dv = topics[targetRef.ti].donViKienThuc[targetRef.di];
                  dv.dungSai[lvl]++;
                  targetRef.current += dP2;
                }
              });
            }
          }
        } else {
          // CHẾ ĐỘ MẶC ĐỊNH: Dồn cả 4 ý vào 1 Bài
          for (let i = 0; i < numTfBlocks; i++) {
            let bestIdx = -1, maxGap = -Infinity;
            flatDvList.forEach((item, idx) => {
              if (item.target <= 0) return;
              const gap = item.target - item.current;
              if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
            });
            if (bestIdx !== -1) {
              const { ti, di } = flatDvList[bestIdx];
              const dv = topics[ti].donViKienThuc[di];
              dv.dungSai.biet++; dv.dungSai.hieu++; dv.dungSai.vanDung += 2;
              flatDvList[bestIdx].current += dP2 * 4;
            }
          }
        }

        // === ƯU TIÊN PHÂN BỔ TỰ LUẬN TRƯỚC ===
        console.log('🎯 Autofill: Phân bổ tự luận trước (ưu tiên)');
        tuLuanPool.forEach(item => {
          let bestIdx = -1, maxGap = -Infinity;
          flatDvList.forEach((u, idx) => {
            if (u.target <= 0) return;
            const gap = u.target - u.current;
            if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
          });
          if (bestIdx === -1) return;
          const { ti, di } = flatDvList[bestIdx];
          const dv = topics[ti].donViKienThuc[di];
          // Luôn tạo subItem với điểm chính xác từ pool
          if (!Array.isArray(dv.tuLuan.subItems)) dv.tuLuan.subItems = [];
          dv.tuLuan.subItems.push({
            id: crypto.randomUUID(),
            y: '',
            diem: Math.round(item.pts * 100) / 100,
            level: item.lvl
          });
          // Sync old fields từ subItems (để backward compat)
          dv.tuLuan.biet = dv.tuLuan.subItems.filter(s => s.level === 'biet').length;
          dv.tuLuan.hieu = dv.tuLuan.subItems.filter(s => s.level === 'hieu').length;
          dv.tuLuan.vanDung = dv.tuLuan.subItems.filter(s => s.level === 'vanDung').length;
          dv.tuLuan.diemBiet = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemHieu = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemVanDung = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          flatDvList[bestIdx].current += item.pts;
        });

        // === SAU ĐÓ MỚI PHÂN BỔ CÁC LOẠI CÂU KHÁC ===
        console.log('📝 Autofill: Phân bổ các loại câu khác');
        otherItems.forEach(item => {
          let bestIdx = -1, maxGap = -Infinity;
          flatDvList.forEach((u, idx) => {
            if (u.target <= 0) return;
            const gap = u.target - u.current;
            if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
          });
          if (bestIdx === -1) return;
          const { ti, di } = flatDvList[bestIdx];
          const dv = topics[ti].donViKienThuc[di];
          // Chỉ xử lý các loại câu không phải tự luận (đã xử lý riêng ở trên)
          dv[item.type][item.lvl]++;
          flatDvList[bestIdx].current += item.pts;
        });

        // === GÁN MÃ NĂNG LỰC CHỈ BÁO VÀ SỐ THỨ TỰ CÂU HỎI TỰ ĐỘNG ===
        console.log('🔗 Autofill: Gán mã năng lực và nhãn câu hỏi');
        
        const isContinuous = state.config.isContinuousNumbering;
        const numP1 = Math.round(tP1 / dP1);
        const numP2 = Math.round(tP2 / (dP2 * 4));
        const numP3 = Math.round(tP3 / dP3);

        let p1GlobalCounter = 1;
        let p2GlobalCounter = isContinuous ? (p1GlobalCounter + numP1) : 1;
        let p3GlobalCounter = isContinuous ? (p2GlobalCounter + numP2) : 1;
        let tlGlobalCounter = isContinuous ? (p3GlobalCounter + numP3) : 1;

        // Biến đếm số ý cho phần Đúng/Sai (để tính số câu)
        let p2ItemCounter = 0;

        // Tiền tố (Prefix)
        const p1Pre = isContinuous ? 'C' : 'TN';
        const p2Pre = isContinuous ? 'C' : 'ĐS';
        const p3Pre = isContinuous ? 'C' : 'TLN';
        const tlPre = isContinuous ? 'C' : 'TL';

        const globalIndIdx = {
          biet: 0,
          hieu: 0,
          vanDung: 0,
          vanDungCao: 0
        };

        // Ta quét theo từng loại câu hỏi để đảm bảo số thứ tự chạy liên tục trong toàn đề
        ['nhieuLuaChon', 'dungSai', 'traLoiNgan', 'tuLuan'].forEach(type => {
          topics.forEach(t => {
            t.donViKienThuc.forEach(dv => {
              if (!dv.indicatorMap) dv.indicatorMap = {};
              const indicators = dv.selectedIndicators || [];
              
              const isMath = isMathSubject(state.examHeader?.monHoc);
              const isChem = isChemistrySubject(state.examHeader?.monHoc);
              const isBio = isBiologySubject(state.examHeader?.monHoc);
              const isPhy = isPhysicsSubject(state.examHeader?.monHoc);
              const isGeo = isGeographySubject(state.examHeader?.monHoc);
              const allSourceData = isMath ? mathIndicators : (isChem ? chemistryIndicators : (isBio ? biologyIndicators : (isPhy ? physicsIndicators : (isGeo ? geographyIndicators : []))));

              ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(level => {
                // Tính toán số lượng câu thực tế để gán nhãn
                let count = 0;
                if (type === 'tuLuan') {
                  count = dv.tuLuan?.subItems?.filter(s => s.level === level).length || 0;
                } else {
                  count = (dv[type] && dv[type][level]) ? Number(dv[type][level]) : 0;
                }

                if (count <= 0) return;

                const matchedInds = indicators.filter(code => {
                  const info = allSourceData.find(i => i.code === code);
                  const targetLevel = (isMath && level === 'vanDungCao') ? 'vanDung' : level;
                  if (info) {
                    return (info.level || '').toLowerCase() === targetLevel.toLowerCase();
                  } else {
                    // Fallback for custom indicators (like NT, TH, VD)
                    const lowerCode = code.toLowerCase();
                    if (targetLevel === 'biet' && (lowerCode.startsWith('nt') || lowerCode.startsWith('nb'))) return true;
                    if (targetLevel === 'hieu' && lowerCode.startsWith('th')) return true;
                    if (targetLevel === 'vanDungCao' && lowerCode.startsWith('vdc')) return true;
                    if (targetLevel === 'vanDung' && lowerCode.startsWith('vd') && !lowerCode.startsWith('vdc')) return true;
                    return false;
                  }
                });

                for (let i = 0; i < count; i++) {
                  // Key cho indicatorMap
                  const key = `${type}_${level}_${i}`;
                  
                  // Gán nhãn câu hỏi
                  let label = "";
                  if (type === 'nhieuLuaChon') {
                    label = state.examConfig.isCauTruc4213 ? `I.${p1GlobalCounter++}` : `${p1Pre}${p1GlobalCounter++}`;
                  } else if (type === 'dungSai') {
                    const cauNo = p2GlobalCounter + Math.floor(p2ItemCounter / 4);
                    const yChar = String.fromCharCode(97 + (p2ItemCounter % 4));
                    label = state.examConfig.isCauTruc4213 ? `II.${cauNo}${yChar}` : `${p2Pre}${cauNo}${yChar}`;
                    p2ItemCounter++;
                  } else if (type === 'traLoiNgan') {
                    label = state.examConfig.isCauTruc4213 ? `III.${p3GlobalCounter++}` : `${p3Pre}${p3GlobalCounter++}`;
                  } else if (type === 'tuLuan') {
                    if (state.examConfig.isCauTruc4213) {
                       let currentIndex = tlGlobalCounter - 1;
                       let qIdx = 0;
                       let subIdx = 0;
                       if (state.config.hasTuLuan && state.tuLuanConfig && state.tuLuanConfig.questions) {
                           let tmp = currentIndex;
                           for (let q of state.tuLuanConfig.questions) {
                               const numY = q.subItems?.length || 1;
                               if (tmp < numY) {
                                   subIdx = tmp;
                                   break;
                               }
                               tmp -= numY;
                               qIdx++;
                           }
                       } else {
                           qIdx = currentIndex;
                           subIdx = -1; 
                       }
                       
                       const cauNo = qIdx + 1;
                       const yChar = subIdx >= 0 && state.tuLuanConfig?.questions?.[qIdx]?.subItems?.length > 1 ? String.fromCharCode(97 + subIdx) : '';
                       label = `TL.${cauNo}${yChar}`;
                       tlGlobalCounter++;
                    } else {
                       label = `${tlPre}${tlGlobalCounter++}`;
                    }
                  }

                  // Gán mã năng lực
                  let indCode = null;
                  if (matchedInds.length > 0) {
                    indCode = matchedInds[globalIndIdx[level] % matchedInds.length];
                    globalIndIdx[level]++;
                  } else if (indicators.length > 0) {
                    indCode = indicators[globalIndIdx[level] % indicators.length];
                    globalIndIdx[level]++;
                  }

                  dv.indicatorMap[key] = {
                    code: indCode,
                    label: label
                  };
                }
              });
            });
          });
        });

        return { matrix: topics };
      }),

      smartImportData: (rawText) => set((state) => {
        try {
          let newMatrix = [...state.matrix];
          if (newMatrix.length === 1 && !newMatrix[0].tenChuDe && newMatrix[0].donViKienThuc.length === 1 && !newMatrix[0].donViKienThuc[0].noiDung) {
            newMatrix = [];
          }

          const text = rawText.trim();
          
          // --- CẢI TIẾN 1: TÌM JSON TRONG VĂN BẢN ---
          let jsonData = null;
          const jsonMatch = text.match(/\[\s*\{.*\}\s*\]|\{\s*".*"\s*:\s*.*\}/s);
          if (jsonMatch) {
            try {
              jsonData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.warn("Tìm thấy block giống JSON nhưng parse lỗi:", e);
            }
          }

          if (jsonData) {
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            dataArray.forEach(topicData => {
              newMatrix.push({
                id: crypto.randomUUID(),
                tenChuDe: topicData.tenChuDe || topicData.topic || "Chủ đề mới",
                isNuaDauKi: false,
                yeuCauCanDat: '',
                donViKienThuc: (topicData.donViKienThucs || topicData.donViKienThuc || []).map(dv => ({
                  id: crypto.randomUUID(),
                  noiDung: dv.tenDonVi || dv.noiDung || dv.content || "Bài mới",
                  soTiet: Number(dv.soTiet) || 1,
                  isNuaDauKi: false,
                  yeuCauCanDat: dv.yccd || dv.yeuCauCanDat || "",
                  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
                  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] }
                }))
              });
            });
            return { matrix: newMatrix };
          }

          // --- CẢI TIẾN 2: XỬ LÝ DỮ LIỆU BẢNG (EXCEL/WORD/TEXT) ---
          const rows = text.split('\n').map(r => r.trim()).filter(r => r);
          let currentTopicIndex = newMatrix.length > 0 ? newMatrix.length - 1 : -1;

          rows.forEach((row) => {
            const columns = row.split(/\t|\||;/).map(c => c.trim());
            let tenChuDe = "", tenDonVi = "", soTiet = 1, yccd = "";

            if (columns.length === 1) {
              // CHỈ CÓ 1 CỘT: Kiểm tra gắt gao hơn để tránh nhận nhầm Bài học là Chủ đề
              const isTopic = /^(chương|chuong|chủ đề|chu de|phần|phan)\s+(\d+|[IVX]+)/i.test(columns[0]);
              if (isTopic) {
                tenChuDe = columns[0];
              } else {
                tenDonVi = columns[0];
                if (currentTopicIndex === -1) tenChuDe = "Chương/Chủ đề 1";
              }
            } else if (columns.length === 2) {
              tenDonVi = columns[0];
              soTiet = columns[1];
              if (currentTopicIndex === -1) tenChuDe = "Chương/Chủ đề 1";
            } else if (columns.length === 3) {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2];
            } else {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2]; yccd = columns[3];
            }

            if (tenChuDe) {
              // Nếu đang có chủ đề mặc định trống, thì dùng luôn nó thay vì push mới
              if (newMatrix.length === 1 && !newMatrix[0].tenChuDe && newMatrix[0].donViKienThuc.length === 1 && !newMatrix[0].donViKienThuc[0].noiDung) {
                newMatrix[0].tenChuDe = tenChuDe;
                currentTopicIndex = 0;
              } else {
                newMatrix.push({ id: crypto.randomUUID(), tenChuDe, isNuaDauKi: false, yeuCauCanDat: '', donViKienThuc: [] });
                currentTopicIndex = newMatrix.length - 1;
              }
            }

            if (currentTopicIndex >= 0 && tenDonVi) {
              newMatrix[currentTopicIndex].donViKienThuc.push({
                id: crypto.randomUUID(),
                noiDung: tenDonVi,
                soTiet: Number(soTiet) || 1,
                yeuCauCanDat: yccd || '',
                nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
                dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] }
              });
            }
          });
          return { matrix: newMatrix };
        } catch (error) {
          alert("Lỗi phân tích dữ liệu!");
          return state;
        }
      }),

      // Hàm mới: Chỉ nhập ĐVKT vào một Chủ đề nhất định
      importDonVisToTopic: (topicId, rawText) => set((state) => {
        const text = rawText.trim();
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        
        return {
          matrix: state.matrix.map(topic => {
            if (topic.id !== topicId) return topic;
            
            const newDvs = [...topic.donViKienThuc];
            // Nếu ĐVKT duy nhất đang trống, xóa nó đi để thay bằng list mới
            if (newDvs.length === 1 && !newDvs[0].noiDung) {
              newDvs.pop();
            }

            rows.forEach(row => {
              const cols = row.split(/\t|\||;/).map(c => c.trim());
              let name = cols[0], count = 1, yccd = "";
              if (cols.length >= 2) count = Number(cols[1]) || 1;
              if (cols.length >= 3) yccd = cols[2];
              
              newDvs.push({
                ...createDefaultDonVi(),
                noiDung: name,
                soTiet: count,
                yeuCauCanDat: yccd
              });
            });

            return { ...topic, donViKienThuc: newDvs };
          })
        };
      }),

      addTopic: () => set((state) => ({ matrix: [...state.matrix, { ...defaultTopic, id: crypto.randomUUID(), donViKienThuc: [createDefaultDonVi()] }] })),
      removeTopic: (id) => set((state) => ({ matrix: state.matrix.filter(topic => topic.id !== id) })),
      updateTopicText: (id, field, value) => set((state) => ({ matrix: state.matrix.map(topic => topic.id === id ? { ...topic, [field]: value } : topic) })),

      // GIỮ LẠI cho backward compatibility — nhưng KHÔNG DÙNG trong UI mới
      updateQuestionCount: (id, type, level, value) => set((state) => ({
        matrix: state.matrix.map(topic => topic.id === id ? { ...topic, [type]: { ...(topic[type] || {}), [level]: Number(value) || 0 } } : topic)
      })),
      updateTuLuanPoint: (id, field, value) => set((state) => ({
        matrix: state.matrix.map(topic => topic.id === id ? { ...topic, tuLuan: { ...(topic.tuLuan || {}), [field]: Number(value) || 0 } } : topic)
      })),
      updateSoTiet: (id, value) => set((state) => ({
        matrix: state.matrix.map(topic => topic.id === id ? { ...topic, soTiet: Number(value) || 0 } : topic)
      })),
      resetAll: () => set({ matrix: [{ ...defaultTopic, id: crypto.randomUUID(), donViKienThuc: [createDefaultDonVi()] }] })
    }),
    {
      name: 'exam-matrix-storage',
      version: 11,
      migrate: (persistedState, version) => {
        // Migration v2 → v3: model API
        if (version < 3) {
          const deprecatedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
          if (!persistedState.selectedModel || deprecatedModels.includes(persistedState.selectedModel)) {
            persistedState.selectedModel = 'gemini-2.0-flash';
          }
        }

        // Migration v3 → v4: noiDung + soTiet → donViKienThuc[]
        if (version < 4) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix = persistedState.matrix.map(topic => {
              if (!topic.donViKienThuc) {
                topic.donViKienThuc = [{
                  id: crypto.randomUUID(),
                  noiDung: topic.noiDung || '',
                  soTiet: Number(topic.soTiet) || 1,
                }];
              }
              return topic;
            });
          }
        }

        // Migration v4 → v5: Chuyển question counts từ topic → ĐVKT[0]
        if (version < 5) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix = persistedState.matrix.map(topic => {
              const dvList = topic.donViKienThuc || [];
              if (dvList.length > 0) {
                // Copy topic-level counts vào ĐVKT đầu tiên (nếu ĐVKT chưa có)
                const firstDv = dvList[0];
                if (!firstDv.nhieuLuaChon && topic.nhieuLuaChon) {
                  firstDv.nhieuLuaChon = { ...topic.nhieuLuaChon };
                }
                if (!firstDv.dungSai && topic.dungSai) {
                  firstDv.dungSai = { ...topic.dungSai };
                }
                if (!firstDv.traLoiNgan && topic.traLoiNgan) {
                  firstDv.traLoiNgan = { ...topic.traLoiNgan };
                }
                if (!firstDv.tuLuan && topic.tuLuan) {
                  firstDv.tuLuan = { ...topic.tuLuan };
                }
                // Nếu ĐVKT có phanBo (từ autoFill cũ), chuyển phanBo → fields chính
                dvList.forEach(dv => {
                  if (dv.phanBo) {
                    if (!dv.nhieuLuaChon) dv.nhieuLuaChon = { ...(dv.phanBo.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.dungSai) dv.dungSai = { ...(dv.phanBo.dungSai || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.traLoiNgan) dv.traLoiNgan = { ...(dv.phanBo.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.tuLuan) dv.tuLuan = { ...(dv.phanBo.tuLuan || { biet: 0, hieu: 0, vanDung: 0 }), diemBiet: 0, diemHieu: 0, diemVanDung: 0 };
                    delete dv.phanBo;
                  }
                  // Đảm bảo mọi ĐVKT đều có fields mặc định
                  if (!dv.nhieuLuaChon) dv.nhieuLuaChon = { biet: 0, hieu: 0, vanDung: 0 };
                  if (!dv.dungSai) dv.dungSai = { biet: 0, hieu: 0, vanDung: 0 };
                  if (!dv.traLoiNgan) dv.traLoiNgan = { biet: 0, hieu: 0, vanDung: 0 };
                  if (!dv.tuLuan) dv.tuLuan = { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0 };
                });
              }
              return topic;
            });
          }
        }

        // Migration v5 → v6: Thêm examConfig mặc định nếu chưa có
        if (version < 6) {
          if (!persistedState.examConfig) {
            persistedState.examConfig = {
              tongDiem: 10.0,
              tongDiemP1: 3.0, diemMoiCauP1: 0.25,
              tongDiemP2: 2.0, diemMoiYP2: 0.25,
              tongDiemP3: 2.0, diemMoiYP3: 0.25,
              diemMoiYTuLuan: 0.5,
              tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
            };
          }
        }

        // Migration v6 → v7: Bổ sung tongDiem, diemMoiYTuLuan nếu thiếu
        if (version < 7) {
          if (persistedState.examConfig) {
            if (persistedState.examConfig.tongDiem === undefined) {
              persistedState.examConfig.tongDiem = 10.0;
            }
            if (persistedState.examConfig.diemMoiYTuLuan === undefined) {
              persistedState.examConfig.diemMoiYTuLuan = 0.5;
            }
          }
        }

        // Migration v8 → v9: Thêm tuLuanConfig cho cấu hình tự luận chi tiết
        if (version < 9) {
          if (!persistedState.tuLuanConfig) {
            persistedState.tuLuanConfig = {
              enabled: false,
              questions: [
                { id: 'tl_q1', label: 'Câu 1', subItems: [
                  { diem: 0.5 },
                  { diem: 0.5 },
                ]},
                { id: 'tl_q2', label: 'Câu 2', subItems: [
                  { diem: 0.5 },
                  { diem: 1.0 },
                ]},
                { id: 'tl_q3', label: 'Câu 3', subItems: [
                  { diem: 1.0 },
                ]},
                { id: 'tl_q4', label: 'Câu 4', subItems: [
                  { diem: 1.0 },
                ]},
              ],
            };
          }
        }

        // Migration v9 → v10: Bỏ trường yccd khỏi tuLuanConfig subItems (YCCĐ chuyển sang đặc tả)
        if (version < 10) {
          if (persistedState.tuLuanConfig && persistedState.tuLuanConfig.questions) {
            persistedState.tuLuanConfig.questions.forEach(q => {
              if (q.subItems) {
                q.subItems = q.subItems.map(sub => {
                  const { yccd, ...rest } = sub;
                  // Bỏ level nếu tồn tại (level sẽ được auto-gán khi auto-fill)
                  const { level: _level, ...rest2 } = rest;
                  return rest2;
                });
              }
            });
          }
        }

        // Migration v7 → v8: Thêm subItems[] cho tự luận linh hoạt (giữ backward compat)
        if (version < 8) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix.forEach(topic => {
              (topic.donViKienThuc || []).forEach(dv => {
                if (dv.tuLuan) {
                  if (!Array.isArray(dv.tuLuan.subItems)) {
                    // Nếu có điểm cũ, chuyển thành subItems mặc định
                    const subs = [];
                    if (dv.tuLuan.biet > 0) {
                      for (let i = 0; i < dv.tuLuan.biet; i++) {
                        subs.push({ y: '', diem: dv.tuLuan.diemBiet / dv.tuLuan.biet || 0.5, level: 'biet' });
                      }
                    }
                    if (dv.tuLuan.hieu > 0) {
                      for (let i = 0; i < dv.tuLuan.hieu; i++) {
                        subs.push({ y: '', diem: dv.tuLuan.diemHieu / dv.tuLuan.hieu || 0.5, level: 'hieu' });
                      }
                    }
                    if (dv.tuLuan.vanDung > 0) {
                      for (let i = 0; i < dv.tuLuan.vanDung; i++) {
                        subs.push({ y: '', diem: dv.tuLuan.diemVanDung / dv.tuLuan.vanDung || 0.5, level: 'vanDung' });
                      }
                    }
                    dv.tuLuan.subItems = subs;
                  }
                } else {
                  dv.tuLuan = { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] };
                }
              });
            });
          }
          if (persistedState.examConfig) {
            // Bổ sung cấu trúc Toán 4-2-4 nếu môn là Toán
            if (isMathSubject(persistedState.examHeader?.monHoc)) {
              persistedState.examConfig.tongDiemP1 = 4.0;
              persistedState.examConfig.diemMoiCauP1 = 0.25;
              persistedState.examConfig.tongDiemP2 = 2.0;
              persistedState.examConfig.diemMoiYP2 = 0.25;
              persistedState.examConfig.tongDiemP3 = 0;
              persistedState.examConfig.tiLeNhanThuc = { biet: 40, hieu: 30, vanDung: 30 };
            }
          }
        }

        // Migration v10 → v11: Force-fix tiLeNhanThuc = 40-30-30 (fix bug migration v8 set sai cho Toán)
        if (version < 11) {
          if (persistedState.examConfig && persistedState.examConfig.tiLeNhanThuc) {
            persistedState.examConfig.tiLeNhanThuc = { biet: 40, hieu: 30, vanDung: 30 };
          }
        }

        return persistedState;
      }
    }
  )
);

// Export helpers cho các component sử dụng
export { getTopicSum, getTopicTuLuanDiem, getTotalSoTiet, isNewMathStructure };