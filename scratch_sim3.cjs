const topics = [
  { ti: 0, tiet: 2 },
  { ti: 1, tiet: 2 },
  { ti: 2, tiet: 2 },
  { ti: 3, tiet: 2 },
  { ti: 4, tiet: 3 },
  { ti: 5, tiet: 3 }
];

let flatDvList = [];
topics.forEach((t, ti) => {
  flatDvList.push({ ti, di: 0, soTiet: t.tiet, weight: t.tiet });
});

const totalWeight = flatDvList.reduce((s, f) => s + f.weight, 0);

const stats = flatDvList.map(f => ({
  ti: f.ti,
  di: f.di,
  target: totalWeight > 0 ? (f.weight / totalWeight) * 10.0 : 0,
  current: 0,
}));

const pool = [];
for (let i=0; i<12; i++) pool.push({ type: 'nhieuLuaChon', pts: 0.25 });
for (let i=0; i<16; i++) pool.push({ type: 'dungSai', pts: 0.25 });
for (let i=0; i<12; i++) pool.push({ type: 'traLoiNgan', pts: 0.25 });

pool.sort((a, b) => b.pts - a.pts);

pool.forEach(item => {
  let bestIdx = -1;
  let maxStarve = -Infinity;
  for (let k = 0; k < stats.length; k++) {
    const starve = stats[k].target - stats[k].current;
    if (starve > maxStarve) {
      maxStarve = starve;
      bestIdx = k;
    }
  }
  
  stats[bestIdx].current = Math.round((stats[bestIdx].current + item.pts) * 100) / 100;
});

console.log(stats.map(s => ({ ti: s.ti, current: s.current, target: s.target })));
