/**
 * ClientGraph.jsx — Vẽ đồ thị trực tiếp trên trình duyệt bằng HTML5 Canvas
 * Fallback khi backend Matplotlib không khả dụng.
 * Hỗ trợ: bieu_do_cot, bieu_do_duong, bieu_do_tron, do_thi_ham_so, do_thi_vat_ly
 * [FEATURE: Hình ảnh] Thêm hỗ trợ loai:'tikz' → TikZCodeBlock
 */
import React, { useRef, useEffect } from 'react';
// [FEATURE: Hình ảnh] Import TikZCodeBlock cho loai:'tikz'
import TikZCodeBlock from './TikZCodeBlock';

// Bảng màu đẹp
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function drawBarChart(ctx, w, h, data) {
  const nhan = data.nhan || [];
  const giaTri = data.giaTri || [];
  if (!nhan.length || !giaTri.length) return;

  const padding = { top: 40, right: 20, bottom: 50, left: 55 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...giaTri) * 1.15;
  const barW = Math.min(chartW / nhan.length * 0.65, 60);
  const gap = chartW / nhan.length;

  // Background
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + chartH - (chartH * i / 5);
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 5).toString(), padding.left - 6, y + 3);
  }

  // Bars
  const mau = data.mau || COLORS;
  giaTri.forEach((val, i) => {
    const x = padding.left + gap * i + (gap - barW) / 2;
    const barH = (val / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    // Bar gradient
    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    const color = mau[i % mau.length];
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + 'cc');
    ctx.fillStyle = grad;

    // Rounded top
    const r = Math.min(4, barW / 4);
    ctx.beginPath();
    ctx.moveTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.closePath();
    ctx.fill();

    // Value on top
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(val.toString(), x + barW / 2, y - 5);

    // Label
    ctx.fillStyle = '#374151'; ctx.font = '10px sans-serif';
    ctx.fillText(nhan[i], x + barW / 2, padding.top + chartH + 18);
  });

  // Axes
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(w - padding.right, padding.top + chartH);
  ctx.stroke();

  // Title
  if (data.tieuDe) {
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.tieuDe, w / 2, 20);
  }
  // Axis labels
  if (data.nhanX) {
    ctx.fillStyle = '#4b5563'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.nhanX, w / 2, h - 5);
  }
  if (data.nhanY) {
    ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#4b5563'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.nhanY, 0, 0); ctx.restore();
  }
}

function drawPieChart(ctx, w, h, data) {
  const nhan = data.nhan || [];
  const giaTri = data.giaTri || [];
  if (!giaTri.length) return;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  const total = giaTri.reduce((s, v) => s + v, 0);
  const cx = w / 2 - 40, cy = h / 2 + 10, radius = Math.min(w, h) * 0.32;
  const mau = data.mau || COLORS;
  let startAngle = -Math.PI / 2;

  giaTri.forEach((val, i) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    const midAngle = startAngle + sliceAngle / 2;

    // Explode largest
    const isMax = val === Math.max(...giaTri);
    const offset = isMax ? 6 : 0;
    const ox = cx + Math.cos(midAngle) * offset;
    const oy = cy + Math.sin(midAngle) * offset;

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = mau[i % mau.length];
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Percentage label
    const pct = ((val / total) * 100).toFixed(1) + '%';
    const labelR = radius * 0.65;
    const lx = ox + Math.cos(midAngle) * labelR;
    const ly = oy + Math.sin(midAngle) * labelR;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pct, lx, ly + 4);

    startAngle += sliceAngle;
  });

  // Legend
  const legendX = w - 120, legendY = 40;
  nhan.forEach((label, i) => {
    const y = legendY + i * 22;
    ctx.fillStyle = mau[i % mau.length];
    ctx.fillRect(legendX, y, 14, 14);
    ctx.fillStyle = '#374151'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, legendX + 20, y + 11);
  });

  if (data.tieuDe) {
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.tieuDe, w / 2, 18);
  }
}

