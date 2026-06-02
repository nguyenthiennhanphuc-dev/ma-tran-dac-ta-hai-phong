const fs = require('fs');

let content = fs.readFileSync('src/components/Step5_AIGenerator.jsx', 'utf8');

// 1. Update the AI Prompt for LOẠI 2
const oldPrompt = `[LOẠI 2: TRẮC NGHIỆM ĐÚNG/SAI — CHÙM CÂU HỎI] (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)
⚠️ QUAN TRỌNG: Mỗi câu Đúng/Sai BẮT BUỘC phải có 1 ĐỀ BÀI CHUNG (đoạn tình huống, dữ liệu, bài toán) đặt ở đầu. Sau đó phát triển thành 4 ý a), b), c), d) LIÊN QUAN CHẶT CHẼ đến đề bài chung đó.
⚠️ YÊU CẦU PHÂN MỨC ĐỘ 4 Ý (BẮT BUỘC): Ý a) ở mức Nhận biết, ý b) ở mức Thông hiểu, ý c) ở mức Vận dụng (vừa), ý d) ở mức Vận dụng cao (khó).
Câu [Số] (Chủ đề: ...): [Nội dung đề bài chung / Tình huống / Đoạn dữ liệu]
a) (Mức độ: Nhận biết) [Mệnh đề đúng/sai liên quan đề bài chung]
b) (Mức độ: Thông hiểu) [Mệnh đề đúng/sai liên quan đề bài chung]
c) (Mức độ: Vận dụng) [Mệnh đề đúng/sai liên quan đề bài chung]
d) (Mức độ: Vận dụng cao) [Mệnh đề đúng/sai liên quan đề bài chung]
Đáp án đúng: a-Đ, b-S, c-Đ, d-S
Giải thích: [Giải thích ngắn gọn vì sao đúng/sai]`;

const newPrompt = `[LOẠI 2: TRẮC NGHIỆM ĐÚNG/SAI — CHÙM CÂU HỎI] (Mỗi ý đúng được \${examConfig.diemMoiYP2} điểm)
⚠️ QUAN TRỌNG: Mỗi câu Đúng/Sai BẮT BUỘC có 1 ĐỀ BÀI CHUNG ở đầu. Sau đó phát triển 4 ý a,b,c,d.
⚠️ YÊU CẦU PHÂN MỨC ĐỘ 4 Ý: Ý a) mức Nhận biết, ý b) mức Thông hiểu, ý c) mức Vận dụng, ý d) mức Vận dụng cao.
Câu [Số] (Chủ đề: ...): [Nội dung đề bài chung / Tình huống]
a) (Mức độ: Nhận biết) [Mệnh đề a]
b) (Mức độ: Thông hiểu) [Mệnh đề b]
c) (Mức độ: Vận dụng) [Mệnh đề c]
d) (Mức độ: Vận dụng cao) [Mệnh đề d]
Đáp án đúng: a-Đ, b-S, c-Đ, d-S
Giải thích: [Giải thích ngắn gọn vì sao đúng/sai]`;

content = content.replace(oldPrompt, newPrompt);

// 2. Update the logic for calculating soCauDungSai inside handleCopyExamPrompt
const oldSoCauDungSaiLogic = `const totalDungSai = getFlatCount('dungSai');
    const totalTraLoiNgan = config.hasTraLoiNgan ? getFlatCount('traLoiNgan') : 0;
    const totalTuLuan = getFlatCount('tuLuan');

    const soCauDungSai = Math.ceil(totalDungSai / 4);`;

const newSoCauDungSaiLogic = `const totalTraLoiNgan = config.hasTraLoiNgan ? getFlatCount('traLoiNgan') : 0;
    const totalTuLuan = getFlatCount('tuLuan');

    const soCauDungSai = (() => {
      let totalBiet = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          totalBiet += Number(dv.dungSai?.biet) || 0;
        });
      });
      return totalBiet;
    })();`;

content = content.replace(oldSoCauDungSaiLogic, newSoCauDungSaiLogic);

// 3. Update buildDvktLabels logic for dungSai
const oldBuildDvktLabels = `const buildDvktLabels = (typeKey) => {
      const labels = [];
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          const count = (Number(obj.biet) || 0) + (Number(obj.hieu) || 0) + (Number(obj.vanDung) || 0);
          if (count > 0) {
            for (let c = 0; c < count; c++) labels.push(dv.noiDung || '');
          }
        });
      });
      return labels;
    };`;

const newBuildDvktLabels = `const buildDvktLabels = (typeKey) => {
      const labels = [];
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          const obj = dv[typeKey] || {};
          let count = (Number(obj.biet) || 0) + (Number(obj.hieu) || 0) + (Number(obj.vanDung) || 0);
          if (typeKey === 'dungSai') {
            count = Number(obj.biet) || 0;
          }
          if (count > 0) {
            for (let c = 0; c < count; c++) labels.push(dv.noiDung || '');
          }
        });
      });
      return labels;
    };`;

content = content.replace(oldBuildDvktLabels, newBuildDvktLabels);

// 4. Update the render slot logic for Phần II
const oldPhan2SlotLogic = `// --- PHẦN II ---
    const totalTF = getTotalY('dungSai');
    const soCauTF = Math.ceil(totalTF / 4);
    const tfDvktLabels = buildDvktLabels('dungSai');
    for (let i = 0; i < soCauTF; i++) {
      const key = \`phan2_cau\${i + 1}\`;
      const daDien = isSlotFilled(key);
      const dvktName = tfDvktLabels[i * 4] || '';
      const dvktSuffix = dvktName ? \` - \${dvktName}\` : '';
      slots.push({ key, label: \`Phần II - Câu \${i + 1} (Đúng/Sai)\${dvktSuffix}\${daDien ? ' ✅' : ''}\`, loai: 2, daDien });
    }`;

const newPhan2SlotLogic = `// --- PHẦN II ---
    const soCauTF = (() => {
      let totalBiet = 0;
      matrix.forEach(topic => {
        (topic.donViKienThuc || []).forEach(dv => {
          totalBiet += Number(dv.dungSai?.biet) || 0;
        });
      });
      return totalBiet;
    })();
    const tfDvktLabels = buildDvktLabels('dungSai');
    for (let i = 0; i < soCauTF; i++) {
      const key = \`phan2_cau\${i + 1}\`;
      const daDien = isSlotFilled(key);
      const dvktName = tfDvktLabels[i] || '';
      const dvktSuffix = dvktName ? \` - \${dvktName}\` : '';
      slots.push({ key, label: \`Phần II - Câu \${i + 1} (Đúng/Sai)\${dvktSuffix}\${daDien ? ' ✅' : ''}\`, loai: 2, daDien });
    }`;

content = content.replace(oldPhan2SlotLogic, newPhan2SlotLogic);

fs.writeFileSync('src/components/Step5_AIGenerator.jsx', content);
