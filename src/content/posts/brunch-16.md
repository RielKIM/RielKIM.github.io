---
title: "The Prompting Playbook 실전 가이드"
description: "프롬프트 유지보수와 신규 에이전트 구축을 다룬 Margo van Laar 발표의 평가·도구·하네스 설계 원리를 정리한다."
date: "2026-07-25T14:07:54+09:00"
tags: ["프롬프팅","AI 에이전트","평가","Claude"]
draft: false
imported: true
sources: [{"name":"Brunch","url":"https://brunch.co.kr/@ukai/16"}]
subtitle: "Code with Claude · Margo van Laar 발표 정리"
---

<strong>출처</strong>: Code with Claude, Anthropic 세션

<strong>발표자</strong>: Margo van Laar (Applied AI Engineer, Anthropic London)

<strong>영상 길이</strong>: 약 33분 49초

<strong>주제</strong>: 계획(plan)·실행(act)·적응(adapt)하는 에이전틱 시스템에 프롬프팅 원리를 적용하는 방법

<strong>원본 링크</strong>: https://www.youtube.com/watch?v=G2B0YWuJUgI

---

## 0. 문서의 목적과 전제

이 글은 발표에서 다룬 두 개의 실무 시나리오를 중심으로, 프롬프트 유지보수(maintenance)와 신규 에이전트 구축(from scratch)에서의 기술적 결정 과정을 정리한 것이다. "이런 프롬프트를 이렇게 고쳤다"는 서술 뒤에 있는 <strong>원리</strong>, <strong>모델 거동의 메커니즘</strong>, <strong>엔지니어링 트레이드오프</strong>를 함께 짚는다.

전제되는 두 시나리오:

<strong>시나리오 A — 프로덕션 프롬프트 유지보수</strong>: 오랫동안 여러 사람이 손댄, 명확한 오너가 없는 프롬프트. 새 모델로 마이그레이션했더니 성능이 하락한 상황.

시나리오 B — 신규 에이전틱 유즈케이스 구축: 프롬프트, 모델, 하네스(harness)를 동시에 설계하며 zero-to-one으로 만드는 상황.

---

## 1. 프롬프팅의 위치와 평가(Evals)의 역할

### 1.1 왜 프롬프팅이 여전히 핵심 스킬인가

프롬프팅은 LLM 시대에 <strong>최초로 익혀야 했던 엔지니어링 스킬</strong>이자, 지금도 여전히 <strong>효과적 AI 시스템 구축에서 가장 중요한 스킬</strong> 중 하나다.

모델이 강력해지고 툴콜링·에이전트·컨텍스트 관리가 정교해져도, "모델에게 무엇을 시키는지 정확히 기술하는 능력" 자체는 대체되지 않는다.

### 1.2 평가(Evals) — 프롬프트 변경의 기준선

핵심 전제: <strong>평가 없이는 프롬프트 개선을 논할 수 없다.</strong> 모델을 마이그레이션했을 때 성능이 떨어지는 원인은 두 가지로 갈리며, 이 둘을 구분하려면 반드시 정량적 회귀(regression) 테스트가 필요하다.

<strong>① 새 모델은 여전히 유능하지만 거동이 다르다</strong>  
특징: 능력은 있으나 지시를 다르게 해석함  
대응: 프롬프트 튜닝으로 해결 가능

<strong>② 새 모델이 그 태스크에서 덜 유능하다</strong>  
특징: 어떤 프롬프트로도 한계를 넘지 못함  
대응: 프롬프트로는 해결 불가 → 모델·아키텍처 재고

Eval suite는 이 두 원인을 구별해 주는 <strong>회귀 테스트 계층</strong>의 역할을 한다.

### 1.3 최소 Eval 세트가 반드시 커버해야 할 3가지 유형

발표 예시는 5개 테스트 케이스지만, 실제 프로덕션에서는 훨씬 큰 세트가 필요하다. 규모와 무관하게 <strong>반드시 세 가지 유형을 대표적으로 포함</strong>해야 한다.

<strong>컨트롤 케이스(Control)</strong>: 모델이 확실히 처리한다고 알려진, 모호성 없는 케이스. 항상 통과해야 한다. 기본 능력이 손상되지 않았는지 감지하는 앵커.

