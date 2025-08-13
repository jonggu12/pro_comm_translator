'use client'

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { MODEL_INFO } from "@/lib/premium"

type AnalysisResult = {
  purpose: string
  intent: string
  politeness: number
  confidence: number
  analysis: {
    detectedEmotions: string[]
    emotionIntensity: string
    contextClues: string[]
    reasoning: string
  }
  alternativeOptions?: Array<{
    purpose?: string
    intent?: string
    politeness?: number
    reason: string
  }>
}

type Props = {
  before?: string
  result?: { 
    revision: string
    tips?: string[]
    subject?: string
    summary?: string
    analysis?: AnalysisResult
    needsConfirmation?: boolean
    modelUsed?: string // 🆕 사용된 모델 정보
  } | null
  onConfirmAnalysis?: (confirmed: AnalysisResult) => void
  transformSettings?: {
    purpose: string
    intent: string
    politeness: number
    smartMode: boolean
    model?: string // 🆕 사용자가 선택한 모델
  }
}

const PURPOSES_MAP = {
  email: "이메일", report: "보고서", memo: "메모", 
  messenger: "메신저", minutes: "회의록"
}

const INTENTS_MAP = {
  request: "요청", decline: "거절", rebuttal: "반박/이견",
  apology: "사과", persuade: "설득", notice: "공지/통지",
  escalation: "에스컬레이션"
}

