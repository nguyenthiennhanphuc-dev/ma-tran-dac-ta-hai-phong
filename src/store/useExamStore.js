import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyCtToan2018Helper } from '../utils/ctToan2018Helper';
import { mathIndicators } from '../components/data/mathIndicators';
import { chemistryIndicators } from '../components/data/chemistryIndicators';
import { biologyIndicators } from '../components/data/biologyIndicators';
import { physicsIndicators } from '../components/data/physicsIndicators';
import { geographyIndicators } from '../components/data/geographyIndicators';

// =============================================================================
// HELPER: Ph├ít hiß╗çn m├┤n hß╗ìc hiß╗çn tß║íi
// =============================================================================
const isMathSubject = (monHoc) => /to├ín|toan|─æß║íi sß╗æ|h├¼nh hß╗ìc|giß║úi t├¡ch/i.test(monHoc || '');
const isChemistrySubject = (monHoc) => /h├│a|hoa hß╗ìc|h├│a hß╗ìc/i.test(monHoc || '');
const isBiologySubject = (monHoc) => /sinh|sinh hß╗ìc/i.test(monHoc || '');
const isPhysicsSubject = (monHoc) => /l├╜|l├¡|vß║¡t l├¡|vß║¡t l├╜/i.test(monHoc || '');
const isGeographySubject = (monHoc) => /─æß╗ïa|─æß╗ïa l├¡|─æß╗ïa l├╜/i.test(monHoc || '');

// Kiß╗âm tra cß║Ñu tr├║c 4-2-0 (To├ín) v├á c├│ Tß╗▒ luß║¡n ─æß╗â ├íp dß╗Ñng bß║úng ─æß║╖c tß║ú mß║½u mß╗¢i
const isNewMathStructure = (examConfig, config) => {
  const ec = examConfig || {};
  const c = config || {};
  return (Number(ec.tongDiemP1) === 4) && 
         (Number(ec.tongDiemP2) === 2) && 
         (Number(ec.tongDiemP3) === 0) && 
         c.hasTuLuan;
};

// =============================================================================
// Tß║áO ─ÉVKT Mß║╢C ─Éß╗èNH ΓÇö B├éY GIß╗£ CHß╗¿A Cß║ó Sß╗É L╞»ß╗óNG C├éU Hß╗ÄI
// =============================================================================
const createDefaultDonVi = () => ({
  id: crypto.randomUUID(),
  noiDung: '',
  yeuCauCanDat: '', // <--- TH├èM TR╞»ß╗£NG YCC─É Cß║ñP ─ÉVKT
  soTiet: 1,
  isNuaDauKi: false, // <--- DI CHUYß╗éN Tß╗¬ Cß║ñP CHß╗ª ─Éß╗Ç XUß╗ÉNG Cß║ñP ─ÉVKT
  nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
  dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
  tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
  selectedIndicators: [], // M├ú n─âng lß╗▒c chß╗ë b├ío ─æ├ú chß╗ìn
  indicatorMap: {},       // G├ín m├ú cho tß╗½ng c├óu
});

const defaultTopic = {
  id: crypto.randomUUID(),
  tenChuDe: '',
  donViKienThuc: [createDefaultDonVi()],
  yeuCauCanDat: '',
};

// =============================================================================
// THUß║¼T TO├üN LARGEST REMAINDER METHOD (Sß╗æ d╞░ lß╗¢n nhß║Ñt) ΓÇö CHUß║¿N X├üC
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

// Helper: T├¡nh tß╗òng sß╗æ tiß║┐t cß╗ºa 1 Chß╗º ─æß╗ü tß╗½ c├íc ─ÉVKT b├¬n trong
const getTotalSoTiet = (topic) => {
  if (!topic.donViKienThuc || topic.donViKienThuc.length === 0) {
    return Number(topic.soTiet) || 0;
  }
  return topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv.soTiet) || 0), 0);
};

// =============================================================================
// HELPER: T├¡nh tß╗òng sß╗æ c├óu hß╗Åi cß╗ºa 1 Chß╗º ─æß╗ü = SUM c├íc ─ÉVKT b├¬n trong
// =============================================================================
const getTopicSum = (topic, type, level) => {
  if (!topic.donViKienThuc) return 0;
  return topic.donViKienThuc.reduce((sum, dv) => {
    const obj = dv[type];
    if (!obj) return sum;
    // Hß╗ù trß╗ú subItems cho tuLuan (cß║Ñu tr├║c mß╗¢i)
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
    // Nß║┐u c├│ subItems (cß║Ñu tr├║c mß╗¢i), t├¡nh tß╗½ subItems
    if (Array.isArray(tl.subItems) && tl.subItems.length > 0) {
      const levelMap = { diemBiet: 'biet', diemHieu: 'hieu', diemVanDung: 'vanDung' };
      const level = levelMap[diemField];
      if (level) {
        return sum + tl.subItems.filter(s => s.level === level).reduce((s2, sub) => s2 + (sub.diem || 0), 0);
      }
    }
    // Fallback: d├╣ng field c┼⌐
    return sum + (tl[diemField] ? (Number(tl[diemField]) || 0) : 0);
  }, 0);
};