<strong>엣지 케이스(Edge cases)</strong>: 과거에 모델이 실패했던 사례들. 프롬프트에 명시적 지시를 넣어 동일한 실패가 재발하지 않도록 방어.

능력 경계/거절 케이스(Capability boundary &amp; Refusal): 모델이 자기 능력 밖임을 인지하고 사람에게 에스컬레이션하거나 답변을 단호히 거절해야 하는 케이스.

---

## 2. 시나리오 A — 프로덕션 프롬프트 유지보수

### 2.1 예제 세팅: Meridian Mobile 고객지원 봇

가상의 통신사 "Meridian Mobile"의 고객지원 챗봇. 발표에서 사용한 5개 테스트 케이스:

<strong>① Control</strong> — "베이직 플랜의 데이터 한도는?" → 정책 문서에서 직접 값을 인용

<strong>② Edge · 계산</strong> — "월 중간에 30GB 플랜으로 업그레이드하면 다음 청구서 얼마?" → 프로레이션(proration) 계산 후 정확한 금액 반환

<strong>③ Edge · 정책</strong> — 정책이 다루는 핵심 질문에 대한 정확 답변 → 정책 문서 기반 정답

<strong>④ Escalation</strong> — 청구 오류 발생 시 → 진단 시도 없이 인간 상담사에게 에스컬레이션

<strong>⑤ 정보 은닉 방지</strong> — "무제한 플랜의 핫스팟 데이터는 얼마?"(레거시 플랜 고객) → 자신이 가진 고객 계정 정보를 기반으로 5GB라고 명확히 답변

### 2.2 초기 프롬프트의 병리학(Anti-patterns)

<strong>역할 정의 오류</strong>: 봇에게 "너는 인간이다"라고 지시 — 사실이 아님.

<strong>웹사이트 원문 잔재</strong>: hero image 참조, 쿠키 관련 문구 등 정책과 무관한 원문이 그대로 삽입됨.

<strong>한 덩어리 지시문(One-big-paragraph)</strong>: 추론 지침, 역할 지침, 크리티컬 지침, 정책, 톤이 문단 하나에 뒤엉킴.

<strong>레이어 구분 부재</strong>: 정책(policy)·가이드라인(guidelines)·톤(tone)·데이터(data)가 시각적·구조적으로 구분되지 않음.

### 2.3 First Pass — 불필요 정보 제거(General Hygiene)

<strong>핵심 원리</strong>: "사람이 프롬프트를 읽고 가이드라인과 정책과 데이터를 구분할 수 없다면, 모델도 대개 구분하지 못한다."

적용 기법:

<strong>XML 태그로 구조화</strong>: ⟨role⟩, ⟨guidelines⟩, ⟨policy⟩, ⟨tone\_of\_voice⟩ 등으로 섹션 분리.

<strong>잉여 정보 제거</strong>: 크롤된 웹 원문 잔재(hero image, cookies)를 삭제.

<strong>정확한 역할 진술</strong>: "너는 인간이다"와 같은 허위 진술을 실제 봇 역할로 교체.

<strong>결과</strong>: 어떤 실패 모드도 직접 겨냥하지 않았는데, 단순한 구조 정리만으로 <strong>한 케이스(prepaid)가 즉시 개선됨</strong>. 5번(hotspot)에서 소폭 회귀가 관찰되지만 이는 실행 간 자연 분산(variance)의 범위 안이며 이후 별도로 겨냥한다.

<strong>원칙</strong>: 이 제거 절차는 프롬프트가 복잡·상세해질수록 <strong>주기적으로 되돌아와 적용해야 하는</strong> 상시 절차다.

### 2.4 Output Contract — 출력 계약

프롬프트 말미에 ⟨response⟩ XML 태그로 감싸도록 출력 형식을 명시.

클라이언트/API 하네스 측에서는 <strong>stop sequence</strong>를 설정해 닫는 태그(⟨/response⟩)를 만나면 즉시 생성을 중단.

이는 특히 <strong>중첩 JSON</strong> 같은 복잡한 스키마에서 결정적으로 중요.

더 복잡한 스키마라면 <strong>Structured Outputs</strong>(제약 디코딩)를 쓰는 것이 프로그램적으로 더 견고.

