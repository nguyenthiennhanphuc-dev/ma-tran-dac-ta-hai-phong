const fs = require('fs');
let c = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');
c = c.replace(/\\`/g, "`");
fs.writeFileSync('src/utils/exportWordMath.js', c);
console.log("Fixed backticks!");