export default function Result({ before, result, onConfirmAnalysis, transformSettings }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false)

  // 세션 ID 생성 (브라우저 새로고침 시까지 유지)
  const sessionId = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)[0]

  const copy = async () => {
    if (!result?.revision) return
    await navigator.clipboard.writeText(result.revision)
    alert("복사되었습니다.")
  }

  const saveImage = async () => {
    if (!ref.current) return
    const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'before-after.png'
    a.click()
  }

  const handleConfirmAnalysis = () => {
    if (result?.analysis && onConfirmAnalysis) {
      onConfirmAnalysis(result.analysis)
    }
  }

  // 피드백 제출 함수
  const submitFeedback = async (
    rating: "satisfied" | "needs_improvement", 
    feedbackType?: string, 
    comment?: string
  ) => {
    if (!result || !before || !transformSettings) return

    setFeedbackLoading(true)
    
    try {
      const feedbackData = {
        sessionId,
        originalText: before,
        transformedText: result.revision,
        transformSettings: {
          ...transformSettings,
          analysisResult: result.analysis
        },
        rating,
        feedbackType: feedbackType as any,
        comment
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      })

      const data = await res.json()
      
      if (data.ok) {
        setFeedbackSubmitted(true)
        console.log("피드백 제출 완료:", data.data.feedbackId)
      } else {
        console.error("피드백 제출 실패:", data.error)
        alert("피드백 제출에 실패했습니다.")
      }
    } catch (e) {
      console.error("피드백 제출 오류:", e)
      alert("피드백 제출 중 오류가 발생했습니다.")
    } finally {
      setFeedbackLoading(false)
    }
  }

  if (!result) return null

  // 분석 확인이 필요한 경우
  if (result.needsConfirmation && result.analysis) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🤔</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">AI 분석 결과 확인 필요</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
                분석 신뢰도가 {Math.round(result.analysis.confidence * 100)}%로 낮아 설정을 확인해주세요.
              </p>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">문서 목적:</span>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{PURPOSES_MAP[result.analysis.purpose as keyof typeof PURPOSES_MAP]}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">의도:</span>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{INTENTS_MAP[result.analysis.intent as keyof typeof INTENTS_MAP]}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">정중함:</span>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {result.analysis.politeness === 1 ? "간결" : 
                       result.analysis.politeness === 2 ? "정중" : "매우 조심"}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <strong>분석 근거:</strong> {result.analysis.analysis.reasoning}
                </div>
                
                {result.analysis.analysis.detectedEmotions.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>감지된 감정:</strong> {result.analysis.analysis.detectedEmotions.join(', ')}
                    <span className="ml-2 text-red-500 dark:text-red-400">
                      ({result.analysis.analysis.emotionIntensity === 'high' ? '강함' : 
                        result.analysis.analysis.emotionIntensity === 'medium' ? '보통' : '약함'})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleConfirmAnalysis}
                  className="bg-amber-600 dark:bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-700 dark:hover:bg-amber-400 text-sm">
                  이 설정으로 변환하기
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="border border-amber-600 dark:border-amber-400 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-sm">
                  수동으로 다시 설정
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // 정상 변환 결과 표시
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={copy} className="rounded-lg border dark:border-gray-600 px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">복사</button>
        <button onClick={saveImage} className="rounded-lg border dark:border-gray-600 px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Before/After 이미지 저장</button>
        {result.analysis && (
          <button 
            onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
            className="rounded-lg border dark:border-gray-600 px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800">
            {showAnalysisDetails ? "분석 숨기기" : "분석 보기"}
          </button>
        )}
      </div>

      {/* AI 분석 결과 표시 (스마트 모드인 경우) */}
      {showAnalysisDetails && result.analysis && (
        <div className="rounded-xl border dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">AI 분석 결과</h3>
            <span className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              신뢰도 {Math.round(result.analysis.confidence * 100)}%
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-blue-600 dark:text-blue-400">문서 목적:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">{PURPOSES_MAP[result.analysis.purpose as keyof typeof PURPOSES_MAP]}</div>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">의도:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">{INTENTS_MAP[result.analysis.intent as keyof typeof INTENTS_MAP]}</div>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">정중함:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {result.analysis.politeness === 1 ? "간결" : 
                 result.analysis.politeness === 2 ? "정중" : "매우 조심"}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <div><strong>분석 근거:</strong> {result.analysis.analysis.reasoning}</div>
            {result.analysis.analysis.detectedEmotions.length > 0 && (
              <div>
                <strong>감지된 감정:</strong> {result.analysis.analysis.detectedEmotions.join(', ')}
                <span className="ml-2 text-red-600 dark:text-red-400">
                  ({result.analysis.analysis.emotionIntensity === 'high' ? '강함' : 
                    result.analysis.analysis.emotionIntensity === 'medium' ? '보통' : '약함'})
                </span>
              </div>
            )}
            {result.analysis.analysis.contextClues.length > 0 && (
              <div><strong>문맥 단서:</strong> {result.analysis.analysis.contextClues.join(', ')}</div>
            )}
          </div>
        </div>
      )}

      <div ref={ref} className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">원문 (Before)</div>
          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{before}</p>
        </div>
        <div className="rounded-xl border dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">변환 결과 (After)</div>
            <div className="flex items-center space-x-2">
              {result.analysis && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                  🤖 AI 분석 적용
                </div>
              )}
              {result.modelUsed && (
                <div className={`text-xs px-2 py-1 rounded ${
                  result.modelUsed === "gpt-4o" 
                    ? 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200' 
                    : 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                }`}>
                  {result.modelUsed === "gpt-4o" ? "🌟 GPT-4o" : "⚡ GPT-4o Mini"}
                </div>
              )}
            </div>
          </div>
          {result.subject && <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">✉️ {result.subject}</div>}
          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{result.revision}</p>
          {result.summary && (
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
              <strong>요약:</strong> {result.summary}
            </div>
          )}
          {result.tips && result.tips.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
              {result.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* 🆕 피드백 시스템 */}
      {transformSettings && !feedbackSubmitted && (
        <div className="rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-4">
          <div className="flex items-start space-x-3">
            <div className="text-xl">💬</div>
            <div className="flex-1">
              <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2">번역 결과가 어떠셨나요?</h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
                여러분의 피드백으로 AI 프롬프트를 지속적으로 개선해나갑니다.
              </p>
              
              <div className="flex space-x-3 mb-3">
                <button
                  onClick={() => submitFeedback("satisfied")}
                  disabled={feedbackLoading}
                  className="inline-flex items-center space-x-2 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-400 disabled:opacity-50 text-sm">
                  <span>👍</span>
                  <span>만족해요</span>
                </button>
                <button
                  onClick={() => setShowDetailedFeedback(true)}
                  disabled={feedbackLoading}
                  className="inline-flex items-center space-x-2 bg-orange-600 dark:bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-400 disabled:opacity-50 text-sm">
                  <span>🔧</span>
                  <span>개선이 필요해요</span>
                </button>
              </div>

              {feedbackLoading && (
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  피드백을 제출하는 중...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 상세 피드백 모달 */}
      {showDetailedFeedback && (
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-4">
          <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-3">어떤 부분을 개선하면 좋을까요?</h3>
          
          <div className="space-y-2 mb-4">
            {[
              { value: "tone", label: "톤/어조가 적절하지 않음" },
              { value: "accuracy", label: "의도 파악이 부정확함" },
              { value: "naturalness", label: "자연스럽지 않은 표현" },
              { value: "length", label: "너무 길거나 짧음" },
              { value: "other", label: "기타" }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => {
                  submitFeedback("needs_improvement", option.value)
                  setShowDetailedFeedback(false)
                }}
                disabled={feedbackLoading}
                className="block w-full text-left p-2 rounded border border-orange-200 dark:border-orange-600 bg-white dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-800/30 disabled:opacity-50 text-sm text-gray-900 dark:text-gray-100">
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setShowDetailedFeedback(false)}
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 피드백 완료 메시지 */}
      {feedbackSubmitted && (
        <div className="rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400">✅</span>
            <span className="text-green-800 dark:text-green-200 text-sm font-medium">
              소중한 피드백 감사합니다! AI 개선에 활용하겠습니다.
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