function drawLineChart(ctx, w, h, data) {
  const nhan = data.nhan || [];
  const chuoiDuLieu = data.chuoiDuLieu || [];
  if (!nhan.length || !chuoiDuLieu.length) return;

  const padding = { top: 40, right: 20, bottom: 50, left: 55 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  let allVals = chuoiDuLieu.flatMap(c => c.giaTri || []);
  const minVal = Math.min(...allVals) * 0.9;
  const maxVal = Math.max(...allVals) * 1.1;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + chartH - (chartH * i / 5);
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(minVal + (maxVal - minVal) * i / 5).toString(), padding.left - 6, y + 3);
  }

  // Lines
  chuoiDuLieu.forEach((chuoi, ci) => {
    const giaTri = chuoi.giaTri || [];
    const color = COLORS[ci % COLORS.length];
    const step = chartW / (nhan.length - 1 || 1);

    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath();
    giaTri.forEach((val, i) => {
      const x = padding.left + step * i;
      const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    giaTri.forEach((val, i) => {
      const x = padding.left + step * i;
      const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });
  });

  // X labels
  const step = chartW / (nhan.length - 1 || 1);
  nhan.forEach((label, i) => {
    ctx.fillStyle = '#374151'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, padding.left + step * i, padding.top + chartH + 18);
  });

  // Axes
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(w - padding.right, padding.top + chartH);
  ctx.stroke();

  // Legend
  if (chuoiDuLieu.length > 1) {
    chuoiDuLieu.forEach((chuoi, ci) => {
      const lx = padding.left + 10 + ci * 120;
      ctx.fillStyle = COLORS[ci % COLORS.length];
      ctx.fillRect(lx, 8, 14, 3);
      ctx.fillStyle = '#374151'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(chuoi.ten || `Chuỗi ${ci + 1}`, lx + 18, 14);
    });
  }

  if (data.tieuDe) {
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.tieuDe, w / 2, 30);
  }
}

