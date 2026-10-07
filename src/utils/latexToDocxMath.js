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
  '\\approx': '≈', '\\equiv': '≡', '\\cong': '≅', '\\sim': '∽', '\\backsim': '∽', '\\propto': '∝',
  '\\infty': '∞',

  // Tập hợp & Logic
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆',
  '\\supset': '⊃', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
  '\\emptyset': '∅', '\\varnothing': '∅', '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
  '\\neg': '¬', '\\setminus': '∖', '\\backslash': '\\',

  // Tập số
  '\\mathbb{R}': 'ℝ', '\\mathbf{R}': 'ℝ',
  '\\mathbb{N}': 'ℕ', '\\mathbf{N}': 'ℕ',
  '\\mathbb{Z}': 'ℤ', '\\mathbf{Z}': 'ℤ',
  '\\mathbb{Q}': 'ℚ', '\\mathbf{Q}': 'ℚ',
  '\\mathbb{C}': 'ℂ', '\\mathbf{C}': 'ℂ',

  // Mũi tên & Logic suy luận
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Leftarrow': '⇐', '\\Rightarrow': '⇒', '\\implies': '⇒',
  '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔', '\\iff': '⇔',
  '\\uparrow': '↑', '\\downarrow': '↓', '\\mapsto': '↦',

  // Hình học & Ký hiệu khác
  '\\triangle': '△', '\\bigtriangleup': '△',
  '\\angle': '∠', '\\measuredangle': '∡', '\\sphericalangle': '∢',
  '\\circ': '°', '\\prime': '′', '\\doubleprime': '″',
  '\\bot': '⊥', '\\perp': '⊥', '\\parallel': '∥',
  '\\degree': '°', '\\partial': '∂', '\\nabla': '∇',
  '\\colon': ':',

  // Dấu ba chấm
  '\\dots': '…', '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',

  // Tích phân bội
  '\\iint': '∬', '\\iiint': '∭', '\\oint': '∮',

  // Dấu ngoặc nhọn
  '\\{': '{', '\\}': '}',

  // Khoảng cách
  '\\,': ' ', '\\;': ' ', '\\:': ' ', '\\quad': '  ', '\\qquad': '    ', '\\ ': ' ', '\\!': ''
};

// ═══════════════════════════════════════════════════════════════════
// HÀM GIẢI MÃ HTML ENTITIES & TỰ ĐỘNG CHUẨN HÓA CÔNG THỨC TOÁN
// ═══════════════════════════════════════════════════════════════════
export function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&le;/g, '\\le')
    .replace(/&ge;/g, '\\ge')
    .replace(/&plusmn;/g, '\\pm')
    .replace(/&times;/g, '\\times')
    .replace(/&divide;/g, '\\div')
    .replace(/&deg;/g, '^\\circ')
    .replace(/&Omega;/g, '\\Omega')
    .replace(/&omega;/g, '\\omega')
    .replace(/&alpha;/g, '\\alpha')
    .replace(/&beta;/g, '\\beta')
    .replace(/&pi;/g, '\\pi')
    .replace(/&Delta;/g, '\\Delta')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function transformOutsideMath(str, transformFn) {
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) return part; // Nằm trong $...$, giữ nguyên
    return transformFn(part);
  }).join('');
}

/**
 * Tự động nhận diện các biểu thức công thức toán/lý/hóa trong câu hỏi & đáp án
 * chưa được bọc trong $...$ để bọc lại và chuẩn hóa cho Word Equation và MathType OLE
 */
