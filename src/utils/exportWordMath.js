import { saveAs } from 'file-saver';
import katex from 'katex';
import { useExamStore } from '../store/useExamStore';

// ═══════════════════════════════════════════════════════════════════
// HELPER: Vẽ đồ thị trên Canvas → base64 (CLIENT-SIDE, không cần backend)
// ═══════════════════════════════════════════════════════════════════
import { renderGraphToBytes } from './renderGraphToBytes';
const exportMathGraphCache = new Map();

async function fetchGraphBase64(hinhAnh) {
  if (!hinhAnh || !hinhAnh.loai) return null;

  const cacheKey = JSON.stringify(hinhAnh);
  if (exportMathGraphCache.has(cacheKey)) {
    return exportMathGraphCache.get(cacheKey);
  }

  try {
    const bytes = await renderGraphToBytes(hinhAnh);
    if (!bytes) return null;
    // Convert Uint8Array → base64 data URL
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = 'data:image/png;base64,' + btoa(binary);
    exportMathGraphCache.set(cacheKey, base64);
    return base64;
  } catch (err) {
    console.warn('[exportWordMath] Không thể vẽ graph:', err.message);
  }
  return null;
}

// Helper: Tạo HTML ảnh graph cho Word
function graphImgHtml(base64Src) {
  return `<p style="text-align:center;margin:8pt 0;"><img src="${base64Src}" style="max-width:400px;max-height:300px;" /></p>`;
}

// ==========================================
// 1. CỔNG CHUYỂN ĐỔI LATEX -> MATHML (NATIVE WORD)
// ==========================================
const _formatTextMathML = (text) => {
    if (!text) return "";
    let processed = String(text);

    const renderMath = (math, isDisplay, originalMatch) => {
        try {
            const html = katex.renderToString(math, { throwOnError: false, displayMode: isDisplay });
            const mathmlMatch = html.match(/<math[^>]*>.*?<\/math>/s);
            if (mathmlMatch) {
                let mathml = mathmlMatch[0];
                // BÍ QUYẾT: Xóa thẻ semantics và annotation để ÉP MS Word phải vẽ công thức, không được in text
                mathml = mathml.replace(/<semantics[^>]*>/g, '').replace(/<\/semantics>/g, '');
                mathml = mathml.replace(/<annotation[^>]*>.*?<\/annotation>/gs, '');
                // Tăng kích thước subscript/superscript cho giống đánh thủ công
                if (!mathml.includes('scriptsizemultiplier')) {
                    mathml = mathml.replace(/<math([^>]*)>/, '<math$1 scriptsizemultiplier="0.85">');
                }
                return mathml;
            }
            return originalMatch;
        } catch (e) { return originalMatch; }
    };

    processed = processed.replace(/\$\$(.*?)\$\$/gs, (match, math) => renderMath(math, true, match));
    processed = processed.replace(/\$(.*?)\$/g, (match, math) => renderMath(math, false, match));

    processed = processed.replace(/\n/g, '<br/>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return processed;
};

// Chế độ LaTeX text: giữ nguyên $...$ thay vì chuyển sang MathML
const _formatTextLatex = (text) => {
    if (!text) return "";
    let processed = String(text);
    processed = processed.replace(/\n/g, '<br/>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return processed;
};

// Alias module-level để các helper bên dưới (parseLine, v.v.) vẫn hoạt động
// Dùng let để exportToWordMath có thể gán lại theo latexMode
let formatTextWithMath = _formatTextMathML;

// Helper: Đảm bảo text kết thúc bằng dấu chấm
const ensureDot = (html) => {
    if (!html) return html;
    const t = html.trim();
    if (!t || t.endsWith('.') || t.endsWith('</math>') || t.endsWith('。') || t.endsWith('?') || t.endsWith('!')) return t;
    return t + '.';
};

// Helper: Đo độ dài text thuần (bỏ HTML/MathML) để xác định PA ngắn/dài
const plainTextLen = (s) => {
    if (!s) return 0;
    return String(s).replace(/<[^>]*>/g, '').replace(/\$[^$]*\$/g, 'X').trim().length;
};

// Helper: Render 4 phương án A/B/C/D với layout tự động (4PA/2PA/1PA mỗi dòng)
const renderOptionsHtml = (optA, optB, optC, optD, rawA, rawB, rawC, rawD) => {
    const lenA = plainTextLen(rawA), lenB = plainTextLen(rawB);
    const lenC = plainTextLen(rawC), lenD = plainTextLen(rawD);
    const maxLen = Math.max(lenA, lenB, lenC, lenD);
    let out = '';
    if (maxLen <= 15 && optA && optB && optC && optD) {
        // 4 PA trên 1 dòng
        out += `<table style="width:100%;border:none;border-collapse:collapse;"><tr>`;
        out += `<td style="width:25%;border:none;padding:2px 4px;"><b>A.</b> ${optA}</td>`;
        out += `<td style="width:25%;border:none;padding:2px 4px;"><b>B.</b> ${optB}</td>`;
        out += `<td style="width:25%;border:none;padding:2px 4px;"><b>C.</b> ${optC}</td>`;
        out += `<td style="width:25%;border:none;padding:2px 4px;"><b>D.</b> ${optD}</td>`;
        out += `</tr></table>`;
    } else if (maxLen <= 30 && optA && optB && optC && optD) {
        // 2 PA trên 1 dòng
        out += `<table style="width:100%;border:none;border-collapse:collapse;">`;
        out += `<tr><td style="width:50%;border:none;padding:2px 4px;"><b>A.</b> ${optA}</td>`;
        out += `<td style="width:50%;border:none;padding:2px 4px;"><b>B.</b> ${optB}</td></tr>`;
        out += `<tr><td style="width:50%;border:none;padding:2px 4px;"><b>C.</b> ${optC}</td>`;
        out += `<td style="width:50%;border:none;padding:2px 4px;"><b>D.</b> ${optD}</td></tr>`;
        out += `</table>`;
    } else {
        // 1 PA trên 1 dòng (giữ nguyên logic cũ)
        if (optA) out += `<p><b>A.</b> ${optA}</p>`;
        if (optB) out += `<p><b>B.</b> ${optB}</p>`;
        if (optC) out += `<p><b>C.</b> ${optC}</p>`;
        if (optD) out += `<p><b>D.</b> ${optD}</p>`;
    }
    return out;
};

// Hàm hỗ trợ build bảng đặc tả mẫu mới (4-2-0)
const buildNewMathSpecTable = (matrix, config, examConfig, examHeader) => {
    const cell = (content, opts = {}) => {
        const { bold = false, align = 'center', rowspan = 1, colspan = 1, bg = '', color = '000000', size = '11pt' } = opts;
        const style = [
            'border:1px solid black', `text-align:${align}`, 'vertical-align:top',
            bg ? `background-color:#${bg}` : '', `color:#${color}`, `font-size:${size}`
        ].filter(Boolean).join(';');
        const val = (content === 0 || content === '0' || content === 0.0) ? '' : content;
        return `<td style="${style}"${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${colspan > 1 ? ` colspan="${colspan}"` : ''}>${bold ? `<b>${val ?? ''}</b>` : (val ?? '')}</td>`;
    };

    let rows = `
        <tr>
            ${cell('TT', { bold: true, rowspan: 4, bg: 'F1F5F9' })}
            ${cell('Chương/ chủ đề', { bold: true, rowspan: 4, bg: 'F1F5F9' })}
            ${cell('Nội dung/ đơn vị kiến thức', { bold: true, rowspan: 4, bg: 'F1F5F9' })}
            ${cell('Yêu cầu cần đạt', { bold: true, rowspan: 4, bg: 'F1F5F9' })}
            ${cell('Câu', { bold: true, colspan: 2, rowspan: 3, bg: 'F1F5F9' })}
            ${cell('Mức độ đánh giá', { bold: true, colspan: 9, bg: 'F1F5F9' })}
        </tr>
        <tr>
            ${cell('Trắc nghiệm khách quan', { bold: true, colspan: 6, bg: 'F8FAFC' })}
            ${cell('Tự luận', { bold: true, colspan: 3, rowspan: 2, bg: 'F8FAFC' })}
        </tr>
        <tr>
            ${cell('Nhiều lựa chọn', { bold: true, colspan: 3, bg: 'FFFFFF' })}
            ${cell('Đúng/sai', { bold: true, colspan: 3, bg: 'FFFFFF' })}
        </tr>
        <tr>
            ${cell('Số câu', { bold: true, bg: 'F1F5F9' })}
            ${cell('STT', { bold: true, bg: 'F1F5F9' })}
            ${cell('Biết', { bold: true, bg: 'F8FAFC' })}
            ${cell('Hiểu', { bold: true, bg: 'F8FAFC' })}
            ${cell('VD', { bold: true, bg: 'F8FAFC' })}
            ${cell('Biết', { bold: true, bg: 'F8FAFC' })}
            ${cell('Hiểu', { bold: true, bg: 'F8FAFC' })}
            ${cell('VD', { bold: true, bg: 'F8FAFC' })}
            ${cell('Biết', { bold: true, bg: 'F8FAFC' })}
            ${cell('Hiểu', { bold: true, bg: 'F8FAFC' })}
            ${cell('VD', { bold: true, bg: 'F8FAFC' })}
        </tr>
    `;

    matrix.forEach((topic, topicIdx) => {
        const dvList = topic.donViKienThuc || [];
        const topicRows = dvList.length;

        dvList.forEach((dv, dvIdx) => {
            const isFirst = dvIdx === 0;
            
            // Collect question info for the entire ĐVKT
            const mappingCodes = {
                nlc_biet: '', nlc_hieu: '', nlc_vd: '',
                ds_biet: '', ds_hieu: '', ds_vd: '',
                tl_biet: '', tl_hieu: '', tl_vd: ''
            };
            const summary = {
                nlc: { count: 0, labels: [] },
                ds: { count: 0, labels: [] },
                tl: { count: 0, labels: [] }
            };

            ['nhieuLuaChon', 'dungSai', 'tuLuan'].forEach(type => {
                ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(tl => {
                    let n = 0;
                    if (type === 'tuLuan') {
                        n = dv.tuLuan?.subItems?.filter(s => s.level === tl).length || 0;
                    } else {
                        n = dv[type]?.[tl] || 0;
                    }

                    if (n > 0) {
                        const typeKey = type === 'nhieuLuaChon' ? 'nlc' : (type === 'dungSai' ? 'ds' : 'tl');
                        summary[typeKey].count += n;

                        const codes = [];
                        for (let i = 0; i < n; i++) {
                            const m = dv.indicatorMap?.[`${type}_${tl}_${i}`];
                            if (m) {
                                if (m.label) {
                                    const lab = m.label.replace('C', '');
                                    if (!summary[typeKey].labels.includes(lab)) summary[typeKey].labels.push(lab);
                                }
                                if (m.code) codes.push(m.code);
                            }
                        }

                        // Fill grid mapping
                        const gridLvl = (tl === 'vanDung' || tl === 'vanDungCao') ? 'vd' : tl;
                        const gridKey = `${typeKey}_${gridLvl}`;
                        if (mappingCodes[gridKey] !== undefined) {
                            const uniqueCodes = [...new Set(codes)].filter(Boolean).join(', ');
                            if (uniqueCodes) {
                                mappingCodes[gridKey] = mappingCodes[gridKey] 
                                    ? (mappingCodes[gridKey] + ', ' + uniqueCodes) 
                                    : uniqueCodes;
                            }
                        }
                    }
                });
            });

            const totalQuestions = summary.nlc.labels.length + summary.ds.labels.length + summary.tl.labels.length;
            const allLabels = [...new Set([...summary.nlc.labels, ...summary.ds.labels, ...summary.tl.labels])].sort((a,b) => parseInt(a)-parseInt(b) || a.localeCompare(b));

            rows += '<tr>';
            if (isFirst) {
                rows += cell(topicIdx + 1, { rowspan: topicRows, bold: true });
                rows += cell(topic.tenChuDe || '', { rowspan: topicRows, bold: true, color: 'FF0000', align: 'left', size: '10pt' });
            }
            
            rows += cell(dv.noiDung || '', { align: 'left', size: '10pt' });
            
            // YCCĐ
            const yccdClean = (dv.yeuCauCanDat || '').split('\n').filter(Boolean).join('<br/>');
            rows += `<td style="border:1px solid black;text-align:left;font-size:10pt;">${yccdClean}</td>`;
            
            rows += cell(totalQuestions || '', { bold: true, size: '10pt' });
            rows += cell(allLabels.join('<br/>'), { size: '9pt' });

            // Grid
            rows += cell(mappingCodes.nlc_biet, { size: '9pt' });
            rows += cell(mappingCodes.nlc_hieu, { size: '9pt' });
            rows += cell(mappingCodes.nlc_vd, { size: '9pt' });
            
            rows += cell(mappingCodes.ds_biet, { size: '9pt' });
            rows += cell(mappingCodes.ds_hieu, { size: '9pt' });
            rows += cell(mappingCodes.ds_vd, { size: '9pt' });

            rows += cell(mappingCodes.tl_biet, { size: '9pt' });
            rows += cell(mappingCodes.tl_hieu, { size: '9pt' });
            rows += cell(mappingCodes.tl_vd, { size: '9pt' });

            rows += '</tr>';
        });
    });

    // Dòng tổng kết
    const h = buildMatrixHelpers(matrix, config, examConfig, examHeader);
    const { sumCount, getColumnTotalPoints, pct } = h;

    rows += `<tr>
        ${cell('Tổng (Ý)', { bold: true, align: 'center', colspan: 6, bg: 'F1F5F9' })}
        ${cell(sumCount('nhieuLuaChon', 'biet'))}${cell(sumCount('nhieuLuaChon', 'hieu'))}${cell(sumCount('nhieuLuaChon', 'vanDung'))}
        ${cell(sumCount('dungSai', 'biet'))}${cell(sumCount('dungSai', 'hieu'))}${cell(sumCount('dungSai', 'vanDung') + sumCount('dungSai', 'vanDungCao'))}
        ${cell(sumCount('tuLuan', 'biet'))}${cell(sumCount('tuLuan', 'hieu'))}${cell(sumCount('tuLuan', 'vanDung'))}
    </tr>`;
    rows += `<tr>
        ${cell('Tổng số câu', { bold: true, align: 'center', colspan: 6, bg: 'F8FAFC' })}
        ${cell(sumCount('nhieuLuaChon', 'biet'))}${cell(sumCount('nhieuLuaChon', 'hieu'))}${cell(sumCount('nhieuLuaChon', 'vanDung'))}
        ${cell(sumCount('dungSai', 'biet') * 0.25)}${cell(sumCount('dungSai', 'hieu') * 0.25)}${cell((sumCount('dungSai', 'vanDung') + sumCount('dungSai', 'vanDungCao')) * 0.25)}
        ${cell(sumCount('tuLuan', 'biet'))}${cell(sumCount('tuLuan', 'hieu'))}${cell(sumCount('tuLuan', 'vanDung'))}
    </tr>`;
    rows += `<tr>
        ${cell('Tổng điểm', { bold: true, align: 'center', colspan: 6, bg: 'E2E8F0' })}
        ${cell(getColumnTotalPoints('nhieuLuaChon'), { bold: true, align: 'center', colspan: 3 })}
        ${cell(getColumnTotalPoints('dungSai'), { bold: true, align: 'center', colspan: 3 })}
        ${cell(getColumnTotalPoints('tuLuan'), { bold: true, align: 'center', colspan: 3 })}
    </tr>`;
    rows += `<tr>
        ${cell('Tỉ lệ %', { bold: true, align: 'center', colspan: 6, bg: 'E2E8F0' })}
        ${cell(pct(getColumnTotalPoints('nhieuLuaChon')), { bold: true, align: 'center', colspan: 3 })}
        ${cell(pct(getColumnTotalPoints('dungSai')), { bold: true, align: 'center', colspan: 3 })}
        ${cell(pct(getColumnTotalPoints('tuLuan')), { bold: true, align: 'center', colspan: 3 })}
    </tr>`;

    return `<table border="1" style="border-collapse:collapse;width:100%;font-size:11pt;font-family:'Times New Roman';">${rows}</table>`;
};

// ==========================================
// 2. CÁC HÀM XỬ LÝ BÓC TÁCH THÔNG MINH
// ==========================================
const cleanAns = (text) => {
    if (!text) return "";
    let t = String(text).trim();
    t = t.replace(/^(Đáp án:|Đáp án)\s*/i, '');
    t = t.replace(/\*/g, ''); // Bỏ mọi dấu *
    return formatTextWithMath(t);
};

// Thuật toán bóc tách a,b,c,d siêu việt (Chống lỗi dấu phẩy trong công thức Toán)
const extractABCD = (str) => {
    let s = String(str || '').trim();
    s = s.replace(/^(Đáp án:|Đáp án)\s*/i, '');
    // Xóa mọi dấu * còn sót từ AI
    s = s.replace(/\*/g, '');

    // Hỗ trợ trường hợp đáp án lưu dạng || hoặc dấu phẩy
    if (!s.match(/(?:a\)|a-)/i) && (s.includes('||') || s.includes(','))) {
        const parts = s.includes('||') ? s.split('||').map(x => x.trim()) : s.split(',').map(x => x.trim());
        const autoWrap = (val) => {
            let v = val;
            if (v.includes('\\') && !v.includes('$')) return `$${v}$`;
            return v;
        };
        return [parts[0] || '...', parts[1] || '...', parts[2] || '...', parts[3] || '...'].map(autoWrap).map(formatTextWithMath);
    }

    const a = s.match(/(?:a\)|a-)\s*(.*?)(?=\s*(?:b\)|b-)|$)/i)?.[1] || '...';
    const b = s.match(/(?:b\)|b-)\s*(.*?)(?=\s*(?:c\)|c-)|$)/i)?.[1] || '...';
    const c = s.match(/(?:c\)|c-)\s*(.*?)(?=\s*(?:d\)|d-)|$)/i)?.[1] || '...';
    const d = s.match(/(?:d\)|d-)\s*(.*?)$/i)?.[1] || '...';

    const autoWrap = (val) => {
        let v = val.trim();
        if (v.endsWith(',') || v.endsWith(';')) v = v.slice(0, -1).trim();
        // Nếu AI quên bọc dấu $ cho công thức Toán, tự động bọc lại
        if (v.includes('\\') && !v.includes('$')) return `$${v}$`;
        return v;
    };

    return [a, b, c, d].map(autoWrap).map(formatTextWithMath);
};

