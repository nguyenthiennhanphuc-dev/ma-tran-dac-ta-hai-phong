// src/data/khtnCompetencyData.js
// Module dữ liệu chuẩn: Chỉ báo Năng lực Khoa học Tự nhiên THCS
// Căn cứ: CTGDPT 2018 + Văn bản Sở GD&ĐT (HÌNH THỨC RA ĐỀ NĂM ĐỔI MỚI CÓ NL)
// ============================================================================
import { parseYccdByLevel } from '../utils/specTableHelper.js';

// ============================================================================
// I. BỘ MÃ CHỈ BÁO CHUẨN — 3 NHÓM THÀNH PHẦN NĂNG LỰC
// ============================================================================

export const KHTN_COMPETENCY_GROUPS = [
  {
    groupKey: 'NT',
    groupName: 'Nhận thức Khoa học tự nhiên',
    groupShort: 'Nhận thức',
    color: '#1e40af',
    codes: [
      { code: 'NT1', label: 'NT1 – Nhận biết, kể tên, phát biểu, nêu được', fullText: 'Nhận biết, kể tên, phát biểu, nêu được các đối tượng, khái niệm, quy luật, quá trình của tự nhiên.', defaultLevel: 'biet' },
      { code: 'NT2', label: 'NT2 – Trình bày, mô tả', fullText: 'Trình bày được các sự vật hiện tượng; vai trò của các sự vật, hiện tượng và các quá trình tự nhiên bằng các hình thức biểu đạt như ngôn ngữ nói, viết, công thức, sơ đồ, biểu đồ,...', defaultLevel: 'hieu' },
      { code: 'NT3', label: 'NT3 – So sánh, phân loại, phân biệt', fullText: 'So sánh, phân loại, lựa chọn được các sự vật, hiện tượng, quá trình tự nhiên theo các tiêu chí khác nhau.', defaultLevel: 'hieu' },
      { code: 'NT4', label: 'NT4 – Phân tích theo logic', fullText: 'Phân tích được các đặc điểm của một sự vật, hiện tượng, quá trình của tự nhiên theo logic nhất định.', defaultLevel: 'hieu' },
      { code: 'NT5', label: 'NT5 – Tìm từ khoá, sử dụng thuật ngữ', fullText: 'Tìm được từ khoá, sử dụng được thuật ngữ khoa học, kết nối được thông tin theo logic có ý nghĩa, lập được dàn ý khi đọc và trình bày các văn bản khoa học.', defaultLevel: 'hieu' },
      { code: 'NT6', label: 'NT6 – Giải thích quan hệ nhân quả, cấu tạo–chức năng', fullText: 'Giải thích được mối quan hệ giữa các sự vật và hiện tượng (quan hệ nguyên nhân - kết quả, cấu tạo - chức năng,...).', defaultLevel: 'vanDung' },
      { code: 'NT7', label: 'NT7 – Nhận ra điểm sai, phê phán, thảo luận', fullText: 'Nhận ra điểm sai và chỉnh sửa được; đưa ra được những nhận định phê phán có liên quan đến chủ đề thảo luận.', defaultLevel: 'vanDung' },
    ],
  },
  {
    groupKey: 'TH',
    groupName: 'Tìm hiểu tự nhiên',
    groupShort: 'Tìm hiểu',
    color: '#065f46',
    codes: [
      { code: 'TH1', label: 'TH1 – Đề xuất vấn đề, đặt câu hỏi', fullText: 'Đề xuất vấn đề, đặt câu hỏi cho vấn đề: Nhận ra và đặt được câu hỏi liên quan đến vấn đề; phân tích bối cảnh để đề xuất vấn đề.', defaultLevel: 'hieu' },
      { code: 'TH2', label: 'TH2 – Đưa phán đoán, xây dựng giả thuyết', fullText: 'Đưa ra phán đoán và xây dựng giả thuyết: Phân tích vấn đề để nêu được phán đoán; Xây dựng và phát biểu được giả thuyết cần tìm hiểu.', defaultLevel: 'hieu' },
      { code: 'TH3', label: 'TH3 – Lập kế hoạch, thiết kế phương án TN', fullText: 'Lập kế hoạch thực hiện: Xây dựng được khung logic nội dung tìm hiểu; Lựa chọn được phương pháp thích hợp; Lập được kế hoạch triển khai tìm hiểu.', defaultLevel: 'hieu' },
      { code: 'TH4', label: 'TH4 – Thực hiện TN, thu thập & xử lý dữ liệu', fullText: 'Thực hiện kế hoạch: Thu thập, lưu giữ được dữ liệu từ kết quả tổng quan, thực nghiệm, điều tra; so sánh với giả thuyết, rút ra kết luận.', defaultLevel: 'vanDung' },
      { code: 'TH5', label: 'TH5 – Viết báo cáo, vẽ hình, thiết kế mô hình', fullText: 'Viết, trình bày báo cáo và thảo luận: Sử dụng ngôn ngữ, hình vẽ, sơ đồ, biểu bảng biểu đạt quá trình và kết quả tìm hiểu; bảo vệ kết quả.', defaultLevel: 'vanDung' },
      { code: 'TH6', label: 'TH6 – Ra quyết định, đề xuất giải pháp', fullText: 'Ra quyết định và đề xuất ý kiến xử lí cho vấn đề đã tìm hiểu.', defaultLevel: 'vanDung' },
    ],
  },
  {
    groupKey: 'VD',
    groupName: 'Vận dụng kiến thức, kĩ năng đã học',
    groupShort: 'Vận dụng',
    color: '#7c2d12',
    codes: [
      { code: 'VD1', label: 'VD1 – Vận dụng giải thích/giải bài tập thực tế', fullText: 'Vận dụng kiến thức, kĩ năng đã học để giải thích, đánh giá hiện tượng, quy luật, thực nghiệm trong KHTN; giải bài tập định lượng hoặc phân tích tình huống thực tế.', defaultLevel: 'vanDung' },
      { code: 'VD2', label: 'VD2 – Đề xuất giải pháp, phát triển bền vững (VD Cao)', fullText: 'Vận dụng các kiến thức, kĩ năng để đề xuất, thực hiện các giải pháp đáp ứng phát triển bền vững, bảo vệ môi trường, thích ứng với biến đổi khí hậu.', defaultLevel: 'vanDungCao' },
    ],
  },
];

