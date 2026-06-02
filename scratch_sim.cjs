const topics = [
  { ti: 0, tiet: 2, target: 0, current: 0, dvCursor: 0 },
  { ti: 1, tiet: 2, target: 0, current: 0, dvCursor: 0 },
  { ti: 2, tiet: 2, target: 0, current: 0, dvCursor: 0 },
  { ti: 3, tiet: 2, target: 0, current: 0, dvCursor: 0 },
  { ti: 4, tiet: 2, target: 0, current: 0, dvCursor: 0 },
  { ti: 5, tiet: 3, target: 0, current: 0, dvCursor: 0 }
];

const tongSoTietToanBai = 13;
topics.forEach(ts => {
  ts.target = (ts.tiet / tongSoTietToanBai) * 10.0;
});

const pool = [];
for (let i=0; i<12; i++) pool.push({ type: 'nhieuLuaChon', point: 0.25 });
for (let i=0; i<16; i++) pool.push({ type: 'dungSai', point: 0.25 });
for (let i=0; i<12; i++) pool.push({ type: 'traLoiNgan', point: 0.25 });

pool.sort((a, b) => b.point - a.point);

for (const item of pool) {
  let bestIdx = -1;
  let maxStarve = -Infinity;
  for (let k = 0; k < topics.length; k++) {
    const starve = topics[k].target - topics[k].current;
    if (starve > maxStarve) {
      maxStarve = starve;
      bestIdx = k;
    }
  }

  topics[bestIdx].current = Math.round((topics[bestIdx].current + item.point) * 100) / 100;
}

console.log(topics.map(t => ({ ti: t.ti, current: t.current, target: t.target })));
