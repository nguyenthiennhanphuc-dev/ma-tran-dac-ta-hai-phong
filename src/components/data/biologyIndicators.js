// src/components/data/biologyIndicators.js
// Năng lực Sinh học theo khung GDPT 2018

export const biologyIndicators = [
    // Nhận thức sinh học (NT)
    { id: 'b_nt_1', content: 'Nhận biết, kể tên, phát biểu, nêu được các đối tượng, khái niệm, quy luật, quá trình sinh học.', code: 'NT1', level: 'biet' },
    { id: 'b_nt_2', content: 'Trình bày, mô tả được đặc điểm, vai trò của đối tượng, quá trình sinh học.', code: 'NT2', level: 'biet' },
    { id: 'b_nt_3', content: 'Phân loại được các đối tượng, hiện tượng sinh học theo các tiêu chí nhất định.', code: 'NT3', level: 'hieu' },
    { id: 'b_nt_4', content: 'Phân tích được các đặc điểm của đối tượng, quá trình sinh học.', code: 'NT4', level: 'hieu' },
    { id: 'b_nt_5', content: 'So sánh, lựa chọn được các đối tượng, khái niệm sinh học.', code: 'NT5', level: 'hieu' },
    { id: 'b_nt_6', content: 'Giải thích được mối quan hệ (nguyên nhân - kết quả, cấu tạo - chức năng) trong sinh học.', code: 'NT6', level: 'vanDung' },
    { id: 'b_nt_7', content: 'Nhận ra và điều chỉnh được sai sót; đưa ra những nhận định phê phán.', code: 'NT7', level: 'vanDung' },
    { id: 'b_nt_8', content: 'Đưa ra nhận định, đánh giá các vấn đề sinh học.', code: 'NT8', level: 'vanDung' },

    // Tìm hiểu thế giới sống (TH)
    { id: 'b_th_1', content: 'Đề xuất vấn đề nghiên cứu thế giới sống.', code: 'TH1', level: 'hieu' },
    { id: 'b_th_2', content: 'Đưa ra phán đoán, xây dựng giả thuyết.', code: 'TH2', level: 'hieu' },
    { id: 'b_th_3', content: 'Lập kế hoạch thực hiện tìm hiểu, nghiên cứu.', code: 'TH3', level: 'vanDung' },
    { id: 'b_th_4', content: 'Thực hiện kế hoạch tìm hiểu, tiến hành thí nghiệm.', code: 'TH4', level: 'vanDung' },
    { id: 'b_th_5', content: 'Viết, trình bày báo cáo và thảo luận về kết quả.', code: 'TH5', level: 'vanDung' },

    // Vận dụng (VD)
    { id: 'b_vd_1', content: 'Giải thích được các hiện tượng thực tiễn bằng kiến thức sinh học.', code: 'VD1', level: 'hieu' },
    { id: 'b_vd_2', content: 'Đề xuất các biện pháp giải quyết vấn đề thực tiễn liên quan đến sinh học.', code: 'VD2', level: 'vanDung' }
];

export const biologyCompetencyGroups = {
    NT: { name: 'Nhận thức sinh học', color: 'blue', indicators: biologyIndicators.filter(i => i.code.startsWith('NT')) },
    TH: { name: 'Tìm hiểu thế giới sống', color: 'green', indicators: biologyIndicators.filter(i => i.code.startsWith('TH')) },
    VD: { name: 'Vận dụng kiến thức, kĩ năng', color: 'orange', indicators: biologyIndicators.filter(i => i.code.startsWith('VD')) }
};
