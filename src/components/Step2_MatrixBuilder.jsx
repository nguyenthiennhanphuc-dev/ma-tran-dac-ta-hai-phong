import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useExamStore, getTopicSum, getTopicTuLuanDiem, getTuLuanCauCount, getTotalSoTiet } from '../store/useExamStore';
import { Plus, Trash2, Settings2, Sparkles, PlusCircle, X, Bot, FileSpreadsheet, ClipboardList, Wand2, Maximize2, Minimize2, CheckCircle2, ChevronRight, BookOpen, Brain, Lightbulb, Lock, FileText, Upload, Save, PlayCircle, Info, Link, Check, BookTemplate, HelpCircle, Download } from 'lucide-react';

import { formatGroupedLabels } from '../utils/labelUtils';
import DungSaiConfigModal from './DungSaiConfigModal';
import { searchIndicators, chemistryCompetencyGroups } from './data/chemistryIndicators';
import { searchMathIndicators, mathCompetencyGroups } from './data/mathIndicators';
import { biologyCompetencyGroups } from './data/biologyIndicators';
import { physicsCompetencyGroups } from './data/physicsIndicators';
import { geographyCompetencyGroups } from './data/geographyIndicators';
import { searchKhtnIndicators, khtnCompetencyGroupsByLop } from './data/khtnIndicators';
import { suggestKhtnCode, KHTN_COMPETENCY_GROUPS, KHTN_CODE_MAP, detectPhanMon, PHAN_MON_LABELS, getRowKhtnCode, formatYccdWithCode, LEVEL_ALLOWED_KHTN_CODES } from '../data/khtnCompetencyData';
import { parseYccdByLevel, updateYccdForLevel, formatLevelDisplayName } from '../utils/specTableHelper';

