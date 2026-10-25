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
- [x] Inventory Brunch (12 inspected source posts); 11 imported posts and 70 local Brunch images remain after the owner's requested removal on 2026-10-25
- [x] Article-first homepage, compact navigation, pagination, About and Projects
- [x] Full-text/code search, TOC, copy code, original dates, related posts, math
- [x] Content audit PASS: all metadata/images; independent Brunch source samples /16, /10
- [x] Code review + fixes + re-review: all findings CLOSED
- [x] Browser QA: body-only and underscore queries; copy success; TOC anchor; dark theme
- [x] Framed 390px/360px home, article, search: no horizontal overflow, one H1 each
- [x] Automated tests: code-preserving search, heading levels, import safety, drafts/future, pagination, internal links
- [x] Deploy and verify live

Historical redesign build (2026-09-09, before the 2026-10-25 removal): 30 pages, 775 internal links, 0 type errors/warnings/hints. KaTeX error nodes: 0.
Import guard regressions include duplicate image definitions and context-sensitive table HTML.
No private source documents or inferred employment claims included.

## Blog deployment verification (historical, before the 2026-10-25 removal)
- Site code deployed from `2276d4d`; GitHub Actions run #3 succeeded in 55s.
- 32 public routes returned 200, including every one of the 21 articles.
- All 101 active image URLs returned 200 with image MIME types; 104 original assets retained.
- Production search index exactly matches the local verified build; RSS has 21 items.
- Browser production query `get_weather` returns the correct article; query/tag conjunction and empty state pass; Claude Code filter yields 3 posts.
- Unknown routes, draft fixture and temporary QA harness return 404.
- Production dependency audit: 0 vulnerabilities.
- Platform-only warning: legacy action runtimes are forced to Node 24 by GitHub; build/deploy both succeeded.
- Documentation-only final checkpoint does not rebuild the unchanged site.

## Content removal · 2026-10-25
- [x] Remove 10 imported posts from the owner's closed external account and their 34 images at the owner's request.
- [x] Keep all 11 Brunch posts and 70 Brunch images unchanged, including three unused republication assets.
- [x] Restrict source metadata and site links to Brunch; remove the closed account's profile references.
- [x] Reconcile the retained source manifest and migration documentation; imported-post counts exclude newly authored posts and draft templates.
