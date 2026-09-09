# RielKIM · Personal Archive

Astro 기반 개인 이력, 프로젝트, 기술 블로그. 별도 서버·DB·유료 CMS 없이 GitHub Pages로 배포합니다.

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
글 본문은 표준 Markdown, 코드 블록, 이미지, 표 지원. 이미지는 `public/images/`에 두고 `/images/파일명`으로 참조.
미래 날짜와 초안은 빌드 시 제외됩니다. 예약 자동 발행은 없으므로 날짜가 된 후 다시 배포해야 합니다.

## 중요한 공개 범위
이 저장소는 **공개**입니다. `draft: true`는 웹사이트 노출만 막으며, GitHub 원본과 변경 이력은 여전히 공개됩니다. 회사 내부 문서, 비밀번호, 개인 민감 정보는 어떤 파일에도 넣지 마세요. 비공개 이력 원본은 별도 비공개 저장소나 로컬에서 관리하세요.

초기 데이터는 공개 GitHub 프로필과 공개 저장소 설명만 사용했습니다. 경력·성과는 추측하지 않았습니다. 이전 Jekyll 글·검색 인증 파일·광고 스크립트는 자동 이전하지 않았습니다. 이전 글 URL은 새 404 페이지로 연결됩니다.

## 배포
1. 저장소 Settings → Pages → Source: **GitHub Actions**.
2. `main`에 push하면 빌드·검증 후 배포됩니다. PR은 빌드 검증만 실행합니다.
3. 기본 주소: https://rielkim.github.io/

개인 도메인 연결 시 `astro.config.mjs`의 `site`, `public/robots.txt`의 sitemap URL을 수정하고 GitHub Pages의 Custom domain을 설정하세요. 외부 도메인용 `public/CNAME`도 추가할 수 있습니다.

## 기능
- 홈 / 소개·이력 / 프로젝트 / 글 / 글 상세 / 404
- 반응형 레이아웃, 키보드 접근성, 시스템 테마·라이트/다크 토글
- 글 제목·요약·태그 검색과 태그 필터 (발행 글이 있을 때)
- RSS, 사이트맵, canonical, Open Graph 카드
- 소개 페이지 브라우저 인쇄 / PDF 저장
- 추적·광고·외부 폰트 요청 없음

## 권리
콘텐츠 및 사이트 코드의 재사용 라이선스는 별도로 부여하지 않습니다. 사용한 오픈소스 의존성의 라이선스는 각 패키지를 따릅니다.

## 회귀 검증
`npm test`는 임시 공개 글·초안·미래 글로 상세 경로, 목록, RSS, 최신순 정렬을 검사하고, 테스트 파일을 삭제한 뒤 깨끗한 배포본을 다시 빌드합니다.
