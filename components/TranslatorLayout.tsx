'use client'

import { useState, useEffect } from "react"
import { MODEL_INFO, getUserTier, canUseModel, checkUsageLimit, incrementUsage, resetUsageForDev } from "@/lib/premium"
import templates from "@/public/templates.json"

type Props = {
  onSubmit: (payload: any) => void
  busy?: boolean
  result?: any
}

type Purpose = "email" | "report" | "memo" | "messenger" | "minutes"
type Intent = "request" | "decline" | "rebuttal" | "apology" | "persuade" | "notice" | "escalation"

const PURPOSES: { value: Purpose, label: string }[] = [
  { value: "email", label: "이메일" },
  { value: "report", label: "보고서" },
  { value: "memo", label: "메모" },
  { value: "messenger", label: "메신저" },
  { value: "minutes", label: "회의록" },
]

const INTENTS: { value: Intent, label: string }[] = [
  { value: "request", label: "요청" },
  { value: "decline", label: "거절" },
  { value: "rebuttal", label: "반박/이견" },
  { value: "apology", label: "사과" },
  { value: "persuade", label: "설득" },
  { value: "notice", label: "공지/통지" },
  { value: "escalation", label: "에스컬레이션" },
]

export default function TranslatorLayout({ onSubmit, busy, result }: Props) {
  const [text, setText] = useState("")
  const [purpose, setPurpose] = useState<Purpose>("email")
  const [intent, setIntent] = useState<Intent>("request")
  const [politeness, setPoliteness] = useState(2)
  
  // Smart Mode & Model Selection
  const [smartMode, setSmartMode] = useState(true)
  const [selectedModel, setSelectedModel] = useState<"gpt-4o-mini" | "gpt-4o">("gpt-4o-mini")
  const [premiumKey, setPremiumKey] = useState("")
  const [showPremiumInput, setShowPremiumInput] = useState(false)
  
  // 프리미엄 키 로컬스토리지 복원
  useEffect(() => {
    const savedKey = localStorage.getItem('premium-key')
    if (savedKey) {
      setPremiumKey(savedKey)
    }
  }, [])
  
  // 프리미엄 키 저장
  useEffect(() => {
    if (premiumKey) {
      localStorage.setItem('premium-key', premiumKey)
    } else {
      localStorage.removeItem('premium-key')
    }
  }, [premiumKey])

  // 사용자 티어 및 모델별 사용량
  const userTier = getUserTier(premiumKey)
  const miniUsage = checkUsageLimit("gpt-4o-mini", userTier)
  const gpt4Usage = checkUsageLimit("gpt-4o", userTier)
  const currentUsage = selectedModel === "gpt-4o" ? gpt4Usage : miniUsage
  const canUseSelectedModel = canUseModel(selectedModel, userTier) && currentUsage.canUse

  const characterCount = text.length
  const isOverLimit = characterCount > 500
  const isNearLimit = characterCount > 450
  const isDev = process.env.NODE_ENV === 'development'

  const handleTemplate = (sample: string) => setText(sample)

  const handleSubmit = async () => {
    if (!text.trim()) return
    if (text.length > 500) {
      alert("텍스트는 500자를 초과할 수 없습니다. 현재 " + text.length + "자입니다.")
      return
    }
    
    if (!isDev && !canUseSelectedModel) {
      if (!canUseModel(selectedModel, userTier)) {
        alert(`${MODEL_INFO[selectedModel].name} 모델은 프리미엄 사용자만 사용할 수 있습니다.`)
      } else {
        alert(`${MODEL_INFO[selectedModel].name} 모델의 일일 사용 한도를 초과했습니다.`)
      }
      return
    }
    
    if (!isDev) incrementUsage(selectedModel)
    
    const payload = {
      text, 
      purpose: smartMode ? undefined : purpose,
      intent: smartMode ? undefined : intent,
      politeness: smartMode ? undefined : politeness,
      language: "ko",
      smartMode,
      model: selectedModel,
      premium: userTier === "premium"
    }
    
    onSubmit(payload)
  }

  const copy = async () => {
    if (!result?.revision) return
    await navigator.clipboard.writeText(result.revision)
    alert("복사되었습니다.")
  }

  return (
    <div className="space-y-6">
      {/* 구글 번역기 스타일 메인 레이아웃 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span>😤</span>
              <span>감정 언어</span>
              <span className="text-gray-400">→</span>
              <span>📝</span>
              <span>비즈니스 언어</span>
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              선택된 모델: <b className={selectedModel === "gpt-4o" ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}>
                {MODEL_INFO[selectedModel].name}
              </b>
              {isDev && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">DEV</span>}
            </div>
          </div>
        </div>

        {/* 메인 입력/출력 영역 */}
        <div className="flex flex-col lg:flex-row min-h-[400px]">
          {/* 입력 영역 */}
          <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">원문 입력</span>
                <div className={`text-xs px-2 py-1 rounded ${
                  isOverLimit 
                    ? 'bg-red-100 text-red-700' 
                    : isNearLimit 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {characterCount}/500
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="감정이 그대로 담긴 원문을 입력하세요...

예: 이 미친 프로젝트 언제 끝나냐고! 답답해 죽겠네"
                className="flex-1 w-full resize-none border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100 bg-transparent placeholder-gray-400 dark:placeholder-gray-500"
                maxLength={600}
              />
              {(isOverLimit || isNearLimit) && (
                <div className={`mt-2 text-sm ${
                  isOverLimit ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {isOverLimit 
                    ? `무료 버전은 500자까지만 입력 가능합니다. 현재 ${characterCount}자입니다.` 
                    : `500자 제한에 가까워지고 있습니다. (${characterCount}/500)`
                  }
                </div>
              )}
            </div>
          </div>

          {/* 가운데 변환 컨트롤 */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-w-[200px]">
            {/* AI 스마트 모드 */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🤖 AI 모드</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={smartMode} 
                    onChange={(e) => setSmartMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {smartMode ? "자동 분석" : "수동 설정"}
              </p>
            </div>

            {/* 모델 선택 */}
            <div className="mb-6 w-full">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">🌟 모델</div>
              <div className="space-y-2">
                {Object.entries(MODEL_INFO).map(([model, info]) => {
                  const usage = model === "gpt-4o" ? gpt4Usage : miniUsage
                  const canSelect = canUseModel(model as any, userTier)
                  
                  return (
                    <div
                      key={model}
                      className={`p-2 rounded-lg cursor-pointer transition-all text-center ${
                        selectedModel === model
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                          : canSelect 
                            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canSelect && setSelectedModel(model as any)}>
                      <div className={`text-xs font-medium ${
                        canSelect ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                      }`}>
                        {model === "gpt-4o" ? "🌟" : "⚡"} {info.name}
                      </div>
                      <div className={`text-xs ${
                        canSelect ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'
                      }`}>
                        {isDev ? '∞' : `${usage.remaining}/${usage.limit}`}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* 프리미엄 키 입력 */}
              {userTier === "free" && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowPremiumInput(!showPremiumInput)}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 w-full">
                    프리미엄 키
                  </button>
                  {showPremiumInput && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="premium_demo_2024"
                        value={premiumKey}
                        onChange={(e) => setPremiumKey(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 변환 버튼 */}
            <button
              disabled={busy || isOverLimit || !text.trim()}
              onClick={handleSubmit}
              className={`w-full px-4 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                selectedModel === "gpt-4o" 
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}>
              {busy ? "변환 중..." : 
               isOverLimit ? "500자 초과" : 
               "⚡ 변환하기"}
            </button>

            {/* 수동 모드 설정 */}
            {!smartMode && (
              <div className="mt-4 w-full">
                <div className="space-y-2">
                  <select className="w-full text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-1" value={purpose} onChange={(e)=>setPurpose(e.target.value as Purpose)}>
                    {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <select className="w-full text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-1" value={intent} onChange={(e)=>setIntent(e.target.value as Intent)}>
                    {INTENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  <div className="text-center">
                    <input type="range" min={1} max={3} value={politeness} onChange={(e)=>setPoliteness(parseInt(e.target.value))} className="w-full"/>
                    <div className="text-xs text-gray-500">{politeness === 1 ? "간결" : politeness === 2 ? "정중" : "조심"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 출력 영역 */}
          <div className="flex-1 p-6">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">변환 결과</span>
                {result && (
                  <button 
                    onClick={copy} 
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                    📋 복사
                  </button>
                )}
              </div>
              <div className="flex-1 w-full text-gray-900 dark:text-gray-100 bg-transparent">
                {!result ? (
                  !text.trim() ? (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">감정적인 문장을 입력하면</p>
                        <p className="text-sm">정중한 비즈니스 문장으로 변환됩니다</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500">
                      변환 버튼을 눌러주세요...
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                        {result.revision}
                      </div>
                    </div>
                    
                    {result.tips && result.tips.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">💡 개선 포인트</h4>
                        <ul className="space-y-1">
                          {result.tips.map((tip: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.subject && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">📧 제목 제안</div>
                        <div className="text-sm text-blue-800 dark:text-blue-200">{result.subject}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 템플릿 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
          <span>📄</span>
          <span>빠른 템플릿</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">- 클릭해서 바로 사용해보세요</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {templates.presets.map((t: any) => (
            <button 
              key={t.id}
              onClick={() => handleTemplate(t.example)}
              className="p-3 text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {t.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {t.example.substring(0, 30)}...
              </div>
            </button>
          ))}
        </div>
      </div>

      {isDev && (
        <div className="text-center">
          <button 
            onClick={() => {
              resetUsageForDev()
              window.location.reload()
            }}
            className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500">
            🔄 사용량 리셋 (DEV)
          </button>
        </div>
      )}
    </div>
  )
}