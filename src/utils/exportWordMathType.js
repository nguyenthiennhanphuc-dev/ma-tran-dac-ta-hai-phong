import { saveAs } from 'file-saver';
import { exportToWord, generateWordDocxBlob } from './exportWord';
import { useExamStore } from '../store/useExamStore';

const REQUEST_TIMEOUT_MS = 90000; // 90 giây tối đa để đợi máy chủ Render khởi động lại

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Danh sách các cổng kết nối MathType theo thứ tự ưu tiên:
// 1. Same-origin proxy (/api/convert-docx) được Vercel rewrite / Vite proxy sang Render -> 100% không bị CORS!
// 2. Local Python backend (chỉ thử khi đang dev local trên localhost)
// 3. Direct Render (fallback)
const CANDIDATE_ENDPOINTS = [
  '/api/convert-docx',
  ...(isLocal ? ['http://localhost:8000/api/convert-docx'] : []),
  'https://latex2mathtypeweb.onrender.com/api/convert-docx'
];

/**
 * Xuất file Word MathType OLE (Equation.DSMT4) theo mô hình Hybrid:
 * 1. Sinh file DOCX nền chuẩn (Section 1 Ngang, Section 2 Dọc) giữ nguyên tag $LaTeX$
 * 2. POST lên API máy chủ chuyển đổi nhúng OLE MathType (có ticker đếm thời gian kiên nhẫn đợi máy chủ)
 * 3. Nếu thành công: tải file .docx MathType (click đúp mở MathType 6/7)
 * 4. Smart Fallback: chỉ khi tất cả máy chủ hết thời gian chờ -> mới chuyển sang bản Word Equation (OMML)
 *
 * @param {Object} options - Tùy chọn xuất
 * @param {Function} [options.onStatus] - Callback cập nhật trạng thái UI (VD: 'connecting', 'waiting', 'converting', 'fallback', 'done')
 */
