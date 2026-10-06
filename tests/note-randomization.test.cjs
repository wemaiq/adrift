const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function extract(name) {
  const start = html.search(new RegExp(`(?:async )?function ${name}\\(`));
  const open = html.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth) {
    if (html[end] === '{') depth++;
    if (html[end] === '}') depth--;
    end++;
  }
  return html.slice(start, end);
}
const context = vm.createContext({ Math, Map, Set, Number, String, Error, Promise, SUPABASE_URL: 'https://example.test', SUPABASE_ANON: 'test' });
for (const name of ['shuffleArray', 'createNotePool', 'fetchNoteSample']) vm.runInContext(extract(name), context);
const notes = ids => ids.map(id => ({ id, text: id }));
test('all notes appear once per cycle and boundaries do not repeat', () => {
  const pool = context.createNotePool();
  pool.update(notes(['a', 'b', 'c', 'd']));
  let previous;
  for (let cycle = 0; cycle < 100; cycle++) {
    const picks = Array.from({ length: 4 }, () => pool.pick().id);
    assert.equal(new Set(picks).size, 4);
    assert.notEqual(picks[0], previous);
    previous = picks.at(-1);
  }
});
test('refresh replaces stale data and preserves used IDs at the same size', () => {
  const pool = context.createNotePool();
  pool.update(notes(['a', 'b', 'c']));
  const first = pool.pick().id;
  const remaining = ['a', 'b', 'c'].filter(id => id !== first);
  pool.update([{ id: first, text: 'updated' }, { id: remaining[0], text: 'updated' }, { id: 'new', text: 'new' }]);
  const next = [pool.pick(), pool.pick()];
  assert.deepEqual(new Set(next.map(x => x.id)), new Set([remaining[0], 'new']));
  assert.equal(next.find(x => x.id === remaining[0]).text, 'updated');
});
test('empty, singleton, duplicate IDs, and shrinking pools are safe', () => {
  const pool = context.createNotePool();
  assert.equal(pool.pick(), null);
  pool.update(notes(['a', 'a']));
  assert.equal(pool.pick().id, 'a');
  assert.equal(pool.pick().id, 'a');
  pool.update([]);
  assert.equal(pool.pick(), null);
  pool.update(notes(['b']));
  assert.equal(pool.pick().id, 'b');
});
function mockRows(total, fail = false) {
  const requests = [];
  context.fetch = async url => {
    const params = new URL(url).searchParams;
    requests.push(params);
    if (params.get('select') === 'id') return { ok: true, headers: { get: () => `0-0/${total}` } };
    return { ok: !fail, status: 503, json: async () => Array.from({ length: Math.min(Number(params.get('limit')), total - Number(params.get('offset'))) }, (_, i) => ({ id: String(Number(params.get('offset')) + i + 1), doubt: 'note' })) };
  };
  return requests;
}
test('small collections load completely with no gaps', async () => {
  for (const total of [0, 1, 7, 79, 80, 400]) {
    mockRows(total);
    const rows = await context.fetchNoteSample('support=is.true&approved=is.false', 400);
    assert.equal(rows.length, total);
  }
});
test('large samples reach both collection edges without duplicates', async () => {
  const original = Math.random;
  try {
    for (const random of [0, 0.999999]) {
      Math.random = () => random;
      const requests = mockRows(1003);
      const rows = await context.fetchNoteSample('support=is.true&approved=is.false', 400);
      assert.equal(rows.length, 400);
      assert.equal(new Set(rows.map(row => row.id)).size, 400);
      assert(rows.some(row => row.id === (random === 0 ? '1' : '1003')));
      assert(requests.every(p => p.get('support') === 'is.true' && p.get('approved') === 'is.false'));
    }
  } finally { Math.random = original; }
});
test('failed sample requests reject rather than replacing the pool with partial data', async () => {
  mockRows(1003, true);
  await assert.rejects(context.fetchNoteSample('approved=is.true', 80), /503/);
});
test('inline scripts parse', () => {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/src=|application\/ld\+json/.test(match[1])) continue;
    new vm.Script(match[2]);
  }
});
