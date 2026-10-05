// Test logic đồng bộ Tự luận giữa Bản đặc tả và Khung đề
import assert from 'assert';

function simulateTuLuanQMap({
  isCont = true,
  isKHTNMon = true,
  totalNLC = 16,
  totalDSCau = 2,
  totalTLN = 4,
  matrix = [],
  tuLuanConfig = {}
}) {
  const qMap = {};
  const tlStart = isCont ? ((totalNLC + 1) + totalDSCau + totalTLN) : 1;

  // 1. Thu thập tất cả các item Tự luận từ ma trận theo thứ tự
  const allTLItems = [];
  matrix.forEach((t, ti) => {
    (t.donViKienThuc || []).forEach((dv, di) => {
      ['biet', 'hieu', 'vanDung', ...(isKHTNMon ? ['vanDungCao'] : [])].forEach(lvl => {
        const subList = Array.isArray(dv.tuLuan?.subItems)
          ? dv.tuLuan.subItems.filter(s => s.level === lvl)
          : [];
        const count = subList.length > 0 ? subList.length : (Number(dv.tuLuan?.[lvl]) || 0);
        for (let i = 0; i < count; i++) {
          const sub = subList[i] || {};
          allTLItems.push({
            ti,
            di,
            lvl,
            subIdx: i,
            id: sub.id,
            qId: sub.qId,
            qLabel: sub.qLabel,
            label: sub.label,
            diem: sub.diem || 1.0,
            dvkt: dv.noiDung || ''
          });
        }
      });
    });
  });

  if (allTLItems.length === 0) return qMap;

  const extractQNum = (it) => {
    if (!it) return null;
    const candidates = [it.qLabel, it.label, it.qId];
    for (const str of candidates) {
      if (!str) continue;
      const m = String(str).match(/(?:câu|tl_q|tl\.?)\s*(\d+)/i) || String(str).match(/\d+/);
      if (m) return parseInt(m[1] || m[0], 10);
    }
    return null;
  };

  const extractSubLetter = (str) => {
    if (!str) return '';
    const m = String(str).match(/(?:câu\s*\d+|tl\s*\d+)?([a-z])\b/i) || String(str).match(/([a-z])\)/i);
    return m ? m[1].toLowerCase() : '';
  };

  const questionsConfig = tuLuanConfig?.questions || [];
  const grouped = {};
  const unnumbered = [];
  const usedIndices = new Set();

  if (questionsConfig.length > 0) {
    questionsConfig.forEach((q, qIdx) => {
      const qNum = extractQNum(q) || (qIdx + 1);
      const expectedPrefix = (q.label || `Câu ${qNum}`).toLowerCase().trim();
      const chunk = [];

      allTLItems.forEach((item, idx) => {
        if (usedIndices.has(idx)) return;
        const itemNum = extractQNum(item);
        const itemLabel = (item.label || item.qLabel || '').toLowerCase().trim();

        const isMatch = (item.qId && q.id && item.qId === q.id) ||
                        (itemNum !== null && itemNum === qNum) ||
                        (itemLabel && itemLabel.startsWith(expectedPrefix));
        if (isMatch) {
          chunk.push(item);
          usedIndices.add(idx);
        }
      });

      if (chunk.length > 0) {
        chunk.sort((a, b) => {
          const letterA = extractSubLetter(a.label);
          const letterB = extractSubLetter(b.label);
          if (letterA && letterB) return letterA.localeCompare(letterB);
          return (a.label || '').localeCompare(b.label || '');
        });
        grouped[qNum] = chunk;
      }
    });
  }

  allTLItems.forEach((item, idx) => {
    if (usedIndices.has(idx)) return;
    const num = extractQNum(item);
    if (num !== null) {
      if (!grouped[num]) grouped[num] = [];
      grouped[num].push(item);
      usedIndices.add(idx);
    } else {
      unnumbered.push(item);
    }
  });

  const finalQuestions = [];
  const sortedNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  sortedNums.forEach(num => {
    const chunk = grouped[num];
    chunk.sort((a, b) => {
      const letterA = extractSubLetter(a.label);
      const letterB = extractSubLetter(b.label);
      if (letterA && letterB) return letterA.localeCompare(letterB);
      return (a.label || '').localeCompare(b.label || '');
    });
    finalQuestions.push(chunk);
  });

  if (unnumbered.length > 0) {
    const dvktGroups = {};
    unnumbered.forEach(item => {
      const key = item.dvkt || '_unknown';
      if (!dvktGroups[key]) dvktGroups[key] = [];
      dvktGroups[key].push(item);
    });
    Object.values(dvktGroups).forEach(grp => {
      for (let i = 0; i < grp.length; i += 2) {
        finalQuestions.push(grp.slice(i, i + 2));
      }
    });
  }

  const alphabet = ['a', 'b', 'c', 'd', 'e', 'f'];
  const cellMap = {};

  finalQuestions.forEach((chunk, cIdx) => {
    const actualQNum = isCont ? (tlStart + cIdx) : (cIdx + 1);
    const isMulti = chunk.length > 1;

    chunk.forEach((item, iIdx) => {
      const letter = isMulti ? (extractSubLetter(item.label) || alphabet[iIdx] || '') : '';
      const key = `${item.ti}_${item.di}_tl_${item.lvl}`;
      if (!cellMap[key]) cellMap[key] = [];
      cellMap[key].push({ actualQNum, letter });
    });
  });

  Object.keys(cellMap).forEach(key => {
    const items = cellMap[key];
    const byQNum = {};
    items.forEach(it => {
      if (!byQNum[it.actualQNum]) byQNum[it.actualQNum] = [];
      if (it.letter) byQNum[it.actualQNum].push(it.letter);
    });

    const labels = [];
    Object.keys(byQNum).map(Number).sort((a, b) => a - b).forEach(qNum => {
      const letters = byQNum[qNum];
      const prefix = isKHTNMon ? `C${qNum}` : `TL.${qNum}`;
      if (letters.length === 0) {
        labels.push(prefix);
      } else if (letters.length === 1) {
        labels.push(`${prefix} ý ${letters[0]}`);
      } else {
        labels.push(`${prefix} ý ${letters.join(', ')}`);
      }
    });

    qMap[key] = labels.join(', ');
  });

  return qMap;
}

