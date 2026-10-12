// Tên file: src/utils/specTableHelper.js
import { findYCCD } from '../data/ctToan2018.js';

/**
 * Xác định các mức độ nhận thức thực tế có câu hỏi trong một ĐVKT
 * @param {Object} dv - Đơn vị kiến thức
 * @param {boolean} isKHTN - Có phải môn KHTN (có cột VDC tự luận) không
 * @param {boolean} hasTraLoiNgan - Có phần Trả lời ngắn không
 * @param {boolean} hasTuLuan - Có phần Tự luận không
 * @returns {string[]} Mảng các level active: ví dụ ['biet', 'hieu', 'vanDung']
 */
export const getActiveLevelsForDv = (dv, isKHTN = false, hasTraLoiNgan = true, hasTuLuan = true) => {
  if (!dv) return ['biet'];

  const activeSet = new Set();

  // 1. NHẬN BIẾT
  const hasNlcBiet = (Number(dv.nhieuLuaChon?.biet) || 0) > 0;
  const hasDsBiet = (Number(dv.dungSai?.biet) || 0) > 0;
  const hasTlnBiet = hasTraLoiNgan && (Number(dv.traLoiNgan?.biet) || 0) > 0;
  const hasTlBiet = hasTuLuan && (
    (Array.isArray(dv.tuLuan?.subItems) && dv.tuLuan.subItems.some(s => s.level === 'biet')) ||
    (typeof dv.tuLuan?.biet === 'object' ? (Number(dv.tuLuan.biet.y) || 0) > 0 : (Number(dv.tuLuan?.biet) || 0) > 0)
  );
  if (hasNlcBiet || hasDsBiet || hasTlnBiet || hasTlBiet) {
    activeSet.add('biet');
  }

  // 2. THÔNG HIỂU
  const hasNlcHieu = (Number(dv.nhieuLuaChon?.hieu) || 0) > 0;
  const hasDsHieu = (Number(dv.dungSai?.hieu) || 0) > 0;
  const hasTlnHieu = hasTraLoiNgan && (Number(dv.traLoiNgan?.hieu) || 0) > 0;
  const hasTlHieu = hasTuLuan && (
    (Array.isArray(dv.tuLuan?.subItems) && dv.tuLuan.subItems.some(s => s.level === 'hieu')) ||
    (typeof dv.tuLuan?.hieu === 'object' ? (Number(dv.tuLuan.hieu.y) || 0) > 0 : (Number(dv.tuLuan?.hieu) || 0) > 0)
  );
  if (hasNlcHieu || hasDsHieu || hasTlnHieu || hasTlHieu) {
    activeSet.add('hieu');
  }

  // 3. VẬN DỤNG
  const hasNlcVD = (Number(dv.nhieuLuaChon?.vanDung) || 0) > 0;
  const hasDsVD = (Number(dv.dungSai?.vanDung) || 0) > 0 || (!isKHTN && (Number(dv.dungSai?.vanDungCao) || 0) > 0);
  const hasTlnVD = hasTraLoiNgan && ((Number(dv.traLoiNgan?.vanDung) || 0) > 0 || (!isKHTN && (Number(dv.traLoiNgan?.vanDungCao) || 0) > 0));
  const hasTlVD = hasTuLuan && (
    (Array.isArray(dv.tuLuan?.subItems) && (dv.tuLuan.subItems.some(s => s.level === 'vanDung') || (!isKHTN && dv.tuLuan.subItems.some(s => s.level === 'vanDungCao')))) ||
    (typeof dv.tuLuan?.vanDung === 'object' ? (Number(dv.tuLuan.vanDung.y) || 0) > 0 : (Number(dv.tuLuan?.vanDung) || 0) > 0) ||
    (!isKHTN && (typeof dv.tuLuan?.vanDungCao === 'object' ? (Number(dv.tuLuan.vanDungCao.y) || 0) > 0 : (Number(dv.tuLuan?.vanDungCao) || 0) > 0))
  );
  if (hasNlcVD || hasDsVD || hasTlnVD || hasTlVD) {
    activeSet.add('vanDung');
  }

  // 4. VẬN DỤNG CAO (Chỉ khi KHTN có VDC riêng ở cột Tự luận hoặc các phần khác)
  if (isKHTN) {
    const hasTlVDC = hasTuLuan && (
      (Array.isArray(dv.tuLuan?.subItems) && dv.tuLuan.subItems.some(s => s.level === 'vanDungCao')) ||
      (typeof dv.tuLuan?.vanDungCao === 'object' ? (Number(dv.tuLuan.vanDungCao.y) || 0) > 0 : (Number(dv.tuLuan?.vanDungCao) || 0) > 0)
    );
    const hasDsVDC = (Number(dv.dungSai?.vanDungCao) || 0) > 0;
    const hasTlnVDC = hasTraLoiNgan && (Number(dv.traLoiNgan?.vanDungCao) || 0) > 0;
    if (hasTlVDC || hasDsVDC || hasTlnVDC) {
      activeSet.add('vanDungCao');
    }
  }

  // Nếu bài chưa có câu hỏi nào thì giữ 1 dòng mặc định 'biet' để không bị mất hàng
  if (activeSet.size === 0) {
    return ['biet'];
  }

  const order = ['biet', 'hieu', 'vanDung', 'vanDungCao'];
  return order.filter(lvl => activeSet.has(lvl));
};

