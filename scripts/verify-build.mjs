import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const required=['index.html','about/index.html','projects/index.html','writing/index.html','404.html','rss.xml','robots.txt','sitemap-index.xml','favicon.svg','social-card.png','search/index.html','search-index.json','projects/personal-blog/index.html'];
for(const file of required) await stat(path.join(root,file));
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(p));else if(entry.name.endsWith('.html'))files.push(p);}return files;}
let checked=0;
for(const file of await walk(root)){
 const html=await readFile(file,'utf8');
 if(!html.includes('lang="ko"'))throw new Error(`Missing language: ${file}`);
 if((html.match(/<h1(?:\s|>)/g)||[]).length!==1)throw new Error(`Expected one h1: ${file}`);
 for(const [,href] of html.matchAll(/(?:href|src)="(\/(?!\/)[^"#?]*)/g)){
  const local=path.join(root,decodeURI(href));
  try {const info=await stat(local);if(info.isDirectory())await stat(path.join(local,'index.html'));}catch{throw new Error(`Broken local link ${href} in ${file}`);}checked++;
 }
}
const index=JSON.parse(await readFile(path.join(root,'search-index.json'),'utf8'));
for(const post of index){if(!post.body||!post.url.startsWith('/writing/'))throw new Error('Invalid full-text index entry');await stat(path.join(root,post.url,'index.html'));}
console.log(`Build verified: ${required.length} required assets, ${checked} internal links.`);
