import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { findYCCD, getSuggestedDVKT } from '../data/ctToan2018';
import { mathIndicators } from '../components/data/mathIndicators';
import { chemistryIndicators } from '../components/data/chemistryIndicators';
import { biologyIndicators } from '../components/data/biologyIndicators';
import { physicsIndicators } from '../components/data/physicsIndicators';
import { geographyIndicators } from '../components/data/geographyIndicators';

// =============================================================================
// HELPER: PhÃ¡t hiá»‡n mÃ´n há»c hiá»‡n táº¡i
// =============================================================================
const isMathSubject = (monHoc) => /toÃ¡n|toan|Ä‘áº¡i sá»‘|hÃ¬nh há»c|giáº£i tÃ­ch/i.test(monHoc || '');
const isChemistrySubject = (monHoc) => /hÃ³a|hoa há»c|hÃ³a há»c/i.test(monHoc || '');
const isBiologySubject = (monHoc) => /sinh|sinh há»c/i.test(monHoc || '');
const isPhysicsSubject = (monHoc) => /lÃ½|lÃ­|váº­t lÃ­|váº­t lÃ½/i.test(monHoc || '');
const isGeographySubject = (monHoc) => /Ä‘á»‹a|Ä‘á»‹a lÃ­|Ä‘á»‹a lÃ½/i.test(monHoc || '');

// Kiá»ƒm tra cáº¥u trÃºc 4-2-0 (ToÃ¡n) vÃ  cÃ³ Tá»± luáº­n Ä‘á»ƒ Ã¡p dá»¥ng báº£ng Ä‘áº·c táº£ máº«u má»›i
const isNewMathStructure = (examConfig, config) => {
  const ec = examConfig || {};
  const c = config || {};
  return (Number(ec.tongDiemP1) === 4) && 
         (Number(ec.tongDiemP2) === 2) && 
         (Number(ec.tongDiemP3) === 0) && 
         c.hasTuLuan;
};

// =============================================================================
// Táº O ÄVKT Máº¶C Äá»ŠNH â€” BÃ‚Y GIá»œ CHá»¨A Cáº¢ Sá» LÆ¯á»¢NG CÃ‚U Há»ŽI
// =============================================================================
const createDefaultDonVi = () => ({
  id: crypto.randomUUID(),
  noiDung: '',
  yeuCauCanDat: '', // <--- THÃŠM TRÆ¯á»œNG YCCÄ Cáº¤P ÄVKT
  soTiet: 1,
  isNuaDauKi: false, // <--- DI CHUYá»‚N Tá»ª Cáº¤P CHá»¦ Äá»€ XUá»NG Cáº¤P ÄVKT
  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
  selectedIndicators: [], // MÃ£ nÄƒng lá»±c chá»‰ bÃ¡o Ä‘Ã£ chá»n
  indicatorMap: {},       // GÃ¡n mÃ£ cho tá»«ng cÃ¢u
});

const defaultTopic = {
  id: crypto.randomUUID(),
  tenChuDe: '',
  donViKienThuc: [createDefaultDonVi()],
  yeuCauCanDat: '',
};

// =============================================================================
// THUáº¬T TOÃN LARGEST REMAINDER METHOD (Sá»‘ dÆ° lá»›n nháº¥t) â€” CHUáº¨N XÃC
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

// Helper: TÃ­nh tá»•ng sá»‘ tiáº¿t cá»§a 1 Chá»§ Ä‘á» tá»« cÃ¡c ÄVKT bÃªn trong
const getTotalSoTiet = (topic) => {
  if (!topic.donViKienThuc || topic.donViKienThuc.length === 0) {
    return Number(topic.soTiet) || 0;
  }
  return topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv.soTiet) || 0), 0);
};

// =============================================================================
// HELPER: TÃ­nh tá»•ng sá»‘ cÃ¢u há»i cá»§a 1 Chá»§ Ä‘á» = SUM cÃ¡c ÄVKT bÃªn trong
// =============================================================================
const getTopicSum = (topic, type, level) => {
  if (!topic.donViKienThuc) return 0;
  return topic.donViKienThuc.reduce((sum, dv) => {
    const obj = dv[type];
    if (!obj) return sum;
    // Há»— trá»£ subItems cho tuLuan (cáº¥u trÃºc má»›i)
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
    // Náº¿u cÃ³ subItems (cáº¥u trÃºc má»›i), tÃ­nh tá»« subItems
    if (Array.isArray(tl.subItems) && tl.subItems.length > 0) {
      const levelMap = { diemBiet: 'biet', diemHieu: 'hieu', diemVanDung: 'vanDung' };
      const level = levelMap[diemField];
      if (level) {
        return sum + tl.subItems.filter(s => s.level === level).reduce((s2, sub) => s2 + (sub.diem || 0), 0);
      }
    }
    // Fallback: dÃ¹ng field cÅ©
    return sum + (tl[diemField] ? (Number(tl[diemField]) || 0) : 0);
  }, 0);
};

