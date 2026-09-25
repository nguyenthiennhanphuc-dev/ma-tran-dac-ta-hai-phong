// src/components/SimilarQuestionModal.jsx
import React, { useState } from 'react';
import { X, ClipboardPaste, Save, ExternalLink, CheckCircle2, AlertTriangle, Eye, Copy, Check, Wand2 } from 'lucide-react';
import { parseExamDraft } from './Step5_AIGenerator';
import { generateSimilarQuestionPrompt, STYLE_DICTIONARY } from '../utils/prompt_generator';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

// Re-export STYLE_DICTIONARY từ prompt_generator để dùng nội bộ
// (đã import ở trên)

const MathText = ({ content }) => {
  if (!content) return null;
  return <Latex>{String(content)}</Latex>;
};

// Preview nhỏ gọn cho 1 câu hỏi đã bóc tách
function QuestionPreviewCard({ q, index }) {
  const loaiLabel = { 1: 'Trắc nghiệm', 2: 'Đúng/Sai', 3: 'Trả lời ngắn', 4: 'Tự luận' };
  return (
    <div className="border border-violet-200 rounded-lg p-3 bg-violet-50 text-sm space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
          Câu {index + 1} — {loaiLabel[q.loaiCauHoi] || 'Không rõ'}
        </span>
      </div>

      {q.noiDung && (
        <p className="text-slate-800 font-medium">
          <MathText content={q.noiDung.replace(/^(?:\*\*)?Câu\s*\d+[:.)]?\s*/i, '')} />
        </p>
      )}

      {q.loaiCauHoi === 1 && (
        <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-slate-700">
          {['A', 'B', 'C', 'D'].map(lbl =>
            q[`dapAn${lbl}`] ? (
              <span key={lbl} className={`px-1 py-0.5 rounded ${q.dapAnDung === lbl ? 'bg-green-100 text-green-800 font-bold' : ''}`}>
                {lbl}. <MathText content={q[`dapAn${lbl}`]} />
              </span>
            ) : null
          )}
        </div>
      )}

      {(q.loaiCauHoi === 2 || (q.loaiCauHoi === 4 && q.yB)) && (
        <div className="space-y-0.5 mt-1 text-xs text-slate-700 pl-2">
          {['A', 'B', 'C', 'D'].map((lbl, i) =>
            q[`y${lbl}`] ? (
              <div key={lbl}><span className="font-semibold">{String.fromCharCode(97 + i)})</span> <MathText content={q[`y${lbl}`]} /></div>
            ) : null
          )}
        </div>
      )}

      {q.loaiCauHoi === 4 && !q.yB && q.yA && (
        <p className="text-xs text-slate-700 pl-2"><MathText content={q.yA} /></p>
      )}

      {q.dapAnDung && (
        <p className="text-xs text-green-700 font-semibold mt-1">Đáp án: {q.dapAnDung}</p>
      )}
    </div>
  );
}

const STYLE_OPTIONS = [
  { value: '', label: 'Mặc định (không chọn phong cách)' },
  { value: STYLE_DICTIONARY.thuan_tinh_toan, label: 'Thuần tính toán' },
  { value: STYLE_DICTIONARY.thuc_te,         label: 'Gắn thực tế đời sống' },
  { value: STYLE_DICTIONARY.lien_mon,         label: 'Liên môn (Lịch sử, Địa lý...)' },
  { value: STYLE_DICTIONARY.hai_huoc,         label: 'Hài hước, bắt trend' },
];

