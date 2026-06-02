const topics = [
  { ti: 0, target: 1.875, current: 0 },
  { ti: 1, target: 1.875, current: 0 },
  { ti: 2, target: 1.875, current: 0 },
  { ti: 3, target: 1.875, current: 0 },
  { ti: 4, target: 1.0, current: 0 },
  { ti: 5, target: 1.5, current: 0 }
];

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

console.log(topics);
