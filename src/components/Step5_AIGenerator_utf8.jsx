// TĂªn file: src/components/Step5_AIGenerator.jsx
import React, { useState, useMemo } from 'react';
import { useExamStore } from '../store/useExamStore';
import { Copy, FileText, CheckCircle2, Wand2, AlertTriangle, ArrowUpCircle, Trash2, CheckSquare } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import ClientGraph from './ClientGraph';

// =============================================================================
// [BÆ¯á»C 1] Tá»ª ÄIá»‚N PHONG CĂCH RA Äá»€
// =============================================================================
export const STYLE_DICTIONARY = {
  "thuc_te": "Báº®T BUá»˜C lá»“ng ghĂ©p bá»‘i cáº£nh thá»±c táº¿ Ä‘á»i sá»‘ng (nhÆ° mua sáº¯m, tĂ­nh tiá»n, Ä‘o Ä‘áº¡c, khoa há»c) vĂ o cĂ¢u há»i.",
  "lien_mon": "Báº®T BUá»˜C tĂ­ch há»£p dá»¯ kiá»‡n liĂªn mĂ´n (nhÆ° Lá»‹ch sá»­, Äá»‹a lĂ½ Viá»‡t Nam, VÄƒn há»c) vĂ o bĂ i toĂ¡n.",
  "hai_huoc": "HĂ£y thiáº¿t káº¿ cĂ¢u há»i vá»›i tĂ¬nh huá»‘ng hĂ i hÆ°á»›c, dĂ­ dá»m, sá»­ dá»¥ng tĂªn cĂ¡c nhĂ¢n váº­t Ä‘ang báº¯t trend trĂªn máº¡ng xĂ£ há»™i hoáº·c truyá»‡n tranh.",
  "thuan_tinh_toan": "ÄĂ¢y lĂ  cĂ¢u há»i thuáº§n tĂ­nh toĂ¡n, kiá»ƒm tra ká»¹ nÄƒng biáº¿n Ä‘á»•i. KHĂ”NG cáº§n lá»“ng ghĂ©p lá»i vÄƒn thá»±c táº¿."
};

const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{content}</Latex>;
};

// =============================================================================
// HĂ€M BĂ“C TĂCH Äá»€ THI NHĂP: parseExamDraft(rawText)
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
      if (/cĂ¢u\s*\d+/i.test(stripped)) return -1;
      if (stripped.length > 150) return -1;
      if (/(?:loáº¡i\s*4|pháº§n\s*(?:iv|4)\b|tá»±\s*luáº­n)/i.test(stripped)) return 4;
      if (/(?:loáº¡i\s*3|pháº§n\s*(?:iii|3)\b|tráº£\s*lá»i\s*ngáº¯n)/i.test(stripped)) return 3;
      if (/(?:loáº¡i\s*2|pháº§n\s*(?:ii|2)\b|Ä‘Ăºng\s*[\/.]?\s*sai)/i.test(stripped)) return 2;
      if (/(?:loáº¡i\s*1|pháº§n\s*(?:i|1)\b|nhiá»u\s*(?:lá»±a\s*chá»n|phÆ°Æ¡ng\s*Ă¡n)|tráº¯c\s*nghiá»‡m\s*nhiá»u)/i.test(stripped)) return 1;
      return -1;
    };

    const cauRegex = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b(?:\s*\([^)]*\))*(?:\s*[:.\)\]])?(?:\*\*|__)?/i;

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
        else if (loai === 3) parsed = parseLoai3(blockText); // ÄĂƒ NĂ‚NG Cáº¤P BĂ“C TĂCH LOáº I 3
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
        console.error('[parseExamDraft] Lá»—i parse CĂ¢u ' + block.soCau + ' (Loáº¡i ' + loai + '):', e);
      }
    }

  } catch (error) {
    console.error('parseExamDraft: Lá»—i khi bĂ³c tĂ¡ch Ä‘á» thi ->', error);
  }

  return results;
}

// -----------------------------------------------------------------------------
// LOáº I 1: TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN (A, B, C, D)
// -----------------------------------------------------------------------------
function parseLoai1(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b/gi) || [];

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
      const dapAnD = p.match(/(?:^|\n)\s*(?:\*\*|__)?D[.\)]\s*(?:\*\*|__)?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?ÄĂ¡p Ă¡n)/i)?.[1]?.trim() || '';

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄĂ¡p Ă¡n(?: Ä‘Ăºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thĂ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 1, soCau, noiDung, dapAnA, dapAnB, dapAnC, dapAnD, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 1:', e); }
  });
  return questions;
}

const Y_MARKER = (letter) =>
  new RegExp(`(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ă\\s+|CĂ¢u\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)\\s*(?:\\*\\*|__)?\\s*(?:\\([^)]*\\)\\s*)?`, 'i');

const Y_LOOK = (letter) =>
  `(?:^|\\n)\\s*(?:\\*\\*|__)?(?:[\\*\\-\\+]\\s*)?(?:Ă\\s+|CĂ¢u\\s+)?(?:\\*\\*|__)?${letter}(?:\\)|\\.|:)`;

function extractY(p, letter, nextLetter) {
  const markerRx = Y_MARKER(letter);
  const markerMatch = p.match(markerRx);
  if (!markerMatch) return '';

  const startIdx = p.search(markerRx) + markerMatch[0].length;
  const remaining = p.slice(startIdx);

  const answerBoundaryRx = /(?:^|\n|\s)\*\*\s*(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|HÆ°á»›ng dáº«n|Giáº£i thĂ­ch)[^*]*\*\*|(?:^|\n)\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|Giáº£i thĂ­ch)\s*[:.)\]]?\s*(?:\*\*|__)?/i;

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
// LOáº I 2: TRáº®C NGHIá»†M ÄĂNG/SAI
// -----------------------------------------------------------------------------
function parseLoai2(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b/gi) || [];

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

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄĂ¡p Ă¡n(?: Ä‘Ăºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thĂ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (yA || yB || yC || yD) {
        questions.push({ loaiCauHoi: 2, soCau, noiDung, yA, yB, yC, yD, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 2:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOáº I 3: TRáº¢ Lá»œI NGáº®N â€” ÄĂƒ NĂ‚NG Cáº¤P Äá»˜C Láº¬P Tá»ªNG CĂ‚U (KHĂ”NG a,b,c,d)
// -----------------------------------------------------------------------------
function parseLoai3(text) {
  const questions = [];
  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b/gi) || [];

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

      // Cáº¯t bá» pháº§n ÄĂ¡p Ă¡n, Giáº£i thĂ­ch bá»‹ dĂ­nh vĂ o ná»™i dung
      const noiDungMatch = noiDung.match(/^([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n|Tráº£ lá»i|Giáº£i thĂ­ch))/i);
      noiDung = noiDungMatch ? prefix + noiDungMatch[1].trim() : prefix + noiDung.trim();

      const dapAnDung = p.match(/(?:^|\n)\s*(?:\*\*|__)?ÄĂ¡p Ă¡n(?: Ä‘Ăºng)?\s*[:.\)]\s*(?:\*\*|__)?\s*([^\n]+)/i)?.[1]?.trim() || '';
      const giaiThichMatch = p.match(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thĂ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i);
      const giaiThich = giaiThichMatch ? giaiThichMatch[1].trim() : '';

      if (noiDung) {
        questions.push({ loaiCauHoi: 3, soCau, noiDung, dapAnDung, giaiThich });
      }
    } catch (e) { console.error('Lá»—i parse Loáº¡i 3:', e); }
  });
  return questions;
}

// -----------------------------------------------------------------------------
// LOáº I 4: Tá»° LUáº¬N â€” há»— trá»£ cáº£ cĂ¢u 1 Ă½ vĂ  cĂ¢u nhiá»u Ă½ (a, b, c)
// -----------------------------------------------------------------------------
function parseLoai4(text) {
  const questions = [];

  // Pre-scan: extract Kiáº¿n thá»©c from cĂ¢u headers before the split removes them
  const kienThucMap = {};
  const _hdrRx = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b\s*\(([^)]+)\)/gi;
  let _hm;
  while ((_hm = _hdrRx.exec(text)) !== null) {
    const _ktm = _hm[2].match(/Ki[eĂª]n\s*th[uá»©]c:\s*([^,)]+)/i);
    if (_ktm) {
      const _v = _ktm[1].trim();
      if (/h.nh/i.test(_v)) kienThucMap[_hm[1]] = 'hinh_hoc';
      else if (/[Ä‘d].i\s*s/i.test(_v)) kienThucMap[_hm[1]] = 'dai_so';
    }
  }

  const parts = text.split(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*\d+\b(?:\s*\([^)]*\))*(?:\s*[:.\)])?(?:\*\*|__)?/gi);
  const soCauMatches = text.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*|__)?CĂ¢u\s*(\d+)\b/gi) || [];

  // Strip metadata "(Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...)" khá»i ná»™i dung Ă½
  const stripMeta = (s) => s ? s.replace(/\s*\([^)]*(?:Má»©c Ä‘á»™|MĂ£ nÄƒng lá»±c)[^)]*\)\s*:?\s*/gi, '').trim() : '';

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

  const answerBdRx = /(?:^|\n)\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n(?:\s+Ă½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i;
  const giaiThichRx = /(?:^|\n)\s*(?:\*\*|__)?Giáº£i thĂ­ch\s*[:.\)]\s*(?:\*\*|__)?\s*([\s\S]*)$/i;

  parts.forEach((p, index) => {
    if (!p.trim() || index === 0) return;
    try {
      const matchLabel = soCauMatches[index - 1];
      const soCau = matchLabel ? matchLabel.match(/\d+/)[0] : '';

      // PhĂ¡t hiá»‡n cĂ¡c Ă½ a), b), c) trong block â€” dĂ¹ng Ä‘á»ƒ tĂ¡ch multi-Ă½
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
        // Multi-Ă½: parse tá»«ng Ă½ riĂªng â€” capture intro text before first a)
        const multiYIntro = firstYIndex > 0 ? stripMeta(p.substring(0, firstYIndex).trim()) : '';
        const result = { loaiCauHoi: 4, soCau, noiDung: multiYIntro, kienThuc: kienThucMap[soCau] || '' };
        let totalDiem = 0;
        let giaiThich = '';

        ySegments.forEach(({ label, content }) => {
          const L = label.toUpperCase();

          // TĂ¡ch giáº£i thĂ­ch (láº¥y tá»« Ă½ cuá»‘i cĂ¹ng)
          const gtMatch = content.match(giaiThichRx);
          if (gtMatch && !giaiThich) giaiThich = gtMatch[1].trim();
          const cleanContent = gtMatch ? content.substring(0, content.search(giaiThichRx)).trim() : content.trim();

          // TĂ¡ch ná»™i dung Ă½ vĂ  Ä‘Ă¡p Ă¡n Ă½
          const bdIdx = cleanContent.search(answerBdRx);
          let yNoiDung = bdIdx >= 0 ? cleanContent.substring(0, bdIdx).trim() : cleanContent;
          let yAnswerPart = bdIdx >= 0 ? cleanContent.substring(bdIdx).trim() : '';

          let yDapAn = yAnswerPart.replace(/^\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n(?:\s+Ă½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();

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
        // Single-Ă½: logic cÅ©, chá»‰ bá»• sung stripMeta
        const boundaryIndex = p.search(answerBdRx);
        let noiDung = boundaryIndex >= 0 ? p.substring(0, boundaryIndex).trim() : p.trim();
        let answerPart = boundaryIndex >= 0 ? p.substring(boundaryIndex).trim() : '';

        noiDung = stripMeta(noiDung);

        let dapAn = answerPart.replace(/^\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n(?:\s+Ă½\s+[a-c])?|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m)\s*[:.\)]?(?:\*\*|__)?\s*/i, '').trim();
        const gtIdx2 = dapAn.search(/(?:^|\n)\s*(?:\*\*|__)?Giáº£i thĂ­ch\s*[:.\)]/i);
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

// Helper: map draft TL question sang cáº¥u trĂºc slot Step4
// - Multi-Ă½ (cĂ³ yB): dĂ¹ng yA/yB/yC, dapAnA/B/C, diemA/B/C
// - Single-Ă½: Ä‘Æ°a noiDung â†’ yA, dapAn â†’ dapAnA
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

const LOAI_LABELS = { 1: 'Tráº¯c nghiá»‡m', 2: 'Tráº¯c nghiá»‡m ÄĂºng/Sai', 3: 'Tráº£ lá»i ngáº¯n', 4: 'Tá»± luáº­n' };
const LOAI_COLORS = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-amber-100 text-amber-800 border-amber-300',
  3: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  4: 'bg-purple-100 text-purple-800 border-purple-300',
};

function cleanYContent(text) {
  if (!text) return text;
  const inlineRx = /\s*\*\*\s*(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|HÆ°á»›ng dáº«n|Giáº£i thĂ­ch)/i;
  const newlineRx = /\n\s*(?:\*\*|__)?(?:ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm|ÄĂ¡p Ă¡n Ä‘Ăºng|ÄĂ¡p Ă¡n|Tráº£ lá»i|HÆ°á»›ng dáº«n giáº£i|HÆ°á»›ng dáº«n cháº¥m|Giáº£i thĂ­ch)\s*[:.)\]]?\s*(?:\*\*|__)?/i;
  const idx1 = text.search(inlineRx);
  const idx2 = text.search(newlineRx);
  let cutIdx = -1;
  if (idx1 >= 0 && idx2 >= 0) cutIdx = Math.min(idx1, idx2);
  else if (idx1 >= 0) cutIdx = idx1;
  else if (idx2 >= 0) cutIdx = idx2;
  return cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text;
}

// =============================================================================
// FALLBACK: Tá»° Äá»˜NG PHĂT HIá»†N HĂ€M Sá» â†’ Táº O METADATA Äá»’ THá» CHO MATPLOTLIB
// =============================================================================

/** Chuyá»ƒn biá»ƒu thá»©c toĂ¡n (text/LaTeX) â†’ cĂº phĂ¡p Python/numpy. */
function convertMathToPython(mathExpr) {
  if (!mathExpr) return null;
  let e = mathExpr.trim();
  // Bá» LaTeX format cÆ¡ báº£n
  e = e.replace(/\\left/g, '').replace(/\\right/g, '');
  e = e.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\,/g, ' ');
  // PhĂ¢n sá»‘: \frac{a}{b} â†’ (a)/(b)
  for (let i = 0; i < 3; i++) e = e.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  // LÅ©y thá»«a: x^{n} â†’ x**(n), x^n â†’ x**n
  e = e.replace(/\^\{([^}]+)\}/g, '**($1)');
  e = e.replace(/\^(\d+)/g, '**$1');
  // Unicode superscripts
  e = e.replace(/Â²/g, '**2').replace(/Â³/g, '**3').replace(/â´/g, '**4');
  // CÄƒn báº­c hai
  e = e.replace(/\\sqrt\{([^}]+)\}/g, 'np.sqrt($1)');
  e = e.replace(/âˆ\(([^)]+)\)/g, 'np.sqrt($1)');
  e = e.replace(/âˆ(\w)/g, 'np.sqrt($1)');
  // LÆ°á»£ng giĂ¡c
  e = e.replace(/\\sin/g, 'np.sin').replace(/\\cos/g, 'np.cos').replace(/\\tan/g, 'np.tan');
  e = e.replace(/\bsin\b(?!\w)/g, 'np.sin').replace(/\bcos\b(?!\w)/g, 'np.cos').replace(/\btan\b(?!\w)/g, 'np.tan');
  // Logarit
  e = e.replace(/\\ln/g, 'np.log').replace(/\\log/g, 'np.log10').replace(/\bln\b(?!\w)/g, 'np.log');
  // HĂ m mÅ©: e^x â†’ np.exp(x)
  e = e.replace(/e\*\*\(([^)]+)\)/g, 'np.exp($1)').replace(/e\*\*([x\d])/g, 'np.exp($1)');
  // Trá»‹ tuyá»‡t Ä‘á»‘i
  e = e.replace(/\|([^|]+)\|/g, 'np.abs($1)');
  // Pi
  e = e.replace(/\\pi/g, 'np.pi').replace(/Ï€/g, 'np.pi');
  // NhĂ¢n áº©n: 2x â†’ 2*x, )x â†’ )*x, )( â†’ )*(
  e = e.replace(/(\d)([x(])/g, '$1*$2');
  e = e.replace(/([x)])([x(])/g, '$1*$2');
  e = e.replace(/(\))(\d)/g, '$1*$2');
  e = e.replace(/\s+/g, ' ').trim();
  if (!e.includes('x')) return null;
  return e;
}

