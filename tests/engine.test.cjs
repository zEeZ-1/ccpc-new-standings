const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../qoj-ccpc/engine.js');
const ac = (time, wrong = 0) => [100, time, 1234, wrong, 100, 0];
const wa = (time, wrong = 0) => [0, time, 1235, wrong, 100, 0];
function board(count = 100) {
  const rows = [], scores = Object.create(null);
  for (let i = 0; i < count; i++) {
    const id = `team${i}`;
    rows.push([0, 600, [id, 0, 0], i + 1]);
    scores[id] = {};
  }
  return { type: 'ICPC', problems: [10, 20, 30, 40, 50, 60], rows, scores };
}
test('different teams receive different anonymous orders; revealed problems come first', () => {
  const data = board();
  data.scores.team0 = { 0: wa(900), 1: ac(700), 2: ac(300), 3: wa(800) };
  data.scores.team1 = { 0: ac(100), 1: ac(200), 2: ac(400), 3: wa(600) };
  const model = engine.normalize(data), visible = [false, true, false, false, false, false];
  assert.deepEqual(engine.order(model.teams[0].cells, visible).map(c => c.index), [1, 2, 3, 0, 4, 5]);
  assert.deepEqual(engine.order(model.teams[1].cells, visible).map(c => c.index), [1, 0, 2, 3, 4, 5]);
  assert.equal(data.scores.team0[1][3], 0); // No mutation of QOJ data.
});
test('50 AC boundary uses the complete dataset, including rows beyond page one', () => {
  const data = board(305);
  for (let i = 100; i < 149; i++) data.scores[`team${i}`][0] = ac(i);
  assert.equal(engine.reveal(engine.normalize(data)).visible[0], false);
  data.scores.team149[0] = ac(149);
  assert.equal(engine.reveal(engine.normalize(data)).visible[0], true);
});
test('20% threshold uses all teams in the current QOJ snapshot, including VP teams', () => {
  const data = board(103);
  for (let i = 0; i < 20; i++) data.scores[`team${i}`][0] = ac(i);
  let reveal = engine.reveal(engine.normalize(data));
  assert.equal(reveal.threshold, 20); assert.equal(reveal.visible[0], true);
  data.rows[0][2][2] = 1;
  reveal = engine.reveal(engine.normalize(data));
  assert.equal(reveal.n, 103); assert.equal(reveal.counts[0], 20); assert.equal(reveal.visible[0], true);
});
test('empty board and N < 5 initially hide all problem identifiers', () => {
  assert.deepEqual(engine.reveal(engine.normalize(board(0))).visible, Array(6).fill(false));
  const data = board(3); data.scores.team0[0] = ac(0);
  const result = engine.reveal(engine.normalize(data));
  assert.equal(result.visible[0], true); assert.equal(result.visible[1], false);
});
test('either threshold reveals: 20% below 250 teams and 50 above 250 teams', () => {
  const small = board(103);
  for (let i = 0; i < 19; i++) small.scores[`team${i}`][0] = ac(i);
  assert.equal(engine.reveal(engine.normalize(small)).visible[0], false);
  small.scores.team19[0] = ac(19);
  assert.equal(engine.reveal(engine.normalize(small)).visible[0], true);
  const large = board(1000);
  for (let i = 0; i < 50; i++) large.scores[`team${i}`][0] = ac(i);
  assert.equal(engine.reveal(engine.normalize(large)).threshold, 50);
  assert.equal(engine.reveal(engine.normalize(large)).visible[0], true);
});
test('old saved threshold choices cannot override the OR rule', () => {
  const data = board(103);
  for (let i = 0; i < 20; i++) data.scores[`team${i}`][0] = ac(i);
  assert.equal(engine.reveal(engine.normalize(data), { threshold: 'fixed' }).visible[0], true);
  const large = board(305);
  for (let i = 0; i < 50; i++) large.scores[`team${i}`][0] = ac(i);
  assert.equal(engine.reveal(engine.normalize(large), { threshold: 'percent' }).visible[0], true);
});
test('exact seconds, tie order, failed submissions and unsubmitted cells', () => {
  const data = board(1); data.scores.team0 = {0: ac(61, 2), 1: ac(60), 2: wa(61), 3: wa(61)};
  const cells = engine.normalize(data).teams[0].cells;
  assert.deepEqual(engine.order(cells, Array(6).fill(false)).map(c=>c.index), [1,0,2,3,4,5]);
  assert.equal(cells[0].wrong, 2); assert.equal(engine.time(3661), '1:01');
});
test('unsupported / incomplete data fails explicitly rather than guessing time', () => {
  assert.throws(()=>engine.normalize({...board(),type:'OI'}), /ICPC/);
  assert.throws(()=>engine.normalize({...board(),partialScores:true}), /部分分/);
  const data = board(1); data.scores.team0[0] = wa(-1);
  assert.throws(()=>engine.normalize(data), /时间/);
  data.scores.team0[0][1] = null; assert.throws(()=>engine.normalize(data), /时间/);
});
