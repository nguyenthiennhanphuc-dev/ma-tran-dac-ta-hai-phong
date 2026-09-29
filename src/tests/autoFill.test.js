/**
 * autoFill.test.js — Kiểm thử regression các cấu trúc LOCKED
 * Chạy: npx vite-node src/tests/autoFill.test.js
 *
 * Test 3 cấu trúc quan trọng:
 *   1. KHTN 4-2-1-3 (Định kì Hải Phòng)
 *   2. KHTN Vào 10 (Thi tuyển sinh)
 *   3. Toán Khánh Hòa 3-2-2-3
 */

// ──────────────────────────────────────────────────────────
// HELPER: Tạo ma trận mẫu có N đơn vị kiến thức (N tiết)
// ──────────────────────────────────────────────────────────
function makeDv(noiDung, soTiet, isNuaDauKi = false) {
  return {
    noiDung,
    soTiet,
    isNuaDauKi,
    nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
    indicatorMap: {},
    nangLucSo: [],
  };
}

// Ma trận mẫu KHTN: 3 chủ đề, mỗi chủ đề 1 phân môn, đủ tiết để phân bổ TL
function makeKHTNMatrix() {
  return [
    { tenChuDe: 'Vật lí', donViKienThuc: [makeDv('VL DVKT 1', 8), makeDv('VL DVKT 2', 8)] },
    { tenChuDe: 'Hóa học', donViKienThuc: [makeDv('HH DVKT 1', 8), makeDv('HH DVKT 2', 8)] },
    { tenChuDe: 'Sinh học', donViKienThuc: [makeDv('SH DVKT 1', 8), makeDv('SH DVKT 2', 8)] },
  ];
}

// Ma trận mẫu Toán: 4 chủ đề, mỗi chủ đề 2 DVKT
function makeToánMatrix() {
  return [
    { tenChuDe: 'Số học', donViKienThuc: [makeDv('SH 1', 4), makeDv('SH 2', 4)] },
    { tenChuDe: 'Đại số', donViKienThuc: [makeDv('DS 1', 4), makeDv('DS 2', 4)] },
    { tenChuDe: 'Hình học', donViKienThuc: [makeDv('HH 1', 4), makeDv('HH 2', 4)] },
    { tenChuDe: 'Thống kê', donViKienThuc: [makeDv('TK 1', 4), makeDv('TK 2', 4)] },
  ];
}

// ──────────────────────────────────────────────────────────
// IMPORT STORE & CHẠY TEST
// ──────────────────────────────────────────────────────────
import { useExamStore } from '../store/useExamStore.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