/**
 * Tên hiển thị chuẩn Tiếng Việt cho từng mức độ nhận thức
 */
export const formatLevelDisplayName = (level) => {
  switch (level) {
    case 'biet': return 'Nhận biết';
    case 'hieu': return 'Thông hiểu';
    case 'vanDung': return 'Vận dụng';
    case 'vanDungCao': return 'Vận dụng cao';
    default: return level;
  }
};

/**
 * Bóc tách nội dung YCCĐ thành các đoạn theo mức độ
 * @param {string} rawText - Văn bản YCCĐ đầy đủ
 * @returns {Object} { biet: string, hieu: string, vanDung: string, vanDungCao: string }
 */
export const parseYccdByLevel = (rawText = '') => {
  const result = {
    biet: '',
    hieu: '',
    vanDung: '',
    vanDungCao: ''
  };

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return result;
  }

  const text = rawText.trim();

  // Định nghĩa các marker và regex nhận diện
  const markers = [
    { level: 'biet', regex: /(?:^|\n)\s*[-*•]?\s*(?:mức\s+độ\s+)?nhận\s+biết\s*[:\.]?\s*/i },
    { level: 'hieu', regex: /(?:^|\n)\s*[-*•]?\s*(?:mức\s+độ\s+)?thông\s+hiểu\s*[:\.]?\s*/i },
    { level: 'vanDungCao', regex: /(?:^|\n)\s*[-*•]?\s*(?:mức\s+độ\s+)?vận\s+dụng\s+cao\s*[:\.]?\s*/i },
    { level: 'vanDung', regex: /(?:^|\n)\s*[-*•]?\s*(?:mức\s+độ\s+)?vận\s+dụng(?!\s*cao)\s*[:\.]?\s*/i },
  ];

  // Tìm vị trí xuất hiện của từng marker trong text
  const found = [];
  markers.forEach(({ level, regex }) => {
    const match = regex.exec(text);
    if (match) {
      found.push({
        level,
        startIndex: match.index,
        contentStart: match.index + match[0].length
      });
    }
  });

  // Nếu không tìm thấy marker nào thì gán toàn bộ văn bản vào 'biet'
  if (found.length === 0) {
    result.biet = text;
    return result;
  }

  // Sắp xếp các marker theo thứ tự xuất hiện trong chuỗi
  found.sort((a, b) => a.startIndex - b.startIndex);

  // Cắt nội dung tương ứng giữa các marker
  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const nextStart = (i + 1 < found.length) ? found[i + 1].startIndex : text.length;
    const content = text.slice(current.contentStart, nextStart).trim();
    result[current.level] = content;
  }

  return result;
};

