# 📋 직장인 커뮤니케이션 번역기 — MVP

> "내 속은 썩어도, 내 평판은 프로"

Next.js(App Router) + Tailwind + OpenAI(Responses API).  
**기능**: 감정문 입력 → 🤖 **AI 자동 분석** 또는 수동 설정 → 비즈니스 톤으로 변환 + 개선 팁.

## 🚀 새로운 스마트 모드
- **2단계 프로세스**: 1) AI가 텍스트 분석 → 2) 최적 설정으로 자동 변환
- **자동 분석**: 문서 목적, 의도, 정중함 레벨을 AI가 판단
- **신뢰도 기반**: 분석 신뢰도가 낮으면 사용자 확인 후 진행
- **기존 호환**: 수동 설정 모드도 그대로 유지

## 💬 피드백 시스템
- **만족도 수집**: 변환 결과에 대한 '만족/개선 필요' 피드백
- **상세 분류**: 톤/정확도/자연스러움/길이 등 개선 영역 선택
- **데이터 분석**: 피드백 데이터로 AI 프롬프트 지속 개선
- **관리자 대시보드**: `/admin` 페이지에서 피드백 통계 및 분석 확인

## 🌟 프리미엄 모델 선택
- **GPT-4o Mini**: 빠르고 효율적인 표준 모델 (무료 사용자)
- **GPT-4o**: 최고 품질의 프리미엄 모델 (프리미엄 사용자)
- **모델별 사용량**: Free 5회/일, Premium 50회/일 (GPT-4o Mini), 10회/일 (GPT-4o)
- **권한 관리**: 프리미엄 키 입력으로 고품질 모델 사용 가능
- **비용 최적화**: 모델별 토큰 사용량 및 응답 시간 추적

## ⚙️ 빠른 시작

```bash
pnpm i # or npm i / yarn
cp .env.example .env.local  # OPENAI_API_KEY 채우기
pnpm dev
```

- 기본 모델: `gpt-4o-mini` (환경변수로 변경 가능)
- 서버 엔드포인트: `POST /api/transform`

## 📡 API

### `POST /api/transform` - 텍스트 변환

Request JSON:
```json
{
  "text": "이 미친 클라...",
  "smartMode": true,           // 🆕 스마트 모드 (기본값: false)
  "model": "gpt-4o-mini",      // 🆕 모델 선택 (gpt-4o-mini | gpt-4o)
  "premium": false,            // 🆕 프리미엄 사용자 여부
  "purpose": "email",          // smartMode=false일 때 필수
  "intent": "request",         // smartMode=false일 때 필수  
  "politeness": 1,             // smartMode=false일 때 필수
  "tonePreset": "default",
  "language": "ko"
}
```

Response JSON:
```json
{
  "ok": true,
  "data": {
    "revision": "정중한 문장...",
    "tips": ["비난 표현 대신 사실 기반 서술..."],
    "subject": "제목 제안",
    "summary": "한줄 요약",
    "modelUsed": "gpt-4o",       // 🆕 실제 사용된 모델
    "analysis": {                // 🆕 스마트 모드 시 AI 분석 결과
      "purpose": "email",
      "intent": "request", 
      "politeness": 2,
      "confidence": 0.9,
      "analysis": {
        "detectedEmotions": ["anger"],
        "emotionIntensity": "high",
        "reasoning": "분석 근거..."
      }
    },
    "needsConfirmation": false   // 🆕 true면 사용자 확인 필요
  },
  "usage": { "inputTokens": 0, "outputTokens": 0 }
}
```

### `POST /api/feedback` - 피드백 제출

Request JSON:
```json
{
  "sessionId": "session_123...",
  "originalText": "원문",
  "transformedText": "변환된 텍스트",
  "transformSettings": {
    "purpose": "email",
    "intent": "request",
    "politeness": 2,
    "smartMode": true
  },
  "rating": "satisfied|needs_improvement",
  "feedbackType": "tone|accuracy|naturalness|length|other",
  "comment": "선택적 상세 피드백"
}
```

### `GET /api/feedback?key=ADMIN_KEY` - 피드백 조회 (관리자)

Response JSON:
```json
{
  "ok": true,
  "data": {
    "feedbacks": [...],
    "total": 42,
    "stats": {
      "satisfied": 30,
      "needs_improvement": 12
    }
  }
}
```

## 🧠 프롬프트 설계
- **2단계 프로세스**: 1단계 분석 → 2단계 변환으로 정확도 향상
- **자동 분석**: 감정 패턴, 의도, 문맥을 종합 분석하여 최적 설정 추천
- **신뢰도 기반 제어**: 분석 신뢰도 0.7 이상일 때만 자동 적용
- 한국형 비즈니스 톤 규칙 + 정중함(1~3단) 가이드
- 목적/의도별 **핵심 말뭉치**와 금칙어 처리
- **Structured output(JSON Schema)** 강제

## 🔒 제한(Free Tier 데모)
- 브라우저 로컬스토리지로 일 5회 제한(프리셋). 추후 Auth/DB로 대체.

## 📦 구조

```
app/
  api/
    transform/route.ts         # 🔄 2단계 프로세스 + 모델 선택 API
    feedback/route.ts          # 🆕 피드백 수집/조회 API
  admin/page.tsx               # 🆕 피드백 관리 대시보드
  layout.tsx
  page.tsx                     # 🔄 분석 확인 + 모델 정보 처리
components/
  Controls.tsx                 # 🔄 스마트 모드 + 모델 선택 UI
  Result.tsx                   # 🔄 AI 분석 결과 + 피드백 + 모델 표시
  Header.tsx
lib/
  prompt.ts                    # 🔄 분석/변환 프롬프트 함수들
  schema.ts                    # 🔄 분석 결과 + 피드백 + 모델 타입
  premium.ts                   # 🆕 프리미엄 권한 관리 시스템
public/
  templates.json
data/                          # 🆕 피드백 데이터 저장 (gitignore)
  feedback/feedback.jsonl
styles/
  globals.css
```

## 🧪 TIP
- 비용/속도는 `gpt-4o-mini`, 고품질은 `gpt-4o`로 전환해 테스트.
- 프롬프트는 `lib/prompt.ts`에서 튜닝.
- **스마트 모드**: 기본 활성화, 분석 신뢰도가 낮으면 수동 확인.
- **수동 모드**: 정확한 제어가 필요할 때 토글로 전환 가능.
- **피드백 관리**: `/admin?key=ADMIN_KEY`로 피드백 데이터 분석 가능.
- **데이터 개선**: 사용자 피드백으로 프롬프트 지속 개선 및 품질 향상.
- **프리미엄 키**: 데모 키 `premium_demo_2024`로 GPT-4o 체험 가능.
- **모델 비교**: 같은 텍스트로 Mini vs 4o 품질 차이 확인 권장.
