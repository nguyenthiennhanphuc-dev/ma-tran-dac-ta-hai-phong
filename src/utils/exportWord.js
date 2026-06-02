import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, PageOrientation, HeadingLevel, TableLayoutType, BorderStyle, ImageRun, TabStopType, TabStopPosition } from 'docx';
import { saveAs } from 'file-saver';
import { useExamStore } from '../store/useExamStore';

// ═══════════════════════════════════════════════════════════════════
// HELPER: Vẽ đồ thị trên Canvas → PNG bytes (CLIENT-SIDE, không cần backend)
// ═══════════════════════════════════════════════════════════════════
import { renderGraphToBytes } from './renderGraphToBytes';

// Alias để giữ tên hàm cũ — tất cả chỗ gọi fetchGraphImage không cần sửa
async function fetchGraphImage(hinhAnh) {
  return renderGraphToBytes(hinhAnh);
}

// Helper: Tạo Paragraph chèn ảnh graph vào Word
function createGraphParagraph(imageData) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data: imageData,
        transformation: { width: 400, height: 300 },
        type: 'png',
      })
    ]
  });
}

const createCell = (text, bold = false, align = AlignmentType.CENTER, rowSpan = 1, colSpan = 1, bgColor = "") => {
  // NV2_P3: Xóa hiển thị số "0" trong Bảng Ma Trận & Đặc Tả
  const displayValue = (text === 0 || text === '0' || text === 0.0) ? "" : text;

  return new TableCell({
    rowSpan: rowSpan,
    columnSpan: colSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: bgColor ? { fill: bgColor } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(displayValue !== undefined && displayValue !== null ? displayValue : ""), bold: bold, font: "Times New Roman", size: 26 })],
      }),
    ],
  });
};

// KHAI BÁO BỘ VIỀN BẢNG CHUẨN ĐẸP (Giống hệt ảnh mẫu)
const standardBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

// =================================================================
// BỘ DỊCH THUẬT MARKDOWN CỦA AI SANG ĐỊNH DẠNG WORD CHUẨN
// =================================================================
const parseMarkdownToDocx = (text) => {
  const paragraphs = [];
  const lines = text.split('\n');

  lines.forEach(line => {
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      return;
    }

    let isHeader = false;
    let cleanLine = line;

    if (cleanLine.startsWith('### ')) {
      isHeader = true; cleanLine = cleanLine.replace('### ', '');
    } else if (cleanLine.startsWith('## ')) {
      isHeader = true; cleanLine = cleanLine.replace('## ', '');
    } else if (cleanLine.startsWith('# ')) {
      isHeader = true; cleanLine = cleanLine.replace('# ', '');
    }

    const parts = cleanLine.split('**');
    const textRuns = parts.map((part, index) => {
      return new TextRun({
        text: part,
        bold: isHeader || index % 2 === 1,
        size: isHeader ? 28 : 28,
        font: "Times New Roman"
      });
    });

    paragraphs.push(new Paragraph({
      children: textRuns,
      alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 120 }
    }));
  });

  return paragraphs;
};

// Helper: Đảm bảo text kết thúc bằng dấu chấm
const ensureDotDocx = (s) => {
    if (!s) return s;
    const t = s.trim();
    if (!t || t.endsWith('.') || t.endsWith('?') || t.endsWith('!')) return t;
    return t + '.';
};

// Helper: Đo độ dài text thuần để xác định PA ngắn/dài
const plainTextLenDocx = (s) => {
    if (!s) return 0;
    return String(s).replace(/\$[^$]*\$/g, 'X').trim().length;
};

// Helper: Clean PA text
const cleanPA = (v) => String(v || '').replace(/^\s*\*\s*/, '').replace(/\s*\*\s*$/, '').trim();

