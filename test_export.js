import { exportToWord } from './src/utils/exportWord.js';
import useExamStore from './src/store/useExamStore.js';

// Setup basic window mock
global.window = {
  URL: {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
  }
};
global.document = {
  createElement: () => ({ click: () => {} })
};

// Mock zustand store
const mockState = {
  matrix: [],
  config: { exportTemplate: 'ministry', hasTuLuan: false, hasTraLoiNgan: true, isContinuousNumbering: true },
  examConfig: { diemMoiCauP1: 0.25, diemMoiYP2: 0.25, diemMoiYP3: 0.5 },
  examHeader: { soGD: 'Sở GD', truong: 'Trường A', kyThi: 'Kỳ thi', monHoc: 'Môn Toán', thoiGian: '45 phút', namHoc: '2023-2024' },
  generatedExam: '',
  examSlots: {
    phan1_cau1: { noiDung: 'Câu 1', dapAnA: 'A', dapAnB: 'B', dapAnC: 'C', dapAnD: 'D' },
    phan2_cau1: { noiDung: 'Câu 1', yA: 'yA', yB: 'yB', yC: 'yC', yD: 'yD' },
    phan3_cau1: { noiDung: 'Câu 1' }
  }
};

useExamStore.getState = () => mockState;

async function run() {
  try {
    const doc = await exportToWord();
    console.log("exportToWord success!");
  } catch (e) {
    console.error("exportToWord failed:", e);
  }
}
run();
