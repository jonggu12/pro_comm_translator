// app/api/transform/route.ts
import { NextRequest } from "next/server"
import OpenAI from "openai"
import { TransformRequestSchema, AnalysisResultSchema } from "@/lib/schema"
import { 
  makeSystemPrompt, 
  makeUserPrompt, 
  makeAnalysisSystemPrompt, 
  makeAnalysisUserPrompt,
  makeEnhancedSystemPrompt,
  makeEnhancedUserPrompt 
} from "@/lib/prompt"
import { getUserTier, canUseModel, validatePremiumKey } from "@/lib/premium"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = TransformRequestSchema.safeParse(json)
    if (!parsed.success) {
      return Response.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 })
    }

    const { text, purpose, intent, politeness, language, smartMode, model, premium } = parsed.data

    // 🆕 프리미엄 권한 확인
    const userTier = premium ? "premium" : "free"
    
    // 🆕 모델 사용 권한 체크
    if (!canUseModel(model, userTier)) {
      return Response.json({ 
        ok: false, 
        error: `${model} 모델을 사용할 권한이 없습니다. 프리미엄 구독이 필요합니다.` 
      }, { status: 403 })
    }

    // 🆕 모델별 비용 추적 (로깅용)
    const startTime = Date.now()
    console.log(`🤖 API 호출: ${model} | 사용자: ${userTier} | 길이: ${text.length}자`)

    // smartMode가 true이거나 설정값이 없으면 2단계 프로세스 실행
    if (smartMode || !purpose || !intent || !politeness) {
      return await handleSmartTransform(text, language, model, purpose, intent, politeness)
    } else {
      // 기존 1단계 프로세스
      return await handleDirectTransform(text, { purpose, intent, politeness, language }, model)
    }
  } catch (e: any) {
    console.error(e)
    return Response.json({ ok: false, error: e?.message || "서버 오류가 발생했습니다." }, { status: 500 })
  }
}

