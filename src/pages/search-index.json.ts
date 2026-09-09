import { publishedPosts, plainText, postUrl, readingMinutes, formatDate } from '../lib/posts';
export async function GET() {
  const posts = await publishedPosts();
  return new Response(JSON.stringify(posts.map(post => ({
    title: post.data.title,
    description: post.data.description,
    body: plainText(post.body),
    tags: post.data.tags,
    date: formatDate(post.data.date),
    url: postUrl(post),
    readingMinutes: readingMinutes(post),
  }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
