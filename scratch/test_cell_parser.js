const parseTuLuanCell = (val) => {
  if (!val) return { count: 0, diem: 0 };
  let cleaned = val.trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '0') {
    return { count: 0, diem: 0 };
  }

  // Remove newlines
  cleaned = cleaned.replace(/\r?\n/g, '').trim();

  // If the cell consists only of digits, dots, commas, and spaces, strip all whitespace
  if (/^[0-9.,\s]+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s/g, '');
  }

  // Mẫu 1: "1 (0.5đ)" hoặc "1 ý (0,5đ)" hoặc "2 câu (1.0đ)"
  const matchWithParentheses = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:câu|cau|ý|y)?\s*\(([^)]+)\)/i);
  if (matchWithParentheses) {
    const count = parseFloat(matchWithParentheses[1]) || 0;
    const insideParen = matchWithParentheses[2].replace(/đ|đd|điểm|diem/gi, '').replace(',', '.').trim();
    const diem = parseFloat(insideParen) || 0;
    return { count, diem };
  }

  // Mẫu 2: "0.5đ" hoặc "0.5 điểm" hoặc "0,5 đ" (chỉ ghi điểm số)
  const matchOnlyPoints = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(?:đ|đd|điểm|diem)$/i);
  if (matchOnlyPoints) {
    const diem = parseFloat(matchOnlyPoints[1].replace(',', '.')) || 0;
    return { count: 1, diem };
  }

  // Mẫu 3: Chỉ ghi số điểm dưới dạng số thập phân, ví dụ "0.5" hoặc "0,5"
  if (cleaned.includes('.') || cleaned.includes(',')) {
    const diem = parseFloat(cleaned.replace(',', '.')) || 0;
    if (!isNaN(diem)) {
      return { count: 1, diem };
    }
  }

  // Mẫu 4: Chỉ ghi số nguyên, ví dụ "1", "2" -> đây là số câu/ý
  const parsedInt = parseInt(cleaned, 10);
  if (!isNaN(parsedInt) && parsedInt > 0) {
    return { count: parsedInt, diem: 0 };
  }

  return { count: 0, diem: 0 };
};

// Test cases
console.log('Test 1 ("0,2\\n5"):', parseTuLuanCell("0,2\n5"));
console.log('Test 2 ("0,2\\n 5"):', parseTuLuanCell("0,2\n 5"));
console.log('Test 3 ("0, 25"):', parseTuLuanCell("0, 25"));
console.log('Test 4 ("1"):', parseTuLuanCell("1"));
console.log('Test 5 ("1 (0,25đ)"):', parseTuLuanCell("1 (0,25đ)"));
console.log('Test 6 ("1 (0.25 đ)"):', parseTuLuanCell("1 (0.25 đ)"));
