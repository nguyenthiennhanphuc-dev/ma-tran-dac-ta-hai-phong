// Tên file: src/components/Step3_Specification.jsx
import React, { useState } from 'react';
import { useExamStore, getTopicSum, getTopicTuLuanDiem, getTuLuanCauCount, isNewMathStructure } from '../store/useExamStore';
import { Copy, Trash2 } from 'lucide-react';
import { mathCompetencyGroups } from './data/mathIndicators';
import { khtnCompetencyGroupsByLop, khtnCompetencyGroups } from './data/khtnIndicators';
import { formatGroupedLabels } from '../utils/labelUtils';
import { getActiveLevelsForDv, formatLevelDisplayName, parseYccdByLevel, updateYccdForLevel } from '../utils/specTableHelper';
import { suggestKhtnCode, formatYccdWithCode, KHTN_COMPETENCY_GROUPS, KHTN_CODE_MAP, getRowKhtnCode } from '../data/khtnCompetencyData';

export default function Step3_Specification() {
  const {
    matrix, config, examConfig, examHeader, khtnConfig, tuLuanConfig,
    updateTopicText, updateDvYccd, clearDvYccd, clearTopicYccd, clearBatchYccd, clearAllYccd,
    importYccdFromAIText, updateConfig, updateLevelIndicatorCode
  } = useExamStore();
  const [yccdModal, setYccdModal] = useState({ show: false, topicId: null, text: '' });
  const [clearModal, setClearModal] = useState({ show: false, selectedDvs: new Set() });

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

  // NHIỆM VỤ 2: Kiểm tra môn (đồng bộ regex với Step2_MatrixBuilder)
  const isHoaMon = /hóa|hoá/i.test(examHeader?.monHoc || '');
  const isToanMon = /toán|toan/i.test(examHeader?.monHoc || '');
  const isSinhMon = /sinh/i.test(examHeader?.monHoc || '');
  const isKHTNMon = Boolean(
    examConfig.subject === 'khtn' || 
    examConfig.isCauTruc4213 || 
    examConfig.isCauTrucKHTNVao10 ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(examHeader?.monHoc || '') ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(examConfig?.monHoc || '')
  );

  const isCauTrucKHTNVao10 = Boolean(
    examConfig?.isCauTrucKHTNVao10 ||
    (!config.hasTuLuan && isKHTNMon && (examConfig?.tongDiemP1 === 5.5 || examConfig?.tongDiemP2 === 3.0)) ||
    (examHeader?.kyThi && /vào\s*10|tuyển\s*sinh/i.test(examHeader.kyThi) && isKHTNMon && !config.hasTuLuan)
  );

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
  // NHIỆM VỤ 4: Tự động phát hiện mã năng lực Sinh học từ nội dung YCCĐ
  // Dựa trên khung năng lực Sinh học GDPT 2018:
  // =======================================================================
  const getBiologyIndicatorForLevel = (text, level) => {
    if (!text || !isSinhMon || config.showCompetencyCode === false) return null;
    if (level === 'biet') return 'NT1';
    if (level === 'hieu') return 'TH1';
    if (level === 'vanDung' || level === 'vanDungCao') return 'VD2';
    return null;
  };

  // Ham lay ma nang luc KHTN chuẩn theo CTGDPT 2018 (NT1-NT7, TH1-TH6, VD1-VD2)
  const getKhtnIndicatorForLevel = (text, level) => {
    if (!text || !isKHTNMon || config.showCompetencyCode === false) return null;
    if (level === 'biet') return 'NT1';
    if (level === 'hieu') return 'NT3';
    if (level === 'vanDung') return 'VD1';
    if (level === 'vanDungCao') return 'VD2';
    return null;
  };

  // =======================================================================
  // NHIỆM VỤ KHTN: Render badge mã năng lực KHTN (NT/TH/VD) với màu sắc
  // =======================================================================
  const renderKhtnCodeBadge = (code) => {
    if (!code) return null;
    const entry = KHTN_CODE_MAP[code];
    if (!entry) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{code}</span>;
    let bg = 'bg-blue-100 text-blue-800';
    if (entry.groupKey === 'TH') bg = 'bg-green-100 text-green-800';
    if (entry.groupKey === 'VD') bg = 'bg-orange-100 text-orange-800';
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${bg}`} title={entry.fullText}>
        {code}
      </span>
    );
  };

  // Parse và highlight mã năng lực KHTN trong chuỗi text
  const renderYccdWithKhtnHighlight = (text) => {
    if (!text || !isKHTNMon || config.showCompetencyCode === false) return text;
    const CODE_REGEX = /(NT[1-7]|TH[1-6]|VD[12])/g;
    if (!CODE_REGEX.test(text)) return text;
    // Tách text thành các phần, highlight mã
    const parts = text.split(/(NT[1-7]|TH[1-6]|VD[12])/g);
    return parts.map((part, i) => {
      if (/^(NT[1-7]|TH[1-6]|VD[12])$/.test(part)) {
        let bg = 'bg-blue-100 text-blue-800';
        if (part.startsWith('TH')) bg = 'bg-green-100 text-green-800';
        if (part.startsWith('VD')) bg = 'bg-orange-100 text-orange-800';
        return <span key={i} className={`inline-flex items-center px-1 rounded text-[10px] font-bold mx-0.5 ${bg}`}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };


  const sumAll = (type, level) => matrix.reduce((sum, topic) => sum + getTopicSum(topic, type, level), 0);

  const fmtTuLuanCau = (level) => {
    const cau = getTuLuanCauCount(matrix, level, tuLuanConfig);
    if (cau === 0) return '';
    return cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
  };

  const getIndicatorsForCell = (dv, type, level) => {
    if (!dv || !dv.indicatorMap) return null;
    let count = type === 'dungSai' && level === 'vanDung' 
        ? ((Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0))
        : (Number(dv[type]?.[level]) || 0);
    
    if (count === 0) return null;
    
    const inds = [];
    for (let i = 0; i < count; i++) {
        const ind = dv.indicatorMap[`${type}_${level}_${i}`];
        if (ind) {
          const code = typeof ind === 'object' ? (ind.code || '') : ind;
          if (code) inds.push(code);
        }
    }
    const unique = [...new Set(inds)];
    return unique.length > 0 ? unique.join(', ') : null;
  };

  // Helpers: Format giá trị kèm mã năng lực (NT, TH, VD) hoặc chỉ báo
  const getCellDetailsFor4213 = (dv, type, level) => {
    if (!dv || !dv.indicatorMap) return [];
    let count = type === 'dungSai' && level === 'vanDung' 
        ? ((Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0))
        : (Number(dv[type]?.[level]) || 0);
    
    if (type === 'tuLuan') {
        const subs = (dv.tuLuan?.subItems || []).filter(s => s.level === level);
        if (subs.length > 0) count = subs.length;
    }
    if (count === 0) return [];
    const details = [];
    if (type === 'dungSai' && level === 'vanDung') {
        const vdCount = Number(dv.dungSai?.vanDung) || 0;
        for (let i = 0; i < vdCount; i++) {
           const m = dv.indicatorMap[`dungSai_vanDung_${i}`];
           if (m) details.push(m);
        }
        const vdcCount = Number(dv.dungSai?.vanDungCao) || 0;
        for (let i = 0; i < vdcCount; i++) {
           const m = dv.indicatorMap[`dungSai_vanDungCao_${i}`];
           if (m) details.push(m);
        }
    } else {
        for (let i = 0; i < count; i++) {
            const m = dv.indicatorMap[`${type}_${level}_${i}`];
            if (m) details.push(m);
        }
    }
    return details;
  };

  const normalizeKhtnCode = (code) => {
    if (!code) return '';
    if (code === 'KHTN1.1') return 'NT1';
    if (code === 'KHTN1.2') return 'NT2';
    if (code === 'KHTN1.3') return 'NT3';
    if (code === 'KHTN1.4') return 'NT6';
    if (code === 'KHTN3.1') return 'VD1';
    if (code === 'KHTN2.4' || code === 'KHTN2.2') return 'VD2';
    return code;
  };

  const fmt4213 = (val, level, dv, type, rowActiveCode = null) => {
    if (!val) return '';
    if (config.showCompetencySymbol === false) return <span className="font-bold text-xs">{val}</span>;
    const details = getCellDetailsFor4213(dv, type, level);

    if (isKHTNMon) {
      const code = rowActiveCode || getRowKhtnCode(dv, level);
      const labels = [];
      details.forEach(d => {
        const m = typeof d === 'object' ? d : { code: d, label: '' };
        if (m.label) labels.push(m.label);
      });
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-bold text-[11px]">{val}</span>
          <span className="text-[10px] font-extrabold leading-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
            {code ? String(code).replace(/[\[\]]/g, '') : ''}
          </span>
          {labels.length > 0 && (
            <span className="text-[10px] text-blue-700 font-black leading-[10px]">
              {formatGroupedLabels(labels)}
            </span>
          )}
        </div>
      );
    }

    const grouped = {};
    details.forEach(d => {
      const m = typeof d === 'object' ? d : { code: d, label: '' };
      const c = m.code || (level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD');
      if (!grouped[c]) grouped[c] = [];
      if (m.label) grouped[c].push(m.label);
    });

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-bold text-[11px]">{val}</span>
        {Object.entries(grouped).map(([c, labs], i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold leading-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
              {c ? String(c).replace(/[\[\]]/g, '') : ''}
            </span>
            {labs.length > 0 && (
              <span className="text-[10px] text-blue-700 font-black leading-[10px]">
                {formatGroupedLabels(labs)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const fmtNLC = (val, level, dv, type, rowActiveCode = null) => {
    if (examConfig.isCauTruc4213) return fmt4213(val, level, dv, type, rowActiveCode);
    if (!val) return '';
    if (config.showCompetencySymbol === false) return <span>{val}</span>;
    if (isKHTNMon) {
      const tag = rowActiveCode || getRowKhtnCode(dv, level);
      return <span>{val}<br/><span className="text-[10px] text-blue-700 font-bold">{tag ? String(tag).replace(/[\[\]]/g, '') : ''}</span></span>;
    }
    let tag = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    let mappedInd = getIndicatorsForCell(dv, type, level);
    if (mappedInd) {
      tag = mappedInd;
    } else {
      let indicator = isToanMon ? getMathIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = isSinhMon ? getBiologyIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (indicator) tag = indicator;
    }
    return <span>{val}<br/><span className="text-[10px] text-slate-500">({tag ? String(tag).replace(/[\[\]]/g, '') : ''})</span></span>;
  };
  
  const fmtY = (val, level, dv, type, rowActiveCode = null) => {
    if (examConfig.isCauTruc4213) return fmt4213(val, level, dv, type, rowActiveCode);
    if (!val) return '';
    if (config.showCompetencySymbol === false) return <span>{val} ý</span>;
    if (isKHTNMon) {
      const tag = rowActiveCode || getRowKhtnCode(dv, level);
      return <span>{val} ý<br/><span className="text-[10px] text-blue-700 font-bold">{tag ? String(tag).replace(/[\[\]]/g, '') : ''}</span></span>;
    }
    let tag = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    let mappedInd = getIndicatorsForCell(dv, type, level);
    if (mappedInd) {
      tag = mappedInd;
    } else {
      let indicator = isToanMon ? getMathIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = isSinhMon ? getBiologyIndicatorForLevel(dv?.yeuCauCanDat, level) : null;
      if (!indicator) indicator = getIndicatorForLevel(dv?.yeuCauCanDat, level);
      if (indicator) tag = indicator;
    }
    return <span>{val} ý<br/><span className="text-[10px] text-slate-500">({tag})</span></span>;
  };

  const getTopicTuLuanPoints = (topic) =>
    getTopicTuLuanDiem(topic, 'diemBiet') + getTopicTuLuanDiem(topic, 'diemHieu') + getTopicTuLuanDiem(topic, 'diemVanDung') + getTopicTuLuanDiem(topic, 'diemVanDungCao');

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

    const monHoc = examHeader?.monHoc || (isKHTNMon ? 'Khoa học tự nhiên' : 'Môn học');
    // Ưu tiên: KHTN Vào 10 → mặc định lớp 9; KHTN thường → lấy từ nút chọn lớp; môn khác → bóc số lớp từ tên môn
    const lop = isCauTrucKHTNVao10
      ? (khtnConfig?.lop || '9')
      : isKHTNMon
      ? (khtnConfig?.lop || '8')
      : (examHeader?.lop || examHeader?.monHoc?.match(/\b([6-9]|1[0-2])\b/)?.[0] || '');

    let prompt = '';
    if (isCauTrucKHTNVao10) {
      prompt = `Đóng vai chuyên gia xây dựng ma trận đặc tả đề thi Tuyển sinh vào lớp 10 THPT môn ${monHoc} (chương trình THCS - chủ yếu lớp 9) theo Quyết định 1038/QĐ-SGDĐT của Sở GD&ĐT Hải Phòng (Chương trình GDPT 2018). Hãy viết "Yêu cầu cần đạt" bám sát chuẩn kiến thức, kĩ năng cho Chủ đề: ${topic.tenChuDe || 'Chưa rõ'}.\n\n`;
      prompt += `Dựa vào ma trận đề thi, các Nội dung/Đơn vị kiến thức dưới đây yêu cầu đánh giá ở 3 mức độ (Nhận biết, Thông hiểu, Vận dụng). Bạn CHỈ ĐƯỢC VIẾT Yêu cầu cần đạt tương ứng với các mức độ được giao:\n\n`;
    } else {
      prompt = `Đóng vai chuyên gia xây dựng ma trận đặc tả đề thi môn ${monHoc}${lop ? ` lớp ${lop}` : ''} theo Chương trình GDPT 2018 (Công văn 4956/SGDĐT). Hãy viết "Yêu cầu cần đạt" bám sát chuẩn kiến thức, kĩ năng cho Chủ đề: ${topic.tenChuDe || 'Chưa rõ'}.\n\n`;
      prompt += `Dựa vào ma trận đề thi, các Nội dung/Đơn vị kiến thức dưới đây yêu cầu đánh giá ở các mức độ cụ thể. Bạn CHỈ ĐƯỢC VIẾT Yêu cầu cần đạt tương ứng với các mức độ được giao:\n\n`;
    }

    dvList.forEach((dv, index) => {
      // Tính tổng số lượng câu/ý của từng mức độ cho ĐVKT này
      const sumBiet = (dv.nhieuLuaChon?.biet || 0) + (dv.dungSai?.biet || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.biet || 0) : 0) + (typeof dv.tuLuan?.biet === 'object' ? dv.tuLuan.biet.y : (dv.tuLuan?.biet || 0));
      const sumHieu = (dv.nhieuLuaChon?.hieu || 0) + (dv.dungSai?.hieu || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.hieu || 0) : 0) + (typeof dv.tuLuan?.hieu === 'object' ? dv.tuLuan.hieu.y : (dv.tuLuan?.hieu || 0));
      const sumVD = (dv.nhieuLuaChon?.vanDung || 0) + (dv.dungSai?.vanDung || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.vanDung || 0) : 0) + (typeof dv.tuLuan?.vanDung === 'object' ? dv.tuLuan.vanDung.y : (dv.tuLuan?.vanDung || 0));
      const sumVDC = isCauTrucKHTNVao10 ? 0 : ((Number(dv.dungSai?.vanDungCao) || 0) + (Number(dv.tuLuan?.vanDungCao) || 0));

      let requiredLevels = [];
      if (sumBiet > 0) requiredLevels.push("Nhận biết");
      if (sumHieu > 0) requiredLevels.push("Thông hiểu");
      if (sumVD > 0) requiredLevels.push("Vận dụng");
      if (sumVDC > 0) requiredLevels.push("Vận dụng cao");

      // Nếu bài học này có câu hỏi thì mới yêu cầu AI viết YCCĐ
      if (requiredLevels.length > 0) {
        prompt += `**${index + 1}. ${dv.noiDung || 'Chưa rõ'}**\n`;
        if (isKHTNMon) {
          const reqWithCodes = [];
          if (sumBiet > 0) reqWithCodes.push(`  + Nhận biết [${getRowKhtnCode(dv, 'biet')}]`);
          if (sumHieu > 0) reqWithCodes.push(`  + Thông hiểu [${getRowKhtnCode(dv, 'hieu')}]`);
          if (sumVD > 0) reqWithCodes.push(`  + Vận dụng [${getRowKhtnCode(dv, 'vanDung')}]`);
          if (!isCauTrucKHTNVao10 && sumVDC > 0) reqWithCodes.push(`  + Vận dụng cao [${getRowKhtnCode(dv, 'vanDungCao')}]`);
          prompt += `- Mức độ và mã năng lực cần viết:\n${reqWithCodes.join('\n')}\n\n`;
        } else {
          prompt += `- Mức độ cần viết: [ ${requiredLevels.join(", ")} ]\n\n`;
        }
      }
    });

    if (isKHTNMon) {
      prompt += `📌 CHÚ THÍCH BỘ MÃ NĂNG LỰC KHTN (CĂN CỨ CTGDPT 2018):\n`;
      prompt += `► Nhóm Nhận thức (NT):\n`;
      prompt += `  [NT1] Nhận biết: Nhận biết, kể tên, phát biểu, nêu được đối tượng, khái niệm, quy luật, quá trình tự nhiên\n`;
      prompt += `  [NT2] Thông hiểu: Trình bày, mô tả bằng ngôn ngữ nói, viết, công thức, sơ đồ, biểu đồ\n`;
      prompt += `  [NT3] Thông hiểu: So sánh, phân loại, phân biệt theo các tiêu chí khác nhau\n`;
      prompt += `  [NT4] Thông hiểu: Phân tích đặc điểm sự vật, hiện tượng theo logic nhất định\n`;
      prompt += `  [NT5] Thông hiểu: Tìm từ khoá, kết nối thông tin, lập dàn ý văn bản khoa học\n`;
      prompt += `  [NT6] Vận dụng: Giải thích quan hệ nhân quả, cấu tạo – chức năng\n`;
      prompt += `  [NT7] Vận dụng: Nhận ra điểm sai, chỉnh sửa, đưa nhận định phê phán\n`;
      prompt += `► Nhóm Tìm hiểu tự nhiên (TH):\n`;
      prompt += `  [TH1] Thông hiểu: Đề xuất vấn đề, đặt câu hỏi khoa học\n`;
      prompt += `  [TH2] Thông hiểu: Đưa phán đoán, xây dựng giả thuyết\n`;
      prompt += `  [TH3] Thông hiểu: Lập kế hoạch, thiết kế phương án thí nghiệm\n`;
      prompt += `  [TH4] Vận dụng: Thực hiện thí nghiệm, thu thập và xử lý dữ liệu, rút ra kết luận\n`;
      prompt += `  [TH5] Vận dụng: Viết báo cáo, vẽ hình, thiết kế mô hình hoặc dụng cụ\n`;
      prompt += `  [TH6] Vận dụng: Ra quyết định, đề xuất giải pháp xử lý vấn đề\n`;
      prompt += `► Nhóm Vận dụng kiến thức (VD):\n`;
      prompt += `  [VD1] Vận dụng: Vận dụng giải thích hiện tượng thực tế, giải bài tập định lượng\n`;
      prompt += `  [VD2] Vận dụng cao: Đề xuất giải pháp bảo vệ môi trường, phát triển bền vững, ứng phó biến đổi khí hậu\n\n`;

      prompt += `⚠️ 3 YÊU CẦU BẮT BUỘC (PHẢI TUÂN THỦ TUYỆT ĐỐI):\n`;
      prompt += `1. Trình bày tách biệt YCCĐ cho từng nội dung. Giữ nguyên định dạng in đậm số thứ tự và tên bài (Ví dụ: **1. ${dvList[0]?.noiDung || 'Tên bài'}**).\n`;
      prompt += `2. CỰC KỲ NGẮN GỌN & CHUẨN XÁC: Mỗi mức độ nhận thức CHỈ ĐƯỢC VIẾT ĐÚNG 1 CÂU (1 DÒNG), sử dụng đúng động từ chỉ báo hành vi theo CT GDPT 2018 tương ứng với mã năng lực được giao.\n`;
      if (isCauTrucKHTNVao10) {
        prompt += `3. Định dạng đầu ra BẮT BUỘC KÈM ĐÚNG MÃ CHỈ BÁO NĂNG LỰC KHTN (CHỈ 3 MỨC ĐỘ: NHẬN BIẾT, THÔNG HIỂU, VẬN DỤNG):\n`;
        prompt += `   - Nhận biết [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Nhận biết [NT1]: Nêu được...]\n`;
        prompt += `   - Thông hiểu [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Thông hiểu [NT3]: Phân biệt được... (hoặc [NT2], [TH3] nếu là thí nghiệm)]\n`;
        prompt += `   - Vận dụng [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Vận dụng [VD1]: Vận dụng kiến thức giải thích... (hoặc [TH4], [NT6])]`;
      } else {
        prompt += `3. Định dạng đầu ra BẮT BUỘC KÈM ĐÚNG MÃ CHỈ BÁO NĂNG LỰC KHTN:\n`;
        prompt += `   - Nhận biết [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Nhận biết [NT1]: Nêu được...]\n`;
        prompt += `   - Thông hiểu [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Thông hiểu [NT3]: Phân biệt được... (hoặc [NT2], [TH3] nếu là thí nghiệm)]\n`;
        prompt += `   - Vận dụng [MÃ]: [Ghi đúng 1 câu ngắn gọn, ví dụ: Vận dụng [VD1]: Vận dụng kiến thức giải thích... (hoặc [TH4], [NT6])]\n`;
        prompt += `   - Vận dụng cao [VD2]: [Ghi đúng 1 câu ngắn gọn... Đề xuất giải pháp/biện pháp thực tiễn, bảo vệ môi trường]`;
      }
    } else {
      prompt += `⚠️ 3 YÊU CẦU BẮT BUỘC (PHẢI TUÂN THỦ TUYỆT ĐỐI):\n`;
      prompt += `1. Trình bày tách biệt YCCĐ cho từng nội dung. Giữ nguyên định dạng in đậm số thứ tự và tên bài (Ví dụ: **1. ${dvList[0]?.noiDung || 'Tên bài'}**).\n`;
      prompt += `2. CỰC KỲ NGẮN GỌN & CHUẨN XÁC: Mỗi mức độ nhận thức CHỈ ĐƯỢC VIẾT ĐÚNG 1 CÂU (1 DÒNG), sử dụng đúng động từ chỉ báo hành vi theo CT GDPT 2018 (Nêu được, Trình bày được, Phân loại/Giải thích được, Vận dụng được, Đề xuất giải pháp...).\n`;
      prompt += `3. Định dạng đầu ra mong muốn:\n   - Nhận biết: [Ghi 1 câu ngắn gọn...]\n   - Thông hiểu: [Ghi 1 câu ngắn gọn...]\n   - Vận dụng: [Ghi 1 câu ngắn gọn...]\n   - Vận dụng cao: [Ghi 1 câu ngắn gọn...]`;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      alert("✅ ĐÃ COPY LỆNH TẠO YÊU CẦU CẦN ĐẠT THÀNH CÔNG!\n\nBƯỚC TIẾP THEO:\n1. Mở trang ChatGPT hoặc Gemini.\n2. Dán (Ctrl+V) lệnh vừa copy vào ô chat.\n3. Bấm nút ĐÍNH KÈM (Hình ghim kẹp giấy) và tải file Sách giáo khoa (PDF/Word) lên.\n4. Gửi cho AI, sau đó copy kết quả dán ngược lại vào phần mềm nhé!");
    } catch (err) {
      alert("Lỗi khi copy. Trình duyệt của bạn có thể không hỗ trợ tính năng này.");
    }
  };

  // =======================================================================
  // BUILD ROWS: Topic → ĐVKT → Mức độ nhận thức (chuẩn CV 4956 / 3280)
  // Mỗi mức độ nhận thức của 1 ĐVKT được chia thành 1 dòng riêng biệt
  // =======================================================================
  const buildBodyRows = () => {
    const rows = [];
    matrix.forEach((topic, topicIdx) => {
      const dvList = topic.donViKienThuc || [];
      // Tổng số dòng của toàn bộ chủ đề
      const topicTotalRows = dvList.reduce((sum, dv) => {
        const active = getActiveLevelsForDv(dv, isKHTNMon, config.hasTraLoiNgan, config.hasTuLuan);
        return sum + active.length;
      }, 0) || 1;

      let isFirstTopicRow = true;

      dvList.forEach((dv, dvIdx) => {
        const activeLevels = getActiveLevelsForDv(dv, isKHTNMon, config.hasTraLoiNgan, config.hasTuLuan);
        const dvTotalRows = activeLevels.length;
        const parsedYccd = parseYccdByLevel(dv.yeuCauCanDat || '');

        activeLevels.forEach((lvl, lvlIdx) => {
          const isFirstDvRow = lvlIdx === 0;
          const levelYccd = parsedYccd[lvl] || '';
          const rowActiveCode = isKHTNMon ? getRowKhtnCode(dv, lvl, levelYccd) : null;

          // Lọc chi tiết indicatorMap cho mức độ này
          const levelDetails = [];
          if (examConfig.isCauTruc4213 && dv.indicatorMap) {
            Object.entries(dv.indicatorMap).forEach(([k, val]) => {
              if (!val) return;
              const parts = k.split('_');
              const indLvl = parts[1];
              if (indLvl === lvl || (!isKHTNMon && lvl === 'vanDung' && indLvl === 'vanDungCao')) {
                levelDetails.push(val);
              }
            });
          }

          rows.push(
            <tr key={`${topic.id}_${dv.id}_${lvl}`} className="hover:bg-slate-50 transition-colors">
              {/* CỘT TT — rowSpan cho toàn bộ chủ đề */}
              {isFirstTopicRow && (
                <td rowSpan={topicTotalRows} className="border border-slate-300 p-2 text-center font-medium text-slate-600 align-top">
                  {topicIdx + 1}
                </td>
              )}

              {/* CỘT CHỦ ĐỀ — rowSpan cho toàn bộ chủ đề */}
              {isFirstTopicRow && (
                <td rowSpan={topicTotalRows} className="border border-slate-300 p-2 text-slate-700 font-medium align-top relative group">
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
                      {isKHTNMon && (
                        <button
                          type="button"
                          onClick={() => {
                            (topic.donViKienThuc || []).forEach(d => {
                              if (!d.yeuCauCanDat || !d.yeuCauCanDat.trim()) return;
                              const activeLevels = getActiveLevelsForDv(d, isKHTNMon, config.hasTraLoiNgan, config.hasTuLuan);
                              let updated = d.yeuCauCanDat;
                              activeLevels.forEach(l => {
                                const parsed = parseYccdByLevel(updated);
                                const lvlText = parsed[l] || '';
                                if (lvlText && !(/\[(NT[1-7]|TH[1-6]|VD[12])\]/i.test(lvlText))) {
                                  const code = getRowKhtnCode(d, l, lvlText);
                                  const formatted = formatYccdWithCode(lvlText, code, formatLevelDisplayName(l));
                                  updated = updateYccdForLevel(updated, l, formatted, activeLevels);
                                }
                              });
                              updateDvYccd(topic.id, d.id, updated);
                            });
                          }}
                          className="mt-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded font-bold shadow-sm hover:shadow transition-all w-full flex items-center justify-center gap-1.5"
                          title="Tự động thêm [NT1], [NT3], [VD1], [VD2] vào văn bản YCCĐ của tất cả các bài trong chủ đề này khớp với ô câu hỏi"
                        >
                          ⚡ Gán mã [NL] vào YCCĐ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const hasYccd = (topic.donViKienThuc || []).some(d => d.yeuCauCanDat && d.yeuCauCanDat.trim());
                          if (!hasYccd) {
                            alert("Chủ đề này chưa có YCCĐ nào để xóa!");
                            return;
                          }
                          if (window.confirm(`Xóa toàn bộ YCCĐ của Chủ đề "${topic.tenChuDe || 'này'}"?`)) {
                            clearTopicYccd(topic.id);
                          }
                        }}
                        className="mt-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 px-2 py-1 rounded font-bold shadow-sm hover:shadow transition-all w-full flex items-center justify-center gap-1.5"
                        title="Xóa YCCĐ của tất cả các bài trong chủ đề này"
                      >
                        <Trash2 size={12} /> Xóa YCCĐ chủ đề
                      </button>
                    </div>
                  </div>
                </td>
              )}

              {/* CỘT ĐVKT — rowSpan cho số mức độ của bài này */}
              {isFirstDvRow && (
                <td rowSpan={dvTotalRows} className="border border-slate-300 p-2 text-slate-700 align-top text-sm font-semibold group">
                  <div className="flex flex-col justify-between h-full min-h-[60px] gap-1">
                    <span>{dv.noiDung ? `- ${dv.noiDung}` : <span className="text-gray-400 italic">...</span>}</span>
                    {dv.yeuCauCanDat && dv.yeuCauCanDat.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa toàn bộ YCCĐ của bài "${dv.noiDung || 'này'}"?`)) {
                            clearDvYccd(topic.id, dv.id);
                          }
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-600 hover:bg-red-50 px-1 py-0.5 rounded transition-colors self-start flex items-center gap-1 border border-transparent hover:border-red-200"
                        title="Xóa toàn bộ YCCĐ của bài này"
                      >
                        <Trash2 size={10} /> Xóa YCCĐ bài
                      </button>
                    )}
                  </div>
                </td>
              )}

              {/* CỘT YCCĐ — Mỗi dòng mức độ 1 ô riêng */}
              <td className="border border-slate-300 p-2 align-top bg-yellow-50/20 relative group/yccd">
                <div className="flex flex-col h-full gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                        * {formatLevelDisplayName(lvl)}
                      </span>
                      {isKHTNMon && rowActiveCode && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-300 shadow-sm leading-none">
                          [{rowActiveCode}]
                        </span>
                      )}
                      <span className="text-xs font-bold text-teal-800">:</span>
                    </div>
                    {levelYccd && levelYccd.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedText = updateYccdForLevel(dv.yeuCauCanDat || '', lvl, '', activeLevels);
                          updateDvYccd(topic.id, dv.id, updatedText);
                        }}
                        title={`Xóa YCCĐ mức ${formatLevelDisplayName(lvl)}`}
                        className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-0.5 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <textarea
                    className="w-full flex-1 min-h-[60px] bg-transparent outline-none resize-y p-1 border border-transparent focus:border-yellow-300 rounded focus:bg-white transition-colors text-sm leading-relaxed text-slate-700"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                    placeholder={`- YCCĐ mức ${formatLevelDisplayName(lvl)}...`}
                    value={formatYccdText(levelYccd)}
                    onChange={(e) => {
                      const updatedText = updateYccdForLevel(dv.yeuCauCanDat || '', lvl, e.target.value, activeLevels);
                      updateDvYccd(topic.id, dv.id, updatedText);
                    }}
                  />
                  {/* KHTN: Dropdown chọn mã năng lực + nút Format YCCĐ */}
                  {isKHTNMon && config.showCompetencyCode !== false && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <select
                        className="text-[10px] border border-blue-200 rounded px-1 py-0.5 bg-blue-50 text-blue-800 font-bold cursor-pointer focus:outline-none focus:border-blue-400"
                        defaultValue=""
                        title="Chọn mã chỉ báo năng lực KHTN để format YCCĐ"
                        onChange={(e) => {
                          const selectedCode = e.target.value;
                          if (!selectedCode) return;
                          const currentText = levelYccd || '';
                          const formatted = formatYccdWithCode(currentText, selectedCode, formatLevelDisplayName(lvl));
                          const updatedText = updateYccdForLevel(dv.yeuCauCanDat || '', lvl, formatted, activeLevels);
                          updateDvYccd(topic.id, dv.id, updatedText);
                          updateLevelIndicatorCode(topic.id, dv.id, lvl, selectedCode);
                          e.target.value = '';
                        }}
                      >
                        <option value="">+ Đổi mã [{rowActiveCode || '...'}]</option>
                        {KHTN_COMPETENCY_GROUPS.map(group => (
                          <optgroup key={group.groupKey} label={group.groupShort}>
                            {group.codes.map(c => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {/* Hiển thị badge mã hiện tại */}
                      {rowActiveCode && (
                        <span className="flex items-center gap-0.5">
                          {renderKhtnCodeBadge(rowActiveCode)}
                        </span>
                      )}
                    </div>
                  )}
                  {examConfig.isCauTruc4213 && levelDetails.length > 0 && config.showCompetencySymbol !== false && config.showCompetencyCode !== false && (
                    <div className="text-[11px] font-bold text-slate-600 border-t border-yellow-200 pt-1 mt-auto">
                      {(() => {
                        const grouped = {};
                        levelDetails.forEach(d => {
                          const m = typeof d === 'object' ? d : { code: d, label: '' };
                          const code = isKHTNMon ? (rowActiveCode || normalizeKhtnCode(m.code)) : (m.code || (lvl === 'biet' ? 'NT' : lvl === 'hieu' ? 'TH' : 'VD'));
                          if (!grouped[code]) grouped[code] = [];
                          if (m.label) grouped[code].push(m.label);
                        });
                        return Object.entries(grouped).map(([code, labels], i) => (
                          <div key={i}>{labels.length} - {isKHTNMon ? `[${code}]` : code} - {formatGroupedLabels(labels)}</div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </td>


              {/* CÁC CỘT SỐ CÂU — CHỈ HIỂN THỊ Ở CỘT CỦA LEVEL ĐANG XÉT */}
              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'biet' ? fmtNLC(dv.nhieuLuaChon?.biet, 'biet', dv, 'nhieuLuaChon', rowActiveCode) : ''}
              </td>
              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'hieu' ? fmtNLC(dv.nhieuLuaChon?.hieu, 'hieu', dv, 'nhieuLuaChon', rowActiveCode) : ''}
              </td>
              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'vanDung' ? fmtNLC(dv.nhieuLuaChon?.vanDung, 'vanDung', dv, 'nhieuLuaChon', rowActiveCode) : ''}
              </td>

              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'biet' ? fmtY(dv.dungSai?.biet, 'biet', dv, 'dungSai', rowActiveCode) : ''}
              </td>
              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'hieu' ? fmtY(dv.dungSai?.hieu, 'hieu', dv, 'dungSai', rowActiveCode) : ''}
              </td>
              <td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">
                {lvl === 'vanDung' ? fmtY((dv.dungSai?.vanDung || 0) + (dv.dungSai?.vanDungCao || 0), 'vanDung', dv, 'dungSai', rowActiveCode) : ''}
              </td>

              <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>
                {config.hasTraLoiNgan && lvl === 'biet' ? fmtY(dv.traLoiNgan?.biet, 'biet', dv, 'traLoiNgan', rowActiveCode) : ''}
              </td>
              <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>
                {config.hasTraLoiNgan && lvl === 'hieu' ? fmtY(dv.traLoiNgan?.hieu, 'hieu', dv, 'traLoiNgan', rowActiveCode) : ''}
              </td>
              <td className={`border border-slate-300 p-1 text-center font-medium text-[11px] leading-tight ${config.hasTraLoiNgan ? 'text-blue-700' : 'bg-slate-100 text-transparent'}`}>
                {config.hasTraLoiNgan && lvl === 'vanDung' ? fmtY(dv.traLoiNgan?.vanDung, 'vanDung', dv, 'traLoiNgan', rowActiveCode) : ''}
              </td>

              {config.hasTuLuan && (
                <>
                  <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">
                    {lvl === 'biet' ? fmtY(dv.tuLuan?.biet, 'biet', dv, 'tuLuan', rowActiveCode) : ''}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">
                    {lvl === 'hieu' ? fmtY(dv.tuLuan?.hieu, 'hieu', dv, 'tuLuan', rowActiveCode) : ''}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-medium text-green-700 text-[11px] leading-tight">
                    {lvl === 'vanDung' ? fmtY(dv.tuLuan?.vanDung, 'vanDung', dv, 'tuLuan', rowActiveCode) : ''}
                  </td>
                  {isKHTNMon && (
                    <td className="border border-slate-300 p-1 text-center font-medium text-red-700 text-[11px] leading-tight">
                      {lvl === 'vanDungCao' ? fmtY(dv.tuLuan?.vanDungCao, 'vanDungCao', dv, 'tuLuan', rowActiveCode) : ''}
                    </td>
                  )}
                </>
              )}
            </tr>
          );

          isFirstTopicRow = false;
        });
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
        const labelsMap = {};

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

              const gridLvl = (tl === 'vanDung' || tl === 'vanDungCao') ? 'vd' : tl;
              const gridKey = `${typeKey === 'tl' ? 'tl' : (typeKey === 'ds' ? 'ds' : 'nlc')}_${gridLvl}`;

              for (let i = 0; i < count; i++) {
                const m = dv.indicatorMap?.[`${type}_${tl}_${i}`];
                if (m) {
                  let lab = '';
                  if (m.label) {
                    lab = m.label.replace('C', '');
                    if (!summary[typeKey].labels.includes(lab)) summary[typeKey].labels.push(lab);
                  } else {
                    lab = `?_${typeKey}`;
                  }
                  
                  if (!labelsMap[lab]) labelsMap[lab] = { gridKey, codes: [] };
                  if (m.code && !labelsMap[lab].codes.includes(m.code)) {
                    labelsMap[lab].codes.push(m.code);
                  }
                }
              }
            }
          });
        });

        const totalQuestions = summary.nlc.labels.length + summary.ds.labels.length + summary.tl.labels.length;
        const allLabels = [...new Set([...summary.nlc.labels, ...summary.ds.labels, ...summary.tl.labels])].sort((a,b) => parseInt(a)-parseInt(b) || a.localeCompare(b));

        const renderGridCell = (key) => {
            return (
              <div className="flex flex-col">
                {allLabels.map((lab, i) => {
                   const info = labelsMap[lab];
                   const text = (info && info.gridKey === key) ? info.codes.join(', ') : '\u00A0';
                   return <div key={i} className="min-h-[1.25rem]">{text}</div>;
                })}
              </div>
            );
        };

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
                {allLabels.map((lab, i) => <div key={i} className="min-h-[1.25rem]">{lab}</div>)}
              </div>
            </td>
            {/* Grid mã năng lực */}
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{renderGridCell('nlc_biet')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{renderGridCell('nlc_hieu')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-blue-800 text-[10px]">{renderGridCell('nlc_vd')}</td>
            
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{renderGridCell('ds_biet')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{renderGridCell('ds_hieu')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 text-[10px]">{renderGridCell('ds_vd')}</td>
            
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{renderGridCell('tl_biet')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{renderGridCell('tl_hieu')}</td>
            <td className="border border-slate-300 p-1 text-center font-bold text-red-800 text-[10px]">{renderGridCell('tl_vd')}</td>
          </tr>
        );
      });
    });
    return rows;
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
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

        {/* Toolbar các thao tác trên Bảng Đặc Tả */}
        <div className="flex items-center gap-2">
          {/* Nút Xóa 1 hoặc nhiều YCCĐ */}
          <button
            type="button"
            onClick={() => {
              const allIds = new Set();
              matrix.forEach(t => {
                (t.donViKienThuc || []).forEach(d => {
                  if (d.yeuCauCanDat && d.yeuCauCanDat.trim()) allIds.add(d.id);
                });
              });
              setClearModal({ show: true, selectedDvs: allIds });
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 shadow-sm"
            title="Chọn 1 hoặc nhiều bài để xóa Yêu cầu cần đạt"
          >
            <Trash2 size={13} />
            <span>Xóa YCCĐ...</span>
          </button>

          {/* Nút bật/tắt: Đầy đủ mã & kí hiệu vs Rút gọn chỉ hiện số câu */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => updateConfig('showCompetencySymbol', true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                config.showCompetencySymbol !== false
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Hiển thị đầy đủ mã năng lực (KHTN1.1...) và số thứ tự câu hỏi (I.1, II.1a...)"
            >
              <span>🏷️</span> Đầy đủ mã & ký hiệu
            </button>
            <button
              type="button"
              onClick={() => updateConfig('showCompetencySymbol', false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                config.showCompetencySymbol === false
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Chỉ hiển thị số lượng câu thuần túy (1, 2, 4...) gọn gàng"
            >
              <span>🔢</span> Rút gọn (chỉ hiện số câu)
            </button>
          </div>
        </div>
      </div>

      {/* [KHTN THCS] BANG PHAN BO MA TRAN MUC DO TU DUY CHUAN CV 4956/SGDDT */}
      {isKHTNMon && (
        <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-extrabold text-teal-900 text-sm flex items-center gap-2">
              <span className="text-base">📋</span> BẢNG PHÂN BỐ MA TRẬN MỨC ĐỘ TƯ DUY — CHUẨN CÔNG VĂN 4956/SGDĐT
            </h3>
            <span className="text-xs bg-teal-600 text-white font-black px-2.5 py-1 rounded-lg shadow-sm">
              Cấu trúc KHTN: 4 - 2 - 1 - 3
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-teal-200 bg-white rounded-lg shadow-sm text-center">
              <thead className="bg-teal-700 text-white font-bold">
                <tr>
                  <th className="p-2 border border-teal-600 text-left">Phần bài thi</th>
                  <th className="p-2 border border-teal-600">Nhận biết (40%)</th>
                  <th className="p-2 border border-teal-600">Thông hiểu (30%)</th>
                  <th className="p-2 border border-teal-600">Vận dụng (20%)</th>
                  <th className="p-2 border border-teal-600">VD Cao (10%)</th>
                  <th className="p-2 border border-teal-600">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100 text-slate-700 font-medium">
                <tr>
                  <td className="p-1.5 text-left font-bold text-teal-900">Phần I: Trắc nghiệm 4 lựa chọn (16 câu)</td>
                  <td className="p-1.5 bg-blue-50/70 font-bold text-blue-700">12 câu (3.0đ)</td>
                  <td className="p-1.5 bg-emerald-50/70 font-bold text-emerald-700">4 câu (1.0đ)</td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 font-bold">16 câu (4.0đ)</td>
                </tr>
                <tr>
                  <td className="p-1.5 text-left font-bold text-teal-900">Phần II: Đúng/Sai (2 câu × 4 lệnh)</td>
                  <td className="p-1.5 bg-blue-50/40 font-bold text-blue-800" colSpan="3">
                    2 câu (mỗi câu: 02 Biết; 01 Hiểu; 01 Vận dụng) → Tổng: 4 Biết (1.0đ) + 2 Hiểu (0.5đ) + 2 VD (0.5đ)
                  </td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 font-bold">2 câu (2.0đ)</td>
                </tr>
                <tr>
                  <td className="p-1.5 text-left font-bold text-teal-900">Phần III: Trả lời ngắn (4 câu)</td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 bg-emerald-50/70 font-bold text-emerald-700">2 câu (0.5đ)</td>
                  <td className="p-1.5 bg-orange-50/70 font-bold text-orange-700">2 câu (0.5đ)</td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 font-bold">4 câu (1.0đ)</td>
                </tr>
                <tr>
                  <td className="p-1.5 text-left font-bold text-teal-900">Phần IV: Tự luận (3 câu)</td>
                  <td className="p-1.5 text-slate-400">0 câu</td>
                  <td className="p-1.5 bg-emerald-50/70 font-bold text-emerald-700">1 câu (1.0đ)</td>
                  <td className="p-1.5 bg-orange-50/70 font-bold text-orange-700">1 câu (1.0đ)</td>
                  <td className="p-1.5 bg-red-50/70 font-bold text-red-700">1 câu (1.0đ)</td>
                  <td className="p-1.5 font-bold">3 câu (3.0đ)</td>
                </tr>
              </tbody>
              <tfoot className="bg-teal-100 font-black text-teal-950">
                <tr>
                  <td className="p-2 text-left uppercase">TỔNG CỘNG</td>
                  <td className="p-2 text-blue-800">4.0 điểm (40%)</td>
                  <td className="p-2 text-emerald-800">3.0 điểm (30%)</td>
                  <td className="p-2 text-orange-800">2.0 điểm (20%)</td>
                  <td className="p-2 text-red-800">1.0 điểm (10%)</td>
                  <td className="p-2 text-teal-900 text-sm">10.0 điểm (100%)</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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
                <th colSpan={config.hasTuLuan ? (isKHTNMon ? "13" : "12") : "9"} className="border border-slate-400 p-2">Số câu hỏi ở các mức độ đánh giá</th>
              </tr>
              <tr>
                <th colSpan="9" className="border border-slate-400 p-1 bg-blue-50">TNKQ</th>
                {config.hasTuLuan && <th colSpan={isKHTNMon ? "4" : "3"} rowSpan="2" className="border border-slate-400 p-1 bg-green-50">Tự luận</th>}
              </tr>
              <tr>
                <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Nhiều lựa chọn</th>
                <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Đúng - Sai (Ý)</th>
                <th colSpan="3" className={`border border-slate-400 p-1 ${config.hasTraLoiNgan ? 'bg-blue-50/80' : 'bg-slate-200 text-slate-400'}`}>Trả lời ngắn (Ý)</th>
              </tr>
              <tr>
                <th className="border border-slate-400 p-1 font-medium bg-blue-50/30">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">VD</th>
                <th className="border border-slate-400 p-1 font-medium bg-blue-50/30">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30">VD</th>
                <th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>B</th><th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>H</th><th className={`border border-slate-400 p-1 font-medium ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>VD</th>
                {config.hasTuLuan && (
                  <>
                    <th className="border border-slate-400 p-1 font-medium bg-green-50/30">B</th>
                    <th className="border border-slate-400 p-1 font-medium bg-green-50/30">H</th>
                    <th className="border border-slate-400 p-1 font-medium bg-green-50/30">VD</th>
                    {isKHTNMon && <th className="border border-slate-400 p-1 font-medium bg-red-50 text-red-700">VDC</th>}
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
                  {isKHTNMon && <td className="border border-slate-400 p-2 text-red-800">{sumAll('tuLuan', 'vanDungCao')}</td>}
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
                  <td className="border border-slate-400 p-2 text-green-800 font-bold text-center">{fmtTuLuanCau('biet')}</td>
                  <td className="border border-slate-400 p-2 text-green-800 font-bold text-center">{fmtTuLuanCau('hieu')}</td>
                  <td className="border border-slate-400 p-2 text-green-800 font-bold text-center">{fmtTuLuanCau('vanDung')}</td>
                  {isKHTNMon && <td className="border border-slate-400 p-2 text-red-800 font-bold text-center">{fmtTuLuanCau('vanDungCao')}</td>}
                </>
              )}
            </tr>

            <tr className="bg-slate-300">
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng điểm</td>
              <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('nhieuLuaChon')}</td>
              <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>
              <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-200' : ''}`}>{getColumnTotalPoints('traLoiNgan')}</td>
              {config.hasTuLuan && <td colSpan={isKHTNMon ? "4" : "3"} className="border border-slate-400 p-2 text-red-600">{getColumnTotalPoints('tuLuan')}</td>}
            </tr>

            <tr className="bg-slate-200">
              <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tỉ lệ %</td>
              <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
              <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
              <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-100' : ''}`}>{config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + '%' : '0%'}</td>
              {config.hasTuLuan && <td colSpan={isKHTNMon ? "4" : "3"} className="border border-slate-400 p-2 text-red-600">{((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '')}%</td>}
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
        ) : isKHTNMon ? (
          <div className="flex flex-col gap-4">
            {/* Hướng dẫn kí hiệu câu hỏi */}
            <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
              <h4 className="font-bold text-teal-900 text-sm mb-2 flex items-center gap-2">
                🏷️ Quy ước kí hiệu trong bảng đặc tả (Công văn 4956):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
                  <span className="font-bold text-teal-800">I.1, I.2, ...:</span>
                  <span className="text-slate-600 ml-1">Câu trắc nghiệm nhiều lựa chọn (Phần A - I)</span>
                </div>
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
                  <span className="font-bold text-teal-800">II.1a, II.1b, ...:</span>
                  <span className="text-slate-600 ml-1">Ý a, b, c, d câu Đúng/Sai (Phần A - II)</span>
                </div>
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
                  <span className="font-bold text-teal-800">III.1, III.2, ...:</span>
                  <span className="text-slate-600 ml-1">Câu trả lời ngắn (Phần A - III)</span>
                </div>
                <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                  <span className="font-bold text-green-800">TL.1, TL.2, TL.3:</span>
                  <span className="text-slate-600 ml-1">Câu hỏi tự luận (Phần B - Tự luận)</span>
                </div>
              </div>
              <p className="text-[11px] text-teal-700 mt-2 italic">
                * Trong cột YCCĐ: <strong>5 - KHTN1.1 - I.1, 2, 3, 4, II.1a</strong> biểu thị: có <strong>5</strong> câu/ý kiểm tra chỉ số năng lực <strong>KHTN1.1</strong> gồm các câu <strong>I.1, I.2, I.3, I.4</strong> và ý <strong>II.1a</strong>.
              </p>
            </div>

            {/* Bảng mã năng lực KHTN */}
            {(() => {
              const lopKhtn = Number(khtnConfig?.lop || examHeader?.lop || 6);
              const khtnGroups = khtnCompetencyGroupsByLop[lopKhtn] || khtnCompetencyGroups;
              if (!khtnGroups) return null;
              return (
                <table className="w-full border-collapse border border-slate-300 text-sm">
                  <thead>
                    <tr className="bg-teal-100/70">
                      <th className="border border-slate-300 px-3 py-2 text-left w-28 text-teal-900">Mã chỉ số</th>
                      <th className="border border-slate-300 px-3 py-2 text-left text-teal-900">Nội dung chỉ số năng lực KHTN (Lớp {lopKhtn})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(khtnGroups).map(([groupKey, group]) => (
                      <React.Fragment key={groupKey}>
                        <tr className={`${groupKey === 'KHTN1' ? 'bg-blue-50/80' : groupKey === 'KHTN2' ? 'bg-emerald-50/80' : 'bg-amber-50/80'}`}>
                          <td colSpan="2" className={`border border-slate-300 px-3 py-2 font-bold ${groupKey === 'KHTN1' ? 'text-blue-800' : groupKey === 'KHTN2' ? 'text-emerald-800' : 'text-amber-800'}`}>
                            {groupKey === 'KHTN1' ? 'I.' : groupKey === 'KHTN2' ? 'II.' : 'III.'} {group.name} (Mã {groupKey})
                          </td>
                        </tr>
                        {(group.indicators || []).map((ind, idx) => (
                          <tr key={ind.code} className={`${idx % 2 === 0 ? 'bg-slate-50/50' : ''} hover:bg-white/60 transition-colors`}>
                            <td className="border border-slate-300 px-3 py-2 font-bold text-center" style={{ color: groupKey === 'KHTN1' ? '#1d4ed8' : groupKey === 'KHTN2' ? '#047857' : '#b45309' }}>{ind.code}</td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">{ind.content}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
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

      {/* Modal Quản lý & Xóa YCCĐ (1 hoặc nhiều bài) */}
      {clearModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh] border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center gap-2">
                <Trash2 size={20} />
                <h2 className="text-lg font-extrabold tracking-tight">
                  Xóa Yêu cầu cần đạt (1 hoặc nhiều bài)
                </h2>
              </div>
              <button
                onClick={() => setClearModal({ show: false, selectedDvs: new Set() })}
                className="p-1 hover:bg-white/20 rounded-full transition-colors text-white font-bold"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Thanh thao tác chọn nhanh */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium">
                💡 Chọn các bài cần xóa YCCĐ (Ma trận câu hỏi và điểm số vẫn được giữ nguyên).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set();
                    matrix.forEach(t => {
                      (t.donViKienThuc || []).forEach(d => {
                        if (d.yeuCauCanDat && d.yeuCauCanDat.trim()) allIds.add(d.id);
                      });
                    });
                    setClearModal(prev => ({ ...prev, selectedDvs: allIds }));
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                >
                  Chọn tất cả ({(() => {
                    let count = 0;
                    matrix.forEach(t => (t.donViKienThuc || []).forEach(d => { if (d.yeuCauCanDat && d.yeuCauCanDat.trim()) count++; }));
                    return count;
                  })()} bài có YCCĐ)
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setClearModal(prev => ({ ...prev, selectedDvs: new Set() }))}
                  className="text-slate-500 hover:text-slate-700 font-bold hover:underline"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Danh sách chủ đề và bài học */}
            <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              {matrix.map((topic, tIdx) => {
                const dvs = topic.donViKienThuc || [];
                const topicDvIds = dvs.map(d => d.id);
                const allTopicSelected = dvs.length > 0 && topicDvIds.every(id => clearModal.selectedDvs.has(id));
                const someTopicSelected = topicDvIds.some(id => clearModal.selectedDvs.has(id));

                return (
                  <div key={topic.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Header chủ đề kèm checkbox chọn cả chủ đề */}
                    <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <label className="flex items-center gap-2.5 font-bold text-slate-800 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allTopicSelected}
                          ref={el => { if (el) el.indeterminate = someTopicSelected && !allTopicSelected; }}
                          onChange={(e) => {
                            const next = new Set(clearModal.selectedDvs);
                            if (e.target.checked) {
                              topicDvIds.forEach(id => next.add(id));
                            } else {
                              topicDvIds.forEach(id => next.delete(id));
                            }
                            setClearModal(prev => ({ ...prev, selectedDvs: next }));
                          }}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span>Chủ đề {tIdx + 1}: {topic.tenChuDe || 'Chưa đặt tên'}</span>
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {dvs.filter(d => d.yeuCauCanDat && d.yeuCauCanDat.trim()).length}/{dvs.length} bài có YCCĐ
                      </span>
                    </div>

                    {/* Danh sách bài trong chủ đề */}
                    <div className="divide-y divide-slate-100">
                      {dvs.map((dv, dIdx) => {
                        const hasYccd = Boolean(dv.yeuCauCanDat && dv.yeuCauCanDat.trim());
                        const isChecked = clearModal.selectedDvs.has(dv.id);

                        return (
                          <label
                            key={dv.id}
                            className={`px-4 py-2.5 flex items-start gap-3 text-xs transition-colors cursor-pointer select-none ${
                              isChecked ? 'bg-red-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(clearModal.selectedDvs);
                                if (e.target.checked) {
                                  next.add(dv.id);
                                } else {
                                  next.delete(dv.id);
                                }
                                setClearModal(prev => ({ ...prev, selectedDvs: next }));
                              }}
                              className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">
                                  {dv.noiDung ? `- ${dv.noiDung}` : `Bài ${dIdx + 1}`}
                                </span>
                                {hasYccd ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                    Có YCCĐ
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded italic">
                                    Trống
                                  </span>
                                )}
                              </div>
                              {hasYccd && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                                  {dv.yeuCauCanDat.replace(/\n+/g, ' • ')}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ Yêu cầu cần đạt của tất cả các bài trong toàn đề thi không?")) {
                    clearAllYccd();
                    setClearModal({ show: false, selectedDvs: new Set() });
                  }
                }}
                className="text-xs text-red-600 hover:text-red-800 hover:underline font-bold flex items-center gap-1"
              >
                <Trash2 size={13} /> Xóa sạch toàn bộ YCCĐ trong đề
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setClearModal({ show: false, selectedDvs: new Set() })}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={clearModal.selectedDvs.size === 0}
                  onClick={() => {
                    const count = clearModal.selectedDvs.size;
                    if (window.confirm(`Bạn có chắc chắn muốn xóa YCCĐ của ${count} bài học đã chọn?`)) {
                      clearBatchYccd(Array.from(clearModal.selectedDvs));
                      setClearModal({ show: false, selectedDvs: new Set() });
                    }
                  }}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    clearModal.selectedDvs.size > 0
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 hover:shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={13} />
                  Xóa YCCĐ ({clearModal.selectedDvs.size} bài đã chọn)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}