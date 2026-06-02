/**
 * exportSimilarExamToWord.js
 * Xuất đề thi tương tự (Step6) ra file Word — 3 chế độ giống các tab khác:
 *   mode='math'   → KaTeX → MathML → Word Equation  (Toán/Hóa Công thức)
 *   mode='latex'  → Giữ nguyên $...$                 (LaTeX)
 *   mode='normal' → Bỏ $...$ thành text thường       (Môn thường)
 *
 * Nhận dữ liệu trực tiếp, không phụ thuộc useExamStore.
 * Hỗ trợ: MCQ, Đúng/Sai, Trả lời ngắn, Tự luận, bangBieu, hinhAnh, giaiThich.
 */

import { saveAs } from 'file-saver';
import katex from 'katex';
import { renderGraphToBytes } from './renderGraphToBytes';

// ─── Cache đồ thị (xóa trước mỗi lần export) ────────────────────────────────
const _graphCache = new Map();
// Map ảnh gốc từ file (id → {base64, mime}) — được set trước mỗi lần export
let _currentImageMap = {};

async function _fetchGraphBase64(hinhAnh) {
  if (!hinhAnh) return null;
  // Ưu tiên 1: imageRef → dùng ảnh gốc đã trích từ file Word/PDF
  if (hinhAnh.imageRef && _currentImageMap[hinhAnh.imageRef]) {
    const img = _currentImageMap[hinhAnh.imageRef];
    return `data:${img.mime || 'image/png'};base64,${img.base64}`;
  }
  // Ưu tiên 2: loai khac không có imageRef → không có gì để render
  if (!hinhAnh.loai || hinhAnh.loai === 'khac') return null;
  // Ưu tiên 3: biểu đồ/đồ thị → render qua canvas
  const key = JSON.stringify(hinhAnh);
  if (_graphCache.has(key)) return _graphCache.get(key);
  try {
    const bytes = await renderGraphToBytes(hinhAnh);
    if (!bytes) return null;
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = 'data:image/png;base64,' + btoa(bin);
    _graphCache.set(key, b64);
    return b64;
  } catch {
    return null;
  }
}

// ─── Làm sạch ký tự đặc biệt từ PDF (chỉ dùng trong Step6 export) ────────────
/**
 * Xử lý text NGOÀI các khối $...$ / $$...$$:
 *   1. Xóa ký tự □ / ☐ / ■ (artifact từ PDF encoding sai)
 *   2. Chuyển Unicode superscripts (³²¹...) → <sup>N</sup>
 *   3. Chuyển Unicode subscripts (₂₃...) → <sub>N</sub>
 */
function _cleanSpecialChars(text) {
  if (!text) return text;
  const supMap = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')'};
  const subMap = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')'};
  // Ký tự box/checkbox hay xuất hiện khi extract PDF (□■☐☑☒ và các biến thể PUA)
  const BOX_RE = /[\u25a0\u25a1\u25aa\u25ab\u2610\u2611\u2612\u2751\u2752\uf0a8\uf0b7\uf0fc\uf0d8]/g;
  // Tách text thành [text, $math$, text, $math$, ...] — chỉ clean phần text
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // math block → giữ nguyên
    let s = part;
    s = s.replace(BOX_RE, '');
    // Unicode superscripts → <sup>
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+/g, (m) =>
      `<sup>${m.split('').map(c => supMap[c] ?? c).join('')}</sup>`
    );
    // Unicode subscripts → <sub>
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, (m) =>
      `<sub>${m.split('').map(c => subMap[c] ?? c).join('')}</sub>`
    );
    return s;
  }).join('');
}

// ─── 3 bộ formatter tương ứng 3 mode ────────────────────────────────────────

