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
// TEST 4: KHTN 4-2-1-3 — Lọc thông minh bài chỉ lý thuyết / Nhận biết khỏi Tự luận
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 4: KHTN 4-2-1-3 — Loại trừ bài chỉ lý thuyết/Nhận biết khỏi Tự luận');

const khtnWithTheoryMatrix = [
  {
    tenChuDe: 'Mở đầu',
    donViKienThuc: [
      makeDv('Bài 1: Giới thiệu về Khoa học tự nhiên', 6),
      makeDv('Bài 3: Quy định an toàn trong phòng thực hành', 6),
    ],
  },
  {
    tenChuDe: 'Chất và sự biến đổi của chất',
    donViKienThuc: [
      {
        ...makeDv('Bài 8: Sự đa dạng của chất', 6),
        yeuCauCanDat: 'Nhận biết:\n- Nêu được sự đa dạng của chất quanh ta.',
      },
      makeDv('Bài 10: Hỗn hợp, dung dịch (Tính nồng độ)', 6),
    ],
  },
  {
    tenChuDe: 'Năng lượng và sự biến đổi',
    donViKienThuc: [
      makeDv('Bài 15: Lực và tác dụng của lực', 8),
      makeDv('Bài 16: Khối lượng và trọng lượng', 8),
    ],
  },
];

