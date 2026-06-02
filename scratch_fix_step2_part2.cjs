const fs = require('fs');

let content = fs.readFileSync('src/components/Step2_MatrixBuilder.jsx', 'utf8');

content = content.replace(
  /const totalCount = sumAll\(type, 'biet'\) \+ sumAll\(type, 'hieu'\) \+ sumAll\(type, 'vanDung'\);/g,
  `let totalCount = sumAll(type, 'biet') + sumAll(type, 'hieu') + sumAll(type, 'vanDung');\n    if (type === 'dungSai') totalCount += sumAll(type, 'vanDungCao');`
);

content = content.replace(
  /const ds = \(\(Number\(dv\.dungSai\?\.biet\) \|\| 0\) \+ \(Number\(dv\.dungSai\?\.hieu\) \|\| 0\) \+ \(Number\(dv\.dungSai\?\.vanDung\) \|\| 0\)\) \* examConfig\.diemMoiYP2;/g,
  `const ds = ((Number(dv.dungSai?.biet) || 0) + (Number(dv.dungSai?.hieu) || 0) + (Number(dv.dungSai?.vanDung) || 0) + (Number(dv.dungSai?.vanDungCao) || 0)) * examConfig.diemMoiYP2;`
);

content = content.replace(
  /getTopicSum\(topic, 'dungSai', 'vanDung'\) \* examConfig\.diemMoiYP2 \+/g,
  `getTopicSum(topic, 'dungSai', 'vanDung') * examConfig.diemMoiYP2 +\n        getTopicSum(topic, 'dungSai', 'vanDungCao') * examConfig.diemMoiYP2 +`
);

fs.writeFileSync('src/components/Step2_MatrixBuilder.jsx', content);