// Component Autocomplete dùng chung cho mọi môn
const SubjectAutocomplete = ({ value, onChange, placeholder, isMath, isChemistry, isKHTN, khtnLop }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState(value || '');
  const containerRef = useRef(null);

  useEffect(() => {
    setSearchText(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!searchText) return [];
    if (isMath) return searchMathIndicators(searchText);
    if (isChemistry) return searchIndicators(searchText);
    if (isKHTN) return searchKhtnIndicators(searchText, khtnLop);
    return [];
  }, [searchText, isMath, isChemistry, isKHTN, khtnLop]);

  const handleChange = (e) => {
    setSearchText(e.target.value);
    onChange(e.target.value);
    setShowDropdown(true);
  };

  const handleSelect = (item) => {
    const newVal = searchText ? `${searchText} [${item.code}]` : `[${item.code}]`;
    setSearchText(newVal);
    onChange(newVal);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <textarea
        className="w-full bg-transparent outline-none resize-none p-0.5 text-sm border-b border-slate-200 focus:border-blue-400 transition-colors"
        rows="1"
        placeholder={placeholder}
        value={searchText}
        onChange={handleChange}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto w-[150%] left-0 top-full mt-1 rounded-md text-sm">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <span className="font-bold text-blue-600">[{item.code}]</span> {item.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Giữ lại tên cũ cho backward compatibility
const ChemistryAutocomplete = SubjectAutocomplete;

export default function Step2_MatrixBuilder() {
  const { matrix, config, examConfig, examHeader, addTopic, removeTopic, updateTopicText, updateConfig, updateExamConfig, autoFillMatrix, applyCtToan2018, ct2018LastResult, clearCt2018Result, updateDonViPhase, updateTopicPhase, addDonVi, removeDonVi, updateDonVi, updateDvQuestionCount, updateDvTuLuanPoint, addTuLuanSubItem, removeTuLuanSubItem, updateTuLuanSubItem, smartImportData, importDonVisToTopic, toggleTuLuan, toggleTraLoiNgan, setCauTrucDe, setCauTrucKHTNVao10, loadKhtnVao10SampleMatrix, setCauTruc4213, setCauTrucToan3223, tuLuanConfig, setTuLuanConfig, dungSaiConfig, setDungSaiConfig, updateDvIndicators, updateCellIndicatorCode, updateLevelIndicatorCode, updateDvYccd, khtnConfig, updateKhtnConfig } = useExamStore();
  const isChemistry = /hóa|hoa học|hóa học/i.test(examHeader?.monHoc || '');
  const isMath = /toán|toan|đại số|hình học|giải tích/i.test(examHeader?.monHoc || '');
  const isBiology = /sinh|sinh học/i.test(examHeader?.monHoc || '');
  const isPhysics = /lý|lí|vật lí|vật lý/i.test(examHeader?.monHoc || '');
  const isGeography = /địa|địa lí|địa lý/i.test(examHeader?.monHoc || '');
  const isKHTN = Boolean(
    examConfig.subject === 'khtn' || 
    examConfig.isCauTruc4213 || 
    examConfig.isCauTrucKHTNVao10 ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khoa\s*hoc\s*tu\s*nhien|khtn/i.test(examHeader?.monHoc || '') ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(examConfig?.monHoc || '')
  );

  const isCauTrucToan3223 = Boolean(examConfig?.isCauTrucToan3223);

  const isCauTrucKHTNVao10 = Boolean(
    examConfig?.isCauTrucKHTNVao10 ||
    (!config.hasTuLuan && isKHTN && (examConfig?.tongDiemP1 === 5.5 || examConfig?.tongDiemP2 === 3.0)) ||
    (examHeader?.kyThi && /vào\s*10|tuyển\s*sinh/i.test(examHeader.kyThi) && isKHTN && !config.hasTuLuan)
  );

  // Chuẩn hóa mã KHTN cũ sang chuẩn CTGDPT 2018 (NT1-NT7, TH1-TH6, VD1-VD2)
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

  const [showSmartImport, setShowSmartImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTextFast, setImportTextFast] = useState('');
  const [showTuLuanModal, setShowTuLuanModal] = useState(false);
  const [showDungSaiModal, setShowDungSaiModal] = useState(false);
  const [importTargetTopicId, setImportTargetTopicId] = useState(null);
  const [indicatorModal, setIndicatorModal] = useState({ show: false, topicId: null, dvId: null, selected: [] });
  // [CT TOAN 2018] Dialog chon lop de go i y YCCD
  const [ct2018Dialog, setCt2018Dialog] = useState({ show: false, lop: 8 });
  // khtnSelectedLop được lưu trong store (khtnConfig.lop) để persist qua các bước
  const khtnSelectedLop = isCauTrucKHTNVao10 ? (khtnConfig?.lop || '9') : (khtnConfig?.lop || '8');
  const setKhtnSelectedLop = (lop) => {
    updateKhtnConfig('lop', lop);
    updateKhtnConfig('manualLop', true);
  };

  // Tự động nhận diện lớp cho môn KHTN từ đề bài / tên bài
  useEffect(() => {
    if (!isKHTN) return;
    // Nếu là cấu trúc Vào 10: luôn cố định lớp 9
    if (isCauTrucKHTNVao10) {
      if (khtnConfig?.lop !== '9') {
        updateKhtnConfig('lop', '9');
      }
      return;
    }
    // Nếu người dùng đã tự bấm chọn lớp (manualLop): TUYỆT ĐỐI KHÔNG ghi đè khi Autofill hoặc sửa ma trận
    if (khtnConfig?.manualLop) return;

    const fullText = `${examHeader?.kyThi || ''} ${examHeader?.monHoc || ''} ${(matrix || []).map(t => `${t.tenChuDe} ${(t.donViKienThuc || []).map(d => d.noiDung).join(' ')}`).join(' ')}`.toLowerCase();
    let detected = null;
    // Kiểm tra từ lớp 9 xuống lớp 6 để ưu tiên lớp lớn hơn, và BỎ 'kính lúp' khỏi lớp 6 vì 'kính lúp' là bài học SGK KHTN 9 (Ánh sáng)!
    if (/lớp\s*9|khtn\s*9|\bkhối\s*9\b|khúc xạ ánh sáng|thấu kính|năng lượng tái tạo/i.test(fullText)) detected = '9';
    else if (/lớp\s*8|khtn\s*8|\bkhối\s*8\b|định luật bảo toàn khối lượng|áp suất chất lỏng/i.test(fullText)) detected = '8';
    else if (/lớp\s*7|khtn\s*7|\bkhối\s*7\b|nam châm|từ trường|quang hợp ở thực vật/i.test(fullText)) detected = '7';
    else if (/lớp\s*6|khtn\s*6|\bkhối\s*6\b|kính hiển vi quang học|đo khối lượng|đo thời gian|đo chiều dài|đo nhiệt độ|tế bào.*đơn vị/i.test(fullText)) detected = '6';

    if (detected && detected !== khtnConfig?.lop) {
      updateKhtnConfig('lop', detected);
    }
  }, [isKHTN, isCauTrucKHTNVao10, examHeader, matrix, khtnConfig?.manualLop]);

  // Nguồn dữ liệu nhóm năng lực tùy theo môn
  const compGroups = isKHTN ? (khtnCompetencyGroupsByLop[Number(khtnSelectedLop)] || khtnCompetencyGroupsByLop[8]) : (isMath ? mathCompetencyGroups : (isChemistry ? chemistryCompetencyGroups : (isBiology ? biologyCompetencyGroups : (isPhysics ? physicsCompetencyGroups : (isGeography ? geographyCompetencyGroups : null)))));

  // =======================================================================
  // HELPERS: Tính tổng từ tất cả ĐVKT của tất cả Chủ đề
  // =======================================================================
  const sumAll = (type, level) => matrix.reduce((sum, topic) => sum + getTopicSum(topic, type, level), 0);

  const getDvLevelCount = (dv, level) =>
    (Number(dv.nhieuLuaChon?.[level]) || 0) +
    (Number(dv.dungSai?.[level]) || 0) +
    (config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0) +
    (Number(dv.tuLuan?.[level]) || 0);

  const getTopicLevelCount = (topic, level) =>
    getTopicSum(topic, 'nhieuLuaChon', level) +
    getTopicSum(topic, 'dungSai', level) +
    (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) : 0) +
    getTopicSum(topic, 'tuLuan', level);

  const getLevelTotalItems = (level) => {
    let total = sumAll('nhieuLuaChon', level) + sumAll('dungSai', level) +
      (config.hasTraLoiNgan ? sumAll('traLoiNgan', level) : 0) + sumAll('tuLuan', level);
    // VDC hiểu ngầm → gộp vào cột VD
    if (level === 'vanDung') total += sumAll('dungSai', 'vanDungCao');
    return total;
  };

  const getLevelTotalQuestions = (level) => {
    let dsCount = sumAll('dungSai', level);
    if (level === 'vanDung' && !isKHTN) dsCount += sumAll('dungSai', 'vanDungCao');
    if (level === 'vanDungCao' && isKHTN) dsCount = sumAll('dungSai', 'vanDungCao');
    return sumAll('nhieuLuaChon', level) +
      (dsCount * 0.25) +
      (config.hasTraLoiNgan ? sumAll('traLoiNgan', level) : 0) +
      getTuLuanCauCount(matrix, level, tuLuanConfig);
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

  const getLevelTotalPoints = (level) => {
    const tlKey = level === 'biet' ? 'diemBiet' : level === 'hieu' ? 'diemHieu' : level === 'vanDungCao' ? 'diemVanDungCao' : 'diemVanDung';
    const raw = matrix.reduce((sum, topic) => {
      let dsCount = getTopicSum(topic, 'dungSai', level);
      if (level === 'vanDung' && !isKHTN) dsCount += getTopicSum(topic, 'dungSai', 'vanDungCao');
      if (level === 'vanDungCao') dsCount = isKHTN ? getTopicSum(topic, 'dungSai', 'vanDungCao') : 0;
      
      const p1Pts = level === 'vanDungCao' ? 0 : getTopicSum(topic, 'nhieuLuaChon', level) * examConfig.diemMoiCauP1;
      const dsPts = dsCount * examConfig.diemMoiYP2;
      const p3Pts = (config.hasTraLoiNgan && level !== 'vanDungCao') ? getTopicSum(topic, 'traLoiNgan', level) * examConfig.diemMoiYP3 : 0;
      const tlPts = getTopicTuLuanDiem(topic, tlKey);

      return sum + p1Pts + dsPts + p3Pts + tlPts;
    }, 0);
    return Math.round(raw * 100) / 100;
  };

  const getGrandTotalPoints = () => getLevelTotalPoints('biet') + getLevelTotalPoints('hieu') + getLevelTotalPoints('vanDung') + (isKHTN ? getLevelTotalPoints('vanDungCao') : 0);

  const getTopicSoTiet = (topic) => getTotalSoTiet(topic);

  // Helper: Format tổng per ĐVKT dạng "1c+ 2 ý" (hoặc điểm số thập phân nếu là KHTN)
  const formatDvLevelSummary = (dv, level) => {
    if (isKHTN) {
      let pts = 0;
      pts += (Number(dv.nhieuLuaChon?.[level]) || 0) * (examConfig.diemMoiCauP1 || 0.25);
      pts += (Number(dv.dungSai?.[level]) || 0) * (examConfig.diemMoiYP2 || 0.25);
      if (config.hasTraLoiNgan) {
        pts += (Number(dv.traLoiNgan?.[level]) || 0) * (examConfig.diemMoiYP3 || 0.25);
      }
      if (config.hasTuLuan) {
        const subs = (dv.tuLuan?.subItems || []).filter(s => s.level === level);
        pts += subs.reduce((s, sub) => s + (Number(sub.diem) || 0), 0);
      }
      const val = Math.round(pts * 100) / 100;
      if (val <= 0) return '';
      return val.toFixed(2).replace('.00', '').replace('.', ',');
    }
    const nlc = Number(dv.nhieuLuaChon?.[level]) || 0;
    const ds = Number(dv.dungSai?.[level]) || 0;
    const tln = config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0;
    const tl = config.hasTuLuan ? (dv.tuLuan?.subItems || []).filter(s => s.level === level).length : 0;
    const totalCau = nlc;
    const totalY = ds + tln + tl;
    if (totalCau === 0 && totalY === 0) return '';
    if (totalCau > 0 && totalY === 0) return `${totalCau}`;
    if (totalCau === 0 && totalY > 0) return `${totalY} ý`;
    return `${totalCau}c+ ${totalY} ý`;
  };

  // Helper: Render cell Tự luận cho 1 mức độ nhận thức
  const renderTuLuanCell = (topicId, dvId, dv, level) => {
    const subs = (dv.tuLuan?.subItems || []).filter(s => s.level === level);
    const totalDiem = subs.reduce((s, sub) => s + (sub.diem || 0), 0);
    return (
      <td className="border border-slate-300 p-1 bg-green-50/10 align-top min-w-[85px]">
        <div className="flex flex-col gap-1.5">
          {subs.map((sub, subIdx) => {
            // Lấy mapping nhãn câu và mã năng lực từ indicatorMap
            const mapping = dv.indicatorMap?.[`tuLuan_${level}_${subIdx}`];
            const qLabel = typeof mapping === 'object' ? mapping.label : '';
            const indCode = typeof mapping === 'object' ? mapping.code : mapping;

            return (
              <div key={sub.id || subIdx} className="flex flex-col border-b border-green-100 pb-1 last:border-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {examConfig.isCauTruc4213 ? (
                      <span className="text-[9px] text-slate-400 font-bold">{qLabel}</span>
                    ) : (
                      <>
                        <span className="text-[9px] text-slate-400 font-bold">{String.fromCharCode(97 + subIdx)}.</span>
                        {qLabel && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-black">{qLabel}</span>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-red-700">{sub.diem ? sub.diem.toFixed(2).replace('.00', '').replace('.50', ',5') : '0'}đ</span>
                    <button onClick={() => removeTuLuanSubItem(topicId, dvId, sub.id)} className="text-red-300 hover:text-red-600 p-0.5 shrink-0" title="Xóa ý này">
                      <X size={9} />
                    </button>
                  </div>
                </div>
                {isKHTN ? (() => {
                  const activeCode = getRowKhtnCode(dv, level);
                  const allowedCodes = LEVEL_ALLOWED_KHTN_CODES[level] || [];
                  return (
                    <div className="mt-0.5">
                      <select
                        value={activeCode}
                        onChange={(e) => {
                          const newCode = e.target.value;
                          updateLevelIndicatorCode(topicId, dv.id, level, newCode);
                          const currentYccd = dv.yeuCauCanDat || '';
                          const parsed = parseYccdByLevel(currentYccd);
                          const currentLevelText = parsed[level] || '';
                          const formatted = formatYccdWithCode(currentLevelText, newCode, formatLevelDisplayName(level));
                          const updatedText = updateYccdForLevel(currentYccd, level, formatted);
                          updateDvYccd(topicId, dv.id, updatedText);
                        }}
                        className="text-[9px] font-black px-1 py-0.5 rounded border border-green-300 bg-green-50 text-green-800 cursor-pointer focus:outline-none"
                        title={KHTN_CODE_MAP[activeCode]?.fullText || `Mã: ${activeCode}`}
                      >
                        {allowedCodes.map(codeKey => (
                          <option key={codeKey} value={codeKey}>[{codeKey}]</option>
                        ))}
                      </select>
                    </div>
                  );
                })() : (
                  !examConfig.isCauTruc4213 && indCode && (
                    <div className="text-[8px] leading-[10px] font-extrabold text-indigo-600 mt-0.5">({indCode})</div>
                  )
                )}
              </div>
            );
          })}
          <button
            onClick={() => addTuLuanSubItem(topicId, dvId, level)}
            className="flex items-center justify-center gap-0.5 text-[9px] text-green-600 hover:text-green-800 font-semibold border border-dashed border-green-300 rounded py-0.5 hover:bg-green-50 transition-colors"
            title="Thêm ý"
          >
            <PlusCircle size={9} />
          </button>
          {totalDiem > 0 && (
            <div className="text-[9px] text-green-700 font-black text-center mt-0.5 pt-0.5 border-t border-green-300 bg-green-100/50 rounded">
              ∑ {totalDiem.toFixed(2).replace('.00', '')}đ
            </div>
          )}
        </div>
      </td>
    );
  };

  // Helper: Tính tổng điểm per ĐVKT
  const getDvTotalPoints = (dv) => {
    const nlc = ((Number(dv.nhieuLuaChon?.biet) || 0) + (Number(dv.nhieuLuaChon?.hieu) || 0) + (Number(dv.nhieuLuaChon?.vanDung) || 0)) * examConfig.diemMoiCauP1;
    const ds = ((Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0)) * examConfig.diemMoiYP2;
    const tln = config.hasTraLoiNgan ? ((Number(dv.traLoiNgan?.biet) || 0) + (Number(dv.traLoiNgan?.hieu) || 0) + (Number(dv.traLoiNgan?.vanDung) || 0)) * examConfig.diemMoiYP3 : 0;
    const tl = (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0)
             + (Number(dv.tuLuan?.diemVanDung) || 0) + (Number(dv.tuLuan?.diemVanDungCao) || 0);
    return Math.round((nlc + ds + tln + tl) * 100) / 100;
  };

  // Thống kê tiến độ phân bổ điểm cho Đề Cuối Kì (Nửa đầu kì vs Nửa sau kì)
  const cuoiKiStats = useMemo(() => {
    if (!config.isCuoiKi) return null;
    let sumDauPts = 0;
    let sumSauPts = 0;
    let countDauDvs = 0;
    let countSauDvs = 0;

    matrix.forEach(t => {
      (t.donViKienThuc || []).forEach(dv => {
        const pts = getDvTotalPoints(dv);
        if (dv.isNuaDauKi) {
          sumDauPts += pts;
          countDauDvs++;
        } else {
          sumSauPts += pts;
          countSauDvs++;
        }
      });
    });

    sumDauPts = Math.round(sumDauPts * 100) / 100;
    sumSauPts = Math.round(sumSauPts * 100) / 100;

    const targetDau = config.isCuoiKi === '20-80' ? 2.0
                    : config.isCuoiKi === '30-70' ? 3.0
                    : config.isCuoiKi === '2.25-7.75' ? 2.25
                    : 2.5;
    const targetSau = Math.round((10.0 - targetDau) * 100) / 100;

    const isBalanced = Math.abs(sumDauPts - targetDau) < 0.05 && Math.abs(sumSauPts - targetSau) < 0.05;

    return {
      sumDauPts,
      sumSauPts,
      targetDau,
      targetSau,
      countDauDvs,
      countSauDvs,
      isBalanced
    };
  }, [config.isCuoiKi, matrix, examConfig]);

  // Format tổng ĐS cho dòng "Tổng số câu": "1,5 (6 ý)"
  const fmtDsCau = (level) => {
    let y = sumAll('dungSai', level);
    if (level === 'vanDung') y += sumAll('dungSai', 'vanDungCao');
    if (y === 0) return '';
    const cau = y * 0.25;
    const cauStr = cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
    return `${cauStr} (${y} ý)`;
  };

  // Format Tự luận cho dòng "Tổng số câu": hiển thị số câu (ví dụ 1 câu thay vì 2 ý)
  const fmtTuLuanCau = (level) => {
    const cau = getTuLuanCauCount(matrix, level, tuLuanConfig);
    if (cau === 0) return '';
    return cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
  };

  const fmtTuLuanTooltip = (level) => {
    const cau = getTuLuanCauCount(matrix, level, tuLuanConfig);
    const y = sumAll('tuLuan', level);
    if (cau === 0) return '';
    const cauStr = cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
    return y > cau ? `${cauStr} câu (${y} ý)` : `${cauStr} câu`;
  };

  // Format tổng câu cho dòng "Tổng số câu": "7c+ 2 ý"
  const fmtTongCau = (level) => {
    const tlCau = getTuLuanCauCount(matrix, level, tuLuanConfig);
    const nlc = sumAll('nhieuLuaChon', level);
    const tln = config.hasTraLoiNgan ? sumAll('traLoiNgan', level) : 0;
    const tlInt = Math.floor(tlCau);
    const c = nlc + tln + tlInt;

    let dsCount = sumAll('dungSai', level);
    if (level === 'vanDung' && !isKHTN) dsCount += sumAll('dungSai', 'vanDungCao');
    if (level === 'vanDungCao' && isKHTN) dsCount = sumAll('dungSai', 'vanDungCao');
    const y = dsCount;

    const tlRem = tlCau - tlInt;
    if (tlRem > 0) {
      const cauVal = Math.round((c + tlRem) * 10) / 10;
      const cauStr = cauVal % 1 === 0 ? String(cauVal) : cauVal.toFixed(1).replace('.', ',');
      return y > 0 ? `${cauStr}c+ ${y} ý` : `${cauStr}c`;
    }

    if (c === 0 && y === 0) return '';
    if (c > 0 && y === 0) return `${c}`;
    if (c === 0 && y > 0) return `${y} ý`;
    return `${c}c+ ${y} ý`;
  };

  // Grand total câu quy đổi
  const grandTotalCau = Math.round((
    getLevelTotalQuestions('biet') +
    getLevelTotalQuestions('hieu') +
    getLevelTotalQuestions('vanDung') +
    (isKHTN ? getLevelTotalQuestions('vanDungCao') : 0)
  ) * 100) / 100;

  // Helper: Render cell input kèm mã năng lực chỉ báo (nếu có)
  const renderCellInput = (topicId, dv, type, level) => {
    let count = Number(dv[type]?.[level]) || 0;
    if (type === 'dungSai' && level === 'vanDung') {
      count = (Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0);
    }
    
    // Tính tổng điểm ô này
    const diemMoiItem = type === 'nhieuLuaChon' ? examConfig.diemMoiCauP1 : (type === 'dungSai' ? examConfig.diemMoiYP2 : examConfig.diemMoiYP3);
    const totalDiem = Math.round(count * diemMoiItem * 100) / 100;

    // Lấy danh sách mapping (Nhãn câu + Mã năng lực)
    const mappings = [];
    if (dv.indicatorMap) {
      if (type === 'dungSai' && level === 'vanDung') {
        // VD và VDC được autoFill lưu ở 2 key prefix riêng biệt
        // phải tra từng nhóm để không bỏ sót ý VDC
        const vdCount = Number(dv.dungSai?.vanDung) || 0;
        const vdcCount = Number(dv.dungSai?.vanDungCao) || 0;
        for (let i = 0; i < vdCount; i++) {
          const m = dv.indicatorMap[`dungSai_vanDung_${i}`];
          if (m) mappings.push(m);
        }
        for (let i = 0; i < vdcCount; i++) {
          const m = dv.indicatorMap[`dungSai_vanDungCao_${i}`];
          if (m) mappings.push(m);
        }
      } else {
        for (let i = 0; i < count; i++) {
          const m = dv.indicatorMap[`${type}_${level}_${i}`];
          if (m) mappings.push(m);
        }
      }
    }

    const disabled = type === 'traLoiNgan' && !config.hasTraLoiNgan;

    return (
      <div className="flex flex-col h-full w-full relative min-h-[45px] pb-1">
        <input 
          disabled={disabled}
          type="number" 
          min="0" 
          className="w-full h-7 text-center outline-none bg-transparent font-bold text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed" 
          value={disabled ? '' : (count || '')} 
          onChange={(e) => {
            updateDvQuestionCount(topicId, dv.id, type, level, e.target.value);
            if (type === 'dungSai' && level === 'vanDung') {
              updateDvQuestionCount(topicId, dv.id, 'dungSai', 'vanDungCao', 0);
            }
          }} 
        />
        {count > 0 && !disabled && (
          <div className="flex flex-col items-center gap-[2px] px-1">
             {/* Hiển thị điểm */}
             <div className="text-[9px] font-bold text-red-600 leading-none">
               ({totalDiem.toFixed(2).replace('.00', '')}đ)
             </div>
             
             {/* Hiển thị Nhãn câu và Mã năng lực */}
              {isKHTN ? (() => {
                const activeCode = getRowKhtnCode(dv, level);
                
                // Format số ý Đúng/Sai giống văn bản của Bộ/Sở: "1/2 ý a, b", "1/4 ý c", "1/4 ý d"
                let dsLabel = null;
                if (type === 'dungSai') {
                  if (level === 'biet') dsLabel = count === 2 ? '1/2 ý a, b' : (count === 1 ? '1/4 ý' : `${count} ý`);
                  else if (level === 'hieu') dsLabel = count === 1 ? '1/4 ý c' : `${count} ý`;
                  else if (level === 'vanDung' || level === 'vanDungCao') dsLabel = count === 1 ? '1/4 ý d' : `${count} ý`;
                }

                return (
                  <div className="flex flex-col items-center gap-[2px] mt-0.5 w-full">
                    {dsLabel && (
                      <span className="text-[9px] font-bold text-slate-700 leading-none text-center">
                        {dsLabel}
                      </span>
                    )}
                    <select
                      value={activeCode}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        updateLevelIndicatorCode(topicId, dv.id, level, newCode);
                        const currentYccd = dv.yeuCauCanDat || '';
                        const parsed = parseYccdByLevel(currentYccd);
                        const currentLevelText = parsed[level] || '';
                        const formatted = formatYccdWithCode(currentLevelText, newCode, formatLevelDisplayName(level));
                        const updatedText = updateYccdForLevel(currentYccd, level, formatted);
                        updateDvYccd(topicId, dv.id, updatedText);
                      }}
                      className="text-[10px] font-black px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 text-blue-800 cursor-pointer focus:outline-none hover:bg-blue-100 transition-colors text-center"
                      title={KHTN_CODE_MAP[activeCode]?.fullText || `Mã: ${activeCode}`}
                    >
                      {(LEVEL_ALLOWED_KHTN_CODES[level] || []).map(codeKey => (
                        <option key={codeKey} value={codeKey}>[{codeKey}]</option>
                      ))}
                    </select>
                  </div>
                );
              })() : (
                mappings.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-[2px] mt-1">
                    {examConfig.isCauTruc4213 ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-blue-700 leading-none text-center">
                          {formatGroupedLabels(mappings.map(m => typeof m === 'object' ? m.label : ''))}
                        </span>
                      </div>
                    ) : (
                      mappings.map((m, idx) => {
                        const qLabel = typeof m === 'object' ? m.label : '';
                        const indCode = typeof m === 'object' ? m.code : m;
                        return (
                          <div key={idx} className="flex flex-col items-center bg-slate-100 border border-slate-200 rounded px-0.5 py-0.5 min-w-[24px]">
                            {qLabel && <span className="text-[8px] font-black text-blue-700 leading-none">{qLabel}</span>}
                            {indCode && <span className="text-[7.5px] font-extrabold text-indigo-600 leading-none mt-0.5">{indCode}</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                )
              )}
          </div>
        )}
      </div>
    );
  };

  // =======================================================================
  // TÍNH TOÁN SỐ CÂU/Ý SUY RA TỪ examConfig (hiển thị real-time)
  // =======================================================================
  const computedCounts = useMemo(() => {
    const ec = examConfig;
    if (ec.isCauTrucKHTNVao10) {
      return { soCauP1: 22, soYP2: 12, soCauP2: 3, soYP3: 6, tongYTuLuan: 0 };
    }
    if (ec.isCauTrucToan3223) {
      // Cấu trúc Toán 3-2-2-3 GDPT 2018: cứng số câu
      // P.I: 12 câu × 0,25đ = 3đ | P.II: 2 câu × 4ý = 8ý × 0,25đ = 2đ
      // P.III: 4 câu × 0,50đ = 2đ | P.IV: 3 câu TL × 1đ = 3đ
      return { soCauP1: 12, soYP2: 8, soCauP2: 2, soYP3: 4, tongYTuLuan: 3 };
    }
    const tongDiem = ec.tongDiem || 10.0;
    const tiLe = ec.tiLeNhanThuc;
    const weights = [tiLe.biet, tiLe.hieu, tiLe.vanDung];

    // TNKQ
    const soCauP1 = ec.diemMoiCauP1 > 0 ? Math.round(ec.tongDiemP1 / ec.diemMoiCauP1) : 0;
    let soYP2Raw = ec.diemMoiYP2 > 0 ? Math.round(ec.tongDiemP2 / ec.diemMoiYP2) : 0;
    const soYP2 = Math.ceil(soYP2Raw / 4) * 4;
    const soCauP2 = Math.ceil(soYP2 / 4);
    const soYP3 = config.hasTraLoiNgan && ec.diemMoiYP3 > 0 ? Math.round(ec.tongDiemP3 / ec.diemMoiYP3) : 0;

    // Cognitive Gap Filling: Tự luận
    const targetB = tongDiem * (tiLe.biet / 100);
    const targetH = tongDiem * (tiLe.hieu / 100);
    const targetVD = tongDiem * (tiLe.vanDung / 100);

    // Cần distributeLargestRemainder nhưng không import trực tiếp => dùng tỉ lệ đơn giản
    const sumW = weights[0] + weights[1] + weights[2];
    const p1B = sumW > 0 ? Math.round(soCauP1 * weights[0] / sumW) : 0;
    const p1H = sumW > 0 ? Math.round(soCauP1 * weights[1] / sumW) : 0;
    const p1VD = soCauP1 - p1B - p1H;
    const p2B = sumW > 0 ? Math.round(soYP2 * weights[0] / sumW) : 0;
    const p2H = sumW > 0 ? Math.round(soYP2 * weights[1] / sumW) : 0;
    const p2VD = soYP2 - p2B - p2H;
    const p3B = sumW > 0 ? Math.round(soYP3 * weights[0] / sumW) : 0;
    const p3H = sumW > 0 ? Math.round(soYP3 * weights[1] / sumW) : 0;
    const p3VD = soYP3 - p3B - p3H;

    const usedB = p1B * ec.diemMoiCauP1 + p2B * ec.diemMoiYP2 + p3B * ec.diemMoiYP3;
    const usedH = p1H * ec.diemMoiCauP1 + p2H * ec.diemMoiYP2 + p3H * ec.diemMoiYP3;
    const usedVD = p1VD * ec.diemMoiCauP1 + p2VD * ec.diemMoiYP2 + p3VD * ec.diemMoiYP3;

    const diemTL = ec.diemMoiYTuLuan || 0.5;
    const tlB = diemTL > 0 ? Math.max(0, Math.round(Math.max(0, targetB - usedB) / diemTL)) : 0;
    const tlH = diemTL > 0 ? Math.max(0, Math.round(Math.max(0, targetH - usedH) / diemTL)) : 0;
    const tlVD = diemTL > 0 ? Math.max(0, Math.round(Math.max(0, targetVD - usedVD) / diemTL)) : 0;
    const tongYTuLuan = tlB + tlH + tlVD;

    return { soCauP1, soYP2, soCauP2, soYP3, tongYTuLuan };
  }, [examConfig, config.hasTraLoiNgan]);

  // =======================================================================
  // BUILD ROWS: Double-loop — topic → ĐVKT
  // =======================================================================
  const buildBodyRows = () => {
    const rows = [];
    matrix.forEach((topic, topicIdx) => {
      const dvList = topic.donViKienThuc || [];
      const dvCount = dvList.length;
      const topicSoTiet = getTopicSoTiet(topic);

      dvList.forEach((dv, dvIdx) => {
        const isFirst = dvIdx === 0;
        const isLast = dvIdx === dvCount - 1;

        // TÍNH TỈ LỆ THỰC TẾ CỦA TỪNG BÀI (ĐVKT)
        const dvTotalPoints = getDvTotalPoints(dv);
        const dvPercent = ((dvTotalPoints / 10) * 100).toFixed(1).replace('.0', '');

        // TÍNH TỈ LỆ MỤC TIÊU CỦA TỪNG BÀI (DỰA TRÊN SỐ TIẾT)
        const tongTietToanBai = matrix.reduce((sum, t) => sum + getTopicSoTiet(t), 0);
        let dvTargetPercent = 0;
        if (tongTietToanBai > 0) {
          if (config.isCuoiKi) {
            const pctDau = config.isCuoiKi === '2.25-7.75' ? 22.5
                          : config.isCuoiKi === '20-80' ? 20
                          : config.isCuoiKi === '30-70' ? 30
                          : 25;
            const pctSau = config.isCuoiKi === '2.25-7.75' ? 77.5
                          : config.isCuoiKi === '20-80' ? 80
                          : config.isCuoiKi === '30-70' ? 70
                          : 75;
            let sumDau = 0, sumSau = 0;
            matrix.forEach(t => {
              t.donViKienThuc.forEach(d => {
                const dvTiet = Number(d.soTiet) || 0;
                if (d.isNuaDauKi) sumDau += dvTiet; 
                else sumSau += dvTiet;
              });
            });
            
            const dvTiet = Number(dv.soTiet) || 0;
            if (dv.isNuaDauKi && sumDau > 0) dvTargetPercent = (dvTiet / sumDau) * pctDau;
            else if (!dv.isNuaDauKi && sumSau > 0) dvTargetPercent = (dvTiet / sumSau) * pctSau;
          } else {
            dvTargetPercent = (Number(dv.soTiet) / tongTietToanBai) * 100;
          }
        }
        const dvTargetPercentStr = dvTargetPercent.toFixed(1).replace('.0', '');

        rows.push(
          <tr key={`${topic.id}_${dv.id}`} className="hover:bg-slate-50 transition-colors">
            {/* CỘT TT — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-2 text-center font-medium text-slate-600 align-top">{topicIdx + 1}</td>
            )}

            {/* CỘT CHỦ ĐỀ — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-1 align-top min-w-[120px]">
                <textarea className="w-full bg-transparent outline-none resize-vertical p-1 text-sm font-semibold text-slate-800 leading-snug" rows="3" placeholder="Chủ đề / Chương..." value={topic.tenChuDe} onChange={(e) => updateTopicText(topic.id, 'tenChuDe', e.target.value)} />
                {config.isCuoiKi && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateTopicPhase(topic.id, true)}
                      className="text-[9px] px-1 py-0.5 rounded font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 transition-all cursor-pointer"
                      title="Gán tất cả bài trong chủ đề này là Nửa đầu kì (trước giữa kì)"
                    >
                      CĐ: Nửa đầu
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTopicPhase(topic.id, false)}
                      className="text-[9px] px-1 py-0.5 rounded font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                      title="Gán tất cả bài trong chủ đề này là Nửa sau kì (sau giữa kì)"
                    >
                      CĐ: Nửa sau
                    </button>
                  </div>
                )}
              </td>
            )}

            {/* CỘT ĐVKT — Mỗi ĐVKT 1 ô riêng */}
            <td className="border border-slate-300 p-1 align-top">
              <div className="flex items-start gap-1 group">
                <span className="text-[10px] text-slate-400 font-bold mt-1.5 shrink-0">{dvIdx + 1}.</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  {(isChemistry || isMath || isKHTN) ? (
                    <SubjectAutocomplete
                      placeholder={`ĐVKT ${dvIdx + 1}...`}
                      value={dv.noiDung}
                      onChange={(newVal) => updateDonVi(topic.id, dv.id, 'noiDung', newVal)}
                      isMath={isMath}
                      isChemistry={isChemistry}
                      isKHTN={isKHTN}
                      khtnLop={khtnSelectedLop}
                    />
                  ) : (
                    <textarea
                      className="w-full bg-transparent outline-none resize-vertical p-0.5 text-sm border-b border-slate-200 focus:border-blue-400 transition-colors leading-snug"
                      rows="2"
                      placeholder={`Bài / ĐVKT ${dvIdx + 1}...`}
                      value={dv.noiDung}
                      onChange={(e) => updateDonVi(topic.id, dv.id, 'noiDung', e.target.value)}
                    />
                  )}
                  {/* Badge phân môn KHTN */}
                  {isKHTN && (() => {
                    const pm = dv.phanMon || detectPhanMon(dv.noiDung, khtnSelectedLop);
                    const pmInfo = pm ? PHAN_MON_LABELS[pm] : null;
                    const nextPm = pm === 'vatli' ? 'hoahoc' : (pm === 'hoahoc' ? 'sinhhoc' : 'vatli');
                    return pmInfo ? (
                      <div className="mt-0.5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => updateDonVi(topic.id, dv.id, 'phanMon', nextPm)}
                          className="text-[8px] font-bold px-1.5 py-0.2 rounded-full border cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ color: pmInfo.color, borderColor: pmInfo.color, backgroundColor: pmInfo.color + '15' }}
                          title="Bấm để đổi phân môn (Vật lí / Hóa học / Sinh học)"
                        >
                          {pmInfo.icon} {pmInfo.label}
                        </button>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">Tiết:</span>
                    <input
                      type="number" min="0"
                      className="w-10 text-center text-[11px] outline-none bg-yellow-50 border border-yellow-200 rounded px-0.5 py-0 font-bold text-yellow-700 focus:border-yellow-500"
                      value={dv.soTiet || ''}
                      onChange={(e) => updateDonVi(topic.id, dv.id, 'soTiet', e.target.value)}
                    />
                    {config.isCuoiKi && (
                      <select 
                        value={dv.isNuaDauKi ? 'dau' : 'sau'} 
                        onChange={(e) => updateDonViPhase(topic.id, dv.id, e.target.value === 'dau')}
                        className={`text-[9px] px-1 py-0 rounded border font-semibold outline-none ${dv.isNuaDauKi ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                      >
                        <option value="sau">Nửa sau</option>
                        <option value="dau">Nửa đầu</option>
                      </select>
                    )}
                    {dvCount > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeDonVi(topic.id, dv.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors ml-auto flex items-center gap-0.5 text-[10px] font-bold"
                        title="Xóa đơn vị kiến thức này khỏi chủ đề"
                      >
                        <Trash2 size={12} />
                        <span>Xóa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Chủ đề này hiện chỉ có 1 bài học. Bạn có muốn xóa toàn bộ "${topic.tenChuDe || 'Chủ đề'}" không?`)) {
                            removeTopic(topic.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors ml-auto flex items-center gap-0.5 text-[10px]"
                        title="Xóa chủ đề này"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {/* PHONG CÁCH RA ĐỀ — Pill tags */}
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {[
                      { value: 'thuc_te', emoji: '🛒', label: 'Thực tế', color: 'emerald' },
                      { value: 'lien_mon', emoji: '🌍', label: 'Liên môn', color: 'blue' },
                      { value: 'ly_thuyet', emoji: '📖', label: 'Lý thuyết', color: 'amber' },
                      { value: 'thuan_tinh_toan', emoji: '🧮', label: 'Tính toán', color: 'purple' },
                    ].map(opt => {
                      const checked = (dv.phongCach || []).includes(opt.value);
                      const colorMap = {
                        emerald: checked ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600',
                        blue: checked ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600',
                        amber: checked ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-600',
                        purple: checked ? 'bg-purple-100 border-purple-400 text-purple-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-purple-300 hover:text-purple-600',
                      };
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const current = dv.phongCach || [];
                            const next = checked
                              ? current.filter(v => v !== opt.value)
                              : [...current, opt.value];
                            updateDonVi(topic.id, dv.id, 'phongCach', next);
                          }}
                          className={`flex items-center gap-0.5 cursor-pointer select-none text-[10px] px-1.5 py-0.5 rounded-full border transition-all font-medium ${colorMap[opt.color]}`}
                          title={`${checked ? 'Bỏ' : 'Chọn'} phong cách: ${opt.label}`}
                        >
                          <span className="text-xs">{opt.emoji}</span> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* NÚT MỞ MODAL NĂNG LỰC CHỈ BÁO — Nổi bật hơn */}
                  {compGroups && (
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setIndicatorModal({ show: true, topicId: topic.id, dvId: dv.id, selected: dv.selectedIndicators || [] })}
                        className={`flex items-center gap-1.5 text-[11px] font-bold transition-all px-3 py-1 border-2 rounded-lg shadow-sm ${
                          (dv.selectedIndicators || []).length > 0 
                            ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 hover:shadow-md' 
                            : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50'
                        }`}
                        title="Bấm vào đây để chọn mã năng lực chỉ báo (TD, GQ, MH, GT, CC...)"
                      >
                        <ClipboardList size={13} />
                        {(dv.selectedIndicators || []).length > 0 ? `Đã chọn ${dv.selectedIndicators.length} chỉ báo` : '🎯 Chọn mã Năng lực/Chỉ báo'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isLast && (
                <button
                  type="button"
                  onClick={() => addDonVi(topic.id)}
                  className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 font-bold transition-all w-full justify-center py-1 border border-dashed border-blue-300 rounded-md hover:border-blue-500 mt-1.5 shadow-xs"
                  title="Thêm một ĐVKT mới vào chủ đề này"
                >
                  <PlusCircle size={13} /> ➕ Thêm ĐVKT vào chủ đề này
                </button>
              )}
            </td>

            {/* CỘT SỐ TIẾT — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-1 bg-yellow-50/30 align-top text-center">
                <div className="font-bold text-yellow-700 text-base h-8 flex items-center justify-center" title="Tổng số tiết">{topicSoTiet}</div>
              </td>
            )}

            {/* CÁC CỘT NHẬP SỐ CÂU — ĐỌC/GHI TỪ ĐVKT */}
            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'nhieuLuaChon', 'biet')}</td>
            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'nhieuLuaChon', 'hieu')}</td>
            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'nhieuLuaChon', 'vanDung')}</td>

            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'dungSai', 'biet')}</td>
            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'dungSai', 'hieu')}</td>
            <td className="border border-slate-300 p-0 align-top">{renderCellInput(topic.id, dv, 'dungSai', 'vanDung')}</td>

            <td className={`border border-slate-300 p-0 align-top ${!config.hasTraLoiNgan ? 'bg-slate-100' : ''}`}>{renderCellInput(topic.id, dv, 'traLoiNgan', 'biet')}</td>
            <td className={`border border-slate-300 p-0 align-top ${!config.hasTraLoiNgan ? 'bg-slate-100' : ''}`}>{renderCellInput(topic.id, dv, 'traLoiNgan', 'hieu')}</td>
            <td className={`border border-slate-300 p-0 align-top ${!config.hasTraLoiNgan ? 'bg-slate-100' : ''}`}>{renderCellInput(topic.id, dv, 'traLoiNgan', 'vanDung')}</td>

            {config.hasTuLuan && (
              <>
                {renderTuLuanCell(topic.id, dv.id, dv, 'biet')}
                {renderTuLuanCell(topic.id, dv.id, dv, 'hieu')}
                {renderTuLuanCell(topic.id, dv.id, dv, 'vanDung')}
                {isKHTN && renderTuLuanCell(topic.id, dv.id, dv, 'vanDungCao')}
              </>
            )}

            {/* CỘT TỔNG — TÍNH RIÊNG TẮNG ĐVKT ("1c+ 2 ý") */}
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'biet')}</td>
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'hieu')}</td>
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'vanDung')}</td>
            {isKHTN && <td className="border border-slate-300 p-2 text-center font-bold bg-red-50/50 text-[11px] whitespace-nowrap text-red-700">{formatDvLevelSummary(dv, 'vanDungCao')}</td>}

            {/* CỘT TỈ LỆ — HIỂN THỊ RIÊNG CHO TỪNG BÀI */}
            <td className="border border-slate-300 p-2 text-center font-bold text-blue-700 bg-slate-50/50">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm">{dvPercent}%</span>
                <span className="text-[10px] text-slate-400 font-normal italic">MT: {dvTargetPercentStr}%</span>
              </div>
            </td>

            {/* CỘT THAO TÁC / XÓA — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-2 text-center align-top">
                <div className="flex flex-col items-stretch gap-1.5 min-w-[105px]">
                  <button
                    type="button"
                    onClick={() => addDonVi(topic.id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded font-bold text-[10px] transition-all border border-emerald-300 shadow-xs"
                    title="Thêm một dòng ĐVKT mới vào đúng chủ đề này"
                  >
                    <PlusCircle size={12} />
                    <span>➕ Thêm ĐVKT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportTargetTopicId(topic.id);
                      setShowImportModal(true);
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded font-bold text-[10px] transition-all border border-blue-200"
                    title="Dán nhanh danh sách bài học từ Excel/Word vào đúng chủ đề này"
                  >
                    <FileSpreadsheet size={12} />
                    <span>⚡ Dán bài học</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ chủ đề "${topic.tenChuDe || 'này'}" không?`)) {
                        removeTopic(topic.id);
                      }
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded font-bold text-[10px] transition-all border border-red-200"
                    title="Xóa toàn bộ chủ đề này"
                  >
                    <Trash2 size={12} />
                    <span>Xóa CĐ</span>
                  </button>
                </div>
              </td>
            )}
          </tr>
        );
      });
    });
    return rows;
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FileSpreadsheet className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Ma trận đề kiểm tra
            </h2>
            <p className="text-sm text-slate-500">Thiết lập cấu trúc điểm và số câu hỏi</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* ========== TAB CHỌN CHẾ ĐỘ ĐỀ THI — NỔI BẬT ========== */}
          <div className="flex items-center bg-slate-200/80 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => { if (config.hasTuLuan) toggleTuLuan(false); }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
                !config.hasTuLuan
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Sparkles size={18} />
              <span>100% Trắc nghiệm</span>
              {!config.hasTuLuan && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-400 rounded-full animate-ping"></span>}
            </button>
            <button
              onClick={() => { if (!config.hasTuLuan) toggleTuLuan(true); }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
                config.hasTuLuan
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Settings2 size={18} />
              <span>Trắc nghiệm + Tự luận</span>
              {config.hasTuLuan && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></span>}
            </button>
          </div>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          {!config.hasTuLuan ? (
            // Dropdown cho 100% Trắc nghiệm
            <select
              className="bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold py-1.5 px-3 rounded-lg outline-none focus:border-indigo-400"
              onChange={(e) => setCauTrucDe(e.target.value)}
              value={examConfig.isCauTrucKHTNVao10 ? "5.5" : String(examConfig.tongDiemP1 || 3)}
              title="Chọn cấu trúc phân bổ điểm cho 100% TNKQ"
            >
              <option value="3">Cấu trúc 3-4-3 (Mặc định)</option>
              <option value="3.5">Cấu trúc 3.5-4-2.5</option>
              <option value="4">Cấu trúc 4-6-0 (Toán 100% TN)</option>
              <option value="4.5">Cấu trúc 4.5-4-1.5</option>
              <option value="5.5">
                {isKHTN ? "🎯 KHTN Vào 10: Cấu trúc 5.5-3-1.5 (QĐ 1038 Hải Phòng - 100% TN)" : "Cấu trúc 5.5-3-1.5"}
              </option>
            </select>
          ) : (
            // Dropdown cho Trắc nghiệm + Tự luận
            <select
              className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold py-1.5 px-3 rounded-lg outline-none focus:border-emerald-400"
              onChange={(e) => setCauTrucDe(e.target.value)}
              value={examConfig.isCauTruc4213 ? "4.01" : String(examConfig.tongDiemP1 || 3)}
              title="Chọn cấu trúc phân bổ điểm TNKQ (phần Tự luận tự động bù)"
            >
              <option value="3">TNKQ: 3-2-2 → Tự luận: 3đ</option>
              <option value="3.5">TNKQ: 3.5-2-1.5 → Tự luận: 3đ</option>
              <option value="4.01">🔬 KHTN THCS: Cấu trúc 4-2-1-3 (TNKQ 4-2-1đ → Tự luận: 3đ - CV 4956)</option>
              <option value="khtn-vao10">🎯 KHTN Vào 10: Cấu trúc 5.5-3-1.5 (100% TN - QĐ 1038 Hải Phòng)</option>
              <option value="4">Toán: 4-2-0 → Tự luận: 4đ (16 TN + 2 ĐS)</option>
            </select>
          )}

          {/* Badge trạng thái và Nút tiện ích cho Môn KHTN */}
          {isKHTN && (
            <div className="flex items-center gap-2">
              {examConfig.isCauTrucKHTNVao10 ? (
                <>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-300 shadow-sm">
                    🎯 Đang chọn: KHTN Vào 10 (QĐ 1038 HP)
                  </span>
                  <button
                    onClick={() => loadKhtnVao10SampleMatrix()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-all border border-emerald-500"
                    title="Bấm để nạp sẵn 13 Chủ đề KHTN 9 chuẩn QĐ 1038 Hải Phòng (16 Biết, 12 Hiểu, 12 VD = 40 ý)"
                  >
                    📋 Nạp 13 Chủ đề KHTN 9 HP
                  </button>
                  <button
                    onClick={() => setCauTruc4213()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-300 transition-all border border-slate-300"
                    title="Chuyển sang Cấu trúc KHTN 4-2-1-3 định kì THCS (có Tự luận 3đ)"
                  >
                    🔄 Đổi sang 4-2-1-3
                  </button>
                </>
              ) : examConfig.isCauTruc4213 ? (
                <>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300 shadow-sm">
                    ✅ Đang chọn: KHTN 4-2-1-3
                  </span>
                  <button
                    onClick={() => setCauTrucKHTNVao10(false)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-all border border-indigo-500"
                    title="Chuyển sang Cấu trúc Tuyển sinh Vào 10 KHTN (QĐ 1038 Hải Phòng - 100% Trắc nghiệm)"
                  >
                    🎯 Chọn KHTN Vào 10 (QĐ 1038)
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCauTruc4213()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold shadow hover:bg-teal-700 transition-all"
                    title="Bấm để kích hoạt Cấu trúc KHTN 4-2-1-3 chuẩn CV 4956"
                  >
                    📘 Chọn KHTN 4-2-1-3
                  </button>
                  <button
                    onClick={() => setCauTrucKHTNVao10(false)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-all"
                    title="Bấm để kích hoạt Cấu trúc Tuyển sinh Vào 10 KHTN (QĐ 1038 Hải Phòng)"
                  >
                    🎯 Chọn KHTN Vào 10 (QĐ 1038)
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="w-px h-6 bg-slate-300 mx-2"></div>

          {/* Toggle Trả lời ngắn */}
          <div className="flex items-center gap-2">
            <label className="flex items-center cursor-pointer select-none" title="Bỏ tích = Không có phần Trả lời ngắn, điểm P3 chuyển sang P2">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={config.hasTraLoiNgan !== false}
                  onChange={(e) => {
                    toggleTraLoiNgan(e.target.checked);
                  }}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${config.hasTraLoiNgan !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.hasTraLoiNgan !== false ? 'translate-x-4' : ''}`}></div>
              </div>
              <div className="ml-2 text-sm font-bold text-slate-700">Trả lời ngắn</div>
            </label>
          </div>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 text-sm">📅 Chế độ Cuối Kì:</span>
            <select
              value={config.isCuoiKi || ''}
              onChange={(e) => updateConfig('isCuoiKi', e.target.value || false)}
              className={`px-3 py-1.5 rounded-lg border-2 font-bold text-sm focus:outline-none cursor-pointer ${
                config.isCuoiKi
                  ? 'border-purple-300 bg-purple-50 text-purple-800 focus:border-purple-500'
                  : 'border-slate-200 bg-white text-slate-600 focus:border-slate-400'
              }`}
              title="Chọn chế độ phân bổ điểm cho đề Cuối Kì"
            >
              <option value="">Tắt (bình thường)</option>
              <option value="25-75">Cuối Kì 25% - 75% (Hải Phòng - 2,5đ / 7,5đ)</option>
              <option value="30-70">Cuối Kì 30% - 70%</option>
              <option value="20-80">Cuối Kì 20% - 80%</option>
              <option value="2.25-7.75">Cuối Kì 2,25đ - 7,75đ (22,5%-77,5%)</option>
            </select>
            {config.isCuoiKi && cuoiKiStats && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                cuoiKiStats.isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {cuoiKiStats.isBalanced ? '✓ Chuẩn 2,5đ / 7,5đ' : `Đầu: ${cuoiKiStats.sumDauPts}đ | Sau: ${cuoiKiStats.sumSauPts}đ`}
              </span>
            )}
          </div>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          {/* TOGGLE GOM NHÓM ĐÚNG/SAI THEO CHỦ ĐỀ & CẤU HÌNH ĐÚNG/SAI */}
          <div className="flex items-center gap-2">
            <label className="flex items-center cursor-pointer select-none" title="Khi bật, 4 mệnh đề Đúng/Sai sẽ lấy từ các bài khác nhau trong cùng chủ đề để kiểm tra kiến thức tổng hợp">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={config.groupTfByTopic || false}
                  onChange={(e) => updateConfig('groupTfByTopic', e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${config.groupTfByTopic ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.groupTfByTopic ? 'translate-x-4' : ''}`}></div>
              </div>
              <div className="ml-2 text-sm font-bold text-slate-700">Đ/S theo Chủ đề</div>
            </label>

            <button
              type="button"
              onClick={() => setShowDungSaiModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all cursor-pointer ${
                dungSaiConfig?.enabled
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-800 hover:bg-indigo-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
              title="Cấu hình chi tiết số câu, phạm vi và vị trí phân bổ câu Đúng/Sai"
            >
              <Settings2 size={15} /> Cấu hình Đúng/Sai
              {dungSaiConfig?.enabled && (
                <span className="ml-1 text-[10px] bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
              )}
            </button>
          </div>

          {config.hasTuLuan && (
            <>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              <button
                onClick={() => setShowTuLuanModal(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                  tuLuanConfig.enabled
                    ? 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-600'
                }`}
                title="Cấu hình chi tiết số câu, số ý và điểm mỗi câu tự luận"
              >
                <Settings2 size={16} /> Cấu hình Tự luận
                {tuLuanConfig.enabled && (
                  <span className="ml-1 text-[10px] bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                )}
              </button>
            </>
          )}
        </div>


        <div className="flex items-center gap-4">
          <button onClick={() => setShowSmartImport(true)} className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-teal-600 hover:to-emerald-700 transition-all font-bold">
            <Sparkles size={18} /> 🚀 Nhập Liệu Siêu Tốc
          </button>
          <button onClick={autoFillMatrix} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all font-bold">
            <Sparkles size={18} /> Auto-Fill
          </button>
          {/* [MOI - CT TOAN 2018] Nut goi y YCCD, chi hien thi voi mon Toan */}
          {isMath && (
            <button
              onClick={() => setCt2018Dialog({ show: true, lop: 8 })}
              title="Tu dong dien Yeu cau can dat chuan CT Toan 2018 vao bang dac ta (Step 3)"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all font-bold text-sm"
            >
              📚 Gợi ý YCCĐ CT2018
            </button>
          )}

          {/* [MOI - CẤU TRÚC TOÁN 3-2-2-3] Nút preset cấu trúc chuẩn GDPT 2018, chỉ hiện với môn Toán (không phải KHTN) */}
          {isMath && !isKHTN && (
            <button
              onClick={() => {
                if (window.confirm('Áp dụng Cấu trúc Toán 3-2-2-3 (GDPT 2018)?\n\n• Phần I: 12 câu × 0,25đ = 3,0đ (Nhận biết)\n• Phần II: 2 câu ĐS × 4 ý × 0,25đ = 2,0đ\n• Phần III: 4 câu × 0,50đ = 2,0đ (Hiểu + VD)\n• Phần IV: 3 câu Tự luận × 1,0đ = 3,0đ\n\nTỉ lệ: 40% Biết – 30% Hiểu – 30% Vận dụng')) {
                  setCauTrucToan3223();
                }
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-purple-700 hover:to-violet-700 transition-all font-bold text-sm"
              title="Áp dụng Cấu trúc Toán GDPT 2018: 3đ-2đ-2đ-3đ, P.III = 0,50đ/câu"
            >
              ⚡ Cấu trúc Toán 3-2-2-3
            </button>
          )}

          {/* [KHTN THCS] Chon khoi lop */}
          {isKHTN && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-teal-800">🔬 KHTN - Chọn lớp:</span>
              {isCauTrucKHTNVao10 ? (
                // Khi là cấu trúc Vào 10: chỉ hiển thị lớp 9, không cho đổi
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-600 text-white shadow">
                  Lớp 9 <span className="text-teal-200 font-normal">(cố định)</span>
                </span>
              ) : (
                // KHTN THCS bình thường: cho chọn 6/7/8/9
                ['6','7','8','9'].map(lop => (
                  <button
                    key={lop}
                    onClick={() => setKhtnSelectedLop(lop)}
                    className={`text-xs font-bold px-2.5 py-1 rounded transition-all ${khtnSelectedLop === lop ? 'bg-teal-600 text-white shadow' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-100'}`}
                  >
                    Lớp {lop}
                  </button>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* ============ HƯỚNG DẪN QUY TẮC RA ĐỀ THEO CHẾ ĐỘ ============ */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📋</div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 text-base mb-2">
              {config.hasTuLuan ? '📝 Quy tắc ra đề: Trắc nghiệm + Tự luận' : '✅ Quy tắc ra đề: 100% Trắc nghiệm'}
            </h3>

            {!config.hasTuLuan ? (
              // Hướng dẫn cho 100% TNKQ
              <div className="text-sm text-blue-800 space-y-1.5">
                <p className="font-semibold">Cấu trúc đề thi gồm 3 phần trắc nghiệm:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Phần I - Nhiều lựa chọn:</strong> Mỗi câu có 4 đáp án A, B, C, D. Chọn 1 đáp án đúng.</li>
                  <li><strong>Phần II - Đúng/Sai:</strong> Mỗi câu có 4 mệnh đề (a, b, c, d). Học sinh đánh giá từng mệnh đề Đúng hoặc Sai.</li>
                  <li><strong>Phần III - Trả lời ngắn:</strong> Học sinh điền đáp án ngắn gọn (số, từ khóa, công thức...).</li>
                </ul>
                <p className="mt-2 text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                  💡 <strong>Lưu ý:</strong> Tổng điểm 3 phần = 10 điểm. Điều chỉnh điểm mỗi câu/ý bên dưới để phù hợp với yêu cầu.
                </p>
              </div>
            ) : (
              // Hướng dẫn cho TNKQ + Tự luận
              <div className="text-sm text-emerald-800 space-y-1.5">
                <p className="font-semibold">Cấu trúc đề thi gồm 4 phần:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Phần I - Nhiều lựa chọn (TNKQ):</strong> Mỗi câu có 4 đáp án A, B, C, D.</li>
                  <li><strong>Phần II - Đúng/Sai (TNKQ):</strong> Mỗi câu có 4 mệnh đề cần đánh giá Đúng/Sai.</li>
                  <li><strong>Phần III - Trả lời ngắn (TNKQ):</strong> Điền đáp án ngắn (nếu bật).</li>
                  <li><strong>Phần IV - Tự luận:</strong> Câu hỏi mở, yêu cầu trình bày, giải thích, chứng minh. Mỗi ý được chấm theo thang điểm riêng.</li>
                </ul>
                <p className="mt-2 text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                  💡 <strong>Lưu ý:</strong> Hệ thống tự động tính điểm Tự luận = 10đ - (Điểm 3 phần TNKQ), đảm bảo tỉ lệ nhận thức 40-30-30 (Biết-Hiểu-Vận dụng).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ ĐIỀU CHỈNH ĐIỂM LINH HOẠT — 3 PHẦN TNKQ ============ */}
      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-sm font-bold text-indigo-800">💰 Điểm/câu TNKQ:</span>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
            <label className="text-xs font-semibold text-blue-700">P.I (1 câu):</label>
            <input
              type="number" step="0.05" min="0.05"
              className="w-16 bg-blue-50 border border-blue-300 rounded p-1 text-center font-bold text-blue-800 text-sm focus:outline-none focus:border-blue-500"
              value={examConfig.diemMoiCauP1}
              onChange={(e) => updateExamConfig('diemMoiCauP1', Number(e.target.value) || 0.25)}
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
            <label className="text-xs font-semibold text-amber-700">P.II (1 ý Đ/S):</label>
            <input
              type="number" step="0.05" min="0.05"
              className="w-16 bg-amber-50 border border-amber-300 rounded p-1 text-center font-bold text-amber-800 text-sm focus:outline-none focus:border-amber-500"
              value={examConfig.diemMoiYP2}
              onChange={(e) => updateExamConfig('diemMoiYP2', Number(e.target.value) || 0.25)}
            />
          </div>

          <div className={`flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-sm ${config.hasTraLoiNgan ? 'border-emerald-200' : 'border-slate-200 opacity-40'}`}>
            <label className="text-xs font-semibold text-emerald-700">P.III (1 ý TLN):</label>
            <input
              type="number" step="0.05" min="0.05"
              disabled={!config.hasTraLoiNgan}
              className="w-16 bg-emerald-50 border border-emerald-300 rounded p-1 text-center font-bold text-emerald-800 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              value={examConfig.diemMoiYP3}
              onChange={(e) => updateExamConfig('diemMoiYP3', Number(e.target.value) || 0.25)}
            />
          </div>
        </div>

        <div className="mt-2.5 text-sm font-semibold text-indigo-900 bg-white/60 px-3 py-1.5 rounded-lg border border-indigo-100">
          ⇒ Suy ra: <span className="text-blue-700">Phần I có {computedCounts.soCauP1} câu</span>
          {' · '}
          <span className="text-amber-700">Phần II có {computedCounts.soCauP2} câu (mỗi câu 4 ý, tổng {computedCounts.soYP2} ý)</span>
          {config.hasTraLoiNgan && (
            <>
              {' · '}
              <span className="text-emerald-700">Phần III có {computedCounts.soYP3} ý</span>
            </>
          )}
          {config.hasTuLuan && (
            <>
              {' · '}
              <span className="text-purple-700">Tự luận: {computedCounts.tongYTuLuan} ý (bù 40-30-30)</span>
            </>
          )}
        </div>
      </div>

      {/* [TOÁN 3-2-2-3] BẢNG TÓM TẮT CẤU TRÚC — chỉ hiện khi preset Toán 3-2-2-3 được kích hoạt */}
      {isCauTrucToan3223 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-300 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-extrabold text-purple-900 text-sm flex items-center gap-2">
              <span className="text-base">⚡</span> CẤU TRÚC ĐỀ TOÁN 3-2-2-3 (CHƯƠNG TRÌNH GDPT 2018)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={autoFillMatrix}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-3.5 py-1.5 rounded-lg shadow font-bold text-xs hover:from-purple-700 hover:to-violet-700 hover:shadow-md transition-all"
                title="Tự động phân bổ theo Cấu trúc Toán 3-2-2-3: 12B(P.I) + 2DS(P.II) + 4TLN×0,5đ(P.III) + 3TL(P.IV)"
              >
                <span>⚡</span> Auto-Fill chuẩn Toán 3-2-2-3
              </button>
              <span className="text-xs bg-purple-600 text-white font-black px-2.5 py-1 rounded-lg shadow-sm">
                40%B – 30%H – 30%VD · 90 phút
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-purple-200 text-purple-900">
                  <th className="border border-purple-300 px-2 py-1.5 text-left font-extrabold">Phần</th>
                  <th className="border border-purple-300 px-2 py-1.5 font-extrabold">Hình thức</th>
                  <th className="border border-purple-300 px-2 py-1.5 font-extrabold">Số câu</th>
                  <th className="border border-purple-300 px-2 py-1.5 font-extrabold">Điểm/câu</th>
                  <th className="border border-purple-300 px-2 py-1.5 font-extrabold">Tổng điểm</th>
                  <th className="border border-purple-300 px-2 py-1.5 font-extrabold">Mức độ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white hover:bg-purple-50">
                  <td className="border border-purple-300 px-2 py-1.5 font-bold text-purple-800">P.I</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">Nhiều lựa chọn</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold">12 câu</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">0,25đ</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold text-purple-700">3,0đ (30%)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center text-blue-700">100% Nhận biết</td>
                </tr>
                <tr className="bg-purple-50 hover:bg-purple-100">
                  <td className="border border-purple-300 px-2 py-1.5 font-bold text-purple-800">P.II</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">Đúng/Sai (4 ý/câu)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold">2 câu (8 ý)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">0,25đ/ý</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold text-purple-700">2,0đ (20%)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center text-slate-600">4B + 2H + 2VD</td>
                </tr>
                <tr className="bg-white hover:bg-purple-50">
                  <td className="border border-purple-300 px-2 py-1.5 font-bold text-purple-800">P.III ★</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">Trả lời ngắn</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold">4 câu</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold text-red-600">0,50đ ★</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold text-purple-700">2,0đ (20%)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center text-slate-600">2H + 2VD</td>
                </tr>
                <tr className="bg-purple-50 hover:bg-purple-100">
                  <td className="border border-purple-300 px-2 py-1.5 font-bold text-purple-800">P.IV</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">Tự luận</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold">3 câu</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">1,0đ/câu</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center font-bold text-purple-700">3,0đ (30%)</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center text-slate-600">1H + 1VD + 1VD</td>
                </tr>
                <tr className="bg-purple-200 font-extrabold text-purple-900">
                  <td colSpan={4} className="border border-purple-300 px-2 py-1.5 text-right">Tổng</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">10,0đ</td>
                  <td className="border border-purple-300 px-2 py-1.5 text-center">40B – 30H – 30VD</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-purple-600 mt-2 text-[11px] font-semibold">
            ★ P.III = 0,50đ/câu (khác KHTN 4-2-1-3 là 0,25đ/câu). Tỉ lệ: 40% Biết – 30% Hiểu – 30% Vận dụng.
          </p>
        </div>
      )}

      {/* [KHTN THCS] BANG PHAN BO MA TRAN MUC DO TU DUY */}
      {isKHTN && (
        isCauTrucKHTNVao10 ? (
          /* ================= BẢNG CHUẨN TUYỂN SINH VÀO 10 (QĐ 1038 HẢI PHÒNG) ================= */
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-xl shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
                <span className="text-base">🏆</span> BẢNG PHÂN BỐ MA TRẬN MỨC ĐỘ TƯ DUY — CHUẨN VÀO 10 (QĐ 1038 HẢI PHÒNG)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={autoFillMatrix}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3.5 py-1.5 rounded-lg shadow font-bold text-xs hover:from-indigo-700 hover:to-blue-700 hover:shadow-md transition-all"
                  title="Tự động phân bổ đúng 100% tỉ lệ QĐ 1038 (16B - 12H - 12VD = 10.0đ; 3 câu Đúng/Sai = 12 ý)"
                >
                  <span>⚡</span> Auto-Fill chuẩn QĐ 1038 (10.0đ)
                </button>
                <span className="text-xs bg-indigo-600 text-white font-black px-2.5 py-1 rounded-lg shadow-sm">
                  100% Trắc nghiệm · 60 phút
                </span>
              </div>
            </div>

            {/* CẢNH BÁO TỈ LỆ ĐÚNG/SAI */}
            {(() => {
              const dsHieu = sumAll('dungSai', 'hieu');
              const dsVd = sumAll('dungSai', 'vanDung') + sumAll('dungSai', 'vanDungCao');
              const dsTotalY = dsHieu + dsVd;
              const isDsChuan = dsHieu === 6 && dsVd === 6;

              return isDsChuan ? (
                <div className="mb-2.5 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <span>✓</span>
                  <span>Phần II Đúng/Sai đã đạt chuẩn 100% QĐ 1038 Hải Phòng: <strong>3 câu = 12 ý (6 Hiểu, 6 Vận dụng = 3.0 điểm)</strong>.</span>
                </div>
              ) : (
                <div className="mb-2.5 px-3 py-1.5 bg-amber-100 border border-amber-400 text-amber-900 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <span>
                      Phần II Đúng/Sai chưa đúng tỉ lệ: Hiện có <strong>{dsHieu} ý Hiểu</strong> + <strong>{dsVd} ý Vận dụng</strong> = {dsTotalY} ý ({(dsTotalY * 0.25).toFixed(2).replace('.00', '')}đ).
                      Chuẩn QĐ 1038 yêu cầu đúng <strong>3 câu = 12 ý (6 Hiểu + 6 Vận dụng = 3.0 điểm)</strong>.
                    </span>
                  </div>
                  <button
                    onClick={autoFillMatrix}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[11px] font-bold transition-all shrink-0"
                  >
                    ⚡ Tự động sửa chuẩn Đúng/Sai
                  </button>
                </div>
              );
            })()}

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-indigo-200 bg-white rounded-lg shadow-sm text-center">
                <thead className="bg-indigo-700 text-white font-bold">
                  <tr>
                    <th className="p-2 border border-indigo-600 text-left">Phần bài thi</th>
                    <th className="p-2 border border-indigo-600">Nhận biết (40%)</th>
                    <th className="p-2 border border-indigo-600">Thông hiểu (30%)</th>
                    <th className="p-2 border border-indigo-600">Vận dụng (30%)</th>
                    <th className="p-2 border border-indigo-600">Tổng số câu / ý</th>
                    <th className="p-2 border border-indigo-600">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100 text-slate-700 font-medium">
                  <tr>
                    <td className="p-1.5 text-left font-bold text-indigo-950">Phần I: Trắc nghiệm 4 lựa chọn</td>
                    <td className="p-1.5 bg-blue-50/70 font-bold text-blue-700">16 câu (4.0đ)</td>
                    <td className="p-1.5 bg-emerald-50/70 font-bold text-emerald-700">6 câu (1.5đ)</td>
                    <td className="p-1.5 text-slate-400">0 câu</td>
                    <td className="p-1.5 font-bold">22 câu</td>
                    <td className="p-1.5 font-bold text-indigo-900">5.5 điểm</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 text-left font-bold text-indigo-950">Phần II: Trắc nghiệm Đúng/Sai</td>
                    <td className="p-1.5 text-slate-400">0 ý</td>
                    <td className="p-1.5 bg-emerald-50/70 font-bold text-emerald-700">6 ý (1.5đ)</td>
                    <td className="p-1.5 bg-orange-50/70 font-bold text-orange-700">6 ý (1.5đ)</td>
                    <td className="p-1.5 font-bold text-indigo-800">3 câu (12 ý)</td>
                    <td className="p-1.5 font-bold text-indigo-900">3.0 điểm</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 text-left font-bold text-indigo-950">Phần III: Trắc nghiệm Trả lời ngắn</td>
                    <td className="p-1.5 text-slate-400">0 câu</td>
                    <td className="p-1.5 text-slate-400">0 câu</td>
                    <td className="p-1.5 bg-orange-50/70 font-bold text-orange-700">6 câu (1.5đ)</td>
                    <td className="p-1.5 font-bold">6 câu</td>
                    <td className="p-1.5 font-bold text-indigo-900">1.5 điểm</td>
                  </tr>
                </tbody>
                <tfoot className="bg-indigo-100 font-black text-indigo-950">
                  <tr>
                    <td className="p-2 text-left uppercase">TỔNG CỘNG TOÀN BÀI</td>
                    <td className="p-2 text-blue-800">16 ý = 4.0đ (40%)</td>
                    <td className="p-2 text-emerald-800">12 ý = 3.0đ (30%)</td>
                    <td className="p-2 text-orange-800">12 ý = 3.0đ (30%)</td>
                    <td className="p-2 text-indigo-900">40 ý hỏi</td>
                    <td className="p-2 text-red-600 text-sm">10.0 điểm (100%)</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          /* ================= BẢNG CHUẨN ĐỊNH KÌ CV 4956 (CẤU TRÚC 4-2-1-3) ================= */
          <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-xl shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-extrabold text-teal-900 text-sm flex items-center gap-2">
                <span className="text-base">📋</span> BẢNG PHÂN BỐ MA TRẬN MỨC ĐỘ TƯ DUY — CHUẨN CÔNG VĂN 4956/SGDĐT
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={autoFillMatrix}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-3 py-1.5 rounded-lg shadow font-bold text-xs hover:from-teal-700 hover:to-emerald-700 hover:shadow-md transition-all"
                  title="Tự động chia đúng 100% theo Bảng phân bố ma trận của Sở GD&ĐT"
                >
                  <span>⚡</span> Tự động điền chuẩn CV 4956
                </button>
                <span className="text-xs bg-teal-600 text-white font-black px-2.5 py-1 rounded-lg shadow-sm">
                  Cấu trúc 4 - 2 - 1 - 3
                </span>
              </div>
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
                    <td className="p-1.5 text-left font-bold text-teal-900">Phần II: Trắc nghiệm Đúng/Sai (2 câu)</td>
                    <td className="p-1.5 bg-blue-50/40 font-bold text-blue-800" colSpan="3">
                      2 câu, mỗi câu gồm 4 lệnh hỏi: (02 Biết; 01 Hiểu; 01 Vận dụng) → Tổng: 4 Biết (1.0đ) + 2 Hiểu (0.5đ) + 2 VD (0.5đ)
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

            {/* THÔNG BÁO TIẾN ĐỘ CHẾ ĐỘ CUỐI KÌ 25-75 */}
            {config.isCuoiKi && cuoiKiStats && (
              <div className="mt-3 p-3 bg-white/95 border-2 border-purple-200 rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                    <span className="text-sm">📅</span>
                    <span>Phân bổ Đề Cuối Kì ({config.isCuoiKi === '25-75' ? '25% Trước Giữa Kì — 75% Sau Giữa Kì' : config.isCuoiKi}):</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-full font-bold border ${Math.abs(cuoiKiStats.sumDauPts - cuoiKiStats.targetDau) < 0.05 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                      📘 Nửa đầu: {cuoiKiStats.sumDauPts.toFixed(2).replace('.00', '')} / {cuoiKiStats.targetDau}đ ({(cuoiKiStats.sumDauPts * 10).toFixed(0)}%)
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className={`px-2.5 py-1 rounded-full font-bold border ${Math.abs(cuoiKiStats.sumSauPts - cuoiKiStats.targetSau) < 0.05 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                      📙 Nửa sau: {cuoiKiStats.sumSauPts.toFixed(2).replace('.00', '')} / {cuoiKiStats.targetSau}đ ({(cuoiKiStats.sumSauPts * 10).toFixed(0)}%)
                    </span>
                  </div>
                  {cuoiKiStats.countDauDvs === 0 ? (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      💡 Chưa có bài nào chọn "Nửa đầu" (bấm nút "CĐ: Nửa đầu" ở cột Chủ đề để gán nhanh)
                    </span>
                  ) : cuoiKiStats.isBalanced ? (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Đã chuẩn 100% tỉ lệ
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                      ⚠️ Nửa đầu đang lệch {Math.abs(cuoiKiStats.sumDauPts - cuoiKiStats.targetDau).toFixed(2).replace('.00', '')}đ
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!cuoiKiStats.isBalanced && cuoiKiStats.countDauDvs > 0 && (
                    <button
                      type="button"
                      onClick={autoFillMatrix}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Tự động cân bằng chuẩn 2,5đ Nửa đầu và 7,5đ Nửa sau"
                    >
                      <span>⚡</span> Cân bằng 25% - 75%
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      )}

      <table className="w-full border-collapse border border-slate-400 text-sm">
        <thead className="bg-slate-100 text-center font-semibold">
          <tr>
            <th rowSpan="4" className="border border-slate-400 p-2 w-10">TT</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-28">Chủ đề/Chương</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-72">Nội dung/đơn vị KT</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-20 bg-yellow-50">Số tiết</th>
            <th colSpan={config.hasTuLuan ? (isKHTN ? "13" : "12") : "9"} className="border border-slate-400 p-2">Mức độ đánh giá</th>
            <th colSpan={isKHTN ? "4" : "3"} rowSpan="3" className="border border-slate-400 p-2">{isKHTN ? "Điểm theo mức độ" : "Tổng (Ý)"}</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-16">{isKHTN ? "Tỉ lệ % điểm" : "Tỉ lệ %"}</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-10">Xóa</th>
          </tr>
          <tr>
            <th colSpan="9" className="border border-slate-400 p-1 bg-blue-50">TNKQ</th>
            {config.hasTuLuan && <th colSpan={isKHTN ? "4" : "3"} rowSpan="2" className="border border-slate-400 p-1 bg-green-50">Tự luận</th>}
          </tr>
          <tr>
            <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Nhiều lựa chọn</th>
            <th colSpan="3" className="border border-slate-400 p-1 bg-blue-50/80">Đúng - Sai (Ý)</th>
            <th colSpan="3" className={`border border-slate-400 p-1 ${config.hasTraLoiNgan ? 'bg-blue-50/80' : 'bg-slate-200 text-slate-400'}`}>Trả lời ngắn (Ý)</th>
          </tr>
          <tr>
            <th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">TH</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">VD</th>
            <th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">TH</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">VD</th>
            <th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>B</th><th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>TH</th><th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>VD</th>
            {config.hasTuLuan && (
              <>
                <th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">Biết</th>
                <th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">Hiểu</th>
                <th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">VD</th>
                {isKHTN && <th className="border border-slate-400 p-0 font-medium bg-red-50/50 w-12 text-[10px] text-red-700 font-bold">VDC</th>}
              </>
            )}
            <th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">B</th>
            <th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">TH</th>
            <th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">VD</th>
            {isKHTN && <th className="border border-slate-400 p-1 font-medium bg-red-50 text-red-700 w-8 font-bold">VDC</th>}
          </tr>
        </thead>

        <tbody>
          {buildBodyRows()}
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
                {isKHTN && <td className="border border-slate-400 p-2 text-red-800">{sumAll('tuLuan', 'vanDungCao')}</td>}
              </>
            )}
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('biet')}</td>
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('hieu')}</td>
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('vanDung')}</td>
            {isKHTN && <td className="border border-slate-400 p-2 text-red-700">{getLevelTotalItems('vanDungCao')}</td>}
            <td className="border border-slate-400 p-2"></td><td className="border border-slate-400 p-2"></td>
          </tr>

          <tr className="bg-slate-100">
            <td colSpan="4" className="border border-slate-300 p-2 text-right pr-4 uppercase">Tổng số câu</td>
            <td className="border border-slate-300 p-2">{sumAll('nhieuLuaChon', 'biet') || ''}</td>
            <td className="border border-slate-300 p-2">{sumAll('nhieuLuaChon', 'hieu') || ''}</td>
            <td className="border border-slate-300 p-2">{sumAll('nhieuLuaChon', 'vanDung') || ''}</td>
            <td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('biet')}</td>
            <td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('hieu')}</td>
            <td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('vanDung')}</td>
            <td className={`border border-slate-300 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? (sumAll('traLoiNgan', 'biet') || '') : ''}</td>
            <td className={`border border-slate-300 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? (sumAll('traLoiNgan', 'hieu') || '') : ''}</td>
            <td className={`border border-slate-300 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-50' : 'text-blue-800'}`}>{config.hasTraLoiNgan ? (sumAll('traLoiNgan', 'vanDung') || '') : ''}</td>
            {config.hasTuLuan && (
              <>
                <td className="border border-slate-300 p-2 text-green-800 font-bold text-center" title={fmtTuLuanTooltip('biet')}>{fmtTuLuanCau('biet')}</td>
                <td className="border border-slate-300 p-2 text-green-800 font-bold text-center" title={fmtTuLuanTooltip('hieu')}>{fmtTuLuanCau('hieu')}</td>
                <td className="border border-slate-300 p-2 text-green-800 font-bold text-center" title={fmtTuLuanTooltip('vanDung')}>{fmtTuLuanCau('vanDung')}</td>
                {isKHTN && <td className="border border-slate-300 p-2 text-red-800 font-bold text-center" title={fmtTuLuanTooltip('vanDungCao')}>{fmtTuLuanCau('vanDungCao')}</td>}
              </>
            )}
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('biet')}</td>
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('hieu')}</td>
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('vanDung')}</td>
            {isKHTN && <td className="border border-slate-300 p-2 font-bold text-red-700 text-[11px] whitespace-nowrap">{fmtTongCau('vanDungCao')}</td>}
            <td className="border border-slate-300 p-2 font-black text-slate-800">{grandTotalCau}</td>
            <td className="border border-slate-300 p-2"></td>
          </tr>

          <tr className="bg-slate-300">
            <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng điểm</td>
            <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('nhieuLuaChon')}</td>
            <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>
            <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-200' : ''}`}>{getColumnTotalPoints('traLoiNgan')}</td>
            {config.hasTuLuan && <td colSpan={isKHTN ? "4" : "3"} className="border border-slate-400 p-2 text-red-600">{getColumnTotalPoints('tuLuan')}</td>}
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('biet')}</td>
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('hieu')}</td>
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('vanDung')}</td>
            {isKHTN && <td className="border border-slate-400 p-2 text-red-600 font-black">{getLevelTotalPoints('vanDungCao')}</td>}
            <td className="border border-slate-400 p-2 font-black text-red-600 text-lg">{getGrandTotalPoints()}</td>
            <td className="border border-slate-400 p-2"></td>
          </tr>

          <tr className="bg-slate-200">
            <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tỉ lệ %</td>
            <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-100' : ''}`}>{config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + '%' : '0%'}</td>
            {config.hasTuLuan && <td colSpan={isKHTN ? "4" : "3"} className="border border-slate-400 p-2 text-red-600">{((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '')}%</td>}
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('biet') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('hieu') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('vanDung') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            {isKHTN && <td className="border border-slate-400 p-2 text-red-700 font-bold">{((getLevelTotalPoints('vanDungCao') / 10) * 100).toFixed(1).replace('.0', '')}%</td>}
            <td className="border border-slate-400 p-2 font-black text-green-700">{((getGrandTotalPoints() / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td className="border border-slate-400 p-2"></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={addTopic}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all font-bold"
        >
          <Plus size={18} /> Thêm chủ đề
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all font-bold"
        >
          ⚡ Nhập nhanh ĐVKT
        </button>
      </div>

      {/* MODAL SMART IMPORT */}
      {showSmartImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 flex items-center justify-between text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles size={24} /> 🚀 Nhập Liệu Siêu Tốc
              </h2>
              <button
                onClick={() => setShowSmartImport(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Đóng"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-sm">
                <p className="font-semibold mb-1">Hướng dẫn sử dụng:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Cách 1 (Excel/Word):</strong> Copy bảng có 4 cột: <i>Tên Chủ đề | Tên Bài/ĐVKT | Số tiết | Yêu cầu cần đạt</i> và dán vào ô bên dưới. (Nếu ô Tên Bài trống, máy sẽ hiểu dòng đó chỉ tạo Chủ đề).</li>
                  <li><strong>Cách 2 (AI):</strong> Nhập văn bản thô bất kỳ, bấm "Nhờ AI bóc tách", dán vào ChatGPT/Gemini để lấy JSON, sau đó dán JSON trả về vào đây và xử lý.</li>
                </ul>
              </div>

              <textarea
                className="w-full flex-1 min-h-[300px] p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-teal-500 font-mono text-sm leading-relaxed resize-none bg-slate-50"
                placeholder="Dán dữ liệu Excel (Tab-separated) hoặc mã JSON vào đây..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />

              <div className="flex flex-wrap items-center gap-4 justify-end mt-2">
                <button
                  onClick={() => {
                    const prompt = `Tôi có đoạn văn bản nội dung môn học dưới đây.\nHãy bóc tách và trả về mảng JSON đúng định dạng sau, tuyệt đối không giải thích thêm:
[
  {
    "tenChuDe": "Tên chủ đề 1",
    "donViKienThuc": [
      {
        "noiDung": "Tên bài/ĐVKT 1",
        "soTiet": 2,
        "yeuCauCanDat": "Nội dung yccd..."
      }
    ]
  }
]\n\nNội dung cần bóc tách:\n${importText}`;
                    navigator.clipboard.writeText(prompt);
                    alert("Đã copy lệnh (Prompt) cùng nội dung hiện tại vào Clipboard!\nHãy dán vào ChatGPT/Gemini để lấy JSON.");
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Bot size={18} /> 🤖 Nhờ AI bóc tách văn bản thô
                </button>

                <button
                  onClick={() => {
                    if (!importText.trim()) {
                      alert("Vui lòng nhập dữ liệu!");
                      return;
                    }
                    smartImportData(importText);
                    setImportText('');
                    setShowSmartImport(false);
                    alert("Đã nhập dữ liệu thành công!");
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
                >
                  <FileSpreadsheet size={18} /> ⚡ Xử lý dữ liệu (Excel / JSON)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL NHẬP NHANH ĐVKT TỪ EXCEL/WORD */}
      {showImportModal && (() => {
        const targetTopic = importTargetTopicId ? matrix.find(t => t.id === importTargetTopicId) : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  ⚡ {targetTopic ? `Dán nhanh bài học vào: "${targetTopic.tenChuDe || 'Chủ đề đã chọn'}"` : 'Nhập nhanh Nội dung & Số tiết từ Excel/Word'}
                </h2>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportTextFast('');
                    setImportTargetTopicId(null);
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  title="Đóng"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
                {targetTopic ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 font-medium">
                    🎯 Đang dán bài học vào: <span className="font-bold text-blue-800">{targetTopic.tenChuDe || 'Chủ đề'}</span>
                    <p className="text-xs text-blue-700 mt-1">Dữ liệu bài học bạn dán bên dưới sẽ được thêm trực tiếp vào đúng chủ đề này (không bị lẫn sang chủ đề khác).</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">
                    💡 Hướng dẫn: Copy 2 cột (Tên Bài học và Số tiết) từ bảng Excel/Word và dán vào ô bên dưới.
                  </p>
                )}

                <textarea
                  value={importTextFast}
                  onChange={(e) => setImportTextFast(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text/plain');
                    setImportTextFast(prev => prev + pastedData);
                  }}
                  rows={10}
                  className="w-full border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-blue-500 font-mono text-sm leading-relaxed resize-none bg-slate-50"
                  placeholder={`Ví dụ dán vào:\nBài 18. Nam châm \t 1\nBài 19. Từ trường \t 4`}
                />

                <div className="flex justify-end items-center gap-4 mt-2">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportTextFast('');
                      setImportTargetTopicId(null);
                    }}
                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (!importTextFast.trim()) {
                        alert("Vui lòng nhập dữ liệu!");
                        return;
                      }
                      if (importTargetTopicId) {
                        importDonVisToTopic(importTargetTopicId, importTextFast);
                      } else {
                        smartImportData(importTextFast);
                      }
                      setShowImportModal(false);
                      setImportTextFast('');
                      setImportTargetTopicId(null);
                      alert("Đã nhập dữ liệu thành công!");
                    }}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:shadow-lg hover:bg-blue-700 transition-all"
                  >
                    Xác nhận Nhập
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ MODAL CẤU HÌNH TỰ LUẬN ============ */}
      {showTuLuanModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Settings2 className="text-green-600" size={24} />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Cấu hình Tự luận</h3>
                  <p className="text-xs text-slate-500">Thiết lập số câu, số ý và điểm mỗi ý tự luận trước khi Auto-Fill</p>
                </div>
              </div>
              <button
                onClick={() => setShowTuLuanModal(false)}
                className="p-1 hover:bg-white/60 rounded-full transition-colors"
                title="Đóng"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
              {/* Toggle bật/tắt chế độ cấu hình */}
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                <div>
                  <p className="font-bold text-green-900 text-sm">🔧 Chế độ cấu hình tự do</p>
                  <p className="text-xs text-green-700 mt-0.5">Bật để tự định nghĩa số câu, số ý, điểm mỗi ý. Tắt để hệ thống tự động phân bổ khi Auto-Fill.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={tuLuanConfig.enabled}
                    onChange={(e) => setTuLuanConfig({ enabled: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                <p className="font-semibold">ℹ️ Phân bổ mức độ nhận thức tự động</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Khi Auto-Fill, hệ thống <strong>tự động phát hiện</strong> và sử dụng cấu hình thủ công nếu bạn đã thiết lập số câu/ý. Nếu chưa có cấu hình, hệ thống sẽ phân bổ theo tỉ lệ: <strong>40% Biết · 30% Hiểu · 30% Vận dụng</strong>.
                </p>
              </div>

              {/* Danh sách câu hỏi tự luận */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-700 text-sm">📝 Cấu trúc câu hỏi tự luận</h4>
                  <button
                    onClick={() => {
                      const newQ = {
                        id: `tl_q${Date.now()}`,
                        label: `Câu ${tuLuanConfig.questions.length + 1}`,
                        kienThuc: '',
                        subItems: [{ diem: 0.5 }]
                      };
                      setTuLuanConfig({ questions: [...tuLuanConfig.questions, newQ] });
                    }}
                    className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-800 font-semibold border border-dashed border-green-300 rounded-lg px-2 py-1 hover:bg-green-50 transition-colors"
                  >
                    <PlusCircle size={12} /> Thêm câu
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {tuLuanConfig.questions.map((q, qIdx) => {
                    const totalQDiem = q.subItems.reduce((s, sub) => s + (Number(sub.diem) || 0), 0);
                    return (
                      <div key={q.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            className="font-bold text-sm bg-transparent border-b border-slate-300 focus:border-green-400 outline-none px-1 py-0.5 w-32"
                            value={q.label}
                            onChange={(e) => {
                              const updated = [...tuLuanConfig.questions];
                              updated[qIdx] = { ...updated[qIdx], label: e.target.value };
                              setTuLuanConfig({ questions: updated });
                            }}
                          />
                          <div className="flex items-center gap-2">
                            {q.subItems.length > 1 && (
                              <div className="flex rounded overflow-hidden border border-slate-200 text-[10px] font-semibold">
                                <button
                                  onClick={() => {
                                    const updated = [...tuLuanConfig.questions];
                                    updated[qIdx] = { ...updated[qIdx], kieuY: 'chung' };
                                    setTuLuanConfig({ questions: updated });
                                  }}
                                  className={`px-1.5 py-0.5 transition-colors ${(q.kieuY || 'chung') === 'chung' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                  title="Các ý xoay quanh 1 đề bài chung"
                                >Chung đề</button>
                                <button
                                  onClick={() => {
                                    const updated = [...tuLuanConfig.questions];
                                    updated[qIdx] = { ...updated[qIdx], kieuY: 'doc_lap' };
                                    setTuLuanConfig({ questions: updated });
                                  }}
                                  className={`px-1.5 py-0.5 transition-colors ${q.kieuY === 'doc_lap' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                  title="Các ý là câu hỏi riêng biệt, không liên quan nhau"
                                >Độc lập</button>
                              </div>
                            )}
                            <span className="text-[11px] text-slate-500 font-semibold">
                              {q.subItems.length} ý · {totalQDiem.toFixed(2).replace('.00', '')}đ
                            </span>
                            <button
                              onClick={() => {
                                const updated = tuLuanConfig.questions.filter(qq => qq.id !== q.id);
                                setTuLuanConfig({ questions: updated });
                              }}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Xóa câu này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Phạm vi phân bổ ý */}
                        {(q.subItems?.length > 1) && (
                          <div className="flex flex-col gap-1 mt-1 mb-1">
                            <span className="text-[10px] text-slate-500 font-semibold">📦 Phạm vi ý:</span>
                            <div className="flex flex-wrap gap-1">
                              {(q.kieuY === 'doc_lap' ? [
                                { value: 'cung_bai',             label: 'Cùng 1 bài' },
                                { value: 'cac_bai_cung_chu_de',  label: 'Các bài cùng CĐ' },
                                { value: 'cac_chu_de_khac_nhau', label: 'Các chủ đề khác' },
                              ] : [
                                { value: 'cung_dvkt',            label: 'Cùng 1 ĐVKT' },
                                { value: 'cac_dvkt_cung_chu_de', label: 'Các ĐVKT cùng CĐ' },
                              ]).map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    const updated = [...tuLuanConfig.questions];
                                    updated[qIdx] = { ...updated[qIdx], phamVi: opt.value };
                                    setTuLuanConfig({ questions: updated });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                    (q.phamVi || (q.kieuY === 'doc_lap' ? 'cung_bai' : 'cung_dvkt')) === opt.value
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Chọn kiến thức Toán — chỉ hiện khi môn Toán */}
                        {isMath && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] text-slate-500 font-semibold shrink-0">Kiến thức:</span>
                            <div className="flex rounded overflow-hidden border border-slate-200 text-[10px] font-semibold">
                              <button
                                onClick={() => {
                                  const updated = [...tuLuanConfig.questions];
                                  updated[qIdx] = { ...updated[qIdx], kienThuc: '' };
                                  setTuLuanConfig({ questions: updated });
                                }}
                                className={`px-2 py-0.5 transition-colors ${!q.kienThuc ? 'bg-slate-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                                title="Chưa chọn loại kiến thức"
                              >Chung</button>
                              <button
                                onClick={() => {
                                  const updated = [...tuLuanConfig.questions];
                                  updated[qIdx] = { ...updated[qIdx], kienThuc: 'hinh_hoc' };
                                  setTuLuanConfig({ questions: updated });
                                }}
                                className={`px-2 py-0.5 transition-colors ${q.kienThuc === 'hinh_hoc' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                                title="Câu hỏi thuộc lĩnh vực Hình học"
                              >📐 Hình học</button>
                              <button
                                onClick={() => {
                                  const updated = [...tuLuanConfig.questions];
                                  updated[qIdx] = { ...updated[qIdx], kienThuc: 'dai_so' };
                                  setTuLuanConfig({ questions: updated });
                                }}
                                className={`px-2 py-0.5 transition-colors ${q.kienThuc === 'dai_so' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                                title="Câu hỏi thuộc lĩnh vực Đại số / Giải tích"
                              >∑ Đại số</button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          {q.subItems.map((sub, subIdx) => (
                            <div key={sub.id || subIdx} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0 text-center">{String.fromCharCode(97 + subIdx)}.</span>
                              <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Ý {subIdx + 1}</span>
                              <input
                                type="number"
                                min="0.25"
                                step="0.25"
                                className="w-16 text-[11px] font-bold text-red-700 text-center outline-none bg-white border border-slate-200 rounded px-1 py-0.5"
                                value={sub.diem || ''}
                                onChange={(e) => {
                                  const updated = [...tuLuanConfig.questions];
                                  updated[qIdx].subItems[subIdx].diem = Number(e.target.value) || 0;
                                  setTuLuanConfig({ questions: updated });
                                }}
                                title="Điểm ý này"
                              />
                              <button
                                onClick={() => {
                                  const updated = [...tuLuanConfig.questions];
                                  updated[qIdx].subItems = updated[qIdx].subItems.filter((_, i) => i !== subIdx);
                                  if (updated[qIdx].subItems.length === 0) {
                                    updated[qIdx].subItems = [{ diem: 0.5 }];
                                  }
                                  setTuLuanConfig({ questions: updated });
                                }}
                                className="text-red-400 hover:text-red-600 p-0.5 shrink-0"
                                title="Xóa ý này"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const updated = [...tuLuanConfig.questions];
                              updated[qIdx].subItems.push({ diem: 0.5 });
                              setTuLuanConfig({ questions: updated });
                            }}
                            className="flex items-center justify-center gap-1 text-[10px] text-green-600 hover:text-green-800 font-semibold border border-dashed border-green-200 rounded py-0.5 hover:bg-green-50/50 transition-colors w-full"
                          >
                            <PlusCircle size={10} /> Thêm ý
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tổng kết */}
              {(() => {
                const totalAllDiem = tuLuanConfig.questions.reduce((s, q) => s + q.subItems.reduce((s2, sub) => s2 + (Number(sub.diem) || 0), 0), 0);
                const totalAllY = tuLuanConfig.questions.reduce((s, q) => s + q.subItems.length, 0);
                const isKHTN = examConfig.subject === 'khtn' || examConfig.isCauTruc4213;
                const targetDiem = isKHTN ? 3.0 : 4.0;
                const matchDiem = Math.abs(totalAllDiem - targetDiem) < 0.01;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-amber-800">
                      Tổng cộng: {tuLuanConfig.questions.length} câu · {totalAllY} ý · {totalAllDiem.toFixed(2).replace('.00', '')}đ
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {matchDiem
                        ? '✅ Khớp với cấu trúc 3 câu - 3.0đ Tự luận'
                        : `⚠️ Lệch so với ${targetDiem}đ Tự luận (chênh ${Math.abs(totalAllDiem - targetDiem).toFixed(2)}đ)`}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setTuLuanConfig({
                    enabled: false,
                    questions: [
                      { id: 'tl_q1', label: 'Câu 1', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
                      { id: 'tl_q2', label: 'Câu 2', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_bai_cung_chu_de',  subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
                      { id: 'tl_q3', label: 'Câu 3', kienThuc: '', kieuY: 'doc_lap', phamVi: 'cac_chu_de_khac_nhau', subItems: [{ diem: 1.0 }] },
                    ],
                  });
                }}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Khôi phục mặc định
              </button>
              <button
                onClick={() => {
                  setTuLuanConfig({ enabled: true });
                  setShowTuLuanModal(false);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-md transition-all"
              >
                Đóng & Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL CẤU HÌNH ĐÚNG/SAI ============ */}
      <DungSaiConfigModal
        show={showDungSaiModal}
        onClose={() => setShowDungSaiModal(false)}
        matrix={matrix}
        dungSaiConfig={dungSaiConfig}
        setDungSaiConfig={setDungSaiConfig}
        isKHTN={isKHTN}
      />

      {/* Modal Chọn Năng lực chỉ báo */}
      {indicatorModal.show && compGroups && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="text-indigo-600" />
                Chọn Năng lực & Chỉ báo
              </h3>
              <button onClick={() => setIndicatorModal({ show: false, topicId: null, dvId: null, selected: [] })} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="px-4 pt-4 pb-2 bg-slate-50 flex justify-end gap-2 border-b border-slate-200">
              <button
                onClick={() => {
                  const allCodes = [];
                  Object.values(compGroups).forEach(group => group.indicators.forEach(ind => allCodes.push(ind.code)));
                  setIndicatorModal(prev => ({ ...prev, selected: Array.from(new Set([...prev.selected, ...allCodes])) }));
                }}
                className="px-3 py-1.5 text-sm font-bold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors shadow-sm"
              >
                Chọn tất cả
              </button>
              <button
                onClick={() => setIndicatorModal(prev => ({ ...prev, selected: [] }))}
                className="px-3 py-1.5 text-sm font-bold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shadow-sm bg-white"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="flex flex-col gap-4">
                {Object.entries(compGroups).map(([groupKey, group]) => (
                  <div key={groupKey} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className={`text-md font-bold mb-3 flex items-center gap-2 text-${group.color}-700`}>
                      <span className={`px-2 py-0.5 rounded text-sm bg-${group.color}-100`}>{groupKey}</span>
                      {group.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.indicators.map((ind) => {
                        const isSelected = indicatorModal.selected.includes(ind.code);
                        return (
                          <label 
                            key={ind.code} 
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                          >
                            <input 
                              type="checkbox" 
                              className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelected = e.target.checked 
                                  ? [...indicatorModal.selected, ind.code] 
                                  : indicatorModal.selected.filter(c => c !== ind.code);
                                setIndicatorModal(prev => ({ ...prev, selected: newSelected }));
                              }}
                            />
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{ind.code}</span>
                              <span className="text-xs text-slate-500">{ind.content}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-white">
              <div className="text-sm font-medium text-slate-600">
                Đã chọn: <span className="font-bold text-indigo-600">{indicatorModal.selected.length}</span> chỉ báo
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIndicatorModal({ show: false, topicId: null, dvId: null, selected: [] })}
                  className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    updateDvIndicators(indicatorModal.topicId, indicatorModal.dvId, indicatorModal.selected);
                    setIndicatorModal({ show: false, topicId: null, dvId: null, selected: [] });
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                >
                  Xác nhận & Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ [MOI] MODAL CHON LOP CT TOAN 2018 ============ */}
      {ct2018Dialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">📚</span>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Gợi ý YCCĐ chuẩn CT Toán 2018</h3>
                <p className="text-sm text-slate-500">Chọn lớp để lấy đúng yêu cầu cần đạt</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Lớp <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-7 gap-2">
                {[6, 7, 8, 9, 10, 11, 12].map(l => (
                  <button
                    key={l}
                    onClick={() => setCt2018Dialog(prev => ({ ...prev, lop: l }))}
                    className={`py-3 rounded-xl font-bold text-base transition-all border-2 ${
                      ct2018Dialog.lop === l
                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg scale-105'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-800">
              <strong>Lưu ý:</strong> Chỉ những ô YCCĐ còn trống mới được điền tự động.
              Ô đã có nội dung sẽ không bị ghi đè.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCt2018Dialog({ show: false, lop: 8 })}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const lopChon = ct2018Dialog.lop;
                  applyCtToan2018(lopChon);
                  setCt2018Dialog({ show: false, lop: lopChon });
                }}
                className="flex-2 flex-grow py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600 shadow-lg transition-all"
              >
                📚 Áp dụng cho Lớp {ct2018Dialog.lop}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ [MOI] MODAL KET QUA CT TOAN 2018 ============ */}
      {ct2018LastResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Kết quả gợi ý YCCĐ Lớp {ct2018LastResult.lop}</h3>
                  <p className="text-sm text-slate-500">Đã áp dụng CT Toán 2018 vào các ĐVKT còn trống</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {ct2018LastResult.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  <strong className="block mb-1">Lỗi:</strong>
                  {ct2018LastResult.error}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="text-3xl font-black text-green-600 mb-1">{ct2018LastResult.updatedCount}</div>
                      <div className="text-sm font-semibold text-green-800">ĐVKT được cập nhật</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="text-3xl font-black text-slate-600 mb-1">{ct2018LastResult.skipped?.length || 0}</div>
                      <div className="text-sm font-semibold text-slate-700">ĐVKT không khớp CT2018</div>
                    </div>
                  </div>

                  {/* Chi tiet Khop */}
                  {ct2018LastResult.filled?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Đã khớp và điền YCCĐ ({ct2018LastResult.filled.length})
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto text-sm border border-slate-200">
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          {ct2018LastResult.filled.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Chi tiet Khong khop */}
                  {ct2018LastResult.skipped?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Không tìm thấy trong CT2018 ({ct2018LastResult.skipped.length})
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto text-sm border border-slate-200">
                        <ul className="space-y-1 text-slate-500 list-disc list-inside">
                          {ct2018LastResult.skipped.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Canh bao (neu co) */}
                  {ct2018LastResult.warnings?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-amber-600 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cảnh báo & Placeholder ({ct2018LastResult.warnings.length})
                      </h4>
                      <div className="bg-amber-50 rounded-lg p-3 max-h-40 overflow-y-auto text-sm border border-amber-200">
                        <ul className="space-y-1 text-amber-800 list-disc list-inside">
                          {ct2018LastResult.warnings.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-200">
                    <strong>Mẹo:</strong> Hãy chuyển sang Tab "Bảng Đặc Tả" (Step 3) để xem và chỉnh sửa các YCCĐ vừa được điền. Những ô có chữ <code>[Giao vien tu dien...]</code> cần bạn bổ sung nội dung thủ công.
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={clearCt2018Result}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 shadow-md transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}