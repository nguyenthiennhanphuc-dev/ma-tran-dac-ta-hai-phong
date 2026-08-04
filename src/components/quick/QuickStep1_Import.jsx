import React, { useState, useRef } from 'react';
import { useQuickStore } from '../../store/useQuickStore';
import { 
  Sparkles, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  Loader2
} from 'lucide-react';

export default function QuickStep1_Import({ onNext }) {
  const { importMatrix, examHeader, updateExamHeader, step1Data, updateStep1Data } = useQuickStore();

  const fileInputRef = useRef(null);
  const [inputText, setInputText] = useState(step1Data.inputText || '');
  const [fileName, setFileName] = useState(step1Data.fileName || '');
  const [error, setError] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [successData, setSuccessData] = useState(step1Data.successData || null);

  // Môn học & Lớp inputs
  const [subject, setSubject] = useState(examHeader?.monHoc && examHeader.monHoc !== '........................' ? examHeader.monHoc : '');
  const [grade, setGrade] = useState(examHeader?.grade || '');

  // Sync local states to global store
  React.useEffect(() => {
    updateStep1Data({ inputText, fileName, successData });
  }, [inputText, fileName, successData, updateStep1Data]);

  // Parse function to process the text locally
  const parseTextToMatrix = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Vui lòng nhập dữ liệu hoặc tải lên file.');
    }

    // 1. Try to find and parse JSON first (if exported from the app or standard JSON)
    const jsonMatch = trimmed.match(/\[\s*\{.*\}\s*\]|\{\s*".*"\s*:\s*.*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        
        // Validate if it is matrix data
        if (dataArray.length > 0 && (dataArray[0].tenChuDe || dataArray[0].topic || dataArray[0].donViKienThuc)) {
          return dataArray;
        }
      } catch (e) {
        console.warn("JSON block found but parse failed:", e);
      }
    }

    // Helper functions for cleaning and parsing
    const normalizeTopic = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/^(chương|chuong|chủ đề|chu de|phần|phan)\s+(\d+|[ivx]+)\s*[:.-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizeKey = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/[-–—•*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const parseVal = (val) => {
      if (!val) return 0;
      const match = val.match(/^\s*(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const parseTuLuanCell = (val) => {
      if (!val) return { count: 0, diem: 0 };
      let cleaned = val.trim();
      if (cleaned === '' || cleaned === '-' || cleaned === '0') {
        return { count: 0, diem: 0 };
      }

      // Remove newlines from cell (handles wrapped text in narrow table columns)
      cleaned = cleaned.replace(/\r?\n/g, '').trim();

      // If the cell consists only of digits, dots, commas, and spaces, strip all whitespace (e.g. "0,2 5" or "0, 25")
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

      // Mẫu 1b: "1 ý 0.5đ" hoặc "1 0.25đ"
      const matchWithoutParentheses = cleaned.match(/^(\d+)\s*(?:câu|cau|ý|y)?\s*(\d+(?:[.,]\d+)?)\s*(?:đ|đd|điểm|diem)/i);
      if (matchWithoutParentheses) {
        const count = parseInt(matchWithoutParentheses[1], 10) || 0;
        const diem = parseFloat(matchWithoutParentheses[2].replace(',', '.')) || 0;
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
        const matchDecimal = cleaned.match(/^(\d+(?:[.,]\d+)?)$/);
        if (matchDecimal) {
            const diem = parseFloat(matchDecimal[1].replace(',', '.')) || 0;
            if (!isNaN(diem)) {
                return { count: 1, diem };
            }
        }
      }

      // Mẫu 4: Chỉ ghi số nguyên đầu tiên, ví dụ "1 [C1]", "2"
      const matchOnlyCount = cleaned.match(/^(\d+)/);
      if (matchOnlyCount) {
        const count = parseInt(matchOnlyCount[1], 10);
        if (!isNaN(count) && count > 0) {
           return { count, diem: 0 };
        }
      }

      return { count: 0, diem: 0 };
    };

    const isHeaderOrSummaryRow = (cols) => {
      if (cols.length < 3) return true;
      
      const c0 = cols[0].trim().toLowerCase();
      const c1 = cols[1].trim().toLowerCase();
      const c2 = cols[2].trim().toLowerCase();

      // Skip table header indicator rows
      if (c0 === 'tt' || c0 === 'stt') {
        return true;
      }
      if (c1 === 'chủ đề/chương' || c1 === 'chủ đề' || c1 === 'chu de' || c1 === 'chương' || c1 === 'chuong') {
        return true;
      }
      if (c2 === 'nội dung/đơn vị kt' || c2 === 'nội dung' || c2 === 'noi dung' || c2 === 'đơn vị kiến thức' || c2 === 'yêu cầu cần đạt' || c2 === 'yeu cau can dat') {
        return true;
      }

      // Skip totals
      if (c0.startsWith('tổng') || c0.startsWith('tong') || c0.startsWith('tỉ lệ') || c0.startsWith('ti le') || c0.startsWith('tỷ lệ') || c0.startsWith('ty le')) {
        return true;
      }
      if (c1.startsWith('tổng') || c1.startsWith('tong') || c1.startsWith('tỉ lệ') || c1.startsWith('ti le') || c1.startsWith('tỷ lệ') || c1.startsWith('ty le')) {
        return true;
      }

      return false;
    };

    const lines = trimmed.split('\n').map(r => r.trim()).filter(r => r);
    const topicList = [];
    const topicMap = {};

    let currentSection = 'matrix'; // default to matrix
    let lastTopicName = '';

    lines.forEach((line) => {
      // Clean leading and trailing pipes
      let cleanedLine = line;
      if (cleanedLine.startsWith('|')) cleanedLine = cleanedLine.slice(1);
      if (cleanedLine.endsWith('|')) cleanedLine = cleanedLine.slice(0, -1);

      const cols = cleanedLine.split(/\t|\|/).map(c => c.trim());
      const lowerLine = line.toLowerCase();

      // Switch section based on text content or table headers
      if (lowerLine.includes('bản đặc tả') || lowerLine.includes('đặc tả') || lowerLine.includes('dac ta') || lowerLine.includes('dac_ta') || lowerLine.includes('yêu cầu cần đạt') || lowerLine.includes('yeu cau can dat')) {
        currentSection = 'spec';
        if (cols.length < 3 || isHeaderOrSummaryRow(cols)) return;
      } else if ((lowerLine.includes('ma trận') || lowerLine.includes('ma tran') || lowerLine.includes('ma_tran') || lowerLine.includes('mức độ đánh giá')) && !lowerLine.includes('đặc tả') && !lowerLine.includes('dac ta') && !lowerLine.includes('yêu cầu cần đạt') && !lowerLine.includes('yeu cau can dat')) {
        currentSection = 'matrix';
        if (cols.length < 3 || isHeaderOrSummaryRow(cols)) return;
      }

      // Skip markdown table separator lines
      if (/^\|?\s*[-:| ]+\s*\|?$/.test(line)) {
        return;
      }

      if (cols.length < 8) {
        return;
      }

      if (isHeaderOrSummaryRow(cols)) {
        return;
      }

      // In the layout:
      // Index 0: TT (e.g. "15" or "16")
      // Index 1: Topic/Chương (e.g. "Từ")
      // Index 2: Nội dung/Đơn vị KT (e.g. "- Nam châm")
      const topicName = cols[1] || lastTopicName;
      if (cols[1]) {
        lastTopicName = cols[1];
      }

      if (!topicName) return;

      const unitName = cols[2];
      if (!unitName) return;

      const normTopic = normalizeTopic(topicName);
      const normUnit = normalizeKey(unitName);

      if (!topicMap[normTopic]) {
        topicMap[normTopic] = {
          tenChuDe: topicName,
          donViKienThucMap: {},
          originalUnitsOrder: []
        };
        topicList.push(normTopic);
      }

      const topicData = topicMap[normTopic];

      if (!topicData.donViKienThucMap[normUnit]) {
        topicData.donViKienThucMap[normUnit] = {
          noiDung: unitName,
          soTiet: 1,
          yeuCauCanDat: "",
          nhieuLuaChon: { biet: 0, hieu: 0, vanDung: 0 },
          dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
          traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 },
          tuLuan: { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0 }
        };
        topicData.originalUnitsOrder.push(normUnit);
      }

      const unitData = topicData.donViKienThucMap[normUnit];

      if (currentSection === 'matrix') {
        // Matrix: levels start at index 3
        let colIdx = 3;
        const mcq_b = parseVal(cols[colIdx++]);
        const mcq_h = parseVal(cols[colIdx++]);
        const mcq_vd = parseVal(cols[colIdx++]);

        const ds_b = parseVal(cols[colIdx++]);
        const ds_h = parseVal(cols[colIdx++]);
        const ds_vd = parseVal(cols[colIdx++]);

        const tln_b = parseVal(cols[colIdx++]);
        const tln_h = parseVal(cols[colIdx++]);
        const tln_vd = parseVal(cols[colIdx++]);

        const tl_b = parseTuLuanCell(cols[colIdx++]);
        const tl_h = parseTuLuanCell(cols[colIdx++]);
        const tl_vd = parseTuLuanCell(cols[colIdx++]);

        unitData.nhieuLuaChon.biet = Math.max(unitData.nhieuLuaChon.biet, mcq_b);
        unitData.nhieuLuaChon.hieu = Math.max(unitData.nhieuLuaChon.hieu, mcq_h);
        unitData.nhieuLuaChon.vanDung = Math.max(unitData.nhieuLuaChon.vanDung, mcq_vd);

        unitData.dungSai.biet = Math.max(unitData.dungSai.biet, ds_b);
        unitData.dungSai.hieu = Math.max(unitData.dungSai.hieu, ds_h);
        unitData.dungSai.vanDung = Math.max(unitData.dungSai.vanDung, ds_vd);

        unitData.traLoiNgan.biet = Math.max(unitData.traLoiNgan.biet, tln_b);
        unitData.traLoiNgan.hieu = Math.max(unitData.traLoiNgan.hieu, tln_h);
        unitData.traLoiNgan.vanDung = Math.max(unitData.traLoiNgan.vanDung, tln_vd);

        unitData.tuLuan.biet = Math.max(unitData.tuLuan.biet, tl_b.count);
        unitData.tuLuan.diemBiet = Math.max(unitData.tuLuan.diemBiet, tl_b.diem);
        unitData.tuLuan.hieu = Math.max(unitData.tuLuan.hieu, tl_h.count);
        unitData.tuLuan.diemHieu = Math.max(unitData.tuLuan.diemHieu, tl_h.diem);
        unitData.tuLuan.vanDung = Math.max(unitData.tuLuan.vanDung, tl_vd.count);
        unitData.tuLuan.diemVanDung = Math.max(unitData.tuLuan.diemVanDung, tl_vd.diem);

      } else if (currentSection === 'spec') {
        // Spec: YCCD is index 3, levels start at index 4
        const yccdText = cols[3] || "";
        if (yccdText && yccdText.length > unitData.yeuCauCanDat.length) {
          unitData.yeuCauCanDat = yccdText;
        }

        let colIdx = 4;
        const mcq_b = parseVal(cols[colIdx++]);
        const mcq_h = parseVal(cols[colIdx++]);
        const mcq_vd = parseVal(cols[colIdx++]);

        const ds_b = parseVal(cols[colIdx++]);
        const ds_h = parseVal(cols[colIdx++]);
        const ds_vd = parseVal(cols[colIdx++]);

        const tln_b = parseVal(cols[colIdx++]);
        const tln_h = parseVal(cols[colIdx++]);
        const tln_vd = parseVal(cols[colIdx++]);

        const tl_b = parseTuLuanCell(cols[colIdx++]);
        const tl_h = parseTuLuanCell(cols[colIdx++]);
        const tl_vd = parseTuLuanCell(cols[colIdx++]);

        unitData.nhieuLuaChon.biet = Math.max(unitData.nhieuLuaChon.biet, mcq_b);
        unitData.nhieuLuaChon.hieu = Math.max(unitData.nhieuLuaChon.hieu, mcq_h);
        unitData.nhieuLuaChon.vanDung = Math.max(unitData.nhieuLuaChon.vanDung, mcq_vd);

        unitData.dungSai.biet = Math.max(unitData.dungSai.biet, ds_b);
        unitData.dungSai.hieu = Math.max(unitData.dungSai.hieu, ds_h);
        unitData.dungSai.vanDung = Math.max(unitData.dungSai.vanDung, ds_vd);

        unitData.traLoiNgan.biet = Math.max(unitData.traLoiNgan.biet, tln_b);
        unitData.traLoiNgan.hieu = Math.max(unitData.traLoiNgan.hieu, tln_h);
        unitData.traLoiNgan.vanDung = Math.max(unitData.traLoiNgan.vanDung, tln_vd);

        unitData.tuLuan.biet = Math.max(unitData.tuLuan.biet, tl_b.count);
        unitData.tuLuan.diemBiet = Math.max(unitData.tuLuan.diemBiet, tl_b.diem);
        unitData.tuLuan.hieu = Math.max(unitData.tuLuan.hieu, tl_h.count);
        unitData.tuLuan.diemHieu = Math.max(unitData.tuLuan.diemHieu, tl_h.diem);
        unitData.tuLuan.vanDung = Math.max(unitData.tuLuan.vanDung, tl_vd.count);
        unitData.tuLuan.diemVanDung = Math.max(unitData.tuLuan.diemVanDung, tl_vd.diem);
      }
    });

    const topics = topicList.map(normTopic => {
      const topicData = topicMap[normTopic];
      const units = topicData.originalUnitsOrder.map(normUnit => topicData.donViKienThucMap[normUnit]);
      return {
        tenChuDe: topicData.tenChuDe,
        yeuCauCanDat: "",
        donViKienThuc: units
      };
    });

    // Bóc tách bổ sung điểm tự luận từ Khung đề nếu bảng không ghi rõ điểm
    const stripPunctuation = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/[+.,():\-\[\]{}'"`~!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const allLines = text.split('\n').map(l => l.trim());
    allLines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if ((lowerLine.includes('mức độ') || lowerLine.includes('muc do')) && 
          (lowerLine.includes('điểm') || lowerLine.includes('diem') || lowerLine.includes('đ') || lowerLine.includes('d')) &&
          (lowerLine.includes('ý') || lowerLine.includes('y '))) {
        
        let level = '';
        if (lowerLine.includes('nhận biết') || lowerLine.includes('nhan biet')) level = 'biet';
        else if (lowerLine.includes('thông hiểu') || lowerLine.includes('thong hieu')) level = 'hieu';
        else if (lowerLine.includes('vận dụng cao') || lowerLine.includes('van dung cao')) level = 'vanDung';
        else if (lowerLine.includes('vận dụng') || lowerLine.includes('van dung')) level = 'vanDung';

        if (!level) return;

        let diem = 0;
        const scoreMatch = lowerLine.match(/([0-9.,]+)\s*(?:điểm|diem|đ|d)\b/i);
        if (scoreMatch) {
          diem = parseFloat(scoreMatch[1].replace(',', '.')) || 0;
        }

        if (diem <= 0) return;

        let matchedUnit = null;
        let maxMatchLength = 0;

        topics.forEach(topic => {
          (topic.donViKienThuc || []).forEach(dv => {
            const dvStr = stripPunctuation(dv.noiDung);
            const lineStr = stripPunctuation(lowerLine);
            if (dvStr && lineStr.includes(dvStr)) {
              if (dvStr.length > maxMatchLength) {
                maxMatchLength = dvStr.length;
                matchedUnit = dv;
              }
            }
          });
        });

        if (matchedUnit) {
          if (!matchedUnit.tuLuan) {
            matchedUnit.tuLuan = { biet: 0, hieu: 0, vanDung: 0, diemBiet: 0, diemHieu: 0, diemVanDung: 0 };
          }
          if (level === 'biet') {
            matchedUnit.tuLuan.diemBiet = diem;
            if (matchedUnit.tuLuan.biet === 0) matchedUnit.tuLuan.biet = 1;
          } else if (level === 'hieu') {
            matchedUnit.tuLuan.diemHieu = diem;
            if (matchedUnit.tuLuan.hieu === 0) matchedUnit.tuLuan.hieu = 1;
          } else if (level === 'vanDung') {
            matchedUnit.tuLuan.diemVanDung = diem;
            if (matchedUnit.tuLuan.vanDung === 0) matchedUnit.tuLuan.vanDung = 1;
          }
          console.log(`[parseTextToMatrix] 🎯 Khớp điểm tự luận từ text: ${matchedUnit.noiDung} (${level}) -> ${diem}đ`);
        }
      }
    });

    if (topics.length === 0) {
      throw new Error('Không nhận dạng được dữ liệu ma trận hợp lệ. Vui lòng kiểm tra lại định dạng dán vào.');
    }

    return topics;
  };

  const handleProcess = () => {
    setError(null);
    setSuccessData(null);

    if (!subject.trim()) {
      setError('Vui lòng nhập tên Môn học.');
      return;
    }
    if (!grade.trim()) {
      setError('Vui lòng nhập Lớp.');
      return;
    }

    try {
      const parsed = parseTextToMatrix(inputText);
      
      // Calculate statistics
      let totalTopics = parsed.length;
      let totalUnits = 0;
      let mcqCount = 0;
      let dsCount = 0;
      let tlnCount = 0;
      let tlCount = 0;

      parsed.forEach(topic => {
        const units = topic.donViKienThuc || [];
        totalUnits += units.length;
        units.forEach(dv => {
          const mcq = dv.nhieuLuaChon || {};
          const ds = dv.dungSai || {};
          const tln = dv.traLoiNgan || {};
          const tl = dv.tuLuan || {};

          mcqCount += (Number(mcq.biet) || 0) + (Number(mcq.hieu) || 0) + (Number(mcq.vanDung) || 0);
          dsCount += (Number(ds.biet) || 0) + (Number(ds.hieu) || 0) + (Number(ds.vanDung) || 0) + (Number(ds.vanDungCao) || 0);
          tlnCount += (Number(tln.biet) || 0) + (Number(tln.hieu) || 0) + (Number(tln.vanDung) || 0) + (Number(tln.vanDungCao) || 0);
          tlCount += (Number(tl.biet) || 0) + (Number(tl.hieu) || 0) + (Number(tl.vanDung) || 0);
        });
      });

      // Commit locally to store
      importMatrix(parsed);
      updateExamHeader('monHoc', subject.trim());
      updateExamHeader('grade', grade.trim());

      setSuccessData({
        totalTopics,
        totalUnits,
        mcqCount,
        dsCount,
        tlnCount,
        tlCount
      });

    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleFileUpload = async (e) => {
    setError(null);
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const isDocxOrPdf = file.name.endsWith('.docx') || file.name.endsWith('.pdf');

    if (isDocxOrPdf) {
      setIsParsingFile(true);
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const apiBaseUrl = isLocalhost ? 'http://localhost:8000' : rawUrl;

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${apiBaseUrl}/api/parse-exam-file`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || err.error || `Lỗi server: ${response.status}`);
        }

        const parseResult = await response.json();
        setInputText(parseResult.text || '');
      } catch (err) {
        console.error(err);
        setError('Lỗi khi bóc tách văn bản từ file Word/PDF: ' + err.message);
      } finally {
        setIsParsingFile(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputText(event.target.result);
      };
      reader.onerror = () => {
        setError('Lỗi khi đọc file.');
      };
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
    setInputText('');
    setFileName('');
    setSuccessData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8 transition-all">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-indigo-700 font-semibold text-sm mb-3">
          <Sparkles size={16} />
          <span>Nhập ma trận thô từ Excel/Word</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
          Nạp Ma Trận & Đặc Tả
        </h2>
        <p className="text-slate-500 mt-2 text-sm md:text-base max-w-xl mx-auto">
          Copy bảng dữ liệu từ file Word/Excel rồi dán vào bên dưới (hoặc tải lên file text/json). Hệ thống sẽ tự động bóc tách dữ liệu vào khung đặc tả.
        </p>
      </div>

      {!successData ? (
        <div className="space-y-6">
          {/* Môn học & Lớp Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Môn học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Toán, Vật lí, Ngữ văn..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-semibold text-xs text-slate-800 bg-white shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Lớp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="VD: 10, 11, 12..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-semibold text-xs text-slate-800 bg-white shadow-sm transition-all"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            {isParsingFile ? (
              <Loader2 size={40} className="text-indigo-600 mb-2 animate-spin" />
            ) : (
              <UploadCloud size={40} className="text-slate-400 mb-2" />
            )}
            <span className="text-sm font-bold text-slate-600">
              {isParsingFile ? 'Đang phân tích file Word/PDF...' : 'Kéo thả hoặc tải lên file dữ liệu'}
            </span>
            <span className="text-xs text-slate-400 mt-1 mb-3">Hỗ trợ các định dạng .txt, .json, .csv, .tsv, .docx, .pdf</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
              accept=".txt,.json,.csv,.tsv,.docx,.pdf" 
              className="hidden" 
              disabled={isParsingFile}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingFile}
              className={`px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors ${
                isParsingFile ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Chọn file từ thiết bị
            </button>
            {fileName && (
              <span className="mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                📄 {isParsingFile ? 'Đang trích xuất:' : 'Đã tải:'} {fileName}
              </span>
            )}
          </div>

          {/* Textarea Paste */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Hoặc dán trực tiếp bảng ma trận/đặc tả từ Excel/Word vào đây:
              </label>
              {inputText && (
                <button 
                  onClick={handleClear}
                  className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700"
                >
                  <Trash2 size={12} /> Xóa trống
                </button>
              )}
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ví dụ copy-paste bảng Excel:\nChương I: Hàm số\tĐơn điệu hàm số\t4\tHọc sinh biết được tính đơn điệu...\nChương I: Hàm số\tCực trị hàm số\t2\tHọc sinh xác định được cực trị...`}
              className="w-full min-h-[220px] p-4 bg-slate-50 border border-slate-350 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs leading-relaxed transition-all shadow-inner"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              disabled={!inputText.trim()}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                !inputText.trim()
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
              }`}
            >
              <FileSpreadsheet size={18} />
              <span>⚡ Xử lý dữ liệu & Đi tiếp</span>
            </button>
          </div>
        </div>
      ) : (
        /* Success statistics view */
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4">
            <CheckCircle2 size={40} className="text-emerald-500 shrink-0" />
            <div className="text-center md:text-left">
              <h4 className="font-extrabold text-lg">Bóc tách & Phân tích thành công!</h4>
              <p className="text-sm text-emerald-700 mt-1">
                Dữ liệu bảng đã được nạp thành công vào hệ thống. Bạn có thể chuyển sang bước tiếp theo để tinh chỉnh.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h5 className="font-bold text-slate-800 border-b pb-2.5 mb-4 text-xs uppercase tracking-wide">
              Thống kê cấu trúc đã nhập
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase">Số chủ đề</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{successData.totalTopics}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase">Đơn vị kiến thức</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{successData.totalUnits}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase font-mono">Trắc nghiệm NLC</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{successData.mcqCount} câu</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase">Trắc nghiệm Đúng/Sai</div>
                <div className="text-2xl font-black text-teal-600 mt-1">{successData.dsCount} ý</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase font-mono">Trả lời ngắn</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{successData.tlnCount} câu</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                <div className="text-xs font-bold text-slate-500 uppercase">Tự luận</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{successData.tlCount} câu</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleClear}
              className="px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Nhập ma trận khác
            </button>
            <button
              onClick={onNext}
              className="flex items-center justify-center gap-1.5 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span>Đi tiếp đến Thông tin bìa</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