export default function SimilarQuestionModal({
  isOpen, onClose, onSaveToDraft,
  slotData, metaInfo, examHeader, otherQuestions
}) {
  // Tùy chọn sinh prompt
  const [phongCach, setPhongCach]       = useState('');
  const [soLuong, setSoLuong]           = useState(1);
  const [yeuCauThem, setYeuCauThem]     = useState('');
  const [isCopied, setIsCopied]         = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  // [FEATURE: Hình ảnh] Checkbox yêu cầu câu mới có hình ảnh
  const [requireImage, setRequireImage] = useState(false);

  // Paste + preview + save
  const [pastedContent, setPastedContent] = useState('');
  const [status, setStatus]               = useState(''); // 'success' | 'error' | 'parseError' | ''
  const [errorMsg, setErrorMsg]           = useState('');
  const [preview, setPreview]             = useState(null);

  if (!isOpen) return null;

  // ── Sinh prompt & copy ──────────────────────────────────────────────────────
  const handleGenerateAndCopy = async () => {
    if (!slotData || !metaInfo) return;
    try {
      // [FEATURE: Hình ảnh] Gộp requireImage vào yeuCauThem khi tích checkbox
      const yeuCauThemFinal = requireImage
        ? (yeuCauThem ? yeuCauThem + '\nBẮT BUỘC câu mới phải có hình minh họa phù hợp (đồ thị/hình học/biểu đồ).' : 'BẮT BUỘC câu mới phải có hình minh họa phù hợp (đồ thị/hình học/biểu đồ).')
        : yeuCauThem;
      const options = {
        phongCach,
        soLuong,
        yeuCauThem: yeuCauThemFinal,
        cauKhacList: otherQuestions || [],
      };
      const enrichedMeta = {
        ...metaInfo,
        monHoc: examHeader?.monHoc || '',
        namHoc: examHeader?.namHoc || '',
      };
      const prompt = generateSimilarQuestionPrompt(slotData, enrichedMeta, options);
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setHasGenerated(true);
      window.open('https://gemini.google.com/app', '_blank');
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      alert('Lỗi khi copy câu lệnh. Trình duyệt có thể không hỗ trợ clipboard.');
    }
  };

  // ── Paste / Preview / Save ─────────────────────────────────────────────────
  const handlePasteChange = (val) => {
    setPastedContent(val);
    setStatus('');
    setErrorMsg('');
    setPreview(null);
  };

  const handlePreview = () => {
    if (!pastedContent.trim()) {
      setStatus('error');
      setErrorMsg('Vui lòng dán nội dung câu hỏi trước khi xem trước!');
      return;
    }
    try {
      const parsed = parseExamDraft(pastedContent.trim());
      if (parsed.length === 0) {
        setStatus('parseError');
        setErrorMsg('Không tìm thấy câu hỏi nào. Đảm bảo kết quả AI có chứa chữ "Câu X:".');
        setPreview(null);
      } else {
        setPreview(parsed);
        setStatus('');
        setErrorMsg('');
      }
    } catch (e) {
      setStatus('parseError');
      setErrorMsg('Lỗi bóc tách: ' + e.message);
      setPreview(null);
    }
  };

  const handleSave = () => {
    if (!pastedContent.trim()) {
      setStatus('error');
      setErrorMsg('Vui lòng dán nội dung câu hỏi trước khi lưu!');
      return;
    }
    try {
      onSaveToDraft(pastedContent.trim());
      setPastedContent('');
      setStatus('success');
      setPreview(null);
      setTimeout(() => {
        setStatus('');
        setErrorMsg('');
        onClose();
      }, 1000);
    } catch (e) {
      setStatus('parseError');
      setErrorMsg(e.message || 'Lỗi bóc tách câu hỏi.');
    }
  };

  const handleClose = () => {
    setPhongCach('');
    setSoLuong(1);
    setYeuCauThem('');
    setIsCopied(false);
    setHasGenerated(false);
    setPastedContent('');
    setStatus('');
    setErrorMsg('');
    setPreview(null);
    setRequireImage(false); // [FEATURE: Hình ảnh] Reset khi đóng
    onClose();
  };

  const loaiLabel = { 1: 'Trắc nghiệm', 2: 'Đúng/Sai', 3: 'Trả lời ngắn', 4: 'Tự luận' };
  const loai = slotData?.loaiCauHoi || metaInfo?.loaiCauHoi || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 p-2 rounded-lg">
              <Wand2 className="text-violet-600" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tạo câu hỏi tương tự</h3>
              <p className="text-xs text-slate-500">
                {metaInfo?.topic && <span className="font-medium text-violet-600">[{metaInfo.topic}]</span>}
                {' '}{metaInfo?.level && <span className="text-slate-400">· {metaInfo.level}</span>}
                {' '}{loaiLabel[loai] && <span className="text-slate-400">· {loaiLabel[loai]}</span>}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-5">

          {/* ── PHẦN 1: TÙY CHỌN SINH PROMPT ────────────────────── */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-violet-800 flex items-center gap-2">
              <Wand2 size={15} /> Bước 1 — Tùy chỉnh & Sinh câu lệnh
            </p>

            {/* Phong cách */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phong cách ra đề:</label>
              <select
                className="w-full text-sm border border-violet-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={phongCach}
                onChange={e => setPhongCach(e.target.value)}
              >
                {STYLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Số câu */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số câu muốn sinh:</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setSoLuong(n)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                      soLuong === n
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400'
                    }`}
                  >
                    {n} câu
                  </button>
                ))}
              </div>
            </div>

            {/* Yêu cầu thêm */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Yêu cầu thêm <span className="font-normal text-slate-400">(tùy chọn)</span>:
              </label>
              <textarea
                className="w-full text-sm border border-violet-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none"
                rows={2}
                placeholder="VD: tránh dùng hình tam giác, bối cảnh kinh tế Việt Nam, năm 2025..."
                value={yeuCauThem}
                onChange={e => setYeuCauThem(e.target.value)}
              />
            </div>

            {/* Thông tin đề + câu khác */}
            <div className="text-xs text-slate-500 flex flex-wrap gap-3">
              {examHeader?.monHoc && <span>Môn: <b className="text-violet-700">{examHeader.monHoc}</b></span>}
              {examHeader?.namHoc && <span>Năm học: <b className="text-violet-700">{examHeader.namHoc}</b></span>}
              {otherQuestions?.length > 0 && (
                <span className="text-amber-600">Tránh trùng {otherQuestions.length} câu đã có trong đề</span>
              )}
            </div>

            {/* [FEATURE: Hình ảnh] Checkbox yêu cầu hình ảnh */}
            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
              <input
                type="checkbox"
                checked={requireImage}
                onChange={(e) => setRequireImage(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-amber-800">
                🖼️ Yêu cầu câu mới có hình minh họa (đồ thị / hình học / biểu đồ)
              </span>
            </label>

            {/* Nút sinh */}
            <button
              onClick={handleGenerateAndCopy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm shadow transition-all ${
                isCopied
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.01] active:scale-95'
              }`}
            >
              {isCopied ? <><Check size={16} /> Đã copy & mở Gemini!</> : <><Copy size={16} /> Tạo & Copy câu lệnh vào Gemini</>}
            </button>

            {!hasGenerated && (
              <p className="text-xs text-center text-slate-400">Bấm nút trên để sinh câu lệnh, copy vào Gemini, rồi dán kết quả vào bên dưới.</p>
            )}
          </div>

          {/* ── PHẦN 2: DÁN KẾT QUẢ ─────────────────────────────── */}
          <div className={`space-y-3 transition-opacity ${hasGenerated ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <ClipboardPaste size={15} className="text-indigo-600" /> Bước 2 — Dán kết quả từ Gemini
            </p>

            {hasGenerated && (
              <ol className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-0.5 list-decimal list-inside">
                <li>Sang tab Gemini, <strong>dán (Ctrl+V)</strong> câu lệnh và gửi.</li>
                <li>Đợi Gemini trả kết quả, <strong>copy toàn bộ câu hỏi mới</strong>.</li>
                <li>Quay lại đây, <strong>dán vào ô bên dưới</strong> rồi bấm <strong>"Xem trước"</strong>.</li>
              </ol>
            )}

            <textarea
              className="w-full min-h-[160px] p-4 border-2 border-slate-300 rounded-xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 text-slate-800 leading-relaxed transition-all resize-y font-mono text-sm"
              placeholder="[Dán câu hỏi tương tự mà Gemini đã sinh ra vào đây...]"
              value={pastedContent}
              onChange={e => handlePasteChange(e.target.value)}
            />

            {/* Status messages */}
            {(status === 'error' || status === 'parseError') && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {status === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle2 size={16} />
                <span>Đã lưu câu hỏi tương tự vào danh sách Nháp thành công!</span>
              </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Eye size={15} className="text-violet-600" />
                  Xem trước ({preview.length} câu bóc tách được):
                </p>
                {preview.map((q, i) => (
                  <QuestionPreviewCard key={i} q={q} index={i} />
                ))}
                <p className="text-xs text-slate-500 italic">Nếu nội dung đúng, bấm "Lưu vào Nháp" bên dưới.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handlePreview}
            disabled={!hasGenerated || status === 'success'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye size={16} /> Xem trước
          </button>
          <button
            onClick={handleSave}
            disabled={!hasGenerated || status === 'success'}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm shadow transition-all ${
              status === 'success'
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            {status === 'success' ? 'Đã lưu!' : 'Lưu vào Nháp'}
          </button>
        </div>
      </div>
    </div>
  );
}
