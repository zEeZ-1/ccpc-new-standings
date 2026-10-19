const rows = Array.from({length:10}, (_, i) => [0,600,[`team${i}`,0,0,'','','',''],i+1]);
const data = {contest_type:'ICPC',contest_id:123,my_name:'team0',problems:[101,102],problems_id:['A','B'],standings:rows,score:{team0:{0:[100,300,1234,0,100,0]}}};
module.exports = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
  '<h1>QOJ extension fixture</h1><div id="standings"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>QOJ 原榜单</td></tr></tbody></table></div>' +
  '<div class="card"><h4 class="card-header">Contest Ended</h4></div>' +
  '<div class="card"><h4 class="card-header">Virtual Contest</h4><div class="countdown" id="vp-clock">04:00:00</div></div>' +
  `<script>Object.assign(window,${JSON.stringify(data)})</script></body></html>`;
