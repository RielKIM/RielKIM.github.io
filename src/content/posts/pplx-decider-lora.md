---
title: "pplx-decider-v1.1-27b LoRA 튜닝 경험기"
description: "최근 나온 Decision 모델 pplx-decider-v1.1-27b를 익숙한 LoRA로 제 데이터에 맞춰 학습해 성능을 올린 경험과, 그 방식을 정리한 공개 저장소 pplx-decider-lora를 단계별로 소개합니다."
date: "2026-10-25T00:15:00+09:00"
tags: ["LoRA", "파인튜닝", "Decision 모델", "LLM"]
draft: false
---

**“새로 나온 Decision 모델도, 익숙한 LoRA로 학습하면 성능이 오를까?”**

Decision 모델은 2026년 9월에 시작됐다고 보는, 꽤 새로운 종류의 모델입니다.[9, TL;DR] 저는 Perplexity가 공개한 Decision 모델 `pplx-decider-v1.1-27b`를 실제로 써 보고 싶었고, 제 데이터에 맞춰 학습해 보고 싶었습니다. 그런데 모델이 새롭다 보니 어떻게 학습하면 좋을지 참고할 사례를 찾기 어려웠어요.

그래서 언어모델에서 이미 널리 쓰는 LoRA(Low-Rank Adaptation)를 그대로 가져와 봤습니다. 백본은 고정하고 작은 어댑터만 학습하는 익숙한 방식이죠. 결과는 좋았습니다. 제 데이터에서 학습 전 기본 모델보다 성능이 좋아졌어요. 덤으로 27B 모델인데도 GPU 한 장으로 학습할 수 있었고, 학습 중 GPU 메모리는 최대 약 64.75GB였습니다.