/**
 * Cập nhật nội dung YCCĐ cho một mức độ cụ thể mà không làm mất các mức độ khác
 * @param {string} rawText - Toàn bộ text YCCĐ hiện tại
 * @param {string} level - Mức độ cần sửa ('biet', 'hieu', 'vanDung', 'vanDungCao')
 * @param {string} newLevelText - Nội dung mới của mức độ đó
 * @param {string[]} activeLevels - Danh sách các mức độ active của bài
 * @returns {string} Text YCCĐ hoàn chỉnh sau khi ghép lại
 */
export const updateYccdForLevel = (rawText = '', level, newLevelText, activeLevels = []) => {
  const parsed = parseYccdByLevel(rawText);
  parsed[level] = (newLevelText || '').trim();

  // Xác định các mức độ cần gom
  const order = ['biet', 'hieu', 'vanDung', 'vanDungCao'];
  const levelsToInclude = new Set([...(activeLevels || []), ...order.filter(l => Boolean(parsed[l]))]);

  const parts = [];
  order.forEach(lvl => {
    if (levelsToInclude.has(lvl)) {
      const content = parsed[lvl] || '';
      const name = formatLevelDisplayName(lvl);
      if (content) {
        parts.push(`- ${name}:\n${content}`);
      } else if (lvl === level && newLevelText.trim() === '') {
        // Đã xóa rỗng mức độ này
      }
    }
  });

  return parts.join('\n\n');
};

// ============================================================================
// BỘ LỌC THÔNG MINH CHO PHÂN BỔ CÂU TỰ LUẬN (KHTN & TOÁN)
// Loại trừ các bài chỉ có lý thuyết / chỉ ở mức Nhận biết khỏi phần Tự luận
// ============================================================================

const cleanYccdContent = (str = '') => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\[(?:giao vien|giáo viên)[^\]]*\]/gi, '')
    .replace(/chưa có yêu cầu cần đạt[^\n]*/gi, '')
    .replace(/^[-*•\s]+$/gm, '')
    .trim();
};

/**
 * Phân tích các mức độ nhận thức thực sự có trong văn bản YCCĐ của ĐVKT
 */
