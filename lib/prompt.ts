type Context = {
  purpose: "email" | "report" | "memo" | "messenger" | "minutes"
  intent: "request" | "decline" | "rebuttal" | "apology" | "persuade" | "notice" | "escalation"
  politeness: 1 | 2 | 3
  language: "ko" | "en"
}

export function makeSystemPrompt(ctx: Context) {
  const baseKo = `너는 한국 직장 문화에 익숙한 '비즈니스 커뮤니케이션 코치'다.
규칙:
1) 욕설·비속어·감정적 표현 제거, 사실 중심으로 재서술
2) 핵심 메시지는 유지하되, 책임 전가·비난·모호한 요구 금지
3) 존댓말, 간결한 문장, 수동태 과다 사용 지양
4) 이메일의 경우 제목 제안 포함
5) 150자 내외를 우선 고민하되, 내용이 길면 단락과 불릿으로 정리
6) 결과는 반드시 사용자에게 바로 사용 가능한 완성본으로 제공
`

  const baseEn = `You are a business communication coach experienced with Korean corporate etiquette.
Rules:
1) Remove profanity and emotional language, rephrase with facts
2) Preserve core message; avoid blame; be specific about requests/next steps
3) Use polite, concise sentences; avoid excessive passive voice
4) If email, include a subject line suggestion
5) Prefer ~150 characters where possible; use bullets for longer content
6) Output must be ready-to-send
`

  const politenessMap: Record<1|2|3, string> = {
    1: "톤: 간결·직설. 불필요한 정중 표현 최소화.",
    2: "톤: 표준 비즈니스 정중체. 완곡하고 협력적인 인상.",
    3: "톤: 매우 조심스럽고 공손. 고객사·상급자 대상.",
  }

  const purposeHints: Record<Context['purpose'], string> = {
    email: "형식: 제목/본문. 맺음말 포함(감사·서명).",
    report: "형식: 개요-사실-결론-요청 순.",
    memo: "형식: 한 문단 요약 + 불릿 2~3개.",
    messenger: "형식: 1~3문장. 너무 장황하지 않게.",
    minutes: "형식: 안건/논의/결정/액션아이템(담당·기한).",
  }

  const intentHints: Record<Context['intent'], string> = {
    request: "의도: 구체적 요청(기한/형식/담당 포함).",
    decline: "의도: 대안 제시 또는 사유 명확화, 갈등 최소화.",
    rebuttal: "의도: 사실 기반 이견 표명 + 제안.",
    apology: "의도: 책임 인정, 재발 방지, 보완 조치.",
    persuade: "의도: 근거 제시 + 기대효과 + 다음 단계.",
    notice: "의도: 사실 통지 + 필요한 후속 행동.",
    escalation: "의도: 리스크와 영향 명확화 + 지원 요청.",
  }

  const locale = ctx.language === "ko" ? baseKo : baseEn
  const header = [
    locale,
    politenessMap[ctx.politeness],
    purposeHints[ctx.purpose],
    intentHints[ctx.intent]
  ].join("\n")

  return header
}

export function makeUserPrompt(raw: string, ctx: Context) {
  return `[원문] 
${raw}

[출력 형식(JSON)]
{
  "revision": "<정중한 비즈니스 문장>",
  "tips": ["<개선 이유 또는 커뮤니케이션 팁>", "..."],
  "subject": "<이메일일 경우 제목 제안, 아니면 빈 문자열>",
  "summary": "<한 줄 요약>"
}

주의: 반드시 유효한 JSON만 출력.
모든 키를 반드시 포함하세요(revision, tips, subject, summary).
값이 없으면 빈 문자열("") 또는 빈 배열([])을 넣으세요.`
}

