const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const chromium = JSON.parse(fs.readFileSync(path.join(root, 'qoj-ccpc/manifest.json'), 'utf8'));
const firefox = {...chromium, ...JSON.parse(fs.readFileSync(path.join(root, 'browsers/firefox.json'), 'utf8'))};
delete firefox.minimum_chrome_version;

test('both manifests inject the page bridge and isolated renderer, with only storage permission', () => {
  for (const manifest of [chromium, firefox]) {
    assert.deepEqual(manifest.permissions, ['storage']);
    assert.equal(manifest.manifest_version, 3);
    const [bridge, renderer] = manifest.content_scripts;
    assert.equal(bridge.world, 'MAIN');
    assert.equal(bridge.run_at, 'document_start');
    assert.deepEqual(bridge.js, ['bridge.js']);
    assert.deepEqual(renderer.js, ['engine.js', 'content.js']);
    assert.deepEqual(renderer.matches, bridge.matches);
    for (const script of manifest.content_scripts) {
      for (const file of [...script.js, ...(script.css || [])]) {
        assert.equal(fs.existsSync(path.join(root, 'qoj-ccpc', file)), true);
      }
    }
  }
  assert.equal(chromium.version, JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version);
});

test('Firefox has its own ID, supported minimum version and no data transmission declaration', () => {
  assert.equal('minimum_chrome_version' in firefox, false);
  assert.equal('browser_specific_settings' in chromium, false);
  assert.match(firefox.browser_specific_settings.gecko.id, /^[\w.-]+@[\w.-]+$/);
  assert.equal(firefox.browser_specific_settings.gecko.strict_min_version, '140.0');
  assert.deepEqual(firefox.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
});