// === TEST CASE 1: Giả lập chính xác dữ liệu của file Ma_Tran_Dac_Ta_De_Kiem_Tra_MathType (7).docx ===
const mockMatrixFile7 = [
  {
    tenChuDe: 'Năng lượng và sự biến đổi',
    donViKienThuc: [
      { noiDung: 'Bài 1. Dụng cụ' },
      {
        noiDung: 'Bài 2. Động năng, Thế năng',
        tuLuan: {
          subItems: [
            { qId: 'tl_q1', label: 'Câu 1a', level: 'vanDungCao', diem: 0.5 },
            { qId: 'tl_q1', label: 'Câu 1b', level: 'vanDungCao', diem: 0.5 }
          ]
        }
      },
      { noiDung: 'Bài 3. Cơ năng' },
      { noiDung: 'Bài 4. Công' }
    ]
  },
  {
    tenChuDe: 'Ánh sáng',
    donViKienThuc: [
      {
        noiDung: 'Bài 5. Khúc xạ ánh sáng',
        tuLuan: {
          subItems: [
            { qId: 'tl_q2', label: 'Câu 2a', level: 'vanDung', diem: 0.5 }
          ]
        }
      },
      { noiDung: 'Bài 6. Phản xạ' },
      { noiDung: 'Bài 7. Lăng kính' },
      {
        noiDung: 'Bài 8. Thấu kính',
        tuLuan: {
          subItems: [
            { qId: 'tl_q2', label: 'Câu 2b', level: 'hieu', diem: 0.5 }
          ]
        }
      }
    ]
  },
  {
    tenChuDe: 'Điện',
    donViKienThuc: [
      { noiDung: 'Bài 9. Tiêu cự' },
      { noiDung: 'Bài 10. Kính lúp' },
      {
        noiDung: 'Bài 11. Điện trở',
        tuLuan: {
          subItems: [
            { qId: 'tl_q3', label: 'Câu 3a', level: 'hieu', diem: 0.5 }
          ]
        }
      },
      {
        noiDung: 'Bài 12. Đoạn mạch',
        tuLuan: {
          subItems: [
            { qId: 'tl_q3', label: 'Câu 3b', level: 'vanDung', diem: 0.5 }
          ]
        }
      }
    ]
  }
];

const mockTuLuanConfig = {
  enabled: true,
  questions: [
    { id: 'tl_q1', label: 'Câu 1' },
    { id: 'tl_q2', label: 'Câu 2' },
    { id: 'tl_q3', label: 'Câu 3' }
  ]
};

console.log('--- TEST 1: File (7).docx (16 NLC, 2 DS, 4 TLN, 3 TL = 25 câu) ---');
const qMap = simulateTuLuanQMap({
  isCont: true,
  isKHTNMon: true,
  totalNLC: 16,
  totalDSCau: 2,
  totalTLN: 4,
  matrix: mockMatrixFile7,
  tuLuanConfig: mockTuLuanConfig
});

console.log('Kết quả qMap:');
console.log('Bài 2 (VDC):', qMap['0_1_tl_vanDungCao']);
console.log('Bài 5 (VD): ', qMap['1_0_tl_vanDung']);
console.log('Bài 8 (TH): ', qMap['1_3_tl_hieu']);
console.log('Bài 11 (TH):', qMap['2_2_tl_hieu']);
console.log('Bài 12 (VD):', qMap['2_3_tl_vanDung']);

