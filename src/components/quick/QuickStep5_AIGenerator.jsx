// Tên file: src/components/Step5_AIGenerator.jsx
import React, { useState, useMemo } from 'react';
import { useQuickStore as useExamStore } from '../../store/useQuickStore';
import { Copy, FileText, CheckCircle2, Wand2, AlertTriangle, ArrowUpCircle, Trash2, CheckSquare } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import ClientGraph from '../ClientGraph';

// =============================================================================
// [BƯỚC 1] TỪ ĐIỂN PHONG CÁCH RA ĐỀ
// =============================================================================
export const STYLE_DICTIONARY = {
  "thuc_te": "BẮT BUỘC lồng ghép bối cảnh thực tế đời sống (như mua sắm, tính tiền, đo đạc, khoa học) vào câu hỏi.",
  "lien_mon": "BẮT BUỘC tích hợp dữ kiện liên môn (như Lịch sử, Địa lý Việt Nam, Văn học) vào bài toán.",
  "hai_huoc": "Hãy thiết kế câu hỏi với tình huống hài hước, dí dỏm, sử dụng tên các nhân vật đang bắt trend trên mạng xã hội hoặc truyện tranh.",
  "thuan_tinh_toan": "Đây là câu hỏi thuần tính toán, kiểm tra kỹ năng biến đổi. KHÔNG cần lồng ghép lời văn thực tế."
};

const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{content}</Latex>;
};

// =============================================================================
// HÀM BÓC TÁCH ĐỀ THI NHÁP: parseExamDraft(rawText)
// =============================================================================
export function parseExamDraft(rawText) {
  const cleanLatexJunk = (text) => {
    if (!text) return text;
    return text
      .replace(/\$\s*\\rightarrow\s*\$/g, '->')
      .replace(/\$\s*->\s*\$/g, '->')
      .replace(/\$\s*\\Rightarrow\s*\$/g, '=>')
      .replace(/\$\s*=>\s*\$/g, '=>')
      .replace(/\$\s*\\rightleftharpoons\s*\$/g, '<=>')
      .replace(/\$\s*\^\\circ C\s*\$/g, '°C')
      .replace(/\$\s*\\degree C\s*\$/g, '°C')
      .replace(/\$\s*t\^o\s*\$/g, 't°')
      .replace(/\$\s*t\^\\circ\s*\$/g, 't°')
      .replace(/\[cite_start\]/g, '')
      .replace(/\*\]/g, '')
      .replace(/\[cite_end\]/g, '');
  };

  const results = [];

  try {
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return results;
    }

    let text = cleanLatexJunk(rawText);
    text = text.replace(/\[cite_start\]/g, '').replace(/\*\]/g, '').replace(/\[cite_end\]/g, '');
    const lines = text.split('\n');

    const detectLoaiFromLine = (line) => {
      const stripped = line.replace(/[\*\_\#\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      if (/câu\s*\d+/i.test(stripped)) return -1;
      if (stripped.length > 150) return -1;
      if (/(?:loại\s*4|phần\s*(?:iv|4)\b|tự\s*luận)/i.test(stripped)) return 4;
      if (/(?:loại\s*3|phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn)/i.test(stripped)) return 3;
      if (/(?:loại\s*2|phần\s*(?:ii|2)\b|đúng\s*[\/.]?\s*sai)/i.test(stripped)) return 2;
      if (/(?:loại\s*1|phần\s*(?:i|1)\b|nhiều\s*(?:lựa\s*chọn|phương\s*án)|trắc\s*nghiệm\s*nhiều)/i.test(stripped)) return 1;
      return -1;
    };

    const cauRegex = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b(?:\s*\([^)]*\))*(?:\s*[:.\)\]])?(?:\*\*|__)?/i;

    let currentLoai = 1;
    const blocks = [];
    let currentBlock = null;

    for (const line of lines) {
      const detectedLoai = detectLoaiFromLine(line);
      if (detectedLoai > 0) {
        currentLoai = detectedLoai;
        continue;
      }

      const cauMatch = line.match(cauRegex);
      if (cauMatch) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { loai: currentLoai, soCau: cauMatch[1], lines: [line] };
        continue;
      }

      if (currentBlock) currentBlock.lines.push(line);
    }

    if (currentBlock) blocks.push(currentBlock);

    for (const block of blocks) {
      const blockText = '\n' + block.lines.join('\n');
      let loai = block.loai;

      // Auto-correct Loại 1 -> Loại 2 if the answer explicitly shows True/False format (e.g. a-Đ, b-S)
      const hasTFAnswerA = /(?:^|\n|\s)(?:a|ý a)\s*[-:]\s*(?:Đ|S|True|False|Đúng|Sai)(?:\s|,|\.|;|\||$)/i.test(blockText);
      const hasTFAnswerB = /(?:^|\n|\s)(?:b|ý b)\s*[-:]\s*(?:Đ|S|True|False|Đúng|Sai)(?:\s|,|\.|;|\||$)/i.test(blockText);
      if (loai === 1 && hasTFAnswerA && hasTFAnswerB) {
        loai = 2;
      }

      try {
        let parsed = [];
        if (loai === 1) parsed = parseLoai1(blockText);
        else if (loai === 2) parsed = parseLoai2(blockText);
        else if (loai === 3) parsed = parseLoai3(blockText); // ĐÃ NÂNG CẤP BÓC TÁCH LOẠI 3
        else if (loai === 4) parsed = parseLoai4(blockText);

        if (parsed.length > 0) {
          results.push(...parsed);
        } else {
          // Fallback
          const hasABCD = /(?:^|\n)\s*(?:\*\*|__)?A[.)]\s*/i.test(blockText) &&
            /(?:^|\n)\s*(?:\*\*|__)?B[.)]\s*/i.test(blockText);
          const hasAbcd = extractY(blockText, 'a', 'b') && extractY(blockText, 'b', 'c');
          const hasDiem = /\|\|\s*[0-9.,]+/.test(blockText);

          if (loai !== 1 && hasABCD) parsed = parseLoai1(blockText);
          else if (loai !== 4 && hasDiem) parsed = parseLoai4(blockText);
          else if (loai !== 2 && hasAbcd) parsed = parseLoai2(blockText);

          if (parsed.length > 0) {
            parsed.forEach(q => { q.loaiCauHoi = loai; });
            results.push(...parsed);
          }
        }
      } catch (e) {
        console.error('[parseExamDraft] Lỗi parse Câu ' + block.soCau + ' (Loại ' + loai + '):', e);
      }
    }

  } catch (error) {
    console.error('parseExamDraft: Lỗi khi bóc tách đề thi ->', error);
  }

  return results;
}

// -----------------------------------------------------------------------------
// LOẠI 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN (A, B, C, D)
// -----------------------------------------------------------------------------
function parseLoai1(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b/gi) || [];

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      let noiDung = p;
      let prefix = '';
      let maNangLuc = '';
      const cleanMetaMatch = noiDung.match(/^\s*[\(\[,]?\s*(?:Mức độ|Mã năng lực|MNL)[^)\]]*[\)\]]*\s*[:.]?\s*/i);
      if (cleanMetaMatch) {
        const mnMatch = cleanMetaMatch[0].match(/(?:Mã năng lực|MNL):\s*([^,)\]]+)/i);
        if (mnMatch) maNangLuc = mnMatch[1].trim();
        noiDung = noiDung.replace(cleanMetaMatch[0], '');
      } else {
        const metaMatch = noiDung.match(/^\s*\(([^)]*)\)\s*[:.]?\s*/i);
        if (metaMatch) {
          prefix = `[${metaMatch[1]}] `;
          const mnMatch = metaMatch[1].match(/Mã năng lực:\s*([^,)]+)/i);
          if (mnMatch) maNangLuc = mnMatch[1].trim();
          noiDung = noiDung.replace(metaMatch[0], '');
        }
      }

      const noiDungMatch = noiDung.match(/^([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?A[.\)]\s*)/i);
      noiDung = noiDungMatch ? prefix + noiDungMatch[1].trim() : prefix + noiDung.trim();

      const dapAnA = p.match(/(?:^|\n)\s*(?:\*\*|__)?A[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?B[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnB = p.match(/(?:^|\n)\s*(?:\*\*|__)?B[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?C[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnC = p.match(/(?:^|\n)\s*(?:\*\*|__)?C[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?D[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnD = p.match(/(?:^|\n)\s*(?:\*\*|__)?D[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?Đáp án)/i)?.[1]?.trim() || '';

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?Đáp án(?: đúng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giải thích\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 1, soCau, noiDung, dapAnA, dapAnB, dapAnC, dapAnD, dapAnDung, giaiThich, maNangLuc });
      }
    } catch (e) { console.error('Lỗi parse Loại 1:', e); }
  });
  return questions;
}

const Y_MARKER = (letter) =>
  new RegExp(`(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ý\\s+|Câu\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)\\s*(?:\\*\\*|__)?\\s*(?:[\\(\\[,]?\\s*(?:Mức độ|Mã năng lực|MNL)[^)\\]]*[\\)\\]]*\\s*[:.]?\\s*)?`, 'i');

const Y_LOOK = (letter) =>
  `(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ý\\s+|Câu\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)`;

function extractY(p, letter, nextLetter) {
  const markerRx = Y_MARKER(letter);
  const markerMatch = p.match(markerRx);
  if (!markerMatch) return { content: '', maNangLuc: '' };

  const startIdx = p.search(markerRx) + markerMatch[0].length;
  const remaining = p.slice(startIdx);

  const answerBoundaryRx = /(?:^|\n|\s)\*\*\s*(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án|Trả lời|Hướng dẫn giải|Hướng dẫn chấm|Hướng dẫn|Giải thích)[^*]*\*\*|(?:^|\n)\s*(?:\*\*|__)?(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án|Trả lời|Hướng dẫn giải|Hướng dẫn chấm|Giải thích)\s*[:.)\]]?\s*(?:\*\*|__)?/i;

  let content;
  if (nextLetter) {
    const lookaheadRx = new RegExp(Y_LOOK(nextLetter), 'i');
    const endIdx = remaining.search(lookaheadRx);
    content = endIdx >= 0 ? remaining.slice(0, endIdx).trim() : remaining.trim();
  } else {
    const endIdx = remaining.search(answerBoundaryRx);
    content = endIdx >= 0 ? remaining.slice(0, endIdx).trim() : remaining.trim();
  }

  const answerIdx = content.search(answerBoundaryRx);
  if (answerIdx >= 0) content = content.slice(0, answerIdx).trim();

  let maNangLuc = '';
  const mnMatch = markerMatch[0].match(/(?:Mã năng lực|MNL):\s*([^,)\]]+)/i);
  if (mnMatch) maNangLuc = mnMatch[1].trim();

  return { content, maNangLuc };
}