export function autoEncloseMath(text) {
  if (!text) return '';
  let s = decodeHtmlEntities(String(text));

  // 1. Chuyển đổi số mũ & chỉ số Unicode
  s = transformOutsideMath(s, t => {
    return t.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
            .replace(/₀/g, '_0').replace(/₁/g, '_1').replace(/₂/g, '_2')
            .replace(/₃/g, '_3').replace(/₄/g, '_4').replace(/₅/g, '_5')
            .replace(/₆/g, '_6').replace(/₇/g, '_7').replace(/₈/g, '_8').replace(/₉/g, '_9');
  });

  // 2. Nhận diện các biểu thức công thức động năng/cơ năng: Wđ = 1/2.m.v^2 hoặc Wđ = m.v^2...
  s = transformOutsideMath(s, t => {
    return t.replace(/(?:W[đd]|W_đ|W_t|W)\s*=\s*(?:1\/2\.m\.v\^2|1\/2\.m\.v|m\.v\^2|m\.v|mgh|P\.h)/gi, (m) => {
      let f = m.replace(/W[đd]/gi, 'W_{đ}')
               .replace(/1\/2\.m\.v\^2/gi, '\\frac{1}{2}mv^2')
               .replace(/1\/2\.m\.v/gi, '\\frac{1}{2}mv')
               .replace(/m\.v\^2/gi, 'mv^2')
               .replace(/m\.v/gi, 'mv')
               .replace(/P\.h/gi, 'P \\cdot h');
      return '$' + f + '$';
    });
  });

  // 3. Nhận diện các biểu thức quang học/điện học:
  s = transformOutsideMath(s, t => {
    let res = t.replace(/(i_\{?gh\}?\s*=\s*[0-9.,]+)(?:°|\^\\circ|\\degree)?/gi, (m, expr) => {
      return '$' + expr.replace(/i_gh/g, 'i_{gh}') + '^\\circ$';
    });
    res = res.replace(/(R_[0-9]+\s*=\s*[0-9.,]+\s*(?:Ω|\\Omega)?)/g, (m) => {
      return '$' + m.replace(/Ω/g, '\\ \\Omega') + '$';
    });
    res = res.replace(/(n\s*=\s*[0-9]+\/[0-9]+)/gi, (m) => {
      const parts = m.split('=');
      const frac = parts[1].trim().split('/');
      return '$n = \\frac{' + frac[0] + '}{' + frac[1] + '}$';
    });
    return res;
  });

  // 4. Bọc các lệnh LaTeX mồ côi còn sót chưa có $
  s = transformOutsideMath(s, t => {
    let res = t.replace(/(\\(?:frac|dfrac|tfrac)\{[^}]+\}\{[^}]+\}(?:[a-zA-Z0-9_\^\.]*))/g, '$$$1$$');
    res = res.replace(/(\\(?:sqrt)(?:\[[^\]]+\])?\{[^}]+\})/g, '$$$1$$');
    res = res.replace(/(\\(?:vec|overrightarrow)\{[^}]+\})/g, '$$$1$$');
    res = res.replace(/\b([a-zA-Z][a-zA-Z0-9]*_\{[^{}]+\})/g, '$$$1$$');
    return res;
  });

  // 5. Dọn dẹp dấu $ thừa nếu có
  s = s.replace(/\$\$\$+/g, '$').replace(/\$\s*\$/g, '');

  return s;
}

