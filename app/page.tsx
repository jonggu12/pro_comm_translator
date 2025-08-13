'use client'

import { useState } from "react"
import Header from "@/components/Header"
import Controls from "@/components/Controls"
import Result from "@/components/Result"
import TranslatorLayout from "@/components/TranslatorLayout"

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

type ApiResult = {
  ok: boolean
  data?: { 
    revision: string
    tips?: string[]
    subject?: string
    summary?: string
    analysis?: AnalysisResult
    needsConfirmation?: boolean
  }
  error?: string
}

export default function Page() {
  const [busy, setBusy] = useState(false)
  const [before, setBefore] = useState<string>("")
  const [result, setResult] = useState<ApiResult["data"] | null>(null)
  const [pendingText, setPendingText] = useState<string>("") // 분석 확인 대기 중인 텍스트
  const [transformSettings, setTransformSettings] = useState<any>(null) // 변환 설정 저장

  const handleSubmit = async (payload: any) => {
    setBusy(true)
    setBefore(payload.text)
    setPendingText(payload.text) // 분석 확인용으로 텍스트 저장
    setResult(null)
    
    // 변환 설정 저장 (피드백에 사용)
    setTransformSettings({
      purpose: payload.purpose || "unknown",
      intent: payload.intent || "unknown", 
      politeness: payload.politeness || 2,
      smartMode: payload.smartMode || false,
      model: payload.model || "gpt-4o-mini" // 🆕 모델 정보 추가
    })
    
    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (data.ok) {
        setResult(data.data)
        
        // 스마트 모드에서 성공적으로 분석된 경우 설정 업데이트
        if (data.data.analysis && !data.data.needsConfirmation) {
          setTransformSettings({
            purpose: data.data.analysis.purpose,
            intent: data.data.analysis.intent,
            politeness: data.data.analysis.politeness,
            smartMode: true,
            model: payload.model || "gpt-4o-mini" // 🆕 모델 정보 유지
          })
        }
      } else {
        alert(data.error || "오류가 발생했습니다.")
      }
    } catch (e: any) {
      alert(e?.message || "네트워크 오류")
    } finally {
      setBusy(false)
    }
  }

  // 분석 확인 후 재변환 처리
  const handleConfirmAnalysis = async (confirmedAnalysis: AnalysisResult) => {
    setBusy(true)
    
    try {
      const originalModel = transformSettings?.model || "gpt-4o-mini"
      
      const payload = {
        text: pendingText,
        purpose: confirmedAnalysis.purpose,
        intent: confirmedAnalysis.intent,
        politeness: confirmedAnalysis.politeness,
        language: "ko", // 기본값
        smartMode: false, // 확정된 설정으로 직접 변환
        model: originalModel, // 🆕 원래 선택한 모델 유지
        premium: transformSettings?.model === "gpt-4o" // 🆕 프리미엄 여부
      }
      
      // 확정된 변환 설정 업데이트
      setTransformSettings({
        purpose: confirmedAnalysis.purpose,
        intent: confirmedAnalysis.intent,
        politeness: confirmedAnalysis.politeness,
        smartMode: true, // 원래는 스마트 모드였음
        model: originalModel // 🆕 모델 정보 유지
      })
      
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (data.ok) {
        setResult({
          ...data.data,
          analysis: confirmedAnalysis // 확정된 분석 결과 포함
        })
      } else {
        alert(data.error || "오류가 발생했습니다.")
      }
    } catch (e: any) {
      alert(e?.message || "네트워크 오류")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">분노 → 비즈니스, 한 번에</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            감정적인 문장을 업무에 바로 쓸 수 있는 정중한 문장으로 바꿔드립니다. 
            <span className="font-medium text-blue-600"> 🤖 스마트 모드</span>에서는 AI가 자동으로 목적과 의도를 분석해서 최적의 변환을 제공합니다.
            <span className="font-medium text-purple-600"> 🌟 GPT-4o 프리미엄</span>으로 더욱 정확하고 자연스러운 결과를 얻으세요.
          </p>
        </div>

        <TranslatorLayout 
          busy={busy} 
          onSubmit={handleSubmit}
          result={result && !result.needsConfirmation ? result : null}
        />

        {result && result.needsConfirmation && (
          <Result 
            before={before} 
            result={result} 
            onConfirmAnalysis={handleConfirmAnalysis}
            transformSettings={transformSettings}
          />
        )}
        
        {result && !result.needsConfirmation && result.analysis && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI 분석 결과</span>
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400">문서 목적:</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">{result.analysis.purpose}</div>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">의도:</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">{result.analysis.intent}</div>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">정중함:</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {result.analysis.politeness === 1 ? "간결" : 
                   result.analysis.politeness === 2 ? "정중" : "매우 조심"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
