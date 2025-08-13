import { z } from "zod"

export const TransformRequestSchema = z.object({
  text: z.string().min(1, "텍스트를 입력해주세요").max(500, "텍스트는 500자를 초과할 수 없습니다"),
  purpose: z.enum(["email", "report", "memo", "messenger", "minutes"]).optional(),
  intent: z.enum(["request", "decline", "rebuttal", "apology", "persuade", "notice", "escalation"]).optional(),
  politeness: z.number().int().min(1).max(3).optional(),
  tonePreset: z.string().default("default"),
  language: z.enum(["ko", "en"]).default("ko"),
  smartMode: z.boolean().default(false), // 새로운 스마트 모드 플래그
  model: z.enum(["gpt-4o-mini", "gpt-4o"]).default("gpt-4o-mini"), // 🆕 모델 선택
  premium: z.boolean().default(false), // 🆕 프리미엄 사용자 여부
})

export type TransformRequest = z.infer<typeof TransformRequestSchema>

// 분석 결과 스키마
export const AnalysisResultSchema = z.object({
  purpose: z.enum(["email", "report", "memo", "messenger", "minutes"]),
  intent: z.enum(["request", "decline", "rebuttal", "apology", "persuade", "notice", "escalation"]),
  politeness: z.number().int().min(1).max(3),
  confidence: z.number().min(0).max(1),
  analysis: z.object({
    detectedEmotions: z.array(z.string()),
    emotionIntensity: z.enum(["high", "medium", "low"]),
    contextClues: z.array(z.string()),
    reasoning: z.string()
  }),
  alternativeOptions: z.array(z.object({
    purpose: z.enum(["email", "report", "memo", "messenger", "minutes"]).optional(),
    intent: z.enum(["request", "decline", "rebuttal", "apology", "persuade", "notice", "escalation"]).optional(),
    politeness: z.number().int().min(1).max(3).optional(),
    reason: z.string()
  })).optional()
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// 🆕 피드백 스키마
export const FeedbackRequestSchema = z.object({
  sessionId: z.string().min(1), // 세션 고유 ID
  originalText: z.string().min(1),
  transformedText: z.string().min(1),
  transformSettings: z.object({
    purpose: z.string(),
    intent: z.string(),
    politeness: z.number(),
    smartMode: z.boolean(),
    analysisResult: AnalysisResultSchema.optional()
  }),
  rating: z.enum(["satisfied", "needs_improvement"]), // 만족/개선필요
  feedbackType: z.enum(["tone", "accuracy", "naturalness", "length", "other"]).optional(),
  comment: z.string().max(500).optional(), // 선택적 상세 피드백
  timestamp: z.string().optional() // ISO timestamp
})

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>

export const FeedbackResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    feedbackId: z.string(),
    message: z.string()
  })
}).or(z.object({
  ok: z.literal(false),
  error: z.string()
}))

export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>

export const TransformResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    revision: z.string(),
    tips: z.array(z.string()).default([]),
    subject: z.string().optional(),
    summary: z.string().optional(),
    analysis: AnalysisResultSchema.optional(), // 분석 결과 추가
  }),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
  }).optional()
}).or(z.object({
  ok: z.literal(false),
  error: z.string()
}))

export type TransformResponse = z.infer<typeof TransformResponseSchema>
