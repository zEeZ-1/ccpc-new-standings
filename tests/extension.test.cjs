// Load the real unpacked extension in a disposable Chrome / Edge profile, with real storage.
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.CCPC_PLAYWRIGHT_PATH || 'playwright');
const html = require('./extension-fixture.cjs');
const channel = process.argv[2] || 'chrome';
if (!['chrome', 'msedge'].includes(channel)) throw new Error('Browser must be chrome or msedge');
async function main() {
  const context = await chromium.launchPersistentContext('', {
    channel, headless:true, args:['--enable-unsafe-extension-debugging'],
    ignoreDefaultArgs:['--disable-extensions']
  });
  try {
    const session = await context.browser().newBrowserCDPSession();
    const {id} = await session.send('Extensions.loadUnpacked',{path:path.resolve(__dirname,'../qoj-ccpc')});
    assert.ok(id);
    await context.route('**/*', route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));
    const page = await context.newPage();
    const storageSession = await context.newCDPSession(page);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('https://qoj.ac/contest/123/standings');
    const panel = page.locator('#qoj-ccpc-panel');
    await panel.locator('table').waitFor();
    assert.equal(await page.locator('#standings').isHidden(),true);
    assert.deepEqual(await panel.locator('thead th').allTextContents(),['排名','队伍','AC','总罚时','?','?']);
    // Actual MAIN-to-isolated bridge, with an unprompted change to page globals.
    await page.evaluate(()=>{score.team1={0:[100,600,1235,0,100,0]};});
    await panel.locator('thead .ccpc-revealed').waitFor();
    assert.equal(await panel.locator('thead .ccpc-revealed').innerText(),'A\n2 AC');
    await panel.getByRole('checkbox').uncheck();
    assert.equal(await page.locator('#standings').isVisible(),true);
    // Verify browser storage, including reload, rather than a mock storage object.
    const key='qoj-ccpc:qoj.ac:123';
    for (let i=0;i<50;i++) {
      const result=await storageSession.send('Extensions.getStorageItems',{id,storageArea:'local',keys:[key]});
      if (result.data?.[key]?.enabled===false) break;
      if (i===49) throw new Error('Disabled setting was not persisted');
      await page.waitForTimeout(100);
    }
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#qoj-ccpc-panel .ccpc-status')?.textContent==='原 QOJ 榜单');
    assert.equal(await panel.getByRole('checkbox').isChecked(),false);
    await panel.getByRole('checkbox').check();
    await panel.locator('table').waitFor();
    await page.locator('#vp-clock').evaluate(node=>{node.textContent='01:00:00';});
    await page.waitForFunction(()=>document.querySelector('#qoj-ccpc-panel .ccpc-status')?.textContent.includes('最后一小时'));
    assert.equal(await page.locator('#standings').isVisible(),true);
    assert.deepEqual(await page.locator('#standings th').allTextContents(),['A','B']);
    assert.equal(await panel.getByRole('checkbox').isChecked(),true);
    assert.deepEqual(errors,[]);
    console.log(`PASS (${channel} ${context.browser().version()}): native extension injection / bridge / live updates / real storage across reload / freeze restore`);
  } finally {await context.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
