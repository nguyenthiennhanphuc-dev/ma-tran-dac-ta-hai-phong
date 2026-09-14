import {
  TextRun, Math as DocxMath, MathFraction, MathRadical,
  MathSuperScript, MathSubScript, MathSubSuperScript,
  MathRoundBrackets, MathSquareBrackets, MathCurlyBrackets,
  MathRun, MathIntegral, MathSum
} from 'docx';

// ═══════════════════════════════════════════════════════════════════
// BẢNG TRA CỨU KÝ HIỆU TOÁN HỌC & HY LẠP
// ═══════════════════════════════════════════════════════════════════
export const SYMBOLS_MAP = {
  // Chữ Hy Lạp thường
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\vartheta': 'θ',
  '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν',
  '\\xi': 'ξ', '\\pi': 'π', '\\varpi': 'ϖ', '\\rho': 'ρ', '\\varrho': 'ϱ',
  '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',

  // Chữ Hy Lạp hoa
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
  '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',

  // Toán tử & quan hệ
  '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥', '\\ne': '≠', '\\neq': '≠',
  '\\approx': '≈', '\\equiv': '≡', '\\cong': '≅', '\\sim': '∼', '\\propto': '∝',
  '\\infty': '∞',

  // Tập hợp & Logic
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆',
  '\\supset': '⊃', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
  '\\emptyset': '∅', '\\varnothing': '∅', '\\forall': '∀', '\\exists': '∃',
  '\\neg': '¬',

  // Mũi tên
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Leftarrow': '⇐', '\\Rightarrow': '⇒', '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔',
  '\\uparrow': '↑', '\\downarrow': '↓',

  // Hình học & Ký hiệu khác
  '\\angle': '∠', '\\measuredangle': '∡', '\\sphericalangle': '∢',
  '\\circ': '°', '\\prime': '′', '\\doubleprime': '″',
  '\\bot': '⊥', '\\perp': '⊥', '\\parallel': '∥',
  '\\degree': '°', '\\partial': '∂', '\\nabla': '∇',

  // Khoảng cách
  '\\,': ' ', '\\;': ' ', '\\:': ' ', '\\quad': '  ', '\\qquad': '    ', '\\ ': ' '
};

// Chuẩn hóa chuỗi LaTeX trước khi parse
export function preprocessLatex(latex) {
  if (!latex) return '';
  let s = String(latex).trim();

  // Bỏ các lệnh trang trí không ảnh hưởng ngữ nghĩa
  s = s.replace(/\\(displaystyle|textstyle|limits|nolimits)/g, '');

  // Chuẩn hóa \dfrac, \tfrac -> \frac
  s = s.replace(/\\(dfrac|tfrac)/g, '\\frac');

  // Chuẩn hóa góc: \widehat{ABC} -> \angle ABC
  s = s.replace(/\\widehat\{([^}]+)\}/g, '\\angle $1');

  // Chuẩn hóa độ: ^{\circ} hoặc ^\circ -> °
  s = s.replace(/\^\{\\circ\}|\^\\circ/g, '°');

  // Chuẩn hóa \vec{} và \overrightarrow{}
  s = s.replace(/\\overrightarrow\{([^}]+)\}/g, '\\vec{$1}');

  return s;
}

