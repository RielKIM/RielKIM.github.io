// Synthetic posts are never committed. Always restore a clean production build.
import { writeFile, readFile, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const fixtures = [
 ['qa-published-old', '2020-01-01', false],
 ['qa-published-new', '2021-01-01', false],
 ['qa-hidden-draft', '2020-01-01', true],
 ['qa-hidden-future', '2099-01-01', false],
];
const created=[];
const build=()=>execFileSync('npm',['run','build'],{stdio:'inherit'});
try {
 for(const [id,date,draft] of fixtures){
  const file=`src/content/posts/${id}.md`;
  await writeFile(file,`---\ntitle: '${id}'\ndescription: 'Synthetic content regression fixture'\ndate: ${date}\ntags: ['QA']\ndraft: ${draft}\n---\n## Heading\n\nTest body.\n`,{flag:'wx'});
  created.push(file);
 }
 build();
 const writing=await readFile('dist/writing/index.html','utf8');
 const home=await readFile('dist/index.html','utf8');
 const rss=await readFile('dist/rss.xml','utf8');
 for(const [id,,draft] of fixtures){
  const hidden=draft||id.includes('future');
  if(hidden){
   await assert.rejects(access(`dist/writing/${id}/index.html`));
   for(const output of [writing,home,rss])assert.ok(!output.includes(id),`${id} leaked`);
  } else {
   await access(`dist/writing/${id}/index.html`);
   for(const output of [writing,rss])assert.ok(output.includes(id),`${id} missing`);
  }
 }
 assert.ok(writing.indexOf('qa-published-new')<writing.indexOf('qa-published-old'),'Not newest first');
 console.log('PASS: published routes, newest-first order, draft/future exclusions in routes/listings/RSS.');
} finally {
 for(const file of created) await rm(file);
 build();
}