// Chuẩn hóa chuỗi LaTeX trước khi parse
export function preprocessLatex(latex) {
  if (!latex) return '';
  let s = decodeHtmlEntities(String(latex)).trim();

  // Bỏ các lệnh trang trí không ảnh hưởng ngữ nghĩa
  s = s.replace(/\\(displaystyle|textstyle|limits|nolimits)/g, '');

  // Chuẩn hóa \dfrac, \tfrac -> \frac
  s = s.replace(/\\(dfrac|tfrac)/g, '\\frac');

  // Chuẩn hóa góc: \widehat{ABC} -> \angle ABC
  s = s.replace(/\\widehat\{([^}]+)\}/g, '\\angle $1');

  // Chuẩn hóa độ: ^{\circ} hoặc ^\circ hoặc \degree -> °
  s = s.replace(/\^\{\\circ\}|\^\\circ|\\degree/g, '°');

  // Chuẩn hóa \vec{} và \overrightarrow{}
  s = s.replace(/\\overrightarrow\{([^}]+)\}/g, '\\vec{$1}');

  // Chuẩn hóa tập số \mathbb{R}, \mathbb{N}, v.v. (hỗ trợ linh hoạt khoảng trắng)
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*R\s*\}/g, 'ℝ');
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*N\s*\}\s*\^?\*?/g, (m) => m.includes('*') ? 'ℕ*' : 'ℕ');
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*Z\s*\}/g, 'ℤ');
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*Q\s*\}/g, 'ℚ');
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*C\s*\}/g, 'ℂ');
  s = s.replace(/\\(mathbb|mathbf)\s*\{\s*P\s*\}/g, 'ℙ');

  // Chuẩn hóa hệ phương trình \begin{cases} ... \end{cases} -> \left\{ pt1;\; pt2 \right.
  s = s.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, content) => {
    const lines = content.split(/\\\\/).map(line => line.replace(/&/g, ' ').trim()).filter(Boolean);
    return '\\left\\{ ' + lines.join(';\\; ') + ' \\right.';
  });

  // Bỏ dấu & gióng hàng TeX nếu còn sót
  s = s.replace(/&/g, ' ');

  return s;
}

// Tokenizer
export function tokenizeLatex(latex) {
  const tokens = [];
  let i = 0;
  const s = preprocessLatex(latex);

  while (i < s.length) {
    const c = s[i];

    // Xử lý khối text như \text{...}, \mathrm{...}, \mathbf{...}, \operatorname{...}
    // Giữ nguyên khoảng trắng và ký tự tiếng Việt
    if (c === '\\') {
      let cmd = '\\';
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) {
        cmd += s[j];
        j++;
      }
      if (cmd === '\\text' || cmd === '\\mathrm' || cmd === '\\mathbf' || cmd === '\\operatorname' || cmd === '\\mathit') {
        while (j < s.length && /\s/.test(s[j])) j++;
        if (j < s.length && s[j] === '{') {
          j++; // skip '{'
          let textContent = '';
          let depth = 1;
          while (j < s.length && depth > 0) {
            if (s[j] === '{') depth++;
            else if (s[j] === '}') {
              depth--;
              if (depth === 0) {
                j++;
                break;
              }
            }
            textContent += s[j];
            j++;
          }
          tokens.push({ type: 'text_run', val: textContent });
          i = j;
          continue;
        }
      }
    }

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

    // Ký tự / toán tử (hỗ trợ cả chữ tiếng Việt)
    tokens.push({ type: 'char', val: c });
    i++;
  }

  return tokens;
}

