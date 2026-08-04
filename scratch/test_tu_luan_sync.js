// Test script to check Tự luận subitems synchronization and points rounding
const removeTuLuanSubItem = (topic, dvId, subItemId) => {
  const donViKienThuc = (topic.donViKienThuc || []).map(dv => {
    if (dv.id !== dvId) return dv;
    const subItems = (dv.tuLuan?.subItems || []).filter(s => s.id !== subItemId);
    const updated = { ...(dv.tuLuan || {}), subItems };
    // Sync old fields
    updated.biet = updated.subItems.filter(s => s.level === 'biet').length;
    updated.hieu = updated.subItems.filter(s => s.level === 'hieu').length;
    updated.vanDung = updated.subItems.filter(s => s.level === 'vanDung').length;
    updated.diemBiet = Math.round(updated.subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    updated.diemHieu = Math.round(updated.subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    updated.diemVanDung = Math.round(updated.subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    return { ...dv, tuLuan: updated };
  });
  return { ...topic, donViKienThuc };
};

const updateTuLuanSubItem = (topic, dvId, subItemId, field, value) => {
  const donViKienThuc = (topic.donViKienThuc || []).map(dv => {
    if (dv.id !== dvId) return dv;
    const subItems = (dv.tuLuan?.subItems || []).map(s =>
      s.id === subItemId ? { ...s, [field]: value } : s
    );
    const newTuLuan = { ...(dv.tuLuan || {}), subItems };
    newTuLuan.biet = subItems.filter(s => s.level === 'biet').length;
    newTuLuan.hieu = subItems.filter(s => s.level === 'hieu').length;
    newTuLuan.vanDung = subItems.filter(s => s.level === 'vanDung').length;
    newTuLuan.diemBiet = Math.round(subItems.filter(s => s.level === 'biet').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    newTuLuan.diemHieu = Math.round(subItems.filter(s => s.level === 'hieu').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    newTuLuan.diemVanDung = Math.round(subItems.filter(s => s.level === 'vanDung').reduce((s, sub) => s + (sub.diem || 0), 0) * 100) / 100;
    return { ...dv, tuLuan: newTuLuan };
  });
  return { ...topic, donViKienThuc };
};

// Initial state mock
let topic = {
  id: 'topic_1',
  tenChuDe: 'Hàm số',
  donViKienThuc: [
    {
      id: 'dv_1',
      noiDung: 'Đơn điệu',
      tuLuan: {
        biet: 2,
        hieu: 1,
        vanDung: 0,
        diemBiet: 1.2,
        diemHieu: 0.6,
        diemVanDung: 0,
        subItems: [
          { id: 'sub_1', level: 'biet', diem: 0.6 },
          { id: 'sub_2', level: 'biet', diem: 0.6 },
          { id: 'sub_3', level: 'hieu', diem: 0.6 }
        ]
      }
    }
  ]
};

console.log('--- Initial Tự Luận ---');
console.log(JSON.stringify(topic.donViKienThuc[0].tuLuan, null, 2));

// Test 1: Update sub_1 points to 0.75 (simulating float addition issue)
console.log('\n--- Update sub_1 point to 0.75 ---');
topic = updateTuLuanSubItem(topic, 'dv_1', 'sub_1', 'diem', 0.75);
console.log(JSON.stringify(topic.donViKienThuc[0].tuLuan, null, 2));
// diemBiet should be exactly 0.75 + 0.6 = 1.35 (without float precision issue)

// Test 2: Remove sub_2 (biet)
console.log('\n--- Remove sub_2 (level biet) ---');
topic = removeTuLuanSubItem(topic, 'dv_1', 'sub_2');
console.log(JSON.stringify(topic.donViKienThuc[0].tuLuan, null, 2));
// biet count should be 1, diemBiet should be exactly 0.75