assert.strictEqual(qMap['0_1_tl_vanDungCao'], 'C23 ý a, b', 'Bài 2 phải là C23 ý a, b');
assert.strictEqual(qMap['1_0_tl_vanDung'], 'C24 ý a', 'Bài 5 phải là C24 ý a');
assert.strictEqual(qMap['1_3_tl_hieu'], 'C24 ý b', 'Bài 8 phải là C24 ý b');
assert.strictEqual(qMap['2_2_tl_hieu'], 'C25 ý a', 'Bài 11 phải là C25 ý a');
assert.strictEqual(qMap['2_3_tl_vanDung'], 'C25 ý b', 'Bài 12 phải là C25 ý b');

// Đảm bảo không có bất kỳ nhãn nào vượt quá C25
Object.values(qMap).forEach(label => {
  const m = label.match(/C(\d+)/);
  if (m) {
    const qNum = parseInt(m[1], 10);
    assert(qNum <= 25, `Số câu không được vượt quá 25! Gặp: ${qNum}`);
  }
});

console.log('✅ TEST 1 PASSED: Tất cả các nhãn khớp 100% Khung đề, câu cuối cùng dừng lại ở C25!\n');

// === TEST CASE 2: Đề có 2 câu Tự luận (mỗi câu 2 ý) ===
console.log('--- TEST 2: Đề 2 câu Tự luận (4 ý) ---');
const mockMatrix2TL = [
  {
    tenChuDe: 'CĐ 1',
    donViKienThuc: [
      {
        noiDung: 'Bài 1',
        tuLuan: {
          subItems: [
            { qId: 'tl_q1', label: 'Câu 1a', level: 'hieu' },
            { qId: 'tl_q1', label: 'Câu 1b', level: 'vanDung' }
          ]
        }
      },
      {
        noiDung: 'Bài 2',
        tuLuan: {
          subItems: [
            { qId: 'tl_q2', label: 'Câu 2a', level: 'hieu' },
            { qId: 'tl_q2', label: 'Câu 2b', level: 'vanDungCao' }
          ]
        }
      }
    ]
  }
];
const qMap2 = simulateTuLuanQMap({
  isCont: true,
  isKHTNMon: true,
  totalNLC: 16,
  totalDSCau: 2,
  totalTLN: 4,
  matrix: mockMatrix2TL,
  tuLuanConfig: {
    enabled: true,
    questions: [{ id: 'tl_q1', label: 'Câu 1' }, { id: 'tl_q2', label: 'Câu 2' }]
  }
});
assert.strictEqual(qMap2['0_0_tl_hieu'], 'C23 ý a');
assert.strictEqual(qMap2['0_0_tl_vanDung'], 'C23 ý b');
assert.strictEqual(qMap2['0_1_tl_hieu'], 'C24 ý a');
assert.strictEqual(qMap2['0_1_tl_vanDungCao'], 'C24 ý b');
console.log('✅ TEST 2 PASSED: Đề 2 câu Tự luận dừng lại ở C24!\n');

// === TEST CASE 3: Môn Toán không phải KHTN (TL.1, TL.2...) ===
console.log('--- TEST 3: Môn Toán (TL.1, TL.2, TL.3) ---');
const mockMatrixToan = [
  {
    tenChuDe: 'Đại số',
    donViKienThuc: [
      {
        noiDung: 'Bài 1. Biểu thức',
        tuLuan: {
          subItems: [
            { qId: 'tl_q1', label: 'Câu 1a', level: 'vanDung' },
            { qId: 'tl_q1', label: 'Câu 1b', level: 'vanDung' }
          ]
        }
      }
    ]
  },
  {
    tenChuDe: 'Hình học',
    donViKienThuc: [
      {
        noiDung: 'Bài 2. Tam giác',
        tuLuan: {
          subItems: [
            { qId: 'tl_q2', label: 'Câu 2a', level: 'hieu' },
            { qId: 'tl_q2', label: 'Câu 2b', level: 'vanDung' }
          ]
        }
      }
    ]
  }
];
const qMapToan = simulateTuLuanQMap({
  isCont: false,
  isKHTNMon: false,
  matrix: mockMatrixToan,
  tuLuanConfig: {
    enabled: true,
    questions: [
      { id: 'tl_q1', label: 'Câu 1' },
      { id: 'tl_q2', label: 'Câu 2' }
    ]
  }
});
assert.strictEqual(qMapToan['0_0_tl_vanDung'], 'TL.1 ý a, b');
assert.strictEqual(qMapToan['1_0_tl_hieu'], 'TL.2 ý a');
assert.strictEqual(qMapToan['1_0_tl_vanDung'], 'TL.2 ý b');
console.log('✅ TEST 3 PASSED: Môn Toán hiển thị TL.1..TL.2 chuẩn xác!\n');

