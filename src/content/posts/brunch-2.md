---
title: "Multi Agent와 Agentic Workflow?"
description: "멀티 에이전트와 에이전틱 워크플로의 개념, 차이 및 상호보완적 설계 방식을 살펴본다."
date: "2025-06-25T05:00:05+09:00"
tags: ["AI 에이전트","멀티 에이전트","워크플로"]
draft: false
imported: true
sources: [{"name":"Brunch","url":"https://brunch.co.kr/@ukai/2"}]
subtitle: "이 두 가지가 다른거야...?"
---

## Prologue: 왜 지금 'AI 에이전트'에 다시 주목하는가?

대규모 언어 모델(LLM)의 등장은 단순한 '챗봇'의 시대를 넘어, 스스로 생각하고, 계획하며, 도구를 사용해 '실제로 일하는 AI', 즉 AI 에이전트의 시대를 열었습니다. 이제 AI는 단순히 질문에 답하는 것을 넘어, 복잡한 리서치를 수행하고, 코드를 디버깅하며, 마케팅 캠페인까지 자동화하는 주체적인 행위자로 진화하고 있습니다.

이러한 '일하는 AI'를 구현하는 방식에는 크게 두 가지 핵심 패러다임이 존재합니다: 바로 <strong>멀티 에이전트 시스템(Multi-Agent System, MAS)</strong>과 <strong>에이전틱 워크플로우(Agentic Workflow)</strong>입니다. 둘 다 여러 에이전트를 활용할 수 있지만, 그 철학과 구조, 작동 방식에는 근본적인 차이가 있습니다.

> 당신의 AI 프로젝트가 자율적인 전문가들의 '팀'을 필요로 하는지, 아니면 잘 짜인 '자동화 프로세스'를 필요로 하는지 이해하는 것은 성공의 핵심 열쇠가 될 것입니다.

## Part 1. 개념 바로 알기: 당신의 AI는 '팀'인가, '프로세스'인가?

두 개념을 가장 쉽게 이해하는 방법은 팀과 프로세스에 비유하는 것입니다.

### <strong>Multi-Agent System (MAS): 자율적인 전문가들로 구성된 '드림팀'</strong>

> 자율적인 지능형 에이전트(Agent)들의 집합으로, 이들이 서로 상호작용(협력, 경쟁, 협상)하며 개별 에이전트의 능력을 넘어서는 복잡한 문제를 해결하는 분산 시스템입니다.

핵심은 개별 에이전트의 지능이 아니라, 에이전트 간의 상호작용에서 비롯되는 예측 불가능한 창발적(Emergent) 행동에 있습니다. 각 에이전트는 독립적인 목표와 의사결정 능력을 가진 '전문가'와 같습니다.

예시: 여러 자율주행차가 서로의 위치와 속도를 실시간으로 통신하며 충돌 없이 교차로를 통과하는 교통 시스템. 각 차량이 독립적인 에이전트 역할을 합니다.

![스크린샷 2025-06-24 오후 11.38.32.png](/images/brunch/2/01.png)

출처 : https://towardsdatascience.com/agentic-ai-single-vs-multi-agent-systems/

### <strong>Agentic Workflow: 목표를 향해 달리는 잘 짜인 '자동화 컨베이어 벨트'</strong>

> 특정 목표를 달성하기 위해 설계된 구조화된 프로세스를 하나 또는 여러 AI 에이전트가 자율적으로 실행하는 자동화 방식입니다.

핵심은 명확한 목표 달성을 위한 구조화된 절차와 동적 실행에 있습니다. '작업 계획 수립 → 도구 사용 → 실행 → 결과 평가 → 피드백 및 수정'과 같은 명확한 단계를 거칩니다.

예시: '경쟁사 분석 보고서 작성'이라는 명령에, AI가 웹 검색으로 자료를 수집(1단계)하고, 수집된 자료를 분석/요약(2단계)한 후, 차트 생성 툴로 시각화(3단계)하여 최종 보고서를 완성하는 일련의 과정.

![스크린샷 2025-06-24 오후 11.40.18.png](/images/brunch/2/02.png)

출처 : https://weaviate.io/blog/what-are-agentic-workflows

## Part 2. 아키텍처 분석

두 시스템은 AI가 작동하는 방식, 즉 아키텍처에서 뚜렷한 차이를 보입니다.

### <strong>MAS의 탈중앙화 구조: 에이전트들은 어떻게 소통하고 협력하는가?</strong>

MAS는 중앙 관제탑 없이 에이전트들이 자율적으로 소통하는 탈중앙화(Decentralized) 구조를 가집니다.

<strong>구조</strong>

에이전트들이 동등한 위치에서 소통하는 수평적 네트워크 또는 역할에 따라 상하 관계를 갖는 계층적 구조 모두 가능합니다.

<strong>상호작용</strong>

에이전트 간 통신 언어(ACL, Agent Communication Language)나 모두가 접근 가능한 공유된 환경(Shared Environment)을 통해 정보를 교환하고 협상합니다.

<strong>제어</strong>

각 에이전트의 자율적인 결정들이 모여 전체 시스템의 행동이 결정되는 상향식(Bottom-up) 제어 방식입니다. 이로 인해 시스템 전체의 행동을 예측하기 어렵습니다.

