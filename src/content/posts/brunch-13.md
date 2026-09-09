---
title: "PyTorch 밑의 세상:CUDA 계층 구조 완전 분해"
description: "PyTorch API에서 CUDA 런타임·드라이버와 GPU 실행까지 이어지는 계층 및 Triton을 분석한다."
date: "2026-02-01T08:29:40+09:00"
tags: ["PyTorch","CUDA","GPU","Triton"]
draft: false
imported: true
sources: [{"name":"Brunch","url":"https://brunch.co.kr/@ukai/13"}]
subtitle: "Python API에서 GPU 레지스터까지: 완전한 실행 흐름 분석"
---

오늘은 기술적으로 조금 더 깊이 들어가보고자 합니다. 예전에 작성했던 MuonClip Optimizer 글이 지금도 여러 사람들이 찾아와 읽어주시는 것을 보며, 기술의 근본 원리에 관심이 있는 분들이 생각보다 많다는 것을 알게 되었습니다.

오늘은 <strong>PyTorch 밑에 숨겨진 세상</strong>을 적나라하게 들여다보고자 합니다. 우리가 매일 사용하는 <strong>torch.matmul(), </strong><strong>nn.Conv2d()</strong> 같은 간단한 함수 호출이 실제로 어떤 거대한 구조 위에서 작동하는지, 그 계층 구조를 하나하나 해부해보겠습니다.

---

## <strong>1. 개요</strong>

CUDA(Compute Unified Device Architecture)는 NVIDIA가 개발한 병렬 컴퓨팅 플랫폼이자 프로그래밍 모델입니다. GPU(Graphics Processing Unit)의 강력한 연산 능력을 그래픽 처리가 아닌 일반 목적의 데이터 연산에 활용하는 <strong>GPGPU(General-Purpose computing on Graphics Processing Units)</strong> 기술의 핵심입니다.

현대의 AI 시스템은 단순히 하드웨어 하나로 작동하는 것이 아니라, 사용자가 접하는 최상위 어플리케이션부터 실제 연산을 수행하는 반도체 칩까지 정교하게 설계된 소프트웨어 스택 위에서 구동됩니다. 본 문서는 이 스택을 크게 6가지 계층으로 나누어, 각 계층의 역할과 상호작용을 설명합니다.

## <strong>2. 계층 구조 시각화</strong>

아래 다이어그램은 상위 레벨의 추상화된 어플리케이션 영역에서 하위 레벨의 물리적 하드웨어까지의 데이터 및 제어 흐름을 보여줍니다.

![](/images/brunch/13/01.png)

## <strong>3. 계층별 상세 설명</strong>

### <strong>3.1. Application Layer</strong>

최종 사용자가 직접 상호작용하는 <strong>최상위 인터페이스</strong>입니다. 비즈니스 로직이 구현되는 곳으로, AI 모델이 예측한 결과를 사용자에게 전달합니다.

주요 구성요소: 웹 서비스(Web UI), 모바일 앱, REST API 엔드포인트, 자율주행 제어 시스템 등.

상호작용: 하위 미들웨어 계층에 추론(Inference) 요청을 보내고, 처리된 결과를 받아 사용자에게 시각화합니다. 하드웨어의 복잡성을 전혀 알 필요가 없습니다.

### <strong>3.2. AI Core Services / Middleware Layer</strong>

<strong>어플리케이션과 딥러닝 프레임워크 사이를 연결하는 다리 역할</strong>을 합니다. 여러 모델을 효율적으로 관리하고, 대규모 트래픽을 처리하기 위한 배치(Batching) 처리, 스케줄링, 모델 버전 관리 등을 담당합니다.

주요 구성요소: NVIDIA Triton Inference Server, TorchServe, vLLM, TensorRT-LLM, Ray Serve.

상호작용: 어플리케이션으로부터 들어온 요청을 받아 딥러닝 프레임워크나 최적화된 엔진(TensorRT 등)으로 전달합니다. GPU 자원을 효율적으로 점유하도록 작업을 분배합니다.

### <strong>3.3. Deep Learning Frameworks Layer</strong>

개발자가 <strong>AI 모델을 설계, 학습, 실행할 수 있도록 고수준의 API를 제공하는 계층</strong>입니다. 복잡한 수학적 연산(행렬 곱셈, 미분 등)을 추상화하여 제공합니다.

주요 구성요소: PyTorch, TensorFlow, JAX, Hugging Face Transformers.

상호작용: 개발자가 파이썬 코드(예: torch.matmul)를 작성하면, 프레임워크는 이를 하위의 CUDA 라이브러리 호출로 변환합니다. 사용자는 직접 CUDA C++ 코드를 짜지 않고도 GPU 가속을 이용할 수 있습니다.

### <strong>3.4. CUDA Layer</strong>

GPU 가속을 위한 핵심 소프트웨어 플랫폼입니다. <strong><u>프레임워크가 요청한 연산을 GPU가 이해할 수 있는 명령어로 변환하고 최적화된 수학 라이브러리를 제공</u></strong>합니다. 이 계층이 없다면 프레임워크는 GPU를 단순한 그래픽 카드로만 인식하게 됩니다.

### <strong>3.4.1. CUDA 패키지 구성</strong>

