# Initial site checkpoints (historical)
- [x] Astro scaffold and typed content model
- [x] Responsive pages and accessibility
- [x] Build and independent review (P2 fixed; regression tests PASS)
- [x] Recreate repository and deploy GitHub Pages

## Content policy
Only public GitHub profile/repository metadata is seeded. No private projects, employment claims, or fabricated achievements.

## Initial QA evidence
- Type check: 0 errors, 0 warnings, 0 hints.
- Clean build: 5 pages, 60 internal links verified.
- Synthetic content test: publish, newest-first, draft and future exclusion PASS.
- Browser: theme, writing search, tag filter, empty results, Markdown code/table render PASS.
- 390px/360px framed mobile and 768px tablet: no horizontal overflow.
- npm production audit: 0 vulnerabilities.

## Initial deployment verification
- Existing repository backed up, deleted, and recreated as standalone public repository.
- GitHub Pages source: GitHub Actions, HTTPS enabled.
- Astro deployment succeeded; default Jekyll run canceled.
- https://rielkim.github.io/ and /about/, /projects/, /writing/ returned 200.
- RSS, sitemap and social image returned 200; unknown route returned custom 404.
- No synthetic QA posts in production.
- Independent re-review: prior P2 resolved, no remaining issue in scope.
- Career details and authored posts intentionally await owner-provided content.

## Blog-first redesign · 2026-09-09
- [x] Inventory Brunch (12) and Velog (10); 21 unique posts and 104 local images
- [x] Article-first homepage, compact navigation, pagination, About and Projects
- [x] Full-text/code search, TOC, copy code, original dates, related posts, math
- [x] Content audit PASS: all metadata/images; independent source samples /16, /10, NeMo
- [x] Code review + fixes + re-review: all findings CLOSED
- [x] Browser QA: body-only and underscore queries; copy success; TOC anchor; dark theme
- [x] Framed 390px/360px home, article, search: no horizontal overflow, one H1 each
- [x] Automated tests: code-preserving search, heading levels, import safety, drafts/future, pagination, internal links
- [ ] Deploy and verify live

Final build: 30 pages, 775 internal links, 0 type errors/warnings/hints. KaTeX error nodes: 0.
Import guard regressions include duplicate image definitions and context-sensitive table HTML.
No private source documents or inferred employment claims included.
