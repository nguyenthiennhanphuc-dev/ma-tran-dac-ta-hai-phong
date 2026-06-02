// Test complete autofill flow
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

// Mock exam config
const examConfig = {
  diemMoiCauP1: 0.25,
  diemMoiYP2: 0.25,
  diemMoiYP3: 0.25,
  tongDiemP1: 2.0,
  tongDiemP2: 2.0,
  tongDiemP3: 0,
  tiLeNhanThuc: { biet: 40, hieu: 30, vanDung: 30 }
};

// Mock tuLuanConfig
const tuLuanConfig = {
  enabled: false, // Test auto-detection
  questions: [
    {
      id: 'tl_q1',
      label: 'Câu 1',
      subItems: [
        { diem: 0.5 },
        { diem: 0.5 },
      ]
    },
    {
      id: 'tl_q2',
      label: 'Câu 2',
      subItems: [
        { diem: 1.0 },
      ]
    },
    {
      id: 'tl_q3',
      label: 'Câu 3',
      subItems: [
        { diem: 1.0 },
      ]
    },
  ],
};

console.log('=== Test Complete Autofill Flow ===');

// Simulate the autofill logic
const tTL = 10 - 2.0 - 2.0 - 0; // 6.0
console.log('Tổng điểm tự luận:', tTL);

const tlCfg = tuLuanConfig;

// Check for manual config
const hasManualConfig = tlCfg?.questions && tlCfg.questions.length > 0 && tlCfg.questions.some(q => q.subItems && q.subItems.length > 0);
console.log('Có cấu hình thủ công:', hasManualConfig);

if (hasManualConfig) {
  console.log('🔧 Sử dụng chế độ cấu hình thủ công');

  const tiLe = examConfig.tiLeNhanThuc || { biet: 40, hieu: 30, vanDung: 30 };
  console.log('Tỉ lệ nhận thức:', tiLe);

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

  console.log('Danh sách ý từ config:', allSubItems);

  const totalItems = allSubItems.length;
  console.log('Tổng số ý:', totalItems);

  // Phân bổ mức độ nhận thức
  const levels = [];
  const totalRatio = tiLe.biet + tiLe.hieu + tiLe.vanDung;
  const countBiet = Math.round(totalItems * tiLe.biet / totalRatio);
  const countHieu = Math.round(totalItems * tiLe.hieu / totalRatio);
  const countVanDung = totalItems - countBiet - countHieu;

  console.log(`Phân bổ: ${countBiet} Biết (${(countBiet/totalItems*100).toFixed(1)}%), ${countHieu} Hiểu (${(countHieu/totalItems*100).toFixed(1)}%), ${countVanDung} Vận dụng (${(countVanDung/totalItems*100).toFixed(1)}%)`);

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
  const tuLuanPool = [];
  allSubItems.forEach((item, index) => {
    tuLuanPool.push({
      type: 'tuLuan',
      lvl: levels[index] || 'vanDung',
      pts: item.pts,
      qLabel: item.qLabel
    });
  });

  console.log('TuLuanPool items (sẽ được ưu tiên phân bổ trước):');
  tuLuanPool.forEach((item, i) => {
    console.log(`  ${i+1}. ${item.pts}đ - ${item.lvl} (${item.qLabel})`);
  });

  // Thống kê
  const stats = { biet: 0, hieu: 0, vanDung: 0 };
  tuLuanPool.forEach(item => stats[item.lvl]++);
  console.log('Thống kê mức độ tự luận:');
  console.log(`  Biết: ${stats.biet} ý`);
  console.log(`  Hiểu: ${stats.hieu} ý`);
  console.log(`  Vận dụng: ${stats.vanDung} ý`);
  console.log('\n💡 Ưu điểm: Tự luận sẽ được phân bổ vào các đơn vị có trọng số cao trước, đảm bảo tỉ lệ nhận thức chính xác hơn!');
}