export const analyzeYccdCognitiveLevels = (rawYccd = '') => {
  const emptyResult = {
    hasData: false,
    hasBiet: false,
    hasHieu: false,
    hasVanDung: false,
    hasVanDungCao: false,
    isOnlyBiet: false,
    isNoVanDung: false,
  };

  const cleanedRaw = cleanYccdContent(rawYccd);
  if (!cleanedRaw) return emptyResult;

  const hasExplicitHeader =
    /(?:^|\n)\s*[-*•]?\s*(?:mức\s+độ\s+)?(?:nhận\s+biết|thông\s+hiểu|vận\s+dụng)\s*[:\.]/i.test(cleanedRaw);

  if (hasExplicitHeader) {
    const parsed = parseYccdByLevel(cleanedRaw);
    const bText = cleanYccdContent(parsed.biet);
    const hText = cleanYccdContent(parsed.hieu);
    const vdText = cleanYccdContent(parsed.vanDung);
    const vdcText = cleanYccdContent(parsed.vanDungCao);

    const hasBiet = Boolean(bText);
    const hasHieu = Boolean(hText) || /\[(NT[3-6]|TH[12])\]/i.test(cleanedRaw);
    const hasVanDung = Boolean(vdText) || /\[(VD1|TH[3-6]|NT7)\]/i.test(cleanedRaw);
    const hasVanDungCao = Boolean(vdcText) || /\[(VD2)\]/i.test(cleanedRaw);
    const hasData = hasBiet || hasHieu || hasVanDung || hasVanDungCao;

    return {
      hasData,
      hasBiet,
      hasHieu,
      hasVanDung,
      hasVanDungCao,
      isOnlyBiet: hasData && hasBiet && !hasHieu && !hasVanDung && !hasVanDungCao,
      isNoVanDung: hasData && (hasBiet || hasHieu) && !hasVanDung && !hasVanDungCao,
    };
  }

  // Trường hợp văn bản YCCĐ không ghi tiêu đề "Nhận biết:", "Thông hiểu:" mà ghi trực tiếp các gạch đầu dòng
  const hasVdc = /\[(VD2)\]/i.test(cleanedRaw) || /vận dụng cao|phức hợp,?\s*không quen thuộc/i.test(cleanedRaw);
  const hasVd =
    hasVdc ||
    /\[(VD1|TH[3-6]|NT7)\]/i.test(cleanedRaw) ||
    /vận dụng|giải quyết\s+(?:một số\s+|những\s+)?(?:vấn đề|bài toán)|bài toán thực tiễn|tình huống thực tiễn|thiết kế phương án|lập kế hoạch thí nghiệm|đề xuất giải pháp/i.test(cleanedRaw);
  const hasHieu =
    /\[(NT[3-6]|TH[12])\]/i.test(cleanedRaw) ||
    /giải thích|phân tích|so sánh|phân biệt|chứng minh|tính được|thực hiện được\s+(?:các\s+|một số\s+|việc\s+)?(?:phép|thu gọn|rút gọn)|thu gọn|rút gọn|giải được|vẽ được|thiết lập được|biểu diễn được|viết được phương trình|lập được bảng|tiến hành thí nghiệm|xác định được tâm và bán kính/i.test(cleanedRaw);
  const hasBiet =
    /\[(NT[12])\]/i.test(cleanedRaw) ||
    /nhận biết|nhận dạng|nêu được|kể tên|phát biểu|liệt kê|làm quen|trình bày được|mô tả\s*\(đỉnh/i.test(cleanedRaw);

  const hasData = hasBiet || hasHieu || hasVd || hasVdc;
  return {
    hasData,
    hasBiet,
    hasHieu,
    hasVanDung: hasVd,
    hasVanDungCao: hasVdc,
    isOnlyBiet: hasData && hasBiet && !hasHieu && !hasVd && !hasVdc,
    isNoVanDung: hasData && (hasBiet || hasHieu) && !hasVd && !hasVdc,
  };
};

// Mẫu nhận diện các bài học thuần lý thuyết / giới thiệu / chỉ ở mức Nhận biết (KHTN & Toán)
const STRICT_THEORY_ONLY_PATTERNS = [
  // --- KHTN (Lớp 6, 7, 8, 9) ---
  /giới thiệu về khoa học tự nhiên/i,
  /các lĩnh vực chủ yếu của khoa học tự nhiên|lĩnh vực chủ yếu của khtn/i,
  /an toàn trong phòng thực hành|quy định an toàn|an toàn phòng thực hành/i,
  /kí hiệu cảnh báo|ký hiệu cảnh báo/i,
  /sử dụng kính lúp/i,
  /sử dụng kính hiển vi/i,
  /một số dụng cụ đo|dụng cụ đo và quy tắc|dụng cụ trong phòng thực hành|sử dụng một số hóa chất,?\s*thiết bị cơ bản|nhận biết một số dụng cụ,?\s*h[oóa]+ chất/i,
  /phương pháp và kĩ năng học tập|phương pháp và kỹ năng học tập|kĩ năng học tập môn khoa học tự nhiên|thuyết trình một vấn đề khoa học/i,
  /^bài mở đầu\b|^mở đầu về\b|^giới thiệu chung\b/i,
  /khái quát về cơ thể người/i,
  /khái quát về di truyền học|giới thiệu về di truyền học/i,

  // --- TOÁN (Lớp 6, 7, 8, 9) ---
  /^(?:bài\s*\d+\s*[:.-]?\s*)?hình đồng dạng$/i,
  /hình đồng dạng phối cảnh|hình vị tự/i,
  /làm quen với biến cố/i,
  /làm quen với một số mô hình xác suất/i,
  /góc ở vị trí đặc biệt\.?\s*tia phân giác của một góc$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:hình có trục đối xứng|hình có tâm đối xứng|đối xứng trong thực tiễn|tính đối xứng của hình phẳng|vai trò của tính đối xứng)/i,
  /hoạt động thực hành và trải nghiệm|hoạt động thực hành trải nghiệm|trải nghiệm thực hành/i,

  // --- Đánh dấu tường minh của giáo viên ---
  /\(chỉ nhận biết\)|\(nhận biết\)|\(lý thuyết\)|\(lí thuyết\)|\(không tự luận\)|\(chỉ tnkq\)/i,
];