// -----------------------------------------------------------------------------
// LOẠI 2: TRẮC NGHIỆM ĐÚNG/SAI
// -----------------------------------------------------------------------------
function parseLoai2(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b/gi) || [];

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      let noiDung = '';
      const yAMarker = Y_MARKER('a');
      const yAMatchResult = p.match(yAMarker);
      if (yAMatchResult) {
        const yAStart = p.search(yAMarker);
        if (yAStart > 0) {
          noiDung = p.substring(0, yAStart).trim();
        }
      }

      const extA = extractY(p, 'a', 'b');
      const extB = extractY(p, 'b', 'c');
      const extC = extractY(p, 'c', 'd');
      const extD = extractY(p, 'd', null);

      const yA = extA.content;
      const yB = extB.content;
      const yC = extC.content;
      const yD = extD.content;
      
      const maNangLucA = extA.maNangLuc;
      const maNangLucB = extB.maNangLuc;
      const maNangLucC = extC.maNangLuc;
      const maNangLucD = extD.maNangLuc;
      
      const allMaNangLucs = [maNangLucA, maNangLucB, maNangLucC, maNangLucD].filter(Boolean);
      // For True/False, we just pick the first valid code to help map to the parent question slot
      const maNangLuc = allMaNangLucs.length > 0 ? allMaNangLucs[0] : '';

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?Đáp án(?: đúng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giải thích\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (yA || yB || yC || yD) {
        questions.push({ loaiCauHoi: 2, soCau, noiDung, yA, yB, yC, yD, dapAnDung, giaiThich, maNangLuc });
      }
    } catch (e) { console.error('Lỗi parse Loại 2:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOẠI 3: TRẢ LỜI NGẮN — ĐÃ NÂNG CẤP ĐỘC LẬP TỪNG CÂU (KHÔNG a,b,c,d)
// -----------------------------------------------------------------------------
function parseLoai3(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b/gi) || [];

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      let noiDung = p;
      let prefix = '';
      let maNangLuc = '';
      const cleanMetaMatch = noiDung.match(/^\s*[\(\[,]?\s*(?:Mức độ|Mã năng lực|MNL)[^)\]]*[\)\]]*\s*[:.]?\s*/i);
      if (cleanMetaMatch) {
        const mnMatch = cleanMetaMatch[0].match(/(?:Mã năng lực|MNL):\s*([^,)\]]+)/i);
        if (mnMatch) maNangLuc = mnMatch[1].trim();
        noiDung = noiDung.replace(cleanMetaMatch[0], '');
      } else {
        const metaMatch = noiDung.match(/^\s*\(([^)]*)\)\s*[:.]?\s*/i);
        if (metaMatch) {
          prefix = `[${metaMatch[1]}] `;
          const mnMatch = metaMatch[1].match(/Mã năng lực:\s*([^,)]+)/i);
          if (mnMatch) maNangLuc = mnMatch[1].trim();
          noiDung = noiDung.replace(metaMatch[0], '');
        }
      }

      // Cắt bỏ phần Đáp án, Giải thích bị dính vào nội dung
      const noiDungMatch = noiDung.match(/^([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?(?:Đáp án|Trả lời|Giải thích))/i);
      noiDung = noiDungMatch ? prefix + noiDungMatch[1].trim() : prefix + noiDung.trim();

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?Đáp án(?: đúng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giải thích\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 3, soCau, noiDung, dapAnDung, giaiThich, maNangLuc });
      }
    } catch (e) { console.error('Lỗi parse Loại 3:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOẠI 4: TỰ LUẬN — hỗ trợ cả câu 1 ý và câu nhiều ý (a, b, c)
// -----------------------------------------------------------------------------
function parseLoai4(text) {
  const questions = [];

  // Pre-scan: extract Kiến thức from câu headers before the split removes them
  const kienThucMap = {};
  const _hdrRx = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b\s*\(([^)]+)\)/gi;
  let _hm;
  while ((_hm = _hdrRx.exec(text)) !== null) {
    const _ktm = _hm[2].match(/Ki[eê]n\s*th[uứ]c:\s*([^,)]+)/i);
    if (_ktm) {
      const _v = _ktm[1].trim();
      if (/h.nh/i.test(_v)) kienThucMap[_hm[1]] = 'hinh_hoc';
      else if (/[đd].i\s*s/i.test(_v)) kienThucMap[_hm[1]] = 'dai_so';
    }
  }

  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?Câu\s*(\d+)\b/gi) || [];

  // Strip metadata "(Mức độ: ..., Mã năng lực: ...)" khỏi nội dung ý
  const stripMeta = (s) => s ? s.replace(/\s*[\(\[,]?\s*(?:Mức độ|Mã năng lực|MNL)[^)\]]*[\)\]]*\s*[:.]?\s*/gi, '').trim() : '';

  const calcDiem = (block) => {
    if (!block) return '';
    let total = 0;
    block.split('\n').forEach(line => {
      const pm = line.match(/\|\|\s*([0-9.,]+)/);
      if (pm) { total += parseFloat(pm[1].replace(',', '.')) || 0; return; }
      const pa = line.match(/\(([0-9.,]+)\s*(?:điểm|đ)?\)\s*$/);
      if (pa) total += parseFloat(pa[1].replace(',', '.')) || 0;
    });
    return total > 0 ? (Math.round(total * 100) / 100).toString() : '';
  };

  const answerBdRx = /(?:^|\n)\s*(?:\*\*|__)?(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án(?:\s+ý\s+[a-c])?|Hướng dẫn giải|Hướng dẫn chấm)\s*[:.\)]?(?:\*\*|__)?\s*/i;
  const giaiThichRx = /(?:^|\n)\s*(?:\*\*|__)?Giải thích\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i;

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      // Phát hiện các ý a), b), c) hoặc Ý a:, Ý a) trong block — dùng để tách multi-ý
      const yRx = /(?:^|\n)[ \t]*(?:\*\*|__)?(?:Ý\s+)?([a-cA-C])[):.][ \t]*/gi;
      const ySegments = [];
      let sm, lastEnd = 0, lastLabel = null;
      let firstYIndex = -1;
      while ((sm = yRx.exec(p)) !== null) {
        if (firstYIndex === -1) firstYIndex = sm.index;
        if (lastLabel !== null) {
          ySegments.push({ label: lastLabel, content: p.substring(lastEnd, sm.index) });
        }
        lastLabel = sm[1];
        lastEnd = sm.index + sm[0].length;
      }
      if (lastLabel !== null) ySegments.push({ label: lastLabel, content: p.substring(lastEnd) });

      let maNangLuc = '';
      const mnMatch = p.match(/(?:Mã năng lực|MNL):\s*([^,)\]]+)/i);
      if (mnMatch) maNangLuc = mnMatch[1].trim();

      if (ySegments.length >= 2) {
        // Multi-ý: parse từng ý riêng — capture intro text before first a)
        const multiYIntro = firstYIndex > 0 ? stripMeta(p.substring(0, firstYIndex).trim()) : '';
        const result = { loaiCauHoi: 4, soCau, noiDung: multiYIntro, kienThuc: kienThucMap[soCau] || '', maNangLuc };
        let totalDiem = 0;
        let giaiThich = '';

        ySegments.forEach(({ label, content }) => {
          const L = label.toUpperCase();

          // Tách giải thích (lấy từ ý cuối cùng)
          const gtMatch = content.match(giaiThichRx);
          if (gtMatch && !giaiThich) giaiThich = gtMatch[1].trim();
          const cleanContent = gtMatch ? content.substring(0, content.search(giaiThichRx)).trim() : content.trim();

          // Tách nội dung ý và đáp án ý
          const bdIdx = cleanContent.search(answerBdRx);
          let yNoiDung = bdIdx >= 0 ? cleanContent.substring(0, bdIdx).trim() : cleanContent;
          let yAnswerPart = bdIdx >= 0 ? cleanContent.substring(bdIdx).trim() : '';

          let yDapAn = yAnswerPart.replace(/^\s*(?:\*\*|__)?(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án(?:\s+ý\s+[a-c])?|Hướng dẫn giải|Hướng dẫn chấm)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();

          yNoiDung = stripMeta(yNoiDung);
          const yDiem = calcDiem(yDapAn);
          totalDiem += parseFloat(yDiem) || 0;

          result[`y${L}`] = yNoiDung;
          result[`dapAn${L}`] = yDapAn;
          result[`diem${L}`] = yDiem;
        });

        result.diem = totalDiem > 0 ? (Math.round(totalDiem * 100) / 100).toString() : '';
        result.giaiThich = giaiThich;
        if (result.yA) questions.push(result);

      } else {
        // Single-ý: logic cũ, chỉ bổ sung stripMeta
        const boundaryIndex = p.search(answerBdRx);
        let noiDung = boundaryIndex >= 0 ? p.substring(0, boundaryIndex).trim() : p.trim();
        let answerPart = boundaryIndex >= 0 ? p.substring(boundaryIndex).trim() : '';

        noiDung = stripMeta(noiDung);

        let dapAn = answerPart.replace(/^\s*(?:\*\*|__)?(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án(?:\s+ý\s+[a-c])?|Hướng dẫn giải|Hướng dẫn chấm)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();
        const gtIdx2 = dapAn.search(/(?:^|\n)\s*(?:\*\*|__)?Giải thích\s*[:.\)]/i);
        if (gtIdx2 >= 0) dapAn = dapAn.substring(0, gtIdx2).trim();
        const diem = calcDiem(dapAn);
        const gtMatch2 = answerPart.match(giaiThichRx) || p.match(giaiThichRx);
        const giaiThich = gtMatch2 ? gtMatch2[1].trim() : '';

        if (noiDung) questions.push({ loaiCauHoi: 4, soCau, noiDung, dapAn: dapAn || answerPart, diem, giaiThich, kienThuc: kienThucMap[soCau] || '', maNangLuc });
      }
    } catch (e) { console.error('Lỗi parse Loại 4:', e); }
  });
  return questions;
}

// Helper: map draft TL question sang cấu trúc slot Step4
// - Multi-ý (có yB): dùng yA/yB/yC, dapAnA/B/C, diemA/B/C
// - Single-ý: đưa noiDung → yA, dapAn → dapAnA
function mapTL4Draft(q) {
  const isMulti = Boolean(q.yB);
  return {
    loaiCauHoi: 4,
    noiDung: q.noiDung || '',
    yA: isMulti ? (q.yA || '') : (q.noiDung || q.yA || ''),
    dapAnA: isMulti ? (q.dapAnA || '') : (q.dapAn || q.dapAnA || ''),
    diemA: isMulti ? (q.diemA || '') : (q.diem || q.diemA || ''),
    yB: q.yB || '',
    dapAnB: q.dapAnB || '',
    diemB: q.diemB || '',
    yC: q.yC || '',
    dapAnC: q.dapAnC || '',
    diemC: q.diemC || '',
    giaiThich: q.giaiThich || '',
    kienThuc: q.kienThuc || '',
  };
}

const LOAI_LABELS = { 1: 'Trắc nghiệm', 2: 'Trắc nghiệm Đúng/Sai', 3: 'Trả lời ngắn', 4: 'Tự luận' };
const LOAI_COLORS = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-amber-100 text-amber-800 border-amber-300',
  3: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  4: 'bg-purple-100 text-purple-800 border-purple-300',
};

function cleanYContent(text) {
  if (!text) return text;
  const inlineRx = /\s*\*\*\s*(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án|Trả lời|Hướng dẫn giải|Hướng dẫn chấm|Hướng dẫn|Giải thích)/i;
  const newlineRx = /\n\s*(?:\*\*|__)?(?:Đáp án đúng và biểu điểm|Đáp án đúng|Đáp án|Trả lời|Hướng dẫn giải|Hướng dẫn chấm|Giải thích)\s*[:.)\]]?\s*(?:\*\*|__)?/i;
  const idx1 = text.search(inlineRx);
  const idx2 = text.search(newlineRx);
  let cutIdx = -1;
  if (idx1 >= 0 && idx2 >= 0) cutIdx = Math.min(idx1, idx2);
  else if (idx1 >= 0) cutIdx = idx1;
  else if (idx2 >= 0) cutIdx = idx2;
  return cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text;
}

// =============================================================================
// FALLBACK: TỰ ĐỘNG PHÁT HIỆN HÀM SỐ → TẠO METADATA ĐỒ THỊ CHO MATPLOTLIB
// =============================================================================

/** Chuyển biểu thức toán (text/LaTeX) → cú pháp Python/numpy. */
function convertMathToPython(mathExpr) {
  if (!mathExpr) return null;
  let e = mathExpr.trim();
  // Bỏ LaTeX format cơ bản
  e = e.replace(/\\left/g, '').replace(/\\right/g, '');
  e = e.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\,/g, ' ');
  // Phân số: \frac{a}{b} → (a)/(b)
  for (let i = 0; i < 3; i++) e = e.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  // Lũy thừa: x^{n} → x**(n), x^n → x**n
  e = e.replace(/\^\{([^}]+)\}/g, '**($1)');
  e = e.replace(/\^(\d+)/g, '**$1');
  // Unicode superscripts
  e = e.replace(/²/g, '**2').replace(/³/g, '**3').replace(/⁴/g, '**4');
  // Căn bậc hai
  e = e.replace(/\\sqrt\{([^}]+)\}/g, 'np.sqrt($1)');
  e = e.replace(/√\(([^)]+)\)/g, 'np.sqrt($1)');
  e = e.replace(/√(\w)/g, 'np.sqrt($1)');
  // Lượng giác
  e = e.replace(/\\sin/g, 'np.sin').replace(/\\cos/g, 'np.cos').replace(/\\tan/g, 'np.tan');
  e = e.replace(/\bsin\b(?!\w)/g, 'np.sin').replace(/\bcos\b(?!\w)/g, 'np.cos').replace(/\btan\b(?!\w)/g, 'np.tan');
  // Logarit
  e = e.replace(/\\ln/g, 'np.log').replace(/\\log/g, 'np.log10').replace(/\bln\b(?!\w)/g, 'np.log');
  // Hàm mũ: e^x → np.exp(x)
  e = e.replace(/e\*\*\(([^)]+)\)/g, 'np.exp($1)').replace(/e\*\*([x\d])/g, 'np.exp($1)');
  // Trị tuyệt đối
  e = e.replace(/\|([^|]+)\|/g, 'np.abs($1)');
  // Pi
  e = e.replace(/\\pi/g, 'np.pi').replace(/π/g, 'np.pi');
  // Nhân ẩn: 2x → 2*x, )x → )*x, )( → )*(
  e = e.replace(/(\d)([x(])/g, '$1*$2');
  e = e.replace(/([x)])([x(])/g, '$1*$2');
  e = e.replace(/(\))(\d)/g, '$1*$2');
  e = e.replace(/\s+/g, ' ').trim();
  if (!e.includes('x')) return null;
  return e;
}

/** Xác định khoảng x phù hợp dựa trên loại hàm. */
function guessXRange(py) {
  if (/np\.sin|np\.cos|np\.tan/.test(py)) return [-7, 7];
  if (/np\.log/.test(py)) return [0.1, 10];
  if (/np\.exp/.test(py)) return [-3, 4];
  if (/x\*\*4|x\*\*\(4\)/.test(py)) return [-3, 3];
  if (/x\*\*3|x\*\*\(3\)/.test(py)) return [-4, 4];
  return [-5, 5];
}

/**
 * Tự động phát hiện hàm số toán học trong câu hỏi → tạo metadata cho Matplotlib.
 * Hỗ trợ: Toán (hàm số, hình học Oxy), Vật lý (v-t, s-t, U-I).
 * Chỉ kích hoạt khi câu hỏi có keyword liên quan.
 */
export function autoDetectGraphMetadata(question) {
  const fields = [question.noiDung, question.yA, question.yB, question.yC, question.yD];
  const allText = fields.filter(Boolean).join('\n');
  if (!allText) return null;

  // ── 1. TOÁN: Đồ thị hàm số ──
  if (/(?:đồ thị|đường cong|bảng biến thiên|cực trị|cực đại|cực tiểu|tiệm cận|hàm số|khảo sát|biểu diễn)/i.test(allText)) {
    let funcExpr = null, displayTitle = null;
    const latexM = allText.match(/\$\s*y\s*=\s*([^$]+?)\s*\$/i);
    if (latexM) { funcExpr = latexM[1].trim(); displayTitle = `y = ${funcExpr}`; }
    if (!funcExpr) {
      const plainM = allText.match(/(?:hàm\s+số\s+)?y\s*=\s*([^\n,;.]+)/i);
      if (plainM) { funcExpr = plainM[1].trim(); displayTitle = `y = ${funcExpr}`; }
    }
    if (!funcExpr) {
      const fxM = allText.match(/f\s*\(\s*x\s*\)\s*=\s*([^\n,;.]+)/i);
      if (fxM) { funcExpr = fxM[1].trim(); displayTitle = `f(x) = ${funcExpr}`; }
    }
    if (funcExpr) {
      const pythonExpr = convertMathToPython(funcExpr);
      if (pythonExpr) return { loai: 'do_thi_ham_so', hamSo: pythonExpr, xRange: guessXRange(pythonExpr), tieuDe: displayTitle };
    }
  }

  // ── 2. VẬT LÝ: Đồ thị v-t, s-t, U-I ──
  if (/(?:đồ thị\s*(?:v[\s-]*t|s[\s-]*t|U[\s-]*I|vận tốc|quãng đường|hiệu điện thế)|chuyển động\s*(?:thẳng|đều|biến đổi)|gia tốc)/i.test(allText)) {
    // Detect xem là loại đồ thị nào
    let nhanX = 't (s)', nhanY = 'v (m/s)', tieuDe = 'Đồ thị vận tốc - thời gian';
    if (/s[\s-]*t|quãng đường/i.test(allText)) { nhanY = 's (m)'; tieuDe = 'Đồ thị quãng đường - thời gian'; }
    if (/U[\s-]*I|hiệu điện thế/i.test(allText)) { nhanX = 'I (A)'; nhanY = 'U (V)'; tieuDe = 'Đồ thị U-I'; }
    // Trả về metadata cơ bản — AI nên ghi chi tiết hơn qua prompt
    return { loai: 'do_thi_vat_ly', tieuDe, nhanX, nhanY, doanThang: [], diemDacBiet: [] };
  }

  return null;
}

/** Trích xuất metadata "Hình ảnh:" JSON từ text (thường nằm trong giaiThich). */
export function extractHinhAnhFromText(text) {
  if (!text) return null;
  // Tìm vị trí dòng "Hình ảnh:" trong text
  const headerMatch = text.match(/(?:^|\n)\s*(?:\*\*)?Hình ảnh(?:\*\*)?[:\s]*/im);
  if (!headerMatch) return null;
  const headerStart = text.indexOf(headerMatch[0]);
  const jsonStart = headerStart + headerMatch[0].length;
  // Tìm ký tự '{' đầu tiên sau header
  const braceStart = text.indexOf('{', jsonStart);
  if (braceStart < 0) return null;
  // Đếm ngoặc {} để tìm vị trí kết thúc JSON (hỗ trợ nested objects)
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
  }
  if (braceEnd < 0) return null;
  let jsonStr = text.substring(braceStart, braceEnd + 1);
  // Sửa lỗi dư dấu phẩy (trailing comma) thường gặp từ AI
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.loai) {
      const fullMatch = text.substring(headerStart, braceEnd + 1);
      return { hinhAnh: parsed, cleanedText: text.replace(fullMatch, '').trim() };
    }
  } catch (e) {
    console.warn("JSON parse failed for hinhAnh:", e, "Original String:", jsonStr);
  }
  return null;
}

