import { getCollection } from 'astro:content';
export async function publishedPosts() {
 const now = new Date();
 return (await getCollection('posts', ({ data }) => !data.draft && data.date <= now)).sort((a,b) => b.data.date.getTime() - a.data.date.getTime());
}
export function formatDate(date: Date) { return new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Seoul' }).format(date); }