CUDA Toolkit은 단일 소프트웨어가 아니라 여러 하위 컴포넌트들로 구성된 종합 개발 환경입니다. 각 컴포넌트는 특정한 역할을 수행하며, 개발자와 프레임워크가 GPU를 효율적으로 활용할 수 있도록 돕습니다.

![image.png](/images/brunch/13/02.png)

<strong>3.4.2. 핵심 컴포넌트 (Core Components)</strong>

<strong>3.4.2.1. CUDA Runtime API &amp; Driver API  </strong>

CUDA Runtime API: 고수준 API로, 메모리 관리(cudaMalloc, cudaMemcpy), 커널 실행, 디바이스 관리 등을 추상화하여 제공합니다. 대부분의 개발자가 사용하는 API입니다.

CUDA Driver API: 저수준 API로, 하드웨어에 더 가까운 제어를 제공합니다. 컨텍스트 관리, 모듈 로딩 등 세밀한 제어가 필요한 경우 사용됩니다.

<strong>3.4.2.2. NVCC (NVIDIA CUDA Compiler)  </strong>

CUDA C/C++ 코드를 컴파일하는 전용 컴파일러입니다. .cu 확장자를 가진 파일을 받아 호스트 코드와 디바이스 코드를 분리하여 각각 컴파일합니다.

디바이스 코드는 PTX(Parallel Thread Execution) 중간 언어로 변환된 후, 다시 GPU 아키텍처별 기계어(SASS)로 변환되어 실행됩니다.

<strong>3.4.2.3. 최적화된 라이브러리 (CUDA Libraries)  </strong>

cuBLAS (CUDA Basic Linear Algebra Subroutines): 행렬 곱셈, 벡터 연산 등 기본 선형대수 연산을 GPU로 가속합니다. 예: cublasSgemm (단정밀도 행렬 곱셈).

cuDNN (CUDA Deep Neural Network library): 딥러닝 특화 연산(Convolution, Pooling, Normalization, Activation 함수 등). PyTorch, TensorFlow 등 모든 주요 프레임워크가 내부적으로 사용하며, Tensor Core를 활용한 Mixed Precision 학습(FP16, BF16)을 지원합니다.

cuFFT: 신호 처리, 이미지 처리를 위한 고속 푸리에 변환 라이브러리.

cuSPARSE: 희소 행렬(Sparse Matrix) 연산 최적화 라이브러리. 그래프 신경망(GNN)이나 추천 시스템에서 자주 사용됩니다.

cuRAND: GPU에서 난수 생성을 위한 라이브러리.

Thrust: C++ STL과 유사한 고수준 템플릿 라이브러리 (정렬, 리듀스 등).

NCCL (NVIDIA Collective Communications Library): 멀티 GPU 및 멀티 노드 간의 통신을 위한 라이브러리. AllReduce, Broadcast, Gather 등 분산 학습에 필수적인 통신 패턴을 지원합니다.

### <strong>3.4.3. 개발 도구 (Development Tools)  </strong>

Nsight Systems &amp; Nsight Compute: Nsight Systems는 시스템 전체(CPU + GPU)의 성능 프로파일링 도구이며, Nsight Compute는 개별 CUDA 커널의 상세 성능 분석 도구입니다.

CUDA-GDB: GPU 커널 코드를 디버깅하기 위한 확장된 GDB 디버거.

CUDA-MEMCHECK: 메모리 오류 검사 도구로, 잘못된 메모리 접근, 메모리 누수 등을 탐지합니다.

TensorRT: 학습된 딥러닝 모델을 추론(Inference) 환경에 최적화하는 SDK. 레이어 융합, 정밀도 캘리브레이션(INT8, FP16), 커널 자동 튜닝 등을 수행합니다.

CUDA Samples: 100개 이상의 예제 코드가 포함되어 학습에 유용합니다.

### <strong>3.4.4. CUDA 패키지 설치 구조</strong>

일반적인 CUDA Toolkit 설치 시, 다음과 같은 디렉토리 구조가 생성됩니다 (Linux 기준 /usr/local/cuda-12.x/):

bin/ - nvcc, nvprof, cuda-gdb 등 실행 파일

include/ - CUDA 헤더 파일 (cuda\_runtime.h, cudnn.h 등)

lib64/ - 공유 라이브러리 (libcudart.so, libcublas.so, libcudnn.so 등)

samples/ - CUDA 샘플 코드

doc/ - API 문서

extras/ - CUPTI(성능 측정 API), CUDA-MEMCHECK 등 추가 도구

> 중요: cuDNN은 CUDA Toolkit에 기본 포함되지 않으며, NVIDIA Developer Program에 등록 후 별도로 다운로드해야 합니다. 이는 딥러닝 프레임워크(PyTorch, TensorFlow 등)를 사용하는 경우 필수 의존성입니다.

### <strong>3.4.5. CUDA Layer의 핵심 기능  </strong>

<strong>메모리 관리: </strong>

CPU(Host) 메모리와 GPU(Device) 메모리 간 데이터 전송 관리

GPU VRAM에 메모리 할당/해제 (cudaMalloc, cudaFree)

메모리 복사 작업 최적화 (cudaMemcpy, cudaMemcpyAsync)

통합 메모리(Unified Memory) 관리로 CPU와 GPU 간 자동 데이터 이동

<strong>커널 실행 관리:</strong>

