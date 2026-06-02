# Hướng dẫn Setup Google Sheets cho Email Verification + Payment Tự Động

## Yêu cầu trước khi bắt đầu

1. Google Account
2. Google Spreadsheet mới (hoặc dùng sheet hiện tại)
3. Copy Paste Apps Script vào project

---

## Bước 1: Tạo Google Spreadsheet

1. Vào [Google Sheets](https://sheets.google.com)
2. Tạo Spreadsheet mới (hoặc mở sheet hiện tại của bạn)
3. Copy ID từ URL: `https://docs.google.com/spreadsheets/d/XXXXXXXX/edit#gid=0` → Lấy XXXXXXXX (phần sau /d/ và trước /edit)
4. Lưu ID này để paste vào Apps Script

---

## Bước 2: Tạo 6 Sheets (Tabs)

Tạo các sheet với TÊN CHÍNH XÁC như sau:

### Sheet 1: Usage (5 lượt đầu)

| Header (Row 1) | A: visitorId | B: userName | C: count | D: firstSeen | E: lastSeen |
|----------------|-------------|-------------|----------|--------------|-------------|
| Example        | abc123def   | Nguyen Van A | 3       | 2026-05-01   | 2026-05-07  |

### Sheet 2: EmailVerified (10 lượt sau khi verify)

| Header (Row 1) | A: visitorId | B: email | C: userName | D: count | E: firstSeen | F: lastSeen |
|----------------|-------------|----------|-------------|----------|--------------|-------------|
| Example        | abc123def   | a@b.com  | Nguyen Van A | 0       | 2026-05-07   | 2026-05-07  |

### Sheet 3: EmailCodes (Mã xác nhận tạm thời)

| Header (Row 1) | A: email | B: code | C: visitorId | D: sentAt | E: expiresAt | F: used |
|----------------|----------|---------|--------------|-----------|--------------|---------|
| Example        | a@b.com  | 123456  | abc123def    | 2026-05-07| 2026-05-07   | FALSE   |

### Sheet 4: Premium (User đã kích hoạt Premium)

| Header (Row 1) | A: visitorId | B: userName | C: isPremium | D: activatedAt | E: code |
|----------------|-------------|-------------|--------------|----------------|---------|
| Example        | abc123def   | Nguyen Van A | TRUE        | 2026-05-07     | CODE001 |

### Sheet 5: ActivationCodes (Mã kích hoạt Premium)

| Header (Row 1) | A: code | B: description | C: used | D: usedBy | E: usedAt |
|----------------|---------|----------------|---------|-----------|-----------|
| Example        | CODE001 | Premium 1 thang | TRUE    | abc123def | 2026-05-07|
| Example        | CODE002 | Premium 1 nam   | FALSE   |           |           |

### Sheet 6: PendingPayments (Yêu cầu thanh toán chờ duyệt) ⭐ MỚI

| Header (Row 1) | A: SubmittedAt | B: visitorId | C: userName | D: phone | E: bankName | F: amount | G: screenshotUrl | H: plan | I: status | J: approvedAt | K: approvedCode | L: rejectionReason |
|----------------|---------------|-------------|-------------|---------|-------------|----------|------------------|---------|-----------|---------------|-----------------|--------------------|
| Example        | 2026-05-07    | abc123def   | Nguyen A    | 0912... | Vietcombank | 99000    | https://...      | monthly | pending   |               |                 |                    |

**Cách hoạt động Sheet PendingPayments:**
1. User gửi yêu cầu → Row mới với status = `pending`
2. Admin kiểm tra ngân hàng → Chạy hàm `approvePayment(visitorId)` hoặc `rejectPayment(visitorId, reason)`
3. Nếu approved → status = `approved`, tự động thêm vào Premium sheet, user được kích hoạt
4. Nếu rejected → status = `rejected`, user nhận thông báo lỗi

---

## Bước 3: Setup Google Apps Script

1. Trong Google Spreadsheet → **Extensions** → **Apps Script**
2. Xóa toàn bộ code mặc định
3. Copy paste toàn bộ code từ file `google-apps-script-email-verification.js`
4. **Thay thế `YOUR_SPREADSHEET_ID_HERE`** bằng ID của bạn
5. **Cập nhật `ADMIN_BANK_ACCOUNTS`** với thông tin ngân hàng thật của bạn
6. Save project (Ctrl+S)

---

## Bước 4: Authorize Apps Script

Apps Script cần quyền:
1. Đọc/ghi Spreadsheet
2. Gửi email qua MailApp

**Các bước authorize:**
1. Click **Run** → Chọn hàm `doGet`
2. Click **Review Permissions**
3. Chọn **Advanced** → **Go to [Your Project Name] (unsafe)**
4. Chấp nhận tất cả quyền

---

## Bước 5: Deploy Apps Script

1. Click **Deploy** → **New deployment**
2. Chọn type: **Web app**
3. Description: `PROEXAM Payment v1`
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Click **Deploy**
7. Copy URL Web App (dạng `https://script.google.com/macros/s/XXXXXXXX/exec`)
8. Click **Done**

---

## Bước 6: Thêm mã kích hoạt Premium (tạo sẵn)

Vào sheet `ActivationCodes`, thêm các dòng:

| code | description | used | usedBy | usedAt |
|------|-------------|------|--------|--------|
| PREMIUM2024A | Premium 1 thang | FALSE | | |
| PREMIUM2024B | Premium 1 thang | FALSE | | |
| PREMIUM2024C | Premium 1 thang | FALSE | | |

---

## Bước 7: Hướng dẫn Admin Duyệt Thanh Toán

Khi có user gửi yêu cầu thanh toán, vào Sheet `PendingPayments` bạn sẽ thấy:

1. **Kiểm tra thủ công:**
   - Xem phone, bank, amount, screenshotUrl
   - Mở link screenshot để kiểm tra chuyển khoản
   - Vào ngân hàng xác nhận có tiền chưa

2. **Duyệt (Approve):**
   - Vào Apps Script → Run function → `approvePayment`
   - Truyền visitorId (cột B) vào hàm
   - Kết quả: status → "approved", tự động sinh mã Premium, thêm vào sheet Premium

3. **Từ chối (Reject):**
   - Vào Apps Script → Run function → `rejectPayment`
   - Truyền visitorId + lý do từ chối
   - Kết quả: status → "rejected", user nhận thông báo

> **Mẹo:** Bạn có thể sửa trực tiếp trong Sheet:
> - Cột I (status): đổi `pending` → `approved`
> - Cột J (approvedAt): nhập `=NOW()`
> - Cột K (approvedCode): nhập mã bất kỳ (VD: `PRO-ADMIN-001`)
> - Thêm user vào sheet `Premium` thủ công

---

## Bước 8: Update React Code

Sau khi có URL Apps Script, cập nhật trong `App.jsx`:

```javascript
// Thay thế URL cũ bằng URL mới
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

---

## Lưu ý quan trọng

1. **Quota giới hạn:**
   - MailApp: 100 emails/ngày (tài khoản miễn phí)
   - UrlFetchApp: 20,000 requests/ngày
   - Script execution: 6 minutes/execution

2. **Nếu cần gửi nhiều email hơn:**
   - Dùng SendGrid API (miễn phí 100 emails/ngày)
   - Hoặc dùng GmailApp thay vì MailApp (có daily quota riêng)

3. **Bảo mật Apps Script:**
   - Không share URL Apps Script với người không cần thiết
   - Dùng "Anyone with Google account" thay vì "Anyone" nếu muốn chặn anonymous

4. **Polling:** App sẽ kiểm tra trạng thái thanh toán mỗi 15 giây, tự động kích hoạt Premium khi admin duyệt
