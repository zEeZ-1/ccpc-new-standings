// Runs against a local, synthetic QOJ page. No login, network requests or user profile access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.CCPC_PLAYWRIGHT_PATH || 'playwright');
const dir = path.resolve(__dirname, '../qoj-ccpc');
async function main() {
  const browser = await chromium.launch({ headless:true, ...(process.env.CCPC_CHROME_PATH ? {executablePath:process.env.CCPC_CHROME_PATH} : {channel:'chrome'}) });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.fulfill({contentType:'text/html', body:'<!doctype html><html><head><meta charset="utf-8"></head><body><h1>QOJ 测试榜单</h1><div id="standings"><table><thead><tr><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><td>原榜单</td></tr></tbody></table></div><div class="card"><h4 class="card-header">Contest Ended</h4></div><div class="card"><h4 class="card-header">Contest ends in</h4><div class="countdown">00:30:00</div></div><div class="card" id="vp-card"><h4 class="card-header">Virtual Contest</h4><div class="countdown" id="vp-clock" data-rest="18000">01:00:00</div></div></body></html>'}));
    await page.goto('https://qoj.ac/contest/123/standings');
    await page.evaluate(() => {
      window.contest_type='ICPC'; window.contest_id=123; window.my_name='team0';
      window.problems=[101,102,103,104,105,106]; window.problems_id=['A','B','C','D','E','F'];
      window.standings=[]; window.score={};
      for(let i=0;i<205;i++) { const id=`team${i}`; standings.push([0,3600,[id,0,0,'','','',i===0?'<b>队伍零</b>':''],i+1]); score[id]={}; if(i<40)score[id][1]=[100,600,1000+i,0,100,0]; }
      score.team0={0:[0,900,11,1,100,0],1:[100,600,12,0,100,0],2:[100,300,13,2,100,0],3:[0,800,14,0,100,0]};
      score.team1={0:[100,100,15,0,100,0],1:[100,200,16,0,100,0],2:[100,400,17,0,100,0]};
    });
    await page.addStyleTag({path:path.join(dir,'content.css')});
    await page.addScriptTag({path:path.join(dir,'bridge.js')});
    // Match MV3: bridge in MAIN, rendering/engine in an isolated content-script world.
    const session = await page.context().newCDPSession(page);
    const {frameTree} = await session.send('Page.getFrameTree');
    const {executionContextId} = await session.send('Page.createIsolatedWorld', {frameId:frameTree.frame.id,worldName:'qoj-ccpc-test'});
    await session.send('Runtime.evaluate', {contextId:executionContextId,expression:'globalThis.chrome={storage:{local:{get:async(key)=>({[key]:{mode:"auto",threshold:"fixed",start:"2000-01-01T00:00",teamCount:9999,countUnofficial:false}}),set:async()=>{}}}}'});
    for (const name of ['engine.js','content.js']) {
      const result = await session.send('Runtime.evaluate', {contextId:executionContextId,expression:fs.readFileSync(path.join(dir,name),'utf8')});
      assert.equal(result.exceptionDetails, undefined);
    }
    const panel=page.locator('#qoj-ccpc-panel');
    // Page opened after freeze: preserve native headings/order immediately, even with stale data-rest.
    assert.match(await panel.locator('.ccpc-status').innerText(),/最后一小时/);
    assert.equal(await page.locator('#standings').isVisible(),true);
    assert.deepEqual(await page.locator('#standings th').allTextContents(),['A','B','C']);
    assert.equal(await panel.getByRole('checkbox',{name:'启用新模式'}).isChecked(),true);
    // An active VP takes priority over historical Ended and unrelated official clocks.
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='01:00:01';});
    await panel.locator('tbody tr').first().waitFor();
    assert.equal(await page.locator('#standings').isHidden(),true);
    assert.equal(await panel.locator('input[type="checkbox"]').count(),1);
    assert.equal(await panel.locator('select, input[type="number"], input[type="datetime-local"]').count(),0);
    assert.match(await panel.locator('.ccpc-status').innerText(),/公开阈值 41 队/);
    assert.deepEqual(await panel.locator('thead th').allTextContents(),['排名','队伍','AC','总罚时','?','?','?','?','?','?']);
    assert.deepEqual(await panel.locator('tbody tr').first().locator('td').allTextContents(),['1','team0队伍零','2','1:00','+20:05','+0:10','-10:13','-20:15','—','—']);
    assert.equal(await panel.locator('tbody tr').first().locator('.ccpc-cell a').count(),0);
    assert.equal(await panel.locator('tbody tr').count(),100);
    await panel.getByRole('button',{name:'下一页'}).click(); assert.match(await panel.locator('.ccpc-pager').innerText(),/第 2 \/ 3 页/);
    assert.equal(await panel.locator('tbody tr').first().locator('td').first().innerText(),'101');
    await panel.getByRole('searchbox').fill('team0'); assert.equal(await panel.locator('tbody tr').count(),1);
    assert.match(await panel.locator('.ccpc-status').innerText(),/当前榜单 205 队/);
    // Simulate new current-time QOJ data: no manual refresh event from the plugin UI.
    await page.evaluate(()=>{score.team40[1]=[100,1000,777,0,100,0];});
    await panel.locator('thead th.ccpc-revealed').waitFor();
    assert.equal(await panel.locator('thead th.ccpc-revealed').innerText(),'B\n41 AC');
    assert.equal(await panel.locator('tbody tr').first().locator('.ccpc-cell a').count(),1);
    assert.equal(await panel.locator('tbody tr').first().locator('.ccpc-cell a').getAttribute('href'),'/submission/12');
    // Time alone crosses the boundary. No score change or refresh event is needed.
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='01:00:00';});
    await page.waitForFunction(()=>!document.getElementById('standings').hidden);
    assert.equal(await panel.locator('table').count(),0);
    assert.deepEqual(await page.locator('#standings th').allTextContents(),['A','B','C']);
    assert.equal(await panel.getByRole('checkbox',{name:'启用新模式'}).isChecked(),true);
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='00:00:00';});
    await page.waitForTimeout(1600);
    assert.equal(await page.locator('#standings').isVisible(),true);
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='1 days 00:00:00';});
    await panel.locator('table').waitFor();
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='unavailable';});
    await page.waitForFunction(()=>document.querySelector('.ccpc-status').textContent.includes('未识别倒计时'));
    assert.equal(await panel.locator('table').count(),1); // Do not guess from data-rest or unrelated clock.
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='04:00:00';});
    await page.waitForFunction(()=>!document.querySelector('.ccpc-status').textContent.includes('未识别倒计时'));
    await panel.getByRole('checkbox',{name:'启用新模式'}).uncheck(); assert.equal(await page.locator('#standings').isVisible(),true);
    assert.equal(await panel.locator('table').count(),0);
    await page.evaluate(()=>{score.team0[2][3]=3;});
    await page.waitForTimeout(1600);
    await panel.getByRole('checkbox',{name:'启用新模式'}).check(); assert.equal(await panel.locator('table').count(),1);
    assert.match(await panel.locator('tbody tr').first().innerText(),/\+3/);
    await panel.getByRole('searchbox').fill('');
    await page.evaluate(()=>{document.getElementById('standings').replaceWith(Object.assign(document.createElement('div'),{id:'standings',textContent:'AJAX 重建的原榜单'}));});
    await page.waitForFunction(()=>document.getElementById('standings').hidden);
    assert.equal(await page.locator('#qoj-ccpc-panel').count(),1);
    await page.evaluate(()=>{score.team0[0][1]=-1; document.dispatchEvent(new Event('qoj-ccpc-request'));});
    await panel.locator('.ccpc-error').waitFor(); assert.equal(await page.locator('#standings').isVisible(),true);
    await page.evaluate(()=>{score.team0[0][1]=900; document.dispatchEvent(new Event('qoj-ccpc-request'));});
    await panel.locator('table').waitFor();
    fs.mkdirSync(path.resolve(__dirname,'../output'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../output/preview.png'),fullPage:false});
    assert.deepEqual(errors,[]);
    console.log('PASS: browser integration — simple toggle / current snapshot / MAIN-isolated bridge / anonymous order / links / pagination / automatic updates / freeze boundary / already frozen / VP clock priority / missing clock / recovery');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
