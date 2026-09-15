// =============================================================================
// DỮ LIỆU CẤU TRÚC ĐỀ THI TUYỂN SINH VÀO LỚP 10 THPT MÔN KHTN
// Căn cứ: Quyết định số 1038/QĐ-SGDĐT ngày 31 tháng 7 năm 2024 của Sở GD&ĐT Hải Phòng
// =============================================================================

export const KHTN_VAO10_CONFIG = {
  id: 'khtn-vao10-hp',
  name: 'Cấu trúc Tuyển sinh Vào 10 KHTN (Hải Phòng - QĐ 1038)',
  shortName: 'KHTN Vào 10 HP',
  decision: '1038/QĐ-SGDĐT',
  thoiGian: '60 phút',
  tongDiem: 10.0,
  tongDiemP1: 5.5, // 22 câu nhiều lựa chọn (mỗi câu 0.25đ)
  tongDiemP2: 3.0, // 3 câu Đúng/Sai (12 ý, mỗi câu 4 ý: 2 Hiểu, 2 Vận dụng)
  tongDiemP3: 1.5, // 6 câu Trả lời ngắn (mỗi câu 0.25đ, tối đa 4 chữ số)
  tongDiemTL: 0.0, // Không có tự luận (100% trắc nghiệm)
  hasTuLuan: false,
  hasTraLoiNgan: true,
  tiLeNhanThuc: {
    biet: 40,      // 16 ý / 4.0đ (40%)
    hieu: 30,      // 12 ý / 3.0đ (30%)
    vanDung: 30,   // 12 ý / 3.0đ (30%)
    vanDungCao: 0  // Gộp vào Vận dụng
  },
  phanBoChiTiet: {
    phan1: { soCau: 22, biet: 16, hieu: 6, vanDung: 0, diem: 5.5 },
    phan2: { soCau: 3, soY: 12, biet: 0, hieu: 6, vanDung: 6, diem: 3.0, quyDinh: 'Mỗi câu có 2 ý Hiểu, 2 ý Vận dụng' },
    phan3: { soCau: 6, soY: 6, biet: 0, hieu: 0, vanDung: 6, diem: 1.5, quyDinh: 'Mỗi câu có 1 lệnh hỏi, đáp án tối đa 4 chữ số' }
  }
};