useExamStore.setState({
  matrix: khtnWithTheoryMatrix,
  examHeader: { monHoc: 'Khoa học tự nhiên', lop: '6', kyThi: 'Giữa kì' },
  examConfig: { isCauTruc4213: true, isCauTrucKHTNVao10: false, isCauTrucToan3223: false, isCauTrucToan8_5050: false },
  config: { hasTuLuan: true, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const m4 = useExamStore.getState().matrix;
const dvGioiThieu = m4[0].donViKienThuc[0];
const dvAnToan = m4[0].donViKienThuc[1];
const dvChiBietYccd = m4[1].donViKienThuc[0];

const getTlCount = (dv) => (dv.tuLuan?.biet || 0) + (dv.tuLuan?.hieu || 0) + (dv.tuLuan?.vanDung || 0) + (dv.tuLuan?.vanDungCao || 0);
assertEq(getTlCount(dvGioiThieu), 0, 'Bài "Giới thiệu về KHTN" = 0 câu Tự luận');
assertEq(getTlCount(dvAnToan), 0, 'Bài "Quy định an toàn trong phòng thực hành" = 0 câu Tự luận');
assertEq(getTlCount(dvChiBietYccd), 0, 'Bài có YCCĐ chỉ ở mức Nhận biết = 0 câu Tự luận');
assert((dvGioiThieu.nhieuLuaChon?.biet || 0) + (dvAnToan.nhieuLuaChon?.biet || 0) > 0, 'Các bài lý thuyết mở đầu được bù điểm bằng câu TNKQ Nhận biết');

let totalTlPts4 = 0;
m4.forEach(t => t.donViKienThuc.forEach(dv => {
  totalTlPts4 += (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0) + (Number(dv.tuLuan?.diemVanDungCao) || 0);
}));
assertEq(Math.round(totalTlPts4 * 100) / 100, 3.0, 'Tổng điểm Tự luận KHTN vẫn đạt chuẩn 3.0đ');

// ──────────────────────────────────────────────────────────
// TEST 5: Toán 8 (50-50) — Lọc bài chỉ Nhận biết + khớp mạch Đại số/Hình học + ưu tiên bài tính toán cho VD/VDC
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 5: Toán 8 (50-50: 5đ TNKQ + 5đ TL) — Lọc thông minh & khớp mạch kiến thức');

const toan8Matrix = [
  {
    tenChuDe: 'Chương I. Đa thức',
    donViKienThuc: [
      makeDv('Bài 1. Đơn thức', 2), // Bài mở đầu cơ bản (chỉ NB + TH)
      makeDv('Bài 2. Đa thức. Cộng trừ đa thức', 6), // Bài tính toán đầy đủ (NB + TH + VD + VDC)
      makeDv('Bài 5. Phân tích đa thức thành nhân tử', 6), // Bài biến đổi đại số đầy đủ
    ],
  },
  {
    tenChuDe: 'Chương III. Tứ giác & Định lí Thalès',
    donViKienThuc: [
      makeDv('Bài 10. Tứ giác', 1), // Bài định nghĩa mở đầu (1 tiết, không có VD)
      makeDv('Bài 12. Hình bình hành', 5), // Bài chứng minh hình học đầy đủ
      makeDv('Bài 15. Định lí Thalès trong tam giác', 5), // Bài tính toán & chứng minh hình học đầy đủ
      makeDv('Bài 20. Hình đồng dạng', 6), // Bài chỉ có mức Nhận biết trong CT 2018 (dù set 6 tiết vẫn phải bị loại khỏi TL)
    ],
  },
];

useExamStore.setState({
  matrix: toan8Matrix,
  examHeader: { monHoc: 'Toán', lop: '8', kyThi: 'Giữa kì' },
  examConfig: { isCauTruc4213: false, isCauTrucKHTNVao10: false, isCauTrucToan3223: false, isCauTrucToan8_5050: true },
  config: { hasTuLuan: true, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const m5 = useExamStore.getState().matrix;
const dvDonThuc = m5[0].donViKienThuc[0];
const dvDaThuc = m5[0].donViKienThuc[1];
const dvPhanTich = m5[0].donViKienThuc[2];
const dvTuGiac = m5[1].donViKienThuc[0];
const dvHbh = m5[1].donViKienThuc[1];
const dvThales = m5[1].donViKienThuc[2];
const dvHinhDongDang = m5[1].donViKienThuc[3];

assertEq(getTlCount(dvHinhDongDang), 0, 'Bài "Hình đồng dạng" (chỉ có mức Nhận biết trong CT 2018) = 0 câu Tự luận');
assert((dvHinhDongDang.nhieuLuaChon?.biet || 0) > 0, 'Bài "Hình đồng dạng" được phân bổ câu TNKQ Nhận biết thay thế');
assertEq((dvDonThuc.tuLuan?.vanDung || 0) + (dvDonThuc.tuLuan?.vanDungCao || 0), 0, 'Bài mở đầu "Đơn thức" không bị gán câu Tự luận Vận dụng / VDC');
assertEq((dvTuGiac.tuLuan?.vanDung || 0) + (dvTuGiac.tuLuan?.vanDungCao || 0), 0, 'Bài mở đầu 1 tiết "Tứ giác" không bị gán câu Tự luận Vận dụng / VDC');

// Kiểm tra khớp mạch Đại số (3.0đ TL) và Hình học (2.0đ TL) theo cấu trúc mặc định Toán 8
const daiSoTlPts = [dvDonThuc, dvDaThuc, dvPhanTich].reduce(
  (s, dv) => s + (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0) + (Number(dv.tuLuan?.diemVanDungCao) || 0),
  0
);
const hinhHocTlPts = [dvTuGiac, dvHbh, dvThales, dvHinhDongDang].reduce(
  (s, dv) => s + (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0) + (Number(dv.tuLuan?.diemVanDungCao) || 0),
  0
);
assertEq(Math.round(daiSoTlPts * 100) / 100, 3.0, 'Tự luận Đại số = 3.0đ (Câu 15 + Câu 16 + Câu 18 VDC)');
assertEq(Math.round(hinhHocTlPts * 100) / 100, 2.0, 'Tự luận Hình học = 2.0đ (Câu 17 gồm 3 ý a, b, c)');

let p1_5 = 0, p2_5Y = 0, p3_5 = 0;
m5.forEach(t => t.donViKienThuc.forEach(dv => {
  p1_5 += (dv.nhieuLuaChon?.biet || 0) + (dv.nhieuLuaChon?.hieu || 0) + (dv.nhieuLuaChon?.vanDung || 0);
  p2_5Y += (dv.dungSai?.biet || 0) + (dv.dungSai?.hieu || 0) + (dv.dungSai?.vanDung || 0);
  p3_5 += (dv.traLoiNgan?.biet || 0) + (dv.traLoiNgan?.hieu || 0) + (dv.traLoiNgan?.vanDung || 0);
}));
assertEq(p1_5, 12, 'Toán 8 P.I = 12 câu TN (3.0đ)');
assertEq(p2_5Y, 4, 'Toán 8 P.II = 4 ý Đ/S (1.0đ)');
assertEq(p3_5, 4, 'Toán 8 P.III = 4 câu TLN (1.0đ)');
assertEq(Math.round((daiSoTlPts + hinhHocTlPts) * 100) / 100, 5.0, 'Toán 8 P.IV = 5.0đ Tự luận (Tổng toàn đề = 10.0đ)');

// ──────────────────────────────────────────────────────────
// TEST 6: Toán Khánh Hòa (3-2-2-3) — Lọc bài chỉ Nhận biết khỏi Tự luận
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 6: Toán Khánh Hòa (3-2-2-3) — Loại trừ bài chỉ Nhận biết khỏi Tự luận');

const toanKHWithTheoryMatrix = [
  { tenChuDe: 'Đại số', donViKienThuc: [makeDv('Bài 1: Đa thức nhiều biến', 5), makeDv('Bài 2: Hằng đẳng thức đáng nhớ', 5)] },
  { tenChuDe: 'Hình học', donViKienThuc: [makeDv('Bài 3: Hình bình hành', 5), makeDv('Bài 4: Hình đồng dạng', 8)] },
  { tenChuDe: 'Xác suất', donViKienThuc: [makeDv('Bài 5: Làm quen với biến cố ngẫu nhiên', 8)] },
];

useExamStore.setState({
  matrix: toanKHWithTheoryMatrix,
  examHeader: { monHoc: 'Toán', lop: '8', kyThi: 'Cuối kì' },
  examConfig: { isCauTruc4213: false, isCauTrucKHTNVao10: false, isCauTrucToan3223: true, isCauTrucToan8_5050: false },
  config: { hasTuLuan: true, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const m6 = useExamStore.getState().matrix;
const dvHDD6 = m6[1].donViKienThuc[1];
const dvBienCo6 = m6[2].donViKienThuc[0];
assertEq(getTlCount(dvHDD6), 0, 'Toán 3-2-2-3: Bài "Hình đồng dạng" = 0 câu Tự luận');
assertEq(getTlCount(dvBienCo6), 0, 'Toán 3-2-2-3: Bài "Làm quen với biến cố ngẫu nhiên" = 0 câu Tự luận');

// ──────────────────────────────────────────────────────────
// TEST 7: KHTN Vào 10 — Loại trừ bài lý thuyết mở đầu khỏi P.II (Đúng/Sai) và P.III (TLN)
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 7: KHTN Vào 10 — Loại trừ bài chỉ lý thuyết/Nhận biết khỏi P.II & P.III');

const khtnVao10WithTheoryMatrix = [
  {
    tenChuDe: 'Mở đầu',
    donViKienThuc: [
      makeDv('Bài 1: Nhận biết một số dụng cụ, hoá chất. Thuyết trình một vấn đề khoa học', 6),
    ],
  },
  {
    tenChuDe: 'Năng lượng và sự biến đổi (Vật lí)',
    donViKienThuc: [
      makeDv('Động năng và thế năng. Cơ năng', 6),
      makeDv('Điện trở. Định luật Ohm', 6),
    ],
  },
  {
    tenChuDe: 'Chất và sự biến đổi của chất (Hóa học)',
    donViKienThuc: [
      makeDv('Kim loại. Dãy hoạt động hóa học', 6),
      makeDv('Alkane và Alkene', 6),
    ],
  },
  {
    tenChuDe: 'Vật sống (Sinh học)',
    donViKienThuc: [
      makeDv('Di truyền học Mendel. Nucleic acid', 6),
      makeDv('Đột biến gene và nhiễm sắc thể', 6),
    ],
  },
];

useExamStore.setState({
  matrix: khtnVao10WithTheoryMatrix,
  examHeader: { monHoc: 'Khoa học tự nhiên', lop: '9', kyThi: 'Thi vào 10' },
  examConfig: { isCauTruc4213: false, isCauTrucKHTNVao10: true, isCauTrucToan3223: false, isCauTrucToan8_5050: false, tongDiemP1: 5.5, tongDiemP2: 3.0 },
  config: { hasTuLuan: false, hasTraLoiNgan: true, isCuoiKi: false },
  tuLuanConfig: { enabled: false, questions: [] },
  dungSaiConfig: { enabled: false },
});
useExamStore.getState().autoFillMatrix();

const m7 = useExamStore.getState().matrix;
const dvMoDau9 = m7[0].donViKienThuc[0];
const dsMoDau9 = (dvMoDau9.dungSai?.biet || 0) + (dvMoDau9.dungSai?.hieu || 0) + (dvMoDau9.dungSai?.vanDung || 0);
const tlnMoDau9 = (dvMoDau9.traLoiNgan?.biet || 0) + (dvMoDau9.traLoiNgan?.hieu || 0) + (dvMoDau9.traLoiNgan?.vanDung || 0);

assertEq(dsMoDau9, 0, 'KHTN Vào 10: Bài mở đầu "Nhận biết một số dụng cụ, hoá chất..." = 0 ý Đúng/Sai');
assertEq(tlnMoDau9, 0, 'KHTN Vào 10: Bài mở đầu "Nhận biết một số dụng cụ, hoá chất..." = 0 câu TLN Vận dụng');
assert((dvMoDau9.nhieuLuaChon?.biet || 0) > 0, 'KHTN Vào 10: Bài mở đầu vẫn được phân bổ câu TNKQ Nhận biết');

let p1_7 = 0, p2_7Y = 0, p3_7 = 0;
m7.forEach(t => t.donViKienThuc.forEach(dv => {
  p1_7 += (dv.nhieuLuaChon?.biet || 0) + (dv.nhieuLuaChon?.hieu || 0) + (dv.nhieuLuaChon?.vanDung || 0);
  p2_7Y += (dv.dungSai?.biet || 0) + (dv.dungSai?.hieu || 0) + (dv.dungSai?.vanDung || 0);
  p3_7 += (dv.traLoiNgan?.biet || 0) + (dv.traLoiNgan?.hieu || 0) + (dv.traLoiNgan?.vanDung || 0);
}));
assertEq(p1_7, 22, 'KHTN Vào 10 P.I = 22 câu TN (5.5đ)');
assertEq(p2_7Y, 12, 'KHTN Vào 10 P.II = 12 ý Đ/S (3.0đ)');
assertEq(p3_7, 6, 'KHTN Vào 10 P.III = 6 câu TLN (1.5đ, Tổng = 10.0đ)');

// ──────────────────────────────────────────────────────────
// TEST 8: Công nghệ 8 (70% TN - 30% TL)
// ──────────────────────────────────────────────────────────
console.log('\n🔒 TEST 8: Công nghệ 8 (70% Trắc nghiệm - 30% Tự luận)');

function makeCongNgheMatrix() {
  return [
    { tenChuDe: 'Vẽ kĩ thuật', donViKienThuc: [makeDv('Hình chiếu vuông góc', 4), makeDv('Bản vẽ khối tròn xoay', 4)] },
    { tenChuDe: 'Cơ khí', donViKienThuc: [makeDv('Vật liệu cơ khí', 4), makeDv('Truyền và biến đổi chuyển động', 6)] },
    { tenChuDe: 'Kĩ thuật điện', donViKienThuc: [makeDv('An toàn điện', 4), makeDv('Mạch điện điều khiển', 6)] },
  ];
}

useExamStore.getState().setCauTrucCongNghe8_7030();
useExamStore.setState({
  matrix: makeCongNgheMatrix(),
  examHeader: { monHoc: 'Công nghệ 8', lop: '8', thoiGian: '45 phút' },
});
useExamStore.getState().autoFillMatrix();

const m8 = useExamStore.getState().matrix;
let p1_8B = 0, p1_8H = 0;
let p2_8B = 0, p2_8H = 0, p2_8VD = 0, p2_8VDC = 0;
let p3_8 = 0;
let p4_8VD = 0, p4_8VDC = 0, p4_8DiemVD = 0, p4_8DiemVDC = 0;

m8.forEach(t => t.donViKienThuc.forEach(dv => {
  p1_8B += dv.nhieuLuaChon?.biet || 0;
  p1_8H += dv.nhieuLuaChon?.hieu || 0;
  p2_8B += dv.dungSai?.biet || 0;
  p2_8H += dv.dungSai?.hieu || 0;
  p2_8VD += dv.dungSai?.vanDung || 0;
  p2_8VDC += dv.dungSai?.vanDungCao || 0;
  p3_8 += (dv.traLoiNgan?.biet || 0) + (dv.traLoiNgan?.hieu || 0) + (dv.traLoiNgan?.vanDung || 0) + (dv.traLoiNgan?.vanDungCao || 0);
  p4_8VD += dv.tuLuan?.vanDung || 0;
  p4_8VDC += dv.tuLuan?.vanDungCao || 0;
  p4_8DiemVD += dv.tuLuan?.diemVanDung || 0;
  p4_8DiemVDC += dv.tuLuan?.diemVanDungCao || 0;
}));

assertEq(p1_8B + p1_8H, 12, 'Công nghệ 8 P.I = 12 câu TN (3.0đ)');
assertEq(p1_8B, 8, 'Công nghệ 8 P.I = 8 câu Nhận biết (2.0đ)');
assertEq(p1_8H, 4, 'Công nghệ 8 P.I = 4 câu Thông hiểu (1.0đ)');

assertEq(p2_8B + p2_8H, 16, 'Công nghệ 8 P.II = 16 ý Đúng/Sai (4 câu × 4 ý = 4.0đ)');
assertEq(p2_8B, 8, 'Công nghệ 8 P.II = 8 ý Nhận biết (2.0đ)');
assertEq(p2_8H, 8, 'Công nghệ 8 P.II = 8 ý Thông hiểu (2.0đ)');
assertEq(p2_8VD + p2_8VDC, 0, 'Công nghệ 8 P.II = 0 ý VD/VDC (Đúng/Sai chỉ có Biết và Hiểu)');

assertEq(p3_8, 0, 'Công nghệ 8 P.III = 0 câu Trả lời ngắn (Bỏ qua hoàn toàn)');

assertEq(p4_8VD, 2, 'Công nghệ 8 P.IV = 2 ý Vận dụng (Câu 17: 2.0đ)');
assertEq(p4_8DiemVD, 2.0, 'Công nghệ 8 P.IV: Điểm Vận dụng = 2.0đ');
assertEq(p4_8VDC, 2, 'Công nghệ 8 P.IV = 2 ý Vận dụng cao (Câu 18: 1.0đ)');
assertEq(p4_8DiemVDC, 1.0, 'Công nghệ 8 P.IV: Điểm Vận dụng cao = 1.0đ');

const totalScore8 = (p1_8B + p1_8H) * 0.25 + (p2_8B + p2_8H) * 0.25 + p4_8DiemVD + p4_8DiemVDC;
assertEq(totalScore8, 10.0, 'Công nghệ 8: Tổng điểm toàn đề = 10.0đ (100%)');
const totalBiet8 = p1_8B * 0.25 + p2_8B * 0.25;
assertEq(totalBiet8, 4.0, 'Công nghệ 8: Tỉ lệ Nhận biết = 4.0đ (40%)');
const totalHieu8 = p1_8H * 0.25 + p2_8H * 0.25;
assertEq(totalHieu8, 3.0, 'Công nghệ 8: Tỉ lệ Thông hiểu = 3.0đ (30%)');
assertEq(p4_8DiemVD, 2.0, 'Công nghệ 8: Tỉ lệ Vận dụng = 2.0đ (20%)');
assertEq(p4_8DiemVDC, 1.0, 'Công nghệ 8: Tỉ lệ Vận dụng cao = 1.0đ (10%)');

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