// Helper trích xuất text từ MathRun đối tượng docx
function extractTextFromMathRun(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (r.root && Array.isArray(r.root)) {
    for (const item of r.root) {
      if (item && item.rootKey === 'm:t' && Array.isArray(item.root) && typeof item.root[0] === 'string') {
        return item.root[0];
      }
    }
  }
  return '';
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

    if (tok.type === 'text_run') {
      return [new MathRun(tok.val)];
    }

    // Nhóm ngoặc tròn ( ... ) hoặc vuông [ ... ]
    if (tok.type === 'delimiter' && (tok.val === '(' || tok.val === '[')) {
      const openChar = tok.val;
      const closeChar = openChar === '(' ? ')' : ']';
      let depth = 1;
      let j = i;
      let found = false;

      while (j < tokens.length) {
        if (tokens[j].val === openChar) depth++;
        else if (tokens[j].val === closeChar) {
          depth--;
          if (depth === 0) {
            found = true;
            break;
          }
        }
        j++;
      }

      if (found) {
        const innerTokens = tokens.slice(i, j);
        i = j + 1; // Nhảy qua dấu ngoặc đóng
        const innerElems = parseTokensToDocxMath(innerTokens);
        const bracketObj = openChar === '('
          ? new MathRoundBrackets({ children: innerElems })
          : new MathSquareBrackets({ children: innerElems });
        return [bracketObj];
      }
    }

    if (tok.type === 'command') {
      // 1. Ký hiệu đặc biệt
      if (SYMBOLS_MAP[tok.val]) {
        return [new MathRun(SYMBOLS_MAP[tok.val])];
      }

      // 1.5. Xử lý \mathbb và \mathbf cho tập số phòng vệ nếu chưa được preprocess
      if (tok.val === '\\mathbb' || tok.val === '\\mathbf') {
        const arg = parseArg();
        const argText = arg.map(extractTextFromMathRun).join('').trim();
        const doubleStruckMap = { 'R': 'ℝ', 'N': 'ℕ', 'Z': 'ℤ', 'Q': 'ℚ', 'C': 'ℂ', 'P': 'ℙ' };
        if (doubleStruckMap[argText]) {
          return [new MathRun(doubleStruckMap[argText])];
        }
        return arg;
      }

      // 2. Chữ văn bản trong toán: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
      if (tok.val === '\\text' || tok.val === '\\mathrm' || tok.val === '\\mathbf' || tok.val === '\\operatorname' || tok.val === '\\mathit') {
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
              if (i < tokens.length) next(); // Bỏ qua dấu ngoặc đóng tương ứng của \right
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

      if (tok.val === '\\right') {
        if (peek()) next();
        return [];
      }

      // 4. Vectơ (gắn combining right arrow \u20D7 trực tiếp vào chữ cái để hiển thị chính giữa trên đầu)
      if (tok.val === '\\vec') {
        const arg = parseArg();
        const newRuns = [];
        let applied = false;
        for (const elem of arg) {
          const t = extractTextFromMathRun(elem);
          if (t) {
            newRuns.push(new MathRun(t.split('').map(c => c + '\u20D7').join('')));
            applied = true;
          } else {
            newRuns.push(elem);
          }
        }
        return applied ? newRuns : [...arg, new MathRun('\u20D7')];
      }

      // 5. Gạch đầu (bar, overline)
      if (tok.val === '\\bar' || tok.val === '\\overline') {
        const arg = parseArg();
        const newRuns = [];
        let applied = false;
        for (const elem of arg) {
          const t = extractTextFromMathRun(elem);
          if (t) {
            newRuns.push(new MathRun(t.split('').map(c => c + '\u0305').join('')));
            applied = true;
          } else {
            newRuns.push(elem);
          }
        }
        return applied ? newRuns : [...arg, new MathRun('\u0305')];
      }

      // 6. Mũ (hat, widehat)
      if (tok.val === '\\hat' || tok.val === '\\widehat') {
        const arg = parseArg();
        const newRuns = [];
        let applied = false;
        for (const elem of arg) {
          const t = extractTextFromMathRun(elem);
          if (t) {
            newRuns.push(new MathRun(t.split('').map(c => c + '\u0302').join('')));
            applied = true;
          } else {
            newRuns.push(elem);
          }
        }
        return applied ? newRuns : [...arg, new MathRun('\u0302')];
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
  // Tự động chuẩn hóa và bọc các công thức toán/lý/hóa chưa có dấu $
  const normalizedText = (mathMode !== 'normal') ? autoEncloseMath(text) : String(text);
  const str = String(normalizedText);

  // Nếu chế độ normal, không cần tách math, chỉ xử lý text và markdown bold
  if (mathMode === 'normal') {
    // Xóa dấu $ nếu có nhưng giữ lại nội dung
    const cleanStr = str.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]+?)\$/g, '$1');
    return parseBoldTextRuns(cleanStr, baseFontSize, fontName, defaultBold, textColor);
  }

  // Nếu chế độ raw_latex: giữ nguyên $...$ dưới dạng TextRun (đã được autoEncloseMath bọc $ đầy đủ)
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
