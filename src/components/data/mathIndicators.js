// src/components/data/mathIndicators.js
// Năng lực Toán học theo khung GDPT 2018 - Cập nhật mức độ nhận thức (level)

export const mathIndicators = [
    // TD - Tư duy và Lập luận
    { id: 'm_td_1_1', content: 'Thực hiện được tương đối thành thạo các thao tác tư duy.', code: 'TD1.1', level: 'biet' },
    { id: 'm_td_1_2', content: 'Phát hiện được sự tương đồng và khác biệt trong những tình huống tương đối phức tạp.', code: 'TD1.2', level: 'biet' },
    { id: 'm_td_1_3', content: 'Lí giải được kết quả của việc quan sát.', code: 'TD1.3', level: 'biet' },
    { id: 'm_td_2_1', content: 'Sử dụng được các phương pháp lập luận để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', code: 'TD2.1', level: 'hieu' },
    { id: 'm_td_2_2', content: 'Sử dụng được các phương pháp quy nạp để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', code: 'TD2.2', level: 'hieu' },
    { id: 'm_td_2_3', content: 'Sử dụng được các phương pháp suy diễn để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', code: 'TD2.3', level: 'hieu' },
    { id: 'm_td_3_1', content: 'Nêu được câu hỏi khi lập luận, giải quyết vấn đề.', code: 'TD3.1', level: 'vanDung' },
    { id: 'm_td_3_2', content: 'Trả lời được câu hỏi khi lập luận, giải quyết vấn đề.', code: 'TD3.2', level: 'vanDung' },
    { id: 'm_td_3_3', content: 'Giải thích được giải pháp thực hiện về phương diện toán học.', code: 'TD3.3', level: 'vanDung' },
    { id: 'm_td_3_4', content: 'Chứng minh được giải pháp thực hiện về phương diện toán học.', code: 'TD3.4', level: 'vanDung' },
    { id: 'm_td_3_5', content: 'Điều chỉnh được giải pháp thực hiện về phương diện toán học.', code: 'TD3.5', level: 'vanDung' },

    // GQ - Giải quyết vấn đề
    { id: 'm_gq_1_1', content: 'Xác định được tình huống có vấn đề.', code: 'GQ1.1', level: 'biet' },
    { id: 'm_gq_1_2', content: 'Thu thập được thông tin.', code: 'GQ1.2', level: 'biet' },
    { id: 'm_gq_1_3', content: 'Sắp xếp được thông tin.', code: 'GQ1.3', level: 'biet' },
    { id: 'm_gq_1_4', content: 'Giải thích được thông tin.', code: 'GQ1.4', level: 'hieu' },
    { id: 'm_gq_1_5', content: 'Đánh giá được độ tin cậy của thông tin.', code: 'GQ1.5', level: 'hieu' },
    { id: 'm_gq_1_6', content: 'Chia sẻ được sự am hiểu vấn đề với người khác.', code: 'GQ1.6', level: 'hieu' },
    { id: 'm_gq_2_1', content: 'Lựa chọn được cách thức, quy trình giải quyết vấn đề.', code: 'GQ2.1', level: 'hieu' },
    { id: 'm_gq_2_2', content: 'Thiết lập được cách thức, quy trình giải quyết vấn đề.', code: 'GQ2.2', level: 'hieu' },
    { id: 'm_gq_3_1', content: 'Thực hiện giải pháp giải quyết vấn đề.', code: 'GQ3.1', level: 'vanDung' },
    { id: 'm_gq_3_2', content: 'Trình bày được giải pháp giải quyết vấn đề.', code: 'GQ3.2', level: 'vanDung' },
    { id: 'm_gq_4_1', content: 'Đánh giá được giải pháp đã thực hiện.', code: 'GQ4.1', level: 'vanDung' },
    { id: 'm_gq_4_2', content: 'Phản ánh được giá trị của giải pháp.', code: 'GQ4.2', level: 'vanDung' },
    { id: 'm_gq_4_3', content: 'Khái quát hoá được cho vấn đề tương tự.', code: 'GQ4.3', level: 'vanDung' },

    // MH - Mô hình hóa
    { id: 'm_mh_1_1', content: 'Thiết lập được mô hình toán học mô tả tình huống thực tiễn.', code: 'MH1', level: 'biet' },
    { id: 'm_mh_2_1', content: 'Giải quyết được những vấn đề toán học trong mô hình được thiết lập.', code: 'MH2', level: 'hieu' },
    { id: 'm_mh_3_1', content: 'Lí giải được tính đúng đắn của lời giải trong ngữ cảnh thực tế.', code: 'MH3.1', level: 'vanDung' },
    { id: 'm_mh_3_2', content: 'Nhận biết được cách đơn giản hoá, điều chỉnh yêu cầu thực tiễn.', code: 'MH3.2', level: 'vanDung' },

    // GT - Giao tiếp
    { id: 'm_gt_1_1', content: 'Nghe hiểu, đọc hiểu thành thạo thông tin toán học cơ bản.', code: 'GT1.1', level: 'biet' },
    { id: 'm_gt_1_2', content: 'Ghi chép (tóm tắt) thành thạo các thông tin toán học cơ bản.', code: 'GT1.2', level: 'biet' },
    { id: 'm_gt_1_3', content: 'Phân tích được các thông tin toán học cần thiết.', code: 'GT1.3', level: 'hieu' },
    { id: 'm_gt_1_4', content: 'Lựa chọn được các thông tin toán học cần thiết.', code: 'GT1.4', level: 'hieu' },
    { id: 'm_gt_1_5', content: 'Trích xuất được các thông tin toán học cần thiết.', code: 'GT1.5', level: 'hieu' },
    { id: 'm_gt_2_1', content: 'Lí giải được việc trình bày, diễn đạt, thảo luận các nội dung toán học.', code: 'GT2', level: 'hieu' },
    { id: 'm_gt_3_1', content: 'Sử dụng hợp lí ngôn ngữ toán học để biểu đạt cách suy nghĩ.', code: 'GT3', level: 'vanDung' },
    { id: 'm_gt_4_1', content: 'Thể hiện sự tự tin khi trình bày, thảo luận liên quan đến toán học.', code: 'GT4', level: 'vanDung' },

    // CC - Công cụ phương tiện
    { id: 'm_cc_1_1', content: 'Nhận biết được tác dụng các công cụ, phương tiện học toán.', code: 'CC1.1', level: 'biet' },
    { id: 'm_cc_1_2', content: 'Nhận biết được quy cách sử dụng các công cụ, phương tiện học toán.', code: 'CC1.2', level: 'biet' },
    { id: 'm_cc_1_3', content: 'Nhận biết được cách thức bảo quản các công cụ, phương tiện học toán.', code: 'CC1.3', level: 'biet' },
    { id: 'm_cc_2_1', content: 'Sử dụng được máy tính cầm tay để giải quyết vấn đề.', code: 'CC2.1', level: 'hieu' },
    { id: 'm_cc_2_2', content: 'Sử dụng được phương tiện công nghệ để giải quyết vấn đề.', code: 'CC2.2', level: 'hieu' },
    { id: 'm_cc_2_3', content: 'Sử dụng được nguồn tài nguyên trên mạng để giải quyết vấn đề.', code: 'CC2.3', level: 'hieu' },
    { id: 'm_cc_3_1', content: 'Đánh giá được cách thức sử dụng các công cụ học toán.', code: 'CC3', level: 'vanDung' },
];

