const fs = require('fs');

let content = fs.readFileSync('src/components/Step2_MatrixBuilder.jsx', 'utf8');

// Thead modifications
content = content.replace(
  /<th colSpan=\{config.hasTuLuan \? "12" : "9"\} className="border border-slate-400 p-2">Mức độ đánh giá<\/th>/g,
  `<th colSpan={config.hasTuLuan ? "10" : "7"} className="border border-slate-400 p-2">Mức độ đánh giá</th>`
);

content = content.replace(
  /<th colSpan="9" className="border border-slate-400 p-1 bg-blue-50">TNKQ<\/th>/g,
  `<th colSpan="7" className="border border-slate-400 p-1 bg-blue-50">TNKQ</th>`
);

content = content.replace(
  /<th colSpan="3" className="border border-slate-400 p-1 bg-blue-50\/80">Đúng - Sai \(Ý\)<\/th>/g,
  `<th rowSpan="2" className="border border-slate-400 p-1 bg-blue-50/80 leading-tight">Đúng - Sai<br/><span className="text-[9px] font-normal text-slate-500 block mt-0.5">(Tự động: 1 câu = 4 ý<br/>chia đều 4 mức độ)</span></th>`
);

content = content.replace(
  /<th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">B<\/th><th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">H<\/th><th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">VD<\/th>\s*<th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">B<\/th><th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">H<\/th><th className="border border-slate-400 p-1 font-medium bg-blue-50\/30 w-8">VD<\/th>/g,
  `<th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">B</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">H</th><th className="border border-slate-400 p-1 font-medium bg-blue-50/30 w-8">VD</th>\n            {/* Cột Đúng-Sai bị gộp thành 1 cột Số Câu nên không còn B H VD ở đây nữa */}`
);

// Tbody row modification (inputs)
const oldInputs = `            <td className="border border-slate-300 p-0"><input type="number" min="0" className="w-full h-10 text-center outline-none bg-transparent" value={dv.dungSai?.biet || ''} onChange={(e) => updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'biet', e.target.value)} /></td>
            <td className="border border-slate-300 p-0"><input type="number" min="0" className="w-full h-10 text-center outline-none bg-transparent" value={dv.dungSai?.hieu || ''} onChange={(e) => updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'hieu', e.target.value)} /></td>
            <td className="border border-slate-300 p-0"><input type="number" min="0" className="w-full h-10 text-center outline-none bg-transparent" value={dv.dungSai?.vanDung || ''} onChange={(e) => updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'vanDung', e.target.value)} /></td>`;

const newInputs = `            <td className="border border-slate-300 p-0 bg-blue-50/30 relative group">
              <input 
                type="number" min="0" 
                title="Nhập số Câu Đúng/Sai"
                className="w-full h-10 text-center outline-none bg-transparent font-bold text-blue-700" 
                value={dv.dungSai?.biet || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  // Cập nhật cả 4 mức độ cùng 1 lúc
                  updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'biet', val);
                  updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'hieu', val);
                  updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'vanDung', val);
                  updateDvQuestionCount(topic.id, dv.id, 'dungSai', 'vanDungCao', val);
                }} 
              />
            </td>`;
content = content.replace(oldInputs, newInputs);

// Tfoot totals modification
const oldTfootTotals1 = `<td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'biet')}</td>
            <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'hieu')}</td>
            <td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'vanDung')}</td>`;

const newTfootTotals1 = `<td className="border border-slate-400 p-2 text-blue-800 font-bold bg-blue-50/50">
              {sumAll('dungSai', 'biet') || 0} <span className="text-[10px] text-slate-500 font-normal block">câu</span>
            </td>`;
content = content.replace(oldTfootTotals1, newTfootTotals1);

const oldTfootTotals2 = `<td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('biet')}</td>
            <td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('hieu')}</td>
            <td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap">{fmtDsCau('vanDung')}</td>`;

const newTfootTotals2 = `<td className="border border-slate-300 p-2 text-blue-800 text-[11px] whitespace-nowrap font-bold">
              {sumAll('dungSai', 'biet') || ''} <span className="text-[10px] text-slate-500 font-normal block">câu</span>
            </td>`;
content = content.replace(oldTfootTotals2, newTfootTotals2);

const oldTfootTotals3 = `<td colSpan="3" className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>`;
const newTfootTotals3 = `<td className="border border-slate-400 p-2">{getColumnTotalPoints('dungSai')}</td>`;
content = content.replace(oldTfootTotals3, newTfootTotals3);

const oldTfootTotals4 = `<td colSpan="3" className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>`;
const newTfootTotals4 = `<td className="border border-slate-400 p-2">{((getColumnTotalPoints('dungSai') / 10) * 100).toFixed(1).replace('.0', '')}%</td>`;
content = content.replace(oldTfootTotals4, newTfootTotals4);

fs.writeFileSync('src/components/Step2_MatrixBuilder.jsx', content);
