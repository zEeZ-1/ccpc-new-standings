// Real Firefox extension / Xray-boundary test via Mozilla's geckodriver, on localhost fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {spawn} = require('node:child_process');
const html = require('./extension-fixture.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  assert.ok(process.env.CCPC_FIREFOX_BIN, 'Set CCPC_FIREFOX_BIN to the Firefox executable');
  assert.ok(process.env.CCPC_GECKODRIVER, 'Set CCPC_GECKODRIVER to the geckodriver executable');
  fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
  // Only the disposable test copy adds localhost. Release packages keep the QOJ-only scope.
  const folder=fs.mkdtempSync(path.join(root,'tmp/firefox-extension-'));
  fs.cpSync(path.join(root,'output/firefox/qoj-ccpc'), folder, {recursive:true});
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  for (const script of manifest.content_scripts) script.matches.push('http://127.0.0.1/*');
  fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest));
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const driver=spawn(process.env.CCPC_GECKODRIVER,['--host','127.0.0.1','--port','0','--allow-system-access'],{windowsHide:true});
  let session, base;
  const call=async(method,url,body)=>{
    const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
    const result=await response.json();
    if(!response.ok) throw new Error(JSON.stringify(result));
    return result.value;
  };
  try {
    base=await new Promise((resolve,reject)=>{
      let log='';
      const timer=setTimeout(()=>reject(new Error('Driver startup timed out: '+log)),10000);
      driver.once('error',error=>{clearTimeout(timer);reject(error);});
      const read=data=>{log+=data.toString();const m=log.match(/Listening on (127\.0\.0\.1:\d+)/);if(m){clearTimeout(timer);resolve('http://'+m[1]);}};
      driver.stdout.on('data',read); driver.stderr.on('data',read);
    });
    const result=await call('POST','/session',{capabilities:{alwaysMatch:{browserName:'firefox','moz:firefoxOptions':{binary:process.env.CCPC_FIREFOX_BIN,args:['-headless'],prefs:{'browser.shell.checkDefaultBrowser':false,'app.update.auto':false}}}}});
    session=result.sessionId;
    const endpoint='/session/'+session;
    const js=script=>call('POST',endpoint+'/execute/sync',{script,args:[]});
    const wait=async script=>{for(let i=0;i<100;i++){if(await js('return '+script))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+script);};
    const addon=await call('POST',endpoint+'/moz/addon/install',{path:folder,temporary:true});
    assert.equal(addon,manifest.browser_specific_settings.gecko.id);
    await call('POST',endpoint+'/url',{url:`http://127.0.0.1:${server.address().port}/contest/123/standings`});
    await wait('!!document.querySelector("#qoj-ccpc-panel table")');
    assert.equal(await js('return document.getElementById("standings").hidden'),true);
    assert.deepEqual(await js('return Array.from(document.querySelectorAll("#qoj-ccpc-panel th"),n=>n.textContent)'),['排名','队伍','AC','总罚时','?','?']);
    await js('score.team1={0:[100,600,1235,0,100,0]};');
    await wait('document.querySelector("#qoj-ccpc-panel th.ccpc-revealed")?.textContent === "A\\n2 AC"');
    await js('document.querySelector("#qoj-ccpc-panel input[type=checkbox]").click();');
    assert.equal(await js('return document.getElementById("standings").hidden'),false);
    await call('POST',endpoint+'/refresh',{});
    await wait('document.querySelector(".ccpc-status")?.textContent === "原 QOJ 榜单"');
    assert.equal(await js('return document.querySelector("#qoj-ccpc-panel input[type=checkbox]").checked'),false);
    await js('document.querySelector("#qoj-ccpc-panel input[type=checkbox]").click();');
    await wait('!!document.querySelector("#qoj-ccpc-panel table")');
    await js('document.getElementById("vp-clock").textContent="01:00:00";');
    await wait('document.querySelector(".ccpc-status")?.textContent.includes("最后一小时")');
    assert.equal(await js('return document.getElementById("standings").hidden'),false);
    assert.deepEqual(await js('return Array.from(document.querySelectorAll("#standings th"),n=>n.textContent)'),['A','B']);
    assert.equal(await js('return document.querySelector("#qoj-ccpc-panel input[type=checkbox]").checked'),true);
    fs.writeFileSync(path.join(root,'output/preview-firefox.png'),Buffer.from(await call('GET',endpoint+'/screenshot'),'base64'));
    console.log(`PASS (Firefox ${result.capabilities.browserVersion}): native manifest install / MAIN-isolated string bridge across Xrays / live updates / real browser.storage / reload / freeze restore`);
  } finally {
    if(session) await call('DELETE','/session/'+session).catch(()=>{});
    driver.kill();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