export const searchMathIndicators = (keyword) => {
    if (!keyword) return [];
    const lowerKw = keyword.toLowerCase();
    return mathIndicators.filter(item =>
        item.content.toLowerCase().includes(lowerKw) ||
        item.code.toLowerCase().includes(lowerKw)
    );
};

export const mathCompetencyGroups = {
    TD: {
        name: 'Tư duy và Lập luận Toán học',
        color: 'blue',
        indicators: [
            { code: 'TD1.1', content: 'Thực hiện được tương đối thành thạo các thao tác tư duy.', level: 'biet' },
            { code: 'TD1.2', content: 'Phát hiện được sự tương đồng và khác biệt trong những tình huống tương đối phức tạp.', level: 'biet' },
            { code: 'TD1.3', content: 'Lí giải được kết quả của việc quan sát.', level: 'biet' },
            { code: 'TD2.1', content: 'Sử dụng được các phương pháp lập luận để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', level: 'hieu' },
            { code: 'TD2.2', content: 'Sử dụng được các phương pháp quy nạp để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', level: 'hieu' },
            { code: 'TD2.3', content: 'Sử dụng được các phương pháp suy diễn để nhìn ra những cách thức khác nhau trong việc giải quyết vấn đề.', level: 'hieu' },
            { code: 'TD3.1', content: 'Nêu được câu hỏi khi lập luận, giải quyết vấn đề.', level: 'vanDung' },
            { code: 'TD3.2', content: 'Trả lời được câu hỏi khi lập luận, giải quyết vấn đề.', level: 'vanDung' },
            { code: 'TD3.3', content: 'Giải thích được giải pháp thực hiện về phương diện toán học.', level: 'vanDung' },
            { code: 'TD3.4', content: 'Chứng minh được giải pháp thực hiện về phương diện toán học.', level: 'vanDung' },
            { code: 'TD3.5', content: 'Điều chỉnh được giải pháp thực hiện về phương diện toán học.', level: 'vanDung' },
        ],
    },
    GQ: {
        name: 'Giải quyết vấn đề Toán học',
        color: 'emerald',
        indicators: [
            { code: 'GQ1.1', content: 'Xác định được tình huống có vấn đề.', level: 'biet' },
            { code: 'GQ1.2', content: 'Thu thập được thông tin.', level: 'biet' },
            { code: 'GQ1.3', content: 'Sắp xếp được thông tin.', level: 'biet' },
            { code: 'GQ1.4', content: 'Giải thích được thông tin.', level: 'hieu' },
            { code: 'GQ1.5', content: 'Đánh giá được độ tin cậy của thông tin.', level: 'hieu' },
            { code: 'GQ1.6', content: 'Chia sẻ được sự am hiểu vấn đề với người khác.', level: 'hieu' },
            { code: 'GQ2.1', content: 'Lựa chọn được cách thức, quy trình giải quyết vấn đề.', level: 'hieu' },
            { code: 'GQ2.2', content: 'Thiết lập được cách thức, quy trình giải quyết vấn đề.', level: 'hieu' },
            { code: 'GQ3.1', content: 'Thực hiện giải pháp giải quyết vấn đề.', level: 'vanDung' },
            { code: 'GQ3.2', content: 'Trình bày được giải pháp giải quyết vấn đề.', level: 'vanDung' },
            { code: 'GQ4.1', content: 'Đánh giá được giải pháp đã thực hiện.', level: 'vanDung' },
            { code: 'GQ4.2', content: 'Phản ánh được giá trị của giải pháp.', level: 'vanDung' },
            { code: 'GQ4.3', content: 'Khái quát hoá được cho vấn đề tương tự.', level: 'vanDung' },
        ],
    },
    MH: {
        name: 'Mô hình hoá Toán học',
        color: 'amber',
        indicators: [
            { code: 'MH1', content: 'Thiết lập được mô hình toán học (công thức, phương trình, sơ đồ, bảng biểu, đồ thị...) mô tả tình huống thực tiễn.', level: 'biet' },
            { code: 'MH2', content: 'Giải quyết được những vấn đề toán học trong mô hình được thiết lập.', level: 'hieu' },
            { code: 'MH3.1', content: 'Lí giải được tính đúng đắn của lời giải trong ngữ cảnh thực tế.', level: 'vanDung' },
            { code: 'MH3.2', content: 'Nhận biết được cách đơn giản hoá, điều chỉnh các yêu cầu thực tiễn (xấp xỉ, bổ sung giả thiết...).', level: 'vanDung' },
        ],
    },
    GT: {
        name: 'Giao tiếp Toán học',
        color: 'purple',
        indicators: [
            { code: 'GT1.1', content: 'Nghe hiểu, đọc hiểu thành thạo các thông tin toán học cơ bản trong văn bản nói hoặc viết.', level: 'biet' },
            { code: 'GT1.2', content: 'Ghi chép (tóm tắt) thành thạo các thông tin toán học cơ bản.', level: 'biet' },
            { code: 'GT1.3', content: 'Phân tích được các thông tin toán học cần thiết.', level: 'hieu' },
            { code: 'GT1.4', content: 'Lựa chọn được các thông tin toán học cần thiết.', level: 'hieu' },
            { code: 'GT1.5', content: 'Trích xuất được các thông tin toán học cần thiết.', level: 'hieu' },
            { code: 'GT2', content: 'Lí giải được việc trình bày, diễn đạt, thảo luận các nội dung toán học trong tương tác với người khác.', level: 'hieu' },
            { code: 'GT3', content: 'Sử dụng hợp lí ngôn ngữ toán học kết hợp ngôn ngữ thông thường để biểu đạt cách suy nghĩ.', level: 'vanDung' },
            { code: 'GT4', content: 'Thể hiện sự tự tin khi trình bày, diễn đạt, nêu câu hỏi, thảo luận liên quan đến toán học.', level: 'vanDung' },
        ],
    },
    CC: {
        name: 'Công cụ và Phương tiện Toán học',
        color: 'rose',
        indicators: [
            { code: 'CC1.1', content: 'Nhận biết được tác dụng các công cụ, phương tiện học toán.', level: 'biet' },
            { code: 'CC1.2', content: 'Nhận biết được quy cách sử dụng các công cụ, phương tiện học toán.', level: 'biet' },
            { code: 'CC1.3', content: 'Nhận biết được cách thức bảo quản các công cụ, phương tiện học toán.', level: 'biet' },
            { code: 'CC2.1', content: 'Sử dụng được máy tính cầm tay để giải quyết một số vấn đề toán học.', level: 'hieu' },
            { code: 'CC2.2', content: 'Sử dụng được phương tiện công nghệ để giải quyết một số vấn đề toán học.', level: 'hieu' },
            { code: 'CC2.3', content: 'Sử dụng được nguồn tài nguyên trên mạng Internet để giải quyết vấn đề toán học.', level: 'hieu' },
            { code: 'CC3', content: 'Đánh giá được cách thức sử dụng các công cụ, phương tiện học toán.', level: 'vanDung' },
        ],
    },
};