GPU에서 실행될 병렬 함수(커널) 호출 및 스케줄링

스레드 블록(Thread Block) 및 그리드(Grid) 구성 설정

커널 실행의 비동기 처리 및 동기화 제어

스트림(Stream)을 통한 다중 작업 병렬 실행

<strong>최적화된 라이브러리 제공:          </strong>

cuDNN: 딥러닝 전용 기초 연산(Convolution, Pooling, Normalization 등)

cuBLAS: GPU 가속 기본 선형대수 연산 (행렬 곱셈, 벡터 연산 등)

cuFFT: 고속 푸리에 변환

NCCL: 멀티 GPU 통신 및 데이터 동기화

<strong>디바이스 관리:          </strong>

시스템 내 GPU 장치 탐색 및 선택

GPU 속성 조회 (코어 수, 메모리 크기, 컴퓨트 능력 등)

멀티 GPU 환경에서 디바이스 간 작업 분배

### <strong>3.4.6. CUDA Layer 동작 예시</strong>

다음은 CUDA Runtime API를 직접 사용하여 벡터 덧셈을 수행하는 예시입니다:

![스크린샷 2026-02-01 오전 12.10.05.png](/images/brunch/13/03.png)

![스크린샷 2026-02-01 오전 12.10.33.png](/images/brunch/13/04.png)

### <strong>3.4.7. CUDA Layer의 추상화 수준</strong>

CUDA Layer는 하드웨어의 복잡성을 숨기면서도 세밀한 제어를 가능하게 합니다. <strong><u>개발자는 "몇 개의 스레드 블록으로 실행할지", "어떤 메모리를 사용할지" 등을 제어할 수 있지만, GPU 내부의 워프(Warp) 스케줄링, 캐시 관리, 명령어 파이프라이닝 등은 자동으로 처리</u></strong>됩니다.

### <strong>3.5. Driver Layer (드라이버 계층)</strong>

운영체제(OS) 커널 레벨에서 하드웨어를 직접 제어하는 소프트웨어입니다. <strong><u>CUDA 런타임이 보낸 명령을 실제 전기적 신호나 하드웨어 레지스터 조작으로 변환</u></strong>합니다. 드라이버 없이는 GPU는 단순한 PCI 장치로만 인식되며, 어떠한 연산도 수행할 수 없습니다.

### <strong>3.5.1. Driver Layer의 핵심 기능  </strong>

<strong>하드웨어 초기화:          </strong>

시스템 부팅 시 GPU 디바이스 탐지 및 등록

GPU의 전원 상태 관리 (P-State: 성능 상태 제어)

클럭 속도, 전압, 팬 속도 등 하드웨어 파라미터 설정

VRAM, 캐시, SM(Streaming Multiprocessor) 초기화

<strong>메모리 관리 (물리적 수준):          </strong>

GPU VRAM의 물리적 주소 공간 매핑

메모리 페이지 테이블 관리 (가상 메모리 → 물리 메모리)

메모리 보호 및 격리 (멀티 프로세스 환경)

DMA 엔진을 통한 CPU-GPU 데이터 전송 제어

<strong>명령 큐(Command Queue) 관리:          </strong>

CUDA 커널 실행 명령을 GPU 하드웨어 큐에 삽입

여러 프로세스의 작업을 시분할(Time-Sharing)로 스케줄링

우선순위 기반 작업 스케줄링 (MPS: Multi-Process Service)

커널 실행 완료 인터럽트 처리

<strong>컨텍스트(Context) 관리:          </strong>

각 프로세스별 GPU 실행 환경(컨텍스트) 생성 및 관리

컨텍스트 스위칭 시 레지스터 상태 저장/복원

멀티 프로세스 간 GPU 자원 격리 및 보안

<strong>오류 처리 및 복구:          </strong>

GPU 하드웨어 오류(ECC 에러, 타임아웃 등) 탐지

크래시 발생 시 GPU 리셋 및 복구

커널 실행 타임아웃 감시 (TDR: Timeout Detection and Recovery)

<strong>운영체제 통합:          </strong>

Linux: /dev/nvidia0 등 장치 파일 노드 생성

Windows: WDDM (Windows Display Driver Model) 준수

시스템 전원 관리(ACPI)와 통합

### <strong>3.5.2. Driver Layer 동작 예시</strong>

CUDA Runtime의 cudaMalloc() 호출이 드라이버를 거쳐 GPU 하드웨어까지 전달되는 과정:

![스크린샷 2026-02-01 오전 12.11.06.png](/images/brunch/13/05.png)

### <strong>3.5.3. 커널 실행 시 Driver의 역할</strong>

vectorAdd&lt;&lt;&lt;1000, 256&gt;&gt;&gt;() 커널 실행 시 드라이버의 동작:

![image.png](/images/brunch/13/06.png)

### <strong>3.5.4. Driver Layer와 OS의 통합</strong>

### <strong>Linux 환경:</strong>

커널 모듈: nvidia.ko (GPU 드라이버 핵심)

장치 파일: /dev/nvidia0, /dev/nvidiactl, /dev/nvidia-uvm

nvidia-smi 명령으로 드라이버 상태 확인 가능

드라이버 버전: 예) 535.129.03 (CUDA 12.2 호환)

<strong>Windows 환경:              </strong>

WDDM (Windows Display Driver Model) 준수

