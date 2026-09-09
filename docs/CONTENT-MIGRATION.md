# Content migration · 2026-09-09

- Brunch @ukai: 12 published source posts inspected.
- Velog @ukng1024: 10 published source posts inspected.
- Site: 21 unique posts (11 Brunch originals + 10 Velog originals).
- Duplicate: LLM agent planning. Velog original (2025-06-19) retained for native Markdown tables, Brunch republication (2025-06-24, /@ukai/1) linked as secondary source.
- Original bodies, citations and media preserved. Markdown heading levels normalized at render time; source title whitespace trimmed and discovery tags normalized.
- Exact original publication timestamps retained. No inferred editorial update dates.
- Original claims are archival, not newly fact-checked; each imported post carries a notice.
- Search/RSS exclude drafts and future dates. Imported posts use their primary original source as canonical; new site-native posts use local canonical URLs.
- Profile claims reflect writing topics, not inferred employment or project achievements.
- 104 source article images fetched and validated; duplicate republication images are retained as original source assets.

## Source accounts
- https://brunch.co.kr/@ukai
- https://velog.io/@ukng1024/posts

## Verification
- Full metadata/source manifest: `content-sources.json`.
- Independent source audit: PASS; all 21 metadata records and 104 images, plus direct source comparisons for Brunch /16, /10 and Velog NeMo.
- 101 active local image references; three duplicate Brunch table assets retained but unused.
- Source Markdown is preserved; heading hierarchy and code/math/image presentation are normalized at build time.
- Brunch embedded video is represented by its original source link, avoiding third-party tracking embeds.
- Search text is parsed from Markdown, preserving code identifiers and math rather than stripping punctuation.
- Import safety checks reject active HTML, unsafe URLs, nonlocal images and duplicate reference definitions.
