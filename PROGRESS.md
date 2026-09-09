# Build checkpoints
- [x] Astro scaffold and typed content model
- [x] Responsive pages and accessibility
- [x] Build and independent review (P2 fixed; regression tests PASS)
- [x] Recreate repository and deploy GitHub Pages

## Content policy
Only public GitHub profile/repository metadata is seeded. No private projects, employment claims, or fabricated achievements.

## QA evidence
- Type check: 0 errors, 0 warnings, 0 hints.
- Clean build: 5 pages, 60 internal links verified.
- Synthetic content test: publish, newest-first, draft and future exclusion PASS.
- Browser: theme, writing search, tag filter, empty results, Markdown code/table render PASS.
- 390px/360px framed mobile and 768px tablet: no horizontal overflow.
- npm production audit: 0 vulnerabilities.

## Deployment verification
- Existing repository backed up, deleted, and recreated as standalone public repository.
- GitHub Pages source: GitHub Actions, HTTPS enabled.
- Astro deployment succeeded; default Jekyll run canceled.
- https://rielkim.github.io/ and /about/, /projects/, /writing/ returned 200.
- RSS, sitemap and social image returned 200; unknown route returned custom 404.
- No synthetic QA posts in production.
- Independent re-review: prior P2 resolved, no remaining issue in scope.
- Career details and authored posts intentionally await owner-provided content.

## Blog-first redesign
- [ ] Inventory Brunch and Velog posts with source attribution
- [ ] Article-first homepage and compact navigation
- [ ] Full-text search, TOC, copy code, dates, related posts
- [ ] Source/content and browser QA; independent review
- [ ] Deploy and verify live