디스플레이 출력과 컴퓨팅 작업을 동시 처리

DirectX와의 상호 운용성 지원

<strong>멀티 프로세스 지원:              </strong>

각 프로세스가 독립적으로 GPU 접근 가능

MPS (Multi-Process Service)를 통한 GPU 자원 공유

프로세스 간 메모리 격리로 보안 유지

### <strong>3.5.5. Driver의 중요성</strong>

드라이버는 CUDA 스택에서 가장 낮은 소프트웨어 계층으로, <strong><u>하드웨어와 소프트웨어의 경계</u></strong>에 위치합니다. 드라이버 버그는 시스템 전체 크래시를 일으킬 수 있으며, 성능 최적화 여부가 GPU 활용률에 직접적 영향을 미칩니다. 이것이<strong> <u>NVIDIA가 드라이버를 완전히 비공개로 유지하고, 정기적인 업데이트를 통해 성능과 안정성을 개선하는 이유</u></strong>입니다.

> CUDA Layer vs Driver Layer:  
>   
> CUDA Layer: "어떤 연산을 어떻게 병렬화할지" 결정 (논리적 수준)  
> • 개발자가 작성한 커널 코드를 GPU 명령으로 변환  
> • 메모리 할당, 데이터 전송, 커널 실행 등의 API 제공  
>   
> Driver Layer: "GPU 하드웨어를 어떻게 물리적으로 제어할지" 실행 (하드웨어 수준)  
> • CUDA 명령을 실제 GPU 레지스터 조작으로 변환  
> • OS와 하드웨어 간의 다리 역할  
> • 멀티 프로세스, 오류 처리, 전원 관리 등 시스템 레벨 기능 담당

---

## # 번외 섹션 &lt;시작&gt;

### <strong>왜 드라이버는 Host OS에, CUDA/cuDNN은 컨테이너 안에?</strong>

Docker/Kubernetes 환경에서 NVIDIA GPU 드라이버는 반드시 Host OS에 설치되어야 하지만, CUDA Toolkit과 cuDNN은 컨테이너 내부에 설치할 수 있습니다. 이는 계층의 역할 분리에 따른 설계입니다.

### <strong>1. 드라이버가 Host OS에 있어야 하는 이유  </strong>

<strong>하드웨어 직접 제어 권한:</strong>

드라이버는 GPU 하드웨어의 물리적 레지스터, VRAM, PCIe 버스에 직접 접근해야 합니다.

Linux 커널 모듈(nvidia.ko)로 작동하며, 커널 공간(Kernel Space)에서 실행됩니다.

컨테이너는 사용자 공간(User Space)에서만 실행되므로, 하드웨어 직접 제어가 불가능합니다.

<strong>시스템 전역 자원 관리:</strong>

여러 컨테이너(또는 프로세스)가 동시에 GPU를 사용할 때, 드라이버가 중앙에서 자원을 조율 합니다.

예: 컨테이너 A와 B가 동시에 GPU 메모리를 요청하면, 드라이버가 충돌 없이 메모리를 분배합니다.

컨테이너 내부에 드라이버가 있다면 각 컨테이너가 GPU를 독점하려 해 충돌이 발생합니다.

<strong>보안 및 격리:</strong>

GPU는 시스템 전체에 영향을 미치는 하드웨어이므로, 신뢰할 수 있는 Host OS의 커널이 관리 해야 합니다.

악의적인 컨테이너가 드라이버를 조작하면 시스템 전체가 위험해집니다.

### <strong>2. CUDA/cuDNN이 컨테이너 안에 있을 수 있는 이유  </strong>

<strong>사용자 공간(User Space) 라이브러리:</strong>

CUDA Runtime, cuDNN, cuBLAS 등은 커널 모듈이 아닌 일반 공유 라이브러리 입니다.

libcudart.so, libcudnn.so 등은 응용 프로그램이 링크하는 일반 .so 파일입니다.

컨테이너는 사용자 공간 프로세스이므로, 이러한 라이브러리를 내부에 포함할 수 있습니다.

<strong>드라이버 API를 통한 간접 제어:</strong>

CUDA Runtime은 직접 하드웨어를 제어하지 않고, Host의 드라이버 API를 호출 합니다.

흐름:컨테이너 내 CUDA 코드 → libcuda.so (Driver API) → Host OS의 nvidia.ko (드라이버) → GPU 하드웨어

컨테이너는 /dev/nvidia0 장치 파일을 통해 Host 드라이버와 통신합니다.

<strong>버전 독립성 및 환경 격리:</strong>

컨테이너 A는 CUDA 11.8 + cuDNN 8.6, 컨테이너 B는 CUDA 12.2 + cuDNN 9.0을 사용할 수 있습니다.

Host 드라이버만 최신 버전이면, 각 컨테이너는 자신의 CUDA/cuDNN 버전을 독립적으로 사용 가능합니다.

이는 마이크로서비스 아키텍처에서 매우 중요한 격리 기능입니다.

### <strong>3. NVIDIA Container Toolkit의 역할</strong>

Docker에서 GPU를 사용하려면 NVIDIA Container Toolkit을 설치해야 합니다. 이 도구는:

<strong>장치 파일 마운트:</strong>

Host의 /dev/nvidia0, /dev/nvidiactl 등을 컨테이너 내부에 마운트합니다.

