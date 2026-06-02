const fs = require('fs');

const updateFile = (filename) => {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(
    /const fmtNLC = \(val, level\) => \{\s+const v = Number\(val\) \|\| 0;\s+if \(v <= 0\) return 0;\s+const code = level === 'biet' \? 'NT' : level === 'hieu' \? 'TH' : 'VD';\s+return `\$\{v\} \(\$\{code\}\)`;\s+\};/,
    `const fmtNLC = (val, level) => {
    const v = Number(val) || 0;
    if (v <= 0) return 0;
    if (config.showCompetencySymbol === false) return \`\${v}\`;
    const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    return \`\${v} (\${code})\`;
  };`
  );

  content = content.replace(
    /const fmtY = \(val, level\) => \{\s+const v = Number\(val\) \|\| 0;\s+if \(v <= 0\) return 0;\s+const code = level === 'biet' \? 'NT' : level === 'hieu' \? 'TH' : 'VD';\s+return `\$\{v\} ý \(\$\{code\}\)`;\s+\};/,
    `const fmtY = (val, level) => {
    const v = Number(val) || 0;
    if (v <= 0) return 0;
    if (config.showCompetencySymbol === false) return \`\${v} ý\`;
    const code = level === 'biet' ? 'NT' : level === 'hieu' ? 'TH' : 'VD';
    return \`\${v} ý (\${code})\`;
  };`
  );
  
  fs.writeFileSync(filename, content);
  console.log('Fixed', filename);
};

updateFile('src/utils/exportWord.js');
updateFile('src/utils/exportWordMath.js');
