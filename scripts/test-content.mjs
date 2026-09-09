// Synthetic posts are never committed. Always restore a clean production build.
import { writeFile, readFile, readdir, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const fixtures = [
  ['qa-published-old', '2020-01-01', false],
  ['qa-published-new', '2021-01-01', false],
  ['qa-hidden-draft', '2020-01-01', true],
  ['qa-hidden-future', '2099-01-01', false],
];
const created = [];
const build = () => execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
async function listings() {
  let html = await readFile('dist/index.html', 'utf8');
  try {
    const pages = (await readdir('dist/page')).sort((a, b) => Number(a) - Number(b));
    for (const page of pages) html += await readFile(`dist/page/${page}/index.html`, 'utf8');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return html;
}
try {
  for (const [id, date, draft] of fixtures) {
    const file = `src/content/posts/${id}.md`;
    await writeFile(file, `---\ntitle: '${id}'\ndescription: 'Synthetic content regression fixture'\ndate: ${date}\ntags: ['QA']\ndraft: ${draft}\n---\n# Body heading\n\nBodyOnlyNeedle123.\n`, { flag: 'wx' });
    created.push(file);
  }
  build();
  const listing = await listings();
  const rss = await readFile('dist/rss.xml', 'utf8');
  const search = JSON.parse(await readFile('dist/search-index.json', 'utf8'));
  for (const [id, , draft] of fixtures) {
    const hidden = draft || id.includes('future');
    if (hidden) {
      await assert.rejects(access(`dist/writing/${id}/index.html`));
      for (const output of [listing, rss, JSON.stringify(search)]) assert.ok(!output.includes(id), `${id} leaked`);
    } else {
      await access(`dist/writing/${id}/index.html`);
      for (const output of [listing, rss]) assert.ok(output.includes(id), `${id} missing`);
      const indexed = search.find(post => post.url === `/writing/${id}/`);
      assert.ok(indexed?.body.includes('BodyOnlyNeedle123'), 'Full body not indexed');
    }
  }
  assert.ok(listing.indexOf('qa-published-new') < listing.indexOf('qa-published-old'), 'Not newest first');
  const redirect = await readFile('dist/writing/index.html', 'utf8');
  assert.ok(redirect.includes('http-equiv="refresh"') && redirect.includes('noindex'), 'Legacy writing route not redirected');
  console.log('PASS: published routes, paginated order, full-body index, draft/future exclusions, legacy redirect.');
} finally {
  for (const file of created) await rm(file);
  build();
}
