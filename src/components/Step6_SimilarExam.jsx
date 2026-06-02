import React, { useState, useEffect } from 'react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { useExamStore } from '../store/useExamStore';
import { useToast } from './Toast';
import {
  Upload, FileText, Settings, Bot, ArrowLeft, RefreshCw,
  Check, X, FileDown, Plus, Minus, HelpCircle, Eye, Info, Sparkles, KeyRound, Cpu,
  Copy, CheckCheck, ClipboardList, Pencil
} from 'lucide-react';
import {
  analyzeExamWithAI,
  generateSimilarQuestions,
  parseExamFileViaBackend,
  normalizeQuestion,
  fixJsonEscapes,
  buildAnalyzePromptForCopy,
  buildGeneratePromptForCopy,
  generateTypstDrawingWithAI,
} from '../utils/analyzeExam';
import ClientGraph from './ClientGraph';

// Render text có thể chứa công thức LaTeX $...$ hoặc $$...$$
const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{String(content)}</Latex>;
};

// Parse dapAnDung của câu Đúng/Sai thành object {a,b,c,d} = 'Đ' | 'S'
// Hỗ trợ: "a-Đ, b-S, c-Đ, d-S" | "ĐSSD" | "Đ,S,S,Đ" | "a-Đ b-S c-Đ d-S"
const parseDSAnswer = (dapAnDung) => {
  if (!dapAnDung) return {};
  const s = String(dapAnDung).trim();
  // Dạng "a-Đ, b-S, c-Đ, d-S" hoặc "a-Đ b-S c-Đ d-S"
  const labelMatch = s.match(/([abcd])[^\wĐSđs]*([ĐSđs])/gi);
  if (labelMatch && labelMatch.length > 0) {
    const result = {};
    labelMatch.forEach(m => {
      const parts = m.match(/([abcd])[^\wĐSđs]*([ĐSđs])/i);
      if (parts) result[parts[1].toLowerCase()] = parts[2].toUpperCase() === 'Đ' || parts[2] === 'Đ' ? 'Đ' : 'S';
    });
    return result;
  }
  // Dạng "ĐSSD" hoặc "Đ,S,S,Đ"
  const chars = s.replace(/[^ĐSđs]/g, '').split('').slice(0, 4);
  if (chars.length === 0) {
    const commaVals = s.split(/[,\s]+/).filter(v => /^[ĐSđs]$/i.test(v)).slice(0, 4);
    if (commaVals.length > 0) {
      const keys = ['a','b','c','d'];
      const result = {};
      commaVals.forEach((v, i) => { result[keys[i]] = (v === 'Đ' || v.toLowerCase() === 'đ') ? 'Đ' : 'S'; });
      return result;
    }
    return {};
  }
  const keys = ['a','b','c','d'];
  const result = {};
  chars.forEach((c, i) => { result[keys[i]] = (c === 'Đ' || c.toLowerCase() === 'đ') ? 'Đ' : 'S'; });
  return result;
};

// Render bảng số liệu bangBieu
const BangBieuTable = ({ bangBieu }) => {
  if (!bangBieu || !bangBieu.data || bangBieu.data.length === 0) return null;
  return (
    <div className="mt-2 overflow-x-auto">
      {bangBieu.tieuDe && (
        <p className="text-xs text-slate-500 italic mb-1">{bangBieu.tieuDe}</p>
      )}
      <table className="text-xs border-collapse border border-slate-300">
        <tbody>
          {bangBieu.data.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-slate-300 px-3 py-1.5 text-slate-700">
                  <MathText content={String(cell)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Render hình ảnh/đồ thị — gọi backend để vẽ matplotlib
const ChartPreview = ({ hinhAnh, apiBaseUrl }) => {
  const [chartSrc, setChartSrc] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!hinhAnh || !hinhAnh.loai || hinhAnh.loai === 'khac') return;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/render-chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hinhAnh),
    })
      .then(r => r.json())
      .then(data => { if (data.base64) setChartSrc(data.base64); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hinhAnh, apiBaseUrl]);

  if (!hinhAnh) return null;
  if (hinhAnh.loai === 'khac') {
    return (
      <div className="mt-2 text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded px-3 py-2">
        [Hình minh họa: {hinhAnh.moTa || '(xem đề gốc)'}]
      </div>
    );
  }
  if (loading) return <div className="mt-2 text-xs text-slate-400">Đang tải biểu đồ...</div>;
  if (chartSrc) {
    return (
      <div className="mt-2">
        <img src={chartSrc} alt="Biểu đồ/Đồ thị" className="max-w-sm rounded border border-slate-200 shadow-sm" />
      </div>
    );
  }
  return null;
};

