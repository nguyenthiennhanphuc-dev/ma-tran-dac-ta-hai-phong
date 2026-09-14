import React, { useState } from 'react';
import { useQuickStore as useExamStore } from '../../store/useQuickStore';
import { Trash2, CheckCircle2, Wand2, Loader2, Lock, Unlock, Copy, CopyCheck } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import ClientGraph from '../ClientGraph';
import SimilarQuestionModal from '../SimilarQuestionModal';
import BatchDeleteExamModal from '../BatchDeleteExamModal';
import { generateFullEquivalentExamPrompt } from '../../utils/prompt_generator';
import { parseExamDraft, extractHinhAnhFromText, autoDetectGraphMetadata } from './QuickStep5_AIGenerator';

const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{content}</Latex>;
};


// GraphPreview nhỏ gọn cho Khung Đề (client-side Canvas)
function GraphPreviewMini({ hinhAnh }) {
  if (!hinhAnh || !hinhAnh.loai) return null;
  return <ClientGraph hinhAnh={hinhAnh} maxHeight={200} />;
}


// Helper: map tên level → key trong indicatorMap
const toLevelKey = (lvl) => {
  if (lvl === 'Nhận biết')    return 'biet';
  if (lvl === 'Thông hiểu')   return 'hieu';
  if (lvl === 'Vận dụng')     return 'vanDung';
  if (lvl === 'Vận dụng cao') return 'vanDungCao';
  return 'biet';
};
// Helper: map loaiCauHoi → key trong indicatorMap
const toLoaiKey = (loai) => {
  if (loai === 1) return 'nhieuLuaChon';
  if (loai === 2) return 'dungSai';
  if (loai === 3) return 'traLoiNgan';
  if (loai === 4) return 'tuLuan';
  return 'nhieuLuaChon';
};
// Tìm mã năng lực cho một dvkt + loai + level cụ thể
const findIndicators = (matrix, dvktName, loai, level) => {
  const loaiKey  = toLoaiKey(loai);
  const levelKey = toLevelKey(level);
  for (const topic of matrix) {
    for (const dv of (topic.donViKienThuc || [])) {
      if (dv.noiDung === dvktName && dv.indicatorMap) {
        const raw = dv.indicatorMap[loaiKey]?.[levelKey] || [];
        return raw.map(c => (typeof c === 'object' && c?.code) ? c.code : c).filter(Boolean);
      }
    }
  }
  return [];
};

