const fs = require('fs');

let content = fs.readFileSync('src/components/Step3_Specification.jsx', 'utf8');

// Update sumVD for the column "Tổng số câu" in each row
content = content.replace(
  /const sumVD = \(dv\.nhieuLuaChon\?\.vanDung \|\| 0\) \+ \(dv\.dungSai\?\.vanDung \|\| 0\) \+ \(config\.hasTraLoiNgan \? \(dv\.traLoiNgan\?\.vanDung \|\| 0\) : 0\) \+ \(typeof dv\.tuLuan\?\.vanDung === 'object' \? dv\.tuLuan\.vanDung\.y : \(dv\.tuLuan\?\.vanDung \|\| 0\)\);/,
  `const sumVD = (dv.nhieuLuaChon?.vanDung || 0) + (dv.dungSai?.vanDung || 0) + (dv.dungSai?.vanDungCao || 0) + (config.hasTraLoiNgan ? (dv.traLoiNgan?.vanDung || 0) : 0) + (typeof dv.tuLuan?.vanDung === 'object' ? dv.tuLuan.vanDung.y : (dv.tuLuan?.vanDung || 0));`
);

// Update fmtY for dungSai vanDung
content = content.replace(
  /<td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-\[11px\] leading-tight">\{fmtY\(dv\.dungSai\?\.vanDung, 'vanDung'\)\}<\/td>/g,
  `<td className="border border-slate-300 p-1 text-center font-medium text-blue-700 text-[11px] leading-tight">{fmtY((dv.dungSai?.vanDung || 0) + (dv.dungSai?.vanDungCao || 0), 'vanDung')}</td>`
);

// Update tfoot totals
content = content.replace(
  /<td className="border border-slate-400 p-2 text-blue-800">\{sumAll\('dungSai', 'vanDung'\)\}<\/td>/g,
  `<td className="border border-slate-400 p-2 text-blue-800">{sumAll('dungSai', 'vanDung') + sumAll('dungSai', 'vanDungCao')}</td>`
);

content = content.replace(
  /<td className="border border-slate-400 p-2 text-blue-800">\{sumAll\('dungSai', 'vanDung'\) \* 0\.25\}<\/td>/g,
  `<td className="border border-slate-400 p-2 text-blue-800">{(sumAll('dungSai', 'vanDung') + sumAll('dungSai', 'vanDungCao')) * 0.25}</td>`
);

fs.writeFileSync('src/components/Step3_Specification.jsx', content);