컨테이너가 이 장치 파일을 통해 Host 드라이버와 통신할 수 있게 합니다.

<strong>Driver 라이브러리 공유:</strong>

Host의 libcuda.so (Driver API)를 컨테이너에 자동으로 마운트합니다.

컨테이너는 Host 드라이버 버전과 호환되는 CUDA Runtime만 포함하면 됩니다.

<strong>GPU 자원 할당:</strong>

docker run --gpus all 또는 --gpus '"device=0,1"'로 특정 GPU만 컨테이너에 할당 가능.

### <strong>4. 실전 예시: Docker 환경에서의 계층 구조</strong>

![스크린샷 2026-02-01 오전 12.13.02.png](/images/brunch/13/07.png)

![스크린샷 2026-02-01 오전 12.13.38.png](/images/brunch/13/08.png)

## # 번외 섹션 &lt;끝&gt;

---

### 3.6. Hardware Layer (하드웨어 계층)

실제 연산이 물리적으로 수행되는 실리콘 칩 레벨입니다. 수천 개의 코어가 병렬로 데이터를 처리합니다.

<strong>주요 구성요소:          </strong>

GPU Core (CUDA Cores): 일반적인 병렬 연산 처리.

Tensor Cores: AI 행렬 연산에 특화된 가속 코어 (Mixed Precision 연산 등).

HBM / GDDR VRAM: 초고속 데이터 저장 공간.

NVLink: 칩 간 초고속 인터커넥트.

<strong>상호작용: </strong>

드라이버를 통해 전달받은 기계어 명령을 실행하고, 그 결과를 메모리에 씁니다.

## <strong>4. PyTorch의 CUDA 래핑</strong>

PyTorch는 개발자가 Python으로 작성한 코드를 내부적으로 CUDA 라이브러리 호출로 변환하는 복잡한 래핑 (Wrapping) 구조를 가지고 있습니다. 이 섹션에서는 PyTorch가 어떻게 CUDA를 추상화하여 사용자 친화적인 인터페이스를 제공하는지 살펴봅니다.

### <strong>4.1. PyTorch의 계층적 래핑 구조</strong>

PyTorch는 크게 4개의 레이어로 구성되어 있으며, 각 레이어가 하위 계층을 래핑합니다:

![image.png](/images/brunch/13/09.png)

### <strong>4.1.1. Python Frontend Layer  </strong>

사용자가 직접 작성하는 코드 레벨입니다.

torch.Tensor 객체를 통해 데이터를 관리하고, torch.nn 모듈로 신경망을 정의합니다.

Pythonic한 문법을 제공하여 직관적인 사용이 가능합니다.

### <strong>4.1.2. C++ Backend (ATen - A Tensor Library)  </strong>

<strong>ATen이란? </strong>

PyTorch 팀이 직접 개발한 C++ 텐서 연산 라이브러리입니다. PyTorch 소스코드의 핵심 부분으로, PyTorch 저장소 내의 aten/ 디렉토리에 위치합니다.

<strong>구성:          </strong>

PyTorch 자체 C++ 코드: 텐서 연산의 인터페이스, 메모리 관리, 자동 미분 엔진(Autograd) 등

외부 라이브러리 래핑: cuDNN(NVIDIA), cuBLAS(NVIDIA), MKL(Intel) 등 최적화된 라이브러리를 호출

커스텀 CUDA 커널: PyTorch 팀이 직접 작성한 GPU 최적화 코드

<strong>Dispatcher 시스템:          </strong>

동일한 연산(예: matmul)에 대해 CPU, CUDA, MPS(Mac), ROCm(AMD) 등 다양한 백엔드를 자동으로 선택

예: torch.matmul(A, B) 호출 시  
  - 텐서가 CPU에 있으면 → Intel MKL의 cblas\_sgemm() 호출  
  - 텐서가 CUDA GPU에 있으면 → cublasSgemm() 호출  
  - 텐서가 Apple Silicon에 있으면 → Metal Performance Shaders 호출

역할: Python에서 호출된 함수를 적절한 디바이스용 커널로 라우팅하고, 메모리 관리와 자동 미분을 처리합니다.

![스크린샷 2026-02-01 오전 12.15.49.png](/images/brunch/13/10.png)

### <strong>4.1.3. CUDA Kernels Layer  </strong>

실제 GPU에서 실행되는 C++/CUDA 코드입니다.

PyTorch는 자체 최적화된 CUDA 커널과 함께 cuDNN, cuBLAS 등 외부 라이브러리를 활용합니다.

예: Convolution 연산은 내부적으로 cudnnConvolutionForward()를 호출합니다.

### <strong>4.2. 실제 코드 예시: Python에서 GPU까지</strong>

다음은 간단한 PyTorch 코드가 어떻게 CUDA 호출로 변환되는지 보여주는 예시입니다.

### <strong>4.2.1. 예시 1: 행렬 곱셈 (Matrix Multiplication)</strong>

![스크린샷 2026-02-01 오전 12.16.22.png](/images/brunch/13/11.png)

### <strong>4.2.2. 예시 2: Convolution 연산 (딥러닝 핵심 연산)</strong>

![스크린샷 2026-02-01 오전 12.16.50.png](/images/brunch/13/12.png)

### <strong>4.2.3. 예시 3: 전체 학습 루프 (Training Loop)</strong>