const parseLine = (line) => {
    let noi_dung = line.trim();
    let diem = "";
    const pipeIdx = noi_dung.indexOf('||');
    if (pipeIdx !== -1) {
        diem = noi_dung.substring(pipeIdx + 2).trim();
        noi_dung = noi_dung.substring(0, pipeIdx).trim();
    } else {
        const parenMatch = noi_dung.match(/^(.*?)\s*\(([0-9.,]+)\s*(?:điểm|đ)?\)\s*$/);
        if (parenMatch) {
            noi_dung = parenMatch[1].trim();
            diem = parenMatch[2].trim();
        }
    }
    if (noi_dung.startsWith('*') || noi_dung.startsWith('+') || noi_dung.startsWith('-')) {
        noi_dung = noi_dung.substring(1).trim();
    }
    return { nd: formatTextWithMath(noi_dung), diem };
};

const getYParts = (q) => {
    let parts = [];
    const keys = [['a', 'yA', 'dapAnA', 'diemA'], ['b', 'yB', 'dapAnB', 'diemB'], ['c', 'yC', 'dapAnC', 'diemC'], ['d', 'yD', 'dapAnD', 'diemD']];
    for (let [lbl, keyY, keyDA, keyDiem] of keys) {
        const y_text = (q[keyY] || '').trim();
        const da_text = (q[keyDA] || '').trim();
        const di_text = (q[keyDiem] || '').trim();

        // VÁ LỖI CỐT LÕI: Giữ lại nếu có nội dung câu hỏi (y) HOẶC có đáp án (da)
        if (y_text || da_text) {
            parts.push({ label: lbl, y: y_text, da: da_text, di: di_text });
        }
    }

    // NẾU CÂU HỎI KHÔNG CHIA Ý A, B, C MÀ VIẾT THẲNG VÀO NỘI DUNG CHÍNH (dapAnDung)
    if (parts.length === 0) {
        const generic_ans = (q.dapAnDung || q.dapAnA || q.answer || q.noiDung || '').trim();
        const generic_diem = (q.diemA || q.diem || '').trim();
        if (generic_ans) {
            parts.push({ label: '', y: '', da: generic_ans, di: generic_diem });
        } else {
            parts.push({ label: '', y: '', da: '...', di: generic_diem });
        }
    }

    // Nếu chỉ có 1 ý → bỏ label a) (mỗi câu 1 ý không cần đánh a/b/c)
    if (parts.length === 1) {
        parts[0].label = '';
    }

    return parts;
};

// ==========================================
// 3. CÁC HÀM TÍNH TOÁN MA TRẬN (Giống exportWord.js)
// ==========================================
const buildMatrixHelpers = (matrix, config, examConfig, examHeader) => {
    const sumCount = (type, level) => matrix.reduce((sum, topic) => {
        return sum + (topic.donViKienThuc || []).reduce((s2, dv) => s2 + (Number(dv[type]?.[level]) || 0), 0);
    }, 0);

    const getTopicSum = (topic, type, level) =>
        (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv[type]?.[level]) || 0), 0);

    const getTopicLevelCount = (topic, level) =>
        getTopicSum(topic, 'nhieuLuaChon', level) +
        getTopicSum(topic, 'dungSai', level) +
        (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) : 0) +
        getTopicSum(topic, 'tuLuan', level);

    const getDvLevelCount = (dv, level) =>
        (Number(dv.nhieuLuaChon?.[level]) || 0) +
        (Number(dv.dungSai?.[level]) || 0) +
        (config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0) +
        (Number(dv.tuLuan?.[level]) || 0);

    const getDvTotalPoints = (dv) => {
        const nlc = ((Number(dv.nhieuLuaChon?.biet) || 0) + (Number(dv.nhieuLuaChon?.hieu) || 0) + (Number(dv.nhieuLuaChon?.vanDung) || 0)) * examConfig.diemMoiCauP1;
        const ds = ((Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0)) * examConfig.diemMoiYP2;
        const tln = config.hasTraLoiNgan ? ((Number(dv.traLoiNgan?.biet) || 0) + (Number(dv.traLoiNgan?.hieu) || 0) + (Number(dv.traLoiNgan?.vanDung) || 0)) * examConfig.diemMoiYP3 : 0;
        const tl = (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0);
        return nlc + ds + tln + tl;
    };

    const getLevelTotalItems = (level) =>
        sumCount('nhieuLuaChon', level) +
        sumCount('dungSai', level) + (level === 'vanDung' ? sumCount('dungSai', 'vanDungCao') : 0) +
        (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) +
        sumCount('tuLuan', level);

    const getLevelTotalQuestions = (level) =>
        sumCount('nhieuLuaChon', level) +
        ((sumCount('dungSai', level) + (level === 'vanDung' ? sumCount('dungSai', 'vanDungCao') : 0)) * 0.25) +
        (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) +
        sumCount('tuLuan', level);

    const getTopicTuLuanPoints = (topic) =>
        (topic.donViKienThuc || []).reduce((s, dv) =>
            s + (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0), 0);

    const getColumnTotalPoints = (type) => {
        if (type === 'tuLuan') return matrix.reduce((sum, t) => sum + getTopicTuLuanPoints(t), 0);
        const totalCount = sumCount(type, 'biet') + sumCount(type, 'hieu') + sumCount(type, 'vanDung') +
            (type === 'dungSai' ? sumCount('dungSai', 'vanDungCao') : 0);
        if (type === 'nhieuLuaChon') return totalCount * examConfig.diemMoiCauP1;
        if (type === 'dungSai') return totalCount * examConfig.diemMoiYP2;
        if (type === 'traLoiNgan') return config.hasTraLoiNgan ? totalCount * examConfig.diemMoiYP3 : 0;
        return 0;
    };

    const getLevelTotalPoints = (level) => {
        const tlKey = level === 'biet' ? 'diemBiet' : level === 'hieu' ? 'diemHieu' : 'diemVanDung';
        return matrix.reduce((sum, topic) => {
            return sum +
                getTopicSum(topic, 'nhieuLuaChon', level) * examConfig.diemMoiCauP1 +
                (getTopicSum(topic, 'dungSai', level) + (level === 'vanDung' ? getTopicSum(topic, 'dungSai', 'vanDungCao') : 0)) * examConfig.diemMoiYP2 +
                (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) * examConfig.diemMoiYP3 : 0) +
                (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv.tuLuan?.[tlKey]) || 0), 0);
        }, 0);
    };

    const getGrandTotalPoints = () =>
        getLevelTotalPoints('biet') + getLevelTotalPoints('hieu') + getLevelTotalPoints('vanDung');

    const getDvLevelSummary = (dv, level) => {
        const nlc = Number(dv.nhieuLuaChon?.[level]) || 0;
        const ds = (Number(dv.dungSai?.[level]) || 0) + (level === 'vanDung' ? (Number(dv.dungSai?.vanDungCao) || 0) : 0);
        const tln = config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0;
        const tl = config.hasTuLuan ? (Number(dv.tuLuan?.[level]) || 0) : 0;
        const totalCau = nlc;
        const totalY = ds + tln + tl;
        if (totalCau === 0 && totalY === 0) return '';
        if (totalCau > 0 && totalY === 0) return `${totalCau}`;
        if (totalCau === 0 && totalY > 0) return `${totalY} ý`;
        return `${totalCau}c+ ${totalY} ý`;
    };

    const pct = (val) => ((val / 10) * 100).toFixed(1).replace('.0', '') + '%';

    // Phát hiện môn học để gắn mã năng lực chuyên môn
    const isHoaMon = /hóa|hoá/i.test(examHeader?.monHoc || '');
    const isToanMon = /toán|toan/i.test(examHeader?.monHoc || '');

    // Hàm phát hiện mã năng lực Hóa học từ nội dung YCCĐ (đồng bộ Step3_Specification)
    const getIndicatorForLevel = (text, level) => {
      if (!text || !isHoaMon || config.showCompetencyCode === false) return null;
      const lower = text.toLowerCase();
      const codes = [];
      if (level === 'biet') {
        if (/nhận biết|nêu được|gọi được tên|kể tên|liệt kê|nêu đặc điểm|phát biểu được|viết được|biểu diễn được|lập được|phân biệt được|nhận ra được/.test(lower)) codes.push('HH1.1');
        if (/xác định được|tra cứu được|tìm kiếm|tìm hiểu thông tin|sử dụng được.*bảng/.test(lower)) codes.push('HH1.1');
      }
      if (level === 'hieu') {
        if (/trình bày được|trình bày.*tính chất/.test(lower)) codes.push('HH1.2');
        if (/mô tả được|nhận xét được|mô tả.*thí nghiệm/.test(lower)) codes.push('HH1.3');
        if (/so sánh được|phân loại được|lựa chọn được/.test(lower)) codes.push('HH1.4');
        if (/phân tích được|phân tích.*khía cạnh/.test(lower)) codes.push('HH1.5');
        if (/giải thích được|giải thích|lập luận được|mối quan hệ/.test(lower)) codes.push('HH1.6');
        if (/dự đoán được|chứng minh được|viết được phương trình/.test(lower)) codes.push('HH1.6');
        if (/thực hiện được thí nghiệm|lắp ráp dụng cụ|tiến hành.*thí nghiệm|quan sát.*hiện tượng/.test(lower)) codes.push('HH1.3');
      }
      if (level === 'vanDung') {
        if (/từ khóa|thuật ngữ khoa học|kết nối.*thông tin|dàn ý|văn bản khoa học/.test(lower)) codes.push('HH1.7');
        if (/thảo luận|nhận định phê phán|phê phán/.test(lower)) codes.push('HH1.8');
        if (/đề xuất vấn đề|đặt được câu hỏi|phân tích.*bối cảnh/.test(lower)) codes.push('HH2.1');
        if (/phán đoán|giả thuyết|xây dựng.*giả thuyết/.test(lower)) codes.push('HH2.2');
        if (/lập kế hoạch|xây dựng.*khung logic|lựa chọn.*phương pháp/.test(lower)) codes.push('HH2.3');
        if (/thu thập|chứng cứ|thực nghiệm|phân tích.*dữ liệu|rút ra.*kết luận|thí nghiệm.*thực tiễn|đề xuất.*phương án thí nghiệm/.test(lower)) codes.push('HH2.4');
        if (/viết.*báo cáo|trình bày báo cáo|thảo luận.*kết quả|phản biện.*bảo vệ/.test(lower)) codes.push('HH2.5');
        if (/vận dụng.*giải thích|vận dụng.*tính toán|vận dụng.*công thức|hiện tượng tự nhiên|ứng dụng.*cuộc sống/.test(lower)) codes.push('HH3.1');
        if (/phản biện|đánh giá ảnh hưởng|vận dụng.*đánh giá/.test(lower)) codes.push('HH3.2');
        if (/đề xuất.*phương pháp|đề xuất.*biện pháp|đề xuất.*mô hình|đề xuất.*kế hoạch|giải quyết vấn đề.*thực tiễn/.test(lower)) codes.push('HH3.3');
        if (/định hướng.*nghề|ngành.*nghề/.test(lower)) codes.push('HH3.4');
        if (/ứng xử|phát triển bền vững|bảo vệ môi trường/.test(lower)) codes.push('HH3.5');
        if (codes.length === 0 && /vận dụng|giải quyết|thực tiễn|tính toán|thực hành/.test(lower)) codes.push('HH3.1');
      }
      const unique = [...new Set(codes)];
      return unique.length > 0 ? unique.join(', ') : null;
    };

    // Hàm phát hiện mã năng lực Toán học từ nội dung YCCĐ (đồng bộ Step3_Specification)
    const getMathIndicatorForLevel = (text, level) => {
      if (!text || !isToanMon || config.showCompetencyCode === false) return null;
      const lower = text.toLowerCase();
      const codes = [];
      if (level === 'biet') {
        if (/nhận biết|nhận dạng|nêu được|gọi được tên|kể tên|liệt kê|đọc được|viết được|nhận ra/.test(lower)) codes.push('TD1.1');
        if (/xác định được|tìm được|đo đạc|quan sát|thống kê/.test(lower)) codes.push('TD1.1');
        if (/sử dụng được ký hiệu|ngôn ngữ toán|biểu diễn/.test(lower)) codes.push('GT1.1');
      }
      if (level === 'hieu') {
        if (/trình bày được|giải thích được|nêu được khái niệm|mô tả được|chứng minh được/.test(lower)) codes.push('TD1.2');
        if (/so sánh được|phân loại được|phân tích được|lựa chọn được/.test(lower)) codes.push('TD2.1');
        if (/lập luận được|suy luận|suy diễn|chứng minh/.test(lower)) codes.push('TD2.1');
        if (/trình bày.*lập luận|diễn đạt.*toán học/.test(lower)) codes.push('GT2.1');
      }
      if (level === 'vanDung') {
        if (/vận dụng được|giải quyết|áp dụng|tính toán|giải.*phương trình|giải.*bất phương trình/.test(lower)) codes.push('TD2.2');
        if (/vận dụng.*thực tiễn|ứng dụng.*thực tế|tình huống thực tế|bối cảnh thực tiễn/.test(lower)) codes.push('GQ2.1');
        if (/đề xuất|phân tích tình huống|lựa chọn.*phương pháp|so sánh.*phương án/.test(lower)) codes.push('GQ2.2');
        if (/mô hình hoá|mô hình hóa|biểu diễn.*hàm số|xây dựng.*mô hình/.test(lower)) codes.push('MH2.1');
        if (/vận dụng.*đạo hàm|tối ưu|tốc độ.*thay đổi/.test(lower)) codes.push('GQ2.2');
        if (/vận dụng.*tích phân|diện tích|thể tích|tính.*công/.test(lower)) codes.push('MH3.1');
        if (/đánh giá|phản biện|nhận xét.*ảnh hưởng|so sánh.*giải pháp/.test(lower)) codes.push('GQ3.2');
        if (/sử dụng.*máy tính|công cụ|phần mềm|geogebra|desmos|excel|bảng tính/.test(lower)) codes.push('CC2.1');
        if (/sử dụng.*ngôn ngữ.*toán|biểu đồ|bảng.*số liệu|trình bày.*kết quả/.test(lower)) codes.push('GT3.1');
        if (codes.length === 0 && /vận dụng|giải quyết|thực tiễn|tính toán/.test(lower)) codes.push('TD2.2');
      }
      const unique = [...new Set(codes)];
      return unique.length > 0 ? unique.join(', ') : null;
    };

    // Helper: Lấy mã năng lực phù hợp theo môn
    const getCompetencyTag = (dv, level) => {
      let indicator = isToanMon ? getMathIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (indicator) return indicator;
      return level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    };

    const getIndicatorsForCell = (dv, type, level) => {
      if (!dv || !dv.indicatorMap) return null;
      const toCode = (m) => m ? (typeof m === 'object' ? (m.code || '') : m) : '';
      const inds = [];
      if (type === 'dungSai' && level === 'vanDung') {
        const vdCount = Number(dv.dungSai?.vanDung) || 0;
        const vdcCount = Number(dv.dungSai?.vanDungCao) || 0;
        for (let i = 0; i < vdCount; i++) {
          const c = toCode(dv.indicatorMap[`dungSai_vanDung_${i}`]);
          if (c) inds.push(c);
        }
        for (let i = 0; i < vdcCount; i++) {
          const c = toCode(dv.indicatorMap[`dungSai_vanDungCao_${i}`]);
          if (c) inds.push(c);
        }
      } else {
        const count = Number(dv[type]?.[level]) || 0;
        if (count === 0) return null;
        for (let i = 0; i < count; i++) {
          const c = toCode(dv.indicatorMap[`${type}_${level}_${i}`]);
          if (c) inds.push(c);
        }
      }
      const unique = [...new Set(inds)];
      return unique.length > 0 ? unique.join(', ') : null;
    };

    // Format mã năng lực cho Bảng Đặc tả (hỗ trợ mã chuyên môn HH/TD/GQ...)
    const fmtNLC = (val, level, dv, type) => {
      const v = Number(val) || 0;
      if (v <= 0) return 0;
      if (config.showCompetencySymbol === false) return `${v}`;

      let indicator = getIndicatorsForCell(dv, type, level);
      if (!indicator) {
        if (isToanMon) indicator = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
        if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      }
      if (indicator) return `${v} (${indicator})`;

      const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
      return `${v} (${code})`;
    };
    const fmtY = (val, level, dv, type) => {
      const v = Number(val) || 0;
      if (v <= 0) return 0;
      if (config.showCompetencySymbol === false) return `${v} ý`;

      let indicator = getIndicatorsForCell(dv, type, level);
      if (!indicator) {
        if (isToanMon) indicator = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
        if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      }
      if (indicator) return `${v} ý (${indicator})`;

      const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
      return `${v} ý (${code})`;
    };

    return {
        sumCount, getTopicSum, getTopicLevelCount,
        getDvLevelCount, getDvTotalPoints, getDvLevelSummary,
        getLevelTotalItems, getLevelTotalQuestions,
        getTopicTuLuanPoints, getColumnTotalPoints,
        getLevelTotalPoints, getGrandTotalPoints, pct,
        fmtNLC, fmtY, getCompetencyTag, getIndicatorsForCell,
        isToanMon, getMathIndicatorForLevel, getIndicatorForLevel
    };
};

