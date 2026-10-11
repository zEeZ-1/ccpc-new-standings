(function (root) {
  "use strict";
  const finite = (value) => value !== null && value !== "" && Number.isFinite(Number(value));
  function normalize(snapshot) {
    if (snapshot.type !== "ICPC") throw new Error("仅支持 QOJ 的 ICPC 榜单。");
    if (snapshot.partialScores) throw new Error("暂不支持带部分分的 ICPC 榜单。");
    if (!Array.isArray(snapshot.problems) || !snapshot.problems.length || !Array.isArray(snapshot.rows)) {
      throw new Error("页面还未提供完整榜单数据。");
    }
    const ids = new Set();
    const teams = snapshot.rows.map((row) => {
      const info = row[2];
      if (!Array.isArray(info) || typeof info[0] !== "string" || ids.has(info[0])) {
        throw new Error("榜单队伍格式不兼容，请切回原榜单。");
      }
      ids.add(info[0]);
      const raw = Object.hasOwn(snapshot.scores, info[0]) ? snapshot.scores[info[0]] : {};
      const cells = snapshot.problems.map((_, index) => {
        const item = raw?.[index];
        if (item == null) return { index, submitted: false, solved: false, time: Infinity, wrong: 0 };
        if (!Array.isArray(item) || !finite(item[0]) || !finite(item[3]) || !finite(item[4])) {
          throw new Error("榜单题目数据格式不兼容。");
        }
        const solved = Number(item[0]) === Number(item[4]) || Number(item[0]) === 97;
        if (!finite(item[1]) || Number(item[1]) < 0) {
          throw new Error("QOJ 未提供某次提交的时间，无法准确排列匿名题；保留原榜单。");
        }
        return { index, submitted: true, solved, time: Number(item[1]),
          wrong: Math.max(0, Number(item[3])), submissionId: Number(item[2]),
          pending: Number(item[5]) === 1, hacked: Number(item[0]) === 97 };
      });
      return { id: info[0], info, rank: row[3], penalty: row[1],
        unofficial: Number(info[2]) === 1 || Number(info[2]) === 2,
        solved: cells.filter(c => c.solved).length, cells };
    });
    return { teams, problems: snapshot.problems, labels: snapshot.labels };
  }
  function reveal(model) {
    const n = model.teams.length;
    const threshold = Math.min(50, Math.floor(n * 0.2));
    const counts = model.problems.map((_, i) => model.teams.filter(t => t.cells[i].solved).length);
    // The initial board hides every problem, even when floor(20% * N) is zero.
    const visible = counts.map(count => count > 0 && count >= threshold);
    return { threshold, n, counts, visible };
  }
  function order(cells, visible) {
    return [...cells].sort((a, b) => {
      const group = c => visible[c.index] ? 0 : c.solved ? 1 : c.submitted ? 2 : 3;
      const delta = group(a) - group(b);
      if (delta) return delta;
      if (group(a) === 0 || group(a) === 3) return a.index - b.index;
      return a.time - b.time || a.index - b.index;
    });
  }
  function time(seconds) {
    const minutes = Math.floor(Math.max(0, Number(seconds) || 0) / 60);
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const api = { normalize, reveal, order, time };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QojCcpcEngine = api;
})(globalThis);
