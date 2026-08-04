import React, { useState, useEffect } from 'react';
import { useQuickStore } from '../../store/useQuickStore';
import { useExamStore } from '../../store/useExamStore';
import QuickStep1_Import from './QuickStep1_Import';
import QuickStep2_HeaderInfo from './QuickStep2_HeaderInfo';
import QuickStep5_AIGenerator from './QuickStep5_AIGenerator';
import QuickStep6_ViewExport from './QuickStep6_ViewExport';
import { exportToWord } from '../../utils/exportWord';
import { exportToWordMath, exportToWordMathLatex } from '../../utils/exportWordMath';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Settings, 
  Bot, 
  Eye, 
  UploadCloud, 
  FileDown, 
  X 
} from 'lucide-react';

const QUICK_STEPS = [
  { id: 0, label: 'Nhập thô', icon: UploadCloud, short: 'Nhập thô' },
  { id: 1, label: 'Thông tin bìa', icon: Settings, short: 'Bìa đề' },
  { id: 2, label: 'AI Soạn đề', icon: Bot, short: 'AI Soạn' },
  { id: 3, label: 'Xem & Xuất', icon: Eye, short: 'Xem & Xuất' },
];

export default function QuickFlow({ handleExportWrapper, activeStep, setActiveStep }) {
  const quickState = useQuickStore();
  const examStoreKeys = useExamStore(state => state.geminiApiKeys);
  const examStoreModel = useExamStore(state => state.selectedModel);

  // Modal export options state
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [pendingExportType, setPendingExportType] = useState(null); // 'normal' | 'math' | 'latex'

  // Sync API settings from useExamStore to useQuickStore on load
  useEffect(() => {
    if (examStoreKeys && examStoreKeys.length > 0) {
      quickState.updateApiSettings(examStoreKeys, quickState.selectedModel || examStoreModel || 'gemini-2.0-flash');
    }
  }, []);

  const handleExportQuickWord = async (exportType) => {
    const originalExamState = useExamStore.getState();
    const currentQuickState = useQuickStore.getState();

    // Prepare slices of state that need to be copied
    const keysToCopy = [
      'examHeader',
      'matrix',
      'config',
      'examConfig',
      'examSlots',
      'draftQuestions',
      'generatedExam'
    ];

    const originalSlice = {};
    const newSlice = {};

    keysToCopy.forEach(k => {
      originalSlice[k] = originalExamState[k];
      newSlice[k] = currentQuickState[k];
    });

    if (newSlice.config) {
      newSlice.config = { ...newSlice.config, isQuickFlow: true };
    }

    // Temp swap useExamStore state with useQuickStore state
    useExamStore.setState(newSlice);

    // Run the actual export wrapper provided by App.jsx to enforce paywall/trial counts
    try {
      if (exportType === 'normal') {
        await handleExportWrapper(exportToWord);
      } else if (exportType === 'math') {
        await handleExportWrapper(exportToWordMath);
      } else if (exportType === 'latex') {
        await handleExportWrapper(exportToWordMathLatex);
      }
    } catch (error) {
      console.error('Lỗi khi xuất file Word:', error);
    } finally {
      // Restore the original state to useExamStore
      useExamStore.setState(originalSlice);
    }
  };

  return (
    <div className="w-full flex-grow flex flex-col">
      {/* Local Stepper inside QuickFlow container */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
            Tiến trình Sinh đề nhanh
          </h3>
        </div>
        <nav className="flex items-center gap-1.5 md:gap-3 overflow-x-auto max-w-[70%] md:max-w-none">
          {QUICK_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div className={`h-0.5 w-4 md:w-8 bg-slate-200 transition-colors ${idx <= activeStep ? 'bg-indigo-600' : ''}`} />
              )}
              <button
                disabled={idx > 0 && !quickState.matrix[0]?.tenChuDe && idx > activeStep} // Disable steps if not initialized
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeStep === idx
                    ? 'bg-indigo-600 text-white shadow-md'
                    : activeStep > idx
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                }`}
                onClick={() => setActiveStep(idx)}
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px]">
                  {activeStep > idx ? <Check size={10} strokeWidth={3} className="text-indigo-600" /> : idx + 1}
                </span>
                <span className="hidden sm:inline">{step.short}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Steps Content */}
      <div className="p-4 md:p-6 flex-grow step-content-enter" key={activeStep}>
        {activeStep === 0 && <QuickStep1_Import onNext={() => setActiveStep(1)} />}
        {activeStep === 1 && <QuickStep2_HeaderInfo />}
        {activeStep === 2 && <QuickStep5_AIGenerator />}
        {activeStep === 3 && (
          <>
            <QuickStep6_ViewExport />
            
            {/* Word Export Buttons - rendered in QuickFlow wrapper */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-slate-200">
              <button
                onClick={() => { setPendingExportType('normal'); setShowNumberingModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg hover:scale-[1.02]"
              >
                <FileDown size={20} /> Xuất Word (Môn thường)
              </button>
              <button
                onClick={() => { setPendingExportType('math'); setShowNumberingModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02]"
              >
                <FileDown size={20} /> Xuất Word (Toán/Hóa Công thức)
              </button>
              <button
                onClick={() => { setPendingExportType('latex'); setShowNumberingModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:shadow-lg hover:scale-[1.02]"
              >
                <FileDown size={20} /> Xuất Word (LaTeX)
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Step Navigation Bar */}
      <div className="step-nav-bar mt-auto">
        <button
          className={`step-nav-btn prev ${activeStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
          onClick={() => setActiveStep(s => Math.max(0, s - 1))}
        >
          <ChevronLeft size={18} /> Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-400">
          Bước {activeStep + 1} / {QUICK_STEPS.length}
        </span>
        <button
          className={`step-nav-btn next ${activeStep === QUICK_STEPS.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
          onClick={() => setActiveStep(s => Math.min(QUICK_STEPS.length - 1, s + 1))}
        >
          Tiếp theo <ChevronRight size={18} />
        </button>
      </div>

      {/* Numbering and Template Options Modal */}
      {showNumberingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative border border-slate-200 animate-[fadeIn_0.2s_ease]">
            <button
              onClick={() => setShowNumberingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">
              Tùy chọn Xuất Đề thi
            </h2>
            <p className="text-center text-slate-600 mb-6">
              Vui lòng chọn Mẫu đề thi và cách Đánh số câu hỏi.
            </p>

            <div className="space-y-4">
              <div className="mb-4">
                <p className="font-bold text-slate-700 mb-2">1. Chọn Mẫu Đề thi:</p>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="quick-template"
                      value="ministry"
                      defaultChecked={quickState.config.exportTemplate !== 'traditional'}
                      onChange={() => quickState.updateConfig('exportTemplate', 'ministry')}
                    />
                    <span className="font-medium">Chuẩn Bộ GD&ĐT 2025</span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="quick-template"
                      value="traditional"
                      defaultChecked={quickState.config.exportTemplate === 'traditional'}
                      onChange={() => quickState.updateConfig('exportTemplate', 'traditional')}
                    />
                    <span className="font-medium">Mẫu Truyền thống</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <p className="font-bold text-slate-700 mb-2">2. Chọn cách Đánh số:</p>
                <button
                  onClick={() => {
                    quickState.updateConfig('isContinuousNumbering', true);
                    setShowNumberingModal(false);
                    handleExportQuickWord(pendingExportType);
                  }}
                  className="w-full text-left p-4 mb-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all group"
                >
                  <div className="font-bold text-blue-800 text-lg group-hover:text-blue-900">
                    Đánh số liên tục từ 1 đến hết
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    VD: Câu 1, Câu 2... Câu 28, Câu 29
                  </div>
                </button>

                <button
                  onClick={() => {
                    quickState.updateConfig('isContinuousNumbering', false);
                    setShowNumberingModal(false);
                    handleExportQuickWord(pendingExportType);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all group"
                >
                  <div className="font-bold text-emerald-800 text-lg group-hover:text-emerald-900">
                    Bắt đầu lại từ Câu 1 ở mỗi Phần/Dạng
                  </div>
                  <div className="text-sm text-emerald-600 mt-1">
                    VD: Phần I (Câu 1-12), Phần II (Câu 1-4)...
                  </div>
                </button>
              </div>

              <div className="mb-4">
                <p className="font-bold text-slate-700 mb-2">3. Tùy chọn Bảng đặc tả:</p>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={quickState.config.showCompetencySymbol !== false}
                    onChange={(e) => quickState.updateConfig('showCompetencySymbol', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-medium">Hiển thị ký hiệu Năng lực (NT, TH, VD)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 mt-2">
                  <input
                    type="checkbox"
                    checked={quickState.config.showCompetencyCode !== false}
                    onChange={(e) => quickState.updateConfig('showCompetencyCode', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-medium">Hiển thị mã Năng lực (VD: HH1.1, HH1.2)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