function assertEq(actual, expected, msg) {
  if (actual === expected) {
    console.log(`  ✅ ${msg} (= ${expected})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────
// TEST 1: KHTN 4-2-1-3 (Định kì)
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 1: KHTN 4-2-1-3 Định Kì Hải Phòng');

useExamStore.setState({
  matrix: makeKHTNMatrix(),
  examHeader: { monHoc: 'Khoa học tự nhiên', kyThi: 'Giữa kì' },
  examConfig: { isCauTruc4213: true, isCauTrucKHTNVao10: false, isCauTrucToan3223: false },
  config: { hasTuLuan: true, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const s1 = useExamStore.getState();
const m1 = s1.matrix;

// Đếm số câu mỗi phần
let p1Total = 0, p2Total = 0, p2YTotal = 0, p3Total = 0, p4Total = 0;
m1.forEach(t => t.donViKienThuc.forEach(dv => {
  p1Total += (dv.nhieuLuaChon?.biet||0) + (dv.nhieuLuaChon?.hieu||0) + (dv.nhieuLuaChon?.vanDung||0);
  p2Total += dv.dungSai?.biet||0; // Số câu Đ/S (đếm theo biet = số câu)
  p2YTotal += (dv.dungSai?.biet||0) + (dv.dungSai?.hieu||0) + (dv.dungSai?.vanDung||0);
  p3Total += (dv.traLoiNgan?.biet||0) + (dv.traLoiNgan?.hieu||0) + (dv.traLoiNgan?.vanDung||0);
  p4Total += (dv.tuLuan?.biet||0) + (dv.tuLuan?.hieu||0) + (dv.tuLuan?.vanDung||0);
}));

assertEq(p1Total, 16, 'P.I = 16 câu TN');
// P.II: 2 câu × (2 ý NB + 1H + 1VD) = tổng ý NB trong dungSai.biet = 4 (2câu×2ýNB)
assertEq(p2Total, 4,  'P.II = 4 ý nhận biết (2 câu × 2 ý NB, đúng theo CV 4956)');
assertEq(p3Total, 4,  'P.III = 4 câu TLN');
// P.IV: phân bổ theo soTiet — với 6 DVKT đều nhau, ít nhất 2 câu (tối đa 3)
assert(p4Total >= 2 && p4Total <= 3, `P.IV = ${p4Total} câu TL (kỳ vọng 2-3)`);

// ──────────────────────────────────────────────────────────
// TEST 2: KHTN Vào 10
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 2: KHTN Vào 10 (QĐ 1038 Hải Phòng)');

useExamStore.setState({
  matrix: makeKHTNMatrix(),
  examHeader: { monHoc: 'Khoa học tự nhiên', kyThi: 'Thi vào 10' },
  examConfig: { isCauTruc4213: false, isCauTrucKHTNVao10: true, isCauTrucToan3223: false, tongDiemP1: 5.5, tongDiemP2: 3.0 },
  config: { hasTuLuan: false, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const s2 = useExamStore.getState();
const m2 = s2.matrix;

let p1_2 = 0, p2_2Y = 0, p3_2 = 0, p4_2 = 0;
m2.forEach(t => t.donViKienThuc.forEach(dv => {
  p1_2 += (dv.nhieuLuaChon?.biet||0) + (dv.nhieuLuaChon?.hieu||0) + (dv.nhieuLuaChon?.vanDung||0);
  p2_2Y += (dv.dungSai?.biet||0) + (dv.dungSai?.hieu||0) + (dv.dungSai?.vanDung||0);
  p3_2 += (dv.traLoiNgan?.biet||0) + (dv.traLoiNgan?.hieu||0) + (dv.traLoiNgan?.vanDung||0);
  p4_2 += (dv.tuLuan?.biet||0) + (dv.tuLuan?.hieu||0) + (dv.tuLuan?.vanDung||0);
}));

assertEq(p1_2, 22, 'P.I = 22 câu TN (16B+6H)');
assertEq(p2_2Y, 12, 'P.II = 12 ý Đ/S (3 câu × 4 ý)');
assertEq(p3_2, 6,  'P.III = 6 câu TLN');
assertEq(p4_2, 0,  'P.IV = 0 (100% trắc nghiệm)');

// ──────────────────────────────────────────────────────────
// TEST 3: Toán Khánh Hòa 3-2-2-3
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 3: Toán Khánh Hòa (3-2-2-3 GDPT 2018)');

useExamStore.setState({
  matrix: makeToánMatrix(),
  examHeader: { monHoc: 'Toán', kyThi: 'Cuối kì' },
  examConfig: { isCauTruc4213: false, isCauTrucKHTNVao10: false, isCauTrucToan3223: true },
  config: { hasTuLuan: true, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const s3 = useExamStore.getState();
const m3 = s3.matrix;

let p1_3 = 0, p2_3Y = 0, p3_3 = 0, p4_3 = 0;
let p3_3Hieu = 0, p3_3VD = 0;
let p2_3Biet = 0, p2_3Hieu = 0, p2_3VD = 0;
let p4_3Hieu = 0, p4_3VD = 0;

m3.forEach(t => t.donViKienThuc.forEach(dv => {
  p1_3 += (dv.nhieuLuaChon?.biet||0) + (dv.nhieuLuaChon?.hieu||0) + (dv.nhieuLuaChon?.vanDung||0);
  p2_3Y += (dv.dungSai?.biet||0) + (dv.dungSai?.hieu||0) + (dv.dungSai?.vanDung||0);
  p2_3Biet += (dv.dungSai?.biet||0);
  p2_3Hieu += (dv.dungSai?.hieu||0);
  p2_3VD += (dv.dungSai?.vanDung||0);

  p3_3 += (dv.traLoiNgan?.biet||0) + (dv.traLoiNgan?.hieu||0) + (dv.traLoiNgan?.vanDung||0);
  p3_3Hieu += (dv.traLoiNgan?.hieu||0);
  p3_3VD += (dv.traLoiNgan?.vanDung||0);

  p4_3 += (dv.tuLuan?.biet||0) + (dv.tuLuan?.hieu||0) + (dv.tuLuan?.vanDung||0);
  p4_3Hieu += (dv.tuLuan?.hieu||0);
  p4_3VD += (dv.tuLuan?.vanDung||0);
}));

assertEq(p1_3, 12, 'P.I = 12 câu TN (100% Nhận biết = 3.0đ)');
assertEq(p2_3Y, 8,  'P.II = 8 ý Đ/S (4B + 2H + 2VD = 2.0đ)');
assertEq(p3_3, 4,  'P.III = 4 câu TLN (2H + 2VD = 2.0đ)');
assertEq(p3_3Hieu, 2, 'P.III = 2 câu Thông hiểu (1.0đ)');
assertEq(p3_3VD, 2, 'P.III = 2 câu Vận dụng (1.0đ)');
assertEq(p4_3, 4,  'P.IV = 4 câu TL (2H + 2VD = 3.0đ)');
assertEq(p4_3Hieu, 2, 'P.IV = 2 câu Tự luận Thông hiểu');
assertEq(p4_3VD, 2, 'P.IV = 2 câu Tự luận Vận dụng');

// Kiểm tra điểm Tự luận chi tiết: Hiểu = 1.5đ, Vận dụng = 1.5đ
let diemTLHieu = 0, diemTLVD = 0;
m3.forEach(t => t.donViKienThuc.forEach(dv => {
  diemTLHieu += Number(dv.tuLuan?.diemHieu) || 0;
  diemTLVD += Number(dv.tuLuan?.diemVanDung) || 0;
}));
assertEq(Math.round(diemTLHieu * 100) / 100, 1.5, 'Tự luận: Mức Thông hiểu = 1.5đ');
assertEq(Math.round(diemTLVD * 100) / 100, 1.5, 'Tự luận: Mức Vận dụng = 1.5đ');

// Kiểm tra tỉ lệ nhận thức toàn đề Toán Khánh Hòa: 40% Biết - 30% Hiểu - 30% VD
const diemBietToanKH = p1_3 * 0.25 + p2_3Biet * 0.25; // 12*0.25 + 4*0.25 = 4.0đ
const diemHieuToanKH = p2_3Hieu * 0.25 + p3_3Hieu * 0.50 + diemTLHieu; // 2*0.25 + 2*0.50 + 1.5 = 3.0đ
const diemVDToanKH = p2_3VD * 0.25 + p3_3VD * 0.50 + diemTLVD; // 2*0.25 + 2*0.50 + 1.5 = 3.0đ
const tongDiemToanKH = Math.round((diemBietToanKH + diemHieuToanKH + diemVDToanKH) * 100) / 100;

assertEq(diemBietToanKH, 4.0, 'Tổng điểm Nhận biết toàn đề = 4.0đ (40%)');
assertEq(diemHieuToanKH, 3.0, 'Tổng điểm Thông hiểu toàn đề = 3.0đ (30%)');
assertEq(diemVDToanKH, 3.0, 'Tổng điểm Vận dụng toàn đề = 3.0đ (30%)');
assertEq(tongDiemToanKH, 10.0, 'Tổng điểm toàn đề = 10.0đ (100%)');

// ──────────────────────────────────────────────────────────
// KẾT QUẢ
// ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Kết quả: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('🚨 CÓ TEST THẤT BẠI — KIỂM TRA TRƯỚC KHI MERGE!');
  process.exit(1);
} else {
  console.log('🎉 Tất cả test PASSED — Cấu trúc an toàn!');
}