// 2단계 프로세스: 분석 → 변환
async function handleSmartTransform(
  text: string, 
  language: "ko" | "en", 
  model: string,
  fallbackPurpose?: string,
  fallbackIntent?: string, 
  fallbackPoliteness?: number
) {
  try {
    console.log(`🔍 1단계 분석 시작: ${model}`)
    
    // 1단계: 자동 분석
    const analysisSystem = makeAnalysisSystemPrompt()
    const analysisUser = makeAnalysisUserPrompt(text)

    const analysisRes = await openai.responses.create({
      model, // 🆕 사용자가 선택한 모델 사용
      input: [
        { role: "system", content: analysisSystem },
        { role: "user", content: analysisUser },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "AnalysisResult",
          schema: {
            type: "object",
            properties: {
              purpose: { 
                type: "string", 
                enum: ["email", "report", "memo", "messenger", "minutes"] 
              },
              intent: { 
                type: "string", 
                enum: ["request", "decline", "rebuttal", "apology", "persuade", "notice", "escalation"] 
              },
              politeness: { type: "integer", minimum: 1, maximum: 3 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              analysis: {
                type: "object",
                properties: {
                  detectedEmotions: { type: "array", items: { type: "string" } },
                  emotionIntensity: { type: "string", enum: ["high", "medium", "low"] },
                  contextClues: { type: "array", items: { type: "string" } },
                  reasoning: { type: "string" }
                },
                required: ["detectedEmotions", "emotionIntensity", "contextClues", "reasoning"]
              },
              alternativeOptions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    purpose: { type: "string" },
                    intent: { type: "string" },
                    politeness: { type: "integer" },
                    reason: { type: "string" }
                  }
                }
              }
            },
            required: ["purpose", "intent", "politeness", "confidence", "analysis"],
            additionalProperties: false
          },
          strict: true
        }
      }
    })

    let analysisResult: any
    try {
      analysisResult = JSON.parse(analysisRes.output_text || "{}")
    } catch {
      // 분석 실패시 폴백값 사용
      analysisResult = {
        purpose: fallbackPurpose || "email",
        intent: fallbackIntent || "request", 
        politeness: fallbackPoliteness || 2,
        confidence: 0.5,
        analysis: {
          detectedEmotions: [],
          emotionIntensity: "medium",
          contextClues: ["자동 분석 실패"],
          reasoning: "자동 분석에 실패하여 기본값을 사용합니다."
        }
      }
    }

    // 신뢰도가 낮으면 사용자 확인 필요 응답
    if (analysisResult.confidence < 0.7) {
      return Response.json({ 
        ok: true, 
        data: {
          needsConfirmation: true,
          analysis: analysisResult,
          revision: "",
          tips: ["분석 신뢰도가 낮아 설정을 확인해주세요."],
          subject: "",
          summary: "",
          modelUsed: model // 🆕 사용된 모델 정보
        }
      })
    }

    console.log(`🔄 2단계 변환 시작: ${model}`)

    // 2단계: 분석 결과로 변환 실행
    const ctx = {
      purpose: analysisResult.purpose,
      intent: analysisResult.intent,
      politeness: analysisResult.politeness,
      language
    }

    const transformSystem = makeEnhancedSystemPrompt(ctx, analysisResult.analysis)
    const transformUser = makeEnhancedUserPrompt(text, ctx, analysisResult)

    const transformRes = await openai.responses.create({
      model, // 🆕 사용자가 선택한 모델 사용
      input: [
        { role: "system", content: transformSystem },
        { role: "user", content: transformUser },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "TransformResponse",
          schema: {
            type: "object",
            properties: {
              revision: { type: "string" },
              tips: { type: "array", items: { type: "string" } },
              subject: { type: "string" },
              summary: { type: "string" }
            },
            required: ["revision", "tips", "subject", "summary"],
            additionalProperties: false
          },
          strict: true
        }
      }
    })

    let transformData: any
    try {
      transformData = JSON.parse(transformRes.output_text || "{}")
    } catch {
      transformData = { 
        revision: (transformRes.output_text || "").trim(), 
        tips: [], 
        subject: "", 
        summary: "" 
      }
    }

    const endTime = Date.now()
    console.log(`✅ 변환 완료: ${model} | 소요시간: ${endTime - Date.now()}ms`)

    return Response.json({ 
      ok: true, 
      data: {
        ...transformData,
        analysis: analysisResult, // 분석 결과도 함께 반환
        needsConfirmation: false,
        modelUsed: model // 🆕 사용된 모델 정보
      }
    })

  } catch (e: any) {
    console.error("Smart transform error:", e)
    // 스마트 모드 실패시 기본 설정으로 폴백
    const ctx = {
      purpose: fallbackPurpose || "email" as const,
      intent: fallbackIntent || "request" as const,
      politeness: fallbackPoliteness || 2 as const,
      language
    }
    return await handleDirectTransform(text, ctx, model)
  }
}

// 기존 1단계 프로세스 (변경 없음)
async function handleDirectTransform(
  text: string,
  ctx: { purpose: string, intent: string, politeness: number, language: "ko" | "en" },
  model: string
) {
  console.log(`🚀 직접 변환: ${model}`)
  
  const system = makeSystemPrompt({ 
    purpose: ctx.purpose as any, 
    intent: ctx.intent as any, 
    politeness: ctx.politeness as any, 
    language: ctx.language 
  })
  const user = makeUserPrompt(text, { 
    purpose: ctx.purpose as any, 
    intent: ctx.intent as any, 
    politeness: ctx.politeness as any, 
    language: ctx.language 
  })

  const startTime = Date.now()
  
  const res = await openai.responses.create({
    model, // 🆕 사용자가 선택한 모델 사용
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "TransformResponse",
        schema: {
          type: "object",
          properties: {
            revision: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            subject: { type: "string" },
            summary: { type: "string" }
          },
          required: ["revision", "tips", "subject", "summary"],
          additionalProperties: false
        },
        strict: true
      }
    }
  })

  let data: any
  try {
    data = JSON.parse(res.output_text || "{}")
  } catch {
    data = { 
      revision: (res.output_text || "").trim(), 
      tips: [], 
      subject: "", 
      summary: "" 
    }
  }

  const endTime = Date.now()
  console.log(`✅ 직접 변환 완료: ${model} | 소요시간: ${endTime - startTime}ms`)

  return Response.json({ 
    ok: true, 
    data: {
      ...data,
      modelUsed: model // 🆕 사용된 모델 정보
    }
  })
}
