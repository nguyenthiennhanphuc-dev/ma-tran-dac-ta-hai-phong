// TÃªn file: src/components/Step5_AIGenerator.jsx
import React, { useState, useMemo } from 'react';
import { useQuickStore as useExamStore } from '../../store/useQuickStore';
import { Copy, FileText, CheckCircle2, Wand2, AlertTriangle, ArrowUpCircle, Trash2, CheckSquare } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import ClientGraph from '../ClientGraph';

// =============================================================================
// [BÆ¯á»šC 1] Tá»ª ÄIá»‚N PHONG CÃCH RA Äá»€
// =============================================================================
export const STYLE_DICTIONARY = {
  "thuc_te": "Báº®T BUá»˜C lá»“ng ghÃ©p bá»‘i cáº£nh thá»±c táº¿ Ä‘á»i sá»‘ng (nhÆ° mua sáº¯m, tÃ­nh tiá»n, Ä‘o Ä‘áº¡c, khoa há»c) vÃ o cÃ¢u há»i.",
  "lien_mon": "Báº®T BUá»˜C tÃ­ch há»£p dá»¯ kiá»‡n liÃªn mÃ´n (nhÆ° Lá»‹ch sá»­, Äá»‹a lÃ½ Viá»‡t Nam, VÄƒn há»c) vÃ o bÃ i toÃ¡n.",
  "hai_huoc": "HÃ£y thiáº¿t káº¿ cÃ¢u há»i vá»›i tÃ¬nh huá»‘ng hÃ i hÆ°á»›c, dÃ­ dá»m, sá»­ dá»¥ng tÃªn cÃ¡c nhÃ¢n váº­t Ä‘ang báº¯t trend trÃªn máº¡ng xÃ£ há»™i hoáº·c truyá»‡n tranh.",
  "thuan_tinh_toan": "ÄÃ¢y lÃ  cÃ¢u há»i thuáº§n tÃ­nh toÃ¡n, kiá»ƒm tra ká»¹ nÄƒng biáº¿n Ä‘á»•i. KHÃ”NG cáº§n lá»“ng ghÃ©p lá»i vÄƒn thá»±c táº¿."
};

const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{content}</Latex>;
};

// =============================================================================
// HÃ€M BÃ“C TÃCH Äá»€ THI NHÃP: parseExamDraft(rawText)
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
      .replace(/\$\s*\^\\circ C\s*\$/g, 'Â°C')
      .replace(/\$\s*\\degree C\s*\$/g, 'Â°C')
      .replace(/\$\s*t\^o\s*\$/g, 'tÂ°')
      .replace(/\$\s*t\^\\circ\s*\$/g, 'tÂ°')
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
      if (/cÃ¢u\s*\d+/i.test(stripped)) return -1;
      if (stripped.length > 150) return -1;
      if (/(?:loáº¡i\s*4|pháº§n\s*(?:iv|4)\b|tá»±\s*luáº­n)/i.test(stripped)) return 4;
      if (/(?:loáº¡i\s*3|pháº§n\s*(?:iii|3)\b|tráº£\s*lá»i\s*ngáº¯n)/i.test(stripped)) return 3;
      if (/(?:loáº¡i\s*2|pháº§n\s*(?:ii|2)\b|Ä‘Ãºng\s*[\/.]?\s*sai)/i.test(stripped)) return 2;
      if (/(?:loáº¡i\s*1|pháº§n\s*(?:i|1)\b|nhiá»u\s*(?:lá»±a\s*chá»n|phÆ°Æ¡ng\s*Ã¡n)|tráº¯c\s*nghiá»‡m\s*nhiá»u)/i.test(stripped)) return 1;
      return -1;
    };

    const cauRegex = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b(?:\s*\([^)]*\))*(?:\s*[:.\)\]])?(?:\*\*|__)?/i;

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
      const loai = block.loai;

      try {
        let parsed = [];
        if (loai === 1) parsed = parseLoai1(blockText);
        else if (loai === 2) parsed = parseLoai2(blockText);
        else if (loai === 3) parsed = parseLoai3(blockText); // ÄÃƒ NÃ‚NG Cáº¤P BÃ“C TÃCH LOáº I 3
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
        console.error('[parseExamDraft] Lá»—i parse CÃ¢u ' + block.soCau + ' (Loáº¡i ' + loai + '):', e);
      }
    }

  } catch (error) {
    console.error('parseExamDraft: Lá»—i khi bÃ³c tÃ¡ch Ä‘á» thi ->', error);
  }

  return results;
}

// -----------------------------------------------------------------------------
// LOáº I 1: TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN (A, B, C, D)
// -----------------------------------------------------------------------------
function parseLoai1(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b/gi) || [];

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      let noiDung = p;
      let prefix = '';
      const metaMatch = noiDung.match(/^\s*\(([^)]*)\)\s*[:.]?\s*/i);
      if (metaMatch) {
        prefix = `[${metaMatch[1]}] `;
        noiDung = noiDung.replace(metaMatch[0], '');
      }

      const noiDungMatch = noiDung.match(/^([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?A[.\)]\s*)/i);
      noiDung = noiDungMatch ? prefix + noiDungMatch[1].trim() : prefix + noiDung.trim();

      const dapAnA = p.match(/(?:^|\n)\s*(?:\*\*|__)?A[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?B[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnB = p.match(/(?:^|\n)\s*(?:\*\*|__)?B[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?C[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnC = p.match(/(?:^|\n)\s*(?:\*\*|__)?C[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?D[.\)]\s*)/i)?.[1]?.trim() || '';
      const dapAnD = p.match(/(?:^|\n)\s*(?:\*\*|__)?D[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?ÄÃ¡p Ã¡n)/i)?.[1]?.trim() || '';

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄÃ¡p Ã¡n(?: Ä‘Ãºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thÃ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 1, soCau, noiDung, dapAnA, dapAnB, dapAnC, dapAnD, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 1:', e); }
  });
  return questions;
}

const Y_MARKER = (letter) =>
  new RegExp(`(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ã\\s+|CÃ¢u\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)\\s*(?:\\*\\*|__)?\\s*(?:\\([^)]*\\)\\s*)?`, 'i');

const Y_LOOK = (letter) =>
  `(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ã\\s+|CÃ¢u\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)`;

function extractY(p, letter, nextLetter) {
  const markerRx = Y_MARKER(letter);
  const markerMatch = p.match(markerRx);
  if (!markerMatch) return '';

  const startIdx = p.search(markerRx) + markerMatch[0].length;
  const remaining = p.slice(startIdx);

  const answerBoundaryRx = /(?:^|\n|\s)\*\*\s*(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|HÆ°á»›ng dáº«n|Giáº£i thÃ­ch)[^*]*\*\*|(?:^|\n)\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|Giáº£i thÃ­ch)\s*[:.)\]]?\s*(?:\*\*|__)?/i;

  let content;
  if (nextLetter) {
    const lookaheadRx = new RegExp(Y_LOOK(nextLetter), 'i');
    const endIdx = remaining.search(lookaheadRx);
    content = endIdx >= 0 ? remaining.slice(0, endIdx).trim() : remaining.trim();
  } else {
    const endIdx = remaining.search(answerBoundaryRx);
    content = endIdx >= 0 ? remaining.slice(0, endIdx).trim() : remaining.trim();
    return content;
  }

  const answerIdx = content.search(answerBoundaryRx);
  if (answerIdx >= 0) content = content.slice(0, answerIdx).trim();

  return content;
}

// -----------------------------------------------------------------------------
// LOáº I 2: TRáº®C NGHIá»†M ÄÃšNG/SAI
// -----------------------------------------------------------------------------
function parseLoai2(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b/gi) || [];

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

      const yA = extractY(p, 'a', 'b');
      const yB = extractY(p, 'b', 'c');
      const yC = extractY(p, 'c', 'd');
      const yD = extractY(p, 'd', null);

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄÃ¡p Ã¡n(?: Ä‘Ãºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thÃ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (yA || yB || yC || yD) {
        questions.push({ loaiCauHoi: 2, soCau, noiDung, yA, yB, yC, yD, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 2:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOáº I 3: TRáº¢ Lá»œI NGáº®N â€” ÄÃƒ NÃ‚NG Cáº¤P Äá»˜C Láº¬P Tá»ªNG CÃ‚U (KHÃ”NG a,b,c,d)
// -----------------------------------------------------------------------------
function parseLoai3(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b/gi) || [];

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      let noiDung = p;
      let prefix = '';
      const metaMatch = noiDung.match(/^\s*\(([^)]*)\)\s*[:.]?\s*/i);
      if (metaMatch) {
        prefix = `[${metaMatch[1]}] `;
        noiDung = noiDung.replace(metaMatch[0], '');
      }

      // Cáº¯t bá» pháº§n ÄÃ¡p Ã¡n, Giáº£i thÃ­ch bá»‹ dÃ­nh vÃ o ná»™i dung
      const noiDungMatch = noiDung.match(/^([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n|Tráº£ lá»i|Giáº£i thÃ­ch))/i);
      noiDung = noiDungMatch ? prefix + noiDungMatch[1].trim() : prefix + noiDung.trim();

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄÃ¡p Ã¡n(?: Ä‘Ãºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thÃ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 3, soCau, noiDung, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 3:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOáº I 4: Tá»° LUáº¬N â€” há»— trá»£ cáº£ cÃ¢u 1 Ã½ vÃ  cÃ¢u nhiá»u Ã½ (a, b, c)
// -----------------------------------------------------------------------------
function parseLoai4(text) {
  const questions = [];

  // Pre-scan: extract Kiáº¿n thá»©c from cÃ¢u headers before the split removes them
  const kienThucMap = {};
  const _hdrRx = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b\s*\(([^)]+)\)/gi;
  let _hm;
  while ((_hm = _hdrRx.exec(text)) !== null) {
    const _ktm = _hm[2].match(/Ki[eÃª]n\s*th[uá»©]c:\s*([^,)]+)/i);
    if (_ktm) {
      const _v = _ktm[1].trim();
      if (/h.nh/i.test(_v)) kienThucMap[_hm[1]] = 'hinh_hoc';
      else if (/[Ä‘d].i\s*s/i.test(_v)) kienThucMap[_hm[1]] = 'dai_so';
    }
  }

  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CÃ¢u\s*(\d+)\b/gi) || [];

  // Strip metadata "(Má»©c Ä‘á»™: ..., MÃ£ nÄƒng lá»±c: ...)" khá»i ná»™i dung Ã½
  const stripMeta = (s) => s ? s.replace(/\s*\([^)]*(?:Má»©c Ä‘á»™|MÃ£ nÄƒng lá»±c)[^)]*\)\s*:?\s*/gi, '').trim() : '';

  const calcDiem = (block) => {
    if (!block) return '';
    let total = 0;
    block.split('\n').forEach(line => {
      const pm = line.match(/\|\|\s*([0-9.,]+)/);
      if (pm) { total += parseFloat(pm[1].replace(',', '.')) || 0; return; }
      const pa = line.match(/\(([0-9.,]+)\s*(?:Ä‘iá»ƒm|Ä‘)?\)\s*$/);
      if (pa) total += parseFloat(pa[1].replace(',', '.')) || 0;
    });
    return total > 0 ? (Math.round(total * 100) / 100).toString() : '';
  };

  const answerBdRx = /(?:^|\n)\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n(?:\s+Ã½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i;
  const giaiThichRx = /(?:^|\n)\s*(?:\*\*|__)?Giáº£i thÃ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i;

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      // PhÃ¡t hiá»‡n cÃ¡c Ã½ a), b), c) trong block â€” dÃ¹ng Ä‘á»ƒ tÃ¡ch multi-Ã½
      const yRx = /(?:^|\n)[ \t]*(?:\*\*|__)?([a-c])\)[ \t]+/g;
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

      if (ySegments.length >= 2) {
        // Multi-Ã½: parse tá»«ng Ã½ riÃªng â€” capture intro text before first a)
        const multiYIntro = firstYIndex > 0 ? stripMeta(p.substring(0, firstYIndex).trim()) : '';
        const result = { loaiCauHoi: 4, soCau, noiDung: multiYIntro, kienThuc: kienThucMap[soCau] || '' };
        let totalDiem = 0;
        let giaiThich = '';

        ySegments.forEach(({ label, content }) => {
          const L = label.toUpperCase();

          // TÃ¡ch giáº£i thÃ­ch (láº¥y tá»« Ã½ cuá»‘i cÃ¹ng)
          const gtMatch = content.match(giaiThichRx);
          if (gtMatch && !giaiThich) giaiThich = gtMatch[1].trim();
          const cleanContent = gtMatch ? content.substring(0, content.search(giaiThichRx)).trim() : content.trim();

          // TÃ¡ch ná»™i dung Ã½ vÃ  Ä‘Ã¡p Ã¡n Ã½
          const bdIdx = cleanContent.search(answerBdRx);
          let yNoiDung = bdIdx >= 0 ? cleanContent.substring(0, bdIdx).trim() : cleanContent;
          let yAnswerPart = bdIdx >= 0 ? cleanContent.substring(bdIdx).trim() : '';

          let yDapAn = yAnswerPart.replace(/^\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n(?:\s+Ã½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();

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
        // Single-Ã½: logic cÅ©, chá»‰ bá»• sung stripMeta
        const boundaryIndex = p.search(answerBdRx);
        let noiDung = boundaryIndex >= 0 ? p.substring(0, boundaryIndex).trim() : p.trim();
        let answerPart = boundaryIndex >= 0 ? p.substring(boundaryIndex).trim() : '';

        noiDung = stripMeta(noiDung);

        let dapAn = answerPart.replace(/^\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n(?:\s+Ã½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();
        const gtIdx2 = dapAn.search(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thÃ­ch\s*[:.\)]/i);
        if (gtIdx2 >= 0) dapAn = dapAn.substring(0, gtIdx2).trim();
        const diem = calcDiem(dapAn);
        const gtMatch2 = answerPart.match(giaiThichRx) || p.match(giaiThichRx);
        const giaiThich = gtMatch2 ? gtMatch2[1].trim() : '';

        if (noiDung) questions.push({ loaiCauHoi: 4, soCau, noiDung, dapAn: dapAn || answerPart, diem, giaiThich, kienThuc: kienThucMap[soCau] || '' });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 4:', e); }
  });
  return questions;
}

// Helper: map draft TL question sang cáº¥u trÃºc slot Step4
// - Multi-Ã½ (cÃ³ yB): dÃ¹ng yA/yB/yC, dapAnA/B/C, diemA/B/C
// - Single-Ã½: Ä‘Æ°a noiDung â†’ yA, dapAn â†’ dapAnA
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

const LOAI_LABELS = { 1: 'Tráº¯c nghiá»‡m', 2: 'Tráº¯c nghiá»‡m ÄÃºng/Sai', 3: 'Tráº£ lá»i ngáº¯n', 4: 'Tá»± luáº­n' };
const LOAI_COLORS = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-amber-100 text-amber-800 border-amber-300',
  3: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  4: 'bg-purple-100 text-purple-800 border-purple-300',
};

function cleanYContent(text) {
  if (!text) return text;
  const inlineRx = /\s*\*\*\s*(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|HÆ°á»›ng dáº«n|Giáº£i thÃ­ch)/i;
  const newlineRx = /\n\s*(?:\*\*|__)?(?:ÄÃ¡p Ã¡n Ä‘Ãºng vÃ  biá»ƒu Ä‘iá»ƒm|ÄÃ¡p Ã¡n Ä‘Ãºng|ÄÃ¡p Ã¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|Giáº£i thÃ­ch)\s*[:.)\]]?\s*(?:\*\*|__)?/i;
  const idx1 = text.search(inlineRx);
  const idx2 = text.search(newlineRx);
  let cutIdx = -1;
  if (idx1 >= 0 && idx2 >= 0) cutIdx = Math.min(idx1, idx2);
  else if (idx1 >= 0) cutIdx = idx1;
  else if (idx2 >= 0) cutIdx = idx2;
  return cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text;
}