export const KHTN_CODE_MAP = Object.fromEntries(
  KHTN_COMPETENCY_GROUPS.flatMap(g => g.codes.map(c => [c.code, { ...c, groupKey: g.groupKey, groupName: g.groupName }]))
);

export const KHTN_ALL_CODES = KHTN_COMPETENCY_GROUPS.flatMap(g => g.codes.map(c => ({ ...c, groupKey: g.groupKey })));

// ============================================================================
// II. HÀM GỢI Ý MÃ TỰ ĐỘNG
// ============================================================================
const TH_KEYWORDS_HIEU = ['thiết kế phương án','lập kế hoạch thí nghiệm','phương án thí nghiệm'];
const TH_KEYWORDS_VD = ['thực hiện thí nghiệm','tiến hành thí nghiệm','xử lý dữ liệu thí nghiệm'];
const VD2_KEYWORDS = ['bảo vệ môi trường','phát triển bền vững','biến đổi khí hậu','tiết kiệm năng lượng','tuyên truyền','đề xuất biện pháp','ứng dụng trong đời sống','thực tiễn địa phương'];

export const suggestKhtnCode = (level, loaiCau, noiDungBai = '', yccD = '', isDungSaiY_d = false) => {
  const text = (noiDungBai + ' ' + yccD).toLowerCase();
  if (isDungSaiY_d) return 'VD2';
  switch (level) {
    case 'biet':     return 'NT1';
    case 'hieu':     return TH_KEYWORDS_HIEU.some(kw => text.includes(kw)) ? 'TH3' : 'NT3';
    case 'vanDung':
      if (VD2_KEYWORDS.some(kw => text.includes(kw))) return 'VD2';
      return TH_KEYWORDS_VD.some(kw => text.includes(kw)) ? 'TH4' : 'VD1';
    case 'vanDungCao': return 'VD2';
    default:         return 'NT1';
  }
};

