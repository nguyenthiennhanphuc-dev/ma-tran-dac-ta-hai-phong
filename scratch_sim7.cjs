const topics = [
  { ti: 0, target: 2.6666, current: 0 },
  { ti: 1, target: 1.3333, current: 0 },
  { ti: 2, target: 1.3333, current: 0 },
  { ti: 3, target: 1.3333, current: 0 },
  { ti: 4, target: 1.3333, current: 0 },
  { ti: 5, target: 2.0000, current: 0 }
];

const pool = [];
for (let i=0; i<40; i++) pool.push({ point: 0.25 });

for (const item of pool) {
  let bestIdx = -1;
  let maxStarve = -Infinity;
  for (let k = 0; k < topics.length; k++) {
    // RELATIVE STARVE
    const starve = topics[k].target === 0 ? -Infinity : (topics[k].target - topics[k].current) / topics[k].target;
    // Tie breaker: if extremely close, favor the one with larger absolute target
    if (starve > maxStarve + 0.00001) {
      maxStarve = starve;
      bestIdx = k;
    } else if (Math.abs(starve - maxStarve) <= 0.00001) {
       if (bestIdx !== -1 && topics[k].target > topics[bestIdx].target) {
          maxStarve = starve;
          bestIdx = k;
       }
    }
  }
  topics[bestIdx].current = Math.round((topics[bestIdx].current + item.point) * 100) / 100;
}

console.log(topics);
