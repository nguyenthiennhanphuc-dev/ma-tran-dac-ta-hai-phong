import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useExamStore, getTopicSum, getTopicTuLuanDiem, getTotalSoTiet } from '../store/useExamStore';
import { Plus, Trash2, Settings2, Sparkles, PlusCircle, X, Bot, FileSpreadsheet, ClipboardList } from 'lucide-react';
import { searchIndicators, chemistryCompetencyGroups } from './data/chemistryIndicators';
import { searchMathIndicators, mathCompetencyGroups } from './data/mathIndicators';

// Component Autocomplete dùng chung cho mọi môn
const SubjectAutocomplete = ({ value, onChange, placeholder, isMath, isChemistry }) => {
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
    return [];
  }, [searchText, isMath, isChemistry]);

  const handleChange = (e) => {
    setSearchText(e.target.value);
    onChange(e.target.value);
    setShowDropdown(true);
  };

  const handleSelect = (item) => {
    const newVal = `[${item.code}] ${item.content}`;
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
  const { matrix, config, examConfig, examHeader, addTopic, removeTopic, updateTopicText, updateConfig, updateExamConfig, autoFillMatrix, updateDonViPhase, addDonVi, removeDonVi, updateDonVi, updateDvQuestionCount, updateDvTuLuanPoint, addTuLuanSubItem, removeTuLuanSubItem, updateTuLuanSubItem, smartImportData, importDonVisToTopic, toggleTuLuan, toggleTraLoiNgan, setCauTrucDe, tuLuanConfig, setTuLuanConfig, updateDvIndicators } = useExamStore();
  const isChemistry = /hóa|hoá/i.test(examHeader?.monHoc || '');
  const isMath = /toán|toan|đại số|hình học|giải tích/i.test(examHeader?.monHoc || '');
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTextFast, setImportTextFast] = useState('');
  const [showTuLuanModal, setShowTuLuanModal] = useState(false);
  const [importTargetTopicId, setImportTargetTopicId] = useState(null);
  const [indicatorModal, setIndicatorModal] = useState({ show: false, topicId: null, dvId: null, selected: [] });

  // Nguồn dữ liệu nhóm năng lực tùy theo môn
  const compGroups = isMath ? mathCompetencyGroups : (isChemistry ? chemistryCompetencyGroups : null);

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
    if (level === 'vanDung') dsCount += sumAll('dungSai', 'vanDungCao');
    return sumAll('nhieuLuaChon', level) +
      (dsCount * 0.25) +
      (config.hasTraLoiNgan ? sumAll('traLoiNgan', level) : 0) +
      sumAll('tuLuan', level);
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

  const getLevelTotalPoints = (level) => {
    const tlKey = level === 'biet' ? 'diemBiet' : level === 'hieu' ? 'diemHieu' : 'diemVanDung';
    const raw = matrix.reduce((sum, topic) => {
      let dsCount = getTopicSum(topic, 'dungSai', level);
      // VDC hiểu ngầm → gộp điểm VDC vào cột VD
      if (level === 'vanDung') dsCount += getTopicSum(topic, 'dungSai', 'vanDungCao');
      return sum +
        getTopicSum(topic, 'nhieuLuaChon', level) * examConfig.diemMoiCauP1 +
        dsCount * examConfig.diemMoiYP2 +
        (config.hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) * examConfig.diemMoiYP3 : 0) +
        getTopicTuLuanDiem(topic, tlKey);
    }, 0);
    return Math.round(raw * 100) / 100;
  };

  const getGrandTotalPoints = () => getLevelTotalPoints('biet') + getLevelTotalPoints('hieu') + getLevelTotalPoints('vanDung');

  const getTopicSoTiet = (topic) => getTotalSoTiet(topic);

  // Helper: Format tổng per ĐVKT dạng "1c+ 2 ý" (phân biệt NLC = câu, ĐS/TLN/TL = ý)
  // Tự luận được tách riêng, không cộng vào tổng ý
  const formatDvLevelSummary = (dv, level) => {
    const nlc = Number(dv.nhieuLuaChon?.[level]) || 0;
    const ds = Number(dv.dungSai?.[level]) || 0;
    const tln = config.hasTraLoiNgan ? (Number(dv.traLoiNgan?.[level]) || 0) : 0;
    const totalCau = nlc;
    const totalY = ds + tln;
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
                    <span className="text-[9px] text-slate-400 font-bold">{String.fromCharCode(97 + subIdx)}.</span>
                    {qLabel && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-black">{qLabel}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-red-700">{sub.diem ? sub.diem.toFixed(2).replace('.00', '').replace('.50', ',5') : '0'}đ</span>
                    <button onClick={() => removeTuLuanSubItem(topicId, dvId, sub.id)} className="text-red-300 hover:text-red-600 p-0.5 shrink-0" title="Xóa ý này">
                      <X size={9} />
                    </button>
                  </div>
                </div>
                {indCode && (
                  <div className="text-[8px] leading-[10px] font-extrabold text-indigo-600 mt-0.5">({indCode})</div>
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
    const tl = (Number(dv.tuLuan?.diemBiet) || 0) + (Number(dv.tuLuan?.diemHieu) || 0) + (Number(dv.tuLuan?.diemVanDung) || 0);
    return Math.round((nlc + ds + tln + tl) * 100) / 100;
  };

  // Format tổng ĐS cho dòng "Tổng số câu": "1,5 (6 ý)"
  const fmtDsCau = (level) => {
    let y = sumAll('dungSai', level);
    if (level === 'vanDung') y += sumAll('dungSai', 'vanDungCao');
    if (y === 0) return '';
    const cau = y * 0.25;
    const cauStr = cau % 1 === 0 ? String(cau) : cau.toFixed(1).replace('.', ',');
    return `${cauStr} (${y} ý)`;
  };

  // Format tổng câu cho dòng "Tổng số câu": "6c+ 6 ý"
  const fmtTongCau = (level) => {
    const c = sumAll('nhieuLuaChon', level);
    const y = sumAll('dungSai', level) +
      (config.hasTraLoiNgan ? sumAll('traLoiNgan', level) : 0) +
      (config.hasTuLuan ? sumAll('tuLuan', level) : 0);
    if (c === 0 && y === 0) return '';
    if (c > 0 && y === 0) return `${c}`;
    if (c === 0 && y > 0) return `${y} ý`;
    return `${c}c+ ${y} ý`;
  };

  // Grand total câu quy đổi
  const grandTotalCau = getLevelTotalQuestions('biet') + getLevelTotalQuestions('hieu') + getLevelTotalQuestions('vanDung');

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
             {mappings.length > 0 && (
               <div className="flex flex-wrap justify-center gap-[2px] mt-1">
                 {mappings.map((m, idx) => {
                   const qLabel = typeof m === 'object' ? m.label : '';
                   const indCode = typeof m === 'object' ? m.code : m;
                   return (
                     <div key={idx} className="flex flex-col items-center bg-slate-100 border border-slate-200 rounded px-0.5 py-0.5 min-w-[24px]">
                       {qLabel && <span className="text-[8px] font-black text-blue-700 leading-none">{qLabel}</span>}
                       {indCode && <span className="text-[7.5px] font-extrabold text-indigo-600 leading-none mt-0.5">{indCode}</span>}
                     </div>
                   );
                 })}
               </div>
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
    const tongDiem = ec.tongDiem || 10.0;
    const tiLe = ec.tiLeNhanThuc;
    const weights = [tiLe.biet, tiLe.hieu, tiLe.vanDung];

    // TNKQ
    const soCauP1 = ec.diemMoiCauP1 > 0 ? Math.round(ec.tongDiemP1 / ec.diemMoiCauP1) : 0;
    let soYP2Raw = ec.diemMoiYP2 > 0 ? Math.round(ec.tongDiemP2 / ec.diemMoiYP2) : 0;
    const soYP2 = Math.ceil(soYP2Raw / 4) * 4;
    const soCauP2 = soYP2 / 4;
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
              </td>
            )}

            {/* CỘT ĐVKT — Mỗi ĐVKT 1 ô riêng */}
            <td className="border border-slate-300 p-1 align-top">
              <div className="flex items-start gap-1 group">
                <span className="text-[10px] text-slate-400 font-bold mt-1.5 shrink-0">{dvIdx + 1}.</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  {(isChemistry || isMath) ? (
                    <SubjectAutocomplete
                      placeholder={`ĐVKT ${dvIdx + 1}...`}
                      value={dv.noiDung}
                      onChange={(newVal) => updateDonVi(topic.id, dv.id, 'noiDung', newVal)}
                      isMath={isMath}
                      isChemistry={isChemistry}
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
                    {dvCount > 1 && (
                      <button onClick={() => removeDonVi(topic.id, dv.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5" title="Xóa ĐVKT">
                        <X size={12} />
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
                <button onClick={() => addDonVi(topic.id)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors w-full justify-center py-0.5 border border-dashed border-blue-200 rounded hover:border-blue-400 mt-1" title="Thêm ĐVKT">
                  <PlusCircle size={11} /> Thêm ĐVKT
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
              </>
            )}

            {/* CỘT TỔNG — TÍNH RIÊNG TẮNG ĐVKT ("1c+ 2 ý") */}
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'biet')}</td>
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'hieu')}</td>
            <td className="border border-slate-300 p-2 text-center font-bold bg-orange-50/50 text-[11px] whitespace-nowrap">{formatDvLevelSummary(dv, 'vanDung')}</td>

            {/* CỘT TỈ LỆ — HIỂN THỊ RIÊNG CHO TỪNG BÀI */}
            <td className="border border-slate-300 p-2 text-center font-bold text-blue-700 bg-slate-50/50">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm">{dvPercent}%</span>
                <span className="text-[10px] text-slate-400 font-normal italic">MT: {dvTargetPercentStr}%</span>
              </div>
            </td>

            {/* CỘT XÓA — rowSpan */}
            {isFirst && (
              <td rowSpan={dvCount} className="border border-slate-300 p-2 text-center align-top">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setImportTargetTopicId(topic.id);
                      setShowImportModal(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-bold text-[10px] hover:bg-blue-100 transition-all border border-blue-200"
                    title="Dán danh sách bài học vào chủ đề này"
                  >
                    <FileSpreadsheet size={12} />
                    ⚡ Dán nhanh bài học
                  </button>
                  <button onClick={() => removeTopic(topic.id)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Xóa Chủ đề">
                    <Trash2 size={18} />
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
              value={String(examConfig.tongDiemP1 || 3)}
              title="Chọn cấu trúc phân bổ điểm cho 100% TNKQ"
            >
              <option value="3">Cấu trúc 3-4-3 (Mặc định)</option>
              <option value="3.5">Cấu trúc 3.5-4-2.5</option>
              <option value="4">Cấu trúc 4-6-0 (Toán 100% TN)</option>
              <option value="4.5">Cấu trúc 4.5-4-1.5</option>
              <option value="5.5">Cấu trúc 5.5-3-1.5</option>
            </select>
          ) : (
            // Dropdown cho Trắc nghiệm + Tự luận
            <select
              className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold py-1.5 px-3 rounded-lg outline-none focus:border-emerald-400"
              onChange={(e) => setCauTrucDe(e.target.value)}
              value={String(examConfig.tongDiemP1 || 3)}
              title="Chọn cấu trúc phân bổ điểm TNKQ (phần Tự luận tự động bù)"
            >
              <option value="3">TNKQ: 3-2-2 → Tự luận: 3đ</option>
              <option value="3.5">TNKQ: 3.5-2-1.5 → Tự luận: 3đ</option>
              <option value="4">Toán: 4-2-0 → Tự luận: 4đ (16 TN + 2 ĐS)</option>
            </select>
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
              <option value="30-70">Cuối Kì 30% - 70%</option>
              <option value="25-75">Cuối Kì 25% - 75%</option>
              <option value="20-80">Cuối Kì 20% - 80%</option>
              <option value="2.25-7.75">Cuối Kì 2,25đ - 7,75đ (22,5%-77,5%)</option>
            </select>
          </div>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          {/* TOGGLE GOM NHÓM ĐÚNG/SAI THEO CHỦ ĐỀ */}
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

      <table className="w-full border-collapse border border-slate-400 text-sm">
        <thead className="bg-slate-100 text-center font-semibold">
          <tr>
            <th rowSpan="4" className="border border-slate-400 p-2 w-10">TT</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-28">Chủ đề/Chương</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-72">Nội dung/đơn vị KT</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-20 bg-yellow-50">Số tiết</th>
            <th colSpan={config.hasTuLuan ? "12" : "9"} className="border border-slate-400 p-2">Mức độ đánh giá</th>
            <th colSpan="3" rowSpan="3" className="border border-slate-400 p-2">Tổng (Ý)</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-16">Tỉ lệ %</th>
            <th rowSpan="4" className="border border-slate-400 p-2 w-10">Xóa</th>
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
            <th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">VD</th>
            <th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">VD</th>
            <th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>B</th><th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>H</th><th className={`border border-slate-400 p-1 font-medium w-8 ${config.hasTraLoiNgan ? 'bg-blue-50/30' : 'bg-slate-100 text-slate-400'}`}>VD</th>
            {config.hasTuLuan && (
              <>
                <th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">Biết</th><th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">Hiểu</th><th className="border border-slate-400 p-0 font-medium bg-green-50/30 w-12 text-[10px]">VD</th>
              </>
            )}
            <th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">H</th><th className="border border-slate-400 p-1 font-medium bg-orange-50 w-8">VD</th>
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
              </>
            )}
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('biet')}</td>
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('hieu')}</td>
            <td className="border border-slate-400 p-2 text-orange-700">{getLevelTotalItems('vanDung')}</td>
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
                <td className="border border-slate-300 p-2 text-green-800">{sumAll('tuLuan', 'biet') || ''}</td>
                <td className="border border-slate-300 p-2 text-green-800">{sumAll('tuLuan', 'hieu') || ''}</td>
                <td className="border border-slate-300 p-2 text-green-800">{sumAll('tuLuan', 'vanDung') || ''}</td>
              </>
            )}
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('biet')}</td>
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('hieu')}</td>
            <td className="border border-slate-300 p-2 font-bold text-slate-700 text-[11px] whitespace-nowrap">{fmtTongCau('vanDung')}</td>
            <td className="border border-slate-300 p-2 font-black text-slate-800">{grandTotalCau}</td>
            <td className="border border-slate-300 p-2"></td>
          </tr>

          <tr className="bg-slate-300">
            <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tổng điểm</td>
            <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('nhieuLuaChon')}</td>
            <td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>
            <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-200' : ''}`}>{getColumnTotalPoints('traLoiNgan')}</td>
            {config.hasTuLuan && <td colSpan="3" className="border border-slate-400 p-2 text-red-600">{getColumnTotalPoints('tuLuan')}</td>}
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('biet')}</td>
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('hieu')}</td>
            <td className="border border-slate-400 p-2 text-red-600">{getLevelTotalPoints('vanDung')}</td>
            <td className="border border-slate-400 p-2 font-black text-red-600 text-lg">{getGrandTotalPoints()}</td>
            <td className="border border-slate-400 p-2"></td>
          </tr>

          <tr className="bg-slate-200">
            <td colSpan="4" className="border border-slate-400 p-2 text-right pr-4 uppercase">Tỉ lệ %</td>
            <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('nhieuLuaChon') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td colSpan="3" className={`border border-slate-400 p-2 ${!config.hasTraLoiNgan ? 'text-slate-400 bg-slate-100' : ''}`}>{config.hasTraLoiNgan ? ((getColumnTotalPoints('traLoiNgan') / 10) * 100).toFixed(1).replace('.0', '') + '%' : '0%'}</td>
            {config.hasTuLuan && <td colSpan="3" className="border border-slate-400 p-2 text-red-600">{((getColumnTotalPoints('tuLuan') / 10) * 100).toFixed(1).replace('.0', '')}%</td>}
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('biet') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('hieu') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
            <td className="border border-slate-400 p-2 text-blue-700">{((getLevelTotalPoints('vanDung') / 10) * 100).toFixed(1).replace('.0', '')}%</td>
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
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                ⚡ Nhập nhanh Nội dung & Số tiết từ Excel/Word
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Đóng"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 italic">
                💡 Hướng dẫn: Copy 2 cột (Tên Bài học và Số tiết) từ bảng Excel/Word và dán vào ô bên dưới.
              </p>

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
                    smartImportData(importTextFast);
                    setShowImportModal(false);
                    setImportTextFast('');
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
      )}

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
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-amber-800">
                      Tổng cộng: {tuLuanConfig.questions.length} câu · {totalAllY} ý · {totalAllDiem.toFixed(2).replace('.00', '')}đ
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {Math.abs(totalAllDiem - 4.0) < 0.01 ? '✅ Khớp với cấu trúc Toán 4đ Tự luận' : `⚠️ Lệch so với 4đ Tự luận (chênh ${Math.abs(totalAllDiem - 4.0).toFixed(2)}đ)`}
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
                      { id: 'tl_q1', label: 'Câu 1', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 0.5 }] },
                      { id: 'tl_q2', label: 'Câu 2', kienThuc: '', subItems: [{ diem: 0.5 }, { diem: 1.0 }] },
                      { id: 'tl_q3', label: 'Câu 3', kienThuc: '', subItems: [{ diem: 1.0 }] },
                      { id: 'tl_q4', label: 'Câu 4', kienThuc: '', subItems: [{ diem: 1.0 }] },
                    ],
                  });
                }}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Khôi phục mặc định
              </button>
              <button
                onClick={() => setShowTuLuanModal(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-md transition-all"
              >
                Đóng & Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
}