// Mẫu nhận diện các bài lý thuyết cơ bản / mở đầu chương chỉ tới mức Nhận biết - Thông hiểu cơ bản (Không có Vận dụng / VDC)
const BASIC_THEORY_NO_VD_PATTERNS = [
  // --- TOÁN ---
  /^(?:bài\s*\d+\s*[:.-]?\s*)?đơn thức$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?tứ giác$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:khái niệm\s+)?hàm số và đồ thị$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?căn bậc ba$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:đa giác đều|phép quay)$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:góc ở tâm|góc nội tiếp|góc ở tâm,?\s*góc nội tiếp)$/i,
  /khái niệm định lí|tiên đề euclid/i,
  /thu thập và phân loại dữ liệu|thu thập,?\s*phân loại dữ liệu/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:tập hợp|ghi số tự nhiên|điểm,?\s*đường thẳng|ba điểm thẳng hàng|tia)$/i,

  // --- KHTN ---
  /sơ lược về bảng tuần hoàn/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?nguyên tố hóa học$/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?thang ph$/i,
  /biến đổi vật lí và biến đổi hóa học/i,
  /một số vật liệu,?\s*nhiên liệu,?\s*nguyên liệu/i,
  /một số phân bón hóa học/i,
  /chuyển động nhìn thấy của mặt trời|hệ mặt trời|ngân hà/i,
  /^(?:bài\s*\d+\s*[:.-]?\s*)?(?:nguyên sinh vật|nấm|đa dạng thế giới sống|phân loại thế giới sống)$/i,
];

/**
 * Kiểm tra bài học (ĐVKT) có phải là bài thuần lý thuyết / chỉ ở mức Nhận biết hay không.
 * Nếu trả về true -> Không phân bổ câu Tự luận vào bài này.
 */