export default function Step4_GenerateExam() {
  const { matrix, config, tuLuanConfig, examSlots, examHeader, clearExamSlot, clearMultipleExamSlots, clearAllExamSlots, updateExamSlot, draftQuestions, setDraftQuestions, lockedSlots, toggleLockSlot, updateConfig } = useExamStore();

  const hasManualTLConfig = tuLuanConfig?.enabled && tuLuanConfig?.questions?.length > 0 && tuLuanConfig.questions.some(q => q.subItems?.length > 0);

  // State cho tính năng Xóa nhiều câu hỏi
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  // State cho tính năng Tạo tương tự
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [similarSlotKey, setSimilarSlotKey]     = useState('');
  const [similarSlotData, setSimilarSlotData]   = useState(null);
  const [similarMetaInfo, setSimilarMetaInfo]   = useState(null);
  const [similarOtherQs, setSimilarOtherQs]     = useState([]);
  const [generatingSlot, setGeneratingSlot]     = useState('');
  const [isCopiedFull, setIsCopiedFull]         = useState(false);

  // Handler: Sinh toàn bộ đề tương đương
  const handleCopyFullEquivalentPrompt = async () => {
    // Thu thập danh sách các slot đã điền, theo thứ tự từ phần 1 đến phần 4
    const filledSlots = [];
    
    // Quét thủ công để đảm bảo thứ tự (có thể tối ưu hơn nhưng cách này chắc chắn đúng cấu trúc)
    Object.keys(examSlots).forEach(key => {
      if (examSlots[key]) {
        filledSlots.push({ key, data: examSlots[key] });
      }
    });

    // Sắp xếp theo thứ tự phần và câu
    filledSlots.sort((a, b) => {
      const pA = parseInt(a.key.match(/phan(\d+)/)[1]);
      const pB = parseInt(b.key.match(/phan(\d+)/)[1]);
      if (pA !== pB) return pA - pB;
      const cA = parseInt(a.key.match(/cau(\d+)/)[1]);
      const cB = parseInt(b.key.match(/cau(\d+)/)[1]);
      return cA - cB;
    });

    if (filledSlots.length === 0) {
      alert("Khung đề đang trống. Hãy điền câu hỏi trước khi tạo đề tương đương!");
      return;
    }

    try {
      const prompt = generateFullEquivalentExamPrompt(filledSlots, lockedSlots);
      await navigator.clipboard.writeText(prompt);
      setIsCopiedFull(true);
      setTimeout(() => setIsCopiedFull(false), 3000);
      window.open('https://gemini.google.com/app', '_blank');
      alert('✅ Đã copy siêu lệnh Tạo Đề Tương Đương!\n\n1. Hãy dán vào Gemini.\n2. Chờ Gemini trả về toàn bộ Đề số 2.\n3. Dán kết quả vào "Bước 5: Trợ lý AI" rồi bấm Bóc tách.\n4. Bấm "Nạp & Ghi đè toàn bộ lên Khung Đề" để hoàn tất.');
    } catch (error) {
      alert("Lỗi copy: " + error.message);
    }
  };

  // Handler: Bấm nút "Tạo tương tự" — thu thập data rồi mở modal (prompt được sinh bên trong modal)
  const handleCreateSimilar = (slotKey, slotData, metaInfo) => {
    // Tìm mã năng lực cho câu này
    const indicators = findIndicators(matrix, metaInfo.dvkt, metaInfo.loaiCauHoi, metaInfo.level);

    // Tóm tắt các câu khác trong đề để AI tránh trùng lặp (lấy tối đa 10 câu, bỏ câu đang xét)
    const otherQs = Object.entries(examSlots)
      .filter(([k, v]) => k !== slotKey && v && v.noiDung)
      .map(([, v]) => String(v.noiDung).replace(/^(?:\*\*)?Câu\s*\d+[:.)]?\s*/i, '').substring(0, 80))
      .filter(Boolean)
      .slice(0, 10);

    setSimilarSlotKey(slotKey);
    setSimilarSlotData(slotData);
    setSimilarMetaInfo({ ...metaInfo, indicators });
    setSimilarOtherQs(otherQs);
    setSimilarModalOpen(true);
  };

  // Handler: Lưu kết quả từ modal vào danh sách Nháp
  const handleSaveSimilarToDraft = (rawText) => {
    try {
      const parsed = parseExamDraft(rawText);
      
      // Xử lý đồ thị y như Step5
      for (const q of parsed) {
        const fieldsToCheck = ['giaiThich', 'noiDung', 'dapAn', 'yA', 'yB', 'yC', 'yD', 'dapAnA', 'dapAnB', 'dapAnC', 'dapAnD'];
        for (const field of fieldsToCheck) {
          if (q[field] && !q.hinhAnh) {
            const extracted = extractHinhAnhFromText(q[field]);
            if (extracted) {
              q.hinhAnh = extracted.hinhAnh;
              q[field] = extracted.cleanedText;
            }
          }
        }
        if (typeof q.hinhAnh === 'string') q.hinhAnh = null;
        if (!q.hinhAnh || !q.hinhAnh.loai) {
          const detected = autoDetectGraphMetadata(q);
          if (detected) q.hinhAnh = detected;
        }
        
        // Gắn cờ để biết là câu này từ tính năng tạo tương tự
        q._fromSimilar = true;
        q._originalSlotKey = similarSlotKey;
      }

      if (parsed.length === 0) {
        throw new Error('Không tìm thấy câu hỏi nào. Đảm bảo kết quả AI có chứa chữ "Câu X:".');
      }

      setDraftQuestions([...(draftQuestions || []), ...parsed]);
      // Modal tự hiển thị trạng thái thành công, không cần alert
    } catch (error) {
      console.error(error);
      throw error; // Ném lại để modal hiển thị lỗi inline
    }
  };

  // Hàm "cào" toàn bộ Ý của một loại câu hỏi từ Ma trận ra thành 1 danh sách phẳng
  const getFlatItems = (typeKey) => {
    let items = [];
    matrix.forEach(topic => {
      (topic.donViKienThuc || []).forEach(dv => {
        ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(level => {
          const numQ = dv[typeKey] ? (Number(dv[typeKey][level]) || 0) : 0;
          if (numQ <= 0) return;

          // Tính điểm thực tế cho mỗi ý tự luận từ ma trận
          if (typeKey === 'tuLuan') {
            if (Array.isArray(dv.tuLuan?.subItems) && dv.tuLuan.subItems.length > 0) {
              const matchingSubs = dv.tuLuan.subItems.filter(s => s.level === level);
              matchingSubs.forEach((sub, sIdx) => {
                const mapObj = dv.indicatorMap?.[`tuLuan_${level}_${sIdx}`];
                const resolvedLabel = sub.label || (typeof mapObj === 'object' ? mapObj.label : '') || sub.qLabel || '';
                items.push({
                  topic: topic.tenChuDe || 'Chưa nhập tên chủ đề',
                  dvkt: dv.noiDung || '',
                  level: level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : level === 'vanDung' ? 'Vận dụng' : 'Vận dụng cao',
                  diem: Number(sub.diem) || 0.5,
                  label: resolvedLabel,
                  qId: sub.qId || '',
                  qLabel: sub.qLabel || ''
                });
              });
              return;
            }
            const diemField = level === 'biet' ? 'diemBiet' : level === 'hieu' ? 'diemHieu' : level === 'vanDungCao' ? 'diemVanDungCao' : 'diemVanDung';
            const totalDiem = Number(dv.tuLuan?.[diemField]) || 0;
            const diemPerY = numQ > 0 ? Math.round((totalDiem / numQ) * 100) / 100 : 0;
            for (let i = 0; i < numQ; i++) {
              const mapObj = dv.indicatorMap?.[`tuLuan_${level}_${i}`];
              const resolvedLabel = (typeof mapObj === 'object' ? mapObj.label : '') || '';
              items.push({
                topic: topic.tenChuDe || 'Chưa nhập tên chủ đề',
                dvkt: dv.noiDung || '',
                level: level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : level === 'vanDung' ? 'Vận dụng' : 'Vận dụng cao',
                diem: diemPerY,
                label: resolvedLabel
              });
            }
            return;
          }

          for (let i = 0; i < numQ; i++) {
            items.push({
              topic: topic.tenChuDe || 'Chưa nhập tên chủ đề',
              dvkt: dv.noiDung || '',
              level: level === 'biet' ? 'Nhận biết' : level === 'hieu' ? 'Thông hiểu' : level === 'vanDung' ? 'Vận dụng' : 'Vận dụng cao'
            });
          }
        });
      });
    });
    return items;
  };

  // Hàm cắt mảng thành từng nhóm
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  // 1. Phần Nhiều lựa chọn (1 Ý = 1 Câu)
  const mcqItems = getFlatItems('nhieuLuaChon');
  const mcqQuestions = chunkArray(mcqItems, 1);

  // 2. Phần Đúng/Sai — Gom 4 ý bất kỳ vào 1 câu
  const tfQuestions = (() => {
    // Thu thập toàn bộ ý theo thứ tự
    const allItems = [];
    const levelLabels = {
      biet: 'Nhận biết',
      hieu: 'Thông hiểu',
      vanDung: 'Vận dụng',
      vanDungCao: 'Vận dụng cao'
    };

    matrix.forEach(topic => {
      (topic.donViKienThuc || []).forEach(dv => {
        const ds = dv.dungSai || {};
        ['biet', 'hieu', 'vanDung', 'vanDungCao'].forEach(key => {
          const count = Number(ds[key]) || 0;
          for (let i = 0; i < count; i++) {
            allItems.push({ topic: topic.tenChuDe || 'Chưa nhập tên chủ đề', level: levelLabels[key] });
          }
        });
      });
    });

    // Gom cứ 4 ý thành 1 câu
    const chunks = [];
    for (let i = 0; i < allItems.length; i += 4) {
      chunks.push(allItems.slice(i, i + 4));
    }
    return chunks;
  })();

  // 3. Phần Trả lời ngắn (1 Ý = 1 Câu Độc Lập)
  const saItems = getFlatItems('traLoiNgan');
  const saQuestions = chunkArray(saItems, 1);

  // 4. Phần Tự luận — Gom và sắp xếp theo số thứ tự câu (Câu 1, Câu 2, Câu 3...) đồng bộ 100% Ma trận
  const tlItems = getFlatItems('tuLuan');
  const tlQuestions = (() => {
    if (tlItems.length === 0) return [];

    const extractQNum = (it) => {
      if (!it) return null;
      const candidates = [it.qLabel, it.label, it.qId];
      for (const str of candidates) {
        if (!str) continue;
        const m = String(str).match(/(?:câu|tl_q|tl\.?)\s*(\d+)/i) || String(str).match(/\d+/);
        if (m) return parseInt(m[1] || m[0], 10);
      }
      return null;
    };

    const extractSubLetter = (str) => {
      if (!str) return '';
      const m = String(str).match(/(?:câu\s*\d+|tl\s*\d+)?([a-z])\b/i) || String(str).match(/([a-z])\)/i);
      return m ? m[1].toLowerCase() : '';
    };

    const grouped = {};
    const unnumbered = [];
    const usedIndices = new Set();
    const questionsConfig = tuLuanConfig?.questions || [];

    if (questionsConfig.length > 0) {
      questionsConfig.forEach((q, qIdx) => {
        const qNum = extractQNum(q) || (qIdx + 1);
        const expectedPrefix = (q.label || `Câu ${qNum}`).toLowerCase().trim();
        const chunk = [];

        tlItems.forEach((item, idx) => {
          if (usedIndices.has(idx)) return;
          const itemNum = extractQNum(item);
          const itemLabel = (item.label || item.qLabel || '').toLowerCase().trim();

          const isMatch = (item.qId && q.id && item.qId === q.id) ||
                          (itemNum !== null && itemNum === qNum) ||
                          (itemLabel && itemLabel.startsWith(expectedPrefix));
          if (isMatch) {
            chunk.push({
              ...item,
              diem: q.subItems?.[chunk.length]?.diem || item.diem
            });
            usedIndices.add(idx);
          }
        });

        if (chunk.length > 0) {
          chunk.sort((a, b) => {
            const letterA = extractSubLetter(a.label);
            const letterB = extractSubLetter(b.label);
            if (letterA && letterB) return letterA.localeCompare(letterB);
            return (a.label || '').localeCompare(b.label || '');
          });
          grouped[qNum] = chunk;
        }
      });
    }

    tlItems.forEach((item, idx) => {
      if (usedIndices.has(idx)) return;
      const num = extractQNum(item);
      if (num !== null) {
        if (!grouped[num]) grouped[num] = [];
        grouped[num].push(item);
        usedIndices.add(idx);
      } else {
        unnumbered.push(item);
      }
    });

    const result = [];
    const sortedNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    sortedNums.forEach(num => {
      const chunk = grouped[num];
      chunk.sort((a, b) => {
        const letterA = extractSubLetter(a.label);
        const letterB = extractSubLetter(b.label);
        if (letterA && letterB) return letterA.localeCompare(letterB);
        return (a.label || '').localeCompare(b.label || '');
      });
      result.push(chunk);
    });

    if (unnumbered.length > 0) {
      const dvktGroups = {};
      unnumbered.forEach(item => {
        const key = item.dvkt || '_unknown';
        if (!dvktGroups[key]) dvktGroups[key] = [];
        dvktGroups[key].push(item);
      });
      Object.values(dvktGroups).forEach(grp => {
        for (let i = 0; i < grp.length; i += 2) {
          result.push(grp.slice(i, i + 2));
        }
      });
    }

    return result;
  })();

  const alphabet = ['a)', 'b)', 'c)', 'd)', 'e)', 'f)'];

  // Đếm số câu đã điền trong từng phần để phục vụ xóa nhanh
  const p1FilledCount = mcqQuestions.filter((_, i) => examSlots[`phan1_cau${i + 1}`]).length;
  const p2FilledCount = tfQuestions.filter((_, i) => examSlots[`phan2_cau${i + 1}`]).length;
  const p3FilledCount = saQuestions.filter((_, i) => examSlots[`phan3_cau${i + 1}`]).length;
  const phanTLPrefix = config.hasTraLoiNgan ? 'phan4' : 'phan3';
  const p4FilledCount = tlQuestions.filter((_, i) => examSlots[`${phanTLPrefix}_cau${i + 1}`]).length;
  const totalFilledQuestionsCount = p1FilledCount + p2FilledCount + p3FilledCount + p4FilledCount;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <CheckCircle2 className="text-purple-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Khung Đề Kiểm Tra
            </h2>
            <p className="text-sm text-slate-500">Xem trước và chỉnh sửa nội dung đề thi</p>
          </div>
          
          {/* Nút Xóa nhiều câu hỏi */}
          <button
            type="button"
            onClick={() => setBatchDeleteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all shadow-sm hover:shadow cursor-pointer"
            title="Mở bảng chọn để xóa nhanh 1 hoặc nhiều câu hỏi đã điền trong khung đề"
          >
            <Trash2 size={18} />
            <span>Xóa nhiều câu hỏi...</span>
            {totalFilledQuestionsCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-200 text-red-800 rounded-full font-bold">
                {totalFilledQuestionsCount}
              </span>
            )}
          </button>

          <button
            onClick={handleCopyFullEquivalentPrompt}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all ${isCopiedFull ? 'bg-green-600 scale-105' : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:shadow-xl hover:scale-105'}`}
            title="AI sẽ sinh ra 1 Đề thi mới tương đương 100% với Đề này (những câu bị Khóa sẽ được giữ nguyên)"
          >
            {isCopiedFull ? <CopyCheck size={18} /> : <Copy size={18} />}
            {isCopiedFull ? 'Đã Copy Lệnh' : '✨ Tạo Đề Tương Đương'}
          </button>
        </div>
        
        {lockedSlots.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Lock size={16} /> Đang khóa <strong>{lockedSlots.length}</strong> câu hỏi. Khi tạo Đề Tương Đương, AI sẽ giữ nguyên 100% nội dung các câu này.
          </div>
        )}

        {/* THANH TÙY CHỌN HIỂN THỊ TRÊN ĐỀ THI & FILE XUẤT */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tùy chọn hiển thị Đề thi & File Word:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Ẩn / Hiện chữ màu đỏ */}
            <button
              type="button"
              onClick={() => updateConfig('showExamRedMetadata', config.showExamRedMetadata === false ? true : false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                config.showExamRedMetadata !== false
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-slate-200/80 text-slate-500 border-slate-300 hover:bg-slate-300'
              }`}
              title="Bật/Tắt dòng chữ màu đỏ (* Kiến thức, * NLTD/chỉ báo) khi xuất file Word"
            >
              <span>{config.showExamRedMetadata !== false ? '🔴' : '⚪'}</span>
              <span>{config.showExamRedMetadata !== false ? 'Chữ màu đỏ: Đang hiện' : 'Chữ màu đỏ: Đã ẩn'}</span>
            </button>

            {/* Nút Ẩn / Hiện gạch chân đáp án đúng */}
            <button
              type="button"
              onClick={() => updateConfig('showExamAnswerUnderline', config.showExamAnswerUnderline === false ? true : false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                config.showExamAnswerUnderline !== false
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-slate-200/80 text-slate-500 border-slate-300 hover:bg-slate-300'
              }`}
              title="Bật/Tắt gạch chân & tô đỏ đáp án đúng khi xuất file Word"
            >
              <span>{config.showExamAnswerUnderline !== false ? '✍️' : '🚫'}</span>
              <span>{config.showExamAnswerUnderline !== false ? 'Gạch chân đáp án: Đang hiện' : 'Gạch chân đáp án: Đã ẩn'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-300 p-8 rounded-lg shadow-inner min-h-[400px]">

        {/* PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN */}
        {mcqQuestions.length > 0 && (
          <div className="mb-10">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b pb-2 gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn
              </h3>
              {p1FilledCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${p1FilledCount} câu hỏi đã điền trong Phần I không?`)) {
                      const keys = mcqQuestions.map((_, i) => `phan1_cau${i + 1}`).filter(k => examSlots[k]);
                      clearMultipleExamSlots(keys);
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xóa nhanh tất cả câu hỏi trong Phần I"
                >
                  <Trash2 size={12} /> Xóa Phần I ({p1FilledCount})
                </button>
              )}
            </div>
            <div className="space-y-4">
              {mcqQuestions.map((qChunk, qIndex) => {
                const slotKey = `phan1_cau${qIndex + 1}`;
                const slotData = examSlots[slotKey];
                return (
                  <div key={qIndex} className={`p-4 border rounded-lg text-slate-700 ${slotData ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-blue-800">Câu {qIndex + 1}.</span>
                      <div className="flex items-center gap-2">
                        {slotData && (
                          <>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã điền từ AI
                            </span>
                            <button
                              onClick={() => toggleLockSlot(slotKey)}
                              className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${lockedSlots.includes(slotKey) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Khóa: Bắt AI chép lại 100% nội dung câu này khi tạo Đề Tương Đương"
                            >
                              {lockedSlots.includes(slotKey) ? <Lock size={12} /> : <Unlock size={12} />} {lockedSlots.includes(slotKey) ? 'Đã khóa' : 'Khóa'}
                            </button>
                            <button
                              onClick={() => handleCreateSimilar(slotKey, slotData, {
                                topic: qChunk[0].topic,
                                dvkt: qChunk[0].dvkt,
                                level: qChunk[0].level,
                                loaiCauHoi: 1
                              })}
                              disabled={generatingSlot === slotKey}
                              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors flex items-center gap-1"
                              title="Tạo câu hỏi tương tự bằng AI"
                            >
                              {generatingSlot === slotKey ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Tạo tương tự
                            </button>
                            <button onClick={() => clearExamSlot(slotKey)} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors flex items-center gap-1" title="Xóa nội dung đã đẩy">
                              <Trash2 size={12} /> Xóa
                            </button>
                          </>
                        )}
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          [{qChunk[0].topic}] - {qChunk[0].level}
                        </span>
                      </div>
                    </div>
                    {slotData ? (
                      <div className="bg-white border border-green-200 rounded p-3 text-sm space-y-1">
                        <p className="font-semibold">{slotData.noiDung ? slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '') : ''}</p>
                        {(slotData.loaiCauHoi === 1) && (
                          <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                            <div>A. {slotData.dapAnA}</div>
                            <div>B. {slotData.dapAnB}</div>
                            <div>C. {slotData.dapAnC}</div>
                            <div>D. {slotData.dapAnD}</div>
                          </div>
                        )}
                        <p className="text-xs text-green-700 mt-1">Đáp án: {slotData.dapAnDung}</p>
                        <GraphPreviewMini hinhAnh={slotData.hinhAnh} />
                      </div>
                    ) : (
                      <textarea className="w-full bg-white border border-slate-200 p-2 rounded text-sm outline-none resize-y min-h-[60px]" placeholder="Nội dung câu hỏi..."></textarea>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHẦN II. ĐÚNG/SAI — CHÙM CÂU HỎI (1 Đề bài chung + 4 ý a, b, c, d) */}
        {tfQuestions.length > 0 && (
          <div className="mb-10">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b pb-2 gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                PHẦN II. Câu trắc nghiệm đúng sai
              </h3>
              {p2FilledCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${p2FilledCount} câu hỏi đã điền trong Phần II không?`)) {
                      const keys = tfQuestions.map((_, i) => `phan2_cau${i + 1}`).filter(k => examSlots[k]);
                      clearMultipleExamSlots(keys);
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xóa nhanh tất cả câu hỏi trong Phần II"
                >
                  <Trash2 size={12} /> Xóa Phần II ({p2FilledCount})
                </button>
              )}
            </div>
            <div className="space-y-6">
              {tfQuestions.map((qChunk, qIndex) => {
                const slotKey = `phan2_cau${qIndex + 1}`;
                const slotData = examSlots[slotKey];
                return (
                  <div key={qIndex} className={`p-4 border rounded-lg text-slate-700 ${slotData ? 'bg-green-50 border-green-300' : 'bg-orange-50/30 border-orange-200'}`}>
                    <div className="flex justify-between items-center font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <span>Câu {qIndex + 1}. <span className="text-sm font-normal text-slate-500 italic">(Gồm {qChunk.length} ý)</span></span>
                        {slotData?.noiDung && <span className="text-sm font-normal text-slate-700 mt-1">{slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '')}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {slotData && (
                          <>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã điền từ AI
                            </span>
                            <button
                              onClick={() => toggleLockSlot(slotKey)}
                              className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${lockedSlots.includes(slotKey) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Khóa: Bắt AI chép lại 100% nội dung câu này khi tạo Đề Tương Đương"
                            >
                              {lockedSlots.includes(slotKey) ? <Lock size={12} /> : <Unlock size={12} />} {lockedSlots.includes(slotKey) ? 'Đã khóa' : 'Khóa'}
                            </button>
                            <button
                              onClick={() => handleCreateSimilar(slotKey, slotData, {
                                topic: qChunk[0]?.topic || '',
                                dvkt: qChunk[0]?.dvkt || '',
                                level: qChunk[0]?.level || 'Đúng/Sai',
                                loaiCauHoi: 2
                              })}
                              disabled={generatingSlot === slotKey}
                              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors flex items-center gap-1"
                              title="Tạo câu hỏi tương tự bằng AI"
                            >
                              {generatingSlot === slotKey ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Tạo tương tự
                            </button>
                            <button onClick={() => clearExamSlot(slotKey)} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors flex items-center gap-1" title="Xóa">
                              <Trash2 size={12} /> Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-orange-600 uppercase">📝 Đề bài chung / Tình huống:</span>
                      </div>
                      <textarea
                        className="w-full bg-white border border-orange-200 p-2 rounded text-sm outline-none resize-y min-h-[60px] focus:border-orange-400"
                        placeholder="Nội dung đề bài chung / tình huống / đoạn dữ liệu dẫn cho chùm câu hỏi Đúng/Sai..."
                        value={slotData?.noiDung || ''}
                        onChange={(e) => updateExamSlot(slotKey, 'noiDung', e.target.value)}
                      />
                      {(slotData?.noiDung?.includes('$') || slotData?.noiDung?.includes('\\')) && (
                        <div className="mt-1 p-2 bg-slate-50 border border-dashed border-orange-300 rounded text-sm text-blue-800">
                          <span className="font-semibold text-xs text-gray-500 block mb-1">👀 Xem trước công thức:</span>
                          <MathText content={slotData.noiDung} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pl-4">
                      {['yA', 'yB', 'yC', 'yD'].map((yKey, yIdx) => (
                        <div key={yKey} className="flex gap-3 items-start">
                          <span className="font-semibold text-slate-800 mt-2">{alphabet[yIdx]}</span>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              {qChunk[yIdx] && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  [{qChunk[yIdx].topic}] - {qChunk[yIdx].level}
                                </span>
                              )}
                            </div>
                            <textarea
                              className="w-full bg-white border border-slate-200 p-2 rounded text-sm outline-none resize-y min-h-[40px]"
                              placeholder={`Nội dung ý ${alphabet[yIdx]}...`}
                              value={slotData?.[yKey] || ''}
                              onChange={(e) => updateExamSlot(slotKey, yKey, e.target.value)}
                            />
                            {(slotData?.[yKey]?.includes('$') || slotData?.[yKey]?.includes('\\')) && (
                              <div className="mt-1 p-2 bg-slate-50 border border-dashed border-slate-300 rounded text-sm text-blue-800">
                                <span className="font-semibold text-xs text-gray-500 block mb-1">👀 Xem trước công thức:</span>
                                <MathText content={slotData[yKey]} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {slotData?.dapAnDung && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <p className="text-green-800"><strong>Đáp án:</strong> {slotData.dapAnDung}</p>
                        {slotData.giaiThich && <p className="text-green-700 mt-1"><strong>Giải thích:</strong> {slotData.giaiThich}</p>}
                      </div>
                    )}
                    <GraphPreviewMini hinhAnh={slotData?.hinhAnh} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHẦN III. TRẢ LỜI NGẮN — NÂNG CẤP ĐỘC LẬP TỪNG CÂU */}
        {config.hasTraLoiNgan && saQuestions.length > 0 && (
          <div className="mb-10">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b pb-2 gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                PHẦN III. Câu trắc nghiệm trả lời ngắn
              </h3>
              {p3FilledCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${p3FilledCount} câu hỏi đã điền trong Phần III không?`)) {
                      const keys = saQuestions.map((_, i) => `phan3_cau${i + 1}`).filter(k => examSlots[k]);
                      clearMultipleExamSlots(keys);
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xóa nhanh tất cả câu hỏi trong Phần III"
                >
                  <Trash2 size={12} /> Xóa Phần III ({p3FilledCount})
                </button>
              )}
            </div>
            <div className="space-y-4">
              {saQuestions.map((qChunk, qIndex) => {
                const slotKey = `phan3_cau${qIndex + 1}`;
                const slotData = examSlots[slotKey];
                return (
                  <div key={qIndex} className={`p-4 border rounded-lg text-slate-700 ${slotData ? 'bg-green-50 border-green-300' : 'bg-emerald-50/30 border-emerald-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-emerald-800">Câu {qIndex + 1}.</span>
                      <div className="flex items-center gap-2">
                        {slotData && (
                          <>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã điền từ AI
                            </span>
                            <button
                              onClick={() => toggleLockSlot(slotKey)}
                              className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${lockedSlots.includes(slotKey) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Khóa: Bắt AI chép lại 100% nội dung câu này khi tạo Đề Tương Đương"
                            >
                              {lockedSlots.includes(slotKey) ? <Lock size={12} /> : <Unlock size={12} />} {lockedSlots.includes(slotKey) ? 'Đã khóa' : 'Khóa'}
                            </button>
                            <button
                              onClick={() => handleCreateSimilar(slotKey, slotData, {
                                topic: qChunk[0].topic,
                                dvkt: qChunk[0].dvkt,
                                level: qChunk[0].level,
                                loaiCauHoi: 3
                              })}
                              disabled={generatingSlot === slotKey}
                              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors flex items-center gap-1"
                              title="Tạo câu hỏi tương tự bằng AI"
                            >
                              {generatingSlot === slotKey ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Tạo tương tự
                            </button>
                            <button onClick={() => clearExamSlot(slotKey)} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors flex items-center gap-1" title="Xóa">
                              <Trash2 size={12} /> Xóa
                            </button>
                          </>
                        )}
                        <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                          [{qChunk[0].topic}] - {qChunk[0].level}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <textarea
                        className="w-full bg-white border border-slate-200 p-2 rounded text-sm outline-none resize-y min-h-[60px] focus:border-emerald-400"
                        placeholder="Nội dung câu hỏi trả lời ngắn (yêu cầu ra số cụ thể)..."
                        value={slotData?.noiDung || ''}
                        onChange={(e) => updateExamSlot(slotKey, 'noiDung', e.target.value)}
                      />
                      {(slotData?.noiDung?.includes('$') || slotData?.noiDung?.includes('\\')) && (
                        <div className="mt-1 p-2 bg-slate-50 border border-dashed border-emerald-300 rounded text-sm text-blue-800">
                          <span className="font-semibold text-xs text-gray-500 block mb-1">👀 Xem trước công thức:</span>
                          <MathText content={slotData.noiDung} />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-3 items-center">
                      <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Đáp án (Số):</span>
                      <input
                        type="text"
                        className="flex-1 bg-white border border-emerald-300 p-2 rounded text-sm outline-none focus:border-emerald-500 font-bold text-emerald-700"
                        placeholder="Nhập 1 con số cụ thể (VD: 15, 0.5...)"
                        value={slotData?.dapAnDung || ''}
                        onChange={(e) => updateExamSlot(slotKey, 'dapAnDung', e.target.value)}
                      />
                    </div>

                    {slotData?.giaiThich && (
                      <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                        <p className="text-emerald-800"><strong>Giải thích cách giải:</strong> {slotData.giaiThich}</p>
                      </div>
                    )}
                    <GraphPreviewMini hinhAnh={slotData?.hinhAnh} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHẦN IV. TỰ LUẬN — 3 Ý ĐỘC LẬP a, b, c */}
        {tlQuestions.length > 0 && (
          <div className="mb-10">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b pb-2 gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                {config.hasTraLoiNgan ? 'PHẦN IV.' : 'PHẦN III.'} Câu hỏi tự luận
              </h3>
              {p4FilledCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${p4FilledCount} câu hỏi đã điền trong Phần Tự luận không?`)) {
                      const keys = tlQuestions.map((_, i) => `${phanTLPrefix}_cau${i + 1}`).filter(k => examSlots[k]);
                      clearMultipleExamSlots(keys);
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xóa nhanh tất cả câu hỏi trong Phần Tự luận"
                >
                  <Trash2 size={12} /> Xóa Tự luận ({p4FilledCount})
                </button>
              )}
            </div>
            <div className="space-y-4">
              {tlQuestions.map((qChunk, qIndex) => {
                const phanTL = config.hasTraLoiNgan ? 4 : 3;
                const slotKey = `phan${phanTL}_cau${qIndex + 1}`;
                const slotData = examSlots[slotKey];
                const kienThucQ = slotData?.kienThuc || (hasManualTLConfig ? (tuLuanConfig.questions[qIndex]?.kienThuc || '') : '');
                return (
                  <div key={qIndex} className={`p-4 border rounded-lg text-slate-700 ${slotData ? 'bg-green-50 border-green-300' : 'bg-purple-50/30 border-purple-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="font-bold text-purple-800">
                          Câu {qIndex + 1}.
                          <span className="text-sm font-normal text-red-600 ml-2">({Math.round(qChunk.reduce((s, item) => s + (item.diem || 0), 0) * 100) / 100} điểm)</span>
                          {kienThucQ === 'hinh_hoc' && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">📐 Hình học</span>}
                          {kienThucQ === 'dai_so'   && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">∑ Đại số</span>}
                        </span>
                        {slotData?.noiDung && <span className="text-sm font-normal text-slate-700 mt-1">{slotData.noiDung.replace(/^(?:\*\*|__)?Câu\s*\d+\s*(?:\.|:|\))?(?:\*\*|__)?\s*/i, '')}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {slotData && (
                          <>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã điền từ AI
                            </span>
                            <button
                              onClick={() => toggleLockSlot(slotKey)}
                              className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${lockedSlots.includes(slotKey) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Khóa: Bắt AI chép lại 100% nội dung câu này khi tạo Đề Tương Đương"
                            >
                              {lockedSlots.includes(slotKey) ? <Lock size={12} /> : <Unlock size={12} />} {lockedSlots.includes(slotKey) ? 'Đã khóa' : 'Khóa'}
                            </button>
                            <button
                              onClick={() => handleCreateSimilar(slotKey, slotData, {
                                topic: qChunk[0].topic,
                                dvkt: qChunk[0].dvkt,
                                level: qChunk[0].level,
                                loaiCauHoi: 4,
                                diem:      Math.round(qChunk.reduce((s, item) => s + (item.diem || 0), 0) * 100) / 100,
                                diemA:     qChunk[0]?.diem || 0,
                                diemB:     qChunk[1]?.diem || 0,
                                diemC:     qChunk[2]?.diem || 0,
                                kienThuc:  kienThucQ,
                              })}
                              disabled={generatingSlot === slotKey}
                              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors flex items-center gap-1"
                              title="Tạo câu hỏi tương tự bằng AI"
                            >
                              {generatingSlot === slotKey ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Tạo tương tự
                            </button>
                            <button onClick={() => clearExamSlot(slotKey)} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors flex items-center gap-1" title="Xóa">
                              <Trash2 size={12} /> Xóa
                            </button>
                          </>
                        )}
                        <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          [{qChunk[0].topic}] - {qChunk[0].level}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 pl-4">
                      {[['a', 'yA', 'dapAnA', 'diemA', 0], ['b', 'yB', 'dapAnB', 'diemB', 1], ['c', 'yC', 'dapAnC', 'diemC', 2]].slice(0, qChunk.length).map(([label, yKey, daKey, diKey, yIdx]) => {
                        const matrixDiem = qChunk[yIdx]?.diem || 0;
                        return (
                          <div key={label} className="bg-white/50 p-3 rounded border border-slate-200">
                            <div className="flex gap-3 items-start mb-2">
                              <span className="font-semibold text-slate-800 mt-2">{label})
                                {qChunk[yIdx] && <span className="text-xs font-normal text-purple-600 ml-1">({qChunk[yIdx].level} - {matrixDiem}đ)</span>}
                              </span>
                              <textarea
                                className="flex-1 bg-white border border-slate-200 p-2 rounded text-sm outline-none resize-y min-h-[50px]"
                                placeholder={`Nội dung ý ${label}...`}
                                value={slotData?.[yKey] || ''}
                                onChange={(e) => updateExamSlot(slotKey, yKey, e.target.value)}
                              />
                            </div>
                            {(slotData?.[yKey]?.includes('$') || slotData?.[yKey]?.includes('\\')) && (
                              <div className="mt-1 mb-2 pl-8 p-2 bg-slate-50 border border-dashed border-slate-300 rounded text-sm text-blue-800">
                                <span className="font-semibold text-xs text-gray-500 block mb-1">👀 Xem trước công thức:</span>
                                <MathText content={slotData[yKey]} />
                              </div>
                            )}

                            <div className="flex gap-3 pl-8">
                              <div className="flex-1">
                                <textarea
                                  className="w-full bg-green-50/50 border border-green-200 p-2 rounded text-sm outline-none focus:border-green-400 placeholder-green-400 min-h-[40px] resize-y"
                                  placeholder={`Nội dung đáp án ý ${label}...`}
                                  value={slotData?.[daKey] || ''}
                                  onChange={(e) => updateExamSlot(slotKey, daKey, e.target.value)}
                                />
                                {(slotData?.[daKey]?.includes('$') || slotData?.[daKey]?.includes('\\')) && (
                                  <div className="mt-1 p-2 bg-slate-50 border border-dashed border-green-300 rounded text-sm text-green-800">
                                    <span className="font-semibold text-xs text-green-600 block mb-1">👀 Xem trước công thức đáp án:</span>
                                    <MathText content={slotData[daKey]} />
                                  </div>
                                )}
                              </div>
                              <div className="w-24">
                                <input
                                  type="number"
                                  step="0.25"
                                  className="w-full bg-red-50/50 border border-red-200 p-2 rounded text-sm outline-none focus:border-red-400 text-center text-red-700 font-bold placeholder-red-300"
                                  placeholder={matrixDiem > 0 ? `${matrixDiem}đ` : 'Điểm'}
                                  value={slotData?.[diKey] || ''}
                                  onChange={(e) => updateExamSlot(slotKey, diKey, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {slotData?.giaiThich && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <p className="text-blue-800"><strong>Hướng dẫn chấm chung:</strong> {slotData.giaiThich}</p>
                      </div>
                    )}
                    <GraphPreviewMini hinhAnh={slotData?.hinhAnh} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(mcqQuestions.length === 0 && tfQuestions.length === 0 && saQuestions.length === 0 && tlQuestions.length === 0) && (
          <div className="text-center text-slate-400 italic py-10">
            Bạn cần nhập số lượng câu hỏi/ý vào bảng Ma trận để sinh khung đề thi.
          </div>
        )}
      </div>

      {/* Modal Tạo Tương Tự */}
      <SimilarQuestionModal
        isOpen={similarModalOpen}
        onClose={() => setSimilarModalOpen(false)}
        onSaveToDraft={handleSaveSimilarToDraft}
        slotData={similarSlotData}
        metaInfo={similarMetaInfo}
        examHeader={examHeader}
        otherQuestions={similarOtherQs}
      />

      {/* Modal Xóa Nhiều Câu Hỏi */}
      <BatchDeleteExamModal
        isOpen={batchDeleteModalOpen}
        onClose={() => setBatchDeleteModalOpen(false)}
        mcqQuestions={mcqQuestions}
        tfQuestions={tfQuestions}
        saQuestions={saQuestions}
        tlQuestions={tlQuestions}
        examSlots={examSlots}
        lockedSlots={lockedSlots}
        config={config}
        examConfig={{}}
        onClearSlot={clearExamSlot}
        onClearMultipleSlots={clearMultipleExamSlots}
        onClearAllSlots={clearAllExamSlots}
      />
    </div>
  );
}