// =============================================================================
// FALLBACK: Tá»° Äá»˜NG PHÃT HIá»†N HÃ€M Sá» â†’ Táº O METADATA Äá»’ THá»Š CHO MATPLOTLIB
// =============================================================================

/** Chuyá»ƒn biá»ƒu thá»©c toÃ¡n (text/LaTeX) â†’ cÃº phÃ¡p Python/numpy. */
function convertMathToPython(mathExpr) {
  if (!mathExpr) return null;
  let e = mathExpr.trim();
  // Bá» LaTeX format cÆ¡ báº£n
  e = e.replace(/\\left/g, '').replace(/\\right/g, '');
  e = e.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\,/g, ' ');
  // PhÃ¢n sá»‘: \frac{a}{b} â†’ (a)/(b)
  for (let i = 0; i < 3; i++) e = e.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  // LÅ©y thá»«a: x^{n} â†’ x**(n), x^n â†’ x**n
  e = e.replace(/\^\{([^}]+)\}/g, '**($1)');
  e = e.replace(/\^(\d+)/g, '**$1');
  // Unicode superscripts
  e = e.replace(/Â²/g, '**2').replace(/Â³/g, '**3').replace(/â´/g, '**4');
  // CÄƒn báº­c hai
  e = e.replace(/\\sqrt\{([^}]+)\}/g, 'np.sqrt($1)');
  e = e.replace(/âˆš\(([^)]+)\)/g, 'np.sqrt($1)');
  e = e.replace(/âˆš(\w)/g, 'np.sqrt($1)');
  // LÆ°á»£ng giÃ¡c
  e = e.replace(/\\sin/g, 'np.sin').replace(/\\cos/g, 'np.cos').replace(/\\tan/g, 'np.tan');
  e = e.replace(/\bsin\b(?!\w)/g, 'np.sin').replace(/\bcos\b(?!\w)/g, 'np.cos').replace(/\btan\b(?!\w)/g, 'np.tan');
  // Logarit
  e = e.replace(/\\ln/g, 'np.log').replace(/\\log/g, 'np.log10').replace(/\bln\b(?!\w)/g, 'np.log');
  // HÃ m mÅ©: e^x â†’ np.exp(x)
  e = e.replace(/e\*\*\(([^)]+)\)/g, 'np.exp($1)').replace(/e\*\*([x\d])/g, 'np.exp($1)');
  // Trá»‹ tuyá»‡t Ä‘á»‘i
  e = e.replace(/\|([^|]+)\|/g, 'np.abs($1)');
  // Pi
  e = e.replace(/\\pi/g, 'np.pi').replace(/Ï€/g, 'np.pi');
  // NhÃ¢n áº©n: 2x â†’ 2*x, )x â†’ )*x, )( â†’ )*(
  e = e.replace(/(\d)([x(])/g, '$1*$2');
  e = e.replace(/([x)])([x(])/g, '$1*$2');
  e = e.replace(/(\))(\d)/g, '$1*$2');
  e = e.replace(/\s+/g, ' ').trim();
  if (!e.includes('x')) return null;
  return e;
}

/** XÃ¡c Ä‘á»‹nh khoáº£ng x phÃ¹ há»£p dá»±a trÃªn loáº¡i hÃ m. */
function guessXRange(py) {
  if (/np\.sin|np\.cos|np\.tan/.test(py)) return [-7, 7];
  if (/np\.log/.test(py)) return [0.1, 10];
  if (/np\.exp/.test(py)) return [-3, 4];
  if (/x\*\*4|x\*\*\(4\)/.test(py)) return [-3, 3];
  if (/x\*\*3|x\*\*\(3\)/.test(py)) return [-4, 4];
  return [-5, 5];
}

/**
 * Tá»± Ä‘á»™ng phÃ¡t hiá»‡n hÃ m sá»‘ toÃ¡n há»c trong cÃ¢u há»i â†’ táº¡o metadata cho Matplotlib.
 * Há»— trá»£: ToÃ¡n (hÃ m sá»‘, hÃ¬nh há»c Oxy), Váº­t lÃ½ (v-t, s-t, U-I).
 * Chá»‰ kÃ­ch hoáº¡t khi cÃ¢u há»i cÃ³ keyword liÃªn quan.
 */
export function autoDetectGraphMetadata(question) {
  const fields = [question.noiDung, question.yA, question.yB, question.yC, question.yD];
  const allText = fields.filter(Boolean).join('\n');
  if (!allText) return null;

  // â”€â”€ 1. TOÃN: Äá»“ thá»‹ hÃ m sá»‘ â”€â”€
  if (/(?:Ä‘á»“ thá»‹|Ä‘Æ°á»ng cong|báº£ng biáº¿n thiÃªn|cá»±c trá»‹|cá»±c Ä‘áº¡i|cá»±c tiá»ƒu|tiá»‡m cáº­n|hÃ m sá»‘|kháº£o sÃ¡t|biá»ƒu diá»…n)/i.test(allText)) {
    let funcExpr = null, displayTitle = null;
    const latexM = allText.match(/\$\s*y\s*=\s*([^$]+?)\s*\$/i);
    if (latexM) { funcExpr = latexM[1].trim(); displayTitle = `y = ${funcExpr}`; }
    if (!funcExpr) {
      const plainM = allText.match(/(?:hÃ m\s+sá»‘\s+)?y\s*=\s*([^\n,;.]+)/i);
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

  // â”€â”€ 2. Váº¬T LÃ: Äá»“ thá»‹ v-t, s-t, U-I â”€â”€
  if (/(?:Ä‘á»“ thá»‹\s*(?:v[\s-]*t|s[\s-]*t|U[\s-]*I|váº­n tá»‘c|quÃ£ng Ä‘Æ°á»ng|hiá»‡u Ä‘iá»‡n tháº¿)|chuyá»ƒn Ä‘á»™ng\s*(?:tháº³ng|Ä‘á»u|biáº¿n Ä‘á»•i)|gia tá»‘c)/i.test(allText)) {
    // Detect xem lÃ  loáº¡i Ä‘á»“ thá»‹ nÃ o
    let nhanX = 't (s)', nhanY = 'v (m/s)', tieuDe = 'Äá»“ thá»‹ váº­n tá»‘c - thá»i gian';
    if (/s[\s-]*t|quÃ£ng Ä‘Æ°á»ng/i.test(allText)) { nhanY = 's (m)'; tieuDe = 'Äá»“ thá»‹ quÃ£ng Ä‘Æ°á»ng - thá»i gian'; }
    if (/U[\s-]*I|hiá»‡u Ä‘iá»‡n tháº¿/i.test(allText)) { nhanX = 'I (A)'; nhanY = 'U (V)'; tieuDe = 'Äá»“ thá»‹ U-I'; }
    // Tráº£ vá» metadata cÆ¡ báº£n â€” AI nÃªn ghi chi tiáº¿t hÆ¡n qua prompt
    return { loai: 'do_thi_vat_ly', tieuDe, nhanX, nhanY, doanThang: [], diemDacBiet: [] };
  }

  return null;
}

/** TrÃ­ch xuáº¥t metadata "HÃ¬nh áº£nh:" JSON tá»« text (thÆ°á»ng náº±m trong giaiThich). */
export function extractHinhAnhFromText(text) {
  if (!text) return null;
  // TÃ¬m vá»‹ trÃ­ dÃ²ng "HÃ¬nh áº£nh:" trong text
  const headerMatch = text.match(/(?:^|\n)\s*(?:\*\*)?HÃ¬nh áº£nh(?:\*\*)?[:\s]*/im);
  if (!headerMatch) return null;
  const headerStart = text.indexOf(headerMatch[0]);
  const jsonStart = headerStart + headerMatch[0].length;
  // TÃ¬m kÃ½ tá»± '{' Ä‘áº§u tiÃªn sau header
  const braceStart = text.indexOf('{', jsonStart);
  if (braceStart < 0) return null;
  // Äáº¿m ngoáº·c {} Ä‘á»ƒ tÃ¬m vá»‹ trÃ­ káº¿t thÃºc JSON (há»— trá»£ nested objects)
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
  }
  if (braceEnd < 0) return null;
  const jsonStr = text.substring(braceStart, braceEnd + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.loai) {
      const fullMatch = text.substring(headerStart, braceEnd + 1);
      return { hinhAnh: parsed, cleanedText: text.replace(fullMatch, '').trim() };
    }
  } catch (e) { /* JSON parse failed â€” skip */ }
  return null;
}

// =============================================================================
// COMPONENT PHá»¤: GraphPreview â€” Hiá»ƒn thá»‹ Ä‘á»“ thá»‹ (Client-side Canvas)
// =============================================================================

function GraphPreview({ hinhAnh }) {
  if (!hinhAnh || !hinhAnh.loai) return null;
  return <ClientGraph hinhAnh={hinhAnh} maxHeight={300} />;
}