![스크린샷 2026-02-01 오전 12.17.22.png](/images/brunch/13/13.png)

### <strong>4.3. PyTorch가 CUDA를 래핑하는 이유</strong>

생산성 향상: CUDA C++를 직접 작성하면 수백 줄이 필요한 코드를, PyTorch에서는 몇 줄로 작성 가능합니다.

자동 최적화: cuDNN, cuBLAS 등 최적화된 라이브러리를 자동으로 선택하여 성능을 극대화합니다.

플랫폼 독립성: 동일한 코드가 CPU, CUDA(NVIDIA), ROCm(AMD), MPS(Apple Silicon)에서 실행됩니다.

자동 미분: 복잡한 역전파 계산을 backward() 한 번으로 처리합니다.

메모리 관리: GPU 메모리 할당/해제, 페이징 등을 자동으로 처리합니다.

### <strong>4.4. 성능 비교: Pure CUDA vs PyTorch</strong>

![스크린샷 2026-02-01 오전 12.17.58.png](/images/brunch/13/14.png)

> PyTorch는 CUDA의 복잡성을 추상화하여 개발자가 "무엇을 계산할지"에만 집중할 수 있게 합니다. 내부적으로는 최고 수준의 최적화된 CUDA 코드가 실행되므로, 대부분의 경우 직접 CUDA를 작성할 필요가 없습니다. 단, 매우 특수한 커널이나 극한의 성능이 필요한 경우에는 Custom CUDA Extension을 통해 직접 CUDA 코드를 작성하고 PyTorch에 통합할 수 있습니다.

## <strong>5. Triton 언어: PyTorch와 CUDA 사이의 새로운 계층</strong>

Triton은 OpenAI에서 개발한 GPU 프로그래밍 언어로, <strong><u>PyTorch의 Python 편의성과 CUDA의 성능 사이의 격차를 메우기 위해 설계</u></strong>되었습니다. PyTorch와 순수 CUDA 사이에 위치하며, 개발자가 Python과 유사한 문법으로 고성능 커스텀 GPU 커널을 작성할 수 있게 해줍니다.

### <strong>5.1. Triton의 위치: 계층 구조에서의 역할</strong>

![image.png](/images/brunch/13/15.png)

### <strong>5.2. Triton의 특징과 장점  </strong>

Python 기반 문법: CUDA C++가 아닌 Python과 유사한 문법으로 커널을 작성합니다. NumPy, PyTorch와 유사한 API를 제공합니다.

자동 최적화: 메모리 코얼레싱(coalescing), 공유 메모리 활용, 타일링(tiling) 등을 컴파일러가 자동으로 처리합니다.

블록 수준 프로그래밍: 스레드 단위가 아닌 블록 단위로 프로그래밍하여 추상화 수준이 높습니다.

개발 생산성: CUDA C++ 대비 10배 적은 코드로 90~95% 성능을 달성할 수 있습니다.

PyTorch 통합: torch.compile() 및 @triton.jit 데코레이터를 통해 PyTorch와 직접 통합됩니다.

### <strong>5.3. Triton vs CUDA vs PyTorch 비교</strong>

![image.png](/images/brunch/13/16.png)

### <strong>5.4. 실전 예시: Liger Kernel</strong>

Liger Kernel은 LinkedIn에서 개발한 Triton 기반의 최적화된 LLM(대규모 언어 모델) 학습 커널 모음입니다. PyTorch의 기본 구현보다 메모리 효율과 속도를 크게 개선한 실용적인 Triton 활용 사례입니다.

### <strong>5.4.1. Liger Kernel의 주요 최적화 기법  </strong>

Kernel Fusion (커널 융합): 여러 개의 작은 연산을 하나의 큰 커널로 합쳐 메모리 접근 횟수를 줄입니다.

In-place 연산: 중간 결과를 별도로 저장하지 않고 즉시 처리하여 메모리 사용량을 감소시킵니다.

효율적인 Backward Pass: 그래디언트 계산 시 불필요한 중간 텐서 저장을 최소화합니다.

### <strong>5.4.2. 예시: RMSNorm (Root Mean Square Normalization)</strong>

LLaMA, Mistral 등 최신 LLM 모델에서 사용되는 정규화 레이어입니다. Liger Kernel은 이를 Triton으로 재구현하여 PyTorch 기본 구현 대비 <strong><u>2배 빠른 속도와 30% 적은 메모리 사용을 달성</u></strong>했습니다.

![image.png](/images/brunch/13/17.png)

![image.png](/images/brunch/13/18.png)

### <strong>5.4.3. Liger Kernel의 실제 성능 개선 사례</strong>

![image.png](/images/brunch/13/19.png)

### <strong>5.4.4. Liger Kernel 사용 방법</strong>

![image.png](/images/brunch/13/20.png)

> Triton의 포지셔닝: Triton은 "PyTorch가 제공하지 않는 특수한 연산을 빠르게 구현하고 싶지만, CUDA는 너무 어렵다"는 딜레마를 해결합니다. Liger Kernel 사례처럼, 최신 LLM 아키텍처의 핵심 연산들을 2배 이상 가속화하면서도 개발자는 Python 수준의 생산성을 유지할 수 있습니다. 이는 AI 연구와 프로덕션 배포 사이의 간극을 크게 좁히는 혁신적인 도구입니다.

