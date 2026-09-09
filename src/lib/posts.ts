import { getCollection, type CollectionEntry } from 'astro:content';
export type Post = CollectionEntry<'posts'>;
export const POSTS_PER_PAGE = 10;

export async function publishedPosts(): Promise<Post[]> {
  const now = new Date();
  return (await getCollection('posts', ({ data }) => !data.draft && data.date <= now))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul',
  }).format(date);
}
export function plainText(markdown = ''): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(?:^|\n)\s{0,3}#{1,6}\s+/g, ' ')
    .replace(/[`*_~>|]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
export function readingMinutes(post: Post): number {
  // Approximation: Korean characters and non-Korean words use separate rates.
  const text = plainText(post.body);
  const korean = (text.match(/[가-힣]/g) || []).length;
  const words = text.replace(/[가-힣]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(korean / 500 + words / 220));
}
export const postUrl = (post: Post): string => `/writing/${post.id}/`;
export function tagCounts(posts: Post[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const post of posts) for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
export function relatedPosts(post: Post, all: Post[]): Post[] {
  return all.filter(other => other.id !== post.id)
    .map(other => ({ post: other, score: other.data.tags.filter(tag => post.data.tags.includes(tag)).length }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.date.getTime() - a.post.data.date.getTime())
    .slice(0, 3).map(item => item.post);
}
