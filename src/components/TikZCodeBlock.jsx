/**
 * TikZCodeBlock.jsx — Hiển thị code TikZ với nút Copy và link Overleaf
 * [FEATURE: Hình ảnh] Component mới — KHÔNG ảnh hưởng các component khác
 * Được dùng trong ClientGraph.jsx khi hinhAnh.loai === 'tikz'
 */
import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function TikZCodeBlock({ code, tieuDe }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!code) return null;

  const handleCopy = async () => {
    try {
      // Wrap code trong document LaTeX đầy đủ để giáo viên paste vào Overleaf luôn
      const fullLatex = `\\documentclass[border=5pt]{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{calc,angles,quotes}\n\\begin{document}\n${code}\n\\end{document}`;
      await navigator.clipboard.writeText(fullLatex);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      // Fallback: copy code TikZ thuần
      try {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      } catch (e2) {
        alert('Không thể copy. Vui lòng chọn text và copy thủ công.');
      }
    }
  };

  const handleOverleaf = () => {
    window.open('https://www.overleaf.com/project', '_blank');
  };

  // Xử lý code: thay \\n thành newline thực để hiển thị đẹp
  const displayCode = code
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ');

  return (
    <div className="my-3 rounded-xl border-2 border-amber-200 bg-amber-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-base">📐</span>
          <div>
            <p className="text-xs font-bold text-amber-900">Hình minh họa (TikZ)</p>
            {tieuDe && (
              <p className="text-xs text-amber-700 font-medium">{tieuDe}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(v => !v)}
          className="p-1 rounded hover:bg-amber-200 transition-colors text-amber-700"
          title={isExpanded ? 'Thu gọn' : 'Xem code TikZ'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Cảnh báo */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
        <span className="text-amber-500 text-xs mt-0.5">⚠️</span>
        <p className="text-xs text-amber-700">
          Hình này phức tạp, cần render bằng <strong>LaTeX/Overleaf</strong>. Copy code dưới đây và paste vào Overleaf để xem hình.
        </p>
      </div>

      {/* Code block */}
      {isExpanded && (
        <div className="relative">
          <pre className="p-4 text-xs font-mono text-slate-800 bg-white overflow-x-auto leading-relaxed whitespace-pre">
            {displayCode}
          </pre>
        </div>
      )}

      {/* Footer: nút Copy + Overleaf */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-t border-amber-200">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
            isCopied
              ? 'bg-green-500 text-white'
              : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400'
          }`}
          title="Copy code TikZ (bọc trong document LaTeX đầy đủ)"
        >
          {isCopied ? <Check size={13} /> : <Copy size={13} />}
          {isCopied ? 'Đã Copy!' : 'Copy code TikZ'}
        </button>
        <button
          onClick={handleOverleaf}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all shadow-sm"
          title="Mở Overleaf để paste và compile TikZ"
        >
          <ExternalLink size={13} />
          Mở Overleaf
        </button>
        <span className="text-xs text-amber-600 ml-auto">
          Paste vào Overleaf → Compile → Xem hình
        </span>
      </div>
    </div>
  );
}
