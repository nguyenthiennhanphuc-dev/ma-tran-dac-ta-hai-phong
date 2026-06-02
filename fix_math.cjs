const fs = require('fs');
let data = fs.readFileSync('src/utils/exportWordMath.js', 'utf8');

// 1. Merge Title and Desc
data = data.replace(
  /html \+= `<p class="bold" style="font-size:14pt;">\$\{(d[123]Title)\}<\/p>`;\s*html \+= `<p style="font-size:14pt;font-style:italic;">\$\{(d[123]Desc)\}<\/p>`;/g,
  `if (isMinistry) {
              html += \`<p style="font-size:14pt;"><b>\${\$1}</b> \${\$2}</p>\`;
            } else {
              html += \`<p class="bold" style="font-size:14pt;">\${\$1}</p>\`;
              html += \`<p style="font-size:14pt;font-style:italic;">\${\$2}</p>\`;
            }`
);

// 2. Remove Point from Question
data = data.replace(
  /Câu \$\{displayNum\} \(\$\{([a-zA-Z0-9_]+)\}\ điểm\)\./g,
  `Câu \${displayNum}\${isMinistry ? '.' : \` (\${\$1} điểm).\`}`
);

// 3. Remove Table for Dạng 2 (Đúng/Sai) in isMinistry
// There are two blocks for Dạng 2: one for `dung_sai.length > 0` (AI generated) and one for `else` (slot parsed)

// Block 1: AI Generated
const dang2AiRegex = /html \+= `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;\s*html \+= `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định<\/td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ\/S<\/td><\/tr>`;\s*const yParts = getYParts\(q\);\s*yParts\.forEach\(p => \{\s*if \(p\.y\) \{\s*html \+= `<tr><td style="border:1px solid black;">\$\{p\.label\}\) \$\{formatTextWithMath\(p\.y\)\}<\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*\}\s*\}\);\s*html \+= `<\/table>`;/g;

const dang2AiReplace = `if (isMinistry) {
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += \`<p style="margin-left:2em;">\${p.label}. \${formatTextWithMath(p.y)}</p>\`;
                    }
                });
            } else {
                html += \`<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">\`;
                html += \`<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>\`;
                const yParts = getYParts(q);
                yParts.forEach(p => {
                    if (p.y) {
                        html += \`<tr><td style="border:1px solid black;">\${p.label}) \${formatTextWithMath(p.y)}</td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                    }
                });
                html += \`</table>\`;
            }`;

data = data.replace(dang2AiRegex, dang2AiReplace);

// Block 2: Slot Parsed
const dang2SlotRegex = /html \+= `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;\s*html \+= `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định<\/td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ\/S<\/td><\/tr>`;\s*if \(slotData\.yA\) html \+= `<tr><td style="border:1px solid black;">a\) \$\{formatTextWithMath\(cleanText\(slotData\.yA\)\)\}<\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*if \(slotData\.yB\) html \+= `<tr><td style="border:1px solid black;">b\) \$\{formatTextWithMath\(cleanText\(slotData\.yB\)\)\}<\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*if \(slotData\.yC\) html \+= `<tr><td style="border:1px solid black;">c\) \$\{formatTextWithMath\(cleanText\(slotData\.yC\)\)\}<\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*if \(slotData\.yD\) html \+= `<tr><td style="border:1px solid black;">d\) \$\{formatTextWithMath\(cleanText\(slotData\.yD\)\)\}<\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*html \+= `<\/table>`;/g;

const dang2SlotReplace = `if (isMinistry) {
                        if (slotData.yA) html += \`<p style="margin-left:2em;">a. \${formatTextWithMath(cleanText(slotData.yA))}</p>\`;
                        if (slotData.yB) html += \`<p style="margin-left:2em;">b. \${formatTextWithMath(cleanText(slotData.yB))}</p>\`;
                        if (slotData.yC) html += \`<p style="margin-left:2em;">c. \${formatTextWithMath(cleanText(slotData.yC))}</p>\`;
                        if (slotData.yD) html += \`<p style="margin-left:2em;">d. \${formatTextWithMath(cleanText(slotData.yD))}</p>\`;
                    } else {
                        html += \`<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">\`;
                        html += \`<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>\`;
                        if (slotData.yA) html += \`<tr><td style="border:1px solid black;">a) \${formatTextWithMath(cleanText(slotData.yA))}</td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        if (slotData.yB) html += \`<tr><td style="border:1px solid black;">b) \${formatTextWithMath(cleanText(slotData.yB))}</td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        if (slotData.yC) html += \`<tr><td style="border:1px solid black;">c) \${formatTextWithMath(cleanText(slotData.yC))}</td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        if (slotData.yD) html += \`<tr><td style="border:1px solid black;">d) \${formatTextWithMath(cleanText(slotData.yD))}</td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        html += \`</table>\`;
                    }`;

data = data.replace(dang2SlotRegex, dang2SlotReplace);

// Block 3: Slot Parsed (Empty placeholders)
const dang2EmptyRegex = /html \+= `<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">`;\s*html \+= `<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định<\/td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ\/S<\/td><\/tr>`;\s*html \+= `<tr><td style="border:1px solid black;">a\) <i>\(Ghi nội dung câu hỏi vào đây...\)<\/i><\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*html \+= `<tr><td style="border:1px solid black;">b\) <i>\(Ghi nội dung câu hỏi vào đây...\)<\/i><\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*html \+= `<tr><td style="border:1px solid black;">c\) <i>\(Ghi nội dung câu hỏi vào đây...\)<\/i><\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*html \+= `<tr><td style="border:1px solid black;">d\) <i>\(Ghi nội dung câu hỏi vào đây...\)<\/i><\/td><td style="border:1px solid black;text-align:center;"><\/td><\/tr>`;\s*html \+= `<\/table>`;/g;

const dang2EmptyReplace = `if (isMinistry) {
                        html += \`<p style="margin-left:2em;">a. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>\`;
                        html += \`<p style="margin-left:2em;">b. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>\`;
                        html += \`<p style="margin-left:2em;">c. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>\`;
                        html += \`<p style="margin-left:2em;">d. <i>(Ghi nội dung câu hỏi vào đây...)</i></p>\`;
                    } else {
                        html += \`<table border="1" style="border-collapse:collapse;width:100%;font-size:12pt;">\`;
                        html += \`<tr><td style="border:1px solid black;text-align:center;font-weight:bold;width:85%;">Nhận định</td><td style="border:1px solid black;text-align:center;font-weight:bold;width:15%;">Đ/S</td></tr>\`;
                        html += \`<tr><td style="border:1px solid black;">a) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        html += \`<tr><td style="border:1px solid black;">b) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        html += \`<tr><td style="border:1px solid black;">c) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        html += \`<tr><td style="border:1px solid black;">d) <i>(Ghi nội dung câu hỏi vào đây...)</i></td><td style="border:1px solid black;text-align:center;"></td></tr>\`;
                        html += \`</table>\`;
                    }`;

data = data.replace(dang2EmptyRegex, dang2EmptyReplace);

fs.writeFileSync('src/utils/exportWordMath.js', data);
console.log("MATH SCRIPT DONE");