export const suggestKhtnCodeDungSai = (yIndex) => {
  if (yIndex === 0 || yIndex === 1) return 'NT1';
  if (yIndex === 2) return 'NT3';
  return 'VD2';
};

export const getKhtnLevelLabel = (code) => {
  const entry = KHTN_CODE_MAP[code];
  if (!entry) return '';
  const level = entry.defaultLevel;
  if (level === 'biet') return 'Nhận biết';
  if (level === 'hieu') return 'Thông hiểu';
  if (level === 'vanDungCao') return 'Vận dụng cao';
  return 'Vận dụng';
};

export const formatYccdWithCode = (yccDText, code, levelLabel = '') => {
  if (!code || !yccDText) return yccDText;
  if (/\[(NT[1-7]|TH[1-6]|VD[12])\]/i.test(yccDText)) {
    return yccDText.replace(/\[(NT[1-7]|TH[1-6]|VD[12])\]/i, `[${code}]`);
  }
  const label = levelLabel || getKhtnLevelLabel(code);
  return label ? `${label} [${code}]: ${yccDText}` : `[${code}]: ${yccDText}`;
};

export const normalizeKhtnCode = (code) => {
  if (!code) return '';
  let s = String(code).replace(/[\[\]]/g, '').trim();
  if (s === 'KHTN1.1') return 'NT1';
  if (s === 'KHTN1.2') return 'NT2';
  if (s === 'KHTN1.3') return 'NT3';
  if (s === 'KHTN1.4') return 'NT6';
  if (s === 'KHTN3.1') return 'VD1';
  if (s === 'KHTN2.4' || s === 'KHTN2.2') return 'VD2';
  return s;
};

/**
 * Lấy mã năng lực KHTN chuẩn DUY NHẤT cho một dòng (ĐVKT + mức độ nhận thức)
 * Ưu tiên:
 * 1. Mã có trong chuỗi YCCĐ của level này (do AI sinh hoặc người dùng chọn)
 * 2. Mã đã gán trong dv.indicatorMap của câu hỏi bất kỳ thuộc level này
 * 3. Fallback: suggestKhtnCode
 */
export const getRowKhtnCode = (dv, level, customYccdText = null) => {
  if (!dv) return level === 'vanDungCao' ? 'VD2' : (level === 'vanDung' ? 'VD1' : (level === 'hieu' ? 'NT3' : 'NT1'));

  // 1. Kiểm tra mã trong text YCCĐ của level này (nếu có chuỗi [MÃ])
  let yccdText = customYccdText;
  if (yccdText === null || yccdText === undefined) {
    if (typeof dv.yeuCauCanDat === 'string') {
      const parsed = parseYccdByLevel(dv.yeuCauCanDat);
      yccdText = parsed[level] || '';
    }
  }
  if (yccdText) {
    const match = yccdText.match(/\[(NT[1-7]|TH[1-6]|VD[12])\]/i);
    if (match) return match[1].toUpperCase();
  }

  // 2. Kiểm tra mã đã có trong dv.indicatorMap của bất kỳ câu hỏi nào thuộc level này
  if (dv.indicatorMap) {
    if (dv.indicatorMap[`_level_${level}`]?.code) {
      const norm = normalizeKhtnCode(dv.indicatorMap[`_level_${level}`].code);
      if (norm && /^(NT[1-7]|TH[1-6]|VD[12])$/i.test(norm)) return norm.toUpperCase();
    }
    const types = ['nhieuLuaChon', 'dungSai', 'traLoiNgan', 'tuLuan'];
    for (const t of types) {
      for (let i = 0; i < 12; i++) {
        const item = dv.indicatorMap[`${t}_${level}_${i}`];
        if (item) {
          const rawCode = typeof item === 'object' ? item.code : item;
          const norm = normalizeKhtnCode(rawCode);
          if (norm && /^(NT[1-7]|TH[1-6]|VD[12])$/i.test(norm)) {
            return norm.toUpperCase();
          }
        }
      }
    }
    if (level === 'vanDungCao' || level === 'vanDung') {
      for (let i = 0; i < 4; i++) {
        const item = dv.indicatorMap[`dungSai_vanDungCao_${i}`] || dv.indicatorMap[`tuLuan_vanDungCao_${i}`];
        if (item) {
          const rawCode = typeof item === 'object' ? item.code : item;
          const norm = normalizeKhtnCode(rawCode);
          if (norm && /^(NT[1-7]|TH[1-6]|VD[12])$/i.test(norm)) {
            return norm.toUpperCase();
          }
        }
      }
    }
  }

  // 3. Fallback: dùng hàm suggestKhtnCode
  return suggestKhtnCode(level, null, dv.noiDung || '', yccdText || '');
};

