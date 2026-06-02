const fs = require('fs');
let c = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');
c = c.replace(/    <td style="width:40%;text-align:center;vertical-align:top;border:none;">\r?\n            }/g, '            }');
fs.writeFileSync('src/utils/exportWordMath.js', c);
console.log("Fixed HTML tag!");