/** mode='math': KaTeX → MathML (giống exportWordMath.js) */
function _fmtMath(text) {
  if (!text) return '';
  let s = String(text);
  s = _cleanSpecialChars(s);
  // A5: Chuyển bảng markdown thành HTML table TRƯỚC khi xử lý \n
  s = _convertMarkdownTables(s);
  const renderMath = (math, display, orig) => {
    try {
      // A3: Dùng \dfrac cho inline mode để phân số to và rõ hơn
      const mathToRender = display ? math : math.replace(/\\frac\{/g, '\\dfrac{');
      const html = katex.renderToString(mathToRender, { throwOnError: false, displayMode: display });
      const m = html.match(/<math[^>]*>.*?<\/math>/s);
      if (!m) return orig;
      let mml = m[0];
      mml = mml.replace(/<semantics[^>]*>/g, '').replace(/<\/semantics>/g, '');
      mml = mml.replace(/<annotation[^>]*>.*?<\/annotation>/gs, '');
      if (!mml.includes('scriptsizemultiplier')) {
        mml = mml.replace(/<math([^>]*)>/, '<math$1 scriptsizemultiplier="0.85">');
      }
      // A4: Sửa ký hiệu độ: ring operator ∘ (U+2218) → degree sign ° (U+00B0)
      mml = mml.replace(/∘/g, '°');
      // A2: Thêm khoảng trắng quanh MathML inline để chữ không dính vào công thức
      return display ? mml : '\u00A0' + mml + '\u00A0';
    } catch {
      return orig;
    }
  };
  s = s.replace(/\$\$(.*?)\$\$/gs, (m, math) => renderMath(math, true, m));
  s = s.replace(/\$(.*?)\$/g, (m, math) => renderMath(math, false, m));
  s = s.replace(/\n/g, '<br/>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  return s;
}

/** mode='latex': Giữ nguyên $...$, chỉ xử lý xuống dòng và bold */
function _fmtLatex(text) {
  if (!text) return '';
  let s = String(text);
  // A5: Chuyển bảng markdown thành HTML table
  s = _convertMarkdownTables(s);
  s = s.replace(/\n/g, '<br/>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  return s;
}

/** mode='normal': Bỏ ký hiệu $...$ → text thô */
function _fmtNormal(text) {
  if (!text) return '';
  let s = String(text);
  // A5: Chuyển bảng markdown thành HTML table
  s = _convertMarkdownTables(s);
  s = s.replace(/\$\$(.*?)\$\$/gs, (_, m) => m);
  s = s.replace(/\$(.*?)\$/g, (_, m) => m);
  s = s.replace(/\n/g, '<br/>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  return s;
}

/**
 * A5: Phát hiện bảng markdown (| col | col |) trong text và chuyển thành HTML table.
 * Gọi TRƯỚC khi convert \n → <br/> để tránh \n lọt vào bên trong <table>.
 */
function _convertMarkdownTables(text) {
  if (!text || !text.includes('|')) return text;
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    // Nhận diện hàng bảng: có ít nhất 2 dấu | (tức >= 3 phần sau split)
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      const tableLines = [];
      while (
        i < lines.length &&
        lines[i].trim().includes('|') &&
        lines[i].trim().split('|').length >= 3
      ) {
        tableLines.push(lines[i]);
        i++;
      }
      // Lọc bỏ dòng separator kiểu |---|---| hoặc |:---|:---|
      const isSep = (l) => /^[\s|:\-]+$/.test(l.trim());
      const dataLines = tableLines.filter(l => !isSep(l));
      if (dataLines.length >= 1) {
        // Build HTML table, KHÔNG có ký tự \n bên trong để tránh bị <br/> hóa
        let tbl = '<table border="1" style="border-collapse:collapse;font-size:13pt;margin:4pt 0;">';
        dataLines.forEach((dl, idx) => {
          const rawCells = dl.split('|').map(c => c.trim());
          // Bỏ phần tử rỗng đầu/cuối khi dòng bắt đầu/kết thúc bằng |
          const cells = rawCells.filter(
            (c, ci, arr) => !(ci === 0 && c === '') && !(ci === arr.length - 1 && c === '')
          );
          if (cells.length === 0) return;
          const isHeader = idx === 0;
          const tag = isHeader ? 'th' : 'td';
          const hdrStyle = 'border:1px solid #333;padding:4px 9px;background:#F1F5F9;font-weight:bold;text-align:center;';
          const cellStyle = 'border:1px solid #333;padding:4px 9px;text-align:center;';
          tbl += '<tr>';
          cells.forEach(cell => {
            tbl += `<${tag} style="${isHeader ? hdrStyle : cellStyle}">${cell}</${tag}>`;
          });
          tbl += '</tr>';
        });
        tbl += '</table>';
        result.push(tbl);
      } else {
        // Không đủ dữ liệu → giữ nguyên các dòng
        result.push(...tableLines);
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result.join('\n');
}

function _getFormatter(mode) {
  if (mode === 'latex')  return _fmtLatex;
  if (mode === 'normal') return _fmtNormal;
  return _fmtMath; // default: 'math'
}

// ─── Helpers (nhận fmt để dùng đúng chế độ) ─────────────────────────────────
function _img(b64) {
  return `<p style="text-align:center;margin:6pt 0;"><img src="${b64}" style="max-width:400px;max-height:280px;" /></p>`;
}

function _bangBieuHtml(bb, fmt) {
  if (!bb || !bb.data || bb.data.length === 0) return '';
  let h = '';
  if (bb.tieuDe) h += `<p style="font-style:italic;font-size:12pt;margin:3pt 0;">${fmt(bb.tieuDe)}</p>`;
  h += `<table border="1" style="border-collapse:collapse;font-size:13pt;margin:3pt 0;">`;
  bb.data.forEach((row, ri) => {
    h += '<tr>';
    (row || []).forEach(cell => {
      const isHdr = ri === 0;
      h += `<td style="border:1px solid #333;padding:3px 7px;${isHdr ? 'font-weight:bold;background:#F1F5F9;' : ''}">`;
      h += fmt(String(cell == null ? '' : cell));
      h += '</td>';
    });
    h += '</tr>';
  });
  h += '</table>';
  return h;
}

// A1: Giữ nội dung bên trong $...$ khi đo độ dài để ước đúng hơn cho phương án có công thức
const _plainLen = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, (_, m) => m || '')
    .replace(/\$(.*?)\$/g, (_, m) => m || '')
    .trim().length;

function _renderOptions(q, fmt) {
  const clean = (v) => String(v || '').replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, '');
  const fA = fmt(clean(q.dapAnA));
  const fB = fmt(clean(q.dapAnB));
  const fC = fmt(clean(q.dapAnC));
  const fD = fmt(clean(q.dapAnD));
  const rawLens = [q.dapAnA, q.dapAnB, q.dapAnC, q.dapAnD].map(v => _plainLen(v));
  const maxLen = Math.max(...rawLens);
  // A1: nếu bất kỳ phương án nào có $...$ (công thức), nhân hệ số để tránh tràn trang
  const hasMath = [q.dapAnA, q.dapAnB, q.dapAnC, q.dapAnD].some(v => String(v || '').includes('$'));
  const effectiveLen = hasMath ? Math.ceil(maxLen * 1.6) : maxLen;

  // Layout giống web UI:
  // - 4 cột khi phương án rất ngắn (số, chữ đơn)
  // - 2 cột cho mọi trường hợp còn lại — ô tự xuống dòng khi nội dung dài
  // Không dùng 1 cột riêng vì Word xử lý word-wrap tốt trong 2-cột
  const tdStyle2 = 'width:50%;border:none;padding:3px 8px;word-wrap:break-word;overflow-wrap:break-word;vertical-align:top;';
  if (effectiveLen <= 15) {
    const tdStyle4 = 'width:25%;border:none;padding:2px 6px;word-wrap:break-word;overflow-wrap:break-word;vertical-align:top;';
    return `<table style="width:100%;border:none;border-collapse:collapse;font-size:13pt;table-layout:fixed;"><tr>
      <td style="${tdStyle4}"><b>A.</b> ${fA}</td>
      <td style="${tdStyle4}"><b>B.</b> ${fB}</td>
      <td style="${tdStyle4}"><b>C.</b> ${fC}</td>
      <td style="${tdStyle4}"><b>D.</b> ${fD}</td>
    </tr></table>`;
  }
  // 2 cột — mặc định cho mọi độ dài còn lại, nội dung dài tự xuống dòng trong ô
  return `<table style="width:100%;border:none;border-collapse:collapse;font-size:13pt;table-layout:fixed;">
    <tr>
      <td style="${tdStyle2}"><b>A.</b> ${fA}</td>
      <td style="${tdStyle2}"><b>B.</b> ${fB}</td>
    </tr>
    <tr>
      <td style="${tdStyle2}"><b>C.</b> ${fC}</td>
      <td style="${tdStyle2}"><b>D.</b> ${fD}</td>
    </tr>
  </table>`;
}

/** Trích xuất [a,b,c,d] Đúng/Sai từ chuỗi dapAnDung — hỗ trợ nhiều định dạng */
function _extractDS(dapAnDung) {
  const s = String(dapAnDung || '').trim();

  // "ĐSSD" — 4 ký tự liền
  const m4 = s.match(/^([ĐđSsDd])([ĐđSsDd])([ĐđSsDd])([ĐđSsDd])$/);
  if (m4) {
    return [m4[1], m4[2], m4[3], m4[4]].map(c =>
      c.toLowerCase() === 'đ' || c.toUpperCase() === 'Đ' ? 'Đ' : 'S'
    );
  }

  // "Đ,S,S,Đ" hoặc "Đ||S||S||Đ" — không có prefix a/b/c/d
  if ((s.includes('||') || s.includes(',')) && !s.match(/[a-d][):-]/i)) {
    const sep = s.includes('||') ? '||' : ',';
    const parts = s.split(sep).map(p => p.trim());
    return [0, 1, 2, 3].map(i => {
      const v = (parts[i] || '?').toUpperCase();
      return v.includes('Đ') || v === 'D' || v === 'TRUE' ? 'Đ' : (v === 'S' || v === 'FALSE' ? 'S' : v);
    });
  }

  // "a-Đ" / "a)Đ" / "a: Đ"
  const extract = (lbl) => {
    const rx = new RegExp(`${lbl}[):-]\\s*([ĐđSsDd])`, 'i');
    const v = s.match(rx)?.[1];
    if (!v) return '?';
    return v.toLowerCase() === 'đ' || v.toUpperCase() === 'Đ' ? 'Đ' : 'S';
  };
  return ['a', 'b', 'c', 'd'].map(extract);
}

// ─── Hàm tính số thứ tự phần (I / II / III / IV) ────────────────────────────
function _secNum(index) {
  return ['I', 'II', 'III', 'IV'][Math.min(index, 3)];
}

// ════════════════════════════════════════════════════════════════════════════
//  HÀM XUẤT CHÍNH
// ════════════════════════════════════════════════════════════════════════════
/**
 * @param {Array}  examQuestions - Mảng câu hỏi (loaiCauHoi 1/2/3/4)
 * @param {string} examTitle     - Tên đề, vd "ĐỀ THI TƯƠNG TỰ - MÃ ĐỀ 101"
 * @param {Object} examHeader    - { soGD, truong, kyThi, namHoc, monHoc, thoiGian }
 * @param {Object} examConfig    - { diemMoiCauP1, diemMoiYP2, diemMoiYP3 }
 * @param {string} maDe          - Mã đề, vd "101"
 * @param {Object} imageMap      - Map id→{base64,mime} ảnh gốc từ file (để chèn imageRef)
 * @param {string} mode          - 'math' | 'latex' | 'normal'  (mặc định 'math')
 */
export async function exportSimilarExamToWord(
  examQuestions,
  examTitle,
  examHeader = {},
  examConfig = {},
  maDe = '101',
  imageMap = {},
  mode = 'math'
) {
  _currentImageMap = imageMap || {};
  _graphCache.clear();

  // Chọn formatter theo mode
  const fmt = _getFormatter(mode);

  const questions    = examQuestions.filter(q => q.loaiCauHoi === 1);
  const dung_sai     = examQuestions.filter(q => q.loaiCauHoi === 2);
  const tra_loi_ngan = examQuestions.filter(q => q.loaiCauHoi === 3);
  const tu_luan      = examQuestions.filter(q => q.loaiCauHoi === 4);

  const p1 = parseFloat(examConfig.diemMoiCauP1 || 0.25);
  const p2 = parseFloat(examConfig.diemMoiYP2   || 0.25);
  const p3 = parseFloat(examConfig.diemMoiYP3   || 0.25);
  const p1s       = String(p1).replace('.', ',');
  const p3s       = String(p3).replace('.', ',');
  const diemCauDS = String(4 * p2).replace('.', ',');

  const cleanMon = (examHeader.monHoc || '')
    .replace(/^Môn\s*:\s*|^Môn\s+/i, '').trim().toUpperCase();

  // ── Khung HTML ──────────────────────────────────────────────────────────────
  let html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns:mml='http://www.w3.org/1998/Math/MathML'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <style>
    @page WordSection1 { size:595pt 841.9pt; margin:2cm 2.5cm 2cm 2.5cm; }
    div.WordSection1 { page:WordSection1; }
    body { font-family:'Times New Roman',serif; font-size:14pt; }
    p { margin:0; padding:0; margin-bottom:4pt; line-height:1.35; }
    h2 { text-align:center; font-size:16pt; margin:12pt 0 4pt; }
    table { border-collapse:collapse; }
    td, th { border:1px solid #333; padding:3px 6px; vertical-align:middle; }
    .page-break { page-break-before:always; }
  </style>
</head>
<body>
<div class="WordSection1">
`;

  // ── Header bìa ──────────────────────────────────────────────────────────────
  html += `
<table style="width:100%;border:none;border-collapse:collapse;margin-bottom:8pt;">
<tr>
  <td style="width:45%;text-align:center;vertical-align:top;border:none;">
    <p style="font-size:13pt;font-weight:bold;margin-bottom:2pt;">${examHeader.soGD || ''}</p>
    <p style="font-size:13pt;font-weight:bold;margin-bottom:2pt;">${examHeader.truong || ''}</p>
    <p style="font-size:13pt;font-weight:bold;"><u>Mã đề: ${maDe}</u></p>
  </td>
  <td style="width:55%;text-align:center;vertical-align:top;border:none;">
    <p style="font-size:14pt;font-weight:bold;margin-bottom:2pt;">${examHeader.kyThi || 'ĐỀ KIỂM TRA'}</p>
    <p style="font-size:14pt;font-weight:bold;margin-bottom:2pt;">${examHeader.namHoc || ''}</p>
    <p style="font-size:14pt;font-weight:bold;margin-bottom:2pt;">MÔN: ${cleanMon || examHeader.monHoc || ''}</p>
    <p style="font-size:13pt;font-style:italic;">Thời gian: ${examHeader.thoiGian || ''}</p>
  </td>
</tr>
</table>
<p style="text-align:center;font-weight:bold;font-size:15pt;margin-bottom:10pt;">${examTitle || 'ĐỀ THI'}</p>
`;

  // Đếm số phần để tính số thứ tự động
  let secIdx = 0;

  // ── PHẦN MCQ ────────────────────────────────────────────────────────────────
  if (questions.length > 0) {
    html += `<p style="font-weight:bold;font-size:14pt;margin-top:8pt;">PHẦN ${_secNum(secIdx++)}. Câu trắc nghiệm nhiều phương án lựa chọn</p>`;
    html += `<p style="font-style:italic;font-size:13pt;margin-bottom:6pt;">Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng. Mỗi câu ${p1s} điểm.</p>`;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      html += `<p style="font-size:14pt;"><b>Câu ${i + 1} (${p1s} điểm).</b> ${fmt(q.noiDung)}</p>`;
      if (q.bangBieu) html += _bangBieuHtml(q.bangBieu, fmt);
      if (q.hinhAnh) {
        const b64 = await _fetchGraphBase64(q.hinhAnh);
        if (b64) html += _img(b64);
        else if (q.hinhAnh.moTa) html += `<p style="font-style:italic;font-size:12pt;">[Hình minh họa: ${q.hinhAnh.moTa}]</p>`;
      }
      html += _renderOptions(q, fmt);
    }
  }

  // ── PHẦN ĐÚNG / SAI ─────────────────────────────────────────────────────────
  if (dung_sai.length > 0) {
    html += `<p style="font-weight:bold;font-size:14pt;margin-top:8pt;">PHẦN ${_secNum(secIdx++)}. Câu trắc nghiệm đúng sai</p>`;
    html += `<p style="font-style:italic;font-size:13pt;margin-bottom:6pt;">Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S). Mỗi câu ${diemCauDS} điểm.</p>`;
    for (let i = 0; i < dung_sai.length; i++) {
      const q = dung_sai[i];
      html += `<p style="font-size:14pt;"><b>Câu ${i + 1} (${diemCauDS} điểm).</b> ${fmt(q.noiDung)}</p>`;
      if (q.bangBieu) html += _bangBieuHtml(q.bangBieu, fmt);
      if (q.hinhAnh) {
        const b64 = await _fetchGraphBase64(q.hinhAnh);
        if (b64) html += _img(b64);
        else if (q.hinhAnh.moTa) html += `<p style="font-style:italic;font-size:12pt;">[Hình minh họa: ${q.hinhAnh.moTa}]</p>`;
      }
      html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;margin:4pt 0 8pt;">`;
      html += `<tr><td style="font-weight:bold;text-align:center;background:#F1F5F9;width:85%;">Nhận định</td>`;
      html += `<td style="font-weight:bold;text-align:center;background:#F1F5F9;width:15%;">Đ/S</td></tr>`;
      if (q.yA) html += `<tr><td style="padding:3px 6px;">a) ${fmt(q.yA)}</td><td></td></tr>`;
      if (q.yB) html += `<tr><td style="padding:3px 6px;">b) ${fmt(q.yB)}</td><td></td></tr>`;
      if (q.yC) html += `<tr><td style="padding:3px 6px;">c) ${fmt(q.yC)}</td><td></td></tr>`;
      if (q.yD) html += `<tr><td style="padding:3px 6px;">d) ${fmt(q.yD)}</td><td></td></tr>`;
      html += `</table>`;
    }
  }

  // ── PHẦN TRẢ LỜI NGẮN ───────────────────────────────────────────────────────
  if (tra_loi_ngan.length > 0) {
    html += `<p style="font-weight:bold;font-size:14pt;margin-top:8pt;">PHẦN ${_secNum(secIdx++)}. Câu trắc nghiệm trả lời ngắn</p>`;
    html += `<p style="font-style:italic;font-size:13pt;margin-bottom:6pt;">Học sinh ghi đáp án vào chỗ trống. Mỗi câu ${p3s} điểm.</p>`;
    for (let i = 0; i < tra_loi_ngan.length; i++) {
      const q = tra_loi_ngan[i];
      html += `<p style="font-size:14pt;"><b>Câu ${i + 1} (${p3s} điểm).</b> ${fmt(q.noiDung)}</p>`;
      if (q.bangBieu) html += _bangBieuHtml(q.bangBieu, fmt);
      if (q.hinhAnh) {
        const b64 = await _fetchGraphBase64(q.hinhAnh);
        if (b64) html += _img(b64);
      }
      html += `<p style="margin-left:2em;font-size:13pt;">Đáp án: .....................................</p>`;
    }
  }

  // ── PHẦN TỰ LUẬN ────────────────────────────────────────────────────────────
  if (tu_luan.length > 0) {
    html += `<p style="font-weight:bold;font-size:14pt;margin-top:8pt;">PHẦN ${_secNum(secIdx++)}. Câu hỏi tự luận</p>`;
    for (let i = 0; i < tu_luan.length; i++) {
      const q = tu_luan[i];
      const hasMultiY = !!(q.yA && q.yB);
      if (hasMultiY) {
        html += `<p style="font-size:14pt;"><b>Câu ${i + 1}.</b>${q.noiDung ? ' ' + fmt(q.noiDung) : ''}</p>`;
        if (q.bangBieu) html += _bangBieuHtml(q.bangBieu, fmt);
        if (q.hinhAnh) {
          const b64 = await _fetchGraphBase64(q.hinhAnh);
          if (b64) html += _img(b64);
        }
        if (q.yA) html += `<p style="margin-left:2em;font-size:14pt;"><b>a)</b> ${fmt(q.yA)}</p>`;
        if (q.yB) html += `<p style="margin-left:2em;font-size:14pt;"><b>b)</b> ${fmt(q.yB)}</p>`;
        if (q.yC) html += `<p style="margin-left:2em;font-size:14pt;"><b>c)</b> ${fmt(q.yC)}</p>`;
        if (q.yD) html += `<p style="margin-left:2em;font-size:14pt;"><b>d)</b> ${fmt(q.yD)}</p>`;
      } else {
        const content = q.yA || q.noiDung || '';
        html += `<p style="font-size:14pt;"><b>Câu ${i + 1}.</b> ${fmt(content)}</p>`;
        if (q.bangBieu) html += _bangBieuHtml(q.bangBieu, fmt);
        if (q.hinhAnh) {
          const b64 = await _fetchGraphBase64(q.hinhAnh);
          if (b64) html += _img(b64);
        }
      }
    }
  }

  html += `<p style="text-align:center;font-weight:bold;margin-top:16pt;font-size:14pt;">--- HẾT ---</p>`;

  // ════════════════════════════════════════════════════════════════════════════
  //  ĐÁP ÁN - BIỂU ĐIỂM
  // ════════════════════════════════════════════════════════════════════════════
  html += `<div class="page-break"></div>`;
  html += `<h2>ĐÁP ÁN - BIỂU ĐIỂM</h2>`;
  html += `<p style="text-align:center;font-size:13pt;font-style:italic;margin-bottom:10pt;">${examTitle || ''}</p>`;

  let akSecIdx = 0;

  // ── Đáp án MCQ ──────────────────────────────────────────────────────────────
  if (questions.length > 0) {
    html += `<p style="font-weight:bold;font-size:13pt;">PHẦN ${_secNum(akSecIdx++)}. Trắc nghiệm nhiều lựa chọn (Mỗi câu ${p1} điểm)</p>`;
    // Tách thành nhóm 14 câu / hàng để vừa trang A4
    const chunkSize = 14;
    for (let start = 0; start < questions.length; start += chunkSize) {
      const chunk = questions.slice(start, start + chunkSize);
      html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;margin-bottom:4pt;">`;
      html += `<tr style="background:#E2E8F0;font-weight:bold;text-align:center;"><td style="padding:3px 5px;">Câu</td>`;
      chunk.forEach((_, j) => { html += `<td style="padding:3px 5px;">${start + j + 1}</td>`; });
      html += `</tr><tr style="font-weight:bold;text-align:center;"><td style="background:#E2E8F0;padding:3px 5px;">Đáp án</td>`;
      chunk.forEach(q => {
        const ans = String(q.dapAnDung || '').replace(/\*/g, '').trim();
        html += `<td style="padding:3px 5px;">${ans}</td>`;
      });
      html += `</tr></table>`;
    }
    // Lời giải MCQ
    if (questions.some(q => q.giaiThich)) {
      html += `<p style="font-weight:bold;font-size:12pt;margin-top:4pt;">Lời giải chi tiết:</p>`;
      questions.forEach((q, i) => {
        if (q.giaiThich) {
          html += `<p style="font-size:12pt;"><b>Câu ${i + 1}:</b> ${fmt(q.giaiThich)}</p>`;
        }
      });
    }
  }

  // ── Đáp án Đúng/Sai ─────────────────────────────────────────────────────────
  if (dung_sai.length > 0) {
    html += `<p style="font-weight:bold;font-size:13pt;margin-top:8pt;">PHẦN ${_secNum(akSecIdx++)}. Trắc nghiệm đúng sai (Mỗi ý đúng ${p2} điểm)</p>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;
    html += `<tr style="background:#E2E8F0;font-weight:bold;text-align:center;">
      <td style="padding:3px 6px;">Câu</td>
      <td style="padding:3px 6px;">Ý a</td>
      <td style="padding:3px 6px;">Ý b</td>
      <td style="padding:3px 6px;">Ý c</td>
      <td style="padding:3px 6px;">Ý d</td>
    </tr>`;
    dung_sai.forEach((q, i) => {
      const [a, b, c, d] = _extractDS(q.dapAnDung);
      html += `<tr style="text-align:center;">
        <td style="font-weight:bold;padding:3px 6px;">${i + 1}</td>
        <td style="padding:3px 6px;">${a}</td>
        <td style="padding:3px 6px;">${b}</td>
        <td style="padding:3px 6px;">${c}</td>
        <td style="padding:3px 6px;">${d}</td>
      </tr>`;
    });
    html += `</table>`;
    // Lời giải DS
    if (dung_sai.some(q => q.giaiThich)) {
      html += `<p style="font-weight:bold;font-size:12pt;margin-top:4pt;">Lời giải chi tiết:</p>`;
      dung_sai.forEach((q, i) => {
        if (q.giaiThich) {
          html += `<p style="font-size:12pt;"><b>Câu ${i + 1}:</b> ${fmt(q.giaiThich)}</p>`;
        }
      });
    }
  }

  // ── Đáp án Trả lời ngắn ─────────────────────────────────────────────────────
  if (tra_loi_ngan.length > 0) {
    html += `<p style="font-weight:bold;font-size:13pt;margin-top:8pt;">PHẦN ${_secNum(akSecIdx++)}. Trả lời ngắn (Mỗi câu ${p3} điểm)</p>`;
    tra_loi_ngan.forEach((q, i) => {
      const ans = fmt(String(q.dapAnDung || '...'));
      html += `<p style="font-size:12pt;"><b>Câu ${i + 1}:</b> ${ans}`;
      if (q.giaiThich) html += ` &nbsp;—&nbsp; <i>${fmt(q.giaiThich)}</i>`;
      html += `</p>`;
    });
  }

  // ── Đáp án Tự luận ──────────────────────────────────────────────────────────
  if (tu_luan.length > 0) {
    html += `<p style="font-weight:bold;font-size:13pt;margin-top:8pt;">PHẦN ${_secNum(akSecIdx++)}. Tự luận</p>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">
      <tr style="background:#E2E8F0;font-weight:bold;text-align:center;">
        <td style="width:8%;padding:3px 4px;">Câu</td>
        <td style="width:77%;padding:3px 4px;">Nội dung đáp án</td>
        <td style="width:15%;padding:3px 4px;">Điểm</td>
      </tr>`;

    tu_luan.forEach((q, i) => {
      const hasMultiY = !!(q.yA && q.yB);
      if (hasMultiY) {
        const yLabels = ['A', 'B', 'C', 'D'].filter(l => !!q[`y${l}`]);
        const rows = yLabels.length + (q.giaiThich ? 1 : 0) || 1;
        let first = true;
        yLabels.forEach(lbl => {
          const yTxt  = q[`y${lbl}`]      || '';
          const daTxt = q[`dapAn${lbl}`]  || '';
          const di    = q[`diem${lbl}`]   || '';
          html += `<tr>`;
          if (first) {
            html += `<td rowspan="${rows}" style="text-align:center;vertical-align:middle;font-weight:bold;">Câu ${i + 1}</td>`;
            first = false;
          }
          html += `<td style="padding:3px 6px;"><b>${lbl.toLowerCase()})</b> ${fmt(yTxt)}${daTxt ? '<br/>' + fmt(daTxt) : ''}</td>`;
          html += `<td style="text-align:center;padding:3px 4px;">${di}</td></tr>`;
        });
        if (q.giaiThich) {
          html += `<tr>`;
          if (first) html += `<td style="text-align:center;font-weight:bold;">Câu ${i + 1}</td>`;
          html += `<td colspan="2" style="padding:3px 6px;font-style:italic;">Hướng dẫn chấm: ${fmt(q.giaiThich)}</td></tr>`;
        }
        if (first) {
          html += `<tr><td style="text-align:center;font-weight:bold;">Câu ${i + 1}</td><td></td><td></td></tr>`;
        }
      } else {
        const content = q.yA || q.noiDung || '';
        const da = q.dapAnDung || q.dapAnA || '';
        const di = q.diemA || '';
        let cell = fmt(content);
        if (da && da !== content) cell += '<br/>' + fmt(da);
        if (q.giaiThich) cell += `<br/><i>Hướng dẫn: ${fmt(q.giaiThich)}</i>`;
        html += `<tr>
          <td style="text-align:center;font-weight:bold;padding:3px 4px;">Câu ${i + 1}</td>
          <td style="padding:3px 6px;">${cell}</td>
          <td style="text-align:center;padding:3px 4px;">${di}</td>
        </tr>`;
      }
    });
    html += `</table>`;
  }

  html += `</div></body></html>`;

  // Tên file có suffix theo mode
  const suffix = mode === 'latex' ? '_LaTeX' : mode === 'normal' ? '_ThuongNgay' : '_CongThuc';
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, `De_Thi_Tuong_Tu_Ma_De_${maDe}${suffix}.doc`);
}

// ─── Alias cho 3 kiểu (để Step6 gọi gọn) ────────────────────────────────────
export const exportSimilarExamToWordNormal =
  (q, t, h, c, m, imageMap) => exportSimilarExamToWord(q, t, h, c, m, imageMap, 'normal');

export const exportSimilarExamToWordLatex =
  (q, t, h, c, m, imageMap) => exportSimilarExamToWord(q, t, h, c, m, imageMap, 'latex');
