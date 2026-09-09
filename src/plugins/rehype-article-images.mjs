import path from 'node:path';
import sharp from 'sharp';
const metadataCache = new Map();
export default function rehypeArticleImages() {
  return async (tree, file) => {
    const images = [];
    const visit = node => {
      if (node.type === 'element' && node.tagName === 'img') images.push(node);
      node.children?.forEach(visit);
    };
    visit(tree);
    for (const [index, image] of images.entries()) {
      const src = String(image.properties?.src || '');
      if (!src.startsWith('/images/')) continue;
      const absolute = path.resolve('public', '.' + decodeURI(src));
      if (!absolute.startsWith(path.resolve('public/images') + path.sep)) throw new Error('Image path outside public/images');
      if (!metadataCache.has(absolute)) metadataCache.set(absolute, sharp(absolute).metadata());
      const meta = await metadataCache.get(absolute);
      image.properties.width = meta.width;
      image.properties.height = meta.height;
      image.properties.loading = 'lazy';
      image.properties.decoding = 'async';
      const alt = String(image.properties.alt || '');
      if (!alt.trim() || /\.(png|jpe?g|webp)$/i.test(alt)) {
        const title = String(file.data.astro?.frontmatter?.title || '본문').trim();
        image.properties.alt = `${title} 원문 그림 ${index + 1}`;
      }
    }
  };
}
