import rss from '@astrojs/rss';
import { profile } from '../data/profile';
import { publishedPosts } from '../lib/posts';
import type { APIContext } from 'astro';
export async function GET(context: APIContext){return rss({title:`${profile.name} · 글`,description:profile.description,site:context.site!,items:(await publishedPosts()).map(post=>({title:post.data.title,description:post.data.description,pubDate:post.data.date,link:`/writing/${post.id}/`})),customData:'<language>ko-kr</language>'});}