// 🆕 Smart Mode용 분석 프롬프트
export function makeAnalysisSystemPrompt() {
  return `너는 한국 직장 문화를 깊이 이해하는 텍스트 분석 전문가다.
사용자가 입력한 텍스트를 분석해서 다음을 정확히 판단해야 한다:

1) **문서 목적 (purpose)**: 어떤 종류의 문서인가?
   - email: 이메일 (받는 사람이 명시되거나 공식적 소통)
   - report: 보고서 (상황 보고, 결과 공유, 분석 내용)
   - memo: 메모/공지 (간단한 전달사항, 안내)
   - messenger: 메신저/채팅 (짧고 즉석에서 나눈 대화)
   - minutes: 회의록 (회의 내용, 결정사항, 액션아이템)

2) **의도 (intent)**: 무엇을 원하는가?
   - request: 요청 (뭔가를 해달라고 요구)
   - decline: 거절 (요청을 받아들일 수 없음)
   - rebuttal: 반박/이견 (다른 의견 제시)
   - apology: 사과 (잘못을 인정하고 사과)
   - persuade: 설득 (상대방을 납득시키려 함)
   - notice: 공지/통지 (정보를 알려줌)
   - escalation: 에스컬레이션 (상위자에게 도움 요청)

3) **정중함 레벨 (politeness)**: 얼마나 조심스럽게 써야 하는가?
   - 1: 간결/직설적 (동료나 친한 사이)
   - 2: 표준 비즈니스 정중함 (일반적인 업무 관계)
   - 3: 매우 조심스러운 톤 (고객이나 상급자)

4) **신뢰도 (confidence)**: 분석에 얼마나 확신하는가? (0.0-1.0)
   - 0.8-1.0: 매우 확실 (명확한 맥락과 의도)
   - 0.6-0.7: 보통 (일부 애매한 부분 있음) 
   - 0.0-0.5: 낮음 (모호하거나 복잡한 상황)

분석할 때 다음 요소들을 고려하라:
- 감정적 표현의 강도
- 문맥상 단서 (수신자, 상황, 톤)
- 한국 직장 문화의 위계질서와 예의
- 텍스트의 길이와 형식적 특징

반드시 정확하고 객관적으로 분석하되, 불확실하면 confidence를 낮춰라.`
}

export function makeAnalysisUserPrompt(text: string) {
  return `다음 텍스트를 분석해서 적절한 비즈니스 변환 설정을 제안해주세요:

[분석할 텍스트]
${text}

[출력 형식]
purpose, intent, politeness, confidence, analysis 정보를 정확히 JSON으로 출력하세요.
analysis 객체에는 detectedEmotions, emotionIntensity, contextClues, reasoning을 포함하세요.`
}

// 🆕 Enhanced 변환 프롬프트 (분석 결과 활용)
export function makeEnhancedSystemPrompt(ctx: Context, analysisInfo: any) {
  const basePrompt = makeSystemPrompt(ctx)
  
  const enhancedGuidance = `

[AI 분석 결과 반영]
- 감지된 감정: ${analysisInfo.detectedEmotions?.join(', ') || '없음'}
- 감정 강도: ${analysisInfo.emotionIntensity || '보통'}
- 분석 근거: ${analysisInfo.reasoning || ''}

위 분석을 바탕으로 다음 사항을 특히 주의하여 변환하라:
1) 감정적 표현은 사실 기반으로 중립화
2) 강한 감정일수록 더 신중하고 전문적인 톤 적용
3) 분석된 의도와 목적에 최적화된 구조로 재작성
4) 한국 직장 문화에 맞는 적절한 경어와 표현 사용`

  return basePrompt + enhancedGuidance
}

export function makeEnhancedUserPrompt(text: string, ctx: Context, analysisResult: any) {
  return `[원문]
${text}

[AI 분석 결과]
- 문서 목적: ${ctx.purpose}
- 의도: ${ctx.intent}  
- 정중함: ${ctx.politeness}
- 신뢰도: ${Math.round(analysisResult.confidence * 100)}%

위 분석에 따라 최적의 비즈니스 문장으로 변환해주세요.

[출력 형식(JSON)]
{
  "revision": "<정중한 비즈니스 문장>",
  "tips": ["<개선 이유 또는 커뮤니케이션 팁>", "..."],
  "subject": "<이메일일 경우 제목 제안, 아니면 빈 문자열>",
  "summary": "<한 줄 요약>"
}

주의: 반드시 유효한 JSON만 출력.
모든 키를 반드시 포함하세요(revision, tips, subject, summary).
값이 없으면 빈 문자열("") 또는 빈 배열([])을 넣으세요.`
}
