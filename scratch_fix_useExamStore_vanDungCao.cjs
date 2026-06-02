const fs = require('fs');

let content = fs.readFileSync('src/store/useExamStore.js', 'utf8');

content = content.replace(/dungSai:\s*\{\s*biet:\s*0,\s*hieu:\s*0,\s*vanDung:\s*0\s*\}/g, 'dungSai: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }');
content = content.replace(/traLoiNgan:\s*\{\s*biet:\s*0,\s*hieu:\s*0,\s*vanDung:\s*0\s*\}/g, 'traLoiNgan: { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }');
content = content.replace(/dungSai:\s*\{\s*\.\.\.\(dv\.phanBo\.dungSai\s*\|\|\s*\{\s*biet:\s*0,\s*hieu:\s*0,\s*vanDung:\s*0\s*\}\)\s*\}/g, 'dungSai: { ...(dv.phanBo.dungSai || { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }) }');
content = content.replace(/traLoiNgan:\s*\{\s*\.\.\.\(dv\.phanBo\.traLoiNgan\s*\|\|\s*\{\s*biet:\s*0,\s*hieu:\s*0,\s*vanDung:\s*0\s*\}\)\s*\}/g, 'traLoiNgan: { ...(dv.phanBo.traLoiNgan || { biet: 0, hieu: 0, vanDung: 0, vanDungCao: 0 }) }');

fs.writeFileSync('src/store/useExamStore.js', content);