// ============================================================================
// III. BẢNG ÁNH XẠ SỐ BÀI → PHÂN MÔN
// ============================================================================
export const BAI_SO_TO_PHAN_MON = {
  '6': { 2:'hoahoc',9:'hoahoc',10:'hoahoc',11:'hoahoc',12:'hoahoc',13:'hoahoc',14:'hoahoc',15:'hoahoc',16:'hoahoc',17:'hoahoc', 3:'sinhhoc',4:'sinhhoc',18:'sinhhoc',19:'sinhhoc',20:'sinhhoc',21:'sinhhoc',22:'sinhhoc',23:'sinhhoc',24:'sinhhoc',25:'sinhhoc',26:'sinhhoc',27:'sinhhoc',28:'sinhhoc',29:'sinhhoc',30:'sinhhoc',31:'sinhhoc',32:'sinhhoc',33:'sinhhoc',34:'sinhhoc',35:'sinhhoc',36:'sinhhoc',37:'sinhhoc',38:'sinhhoc',39:'sinhhoc', 5:'vatli',6:'vatli',7:'vatli',8:'vatli',40:'vatli',41:'vatli',42:'vatli',43:'vatli',44:'vatli',45:'vatli',46:'vatli',47:'vatli',48:'vatli',49:'vatli',50:'vatli',51:'vatli',52:'vatli',53:'vatli',54:'vatli',55:'vatli' },
  '7': { 1:'hoahoc',2:'hoahoc',3:'hoahoc',4:'hoahoc',5:'hoahoc',6:'hoahoc',7:'hoahoc', 8:'vatli',9:'vatli',10:'vatli',11:'vatli',12:'vatli',13:'vatli',14:'vatli',15:'vatli',16:'vatli',17:'vatli',18:'vatli',19:'vatli',20:'vatli', 21:'sinhhoc',22:'sinhhoc',23:'sinhhoc',24:'sinhhoc',25:'sinhhoc',26:'sinhhoc',27:'sinhhoc',28:'sinhhoc',29:'sinhhoc',30:'sinhhoc',31:'sinhhoc',32:'sinhhoc',33:'sinhhoc',34:'sinhhoc',35:'sinhhoc',36:'sinhhoc',37:'sinhhoc',38:'sinhhoc',39:'sinhhoc',40:'sinhhoc',41:'sinhhoc',42:'sinhhoc' },
  '8': { 1:'hoahoc',2:'hoahoc',3:'hoahoc',4:'hoahoc',5:'hoahoc',6:'hoahoc',7:'hoahoc',8:'hoahoc',9:'hoahoc',10:'hoahoc',11:'hoahoc',12:'hoahoc', 13:'vatli',14:'vatli',15:'vatli',16:'vatli',17:'vatli',18:'vatli',19:'vatli',20:'vatli',21:'vatli',22:'vatli',23:'vatli',24:'vatli',25:'vatli',26:'vatli',27:'vatli',28:'vatli',29:'vatli', 30:'sinhhoc',31:'sinhhoc',32:'sinhhoc',33:'sinhhoc',34:'sinhhoc',35:'sinhhoc',36:'sinhhoc',37:'sinhhoc',38:'sinhhoc',39:'sinhhoc',40:'sinhhoc',41:'sinhhoc',42:'sinhhoc',43:'sinhhoc',44:'sinhhoc',45:'sinhhoc',46:'sinhhoc',47:'sinhhoc' },
  '9': { 1:'vatli',2:'vatli',3:'vatli',4:'vatli',5:'vatli',6:'vatli',7:'vatli',8:'vatli',9:'vatli',10:'vatli',11:'vatli',12:'vatli',13:'vatli',14:'vatli',15:'vatli',16:'vatli',17:'vatli', 18:'hoahoc',19:'hoahoc',20:'hoahoc',21:'hoahoc',22:'hoahoc',23:'hoahoc',24:'hoahoc',25:'hoahoc',26:'hoahoc',27:'hoahoc',28:'hoahoc',29:'hoahoc',30:'hoahoc',31:'hoahoc',32:'hoahoc',33:'hoahoc',34:'hoahoc',35:'hoahoc', 36:'sinhhoc',37:'sinhhoc',38:'sinhhoc',39:'sinhhoc',40:'sinhhoc',41:'sinhhoc',42:'sinhhoc',43:'sinhhoc',44:'sinhhoc',45:'sinhhoc',46:'sinhhoc',47:'sinhhoc',48:'sinhhoc',49:'sinhhoc',50:'sinhhoc',51:'sinhhoc' },
};