export default function Step6_SimilarExam({ onClose }) {
  const toast = useToast();
  const geminiApiKeys = useExamStore(state => state.geminiApiKeys);
  const selectedModel = useExamStore(state => state.selectedModel);
  const updateApiSettings = useExamStore(state => state.updateApiSettings);
  const examHeader = useExamStore(state => state.examHeader);
  const examConfig = useExamStore(state => state.examConfig);

  // Api base URL
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const apiBaseUrl = isLocalhost ? 'http://localhost:8000' : rawApiUrl;

  // Sub-steps: 1 (Upload & Parse), 2 (Matrix & Select), 3 (Settings & Run), 4 (Result & Export)
  const [subStep, setSubStep] = useState(1);
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── States cho tính năng Typst/SVG và Xuất Word bản đẹp (Bước 6 only) ──────
  // typstCode: { [examIdx_soCau]: string } — mã Typst cho từng câu trong từng đề
  const [typstCode, setTypstCode] = useState({});
  // typstOpen: { [examIdx_soCau]: bool } — trạng thái mở/đóng panel Typst
  const [typstOpen, setTypstOpen] = useState({});
  // svgOverride: { [examIdx_soCau]: string } — SVG kết quả sau khi render Typst
  const [svgOverride, setSvgOverride] = useState({});
  // typstLoading: { [examIdx_soCau]: bool } — đang render
  const [typstLoading, setTypstLoading] = useState({});
  // typstError: { [examIdx_soCau]: string } — chi tiết lỗi render Typst
  const [typstError, setTypstError] = useState({});
  // typstAiLoading: { [examIdx_soCau]: bool } — AI đang sinh/sửa mã Typst (Cơ chế 3)
  const [typstAiLoading, setTypstAiLoading] = useState({});
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const [parsedText, setParsedText] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  // Ảnh thủ công: { [soCau]: {id, base64, mime, label} } — người dùng upload/dán vào từng câu
  const [manualImages, setManualImages] = useState({});
  // Map id → image object để tra cứu nhanh khi hiển thị hinhAnh.imageRef
  // Gộp cả ảnh từ backend (uploadedImages) và ảnh thủ công (manualImages)
  const imageMap = React.useMemo(() => {
    const map = {};
    uploadedImages.forEach(img => { if (img.id) map[img.id] = img; });
    Object.values(manualImages).forEach(img => { if (img.id) map[img.id] = img; });
    return map;
  }, [uploadedImages, manualImages]);
  const [originalQuestions, setOriginalQuestions] = useState([]);
  const [generatedExams, setGeneratedExams] = useState([]); // Array of exams, each exam is an array of questions
  const [activeExamTab, setActiveExamTab] = useState(0);

  // ── States cho tính năng Copy lệnh thủ công ──────────────────────────────
  const [isCopiedAnalyze, setIsCopiedAnalyze] = useState(false);
  const [isCopiedGenerate, setIsCopiedGenerate] = useState(false);
  const [showManualAnalyze, setShowManualAnalyze] = useState(false);
  const [showManualGenerate, setShowManualGenerate] = useState(false);
  const [manualAnalyzeText, setManualAnalyzeText] = useState('');
  const [manualGenerateText, setManualGenerateText] = useState('');

  // Settings
  const [numExams, setNumExams] = useState(1);
  const [fixedAnswerPos, setFixedAnswerPos] = useState('random'); // random, a, b, c, d
  const [fixedTruePropCount, setFixedTruePropCount] = useState('random'); // random, 0, 1, 2, 3, 4
  const [fixedTruePropPositions, setFixedTruePropPositions] = useState([]); // ['a', 'b'] ...

  // API Config States
  const defaultModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview'
  ];

  const [keysText, setKeysText] = useState('');
  const [selectedSelectValue, setSelectedSelectValue] = useState('gemini-2.5-flash');
  const [customModel, setCustomModel] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);

  useEffect(() => {
    if (geminiApiKeys) {
      setKeysText(geminiApiKeys.join('\n'));
    }
    if (selectedModel) {
      if (defaultModels.includes(selectedModel)) {
        setSelectedSelectValue(selectedModel);
        setIsCustomActive(false);
      } else {
        setSelectedSelectValue('custom');
        setCustomModel(selectedModel);
        setIsCustomActive(true);
      }
    }
  }, [geminiApiKeys, selectedModel]);

  const handleModelDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedSelectValue(val);
    if (val === 'custom') {
      setIsCustomActive(true);
      const activeModel = customModel || 'gemini-2.0-flash';
      updateApiSettings(geminiApiKeys, activeModel);
    } else {
      setIsCustomActive(false);
      updateApiSettings(geminiApiKeys, val);
    }
  };

  const handleCustomModelChange = (e) => {
    const val = e.target.value;
    setCustomModel(val);
    updateApiSettings(geminiApiKeys, val);
  };

  const handleApiKeysChange = (e) => {
    const text = e.target.value;
    setKeysText(text);
    const keysArray = text.split('\n').map(k => k.trim()).filter(k => k !== '');
    const currentModelToSave = selectedSelectValue === 'custom' ? customModel : selectedSelectValue;
    updateApiSettings(keysArray, currentModelToSave || 'gemini-2.0-flash');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // ── Handlers: Ảnh thủ công cho từng câu có hinhAnh.loai === 'khac' ──────────

  // Đọc File/Blob ảnh → lưu vào manualImages + cập nhật imageRef của câu
  const handleManualImageForQuestion = (soCau, imgFile) => {
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const mime = imgFile.type || 'image/png';
      const base64 = dataUrl.split(',')[1];
      const imgId = `manual_q${soCau}`;
      setManualImages(prev => ({
        ...prev,
        [soCau]: { id: imgId, base64, mime, label: `Câu ${soCau} — ảnh thủ công` },
      }));
      // Cập nhật imageRef trong câu hỏi
      setOriginalQuestions(prev => prev.map(q =>
        q.soCau === soCau
          ? { ...q, hinhAnh: { ...(q.hinhAnh || {}), imageRef: imgId } }
          : q
      ));
      toast.success(`Đã thêm ảnh cho câu ${soCau}`);
    };
    reader.readAsDataURL(imgFile);
  };

  // Xử lý paste ảnh từ clipboard vào vùng câu hỏi
  const handleManualImagePaste = (soCau, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          handleManualImageForQuestion(soCau, blob);
          e.preventDefault();
          return;
        }
      }
    }
  };

  // Xóa ảnh thủ công của một câu
  const handleRemoveManualImage = (soCau) => {
    const imgId = `manual_q${soCau}`;
    setManualImages(prev => {
      const next = { ...prev };
      delete next[soCau];
      return next;
    });
    // Xóa imageRef nếu đang trỏ tới ảnh thủ công này
    setOriginalQuestions(prev => prev.map(q =>
      q.soCau === soCau && q.hinhAnh?.imageRef === imgId
        ? { ...q, hinhAnh: { ...q.hinhAnh, imageRef: undefined } }
        : q
    ));
  };

  // Lấy model thực tế đang được chọn trong local state của Step6
  const getActiveModel = () => isCustomActive ? customModel : selectedSelectValue;

  const handleParseAndAnalyze = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file trước!');
      return;
    }
    if (!geminiApiKeys || geminiApiKeys.length === 0) {
      toast.error('Vui lòng nhập Gemini API Key trước khi tiến hành phân tích!');
      return;
    }

    setIsParsing(true);
    try {
      // Step 1: Parse file via Python backend
      const parseResult = await parseExamFileViaBackend(file, apiBaseUrl);
      setParsedText(parseResult.text || '');
      setUploadedImages(parseResult.images || []);

      setIsParsing(false);
      setIsAnalyzing(true);

      // Step 2: Analyze raw text using Gemini (dùng model đang chọn ở Step6)
      // Truyền TẤT CẢ ảnh lên Gemini:
      //   - PDF: ảnh trang (isPageRender) để Gemini đọc hình trong trang
      //   - Word: ảnh nhúng (không có isPageRender) để Gemini nhận diện hình và gán imageRef
      const allImages = parseResult.images || [];
      const pageRenders = allImages.filter(i => i.isPageRender);
      const embedded = allImages.filter(i => !i.isPageRender);
      toast.info(`[DEBUG] Ảnh nhúng: ${embedded.length} → [${embedded.map(i => i.id).join(', ')}]`);
      if (parseResult.debugMedia && parseResult.debugMedia.length > 0) {
        toast.info(`[DEBUG word/media] ${parseResult.debugMedia.slice(0, 8).join(' | ')}${parseResult.debugMedia.length > 8 ? ` ... (+${parseResult.debugMedia.length - 8} files)` : ''}`);
      } else if (!parseResult.debugMedia) {
        toast.warning('[DEBUG] Backend chưa restart — chưa thấy debugMedia');
      }
      const analyzed = await analyzeExamWithAI(parseResult.text, geminiApiKeys, getActiveModel(), allImages);
      setOriginalQuestions(analyzed);
      setSubStep(2);
      toast.success('Phân tích cấu trúc đề thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra: ' + err.message);
    } finally {
      setIsParsing(false);
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelectQuestion = (index) => {
    const updated = [...originalQuestions];
    updated[index]._selected = !updated[index]._selected; // true means generate similar
    setOriginalQuestions(updated);
  };

  const handleSelectAll = (selectForSimilar) => {
    const updated = originalQuestions.map(q => ({
      ...q,
      _selected: selectForSimilar
    }));
    setOriginalQuestions(updated);
  };

  const handleTruePropPositionToggle = (pos) => {
    if (fixedTruePropPositions.includes(pos)) {
      setFixedTruePropPositions(fixedTruePropPositions.filter(p => p !== pos));
    } else {
      if (fixedTruePropPositions.length < Number(fixedTruePropCount)) {
        setFixedTruePropPositions([...fixedTruePropPositions, pos]);
      } else {
        toast.warning(`Bạn chỉ được chọn tối đa ${fixedTruePropCount} mệnh đề đúng.`);
      }
    }
  };

  const handleStartGeneration = async () => {
    const questionsToReplace = originalQuestions.filter(q => q._selected);
    
    if (questionsToReplace.length === 0) {
      // Nếu không chọn câu nào sinh lại, thì chỉ tạo đề y hệt đề gốc
      const exams = [];
      for (let i = 0; i < numExams; i++) {
        exams.push([...originalQuestions]);
      }
      setGeneratedExams(exams);
      setSubStep(4);
      setActiveExamTab(0);
      return;
    }

    setIsGenerating(true);
    try {
      const exams = [];

      for (let i = 0; i < numExams; i++) {
        toast.info(`Đang sinh đề tương tự ${i + 1}/${numExams}...`);
        
        // Gọi AI sinh câu hỏi thay thế cho các câu được chọn
        const settings = {
          fixedAnswerPos,
          fixedTruePropCount: (fixedTruePropCount === 'random' || fixedTruePropCount === 'keep') ? fixedTruePropCount : Number(fixedTruePropCount),
          fixedTruePropPositions: fixedTruePropPositions,
        };

        // Lấy ảnh thủ công của các câu được chọn sinh lại (nếu có)
        const manualImgsForGenerate = Object.entries(manualImages)
          .filter(([soCau]) => questionsToReplace.some(q => q.soCau === Number(soCau) || q.soCau === soCau))
          .map(([, img]) => img);

        const newQuestions = await generateSimilarQuestions(
          questionsToReplace,
          {
            ...settings,
            // Khi MCQ "keep": truyền vị trí đáp án gốc của từng câu MCQ
            perQuestionAnswerPos: fixedAnswerPos === 'keep'
              ? questionsToReplace.reduce((acc, q) => {
                  acc[q.soCau] = q.dapAnDung || '';
                  return acc;
                }, {})
              : null,
            // Khi DS "keep": truyền pattern đúng/sai gốc của từng câu DS
            perQuestionTrueProp: fixedTruePropCount === 'keep'
              ? questionsToReplace
                  .filter(q => q.loaiCauHoi === 2)
                  .reduce((acc, q) => {
                    acc[q.soCau] = q.dapAnDung || '';
                    return acc;
                  }, {})
              : null,
          },
          geminiApiKeys,
          getActiveModel(),
          manualImgsForGenerate  // Ảnh thủ công: Gemini thấy hình vẽ để sinh câu tương tự chính xác hơn
        );

        // Tạo đề thi mới bằng cách ghép câu giữ lại và câu mới sinh
        const examQuestions = originalQuestions.map(q => {
          if (q._selected) {
            // Tìm câu hỏi tương ứng trong kết quả mới sinh
            const newQ = newQuestions.find(nq => nq.soCau === q.soCau);
            if (!newQ) return q;
            // QUAN TRỌNG: luôn ép loaiCauHoi từ câu gốc — AI có thể trả về sai loại
            let merged = { ...q, ...newQ, loaiCauHoi: q.loaiCauHoi, _isNew: true };
            // FIX: Câu mới sinh có số liệu KHÁC câu gốc → KHÔNG kế thừa imageRef (ảnh tĩnh đề gốc)
            // vì ảnh gốc không còn đúng với số liệu mới.
            // Chỉ giữ svgCode nếu AI tự sinh (biểu đồ data-driven), còn imageRef thì xóa.
            if (merged.hinhAnh?.imageRef) {
              merged = { ...merged, hinhAnh: { ...merged.hinhAnh, imageRef: undefined } };
            }
            return merged;
          }
          return { ...q, _isNew: false };
        });

        exams.push(examQuestions);
      }

      setGeneratedExams(exams);
      setSubStep(4);
      setActiveExamTab(0);
      toast.success(`Đã tạo thành công ${numExams} đề tương tự!`);
    } catch (err) {
      console.error(err);
      toast.error('Sinh đề thất bại: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };


  // ── Render mã Typst → SVG qua backend /api/render-typst ─────────────────────
  const handleTypstRender = async (examIdx, soCau) => {
    const key = `${examIdx}_${soCau}`;
    const code = typstCode[key] || '';
    if (!code.trim()) {
      toast.warning('Vui lòng nhập mã Typst trước!');
      return;
    }
    setTypstLoading(prev => ({ ...prev, [key]: true }));
    setTypstError(prev => { const n = {...prev}; delete n[key]; return n; }); // Xóa lỗi cũ
    try {
      const res = await fetch(`${apiBaseUrl}/api/render-typst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success && data.svg) {
        setSvgOverride(prev => ({ ...prev, [key]: data.svg }));
        // Ghi svgCode vào câu hỏi tương ứng để xuất Word bản đẹp dùng được
        setGeneratedExams(prev => prev.map((exam, ei) =>
          ei !== examIdx ? exam :
          exam.map(q =>
            q.soCau !== soCau ? q :
            { ...q, hinhAnh: { ...(q.hinhAnh || {}), loai: 'khac', svgCode: data.svg } }
          )
        ));
        toast.success('Vẽ hình thành công!');
      } else {
        const errMsg = data.error || 'Không rõ';
        setTypstError(prev => ({ ...prev, [key]: errMsg }));
        toast.error('Lỗi render Typst (Xem chi tiết bên dưới)');
      }
    } catch (err) {
      setTypstError(prev => ({ ...prev, [key]: err.message }));
      toast.error('Không kết nối được server: ' + err.message);
    } finally {
      setTypstLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Xuất đề tương tự ra Word bản đẹp qua backend /api/export-similar-docx ──
  const handleExportSimilarDocx = async (examIdx, mode = 'math') => {
    const examQuestions = generatedExams[examIdx];
    if (!examQuestions || examQuestions.length === 0) {
      toast.error('Không có câu hỏi để xuất!');
      return;
    }
    setIsExportingDocx(true);
    try {
      toast.info('Đang tạo file Word bản đẹp từ server...');
      const maDe = String(101 + examIdx);
      const suffix = mode === 'latex' ? '_LaTeX' : mode === 'normal' ? '_ThuongNgay' : '_CongThuc';
      const title = `DE_THI_TUONG_TU_MA_DE_${maDe}${suffix}`;
      // Chuyển imageMap sang object phẳng { id: {base64, mime} }
      const imageMapFlat = {};
      Object.entries(imageMap).forEach(([id, img]) => {
        imageMapFlat[id] = { base64: img.base64, mime: img.mime };
      });
      const body = {
        questions: examQuestions,
        examTitle: `ĐỀ THI TƯƠNG TỰ - MÃ ĐỀ ${maDe}`,
        examHeader: examHeader || {},
        examConfig: examConfig || {},
        imageMap: imageMapFlat,
        mode: mode,
      };
      const res = await fetch(`${apiBaseUrl}/api/export-similar-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Lỗi server: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.docx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast.success('Tải file Word bản đẹp thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi xuất file: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // ── Handler: Sao chép Prompt vẽ hình Typst bằng AI ────────────────────────
  const handleCopyAiPrompt = async (q) => {
    try {
      let qText = `Câu ${q.soCau}: ${q.noiDung || ''}`;
      if (q.loaiCauHoi === 1) {
        qText += `\nA. ${q.dapAnA || ''}\nB. ${q.dapAnB || ''}\nC. ${q.dapAnC || ''}\nD. ${q.dapAnD || ''}`;
      } else if (q.loaiCauHoi === 2) {
        qText += `\na) ${q.yA || ''}\nb) ${q.yB || ''}\nc) ${q.yC || ''}\nd) ${q.yD || ''}`;
      }
      
      const promptText = `Tôi có một câu hỏi gốc với hình ảnh đi kèm, và tôi vừa tạo một câu hỏi mới tương tự.
Hãy viết mã Typst (sử dụng thư viện cetz để vẽ hình) để vẽ hình phù hợp với CÂU HỎI MỚI này.

[CÂU HỎI MỚI]:
${qText}

CÁC QUY TẮC CÚ PHÁP QUAN TRỌNG ĐỂ TRÁNH LỖI BIÊN DỊCH:
1. IMPORT VÀ SETUP TRANG:
   Luôn bắt đầu bằng:
   \`\`\`typst
   #import "@preview/cetz:0.3.2": canvas, draw
   #set page(width: auto, height: auto, margin: 0.2cm) // Dùng auto để trang khít hình vẽ, tránh bị cắt
   #canvas({
     import draw: *
     // Các lệnh vẽ ở đây
   })
   \`\`\`

2. TUYỆT ĐỐI KHÔNG DÙNG LỆNH LATEX TRONG TYPST:
   Mã Typst có cú pháp toán riêng (dùng cặp dấu $...$), KHÔNG hỗ trợ các dấu gạch chéo ngược \\\ của LaTeX. Hãy dịch LaTeX sang ký hiệu Typst:
   - Dùng [alpha] hoặc [$alpha$] thay vì [$\\alpha$] hay [\\alpha].
   - Dùng [beta] hoặc [$beta$] thay vì [$\\beta$].
   - Dùng [pi] hoặc [$pi$] thay vì [$\\pi$].
   - Dùng [Delta] hoặc [$Delta$] thay vì [$\\Delta$].
   - Dùng [$arrow(a)$] hoặc [$arrow(v)$] thay vì [$\\vec{a}$], [$\\vec{v}$].
   - Dùng [$A B$] hoặc [$triangle A B C$] thay vì [$\\triangle ABC$].
   - Dùng [$<=$], [$>=$], [$times$] thay vì [$\\le$], [$\\ge$], [$\\times$].
   - Dùng [$x^2$], [$y_1$] thay vì [$x^2$], [$y_1$].

3. CÚ PHÁP VẼ CƠ BẢN CỦA CETZ 0.3.2 (TẤT CẢ TỌA ĐỘ PHẢI LÀ TUPLE HAI PHẦN TỬ):
   - Đường thẳng: line((x1, y1), (x2, y2), stroke: 1pt + black, mark: (start: none, end: "stealth")) (mark hỗ trợ "stealth", "arrow")
   - Đường tròn: circle((x, y), radius: 1.5, stroke: 1pt + black, fill: none)
   - Hình chữ nhật: rect((x1, y1), (x2, y2), stroke: 1pt + black, fill: none)
   - Nhãn chữ (nhãn điểm, số liệu): content((x, y), [Nhãn], anchor: "north")
     Các anchor hợp lệ: "north", "south", "east", "west", "north-east", "north-west", "south-east", "south-west", "center".
   - Cung tròn (vẽ góc): arc((x, y), start: 0deg, delta: 90deg, radius: 1)
   - Vẽ đường cong/đồ thị: Nên dùng bezier curve: bezier((x1, y1), (x2, y2), (ctrl_x, ctrl_y)) hoặc vẽ nhiều phân đoạn line ngắn liên tiếp để tạo đường cong, tránh dùng gói "plot" phức tạp dễ lỗi.

4. YÊU CẦU THẨM MỸ:
   - Nét vẽ rõ ràng, phân biệt nét đứt (stroke: (paint: black, dash: "dashed")) cho các nét khuất trong hình học không gian.
   - Nhãn điểm phải nằm lệch ra ngoài hình vẽ một chút (dùng anchor phù hợp hoặc dịch tọa độ của content) để không bị đè lên nét vẽ.
   - Tô màu nhẹ nhàng dễ nhìn (ví dụ: fill: blue.lighten(80%), fill: orange.lighten(90%)).
   - Số liệu và nhãn điểm phải khớp 100% với đề bài được cung cấp.`;

      await navigator.clipboard.writeText(promptText);
      window.open('https://gemini.google.com/gem/ea46e953d2d0?usp=sharing', 'gemini-typst-assistant');
      toast.success('Đã sao chép prompt nhờ AI vẽ hình! Trợ lý Gemini đã được mở ở tab bên cạnh.');
    } catch (err) {
      console.error(err);
      toast.error('Không thể sao chép: ' + err.message);
    }
  };
  // ── Handler: Sao chép Prompt nhờ AI sửa lỗi Typst ───────────────────────
  const handleCopyAiFixPrompt = async (currentCode, errorMsg) => {
    try {
      const promptText = `Đoạn mã Typst vẽ hình bạn sinh ra bị lỗi biên dịch.
Dưới đây là mã Typst hiện tại:
\`\`\`typst
${currentCode}
\`\`\`

Và đây là thông báo lỗi từ trình biên dịch Typst:
\`\`\`
${errorMsg}
\`\`\`

Hãy phân tích lỗi trên và viết lại toàn bộ đoạn mã Typst đã sửa lỗi hoàn chỉnh (chỉ trả về khối \`\`\`typst ... \`\`\`).`;

      await navigator.clipboard.writeText(promptText);
      window.open('https://gemini.google.com/gem/ea46e953d2d0?usp=sharing', 'gemini-typst-assistant');
      toast.success('Đã sao chép prompt nhờ AI sửa lỗi Typst! Trợ lý Gemini đã được mở ở tab bên cạnh.');
    } catch (err) {
      console.error(err);
      toast.error('Không thể sao chép: ' + err.message);
    }
  };

  // ── Cơ chế 3: Tự động sinh mã Typst bằng AI → điền vào editor → tự render ──
  const handleAutoAiDraw = async (q) => {
    if (!geminiApiKeys || geminiApiKeys.length === 0) {
      toast.error('Chưa cấu hình API Key! Vui lòng nhập Gemini API Key.');
      return;
    }
    const key = `${activeExamTab}_${q.soCau}`;
    setTypstAiLoading(prev => ({ ...prev, [key]: true }));
    try {
      toast.info('Đang nhờ AI sinh mã Typst vẽ hình...');
      const typstResult = await generateTypstDrawingWithAI(q, geminiApiKeys, getActiveModel(), null);
      // Điền code vào editor
      setTypstCode(prev => ({ ...prev, [key]: typstResult }));
      // Mở editor nếu chưa mở
      setTypstOpen(prev => ({ ...prev, [key]: true }));
      toast.info('AI đã sinh mã Typst, đang biên dịch hình...');
      // Tự động render ngay
      await _autoRenderTypst(key, typstResult, q.soCau);
    } catch (err) {
      console.error('[Auto AI Draw]', err);
      toast.error('AI không thể sinh mã Typst: ' + err.message);
    } finally {
      setTypstAiLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Cơ chế 3: Tự động sửa lỗi Typst bằng AI → cập nhật editor → tự render ─
  const handleAutoAiFixTypst = async (q, currentKey) => {
    if (!geminiApiKeys || geminiApiKeys.length === 0) {
      toast.error('Chưa cấu hình API Key! Vui lòng nhập Gemini API Key.');
      return;
    }
    const key = currentKey;
    const currentCode = typstCode[key] || '';
    const currentError = typstError[key] || '';
    if (!currentCode || !currentError) {
      toast.warning('Cần có mã Typst và thông báo lỗi để sửa.');
      return;
    }
    setTypstAiLoading(prev => ({ ...prev, [key]: true }));
    try {
      toast.info('Đang nhờ AI sửa lỗi Typst...');
      const fixed = await generateTypstDrawingWithAI(
        q,
        geminiApiKeys,
        getActiveModel(),
        { code: currentCode, errorMsg: currentError }
      );
      setTypstCode(prev => ({ ...prev, [key]: fixed }));
      toast.info('AI đã sửa mã Typst, đang biên dịch lại...');
      await _autoRenderTypst(key, fixed, q.soCau);
    } catch (err) {
      console.error('[Auto AI Fix Typst]', err);
      toast.error('AI không thể sửa lỗi Typst: ' + err.message);
    } finally {
      setTypstAiLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Helper nội bộ: render Typst với code cho sẵn (dùng bởi Cơ chế 3) ────────
  const _autoRenderTypst = async (key, code, soCau) => {
    if (!code || !code.trim()) return;
    const [examIdxStr] = key.split('_');
    const examIdx = Number(examIdxStr);
    setTypstLoading(prev => ({ ...prev, [key]: true }));
    setTypstError(prev => { const n = {...prev}; delete n[key]; return n; });
    try {
      const res = await fetch(`${apiBaseUrl}/api/render-typst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success && data.svg) {
        setSvgOverride(prev => ({ ...prev, [key]: data.svg }));
        setGeneratedExams(prev => prev.map((exam, ei) =>
          ei !== examIdx ? exam :
          exam.map(q =>
            q.soCau !== soCau ? q :
            { ...q, hinhAnh: { ...(q.hinhAnh || {}), loai: 'khac', svgCode: data.svg } }
          )
        ));
        toast.success('Vẽ hình thành công!');
      } else {
        const errMsg = data.error || 'Không rõ';
        setTypstError(prev => ({ ...prev, [key]: errMsg }));
        toast.error('AI đã sinh mã nhưng biên dịch bị lỗi — hãy dùng "AI sửa lỗi" để thử lại.');
      }
    } catch (err) {
      setTypstError(prev => ({ ...prev, [key]: err.message }));
      toast.error('Không kết nối được server: ' + err.message);
    } finally {
      setTypstLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Handler: Copy lệnh phân tích đề gốc ─────────────────────────────────
  const handleCopyAnalyzePrompt = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file trước!');
      return;
    }

    let textToUse = parsedText;
    let imagesToUse = uploadedImages;

    // Nếu file chưa được parse (chưa bấm nút auto), tự parse ngay bây giờ
    if (!textToUse) {
      setIsParsing(true);
      try {
        const parseResult = await parseExamFileViaBackend(file, apiBaseUrl);
        textToUse  = parseResult.text   || '';
        imagesToUse = parseResult.images || [];
        setParsedText(textToUse);
        setUploadedImages(imagesToUse);
        toast.success('Đã trích xuất file thành công!');
      } catch (err) {
        toast.error('Không thể trích xuất file: ' + err.message);
        return;
      } finally {
        setIsParsing(false);
      }
    }

    try {
      const promptText = buildAnalyzePromptForCopy(textToUse, imagesToUse);
      await navigator.clipboard.writeText(promptText);
      setIsCopiedAnalyze(true);
      setTimeout(() => setIsCopiedAnalyze(false), 3000);
      setShowManualAnalyze(true);
      toast.success('Đã copy lệnh phân tích! Dán vào Gemini/ChatGPT rồi copy kết quả JSON về đây.');
    } catch {
      toast.error('Không thể copy vào clipboard. Trình duyệt có thể chặn quyền clipboard.');
    }
  };

  // ── Handler: Nhập kết quả phân tích thủ công ─────────────────────────────
  const handleSubmitManualAnalyze = () => {
    const raw = manualAnalyzeText.trim();
    if (!raw) {
      toast.error('Vui lòng dán kết quả JSON từ Gemini vào ô văn bản!');
      return;
    }
    try {
      // Xóa markdown code block nếu có (```json ... ```)
      let clean = raw;
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```'))  clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        parsed = JSON.parse(fixJsonEscapes(clean));
      }

      // Hỗ trợ cả {cauHoi:[...]} và {...questions:[...]}
      if (!Array.isArray(parsed)) {
        if (parsed.cauHoi    && Array.isArray(parsed.cauHoi))    parsed = parsed.cauHoi;
        else if (parsed.questions && Array.isArray(parsed.questions)) parsed = parsed.questions;
        else throw new Error('Kết quả không phải JSON array hợp lệ');
      }
      if (parsed.length === 0) throw new Error('Mảng câu hỏi rỗng');

      const normalized = parsed.map((q, idx) => normalizeQuestion({
        ...q,
        soCau:     q.soCau || (idx + 1),
        _selected: false,
      }));

      setOriginalQuestions(normalized);
      setSubStep(2);
      setShowManualAnalyze(false);
      setManualAnalyzeText('');
      toast.success(`Đã nhập ${normalized.length} câu hỏi từ kết quả phân tích!`);
    } catch (err) {
      toast.error('JSON không hợp lệ: ' + err.message);
    }
  };

  // ── Handler: Copy lệnh sinh đề tương tự ─────────────────────────────────
  const handleCopyGeneratePrompt = async () => {
    const questionsToReplace = originalQuestions.filter(q => q._selected);
    if (questionsToReplace.length === 0) {
      toast.warning('Chưa chọn câu nào để sinh lại! Vào Bước 2 để tick các câu muốn thay đổi.');
      return;
    }

    const settings = {
      fixedAnswerPos,
      fixedTruePropCount: (fixedTruePropCount === 'random' || fixedTruePropCount === 'keep')
        ? fixedTruePropCount
        : Number(fixedTruePropCount),
      fixedTruePropPositions,
      perQuestionAnswerPos: fixedAnswerPos === 'keep'
        ? questionsToReplace.reduce((acc, q) => { acc[q.soCau] = q.dapAnDung || ''; return acc; }, {})
        : null,
      perQuestionTrueProp: fixedTruePropCount === 'keep'
        ? questionsToReplace.filter(q => q.loaiCauHoi === 2)
            .reduce((acc, q) => { acc[q.soCau] = q.dapAnDung || ''; return acc; }, {})
        : null,
    };

    try {
      let promptText = buildGeneratePromptForCopy(questionsToReplace, settings);
      // Thêm ghi chú nếu có ảnh thủ công để người dùng nhớ đính kèm
      const manualImgsForQ = Object.entries(manualImages)
        .filter(([soCau]) => questionsToReplace.some(q => String(q.soCau) === String(soCau)));
      if (manualImgsForQ.length > 0) {
        const imgList = manualImgsForQ.map(([soCau]) => `câu ${soCau}`).join(', ');
        promptText += `\n\n⚠️ LƯU Ý: Đề có ${manualImgsForQ.length} ảnh hình vẽ thủ công (${imgList}). Hãy đính kèm ảnh tương ứng vào cuộc trò chuyện khi gửi lệnh này để AI tham chiếu chính xác.`;
      }
      await navigator.clipboard.writeText(promptText);
      setIsCopiedGenerate(true);
      setTimeout(() => setIsCopiedGenerate(false), 3000);
      setShowManualGenerate(true);
      toast.success('Đã copy lệnh sinh đề! Dán vào Gemini/ChatGPT rồi copy kết quả JSON về đây.');
    } catch {
      toast.error('Không thể copy vào clipboard.');
    }
  };

  // ── Handler: Nhập kết quả sinh đề thủ công ──────────────────────────────
  const handleSubmitManualGenerate = () => {
    const raw = manualGenerateText.trim();
    if (!raw) {
      toast.error('Vui lòng dán kết quả JSON từ Gemini vào ô văn bản!');
      return;
    }
    try {
      let clean = raw;
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```'))  clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        parsed = JSON.parse(fixJsonEscapes(clean));
      }

      if (!Array.isArray(parsed)) {
        if (parsed.cauHoi    && Array.isArray(parsed.cauHoi))    parsed = parsed.cauHoi;
        else if (parsed.questions && Array.isArray(parsed.questions)) parsed = parsed.questions;
        else throw new Error('Kết quả không phải JSON array hợp lệ');
      }
      if (parsed.length === 0) throw new Error('Mảng câu hỏi rỗng');

      const questionsToReplace = originalQuestions.filter(q => q._selected);

      // Map 1-đối-1 theo index để gán lại đúng soCau và loaiCauHoi gốc
      const newQuestions = parsed.map((q, idx) => {
        const orig = questionsToReplace[idx];
        if (!orig) return normalizeQuestion(q);
        return normalizeQuestion({
          ...q,
          soCau: orig.soCau,
          loaiCauHoi: orig.loaiCauHoi,
        });
      });

      // Ghép câu giữ nguyên + câu mới — logic giống handleStartGeneration
      const examQuestions = originalQuestions.map(q => {
        if (q._selected) {
          const newQ = newQuestions.find(nq => nq.soCau === q.soCau);
          if (!newQ) return { ...q, _isNew: false };
          // QUAN TRỌNG: luôn ép loaiCauHoi từ câu gốc — AI có thể trả về sai loại
          let merged = { ...q, ...newQ, loaiCauHoi: q.loaiCauHoi, _isNew: true };
          // FIX: Câu mới sinh có số liệu KHÁC câu gốc → KHÔNG kế thừa imageRef (ảnh tĩnh đề gốc)
          // vì ảnh gốc không còn đúng với số liệu mới.
          // Chỉ giữ svgCode nếu AI tự sinh (biểu đồ data-driven), còn imageRef thì xóa.
          if (merged.hinhAnh?.imageRef) {
            merged = { ...merged, hinhAnh: { ...merged.hinhAnh, imageRef: undefined } };
          }
          return merged;
        }
        return { ...q, _isNew: false };
      });

      setGeneratedExams([examQuestions]);
      setSubStep(4);
      setActiveExamTab(0);
      setShowManualGenerate(false);
      setManualGenerateText('');
      toast.success('Đã nhập đề tương tự từ kết quả AI!');
    } catch (err) {
      toast.error('JSON không hợp lệ: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Tạo Đề Thi Tương Tự từ Word/PDF</h2>
              <p className="text-xs text-slate-500">Tải đề gốc lên, phân tích ma trận và tự động tạo ra đề thi tương tự</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="bg-slate-50/50 border-b border-slate-150 px-8 py-3 flex items-center gap-4 shrink-0 text-sm font-semibold text-slate-500">
          <div className={`flex items-center gap-1.5 ${subStep >= 1 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${subStep === 1 ? 'bg-indigo-600 text-white' : subStep > 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>1</span>
            Tải lên & Parse
          </div>
          <div className="h-px w-8 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${subStep >= 2 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${subStep === 2 ? 'bg-indigo-600 text-white' : subStep > 2 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Ma trận Đề Gốc
          </div>
          <div className="h-px w-8 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${subStep >= 3 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${subStep === 3 ? 'bg-indigo-600 text-white' : subStep > 3 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>3</span>
            Cấu hình sinh đề
          </div>
          <div className="h-px w-8 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${subStep >= 4 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${subStep === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
            Kết quả đề thi mới
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          
          {/* STEP 1: UPLOAD & PARSE */}
          {subStep === 1 && (
            <div className="max-w-2xl mx-auto py-4 flex flex-col items-center">
              
              {/* API Cấu Hình */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Cpu size={16} className="text-emerald-500" />
                  Cấu hình AI Gemini
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cột 1: API Key */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-650 flex items-center gap-1">
                      <KeyRound size={12} className="text-slate-400" />
                      <span>Gemini API Key</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={keysText}
                      onChange={handleApiKeysChange}
                      placeholder="Dán Google Gemini API Key vào đây (mỗi dòng 1 key để xoay vòng)..."
                      rows={2}
                      className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>

                  {/* Cột 2: Model */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-650 flex items-center gap-1 mb-1">
                        <Cpu size={12} className="text-slate-400" />
                        <span>Gemini Model</span>
                      </label>
                      
                      <div className="relative">
                        <select
                          value={selectedSelectValue}
                          onChange={handleModelDropdownChange}
                          className="w-full bg-white border-2 border-emerald-400 hover:border-emerald-500 text-slate-800 font-semibold py-2 px-3 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                          <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                          <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                          <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                          <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
                          <option value="custom">✏️ Nhập tên model khác...</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                          <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {isCustomActive && (
                      <div className="mt-2 animate-[fadeIn_0.15s_ease]">
                        <input
                          type="text"
                          value={customModel}
                          onChange={handleCustomModelChange}
                          placeholder="Nhập tên model (vd: gemini-2.0-flash)"
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload area */}
              <div className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center cursor-pointer relative mb-5">
                <input 
                  type="file" 
                  accept=".docx,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText size={36} className="text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-700">
                  {file ? file.name : 'Nhấp hoặc kéo thả file đề thi vào đây'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ file Word và PDF tối đa 15MB</span>
              </div>

              {/* Nút tự động (API) + nút copy lệnh thủ công */}
              <div className="flex gap-2">
                <button
                  onClick={handleParseAndAnalyze}
                  disabled={!file || isParsing || isAnalyzing}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Đang trích xuất văn bản & hình ảnh từ file...
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      AI đang phân tích ma trận và câu hỏi...
                    </>
                  ) : (
                    <>
                      <Bot size={16} />
                      Phân tích đề thi bằng AI
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopyAnalyzePrompt}
                  disabled={!file || isParsing || isAnalyzing}
                  title="Copy lệnh phân tích để gửi Gemini/ChatGPT thủ công"
                  className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all flex items-center gap-1.5 shadow-sm shrink-0 ${
                    isCopiedAnalyze
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isCopiedAnalyze ? <CheckCheck size={15} /> : <Copy size={15} />}
                  {isCopiedAnalyze ? 'Đã copy!' : 'Copy lệnh'}
                </button>
              </div>

              {/* Panel nhập kết quả phân tích thủ công */}
              {showManualAnalyze && (
                <div className="mt-3 border-2 border-indigo-200 rounded-xl bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-800">Dán kết quả phân tích từ Gemini/ChatGPT</span>
                    </div>
                    <button
                      onClick={() => setShowManualAnalyze(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-indigo-600">
                    Dán JSON array câu hỏi mà AI trả về vào đây (có thể có hoặc không có <code>```json```</code>).
                  </p>
                  <textarea
                    value={manualAnalyzeText}
                    onChange={e => setManualAnalyzeText(e.target.value)}
                    placeholder={'[\n  {\n    "soCau": 1,\n    "loaiCauHoi": 1,\n    "noiDung": "...",\n    ...\n  }\n]'}
                    className="w-full min-h-[180px] p-3 border border-indigo-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                    spellCheck={false}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setManualAnalyzeText(''); }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={handleSubmitManualAnalyze}
                      disabled={!manualAnalyzeText.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Nhập kết quả phân tích
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MATRIX & SELECT */}
          {subStep === 2 && (
            <div className="flex flex-col h-full">
              <div className="mb-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 2: Ma Trận Đề Gốc đã nhận diện</h3>
                  <p className="text-xs text-slate-500">Kiểm tra các câu hỏi được trích xuất và tick chọn các câu muốn thay đổi bằng câu mới.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSelectAll(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                  >
                    🔄 Chọn sinh lại tất cả
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                  >
                    ✅ Giữ tất cả gốc
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {originalQuestions.map((q, idx) => {
                  const dsMap = q.loaiCauHoi === 2 ? parseDSAnswer(q.dapAnDung) : {};
                  const dapAnDungUpper = q.loaiCauHoi === 1 ? String(q.dapAnDung || '').trim().toUpperCase() : '';
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border text-sm transition-colors ${
                        q._selected
                          ? 'border-indigo-300 bg-indigo-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-700 text-sm">Câu {q.soCau}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-md font-semibold ${
                            q.loaiCauHoi === 1 ? 'bg-blue-50 text-blue-700' :
                            q.loaiCauHoi === 2 ? 'bg-purple-50 text-purple-700' :
                            q.loaiCauHoi === 3 ? 'bg-teal-50 text-teal-700' :
                            'bg-orange-50 text-orange-700'
                          }`}>
                            {q.loaiCauHoi === 1 ? 'TNKQ' : q.loaiCauHoi === 2 ? 'Đúng/Sai' : q.loaiCauHoi === 3 ? 'Trả lời ngắn' : 'Tự luận'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-md font-semibold ${
                            q.mucDo === 'nhanbiet' ? 'bg-emerald-50 text-emerald-700' :
                            q.mucDo === 'thonghieu' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {q.mucDo === 'nhanbiet' ? 'Nhận biết' : q.mucDo === 'thonghieu' ? 'Thông hiểu' : 'Vận dụng'}
                          </span>
                          {q.chuDe && (
                            <span className="text-xs text-slate-400 italic">{q.chuDe}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleSelectQuestion(idx)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shrink-0 ${
                            q._selected
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {q._selected ? '🔄 Sinh tương tự' : '✅ Giữ gốc'}
                        </button>
                      </div>

                      {/* Card body */}
                      <div className="px-4 py-3 space-y-2.5">
                        {/* Nội dung câu hỏi */}
                        <div className="font-semibold text-slate-800 leading-relaxed">
                          <MathText content={q.noiDung} />
                        </div>

                        {/* Bảng biểu (nếu có) */}
                        {q.bangBieu && <BangBieuTable bangBieu={q.bangBieu} />}

                        {/* Hình ảnh / đồ thị (nếu có) */}
                        {q.hinhAnh && (
                          // Ưu tiên 1: ảnh gốc từ file (Word/PDF) nếu có imageRef
                          q.hinhAnh.imageRef && imageMap[q.hinhAnh.imageRef]
                            ? <div className="mt-2">
                                {imageMap[q.hinhAnh.imageRef].isPageRender
                                  // Page render (ảnh cả trang PDF): giới hạn chiều cao, scroll dọc
                                  ? <div className="border border-slate-200 rounded overflow-hidden" style={{maxHeight: 260, overflowY: 'auto'}}>
                                      <img
                                        src={imageMap[q.hinhAnh.imageRef].base64.startsWith('data:')
                                          ? imageMap[q.hinhAnh.imageRef].base64
                                          : `data:${imageMap[q.hinhAnh.imageRef].mime || 'image/png'};base64,${imageMap[q.hinhAnh.imageRef].base64}`}
                                        alt={q.hinhAnh.moTa || 'Hình ảnh đề gốc'}
                                        className="w-full"
                                      />
                                    </div>
                                  // Ảnh trích xuất riêng lẻ (pdf_draw / pdf_img / Word embed / manual): hiển thị bình thường
                                  : <img
                                      src={imageMap[q.hinhAnh.imageRef].base64.startsWith('data:')
                                        ? imageMap[q.hinhAnh.imageRef].base64
                                        : `data:${imageMap[q.hinhAnh.imageRef].mime || 'image/png'};base64,${imageMap[q.hinhAnh.imageRef].base64}`}
                                      alt={q.hinhAnh.moTa || 'Hình ảnh đề gốc'}
                                      className="max-w-full rounded border border-slate-200 shadow-sm"
                                    />
                                }
                                {q.hinhAnh.moTa && <p className="text-[10px] text-slate-400 mt-0.5 italic">{q.hinhAnh.moTa}</p>}
                              </div>
                            // Ưu tiên 2: vẽ lại biểu đồ từ dữ liệu (cột, tròn, đường, hàm số, vật lý)
                            : q.hinhAnh.loai && q.hinhAnh.loai !== 'khac'
                              ? <ClientGraph hinhAnh={q.hinhAnh} maxHeight={260} />
                              // Fallback: hiển thị mô tả text cho hình không tái tạo được
                              : <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                                  <span>🖼</span>
                                  <span>
                                    {q.hinhAnh.moTa
                                      ? q.hinhAnh.moTa
                                      : q.hinhAnh.tieuDe
                                        ? `Biểu đồ: ${q.hinhAnh.tieuDe}`
                                        : `[Hình minh họa]`}
                                  </span>
                                </div>
                        )}

                        {/* Tải ảnh thủ công — hiện cho câu loai:'khac' để giúp Gemini sinh đề chính xác hơn */}
                        {q.hinhAnh?.loai === 'khac' && (
                          <div className="mt-1.5">
                            {manualImages[q.soCau]
                              ? /* Đã có ảnh thủ công → hiện trạng thái + nút xóa */
                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                                  <span className="text-emerald-600 font-medium">✓ Ảnh thủ công đã thêm</span>
                                  <button
                                    onClick={() => handleRemoveManualImage(q.soCau)}
                                    className="ml-auto text-red-400 hover:text-red-600 transition-colors text-xs"
                                    title="Xóa ảnh thủ công"
                                  >✕ Xóa</button>
                                </div>
                              : /* Chưa có → hiện nút upload + hướng dẫn paste */
                                <div
                                  className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-xs text-amber-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                  tabIndex={0}
                                  onPaste={(e) => handleManualImagePaste(q.soCau, e)}
                                  title="Click để chọn file, hoặc Ctrl+V để dán ảnh từ clipboard"
                                  onClick={() => document.getElementById(`manual-img-input-${q.soCau}`)?.click()}
                                >
                                  <span>📎</span>
                                  <span>Tải ảnh thủ công cho câu này</span>
                                  <span className="ml-auto text-amber-500 text-[10px]">(click hoặc Ctrl+V)</span>
                                  <input
                                    id={`manual-img-input-${q.soCau}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleManualImageForQuestion(q.soCau, e.target.files[0]);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </div>
                            }
                          </div>
                        )}

                        {/* TNKQ: 4 phương án */}
                        {q.loaiCauHoi === 1 && (
                          <div className="grid grid-cols-1 gap-1 mt-1">
                            {[
                              { label: 'A', val: q.dapAnA },
                              { label: 'B', val: q.dapAnB },
                              { label: 'C', val: q.dapAnC },
                              { label: 'D', val: q.dapAnD },
                            ].map(({ label, val }) => {
                              const isCorrect = dapAnDungUpper === label;
                              return (
                                <div
                                  key={label}
                                  className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                    isCorrect
                                      ? 'bg-emerald-50 border border-emerald-200'
                                      : 'bg-slate-50 border border-transparent'
                                  }`}
                                >
                                  <span className={`font-bold shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    {label}.
                                  </span>
                                  <span className={`leading-relaxed ${isCorrect ? 'text-emerald-800 font-semibold' : 'text-slate-700'}`}>
                                    <MathText content={val} />
                                  </span>
                                  {isCorrect && (
                                    <span className="ml-auto shrink-0 text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓</span>
                                  )}
                                </div>
                              );
                            })}
                            {dapAnDungUpper && (
                              <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                                ✓ Đáp án đúng: <span className="font-bold">{dapAnDungUpper}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Đúng/Sai: 4 mệnh đề */}
                        {q.loaiCauHoi === 2 && (
                          <div className="space-y-1 mt-1">
                            {[
                              { label: 'a', val: q.yA },
                              { label: 'b', val: q.yB },
                              { label: 'c', val: q.yC },
                              { label: 'd', val: q.yD },
                            ].filter(({ val }) => val).map(({ label, val }) => {
                              const ds = dsMap[label];
                              return (
                                <div key={label} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-transparent text-sm">
                                  <span className="font-bold text-slate-500 shrink-0">{label})</span>
                                  <span className="text-slate-700 leading-relaxed flex-1">
                                    <MathText content={val} />
                                  </span>
                                  {ds && (
                                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                      ds === 'Đ' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                      {ds}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {q.dapAnDung && (
                              <div className="text-xs text-purple-700 font-semibold mt-0.5">
                                ✓ Đáp án: <span className="font-bold">{q.dapAnDung}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Trả lời ngắn */}
                        {q.loaiCauHoi === 3 && q.dapAnDung && (
                          <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
                            <span className="text-xs font-bold text-teal-700">✓ Đáp án:</span>
                            <span className="text-sm text-teal-800 font-semibold">
                              <MathText content={q.dapAnDung} />
                            </span>
                          </div>
                        )}

                        {/* Tự luận */}
                        {q.loaiCauHoi === 4 && q.dapAn && (
                          <div className="mt-1 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <span className="text-xs font-bold text-orange-700 block mb-1">Hướng dẫn giải:</span>
                            <span className="text-sm text-orange-800 leading-relaxed">
                              <MathText content={q.dapAn} />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between shrink-0 pt-4 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-500">
                  Tổng số: {originalQuestions.length} câu | Chọn sinh lại: <span className="text-indigo-600 font-bold">{originalQuestions.filter(q => q._selected).length}</span> câu | Giữ nguyên: <span className="text-emerald-600 font-bold">{originalQuestions.filter(q => !q._selected).length}</span> câu
                </span>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSubStep(1)}
                    className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
                  >
                    Quay lại
                  </button>
                  <button 
                    onClick={() => setSubStep(3)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    Cấu hình sinh đề <Settings size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SETTINGS & GENERATE */}
          {subStep === 3 && (
            <div className="max-w-3xl mx-auto py-4">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Bước 3: Cấu hình quy luật sinh đề</h3>

              <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                
                {/* 1. Số lượng đề */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-700">Số đề tương tự cần tạo</h4>
                    <p className="text-xs text-slate-400">Ứng dụng sẽ tạo các mã đề thi khác nhau dựa trên các quy định dưới đây</p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button 
                      onClick={() => setNumExams(prev => Math.max(1, prev - 1))}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 transition-colors border-r border-slate-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-6 font-bold text-slate-700 text-base">{numExams}</span>
                    <button 
                      onClick={() => setNumExams(prev => Math.min(4, prev + 1))}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-200"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* 2. Cố định vị trí đáp án */}
                <div>
                  <div className="mb-3">
                    <h4 className="font-bold text-slate-700">Quy định vị trí đáp án đúng (Loại 1 - Trắc nghiệm MCQ)</h4>
                    <p className="text-xs text-slate-400">Thiết lập vị trí cố định của phương án đúng cho các câu hỏi được sinh tương tự</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                    {[
                      { id: 'keep', label: '📌 Giữ nguyên gốc' },
                      { id: 'random', label: '🔀 Ngẫu nhiên' },
                      { id: 'a', label: '👉 Đáp án A' },
                      { id: 'b', label: '👉 Đáp án B' },
                      { id: 'c', label: '👉 Đáp án C' },
                      { id: 'd', label: '👉 Đáp án D' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setFixedAnswerPos(opt.id)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                          fixedAnswerPos === opt.id 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                            : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* 3. Cố định mệnh đề đúng trong câu Đúng/Sai */}
                <div>
                  <div className="mb-3">
                    <h4 className="font-bold text-slate-700">Quy định mệnh đề Đúng/Sai (Loại 2 - Đúng/Sai)</h4>
                    <p className="text-xs text-slate-400">Cố định số lượng và vị trí mệnh đề đúng (ví dụ có chính xác 2 mệnh đề đúng)</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-6 mb-4">
                    {[
                      { id: 'keep', label: '📌 Giữ nguyên gốc' },
                      { id: 'random', label: '🔀 Ngẫu nhiên' },
                      { id: '1', label: '1 mệnh đề đúng' },
                      { id: '2', label: '2 mệnh đề đúng' },
                      { id: '3', label: '3 mệnh đề đúng' },
                      { id: '4', label: '4 mệnh đề đúng' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setFixedTruePropCount(opt.id);
                          setFixedTruePropPositions([]);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                          fixedTruePropCount === opt.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {fixedTruePropCount !== 'random' && fixedTruePropCount !== 'keep' && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-600 mb-2">
                        Chọn vị trí các mệnh đề ĐÚNG (chọn tối đa {fixedTruePropCount} vị trí):
                      </label>
                      <div className="flex gap-3">
                        {['a', 'b', 'c', 'd'].map(pos => {
                          const isSelected = fixedTruePropPositions.includes(pos);
                          return (
                            <button
                              key={pos}
                              onClick={() => handleTruePropPositionToggle(pos)}
                              className={`w-10 h-10 rounded-full font-bold border flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {pos.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="mt-8 flex items-center justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setSubStep(2)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
                >
                  Quay lại
                </button>
                {/* Nút copy lệnh sinh đề thủ công */}
                <button
                  onClick={handleCopyGeneratePrompt}
                  disabled={isGenerating}
                  title="Copy lệnh sinh đề để gửi Gemini/ChatGPT thủ công"
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-all flex items-center gap-1.5 shadow-sm ${
                    isCopiedGenerate
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isCopiedGenerate ? <CheckCheck size={15} /> : <Copy size={15} />}
                  {isCopiedGenerate ? 'Đã copy!' : 'Copy lệnh sinh đề'}
                </button>
                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-350 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Đang sinh đề tương tự bằng AI...
                    </>
                  ) : (
                    <>
                      Bắt đầu tạo đề thi <Bot size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Panel nhập kết quả sinh đề thủ công */}
              {showManualGenerate && (
                <div className="mt-4 border-2 border-indigo-200 rounded-xl bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-800">Dán kết quả sinh đề từ Gemini/ChatGPT</span>
                    </div>
                    <button
                      onClick={() => setShowManualGenerate(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-indigo-600">
                    Dán JSON array câu hỏi tương tự mà AI trả về vào đây. Hệ thống sẽ tự ghép câu mới vào đề và vẽ lại biểu đồ, bảng biểu.
                  </p>
                  <textarea
                    value={manualGenerateText}
                    onChange={e => setManualGenerateText(e.target.value)}
                    placeholder={'[\n  {\n    "soCau": 1,\n    "loaiCauHoi": 1,\n    "noiDung": "...",\n    "dapAnA": "...",\n    ...\n  }\n]'}
                    className="w-full min-h-[180px] p-3 border border-indigo-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                    spellCheck={false}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setManualGenerateText('')}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={handleSubmitManualGenerate}
                      disabled={!manualGenerateText.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Nhập kết quả sinh đề
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: RESULT & EXPORT */}
          {subStep === 4 && (
            <div className="flex flex-col h-full">
              {/* Tab control for multiple exams */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {generatedExams.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveExamTab(idx)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeExamTab === idx 
                          ? 'bg-white text-indigo-700 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Đề tương tự {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleExportSimilarDocx(activeExamTab, 'normal')}
                    disabled={isExportingDocx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-md"
                    title="Xuất Word bản đẹp không render công thức - dùng cho môn không có Toán"
                  >
                    {isExportingDocx ? <RefreshCw size={13} className="animate-spin" /> : <FileDown size={13} />} Môn thường
                  </button>
                  <button
                    onClick={() => handleExportSimilarDocx(activeExamTab, 'math')}
                    disabled={isExportingDocx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-md"
                    title="Xuất Word bản đẹp với công thức Toán/Hóa dạng Equation"
                  >
                    {isExportingDocx ? <RefreshCw size={13} className="animate-spin" /> : <FileDown size={13} />} Toán/Hóa
                  </button>
                  <button
                    onClick={() => handleExportSimilarDocx(activeExamTab, 'latex')}
                    disabled={isExportingDocx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-md"
                    title="Xuất Word bản đẹp giữ nguyên ký hiệu $...$ LaTeX"
                  >
                    {isExportingDocx ? <RefreshCw size={13} className="animate-spin" /> : <FileDown size={13} />} LaTeX
                  </button>
                </div>
              </div>

              {/* Preview exam questions */}
              <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <div className="max-w-4xl mx-auto space-y-8">
                  {generatedExams[activeExamTab]?.map((q, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-xl border bg-white shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
                        q._isNew ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-150'
                      }`}
                    >
                      {q._isNew && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-bl-lg tracking-wider flex items-center gap-0.5">
                          <Bot size={10} /> Mới
                        </div>
                      )}
                      
                      <div className="font-bold text-slate-800 mb-3 flex items-start gap-2">
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md shrink-0">Câu {q.soCau}</span>
                        <div className="pt-0.5 flex-1">
                          <MathText content={q.noiDung} />
                          {/* Bảng số liệu (bangBieu) */}
                          {q.bangBieu && <BangBieuTable bangBieu={q.bangBieu} />}
                          {/* Hình ảnh / đồ thị (hinhAnh) */}
                          {q.hinhAnh && (
                            (() => {
                              const svgKey = `${activeExamTab}_${q.soCau}`;
                              const renderedSvg = svgOverride[svgKey] || q.hinhAnh.svgCode;
                              // Ưu tiên 0: SVG từ Typst hoặc do AI sinh
                              if (renderedSvg) {
                                return (
                                  <div className="mt-2">
                                    <div
                                      className="max-w-sm rounded border border-slate-200 shadow-sm overflow-hidden bg-white p-1"
                                      dangerouslySetInnerHTML={{ __html: renderedSvg }}
                                    />
                                    {q.hinhAnh.moTa && <p className="text-[10px] text-slate-400 mt-0.5 italic">{q.hinhAnh.moTa}</p>}
                                  </div>
                                );
                              }
                              // Ưu tiên 1: ảnh gốc từ file nếu câu giữ nguyên (imageRef còn hợp lệ)
                              if (q.hinhAnh.imageRef && imageMap[q.hinhAnh.imageRef]) {
                                return (
                                  <div className="mt-2">
                                    {imageMap[q.hinhAnh.imageRef].isPageRender
                                      ? <div className="border border-slate-200 rounded overflow-hidden" style={{maxHeight: 260, overflowY: 'auto'}}>
                                          <img
                                            src={imageMap[q.hinhAnh.imageRef].base64.startsWith('data:')
                                              ? imageMap[q.hinhAnh.imageRef].base64
                                              : `data:${imageMap[q.hinhAnh.imageRef].mime || 'image/png'};base64,${imageMap[q.hinhAnh.imageRef].base64}`}
                                            alt={q.hinhAnh.moTa || 'Hình ảnh'}
                                            className="w-full"
                                          />
                                        </div>
                                      : <img
                                          src={imageMap[q.hinhAnh.imageRef].base64.startsWith('data:')
                                            ? imageMap[q.hinhAnh.imageRef].base64
                                            : `data:${imageMap[q.hinhAnh.imageRef].mime || 'image/png'};base64,${imageMap[q.hinhAnh.imageRef].base64}`}
                                          alt={q.hinhAnh.moTa || 'Hình ảnh'}
                                          className="max-w-sm rounded border border-slate-200 shadow-sm"
                                        />
                                    }
                                    {q.hinhAnh.moTa && <p className="text-[10px] text-slate-400 mt-0.5 italic">{q.hinhAnh.moTa}</p>}
                                  </div>
                                );
                              }
                              // Ưu tiên 2: vẽ lại biểu đồ từ dữ liệu
                              if (q.hinhAnh.loai && q.hinhAnh.loai !== 'khac') {
                                return <ClientGraph hinhAnh={q.hinhAnh} maxHeight={240} />;
                              }
                              // Fallback: mô tả text
                              return (
                                <div className="mt-1 text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                                  🖼 {q.hinhAnh.moTa || q.hinhAnh.tieuDe || '[Hình minh họa]'}
                                </div>
                              );
                            })()
                          )}

                          {/* Typst Editor — vẽ hình thủ công / ghi đè hình vẽ (chỉ Bước 6) */}
                          {(() => {
                            const key = `${activeExamTab}_${q.soCau}`;
                            const isOpen = typstOpen[key];
                            const isLoading = typstLoading[key];
                            const isAiLoading = typstAiLoading[key]; // Cơ chế 3
                            return (
                              <div className="mt-2">
                                <button
                                  onClick={() => setTypstOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <Pencil size={10} />
                                  {isOpen ? 'Ẩn trình vẽ Typst' : 'Vẽ hình bằng Typst'}
                                </button>
                                {isOpen && (
                                  <div className="mt-1.5 border border-dashed border-indigo-300 rounded-lg bg-indigo-50/40 p-2.5 space-y-2">
                                    <p className="text-[10px] text-indigo-600">
                                      Nhập mã Typst bên dưới rồi bấm <strong>Vẽ hình</strong>. Hình sẽ hiện trực tiếp và được đưa vào file Word khi xuất.
                                    </p>
                                    <textarea
                                      value={typstCode[key] || ''}
                                      onChange={e => setTypstCode(prev => ({ ...prev, [key]: e.target.value }))}
                                      placeholder={`#set page(width: 8cm, height: 6cm, margin: 0.5cm)\n#set text(size: 10pt)\n// Nhập mã Typst của bạn vào đây...`}
                                      className="w-full h-28 p-2 text-[11px] font-mono border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                                      spellCheck={false}
                                    />
                                    {typstError[key] && (
                                      <div className="bg-red-50/80 border border-red-200 rounded text-[11px] text-red-600 p-2 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        <div className="font-bold mb-1 flex items-center gap-1">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                          Lỗi biên dịch Typst:
                                        </div>
                                        {typstError[key]}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 justify-end flex-wrap">
                                      {svgOverride[key] && (
                                        <button
                                          onClick={() => setSvgOverride(prev => { const n = {...prev}; delete n[key]; return n; })}
                                          className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 rounded px-2 py-0.5 transition-colors mr-auto"
                                        >
                                          Xóa hình đã vẽ
                                        </button>
                                      )}

                                      {/* ── Cơ chế 3: Tự động vẽ bằng AI ── */}
                                      <button
                                        onClick={() => handleAutoAiDraw(q)}
                                        disabled={isAiLoading || isLoading}
                                        className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                        title="[Cơ chế 3] AI tự động viết mã Typst và vẽ hình ngay — không cần copy-paste thủ công"
                                      >
                                        {isAiLoading ? <RefreshCw size={11} className="animate-spin" /> : <Bot size={11} />}
                                        {isAiLoading ? 'AI đang vẽ...' : 'Tự động vẽ'}
                                      </button>

                                      {/* ── Cơ chế 3: AI sửa lỗi tự động ── */}
                                      {typstError[key] && (
                                        <button
                                          onClick={() => handleAutoAiFixTypst(q, key)}
                                          disabled={isAiLoading || isLoading}
                                          className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                          title="[Cơ chế 3] AI tự động sửa lỗi Typst và vẽ lại hình — không cần copy-paste thủ công"
                                        >
                                          {isAiLoading ? <RefreshCw size={11} className="animate-spin" /> : <Bot size={11} />}
                                          {isAiLoading ? 'AI đang sửa...' : 'AI sửa lỗi'}
                                        </button>
                                      )}

                                      {/* ── Thủ công (giữ nguyên) ── */}
                                      <button
                                        onClick={() => handleCopyAiPrompt(q)}
                                        className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-600 text-xs font-bold rounded-lg transition-colors"
                                        title="Copy câu hỏi và chỉ dẫn để dán cho Gemini Assistant viết mã Typst giúp bạn"
                                      >
                                        <Copy size={11} />
                                        Nhờ AI vẽ
                                      </button>
                                      {typstError[key] && (
                                        <button
                                          onClick={() => handleCopyAiFixPrompt(typstCode[key] || '', typstError[key])}
                                          className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 text-xs font-bold rounded-lg transition-colors animate-pulse"
                                          title="Copy lỗi và mã code để nhờ AI sửa lỗi"
                                        >
                                          <Copy size={11} />
                                          Nhờ AI sửa lỗi
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleTypstRender(activeExamTab, q.soCau)}
                                        disabled={isLoading || isAiLoading || !typstCode[key]?.trim()}
                                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
                                      >
                                        {isLoading ? <RefreshCw size={11} className="animate-spin" /> : <Pencil size={11} />}
                                        {isLoading ? 'Đang vẽ...' : 'Vẽ hình'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Options */}
                      {q.loaiCauHoi === 1 && (
                        <div className="grid grid-cols-2 gap-3 pl-12 text-sm text-slate-600">
                          <div><span className="font-bold text-slate-800">A.</span> <MathText content={q.dapAnA} /></div>
                          <div><span className="font-bold text-slate-800">B.</span> <MathText content={q.dapAnB} /></div>
                          <div><span className="font-bold text-slate-800">C.</span> <MathText content={q.dapAnC} /></div>
                          <div><span className="font-bold text-slate-800">D.</span> <MathText content={q.dapAnD} /></div>
                        </div>
                      )}

                      {q.loaiCauHoi === 2 && (
                        <div className="space-y-1.5 pl-12 text-sm text-slate-600">
                          {q.yA && <div><span className="font-bold text-slate-800">a)</span> <MathText content={q.yA} /></div>}
                          {q.yB && <div><span className="font-bold text-slate-800">b)</span> <MathText content={q.yB} /></div>}
                          {q.yC && <div><span className="font-bold text-slate-800">c)</span> <MathText content={q.yC} /></div>}
                          {q.yD && <div><span className="font-bold text-slate-800">d)</span> <MathText content={q.yD} /></div>}
                        </div>
                      )}

                      {/* Loại 3: Trả lời ngắn */}
                      {q.loaiCauHoi === 3 && q.dapAnDung && (
                        <div className="pl-12 text-sm text-slate-600">
                          <MathText content={q.dapAnDung} />
                        </div>
                      )}

                      {/* Loại 4: Tự luận */}
                      {q.loaiCauHoi === 4 && q.dapAn && (
                        <div className="pl-12 text-sm text-slate-600">
                          <MathText content={q.dapAn} />
                        </div>
                      )}

                      {/* Answers & Explanations */}
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                        <div>
                          <span className="font-bold text-slate-700">Đáp án:</span>{' '}
                          <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                            <MathText content={q.dapAnDung || q.dapAn} />
                          </span>
                        </div>
                        {q.mucDo && (
                          <div>
                            <span className="font-bold text-slate-700">Mức độ:</span>{' '}
                            <span className="text-slate-600 capitalize">{q.mucDo}</span>
                          </div>
                        )}
                        {q.giaiThich && (
                          <div className="w-full mt-2 text-slate-400">
                            <span className="font-bold text-slate-600">Lời giải:</span> <MathText content={q.giaiThich} />
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Action bottom bar */}
              <div className="mt-6 flex items-center justify-between shrink-0 pt-4 border-t border-slate-200">
                <button 
                  onClick={() => setSubStep(3)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
                >
                  Quay lại cấu hình
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