export const useExamStore = create(
  persist(
    (set, get) => ({
      examHeader: {
        soGD: 'Sß╗₧ GI├üO Dß╗ñC V├Ç ─É├ÇO Tß║áO...',
        truong: 'TR╞»ß╗£NG:.............................',
        kyThi: '─Éß╗Ç KIß╗éM TRA ─Éß╗èNH K├î',
        monHoc: '........................',
        thoiGian: 'l├ám b├ái: 45 ph├║t',
        namHoc: '202... - 202...'
      },
      updateExamHeader: (field, value) => set((state) => ({
        examHeader: { ...state.examHeader, [field]: value }
      })),

      matrix: [{ ...defaultTopic }],

      // State cho t├¡nh n─âng Sinh ─æß╗ü t╞░╞íng ─æ╞░╞íng
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
        isContinuousNumbering: true, // true = ─æ├ính sß╗æ c├óu hß╗Åi li├¬n tß╗Ñc tß╗½ 1 ─æß║┐n hß║┐t, false = reset mß╗ùi phß║ºn
        exportTemplate: 'ministry',
        showCompetencySymbol: true, // Toggle k├╜ hiß╗çu n─âng lß╗▒c trong bß║úng ─æß║╖c tß║ú
        showCompetencyCode: true, // Toggle m├ú n─âng lß╗▒c [HH1.1] trong cß╗Öt Y├¬u cß║ºu cß║ºn ─æß║ít
        groupTfByTopic: false, // Gom 4 ├╜ ─É├║ng/Sai tß╗½ c├íc b├ái kh├íc nhau trong c├╣ng chß╗º ─æß╗ü
      },

      // =====================================================================
      // Cß║ñU H├îNH Tß╗░ LUß║¼N CHI TIß║╛T (sß╗æ c├óu, sß╗æ ├╜ mß╗ùi c├óu, ─æiß╗âm mß╗ùi ├╜)
      // =====================================================================
      tuLuanConfig: {
        enabled: false, // true = d├╣ng cß║Ñu h├¼nh tß╗▒ do, false = autofill tß╗▒ t├¡nh
        questions: [
          { id: 'tl_q1', label: 'C├óu 1', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
          { id: 'tl_q2', label: 'C├óu 2', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 1.0 }] },
          { id: 'tl_q3', label: 'C├óu 3', kienThuc: '', subItems: [{ diem: 1.0 }] },
          { id: 'tl_q4', label: 'C├óu 4', kienThuc: '', subItems: [{ diem: 1.0 }] },
        ],
      },

      setTuLuanConfig: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state.tuLuanConfig) : { ...state.tuLuanConfig, ...updater };
        return { tuLuanConfig: next };
      }),

      // =====================================================================
      // Cß║ñU H├îNH ─ÉIß╗éM LINH HOß║áT CHO 3 PHß║ªN TNKQ
      // =====================================================================
      examConfig: {
        tongDiem: 10.0,                        // Tß╗òng ─æiß╗âm to├án b├ái
        tongDiemP1: 3.0, diemMoiCauP1: 0.25,  // Phß║ºn I: TN nhiß╗üu lß╗▒a chß╗ìn
        tongDiemP2: 2.0, diemMoiYP2: 0.25,    // Phß║ºn II: ─É├║ng/Sai (─æiß╗âm 1 ├╜)
        tongDiemP3: 2.0, diemMoiYP3: 0.25,    // Phß║ºn III: Trß║ú lß╗¥i ngß║»n (─æiß╗âm 1 ├╜)
        diemMoiYTuLuan: 0.5,                  // ─Éiß╗âm mß╗ùi ├╜ Tß╗▒ luß║¡n
        tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
      },

      updateExamConfig: (field, value) => set((state) => ({
        examConfig: { ...state.examConfig, [field]: value }
      })),

      toggleTuLuan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        if (val) {
          // Bß║¡t Tß╗▒ luß║¡n -> Cß║Ñu h├¼nh P2, P3 theo tongDiemP1 hiß╗çn tß║íi
          if (p1 === 3.5) {
            // Cß║Ñu tr├║c 3.5 - 2.0 - 1.5 (c├│ Tß╗▒ luß║¡n)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Mß║╖c ─æß╗ïnh: P1-2-2-TL
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 2.0;
          }
        } else {
          // Tß║»t Tß╗▒ luß║¡n ΓåÆ 100% Trß║»c nghiß╗çm, chia phß║ºn c├▓n lß║íi cho P2+P3
          if (p1 === 3 || p1 === 3.0) {
            // Cß║Ñu tr├║c 3 - 4 - 3
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 3.0;
          } else if (p1 === 3.5) {
            // Cß║Ñu tr├║c 3.5 - 4.0 - 2.5 (100% TN)
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 2.5;
          } else if (p1 === 4.5) {
            // Cß║Ñu tr├║c 4.5 - 4 - 1.5
            newExamConfig.tongDiemP2 = 4.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else if (p1 === 5.5) {
            // Cß║Ñu tr├║c 5.5 - 3 - 1.5
            newExamConfig.tongDiemP2 = 3.0;
            newExamConfig.tongDiemP3 = 1.5;
          } else {
            // Fallback: chia ─æß╗üu phß║ºn c├▓n lß║íi
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

      // Chuyß╗ân ─æß╗òi cß║Ñu tr├║c ─æß╗ü (khi thay ─æß╗òi dropdown P1)
      setCauTrucDe: (tongDiemP1) => set((state) => {
        const isCauTruc4213 = String(tongDiemP1) === '4.01';
        const p1 = isCauTruc4213 ? 4.0 : (Number(tongDiemP1) || 3.0);
        const newExamConfig = { ...state.examConfig, tongDiemP1: p1, isCauTruc4213 };
        const hasTLN = state.config.hasTraLoiNgan !== false;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === CHß║╛ ─Éß╗ÿ C├ô Tß╗░ LUß║¼N (TL = 3─æ) ===
          const tnTotal = 10.0 - 3.0; // TNKQ = 7─æ
          if (hasTLN) {
            // C├│ TLN: P1 + P2 + P3 = 7─æ
            if (isCauTruc4213) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              // Mß║╖c ─æß╗ïnh: P1=3, P2=2, P3=2
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else {
            // Kh├┤ng TLN: P1 + P2 = 7─æ, P3=0
            if (p1 === 4.0 || p1 === 4) {
              // Cß║Ñu tr├║c To├ín 4-2-0 (P1=4─æ, P2=2─æ, P3=0, TL=4─æ)
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
          // === CHß║╛ ─Éß╗ÿ 100% TRß║«C NGHIß╗åM (TN = 10─æ) ===
          if (hasTLN) {
            // C├│ TLN: P1 + P2 + P3 = 10─æ
            if (p1 === 3 || p1 === 3.0) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 3.0;
            } else if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 4.0;
              newExamConfig.tongDiemP3 = 2.5;
            } else if (p1 === 4.0 || p1 === 4) {
              // Cß║Ñu tr├║c To├ín 4-2-0 ΓåÆ Tß╗▒ luß║¡n 4─æ
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
            // Kh├┤ng TLN: P1 + P2 = 10─æ, P3=0
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

      // Toggle Trß║ú lß╗¥i ngß║»n - xß╗¡ l├╜ trong 1 lß║ºn set ─æß╗â tr├ính race condition
      toggleTraLoiNgan: (val) => set((state) => {
        const newExamConfig = { ...state.examConfig };
        const p1 = Number(newExamConfig.tongDiemP1) || 3.0;
        const hasTL = state.config.hasTuLuan;

        if (hasTL) {
          // === C├ô Tß╗░ LUß║¼N (TL = 3─æ, TNKQ = 7─æ) ===
          const tnTotal = 7.0;
          if (val) {
            // Bß║¡t TLN
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 1.5;
            } else {
              newExamConfig.tongDiemP2 = 2.0;
              newExamConfig.tongDiemP3 = 2.0;
            }
          } else if (p1 === 4.0 || p1 === 4) {
            // Cß║Ñu tr├║c To├ín 4-2-0 (TL giß╗» 4─æ)
            newExamConfig.tongDiemP2 = 2.0;
            newExamConfig.tongDiemP3 = 0;
          } else {
            // Tß║»t TLN: P3 ΓåÆ P2, TL giß╗» nguy├¬n 3─æ
            if (p1 === 3.5) {
              newExamConfig.tongDiemP2 = 3.5; // 2.0 + 1.5
              newExamConfig.tongDiemP3 = 0;
            } else {
              newExamConfig.tongDiemP2 = Math.round((tnTotal - p1) * 100) / 100;
              newExamConfig.tongDiemP3 = 0;
            }
          }
        } else {
          // === 100% TRß║«C NGHIß╗åM (TN = 10─æ) ===
          if (val) {
            // Bß║¡t TLN
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
            // Tß║»t TLN: P3 ΓåÆ P2
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
      // ACTIONS CHO ─É╞áN Vß╗è KIß║╛N THß╗¿C (─ÉVKT)
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

      // H├ánh ─æß╗Öng cß║¡p nhß║¡t YCC─É cho tß╗½ng ─ÉVKT
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

      // Cß║¡p nhß║¡t m├ú chß╗ë b├ío ─æ╞░ß╗úc chß╗ìn cho ─ÉVKT
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

        // Chia v─ân bß║ún th├ánh c├íc d├▓ng
        const lines = rawText.split('\n');
        let currentDvIndex = -1;
        let yccdBlocks = {};

        for (let line of lines) {
          // D├▓ t├¼m c├íc d├▓ng ti├¬u ─æß╗ü c├│ chß╗⌐a sß╗æ thß╗⌐ tß╗▒: "1.", "**1.**", "1)", "**1**"
          // Regex n├áy bß║»t chß╗» sß╗æ ─æß╗⌐ng ─æß║ºu (c├│ thß╗â bß╗ìc bß╗ƒi dß║Ñu in ─æß║¡m/gß║ích ch├ón)
          const match = line.match(/^\s*(?:\*\*|__)?(\d+)(?:\.|\))?(?:\*\*|__)?\s+/);

          if (match) {
            const num = parseInt(match[1], 10);
            currentDvIndex = num - 1; // Mß║úng bß║»t ─æß║ºu tß╗½ 0
            if (!yccdBlocks[currentDvIndex]) yccdBlocks[currentDvIndex] = [];
          } else {
            // Nß║┐u ─æang ß╗ƒ trong block cß╗ºa mß╗Öt B├ái hß╗ìc v├á d├▓ng kh├┤ng trß╗æng, th├¼ l╞░u d├▓ng ─æ├│ lß║íi
            if (currentDvIndex >= 0 && line.trim() !== '') {
              yccdBlocks[currentDvIndex].push(line.trim());
            }
          }
        }

        // ─Éß╗ò dß╗» liß╗çu YCC─É v├áo ─æ├║ng ─ÉVKT t╞░╞íng ß╗⌐ng
        const dvList = newMatrix[topicIndex].donViKienThuc || [];
        dvList.forEach((dv, index) => {
          if (yccdBlocks[index] && yccdBlocks[index].length > 0) {
            dv.yeuCauCanDat = yccdBlocks[index].join('\n');
          }
        });

        return { matrix: newMatrix };
      }),

      // ─Éß║áI PHß║¬U: Cß║¡p nhß║¡t sß╗æ c├óu hß╗Åi ß╗ƒ Cß║ñP ─ÉVKT
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

      // ─Éß║áI PHß║¬U: Cß║¡p nhß║¡t ─æiß╗âm tß╗▒ luß║¡n ß╗ƒ Cß║ñP ─ÉVKT
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

      // --- ACTIONS CHO Tß╗░ LUß║¼N SUB-ITEMS (linh hoß║ít ─æiß╗âm theo ├╜) ---
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
            dv.indicatorMap = {}; // Reset mapping c┼⌐
          });
        });

        const tongSoTietToanBai = topics.reduce((sum, t) =>
          sum + t.donViKienThuc.reduce((s, dv) => s + (Number(dv.soTiet) || 0), 0), 0);

        if (tongSoTietToanBai === 0) {
          alert("Vui l├▓ng nhß║¡p 'Sß╗æ tiß║┐t' lß╗¢n h╞ín 0!");
          return {};
        }

        const ec = state.examConfig;
        const dP1 = Number(ec.diemMoiCauP1) || 0.25;
        const dP2 = Number(ec.diemMoiYP2) || 0.25;
        const dP3 = Number(ec.diemMoiYP3) || 0.25;
        const dTL = Number(ec.diemMoiYTuLuan) || 0.5;

        let pool = [];
        let tuLuanPool = []; // Pool ri├¬ng cho tß╗▒ luß║¡n ─æß╗â ╞░u ti├¬n ph├ón bß╗ò
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

        // === C├éN ─Éß╗ÉI Tß╗öNG THß╗é THEO Tß╗ê Lß╗å 40-30-30 ===
        const tiLe = state.examConfig.tiLeNhanThuc || { biet: 40, hieu: 30, vanDung: 30 };
        const tongDiemDe = 10.0;
        const tongDiemBiet = Math.round(tongDiemDe * tiLe.biet / 100 * 100) / 100;
        const tongDiemHieu = Math.round(tongDiemDe * tiLe.hieu / 100 * 100) / 100;
        const tongDiemVanDung = Math.round((tongDiemDe - tongDiemBiet - tongDiemHieu) * 100) / 100;

        console.log(`≡ƒÄ» Tß╗ë lß╗ç tß╗òng thß╗â: ${tiLe.biet}% Biß║┐t (${tongDiemBiet}─æ), ${tiLe.hieu}% Hiß╗âu (${tongDiemHieu}─æ), ${tiLe.vanDung}% Vß║¡n dß╗Ñng (${tongDiemVanDung}─æ)`);

        // === B╞»ß╗ÜC 1: CHIA Tß╗¬ LUß║¼N TR╞»ß╗ÜC THEO Tß╗ê Lß╗å Tß╗öNG THß╗é ===
        let tlBiet = 0, tlHieu = 0, tlVanDung = 0;
        if (tTL > 0) {
          tlBiet = Math.round((tTL * tiLe.biet / 100) * 100) / 100;
          tlHieu = Math.round((tTL * tiLe.hieu / 100) * 100) / 100;
          tlVanDung = Math.round((tTL - tlBiet - tlHieu) * 100) / 100;
          console.log(`≡ƒôÿ Tß╗▒ luß║¡n: ${tlBiet}─æ Biß║┐t, ${tlHieu}─æ Hiß╗âu, ${tlVanDung}─æ Vß║¡n dß╗Ñng`);
        }

        // === B╞»ß╗ÜC 2: PH├éN Bß╗ö Tß╗¬ LUß║¼N V├ÇO POOL ===
        if (tTL > 0) {
          const tlCfg = state.tuLuanConfig;
          const hasManualConfig = tlCfg?.enabled && tlCfg?.questions && tlCfg.questions.length > 0 && tlCfg.questions.some(q => q.subItems && q.subItems.length > 0);

          if (hasManualConfig) {
            console.log('≡ƒöº Autofill: Tß╗▒ luß║¡n - chß║┐ ─æß╗Ö cß║Ñu h├¼nh thß╗º c├┤ng');
            // Thu thß║¡p tß║Ñt cß║ú subItems tß╗½ config
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
              // Ph├ón bß╗ò sß╗æ l╞░ß╗úng ├╜ theo tß╗ë lß╗ç 40-30-30
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
            console.log('≡ƒñû Autofill: Tß╗▒ luß║¡n - chß║┐ ─æß╗Ö tß╗▒ ─æß╗Öng');
            // X├íc ─æß╗ïnh sß╗æ ├╜ sao cho soY ├ù dTL = tTL (╞░u ti├¬n ─æ├║ng tß╗òng ─æiß╗âm)
            const soYTuLuan = Math.max(3, Math.min(10, Math.round(tTL / dTL)));
            // ─Éiß╗âm thß╗▒c mß╗ùi ├╜ = tTL / soY (c├│ thß╗â kh├┤ng tr├▓n 0.25)
            const diemMoiY = Math.round((tTL / soYTuLuan) * 100) / 100;
            // Ph├ón bß╗ò ├╜ theo tß╗ë lß╗ç 40-30-30 (bß║▒ng sß╗æ l╞░ß╗úng)
            const arrTL = distributeLargestRemainder(soYTuLuan, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
            const levels = ['biet', 'hieu', 'vanDung'];
            let totalAdded = 0;
            let yIdx = 0;
            for (let li = 0; li < 3; li++) {
              for (let i = 0; i < arrTL[li]; i++) {
                yIdx++;
                // ├¥ cuß╗æi c├╣ng (tß╗òng thß╗â): b├╣ sai sß╗æ ─æß╗â tß╗òng = tTL ch├¡nh x├íc
                const pts = (yIdx === soYTuLuan)
                  ? Math.round((tTL - totalAdded) * 100) / 100
                  : diemMoiY;
                addTuLuanPool(levels[li], Math.max(0.25, pts));
                totalAdded += pts;
              }
            }
          }
        }

        // === B╞»ß╗ÜC 3: T├ìNH Sß╗É C├éU ─É├ÜNG/SAI TRß╗░C TIß║╛P ===
        // Mß╗ùi c├óu ─ÉS = 4 ├╜ (1B + 1H + 1VD + 1VDC), cß╗æ ─æß╗ïnh theo quy ─æß╗ïnh Bß╗Ö GD-─ÉT
        // T├¡nh trß╗▒c tiß║┐p tß╗½ tß╗òng ─æiß╗âm P2, kh├┤ng qua pool (tr├ính mß║Ñt ├╜ do rounding)
        const numTfBlocks = Math.round(tP2 / (dP2 * 4));

        // ─Éiß╗âm ─ÉS THß╗░C Tß║╛ per level (VDC gß╗Öp v├áo VD khi t├¡nh tß╗ë lß╗ç nhß║¡n thß╗⌐c)
        const dsActualBiet = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualHieu = Math.round(numTfBlocks * dP2 * 100) / 100;
        const dsActualVD   = Math.round(numTfBlocks * dP2 * 2 * 100) / 100; // VD + VDC

        console.log(`≡ƒôù ─É├║ng/Sai: ${numTfBlocks} c├óu ├ù 4 ├╜ = ${numTfBlocks * 4} ├╜ = ${dsActualBiet + dsActualHieu + dsActualVD}─æ (B=${dsActualBiet}─æ, H=${dsActualHieu}─æ, VD=${dsActualVD}─æ)`);

        // === T├ìNH ─ÉIß╗éM Tß╗░ LUß║¼N THß╗░C Tß║╛ Tß╗¬ POOL (kh├┤ng d├╣ng gi├í trß╗ï l├╜ thuyß║┐t) ===
        const tlActualBiet = Math.round(tuLuanPool.filter(p => p.lvl === 'biet').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualHieu = Math.round(tuLuanPool.filter(p => p.lvl === 'hieu').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        const tlActualVanDung = Math.round(tuLuanPool.filter(p => p.lvl === 'vanDung').reduce((s, p) => s + p.pts, 0) * 100) / 100;
        console.log(`≡ƒôÿ TL thß╗▒c tß║┐: ${tlActualBiet}─æ Biß║┐t, ${tlActualHieu}─æ Hiß╗âu, ${tlActualVanDung}─æ VD (tß╗òng=${Math.round((tlActualBiet+tlActualHieu+tlActualVanDung)*100)/100}─æ)`);

        // === B╞»ß╗ÜC 4: T├ìNH TARGET C├ÆN Lß║áI CHO P1+P3 (dß╗▒a tr├¬n ─ÉS + TL THß╗░C Tß║╛) ===
        const conLaiBiet = Math.max(0, Math.round((tongDiemBiet - tlActualBiet - dsActualBiet) * 100) / 100);
        const conLaiHieu = Math.max(0, Math.round((tongDiemHieu - tlActualHieu - dsActualHieu) * 100) / 100);
        const conLaiVanDung = Math.max(0, Math.round((tongDiemVanDung - tlActualVanDung - dsActualVD) * 100) / 100);

        console.log(`≡ƒôè Target c├▓n lß║íi P1+P3: ${conLaiBiet}─æ Biß║┐t, ${conLaiHieu}─æ Hiß╗âu, ${conLaiVanDung}─æ Vß║¡n dß╗Ñng`);

        // === B╞»ß╗ÜC 5: PH├éN Bß╗ö P1 V├Ç P3 ─Éß╗é B├Ö ─Éß║áT 40-30-30 ===
        const tongConLai = conLaiBiet + conLaiHieu + conLaiVanDung;
        if (tongConLai > 0) {
          const soCauP1 = tP1 > 0 ? Math.round(tP1 / dP1) : 0;
          const soCauP3 = tP3 > 0 ? Math.round(tP3 / dP3) : 0;

          let arrP3 = [0, 0, 0];
          let arrP1 = [0, 0, 0];

          // ╞»u ti├¬n ph├ón bß╗ò P3 tr╞░ß╗¢c v├¼ ─æiß╗âm mß╗ùi c├óu P3 th╞░ß╗¥ng lß╗¢n h╞ín (vd 0.5─æ), kh├│ kh├¡t ─æiß╗âm h╞ín P1
          if (soCauP3 > 0) {
            arrP3 = distributeLargestRemainder(soCauP3, [conLaiBiet, conLaiHieu, conLaiVanDung]);
            addPool('traLoiNgan', 'biet', arrP3[0], dP3);
            addPool('traLoiNgan', 'hieu', arrP3[1], dP3);
            addPool('traLoiNgan', 'vanDung', arrP3[2], dP3);
          }

          // T├¡nh lß║íi target ─æiß╗âm C├ÆN Lß║áI THß╗░C Tß║╛ cho P1 sau khi P3 ─æ├ú chiß║┐m
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

        // Pool giß╗¥ chß╗ë chß╗⌐a NLC + TLN (─ÉS t├¡nh trß╗▒c tiß║┐p, kh├┤ng qua pool)
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

        // numTfBlocks ─æ├ú t├¡nh ß╗ƒ b╞░ß╗¢c 3
        if (state.config.groupTfByTopic) {
          // CHß║╛ ─Éß╗ÿ GOM THEO CHß╗ª ─Éß╗Ç: Ph├ón bß╗ò 4 ├╜ ─É├║ng/Sai ra c├íc B├ái kh├íc nhau trong c├╣ng Chß╗º ─æß╗ü
          for (let i = 0; i < numTfBlocks; i++) {
            // T├¼m chß╗º ─æß╗ü ─æang "─æ├│i" ─æiß╗âm nhß║Ñt
            let bestTopicIdx = -1, maxTopicGap = -Infinity;
            topics.forEach((topic, ti) => {
              const topicTarget = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.target, 0);
              const topicCurrent = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.current, 0);
              const gap = topicTarget - topicCurrent;
              if (gap > maxTopicGap) { maxTopicGap = gap; bestTopicIdx = ti; }
            });

            if (bestTopicIdx !== -1) {
              const topicDvs = flatDvList.filter(f => f.ti === bestTopicIdx);
              // Ph├ón bß╗ò 4 ├╜ (B, H, VD, VDC) cho c├íc b├ái trong chß╗º ─æß╗ü n├áy (theo gap lß╗¢n nhß║Ñt)
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
          // CHß║╛ ─Éß╗ÿ Mß║╢C ─Éß╗èNH: Dß╗ôn cß║ú 4 ├╜ v├áo 1 B├ái
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

        // === ╞»U TI├èN PH├éN Bß╗ö Tß╗░ LUß║¼N TR╞»ß╗ÜC ===
        console.log('≡ƒÄ» Autofill: Ph├ón bß╗ò tß╗▒ luß║¡n tr╞░ß╗¢c (╞░u ti├¬n)');
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
          // Lu├┤n tß║ío subItem vß╗¢i ─æiß╗âm ch├¡nh x├íc tß╗½ pool
          if (!Array.isArray(dv.tuLuan.subItems)) dv.tuLuan.subItems = [];
          dv.tuLuan.subItems.push({
            id: crypto.randomUUID(),
            y: '',
            diem: Math.round(item.pts * 100) / 100,
            level: item.lvl
          });
          // Sync old fields tß╗½ subItems (─æß╗â backward compat)
          dv.tuLuan.biet = dv.tuLuan.subItems.filter(s => s.level === 'biet').length;
          dv.tuLuan.hieu = dv.tuLuan.subItems.filter(s => s.level === 'hieu').length;
          dv.tuLuan.vanDung = dv.tuLuan.subItems.filter(s => s.level === 'vanDung').length;
          dv.tuLuan.diemBiet = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemHieu = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          dv.tuLuan.diemVanDung = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
          flatDvList[bestIdx].current += item.pts;
        });

        // === SAU ─É├ô Mß╗ÜI PH├éN Bß╗ö C├üC LOß║áI C├éU KH├üC ===
        console.log('≡ƒô¥ Autofill: Ph├ón bß╗ò c├íc loß║íi c├óu kh├íc');
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
          // Chß╗ë xß╗¡ l├╜ c├íc loß║íi c├óu kh├┤ng phß║úi tß╗▒ luß║¡n (─æ├ú xß╗¡ l├╜ ri├¬ng ß╗ƒ tr├¬n)
          dv[item.type][item.lvl]++;
          flatDvList[bestIdx].current += item.pts;
        });

        // === G├üN M├â N─éNG Lß╗░C CHß╗ê B├üO V├Ç Sß╗É THß╗¿ Tß╗░ C├éU Hß╗ÄI Tß╗░ ─Éß╗ÿNG ===
        console.log('≡ƒöù Autofill: G├ín m├ú n─âng lß╗▒c v├á nh├ún c├óu hß╗Åi');
        
        const isContinuous = state.config.isContinuousNumbering;
        const numP1 = Math.round(tP1 / dP1);
        const numP2 = Math.round(tP2 / (dP2 * 4));
        const numP3 = Math.round(tP3 / dP3);

        let p1GlobalCounter = 1;
        let p2GlobalCounter = isContinuous ? (p1GlobalCounter + numP1) : 1;
        let p3GlobalCounter = isContinuous ? (p2GlobalCounter + numP2) : 1;
        let tlGlobalCounter = isContinuous ? (p3GlobalCounter + numP3) : 1;

        // Biß║┐n ─æß║┐m sß╗æ ├╜ cho phß║ºn ─É├║ng/Sai (─æß╗â t├¡nh sß╗æ c├óu)
        let p2ItemCounter = 0;

        // Tiß╗ün tß╗æ (Prefix)
        const p1Pre = isContinuous ? 'C' : 'TN';
        const p2Pre = isContinuous ? 'C' : '─ÉS';
        const p3Pre = isContinuous ? 'C' : 'TLN';
        const tlPre = isContinuous ? 'C' : 'TL';

        const globalIndIdx = {
          biet: 0,
          hieu: 0,
          vanDung: 0,
          vanDungCao: 0
        };

        // Ta qu├⌐t theo tß╗½ng loß║íi c├óu hß╗Åi ─æß╗â ─æß║úm bß║úo sß╗æ thß╗⌐ tß╗▒ chß║íy li├¬n tß╗Ñc trong to├án ─æß╗ü
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
                // T├¡nh to├ín sß╗æ l╞░ß╗úng c├óu thß╗▒c tß║┐ ─æß╗â g├ín nh├ún
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
                  
                  // G├ín nh├ún c├óu hß╗Åi
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

                  // G├ín m├ú n─âng lß╗▒c
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

      // =========================================================
      // [NEW - CT TOAN 2018] Apply YCCD from CT2018 standard
      // lop: number 6-12, passed explicitly from UI dialog
      // Completely independent - does NOT touch any existing logic
      // =========================================================
      applyCtToan2018: (lop) => set((state) => {
        const result = applyCtToan2018Helper(state, lop);
        if (result.error || !result.matrix) return {};
        return { matrix: result.matrix };
      }),

      smartImportData: (rawText) => set((state) => {
        try {
          let newMatrix = [...state.matrix];
          if (newMatrix.length === 1 && !newMatrix[0].tenChuDe && newMatrix[0].donViKienThuc.length === 1 && !newMatrix[0].donViKienThuc[0].noiDung) {
            newMatrix = [];
          }

          const text = rawText.trim();
          
          // --- Cß║óI TIß║╛N 1: T├îM JSON TRONG V─éN Bß║óN ---
          let jsonData = null;
          const jsonMatch = text.match(/\[\s*\{.*\}\s*\]|\{\s*".*"\s*:\s*.*\}/s);
          if (jsonMatch) {
            try {
              jsonData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.warn("T├¼m thß║Ñy block giß╗æng JSON nh╞░ng parse lß╗ùi:", e);
            }
          }

          if (jsonData) {
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            dataArray.forEach(topicData => {
              newMatrix.push({
                id: crypto.randomUUID(),
                tenChuDe: topicData.tenChuDe || topicData.topic || "Chß╗º ─æß╗ü mß╗¢i",
                isNuaDauKi: false,
                yeuCauCanDat: '',
                donViKienThuc: (topicData.donViKienThucs || topicData.donViKienThuc || []).map(dv => ({
                  id: crypto.randomUUID(),
                  noiDung: dv.tenDonVi || dv.noiDung || dv.content || "B├ái mß╗¢i",
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

          // --- Cß║óI TIß║╛N 2: Xß╗¼ L├¥ Dß╗« LIß╗åU Bß║óNG (EXCEL/WORD/TEXT) ---
          const rows = text.split('\n').map(r => r.trim()).filter(r => r);
          let currentTopicIndex = newMatrix.length > 0 ? newMatrix.length - 1 : -1;

          rows.forEach((row) => {
            const columns = row.split(/\t|\||;/).map(c => c.trim());
            let tenChuDe = "", tenDonVi = "", soTiet = 1, yccd = "";

            if (columns.length === 1) {
              // CHß╗ê C├ô 1 Cß╗ÿT: Kiß╗âm tra gß║»t gao h╞ín ─æß╗â tr├ính nhß║¡n nhß║ºm B├ái hß╗ìc l├á Chß╗º ─æß╗ü
              const isTopic = /^(ch╞░╞íng|chuong|chß╗º ─æß╗ü|chu de|phß║ºn|phan)\s+(\d+|[IVX]+)/i.test(columns[0]);
              if (isTopic) {
                tenChuDe = columns[0];
              } else {
                tenDonVi = columns[0];
                if (currentTopicIndex === -1) tenChuDe = "Ch╞░╞íng/Chß╗º ─æß╗ü 1";
              }
            } else if (columns.length === 2) {
              tenDonVi = columns[0];
              soTiet = columns[1];
              if (currentTopicIndex === -1) tenChuDe = "Ch╞░╞íng/Chß╗º ─æß╗ü 1";
            } else if (columns.length === 3) {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2];
            } else {
              tenChuDe = columns[0]; tenDonVi = columns[1]; soTiet = columns[2]; yccd = columns[3];
            }

            if (tenChuDe) {
              // Nß║┐u ─æang c├│ chß╗º ─æß╗ü mß║╖c ─æß╗ïnh trß╗æng, th├¼ d├╣ng lu├┤n n├│ thay v├¼ push mß╗¢i
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
          alert("Lß╗ùi ph├ón t├¡ch dß╗» liß╗çu!");
          return state;
        }
      }),

      // H├ám mß╗¢i: Chß╗ë nhß║¡p ─ÉVKT v├áo mß╗Öt Chß╗º ─æß╗ü nhß║Ñt ─æß╗ïnh
      importDonVisToTopic: (topicId, rawText) => set((state) => {
        const text = rawText.trim();
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        
        return {
          matrix: state.matrix.map(topic => {
            if (topic.id !== topicId) return topic;
            
            const newDvs = [...topic.donViKienThuc];
            // Nß║┐u ─ÉVKT duy nhß║Ñt ─æang trß╗æng, x├│a n├│ ─æi ─æß╗â thay bß║▒ng list mß╗¢i
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

      // GIß╗« Lß║áI cho backward compatibility ΓÇö nh╞░ng KH├öNG D├ÖNG trong UI mß╗¢i
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
        // Migration v2 ΓåÆ v3: model API
        if (version < 3) {
          const deprecatedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
          if (!persistedState.selectedModel || deprecatedModels.includes(persistedState.selectedModel)) {
            persistedState.selectedModel = 'gemini-2.0-flash';
          }
        }

        // Migration v3 ΓåÆ v4: noiDung + soTiet ΓåÆ donViKienThuc[]
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

        // Migration v4 ΓåÆ v5: Chuyß╗ân question counts tß╗½ topic ΓåÆ ─ÉVKT[0]
        if (version < 5) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix = persistedState.matrix.map(topic => {
              const dvList = topic.donViKienThuc || [];
              if (dvList.length > 0) {
                // Copy topic-level counts v├áo ─ÉVKT ─æß║ºu ti├¬n (nß║┐u ─ÉVKT ch╞░a c├│)
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
                // Nß║┐u ─ÉVKT c├│ phanBo (tß╗½ autoFill c┼⌐), chuyß╗ân phanBo ΓåÆ fields ch├¡nh
                dvList.forEach(dv => {
                  if (dv.phanBo) {
                    if (!dv.nhieuLuaChon) dv.nhieuLuaChon = { ...(dv.phanBo.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.dungSai) dv.dungSai = { ...(dv.phanBo.dungSai || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.traLoiNgan) dv.traLoiNgan = { ...(dv.phanBo.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 }) };
                    if (!dv.tuLuan) dv.tuLuan = { ...(dv.phanBo.tuLuan || { biet: 0, hieu: 0, vanDung: 0 }), diemBiet: 0, diemHieu: 0, diemVanDung: 0 };
                    delete dv.phanBo;
                  }
                  // ─Éß║úm bß║úo mß╗ìi ─ÉVKT ─æß╗üu c├│ fields mß║╖c ─æß╗ïnh
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

        // Migration v5 ΓåÆ v6: Th├¬m examConfig mß║╖c ─æß╗ïnh nß║┐u ch╞░a c├│
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

        // Migration v6 ΓåÆ v7: Bß╗ò sung tongDiem, diemMoiYTuLuan nß║┐u thiß║┐u
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

        // Migration v8 ΓåÆ v9: Th├¬m tuLuanConfig cho cß║Ñu h├¼nh tß╗▒ luß║¡n chi tiß║┐t
        if (version < 9) {
          if (!persistedState.tuLuanConfig) {
            persistedState.tuLuanConfig = {
              enabled: false,
              questions: [
                { id: 'tl_q1', label: 'C├óu 1', subItems: [
                  { diem: 0.5 },
                  { diem: 0.5 },
                ]},
                { id: 'tl_q2', label: 'C├óu 2', subItems: [
                  { diem: 0.5 },
                  { diem: 1.0 },
                ]},
                { id: 'tl_q3', label: 'C├óu 3', subItems: [
                  { diem: 1.0 },
                ]},
                { id: 'tl_q4', label: 'C├óu 4', subItems: [
                  { diem: 1.0 },
                ]},
              ],
            };
          }
        }

        // Migration v9 ΓåÆ v10: Bß╗Å tr╞░ß╗¥ng yccd khß╗Åi tuLuanConfig subItems (YCC─É chuyß╗ân sang ─æß║╖c tß║ú)
        if (version < 10) {
          if (persistedState.tuLuanConfig && persistedState.tuLuanConfig.questions) {
            persistedState.tuLuanConfig.questions.forEach(q => {
              if (q.subItems) {
                q.subItems = q.subItems.map(sub => {
                  const { yccd, ...rest } = sub;
                  // Bß╗Å level nß║┐u tß╗ôn tß║íi (level sß║╜ ─æ╞░ß╗úc auto-g├ín khi auto-fill)
                  const { level: _level, ...rest2 } = rest;
                  return rest2;
                });
              }
            });
          }
        }

        // Migration v7 ΓåÆ v8: Th├¬m subItems[] cho tß╗▒ luß║¡n linh hoß║ít (giß╗» backward compat)
        if (version < 8) {
          if (persistedState.matrix && Array.isArray(persistedState.matrix)) {
            persistedState.matrix.forEach(topic => {
              (topic.donViKienThuc || []).forEach(dv => {
                if (dv.tuLuan) {
                  if (!Array.isArray(dv.tuLuan.subItems)) {
                    // Nß║┐u c├│ ─æiß╗âm c┼⌐, chuyß╗ân th├ánh subItems mß║╖c ─æß╗ïnh
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
            // Bß╗ò sung cß║Ñu tr├║c To├ín 4-2-4 nß║┐u m├┤n l├á To├ín
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

        // Migration v10 ΓåÆ v11: Force-fix tiLeNhanThuc = 40-30-30 (fix bug migration v8 set sai cho To├ín)
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

// Export helpers cho c├íc component sß╗¡ dß╗Ñng
export { getTopicSum, getTopicTuLuanDiem, getTotalSoTiet, isNewMathStructure };