## <strong>6. CUDA의 소스 공개 여부와 기술적 해자</strong>

CUDA가 AI 시대의 가장 강력한 기술적 해자(Technical Moat)로 평가받는 이유는 단순히 소프트웨어의 품질이 우수하기 때문만이 아닙니다. 이 섹션에서는 CUDA의 소스 공개 정책과, 이것이 어떻게 NVIDIA의 경쟁 우위를 형성하는지 분석합니다.

### <strong>6.1. CUDA의 소스 공개 여부</strong>

CUDA 에코시스템은 공개와 비공개가 혼재된 복합적인 구조를 가지고 있습니다:

### <strong>6.1.1. 오픈소스 컴포넌트</strong>

<strong>CUDA Toolkit의 일부:</strong>

CUDA Samples: GitHub에 완전 공개 (github.com/NVIDIA/cuda-samples)

Thrust: C++ 템플릿 라이브러리, Apache 2.0 라이선스로 공개

CUB (CUDA Unbound): 블록 수준 병렬 프리미티브 라이브러리

CUTLASS: Tensor Core 연산을 위한 고성능 템플릿 라이브러리 (BSD 3-Clause 라이선스)

<strong>NCCL (NVIDIA Collective Communications Library):</strong>

멀티 GPU 통신 라이브러리, BSD 3-Clause 라이선스로 소스코드 공개

경쟁사(AMD)도 이를 참고하여 RCCL을 개발했지만, 최적화 수준에서 차이 존재

<strong>TensorRT 일부: </strong>

추론 최적화 엔진의 일부 컴포넌트가 Apache 2.0으로 공개

### <strong>6.1.2. 비공개 컴포넌트</strong>

<strong>핵심 런타임 및 드라이버:</strong>

CUDA Driver: 완전 비공개 (클로즈드 소스)

CUDA Runtime API: 바이너리만 제공, 소스코드 비공개

NVCC 컴파일러: 내부 최적화 로직 비공개

<strong>최적화된 라이브러리:</strong>

cuDNN: 완전 비공개 (딥러닝 연산의 핵심 최적화 포함)

cuBLAS: 선형대수 라이브러리, 내부 알고리즘 비공개

TensorRT 핵심 엔진: 추론 최적화의 핵심 기술 비공개

<strong>하드웨어 인터페이스:</strong>

Tensor Core, RT Core 등 특수 하드웨어를 제어하는 저수준 API는 대부분 비공개

GPU 아키텍처별 최적화 방법론(Ampere, Hopper 등)은 내부 기밀

![image.png](/images/brunch/13/21.png)

### <strong>6.2. CUDA가 기술적 해자</strong><strong>가 되는 이유</strong>

기술적 해자란 경쟁자가 쉽게 복제하거나 따라잡기 어려운 기술적 장벽을 의미합니다. CUDA는 다음과 같은 다층적 방어막을 통해 NVIDIA의 시장 지배력을 보호합니다.

### <strong>6.2.1. 생태계 종속성 </strong>

<strong>소프트웨어 자산의 축적:              </strong>

전 세계 AI 연구자와 기업이 수백만 줄의 CUDA 코드를 이미 작성했습니다.

PyTorch, TensorFlow 등 주요 프레임워크가 CUDA/cuDNN에 깊이 통합되어 있습니다.

경쟁사 GPU(AMD, Intel)로 전환하려면 코드 재작성 + 성능 재최적화 + 검증 과정이 필요 → 전환 비용(Switching Cost)이 매우 높습니다.

<strong>교육 및 인력 시장:              </strong>

대학 교육, 온라인 강좌, 기술 문서가 모두 CUDA 중심으로 구성되어 있습니다.

AI 엔지니어의 90% 이상이 CUDA 경험을 보유하지만, AMD ROCm이나 Intel OneAPI 경험자는 극소수입니다.

기업은 이미 CUDA를 아는 인력을 채용하므로, 다른 플랫폼으로의 전환이 조직적으로 어렵습니다.

### <strong>6.2.2. 하드웨어-소프트웨어 통합 최적화</strong>

<strong>칩 설계부터 소프트웨어까지 일체형:</strong>

NVIDIA는 GPU 아키텍처를 설계할 때부터 CUDA 최적화를 고려합니다.

예: Tensor Core(하드웨어) + cuDNN(소프트웨어)의 조합은 Intel/AMD가 복제 불가능한 수준의 AI 연산 성능을 제공합니다.

경쟁사는 하드웨어를 만들어도, 이를 완벽히 활용하는 소프트웨어 스택 구축에 5~10년이 소요될 것으로 예상됩니다.

<strong>세대별 누적 최적화:</strong>

NVIDIA는 2006년 CUDA 출시 이후 "18년간" 최적화를 축적했습니다.

Kepler(2012) → Maxwell(2014) → Pascal(2016) → Volta(2017) → Turing(2018) → Ampere(2020) → Hopper(2022) → Blackwell(2024) 각 세대마다 CUDA 라이브러리가 함께 진화했습니다.

경쟁사가 최신 하드웨어를 출시해도, 소프트웨어 성숙도에서 10년 이상 뒤처진 상태입니다.

### <strong>6.2.3. 네트워크 효과 (Network Effect)</strong>

