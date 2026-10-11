// Runs in the page world: read existing QOJ data, without changing scores or making requests.
(function () {
  "use strict";
  let previous = "";
  function phase() {
    const cards = Array.from(document.querySelectorAll(".card, .panel"));
    const title = card => card.querySelector(".card-header, .panel-heading")?.textContent.trim() || "";
    const virtual = cards.filter(card => /Virtual Contest|虚拟比赛|虚拟参赛/i.test(title(card)));
    // An old contest's "Contest Ended" card describes the original contest, not this VP.
    const candidates = virtual.length ? virtual : cards.filter(card => /Contest ends in|比赛结束倒计时|距离比赛结束|比赛剩余时间/i.test(title(card)));
    for (const card of candidates) {
      if (card.querySelector("#form-regvir")) continue; // VP has not been started by this user.
      for (const clock of card.querySelectorAll(".countdown, #contest-countdown")) {
        if (!clock.getClientRects().length) continue;
        // Read QOJ's live rendered clock. data-rest is the initial value and becomes stale.
        const match = clock.textContent.trim().match(/^(?:(\d+)\s*days?\s*)?(\d+)\s*:\s*(\d{2})\s*:\s*(\d{2})$/i);
        if (!match || Number(match[3]) > 59 || Number(match[4]) > 59) continue;
        const remaining = Number(match[1] || 0) * 86400 + Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]);
        return { source: virtual.length ? "vp" : "contest", frozen: remaining <= 3600 };
      }
    }
    return null;
  }
  function publish(force = false) {
    try {
      if (typeof standings === "undefined" || typeof score === "undefined" || typeof problems === "undefined") return;
      const snapshot = {
        type: typeof contest_type !== "undefined" ? contest_type : "",
        partialScores: typeof icpc_partial_scores !== "undefined" && !!icpc_partial_scores,
        problems: Array.from(problems),
        labels: typeof problems_id !== "undefined" ? Array.from(problems_id) : [],
        rows: standings.map(row => [row[0], row[1], Array.from(row[2]), row[3]]),
        scores: score,
        contestId: typeof contest_id !== "undefined" ? contest_id : null,
        myName: typeof my_name !== "undefined" ? my_name : "",
        phase: phase()
      };
      const serialized = JSON.stringify(snapshot);
      if (force || serialized !== previous) {
        previous = serialized;
        document.dispatchEvent(new CustomEvent("qoj-ccpc-snapshot", { detail: serialized }));
      }
    } catch { /* Page may be in the middle of replacing its data. Retry on the next tick. */ }
  }
  document.addEventListener("qoj-ccpc-request", () => publish(true));
  // Also handles QOJ AJAX reloads and changes to group / unofficial filters.
  setInterval(publish, 1500);
  if (document.readyState !== "loading") publish(true);
  else document.addEventListener("DOMContentLoaded", () => publish(true));
})();