// ==========================================
// 4. XUẤT BẢNG MA TRẬN DẠNG HTML
// ==========================================
const buildMatrixTable = (matrix, config, examConfig, examHeader) => {
    const h = buildMatrixHelpers(matrix, config, examConfig, examHeader);
    const { sumCount, getTopicSum, getTopicLevelCount, getLevelTotalItems, getLevelTotalQuestions,
        getColumnTotalPoints, getLevelTotalPoints, getGrandTotalPoints, pct, getIndicatorsForCell,
        isToanMon, getMathIndicatorForLevel, getIndicatorForLevel } = h;

    const cell = (content, opts = {}) => {
        const { bold = false, align = 'center', rowspan = 1, colspan = 1, bg = '', width = '', valign = 'top' } = opts;
        const style = [
            'border:1px solid black', `text-align:${align}`, `vertical-align:${valign}`,
            bg ? `background-color:#${bg}` : '',
            width ? `width:${width}` : ''
        ].filter(Boolean).join(';');
        const val = (content === 0 || content === '0' || content === 0.0) ? '' : content;
        return `<td style="${style}"${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${colspan > 1 ? ` colspan="${colspan}"` : ''}>${bold ? `<b>${val ?? ''}</b>` : (val ?? '')}</td>`;
    };

    const cellWithIndicator = (val, level, dv, type, opts = {}) => {
        const { bold = false, align = 'center', rowspan = 1, colspan = 1, bg = '', width = '', valign = 'top' } = opts;
        const style = [
            'border:1px solid black', `text-align:${align}`, `vertical-align:${valign}`,
            bg ? `background-color:#${bg}` : '',
            width ? `width:${width}` : ''
        ].filter(Boolean).join(';');
        const v = (val === 0 || val === '0' || val === 0.0) ? '' : val;

        let content = v;
        if (v !== '') {
            let indicator = getIndicatorsForCell(dv, type, level);
            if (!indicator) {
              if (isToanMon) indicator = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
              if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
            }
            if (indicator && config.showCompetencySymbol !== false) {
                content += `<br/><span style="font-size:10pt;color:gray;">(${indicator})</span>`;
            }
        }
        return `<td style="${style}"${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${colspan > 1 ? ` colspan="${colspan}"` : ''}>${bold ? `<b>${content}</b>` : content}</td>`;
    };

    // Ô dữ liệu hiển thị: số câu/ý + điểm + mã năng lực (như web matrix)
    const cellWithDiem = (val, level, dv, type, suffix, diemPerItem) => {
        const v = Number(val) || 0;
        if (v <= 0) return `<td style="border:1px solid black;text-align:center;vertical-align:top;"></td>`;
        let content = `${v}${suffix}`;
        const diemVal = Math.round(v * (Number(diemPerItem) || 0) * 100) / 100;
        if (diemVal > 0) content += `<br/><span style="font-size:10pt;color:#DC2626;">${diemVal}đ</span>`;
        if (config.showCompetencySymbol !== false) {
            let ind = getIndicatorsForCell(dv, type, level);
            if (!ind && isToanMon) ind = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
            if (!ind) ind = getIndicatorForLevel(dv?.yeuCauCanDat, level);
            if (ind) content += `<br/><span style="font-size:10pt;color:gray;">(${ind})</span>`;
        }
        return `<td style="border:1px solid black;text-align:center;vertical-align:top;">${content}</td>`;
    };

    let rows = config.hasTuLuan ? `
      <colgroup>
        <col style="width: 4.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 19.8%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.0%;" />
        <col style="width: 4.0%;" />
        <col style="width: 4.0%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 4.5%;" />
        <col style="width: 7.0%;" />
      </colgroup>
    ` : `
      <colgroup>
        <col style="width: 5.0%;" />
        <col style="width: 8.0%;" />
        <col style="width: 22.0%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 5.5%;" />
        <col style="width: 8.0%;" />
      </colgroup>
    `;

    // Header 4 dòng
    rows += `<tr>
      ${cell('TT', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Chủ đề/Chương', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Nội dung/Đơn vị KT', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Mức độ đánh giá', { bold: true, colspan: 6 + (config.hasTraLoiNgan ? 3 : 0) + (config.hasTuLuan ? 3 : 0), bg: 'E2E8F0' })}
      ${cell('Tổng (Ý)', { bold: true, rowspan: 3, colspan: 3, bg: 'E2E8F0' })}
      ${cell('Tỉ lệ %', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
    </tr>`;
    rows += `<tr>
      ${cell('TNKQ', { bold: true, colspan: config.hasTraLoiNgan ? 9 : 6, bg: 'DBEAFE' })}
      ${config.hasTuLuan ? cell('Tự luận', { bold: true, colspan: 3, bg: 'DCFCE7' }) : ''}
    </tr>`;
    rows += `<tr>
      ${cell('Nhiều lựa chọn', { bold: true, colspan: 3, bg: 'BFDBFE' })}
      ${cell('Đúng - Sai (Ý)', { bold: true, colspan: 3, bg: 'BFDBFE' })}
      ${config.hasTraLoiNgan ? cell('Trả lời ngắn (Ý)', { bold: true, colspan: 3, bg: 'BFDBFE' }) : ''}
    </tr>`;
    rows += `<tr>
      ${['B', 'H', 'VD', 'B', 'H', 'VD', ...(config.hasTraLoiNgan ? ['B', 'H', 'VD'] : [])].map(l => cell(l)).join('')}
      ${config.hasTuLuan ? ['B', 'H', 'VD'].map(l => cell(l)).join('') : ''}
      ${cell('B', { bg: 'FFEDD5' })}${cell('H', { bg: 'FFEDD5' })}${cell('VD', { bg: 'FFEDD5' })}
    </tr>`;

    // Dữ liệu từng chủ đề — TẤT CẢ 4 CỘT CUỐI TÍNH RIÊNG TẮNG ĐVKT
    const { getDvLevelCount, getDvTotalPoints, getDvLevelSummary } = h;

    matrix.forEach((topic, index) => {
        const dvList = topic.donViKienThuc || [];
        const dvCount = dvList.length;

        dvList.forEach((dv, dvIdx) => {
            const isFirst = dvIdx === 0;
            rows += '<tr>';
            if (isFirst) {
                rows += cell(index + 1, { align: 'center', rowspan: dvCount });
                rows += cell(topic.tenChuDe || '', { align: 'left', rowspan: dvCount });
            }
            rows += cell(dv.noiDung ? `- ${dv.noiDung}` : '', { align: 'left' });
            rows += cellWithDiem(dv.nhieuLuaChon?.biet || 0, 'biet', dv, 'nhieuLuaChon', '', examConfig.diemMoiCauP1);
            rows += cellWithDiem(dv.nhieuLuaChon?.hieu || 0, 'hieu', dv, 'nhieuLuaChon', '', examConfig.diemMoiCauP1);
            rows += cellWithDiem(dv.nhieuLuaChon?.vanDung || 0, 'vanDung', dv, 'nhieuLuaChon', '', examConfig.diemMoiCauP1);
            rows += cellWithDiem(dv.dungSai?.biet || 0, 'biet', dv, 'dungSai', ' ý', examConfig.diemMoiYP2);
            rows += cellWithDiem(dv.dungSai?.hieu || 0, 'hieu', dv, 'dungSai', ' ý', examConfig.diemMoiYP2);
            rows += cellWithDiem((Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0), 'vanDung', dv, 'dungSai', ' ý', examConfig.diemMoiYP2);
            if (config.hasTraLoiNgan) {
              rows += cellWithDiem(dv.traLoiNgan?.biet || 0, 'biet', dv, 'traLoiNgan', ' ý', examConfig.diemMoiYP3);
              rows += cellWithDiem(dv.traLoiNgan?.hieu || 0, 'hieu', dv, 'traLoiNgan', ' ý', examConfig.diemMoiYP3);
              rows += cellWithDiem(dv.traLoiNgan?.vanDung || 0, 'vanDung', dv, 'traLoiNgan', ' ý', examConfig.diemMoiYP3);
            }
            if (config.hasTuLuan) {
              const makeTlCell = (count, diem, level) => {
                const v = Number(count) || 0;
                if (v <= 0) return cell('');
                let content = `${v} ý`;
                const diemVal = Number(diem) || 0;
                if (diemVal > 0) content += `<br/><span style="font-size:10pt;">${diemVal}đ</span>`;
                if (config.showCompetencySymbol !== false) {
                  let ind = getIndicatorsForCell(dv, 'tuLuan', level);
                  if (!ind && isToanMon) ind = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
                  if (!ind) ind = getIndicatorForLevel(dv?.yeuCauCanDat, level);
                  if (ind) content += `<br/><span style="font-size:10pt;color:gray;">(${ind})</span>`;
                }
                return `<td style="border:1px solid black;text-align:center;vertical-align:top;">${content}</td>`;
              };
              rows += makeTlCell(dv.tuLuan?.biet, dv.tuLuan?.diemBiet, 'biet');
              rows += makeTlCell(dv.tuLuan?.hieu, dv.tuLuan?.diemHieu, 'hieu');
              rows += makeTlCell(
                (Number(dv.tuLuan?.vanDung) || 0) + (Number(dv.tuLuan?.vanDungCao) || 0),
                dv.tuLuan?.diemVanDung, 'vanDung'
              );
            }
            // 4 cột cuối: Tổng B, H, VD và Tỉ lệ % — tính riêng từng ĐVKT
            rows += cell(getDvLevelSummary(dv, 'biet'), { bold: true, bg: 'FFEDD5' });
            rows += cell(getDvLevelSummary(dv, 'hieu'), { bold: true, bg: 'FFEDD5' });
            rows += cell(getDvLevelSummary(dv, 'vanDung'), { bold: true, bg: 'FFEDD5' });
            const dvTotalPoints = getDvTotalPoints(dv);
            const dvPercent = ((dvTotalPoints / 10) * 100).toFixed(1).replace('.0', '') + '%';
            rows += cell(dvPercent, { bold: true });
            rows += '</tr>';
        });
    });

    // Dòng tổng
    rows += `<tr>
      ${cell('Tổng (Ý)', { bold: true, align: 'center', colspan: 3, bg: 'E2E8F0' })}
      ${cell(sumCount('nhieuLuaChon', 'biet'))}${cell(sumCount('nhieuLuaChon', 'hieu'))}${cell(sumCount('nhieuLuaChon', 'vanDung'))}
      ${cell(sumCount('dungSai', 'biet'))}${cell(sumCount('dungSai', 'hieu'))}${cell(sumCount('dungSai', 'vanDung') + sumCount('dungSai', 'vanDungCao'))}
      ${config.hasTraLoiNgan ? cell(sumCount('traLoiNgan', 'biet')) + cell(sumCount('traLoiNgan', 'hieu')) + cell(sumCount('traLoiNgan', 'vanDung')) : ''}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet')) + cell(sumCount('tuLuan', 'hieu')) + cell(sumCount('tuLuan', 'vanDung')) : ''}
      ${cell(getLevelTotalItems('biet'), { bold: true, align: 'center' })}${cell(getLevelTotalItems('hieu'), { bold: true, align: 'center' })}${cell(getLevelTotalItems('vanDung'), { bold: true, align: 'center' })}
      ${cell('')}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng số câu', { bold: true, align: 'center', colspan: 3, bg: 'F1F5F9' })}
      ${cell(sumCount('nhieuLuaChon', 'biet'), { align: 'center' })}${cell(sumCount('nhieuLuaChon', 'hieu'), { align: 'center' })}${cell(sumCount('nhieuLuaChon', 'vanDung'), { align: 'center' })}
      ${cell((() => { const y = sumCount('dungSai', 'biet'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}${cell((() => { const y = sumCount('dungSai', 'hieu'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}${cell((() => { const y = sumCount('dungSai', 'vanDung') + sumCount('dungSai', 'vanDungCao'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}
      ${config.hasTraLoiNgan ? cell(sumCount('traLoiNgan', 'biet'), { align: 'center' }) + cell(sumCount('traLoiNgan', 'hieu'), { align: 'center' }) + cell(sumCount('traLoiNgan', 'vanDung'), { align: 'center' }) : ''}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet'), { align: 'center' }) + cell(sumCount('tuLuan', 'hieu'), { align: 'center' }) + cell(sumCount('tuLuan', 'vanDung'), { align: 'center' }) : ''}
      ${cell((() => { const c2 = sumCount('nhieuLuaChon', 'biet'); const y2 = sumCount('dungSai', 'biet') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'biet') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}${cell((() => { const c2 = sumCount('nhieuLuaChon', 'hieu'); const y2 = sumCount('dungSai', 'hieu') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'hieu') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}${cell((() => { const c2 = sumCount('nhieuLuaChon', 'vanDung'); const y2 = sumCount('dungSai', 'vanDung') + sumCount('dungSai', 'vanDungCao') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'vanDung') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}
      ${cell(getLevelTotalQuestions('biet') + getLevelTotalQuestions('hieu') + getLevelTotalQuestions('vanDung'), { bold: true, align: 'center' })}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng điểm', { bold: true, align: 'center', colspan: 3, bg: 'CBD5E1' })}
      ${cell(getColumnTotalPoints('nhieuLuaChon'), { bold: true, align: 'center', colspan: 3 })}
      ${cell(getColumnTotalPoints('dungSai'), { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTraLoiNgan ? cell(getColumnTotalPoints('traLoiNgan'), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${config.hasTuLuan ? cell(getColumnTotalPoints('tuLuan'), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${cell(getLevelTotalPoints('biet'), { bold: true, align: 'center' })}${cell(getLevelTotalPoints('hieu'), { bold: true, align: 'center' })}${cell(getLevelTotalPoints('vanDung'), { bold: true, align: 'center' })}
      ${cell(getGrandTotalPoints(), { bold: true, align: 'center' })}
    </tr>`;
    rows += `<tr>
      ${cell('Tỉ lệ %', { bold: true, align: 'center', colspan: 3, bg: 'E2E8F0' })}
      ${cell(pct(getColumnTotalPoints('nhieuLuaChon')), { bold: true, align: 'center', colspan: 3 })}
      ${cell(pct(getColumnTotalPoints('dungSai')), { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTraLoiNgan ? cell(pct(getColumnTotalPoints('traLoiNgan')), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${config.hasTuLuan ? cell(pct(getColumnTotalPoints('tuLuan')), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${cell(pct(getLevelTotalPoints('biet')), { bold: true, align: 'center' })}${cell(pct(getLevelTotalPoints('hieu')), { bold: true, align: 'center' })}${cell(pct(getLevelTotalPoints('vanDung')), { bold: true, align: 'center' })}
      ${cell(pct(getGrandTotalPoints()), { bold: true, align: 'center' })}
    </tr>`;

    return `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">${rows}</table>`;
};

