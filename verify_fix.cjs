// Test with groupTfByTopic mode enabled  
const distributeLargestRemainder = (totalItems, weights) => {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights === 0 || totalItems === 0) return weights.map(() => 0);
  let exact = weights.map(w => (w / sumWeights) * totalItems);
  let intPart = exact.map(Math.floor);
  let remainders = exact.map((e, i) => ({ index: i, rem: e - intPart[i] }));
  let unallocated = totalItems - intPart.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < unallocated; i++) {
    intPart[remainders[i].index]++;
  }
  return intPart;
};

function testGroupTfByTopic(label, tP1, tP2, tP3, tTL, dP1, dP2, dP3, dTL) {
  const tiLe = { biet: 40, hieu: 30, vanDung: 30 };
  const topics = [
    {
      donViKienThuc: [
        { soTiet: 3, nhieuLuaChon: {biet:0,hieu:0,vanDung:0}, dungSai: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, traLoiNgan: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, tuLuan: {biet:0,hieu:0,vanDung:0,diemBiet:0,diemHieu:0,diemVanDung:0,subItems:[]} },
        { soTiet: 2, nhieuLuaChon: {biet:0,hieu:0,vanDung:0}, dungSai: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, traLoiNgan: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, tuLuan: {biet:0,hieu:0,vanDung:0,diemBiet:0,diemHieu:0,diemVanDung:0,subItems:[]} }
      ]
    },
    {
      donViKienThuc: [
        { soTiet: 3, nhieuLuaChon: {biet:0,hieu:0,vanDung:0}, dungSai: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, traLoiNgan: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, tuLuan: {biet:0,hieu:0,vanDung:0,diemBiet:0,diemHieu:0,diemVanDung:0,subItems:[]} },
        { soTiet: 2, nhieuLuaChon: {biet:0,hieu:0,vanDung:0}, dungSai: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, traLoiNgan: {biet:0,hieu:0,vanDung:0,vanDungCao:0}, tuLuan: {biet:0,hieu:0,vanDung:0,diemBiet:0,diemHieu:0,diemVanDung:0,subItems:[]} }
      ]
    }
  ];

  const tongSoTietToanBai = 10;
  const tongDiemDe = 10.0;
  const tongDiemBiet = 4.0, tongDiemHieu = 3.0, tongDiemVanDung = 3.0;

  let pool = [];
  let tuLuanPool = [];
  const addPool = (type, lvl, count, pts) => {
    for (let i = 0; i < count; i++) pool.push({ type, lvl, pts: Math.round(pts * 100) / 100 });
  };

  // TL
  if (tTL > 0) {
    const soYTuLuan = Math.max(3, Math.min(10, Math.round(tTL / dTL)));
    const diemMoiY = Math.round((tTL / soYTuLuan) * 100) / 100;
    const arrTL = distributeLargestRemainder(soYTuLuan, [tiLe.biet, tiLe.hieu, tiLe.vanDung]);
    const levels = ['biet', 'hieu', 'vanDung'];
    let totalAdded = 0, yIdx = 0;
    for (let li = 0; li < 3; li++) {
      for (let i = 0; i < arrTL[li]; i++) {
        yIdx++;
        const pts = (yIdx === soYTuLuan) ? Math.round((tTL - totalAdded) * 100) / 100 : diemMoiY;
        tuLuanPool.push({ type: 'tuLuan', lvl: levels[li], pts: Math.max(0.25, pts) });
        totalAdded += pts;
      }
    }
  }

  // ĐS
  const numTfBlocks = Math.round(tP2 / (dP2 * 4));
  const dsActualBiet = Math.round(numTfBlocks * dP2 * 100) / 100;
  const dsActualHieu = Math.round(numTfBlocks * dP2 * 100) / 100;
  const dsActualVD = Math.round(numTfBlocks * dP2 * 2 * 100) / 100;

  const tlActualBiet = Math.round(tuLuanPool.filter(p => p.lvl === 'biet').reduce((s, p) => s + p.pts, 0) * 100) / 100;
  const tlActualHieu = Math.round(tuLuanPool.filter(p => p.lvl === 'hieu').reduce((s, p) => s + p.pts, 0) * 100) / 100;
  const tlActualVanDung = Math.round(tuLuanPool.filter(p => p.lvl === 'vanDung').reduce((s, p) => s + p.pts, 0) * 100) / 100;

  const conLaiBiet = Math.max(0, Math.round((tongDiemBiet - tlActualBiet - dsActualBiet) * 100) / 100);
  const conLaiHieu = Math.max(0, Math.round((tongDiemHieu - tlActualHieu - dsActualHieu) * 100) / 100);
  const conLaiVanDung = Math.max(0, Math.round((tongDiemVanDung - tlActualVanDung - dsActualVD) * 100) / 100);
  const tongConLai = conLaiBiet + conLaiHieu + conLaiVanDung;

  if (tongConLai > 0) {
    const r = { biet: conLaiBiet/tongConLai, hieu: conLaiHieu/tongConLai, vanDung: conLaiVanDung/tongConLai };
    if (tP1 > 0) {
      const soCauP1 = Math.round(tP1 / dP1);
      const arrP1 = distributeLargestRemainder(soCauP1, [r.biet, r.hieu, r.vanDung]);
      addPool('nhieuLuaChon', 'biet', arrP1[0], dP1);
      addPool('nhieuLuaChon', 'hieu', arrP1[1], dP1);
      addPool('nhieuLuaChon', 'vanDung', arrP1[2], dP1);
    }
    if (tP3 > 0) {
      const soCauP3 = Math.round(tP3 / dP3);
      const arrP3 = distributeLargestRemainder(soCauP3, [r.biet, r.hieu, r.vanDung]);
      addPool('traLoiNgan', 'biet', arrP3[0], dP3);
      addPool('traLoiNgan', 'hieu', arrP3[1], dP3);
      addPool('traLoiNgan', 'vanDung', arrP3[2], dP3);
    }
  }

  pool.sort((a, b) => b.pts - a.pts);

  const flatDvList = [];
  topics.forEach((t, ti) => t.donViKienThuc.forEach((dv, di) => {
    const st = Number(dv.soTiet) || 0;
    flatDvList.push({ ti, di, target: (st / tongSoTietToanBai) * 10, current: 0 });
  }));

  // === groupTfByTopic MODE ===
  for (let i = 0; i < numTfBlocks; i++) {
    let bestTopicIdx = -1, maxTopicGap = -Infinity;
    topics.forEach((topic, ti) => {
      const topicTarget = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.target, 0);
      const topicCurrent = flatDvList.filter(f => f.ti === ti).reduce((s, f) => s + f.current, 0);
      const gap = topicTarget - topicCurrent;
      if (gap > maxTopicGap) { maxTopicGap = gap; bestTopicIdx = ti; }
    });

    if (bestTopicIdx !== -1) {
      const topicDvs = flatDvList.filter(f => f.ti === bestTopicIdx);
      const levels = ['biet', 'hieu', 'vanDung', 'vanDungCao'];
      levels.forEach(lvl => {
        let bestDvIdxInTopic = -1, maxDvGap = -Infinity;
        topicDvs.forEach((dvRef, idx) => {
          const gap = dvRef.target - dvRef.current;
          if (gap > maxDvGap) { maxDvGap = gap; bestDvIdxInTopic = idx; }
        });
        if (bestDvIdxInTopic !== -1) {
          const targetRef = topicDvs[bestDvIdxInTopic];
          const dv = topics[targetRef.ti].donViKienThuc[targetRef.di];
          dv.dungSai[lvl]++;
          targetRef.current += dP2;
        }
      });
    }
  }

  // TL distribution
  tuLuanPool.forEach(item => {
    let bestIdx = -1, maxGap = -Infinity;
    flatDvList.forEach((u, idx) => {
      if (u.target <= 0) return;
      const gap = u.target - u.current;
      if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
    });
    if (bestIdx === -1) return;
    const { ti, di } = flatDvList[bestIdx];
    const dv = topics[ti].donViKienThuc[di];
    if (!Array.isArray(dv.tuLuan.subItems)) dv.tuLuan.subItems = [];
    dv.tuLuan.subItems.push({ diem: item.pts, level: item.lvl });
    dv.tuLuan.biet = dv.tuLuan.subItems.filter(s => s.level === 'biet').length;
    dv.tuLuan.hieu = dv.tuLuan.subItems.filter(s => s.level === 'hieu').length;
    dv.tuLuan.vanDung = dv.tuLuan.subItems.filter(s => s.level === 'vanDung').length;
    dv.tuLuan.diemBiet = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    dv.tuLuan.diemHieu = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    dv.tuLuan.diemVanDung = Math.round(dv.tuLuan.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    flatDvList[bestIdx].current += item.pts;
  });

  pool.forEach(item => {
    let bestIdx = -1, maxGap = -Infinity;
    flatDvList.forEach((u, idx) => {
      if (u.target <= 0) return;
      const gap = u.target - u.current;
      if (gap > maxGap) { maxGap = gap; bestIdx = idx; }
    });
    if (bestIdx === -1) return;
    const { ti, di } = flatDvList[bestIdx];
    topics[ti].donViKienThuc[di][item.type][item.lvl]++;
    flatDvList[bestIdx].current += item.pts;
  });

  // === DISPLAY ===
  const hasTraLoiNgan = tP3 > 0;
  const getTopicSum = (topic, type, level) => 
    topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv[type]?.[level]) || 0), 0);
  const getTopicTuLuanDiem = (topic, key) =>
    topic.donViKienThuc.reduce((sum, dv) => sum + (Number(dv.tuLuan?.[key]) || 0), 0);

  const getLevelTotalPoints = (level) => {
    const tlKey = level === 'biet' ? 'diemBiet' : level === 'hieu' ? 'diemHieu' : 'diemVanDung';
    const raw = topics.reduce((sum, topic) => {
      let dsCount = getTopicSum(topic, 'dungSai', level);
      if (level === 'vanDung') dsCount += getTopicSum(topic, 'dungSai', 'vanDungCao');
      return sum +
        getTopicSum(topic, 'nhieuLuaChon', level) * dP1 +
        dsCount * dP2 +
        (hasTraLoiNgan ? getTopicSum(topic, 'traLoiNgan', level) * dP3 : 0) +
        getTopicTuLuanDiem(topic, tlKey);
    }, 0);
    return Math.round(raw * 100) / 100;
  };

  const dB = getLevelTotalPoints('biet');
  const dH = getLevelTotalPoints('hieu');
  const dVD = getLevelTotalPoints('vanDung');
  const total = dB + dH + dVD;
  const pB = ((dB / 10) * 100).toFixed(1);
  const pH = ((dH / 10) * 100).toFixed(1);
  const pVD = ((dVD / 10) * 100).toFixed(1);

  const ok = pB === '40.0' && pH === '30.0' && pVD === '30.0' && Math.abs(total - 10) < 0.05;

  console.log(`${ok ? '✅' : '❌'} ${label} [groupTfByTopic]`);
  if (!ok) {
    console.log(`  DISPLAY: B=${dB}đ(${pB}%), H=${dH}đ(${pH}%), VD=${dVD}đ(${pVD}%), Total=${total}đ`);
    topics.forEach((t, ti) => t.donViKienThuc.forEach((dv, di) => {
      console.log(`  DV[${ti}][${di}]: NLC(${dv.nhieuLuaChon.biet},${dv.nhieuLuaChon.hieu},${dv.nhieuLuaChon.vanDung}) DS(${dv.dungSai.biet},${dv.dungSai.hieu},${dv.dungSai.vanDung},${dv.dungSai.vanDungCao}) TLN(${dv.traLoiNgan.biet},${dv.traLoiNgan.hieu},${dv.traLoiNgan.vanDung})`);
    }));
  }
  return ok;
}

console.log('=== groupTfByTopic mode ===');
testGroupTfByTopic('3.5-4-2.5', 3.5, 4.0, 2.5, 0, 0.25, 0.25, 0.25, 0.5);
testGroupTfByTopic('4.5-4-1.5', 4.5, 4.0, 1.5, 0, 0.25, 0.25, 0.25, 0.5);
testGroupTfByTopic('5.5-3-1.5', 5.5, 3.0, 1.5, 0, 0.25, 0.25, 0.25, 0.5);
testGroupTfByTopic('3-4-3', 3.0, 4.0, 3.0, 0, 0.25, 0.25, 0.25, 0.5);
testGroupTfByTopic('3.5-2-1.5+TL3', 3.5, 2.0, 1.5, 3.0, 0.25, 0.25, 0.25, 0.5);
testGroupTfByTopic('3-2-2+TL3', 3.0, 2.0, 2.0, 3.0, 0.25, 0.25, 0.25, 0.5);
