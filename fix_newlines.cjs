const fs = require('fs');

let content = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

// Fix string splits
content = content.replace(/split\('\n/g, "split('\\n");
content = content.replace(/'\)/g, "')"); // Just in case, let's do it carefully.

// Let's do string replacement for the exact lines that got broken:
content = content.replace(/processed = processed\.replace\(\/\n\/g, '<br\/>'\);/g, "processed = processed.replace(/\\n/g, '<br/>');");

content = content.replace(/replace\(\/### \(\.\*\?\)\(\?:\n\|\$\)\/g, '<h3>\$1<\/h3>\n'\)/g, "replace(/### (.*?)(?:\\n|$)/g, '<h3>$1</h3>\\n')");
content = content.replace(/replace\(\/## \(\.\*\?\)\(\?:\n\|\$\)\/g, '<h2>\$1<\/h2>\n'\)/g, "replace(/## (.*?)(?:\\n|$)/g, '<h2>$1</h2>\\n')");
content = content.replace(/replace\(\/# \(\.\*\?\)\(\?:\n\|\$\)\/g, '<h1>\$1<\/h1>\n'\)/g, "replace(/# (.*?)(?:\\n|$)/g, '<h1>$1</h1>\\n')");

// split('\n') -> split('\\n')
content = content.replace(/\.split\('\n'\)/g, ".split('\\n')");

// Any other occurrences?
// In extractABCD: parts = s.includes('||') ? s.split('||').map(x => x.trim()) : s.split(',').map(x => x.trim());
// This one didn't have \n.

fs.writeFileSync('src/utils/exportWordMath.js', content);
console.log("Fixed!");