const isNewMathStructure = (ec, c) => {
    return (Number(ec?.tongDiemP1) === 4) && 
           (Number(ec?.tongDiemP2) === 2) && 
           (Number(ec?.tongDiemP3) === 0) && 
           c?.hasTuLuan;
};

// ==========================================
// 5. XUẤT BẢNG ĐẶC TẢ DẠNG HTML
// ==========================================
const buildSpecTable = (matrix, config, examConfig, examHeader) => {
    if (isNewMathStructure(examConfig, config)) {
        return buildNewMathSpecTable(matrix, config, examConfig, examHeader);
    }

    const h = buildMatrixHelpers(matrix, config, examConfig, examHeader);
    const { sumCount, getColumnTotalPoints, getLevelTotalPoints, getLevelTotalQuestions, pct, fmtNLC, fmtY, getIndicatorsForCell, isToanMon, getMathIndicatorForLevel, getIndicatorForLevel } = h;

    // === TÍNH MAP CÂU SỐ TRONG KHUNG ĐỀ CHO TỪNG Ô ===
    const qMap = {};
    const isCont = config.isContinuousNumbering;
    // Phase 1: NLC
    let nlcC = 1;
    matrix.forEach((t, ti) => {
        (t.donViKienThuc || []).forEach((dv, di) => {
            ['biet','hieu','vanDung'].forEach(lvl => {
                const n = Number(dv.nhieuLuaChon?.[lvl]) || 0;
                if (n > 0) { qMap[`${ti}_${di}_nlc_${lvl}`] = { s: nlcC, e: nlcC + n - 1 }; nlcC += n; }
            });
        });
    });
    const totalNLC = nlcC - 1;
    // Phase 2: ĐS (4 ý = 1 câu)
    let dsYC = 0;
    const dsCauStart = isCont ? totalNLC + 1 : 1;
    matrix.forEach((t, ti) => {
        (t.donViKienThuc || []).forEach((dv, di) => {
            ['biet','hieu','vanDung'].forEach(lvl => {
                const n = Number(dv.dungSai?.[lvl]) || 0;
                if (n > 0) {
                    const sc = Math.floor(dsYC / 4) + dsCauStart;
                    const ec = Math.floor((dsYC + n - 1) / 4) + dsCauStart;
                    qMap[`${ti}_${di}_ds_${lvl}`] = { s: sc, e: ec };
                    dsYC += n;
                }
            });
        });
    });
    const totalDSCau = Math.ceil(dsYC / 4);
    // Phase 3: TLN
    if (config.hasTraLoiNgan) {
        let tlnC = isCont ? dsCauStart + totalDSCau : 1;
        matrix.forEach((t, ti) => {
            (t.donViKienThuc || []).forEach((dv, di) => {
                ['biet','hieu','vanDung'].forEach(lvl => {
                    const n = Number(dv.traLoiNgan?.[lvl]) || 0;
                    if (n > 0) { qMap[`${ti}_${di}_tln_${lvl}`] = { s: tlnC, e: tlnC + n - 1 }; tlnC += n; }
                });
            });
        });
    }
    // Phase 4: TL
    if (config.hasTuLuan) {
        const totalTLN = config.hasTraLoiNgan ? sumCount('traLoiNgan','biet') + sumCount('traLoiNgan','hieu') + sumCount('traLoiNgan','vanDung') : 0;
        let tlC = isCont ? (dsCauStart + totalDSCau + totalTLN) : 1;
        if (!isCont) tlC = 1;
        matrix.forEach((t, ti) => {
            (t.donViKienThuc || []).forEach((dv, di) => {
                ['biet','hieu','vanDung'].forEach(lvl => {
                    const n = Number(dv.tuLuan?.[lvl]) || 0;
                    if (n > 0) { qMap[`${ti}_${di}_tl_${lvl}`] = { s: tlC, e: tlC + n - 1 }; tlC += n; }
                });
            });
        });
    }
    // Helper: format câu số dưới giá trị
    const fmtQ = (key) => {
        const q = qMap[key];
        if (!q) return '';
        const label = q.s === q.e ? `Câu ${q.s}` : `Câu ${q.s}-${q.e}`;
        return `<br/><span style="font-size:9pt;color:#555;">${label}</span>`;
    };
    // Override fmtNLC/fmtY để ghi thêm câu số + mã năng lực chuyên môn
    const fmtNLC_Q = (val, level, ti, di, dv) => {
        const base = fmtNLC(val, level, dv, 'nhieuLuaChon');
        if (base === 0) return 0;
        return `${base}${fmtQ(`${ti}_${di}_nlc_${level}`)}`;
    };
    const fmtY_DS = (val, level, ti, di, dv) => {
        const base = fmtY(val, level, dv, 'dungSai');
        if (base === 0) return 0;
        return `${base}${fmtQ(`${ti}_${di}_ds_${level}`)}`;
    };
    const fmtY_TLN = (val, level, ti, di, dv) => {
        const base = fmtY(val, level, dv, 'traLoiNgan');
        if (base === 0) return 0;
        return `${base}${fmtQ(`${ti}_${di}_tln_${level}`)}`;
    };
    const fmtY_TL = (val, level, ti, di, dv) => {
        const base = fmtY(val, level, dv, 'tuLuan');
        if (base === 0) return 0;
        return `${base}${fmtQ(`${ti}_${di}_tl_${level}`)}`;
    };

    const cell = (content, opts = {}) => {
        const { bold = false, align = 'center', rowspan = 1, colspan = 1, bg = '' } = opts;
        const style = [
            'border:1px solid black', `text-align:${align}`, 'vertical-align:top',
            bg ? `background-color:#${bg}` : ''
        ].filter(Boolean).join(';');
        const val = (content === 0 || content === '0' || content === 0.0) ? '' : content;
        return `<td style="${style}"${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${colspan > 1 ? ` colspan="${colspan}"` : ''}>${bold ? `<b>${val ?? ''}</b>` : (val ?? '')}</td>`;
    };

    let rows = `
      <colgroup>
        <col style="width: 4.5%;" />
        <col style="width: 10.0%;" />
        <col style="width: 16.0%;" />
        <col style="width: 25.3%;" />
        ${config.hasTuLuan ? `
        <col style="width: 3.6%;" /><col style="width: 3.6%;" /><col style="width: 3.6%;" />
        <col style="width: 3.6%;" /><col style="width: 3.6%;" /><col style="width: 3.6%;" />
        <col style="width: 3.6%;" /><col style="width: 3.6%;" /><col style="width: 3.6%;" />
        <col style="width: 3.6%;" /><col style="width: 3.6%;" /><col style="width: 3.6%;" />
        ` : `
        <col style="width: 4.8%;" /><col style="width: 4.8%;" /><col style="width: 4.8%;" />
        <col style="width: 4.8%;" /><col style="width: 4.8%;" /><col style="width: 4.8%;" />
        <col style="width: 4.8%;" /><col style="width: 4.8%;" /><col style="width: 4.8%;" />
        `}
      </colgroup>
    `;

    // Header 4 dòng
    rows += `<tr>
      ${cell('TT', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Chủ đề/Chương', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Nội dung/Đơn vị KT', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
      ${cell('Yêu cầu cần đạt', { bold: true, rowspan: 4, bg: 'FEF08A' })}
      ${cell('Số câu hỏi ở các mức độ', { bold: true, colspan: config.hasTuLuan ? 12 : 9, bg: 'E2E8F0' })}
    </tr>`;
    rows += `<tr>
      ${cell('TNKQ', { bold: true, colspan: 9, bg: 'DBEAFE' })}
      ${config.hasTuLuan ? cell('Tự luận', { bold: true, colspan: 3, bg: 'DCFCE7' }) : ''}
    </tr>`;
    rows += `<tr>
      ${cell('Nhiều lựa chọn', { bold: true, colspan: 3, bg: 'BFDBFE' })}
      ${cell('Đúng - Sai (Ý)', { bold: true, colspan: 3, bg: 'BFDBFE' })}
      ${cell('Trả lời ngắn (Ý)', { bold: true, colspan: 3, bg: 'BFDBFE' })}
    </tr>`;
    rows += `<tr>
      ${['B', 'H', 'VD', 'B', 'H', 'VD', 'B', 'H', 'VD'].map(l => cell(l)).join('')}
      ${config.hasTuLuan ? ['B', 'H', 'VD'].map(l => cell(l)).join('') : ''}
    </tr>`;

    // Dữ liệu từng chủ đề — kèm mã năng lực (NT/TH/VD)
    matrix.forEach((topic, index) => {
        const dvList = topic.donViKienThuc || [];
        const dvCount = dvList.length;

        dvList.forEach((dv, dvIdx) => {
            const isFirst = dvIdx === 0;
            rows += '<tr>';
            if (isFirst) {
                rows += cell(index + 1, { align: 'center', rowspan: dvCount });
                rows += cell(topic.tenChuDe || '', { align: 'left', rowspan: dvCount });
            }
            rows += cell(dv.noiDung ? `- ${dv.noiDung}` : '', { align: 'left' });
            // Cột Yêu cầu cần đạt (render xuống dòng)
            const ycLines = (dv.yeuCauCanDat || '').split('\n').map(l => l.trim()).filter(Boolean).join('<br/>');
            rows += `<td style="border:1px solid black;text-align:left;vertical-align:top;">${ycLines}</td>`;
            // NLC kèm mã năng lực (NT/TH/VD hoặc HH1.x/TD1.x) + câu số
            rows += cell(fmtNLC_Q(dv.nhieuLuaChon?.biet, 'biet', index, dvIdx, dv));
            rows += cell(fmtNLC_Q(dv.nhieuLuaChon?.hieu, 'hieu', index, dvIdx, dv));
            rows += cell(fmtNLC_Q(dv.nhieuLuaChon?.vanDung, 'vanDung', index, dvIdx, dv));
            // ĐS kèm "ý" + mã năng lực + câu số
            rows += cell(fmtY_DS(dv.dungSai?.biet, 'biet', index, dvIdx, dv));
            rows += cell(fmtY_DS(dv.dungSai?.hieu, 'hieu', index, dvIdx, dv));
            rows += cell(fmtY_DS(dv.dungSai?.vanDung, 'vanDung', index, dvIdx, dv));
            // TLN kèm "ý" + mã năng lực + câu số
            rows += cell(config.hasTraLoiNgan ? fmtY_TLN(dv.traLoiNgan?.biet, 'biet', index, dvIdx, dv) : 0);
            rows += cell(config.hasTraLoiNgan ? fmtY_TLN(dv.traLoiNgan?.hieu, 'hieu', index, dvIdx, dv) : 0);
            rows += cell(config.hasTraLoiNgan ? fmtY_TLN(dv.traLoiNgan?.vanDung, 'vanDung', index, dvIdx, dv) : 0);
            
            if (config.hasTuLuan) {
              // TL kèm "ý" + mã năng lực + câu số
              rows += cell(fmtY_TL(dv.tuLuan?.biet, 'biet', index, dvIdx, dv));
              rows += cell(fmtY_TL(dv.tuLuan?.hieu, 'hieu', index, dvIdx, dv));
              rows += cell(fmtY_TL(dv.tuLuan?.vanDung, 'vanDung', index, dvIdx, dv));
            }
            rows += '</tr>';
        });
    });

    // Dòng tổng
    rows += `<tr>
      ${cell('Tổng (Ý)', { bold: true, align: 'center', colspan: 4, bg: 'E2E8F0' })}
      ${cell(sumCount('nhieuLuaChon', 'biet'))}${cell(sumCount('nhieuLuaChon', 'hieu'))}${cell(sumCount('nhieuLuaChon', 'vanDung'))}
      ${cell(sumCount('dungSai', 'biet'))}${cell(sumCount('dungSai', 'hieu'))}${cell(sumCount('dungSai', 'vanDung'))}
      ${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet')) + cell(sumCount('tuLuan', 'hieu')) + cell(sumCount('tuLuan', 'vanDung')) : ''}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng số câu', { bold: true, align: 'center', colspan: 4, bg: 'F1F5F9' })}
      ${cell(sumCount('nhieuLuaChon', 'biet'))}${cell(sumCount('nhieuLuaChon', 'hieu'))}${cell(sumCount('nhieuLuaChon', 'vanDung'))}
      ${cell(sumCount('dungSai', 'biet') * 0.25)}${cell(sumCount('dungSai', 'hieu') * 0.25)}${cell(sumCount('dungSai', 'vanDung') * 0.25)}
      ${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet')) + cell(sumCount('tuLuan', 'hieu')) + cell(sumCount('tuLuan', 'vanDung')) : ''}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng điểm', { bold: true, align: 'center', colspan: 4, bg: 'CBD5E1' })}
      ${cell(getColumnTotalPoints('nhieuLuaChon'), { bold: true, align: 'center', colspan: 3 })}
      ${cell(getColumnTotalPoints('dungSai'), { bold: true, align: 'center', colspan: 3 })}
      ${cell(config.hasTraLoiNgan ? getColumnTotalPoints('traLoiNgan') : 0, { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTuLuan ? cell(getColumnTotalPoints('tuLuan'), { bold: true, align: 'center', colspan: 3 }) : ''}
    </tr>`;
    rows += `<tr>
      ${cell('Tỉ lệ %', { bold: true, align: 'center', colspan: 4, bg: 'E2E8F0' })}
      ${cell(pct(getColumnTotalPoints('nhieuLuaChon')), { bold: true, align: 'center', colspan: 3 })}
      ${cell(pct(getColumnTotalPoints('dungSai')), { bold: true, align: 'center', colspan: 3 })}
      ${cell(config.hasTraLoiNgan ? pct(getColumnTotalPoints('traLoiNgan')) : '0%', { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTuLuan ? cell(pct(getColumnTotalPoints('tuLuan')), { bold: true, align: 'center', colspan: 3 }) : ''}
    </tr>`;

    return `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">${rows}</table>`;
};