// =============================================================================
// COMPONENT PHỤ: GraphPreview — Hiển thị đồ thị (Client-side Canvas)
// =============================================================================

function GraphPreview({ hinhAnh }) {
  if (!hinhAnh || !hinhAnh.loai) return null;
  return <ClientGraph hinhAnh={hinhAnh} maxHeight={300} />;
}

// =============================================================================
// COMPONENT PHỤ: DraftQuestionCard
// =============================================================================
function DraftQuestionCard({ question, index, availableSlots, onPush, isSelected, onToggleSelect, onDelete }) {
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (question._fromSimilar && question._originalSlotKey) {
      const exists = availableSlots.some(s => s.key === question._originalSlotKey);
      if (exists) return question._originalSlotKey;
    }
    
    if (question.maNangLuc) {
      // Ưu tiên slot cùng loại, có chứa mã năng lực và chưa điền
      const exactMatchEmpty = availableSlots.find(s => s.loai === question.loaiCauHoi && !s.daDien && s.inds && s.inds.includes(question.maNangLuc));
      if (exactMatchEmpty) return exactMatchEmpty.key;
      
      // Nếu hết ô trống, tìm ô đã điền nhưng khớp mã năng lực
      const exactMatchFilled = availableSlots.find(s => s.loai === question.loaiCauHoi && s.inds && s.inds.includes(question.maNangLuc));
      if (exactMatchFilled) return exactMatchFilled.key;
    }

    return '';
  });

  const originalSlotLabel = question._fromSimilar && question._originalSlotKey 
    ? availableSlots.find(s => s.key === question._originalSlotKey)?.label?.replace(/ ✅$/, '') 
    : null;

  const handlePush = () => {
    if (!selectedSlot) {
      alert('Vui lòng chọn ô đích trước khi đẩy!');
      return;
    }

    let mappedData;
    if (question.loaiCauHoi === 1) {
      mappedData = {
        loaiCauHoi: 1, noiDung: question.noiDung,
        dapAnA: question.dapAnA, dapAnB: question.dapAnB, dapAnC: question.dapAnC, dapAnD: question.dapAnD,
        dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
      };
    } else if (question.loaiCauHoi === 3) {
      mappedData = {
        loaiCauHoi: 3, noiDung: question.noiDung, dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
      };
    } else if (question.loaiCauHoi === 4) {
      mappedData = mapTL4Draft(question);
    } else {
      mappedData = {
        loaiCauHoi: 2, noiDung: question.noiDung,
        yA: cleanYContent(question.yA), yB: cleanYContent(question.yB), yC: cleanYContent(question.yC), yD: cleanYContent(question.yD),
        dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
      };
    }
    // Bảo toàn metadata hình ảnh khi đẩy lên Khung Đề
    if (question.hinhAnh) {
      mappedData.hinhAnh = question.hinhAnh;
    }

    onPush(selectedSlot, mappedData, question);
  };

  const isMultiY = question.loaiCauHoi === 2; // Chỉ Đúng/Sai là đa ý a,b,c,d

  return (
    <div className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative ${LOAI_COLORS[question.loaiCauHoi] || 'bg-gray-100 text-gray-800 border-gray-300'} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={() => onDelete(index)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white transition-colors shadow-sm"
          title="Xóa câu này khỏi danh sách nháp"
        >
          <Trash2 size={14} />
        </button>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(index)}
            className="w-5 h-5 rounded border-2 border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-semibold text-slate-600">Chọn</span>
        </label>
      </div>

      <div className="flex items-center gap-2 mb-2 pr-16">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 border shadow-sm">
          Loại {question.loaiCauHoi}
        </span>
        <span className="text-xs font-semibold opacity-80">
          {LOAI_LABELS[question.loaiCauHoi] || 'Không rõ'}
        </span>
        <span className="ml-auto text-xs font-bold opacity-50">Nháp #{index + 1}</span>
      </div>

      {originalSlotLabel && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 shadow-sm">
            <span>🔄</span> Đề thay thế cho {originalSlotLabel}
          </span>
        </div>
      )}

      {(() => {
        const rawText = question.loaiCauHoi === 1 || question.loaiCauHoi === 3 ? (question.noiDung || '') : (question.loaiCauHoi === 2 ? (question.noiDung || question.yA || '') : (question.yA || ''));
        const metaMatch = rawText.match(/\(([^)]*Chủ đề:[^)]*)\)/i);
        if (metaMatch) {
          const metaStr = metaMatch[1];
          const chuDeMatch = metaStr.match(/Chủ đề:\s*([^,)]+)/i);
          const mucDoMatch = metaStr.match(/Mức độ:\s*([^,)]+)/i);
          const maNlMatch = metaStr.match(/Mã năng lực:\s*([^,)]+)/i);
          return (
            <div className="mb-2 px-3 py-1.5 bg-white/60 rounded-lg border border-current/10">
              <p className="text-xs font-bold text-slate-800">
                📌 {chuDeMatch ? chuDeMatch[1].trim() : 'Chưa rõ'}
                {mucDoMatch && <span className="ml-2 font-semibold text-indigo-600">({mucDoMatch[1].trim()})</span>}
                {maNlMatch && <span className="ml-2 font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">[{maNlMatch[1].trim()}]</span>}
              </p>
            </div>
          );
        }
        return null;
      })()}

      {(() => {
        const cleanNoidung = (text) => text ? text.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '') : '';
        const getPrefix = (loai, idx) => {
           if (!examConfig.isCauTruc4213) return `Câu ${idx + 1}:`;
           if (loai === 1) return `I.${idx + 1}.`;
           if (loai === 2) return `II.${idx + 1}.`;
           if (loai === 3) return `III.${idx + 1}.`;
           if (loai === 4) return `TL.${idx + 1}.`;
           return `Câu ${idx + 1}:`;
        };
        return (
          <>
            {question.loaiCauHoi === 1 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {getPrefix(question.loaiCauHoi, index)} <MathText content={cleanNoidung(question.noiDung)} />
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                  <div><strong>A.</strong> <MathText content={question.dapAnA} /></div>
                  <div><strong>B.</strong> <MathText content={question.dapAnB} /></div>
                  <div><strong>C.</strong> <MathText content={question.dapAnC} /></div>
                  <div><strong>D.</strong> <MathText content={question.dapAnD} /></div>
                </div>
              </>
            )}

            {/* NÂNG CẤP: HIỂN THỊ LOẠI 3 TRẢ LỜI NGẮN NHƯ 1 CÂU HỎI ĐỘC LẬP */}
            {question.loaiCauHoi === 3 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {getPrefix(question.loaiCauHoi, index)} <MathText content={cleanNoidung(question.noiDung)} />
                </p>
              </>
            )}

            {isMultiY && question.loaiCauHoi !== 4 && (
              <>
                {question.noiDung && (
                  <p className="font-semibold mb-2 text-slate-900 whitespace-pre-wrap">
                    {getPrefix(question.loaiCauHoi, index)} <MathText content={question.noiDung} />
                  </p>
                )}
                {!question.noiDung && <p className="font-semibold mb-2 text-slate-900">{getPrefix(question.loaiCauHoi, index)}</p>}
                <div className="space-y-1.5 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                  <div><strong>a)</strong> <MathText content={cleanNoidung(question.yA)} /></div>
                  <div><strong>b)</strong> <MathText content={question.yB} /></div>
                  <div><strong>c)</strong> <MathText content={question.yC} /></div>
                  {question.yD && <div><strong>d)</strong> <MathText content={question.yD} /></div>}
                </div>
              </>
            )}

            {question.loaiCauHoi === 4 && (
              <>
                {question.yB ? (
                  /* Multi-ý: hiển thị từng ý riêng */
                  <>
                    <p className="font-semibold mb-2 text-slate-900">
                      {getPrefix(question.loaiCauHoi, index)} <span className="text-xs font-normal text-slate-500">(Tự luận nhiều ý)</span>
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">📐 Hình học</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">∑ Đại số</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">📌 Tổng điểm: {question.diem} điểm</div>}
                    {question.noiDung && (
                      <div className="text-sm text-slate-800 mb-3 bg-purple-50 border border-purple-200 p-2 rounded whitespace-pre-wrap">
                        <span className="text-xs font-bold text-purple-700 block mb-1">📋 Đề bài chung:</span>
                        <MathText content={question.noiDung} />
                      </div>
                    )}
                    {['A', 'B', 'C'].filter(L => question[`y${L}`]).map(L => (
                      <div key={L} className="mb-2 border border-purple-200 rounded-lg p-3 bg-white/50">
                        <div className="font-semibold text-slate-900 mb-1 whitespace-pre-wrap text-sm">
                          <span className="text-purple-700 font-bold">{L.toLowerCase()})</span>{' '}
                          <MathText content={question[`y${L}`]} />
                        </div>
                        {question[`diem${L}`] && (
                          <span className="text-xs text-red-600 font-bold">📌 {question[`diem${L}`]} điểm</span>
                        )}
                        {question[`dapAn${L}`] && (
                          <div className="mt-1 space-y-0.5 text-xs text-slate-800 bg-white/40 p-2 rounded">
                            <div className="font-bold text-green-700 mb-0.5">Đáp án ý {L.toLowerCase()}:</div>
                            {question[`dapAn${L}`].split('\n').filter(l => l.trim()).map((line, li) => (
                              <div key={li} className="ml-2"><MathText content={line} /></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  /* Single-ý: giữ nguyên như cũ */
                  <>
                    <p className="font-semibold mb-2 leading-relaxed text-slate-900 whitespace-pre-wrap">
                      {getPrefix(question.loaiCauHoi, index)} <MathText content={cleanNoidung(question.noiDung)} />
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">📐 Hình học</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">∑ Đại số</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">📌 Điểm: {question.diem} điểm</div>}
                    {question.dapAn && (
                      <div className="space-y-1 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                        <div className="font-bold text-green-700 mb-1">Hướng dẫn chấm:</div>
                        {question.dapAn.split('\n').filter(l => l.trim()).map((line, li) => (
                          <div key={li} className="ml-2"><MathText content={line} /></div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {question.loaiCauHoi !== 4 && (
              <div className="text-sm mb-2 bg-white/60 p-2 rounded">
                <span className="font-bold text-slate-800">Đáp án đúng:</span>{' '}
                <span className="font-mono text-red-600 font-bold whitespace-pre-wrap"><MathText content={question.dapAnDung} /></span>
              </div>
            )}

            <p className="text-sm opacity-90 mb-4 bg-white/40 p-2 rounded whitespace-pre-wrap">
              <strong className="text-slate-800">Giải thích:</strong> <MathText content={question.giaiThich} />
            </p>

            {/* Hiển thị đồ thị Matplotlib nếu câu hỏi có hinhAnh */}
            <GraphPreview hinhAnh={question.hinhAnh} />
          </>
        );
      })()}

      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-current/20">
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 cursor-pointer"
        >
          <option value="">-- Chọn ô đích trong Khung Đề --</option>
          {availableSlots.map((slot) => (
            <option key={slot.key} value={slot.key}>
              {slot.label}
            </option>
          ))}
        </select>

        <button
          onClick={handlePush}
          disabled={!selectedSlot}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm shadow transition-all ${selectedSlot
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
        >
          <ArrowUpCircle size={16} />
          Đẩy lên Khung Đề
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER: Nhóm câu hỏi Tự luận thành các câu lớn (mỗi câu 2-3 ý)
// =============================================================================
const chunkTL = (items) => {
  const total = items.length;
  if (total === 0) return [];
  if (total === 1) return [items];
  if (total === 2) return [items];
  if (total === 3) return [items];
  if (total === 4) return [items.slice(0, 2), items.slice(2, 4)];
  if (total === 5) return [items.slice(0, 3), items.slice(3, 5)];
  
  const chunks = [];
  let i = 0;
  let remain = total;
  while (remain > 0) {
    if (remain === 4) {
      chunks.push(items.slice(i, i + 2));
      chunks.push(items.slice(i + 2, i + 4));
      break;
    } else if (remain === 2) {
      chunks.push(items.slice(i, i + 2));
      break;
    } else {
      const take = Math.min(3, remain);
      chunks.push(items.slice(i, i + take));
      i += take;
      remain -= take;
    }
  }
  return chunks;
};

// =============================================================================
// COMPONENT CHÍNH: Step5_AIGenerator
// =============================================================================
export default function Step5_AIGenerator() {
  const { matrix, config, examConfig, tuLuanConfig, examHeader, draftQuestions, setDraftQuestions, examSlots, pushToExamSlot, clearExamSlot } = useExamStore();
  const [examContent, setExamContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [parseError, setParseError] = useState('');
  const [selectedDrafts, setSelectedDrafts] = useState([]);

  const hasManualTLConfig = tuLuanConfig?.enabled && tuLuanConfig?.questions?.length > 0 && tuLuanConfig.questions.some(q => q.subItems?.length > 0);

  // =========================================================================
  // LOGIC: TÙY CHỈNH CẤU TRÚC TỰ LUẬN TẠI BƯỚC 5
  // =========================================================================
  const defaultTuLuanGroups = useMemo(() => {
    const tlItems = [];
    matrix.forEach((topic) => {
      const tenChuDe = topic.tenChuDe || 'Chủ đề chưa đặt tên';
      (topic.donViKienThuc || []).forEach(dv => {
         const tenBai = dv.noiDung || 'Chưa rõ bài';
         ['biet', 'hieu', 'vanDung'].forEach(level => {
             const count = Number(dv.tuLuan?.[level]) || 0;
             const subs = (dv.tuLuan?.subItems || []).filter(s => s.level === level);
             for(let i=0; i<count; i++) {
                 const subItem = subs[i];
                 const diemVal = subItem ? (Number(subItem.diem) || 0.5) : 0.5;
                 tlItems.push({
                   id: crypto.randomUUID(),
                   levelName: level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : 'Vận dụng',
                   tenChuDe,
                   tenBai,
                   levelKey: level,
                   diem: diemVal
                 });
             }
         });
      });
    });

    if (tlItems.length === 0) return [];

    const byChuDe = {};
    tlItems.forEach(item => {
      if (!byChuDe[item.tenChuDe]) byChuDe[item.tenChuDe] = [];
      byChuDe[item.tenChuDe].push(item);
    });

    const groups = [];
    Object.keys(byChuDe).forEach(chuDe => {
      const itemsInChuDe = byChuDe[chuDe];
      const chunks = chunkTL(itemsInChuDe);
      chunks.forEach(chunk => {
        groups.push({
          id: crypto.randomUUID(),
          kieuY: chunk.length > 1 ? 'chung' : 'doc_lap',
          chuDe: chuDe,
          items: chunk
        });
      });
    });

    return groups;
  }, [matrix]);

  const [localTuLuanGroups, setLocalTuLuanGroups] = useState([]);
  
  React.useEffect(() => {
    setLocalTuLuanGroups(defaultTuLuanGroups);
  }, [defaultTuLuanGroups]);

  const updateLocalGroupKieuY = (groupId, newKieu) => {
    setLocalTuLuanGroups(prev => prev.map(g => g.id === groupId ? { ...g, kieuY: newKieu } : g));
  };

  const generatedPrompt = useMemo(() => {
    const monHocName = examHeader?.monHoc || '........................';
    const gradeName = examHeader?.grade || '........................';

    let prompt = `Bạn là một chuyên gia ra đề thi xuất sắc. Dựa vào TÀI LIỆU SÁCH GIÁO KHOA/BÀI GIẢNG tôi đính kèm, hãy biên soạn một ĐỀ KIỂM TRA ĐÁNH GIÁ NĂNG LỰC môn ${monHocName} lớp ${gradeName} BÁM SÁT MA TRẬN BẢN ĐẶC TẢ YÊU CẦU CẦN ĐẠT VÀ KHUNG ĐỀ KIỂM TRA.\n`;

    prompt += `\n⚠️ QUY TẮC TRÌNH BÀY CÔNG THỨC TOÁN/LÝ/HÓA (BẮT BUỘC):\n`;
    prompt += `- CÔNG THỨC TOÁN/HÓA: TUYỆT ĐỐI KHÔNG dùng định dạng LaTeX ($...$) cho các mũi tên phản ứng hóa học (->, =>, <=>) và kí hiệu nhiệt độ (độ C, ^oC). Bắt buộc viết chúng dưới dạng text thường.\n`;
    prompt += `- Với công thức Hóa học, Vật lý đơn giản: SỬ DỤNG ký tự UNICODE (Ví dụ: H₂SO₄, Fe²⁺, α, Δt). Không dùng mã code cho loại này.\n`;
    prompt += `- CHỈ KHI có công thức Toán học phức tạp (phân số, căn thức, hệ phương trình, tích phân...): Mới sử dụng mã LaTeX và BẮT BUỘC bọc trong cặp dấu $...$ (ví dụ: $\\frac{1}{2}$) hoặc $$...$$ cho công thức đứng 1 dòng.\n\n`;

    prompt += `🖼️🖼️🖼️ YÊU CẦU HÌNH ẢNH — BẮT BUỘC (ĐỌC KỸ TRƯỚC KHI LÀM):\\n`;
    prompt += `Trong đề thi này, BẠN PHẢI tạo TỐI THIỂU 1-2 câu hỏi có dòng "Hình ảnh:" kèm JSON metadata.\\n`;
    prompt += `Hệ thống sẽ TỰ ĐỘNG vẽ hình bằng Python Matplotlib từ JSON bạn cung cấp.\\n`;
    prompt += `📍 Cách ghi: Ngay SAU dòng "Giải thích:" của câu hỏi đó, thêm 1 dòng mới bắt đầu bằng "Hình ảnh:" rồi ghi JSON.\\n`;
    prompt += `📍 Ví dụ biểu đồ cột: Hình ảnh: {"loai":"bieu_do_cot","tieuDe":"Dân số ĐNÁ","nhanX":"Quốc gia","nhanY":"Triệu người","nhan":["VN","Thái Lan","Indonesia"],"giaTri":[100,72,275]}\\n`;
    prompt += `📍 Ví dụ đồ thị hàm số: Hình ảnh: {"loai":"do_thi_ham_so","hamSo":"x**2 - 4*x + 3","xRange":[-2,6],"tieuDe":"y = x² - 4x + 3"}\\n`;
    prompt += `📍 Ví dụ biểu đồ tròn: Hình ảnh: {"loai":"bieu_do_tron","tieuDe":"Cơ cấu kinh tế","nhan":["Nông nghiệp","Công nghiệp","Dịch vụ"],"giaTri":[12,38,50]}\\n`;
    prompt += `⚠️ NẾU BẠN KHÔNG THÊM ÍT NHẤT 1 CÂU CÓ "Hình ảnh:", ĐỀ THI SẼ BỊ TRẢ LẠI.\\n\\n`;

    prompt += `⚠️ YÊU CẦU TỐI QUAN TRỌNG VỀ ĐỊNH DẠNG (FORMAT):
Bạn BẮT BUỘC phải trình bày từng câu hỏi theo đúng KHUÔN MẪU dưới đây để hệ thống phần mềm của tôi đọc được. 
Đặc biệt lưu ý: Phải ghi rõ (Mức độ: ..., Chủ đề: ..., Mã năng lực: ...) ở trong mỗi ý nhỏ. Trong đó "Mã năng lực" là mã cụ thể tôi sẽ cung cấp cho từng câu ở phần Ma trận bên dưới (ví dụ: HH1.1, TD1.2, ...).

=== KHUÔN MẪU TỪNG LOẠI CÂU HỎI ===

[LOẠI 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN] (Mỗi câu đúng được ${examConfig.diemMoiCauP1} điểm)
Câu [Số] (Mức độ: ..., Chủ đề: ..., Mã năng lực: ...): [Nội dung câu hỏi]
A. [Lựa chọn A]
B. [Lựa chọn B]
C. [Lựa chọn C]
D. [Lựa chọn D]
Đáp án đúng: [Chỉ ghi chữ cái A, B, C hoặc D]
Giải thích: [Giải thích ngắn gọn]

[LOẠI 2: TRẮC NGHIỆM ĐÚNG/SAI — CHÙM CÂU HỎI] (Mỗi ý đúng được ${examConfig.diemMoiYP2} điểm)
⚠️ QUAN TRỌNG: Mỗi câu Đúng/Sai BẮT BUỘC có 1 ĐỀ BÀI CHUNG ở đầu. Sau đó phát triển 4 ý a,b,c,d.
⚠️ YÊU CẦU PHÂN MỨC ĐỘ 4 Ý: Ý a) mức Nhận biết, ý b) mức Thông hiểu, ý c) mức Vận dụng, ý d) mức Vận dụng cao.
${config.groupTfByTopic ? '⚠️ ĐẶC BIỆT: Chế độ "Gom nhóm theo Chủ đề" đang bật. 4 mệnh đề a, b, c, d của mỗi câu Đúng/Sai nên lấy kiến thức từ CÁC BÀI HỌC KHÁC NHAU trong cùng chủ đề, tạo thành câu hỏi kiểm tra kiến thức tổng hợp của cả chủ đề.\\n' : ''}Câu [Số] (Chủ đề: ...): [Nội dung đề bài chung / Tình huống]
a) (Mức độ: Nhận biết, Mã năng lực: ...) [Mệnh đề a]
b) (Mức độ: Thông hiểu, Mã năng lực: ...) [Mệnh đề b]
c) (Mức độ: Vận dụng, Mã năng lực: ...) [Mệnh đề c]
d) (Mức độ: Vận dụng cao, Mã năng lực: ...) [Mệnh đề d]
Đáp án đúng: a-Đ, b-S, c-Đ, d-S
Giải thích: [Giải thích ngắn gọn vì sao đúng/sai]
`;
    if (config.hasTraLoiNgan) {
      prompt += `[LOẠI 3: TRẢ LỜI NGẮN] (Mỗi câu đúng được ${examConfig.diemMoiYP3} điểm)
⚠️ QUY TẮC THÉP: BẮT BUỘC phải đặt câu hỏi sao cho ĐÁP ÁN CUỐI CÙNG CHỈ LÀ MỘT CON SỐ CỤ THỂ (ví dụ: 15, 0.5, 100...). Tuyệt đối không hỏi lý thuyết yêu cầu trả lời bằng chữ dài dòng. KHÔNG gom thành các ý a, b, c, d. Mỗi câu trả lời ngắn là một Câu hỏi độc lập.
⚠️ GIỚI HẠN ĐÁP ÁN: Con số đáp án TỐI ĐA 4 CHỮ SỐ (bất kể có dấu phẩy/chấm thập phân hay không). Ví dụ hợp lệ: 5, 12, 150, 1500, 0.25, 12.5. Ví dụ KHÔNG hợp lệ: 12345, 100000.
⚠️ NGOẠI LỆ môn Xã hội (Sử, Địa, GDCD, Văn, Tiếng Anh): Nếu câu hỏi không thể định lượng bằng số, đáp án CÓ THỂ là 1 từ/cụm từ ngắn (tối đa 5 từ), ví dụ: "1945", "Hà Nội", "Nguyễn Du".
Câu [Số] (Mức độ: ..., Chủ đề: ..., Mã năng lực: ...): [Nội dung câu hỏi ngắn đòi hỏi tính toán hoặc đếm số lượng]
Đáp án đúng: [CHỈ GHI DUY NHẤT 1 CON SỐ, TỐI ĐA 4 CHỮ SỐ]
Giải thích: [Cách giải/Lý do ngắn gọn]\n\n`;
    }

    const tongDiemTuLuanThucTe = (() => {
      let total = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          total += Number(dv.tuLuan?.diemBiet) || 0;
          total += Number(dv.tuLuan?.diemHieu) || 0;
          total += Number(dv.tuLuan?.diemVanDung) || 0;
        });
      });
      return Math.round(total * 100) / 100;
    })();

    if (config.hasTuLuan) {
      const _ktField = (hasManualTLConfig && tuLuanConfig?.questions?.some(q => q.kienThuc === 'hinh_hoc' || q.kienThuc === 'dai_so')) ? ', Kiến thức: [Hình học/Đại số]' : '';
      prompt += `[LOẠI 4: TỰ LUẬN] (Tổng điểm toàn phần tự luận: ${tongDiemTuLuanThucTe} điểm)
⚠️ QUY TẮC CẤU TRÚC CÂU TỰ LUẬN:
- Câu ĐƠN Ý (1 ý): Câu hỏi độc lập, 1 yêu cầu duy nhất, không có ý phụ a, b, c.
- Câu 2 Ý (có ý a, b): Hai ý có thể là (1) cùng 1 đề bài chung rồi chia ý a, ý b liên quan nhau; HOẶC (2) 2 ý a, b hoàn toàn độc lập không liên quan đến nhau.
- Câu 3 Ý (có ý a, b, c): Thường có 1 đề bài chung (ví dụ bài toán hình học) rồi chia thành 3 yêu cầu a, b, c xoay quanh đề bài chung đó.
- Tối đa 3 ý (a, b, c) mỗi câu. Số điểm mỗi ý phải khớp chính xác với biểu điểm được giao.
- Số câu và số ý mỗi câu được quy định CỤ THỂ ở phần Ma trận bên dưới — TUÂN THỦ 100%.

Khuôn mẫu câu ĐƠN Ý:
Câu [Số] (Mức độ: ..., Chủ đề: ..., Mã năng lực: ...${_ktField}): [Nội dung câu hỏi]
Đáp án đúng và biểu điểm:
+ [Nội dung bước giải] || [Điểm]
Giải thích: [Ngắn gọn]

Khuôn mẫu câu 2 Ý:
Câu [Số] (Chủ đề: ...${_ktField}): [Đề bài chung — hoặc bỏ trống nếu 2 ý độc lập]
a) (Mức độ: ..., Mã năng lực: ...): [Nội dung ý a]
Đáp án ý a: [Hướng dẫn giải ý a] || [Điểm ý a]
b) (Mức độ: ..., Mã năng lực: ...): [Nội dung ý b]
Đáp án ý b: [Hướng dẫn giải ý b] || [Điểm ý b]
Giải thích: [Ngắn gọn]

Khuôn mẫu câu 3 Ý:
Câu [Số] (Chủ đề: ...${_ktField}): [Đề bài chung]
a) (Mức độ: ..., Mã năng lực: ...): [Nội dung ý a]
Đáp án ý a: [Hướng dẫn giải ý a] || [Điểm ý a]
b) (Mức độ: ..., Mã năng lực: ...): [Nội dung ý b]
Đáp án ý b: [Hướng dẫn giải ý b] || [Điểm ý b]
c) (Mức độ: ..., Mã năng lực: ...): [Nội dung ý c]
Đáp án ý c: [Hướng dẫn giải ý c] || [Điểm ý c]
Giải thích: [Ngắn gọn]

⚠️ PHÂN BỔ ĐIỂM: Tổng điểm các bước giải của mỗi câu phải khớp CHÍNH XÁC với số điểm được giao. KHÔNG ĐƯỢC vượt quá hoặc thiếu.\n\n`;
    }

    // === BẮT ĐẦU XÂY DỰNG KHUNG ĐỀ CHI TIẾT ===
    let khungDeText = `\n--- KHUNG ĐỀ KIỂM TRA CHI TIẾT (BẮT BUỘC RA CÂU HỎI THEO ĐÚNG THỨ TỰ NÀY) ---\n\n`;
    
    let qIndexP1 = 1;
    let qIndexP2 = 1;
    let qIndexP3 = 1;

    let p1Text = "";
    let p2Text = "";
    let p3Text = "";
    let p4Text = "";

    matrix.forEach((topic) => {
      const tenChuDe = topic.tenChuDe || 'Chủ đề chưa đặt tên';
      (topic.donViKienThuc || []).forEach(dv => {
        const tenBai = dv.noiDung || 'Chưa rõ bài';
        
        // P1: Nhiều lựa chọn
        ['biet', 'hieu', 'vanDung'].forEach(level => {
            const count = Number(dv.nhieuLuaChon?.[level]) || 0;
            for(let i=0; i<count; i++) {
                const levelName = level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : 'Vận dụng';
                p1Text += `- Câu ${qIndexP1}: Mức độ ${levelName}, Thuộc chủ đề: ${tenChuDe} (${tenBai})\n`;
                qIndexP1++;
            }
        });

        // P2: Đúng/Sai
        const countTF = Number(dv.dungSai?.biet) || 0;
        for(let i=0; i<countTF; i++) {
             p2Text += `- Câu ${qIndexP2}: Đề bài chung + 4 ý (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), Thuộc chủ đề: ${tenChuDe} (${tenBai})\n`;
             qIndexP2++;
        }

        // P3: Trả lời ngắn
        if (config.hasTraLoiNgan) {
            ['biet', 'hieu', 'vanDung'].forEach(level => {
                const count = Number(dv.traLoiNgan?.[level]) || 0;
                for(let i=0; i<count; i++) {
                    const levelName = level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : 'Vận dụng';
                    p3Text += `- Câu ${qIndexP3}: Mức độ ${levelName}, Thuộc chủ đề: ${tenChuDe} (${tenBai})\n`;
                    qIndexP3++;
                }
            });
        }
      });
    });

    if (qIndexP1 > 1) {
        khungDeText += `Phần I. Trắc nghiệm nhiều lựa chọn (${qIndexP1 - 1} câu)\n${p1Text}\n`;
    }
    if (qIndexP2 > 1) {
        khungDeText += `Phần II. Trắc nghiệm Đúng/Sai (${qIndexP2 - 1} câu, mỗi câu 4 ý)\n${p2Text}\n`;
    }
    if (config.hasTraLoiNgan && qIndexP3 > 1) {
        khungDeText += `Phần III. Trắc nghiệm trả lời ngắn (${qIndexP3 - 1} câu)\n${p3Text}\n`;
    }

    if (config.hasTuLuan) {
       let p4Count = 0;
       if (hasManualTLConfig) {
           tuLuanConfig.questions.forEach((q, i) => {
              const kienThuc = q.kienThuc === 'hinh_hoc' ? 'Hình học' : q.kienThuc === 'dai_so' ? 'Đại số' : 'Tổng hợp';
              const totalQDiem = q.subItems ? Math.round(q.subItems.reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100 : 0;
              p4Text += `- Câu ${i+1}: Dạng ${kienThuc}, Số ý: ${q.subItems?.length || 1} ý (tổng ${totalQDiem} điểm).\\n`;
              if (q.subItems && q.subItems.length > 1) {
                 q.subItems.forEach((sub, j) => {
                    p4Text += `   + Ý ${String.fromCharCode(97 + j)}: ${sub.diem} điểm\\n`;
                 });
              }
              p4Count++;
           });
       } else {
          localTuLuanGroups.forEach((group, index) => {
               if (group.items.length === 1) {
                   p4Text += `- Câu ${index + 1}: 1 ý (Mức độ: ${group.items[0].levelName}, ${group.items[0].diem} điểm, Chủ đề: ${group.items[0].tenChuDe} - ${group.items[0].tenBai})\\n`;
               } else {
                   const kieuDesc = group.kieuY === 'chung' ? "xoay quanh 1 đề bài chung" : "độc lập";
                   const totalGroupDiem = Math.round(group.items.reduce((s, it) => s + it.diem, 0) * 100) / 100;
                   p4Text += `- Câu ${index + 1}: Gồm ${group.items.length} ý ${kieuDesc} (tổng ${totalGroupDiem} điểm):\\n`;
                   group.items.forEach((item, j) => {
                       p4Text += `   + Ý ${String.fromCharCode(97 + j)}: Mức độ ${item.levelName}, ${item.diem} điểm, Chủ đề: ${item.tenChuDe} (${item.tenBai})\\n`;
                   });
               }
               p4Count++;
           });
       }
       if (p4Count > 0) {
           let phanName = (qIndexP1 <= 1 && qIndexP2 <= 1 && qIndexP3 <= 1) ? 'Phần I' : 
                         (config.hasTraLoiNgan ? 'Phần IV' : 'Phần III');
           khungDeText += `${phanName}. Tự luận (${p4Count} câu/ý lớn)\n${p4Text}\n`;
       }
    }

    prompt += khungDeText;
    prompt += `--- CHI TIẾT MA TRẬN ĐỀ THI VÀ YÊU CẦU CẦN ĐẠT (DÙNG ĐỂ THAM KHẢO LÀM RÕ CHO KHUNG ĐỀ Ở TRÊN) ---\n\n`;
    prompt += `\n🎯 TIÊU CHÍ CHẤT LƯỢNG CÂU HỎI (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI):\n`;
    prompt += `1. VAI TRÒ CỦA BẠN: Bạn là Chuyên gia ra đề thi của Bộ GD&ĐT, am hiểu sâu sắc Chương trình GDPT 2018. Câu hỏi phải đánh giá ĐÚNG NĂNG LỰC, tuyệt đối KHÔNG hỏi vẹt, KHÔNG hỏi định nghĩa học thuộc lòng, KHÔNG đánh đố ngớ ngẩn.\n`;
    prompt += `\n📌 QUY TẮC PHẦN TRẮC NGHIỆM (Nhiều lựa chọn & Đúng/Sai):\n`;
    prompt += `- 3 phương án nhiễu (sai) phải được thiết kế CỰC KỲ TINH VI dựa trên các "LỖI SAI PHỔ BIẾN" của học sinh. Tuyệt đối không cho đáp án nhiễu vô lý, dễ đoán.\n`;

    if (config.hasTuLuan) {
      prompt += `\n📌 QUY TẮC PHẦN TỰ LUẬN:\n`;
      prompt += `- Câu hỏi tự luận phải là bài toán/tình huống có lời văn, yêu cầu tư duy logic.\n`;
      if (!hasManualTLConfig) {
        prompt += `- Hãy biên soạn các câu hỏi tự luận tuân thủ đúng số lượng ý đã chỉ định trong khung đề ở trên cho từng câu (câu 1 ý thì viết thành 1 câu độc lập, câu nhiều ý thì chia thành các ý a, b, c... tương ứng). Đảm bảo tổng số câu hỏi tự luận lớn là ${localTuLuanGroups.length} câu.\n`;
      }
      prompt += `- Trong phần Hướng dẫn chấm (Đáp án), BẮT BUỘC phải chia nhỏ thành từng bước giải chi tiết và phân bổ điểm số rõ ràng (ví dụ: || 0.25, || 0.5) cho MỖI BƯỚC.\n`;
    }

    prompt += `\n🎓 ĐẶC THÙ TỪNG BỘ MÔN:\n`;
    prompt += `- MÔN TOÁN: 100% câu hỏi trắc nghiệm phải là bài tập TÍNH TOÁN, tìm x, tính diện tích, giải quyết vấn đề. KHÔNG hỏi lý thuyết suông (kiểu "Phân số là gì?"). Các đáp án nhiễu là kết quả của việc tính nhầm dấu, sai công thức.\n`;
    prompt += `- MÔN KHOA HỌC TỰ NHIÊN (Lý, Hóa, Sinh): Câu hỏi đi thẳng vào bản chất hiện tượng, sơ đồ thí nghiệm, phản ứng hóa học, hoặc bài tập thực tiễn đời sống.\n`;
    prompt += `- MÔN KHOA HỌC XÃ HỘI (Sử, Địa, GDCD): Sử/Địa ưu tiên nguyên nhân, hệ quả, phân tích số liệu/biểu đồ. Riêng GDCD/KTPL: 100% câu hỏi Vận dụng phải là TÌNH HUỐNG THỰC TẾ (ví dụ: nhân vật A, B vi phạm gì) để học sinh xử lý.\n`;
    prompt += `- MÔN NGỮ VĂN: Tập trung ĐỌC HIỂU (nhận diện tu từ, tác dụng nghệ thuật, phương thức biểu đạt). Tự luận hướng đến cảm thụ và nghị luận.\n`;
    prompt += `- MÔN TIẾNG ANH: Kiểm tra từ vựng trong ngữ cảnh (Context), chức năng giao tiếp. Đáp án nhiễu phải có cấu trúc tương đồng để phân loại học sinh.\n`;
    prompt += `\n`;

    prompt += `\n📌 QUY TẮC TRÌNH BÀY CÔNG THỨC TOÁN/LÝ/HÓA (BẮT BUỘC ĐỂ XUẤT WORD CHUẨN):\n`;
    prompt += `- TUYỆT ĐỐI KHÔNG dùng định dạng LaTeX ($...$) cho các mũi tên phản ứng hóa học (->, =>, <=>) và kí hiệu nhiệt độ (độ C, ^oC). Bắt buộc viết chúng dưới dạng text thường.\n`;
    prompt += `- Với công thức Hóa học, Vật lý đơn giản: SỬ DỤNG ký tự UNICODE (Ví dụ: H₂SO₄, Fe²⁺, α, Δt). Tuyệt đối không dùng mã code cho loại này.\n`;
    prompt += `- CHỈ KHI có công thức Toán học phức tạp (phân số, căn thức, hệ phương trình...): Mới sử dụng mã LaTeX và BẮT BUỘC bọc trong cặp dấu $...$ (ví dụ: $\\frac{1}{2}$) hoặc $$...$$ cho công thức đứng 1 dòng.\n`;

    prompt += `\n📈 HƯỚNG DẪN TẠO HÌNH ẢNH MINH HỌA (BẮT BUỘC ÁP DỤNG):\n`;
    prompt += `BẮT BUỘC thêm dòng "Hình ảnh:" vào TỐI THIỂU 1-2 câu hỏi trong đề (ưu tiên câu về đồ thị, biểu đồ, số liệu, hình học). Đặt dòng này ngay SAU dòng "Giải thích:" của câu đó, kèm JSON metadata. HỆ THỐNG SẼ TỰ ĐỘNG VẼ HÌNH BẰNG MATPLOTLIB.\n`;
    prompt += `Các loại hỗ trợ và mẫu JSON:\n\n`;
    prompt += `1️⃣ TOÁN — Đồ thị hàm số (cực trị, tiệm cận, khảo sát...):\n`;
    prompt += `Hình ảnh: {"loai":"do_thi_ham_so","hamSo":"x**3 - 3*x","xRange":[-4,4],"tieuDe":"y = x³ - 3x","diemDacBiet":[{"x":-1,"y":2,"nhan":"CĐ(-1;2)"},{"x":1,"y":-2,"nhan":"CT(1;-2)"}]}\n`;
    prompt += `2️⃣ TOÁN — Hình học Oxy (tam giác, đường tròn, tọa độ...):\n`;
    prompt += `Hình ảnh: {"loai":"hinh_hoc_oxy","tieuDe":"Tam giác ABC","xRange":[-1,6],"yRange":[-1,5],"diem":[{"x":0,"y":0,"nhan":"A"},{"x":5,"y":0,"nhan":"B"},{"x":2,"y":4,"nhan":"C"}],"doanThang":[{"x1":0,"y1":0,"x2":5,"y2":0},{"x1":5,"y1":0,"x2":2,"y2":4},{"x1":2,"y1":4,"x2":0,"y2":0}]}\n`;
    prompt += `3️⃣ TOÁN — Histogram thống kê (phân bố điểm, tần số...):\n`;
    prompt += `Hình ảnh: {"loai":"histogram","tieuDe":"Phân bố điểm thi","nhanX":"Điểm","nhanY":"Số HS","duLieu":[3,4,5,5,6,6,6,7,7,7,7,8,8,9,10],"soCot":8}\n`;
    prompt += `4️⃣ VẬT LÝ — Đồ thị v-t, s-t, U-I, P-V (đoạn thẳng nối tiếp):\n`;
    prompt += `Hình ảnh: {"loai":"do_thi_vat_ly","tieuDe":"Đồ thị v-t","nhanX":"t (s)","nhanY":"v (m/s)","doanThang":[{"x1":0,"y1":0,"x2":5,"y2":20},{"x1":5,"y1":20,"x2":10,"y2":20},{"x1":10,"y1":20,"x2":15,"y2":0}],"diemDacBiet":[{"x":5,"y":20,"nhan":"A(5;20)"}]}\n`;
    prompt += `5️⃣ ĐỊA LÝ / SINH / HÓA / SỬ / CÔNG NGHỆ / TIN — Biểu đồ cột:\n`;
    prompt += `Hình ảnh: {"loai":"bieu_do_cot","tieuDe":"Dân số ĐNÁ 2023","nhanX":"Quốc gia","nhanY":"Triệu người","nhan":["VN","Thái Lan","Indonesia"],"giaTri":[100,72,275]}\n`;
    prompt += `6️⃣ ĐỊA LÝ / SINH / HÓA / SỬ — Biểu đồ đường (so sánh xu hướng):\n`;
    prompt += `Hình ảnh: {"loai":"bieu_do_duong","tieuDe":"GDP 2018-2023","nhanX":"Năm","nhanY":"Tỷ USD","nhan":["2018","2019","2020","2021","2022","2023"],"chuoiDuLieu":[{"ten":"VN","giaTri":[245,262,271,366,409,430]}]}\n`;
    prompt += `7️⃣ ĐỊA LÝ / SINH / HÓA — Biểu đồ tròn (cơ cấu, tỉ lệ %):\n`;
    prompt += `Hình ảnh: {"loai":"bieu_do_tron","tieuDe":"Cơ cấu kinh tế VN","nhan":["Nông nghiệp","Công nghiệp","Dịch vụ"],"giaTri":[12,38,50]}\n`;
    prompt += `⚠️ QUY TẮC QUAN TRỌNG: Trường "hamSo" dùng cú pháp Python (x**2, np.sin(x), np.sqrt(x)). NHẮC LẠI: BẮT BUỘC phải có TỐI THIỂU 1-2 câu trong đề có dòng "Hình ảnh:" kèm JSON — đây là YÊU CẦU BẮT BUỘC, không phải tùy chọn.\n`;

    if (config.hasTuLuan) {
      prompt += `\n📌 QUY TẮC ĐỊNH DẠNG ĐÁP ÁN TỰ LUẬN VÀ BIỂU ĐIỂM (BẮT BUỘC TUÂN THỦ 100%):\n`;
      prompt += `- Câu hỏi tự luận phải chia nhỏ đáp án thành từng bước giải chi tiết. Mỗi bước giải bắt buộc nằm trên 1 dòng riêng biệt.\n`;
      prompt += `- CUỐI MỖI DÒNG bước giải, BẮT BUỘC ghi điểm số của bước đó, cách nội dung bằng đúng ký hiệu " || " (hai dấu gạch đứng).\n`;
      prompt += `- Điểm số từng ý nhỏ (a, b, c) BẮT BUỘC khớp CHÍNH XÁC với cấu hình biểu điểm đã cho. KHÔNG ĐƯỢC tự ý chia lại.\n`;
      prompt += `- Ví dụ chuẩn: "Ta có phương trình $x^2 - 4 = 0$ || 0.25"\n`;
      prompt += `- Tuyệt đối KHÔNG tự ý vẽ bảng (Table) Markdown trong phần đáp án.\n`;
    }

    prompt += `\n💡 PHONG CÁCH VÀ VÍ DỤ MẪU (BẮT BUỘC BẮT CHƯỚC 100% ĐỘ KHÓ VÀ VĂN PHONG NÀY):\n`;
    prompt += `\n📍 [MẪU TRẮC NGHIỆM TÍNH TOÁN]: Không hỏi lý thuyết. Hãy ra phép tính cụ thể và có bẫy.\n`;
    prompt += `Ví dụ: "Kết quả của phép tính $\\frac{4}{5} + (\\frac{-3}{5})$ là:\nA. $\\frac{7}{5}$   B. $\\frac{-7}{5}$   C. $\\frac{1}{5}$   D. $\\frac{-1}{5}$"\n`;

    prompt += `\n📍 [MẪU TRẮC NGHIỆM ĐÚNG/SAI ĐA CHIỀU]: Mỗi câu gồm 1 ĐỀ BÀI CHUNG + 4 ý a,b,c,d xoay quanh đề bài đó.\n`;
    prompt += `Ví dụ: "Khối 6 có 400 học sinh. Sơ kết kì I có 32 HS giỏi, 60% khá, 12 yếu, còn lại là trung bình.\na) HS giỏi chiếm 8%.\nb) HS yếu chiếm 4%.\nc) Có 240 HS khá.\nd) HS trung bình nhiều hơn HS giỏi 86 em."\n`;

    if (config.hasTuLuan) {
      prompt += `\n📍 [MẪU TỰ LUẬN CÓ LỜI VĂN - THỰC TẾ]: Bài toán có cốt truyện, chia nhiều bước, tính điểm từng bước.\n`;
      prompt += `Ví dụ: "Mai đọc một cuốn sách dày 180 trang. Ngày thứ nhất đọc được $\\frac{1}{4}$ số trang..."\n`;
      prompt += `→ Đáp án AI PHẢI in ra đúng format:\n`;
      prompt += `+ Tính số trang ngày 1: 180 × 1/4 = 45 trang || 0.5\n`;
      prompt += `+ Tính số trang còn lại sau ngày 1: 180 - 45 = 135 trang || 0.25\n`;
    }

    prompt += `\n⚠️ LỆNH TUYỆT ĐỐI CUỐI CÙNG: TẤT CẢ các câu hỏi bạn sinh ra phải có độ sâu, cấu trúc số liệu, bẫy tâm lý và sự chặt chẽ y hệt các ví dụ trên! Bắt buộc bám sát "Yêu cầu cần đạt" của từng đơn vị kiến thức.\n`;

    let hasContent = false;
    const getFlatCount = (typeKey) => {
      let total = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          ['biet', 'hieu', 'vanDung'].forEach(level => { total += Number(obj[level]) || 0; });
        });
      });
      return total;
    };

    const totalTraLoiNgan = config.hasTraLoiNgan ? getFlatCount('traLoiNgan') : 0;
    const totalTuLuan = getFlatCount('tuLuan');

    const soCauDungSai = (() => {
      let totalBiet = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          totalBiet += Number(dv.dungSai?.biet) || 0;
        });
      });
      return totalBiet;
    })();
    const soCauTraLoiNgan = totalTraLoiNgan; // NÂNG CẤP: KHÔNG CHIA 4 NỮA
    const soCauTuLuan = (() => {
      if (hasManualTLConfig) return tuLuanConfig.questions.length;
      return localTuLuanGroups.length;
    })();

    // Helper: lấy mã năng lực từ indicatorMap (extract .code từ object {code,label})
    const toCode = (m) => m ? (typeof m === 'object' ? (m.code || '') : m) : '';
    const readInds = (map, type, level, count) => {
      if (!map) return [];
      return Array.from({length: count}, (_, i) => toCode(map[`${type}_${level}_${i}`])).filter(Boolean);
    };
    // Helper: auto-suy mã HH/TD/NT từ YCCĐ khi indicatorMap rỗng
    const monHoc = examHeader?.monHoc || '';
    const isHoaMon = /hóa|hoá/i.test(monHoc);
    const isToanMon = /toán|toan/i.test(monHoc);
    const isSinhMon = /sinh/i.test(monHoc);
    const getAutoCode = (level) => {
      if (isHoaMon) {
        if (level === 'biet') return 'HH1.1';
        if (level === 'hieu') return 'HH1.2';
        if (level === 'vanDung' || level === 'vanDungCao') return 'HH3.1';
      }
      if (isToanMon) {
        if (level === 'biet') return 'TD1.1';
        if (level === 'hieu') return 'TD1.2';
        if (level === 'vanDung' || level === 'vanDungCao') return 'TD2.2';
      }
      if (isSinhMon) {
        if (level === 'biet') return 'NT1';
        if (level === 'hieu') return 'TH1';
        if (level === 'vanDung' || level === 'vanDungCao') return 'VD2';
      }
      return null;
    };
    const resolveInds = (map, type, level, count) => {
      const codes = readInds(map, type, level, count);
      if (codes.length > 0) return [...new Set(codes)];
      const auto = getAutoCode(level);
      return auto ? [auto] : [];
    };

    matrix.forEach((topic, index) => {
      const tenChuDe = topic.tenChuDe || `Chủ đề ${index + 1}`;
      const dvList = topic.donViKienThuc || [];

      dvList.forEach((dv) => {
        const mcq = dv.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 };
        const ds = dv.dungSai || { biet: 0, hieu: 0, vanDung: 0 };
        const tln = dv.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 };
        const tl = dv.tuLuan || { biet: 0, hieu: 0, vanDung: 0 };

        const dvTotalQs =
          (Number(mcq.biet) || 0) + (Number(mcq.hieu) || 0) + (Number(mcq.vanDung) || 0) +
          (Number(ds.biet) || 0) + (Number(ds.hieu) || 0) + (Number(ds.vanDung) || 0) + (Number(ds.vanDungCao) || 0) +
          (Number(tln.biet) || 0) + (Number(tln.hieu) || 0) + (Number(tln.vanDung) || 0) +
          (Number(tl.biet) || 0) + (Number(tl.hieu) || 0) + (Number(tl.vanDung) || 0);

        if (dvTotalQs > 0) {
          hasContent = true;
          const tenDVKT = dv.noiDung || 'Chưa rõ';
          const yccdText = (dv.yeuCauCanDat && dv.yeuCauCanDat.trim() !== '')
            ? dv.yeuCauCanDat.trim()
            : `Bám sát nội dung bài học "${tenDVKT}" trong chương trình GDPT 2018.`;

          let phongCachText = "";
          if (dv.phongCach && dv.phongCach.length > 0) {
            const lenhPhongCach = dv.phongCach.map(tag => STYLE_DICTIONARY[tag]).filter(Boolean).join(" ");
            if (lenhPhongCach) phongCachText = `\n🎭 LỆNH PHONG CÁCH ĐẶC BIỆT: ${lenhPhongCach}\n`;
          }

          prompt += `\n╔══════════════════════════════════════════════════════╗\n`;
          prompt += `║  📌 CHỦ ĐỀ: "${tenChuDe}"\n`;
          prompt += `║  📖 BÀI / ĐƠN VỊ KIẾN THỨC: "${tenDVKT}"\n`;
          prompt += `╚══════════════════════════════════════════════════════╝\n`;
          prompt += `🎯 YÊU CẦU CẦN ĐẠT — BẮT BUỘC BÁM SÁT KHI RA ĐỀ:\n${yccdText}\n`;
          prompt += phongCachText;
          prompt += `👉 MỌI câu hỏi thuộc đơn vị kiến thức này PHẢI kiểm tra đúng các năng lực/phẩm chất nêu trong Yêu cầu cần đạt bên trên, KHÔNG được ra câu hỏi ngoài phạm vi đó.\n`;
          prompt += `\n📊 SỐ LƯỢNG CÂU HỎI CẦN SOẠN CHO ĐƠN VỊ KIẾN THỨC NÀY:\n`;

          const mcqParts = [];
          if (Number(mcq.biet) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'biet', Number(mcq.biet));
            mcqParts.push(`${mcq.biet} câu Nhận biết${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
          }
          if (Number(mcq.hieu) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'hieu', Number(mcq.hieu));
            mcqParts.push(`${mcq.hieu} câu Thông hiểu${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
          }
          if (Number(mcq.vanDung) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'vanDung', Number(mcq.vanDung));
            mcqParts.push(`${mcq.vanDung} câu Vận dụng${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
          }
          if (mcqParts.length > 0) {
            prompt += ` - Trắc nghiệm nhiều lựa chọn [LOẠI 1]: ${mcqParts.join(', ')}\n`;
          }

          const dsParts = [];
          const totalDsY = (Number(ds.biet) || 0) + (Number(ds.hieu) || 0) + (Number(ds.vanDung) || 0) + (Number(ds.vanDungCao) || 0);
          if (totalDsY > 0) {
            if (!config.groupTfByTopic) {
              const numCau = Math.ceil(totalDsY / 4);
              const allInds = [];
              ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(lvl => {
                const cnt = Number(ds[lvl]) || 0;
                if (cnt > 0) resolveInds(dv.indicatorMap, 'dungSai', lvl, cnt).forEach(c => allInds.push(c));
              });
              const uniqueInds = [...new Set(allInds)];
              const lvlParts = [];
              if (Number(ds.biet) > 0) lvlParts.push(`${ds.biet} ý Nhận biết`);
              if (Number(ds.hieu) > 0) lvlParts.push(`${ds.hieu} ý Thông hiểu`);
              if (Number(ds.vanDung) > 0) lvlParts.push(`${ds.vanDung} ý Vận dụng`);
              if (Number(ds.vanDungCao) > 0) lvlParts.push(`${ds.vanDungCao} ý Vận dụng cao`);
              const lvlStr = lvlParts.length > 0 ? ` [${lvlParts.join(', ')}]` : '';
              dsParts.push(`${numCau} câu${lvlStr}${uniqueInds.length > 0 ? ` (Mã năng lực: ${uniqueInds.join(', ')})` : ''}`);
            } else {
              if (Number(ds.biet) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'biet', Number(ds.biet));
                dsParts.push(`${ds.biet} ý Nhận biết${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.hieu) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'hieu', Number(ds.hieu));
                dsParts.push(`${ds.hieu} ý Thông hiểu${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.vanDung) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'vanDung', Number(ds.vanDung));
                dsParts.push(`${ds.vanDung} ý Vận dụng${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.vanDungCao) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'vanDungCao', Number(ds.vanDungCao));
                dsParts.push(`${ds.vanDungCao} ý Vận dụng cao${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
              }
            }
            if (dsParts.length > 0) {
              if (!config.groupTfByTopic) {
                prompt += ` - Trắc nghiệm Đúng/Sai [LOẠI 2]: ${dsParts.join(', ')} (⚠️ Mỗi câu = 1 ĐỀ BÀI CHUNG + 4 ý a/b/c/d)\n`;
              } else {
                prompt += ` - Trắc nghiệm Đúng/Sai [LOẠI 2]: ${dsParts.join(', ')} (⚠️ Các ý này thuộc cùng 1 câu ĐS chung — KHÔNG phải câu riêng lẻ)\n`;
              }
            }
          }

          if (config.hasTraLoiNgan) {
            const tlnParts = [];
            if (Number(tln.biet) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'biet', Number(tln.biet));
              tlnParts.push(`${tln.biet} câu Nhận biết${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
            }
            if (Number(tln.hieu) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'hieu', Number(tln.hieu));
              tlnParts.push(`${tln.hieu} câu Thông hiểu${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
            }
            if (Number(tln.vanDung) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'vanDung', Number(tln.vanDung));
              tlnParts.push(`${tln.vanDung} câu Vận dụng${inds.length > 0 ? ` (Mã năng lực: ${inds.join(', ')})` : ''}`);
            }
            if (tlnParts.length > 0) {
              prompt += ` - Trả lời ngắn [LOẠI 3]: ${tlnParts.join(', ')}\n`;
            }
          }

          if (config.hasTuLuan) {
            const diemBiet = Number(dv.tuLuan?.diemBiet) || 0;
            const diemHieu = Number(dv.tuLuan?.diemHieu) || 0;
            const diemVanDung = Number(dv.tuLuan?.diemVanDung) || 0;
            const totalYTL = (Number(tl.biet) || 0) + (Number(tl.hieu) || 0) + (Number(tl.vanDung) || 0);
            if (totalYTL > 0) {
              const tongDiem = Math.round((diemBiet + diemHieu + diemVanDung) * 100) / 100;
              const allInds = [];
              ['biet', 'hieu', 'vanDung'].forEach(level => {
                const cnt = Number(tl[level]) || 0;
                if (cnt > 0) resolveInds(dv.indicatorMap, 'tuLuan', level, cnt).forEach(c => allInds.push(c));
              });
              const uniqueInds = [...new Set(allInds)];
              const indStr = uniqueInds.length > 0 ? ` (Mã năng lực: ${uniqueInds.join(', ')})` : '';
              const tlLevelParts = [];
              if (Number(tl.biet) > 0) tlLevelParts.push(`${tl.biet} ý Nhận biết`);
              if (Number(tl.hieu) > 0) tlLevelParts.push(`${tl.hieu} ý Thông hiểu`);
              if (Number(tl.vanDung) > 0) tlLevelParts.push(`${tl.vanDung} ý Vận dụng`);
              const tlLevelStr = tlLevelParts.length > 0 ? ` [${tlLevelParts.join(', ')}]` : '';
              if (hasManualTLConfig) {
                prompt += ` - Tự luận [LOẠI 4]: ${totalYTL} ý${tlLevelStr} — tổng ${tongDiem}đ${indStr}\n`;
              } else {
                prompt += ` - Tự luận [LOẠI 4]: ${totalYTL} ý${tlLevelStr} — tổng ${tongDiem}đ${indStr}\n`;
              }
            }
          }
          prompt += `⚠️ LƯU Ý TỐI QUAN TRỌNG: Viết ĐÚNG SỐ LƯỢNG câu hỏi/ý đã được giao.\n\n`;
        }
      });
    });

    if (hasContent) {
      prompt += `📊 TỔNG HỢP GOM CÂU BẮT BUỘC VÀ ĐỊNH DẠNG ĐẦU RA:\n`;
      prompt += `⚠️ YÊU CẦU ĐỊNH DẠNG TỐI QUAN TRỌNG: TRƯỚC MỖI PHẦN, BẠN BẮT BUỘC PHẢI IN RA ĐÚNG TIÊU ĐỀ CỦA PHẦN ĐÓ NHƯ SAU ĐỂ HỆ THỐNG NHẬN DIỆN ĐƯỢC: "I. PHẦN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN", "II. PHẦN TRẮC NGHIỆM ĐÚNG SAI", "III. PHẦN TRẮC NGHIỆM TRẢ LỜI NGẮN", "IV. PHẦN TỰ LUẬN".\n`;
      if (soCauDungSai > 0) {
        prompt += `  → LOẠI 2 (Đúng/Sai): Gom thành ${soCauDungSai} Câu (mỗi Câu gồm 1 ĐỀ BÀI CHUNG + 4 ý a, b, c, d xoay quanh đề bài đó). ĐÁP ÁN bắt buộc ghi rõ dạng a-Đ, b-S, c-Đ, d-S.\n`;
        if (config.groupTfByTopic) {
          prompt += `     ⚠️ LƯU Ý: 4 mệnh đề trong mỗi câu Đúng/Sai này được lấy rải rác từ các bài học khác nhau trong cùng chủ đề để đảm bảo tính bao quát.\n`;
        }
      }
      // NÂNG CẤP: Trả lời ngắn độc lập
      if (soCauTraLoiNgan > 0) prompt += `  → LOẠI 3: Xuất thành ${soCauTraLoiNgan} Câu độc lập (TUYỆT ĐỐI KHÔNG GOM vào chung 1 câu có ý a, b, c, d)\n`;
      if (config.hasTuLuan && soCauTuLuan > 0) {
        if (hasManualTLConfig) {
          const cauStructureDesc = tuLuanConfig.questions.map((q, i) => {
            const nY = q.subItems?.length || 1;
            const tongDiemQ = q.subItems ? Math.round(q.subItems.reduce((s, si) => s + (si.diem || 0), 0) * 100) / 100 : 0;
            const yDetails = q.subItems ? q.subItems.slice(0, nY).map((sub, j) => `ý ${['a', 'b', 'c'][j]}=${Number(sub.diem) || 0}đ`).join(', ') : '';
            const kieuY = q.kieuY || 'chung';
            const kieuDesc = nY > 1 ? (kieuY === 'chung' ? ' [đề bài chung]' : ' [ý độc lập]') : '';
            const ktLabel = q.kienThuc === 'hinh_hoc' ? ' [Hình học]' : q.kienThuc === 'dai_so' ? ' [Đại số]' : '';
            return `câu ${i + 1}${ktLabel}: ${nY > 1 ? `${nY} ý (${yDetails})${kieuDesc} — tổng ${tongDiemQ}đ` : `1 ý — ${tongDiemQ}đ`}`;
          }).join('; ');
          prompt += `  → LOẠI 4: Tổng ${soCauTuLuan} Câu tự luận. CẤU TRÚC BẮT BUỘC: ${cauStructureDesc}. ⚠️ [đề bài chung] = 1 tình huống/bài toán chung, phát triển thành các ý a, b, c liên quan; [ý độc lập] = mỗi ý là câu hỏi riêng không liên quan nhau. TỔNG ĐIỂM TỰ LUẬN: ${tongDiemTuLuanThucTe} điểm\n`;
          // Thêm yêu cầu kienThuc chi tiết per câu nếu có
          const hasKienThuc = tuLuanConfig.questions.some(q => q.kienThuc === 'hinh_hoc' || q.kienThuc === 'dai_so');
          if (hasKienThuc) {
            tuLuanConfig.questions.forEach((q, i) => {
              if (q.kienThuc === 'hinh_hoc') {
                prompt += `     ↳ Câu ${i + 1} [Hình học]: BẮT BUỘC ra câu hỏi thuộc lĩnh vực HÌNH HỌC (hình học phẳng, hình không gian, tọa độ, hình học giải tích...). KHÔNG ra câu đại số.\n`;
              } else if (q.kienThuc === 'dai_so') {
                prompt += `     ↳ Câu ${i + 1} [Đại số]: BẮT BUỘC ra câu hỏi thuộc lĩnh vực ĐẠI SỐ / GIẢI TÍCH (hàm số, phương trình, bất phương trình, tích phân, chuỗi số...). KHÔNG ra câu hình học.\n`;
              }
            });
          }
        } else {
          const cauStructureDesc = localTuLuanGroups.map((group, i) => {
            const nY = group.items.length;
            const tongDiemQ = Math.round(group.items.reduce((s, it) => s + (it.diem || 0), 0) * 100) / 100;
            const yDetails = group.items.map((it, j) => `ý ${String.fromCharCode(97 + j)}=${Number(it.diem) || 0}đ`).join(', ');
            const kieuDesc = nY > 1 ? (group.kieuY === 'chung' ? ' [đề bài chung]' : ' [ý độc lập]') : '';
            return `câu ${i + 1}: ${nY > 1 ? `${nY} ý (${yDetails})${kieuDesc} — tổng ${tongDiemQ}đ` : `1 ý — ${tongDiemQ}đ`}`;
          }).join('; ');
          prompt += `  → LOẠI 4: Tổng ${soCauTuLuan} Câu tự luận. CẤU TRÚC BẮT BUỘC: ${cauStructureDesc}. ⚠️ [đề bài chung] = 1 tình huống/bài toán chung, phát triển thành các ý a, b, c liên quan; [ý độc lập] = mỗi ý là câu hỏi riêng không liên quan nhau. TỔNG ĐIỂM TỰ LUẬN: ${tongDiemTuLuanThucTe} điểm\n`;
        }
      }
      prompt += `\n`;
    }

    if (!hasContent) {
      return "";
    }

    prompt += `\n🖼️ NHẮC LẠI LẦN CUỐI: BẮT BUỘC có TỐI THIỂU 1-2 câu hỏi có dòng "Hình ảnh:" kèm JSON metadata (biểu đồ cột, đồ thị hàm số, biểu đồ tròn, hình học Oxy...). KHÔNG ĐƯỢC bỏ qua yêu cầu này!\n`;

    prompt += `\n[THẦY/CÔ XÓA DÒNG CHỮ NÀY, BẤM NÚT ĐÍNH KÈM FILE TÀI LIỆU/SGK VÀ GỬI CHO AI ĐỂ NÓ SOẠN ĐỀ]`;
    
    return prompt;
  }, [matrix, config, examConfig, examHeader, tuLuanConfig, hasManualTLConfig, localTuLuanGroups]);

  const handleCopyExamPrompt = async () => {
    if (!generatedPrompt) {
      alert("Bác chưa điền số lượng câu hỏi ở Bảng Ma Trận (Bước 3). Vui lòng điền số lượng trước khi sinh đề nhé!");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      alert("✅ ĐÃ COPY SIÊU LỆNH SINH ĐỀ THI!\n\n1. Hãy dán lệnh này vào ChatGPT hoặc Gemini.\n2. Bấm nút ghim kẹp giấy để đính kèm file Sách giáo khoa.\n3. Xóa dòng ngoặc vuông cuối cùng rồi bấm GỬI.\n4. Đợi AI nhả đề thi rồi copy dán vào ô bên dưới nhé!");
    } catch (err) {
      alert("Lỗi khi copy. Trình duyệt của bạn có thể không hỗ trợ tính năng này.");
    }
  };

  // =========================================================================
  // TÍNH DANH SÁCH Ô TRỐNG — NÂNG CẤP: KHÔNG CHIA 4 Ở LOẠI 3
  // =========================================================================
  const getAvailableSlots = () => {
    const slots = [];

    const getTotalY = (typeKey) => {
      let total = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          ['biet', 'hieu', 'vanDung'].forEach(level => { total += Number(obj[level]) || 0; });
        });
      });
      return total;
    };

    const isSlotFilled = (key) => {
      const data = examSlots[key];
      if (!data) return false;
      if (data.noiDung && data.noiDung.trim() !== '') return true;
      if (data.yA && data.yA.trim() !== '') return true;
      return false;
    };

    const buildSlotMetadata = (typeKey) => {
      const metas = [];
      const monHoc = examHeader?.monHoc || '';
      const isHoaMon = /hóa|hoá/i.test(monHoc);
      const isToanMon = /toán|toan/i.test(monHoc);
      const getAutoCode = (level) => {
        if (isHoaMon) {
          if (level === 'biet') return 'HH1.1';
          if (level === 'hieu') return 'HH1.2';
          if (level === 'vanDung' || level === 'vanDungCao') return 'HH3.1';
        }
        if (isToanMon) {
          if (level === 'biet') return 'TD1.1';
          if (level === 'hieu') return 'TD1.2';
          if (level === 'vanDung' || level === 'vanDungCao') return 'TD2.2';
        }
        return null;
      };
      
      const readInds = (map, type, level, count) => {
        if (!map || !map[type] || !map[type][level]) return [];
        return map[type][level].slice(0, count);
      };

      const resolveInds = (map, type, level, count) => {
        const codes = readInds(map, type, level, count);
        if (codes.length > 0) return [...new Set(codes)];
        const auto = getAutoCode(level);
        return auto ? [auto] : [];
      };

      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          let count = (Number(obj.biet) || 0) + (Number(obj.hieu) || 0) + (Number(obj.vanDung) || 0);
          if (count > 0) {
            for (let c = 0; c < count; c++) {
              let allIndsForDv = [];
              ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(lvl => {
                const lvlCount = Number(obj[lvl]) || 0;
                if (lvlCount > 0) {
                  allIndsForDv.push(...resolveInds(dv.indicatorMap, typeKey, lvl, lvlCount));
                }
              });
              metas.push({ name: dv.noiDung || '', inds: [...new Set(allIndsForDv)] });
            }
          }
        });
      });
      return metas;
    };

    // --- PHẦN I ---
    const totalMCQ = getTotalY('nhieuLuaChon');
    const mcqMetas = buildSlotMetadata('nhieuLuaChon');
    for (let i = 0; i < totalMCQ; i++) {
      const key = `phan1_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      const meta = mcqMetas[i] || { name: '', inds: [] };
      const dvktSuffix = meta.name ? ` - ${meta.name}` : '';
      slots.push({ key, label: `Phần I - Câu ${i + 1} (Trắc nghiệm)${dvktSuffix}${daDien ? ' ✅' : ''}`, loai: 1, daDien, inds: meta.inds });
    }

    // --- PHẦN II ---
    const soCauTF = Math.ceil(getTotalY('dungSai') / 4);
    const tfMetas = buildSlotMetadata('dungSai');
    for (let i = 0; i < soCauTF; i++) {
      const key = `phan2_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      const meta = tfMetas[i * 4] || { name: '', inds: [] }; // Lấy label của ý đầu tiên trong nhóm 4 ý
      const dvktSuffix = meta.name ? ` - ${meta.name}` : '';
      slots.push({ key, label: `Phần II - Câu ${i + 1} (Đúng/Sai)${dvktSuffix}${daDien ? ' ✅' : ''}`, loai: 2, daDien, inds: meta.inds });
    }

    // --- PHẦN III (NÂNG CẤP: KHÔNG CHIA 4) ---
    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      const saMetas = buildSlotMetadata('traLoiNgan');
      for (let i = 0; i < totalSA; i++) {
        const key = `phan3_cau${i + 1}`;
        const daDien = isSlotFilled(key);
        const meta = saMetas[i] || { name: '', inds: [] };
        const dvktSuffix = meta.name ? ` - ${meta.name}` : '';
        slots.push({ key, label: `Phần III - Câu ${i + 1} (Trả lời ngắn)${dvktSuffix}${daDien ? ' ✅' : ''}`, loai: 3, daDien, inds: meta.inds });
      }
    }

    // --- PHẦN IV ---
    const tlMetasForLabels = [];
    matrix.forEach(topic => {
      (topic.donViKienThuc || []).forEach(dv => {
        ['biet', 'hieu', 'vanDung'].forEach(level => {
          const count = Number(dv.tuLuan?.[level]) || 0;
          for (let i = 0; i < count; i++) {
            let inds = [];
            if (dv.indicatorMap && dv.indicatorMap.tuLuan && dv.indicatorMap.tuLuan[level]) {
               inds = dv.indicatorMap.tuLuan[level].slice(0, count); // Rough approximation
            }
            tlMetasForLabels.push({ name: dv.noiDung || '', levelKey: level, inds });
          }
        });
      });
    });
    
    const soCauTL = (() => {
      if (hasManualTLConfig) return tuLuanConfig.questions.length;
      return localTuLuanGroups.length;
    })();
    const phanTL = config.hasTraLoiNgan ? 4 : 3;
    
    for (let i = 0; i < soCauTL; i++) {
      const key = `phan${phanTL}_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      let dvktSuffix = '';
      let slotInds = [];
      
      if (!hasManualTLConfig) {
        const group = localTuLuanGroups[i];
        if (group && group.items) {
          const uniqueDvkts = [...new Set(group.items.map(it => it.tenBai))].filter(Boolean);
          dvktSuffix = uniqueDvkts.length > 0 ? ` - ${uniqueDvkts.join(', ')}` : '';
          group.items.forEach(it => {
             const match = tlMetasForLabels.find(m => m.name === it.tenBai && m.levelKey === it.levelKey);
             if (match && match.inds) slotInds.push(...match.inds);
          });
        }
      } else {
        const meta = tlMetasForLabels[i] || { name: '', inds: [] };
        dvktSuffix = meta.name ? ` - ${meta.name}` : '';
        slotInds = meta.inds || [];
      }
      
      slots.push({ key, label: `Phần ${phanTL === 4 ? 'IV' : 'III'} - Câu ${i + 1} (Tự luận)${dvktSuffix}${daDien ? ' ✅' : ''}`, loai: 4, daDien, inds: [...new Set(slotInds)] });
    }

    return slots;
  };

  const availableSlots = getAvailableSlots();

  const handleToggleSelect = (draftIndex) => {
    setSelectedDrafts(prev =>
      prev.includes(draftIndex) ? prev.filter(i => i !== draftIndex) : [...prev, draftIndex]
    );
  };

  // =========================================================================
  // HÀM NẠP VÀ GHI ĐÈ TOÀN BỘ LÊN KHUNG ĐỀ (CHO ĐỀ TƯƠNG ĐƯƠNG)
  // =========================================================================
  const handleOverrideAll = () => {
    if (draftQuestions.length === 0) {
      alert('Không có câu hỏi nào trong Nháp để ghi đè!');
      return;
    }

    const confirmOverride = window.confirm("CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ Khung Đề hiện tại và nạp các câu hỏi trong Nháp lên.\nBạn có chắc chắn muốn GHI ĐỀ TOÀN BỘ không?");
    if (!confirmOverride) return;

    // Lọc các slot theo từng loại (Lấy tất cả, KHÔNG quan tâm daDien)
    const slotsLoai1 = availableSlots.filter(s => s.loai === 1);
    const slotsLoai2 = availableSlots.filter(s => s.loai === 2);
    const slotsLoai3 = availableSlots.filter(s => s.loai === 3);
    const slotsLoai4 = availableSlots.filter(s => s.loai === 4);

    const qsLoai1 = draftQuestions.filter(q => q.loaiCauHoi === 1);
    const qsLoai2 = draftQuestions.filter(q => q.loaiCauHoi === 2);
    const qsLoai3 = draftQuestions.filter(q => q.loaiCauHoi === 3);
    const qsLoai4 = draftQuestions.filter(q => q.loaiCauHoi === 4);

    let pushedCount = 0;
    let failedCount = 0;

    // Dọn dẹp tất cả slot trước khi nạp
    availableSlots.forEach(slot => {
      clearExamSlot(slot.key);
    });

    const pushGroup = (questions, slots) => {
      let availableForMapping = [...slots];
      const questionsWithTarget = [];

      for (const q of questions) {
        let targetSlot = null;
        if (q.maNangLuc) {
          const matchedIndex = availableForMapping.findIndex(s => s.inds && s.inds.includes(q.maNangLuc));
          if (matchedIndex !== -1) {
            targetSlot = availableForMapping[matchedIndex];
            availableForMapping.splice(matchedIndex, 1);
            questionsWithTarget.push({ q, slot: targetSlot });
            continue;
          }
        }
        if (availableForMapping.length > 0) {
          questionsWithTarget.push({ q, slot: availableForMapping.shift() });
        } else {
          failedCount++;
        }
      }

      for (const { q: question, slot } of questionsWithTarget) {
        let mappedData;
        if (question.loaiCauHoi === 1) {
          mappedData = {
            loaiCauHoi: 1, noiDung: question.noiDung,
            dapAnA: question.dapAnA, dapAnB: question.dapAnB, dapAnC: question.dapAnC, dapAnD: question.dapAnD,
            dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
          };
        } else if (question.loaiCauHoi === 3) {
          mappedData = {
            loaiCauHoi: 3, noiDung: question.noiDung, dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
          };
        } else if (question.loaiCauHoi === 2) {
          mappedData = {
            loaiCauHoi: 2, noiDung: question.noiDung,
            yA: cleanYContent(question.yA), yB: cleanYContent(question.yB), yC: cleanYContent(question.yC), yD: cleanYContent(question.yD),
            dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
          };
        }
        if (mappedData) {
          if (question.hinhAnh) mappedData.hinhAnh = question.hinhAnh;
          pushToExamSlot(slot.key, mappedData, question);
          pushedCount++;
        }
      }
    };

    pushGroup(qsLoai1, slotsLoai1);
    pushGroup(qsLoai2, slotsLoai2);
    pushGroup(qsLoai3, slotsLoai3);

    {
      let availableForMapping = [...slotsLoai4];
      const questionsWithTarget = [];

      for (const q of qsLoai4) {
        let targetSlot = null;
        if (q.maNangLuc) {
          const matchedIndex = availableForMapping.findIndex(s => s.inds && s.inds.includes(q.maNangLuc));
          if (matchedIndex !== -1) {
            targetSlot = availableForMapping[matchedIndex];
            availableForMapping.splice(matchedIndex, 1);
            questionsWithTarget.push({ q, slot: targetSlot });
            continue;
          }
        }
        if (availableForMapping.length > 0) {
          questionsWithTarget.push({ q, slot: availableForMapping.shift() });
        } else {
          failedCount++;
        }
      }

      for (const { q, slot } of questionsWithTarget) {
        const mappedData = mapTL4Draft(q);
        if (q.hinhAnh) mappedData.hinhAnh = q.hinhAnh;
        pushToExamSlot(slot.key, mappedData, q);
        pushedCount++;
      }
    }

    setSelectedDrafts([]);

    if (failedCount > 0) {
      alert(`✅ Đã nạp thành công ${pushedCount} câu đè lên Khung Đề.\n⚠️ Tuy nhiên có ${failedCount} câu nháp bị thừa do Khung Đề ít chỗ hơn số câu AI trả về.`);
    } else {
      alert(`✅ Đã GHI ĐỀ thành công toàn bộ ${pushedCount} câu lên Khung Đề mới!`);
    }
  };

  // =========================================================================
  // HÀM ĐẨY HÀNG LOẠT (NÂNG CẤP MAPPING CHO LOẠI 3 + GOM TỰ LUẬN)
  // =========================================================================
  const handleBulkPush = () => {
    if (selectedDrafts.length === 0) {
      alert('Vui lòng tick chọn ít nhất 1 câu nháp trước khi đẩy hàng loạt!');
      return;
    }

    const sortedIndices = [...selectedDrafts].sort((a, b) => a - b);
    const draftsToPush = sortedIndices.map(idx => draftQuestions[idx]).filter(Boolean);

    const qsLoai1 = draftsToPush.filter(q => q.loaiCauHoi === 1);
    const qsLoai2 = draftsToPush.filter(q => q.loaiCauHoi === 2);
    const qsLoai3 = draftsToPush.filter(q => q.loaiCauHoi === 3);
    const qsLoai4 = draftsToPush.filter(q => q.loaiCauHoi === 4);

    let pushedCount = 0;
    let failedCount = 0;

    const usedSlotKeys = new Set();

    const pushGroup = (questions, loai) => {
      let remainingEmptySlots = availableSlots.filter(s => s.loai === loai && !s.daDien);

      for (const question of questions) {
        let targetSlot = null;

        // 1. Ưu tiên đè vào câu gốc nếu là câu sinh tương tự
        if (question._fromSimilar && question._originalSlotKey && !usedSlotKeys.has(question._originalSlotKey)) {
          const origSlot = availableSlots.find(s => s.key === question._originalSlotKey && s.loai === loai);
          if (origSlot) {
            targetSlot = origSlot;
            // Xóa khỏi remainingEmptySlots nếu có (để không dùng nhầm)
            remainingEmptySlots = remainingEmptySlots.filter(s => s.key !== origSlot.key);
          }
        }

        // 2. Tự động mapping qua Mã năng lực (ưu tiên slot trống khớp mã)
        if (!targetSlot && question.maNangLuc) {
          const matchedSlotIndex = remainingEmptySlots.findIndex(s => s.inds && s.inds.includes(question.maNangLuc));
          if (matchedSlotIndex !== -1) {
             targetSlot = remainingEmptySlots[matchedSlotIndex];
             remainingEmptySlots.splice(matchedSlotIndex, 1);
          }
        }

        // 3. Nếu không có câu gốc, hoặc câu gốc đã bị đè trong đợt này, thì tìm ô trống đầu tiên
        if (!targetSlot) {
          while (remainingEmptySlots.length > 0) {
            const candidate = remainingEmptySlots.shift();
            if (!usedSlotKeys.has(candidate.key)) {
              targetSlot = candidate;
              break;
            }
          }
        }

        if (targetSlot) {
          let mappedData;
          if (question.loaiCauHoi === 1) {
            mappedData = {
              loaiCauHoi: 1, noiDung: question.noiDung,
              dapAnA: question.dapAnA, dapAnB: question.dapAnB, dapAnC: question.dapAnC, dapAnD: question.dapAnD,
              dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
            };
          } else if (question.loaiCauHoi === 3) {
            mappedData = {
              loaiCauHoi: 3, noiDung: question.noiDung, dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
            };
          } else if (question.loaiCauHoi === 2) {
            mappedData = {
              loaiCauHoi: 2, noiDung: question.noiDung,
              yA: cleanYContent(question.yA), yB: cleanYContent(question.yB), yC: cleanYContent(question.yC), yD: cleanYContent(question.yD),
              dapAnDung: question.dapAnDung, giaiThich: question.giaiThich,
            };
          } else if (question.loaiCauHoi === 4) {
            mappedData = mapTL4Draft(question);
          }
          
          if (mappedData) {
            // Bảo toàn metadata hình ảnh khi đẩy hàng loạt
            if (question.hinhAnh) {
              mappedData.hinhAnh = question.hinhAnh;
            }
            pushToExamSlot(targetSlot.key, mappedData, question);
            usedSlotKeys.add(targetSlot.key);
            pushedCount++;
          }
        } else {
          failedCount++;
        }
      }
    };

    // ── ĐẨY LOẠI 1, 2, 3, 4 THEO LOGIC MỚI ──
    pushGroup(qsLoai1, 1);
    pushGroup(qsLoai2, 2);
    pushGroup(qsLoai3, 3);
    pushGroup(qsLoai4, 4);

    setSelectedDrafts([]);

    if (failedCount > 0) {
      alert(`✅ Đã đẩy ${pushedCount} câu lên Khung Đề.\n⚠️ ${failedCount} câu nháp bị trượt (không còn đủ ô trống ở phần tương ứng).`);
    } else {
      alert(`✅ Đã đẩy thành công tất cả ${pushedCount} câu vào đúng ô trống!`);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDrafts.length === 0) return;
    const remaining = draftQuestions.filter((_, i) => !selectedDrafts.includes(i));
    setDraftQuestions(remaining);
    setSelectedDrafts([]);
  };

  const handleDeleteOne = (index) => {
    const remaining = draftQuestions.filter((_, i) => i !== index);
    setSelectedDrafts(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    setDraftQuestions(remaining);
  };

  const handleParseExam = () => {
    setParseError('');
    setSelectedDrafts([]);
    setDraftQuestions([]);

    if (!examContent.trim()) {
      setParseError('Vui lòng dán nội dung đề thi AI vào ô soạn thảo trước khi bóc tách.');
      return;
    }

    try {
      const parsed = parseExamDraft(examContent);

      // ── POST-PROCESSING: Gắn metadata đồ thị Matplotlib cho câu hỏi ──
      for (const q of parsed) {
        // 1. Trích xuất "Hình ảnh:" JSON từ TẤT CẢ các trường (giaiThich, noiDung, dapAn)
        const fieldsToCheck = ['giaiThich', 'noiDung', 'dapAn', 'yA', 'yB', 'yC', 'yD', 'dapAnA', 'dapAnB', 'dapAnC', 'dapAnD'];
        for (const field of fieldsToCheck) {
          if (q[field] && !q.hinhAnh) {
            const extracted = extractHinhAnhFromText(q[field]);
            if (extracted) {
              q.hinhAnh = extracted.hinhAnh;
              q[field] = extracted.cleanedText;
            }
          }
        }
        // 2. Nếu hinhAnh là URL string (giả từ AI) → xóa bỏ
        if (typeof q.hinhAnh === 'string') {
          q.hinhAnh = null;
        }
        // 3. Fallback: tự phát hiện hàm số trong nội dung câu hỏi
        if (!q.hinhAnh || !q.hinhAnh.loai) {
          const detected = autoDetectGraphMetadata(q);
          if (detected) q.hinhAnh = detected;
        }
      }

      if (parsed.length === 0) {
        setParseError('Không tìm thấy câu hỏi nào. Hãy đảm bảo AI trả về đúng định dạng có chữ "Câu X:".');
        return;
      }
      setDraftQuestions(parsed);
      // Cảnh báo nếu không có câu nào có hình ảnh
      const soHinhAnh = parsed.filter(q => q.hinhAnh && q.hinhAnh.loai).length;
      if (soHinhAnh === 0) {
        setParseError('⚠️ Đề thi chưa có câu nào có hình ảnh/biểu đồ. Bạn nên yêu cầu AI bổ sung bằng cách ghi thêm: "Hãy thêm 1-2 câu có Hình ảnh: {JSON metadata biểu đồ/đồ thị}"');
      } else {
        setParseError('');
      }
    } catch (err) {
      console.error('handleParseExam error:', err);
      setParseError('Đã xảy ra lỗi khi bóc tách. Chi tiết: ' + err.message);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-100 p-2 rounded-lg">
          <Wand2 className="text-amber-600" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
            Trợ lý AI Sinh Đề
          </h2>
          <p className="text-sm text-slate-500">Copy lệnh, dán kết quả AI, bóc tách và đẩy vào khung đề</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <FileText size={20} /> Hướng dẫn tạo đề thi tự động
          </h3>
          <ul className="list-decimal list-inside text-slate-700 space-y-2 mb-6">
            <li>Bấm nút <strong>"Copy Lệnh Ma Trận"</strong> ở bên dưới.</li>
            <li>Mở <strong>ChatGPT</strong> hoặc <strong>Gemini</strong> trên web.</li>
            <li>Dán (Ctrl + V) lệnh vào ô chat.</li>
            <li>Đính kèm file PDF/Word Sách giáo khoa của môn học.</li>
            <li>Copy kết quả AI sinh ra và dán vào khung Soạn thảo bên dưới rồi bấm <strong>"Bóc tách câu hỏi"</strong>.</li>
          </ul>

          {config.hasTuLuan && localTuLuanGroups.length > 0 && !hasManualTLConfig && (
            <div className="mb-6 bg-white border border-indigo-100 rounded-lg p-5 shadow-sm">
              <h4 className="text-md font-bold text-indigo-800 mb-3 flex items-center gap-2">
                <Wand2 size={18} /> Cấu trúc Tự luận dự kiến (Gom tự động theo Chủ đề)
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Phần mềm đã tự động gom các ý Tự luận thuộc <strong className="text-slate-700">cùng 1 Chủ đề</strong> thành các câu hỏi chung đề bài. Nếu muốn thay đổi, bạn có thể chỉnh sửa kiểu ý ở bên dưới:
              </p>
              <div className="space-y-3">
                {localTuLuanGroups.map((group, index) => (
                  <div key={group.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 w-[100px] shrink-0">
                      <span className="font-bold text-slate-700 text-sm">{examConfig.isCauTruc4213 ? `TL.${index + 1}:` : `Câu ${index + 1}:`}</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                        {group.items.length} ý
                      </span>
                    </div>
                    
                    <select
                      value={group.kieuY}
                      onChange={(e) => updateLocalGroupKieuY(group.id, e.target.value)}
                      disabled={group.items.length === 1}
                      className="flex-1 text-sm p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                    >
                      <option value="chung">Chung 1 đề bài</option>
                      <option value="doc_lap">Các ý độc lập</option>
                    </select>

                    <div className="text-xs text-slate-500 flex-1 truncate" title={group.chuDe}>
                      Chủ đề: <strong className="text-slate-600">{group.chuDe}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleCopyExamPrompt}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-all ${isCopied ? 'bg-green-600 scale-105' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:scale-105'}`}
            >
              {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              {isCopied ? 'Đã Copy Lệnh' : 'Copy Lệnh Ma Trận'}
            </button>

            <details className="w-full mt-4 group">
              <summary className="text-sm font-semibold text-blue-700 cursor-pointer text-center hover:text-blue-800 list-none flex items-center justify-center gap-2">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                Xem chi tiết siêu lệnh (Prompt) sẽ gửi cho AI
              </summary>
              <div className="mt-3 bg-white border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2 italic">
                  * Hệ thống đã tự động tính toán số câu, mức độ nhận thức và tên Đơn vị kiến thức cho từng câu dựa vào bảng Ma trận bạn đã tạo. Bạn có thể kiểm tra chi tiết lệnh dưới đây:
                </p>
                <textarea
                  readOnly
                  className="w-full h-[300px] p-3 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded outline-none resize-y"
                  value={generatedPrompt}
                />
              </div>
            </details>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-semibold text-slate-700">Dán Đề thi AI đã biên soạn vào đây:</label>
          <textarea
            className="w-full min-h-[400px] p-6 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-slate-800 leading-relaxed transition-all resize-y shadow-inner font-mono text-sm"
            placeholder="[Dán kết quả AI trả về vào đây...]"
            value={examContent}
            onChange={(e) => setExamContent(e.target.value)}
          />

          {parseError && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex justify-center mt-2">
            <button
              onClick={handleParseExam}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Wand2 size={20} />
              Bóc tách câu hỏi
            </button>
          </div>
        </div>

        {draftQuestions.length > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-xl p-6 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                Danh sách câu hỏi nháp
              </h3>
              <span className="text-sm font-semibold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {draftQuestions.length} câu chưa đẩy
              </span>
            </div>

            {availableSlots.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <AlertTriangle size={16} className="inline mr-1" />
                Tất cả ô trong Khung Đề đã được điền. Hãy xóa bớt ô đã điền hoặc thêm câu hỏi vào Ma trận để có ô trống mới.
              </div>
            )}

            <div className="flex items-center justify-between mb-4 p-3 bg-white/70 border border-indigo-200 rounded-lg">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.length === draftQuestions.length && draftQuestions.length > 0}
                    onChange={() => {
                      if (selectedDrafts.length === draftQuestions.length) setSelectedDrafts([]);
                      else setSelectedDrafts(draftQuestions.map((_, i) => i));
                    }}
                    className="w-5 h-5 rounded border-2 border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <span className="text-sm font-semibold text-slate-700">Chọn tất cả</span>
                </label>
                {selectedDrafts.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    Đã chọn: {selectedDrafts.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkPush}
                  disabled={selectedDrafts.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${selectedDrafts.length > 0
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  <CheckSquare size={18} />
                  Đẩy {selectedDrafts.length > 0 ? selectedDrafts.length : ''} câu
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedDrafts.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${selectedDrafts.length > 0
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="Xóa các câu đã chọn khỏi danh sách nháp"
                >
                  <Trash2 size={18} />
                  Xóa {selectedDrafts.length > 0 ? selectedDrafts.length : ''} câu
                </button>
                <button
                  onClick={handleOverrideAll}
                  disabled={draftQuestions.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${draftQuestions.length > 0
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="Thay thế toàn bộ Khung Đề hiện tại bằng các câu hỏi Nháp này"
                >
                  <AlertTriangle size={18} />
                  Nạp & Ghi đè toàn bộ
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
              {draftQuestions.map((q, idx) => (
                <DraftQuestionCard
                  key={`${q.loaiCauHoi}-${q.soCau}-${idx}`}
                  question={q}
                  index={idx}
                  availableSlots={availableSlots}
                  onPush={pushToExamSlot}
                  isSelected={selectedDrafts.includes(idx)}
                  onToggleSelect={handleToggleSelect}
                  onDelete={handleDeleteOne}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}