// 13 Chủ đề chuẩn theo Mục IV Bảng nội dung và mức độ tư duy (Kèm QĐ 1038 Hải Phòng)
export const KHTN_VAO10_SAMPLE_TOPICS = [
  // --- PHÂN MÔN VẬT LÍ (13 ý: 5 Biết, 4 Hiểu, 4 VD) ---
  {
    tenChuDe: 'Năng lượng cơ học',
    phanMon: 'vatLi',
    soTiet: 6,
    noiDung: '- Cơ năng, Động năng, thế năng.\n- Công và công suất.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được cơ năng là tổng động năng và thế năng. Nêu được khái niệm công và công suất.\nThông hiểu [NT2]: Tính được công cơ học và công suất trong các trường hợp đơn giản.',
    nhieuLuaChon: { biet: 1, hieu: 1, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Ánh sáng',
    phanMon: 'vatLi',
    soTiet: 10,
    noiDung: '- Định luật khúc xạ ánh sáng.\n- Sự phản xạ toàn phần.\n- Thấu kính.\n- Kính lúp.',
    yeuCauCanDat: 'Nhận biết [NT1]: Phát biểu được định luật khúc xạ ánh sáng. Nhận biết được thấu kính hội tụ, thấu kính phân kì.\nThông hiểu [NT2]: Trình bày được đường truyền của các tia sáng đặc biệt qua thấu kính.\nVận dụng [VD1]: Vận dụng kiến thức khúc xạ và thấu kính để giải bài toán xác định tiêu cự, vị trí ảnh hoặc độ bội giác kính lúp.',
    nhieuLuaChon: { biet: 2, hieu: 1, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 2, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Điện',
    phanMon: 'vatLi',
    soTiet: 12,
    noiDung: '- Dòng điện không đổi.\n- Điện trở, Định luật Ôm cho đoạn mạch.\n- Đoạn mạch nối tiếp và song song.\n- Năng lượng điện và công suất điện.',
    yeuCauCanDat: 'Nhận biết [NT1]: Phát biểu được định luật Ôm cho đoạn mạch. Nhận biết công thức năng lượng điện và công suất điện.\nThông hiểu [NT2]: Vận dụng định luật Ôm giải thích sự phụ thuộc của cường độ dòng điện vào điện trở và hiệu điện thế trong đoạn mạch nối tiếp, song song.\nVận dụng [VD1]: Tính toán các đại lượng I, U, R, công suất điện và điện năng tiêu thụ trong mạch hỗn hợp.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 2, vanDung: 2, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Từ',
    phanMon: 'vatLi',
    soTiet: 6,
    noiDung: '- Cảm ứng điện từ.\n- Dòng điện xoay chiều, tác dụng của dòng điện xoay chiều.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được điều kiện xuất hiện dòng điện cảm ứng. Nêu được các tác dụng của dòng điện xoay chiều.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },

  // --- PHÂN MÔN HÓA HỌC (14 ý: 6 Biết, 4 Hiểu, 4 VD) ---
  {
    tenChuDe: 'Kim loại',
    phanMon: 'hoaHoc',
    soTiet: 8,
    noiDung: '- Tính chất chung của kim loại.\n- Dãy hoạt động hoá học.\n- Tách kim loại và việc sử dụng hợp kim.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được tính chất vật lí và hoá học chung của kim loại. Nhận biết dãy hoạt động hoá học của kim loại.\nThông hiểu [NT3]: So sánh mức độ hoạt động hoá học của các kim loại dựa vào dãy hoạt động.\nVận dụng [VD1]: Vận dụng dãy hoạt động hoá học để dự đoán phản ứng và tính toán lượng chất.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 1, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Sự khác nhau cơ bản giữa phi kim và kim loại',
    phanMon: 'hoaHoc',
    soTiet: 3,
    noiDung: '- Sự khác nhau cơ bản giữa phi kim và kim loại.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được sự khác nhau cơ bản về tính chất vật lí và hoá học giữa kim loại và phi kim.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Hydrocarbon và nguồn nhiên liệu',
    phanMon: 'hoaHoc',
    soTiet: 8,
    noiDung: '- Giới thiệu về chất hữu cơ.\n- Alkane (ankan).\n- Alkene (anken).\n- Nguồn nhiên liệu.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được khái niệm hợp chất hữu cơ, hydrocarbon. Nhận biết công thức cấu tạo và tính chất của alkane (methane), alkene (ethylene).\nVận dụng [VD1]: Vận dụng tính chất phản ứng cháy và phản ứng cộng để giải bài toán định lượng.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 1, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Ethylic alcohol và acetic acid',
    phanMon: 'hoaHoc',
    soTiet: 8,
    noiDung: '- Ethylic alcohol (ancol etylic).\n- Acetic acid (axit axetic).',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được công thức phân tử, công thức cấu tạo và tính chất vật lí của ethylic alcohol, acetic acid.\nThông hiểu [NT2]: Trình bày được tính chất hoá học đặc trưng của rượu ethylic và axit axetic (phản ứng este hoá, tác dụng với kim loại, bazo).\nVận dụng [VD1]: Tính toán độ rượu, khối lượng este hoặc hiệu suất phản ứng este hoá.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 2, vanDung: 2, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Lipid – carbohydrate – Protein – Polymer',
    phanMon: 'hoaHoc',
    soTiet: 8,
    noiDung: '- Lipid (lipid) và chất béo.\n- Carbohydrate (cacbohidrat).\n- Glucose (glucozơ) và saccharose (saccarozơ).\n- Tinh bột và cellulose (xenlulozơ).\n- Protein.\n- Polymer (polime).',
    yeuCauCanDat: 'Nhận biết [NT1]: Nhận biết được thành phần, vai trò của chất béo, glucose, saccharose, tinh bột, cellulose, protein và polymer.\nThông hiểu [NT2]: Phân biệt được các carbohydrate dựa trên phản ứng tráng bạc và phản ứng màu với iodine.',
    nhieuLuaChon: { biet: 1, hieu: 1, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Khai thác tài nguyên từ vỏ trái đất',
    phanMon: 'hoaHoc',
    soTiet: 4,
    noiDung: '- Sơ lược về hoá học vỏ Trái Đất và khai thác tài nguyên từ vỏ Trái Đất.\n- Khai thác đá vôi.\n- Công nghiệp silicate.\n- Nguồn carbon. Chu trình carbon và sự ấm lên toàn cầu - Khai thác nhiên liệu hoá thạch.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được sơ lược về thành phần vỏ Trái Đất và nguồn tài nguyên đá vôi, nhiên liệu hoá thạch.\nThông hiểu [NT2]: Trình bày được chu trình carbon và giải thích được nguyên nhân gây ra sự ấm lên toàn cầu.',
    nhieuLuaChon: { biet: 1, hieu: 1, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },

  // --- PHÂN MÔN SINH HỌC (13 ý: 5 Biết, 4 Hiểu, 4 VD) ---
  {
    tenChuDe: 'Di truyền học Mendel. Cơ sở phân tử của hiện tượng di truyền',
    phanMon: 'sinhHoc',
    soTiet: 12,
    noiDung: '- Các quy luật di truyền của Mendel.\n- Nucleic và gene.\n- Tái bản DNA và phiên mã tạo RNA.\n- Dịch mã và mối quan hệ từ gen đến tính trạng.\n- Đột biến gene.',
    yeuCauCanDat: 'Nhận biết [NT1]: Phát biểu được các quy luật Mendel. Nhận biết cấu tạo phân tử DNA, RNA và gene.\nThông hiểu [NT2]: Trình bày được cơ chế tái bản DNA, phiên mã, dịch mã và hậu quả của đột biến gene.\nVận dụng [VD1]: Vận dụng nguyên tắc bổ sung và các công thức tính số nuclêôtit, chiều dài phân tử DNA/ARN, xác định kết quả lai theo Mendel.',
    nhieuLuaChon: { biet: 2, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 2, vanDung: 2, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Di truyền Nhiễm sắc thể',
    phanMon: 'sinhHoc',
    soTiet: 10,
    noiDung: '- Cấu tạo và chức năng của NST.\n- Nguyên phân và giảm phân.\n- NST giới tính và cơ chế xác định giới tính.\n- Di truyền liên kết.\n- Đột biến NST.',
    yeuCauCanDat: 'Nhận biết [NT1]: Mô tả được cấu tạo NST. Nhận biết diễn biến các kì của nguyên phân, giảm phân và các dạng đột biến NST.\nThông hiểu [NT2]: Phân biệt được nguyên phân và giảm phân; cơ chế xác định giới tính và ý nghĩa của di truyền liên kết.\nVận dụng [VD1]: Xác định số lượng NST, cromatit qua các kì phân bào hoặc phân tích cơ chế tạo thể đột biến NST.',
    nhieuLuaChon: { biet: 2, hieu: 2, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 2, vanDungCao: 0 }
  },
  {
    tenChuDe: 'Di truyền học với con người và đời sống',
    phanMon: 'sinhHoc',
    soTiet: 4,
    noiDung: '- Di truyền học với con người.\n- Ứng dụng công nghệ di truyền vào đời sống.',
    yeuCauCanDat: 'Nhận biết [NT1]: Nêu được một số bệnh, tật di truyền ở người và ứng dụng của công nghệ di truyền trong y học và nông nghiệp.',
    nhieuLuaChon: { biet: 1, hieu: 0, vanDung: 0 },
    dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
    traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }
  }
];

export const generateKhtnVao10Matrix = () => {
  let tfCounter = 1;
  let p1Counter = 1;
  let p3Counter = 1;

  return KHTN_VAO10_SAMPLE_TOPICS.map((topic, index) => {
    const topicId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('khtn-v10-t-' + (index + 1) + '-' + Math.random().toString(36).substring(2, 9));
    const dvId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('khtn-v10-dv-' + (index + 1) + '-' + Math.random().toString(36).substring(2, 9));
    const indicatorMap = {};
    const dungSaiSubItems = [];

    // Nhãn cho Phần I (NLC)
    for (let b = 0; b < (topic.nhieuLuaChon?.biet || 0); b++) {
      indicatorMap[`nhieuLuaChon_biet_${b}`] = { code: 'NT1', label: `I.${p1Counter++}` };
    }
    for (let h = 0; h < (topic.nhieuLuaChon?.hieu || 0); h++) {
      indicatorMap[`nhieuLuaChon_hieu_${h}`] = { code: 'NT2', label: `I.${p1Counter++}` };
    }

    // Nhãn cho Phần II (Đúng/Sai: 4 ý gồm 2 Hiểu, 2 VD)
    const dsHieu = Number(topic.dungSai?.hieu) || 0;
    const dsVd = Number(topic.dungSai?.vanDung) || 0;
    if (dsHieu >= 2 && dsVd >= 2) {
      const qNo = tfCounter++;
      dungSaiSubItems.push(
        { qNo, letter: 'a', lvl: 'hieu', label: `II.${qNo}a`, code: 'NT2' },
        { qNo, letter: 'b', lvl: 'hieu', label: `II.${qNo}b`, code: 'NT3' },
        { qNo, letter: 'c', lvl: 'vanDung', label: `II.${qNo}c`, code: 'VD1' },
        { qNo, letter: 'd', lvl: 'vanDung', label: `II.${qNo}d`, code: 'VD2' }
      );
      indicatorMap[`dungSai_hieu_0`] = { code: 'NT2', label: `II.${qNo}a` };
      indicatorMap[`dungSai_hieu_1`] = { code: 'NT3', label: `II.${qNo}b` };
      indicatorMap[`dungSai_vanDung_0`] = { code: 'VD1', label: `II.${qNo}c` };
      indicatorMap[`dungSai_vanDung_1`] = { code: 'VD2', label: `II.${qNo}d` };
    }

    // Nhãn cho Phần III (Trả lời ngắn: Vận dụng)
    for (let v = 0; v < (topic.traLoiNgan?.vanDung || 0); v++) {
      indicatorMap[`traLoiNgan_vanDung_${v}`] = { code: 'VD1', label: `III.${p3Counter++}` };
    }

    return {
      id: topicId,
      tenChuDe: 'Chủ đề ' + (index + 1) + ': ' + topic.tenChuDe,
      yeuCauCanDat: topic.yeuCauCanDat || '',
      donViKienThuc: [
        {
          id: dvId,
          noiDung: topic.noiDung,
          yeuCauCanDat: topic.yeuCauCanDat,
          soTiet: topic.soTiet,
          isNuaDauKi: false,
          nhieuLuaChon: { ...topic.nhieuLuaChon },
          dungSai: { ...topic.dungSai },
          dungSaiSubItems,
          traLoiNgan: { ...topic.traLoiNgan },
          tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0, subItems: [] },
          selectedIndicators: [],
          indicatorMap
        }
      ]
    };
  });
};