// Helper: Tạo paragraphs cho phương án với layout thông minh (4PA/2PA/1PA mỗi dòng)
const buildOptionParagraphs = (dapAnA, dapAnB, dapAnC, dapAnD, fontSize = 28) => {
    const a = cleanPA(dapAnA), b = cleanPA(dapAnB), c = cleanPA(dapAnC), d = cleanPA(dapAnD);
    const da = ensureDotDocx(a), db = ensureDotDocx(b), dc = ensureDotDocx(c), dd = ensureDotDocx(d);
    const maxLen = Math.max(plainTextLenDocx(a), plainTextLenDocx(b), plainTextLenDocx(c), plainTextLenDocx(d));
    const paras = [];
    
    if (maxLen <= 15 && da && db && dc && dd) {
        // 4 PA trên 1 dòng
        paras.push(new Paragraph({
            tabStops: [{ type: TabStopType.LEFT, position: 3500 }, { type: TabStopType.LEFT, position: 7000 }, { type: TabStopType.LEFT, position: 10500 }],
            children: [
                new TextRun({ text: 'A. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: da, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: '\tB. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: db, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: '\tC. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: dc, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: '\tD. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: dd, size: fontSize, font: 'Times New Roman' }),
            ],
            spacing: { after: 120 }
        }));
    } else if (maxLen <= 30 && da && db && dc && dd) {
        // 2 PA trên 1 dòng
        paras.push(new Paragraph({
            tabStops: [{ type: TabStopType.LEFT, position: 7000 }],
            children: [
                new TextRun({ text: 'A. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: da, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: '\tB. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: db, size: fontSize, font: 'Times New Roman' }),
            ],
            spacing: { after: 40 }
        }));
        paras.push(new Paragraph({
            tabStops: [{ type: TabStopType.LEFT, position: 7000 }],
            children: [
                new TextRun({ text: 'C. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: dc, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: '\tD. ', bold: true, size: fontSize, font: 'Times New Roman' }),
                new TextRun({ text: dd, size: fontSize, font: 'Times New Roman' }),
            ],
            spacing: { after: 120 }
        }));
    } else {
        // 1 PA trên 1 dòng (giữ nguyên logic cũ)
        if (da) paras.push(new Paragraph({ children: [new TextRun({ text: 'A. ', bold: true, size: fontSize, font: 'Times New Roman' }), new TextRun({ text: da, size: fontSize, font: 'Times New Roman' })], spacing: { after: 40 } }));
        if (db) paras.push(new Paragraph({ children: [new TextRun({ text: 'B. ', bold: true, size: fontSize, font: 'Times New Roman' }), new TextRun({ text: db, size: fontSize, font: 'Times New Roman' })], spacing: { after: 40 } }));
        if (dc) paras.push(new Paragraph({ children: [new TextRun({ text: 'C. ', bold: true, size: fontSize, font: 'Times New Roman' }), new TextRun({ text: dc, size: fontSize, font: 'Times New Roman' })], spacing: { after: 40 } }));
        if (dd) paras.push(new Paragraph({ children: [new TextRun({ text: 'D. ', bold: true, size: fontSize, font: 'Times New Roman' }), new TextRun({ text: dd, size: fontSize, font: 'Times New Roman' })], spacing: { after: 120 } }));
    }
    return paras;
};

export const exportToWord = async () => {
  const { matrix, config, examConfig, examHeader, generatedExam, examSlots } = useExamStore.getState();
  const isMinistry = config.exportTemplate === 'ministry';
  const cleanMonHoc = (examHeader.monHoc || "").replace(/^Môn\s*:\s*|^Môn\s+/i, '').trim().toUpperCase();
  const cleanThoiGian = (examHeader.thoiGian || "").replace(/^(?:thời gian(?: làm bài)?\s*:\s*|làm bài\s*:\s*)/i, '').trim();

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
    const count = type === 'dungSai' && level === 'vanDung' 
        ? ((Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0))
        : (Number(dv[type]?.[level]) || 0);
    
    if (count === 0) return null;
    
    const inds = [];
    for (let i = 0; i < count; i++) {
        const ind = dv.indicatorMap[`${type}_${level}_${i}`];
        if (ind) inds.push(ind);
    }
    const unique = [...new Set(inds)];
    return unique.length > 0 ? unique.join(', ') : null;
  };

  const createCellWithIndicator = (val, level, dv, type) => {
    if (val === 0 || val === '0' || val === 0.0 || val === undefined) return createCell("");
    let indicator = getIndicatorsForCell(dv, type, level);
    if (!indicator) {
      if (isToanMon) indicator = getMathIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
    }
    if (!indicator || config.showCompetencySymbol === false) return createCell(val);
    
    return new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(val), font: 'Times New Roman', size: 26 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `(${indicator})`, font: 'Times New Roman', size: 20, color: '555555' })] }),
      ],
    });
  };

  const sumCount = (type, level) => matrix.reduce((sum, topic) => {
    return sum + (topic.donViKienThuc || []).reduce((s2, dv) => s2 + (Number(dv[type]?.[level]) || 0), 0);
  }, 0);

  const getTopicSum = (topic, type, level) => (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv[type]?.[level]) || 0), 0);

  const getTopicLevelCount = (topic, level) => getTopicSum(topic, 'nhieuLuaChon', level) + getTopicSum(topic, 'dungSai', level) + (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) : 0) + getTopicSum(topic, 'tuLuan', level);
  const getLevelTotalItems = (level) => sumCount('nhieuLuaChon', level) + sumCount('dungSai', level) + (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) + sumCount('tuLuan', level);
  const getLevelTotalQuestions = (level) => sumCount('nhieuLuaChon', level) + (sumCount('dungSai', level) * 0.25) + (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) + sumCount('tuLuan', level);

  const getTopicTuLuanPoints = (topic) => (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0), 0);

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
        (config.hasTuLuan ? (topic.donViKienThuc || []).reduce((s, dv) => s + (Number(dv.tuLuan?.[tlKey]) || 0), 0) : 0);
    }, 0);
  };
  const getGrandTotalPoints = () => getLevelTotalPoints('biet') + getLevelTotalPoints('hieu') + getLevelTotalPoints('vanDung');

  // ==================== BẢNG 1: MA TRẬN ====================
  const matrixRows = [];
  matrixRows.push(new TableRow({
    children: [
      createCell("TT", true, AlignmentType.CENTER, 4, 1, "E2E8F0"), createCell("Chủ đề/Chương", true, AlignmentType.CENTER, 4, 1, "E2E8F0"), createCell("Nội dung/Đơn vị KT", true, AlignmentType.CENTER, 4, 1, "E2E8F0"),
      createCell("Mức độ đánh giá", true, AlignmentType.CENTER, 1, config.hasTuLuan ? 12 : 9, "E2E8F0"), createCell("Tổng (Ý)", true, AlignmentType.CENTER, 3, 3, "E2E8F0"), createCell("Tỉ lệ %", true, AlignmentType.CENTER, 4, 1, "E2E8F0")
    ]
  }));
  const r2 = [createCell("TNKQ", true, AlignmentType.CENTER, 1, 9, "DBEAFE")];
  if (config.hasTuLuan) r2.push(createCell("Tự luận", true, AlignmentType.CENTER, 2, 3, "DCFCE7"));
  matrixRows.push(new TableRow({ children: r2 }));

  matrixRows.push(new TableRow({ children: [createCell("Nhiều lựa chọn", true, AlignmentType.CENTER, 1, 3, "BFDBFE"), createCell("Đúng - Sai (Ý)", true, AlignmentType.CENTER, 1, 3, "BFDBFE"), createCell("Trả lời ngắn (Ý)", true, AlignmentType.CENTER, 1, 3, "BFDBFE")] }));

  const r4 = [
    createCell("B", false), createCell("H", false), createCell("VD", false), createCell("B", false), createCell("H", false), createCell("VD", false),
    createCell("B", false), createCell("H", false), createCell("VD", false)
  ];
  if (config.hasTuLuan) r4.push(createCell("B", false), createCell("H", false), createCell("VD", false));
  r4.push(createCell("B", false, AlignmentType.CENTER, 1, 1, "FFEDD5"), createCell("H", false, AlignmentType.CENTER, 1, 1, "FFEDD5"), createCell("VD", false, AlignmentType.CENTER, 1, 1, "FFEDD5"));
  matrixRows.push(new TableRow({ children: r4 }));

  // Helper: Tính tổng ý/câu của 1 mức nhận thức cho 1 ĐVKT
  const getDvLevelCount = (dv, level) => {
    return (Number(dv.nhieuLuaChon?.[level]) || 0) +
      (Number(dv.dungSai?.[level]) || 0) +
      (config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0) +
      (config.hasTuLuan ? (Number(dv.tuLuan?.[level]) || 0) : 0);
  };

  // Helper: Format tổng per ĐVKT dạng "1c+ 2 ý" (NLC = câu, ĐS/TLN/TL = ý) — giống UI
  const formatDvLevelSummaryWord = (dv, level) => {
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

  // Helper: Tính tổng điểm của 1 ĐVKT
  const getDvTotalPoints = (dv) => {
    const nlc = ((Number(dv.nhieuLuaChon?.biet) || 0) + (Number(dv.nhieuLuaChon?.hieu) || 0) + (Number(dv.nhieuLuaChon?.vanDung) || 0)) * examConfig.diemMoiCauP1;
    const ds = ((Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0)) * examConfig.diemMoiYP2;
    const tln = config.hasTraLoiNgan ? ((Number(dv.traLoiNgan?.biet) || 0) + (Number(dv.traLoiNgan?.hieu) || 0) + (Number(dv.traLoiNgan?.vanDung) || 0)) * examConfig.diemMoiYP3 : 0;
    const tl = config.hasTuLuan ? (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0) : 0;
    return nlc + ds + tln + tl;
  };

  matrix.forEach((topic, index) => {
    const dvList = topic.donViKienThuc || [];
    const dvCount = dvList.length;

    dvList.forEach((dv, dvIdx) => {
      const isFirst = dvIdx === 0;
      const cells = [];

      if (isFirst) {
        cells.push(createCell(index + 1, false, AlignmentType.CENTER, dvCount, 1));
        cells.push(createCell(topic.tenChuDe, false, AlignmentType.LEFT, dvCount, 1));
      }

      cells.push(createCell(dv.noiDung ? `- ${dv.noiDung}` : '', false, AlignmentType.LEFT));

      cells.push(createCellWithIndicator(dv.nhieuLuaChon?.biet || 0, 'biet', dv, 'nhieuLuaChon'));
      cells.push(createCellWithIndicator(dv.nhieuLuaChon?.hieu || 0, 'hieu', dv, 'nhieuLuaChon'));
      cells.push(createCellWithIndicator(dv.nhieuLuaChon?.vanDung || 0, 'vanDung', dv, 'nhieuLuaChon'));
      cells.push(createCellWithIndicator(dv.dungSai?.biet || 0, 'biet', dv, 'dungSai'));
      cells.push(createCellWithIndicator(dv.dungSai?.hieu || 0, 'hieu', dv, 'dungSai'));
      cells.push(createCellWithIndicator((Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0), 'vanDung', dv, 'dungSai'));
      cells.push(createCellWithIndicator(config.hasTraLoiNgan ? (dv.traLoiNgan?.biet || 0) : 0, 'biet', dv, 'traLoiNgan'));
      cells.push(createCellWithIndicator(config.hasTraLoiNgan ? (dv.traLoiNgan?.hieu || 0) : 0, 'hieu', dv, 'traLoiNgan'));
      cells.push(createCellWithIndicator(config.hasTraLoiNgan ? (dv.traLoiNgan?.vanDung || 0) : 0, 'vanDung', dv, 'traLoiNgan'));
      if (config.hasTuLuan) {
        cells.push(createCellWithIndicator(dv.tuLuan?.biet || 0, 'biet', dv, 'tuLuan'));
        cells.push(createCellWithIndicator(dv.tuLuan?.hieu || 0, 'hieu', dv, 'tuLuan'));
        cells.push(createCellWithIndicator(dv.tuLuan?.vanDung || 0, 'vanDung', dv, 'tuLuan'));
      }

      // 4 CỘT CUỐI: Tổng B, H, VD và Tỉ lệ % — FORMAT GIỐNG UI: "1c+ 2 ý"
      cells.push(createCell(formatDvLevelSummaryWord(dv, 'biet'), true, AlignmentType.CENTER, 1, 1, "FFEDD5"));
      cells.push(createCell(formatDvLevelSummaryWord(dv, 'hieu'), true, AlignmentType.CENTER, 1, 1, "FFEDD5"));
      cells.push(createCell(formatDvLevelSummaryWord(dv, 'vanDung'), true, AlignmentType.CENTER, 1, 1, "FFEDD5"));
      const dvTotalPoints = getDvTotalPoints(dv);
      const dvPercent = ((dvTotalPoints / 10) * 100).toFixed(1).replace('.0', '') + "%";
      cells.push(createCell(dvPercent, true, AlignmentType.CENTER));

      matrixRows.push(new TableRow({ children: cells }));
    });
  });

  const t1 = [
    createCell("Tổng (Ý)", true, AlignmentType.CENTER, 1, 3, "E2E8F0"), createCell(sumCount('nhieuLuaChon', 'biet')), createCell(sumCount('nhieuLuaChon', 'hieu')), createCell(sumCount('nhieuLuaChon', 'vanDung')), createCell(sumCount('dungSai', 'biet')), createCell(sumCount('dungSai', 'hieu')), createCell(sumCount('dungSai', 'vanDung')), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)
  ];
  if (config.hasTuLuan) t1.push(createCell(sumCount('tuLuan', 'biet')), createCell(sumCount('tuLuan', 'hieu')), createCell(sumCount('tuLuan', 'vanDung')));
  t1.push(createCell(getLevelTotalItems('biet'), true, AlignmentType.CENTER), createCell(getLevelTotalItems('hieu'), true, AlignmentType.CENTER), createCell(getLevelTotalItems('vanDung'), true, AlignmentType.CENTER), createCell("", false));
  matrixRows.push(new TableRow({ children: t1 }));

  // Helpers: Format dòng "Tổng số câu" chi tiết
  const fmtDsCau = (level) => {
    const y = sumCount('dungSai', level);
    if (y === 0) return 0;
    const cau = y * 0.25;
    const cauStr = cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
    return `${cauStr} (${y} \u00fd)`;
  };
  const fmtTongCau = (level) => {
    const c = sumCount('nhieuLuaChon', level);
    const y = sumCount('dungSai', level) +
      (config.hasTraLoiNgan ? sumCount('traLoiNgan', level) : 0) +
      (config.hasTuLuan ? sumCount('tuLuan', level) : 0);
    if (c === 0 && y === 0) return 0;
    if (c > 0 && y === 0) return `${c}`;
    if (c === 0 && y > 0) return `${y} \u00fd`;
    return `${c}c+ ${y} \u00fd`;
  };
  const grandTotalCau = getLevelTotalQuestions('biet') + getLevelTotalQuestions('hieu') + getLevelTotalQuestions('vanDung');

  const t2 = [
    createCell("T\u1ed5ng s\u1ed1 c\u00e2u", true, AlignmentType.RIGHT, 1, 3, "F1F5F9"), createCell(sumCount('nhieuLuaChon', 'biet'), true, AlignmentType.CENTER), createCell(sumCount('nhieuLuaChon', 'hieu'), true, AlignmentType.CENTER), createCell(sumCount('nhieuLuaChon', 'vanDung'), true, AlignmentType.CENTER), createCell(fmtDsCau('biet'), true, AlignmentType.CENTER), createCell(fmtDsCau('hieu'), true, AlignmentType.CENTER), createCell(fmtDsCau('vanDung'), true, AlignmentType.CENTER), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0, true, AlignmentType.CENTER), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0, true, AlignmentType.CENTER), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0, true, AlignmentType.CENTER)
  ];
  if (config.hasTuLuan) t2.push(createCell(sumCount('tuLuan', 'biet'), true, AlignmentType.CENTER), createCell(sumCount('tuLuan', 'hieu'), true, AlignmentType.CENTER), createCell(sumCount('tuLuan', 'vanDung'), true, AlignmentType.CENTER));
  t2.push(createCell(fmtTongCau('biet'), true, AlignmentType.CENTER), createCell(fmtTongCau('hieu'), true, AlignmentType.CENTER), createCell(fmtTongCau('vanDung'), true, AlignmentType.CENTER), createCell(grandTotalCau, true, AlignmentType.CENTER));
  matrixRows.push(new TableRow({ children: t2 }));

  const t3 = [
    createCell("Tổng điểm", true, AlignmentType.CENTER, 1, 3, "CBD5E1"), createCell(getColumnTotalPoints('nhieuLuaChon'), true, AlignmentType.CENTER, 1, 3), createCell(getColumnTotalPoints('dungSai'), true, AlignmentType.CENTER, 1, 3), createCell(getColumnTotalPoints('traLoiNgan'), true, AlignmentType.CENTER, 1, 3)
  ];
  if (config.hasTuLuan) t3.push(createCell(getColumnTotalPoints('tuLuan'), true, AlignmentType.CENTER, 1, 3));
  t3.push(createCell(getLevelTotalPoints('biet'), true, AlignmentType.CENTER), createCell(getLevelTotalPoints('hieu'), true, AlignmentType.CENTER), createCell(getLevelTotalPoints('vanDung'), true, AlignmentType.CENTER), createCell(getGrandTotalPoints(), true, AlignmentType.CENTER));
  matrixRows.push(new TableRow({ children: t3 }));

  const t4 = [
    createCell("Tỉ lệ %", true, AlignmentType.CENTER, 1, 3, "E2E8F0"), createCell(((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3), createCell(((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3), createCell(config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + "%" : "0%", true, AlignmentType.CENTER, 1, 3)
  ];
  if (config.hasTuLuan) t4.push(createCell(((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3));
  t4.push(createCell(((getLevelTotalPoints('biet') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER), createCell(((getLevelTotalPoints('hieu') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER), createCell(((getLevelTotalPoints('vanDung') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER), createCell(((getGrandTotalPoints() / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER));
  matrixRows.push(new TableRow({ children: t4 }));

  // ==================== BẢNG 2: ĐẶC TẢ ====================
  // Helper: Format giá trị kèm mã năng lực (hỗ trợ mã chuyên môn HH/TD/GQ...)
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

  // === TÍNH MAP CÂU SỐ TRONG KHUNG ĐỀ CHO TỪNG Ô ===
  const qMap = {};
  const isCont = config.isContinuousNumbering;
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
  if (config.hasTuLuan) {
    const totalTLN = config.hasTraLoiNgan ? sumCount('traLoiNgan','biet') + sumCount('traLoiNgan','hieu') + sumCount('traLoiNgan','vanDung') : 0;
    let tlC = isCont ? (dsCauStart + totalDSCau + totalTLN) : 1;
    matrix.forEach((t, ti) => {
      (t.donViKienThuc || []).forEach((dv, di) => {
        ['biet','hieu','vanDung'].forEach(lvl => {
          const n = Number(dv.tuLuan?.[lvl]) || 0;
          if (n > 0) { qMap[`${ti}_${di}_tl_${lvl}`] = { s: tlC, e: tlC + n - 1 }; tlC += n; }
        });
      });
    });
  }
  // Helper: tạo cell với giá trị + câu số ở dòng dưới
  const createCellWithQ = (val, qKey) => {
    const q = qMap[qKey];
    if (!q || val === 0 || val === '0') return createCell(val);
    const qLabel = q.s === q.e ? `Câu ${q.s}` : `Câu ${q.s}-${q.e}`;
    return new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(val), font: 'Times New Roman', size: 26 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: qLabel, font: 'Times New Roman', size: 22, color: '555555' })] }),
      ],
    });
  };

  const specRows = [];
  specRows.push(new TableRow({ children: [
    createCell("TT", true, AlignmentType.CENTER, 4, 1, "E2E8F0"), createCell("Chủ đề/Chương", true, AlignmentType.CENTER, 4, 1, "E2E8F0"), createCell("Nội dung/Đơn vị KT", true, AlignmentType.CENTER, 4, 1, "E2E8F0"), createCell("Yêu cầu cần đạt", true, AlignmentType.CENTER, 4, 1, "FEF08A"), createCell("Số câu hỏi ở các mức độ", true, AlignmentType.CENTER, 1, config.hasTuLuan ? 12 : 9, "E2E8F0")
  ] }));
  const sr2 = [createCell("TNKQ", true, AlignmentType.CENTER, 1, 9, "DBEAFE")];
  if (config.hasTuLuan) sr2.push(createCell("Tự luận", true, AlignmentType.CENTER, 2, 3, "DCFCE7"));
  specRows.push(new TableRow({ children: sr2 }));
  specRows.push(new TableRow({ children: [createCell("Nhiều lựa chọn", true, AlignmentType.CENTER, 1, 3, "BFDBFE"), createCell("Đúng - Sai (Ý)", true, AlignmentType.CENTER, 1, 3, "BFDBFE"), createCell("Trả lời ngắn (Ý)", true, AlignmentType.CENTER, 1, 3, "BFDBFE")] }));
  const sr4 = [createCell("B", false), createCell("H", false), createCell("VD", false), createCell("B", false), createCell("H", false), createCell("VD", false), createCell("B", false), createCell("H", false), createCell("VD", false)];
  if (config.hasTuLuan) sr4.push(createCell("B", false), createCell("H", false), createCell("VD", false));
  specRows.push(new TableRow({ children: sr4 }));

  matrix.forEach((topic, index) => {
    const dvList = topic.donViKienThuc || [];
    const dvCount = dvList.length;

    dvList.forEach((dv, dvIdx) => {
      const isFirst = dvIdx === 0;
      const cells = [];

      if (isFirst) {
        cells.push(createCell(index + 1, false, AlignmentType.CENTER, dvCount, 1));
        cells.push(createCell(topic.tenChuDe, false, AlignmentType.LEFT, dvCount, 1));
      }

      cells.push(createCell(dv.noiDung ? `- ${dv.noiDung}` : '', false, AlignmentType.LEFT));

      const ycP = (dv.yeuCauCanDat || "").split('\n').map(line => new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: line, font: "Times New Roman", size: 26 })] }));
      cells.push(new TableCell({
        children: ycP.length > 0 ? ycP : [new Paragraph("")]
      }));

      // Cột NLC — kèm mã năng lực (NT/TH/VD hoặc HH1.x/TD1.x) + câu số
      cells.push(createCellWithQ(fmtNLC(dv.nhieuLuaChon?.biet, 'biet', dv, 'nhieuLuaChon'), `${index}_${dvIdx}_nlc_biet`));
      cells.push(createCellWithQ(fmtNLC(dv.nhieuLuaChon?.hieu, 'hieu', dv, 'nhieuLuaChon'), `${index}_${dvIdx}_nlc_hieu`));
      cells.push(createCellWithQ(fmtNLC(dv.nhieuLuaChon?.vanDung, 'vanDung', dv, 'nhieuLuaChon'), `${index}_${dvIdx}_nlc_vanDung`));
      // Cột ĐS — kèm "ý" + mã năng lực + câu số
      cells.push(createCellWithQ(fmtY(dv.dungSai?.biet, 'biet', dv, 'dungSai'), `${index}_${dvIdx}_ds_biet`));
      cells.push(createCellWithQ(fmtY(dv.dungSai?.hieu, 'hieu', dv, 'dungSai'), `${index}_${dvIdx}_ds_hieu`));
      cells.push(createCellWithQ(fmtY(dv.dungSai?.vanDung, 'vanDung', dv, 'dungSai'), `${index}_${dvIdx}_ds_vanDung`));
      // Cột TLN — kèm "ý" + mã năng lực + câu số
      cells.push(config.hasTraLoiNgan ? createCellWithQ(fmtY(dv.traLoiNgan?.biet, 'biet', dv, 'traLoiNgan'), `${index}_${dvIdx}_tln_biet`) : createCell(0));
      cells.push(config.hasTraLoiNgan ? createCellWithQ(fmtY(dv.traLoiNgan?.hieu, 'hieu', dv, 'traLoiNgan'), `${index}_${dvIdx}_tln_hieu`) : createCell(0));
      cells.push(config.hasTraLoiNgan ? createCellWithQ(fmtY(dv.traLoiNgan?.vanDung, 'vanDung', dv, 'traLoiNgan'), `${index}_${dvIdx}_tln_vanDung`) : createCell(0));
      if (config.hasTuLuan) {
        // Cột TL — kèm "ý" + mã năng lực + câu số
        cells.push(createCellWithQ(fmtY(dv.tuLuan?.biet, 'biet', dv, 'tuLuan'), `${index}_${dvIdx}_tl_biet`));
        cells.push(createCellWithQ(fmtY(dv.tuLuan?.hieu, 'hieu', dv, 'tuLuan'), `${index}_${dvIdx}_tl_hieu`));
        cells.push(createCellWithQ(fmtY(dv.tuLuan?.vanDung, 'vanDung', dv, 'tuLuan'), `${index}_${dvIdx}_tl_vanDung`));
      }

      specRows.push(new TableRow({ children: cells }));
    });
  });

  const tot1 = [
    createCell("Tổng (Ý)", true, AlignmentType.CENTER, 1, 4, "E2E8F0"), createCell(sumCount('nhieuLuaChon', 'biet')), createCell(sumCount('nhieuLuaChon', 'hieu')), createCell(sumCount('nhieuLuaChon', 'vanDung')), createCell(sumCount('dungSai', 'biet')), createCell(sumCount('dungSai', 'hieu')), createCell(sumCount('dungSai', 'vanDung')), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)
  ];
  if (config.hasTuLuan) tot1.push(createCell(sumCount('tuLuan', 'biet')), createCell(sumCount('tuLuan', 'hieu')), createCell(sumCount('tuLuan', 'vanDung')));
  specRows.push(new TableRow({ children: tot1 }));

  const tot2 = [
    createCell("Tổng số câu", true, AlignmentType.CENTER, 1, 4, "F1F5F9"), createCell(sumCount('nhieuLuaChon', 'biet')), createCell(sumCount('nhieuLuaChon', 'hieu')), createCell(sumCount('nhieuLuaChon', 'vanDung')), createCell(sumCount('dungSai', 'biet') * 0.25), createCell(sumCount('dungSai', 'hieu') * 0.25), createCell(sumCount('dungSai', 'vanDung') * 0.25), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'biet') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'hieu') : 0), createCell(config.hasTraLoiNgan ? sumCount('traLoiNgan', 'vanDung') : 0)
  ];
  if (config.hasTuLuan) tot2.push(createCell(sumCount('tuLuan', 'biet')), createCell(sumCount('tuLuan', 'hieu')), createCell(sumCount('tuLuan', 'vanDung')));
  specRows.push(new TableRow({ children: tot2 }));
  const specTotDiem = [
    createCell("Tổng điểm", true, AlignmentType.CENTER, 1, 4, "CBD5E1"), createCell(getColumnTotalPoints('nhieuLuaChon'), true, AlignmentType.CENTER, 1, 3), createCell(getColumnTotalPoints('dungSai'), true, AlignmentType.CENTER, 1, 3), createCell(config.hasTraLoiNgan ? getColumnTotalPoints('traLoiNgan') : 0, true, AlignmentType.CENTER, 1, 3)
  ];
  if (config.hasTuLuan) specTotDiem.push(createCell(getColumnTotalPoints('tuLuan'), true, AlignmentType.CENTER, 1, 3));
  specRows.push(new TableRow({ children: specTotDiem }));

  const specTotTiLe = [
    createCell("Tỉ lệ %", true, AlignmentType.CENTER, 1, 4, "E2E8F0"), createCell(((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3), createCell(((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3), createCell(config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + "%" : "0%", true, AlignmentType.CENTER, 1, 3)
  ];
  if (config.hasTuLuan) specTotTiLe.push(createCell(((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '') + "%", true, AlignmentType.CENTER, 1, 3));
  specRows.push(new TableRow({ children: specTotTiLe }));

  // ==================== BẢNG 3: KHUNG ĐỀ THI / ĐỀ THI AI ====================
  let examParagraphs = [
    new Paragraph({ text: "3. KHUNG ĐỀ KIỂM TRA", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { before: 600, after: 300 } })
  ];

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

  if (generatedExam && generatedExam.trim() !== '') {
    const aiParagraphs = parseMarkdownToDocx(generatedExam);
    examParagraphs = examParagraphs.concat(aiParagraphs);
  } else {
    // ---- ĐÂY LÀ PHẦN XUẤT KHUNG ĐỀ (TỪ examSlots HOẶC PLACEHOLDER) ----
    const getFlatItems = (typeKey) => {
      let items = [];
      matrix.forEach(t => {
        (t.donViKienThuc || []).forEach(dv => {
          ['biet', 'hieu', 'vanDung'].forEach(lvl => {
            const numQ = Number(dv[typeKey]?.[lvl]) || 0;
            for (let i = 0; i < numQ; i++) {
              items.push({ topic: t.tenChuDe || "Chưa nhập", dvkt: dv.noiDung || '', level: lvl === 'biet' ? 'Nhận biết' : lvl === 'hieu' ? 'Thông hiểu' : 'Vận dụng' });
            }
          });
        });
      });
      return items;
    };

    const alphabet = ['a)', 'b)', 'c)', 'd)', 'e)', 'f)'];

    const cleanText = (str) => {
      if (!str) return '';
      let s = str;
      // Xóa metadata dạng [Chủ đề: ..., Mức độ: ...]
      s = s.replace(/\s*\[.*?\]\s*/g, '');
      // Xóa phần Đáp án / Giải thích bị dính inline (cùng dòng hoặc xuống dòng)
      // Pattern: **Đáp án đúng: ...** **Giải thích:** ... (hoặc không có **)
      s = s.replace(/\s*\*{0,2}\s*(?:Đáp án đúng|Đáp án|Trả lời|Giải thích|Hướng dẫn giải|Hướng dẫn chấm)\s*[:.)]*\s*\*{0,2}\s*[\s\S]*$/i, '');
      // Xóa dấu ** markdown bold còn sót
      s = s.replace(/\*\*/g, '');
      return s.trim();
    };

    // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐỀ THI)
    let globalQuestionIndex = 1;
    const isContinuous = config.isContinuousNumbering;

    // === LOGIC TIÊU ĐỀ PHẦN ĐỘNG THEO TỰ LUẬN ===
    const hasTuLuanMode = config.hasTuLuan;

    // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — BỎ QUA khi mẫu Bộ 2025
    if (hasTuLuanMode && !isMinistry) {
      examParagraphs.push(new Paragraph({ children: [new TextRun({ text: "PHẦN I. TRẮC NGHIỆM", bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 200 } }));
    }

    const totalMCQ = getTotalY('nhieuLuaChon');
    if (totalMCQ > 0) {
      // Tiêu đề Dạng 1
      let d1Title = hasTuLuanMode
        ? "DẠNG 1. Câu trắc nghiệm nhiều phương án lựa chọn"
        : "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn";
      let d1Desc = "Học sinh khoanh tròn chữ cái đứng trước câu trả lời đúng:";
      if (isMinistry) {
        d1Title = "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.";
        d1Desc = ` Thí sinh trả lời từ câu 1 đến câu ${totalMCQ}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`;
      }
      if (isMinistry) {
        examParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: d1Title, bold: true, size: 28, font: "Times New Roman" }),
            new TextRun({ text: d1Desc, size: 28, font: "Times New Roman" })
          ],
          spacing: { before: 300, after: 60 }
        }));
      } else {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Title, bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d1Desc, italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 200 } }));
      }
      const mcqFlatItems = getFlatItems('nhieuLuaChon');
      const diemMoiCauP1Str = String(examConfig.diemMoiCauP1).replace('.', ',');
      for (let i = 0; i < totalMCQ; i++) {
        const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
        const slotKey = `phan1_cau${i + 1}`;
        const slotData = examSlots[slotKey];
        if (slotData) {
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP1Str} điểm). `, bold: true, size: 28, font: "Times New Roman" })), new TextRun({ text: cleanText(slotData.noiDung) || '', size: 28, font: "Times New Roman" })], spacing: { after: 80 } }));
          // Render phương án với layout thông minh (bold ký hiệu + dấu chấm + 4PA/2PA/1PA)
          const optParas = buildOptionParagraphs(slotData.dapAnA, slotData.dapAnB, slotData.dapAnC, slotData.dapAnD, 28);
          optParas.forEach(p => examParagraphs.push(p));
          // Chèn hình Matplotlib nếu câu hỏi có hinhAnh
          if (slotData.hinhAnh) {
            const imgData = await fetchGraphImage(slotData.hinhAnh);
            if (imgData) examParagraphs.push(createGraphParagraph(imgData));
          }
        } else {
          const item = mcqFlatItems[i];
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP1Str} điểm). `, bold: true, size: 28, font: "Times New Roman" })), new TextRun({ text: item ? `[${item.topic} - Mức độ: ${item.level}]` : '', italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 100 } }));
          examParagraphs.push(new Paragraph({ text: "(Ghi nội dung câu hỏi vào đây...)\n", spacing: { after: 200 } }));
        }
      }
    }

    const totalTF = getTotalY('dungSai');
    const soCauTF = Math.ceil(totalTF / 4);
    if (soCauTF > 0) {
      // Reset nếu không liên tục
      if (!isContinuous) globalQuestionIndex = 1;
      // Tính điểm cho mỗi câu Đúng/Sai (4 ý × diemMoiYP2)
      const diemMoiCauP2 = (4 * examConfig.diemMoiYP2);
      const diemMoiCauP2Str = String(diemMoiCauP2).replace('.', ',');
      // Tiêu đề Dạng 2
      let d2Title = hasTuLuanMode
        ? "DẠNG 2. Câu trắc nghiệm đúng/sai"
        : "PHẦN II. Câu trắc nghiệm đúng sai";
      let d2Desc = "Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng ghi (Đ) hoặc sai ghi (S) vào bài làm.";
      if (isMinistry) {
        d2Title = "PHẦN II. Câu trắc nghiệm đúng sai.";
        const startQ = isContinuous ? globalQuestionIndex : 1;
        const endQ = startQ + soCauTF - 1;
        d2Desc = ` Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;
      }
      if (isMinistry) {
        examParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: d2Title, bold: true, size: 28, font: "Times New Roman" }),
            new TextRun({ text: d2Desc, size: 28, font: "Times New Roman" })
          ],
          spacing: { before: 300, after: 60 }
        }));
      } else {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Title, bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d2Desc, italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 200 } }));
      }
      const tfFlatItems = getFlatItems('dungSai');
      for (let i = 0; i < soCauTF; i++) {
        const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
        const slotKey = `phan2_cau${i + 1}`;
        const slotData = examSlots[slotKey];
        if (slotData) {
          // In câu hỏi chung (đề bài/tình huống)
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP2Str} điểm). `, bold: true, size: 28, font: "Times New Roman" })), new TextRun({ text: cleanText(slotData.noiDung) || '', size: 28, font: "Times New Roman" })], spacing: { after: 120 } }));
          // Chèn hình Matplotlib nếu câu hỏi Đúng/Sai có hinhAnh
          if (slotData.hinhAnh) {
            const imgData = await fetchGraphImage(slotData.hinhAnh);
            if (imgData) examParagraphs.push(createGraphParagraph(imgData));
          }
          // Vẽ bảng Nhận định / Đ-S hoặc in đoạn thường theo chuẩn Bộ
          if (isMinistry) {
            const tfYKeys = [['a.', slotData.yA], ['b.', slotData.yB], ['c.', slotData.yC], ['d.', slotData.yD]];
            tfYKeys.forEach(([label, content]) => {
              if (content) {
                examParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: `${label} ${cleanText(content)}`, size: 28, font: "Times New Roman" })],
                  indent: { left: 720 },
                  spacing: { after: 60 }
                }));
              }
            });
          } else {
            const tfTableRows = [];
            // Header row
            tfTableRows.push(new TableRow({
              children: [
                new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nhận định", bold: true, size: 28, font: "Times New Roman" })] })] }),
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đ/S", bold: true, size: 28, font: "Times New Roman" })] })] }),
              ]
            }));
            // Data rows
            const tfYKeys = [['a)', slotData.yA], ['b)', slotData.yB], ['c)', slotData.yC], ['d)', slotData.yD]];
            tfYKeys.forEach(([label, content]) => {
              if (content) {
                tfTableRows.push(new TableRow({
                  children: [
                    new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: `${label} ${cleanText(content)}`, size: 28, font: "Times New Roman" })], spacing: { after: 40 } })] }),
                    new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 28, font: "Times New Roman" })] })] }),
                  ]
                }));
              }
            });
            examParagraphs.push(new Table({
              rows: tfTableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: standardBorders,
            }));
          }
          examParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else {
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP2Str} điểm). `, bold: true, size: 28, font: "Times New Roman" }))], spacing: { after: 100 } }));
          // Placeholder: vẽ bảng trống
          const tfPlaceholderRows = [];
          tfPlaceholderRows.push(new TableRow({
            children: [
              new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nhận định", bold: true, size: 28, font: "Times New Roman" })] })] }),
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đ/S", bold: true, size: 28, font: "Times New Roman" })] })] }),
            ]
          }));
          for (let j = 0; j < 4; j++) {
            const flatIdx = i * 4 + j;
            const item = tfFlatItems[flatIdx];
            tfPlaceholderRows.push(new TableRow({
              children: [
                new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: `${alphabet[j]} ${item ? `[${item.topic} - Mức độ: ${item.level}]` : ''}`, size: 28, font: "Times New Roman" })], spacing: { after: 40 } })] }),
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 28, font: "Times New Roman" })] })] }),
              ]
            }));
          }
          examParagraphs.push(new Table({
            rows: tfPlaceholderRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders,
          }));
          examParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
      }
    }

    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      // NÂNG CẤP: Dạng 3 giờ là câu hỏi ĐỘC LẬP, 1 câu = 1 noiDung + 1 dapAnDung
      if (totalSA > 0) {
        // Reset nếu không liên tục
        if (!isContinuous) globalQuestionIndex = 1;
        const diemMoiCauP3Str = String(examConfig.diemMoiYP3).replace('.', ',');
        const dotsFill = '.........................................';
        // Tiêu đề Dạng 3
        let d3Title = hasTuLuanMode
          ? "DẠNG 3. Câu trả lời ngắn"
          : "PHẦN III. Câu trắc nghiệm trả lời ngắn";
        let d3Desc = "Học sinh trả lời các câu hỏi bằng cách ghi lại kết quả bằng con số vào bài thi.";
        if (isMinistry) {
          d3Title = "PHẦN III. Câu trắc nghiệm trả lời ngắn.";
          const startQ = isContinuous ? globalQuestionIndex : 1;
          const endQ = startQ + totalSA - 1;
          d3Desc = ` Thí sinh trả lời từ câu ${startQ} đến câu ${endQ}.`;
        }
        if (isMinistry) {
          examParagraphs.push(new Paragraph({
            children: [
              new TextRun({ text: d3Title, bold: true, size: 28, font: "Times New Roman" }),
              new TextRun({ text: d3Desc, size: 28, font: "Times New Roman" })
            ],
            spacing: { before: 300, after: 60 }
          }));
        } else {
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Title, bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 60 } }));
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: d3Desc, italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 200 } }));
        }
        const saFlatItems = getFlatItems('traLoiNgan');
        for (let i = 0; i < totalSA; i++) {
          const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
          const slotKey = `phan3_cau${i + 1}`;
          const slotData = examSlots[slotKey];
          if (slotData) {
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP3Str} điểm). `, bold: true, size: 28, font: "Times New Roman" })), new TextRun({ text: cleanText(slotData.noiDung) || '', size: 28, font: "Times New Roman" })], spacing: { after: 80 } }));
            // Chèn hình Matplotlib nếu câu Trả lời ngắn có hinhAnh
            if (slotData.hinhAnh) {
              const imgData = await fetchGraphImage(slotData.hinhAnh);
              if (imgData) examParagraphs.push(createGraphParagraph(imgData));
            }
            if (!isMinistry) {
              examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `   ${dotsFill}`, size: 28, font: "Times New Roman" })], spacing: { after: 200 } }));
            } else {
              // Add an empty paragraph for spacing
              examParagraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
            }
          } else {
            const item = saFlatItems[i];
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" }), (isMinistry ? new TextRun({ text: '. ', bold: true, size: 28, font: "Times New Roman" }) : new TextRun({ text: `(${diemMoiCauP3Str} điểm). `, bold: true, size: 28, font: "Times New Roman" })), new TextRun({ text: item ? `[${item.topic} - Mức độ: ${item.level}]` : '', italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 80 } }));
            if (!isMinistry) {
              examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `   ${dotsFill}`, size: 28, font: "Times New Roman" })], spacing: { after: 200 } }));
            } else {
              // Add an empty paragraph for spacing
              examParagraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
            }
          }
        }
      }
    }

    const soCauTL = computeTLCauCount();
    if (soCauTL > 0) {
      // Reset nếu không liên tục
      if (!isContinuous) globalQuestionIndex = 1;
      const phanTL = config.hasTraLoiNgan ? 4 : 3;
      // PHẦN II: TỰ LUẬN (nếu có Tự luận) hoặc PHẦN IV/III (nếu không) — BỎ QUA wrapper khi mẫu Bộ 2025
      if (isMinistry) {
        const tlSectionTitle = config.hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN IV. Câu hỏi tự luận";
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: tlSectionTitle, bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 200 } }));
      } else if (hasTuLuanMode) {
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: "PHẦN II. TỰ LUẬN", bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 200 } }));
      } else {
        const sectionTitle = config.hasTraLoiNgan ? "PHẦN IV. Câu hỏi tự luận" : "PHẦN III. Câu hỏi tự luận";
        examParagraphs.push(new Paragraph({ children: [new TextRun({ text: sectionTitle, bold: true, size: 28, font: "Times New Roman" })], spacing: { before: 300, after: 200 } }));
      }
      const tlFlatItems = getFlatItems('tuLuan');
      for (let i = 0; i < soCauTL; i++) {
        const displayNum = isContinuous ? globalQuestionIndex++ : (i + 1);
        const slotKey = `phan${phanTL}_cau${i + 1}`;
        const slotData = examSlots[slotKey];
        if (slotData) {
          const hasBothParts = !!(slotData.yA && slotData.yB);
          if (hasBothParts) {
            // Có 2 ý a/b → in tiêu đề câu rồi in từng ý
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}.`, bold: true, size: 28, font: "Times New Roman" })], spacing: { after: 80 } }));
            if (slotData.hinhAnh) {
              const imgData = await fetchGraphImage(slotData.hinhAnh);
              if (imgData) examParagraphs.push(createGraphParagraph(imgData));
            }
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: 'a) ', bold: true, size: 28, font: "Times New Roman" }), new TextRun({ text: slotData.yA, size: 28, font: "Times New Roman" })], indent: { left: 400 }, spacing: { after: 80 } }));
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: 'b) ', bold: true, size: 28, font: "Times New Roman" }), new TextRun({ text: slotData.yB, size: 28, font: "Times New Roman" })], indent: { left: 400 }, spacing: { after: 80 } }));
          } else {
            // 1 ý hoặc chỉ noiDung → in trực tiếp Câu X. nội dung
            const content = slotData.yA || slotData.noiDung || '';
            examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}. `, bold: true, size: 28, font: "Times New Roman" }), new TextRun({ text: content, size: 28, font: "Times New Roman" })], spacing: { after: 80 } }));
            if (slotData.hinhAnh) {
              const imgData = await fetchGraphImage(slotData.hinhAnh);
              if (imgData) examParagraphs.push(createGraphParagraph(imgData));
            }
          }
          examParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else {
          const item = tlFlatItems[i];
          examParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Câu ${displayNum}. `, bold: true, size: 28, font: "Times New Roman" }), new TextRun({ text: item ? `[${item.topic} - Mức độ: ${item.level}]` : '', italics: true, size: 28, font: "Times New Roman" })], spacing: { after: 100 } }));
          examParagraphs.push(new Paragraph({ text: "(Ghi nội dung câu hỏi vào đây...)\n", spacing: { after: 200 } }));
        }
      }
    }
  }

  // ======================================================================
  // SECTION MỚI: HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM (ĐÃ FIX UI & LỖI MẤT TỰ LUẬN)
  // ======================================================================
  let answerKeyParagraphs = [];
  const hasAnySlotData = Object.keys(examSlots).length > 0;

  if (hasAnySlotData) {
    answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    // === HEADER ĐÁP ÁN CHUẨN BỘ 2025 ===
    if (isMinistry) {
      // Bảng 2 cột không viền cho đáp án header
      answerKeyParagraphs.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [new TableRow({ children: [
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.soGD || "", bold: true, size: 28, font: "Times New Roman" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.truong || "", bold: true, size: 28, font: "Times New Roman", underline: { type: "single" } })] }),
          ] }),
          new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `ĐÁP ÁN ĐỀ KIỂM TRA`, bold: true, size: 28, font: "Times New Roman" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Môn: ${cleanMonHoc}`, bold: true, size: 28, font: "Times New Roman" })] }),
          ] }),
        ] })],
      }));
      answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    } else {
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM", bold: true, size: 28, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 400 }
      }));
    }

    // BIẾN ĐẾM TOÀN CỤC CHO ĐÁNH SỐ CÂU HỎI LIÊN TỤC (ĐÁP ÁN)
    let globalAnswerIndex = 1;
    const isContinuousAK = config.isContinuousNumbering;
    const hasTuLuanModeAK = config.hasTuLuan;

    // PHẦN I: TRẮC NGHIỆM (nếu có Tự luận) — cho đáp án — BỎ QUA khi mẫu Bộ 2025
    if (hasTuLuanModeAK && !isMinistry) {
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "PHẦN I. TRẮC NGHIỆM", bold: true, size: 28, font: "Times New Roman" })],
        spacing: { before: 200, after: 150 }
      }));
    }

    // ---------- DẠNG 1 / PHẦN I: BẢNG ĐÁP ÁN TRẮC NGHIỆM ----------
    const totalMCQ = getTotalY('nhieuLuaChon');
    if (totalMCQ > 0) {
      const d1TitleAK = isMinistry
        ? `Phần I.`
        : hasTuLuanModeAK
          ? `DẠNG 1. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${examConfig.diemMoiCauP1} điểm)`
          : `PHẦN I. Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu ${examConfig.diemMoiCauP1} điểm)`;
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: d1TitleAK, bold: true, size: 28, font: "Times New Roman" })],
        spacing: { before: 200, after: 80 }
      }));
      if (isMinistry) {
        const diemP1Str = String(examConfig.diemMoiCauP1).replace('.', ',');
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: `(Mỗi câu trả lời đúng thí sinh được ${diemP1Str} điểm)`, italics: true, size: 28, font: "Times New Roman" })],
          spacing: { after: 150 }
        }));
      }

      const headerCells = [createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0")];
      const answerCells = [createCell("Đáp án", true, AlignmentType.CENTER, 1, 1, "E2E8F0")];

      for (let i = 0; i < totalMCQ; i++) {
        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
        headerCells.push(createCell(displayNum, true));
        const slotData = examSlots[`phan1_cau${i + 1}`];
        answerCells.push(createCell(String(slotData?.dapAnDung || '...').replace(/\*/g, ''), false));
      }

      answerKeyParagraphs.push(new Table({
        rows: [
          new TableRow({ children: headerCells }),
          new TableRow({ children: answerCells }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: standardBorders // BẬT VIỀN ĐẸP
      }));
      answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      // Chèn hình đồ thị vào đáp án trắc nghiệm (nếu câu có hinhAnh)
      for (let i = 0; i < totalMCQ; i++) {
        const slotData = examSlots[`phan1_cau${i + 1}`];
        if (slotData?.hinhAnh) {
          const imgData = await fetchGraphImage(slotData.hinhAnh);
          if (imgData) {
            answerKeyParagraphs.push(new Paragraph({
              children: [new TextRun({ text: `Hình minh họa Câu ${i + 1}:`, bold: true, italics: true, size: 20, font: "Times New Roman" })],
              spacing: { before: 80, after: 40 }
            }));
            answerKeyParagraphs.push(createGraphParagraph(imgData));
          }
        }
      }
    }

    // ---------- DẠNG 2 / PHẦN II: ĐÁP ÁN ĐÚNG/SAI ----------
    const totalTF = getTotalY('dungSai');
    const soCauTF = Math.ceil(totalTF / 4);
    if (soCauTF > 0) {
      if (!isContinuousAK) globalAnswerIndex = 1;
      const d2TitleAK = isMinistry
        ? `Phần II`
        : hasTuLuanModeAK
          ? `DẠNG 2. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được ${examConfig.diemMoiYP2} điểm)`
          : `PHẦN II. Trắc nghiệm Đúng/Sai (Mỗi ý đúng được ${examConfig.diemMoiYP2} điểm)`;
      
      answerKeyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: d2TitleAK, bold: true, size: 28, font: "Times New Roman" })],
        spacing: { before: 200, after: 80 }
      }));

      if (isMinistry) {
        // Text guide exactly as image
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "Điểm tối đa của 01 câu hỏi là 1 điểm.", size: 28, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 01 ý trong 1 câu hỏi được 0,1 điểm.", size: 28, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 02 ý trong 1 câu hỏi được 0,25 điểm.", size: 28, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh chỉ lựa chọn chính xác 03 ý trong 1 câu hỏi được 0,50 điểm.", size: 28, font: "Times New Roman" })],
          spacing: { after: 60 }
        }));
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "- Thí sinh lựa chọn chính xác cả 04 ý trong 1 câu hỏi được 1 điểm.", size: 28, font: "Times New Roman" })],
          spacing: { after: 150 }
        }));

        const tfHeaderRow = new TableRow({
          children: [
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Lệnh hỏi", true, AlignmentType.CENTER, 1, 1, null),
            createCell("Đáp án (Đ/S)", true, AlignmentType.CENTER, 1, 1, null),
          ]
        });

        const tfDataRows = [];
        for (let i = 0; i < soCauTF; i += 2) {
          const idx1 = i;
          const idx2 = i + 1;
          
          const num1 = isContinuousAK ? globalAnswerIndex++ : (idx1 + 1);
          const slotData1 = examSlots[`phan2_cau${idx1 + 1}`];
          const raw1 = (slotData1?.dapAnDung || '').replace(/\*/g, '');
          const parts1 = raw1.split(',').map(s => s.trim());
          const dapAn1 = [parts1[0] || '...', parts1[1] || '...', parts1[2] || '...', parts1[3] || '...'];

          let num2 = "";
          let dapAn2 = ["", "", "", ""];
          if (idx2 < soCauTF) {
            num2 = isContinuousAK ? globalAnswerIndex++ : (idx2 + 1);
            const slotData2 = examSlots[`phan2_cau${idx2 + 1}`];
            const raw2 = (slotData2?.dapAnDung || '').replace(/\*/g, '');
            const parts2 = raw2.split(',').map(s => s.trim());
            dapAn2 = [parts2[0] || '...', parts2[1] || '...', parts2[2] || '...', parts2[3] || '...'];
          }

          const labels = ['a', 'b', 'c', 'd'];
          for (let r = 0; r < 4; r++) {
            const rowChildren = [];
            
            // Cột 1-3
            if (r === 0) {
              rowChildren.push(createCell(num1, true, AlignmentType.CENTER));
            } else {
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
            }
            rowChildren.push(createCell(labels[r], false, AlignmentType.CENTER));
            rowChildren.push(createCell(dapAn1[r], false, AlignmentType.CENTER));

            // Cột 4-6
            if (idx2 < soCauTF) {
              if (r === 0) {
                rowChildren.push(createCell(num2, true, AlignmentType.CENTER));
              } else {
                rowChildren.push(createCell("", false, AlignmentType.CENTER));
              }
              rowChildren.push(createCell(labels[r], false, AlignmentType.CENTER));
              rowChildren.push(createCell(dapAn2[r], false, AlignmentType.CENTER));
            } else {
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
              rowChildren.push(createCell("", false, AlignmentType.CENTER));
            }

            tfDataRows.push(new TableRow({ children: rowChildren }));
          }
        }

        answerKeyParagraphs.push(new Table({
          rows: [tfHeaderRow, ...tfDataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      } else {
        // ORIGINAL LOGIC (5 columns)
        const tfHeaderRow = new TableRow({
          children: [
            createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý a", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý b", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý c", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
            createCell("Ý d", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          ]
        });
        const tfDataRows = [];
        for (let i = 0; i < soCauTF; i++) {
          const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
          const slotData = examSlots[`phan2_cau${i + 1}`];
          const raw = (slotData?.dapAnDung || '').replace(/\*/g, '');
          const parts = raw.split(',').map(s => s.trim());
          const yA = parts[0] || '...';
          const yB = parts[1] || '...';
          const yC = parts[2] || '...';
          const yD = parts[3] || '...';
          tfDataRows.push(new TableRow({
            children: [
              createCell(displayNum, true),
              createCell(yA, false),
              createCell(yB, false),
              createCell(yC, false),
              createCell(yD, false),
            ]
          }));
        }
        answerKeyParagraphs.push(new Table({
          rows: [tfHeaderRow, ...tfDataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders
        }));
        answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

        // Chèn hình đồ thị vào đáp án Đúng/Sai (nếu câu có hinhAnh)
        for (let i = 0; i < soCauTF; i++) {
          const slotData = examSlots[`phan2_cau${i + 1}`];
          if (slotData?.hinhAnh) {
            const imgData = await fetchGraphImage(slotData.hinhAnh);
            if (imgData) {
              answerKeyParagraphs.push(new Paragraph({
                children: [new TextRun({ text: `Hình minh họa Câu ${i + 1} (Đúng/Sai):`, bold: true, italics: true, size: 20, font: "Times New Roman" })],
                spacing: { before: 80, after: 40 }
              }));
              answerKeyParagraphs.push(createGraphParagraph(imgData));
            }
          }
        }
      }
    }


    // ---------- DẠNG 3 / PHẦN III: ĐÁP ÁN TRẢ LỜI NGẮN ----------
    if (config.hasTraLoiNgan) {
      const totalSA = getTotalY('traLoiNgan');
      if (totalSA > 0) {
        if (!isContinuousAK) globalAnswerIndex = 1;
        if (isMinistry) {
          const diemMoiCauP3Str = String(examConfig.diemMoiYP3).replace('.', ',');
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: "Phần III", bold: true, size: 28, font: "Times New Roman" })],
            spacing: { before: 200, after: 60 }
          }));
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: `(Mỗi câu trả lời đúng thí sinh được ${diemMoiCauP3Str} điểm)`, italics: true, size: 28, font: "Times New Roman" })],
            spacing: { after: 150 }
          }));
          
          const saHeaderRow = new TableRow({
            children: [
              createCell("Câu", true),
              createCell("Đáp án", true),
              createCell("Câu", true),
              createCell("Đáp án", true)
            ]
          });
          
          const saDataRows = [];
          const cellsArray = [];
          for (let i = 0; i < totalSA; i++) {
            const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
            const slotData = examSlots[`phan3_cau${i + 1}`];
            const dapAn = slotData?.dapAnDung ? String(slotData.dapAnDung).replace(/\*\*/g, '').trim() : '...';
            cellsArray.push(displayNum);
            cellsArray.push(dapAn);
          }
          
          for (let i = 0; i < cellsArray.length; i += 4) {
            const rowChildren = [];
            for(let j=0; j<4; j++){
              if(i+j < cellsArray.length){
                rowChildren.push(createCell(cellsArray[i+j], false));
              } else {
                rowChildren.push(createCell("", false));
              }
            }
            saDataRows.push(new TableRow({ children: rowChildren }));
          }
          
          answerKeyParagraphs.push(new Table({
            rows: [saHeaderRow, ...saDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders // BẬT VIỀN ĐẸP
          }));
          answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else {
          const d3TitleAK = hasTuLuanModeAK
            ? `DẠNG 3. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng được ${examConfig.diemMoiYP3} điểm)`
            : `PHẦN III. Trắc nghiệm Trả lời ngắn (Mỗi câu đúng được ${examConfig.diemMoiYP3} điểm)`;
          answerKeyParagraphs.push(new Paragraph({
            children: [new TextRun({ text: d3TitleAK, bold: true, size: 28, font: "Times New Roman" })],
            spacing: { before: 200, after: 150 }
          }));

          for (let i = 0; i < totalSA; i++) {
            const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
            const slotData = examSlots[`phan3_cau${i + 1}`];
            const dapAn = slotData?.dapAnDung || '...';
            answerKeyParagraphs.push(new Paragraph({
              children: [
                new TextRun({ text: `Câu ${displayNum}: `, bold: true, size: 28, font: "Times New Roman" }),
                new TextRun({ text: String(dapAn).replace(/\*\*/g, '').trim(), size: 28, font: "Times New Roman" })
              ],
              spacing: { after: 60 }
            }));
            // In giải thích nếu có
            if (slotData?.giaiThich) {
              answerKeyParagraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: `Giải thích: `, bold: true, italics: true, size: 28, font: "Times New Roman" }),
                  new TextRun({ text: slotData.giaiThich.replace(/\*\*/g, '').trim(), italics: true, size: 28, font: "Times New Roman" })
                ],
                spacing: { after: 120 }
              }));
            }
          }
          answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

          // Chèn hình đồ thị vào đáp án Trả lời ngắn (nếu câu có hinhAnh)
          for (let i = 0; i < totalSA; i++) {
            const slotData2 = examSlots[`phan3_cau${i + 1}`];
            if (slotData2?.hinhAnh) {
              const imgData = await fetchGraphImage(slotData2.hinhAnh);
              if (imgData) {
                answerKeyParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: `Hình minh họa Câu ${i + 1} (Trả lời ngắn):`, bold: true, italics: true, size: 20, font: "Times New Roman" })],
                  spacing: { before: 80, after: 40 }
                }));
                answerKeyParagraphs.push(createGraphParagraph(imgData));
              }
            }
          }
        }
      }
    }
    // ---------- PHẦN II TỰ LUẬN / PHẦN IV: ĐÁP ÁN TỰ LUẬN (MỖI Ý = 1 CÂU ĐỘC LẬP) ----------
    const soCauTL = computeTLCauCount();
    if (soCauTL > 0) {
      if (!isContinuousAK) globalAnswerIndex = 1;
      const phanTL = config.hasTraLoiNgan ? 4 : 3;
      // Tiêu đề đáp án tự luận — dynamic theo mode
      if (hasTuLuanModeAK) {
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: "PHẦN II. TỰ LUẬN", bold: true, size: 28, font: "Times New Roman" })],
          spacing: { before: 200, after: 150 }
        }));
      } else {
        const sectionTitle = config.hasTraLoiNgan ? "PHẦN IV. Tự luận" : "PHẦN III. Tự luận";
        answerKeyParagraphs.push(new Paragraph({
          children: [new TextRun({ text: sectionTitle, bold: true, size: 28, font: "Times New Roman" })],
          spacing: { before: 200, after: 150 }
        }));
      }

      const tlHeaderRow = new TableRow({
        children: [
          createCell("Câu", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Nội dung đáp án", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
          createCell("Điểm", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
        ]
      });

      const tlDataRows = [];

      for (let i = 0; i < soCauTL; i++) {
        const displayNum = isContinuousAK ? globalAnswerIndex++ : (i + 1);
        const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
        if (!slotData) continue;

        // FORMAT MỚI: dapAn + diem (mỗi câu TL = 1 câu độc lập)
        let yParts = [];
        if (slotData.dapAn && slotData.dapAn.trim() !== '') {
          // Format mới: dùng dapAn trực tiếp
          yParts.push({ label: '', y: '', da: slotData.dapAn, di: slotData.diem || '' });
        } else {
           // Fallback format: yA/dapAnA/diemA
          const hasBothPartsAK = !!(slotData.yA && slotData.yB);
          if (hasBothPartsAK) {
            // 2 ý → giữ label a, b
            yParts = [
              { label: 'a', y: slotData.yA, da: slotData.dapAnA, di: slotData.diemA },
              { label: 'b', y: slotData.yB, da: slotData.dapAnB, di: slotData.diemB },
            ].filter(p => (p.y && p.y.trim() !== '') || (p.da && p.da.trim() !== ''));
          } else {
            // 1 ý → bỏ label a
            yParts = [
              { label: '', y: slotData.yA || '', da: slotData.dapAnA || '', di: slotData.diemA || '' },
            ].filter(p => (p.y && p.y.trim() !== '') || (p.da && p.da.trim() !== ''));
          }

          // NẾU CÂU HỎI KHÔNG CHIA Ý A, B, C MÀ VIẾT THẲNG VÀO NỘI DUNG CHÍNH
          if (yParts.length === 0) {
            const generalAnswer = slotData.dapAnDung || slotData.dapAnA || slotData.noiDung;
            if (generalAnswer) {
              yParts.push({ label: '', y: '', da: generalAnswer, di: slotData.diemA || '' });
            } else {
              continue;
            }
          }
        }

        let totalRowsForCau = 0;
        yParts.forEach(p => {
          if (p.y || p.label) totalRowsForCau += 1;
          if (p.da) {
            const dapAnLines = p.da.split('\n').filter(l => l.trim() !== '');
            totalRowsForCau += dapAnLines.length;
          }
        });

        // Nếu câu hỏi không có bất kỳ dòng nội dung/đáp án nào, gán tạm 1 dòng để tránh vỡ bảng
        if (totalRowsForCau === 0) totalRowsForCau = 1;

        let isFirstRowOfCau = true;

        yParts.forEach((p) => {
          // --- In dòng tiêu đề ý (Ví dụ: a) ... ) ---
          if (p.y || p.label) {
            const yTitleCells = [];
            if (isFirstRowOfCau) {
              yTitleCells.push(new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                rowSpan: totalRowsForCau,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" })]
                })]
              }));
              isFirstRowOfCau = false;
            }

            const labelStr = p.label ? `${p.label}) ` : '';
            yTitleCells.push(new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: `${labelStr}${p.y || ''}`, bold: true, size: 28, font: "Times New Roman" })],
                spacing: { after: 40 }
              })]
            }));

            yTitleCells.push(new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "", size: 28, font: "Times New Roman" })]
              })]
            }));
            tlDataRows.push(new TableRow({ children: yTitleCells }));
          }

          // --- In các dòng đáp án chi tiết và cắt điểm ---
          if (p.da) {
            const dapAnLines = p.da.split('\n').filter(l => l.trim() !== '');
            dapAnLines.forEach(line => {
              let noiDungPart = line.trim();
              let diemPart = '';

              const pipeIdx = noiDungPart.indexOf('||');
              if (pipeIdx !== -1) {
                diemPart = noiDungPart.substring(pipeIdx + 2).trim();
                noiDungPart = noiDungPart.substring(0, pipeIdx).trim();
              } else {
                const parenMatch = noiDungPart.match(/^(.*?)\s*\(([0-9.,]+)\s*(?:điểm|đ)?\)\s*$/);
                if (parenMatch) {
                  noiDungPart = parenMatch[1].trim();
                  diemPart = parenMatch[2].trim();
                }
              }

              const lineCells = [];
              if (isFirstRowOfCau) {
                lineCells.push(new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  rowSpan: totalRowsForCau,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Câu ${displayNum}`, bold: true, size: 28, font: "Times New Roman" })]
                  })]
                }));
                isFirstRowOfCau = false;
              }

              lineCells.push(new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  // Căn lề trái nội dung đáp án giống hệt ảnh mẫu
                  alignment: AlignmentType.LEFT,
                  children: [new TextRun({ text: noiDungPart, size: 28, font: "Times New Roman" })],
                  spacing: { after: 40 }
                })]
              }));

              lineCells.push(new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: diemPart, bold: true, size: 28, font: "Times New Roman" })]
                })]
              }));
              tlDataRows.push(new TableRow({ children: lineCells }));
            });
          }
        });

        // Xử lý dòng "Hướng dẫn chấm chung" (gộp cột 2 và 3)
        if (slotData.giaiThich) {
          const gtLines = slotData.giaiThich.split('\n');
          const gtParagraphs = gtLines.filter(l => l.trim() !== '').map(line =>
            new Paragraph({
              children: [new TextRun({ text: line.trim(), italics: true, size: 20, font: "Times New Roman" })],
              spacing: { after: 40 }
            })
          );

          if (gtParagraphs.length > 0) {
            tlDataRows.push(new TableRow({
              children: [
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [new Paragraph("")]
                }),
                new TableCell({
                  columnSpan: 2,
                  width: { size: 85, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: "Hướng dẫn chấm chung:", bold: true, italics: true, size: 20, font: "Times New Roman" })],
                      spacing: { after: 60 }
                    }),
                    ...gtParagraphs
                  ]
                })
              ]
            }));
          }
        }

      }

      answerKeyParagraphs.push(new Table({
        rows: [tlHeaderRow, ...tlDataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: standardBorders // BẬT VIỀN ĐẸP
      }));
      answerKeyParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      // Chèn hình đồ thị vào đáp án Tự luận (nếu câu có hinhAnh)
      for (let i = 0; i < soCauTL; i++) {
        const slotData = examSlots[`phan${phanTL}_cau${i + 1}`];
        if (slotData?.hinhAnh) {
          const imgData = await fetchGraphImage(slotData.hinhAnh);
          if (imgData) {
            answerKeyParagraphs.push(new Paragraph({
              children: [new TextRun({ text: `Hình minh họa Câu ${i + 1} (Tự luận):`, bold: true, italics: true, size: 20, font: "Times New Roman" })],
              spacing: { before: 80, after: 40 }
            }));
            answerKeyParagraphs.push(createGraphParagraph(imgData));
          }
        }
      }
    }
  }



  // ==================== KHỐI HEADER BÌA ĐỀ TÀNG HÌNH ====================
  // Tính tổng số câu hỏi để hiển thị ở header
  const tongSoCauHeader = (() => {
    let total = getTotalY('nhieuLuaChon');
    total += Math.ceil(getTotalY('dungSai') / 4);
    if (config.hasTraLoiNgan) total += getTotalY('traLoiNgan');
    total += computeTLCauCount();
    return total;
  })();

  const soTrangHeader = Math.max(2, Math.ceil(tongSoCauHeader / 10));

  // === HEADER CHUẨN BỘ 2025 (2 cột: trái = Sở/Bộ + Kỳ thi gạch chân + số trang, phải = tên đề + môn + thời gian) ===
  let headerLeftChildren, headerRightChildren;
  if (isMinistry) {
    headerLeftChildren = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.soGD || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.truong || "", bold: true, size: 28, font: "Times New Roman", underline: { type: "single" } })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `(Đề thi gồm ${String(soTrangHeader).padStart(2, '0')} trang)`, size: 28, font: "Times New Roman", italics: true })] }),
    ];
    headerRightChildren = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.kyThi || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Môn: ${cleanMonHoc}`, bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: `Thời gian làm bài: ${cleanThoiGian}, không kể thời gian phát đề`, size: 28, font: "Times New Roman", italics: true })] }),
    ];
  } else {
    headerLeftChildren = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.soGD || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.truong || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Mã đề: 01", bold: true, underline: { type: "single", color: "auto" }, size: 28, font: "Times New Roman" })] }),
    ];
    headerRightChildren = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.kyThi || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examHeader.namHoc || "", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MÔN: ${cleanMonHoc}`, bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Thời gian: ${examHeader.thoiGian || ""}`, size: 28, font: "Times New Roman", italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `(Đề kiểm tra gồm ${tongSoCauHeader} câu, 0${Math.ceil(tongSoCauHeader / 10)} trang)`, size: 28, font: "Times New Roman", italics: true })] }),
    ];
  }

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, borders: noBorders, children: headerLeftChildren }),
          new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, borders: noBorders, children: headerRightChildren }),
        ],
      }),
    ],
  });

  // === THÔNG TIN THÍ SINH (chỉ mẫu Bộ 2025) ===
  const studentInfoParagraphs = [];
  if (isMinistry) {
    studentInfoParagraphs.push(
      new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: "Họ, tên thí sinh: ...........................................................................", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Số báo danh: ................................................................................", bold: true, size: 28, font: "Times New Roman" })] })
    );
  }

  // === PHẦN KẾT THÚC ĐỀ (HẾT + quy định) - Chỉ mẫu Bộ 2025 ===
  const examEndParagraphs = [];
  if (isMinistry) {
    examEndParagraphs.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "------------------------- HẾT -------------------------", bold: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "- Thí sinh không được sử dụng tài liệu;", italics: true, size: 28, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "- Giám thị không giải thích gì thêm.", italics: true, size: 28, font: "Times New Roman" })] })
    );
  }

  // ==================== ĐÓNG GÓI VÀ LƯU FILE ====================
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
      children: [
        headerTable,
        ...studentInfoParagraphs,
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({ children: [new TextRun({ text: "1. MA TRẬN ĐỀ KIỂM TRA", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
        new Table({ 
          rows: matrixRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, 
          columnWidths: config.hasTuLuan 
            ? [500, 1100, 2200, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 500, 500, 500, 800]
            : [550, 1300, 2600, 530, 530, 530, 530, 530, 530, 530, 530, 530, 580, 580, 580, 900] 
        }),

        new Paragraph({ children: [new TextRun({ text: "2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { before: 600, after: 300 } }),
        new Table({ 
          rows: specRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, 
          columnWidths: config.hasTuLuan
            ? [500, 1500, 1500, 2400, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450]
            : [550, 1700, 1700, 2800, 530, 530, 530, 530, 530, 530, 530, 530, 530]
        }),

        // ==================== HƯỚNG DẪN MÃ HÓA NĂNG LỰC ====================
        new Paragraph({ text: "", spacing: { after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: "HƯỚNG DẪN MÃ HÓA NĂNG LỰC", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { before: 300, after: 200 } }),
        new Table({
          rows: [
            new TableRow({
              children: [
                createCell("Mã", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
                createCell("Ý nghĩa", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
                createCell("Mô tả", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              ]
            }),
            new TableRow({
              children: [
                createCell("NT", true), createCell("Nhận thức (Nhận biết)", false, AlignmentType.LEFT),
                createCell("Nhận biết, nhớ lại kiến thức đã học; nhận diện khái niệm, công thức, định nghĩa.", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("TH", true), createCell("Thông hiểu", false, AlignmentType.LEFT),
                createCell("Hiểu bản chất, giải thích, so sánh, phân tích; vận dụng kiến thức vào tình huống quen thuộc.", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("VD", true), createCell("Vận dụng", false, AlignmentType.LEFT),
                createCell("Vận dụng kiến thức, kĩ năng vào bối cảnh mới, tình huống thực tiễn; giải quyết vấn đề phức hợp, liên môn.", false, AlignmentType.LEFT),
              ]
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders,
        }),

        // ==================== BẢNG CHỈ BÁO NĂNG LỰC HÓA HỌC (NẾU MÔN HÓA) ====================
        ...(/hóa|hoá/i.test(examHeader?.monHoc || '') ? [
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: "BẢNG MÃ CHỈ BÁO NĂNG LỰC MÔN HÓA HỌC", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({
            rows: [
              new TableRow({ children: [createCell("Mã chỉ báo", true, AlignmentType.CENTER, 1, 1, "E2E8F0"), createCell("Nội dung", true, AlignmentType.CENTER, 1, 1, "E2E8F0")] }),
              new TableRow({ children: [createCell("I. Nhận thức hóa học (Mã HH1)", true, AlignmentType.LEFT, 1, 2, "DBEAFE")] }),
              new TableRow({ children: [createCell("HH1.1", true), createCell("Nhận biết và nêu được tên của các đối tượng, sự kiện, khái niệm hoặc quá trình hóa học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.2", true), createCell("Trình bày được sự kiện, đặc điểm, vai trò của các đối tượng, khái niệm hoặc quá trình hóa học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.3", true), createCell("Mô tả được đối tượng bằng các hình thức nói, viết, công thức, sơ đồ, biểu đồ, bảng.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.4", true), createCell("So sánh, phân loại, lựa chọn được các đối tượng, khái niệm hoặc quá trình hóa học theo các tiêu chí khác nhau.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.5", true), createCell("Phân tích được các khía cạnh của các đối tượng, khái niệm hoặc quá trình hóa học theo logic nhất định.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.6", true), createCell("Giải thích và lập luận được về mối quan hệ giữa các đối tượng, khái niệm hoặc quá trình hóa học (cấu tạo-tính chất, nguyên nhân-kết quả,...).", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.7", true), createCell("Tìm được từ khóa, sử dụng được thuật ngữ khoa học, kết nối được thông tin theo logic có ý nghĩa, lập được dàn ý khi đọc và trình bày các văn bản khoa học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH1.8", true), createCell("Thảo luận, đưa ra được những nhận định phê phán có liên quan đến chủ đề.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("II. Tìm hiểu thế giới tự nhiên dưới góc độ hóa học (Mã HH2)", true, AlignmentType.LEFT, 1, 2, "DCFCE7")] }),
              new TableRow({ children: [createCell("HH2.1", true), createCell("Đề xuất vấn đề: nhận ra và đặt được câu hỏi liên quan đến vấn đề; phân tích được bối cảnh để đề xuất vấn đề; biểu đạt được vấn đề.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH2.2", true), createCell("Đưa ra phán đoán và xây dựng giả thuyết: phân tích được vấn đề để nêu được phán đoán; xây dựng và phát biểu được giả thuyết nghiên cứu.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH2.3", true), createCell("Lập kế hoạch thực hiện: xây dựng được khung logic nội dung tìm hiểu; lựa chọn được phương pháp thích hợp; lập được kế hoạch triển khai tìm hiểu.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH2.4", true), createCell("Thực hiện kế hoạch: thu thập được sự kiện và chứng cứ; phân tích được dữ liệu nhằm chứng minh hay bác bỏ giả thuyết; rút ra được kết luận.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH2.5", true), createCell("Viết, trình bày báo cáo và thảo luận: sử dụng được ngôn ngữ, hình vẽ, sơ đồ, biểu bảng để biểu đạt quá trình và kết quả tìm hiểu.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("III. Vận dụng kiến thức, kĩ năng đã học (Mã HH3)", true, AlignmentType.LEFT, 1, 2, "FEF3C7")] }),
              new TableRow({ children: [createCell("HH3.1", true), createCell("Vận dụng được kiến thức hóa học để phát hiện, giải thích được một số hiện tượng tự nhiên, ứng dụng của hóa học trong cuộc sống.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH3.2", true), createCell("Vận dụng được kiến thức hóa học để phản biện, đánh giá ảnh hưởng của một vấn đề thực tiễn.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH3.3", true), createCell("Vận dụng được kiến thức tổng hợp để đánh giá ảnh hưởng của một vấn đề thực tiễn và đề xuất một số phương pháp, biện pháp, mô hình, kế hoạch giải quyết vấn đề.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH3.4", true), createCell("Định hướng được ngành, nghề sẽ chọn sau khi thi tốt nghiệp trung học phổ thông.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("HH3.5", true), createCell("Ứng xử thích hợp trong các tình huống có liên quan đến bản thân, gia đình và cộng đồng phù hợp với yêu cầu phát triển bền vững xã hội và bảo vệ môi trường.", false, AlignmentType.LEFT)] }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders,
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: "ĐỘNG TỪ MÔ TẢ CẤP ĐỘ TƯ DUY TRONG MÔN HÓA HỌC", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({
            rows: [
              new TableRow({ children: [createCell("Mức độ", true, AlignmentType.CENTER, 1, 1, "E2E8F0"), createCell("Động từ mô tả", true, AlignmentType.CENTER, 1, 1, "E2E8F0")] }),
              new TableRow({ children: [createCell("1. Biết\n(Nhận biết)", true), createCell("Gọi được tên, viết được, biểu diễn được, lập được (công thức hóa học, cấu hình electron,...), phát biểu được, phân biệt được, nêu được nội dung định luật/thuyết/khái niệm. Xác định được khối lượng mol, công thức hóa học. Tìm kiếm, tra cứu được thông tin trong bảng tuần hoàn, bảng tính tan, bảng enthalpy,...", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("2. Hiểu\n(Thông hiểu)", true), createCell("Trình bày được tính chất hóa học bằng ngôn ngữ cá nhân. Mô tả, nhận xét được thí nghiệm, giải thích được hiện tượng. Thực hiện được thí nghiệm, quan sát và rút ra kết luận. Phân tích được vấn đề dựa trên lí lẽ, lập luận. Phân loại được các loại chất. So sánh được đặc điểm giống/khác nhau. Dự đoán, giải thích được tính chất dựa vào cấu tạo, viết được phương trình hóa học chứng minh.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("3. Vận dụng", true), createCell("Vận dụng được kiến thức để giải thích, tính toán trong tình huống tương tự và tình huống mới. Đặt câu hỏi, phát hiện được hiện tượng thực tiễn và giải thích bằng kiến thức hóa học. Đề xuất được phương án thí nghiệm giải quyết tình huống thực tiễn. Phân tích được mối liên hệ giữa các đại lượng để giải quyết bài toán thực tiễn. Đề xuất được ý kiến phản biện, viết được báo cáo ngắn. Thuyết trình, thiết kế poster, xây dựng hồ sơ tư liệu, lập kế hoạch dự án học tập hoặc STEM.", false, AlignmentType.LEFT)] }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders,
          }),
        ] : []),

        // ==================== BẢNG CHỈ BÁO NĂNG LỰC TOÁN HỌC (NẾU MÔN TOÁN) ====================
        ...(/toán|toan/i.test(examHeader?.monHoc || '') ? [
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: "BẢNG MÃ CHỈ BÁO NĂNG LỰC MÔN TOÁN", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({
            rows: [
              new TableRow({ children: [createCell("Mã chỉ báo", true, AlignmentType.CENTER, 1, 1, "E2E8F0"), createCell("Nội dung", true, AlignmentType.CENTER, 1, 1, "E2E8F0")] }),
              new TableRow({ children: [createCell("I. Tư duy và Lập luận Toán học (Mã TD)", true, AlignmentType.LEFT, 1, 2, "DBEAFE")] }),
              new TableRow({ children: [createCell("TD1.1", true), createCell("Nhận biết được đối tượng, khái niệm, công thức Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD1.2", true), createCell("Nêu được định lí, giả thiết, kết luận; chứng minh được mệnh đề Toán học đơn giản.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD1.3", true), createCell("Lập luận được, suy diễn được trong quá trình giải Toán.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD2.1", true), createCell("Trình bày và giải thích được các tính chất, khái niệm Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD2.2", true), createCell("Vận dụng khái niệm, công thức để giải quyết vấn đề Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD3.1", true), createCell("Sử dụng công cụ Toán học để khảo sát, phân tích đối tượng.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("TD3.2", true), createCell("Lập luận và vận dụng Toán học để giải quyết bài toán phức tạp.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("II. Giải quyết vấn đề Toán học (Mã GQ)", true, AlignmentType.LEFT, 1, 2, "DCFCE7")] }),
              new TableRow({ children: [createCell("GQ1.1", true), createCell("Nhận biết và phát biểu được vấn đề từ tình huống thực tiễn.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ1.2", true), createCell("Đề xuất được cách giải quyết vấn đề trong tình huống quen thuộc.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ2.1", true), createCell("Phân tích tình huống, lựa chọn công cụ Toán học để giải quyết.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ2.2", true), createCell("Vận dụng được Toán học để giải quyết bài toán thực tiễn.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ3.1", true), createCell("Giải quyết được vấn đề trong tình huống tương đối phức tạp.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ3.2", true), createCell("Đánh giá được giải pháp đã đề xuất.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ4.1", true), createCell("Phối hợp nhiều công cụ Toán học để giải quyết vấn đề phức tạp.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ4.2", true), createCell("Đề xuất giải pháp cải tiến sau khi đánh giá.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GQ4.3", true), createCell("Giải quyết vấn đề trong tình huống mới, không quen thuộc.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("III. Mô hình hoá Toán học (Mã MH)", true, AlignmentType.LEFT, 1, 2, "FEF3C7")] }),
              new TableRow({ children: [createCell("MH1.1", true), createCell("Mô hình hoá được tình huống thực tiễn đơn giản bằng Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("MH1.2", true), createCell("Sử dụng mô hình Toán học để giải quyết bài toán đo đạc thực tế.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("MH2.1", true), createCell("Mô hình hoá bài toán đếm, xác suất từ tình huống thực tế.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("MH2.2", true), createCell("Mô hình hoá được bài toán tối ưu bằng công cụ Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("MH3.1", true), createCell("Xây dựng mô hình Toán học (tích phân, phương trình) cho bài toán thực tế.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("MH3.2", true), createCell("Mô hình hoá bài toán tăng trưởng, phân rã bằng hàm số.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("IV. Giao tiếp Toán học (Mã GT)", true, AlignmentType.LEFT, 1, 2, "F3E8FF")] }),
              new TableRow({ children: [createCell("GT1.1", true), createCell("Sử dụng được ngôn ngữ, ký hiệu Toán học để diễn đạt ý tưởng.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT1.2", true), createCell("Trình bày được ý nghĩa của đồ thị, bảng số liệu bằng ngôn ngữ nói/viết.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT2.1", true), createCell("Trình bày quá trình giải Toán bằng lập luận rõ ràng.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT2.2", true), createCell("Sử dụng biểu đồ, bảng để trình bày kết quả phân tích.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT3.1", true), createCell("Diễn đạt được ý nghĩa hình học, vật lí bằng ngôn ngữ Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT3.2", true), createCell("Trình bày mối liên hệ giữa các đối tượng Toán học.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("GT4", true), createCell("Sử dụng linh hoạt ngôn ngữ Toán học để trình bày, lập luận, bảo vệ ý tưởng.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("V. Công cụ và Phương tiện Toán học (Mã CC)", true, AlignmentType.LEFT, 1, 2, "FFE4E6")] }),
              new TableRow({ children: [createCell("CC1.1", true), createCell("Sử dụng được máy tính cầm tay để tính toán, vẽ đồ thị.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("CC1.2", true), createCell("Sử dụng phần mềm Toán học để minh hoạ, khám phá.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("CC2.1", true), createCell("Sử dụng công cụ tính toán để hỗ trợ giải bài toán.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("CC2.2", true), createCell("Sử dụng bảng tính để xử lý dữ liệu thống kê, xác suất.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("CC3.1", true), createCell("Sử dụng thành thạo công cụ Toán học cho bài toán phức tạp.", false, AlignmentType.LEFT)] }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders,
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: "ĐỘNG TỪ MÔ TẢ CẤP ĐỘ TƯ DUY TRONG MÔN TOÁN", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Table({
            rows: [
              new TableRow({ children: [createCell("Mức độ", true, AlignmentType.CENTER, 1, 1, "E2E8F0"), createCell("Động từ mô tả", true, AlignmentType.CENTER, 1, 1, "E2E8F0")] }),
              new TableRow({ children: [createCell("1. Biết\n(Nhận biết)", true), createCell("Nhận biết, nhận dạng, gọi tên, nêu được khái niệm, định nghĩa, định lí. Đọc và viết được ký hiệu toán học. Xác định được đối tượng, điều kiện. Liệt kê được các phần tử, tính chất. Biểu diễn được tập hợp, số, công thức. Vẽ được hình, đồ thị cơ bản.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("2. Hiểu\n(Thông hiểu)", true), createCell("Trình bày, giải thích được khái niệm, định lí, tính chất. Chứng minh được mệnh đề toán học đơn giản. So sánh, phân loại được đối tượng. Mô tả được mối quan hệ, xu hướng biến đổi. Lựa chọn được phương pháp giải phù hợp. Diễn đạt được ý nghĩa, bản chất của vấn đề.", false, AlignmentType.LEFT)] }),
              new TableRow({ children: [createCell("3. Vận dụng", true), createCell("Vận dụng được kiến thức để giải phương trình, bất phương trình, bài toán thực tiễn. Lập luận, suy diễn trong chứng minh và giải toán. Mô hình hoá tình huống thực tế bằng ngôn ngữ toán học. Giải quyết được vấn đề trong bối cảnh mới. Đánh giá, phản biện được lời giải. Sử dụng công cụ (máy tính, phần mềm) hỗ trợ giải toán và khám phá.", false, AlignmentType.LEFT)] }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: standardBorders,
          }),
        ] : []),

        new Paragraph({ text: "", spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Bảng quy ước mã hóa năng lực theo nhóm môn", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Table({
          rows: [
            new TableRow({
              children: [
                createCell("STT", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
                createCell("Nhóm môn", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
                createCell("Mã gợi ý", true, AlignmentType.CENTER, 1, 1, "E2E8F0"),
              ]
            }),
            new TableRow({
              children: [
                createCell("1"), createCell("KHTN (Vật lí, Hóa học, Sinh học)", false, AlignmentType.LEFT),
                createCell("NT – Nhận thức khoa học (trình bày, nhận biết khái niệm/định luật)\nTH – Tìm hiểu tự nhiên (quan sát, làm thí nghiệm, đề xuất giả thuyết)\nVD – Vận dụng kiến thức, kĩ năng (giải quyết vấn đề thực tiễn)", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("2"), createCell("Toán học", false, AlignmentType.LEFT),
                createCell("TD – Tư duy và lập luận toán học\nGQVĐ – Giải quyết vấn đề toán học\nMH – Mô hình hóa toán học\nGT – Giao tiếp toán học\nCC – Sử dụng công cụ, phương tiện học toán", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("3"), createCell("Ngữ văn", false, AlignmentType.LEFT),
                createCell("Đ – Năng lực Đọc (đọc hiểu văn bản)\nV – Năng lực Viết\nN – Năng lực Nói\nNg – Năng lực Nghe", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("4"), createCell("Lịch sử – Địa lí", false, AlignmentType.LEFT),
                createCell("Lịch sử: TK – Tìm hiểu lịch sử; NT – Nhận thức và tư duy lịch sử; VD – Vận dụng\nĐịa lí: NT – Nhận thức khoa học địa lí; TH – Tìm hiểu địa lí; VD – Vận dụng", false, AlignmentType.LEFT),
              ]
            }),
            new TableRow({
              children: [
                createCell("5"), createCell("Tin học – Công nghệ", false, AlignmentType.LEFT),
                createCell("Tin học: NLa, NLb, NLc, NLd, NLe (5 năng lực thành phần)\nCông nghệ: NT – Nhận thức CN; TK – Thiết kế kĩ thuật; SD – Sử dụng CN; ĐG – Đánh giá CN", false, AlignmentType.LEFT),
              ]
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: standardBorders,
        }),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Lưu ý: ", bold: true, size: 28, font: "Times New Roman" }), new TextRun({ text: "Mã năng lực được ghi kèm theo số lượng câu hỏi/ý trong Bảng Đặc tả nhằm giúp giáo viên dễ dàng đối chiếu yêu cầu cần đạt với mức độ nhận thức tương ứng khi ra đề kiểm tra. Các mã viết tắt cụ thể theo từng môn được quy ước trong bảng trên.", size: 28, font: "Times New Roman", italics: true })], spacing: { after: 300 } }),

        ...examParagraphs,
        ...examEndParagraphs,

        ...answerKeyParagraphs
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Ma_Tran_Dac_Ta_De_Kiem_Tra.docx");
};