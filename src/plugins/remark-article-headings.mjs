// Keep a single page h1 while preserving imported articles' heading hierarchy.
export default function remarkArticleHeadings() {
  return tree => {
    const headings = [];
    const visit = node => {
      if (node.type === 'heading') headings.push(node);
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
    if (headings.some(node => node.depth === 1)) {
      headings.forEach(node => { node.depth = Math.min(6, node.depth + 1); });
    }
  };
}