// Tokenizer
export function tokenizeLatex(latex) {
  const tokens = [];
  let i = 0;
  const s = preprocessLatex(latex);

  while (i < s.length) {
    const c = s[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Lệnh TeX \command
    if (c === '\\') {
      let cmd = '\\';
      i++;
      if (i < s.length && /[^a-zA-Z]/.test(s[i])) {
        cmd += s[i];
        i++;
      } else {
        while (i < s.length && /[a-zA-Z]/.test(s[i])) {
          cmd += s[i];
          i++;
        }
      }
      tokens.push({ type: 'command', val: cmd });
      continue;
    }

    // Dấu ngoặc & phân cách
    if (c === '{' || c === '}' || c === '(' || c === ')' || c === '[' || c === ']') {
      tokens.push({ type: 'delimiter', val: c });
      i++;
      continue;
    }

    // Chỉ số trên / dưới
    if (c === '_' || c === '^') {
      tokens.push({ type: 'script', val: c });
      i++;
      continue;
    }

    // Ký tự / toán tử
    tokens.push({ type: 'char', val: c });
    i++;
  }

  return tokens;
}

// Parser: Chuyển token stream thành mảng đối tượng Math của docx
export function parseTokensToDocxMath(tokens) {
  const elements = [];
  let i = 0;

  function peek() {
    return tokens[i];
  }

  function next() {
    return tokens[i++];
  }

  function parseArg() {
    if (i >= tokens.length) return [new MathRun('')];
    const tok = next();
    if (tok.val === '{') {
      const groupTokens = [];
      let depth = 1;
      while (i < tokens.length) {
        const t = next();
        if (t.val === '{') depth++;
        else if (t.val === '}') {
          depth--;
          if (depth === 0) break;
        }
        groupTokens.push(t);
      }
      return parseTokensToDocxMath(groupTokens);
    } else {
      return parseSingleElement(tok);
    }
  }

  function parseSingleElement(tok) {
    if (!tok) return [new MathRun('')];

    if (tok.type === 'command') {
      // 1. Ký hiệu đặc biệt
      if (SYMBOLS_MAP[tok.val]) {
        return [new MathRun(SYMBOLS_MAP[tok.val])];
      }

      // 2. Chữ văn bản trong toán: \text{...}, \mathrm{...}, \mathbf{...}
      if (tok.val === '\\text' || tok.val === '\\mathrm' || tok.val === '\\mathbf' || tok.val === '\\operatorname') {
        const arg = parseArg();
        return arg;
      }

      // 3. Dấu ngoặc co giãn \left( ... \right)
      if (tok.val === '\\left') {
        const openDelim = next();
        const innerTokens = [];
        let leftDepth = 1;
        while (i < tokens.length) {
          const t = next();
          if (t.val === '\\left') {
            leftDepth++;
            innerTokens.push(t);
          } else if (t.val === '\\right') {
            leftDepth--;
            if (leftDepth === 0) {
              const closeDelim = next(); // Bỏ qua dấu ngoặc đóng tương ứng
              break;
            }
            innerTokens.push(t);
          } else {
            innerTokens.push(t);
          }
        }
        const innerElems = parseTokensToDocxMath(innerTokens);
        if (openDelim?.val === '(') return [new MathRoundBrackets({ children: innerElems })];
        if (openDelim?.val === '[') return [new MathSquareBrackets({ children: innerElems })];
        if (openDelim?.val === '{' || openDelim?.val === '\\{') return [new MathCurlyBrackets({ children: innerElems })];
        return [new MathRoundBrackets({ children: innerElems })];
      }

      // 4. Vectơ
      if (tok.val === '\\vec') {
        const arg = parseArg();
        return [...arg, new MathRun('⃗')];
      }

      // 5. Gạch đầu (bar)
      if (tok.val === '\\bar' || tok.val === '\\overline') {
        const arg = parseArg();
        return [...arg, new MathRun('̅')];
      }

      // 6. Mũ (hat)
      if (tok.val === '\\hat' || tok.val === '\\widehat') {
        const arg = parseArg();
        return [...arg, new MathRun('̂')];
      }

      // 7. Các hàm toán phổ biến: sin, cos, tan, log, ln, lim...
      const funcName = tok.val.replace('\\', '');
      return [new MathRun(funcName + ' ')];
    }

    return [new MathRun(tok.val)];
  }

  while (i < tokens.length) {
    const tok = next();

    // Phân số: \frac{a}{b}
    if (tok.val === '\\frac') {
      const num = parseArg();
      const den = parseArg();
      elements.push(new MathFraction({ numerator: num, denominator: den }));
      continue;
    }

    // Căn thức: \sqrt{x} hoặc \sqrt[n]{x}
    if (tok.val === '\\sqrt') {
      let degree = null;
      if (peek() && peek().val === '[') {
        next(); // skip '['
        const degTokens = [];
        while (i < tokens.length && peek().val !== ']') {
          degTokens.push(next());
        }
        if (peek() && peek().val === ']') next(); // skip ']'
        degree = parseTokensToDocxMath(degTokens);
      }
      const body = parseArg();
      if (degree) {
        elements.push(new MathRadical({ children: body, degree: degree }));
      } else {
        elements.push(new MathRadical({ children: body }));
      }
      continue;
    }

    // Tích phân: \int_a^b
    if (tok.val === '\\int') {
      let lower = null, upper = null;
      if (peek() && peek().val === '_') {
        next();
        lower = parseArg();
      }
      if (peek() && peek().val === '^') {
        next();
        upper = parseArg();
      }
      elements.push(new MathIntegral({
        subScript: lower || undefined,
        superScript: upper || undefined,
      }));
      continue;
    }

    // Tổng Sigma: \sum_{i=1}^n
    if (tok.val === '\\sum') {
      let lower = null, upper = null;
      if (peek() && peek().val === '_') {
        next();
        lower = parseArg();
      }
      if (peek() && peek().val === '^') {
        next();
        upper = parseArg();
      }
      elements.push(new MathSum({
        subScript: lower || undefined,
        superScript: upper || undefined,
      }));
      continue;
    }

    // Base kèm Subscript / Superscript
    const baseElems = parseSingleElement(tok);
    let sub = null, sup = null;

    while (peek() && (peek().val === '_' || peek().val === '^')) {
      const scriptType = next().val;
      if (scriptType === '_') {
        sub = parseArg();
      } else if (scriptType === '^') {
        sup = parseArg();
      }
    }

    if (sub && sup) {
      elements.push(new MathSubSuperScript({
        children: baseElems,
        subScript: sub,
        superScript: sup
      }));
    } else if (sub) {
      elements.push(new MathSubScript({
        children: baseElems,
        subScript: sub
      }));
    } else if (sup) {
      elements.push(new MathSuperScript({
        children: baseElems,
        superScript: sup
      }));
    } else {
      elements.push(...baseElems);
    }
  }

  return elements;
}

// Chuyển một chuỗi LaTeX thành đối tượng Math của docx
export function latexToDocxMath(latexStr) {
  try {
    const tokens = tokenizeLatex(latexStr);
    const mathElems = parseTokensToDocxMath(tokens);
    return new DocxMath({ children: mathElems });
  } catch (err) {
    console.warn('[latexToDocxMath] Fallback to raw text for LaTeX:', latexStr, err);
    return new DocxMath({ children: [new MathRun(latexStr)] });
  }
}

// Helper: Phân tích text chứa markdown bold (**bold**) thành TextRun
function parseBoldTextRuns(plainText, baseFontSize, fontName, defaultBold = false, textColor = undefined) {
  const runs = [];
  const parts = plainText.split(/(\*\*.*?\*\*)/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        size: baseFontSize,
        font: fontName,
        color: textColor
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        bold: defaultBold,
        size: baseFontSize,
        font: fontName,
        color: textColor
      }));
    }
  }
  return runs;
}

