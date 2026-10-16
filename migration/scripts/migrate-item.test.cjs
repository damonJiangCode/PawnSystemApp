const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const script = fs.readFileSync(path.join(__dirname, 'migrate-item.cjs'), 'utf8').split('const main = async () => {')[0];
// Fictional mapping rules keep this regression test independent of private mappings.
const mapping = [
  '# Test category mappings',
  '```txt',
  'ring',
  'necklace',
  'bracelet',
  '-> JEWELRY / ring',
  'TEST PARENT -> OTHER / other',
  '```',
].join('\n');
function parse(content) {
  const context = { __dirname, process, console, require: name => name === 'fs' ? { ...fs, readFileSync: () => content } : require(name) };
  return vm.runInNewContext(script + '\nparseCategoryMappings();', context);
}
test('category rules load identically from Windows and Linux documents', () => {
  const linux = parse(mapping.replace(/\r\n/g, '\n'));
  const windows = parse(mapping.replace(/\r?\n/g, '\r\n'));
  assert.equal(windows.subcategoryRules.size, linux.subcategoryRules.size);
  assert.equal(windows.parentRules.size, linux.parentRules.size);
  assert.ok(windows.subcategoryRules.size > 2);
  assert.ok(windows.parentRules.size > 0);
  assert.equal(windows.subcategoryRules.get('ring').category, 'JEWELRY');
});
test('empty mapping document refuses an OTHER-only migration', () => {
  assert.throws(() => parse('# Missing rules'), /Category mapping rules were not loaded/);
});