<strong>핵심 통찰</strong>: 프롬프트가 항상 최선의 도구는 아니다. <strong>하네스 레벨에서 해결 가능한 문제(정지, 구조 강제)는 하네스에서 해결</strong>하고, 프롬프트에는 의미론적 지시만 남기는 것이 좋다.

### 2.5 실패 모드 1 — Hotspot(정보 은닉, Information Withholding)

<strong>증상</strong>: 무제한 플랜의 핫스팟 데이터를 묻는 고객에게, 봇은 "무제한 플랜은 4GB지만 당신은 레거시 플랜이니 계정 URL에서 직접 확인하세요"라며 <strong>자신이 갖고 있는 5GB라는 정확한 값을 회피</strong>한다.

<strong>원인 분석</strong>

초기 프롬프트: "우리는 최근 요금제를 개편했다. 정책 문서는 현재 플랜을 보여주며 grandfathered 고객은 요율이 다르다. <strong>절대 잘못된 플랜 정보를 주지 말고 URL로 안내하라.</strong>"

이 지시는 <strong>이전 세대 모델에서</strong> grandfathered 고객에게 잘못된 정보를 주던 문제를 막기 위한 <strong>디펜시브 패치</strong>였을 가능성이 크다.

하지만 최신 모델은 지시 따르기가 훨씬 정교해져 "잘못된 정보를 주지 말라"를 <strong>과적합(overfitting)</strong>으로 해석 — 아예 답을 안 주는 방향으로 최적화.

<strong>수정</strong>

"고객 정보에 각 고객의 정확한 할당량이 담겨 있으며, 이것이 진실의 원천(source of truth)"이라고 균형 잡힌 관점을 부여.

URL로의 회피 지시를 제거.

<strong>교훈</strong>

<strong>환각(hallucination)만이 문제가 아니다.</strong> 모델이 실제로 가진 정보를 <strong>은닉</strong>하는 반대 실패도 있다.

<strong>버전 관리를 활용하라.</strong> 디펜시브 패치를 추가할 때는 "왜 넣었는지"를 코멘트/커밋 메시지로 추적해야, 모델이 바뀌었을 때 그 패치가 해를 끼치는 시점을 인식하고 롤백할 수 있다.

### 2.6 실패 모드 2 — Proration Calculation(계산 신뢰성)

<strong>증상</strong>: "월 중간에 30GB 플랜으로 업그레이드하면 청구서가 얼마?"라는 질문에 봇은 산수를 웅얼거리며 추론(mental math)만 하고 <strong>구체적 금액을 산출하지 못한다.</strong>

<strong>원인 분석</strong>

원래 프롬프트: "<strong>절대 모호한 답을 주지 말고</strong>, <strong>크리티컬: 프로레이션 금액은 항상 정확히 계산하라.</strong>"

이런 명령은 <strong>능력을 추가해 주지 않는다.</strong> "잘 해라"라고 말한다고 산술 능력이 좋아지지 않는다. LLM의 mental math는 여전히 오류가 잦다.

<strong>수정 — 도구(Tool) 도입</strong>

<strong>프롬프트 측</strong>: "모든 계산은 calculate\_proration 도구를 사용하라"고 명시.

<strong>API 측</strong>: 도구 정의를 API 호출에 등록.

<strong>도구 스키마</strong>: 도구가 무엇을 하고 언제 쓰는지 설명.

<strong>도구 구현</strong>: 실제 프로레이션 로직을 결정론적 코드로 작성.

<strong>결과</strong>: 5개 케이스 모두 통과. 모델은 도구를 호출하고 결정론적 결과를 자연어로 감쌌다.

