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
const isKHTNSubject = (monHoc) => /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khoa\s*hoc\s*tu\s*nhien|khtn/i.test(monHoc || '');

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
// TẠO ĐVKT MẶC ĐỊNH
// =============================================================================
const createDefaultDonVi = () => ({
  id: crypto.randomUUID(),
  noiDung: '',
  yeuCauCanDat: '',
  soTiet: 1,
  isNuaDauKi: false,
  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
  selectedIndicators: [],
  indicatorMap: {},
});

const defaultTopic = {
  id: crypto.randomUUID(),
  tenChuDe: '',
  donViKienThuc: [createDefaultDonVi()],
  yeuCauCanDat: '',
};

// =============================================================================
// THUẬT TOÁN LARGEST REMAINDER METHOD
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

const getTotalSoTiet = (topic) => {
  if (!topic.donViKienThuc || topic.donViKienThuc.length === 0) {
    return Number(topic.soTiet) || 0;
  }
  return topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv.soTiet) || 0), 0);
};

const getTopicSum = (topic, type, level) => {
  if (!topic.donViKienThuc) return 0;
  return topic.donViKienThuc.reduce((sum, dv) => {
    const obj = dv[type];
    if (!obj) return sum;
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
    if (Array.isArray(tl.subItems) && tl.subItems.length > 0) {
      const levelMap = { diemBiet: 'biet', diemHieu: 'hieu', diemVanDung: 'vanDung', diemVanDungCao: 'vanDungCao' };
      const level = levelMap[diemField];
      if (level) {
        return sum + tl.subItems.filter(s => s.level === level).reduce((s2, sub) => s2 + (sub.diem || 0), 0);
      }
    }
    return sum + (tl[diemField] ? (Number(tl[diemField]) || 0) : 0);
  }, 0);
};

// =============================================================================
// HELPER: Tính số câu Tự luận quy đổi tại mức độ nhận thức (level)
// =============================================================================
const getTuLuanCauCount = (matrix, level, tuLuanConfig = null) => {
  if (!matrix || !Array.isArray(matrix)) return 0;

  const allSubs = [];
  matrix.forEach(topic => {
    (topic.donViKienThuc || []).forEach(dv => {
      const tl = dv.tuLuan;
      if (tl && Array.isArray(tl.subItems) && tl.subItems.length > 0) {
        tl.subItems.forEach((sub, idx) => {
          allSubs.push({
            ...sub,
            dvId: dv.id,
            topicId: topic.id,
            uniqueIdx: `${dv.id}_${idx}`
          });
        });
      }
    });
  });

  if (allSubs.length === 0) {
    let rawCount = 0;
    matrix.forEach(topic => {
      (topic.donViKienThuc || []).forEach(dv => {
        rawCount += Number(dv.tuLuan?.[level]) || 0;
      });
    });
    return rawCount;
  }

  const qGroups = {};
  allSubs.forEach(sub => {
    let qKey = sub.qId;
    if (!qKey) {
      const str = String(sub.label || sub.qLabel || '');
      const m = str.match(/câu\s*(\d+)/i) || str.match(/TL\.?(\d+)/i) || str.match(/(\d+)/);
      qKey = m ? `tl_q${m[1]}` : (sub.id || sub.uniqueIdx);
    }
    if (!qGroups[qKey]) {
      qGroups[qKey] = [];
    }
    qGroups[qKey].push(sub);
  });

  let totalCauInLevel = 0;
  Object.values(qGroups).forEach(subs => {
    const totalPts = subs.reduce((s, item) => s + (Number(item.diem) || 0), 0);
    const levelSubs = subs.filter(item => item.level === level);
    const levelPts = levelSubs.reduce((s, item) => s + (Number(item.diem) || 0), 0);

    if (totalPts > 0) {
      totalCauInLevel += (levelPts / totalPts);
    } else if (subs.length > 0) {
      totalCauInLevel += (levelSubs.length / subs.length);
    }
  });

  return Math.round(totalCauInLevel * 100) / 100;
};

