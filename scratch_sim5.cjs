const topics = [
  { ti: 0, tiet: 4 },
  { ti: 1, tiet: 2 },
  { ti: 2, tiet: 2 },
  { ti: 3, tiet: 2 },
  { ti: 4, tiet: 2 },
  { ti: 5, tiet: 3 }
];

const tongSoTietToanBai = 15;

const topicStats = topics.map((t, ti) => {
  return { ti, tiet: t.tiet, target: (t.tiet / tongSoTietToanBai) * 10.0, current: 0, dvCursor: 0 };
});

const pool = [];
for (let i=0; i<12; i++) pool.push({ type: 'nhieuLuaChon', point: 0.25 });
for (let i=0; i<16; i++) pool.push({ type: 'dungSai', point: 0.25 });
for (let i=0; i<12; i++) pool.push({ type: 'traLoiNgan', point: 0.25 });

pool.sort((a, b) => b.point - a.point);

for (const item of pool) {
  let bestIdx = -1;
  let maxStarve = -Infinity;
  for (let k = 0; k < topicStats.length; k++) {
    const starve = topicStats[k].target - topicStats[k].current;
    if (starve > maxStarve) {
      maxStarve = starve;
      bestIdx = k;
    }
  }
  topicStats[bestIdx].current = Math.round((topicStats[bestIdx].current + item.point) * 100) / 100;
}

console.log(topicStats.map(t => ({ ti: t.ti, current: t.current, target: t.target })));