그 방식을 누구나 쓸 수 있게 정리해서 공개한 게 [`pplx-decider-lora`](https://github.com/RielKIM/pplx-decider-lora) 저장소입니다.[2] 업스트림은 27B 백본 전체를 학습하는 코드만 공개했는데, 저는 여기에 백본을 고정하고 LoRA 어댑터만 학습하는 계층을 더했습니다. 이 글에서는 저장소를 단계별로 따라가면서, 각 기능이 무엇을 하는지와 제가 그 방식으로 학습했을 때 실제로 어땠는지를 같이 적어 보려고 합니다.

먼저 솔직하게 밝혀 둘 게 있습니다. 제 학습은 같은 방식의 비공개 구현으로 했고, 공개 저장소는 그 구현을 일반화해서 새로 정리한 코드입니다. 공개 코드는 CPU 테스트까지는 통과했지만, 아직 실제 27B 체크포인트로 GPU에서 돌려 보지는 못했습니다. 학습 데이터의 내용과 규모, 정확도 숫자, 실제로 쓴 하이퍼파라미터 값은 비공개 프로젝트의 정보라 이 글에서는 다루지 않습니다.

PyTorch로 모델을 학습해 본 적이 있다면 충분히 따라오실 수 있습니다. 처음 나오는 약어와 개념은 본문에서 풀어 쓰겠습니다.

## Decision 모델은 무엇일까

Decision 모델은 문장을 생성하지 않습니다. 대신 **정해진 질문에 대한 답마다 확률을 매기는 모델**이죠.[9, §What is a decision model?] 언어모델은 토큰을 하나씩 생성하고, 우리는 그 글을 다시 해석해야 합니다. Decision 모델은 입력을 한 번 읽고, 허용된 답 전체를 작은 출력층으로 한꺼번에 채점합니다.[9, §How does a decision model work under the hood?]

pplx-decider가 다루는 질문 형식은 세 가지입니다.[2, `types.py`]

- **Choice**: 여러 선택지 중 무엇이 맞는지 고르고, 선택지마다 확률을 돌려줍니다.
- **Noul**: 어떤 진술이 참인지에 대해 0~1 사이 확률 하나를 돌려줍니다.
- **Score**: 순서가 있는 여러 단계 중 어디에 해당하는지 묻습니다. 단계별 확률과 함께, 그 확률로 계산한 기댓값 점수를 돌려줍니다.[2, `model.py`]

eesel의 Decision 모델 설명도 같은 세 형식을 꼽습니다.[9, §What is a decision model?] 다만 제 공개 저장소의 LoRA 학습 데이터는 Choice 형식만 받습니다.[3, §Data]

이 범주는 2026년 9월 15일 TypeSafe가 Jev를 공개하면서 시작됐다고 보는 편입니다.[9, TL;DR] 그 뒤로 Jev를 공개 모델로 재현하려는 시도가 이어졌고, 커뮤니티가 관리하는 Jev Decision Index가 이 모델들을 비교하고 있습니다. 이 지표의 순위는 같은 기술의 비공개 시험 60%와 새 분야의 비공개 과제 40%를 합친 Full 점수로 매깁니다. 공개 벤치마크 점수(Public)도 모델마다 옆에 보여 주지만, 순위에는 반영하지 않습니다.[10, §Decision Index]

## pplx-decider의 계보

pplx-decider는 생성용 언어모델 Qwen3.8-27B를 Decision 모델로 다시 학습한 계열입니다. 공개된 버전을 순서대로 놓아 보면 이렇습니다.

| 버전 | 바탕 | 주요 변화 | Decision Index (모델 카드 기준) |
|---|---|---|---|
| Qwen3.8-27B | — | 생성용 언어모델. pplx-decider의 백본 | — |
| pplx-decider-v1-27b | Qwen3.8-27B | 사람이 라벨을 붙인 공개 데이터셋을 Choice·Noul 형식으로 바꿔 학습[7, §Acknowledgment] | 56.4[1, §Evaluation] |
| **pplx-decider-v1.1-27b** (이 글) | Qwen3.8-27B | 같은 백본에서 인과 마스크를 걷어 내고, tasksource 등 데이터를 크게 늘림[1, 도입부] | 61.56[1, §Evaluation] |
| pplx-decider-v1.2 | Qwen3.8-27B | 상태와 여러 질문을 한 시퀀스로 읽음, 데이터 재구성, 여러 학습 결과를 가중치 평균(model soup)으로 합침[8, 도입부] | 68.09 (Decision Index 0.3 Public, 여러 질문을 한 번에 넣은 조건)[8, §Evaluation] |

*점수는 각 모델 카드에 적힌 값을 옮겼습니다. 지표 순위에 쓰는 Full 점수와는 다를 수 있어요. v1.1 카드는 이 점수가 Full인지 Public인지 밝히지 않았습니다.[1, §Evaluation] v1.2 카드는 Decision Index 0.3의 Public 점수라고 밝히고 있어서, v1·v1.1 카드의 점수와 바로 비교하기는 어렵습니다. 참고로 v1.2 카드는 같은 기준으로 v1.1을 62.30점이라고 적었습니다.[8, §Evaluation]*

v1.1 모델 카드는 Decision Index에서 이전 버전(56.4점)보다 높고, 같은 표에 실린 Jev(57.9점)보다도 3.5점 이상 높다고 밝힙니다.[1, 도입부·§Evaluation] 이 글을 쓰는 지금은 이미 v1.2가 나와 있지만, 제가 학습한 건 v1.1입니다.

## 언어모델과 무엇이 다를까

pplx-decider는 언어모델의 몸통을 빌려 왔지만, Decision 모델로 쓰기 위해 네 군데를 바꿨습니다.

**1. 양방향 어텐션.** 일반 언어모델은 각 토큰이 앞쪽 토큰만 보도록 가리는 인과(causal) 마스크를 씁니다. 다음 토큰을 생성하려면 미래를 보면 안 되니까요. 그런데 Decision 모델은 생성을 하지 않으니 이 제약이 필요 없습니다. 그래서 pplx-decider v1.1은 전체 어텐션(full attention) 층에서 인과 마스크를 걷어 내고, 입력의 모든 토큰이 서로를 보게 했습니다. 모델 카드도 v1.1의 향상 대부분이 이 마스크 해제와 데이터 추가에서 왔다고 밝힙니다.[1, 도입부]

다만 모든 층이 양방향인 건 아닙니다. 백본은 전체 어텐션 층과 Gated DeltaNet 계열의 순환(recurrent) 층이 섞인 하이브리드 구조입니다.[2, §LoRA fine-tuning] 비인과 모드는 전체 어텐션 층에만 저장돼 있고, 순환 층은 원래 동작을 그대로 유지합니다.[1, §Checkpoint format and serving] Gated DeltaNet은 원래 앞 토큰부터 차례로 상태를 갱신하기 때문에, 이 층에서는 정보가 앞에서 뒤로만 흐릅니다.

전체 어텐션 층의 마스크 설정은 모델을 평가한 조건의 일부이기도 합니다. 그래서 일반 언어모델처럼 기본 인과 추론으로 돌리면 그 조건이 재현되지 않습니다.[1, §Checkpoint format and serving]

**2. 마지막 토큰 풀링.** 답을 채점할 때는 입력 마지막 토큰의 은닉 상태 하나를 씁니다.[2, §LoRA fine-tuning] 사실 마지막 토큰은 원래도 입력 전체를 볼 수 있는 자리입니다. 마스크를 걷어 내서 달라지는 건 그 앞의 토큰들이에요. 앞쪽 토큰도 뒤에 나온 선택지 설명까지 참고한 표현을 갖게 되고, 마지막 토큰은 그런 표현들을 모아서 읽습니다.

**3. 선택지 채점용 readout.** 어휘 전체를 출력하는 `lm_head` 대신, 선택지 하나당 한 행씩 최대 255개 선택지를 점수 매기는 `[255, 5120]` 행렬을 씁니다.[1, §Checkpoint format and serving] 그래서 이 모델은 글을 생성하지 못하고 선택지 점수만 냅니다.

**4. 보정된 확률.** 모델은 저장된 보정 온도로 점수를 나눈 뒤 확률로 바꿉니다.[1, §Checkpoint format and serving] 보정 온도는 모델이 내는 확률이 실제 정답 빈도에 가깝도록 맞춰 주는 장치라고 보시면 됩니다.

정리하면, 생성용 언어모델의 몸통을 빌려 와서 마스크를 바꾸고 출력층을 선택지 채점기로 갈아 끼운 구조입니다. 이 차이 때문에 일반적인 LLM(Large Language Model, 대규모 언어모델) 파인튜닝 도구를 그대로 쓸 수가 없고, 마스크 설정과 readout을 보존하는 학습 코드가 따로 필요했습니다. 제가 이 저장소를 만든 이유가 바로 이겁니다.

![입력 토큰이 Qwen3.8-27B 백본을 지나 마지막 토큰의 은닉 상태가 readout과 보정 온도를 거쳐 선택지별 확률이 되는 구조. 전체 어텐션 층은 양방향 마스크, Gated DeltaNet 순환 층은 앞에서 뒤로만 상태를 갱신하며, 세 종류의 투영에 LoRA 어댑터가 붙는다](/images/pplx-decider-lora/architecture.wide.webp)

*pplx-decider의 구조와 LoRA 어댑터가 붙는 위치를 그려 봤습니다. 층 종류의 비율은 대략적으로 그렸고, 보라색 LoRA 배지는 아래 2단계에서 설명합니다. BF16과 FP32는 각각 16비트·32비트 부동소수점, MLP는 다층 퍼셉트론입니다. 오른쪽 A·B·C와 막대 높이는 설명을 위한 가상 예시예요.[1, §Checkpoint format and serving] [4, `config.py`]*

## pplx-decider-lora 한눈에

업스트림이 공개한 학습 코드는 27B 백본 전체를 학습합니다.[2, §LoRA fine-tuning] 전체를 학습하면 그래디언트와 옵티마이저 상태가 모든 가중치만큼 필요하죠.[3, §Compared with upstream full fine-tuning] `pplx-decider-lora`는 여기에 백본을 고정하고 LoRA 어댑터만 학습하는 계층을 더한 저장소입니다.

업스트림 v1.1 소스는 첫 커밋 `584a4e9`로 손대지 않고 그대로 가져왔고, LoRA 계층은 `lora/` 폴더에 새 파일로만 더했습니다.[3, 도입부] 위에서 본 비인과 전체 어텐션, 마지막 토큰 풀링, 최대 255개 선택지의 readout, decision 교차 엔트로피 손실, warmup·cosine 학습률 스케줄은 모두 업스트림 코드를 그대로 씁니다.[2, §LoRA fine-tuning] 그래서 일반 LLM 도구로 학습할 때처럼 마스크나 readout이 바뀔까 걱정할 필요가 없습니다.

설치와 체크포인트 준비를 빼면 흐름은 다섯 단계입니다.[2, §LoRA fine-tuning]

| 단계 | 명령 | 하는 일 |
|---|---|---|
| 1. 데이터 검사 | `python -m lora.data` | JSONL(JSON Lines, 한 줄에 JSON 객체 하나) 형식과 분할 사이 겹침을 검사 |
| 2. 학습 | `python -m lora.train` | 백본은 고정하고 LoRA 어댑터를 학습 |
| 3. 이어 학습 | `--resume`, `--continue-from` | 저장한 상태 그대로 다시 시작 |
| 4. 평가·온도 보정 | `python -m lora.evaluation` | 보정용 분할에서만 온도를 맞춤 |
| 5. 병합·내보내기 | `python -m lora.export_model` | FP32(32비트 부동소수점)로 합친 뒤 다시 읽어 검사 |

설치와 테스트는 저장소 루트에서 이렇게 하면 됩니다. 모델 가중치는 내려받지 않으니, 체크포인트는 따로 받아서 `models/base`에 넣어 주세요.[3, §Install]

```sh
uv venv --python 3.12 && source .venv/bin/activate
uv pip install -e '.[test]'
python -m pytest -q
```

## 1단계: 데이터를 검사한다

학습 데이터는 한 줄에 Choice 문제 하나씩 담은 JSONL입니다.

```json
{"id": "story-b", "state": "A fictional user forgot their sign-in password.",
 "options": {"billing": "Questions about charges or refunds",
             "account": "Help signing in or updating an account"},
 "label": "account"}
```

*공개 저장소의 `examples/train.jsonl` 형식을 줄여서 옮긴 가상 예시입니다. 실제 학습 데이터는 아니에요.[3, §Data]*

`id`, `state`, `options`, `label`은 꼭 있어야 하고, `instructions`는 넣어도 되고 빼도 됩니다. 선택지는 1개부터 모델이 허용하는 최대 255개까지 둘 수 있습니다. 정답은 선택지 키 중 하나여야 하고, 중복된 키나 ID는 거부합니다.[3, §Data]

학습 중에는 선택지 순서를 섞을 수도 있습니다. 순서가 바뀌어도 정답 키는 그대로 따라갑니다.[3, §Data] 이렇게 하면 모델이 “정답은 대개 첫 번째”처럼 위치를 외우기 어려워집니다.

데이터는 학습·검증·보정·시험 네 분할로 나눕니다. 학습기는 분할 사이에 ID가 겹치거나 같은 상태 문장이 들어 있지 않은지도 검사합니다.[3, §Data] 저도 학습에 쓰지 않은 검증 데이터를 따로 떼어 두고 학습했습니다.

## 2단계: 무엇을 학습하고 무엇을 고정할지 정한다

LoRA는 고정된 가중치 행렬 `W`의 변화량을 작은 행렬 두 개의 곱 `BA`로 나타내고, 그 두 행렬만 학습합니다.[5, §4.1] `W`가 `d × k`라면 `B`는 `d × r`, `A`는 `r × k`이고, 랭크 `r`은 `d`와 `k`보다 훨씬 작습니다. 학습할 값이 `d × k`개에서 `r × (d + k)`개로 줄어드니, 그래디언트와 옵티마이저 메모리도 그만큼 줄어듭니다.

다만 LoRA가 줄여 주는 건 학습하는 쪽의 메모리뿐입니다. 고정한 백본의 가중치와 순전파 활성값은 여전히 GPU에 올라가야 하거든요.[3, §Compared with upstream full fine-tuning] 그래서 저장소 설정에 메모리와 속도를 위한 스위치를 같이 넣어 뒀습니다.

```yaml
target_modules: [q_proj, k_proj, v_proj, o_proj,
                 in_proj_qkv, in_proj_z, in_proj_a, in_proj_b, out_proj,
                 gate_proj, up_proj, down_proj]
readout: frozen
checkpointing: true
fast_attention: false
autocast_bf16: false
```

*`configs/lora_example.yaml`에서 대상 모듈과 메모리 관련 항목만 옮겼습니다. 파일에는 랭크·학습률 같은 숫자 항목의 예시 값도 들어 있는데, 동작을 보여 주려고 넣은 가상 값이고 제가 실제로 쓴 값은 아닙니다.[4, `configs/lora_example.yaml`]*

각 설정이 하는 일과, 제가 실제로 어떻게 했는지를 표로 정리하면 이렇습니다.

| 설정 | 이렇게 하면 | 제 학습 |
|---|---|---|
| `target_modules` | 전체 어텐션·순환 층·MLP(Multi-Layer Perceptron)의 12종류 투영 모듈에 어댑터가 붙음[4, `config.py`]. 어댑터는 FP32로 유지[3, §Train and continue] | 같은 12종류 |
| `readout` | `frozen`이면 readout의 그래디언트와 옵티마이저 상태가 없음. 학습하면 별도 학습률로 FP32 학습[3, §Train and continue] | 고정 |
| `checkpointing` | 순전파 활성값을 저장하지 않고 역전파 때 다시 계산 | 켬 |
| `autocast_bf16` | 백본 연산을 BF16(bfloat16, 16비트 부동소수점)으로. readout은 이 안에서도 FP32[3, §Train and continue] | 후반 H200 구간부터 켬 |
| `fast_attention` | 비인과 SDPA(Scaled Dot-Product Attention, PyTorch의 어텐션 함수)에 전부 true인 마스크를 넘기지 않음[3, §Train and continue] | 후반 H200 구간부터 켬 |
| `batch`, `accum` | 한 번에 올리는 예제 수와 그래디언트 누적 횟수 | 배치 1 + 누적 |

`fast_attention`과 `autocast_bf16`은 기본값이 꺼져 있습니다.[3, §Train and continue] 이 두 플래그는 메모리보다 속도 쪽에서 효과가 컸는데, 아래 “속도” 소절에서 따로 이야기하겠습니다. 순환 층은 선택으로 설치하는 linear-attention 커널로 더 빠르게 돌릴 수 있습니다.[3, §Install] flash-linear-attention(FLA) 라이브러리가 Gated DeltaNet 커널을 제공하고,[6] 저는 이 커널을 썼습니다.

이렇게 맞춰서 학습했을 때 기록된 최대 GPU 메모리는 약 64.75GB(약 60GiB)였습니다. 입력은 선택지 설명이 전부 들어가는 긴 입력이었는데, 자르지 않고 그대로 학습했습니다. 같은 값이 앞뒤 두 학습 구간 기록에 똑같이 남아 있어서, 어느 구간에서 나온 최대값인지는 구분하지 못했습니다.

![가로 막대 차트. 학습 최대 메모리 64.75GB는 80GB급 GPU 선 안에 들어가고, FP32 병합 102.5GB는 80GB 선을 넘지만 H200 141GB 선 안에 들어간다](/images/pplx-decider-lora/memory.wide.webp)

*제가 비공개 구현으로 학습하고 병합할 때 기록된 최대 GPU 메모리입니다. 공개 저장소로 돌린 결과는 아닙니다. 막대 길이는 실제 값에 맞춰 그렸고, FLA는 flash-linear-attention 라이브러리입니다. 병합은 5단계에서 다룹니다.*

후반 H200 구간의 학습 환경은 PyTorch 2.8.0(CUDA 12.9), Transformers 5.17.0, PEFT(Parameter-Efficient Fine-Tuning) 0.21.0, flash-linear-attention 0.5.2였습니다. 아쉽게도 전반 구간의 환경은 기록이 남아 있지 않습니다.

### 속도: GPU를 10% 남짓밖에 쓰지 못한 이유

메모리는 맞췄는데, 이번엔 속도에서 걸렸습니다. 전반 B200 구간은 `fast_attention`과 `autocast_bf16`을 끈 채로 학습했는데요. 처리량을 B200의 이론상 BF16 최대 성능과 비교해 보니 GPU를 10% 남짓밖에 쓰지 못하고 있었습니다. 토큰당 연산량을 모델 크기로 어림한 추정치라, 실제로 잰 활용률은 아닙니다.

시간이 어디서 새는지 PyTorch profiler로 나눠 봤습니다. 이 측정은 B200이 아니라 H200에서, 같은 설정(두 플래그 끔)으로 했습니다. 정작 무거운 행렬곱은 GPU 시간의 16%밖에 안 됐고, 어텐션이 26%를 차지하고 있었습니다.

원인은 마스크였습니다. 비인과 전체 어텐션에 모든 원소가 true인 마스크를 그대로 넘기니까, PyTorch의 SDPA가 FlashAttention 경로를 쓰지 못하고 더 느린 memory-efficient 커널로 떨어진 거예요. 이 커널의 역전파 하나가 전체 GPU 시간의 약 22%였습니다. 그 밖에 FP32 경로의 자료형 변환 복사도 눈에 띄었습니다. 반면 Gated DeltaNet 커널은 2%로 병목이 아니었습니다.

그래서 후반 H200 구간부터 두 플래그를 켰습니다. `fast_attention`은 배치에 패딩이 없어서 마스크가 전부 true일 때만, 마스크를 넘기지 않고 비인과임을 명시합니다. 그러면 SDPA가 Flash 경로를 쓸 수 있게 됩니다. 패딩이 있으면 원래 마스크를 그대로 쓰고, 순환 층은 건드리지 않습니다. `autocast_bf16`은 백본 순전파만 BF16으로 돌리고, 어댑터 가중치는 FP32로 유지하며, readout과 손실은 FP32로 계산합니다.[3, §Train and continue] 켜기 전후로 몇 건의 표본을 비교해 봤는데 top-1(가장 높은 확률의 선택지)이 모두 같았고, 확률 차이도 작았습니다.

![위에서 아래로: 하이브리드 층 스택에서 전체 어텐션 층이 병목이고 Gated DeltaNet 층은 병목이 아님. 변경 전 GPU 시간 비중은 어텐션 26%, elementwise·norm 25%, 기타 29%, 행렬곱 16%, FLA 2%, conv1d 2%. fast_attention은 패딩이 없을 때 마스크를 넘기지 않아 FlashAttention 경로를 쓰게 하고, autocast_bf16은 백본 순전파를 BF16으로 바꾸고 어댑터 가중치·readout·손실은 FP32로 둔다. 결과는 같은 H200에서 약 1.5배, B200 대비 약 1.2배](/images/pplx-decider-lora/speed.wide.webp)

*제가 비공개 구현으로 학습하면서 잰 값입니다. GPU 시간 비중은 H200에서 두 플래그를 끈 채로 쟀고, 층 비율은 대략적으로 그렸습니다. 두 플래그가 하는 일은 공개 저장소 설명대로 그렸습니다.[3, §Train and continue] GEMM(General Matrix Multiply)은 일반 행렬곱, FLOPs(floating-point operations)는 부동소수점 연산 횟수입니다.*

효과는 생각보다 컸습니다. 같은 H200에서 짧게 재 보니, 두 플래그를 켠 쪽이 끈 쪽보다 약 1.5배 빨랐습니다.

학습 구간끼리도 비교해 봤습니다. 두 플래그를 켠 후반 H200 구간이, 끈 채로 돈 전반 B200 구간보다 학습 step 시간 기준으로 약 1.2배 빨랐습니다. 다만 이 비교는 GPU와 플래그가 동시에 바뀌어서 둘의 효과를 나눌 수 없고, B200에서 플래그를 켜고 재 본 적도 없습니다. 그러니 H200이 B200보다 빠르다는 뜻은 아닙니다. 제가 본 건 한 세대 이전 GPU로 옮겼는데도 학습이 오히려 빨라졌다는 사실까지입니다.

공개 저장소를 쓰신다면 두 플래그는 처음부터 켜고 시작하시길 권합니다. 저장소의 이어 학습은 설정이 모두 같아야 해서, 중간에 플래그를 바꾸면 이어 받을 수가 없거든요.[4, `train.py`] 저는 비공개 구현이라 후반부터 켤 수 있었지만, 공개 저장소에서 같은 순서를 따르려면 학습을 새로 시작해야 합니다.

### H200에서 만난 함정: Gated DeltaNet 역전파

먼저 배경을 조금 설명할게요. 앞에서 쓴 flash-linear-attention(FLA)의 Gated DeltaNet 커널은 Triton으로 작성되어 있습니다.[6] Triton은 GPU 커널을 Python 비슷한 코드로 짜게 해 주는 언어이자 컴파일러입니다. 모델 서빙에 쓰는 NVIDIA Triton Inference Server와는 이름만 같은 별개 도구예요. 그래서 FLA 커널이 제대로 도는지는 FLA 버전뿐 아니라 설치된 Triton 버전에도 달려 있습니다.

H200(Hopper)으로 옮기자마자 FLA가 Gated DeltaNet의 역전파 실행을 거부했습니다. Hopper에서 Triton 3.4.0 이상 3.7.1 미만으로 컴파일하면 이 역전파가 잘못된 결과를 내는 정확성 문제가 있어서, 라이브러리가 실행을 아예 막아 둔 겁니다. 당시 제 Triton은 3.4.0이었습니다. 이 문제가 보고된 뒤로 Hopper에서는 Triton 대신 또 다른 커널 언어인 tilelang으로 만든 커널을 쓰거나, Triton 3.7.1 이상이면 Triton 커널을 다시 쓰도록 바뀌었습니다.[11] 저는 tilelang을 설치해서 해결했습니다. 속도와는 상관없는 문제지만, Hopper GPU에서 Gated DeltaNet 계열 모델을 학습하신다면 가장 먼저 확인해 보세요.

## 3단계: GPU가 바뀌어도 이어서 학습한다

저장소의 체크포인트에는 어댑터 가중치, FP32 readout, decision 설정, 옵티마이저 상태, 데이터를 어디까지 읽었는지, Python·PyTorch 난수 상태가 함께 들어갑니다.[3, §Train and continue] 파일은 임시 위치에 다 쓴 다음 이름을 바꾸고 나서야 `latest.json`에 등록됩니다. 그래서 저장하다가 중간에 끊겨도, 반쯤 쓴 체크포인트를 이어 받는 일은 없습니다. 다른 출력 폴더로 이어 학습하려면 예시 설정을 `configs/continuation.yaml`로 복사하고 `out`만 바꾸면 됩니다.[3, §Train and continue]

```sh
# 같은 출력 폴더에서 마지막 체크포인트부터 다시 시작
python -m lora.train --config configs/lora_example.yaml --device cuda --resume
# 설정은 같고 출력 폴더만 다른 새 설정으로 이어 학습
python -m lora.train --config configs/continuation.yaml --device cuda \
  --continue-from outputs/example/checkpoints/step-00000002
```

이어 학습하려면 데이터, 바탕 가중치, 코드, 설정, 학습률 스케줄, PyTorch 버전, 장치 종류가 모두 같아야 합니다. 난수 상태까지 복원하려면 CUDA 장치 수도 같아야 하고요. 다만 GPU 하드웨어가 다르면 결과가 비트 단위까지 같다고 보장하지는 않습니다.[3, §Train and continue]

저는 실제로 GPU를 바꿔 가며 학습했습니다. 전반부는 B200 한 장에서 약 13시간, 후반부는 체크포인트를 옮겨서 H200 NVL 한 장에서 약 11시간 이어서 학습했습니다. 옵티마이저 상태, 데이터 위치, 난수 상태를 그대로 이어 받았고, 학습률 스케줄도 처음 계획한 그대로 이어졌습니다. 후반부는 앞에서 말한 두 플래그를 켠 상태였는데, 전반부보다 오히려 빨랐습니다.

![B200 한 장에서 약 13시간 학습한 뒤 체크포인트를 옮겨 H200 NVL 한 장에서 약 11시간 이어 학습하고, 검증 NLL이 가장 낮은 체크포인트를 골라 H200에서 FP32로 병합한 다음, 다시 읽어 비교해 통과하면 확정하고 실패하면 삭제하는 흐름](/images/pplx-decider-lora/train-merge-pipeline.wide.webp)

*제가 비공개 구현으로 학습부터 병합까지 진행한 흐름입니다. NLL(Negative Log-Likelihood)은 4단계에서 설명합니다. 체크포인트에 담는 상태와 병합 검사 조건은 공개 저장소 설명대로 그렸습니다.[3, §Train and continue] [4, `export_model.py`]*

## 4단계: 체크포인트를 고르고 온도를 맞춘다

저장소는 학습 중에 검증 분할의 NLL(Negative Log-Likelihood, 정답에 준 확률이 낮을수록 커지는 손실)로 가장 좋은 체크포인트를 고르고, 조기 종료 여부도 판단합니다. 보정 분할과 시험 분할은 체크포인트를 고르는 데 쓰지 않습니다.[3, §Train and continue]

체크포인트를 고른 다음에는 보정 분할에서만 온도를 맞춥니다. 온도는 0.25에서 4 사이에서 찾고, 학습 체크포인트와는 별도의 JSON 파일에 저장해서 한 번만 적용합니다.[3, §Evaluate and fit a temperature] 평가 지표는 top-1 정확도, NLL, ECE(Expected Calibration Error, 확신도와 실제 정답률의 차이)입니다.

```sh
python -m lora.evaluation --config configs/lora_example.yaml \
  --checkpoint outputs/example/checkpoints/step-00000002 --split calib --fit-temperature \
  --output outputs/calibration.json --device cuda
```

저도 최종 모델은 마지막 체크포인트가 아니라, 학습에 쓰지 않은 검증 데이터의 NLL이 가장 낮았던 중간 체크포인트로 골랐습니다. **그 결과는 학습 전 기본 모델보다 좋아졌습니다.** 구체적인 정확도 숫자는 비공개 프로젝트의 정보라 밝히지 못하는 점 양해 부탁드립니다.

## 5단계: 합치고, 다시 읽어서 검사한다

학습이 끝난 어댑터는 배포할 때 백본에 더해서 하나의 모델로 합칠 수 있습니다. 저장소는 백본과 어댑터를 모두 FP32로 올린 뒤 더하고, 필요하면 마지막에 한 번만 BF16으로 바꿉니다. readout은 FP32로 남겨 둡니다. README에도 FP32 백본 전체와 병합 중 임시 값이 들어갈 만큼 메모리를 준비하라고 적어 두었습니다.[3, §Merge and export]

```sh
python -m lora.export_model --config configs/lora_example.yaml \
  --checkpoint outputs/example/checkpoints/step-00000002 --output outputs/merged \
  --validation-data examples/calib.jsonl --calibration outputs/calibration.json \
  --device cuda --dtype float32 --probability-tolerance <허용치>
```

*`<허용치>`에는 용도에 맞게 직접 정한 값을 넣어 주세요. 이 옵션을 빼면 코드의 기본값이 쓰입니다. FP32로 병합하기 때문에 GPU 메모리가 넉넉해야 합니다.[3, §Merge and export] [4, `export_model.py`]*

제 병합도 같은 방식으로 FP32에서 했는데, 이 단계가 학습보다 메모리를 더 많이 썼습니다. 약 102.5GB가 필요해서 80GB급 GPU에서는 할 수 없었고, 141GB인 H200 한 장에서 했습니다. **학습 최대 메모리만 보면 80GB급 GPU에도 들어갈 크기였지만, FP32 병합까지 한 장에서 끝내려면 H200급 메모리가 필요했다**는 것이 이번에 얻은 가장 실용적인 교훈입니다.

병합한 모델은 바로 쓰지 않습니다. 저장소는 병합 결과를 디스크에 저장한 뒤 다시 읽어서, 검증 데이터 전부에 대해 병합 전 어댑터 모델과 보정된 확률을 비교합니다. 비교하는 건 세 가지예요. 토크나이저 입력이 같은지, 확률 차이가 허용치 안인지, top-1이 모두 같은지. 셋을 모두 통과해야 확정하고, 하나라도 어긋나면 임시 파일을 지워서 결과 폴더 자체가 생기지 않게 했습니다.[3, §Merge and export] [4, `export_model.py`]

통과한 모델은 저장소의 `load_merged`로 읽어서 바로 Decision 모델로 쓸 수 있습니다.[3, §Merge and export]

```python
from lora.export_model import load_merged

model = load_merged("outputs/merged", device="cpu")
probabilities = model.predict([{
    "state": "A fictional user cannot sign in.",
    "question": {"type": "choice",
                 "criteria": {"account": "Sign-in help", "technical": "Application errors"}},
}])[0]
```

### 미세한 수치 차이는 버그였을까

허용치를 왜 직접 정해야 하는지는 저도 직접 겪고 나서야 알았습니다. 병합을 마친 뒤 다른 학습 실험을 사전 점검하다가, 같은 입력을 한 건씩 계산할 때와 여러 건을 묶어 계산할 때 점수(로짓)가 아주 조금 다른 걸 발견했습니다.

처음에는 버그를 의심했습니다. 진단해 보니 원인은 행렬 곱셈 라이브러리(cuBLAS)였어요. 입력 길이에 따라 서로 다른 행렬 곱셈 구현을 고르는데, 그 결과가 마지막 자릿수 하나(1 ULP, Unit in the Last Place) 정도 다릅니다. 이 작은 차이가 64개 층을 지나면서 쌓여 눈에 보이는 차이가 된 거였습니다. 코드 오류가 아니라 GPU 연산에서 정상적으로 생기는 범위였던 거죠.

그래서 병합 검사도 확률이 완전히 같기를 요구하지 않고 허용치를 둡니다. 실제 병합에서도 병합 전후 확률이 아주 조금 달랐고, 그 차이를 확인한 뒤에 허용치를 정했습니다.

## 정리: 새로운 모델, 익숙한 방법

처음 질문으로 돌아가 보겠습니다. 적어도 이번에는 답이 “그렇다”였습니다. 새로 나온 Decision 모델에도 익숙한 LoRA가 그대로 통했고, 제 데이터에서 학습 전 기본 모델보다 좋은 결과를 냈습니다. 비인과 어텐션, 마지막 토큰 풀링, readout 같은 Decision 모델의 구조는 업스트림 코드를 그대로 두고 어댑터만 더했기 때문에, Decision 모델의 특성을 건드리지 않고 학습할 수 있었다고 생각합니다.

자원도 생각보다 적게 들었습니다. 27B Decision 모델의 LoRA 학습이 GPU 한 장에 들어갔고, 최대 메모리는 약 64.75GB로 H200 한 장(141GB)의 절반에도 못 미쳤습니다. 다만 FP32 병합에는 약 102.5GB가 필요해서, 학습부터 병합까지 한 장에서 끝내려면 H200급 GPU가 필요했습니다.

물론 이건 한 번의 학습에서 얻은 기록입니다. 입력 길이, 랭크, 대상 모듈이 달라지면 메모리도 달라집니다. 속도 비교도 짧은 측정이거나 GPU와 설정이 함께 바뀐 비교라서, 대략적인 크기로만 봐 주세요. 비용은 따로 기록하지 않았고, 품질도 공개할 수 있는 범위에서 정성적으로만 밝혔습니다.

공개 저장소는 이번 학습에 쓴 방식을 누구나 쓸 수 있게 일반화한 코드입니다. 다만 공개 구현 자체는 아직 GPU에서 실제 27B 체크포인트로 돌려 보지 못했습니다. 저장소에 있는 건 작은 랜덤 모델로 도는 CPU 테스트이고, README에도 이 테스트가 실제 대형 체크포인트를 검증하지 않는다고 적어 두었습니다.[3, §Compared with upstream full fine-tuning] 이 테스트는 글을 쓰면서 공개 저장소를 새로 받아 Apple Silicon(arm64) macOS, Python 3.12에서 `python -m pytest -q`로 돌려 봤고, 34개 모두 통과했습니다(2026년 10월 25일). GPU에서 돌려 보신 분이 있다면 결과를 저장소 이슈로 알려 주세요. 정말 큰 도움이 됩니다.

## 참고 자료와 읽기 범위

본문 번호는 아래 자료를 가리킵니다. §는 문서의 절 제목이나 논문의 절 번호이고, 파일 이름은 해당 소스 파일입니다. “도입부”는 첫 절 제목 앞의 글을 말합니다. 학습 시간·메모리·환경은 제 비공개 학습 기록(학습 지표 파일)에서 옮겼습니다. 공개 저장소 문서와 코드는 2026년 10월 25일에 새로 받아서 직접 읽었습니다.

1. Perplexity. [pplx-decider-v1.1-27b](https://huggingface.co/perplexity-ai/pplx-decider-v1.1-27b), Hugging Face 모델 카드. 2026년 10월 25일 확인. Decision Index 수치는 이 모델 카드의 표를 그대로 옮겼습니다.
2. RielKIM. [pplx-decider-lora](https://github.com/RielKIM/pplx-decider-lora), GitHub. 루트 `README.md`, 커밋 `584a4e9`·`14c8216`·`5e27c5a`, 업스트림 소스의 질문 형식 정의(`source/src/autojev/types.py`, `model.py`). 2026년 10월 25일 확인.
3. 같은 저장소의 [`lora/README.md`](https://github.com/RielKIM/pplx-decider-lora/blob/main/lora/README.md). 전문 확인.
4. 같은 저장소의 [`lora/`](https://github.com/RielKIM/pplx-decider-lora/tree/main/lora) 소스와 `configs/lora_example.yaml`. `config.py`의 기본 대상 모듈 목록, `train.py`의 이어 학습 설정 일치 검사, `export_model.py`의 병합 검사 함수, 예시 설정 파일을 확인.
5. Hu 등. [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685v2), 2021. 읽은 버전은 arXiv v2이며, §4.1의 저랭크 분해 정의만 참고했습니다.
6. fla-org. [flash-linear-attention](https://github.com/fla-org/flash-linear-attention), GitHub. 2026년 10월 25일 확인. Gated DeltaNet 지원 여부와, 커널이 Triton으로 작성되어 있고 일부 커널에 TileLang 백엔드가 있다는 점만 확인했습니다.
7. Perplexity. [pplx-decider-v1-27b](https://huggingface.co/perplexity-ai/pplx-decider-v1-27b), Hugging Face 모델 카드. 2026년 10월 25일 확인. v1의 학습 데이터 설명(§Acknowledgment)을 참고했습니다.
8. Perplexity. [pplx-decider-v1.2](https://huggingface.co/perplexity-ai/pplx-decider-v1.2), Hugging Face 모델 카드. 2026년 10월 25일 확인. v1.1 대비 변경점과 Decision Index 0.3 점수를 참고했습니다.
9. eesel. [Decision models explained: Jev vs Clef vs Strands Decider](https://www.eesel.ai/blog/decision-models), 2026년 10월 6일 수정판. 2026년 10월 25일 확인. Decision 모델의 정의, 질문 형식(Noul·Choice·Score), 범주의 시작 시점을 참고했습니다.
10. multimodalart. [Jev Decision Index](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/README.md), Hugging Face Space README. 2026년 10월 25일 확인. 커뮤니티 관리 지표이며 TypeSafe와 무관하다고 밝힙니다. 점수 산정 방식(Full·Public)만 참고했습니다.
11. fla-org. [GDN precision error in triton3.5 and h20 (이슈 #640)](https://github.com/fla-org/flash-linear-attention/issues/640)과 연결된 커밋 “[GDN] Re-enable Triton backend for Triton >= 3.7.1 on Hopper (#983)”, GitHub. 2026년 10월 25일 확인. Triton 버전별 정밀도 문제와 Hopper 대응 방식만 참고했습니다.

이 글과 도식, 공개 저장소의 LoRA 코드는 AI 도구의 도움을 받아 만들었고, 모두 제가 검토했습니다.