> 지시는 능력을 더해주지 않는다(Instructions don't add capability).

잘하라고 강하게 말해도 잘하는 능력이 생기지 않는다.

LLM에는 추론(reasoning)을 주고 실행(execution)은 도구에 위임하라. 이 분할이 신뢰성의 원천이다.

### 2.7 실패 모드 3 — Billing Escalation(한쪽만 강조된 트레이드오프)

<strong>증상</strong>: 청구 오류가 있는 고객에게 봇은 에스컬레이션 대신 <strong>자기가 원인을 진단</strong>하려 시도한다.

<strong>원인 분석</strong>

원래 프롬프트: "케어 스페셜리스트로의 에스컬레이션은 <strong>꼭 필요한 경우가 아니면 피하라.</strong> 약 $8의 비용이 들며 우리 팀의 신속 해결 지표에 반영된다."

<strong>한쪽 면만 강조한(unbalanced) 지시.</strong> 에스컬레이션의 비용만 알려주고, <strong>잘못 처리했을 때의 비용(환불, 고객 신뢰 훼손)</strong>은 알려주지 않았다.

더 똑똑한 모델일수록 이런 편향된 목표를 더 정교하게 최적화 → 에스컬레이션 회피 방향으로 과적합.

<strong>수정</strong>

"에스컬레이션은 $8의 비용이 든다. <strong>하지만 이걸 잘못 처리하면 환불 비용과 고객 신뢰 손실이 발생한다.</strong>" — 양쪽 비용을 모두 명시.

> 모델은 목표를 최적화한다. 트레이드오프의 양쪽을 반드시 진술하라.

모델 세대가 올라갈수록 스스로 트레이드오프를 판단하는 능력이 향상된다.

따라서 <strong>의사결정에 필요한 양쪽 정보 모두를 제공</strong>해야 케이스별로 판단할 수 있다.

한쪽만 강조된 지시는 이전 세대에선 "적당한 편향"이었지만 새 세대에선 <strong>극단적 편향</strong>이 될 수 있다.

### 2.8 시나리오 A 종합

유지보수 프롬프트의 표준 절차:

<strong>Evals 먼저</strong> — 회귀를 정량적으로 인식하는 계층 확보.

불필요 정보 제거 — 구조화, 잉여 제거, 정확한 역할 정의, 출력 계약, stop sequence.

<strong>실패 모드를 하나씩 격리</strong> — 여러 문제를 동시에 건드리지 말 것.

<strong>패치의 정체를 의심하라</strong> — 과거 모델을 위한 방어 지시가 지금 모델에선 과적합의 원인일 수 있다. 버전 관리로 흔적을 남겨라.

<strong>능력 vs 지시를 구분하라</strong> — 계산·검색·API 호출 등 결정론적 능력은 도구로 이양.

트레이드오프를 균형 있게 진술하라 — 한쪽만 부풀리지 말 것.

---

## 3. 시나리오 B — 신규 에이전트 Zero-to-One 구축

### 3.1 예제 세팅: 소매점 주간 스케줄 생성 에이전트

<strong>목표</strong>: 8명의 직원 가용성과 여러 제약 조건을 바탕으로 <strong>한 주 근무 스케줄</strong>을 자동 생성.

<strong>평가 방식의 전환</strong>: 시나리오 A에서는 LLM-as-Judge로 답변 품질을 채점했지만, 여기서는 규칙이 <strong>하드 컨스트레인트</strong>이므로 <strong>파이썬 함수로 결정론적 채점</strong>. 생성된 스케줄의 위반(violations) 개수를 정확히 계산 가능.

평가는 5개 트라이얼로 반복하여 각 트라이얼당 위반 수를 기록.

### 3.2 프롬프트·모델·하네스 3축

신규 에이전트에서는 프롬프트만이 아니라 <strong>모델 선택</strong>과 <strong>하네스(추론 흐름 구조)</strong>가 모두 설계 변수다. 발표는 이 3축을 순차 실험하며 하네스와 모델의 상대적 기여를 드러낸다.

### 3.3 반복 실험 로그 (정량적 힐 클라이밍)

<strong>Baseline</strong> — 미니멀 XML 구조 + JSON 출력 계약 / Sonnet 4.6 / 단일 프롬프트 → <strong>0/5 통과</strong>. 토큰을 많이 태우지만 자기검증 부재.

<strong>모델 스왑</strong> — 동일 프롬프트 / <strong>Opus 4.7</strong> / 단일 프롬프트 → <strong>0/5</strong>. 여전히 실패하지만 위반 수가 유의미하게 감소 — 추론 강한 모델의 방향성 확인.

<strong>Adaptive Thinking 추가</strong> — Opus 4.7 + <strong>Adaptive Thinking</strong> / 단일 프롬프트 → <strong>5/5 통과</strong>. 신뢰성 확보. 그러나 토큰 약 3배, 지연 약 3배(≈100초).

<strong>다시 소형 모델 + 더 나은 프롬프트</strong> — 추론 지침 + <strong>자기검증(Check your work)</strong> 추가 / Sonnet 4.6 / 단일 프롬프트 → <strong>2/5</strong>. 실패 원인은 규칙 위반이 아니라 max\_tokens 초과로 인한 미완성. max\_tokens를 키우면 토큰·지연이 더 커져 비효율.

<strong>에이전틱 (최종 채택)</strong> — 세 개의 짧은 프롬프트 / Sonnet 4.6 / <strong>Generate → Evaluate → Repair 루프</strong> → <strong>5/5 통과</strong>. Opus + Adaptive보다 더 적은 토큰, 더 낮은 지연.

### 3.4 Generate → Evaluate → Repair 루프의 구조

<strong>Generator 프롬프트</strong>: 스케줄 초안을 생성. 단일 태스크로 축소되어 프롬프트가 짧고 명료.

<strong>Evaluator 프롬프트</strong>: 생성된 스케줄을 규칙별로 검토해 <strong>위반 목록과 증거(evidence)를 자연어로 리포트</strong>. 파이썬 채점과 달리 <strong>LLM 기반 평가</strong>라는 점이 핵심 — <strong>소프트 제약</strong>을 다룰 수 있다.

<strong>Repair 프롬프트</strong>: 위반 리스트를 입력받아 <strong>국소적 수정(targeted fixes)</strong>을 적용.

### 3.5 왜 이 루프가 이겼는가

<strong>책임의 분할(Separation of concerns)</strong>: 대형 프롬프트 하나가 생성·자기검증·수정을 동시에 하려 하면 컨텍스트 오염과 자기검증 실패가 잦다. 각 단계가 하나의 목적만 가지면 지시 따르기가 훨씬 안정적.

<strong>작은 모델의 재활용</strong>: Sonnet 4.6으로도 각 서브태스크는 충분 → 총 비용·지연 감소.

<strong>런타임 소프트 제약</strong>: LLM 기반 evaluator이므로 파이썬 채점 함수를 수정하지 않고도 케이스별 소프트 제약을 프롬프트로 주입 가능. 예) "가능하면 Harry와 Sally를 같은 시프트에 두지 마라", "수요일에는 세 번째 시프트가 필요하다".

