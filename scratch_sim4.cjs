const pool = [];
const addPool = (type, pts, count) => {
  for(let i=0; i<count; i++) pool.push({ type, point: pts });
};
addPool('nhieuLuaChon', 0.25, 12);
addPool('dungSai', 0.25, 16);
addPool('traLoiNgan', 0.25, 12);

// Simulate exact topicStats calculation
const topics = [
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 2 } ] }, // T1
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 2 } ] }, // T2 (Bài 28)
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 2 } ] }, // T3 (Bài 29)
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 2 } ] }, // T4 (Bài 30)
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 2 } ] }, // T5 (Bài 31)
  { isNuaDauKi: false, donViKienThuc: [ { soTiet: 3 } ] }  // T6 (Bài 32)
];

const tongSoTietToanBai = topics.reduce((sum, t) => sum + t.donViKienThuc[0].soTiet, 0);

const topicStats = topics.map((t, ti) => {
  const tiet = t.donViKienThuc[0].soTiet;
  return { ti, tiet, target: 0, current: 0, dvCursor: 0 };
});

topicStats.forEach(ts => {
  ts.target = (ts.tiet / tongSoTietToanBai) * 10.0;
});

pool.sort((a, b) => b.point - a.point);

for (const item of pool) {
  let bestIdx = -1;
  let maxStarve = -Infinity;
  for (let k = 0; k < topicStats.length; k++) {
    if (topicStats[k].tiet <= 0) continue;
    const starve = topicStats[k].target - topicStats[k].current;
    if (starve > maxStarve) {
      maxStarve = starve;
      bestIdx = k;
    }
  }

  const ts = topicStats[bestIdx];
  ts.current = Math.round((ts.current + item.point) * 100) / 100;
}

console.log(topicStats);
