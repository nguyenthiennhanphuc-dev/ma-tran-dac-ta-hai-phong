// Test script for prompt_generator.js
import { generateSimilarQuestionPrompt, generateFullEquivalentExamPrompt } from './src/utils/prompt_generator.js';

// Test data for loai 1 (multiple choice)
const slotData1 = {
  loaiCauHoi: 1,
  noiDung: 'Tính giá trị của 2 + 2',
  dapAnA: '3',
  dapAnB: '4',
  dapAnC: '5',
  dapAnD: '6',
  dapAnDung: 'B',
  giaiThich: 'Vì 2 + 2 = 4'
};

const metaInfo1 = {
  topic: 'Toán học',
  dvkt: 'Phép cộng',
  level: 'Nhận biết',
  loaiCauHoi: 1,
  diem: 1
};

// Test data for loai 2 (true/false)
const slotData2 = {
  loaiCauHoi: 2,
  noiDung: 'Xét các mệnh đề sau về số học',
  yA: '2 + 2 = 4',
  yB: '3 + 3 = 5',
  yC: '4 + 4 = 8',
  yD: '5 + 5 = 10',
  dapAnDung: 'a-Đ, b-S, c-Đ, d-Đ',
  giaiThich: 'Mệnh đề b sai'
};

const metaInfo2 = {
  topic: 'Toán học',
  dvkt: 'Phép cộng',
  level: 'Nhận biết',
  loaiCauHoi: 2,
  diem: 1
};

console.log('=== Testing generateSimilarQuestionPrompt ===');

// Test loai 1
console.log('\n--- Loai 1 (Multiple Choice) ---');
const prompt1 = generateSimilarQuestionPrompt(slotData1, metaInfo1);
console.log(prompt1);

// Test loai 2
console.log('\n--- Loai 2 (True/False) ---');
const prompt2 = generateSimilarQuestionPrompt(slotData2, metaInfo2);
console.log(prompt2);

// Test generateFullEquivalentExamPrompt
console.log('\n=== Testing generateFullEquivalentExamPrompt ===');
const examSlotsList = [
  { key: 'phan1cau1', data: slotData1 },
  { key: 'phan2cau1', data: slotData2 }
];
const lockedSlots = [];
const fullPrompt = generateFullEquivalentExamPrompt(examSlotsList, lockedSlots);
console.log(fullPrompt);