export const useExamStore = create(
  persist(
    (set, get) => ({
      examHeader: {
        soGD: 'Sá»ž GIÃO Dá»¤C VÃ€ ÄÃ€O Táº O...',
        truong: 'TRÆ¯á»œNG:.............................',
        kyThi: 'Äá»€ KIá»‚M TRA Äá»ŠNH KÃŒ',
        monHoc: '........................',
        thoiGian: 'lÃ m bÃ i: 45 phÃºt',
        namHoc: '202... - 202...'
      },
      updateExamHeader: (field, value) => set((state) => ({
        examHeader: { ...state.examHeader, [field]: value }
      })),

      matrix: [{ ...defaultTopic }],

      // State cho tÃ­nh nÄƒng Sinh Ä‘á» tÆ°Æ¡ng Ä‘Æ°Æ¡ng
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
        isContinuousNumbering: true, // true = Ä‘Ã¡nh sá»‘ cÃ¢u há»i liÃªn tá»¥c tá»« 1 Ä‘áº¿n háº¿t, false = reset má»—i pháº§n
        exportTemplate: 'ministry',
        showCompetencySymbol: true, // Toggle kÃ½ hiá»‡u nÄƒng lá»±c trong báº£ng Ä‘áº·c táº£
        showCompetencyCode: true, // Toggle mÃ£ nÄƒng lá»±c [HH1.1] trong cá»™t YÃªu cáº§u cáº§n Ä‘áº¡t
        groupTfByTopic: false, // Gom 4 Ã½ ÄÃºng/Sai tá»« cÃ¡c bÃ i khÃ¡c nhau trong cÃ¹ng chá»§ Ä‘á»
      },

      // =====================================================================
      // Cáº¤U HÃŒNH Tá»° LUáº¬N CHI TIáº¾T (sá»‘ cÃ¢u, sá»‘ Ã½ má»—i cÃ¢u, Ä‘iá»ƒm má»—i Ã½)
      // =====================================================================
      tuLuanConfig: {
        enabled: false, // true = dÃ¹ng cáº¥u hÃ¬nh tá»± do, false = autofill tá»± tÃ­nh
        questions: [
          { id: 'tl_q1', label: 'CÃ¢u 1', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
          { id: 'tl_q2', label: 'CÃ¢u 2', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 1.0 }] },
          { id: 'tl_q3', label: 'CÃ¢u 3', kienThuc: '', subItems: [{ diem: 1.0 }] },
          { id: 'tl_q4', label: 'CÃ¢u 4', kienThuc: '', subItems: [{ diem: 1.0 }] },
        ],
      },

      setTuLuanConfig: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state.tuLuanConfig) : { ...state.tuLuanConfig, ...updater };
        return { tuLuanConfig: next };
      }),

      // =====================================================================
      // Cáº¤U HÃŒNH ÄIá»‚M LINH HOáº T CHO 3 PHáº¦N TNKQ
      // =====================================================================
      examConfig: {
        tongDiem: 10.0,                        // Tá»•ng Ä‘iá»ƒm toÃ n bÃ i
        tongDiemP1: 3.0, diemMoiCauP1: 0.25,  // Pháº§n I: TN nhiá»u lá»±a chá»n
        tongDiemP2: 2.0, diemMoiYP2: 0.25,    // Pháº§n II: ÄÃºng/Sai (Ä‘iá»ƒm 1 Ã½)
        tongDiemP3: 2.0, diemMoiYP3: 0.25,    // Pháº§n III: Tráº£ lá»i ngáº¯n (Ä‘iá»ƒm 1 Ã½)
        diemMoiYTuLuan: 0.5,                  // Äiá»ƒm má»—i Ã½ Tá»± luáº­n
        tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
      },

      updateExamConfig: (field, value) => set((state) => ({
        examConfig: { ...state.examConfig, [field]: value }
      })),

      toggleTuLuan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        if (val) {
          // Báº­t Tá»± luáº­n -> Cáº¥u hÃ¬nh P2, P3 theo tongDiemP1 hiá»‡n táº¡i
          if (p1 === 3.5) {
            // Cáº¥u trÃºc 3.5 - 2.0 - 1.5 (cÃ³ Tá»± luáº­n)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Máº·c Ä‘á»‹nh: P1-2-2-TL
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 2.0;
          }
        } else {
          // Táº¯t Tá»± luáº­n â†’ 100% Tráº¯c nghiá»‡m, chia pháº§n cÃ²n láº¡i cho P2+P3
          if (p1 === 3 || p1 === 3.0) {
            // Cáº¥u trÃºc 3 - 4 - 3
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 3.0;
          } else if (p1 === 3.5) {
            // Cáº¥u trÃºc 3.5 - 4.0 - 2.5 (100% TN)
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 2.5;
          } else if (p1 === 4.5) {
            // Cáº¥u trÃºc 4.5 - 4 - 1.5
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else if (p1 === 5.5) {
            // Cáº¥u trÃºc 5.5 - 3 - 1.5
            newExamConfig.tongDiemP2 = 3.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Fallback: chia Ä‘á»u pháº§n cÃ²n láº¡i
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

      // Chuyá»ƒn Ä‘á»•i cáº¥u trÃºc Ä‘á» (khi thay Ä‘á»•i dropdown P1)
      setCauTrucDe: (tongDiemP1) => set((state) => {
        const isCauTruc4213 = String(tongDiemP1) === '4.01';
        const p1 = isCauTruc4213 ? 4.0 : (Number(tongDiemP1) || 3.0);
        const newExamConfig = { ...state.examConfig, tongDiemP1: p1, isCauTruc4213 };
        const hasTLN = state.config.hasTraLoiNgan !== false;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === CHáº¾ Äá»˜ CÃ“ Tá»° LUáº¬N (TL = 3Ä‘) ===
          const tnTotal = 10.0 - 3.0; // TNKQ = 7Ä‘
          if (hasTLN) {
            // CÃ³ TLN: P1 + P2 + P3 = 7Ä‘
            if (isCauTruc4213) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              // Máº·c Ä‘á»‹nh: P1=3, P2=2, P3=2
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else {
            // KhÃ´ng TLN: P1 + P2 = 7Ä‘, P3=0
            if (p1 === 4.0 || p1 === 4) {
              // Cáº¥u trÃºc ToÃ¡n 4-2-0 (P1=4Ä‘, P2=2Ä‘, P3=0, TL=4Ä‘)
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
          // === CHáº¾ Äá»˜ 100% TRáº®C NGHIá»†M (TN = 10Ä‘) ===
          if (hasTLN) {
            // CÃ³ TLN: P1 + P2 + P3 = 10Ä‘
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 3.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 2.5;
            } else if (p1 === 4.0 || p1 === 4) {
              // Cáº¥u trÃºc ToÃ¡n 4-2-0 â†’ Tá»± luáº­n 4Ä‘
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
            // KhÃ´ng TLN: P1 + P2 = 10Ä‘, P3=0
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

      // Toggle Tráº£ lá»i ngáº¯n - xá»­ lÃ½ trong 1 láº§n set Ä‘á»ƒ trÃ¡nh race condition
      toggleTraLoiNgan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === CÃ“ Tá»° LUáº¬N (TL = 3Ä‘, TNKQ = 7Ä‘) ===
          const tnTotal = 7.0;
          if (val) {
            // Báº­t TLN
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else if (p1 === 4.0 || p1 === 4) {
            // Cáº¥u trÃºc ToÃ¡n 4-2-0 (TL giá»¯ 4Ä‘)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 0;
          } else {
            // Táº¯t TLN: P3 â†’ P2, TL giá»¯ nguyÃªn 3Ä‘
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 3.5; // 2.0 + 1.5
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((tnTotal - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        } else {
          // === 100% TRáº®C NGHIá»†M (TN = 10Ä‘) ===
          if (val) {
            // Báº­t TLN
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
            // Táº¯t TLN: P3 â†’ P2
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
      // ACTIONS CHO ÄÆ N Vá»Š KIáº¾N THá»¨C (ÄVKT)
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

      // HÃ nh Ä‘á»™ng cáº­p nháº­t YCCÄ cho tá»«ng ÄVKT
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

      // Cáº­p nháº­t mÃ£ chá»‰ bÃ¡o Ä‘Æ°á»£c chá»n cho ÄVKT
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

        // Chia vÄƒn báº£n thÃ nh cÃ¡c dÃ²ng
        const lines = rawText.split('\n');
        let currentDvIndex = -1;
        let yccdBlocks = {};

        for (let line of lines) {
          // DÃ² tÃ¬m cÃ¡c dÃ²ng tiÃªu Ä‘á» cÃ³ chá»©a sá»‘ thá»© tá»±: "1.", "**1.**", "1)", "**1**"
          // Regex nÃ y báº¯t chá»¯ sá»‘ Ä‘á»©ng Ä‘áº§u (cÃ³ thá»ƒ bá»c bá»Ÿi dáº¥u in Ä‘áº­m/gáº¡ch chÃ¢n)
          const match = line.match(/^\s*(?:\*\*|__)?(\d+)(?:\.|\))?(?:\*\*|__)?\s+/);

          if (match) {
            const num = parseInt(match[1], 10);
            currentDvIndex = num - 1; // Máº£ng báº¯t Ä‘áº§u tá»« 0
            if (!yccdBlocks[currentDvIndex]) yccdBlocks[currentDvIndex] = [];
          } else {
            // Náº¿u Ä‘ang á»Ÿ trong block cá»§a má»™t BÃ i há»c vÃ  dÃ²ng khÃ´ng trá»‘ng, thÃ¬ lÆ°u dÃ²ng Ä‘Ã³ láº¡i
            if (currentDvIndex >= 0 && line.trim() !== '') {
              yccdBlocks[currentDvIndex].push(line.trim());
            }
          }
        }

        // Äá»• dá»¯ liá»‡u YCCÄ vÃ o Ä‘Ãºng ÄVKT tÆ°Æ¡ng á»©ng
        const dvList = newMatrix[topicIndex].donViKienThuc || [];
        dvList.forEach((dv, index) => {
          if (yccdBlocks[index] && yccdBlocks[index].length > 0) {
            dv.yeuCauCanDat = yccdBlocks[index].join('\n');
          }
        });

        return { matrix: newMatrix };
      }),

      // Äáº I PHáºªU: Cáº­p nháº­t sá»‘ cÃ¢u há»i á»Ÿ Cáº¤P ÄVKT
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

      // Äáº I PHáºªU: Cáº­p nháº­t Ä‘iá»ƒm tá»± luáº­n á»Ÿ Cáº¤P ÄVKT
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

      // --- ACTIONS CHO Tá»° LUáº¬N SUB-ITEMS (linh hoáº¡t Ä‘iá»ƒm theo Ã½) ---
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
            dv.indicatorMap = {}; // Reset mapping cÅ©
          });
        });

        const tongSoTietToanBai = topics.reduce((sum, t) =>
          sum + t.donViKienThuc.reduce((s, dv) => s + (Number(dv.soTiet) || 0), 0), 0);

        if (tongSoTietToanBai === 0) {
          alert("Vui lÃ²ng nháº­p 'Sá»‘ tiáº¿t' lá»›n hÆ¡n 0!");
          return {};
        }

        const ec = state.examConfig;
        const dP1 = Number(ec.diemMoiCauP1) || 0.25;
        const dP2 = Number(ec.diemMoiYP2) || 0.25;
        const dP3 = Number(ec.diemMoiYP3) || 0.25;
        const dTL = Number(ec.diemMoiYTuLuan) || 0.5;

        let pool = [];
        let tuLuanPool = []; // Pool riÃªng cho tá»± luáº­n Ä‘á»ƒ Æ°u tiÃªn phÃ¢n bá»•
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

        // === CÃ‚N Äá»I Tá»”NG THá»‚ THEO Tá»ˆ Lá»† 40-30-30 ===
        const tiLe = state.examConfig.tiLeNhanThuc || { biet: 40, hieu: 30, vanDung: 30 };
        const tongDiemDe = 10.0;
        const tongDiemBiet = Math.round(tongDiemDe * tiLe.biet / 100 * 100) / 100;
        const tongDiemHieu = Math.round(tongDiemDe * tiLe.hieu / 100 * 100) / 100;
        const tongDiemVanDung = Math.round((tongDiemDe - tongDiemBiet - tongDiemHieu) * 100) / 100;

        console.log(`ðŸŽ¯ Tá»‰ lá»‡ tá»•ng thá»ƒ: ${tiLe.biet}% Biáº¿t (${tongDiemBiet}Ä‘), ${tiLe.hieu}% Hiá»ƒu (${tongDiemHieu}Ä‘), ${tiLe.vanDung}% Váº­n dá»¥ng (${tongDiemVanDung}Ä‘)`);

        // === BÆ¯á»šC 1: CHIA Tá»ª LUáº¬N TRÆ¯á»šC THEO Tá»ˆ Lá»† Tá»”NG THá»‚ ===
        let tlBiet = 0, tlHieu = 0, tlVanDung = 0;
        if (tTL > 0) {
          tlBiet = Math.round((tTL * tiLe.biet / 100) * 100) / 100;
          tlHieu = Math.round((tTL * tiLe.hieu / 100) * 100) / 100;
          tlVanDung = Math.round((tTL - tlBiet - tlHieu) * 100) / 100;
          console.log(`ðŸ“˜ Tá»± luáº­n: ${tlBiet}Ä‘ Biáº¿t, ${tlHieu}Ä‘ Hiá»ƒu, ${tlVanDung}Ä‘ Váº­n dá»¥ng`);
        }

        // === BÆ¯á»šC 2: PHÃ‚N Bá»” Tá»ª LUáº¬N VÃ€O POOL ===
        if (tTL > 0) {
          const tlCfg = state.tuLuanConfig;
          const hasManualConfig = tlCfg?.enabled && tlCfg?.questions && tlCfg.questions.length > 0 && tlCfg.questions.some(q => q.subItems && q.subItems.length > 0);

          if (hasManualConfig) {
            console.log('ðŸ”§ Autofill: Tá»± luáº­n - cháº¿ Ä‘á»™ cáº¥u hÃ¬nh thá»§ cÃ´ng');
            // Thu tháº­p táº¥t cáº£ subItems tá»« config
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
              // PhÃ¢n bá»• sá»‘ lÆ°á»£ng Ã½ theo tá»‰ lá»‡ 40-30-30
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
            console.log('ðŸ¤– Autofill: Tá»± luáº­n - cháº¿ Ä‘á»™ tá»± Ä‘á»™ng');
            // XÃ¡c Ä‘á»‹nh sá»‘ Ã½ sao cho soY Ã— dTL = tTL (Æ°u tiÃªn Ä‘Ãºng tá»•ng Ä‘iá»ƒm)
            const soYTuLuan = Math.max(3, Math.min(10, Math.round(tTL / dTL)));
            // Äiá»ƒm thá»±c má»—i Ã½ = tTL / soY (cÃ³ thá»ƒ khÃ´ng trÃ²n 0.25)
            const diemMoiY = Math.round((tTL / soYTuLuan) * 100) / 100;
            // PhÃ¢n bá»• Ã½ theo tá»‰ lá»‡ 40-30-30 (báº±ng sá»‘ lÆ°á»£ng)
            const arrTL = distributeLargestRemainder(soYTuLuan, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
            const levels = ['biet', 'hieu', 'vanDung'];
            let totalAdded = 0;
            let yIdx = 0;
            for (let li = 0; li < 3; li++) {
              for (let i = 0; i < arrTL[li]; i++) {
                yIdx++;
                // Ã cuá»‘i cÃ¹ng (tá»•ng thá»ƒ): bÃ¹ sai sá»‘ Ä‘á»ƒ tá»•ng = tTL chÃ­nh xÃ¡c
                const pts = (yIdx === soYTuLuan)
                  ? Math.round((tTL - totalAdded) * 100) / 100
                  : diemMoiY;
                addTuLuanPool(levels[li], Math.max(0.25, pts));
                totalAdded += pts;
              }
            }
          }
        }

        // === BÆ¯á»šC 3: TÃNH Sá» CÃ‚U ÄÃšNG/SAI TRá»°C TIáº¾P ===
        // Má»—i cÃ¢u ÄS = 4 Ã½ (1B + 1H + 1VD + 1VDC), cá»‘ Ä‘á»‹nh theo quy Ä‘á»‹nh Bá»™ GD-ÄT
        // TÃ­nh trá»±c tiáº¿p tá»« tá»•ng Ä‘iá»ƒm P2, khÃ´ng qua pool (trÃ¡nh máº¥t Ã½ do rounding)
        const numTfBlocks = Math.round(tP2 / (dP2 * 4));

        // Äiá»ƒm ÄS THá»°C Táº¾ per level (VDC gá»™p vÃ o VD khi tÃ­nh tá»‰ lá»‡ nháº­n thá»©c)
        const dsActualBiet = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualHieu = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualVD   = Math.round(numTfBlocks * dP2 * 2 * 100) / 100; // VD + VDC

        console.log(`ðŸ“— ÄÃºng/Sai: ${numTfBlocks} cÃ¢u Ã— 4 Ã½ = ${numTfBlocks * 4} Ã½ = ${dsActualBiet + dsActualHieu + dsActualVD}Ä‘ (B=${dsActualBiet}Ä‘, H=${dsActualHieu}Ä‘, VD=${dsActualVD}Ä‘)`);

        // === TÃNH ÄIá»‚M Tá»° LUáº¬N THá»°C Táº¾ Tá»ª POOL (khÃ´ng dÃ¹ng giÃ¡ trá»‹ lÃ½ thuyáº¿t) ===
        const tlActualBiet = Math.round(tuLuanPool.filter(p => p.lvl === 'biet').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualHieu = Math.round(tuLuanPool.filter(p => p.lvl === 'hieu').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualVanDung = Math.round(tuLuanPool.filter(p => p.lvl === 'vanDung').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        console.log(`ðŸ“˜ TL thá»±c táº¿: ${tlActualBiet}Ä‘ Biáº¿t, ${tlActualHieu}Ä‘ Hiá»ƒu, ${tlActualVanDung}Ä‘ VD (tá»•ng=${Math.round((tlActualBiet+tlActualHieu+tlActualVanDung)*100)/100}Ä‘)`);

        // === BÆ¯á»šC 4: TÃNH TARGET CÃ’N Láº I CHO P1+P3 (dá»±a trÃªn ÄS + TL THá»°C Táº¾) ===
        const conLaiBiet = Math.max(0, Math.round((tongDiemBiet - tlActualBiet - dsActualBiet) * 100) / 100);
        const conLaiHieu = Math.max(0, Math.round((tongDiemHieu - tlActualHieu - dsActualHieu) * 100) / 100);
        const conLaiVanDung = Math.max(0, Math.round((tongDiemVanDung - tlActualVanDung - dsActualVD) * 100) / 100);

        console.log(`ðŸ“Š Target cÃ²n láº¡i P1+P3: ${conLaiBiet}Ä‘ Biáº¿t, ${conLaiHieu}Ä‘ Hiá»ƒu, ${conLaiVanDung}Ä‘ Váº­n dá»¥ng`);

        // === BÆ¯á»šC 5: PHÃ‚N Bá»” P1 VÃ€ P3 Äá»‚ BÃ™ Äáº T 40-30-30 ===
        const tongConLai = conLaiBiet + conLaiHieu + conLaiVanDung;
        if (tongConLai > 0) {
          const soCauP1 = tP1 > 0 ? Math.round(tP1 / dP1) : 0;
          const soCauP3 = tP3 > 0 ? Math.round(tP3 / dP3) : 0;

          let arrP3 = [0, 0, 0];
          let arrP1 = [0, 0, 0];

          // Æ¯u tiÃªn phÃ¢n bá»• P3 trÆ°á»›c vÃ¬ Ä‘iá»ƒm má»—i cÃ¢u P3 thÆ°á»ng lá»›n hÆ¡n (vd 0.5Ä‘), khÃ³ khÃ­t Ä‘iá»ƒm hÆ¡n P1
          if (soCauP3 > 0) {
            arrP3 = distributeLargestRemainder(soCauP3, [conLaiBiet, conLaiHieu, conLaiVanDung]);
            addPool('traLoiNgan', 'biet', arrP3[0], dP3);
            addPool('traLoiNgan', 'hieu', arrP3[1], dP3);
            addPool('traLoiNgan', 'vanDung', arrP3[2], dP3);
          }

          // TÃ­nh láº¡i target Ä‘iá»ƒm CÃ’N Láº I THá»°C Táº¾ cho P1 sau khi P3 Ä‘Ã£ chiáº¿m
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

        // Pool giá» chá»‰ chá»©a NLC + TLN (ÄS tÃ­nh trá»±c tiáº¿p, khÃ´ng qua pool)
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

        // numTfBlocks Ä‘Ã£ tÃ­nh á»Ÿ bÆ°á»›c 3
        if (state.config.groupTfByTopic) {
          // CHáº¾ Äá»˜ GOM THEO CHá»¦ Äá»€: PhÃ¢n bá»• 4 Ã½ ÄÃºng/Sai ra cÃ¡c BÃ i khÃ¡c nhau trong cÃ¹ng Chá»§ Ä‘á»
          for (let i = 0; i < numTfBlocks; i++) {
            // TÃ¬m chá»§ Ä‘á» Ä‘ang "Ä‘Ã³i" Ä‘iá»ƒm nháº¥t
            let bestTopicIdx = -1, maxTopicGap = -Infinity;
            topics.forEach((topic, ti) => {
              const topicTarget = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.target, 0);
              const topicCurrent = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.current, 0);
              const gap = topicTarget - topicCurrent;
              if (gap > maxTopicGap) { maxTopicGap = gap; bestTopicIdx = ti; }
            });

            if (bestTopicIdx !== -1) {
              const topicDvs = flatDvList.filter(f => f.ti === bestTopicIdx);
              // PhÃ¢n bá»• 4 Ã½ (B, H, VD, VDC) cho cÃ¡c bÃ i trong chá»§ Ä‘á» nÃ y (theo gap lá»›n nháº¥t)
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
          // CHáº¾ Äá»˜ Máº¶C Äá»ŠNH: Dá»“n cáº£ 4 Ã½ vÃ o 1 BÃ i
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

        // === Æ¯U TIÃŠN PHÃ‚N Bá»” Tá»° LUáº¬N TRÆ¯á»šC ===
        console.log('ðŸŽ¯ Autofill: PhÃ¢n bá»• tá»± luáº­n trÆ°á»›c (Æ°u tiÃªn)');
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
          // LuÃ´n táº¡o subItem vá»›i Ä‘iá»ƒm chÃ­nh xÃ¡c tá»« pool
          if (!Array.isArray(dv.tuLuan.subItems)) dv.tuLuan.subItems = [];
          dv.tuLuan.subItems.push({
            id: crypto.randomUUID(),
            y: '',
            diem: Math.round(item.pts * 100) / 100,
            level: item.lvl
          });
          // Sync old fields tá»« subItems (Ä‘á»ƒ backward compat)
          dv.tuLuan.biet = dv.tuLuan.subItems.filter(s => s.level === 'biet').length;
          dv.tuLuan.hieu = dv.tuLuan.subItems.filter(s => s.level === 'hieu').length;
          dv.tuLuan.vanDung = dv.tuLuan.subItems.filter(s => s.level === 'vanDung').length;
          dv.tuLuan.diemBiet = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemHieu = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemVanDung = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          flatDvList[bestIdx].current += item.pts;
        });

        // === SAU ÄÃ“ Má»šI PHÃ‚N Bá»” CÃC LOáº I CÃ‚U KHÃC ===
        console.log('ðŸ“ Autofill: PhÃ¢n bá»• cÃ¡c loáº¡i cÃ¢u khÃ¡c');
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
          // Chá»‰ xá»­ lÃ½ cÃ¡c loáº¡i cÃ¢u khÃ´ng pháº£i tá»± luáº­n (Ä‘Ã£ xá»­ lÃ½ riÃªng á»Ÿ trÃªn)
          dv[item.type][item.lvl]++;
          flatDvList[bestIdx].current += item.pts;
        });

        // === GÃN MÃƒ NÄ‚NG Lá»°C CHá»ˆ BÃO VÃ€ Sá» THá»¨ Tá»° CÃ‚U Há»ŽI Tá»° Äá»˜NG ===
        console.log('ðŸ”— Autofill: GÃ¡n mÃ£ nÄƒng lá»±c vÃ  nhÃ£n cÃ¢u há»i');
        
        const isContinuous = state.config.isContinuousNumbering;
        const numP1 = Math.round(tP1 / dP1);
        const numP2 = Math.round(tP2 / (dP2 * 4));
        const numP3 = Math.round(tP3 / dP3);

        let p1GlobalCounter = 1;
        let p2GlobalCounter = isContinuous ? (p1GlobalCounter + numP1) : 1;
        let p3GlobalCounter = isContinuous ? (p2GlobalCounter + numP2) : 1;
        let tlGlobalCounter = isContinuous ? (p3GlobalCounter + numP3) : 1;

        // Biáº¿n Ä‘áº¿m sá»‘ Ã½ cho pháº§n ÄÃºng/Sai (Ä‘á»ƒ tÃ­nh sá»‘ cÃ¢u)
        let p2ItemCounter = 0;

        // Tiá»n tá»‘ (Prefix)
        const p1Pre = isContinuous ? 'C' : 'TN';
        const p2Pre = isContinuous ? 'C' : 'ÄS';
        const p3Pre = isContinuous ? 'C' : 'TLN';
        const tlPre = isContinuous ? 'C' : 'TL';

        const globalIndIdx = {
          biet: 0,
          hieu: 0,
          vanDung: 0,
          vanDungCao: 0
        };

        // Ta quÃ©t theo tá»«ng loáº¡i cÃ¢u há»i Ä‘á»ƒ Ä‘áº£m báº£o sá»‘ thá»© tá»± cháº¡y liÃªn tá»¥c trong toÃ n Ä‘á»
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
                // TÃ­nh toÃ¡n sá»‘ lÆ°á»£ng cÃ¢u thá»±c táº¿ Ä‘á»ƒ gÃ¡n nhÃ£n
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
                  
                  // GÃ¡n nhÃ£n cÃ¢u há»i
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

                  // GÃ¡n mÃ£ nÄƒng lá»±c
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

      // =====================================================================
      // [Má»šI - CT TOÃN 2018] Tra cá»©u vÃ  Ä‘iá»n tá»± Ä‘á»™ng YCCÄ tá»« CT2018
      // HÃ m nÃ y HOÃ€N TOÃ€N Äá»˜C Láº¬P - khÃ´ng sá»­a báº¥t ká»³ logic cÅ© nÃ o
      // Chá»‰ hoáº¡t Ä‘á»™ng khi: mÃ´n ToÃ¡n + lá»›p 6-12 + cáº¥u trÃºc 4-2-1-3
      // =====================================================================
      applyCtToan2018: () => set((state) => {
        // Chá»‰ kÃ­ch hoáº¡t vá»›i mÃ´n ToÃ¡n
        const monHoc = state.examHeader?.monHoc || '';
        if (!/toÃ¡n|toan/i.test(monHoc)) return {};

        // Láº¥y lá»›p tá»« examHeader (tÃ¬m trong chuá»—i: "Lá»›p 8", "lá»›p10", "8", ...)
        const lopMatch = monHoc.match(/\b(6|7|8|9|10|11|12)\b/) ||
                         (state.examHeader?.kyThi || '').match(/\b(6|7|8|9|10|11|12)\b/);
        // Thá»­ tÃ¬m trong táº¥t cáº£ cÃ¡c field cá»§a examHeader
        const allHeaderText = Object.values(state.examHeader || {}).join(' ');
        const lopFromHeader = allHeaderText.match(/lá»›p\s*(6|7|8|9|10|11|12)\b/i) ||
                              allHeaderText.match(/\bkhá»‘i\s*(6|7|8|9|10|11|12)\b/i) ||
                              allHeaderText.match(/\b(6|7|8|9|10|11|12)\b/);
        const lop = lopFromHeader ? parseInt(lopFromHeader[1]) : null;

        if (!lop || lop < 6 || lop > 12) {
          console.warn('âš ï¸ CT2018: KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c lá»›p. Vui lÃ²ng ghi rÃµ lá»›p trong header Ä‘á» (vÃ­ dá»¥: "ToÃ¡n 8", "Lá»›p 9").');
          return {};
        }

        const topics = JSON.parse(JSON.stringify(state.matrix));
        let updatedCount = 0;

        topics.forEach(topic => {
          (topic.donViKienThuc || []).forEach(dv => {
            const tenDVKT = dv.noiDung || '';
            if (!tenDVKT.trim()) return;

            // Tra cá»©u YCCÄ tá»« cÆ¡ sá»Ÿ dá»¯ liá»‡u CT2018
            const found = findYCCD('toÃ¡n', lop, tenDVKT);
            if (!found) return;

            // Tá»•ng há»£p YCCÄ theo má»©c Ä‘á»™ nháº­n thá»©c
            const lines = [];
            if (found.yccD.biet?.length) {
              lines.push('â¶ Nháº­n biáº¿t:');
              found.yccD.biet.forEach(y => lines.push(`  - ${y}`));
            }
            if (found.yccD.hieu?.length) {
              lines.push('â· ThÃ´ng hiá»ƒu:');
              found.yccD.hieu.forEach(y => lines.push(`  - ${y}`));
            }
            if (found.yccD.vanDung?.length) {
              lines.push('â¸ Váº­n dá»¥ng:');
              found.yccD.vanDung.forEach(y => lines.push(`  - ${y}`));
            }

            // Chá»‰ ghi Ä‘Ã¨ náº¿u YCCÄ hiá»‡n táº¡i trá»‘ng hoáº·c lÃ  máº·c Ä‘á»‹nh
            if (!dv.yeuCauCanDat || dv.yeuCauCanDat.trim() === '') {
              dv.yeuCauCanDat = lines.join('\n');
              updatedCount++;
            }
          });
        });

        console.log(`âœ… CT2018: ÄÃ£ Ä‘iá»n YCCÄ cho ${updatedCount} Ä‘Æ¡n vá»‹ kiáº¿n thá»©c (Lá»›p ${lop})`);
        return { matrix: topics };
      }),

      // Láº¥y danh sÃ¡ch gá»£i Ã½ ÄVKT theo mÃ´n vÃ  lá»›p (dÃ¹ng cho dropdown gá»£i Ã½ á»Ÿ Step2)
      getSuggestedDVKTList: (monHoc, lop) => {
        return getSuggestedDVKT(monHoc, lop);
      },

      smartImportData: (rawText) => set((state) => {
        try {
          let newMatrix = [...state.matrix];
          if (newMatrix.length === 1 && !newMatrix[0].tenChuDe && newMatrix[0].donViKienThuc.length === 1 && !newMatrix[0].donViKienThuc[0].noiDung) {
            newMatrix = [];
          }

          const text = rawText.trim();
          
          // --- Cáº¢I TIáº¾N 1: TÃŒM JSON TRONG VÄ‚N Báº¢N ---
          let jsonData = null;
          const jsonMatch = text.match(/\[\s*\{.*\}\s*\]|\{\s*".*"\s*:\s*.*\}/s);
          if (jsonMatch) {
            try {
              jsonData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.warn("TÃ¬m tháº¥y block giá»‘ng JSON nhÆ°ng parse lá»—i:", e);
            }
          }

          if (jsonData) {
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            dataArray.forEach(topicData => {
              newMatrix.push({
                id: crypto.randomUUID(),
                tenChuDe: topicData.tenChuDe || topicData.topic || "Chá»§ Ä‘á» má»›i",
                isNuaDauKi: false,
                yeuCauCanDat: '',
                donViKienThuc: (topicData.donViKienThucs || topicData.donViKienThuc || []).map(dv => ({
                  id: crypto.randomUUID(),
                  noiDung: dv.tenDonVi || dv.noiDung || dv.content || "BÃ i má»›i",
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

          // --- Cáº¢I TIáº¾N 2: Xá»¬ LÃ Dá»® LIá»†U Báº¢NG (EXCEL/WORD/TEXT) ---
          const rows = text.split('\n').map(r => r.trim()).filter(r => r);
          let currentTopicIndex = newMatrix.length > 0 ? newMatrix.length - 1 : -1;

          rows.forEach((row) => {
            const columns = row.split(/\t|\||;/).map(c => c.trim());
            let tenChuDe = "", tenDonVi = "", soTiet = 1, yccd = "";

            if (columns.length === 1) {
              // CHá»ˆ CÃ“ 1 Cá»˜T: Kiá»ƒm tra gáº¯t gao hÆ¡n Ä‘á»ƒ trÃ¡nh nháº­n nháº§m BÃ i há»c lÃ  Chá»§ Ä‘á»
              const isTopic = /^(chÆ°Æ¡ng|chuong|chá»§ Ä‘á»|chu de|pháº§n|phan)\s+(\d+|[IVX]+)/i.test(columns[0]);
              if (isTopic) {
                tenChuDe = columns[0];
              } else {
                tenDonVi = columns[0];
                if (currentTopicIndex === -1) tenChuDe = "ChÆ°Æ¡ng/Chá»§ Ä‘á» 1";
              }
            } else if (columns.length === 2) {
              tenDonVi = columns[0];
              soTiet = columns[1];
              if (currentTopicIndex === -1) tenChuDe = "ChÆ°Æ¡ng/Chá»§ Ä‘á» 1";
            } else if (columns.length === 3) {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2];
            } else {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2]; yccd = columns[3];
            }

            if (tenChuDe) {
              // Náº¿u Ä‘ang cÃ³ chá»§ Ä‘á» máº·c Ä‘á»‹nh trá»‘ng, thÃ¬ dÃ¹ng luÃ´n nÃ³ thay vÃ¬ push má»›i
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
          alert("Lá»—i phÃ¢n tÃ­ch dá»¯ liá»‡u!");
          return state;
        }
      }),

      // HÃ m má»›i: Chá»‰ nháº­p ÄVKT vÃ o má»™t Chá»§ Ä‘á» nháº¥t Ä‘á»‹nh
      importDonVisToTopic: (topicId, rawText) => set((state) => {
        const text = rawText.trim();
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        
        return {
          matrix: state.matrix.map(topic => {
            if (topic.id !== topicId) return topic;
            
            const newDvs = [...topic.donViKienThuc];
            // Náº¿u ÄVKT duy nháº¥t Ä‘ang trá»‘ng, xÃ³a nÃ³ Ä‘i Ä‘á»ƒ thay báº±ng list má»›i
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

      // GIá»® Láº I cho backward compatibility â€” nhÆ°ng KHÃ”NG DÃ™NG trong UI má»›i
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
        // Migration v2 â†’ v3: model API
        if (version < 3) {
          const deprecatedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
          if (!persistedState.selectedModel || deprecatedModels.includes(persistedState.selectedModel)) {
            persistedState.selectedModel = 'gemini-2.0-flash';
          }
        }

        // Migration v3 â†’ v4: noiDung + soTiet â†’ donViKienThuc[]
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

        // Migration v4 â†’ v5: Chuyá»ƒn question counts tá»« topic â†’ ÄVKT[0]
        if (version < 5) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix = persistedState.matrix.map(topic => {
              const dvList = topic.donViKienThuc || [];
              if (dvList.length > 0) {
                // Copy topic-level counts vÃ o ÄVKT Ä‘áº§u tiÃªn (náº¿u ÄVKT chÆ°a cÃ³)
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
                // Náº¿u ÄVKT cÃ³ phanBo (tá»« autoFill cÅ©), chuyá»ƒn phanBo â†’ fields chÃ­nh
                dvList.forEach(dv => {
                  if (dv.phanBo) {
                    if (!dv.nhieuLuaChon) dv.nhieuLuaChon = { ...(dv.phanBo.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.dungSai) dv.dungSai = { ...(dv.phanBo.dungSai || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.traLoiNgan) dv.traLoiNgan = { ...(dv.phanBo.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.tuLuan) dv.tuLuan = { ...(dv.phanBo.tuLuan || { biet: 0, hieu: 0, vanDung: 0 }), diemBiet: 0, diemHieu: 0, diemVanDung: 0 };
                    delete dv.phanBo;
                  }
                  // Äáº£m báº£o má»i ÄVKT Ä‘á»u cÃ³ fields máº·c Ä‘á»‹nh
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

        // Migration v5 â†’ v6: ThÃªm examConfig máº·c Ä‘á»‹nh náº¿u chÆ°a cÃ³
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

        // Migration v6 â†’ v7: Bá»• sung tongDiem, diemMoiYTuLuan náº¿u thiáº¿u
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

        // Migration v8 â†’ v9: ThÃªm tuLuanConfig cho cáº¥u hÃ¬nh tá»± luáº­n chi tiáº¿t
        if (version < 9) {
          if (!persistedState.tuLuanConfig) {
            persistedState.tuLuanConfig = {
              enabled: false,
              questions: [
                { id: 'tl_q1', label: 'CÃ¢u 1', subItems: [
                  { diem: 0.5 },
                  { diem: 0.5 },
                ]},
                { id: 'tl_q2', label: 'CÃ¢u 2', subItems: [
                  { diem: 0.5 },
                  { diem: 1.0 },
                ]},
                { id: 'tl_q3', label: 'CÃ¢u 3', subItems: [
                  { diem: 1.0 },
                ]},
                { id: 'tl_q4', label: 'CÃ¢u 4', subItems: [
                  { diem: 1.0 },
                ]},
              ],
            };
          }
        }

        // Migration v9 â†’ v10: Bá» trÆ°á»ng yccd khá»i tuLuanConfig subItems (YCCÄ chuyá»ƒn sang Ä‘áº·c táº£)
        if (version < 10) {
          if (persistedState.tuLuanConfig && persistedState.tuLuanConfig.questions) {
            persistedState.tuLuanConfig.questions.forEach(q => {
              if (q.subItems) {
                q.subItems = q.subItems.map(sub => {
                  const { yccd, ...rest } = sub;
                  // Bá» level náº¿u tá»“n táº¡i (level sáº½ Ä‘Æ°á»£c auto-gÃ¡n khi auto-fill)
                  const { level: _level, ...rest2 } = rest;
                  return rest2;
                });
              }
            });
          }
        }

        // Migration v7 â†’ v8: ThÃªm subItems[] cho tá»± luáº­n linh hoáº¡t (giá»¯ backward compat)
        if (version < 8) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix.forEach(topic => {
              (topic.donViKienThuc || []).forEach(dv => {
                if (dv.tuLuan) {
                  if (!Array.isArray(dv.tuLuan.subItems)) {
                    // Náº¿u cÃ³ Ä‘iá»ƒm cÅ©, chuyá»ƒn thÃ nh subItems máº·c Ä‘á»‹nh
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
            // Bá»• sung cáº¥u trÃºc ToÃ¡n 4-2-4 náº¿u mÃ´n lÃ  ToÃ¡n
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

        // Migration v10 â†’ v11: Force-fix tiLeNhanThuc = 40-30-30 (fix bug migration v8 set sai cho ToÃ¡n)
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

// Export helpers cho cÃ¡c component sá»­ dá»¥ng
export { getTopicSum, getTopicTuLuanDiem, getTotalSoTiet, isNewMathStructure };
