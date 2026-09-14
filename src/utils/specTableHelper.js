// Tên file: src/utils/specTableHelper.js

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