<strong>개발자 커뮤니티의 선순환:</strong>

더 많은 개발자가 CUDA를 사용 → 더 많은 오픈소스 라이브러리 생성 (Triton, Liger Kernel, FlashAttention 등)

더 많은 라이브러리 → CUDA가 더 강력해짐 → 더 많은 개발자 유입

이 선순환은 시장 후발주자가 깨기 거의 불가능합니다.

<strong>클라우드 제공업체의 표준화:</strong>

AWS, Azure, GCP 모두 NVIDIA GPU를 우선 지원합니다.

AWS의 자체 칩(Trainium, Inferentia)조차 CUDA 호환성을 염두에 두고 설계됩니다.

클라우드 인프라가 NVIDIA 중심으로 구축되면서, 기업은 CUDA 외 선택지가 거의 없습니다.

### <strong>6.2.4. 기술적 복잡성 (Technical Complexity)</strong>

![image.png](/images/brunch/13/22.png)

### <strong>6.2.5. 경쟁사의 실패 사례  </strong>

<strong>AMD ROCm:          </strong>

2016년 출시, CUDA 대항마로 기대받았으나 생태계 형성 실패

기술적으로는 유사하지만, PyTorch/TensorFlow 지원이 불완전하고 버그가 많음

2024년 기준 시장 점유율 5% 미만 (AI 워크로드 기준)

<strong>Intel OneAPI:</strong>

통합 프로그래밍 모델을 표방했으나, GPU 하드웨어 성능 자체가 NVIDIA 대비 부족

Arc GPU, Ponte Vecchio 등 하드웨어 출시 지연으로 소프트웨어 생태계 구축 실패

<strong>Google TPU + XLA:          </strong>

Google 내부에서는 성공했으나, 외부 생태계로 확산 실패

TensorFlow 의존성, JAX로의 전환 필요 등으로 인해 범용성 부족

결국 Google도 클라우드 서비스에서 NVIDIA GPU를 주력으로 제공

### <strong>6.3. CUDA 해자의 미래: 지속 가능성 분석</strong>

<strong>강화 요인 (CUDA 해자가 더 깊어지는 요인)</strong>

AI 수요 폭발: ChatGPT, LLaMA, Stable Diffusion 등 대규모 AI 모델은 모두 CUDA 기반으로 개발되어, NVIDIA 의존도가 오히려 증가하고 있습니다.

하드웨어 진화: Hopper(H100), Blackwell(B200) 등 신규 아키텍처가 출시될 때마다 CUDA는 함께 업그레이드되며, 경쟁사와의 격차가 더욱 벌어집니다.

Triton 등 신기술: OpenAI Triton, PyTorch 2.0의 torch.compile() 등은 오히려 CUDA 에코시스템을 강화하는 방향으로 작동합니다.

<strong>위협 요인 (CUDA 해자가 약화될 수 있는 요인)</strong>

오픈 표준의 등장: SYCL, OpenCL, Vulkan Compute 등 크로스 플랫폼 표준이 성숙하면 CUDA 종속성이 줄어들 가능성이 있습니다 (단, 현재는 성능 격차 존재).

규제 압력: 독점금지법 위반 가능성으로 CUDA 일부 기술의 강제 공개가 요구될 수 있습니다.

하드웨어 혁신: AMD, Intel이 획기적으로 우수한 하드웨어를 출시하고 소프트웨어에 대규모 투자를 지속한다면 장기적으로 시장 구도가 변할 수 있습니다 (10년 이상 소요 예상).

> CUDA는 단순한 소프트웨어가 아니라 "18년간 축적된 기술 자산 + 수백만 개발자의 네트워크 + 하드웨어-소프트웨어 통합 최적화"의 복합체입니다. 핵심 기술을 비공개로 유지하면서도 상위 레벨 도구를 공개하는 전략은 생태계를 확장하면서도 경쟁 우위를 유지하는 데 성공했습니다.  
> 경쟁사가 CUDA와 동등한 수준의 GPU 컴퓨팅 플랫폼을 구축하려면 최소 10년 이상의 시간과 수십억 달러의 투자가 필요할 것으로 추정됩니다. 이는 현대 기술 산업에서 가장 강력한 기술적 해자 중 하나입니다.

## 7. 글을 마무리 하며...

현재 AI 개발 현장에서는 많은 개발자들이 CUDA와 cuDNN의 설치를 지시받아 수행하지만, 이들 도구가 실제로 무엇이며 어떤 역할을 하는지에 대한 깊이 있는 이해 없이 Python API 수준의 사용법에만 집중하는 경향이 관찰됩니다.

이러한 접근 방식이 본질적으로 잘못되었다고 단정하기는 어렵습니다. Python과 같은 고수준 추상화 언어가 등장한 배경에는 개발 생산성 향상이라는 명확한 목적이 있으며, 추상화를 통한 효율성 증대는 현대 소프트웨어 공학의 핵심 원칙입니다.

그러나 AI 기술이 코드 생성 영역에서 인간을 능가하기 시작한 시점에서, 단순한 API 활용 능력만으로는 차별화된 경쟁력을 확보하기 어렵습니다. 기술 스택의 근본 원리와 작동 메커니즘에 대한 깊이 있는 이해가 개발자의 지속 가능한 가치를 결정하는 핵심 요소가 될 것입니다.