function drawFunctionGraph(ctx, w, h, data) {
  const padding = { top: 40, right: 20, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const xRange = data.xRange || [-5, 5];

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Evaluate function safely
  const hamSo = data.hamSo || 'x';
  const points = [];
  const numPoints = 400;
  for (let i = 0; i <= numPoints; i++) {
    const x = xRange[0] + (xRange[1] - xRange[0]) * i / numPoints;
    try {
      const y = Function('x', 'Math', `"use strict"; return (${hamSo.replace(/\*\*/g, '**').replace(/np\./g, 'Math.').replace(/pi/g, 'Math.PI').replace(/sqrt/g, 'Math.sqrt').replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/tan/g, 'Math.tan').replace(/log/g, 'Math.log').replace(/exp/g, 'Math.exp').replace(/abs/g, 'Math.abs')})`)(x, Math);
      if (isFinite(y)) points.push({ x, y });
    } catch { /* skip */ }
  }

  if (!points.length) {
    ctx.fillStyle = '#ef4444'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Không thể vẽ: ${hamSo}`, w / 2, h / 2);
    return;
  }

  const yValues = points.map(p => p.y);
  let yMin, yMax;
  if (data.yRange) {
    [yMin, yMax] = data.yRange;
  } else {
    yMin = Math.min(...yValues);
    yMax = Math.max(...yValues);
    const margin = (yMax - yMin) * 0.15 || 1;
    yMin -= margin; yMax += margin;
  }

  const toCanvasX = x => padding.left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * chartW;
  const toCanvasY = y => padding.top + ((yMax - y) / (yMax - yMin)) * chartH;

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const yVal = yMin + (yMax - yMin) * i / 5;
    const cy = toCanvasY(yVal);
    ctx.beginPath(); ctx.moveTo(padding.left, cy); ctx.lineTo(w - padding.right, cy); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(yVal.toFixed(1), padding.left - 4, cy + 3);
  }
  for (let i = 0; i <= 5; i++) {
    const xVal = xRange[0] + (xRange[1] - xRange[0]) * i / 5;
    const cx = toCanvasX(xVal);
    ctx.beginPath(); ctx.moveTo(cx, padding.top); ctx.lineTo(cx, padding.top + chartH); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(xVal.toFixed(1), cx, padding.top + chartH + 14);
  }

  // Axes
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  if (yMin <= 0 && yMax >= 0) {
    const y0 = toCanvasY(0);
    ctx.beginPath(); ctx.moveTo(padding.left, y0); ctx.lineTo(w - padding.right, y0); ctx.stroke();
  }
  if (xRange[0] <= 0 && xRange[1] >= 0) {
    const x0 = toCanvasX(0);
    ctx.beginPath(); ctx.moveTo(x0, padding.top); ctx.lineTo(x0, padding.top + chartH); ctx.stroke();
  }

  // Function curve
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  let started = false;
  points.forEach(p => {
    if (p.y < yMin || p.y > yMax) { started = false; return; }
    const cx = toCanvasX(p.x), cy = toCanvasY(p.y);
    if (!started) { ctx.moveTo(cx, cy); started = true; } else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Special points
  (data.diemDacBiet || []).forEach(diem => {
    const cx = toCanvasX(diem.x), cy = toCanvasY(diem.y);
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    if (diem.nhan) {
      ctx.fillStyle = '#dc2626'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(diem.nhan, cx + 8, cy - 5);
    }
  });

  if (data.tieuDe) {
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.tieuDe, w / 2, 20);
  }
}

function drawPhysicsGraph(ctx, w, h, data) {
  const padding = { top: 40, right: 20, bottom: 40, left: 55 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  const segments = data.doanThang || [];
  const allX = segments.flatMap(s => [s.x1, s.x2]);
  const allY = segments.flatMap(s => [s.y1, s.y2]);
  if (!allX.length) return;

  const xMin = Math.min(0, ...allX), xMax = Math.max(...allX) * 1.1;
  const yMin = Math.min(0, ...allY), yMax = Math.max(...allY) * 1.15;

  const toX = x => padding.left + ((x - xMin) / (xMax - xMin || 1)) * chartW;
  const toY = y => padding.top + ((yMax - y) / (yMax - yMin || 1)) * chartH;

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + chartH * (1 - i / 5);
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((yMin + (yMax - yMin) * i / 5).toFixed(0), padding.left - 4, y + 3);
  }

  // Axes
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(toX(xMin), toY(0)); ctx.lineTo(toX(xMax), toY(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(toX(0), toY(yMin)); ctx.lineTo(toX(0), toY(yMax)); ctx.stroke();

  // Segments
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
  segments.forEach(s => {
    ctx.beginPath(); ctx.moveTo(toX(s.x1), toY(s.y1)); ctx.lineTo(toX(s.x2), toY(s.y2)); ctx.stroke();
  });

  // Special points
  (data.diemDacBiet || []).forEach(d => {
    ctx.beginPath(); ctx.arc(toX(d.x), toY(d.y), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    if (d.nhan) {
      ctx.fillStyle = '#dc2626'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(d.nhan, toX(d.x) + 8, toY(d.y) - 5);
    }
  });

  if (data.tieuDe) {
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.tieuDe, w / 2, 20);
  }
  if (data.nhanX) {
    ctx.fillStyle = '#4b5563'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.nhanX, w / 2, h - 5);
  }
  if (data.nhanY) {
    ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#4b5563'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.nhanY, 0, 0); ctx.restore();
  }
}

// ══════════════════════════════════════════════════════════════════
//  DISPATCHER
// ══════════════════════════════════════════════════════════════════
const DRAW_MAP = {
  bieu_do_cot: drawBarChart,
  bieu_do_duong: drawLineChart,
  bieu_do_tron: drawPieChart,
  do_thi_ham_so: drawFunctionGraph,
  do_thi_vat_ly: drawPhysicsGraph,
  histogram: drawBarChart, // fallback
};

// ══════════════════════════════════════════════════════════════════
//  COMPONENT CHÍNH
// ══════════════════════════════════════════════════════════════════
export default function ClientGraph({ hinhAnh, maxHeight = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!hinhAnh || !hinhAnh.loai || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 500;
    const height = maxHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const drawFn = DRAW_MAP[hinhAnh.loai];
    if (drawFn) {
      try {
        drawFn(ctx, width, height, hinhAnh);
      } catch (e) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lỗi vẽ đồ thị: ${e.message}`, width / 2, height / 2);
      }
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Loại đồ thị chưa hỗ trợ client-side: ${hinhAnh.loai}`, width / 2, height / 2);
    }
  }, [hinhAnh, maxHeight]);

  if (!hinhAnh || !hinhAnh.loai) return null;

  // [FEATURE: Hình ảnh] Xử lý loai:'tikz' — hiển thị TikZCodeBlock thay vì vẽ Canvas
  if (hinhAnh.loai === 'tikz') {
    return <TikZCodeBlock code={hinhAnh.code} tieuDe={hinhAnh.tieuDe} />;
  }

  return (
    <div className="my-2">
      <canvas ref={canvasRef} className="w-full rounded border border-slate-200 bg-white" />
      <p className="text-[10px] text-slate-400 mt-0.5 text-center">
        📊 {hinhAnh.tieuDe || hinhAnh.loai}
      </p>
    </div>
  );
}
