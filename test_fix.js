import { saveAs } from 'file-saver';
import katex from 'katex';
import { useExamStore } from '../store/useExamStore';

// ==========================================
// 1. CỔNG CHUYỂN ĐỔI LATEX -> MATHML (NATIVE WORD)
// ==========================================
const formatTextWithMath = (text) => {
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
                return mathml;
            }
            return originalMatch;
        } catch (e) { return originalMatch; }
    };

    processed = processed.replace(/\$\$(.*?)\$\$/gs, (match, math) => renderMath(math, true, match));
    processed = processed.replace(/\$(.*?)\$/g, (match, math) => renderMath(math, false, match));

    processed = processed.replace(/
/g, '<br/>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return processed;
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
    return parts;
};

// ==========================================
// 3. CÁC HÀM TÍNH TOÁN MA TRẬN (Giống exportWord.js)
// ==========================================
const buildMatrixHelpers = (matrix, config, examConfig) => {
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
        const ds = ((Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0)) * examConfig.diemMoiYP2;
        const tln = config.hasTraLoiNgan ? ((Number(dv.traLoiNgan?.biet) || 0) + (Number(dv.traLoiNgan?.hieu) || 0) + (Number(dv.traLoiNgan?.vanDung) || 0)) * examConfig.diemMoiYP3 : 0;
        const tl = (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0);
        return nlc + ds + tln + tl;
    };

    const getLevelTotalItems = (level) =>
        sumCount('nhieuLuaChon', level) +
        sumCount('dungSai', level) +
        (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) +
        sumCount('tuLuan', level);

    const getLevelTotalQuestions = (level) =>
        sumCount('nhieuLuaChon', level) +
        (sumCount('dungSai', level) * 0.25) +
        (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) +
        sumCount('tuLuan', level);

    const getTopicTuLuanPoints = (topic) =>
        (topic.donViKienThuc || []).reduce((s, dv) =>
            s + (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0), 0);

    const getColumnTotalPoints = (type) => {
        if (type === 'tuLuan') return matrix.reduce((sum, t) => sum + getTopicTuLuanPoints(t), 0);
        const totalCount = sumCount(type, 'biet') + sumCount(type, 'hieu') + sumCount(type, 'vanDung');
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
                getTopicSum(topic, 'dungSai', level) * examConfig.diemMoiYP2 +
                (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) * examConfig.diemMoiYP3 : 0) +
                (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv.tuLuan?.[tlKey]) || 0), 0);
        }, 0);
    };

    const getGrandTotalPoints = () =>
        getLevelTotalPoints('biet') + getLevelTotalPoints('hieu') + getLevelTotalPoints('vanDung');

    const getDvLevelSummary = (dv, level) => {
        const nlc = Number(dv.nhieuLuaChon?.[level]) || 0;
        const ds = Number(dv.dungSai?.[level]) || 0;
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

    // Format mã năng lực cho Bảng Đặc tả
    const fmtNLC = (val, level) => {
        const v = Number(val) || 0;
        if (v <= 0) return 0;
        const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
        return `${v} (${code})`;
    };
    const fmtY = (val, level) => {
        const v = Number(val) || 0;
        if (v <= 0) return 0;
        const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
        return `${v} ý (${code})`;
    };

    return {
        sumCount, getTopicSum, getTopicLevelCount,
        getDvLevelCount, getDvTotalPoints, getDvLevelSummary,
        getLevelTotalItems, getLevelTotalQuestions,
        getTopicTuLuanPoints, getColumnTotalPoints,
        getLevelTotalPoints, getGrandTotalPoints, pct,
        fmtNLC, fmtY
    };
};

