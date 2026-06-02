const fs = require('fs'); 
const file = 'src/utils/exportWordMath.js'; 
let data = fs.readFileSync(file, 'utf8'); 
data = data.replace(/padding:6px;/g, '').replace(/padding:4px;/g, ''); 
fs.writeFileSync(file, data);