export async function exportToWordMathType(options = {}) {
  const { onStatus = () => {} } = options;

  // Xác định tên file thông minh theo từng cấu trúc đề thi
  const storeState = useExamStore.getState();
  const examConfig = storeState.examConfig || {};
  const examHeader = storeState.examHeader || {};
  const isCauTrucCongNghe8_7030 = Boolean(examConfig.isCauTrucCongNghe8_7030);
  const isCauTrucToan8_5050 = Boolean(examConfig.isCauTrucToan8_5050);
  const isCauTrucKHTNVao10 = Boolean(examConfig.isCauTrucKHTNVao10);
  const isKHTNMon = Boolean(
    examConfig.subject === 'khtn' ||
    examConfig.isCauTruc4213 ||
    examConfig.isCauTrucKHTNVao10 ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(examHeader.monHoc || '') ||
    /khoa.*h[oọ]c.*t[uự].*nhi[eê]n|khtn/i.test(examConfig.monHoc || '')
  );

  const defaultBaseName = isCauTrucCongNghe8_7030
    ? 'Ma_Tran_Dac_Ta_De_Cong_Nghe_8_7030'
    : (isCauTrucToan8_5050
      ? 'Ma_Tran_Dac_Ta_De_Toan_8_5050'
      : (isCauTrucKHTNVao10
        ? 'Ma_Tran_Dac_Ta_De_KHTN_Vao_10'
        : (isKHTNMon ? 'Ma_Tran_Dac_Ta_De_KHTN_4213' : 'Ma_Tran_Dac_Ta_De_Kiem_Tra')));

  const fileName = options.fileName || `${defaultBaseName}_MathType.docx`;
  const fallbackFileName = options.fileName
    ? (options.fileName.includes('_MathType.docx')
        ? options.fileName.replace('_MathType.docx', '_WordEquation.docx')
        : options.fileName.replace(/\.docx$/i, '_WordEquation.docx'))
    : `${defaultBaseName}_WordEquation.docx`;

  let baseDocxBlob = null;
  try {
    onStatus('generating', 'Đang tạo khung tài liệu Word chuẩn...');
    // Tạo DOCX nền với công thức toán giữ nguyên dạng raw LaTeX ($...$)
    baseDocxBlob = await generateWordDocxBlob({ mathMode: 'raw_latex', ...options });
  } catch (err) {
    console.error('[MathTypeExport] Lỗi khi tạo file nền:', err);
    onStatus('fallback', 'Không thể tạo file nền. Đang xuất bản Word Equation dự phòng...');
    return exportToWord({ mathMode: 'omml', ...options, fileName: fallbackFileName });
  }

  // Khởi tạo ticker đếm giây và cập nhật tiến trình liên tục để người dùng biết hệ thống đang kiên nhẫn đợi
  let elapsedSeconds = 0;
  let tickerId = null;

  const startTicker = () => {
    elapsedSeconds = 0;
    onStatus('converting', 'Đang kết nối máy chủ MathType để nhúng công thức OLE (vui lòng đợi trong giây lát)...');
    tickerId = setInterval(() => {
      elapsedSeconds += 1;
      if (elapsedSeconds === 5) {
        onStatus('waiting', 'Đang gửi tài liệu lên máy chủ MathType OLE...');
      } else if (elapsedSeconds === 15) {
        onStatus('waiting', 'Máy chủ MathType đang khởi động và nhúng công thức OLE (khoảng 20-30s)...');
      } else if (elapsedSeconds === 35) {
        onStatus('waiting', 'Đang xử lý chuyển đổi và nhúng đối tượng MathType OLE vào từng công thức...');
      } else if (elapsedSeconds === 60) {
        onStatus('waiting', 'Đang tiếp tục hoàn tất nhúng công thức OLE MathType, xin đừng đóng trình duyệt...');
      } else if (elapsedSeconds === 85) {
        onStatus('waiting', 'Sắp hoàn tất xuất file Word MathType OLE...');
      }
    }, 1000);
  };

  const stopTicker = () => {
    if (tickerId) {
      clearInterval(tickerId);
      tickerId = null;
    }
  };

  startTicker();

  let lastError = null;

  for (const endpoint of CANDIDATE_ENDPOINTS) {
    // Với endpoint same-origin proxy (/api/convert-docx), thử tối đa 2 lần nếu gặp lỗi cold-start (502/503/504)
    const maxRetries = endpoint === '/api/convert-docx' ? 2 : 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[MathTypeExport] Đang thử kết nối endpoint (lần ${attempt}): ${endpoint}`);

        const formData = new FormData();
        formData.append('file', baseDocxBlob, 'document.docx');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          stopTicker();
          const oleDocxBlob = await response.blob();
          const stats = response.headers.get('X-Stats') || '';
          if (!options.returnBlob) {
            saveAs(oleDocxBlob, fileName);
          }
          const formulaCount = stats ? stats.split(',')[0] : '';
          const doneMsg = formulaCount 
            ? `Đã xuất MathType thành công (chuyển ${formulaCount} công thức)!` 
            : 'Đã xuất file Word MathType thành công!';
          onStatus('done', doneMsg);
          return options.returnBlob ? oleDocxBlob : { success: true, mode: 'mathtype', stats };
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[MathTypeExport] Endpoint ${endpoint} trả về lỗi ${response.status}:`, errText);
          lastError = new Error(`HTTP ${response.status}: ${errText}`);

          // Nếu Render đang khởi động lại (502, 503, 504), chờ 4s rồi thử lại
          if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
            onStatus('waiting', 'Máy chủ MathType đang khởi động (Render free tier), đang kết nối lại...');
            await new Promise(res => setTimeout(res, 4000));
            continue;
          }
          break; // Chuyển sang endpoint tiếp theo nếu không phải cold start
        }
      } catch (err) {
        console.warn(`[MathTypeExport] Thất bại khi gọi ${endpoint} (lần ${attempt}):`, err.message);
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 3000));
        }
      }
    }
  }

  stopTicker();

  // Smart Fallback: Khi tất cả endpoint đều không phản hồi sau thời gian kiên nhẫn đợi
  console.warn('[MathTypeExport] Kích hoạt Smart Fallback sang bản Word Equation (OMML):', lastError?.message);
  onStatus('fallback', 'Máy chủ MathType tạm thời bận hoặc không phản hồi. Hệ thống đã tự động chuyển sang bản Word Equation (OMML) chuẩn!');

  // Tự động tải bản Word Equation (OMML) tương thích cao
  return await exportToWord({ mathMode: 'omml', ...options, fileName: fallbackFileName });
}
