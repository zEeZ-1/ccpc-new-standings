(function () {
  "use strict";
  if (!/^\/contest\/\d+\/standings(?:\/external)?\/?$/.test(location.pathname)) return;
  const engine = globalThis.QojCcpcEngine;
  const key = `qoj-ccpc:${location.hostname}:${location.pathname.match(/\d+/)[0]}`;
  let enabled = true, model, snapshot, page = 1, query = "", lastSnapshot, error = "";
  let panel, original, tableWrap, status, pager, toggle;
  const PAGE_SIZE = 100;
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function createPanel() {
    const board = document.getElementById("standings");
    if (!board) return false;
    original = board;
    if (panel?.isConnected) return true;
    panel = el("section", undefined, "ccpc-panel"); panel.id = "qoj-ccpc-panel";
    const toolbar = el("div", undefined, "ccpc-toolbar");
    toolbar.append(el("h3", "CCPC 新榜单"));
    const group = el("div", undefined, "ccpc-controls");
    const label = el("label", undefined, "ccpc-check");
    toggle = el("input"); toggle.type = "checkbox"; toggle.checked = enabled;
    label.append(toggle, el("span", "启用新模式")); group.append(label);
    toggle.addEventListener("change", () => {
      enabled = toggle.checked; page = 1; render();
      chrome.storage.local.set({ [key]: { enabled } }).catch(() => {});
    });
    const search = el("input"); search.type = "search"; search.placeholder = "搜索队伍"; search.setAttribute("aria-label", "搜索队伍");
    search.addEventListener("input", () => { query = search.value; page = 1; render(); }); group.append(search);
    toolbar.append(group);
    status = el("p", "正在读取 QOJ 榜单数据…", "ccpc-status"); status.setAttribute("role", "status"); toolbar.append(status);
    panel.append(toolbar);
    tableWrap = el("div", undefined, "ccpc-table-wrap"); pager = el("div", undefined, "ccpc-pager"); panel.append(tableWrap, pager);
    original.before(panel);
    return true;
  }
  function plain(value) {
    const template = document.createElement("template"); template.innerHTML = String(value ?? "");
    return template.content.textContent || "";
  }
  function labelAt(index) { return String(model.labels?.[index] ?? String.fromCharCode(65 + index)); }
  function render() {
    if (!createPanel()) return;
    const frozen = snapshot?.phase?.frozen === true;
    if (!enabled || frozen || !model || error) {
      original.hidden = false; tableWrap.replaceChildren(); pager.replaceChildren();
      status.className = `ccpc-status${enabled && !frozen && error ? " ccpc-error" : ""}`;
      status.textContent = !enabled ? "原 QOJ 榜单" : frozen ? "已进入最后一小时，自动显示原 QOJ 榜单" : error || "正在读取当前榜单数据…";
      return;
    }
    const reveal = engine.reveal(model);
    const visibleIndices = reveal.visible.map((v, i) => v ? i : -1).filter(i => i >= 0);
    const hiddenCount = model.problems.length - visibleIndices.length;
    const filtered = model.teams.filter(t => `${t.id} ${plain(t.info[3])} ${plain(t.info[6])}`.toLowerCase().includes(query.toLowerCase()));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); page = Math.min(page, pages);
    status.className = "ccpc-status";
    status.textContent = `当前榜单 ${reveal.n} 队 · 公开阈值 ${reveal.threshold} 队 AC · 已公开 ${visibleIndices.length}/${model.problems.length} 题`;
    if (!snapshot.phase) status.textContent += " · 未识别倒计时，封榜时请关闭新模式";
    const table = el("table"); table.setAttribute("aria-label", "CCPC 新榜单");
    const head = el("thead"), header = el("tr");
    ["排名", "队伍", "AC", "总罚时"].forEach(text => header.append(el("th", text)));
    visibleIndices.forEach(i => {
      const th = el("th", `${labelAt(i)}\n${reveal.counts[i]} AC`, "ccpc-revealed");
      th.style.whiteSpace = "pre-line"; header.append(th);
    });
    for (let i = 0; i < hiddenCount; i++) header.append(el("th", "?"));
    head.append(header); table.append(head);
    const body = el("tbody");
    for (const team of filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)) {
      const tr = el("tr"); if (team.id === snapshot.myName) tr.className = "ccpc-self";
      tr.append(el("td", team.rank));
      const name = el("td", undefined, "ccpc-team");
      if (Number(team.info[2]) === 3) name.append(el("span", plain(team.info[3]) || team.id));
      else { const a = el("a", `${team.unofficial ? "* " : ""}${team.id}`); a.href = `/user/profile/${encodeURIComponent(team.id)}`; name.append(a); }
      if (team.info[6]) name.append(el("small", plain(team.info[6])));
      tr.append(name, el("td", team.solved), el("td", engine.time(team.penalty)));
      for (const cell of engine.order(team.cells, reveal.visible)) {
        const td = el("td", undefined, `ccpc-cell${cell.solved ? " ccpc-ac" : ""}`);
        const revealed = reveal.visible[cell.index];
        if (revealed) td.classList.add("ccpc-revealed");
        if (cell.submitted) {
          const result = cell.pending ? `?${cell.wrong + 1}` : cell.solved ? `+${cell.wrong || ""}` : `-${cell.wrong + 1}`;
          let mark;
          if (revealed && cell.submissionId > 0 && !cell.pending) {
            mark = el("a", result); mark.href = `/submission/${cell.submissionId}`;
          } else mark = el("span", result);
          mark.className = cell.pending ? "ccpc-pending" : cell.solved ? "" : "ccpc-wa";
          td.append(mark, el("div", engine.time(cell.time)));
        } else td.append(el("span", "—"));
        tr.append(td);
      }
      body.append(tr);
    }
    if (!filtered.length) { const tr = el("tr"), td = el("td", "没有匹配的队伍"); td.colSpan = 4 + model.problems.length; tr.append(td); body.append(tr); }
    table.append(body); tableWrap.replaceChildren(table);
    pager.replaceChildren();
    const prev = el("button", "上一页"), next = el("button", "下一页"); prev.type = next.type = "button";
    prev.disabled = page === 1; next.disabled = page === pages;
    prev.addEventListener("click", () => { page--; render(); }); next.addEventListener("click", () => { page++; render(); });
    pager.append(prev, el("span", `第 ${page} / ${pages} 页 · ${filtered.length} 队`), next);
    original.hidden = true;
  }
  document.addEventListener("qoj-ccpc-snapshot", event => {
    if (typeof event.detail !== "string" || event.detail.length > 30000000 || event.detail === lastSnapshot) return;
    lastSnapshot = event.detail;
    try { snapshot = JSON.parse(event.detail); model = engine.normalize(snapshot); error = ""; }
    catch (e) { model = undefined; error = e.message; }
    render();
  });
  chrome.storage.local.get(key).then(data => {
    const saved = data[key];
    enabled = typeof saved?.enabled === "boolean" ? saved.enabled : saved?.mode !== "original";
    if (toggle) toggle.checked = enabled;
    render();
  }).catch(() => {});
  const observer = new MutationObserver(() => {
    if (!panel?.isConnected || original !== document.getElementById("standings")) render();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  render();
  document.dispatchEvent(new Event("qoj-ccpc-request"));
})();