/**
 * Phân tích chuỗi văn bản hỗn hợp (chứa chữ thông thường và $LaTeX$ hoặc $$LaTeX$$)
 * thành mảng các phần tử con (TextRun / Math) để đưa vào new Paragraph({ children: [...] })
 *
 * @param {string} text - Văn bản đầu vào
 * @param {number} baseFontSize - Cỡ chữ (mặc định 28 = 14pt)
 * @param {string} fontName - Phông chữ (mặc định 'Times New Roman')
 * @param {'omml'|'raw_latex'|'normal'} mathMode - Chế độ xử lý công thức
 * @param {boolean} defaultBold - Mặc định in đậm hay không
 * @param {string} textColor - Màu chữ hex (ví dụ 'FF0000')
 */
export function parseMixedTextToRuns(
  text,
  baseFontSize = 28,
  fontName = 'Times New Roman',
  mathMode = 'omml',
  defaultBold = false,
  textColor = undefined
) {
  if (!text) return [new TextRun({ text: '', size: baseFontSize, font: fontName })];
  const str = String(text);

  // Nếu chế độ normal, không cần tách math, chỉ xử lý text và markdown bold
  if (mathMode === 'normal') {
    // Xóa dấu $ nếu có nhưng giữ lại nội dung
    const cleanStr = str.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]+?)\$/g, '$1');
    return parseBoldTextRuns(cleanStr, baseFontSize, fontName, defaultBold, textColor);
  }

  // Nếu chế độ raw_latex: giữ nguyên $...$ dưới dạng TextRun
  if (mathMode === 'raw_latex') {
    return parseBoldTextRuns(str, baseFontSize, fontName, defaultBold, textColor);
  }

  // Chế độ 'omml': nhận diện $$...$$ và $...$ để chuyển sang Word Equation
  const runs = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      const plainText = str.slice(lastIdx, match.index);
      runs.push(...parseBoldTextRuns(plainText, baseFontSize, fontName, defaultBold, textColor));
    }

    const rawMatch = match[0];
    const latex = rawMatch.startsWith('$$')
      ? rawMatch.slice(2, -2)
      : rawMatch.slice(1, -1);

    runs.push(latexToDocxMath(latex));
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    runs.push(...parseBoldTextRuns(str.slice(lastIdx), baseFontSize, fontName, defaultBold, textColor));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '', size: baseFontSize, font: fontName })];
}
