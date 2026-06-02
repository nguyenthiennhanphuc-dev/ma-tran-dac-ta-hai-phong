// Test autofill logic for tu luan
const distributeLargestRemainder = (total, ratios) => {
  const sum = ratios.reduce((a, b) => a + b, 0);
  const exact = ratios.map(r => total * r / sum);
  const floored = exact.map(Math.floor);
  const remainders = exact.map((e, i) => ({ remainder: e - floored[i], index: i }));
  remainders.sort((a, b) => b.remainder - a.remainder);

  const result = [...floored];
  const remainder = total - floored.reduce((a, b) => a + b, 0);

  for (let i = 0; i < remainder; i++) {
    result[remainders[i].index]++;
  }

  return result;
};

// Test data
const tiLe = { biet: 40, hieu: 30, vanDung: 30 };
const allSubItems = [
  { pts: 0.5, qLabel: 'Câu 1', subIdx: 0 },
  { pts: 0.5, qLabel: 'Câu 1', subIdx: 1 },
  { pts: 1.0, qLabel: 'Câu 2', subIdx: 0 },
  { pts: 1.0, qLabel: 'Câu 3', subIdx: 0 },
];

console.log('=== Test Autofill Tu Luan Logic ===');
console.log('Cấu hình tỉ lệ:', tiLe);
console.log('Danh sách ý:', allSubItems);

const totalItems = allSubItems.length;
console.log('Tổng số ý:', totalItems);

// Logic mới: Phân bổ ngẫu nhiên theo tỉ lệ
const levels = [];
const totalRatio = tiLe.biet + tiLe.hieu + tiLe.vanDung;
const countBiet = Math.round(totalItems * tiLe.biet / totalRatio);
const countHieu = Math.round(totalItems * tiLe.hieu / totalRatio);
const countVanDung = totalItems - countBiet - countHieu;

console.log(`Phân bổ: ${countBiet} Biết, ${countHieu} Hiểu, ${countVanDung} Vận dụng`);

for (let i = 0; i < countBiet; i++) levels.push('biet');
for (let i = 0; i < countHieu; i++) levels.push('hieu');
for (let i = 0; i < countVanDung; i++) levels.push('vanDung');

// Shuffle
for (let i = levels.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [levels[i], levels[j]] = [levels[j], levels[i]];
}

console.log('Thứ tự ngẫu nhiên:', levels);

// Gán cho từng ý
const result = allSubItems.map((item, index) => ({
  ...item,
  level: levels[index] || 'vanDung'
}));

console.log('Kết quả phân bổ:');
result.forEach((item, i) => {
  console.log(`Ý ${i+1}: ${item.pts}đ - ${item.level}`);
});