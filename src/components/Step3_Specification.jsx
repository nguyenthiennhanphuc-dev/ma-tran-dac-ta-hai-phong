// Tên file: src/components/Step3_Specification.jsx
import React, { useState } from 'react';
import { useExamStore, getTopicSum, getTopicTuLuanDiem, isNewMathStructure } from '../store/useExamStore';
import { Copy } from 'lucide-react';
import { mathCompetencyGroups } from './data/mathIndicators';

export default function Step3_Specification() {
  const { matrix, config, examConfig, examHeader, updateTopicText, updateDvYccd, importYccdFromAIText } = useExamStore();
  const [yccdModal, setYccdModal] = useState({ show: false, topicId: null, text: '' });

  // =======================================================================
  // NHIỆM VỤ 1: Hàm xử lý ẩn/hiện mã năng lực trong YCCĐ
  // =======================================================================
  const formatYccdText = (text) => {
    if (!text) return '';
    if (config.showCompetencyCode !== false) return text;
    // Xóa mã nằm trong [...] hoặc (...) ở đầu hoặc cuối mỗi dòng
    return text.split('\n').map(line => {
      let s = line.replace(/^\s*\[[^\]]*\]\s*/g, '');
      s = s.replace(/^\s*\([^)]*\)\s*/g, '');
      s = s.replace(/\s*\[[^\]]*\]\s*$/g, '');
      s = s.replace(/\s*\([^)]*\)\s*$/g, '');
      return s;
    }).join('\n');
  };

  // NHIỆM VỤ 2: Kiểm tra môn Hóa (đồng bộ regex với Step2_MatrixBuilder)
  const isHoaMon = /hóa|hoá/i.test(examHeader?.monHoc || '');
  const isToanMon = /toán|toan/i.test(examHeader?.monHoc || '');

  // =======================================================================
  // NHIỆM VỤ 1 (Hướng A): Tự động phát hiện mã năng lực Hóa từ nội dung YCCĐ
  // Dựa trên khung năng lực GDPT 2018:
  //   HH1.1 = Nhận biết   |  HH1.2 = Trình bày
  //   HH1.6 = Giải thích  |  HH2.4 = Vận dụng thực tiễn
  // =======================================================================
  const getIndicatorForLevel = (text, level) => {
    if (!text || !isHoaMon || config.showCompetencyCode === false) return null;
    const lower = text.toLowerCase();
    const codes = [];
    if (level === 'biet') {
      // HH1 - Nhận thức hóa học
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
      // HH1 nâng cao
      if (/từ khóa|thuật ngữ khoa học|kết nối.*thông tin|dàn ý|văn bản khoa học/.test(lower)) codes.push('HH1.7');
      if (/thảo luận|nhận định phê phán|phê phán/.test(lower)) codes.push('HH1.8');
      // HH2 - Tìm hiểu thế giới tự nhiên
      if (/đề xuất vấn đề|đặt được câu hỏi|phân tích.*bối cảnh/.test(lower)) codes.push('HH2.1');
      if (/phán đoán|giả thuyết|xây dựng.*giả thuyết/.test(lower)) codes.push('HH2.2');
      if (/lập kế hoạch|xây dựng.*khung logic|lựa chọn.*phương pháp/.test(lower)) codes.push('HH2.3');
      if (/thu thập|chứng cứ|thực nghiệm|phân tích.*dữ liệu|rút ra.*kết luận|thí nghiệm.*thực tiễn|đề xuất.*phương án thí nghiệm/.test(lower)) codes.push('HH2.4');
      if (/viết.*báo cáo|trình bày báo cáo|thảo luận.*kết quả|phản biện.*bảo vệ/.test(lower)) codes.push('HH2.5');
      // HH3 - Vận dụng kiến thức
      if (/vận dụng.*giải thích|vận dụng.*tính toán|vận dụng.*công thức|hiện tượng tự nhiên|ứng dụng.*cuộc sống/.test(lower)) codes.push('HH3.1');
      if (/phản biện|đánh giá ảnh hưởng|vận dụng.*đánh giá/.test(lower)) codes.push('HH3.2');
      if (/đề xuất.*phương pháp|đề xuất.*biện pháp|đề xuất.*mô hình|đề xuất.*kế hoạch|giải quyết vấn đề.*thực tiễn/.test(lower)) codes.push('HH3.3');
      if (/định hướng.*nghề|ngành.*nghề/.test(lower)) codes.push('HH3.4');
      if (/ứng xử|phát triển bền vững|bảo vệ môi trường/.test(lower)) codes.push('HH3.5');
      // Fallback nếu chưa match gì ở VD
      if (codes.length === 0 && /vận dụng|giải quyết|thực tiễn|tính toán|thực hành/.test(lower)) codes.push('HH3.1');
    }
    // Loại bỏ trùng lặp
    const unique = [...new Set(codes)];
    return unique.length > 0 ? unique.join(', ') : null;
  };

  // =======================================================================
  // NHIỆM VỤ 3: Tự động phát hiện mã năng lực Toán từ nội dung YCCĐ
  // Dựa trên khung năng lực Toán học GDPT 2018:
  //   TD = Tư duy & Lập luận | GQ = Giải quyết vấn đề | MH = Mô hình hoá
  //   GT = Giao tiếp Toán học | CC = Công cụ & Phương tiện
  // =======================================================================
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
      // Fallback
      if (codes.length === 0 && /vận dụng|giải quyết|thực tiễn|tính toán/.test(lower)) codes.push('TD2.2');
    }
    const unique = [...new Set(codes)];
    return unique.length > 0 ? unique.join(', ') : null;
  };

  // =======================================================================
  // HELPERS: Tính tổng từ tất cả ĐVKT
  // =======================================================================
  const sumAll = (type, level) => matrix.reduce((sum, topic) => sum + getTopicSum(topic, type, level), 0);

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

  // Helpers: Format giá trị kèm mã năng lực (NT, TH, VD) hoặc chỉ báo
  const fmtNLC = (val, level, dv, type) => {
    if (!val) return '';
    if (config.showCompetencySymbol === false) return <span>{val}</span>;
    let tag = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    let mappedInd = getIndicatorsForCell(dv, type, level);
    if (mappedInd) {
      tag = mappedInd;
    } else {
      let indicator = isToanMon ? getMathIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (indicator) tag = indicator;
    }
    return <span>{val}<br/><span className="text-[10px] text-slate-500">({tag})</span></span>;
  };
  const fmtY = (val, level, dv, type) => {
    if (!val) return '';
    if (config.showCompetencySymbol === false) return <span>{val} ý</span>;
    let tag = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    let mappedInd = getIndicatorsForCell(dv, type, level);
    if (mappedInd) {
      tag = mappedInd;
    } else {
      let indicator = isToanMon ? getMathIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (indicator) tag = indicator;
    }
    return <span>{val} ý<br/><span className="text-[10px] text-slate-500">({tag})</span></span>;
  };

  const getTopicTuLuanPoints = (topic) =>
    getTopicTuLuanDiem(topic, 'diemBiet') + getTopicTuLuanDiem(topic, 'diemHieu') + getTopicTuLuanDiem(topic, 'diemVanDung');

  const getColumnTotalPoints = (type) => {
    if (type === 'tuLuan') return Math.round(matrix.reduce((sum, t) => sum + getTopicTuLuanPoints(t), 0) * 100) / 100;
    let totalCount = sumAll(type, 'biet') + sumAll(type, 'hieu') + sumAll(type, 'vanDung');
    if (type === 'dungSai') totalCount += sumAll(type, 'vanDungCao');
    if (type === 'nhieuLuaChon') return Math.round(totalCount * examConfig.diemMoiCauP1 * 100) / 100;
    if (type === 'dungSai') return Math.round(totalCount * examConfig.diemMoiYP2 * 100) / 100;
    if (type === 'traLoiNgan') return config.hasTraLoiNgan ? Math.round(totalCount * examConfig.diemMoiYP3 * 100) / 100 : 0;
    return 0;
  };

  // =========================================================================
  // SIÊU LỆNH: ÉP AI TÌM ĐÚNG BÀI TRONG SÁCH GIÁO KHOA
  // =========================================================================
  const handleCopyPrompt = async (topic) => {
    const tenChuDe = topic.tenChuDe;
    const dvList = topic.donViKienThuc || [];

    if (!tenChuDe && dvList.every(dv => !dv.noiDung)) {
      alert("Vui lòng nhập Tên chủ đề hoặc Nội dung kiến thức ở Bước 1 trước khi tạo lệnh nhé!");
      return;
    }

    let prompt = `Đóng vai chuyên gia xây dựng ma trận đặc tả đề thi. Hãy viết "Yêu cầu cần đạt" cho Chủ đề: ${topic.tenChuDe || 'Chưa rõ'}.\n\n`;
    prompt += `Dựa vào ma trận đề thi, các Nội dung/Đơn vị kiến thức dưới đây yêu cầu đánh giá ở các mức độ cụ thể. Bạn CHỈ ĐƯỢC VIẾT Yêu cầu cần đạt tương ứng với các mức độ được giao:\n\n`;

    dvList.forEach((dv, index) => {
      // Tính tổng số lượng câu/ý của từng mức độ cho ĐVKT này
      const sumBiet = (dv.nhieuLuaChon?.biet || 0) + (dv.dungSai?.biet || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.biet || 0) : 0) + (typeof dv.tuLuan?.biet === 'object' ? dv.tuLuan.biet.y : (dv.tuLuan?.biet || 0));
      const sumHieu = (dv.nhieuLuaChon?.hieu || 0) + (dv.dungSai?.hieu || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.hieu || 0) : 0) + (typeof dv.tuLuan?.hieu === 'object' ? dv.tuLuan.hieu.y : (dv.tuLuan?.hieu || 0));
      const sumVD = (dv.nhieuLuaChon?.vanDung || 0) + (dv.dungSai?.vanDung || 0) + (dv.dungSai?.vanDungCao || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.vanDung || 0) : 0) + (typeof dv.tuLuan?.vanDung === 'object' ? dv.tuLuan.vanDung.y : (dv.tuLuan?.vanDung || 0));

      let requiredLevels = [];
      if (sumBiet > 0) requiredLevels.push("Nhận biết");
      if (sumHieu > 0) requiredLevels.push("Thông hiểu");
      if (sumVD > 0) requiredLevels.push("Vận dụng");

      // Nếu bài học này có câu hỏi thì mới yêu cầu AI viết YCCĐ
      if (requiredLevels.length > 0) {
        prompt += `**${index + 1}. ${dv.noiDung || 'Chưa rõ'}**\n`;
        prompt += `- Mức độ cần viết: [ ${requiredLevels.join(", ")} ]\n\n`;
      }
    });

    prompt += `⚠️ 3 YÊU CẦU BẮT BUỘC (PHẢI TUÂN THỦ TUYỆT ĐỐI):\n`;
    prompt += `1. Trình bày tách biệt YCCĐ cho từng nội dung. Giữ nguyên định dạng in đậm tên bài (Ví dụ: **1. ${dvList[0]?.noiDung || 'Tên bài'}**).\n`;
    prompt += `2. CỰC KỲ NGẮN GỌN: Mỗi mức độ nhận thức CHỈ ĐƯỢC VIẾT ĐÚNG 1 CÂU (1 DÒNG). Tuyệt đối không liệt kê dài dòng, không giải thích thêm.\n`;
    prompt += `3. Định dạng đầu ra mong muốn:\n   - Nhận biết: [Ghi 1 câu ngắn gọn...]\n   - Thông hiểu: [Ghi 1 câu ngắn gọn...]`;

    try {
      await navigator.clipboard.writeText(prompt);
      alert("✅ ĐÃ COPY LỆNH TẠO YÊU CẦU CẦN ĐẠT THÀNH CÔNG!\n\nBƯỚC TIẾP THEO:\n1. Mở trang ChatGPT hoặc Gemini.\n2. Dán (Ctrl+V) lệnh vừa copy vào ô chat.\n3. Bấm nút ĐÍNH KÈM (Hình ghim kẹp giấy) và tải file Sách giáo khoa (PDF/Word) lên.\n4. Gửi cho AI, sau đó copy kết quả dán ngược lại vào phần mềm nhé!");
    } catch (err) {
      alert("Lỗi khi copy. Trình duyệt của bạn có thể không hỗ trợ tính năng này.");
    }
  };

  // =======================================================================
  // BUILD ROWS: Double-loop — topic → ĐVKT
  // =======================================================================
  const buildBodyRows = () => {
    const rows = [];
    matrix.forEach((topic, topicIdx) => {
      const dvList = topic.donViKienThuc || [];
      const dvCount = dvList.length;

      dvList.forEach((dv, dvIdx) => {
        const isFirst = dvIdx === 0;

        rows.push(
          <tr key={`${topic.id}_${dv.id}`} className="hover:bg-slate-50 transition-colors">
            {/* CỘT TT — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-2 text-center font-medium text-slate-600 align-top">{topicIdx + 1}</td>
            )}

            {/* CỘT CHỦ ĐỀ — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-2 text-slate-700 font-medium align-top relative group">
                <div className="flex flex-col gap-2">
                  <span>{topic.tenChuDe || <span className="text-gray-400 italic">...</span>}</span>
                  <div className="mt-2 text-center">
                    <button
                      onClick={() => handleCopyPrompt(topic)}
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-2 py-1.5 rounded text-xs font-bold shadow hover:shadow-md hover:scale-105 transition-all w-full"
                      title="Tự động nặn câu lệnh để dán vào ChatGPT/Gemini"
                    >
                      <Copy size={13} /> Copy Lệnh AI
                    </button>
                    <button
                      onClick={() => setYccdModal({ show: true, topicId: topic.id, text: '' })}
                      className="mt-2 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded font-bold shadow hover:shadow-md transition-all w-full flex items-center justify-center gap-1.5"
                    >
                      📥 Dán YCCĐ từ AI
                    </button>
                  </div>
                </div>
              </td>
            )}

            {/* CỘT ĐVKT — Mỗi ĐVKT 1 ô */}
            <td className="border border-slate-300 p-2 text-slate-700 align-top text-sm">
              {dv.noiDung ? `- ${dv.noiDung}` : <span className="text-gray-400 italic">...</span>}
            </td>

            {/* CỘT YCCĐ — Mỗi ĐVKT 1 ô, không gộp rowSpan nữa */}
            <td className="border border-slate-300 p-2 align-top bg-yellow-50/20">
              {/* Đã ẩn Badge mã năng lực Hóa ở đây theo yêu cầu để đưa xuống dưới các ý/câu */}
              <textarea
                className="w-full h-full min-h-[80px] bg-transparent outline-none resize-y p-1 border border-transparent focus:border-yellow-300 rounded focus:bg-white transition-colors text-sm leading-relaxed text-slate-700"
                style={{ fontFamily: "'Times New Roman', serif" }}
                placeholder="- YCCĐ của ĐVKT này..."
                value={formatYccdText(dv.yeuCauCanDat || '')}
                onChange={(e) => updateDvYccd(topic.id, dv.id, e.target.value)}
              />
            </td>

            {/* CÁC CỘT SỐ CÂU — ĐỌC TỪ ĐVKT + MÃ NĂNG LỰC */}
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtNLC(dv.nhieuLuaChon?.biet, 'biet', dv, 'nhieuLuaChon')}</td>
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtNLC(dv.nhieuLuaChon?.hieu, 'hieu', dv, 'nhieuLuaChon')}</td>
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtNLC(dv.nhieuLuaChon?.vanDung, 'vanDung', dv, 'nhieuLuaChon')}</td>
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtY(dv.dungSai?.biet, 'biet', dv, 'dungSai')}</td>
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtY(dv.dungSai?.hieu, 'hieu', dv, 'dungSai')}</td>
            <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtY((dv.dungSai?.vanDung || 0) + (dv.dungSai?.vanDungCao || 0), 'vanDung', dv, 'dungSai')}</td>
            <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>{config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.biet, 'biet', dv, 'traLoiNgan') : ''}</td>
            <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>{config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.hieu, 'hieu', dv, 'traLoiNgan') : ''}</td>
            <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>{config.hasTraLoiNgan ? fmtY(dv.traLoiNgan?.vanDung, 'vanDung', dv, 'traLoiNgan') : ''}</td>
            {config.hasTuLuan && (
              <>
                <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">{fmtY(dv.tuLuan?.biet, 'biet', dv, 'tuLuan')}</td>
                <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">{fmtY(dv.tuLuan?.hieu, 'hieu', dv, 'tuLuan')}</td>
                <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">{fmtY(dv.tuLuan?.vanDung, 'vanDung', dv, 'tuLuan')}</td>
              </>
            )}
          </tr>
        );
      });
    });
    return rows;
  };

  // =======================================================================
  // NEW MATH BODY: Render theo mẫu ảnh (4-2-0)
  // Gộp tất cả mức độ của 1 ĐVKT vào 1 dòng duy nhất
  // =======================================================================
  const buildNewMathBodyRows = () => {
    const rows = [];
    matrix.forEach((topic, topicIdx) => {
      const dvList = topic.donViKienThuc || [];
      const topicTotalRows = dvList.length;

      dvList.forEach((dv, dvIdx) => {
        const isFirstInTopic = dvIdx === 0;

        // Collect question info for the entire ĐVKT
        const mappingCodes = {
          nlc_biet: '', nlc_hieu: '', nlc_vd: '',
          ds_biet: '', ds_hieu: '', ds_vd: '',
          tl_biet: '', tl_hieu: '', tl_vd: ''
        };
        const summary = {
          nlc: { count: 0, labels: [] },
          ds: { count: 0, labels: [] },
          traLoiNgan: { count: 0, labels: [] },
          tl: { count: 0, labels: [] }
        };

        ['nhieuLuaChon', 'dungSai', 'traLoiNgan', 'tuLuan'].forEach(type => {
          ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(tl => {
            let count = 0;
            if (type === 'tuLuan') {
              count = dv.tuLuan?.subItems?.filter(s => s.level === tl).length || 0;
            } else {
              count = dv[type]?.[tl] || 0;
            }

            if (count > 0) {
              const typeKey = type === 'nhieuLuaChon' ? 'nlc' : (type === 'dungSai' ? 'ds' : (type === 'traLoiNgan' ? 'traLoiNgan' : 'tl'));
              summary[typeKey].count += count;

              const codes = [];
              for (let i = 0; i < count; i++) {
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
              const gridKey = `${typeKey === 'tl' ? 'tl' : (typeKey === 'ds' ? 'ds' : 'nlc')}_${gridLvl}`;
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

        rows.push(
          <tr key={`${topic.id}_${dv.id}`} className="hover:bg-slate-50 transition-colors">
            {isFirstInTopic && (
              <td rowSpan={topicTotalRows} className="border border-slate-300 p-2 text-center font-bold text-slate-800 align-top">{topicIdx + 1}</td>
            )}
            {isFirstInTopic && (
              <td rowSpan={topicTotalRows} className="border border-slate-300 p-2 text-red-600 font-bold align-top uppercase text-xs">
                <div className="flex flex-col gap-2">
                  <span>{topic.tenChuDe || "..."}</span>
                  <div className="mt-2 text-center normal-case">
                    <button
                      onClick={() => handleCopyPrompt(topic)}
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow hover:shadow-md hover:scale-105 transition-all w-full mb-1"
                      title="Tự động nặn câu lệnh để dán vào ChatGPT/Gemini"
                    >
                      <Copy size={11} /> Copy Lệnh AI
                    </button>
                    <button
                      onClick={() => setYccdModal({ show: true, topicId: topic.id, text: '' })}
                      className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded font-bold shadow hover:shadow-md transition-all w-full flex items-center justify-center gap-1.5"
                    >
                      📥 Dán YCCĐ
                    </button>
                  </div>
                </div>
              </td>
            )}
            <td className="border border-slate-300 p-2 text-slate-800 font-medium align-top text-xs">
              {dv.noiDung ? (dv.noiDung.includes('Bài') ? dv.noiDung : `Bài. ${dv.noiDung}`) : "..."}
            </td>
            <td className="border border-slate-300 p-2 text-xs align-top bg-yellow-50/20">
              <textarea
                className="w-full h-full min-h-[80px] bg-transparent outline-none resize-y p-1 border border-transparent focus:border-yellow-300 rounded focus:bg-white transition-colors text-xs leading-relaxed text-slate-700"
                style={{ fontFamily: "'Times New Roman', serif" }}
                placeholder="- YCCĐ của ĐVKT này..."
                value={formatYccdText(dv.yeuCauCanDat || '')}
                onChange={(e) => updateDvYccd(topic.id, dv.id, e.target.value)}
              />
            </td>
            {/* CỘT SỐ CÂU (TỔNG) */}
            <td className="border border-slate-300 p-1 text-center font-bold text-slate-800 text-xs">
              {totalQuestions || ''}
            </td>
            {/* CỘT STT (CHIỀU DỌC) */}
            <td className="border border-slate-300 p-1 text-center font-medium text-slate-700 text-[10px] leading-tight">
              <div className="flex flex-col">
                {allLabels.map((lab, i) => <div key={i}>{lab}</div>)}
              </div>
            </td>
            {/* Grid mã năng lực */}
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{mappingCodes.nlc_biet}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{mappingCodes.nlc_hieu}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{mappingCodes.nlc_vd}</td>
            
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{mappingCodes.ds_biet}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{mappingCodes.ds_hieu}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{mappingCodes.ds_vd}</td>
            
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{mappingCodes.tl_biet}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{mappingCodes.tl_hieu}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{mappingCodes.tl_vd}</td>
          </tr>
        );
      });
    });
    return rows;
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Copy className="text-emerald-600" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
            Bản đặc tả đề kiểm tra
          </h2>
          <p className="text-sm text-slate-500">Yêu cầu cần đạt và phân bổ câu hỏi</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-400 text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
          {isNewMathStructure(examConfig, config) ? (
            <thead className="bg-slate-100 text-center font-bold text-[11px]">
              <tr>
                <th rowSpan="4" className="border border-slate-400 p-1 w-8">TT</th>
                <th rowSpan="4" className="border border-slate-400 p-1 w-24">Chương/ chủ đề</th>
                <th rowSpan="4" className="border border-slate-400 p-1 w-32">Nội dung/ đơn vị kiến thức</th>
                <th rowSpan="4" className="border border-slate-400 p-1 w-56">Yêu cầu cần đạt</th>
                <th colSpan="2" rowSpan="3" className="border border-slate-400 p-1">Câu</th>
                <th colSpan="9" className="border border-slate-400 p-1">Mức độ đánh giá</th>
              </tr>
              <tr>
                <th colSpan="6" className="border border-slate-400 p-1">Trắc nghiệm khách quan</th>
                <th colSpan="3" rowSpan="2" className="border border-slate-400 p-1">Tự luận</th>
              </tr>
              <tr>
                <th colSpan="3" className="border border-slate-400 p-1">Nhiều lựa chọn</th>
                <th colSpan="3" className="border border-slate-400 p-1">Đúng/sai</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-slate-400 p-1 w-10">Số câu</th>
                <th className="border border-slate-400 p-1 w-12">STT</th>
                <td className="border border-slate-400 p-1">Biết</td>
                <td className="border border-slate-400 p-1">Hiểu</td>
                <td className="border border-slate-400 p-1">VD</td>
                <td className="border border-slate-400 p-1">Biết</td>
                <td className="border border-slate-400 p-1">Hiểu</td>
                <td className="border border-slate-400 p-1">VD</td>
                <td className="border border-slate-400 p-1">Biết</td>
                <td className="border border-slate-400 p-1">Hiểu</td>
                <td className="border border-slate-400 p-1">VD</td>
              </tr>
            </thead>
          ) : (
            <thead className="bg-slate-100 text-center font-semibold">
              <tr>
                <th rowSpan="4" className="border border-slate-400 p-2 w-10">TT</th>
                <th rowSpan="4" className="border border-slate-400 p-2 w-32">Chủ đề/Chương</th>
                <th rowSpan="4" className="border border-slate-400 p-2 w-40">Nội dung/Đơn vị KT</th>
                <th rowSpan="4" className="border border-slate-400 p-2 w-64 bg-yellow-50">Yêu cầu cần đạt</th>
                <th colSpan={config.hasTuLuan ? "12" : "9"} className="border border-slate-400 p-2">Số câu hỏi ở các mức độ đánh giá</th>
              </tr>
              <tr>
                <th colSpan="9" className="border border-slate-400 p-1 bg-blue-50">TNKQ</th>
                {config.hasTuLuan && <th colSpan="3" rowSpan="2" className="border border-slate-400 p-1 bg-green-50">Tự luận</th>}
              </tr>
              <tr>
                <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Nhiều lựa chọn</th>
                <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Đúng - Sai (Ý)</th>
                <th colSpan="3" className={`border border-slate-400 p-1 ${config.hasTraLoiNgan ? 'bg-blue-50/80' : 'bg-slate-200 text-slate-400'}`}>Trả lời ngắn (Ý)</th>
              </tr>
              <tr>
                <th className="border border-slate-400 p-1 font-medium bg-blue-50/30">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">VD</th>
                <th className="border border-slate-400 p-1 font-medium bg-blue-50/30">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">VD</th>
                <th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>B</th><th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>H</th><th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>B</th>
                {config.hasTuLuan && (
                  <>
                    <th className="border border-slate-400 p-1 font-medium bg-green-50/30">B</th><th className="border border-slate-400 p-1 font-medium bg-green-50/30">H</th><th className="border border-slate-400 p-1 font-medium bg-green-50/30">VD</th>
                  </>
                )}
              </tr>
            </thead>
          )}

          <tbody>
            {isNewMathStructure(examConfig, config) ? buildNewMathBodyRows() : buildBodyRows()}
          </tbody>

          <tfoot className="bg-slate-200 font-bold text-center text-slate-800">
            <tr>
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng (Ý)</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'biet')}</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'hieu')}</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'vanDung')}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'biet')}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'hieu')}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'vanDung') + sumAll('dungSai', 'vanDungCao')}</td>
              <td className={`border border-slate-400 p-2 ${config.hasTraLoiNgan ? 'text-blue-800' : 'text-slate-400 bg-slate-100'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'biet') : 0}</td>
              <td className={`border border-slate-400 p-2 ${config.hasTraLoiNgan ? 'text-blue-800' : 'text-slate-400 bg-slate-100'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'hieu') : 0}</td>
              <td className={`border border-slate-400 p-2 ${config.hasTraLoiNgan ? 'text-blue-800' : 'text-slate-400 bg-slate-100'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'vanDung') : 0}</td>
              {config.hasTuLuan && (
                <>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'biet')}</td>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'hieu')}</td>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'vanDung')}</td>
                </>
              )}
            </tr>

            <tr className="bg-slate-100">
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng số câu</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'biet')}</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'hieu')}</td>
              <td className="border border-slate-400 p-2">{sumAll('nhieuLuaChon', 'vanDung')}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'biet') * 0.25}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'hieu') * 0.25}</td>
              <td className="border border-slate-400 p-2 text-blue-800">{(sumAll('dungSai', 'vanDung') + sumAll('dungSai', 'vanDungCao')) * 0.25}</td>
              <td className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'biet') : 0}</td>
              <td className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'hieu') : 0}</td>
              <td className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? sumAll('traLoiNgan', 'vanDung') : 0}</td>
              {config.hasTuLuan && (
                <>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'biet')}</td>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'hieu')}</td>
                  <td className="border border-slate-400 p-2 text-green-800">{sumAll('tuLuan', 'vanDung')}</td>
                </>
              )}
            </tr>

            <tr className="bg-slate-300">
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng điểm</td>
              <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('nhieuLuaChon')}</td>
              <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>
              <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-200' : ''}`}>{getColumnTotalPoints('traLoiNgan')}</td>
              {config.hasTuLuan && <td colSpan="3" className="border border-slate-400 p-2 text-red-600">{getColumnTotalPoints('tuLuan')}</td>}
            </tr>

            <tr className="bg-slate-200">
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tỉ lệ %</td>
              <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
              <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
              <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-100' : ''}`}>{config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + '%' : '0%'}</td>
              {config.hasTuLuan && <td colSpan="3" className="border border-slate-400 p-2 text-red-600">{((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '')}%</td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ================================================================= */}
      {/* NHIỆM VỤ 2 + 3: BẢNG CHÚ GIẢI CHÂN BẢNG                          */}
      {/* ================================================================= */}
      <div className="mt-4 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-blue-50/30 p-5 shadow-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          📌 Lưu ý
        </h3>
        {isHoaMon ? (
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-blue-100/60">
                <th className="border border-slate-300 px-3 py-2 text-left w-28">Mã năng lực</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody>
              {/* === I. Nhận thức hóa học (HH1) === */}
              <tr className="bg-blue-50/80"><td colSpan="2" className="border border-slate-300 px-3 py-2 font-bold text-blue-800">I. Nhận thức hóa học (Mã HH1)</td></tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.1</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Nhận biết và nêu được tên của các đối tượng, sự kiện, khái niệm hoặc quá trình hóa học.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.2</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Trình bày được sự kiện, đặc điểm, vai trò của các đối tượng, khái niệm hoặc quá trình hóa học.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.3</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Mô tả được đối tượng bằng các hình thức nói, viết, công thức, sơ đồ, biểu đồ, bảng.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.4</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">So sánh, phân loại, lựa chọn được các đối tượng, khái niệm hoặc quá trình hóa học theo các tiêu chí khác nhau.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.5</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Phân tích được các khía cạnh của các đối tượng, khái niệm hoặc quá trình hóa học theo logic nhất định.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.6</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Giải thích và lập luận được về mối quan hệ giữa các đối tượng, khái niệm hoặc quá trình hóa học.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.7</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Tìm được từ khóa, sử dụng được thuật ngữ khoa học, kết nối được thông tin theo logic có ý nghĩa.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-blue-700">HH1.8</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Thảo luận, đưa ra được những nhận định phê phán có liên quan đến chủ đề.</td>
              </tr>
              {/* === II. Tìm hiểu thế giới tự nhiên dưới góc độ hóa học (HH2) === */}
              <tr className="bg-emerald-50/80"><td colSpan="2" className="border border-slate-300 px-3 py-2 font-bold text-emerald-800">II. Tìm hiểu thế giới tự nhiên dưới góc độ hóa học (Mã HH2)</td></tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-emerald-700">HH2.1</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Đề xuất vấn đề: nhận ra và đặt được câu hỏi liên quan đến vấn đề; phân tích được bối cảnh để đề xuất vấn đề.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-emerald-700">HH2.2</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Đưa ra phán đoán và xây dựng giả thuyết nghiên cứu.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-emerald-700">HH2.3</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Lập kế hoạch thực hiện: xây dựng được khung logic nội dung; lựa chọn được phương pháp thích hợp.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-emerald-700">HH2.4</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Thực hiện kế hoạch: thu thập sự kiện và chứng cứ; phân tích dữ liệu; rút ra kết luận.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-emerald-700">HH2.5</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Viết, trình bày báo cáo và thảo luận: sử dụng ngôn ngữ, hình vẽ, sơ đồ để biểu đạt quá trình và kết quả.</td>
              </tr>
              {/* === III. Vận dụng kiến thức, kĩ năng đã học (HH3) === */}
              <tr className="bg-amber-50/80"><td colSpan="2" className="border border-slate-300 px-3 py-2 font-bold text-amber-800">III. Vận dụng kiến thức, kĩ năng đã học (Mã HH3)</td></tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-amber-700">HH3.1</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Vận dụng được kiến thức hóa học để phát hiện, giải thích được một số hiện tượng tự nhiên, ứng dụng của hóa học trong cuộc sống.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-amber-700">HH3.2</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Vận dụng được kiến thức hóa học để phản biện, đánh giá ảnh hưởng của một vấn đề thực tiễn.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-amber-700">HH3.3</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Vận dụng được kiến thức tổng hợp để đánh giá ảnh hưởng và đề xuất phương pháp, biện pháp giải quyết vấn đề.</td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-amber-700">HH3.4</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Định hướng được ngành, nghề sẽ chọn sau khi thi tốt nghiệp trung học phổ thông.</td>
              </tr>
              <tr className="hover:bg-white/60 transition-colors">
                <td className="border border-slate-300 px-3 py-2 font-bold text-amber-700">HH3.5</td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">Ứng xử thích hợp trong các tình huống phù hợp với yêu cầu phát triển bền vững và bảo vệ môi trường.</td>
              </tr>
            </tbody>
          </table>
        ) : isToanMon ? (
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-blue-100/60">
                <th className="border border-slate-300 px-3 py-2 text-left w-28">Mã năng lực</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(mathCompetencyGroups).map(([groupKey, group]) => (
                <React.Fragment key={groupKey}>
                  <tr className={`${groupKey === 'TD' ? 'bg-blue-50/80' : groupKey === 'GQ' ? 'bg-emerald-50/80' : groupKey === 'MH' ? 'bg-amber-50/80' : groupKey === 'GT' ? 'bg-purple-50/80' : 'bg-rose-50/80'}`}>
                    <td colSpan="2" className={`border border-slate-300 px-3 py-2 font-bold ${groupKey === 'TD' ? 'text-blue-800' : groupKey === 'GQ' ? 'text-emerald-800' : groupKey === 'MH' ? 'text-amber-800' : groupKey === 'GT' ? 'text-purple-800' : 'text-rose-800'}`}>
                      {groupKey === 'TD' ? 'I.' : groupKey === 'GQ' ? 'II.' : groupKey === 'MH' ? 'III.' : groupKey === 'GT' ? 'IV.' : 'V.'} {group.name} (Mã {groupKey})
                    </td>
                  </tr>
                  {group.indicators.map((ind, idx) => (
                    <tr key={ind.code} className={`${idx % 2 === 0 ? 'bg-slate-50/50' : ''} hover:bg-white/60 transition-colors`}>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-center" style={{ color: groupKey === 'TD' ? '#1d4ed8' : groupKey === 'GQ' ? '#047857' : groupKey === 'MH' ? '#b45309' : groupKey === 'GT' ? '#7e22ce' : '#be123c' }}>{ind.code}</td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-700">{ind.content}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
              <span className="font-bold text-blue-700 text-xs bg-blue-100 px-2 py-0.5 rounded">TN</span>
              <span className="text-slate-600">Trắc nghiệm</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
              <span className="font-bold text-blue-700 text-xs bg-blue-100 px-2 py-0.5 rounded">ĐS</span>
              <span className="text-slate-600">Đúng/Sai</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
              <span className="font-bold text-blue-700 text-xs bg-blue-100 px-2 py-0.5 rounded">TNB</span>
              <span className="text-slate-600">Trả lời ngắn</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
              <span className="font-bold text-green-700 text-xs bg-green-100 px-2 py-0.5 rounded">TL</span>
              <span className="text-slate-600">Tự luận</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500 italic">B = Nhận biết, H = Thông hiểu, VD = Vận dụng (bao gồm Vận dụng và Vận dụng cao).</p>
      </div>

      {/* Modal Nhập Nhanh YCCĐ */}
      {yccdModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                📥 Dán Yêu cầu cần đạt từ ChatGPT
              </h2>
              <button
                onClick={() => setYccdModal({ show: false, topicId: null, text: '' })}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 italic">
                💡 Hướng dẫn: Dán nguyên văn bản trả lời của AI vào đây. Hệ thống sẽ tự động bóc tách và điền vào các bài học tương ứng dựa theo số thứ tự (1, 2, 3...).
              </p>

              <textarea
                value={yccdModal.text}
                onChange={(e) => setYccdModal({ ...yccdModal, text: e.target.value })}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData('text/plain');
                  setYccdModal({ ...yccdModal, text: yccdModal.text + pastedData });
                }}
                rows={10}
                className="w-full border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-blue-500 font-mono text-sm leading-relaxed resize-none bg-slate-50"
                placeholder="Dán nội dung từ AI vào đây..."
              />

              <div className="flex justify-end items-center gap-4 mt-2">
                <button
                  onClick={() => setYccdModal({ show: false, topicId: null, text: '' })}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!yccdModal.text.trim()) {
                      alert("Vui lòng nhập dữ liệu!");
                      return;
                    }
                    importYccdFromAIText(yccdModal.topicId, yccdModal.text);
                    setYccdModal({ show: false, topicId: null, text: '' });
                    alert("Đã phân bổ YCCĐ thành công!");
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:shadow-lg hover:bg-blue-700 transition-all"
                >
                  Xác nhận Dán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}