이런 소프트 제약은 케이스마다 다르고 코드로 정형화하기 어렵기 때문에 LLM 평가자가 이상적 담당자.

### 3.6 남는 두 가지 실전 후보

<strong>Opus 4.7 + Adaptive Thinking (단일 프롬프트)</strong>  
장점: 구조가 단순, 하네스 코드가 적음  
단점: 토큰·지연 비용 큼

<strong>Sonnet 4.6 + Generate/Evaluate/Repair 루프</strong>  
장점: 총 비용·지연 낮음, 런타임 소프트 제약 수용  
단점: 하네스가 복잡, 세 프롬프트 모두 유지 필요

발표자는 "이 루프는 더 최적화할 여지가 남아 있다"고 명시했다.

### 3.7 시나리오 B 종합 원리

<strong>간단하게 시작하고 정량적으로 등반하라(Hill-climb).</strong> 결정론적 채점 함수가 있으면 트레이드오프를 명확히 계량 가능.

<strong>모델·프롬프트·하네스는 모두 조정 가능한 노브.</strong> 해답이 늘 프롬프트에서 나오는 건 아니다. 때론 모델 스왑, 때론 Adaptive Thinking, 때론 하네스 재설계가 답.

<strong>큰 모델 + 큰 프롬프트 vs 작은 모델 + 좋은 하네스</strong>는 매번 재검토할 트레이드오프.

소프트 제약은 LLM Evaluator에 위임하라 — 코드로 표현하기 어려운 규칙을 프롬프트로 주입.

---

## 4. 두 시나리오를 관통하는 원리

### 4.1 프롬프팅 위생(Prompt Hygiene) 체크리스트

역할(role)이 명확하고 사실인가?

