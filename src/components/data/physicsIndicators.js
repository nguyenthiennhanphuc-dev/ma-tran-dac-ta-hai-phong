// src/components/data/physicsIndicators.js
// Năng lực Vật lí theo khung GDPT 2018

export const physicsIndicators = [
    // Nhận thức vật lí (NT)
    { id: 'p_nt_1', content: 'Nhận biết và nêu được các đối tượng, khái niệm, hiện tượng, quy luật, quá trình vật lí.', code: 'NT1', level: 'biet' },
    { id: 'p_nt_2', content: 'Trình bày, mô tả được đặc điểm của các đối tượng, hiện tượng, quá trình vật lí.', code: 'NT2', level: 'biet' },
    { id: 'p_nt_3', content: 'So sánh, phân loại được các đối tượng, hiện tượng, quá trình vật lí.', code: 'NT3', level: 'hieu' },
    { id: 'p_nt_4', content: 'Phân tích, giải thích được các hiện tượng, quá trình vật lí ở mức độ đơn giản.', code: 'NT4', level: 'hieu' },
    { id: 'p_nt_5', content: 'Hệ thống hoá kiến thức; tạo ra được mối liên kết giữa các kiến thức vật lí đã học.', code: 'NT5', level: 'vanDung' },

    // Tìm hiểu thế giới tự nhiên dưới góc độ vật lí (TH)
    { id: 'p_th_1', content: 'Đề xuất vấn đề liên quan đến vật lí; đặt câu hỏi, nêu giả thuyết.', code: 'TH1', level: 'hieu' },
    { id: 'p_th_2', content: 'Đưa ra phán đoán và xây dựng giả thuyết.', code: 'TH2', level: 'hieu' },
    { id: 'p_th_3', content: 'Lập kế hoạch thực hiện quá trình tìm hiểu.', code: 'TH3', level: 'vanDung' },
    { id: 'p_th_4', content: 'Thực hiện kế hoạch tìm hiểu, tiến hành thí nghiệm, thu thập dữ liệu.', code: 'TH4', level: 'vanDung' },
    { id: 'p_th_5', content: 'Viết, trình bày báo cáo và thảo luận về kết quả tìm hiểu.', code: 'TH5', level: 'vanDung' },

    // Vận dụng kiến thức, kĩ năng đã học (VD)
    { id: 'p_vd_1', content: 'Giải thích, chứng minh được một số vấn đề thực tiễn liên quan đến vật lí.', code: 'VD1', level: 'vanDung' },
    { id: 'p_vd_2', content: 'Đánh giá, phản biện ảnh hưởng của vật lí đối với tự nhiên, xã hội.', code: 'VD2', level: 'vanDung' },
    { id: 'p_vd_3', content: 'Đề xuất giải pháp và thiết kế mô hình giải quyết vấn đề thực tiễn.', code: 'VD3', level: 'vanDung' }
];

export const physicsCompetencyGroups = {
    NT: { name: 'Nhận thức vật lí', color: 'blue', indicators: physicsIndicators.filter(i => i.code.startsWith('NT')) },
    TH: { name: 'Tìm hiểu thế giới tự nhiên dưới góc độ vật lí', color: 'green', indicators: physicsIndicators.filter(i => i.code.startsWith('TH')) },
    VD: { name: 'Vận dụng kiến thức, kĩ năng', color: 'orange', indicators: physicsIndicators.filter(i => i.code.startsWith('VD')) }
};
