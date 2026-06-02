import React, { useRef, useState, useEffect, useCallback } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import Step1_HeaderInfo from './components/Step1_HeaderInfo';
import Step2_MatrixBuilder from './components/Step2_MatrixBuilder';
import Step3_Specification from './components/Step3_Specification';
import Step4_GenerateExam from './components/Step4_GenerateExam';
import Step5_AIGenerator from './components/Step5_AIGenerator';
import Step6_SimilarExam from './components/Step6_SimilarExam';
import { exportToWord } from './utils/exportWord';
import { exportToWordMath, exportToWordMathLatex } from './utils/exportWordMath';
import { useExamStore } from './store/useExamStore';
import { FileDown, BookOpenCheck, Save, FolderOpen, Crown, Gift, X, KeyRound, CreditCard, RefreshCw, ChevronLeft, ChevronRight, Check, Settings, TableProperties, FileText, Bot, Eye, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import UserGuideModal from './components/UserGuideModal';
import { useToast } from './components/Toast';

const STEPS = [
  { id: 0, label: 'Cấu hình', icon: Settings, short: 'Cấu hình' },
  { id: 1, label: 'Ma trận', icon: TableProperties, short: 'Ma trận' },
  { id: 2, label: 'Đặc tả', icon: FileText, short: 'Đặc tả' },
  { id: 3, label: 'AI Sinh Đề', icon: Bot, short: 'AI' },
  { id: 4, label: 'Xem & Xuất', icon: Eye, short: 'Xuất' },
];

// ============================================================
// LINK GOOGLE SHEET CSV CHỨA DANH SÁCH MÃ KÍCH HOẠT
// Hướng dẫn: Vào Google Sheets → File → Chia sẻ → Xuất bản lên web → Chọn CSV → Dán link vào đây
// ============================================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS09VWSBufWgXVoSBsq4R3em--J_l-IXCbqBHRITdgaNGLQsHZ_CKnAQEhch-DjQXXFAVVNUSvRf9BO/pub?gid=0&single=true&output=tsv";

// ============================================================
// LINK GOOGLE APPS SCRIPT WEB APP — QUẢN LÝ TRIAL BẰNG FINGERPRINT
// Hướng dẫn: Deploy Apps Script → Lấy URL → Dán vào đây
// ============================================================
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSLUNjM_Mq4_ZH1lUSOzSrtkIW75T5FsypZ85mVwVh2_pB2Fr1Q11SE9nT-YZxpsO7uA/exec";

// ============================================================
// COMPONENT FOOTER TÁC GIẢ
// ============================================================
const AppFooter = () => (
  <footer className="text-center py-4 mt-auto border-t border-slate-200 text-slate-500 text-sm bg-white/50">
    <p>
      © 2026 Phát triển bởi
      <span className="font-bold text-slate-700 ml-1">Nguyễn Thiện - 0988250112</span>
    </p>
    <p className="text-xs mt-1 text-slate-400">
      PROEXAM MAKER — Hệ thống tạo đề thi & Ma trận thông minh chuẩn GDPT 2018
    </p>
  </footer>
);

export default function App() {
  const config = useExamStore(state => state.config);
  const fileInputRef = useRef(null);

  // ============================================================
  // PAYWALL STATE
  // ============================================================
  const [showPaywall, setShowPaywall] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const toast = useToast();
  const [trialLeft, setTrialLeft] = useState(5);
  const [activationCode, setActivationCode] = useState('');
  const [visitorId, setVisitorId] = useState(null);
  const [isCheckingTrial, setIsCheckingTrial] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');

  // ============================================================
  // EMAIL VERIFICATION STATE (Cấp 2)
  // ============================================================
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [emailVerifyStep, setEmailVerifyStep] = useState(1); // 1: nhập email, 2: nhập code
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // ============================================================
  // BACKEND HEALTH CHECK STATE
  // ============================================================
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true = online, false = offline
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  // ============================================================
  // PAYMENT / CHUYỂN KHOẢN STATE (Cấp 3 - Tự động)
  // ============================================================
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentUserBank, setPaymentUserBank] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('monthly'); // monthly / yearly
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected'
  const [paymentStatusMsg, setPaymentStatusMsg] = useState('');
  const [pollingTimer, setPollingTimer] = useState(null);

  // ============================================================
  // NUMBERING CONFIG STATE
  // ============================================================
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [pendingExportType, setPendingExportType] = useState(null);

  // ============================================================
  // KHỞI TẠO FINGERPRINTJS + ĐỒNG BỘ VỚI GOOGLE SHEETS
  // ============================================================
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const vid = result.visitorId;
        setVisitorId(vid);

        // Nếu đã có URL Apps Script → kiểm tra lượt từ server
        if (GOOGLE_APPS_SCRIPT_URL) {
          try {
            const savedName = localStorage.getItem('userName') || '';
            const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=check&visitorId=${vid}&userName=${encodeURIComponent(savedName)}`);
            const data = await res.json();

            if (data.isPremium) {
              localStorage.setItem('isPremium', 'true');
              setTrialLeft(5);
              return; // Đã Premium, không cần hiện Welcome
            } else {
              localStorage.removeItem('isPremium'); // Thu hồi Premium nếu server trả về false
            }

            // Đồng bộ số lượt từ server về localStorage
            const serverCount = Number(data.count) || 0;
            localStorage.setItem('exportCount', String(serverCount));

            // Kiểm tra email verified
            if (data.emailVerified) {
              setEmailVerified(true);
              const totalLeft = Math.max(0, 10 - serverCount);
              setTrialLeft(totalLeft);

              if (totalLeft > 0 && totalLeft <= 10) {
                setShowWelcome(true);
              }
            } else {
              const left = Math.max(0, 5 - serverCount);
              setTrialLeft(left);

              if (localStorage.getItem('isPremium') !== 'true' && left > 0 && left <= 5) {
                setShowWelcome(true);
              }
            }
          } catch {
            // Không kết nối được server → dùng localStorage fallback
            const isPremium = localStorage.getItem('isPremium');
            const exportCount = localStorage.getItem('exportCount');
            if (isPremium !== 'true') {
              const left = 5 - (Number(exportCount) || 0);
              setTrialLeft(left);
              if (left > 0 && left <= 5) setShowWelcome(true);
            }
          }
        } else {
          // Chưa cấu hình Apps Script URL → dùng localStorage thuần như cũ
          const isPremium = localStorage.getItem('isPremium');
          const exportCount = localStorage.getItem('exportCount');
          if (isPremium !== 'true') {
            const left = 5 - (Number(exportCount) || 0);
            setTrialLeft(left);
            if (left > 0 && left <= 5) setShowWelcome(true);
          }
        }
      } catch {
        // FingerprintJS lỗi → fallback localStorage
        const isPremium = localStorage.getItem('isPremium');
        const exportCount = localStorage.getItem('exportCount');
        if (isPremium !== 'true') {
          const left = 5 - (Number(exportCount) || 0);
          setTrialLeft(left);
          if (left > 0 && left <= 5) setShowWelcome(true);
        }
      }
    };

    initFingerprint();
  }, []);

  // ============================================================
  // AUTO-CHECK BACKEND HEALTH KHI APP LOAD
  // ============================================================
  const checkBackendHealth = async () => {
    setIsCheckingBackend(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s cho Render Free tier thức dậy
      const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const url = isLocalhost ? 'http://localhost:8000' : rawUrl;
      const res = await fetch(`${url}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    } finally {
      setIsCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // ============================================================
  // HÀM ĐẾM LƯỢT VÀ CHẶN XUẤT WORD (FINGERPRINT + GOOGLE SHEETS)
  // ============================================================
  const handleExportWrapper = async (exportFunc) => {
    const isPremium = localStorage.getItem('isPremium');

    if (isPremium === 'true') {
      exportFunc();
      return;
    }

    // Nếu có cấu hình Apps Script URL + đã có visitorId → kiểm tra từ server
    if (GOOGLE_APPS_SCRIPT_URL && visitorId) {
      setIsCheckingTrial(true);
      try {
        // Bước 1: Kiểm tra lượt hiện tại từ server
        const checkRes = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=check&visitorId=${visitorId}&userName=${encodeURIComponent(userName)}`);
        const checkData = await checkRes.json();

        // Nếu server đã đánh dấu Premium
        if (checkData.isPremium) {
          localStorage.setItem('isPremium', 'true');
          setIsCheckingTrial(false);
          exportFunc();
          return;
        }

        const serverCount = Number(checkData.count) || 0;
        const isEmailVerified = checkData.emailVerified === true;

        // ƯU TIÊN: Nếu đã hết 5 lượt đầu nhưng chưa verify email → hiển thị modal verify
        if (serverCount >= 5 && !isEmailVerified) {
          localStorage.setItem('exportCount', '5');
          setTrialLeft(0);
          setIsCheckingTrial(false);
          setEmailVerifyStep(1);
          setEmailInput('');
          setVerificationCodeInput('');
          setShowEmailVerify(true);
          return;
        }

        // Xác định số lượt tối đa (5 nếu chưa verify, 10 nếu đã verify)
        const totalAllowed = isEmailVerified ? 10 : 5;

        // Bước 2: Tăng lượt trên server
        const incRes = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=increment&visitorId=${visitorId}&userName=${encodeURIComponent(userName)}`);
        const incData = await incRes.json();

        const newCount = Number(incData.count) || serverCount + 1;
        const remaining = Math.max(0, totalAllowed - newCount);

        // Đồng bộ về localStorage
        localStorage.setItem('exportCount', String(newCount));
        setTrialLeft(remaining);
        setIsCheckingTrial(false);

        if (remaining > 0) {
          toast.info(`Bạn vừa dùng 1 lượt xuất file. Còn lại ${remaining} lượt miễn phí.`);
        } else {
          toast.warning(`Bạn vừa dùng lượt xuất file cuối cùng. Hãy nâng cấp Premium để tiếp tục sử dụng.`);
        }

        exportFunc();
      } catch (err) {
        // Lỗi mạng → fallback về localStorage
        setIsCheckingTrial(false);
        console.warn('Không kết nối được server trial, dùng localStorage fallback:', err);
        fallbackLocalStorageExport(exportFunc);
      }
    } else {
      // Chưa có Apps Script URL hoặc chưa có visitorId → dùng localStorage thuần
      fallbackLocalStorageExport(exportFunc);
    }
  };

  // Hàm fallback khi không kết nối được server
  const fallbackLocalStorageExport = (exportFunc) => {
    const currentCount = Number(localStorage.getItem('exportCount')) || 0;

    if (currentCount < 5) {
      const newCount = currentCount + 1;
      localStorage.setItem('exportCount', String(newCount));
      const remaining = 5 - newCount;
      setTrialLeft(remaining);

      if (remaining > 0) {
        toast.info(`Bạn vừa dùng 1 lượt xuất file. Còn lại ${remaining} lượt miễn phí.`);
      } else {
        toast.warning(`Bạn vừa dùng lượt xuất file cuối cùng. Hãy nâng cấp Premium để tiếp tục sử dụng.`);
      }

      exportFunc();
    } else {
      setShowPaywall(true);
    }
  };

  // ============================================================
  // EMAIL VERIFICATION HANDLERS (Cấp 2)
  // ============================================================
  const handleSendVerificationCode = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.warning('Vui lòng nhập email hợp lệ!');
      return;
    }
    setIsSendingCode(true);
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=sendCode&email=${encodeURIComponent(emailInput)}&visitorId=${visitorId}`);
      const data = await res.json();
      if (data.success) {
        setEmailVerifyStep(2);
        toast.success('Mã xác nhận đã được gửi đến email của bạn!');
      } else {
        toast.error(data.error || 'Không thể gửi mã xác nhận.');
      }
    } catch (err) {
      toast.error('Lỗi kết nối: ' + err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      toast.warning('Vui lòng nhập đủ 6 chữ số!');
      return;
    }
    setIsVerifyingCode(true);
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=verifyCode&email=${encodeURIComponent(emailInput)}&code=${encodeURIComponent(verificationCodeInput)}&visitorId=${visitorId}&userName=${encodeURIComponent(userName)}`);
      const data = await res.json();
      if (data.success) {
        setEmailVerified(true);
        setShowEmailVerify(false);
        setEmailVerifyStep(1);
        setEmailInput('');
        setVerificationCodeInput('');
        setTrialLeft(5);
        toast.success('Xác nhận email thành công! Bạn được thêm 5 lượt miễn phí (tổng 10 lượt).');
      } else {
        toast.error(data.error || 'Mã xác nhận không đúng hoặc đã hết hạn.');
      }
    } catch (err) {
      toast.error('Lỗi kết nối: ' + err.message);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Hàm kích hoạt mã Premium (đọc danh sách mã từ Google Sheets CSV + đánh dấu trên server)
  const handleActivate = async () => {
    const inputCode = activationCode.trim().toUpperCase();
    if (!inputCode) {
      toast.warning('Vui lòng nhập mã kích hoạt!');
      return;
    }

    setIsCheckingCode(true);
    try {
      // Cách 1: Nếu có Apps Script URL + visitorId → kích hoạt qua server (ưu tiên)
      if (GOOGLE_APPS_SCRIPT_URL && visitorId) {
        const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=activate&visitorId=${visitorId}&code=${encodeURIComponent(inputCode)}&userName=${encodeURIComponent(userName)}`);
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('isPremium', 'true');
          if (userName) localStorage.setItem('userName', userName);
          setShowPaywall(false);
          setActivationCode('');
          toast.success('Kích hoạt thành công! Chào mừng bạn lên Premium vĩnh viễn. Tận hưởng không giới hạn!');
        } else {
          toast.error(data.error || 'Mã không hợp lệ hoặc đã được sử dụng!');
        }
      } else {
        // Cách 2: Fallback — đọc danh sách mã từ Google Sheets CSV (cách cũ)
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) {
          throw new Error('Không thể kết nối đến máy chủ kiểm tra mã.');
        }
        const text = await response.text();
        const validCodes = text.split('\n').map(code => code.trim().toUpperCase()).filter(code => code !== '');

        if (validCodes.includes(inputCode)) {
          localStorage.setItem('isPremium', 'true');
          setShowPaywall(false);
          setActivationCode('');
          toast.success('Kích hoạt thành công! Chào mừng bạn lên Premium vĩnh viễn. Tận hưởng không giới hạn!');
        } else {
          toast.error('Mã không hợp lệ hoặc đã được sử dụng!');
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message + '. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsCheckingCode(false);
    }
  };

  // ============================================================
  // PAYMENT HANDLERS (Chuyển khoản tự động)
  // ============================================================
  const handleSubmitPayment = async () => {
    if (!paymentPhone || paymentPhone.length < 9) {
      toast.warning('Vui lòng nhập số điện thoại hợp lệ!');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // Đổi sang GET để tránh CORS
      const params = new URLSearchParams({
        action: 'submitPayment',
        visitorId,
        userName,
        phone: paymentPhone,
        bankName: paymentUserBank,
        amount: paymentPlan === 'monthly' ? 99000 : 999000,
        selectedPlan: paymentPlan
      });

      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPaymentStatus('pending');
        setPaymentStatusMsg('Yêu cầu đã gửi! Vui lòng nhắn Zalo/SMS cho tác giả kèm ảnh chuyển khoản.');
        toast.success('Gửi yêu cầu thành công! Nhắn Zalo cho tác giả để được duyệt nhanh.');
        // Bắt đầu polling
        startPaymentPolling();
      } else {
        toast.error(data.error || 'Gửi yêu cầu thất bại!');
      }
    } catch (err) {
      toast.error('Lỗi kết nối: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const startPaymentPolling = () => {
    // Poll mỗi 15 giây
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=checkPaymentStatus&visitorId=${visitorId}`);
        const data = await res.json();

        if (data.status === 'approved') {
          clearInterval(timer);
          setPaymentStatus('approved');
          localStorage.setItem('isPremium', 'true');
          setShowPaywall(false);
          setShowPaymentForm(false);
          toast.success('🎉 Thanh toán đã được duyệt! Premium activated!');
        } else if (data.status === 'rejected') {
          clearInterval(timer);
          setPaymentStatus('rejected');
          setPaymentStatusMsg(data.reason || 'Admin từ chối yêu cầu của bạn.');
          toast.error('Yêu cầu bị từ chối: ' + (data.reason || ''));
        } else {
          setPaymentStatus('pending');
          setPaymentStatusMsg('Đang chờ admin duyệt... Vui lòng không tắt trình duyệt.');
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 15000); // 15 giây

    setPollingTimer(timer);

    // Auto-stop sau 30 phút
    setTimeout(() => {
      clearInterval(timer);
      if (paymentStatus === 'pending') {
        setPaymentStatusMsg('Hết thời gian chờ. Bạn có thể kiểm tra lại trạng thái hoặc gửi yêu cầu mới.');
      }
    }, 30 * 60 * 1000);
  };

  const openPaymentForm = () => {
    setShowPaymentForm(true);
    setPaymentStatus(null);
    setPaymentStatusMsg('');
    if (pollingTimer) clearInterval(pollingTimer);
  };

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
    };
  }, [pollingTimer]);

  // ============================================================
  // 1. HÀM LƯU DỰ ÁN (XUẤT FILE JSON)
  // ============================================================
  // ============================================================
  // 1. HÀM LƯU DỰ ÁN (XUẤT FILE JSON) - ĐÃ FIX LỖI MẤT CÂU HỎI
  // ============================================================
  const handleExportProject = () => {
    const state = useExamStore.getState();

    // Gói ghém TOÀN BỘ dữ liệu (Ma trận, Cấu hình điểm, và Câu hỏi đã sinh)
    const projectData = {
      examHeader: state.examHeader,
      matrix: state.matrix,
      config: state.config,
      examConfig: state.examConfig, // Lưu cấu hình điểm
      examSlots: state.examSlots,   // LƯU TOÀN BỘ CÂU HỎI TRÊN KHUNG ĐỀ
      draftQuestions: state.draftQuestions, // Lưu cả nháp (nếu cần)
      generatedExam: state.generatedExam
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.download = `Du_An_Ma_Tran_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // 2. HÀM MỞ DỰ ÁN (TẢI FILE JSON LÊN) - ĐÃ FIX LỖI MẤT CÂU HỎI
  // ============================================================
  const handleImportProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Bơm ĐẦY ĐỦ dữ liệu từ file vào lại "Bộ Não"
        useExamStore.setState({
          examHeader: data.examHeader || useExamStore.getState().examHeader,
          matrix: data.matrix || useExamStore.getState().matrix,
          config: data.config || useExamStore.getState().config,
          examConfig: data.examConfig || useExamStore.getState().examConfig,
          examSlots: data.examSlots || {}, // KHÔI PHỤC CÂU HỎI
          draftQuestions: data.draftQuestions || [],
          generatedExam: data.generatedExam || ''
        });

        toast.success('Tải dự án thành công! Toàn bộ Ma trận và Khung Đề thi đã được khôi phục nguyên vẹn.');
      } catch (error) {
        toast.error('File dự án không hợp lệ hoặc bị hỏng!');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      <UserGuideModal />

      {/* ============================================================ */}
      {/* BANNER CẢNH BÁO BACKEND OFFLINE                              */}
      {/* ============================================================ */}
      {/* BANNER CẢNH BÁO BACKEND OFFLINE */}
      {backendOnline === false && (
        <div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-2.5 flex items-center justify-between gap-4 z-[60]">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <span>⚠️</span>
            <span><strong>Backend đồ thị chưa chạy.</strong> Hãy đợi khoảng 1 phút để máy chủ khởi động.</span>
          </div>
          <button onClick={checkBackendHealth} disabled={isCheckingBackend}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg font-semibold text-xs hover:bg-amber-300 transition-all whitespace-nowrap">
            <RefreshCw size={14} className={isCheckingBackend ? 'animate-spin' : ''} />
            {isCheckingBackend ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* HEADER COMPACT + STEPPER                                     */}
      {/* ============================================================ */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 sticky top-0 z-50">
        <div className="w-full px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-1.5 rounded-lg text-white shadow-md relative">
              <BookOpenCheck size={20} />
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${backendOnline === null ? 'bg-slate-400 animate-pulse' : backendOnline ? 'bg-emerald-500' : 'bg-red-500'
                }`} title={backendOnline === null ? 'Đang kiểm tra...' : backendOnline ? 'Backend: Online' : 'Backend: Offline'} />
            </div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight hidden sm:block">
              PRO<span className="text-indigo-600">EXAM</span>
            </h1>
          </div>

          {/* Stepper Navigation */}
          <nav className="stepper-nav flex-1 overflow-x-auto">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                {idx > 0 && <div className={`stepper-connector ${idx <= currentStep ? 'filled' : ''}`} />}
                <button
                  className={`stepper-item ${currentStep === idx ? 'active' : ''} ${currentStep > idx ? 'completed' : ''}`}
                  onClick={() => setCurrentStep(idx)}
                >
                  <span className="stepper-number">
                    {currentStep > idx ? <Check size={14} strokeWidth={3} /> : idx + 1}
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportProject} />
            <button onClick={() => setShowSimilarModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm bg-indigo-50 border border-indigo-200 text-indigo-750 hover:bg-indigo-100 transition-all"
              title="Ra đề tương tự từ file Word/PDF">
              <Sparkles size={16} />
              <span className="hidden lg:inline">Ra đề tương tự</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              title="Mở Dự án (.json)">
              <FolderOpen size={16} />
              <span className="hidden lg:inline">Mở</span>
            </button>
            <button onClick={handleExportProject}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-sm"
              title="Lưu Dự án">
              <Save size={16} />
              <span className="hidden lg:inline">Lưu</span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-0.5 hidden sm:block" />
            {localStorage.getItem('isPremium') !== 'true' ? (
              <span onClick={() => setShowPaywall(true)}
                className="cursor-pointer text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all whitespace-nowrap">
                🎁 {trialLeft} lượt
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                <Crown size={12} /> Pro
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA — Shows only active step                   */}
      {/* ============================================================ */}
      <main className="w-full flex-grow flex flex-col">
        <div className="flex-grow px-4 py-5">
          <div className="bg-white shadow-lg rounded-2xl border border-slate-200/80 overflow-hidden">
            {/* Step Content */}
            <div className="p-4 md:p-6 step-content-enter" key={currentStep}>
              {currentStep === 0 && <Step1_HeaderInfo />}
              {currentStep === 1 && <Step2_MatrixBuilder />}
              {currentStep === 2 && <Step3_Specification />}
              {currentStep === 3 && <Step5_AIGenerator />}
              {currentStep === 4 && (
                <>
                  <Step4_GenerateExam />
                  {/* Nút xuất Word — chỉ hiện ở bước cuối */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-slate-200">
                    <button
                      onClick={() => { setPendingExportType('normal'); setShowNumberingModal(true); }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg hover:scale-[1.02]">
                      <FileDown size={20} /> Xuất Word (Môn thường)
                    </button>
                    <button
                      onClick={() => { setPendingExportType('math'); setShowNumberingModal(true); }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02]">
                      <FileDown size={20} /> Xuất Word (Toán/Hóa Công thức)
                    </button>
                    <button
                      onClick={() => { setPendingExportType('latex'); setShowNumberingModal(true); }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:shadow-lg hover:scale-[1.02]">
                      <FileDown size={20} /> Xuất Word (LaTeX)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Step Navigation Bar */}
            <div className="step-nav-bar">
              <button
                className={`step-nav-btn prev ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                onClick={() => setCurrentStep(s => Math.max(0, s - 1))}>
                <ChevronLeft size={18} /> Quay lại
              </button>
              <span className="text-sm font-semibold text-slate-400">
                Bước {currentStep + 1} / {STEPS.length}
              </span>
              <button
                className={`step-nav-btn next ${currentStep === STEPS.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
                onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}>
                Tiếp theo <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: CHÀO MỪNG (Welcome Modal)                          */}
      {/* ============================================================ */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative border border-slate-200 modal-content">
            {/* Nút đóng */}
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-4 rounded-full">
                <Gift size={36} className="text-amber-500" />
              </div>
            </div>

            {/* Nội dung */}
            <h2 className="text-2xl font-black text-center text-slate-800 mb-3">
              Chào mừng bạn! 🎉
            </h2>
            <p className="text-center text-slate-600 leading-relaxed mb-2">
              Chào mừng đến với <span className="font-bold text-blue-600">Hệ thống Ra đề AI</span>!
            </p>
            <p className="text-center text-slate-600 leading-relaxed mb-6">
              Thầy/cô đang ở phiên bản <span className="font-semibold text-amber-600">Dùng thử</span> và hiện còn{' '}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-lg mx-1">
                {trialLeft}
              </span>{' '}
              lượt xuất file miễn phí.
            </p>

            {/* Thanh tiến trình lượt còn lại */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Lượt đã dùng</span>
                <span>{emailVerified ? 10 - trialLeft : 5 - trialLeft}/{emailVerified ? 10 : 5}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${(((emailVerified ? 10 : 5) - trialLeft) / (emailVerified ? 10 : 5)) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all text-base"
            >
              Bắt đầu trải nghiệm ngay 🚀
            </button>

            <p
              onClick={() => { setShowWelcome(false); setShowPaywall(true); }}
              className="text-center text-xs text-slate-400 mt-3 cursor-pointer hover:text-blue-500 transition-colors"
            >
              Nâng cấp Premium ngay để dùng không giới hạn →
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1.5: XÁC NHẬN EMAIL (Email Verification Modal)         */}
      {/* ============================================================ */}
      {showEmailVerify && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative border border-slate-200 modal-content">
            {/* Nút đóng */}
            <button
              onClick={() => setShowEmailVerify(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Mail size={36} className="text-blue-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">
              📧 Xác nhận Email
            </h2>
            <p className="text-center text-slate-600 mb-6 text-sm">
              Bạn đã dùng hết 5 lượt miễn phí. Nhập email để nhận thêm <span className="font-bold text-blue-600">5 lượt</span> miễn phí nữa!
            </p>

            {/* Step 1: Nhập email */}
            {emailVerifyStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Địa chỉ email của bạn
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2"
                >
                  {isSendingCode ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Mail size={20} />
                  )}
                  {isSendingCode ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
                </button>
                <button
                  onClick={() => { setShowEmailVerify(false); setShowPaywall(true); }}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Bỏ qua → Mua Premium
                </button>
              </div>
            )}

            {/* Step 2: Nhập mã xác nhận */}
            {emailVerifyStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mã xác nhận (6 chữ số)
                  </label>
                  <input
                    type="text"
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center text-2xl font-bold tracking-widest"
                  />
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Mã đã gửi đến <span className="font-semibold">{emailInput}</span>. Hết hạn sau 10 phút.
                  </p>
                </div>
                <button
                  onClick={handleVerifyEmailCode}
                  disabled={isVerifyingCode || verificationCodeInput.length !== 6}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyingCode ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Check size={20} />
                  )}
                  {isVerifyingCode ? 'Đang xác nhận...' : 'Xác nhận mã'}
                </button>
                <button
                  onClick={() => setEmailVerifyStep(1)}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Quay lại nhập email khác
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: THU PHÍ (Paywall Modal)                            */}
      {/* ============================================================ */}
      {showPaywall && !showPaymentForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative border border-slate-200 modal-content">
            {/* Nút đóng */}
            <button
              onClick={() => { setShowPaywall(false); setShowPaymentForm(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header Modal */}
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 p-4 rounded-full">
                <Crown size={36} className="text-yellow-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">
              👑 Nâng cấp Tài khoản Premium
            </h2>
            <p className="text-center text-red-500 font-semibold mb-6 text-sm">
              Đã hết lượt dùng thử. Vui lòng nâng cấp để sử dụng vĩnh viễn.
            </p>

            {/* Gói Premium */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setPaymentPlan('monthly')}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  paymentPlan === 'monthly'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-black text-lg text-slate-800">99.000đ</div>
                <div className="text-xs text-slate-500">/tháng</div>
              </button>
              <button
                onClick={() => setPaymentPlan('yearly')}
                className={`p-4 rounded-xl border-2 transition-all text-center relative ${
                  paymentPlan === 'yearly'
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Tiết kiệm</div>
                <div className="font-black text-lg text-slate-800">999.000đ</div>
                <div className="text-xs text-slate-500">/năm</div>
              </button>
            </div>

            {/* Nút gửi ảnh CK */}
            <button
              onClick={openPaymentForm}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all text-base mb-4 flex items-center justify-center gap-2"
            >
              <CreditCard size={18} /> Yêu cầu kích hoạt Premium
            </button>

            {/* OR divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="text-xs text-slate-400 font-medium">HOẶC</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {/* Khung nhập mã kích hoạt */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-slate-600" />
                <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">Nhập mã kích hoạt</span>
              </div>
              <input
                type="text"
                value={userName}
                onChange={(e) => { setUserName(e.target.value); localStorage.setItem('userName', e.target.value); }}
                placeholder="Họ tên hoặc SĐT..."
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  placeholder="Nhập mã kích hoạt..."
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent uppercase"
                />
                <button
                  onClick={handleActivate}
                  disabled={isCheckingCode}
                  className={`px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 shadow hover:shadow-md transition-all text-sm whitespace-nowrap ${isCheckingCode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isCheckingCode ? 'Đang kiểm tra...' : 'Kích hoạt'}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
              Liên hệ: <span className="font-bold text-slate-700">Nguyễn Thiện</span> — <span className="font-bold text-blue-600">0988250112</span>
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2.5: GỬI ẢNH CHUYỂN KHOẢN (Payment Form)              */}
      {/* ============================================================ */}
      {showPaywall && showPaymentForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative border border-slate-200 modal-content max-h-[90vh] overflow-y-auto">
            {/* Nút đóng */}
            <button
              onClick={() => { setShowPaymentForm(false); setPaymentStatus(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <CreditCard size={36} className="text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">
              💳 Yêu cầu kích hoạt Premium
            </h2>
            <p className="text-center text-slate-500 mb-5 text-sm">
              Chuyển khoản xong, nhắn Zalo/SMS cho tác giả → Tự động kích hoạt
            </p>

            {/* Thông tin tài khoản nhận */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <p className="font-bold text-blue-700 text-sm mb-2">📌 Chuyển khoản đến:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">Vietcombank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <span className="font-bold text-slate-800 font-mono tracking-widest">9988250112</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chủ TK:</span>
                  <span className="font-bold text-slate-800">NGUYỄN VĂN THIỆN</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200 mt-2">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="font-bold text-emerald-600">
                    {paymentPlan === 'monthly' ? '99.000đ' : '999.000đ'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nội dung CK:</span>
                  <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs">
                    {paymentPhone || 'SĐT của bạn'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form nhập thông tin */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Gói Premium
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentPlan('monthly')}
                    className={`p-2 rounded-lg border text-center text-sm font-semibold transition-all ${
                      paymentPlan === 'monthly'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Tháng — 99.000đ
                  </button>
                  <button
                    onClick={() => setPaymentPlan('yearly')}
                    className={`p-2 rounded-lg border text-center text-sm font-semibold transition-all ${
                      paymentPlan === 'yearly'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Năm — 999.000đ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Số điện thoại của bạn
                </label>
                <input
                  type="tel"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0912345678"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Ngân hàng của bạn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={paymentUserBank}
                  onChange={(e) => setPaymentUserBank(e.target.value)}
                  placeholder="VD: Vietcombank, Techcombank..."
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Hướng dẫn chuyển khoản */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                  <Mail size={16} /> Bước tiếp theo:
                </p>
                <ol className="text-xs text-blue-700 space-y-1.5 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">1.</span>
                    <span>Chuyển khoản <span className="font-bold">{paymentPlan === 'monthly' ? '99.000đ' : '999.000đ'}</span> vào TK trên</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">2.</span>
                    <span>Nhắn <span className="font-bold text-emerald-600">Zalo/SMS: 0988250112</span> kèm ảnh chuyển khoản</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">3.</span>
                    <span>Bấm nút "Gửi yêu cầu" bên dưới → Đợi tác giả duyệt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">4.</span>
                    <span>Premium tự động kích hoạt sau khi duyệt (không cần reload)</span>
                  </li>
                </ol>
              </div>

              {/* Status hiển thị sau khi gửi */}
              {paymentStatus === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                  <p className="font-semibold text-amber-700 text-sm">Đang chờ tác giả duyệt...</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Nhớ nhắn Zalo/SMS: <span className="font-bold">0988250112</span> kèm ảnh CK để được duyệt nhanh!
                  </p>
                </div>
              )}

              {paymentStatus === 'approved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <Check size={24} className="mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-emerald-700 text-sm">✅ Đã duyệt! Premium activated!</p>
                </div>
              )}

              {paymentStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <X size={24} className="mx-auto mb-2 text-red-500" />
                  <p className="font-semibold text-red-700 text-sm">❌ Bị từ chối</p>
                  <p className="text-xs text-red-600 mt-1">{paymentStatusMsg}</p>
                </div>
              )}

              {paymentStatus === null && (
                <button
                  onClick={handleSubmitPayment}
                  disabled={isSubmittingPayment}
                  className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 ${
                    isSubmittingPayment ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmittingPayment ? (
                    <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
                  ) : (
                    <><Check size={18} /> Gửi yêu cầu duyệt</>
                  )}
                </button>
              )}

              {paymentStatus === 'rejected' && (
                <button
                  onClick={() => { setPaymentStatus(null); setPaymentStatusMsg(''); }}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Gửi yêu cầu mới
                </button>
              )}

              <button
                onClick={() => { setShowPaymentForm(false); setPaymentStatus(null); }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: TÙY CHỌN XUẤT ĐỀ THI                                */}
      {/* ============================================================ */}
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
                      name="template"
                      value="ministry"
                      defaultChecked={useExamStore.getState().config.exportTemplate !== 'traditional'}
                      onChange={() => useExamStore.getState().updateConfig('exportTemplate', 'ministry')}
                    />
                    <span className="font-medium">Chuẩn Bộ GD&ĐT 2025</span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="template"
                      value="traditional"
                      defaultChecked={useExamStore.getState().config.exportTemplate === 'traditional'}
                      onChange={() => useExamStore.getState().updateConfig('exportTemplate', 'traditional')}
                    />
                    <span className="font-medium">Mẫu Truyền thống</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <p className="font-bold text-slate-700 mb-2">2. Chọn cách Đánh số:</p>
                <button
                  onClick={() => {
                    useExamStore.getState().updateConfig('isContinuousNumbering', true);
                    setShowNumberingModal(false);
                    handleExportWrapper(pendingExportType === 'normal' ? exportToWord : pendingExportType === 'latex' ? exportToWordMathLatex : exportToWordMath);
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
                    useExamStore.getState().updateConfig('isContinuousNumbering', false);
                    setShowNumberingModal(false);
                    handleExportWrapper(pendingExportType === 'normal' ? exportToWord : pendingExportType === 'latex' ? exportToWordMathLatex : exportToWordMath);
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
                    checked={config.showCompetencySymbol !== false}
                    onChange={(e) => useExamStore.getState().updateConfig('showCompetencySymbol', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-medium">Hiển thị ký hiệu Năng lực (NT, TH, VD)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 mt-2">
                  <input
                    type="checkbox"
                    checked={config.showCompetencyCode !== false}
                    onChange={(e) => useExamStore.getState().updateConfig('showCompetencyCode', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-medium">Hiển thị mã năng lực [HH1.1] trong cột YCCĐ</span>
                </label>
              </div>

              <button
                onClick={() => setShowNumberingModal(false)}
                className="w-full py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all text-base mt-2"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {showSimilarModal && (
        <Step6_SimilarExam onClose={() => setShowSimilarModal(false)} />
      )}

      {/* FOOTER ĐƯỢC CHÈN VÀO ĐÂY */}
      <AppFooter />

    </div>
  );
}