정책·가이드라인·데이터·톤이 XML 태그 등으로 시각·구조적으로 분리되어 있는가?

웹사이트에서 붙여넣은 잉여 텍스트(hero image, cookies 등)가 남아 있지는 않은가?

출력 계약(output contract)이 정의되어 있고, 필요 시 stop sequence 또는 structured outputs가 하네스에 반영되어 있는가?

방어적 패치(defensive patches)에 "왜 추가되었는지" 이유가 기록되어 있는가?

트레이드오프가 양방향으로 진술되어 있는가?

결정론적으로 처리해야 할 능력(계산, 조회, 외부 API)은 도구(tool)로 이양되어 있는가?

### 4.2 실패 모드 분류 3종

<strong>정보 은닉(Withholding)</strong>  
발현: 이미 가진 정보를 안 줌  
원인: 낡은 방어 패치의 과적합  
처방: 균형 잡힌 진술 + 데이터가 진실의 원천임을 명시

<strong>계산 실패(Mental math failure)</strong>  
발현: 모호한 서술만 반환  
원인: 지시가 능력을 대체할 수 있다는 착각  
처방: 도구화(Tooling)

<strong>에스컬레이션 회피</strong>  
발현: 자체 진단 시도  
원인: 편향된 지시(비용 한쪽만 강조)  
처방: 트레이드오프 양쪽 명시

### 4.3 신규 에이전트 설계 결정 흐름

결정론적 채점이 가능한가? → 파이썬 함수 채점(하드 컨스트레인트)

소프트 제약이 있는가? → LLM Evaluator 기반 하네스 고려

단일 프롬프트로 커버 가능한가? → Adaptive Thinking을 붙여 시도

비용·지연이 부담되는가? → Generate/Evaluate/Repair 루프로 태스크 분해

매번: Evals로 힐 클라이밍, 한 번에 한 축(프롬프트/모델/하네스)씩 변경

---

## 5. 자주 잊히는 핵심 원칙

발표가 반복해 강조했지만 실무에서 자주 잊히는 원칙들이다.

<strong>프롬프트를 읽어서 정책·가이드라인·데이터를 구분할 수 없다면, 모델도 대개 구분하지 못한다.</strong>

<strong>지시는 능력을 더해주지 않는다.</strong> 잘하라고 말하는 것과 잘하게 만드는 것은 다르다.

<strong>모델은 목표를 최적화한다.</strong> 편향된 목표를 주면 능력이 커질수록 편향된 결과가 강해진다.

<strong>환각의 반대편에는 정보 은닉이 있다.</strong> 방어 패치의 사이드이펙트를 감시하라.

<strong>프롬프트만이 도구가 아니다.</strong> 하네스(stop sequence, structured outputs, 툴콜, 멀티 프롬프트 파이프라인)도 동등한 설계 변수다.

디펜시브 패치에는 코멘트와 버전 관리를 남겨라. 새 모델로 마이그레이션할 때 안전하게 롤백하려면 왜 그 지시가 있는지 알 수 있어야 한다.

---

## 6. 부록 — 발표에서 등장한 아티팩트

<strong>데모 앱</strong>: 발표자가 직접 만든 "vibe-coded" 웹앱 — 5개 테스트 케이스를 클릭 한 번으로 실행/재실행하고 결과를 세부 검사.

<strong>테스트 케이스 5종</strong>: control(basic plan 데이터 한도) / proration / policy 정답성 / billing escalation / hotspot 정보 제공.

<strong>프롬프트 개편 diff</strong>: 원본 → 구조화(XML) → 출력 계약 추가 → hotspot 균형화 → 계산 도구화 → 에스컬레이션 균형화.

<strong>모델</strong>: Sonnet 4.6, Opus 4.7 (Adaptive Thinking 포함).

<strong>하네스 요소</strong>: stop sequence, structured outputs, 툴 스키마 등록, Generator/Evaluator/Repair 다중 프롬프트 구성.

이 글은 원 영상의 서술 순서를 따라 기술적 결정과 그 근거를 정리한 것이다. 원본 영상: https://www.youtube.com/watch?v=G2B0YWuJUgI

[원문에 포함된 동영상](https://www.youtube.com/embed/G2B0YWuJUgI)
