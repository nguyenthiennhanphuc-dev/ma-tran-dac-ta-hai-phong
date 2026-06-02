const { exportToWord } = require('./dist/exportWord.cjs');

// We have to mock the store BEFORE calling exportToWord,
// but wait, in exportWord.js, useExamStore.getState() is called INSIDE exportToWord!
// How can I mock useExamStore if it was bundled?
// I can't easily. But let's see if exportToWord just crashes immediately.
