import { parseFragment } from 'parse5';
const inertTags = new Set(['strong','b','u','em','i','s','del','sub','sup','span','div','p','br','hr','table','thead','tbody','tfoot','tr','th','td','figure','figcaption','a','code','pre','blockquote','ul','ol','li','details','summary']);
const inertAttributes = new Set(['class','id','title','href','colspan','rowspan','scope','align','open','start','reversed','aria-label']);
export function validateUrl(value, image = false) {
  if (image) {
    if (!value.startsWith('/images/') || value.includes('\\') || /(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(value))) throw new Error('Article images must use local /images/ paths');
    return;
  }
  if (value.startsWith('//') || value.includes('\\') || /[\u0000-\u0020]/.test(value)) throw new Error('Unsafe article URL');
  const parsed = new URL(value, 'https://rielkim.github.io');
  if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsafe article URL scheme or credentials');
}
export default function remarkContentSafety() {
  return tree => {
    const definitions = new Map();
    const collect = node => { if (node.type === 'definition') definitions.set(node.identifier, node.url); node.children?.forEach(collect); };
    collect(tree);
    const inspectHtml = node => {
      if (node.tagName) {
        const tag = node.tagName.toLowerCase();
        if (!inertTags.has(tag)) throw new Error(`Unsupported raw HTML <${tag}> in article; use Markdown for images and headings`);
        for (const attr of node.attrs || []) {
          if (/^on/i.test(attr.name) || !inertAttributes.has(attr.name)) throw new Error(`Unsafe raw HTML attribute ${attr.name}`);
          if (attr.name === 'href') validateUrl(attr.value);
        }
      }
      node.childNodes?.forEach(inspectHtml);
    };
    const visit = node => {
      if (node.type === 'html') inspectHtml(parseFragment(node.value || ''));
      if (node.type === 'image') validateUrl(node.url, true);
      if (node.type === 'imageReference') {
        const source = definitions.get(node.identifier);
        if (source) validateUrl(source, true);
      }
      if (node.type === 'link' || node.type === 'definition') validateUrl(node.url);
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