// ==========================================
// 4. XUẤT BẢNG MA TRẬN DẠNG HTML
// ==========================================
const buildMatrixTable = (matrix, config, examConfig) => {
    const h = buildMatrixHelpers(matrix, config, examConfig);
    const { sumCount, getTopicSum, getTopicLevelCount, getLevelTotalItems, getLevelTotalQuestions,
        getColumnTotalPoints, getLevelTotalPoints, getGrandTotalPoints, pct } = h;

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
      ${cell('Mức độ đánh giá', { bold: true, colspan: config.hasTuLuan ? 12 : 9, bg: 'E2E8F0' })}
      ${cell('Tổng (Ý)', { bold: true, rowspan: 3, colspan: 3, bg: 'E2E8F0' })}
      ${cell('Tỉ lệ %', { bold: true, rowspan: 4, bg: 'E2E8F0' })}
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
            rows += cell(dv.nhieuLuaChon?.biet || 0);
            rows += cell(dv.nhieuLuaChon?.hieu || 0);
            rows += cell(dv.nhieuLuaChon?.vanDung || 0);
            rows += cell(dv.dungSai?.biet || 0);
            rows += cell(dv.dungSai?.hieu || 0);
            rows += cell(dv.dungSai?.vanDung || 0);
            rows += cell(config.hasTraLoiNgan ? (dv.traLoiNgan?.biet || 0) : 0);
            rows += cell(config.hasTraLoiNgan ? (dv.traLoiNgan?.hieu || 0) : 0);
            rows += cell(config.hasTraLoiNgan ? (dv.traLoiNgan?.vanDung || 0) : 0);
            if (config.hasTuLuan) {
              rows += cell(dv.tuLuan?.biet || 0);
              rows += cell(dv.tuLuan?.hieu || 0);
              rows += cell(dv.tuLuan?.vanDung || 0);
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
      ${cell(sumCount('dungSai', 'biet'))}${cell(sumCount('dungSai', 'hieu'))}${cell(sumCount('dungSai', 'vanDung'))}
      ${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0)}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet')) + cell(sumCount('tuLuan', 'hieu')) + cell(sumCount('tuLuan', 'vanDung')) : ''}
      ${cell(getLevelTotalItems('biet'), { bold: true, align: 'center' })}${cell(getLevelTotalItems('hieu'), { bold: true, align: 'center' })}${cell(getLevelTotalItems('vanDung'), { bold: true, align: 'center' })}
      ${cell('')}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng số câu', { bold: true, align: 'center', colspan: 3, bg: 'F1F5F9' })}
      ${cell(sumCount('nhieuLuaChon', 'biet'), { align: 'center' })}${cell(sumCount('nhieuLuaChon', 'hieu'), { align: 'center' })}${cell(sumCount('nhieuLuaChon', 'vanDung'), { align: 'center' })}
      ${cell((() => { const y = sumCount('dungSai', 'biet'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}${cell((() => { const y = sumCount('dungSai', 'hieu'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}${cell((() => { const y = sumCount('dungSai', 'vanDung'); if (!y) return 0; const c = y * 0.25; return `${c % 1 === 0 ? c : c.toFixed(1).replace('.', ',')} (${y} ý)`; })(), { align: 'center' })}
      ${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0, { align: 'center' })}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0, { align: 'center' })}${cell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0, { align: 'center' })}
      ${config.hasTuLuan ? cell(sumCount('tuLuan', 'biet'), { align: 'center' }) + cell(sumCount('tuLuan', 'hieu'), { align: 'center' }) + cell(sumCount('tuLuan', 'vanDung'), { align: 'center' }) : ''}
      ${cell((() => { const c2 = sumCount('nhieuLuaChon', 'biet'); const y2 = sumCount('dungSai', 'biet') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'biet') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}${cell((() => { const c2 = sumCount('nhieuLuaChon', 'hieu'); const y2 = sumCount('dungSai', 'hieu') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'hieu') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}${cell((() => { const c2 = sumCount('nhieuLuaChon', 'vanDung'); const y2 = sumCount('dungSai', 'vanDung') + (config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0) + (config.hasTuLuan ? sumCount('tuLuan', 'vanDung') : 0); if (!c2 && !y2) return 0; if (c2 && !y2) return c2; if (!c2 && y2) return `${y2} ý`; return `${c2}c+ ${y2} ý`; })(), { bold: true, align: 'center' })}
      ${cell(getLevelTotalQuestions('biet') + getLevelTotalQuestions('hieu') + getLevelTotalQuestions('vanDung'), { bold: true, align: 'center' })}
    </tr>`;
    rows += `<tr>
      ${cell('Tổng điểm', { bold: true, align: 'center', colspan: 3, bg: 'CBD5E1' })}
      ${cell(getColumnTotalPoints('nhieuLuaChon'), { bold: true, align: 'center', colspan: 3 })}
      ${cell(getColumnTotalPoints('dungSai'), { bold: true, align: 'center', colspan: 3 })}
      ${cell(getColumnTotalPoints('traLoiNgan'), { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTuLuan ? cell(getColumnTotalPoints('tuLuan'), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${cell(getLevelTotalPoints('biet'), { bold: true, align: 'center' })}${cell(getLevelTotalPoints('hieu'), { bold: true, align: 'center' })}${cell(getLevelTotalPoints('vanDung'), { bold: true, align: 'center' })}
      ${cell(getGrandTotalPoints(), { bold: true, align: 'center' })}
    </tr>`;
    rows += `<tr>
      ${cell('Tỉ lệ %', { bold: true, align: 'center', colspan: 3, bg: 'E2E8F0' })}
      ${cell(pct(getColumnTotalPoints('nhieuLuaChon')), { bold: true, align: 'center', colspan: 3 })}
      ${cell(pct(getColumnTotalPoints('dungSai')), { bold: true, align: 'center', colspan: 3 })}
      ${cell(config.hasTraLoiNgan ? pct(getColumnTotalPoints('traLoiNgan')) : '0%', { bold: true, align: 'center', colspan: 3 })}
      ${config.hasTuLuan ? cell(pct(getColumnTotalPoints('tuLuan')), { bold: true, align: 'center', colspan: 3 }) : ''}
      ${cell(pct(getLevelTotalPoints('biet')), { bold: true, align: 'center' })}${cell(pct(getLevelTotalPoints('hieu')), { bold: true, align: 'center' })}${cell(pct(getLevelTotalPoints('vanDung')), { bold: true, align: 'center' })}
      ${cell(pct(getGrandTotalPoints()), { bold: true, align: 'center' })}
    </tr>`;

    return `<table border="1" style="border-collapse:collapse;width:100%;font-size:11pt;">${rows}</table>`;
};

// ==========================================
// 5. XUẤT BẢNG ĐẶC TẢ DẠNG HTML
// ==========================================
const buildSpecTable = (matrix, config, examConfig) => {
    const h = buildMatrixHelpers(matrix, config, examConfig);
    const { sumCount, getColumnTotalPoints, getLevelTotalPoints, getLevelTotalQuestions, pct, fmtNLC, fmtY } = h;

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
            const ycLines = (dv.yeuCauCanDat || '').split(\'\\n').map(l => l.trim()).filter(Boolean).join('<br/>');
            rows += `<td style="border:1px solid black;text-align:left;vertical-align:top;">${ycLines}</td>`;
            // NLC kèm mã năng lực
            rows += cell(fmtNLC(dv.nhieuLuaChon?.biet, 'biet'));
            rows += cell(fmtNLC(dv.nhieuLuaChon?.hieu, 'hieu'));
            rows += cell(fmtNLC(dv.nhieuLuaChon?.vanDung, 'vanDung'));
            // ĐS kèm "ý" + mã năng lực
            rows += cell(fmtY(dv.dungSai?.biet, 'biet'));
            rows += cell(fmtY(dv.dungSai?.hieu, 'hieu'));
            rows += cell(fmtY(dv.dungSai?.vanDung, 'vanDung'));
            // TLN kèm "ý" + mã năng lực
            rows += cell(config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.biet, 'biet') : 0);
            rows += cell(config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.hieu, 'hieu') : 0);
            rows += cell(config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.vanDung, 'vanDung') : 0);
            
            if (config.hasTuLuan) {
              // TL kèm "ý" + mã năng lực
              rows += cell(fmtY(dv.tuLuan?.biet, 'biet'));
              rows += cell(fmtY(dv.tuLuan?.hieu, 'hieu'));
              rows += cell(fmtY(dv.tuLuan?.vanDung, 'vanDung'));
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

    return `<table border="1" style="border-collapse:collapse;width:100%;font-size:11pt;">${rows}</table>`;
};

// ==========================================
// 6. HÀM XUẤT WORD CHÍNH
// ==========================================
export const exportToWordMath = async () => {
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
    @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 1.5cm; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Times New Roman', serif; font-size: 14pt; }
    p { margin: 0; padding: 0; margin-bottom: 4pt; line-height: 1.2; }
    h2, h3 { margin: 10pt 0; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; table-layout: fixed; mso-cellspacing: 0; mso-padding-alt: 0; }
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
      total += Math.ceil(getTotalY('tuLuan') / 3);
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
      <div style="font-size:12pt;font-style:italic;margin-top:4pt;">(Đề thi gồm ${String(soTrangHeader).padStart(2, '0')} trang)</div>
    </td>
    <td style="width:60%;text-align:center;vertical-align:top;border:none;">
      <div style="font-size:14pt;font-weight:bold;">${examHeader.kyThi || ""}</div>
      <div style="font-size:14pt;font-weight:bold;">Môn: ${cleanMonHoc}</div>
      <div style="font-size:12pt;font-style:italic;">Thời gian làm bài: ${cleanThoiGian}, không kể thời gian phát đề</div>
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
      <div style="font-size:12pt;font-style:italic;">(Đề kiểm tra gồm ${tongSoCauHeader} câu, 0${Math.ceil(tongSoCauHeader / 10)} trang)</div>
    </td>
  </tr>
</table>
`;
    }

    // ==================== 1. MA TRẬN ĐỀ KIỂM TRA ====================
    html += `<h2 style="text-align:center;font-size:16pt;">1. MA TRẬN ĐỀ KIỂM TRA</h2>`;
    html += buildMatrixTable(matrix, config, examConfig);

    // ==================== 2. BẢN ĐẶC TẢ ====================
    html += `<h2 style="text-align:center;font-size:16pt;">2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA</h2>`;
    html += buildSpecTable(matrix, config, examConfig);

    // ==================== HƯỚNG DẪN MÃ HÓA NĂNG LỰC ====================
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">HƯỚNG DẪN MÃ HÓA NĂNG LỰC</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">
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
    html += `<h3 style="text-align:center;font-size:14pt;font-weight:bold;">Bảng quy ước mã hóa năng lực theo nhóm môn</h3>`;
    html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">
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
    html += `<p style="font-size:12pt;"><b>Lưu ý:</b> <i>Mã năng lực được ghi kèm theo số lượng câu hỏi/ý trong Bảng Đặc tả nhằm giúp giáo viên dễ dàng đối chiếu yêu cầu cần đạt với mức độ nhận thức tương ứng khi ra đề kiểm tra. Các mã viết tắt cụ thể theo từng môn được quy ước trong bảng trên.</i></p>`;

    // ==================== 3. ĐỀ THI (KHUNG / ĐỀ AI) ====================
    html += `<div class="page-break"></div>`;
    html += `<h2 style="text-align:center;font-size:16pt;">3. KHUNG ĐỀ KIỂM TRA</h2>`;

    if (generatedExam && generatedExam.trim() !== '') {
        const aiExam = generatedExam
            .replace(/### (.*?)(?:
|$)/g, '<h3>$1</h3>
')
            .replace(/## (.*?)(?:
|$)/g, '<h2>$1</h2>
')
            .replace(/# (.*?)(?:
|$)/g, '<h1>$1</h1>
');
        html += formatTextWithMath(aiExam);
    } else {
        html += `<h2 style="text-align:center;">ĐỀ KIỂM TRA</h2>`;
        if (isMinistry) {
            html += `<p style="font-size:14pt;margin-bottom:6pt;">Họ, tên thí sinh: ...........................................................................</p>`;
            html += `<p style="font-size:14pt;margin-bottom:18pt;">Số báo danh: ................................................................................</p>`;
        }
        if (isMinistry) {
            html += `<p style="font-size:14pt;margin-bottom:6pt;"><b>Họ, tên thí sinh:</b> ...........................................................................</p>`;
            html += `<p style="font-size:14pt;margin-bottom:18pt;"><b>Số báo danh:</b> ................................................................................</p>`;
        }

        // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐỀ THI)
        let globalQuestionIndex = 1;
        const isContinuous = config.isContinuousNumbering;

        // === LOGIC TIÊU ĐỀ PHẦN ĐỘNG THEO TỰ LUẬN ===
        const hasTuLuanMode = config.hasTuLuan;

        // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — BỎ QUA khi mẫu Bộ 2025
        if (hasTuLuanMode && !isMinistry) {
          html += `<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>`;
        }

        // --- DẠNG 1 / PHẦN I: Nhiều lựa chọn ---
        if (questions.length > 0) {
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
        questions.forEach((q, i) => {
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemP1Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            if (q.dapAnA) html += `<p><b>A.</b> ${formatTextWithMath(String(q.dapAnA).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
            if (q.dapAnB) html += `<p><b>B.</b> ${formatTextWithMath(String(q.dapAnB).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
            if (q.dapAnC) html += `<p><b>C.</b> ${formatTextWithMath(String(q.dapAnC).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
            if (q.dapAnD) html += `<p><b>D.</b> ${formatTextWithMath(String(q.dapAnD).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
        });
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
                    if (slotData.dapAnA) html += `<p><b>A.</b> ${formatTextWithMath(String(slotData.dapAnA).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
                    if (slotData.dapAnB) html += `<p><b>B.</b> ${formatTextWithMath(String(slotData.dapAnB).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
                    if (slotData.dapAnC) html += `<p><b>C.</b> ${formatTextWithMath(String(slotData.dapAnC).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
                    if (slotData.dapAnD) html += `<p><b>D.</b> ${formatTextWithMath(String(slotData.dapAnD).replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, ''))}</p>`;
                } else {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemP1Str} điểm).`}</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                }
            }
        }
    }

    // --- DẠNG 2 / PHẦN II: Đúng sai ---
    if (dung_sai.length > 0) {
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
        dung_sai.forEach((q, i) => {
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP2Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            // Vẽ bảng Nhận định / Đ-S
            if (isMinistry) {
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += `<p style="margin-left:2em;">${p.label}. ${formatTextWithMath(p.y)}</p>`;
                    }
                });
            } else {
                html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;
                html += `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>`;
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += `<tr><td style="border:1px solid black;">${p.label}) ${formatTextWithMath(p.y)}</td><td style="border:1px solid black;text-align:center;"></td></tr>`;
                    }
                });
                html += `</table>`;
            }
        });
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
                    if (isMinistry) {
                        if (slotData.yA) html += `<p style="margin-left:2em;">a. ${formatTextWithMath(cleanText(slotData.yA))}</p>`;
                        if (slotData.yB) html += `<p style="margin-left:2em;">b. ${formatTextWithMath(cleanText(slotData.yB))}</p>`;
                        if (slotData.yC) html += `<p style="margin-left:2em;">c. ${formatTextWithMath(cleanText(slotData.yC))}</p>`;
                        if (slotData.yD) html += `<p style="margin-left:2em;">d. ${formatTextWithMath(cleanText(slotData.yD))}</p>`;
                    } else {
                        html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;
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
                        html += `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;
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
        tra_loi_ngan.forEach((q, i) => {
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP3Str} điểm).`}</b> ${formatTextWithMath(q.noiDung)}</p>`;
            html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
        });
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
                    html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
                } else {
                    html += `<p><b>Câu ${displayNum}${isMinistry ? '.' : ` (${diemCauP3Str} điểm).`}</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
                    html += `<p>&nbsp;&nbsp;&nbsp;${dotsFillHtml}</p>`;
                }
            }
        }
    }

    // --- PHẦN TỰ LUẬN ---
    if (hasTuLuan && tu_luan.length > 0) {
        // PHẦN II: TỰ LUẬN (nếu có Tự luận mode)
            if (isMinistry) {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            } else if (hasTuLuanMode) {
              html += `<p class="bold" style="font-size:15pt;">PHẦN II. TỰ LUẬN</p>`;
            } else {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            }
        if (!isContinuous) globalQuestionIndex = 1;
        tu_luan.forEach((q, i) => {
            const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
            // Kiểm tra có ý a/b/c/d riêng không
            const hasSubParts = !!(q.yA || q.yB || q.yC || q.yD);
            if (hasSubParts) {
                // Có ý con → chỉ in tiêu đề câu (không in noiDung vì noiDung thường là bản gộp các ý)
                html += `<p><b>Câu ${displayNum}.</b></p>`;
                if (q.yA) html += `<p style="margin-left:2em;"><b>a)</b> ${formatTextWithMath(q.yA)}</p>`;
                if (q.yB) html += `<p style="margin-left:2em;"><b>b)</b> ${formatTextWithMath(q.yB)}</p>`;
                if (q.yC) html += `<p style="margin-left:2em;"><b>c)</b> ${formatTextWithMath(q.yC)}</p>`;
                if (q.yD) html += `<p style="margin-left:2em;"><b>d)</b> ${formatTextWithMath(q.yD)}</p>`;
            } else {
                // Không có ý con → in nguyên noiDung
                html += `<p><b>Câu ${displayNum}.</b> ${formatTextWithMath(q.noiDung)}</p>`;
            }
        });
    } else if (hasTuLuan) {
        const totalTL = getTotalY('tuLuan');
        const soCauTL = Math.ceil(totalTL / 3);
        if (soCauTL > 0) {
            if (!isContinuous) globalQuestionIndex = 1;
            const phanTL = hasTraLoiNgan ? 4 : 3;
            // PHẦN II: TỰ LUẬN (nếu có Tự luận mode)
            if (isMinistry) {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
            } else if (hasTuLuanMode) {
              html += `<p class="bold" style="font-size:15pt;">PHẦN II. TỰ LUẬN</p>`;
            } else {
              const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
              html += `<p class="bold" style="font-size:14pt;">${sectionTitle}</p>`;
    <td style="width:40%;text-align:center;vertical-align:top;border:none;">
            }
            for (let i = 0; i < soCauTL; i++) {
                const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
                const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
                if (slotData) {
                    const hasSubParts = !!(slotData.yA || slotData.yB || slotData.yC || slotData.yD);
                    if (hasSubParts) {
                        html += `<p><b>Câu ${displayNum}.</b></p>`;
                        if (slotData.yA) html += `<p style="margin-left:2em;"><b>a)</b> ${formatTextWithMath(cleanText(slotData.yA))}</p>`;
                        if (slotData.yB) html += `<p style="margin-left:2em;"><b>b)</b> ${formatTextWithMath(cleanText(slotData.yB))}</p>`;
                        if (slotData.yC) html += `<p style="margin-left:2em;"><b>c)</b> ${formatTextWithMath(cleanText(slotData.yC))}</p>`;
                        if (slotData.yD) html += `<p style="margin-left:2em;"><b>d)</b> ${formatTextWithMath(cleanText(slotData.yD))}</p>`;
                    } else {
                        html += `<p><b>Câu ${displayNum}.</b> ${formatTextWithMath(cleanText(slotData.noiDung || ''))}</p>`;
                    }
                } else {
                    html += `<p><b>Câu ${displayNum}.</b> <i>(Ghi nội dung câu hỏi vào đây...)</i></p>`;
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
          html += \`<p class="bold" style="font-size:15pt;">PHẦN I. TRẮC NGHIỆM</p>\`;
        }

        // --- Đáp án DẠNG 1 / PHẦN I: Trắc nghiệm nhiều lựa chọn ---
        const totalMCQ = getTotalY('nhieuLuaChon');
        if (totalMCQ > 0) {
            const d1TitleAK = isMinistry
              ? \`Phần I.\`
              : hasTuLuanModeAK
                ? \`DẠNG 1. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${p1_pt} điểm)\`
                : \`PHẦN I. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${p1_pt} điểm)\`;
            html += \`<p class="bold">${d1TitleAK}</p>\`;
            if (isMinistry) {
              const diemP1Str = String(p1_pt).replace('.', ',');
              html += \`<p style="font-style:italic;">(Mỗi câu trả lời đúng thí sinh được ${diemP1Str} điểm)</p>\`;
            }
            html += \`<table border="1" style="border-collapse:collapse;width:100%;">
              <tr class="bg-gray bold text-center"><td>Câu</td>\`;
            for (let i = 0; i < totalMCQ; i++) {
                const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                html += \`<td>${displayNum}</td>\`;
            }
            html += \`</tr><tr class="text-center bold"><td class="bg-gray">Đáp án</td>\`;
            for (let i = 0; i < totalMCQ; i++) {
                const slotData = examSlots[\`phan1_cau${i + 1}\`];
                html += \`<td>${String(cleanAns(slotData?.dapAnDung)).replace(/\*/g, '')}</td>\`;
            }
            html += \`</tr></table>\`;
        }

        // --- Đáp án DẠNG 2 / PHẦN II: Đúng/Sai ---
        const totalTF = getTotalY('dungSai');
        const soCauTF = Math.ceil(totalTF / 4);
        if (soCauTF > 0) {
            if (!isContinuousAK) globalAnswerIndex = 1;
            const d2TitleAK = isMinistry
              ? \`PHẦN II. Câu trắc nghiệm đúng sai\`
              : hasTuLuanModeAK
                ? \`DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng ${p2_pt} điểm)\`
                : \`PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng ${p2_pt} điểm)\`;
            html += \`<p class="bold">${d2TitleAK}</p>\`;
            
            if (isMinistry) {
                html += \`<table border="1" style="border-collapse:collapse;width:100%;margin-bottom:12pt;">
                  <tr class="text-center"><td class="bold bg-gray">Điểm</td><td>1 ý đúng: 0,1đ</td><td>2 ý đúng: 0,25đ</td><td>3 ý đúng: 0,5đ</td><td>4 ý đúng: 1,0đ</td></tr>
                </table>\`;
                
                html += \`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center">
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                    <td>Câu</td><td>Lệnh hỏi</td><td>Đáp án (Đ/S)</td>
                  </tr>\`;
                
                const cellsArray = [];
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\`phan2_cau${i + 1}\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    
                    ['a', 'b', 'c', 'd'].forEach((lbl, idx) => {
                        cellsArray.push(idx === 0 ? \`<b>${displayNum}</b>\` : "");
                        cellsArray.push(\`${lbl})\`);
                        cellsArray.push([a, b, c, d][idx]);
                    });
                }
                
                for (let i = 0; i < cellsArray.length; i += 6) {
                    html += \`<tr class="text-center">\`;
                    for(let j=0; j<6; j++){
                        if(i+j < cellsArray.length){
                            html += \`<td>${cellsArray[i+j]}</td>\`;
                        } else {
                            html += \`<td></td>\`;
                        }
                    }
                    html += \`</tr>\`;
                }
                html += \`</table>\`;
            } else {
                html += \`<table border="1" style="border-collapse:collapse;width:100%;">
                  <tr class="bg-gray bold text-center"><td>Câu</td><td>Ý a</td><td>Ý b</td><td>Ý c</td><td>Ý d</td></tr>\`;
                for (let i = 0; i < soCauTF; i++) {
                    const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
                    const slotData = examSlots[\`phan2_cau${i + 1}\`];
                    const [a, b, c, d] = extractABCD(slotData?.dapAnDung);
                    html += \`<tr class="text-center"><td><b>${displayNum}</b></td><td>${a}</td><td>${b}</td><td>${c}</td><td>${d}</td></tr>\`;
                }
                html += \`</table>\`;
            }
        }
        // --- Đáp án DẠNG 3 / PHẦN III: Trả lời ngắn (NÂNG CẤP: câu hỏi độc lập) ---
        if (hasTraLoiNgan) {
            const totalSA = getTotalY('traLoiNgan');
            if (totalSA > 0) {
                if (!isContinuousAK) globalAnswerIndex = 1;
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
        }

        // --- Đáp án PHẦN II TỰ LUẬN / PHẦN IV: Tự Luận ---
        if (hasTuLuan) {
            const totalTL = getTotalY('tuLuan');
            const soCauTL = Math.ceil(totalTL / 3);
            if (soCauTL > 0) {
                if (!isContinuousAK) globalAnswerIndex = 1;
                const phanTL = hasTraLoiNgan ? 4 : 3;
                // Tiêu đề đáp án tự luận — dynamic theo mode
                if (isMinistry) {
                  const sectionTitle = hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";
                  html += `<p class="bold">${sectionTitle}</p>`;
                } else if (hasTuLuanModeAK) {
                  html += `<p class="bold" style="font-size:15pt;">PHẦN II. TỰ LUẬN</p>`;
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
                        if (p.da) cauTotalRows += p.da.split(\'\\n').filter(l => l.trim() !== '').length;
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
                            p.da.split(\'\\n').filter(l => l.trim() !== '').forEach(line => {
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
            }
        }
    }

    html += `</div></body></html>`;

    // Lưu dưới dạng .doc để kích hoạt bộ render Equation của Word
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    saveAs(blob, `Ma_Tran_Dac_Ta_De_Thi_${examHeader.monHoc || 'Chuan'}.doc`);
};