// =============================================================================
// COMPONENT PHá»¤: DraftQuestionCard
// =============================================================================
function DraftQuestionCard({ question, index, availableSlots, onPush, isSelected, onToggleSelect, onDelete }) {
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (question._fromSimilar && question._originalSlotKey) {
      const exists = availableSlots.some(s => s.key === question._originalSlotKey);
      if (exists) return question._originalSlotKey;
    }
    return '';
  });

  const originalSlotLabel = question._fromSimilar && question._originalSlotKey 
    ? availableSlots.find(s => s.key === question._originalSlotKey)?.label?.replace(/ âœ…$/, '') 
    : null;

  const handlePush = () => {
    if (!selectedSlot) {
      alert('Vui lÃ²ng chá»n Ã´ Ä‘Ã­ch trÆ°á»›c khi Ä‘áº©y!');
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
    // Báº£o toÃ n metadata hÃ¬nh áº£nh khi Ä‘áº©y lÃªn Khung Äá»
    if (question.hinhAnh) {
      mappedData.hinhAnh = question.hinhAnh;
    }

    onPush(selectedSlot, mappedData, question);
  };

  const isMultiY = question.loaiCauHoi === 2; // Chá»‰ ÄÃºng/Sai lÃ  Ä‘a Ã½ a,b,c,d

  return (
    <div className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative ${LOAI_COLORS[question.loaiCauHoi] || 'bg-gray-100 text-gray-800 border-gray-300'} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={() => onDelete(index)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white transition-colors shadow-sm"
          title="XÃ³a cÃ¢u nÃ y khá»i danh sÃ¡ch nhÃ¡p"
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
          <span className="text-xs font-semibold text-slate-600">Chá»n</span>
        </label>
      </div>

      <div className="flex items-center gap-2 mb-2 pr-16">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 border shadow-sm">
          Loáº¡i {question.loaiCauHoi}
        </span>
        <span className="text-xs font-semibold opacity-80">
          {LOAI_LABELS[question.loaiCauHoi] || 'KhÃ´ng rÃµ'}
        </span>
        <span className="ml-auto text-xs font-bold opacity-50">NhÃ¡p #{index + 1}</span>
      </div>

      {originalSlotLabel && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 shadow-sm">
            <span>ðŸ”„</span> Äá» thay tháº¿ cho {originalSlotLabel}
          </span>
        </div>
      )}

      {(() => {
        const rawText = question.loaiCauHoi === 1 || question.loaiCauHoi === 3 ? (question.noiDung || '') : (question.loaiCauHoi === 2 ? (question.noiDung || question.yA || '') : (question.yA || ''));
        const metaMatch = rawText.match(/\(([^)]*Chá»§ Ä‘á»:[^)]*)\)/i);
        if (metaMatch) {
          const metaStr = metaMatch[1];
          const chuDeMatch = metaStr.match(/Chá»§ Ä‘á»:\s*([^,)]+)/i);
          const mucDoMatch = metaStr.match(/Má»©c Ä‘á»™:\s*([^,)]+)/i);
          const maNlMatch = metaStr.match(/MÃ£ nÄƒng lá»±c:\s*([^,)]+)/i);
          return (
            <div className="mb-2 px-3 py-1.5 bg-white/60 rounded-lg border border-current/10">
              <p className="text-xs font-bold text-slate-800">
                ðŸ“Œ {chuDeMatch ? chuDeMatch[1].trim() : 'ChÆ°a rÃµ'}
                {mucDoMatch && <span className="ml-2 font-semibold text-indigo-600">({mucDoMatch[1].trim()})</span>}
                {maNlMatch && <span className="ml-2 font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">[{maNlMatch[1].trim()}]</span>}
              </p>
            </div>
          );
        }
        return null;
      })()}

      {(() => {
        const cleanNoidung = (text) => text ? text.replace(/^(?:\*\*|__)?CÃ¢u\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '') : '';
        return (
          <>
            {question.loaiCauHoi === 1 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  CÃ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                  <div><strong>A.</strong> <MathText content={question.dapAnA} /></div>
                  <div><strong>B.</strong> <MathText content={question.dapAnB} /></div>
                  <div><strong>C.</strong> <MathText content={question.dapAnC} /></div>
                  <div><strong>D.</strong> <MathText content={question.dapAnD} /></div>
                </div>
              </>
            )}

            {/* NÃ‚NG Cáº¤P: HIá»‚N THá»Š LOáº I 3 TRáº¢ Lá»œI NGáº®N NHÆ¯ 1 CÃ‚U Há»ŽI Äá»˜C Láº¬P */}
            {question.loaiCauHoi === 3 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  CÃ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                </p>
              </>
            )}

            {isMultiY && question.loaiCauHoi !== 4 && (
              <>
                {question.noiDung && (
                  <p className="font-semibold mb-2 text-slate-900 whitespace-pre-wrap">
                    CÃ¢u {index + 1}: <MathText content={question.noiDung} />
                  </p>
                )}
                {!question.noiDung && <p className="font-semibold mb-2 text-slate-900">CÃ¢u {index + 1}:</p>}
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
                  /* Multi-Ã½: hiá»ƒn thá»‹ tá»«ng Ã½ riÃªng */
                  <>
                    <p className="font-semibold mb-2 text-slate-900">
                      CÃ¢u {index + 1}: <span className="text-xs font-normal text-slate-500">(Tá»± luáº­n nhiá»u Ã½)</span>
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">ðŸ“ HÃ¬nh há»c</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">âˆ‘ Äáº¡i sá»‘</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">ðŸ“Œ Tá»•ng Ä‘iá»ƒm: {question.diem} Ä‘iá»ƒm</div>}
                    {question.noiDung && (
                      <div className="text-sm text-slate-800 mb-3 bg-purple-50 border border-purple-200 p-2 rounded whitespace-pre-wrap">
                        <span className="text-xs font-bold text-purple-700 block mb-1">ðŸ“‹ Äá» bÃ i chung:</span>
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
                          <span className="text-xs text-red-600 font-bold">ðŸ“Œ {question[`diem${L}`]} Ä‘iá»ƒm</span>
                        )}
                        {question[`dapAn${L}`] && (
                          <div className="mt-1 space-y-0.5 text-xs text-slate-800 bg-white/40 p-2 rounded">
                            <div className="font-bold text-green-700 mb-0.5">ÄÃ¡p Ã¡n Ã½ {L.toLowerCase()}:</div>
                            {question[`dapAn${L}`].split('\n').filter(l => l.trim()).map((line, li) => (
                              <div key={li} className="ml-2"><MathText content={line} /></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  /* Single-Ã½: giá»¯ nguyÃªn nhÆ° cÅ© */
                  <>
                    <p className="font-semibold mb-2 leading-relaxed text-slate-900 whitespace-pre-wrap">
                      CÃ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">ðŸ“ HÃ¬nh há»c</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">âˆ‘ Äáº¡i sá»‘</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">ðŸ“Œ Äiá»ƒm: {question.diem} Ä‘iá»ƒm</div>}
                    {question.dapAn && (
                      <div className="space-y-1 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                        <div className="font-bold text-green-700 mb-1">HÆ°á»›ng dáº«n cháº¥m:</div>
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
                <span className="font-bold text-slate-800">ÄÃ¡p Ã¡n Ä‘Ãºng:</span>{' '}
                <span className="font-mono text-red-600 font-bold whitespace-pre-wrap"><MathText content={question.dapAnDung} /></span>
              </div>
            )}

            <p className="text-sm opacity-90 mb-4 bg-white/40 p-2 rounded whitespace-pre-wrap">
              <strong className="text-slate-800">Giáº£i thÃ­ch:</strong> <MathText content={question.giaiThich} />
            </p>

            {/* Hiá»ƒn thá»‹ Ä‘á»“ thá»‹ Matplotlib náº¿u cÃ¢u há»i cÃ³ hinhAnh */}
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
          <option value="">-- Chá»n Ã´ Ä‘Ã­ch trong Khung Äá» --</option>
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
          Äáº©y lÃªn Khung Äá»
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT CHÃNH: Step5_AIGenerator
// =============================================================================
export default function Step5_AIGenerator() {
  const { matrix, config, examConfig, tuLuanConfig, examHeader, draftQuestions, setDraftQuestions, examSlots, pushToExamSlot } = useExamStore();
  const [examContent, setExamContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [parseError, setParseError] = useState('');
  const [selectedDrafts, setSelectedDrafts] = useState([]);

  const hasManualTLConfig = tuLuanConfig?.enabled && tuLuanConfig?.questions?.length > 0 && tuLuanConfig.questions.some(q => q.subItems?.length > 0);

  const handleCopyExamPrompt = async () => {
    let prompt = `Báº¡n lÃ  má»™t chuyÃªn gia ra Ä‘á» thi xuáº¥t sáº¯c. Dá»±a vÃ o TÃ€I LIá»†U SÃCH GIÃO KHOA/BÃ€I GIáº¢NG tÃ´i Ä‘Ã­nh kÃ¨m, hÃ£y biÃªn soáº¡n má»™t Äá»€ KIá»‚M TRA ÄÃNH GIÃ NÄ‚NG Lá»°C BÃM SÃT MA TRáº¬N Báº¢N Äáº¶C Táº¢ YÃŠU Cáº¦U Cáº¦N Äáº T VÃ€ KHUNG Äá»€ KIá»‚M TRA.\n`;

    prompt += `\nâš ï¸ QUY Táº®C TRÃŒNH BÃ€Y CÃ”NG THá»¨C TOÃN/LÃ/HÃ“A (Báº®T BUá»˜C):\n`;
    prompt += `- CÃ”NG THá»¨C TOÃN/HÃ“A: TUYá»†T Äá»I KHÃ”NG dÃ¹ng Ä‘á»‹nh dáº¡ng LaTeX ($...$) cho cÃ¡c mÅ©i tÃªn pháº£n á»©ng hÃ³a há»c (->, =>, <=>) vÃ  kÃ­ hiá»‡u nhiá»‡t Ä‘á»™ (Ä‘á»™ C, ^oC). Báº¯t buá»™c viáº¿t chÃºng dÆ°á»›i dáº¡ng text thÆ°á»ng.\n`;
    prompt += `- Vá»›i cÃ´ng thá»©c HÃ³a há»c, Váº­t lÃ½ Ä‘Æ¡n giáº£n: Sá»¬ Dá»¤NG kÃ½ tá»± UNICODE (VÃ­ dá»¥: Hâ‚‚SOâ‚„, FeÂ²âº, Î±, Î”t). KhÃ´ng dÃ¹ng mÃ£ code cho loáº¡i nÃ y.\n`;
    prompt += `- CHá»ˆ KHI cÃ³ cÃ´ng thá»©c ToÃ¡n há»c phá»©c táº¡p (phÃ¢n sá»‘, cÄƒn thá»©c, há»‡ phÆ°Æ¡ng trÃ¬nh, tÃ­ch phÃ¢n...): Má»›i sá»­ dá»¥ng mÃ£ LaTeX vÃ  Báº®T BUá»˜C bá»c trong cáº·p dáº¥u $...$ (vÃ­ dá»¥: $\\frac{1}{2}$) hoáº·c $$...$$ cho cÃ´ng thá»©c Ä‘á»©ng 1 dÃ²ng.\n\n`;

    prompt += `ðŸ–¼ï¸ðŸ–¼ï¸ðŸ–¼ï¸ YÃŠU Cáº¦U HÃŒNH áº¢NH â€” Báº®T BUá»˜C (Äá»ŒC Ká»¸ TRÆ¯á»šC KHI LÃ€M):\\n`;
    prompt += `Trong Ä‘á» thi nÃ y, Báº N PHáº¢I táº¡o Tá»I THIá»‚U 1-2 cÃ¢u há»i cÃ³ dÃ²ng "HÃ¬nh áº£nh:" kÃ¨m JSON metadata.\\n`;
    prompt += `Há»‡ thá»‘ng sáº½ Tá»° Äá»˜NG váº½ hÃ¬nh báº±ng Python Matplotlib tá»« JSON báº¡n cung cáº¥p.\\n`;
    prompt += `ðŸ“ CÃ¡ch ghi: Ngay SAU dÃ²ng "Giáº£i thÃ­ch:" cá»§a cÃ¢u há»i Ä‘Ã³, thÃªm 1 dÃ²ng má»›i báº¯t Ä‘áº§u báº±ng "HÃ¬nh áº£nh:" rá»“i ghi JSON.\\n`;
    prompt += `ðŸ“ VÃ­ dá»¥ biá»ƒu Ä‘á»“ cá»™t: HÃ¬nh áº£nh: {"loai":"bieu_do_cot","tieuDe":"DÃ¢n sá»‘ ÄNÃ","nhanX":"Quá»‘c gia","nhanY":"Triá»‡u ngÆ°á»i","nhan":["VN","ThÃ¡i Lan","Indonesia"],"giaTri":[100,72,275]}\\n`;
    prompt += `ðŸ“ VÃ­ dá»¥ Ä‘á»“ thá»‹ hÃ m sá»‘: HÃ¬nh áº£nh: {"loai":"do_thi_ham_so","hamSo":"x**2 - 4*x + 3","xRange":[-2,6],"tieuDe":"y = xÂ² - 4x + 3"}\\n`;
    prompt += `ðŸ“ VÃ­ dá»¥ biá»ƒu Ä‘á»“ trÃ²n: HÃ¬nh áº£nh: {"loai":"bieu_do_tron","tieuDe":"CÆ¡ cáº¥u kinh táº¿","nhan":["NÃ´ng nghiá»‡p","CÃ´ng nghiá»‡p","Dá»‹ch vá»¥"],"giaTri":[12,38,50]}\\n`;
    prompt += `âš ï¸ Náº¾U Báº N KHÃ”NG THÃŠM ÃT NHáº¤T 1 CÃ‚U CÃ“ "HÃ¬nh áº£nh:", Äá»€ THI Sáº¼ Bá»Š TRáº¢ Láº I.\\n\\n`;

    prompt += `âš ï¸ YÃŠU Cáº¦U Tá»I QUAN TRá»ŒNG Vá»€ Äá»ŠNH Dáº NG (FORMAT):
Báº¡n Báº®T BUá»˜C pháº£i trÃ¬nh bÃ y tá»«ng cÃ¢u há»i theo Ä‘Ãºng KHUÃ”N MáºªU dÆ°á»›i Ä‘Ã¢y Ä‘á»ƒ há»‡ thá»‘ng pháº§n má»m cá»§a tÃ´i Ä‘á»c Ä‘Æ°á»£c. 
Äáº·c biá»‡t lÆ°u Ã½: Pháº£i ghi rÃµ (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MÃ£ nÄƒng lá»±c: ...) á»Ÿ trong má»—i Ã½ nhá». Trong Ä‘Ã³ "MÃ£ nÄƒng lá»±c" lÃ  mÃ£ cá»¥ thá»ƒ tÃ´i sáº½ cung cáº¥p cho tá»«ng cÃ¢u á»Ÿ pháº§n Ma tráº­n bÃªn dÆ°á»›i (vÃ­ dá»¥: HH1.1, TD1.2, ...).

=== KHUÃ”N MáºªU Tá»ªNG LOáº I CÃ‚U Há»ŽI ===

[LOáº I 1: TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN] (Má»—i cÃ¢u Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiCauP1} Ä‘iá»ƒm)
CÃ¢u [Sá»‘] (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MÃ£ nÄƒng lá»±c: ...): [Ná»™i dung cÃ¢u há»i]
A. [Lá»±a chá»n A]
B. [Lá»±a chá»n B]
C. [Lá»±a chá»n C]
D. [Lá»±a chá»n D]
ÄÃ¡p Ã¡n Ä‘Ãºng: [Chá»‰ ghi chá»¯ cÃ¡i A, B, C hoáº·c D]
Giáº£i thÃ­ch: [Giáº£i thÃ­ch ngáº¯n gá»n]

[LOáº I 2: TRáº®C NGHIá»†M ÄÃšNG/SAI â€” CHÃ™M CÃ‚U Há»ŽI] (Má»—i Ã½ Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiYP2} Ä‘iá»ƒm)
âš ï¸ QUAN TRá»ŒNG: Má»—i cÃ¢u ÄÃºng/Sai Báº®T BUá»˜C cÃ³ 1 Äá»€ BÃ€I CHUNG á»Ÿ Ä‘áº§u. Sau Ä‘Ã³ phÃ¡t triá»ƒn 4 Ã½ a,b,c,d.
âš ï¸ YÃŠU Cáº¦U PHÃ‚N Má»¨C Äá»˜ 4 Ã: Ã a) má»©c Nháº­n biáº¿t, Ã½ b) má»©c ThÃ´ng hiá»ƒu, Ã½ c) má»©c Váº­n dá»¥ng, Ã½ d) má»©c Váº­n dá»¥ng cao.
${config.groupTfByTopic ? 'âš ï¸ Äáº¶C BIá»†T: Cháº¿ Ä‘á»™ "Gom nhÃ³m theo Chá»§ Ä‘á»" Ä‘ang báº­t. 4 má»‡nh Ä‘á» a, b, c, d cá»§a má»—i cÃ¢u ÄÃºng/Sai nÃªn láº¥y kiáº¿n thá»©c tá»« CÃC BÃ€I Há»ŒC KHÃC NHAU trong cÃ¹ng chá»§ Ä‘á», táº¡o thÃ nh cÃ¢u há»i kiá»ƒm tra kiáº¿n thá»©c tá»•ng há»£p cá»§a cáº£ chá»§ Ä‘á».\\n' : ''}CÃ¢u [Sá»‘] (Chá»§ Ä‘á»: ...): [Ná»™i dung Ä‘á» bÃ i chung / TÃ¬nh huá»‘ng]
a) (Má»©c Ä‘á»™: Nháº­n biáº¿t, MÃ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» a]
b) (Má»©c Ä‘á»™: ThÃ´ng hiá»ƒu, MÃ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» b]
c) (Má»©c Ä‘á»™: Váº­n dá»¥ng, MÃ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» c]
d) (Má»©c Ä‘á»™: Váº­n dá»¥ng cao, MÃ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» d]
ÄÃ¡p Ã¡n Ä‘Ãºng: a-Ä, b-S, c-Ä, d-S
Giáº£i thÃ­ch: [Giáº£i thÃ­ch ngáº¯n gá»n vÃ¬ sao Ä‘Ãºng/sai]
`;
    if (config.hasTraLoiNgan) {
      prompt += `[LOáº I 3: TRáº¢ Lá»œI NGáº®N] (Má»—i cÃ¢u Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiYP3} Ä‘iá»ƒm)
âš ï¸ QUY Táº®C THÃ‰P: Báº®T BUá»˜C pháº£i Ä‘áº·t cÃ¢u há»i sao cho ÄÃP ÃN CUá»I CÃ™NG CHá»ˆ LÃ€ Má»˜T CON Sá» Cá»¤ THá»‚ (vÃ­ dá»¥: 15, 0.5, 100...). Tuyá»‡t Ä‘á»‘i khÃ´ng há»i lÃ½ thuyáº¿t yÃªu cáº§u tráº£ lá»i báº±ng chá»¯ dÃ i dÃ²ng. KHÃ”NG gom thÃ nh cÃ¡c Ã½ a, b, c, d. Má»—i cÃ¢u tráº£ lá»i ngáº¯n lÃ  má»™t CÃ¢u há»i Ä‘á»™c láº­p.
âš ï¸ GIá»šI Háº N ÄÃP ÃN: Con sá»‘ Ä‘Ã¡p Ã¡n Tá»I ÄA 4 CHá»® Sá» (báº¥t ká»ƒ cÃ³ dáº¥u pháº©y/cháº¥m tháº­p phÃ¢n hay khÃ´ng). VÃ­ dá»¥ há»£p lá»‡: 5, 12, 150, 1500, 0.25, 12.5. VÃ­ dá»¥ KHÃ”NG há»£p lá»‡: 12345, 100000.
âš ï¸ NGOáº I Lá»† mÃ´n XÃ£ há»™i (Sá»­, Äá»‹a, GDCD, VÄƒn, Tiáº¿ng Anh): Náº¿u cÃ¢u há»i khÃ´ng thá»ƒ Ä‘á»‹nh lÆ°á»£ng báº±ng sá»‘, Ä‘Ã¡p Ã¡n CÃ“ THá»‚ lÃ  1 tá»«/cá»¥m tá»« ngáº¯n (tá»‘i Ä    prompt += `\n--- CHI TIáº¾T MA TRáº¬N Äá»€ THI Báº N Cáº¦N SOáº N (TUÃ‚N THá»¦ 100% Sá» LÆ¯á»¢NG NÃ€Y) ---\n\n`;

    const extractLevelYccd = (fullYccd, level) => {
      if (!fullYccd) return '';
      const levelMap = {
        biet: 'Nháº­n biáº¿t',
        hieu: 'ThÃ´ng hiá»ƒu',
        vanDung: 'Váº­n dá»¥ng',
        vanDungCao: 'Váº­n dá»¥ng cao'
      };
      const targetLabel = levelMap[level];
      if (!targetLabel) return fullYccd;

      const regex = new RegExp(`\\*\\s*${targetLabel}\\s*:\\s*([\\s\\S]*?)(?=\\*\\s*(Nháº­n biáº¿t|ThÃ´ng hiá»ƒu|Váº­n dá»¥ng|Váº­n dá»¥ng cao)\\s*:|$)`, 'i');
      const match = fullYccd.match(regex);
      if (match) {
        return match[1].trim();
      }
      return fullYccd;
    };

    let hasContent = false;
    let detailStructureText = `Báº¡n pháº£i ra Ä‘á» bÃ¡m sÃ¡t khung cáº¥u trÃºc sau Ä‘Ã¢y:\n\n`;

    // Helper: auto-suy mÃ£ HH/TD tá»« YCCÄ khi indicatorMap rá»—ng
    const monHoc = examHeader?.monHoc || '';
    const isHoaMon = /hÃ³a|hoÃ¡/i.test(monHoc);
    const isToanMon = /toÃ¡n|toan/i.test(monHoc);
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

    const toCode = (m) => m ? (typeof m === 'object' ? (m.code || '') : m) : '';
    const readInds = (map, type, level, count) => {
      if (!map) return [];
      return Array.from({length: count}, (_, i) => toCode(map[`${type}_${level}_${i}`])).filter(Boolean);
    };

    const resolveInds = (map, type, level, count) => {
      const codes = readInds(map, type, level, count);
      if (codes.length > 0) return [...new Set(codes)];
      const auto = getAutoCode(level);
      return auto ? [auto] : [];
    };

    // 1. PhÃ¢n bá»• Pháº§n I: Tráº¯c nghiá»‡m nhiá»u lá»±a chá»n
    let q1Idx = 1;
    let phan1Text = `[LOáº I 1: TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN] (Má»—i cÃ¢u Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiCauP1} Ä‘iá»ƒm)\n`;
    let hasPhan1 = false;

    matrix.forEach((topic, tIdx) => {
      const tenChuDe = topic.tenChuDe || `Chá»§ Ä‘á» ${tIdx + 1}`;
      (topic.donViKienThuc || []).forEach((dv) => {
        const mcq = dv.nhieuLuaChon || { biet: 0, hieu: 0, vanDung: 0 };
        const tenDVKT = dv.noiDung || 'ChÆ°a rÃµ';

        ['biet', 'hieu', 'vanDung'].forEach((level) => {
          const count = Number(mcq[level]) || 0;
          for (let i = 0; i < count; i++) {
            hasContent = true;
            hasPhan1 = true;
            const levelLabel = level === 'biet' ? 'Nháº­n biáº¿t' : level === 'hieu' ? 'ThÃ´ng hiá»ƒu' : 'Váº­n dá»¥ng';
            const yccd = extractLevelYccd(dv.yeuCauCanDat, level) || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', level, count);
            const indLabel = inds.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${inds.join(', ')}` : '';

            phan1Text += `CÃ¢u ${q1Idx} (Má»©c Ä‘á»™: ${levelLabel}, Chá»§ Ä‘á»/ChÆ°Æ¡ng: ${tenChuDe}, BÃ i/ÄÆ¡n vá»‹: ${tenDVKT}${indLabel}): [Soáº¡n cÃ¢u há»i Tráº¯c nghiá»‡m nhiá»u lá»±a chá»n A, B, C, D]\n`;
            phan1Text += `ðŸ‘‰ YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccd}\n`;
            q1Idx++;
          }
        });
      });
    });
    if (hasPhan1) {
      detailStructureText += phan1Text + `\n`;
    }

    // 2. PhÃ¢n bá»• Pháº§n II: Tráº¯c nghiá»‡m ÄÃºng/Sai
    let q2Idx = 1;
    let phan2Text = `[LOáº I 2: TRáº®C NGHIá»†M ÄÃšNG/SAI] (Má»—i Ã½ Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiYP2} Ä‘iá»ƒm)\n`;
    let hasPhan2 = false;

    matrix.forEach((topic, tIdx) => {
      const tenChuDe = topic.tenChuDe || `Chá»§ Ä‘á» ${tIdx + 1}`;
      (topic.donViKienThuc || []).forEach((dv) => {
        const ds = dv.dungSai || { biet: 0, hieu: 0, vanDung: 0 };
        const count = Number(ds.biet) || 0;
        const tenDVKT = dv.noiDung || 'ChÆ°a rÃµ';

        for (let i = 0; i < count; i++) {
          hasContent = true;
          hasPhan2 = true;
          const indsBiet = resolveInds(dv.indicatorMap, 'dungSai', 'biet', 1);
          const indsHieu = resolveInds(dv.indicatorMap, 'dungSai', 'hieu', 1);
          const indsVd = resolveInds(dv.indicatorMap, 'dungSai', 'vanDung', 1);
          const indsVdc = resolveInds(dv.indicatorMap, 'dungSai', 'vanDungCao', 1);

          const yccdBiet = extractLevelYccd(dv.yeuCauCanDat, 'biet') || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
          const yccdHieu = extractLevelYccd(dv.yeuCauCanDat, 'hieu') || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
          const yccdVd = extractLevelYccd(dv.yeuCauCanDat, 'vanDung') || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
          const yccdVdc = extractLevelYccd(dv.yeuCauCanDat, 'vanDungCao') || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;

          phan2Text += `CÃ¢u ${q2Idx} (Chá»§ Ä‘á»/ChÆ°Æ¡ng: ${tenChuDe}, BÃ i/ÄÆ¡n vá»‹: ${tenDVKT}): [Soáº¡n má»™t tÃ¬nh huá»‘ng/ngá»¯ cáº£nh chung phá»¥c vá»¥ 4 Ã½ há»i ÄÃºng/Sai]\n`;
          phan2Text += `  a) (Má»©c Ä‘á»™: Nháº­n biáº¿t${indsBiet.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${indsBiet.join(', ')}` : ''}) -> YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccdBiet}\n`;
          phan2Text += `  b) (Má»©c Ä‘á»™: ThÃ´ng hiá»ƒu${indsHieu.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${indsHieu.join(', ')}` : ''}) -> YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccdHieu}\n`;
          phan2Text += `  c) (Má»©c Ä‘á»™: Váº­n dá»¥ng${indsVd.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${indsVd.join(', ')}` : ''}) -> YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccdVd}\n`;
          phan2Text += `  d) (Má»©c Ä‘á»™: Váº­n dá»¥ng cao${indsVdc.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${indsVdc.join(', ')}` : ''}) -> YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccdVdc}\n`;
          q2Idx++;
        }
      });
    });
    if (hasPhan2) {
      detailStructureText += phan2Text + `\n`;
    }

    // 3. PhÃ¢n bá»• Pháº§n III: Tráº¯c nghiá»‡m Tráº£ lá»i ngáº¯n
    let q3Idx = 1;
    let phan3Text = `[LOáº I 3: TRáº¢ Lá»œI NGáº®N] (Má»—i cÃ¢u Ä‘Ãºng Ä‘Æ°á»£c ${examConfig.diemMoiYP3} Ä‘iá»ƒm)\n`;
    let hasPhan3 = false;

    if (config.hasTraLoiNgan) {
      matrix.forEach((topic, tIdx) => {
        const tenChuDe = topic.tenChuDe || `Chá»§ Ä‘á» ${tIdx + 1}`;
        (topic.donViKienThuc || []).forEach((dv) => {
          const tln = dv.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0 };
          const tenDVKT = dv.noiDung || 'ChÆ°a rÃµ';

          ['biet', 'hieu', 'vanDung'].forEach((level) => {
            const count = Number(tln[level]) || 0;
            for (let i = 0; i < count; i++) {
              hasContent = true;
              hasPhan3 = true;
              const levelLabel = level === 'biet' ? 'Nháº­n biáº¿t' : level === 'hieu' ? 'ThÃ´ng hiá»ƒu' : 'Váº­n dá»¥ng';
              const yccd = extractLevelYccd(dv.yeuCauCanDat, level) || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', level, count);
              const indLabel = inds.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${inds.join(', ')}` : '';

              phan3Text += `CÃ¢u ${q3Idx} (Má»©c Ä‘á»™: ${levelLabel}, Chá»§ Ä‘á»/ChÆ°Æ¡ng: ${tenChuDe}, BÃ i/ÄÆ¡n vá»‹: ${tenDVKT}${indLabel}): [Soáº¡n cÃ¢u há»i Tráº¯c nghiá»‡m tráº£ lá»i ngáº¯n cÃ³ Ä‘Ã¡p sá»‘ cá»¥ thá»ƒ]\n`;
              phan3Text += `ðŸ‘‰ YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccd}\n`;
              q3Idx++;
            }
          });
        });
      });
    }
    if (hasPhan3) {
      detailStructureText += phan3Text + `\n`;
    }

    // 4. PhÃ¢n bá»• Pháº§n IV: Tá»± luáº­n
    let q4Idx = 1;
    const phanTL = config.hasTraLoiNgan ? 4 : 3;
    let phan4Text = `[LOáº I 4: Tá»° LUáº¬N] (Tá»•ng Ä‘iá»ƒm toÃ n pháº§n tá»± luáº­n: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm)\n`;
    let hasPhan4 = false;

    if (config.hasTuLuan) {
      matrix.forEach((topic, tIdx) => {
        const tenChuDe = topic.tenChuDe || `Chá»§ Ä‘á» ${tIdx + 1}`;
        (topic.donViKienThuc || []).forEach((dv) => {
          const tl = dv.tuLuan || { biet: 0, hieu: 0, vanDung: 0 };
          const tenDVKT = dv.noiDung || 'ChÆ°a rÃµ';

          // Gom cÃ¡c Ã½ TL theo ÄVKT (tá»‘i Ä‘a 2 Ã½/cÃ¢u)
          const items = [];
          ['biet', 'hieu', 'vanDung'].forEach((level) => {
            const count = Number(tl[level]) || 0;
            for (let i = 0; i < count; i++) {
              items.push({ level, index: i });
            }
          });

          if (items.length > 0) {
            hasContent = true;
            hasPhan4 = true;
            const numQuestions = Math.ceil(items.length / 2);
            for (let q = 0; q < numQuestions; q++) {
              const qItems = items.slice(q * 2, q * 2 + 2);
              const isSingle = qItems.length === 1;

              if (isSingle) {
                const item = qItems[0];
                const levelLabel = item.level === 'biet' ? 'Nháº­n biáº¿t' : item.level === 'hieu' ? 'ThÃ´ng hiá»ƒu' : 'Váº­n dá»¥ng';
                const yccd = extractLevelYccd(dv.yeuCauCanDat, item.level) || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
                const inds = resolveInds(dv.indicatorMap, 'tuLuan', item.level, 1);
                const indLabel = inds.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${inds.join(', ')}` : '';

                phan4Text += `CÃ¢u ${q4Idx} (Má»©c Ä‘á»™: ${levelLabel}, Chá»§ Ä‘á»/ChÆ°Æ¡ng: ${tenChuDe}, BÃ i/ÄÆ¡n vá»‹: ${tenDVKT}${indLabel}): [Soáº¡n cÃ¢u há»i Tá»± luáº­n 1 Ã½ duy nháº¥t]\n`;
                phan4Text += `ðŸ‘‰ YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccd}\n`;
              } else {
                phan4Text += `CÃ¢u ${q4Idx} (Chá»§ Ä‘á»/ChÆ°Æ¡ng: ${tenChuDe}, BÃ i/ÄÆ¡n vá»‹: ${tenDVKT}): [Soáº¡n cÃ¢u há»i Tá»± luáº­n gá»“m 2 Ã½ a, b]\n`;
                qItems.forEach((item, subIdx) => {
                  const subLabel = subIdx === 0 ? 'a' : 'b';
                  const levelLabel = item.level === 'biet' ? 'Nháº­n biáº¿t' : item.level === 'hieu' ? 'ThÃ´ng hiá»ƒu' : 'Váº­n dá»¥ng';
                  const yccd = extractLevelYccd(dv.yeuCauCanDat, item.level) || `BÃ¡m sÃ¡t ná»™i dung bÃ i há»c "${tenDVKT}".`;
                  const inds = resolveInds(dv.indicatorMap, 'tuLuan', item.level, 1);
                  const indLabel = inds.length > 0 ? `, MÃ£ nÄƒng lá»±c: ${inds.join(', ')}` : '';

                  phan4Text += `  ${subLabel}) (Má»©c Ä‘á»™: ${levelLabel}${indLabel}) -> YÃªu cáº§u cáº§n Ä‘áº¡t: ${yccd}\n`;
                });
              }
              q4Idx++;
            }
          }
        });
      });
    }
    if (hasPhan4) {
      detailStructureText += phan4Text + `\n`;
    }

    prompt += detailStructureText;

    prompt += `\nðŸŽ¯ TIÃŠU CHÃ CHáº¤T LÆ¯á»¢NG CÃ‚U Há»ŽI (Báº®T BUá»˜C TUÃ‚N THá»¦ TUYá»†T Äá»I):\n`;
    prompt += `1. VAI TRÃ’ Cá»¦A Báº N: Báº¡n lÃ  ChuyÃªn gia ra Ä‘á» thi cá»§a Bá»™ GD&ÄT, am hiá»ƒu sÃ¢u sáº¯c ChÆ°Æ¡ng trÃ¬nh GDPT 2018. CÃ¢u há»i pháº£i Ä‘Ã¡nh giÃ¡ ÄÃšNG NÄ‚NG Lá»°C, tuyá»‡t Ä‘á»‘i KHÃ”NG há»i váº¹t, KHÃ”NG há»i Ä‘á»‹nh nghÄ©a há»c thuá»™c lÃ²ng, KHÃ”NG Ä‘Ã¡nh Ä‘á»‘ ngá»› ngáº©n.\n`;

    if (config.hasTuLuan) {
      prompt += `\nðŸ“Œ QUY Táº®C PHáº¦N Tá»° LUáº¬N:\n`;
      prompt += `- CÃ¢u há»i tá»± luáº­n pháº£i lÃ  bÃ i toÃ¡n/tÃ¬nh huá»‘ng cÃ³ lá»i vÄƒn, yÃªu cáº§u tÆ° duy logic.\n`;
      prompt += `- Trong pháº§n HÆ°á»›ng dáº«n cháº¥m (ÄÃ¡p Ã¡n), Báº®T BUá»˜C pháº£i chia nhá» thÃ nh tá»«ng bÆ°á»›c giáº£i chi tiáº¿t vÃ  phÃ¢n bá»• Ä‘iá»ƒm sá»‘ rÃµ rÃ ng (vÃ­ dá»¥: || 0.25, || 0.5) cho Má»–I BÆ¯á»šC.\n`;
    }

    prompt += `\nðŸŽ“ Äáº¶C THÃ™ Tá»ªNG Bá»˜ MÃ”N:\n`;
    prompt += `- MÃ”N TOÃN: 100% cÃ¢u há»i tráº¯c nghiá»‡m pháº£i lÃ  bÃ i táº­p TÃNH TOÃN, tÃ¬m x, tÃ­nh diá»‡n tÃ­ch, giáº£i quyáº¿t váº¥n Ä‘á». KHÃ”NG há»i lÃ½ thuyáº¿t suÃ´ng (kiá»ƒu "PhÃ¢n sá»‘ lÃ  gÃ¬?"). CÃ¡c Ä‘Ã¡p Ã¡n nhiá»…u lÃ  káº¿t quáº£ cá»§a viá»‡c tÃ­nh nháº§m dáº¥u, sai cÃ´ng thá»©c.\n`;
    prompt += `- MÃ”N KHOA Há»ŒC Tá»° NHIÃŠN (LÃ½, HÃ³a, Sinh): CÃ¢u há»i Ä‘i tháº³ng vÃ o báº£n cháº¥t hiá»‡n tÆ°á»£ng, sÆ¡ Ä‘á»“ thÃ­ nghiá»‡m, pháº£n á»©ng hÃ³a há»c, hoáº·c bÃ i táº­p thá»±c tiá»…n Ä‘á»i sá»‘ng.\n`;
    prompt += `- MÃ”N KHOA Há»ŒC XÃƒ Há»˜I (Sá»­, Äá»‹a, GDCD): Sá»­/Äá»‹a Æ°u tiÃªn nguyÃªn nhÃ¢n, há»‡ quáº£, phÃ¢n tÃ­ch sá»‘ liá»‡u/biá»ƒu Ä‘á»“. RiÃªng GDCD/KTPL: 100% cÃ¢u há»i Váº­n dá»¥ng pháº£i lÃ  TÃŒNH HUá»NG THá»°C Táº¾ (vÃ­ dá»¥: nhÃ¢n váº­t A, B vi pháº¡m gÃ¬) Ä‘á»ƒ há»c sinh xá»­ lÃ½.\n`;
    prompt += `- MÃ”N NGá»® VÄ‚N: Táº­p trung Äá»ŒC HIá»‚U (nháº­n diá»‡n tu tá»«, tÃ¡c dá»¥ng nghá»‡ thuáº­t, phÆ°Æ¡ng thá»©c biá»ƒu Ä‘áº¡t). Tá»± luáº­n hÆ°á»›ng Ä‘áº¿n cáº£m thá»¥ vÃ  nghá»‹ luáº­n.\n`;
    prompt += `- MÃ”N TIáº¾NG ANH: Kiá»ƒm tra tá»« vá»±ng trong ngá»¯ cáº£nh (Context), chá»©c nÄƒng giao tiáº¿p. ÄÃ¡p Ã¡n nhiá»…u pháº£i cÃ³ cáº¥u trÃºc tÆ°Æ¡ng Ä‘á»“ng Ä‘á»ƒ phÃ¢n loáº¡i há»c sinh.\n`;
    prompt += `\n`;

    prompt += `\nðŸ“Œ QUY Táº®C TRÃŒNH BÃ€Y CÃ”NG THá»¨C TOÃN/LÃ/HÃ“A (Báº®T BUá»˜C Äá»‚ XUáº¤T WORD CHUáº¨N):\n`;
    prompt += `- TUYá»†T Äá»I KHÃ”NG dÃ¹ng Ä‘á»‹nh dáº¡ng LaTeX ($...$) cho cÃ¡c mÅ©i tÃªn pháº£n á»©ng hÃ³a há»c (->, =>, <=>) vÃ  kÃ­ hiá»‡u nhiá»‡t Ä‘á»™ (Ä‘á»™ C, ^oC). Báº¯t buá»™c viáº¿t chÃºng dÆ°á»›i dáº¡ng text thÆ°á»ng.\n`;
    prompt += `- Vá»›i cÃ´ng thá»©c HÃ³a há»c, Váº­t lÃ½ Ä‘Æ¡n giáº£n: Sá»¬ Dá»¤NG kÃ½ tá»± UNICODE (VÃ­ dá»¥: Hâ‚‚SOâ‚„, FeÂ²âº, Î±, Î”t). Tuyá»‡t Ä‘á»‘i khÃ´ng dÃ¹ng mÃ£ code cho loáº¡i nÃ y.\n`;
    prompt += `- CHá»ˆ KHI cÃ³ cÃ´ng thá»©c ToÃ¡n há»c phá»©c táº¡p (phÃ¢n sá»‘, cÄƒn thá»©c, há»‡ phÆ°Æ¡ng trÃ¬nh...): Má»›i sá»­ dá»¥ng mÃ£ LaTeX vÃ  Báº®T BUá»˜C bá»c trong cáº·p dáº¥u $...$ (vÃ­ dá»¥: $\\frac{1}{2}$) hoáº·c $$...$$ cho cÃ´ng thá»©c Ä‘á»©ng 1 dÃ²ng.\n`;

    prompt += `\nðŸ“ˆ HÆ¯á»šNG DáºªN Táº O HÃŒNH áº¢NH MINH Há»ŒA (Báº®T BUá»˜C ÃP Dá»¤NG):\n`;
    prompt += `Báº®T BUá»˜C thÃªm dÃ²ng "HÃ¬nh áº£nh:" vÃ o Tá»I THIá»‚U 1-2 cÃ¢u há»i trong Ä‘á» (Æ°u tiÃªn cÃ¢u vá» Ä‘á»“ thá»‹, biá»ƒu Ä‘á»“, sá»‘ liá»‡u, hÃ¬nh há»c). Äáº·t dÃ²ng nÃ y ngay SAU dÃ²ng "Giáº£i thÃ­ch:" cá»§a cÃ¢u Ä‘Ã³, kÃ¨m JSON metadata. Há»† THá»NG Sáº¼ Tá»° Äá»˜NG Váº¼ HÃŒNH Báº°NG MATPLOTLIB.\n`;
    prompt += `CÃ¡c loáº¡i há»— trá»£ vÃ  máº«u JSON:\n\n`;
    prompt += `1ï¸âƒ£ TOÃN â€” Äá»“ thá»‹ hÃ m sá»‘ (cá»±c trá»‹, tiá»‡m cáº­n, kháº£o sÃ¡t...):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"do_thi_ham_so","hamSo":"x**3 - 3*x","xRange":[-4,4],"tieuDe":"y = xÂ³ - 3x","diemDacBiet":[{"x":-1,"y":2,"nhan":"CÄ(-1;2)"},{"x":1,"y":-2,"nhan":"CT(1;-2)"}]}\n`;
    prompt += `2ï¸âƒ£ TOÃN â€” HÃ¬nh há»c Oxy (tam giÃ¡c, Ä‘Æ°á»ng trÃ²n, tá»a Ä‘á»™...):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"hinh_hoc_oxy","tieuDe":"Tam giÃ¡c ABC","xRange":[-1,6],"yRange":[-1,5],"diem":[{"x":0,"y":0,"nhan":"A"},{"x":5,"y":0,"nhan":"B"},{"x":2,"y":4,"nhan":"C"}],"doanThang":[{"x1":0,"y1":0,"x2":5,"y2":0},{"x1":5,"y1":0,"x2":2,"y2":4},{"x1":2,"y1":4,"x2":0,"y2":0}]}\n`;
    prompt += `3ï¸âƒ£ TOÃN â€” Histogram thá»‘ng kÃª (phÃ¢n bá»‘ Ä‘iá»ƒm, táº§n sá»‘...):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"histogram","tieuDe":"PhÃ¢n bá»‘ Ä‘iá»ƒm thi","nhanX":"Äiá»ƒm","nhanY":"Sá»‘ HS","duLieu":[3,4,5,5,6,6,6,7,7,7,7,8,8,9,10],"soCot":8}\n`;
    prompt += `4ï¸âƒ£ Váº¬T LÃ â€” Äá»“ thá»‹ v-t, s-t, U-I, P-V (Ä‘oáº¡n tháº³ng ná»‘i tiáº¿p):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"do_thi_vat_ly","tieuDe":"Äá»“ thá»‹ v-t","nhanX":"t (s)","nhanY":"v (m/s)","doanThang":[{"x1":0,"y1":0,"x2":5,"y2":20},{"x1":5,"y1":20,"x2":10,"y2":20},{"x1":10,"y1":20,"x2":15,"y2":0}],"diemDacBiet":[{"x":5,"y":20,"nhan":"A(5;20)"}]}\n`;
    prompt += `5ï¸âƒ£ Äá»ŠA LÃ / SINH / HÃ“A / Sá»¬ / CÃ”NG NGHá»† / TIN â€” Biá»ƒu Ä‘á»“ cá»™t:\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"bieu_do_cot","tieuDe":"DÃ¢n sá»‘ ÄNÃ 2023","nhanX":"Quá»‘c gia","nhanY":"Triá»‡u ngÆ°á»i","nhan":["VN","ThÃ¡i Lan","Indonesia"],"giaTri":[100,72,275]}\n`;
    prompt += `6ï¸âƒ£ Äá»ŠA LÃ / SINH / HÃ“A / Sá»¬ â€” Biá»ƒu Ä‘á»“ Ä‘Æ°á»ng (so sÃ¡nh xu hÆ°á»›ng):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"bieu_do_duong","tieuDe":"GDP 2018-2023","nhanX":"NÄƒm","nhanY":"Tá»· USD","nhan":["2018","2019","2020","2021","2022","2023"],"chuoiDuLieu":[{"ten":"VN","giaTri":[245,262,271,366,409,430]}]}\n`;
    prompt += `7ï¸âƒ£ Äá»ŠA LÃ / SINH / HÃ“A â€” Biá»ƒu Ä‘á»“ trÃ²n (cÆ¡ cáº¥u, tá»‰ lá»‡ %):\n`;
    prompt += `HÃ¬nh áº£nh: {"loai":"bieu_do_tron","tieuDe":"CÆ¡ cáº¥u kinh táº¿ VN","nhan":["NÃ´ng nghiá»‡p","CÃ´ng nghiá»‡p","Dá»‹ch vá»¥"],"giaTri":[12,38,50]}\n`;
    prompt += `âš ï¸ QUY Táº®C QUAN TRá»ŒNG: TrÆ°á»ng "hamSo" dÃ¹ng cÃº phÃ¡p Python (x**2, np.sin(x), np.sqrt(x)). NHáº®C Láº I: Báº®T BUá»˜C pháº£i cÃ³ Tá»I THIá»‚U 1-2 cÃ¢u trong Ä‘á» cÃ³ dÃ²ng "HÃ¬nh áº£nh:" kÃ¨m JSON â€” Ä‘Ã¢y lÃ  YÃŠU Cáº¦U Báº®T BUá»˜C, khÃ´ng pháº£i tÃ¹y chá»n.\n`;

    if (config.hasTuLuan) {
      prompt += `\nðŸ“Œ QUY Táº®C Äá»ŠNH Dáº NG ÄÃP ÃN Tá»° LUáº¬N VÃ€ BIá»‚U ÄIá»‚M (Báº®T BUá»˜C TUÃ‚N THá»¦ 100%):\n`;
      prompt += `- CÃ¢u há»i tá»± luáº­n pháº£i chia nhá» Ä‘Ã¡p Ã¡n thÃ nh tá»«ng bÆ°á»›c giáº£i chi tiáº¿t. Má»—i bÆ°á»›c giáº£i báº¯t buá»™c náº±m trÃªn 1 dÃ²ng riÃªng biá»‡t.\n`;
      prompt += `- CUá»I Má»–I DÃ’NG bÆ°á»›c giáº£i, Báº®T BUá»˜C ghi Ä‘iá»ƒm sá»‘ cá»§a bÆ°á»›c Ä‘Ã³, cÃ¡ch ná»™i dung báº±ng Ä‘Ãºng kÃ½ hiá»‡u " || " (hai dáº¥u gáº¡ch Ä‘á»©ng).\n`;
      prompt += `- Äiá»ƒm sá»‘ tá»«ng Ã½ nhá» (a, b, c) Báº®T BUá»˜C khá»›p CHÃNH XÃC vá»›i cáº¥u hÃ¬nh biá»ƒu Ä‘iá»ƒm Ä‘Ã£ cho. KHÃ”NG ÄÆ¯á»¢C tá»± Ã½ chia láº¡i.\n`;
      prompt += `- VÃ­ dá»¥ chuáº©n: "Ta cÃ³ phÆ°Æ¡ng trÃ¬nh $x^2 - 4 = 0$ || 0.25"\n`;
      prompt += `- Tuyá»‡t Ä‘á»‘i KHÃ”NG tá»± Ã½ váº½ báº£ng (Table) Markdown trong pháº§n Ä‘Ã¡p Ã¡n.\n`;
    }

    prompt += `\nðŸ’¡ PHONG CÃCH VÃ€ VÃ Dá»¤ MáºªU (Báº®T BUá»˜C Báº®T CHÆ¯á»šC 100% Äá»˜ KHÃ“ VÃ€ VÄ‚N PHONG NÃ€Y):\n`;
    prompt += `\nðŸ“ [MáºªU TRáº®C NGHIá»†M TÃNH TOÃN]: KhÃ´ng há»i lÃ½ thuyáº¿t. HÃ£y ra phÃ©p tÃ­nh cá»¥ thá»ƒ vÃ  cÃ³ báº«y.\n`;
    prompt += `VÃ­ dá»¥: "Káº¿t quáº£ cá»§a phÃ©p tÃ­nh $\\frac{4}{5} + (\\frac{-3}{5})$ lÃ :\nA. $\\frac{7}{5}$   B. $\\frac{-7}{5}$   C. $\\frac{1}{5}$   D. $\\frac{-1}{5}$"\n`;

    prompt += `\nðŸ“ [MáºªU TRáº®C NGHIá»†M ÄÃšNG/SAI ÄA CHIá»€U]: Má»—i cÃ¢u gá»“m 1 Äá»€ BÃ€I CHUNG + 4 Ã½ a,b,c,d xoay quanh Ä‘á» bÃ i Ä‘Ã³.\n`;
    prompt += `VÃ­ dá»¥: "Khá»‘i 6 cÃ³ 400 há»c sinh. SÆ¡ káº¿t kÃ¬ I cÃ³ 32 HS giá»i, 60% khÃ¡, 12 yáº¿u, cÃ²n láº¡i lÃ  trung bÃ¬nh.\na) HS giá»i chiáº¿m 8%.\nb) HS yáº¿u chiáº¿m 4%.\nc) CÃ³ 240 HS khÃ¡.\nd) HS trung bÃ¬nh nhiá»u hÆ¡n HS giá»i 86 em."\n`;

    if (config.hasTuLuan) {
      prompt += `\nðŸ“ [MáºªU Tá»° LUáº¬N CÃ“ Lá»œI VÄ‚N - THá»°C Táº¾]: BÃ i toÃ¡n cÃ³ cá»‘t truyá»‡n, chia nhiá»u bÆ°á»›c, tÃ­nh Ä‘iá»ƒm tá»«ng bÆ°á»›c.\n`;
      prompt += `VÃ­ dá»¥: "Mai Ä‘á»c má»™t cuá»‘n sÃ¡ch dÃ y 180 trang. NgÃ y thá»© nháº¥t Ä‘á»c Ä‘Æ°á»£c $\\frac{1}{4}$ sá»‘ trang..."\n`;
      prompt += `â†’ ÄÃ¡p Ã¡n AI PHáº¢I in ra Ä‘Ãºng format:\n`;
      prompt += `+ TÃ­nh sá»‘ trang ngÃ y 1: 180 Ã— 1/4 = 45 trang || 0.5\n`;
      prompt += `+ TÃ­nh sá»‘ trang cÃ²n láº¡i sau ngÃ y 1: 180 - 45 = 135 trang || 0.25\n`;
    }

    prompt += `\nâš ï¸ Lá»†NH TUYá»†T Äá»I CUá»I CÃ™NG: Táº¤T Cáº¢ cÃ¡c cÃ¢u há»i báº¡n sinh ra pháº£i cÃ³ Ä‘á»™ sÃ¢u, cáº¥u trÃºc sá»‘ liá»‡u, báº«y tÃ¢m lÃ½ vÃ  sá»± cháº·t cháº½ y há»‡t cÃ¡c vÃ­ dá»¥ trÃªn! Báº¯t buá»™c bÃ¡m sÃ¡t "YÃªu cáº§u cáº§n Ä‘áº¡t" cá»§a tá»«ng Ä‘Æ¡n vá»‹ kiáº¿n thá»©c.\n`;

    if (!hasContent) {
      alert("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u ma tráº­n Ä‘áº·c táº£ Ä‘Ã£ phÃ¢n tÃ­ch. Vui lÃ²ng quay láº¡i BÆ°á»›c 1 vÃ  náº¡p file/dÃ¡n dá»¯ liá»‡u ma tráº­n Ä‘áº·c táº£!");
      return;
    }

    prompt += `\nðŸ–¼ï¸ NHáº®C Láº I Láº¦N CUá»I: Báº®T BUá»˜C cÃ³ Tá»I THIá»‚U 1-2 cÃ¢u há»i cÃ³ dÃ²ng "HÃ¬nh áº£nh:" kÃ¨m JSON metadata (biá»ƒu Ä‘á»“ cá»™t, Ä‘á»“ thá»‹ hÃ m sá»‘, biá»ƒu Ä‘á»“ trÃ²n, hÃ¬nh há»c Oxy...). KHÃ”NG ÄÆ¯á»¢C bá» qua yÃªu cáº§u nÃ y!\n`;
    prompt += `\n[THáº¦Y/CÃ” XÃ“A DÃ’NG CHá»® NÃ€Y, Báº¤M NÃšT ÄÃNH KÃˆM FILE TÃ€I LIá»†U/SGK VÃ€ Gá»¬I CHO AI Äá»‚ NÃ“ SOáº N Äá»€]`;VanDung) * 100) / 100;
              const allInds = [];
              ['biet', 'hieu', 'vanDung'].forEach(level => {
                const cnt = Number(tl[level]) || 0;
                if (cnt > 0) resolveInds(dv.indicatorMap, 'tuLuan', level, cnt).forEach(c => allInds.push(c));
              });
              const uniqueInds = [...new Set(allInds)];
              const indStr = uniqueInds.length > 0 ? ` (MÃ£ nÄƒng lá»±c: ${uniqueInds.join(', ')})` : '';
              const tlLevelParts = [];
              if (Number(tl.biet) > 0) tlLevelParts.push(`${tl.biet} Ã½ Nháº­n biáº¿t`);
              if (Number(tl.hieu) > 0) tlLevelParts.push(`${tl.hieu} Ã½ ThÃ´ng hiá»ƒu`);
              if (Number(tl.vanDung) > 0) tlLevelParts.push(`${tl.vanDung} Ã½ Váº­n dá»¥ng`);
              const tlLevelStr = tlLevelParts.length > 0 ? ` [${tlLevelParts.join(', ')}]` : '';
              if (hasManualTLConfig) {
                prompt += ` - Tá»± luáº­n [LOáº I 4]: ${totalYTL} Ã½${tlLevelStr} â€” tá»•ng ${tongDiem}Ä‘${indStr}\n`;
              } else {
                const cauHaiY = Math.floor(totalYTL / 2);
                const cauMotY = totalYTL % 2;
                const kCauTL = cauHaiY + cauMotY;
                let cauDesc = '';
                if (cauHaiY > 0 && cauMotY > 0) {
                  cauDesc = `${kCauTL} cÃ¢u: ${cauHaiY} cÃ¢u gá»“m 2 Ã½ (a, b), ${cauMotY} cÃ¢u Ä‘Æ¡n Ã½`;
                } else if (cauHaiY > 0) {
                  cauDesc = `${kCauTL} cÃ¢u, má»—i cÃ¢u gá»“m 2 Ã½ (a, b)`;
                } else {
                  cauDesc = `${kCauTL} cÃ¢u Ä‘Æ¡n Ã½`;
                }
                prompt += ` - Tá»± luáº­n [LOáº I 4]: ${cauDesc}${tlLevelStr} â€” tá»•ng ${tongDiem}Ä‘${indStr}\n`;
                if (cauHaiY > 0) {
                  prompt += `   â†³ CÃ¢u 2 Ã½: cÃ³ thá»ƒ lÃ  1 Ä‘á» bÃ i chung + Ã½ a, Ã½ b liÃªn quan; HOáº¶C 2 Ã½ a, b Ä‘á»™c láº­p nhau â€” tÃ¹y ná»™i dung kiáº¿n thá»©c.\n`;
                }
              }
            }
          }
          prompt += `âš ï¸ LÆ¯U Ã Tá»I QUAN TRá»ŒNG: Viáº¿t ÄÃšNG Sá» LÆ¯á»¢NG cÃ¢u há»i/Ã½ Ä‘Ã£ Ä‘Æ°á»£c giao.\n\n`;
        }
      });
    });

    if (hasContent) {
      prompt += `ðŸ“Š Tá»”NG Há»¢P GOM CÃ‚U Báº®T BUá»˜C:\n`;
      if (soCauDungSai > 0) {
        prompt += `  â†’ LOáº I 2: Gom thÃ nh ${soCauDungSai} CÃ¢u (má»—i CÃ¢u gá»“m 1 Äá»€ BÃ€I CHUNG + 4 Ã½ a, b, c, d xoay quanh Ä‘á» bÃ i Ä‘Ã³)\n`;
        if (config.groupTfByTopic) {
          prompt += `     âš ï¸ LÆ¯U Ã: 4 má»‡nh Ä‘á» trong má»—i cÃ¢u ÄÃºng/Sai nÃ y Ä‘Æ°á»£c láº¥y ráº£i rÃ¡c tá»« cÃ¡c bÃ i há»c khÃ¡c nhau trong cÃ¹ng chá»§ Ä‘á» Ä‘á»ƒ Ä‘áº£m báº£o tÃ­nh bao quÃ¡t.\n`;
        }
      }
      // NÃ‚NG Cáº¤P: Tráº£ lá»i ngáº¯n Ä‘á»™c láº­p
      if (soCauTraLoiNgan > 0) prompt += `  â†’ LOáº I 3: Xuáº¥t thÃ nh ${soCauTraLoiNgan} CÃ¢u Ä‘á»™c láº­p (TUYá»†T Äá»I KHÃ”NG GOM vÃ o chung 1 cÃ¢u cÃ³ Ã½ a, b, c, d)\n`;
      if (config.hasTuLuan && soCauTuLuan > 0) {
        if (hasManualTLConfig) {
          const cauStructureDesc = tuLuanConfig.questions.map((q, i) => {
            const nY = q.subItems?.length || 1;
            const tongDiemQ = q.subItems ? Math.round(q.subItems.reduce((s, si) => s + (si.diem || 0), 0) * 100) / 100 : 0;
            const yDetails = q.subItems ? q.subItems.slice(0, nY).map((sub, j) => `Ã½ ${['a', 'b', 'c'][j]}=${Number(sub.diem) || 0}Ä‘`).join(', ') : '';
            const kieuY = q.kieuY || 'chung';
            const kieuDesc = nY > 1 ? (kieuY === 'chung' ? ' [Ä‘á» bÃ i chung]' : ' [Ã½ Ä‘á»™c láº­p]') : '';
            const ktLabel = q.kienThuc === 'hinh_hoc' ? ' [HÃ¬nh há»c]' : q.kienThuc === 'dai_so' ? ' [Äáº¡i sá»‘]' : '';
            return `cÃ¢u ${i + 1}${ktLabel}: ${nY > 1 ? `${nY} Ã½ (${yDetails})${kieuDesc} â€” tá»•ng ${tongDiemQ}Ä‘` : `1 Ã½ â€” ${tongDiemQ}Ä‘`}`;
          }).join('; ');
          prompt += `  â†’ LOáº I 4: Tá»•ng ${soCauTuLuan} CÃ¢u tá»± luáº­n. Cáº¤U TRÃšC Báº®T BUá»˜C: ${cauStructureDesc}. âš ï¸ [Ä‘á» bÃ i chung] = 1 tÃ¬nh huá»‘ng/bÃ i toÃ¡n chung, phÃ¡t triá»ƒn thÃ nh cÃ¡c Ã½ a, b, c liÃªn quan; [Ã½ Ä‘á»™c láº­p] = má»—i Ã½ lÃ  cÃ¢u há»i riÃªng khÃ´ng liÃªn quan nhau. Tá»”NG ÄIá»‚M Tá»° LUáº¬N: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm\n`;
          // ThÃªm yÃªu cáº§u kienThuc chi tiáº¿t per cÃ¢u náº¿u cÃ³
          const hasKienThuc = tuLuanConfig.questions.some(q => q.kienThuc === 'hinh_hoc' || q.kienThuc === 'dai_so');
          if (hasKienThuc) {
            tuLuanConfig.questions.forEach((q, i) => {
              if (q.kienThuc === 'hinh_hoc') {
                prompt += `     â†³ CÃ¢u ${i + 1} [HÃ¬nh há»c]: Báº®T BUá»˜C ra cÃ¢u há»i thuá»™c lÄ©nh vá»±c HÃŒNH Há»ŒC (hÃ¬nh há»c pháº³ng, hÃ¬nh khÃ´ng gian, tá»a Ä‘á»™, hÃ¬nh há»c giáº£i tÃ­ch...). KHÃ”NG ra cÃ¢u Ä‘áº¡i sá»‘.\n`;
              } else if (q.kienThuc === 'dai_so') {
                prompt += `     â†³ CÃ¢u ${i + 1} [Äáº¡i sá»‘]: Báº®T BUá»˜C ra cÃ¢u há»i thuá»™c lÄ©nh vá»±c Äáº I Sá» / GIáº¢I TÃCH (hÃ m sá»‘, phÆ°Æ¡ng trÃ¬nh, báº¥t phÆ°Æ¡ng trÃ¬nh, tÃ­ch phÃ¢n, chuá»—i sá»‘...). KHÃ”NG ra cÃ¢u hÃ¬nh há»c.\n`;
              }
            });
          }
        } else {
          prompt += `  â†’ LOáº I 4: Xuáº¥t thÃ nh ${soCauTuLuan} CÃ¢u tá»± luáº­n (má»—i cÃ¢u theo cáº¥u trÃºc Ä‘Ã£ mÃ´ táº£ á»Ÿ tá»«ng Ä‘Æ¡n vá»‹ kiáº¿n thá»©c phÃ­a trÃªn). Tá»”NG ÄIá»‚M Tá»° LUáº¬N: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm\n`;
        }
      }
      prompt += `\n`;
    }

    if (!hasContent) {
      alert("BÃ¡c chÆ°a Ä‘iá»n sá»‘ lÆ°á»£ng cÃ¢u há»i á»Ÿ Báº£ng Ma Tráº­n (BÆ°á»›c 3). Vui lÃ²ng Ä‘iá»n sá»‘ lÆ°á»£ng trÆ°á»›c khi sinh Ä‘á» nhÃ©!");
      return;
    }

    prompt += `\nðŸ–¼ï¸ NHáº®C Láº I Láº¦N CUá»I: Báº®T BUá»˜C cÃ³ Tá»I THIá»‚U 1-2 cÃ¢u há»i cÃ³ dÃ²ng "HÃ¬nh áº£nh:" kÃ¨m JSON metadata (biá»ƒu Ä‘á»“ cá»™t, Ä‘á»“ thá»‹ hÃ m sá»‘, biá»ƒu Ä‘á»“ trÃ²n, hÃ¬nh há»c Oxy...). KHÃ”NG ÄÆ¯á»¢C bá» qua yÃªu cáº§u nÃ y!\n`;

    prompt += `\n[THáº¦Y/CÃ” XÃ“A DÃ’NG CHá»® NÃ€Y, Báº¤M NÃšT ÄÃNH KÃˆM FILE TÃ€I LIá»†U/SGK VÃ€ Gá»¬I CHO AI Äá»‚ NÃ“ SOáº N Äá»€]`;

    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      alert("âœ… ÄÃƒ COPY SIÃŠU Lá»†NH SINH Äá»€ THI!\n\n1. HÃ£y dÃ¡n lá»‡nh nÃ y vÃ o ChatGPT hoáº·c Gemini.\n2. Báº¥m nÃºt ghim káº¹p giáº¥y Ä‘á»ƒ Ä‘Ã­nh kÃ¨m file SÃ¡ch giÃ¡o khoa.\n3. XÃ³a dÃ²ng ngoáº·c vuÃ´ng cuá»‘i cÃ¹ng rá»“i báº¥m Gá»¬I.\n4. Äá»£i AI nháº£ Ä‘á» thi rá»“i copy dÃ¡n vÃ o Ã´ bÃªn dÆ°á»›i nhÃ©!");
    } catch (err) {
      alert("Lá»—i khi copy. TrÃ¬nh duyá»‡t cá»§a báº¡n cÃ³ thá»ƒ khÃ´ng há»— trá»£ tÃ­nh nÄƒng nÃ y.");
    }
  };

  // =========================================================================
  // TÃNH DANH SÃCH Ã” TRá»NG â€” NÃ‚NG Cáº¤P: KHÃ”NG CHIA 4 á»ž LOáº I 3
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

    const buildDvktLabels = (typeKey) => {
      const labels = [];
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          let count = (Number(obj.biet) || 0) + (Number(obj.hieu) || 0) + (Number(obj.vanDung) || 0);
          if (typeKey === 'dungSai') {
            count = Number(obj.biet) || 0;
          }
          if (count > 0) {
            for (let c = 0; c < count; c++) labels.push(dv.noiDung || '');
          }
        });
      });
      return labels;
    };

    // --- PHáº¦N I ---
    const totalMCQ = getTotalY('nhieuLuaChon');
    const mcqDvktLabels = buildDvktLabels('nhieuLuaChon');
    for (let i = 0; i < totalMCQ; i++) {
      const key = `phan1_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      const dvktName = mcqDvktLabels[i] || '';
      const dvktSuffix = dvktName ? ` - ${dvktName}` : '';
      slots.push({ key, label: `Pháº§n I - CÃ¢u ${i + 1} (Tráº¯c nghiá»‡m)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 1, daDien });
    }

    // --- PHáº¦N II ---
    const soCauTF = (() => {
      let totalBiet = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          totalBiet += Number(dv.dungSai?.biet) || 0;
        });
      });
      return totalBiet;
    })();
    const tfDvktLabels = buildDvktLabels('dungSai');
    for (let i = 0; i < soCauTF; i++) {
      const key = `phan2_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      const dvktName = tfDvktLabels[i] || '';
      const dvktSuffix = dvktName ? ` - ${dvktName}` : '';
      slots.push({ key, label: `Pháº§n II - CÃ¢u ${i + 1} (ÄÃºng/Sai)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 2, daDien });
    }

    // --- PHáº¦N III (NÃ‚NG Cáº¤P: KHÃ”NG CHIA 4) ---
    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      const saDvktLabels = buildDvktLabels('traLoiNgan');
      for (let i = 0; i < totalSA; i++) {
        const key = `phan3_cau${i + 1}`;
        const daDien = isSlotFilled(key);
        const dvktName = saDvktLabels[i] || ''; // KhÃ´ng nhÃ¢n 4 ná»¯a
        const dvktSuffix = dvktName ? ` - ${dvktName}` : '';
        slots.push({ key, label: `Pháº§n III - CÃ¢u ${i + 1} (Tráº£ lá»i ngáº¯n)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 3, daDien });
      }
    }

    // --- PHáº¦N IV --- (Gom theo ÄVKT, tá»‘i Ä‘a 2 Ã½/cÃ¢u â€” Ä‘á»“ng bá»™ Step4)
    const totalTL = getTotalY('tuLuan');
    const soCauTL = (() => {
      if (hasManualTLConfig) return tuLuanConfig.questions.length;
      // NhÃ³m Ã½ TL theo ÄVKT
      const items = [];
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          ['biet', 'hieu', 'vanDung'].forEach(level => {
            const count = Number(dv.tuLuan?.[level]) || 0;
            for (let i = 0; i < count; i++) items.push(dv.noiDung || '');
          });
        });
      });
      const groups = {};
      items.forEach(dvkt => {
        if (!groups[dvkt]) groups[dvkt] = 0;
        groups[dvkt]++;
      });
      let total = 0;
      Object.values(groups).forEach(cnt => { total += Math.ceil(cnt / 2); });
      return total;
    })();
    const phanTL = config.hasTraLoiNgan ? 4 : 3;
    const tlDvktLabels = buildDvktLabels('tuLuan');
    for (let i = 0; i < soCauTL; i++) {
      const key = `phan${phanTL}_cau${i + 1}`;
      const daDien = isSlotFilled(key);
      const dvktName = tlDvktLabels[i] || '';
      const dvktSuffix = dvktName ? ` - ${dvktName}` : '';
      slots.push({ key, label: `Pháº§n ${phanTL === 4 ? 'IV' : 'III'} - CÃ¢u ${i + 1} (Tá»± luáº­n)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 4, daDien });
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
  // HÃ€M Náº P VÃ€ GHI ÄÃˆ TOÃ€N Bá»˜ LÃŠN KHUNG Äá»€ (CHO Äá»€ TÆ¯Æ NG ÄÆ¯Æ NG)
  // =========================================================================
  const handleOverrideAll = () => {
    if (draftQuestions.length === 0) {
      alert('KhÃ´ng cÃ³ cÃ¢u há»i nÃ o trong NhÃ¡p Ä‘á»ƒ ghi Ä‘Ã¨!');
      return;
    }

    const confirmOverride = window.confirm("Cáº¢NH BÃO: Thao tÃ¡c nÃ y sáº½ XÃ“A TOÃ€N Bá»˜ Khung Äá» hiá»‡n táº¡i vÃ  náº¡p cÃ¡c cÃ¢u há»i trong NhÃ¡p lÃªn.\nBáº¡n cÃ³ cháº¯c cháº¯n muá»‘n GHI Äá»€ TOÃ€N Bá»˜ khÃ´ng?");
    if (!confirmOverride) return;

    // Lá»c cÃ¡c slot theo tá»«ng loáº¡i (Láº¥y táº¥t cáº£, KHÃ”NG quan tÃ¢m daDien)
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

    // Dá»n dáº¹p táº¥t cáº£ slot trÆ°á»›c khi náº¡p
    availableSlots.forEach(slot => {
      // Gá»i clearExamSlot (tÆ°Æ¡ng Ä‘Æ°Æ¡ng updateExamSlot null) cho an toÃ n
      updateExamSlot(slot.key, 'clear', null); // Giáº£ láº­p clear, nhÆ°ng ta sáº½ ghi Ä‘Ã¨ trá»±c tiáº¿p báº±ng pushToExamSlot
    });

    const pushGroup = (questions, slots) => {
      let qIndex = 0;
      for (const slot of slots) {
        if (qIndex >= questions.length) break;

        const question = questions[qIndex];
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
        qIndex++;
      }
      failedCount += (questions.length - qIndex);
    };

    pushGroup(qsLoai1, slotsLoai1);
    pushGroup(qsLoai2, slotsLoai2);
    pushGroup(qsLoai3, slotsLoai3);

    {
      let tlIdx = 0;
      for (const slot of slotsLoai4) {
        if (tlIdx >= qsLoai4.length) break;
        const q = qsLoai4[tlIdx];
        const mappedData = mapTL4Draft(q);
        if (q.hinhAnh) mappedData.hinhAnh = q.hinhAnh;
        pushToExamSlot(slot.key, mappedData, q);
        pushedCount++;
        tlIdx++;
      }
      failedCount += Math.max(0, qsLoai4.length - tlIdx);
    }

    setSelectedDrafts([]);

    if (failedCount > 0) {
      alert(`âœ… ÄÃ£ náº¡p thÃ nh cÃ´ng ${pushedCount} cÃ¢u Ä‘Ã¨ lÃªn Khung Äá».\nâš ï¸ Tuy nhiÃªn cÃ³ ${failedCount} cÃ¢u nhÃ¡p bá»‹ thá»«a do Khung Äá» Ã­t chá»— hÆ¡n sá»‘ cÃ¢u AI tráº£ vá».`);
    } else {
      alert(`âœ… ÄÃ£ GHI Äá»€ thÃ nh cÃ´ng toÃ n bá»™ ${pushedCount} cÃ¢u lÃªn Khung Äá» má»›i!`);
    }
  };

  // =========================================================================
  // HÃ€M Äáº¨Y HÃ€NG LOáº T (NÃ‚NG Cáº¤P MAPPING CHO LOáº I 3 + GOM Tá»° LUáº¬N)
  // =========================================================================
  const handleBulkPush = () => {
    if (selectedDrafts.length === 0) {
      alert('Vui lÃ²ng tick chá»n Ã­t nháº¥t 1 cÃ¢u nhÃ¡p trÆ°á»›c khi Ä‘áº©y hÃ ng loáº¡t!');
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

        // 1. Æ¯u tiÃªn Ä‘Ã¨ vÃ o cÃ¢u gá»‘c náº¿u lÃ  cÃ¢u sinh tÆ°Æ¡ng tá»±
        if (question._fromSimilar && question._originalSlotKey && !usedSlotKeys.has(question._originalSlotKey)) {
          const origSlot = availableSlots.find(s => s.key === question._originalSlotKey && s.loai === loai);
          if (origSlot) {
            targetSlot = origSlot;
            // XÃ³a khá»i remainingEmptySlots náº¿u cÃ³ (Ä‘á»ƒ khÃ´ng dÃ¹ng nháº§m)
            remainingEmptySlots = remainingEmptySlots.filter(s => s.key !== origSlot.key);
          }
        }

        // 2. Náº¿u khÃ´ng cÃ³ cÃ¢u gá»‘c, hoáº·c cÃ¢u gá»‘c Ä‘Ã£ bá»‹ Ä‘Ã¨ trong Ä‘á»£t nÃ y, thÃ¬ tÃ¬m Ã´ trá»‘ng Ä‘áº§u tiÃªn
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
            // Báº£o toÃ n metadata hÃ¬nh áº£nh khi Ä‘áº©y hÃ ng loáº¡t
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

    // â”€â”€ Äáº¨Y LOáº I 1, 2, 3, 4 THEO LOGIC Má»šI â”€â”€
    pushGroup(qsLoai1, 1);
    pushGroup(qsLoai2, 2);
    pushGroup(qsLoai3, 3);
    pushGroup(qsLoai4, 4);

    setSelectedDrafts([]);

    if (failedCount > 0) {
      alert(`âœ… ÄÃ£ Ä‘áº©y ${pushedCount} cÃ¢u lÃªn Khung Äá».\nâš ï¸ ${failedCount} cÃ¢u nhÃ¡p bá»‹ trÆ°á»£t (khÃ´ng cÃ²n Ä‘á»§ Ã´ trá»‘ng á»Ÿ pháº§n tÆ°Æ¡ng á»©ng).`);
    } else {
      alert(`âœ… ÄÃ£ Ä‘áº©y thÃ nh cÃ´ng táº¥t cáº£ ${pushedCount} cÃ¢u vÃ o Ä‘Ãºng Ã´ trá»‘ng!`);
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
      setParseError('Vui lÃ²ng dÃ¡n ná»™i dung Ä‘á» thi AI vÃ o Ã´ soáº¡n tháº£o trÆ°á»›c khi bÃ³c tÃ¡ch.');
      return;
    }

    try {
      const parsed = parseExamDraft(examContent);

      // â”€â”€ POST-PROCESSING: Gáº¯n metadata Ä‘á»“ thá»‹ Matplotlib cho cÃ¢u há»i â”€â”€
      for (const q of parsed) {
        // 1. TrÃ­ch xuáº¥t "HÃ¬nh áº£nh:" JSON tá»« Táº¤T Cáº¢ cÃ¡c trÆ°á»ng (giaiThich, noiDung, dapAn)
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
        // 2. Náº¿u hinhAnh lÃ  URL string (giáº£ tá»« AI) â†’ xÃ³a bá»
        if (typeof q.hinhAnh === 'string') {
          q.hinhAnh = null;
        }
        // 3. Fallback: tá»± phÃ¡t hiá»‡n hÃ m sá»‘ trong ná»™i dung cÃ¢u há»i
        if (!q.hinhAnh || !q.hinhAnh.loai) {
          const detected = autoDetectGraphMetadata(q);
          if (detected) q.hinhAnh = detected;
        }
      }

      if (parsed.length === 0) {
        setParseError('KhÃ´ng tÃ¬m tháº¥y cÃ¢u há»i nÃ o. HÃ£y Ä‘áº£m báº£o AI tráº£ vá» Ä‘Ãºng Ä‘á»‹nh dáº¡ng cÃ³ chá»¯ "CÃ¢u X:".');
        return;
      }
      setDraftQuestions(parsed);
      // Cáº£nh bÃ¡o náº¿u khÃ´ng cÃ³ cÃ¢u nÃ o cÃ³ hÃ¬nh áº£nh
      const soHinhAnh = parsed.filter(q => q.hinhAnh && q.hinhAnh.loai).length;
      if (soHinhAnh === 0) {
        setParseError('âš ï¸ Äá» thi chÆ°a cÃ³ cÃ¢u nÃ o cÃ³ hÃ¬nh áº£nh/biá»ƒu Ä‘á»“. Báº¡n nÃªn yÃªu cáº§u AI bá»• sung báº±ng cÃ¡ch ghi thÃªm: "HÃ£y thÃªm 1-2 cÃ¢u cÃ³ HÃ¬nh áº£nh: {JSON metadata biá»ƒu Ä‘á»“/Ä‘á»“ thá»‹}"');
      } else {
        setParseError('');
      }
    } catch (err) {
      console.error('handleParseExam error:', err);
      setParseError('ÄÃ£ xáº£y ra lá»—i khi bÃ³c tÃ¡ch. Chi tiáº¿t: ' + err.message);
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
            Trá»£ lÃ½ AI Sinh Äá»
          </h2>
          <p className="text-sm text-slate-500">Copy lá»‡nh, dÃ¡n káº¿t quáº£ AI, bÃ³c tÃ¡ch vÃ  Ä‘áº©y vÃ o khung Ä‘á»</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <FileText size={20} /> HÆ°á»›ng dáº«n táº¡o Ä‘á» thi tá»± Ä‘á»™ng
          </h3>
          <ul className="list-decimal list-inside text-slate-700 space-y-2 mb-6">
            <li>Báº¥m nÃºt <strong>"Copy Lá»‡nh Ma Tráº­n"</strong> á»Ÿ bÃªn dÆ°á»›i.</li>
            <li>Má»Ÿ <strong>ChatGPT</strong> hoáº·c <strong>Gemini</strong> trÃªn web.</li>
            <li>DÃ¡n (Ctrl + V) lá»‡nh vÃ o Ã´ chat.</li>
            <li>ÄÃ­nh kÃ¨m file PDF/Word SÃ¡ch giÃ¡o khoa cá»§a mÃ´n há»c.</li>
            <li>Copy káº¿t quáº£ AI sinh ra vÃ  dÃ¡n vÃ o khung Soáº¡n tháº£o bÃªn dÆ°á»›i rá»“i báº¥m <strong>"BÃ³c tÃ¡ch cÃ¢u há»i"</strong>.</li>
          </ul>

          <div className="flex justify-center">
            <button
              onClick={handleCopyExamPrompt}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-all ${isCopied ? 'bg-green-600 scale-105' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:scale-105'}`}
            >
              {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              {isCopied ? 'ÄÃ£ Copy Lá»‡nh' : 'Copy Lá»‡nh Ma Tráº­n'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-semibold text-slate-700">DÃ¡n Äá» thi AI Ä‘Ã£ biÃªn soáº¡n vÃ o Ä‘Ã¢y:</label>
          <textarea
            className="w-full min-h-[400px] p-6 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-slate-800 leading-relaxed transition-all resize-y shadow-inner font-mono text-sm"
            placeholder="[DÃ¡n káº¿t quáº£ AI tráº£ vá» vÃ o Ä‘Ã¢y...]"
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
              BÃ³c tÃ¡ch cÃ¢u há»i
            </button>
          </div>
        </div>

        {draftQuestions.length > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-xl p-6 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                Danh sÃ¡ch cÃ¢u há»i nhÃ¡p
              </h3>
              <span className="text-sm font-semibold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {draftQuestions.length} cÃ¢u chÆ°a Ä‘áº©y
              </span>
            </div>

            {availableSlots.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <AlertTriangle size={16} className="inline mr-1" />
                Táº¥t cáº£ Ã´ trong Khung Äá» Ä‘Ã£ Ä‘Æ°á»£c Ä‘iá»n. HÃ£y xÃ³a bá»›t Ã´ Ä‘Ã£ Ä‘iá»n hoáº·c thÃªm cÃ¢u há»i vÃ o Ma tráº­n Ä‘á»ƒ cÃ³ Ã´ trá»‘ng má»›i.
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
                  <span className="text-sm font-semibold text-slate-700">Chá»n táº¥t cáº£</span>
                </label>
                {selectedDrafts.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    ÄÃ£ chá»n: {selectedDrafts.length}
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
                  Äáº©y {selectedDrafts.length > 0 ? selectedDrafts.length : ''} cÃ¢u
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedDrafts.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${selectedDrafts.length > 0
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="XÃ³a cÃ¡c cÃ¢u Ä‘Ã£ chá»n khá»i danh sÃ¡ch nhÃ¡p"
                >
                  <Trash2 size={18} />
                  XÃ³a {selectedDrafts.length > 0 ? selectedDrafts.length : ''} cÃ¢u
                </button>
                <button
                  onClick={handleOverrideAll}
                  disabled={draftQuestions.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${draftQuestions.length > 0
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="Thay tháº¿ toÃ n bá»™ Khung Äá» hiá»‡n táº¡i báº±ng cÃ¡c cÃ¢u há»i NhÃ¡p nÃ y"
                >
                  <AlertTriangle size={18} />
                  Náº¡p & Ghi Ä‘Ã¨ toÃ n bá»™
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
