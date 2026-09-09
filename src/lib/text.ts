import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { parseFragment } from 'parse5';
interface MarkdownNode { type: string; value?: string; children?: MarkdownNode[]; }
interface HtmlNode { nodeName: string; value?: string; childNodes?: HtmlNode[]; }
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const cache = new Map<string, string>();
function visibleHtmlText(html: string): string {
  const collect = (node: HtmlNode): string => node.nodeName === '#text'
    ? node.value || '' : (node.childNodes || []).map(collect).join(' ');
  return collect(parseFragment(html) as unknown as HtmlNode);
}
export function plainText(markdown = ''): string {
  const cached = cache.get(markdown);
  if (cached !== undefined) return cached;
  const tree = parser.parse(markdown) as unknown as MarkdownNode;
  const parts: string[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'html') parts.push(visibleHtmlText(node.value || ''));
    else if (['text', 'code', 'inlineCode', 'math', 'inlineMath'].includes(node.type)) parts.push(node.value || '');
    else node.children?.forEach(visit);
  };
  visit(tree);
  const value = parts.join(' ').replace(/\s+/g, ' ').trim();
  cache.set(markdown, value);
  return value;
}