<strong>LLM의 역할</strong>

각 개별 에이전트의 '두뇌' 역할을 하거나, 자연어 소통을 위한 보조 지능으로 활용됩니다.

### <strong>Agentic Workflow의 오케스트레이션: 누가 작업을 지시하고 흐름을 제어하는가?</strong>

Agentic Workflow는 전체 과정을 지휘하는 지휘자(오케스트레이터)가 있는 중앙 집중형(Centralized) 구조를 따릅니다.

<strong>구조</strong>

'마스터 에이전트' 또는 <strong>'오케스트레이터(Orchestrator)'</strong>가 전체 작업 흐름을 관리하고, 필요한 하위 작업을 다른 에이전트나 도구에 할당합니다.

<strong>상호작용</strong>

사전에 정의된 워크플로우에 따라 순차적, 병렬적으로 작업이 전달됩니다. 중간 결과를 검증하고 수정하는 <strong>피드백 루프(Feedback Loop)</strong>가 핵심적인 역할을 합니다.

<strong>제어</strong>

명확한 목표와 절차에 따라 움직이는 하향식(Top-down) 제어 방식입니다. 전체 프로세스가 예측 가능하고 관리하기 용이합니다.

<strong>LLM의 역할</strong>

워크플로우 전체를 조율하는 중심 제어 엔진 또는 오케스트레이터 역할을 수행하며, 작업 분해, 도구 선택, 결과 통합 등을 주도합니다.

### <strong>아키텍쳐 비교</strong>

![스크린샷 2025-06-24 오후 11.28.01.png](/images/brunch/2/03.png)

## Part 3. 핵심 차이점 비교

![스크린샷 2025-06-24 오후 11.29.01.png](/images/brunch/2/04.png)

## Part 4. 실제 적용 사례 (Use Cases)

### <strong>Multi Agent System</strong>

- 사례 : 자율주행, 분산형 에너지 그리드, 실시간 금융 트레이딩, 협력 로봇

- 이유 : 이 분야들은 예측 불가능한 변수가 많고, 여러 독립적인 주체(차량, 발전소, 로봇)가 실시간으로 정보를 교환하며 최적의 결정을 내려야 합니다. 일부 에이전트가 고장 나도 전체 시스템이 유지되는 <strong>강건성(Robustness)</strong>과 새로운 에이전트를 쉽게 추가할 수 있는 <strong>확장성(Scalability)</strong>이 큰 장점입니다.

- 단점 : 에이전트 간의 효과적인 통신 및 협력 규칙을 <strong>설계하기가 매우 복잡</strong>하고, <strong>창발적 행동으로 인해 결과를 예측하거나 제어하기 어렵습니다.</strong>

### <strong>Agentic Workflow</strong>

- 사례: 리서치 보고서 자동 생성, 마케팅 캠페인 자동화, 소프트웨어 개발 및 디버깅, 고객 지원 자동화

- 이유: 이 작업들은 <u><strong>'정보 수집 → 분석 → 초안 작성 → 검토' 와 같이 명확한 단계로 나눌 수 있습니다.</strong></u> 정의된 절차에 따라 작동하므로 결과가 안정적이고, LangChain, CrewAI 같은 프레임워크를 통해 상대적으로 쉽게 구현할 수 있는 효율성과 예측 가능성이 장점입니다.

- 단점: 사전에 정의되지 않은 <strong>예외 상황에 대처하는 유연성이 부족</strong>하며, <strong>오케스트레이터가 실패하면 전체 프로세스가 멈추는 중앙 집중화의 위험</strong>이 있습니다.

## Epilogue: AI 에이전트의 미래, 두 패러다임의 융합

현재는 MAS와 Agentic Workflow가 뚜렷이 구분되지만, 미래에는 두 패러다임이 융합된 하이브리드 모델이 주류가 될 것입니다.

> 예를 들어, 거대한 Agentic Workflow의 특정 단계(e.g., '시장 데이터 분석')를 여러 전문 에이전트로 구성된 소규모 MAS가 담당하는 구조를 상상해볼 수 있습니다.

이는 Agentic Workflow의 안정성과 MAS의 유연성 및 전문성을 결합한 강력한 솔루션이 될 것입니다.

AI 에이전트 시대를 맞이하는 개발자와 기획자는 더 이상 단일 모델의 성능에만 의존해서는 안 됩니다. 해결하고자 하는 문제의 본질을 파악하고, 그에 맞는 최적의 '시스템 아키텍처'를 설계하는 능력이 AI 시대의 새로운 경쟁력이 될 것입니다.

## 참고 문헌 (References)

[https://brunch.co.kr/@b2439ea8fc654b8/41](https://brunch.co.kr/@b2439ea8fc654b8/41)

[https://app.dalpha.so/blog/llm/](https://app.dalpha.so/blog/llm/)

[https://towardsdatascience.com/agentic-ai-single-vs-multi-agent-systems](https://towardsdatascience.com/agentic-ai-single-vs-multi-agent-systems)

[https://www.superannotate.com/blog/multi-agent-llms](https://www.superannotate.com/blog/multi-agent-llms)

[https://weaviate.io/blog/what-are-agentic-workflows](https://weaviate.io/blog/what-are-agentic-workflows)