const PHAN_MON_KEYWORDS = {
  vatli: ['lực','tốc độ','quãng đường','áp suất','khối lượng riêng','điện','dòng điện','mạch điện','nam châm','từ trường','ánh sáng','gương','thấu kính','sóng âm','nhiệt','nội năng','công suất','cơ năng','động năng','thế năng','moment lực','đòn bẩy','lực đẩy archimedes','lực ma sát','vật lí','vật lý'],
  hoahoc: ['nguyên tử','nguyên tố','phân tử','liên kết','hóa học','hoá học','phản ứng','axit','bazơ','muối','oxit','kim loại','phi kim','hữu cơ','alkane','alkene','alcohol','glucose','tinh bột','protein','polymer','bảng tuần hoàn','hóa trị','oxygen','không khí','hỗn hợp','dung dịch','tách chất'],
  sinhhoc: ['tế bào','mô ','cơ quan','sinh vật','vi khuẩn','virus','nấm','thực vật','động vật','quang hợp','hô hấp','trao đổi chất','di truyền','gene','nhiễm sắc thể','adn','tiến hóa','sinh sản','cảm ứng','sinh trưởng','phát triển','hệ tiêu hóa','hệ tuần hoàn','hệ hô hấp','hệ thần kinh','quần thể','quần xã','hệ sinh thái','sinh học'],
};

export const detectPhanMon = (noiDung, lop) => {
  if (!noiDung) return null;
  const baiMatch = noiDung.match(/[Bb]ài\s+(\d+)/);
  if (baiMatch) {
    const baiSo = parseInt(baiMatch[1]);
    const phanMon = BAI_SO_TO_PHAN_MON[String(lop)]?.[baiSo];
    if (phanMon) return phanMon;
  }
  const text = noiDung.toLowerCase();
  let maxScore = 0, bestMon = null;
  for (const [mon, keywords] of Object.entries(PHAN_MON_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > maxScore) { maxScore = score; bestMon = mon; }
  }
  return bestMon;
};

export const PHAN_MON_LABELS = {
  vatli:   { label: 'Vật lí',   icon: '⚡', color: '#1e40af' },
  hoahoc:  { label: 'Hóa học',  icon: '⚗️', color: '#7c3aed' },
  sinhhoc: { label: 'Sinh học', icon: '🌿', color: '#065f46' },
};