// ==========================================
// 6. HÀM XUẤT WORD CHÍNH
// ==========================================
export const exportToWordMath = async ({ latexMode = false } = {}) => {
    // Gán lại module-level formatter để tất cả helper (parseLine, cleanAns, ...) đều dùng đúng chế độ
    formatTextWithMath = latexMode ? _formatTextLatex : _formatTextMathML;

    const { matrix, config, examConfig, examHeader, examSlots, generatedExam } = useExamStore.getState();

    const hasTuLuan = config.hasTuLuan !== false;
    const hasTraLoiNgan = config.hasTraLoiNgan !== false;

    const p1_pt = parseFloat(examConfig.diemMoiCauP1 || 0.25);
    const p2_pt = parseFloat(examConfig.diemMoiYP2 || 0.25);
    const p3_pt = parseFloat(examConfig.diemMoiYP3 || 0.25);
    const isMinistry = config.exportTemplate === 'ministry';

    // Phân loại câu hỏi theo phần
    const questions = [], dung_sai = [], tra_loi_ngan = [], tu_luan = [];
    const sortedKeys = Object.keys(examSlots).sort((a, b) => {
        const numA = parseInt(a.split('_')[1].replace(/\D/g, '')) || 0;
        const numB = parseInt(b.split('_')[1].replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    sortedKeys.forEach(k => {
        const v = examSlots[k];
        if (!v) return;
        const loai = v.loaiCauHoi;
        if (loai === 1 || k.startsWith('phan1_')) questions.push(v);
        else if (loai === 2 || k.startsWith('phan2_')) dung_sai.push(v);
        else if (loai === 4 || k.startsWith('phan4_') || (!hasTraLoiNgan && k.startsWith('phan3_'))) tu_luan.push(v);
        else if (loai === 3 || k.startsWith('phan3_')) tra_loi_ngan.push(v);
    });

    // Hàm tính tổng ý theo loại
    const getTotalY = (typeKey) => {
        let total = 0;
        matrix.forEach(t => {
            (t.donViKienThuc || []).forEach(dv => {
                ['biet', 'hieu', 'vanDung'].forEach(lvl => {
                    total += Number(dv[typeKey]?.[lvl]) || 0;
                });
            });
        });
        return total;
    };

    // Tính số câu TL theo logic nhóm ĐVKT, tối đa 2 ý/câu (đồng bộ Step4)
    const computeTLCauCount = () => {
        const items = [];
        matrix.forEach(t => {
            (t.donViKienThuc || []).forEach(dv => {
                ['biet', 'hieu', 'vanDung'].forEach(lvl => {
                    const count = Number(dv.tuLuan?.[lvl]) || 0;
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
    };

    const cleanText = (str) => {
        if (!str) return '';
        let s = str;
        s = s.replace(/\s*\[.*?\]\s*/g, '');
        s = s.replace(/\s*\*{0,2}\s*(?:Đáp án đúng|Đáp án|Trả lời|Giải thích|Hướng dẫn giải|Hướng dẫn chấm)\s*[:.)]*\s*\*{0,2}\s*[\s\S]*$/i, '');
        s = s.replace(/\*\*/g, '');
        return s.trim();
    };

    // ==================== BẮT ĐẦU KHỐI HTML ====================
    let html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <style>
    @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 1cm; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Times New Roman', serif; font-size: 14pt; }
    p { margin: 0; padding: 0; margin-bottom: 4pt; line-height: 1.2; }
    h2, h3 { margin: 10pt 0; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; mso-cellspacing: 0; mso-padding-alt: 0; }
    th, td { border: 1px solid black; padding: 2px 4px; vertical-align: top; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .bg-gray { background-color: #E2E8F0; }
    .no-border td, .no-border th { border: none !important; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
<div class="WordSection1">
`;

    // ==================== HEADER SỞ / TRƯỜNG ====================
    const tongSoCauHeader = (() => {
      let total = getTotalY('nhieuLuaChon');
      total += Math.ceil(getTotalY('dungSai') / 4);
      if (hasTraLoiNgan) total += getTotalY('traLoiNgan');
      total += computeTLCauCount();
      return total;
    })();

    const cleanMonHoc = (examHeader.monHoc || "").replace(/^Môn\s*:\s*|^Môn\s+/i, '').trim().toUpperCase();
    const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\s*:\s*|làm bài\s*:\s*)/i, '').trim();
    const soTrangHeader = Math.max(2, Math.ceil(tongSoCauHeader / 10));

    if (isMinistry) {
      html += `
<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 6pt;">
  <tr>
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;"><u>${examHeader.truong || ""}</u></div>
      <div style="font-size:13pt;font-style:italic;margin-top:4pt;">(Đề thi gồm ${String(soTrangHeader).padStart(2, '0')} trang)</div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.kyThi || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">Môn: ${cleanMonHoc}</div>
      <div style="font-size:13pt;font-style:italic;">Thời gian làm bài: ${cleanThoiGian}, không kể thời gian phát đề</div>
    </td>
  </tr>
</table>
`;
    } else {
      html += `
<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 6pt;">
  <tr>
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">${examHeader.truong || ""}</div>
      <div style="font-size:14pt;font-weight:bold;margin-top:6pt;"><u>Mã đề: 01</u></div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.kyThi || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">${examHeader.namHoc || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">MÔN: ${cleanMonHoc}</div>
      <div style="font-size:14pt;font-style:italic;">Thời gian: ${examHeader.thoiGian || ""}</div>
      <div style="font-size:13pt;font-style:italic;">(Đề kiểm tra gồm ${tongSoCauHeader} câu, 0${Math.ceil(tongSoCauHeader / 10)} trang)</div>
    </td>
  </tr>
</table>
`;
    }

    // ==================== 1. MA TRẬN ĐỀ KIỂM TRA ====================
    html += `<h2 style="text-align:center;font-size:16pt;">1. MA TRẬN ĐỀ KIỂM TRA</h2>`;
    html += buildMatrixTable(matrix, config, examConfig, examHeader);

    // ==================== 2. BẢN ĐẶC TẢ ====================
    html += `<h2 style="text-align:center;font-size:16pt;">2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA</h2>`;
    html += buildSpecTable(matrix, config, examConfig, examHeader);

    if (config.showCompetencySymbol !== false) {
    // ==================== HƯỚNG DẪN MÃ HÓA NĂNG LỰC ====================
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">HƯỚNG DẪN MÃ HÓA NĂNG LỰC</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Mã</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Ý nghĩa</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Mô tả</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">NT</td>
        <td style="border:1px solid black;text-align:left;">Nhận thức (Nhận biết)</td>
        <td style="border:1px solid black;text-align:left;">Nhận biết, nhớ lại kiến thức đã học; nhận diện khái niệm, công thức, định nghĩa.</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">TH</td>
        <td style="border:1px solid black;text-align:left;">Thông hiểu</td>
        <td style="border:1px solid black;text-align:left;">Hiểu bản chất, giải thích, so sánh, phân tích; vận dụng kiến thức vào tình huống quen thuộc.</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">VD</td>
        <td style="border:1px solid black;text-align:left;">Vận dụng</td>
        <td style="border:1px solid black;text-align:left;">Vận dụng kiến thức, kĩ năng vào bối cảnh mới, tình huống thực tiễn; giải quyết vấn đề phức hợp, liên môn.</td>
      </tr>
    </table>`;

    // ==================== BẢNG CHỈ BÁO NĂNG LỰC HÓA HỌC (NẾU MÔN HÓA) ====================
    const isHoaMonExport = /hóa|hoá/i.test(examHeader?.monHoc || '');
    if (isHoaMonExport) {
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">BẢNG MÃ CHỈ BÁO NĂNG LỰC MÔN HÓA HỌC</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;width:10%;">Mã chỉ báo</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Nội dung</td>
      </tr>
      <tr style="background-color:#DBEAFE;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">I. Nhận thức hóa học (Mã HH1)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.1</td><td style="border:1px solid black;text-align:left;">Nhận biết và nêu được tên của các đối tượng, sự kiện, khái niệm hoặc quá trình hóa học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.2</td><td style="border:1px solid black;text-align:left;">Trình bày được sự kiện, đặc điểm, vai trò của các đối tượng, khái niệm hoặc quá trình hóa học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.3</td><td style="border:1px solid black;text-align:left;">Mô tả được đối tượng bằng các hình thức nói, viết, công thức, sơ đồ, biểu đồ, bảng.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.4</td><td style="border:1px solid black;text-align:left;">So sánh, phân loại, lựa chọn được các đối tượng, khái niệm hoặc quá trình hóa học theo các tiêu chí khác nhau.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.5</td><td style="border:1px solid black;text-align:left;">Phân tích được các khía cạnh của các đối tượng, khái niệm hoặc quá trình hóa học theo logic nhất định.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.6</td><td style="border:1px solid black;text-align:left;">Giải thích và lập luận được về mối quan hệ giữa các đối tượng, khái niệm hoặc quá trình hóa học (cấu tạo-tính chất, nguyên nhân-kết quả,...).</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.7</td><td style="border:1px solid black;text-align:left;">Tìm được từ khóa, sử dụng được thuật ngữ khoa học, kết nối được thông tin theo logic có ý nghĩa, lập được dàn ý khi đọc và trình bày các văn bản khoa học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH1.8</td><td style="border:1px solid black;text-align:left;">Thảo luận, đưa ra được những nhận định phê phán có liên quan đến chủ đề.</td></tr>
      <tr style="background-color:#DCFCE7;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">II. Tìm hiểu thế giới tự nhiên dưới góc độ hóa học (Mã HH2)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH2.1</td><td style="border:1px solid black;text-align:left;">Đề xuất vấn đề: nhận ra và đặt được câu hỏi liên quan đến vấn đề; phân tích được bối cảnh để đề xuất vấn đề; biểu đạt được vấn đề.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH2.2</td><td style="border:1px solid black;text-align:left;">Đưa ra phán đoán và xây dựng giả thuyết: phân tích được vấn đề để nêu được phán đoán; xây dựng và phát biểu được giả thuyết nghiên cứu.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH2.3</td><td style="border:1px solid black;text-align:left;">Lập kế hoạch thực hiện: xây dựng được khung logic nội dung tìm hiểu; lựa chọn được phương pháp thích hợp; lập được kế hoạch triển khai tìm hiểu.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH2.4</td><td style="border:1px solid black;text-align:left;">Thực hiện kế hoạch: thu thập được sự kiện và chứng cứ; phân tích được dữ liệu nhằm chứng minh hay bác bỏ giả thuyết; rút ra được kết luận.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH2.5</td><td style="border:1px solid black;text-align:left;">Viết, trình bày báo cáo và thảo luận: sử dụng được ngôn ngữ, hình vẽ, sơ đồ, biểu bảng để biểu đạt quá trình và kết quả tìm hiểu.</td></tr>
      <tr style="background-color:#FEF3C7;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">III. Vận dụng kiến thức, kĩ năng đã học (Mã HH3)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH3.1</td><td style="border:1px solid black;text-align:left;">Vận dụng được kiến thức hóa học để phát hiện, giải thích được một số hiện tượng tự nhiên, ứng dụng của hóa học trong cuộc sống.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH3.2</td><td style="border:1px solid black;text-align:left;">Vận dụng được kiến thức hóa học để phản biện, đánh giá ảnh hưởng của một vấn đề thực tiễn.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH3.3</td><td style="border:1px solid black;text-align:left;">Vận dụng được kiến thức tổng hợp để đánh giá ảnh hưởng của một vấn đề thực tiễn và đề xuất một số phương pháp, biện pháp, mô hình, kế hoạch giải quyết vấn đề.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH3.4</td><td style="border:1px solid black;text-align:left;">Định hướng được ngành, nghề sẽ chọn sau khi thi tốt nghiệp trung học phổ thông.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">HH3.5</td><td style="border:1px solid black;text-align:left;">Ứng xử thích hợp trong các tình huống có liên quan đến bản thân, gia đình và cộng đồng phù hợp với yêu cầu phát triển bền vững xã hội và bảo vệ môi trường.</td></tr>
    </table>`;
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">ĐỘNG TỪ MÔ TẢ CẤP ĐỘ TƯ DUY TRONG MÔN HÓA HỌC</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Mức độ</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Động từ mô tả</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">1. Biết<br/>(Nhận biết)</td>
        <td style="border:1px solid black;text-align:left;">Gọi được tên, viết được, biểu diễn được, lập được (công thức hóa học, cấu hình electron,...), phát biểu được, phân biệt được, nêu được nội dung định luật/thuyết/khái niệm. Xác định được khối lượng mol, công thức hóa học. Tìm kiếm, tra cứu được thông tin trong bảng tuần hoàn, bảng tính tan, bảng enthalpy,...</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">2. Hiểu<br/>(Thông hiểu)</td>
        <td style="border:1px solid black;text-align:left;">Trình bày được tính chất hóa học bằng ngôn ngữ cá nhân. Mô tả, nhận xét được thí nghiệm, giải thích được hiện tượng. Thực hiện được thí nghiệm, quan sát và rút ra kết luận. Phân tích được vấn đề dựa trên lí lẽ, lập luận. Phân loại được các loại chất. So sánh được đặc điểm giống/khác nhau. Dự đoán, giải thích được tính chất dựa vào cấu tạo, viết được phương trình hóa học chứng minh.</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">3. Vận dụng</td>
        <td style="border:1px solid black;text-align:left;">Vận dụng được kiến thức để giải thích, tính toán trong tình huống tương tự và tình huống mới. Đặt câu hỏi, phát hiện được hiện tượng thực tiễn và giải thích bằng kiến thức hóa học. Đề xuất được phương án thí nghiệm giải quyết tình huống thực tiễn. Phân tích được mối liên hệ giữa các đại lượng để giải quyết bài toán thực tiễn. Đề xuất được ý kiến phản biện, viết được báo cáo ngắn. Thuyết trình, thiết kế poster, xây dựng hồ sơ tư liệu, lập kế hoạch dự án học tập hoặc STEM.</td>
      </tr>
    </table>`;
    }

    // ==================== BẢNG CHỈ BÁO NĂNG LỰC TOÁN HỌC (NẾU MÔN TOÁN) ====================
    const isToanMonExport = /toán|toan/i.test(examHeader?.monHoc || '');
    if (isToanMonExport) {
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">BẢNG MÃ CHỈ BÁO NĂNG LỰC MÔN TOÁN</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;width:10%;">Mã chỉ báo</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Nội dung</td>
      </tr>
      <tr style="background-color:#DBEAFE;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">I. Tư duy và Lập luận Toán học (Mã TD)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD1.1</td><td style="border:1px solid black;text-align:left;">Nhận biết được đối tượng, khái niệm, công thức Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD1.2</td><td style="border:1px solid black;text-align:left;">Nêu được định lí, giả thiết, kết luận; chứng minh được mệnh đề Toán học đơn giản.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD1.3</td><td style="border:1px solid black;text-align:left;">Lập luận được, suy diễn được trong quá trình giải Toán.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD2.1</td><td style="border:1px solid black;text-align:left;">Trình bày và giải thích được các tính chất, khái niệm Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD2.2</td><td style="border:1px solid black;text-align:left;">Vận dụng khái niệm, công thức để giải quyết vấn đề Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD3.1</td><td style="border:1px solid black;text-align:left;">Sử dụng công cụ Toán học để khảo sát, phân tích đối tượng.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">TD3.2</td><td style="border:1px solid black;text-align:left;">Lập luận và vận dụng Toán học để giải quyết bài toán phức tạp.</td></tr>
      <tr style="background-color:#DCFCE7;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">II. Giải quyết vấn đề Toán học (Mã GQ)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ1.1</td><td style="border:1px solid black;text-align:left;">Nhận biết và phát biểu được vấn đề từ tình huống thực tiễn.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ1.2</td><td style="border:1px solid black;text-align:left;">Đề xuất được cách giải quyết vấn đề trong tình huống quen thuộc.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ2.1</td><td style="border:1px solid black;text-align:left;">Phân tích tình huống, lựa chọn công cụ Toán học để giải quyết.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ2.2</td><td style="border:1px solid black;text-align:left;">Vận dụng được Toán học để giải quyết bài toán thực tiễn.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ3.1</td><td style="border:1px solid black;text-align:left;">Giải quyết được vấn đề trong tình huống tương đối phức tạp.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ3.2</td><td style="border:1px solid black;text-align:left;">Đánh giá được giải pháp đã đề xuất.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ4.1</td><td style="border:1px solid black;text-align:left;">Phối hợp nhiều công cụ Toán học để giải quyết vấn đề phức tạp.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ4.2</td><td style="border:1px solid black;text-align:left;">Đề xuất giải pháp cải tiến sau khi đánh giá.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GQ4.3</td><td style="border:1px solid black;text-align:left;">Giải quyết vấn đề trong tình huống mới, không quen thuộc.</td></tr>
      <tr style="background-color:#FEF3C7;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">III. Mô hình hoá Toán học (Mã MH)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH1.1</td><td style="border:1px solid black;text-align:left;">Mô hình hoá được tình huống thực tiễn đơn giản bằng Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH1.2</td><td style="border:1px solid black;text-align:left;">Sử dụng mô hình Toán học để giải quyết bài toán đo đạc thực tế.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH2.1</td><td style="border:1px solid black;text-align:left;">Mô hình hoá bài toán đếm, xác suất từ tình huống thực tế.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH2.2</td><td style="border:1px solid black;text-align:left;">Mô hình hoá được bài toán tối ưu bằng công cụ Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH3.1</td><td style="border:1px solid black;text-align:left;">Xây dựng mô hình Toán học (tích phân, phương trình) cho bài toán thực tế.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">MH3.2</td><td style="border:1px solid black;text-align:left;">Mô hình hoá bài toán tăng trưởng, phân rã bằng hàm số.</td></tr>
      <tr style="background-color:#F3E8FF;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">IV. Giao tiếp Toán học (Mã GT)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT1.1</td><td style="border:1px solid black;text-align:left;">Sử dụng được ngôn ngữ, ký hiệu Toán học để diễn đạt ý tưởng.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT1.2</td><td style="border:1px solid black;text-align:left;">Trình bày được ý nghĩa của đồ thị, bảng số liệu bằng ngôn ngữ nói/viết.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT2.1</td><td style="border:1px solid black;text-align:left;">Trình bày quá trình giải Toán bằng lập luận rõ ràng.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT2.2</td><td style="border:1px solid black;text-align:left;">Sử dụng biểu đồ, bảng để trình bày kết quả phân tích.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT3.1</td><td style="border:1px solid black;text-align:left;">Diễn đạt được ý nghĩa hình học, vật lí bằng ngôn ngữ Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT3.2</td><td style="border:1px solid black;text-align:left;">Trình bày mối liên hệ giữa các đối tượng Toán học.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">GT4</td><td style="border:1px solid black;text-align:left;">Sử dụng linh hoạt ngôn ngữ Toán học để trình bày, lập luận, bảo vệ ý tưởng.</td></tr>
      <tr style="background-color:#FFE4E6;"><td colspan="2" style="border:1px solid black;text-align:left;font-weight:bold;">V. Công cụ và Phương tiện Toán học (Mã CC)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">CC1.1</td><td style="border:1px solid black;text-align:left;">Sử dụng được máy tính cầm tay để tính toán, vẽ đồ thị.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">CC1.2</td><td style="border:1px solid black;text-align:left;">Sử dụng phần mềm Toán học để minh hoạ, khám phá.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">CC2.1</td><td style="border:1px solid black;text-align:left;">Sử dụng công cụ tính toán để hỗ trợ giải bài toán.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">CC2.2</td><td style="border:1px solid black;text-align:left;">Sử dụng bảng tính để xử lý dữ liệu thống kê, xác suất.</td></tr>
      <tr><td style="border:1px solid black;text-align:center;font-weight:bold;">CC3.1</td><td style="border:1px solid black;text-align:left;">Sử dụng thành thạo công cụ Toán học cho bài toán phức tạp.</td></tr>
    </table>`;
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">ĐỘNG TỪ MÔ TẢ CẤP ĐỘ TƯ DUY TRONG MÔN TOÁN</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Mức độ</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Động từ mô tả</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">1. Biết<br/>(Nhận biết)</td>
        <td style="border:1px solid black;text-align:left;">Nhận biết, nhận dạng, gọi tên, nêu được khái niệm, định nghĩa, định lí. Đọc và viết được ký hiệu toán học. Xác định được đối tượng, điều kiện. Liệt kê được các phần tử, tính chất. Biểu diễn được tập hợp, số, công thức. Vẽ được hình, đồ thị cơ bản.</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">2. Hiểu<br/>(Thông hiểu)</td>
        <td style="border:1px solid black;text-align:left;">Trình bày, giải thích được khái niệm, định lí, tính chất. Chứng minh được mệnh đề toán học đơn giản. So sánh, phân loại được đối tượng. Mô tả được mối quan hệ, xu hướng biến đổi. Lựa chọn được phương pháp giải phù hợp. Diễn đạt được ý nghĩa, bản chất của vấn đề.</td>
      </tr>
      <tr>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">3. Vận dụng</td>
        <td style="border:1px solid black;text-align:left;">Vận dụng được kiến thức để giải phương trình, bất phương trình, bài toán thực tiễn. Lập luận, suy diễn trong chứng minh và giải toán. Mô hình hoá tình huống thực tế bằng ngôn ngữ toán học. Giải quyết được vấn đề trong bối cảnh mới. Đánh giá, phản biện được lời giải. Sử dụng công cụ (máy tính, phần mềm) hỗ trợ giải toán và khám phá.</td>
      </tr>
    </table>`;
    }

    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">Bảng quy ước mã hóa năng lực theo nhóm môn</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">
      <tr style="background-color:#E2E8F0;">
        <td style="border:1px solid black;text-align:center;font-weight:bold;">STT</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Nhóm môn</td>
        <td style="border:1px solid black;text-align:center;font-weight:bold;">Mã gợi ý</td>
      </tr>
      <tr><td style="border:1px solid black;text-align:center;">1</td><td style="border:1px solid black;text-align:left;">KHTN (Vật lí, Hóa học, Sinh học)</td><td style="border:1px solid black;text-align:left;">NT – Nhận thức khoa học (trình bày, nhận biết khái niệm/định luật)<br/>TH – Tìm hiểu tự nhiên (quan sát, làm thí nghiệm, đề xuất giả thuyết)<br/>VD – Vận dụng kiến thức, kĩ năng (giải quyết vấn đề thực tiễn)</td></tr>
      <tr><td style="border:1px solid black;text-align:center;">2</td><td style="border:1px solid black;text-align:left;">Toán học</td><td style="border:1px solid black;text-align:left;">TD – Tư duy và lập luận toán học<br/>GQVĐ – Giải quyết vấn đề toán học<br/>MH – Mô hình hóa toán học<br/>GT – Giao tiếp toán học<br/>CC – Sử dụng công cụ, phương tiện học toán</td></tr>
      <tr><td style="border:1px solid black;text-align:center;">3</td><td style="border:1px solid black;text-align:left;">Ngữ văn</td><td style="border:1px solid black;text-align:left;">Đ – Năng lực Đọc (đọc hiểu văn bản)<br/>V – Năng lực Viết<br/>N – Năng lực Nói<br/>Ng – Năng lực Nghe</td></tr>
      <tr><td style="border:1px solid black;text-align:center;">4</td><td style="border:1px solid black;text-align:left;">Lịch sử – Địa lí</td><td style="border:1px solid black;text-align:left;">Lịch sử: TK – Tìm hiểu lịch sử; NT – Nhận thức và tư duy lịch sử; VD – Vận dụng<br/>Địa lí: NT – Nhận thức khoa học địa lí; TH – Tìm hiểu địa lí; VD – Vận dụng</td></tr>
      <tr><td style="border:1px solid black;text-align:center;">5</td><td style="border:1px solid black;text-align:left;">Tin học – Công nghệ</td><td style="border:1px solid black;text-align:left;">Tin học: NLa, NLb, NLc, NLd, NLe (5 năng lực thành phần)<br/>Công nghệ: NT – Nhận thức CN; TK – Thiết kế kĩ thuật; SD – Sử dụng CN; ĐG – Đánh giá CN</td></tr>
    </table>`;
    html += `<p style="font-size:13pt;"><b>Lưu ý:</b> <i>Mã năng lực được ghi kèm theo số lượng câu hỏi/ý trong Bảng Đặc tả nhằm giúp giáo viên dễ dàng đối chiếu yêu cầu cần đạt với mức độ nhận thức tương ứng khi ra đề kiểm tra. Các mã viết tắt cụ thể theo từng môn được quy ước trong bảng trên.</i></p>`;
}

    // ==================== 3. ĐỀ THI (KHUNG / ĐỀ AI) ====================
    html += `<div class="page-break"></div>`;
    html += `<h2 style="text-align:center;font-size:16pt;">3. KHUNG ĐỀ KIỂM TRA</h2>`;

    if (generatedExam && generatedExam.trim() !== '') {
        const aiExam = generatedExam
            .replace(/### (.*?)(?:\n|$)/g, '<h3>$1</h3>\n')
            .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>\n')
            .replace(/# (.*?)(?:\n|$)/g, '<h1>$1</h1>\n');
        html += formatTextWithMath(aiExam);
    } else {
        html += `<h2 style="text-align:center;">ĐỀ KIỂM TRA</h2>`;
        if (isMinistry) {
            html += `<p style="font-size:14pt;margin-bottom:6pt;">Họ, tên thí sinh: ...........................................................................</p>`;
            html += `<p style="font-size:14pt;margin-bottom:18pt;">Số báo danh: ................................................................................</p>`;
        }

        // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐỀ THI)
        let globalQuestionIndex = 1;
        const isContinuous = config.isContinuousNumbering;

        // === LOGIC TIÊU ĐỀ PHẦN ĐỘNG THEO TỰ LUẬN ===
        const hasTuLuanMode = config.hasTuLuan;

        // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — BỎ QUA khi mẫu Bộ 2025
        if (hasTuLuanMode && !isMinistry) {
          html += `<p class="bold" style="font-size:14pt;">PHẦN I. TRẮC NGHIỆM</p>`;
        }

        // --- DẠNG 1 / PHẦN I: Nhiều lựa chọn ---
        if (questions.length > 0) {
            const totalMCQ = getTotalY('nhieuLuaChon');
            const diemP1Str = String(p1_pt).replace('.', ',');
            let d1Title = hasTuLuanMode
              ? "DẠNG 1. Câu hỏi trắc nghiệm nhiều phương án lựa chọn"
              : "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
            let d1Desc = "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:";
            if (isMinistry) {
              d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
              d1Desc = `Thí sinh trả lời từ câu 1 đến câu ${totalMCQ}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d1Title}</b> ${d1Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d1Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d1Desc}</p>`;
            }
        for (let i = 0; i < totalMCQ; i++) {
            const q = examSlots[`phan1_cau${i + 1}`];
            if (!q) continue;
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemP1Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            // Chèn hình Matplotlib nếu có
            if (q.hinhAnh) {
              const imgB64 = await fetchGraphBase64(q.hinhAnh);
              if (imgB64) html += graphImgHtml(imgB64);
            }
            const _cleanPA = (v) => String(v||'').replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, '');
            html += renderOptionsHtml(
                ensureDot(formatTextWithMath(_cleanPA(q.dapAnA))),
                ensureDot(formatTextWithMath(_cleanPA(q.dapAnB))),
                ensureDot(formatTextWithMath(_cleanPA(q.dapAnC))),
                ensureDot(formatTextWithMath(_cleanPA(q.dapAnD))),
                q.dapAnA, q.dapAnB, q.dapAnC, q.dapAnD
            );
        }
    } else {
        const totalMCQ = getTotalY('nhieuLuaChon');
        if (totalMCQ > 0) {
            const diemP1Str = String(p1_pt).replace('.', ',');
            let d1Title = hasTuLuanMode
              ? "DẠNG 1. Câu hỏi trắc nghiệm nhiều phương án lựa chọn"
              : "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
            let d1Desc = "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:";
            if (isMinistry) {
              d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
              const totalM = (typeof questions !== 'undefined' && questions.length > 0) ? questions.length : getTotalY('nhieuLuaChon');
              d1Desc = `Thí sinh trả lời từ câu 1 đến câu ${totalM}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d1Title}</b> ${d1Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d1Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d1Desc}</p>`;
            }
            for (let i = 0; i < totalMCQ; i++) {
                const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
                const slotData = examSlots[`phan1_cau${i + 1}`];
                if (slotData) {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemP1Str} điểm).`}</b> ${formatTextWithMath(cleanText(slotData.noiDung))}</p>`;
                    // Chèn hình Matplotlib nếu slot có hinhAnh
                    if (slotData.hinhAnh) {
                      const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                      if (imgB64) html += graphImgHtml(imgB64);
                    }
                    const _cleanPA2 = (v) => String(v||'').replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, '');
                    html += renderOptionsHtml(
                        ensureDot(formatTextWithMath(_cleanPA2(slotData.dapAnA))),
                        ensureDot(formatTextWithMath(_cleanPA2(slotData.dapAnB))),
                        ensureDot(formatTextWithMath(_cleanPA2(slotData.dapAnC))),
                        ensureDot(formatTextWithMath(_cleanPA2(slotData.dapAnD))),
                        slotData.dapAnA, slotData.dapAnB, slotData.dapAnC, slotData.dapAnD
                    );
                } else {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemP1Str} điểm).`}</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                }
            }
        }
    }

    // --- DẠNG 2 / PHẦN II: Đúng sai ---
    if (dung_sai.length > 0) {
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (!isContinuous) globalQuestionIndex = 1;
        const diemCauP2 = (4 * p2_pt);
        const diemCauP2Str = String(diemCauP2).replace('.', ',');
        let d2Title = hasTuLuanMode
              ? "DẠNG 2. Câu hỏi trắc nghiệm đúng/ sai"
              : "PHẦN II. Câu trắc nghiệm đúng sai";
            let d2Desc = "Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S) vào bài làm.";
            if (isMinistry) {
              d2Title = "PHẦN II. Câu trắc nghiệm đúng sai";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const endQ = startQ + soCauTF - 1;
              d2Desc = `Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d2Title}</b> ${d2Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d2Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d2Desc}</p>`;
            }
        for (let i = 0; i < soCauTF; i++) {
            const q = examSlots[`phan2_cau${i + 1}`];
            if (!q) continue;
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP2Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            // Chèn hình Matplotlib nếu có
            if (q.hinhAnh) {
              const imgB64 = await fetchGraphBase64(q.hinhAnh);
              if (imgB64) html += graphImgHtml(imgB64);
            }
            // Vẽ bảng Nhận định / Đ-S
            if (isMinistry) {
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += `<p style="margin-left:2em;">${p.label}. ${formatTextWithMath(p.y)}</p>`;
                    }
                });
            } else {
                html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">`;
                html += `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>`;
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += `<tr><td style="border:1px solid black;">${p.label}) ${formatTextWithMath(p.y)}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                    }
                });
                html += `</table>`;
            }
        }
    } else {
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (soCauTF > 0) {
            if (!isContinuous) globalQuestionIndex = 1;
            const diemCauP2 = (4 * p2_pt);
            const diemCauP2Str = String(diemCauP2).replace('.', ',');
            let d2Title = hasTuLuanMode
              ? "DẠNG 2. Câu hỏi trắc nghiệm đúng/ sai"
              : "PHẦN II. Câu trắc nghiệm đúng sai";
            let d2Desc = "Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S) vào bài làm.";
            if (isMinistry) {
              d2Title = "PHẦN II. Câu trắc nghiệm đúng sai";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const totalTFItems = (typeof dung_sai !== 'undefined' && dung_sai.length > 0) ? dung_sai.length : Math.ceil(getTotalY('dungSai') / 4);
              const endQ = startQ + totalTFItems - 1;
              d2Desc = `Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d2Title}</b> ${d2Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d2Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d2Desc}</p>`;
            }
            for (let i = 0; i < soCauTF; i++) {
                const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
                const slotData = examSlots[`phan2_cau${i + 1}`];
                if (slotData) {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP2Str} điểm).`}</b> ${formatTextWithMath(cleanText(slotData.noiDung || ''))}</p>`;
                    // Chèn hình Matplotlib nếu slot Đúng/Sai có hinhAnh
                    if (slotData.hinhAnh) {
                      const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                      if (imgB64) html += graphImgHtml(imgB64);
                    }
                    if (isMinistry) {
                        if (slotData.yA) html += `<p style="margin-left:2em;">a. ${formatTextWithMath(cleanText(slotData.yA))}</p>`;
                        if (slotData.yB) html += `<p style="margin-left:2em;">b. ${formatTextWithMath(cleanText(slotData.yB))}</p>`;
                        if (slotData.yC) html += `<p style="margin-left:2em;">c. ${formatTextWithMath(cleanText(slotData.yC))}</p>`;
                        if (slotData.yD) html += `<p style="margin-left:2em;">d. ${formatTextWithMath(cleanText(slotData.yD))}</p>`;
                    } else {
                        html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">`;
                        html += `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>`;
                        if (slotData.yA) html += `<tr><td style="border:1px solid black;">a) ${formatTextWithMath(cleanText(slotData.yA))}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        if (slotData.yB) html += `<tr><td style="border:1px solid black;">b) ${formatTextWithMath(cleanText(slotData.yB))}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        if (slotData.yC) html += `<tr><td style="border:1px solid black;">c) ${formatTextWithMath(cleanText(slotData.yC))}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        if (slotData.yD) html += `<tr><td style="border:1px solid black;">d) ${formatTextWithMath(cleanText(slotData.yD))}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        html += `</table>`;
                    }
                } else {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP2Str} điểm).`}</b></p>`;
                    if (isMinistry) {
                        html += `<p style="margin-left:2em;">a. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                        html += `<p style="margin-left:2em;">b. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                        html += `<p style="margin-left:2em;">c. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                        html += `<p style="margin-left:2em;">d. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                    } else {
                        html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:13pt;">`;
                        html += `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>`;
                        html += `<tr><td style="border:1px solid black;">a) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        html += `<tr><td style="border:1px solid black;">b) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        html += `<tr><td style="border:1px solid black;">c) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        html += `<tr><td style="border:1px solid black;">d) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                        html += `</table>`;
                    }
                }
            }
        }
    }

    // --- DẠNG 3 / PHẦN III: Trả lời ngắn (NÂNG CẤP: câu hỏi ĐỘC LẬP) ---
    const dotsFillHtml = '.........................................';
    if (hasTraLoiNgan && tra_loi_ngan.length > 0) {
        const totalSA = getTotalY('traLoiNgan');
        if (!isContinuous) globalQuestionIndex = 1;
        const diemCauP3Str = String(p3_pt).replace('.', ',');
        let d3Title = hasTuLuanMode
              ? "DẠNG 3. Câu trả lời ngắn"
              : "PHẦN III. Câu trắc nghiệm trả lời ngắn";
            let d3Desc = "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi.";
            if (isMinistry) {
              d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const endQ = startQ + totalSA - 1;
              d3Desc = `Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d3Title}</b> ${d3Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d3Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d3Desc}</p>`;
            }
        for (let i = 0; i < totalSA; i++) {
            const q = examSlots[`phan3_cau${i + 1}`];
            if (!q) continue;
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP3Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            // Chèn hình Matplotlib nếu có
            if (q.hinhAnh) {
              const imgB64 = await fetchGraphBase64(q.hinhAnh);
              if (imgB64) html += graphImgHtml(imgB64);
            }
            if (!isMinistry) {
                        html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
                    } else {
                        html += `<br/>`;
                    }
        }
    } else if (hasTraLoiNgan) {
        const totalSA = getTotalY('traLoiNgan');
        if (totalSA > 0) {
            if (!isContinuous) globalQuestionIndex = 1;
            const diemCauP3Str = String(p3_pt).replace('.', ',');
            let d3Title = hasTuLuanMode
              ? "DẠNG 3. Câu trả lời ngắn"
              : "PHẦN III. Câu trắc nghiệm trả lời ngắn";
            let d3Desc = "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi.";
            if (isMinistry) {
              d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn";
              const startQ = isContinuous ? globalQuestionIndex : 1;
              const totalSAItems = (typeof tra_loi_ngan !== 'undefined' && tra_loi_ngan.length > 0) ? tra_loi_ngan.length : getTotalY('traLoiNgan');
              const endQ = startQ + totalSAItems - 1;
              d3Desc = `Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}.`;
            }
            if (isMinistry) {
              html += `<p style="font-size:14pt;"><b>${d3Title}</b> ${d3Desc}</p>`;
            } else {
              html += `<p class="bold" style="font-size:14pt;">${d3Title}</p>`;
              html += `<p style="font-size:14pt;font-style:italic;">${d3Desc}</p>`;
            }
            for (let i = 0; i < totalSA; i++) {
                const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
                const slotData = examSlots[`phan3_cau${i + 1}`];
                if (slotData) {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP3Str} điểm).`}</b> ${formatTextWithMath(cleanText(slotData.noiDung || ''))}</p>`;
                    // Chèn hình Matplotlib nếu slot Trả lời ngắn có hinhAnh
                    if (slotData.hinhAnh) {
                      const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                      if (imgB64) html += graphImgHtml(imgB64);
                    }
                    if (!isMinistry) {
                        html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
                    } else {
                        html += `<br/>`;
                    }
                } else {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP3Str} điểm).`}</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                    if (!isMinistry) {
                        html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
                    } else {
                        html += `<br/>`;
                    }
                }
            }
        }
    }

    // --- PHẦN TỰ LUẬN ---
    if (hasTuLuan && tu_luan.length > 0) {
        const soCauTL = computeTLCauCount();
        const phanTL = hasTraLoiNgan ? 4 : 3;
        // PHẦN II: TỰ LUẬN (nếu có Tự luận mode)
            if (isMinistry) {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            } else if (hasTuLuanMode) {
              html += `<p class="bold" style="font-size:14pt;">PHẦN II. TỰ LUẬN</p>`;
            } else {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            }
        if (!isContinuous) globalQuestionIndex = 1;
        for (let i = 0; i < soCauTL; i++) {
            const q = examSlots[`phan${phanTL}_cau${i + 1}`];
            if (!q) continue;
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            // Kiểm tra có nhiều ý a/b/c riêng không
            const hasMultiY = !!(q.yA && q.yB);
            if (hasMultiY) {
                // Có nhiều ý → in tiêu đề câu kèm câu dẫn chung (nếu có), rồi a), b), c)
                const intro = q.noiDung ? ` ${formatTextWithMath(q.noiDung)}` : '';
                html += `<p><b>Câu ${displayNum}.</b>${intro}</p>`;
                if (q.hinhAnh) {
                  const imgB64 = await fetchGraphBase64(q.hinhAnh);
                  if (imgB64) html += graphImgHtml(imgB64);
                }
                html += `<p style="margin-left:2em;"><b>a)</b> ${formatTextWithMath(q.yA)}</p>`;
                html += `<p style="margin-left:2em;"><b>b)</b> ${formatTextWithMath(q.yB)}</p>`;
                if (q.yC) html += `<p style="margin-left:2em;"><b>c)</b> ${formatTextWithMath(q.yC)}</p>`;
            } else {
                // 1 ý hoặc chỉ noiDung → in trực tiếp
                const content = q.yA || q.noiDung || '';
                html += `<p><b>Câu ${displayNum}.</b> ${formatTextWithMath(content)}</p>`;
                if (q.hinhAnh) {
                  const imgB64 = await fetchGraphBase64(q.hinhAnh);
                  if (imgB64) html += graphImgHtml(imgB64);
                }
            }
        }
    } else if (hasTuLuan) {
        const soCauTL = computeTLCauCount();
        if (soCauTL > 0) {
            if (!isContinuous) globalQuestionIndex = 1;
            const phanTL = hasTraLoiNgan ? 4 : 3;
            // PHẦN II: TỰ LUẬN (nếu có Tự luận mode)
            if (isMinistry) {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            } else if (hasTuLuanMode) {
              html += `<p class="bold" style="font-size:14pt;">PHẦN II. TỰ LUẬN</p>`;
            } else {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            }
            for (let i = 0; i < soCauTL; i++) {
                const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
                const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
                if (slotData) {
                    const hasMultiY2 = !!(slotData.yA && slotData.yB);
                    if (hasMultiY2) {
                        const intro2 = slotData.noiDung ? ` ${formatTextWithMath(slotData.noiDung)}` : '';
                        html += `<p><b>Câu ${displayNum}.</b>${intro2}</p>`;
                        if (slotData.hinhAnh) {
                          const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                          if (imgB64) html += graphImgHtml(imgB64);
                        }
                        html += `<p style="margin-left:2em;"><b>a)</b> ${formatTextWithMath(slotData.yA)}</p>`;
                        html += `<p style="margin-left:2em;"><b>b)</b> ${formatTextWithMath(slotData.yB)}</p>`;
                        if (slotData.yC) html += `<p style="margin-left:2em;"><b>c)</b> ${formatTextWithMath(slotData.yC)}</p>`;
                    } else {
                        const content2 = slotData.yA || slotData.noiDung || '';
                        html += `<p><b>Câu ${displayNum}.</b> ${formatTextWithMath(content2)}</p>`;
                        if (slotData.hinhAnh) {
                          const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                          if (imgB64) html += graphImgHtml(imgB64);
                        }
                    }
                } else {
                    html += `<p><b>Câu ${displayNum}.</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                }
            }
        }
    }

    }    