export const isTheoryOrRecognitionOnlyLesson = (dv, monHoc = '', lop = '') => {
  if (!dv) return false;
  if (dv.noTuLuan || dv.onlyTracNghiem || dv.isTheoryOnly) return true;

  const title = (dv.noiDung || '').trim();

  // 1. Kiểm tra theo tên bài thuộc danh mục bài mở đầu / lý thuyết thuần Nhận biết
  if (title && STRICT_THEORY_ONLY_PATTERNS.some(rx => rx.test(title))) {
    return true;
  }

  // 2. Kiểm tra nội dung YCCĐ (nếu giáo viên đã nhập hoặc đã nạp từ chương trình)
  const yccdInfo = analyzeYccdCognitiveLevels(dv.yeuCauCanDat || '');
  if (yccdInfo.hasData) {
    return yccdInfo.isOnlyBiet;
  }

  // 3. Nếu chưa có YCCĐ và là môn Toán: tra cứu trong dữ liệu chuẩn CT Toán 2018
  const isMath = /toán|toan|đại số|hình học/i.test(monHoc || '');
  if (isMath && title.length >= 6) {
    const gradesToCheck = lop ? [lop] : [6, 7, 8, 9];
    for (const g of gradesToCheck) {
      const matched = findYCCD('toan', g, title);
      if (matched && matched.yccD) {
        const hLen = (matched.yccD.hieu || []).length;
        const vdLen = (matched.yccD.vanDung || []).length;
        const bLen = (matched.yccD.biet || []).length;
        if (bLen > 0 && hLen === 0 && vdLen === 0) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Kiểm tra bài học có phải là bài lý thuyết cơ bản (không có mức Vận dụng / Vận dụng cao) hay không.
 */
export const isBasicTheoryNoVanDung = (dv, monHoc = '', lop = '') => {
  if (!dv) return false;
  if (isTheoryOrRecognitionOnlyLesson(dv, monHoc, lop)) return true;

  const title = (dv.noiDung || '').trim();
  if (title && BASIC_THEORY_NO_VD_PATTERNS.some(rx => rx.test(title))) {
    return true;
  }

  const yccdInfo = analyzeYccdCognitiveLevels(dv.yeuCauCanDat || '');
  if (yccdInfo.hasData) {
    return yccdInfo.isNoVanDung;
  }

  const isMath = /toán|toan|đại số|hình học/i.test(monHoc || '');
  if (isMath && title.length >= 6) {
    const gradesToCheck = lop ? [lop] : [6, 7, 8, 9];
    for (const g of gradesToCheck) {
      const matched = findYCCD('toan', g, title);
      if (matched && matched.yccD) {
        const vdLen = (matched.yccD.vanDung || []).length;
        const bLen = (matched.yccD.biet || []).length;
        const hLen = (matched.yccD.hieu || []).length;
        if ((bLen > 0 || hLen > 0) && vdLen === 0) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Nhận diện mạch kiến thức Toán của Chủ đề / Bài học ('dai_so' | 'hinh_hoc' | 'thong_ke')
 */
export const detectToanMach = (topicName = '', lessonName = '') => {
  const combined = `${topicName || ''} ${lessonName || ''}`.toLowerCase();

  // Ưu tiên kiểm tra Hàm số / Đồ thị trước để tránh từ "mặt phẳng tọa độ" bị nhầm sang Hình học
  if (/hàm số|đồ thị hàm số|biểu thức|đa thức|đơn thức|hằng đẳng thức|phân thức|phương trình|bất phương trình|bất đẳng thức|căn thức|căn bậc/i.test(combined)) {
    return 'dai_so';
  }
  if (/hình học|tứ giác|tam giác|thalès|thales|pythagore|pytago|đồng dạng|đường tròn|góc|đường thẳng|đoạn thẳng|tia\b|hình chóp|hình lăng trụ|hình hộp|hình lập phương|hình trụ|hình nón|hình cầu|đa giác|hệ thức lượng|tỉ số lượng giác|vectơ|vector|toạ độ|tọa độ|khối đa diện|khối tròn xoay|hình phẳng|hình khối|\bhh\b/i.test(combined)) {
    return 'hinh_hoc';
  }
  if (/thống kê|xác suất|dữ liệu|biểu đồ|tần số|biến cố|phép thử|không gian mẫu|mẫu số liệu|\btk\b/i.test(combined)) {
    return 'thong_ke';
  }
  return 'dai_so';
};

/**
 * Tính điểm ưu tiên (Suitability Tier) của một ĐVKT khi gán câu Tự luận ở mức `targetLevel`
 * Điểm càng cao càng được ưu tiên nhận câu Tự luận.
 */
export const getTuLuanSuitabilityTier = (
  dv,
  targetLevel = 'hieu',
  monHoc = '',
  lop = '',
  topicName = '',
  requiredKienThuc = ''
) => {
  if (!dv) return -1000;
  if (isTheoryOrRecognitionOnlyLesson(dv, monHoc, lop)) {
    return -1000;
  }

  let tier = 0;
  const title = `${topicName || ''} ${dv.noiDung || ''}`.toLowerCase();
  const isNoVD = isBasicTheoryNoVanDung(dv, monHoc, lop);

  // 1. Phạt nếu bài không có mức Vận dụng mà câu hỏi yêu cầu Vận dụng / Vận dụng cao
  if ((targetLevel === 'vanDung' || targetLevel === 'vanDungCao') && isNoVD) {
    tier -= 300;
  } else if (targetLevel === 'hieu' && isNoVD) {
    tier -= 50;
  }

  // 2. Thưởng điểm nếu YCCĐ có sẵn đúng mức độ mục tiêu
  const yccdInfo = analyzeYccdCognitiveLevels(dv.yeuCauCanDat || '');
  if (yccdInfo.hasData) {
    if (targetLevel === 'vanDungCao') {
      if (yccdInfo.hasVanDungCao) tier += 50;
      else if (yccdInfo.hasVanDung) tier += 25;
    } else if (targetLevel === 'vanDung') {
      if (yccdInfo.hasVanDung || yccdInfo.hasVanDungCao) tier += 40;
    } else if (targetLevel === 'hieu') {
      if (yccdInfo.hasHieu || yccdInfo.hasVanDung) tier += 25;
    }
  }

  // 3. Thưởng điểm cho các bài trọng tâm có bài tập tính toán / chứng minh / giải thích thực tiễn
  const isMath = /toán|toan|đại số|hình học/i.test(monHoc || '');
  if (isMath) {
    const mach = detectToanMach(topicName, dv.noiDung);

    if (/phép toán|phép tính|cộng,?\s*trừ,?\s*nhân,?\s*chia|hằng đẳng thức|phân tích đa thức|phân thức đại số|phương trình|bất phương trình|hàm số bậc nhất|y\s*=\s*ax|viète|viete|căn thức|rút gọn|thalès|thales|tam giác đồng dạng|trường hợp đồng dạng|pythagore|pytago|hình bình hành|hình chữ nhật|hình thoi|hình vuông|hình thang cân|hình chóp|hình lăng trụ|hình trụ|hình nón|hình cầu|hệ thức lượng|tỉ số lượng giác|tiếp tuyến|tứ giác nội tiếp/i.test(title)) {
      tier += 40;
    }

    if (targetLevel === 'vanDungCao') {
      if (mach === 'thong_ke') {
        tier -= 150; // Không ưu tiên câu VDC tự luận vào bài Thống kê / Xác suất
      }
      if (/đa thức|hằng đẳng thức|phân tích đa thức|phân thức|phương trình|bất đẳng thức|bất phương trình|hàm số|căn thức|thalès|thales|đồng dạng|pythagore|tứ giác|đường tròn/i.test(title)) {
        tier += 30;
      }
    }

    if (requiredKienThuc === 'hinh_hoc') {
      tier += (mach === 'hinh_hoc' ? 120 : -120);
    } else if (requiredKienThuc === 'dai_so') {
      if (mach === 'dai_so') tier += 120;
      else if (mach === 'thong_ke') tier += (targetLevel === 'vanDungCao' ? -120 : 10);
      else tier -= 120;
    }
  } else {
    // Môn KHTN (Vật lí, Hóa học, Sinh học)
    if (/tốc độ|quãng đường|khối lượng riêng|áp suất|lực|moment|đòn bẩy|công|công suất|cơ năng|động năng|thế năng|điện trở|định luật ohm|mạch điện|năng lượng|khúc xạ|thấu kính|cảm ứng điện từ|mol|tỉ khối|dung dịch|nồng độ|bảo toàn khối lượng|phương trình hóa học|tính theo phương trình|tốc độ phản ứng|acid|base|oxide|muối|kim loại|hợp chất hữu cơ|alkane|alkene|ethylene|alcohol|acetic|glucose|tinh bột|protein|polymer|nguyên tử|liên kết hóa học|hóa trị|công thức hóa học|quang hợp|hô hấp|trao đổi chất|trao đổi nước|dinh dưỡng|tiêu hóa|tuần hoàn|máu|bài tiết|thần kinh|nội tiết|cảm ứng|sinh trưởng|sinh sản|quần thể|quần xã|hệ sinh thái|di truyền|gene|adn|nhiễm sắc thể|mendel|nguyên phân|giảm phân|đột biến/i.test(title)) {
      tier += 40;
    }
  }

  return tier;
};

