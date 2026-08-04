// src/utils/labelUtils.js

/**
 * Gộp danh sách các nhãn thành chuỗi hiển thị gọn gàng.
 * Ví dụ:
 * ['I.1', 'I.2', 'I.3'] => 'I.1, 2, 3'
 * ['II.1a', 'II.1b'] => 'II.1a, b'
 * ['TL.1a', 'TL.1b'] => 'TL.1a, b'
 * ['II.1a', 'II.2a'] => 'II.1a, II.2a' (Khác tiền tố gốc thì giữ nguyên)
 * @param {string[]} labels 
 * @returns {string}
 */
export const formatGroupedLabels = (labels) => {
  if (!labels || labels.length === 0) return '';
  if (labels.length === 1) return labels[0];

  // Helper để lấy tiền tố của nhãn.
  // Ví dụ 'I.1' -> prefix: 'I.', suffix: '1'
  // 'II.1a' -> prefix: 'II.1', suffix: 'a'
  // 'TL.1a' -> prefix: 'TL.1', suffix: 'a'
  const parseLabel = (lbl) => {
    const strLbl = String(lbl);
    // Thử match dạng có cả chữ cái ở cuối (ví dụ II.1a, TL.1a)
    const matchWithChar = strLbl.match(/^([A-Z]+\.\d+)([a-z])$/);
    if (matchWithChar) {
      return { prefix: matchWithChar[1], suffix: matchWithChar[2] };
    }
    // Thử match dạng chỉ có số (ví dụ I.1, I.12)
    const matchWithNum = strLbl.match(/^([A-Z]+\.)(\d+)$/);
    if (matchWithNum) {
      return { prefix: matchWithNum[1], suffix: matchWithNum[2] };
    }
    return { prefix: '', suffix: strLbl };
  };

  const grouped = {};
  labels.forEach(lbl => {
    const { prefix, suffix } = parseLabel(lbl);
    if (!prefix) {
      // Nếu không parse được, cho vào nhóm 'unknown'
      if (!grouped['unknown']) grouped['unknown'] = [];
      grouped['unknown'].push(lbl);
    } else {
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(suffix);
    }
  });

  const resultParts = [];
  for (const prefix of Object.keys(grouped)) {
    if (prefix === 'unknown') {
      resultParts.push(...grouped[prefix]);
    } else {
      const suffixes = grouped[prefix];
      resultParts.push(`${prefix}${suffixes.join(', ')}`);
    }
  }

  return resultParts.join(', ');
};
