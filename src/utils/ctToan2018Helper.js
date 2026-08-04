/**
 * Helper: apply CT Toan 2018 YCCD to matrix
 * Written in pure ASCII-safe JS to avoid encoding issues.
 * Exported as standalone function, called from useExamStore.
 */
import { findYCCD } from '../data/ctToan2018';

/**
 * @param {object} state - current zustand state
 * @param {number} lop - grade 6-12 (explicitly passed from UI)
 * @returns {object} - new matrix state or empty object if nothing to update
 */
export function applyCtToan2018Helper(state, lop) {
  // Validate lop
  const lopNum = parseInt(lop);
  if (!lopNum || lopNum < 6 || lopNum > 12) {
    return { error: 'Vui long chon lop tu 6 den 12' };
  }

  const topics = JSON.parse(JSON.stringify(state.matrix));
  let updatedCount = 0;
  const skipped = [];
  const filled = [];

  topics.forEach(topic => {
    (topic.donViKienThuc || []).forEach(dv => {
      const tenDVKT = (dv.noiDung || '').trim();
      if (!tenDVKT) return;

      // Look up YCCD from CT2018 database
      const found = findYCCD('toan', lopNum, tenDVKT);
      if (!found) {
        skipped.push(tenDVKT);
        return;
      }

      // Build YCCD text grouped by level
      const lines = [];
      if (found.yccD && found.yccD.biet && found.yccD.biet.length > 0) {
        lines.push('Nhan biet:');
        found.yccD.biet.forEach(y => lines.push('- ' + y));
      }
      if (found.yccD && found.yccD.hieu && found.yccD.hieu.length > 0) {
        lines.push('Thong hieu:');
        found.yccD.hieu.forEach(y => lines.push('- ' + y));
      }
      if (found.yccD && found.yccD.vanDung && found.yccD.vanDung.length > 0) {
        lines.push('Van dung:');
        found.yccD.vanDung.forEach(y => lines.push('- ' + y));
      }

      // Only fill if currently empty
      if (!dv.yeuCauCanDat || dv.yeuCauCanDat.trim() === '') {
        dv.yeuCauCanDat = lines.join('\n');
        updatedCount++;
        filled.push(tenDVKT + ' -> ' + found.ten);
      }
    });
  });

  console.log('[CT2018] Filled:', filled);
  console.log('[CT2018] Skipped (no match):', skipped);
  console.log('[CT2018] Total updated:', updatedCount, 'for Lop', lopNum);

  return {
    matrix: topics,
    updatedCount,
    skipped,
    filled,
  };
}
