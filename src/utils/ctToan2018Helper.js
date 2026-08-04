/**
 * Helper: apply CT Toan 2018 YCCD to matrix
 * Written in pure ASCII-safe JS to avoid encoding issues.
 * Exported as standalone function, called from useExamStore.
 *
 * Fix v2:
 * - Build YCCD only for levels that actually have questions in the DVKT
 * - Add placeholder text for levels with questions but no CT2018 content
 * - Improved fuzzy matching (normalize Vietnamese accents for matching)
 * - Return detailed result for UI feedback
 */
import { findYCCD } from '../data/ctToan2018';

/**
 * Normalize Vietnamese accented characters to ASCII for better fuzzy matching.
 * Example: "phan so" matches "Phân số", "hinh hoc" matches "Hình học"
 */
function normalizeVietnamese(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritics
    .replace(/\u0111/g, 'd')          // đ -> d
    .replace(/\u0110/g, 'D')          // Đ -> D
    .trim();
}

/**
 * Count how many questions a DVKT has at a given level across all question types.
 */
function countQuestionsAtLevel(dv, level) {
  let count = 0;
  // Nhieu lua chon
  if (dv.nhieuLuaChon && dv.nhieuLuaChon[level]) count += Number(dv.nhieuLuaChon[level]) || 0;
  // Dung sai
  if (dv.dungSai && dv.dungSai[level]) count += Number(dv.dungSai[level]) || 0;
  // Vanduung cao maps to vanDung
  if (level === 'vanDung' && dv.dungSai && dv.dungSai.vanDungCao) count += Number(dv.dungSai.vanDungCao) || 0;
  // Tra loi ngan
  if (dv.traLoiNgan && dv.traLoiNgan[level]) count += Number(dv.traLoiNgan[level]) || 0;
  // Tu luan
  if (dv.tuLuan) {
    if (Array.isArray(dv.tuLuan.subItems) && dv.tuLuan.subItems.length > 0) {
      dv.tuLuan.subItems.forEach(si => {
        if (si.level === level) count++;
      });
    } else {
      if (dv.tuLuan[level]) count += Number(dv.tuLuan[level]) || 0;
    }
  }
  return count;
}

/**
 * Main function: apply CT2018 YCCD to matrix
 * @param {object} state - current zustand state
 * @param {number} lop - grade 6-12 (explicitly passed from UI dialog)
 * @returns {object} - { matrix, updatedCount, skipped, filled, warnings }
 */
export function applyCtToan2018Helper(state, lop) {
  // Validate lop
  const lopNum = parseInt(lop);
  if (!lopNum || lopNum < 6 || lopNum > 12) {
    return { error: 'Please select a grade from 6 to 12' };
  }

  const topics = JSON.parse(JSON.stringify(state.matrix));
  let updatedCount = 0;
  const skipped = [];
  const filled = [];
  const warnings = [];

  topics.forEach(topic => {
    (topic.donViKienThuc || []).forEach(dv => {
      const tenDVKT = (dv.noiDung || '').trim();
      if (!tenDVKT) return;

      // --- Determine which levels actually have questions in this DVKT ---
      const hasBiet = countQuestionsAtLevel(dv, 'biet') > 0;
      const hasHieu = countQuestionsAtLevel(dv, 'hieu') > 0;
      const hasVanDung = countQuestionsAtLevel(dv, 'vanDung') > 0;
      const hasAnyLevel = hasBiet || hasHieu || hasVanDung;

      // --- Look up YCCD from CT2018 database (improved matching) ---
      const found = findYCCD('toan', lopNum, tenDVKT);

      if (!found) {
        skipped.push(tenDVKT);
        // If we can't match but have questions, add a generic placeholder
        if (hasAnyLevel && (!dv.yeuCauCanDat || dv.yeuCauCanDat.trim() === '')) {
          const lines = [];
          if (hasBiet) { lines.push('Nhan biet:'); lines.push('- [Giao vien tu dien YCCD phu hop]'); }
          if (hasHieu) { lines.push('Thong hieu:'); lines.push('- [Giao vien tu dien YCCD phu hop]'); }
          if (hasVanDung) { lines.push('Van dung:'); lines.push('- [Giao vien tu dien YCCD phu hop]'); }
          dv.yeuCauCanDat = lines.join('\n');
          updatedCount++;
          warnings.push('No CT2018 match for: ' + tenDVKT + ' (placeholder added)');
        }
        return;
      }

      // --- Build YCCD text only for levels that have questions ---
      const lines = [];
      const ct = found.yccD;

      // Level: Biet
      if (hasBiet) {
        lines.push('Nhan biet:');
        if (ct.biet && ct.biet.length > 0) {
          ct.biet.forEach(y => lines.push('- ' + y));
        } else {
          lines.push('- [Giao vien bo sung YCCD muc Nhan biet]');
          warnings.push('CT2018 has no "Biet" YCCD for: ' + found.ten);
        }
      }

      // Level: Hieu
      if (hasHieu) {
        lines.push('Thong hieu:');
        if (ct.hieu && ct.hieu.length > 0) {
          ct.hieu.forEach(y => lines.push('- ' + y));
        } else {
          lines.push('- [Giao vien bo sung YCCD muc Thong hieu]');
          warnings.push('CT2018 has no "Hieu" YCCD for: ' + found.ten);
        }
      }

      // Level: Van dung
      if (hasVanDung) {
        lines.push('Van dung:');
        if (ct.vanDung && ct.vanDung.length > 0) {
          ct.vanDung.forEach(y => lines.push('- ' + y));
        } else {
          lines.push('- [Giao vien bo sung YCCD muc Van dung]');
          warnings.push('CT2018 has no "VanDung" YCCD for: ' + found.ten);
        }
      }

      // If no levels have questions yet (AutoFill not run), fill all levels from CT2018
      if (!hasAnyLevel) {
        if (ct.biet && ct.biet.length > 0) { lines.push('Nhan biet:'); ct.biet.forEach(y => lines.push('- ' + y)); }
        if (ct.hieu && ct.hieu.length > 0) { lines.push('Thong hieu:'); ct.hieu.forEach(y => lines.push('- ' + y)); }
        if (ct.vanDung && ct.vanDung.length > 0) { lines.push('Van dung:'); ct.vanDung.forEach(y => lines.push('- ' + y)); }
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
  console.log('[CT2018] Warnings:', warnings);
  console.log('[CT2018] Total updated:', updatedCount, 'for Lop', lopNum);

  return {
    matrix: topics,
    updatedCount,
    skipped,
    filled,
    warnings,
    lop: lopNum,
  };
}
