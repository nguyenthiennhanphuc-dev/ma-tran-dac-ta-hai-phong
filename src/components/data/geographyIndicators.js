// src/components/data/geographyIndicators.js
// Năng lực Địa lí theo khung GDPT 2018

export const geographyIndicators = [
    // Nhận thức khoa học địa lí (NT)
    { id: 'g_nt_1', content: 'Nhận biết, nêu được các đối tượng, sự vật, hiện tượng địa lí.', code: 'NT1', level: 'biet' },
    { id: 'g_nt_2', content: 'Trình bày, mô tả được đặc điểm của đối tượng, sự vật, hiện tượng địa lí.', code: 'NT2', level: 'biet' },
    { id: 'g_nt_3', content: 'Phân tích được các mối liên hệ không gian và các quá trình địa lí.', code: 'NT3', level: 'hieu' },
    { id: 'g_nt_4', content: 'Giải thích được sự phân bố, đặc điểm của các sự vật, hiện tượng địa lí.', code: 'NT4', level: 'hieu' },
    { id: 'g_nt_5', content: 'Đánh giá được các hiện tượng và quá trình địa lí.', code: 'NT5', level: 'vanDung' },

    // Tìm hiểu địa lí (TH)
    { id: 'g_th_1', content: 'Sử dụng các công cụ địa lí (bản đồ, biểu đồ, số liệu thống kê...).', code: 'TH1', level: 'hieu' },
    { id: 'g_th_2', content: 'Khai thác thông tin từ internet và các tài liệu khác.', code: 'TH2', level: 'hieu' },
    { id: 'g_th_3', content: 'Thực địa, quan sát, thu thập thông tin và nhận xét thực tế.', code: 'TH3', level: 'vanDung' },

    // Vận dụng kiến thức, kĩ năng đã học (VD)
    { id: 'g_vd_1', content: 'Cập nhật thông tin và liên hệ thực tế.', code: 'VD1', level: 'vanDung' },
    { id: 'g_vd_2', content: 'Vận dụng tri thức địa lí để giải thích các vấn đề thực tiễn.', code: 'VD2', level: 'vanDung' },
    { id: 'g_vd_3', content: 'Đề xuất các giải pháp giải quyết vấn đề thực tiễn liên quan đến địa lí.', code: 'VD3', level: 'vanDung' }
];

export const geographyCompetencyGroups = {
    NT: { name: 'Nhận thức khoa học địa lí', color: 'blue', indicators: geographyIndicators.filter(i => i.code.startsWith('NT')) },
    TH: { name: 'Tìm hiểu địa lí', color: 'green', indicators: geographyIndicators.filter(i => i.code.startsWith('TH')) },
    VD: { name: 'Vận dụng kiến thức, kĩ năng', color: 'orange', indicators: geographyIndicators.filter(i => i.code.startsWith('VD')) }
};
