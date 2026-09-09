# RielKIM · Uk.ai

AI와 LLM을 공부하며 기록하는 글 중심 Astro 블로그. 프로젝트와 소개·이력은 보조 페이지로 관리합니다. 별도 서버·DB·유료 CMS 없이 GitHub Pages로 배포합니다.

## 시작
```sh
npm ci
npm run dev
```
Node.js 24 LTS 권장. `npm run build`는 타입 검사, 정적 빌드, 내부 링크 검사를 실행합니다. `npm run preview`로 결과를 확인합니다.

## 내용 수정
- `src/data/profile.ts`: 이름, 자기소개, GitHub·LinkedIn, 공개 이메일, 경력.
- `src/data/projects.ts`: 공개 프로젝트 목록과 링크.
- `src/content/posts/*.md`: 기술 글. 예시의 `draft: true`를 내용 검토 후 `false`로 변경.
- `src/styles/global.css`: 디자인과 반응형 스타일.

경력 배열 예시 (실제 정보로 대체):
```ts
export const experience: Experience[] = [{
 period: '시작 연월 ~ 종료 연월', company: '회사명', role: '직무',
 description: '직접 수행한 역할과 공개 가능한 성과',
}];
```

글 frontmatter:
```yaml
title: '글 제목'
description: '목록과 검색 결과에 표시할 요약'
date: 2026-09-09
tags: ['Python', 'Notes']
draft: false
```
파일명은 영문 소문자와 하이픈 권장. `my-note.md` → `/writing/my-note/`.
글 본문은 표준 Markdown, 코드 블록, 이미지, 표, LaTeX 수식 지원. 목차·읽기 시간·관련 글은 자동 생성됩니다. 이미지는 `public/images/`에 두고 `/images/파일명`으로 참조.
미래 날짜와 초안은 빌드 시 제외됩니다. 예약 자동 발행은 없으므로 날짜가 된 후 다시 배포해야 합니다.

## 중요한 공개 범위
이 저장소는 **공개**입니다. `draft: true`는 웹사이트 노출만 막으며, GitHub 원본과 변경 이력은 여전히 공개됩니다. 회사 내부 문서, 비밀번호, 개인 민감 정보는 어떤 파일에도 넣지 마세요. 비공개 이력 원본은 별도 비공개 저장소나 로컬에서 관리하세요.

GitHub 공개 프로필·저장소와 소유자가 지정한 브런치·Velog 공개 글만 사용했습니다. 경력·성과는 추측하지 않았습니다. 2026-09-09에 원문 22편을 검증하여 중복 1편을 통합한 21편을 이관했습니다. 원문 날짜·출처·이미지를 보존했으며 과거 주장을 최신 사실로 재검증한 것은 아닙니다. 자세한 이관 기록은 [CONTENT-MIGRATION.md](docs/CONTENT-MIGRATION.md)를 참고하세요.

외부 이관 글은 `imported`, `sources`, `importedAt` 메타데이터를 사용하고 최초 원문을 canonical로 지정합니다. 새로 작성한 글은 이 필드 없이 게시하면 사이트 자체 URL이 canonical이 됩니다. 원문 링크는 허용한 작성자 계정으로 제한됩니다. HTML은 안전한 서식만 허용하며, 스크립트·이벤트 속성·외부 이미지·자격 증명이 포함된 URL은 빌드에서 차단합니다. 이전 Jekyll 글·광고·검색 인증 파일은 자동 이전하지 않았습니다. `/writing/` 목록은 홈으로 이동하고, 기존 상세 글 경로 형식은 유지합니다.

## 배포
1. 저장소 Settings → Pages → Source: **GitHub Actions**.
2. `main`에 push하면 빌드·검증 후 배포됩니다. PR은 빌드 검증만 실행합니다.
3. 기본 주소: https://rielkim.github.io/

개인 도메인 연결 시 `astro.config.mjs`의 `site`, `public/robots.txt`의 sitemap URL을 수정하고 GitHub Pages의 Custom domain을 설정하세요. 외부 도메인용 `public/CNAME`도 추가할 수 있습니다.

## 기능
- 최신 글 중심 홈, 10편 단위 페이지네이션, 소개·이력, 프로젝트, 검색, 글 상세, 404
- 반응형 레이아웃, 키보드 접근성, 시스템 테마·라이트/다크 토글
- 제목·요약·태그·본문·코드 식별자 전체 검색과 태그 필터
- 데스크톱/모바일 목차, 코드 복사·색상 강조, 수식, 관련 글, 로컬 이미지
- RSS, 사이트맵, canonical, Open Graph 카드
- 소개 페이지 브라우저 인쇄 / PDF 저장
- 추적·광고·외부 폰트 요청 없음

## 권리
콘텐츠 및 사이트 코드의 재사용 라이선스는 별도로 부여하지 않습니다. 사용한 오픈소스 의존성의 라이선스는 각 패키지를 따릅니다.

## 회귀 검증
`npm test`는 목차 단계·코드 식별자 검색·위험한 HTML/이미지 차단을 검사한 뒤, 임시 공개 글·초안·미래 글로 상세 경로, 페이지네이션, 본문 검색 인덱스, RSS, 최신순 정렬을 검증합니다. 테스트 파일을 삭제한 뒤 깨끗한 배포본을 다시 빌드합니다. GitHub Actions에서도 동일한 검사를 실행합니다.
