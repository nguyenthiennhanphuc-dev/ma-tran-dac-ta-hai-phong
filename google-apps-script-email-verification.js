// ============================================================================
// GOOGLE APPS SCRIPT - EMAIL VERIFICATION + PAYMENT TỰ ĐỘNG
// Deploy: Extensions → Apps Script → Deploy → New deployment → Web app
// ============================================================================

// ============================================================================
// CẤU HÌNH
// ============================================================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Thay bằng ID của Google Sheet
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const ADMIN_BANK_ACCOUNTS = [
  { bank: 'Vietcombank', account: '9988250112', name: 'NGUYEN VAN THIEN' }
];

// ============================================================================
// MAIN HANDLER (GET cho các action đơn giản)
// ============================================================================
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch(action) {
      case 'check':
        return handleCheck(e.parameter);
      case 'increment':
        return handleIncrement(e.parameter);
      case 'sendCode':
        return handleSendCode(e.parameter);
      case 'verifyCode':
        return handleVerifyCode(e.parameter);
      case 'activate':
        return handleActivate(e.parameter);
      case 'submitPayment':
        return handleSubmitPayment(e.parameter);
      case 'checkPaymentStatus':
        return handleCheckPaymentStatus(e.parameter);
      case 'getBankInfo':
        return jsonResponse({ success: true, accounts: ADMIN_BANK_ACCOUNTS });
      default:
        return jsonResponse({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ============================================================================
// MAIN HANDLER (POST cho gửi ảnh screenshot)
// ============================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let response;
    switch(action) {
      case 'submitPayment':
        response = handleSubmitPayment(data);
        break;
      default:
        response = jsonResponse({ success: false, error: 'Invalid action' });
    }

    // Thêm CORS headers
    return ContentService
      .createTextOutput(response.getContent())
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');

  } catch (error) {
    Logger.log('POST Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// ============================================================================
// HANDLE OPTIONS (Preflight request)
// ============================================================================
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}

// ============================================================================
// HELPER: JSON Response
// ============================================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// HELPER: Get Sheets
// ============================================================================
function getSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    usage: ss.getSheetByName('Usage'),
    premium: ss.getSheetByName('Premium'),
    emailCodes: ss.getSheetByName('EmailCodes'),
    emailVerified: ss.getSheetByName('EmailVerified'),
    activationCodes: ss.getSheetByName('ActivationCodes'),
    pendingPayments: ss.getSheetByName('PendingPayments')
  };
}

// ============================================================================
// ACTION 1: CHECK - Kiểm tra trạng thái user
// ============================================================================
function handleCheck(params) {
  const visitorId = params.visitorId;
  const userName = params.userName || '';

  const sheets = getSheets();

  // Kiểm tra Premium
  const premiumData = sheets.premium.getDataRange().getValues();
  const premiumRow = premiumData.find(row => row[0] === visitorId);

  if (premiumRow && premiumRow[2] === true) {
    return jsonResponse({
      isPremium: true,
      count: 0,
      emailVerified: false,
      message: 'Premium user'
    });
  }

  // Kiểm tra Email Verified (10 lượt)
  const emailVerifiedData = sheets.emailVerified.getDataRange().getValues();
  const emailVerifiedRow = emailVerifiedData.find(row => row[0] === visitorId);

  if (emailVerifiedRow) {
    const count = emailVerifiedRow[3] || 0;
    return jsonResponse({
      isPremium: false,
      count: count,
      emailVerified: true,
      email: emailVerifiedRow[1],
      message: count >= 10 ? 'All trials used' : `${10 - count} trials left`
    });
  }

  // Kiểm tra Usage (5 lượt đầu)
  const usageData = sheets.usage.getDataRange().getValues();
  let userRow = usageData.find(row => row[0] === visitorId);

  if (!userRow) {
    // User mới
    sheets.usage.appendRow([
      visitorId,
      userName,
      0,
      new Date(),
      new Date()
    ]);

    return jsonResponse({
      isPremium: false,
      count: 0,
      emailVerified: false,
      message: 'New user, 5 trials available'
    });
  }

  const count = userRow[2] || 0;
  return jsonResponse({
    isPremium: false,
    count: count,
    emailVerified: false,
    message: count >= 5 ? 'First 5 trials used, verify email for 5 more' : `${5 - count} trials left`
  });
}

// ============================================================================
// ACTION 2: INCREMENT - Tăng counter
// ============================================================================
function handleIncrement(params) {
  const visitorId = params.visitorId;
  const sheets = getSheets();

  // Kiểm tra xem user đã verify email chưa
  const emailVerifiedData = sheets.emailVerified.getDataRange().getValues();
  const emailVerifiedRow = emailVerifiedData.find(row => row[0] === visitorId);

  if (emailVerifiedRow) {
    // Tăng counter trong EmailVerified sheet
    const rowIndex = emailVerifiedData.findIndex(row => row[0] === visitorId);
    const currentCount = emailVerifiedData[rowIndex][3] || 0;
    sheets.emailVerified.getRange(rowIndex + 1, 4).setValue(currentCount + 1);
    sheets.emailVerified.getRange(rowIndex + 1, 5).setValue(new Date());

    return jsonResponse({
      success: true,
      newCount: currentCount + 1,
      emailVerified: true
    });
  }

  // Tăng counter trong Usage sheet
  const usageData = sheets.usage.getDataRange().getValues();
  const rowIndex = usageData.findIndex(row => row[0] === visitorId);

  if (rowIndex >= 0) {
    const currentCount = usageData[rowIndex][2] || 0;
    sheets.usage.getRange(rowIndex + 1, 3).setValue(currentCount + 1);
    sheets.usage.getRange(rowIndex + 1, 5).setValue(new Date());

    return jsonResponse({
      success: true,
      newCount: currentCount + 1,
      emailVerified: false
    });
  }

  return jsonResponse({
    success: false,
    error: 'User not found'
  });
}

// ============================================================================
// ACTION 3: SEND CODE - Gửi mã xác nhận qua email
// ============================================================================
function handleSendCode(params) {
  const email = params.email;
  const visitorId = params.visitorId;

  if (!email || !email.includes('@')) {
    return jsonResponse({
      success: false,
      error: 'Invalid email address'
    });
  }

  const sheets = getSheets();

  // Kiểm tra xem email đã được verify chưa
  const emailVerifiedData = sheets.emailVerified.getDataRange().getValues();
  const existingEmail = emailVerifiedData.find(row => row[1] === email);

  if (existingEmail) {
    return jsonResponse({
      success: false,
      error: 'Email already verified by another user'
    });
  }

  // Tạo mã 6 số
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryTime = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  // Lưu mã vào sheet
  sheets.emailCodes.appendRow([
    email,
    code,
    visitorId,
    new Date(),
    expiryTime,
    false // used
  ]);

  // Gửi email
  try {
    MailApp.sendEmail({
      to: email,
      subject: 'Mã xác nhận PROEXAM MAKER',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">PROEXAM MAKER - Xác nhận Email</h2>
          <p>Xin chào,</p>
          <p>Mã xác nhận của bạn là:</p>
          <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1F2937; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #EF4444;">⏰ Mã có hiệu lực trong ${VERIFICATION_CODE_EXPIRY_MINUTES} phút.</p>
          <p>Sau khi xác nhận, bạn sẽ nhận thêm <strong>5 lượt xuất đề miễn phí</strong>.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.<br>
            © 2026 PROEXAM MAKER - Hệ thống tạo đề thi thông minh
          </p>
        </div>
      `
    });

    return jsonResponse({
      success: true,
      message: 'Verification code sent to email'
    });
  } catch (error) {
    Logger.log('Email send error: ' + error.toString());
    return jsonResponse({
      success: false,
      error: 'Failed to send email: ' + error.toString()
    });
  }
}

// ============================================================================
// ACTION 4: VERIFY CODE - Xác nhận mã
// ============================================================================
function handleVerifyCode(params) {
  const email = params.email;
  const code = params.code;
  const visitorId = params.visitorId;
  const userName = params.userName || '';

  const sheets = getSheets();

  // Tìm mã trong sheet
  const emailCodesData = sheets.emailCodes.getDataRange().getValues();
  const codeRow = emailCodesData.find(row =>
    row[0] === email &&
    row[1] === code &&
    row[2] === visitorId &&
    row[5] === false && // chưa dùng
    new Date(row[4]) > new Date() // chưa hết hạn
  );

  if (!codeRow) {
    return jsonResponse({
      success: false,
      error: 'Invalid or expired code'
    });
  }

  // Đánh dấu mã đã dùng
  const codeRowIndex = emailCodesData.findIndex(row =>
    row[0] === email && row[1] === code && row[2] === visitorId
  );
  sheets.emailCodes.getRange(codeRowIndex + 1, 6).setValue(true);

  // Thêm vào EmailVerified sheet
  sheets.emailVerified.appendRow([
    visitorId,
    email,
    userName,
    0, // Export count (bắt đầu từ 0, tổng cộng 10 lượt)
    new Date(),
    new Date()
  ]);

  return jsonResponse({
    success: true,
    message: 'Email verified successfully. You now have 10 total trials.'
  });
}

// ============================================================================
// ACTION 5: ACTIVATE - Kích hoạt Premium bằng mã
// ============================================================================
function handleActivate(params) {
  const code = params.code;
  const visitorId = params.visitorId;
  const userName = params.userName || '';

  const sheets = getSheets();

  // Kiểm tra mã trong sheet ActivationCodes
  const codesData = sheets.activationCodes.getDataRange().getValues();
  const codeRow = codesData.find(row => row[0] === code);

  if (!codeRow) {
    return jsonResponse({
      success: false,
      error: 'Invalid activation code'
    });
  }

  if (codeRow[2] === true) {
    return jsonResponse({
      success: false,
      error: 'Code already used'
    });
  }

  // Đánh dấu mã đã dùng
  const codeRowIndex = codesData.findIndex(row => row[0] === code);
  sheets.activationCodes.getRange(codeRowIndex + 1, 3).setValue(true);
  sheets.activationCodes.getRange(codeRowIndex + 1, 4).setValue(visitorId);
  sheets.activationCodes.getRange(codeRowIndex + 1, 5).setValue(new Date());

  // Thêm vào Premium sheet
  sheets.premium.appendRow([
    visitorId,
    userName,
    true,
    new Date(),
    code
  ]);

  return jsonResponse({
    success: true,
    message: 'Premium activated successfully'
  });
}

// ============================================================================
// ACTION 6: SUBMIT PAYMENT - User gửi yêu cầu thanh toán
// ============================================================================
function handleSubmitPayment(data) {
  const visitorId = data.visitorId;
  const userName = data.userName || '';
  const phone = data.phone || '';
  const bankName = data.bankName || '';
  const amount = data.amount || 0;
  const selectedPlan = data.selectedPlan || 'monthly'; // monthly / yearly

  if (!visitorId || !phone) {
    return jsonResponse({ success: false, error: 'Missing required fields' });
  }

  const sheets = getSheets();

  // Kiểm tra user đã có payment pending chưa
  const pendingSheet = sheets.pendingPayments;
  const pendingData = pendingSheet.getDataRange().getValues();
  const existingPending = pendingData.find(row => row[1] === visitorId && row[8] === 'pending');

  if (existingPending) {
    return jsonResponse({ success: false, error: 'Bạn đã gửi yêu cầu thanh toán, đang chờ duyệt.' });
  }

  // Kiểm tra user đã được duyệt premium chưa
  const premiumData = sheets.premium.getDataRange().getValues();
  const existingPremium = premiumData.find(row => row[0] === visitorId && row[2] === true);

  if (existingPremium) {
    return jsonResponse({ success: false, error: 'Bạn đã là Premium user.' });
  }

  // Thêm record mới vào PendingPayments sheet
  pendingSheet.appendRow([
    new Date(),            // A: Submitted At
    visitorId,             // B: Visitor ID
    userName,              // C: User Name
    phone,                 // D: Phone
    bankName,              // E: Bank Name (user's bank)
    amount,                // F: Amount (VND)
    'Nhắn Zalo/SMS: 0988250112', // G: Note (thay vì screenshot URL)
    selectedPlan,          // H: Plan type
    'pending',             // I: Status (pending / approved / rejected)
    '',                    // J: Approved At
    '',                    // K: Approved Code (auto-generated)
    ''                     // L: Rejection reason
  ]);

  return jsonResponse({
    success: true,
    message: 'Payment request submitted. Please contact admin via Zalo/SMS with transfer screenshot.'
  });
}

// ============================================================================
// ACTION 7: CHECK PAYMENT STATUS - Polling kiểm tra trạng thái
// ============================================================================
function handleCheckPaymentStatus(params) {
  const visitorId = params.visitorId;
  const sheets = getSheets();

  const pendingData = sheets.pendingPayments.getDataRange().getValues();
  // Tìm record mới nhất của user, sort ngược để lấy bản mới nhất
  const userPayments = pendingData.filter(row => row[1] === visitorId);

  if (userPayments.length === 0) {
    return jsonResponse({
      status: 'none',
      message: 'No payment request found'
    });
  }

  // Lấy record mới nhất (cuối cùng)
  const latest = userPayments[userPayments.length - 1];
  const status = latest[8]; // Column I: Status

  if (status === 'approved') {
    const approvedCode = latest[10]; // Column K: Approved Code

    // Tự động thêm vào Premium sheet (nếu chưa có)
    const premiumData = sheets.premium.getDataRange().getValues();
    const alreadyPremium = premiumData.find(row => row[0] === visitorId);

    if (!alreadyPremium) {
      sheets.premium.appendRow([
        visitorId,
        latest[2], // userName
        true,
        latest[9], // approvedAt
        approvedCode
      ]);
    }

    return jsonResponse({
      status: 'approved',
      code: approvedCode,
      message: 'Payment approved! Premium activated.'
    });
  }

  if (status === 'rejected') {
    return jsonResponse({
      status: 'rejected',
      reason: latest[11] || 'Admin từ chối yêu cầu.',
      message: 'Payment rejected'
    });
  }

  // status === 'pending'
  return jsonResponse({
    status: 'pending',
    message: 'Đang chờ admin duyệt. Vui lòng kiểm tra lại sau.'
  });
}

// ============================================================================
// ADMIN: APPROVE PAYMENT - Duyệt thanh toán (chạy thủ công từ Apps Script)
// ============================================================================
function approvePayment(visitorId) {
  const sheets = getSheets();
  const pendingData = sheets.pendingPayments.getDataRange().getValues();
  const rowIndex = pendingData.findIndex(row => row[1] === visitorId && row[8] === 'pending');

  if (rowIndex < 0) {
    return { success: false, error: 'Không tìm thấy yêu cầu pending cho visitor này.' };
  }

  // Sinh mã Premium tự động
  const approvedCode = 'PRO-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

  // Cập nhật status = approved
  sheets.pendingPayments.getRange(rowIndex + 1, 9).setValue('approved');  // Column I
  sheets.pendingPayments.getRange(rowIndex + 1, 10).setValue(new Date());  // Column J
  sheets.pendingPayments.getRange(rowIndex + 1, 11).setValue(approvedCode); // Column K

  return { success: true, code: approvedCode, message: 'Payment approved for ' + visitorId };
}

// ============================================================================
// ADMIN: REJECT PAYMENT - Từ chối thanh toán
// ============================================================================
function rejectPayment(visitorId, reason) {
  const sheets = getSheets();
  const pendingData = sheets.pendingPayments.getDataRange().getValues();
  const rowIndex = pendingData.findIndex(row => row[1] === visitorId && row[8] === 'pending');

  if (rowIndex < 0) {
    return { success: false, error: 'Không tìm thấy yêu cầu pending.' };
  }

  sheets.pendingPayments.getRange(rowIndex + 1, 9).setValue('rejected');  // Column I
  sheets.pendingPayments.getRange(rowIndex + 1, 12).setValue(reason || 'Không xác nhận được chuyển khoản.'); // Column L

  return { success: true, message: 'Payment rejected for ' + visitorId };
}

