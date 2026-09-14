import { saveAs } from 'file-saver';
import { exportToWord, generateWordDocxBlob } from './exportWord';

const REQUEST_TIMEOUT_MS = 90000; // 90 giây tối đa để đợi máy chủ Render khởi động lại

// Danh sách các cổng kết nối MathType theo thứ tự ưu tiên
const CANDIDATE_ENDPOINTS = [
  'http://localhost:8000/api/convert-docx', // Local Python backend (đã bật CORS, proxy Render)
  '/api/convert-docx',                      // Vite dev server proxy (same-origin)
  'https://latex2mathtypeweb.onrender.com/api/convert-docx' // Direct Render
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
  const { onStatus = () => {}, fileName = 'Ma_Tran_Dac_Ta_De_Kiem_Tra_MathType.docx' } = options;

  let baseDocxBlob = null;
  try {
    onStatus('generating', 'Đang tạo khung tài liệu Word chuẩn...');
    // Tạo DOCX nền với công thức toán giữ nguyên dạng raw LaTeX ($...$)
    baseDocxBlob = await generateWordDocxBlob({ mathMode: 'raw_latex', ...options });
  } catch (err) {
    console.error('[MathTypeExport] Lỗi khi tạo file nền:', err);
    onStatus('fallback', 'Không thể tạo file nền. Đang xuất bản Word Equation dự phòng...');
    return exportToWord({ mathMode: 'omml', ...options, fileName: fileName.replace('_MathType.docx', '_WordEquation.docx') });
  }

  // Khởi tạo ticker đếm giây và cập nhật tiến trình liên tục để người dùng biết hệ thống đang kiên nhẫn đợi
  let elapsedSeconds = 0;
  let tickerId = null;

  const startTicker = () => {
    elapsedSeconds = 0;
    onStatus('converting', 'Đang kết nối máy chủ MathType để nhúng công thức OLE (vui lòng đợi trong giây lát)...');
    tickerId = setInterval(() => {
      elapsedSeconds += 1;
      if (elapsedSeconds === 15) {
        onStatus('waiting', 'Máy chủ MathType đang khởi động lại và xử lý (khoảng 30-45s), xin vui lòng kiên nhẫn đợi nhé...');
      } else if (elapsedSeconds === 40) {
        onStatus('waiting', 'Đang tiếp tục hoàn tất nhúng công thức OLE MathType, xin đừng đóng trình duyệt...');
      } else if (elapsedSeconds === 70) {
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
    try {
      console.log(`[MathTypeExport] Đang thử kết nối endpoint: ${endpoint}`);

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
      }
    } catch (err) {
      console.warn(`[MathTypeExport] Thất bại khi gọi ${endpoint}:`, err.message);
      lastError = err;
    }
  }

  stopTicker();

  // Smart Fallback: Khi tất cả endpoint đều không phản hồi sau thời gian kiên nhẫn đợi
  console.warn('[MathTypeExport] Kích hoạt Smart Fallback sang bản Word Equation (OMML):', lastError?.message);
  onStatus('fallback', 'Máy chủ MathType tạm thời không phản hồi. Hệ thống đã tự động chuyển sang bản Word Equation (OMML) chuẩn!');

  // Tự động tải bản Word Equation (OMML) tương thích cao
  const fallbackFileName = fileName.replace('_MathType.docx', '_WordEquation.docx');
  return await exportToWord({ mathMode: 'omml', ...options, fileName: fallbackFileName });
}
