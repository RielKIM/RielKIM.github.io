// Map source heading levels to contiguous H2..H6, preserving hierarchy.
export default function remarkArticleHeadings() {
  return tree => {
    const headings = [];
    const visit = node => {
      if (node.type === 'heading') headings.push(node);
      node.children?.forEach(visit);
    };
    visit(tree);
    const levels = [...new Set(headings.map(node => node.depth))].sort((a, b) => a - b);
    for (const heading of headings) heading.depth = Math.min(6, levels.indexOf(heading.depth) + 2);
  };
}