/** XĂ¡c Ä‘á»‹nh khoáº£ng x phĂ¹ há»£p dá»±a trĂªn loáº¡i hĂ m. */
function guessXRange(py) {
  if (/np\.sin|np\.cos|np\.tan/.test(py)) return [-7, 7];
  if (/np\.log/.test(py)) return [0.1, 10];
  if (/np\.exp/.test(py)) return [-3, 4];
  if (/x\*\*4|x\*\*\(4\)/.test(py)) return [-3, 3];
  if (/x\*\*3|x\*\*\(3\)/.test(py)) return [-4, 4];
  return [-5, 5];
}

/**
 * Tá»± Ä‘á»™ng phĂ¡t hiá»‡n hĂ m sá»‘ toĂ¡n há»c trong cĂ¢u há»i â†’ táº¡o metadata cho Matplotlib.
 * Há»— trá»£: ToĂ¡n (hĂ m sá»‘, hĂ¬nh há»c Oxy), Váº­t lĂ½ (v-t, s-t, U-I).
 * Chá»‰ kĂ­ch hoáº¡t khi cĂ¢u há»i cĂ³ keyword liĂªn quan.
 */
export function autoDetectGraphMetadata(question) {
  const fields = [question.noiDung, question.yA, question.yB, question.yC, question.yD];
  const allText = fields.filter(Boolean).join('\n');
  if (!allText) return null;

  // â”€â”€ 1. TOĂN: Äá»“ thá»‹ hĂ m sá»‘ â”€â”€
  if (/(?:Ä‘á»“ thá»‹|Ä‘Æ°á»ng cong|báº£ng biáº¿n thiĂªn|cá»±c trá»‹|cá»±c Ä‘áº¡i|cá»±c tiá»ƒu|tiá»‡m cáº­n|hĂ m sá»‘|kháº£o sĂ¡t|biá»ƒu diá»…n)/i.test(allText)) {
    let funcExpr = null, displayTitle = null;
    const latexM = allText.match(/\$\s*y\s*=\s*([^$]+?)\s*\$/i);
    if (latexM) { funcExpr = latexM[1].trim(); displayTitle = `y = ${funcExpr}`; }
    if (!funcExpr) {
      const plainM = allText.match(/(?:hĂ m\s+sá»‘\s+)?y\s*=\s*([^\n,;.]+)/i);
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

  // â”€â”€ 2. Váº¬T LĂ: Äá»“ thá»‹ v-t, s-t, U-I â”€â”€
  if (/(?:Ä‘á»“ thá»‹\s*(?:v[\s-]*t|s[\s-]*t|U[\s-]*I|váº­n tá»‘c|quĂ£ng Ä‘Æ°á»ng|hiá»‡u Ä‘iá»‡n tháº¿)|chuyá»ƒn Ä‘á»™ng\s*(?:tháº³ng|Ä‘á»u|biáº¿n Ä‘á»•i)|gia tá»‘c)/i.test(allText)) {
    // Detect xem lĂ  loáº¡i Ä‘á»“ thá»‹ nĂ o
    let nhanX = 't (s)', nhanY = 'v (m/s)', tieuDe = 'Äá»“ thá»‹ váº­n tá»‘c - thá»i gian';
    if (/s[\s-]*t|quĂ£ng Ä‘Æ°á»ng/i.test(allText)) { nhanY = 's (m)'; tieuDe = 'Äá»“ thá»‹ quĂ£ng Ä‘Æ°á»ng - thá»i gian'; }
    if (/U[\s-]*I|hiá»‡u Ä‘iá»‡n tháº¿/i.test(allText)) { nhanX = 'I (A)'; nhanY = 'U (V)'; tieuDe = 'Äá»“ thá»‹ U-I'; }
    // Tráº£ vá» metadata cÆ¡ báº£n â€” AI nĂªn ghi chi tiáº¿t hÆ¡n qua prompt
    return { loai: 'do_thi_vat_ly', tieuDe, nhanX, nhanY, doanThang: [], diemDacBiet: [] };
  }

  return null;
}

/** TrĂ­ch xuáº¥t metadata "HĂ¬nh áº£nh:" JSON tá»« text (thÆ°á»ng náº±m trong giaiThich). */
export function extractHinhAnhFromText(text) {
  if (!text) return null;
  // TĂ¬m vá»‹ trĂ­ dĂ²ng "HĂ¬nh áº£nh:" trong text
  const headerMatch = text.match(/(?:^|\n)\s*(?:\*\*)?HĂ¬nh áº£nh(?:\*\*)?[:\s]*/im);
  if (!headerMatch) return null;
  const headerStart = text.indexOf(headerMatch[0]);
  const jsonStart = headerStart + headerMatch[0].length;
  // TĂ¬m kĂ½ tá»± '{' Ä‘áº§u tiĂªn sau header
  const braceStart = text.indexOf('{', jsonStart);
  if (braceStart < 0) return null;
  // Äáº¿m ngoáº·c {} Ä‘á»ƒ tĂ¬m vá»‹ trĂ­ káº¿t thĂºc JSON (há»— trá»£ nested objects)
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
      alert('Vui lĂ²ng chá»n Ă´ Ä‘Ă­ch trÆ°á»›c khi Ä‘áº©y!');
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
    // Báº£o toĂ n metadata hĂ¬nh áº£nh khi Ä‘áº©y lĂªn Khung Äá»
    if (question.hinhAnh) {
      mappedData.hinhAnh = question.hinhAnh;
    }

    onPush(selectedSlot, mappedData, question);
  };

  const isMultiY = question.loaiCauHoi === 2; // Chá»‰ ÄĂºng/Sai lĂ  Ä‘a Ă½ a,b,c,d

  return (
    <div className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative ${LOAI_COLORS[question.loaiCauHoi] || 'bg-gray-100 text-gray-800 border-gray-300'} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={() => onDelete(index)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white transition-colors shadow-sm"
          title="XĂ³a cĂ¢u nĂ y khá»i danh sĂ¡ch nhĂ¡p"
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
          {LOAI_LABELS[question.loaiCauHoi] || 'KhĂ´ng rĂµ'}
        </span>
        <span className="ml-auto text-xs font-bold opacity-50">NhĂ¡p #{index + 1}</span>
      </div>

      {originalSlotLabel && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 shadow-sm">
            <span>đŸ”„</span> Äá» thay tháº¿ cho {originalSlotLabel}
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
          const maNlMatch = metaStr.match(/MĂ£ nÄƒng lá»±c:\s*([^,)]+)/i);
          return (
            <div className="mb-2 px-3 py-1.5 bg-white/60 rounded-lg border border-current/10">
              <p className="text-xs font-bold text-slate-800">
                đŸ“Œ {chuDeMatch ? chuDeMatch[1].trim() : 'ChÆ°a rĂµ'}
                {mucDoMatch && <span className="ml-2 font-semibold text-indigo-600">({mucDoMatch[1].trim()})</span>}
                {maNlMatch && <span className="ml-2 font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">[{maNlMatch[1].trim()}]</span>}
              </p>
            </div>
          );
        }
        return null;
      })()}

      {(() => {
        const cleanNoidung = (text) => text ? text.replace(/^(?:\*\*|__)?CĂ¢u\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '') : '';
        return (
          <>
            {question.loaiCauHoi === 1 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  CĂ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm text-slate-800 bg-white/40 p-3 rounded">
                  <div><strong>A.</strong> <MathText content={question.dapAnA} /></div>
                  <div><strong>B.</strong> <MathText content={question.dapAnB} /></div>
                  <div><strong>C.</strong> <MathText content={question.dapAnC} /></div>
                  <div><strong>D.</strong> <MathText content={question.dapAnD} /></div>
                </div>
              </>
            )}

            {/* NĂ‚NG Cáº¤P: HIá»‚N THá» LOáº I 3 TRáº¢ Lá»œI NGáº®N NHÆ¯ 1 CĂ‚U Há»I Äá»˜C Láº¬P */}
            {question.loaiCauHoi === 3 && (
              <>
                <p className="font-semibold mb-3 leading-relaxed text-slate-900 whitespace-pre-wrap">
                  CĂ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                </p>
              </>
            )}

            {isMultiY && question.loaiCauHoi !== 4 && (
              <>
                {question.noiDung && (
                  <p className="font-semibold mb-2 text-slate-900 whitespace-pre-wrap">
                    CĂ¢u {index + 1}: <MathText content={question.noiDung} />
                  </p>
                )}
                {!question.noiDung && <p className="font-semibold mb-2 text-slate-900">CĂ¢u {index + 1}:</p>}
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
                  /* Multi-Ă½: hiá»ƒn thá»‹ tá»«ng Ă½ riĂªng */
                  <>
                    <p className="font-semibold mb-2 text-slate-900">
                      CĂ¢u {index + 1}: <span className="text-xs font-normal text-slate-500">(Tá»± luáº­n nhiá»u Ă½)</span>
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">đŸ“ HĂ¬nh há»c</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">âˆ‘ Äáº¡i sá»‘</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">đŸ“Œ Tá»•ng Ä‘iá»ƒm: {question.diem} Ä‘iá»ƒm</div>}
                    {question.noiDung && (
                      <div className="text-sm text-slate-800 mb-3 bg-purple-50 border border-purple-200 p-2 rounded whitespace-pre-wrap">
                        <span className="text-xs font-bold text-purple-700 block mb-1">đŸ“‹ Äá» bĂ i chung:</span>
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
                          <span className="text-xs text-red-600 font-bold">đŸ“Œ {question[`diem${L}`]} Ä‘iá»ƒm</span>
                        )}
                        {question[`dapAn${L}`] && (
                          <div className="mt-1 space-y-0.5 text-xs text-slate-800 bg-white/40 p-2 rounded">
                            <div className="font-bold text-green-700 mb-0.5">ÄĂ¡p Ă¡n Ă½ {L.toLowerCase()}:</div>
                            {question[`dapAn${L}`].split('\n').filter(l => l.trim()).map((line, li) => (
                              <div key={li} className="ml-2"><MathText content={line} /></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  /* Single-Ă½: giá»¯ nguyĂªn nhÆ° cÅ© */
                  <>
                    <p className="font-semibold mb-2 leading-relaxed text-slate-900 whitespace-pre-wrap">
                      CĂ¢u {index + 1}: <MathText content={cleanNoidung(question.noiDung)} />
                      {question.kienThuc === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">đŸ“ HĂ¬nh há»c</span>}
                      {question.kienThuc === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">âˆ‘ Äáº¡i sá»‘</span>}
                    </p>
                    {question.diem && <div className="text-sm text-red-600 font-bold mb-2 bg-red-50 px-3 py-1 rounded inline-block">đŸ“Œ Äiá»ƒm: {question.diem} Ä‘iá»ƒm</div>}
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
                <span className="font-bold text-slate-800">ÄĂ¡p Ă¡n Ä‘Ăºng:</span>{' '}
                <span className="font-mono text-red-600 font-bold whitespace-pre-wrap"><MathText content={question.dapAnDung} /></span>
              </div>
            )}

            <p className="text-sm opacity-90 mb-4 bg-white/40 p-2 rounded whitespace-pre-wrap">
              <strong className="text-slate-800">Giáº£i thĂ­ch:</strong> <MathText content={question.giaiThich} />
            </p>

            {/* Hiá»ƒn thá»‹ Ä‘á»“ thá»‹ Matplotlib náº¿u cĂ¢u há»i cĂ³ hinhAnh */}
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
          <option value="">-- Chá»n Ă´ Ä‘Ă­ch trong Khung Äá» --</option>
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
          Äáº©y lĂªn Khung Äá»
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT CHĂNH: Step5_AIGenerator
// =============================================================================
export default function Step5_AIGenerator() {
  const { matrix, config, examConfig, tuLuanConfig, examHeader, draftQuestions, setDraftQuestions, examSlots, pushToExamSlot } = useExamStore();
  const [examContent, setExamContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [parseError, setParseError] = useState('');
  const [selectedDrafts, setSelectedDrafts] = useState([]);

  const hasManualTLConfig = tuLuanConfig?.enabled && tuLuanConfig?.questions?.length > 0 && tuLuanConfig.questions.some(q => q.subItems?.length > 0);

  const handleCopyExamPrompt = async () => {
    let prompt = `Báº¡n lĂ  má»™t chuyĂªn gia ra Ä‘á» thi xuáº¥t sáº¯c. Dá»±a vĂ o TĂ€I LIá»†U SĂCH GIĂO KHOA/BĂ€I GIáº¢NG tĂ´i Ä‘Ă­nh kĂ¨m, hĂ£y biĂªn soáº¡n má»™t Äá»€ KIá»‚M TRA ÄĂNH GIĂ NÄ‚NG Lá»°C BĂM SĂT MA TRáº¬N Báº¢N Äáº¶C Táº¢ YĂU Cáº¦U Cáº¦N Äáº T VĂ€ KHUNG Äá»€ KIá»‚M TRA.\n`;

    prompt += `\nâ ï¸ QUY Táº®C TRĂŒNH BĂ€Y CĂ”NG THá»¨C TOĂN/LĂ/HĂ“A (Báº®T BUá»˜C):\n`;
    prompt += `- CĂ”NG THá»¨C TOĂN/HĂ“A: TUYá»†T Äá»I KHĂ”NG dĂ¹ng Ä‘á»‹nh dáº¡ng LaTeX ($...$) cho cĂ¡c mÅ©i tĂªn pháº£n á»©ng hĂ³a há»c (->, =>, <=>) vĂ  kĂ­ hiá»‡u nhiá»‡t Ä‘á»™ (Ä‘á»™ C, ^oC). Báº¯t buá»™c viáº¿t chĂºng dÆ°á»›i dáº¡ng text thÆ°á»ng.\n`;
    prompt += `- Vá»›i cĂ´ng thá»©c HĂ³a há»c, Váº­t lĂ½ Ä‘Æ¡n giáº£n: Sá»¬ Dá»¤NG kĂ½ tá»± UNICODE (VĂ­ dá»¥: Hâ‚‚SOâ‚„, FeÂ²âº, Î±, Î”t). KhĂ´ng dĂ¹ng mĂ£ code cho loáº¡i nĂ y.\n`;
    prompt += `- CHá»ˆ KHI cĂ³ cĂ´ng thá»©c ToĂ¡n há»c phá»©c táº¡p (phĂ¢n sá»‘, cÄƒn thá»©c, há»‡ phÆ°Æ¡ng trĂ¬nh, tĂ­ch phĂ¢n...): Má»›i sá»­ dá»¥ng mĂ£ LaTeX vĂ  Báº®T BUá»˜C bá»c trong cáº·p dáº¥u $...$ (vĂ­ dá»¥: $\\frac{1}{2}$) hoáº·c $$...$$ cho cĂ´ng thá»©c Ä‘á»©ng 1 dĂ²ng.\n\n`;

    prompt += `đŸ–¼ï¸đŸ–¼ï¸đŸ–¼ï¸ YĂU Cáº¦U HĂŒNH áº¢NH â€” Báº®T BUá»˜C (Äá»ŒC Ká»¸ TRÆ¯á»C KHI LĂ€M):\\n`;
    prompt += `Trong Ä‘á» thi nĂ y, Báº N PHáº¢I táº¡o Tá»I THIá»‚U 1-2 cĂ¢u há»i cĂ³ dĂ²ng "HĂ¬nh áº£nh:" kĂ¨m JSON metadata.\\n`;
    prompt += `Há»‡ thá»‘ng sáº½ Tá»° Äá»˜NG váº½ hĂ¬nh báº±ng Python Matplotlib tá»« JSON báº¡n cung cáº¥p.\\n`;
    prompt += `đŸ“ CĂ¡ch ghi: Ngay SAU dĂ²ng "Giáº£i thĂ­ch:" cá»§a cĂ¢u há»i Ä‘Ă³, thĂªm 1 dĂ²ng má»›i báº¯t Ä‘áº§u báº±ng "HĂ¬nh áº£nh:" rá»“i ghi JSON.\\n`;
    prompt += `đŸ“ VĂ­ dá»¥ biá»ƒu Ä‘á»“ cá»™t: HĂ¬nh áº£nh: {"loai":"bieu_do_cot","tieuDe":"DĂ¢n sá»‘ ÄNĂ","nhanX":"Quá»‘c gia","nhanY":"Triá»‡u ngÆ°á»i","nhan":["VN","ThĂ¡i Lan","Indonesia"],"giaTri":[100,72,275]}\\n`;
    prompt += `đŸ“ VĂ­ dá»¥ Ä‘á»“ thá»‹ hĂ m sá»‘: HĂ¬nh áº£nh: {"loai":"do_thi_ham_so","hamSo":"x**2 - 4*x + 3","xRange":[-2,6],"tieuDe":"y = xÂ² - 4x + 3"}\\n`;
    prompt += `đŸ“ VĂ­ dá»¥ biá»ƒu Ä‘á»“ trĂ²n: HĂ¬nh áº£nh: {"loai":"bieu_do_tron","tieuDe":"CÆ¡ cáº¥u kinh táº¿","nhan":["NĂ´ng nghiá»‡p","CĂ´ng nghiá»‡p","Dá»‹ch vá»¥"],"giaTri":[12,38,50]}\\n`;
    prompt += `â ï¸ Náº¾U Báº N KHĂ”NG THĂM ĂT NHáº¤T 1 CĂ‚U CĂ“ "HĂ¬nh áº£nh:", Äá»€ THI Sáº¼ Bá» TRáº¢ Láº I.\\n\\n`;

    prompt += `â ï¸ YĂU Cáº¦U Tá»I QUAN TRá»ŒNG Vá»€ Äá»NH Dáº NG (FORMAT):
Báº¡n Báº®T BUá»˜C pháº£i trĂ¬nh bĂ y tá»«ng cĂ¢u há»i theo Ä‘Ăºng KHUĂ”N MáºªU dÆ°á»›i Ä‘Ă¢y Ä‘á»ƒ há»‡ thá»‘ng pháº§n má»m cá»§a tĂ´i Ä‘á»c Ä‘Æ°á»£c. 
Äáº·c biá»‡t lÆ°u Ă½: Pháº£i ghi rĂµ (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MĂ£ nÄƒng lá»±c: ...) á»Ÿ trong má»—i Ă½ nhá». Trong Ä‘Ă³ "MĂ£ nÄƒng lá»±c" lĂ  mĂ£ cá»¥ thá»ƒ tĂ´i sáº½ cung cáº¥p cho tá»«ng cĂ¢u á»Ÿ pháº§n Ma tráº­n bĂªn dÆ°á»›i (vĂ­ dá»¥: HH1.1, TD1.2, ...).

=== KHUĂ”N MáºªU Tá»ªNG LOáº I CĂ‚U Há»I ===

[LOáº I 1: TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN] (Má»—i cĂ¢u Ä‘Ăºng Ä‘Æ°á»£c ${examConfig.diemMoiCauP1} Ä‘iá»ƒm)
CĂ¢u [Sá»‘] (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung cĂ¢u há»i]
A. [Lá»±a chá»n A]
B. [Lá»±a chá»n B]
C. [Lá»±a chá»n C]
D. [Lá»±a chá»n D]
ÄĂ¡p Ă¡n Ä‘Ăºng: [Chá»‰ ghi chá»¯ cĂ¡i A, B, C hoáº·c D]
Giáº£i thĂ­ch: [Giáº£i thĂ­ch ngáº¯n gá»n]

[LOáº I 2: TRáº®C NGHIá»†M ÄĂNG/SAI â€” CHĂ™M CĂ‚U Há»I] (Má»—i Ă½ Ä‘Ăºng Ä‘Æ°á»£c ${examConfig.diemMoiYP2} Ä‘iá»ƒm)
â ï¸ QUAN TRá»ŒNG: Má»—i cĂ¢u ÄĂºng/Sai Báº®T BUá»˜C cĂ³ 1 Äá»€ BĂ€I CHUNG á»Ÿ Ä‘áº§u. Sau Ä‘Ă³ phĂ¡t triá»ƒn 4 Ă½ a,b,c,d.
â ï¸ YĂU Cáº¦U PHĂ‚N Má»¨C Äá»˜ 4 Ă: Ă a) má»©c Nháº­n biáº¿t, Ă½ b) má»©c ThĂ´ng hiá»ƒu, Ă½ c) má»©c Váº­n dá»¥ng, Ă½ d) má»©c Váº­n dá»¥ng cao.
${config.groupTfByTopic ? 'â ï¸ Äáº¶C BIá»†T: Cháº¿ Ä‘á»™ "Gom nhĂ³m theo Chá»§ Ä‘á»" Ä‘ang báº­t. 4 má»‡nh Ä‘á» a, b, c, d cá»§a má»—i cĂ¢u ÄĂºng/Sai nĂªn láº¥y kiáº¿n thá»©c tá»« CĂC BĂ€I Há»ŒC KHĂC NHAU trong cĂ¹ng chá»§ Ä‘á», táº¡o thĂ nh cĂ¢u há»i kiá»ƒm tra kiáº¿n thá»©c tá»•ng há»£p cá»§a cáº£ chá»§ Ä‘á».\\n' : ''}CĂ¢u [Sá»‘] (Chá»§ Ä‘á»: ...): [Ná»™i dung Ä‘á» bĂ i chung / TĂ¬nh huá»‘ng]
a) (Má»©c Ä‘á»™: Nháº­n biáº¿t, MĂ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» a]
b) (Má»©c Ä‘á»™: ThĂ´ng hiá»ƒu, MĂ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» b]
c) (Má»©c Ä‘á»™: Váº­n dá»¥ng, MĂ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» c]
d) (Má»©c Ä‘á»™: Váº­n dá»¥ng cao, MĂ£ nÄƒng lá»±c: ...) [Má»‡nh Ä‘á» d]
ÄĂ¡p Ă¡n Ä‘Ăºng: a-Ä, b-S, c-Ä, d-S
Giáº£i thĂ­ch: [Giáº£i thĂ­ch ngáº¯n gá»n vĂ¬ sao Ä‘Ăºng/sai]
`;
    if (config.hasTraLoiNgan) {
      prompt += `[LOáº I 3: TRáº¢ Lá»œI NGáº®N] (Má»—i cĂ¢u Ä‘Ăºng Ä‘Æ°á»£c ${examConfig.diemMoiYP3} Ä‘iá»ƒm)
â ï¸ QUY Táº®C THĂ‰P: Báº®T BUá»˜C pháº£i Ä‘áº·t cĂ¢u há»i sao cho ÄĂP ĂN CUá»I CĂ™NG CHá»ˆ LĂ€ Má»˜T CON Sá» Cá»¤ THá»‚ (vĂ­ dá»¥: 15, 0.5, 100...). Tuyá»‡t Ä‘á»‘i khĂ´ng há»i lĂ½ thuyáº¿t yĂªu cáº§u tráº£ lá»i báº±ng chá»¯ dĂ i dĂ²ng. KHĂ”NG gom thĂ nh cĂ¡c Ă½ a, b, c, d. Má»—i cĂ¢u tráº£ lá»i ngáº¯n lĂ  má»™t CĂ¢u há»i Ä‘á»™c láº­p.
â ï¸ GIá»I Háº N ÄĂP ĂN: Con sá»‘ Ä‘Ă¡p Ă¡n Tá»I ÄA 4 CHá»® Sá» (báº¥t ká»ƒ cĂ³ dáº¥u pháº©y/cháº¥m tháº­p phĂ¢n hay khĂ´ng). VĂ­ dá»¥ há»£p lá»‡: 5, 12, 150, 1500, 0.25, 12.5. VĂ­ dá»¥ KHĂ”NG há»£p lá»‡: 12345, 100000.
â ï¸ NGOáº I Lá»† mĂ´n XĂ£ há»™i (Sá»­, Äá»‹a, GDCD, VÄƒn, Tiáº¿ng Anh): Náº¿u cĂ¢u há»i khĂ´ng thá»ƒ Ä‘á»‹nh lÆ°á»£ng báº±ng sá»‘, Ä‘Ă¡p Ă¡n CĂ“ THá»‚ lĂ  1 tá»«/cá»¥m tá»« ngáº¯n (tá»‘i Ä‘a 5 tá»«), vĂ­ dá»¥: "1945", "HĂ  Ná»™i", "Nguyá»…n Du".
CĂ¢u [Sá»‘] (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung cĂ¢u há»i ngáº¯n Ä‘Ă²i há»i tĂ­nh toĂ¡n hoáº·c Ä‘áº¿m sá»‘ lÆ°á»£ng]
ÄĂ¡p Ă¡n Ä‘Ăºng: [CHá»ˆ GHI DUY NHáº¤T 1 CON Sá», Tá»I ÄA 4 CHá»® Sá»]
Giáº£i thĂ­ch: [CĂ¡ch giáº£i/LĂ½ do ngáº¯n gá»n]\n\n`;
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
      const _ktField = (hasManualTLConfig && tuLuanConfig?.questions?.some(q => q.kienThuc === 'hinh_hoc' || q.kienThuc === 'dai_so')) ? ', Kiáº¿n thá»©c: [HĂ¬nh há»c/Äáº¡i sá»‘]' : '';
      prompt += `[LOáº I 4: Tá»° LUáº¬N] (Tá»•ng Ä‘iá»ƒm toĂ n pháº§n tá»± luáº­n: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm)
â ï¸ QUY Táº®C Cáº¤U TRĂC CĂ‚U Tá»° LUáº¬N:
- CĂ¢u ÄÆ N Ă (1 Ă½): CĂ¢u há»i Ä‘á»™c láº­p, 1 yĂªu cáº§u duy nháº¥t, khĂ´ng cĂ³ Ă½ phá»¥ a, b, c.
- CĂ¢u 2 Ă (cĂ³ Ă½ a, b): Hai Ă½ cĂ³ thá»ƒ lĂ  (1) cĂ¹ng 1 Ä‘á» bĂ i chung rá»“i chia Ă½ a, Ă½ b liĂªn quan nhau; HOáº¶C (2) 2 Ă½ a, b hoĂ n toĂ n Ä‘á»™c láº­p khĂ´ng liĂªn quan Ä‘áº¿n nhau.
- CĂ¢u 3 Ă (cĂ³ Ă½ a, b, c): ThÆ°á»ng cĂ³ 1 Ä‘á» bĂ i chung (vĂ­ dá»¥ bĂ i toĂ¡n hĂ¬nh há»c) rá»“i chia thĂ nh 3 yĂªu cáº§u a, b, c xoay quanh Ä‘á» bĂ i chung Ä‘Ă³.
- Tá»‘i Ä‘a 3 Ă½ (a, b, c) má»—i cĂ¢u. Sá»‘ Ä‘iá»ƒm má»—i Ă½ pháº£i khá»›p chĂ­nh xĂ¡c vá»›i biá»ƒu Ä‘iá»ƒm Ä‘Æ°á»£c giao.
- Sá»‘ cĂ¢u vĂ  sá»‘ Ă½ má»—i cĂ¢u Ä‘Æ°á»£c quy Ä‘á»‹nh Cá»¤ THá»‚ á»Ÿ pháº§n Ma tráº­n bĂªn dÆ°á»›i â€” TUĂ‚N THá»¦ 100%.

KhuĂ´n máº«u cĂ¢u ÄÆ N Ă:
CĂ¢u [Sá»‘] (Má»©c Ä‘á»™: ..., Chá»§ Ä‘á»: ..., MĂ£ nÄƒng lá»±c: ...${_ktField}): [Ná»™i dung cĂ¢u há»i]
ÄĂ¡p Ă¡n Ä‘Ăºng vĂ  biá»ƒu Ä‘iá»ƒm:
+ [Ná»™i dung bÆ°á»›c giáº£i] || [Äiá»ƒm]
Giáº£i thĂ­ch: [Ngáº¯n gá»n]

KhuĂ´n máº«u cĂ¢u 2 Ă:
CĂ¢u [Sá»‘] (Chá»§ Ä‘á»: ...${_ktField}): [Äá» bĂ i chung â€” hoáº·c bá» trá»‘ng náº¿u 2 Ă½ Ä‘á»™c láº­p]
a) (Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung Ă½ a]
ÄĂ¡p Ă¡n Ă½ a: [HÆ°á»›ng dáº«n giáº£i Ă½ a] || [Äiá»ƒm Ă½ a]
b) (Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung Ă½ b]
ÄĂ¡p Ă¡n Ă½ b: [HÆ°á»›ng dáº«n giáº£i Ă½ b] || [Äiá»ƒm Ă½ b]
Giáº£i thĂ­ch: [Ngáº¯n gá»n]

KhuĂ´n máº«u cĂ¢u 3 Ă:
CĂ¢u [Sá»‘] (Chá»§ Ä‘á»: ...${_ktField}): [Äá» bĂ i chung]
a) (Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung Ă½ a]
ÄĂ¡p Ă¡n Ă½ a: [HÆ°á»›ng dáº«n giáº£i Ă½ a] || [Äiá»ƒm Ă½ a]
b) (Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung Ă½ b]
ÄĂ¡p Ă¡n Ă½ b: [HÆ°á»›ng dáº«n giáº£i Ă½ b] || [Äiá»ƒm Ă½ b]
c) (Má»©c Ä‘á»™: ..., MĂ£ nÄƒng lá»±c: ...): [Ná»™i dung Ă½ c]
ÄĂ¡p Ă¡n Ă½ c: [HÆ°á»›ng dáº«n giáº£i Ă½ c] || [Äiá»ƒm Ă½ c]
Giáº£i thĂ­ch: [Ngáº¯n gá»n]

â ï¸ PHĂ‚N Bá»” ÄIá»‚M: Tá»•ng Ä‘iá»ƒm cĂ¡c bÆ°á»›c giáº£i cá»§a má»—i cĂ¢u pháº£i khá»›p CHĂNH XĂC vá»›i sá»‘ Ä‘iá»ƒm Ä‘Æ°á»£c giao. KHĂ”NG ÄÆ¯á»¢C vÆ°á»£t quĂ¡ hoáº·c thiáº¿u.\n\n`;
    }

    prompt += `--- CHI TIáº¾T MA TRáº¬N Äá»€ THI Báº N Cáº¦N SOáº N (TUĂ‚N THá»¦ 100% Sá» LÆ¯á»¢NG NĂ€Y) ---\n\n`;
    prompt += `\nđŸ¯ TIĂU CHĂ CHáº¤T LÆ¯á»¢NG CĂ‚U Há»I (Báº®T BUá»˜C TUĂ‚N THá»¦ TUYá»†T Äá»I):\n`;
    prompt += `1. VAI TRĂ’ Cá»¦A Báº N: Báº¡n lĂ  ChuyĂªn gia ra Ä‘á» thi cá»§a Bá»™ GD&ÄT, am hiá»ƒu sĂ¢u sáº¯c ChÆ°Æ¡ng trĂ¬nh GDPT 2018. CĂ¢u há»i pháº£i Ä‘Ă¡nh giĂ¡ ÄĂNG NÄ‚NG Lá»°C, tuyá»‡t Ä‘á»‘i KHĂ”NG há»i váº¹t, KHĂ”NG há»i Ä‘á»‹nh nghÄ©a há»c thuá»™c lĂ²ng, KHĂ”NG Ä‘Ă¡nh Ä‘á»‘ ngá»› ngáº©n.\n`;
    prompt += `\nđŸ“Œ QUY Táº®C PHáº¦N TRáº®C NGHIá»†M (Nhiá»u lá»±a chá»n & ÄĂºng/Sai):\n`;
    prompt += `- 3 phÆ°Æ¡ng Ă¡n nhiá»…u (sai) pháº£i Ä‘Æ°á»£c thiáº¿t káº¿ Cá»°C Ká»² TINH VI dá»±a trĂªn cĂ¡c "Lá»–I SAI PHá»” BIáº¾N" cá»§a há»c sinh. Tuyá»‡t Ä‘á»‘i khĂ´ng cho Ä‘Ă¡p Ă¡n nhiá»…u vĂ´ lĂ½, dá»… Ä‘oĂ¡n.\n`;

    if (config.hasTuLuan) {
      prompt += `\nđŸ“Œ QUY Táº®C PHáº¦N Tá»° LUáº¬N:\n`;
      prompt += `- CĂ¢u há»i tá»± luáº­n pháº£i lĂ  bĂ i toĂ¡n/tĂ¬nh huá»‘ng cĂ³ lá»i vÄƒn, yĂªu cáº§u tÆ° duy logic.\n`;
      if (!hasManualTLConfig) {
        prompt += `- Má»—i cĂ¢u lĂ  1 cĂ¢u há»i Äá»˜C Láº¬P â€” TUYá»†T Äá»I KHĂ”NG chia thĂ nh cĂ¡c Ă½ a, b, c riĂªng biá»‡t trong cĂ¹ng 1 cĂ¢u (trá»« cĂ¢u 2 Ă½ Ä‘Ă£ Ä‘Æ°á»£c chá»‰ Ä‘á»‹nh).\n`;
      }
      prompt += `- Trong pháº§n HÆ°á»›ng dáº«n cháº¥m (ÄĂ¡p Ă¡n), Báº®T BUá»˜C pháº£i chia nhá» thĂ nh tá»«ng bÆ°á»›c giáº£i chi tiáº¿t vĂ  phĂ¢n bá»• Ä‘iá»ƒm sá»‘ rĂµ rĂ ng (vĂ­ dá»¥: || 0.25, || 0.5) cho Má»–I BÆ¯á»C.\n`;
    }

    prompt += `\nđŸ“ Äáº¶C THĂ™ Tá»ªNG Bá»˜ MĂ”N:\n`;
    prompt += `- MĂ”N TOĂN: 100% cĂ¢u há»i tráº¯c nghiá»‡m pháº£i lĂ  bĂ i táº­p TĂNH TOĂN, tĂ¬m x, tĂ­nh diá»‡n tĂ­ch, giáº£i quyáº¿t váº¥n Ä‘á». KHĂ”NG há»i lĂ½ thuyáº¿t suĂ´ng (kiá»ƒu "PhĂ¢n sá»‘ lĂ  gĂ¬?"). CĂ¡c Ä‘Ă¡p Ă¡n nhiá»…u lĂ  káº¿t quáº£ cá»§a viá»‡c tĂ­nh nháº§m dáº¥u, sai cĂ´ng thá»©c.\n`;
    prompt += `- MĂ”N KHOA Há»ŒC Tá»° NHIĂN (LĂ½, HĂ³a, Sinh): CĂ¢u há»i Ä‘i tháº³ng vĂ o báº£n cháº¥t hiá»‡n tÆ°á»£ng, sÆ¡ Ä‘á»“ thĂ­ nghiá»‡m, pháº£n á»©ng hĂ³a há»c, hoáº·c bĂ i táº­p thá»±c tiá»…n Ä‘á»i sá»‘ng.\n`;
    prompt += `- MĂ”N KHOA Há»ŒC XĂƒ Há»˜I (Sá»­, Äá»‹a, GDCD): Sá»­/Äá»‹a Æ°u tiĂªn nguyĂªn nhĂ¢n, há»‡ quáº£, phĂ¢n tĂ­ch sá»‘ liá»‡u/biá»ƒu Ä‘á»“. RiĂªng GDCD/KTPL: 100% cĂ¢u há»i Váº­n dá»¥ng pháº£i lĂ  TĂŒNH HUá»NG THá»°C Táº¾ (vĂ­ dá»¥: nhĂ¢n váº­t A, B vi pháº¡m gĂ¬) Ä‘á»ƒ há»c sinh xá»­ lĂ½.\n`;
    prompt += `- MĂ”N NGá»® VÄ‚N: Táº­p trung Äá»ŒC HIá»‚U (nháº­n diá»‡n tu tá»«, tĂ¡c dá»¥ng nghá»‡ thuáº­t, phÆ°Æ¡ng thá»©c biá»ƒu Ä‘áº¡t). Tá»± luáº­n hÆ°á»›ng Ä‘áº¿n cáº£m thá»¥ vĂ  nghá»‹ luáº­n.\n`;
    prompt += `- MĂ”N TIáº¾NG ANH: Kiá»ƒm tra tá»« vá»±ng trong ngá»¯ cáº£nh (Context), chá»©c nÄƒng giao tiáº¿p. ÄĂ¡p Ă¡n nhiá»…u pháº£i cĂ³ cáº¥u trĂºc tÆ°Æ¡ng Ä‘á»“ng Ä‘á»ƒ phĂ¢n loáº¡i há»c sinh.\n`;
    prompt += `\n`;

    prompt += `\nđŸ“Œ QUY Táº®C TRĂŒNH BĂ€Y CĂ”NG THá»¨C TOĂN/LĂ/HĂ“A (Báº®T BUá»˜C Äá»‚ XUáº¤T WORD CHUáº¨N):\n`;
    prompt += `- TUYá»†T Äá»I KHĂ”NG dĂ¹ng Ä‘á»‹nh dáº¡ng LaTeX ($...$) cho cĂ¡c mÅ©i tĂªn pháº£n á»©ng hĂ³a há»c (->, =>, <=>) vĂ  kĂ­ hiá»‡u nhiá»‡t Ä‘á»™ (Ä‘á»™ C, ^oC). Báº¯t buá»™c viáº¿t chĂºng dÆ°á»›i dáº¡ng text thÆ°á»ng.\n`;
    prompt += `- Vá»›i cĂ´ng thá»©c HĂ³a há»c, Váº­t lĂ½ Ä‘Æ¡n giáº£n: Sá»¬ Dá»¤NG kĂ½ tá»± UNICODE (VĂ­ dá»¥: Hâ‚‚SOâ‚„, FeÂ²âº, Î±, Î”t). Tuyá»‡t Ä‘á»‘i khĂ´ng dĂ¹ng mĂ£ code cho loáº¡i nĂ y.\n`;
    prompt += `- CHá»ˆ KHI cĂ³ cĂ´ng thá»©c ToĂ¡n há»c phá»©c táº¡p (phĂ¢n sá»‘, cÄƒn thá»©c, há»‡ phÆ°Æ¡ng trĂ¬nh...): Má»›i sá»­ dá»¥ng mĂ£ LaTeX vĂ  Báº®T BUá»˜C bá»c trong cáº·p dáº¥u $...$ (vĂ­ dá»¥: $\\frac{1}{2}$) hoáº·c $$...$$ cho cĂ´ng thá»©c Ä‘á»©ng 1 dĂ²ng.\n`;

    prompt += `\nđŸ“ˆ HÆ¯á»NG DáºªN Táº O HĂŒNH áº¢NH MINH Há»ŒA (Báº®T BUá»˜C ĂP Dá»¤NG):\n`;
    prompt += `Báº®T BUá»˜C thĂªm dĂ²ng "HĂ¬nh áº£nh:" vĂ o Tá»I THIá»‚U 1-2 cĂ¢u há»i trong Ä‘á» (Æ°u tiĂªn cĂ¢u vá» Ä‘á»“ thá»‹, biá»ƒu Ä‘á»“, sá»‘ liá»‡u, hĂ¬nh há»c). Äáº·t dĂ²ng nĂ y ngay SAU dĂ²ng "Giáº£i thĂ­ch:" cá»§a cĂ¢u Ä‘Ă³, kĂ¨m JSON metadata. Há»† THá»NG Sáº¼ Tá»° Äá»˜NG Váº¼ HĂŒNH Báº°NG MATPLOTLIB.\n`;
    prompt += `CĂ¡c loáº¡i há»— trá»£ vĂ  máº«u JSON:\n\n`;
    prompt += `1ï¸âƒ£ TOĂN â€” Äá»“ thá»‹ hĂ m sá»‘ (cá»±c trá»‹, tiá»‡m cáº­n, kháº£o sĂ¡t...):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"do_thi_ham_so","hamSo":"x**3 - 3*x","xRange":[-4,4],"tieuDe":"y = xÂ³ - 3x","diemDacBiet":[{"x":-1,"y":2,"nhan":"CÄ(-1;2)"},{"x":1,"y":-2,"nhan":"CT(1;-2)"}]}\n`;
    prompt += `2ï¸âƒ£ TOĂN â€” HĂ¬nh há»c Oxy (tam giĂ¡c, Ä‘Æ°á»ng trĂ²n, tá»a Ä‘á»™...):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"hinh_hoc_oxy","tieuDe":"Tam giĂ¡c ABC","xRange":[-1,6],"yRange":[-1,5],"diem":[{"x":0,"y":0,"nhan":"A"},{"x":5,"y":0,"nhan":"B"},{"x":2,"y":4,"nhan":"C"}],"doanThang":[{"x1":0,"y1":0,"x2":5,"y2":0},{"x1":5,"y1":0,"x2":2,"y2":4},{"x1":2,"y1":4,"x2":0,"y2":0}]}\n`;
    prompt += `3ï¸âƒ£ TOĂN â€” Histogram thá»‘ng kĂª (phĂ¢n bá»‘ Ä‘iá»ƒm, táº§n sá»‘...):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"histogram","tieuDe":"PhĂ¢n bá»‘ Ä‘iá»ƒm thi","nhanX":"Äiá»ƒm","nhanY":"Sá»‘ HS","duLieu":[3,4,5,5,6,6,6,7,7,7,7,8,8,9,10],"soCot":8}\n`;
    prompt += `4ï¸âƒ£ Váº¬T LĂ â€” Äá»“ thá»‹ v-t, s-t, U-I, P-V (Ä‘oáº¡n tháº³ng ná»‘i tiáº¿p):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"do_thi_vat_ly","tieuDe":"Äá»“ thá»‹ v-t","nhanX":"t (s)","nhanY":"v (m/s)","doanThang":[{"x1":0,"y1":0,"x2":5,"y2":20},{"x1":5,"y1":20,"x2":10,"y2":20},{"x1":10,"y1":20,"x2":15,"y2":0}],"diemDacBiet":[{"x":5,"y":20,"nhan":"A(5;20)"}]}\n`;
    prompt += `5ï¸âƒ£ Äá»A LĂ / SINH / HĂ“A / Sá»¬ / CĂ”NG NGHá»† / TIN â€” Biá»ƒu Ä‘á»“ cá»™t:\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"bieu_do_cot","tieuDe":"DĂ¢n sá»‘ ÄNĂ 2023","nhanX":"Quá»‘c gia","nhanY":"Triá»‡u ngÆ°á»i","nhan":["VN","ThĂ¡i Lan","Indonesia"],"giaTri":[100,72,275]}\n`;
    prompt += `6ï¸âƒ£ Äá»A LĂ / SINH / HĂ“A / Sá»¬ â€” Biá»ƒu Ä‘á»“ Ä‘Æ°á»ng (so sĂ¡nh xu hÆ°á»›ng):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"bieu_do_duong","tieuDe":"GDP 2018-2023","nhanX":"NÄƒm","nhanY":"Tá»· USD","nhan":["2018","2019","2020","2021","2022","2023"],"chuoiDuLieu":[{"ten":"VN","giaTri":[245,262,271,366,409,430]}]}\n`;
    prompt += `7ï¸âƒ£ Äá»A LĂ / SINH / HĂ“A â€” Biá»ƒu Ä‘á»“ trĂ²n (cÆ¡ cáº¥u, tá»‰ lá»‡ %):\n`;
    prompt += `HĂ¬nh áº£nh: {"loai":"bieu_do_tron","tieuDe":"CÆ¡ cáº¥u kinh táº¿ VN","nhan":["NĂ´ng nghiá»‡p","CĂ´ng nghiá»‡p","Dá»‹ch vá»¥"],"giaTri":[12,38,50]}\n`;
    prompt += `â ï¸ QUY Táº®C QUAN TRá»ŒNG: TrÆ°á»ng "hamSo" dĂ¹ng cĂº phĂ¡p Python (x**2, np.sin(x), np.sqrt(x)). NHáº®C Láº I: Báº®T BUá»˜C pháº£i cĂ³ Tá»I THIá»‚U 1-2 cĂ¢u trong Ä‘á» cĂ³ dĂ²ng "HĂ¬nh áº£nh:" kĂ¨m JSON â€” Ä‘Ă¢y lĂ  YĂU Cáº¦U Báº®T BUá»˜C, khĂ´ng pháº£i tĂ¹y chá»n.\n`;

    if (config.hasTuLuan) {
      prompt += `\nđŸ“Œ QUY Táº®C Äá»NH Dáº NG ÄĂP ĂN Tá»° LUáº¬N VĂ€ BIá»‚U ÄIá»‚M (Báº®T BUá»˜C TUĂ‚N THá»¦ 100%):\n`;
      prompt += `- CĂ¢u há»i tá»± luáº­n pháº£i chia nhá» Ä‘Ă¡p Ă¡n thĂ nh tá»«ng bÆ°á»›c giáº£i chi tiáº¿t. Má»—i bÆ°á»›c giáº£i báº¯t buá»™c náº±m trĂªn 1 dĂ²ng riĂªng biá»‡t.\n`;
      prompt += `- CUá»I Má»–I DĂ’NG bÆ°á»›c giáº£i, Báº®T BUá»˜C ghi Ä‘iá»ƒm sá»‘ cá»§a bÆ°á»›c Ä‘Ă³, cĂ¡ch ná»™i dung báº±ng Ä‘Ăºng kĂ½ hiá»‡u " || " (hai dáº¥u gáº¡ch Ä‘á»©ng).\n`;
      prompt += `- Äiá»ƒm sá»‘ tá»«ng Ă½ nhá» (a, b, c) Báº®T BUá»˜C khá»›p CHĂNH XĂC vá»›i cáº¥u hĂ¬nh biá»ƒu Ä‘iá»ƒm Ä‘Ă£ cho. KHĂ”NG ÄÆ¯á»¢C tá»± Ă½ chia láº¡i.\n`;
      prompt += `- VĂ­ dá»¥ chuáº©n: "Ta cĂ³ phÆ°Æ¡ng trĂ¬nh $x^2 - 4 = 0$ || 0.25"\n`;
      prompt += `- Tuyá»‡t Ä‘á»‘i KHĂ”NG tá»± Ă½ váº½ báº£ng (Table) Markdown trong pháº§n Ä‘Ă¡p Ă¡n.\n`;
    }

    prompt += `\nđŸ’¡ PHONG CĂCH VĂ€ VĂ Dá»¤ MáºªU (Báº®T BUá»˜C Báº®T CHÆ¯á»C 100% Äá»˜ KHĂ“ VĂ€ VÄ‚N PHONG NĂ€Y):\n`;
    prompt += `\nđŸ“ [MáºªU TRáº®C NGHIá»†M TĂNH TOĂN]: KhĂ´ng há»i lĂ½ thuyáº¿t. HĂ£y ra phĂ©p tĂ­nh cá»¥ thá»ƒ vĂ  cĂ³ báº«y.\n`;
    prompt += `VĂ­ dá»¥: "Káº¿t quáº£ cá»§a phĂ©p tĂ­nh $\\frac{4}{5} + (\\frac{-3}{5})$ lĂ :\nA. $\\frac{7}{5}$   B. $\\frac{-7}{5}$   C. $\\frac{1}{5}$   D. $\\frac{-1}{5}$"\n`;

    prompt += `\nđŸ“ [MáºªU TRáº®C NGHIá»†M ÄĂNG/SAI ÄA CHIá»€U]: Má»—i cĂ¢u gá»“m 1 Äá»€ BĂ€I CHUNG + 4 Ă½ a,b,c,d xoay quanh Ä‘á» bĂ i Ä‘Ă³.\n`;
    prompt += `VĂ­ dá»¥: "Khá»‘i 6 cĂ³ 400 há»c sinh. SÆ¡ káº¿t kĂ¬ I cĂ³ 32 HS giá»i, 60% khĂ¡, 12 yáº¿u, cĂ²n láº¡i lĂ  trung bĂ¬nh.\na) HS giá»i chiáº¿m 8%.\nb) HS yáº¿u chiáº¿m 4%.\nc) CĂ³ 240 HS khĂ¡.\nd) HS trung bĂ¬nh nhiá»u hÆ¡n HS giá»i 86 em."\n`;

    if (config.hasTuLuan) {
      prompt += `\nđŸ“ [MáºªU Tá»° LUáº¬N CĂ“ Lá»œI VÄ‚N - THá»°C Táº¾]: BĂ i toĂ¡n cĂ³ cá»‘t truyá»‡n, chia nhiá»u bÆ°á»›c, tĂ­nh Ä‘iá»ƒm tá»«ng bÆ°á»›c.\n`;
      prompt += `VĂ­ dá»¥: "Mai Ä‘á»c má»™t cuá»‘n sĂ¡ch dĂ y 180 trang. NgĂ y thá»© nháº¥t Ä‘á»c Ä‘Æ°á»£c $\\frac{1}{4}$ sá»‘ trang..."\n`;
      prompt += `â†’ ÄĂ¡p Ă¡n AI PHáº¢I in ra Ä‘Ăºng format:\n`;
      prompt += `+ TĂ­nh sá»‘ trang ngĂ y 1: 180 Ă— 1/4 = 45 trang || 0.5\n`;
      prompt += `+ TĂ­nh sá»‘ trang cĂ²n láº¡i sau ngĂ y 1: 180 - 45 = 135 trang || 0.25\n`;
    }

    prompt += `\nâ ï¸ Lá»†NH TUYá»†T Äá»I CUá»I CĂ™NG: Táº¤T Cáº¢ cĂ¡c cĂ¢u há»i báº¡n sinh ra pháº£i cĂ³ Ä‘á»™ sĂ¢u, cáº¥u trĂºc sá»‘ liá»‡u, báº«y tĂ¢m lĂ½ vĂ  sá»± cháº·t cháº½ y há»‡t cĂ¡c vĂ­ dá»¥ trĂªn! Báº¯t buá»™c bĂ¡m sĂ¡t "YĂªu cáº§u cáº§n Ä‘áº¡t" vĂ  "MĂ£ nÄƒng lá»±c chá»‰ bĂ¡o" (náº¿u cĂ³) cá»§a tá»«ng cĂ¢u há» i Ä‘á»ƒ xĂ¢y dá»±ng ná»™i dung chĂ­nh xĂ¡c nháº¥t.\n`;

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
    const soCauTraLoiNgan = totalTraLoiNgan; // NĂ‚NG Cáº¤P: KHĂ”NG CHIA 4 Ná»®A
    const soCauTuLuan = (() => {
      if (hasManualTLConfig) return tuLuanConfig.questions.length;
      const grps = {};
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          ['biet', 'hieu', 'vanDung'].forEach(level => {
            const cnt = Number(dv.tuLuan?.[level]) || 0;
            for (let i = 0; i < cnt; i++) {
              const k = dv.noiDung || '';
              grps[k] = (grps[k] || 0) + 1;
            }
          });
        });
      });
      let total = 0;
      Object.values(grps).forEach(cnt => { total += Math.ceil(cnt / 2); });
      return total;
    })();

    // Helper: láº¥y mĂ£ nÄƒng lá»±c tá»« indicatorMap (extract .code tá»« object {code,label})
    const toCode = (m) => m ? (typeof m === 'object' ? (m.code || '') : m) : '';
    const readInds = (map, type, level, count) => {
      if (!map) return [];
      return Array.from({length: count}, (_, i) => toCode(map[`${type}_${level}_${i}`])).filter(Boolean);
    };
    // Helper: auto-suy mĂ£ HH/TD tá»« YCCÄ khi indicatorMap rá»—ng
    const monHoc = examHeader?.monHoc || '';
    const isHoaMon = /hĂ³a|hoĂ¡/i.test(monHoc);
    const isToanMon = /toĂ¡n|toan/i.test(monHoc);
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
    const resolveInds = (map, type, level, count) => {
      const codes = readInds(map, type, level, count);
      if (codes.length > 0) return [...new Set(codes)];
      const auto = getAutoCode(level);
      return auto ? [auto] : [];
    };

    matrix.forEach((topic, index) => {
      const tenChuDe = topic.tenChuDe || `Chá»§ Ä‘á» ${index + 1}`;
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
          const tenDVKT = dv.noiDung || 'ChÆ°a rĂµ';
          const yccdText = (dv.yeuCauCanDat && dv.yeuCauCanDat.trim() !== '')
            ? dv.yeuCauCanDat.trim()
            : `BĂ¡m sĂ¡t ná»™i dung bĂ i há»c "${tenDVKT}" trong chÆ°Æ¡ng trĂ¬nh GDPT 2018.`;

          let phongCachText = "";
          if (dv.phongCach && dv.phongCach.length > 0) {
            const lenhPhongCach = dv.phongCach.map(tag => STYLE_DICTIONARY[tag]).filter(Boolean).join(" ");
            if (lenhPhongCach) phongCachText = `\nđŸ­ Lá»†NH PHONG CĂCH Äáº¶C BIá»†T: ${lenhPhongCach}\n`;
          }

          prompt += `\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—\n`;
          prompt += `â•‘  đŸ“Œ CHá»¦ Äá»€: "${tenChuDe}"\n`;
          prompt += `â•‘  đŸ“– BĂ€I / ÄÆ N Vá» KIáº¾N THá»¨C: "${tenDVKT}"\n`;
          prompt += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
          prompt += `đŸ¯ YĂU Cáº¦U Cáº¦N Äáº T â€” Báº®T BUá»˜C BĂM SĂT KHI RA Äá»€:\n${yccdText}\n`;
          prompt += phongCachText;
          prompt += `đŸ‘‰ Má»ŒI cĂ¢u há»i thuá»™c Ä‘Æ¡n vá»‹ kiáº¿n thá»©c nĂ y PHáº¢I kiá»ƒm tra Ä‘Ăºng cĂ¡c nÄƒng lá»±c/pháº©m cháº¥t nĂªu trong YĂªu cáº§u cáº§n Ä‘áº¡t bĂªn trĂªn, KHĂ”NG Ä‘Æ°á»£c ra cĂ¢u há»i ngoĂ i pháº¡m vi Ä‘Ă³.\n`;
          prompt += `\nđŸ“ Sá» LÆ¯á»¢NG CĂ‚U Há»I Cáº¦N SOáº N CHO ÄÆ N Vá» KIáº¾N THá»¨C NĂ€Y:\n`;

          const mcqParts = [];
          if (Number(mcq.biet) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'biet', Number(mcq.biet));
            mcqParts.push(`${mcq.biet} cĂ¢u Nháº­n biáº¿t${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
          }
          if (Number(mcq.hieu) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'hieu', Number(mcq.hieu));
            mcqParts.push(`${mcq.hieu} cĂ¢u ThĂ´ng hiá»ƒu${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
          }
          if (Number(mcq.vanDung) > 0) {
            const inds = resolveInds(dv.indicatorMap, 'nhieuLuaChon', 'vanDung', Number(mcq.vanDung));
            mcqParts.push(`${mcq.vanDung} cĂ¢u Váº­n dá»¥ng${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
          }
          if (mcqParts.length > 0) {
            prompt += ` - Tráº¯c nghiá»‡m nhiá»u lá»±a chá»n [LOáº I 1]: ${mcqParts.join(', ')}\n`;
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
              if (Number(ds.biet) > 0) lvlParts.push(`${ds.biet} Ă½ Nháº­n biáº¿t`);
              if (Number(ds.hieu) > 0) lvlParts.push(`${ds.hieu} Ă½ ThĂ´ng hiá»ƒu`);
              if (Number(ds.vanDung) > 0) lvlParts.push(`${ds.vanDung} Ă½ Váº­n dá»¥ng`);
              if (Number(ds.vanDungCao) > 0) lvlParts.push(`${ds.vanDungCao} Ă½ Váº­n dá»¥ng cao`);
              const lvlStr = lvlParts.length > 0 ? ` [${lvlParts.join(', ')}]` : '';
              dsParts.push(`${numCau} cĂ¢u${lvlStr}${uniqueInds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${uniqueInds.join(', ')})` : ''}`);
            } else {
              if (Number(ds.biet) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'biet', Number(ds.biet));
                dsParts.push(`${ds.biet} Ă½ Nháº­n biáº¿t${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.hieu) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'hieu', Number(ds.hieu));
                dsParts.push(`${ds.hieu} Ă½ ThĂ´ng hiá»ƒu${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.vanDung) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'vanDung', Number(ds.vanDung));
                dsParts.push(`${ds.vanDung} Ă½ Váº­n dá»¥ng${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
              }
              if (Number(ds.vanDungCao) > 0) {
                const inds = resolveInds(dv.indicatorMap, 'dungSai', 'vanDungCao', Number(ds.vanDungCao));
                dsParts.push(`${ds.vanDungCao} Ă½ Váº­n dá»¥ng cao${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
              }
            }
            if (dsParts.length > 0) {
              if (!config.groupTfByTopic) {
                prompt += ` - Tráº¯c nghiá»‡m ÄĂºng/Sai [LOáº I 2]: ${dsParts.join(', ')} (â ï¸ Má»—i cĂ¢u = 1 Äá»€ BĂ€I CHUNG + 4 Ă½ a/b/c/d)\n`;
              } else {
                prompt += ` - Tráº¯c nghiá»‡m ÄĂºng/Sai [LOáº I 2]: ${dsParts.join(', ')} (â ï¸ CĂ¡c Ă½ nĂ y thuá»™c cĂ¹ng 1 cĂ¢u ÄS chung â€” KHĂ”NG pháº£i cĂ¢u riĂªng láº»)\n`;
              }
            }
          }

          if (config.hasTraLoiNgan) {
            const tlnParts = [];
            if (Number(tln.biet) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'biet', Number(tln.biet));
              tlnParts.push(`${tln.biet} cĂ¢u Nháº­n biáº¿t${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
            }
            if (Number(tln.hieu) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'hieu', Number(tln.hieu));
              tlnParts.push(`${tln.hieu} cĂ¢u ThĂ´ng hiá»ƒu${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
            }
            if (Number(tln.vanDung) > 0) {
              const inds = resolveInds(dv.indicatorMap, 'traLoiNgan', 'vanDung', Number(tln.vanDung));
              tlnParts.push(`${tln.vanDung} cĂ¢u Váº­n dá»¥ng${inds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${inds.join(', ')})` : ''}`);
            }
            if (tlnParts.length > 0) {
              prompt += ` - Tráº£ lá»i ngáº¯n [LOáº I 3]: ${tlnParts.join(', ')}\n`;
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
              const indStr = uniqueInds.length > 0 ? ` (MĂ£ nÄƒng lá»±c: ${uniqueInds.join(', ')})` : '';
              const tlLevelParts = [];
              if (Number(tl.biet) > 0) tlLevelParts.push(`${tl.biet} Ă½ Nháº­n biáº¿t`);
              if (Number(tl.hieu) > 0) tlLevelParts.push(`${tl.hieu} Ă½ ThĂ´ng hiá»ƒu`);
              if (Number(tl.vanDung) > 0) tlLevelParts.push(`${tl.vanDung} Ă½ Váº­n dá»¥ng`);
              const tlLevelStr = tlLevelParts.length > 0 ? ` [${tlLevelParts.join(', ')}]` : '';
              if (hasManualTLConfig) {
                prompt += ` - Tá»± luáº­n [LOáº I 4]: ${totalYTL} Ă½${tlLevelStr} â€” tá»•ng ${tongDiem}Ä‘${indStr}\n`;
              } else {
                const cauHaiY = Math.floor(totalYTL / 2);
                const cauMotY = totalYTL % 2;
                const kCauTL = cauHaiY + cauMotY;
                let cauDesc = '';
                if (cauHaiY > 0 && cauMotY > 0) {
                  cauDesc = `${kCauTL} cĂ¢u: ${cauHaiY} cĂ¢u gá»“m 2 Ă½ (a, b), ${cauMotY} cĂ¢u Ä‘Æ¡n Ă½`;
                } else if (cauHaiY > 0) {
                  cauDesc = `${kCauTL} cĂ¢u, má»—i cĂ¢u gá»“m 2 Ă½ (a, b)`;
                } else {
                  cauDesc = `${kCauTL} cĂ¢u Ä‘Æ¡n Ă½`;
                }
                prompt += ` - Tá»± luáº­n [LOáº I 4]: ${cauDesc}${tlLevelStr} â€” tá»•ng ${tongDiem}Ä‘${indStr}\n`;
                if (cauHaiY > 0) {
                  prompt += `   â†³ CĂ¢u 2 Ă½: cĂ³ thá»ƒ lĂ  1 Ä‘á» bĂ i chung + Ă½ a, Ă½ b liĂªn quan; HOáº¶C 2 Ă½ a, b Ä‘á»™c láº­p nhau â€” tĂ¹y ná»™i dung kiáº¿n thá»©c.\n`;
                }
              }
            }
          }
          prompt += `â ï¸ LÆ¯U Ă Tá»I QUAN TRá»ŒNG: Viáº¿t ÄĂNG Sá» LÆ¯á»¢NG cĂ¢u há»i/Ă½ Ä‘Ă£ Ä‘Æ°á»£c giao.\n\n`;
        }
      });
    });

    if (hasContent) {
      prompt += `đŸ“ Tá»”NG Há»¢P GOM CĂ‚U Báº®T BUá»˜C:\n`;
      if (soCauDungSai > 0) {
        prompt += `  â†’ LOáº I 2: Gom thĂ nh ${soCauDungSai} CĂ¢u (má»—i CĂ¢u gá»“m 1 Äá»€ BĂ€I CHUNG + 4 Ă½ a, b, c, d xoay quanh Ä‘á» bĂ i Ä‘Ă³)\n`;
        if (config.groupTfByTopic) {
          prompt += `     â ï¸ LÆ¯U Ă: 4 má»‡nh Ä‘á» trong má»—i cĂ¢u ÄĂºng/Sai nĂ y Ä‘Æ°á»£c láº¥y ráº£i rĂ¡c tá»« cĂ¡c bĂ i há»c khĂ¡c nhau trong cĂ¹ng chá»§ Ä‘á» Ä‘á»ƒ Ä‘áº£m báº£o tĂ­nh bao quĂ¡t.\n`;
        }
      }
      // NĂ‚NG Cáº¤P: Tráº£ lá»i ngáº¯n Ä‘á»™c láº­p
      if (soCauTraLoiNgan > 0) prompt += `  â†’ LOáº I 3: Xuáº¥t thĂ nh ${soCauTraLoiNgan} CĂ¢u Ä‘á»™c láº­p (TUYá»†T Äá»I KHĂ”NG GOM vĂ o chung 1 cĂ¢u cĂ³ Ă½ a, b, c, d)\n`;
      if (config.hasTuLuan && soCauTuLuan > 0) {
        if (hasManualTLConfig) {
          const cauStructureDesc = tuLuanConfig.questions.map((q, i) => {
            const nY = q.subItems?.length || 1;
            const tongDiemQ = q.subItems ? Math.round(q.subItems.reduce((s, si) => s + (si.diem || 0), 0) * 100) / 100 : 0;
            const yDetails = q.subItems ? q.subItems.slice(0, nY).map((sub, j) => `Ă½ ${['a', 'b', 'c'][j]}=${Number(sub.diem) || 0}Ä‘`).join(', ') : '';
            const kieuY = q.kieuY || 'chung';
            const kieuDesc = nY > 1 ? (kieuY === 'chung' ? ' [Ä‘á» bĂ i chung]' : ' [Ă½ Ä‘á»™c láº­p]') : '';
            const ktLabel = q.kienThuc === 'hinh_hoc' ? ' [HĂ¬nh há»c]' : q.kienThuc === 'dai_so' ? ' [Äáº¡i sá»‘]' : '';
            return `cĂ¢u ${i + 1}${ktLabel}: ${nY > 1 ? `${nY} Ă½ (${yDetails})${kieuDesc} â€” tá»•ng ${tongDiemQ}Ä‘` : `1 Ă½ â€” ${tongDiemQ}Ä‘`}`;
          }).join('; ');
          prompt += `  â†’ LOáº I 4: Tá»•ng ${soCauTuLuan} CĂ¢u tá»± luáº­n. Cáº¤U TRĂC Báº®T BUá»˜C: ${cauStructureDesc}. â ï¸ [Ä‘á» bĂ i chung] = 1 tĂ¬nh huá»‘ng/bĂ i toĂ¡n chung, phĂ¡t triá»ƒn thĂ nh cĂ¡c Ă½ a, b, c liĂªn quan; [Ă½ Ä‘á»™c láº­p] = má»—i Ă½ lĂ  cĂ¢u há»i riĂªng khĂ´ng liĂªn quan nhau. Tá»”NG ÄIá»‚M Tá»° LUáº¬N: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm\n`;
          // ThĂªm yĂªu cáº§u kienThuc chi tiáº¿t per cĂ¢u náº¿u cĂ³
          const hasKienThuc = tuLuanConfig.questions.some(q => q.kienThuc === 'hinh_hoc' || q.kienThuc === 'dai_so');
          if (hasKienThuc) {
            tuLuanConfig.questions.forEach((q, i) => {
              if (q.kienThuc === 'hinh_hoc') {
                prompt += `     â†³ CĂ¢u ${i + 1} [HĂ¬nh há»c]: Báº®T BUá»˜C ra cĂ¢u há»i thuá»™c lÄ©nh vá»±c HĂŒNH Há»ŒC (hĂ¬nh há»c pháº³ng, hĂ¬nh khĂ´ng gian, tá»a Ä‘á»™, hĂ¬nh há»c giáº£i tĂ­ch...). KHĂ”NG ra cĂ¢u Ä‘áº¡i sá»‘.\n`;
              } else if (q.kienThuc === 'dai_so') {
                prompt += `     â†³ CĂ¢u ${i + 1} [Äáº¡i sá»‘]: Báº®T BUá»˜C ra cĂ¢u há»i thuá»™c lÄ©nh vá»±c Äáº I Sá» / GIáº¢I TĂCH (hĂ m sá»‘, phÆ°Æ¡ng trĂ¬nh, báº¥t phÆ°Æ¡ng trĂ¬nh, tĂ­ch phĂ¢n, chuá»—i sá»‘...). KHĂ”NG ra cĂ¢u hĂ¬nh há»c.\n`;
              }
            });
          }
        } else {
          prompt += `  â†’ LOáº I 4: Xuáº¥t thĂ nh ${soCauTuLuan} CĂ¢u tá»± luáº­n (má»—i cĂ¢u theo cáº¥u trĂºc Ä‘Ă£ mĂ´ táº£ á»Ÿ tá»«ng Ä‘Æ¡n vá»‹ kiáº¿n thá»©c phĂ­a trĂªn). Tá»”NG ÄIá»‚M Tá»° LUáº¬N: ${tongDiemTuLuanThucTe} Ä‘iá»ƒm\n`;
        }
      }
      prompt += `\n`;
    }

    if (!hasContent) {
      alert("BĂ¡c chÆ°a Ä‘iá»n sá»‘ lÆ°á»£ng cĂ¢u há»i á»Ÿ Báº£ng Ma Tráº­n (BÆ°á»›c 3). Vui lĂ²ng Ä‘iá»n sá»‘ lÆ°á»£ng trÆ°á»›c khi sinh Ä‘á» nhĂ©!");
      return;
    }

    prompt += `\nđŸ–¼ï¸ NHáº®C Láº I Láº¦N CUá»I: Báº®T BUá»˜C cĂ³ Tá»I THIá»‚U 1-2 cĂ¢u há»i cĂ³ dĂ²ng "HĂ¬nh áº£nh:" kĂ¨m JSON metadata (biá»ƒu Ä‘á»“ cá»™t, Ä‘á»“ thá»‹ hĂ m sá»‘, biá»ƒu Ä‘á»“ trĂ²n, hĂ¬nh há»c Oxy...). KHĂ”NG ÄÆ¯á»¢C bá» qua yĂªu cáº§u nĂ y!\n`;

    prompt += `\n[THáº¦Y/CĂ” XĂ“A DĂ’NG CHá»® NĂ€Y, Báº¤M NĂT ÄĂNH KĂˆM FILE TĂ€I LIá»†U/SGK VĂ€ Gá»¬I CHO AI Äá»‚ NĂ“ SOáº N Äá»€]`;

    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      alert("âœ… ÄĂƒ COPY SIĂU Lá»†NH SINH Äá»€ THI!\n\n1. HĂ£y dĂ¡n lá»‡nh nĂ y vĂ o ChatGPT hoáº·c Gemini.\n2. Báº¥m nĂºt ghim káº¹p giáº¥y Ä‘á»ƒ Ä‘Ă­nh kĂ¨m file SĂ¡ch giĂ¡o khoa.\n3. XĂ³a dĂ²ng ngoáº·c vuĂ´ng cuá»‘i cĂ¹ng rá»“i báº¥m Gá»¬I.\n4. Äá»£i AI nháº£ Ä‘á» thi rá»“i copy dĂ¡n vĂ o Ă´ bĂªn dÆ°á»›i nhĂ©!");
    } catch (err) {
      alert("Lá»—i khi copy. TrĂ¬nh duyá»‡t cá»§a báº¡n cĂ³ thá»ƒ khĂ´ng há»— trá»£ tĂ­nh nÄƒng nĂ y.");
    }
  };

  // =========================================================================
  // TĂNH DANH SĂCH Ă” TRá»NG â€” NĂ‚NG Cáº¤P: KHĂ”NG CHIA 4 á» LOáº I 3
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
      slots.push({ key, label: `Pháº§n I - CĂ¢u ${i + 1} (Tráº¯c nghiá»‡m)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 1, daDien });
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
      slots.push({ key, label: `Pháº§n II - CĂ¢u ${i + 1} (ÄĂºng/Sai)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 2, daDien });
    }

    // --- PHáº¦N III (NĂ‚NG Cáº¤P: KHĂ”NG CHIA 4) ---
    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      const saDvktLabels = buildDvktLabels('traLoiNgan');
      for (let i = 0; i < totalSA; i++) {
        const key = `phan3_cau${i + 1}`;
        const daDien = isSlotFilled(key);
        const dvktName = saDvktLabels[i] || ''; // KhĂ´ng nhĂ¢n 4 ná»¯a
        const dvktSuffix = dvktName ? ` - ${dvktName}` : '';
        slots.push({ key, label: `Pháº§n III - CĂ¢u ${i + 1} (Tráº£ lá»i ngáº¯n)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 3, daDien });
      }
    }

    // --- PHáº¦N IV --- (Gom theo ÄVKT, tá»‘i Ä‘a 2 Ă½/cĂ¢u â€” Ä‘á»“ng bá»™ Step4)
    const totalTL = getTotalY('tuLuan');
    const soCauTL = (() => {
      if (hasManualTLConfig) return tuLuanConfig.questions.length;
      // NhĂ³m Ă½ TL theo ÄVKT
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
      slots.push({ key, label: `Pháº§n ${phanTL === 4 ? 'IV' : 'III'} - CĂ¢u ${i + 1} (Tá»± luáº­n)${dvktSuffix}${daDien ? ' âœ…' : ''}`, loai: 4, daDien });
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
  // HĂ€M Náº P VĂ€ GHI ÄĂˆ TOĂ€N Bá»˜ LĂN KHUNG Äá»€ (CHO Äá»€ TÆ¯Æ NG ÄÆ¯Æ NG)
  // =========================================================================
  const handleOverrideAll = () => {
    if (draftQuestions.length === 0) {
      alert('KhĂ´ng cĂ³ cĂ¢u há»i nĂ o trong NhĂ¡p Ä‘á»ƒ ghi Ä‘Ă¨!');
      return;
    }

    const confirmOverride = window.confirm("Cáº¢NH BĂO: Thao tĂ¡c nĂ y sáº½ XĂ“A TOĂ€N Bá»˜ Khung Äá» hiá»‡n táº¡i vĂ  náº¡p cĂ¡c cĂ¢u há»i trong NhĂ¡p lĂªn.\nBáº¡n cĂ³ cháº¯c cháº¯n muá»‘n GHI Äá»€ TOĂ€N Bá»˜ khĂ´ng?");
    if (!confirmOverride) return;

    // Lá»c cĂ¡c slot theo tá»«ng loáº¡i (Láº¥y táº¥t cáº£, KHĂ”NG quan tĂ¢m daDien)
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
      // Gá»i clearExamSlot (tÆ°Æ¡ng Ä‘Æ°Æ¡ng updateExamSlot null) cho an toĂ n
      updateExamSlot(slot.key, 'clear', null); // Giáº£ láº­p clear, nhÆ°ng ta sáº½ ghi Ä‘Ă¨ trá»±c tiáº¿p báº±ng pushToExamSlot
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
      alert(`âœ… ÄĂ£ náº¡p thĂ nh cĂ´ng ${pushedCount} cĂ¢u Ä‘Ă¨ lĂªn Khung Äá».\nâ ï¸ Tuy nhiĂªn cĂ³ ${failedCount} cĂ¢u nhĂ¡p bá»‹ thá»«a do Khung Äá» Ă­t chá»— hÆ¡n sá»‘ cĂ¢u AI tráº£ vá».`);
    } else {
      alert(`âœ… ÄĂ£ GHI Äá»€ thĂ nh cĂ´ng toĂ n bá»™ ${pushedCount} cĂ¢u lĂªn Khung Äá» má»›i!`);
    }
  };

  // =========================================================================
  // HĂ€M Äáº¨Y HĂ€NG LOáº T (NĂ‚NG Cáº¤P MAPPING CHO LOáº I 3 + GOM Tá»° LUáº¬N)
  // =========================================================================
  const handleBulkPush = () => {
    if (selectedDrafts.length === 0) {
      alert('Vui lĂ²ng tick chá»n Ă­t nháº¥t 1 cĂ¢u nhĂ¡p trÆ°á»›c khi Ä‘áº©y hĂ ng loáº¡t!');
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

        // 1. Æ¯u tiĂªn Ä‘Ă¨ vĂ o cĂ¢u gá»‘c náº¿u lĂ  cĂ¢u sinh tÆ°Æ¡ng tá»±
        if (question._fromSimilar && question._originalSlotKey && !usedSlotKeys.has(question._originalSlotKey)) {
          const origSlot = availableSlots.find(s => s.key === question._originalSlotKey && s.loai === loai);
          if (origSlot) {
            targetSlot = origSlot;
            // XĂ³a khá»i remainingEmptySlots náº¿u cĂ³ (Ä‘á»ƒ khĂ´ng dĂ¹ng nháº§m)
            remainingEmptySlots = remainingEmptySlots.filter(s => s.key !== origSlot.key);
          }
        }

        // 2. Náº¿u khĂ´ng cĂ³ cĂ¢u gá»‘c, hoáº·c cĂ¢u gá»‘c Ä‘Ă£ bá»‹ Ä‘Ă¨ trong Ä‘á»£t nĂ y, thĂ¬ tĂ¬m Ă´ trá»‘ng Ä‘áº§u tiĂªn
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
            // Báº£o toĂ n metadata hĂ¬nh áº£nh khi Ä‘áº©y hĂ ng loáº¡t
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

    // â”€â”€ Äáº¨Y LOáº I 1, 2, 3, 4 THEO LOGIC Má»I â”€â”€
    pushGroup(qsLoai1, 1);
    pushGroup(qsLoai2, 2);
    pushGroup(qsLoai3, 3);
    pushGroup(qsLoai4, 4);

    setSelectedDrafts([]);

    if (failedCount > 0) {
      alert(`âœ… ÄĂ£ Ä‘áº©y ${pushedCount} cĂ¢u lĂªn Khung Äá».\nâ ï¸ ${failedCount} cĂ¢u nhĂ¡p bá»‹ trÆ°á»£t (khĂ´ng cĂ²n Ä‘á»§ Ă´ trá»‘ng á»Ÿ pháº§n tÆ°Æ¡ng á»©ng).`);
    } else {
      alert(`âœ… ÄĂ£ Ä‘áº©y thĂ nh cĂ´ng táº¥t cáº£ ${pushedCount} cĂ¢u vĂ o Ä‘Ăºng Ă´ trá»‘ng!`);
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
      setParseError('Vui lĂ²ng dĂ¡n ná»™i dung Ä‘á» thi AI vĂ o Ă´ soáº¡n tháº£o trÆ°á»›c khi bĂ³c tĂ¡ch.');
      return;
    }

    try {
      const parsed = parseExamDraft(examContent);

      // â”€â”€ POST-PROCESSING: Gáº¯n metadata Ä‘á»“ thá»‹ Matplotlib cho cĂ¢u há»i â”€â”€
      for (const q of parsed) {
        // 1. TrĂ­ch xuáº¥t "HĂ¬nh áº£nh:" JSON tá»« Táº¤T Cáº¢ cĂ¡c trÆ°á»ng (giaiThich, noiDung, dapAn)
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
        // 2. Náº¿u hinhAnh lĂ  URL string (giáº£ tá»« AI) â†’ xĂ³a bá»
        if (typeof q.hinhAnh === 'string') {
          q.hinhAnh = null;
        }
        // 3. Fallback: tá»± phĂ¡t hiá»‡n hĂ m sá»‘ trong ná»™i dung cĂ¢u há»i
        if (!q.hinhAnh || !q.hinhAnh.loai) {
          const detected = autoDetectGraphMetadata(q);
          if (detected) q.hinhAnh = detected;
        }
      }

      if (parsed.length === 0) {
        setParseError('KhĂ´ng tĂ¬m tháº¥y cĂ¢u há»i nĂ o. HĂ£y Ä‘áº£m báº£o AI tráº£ vá» Ä‘Ăºng Ä‘á»‹nh dáº¡ng cĂ³ chá»¯ "CĂ¢u X:".');
        return;
      }
      setDraftQuestions(parsed);
      // Cáº£nh bĂ¡o náº¿u khĂ´ng cĂ³ cĂ¢u nĂ o cĂ³ hĂ¬nh áº£nh
      const soHinhAnh = parsed.filter(q => q.hinhAnh && q.hinhAnh.loai).length;
      if (soHinhAnh === 0) {
        setParseError('â ï¸ Äá» thi chÆ°a cĂ³ cĂ¢u nĂ o cĂ³ hĂ¬nh áº£nh/biá»ƒu Ä‘á»“. Báº¡n nĂªn yĂªu cáº§u AI bá»• sung báº±ng cĂ¡ch ghi thĂªm: "HĂ£y thĂªm 1-2 cĂ¢u cĂ³ HĂ¬nh áº£nh: {JSON metadata biá»ƒu Ä‘á»“/Ä‘á»“ thá»‹}"');
      } else {
        setParseError('');
      }
    } catch (err) {
      console.error('handleParseExam error:', err);
      setParseError('ÄĂ£ xáº£y ra lá»—i khi bĂ³c tĂ¡ch. Chi tiáº¿t: ' + err.message);
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
            Trá»£ lĂ½ AI Sinh Äá»
          </h2>
          <p className="text-sm text-slate-500">Copy lá»‡nh, dĂ¡n káº¿t quáº£ AI, bĂ³c tĂ¡ch vĂ  Ä‘áº©y vĂ o khung Ä‘á»</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <FileText size={20} /> HÆ°á»›ng dáº«n táº¡o Ä‘á» thi tá»± Ä‘á»™ng
          </h3>
          <ul className="list-decimal list-inside text-slate-700 space-y-2 mb-6">
            <li>Báº¥m nĂºt <strong>"Copy Lá»‡nh Ma Tráº­n"</strong> á»Ÿ bĂªn dÆ°á»›i.</li>
            <li>Má»Ÿ <strong>ChatGPT</strong> hoáº·c <strong>Gemini</strong> trĂªn web.</li>
            <li>DĂ¡n (Ctrl + V) lá»‡nh vĂ o Ă´ chat.</li>
            <li>ÄĂ­nh kĂ¨m file PDF/Word SĂ¡ch giĂ¡o khoa cá»§a mĂ´n há»c.</li>
            <li>Copy káº¿t quáº£ AI sinh ra vĂ  dĂ¡n vĂ o khung Soáº¡n tháº£o bĂªn dÆ°á»›i rá»“i báº¥m <strong>"BĂ³c tĂ¡ch cĂ¢u há»i"</strong>.</li>
          </ul>

          <div className="flex justify-center">
            <button
              onClick={handleCopyExamPrompt}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-all ${isCopied ? 'bg-green-600 scale-105' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:scale-105'}`}
            >
              {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              {isCopied ? 'ÄĂ£ Copy Lá»‡nh' : 'Copy Lá»‡nh Ma Tráº­n'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-semibold text-slate-700">DĂ¡n Äá» thi AI Ä‘Ă£ biĂªn soáº¡n vĂ o Ä‘Ă¢y:</label>
          <textarea
            className="w-full min-h-[400px] p-6 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-slate-800 leading-relaxed transition-all resize-y shadow-inner font-mono text-sm"
            placeholder="[DĂ¡n káº¿t quáº£ AI tráº£ vá» vĂ o Ä‘Ă¢y...]"
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
              BĂ³c tĂ¡ch cĂ¢u há»i
            </button>
          </div>
        </div>

        {draftQuestions.length > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-xl p-6 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                Danh sĂ¡ch cĂ¢u há»i nhĂ¡p
              </h3>
              <span className="text-sm font-semibold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {draftQuestions.length} cĂ¢u chÆ°a Ä‘áº©y
              </span>
            </div>

            {availableSlots.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <AlertTriangle size={16} className="inline mr-1" />
                Táº¥t cáº£ Ă´ trong Khung Äá» Ä‘Ă£ Ä‘Æ°á»£c Ä‘iá»n. HĂ£y xĂ³a bá»›t Ă´ Ä‘Ă£ Ä‘iá»n hoáº·c thĂªm cĂ¢u há»i vĂ o Ma tráº­n Ä‘á»ƒ cĂ³ Ă´ trá»‘ng má»›i.
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
                    ÄĂ£ chá»n: {selectedDrafts.length}
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
                  Äáº©y {selectedDrafts.length > 0 ? selectedDrafts.length : ''} cĂ¢u
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedDrafts.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${selectedDrafts.length > 0
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="XĂ³a cĂ¡c cĂ¢u Ä‘Ă£ chá»n khá»i danh sĂ¡ch nhĂ¡p"
                >
                  <Trash2 size={18} />
                  XĂ³a {selectedDrafts.length > 0 ? selectedDrafts.length : ''} cĂ¢u
                </button>
                <button
                  onClick={handleOverrideAll}
                  disabled={draftQuestions.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${draftQuestions.length > 0
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title="Thay tháº¿ toĂ n bá»™ Khung Äá» hiá»‡n táº¡i báº±ng cĂ¡c cĂ¢u há»i NhĂ¡p nĂ y"
                >
                  <AlertTriangle size={18} />
                  Náº¡p & Ghi Ä‘Ă¨ toĂ n bá»™
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
