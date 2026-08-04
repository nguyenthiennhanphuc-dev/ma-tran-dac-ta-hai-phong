/**
 * DỮ LIỆU CHUẨN CHƯƠNG TRÌNH GIÁO DỤC PHỔ THÔNG MÔN TOÁN 2018
 * Thông tư 32/2018/TT-BGDĐT
 *
 * Cấu trúc thiết kế để mở rộng cho các môn khác (Hóa, Lý, Sinh, ...) sau này.
 * Chỉ sử dụng cho môn Toán ở cấu trúc 4-2-1-3.
 *
 * Quy tắc phân loại mức độ nhận thức:
 * - biet (NB): nhận biết, nhận ra, gọi tên, nêu được, đọc được, viết được, liệt kê, xác định (chỉ nhận dạng)
 * - hieu (TH): giải thích, phân tích, so sánh, chứng minh, mô tả, lập luận, thực hiện được (phép tính), tính được
 * - vanDung (VD): vận dụng, giải quyết (thực tiễn), áp dụng, thiết lập, xây dựng, sử dụng để giải quyết
 */

// =========================================================
// HELPER: Tìm ĐVKT theo tên (tìm kiếm mờ - fuzzy search)
// =========================================================
export function findYCCD(monHoc, lop, tenDVKT) {
  if (!monHoc || !lop || !tenDVKT) return null;
  const monKey = monHoc.toLowerCase();
  const isToan = /toán|toan/i.test(monKey);
  if (!isToan) return null; // Hiện tại chỉ hỗ trợ môn Toán

  const lopData = CT_TOAN_2018[`lop${lop}`];
  if (!lopData) return null;

  const search = tenDVKT.toLowerCase().trim();
  // Tìm ĐVKT khớp nhất
  let bestMatch = null;
  let bestScore = 0;

  for (const dvkt of lopData) {
    const name = dvkt.ten.toLowerCase();
    // Tính điểm khớp đơn giản
    let score = 0;
    const searchWords = search.split(/\s+/);
    for (const w of searchWords) {
      if (w.length >= 3 && name.includes(w)) score++;
    }
    if (name.includes(search)) score += 10;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = dvkt;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// =========================================================
// HELPER: Lấy danh sách ĐVKT gợi ý cho dropdown theo lớp
// =========================================================
export function getSuggestedDVKT(monHoc, lop) {
  if (!monHoc || !lop) return [];
  const isToan = /toán|toan/i.test(monHoc);
  if (!isToan) return [];

  const lopData = CT_TOAN_2018[`lop${lop}`];
  if (!lopData) return [];

  return lopData.map(dv => ({
    ten: dv.ten,
    mach: dv.mach,
    machLabel: getMachLabel(dv.mach),
  }));
}

function getMachLabel(mach) {
  if (mach === 'so_dai_so') return 'Số & Đại số';
  if (mach === 'hinh_hoc_do_luong') return 'Hình học & Đo lường';
  if (mach === 'thong_ke_xac_suat') return 'Thống kê & Xác suất';
  return mach;
}

// =========================================================
// DỮ LIỆU CT TOÁN 2018 - LỚP 6 ĐẾN LỚP 12
// =========================================================
export const CT_TOAN_2018 = {

  // ===========================
  // LỚP 6
  // ===========================
  lop6: [
    // --- SỐ VÀ ĐẠI SỐ ---
    {
      ten: 'Số tự nhiên',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được tập hợp, phần tử thuộc/không thuộc tập hợp; nhận biết được tập hợp các số tự nhiên',
          'Biểu diễn được số tự nhiên trong hệ thập phân',
          'Biểu diễn được các số tự nhiên từ 1 đến 30 bằng chữ số La Mã',
          'Nhận biết được thứ tự trong tập hợp các số tự nhiên; so sánh được hai số tự nhiên',
        ],
        hieu: [
          'Thực hiện được các phép tính: cộng, trừ, nhân, chia trong tập hợp số tự nhiên',
          'Nhận biết được thứ tự thực hiện các phép tính',
          'Thực hiện được phép tính luỹ thừa với số mũ tự nhiên; thực hiện nhân và chia hai luỹ thừa cùng cơ số',
          'Vận dụng được các tính chất giao hoán, kết hợp, phân phối trong tính toán',
        ],
        vanDung: [
          'Vận dụng được tính chất của phép tính (kể cả luỹ thừa) để tính nhẩm, tính nhanh một cách hợp lí',
          'Giải quyết được những vấn đề thực tiễn gắn với thực hiện các phép tính (ví dụ: tính tiền mua sắm, tính lượng hàng mua được từ số tiền đã có)',
        ],
      },
    },
    {
      ten: 'Tính chia hết. Số nguyên tố. Ước chung và bội chung',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được quan hệ chia hết, khái niệm ước và bội',
          'Nhận biết được khái niệm số nguyên tố, hợp số',
          'Nhận biết được phép chia có dư, định lí về phép chia có dư',
        ],
        hieu: [
          'Vận dụng được dấu hiệu chia hết cho 2, 5, 9, 3 để xác định một số có chia hết hay không',
          'Thực hiện được việc phân tích một số tự nhiên lớn hơn 1 thành tích của các thừa số nguyên tố trong những trường hợp đơn giản',
          'Xác định được ước chung, UCLN; xác định được bội chung, BCNN; nhận biết được phân số tối giản; thực hiện được phép cộng, trừ phân số bằng cách sử dụng UCLN, BCNN',
        ],
        vanDung: [
          'Vận dụng được kiến thức số học vào giải quyết những vấn đề thực tiễn (ví dụ: tính toán tiền hay lượng hàng hoá khi mua sắm, xác định số đồ vật cần thiết để sắp xếp chúng theo những quy tắc cho trước)',
        ],
      },
    },
    {
      ten: 'Số nguyên',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được số nguyên âm, tập hợp các số nguyên',
          'Biểu diễn được số nguyên trên trục số',
          'Nhận biết được số đối của một số nguyên',
          'Nhận biết được thứ tự trong tập hợp các số nguyên; so sánh được hai số nguyên',
          'Nhận biết được ý nghĩa của số nguyên âm trong một số bài toán thực tiễn',
        ],
        hieu: [
          'Thực hiện được các phép tính: cộng, trừ, nhân, chia (chia hết) trong tập hợp các số nguyên',
          'Nhận biết được quan hệ chia hết, khái niệm ước và bội trong tập hợp các số nguyên',
        ],
        vanDung: [
          'Vận dụng được các tính chất giao hoán, kết hợp, phân phối, quy tắc dấu ngoặc trong tính toán với số nguyên',
          'Giải quyết được những vấn đề thực tiễn gắn với thực hiện các phép tính về số nguyên (ví dụ: tính lỗ lãi khi buôn bán)',
        ],
      },
    },
    {
      ten: 'Phân số',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được phân số với tử số hoặc mẫu số là số nguyên âm',
          'Nhận biết được khái niệm hai phân số bằng nhau và quy tắc bằng nhau của hai phân số',
          'Nêu được hai tính chất cơ bản của phân số',
          'Nhận biết được hỗn số dương',
          'So sánh được hai phân số cho trước; nhận biết được số đối của một phân số',
        ],
        hieu: [
          'Thực hiện được các phép tính cộng, trừ, nhân, chia với phân số',
          'Tính được giá trị phân số của một số cho trước và tính được một số biết giá trị phân số của số đó',
        ],
        vanDung: [
          'Vận dụng được các tính chất giao hoán, kết hợp, phân phối, quy tắc dấu ngoặc với phân số trong tính toán',
          'Giải quyết được một số vấn đề thực tiễn gắn với các phép tính về phân số (ví dụ: các bài toán liên quan đến chuyển động trong Vật lí)',
        ],
      },
    },
    {
      ten: 'Số thập phân. Tỉ số và tỉ số phần trăm',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được số thập phân âm, số đối của một số thập phân',
          'So sánh được hai số thập phân cho trước',
        ],
        hieu: [
          'Thực hiện được các phép tính cộng, trừ, nhân, chia với số thập phân',
          'Thực hiện được ước lượng và làm tròn số thập phân',
          'Tính được tỉ số và tỉ số phần trăm của hai đại lượng',
          'Tính được giá trị phần trăm của một số cho trước và tính được một số biết giá trị phần trăm của số đó',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với các phép tính về số thập phân, tỉ số và tỉ số phần trăm (ví dụ: các bài toán liên quan đến lãi suất tín dụng, thành phần các chất trong Hoá học)',
        ],
      },
    },
    // --- HÌNH HỌC VÀ ĐO LƯỜNG ---
    {
      ten: 'Hình học trực quan lớp 6 (Tam giác đều, hình vuông, lục giác đều, tứ giác đặc biệt)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận dạng được tam giác đều, hình vuông, lục giác đều',
          'Mô tả được một số yếu tố cơ bản (cạnh, góc, đường chéo) của tam giác đều, hình vuông, lục giác đều',
          'Mô tả được một số yếu tố cơ bản của hình chữ nhật, hình thoi, hình bình hành, hình thang cân',
          'Nhận biết được trục đối xứng, tâm đối xứng của một hình phẳng',
        ],
        hieu: [
          'Vẽ được tam giác đều, hình vuông bằng dụng cụ học tập',
          'Tạo lập được lục giác đều thông qua việc lắp ghép các tam giác đều',
          'Vẽ được hình chữ nhật, hình thoi, hình bình hành bằng các dụng cụ học tập',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc tính chu vi và diện tích của các hình đặc biệt',
        ],
      },
    },
    {
      ten: 'Hình học phẳng lớp 6 (Điểm, đường thẳng, tia, đoạn thẳng, góc)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được quan hệ cơ bản giữa điểm, đường thẳng; tiên đề về đường thẳng qua hai điểm',
          'Nhận biết được hai đường thẳng cắt nhau, song song; ba điểm thẳng hàng; điểm nằm giữa hai điểm',
          'Nhận biết được khái niệm tia, đoạn thẳng, trung điểm của đoạn thẳng, độ dài đoạn thẳng',
          'Nhận biết được khái niệm góc, điểm trong của góc; các góc đặc biệt (vuông, nhọn, tù, bẹt); số đo góc',
        ],
        hieu: [
          'Giải thích được quan hệ giữa điểm thuộc/không thuộc đường thẳng, ba điểm thẳng hàng',
        ],
        vanDung: [
          'Vận dụng khái niệm ba điểm thẳng hàng vào thực tiễn như: trồng cây thẳng hàng, để các đồ vật thẳng hàng',
        ],
      },
    },
    // --- THỐNG KÊ VÀ XÁC SUẤT ---
    {
      ten: 'Thống kê lớp 6 (Thu thập, biểu diễn và phân tích dữ liệu)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được tính hợp lí của dữ liệu theo các tiêu chí đơn giản',
          'Nhận ra được vấn đề hoặc quy luật đơn giản dựa trên phân tích các số liệu (bảng thống kê, biểu đồ tranh, biểu đồ cột)',
        ],
        hieu: [
          'Thực hiện được việc thu thập, phân loại dữ liệu theo các tiêu chí cho trước',
          'Đọc và mô tả thành thạo các dữ liệu ở dạng: bảng thống kê; biểu đồ tranh; biểu đồ dạng cột/cột kép',
          'Lựa chọn và biểu diễn được dữ liệu vào bảng, biểu đồ thích hợp',
        ],
        vanDung: [
          'Giải quyết được những vấn đề đơn giản liên quan đến các số liệu từ bảng thống kê, biểu đồ',
          'Nhận biết được mối liên hệ giữa thống kê với kiến thức các môn học khác và trong thực tiễn',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 6 (Mô hình xác suất đơn giản)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Làm quen với mô hình xác suất trong một số trò chơi, thí nghiệm đơn giản (ví dụ: tung đồng xu)',
          'Làm quen với việc mô tả xác suất thực nghiệm của khả năng xảy ra nhiều lần của một sự kiện',
        ],
        hieu: [
          'Sử dụng được phân số để mô tả xác suất thực nghiệm trong một số mô hình xác suất đơn giản',
        ],
        vanDung: [],
      },
    },
  ],

  // ===========================
  // LỚP 7
  // ===========================
  lop7: [
    {
      ten: 'Số hữu tỉ',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được số hữu tỉ và tập hợp các số hữu tỉ; biểu diễn được số hữu tỉ trên trục số',
          'Nhận biết được số đối của một số hữu tỉ; nhận biết được thứ tự trong tập hợp các số hữu tỉ; so sánh được hai số hữu tỉ',
          'Mô tả được phép tính luỹ thừa với số mũ tự nhiên của một số hữu tỉ và một số tính chất',
          'Mô tả được thứ tự thực hiện các phép tính, quy tắc dấu ngoặc, quy tắc chuyển vế trong số hữu tỉ',
        ],
        hieu: [
          'Thực hiện được các phép tính: cộng, trừ, nhân, chia trong tập hợp số hữu tỉ',
        ],
        vanDung: [
          'Vận dụng được các tính chất giao hoán, kết hợp, phân phối, quy tắc dấu ngoặc với số hữu tỉ trong tính toán',
          'Giải quyết được một số vấn đề thực tiễn gắn với các phép tính về số hữu tỉ (ví dụ: bài toán liên quan đến chuyển động trong Vật lí, trong đo đạc)',
        ],
      },
    },
    {
      ten: 'Số thực. Căn bậc hai số học',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm căn bậc hai số học của một số không âm',
          'Nhận biết được số thập phân hữu hạn và số thập phân vô hạn tuần hoàn',
          'Nhận biết được số vô tỉ, số thực, tập hợp các số thực; trục số thực; số đối của một số thực',
          'Nhận biết được thứ tự trong tập hợp các số thực; nhận biết được giá trị tuyệt đối của một số thực',
        ],
        hieu: [
          'Tính được giá trị (đúng hoặc gần đúng) căn bậc hai số học của một số nguyên dương bằng máy tính cầm tay',
          'Thực hiện được ước lượng và làm tròn số căn cứ vào độ chính xác cho trước',
        ],
        vanDung: [],
      },
    },
    {
      ten: 'Tỉ lệ thức. Dãy tỉ số bằng nhau. Đại lượng tỉ lệ',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được tỉ lệ thức và các tính chất của tỉ lệ thức',
          'Nhận biết được dãy tỉ số bằng nhau',
        ],
        hieu: [
          'Vận dụng được tính chất của tỉ lệ thức trong giải toán',
          'Vận dụng được tính chất của dãy tỉ số bằng nhau trong giải toán (ví dụ: chia một số thành các phần tỉ lệ với các số cho trước)',
        ],
        vanDung: [
          'Giải được một số bài toán đơn giản về đại lượng tỉ lệ thuận (ví dụ: bài toán về tổng sản phẩm và năng suất lao động)',
          'Giải được một số bài toán đơn giản về đại lượng tỉ lệ nghịch (ví dụ: bài toán về thời gian hoàn thành kế hoạch và năng suất)',
        ],
      },
    },
    {
      ten: 'Biểu thức đại số. Đa thức một biến',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được biểu thức số; nhận biết được biểu thức đại số',
          'Tính được giá trị của một biểu thức đại số',
          'Nhận biết được định nghĩa đa thức một biến; xác định được bậc của đa thức một biến',
          'Nhận biết được khái niệm nghiệm của đa thức một biến',
        ],
        hieu: [
          'Tính được giá trị của đa thức khi biết giá trị của biến',
          'Thực hiện được các phép tính: cộng, trừ, nhân, chia trong tập hợp các đa thức một biến',
        ],
        vanDung: [
          'Vận dụng được những tính chất của các phép tính đó trong tính toán với đa thức một biến',
        ],
      },
    },
    {
      ten: 'Hình học trực quan lớp 7 (Hình hộp chữ nhật, lăng trụ đứng)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Mô tả được một số yếu tố cơ bản (đỉnh, cạnh, góc, đường chéo) của hình hộp chữ nhật và hình lập phương',
          'Mô tả được hình lăng trụ đứng tam giác, hình lăng trụ đứng tứ giác',
        ],
        hieu: [
          'Tạo lập được hình lăng trụ đứng tam giác, hình lăng trụ đứng tứ giác',
          'Tính được diện tích xung quanh, thể tích của hình lăng trụ đứng tam giác, hình lăng trụ đứng tứ giác',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc tính thể tích, diện tích xung quanh của hình hộp chữ nhật, hình lập phương, lăng trụ đứng',
        ],
      },
    },
    {
      ten: 'Hình học phẳng lớp 7 (Góc, hai đường thẳng song song, tam giác)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được các góc ở vị trí đặc biệt (hai góc kề bù, hai góc đối đỉnh); tia phân giác của một góc',
          'Nhận biết được tiên đề Euclid về đường thẳng song song',
          'Nhận biết được thế nào là một định lí, chứng minh một định lí',
          'Nhận biết được khái niệm hai tam giác bằng nhau; đường trung trực của một đoạn thẳng',
          'Nhận biết được liên hệ về độ dài của ba cạnh trong một tam giác',
          'Nhận biết được các đường đặc biệt trong tam giác (đường trung tuyến, đường cao, đường phân giác, đường trung trực); sự đồng quy của chúng',
        ],
        hieu: [
          'Mô tả được một số tính chất của hai đường thẳng song song; mô tả được dấu hiệu song song qua cặp góc đồng vị, góc so le trong',
          'Giải thích được định lí về tổng các góc trong một tam giác bằng 180°',
          'Giải thích được các trường hợp bằng nhau của hai tam giác, của hai tam giác vuông',
          'Mô tả được tam giác cân và giải thích được tính chất của tam giác cân',
          'Giải thích được quan hệ giữa đường vuông góc và đường xiên',
        ],
        vanDung: [
          'Diễn đạt được lập luận và chứng minh hình học trong những trường hợp đơn giản',
          'Giải quyết được một số vấn đề thực tiễn liên quan đến ứng dụng của hình học như: đo, vẽ, tạo dựng các hình đã học',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 7 (Biểu đồ hình quạt, biểu đồ đoạn thẳng)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được mối liên hệ toán học đơn giản giữa các số liệu đã được biểu diễn',
          'Nhận biết được những dạng biểu diễn khác nhau cho một tập dữ liệu',
          'Nhận ra được vấn đề hoặc quy luật đơn giản dựa trên phân tích các số liệu (biểu đồ quạt tròn, biểu đồ đoạn thẳng)',
        ],
        hieu: [
          'Thực hiện và lí giải được việc thu thập, phân loại dữ liệu theo các tiêu chí cho trước',
          'Giải thích được tính hợp lí của dữ liệu theo các tiêu chí toán học đơn giản',
          'Đọc và mô tả thành thạo các dữ liệu ở dạng biểu đồ hình quạt tròn, biểu đồ đoạn thẳng',
          'Lựa chọn và biểu diễn được dữ liệu vào bảng, biểu đồ thích hợp',
        ],
        vanDung: [
          'Giải quyết được những vấn đề đơn giản liên quan đến các số liệu thu được từ biểu đồ',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 7 (Biến cố ngẫu nhiên)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Làm quen với các khái niệm mở đầu về biến cố ngẫu nhiên và xác suất của biến cố ngẫu nhiên',
          'Nhận biết được xác suất của một biến cố ngẫu nhiên trong một số ví dụ đơn giản (ví dụ: lấy bóng trong túi, tung xúc xắc)',
        ],
        hieu: [],
        vanDung: [],
      },
    },
  ],

  // ===========================
  // LỚP 8
  // ===========================
  lop8: [
    {
      ten: 'Đa thức nhiều biến. Hằng đẳng thức đáng nhớ',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được các khái niệm về đơn thức, đa thức nhiều biến',
          'Tính được giá trị của đa thức khi biết giá trị của các biến',
          'Nhận biết được các khái niệm: đồng nhất thức, hằng đẳng thức',
        ],
        hieu: [
          'Thực hiện được việc thu gọn đơn thức, đa thức',
          'Thực hiện được phép nhân đơn thức với đa thức và phép chia hết một đơn thức cho một đơn thức',
          'Thực hiện được các phép tính: cộng, trừ, nhân các đa thức nhiều biến trong những trường hợp đơn giản',
          'Thực hiện được phép chia hết một đa thức cho một đơn thức trong những trường hợp đơn giản',
          'Mô tả được các hằng đẳng thức: bình phương của tổng và hiệu; hiệu hai bình phương; lập phương của tổng và hiệu; tổng và hiệu hai lập phương',
        ],
        vanDung: [
          'Vận dụng được các hằng đẳng thức để phân tích đa thức thành nhân tử (vận dụng trực tiếp; thông qua nhóm hạng tử và đặt nhân tử chung)',
        ],
      },
    },
    {
      ten: 'Phân thức đại số',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được các khái niệm cơ bản về phân thức đại số: định nghĩa; điều kiện xác định; giá trị; hai phân thức bằng nhau',
        ],
        hieu: [
          'Mô tả được những tính chất cơ bản của phân thức đại số',
          'Thực hiện được các phép tính: cộng, trừ, nhân, chia đối với hai phân thức đại số',
        ],
        vanDung: [
          'Vận dụng được các tính chất giao hoán, kết hợp, phân phối, quy tắc dấu ngoặc với phân thức đại số trong tính toán',
        ],
      },
    },
    {
      ten: 'Hàm số bậc nhất y = ax + b và đồ thị',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được những mô hình thực tế dẫn đến khái niệm hàm số',
          'Nhận biết được đồ thị hàm số',
          'Nhận biết được khái niệm hệ số góc của đường thẳng y = ax + b',
        ],
        hieu: [
          'Tính được giá trị của hàm số khi hàm số đó xác định bởi công thức',
          'Xác định được toạ độ của một điểm trên mặt phẳng toạ độ; xác định được một điểm khi biết toạ độ của nó',
          'Thiết lập được bảng giá trị của hàm số bậc nhất y = ax + b',
          'Vẽ được đồ thị của hàm số bậc nhất y = ax + b',
          'Sử dụng được hệ số góc của đường thẳng để nhận biết và giải thích được sự cắt nhau hoặc song song của hai đường thẳng cho trước',
        ],
        vanDung: [
          'Vận dụng được hàm số bậc nhất và đồ thị vào giải quyết một số bài toán thực tiễn (ví dụ: bài toán về chuyển động đều trong Vật lí)',
        ],
      },
    },
    {
      ten: 'Phương trình bậc nhất một ẩn',
      mach: 'so_dai_so',
      yccD: {
        biet: [],
        hieu: [
          'Hiểu được khái niệm phương trình bậc nhất một ẩn và cách giải',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với phương trình bậc nhất (ví dụ: bài toán liên quan đến chuyển động trong Vật lí, bài toán liên quan đến Hoá học)',
        ],
      },
    },
    {
      ten: 'Hình học trực quan lớp 8 (Hình chóp tam giác đều, hình chóp tứ giác đều)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Mô tả (đỉnh, mặt đáy, mặt bên, cạnh bên) hình chóp tam giác đều và hình chóp tứ giác đều',
        ],
        hieu: [
          'Tạo lập được hình chóp tam giác đều và hình chóp tứ giác đều',
          'Tính được diện tích xung quanh, thể tích của một hình chóp tam giác đều và hình chóp tứ giác đều',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc tính thể tích, diện tích xung quanh của hình chóp tam giác đều và hình chóp tứ giác đều',
        ],
      },
    },
    {
      ten: 'Định lí Pythagore. Tứ giác',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được dấu hiệu nhận biết các tứ giác đặc biệt: hình thang cân, hình bình hành, hình chữ nhật, hình thoi, hình vuông',
          'Mô tả được tứ giác, tứ giác lồi',
        ],
        hieu: [
          'Giải thích được định lí Pythagore',
          'Tính được độ dài cạnh trong tam giác vuông bằng cách sử dụng định lí Pythagore',
          'Giải thích được định lí về tổng các góc trong một tứ giác lồi bằng 360°',
          'Giải thích được tính chất về cạnh, góc, đường chéo của các tứ giác đặc biệt',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc vận dụng định lí Pythagore (ví dụ: tính khoảng cách giữa hai vị trí)',
        ],
      },
    },
    {
      ten: 'Định lí Thalès. Tam giác đồng dạng',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được hình đồng dạng phối cảnh (hình vị tự), hình đồng dạng qua các hình ảnh cụ thể',
          'Mô tả được định nghĩa của hai tam giác đồng dạng',
          'Mô tả được định nghĩa đường trung bình của tam giác',
        ],
        hieu: [
          'Giải thích được định lí Thalès trong tam giác (thuận và đảo)',
          'Giải thích được tính chất đường trung bình của tam giác; tính chất đường phân giác trong của tam giác',
          'Tính được độ dài đoạn thẳng bằng cách sử dụng định lí Thalès',
          'Giải thích được các trường hợp đồng dạng của hai tam giác, của hai tam giác vuông',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc vận dụng định lí Thalès (ví dụ: tính khoảng cách giữa hai vị trí)',
          'Giải quyết được một số vấn đề thực tiễn gắn với kiến thức về hai tam giác đồng dạng (ví dụ: đo gián tiếp chiều cao của vật)',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 8 (Thu thập, phân loại, biểu diễn dữ liệu nhiều loại)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được mối liên hệ toán học đơn giản giữa các số liệu đã được biểu diễn; nhận biết được số liệu không chính xác trong những ví dụ đơn giản',
          'So sánh được các dạng biểu diễn khác nhau cho một tập dữ liệu',
          'Phát hiện được vấn đề hoặc quy luật đơn giản dựa trên phân tích các số liệu',
        ],
        hieu: [
          'Thực hiện và lí giải được việc thu thập, phân loại dữ liệu theo các tiêu chí cho trước từ nhiều nguồn',
          'Chứng tỏ được tính hợp lí của dữ liệu theo các tiêu chí toán học đơn giản',
          'Lựa chọn và biểu diễn được dữ liệu vào bảng, biểu đồ thích hợp (bảng thống kê; biểu đồ tranh; biểu đồ cột; biểu đồ quạt tròn; biểu đồ đoạn thẳng)',
          'Mô tả được cách chuyển dữ liệu từ dạng biểu diễn này sang dạng biểu diễn khác',
        ],
        vanDung: [
          'Giải quyết được những vấn đề đơn giản liên quan đến các số liệu thu được từ bảng, biểu đồ',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 8 (Xác suất của biến cố ngẫu nhiên)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được mối liên hệ giữa xác suất thực nghiệm của một biến cố với xác suất của biến cố đó',
        ],
        hieu: [
          'Sử dụng được tỉ số để mô tả xác suất của một biến cố ngẫu nhiên trong một số ví dụ đơn giản',
        ],
        vanDung: [],
      },
    },
  ],

  // ===========================
  // LỚP 9
  // ===========================
  lop9: [
    {
      ten: 'Căn thức. Căn bậc hai và căn bậc ba',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm về căn bậc hai của số thực không âm, căn bậc ba của một số thực',
          'Nhận biết được khái niệm về căn thức bậc hai và căn thức bậc ba của một biểu thức đại số',
        ],
        hieu: [
          'Tính được giá trị (đúng hoặc gần đúng) căn bậc hai, căn bậc ba của một số hữu tỉ bằng máy tính cầm tay',
          'Thực hiện được một số phép tính đơn giản về căn bậc hai của số thực không âm',
          'Thực hiện được một số phép biến đổi đơn giản về căn thức bậc hai của biểu thức đại số (trục căn thức ở mẫu)',
        ],
        vanDung: [],
      },
    },
    {
      ten: 'Hàm số y = ax² và đồ thị',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được tính đối xứng (trục) và trục đối xứng của đồ thị hàm số y = ax²',
        ],
        hieu: [
          'Thiết lập được bảng giá trị của hàm số y = ax²',
          'Vẽ được đồ thị của hàm số y = ax²',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với hàm số y = ax² và đồ thị (ví dụ: bài toán liên quan đến chuyển động trong Vật lí)',
        ],
      },
    },
    {
      ten: 'Phương trình và hệ phương trình bậc nhất hai ẩn',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm phương trình bậc nhất hai ẩn, hệ hai phương trình bậc nhất hai ẩn',
          'Nhận biết được khái niệm nghiệm của hệ hai phương trình bậc nhất hai ẩn',
        ],
        hieu: [
          'Giải được hệ hai phương trình bậc nhất hai ẩn',
          'Tính được nghiệm của hệ hai phương trình bậc nhất hai ẩn bằng máy tính cầm tay',
          'Giải được phương trình tích có dạng (a₁x + b₁).(a₂x + b₂) = 0; giải được phương trình chứa ẩn ở mẫu quy về phương trình bậc nhất',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với hệ hai phương trình bậc nhất hai ẩn (ví dụ: bài toán liên quan đến cân bằng phản ứng trong Hoá học)',
        ],
      },
    },
    {
      ten: 'Phương trình bậc hai một ẩn. Định lí Viète',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm phương trình bậc hai một ẩn',
        ],
        hieu: [
          'Giải được phương trình bậc hai một ẩn',
          'Tính được nghiệm phương trình bậc hai một ẩn bằng máy tính cầm tay',
          'Giải thích được định lí Viète và ứng dụng (ví dụ: tính nhẩm nghiệm của phương trình bậc hai, tìm hai số biết tổng và tích của chúng)',
        ],
        vanDung: [
          'Vận dụng được phương trình bậc hai vào giải quyết bài toán thực tiễn',
        ],
      },
    },
    {
      ten: 'Bất phương trình bậc nhất một ẩn',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được bất đẳng thức và mô tả được một số tính chất cơ bản của bất đẳng thức',
          'Nhận biết được khái niệm bất phương trình bậc nhất một ẩn, nghiệm của bất phương trình bậc nhất một ẩn',
        ],
        hieu: [
          'Giải được bất phương trình bậc nhất một ẩn',
        ],
        vanDung: [],
      },
    },
    {
      ten: 'Hình học trực quan lớp 9 (Hình trụ, hình nón, hình cầu)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Mô tả (đường sinh, chiều cao, bán kính đáy) và tạo lập được hình trụ',
          'Mô tả (đỉnh, đường sinh, chiều cao, bán kính đáy) và tạo lập được hình nón',
          'Mô tả (tâm, bán kính) và tạo lập được hình cầu, mặt cầu; nhận biết được phần chung của mặt phẳng và hình cầu',
        ],
        hieu: [
          'Tính được diện tích xung quanh của hình trụ, hình nón, diện tích mặt cầu',
          'Tính được thể tích của hình trụ, hình nón, hình cầu',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với việc tính diện tích xung quanh, thể tích của hình trụ, hình nón, hình cầu',
        ],
      },
    },
    {
      ten: 'Tỉ số lượng giác của góc nhọn. Hệ thức trong tam giác vuông',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được các giá trị sin, côsin, tang, côtang của góc nhọn',
        ],
        hieu: [
          'Giải thích được tỉ số lượng giác của các góc nhọn đặc biệt (30°, 45°, 60°) và của hai góc phụ nhau',
          'Tính được giá trị (đúng hoặc gần đúng) tỉ số lượng giác của góc nhọn bằng máy tính cầm tay',
          'Giải thích được một số hệ thức về cạnh và góc trong tam giác vuông',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với tỉ số lượng giác của góc nhọn (ví dụ: tính độ dài đoạn thẳng, độ lớn góc và áp dụng giải tam giác vuông)',
        ],
      },
    },
    {
      ten: 'Đường tròn. Góc và đường tròn',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được tâm đối xứng, trục đối xứng của đường tròn',
          'Nhận biết được định nghĩa đường tròn ngoại tiếp, nội tiếp tam giác',
          'Nhận biết được tứ giác nội tiếp đường tròn',
          'Nhận biết được góc ở tâm, góc nội tiếp',
          'Nhận dạng được đa giác đều; nhận biết được phép quay',
        ],
        hieu: [
          'So sánh được độ dài của đường kính và dây',
          'Mô tả được ba vị trí tương đối của hai đường tròn; ba vị trí tương đối của đường thẳng và đường tròn',
          'Giải thích được dấu hiệu nhận biết tiếp tuyến của đường tròn và tính chất của hai tiếp tuyến cắt nhau',
          'Giải thích được mối liên hệ giữa số đo cung với số đo góc ở tâm, số đo góc nội tiếp',
          'Giải thích được định lí về tổng hai góc đối của tứ giác nội tiếp bằng 180°',
          'Xác định được tâm và bán kính đường tròn ngoại tiếp, nội tiếp tam giác',
          'Tính được độ dài cung tròn, diện tích hình quạt tròn, diện tích hình vành khuyên',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với đường tròn (ví dụ: bài toán liên quan đến chuyển động tròn; tính diện tích một số hình phẳng)',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 9 (Tần số, tần số tương đối, bảng ghép nhóm)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Xác định được tần số của một giá trị',
          'Xác định được tần số tương đối của một giá trị',
          'Nhận biết được mối liên hệ giữa thống kê với kiến thức của các môn học khác trong Chương trình lớp 9 và trong thực tiễn',
        ],
        hieu: [
          'Lí giải và thiết lập được dữ liệu vào bảng, biểu đồ thích hợp',
          'Phát hiện và lí giải được số liệu không chính xác dựa trên mối liên hệ toán học đơn giản',
          'Thiết lập được bảng tần số, biểu đồ tần số (biểu đồ cột hoặc biểu đồ đoạn thẳng)',
          'Giải thích được ý nghĩa và vai trò của tần số trong thực tiễn',
          'Thiết lập được bảng tần số tương đối, biểu đồ tần số tương đối',
          'Giải thích được ý nghĩa và vai trò của tần số tương đối trong thực tiễn',
          'Thiết lập được bảng tần số ghép nhóm, bảng tần số tương đối ghép nhóm, biểu đồ tần số tương đối ghép nhóm (histogram)',
        ],
        vanDung: [],
      },
    },
    {
      ten: 'Xác suất lớp 9 (Phép thử ngẫu nhiên, không gian mẫu)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được phép thử ngẫu nhiên và không gian mẫu',
        ],
        hieu: [
          'Tính được xác suất của biến cố bằng cách kiểm đếm số trường hợp có thể và số trường hợp thuận lợi trong một số mô hình xác suất đơn giản',
        ],
        vanDung: [],
      },
    },
  ],

  // ===========================
  // LỚP 10
  // ===========================
  lop10: [
    {
      ten: 'Mệnh đề toán học. Tập hợp và các phép toán trên tập hợp',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được các khái niệm cơ bản về tập hợp (tập con, hai tập hợp bằng nhau, tập rỗng) và biết sử dụng các kí hiệu',
        ],
        hieu: [
          'Thiết lập và phát biểu được các mệnh đề toán học (mệnh đề phủ định; mệnh đề đảo; mệnh đề tương đương; điều kiện cần, điều kiện đủ, điều kiện cần và đủ)',
          'Xác định được tính đúng/sai của một mệnh đề toán học trong những trường hợp đơn giản',
          'Thực hiện được phép toán trên các tập hợp (hợp, giao, hiệu, phần bù) và biết dùng biểu đồ Ven để biểu diễn chúng',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với phép toán trên tập hợp (ví dụ: bài toán liên quan đến đếm số phần tử của hợp các tập hợp)',
        ],
      },
    },
    {
      ten: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
        ],
        hieu: [
          'Biểu diễn được miền nghiệm của bất phương trình và hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ',
        ],
        vanDung: [
          'Vận dụng được kiến thức về bất phương trình, hệ bất phương trình bậc nhất hai ẩn vào giải quyết bài toán thực tiễn (ví dụ: bài toán tìm cực trị của biểu thức F = ax + by trên một miền đa giác)',
        ],
      },
    },
    {
      ten: 'Hàm số bậc hai và đồ thị. Dấu của tam thức bậc hai',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được những mô hình thực tế dẫn đến khái niệm hàm số',
          'Nhận biết được các tính chất cơ bản của Parabola như đỉnh, trục đối xứng',
          'Nhận biết và giải thích được các tính chất của hàm số bậc hai thông qua đồ thị',
        ],
        hieu: [
          'Mô tả được các khái niệm cơ bản về hàm số: định nghĩa, tập xác định, tập giá trị, hàm số đồng biến/nghịch biến, đồ thị',
          'Mô tả được các đặc trưng hình học của đồ thị hàm số đồng biến, hàm số nghịch biến',
          'Thiết lập được bảng giá trị của hàm số bậc hai',
          'Vẽ được Parabola là đồ thị hàm số bậc hai',
          'Giải thích được định lí về dấu của tam thức bậc hai từ việc quan sát đồ thị của hàm bậc hai',
          'Giải được bất phương trình bậc hai',
        ],
        vanDung: [
          'Vận dụng được kiến thức của hàm số vào giải quyết bài toán thực tiễn',
          'Vận dụng được kiến thức về hàm số bậc hai và đồ thị vào giải quyết bài toán thực tiễn (ví dụ: xác định độ cao của cầu, cổng có hình dạng Parabola)',
          'Vận dụng được bất phương trình bậc hai một ẩn vào giải quyết bài toán thực tiễn',
        ],
      },
    },
    {
      ten: 'Đại số tổ hợp. Nhị thức Newton',
      mach: 'so_dai_so',
      yccD: {
        biet: [],
        hieu: [
          'Tính được số các hoán vị, chỉnh hợp, tổ hợp',
          'Tính được số các hoán vị, chỉnh hợp, tổ hợp bằng máy tính cầm tay',
          'Khai triển được nhị thức Newton với số mũ không quá 5',
        ],
        vanDung: [
          'Vận dụng được quy tắc cộng và quy tắc nhân trong một số tình huống đơn giản',
          'Vận dụng được sơ đồ hình cây trong các bài toán đếm đơn giản',
          'Vận dụng được nhị thức Newton để khai triển và tính toán',
        ],
      },
    },
    {
      ten: 'Hình học phẳng lớp 10 (Vectơ và toạ độ)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được khái niệm vectơ, hai vectơ cùng phương, cùng hướng, bằng nhau, vectơ không',
          'Nhận biết được các khái niệm cơ bản về toạ độ: hệ trục toạ độ, toạ độ của điểm, toạ độ của vectơ',
        ],
        hieu: [
          'Thực hiện được các phép toán vectơ: cộng, trừ, nhân với một số',
          'Biểu diễn được vectơ trên mặt phẳng',
          'Tính được toạ độ của vectơ; tính được tọa độ của trung điểm đoạn thẳng, trọng tâm tam giác',
          'Tính được độ dài vectơ, khoảng cách giữa hai điểm',
          'Tính được tích vô hướng của hai vectơ',
          'Tính được góc giữa hai vectơ; nhận biết được hai vectơ vuông góc',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với vectơ và toạ độ',
        ],
      },
    },
    {
      ten: 'Phương trình đường thẳng. Phương trình đường tròn',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được phương trình tham số và phương trình tổng quát của đường thẳng trong mặt phẳng',
          'Nhận biết được phương trình đường tròn',
        ],
        hieu: [
          'Thiết lập được phương trình đường thẳng từ các điều kiện cho trước',
          'Tính được khoảng cách từ điểm đến đường thẳng; khoảng cách giữa hai đường thẳng song song',
          'Xác định được vị trí tương đối của hai đường thẳng; của điểm và đường thẳng',
          'Thiết lập được phương trình đường tròn khi biết tâm và bán kính; xác định được tâm và bán kính khi biết phương trình đường tròn',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với phương trình đường thẳng, đường tròn',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 10 (Số đặc trưng của mẫu số liệu)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được các số đặc trưng đo xu thế trung tâm (trung bình cộng, trung vị, mốt) và đo mức độ phân tán (phương sai, độ lệch chuẩn)',
        ],
        hieu: [
          'Tính được các số đặc trưng đo xu thế trung tâm và đo mức độ phân tán cho mẫu số liệu không ghép nhóm và ghép nhóm',
          'Giải thích được ý nghĩa của các số đặc trưng trong bài toán thực tiễn',
        ],
        vanDung: [
          'Vận dụng được các số đặc trưng để so sánh, nhận xét về mẫu số liệu trong thực tiễn',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 10 (Xác suất của biến cố)',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được các khái niệm: biến cố, xác suất của biến cố; biến cố hợp, biến cố giao, biến cố đối',
        ],
        hieu: [
          'Tính được xác suất của biến cố bằng quy tắc cộng và quy tắc nhân',
          'Mô tả được xác suất có điều kiện',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với xác suất (ví dụ: bài toán kiểm tra sản phẩm, bài toán về sinh học)',
        ],
      },
    },
  ],

  // ===========================
  // LỚP 11 (sẽ bổ sung khi subagent trả về)
  // ===========================
  lop11: [
    {
      ten: 'Hàm số lượng giác và đồ thị',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được các giá trị lượng giác của góc (cung) có số đo đặc biệt',
          'Nhận biết được các tính chất cơ bản của hàm số sin, côsin, tang',
        ],
        hieu: [
          'Mô tả được các hàm số lượng giác y = sinx, y = cosx, y = tanx và đồ thị của chúng',
          'Vẽ được đồ thị của hàm số lượng giác cơ bản',
        ],
        vanDung: [
          'Vận dụng được các công thức lượng giác trong giải quyết bài toán thực tiễn',
        ],
      },
    },
    {
      ten: 'Phương trình lượng giác',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được phương trình lượng giác cơ bản (sinx = a, cosx = a, tanx = a)',
        ],
        hieu: [
          'Giải được các phương trình lượng giác cơ bản',
          'Giải được một số phương trình lượng giác đơn giản quy về phương trình lượng giác cơ bản',
        ],
        vanDung: [
          'Vận dụng được phương trình lượng giác để giải quyết bài toán thực tiễn',
        ],
      },
    },
    {
      ten: 'Dãy số. Cấp số cộng. Cấp số nhân',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm dãy số, dãy số tăng, giảm, bị chặn',
          'Nhận biết được cấp số cộng, cấp số nhân và các tính chất',
        ],
        hieu: [
          'Tính được số hạng tổng quát, tổng n số hạng đầu của cấp số cộng, cấp số nhân',
        ],
        vanDung: [
          'Vận dụng được cấp số cộng, cấp số nhân vào bài toán thực tiễn (ví dụ: bài toán về tài chính, tăng trưởng dân số)',
        ],
      },
    },
    {
      ten: 'Giới hạn. Hàm số liên tục',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm giới hạn của dãy số, giới hạn của hàm số',
          'Nhận biết được khái niệm hàm số liên tục tại một điểm và trên một khoảng',
        ],
        hieu: [
          'Tính được giới hạn của dãy số, giới hạn của hàm số trong một số trường hợp đơn giản',
        ],
        vanDung: [
          'Vận dụng được tính liên tục để giải quyết một số bài toán',
        ],
      },
    },
    {
      ten: 'Đạo hàm và ứng dụng',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm đạo hàm của hàm số tại một điểm và trên một khoảng',
          'Nhận biết được ý nghĩa hình học và ý nghĩa vật lí của đạo hàm',
        ],
        hieu: [
          'Tính được đạo hàm của các hàm số cơ bản (luỹ thừa, hàm số lượng giác, hàm số hợp)',
          'Vận dụng được các quy tắc tính đạo hàm (đạo hàm của tổng, hiệu, tích, thương)',
          'Xác định được chiều biến thiên và cực trị của hàm số bằng đạo hàm',
        ],
        vanDung: [
          'Vận dụng được đạo hàm vào giải quyết bài toán về tốc độ, gia tốc, bài toán tối ưu hóa trong thực tiễn',
        ],
      },
    },
    {
      ten: 'Hình học không gian lớp 11 (Quan hệ song song, vuông góc)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được các quan hệ song song trong không gian (đường thẳng song song với đường thẳng, đường thẳng song song với mặt phẳng, hai mặt phẳng song song)',
          'Nhận biết được hình chiếu vuông góc của điểm, đường thẳng lên mặt phẳng',
          'Nhận biết được góc giữa đường thẳng và mặt phẳng, góc nhị diện, khoảng cách trong không gian',
        ],
        hieu: [
          'Giải thích được các tính chất của hai đường thẳng song song, đường thẳng song song với mặt phẳng, hai mặt phẳng song song',
          'Mô tả được đường vuông góc chung của hai đường thẳng chéo nhau',
          'Tính được góc và khoảng cách trong không gian',
        ],
        vanDung: [
          'Giải quyết được một số vấn đề thực tiễn gắn với hình học không gian (ví dụ: các bài toán về khoảng cách, góc trong không gian)',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 11',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được phương pháp thu thập dữ liệu (phỏng vấn, điều tra, thực nghiệm)',
          'Nhận biết được khái niệm mẫu số liệu, tổng thể',
        ],
        hieu: [
          'Tính được các số đặc trưng thống kê cho mẫu số liệu trong thực tiễn',
          'Đọc và hiểu được các bảng, biểu đồ thống kê phức tạp hơn',
        ],
        vanDung: [
          'Vận dụng được thống kê để phân tích và đưa ra kết luận từ dữ liệu thực tế',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 11',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được biến ngẫu nhiên rời rạc và phân phối xác suất của biến ngẫu nhiên rời rạc',
          'Nhận biết được phân phối nhị thức',
        ],
        hieu: [
          'Tính được kỳ vọng và phương sai của biến ngẫu nhiên rời rạc',
          'Tính được xác suất theo phân phối nhị thức',
        ],
        vanDung: [
          'Vận dụng được phân phối nhị thức vào bài toán thực tiễn',
        ],
      },
    },
  ],

  // ===========================
  // LỚP 12
  // ===========================
  lop12: [
    {
      ten: 'Ứng dụng của đạo hàm vào khảo sát hàm số',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được sơ đồ khảo sát hàm số (bảng biến thiên, các điểm đặc biệt)',
        ],
        hieu: [
          'Lập được bảng biến thiên và vẽ được đồ thị của hàm số bậc ba, bậc bốn trùng phương, hàm phân thức đơn giản',
          'Xác định được cực trị, giá trị lớn nhất/nhỏ nhất của hàm số trên một đoạn',
          'Đọc và phân tích được đồ thị hàm số',
        ],
        vanDung: [
          'Vận dụng được khảo sát hàm số để giải quyết bài toán tối ưu hóa trong thực tiễn (ví dụ: bài toán thiết kế tối ưu, bài toán kinh tế)',
        ],
      },
    },
    {
      ten: 'Hàm số mũ và logarit',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm luỹ thừa với số mũ thực, hàm số mũ, hàm số logarit',
        ],
        hieu: [
          'Tính được giá trị các biểu thức luỹ thừa, logarit',
          'Vẽ được đồ thị của hàm số mũ và hàm số logarit cơ bản',
          'Nêu được các tính chất cơ bản của hàm số mũ và hàm số logarit',
          'Giải được phương trình, bất phương trình mũ và logarit đơn giản',
        ],
        vanDung: [
          'Vận dụng được hàm số mũ và logarit vào giải quyết bài toán thực tiễn (ví dụ: bài toán về tăng trưởng, phân rã phóng xạ, tính lãi suất)',
        ],
      },
    },
    {
      ten: 'Nguyên hàm và tích phân',
      mach: 'so_dai_so',
      yccD: {
        biet: [
          'Nhận biết được khái niệm nguyên hàm và tích phân xác định',
          'Nhận biết được ý nghĩa hình học của tích phân (diện tích hình thang cong)',
        ],
        hieu: [
          'Tính được nguyên hàm bằng định nghĩa và bảng nguyên hàm cơ bản',
          'Tính được tích phân xác định bằng công thức Newton-Leibniz',
          'Tính được diện tích hình phẳng bằng tích phân',
        ],
        vanDung: [
          'Vận dụng được tích phân để tính diện tích hình phẳng và thể tích vật thể tròn xoay trong một số trường hợp đơn giản',
        ],
      },
    },
    {
      ten: 'Hình học không gian lớp 12 (Khối đa diện, khối tròn xoay)',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được khái niệm khối đa diện (hình lăng trụ, hình chóp, hình chóp cụt)',
          'Nhận biết được khái niệm khối tròn xoay (hình trụ, hình nón, hình nón cụt, hình cầu)',
        ],
        hieu: [
          'Tính được diện tích toàn phần và thể tích của các khối đa diện và khối tròn xoay trong không gian',
          'Tính được tỉ số thể tích, tỉ số diện tích của các khối đồng dạng',
        ],
        vanDung: [
          'Giải quyết được các bài toán thực tiễn liên quan đến tính thể tích, diện tích của các khối hình học trong không gian',
        ],
      },
    },
    {
      ten: 'Phương pháp toạ độ trong không gian',
      mach: 'hinh_hoc_do_luong',
      yccD: {
        biet: [
          'Nhận biết được hệ toạ độ Descartes trong không gian, toạ độ của điểm, vectơ trong không gian',
          'Nhận biết được phương trình mặt phẳng, phương trình đường thẳng trong không gian',
        ],
        hieu: [
          'Tính được toạ độ của điểm, vectơ; tính được tích vô hướng của hai vectơ trong không gian',
          'Viết được phương trình mặt phẳng, đường thẳng trong không gian từ các điều kiện cho trước',
          'Tính được góc giữa hai đường thẳng, giữa đường thẳng và mặt phẳng, giữa hai mặt phẳng',
          'Tính được khoảng cách từ điểm đến mặt phẳng, khoảng cách giữa đường thẳng và mặt phẳng song song',
        ],
        vanDung: [
          'Vận dụng được phương pháp toạ độ để giải quyết bài toán hình học trong không gian',
        ],
      },
    },
    {
      ten: 'Thống kê lớp 12',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được phân phối chuẩn và các tính chất cơ bản của nó',
          'Nhận biết được khái niệm ước lượng tham số',
        ],
        hieu: [
          'Sử dụng được bảng phân phối chuẩn để tính xác suất',
          'Xây dựng được khoảng tin cậy cho trung bình tổng thể',
        ],
        vanDung: [
          'Vận dụng được phân phối chuẩn và ước lượng tham số vào bài toán thực tiễn (ví dụ: kiểm soát chất lượng sản phẩm)',
        ],
      },
    },
    {
      ten: 'Xác suất lớp 12',
      mach: 'thong_ke_xac_suat',
      yccD: {
        biet: [
          'Nhận biết được biến ngẫu nhiên liên tục và phân phối chuẩn',
        ],
        hieu: [
          'Tính được xác suất theo phân phối chuẩn bằng bảng tra cứu',
        ],
        vanDung: [
          'Vận dụng được phân phối chuẩn vào bài toán thực tiễn',
        ],
      },
    },
  ],
};
