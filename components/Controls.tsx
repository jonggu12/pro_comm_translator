'use client'

import { useEffect, useMemo, useState } from "react"
import templates from "@/public/templates.json"
import { MODEL_INFO, getUserTier, canUseModel, checkUsageLimit, incrementUsage, resetUsageForDev } from "@/lib/premium"

type Props = {
  onSubmit: (payload: any) => void
  busy?: boolean
  customLayout?: boolean
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

export default function Controls({ onSubmit, busy, customLayout = false }: Props) {
  const [text, setText] = useState("")
  const [purpose, setPurpose] = useState<Purpose>("email")
  const [intent, setIntent] = useState<Intent>("request")
  const [politeness, setPoliteness] = useState(2)
  const [language, setLanguage] = useState<"ko" | "en">("ko")
  
  // 🆕 Smart Mode & Model Selection
  const [smartMode, setSmartMode] = useState(true) // 기본값: Smart Mode 활성화
  const [selectedModel, setSelectedModel] = useState<"gpt-4o-mini" | "gpt-4o">("gpt-4o-mini")
  const [premiumKey, setPremiumKey] = useState("")
  const [showPremiumInput, setShowPremiumInput] = useState(false)
  
  // 사용자 티어 및 모델별 사용량
  const userTier = getUserTier(premiumKey)
  const miniUsage = checkUsageLimit("gpt-4o-mini", userTier)
  const gpt4Usage = checkUsageLimit("gpt-4o", userTier)

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

  // 현재 선택된 모델의 사용량 정보
  const currentUsage = selectedModel === "gpt-4o" ? gpt4Usage : miniUsage
  const canUseSelectedModel = canUseModel(selectedModel, userTier) && currentUsage.canUse

  const handleSubmit = async () => {
    if (!text.trim()) return
    if (text.length > 500) {
      alert("텍스트는 500자를 초과할 수 없습니다. 현재 " + text.length + "자입니다.")
      return
    }
    
    // 개발 환경에서는 사용 제한 건너뛰기
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev && !canUseSelectedModel) {
      if (!canUseModel(selectedModel, userTier)) {
        alert(`${MODEL_INFO[selectedModel].name} 모델은 프리미엄 사용자만 사용할 수 있습니다.`)
      } else {
        alert(`${MODEL_INFO[selectedModel].name} 모델의 일일 사용 한도를 초과했습니다.`)
      }
      return
    }
    
    if (!isDev) incrementUsage(selectedModel) // 개발 모드가 아닐 때만 사용량 증가
    
    const payload = {
      text, 
      purpose: smartMode ? undefined : purpose,
      intent: smartMode ? undefined : intent,
      politeness: smartMode ? undefined : politeness,
      language,
      smartMode, // 🆕
      model: selectedModel, // 🆕
      premium: userTier === "premium" // 🆕
    }
    
    onSubmit(payload)
  }

  const characterCount = text.length
  const isOverLimit = characterCount > 500
  const isNearLimit = characterCount > 450

  const handleTemplate = (sample: string) => setText(sample)

  const isDev = process.env.NODE_ENV === 'development'

  if (customLayout) {
    return (
      <div className="space-y-4">
        {/* 1. 입력폼 */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="감정이 그대로 담긴 원문을 붙여넣어 주세요…"
            className={`w-full min-h-[140px] rounded-xl border p-4 focus:outline-none focus:ring-2 ${
              isOverLimit 
                ? 'border-red-500 focus:ring-red-500' 
                : isNearLimit 
                  ? 'border-yellow-500 focus:ring-yellow-500'
                  : 'border-gray-300 focus:ring-blue-500'
            }`}
            maxLength={600}
          />
          <div className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded ${
            isOverLimit 
              ? 'bg-red-100 text-red-700' 
              : isNearLimit 
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {characterCount}/500
          </div>
        </div>
        
        {isOverLimit && (
          <div className="text-red-600 text-sm">
            무료 버전은 500자까지만 입력 가능합니다. 현재 {characterCount}자입니다.
          </div>
        )}
        
        {isNearLimit && !isOverLimit && (
          <div className="text-yellow-600 text-sm">
            500자 제한에 가까워지고 있습니다. ({characterCount}/500)
          </div>
        )}

        {/* 2. 템플릿 컴포넌트 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
            <span>📄</span>
            <span>템플릿 예시</span>
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {templates.presets.map((t: any) => (
              <button key={t.id}
                onClick={() => handleTemplate(t.example)}
                className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. AI 스마트 모드 컴포넌트 */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <h3 className="font-medium text-blue-800 dark:text-blue-200">AI 스마트 모드</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={smartMode} 
                  onChange={(e) => setSmartMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {smartMode 
              ? "AI가 텍스트를 분석해서 자동으로 최적의 변환 설정을 적용합니다."
              : "수동으로 문서 목적, 의도, 정중함 레벨을 설정합니다."}
          </p>
        </div>

        {/* 수동 모드일 때만 설정 표시 */}
        {!smartMode && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
              <span>⚙️</span>
              <span>수동 설정</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">문서 목적</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={purpose} onChange={(e)=>setPurpose(e.target.value as Purpose)}>
                  {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">의도</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={intent} onChange={(e)=>setIntent(e.target.value as Intent)}>
                  {INTENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">정중함</label>
                <input type="range" min={1} max={3} value={politeness} onChange={(e)=>setPoliteness(parseInt(e.target.value))} className="w-full"/>
                <div className="text-xs text-gray-500 dark:text-gray-400">{politeness === 1 ? "간결" : politeness === 2 ? "정중" : "매우 조심"}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">언어</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={language} onChange={(e)=>setLanguage(e.target.value as "ko"|"en")}>
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 4. 변환 버튼 */}
        <button
          disabled={busy || isOverLimit || !text.trim() || (!isDev && !canUseSelectedModel)}
          onClick={handleSubmit}
          className={`w-full inline-flex items-center justify-center rounded-xl px-6 py-4 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedModel === "gpt-4o" 
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}>
          {busy ? "변환 중..." : 
           isOverLimit ? "500자 초과" : 
           !isDev && !canUseSelectedModel ? `${MODEL_INFO[selectedModel].name} 사용 불가` :
           smartMode ? `🤖 AI 스마트 변환 (${MODEL_INFO[selectedModel].name})` : 
           `정중하게 변환 (${MODEL_INFO[selectedModel].name})`}
        </button>

        {/* 5. 모델 선택 */}
        <div className="rounded-xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🌟</span>
              <h3 className="font-medium text-purple-800 dark:text-purple-200">모델 선택</h3>
            </div>
            {userTier === "free" && (
              <button
                onClick={() => setShowPremiumInput(!showPremiumInput)}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700">
                프리미엄 키 입력
              </button>
            )}
            {userTier === "premium" && (
              <div className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                🌟 프리미엄 활성
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(MODEL_INFO).map(([model, info]) => {
              const usage = model === "gpt-4o" ? gpt4Usage : miniUsage
              const canSelect = canUseModel(model as any, userTier)
              
              return (
                <div
                  key={model}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedModel === model
                      ? 'border-purple-500 dark:border-purple-400 bg-white dark:bg-gray-800'
                      : canSelect 
                        ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-500'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => canSelect && setSelectedModel(model as any)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3 h-3 rounded-full ${
                        selectedModel === model ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-500'
                      }`}></span>
                      <span className={`font-medium text-sm ${
                        canSelect ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {model === "gpt-4o" ? "🌟" : "⚡"} {info.name}
                      </span>
                    </div>
                    {!canSelect && (
                      <span className="text-xs text-orange-600 dark:text-orange-400">프리미엄</span>
                    )}
                  </div>
                  <div className={`text-xs mb-2 ${
                    canSelect ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {info.description}
                  </div>
                  <div className={`text-xs flex justify-between ${
                    canSelect ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    <span>남은 횟수: {isDev ? '∞' : `${usage.remaining}/${usage.limit}`}</span>
                    <span>{info.cost}</span>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* 프리미엄 키 입력 */}
          {showPremiumInput && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-600">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="프리미엄 키를 입력하세요 (예: premium_demo_2024)"
                  value={premiumKey}
                  onChange={(e) => setPremiumKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  onClick={() => setShowPremiumInput(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1">
                  취소
                </button>
              </div>
              <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                💡 데모 키: premium_demo_2024 (GPT-4o 체험 가능)
              </div>
            </div>
          )}
        </div>
        
        {/* Usage Summary */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            선택된 모델: <b className={selectedModel === "gpt-4o" ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}>
              {MODEL_INFO[selectedModel].name}
            </b>
            {isDev && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">DEV MODE</span>}
          </div>
          {isDev && (
            <button 
              onClick={() => {
                resetUsageForDev()
                window.location.reload()
              }}
              className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500">
              사용량 리셋
            </button>
          )}
        </div>
      </div>
    )
  }

  // 기존 레이아웃 (customLayout이 false일 때)
  return (
    <div className="space-y-4">
      {/* 🆕 Smart Mode Toggle */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🤖</span>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">AI 스마트 모드</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={smartMode} 
                onChange={(e) => setSmartMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {smartMode 
            ? "AI가 텍스트를 분석해서 자동으로 최적의 변환 설정을 적용합니다."
            : "수동으로 문서 목적, 의도, 정중함 레벨을 설정합니다."}
        </p>
      </div>
      
      {/* 🆕 Model Selection & Premium */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🌟</span>
            <h3 className="font-medium text-purple-800 dark:text-purple-200">모델 선택</h3>
          </div>
          {userTier === "free" && (
            <button
              onClick={() => setShowPremiumInput(!showPremiumInput)}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700">
              프리미엄 키 입력
            </button>
          )}
          {userTier === "premium" && (
            <div className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
              🌟 프리미엄 활성
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(MODEL_INFO).map(([model, info]) => {
            const usage = model === "gpt-4o" ? gpt4Usage : miniUsage
            const canSelect = canUseModel(model as any, userTier)
            
            return (
              <div
                key={model}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedModel === model
                    ? 'border-purple-500 dark:border-purple-400 bg-white dark:bg-gray-800'
                    : canSelect 
                      ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-500'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => canSelect && setSelectedModel(model as any)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${
                      selectedModel === model ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-500'
                    }`}></span>
                    <span className={`font-medium text-sm ${
                      canSelect ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {model === "gpt-4o" ? "🌟" : "⚡"} {info.name}
                    </span>
                  </div>
                  {!canSelect && (
                    <span className="text-xs text-orange-600 dark:text-orange-400">프리미엄</span>
                  )}
                </div>
                <div className={`text-xs mb-2 ${
                  canSelect ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {info.description}
                </div>
                <div className={`text-xs flex justify-between ${
                  canSelect ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  <span>남은 횟수: {isDev ? '∞' : `${usage.remaining}/${usage.limit}`}</span>
                  <span>{info.cost}</span>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 프리미엄 키 입력 */}
        {showPremiumInput && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-600">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="프리미엄 키를 입력하세요 (예: premium_demo_2024)"
                value={premiumKey}
                onChange={(e) => setPremiumKey(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <button
                onClick={() => setShowPremiumInput(false)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1">
                취소
              </button>
            </div>
            <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
              💡 데모 키: premium_demo_2024 (GPT-4o 체험 가능)
            </div>
          </div>
        )}
      </div>
      
      {/* Usage Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div>
          선택된 모델: <b className={selectedModel === "gpt-4o" ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}>
            {MODEL_INFO[selectedModel].name}
          </b>
          {isDev && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">DEV MODE</span>}
        </div>
        {isDev && (
          <button 
            onClick={() => {
              resetUsageForDev()
              window.location.reload()
            }}
            className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500">
            사용량 리셋
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="감정이 그대로 담긴 원문을 붙여넣어 주세요…"
          className={`w-full min-h-[140px] rounded-xl border p-4 focus:outline-none focus:ring-2 ${
            isOverLimit 
              ? 'border-red-500 focus:ring-red-500' 
              : isNearLimit 
                ? 'border-yellow-500 focus:ring-yellow-500'
                : 'border-gray-300 focus:ring-blue-500'
          }`}
          maxLength={600} // 약간의 여유를 두어 경고 표시 가능
        />
        <div className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded ${
          isOverLimit 
            ? 'bg-red-100 text-red-700' 
            : isNearLimit 
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
        }`}>
          {characterCount}/500
        </div>
      </div>
      
      {isOverLimit && (
        <div className="text-red-600 text-sm">
          무료 버전은 500자까지만 입력 가능합니다. 현재 {characterCount}자입니다.
        </div>
      )}
      
      {isNearLimit && !isOverLimit && (
        <div className="text-yellow-600 text-sm">
          500자 제한에 가까워지고 있습니다. ({characterCount}/500)
        </div>
      )}

      {/* 수동 모드일 때만 설정 표시 */}
      {!smartMode && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
            <span>⚙️</span>
            <span>수동 설정</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">문서 목적</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={purpose} onChange={(e)=>setPurpose(e.target.value as Purpose)}>
                {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">의도</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={intent} onChange={(e)=>setIntent(e.target.value as Intent)}>
                {INTENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">정중함</label>
              <input type="range" min={1} max={3} value={politeness} onChange={(e)=>setPoliteness(parseInt(e.target.value))} className="w-full"/>
              <div className="text-xs text-gray-500 dark:text-gray-400">{politeness === 1 ? "간결" : politeness === 2 ? "정중" : "매우 조심"}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">언어</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100" value={language} onChange={(e)=>setLanguage(e.target.value as "ko"|"en")}>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {templates.presets.map((t: any) => (
          <button key={t.id}
            onClick={() => handleTemplate(t.example)}
            className="rounded-full border px-3 py-1 hover:bg-gray-50">
            {t.label}
          </button>
        ))}
      </div>

      <button
        disabled={busy || isOverLimit || !text.trim() || (!isDev && !canUseSelectedModel)}
        onClick={handleSubmit}
        className={`inline-flex items-center rounded-xl px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedModel === "gpt-4o" 
            ? "bg-purple-600 hover:bg-purple-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}>
        {busy ? "변환 중..." : 
         isOverLimit ? "500자 초과" : 
         !isDev && !canUseSelectedModel ? `${MODEL_INFO[selectedModel].name} 사용 불가` :
         smartMode ? `🤖 AI 스마트 변환 (${MODEL_INFO[selectedModel].name})` : 
         `정중하게 변환 (${MODEL_INFO[selectedModel].name})`}
      </button>
    </div>
  )
}