// === PHẦN KẾT THÚC ĐỀ (HẾT + quy định) - Chỉ mẫu Bộ 2025 ===
    if (isMinistry) {
      html += `<p style="text-align:center;font-weight:bold;font-size:14pt;margin-top:24pt;">------------------------- HẾT -------------------------</p>`;
      html += `<p style="font-style:italic;">- Thí sinh không được sử dụng tài liệu;</p>`;
      html += `<p style="font-style:italic;">- Giám thị không giải thích gì thêm.</p>`;
    }

    // ==================== 4. HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM ====================
    const hasAnySlotData = Object.keys(examSlots).length > 0;
    if (hasAnySlotData) {
        html += `<div class="page-break"></div>`;
        // === HEADER ĐÁP ÁN CHUẨN BỘ 2025 ===
        if (isMinistry) {
          html += `
<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 6pt;">
  <tr>
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.soGD || ""}</div>
      <div style="font-size:14pt;font-weight:bold;"><u>${examHeader.truong || ""}</u></div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:16pt;font-weight:bold;">ĐÁP ÁN ĐỀ KIỂM TRA</div>
      <div style="font-size:14pt;font-weight:bold;">Môn: ${cleanMonHoc}</div>
    </td>
  </tr>
</table>
`;
        } else {
          html += `<h2 style="text-align:center;">HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM</h2>`;
        }

        // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐÁP ÁN)
        let globalAnswerIndex = 1;
        const isContinuousAK = config.isContinuousNumbering;

        // === LOGIC TIÊU ĐỀ PHẦN ĐỘNG THEO TỰ LUẬN (ĐÁP ÁN) ===
        const hasTuLuanModeAK = config.hasTuLuan;

        // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án — BỎ QUA khi mẫu Bộ 2025
        if (hasTuLuanModeAK && !isMinistry) {
          html += `<p class="bold" style="font-size:14pt;">PHẦN I. TRẮC NGHIỆM</p>`;
        }

        // --- Đáp án DẠNG 1 / PHẦN I: Trắc nghiệm nhiều lựa chọn ---
        const totalMCQ = getTotalY('nhieuLuaChon');
        if (totalMCQ > 0) {
            const d1TitleAK = isMinistry
              ? `Phần I.`
              : hasTuLuanModeAK
                ? `DẠNG 1. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${p1_pt} điểm)`
                : `PHẦN I. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${p1_pt} điểm)`;
            html += `<p class="bold">${d1TitleAK}</p>`;
            if (isMinistry) {
              const diemP1Str = String(p1_pt).replace('.', ',');
              html += `<p style="font-style:italic;">(Mỗi câu trả lời đúng thí sinh được ${diemP1Str} điểm)</p>`;
            }
            html += `<table border="1" style="border-collapse:collapse;width:100%;">
              <tr class="bg-gray bold text-center"><td>Câu</td>`;
            for (let i = 0; i < totalMCQ; i++) {
                const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                html += `<td>${displayNum}</td>`;
            }
            html += `</tr><tr class="text-center bold"><td class="bg-gray">Đáp án</td>`;
            for (let i = 0; i < totalMCQ; i++) {
                const slotData = examSlots[`phan1_cau${i + 1}`];
                html += `<td>${String(cleanAns(slotData?.dapAnDung)).replace(/\*/g, '')}</td>`;
            }
            html += `</tr></table>`;

            // Chèn hình đồ thị vào đáp án trắc nghiệm (nếu câu có hinhAnh)
            for (let i = 0; i < totalMCQ; i++) {
              const slotData = examSlots[`phan1_cau${i + 1}`];
              if (slotData?.hinhAnh) {
                const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                if (imgB64) {
                  html += `<p style="font-style:italic;font-weight:bold;font-size:13pt;margin-top:4pt;">Hình minh họa Câu ${i + 1}:</p>`;
                  html += graphImgHtml(imgB64);
                }
              }
            }
        }

        // --- Đáp án DẠNG 2 / PHẦN II: Đúng/Sai ---
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (soCauTF > 0) {
            if (!isContinuousAK) globalAnswerIndex = 1;
            const d2TitleAK = isMinistry
              ? `Phần II`
              : hasTuLuanModeAK
                ? `DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng ${p2_pt} điểm)`
                : `PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng ${p2_pt} điểm)`;
            html += `<p class="bold" style="font-size:14pt;">${d2TitleAK}</p>`;
            
            if (isMinistry) {
                html += `<p>Điểm tối đa của 01 câu hỏi là 1 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 01 ý trong 1 câu hỏi được 0,1 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 02 ý trong 1 câu hỏi được 0,25 điểm.</p>
<p>- Thí sinh chỉ lựa chọn chính xác 03 ý trong 1 câu hỏi được 0,50 điểm.</p>
<p>- Thí sinh lựa chọn chính xác cả 04 ý trong 1 câu hỏi được 1 điểm.</p>`;
                
                html += `<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                  <tr style="text-align:center;font-weight:bold;font-size:14pt;">
                    <td style="padding:4pt;">Câu</td><td style="padding:4pt;">Lệnh hỏi</td><td style="padding:4pt;">Đáp án (Đ/S)</td>
                    <td style="padding:4pt;">Câu</td><td style="padding:4pt;">Lệnh hỏi</td><td style="padding:4pt;">Đáp án (Đ/S)</td>
                  </tr>`;
                
                for (let i = 0; i < soCauTF; i += 2) {
                    const idx1 = i;
                    const idx2 = i + 1;
                    
                    const num1 = isContinuousAK ? globalAnswerIndex++ : (idx1 + 1);
                    const slotData1 = examSlots[`phan2_cau${idx1 + 1}`];
                    const dapAn1 = extractABCD(slotData1?.dapAnDung);
                    
                    let num2 = "";
                    let dapAn2 = ["", "", "", ""];
                    if (idx2 < soCauTF) {
                        num2 = isContinuousAK ? globalAnswerIndex++ : (idx2 + 1);
                        const slotData2 = examSlots[`phan2_cau${idx2 + 1}`];
                        dapAn2 = extractABCD(slotData2?.dapAnDung);
                    }
                    
                    const labels = ['a', 'b', 'c', 'd'];
                    for (let r = 0; r < 4; r++) {
                        html += `<tr style="text-align:center;font-size:14pt;">`;
                        if (r === 0) {
                            html += `<td rowspan="4" style="font-weight:bold;padding:4pt;vertical-align:middle;">${num1}</td>`;
                        }
                        html += `<td style="padding:4pt;">${labels[r]}</td><td style="padding:4pt;">${dapAn1[r]}</td>`;
                        
                        if (idx2 < soCauTF) {
                            if (r === 0) {
                                html += `<td rowspan="4" style="font-weight:bold;padding:4pt;vertical-align:middle;">${num2}</td>`;
                            }
                            html += `<td style="padding:4pt;">${labels[r]}</td><td style="padding:4pt;">${dapAn2[r]}</td>`;
                        } else {
                            if (r === 0) {
                                html += `<td rowspan="4" style="padding:4pt;"></td>`;
                            }
                            html += `<td style="padding:4pt;"></td><td style="padding:4pt;"></td>`;
                        }
                        html += `</tr>`;
                    }
                }
                html += `</table>`;
            } else {
                html += `<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center"><td>Câu</td><td>Ý a</td><td>Ý b</td><td>Ý c</td><td>Ý d</td></tr>`;
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[`phan2_cau${i + 1}`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    html += `<tr class="text-center"><td><b>${displayNum}</b></td><td>${a}</td><td>${b}</td><td>${c}</td><td>${d}</td></tr>`;
                }
                html += `</table>`;
            }

            // Chèn hình đồ thị vào đáp án Đúng/Sai (nếu câu có hinhAnh)
            for (let i = 0; i < soCauTF; i++) {
              const slotData = examSlots[`phan2_cau${i + 1}`];
              if (slotData?.hinhAnh) {
                const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                if (imgB64) {
                  html += `<p style="font-style:italic;font-weight:bold;font-size:13pt;margin-top:4pt;">Hình minh họa Câu ${i + 1} (Đúng/Sai):</p>`;
                  html += graphImgHtml(imgB64);
                }
              }
            }
        }
        // --- Đáp án DẠNG 3 / PHẦN III: Trả lời ngắn (NÂNG CẤP: câu hỏi độc lập) ---
        if (hasTraLoiNgan) {
            const totalSA = getTotalY('traLoiNgan');
            if (totalSA > 0) {
                if (!isContinuousAK) globalAnswerIndex = 1;
                if (isMinistry) {
                    const diemP3Str = String(p3_pt).replace('.', ',');
                    html += `<p class="bold" style="font-size:14pt;">PHẦN III</p>`;
                    html += `<p style="font-style:italic;font-size:14pt;">(Mỗi câu trả lời đúng thí sinh được ${diemP3Str} điểm)</p>`;
                    html += `<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                      <tr style="text-align:center;font-weight:bold;font-size:14pt;">
                        <td style="width:25%;">Câu</td><td style="width:25%;">Đáp án</td>
                        <td style="width:25%;">Câu</td><td style="width:25%;">Đáp án</td>
                      </tr>`;
                    
                    const cellsArray = [];
                    for (let i = 0; i < totalSA; i++) {
                        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                        const slotData = examSlots[`phan3_cau${i + 1}`];
                        const dapAn = cleanAns(slotData?.dapAnDung) || '...';
                        cellsArray.push(displayNum);
                        cellsArray.push(dapAn);
                    }
                    
                    for (let i = 0; i < cellsArray.length; i += 4) {
                        html += `<tr style="text-align:center;font-size:14pt;">`;
                        for(let j=0; j<4; j++){
                            if(i+j < cellsArray.length){
                                html += `<td style="padding:4pt;">${cellsArray[i+j]}</td>`;
                            } else {
                                html += `<td style="padding:4pt;"></td>`;
                            }
                        }
                        html += `</tr>`;
                    }
                    html += `</table>`;
                } else {
                    const d3TitleAK = hasTuLuanModeAK
                      ? `DẠNG 3. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng ${p3_pt} điểm)`
                      : `PHẦN III. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng ${p3_pt} điểm)`;
                    html += `<p class="bold">${d3TitleAK}</p>`;
                    for (let i = 0; i < totalSA; i++) {
                        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                        const slotData = examSlots[`phan3_cau${i + 1}`];
                        const dapAn = cleanAns(slotData?.dapAnDung) || '...';
                        html += `<p><b>Câu ${displayNum}:</b> ${dapAn}</p>`;
                        // In giải thích nếu có
                        if (slotData?.giaiThich) {
                            html += `<p style="margin-left:2em;"><i><b>Giải thích:</b> ${formatTextWithMath(slotData.giaiThich)}</i></p>`;
                        }
            }
        }

                // Chèn hình đồ thị vào đáp án Trả lời ngắn (nếu câu có hinhAnh)
                for (let i = 0; i < totalSA; i++) {
                  const slotData = examSlots[`phan3_cau${i + 1}`];
                  if (slotData?.hinhAnh) {
                    const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                    if (imgB64) {
                      html += `<p style="font-style:italic;font-weight:bold;font-size:13pt;margin-top:4pt;">Hình minh họa Câu ${i + 1} (Trả lời ngắn):</p>`;
                      html += graphImgHtml(imgB64);
                    }
                  }
                }
            }
        }

        // --- Đáp án PHẦN II TỰ LUẬN / PHẦN IV: Tự Luận ---
        if (hasTuLuan) {
            const soCauTL = computeTLCauCount();
            if (soCauTL > 0) {
                if (!isContinuousAK) globalAnswerIndex = 1;
                const phanTL = hasTraLoiNgan ? 4 : 3;
                // Tiêu đề đáp án tự luận — dynamic theo mode
                if (isMinistry) {
                  const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";
                  html += `<p class="bold">${sectionTitle}</p>`;
                } else if (hasTuLuanModeAK) {
                  html += `<p class="bold" style="font-size:14pt;">PHẦN II. TỰ LUẬN</p>`;
                } else {
                  const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";
                  html += `<p class="bold">${sectionTitle}</p>`;
                }
                html += `<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center">
                    <td style="width:10%;">Câu</td>
                    <td style="width:75%;">Nội dung đáp án</td>
                    <td style="width:15%;">Điểm</td>
                  </tr>`;

                for (let i = 0; i < soCauTL; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
                    if (!slotData) continue;

                    const yParts = getYParts(slotData);
                    let cauTotalRows = 0;
                    yParts.forEach(p => {
                        const hasLabelOrY = !!(p.y && p.y.trim() !== '') || !!p.label;
                        if (hasLabelOrY) cauTotalRows++;
                        if (p.da) cauTotalRows += p.da.split('\n').filter(l => l.trim() !== '').length;
                    });
                    if (slotData.giaiThich) cauTotalRows++;
                    if (cauTotalRows === 0) cauTotalRows = 1;

                    let isFirstRow = true;

                    yParts.forEach(p => {
                        const hasLabelOrY = !!(p.y && p.y.trim() !== '') || !!p.label;
                        if (hasLabelOrY) {
                            html += `<tr>`;
                            if (isFirstRow) { html += `<td rowspan="${cauTotalRows}" style="text-align:center;"><b>Câu ${displayNum}</b></td>`; isFirstRow = false; }
                            const lbl = p.label ? `<b>${p.label})</b> ` : '';
                            html += `<td>${lbl}<b>${formatTextWithMath(p.y || '')}</b></td><td style="text-align:center;"><b>${p.di || ''}</b></td></tr>`;
                        }
                        if (p.da) {
                            let isFirstDapAnLine = true;
                            p.da.split('\n').filter(l => l.trim() !== '').forEach(line => {
                                let { nd, diem } = parseLine(line);
                                if (!diem && isFirstDapAnLine && p.di) diem = p.di;
                                html += `<tr>`;
                                if (isFirstRow) { html += `<td rowspan="${cauTotalRows}" style="text-align:center;"><b>Câu ${displayNum}</b></td>`; isFirstRow = false; }
                                html += `<td>${nd}</td><td style="text-align:center;"><b>${diem}</b></td></tr>`;
                                isFirstDapAnLine = false;
                            });
                        }
                    });

                    if (slotData.giaiThich) {
                        html += `<tr>`;
                        if (isFirstRow) { html += `<td rowspan="${cauTotalRows}" style="text-align:center;"><b>Câu ${displayNum}</b></td>`; isFirstRow = false; }
                        html += `<td colspan="2"><i>Hướng dẫn chấm chung: ${formatTextWithMath(slotData.giaiThich)}</i></td></tr>`;
                    }

                    if (isFirstRow) {
                        html += `<tr><td style="text-align:center;"><b>Câu ${displayNum}</b></td><td></td><td></td></tr>`;
                    }
                }
                html += `</table><br/>`;

                // Chèn hình đồ thị vào đáp án Tự luận (nếu câu có hinhAnh)
                for (let i = 0; i < soCauTL; i++) {
                  const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
                  if (slotData?.hinhAnh) {
                    const imgB64 = await fetchGraphBase64(slotData.hinhAnh);
                    if (imgB64) {
                      html += `<p style="font-style:italic;font-weight:bold;font-size:13pt;margin-top:4pt;">Hình minh họa Câu ${i + 1} (Tự luận):</p>`;
                      html += graphImgHtml(imgB64);
                    }
                  }
                }
            }
        }
    }

    html += `</div></body></html>`;

    // Lưu dưới dạng .doc để kích hoạt bộ render Equation của Word
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const suffix = latexMode ? '_LaTeX' : '';
    saveAs(blob, `Ma_Tran_Dac_Ta_De_Thi_${examHeader.monHoc || 'Chuan'}${suffix}.doc`);

    // Restore module-level formatter ve mac dinh sau khi xong
    formatTextWithMath = _formatTextMathML;
};

export const exportToWordMathLatex = () => exportToWordMath({ latexMode: true });