// =============================================================================
// INITIAL STATE — dùng để reset
// =============================================================================
const getInitialState = () => ({
  examHeader: {
    soGD: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO...',
    truong: 'TRƯỜNG:.............................',
    kyThi: 'ĐỀ KIỂM TRA ĐỊNH KÌ',
    monHoc: '........................',
    thoiGian: 'làm bài: 45 phút',
    namHoc: '202... - 202...'
  },
  matrix: [{ ...defaultTopic, id: crypto.randomUUID(), donViKienThuc: [createDefaultDonVi()] }],
  lockedSlots: [],
  config: {
    diemNhieuLuaChon: 0.25,
    diemDungSai: 0.25,
    diemTraLoiNgan: 0.25,
    diemTuLuan: 1.0,
    hasTraLoiNgan: true,
    hasTuLuan: true,
    isCuoiKi: false,
    isContinuousNumbering: true,
    exportTemplate: 'ministry',
    showCompetencySymbol: true,
    showCompetencyCode: true,
    showExamRedMetadata: true,
    showExamAnswerUnderline: true,
    groupTfByTopic: false,
  },
  tuLuanConfig: {
    enabled: false,
    questions: [
      { id: 'tl_q1', label: 'Câu 1', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
      { id: 'tl_q2', label: 'Câu 2', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_bai_cung_chu_de',  subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
      { id: 'tl_q3', label: 'Câu 3', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
    ],
  },
  examConfig: {
    tongDiem: 10.0,
    tongDiemP1: 3.0, diemMoiCauP1: 0.25,
    tongDiemP2: 2.0, diemMoiYP2: 0.25,
    tongDiemP3: 2.0, diemMoiYP3: 0.25,
    diemMoiYTuLuan: 0.5,
    tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
  },
  generatedExam: '',
  draftQuestions: [],
  examSlots: {},
  geminiApiKeys: [],
  currentKeyIndex: 0,
  selectedModel: 'gemini-2.0-flash',
  step1Data: {
    inputText: '',
    fileName: '',
    successData: null
  },
});

// =============================================================================
// STORE — CÓ DÙNG persist (lưu vào localStorage)
// =============================================================================
export const useQuickStore = create(
  persist(
    (set, get) => ({
      ...getInitialState(),

    // =========================================================================
    // QUICK FLOW SPECIFIC ACTIONS
    // =========================================================================

    updateStep1Data: (data) => set((state) => ({
      step1Data: { ...state.step1Data, ...data }
    })),

    // Import toàn bộ matrix từ kết quả AI parse (bóc tách ma trận / đặc tả)
    importMatrix: (parsedMatrix) => {
      if (!Array.isArray(parsedMatrix) || parsedMatrix.length === 0) return;
      
      const config = get().config || {};
      const examConfig = get().examConfig || {};
      const tP1 = Number(examConfig.tongDiemP1) || 0;
      const tP2 = Number(examConfig.tongDiemP2) || 0;
      const tP3 = config.hasTraLoiNgan ? (Number(examConfig.tongDiemP3) || 0) : 0;
      const tObjective = tP1 + tP2 + tP3;
      const tTuLuan = Math.max(0, 10.0 - tObjective);

      // Đếm tổng số lượng ý tự luận được import
      let totalTLCount = 0;
      parsedMatrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          totalTLCount += (Number(dv.tuLuan?.biet) || 0) + (Number(dv.tuLuan?.hieu) || 0) + (Number(dv.tuLuan?.vanDung) || 0);
        });
      });

      // Điểm chia đều cho mỗi ý tự luận
      const diemMoiY = totalTLCount > 0 ? Math.round((tTuLuan / totalTLCount) * 100) / 100 : 0.5;

      const normalized = parsedMatrix.map(topic => ({
        id: crypto.randomUUID(),
        tenChuDe: topic.tenChuDe || 'Chủ đề',
        yeuCauCanDat: topic.yeuCauCanDat || '',
        donViKienThuc: (topic.donViKienThuc || []).map(dv => {
          const bietCount = Number((dv.tuLuan || {}).biet) || 0;
          const hieuCount = Number((dv.tuLuan || {}).hieu) || 0;
          const vanDungCount = Number((dv.tuLuan || {}).vanDung) || 0;

          // Lấy điểm số được bóc tách từ ma trận đặc tả (nếu có)
          const dbParsed = Number((dv.tuLuan || {}).diemBiet) || 0;
          const dhParsed = Number((dv.tuLuan || {}).diemHieu) || 0;
          const dvdParsed = Number((dv.tuLuan || {}).diemVanDung) || 0;

          // Tính điểm cho mỗi ý nhỏ
          const bietItemDiem = bietCount > 0 ? (dbParsed > 0 ? Math.round((dbParsed / bietCount) * 100) / 100 : diemMoiY) : 0;
          const hieuItemDiem = hieuCount > 0 ? (dhParsed > 0 ? Math.round((dhParsed / hieuCount) * 100) / 100 : diemMoiY) : 0;
          const vanDungItemDiem = vanDungCount > 0 ? (dvdParsed > 0 ? Math.round((dvdParsed / vanDungCount) * 100) / 100 : diemMoiY) : 0;

          const subItems = [];
          for (let i = 0; i < bietCount; i++) {
            subItems.push({ id: crypto.randomUUID(), y: '', diem: bietItemDiem, level: 'biet' });
          }
          for (let i = 0; i < hieuCount; i++) {
            subItems.push({ id: crypto.randomUUID(), y: '', diem: hieuItemDiem, level: 'hieu' });
          }
          for (let i = 0; i < vanDungCount; i++) {
            subItems.push({ id: crypto.randomUUID(), y: '', diem: vanDungItemDiem, level: 'vanDung' });
          }

          const diemBiet = dbParsed > 0 ? dbParsed : Math.round(bietCount * diemMoiY * 100) / 100;
          const diemHieu = dhParsed > 0 ? dhParsed : Math.round(hieuCount * diemMoiY * 100) / 100;
          const diemVanDung = dvdParsed > 0 ? dvdParsed : Math.round(vanDungCount * diemMoiY * 100) / 100;

          return {
            id: crypto.randomUUID(),
            noiDung: dv.noiDung || '',
            soTiet: Number(dv.soTiet) || 1,
            isNuaDauKi: false,
            yeuCauCanDat: dv.yeuCauCanDat || '',
            nhieuLuaChon: { biet: Number((dv.nhieuLuaChon || {}).biet) || 0, hieu: Number((dv.nhieuLuaChon || {}).hieu) || 0, vanDung: Number((dv.nhieuLuaChon || {}).vanDung) || 0 },
            dungSai: { biet: Number((dv.dungSai || {}).biet) || 0, hieu: Number((dv.dungSai || {}).hieu) || 0, vanDung: Number((dv.dungSai || {}).vanDung) || 0, vanDungCao: Number((dv.dungSai || {}).vanDungCao) || 0 },
            traLoiNgan: { biet: Number((dv.traLoiNgan || {}).biet) || 0, hieu: Number((dv.traLoiNgan || {}).hieu) || 0, vanDung: Number((dv.traLoiNgan || {}).vanDung) || 0, vanDungCao: Number((dv.traLoiNgan || {}).vanDungCao) || 0 },
            tuLuan: { 
              biet: bietCount, 
              hieu: hieuCount, 
              vanDung: vanDungCount, 
              diemBiet, 
              diemHieu, 
              diemVanDung, 
              subItems 
            },
            selectedIndicators: [],
            indicatorMap: {},
          };
        })
      }));
      set({ matrix: normalized, examSlots: {}, draftQuestions: [], generatedExam: '' });
    },

    // Reset toàn bộ về trạng thái ban đầu
    resetQuick: () => set(getInitialState()),

    // =========================================================================
    // EXAM HEADER
    // =========================================================================
    updateExamHeader: (field, value) => set((state) => ({
      examHeader: { ...state.examHeader, [field]: value }
    })),

    // =========================================================================
    // LOCKED SLOTS
    // =========================================================================
    toggleLockSlot: (slotKey) => set((state) => ({
      lockedSlots: state.lockedSlots.includes(slotKey)
        ? state.lockedSlots.filter(k => k !== slotKey)
        : [...state.lockedSlots, slotKey]
    })),
    clearLockedSlots: () => set({ lockedSlots: [] }),

    // =========================================================================
    // EXAM CONFIG
    // =========================================================================
    updateExamConfig: (field, value) => set((state) => ({
      examConfig: { ...state.examConfig, [field]: value }
    })),

    toggleTuLuan: (val) => set((state) => {
      const newExamConfig = { ...state.examConfig };
      const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
      if (val) {
        if (p1 === 3.5) { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 1.5; }
        else { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 2.0; }
      } else {
        if (p1 === 3 || p1 === 3.0) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 3.0; }
        else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 2.5; }
        else if (p1 === 4.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 1.5; }
        else if (p1 === 5.5) { newExamConfig.tongDiemP2 = 3.0; newExamConfig.tongDiemP3 = 1.5; }
        else { const remaining = 10.0 - p1; newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100; newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100; }
      }
      return { config: { ...state.config, hasTuLuan: val }, examConfig: newExamConfig };
    }),

    setCauTrucDe: (tongDiemP1) => set((state) => {
      const isCauTruc4213 = String(tongDiemP1) === '4.01';
      const p1 = isCauTruc4213 ? 4.0 : (Number(tongDiemP1) || 3.0);
      const newExamConfig = { ...state.examConfig, tongDiemP1: p1, isCauTruc4213 };
      const hasTLN = state.config.hasTraLoiNgan !== false;
      const hasTL = state.config.hasTuLuan;

      if (hasTL) {
        if (hasTLN) {
          if (isCauTruc4213) {
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 1.0;
          } else if (p1 === 3.5) {
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 1.5; }
          else { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 2.0; }
        } else {
          if (p1 === 4.0 || p1 === 4) { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 3.5; newExamConfig.tongDiemP3 = 0; }
          else { newExamConfig.tongDiemP2 = Math.round((7 - p1) * 100) / 100; newExamConfig.tongDiemP3 = 0; }
        }
      } else {
        if (hasTLN) {
          if (p1 === 3 || p1 === 3.0) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 3.0; }
          else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 2.5; }
          else if (p1 === 4.0 || p1 === 4) { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 4.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 1.5; }
          else if (p1 === 5.5) { newExamConfig.tongDiemP2 = 3.0; newExamConfig.tongDiemP3 = 1.5; }
          else { const remaining = 10.0 - p1; newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100; newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100; }
        } else {
          if (p1 === 3 || p1 === 3.0) { newExamConfig.tongDiemP2 = 7.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 6.5; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 4.0 || p1 === 4) { newExamConfig.tongDiemP2 = 6.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 4.5) { newExamConfig.tongDiemP2 = 5.5; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 5.5) { newExamConfig.tongDiemP2 = 4.5; newExamConfig.tongDiemP3 = 0; }
          else { newExamConfig.tongDiemP2 = Math.round((10.0 - p1) * 100) / 100; newExamConfig.tongDiemP3 = 0; }
        }
      }
      return { examConfig: newExamConfig };
    }),

    toggleTraLoiNgan: (val) => set((state) => {
      const newExamConfig = { ...state.examConfig };
      const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
      const hasTL = state.config.hasTuLuan;
      if (hasTL) {
        if (val) {
          if (p1 === 3.5) { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 1.5; }
          else { newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 2.0; }
        } else if (p1 === 4.0 || p1 === 4) {
          newExamConfig.tongDiemP2 = 2.0; newExamConfig.tongDiemP3 = 0;
        } else {
          if (p1 === 3.5) { newExamConfig.tongDiemP2 = 3.5; newExamConfig.tongDiemP3 = 0; }
          else { newExamConfig.tongDiemP2 = Math.round((7 - p1) * 100) / 100; newExamConfig.tongDiemP3 = 0; }
        }
      } else {
        if (val) {
          if (p1 === 3 || p1 === 3.0) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 3.0; }
          else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 2.5; }
          else if (p1 === 4.0 || p1 === 4) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 2.0; }
          else if (p1 === 4.5) { newExamConfig.tongDiemP2 = 4.0; newExamConfig.tongDiemP3 = 1.5; }
          else if (p1 === 5.5) { newExamConfig.tongDiemP2 = 3.0; newExamConfig.tongDiemP3 = 1.5; }
          else { const remaining = 10.0 - p1; newExamConfig.tongDiemP2 = Math.round(remaining * 0.6 * 100) / 100; newExamConfig.tongDiemP3 = Math.round(remaining * 0.4 * 100) / 100; }
        } else {
          if (p1 === 3 || p1 === 3.0) { newExamConfig.tongDiemP2 = 7.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 3.5) { newExamConfig.tongDiemP2 = 6.5; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 4.0 || p1 === 4) { newExamConfig.tongDiemP2 = 6.0; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 4.5) { newExamConfig.tongDiemP2 = 5.5; newExamConfig.tongDiemP3 = 0; }
          else if (p1 === 5.5) { newExamConfig.tongDiemP2 = 4.5; newExamConfig.tongDiemP3 = 0; }
          else { newExamConfig.tongDiemP2 = Math.round((10.0 - p1) * 100) / 100; newExamConfig.tongDiemP3 = 0; }
        }
      }
      return { config: { ...state.config, hasTraLoiNgan: val }, examConfig: newExamConfig };
    }),

    // =========================================================================
    // GENERATED EXAM / DRAFT
    // =========================================================================
    generatedExam: '',
    setGeneratedExam: (text) => set({ generatedExam: text }),

    draftQuestions: [],
    setDraftQuestions: (questions) => set({ draftQuestions: questions }),

    // =========================================================================
    // EXAM SLOTS
    // =========================================================================
    examSlots: {},
    pushToExamSlot: (slotKey, questionData, originalQuestion) => set((state) => ({
      examSlots: { ...state.examSlots, [slotKey]: questionData },
      draftQuestions: state.draftQuestions.filter(q => q !== (originalQuestion || questionData))
    })),
    clearExamSlot: (slotKey) => set((state) => {
      const newSlots = { ...state.examSlots };
      delete newSlots[slotKey];
      const newLocked = (state.lockedSlots || []).filter(k => k !== slotKey);
      return { examSlots: newSlots, lockedSlots: newLocked };
    }),
    clearMultipleExamSlots: (slotKeys = []) => set((state) => {
      const newSlots = { ...state.examSlots };
      slotKeys.forEach(k => {
        delete newSlots[k];
      });
      const newLocked = (state.lockedSlots || []).filter(k => !slotKeys.includes(k));
      return { examSlots: newSlots, lockedSlots: newLocked };
    }),
    clearAllExamSlots: () => set({ examSlots: {}, lockedSlots: [] }),
    updateExamSlot: (slotKey, subKey, value) => set((state) => {
      const oldSlot = state.examSlots[slotKey] || {};
      return { examSlots: { ...state.examSlots, [slotKey]: { ...oldSlot, [subKey]: value } } };
    }),

    // =========================================================================
    // API SETTINGS
    // =========================================================================
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

    // =========================================================================
    // CONFIG
    // =========================================================================
    updateConfig: (field, value) => set((state) => ({ config: { ...state.config, [field]: value } })),

    // =========================================================================
    // TU LUAN CONFIG
    // =========================================================================
    setTuLuanConfig: (updater) => set((state) => {
      const next = typeof updater === 'function' ? updater(state.tuLuanConfig) : { ...state.tuLuanConfig, ...updater };
      return { tuLuanConfig: next };
    }),

    // =========================================================================
    // MATRIX — ĐVKT PHASE
    // =========================================================================
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

    // Xóa YCCĐ của 1 ĐVKT
    clearDvYccd: (topicId, dvId) => set((state) => ({
      matrix: state.matrix.map(topic => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv =>
            dv.id === dvId ? { ...dv, yeuCauCanDat: '' } : dv
          )
        };
      })
    })),

    // Xóa YCCĐ của tất cả ĐVKT trong 1 chủ đề
    clearTopicYccd: (topicId) => set((state) => ({
      matrix: state.matrix.map(topic => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv => ({ ...dv, yeuCauCanDat: '' }))
        };
      })
    })),

    // Xóa YCCĐ của nhiều ĐVKT được chọn (danh sách dvId)
    clearBatchYccd: (dvIdList) => set((state) => {
      const setIds = new Set(dvIdList);
      return {
        matrix: state.matrix.map(topic => ({
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv =>
            setIds.has(dv.id) ? { ...dv, yeuCauCanDat: '' } : dv
          )
        }))
      };
    }),

    // Xóa toàn bộ YCCĐ của tất cả các bài trong toàn bộ ma trận
    clearAllYccd: () => set((state) => ({
      matrix: state.matrix.map(topic => ({
        ...topic,
        donViKienThuc: (topic.donViKienThuc || []).map(dv => ({ ...dv, yeuCauCanDat: '' }))
      }))
    })),

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
      const lines = rawText.split('\n');
      let currentDvIndex = -1;
      let yccdBlocks = {};
      for (let line of lines) {
        const match = line.match(/^\s*(?:\*\*|__)?(\d+)(?:\.\))?(?:\*\*|__)?\s+/);
        if (match) {
          const num = parseInt(match[1], 10);
          currentDvIndex = num - 1;
          if (!yccdBlocks[currentDvIndex]) yccdBlocks[currentDvIndex] = [];
        } else {
          if (currentDvIndex >= 0 && line.trim() !== '') {
            yccdBlocks[currentDvIndex].push(line.trim());
          }
        }
      }
      const dvList = newMatrix[topicIndex].donViKienThuc || [];
      dvList.forEach((dv, index) => {
        if (yccdBlocks[index] && yccdBlocks[index].length > 0) {
          dv.yeuCauCanDat = yccdBlocks[index].join('\n');
        }
      });
      return { matrix: newMatrix };
    }),

    updateDvQuestionCount: (topicId, dvId, type, level, value) => set((state) => ({
      matrix: state.matrix.map(topic => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv => {
            if (dv.id !== dvId) return dv;
            return { ...dv, [type]: { ...(dv[type] || {}), [level]: Number(value) || 0 } };
          })
        };
      })
    })),

    updateDvTuLuanPoint: (topicId, dvId, field, value) => set((state) => ({
      matrix: state.matrix.map(topic => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv => {
            if (dv.id !== dvId) return dv;
            return { ...dv, tuLuan: { ...(dv.tuLuan || {}), [field]: Number(value) || 0 } };
          })
        };
      })
    })),

    addTuLuanSubItem: (topicId, dvId, level) => set((state) => ({
      matrix: state.matrix.map(topic => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          donViKienThuc: (topic.donViKienThuc || []).map(dv => {
            if (dv.id !== dvId) return dv;
            const subItems = dv.tuLuan?.subItems || [];
            const newSub = { id: crypto.randomUUID(), y: '', diem: 0.5, level: level || 'biet' };
            const updated = { ...(dv.tuLuan || {}), subItems: [...subItems, newSub] };
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
      // Delegate to same logic as useExamStore — simplified version for Quick Flow
      // Uses the same algorithm but reads from local state
      const topics = JSON.parse(JSON.stringify(state.matrix));
      topics.forEach(t => {
        t.donViKienThuc.forEach(dv => {
          dv.nhieuLuaChon = { biet: 0, hieu: 0, vanDung: 0 };
          dv.dungSai = { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 };
          dv.traLoiNgan = { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 };
          dv.tuLuan = { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] };
          dv.indicatorMap = {};
        });
      });
      const tongSoTietToanBai = topics.reduce((sum, t) =>
        sum + t.donViKienThuc.reduce((s, dv) => s + (Number(dv.soTiet) || 0), 0), 0);
      if (tongSoTietToanBai === 0) { alert("Vui lòng nhập 'Số tiết' lớn hơn 0!"); return {}; }
      const ec = state.examConfig;
      const dP1 = Number(ec.diemMoiCauP1) || 0.25;
      const dP2 = Number(ec.diemMoiYP2) || 0.25;
      const dP3 = Number(ec.diemMoiYP3) || 0.25;
      const tP1 = Number(ec.tongDiemP1) || 0.0;
      const tP2 = Number(ec.tongDiemP2) || 0.0;
      const tP3 = state.config.hasTraLoiNgan ? (Number(ec.tongDiemP3) || 0.0) : 0;
      const tiLe = state.examConfig.tiLeNhanThuc || { biet: 40, hieu: 30, vanDung: 30 };
      const numTfBlocks = Math.round(tP2 / (dP2 * 4));
      const soCauP1 = tP1 > 0 ? Math.round(tP1 / dP1) : 0;
      const soCauP3 = tP3 > 0 ? Math.round(tP3 / dP3) : 0;
      const flatDvList = topics.map((t, ti) => t.donViKienThuc.map((dv, di) => {
        const st = Number(dv.soTiet) || 0;
        return { ti, di, target: (st / tongSoTietToanBai) * 10, current: 0 };
      })).flat();

      // Phân bổ ĐS
      const isKHTN = isKHTNSubject(state.examHeader?.monHoc);
      const isVao10 = Boolean(
        state.examConfig?.isCauTrucKHTNVao10 ||
        (!state.config.hasTuLuan && isKHTN && (state.examConfig?.tongDiemP1 === 5.5 || state.examConfig?.tongDiemP2 === 3.0))
      );

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
          if (isVao10) {
            dv.dungSai.hieu += 2;
            dv.dungSai.vanDung += 2;
          } else {
            dv.dungSai.biet++; dv.dungSai.hieu++; dv.dungSai.vanDung++; dv.dungSai.vanDungCao++;
          }
          flatDvList[bestIdx].current += dP2 * 4;
        }
      }

      // Phân bổ P1 + P3
      const arrP3 = distributeLargestRemainder(soCauP3, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
      const arrP1 = distributeLargestRemainder(soCauP1, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
      const pool = [];
      const addPool = (type, lvl, count) => { for (let i = 0; i < count; i++) pool.push({ type, lvl }); };
      addPool('traLoiNgan', 'biet', arrP3[0]); addPool('traLoiNgan', 'hieu', arrP3[1]); addPool('traLoiNgan', 'vanDung', arrP3[2]);
      addPool('nhieuLuaChon', 'biet', arrP1[0]); addPool('nhieuLuaChon', 'hieu', arrP1[1]); addPool('nhieuLuaChon', 'vanDung', arrP1[2]);
      pool.forEach(item => {
        let bestIdx = -1, maxGap = -Infinity;
        flatDvList.forEach((u, idx) => {
          if (u.target <= 0) return;
          const gap = u.target - u.current;
          if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
        });
        if (bestIdx === -1) return;
        const { ti, di } = flatDvList[bestIdx];
        topics[ti].donViKienThuc[di][item.type][item.lvl]++;
        flatDvList[bestIdx].current += dP1;
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
        const jsonMatch = text.match(/\[\s*\{.*\}\s*\]|\{\s*".*"\s*:\s*.*\}/s);
        if (jsonMatch) {
          try {
            const jsonData = JSON.parse(jsonMatch[0]);
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            dataArray.forEach(topicData => {
              newMatrix.push({
                id: crypto.randomUUID(),
                tenChuDe: topicData.tenChuDe || topicData.topic || "Chủ đề mới",
                isNuaDauKi: false, yeuCauCanDat: '',
                donViKienThuc: (topicData.donViKienThucs || topicData.donViKienThuc || []).map(dv => ({
                  id: crypto.randomUUID(), noiDung: dv.tenDonVi || dv.noiDung || dv.content || "Bài mới",
                  soTiet: Number(dv.soTiet) || 1, isNuaDauKi: false, yeuCauCanDat: dv.yccd || dv.yeuCauCanDat || "",
                  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
                  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
                  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] }
                }))
              });
            });
            return { matrix: newMatrix };
          } catch (e) { console.warn("JSON parse lỗi:", e); }
        }
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        let currentTopicIndex = newMatrix.length > 0 ? newMatrix.length - 1 : -1;
        rows.forEach((row) => {
          const columns = row.split(/\t|\||;/).map(c => c.trim());
          let tenChuDe = "", tenDonVi = "", soTiet = 1, yccd = "";
          if (columns.length === 1) {
            const isTopic = /^(chương|chuong|chủ đề|chu de|phần|phan)\s+(\d+|[IVX]+)/i.test(columns[0]);
            if (isTopic) { tenChuDe = columns[0]; } else { tenDonVi = columns[0]; if (currentTopicIndex === -1) tenChuDe = "Chương/Chủ đề 1"; }
          } else if (columns.length === 2) { tenDonVi = columns[0]; soTiet = columns[1]; if (currentTopicIndex === -1) tenChuDe = "Chương/Chủ đề 1"; }
          else if (columns.length === 3) { tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2]; }
          else { tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2]; yccd = columns[3]; }
          if (tenChuDe) {
            if (newMatrix.length === 1 && !newMatrix[0].tenChuDe && newMatrix[0].donViKienThuc.length === 1 && !newMatrix[0].donViKienThuc[0].noiDung) {
              newMatrix[0].tenChuDe = tenChuDe; currentTopicIndex = 0;
            } else { newMatrix.push({ id: crypto.randomUUID(), tenChuDe, isNuaDauKi: false, yeuCauCanDat: '', donViKienThuc: [] }); currentTopicIndex = newMatrix.length - 1; }
          }
          if (currentTopicIndex >= 0 && tenDonVi) {
            newMatrix[currentTopicIndex].donViKienThuc.push({
              id: crypto.randomUUID(), noiDung: tenDonVi, soTiet: Number(soTiet) || 1, yeuCauCanDat: yccd || '',
              nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 }, dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
              traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
              tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] }
            });
          }
        });
        return { matrix: newMatrix };
      } catch (error) { alert("Lỗi phân tích dữ liệu!"); return state; }
    }),

    importDonVisToTopic: (topicId, rawText) => set((state) => {
      const text = rawText.trim();
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      return {
        matrix: state.matrix.map(topic => {
          if (topic.id !== topicId) return topic;
          const newDvs = [...topic.donViKienThuc];
          if (newDvs.length === 1 && !newDvs[0].noiDung) newDvs.pop();
          rows.forEach(row => {
            const cols = row.split(/\t|\||;/).map(c => c.trim());
            let name = cols[0], count = 1, yccd = "";
            if (cols.length >= 2) count = Number(cols[1]) || 1;
            if (cols.length >= 3) yccd = cols[2];
            newDvs.push({ ...createDefaultDonVi(), noiDung: name, soTiet: count, yeuCauCanDat: yccd });
          });
          return { ...topic, donViKienThuc: newDvs };
        })
      };
    }),

    addTopic: () => set((state) => ({ matrix: [...state.matrix, { ...defaultTopic, id: crypto.randomUUID(), donViKienThuc: [createDefaultDonVi()] }] })),
    removeTopic: (id) => set((state) => ({ matrix: state.matrix.filter(topic => topic.id !== id) })),
    updateTopicText: (id, field, value) => set((state) => ({ matrix: state.matrix.map(topic => topic.id === id ? { ...topic, [field]: value } : topic) })),
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
      name: 'quick-exam-storage',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          persistedState.tuLuanConfig = {
            enabled: false,
            questions: [
              { id: 'tl_q1', label: 'Câu 1', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
              { id: 'tl_q2', label: 'Câu 2', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_bai_cung_chu_de',  subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
              { id: 'tl_q3', label: 'Câu 3', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
            ],
          };
        }
        return persistedState;
      }
    }
  )
);

// Export helpers cho các component sử dụng
export { getTopicSum, getTopicTuLuanDiem, getTuLuanCauCount, getTotalSoTiet, isNewMathStructure };
